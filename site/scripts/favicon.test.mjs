import assert from 'node:assert/strict';
import test from 'node:test';
import { brandFavicon, pngIco } from '../src/lib/favicon.mjs';

test('brand favicon is an ICO directory of the 16px and 32px brand PNGs', () => {
  const ico = brandFavicon();
  assert.deepEqual([ico.readUInt16LE(0), ico.readUInt16LE(2), ico.readUInt16LE(4)], [0, 1, 2]);
  const images = [0, 1].map((index) => {
    const entry = 6 + 16 * index;
    const bytes = ico.subarray(ico.readUInt32LE(entry + 12), ico.readUInt32LE(entry + 12) + ico.readUInt32LE(entry + 8));
    assert.equal(bytes.toString('latin1', 1, 4), 'PNG');
    return [ico[entry], ico[entry + 1], bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  });
  assert.deepEqual(images, [[16, 16, 16, 16], [32, 32, 32, 32]]);
  assert.equal(ico.readUInt32LE(6 + 16 + 12) + ico.readUInt32LE(6 + 16 + 8), ico.length);
});

test('ICO wrapper rejects non-PNG input and empty image lists', () => {
  assert.throws(() => pngIco([]), /at least one PNG/);
  assert.throws(() => pngIco([Buffer.from('GIF89a not a png at all')]), /must be PNG/);
});
