import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

/**
 * BiRefNet 기반 배경 제거 (로컬 self-host).
 *
 * - 모델(.onnx)은 깃에 커밋하지 않고 런타임 1회 다운로드 후 .model-cache/에 보관한다.
 * - onnxruntime-node InferenceSession은 모듈 레벨에서 1회만 만들어 메모리 캐싱한다.
 * - 어떤 단계든 실패하면 null을 반환 → 호출부가 기존 @imgly로 graceful fallback.
 *
 * 환경변수:
 * - BIREFNET_MODEL_URL: 사용할 ONNX 모델 URL (기본: BiRefNet_lite — CPU에 적합)
 * - BIREFNET_MODEL_PATH: 로컬에 이미 모델이 있으면 그 경로 사용 (다운로드 생략)
 */

// 경량 모델 기본값 — CPU 추론 속도/용량 균형. fp16 풀모델을 쓰려면 env로 교체.
const DEFAULT_MODEL_URL = 'https://huggingface.co/onnx-community/BiRefNet_lite-ONNX/resolve/main/onnx/model.onnx'
// ImageNet 정규화 (BiRefNet 표준)
const MEAN = [0.485, 0.456, 0.406]
const STD = [0.229, 0.224, 0.225]

type RembgSession = {
  mask(image: sharp.Sharp): Promise<sharp.Sharp>
}

let sessionPromise: Promise<RembgSession | null> | null = null

function modelCachePath(): string {
  const envPath = process.env.BIREFNET_MODEL_PATH
  if (envPath) return envPath
  const dir = path.join(process.cwd(), '.model-cache')
  return path.join(dir, 'birefnet.onnx')
}

async function ensureModelDownloaded(): Promise<string | null> {
  const target = modelCachePath()
  try {
    if (fs.existsSync(target) && fs.statSync(target).size > 1_000_000) return target
  } catch { /* fall through to download */ }
  if (process.env.BIREFNET_MODEL_PATH) {
    // 사용자가 경로를 줬는데 파일이 없으면 다운로드하지 않고 실패 처리
    console.warn('[birefnet] BIREFNET_MODEL_PATH set but file missing:', target)
    return null
  }
  const url = process.env.BIREFNET_MODEL_URL || DEFAULT_MODEL_URL
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true })
    console.log('[birefnet] downloading model (one-time):', url)
    const res = await fetch(url, { signal: AbortSignal.timeout(180_000) })
    if (!res.ok || !res.body) {
      console.warn('[birefnet] model download failed:', res.status)
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 1_000_000) {
      console.warn('[birefnet] downloaded model too small, aborting')
      return null
    }
    const tmp = `${target}.tmp`
    fs.writeFileSync(tmp, buf)
    fs.renameSync(tmp, target)
    console.log('[birefnet] model cached at', target, `(${Math.round(buf.length / 1e6)}MB)`)
    return target
  } catch (err) {
    console.warn('[birefnet] model download error:', err instanceof Error ? err.message : String(err))
    return null
  }
}

async function getSession(): Promise<RembgSession | null> {
  if (sessionPromise) return sessionPromise
  sessionPromise = (async () => {
    try {
      const modelPath = await ensureModelDownloaded()
      if (!modelPath) return null
      // 네이티브 모듈은 런타임에만 로드 (Next 번들 회피 — serverExternalPackages 등록됨)
      const ort = await import('onnxruntime-node')
      const BackgroundRemover = (await import('@tugrul/rembg')).default as unknown as new (
        session: unknown, mean: number[], std: number[],
      ) => RembgSession
      const session = await ort.InferenceSession.create(modelPath)
      return new BackgroundRemover(session, MEAN, STD)
    } catch (err) {
      console.warn('[birefnet] session init failed:', err instanceof Error ? err.message : String(err))
      return null
    }
  })()
  return sessionPromise
}

/**
 * BiRefNet으로 배경을 제거해 투명 PNG base64를 반환한다.
 * 실패 시 null → 호출부에서 @imgly 등으로 폴백.
 */
export async function removeBackgroundBiRefNet(
  base64: string,
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    if (!base64 || base64.length < 500) return null
    const remover = await getSession()
    if (!remover) return null
    const input = sharp(Buffer.from(base64, 'base64'))
    const out = await remover.mask(input)
    const png = await out.png().toBuffer()
    if (png.length < 1000) return null
    return { base64: png.toString('base64'), mimeType: 'image/png' }
  } catch (err) {
    console.warn('[birefnet] removeBackground failed:', err instanceof Error ? err.message : String(err))
    return null
  }
}
