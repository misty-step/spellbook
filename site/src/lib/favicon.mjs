import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { repoRoot } from './release.mjs';

// Browsers request /favicon.ico implicitly on routes with no <link rel="icon">, such as raw Markdown.
// Wrap the brand's own PNG favicons in an ICO container so that request resolves to the brand icon.
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const BRAND_ICONS = ['favicon-16.png', 'favicon-32.png'];

export function pngIco(pngs) {
  if (!pngs.length) throw new Error('ICO needs at least one PNG image');
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(pngs.length, 4);
  const entries = [];
  let offset = 6 + 16 * pngs.length;
  for (const png of pngs) {
    if (!png.subarray(0, 8).equals(PNG_SIGNATURE) || png.toString('latin1', 12, 16) !== 'IHDR') throw new Error('ICO images must be PNG files');
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    if (width < 1 || width > 256 || height < 1 || height > 256) throw new Error(`ICO image ${width}x${height} exceeds 256px`);
    const entry = Buffer.alloc(16);
    entry.writeUInt8(width % 256, 0); // 0 encodes 256
    entry.writeUInt8(height % 256, 1);
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += png.length;
  }
  return Buffer.concat([header, ...entries, ...pngs]);
}

export function brandFavicon() {
  const require = createRequire(path.join(repoRoot, 'site', 'package.json'));
  return pngIco(BRAND_ICONS.map((name) => readFileSync(require.resolve(`@misty-step/brand/identity/icons/${name}`))));
}
