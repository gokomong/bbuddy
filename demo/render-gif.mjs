// Renders the SVG demo frames to PNG, then combines into GIF
// Usage: node demo/render-gif.mjs

import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 4 stages, each shown for 2.5 seconds in a 10s loop
const STAGES = [
  { name: 'egg', showAt: 0 },
  { name: 'reveal', showAt: 2000 },
  { name: 'observe', showAt: 4500 },
  { name: 'persistent', showAt: 7000 },
];

// Create individual SVGs for each stage (no animation, just static)
function makeStaticSvg(stageIndex) {
  const svgContent = readFileSync(join(__dirname, 'buddy-demo.svg'), 'utf-8');

  // Replace all animation classes with opacity:0 except the target stage
  let modified = svgContent;
  for (let i = 1; i <= 4; i++) {
    if (i === stageIndex + 1) {
      modified = modified.replace(new RegExp(`\\.s${i}\\s*\\{[^}]+\\}`, 'g'), `.s${i} { opacity: 1; }`);
    } else {
      modified = modified.replace(new RegExp(`\\.s${i}\\s*\\{[^}]+\\}`, 'g'), `.s${i} { opacity: 0; }`);
    }
  }
  // Remove @keyframes
  modified = modified.replace(/@keyframes[^}]+\{[^}]+\}/g, '');

  return modified;
}

async function main() {
  const framesDir = join(__dirname, 'frames');
  mkdirSync(framesDir, { recursive: true });

  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 620, height: 480 });

  // Render each stage
  for (let i = 0; i < STAGES.length; i++) {
    const svg = makeStaticSvg(i);
    const htmlContent = `<html><body style="margin:0;padding:0;background:#1e1e2e">${svg}</body></html>`;

    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
    await page.screenshot({
      path: join(framesDir, `frame-${i}.png`),
      clip: { x: 0, y: 0, width: 620, height: 480 }
    });
    console.log(`  Frame ${i} (${STAGES[i].name}): rendered`);
  }

  await browser.close();

  // Combine PNGs into GIF using Node.js
  const GIFEncoder = (await import('gif-encoder-2')).default;
  const { PNG } = await import('pngjs');

  const firstPng = PNG.sync.read(readFileSync(join(framesDir, 'frame-0.png')));
  const { width, height } = firstPng;

  const encoder = new GIFEncoder(width, height);
  const output = join(__dirname, 'buddy-demo.gif');
  const writeStream = (await import('fs')).createWriteStream(output);

  encoder.createReadStream().pipe(writeStream);
  encoder.start();
  encoder.setRepeat(0);   // loop forever
  encoder.setDelay(2500); // 2.5s per frame
  encoder.setQuality(10);

  for (let i = 0; i < STAGES.length; i++) {
    const png = PNG.sync.read(readFileSync(join(framesDir, `frame-${i}.png`)));
    encoder.addFrame(png.data);
    console.log(`  Added frame ${i} to GIF`);
  }

  encoder.finish();

  await new Promise(resolve => writeStream.on('finish', resolve));
  console.log(`\n✅ GIF created: ${output}`);
}

main().catch(console.error);
