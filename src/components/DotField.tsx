import { useEffect, useRef, memo, useId } from 'react'

const TWO_PI = Math.PI * 2

interface DotFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  dotRadius?: number
  dotSpacing?: number
  cursorRadius?: number
  gradientFrom?: string
  gradientTo?: string
  baseColor?: string
  // 기존 props 호환성을 위해 유지 (사용 안함)
  cursorForce?: number
  bulgeOnly?: boolean
  bulgeStrength?: number
  glowRadius?: number
  sparkle?: boolean
  waveAmplitude?: number
  glowColor?: string
}

const DotField = memo<DotFieldProps>(({
  dotRadius = 1,
  dotSpacing = 15, // 1 + 15 = 16px step
  cursorRadius = 80,
  gradientFrom = 'rgba(168, 85, 247, 1)',
  gradientTo = 'rgba(180, 151, 207, 1)',
  baseColor = 'rgba(0, 0, 0, 0.08)',
  cursorForce, bulgeOnly, bulgeStrength, sparkle, waveAmplitude, glowRadius, glowColor,
  style,
  ...rest
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -9999, y: -9999, isInside: false })
  const sizeRef = useRef({ w: 0, h: 0, offsetX: 0, offsetY: 0 })
  const rafRef = useRef<number>(0)
  
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const coloredCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })!
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let resizeTimer: ReturnType<typeof setTimeout>

    function resize() {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(doResize, 100)
    }

    function doResize() {
      const rect = canvas.parentElement!.getBoundingClientRect()
      const w = rect.width, h = rect.height
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      sizeRef.current = { w, h, offsetX: rect.left + window.scrollX, offsetY: rect.top + window.scrollY }
      
      const step = dotRadius + dotSpacing
      const cols = Math.floor(w / step)
      const rows = Math.floor(h / step)
      const padX = (w % step) / 2
      const padY = (h % step) / 2

      // 1. 기본 색상(흐린 회색) 도트 캔버스
      const baseCanvas = document.createElement('canvas')
      baseCanvas.width = w * dpr
      baseCanvas.height = h * dpr
      const bCtx = baseCanvas.getContext('2d')!
      bCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      bCtx.fillStyle = baseColor
      bCtx.beginPath()
      for (let row = 0; row <= rows; row++) {
        for (let col = 0; col <= cols; col++) {
          const cx = padX + col * step
          const cy = padY + row * step
          bCtx.moveTo(cx + dotRadius, cy)
          bCtx.arc(cx, cy, dotRadius, 0, TWO_PI)
        }
      }
      bCtx.fill()
      baseCanvasRef.current = baseCanvas

      // 2. 그라데이션 색상 도트 캔버스 (활성화 시 보일 색상)
      const colCanvas = document.createElement('canvas')
      colCanvas.width = w * dpr
      colCanvas.height = h * dpr
      const cCtx = colCanvas.getContext('2d')!
      cCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      
      const grad = cCtx.createLinearGradient(0, 0, w, h)
      grad.addColorStop(0, gradientFrom)
      grad.addColorStop(1, gradientTo)
      cCtx.fillStyle = grad
      cCtx.beginPath()
      for (let row = 0; row <= rows; row++) {
        for (let col = 0; col <= cols; col++) {
          const cx = padX + col * step
          const cy = padY + row * step
          cCtx.moveTo(cx + dotRadius, cy)
          cCtx.arc(cx, cy, dotRadius, 0, TWO_PI)
        }
      }
      cCtx.fill()
      coloredCanvasRef.current = colCanvas

      // 3. 마스크용 빈 캔버스
      const maskCanvas = document.createElement('canvas')
      maskCanvas.width = w * dpr
      maskCanvas.height = h * dpr
      const mCtx = maskCanvas.getContext('2d')!
      mCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      maskCanvasRef.current = maskCanvas
    }

    function tick() {
      const { w, h } = sizeRef.current
      const m = mouseRef.current
      
      ctx.clearRect(0, 0, w, h)

      // 전체 화면에 기본 도트 깔기
      if (baseCanvasRef.current) {
        ctx.drawImage(baseCanvasRef.current, 0, 0, w, h)
      }

      // 커서 근처 활성화된 컬러 도트 그리기
      if (m.isInside && coloredCanvasRef.current && maskCanvasRef.current) {
        const mCtx = maskCanvasRef.current.getContext('2d')!
        mCtx.clearRect(0, 0, w, h)
        
        // 커서 위치에 Radial Gradient 마스크 그리기
        const maskGrad = mCtx.createRadialGradient(m.x, m.y, 0, m.x, m.y, cursorRadius)
        maskGrad.addColorStop(0, 'rgba(0,0,0,1)')
        maskGrad.addColorStop(1, 'rgba(0,0,0,0)')
        
        mCtx.fillStyle = maskGrad
        mCtx.fillRect(m.x - cursorRadius, m.y - cursorRadius, cursorRadius * 2, cursorRadius * 2)

        // 컬러 도트들을 마스크에 source-in 합성 (커서 근처만 남김)
        mCtx.globalCompositeOperation = 'source-in'
        mCtx.drawImage(coloredCanvasRef.current, 0, 0, w, h)
        mCtx.globalCompositeOperation = 'source-over'

        // 합성된 결과물을 메인 캔버스에 그리기
        ctx.drawImage(maskCanvasRef.current, 0, 0, w, h)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    function onMouseMove(e: MouseEvent) {
      const s = sizeRef.current
      mouseRef.current.x = e.clientX
      mouseRef.current.y = e.clientY
      mouseRef.current.isInside = true
    }
    
    function onMouseLeave() {
      mouseRef.current.isInside = false
    }

    doResize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    window.addEventListener('mouseout', onMouseLeave, { passive: true })
    
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(resizeTimer)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseout', onMouseLeave)
    }
  }, [dotRadius, dotSpacing, cursorRadius, gradientFrom, gradientTo, baseColor])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', ...style }} {...rest}>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      />
    </div>
  )
})

DotField.displayName = 'DotField'

export default DotField
