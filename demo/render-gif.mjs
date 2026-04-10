// Renders 4 clean static frames to PNG, combines into GIF
import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync, mkdirSync, createWriteStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import GIFEncoder from 'gif-encoder-2';
import { PNG } from 'pngjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const W = 620, H = 480;

const STYLE = `
  body { margin:0; background:#1e1e2e; }
  pre {
    font-family: 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.4;
    padding: 20px 30px;
    margin: 0;
  }
  .t { color: #cdd6f4; }
  .g { color: #a6e3a1; }
  .y { color: #f9e2af; }
  .c { color: #94e2d5; }
  .m { color: #f5c2e7; }
  .d { color: #6c7086; }
  .r { color: #f38ba8; }
`;

const frames = [
  // Frame 0: Egg
  `<span class="g">$ buddy_hatch --name Nuzzlecap --species Mushroom</span>

<span class="y">🥚 An egg appears...</span>

<span class="t">       .--.</span>
<span class="t">      /    \\</span>
<span class="t">     |  ??  |</span>
<span class="t">      \\    /</span>
<span class="t">       '--'</span>

<span class="y">...something is moving!</span>

<span class="t">        *</span>
<span class="t">       .--.</span>
<span class="t">      / *  \\</span>
<span class="t">     | \\??/ |</span>
<span class="t">      \\  * /</span>
<span class="t">       '--'</span>`,

  // Frame 1: Reveal + Card
  `<span class="m">✨ It's hatching!!</span>

<span class="y">      ·  ✦  ·</span>
<span class="y">     ✦ ·  · ✦</span>
<span class="m">        (   )</span>
<span class="m">      .-o-OO-o-.</span>
<span class="m">     (__________)</span>
<span class="m">        |.  .|</span>
<span class="m">        |____|</span>
<span class="y">     ✦ ·  · ✦</span>
<span class="y">      ·  ✦  ·</span>

<span class="c">     Nuzzlecap</span>
<span class="g">   ★★ UNCOMMON Mushroom</span>

<span class="d">   "An interconnected mushroom wielding</span>
<span class="d">    devastatingly precise feedback..."</span>

<span class="t">   SNARK      </span><span class="y">█████▓░░</span><span class="t">  70</span>
<span class="t">   PATIENCE   </span><span class="g">██▓░░░░░</span><span class="t">  34</span>

<span class="d">   Nuzzlecap is here · it'll chime in as you code</span>`,

  // Frame 2: Observe + Pet
  `<span class="g">$ buddy_observe "wrote a clean CSV parser"</span>

<span class="t">.________________________________.</span>
<span class="t">| Solid pattern choice.          |</span>  <span class="d">-</span>   <span class="m">   (   )</span>
<span class="t">'________________________________'</span>    <span class="m"> .-o-OO-o-.</span>
                                     <span class="m">(__________)</span>
                                        <span class="m">|.  .|</span>
                                        <span class="m">|____|</span>
                                       <span class="c">Nuzzlecap</span>

<span class="d">   +2 XP · Lv.1 [█░░░░░░░░░] 6/45</span>

<span class="g">$ buddy_pet</span>

<span class="r">        ♥    ♥</span>
<span class="r">       ♥  ♥   ♥</span>
<span class="r">      ♥   ♥  ♥</span>
<span class="m">        (   )</span>
<span class="m">      .-o-OO-o-.</span>
<span class="m">     (__________)</span>
<span class="m">        |.  .|</span>
<span class="m">        |____|</span>

<span class="c">   Nuzzlecap: </span><span class="d">*spores of contentment*</span>`,

  // Frame 3: Persistent
  `<span class="g">Your buddy is persistent. Always here.</span>

<span class="m">        (   )</span>
<span class="m">      .-o-OO-o-.</span>
<span class="m">     (__________)</span>
<span class="m">        |.  .|</span>
<span class="m">        |____|</span>

<span class="c">     Nuzzlecap</span>
<span class="d">   · spreading spores</span>


<span class="t">   Close the terminal. Restart.</span>
<span class="t">   Update your CLI.</span>

<span class="g">   Your buddy is still here. 🐾</span>


<span class="d">   Works with: Claude Code · Cursor · Windsurf</span>
<span class="d">   Codex CLI · Gemini CLI · any MCP client</span>

<span class="y">   curl -fsSL https://raw.githubusercontent.com/</span>
<span class="y">     fiorastudio/buddy/master/install.sh | bash</span>`,
];

async function main() {
  const framesDir = join(__dirname, 'frames');
  mkdirSync(framesDir, { recursive: true });

  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H });

  for (let i = 0; i < frames.length; i++) {
    const html = `<html><head><style>${STYLE}</style></head><body><pre>${frames[i]}</pre></body></html>`;
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 200));
    const path = join(framesDir, `frame-${i}.png`);
    await page.screenshot({ path, clip: { x: 0, y: 0, width: W, height: H } });
    console.log(`  Frame ${i}: rendered`);
  }

  await browser.close();

  // Combine into GIF
  const encoder = new GIFEncoder(W, H);
  const output = join(__dirname, 'buddy-demo.gif');
  const ws = createWriteStream(output);
  encoder.createReadStream().pipe(ws);
  encoder.start();
  encoder.setRepeat(0);
  encoder.setDelay(2500);
  encoder.setQuality(10);

  for (let i = 0; i < frames.length; i++) {
    const png = PNG.sync.read(readFileSync(join(framesDir, `frame-${i}.png`)));
    encoder.addFrame(png.data);
  }
  encoder.finish();

  await new Promise(r => ws.on('finish', r));
  console.log(`\n✅ GIF created: ${output}`);
}

main().catch(console.error);
