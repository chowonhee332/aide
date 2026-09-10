#!/usr/bin/env node
/**
 * Builds a cut-to-cut demo video of Aide from the running app.
 *
 *   npm run dev              # (or `next start`) on :3000
 *   node scripts/make-demo-video.mjs
 *   → scratchpad/aide-demo.mp4
 *
 * Same shape as `capture-astryx-thumbs.mjs`: headless Chrome drives the real app,
 * so every frame is the product actually rendering — nothing is mocked up. Title
 * cards are rendered as HTML rather than burned in with ffmpeg's drawtext, which
 * keeps Korean typography in the browser (where the app's own font stack lives)
 * instead of depending on how ffmpeg was compiled.
 *
 * Edit STORYBOARD and re-run; nothing else needs to change.
 *
 * Env:
 *   DEMO_BASE_URL   target server (default http://localhost:3000)
 *   DEMO_TRANSITION `cut` (default) or `fade`
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = (process.env.DEMO_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const TRANSITION = process.env.DEMO_TRANSITION === 'fade' ? 'fade' : 'cut'

const OUT_DIR = join(root, 'scratchpad')
const FRAME_DIR = join(OUT_DIR, 'demo-frames')
const OUT_FILE = join(OUT_DIR, 'aide-demo.mp4')

const WIDTH = 1920
const HEIGHT = 1080

/**
 * The cuts, in order.
 *   {title, subtitle, seconds}       — a full-bleed text card
 *   {path, caption?, seconds, wait?} — a screen of the running app
 *
 * A screen cut may carry `actions`, run before the shot is taken, so the frame
 * shows the product in a real state rather than its empty one:
 *   {click: '<selector>', wait?: ms}   click the first match
 *   {clickText: '<text>', wait?: ms}   click the first element containing that text
 */
const STORYBOARD = [
  { title: 'Aide', subtitle: '기획서에서 동작하는 프로토타입까지', seconds: 2.5 },
  { title: '문제', subtitle: '시안 하나 뽑는 데 며칠.\n제안 때마다 처음부터 다시.', seconds: 3 },

  { title: '① 기획서를 넣는다', subtitle: '', seconds: 2 },
  { path: '/', caption: '브리프 · 소스 첨부 · 디자인 시스템 선택', seconds: 4 },

  { title: '② 템플릿을 조합한다', subtitle: 'AI가 브리프를 읽고 맞는 화면을 고른다', seconds: 2.5 },
  {
    path: '/playground',
    caption: 'Playground — Astryx 34종 템플릿을 프레임에 그대로',
    seconds: 4,
    wait: 3500,
    // Desktop first, then apply a template: the default frame is an empty mobile
    // canvas, which is the least representative thing the Playground can show.
    actions: [
      { clickText: 'Desktop 1920', wait: 1500 },
      { clickText: 'Analytics Dashboard', wait: 3500 },
    ],
  },

  { title: '③ 디자인은 하나의 계약에서', subtitle: '토큰 · 컴포넌트 · 패턴을 단일 원본으로', seconds: 2.5 },
  { path: '/aide-ui', caption: 'Aide Design System — 계약에서 파생되는 문서', seconds: 3.5 },
  { path: '/aide-ui/components', caption: '컴포넌트 70종이 같은 계약을 공유', seconds: 3.5 },

  { title: 'Aide', subtitle: '기획 → 시안 → 프로토타입,\n한 흐름으로', seconds: 3 },
]

/** Full-bleed text card. Uses the system Korean stack so it needs no web font. */
function titleCardHtml({ title, subtitle }) {
  const lines = String(subtitle || '')
    .split('\n')
    .map((line) => `<div>${line}</div>`)
    .join('')
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden}
    body{
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;
      background:linear-gradient(140deg,#f5f6fc 0%,#e8eefb 55%,#dfe8fa 100%);
      font-family:"Pretendard Variable",Pretendard,-apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;
      color:#171717;text-align:center;
    }
    h1{font-size:104px;font-weight:800;letter-spacing:-.03em;color:#0064e0;line-height:1.05}
    .sub{font-size:44px;font-weight:600;line-height:1.5;color:#3a3a3a}
    .rule{width:96px;height:6px;border-radius:999px;background:#0064e0;opacity:.85}
  </style></head><body>
    <h1>${title}</h1>
    ${subtitle ? '<div class="rule"></div>' : ''}
    <div class="sub">${lines}</div>
  </body></html>`
}

/** Caption strip drawn over a captured screen, so the cut explains itself. */
async function overlayCaption(page, text) {
  await page.evaluate((caption) => {
    const bar = document.createElement('div')
    bar.textContent = caption
    Object.assign(bar.style, {
      position: 'fixed',
      left: '0',
      right: '0',
      bottom: '0',
      zIndex: '2147483647',
      padding: '28px 48px',
      background: 'linear-gradient(to top, rgba(10,12,20,.92), rgba(10,12,20,0))',
      color: '#ffffff',
      font: '600 38px/1.35 "Pretendard Variable", Pretendard, -apple-system, "Apple SD Gothic Neo", sans-serif',
      letterSpacing: '-.02em',
      pointerEvents: 'none',
    })
    document.body.appendChild(bar)
  }, text)
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms))

/**
 * Drive the page into the state worth filming. Clicks go through `dispatchEvent`
 * rather than `element.click()` because parts of the Playground canvas listen for
 * `pointerdown`, which a synthetic click never fires.
 */
async function runActions(page, actions = []) {
  for (const action of actions) {
    const found = await page.evaluate((step) => {
      const target = step.click
        ? document.querySelector(step.click)
        : [...document.querySelectorAll('button, [role="button"], a')].find((el) =>
            (el.textContent ?? '').includes(step.clickText),
          )
      if (!target) return false
      for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
        target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true }))
      }
      return true
    }, action)
    if (!found) {
      console.warn(`    ⚠ 대상 없음: ${action.click ?? action.clickText}`)
    }
    await sleep(action.wait ?? 1200)
  }
}

async function capture() {
  rmSync(FRAME_DIR, { recursive: true, force: true })
  mkdirSync(FRAME_DIR, { recursive: true })

  const browser = await puppeteer.launch({
    headless: true,
    args: [`--window-size=${WIDTH},${HEIGHT}`, '--force-device-scale-factor=1'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 })

  const frames = []
  for (const [index, scene] of STORYBOARD.entries()) {
    const file = join(FRAME_DIR, `${String(index).padStart(3, '0')}.png`)

    if (scene.path) {
      const url = `${BASE}${scene.path}`
      process.stdout.write(`  [${index + 1}/${STORYBOARD.length}] ${url}\n`)
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 })
      await sleep(scene.wait ?? 1500)
      await runActions(page, scene.actions)
      if (scene.caption) await overlayCaption(page, scene.caption)
    } else {
      process.stdout.write(`  [${index + 1}/${STORYBOARD.length}] 타이틀 — ${scene.title}\n`)
      await page.setContent(titleCardHtml(scene), { waitUntil: 'load' })
      await sleep(250)
    }

    await page.screenshot({ path: file })
    frames.push({ file, seconds: scene.seconds })
  }

  await browser.close()
  return frames
}

/** Hard cuts via the concat demuxer — the simplest thing that produces a real mp4. */
function renderCuts(frames) {
  const list = frames
    .map(({ file, seconds }) => `file '${file}'\nduration ${seconds}`)
    .join('\n')
  // concat needs the final image repeated or it is dropped from the output.
  const listFile = join(FRAME_DIR, 'frames.txt')
  writeFileSync(listFile, `${list}\nfile '${frames[frames.length - 1].file}'\n`)

  execFileSync(
    'ffmpeg',
    ['-y', '-f', 'concat', '-safe', '0', '-i', listFile,
     '-vf', `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=white,fps=30,format=yuv420p`,
     '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', OUT_FILE],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  )
}

/** Crossfades, built by chaining xfade across the still clips. */
function renderFades(frames) {
  const FADE = 0.5
  const inputs = frames.flatMap(({ file, seconds }) => ['-loop', '1', '-t', String(seconds), '-i', file])

  const parts = []
  frames.forEach((_, i) => {
    parts.push(`[${i}:v]scale=${WIDTH}:${HEIGHT},setsar=1,fps=30[v${i}]`)
  })

  let last = 'v0'
  let offset = frames[0].seconds - FADE
  for (let i = 1; i < frames.length; i++) {
    const out = i === frames.length - 1 ? 'vout' : `x${i}`
    parts.push(`[${last}][v${i}]xfade=transition=fade:duration=${FADE}:offset=${offset.toFixed(3)}[${out}]`)
    last = out
    offset += frames[i].seconds - FADE
  }

  execFileSync(
    'ffmpeg',
    ['-y', ...inputs, '-filter_complex', parts.join(';'), '-map', '[vout]',
     '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', OUT_FILE],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  )
}

const reachable = await fetch(BASE, { signal: AbortSignal.timeout(5000) }).then(
  (r) => r.ok,
  () => false,
)
if (!reachable) {
  console.error(`✖ ${BASE} 에 연결할 수 없습니다. 먼저 dev 서버를 띄우세요.`)
  process.exit(1)
}

mkdirSync(OUT_DIR, { recursive: true })
console.log(`컷 촬영 (${STORYBOARD.length}개, ${WIDTH}x${HEIGHT})`)
const frames = await capture()

console.log(`영상 합성 — 전환: ${TRANSITION}`)
if (TRANSITION === 'fade') renderFades(frames)
else renderCuts(frames)

if (!existsSync(OUT_FILE)) {
  console.error('✖ 출력 파일이 만들어지지 않았습니다.')
  process.exit(1)
}
const total = frames.reduce((sum, f) => sum + f.seconds, 0)
console.log(`✓ ${OUT_FILE} — ${frames.length}컷 / 약 ${total.toFixed(1)}초`)
