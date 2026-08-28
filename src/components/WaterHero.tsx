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

const MAX_RIPPLES = 18; // ripple pool — enough for an ambient pool disturbance

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return [1, 1, 1];
  return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
};

// Each koi is a plausible real koi colour, paired with a pool palette built the
// same way as the default blue one: a genuinely dark deep tone at the top of the
// frame easing to a luminous, saturated tone at the bottom — so every flooded
// palette reads as depth-and-glow, not one flat tint.
// body = core fill · rim = the glowing back-lit edge (subsurface scatter) ·
// deep = dark tone for the volume patches that give the body form
interface KoiKind { body: string; rim: string; deep: string; water: [string, string, string]; }
const KOI_KINDS: KoiKind[] = [
  { body: '226,74,42', rim: '255,186,96', deep: '112,22,10', water: ['#8a2410', '#e0431f', '#ff9a6b'] }, // vermilion (Kohaku)
  { body: '236,182,78', rim: '255,234,160', deep: '146,88,14', water: ['#7a4708', '#e0982a', '#ffe0a0'] }, // gold (Yamabuki Ogon)
  { body: '104,146,214', rim: '178,214,248', deep: '32,62,132', water: ['#0068ff', '#0e9dfa', '#1dd2f6'] }, // blue (Asagi) — default pool
];

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
uniform vec3  uInkTop;      // palette the ink-spread is transitioning toward
uniform vec3  uInkMid;
uniform vec3  uInkBot;
uniform vec2  uInkOrigin;   // click point, uv (y-up); ignored when uInkProgress <= 0
uniform float uInkProgress; // radius of the spreading ink front, uv units

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

  // ---- ripple rings: every disturbance organises the pool-caustic light into
  //      a train of many concentric rings and bends the caustic texture beneath
  //      them. The rings ARE the water's own light, never a painted overlay ----
  vec2  rippleWarp = vec2(0.0);   // displaces the caustic sample — the lensing
  float ringField  = 0.0;         // signed surface-height field → caustic gain
  float centrePlop = 0.0;         // tiny bright rebound at a fresh impact
  for (int k = 0; k < ${MAX_RIPPLES}; k++){
    if (float(k) >= uRippleCount) break;
    vec4 r = uRipples[k];
    float age = t - r.z;
    if (age < 0.0) continue;
    float vr  = fract(sin(r.z * 78.233 + r.x * 41.71 + r.y * 12.13) * 43758.5453);
    float vr2 = fract(vr * 197.31 + 0.5);
    float maxAge = 7.0 + vr2 * 6.0;
    if (age > maxAge) continue;
    vec2 cc = vec2(r.x * aspect, r.y);
    vec2 to = auv - cc;
    float d = length(to);
    vec2  dir = d > 1e-4 ? to / d : vec2(0.0);
    float life = 1.0 - age / maxAge;

    // energy rides out in an expanding annulus that widens and fades with age
    float front = age * (0.15 + vr * 0.09);
    float aw = front * 0.5 + 0.08;
    float annulus = exp(-pow((d - front * 0.62) / aw, 2.0)) * life * r.w;

    // a whole train of tight concentric rings, not just two
    float wl = 78.0 + vr * 46.0;
    float wave = sin(d * wl - age * (7.0 + vr2 * 4.0));

    ringField  += wave * annulus;
    rippleWarp += dir * wave * annulus * (2.2 / wl);
    centrePlop += exp(-d * d * 950.0) * exp(-age * 6.0) * r.w;
  }

  // ---- caustic web, warped by the swirl and lensed through the ripple rings ----
  vec2 cuv = auv * 1.35 + swirl + rippleWarp * 2.2 + vec2(t * 0.011, t * 0.019);
  float web = causticWeb(cuv, t);
  web += causticWeb(cuv * 1.9 + 11.0, t * 1.35) * 0.5;
  web *= uCaustic;
  // crests concentrate that caustic light into rings, troughs dim it → the
  // ripple shows in the water's own texture and colour, not as a separate line
  web *= 1.0 + ringField * 0.85;
  web = max(web, 0.0);

  // ---- ink spread: a clicked koi's palette floods out from the click point,
  //      warped by the ripple lens so the edge dissolves like real ink ----
  float inkMask = 0.0;
  if (uInkProgress > 0.0) {
    float dist = length((uv - uInkOrigin) * vec2(aspect, 1.0)) + rippleWarp.x * 0.6;
    inkMask = 1.0 - smoothstep(uInkProgress - 0.22, uInkProgress, dist);
  }
  vec3 cTop = mix(uColorTop, uInkTop, inkMask);
  vec3 cMid = mix(uColorMid, uInkMid, inkMask);
  vec3 cBot = mix(uColorBot, uInkBot, inkMask);

  // ---- base colour: deep mass (top) → luminous glow (bottom) ----
  // premium soft-focus gradient: the deep tone holds through most of the frame,
  // the bright tone reads as a glow only near the lower edge
  float gy = clamp(uv.y + rippleWarp.y * 0.35
                 + (fbm(auv * 1.3 + swirl * 2.0 + t * 0.03) - 0.5) * 0.06, 0.0, 1.0);
  float gg = pow(gy, 0.62);
  vec3 base = mix(cBot, cTop, gg);
  base = mix(base, cMid, (1.0 - abs(gg - 0.5) * 2.0) * 0.30);

  // one big soft light bloom drifting low, like an abstract gradient wallpaper
  vec2 bc = vec2(0.40 + 0.06 * sin(t * 0.05), 0.10 + 0.04 * sin(t * 0.037 + 2.0));
  float bloom = exp(-pow(length((uv - bc + rippleWarp * 0.5) * vec2(1.0, 1.35)), 1.6) * 3.2);
  base = mix(base, cBot * 1.04 + vec3(0.05), bloom * 0.42);

  // very gentle drift in tone — smooth, not mottled
  float shade = fbm(auv * 0.9 + swirl * 1.8 - t * 0.02);
  base *= 0.97 + shade * 0.09;

  // ---- compose ----
  vec3 col = base;
  vec3 causticTint = mix(vec3(0.46, 0.68, 0.80), vec3(0.70, 0.90, 0.94), uv.y);
  col += causticTint * web * mix(0.22, 0.09, uv.y);   // subtle, richer near the bottom

  // the ripple's only direct contribution: a faint broad lift on the crests and
  // a small rebound dot at a fresh impact — both in the caustic's own colour, so
  // the rings never separate from the surface
  col += causticTint * clamp(ringField, 0.0, 1.0) * 0.05;
  col += causticTint * centrePlop * 0.35;

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
  tx: number; ty: number; // personal roaming waypoint — re-picked on arrival
  angle: number;      // current facing (rendered)
  dir: number;        // target bearing — evolves as a damped random walk
  dirVel: number;     // angular velocity of that target
  speed: number;
  len: number;
  phase: number;      // tail-beat phase
  kind: number;       // index into KOI_KINDS — body colour + ink palette
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
    // both layers are drawn soft-focus (CSS blur), so rendering above ~1.25x
    // device pixels just burns memory and fill rate for no visible gain
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    const koiDpr = Math.min(dpr, 1);
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
        uInkTop: { value: new Float32Array(hexToRgb(colorTop)) },
        uInkMid: { value: new Float32Array(hexToRgb(colorMid)) },
        uInkBot: { value: new Float32Array(hexToRgb(colorBot)) },
        uInkOrigin: { value: new Float32Array([0.5, 0.5]) },
        uInkProgress: { value: 0 },
      },
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    // ---------- 2D koi overlay ----------
    const koiCanvas = document.createElement('canvas');
    koiCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;filter:blur(2.8px);';
    host.appendChild(koiCanvas);
    const kctx = koiCanvas.getContext('2d')!;

    let cssW = 1, cssH = 1;
    const koi: Koi[] = [];
    const seedKoi = () => {
      koi.length = 0;
      const n = reduceMotion ? 0 : 3;
      for (let i = 0; i < n; i++) {
        const heading = Math.random() * Math.PI * 2;
        // spread the starting points across the whole canvas
        const gx = ((i % 2) + 0.2 + Math.random() * 0.6) / 2;
        const gy = (Math.floor(i / 2) + 0.2 + Math.random() * 0.6) / 2;
        koi.push({
          x: cssW * gx,
          y: cssH * gy,
          tx: cssW * (0.08 + Math.random() * 0.84),
          ty: cssH * (0.1 + Math.random() * 0.78),
          angle: heading,
          dir: heading,
          dirVel: 0,
          speed: 82 + Math.random() * 50,
          len: 164 + Math.random() * 76,
          phase: Math.random() * Math.PI * 2,
          kind: i % KOI_KINDS.length,
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
      koiCanvas.width = Math.floor(cssW * koiDpr);
      koiCanvas.height = Math.floor(cssH * koiDpr);
      kctx.setTransform(koiDpr, 0, 0, koiDpr, 0, 0);
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

    // ---------- pointer ---------- (tracked only so the koi can veer around it —
    // the cursor no longer stamps ripples into the water)
    const pointer = { x: 0.5, y: 0.5, active: false, lastMove: -10 };
    const onPointerMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      pointer.x = (e.clientX - rect.left) / rect.width;
      pointer.y = 1 - (e.clientY - rect.top) / rect.height; // gl y-up
      pointer.active = true;
      pointer.lastMove = now();
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // ---------- ink spread ---------- clicking a koi floods the pool with that
    // koi's palette from the click point; when the front covers the frame the
    // new palette is baked into the live colour uniforms
    const liveTop = program.uniforms.uColorTop.value as Float32Array;
    const liveMid = program.uniforms.uColorMid.value as Float32Array;
    const liveBot = program.uniforms.uColorBot.value as Float32Array;
    const inkTop = program.uniforms.uInkTop.value as Float32Array;
    const inkMid = program.uniforms.uInkMid.value as Float32Array;
    const inkBot = program.uniforms.uInkBot.value as Float32Array;
    const inkOrigin = program.uniforms.uInkOrigin.value as Float32Array;
    let inkProgress = 0;   // > 0 while a spread is animating
    const onPointerDown = (e: PointerEvent) => {
      if (inkProgress > 0) return;                 // one spread at a time
      const rect = host.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let hit: Koi | null = null;
      let best = Infinity;
      for (const k of koi) {
        const dd = Math.hypot(k.x - mx, k.y - my);
        if (dd < k.len * 0.6 && dd < best) { best = dd; hit = k; }
      }
      if (!hit) return;
      const w = KOI_KINDS[hit.kind].water;
      inkTop.set(hexToRgb(w[0]));
      inkMid.set(hexToRgb(w[1]));
      inkBot.set(hexToRgb(w[2]));
      inkOrigin[0] = mx / rect.width;
      inkOrigin[1] = 1 - my / rect.height;        // gl y-up
      inkProgress = 0.0001;
      program.uniforms.uInkProgress.value = inkProgress;
    };
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

    // reusable spine scratch buffers — sized to the koi vertex count, never
    // reallocated per frame (keeps GC quiet)
    const KOI_N = 13;
    const sx = new Array<number>(KOI_N);
    const sy = new Array<number>(KOI_N);
    const nX = new Array<number>(KOI_N);
    const nY = new Array<number>(KOI_N);

    const drawKoi = (dt: number) => {
      // fade previous frame → long motion-blur smears
      kctx.globalCompositeOperation = 'destination-out';
      kctx.fillStyle = 'rgba(0,0,0,0.14)';
      kctx.fillRect(0, 0, cssW, cssH);
      kctx.globalCompositeOperation = 'source-over';

      for (const k of koi) {
        // tail beats a little faster when swimming faster — kept slow + graceful
        k.phase += dt * (2.8 + k.speed * 0.035);

        // gentle damped random walk on top of everything → organic wiggle
        k.dirVel += (Math.random() - 0.5) * dt * 0.25;
        k.dirVel *= Math.pow(0.5, dt * 1.6);
        k.dirVel = Math.max(-0.3, Math.min(0.3, k.dirVel));
        k.dir += k.dirVel * dt;

        // head for a personal waypoint; on arrival pick a fresh one anywhere on
        // the canvas → the koi roam the whole area independently, never clump
        const wdx = k.tx - k.x, wdy = k.ty - k.y;
        if (Math.hypot(wdx, wdy) < cssW * 0.09) {
          k.tx = cssW * (0.06 + Math.random() * 0.88);
          k.ty = cssH * (0.08 + Math.random() * 0.82);
        } else {
          k.dir += angleDelta(k.dir, Math.atan2(wdy, wdx)) * Math.min(1, dt * 1.3);
        }

        // firm turn-away from the real edges
        const edge = cssW * 0.05;
        if (k.x < edge) k.dir += angleDelta(k.dir, 0) * Math.min(1, dt * 5);
        if (k.x > cssW - edge) k.dir += angleDelta(k.dir, Math.PI) * Math.min(1, dt * 5);
        if (k.y < edge) k.dir += angleDelta(k.dir, Math.PI * 0.5) * Math.min(1, dt * 5);
        if (k.y > cssH - edge) k.dir += angleDelta(k.dir, -Math.PI * 0.5) * Math.min(1, dt * 5);

        // gentle separation so two koi don't overlap
        for (const o of koi) {
          if (o === k) continue;
          const sdx = k.x - o.x, sdy = k.y - o.y;
          const sd = Math.hypot(sdx, sdy);
          const near = k.len * 1.3;
          if (sd > 1e-3 && sd < near) {
            k.dir += angleDelta(k.dir, Math.atan2(sdy, sdx)) * (1 - sd / near) * 0.5 * Math.min(1, dt * 3);
          }
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

        // ease the visible facing toward the target bearing — brisk enough that
        // a faster koi actually completes its turns
        k.angle += angleDelta(k.angle, k.dir) * Math.min(1, dt * 3.0);

        // glide-and-surge: each tail stroke drives a clear forward burst
        const surge = 0.5 + 0.75 * Math.max(0, Math.sin(k.phase));
        k.x += Math.cos(k.angle) * k.speed * surge * dt;
        k.y += Math.sin(k.angle) * k.speed * surge * dt;

        // wrap with margin — a rare fallback; edge steering normally prevents it
        const m = k.len * 0.8;
        if (k.x < -m) k.x = cssW + m;
        if (k.x > cssW + m) k.x = -m;
        if (k.y < -m) k.y = cssH + m;
        if (k.y > cssH + m) k.y = -m;

        const L = k.len;
        const N = KOI_N;
        const WAVES = 2.3;
        const kind = KOI_KINDS[k.kind];
        const core = kind.body;
        const rim = kind.rim;
        const deep = kind.deep;

        // undulating spine: a travelling wave whose amplitude ramps toward the tail
        for (let i = 0; i < N; i++) {
          const s = i / (N - 1);
          sx[i] = L * 0.5 - s * L * 0.99;
          sy[i] = L * (0.015 + 0.23 * s * s) * Math.sin(k.phase - s * WAVES);
        }
        // per-vertex normal from the local tangent
        for (let i = 0; i < N; i++) {
          const a = i > 0 ? i - 1 : 0;
          const b = i < N - 1 ? i + 1 : N - 1;
          const tx = sx[b] - sx[a];
          const ty = sy[b] - sy[a];
          const tl = Math.hypot(tx, ty) || 1;
          nX[i] = -ty / tl;
          nY[i] = tx / tl;
        }
        const halfW = (i: number) => {
          const s = i / (N - 1);
          return Math.max(L * 0.018 * (1 - s), L * 0.185 * Math.sin(Math.pow(s, 0.6) * Math.PI));
        };

        // ---- cast shadow on the pool floor — a soft, feathered silhouette that
        //      follows the same undulating spine (so the tail sways in shadow
        //      too), offset down-right and laid down in two diffuse layers ----
        {
          kctx.save();
          kctx.translate(k.x + L * 0.18, k.y + L * 0.26);
          kctx.rotate(k.angle);
          kctx.fillStyle = 'rgb(4,12,28)';
          // wide faint halo, then a slightly tighter core — no hard edge anywhere
          for (const [blurPx, alpha, grow] of [[20, 0.06, 1.35], [10, 0.11, 1.12]] as const) {
            kctx.filter = `blur(${blurPx}px)`;
            kctx.globalAlpha = alpha;
            kctx.beginPath();
            kctx.moveTo(sx[0] + nX[0] * halfW(0) * grow, sy[0] + nY[0] * halfW(0) * grow);
            for (let i = 1; i < N; i++) kctx.lineTo(sx[i] + nX[i] * halfW(i) * grow, sy[i] + nY[i] * halfW(i) * grow);
            for (let i = N - 1; i >= 0; i--) kctx.lineTo(sx[i] - nX[i] * halfW(i) * grow, sy[i] - nY[i] * halfW(i) * grow);
            kctx.closePath();
            kctx.fill();
          }
          kctx.restore();
        }

        kctx.save();
        kctx.translate(k.x, k.y);
        kctx.rotate(k.angle + Math.sin(k.phase) * 0.06); // head-wag with the beat
        kctx.globalAlpha = 0.85;
        kctx.lineJoin = 'round';

        // ---- back-lit rim: an inflated body silhouette in the warm rim colour,
        //      blurred, so the whole fish is wrapped in a glowing edge that
        //      bleeds into the water (subsurface scatter) ----
        {
          kctx.save();
          kctx.filter = 'blur(4px)';
          kctx.globalAlpha = 0.6;
          const grow = L * 0.05;
          const rw = (i: number) => halfW(i) + grow;
          kctx.beginPath();
          kctx.moveTo(sx[0] + nX[0] * rw(0), sy[0] + nY[0] * rw(0));
          for (let i = 1; i < N; i++) kctx.lineTo(sx[i] + nX[i] * rw(i), sy[i] + nY[i] * rw(i));
          for (let i = N - 1; i >= 0; i--) kctx.lineTo(sx[i] - nX[i] * rw(i), sy[i] - nY[i] * rw(i));
          kctx.closePath();
          kctx.fillStyle = `rgba(${rim},0.7)`;
          kctx.fill();
          kctx.restore();
        }

        // ---- caudal fin: broad translucent fork, swung by the tail-tip slope ----
        {
          const hx = sx[N - 1];
          const hy = sy[N - 1];
          const ang = Math.atan2(sy[N - 1] - sy[N - 4], sx[N - 1] - sx[N - 4]);
          const dx = Math.cos(ang);
          const dy = Math.sin(ang);
          const ex = -dy;
          const ey = dx;
          const fl = L * 0.48;
          const sp = L * 0.34 * (0.8 + 0.38 * Math.sin(k.phase - 1.5));
          const tx = hx + dx * fl;
          const ty = hy + dy * fl;
          const kx = hx + dx * fl * 0.46;
          const ky = hy + dy * fl * 0.46;
          kctx.beginPath();
          kctx.moveTo(hx, hy);
          kctx.quadraticCurveTo(hx + dx * fl * 0.5 + ex * sp * 0.6, hy + dy * fl * 0.5 + ey * sp * 0.6, tx + ex * sp, ty + ey * sp);
          kctx.quadraticCurveTo(kx + ex * sp * 0.25, ky + ey * sp * 0.25, kx, ky);
          kctx.quadraticCurveTo(tx - ex * sp * 0.25, ty - ey * sp * 0.25, tx - ex * sp, ty - ey * sp);
          kctx.quadraticCurveTo(hx + dx * fl * 0.5 - ex * sp * 0.6, hy + dy * fl * 0.5 - ey * sp * 0.6, hx, hy);
          kctx.closePath();
          const fg = kctx.createLinearGradient(hx, hy, tx, ty);
          fg.addColorStop(0, `rgba(${core},0.55)`);
          fg.addColorStop(0.55, `rgba(${rim},0.32)`);
          fg.addColorStop(1, `rgba(${rim},0)`);
          kctx.fillStyle = fg;
          kctx.fill();
        }

        // ---- dorsal fin: translucent sail over the mid-back ----
        {
          const a = Math.round(0.24 * (N - 1));
          const b = Math.round(0.64 * (N - 1));
          kctx.beginPath();
          kctx.moveTo(sx[a] + nX[a] * halfW(a) * 0.5, sy[a] + nY[a] * halfW(a) * 0.5);
          for (let i = a; i <= b; i++) {
            const lift = halfW(i) * 0.5 + L * 0.1 * Math.sin(((i - a) / (b - a)) * Math.PI);
            kctx.lineTo(sx[i] + nX[i] * lift, sy[i] + nY[i] * lift);
          }
          for (let i = b; i >= a; i--) {
            kctx.lineTo(sx[i] + nX[i] * halfW(i) * 0.5, sy[i] + nY[i] * halfW(i) * 0.5);
          }
          kctx.closePath();
          kctx.fillStyle = `rgba(${core},0.32)`;
          kctx.fill();
        }

        // ---- pectoral fins: broad flutter flappers behind the head ----
        {
          const gi = Math.round(0.22 * (N - 1));
          for (const side of [-1, 1] as const) {
            const flu = 0.55 + 0.45 * Math.sin(k.phase * 0.8 + (side > 0 ? 0 : Math.PI));
            const ox = nX[gi] * side;
            const oy = nY[gi] * side;
            const ax = sx[gi] + ox * halfW(gi) * 0.7;
            const ay = sy[gi] + oy * halfW(gi) * 0.7;
            const tx = ax - L * (0.14 + 0.08 * flu) + ox * L * (0.08 + 0.08 * flu);
            const ty = ay + oy * L * (0.14 + 0.08 * flu);
            kctx.beginPath();
            kctx.moveTo(ax, ay);
            kctx.quadraticCurveTo(ax + ox * L * 0.03 - L * 0.02, ay + oy * L * 0.05, tx, ty);
            kctx.quadraticCurveTo(ax - L * 0.1 + ox * L * 0.02, ay + oy * L * 0.02, ax - L * 0.04, ay);
            kctx.closePath();
            kctx.fillStyle = `rgba(${core},0.34)`;
            kctx.fill();
          }
        }

        // ---- body: filled ribbon — warm-lit at head & tail, deep core in the
        //      middle, wrapped in a warm glow-haze that bleeds into the water ----
        const bodyPath = () => {
          kctx.beginPath();
          kctx.moveTo(sx[0] + nX[0] * halfW(0), sy[0] + nY[0] * halfW(0));
          for (let i = 1; i < N; i++) kctx.lineTo(sx[i] + nX[i] * halfW(i), sy[i] + nY[i] * halfW(i));
          for (let i = N - 1; i >= 0; i--) kctx.lineTo(sx[i] - nX[i] * halfW(i), sy[i] - nY[i] * halfW(i));
          kctx.closePath();
        };
        const bg = kctx.createLinearGradient(L * 0.5, 0, -L * 0.5, 0);
        bg.addColorStop(0, `rgba(${rim},0.95)`);        // lit nose
        bg.addColorStop(0.13, `rgba(${core},1)`);
        bg.addColorStop(0.55, `rgba(${core},1)`);
        bg.addColorStop(0.8, `rgba(${rim},0.75)`);      // tail catches the light again
        bg.addColorStop(1, `rgba(${core},0)`);          // then melts into blur
        kctx.fillStyle = bg;
        kctx.shadowColor = `rgba(${rim},0.6)`;
        kctx.shadowBlur = L * 0.42;
        bodyPath();
        kctx.fill();
        kctx.shadowBlur = 0;

        // ---- volume: two soft dark patches where the flank turns away ----
        kctx.save();
        bodyPath();
        kctx.clip();
        kctx.filter = 'blur(5px)';
        kctx.fillStyle = `rgba(${deep},0.34)`;
        for (const [sp, off] of [[0.34, 0.4], [0.62, -0.2]] as const) {
          const i = Math.round(sp * (N - 1));
          kctx.beginPath();
          kctx.ellipse(sx[i], sy[i] + off * halfW(i), L * 0.16, halfW(i) * 0.9, 0, 0, Math.PI * 2);
          kctx.fill();
        }
        kctx.restore();

        // ---- roundness: bright dorsal edge + dark belly edge ----
        kctx.lineCap = 'round';
        kctx.globalAlpha = 0.5;
        kctx.strokeStyle = `rgba(255,255,255,0.45)`;
        kctx.lineWidth = Math.max(1.5, L * 0.03);
        kctx.beginPath();
        kctx.moveTo(sx[2] + nX[2] * halfW(2), sy[2] + nY[2] * halfW(2));
        for (let i = 3; i < N - 2; i++) kctx.lineTo(sx[i] + nX[i] * halfW(i), sy[i] + nY[i] * halfW(i));
        kctx.stroke();
        kctx.strokeStyle = `rgba(${deep},0.4)`;
        kctx.lineWidth = Math.max(1.2, L * 0.024);
        kctx.beginPath();
        kctx.moveTo(sx[2] - nX[2] * halfW(2), sy[2] - nY[2] * halfW(2));
        for (let i = 3; i < N - 2; i++) kctx.lineTo(sx[i] - nX[i] * halfW(i), sy[i] - nY[i] * halfW(i));
        kctx.stroke();

        // ---- head: a small warm-white catchlight right at the nose ----
        kctx.globalAlpha = 0.6;
        kctx.fillStyle = 'rgba(255,246,232,0.5)';
        kctx.beginPath();
        kctx.ellipse(sx[1] + L * 0.02, sy[1], L * 0.09, L * 0.06, 0, 0, Math.PI * 2);
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

      // advance an in-flight ink spread; bake the palette once it covers the frame
      if (inkProgress > 0) {
        inkProgress += dt * 0.9;
        if (inkProgress >= 2.2) {
          liveTop.set(inkTop); liveMid.set(inkMid); liveBot.set(inkBot);
          inkProgress = 0;
        }
        program.uniforms.uInkProgress.value = inkProgress;
      }

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
