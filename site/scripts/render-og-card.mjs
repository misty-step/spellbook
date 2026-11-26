// Render the 1200x630 spellbook social card with the brand's own fonts, mark and tokens.
// Interim: @misty-step/brand 0.3.0 ships only the mistystack card; retire this once it names spellbook.
// Usage: node scripts/render-og-card.mjs [chrome-binary]   (writes src/assets/og-spellbook.png)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MARK_SVG } from '@misty-step/brand/mark';

const site = fileURLToPath(new URL('..', import.meta.url));
const brand = path.join(site, 'node_modules/@misty-step/brand/identity');
const out = path.join(site, 'src/assets/og-spellbook.png');
const chrome = process.argv[2] ?? process.env.CHROME ?? 'google-chrome';
const mark = (size) => MARK_SVG.replace('width="84.785" height="60"', `width="${size * 1.413}" height="${size}"`);

const html = `<!doctype html><html lang="en" data-brand="misty-step"><head><meta charset="utf-8">
<link rel="stylesheet" href="file://${brand}/brand.css"><style>
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #F7F6F3; color: #0E0F13; }
  .card { position: relative; box-sizing: border-box; width: 1200px; height: 630px; padding: 78px 80px; }
  .lockup { display: flex; align-items: center; gap: 18px; font: 400 44px/1 "Hedvig Letters Serif", serif; letter-spacing: -0.01em; }
  h1 { margin: 120px 0 0; font: 400 96px/1.02 "Hedvig Letters Serif", serif; letter-spacing: -0.025em; max-width: 720px; }
  h1 span { color: #5B5BF0; }
  .host { position: absolute; left: 80px; bottom: 74px; font: 400 26px/1 "Commit Mono", monospace; color: #646A77; }
  .big { position: absolute; right: 80px; top: 215px; }
</style></head><body><div class="card">
  <div class="lockup">${mark(42)}<span>spellbook</span></div>
  <h1>Craft for coding agents<span>.</span></h1>
  <div class="big">${mark(200)}</div>
  <div class="host">stack.mistystep.io</div>
</div></body></html>`;

const work = mkdtempSync(path.join(tmpdir(), 'og-card-'));
try {
  const page = path.join(work, 'card.html');
  writeFileSync(page, html);
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--window-size=1200,630', '--virtual-time-budget=3000', `--screenshot=${out}`, `file://${page}`], { stdio: 'inherit' });
  console.log(`wrote ${path.relative(site, out)}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
