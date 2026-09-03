#!/usr/bin/env node
/**
 * Screenshots each Astryx page template into public/astryx-thumbs/<id>.webp for
 * the Playground template picker. Run manually after the template set changes:
 *
 *   npm run dev            # (or `next start` after a build) on :3000
 *   npm run astryx:thumbs
 *
 * NOT wired into prebuild — it needs a running server + headless Chrome.
 * Override the target with THUMB_BASE_URL (default http://localhost:3000).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.THUMB_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const MANIFEST = join(root, 'src/lib/design-systems/generated/astryx-templates/astryx-templates.manifest.json');
const OUT_DIR = join(root, 'public/astryx-thumbs');
const VIEWPORT = { width: 1280, height: 800, deviceScaleFactor: 2 };
const THUMB_WIDTH = 640;

if (!existsSync(MANIFEST)) {
  console.error('capture-astryx-thumbs: no manifest — run `node scripts/generate-astryx-templates.mjs` first');
  process.exit(1);
}
const ids = JSON.parse(readFileSync(MANIFEST, 'utf8')).map((e) => e.id);

try {
  const res = await fetch(BASE, { method: 'HEAD' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
} catch (err) {
  console.error(`capture-astryx-thumbs: ${BASE} unreachable (${err.message}). Start the dev server first.`);
  process.exit(1);
}

const puppeteer = (await import('puppeteer')).default;
const sharp = (await import('sharp')).default;
mkdirSync(OUT_DIR, { recursive: true });

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--font-render-hinting=none'] });
let ok = 0;
let failed = 0;
try {
  for (const id of ids) {
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);
    try {
      await page.goto(`${BASE}/astryx-thumb/${id}`, { waitUntil: 'networkidle2', timeout: 45000 });
      await page.evaluate(() => document.fonts.ready);
      // Nudge scroll so IntersectionObserver-driven lists / lazy sections populate,
      // then settle for recharts animations.
      await page.evaluate(() => { window.scrollTo(0, 300); window.scrollTo(0, 0); });
      await new Promise((r) => setTimeout(r, 1400));
      await page.evaluate(() => document.querySelector('nextjs-portal')?.remove());
      const png = await page.screenshot({ type: 'png' });
      await sharp(png)
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(join(OUT_DIR, `${id}.webp`));
      ok++;
      process.stdout.write(`  ✓ ${id}\n`);
    } catch (err) {
      failed++;
      process.stdout.write(`  ✗ ${id} — ${err.message.split('\n')[0]}\n`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

writeFileSync(join(OUT_DIR, '.gitkeep'), '');
console.log(`capture-astryx-thumbs: ${ok}/${ids.length} captured → public/astryx-thumbs/${failed ? ` (${failed} failed)` : ''}`);
process.exit(failed && ok === 0 ? 1 : 0);
