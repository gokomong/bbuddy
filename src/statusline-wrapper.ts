import { execSync, execFileSync } from "child_process";
import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir, platform } from "os";
import { SPECIES_ANIMATIONS, SPRITE_BODIES, renderSprite } from "./lib/species.js";
import { HAT_LINES, RARITY_ANSI, type Hat } from "./lib/types.js";

// Braille Blank (U+2800) — visually empty but NOT treated as whitespace by
// .trim(). Claude Code strips leading regular spaces on each statusline
// row, so using Braille Blank for left padding is the only reliable way to
// keep multi-line right-aligned content aligned across rows 2+.
const PAD_CHAR = "\u2800";

// Terminal width detection. Claude Code runs the statusline as a subprocess
// with stdin redirected, so process.stdout.columns is undefined. We query
// the host: PowerShell on Windows, stty on Unix. Result is cached to avoid
// paying the ~400ms shell spawn on every render.
const TERM_COLS_CACHE_PATH = join(homedir(), ".claude", "bbuddy-term-cols.json");
// Short TTL so terminal resizes are reflected within ~1s. PowerShell spawn
// is ~255ms which fits comfortably inside Claude Code's statusline refresh
// interval (usually 1–5s).
const TERM_COLS_CACHE_TTL = 1_000;
const TERM_COLS_DEFAULT = 120;

// Ask the host terminal emulator for the actual pane width. Every emulator
// exposes this differently, so we try a chain in speed+reliability order
// and stop at the first hit. All results must be > 40 to guard against
// emulators that hand back nonsense "default" sizes.
function detectTermColsUncached(): number | null {
  const override = Number(process.env.BBUDDY_TERM_COLS);
  if (override > 0) return override;

  // tmux: cheapest, reports the live pane width.
  if (process.env.TMUX) {
    try {
      const out = execFileSync("tmux", ["display", "-p", "#{pane_width}"], {
        encoding: "utf-8", timeout: 500, stdio: ["ignore", "pipe", "pipe"],
      }).trim();
      const n = Number(out);
      if (n > 40) return n;
    } catch { /* fall through */ }
  }

  // WezTerm: has a CLI that returns JSON with per-pane dimensions.
  if (process.env.WEZTERM_PANE) {
    try {
      const exe = process.env.WEZTERM_EXECUTABLE || "wezterm";
      // wezterm-gui(.exe) is the GUI binary; the CLI is wezterm(.exe).
      const cli = exe.replace(/wezterm-gui(\.exe)?$/i, "wezterm$1");
      const out = execFileSync(cli, ["cli", "list", "--format", "json"], {
        encoding: "utf-8", timeout: 1000, stdio: ["ignore", "pipe", "pipe"],
      });
      const panes = JSON.parse(out) as Array<{ pane_id: number; size?: { cols: number } }>;
      const myId = Number(process.env.WEZTERM_PANE);
      const mine = panes.find((p) => p.pane_id === myId);
      if (mine?.size?.cols && mine.size.cols > 40) return mine.size.cols;
    } catch { /* fall through */ }
  }

  // kitty: remote control CLI, requires allow_remote_control.
  if (process.env.KITTY_WINDOW_ID) {
    try {
      const out = execFileSync("kitten", ["@", "ls"], {
        encoding: "utf-8", timeout: 500, stdio: ["ignore", "pipe", "pipe"],
      });
      const data = JSON.parse(out) as Array<{ tabs: Array<{ windows: Array<{ id: number; columns?: number }> }> }>;
      const myId = Number(process.env.KITTY_WINDOW_ID);
      for (const os of data) {
        for (const tab of os.tabs || []) {
          const win = (tab.windows || []).find((w) => w.id === myId);
          if (win?.columns && win.columns > 40) return win.columns;
        }
      }
    } catch { /* fall through */ }
  }

  // Unix fallback: try stty against the controlling tty.
  if (platform() !== "win32") {
    try {
      const out = execSync("stty size 2>/dev/null < /dev/tty", {
        encoding: "utf-8", timeout: 500, shell: "/bin/sh",
      }).trim();
      const n = Number(out.split(/\s+/)[1]);
      if (n > 40) return n;
    } catch { /* fall through */ }
  }

  // COLUMNS env var — usually set only by interactive shells, rarely
  // propagated into Claude Code's statusline subprocess.
  const envCols = Number(process.env.COLUMNS);
  if (envCols > 40) return envCols;

  // Give up: caller should fall back to close-to-HUD layout rather than
  // pretend to know the width. Returning null signals "unknown".
  return null;
}

// Returns the detected width, or null if no terminal reported one (in
// which case the caller should keep the buddy close to the HUD rather
// than right-align blindly).
function detectTermCols(): number | null {
  const override = Number(process.env.BBUDDY_TERM_COLS);
  if (override > 0) return override;

  try {
    const cache = JSON.parse(readFileSync(TERM_COLS_CACHE_PATH, "utf-8"));
    if (Date.now() - cache.ts < TERM_COLS_CACHE_TTL) {
      if (cache.cols === null) return null;
      if (cache.cols > 0) return cache.cols;
    }
  } catch { /* no cache or stale */ }

  const cols = detectTermColsUncached();
  try {
    writeFileSync(TERM_COLS_CACHE_PATH, JSON.stringify({ ts: Date.now(), cols }));
  } catch { /* non-fatal */ }
  return cols;
}

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const MAGENTA = "\x1b[35m";

const toUnix = (p: string) => p.replace(/\\/g, "/");
const BUDDY_STATUS_PATH = join(homedir(), ".claude", "bbuddy-status.json");
const FRAME_INTERVAL_MS = 800;

// True randomness for animation — each render picks a fresh random value.
// Idle animations SHOULD be unpredictable, like a real creature.

// Strip ANSI codes for width calculation
const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

// Visual width in terminal cells. CJK and most emoji take 2 cells; ASCII
// takes 1. Used so the speech bubble borders line up when the reaction
// text contains Korean, Chinese, Japanese, or emoji.
function visualWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;
    if (
      (cp >= 0x1100 && cp <= 0x115F) ||  // Hangul Jamo
      (cp >= 0x2E80 && cp <= 0x9FFF) ||  // CJK
      (cp >= 0xA000 && cp <= 0xA4CF) ||  // Yi
      (cp >= 0xAC00 && cp <= 0xD7A3) ||  // Hangul Syllables
      (cp >= 0xF900 && cp <= 0xFAFF) ||  // CJK compat ideographs
      (cp >= 0xFE30 && cp <= 0xFE4F) ||  // CJK compat forms
      (cp >= 0xFF00 && cp <= 0xFF60) ||  // Fullwidth forms
      (cp >= 0xFFE0 && cp <= 0xFFE6) ||  // Fullwidth signs
      (cp >= 0x1F300 && cp <= 0x1F64F) || // Emoticons / misc symbols
      (cp >= 0x1F680 && cp <= 0x1F6FF) || // Transport
      (cp >= 0x1F900 && cp <= 0x1F9FF)    // Supplemental symbols
    ) {
      w += 2;
    } else {
      w += 1;
    }
  }
  return w;
}

// Speech bubble — word-wrap + ASCII box, inspired by claude-buddy.
// Returns the bubble lines (no ANSI), plus the index of the middle text row
// so the renderer can place a `--` connector pointing at the buddy's mouth.
function buildSpeechBubble(text: string, innerW = 28): { lines: string[]; connectorIdx: number; width: number } {
  if (!text) return { lines: [], connectorIdx: -1, width: 0 };

  // Word wrap against the VISUAL width, not .length, so CJK/emoji are counted
  // as 2 cells each. This keeps the bubble's right border vertically aligned.
  const words = text.split(/\s+/).filter(Boolean);
  const textLines: string[] = [];
  let cur = "";
  let curW = 0;
  for (const word of words) {
    const ww = visualWidth(word);
    if (!cur) {
      cur = word;
      curW = ww;
    } else if (curW + 1 + ww <= innerW) {
      cur = cur + " " + word;
      curW += 1 + ww;
    } else {
      textLines.push(cur);
      cur = word;
      curW = ww;
    }
  }
  if (cur) textLines.push(cur);
  if (textLines.length === 0) return { lines: [], connectorIdx: -1, width: 0 };

  const border = "-".repeat(innerW + 2);
  const lines: string[] = [`.${border}.`];
  for (const tl of textLines) {
    const pad = " ".repeat(Math.max(0, innerW - visualWidth(tl)));
    lines.push(`| ${tl}${pad} |`);
  }
  lines.push(`\`${border}'`);

  // Connector points at the middle text row (skip top + bottom borders).
  const firstText = 1;
  const lastText = lines.length - 2;
  const connectorIdx = Math.floor((firstText + lastText) / 2);
  return { lines, connectorIdx, width: innerW + 4 };
}

// Read stdin from Claude Code
let stdinData = "";
try {
  stdinData = readFileSync(0, "utf-8");
} catch { /* no stdin */ }

// Run claude-hud with caching (HUD data changes slowly, no need to re-run every render)
const HUD_CACHE_PATH = join(homedir(), ".claude", "hud-cache.json");
const HUD_CACHE_TTL = 10_000; // 10 seconds

let hudLines: string[] = [];
try {
  // Try cache first
  let cacheHit = false;
  try {
    const cache = JSON.parse(readFileSync(HUD_CACHE_PATH, "utf-8"));
    if (Date.now() - cache.ts < HUD_CACHE_TTL && cache.lines) {
      hudLines = cache.lines;
      cacheHit = true;
    }
  } catch { /* no cache or stale */ }

  if (!cacheHit) {
    const configDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
    const cacheDir = join(configDir, "plugins", "cache", "claude-hud", "claude-hud");

    let pluginDir = "";
    try {
      const versions = readdirSync(cacheDir).sort((a, b) => {
        const pa = a.split(".").map(Number);
        const pb = b.split(".").map(Number);
        for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
          if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
        }
        return 0;
      });
      if (versions.length > 0) {
        pluginDir = join(cacheDir, versions[versions.length - 1]);
      }
    } catch { /* no claude-hud installed */ }

    if (pluginDir) {
      const bunPath = process.env.BUN_PATH || 'bun';
      const entryPoint = toUnix(join(pluginDir, "src", "index.ts"));
      const result = execSync(
        `"${bunPath}" --env-file /dev/null "${entryPoint}"`,
        { input: stdinData, timeout: 5000, encoding: "utf-8", shell: "bash", stdio: ["pipe", "pipe", "pipe"] }
      );
      if (result) {
        hudLines = result.trimEnd().split("\n");
        // Write cache
        try { writeFileSync(HUD_CACHE_PATH, JSON.stringify({ ts: Date.now(), lines: hudLines })); } catch { /* non-fatal */ }
      }
    } else {
      // Fallback: try omc-hud.mjs if claude-hud plugin not found
      const omcHudPath = join(homedir(), ".claude", "hud", "omc-hud.mjs");
      try {
        const result = execSync(
          `node "${toUnix(omcHudPath)}"`,
          { input: stdinData, timeout: 5000, encoding: "utf-8", shell: "bash", stdio: ["pipe", "pipe", "pipe"] }
        );
        if (result) {
          hudLines = result.trimEnd().split("\n");
          try { writeFileSync(HUD_CACHE_PATH, JSON.stringify({ ts: Date.now(), lines: hudLines })); } catch { /* non-fatal */ }
        }
      } catch { /* omc-hud not available */ }
    }
  }
} catch { /* claude-hud failed */ }

// Read buddy status
let buddyRight: string[] = [];
try {
  const raw = readFileSync(BUDDY_STATUS_PATH, "utf-8");
  const buddy = JSON.parse(raw);
  if (buddy && buddy.name) {
    let ascii: string = "";

    // Custom sprite frames take priority over species-based sprites
    const hasCustomFrames = Array.isArray(buddy.custom_idle_frames) && buddy.custom_idle_frames.length > 0;

    // Try to use new sprite format if eye data is available
    if (hasCustomFrames || (buddy.eye && SPRITE_BODIES[buddy.species])) {
      // Force hat: 'none' in statusline — hat adds an extra line that spills past the HUD.
      // Hats are shown in the card display instead.
      const bones = { species: buddy.species, eye: buddy.eye, hat: 'none', rarity: buddy.rarity || 'common', shiny: buddy.is_shiny || false, stats: buddy.stats || {} } as any;
      const frames = hasCustomFrames ? buddy.custom_idle_frames : SPRITE_BODIES[buddy.species];
      const totalFrames = frames.length;
      const hasReaction = buddy.reaction_expires && Date.now() < buddy.reaction_expires;

      // Organic frame selection. We derive a pseudo-random in [0,1) from
      // the current time bucket (2.5s wide) so the frame stays stable for
      // a couple of seconds before rolling again. With a 1s statusline
      // refresh, true Math.random() every render made the buddy look like
      // it was flickering — this keeps motion calm while still varied.
      let frameIndex: number;
      const bucket = Math.floor(Date.now() / 2500);
      const r = ((bucket * 2654435761) >>> 0) % 1000 / 1000;

      if (hasReaction && (buddy.reaction === 'excited' || buddy.reaction === 'impressed')) {
        // Energetic: any frame, biased toward expressive (1-4)
        frameIndex = r < 0.3 ? 0 : Math.floor(r * totalFrames);
      } else if (hasReaction && buddy.reaction === 'concerned') {
        // Worried: mostly blink, sometimes idle
        frameIndex = r < 0.6 ? 1 : 0;
      } else if (hasReaction) {
        // Other reactions: expressive frames
        frameIndex = 1 + Math.floor(r * Math.max(1, totalFrames - 1));
      } else if (buddy.mood === 'grumpy' || buddy.mood === 'muted') {
        // Grumpy: mostly idle, rare blink (~15% chance)
        frameIndex = r < 0.15 ? 1 : 0;
      } else {
        // Normal idle: weighted random
        // 40% idle, 20% blink, 15% expression, 15% wiggle, 10% special
        if (r < 0.40) frameIndex = 0;
        else if (r < 0.60) frameIndex = 1;
        else if (r < 0.75) frameIndex = 2 % totalFrames;
        else if (r < 0.90) frameIndex = 3 % totalFrames;
        else frameIndex = (totalFrames - 1) % totalFrames;
      }

      const artLines = hasCustomFrames
        ? (frames[frameIndex] as string[] ?? frames[0] as string[])
        : renderSprite(bones, frameIndex);
      ascii = artLines.join('\n');
    }

    // Fallback to SPECIES_ANIMATIONS if new format didn't produce output
    if (!ascii) {
      const stage = (buddy.level || 1) >= 10 ? "adult" : "hatchling";
      const animation = SPECIES_ANIMATIONS[buddy.species];
      const frames = animation?.[stage];

      if (frames && frames.length > 0) {
        const frameIndex = Math.floor(Date.now() / FRAME_INTERVAL_MS) % frames.length;
        ascii = frames[frameIndex];
      } else {
        ascii = buddy.ascii || "";
      }

      // Apply eye substitution for SPECIES_ANIMATIONS path only.
      // The SPRITE_BODIES path above handles {E} substitution inside renderSprite().
      if (buddy.eye) {
        ascii = ascii.replaceAll('{E}', buddy.eye);
      }
    }

    if (ascii) {
      let asciiLines = ascii.split("\n");

      // Hat rendering skipped in statusline — adds extra line that spills past HUD.
      // Hats are visible in the card display (/buddy status).

      // Apply reaction state (eye override + indicator) if active and not expired
      let reactionIndicator = '';
      let reactionText = '';
      if (buddy.reaction && buddy.reaction_expires && Date.now() < buddy.reaction_expires) {
        const reactionEye = buddy.reaction_eye || '';
        reactionIndicator = buddy.reaction_indicator || '';

        if (reactionEye) {
          asciiLines = asciiLines.map((line: string) => {
            // Replace the buddy's normal eye with reaction eye
            if (buddy.eye && line.includes(buddy.eye)) {
              return line.replaceAll(buddy.eye, reactionEye);
            }
            return line;
          });
        }

        if (buddy.reaction_text) {
          reactionText = buddy.reaction_text;
        }
      }

      // --- Micro-expression: append tiny ASCII particle to last art line ---
      // Stable for 4s windows so the particle doesn't strobe at 1s refresh.
      const hasReactionActive = buddy.reaction_expires && Date.now() < buddy.reaction_expires;
      const microBucket = Math.floor(Date.now() / 4000);
      const microR = ((microBucket * 1597334677) >>> 0) % 1000 / 1000;
      const microParticles = ['', '', '~', '', '*', '', '.', '♪', '', 'z', '·', ''];
      if (!hasReactionActive) {
        const particle = microParticles[Math.floor(microR * microParticles.length)];
        if (particle && asciiLines.length > 0) {
          asciiLines[asciiLines.length - 1] = asciiLines[asciiLines.length - 1].trimEnd() + ' ' + particle;
        }
      }

      // --- Ambient activity text: species-aware, changes randomly ~every 15-45s ---
      // The statusline runs as a short-lived subprocess so we can't import
      // the i18n module without paying a DB hit on every render. Since the
      // wrapper already reads the status file, the server stamps the
      // language into buddy.language; we pick the pool based on that.
      const lang = buddy.language === 'ko' ? 'ko' : 'en';
      const speciesAmbient: Record<'en' | 'ko', Record<string, string[]>> = {
        en: {
          'Void Cat': ['· judging your code', '· grooming silently', '· staring into void', '· plotting'],
          'Rust Hound': ['· sniffing for bugs', '· guarding the repo', '· chasing a pointer', '· tail wagging'],
          'Duck': ['· quacking softly', '· rubber ducking', '· waddling in place', '· preening feathers'],
          'Goose': ['· eyeing your code', '· honk pending', '· standing guard', '· scheming'],
          'Mushroom': ['· growing quietly', '· spreading spores', '· decomposing problems', '· cap shifting'],
          'Robot': ['· scanning code', '· processing...', '· optimizing paths', '· beep boop'],
          'Ghost': ['· haunting your logs', '· flickering softly', '· phasing through code', '· spectral hum'],
          'Rabbit': ['· twitching nose', '· ready to critique', '· ear perked', '· thumping softly'],
        },
        ko: {
          'Void Cat': ['· 조용히 지켜보는 중', '· 코드 판단 중', '· 무(無)를 응시 중', '· 음모 꾸미는 중'],
          'Rust Hound': ['· 버그 냄새 맡는 중', '· 레포 지키는 중', '· 포인터 쫓는 중', '· 꼬리 흔드는 중'],
          'Duck': ['· 꽥꽥', '· 러버덕 모드', '· 제자리 뒤뚱', '· 깃털 정리 중'],
          'Goose': ['· 코드 노려보는 중', '· 경적 장전', '· 경계 근무', '· 계략 세우는 중'],
          'Mushroom': ['· 조용히 자라는 중', '· 포자 뿌리는 중', '· 문제 분해 중', '· 갓 씰룩'],
          'Robot': ['· 코드 스캔 중', '· 처리 중...', '· 경로 최적화 중', '· 삐 뽀'],
          'Ghost': ['· 로그에 출몰 중', '· 부드럽게 깜빡임', '· 코드 통과 중', '· 영적 진동'],
          'Rabbit': ['· 코 씰룩', '· 비평 준비', '· 귀 쫑긋', '· 발로 쿵쿵'],
        },
      };
      const defaultAmbient = {
        en: ['· watching your cursor', '· counting semicolons', '· sniffing the git log', '· dreaming of v2.0', '· vibing'],
        ko: ['· 커서 지켜보는 중', '· 세미콜론 세는 중', '· git log 킁킁', '· v2.0 꿈꾸는 중', '· 흐름 타는 중'],
      };
      const ambientPool = speciesAmbient[lang][buddy.species] || defaultAmbient[lang];
      // Ambient text rotates on a slow bucket so the user reads a full
      // phrase before it changes instead of strobing every refresh.
      const ambientBucket = Math.floor(Date.now() / 15_000);
      const ambientR = ((ambientBucket * 374761393) >>> 0) % 1000 / 1000;
      const ambientText = hasReactionActive ? '' : `${DIM}${ambientPool[Math.floor(ambientR * ambientPool.length)]}${RESET}`;

      const shinyTag = buddy.is_shiny ? " ✨" : "";
      const rarityColor = buddy.rarity ? (RARITY_ANSI[buddy.rarity as keyof typeof RARITY_ANSI] || DIM) : DIM;
      const stars = buddy.rarity_stars || '';
      const nameIndicator = reactionIndicator ? `${YELLOW}${reactionIndicator}${RESET}` : '';
      const nameInfo = `${CYAN}${buddy.name}${nameIndicator}${RESET} ${DIM}(${buddy.species})${RESET} ${YELLOW}Lv.${buddy.level}${shinyTag}${RESET}`;
      const moodInfo = `${moodColor(buddy.mood)}${buddy.mood}${RESET} ${DIM}XP:${RESET}${buddy.xp} ${rarityColor}${stars}${RESET}`;

      // Build a speech bubble if the buddy has an active reaction text. The
      // bubble sits to the LEFT of the art with a `--` connector pointing at
      // the buddy's mouth, vertically centered against the art.
      const bubble = reactionText ? buildSpeechBubble(reactionText) : { lines: [], connectorIdx: -1, width: 0 };
      const bubbleStart = bubble.lines.length > 0 && bubble.lines.length < asciiLines.length
        ? Math.floor((asciiLines.length - bubble.lines.length) / 2)
        : 0;

      const artWidth = Math.max(...asciiLines.map((l: string) => l.length));
      const totalRows = Math.max(asciiLines.length, bubbleStart + bubble.lines.length);
      for (let i = 0; i < totalRows; i++) {
        const artLine = asciiLines[i] || "";
        const artPart = `${MAGENTA}${artLine.padEnd(artWidth)}${RESET}`;

        // Bubble piece for this row, if any.
        let bubblePiece = "";
        if (bubble.lines.length > 0) {
          const bi = i - bubbleStart;
          if (bi >= 0 && bi < bubble.lines.length) {
            const bline = bubble.lines[bi]!;
            const isBorder = bi === 0 || bi === bubble.lines.length - 1;
            const colored = isBorder
              ? `${rarityColor}${bline}${RESET}`
              : `${rarityColor}${bline[0]}${RESET}${DIM}${bline.slice(1, -1)}${RESET}${rarityColor}${bline.slice(-1)}${RESET}`;
            const connector = bi === bubble.connectorIdx ? `${rarityColor}--${RESET} ` : "   ";
            bubblePiece = `${colored}${connector}`;
          } else {
            bubblePiece = " ".repeat(bubble.width) + "   ";
          }
        }

        // Info text on the right of art (only on the first 2-3 rows where art is present).
        let infoSuffix = "";
        if (i === 0) infoSuffix = ` ${nameInfo}`;
        else if (i === 1) infoSuffix = ` ${moodInfo}`;
        else if (i === 2 && ambientText && !reactionText) infoSuffix = ` ${ambientText}`;

        if (artLine || bubblePiece) {
          buddyRight.push(`${bubblePiece}${artPart}${infoSuffix}`);
        }
      }
    }
  }
} catch { /* no buddy status file */ }

// Merge: HUD lines on the left, buddy on the right (side-by-side)
if (hudLines.length === 0 && buddyRight.length === 0) {
  process.exit(0);
}

if (buddyRight.length === 0) {
  // No buddy, just output HUD as-is
  for (const line of hudLines) {
    console.log(line);
  }
} else {
  // Find the max visible width of HUD lines for padding
  const hudVisibleWidths = hudLines.map((l) => stripAnsi(l).length);
  const maxHudWidth = Math.max(...hudVisibleWidths, 0);
  const buddyVisibleWidths = buddyRight.map((l) => stripAnsi(l).length);
  const maxBuddyWidth = Math.max(...buddyVisibleWidths, 0);
  const gutter = 3;
  const termCols = detectTermCols();

  // Layout decision:
  //   1. If we know the terminal width and HUD+gutter+buddy+margin fits,
  //      right-align the buddy.
  //   2. If we know the width but the HUD is too wide to fit alongside,
  //      drop the HUD and right-align just the buddy. The buddy is the
  //      thing the user wants to see — losing the HUD is the lesser evil.
  //   3. If we don't know the width at all, hug the HUD with a fixed gutter.
  // Claude Code reserves ~10 columns inside the terminal for its own UI
  // padding (the panel border, the prompt margin, the line-wrap indicator
  // etc). The terminal emulator reports the full pane width but our actual
  // usable statusline area is narrower. Subtract a fixed reservation so
  // right-aligned lines never sit past Claude Code's render edge.
  const CLAUDE_RESERVATION = Number(process.env.BBUDDY_CLAUDE_RESERVATION) || 10;
  const MARGIN = Number(process.env.BBUDDY_RIGHT_MARGIN) || 1;
  let padWidth: number;
  let dropHud = false;
  if (termCols !== null) {
    const usableCols = Math.max(0, termCols - CLAUDE_RESERVATION);
    const fits = maxHudWidth + gutter + maxBuddyWidth + MARGIN <= usableCols;
    if (fits) {
      const rightAlignedPad = usableCols - maxBuddyWidth - MARGIN;
      padWidth = Math.max(maxHudWidth + gutter, rightAlignedPad);
    } else {
      // Buddy-only mode: right-align the buddy and skip the HUD entirely.
      dropHud = true;
      padWidth = Math.max(0, usableCols - maxBuddyWidth - MARGIN);
    }
  } else {
    padWidth = maxHudWidth + gutter;
  }
  const useSideBySide = !dropHud;

  if (useSideBySide) {
    // Side-by-side layout. Pad with Braille Blank so lines 2+ survive
    // Claude Code's leading-whitespace trim.
    const totalLines = Math.max(hudLines.length, buddyRight.length);
    for (let i = 0; i < totalLines; i++) {
      const hudPart = hudLines[i] || "";
      const buddyPart = buddyRight[i] || "";

      if (buddyPart) {
        const visibleLen = stripAnsi(hudPart).length;
        const padding = PAD_CHAR.repeat(Math.max(0, padWidth - visibleLen));
        console.log(`${hudPart}${padding}${buddyPart}`);
      } else {
        console.log(hudPart);
      }
    }
  } else {
    // Buddy-only mode: terminal too narrow for HUD + buddy. Drop the HUD
    // and right-align the buddy by itself so it stays visible.
    const padding = PAD_CHAR.repeat(padWidth);
    for (const line of buddyRight) {
      console.log(`${padding}${line}`);
    }
  }
}

function moodColor(mood: string): string {
  switch (mood) {
    case "happy": return GREEN;
    case "content": return GREEN;
    case "curious": return CYAN;
    case "grumpy": return YELLOW;
    case "exhausted": return "\x1b[31m";
    default: return DIM;
  }
}
