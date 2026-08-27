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

const MAX_RIPPLES = 16; // ripple ring pool size

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

// organic water caustic — domain-warped ridged fbm, irregular light veins
float caustic(vec2 p, float t){
  float c = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++){
    vec2 q = p * (1.8 + float(i) * 1.25);
    // swirl the sample point so veins curve naturally
    q += (vec2(fbm(q * 0.5 + t * 0.09),
               fbm(q * 0.5 - t * 0.11 + 3.7)) - 0.5) * 1.6;
    float n = fbm(q + t * 0.13);
    c += amp * pow(1.0 - abs(2.0 * n - 1.0), 3.5);
    amp *= 0.55;
  }
  return c;
}

void main(){
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  float aspect = iResolution.x / iResolution.y;
  vec2 auv = vec2(uv.x * aspect, uv.y);

  // ---- ripple field: damped wavefronts (ambient + cursor) ----
  float height = 0.0;   // surface height, drives refraction + shading
  vec2  grad = vec2(0.0);
  float sheen = 0.0;    // faint specular on the leading crest
  for (int i = 0; i < ${MAX_RIPPLES}; i++){
    if (float(i) >= uRippleCount) break;
    vec4 r = uRipples[i];
    float age = iTime - r.z;
    if (age < 0.0 || age > 6.0) continue;
    vec2 cc = vec2(r.x * aspect, r.y);
    float d = distance(auv, cc);
    float radius = age * 0.36;
    float life = 1.0 - age / 6.0;
    float band = d - radius;
    // a train of ~3 concentric waves, decaying behind the front
    float envelope = exp(-abs(band) * 4.5) * exp(-max(band, 0.0) * 2.0) * life * life;
    float phase = band * 34.0 - age * 5.0;
    height += sin(phase) * envelope * r.w;
    vec2 dir = d > 1e-4 ? (auv - cc) / d : vec2(0.0);
    grad += dir * cos(phase) * envelope * r.w;
    sheen += max(sin(phase), 0.0) * exp(-abs(band) * 7.0) * life * r.w;
  }

  // ---- surface: slow organic swell + ripple slope → refraction offset ----
  float swell = fbm(auv * 1.4 + iTime * 0.025);
  vec2 slope = (vec2(fbm(auv * 2.6 + iTime * 0.04) - 0.5,
                     fbm(auv * 2.6 - iTime * 0.037 + 7.0) - 0.5)) * 0.09
             + grad * 0.16;

  // ---- caustics: two octaves, bent by the surface slope ----
  vec2 wuv = (auv + slope) * 3.6 + vec2(iTime * 0.045, iTime * 0.07);
  float ca = caustic(wuv, iTime) * 0.9 + caustic(wuv * 2.1 - 4.0, iTime * 1.3) * 0.4;
  ca *= uCaustic;

  // broad slow light/shadow patches for depth
  float shade = fbm(auv * 1.5 - iTime * 0.02 + slope * 3.0) - 0.5;

  // ---- base water colour: deep at top → bright cyan at bottom ----
  float g = clamp(uv.y + (swell - 0.5) * 0.13 + height * 0.05, 0.0, 1.0);
  vec3 base = g < 0.42
    ? mix(uColorBot, uColorMid, g / 0.42)
    : mix(uColorMid, uColorTop, pow((g - 0.42) / 0.58, 0.85));
  base += vec3(0.10, 0.20, 0.26) * shade * 0.5;
  // light entering the water, a touch stronger up-screen
  base += vec3(0.04, 0.07, 0.09) * smoothstep(1.5, -0.1, uv.x + uv.y);

  // caustic light — soft cyan-white, stronger where the water is shallower
  float causticMix = ca * mix(0.14, 0.40, 1.0 - uv.y);
  vec3 col = base + vec3(0.55, 0.88, 1.0) * causticMix;

  // ripple shading: refraction darkens troughs, brightens crests; faint sheen
  col += vec3(0.32, 0.56, 0.78) * height * 0.16;
  col += vec3(0.75, 0.92, 1.0) * sheen * 0.20;

  // gentle depth vignette
  vec2 vd = uv - 0.5;
  col *= 1.0 - dot(vd, vd) * 0.28;

  // mild saturation lift, nothing garish
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, 1.10);

  // very fine grain
  col += (hash1(gl_FragCoord.xy + iTime) - 0.5) * 0.014;

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
  colorTop = '#0a44cf',
  colorMid = '#1577dc',
  colorBot = '#37b9ec',
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
    glCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;filter:blur(1.8px);transform:scale(1.05);';
    host.appendChild(glCanvas);

    const ripplesBuf = new Float32Array(MAX_RIPPLES * 4);
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
    koiCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    host.appendChild(koiCanvas);
    const kctx = koiCanvas.getContext('2d')!;

    let cssW = 1, cssH = 1;
    const koi: Koi[] = [];
    const seedKoi = () => {
      koi.length = 0;
      const n = reduceMotion ? 0 : 4;
      for (let i = 0; i < n; i++) {
        koi.push({
          x: Math.random() * cssW,
          y: cssH * (0.25 + Math.random() * 0.65),
          angle: Math.random() * Math.PI * 2,
          speed: 44 + Math.random() * 30,
          len: 56 + Math.random() * 30,
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
      if (now() - lastPointerRipple > 0.11) {
        lastPointerRipple = now();
        addRipple(nx, 1 - ny, 0.5);
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      addRipple((e.clientX - rect.left) / rect.width, 1 - (e.clientY - rect.top) / rect.height, 1.1);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });

    // seed staggered rings so the surface is alive immediately
    for (let i = 0; i < 6; i++) {
      const r = ripples[writeIdx] ?? ({} as Ripple);
      r.x = Math.random();
      r.y = Math.random() * 0.8;
      r.birth = -i * 0.9;
      r.strength = 1.1;
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
      // fade previous frame → motion-blur trails
      kctx.globalCompositeOperation = 'destination-out';
      kctx.fillStyle = 'rgba(0,0,0,0.09)';
      kctx.fillRect(0, 0, cssW, cssH);
      kctx.globalCompositeOperation = 'source-over';

      for (const k of koi) {
        k.wander += dt * 0.6;
        k.phase += dt * 9;
        // gentle noise-ish heading drift
        let desired = k.angle + Math.sin(k.wander) * 0.9 + Math.sin(k.wander * 0.37) * 0.5;
        // lean toward the pointer when it is near and recently moved
        if (pointer.active && now() - pointer.lastMove < 1.6) {
          const px = pointer.x * cssW;
          const py = (1 - pointer.y) * cssH;
          const dx = px - k.x, dy = py - k.y;
          const dist = Math.hypot(dx, dy);
          if (dist < cssW * 0.34) {
            const toPointer = Math.atan2(dy, dx);
            const pull = (1 - dist / (cssW * 0.34)) * 0.6;
            desired = k.angle + angleDelta(k.angle, toPointer) * pull;
          }
        }
        k.angle += angleDelta(k.angle, desired) * Math.min(1, dt * 1.6);
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
        kctx.filter = 'blur(2.5px)';
        kctx.globalAlpha = 0.82;
        // caudal fin — split tail sweeping behind
        kctx.beginPath();
        kctx.moveTo(-k.len * 0.34, 0);
        kctx.quadraticCurveTo(-k.len * 0.62, tailSwing - k.len * 0.05, -k.len * 0.78, tailSwing - k.len * 0.24);
        kctx.quadraticCurveTo(-k.len * 0.58, tailSwing, -k.len * 0.78, tailSwing + k.len * 0.24);
        kctx.quadraticCurveTo(-k.len * 0.62, tailSwing + k.len * 0.05, -k.len * 0.34, 0);
        kctx.closePath();
        kctx.fillStyle = 'rgba(255,96,44,0.55)';
        kctx.fill();
        // body — tapered teardrop
        const grad = kctx.createLinearGradient(-k.len * 0.4, 0, k.len * 0.5, 0);
        grad.addColorStop(0, 'rgba(255,88,38,0.15)');
        grad.addColorStop(0.35, 'rgba(255,74,32,0.98)');
        grad.addColorStop(0.72, 'rgba(255,122,52,0.95)');
        grad.addColorStop(1, 'rgba(255,190,110,0)');
        kctx.fillStyle = grad;
        kctx.beginPath();
        kctx.moveTo(-k.len * 0.36, 0);
        kctx.quadraticCurveTo(-k.len * 0.05, -k.len * 0.19, k.len * 0.32, -k.len * 0.08);
        kctx.quadraticCurveTo(k.len * 0.52, 0, k.len * 0.32, k.len * 0.08);
        kctx.quadraticCurveTo(-k.len * 0.05, k.len * 0.19, -k.len * 0.36, 0);
        kctx.closePath();
        kctx.fill();
        kctx.restore();
      }
      kctx.filter = 'none';
      kctx.globalAlpha = 1;
    };

    const frame = () => {
      const time = now();
      const dt = Math.min(0.05, time - prev || 0.016);
      prev = time;

      // ambient ripples, biased to the lower half
      ambientAcc += dt;
      if (ambientAcc > 0.5) {
        ambientAcc = 0;
        addRipple(Math.random(), Math.random() * 0.8, 1.05 + Math.random() * 0.5);
      }

      // pack ripple uniforms
      let count = 0;
      for (const r of ripples) {
        if (!r) continue;
        if (time - r.birth > 6.0) continue;
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
