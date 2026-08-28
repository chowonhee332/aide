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
uniform vec3  uColorTop;   // deep blue  (top of screen)
uniform vec3  uColorMid;   // mid blue
uniform vec3  uColorBot;   // pale cyan  (bottom of screen)
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
  for (int i = 0; i < 4; i++){ v += a * vnoise(p); p = p * 2.02; a *= 0.5; }
  return v;
}

// broad, soft, low-contrast caustic blobs (a defocused pool, not a sharp net)
float softCaustic(vec2 p, float t){
  vec2 q = p;
  q += (vec2(fbm(q * 0.6 + t * 0.05),
             fbm(q * 0.6 - t * 0.04 + 5.0)) - 0.5) * 1.3;
  float n = fbm(q * 1.25 + t * 0.07);
  return pow(smoothstep(0.24, 0.86, n), 1.5);
}

void main(){
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  float aspect = iResolution.x / iResolution.y;
  vec2 auv = vec2(uv.x * aspect, uv.y);

  // ---- ripple field: large soft concentric rings (ambient + cursor wake) ----
  float height = 0.0;
  vec2  grad = vec2(0.0);
  float ringLight = 0.0;
  for (int i = 0; i < ${MAX_RIPPLES}; i++){
    if (float(i) >= uRippleCount) break;
    vec4 r = uRipples[i];
    float age = iTime - r.z;
    if (age < 0.0 || age > 7.0) continue;
    vec2 cc = vec2(r.x * aspect, r.y);
    float d = distance(auv, cc);
    float radius = age * 0.34;                    // slow → rings grow large
    float life = 1.0 - age / 7.0;
    float band = d - radius;
    // broad window: several concentric wavefronts visible together
    float env = exp(-abs(band) * 2.2) * exp(-max(band, 0.0) * 1.0) * life;
    float phase = band * 22.0 - age * 3.2;
    float wave = sin(phase);
    height += wave * env * r.w;
    vec2 dir = d > 1e-4 ? (auv - cc) / d : vec2(0.0);
    grad += dir * cos(phase) * env * r.w;
    ringLight += max(wave, 0.0) * env * life * r.w;
  }

  // ---- surface: gentle swell + ripple slope → refraction ----
  float swell = fbm(auv * 1.1 + iTime * 0.02);
  vec2 slope = (vec2(fbm(auv * 2.0 + iTime * 0.03) - 0.5,
                     fbm(auv * 2.0 - iTime * 0.028 + 7.0) - 0.5)) * 0.07
             + grad * 0.20;

  // ---- soft caustics ----
  vec2 wuv = (auv + slope) * 2.2 + vec2(iTime * 0.03, iTime * 0.05);
  float ca = softCaustic(wuv, iTime) * 0.7 + softCaustic(wuv * 1.9 - 3.0, iTime * 0.8) * 0.4;
  ca *= uCaustic;

  // ---- vertical light pillars in the upper water ----
  vec2 sc = vec2(auv.x * 5.0 + slope.x * 3.0, auv.y * 0.7 + iTime * 0.015);
  float streak = pow(smoothstep(0.35, 0.9, fbm(sc)), 2.0) * smoothstep(0.1, 0.85, uv.y);

  // ---- base colour: deep cobalt (top) → bright cyan (bottom), smooth ----
  float g = clamp(uv.y + (swell - 0.5) * 0.10 + height * 0.04, 0.0, 1.0);
  float gg = g * g * g * (g * (g * 6.0 - 15.0) + 10.0);   // smootherstep
  vec3 base = mix(uColorBot, uColorTop, gg);
  base = mix(base, uColorMid, (1.0 - abs(g - 0.5) * 2.0) * 0.35);
  base = mix(base, vec3(0.80, 0.94, 0.99), smoothstep(0.14, 0.0, uv.y) * 0.5);

  float shade = fbm(auv * 1.2 - iTime * 0.015 + slope * 2.0) - 0.5;
  base += vec3(0.06, 0.14, 0.20) * shade * 0.6;

  // ---- compose ----
  vec3 col = base;
  col += vec3(0.42, 0.78, 0.95) * ca * mix(0.10, 0.30, 1.0 - uv.y);
  col += vec3(0.55, 0.80, 1.0) * streak * 0.10;
  col += vec3(0.75, 0.92, 1.0) * ringLight * 0.55;
  col += vec3(0.25, 0.50, 0.75) * height * 0.14;

  // vignette + top darken for nav legibility
  vec2 vd = uv - vec2(0.5, 0.52);
  col *= 1.0 - dot(vd, vd) * 0.45;
  col *= 1.0 - smoothstep(0.82, 1.0, uv.y) * 0.18;

  // keep it photographic, not neon
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, 1.08);

  col += (hash1(gl_FragCoord.xy + iTime) - 0.5) * 0.012;
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
  colorTop = '#0836bf',
  colorMid = '#1466d6',
  colorBot = '#3fc8ee',
  caustic = 1.0,
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
    // heavy defocus — the reference is a shallow-DoF pool shot, not a sharp render
    glCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;filter:blur(6px);transform:scale(1.08);';
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
    koiCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;filter:blur(2.5px);';
    host.appendChild(koiCanvas);
    const kctx = koiCanvas.getContext('2d')!;

    let cssW = 1, cssH = 1;
    const koi: Koi[] = [];
    const seedKoi = () => {
      koi.length = 0;
      const n = reduceMotion ? 0 : 3;
      for (let i = 0; i < n; i++) {
        koi.push({
          x: Math.random() * cssW,
          y: cssH * (0.2 + Math.random() * 0.7),
          angle: Math.random() * Math.PI * 2,
          speed: 52 + Math.random() * 34,
          len: 100 + Math.random() * 70,
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
      if (now() - lastPointerRipple > 0.08) {
        lastPointerRipple = now();
        addRipple(nx, 1 - ny, 0.85);
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      addRipple((e.clientX - rect.left) / rect.width, 1 - (e.clientY - rect.top) / rect.height, 1.7);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });

    // seed staggered ring systems so a wake is always on screen
    for (let i = 0; i < 7; i++) {
      const r = ripples[writeIdx] ?? ({} as Ripple);
      r.x = 0.45 + Math.random() * 0.5;   // biased to the right, like the reference
      r.y = 0.35 + Math.random() * 0.55;
      r.birth = -i * 0.9;
      r.strength = 0.75;
      ripples[writeIdx] = r;
      writeIdx = (writeIdx + 1) % MAX_RIPPLES;
    }

    // ---------- loop ----------
    let raf = 0;
    let prev = 0;
    let ambientAcc = 0;
    let onScreen = true;
    let pageVisible = !document.hidden;

    const drawKoi = (dt: number) => {
      // fade previous frame → long motion-blur smears
      kctx.globalCompositeOperation = 'destination-out';
      kctx.fillStyle = 'rgba(0,0,0,0.055)';
      kctx.fillRect(0, 0, cssW, cssH);
      kctx.globalCompositeOperation = 'source-over';

      for (const k of koi) {
        k.wander += dt * 0.45;
        k.phase += dt * 8;
        // gentle noise-ish heading drift
        let desired = k.angle + Math.sin(k.wander) * 0.8 + Math.sin(k.wander * 0.37) * 0.45;
        // lean toward the pointer when it is near and recently moved
        if (pointer.active && now() - pointer.lastMove < 1.8) {
          const px = pointer.x * cssW;
          const py = (1 - pointer.y) * cssH;
          const dx = px - k.x, dy = py - k.y;
          const dist = Math.hypot(dx, dy);
          if (dist < cssW * 0.42) {
            const toPointer = Math.atan2(dy, dx);
            const pull = (1 - dist / (cssW * 0.42)) * 0.7;
            desired = k.angle + angleDelta(k.angle, toPointer) * pull;
          }
        }
        k.angle += angleDelta(k.angle, desired) * Math.min(1, dt * 1.4);
        k.x += Math.cos(k.angle) * k.speed * dt;
        k.y += Math.sin(k.angle) * k.speed * dt;

        // wrap with margin
        const m = k.len * 1.5;
        if (k.x < -m) k.x = cssW + m;
        if (k.x > cssW + m) k.x = -m;
        if (k.y < -m) k.y = cssH + m;
        if (k.y > cssH + m) k.y = -m;

        const wag = Math.sin(k.phase) * 0.14;
        const tailSwing = Math.sin(k.phase - 0.8) * k.len * 0.14;
        kctx.save();
        kctx.translate(k.x, k.y);
        kctx.rotate(k.angle + wag);
        kctx.filter = 'blur(4px)';
        kctx.globalAlpha = 0.7;
        // soft orange glow around the fish
        kctx.shadowColor = 'rgba(255,110,50,0.55)';
        kctx.shadowBlur = k.len * 0.5;
        // caudal fin — split tail sweeping behind
        kctx.beginPath();
        kctx.moveTo(-k.len * 0.32, 0);
        kctx.quadraticCurveTo(-k.len * 0.62, tailSwing - k.len * 0.05, -k.len * 0.80, tailSwing - k.len * 0.22);
        kctx.quadraticCurveTo(-k.len * 0.58, tailSwing, -k.len * 0.80, tailSwing + k.len * 0.22);
        kctx.quadraticCurveTo(-k.len * 0.62, tailSwing + k.len * 0.05, -k.len * 0.32, 0);
        kctx.closePath();
        kctx.fillStyle = 'rgba(255,90,40,0.5)';
        kctx.fill();
        // body — tapered teardrop, vivid orange-red
        const grad = kctx.createLinearGradient(-k.len * 0.4, 0, k.len * 0.5, 0);
        grad.addColorStop(0, 'rgba(255,80,34,0.10)');
        grad.addColorStop(0.32, 'rgba(255,66,26,1.0)');
        grad.addColorStop(0.7, 'rgba(255,116,44,0.96)');
        grad.addColorStop(1, 'rgba(255,190,110,0)');
        kctx.fillStyle = grad;
        kctx.beginPath();
        kctx.moveTo(-k.len * 0.34, 0);
        kctx.quadraticCurveTo(-k.len * 0.05, -k.len * 0.17, k.len * 0.32, -k.len * 0.07);
        kctx.quadraticCurveTo(k.len * 0.52, 0, k.len * 0.32, k.len * 0.07);
        kctx.quadraticCurveTo(-k.len * 0.05, k.len * 0.17, -k.len * 0.34, 0);
        kctx.closePath();
        kctx.fill();
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

      // ambient ripples, biased to the lower half
      ambientAcc += dt;
      if (ambientAcc > 1.6) {
        ambientAcc = 0;
        addRipple(0.3 + Math.random() * 0.65, 0.3 + Math.random() * 0.6, 0.4 + Math.random() * 0.35);
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
