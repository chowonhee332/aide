'use client';

import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

/**
 * WaterHero — animated caustic-water hero background (Unicorn Studio look).
 * WebGL2 fragment shader: near-uniform azure + moving caustics + expanding
 * ripple rings — a drifting ambient source plus a cursor wake (a moving pointer
 * lays rings, a click drops a bigger one). Koi overlay is dormant (MAX_KOI 0).
 *
 * Replaces <Grainient> on the landing hero. Self-contained and reversible.
 */

const MAX_RIPPLES = 24; // ripple pool — ambient drift source + the cursor wake
const MAX_KOI = 0;      // koi count — 0 = plain caustic water (Unicorn Studio look)

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return [1, 1, 1];
  return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
};

// Each koi is a plausible real koi colour.
// body = core fill · rim = the glowing warm edge (subsurface scatter / fins)
interface KoiKind { body: string; rim: string; }
const KOI_KINDS: KoiKind[] = [
  { body: '230,58,36', rim: '255,150,60' }, // vermilion — the video's redder fish
  { body: '234,120,40', rim: '255,196,96' }, // amber — the video's more orange fish
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
  float waveGlint  = 0.0;         // crisp specular skip riding the advancing front
  for (int k = 0; k < ${MAX_RIPPLES}; k++){
    if (float(k) >= uRippleCount) break;
    vec4 r = uRipples[k];
    float age = t - r.z;
    if (age < 0.0) continue;
    float vr  = fract(sin(r.z * 78.233 + r.x * 41.71 + r.y * 12.13) * 43758.5453);
    float vr2 = fract(vr * 197.31 + 0.5);
    float maxAge = 8.0 + vr2 * 6.0;
    if (age > maxAge) continue;
    vec2 cc = vec2(r.x * aspect, r.y);
    vec2 to = auv - cc;
    float d = length(to);
    vec2  dir = d > 1e-4 ? to / d : vec2(0.0);

    // A new impact has a narrow, high-contrast front. As its energy disperses,
    // the front broadens first and then loses contrast into the caustic field
    // instead of staying as a uniformly soft graphic ring.
    float ageN = age / maxAge;
    float dissolve = 1.0 - smoothstep(0.36, 0.92, ageN);
    float life = exp(-age * 0.16) * dissolve;
    // broad, soft band — a lens bulge that follows the cursor, not a thin
    // raindrop line (Unicorn "Water Ripple" — high strength, low viscosity)
    float frontSharpness = mix(90.0, 14.0, smoothstep(0.0, 0.78, ageN));

    // expands fast at first, then slows (√t), like a real spreading ring
    float front = sqrt(age) * (0.24 + vr * 0.10);

    // a bright leading wavefront + a decaying train of rings trailing inside it
    float wdf = d - front;                                   // <0 inside the front
    float win = exp(-wdf * wdf * frontSharpness)              // crisp impact front → soft water trace
              + 0.55 * exp(wdf * 5.5) * step(wdf, 0.0);      // rings trailing inward
    float annulus = min(win, 1.3) * life * r.w;

    // fewer, wider rings so each reads as a rolling swell, not fine ripples
    float wl = 22.0 + vr * 14.0;
    float wave = sin(d * wl - age * (5.5 + vr2 * 3.0));

    ringField  += wave * annulus;
    rippleWarp += dir * wave * annulus * (2.6 / wl);
    centrePlop += exp(-d * d * 900.0) * exp(-age * 5.0) * r.w;
    waveGlint  += exp(-wdf * wdf * (frontSharpness * 2.2)) * life * r.w; // sharp glint dissolves with the front
  }

  // ---- caustic web, warped by the swirl and lensed through the ripple rings ----
  vec2 cuv = auv * 1.35 + swirl + rippleWarp * 4.2 + vec2(t * 0.011, t * 0.019);
  float web = causticWeb(cuv, t);
  web += causticWeb(cuv * 1.9 + 11.0, t * 1.35) * 0.5;
  web *= uCaustic;
  // crests concentrate that caustic light into rings, troughs dim it → the
  // ripple shows in the water's own texture and colour, not as a separate line
  web *= 1.0 + ringField * 1.9;
  web = max(web, 0.0);

  // ---- base colour: deep mass (top) → luminous glow (bottom) ----
  // premium soft-focus gradient: the deep tone holds through most of the frame,
  // the bright tone reads as a glow only near the lower edge
  // Diagonal composition: light mass anchored upper-left, deepening toward
  // the lower-right — matches a bright-top-left / colour-bottom-right hero.
  float diag = clamp((1.0 - uv.x) * 0.55 + uv.y * 0.55
                 + rippleWarp.y * 0.30
                 + (fbm(auv * 1.3 + swirl * 2.0 + t * 0.03) - 0.5) * 0.06, 0.0, 1.0);
  float gg = pow(diag, 0.58);
  vec3 base = mix(uColorBot, uColorTop, gg);
  base = mix(base, uColorMid, (1.0 - abs(gg - 0.5) * 2.0) * 0.34);

  // a wedge of light rising from the lower-left, echoing the reference's
  // bright beam cutting up into the colour mass
  vec2 wedgeOrigin = vec2(-0.05, -0.05);
  vec2 toWedge = auv - wedgeOrigin;
  float wedgeAngle = atan(toWedge.y, toWedge.x);
  float wedgeMask = smoothstep(0.55, 0.20, abs(wedgeAngle - 1.05)) * smoothstep(1.3, 0.15, length(toWedge));
  base = mix(base, uColorTop, wedgeMask * 0.38);

  // one big soft light bloom drifting low, like an abstract gradient wallpaper
  vec2 bc = vec2(0.14 + 0.06 * sin(t * 0.05), 0.86 + 0.04 * sin(t * 0.037 + 2.0));
  float bloom = exp(-pow(length((uv - bc + rippleWarp * 0.5) * vec2(1.0, 1.35)), 1.6) * 3.2);
  base = mix(base, uColorTop, bloom * 0.22);

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
  col += causticTint * max(ringField, 0.0) * 0.52;      // bright ring crests, on their own
  col -= causticTint * max(-ringField, 0.0) * 0.18;     // troughs read as thin dark gaps
  col += causticTint * centrePlop * 0.7;
  col += vec3(0.86, 0.95, 1.0) * waveGlint * 0.22;      // cool specular skip on the wavefront

  // ---- vignette: gentle cobalt corners, luminous lower centre ----
  vec2 vd = uv - vec2(0.5, 0.28);
  float vig = clamp(1.0 - dot(vd, vd) * 0.85, 0.0, 1.0);
  col *= mix(0.86, 1.0, vig);
  col *= 1.0 - smoothstep(0.78, 1.0, uv.y) * 0.07;    // slight deepen at the top for nav

  // clean and photographic — not neon, not murky
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, 1.12);
  col = pow(clamp(col * 1.03, 0.0, 1.0), vec3(1.0));

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
  kind: number;                // index into KOI_KINDS — body colour
}

interface WaterHeroProps {
  colorTop?: string;
  colorMid?: string;
  colorBot?: string;
  caustic?: number;
  className?: string;
}

const WaterHero = ({
  // Arcade 참조 톤: 좌상단 거의 흰색 → 중간 시안 → 우하단 진한 로열블루.
  colorTop = '#f5f7f9',
  colorMid = '#2fb8ea',
  colorBot = '#0d52d7',
  caustic = 1.0,
  className = '',
}: WaterHeroProps) => {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // both layers are drawn soft-focus (CSS blur + 1.06x scale), so 1 device
    // pixel per CSS pixel is already past what survives the blur — anything more
    // just burns framebuffer memory and fragment-shader fill rate
    const dpr = 1;
    const koiDpr = 1;
    const t0 = performance.now();
    const now = () => (performance.now() - t0) * 0.001;

    // ---------- WebGL water ----------
    const renderer = new Renderer({ webgl: 2, alpha: false, antialias: false, dpr });
    const gl = renderer.gl;
    const glCanvas = gl.canvas;
    // moderate defocus — the reference is a shallow-DoF pool shot that still
    // keeps mid-frequency ripple/caustic detail readable
    glCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;filter:blur(2.2px);transform:scale(1.05);';
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
    koiCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;filter:blur(4.5px);';
    host.appendChild(koiCanvas);
    const kctx = koiCanvas.getContext('2d')!;

    // ---------- koi model ----------
    // Each koi is a long, fixed-length body rendered as a ribbon laid along its
    // own recent head-position history — so the body bends and whips through
    // turns like a real fish following its path. Speed changes the tail-beat and
    // the motion-blur smear, NOT the body length (it's a long koi either way).
    const HIST = 44;            // head-position ring depth (~0.7 s at 60 fps)
    const RIB_N = 18;           // ribbon sample points, head → tail
    const rx = new Float64Array(RIB_N);   // resampled spine (world px)
    const ry = new Float64Array(RIB_N);
    const rnx = new Float64Array(RIB_N);  // per-point unit normal
    const rny = new Float64Array(RIB_N);
    const wx = new Float64Array(RIB_N);   // spine + body undulation
    const wy = new Float64Array(RIB_N);
    const smooth = (v: number) => v * v * (3 - 2 * v);
    const sstep = (e0: number, e1: number, x: number) => {
      const u = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
      return u * u * (3 - 2 * u);
    };

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
          len: 205 + Math.random() * 72,
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

    // ---------- pointer ---------- cursor-driven water ripple (Unicorn Studio's
    // "Water Ripple" effect): a moving cursor lays a wake of expanding rings, a
    // click drops a bigger one. Distance-gated so ring density is speed-
    // independent (Unicorn "Momentum 0").
    const pointer = { x: 0.5, y: 0.5, active: false, lastMove: -10 };
    let wakeX = 0.5, wakeY = 0.5, wakeT = -10;
    const pointerNorm = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      return [
        (e.clientX - rect.left) / rect.width,
        1 - (e.clientY - rect.top) / rect.height, // gl y-up
      ] as const;
    };
    const onPointerMove = (e: PointerEvent) => {
      const [px, py] = pointerNorm(e);
      pointer.x = px; pointer.y = py; pointer.active = true;
      const t = now();
      pointer.lastMove = t;
      const moved = Math.hypot(px - wakeX, py - wakeY);
      if (moved > 0.028 && t - wakeT > 0.035) {
        addRipple(px, py, 0.72 + Math.min(moved * 4.5, 0.5));
        wakeX = px; wakeY = py; wakeT = t;
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const [px, py] = pointerNorm(e);
      addRipple(px, py, 1.35);
      wakeX = px; wakeY = py; wakeT = now();
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });

    // Ripples now come only from the cursor — no ambient/auto source.

    // ---------- loop ----------
    let raf = 0;
    let prev = 0;
    let onScreen = true;
    let pageVisible = !document.hidden;

    const drawKoi = (dt: number) => {
      // light frame-persistence → a fast fish smears into a motion-blur streak,
      // a slow one stays crisp (it barely moves between frames)
      kctx.globalCompositeOperation = 'destination-out';
      kctx.fillStyle = 'rgba(0,0,0,0.32)';
      kctx.fillRect(0, 0, cssW, cssH);
      kctx.globalCompositeOperation = 'source-over';
      kctx.lineJoin = 'round';

      for (const k of koi) {
        // ---- throttle: rare hard bursts — snappy attack, lazy glide-down ----
        k.burstIn -= dt;
        if (k.burstIn <= 0) {
          k.throttleGoal = 1;
          k.burstDur = 0.4 + Math.random() * 0.55;
          k.burstIn = 3.2 + Math.random() * 5.0;
        }
        if (k.burstDur > 0) { k.burstDur -= dt; if (k.burstDur <= 0) k.throttleGoal = 0; }
        k.throttle += (k.throttleGoal - k.throttle) * Math.min(1, dt * (k.throttleGoal > k.throttle ? 7 : 2.4));
        const thr = smooth(k.throttle);
        const tgtSpeed = k.cruise + (k.burst - k.cruise) * thr;
        k.speed += (tgtSpeed - k.speed) * Math.min(1, dt * 4);

        // ---- steering: commit to a bank for a long stretch so the body curls
        //      into a real C through the turn; near-straight while rocketing ----
        k.turnHold -= dt;
        if (k.turnHold <= 0) {
          k.turnHold = 1.1 + Math.random() * 3.4;
          k.turnGoal = (Math.random() - 0.5) * 3.1 * (0.28 + 0.72 * (1 - k.throttle));
        }
        k.turn += (k.turnGoal - k.turn) * Math.min(1, dt * 2.4);
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
          const near = (k.len + o.len) * 0.4;
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

        const m = k.len * 1.4;
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
        //      Fixed long body; a hint longer on a hard burst as it stretches
        //      into the stroke, never a comet ----
        const trailLen = k.len * (0.92 + 0.22 * thr);
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

        // body undulation — the prior slow-state displacement was smaller than
        // the canvas blur, so a cruising koi read as a rigid, dead sprite.
        // Keep the burst silhouette, but give the resting tail a readable,
        // lower-frequency breathing sway.
        const WAVES = 2.9;
        const idle = 1 - thr;
        const idleSway = idle * 0.22 * Math.sin(k.phase * 0.37 + k.kind * 1.9);
        const ampK = k.len * (0.31 + 0.27 * thr);
        for (let i = 0; i < RIB_N; i++) {
          const s = i / (RIB_N - 1);
          const w = (0.03 + 0.1 * s) * ampK * Math.sin(k.phase - s * WAVES + idleSway);
          wx[i] = rx[i] + rnx[i] * w;
          wy[i] = ry[i] + rny[i] * w;
        }

        const kind = KOI_KINDS[k.kind];
        const core = kind.body;
        const edge = kind.rim;
        const L = k.len;
        // blunt rounded head, widest ~1/4 back, long even taper to a small tail
        // stub where the fin takes over — a fish silhouette, not a diamond
        const half = (s: number) => L * 0.132 * (0.42 + 0.58 * sstep(0, 0.26, s)) * (1 - 0.9 * sstep(0.26, 1, s));
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

        // ---- cast shadow on the pool floor: the same undulating ribbon, offset
        //      toward the floor, built from a few nested low-alpha layers that
        //      feather out — no per-path canvas blur filter (it reallocates an
        //      offscreen surface every frame); the canvas-wide CSS blur softens
        //      the layer edges for free ----
        kctx.fillStyle = 'rgb(10,26,24)';
        for (const [grow, a] of [[2.5, 0.04], [1.75, 0.055], [1.2, 0.07]] as const) {
          kctx.globalAlpha = a;
          ribbon(grow, L * 0.13, L * 0.26);
          kctx.fill();
        }

        // tail-tip frame (points tail-ward) for the caudal fin
        const tipX = wx[RIB_N - 1], tipY = wy[RIB_N - 1];
        const tdx = wx[RIB_N - 1] - wx[RIB_N - 3], tdy = wy[RIB_N - 1] - wy[RIB_N - 3];
        const tdl = Math.hypot(tdx, tdy) || 1;
        const fX = tdx / tdl, fY = tdy / tdl;
        const sX = -fY, sY = fX;
        const beat = Math.sin(k.phase - WAVES + idleSway);

        // ---- caudal fin: translucent forked fan, swept by the tail stroke ----
        {
          const finL = L * (0.32 + 0.06 * thr);
          const spr = L * 0.145 * (0.85 + 0.3 * beat);
          const tailSweep = L * (0.08 * idle + 0.05 * thr) * beat;
          const bX = sX * tailSweep, bY = sY * tailSweep;
          const g = kctx.createLinearGradient(tipX, tipY, tipX + fX * finL, tipY + fY * finL);
          g.addColorStop(0, `rgba(${core},0.5)`);
          g.addColorStop(0.5, `rgba(${edge},0.2)`);
          g.addColorStop(1, `rgba(${edge},0)`);
          kctx.fillStyle = g;
          kctx.globalAlpha = 0.9;
          kctx.beginPath();
          kctx.moveTo(tipX, tipY);
          kctx.quadraticCurveTo(
            tipX + fX * finL * 0.5 + sX * spr * 0.7 + bX, tipY + fY * finL * 0.5 + sY * spr * 0.7 + bY,
            tipX + fX * finL + sX * spr + bX, tipY + fY * finL + sY * spr + bY);
          kctx.quadraticCurveTo(
            tipX + fX * finL * 0.55 + bX, tipY + fY * finL * 0.55 + bY,
            tipX + fX * finL - sX * spr + bX, tipY + fY * finL - sY * spr + bY);
          kctx.quadraticCurveTo(
            tipX + fX * finL * 0.5 - sX * spr * 0.7 + bX, tipY + fY * finL * 0.5 - sY * spr * 0.7 + bY,
            tipX, tipY);
          kctx.closePath();
          kctx.fill();
        }

        // ---- pectoral fins: small translucent flappers just behind the head ----
        {
          const pi = Math.round(0.22 * (RIB_N - 1));
          const pfx = rx[pi + 1] - rx[pi - 1], pfy = ry[pi + 1] - ry[pi - 1];
          const pfl = Math.hypot(pfx, pfy) || 1;
          const bx = pfx / pfl, by = pfy / pfl; // tail-ward
          for (const sgn of [-1, 1] as const) {
            const nx = -by * sgn, ny = bx * sgn;
            const flu = 0.6 + 0.4 * Math.sin(k.phase * 0.7 + (sgn > 0 ? 0 : Math.PI));
            const rx0 = wx[pi] + nx * half(0.22) * 0.6, ry0 = wy[pi] + ny * half(0.22) * 0.6;
            const fl = L * (0.12 + 0.06 * flu + 0.035 * idle);
            const tx = rx0 + bx * fl * 0.5 + nx * fl * 0.75;
            const ty = ry0 + by * fl * 0.5 + ny * fl * 0.75;
            kctx.fillStyle = `rgba(${core},0.3)`;
            kctx.globalAlpha = 0.85;
            kctx.beginPath();
            kctx.moveTo(rx0 + bx * L * 0.02, ry0 + by * L * 0.02);
            kctx.quadraticCurveTo(rx0 + nx * fl * 0.45, ry0 + ny * fl * 0.45, tx, ty);
            kctx.quadraticCurveTo(rx0 + bx * fl * 0.9 + nx * fl * 0.15, ry0 + by * fl * 0.9 + ny * fl * 0.15, rx0 + bx * fl * 0.55, ry0 + by * fl * 0.55);
            kctx.closePath();
            kctx.fill();
          }
        }

        // ---- body: small warm tip → vermilion core → tail dissolving to water ----
        kctx.globalAlpha = 0.92;
        const bg = kctx.createLinearGradient(wx[0], wy[0], wx[RIB_N - 1], wy[RIB_N - 1]);
        bg.addColorStop(0, `rgba(255,140,74,0.8)`);
        bg.addColorStop(0.06, `rgba(${core},1)`);
        bg.addColorStop(0.55, `rgba(${core},1)`);
        bg.addColorStop(0.85, `rgba(${core},0.68)`);
        bg.addColorStop(1, `rgba(${edge},0.1)`);
        kctx.fillStyle = bg;
        ribbon(1, 0, 0);
        kctx.fill();

        // ---- belly: a soft gold rim along the ventral edge ----
        kctx.globalAlpha = 0.5;
        kctx.strokeStyle = `rgba(${KOI_HOT},0.42)`;
        kctx.lineWidth = Math.max(1.5, L * 0.02);
        kctx.lineCap = 'round';
        kctx.beginPath();
        for (let i = 3; i < RIB_N - 2; i++) {
          const s = i / (RIB_N - 1);
          const x = wx[i] - rnx[i] * half(s) * 0.9, y = wy[i] - rny[i] * half(s) * 0.9;
          if (i === 3) kctx.moveTo(x, y); else kctx.lineTo(x, y);
        }
        kctx.stroke();

        // faint warm head glow bleeding into the water
        kctx.globalAlpha = 1;
        const hgR = L * 0.09;
        const hg = kctx.createRadialGradient(wx[0], wy[0], 0, wx[0], wy[0], hgR);
        hg.addColorStop(0, `rgba(${KOI_HOT},0.34)`);
        hg.addColorStop(1, `rgba(${KOI_HOT},0)`);
        kctx.fillStyle = hg;
        kctx.beginPath();
        kctx.arc(wx[0], wy[0], hgR, 0, Math.PI * 2);
        kctx.fill();
      }
      kctx.globalAlpha = 1;
    };

    const frame = () => {
      const time = now();
      const dt = Math.min(0.05, time - prev || 0.016);
      prev = time;

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
