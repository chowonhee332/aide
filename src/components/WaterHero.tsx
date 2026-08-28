'use client';

import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

/**
 * WaterHero — animated pool-water hero background.
 * WebGL2 fragment shader: vertical blue gradient + moving caustics +
 * expanding ripple rings (ambient + cursor-driven). A 2D canvas overlay
 * draws motion-blurred koi that drift and lean toward the pointer.
 *
 * Replaces <Grainient> on the landing hero. Self-contained and reversible.
 */

const MAX_RIPPLES = 28; // ripple pool — enough for a trailing cursor wake

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return [1, 1, 1];
  return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
};

const vertex = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragment = `#version 300 es
precision highp float;

uniform vec2  iResolution;
uniform float iTime;
uniform vec3  uColorTop;   // azure   (top of screen)
uniform vec3  uColorMid;   // mid blue
uniform vec3  uColorBot;   // aqua    (bottom of screen)
uniform float uCaustic;
uniform float uRippleCount;
uniform vec4  uRipples[${MAX_RIPPLES}]; // xy=center(0..1), z=birthTime, w=strength

out vec4 fragColor;

float hash1(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }

float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash1(i);
  float b = hash1(i + vec2(1.0, 0.0));
  float c = hash1(i + vec2(0.0, 1.0));
  float d = hash1(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++){ v += a * vnoise(p); p = p * 2.03; a *= 0.5; }
  return v;
}

// pool caustic web — bright sinuous light threads that shift over time.
// Adapted from the classic iterative tileable-caustic technique.
float causticWeb(vec2 uvw, float t){
  vec2 p = mod(uvw * 6.2831853, 6.2831853) - 250.0;
  vec2 i = p;
  float c = 1.0;
  float inten = 0.0045;
  for (int n = 0; n < 4; n++){
    float tt = t * 0.32 * (1.0 - 3.5 / float(n + 1));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y),
                 sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten),
                           p.y / (cos(i.y + tt) / inten)));
  }
  c = 1.17 - pow(c * 0.25, 1.4);
  return clamp(pow(abs(c), 5.0), 0.0, 1.0);
}

void main(){
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  float aspect = iResolution.x / iResolution.y;
  vec2 auv = vec2(uv.x * aspect, uv.y);
  float t = iTime;

  // ---- slow large-scale swirl (the whole body of water turning) ----
  vec2 swirl = (vec2(fbm(auv * 0.7 + t * 0.02),
                     fbm(auv * 0.7 - t * 0.017 + 9.0)) - 0.5) * 0.30;

  // ---- ripple rings: many thin concentric refractive wavefronts ----
  vec2  rippleSlope = vec2(0.0);
  float ringLight = 0.0;
  float ringWarp = 0.0;
  for (int k = 0; k < ${MAX_RIPPLES}; k++){
    if (float(k) >= uRippleCount) break;
    vec4 r = uRipples[k];
    float age = t - r.z;
    if (age < 0.0 || age > 9.0) continue;
    vec2 cc = vec2(r.x * aspect, r.y);
    vec2 to = auv - cc;
    float d = length(to);
    float radius = 0.03 + age * 0.14;           // expands outward, slowly
    float band = d - radius;
    float life = 1.0 - age / 9.0;
    // tight leading edge + long inward-trailing train → 6-10 visible rings
    float env = (exp(-abs(band) * 7.0)
              + 0.7 * exp(-abs(band) * 2.1) * step(band, 0.0)) * life;
    float phase = band * 115.0 - age * 8.0;
    float wave = sin(phase);
    vec2 dir = d > 1e-4 ? to / d : vec2(0.0);
    rippleSlope += dir * cos(phase) * env * r.w * 0.028;
    ringLight   += max(wave, 0.0) * env * r.w;
    ringWarp    += wave * env * r.w;
  }

  // ---- caustic web, warped by the swirl and the ripple slope ----
  vec2 cuv = auv * 1.35 + swirl + rippleSlope + vec2(t * 0.011, t * 0.019);
  float web = causticWeb(cuv, t);
  web += causticWeb(cuv * 1.9 + 11.0, t * 1.35) * 0.5;
  web *= uCaustic;

  // ---- base colour: bright azure (top) → aqua (bottom) ----
  float gy = clamp(uv.y + ringWarp * 0.015
                 + (fbm(auv * 1.3 + swirl * 2.0 + t * 0.03) - 0.5) * 0.12, 0.0, 1.0);
  float gg = gy * gy * (3.0 - 2.0 * gy);
  vec3 base = mix(uColorBot, uColorTop, gg);
  base = mix(base, uColorMid, (1.0 - abs(gg - 0.5) * 2.0) * 0.28);

  // broad light / shade patches drifting across the surface (kept gentle so
  // the water stays clean, not muddy)
  float shade = fbm(auv * 1.05 + swirl * 2.2 - t * 0.02);
  base *= 0.93 + shade * 0.22;

  // ---- compose ----
  vec3 col = base;
  vec3 causticTint = mix(vec3(0.62, 0.90, 0.99), vec3(0.90, 1.0, 0.99), uv.y);
  col += causticTint * web * mix(0.46, 0.20, uv.y);   // stronger near the bottom
  col += vec3(0.82, 0.96, 1.0) * ringLight * 0.24;    // bright ripple crests

  // ---- vignette: gently darker blurred top corners, luminous lower centre ----
  vec2 vd = uv - vec2(0.5, 0.32);
  float vig = clamp(1.0 - dot(vd, vd) * 0.72, 0.0, 1.0);
  col *= mix(0.80, 1.0, vig);
  col *= 1.0 - smoothstep(0.82, 1.0, uv.y) * 0.08;    // slight top nudge for nav

  // clean, vivid, slightly lifted — not neon, not murky
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, 1.22);
  col = pow(clamp(col * 1.06, 0.0, 1.0), vec3(0.90));

  col += (hash1(gl_FragCoord.xy + t) - 0.5) * 0.012;
  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

interface Ripple { x: number; y: number; birth: number; strength: number; }

interface Koi {
  x: number; y: number;
  angle: number;
  speed: number;
  len: number;
  wander: number;
  phase: number;
}

interface WaterHeroProps {
  colorTop?: string;
  colorMid?: string;
  colorBot?: string;
  caustic?: number;
  className?: string;
}

const WaterHero = ({
  colorTop = '#1f6fd8',
  colorMid = '#2ea6e4',
  colorBot = '#63deec',
  caustic = 1.1,
  className = '',
}: WaterHeroProps) => {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const t0 = performance.now();
    const now = () => (performance.now() - t0) * 0.001;

    // ---------- WebGL water ----------
    const renderer = new Renderer({ webgl: 2, alpha: false, antialias: false, dpr });
    const gl = renderer.gl;
    const glCanvas = gl.canvas;
    // moderate defocus — the reference is a shallow-DoF pool shot that still
    // keeps mid-frequency ripple/caustic detail readable
    glCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;filter:blur(3.5px);transform:scale(1.06);';
    host.appendChild(glCanvas);

    // plain Array (not Float32Array): ogl only uploads array uniforms whose
    // value passes Array.isArray()
    const ripplesBuf: number[] = new Array(MAX_RIPPLES * 4).fill(0);
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        iResolution: { value: new Float32Array([1, 1]) },
        iTime: { value: 0 },
        uColorTop: { value: new Float32Array(hexToRgb(colorTop)) },
        uColorMid: { value: new Float32Array(hexToRgb(colorMid)) },
        uColorBot: { value: new Float32Array(hexToRgb(colorBot)) },
        uCaustic: { value: caustic },
        uRippleCount: { value: 0 },
        uRipples: { value: ripplesBuf },
      },
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    // ---------- 2D koi overlay ----------
    const koiCanvas = document.createElement('canvas');
    koiCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;filter:blur(2px);';
    host.appendChild(koiCanvas);
    const kctx = koiCanvas.getContext('2d')!;

    let cssW = 1, cssH = 1;
    const koi: Koi[] = [];
    const seedKoi = () => {
      koi.length = 0;
      const n = reduceMotion ? 0 : 2;
      for (let i = 0; i < n; i++) {
        koi.push({
          x: cssW * (0.4 + Math.random() * 0.55),
          y: cssH * (0.4 + Math.random() * 0.55),   // reference: koi swim lower-right
          angle: Math.random() * Math.PI * 2,
          speed: 42 + Math.random() * 26,
          len: 130 + Math.random() * 70,
          wander: Math.random() * 100,
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    const setSize = () => {
      const rect = host.getBoundingClientRect();
      cssW = Math.max(1, rect.width);
      cssH = Math.max(1, rect.height);
      renderer.setSize(cssW, cssH);
      const res = program.uniforms.iResolution.value as Float32Array;
      res[0] = gl.drawingBufferWidth;
      res[1] = gl.drawingBufferHeight;
      koiCanvas.width = Math.floor(cssW * dpr);
      koiCanvas.height = Math.floor(cssH * dpr);
      kctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (koi.length === 0) seedKoi();
      renderer.render({ scene: mesh });
    };

    const ro = new ResizeObserver(setSize);
    ro.observe(host);
    setSize();
    seedKoi();

    // ---------- ripples ----------
    const ripples: Ripple[] = [];
    let writeIdx = 0;
    const addRipple = (x: number, y: number, strength: number) => {
      const r = ripples[writeIdx] ?? ({} as Ripple);
      r.x = x; r.y = y; r.birth = now(); r.strength = strength;
      ripples[writeIdx] = r;
      writeIdx = (writeIdx + 1) % MAX_RIPPLES;
    };

    // ---------- pointer ----------
    const pointer = { x: 0.5, y: 0.5, active: false, lastMove: -10 };
    let lastPointerRipple = -10;
    const onPointerMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      pointer.x = nx;
      pointer.y = 1 - ny; // gl y-up
      pointer.active = true;
      pointer.lastMove = now();
      if (now() - lastPointerRipple > 0.34) {
        lastPointerRipple = now();
        addRipple(nx, 1 - ny, 0.13);
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      addRipple((e.clientX - rect.left) / rect.width, 1 - (e.clientY - rect.top) / rect.height, 0.5);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });

    // one persistent ring source, right-of-centre like the reference —
    // staggered births so a full concentric train is always on screen
    const SRC_X = 0.63, SRC_Y = 0.46;
    for (let i = 0; i < 5; i++) {
      const r = ripples[writeIdx] ?? ({} as Ripple);
      r.x = SRC_X + (Math.random() - 0.5) * 0.04;
      r.y = SRC_Y + (Math.random() - 0.5) * 0.04;
      r.birth = -i * 1.5;
      r.strength = 0.42;
      ripples[writeIdx] = r;
      writeIdx = (writeIdx + 1) % MAX_RIPPLES;
    }
    let srcAcc = 0;

    // ---------- loop ----------
    let raf = 0;
    let prev = 0;
    let ambientAcc = 0;
    let onScreen = true;
    let pageVisible = !document.hidden;

    const drawKoi = (dt: number) => {
      // fade previous frame → long motion-blur smears
      kctx.globalCompositeOperation = 'destination-out';
      kctx.fillStyle = 'rgba(0,0,0,0.09)';
      kctx.fillRect(0, 0, cssW, cssH);
      kctx.globalCompositeOperation = 'source-over';

      for (const k of koi) {
        k.wander += dt * 0.45;
        k.phase += dt * 8;
        // gentle noise-ish heading drift
        let desired = k.angle + Math.sin(k.wander) * 0.8 + Math.sin(k.wander * 0.37) * 0.45;
        // a barely-there veer away from the pointer when it passes close by —
        // koi notice the disturbance, they don't chase the cursor
        if (pointer.active && now() - pointer.lastMove < 0.9) {
          const px = pointer.x * cssW;
          const py = (1 - pointer.y) * cssH;
          const dx = k.x - px, dy = k.y - py;
          const dist = Math.hypot(dx, dy);
          const reach = cssW * 0.16;
          if (dist < reach) {
            const away = Math.atan2(dy, dx);
            const push = (1 - dist / reach) * 0.22;
            desired = k.angle + angleDelta(k.angle, away) * push;
          }
        }
        k.angle += angleDelta(k.angle, desired) * Math.min(1, dt * 0.8);
        k.x += Math.cos(k.angle) * k.speed * dt;
        k.y += Math.sin(k.angle) * k.speed * dt;

        // wrap with margin
        const m = k.len * 1.5;
        if (k.x < -m) k.x = cssW + m;
        if (k.x > cssW + m) k.x = -m;
        if (k.y < -m) k.y = cssH + m;
        if (k.y > cssH + m) k.y = -m;

        const wag = Math.sin(k.phase) * 0.16;
        const tailSwing = Math.sin(k.phase - 0.8) * k.len * 0.16;
        kctx.save();
        kctx.translate(k.x, k.y);
        kctx.rotate(k.angle + wag);
        kctx.filter = 'blur(3px)';
        kctx.globalAlpha = 0.7;
        // warm glow haze bleeding into the water
        kctx.shadowColor = 'rgba(255,120,44,0.45)';
        kctx.shadowBlur = k.len * 0.38;
        // caudal fin — split tail sweeping behind
        kctx.beginPath();
        kctx.moveTo(-k.len * 0.30, 0);
        kctx.quadraticCurveTo(-k.len * 0.60, tailSwing - k.len * 0.05, -k.len * 0.82, tailSwing - k.len * 0.24);
        kctx.quadraticCurveTo(-k.len * 0.56, tailSwing, -k.len * 0.82, tailSwing + k.len * 0.24);
        kctx.quadraticCurveTo(-k.len * 0.60, tailSwing + k.len * 0.05, -k.len * 0.30, 0);
        kctx.closePath();
        kctx.fillStyle = 'rgba(240,70,34,0.55)';
        kctx.fill();
        // body — tapered teardrop, deep vermilion core → orange edge
        const grad = kctx.createLinearGradient(-k.len * 0.4, 0, k.len * 0.52, 0);
        grad.addColorStop(0, 'rgba(230,52,24,0.12)');
        grad.addColorStop(0.30, 'rgba(224,40,20,1.0)');
        grad.addColorStop(0.62, 'rgba(255,92,36,1.0)');
        grad.addColorStop(0.86, 'rgba(255,150,74,0.85)');
        grad.addColorStop(1, 'rgba(255,205,130,0)');
        kctx.fillStyle = grad;
        kctx.beginPath();
        kctx.moveTo(-k.len * 0.34, 0);
        kctx.quadraticCurveTo(-k.len * 0.05, -k.len * 0.19, k.len * 0.34, -k.len * 0.075);
        kctx.quadraticCurveTo(k.len * 0.54, 0, k.len * 0.34, k.len * 0.075);
        kctx.quadraticCurveTo(-k.len * 0.05, k.len * 0.19, -k.len * 0.34, 0);
        kctx.closePath();
        kctx.fill();
        // faint segment ticks so the body reads as a fish, not a smear
        kctx.shadowBlur = 0;
        kctx.globalAlpha = 0.28;
        kctx.strokeStyle = 'rgba(150,20,12,0.9)';
        kctx.lineWidth = Math.max(1, k.len * 0.012);
        for (let s = -1; s <= 3; s++) {
          const bx = s * k.len * 0.11;
          const bh = k.len * 0.12 * (1 - Math.abs(bx) / (k.len * 0.5));
          kctx.beginPath();
          kctx.moveTo(bx, -bh);
          kctx.quadraticCurveTo(bx - k.len * 0.04, 0, bx, bh);
          kctx.stroke();
        }
        kctx.restore();
      }
      kctx.filter = 'none';
      kctx.shadowBlur = 0;
      kctx.globalAlpha = 1;
    };

    const frame = () => {
      const time = now();
      const dt = Math.min(0.05, time - prev || 0.016);
      prev = time;

      // keep the main ring source alive
      srcAcc += dt;
      if (srcAcc > 3.2) {
        srcAcc = 0;
        addRipple(SRC_X + (Math.random() - 0.5) * 0.05, SRC_Y + (Math.random() - 0.5) * 0.05, 0.36 + Math.random() * 0.14);
      }
      // occasional faint ripple elsewhere
      ambientAcc += dt;
      if (ambientAcc > 5.0) {
        ambientAcc = 0;
        addRipple(0.3 + Math.random() * 0.55, 0.3 + Math.random() * 0.55, 0.16 + Math.random() * 0.12);
      }

      // pack ripple uniforms
      let count = 0;
      for (const r of ripples) {
        if (!r) continue;
        if (time - r.birth > 7.0) continue;
        const o = count * 4;
        ripplesBuf[o] = r.x;
        ripplesBuf[o + 1] = r.y;
        ripplesBuf[o + 2] = r.birth;
        ripplesBuf[o + 3] = r.strength;
        count++;
        if (count >= MAX_RIPPLES) break;
      }
      program.uniforms.uRippleCount.value = count;
      program.uniforms.iTime.value = time;
      renderer.render({ scene: mesh });

      drawKoi(dt);
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (reduceMotion) { renderer.render({ scene: mesh }); return; }
      if (onScreen && pageVisible && raf === 0) { prev = now(); raf = requestAnimationFrame(frame); }
    };
    const stop = () => { if (raf !== 0) { cancelAnimationFrame(raf); raf = 0; } };

    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (onScreen) start(); else stop();
    }, { threshold: 0 });
    io.observe(host);

    const onVis = () => {
      pageVisible = !document.hidden;
      if (pageVisible) start(); else stop();
    };
    document.addEventListener('visibilitychange', onVis);

    start();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      try { host.removeChild(glCanvas); } catch { /* ignore */ }
      try { host.removeChild(koiCanvas); } catch { /* ignore */ }
      const lose = gl.getExtension('WEBGL_lose_context');
      lose?.loseContext();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} className={className} style={{ position: 'absolute', inset: 0 }} />;
};

// shortest signed angular difference from a → b
function angleDelta(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export default WaterHero;
