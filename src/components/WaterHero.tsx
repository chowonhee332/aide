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
const MAX_KOI = 2;      // koi count — also the wake-emitter count fed to the shader

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
  { body: '230,58,36', rim: '255,150,60', deep: '120,20,8', water: ['#8a2410', '#e0431f', '#ff9a6b'] }, // vermilion — the video's redder fish
  { body: '234,120,40', rim: '255,196,96', deep: '150,72,12', water: ['#7a4708', '#e0982a', '#ffe0a0'] }, // amber — the video's more orange fish
];
const KOI_HOT = '255,206,104'; // shared hot yellow-orange leading edge / head glow

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
uniform vec4  uKoi[${MAX_KOI}]; // xy = head (uv, y-up) · zw = heading * stroke speed (0..1)

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

  // ---- koi wake: a swimming fish parts the water — a bright bow crest at the
  //      head and a trailing V of feathered, shimmering caustic light behind it.
  //      Same rule as the rings: it IS the water's own light, never a drawn line ----
  vec2  wakeWarp  = vec2(0.0);
  float wakeField = 0.0;
  for (int k = 0; k < ${MAX_KOI}; k++){
    float spd = length(uKoi[k].zw);
    if (spd < 1e-3) continue;
    vec2 kp  = vec2(uKoi[k].x * aspect, uKoi[k].y);
    vec2 fwd = normalize(vec2(uKoi[k].z * aspect, uKoi[k].w));
    vec2 rel = auv - kp;
    float along  = dot(rel, fwd);
    float across = dot(rel, vec2(-fwd.y, fwd.x));
    float behind = max(0.0, -along);

    // bow crest — a tight bright arc hugging the front of the head
    float bx  = (along - 0.02) / 0.032;
    float by  = across / 0.055;
    wakeField += exp(-bx * bx) * exp(-by * by) * spd * 1.1;

    // trailing V — two feathered arms opening out behind at a fixed half-angle,
    // carrying transverse wavelets that travel outward along the arm
    float ax    = (abs(across) - behind * 0.42) / (0.012 + behind * 0.06);
    float arm   = exp(-ax * ax);
    float fade  = exp(-behind * 3.0) * spd;
    float lines = sin((behind * 58.0 + length(rel) * 36.0) - t * 6.0);
    wakeField += arm * fade * (0.6 + 0.4 * lines) * 0.9;
    wakeWarp  += normalize(rel + vec2(1e-4)) * arm * fade * lines * 0.006;
  }

  // ---- caustic web, warped by the swirl and lensed through the ripple rings + wake ----
  vec2 cuv = auv * 1.35 + swirl + (rippleWarp + wakeWarp) * 2.2 + vec2(t * 0.011, t * 0.019);
  float web = causticWeb(cuv, t);
  web += causticWeb(cuv * 1.9 + 11.0, t * 1.35) * 0.5;
  web *= uCaustic;
  // crests concentrate that caustic light into rings, troughs dim it → the
  // ripple shows in the water's own texture and colour, not as a separate line
  web *= 1.0 + ringField * 0.85 + min(wakeField, 2.0) * 0.7;
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
  col += causticTint * clamp(wakeField, 0.0, 1.0) * 0.09;

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
  x: number; y: number;        // head position, css px
  heading: number;             // travel bearing, rad
  turn: number;                // live angular velocity, rad/s
  turnGoal: number;            // committed bank target — held for turnHold seconds
  turnHold: number;            // seconds left on the current bank
  speed: number;               // live px/s (eased toward target)
  cruise: number; burst: number; // this koi's slow / rocket speeds
  throttle: number; throttleGoal: number; // 0..1 → speed target between cruise and burst
  burstIn: number; burstDur: number;      // seconds until next burst / left in this one
  phase: number;               // tail-beat phase
  len: number;                 // rest body length
  hist: Float64Array;          // ring buffer of past head positions [x,y,x,y,…]
  histHead: number; histN: number;        // newest-sample slot · samples written
  kind: number;                // index into KOI_KINDS — body colour + ink palette
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
    // plain Array for the same reason — repacked every frame with each koi's head
    // position (uv, y-up) and heading scaled by its live stroke speed
    const koiBuf: number[] = new Array(MAX_KOI * 4).fill(0);
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
        uKoi: { value: koiBuf },
      },
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    // ---------- 2D koi overlay ----------
    const koiCanvas = document.createElement('canvas');
    koiCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;filter:blur(3.4px);';
    host.appendChild(koiCanvas);
    const kctx = koiCanvas.getContext('2d')!;

    // ---------- koi model ----------
    // Each koi is rendered as a ribbon laid along its own recent head-position
    // history: on a fast burst the samples spread out → a long stretched streak;
    // at cruise they bunch → a compact crescent. This is what gives the video's
    // "segmented red comet when fast, clean fish when slow" without any extra
    // trail buffer or per-fin geometry.
    const HIST = 40;            // head-position ring depth (~0.7 s at 60 fps)
    const RIB_N = 16;           // ribbon sample points, head → tail
    const rx = new Float64Array(RIB_N);   // resampled spine (world px)
    const ry = new Float64Array(RIB_N);
    const rnx = new Float64Array(RIB_N);  // per-point unit normal
    const rny = new Float64Array(RIB_N);
    const wx = new Float64Array(RIB_N);   // spine + body undulation
    const wy = new Float64Array(RIB_N);
    const smooth = (v: number) => v * v * (3 - 2 * v);

    // lay the history straight back from the head so the body is full-length at
    // spawn and never streaks across a wrap-around teleport
    const fillHist = (k: Koi) => {
      const bx = Math.cos(k.heading), by = Math.sin(k.heading);
      const stp = k.len / HIST;
      k.histHead = 0; k.histN = HIST;
      for (let j = 0; j < HIST; j++) {
        const slot = (HIST - j) % HIST;
        k.hist[slot * 2] = k.x - bx * stp * j;
        k.hist[slot * 2 + 1] = k.y - by * stp * j;
      }
    };

    let cssW = 1, cssH = 1;
    const koi: Koi[] = [];
    const seedKoi = () => {
      koi.length = 0;
      const n = reduceMotion ? 0 : MAX_KOI;
      for (let i = 0; i < n; i++) {
        const k: Koi = {
          x: cssW * (0.22 + Math.random() * 0.56),
          y: cssH * (0.24 + Math.random() * 0.52),
          heading: Math.random() * Math.PI * 2,
          turn: 0,
          turnGoal: (Math.random() - 0.5) * 1.2,
          turnHold: 1 + Math.random() * 2,
          speed: 90,
          cruise: 66 + Math.random() * 30,
          burst: 430 + Math.random() * 190,
          throttle: 0,
          throttleGoal: 0,
          burstIn: 1.2 + Math.random() * 3.5,
          burstDur: 0,
          phase: Math.random() * Math.PI * 2,
          len: 122 + Math.random() * 48,
          hist: new Float64Array(HIST * 2),
          histHead: 0,
          histN: HIST,
          kind: i % KOI_KINDS.length,
        };
        fillHist(k);
        koi.push(k);
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
        if (dd < k.len && dd < best) { best = dd; hit = k; }
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

    const drawKoi = (dt: number) => {
      kctx.clearRect(0, 0, cssW, cssH);
      kctx.lineJoin = 'round';

      for (const k of koi) {
        // ---- throttle: rare hard bursts — snappy attack, lazy glide-down ----
        k.burstIn -= dt;
        if (k.burstIn <= 0) {
          k.throttleGoal = 1;
          k.burstDur = 0.42 + Math.random() * 0.7;
          k.burstIn = 2.4 + Math.random() * 4.6;
        }
        if (k.burstDur > 0) { k.burstDur -= dt; if (k.burstDur <= 0) k.throttleGoal = 0; }
        k.throttle += (k.throttleGoal - k.throttle) * Math.min(1, dt * (k.throttleGoal > k.throttle ? 7 : 1.6));
        const thr = smooth(k.throttle);
        const tgtSpeed = k.cruise + (k.burst - k.cruise) * thr;
        k.speed += (tgtSpeed - k.speed) * Math.min(1, dt * 4);

        // ---- steering: commit to a bank for a stretch; sharper turns at cruise,
        //      near-straight while rocketing (matches the video's arcs) ----
        k.turnHold -= dt;
        if (k.turnHold <= 0) {
          k.turnHold = 0.7 + Math.random() * 2.4;
          k.turnGoal = (Math.random() - 0.5) * 2.6 * (0.32 + 0.68 * (1 - k.throttle));
        }
        k.turn += (k.turnGoal - k.turn) * Math.min(1, dt * 3);
        k.heading += k.turn * dt;

        // weak pull back once it has strayed well past the frame
        const cx = cssW * 0.5, cy = cssH * 0.5;
        const stray = Math.max(
          (Math.abs(k.x - cx) - cssW * 0.42) / (cssW * 0.2),
          (Math.abs(k.y - cy) - cssH * 0.42) / (cssH * 0.2),
        );
        if (stray > 0) {
          k.heading += angleDelta(k.heading, Math.atan2(cy - k.y, cx - k.x)) * Math.min(1, stray) * Math.min(1, dt * 1.2);
        }

        // keep the two fish off each other
        for (const o of koi) {
          if (o === k) continue;
          const dx = k.x - o.x, dy = k.y - o.y;
          const d = Math.hypot(dx, dy);
          const near = (k.len + o.len) * 0.55;
          if (d > 1e-3 && d < near) {
            k.heading += angleDelta(k.heading, Math.atan2(dy, dx)) * (1 - d / near) * 0.4 * Math.min(1, dt * 3);
          }
        }

        // barely-there veer around a passing cursor
        if (pointer.active && now() - pointer.lastMove < 0.9) {
          const dx = k.x - pointer.x * cssW, dy = k.y - (1 - pointer.y) * cssH;
          const d = Math.hypot(dx, dy);
          const reach = cssW * 0.14;
          if (d < reach) k.heading += angleDelta(k.heading, Math.atan2(dy, dx)) * (1 - d / reach) * 0.5 * Math.min(1, dt * 3);
        }

        // ---- advance + record the head trail ----
        k.phase += dt * (5 + k.speed * 0.03);
        k.x += Math.cos(k.heading) * k.speed * dt;
        k.y += Math.sin(k.heading) * k.speed * dt;

        const m = k.len * 3;
        let wrapped = false;
        if (k.x < -m) { k.x = cssW + m; wrapped = true; }
        else if (k.x > cssW + m) { k.x = -m; wrapped = true; }
        if (k.y < -m) { k.y = cssH + m; wrapped = true; }
        else if (k.y > cssH + m) { k.y = -m; wrapped = true; }
        if (wrapped) {
          fillHist(k);
        } else {
          k.histHead = (k.histHead + 1) % HIST;
          k.hist[k.histHead * 2] = k.x;
          k.hist[k.histHead * 2 + 1] = k.y;
          if (k.histN < HIST) k.histN++;
        }

        // ---- resample the recent trail into an even ribbon spine, head → tail.
        //      Trail length tracks throttle: a compact crescent at cruise, a long
        //      stretched streak on a burst — the video's core motion cue ----
        const trailLen = k.len * (0.5 + 2.7 * thr);
        const step = trailLen / (RIB_N - 1);
        rx[0] = k.hist[k.histHead * 2];
        ry[0] = k.hist[k.histHead * 2 + 1];
        let curX = rx[0], curY = ry[0];
        let acc = 0, out = 1, j = 1;
        while (out < RIB_N && j < k.histN) {
          const idx = (k.histHead - j + HIST * 2) % HIST;
          const nx = k.hist[idx * 2], ny = k.hist[idx * 2 + 1];
          let dx = nx - curX, dy = ny - curY;
          let d = Math.hypot(dx, dy);
          if (d < 1e-6) { j++; continue; }
          while (d >= step - acc && out < RIB_N) {
            const t = (step - acc) / d;
            curX += dx * t; curY += dy * t;
            rx[out] = curX; ry[out] = curY; out++;
            dx = nx - curX; dy = ny - curY; d = Math.hypot(dx, dy);
            acc = 0;
          }
          acc += d; curX = nx; curY = ny; j++;
        }
        while (out < RIB_N) {
          const bx = out >= 2 ? rx[out - 1] - rx[out - 2] : -Math.cos(k.heading);
          const by = out >= 2 ? ry[out - 1] - ry[out - 2] : -Math.sin(k.heading);
          const bl = Math.hypot(bx, by) || 1;
          rx[out] = rx[out - 1] + (bx / bl) * step;
          ry[out] = ry[out - 1] + (by / bl) * step;
          out++;
        }

        // per-point normal from the local tangent
        for (let i = 0; i < RIB_N; i++) {
          const a = i > 0 ? i - 1 : 0;
          const b = i < RIB_N - 1 ? i + 1 : RIB_N - 1;
          const tx = rx[b] - rx[a], ty = ry[b] - ry[a];
          const tl = Math.hypot(tx, ty) || 1;
          rnx[i] = -ty / tl; rny[i] = tx / tl;
        }

        // body undulation — travelling wave, deeper toward the tail and when the
        // fish is working hard
        const WAVES = 2.6;
        const ampK = k.len * (0.35 + 0.75 * thr);
        for (let i = 0; i < RIB_N; i++) {
          const s = i / (RIB_N - 1);
          const w = (0.02 + 0.12 * s) * ampK * Math.sin(k.phase - s * WAVES);
          wx[i] = rx[i] + rnx[i] * w;
          wy[i] = ry[i] + rny[i] * w;
        }

        const kind = KOI_KINDS[k.kind];
        const core = kind.body;
        const edge = kind.rim;
        const L = k.len;
        const half = (s: number) => L * (0.145 * Math.sin(Math.pow(s, 0.6) * Math.PI) + 0.012 * (1 - s));
        const ribbon = (grow: number, ox: number, oy: number) => {
          kctx.beginPath();
          kctx.moveTo(wx[0] + rnx[0] * half(0) * grow + ox, wy[0] + rny[0] * half(0) * grow + oy);
          for (let i = 1; i < RIB_N; i++) {
            const s = i / (RIB_N - 1);
            kctx.lineTo(wx[i] + rnx[i] * half(s) * grow + ox, wy[i] + rny[i] * half(s) * grow + oy);
          }
          for (let i = RIB_N - 1; i >= 0; i--) {
            const s = i / (RIB_N - 1);
            kctx.lineTo(wx[i] - rnx[i] * half(s) * grow + ox, wy[i] - rny[i] * half(s) * grow + oy);
          }
          kctx.closePath();
        };

        // ---- cast shadow on the pool floor: the same undulating ribbon, larger,
        //      murkier, offset toward the floor, in two feathered layers ----
        kctx.fillStyle = 'rgb(10,26,24)';
        for (const [blurPx, a, grow] of [[24, 0.05, 1.7], [12, 0.09, 1.35]] as const) {
          kctx.filter = `blur(${blurPx}px)`;
          kctx.globalAlpha = a;
          ribbon(grow, L * 0.12, L * 0.24);
          kctx.fill();
        }
        kctx.filter = 'none';

        // ---- body: hot yellow nose → vermilion core → tail dissolving to water ----
        kctx.globalAlpha = 0.92;
        const bg = kctx.createLinearGradient(wx[0], wy[0], wx[RIB_N - 1], wy[RIB_N - 1]);
        bg.addColorStop(0, `rgba(${KOI_HOT},0.95)`);
        bg.addColorStop(0.12, `rgba(${core},1)`);
        bg.addColorStop(0.5, `rgba(${core},0.98)`);
        bg.addColorStop(0.8, `rgba(${core},0.55)`);
        bg.addColorStop(1, `rgba(${edge},0)`);
        kctx.fillStyle = bg;
        ribbon(1, 0, 0);
        kctx.fill();

        // on a hard burst, carve the streak into beads at the wave troughs —
        // the video's segmented red comet
        if (thr > 0.4) {
          kctx.globalCompositeOperation = 'destination-out';
          for (let i = 2; i < RIB_N - 2; i++) {
            const s = i / (RIB_N - 1);
            const g = Math.sin(k.phase - s * WAVES);
            if (g < -0.2) {
              kctx.globalAlpha = (thr - 0.4) * 1.3 * -g;
              kctx.beginPath();
              kctx.ellipse(wx[i], wy[i], half(s) * 0.55, half(s) * 1.5, Math.atan2(rny[i], rnx[i]), 0, Math.PI * 2);
              kctx.fill();
            }
          }
          kctx.globalCompositeOperation = 'source-over';
        }

        // hot head glow bleeding into the water
        kctx.globalAlpha = 1;
        const hg = kctx.createRadialGradient(wx[0], wy[0], 0, wx[0], wy[0], L * 0.15);
        hg.addColorStop(0, `rgba(${KOI_HOT},0.5)`);
        hg.addColorStop(1, `rgba(${KOI_HOT},0)`);
        kctx.fillStyle = hg;
        kctx.beginPath();
        kctx.arc(wx[0], wy[0], L * 0.15, 0, Math.PI * 2);
        kctx.fill();
      }
      kctx.filter = 'none';
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

      // pack koi wake sources — head position (uv, y-up) + heading scaled by the
      // live speed, so the wake spikes on each burst and fades on the glide
      for (let i = 0; i < MAX_KOI; i++) {
        const k = koi[i];
        const o = i * 4;
        if (!k) { koiBuf[o] = koiBuf[o + 1] = koiBuf[o + 2] = koiBuf[o + 3] = 0; continue; }
        const sf = Math.min(1, k.speed / 380);
        koiBuf[o] = (k.x + Math.cos(k.heading) * k.len * 0.5) / cssW;
        koiBuf[o + 1] = 1 - (k.y + Math.sin(k.heading) * k.len * 0.5) / cssH;
        koiBuf[o + 2] = Math.cos(k.heading) * sf;
        koiBuf[o + 3] = -Math.sin(k.heading) * sf;
      }

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
