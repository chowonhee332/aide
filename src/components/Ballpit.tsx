'use client'

// Inspired by Kevin Levron: https://x.com/soju22/status/1858925191671271801

import { useEffect, useRef } from 'react'

interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  color: string
}

interface BallpitProps {
  count?: number
  gravity?: number
  friction?: number
  wallBounce?: number
  followCursor?: boolean
  colors?: string[]
  className?: string
  style?: React.CSSProperties
}

const DEFAULT_COLORS = [
  '#5accff', '#3b9eff', '#7b6fff', '#a855f7',
  '#f472b6', '#ff5226', '#fb923c', '#facc15',
  '#4ade80', '#34d399',
]

export default function Ballpit({
  count = 110,
  gravity = 0.1,
  friction = 0.9975,
  wallBounce = 0.55,
  followCursor = false,
  colors = DEFAULT_COLORS,
  className,
  style,
}: BallpitProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    let w = 0
    let h = 0
    let balls: Ball[] = []
    let rafId: number
    const mouse = { x: -9999, y: -9999, active: false }

    function resize() {
      const rect = canvas.parentElement!.getBoundingClientRect()
      w = rect.width
      h = rect.height
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function createBalls() {
      balls = []
      for (let i = 0; i < count; i++) {
        const r = 8 + Math.random() * 18
        balls.push({
          x: r + Math.random() * (w - r * 2),
          y: r + Math.random() * (h * 0.5),
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 2,
          r,
          color: colors[Math.floor(Math.random() * colors.length)],
        })
      }
    }

    function resolveCollisions() {
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const a = balls[i], b = balls[j]
          const dx = b.x - a.x, dy = b.y - a.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const minDist = a.r + b.r
          if (dist < minDist && dist > 0) {
            const nx = dx / dist, ny = dy / dist
            const overlap = (minDist - dist) / 2
            a.x -= nx * overlap; a.y -= ny * overlap
            b.x += nx * overlap; b.y += ny * overlap
            const dvx = a.vx - b.vx, dvy = a.vy - b.vy
            const dot = dvx * nx + dvy * ny
            if (dot > 0) {
              const impulse = dot * wallBounce
              a.vx -= impulse * nx; a.vy -= impulse * ny
              b.vx += impulse * nx; b.vy += impulse * ny
            }
          }
        }
      }
    }

    function tick() {
      ctx.clearRect(0, 0, w, h)

      for (const b of balls) {
        b.vy += gravity
        b.vx *= friction
        b.vy *= friction

        if (followCursor && mouse.active) {
          const dx = mouse.x - b.x, dy = mouse.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 200 && dist > 0) {
            const force = (200 - dist) / 200 * 0.15
            b.vx += (dx / dist) * force
            b.vy += (dy / dist) * force
          }
        }

        b.x += b.vx
        b.y += b.vy

        if (b.x - b.r < 0) { b.x = b.r; b.vx *= -wallBounce }
        if (b.x + b.r > w) { b.x = w - b.r; b.vx *= -wallBounce }
        if (b.y - b.r < 0) { b.y = b.r; b.vy *= -wallBounce }
        if (b.y + b.r > h) { b.y = h - b.r; b.vy *= -wallBounce }
      }

      resolveCollisions()

      for (const b of balls) {
        const grad = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.1, b.x, b.y, b.r)
        grad.addColorStop(0, b.color + 'ff')
        grad.addColorStop(0.5, b.color + 'cc')
        grad.addColorStop(1, b.color + '44')
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      }

      rafId = requestAnimationFrame(tick)
    }

    function onMouseMove(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
      mouse.active = true
    }
    function onMouseLeave() { mouse.active = false }

    resize()
    createBalls()
    window.addEventListener('resize', () => { resize(); createBalls() })
    if (followCursor) {
      canvas.addEventListener('mousemove', onMouseMove)
      canvas.addEventListener('mouseleave', onMouseLeave)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseleave', onMouseLeave)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', ...style }}
    />
  )
}
