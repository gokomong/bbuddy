// Combines existing PNG frames into a clean GIF using gifenc (better quality)
import pkg from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = pkg;
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const FRAME_COUNT = 4;
const DELAY = 2500; // 2.5s per frame

const frames = [];
let width, height;

for (let i = 0; i < FRAME_COUNT; i++) {
  const pngData = readFileSync(join(__dirname, 'frames', `frame-${i}.png`));
  const png = PNG.sync.read(pngData);
  width = png.width;
  height = png.height;
  // Convert RGBA to RGB for gifenc
  const rgba = png.data;
  frames.push(rgba);
  console.log(`  Loaded frame ${i} (${width}x${height})`);
}

const gif = GIFEncoder();

for (let i = 0; i < frames.length; i++) {
  const rgba = frames[i];
  // Quantize to 256-color palette
  const palette = quantize(rgba, 256, { format: 'rgba4444' });
  const indexed = applyPalette(rgba, palette, 'rgba4444');
  gif.writeFrame(indexed, width, height, { palette, delay: DELAY });
  console.log(`  Encoded frame ${i}`);
}

gif.finish();

const output = join(__dirname, 'buddy-demo.gif');
writeFileSync(output, gif.bytes());
console.log(`\n✅ GIF created: ${output} (${(gif.bytes().length / 1024).toFixed(1)} KB)`);
