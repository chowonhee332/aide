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
    if (age < 0.0) continue;
    // per-ripple randomness so no two rings look alike
    float vr  = fract(sin(r.z * 78.233 + r.x * 41.71 + r.y * 12.13) * 43758.5453);
    float vr2 = fract(vr * 197.31 + 0.5);
    float maxAge = 6.0 + vr2 * 5.5;
    if (age > maxAge) continue;
    vec2 cc = vec2(r.x * aspect, r.y);
    vec2 to = auv - cc;
    float d = length(to);
    float radius = 0.02 + age * (0.085 + vr * 0.11);   // each grows at its own rate
    float band = d - radius;
    float life = 1.0 - age / maxAge;
    // narrow gaussian envelope + matched frequency → just two rings per wave
    float env = exp(-band * band * (620.0 + vr * 320.0)) * life;
    float phase = band * (122.0 + vr * 28.0) - age * (5.0 + vr2 * 4.0);
    float wave = sin(phase);
    vec2 dir = d > 1e-4 ? to / d : vec2(0.0);
    rippleSlope += dir * cos(phase) * env * r.w * 0.05;
    ringLight   += max(wave, 0.0) * env * r.w;
    ringWarp    += wave * env * r.w;
  }

  // ---- caustic web, warped by the swirl and the ripple slope ----
  vec2 cuv = auv * 1.35 + swirl + rippleSlope + vec2(t * 0.011, t * 0.019);
  float web = causticWeb(cuv, t);
  web += causticWeb(cuv * 1.9 + 11.0, t * 1.35) * 0.5;
  web *= uCaustic;

  // ---- base colour: deep cobalt mass (top) → luminous cyan (bottom) ----
  // premium soft-focus gradient: deep blue holds through most of the frame,
  // cyan reads as a glow only near the lower edge
  float gy = clamp(uv.y + ringWarp * 0.012
                 + (fbm(auv * 1.3 + swirl * 2.0 + t * 0.03) - 0.5) * 0.06, 0.0, 1.0);
  float gg = pow(gy, 0.62);
  vec3 base = mix(uColorBot, uColorTop, gg);
  base = mix(base, uColorMid, (1.0 - abs(gg - 0.5) * 2.0) * 0.30);

  // one big soft light bloom drifting low, like an abstract gradient wallpaper
  vec2 bc = vec2(0.40 + 0.06 * sin(t * 0.05), 0.10 + 0.04 * sin(t * 0.037 + 2.0));
  float bloom = exp(-pow(length((uv - bc) * vec2(1.0, 1.35)), 1.6) * 3.2);
  base = mix(base, uColorBot * 1.04 + vec3(0.05), bloom * 0.42);

  // very gentle drift in tone — smooth, not mottled
  float shade = fbm(auv * 0.9 + swirl * 1.8 - t * 0.02);
  base *= 0.97 + shade * 0.09;

  // ---- compose ----
  vec3 col = base;
  vec3 causticTint = mix(vec3(0.46, 0.68, 0.80), vec3(0.70, 0.90, 0.94), uv.y);
  col += causticTint * web * mix(0.22, 0.09, uv.y);   // subtle, richer near the bottom
  col += vec3(0.72, 0.87, 0.97) * ringLight * 0.22;   // the two ring crests

  // ---- vignette: deeper cobalt corners, luminous lower centre ----
  vec2 vd = uv - vec2(0.5, 0.28);
  float vig = clamp(1.0 - dot(vd, vd) * 0.85, 0.0, 1.0);
  col *= mix(0.74, 1.0, vig);
  col *= 1.0 - smoothstep(0.78, 1.0, uv.y) * 0.12;    // deepen the top for nav + mass

  // clean and photographic — not neon, not murky
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, 1.06);
  col = pow(clamp(col * 0.99, 0.0, 1.0), vec3(1.03));

  col += (hash1(gl_FragCoord.xy + t) - 0.5) * 0.012;
  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

interface Ripple { x: number; y: number; birth: number; strength: number; }

interface Koi {
  x: number; y: number;
  angle: number;      // current facing (rendered)
  dir: number;        // target bearing — evolves as a damped random walk
  dirVel: number;     // angular velocity of that target
  speed: number;
  len: number;
  phase: number;      // tail-beat phase
  tint: number;       // 0 = deep vermilion, 1 = warmer orange
}

interface WaterHeroProps {
  colorTop?: string;
  colorMid?: string;
  colorBot?: string;
  caustic?: number;
  className?: string;
}

const WaterHero = ({
  colorTop = '#0068ff',
  colorMid = '#0e9dfa',
  colorBot = '#1dd2f6',
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
        const heading = Math.random() * Math.PI * 2;
        koi.push({
          x: cssW * (0.45 + Math.random() * 0.45),
          y: cssH * (0.22 + Math.random() * 0.42),   // reference: koi roam the right side
          angle: heading,
          dir: heading,
          dirVel: 0,
          speed: 40 + Math.random() * 22,
          len: 130 + Math.random() * 70,
          phase: Math.random() * Math.PI * 2,
          tint: Math.random(),
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
      if (now() - lastPointerRipple > 0.4) {
        lastPointerRipple = now();
        addRipple(nx, 1 - ny, 0.2);
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      addRipple((e.clientX - rect.left) / rect.width, 1 - (e.clientY - rect.top) / rect.height, 0.7);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });

    // a drifting ring source, right-of-centre like the reference. Seeded
    // irregularly (varied age, offset, strength) so it never reads as a loop.
    const src = { x: 0.62, y: 0.45 };
    for (let i = 0; i < 4; i++) {
      const r = ripples[writeIdx] ?? ({} as Ripple);
      r.x = src.x + (Math.random() - 0.5) * 0.12;
      r.y = src.y + (Math.random() - 0.5) * 0.12;
      r.birth = -(0.6 + Math.random() * 5.0);
      r.strength = 0.3 + Math.random() * 0.28;
      ripples[writeIdx] = r;
      writeIdx = (writeIdx + 1) % MAX_RIPPLES;
    }
    let srcAcc = 0;
    let srcNext = 1.4 + Math.random() * 2.6;

    // ---------- loop ----------
    let raf = 0;
    let prev = 0;
    let ambientAcc = 0;
    let onScreen = true;
    let pageVisible = !document.hidden;

    const drawKoi = (dt: number) => {
      // fade previous frame → long motion-blur smears
      kctx.globalCompositeOperation = 'destination-out';
      kctx.fillStyle = 'rgba(0,0,0,0.14)';
      kctx.fillRect(0, 0, cssW, cssH);
      kctx.globalCompositeOperation = 'source-over';

      for (const k of koi) {
        // tail beats a little faster when swimming faster
        k.phase += dt * (3.2 + k.speed * 0.04);

        // heading target evolves as a damped random walk → smooth, lazy turns
        k.dirVel += (Math.random() - 0.5) * dt * 0.5;
        k.dirVel *= Math.pow(0.5, dt * 1.5);
        k.dirVel = Math.max(-0.5, Math.min(0.5, k.dirVel));
        k.dir += k.dirVel * dt;

        // soft containment — steer the target back toward the roaming zone
        // well before a koi reaches the edge, so they stay in frame
        const cx = cssW * 0.64, cy = cssH * 0.42;
        const off = Math.hypot((k.x - cx) / (cssW * 0.44), (k.y - cy) / (cssH * 0.34));
        if (off > 0.8) {
          const toCentre = Math.atan2(cy - k.y, cx - k.x);
          k.dir += angleDelta(k.dir, toCentre) * Math.min(0.16, (off - 0.8) * 0.5);
        }
        // barely-there veer away from a passing cursor
        if (pointer.active && now() - pointer.lastMove < 0.9) {
          const px = pointer.x * cssW;
          const py = (1 - pointer.y) * cssH;
          const dx = k.x - px, dy = k.y - py;
          const dist = Math.hypot(dx, dy);
          const reach = cssW * 0.16;
          if (dist < reach) {
            const away = Math.atan2(dy, dx);
            k.dir += angleDelta(k.dir, away) * (1 - dist / reach) * 0.6 * Math.min(1, dt * 3);
          }
        }

        // ease the visible facing toward the target bearing
        k.angle += angleDelta(k.angle, k.dir) * Math.min(1, dt * 1.1);

        // glide-and-surge: a touch faster on each tail push
        const surge = 0.8 + 0.35 * Math.max(0, Math.sin(k.phase));
        k.x += Math.cos(k.angle) * k.speed * surge * dt;
        k.y += Math.sin(k.angle) * k.speed * surge * dt;

        // wrap with margin
        const m = k.len * 1.5;
        if (k.x < -m) k.x = cssW + m;
        if (k.x > cssW + m) k.x = -m;
        if (k.y < -m) k.y = cssH + m;
        if (k.y > cssH + m) k.y = -m;

        const L = k.len;
        const bend = Math.sin(k.phase) * L * 0.05;          // slight body curve
        const tail = Math.sin(k.phase - 1.0) * L * 0.17;    // tail sweep
        const core = k.tint < 0.5 ? '236,40,18' : '246,66,24';
        kctx.save();
        kctx.translate(k.x, k.y);
        kctx.rotate(k.angle);
        kctx.filter = 'blur(2px)';
        kctx.globalAlpha = 0.82;
        // warm glow haze bleeding into the water
        kctx.shadowColor = 'rgba(255,120,44,0.5)';
        kctx.shadowBlur = L * 0.3;

        // ---- caudal fin: soft fork trailing behind, blends into the body ----
        kctx.beginPath();
        kctx.moveTo(-L * 0.32, bend * 0.4);
        kctx.quadraticCurveTo(-L * 0.55, tail - L * 0.04, -L * 0.66, tail - L * 0.17);
        kctx.quadraticCurveTo(-L * 0.5, tail, -L * 0.66, tail + L * 0.17);
        kctx.quadraticCurveTo(-L * 0.55, tail + L * 0.04, -L * 0.32, bend * 0.4);
        kctx.closePath();
        kctx.fillStyle = `rgba(${core},0.45)`;
        kctx.fill();

        // ---- body: smooth teardrop — crisp red head → warm rim → smeary tail ----
        const bg = kctx.createLinearGradient(L * 0.5, 0, -L * 0.42, 0);
        bg.addColorStop(0, 'rgba(255,118,52,0.9)');   // head tip catches the light
        bg.addColorStop(0.16, `rgba(${core},1)`);
        bg.addColorStop(0.55, `rgba(${core},1)`);
        bg.addColorStop(0.82, 'rgba(246,78,30,0.78)');
        bg.addColorStop(1, 'rgba(255,150,70,0)');     // tail dissolves into motion blur
        kctx.fillStyle = bg;
        kctx.beginPath();
        kctx.moveTo(L * 0.5, bend);
        kctx.quadraticCurveTo(L * 0.14, -L * 0.17 + bend, -L * 0.2, -L * 0.07 + bend * 0.5);
        kctx.quadraticCurveTo(-L * 0.36, 0, -L * 0.2, L * 0.07 + bend * 0.5);
        kctx.quadraticCurveTo(L * 0.14, L * 0.17 + bend, L * 0.5, bend);
        kctx.closePath();
        kctx.fill();

        // ---- warm chromatic rim along the trailing lower edge ----
        kctx.shadowBlur = 0;
        kctx.globalAlpha = 0.5;
        kctx.strokeStyle = 'rgba(255,196,96,0.6)';
        kctx.lineWidth = Math.max(1.5, L * 0.028);
        kctx.lineCap = 'round';
        kctx.beginPath();
        kctx.moveTo(L * 0.4, bend + L * 0.02);
        kctx.quadraticCurveTo(L * 0.08, L * 0.18 + bend, -L * 0.22, L * 0.07 + bend * 0.5);
        kctx.stroke();

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

      // drifting main source, fired at irregular intervals — sometimes a
      // lone ring, sometimes a quick double, never a fixed beat
      src.x += (Math.sin(time * 0.13) * 0.5 + Math.sin(time * 0.041 + 1.7) * 0.5) * dt * 0.06;
      src.y += (Math.sin(time * 0.09 + 3.0) * 0.5 + Math.sin(time * 0.037) * 0.5) * dt * 0.05;
      src.x = Math.min(0.82, Math.max(0.4, src.x));
      src.y = Math.min(0.7, Math.max(0.28, src.y));
      srcAcc += dt;
      if (srcAcc > srcNext) {
        srcAcc = 0;
        srcNext = 1.8 + Math.random() * 3.8;
        addRipple(src.x + (Math.random() - 0.5) * 0.06, src.y + (Math.random() - 0.5) * 0.06, 0.36 + Math.random() * 0.24);
        if (Math.random() < 0.35) {
          addRipple(src.x + (Math.random() - 0.5) * 0.14, src.y + (Math.random() - 0.5) * 0.14, 0.24 + Math.random() * 0.18);
        }
      }
      // occasional faint ripple somewhere else entirely
      ambientAcc += dt;
      if (ambientAcc > 3.5 + Math.random() * 4.0) {
        ambientAcc = 0;
        addRipple(0.15 + Math.random() * 0.75, 0.25 + Math.random() * 0.6, 0.12 + Math.random() * 0.16);
      }

      // pack ripple uniforms
      let count = 0;
      for (const r of ripples) {
        if (!r) continue;
        if (time - r.birth > 12.0) continue;
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
