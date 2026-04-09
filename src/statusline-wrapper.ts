import { execSync } from "child_process";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { SPECIES_ANIMATIONS } from "./lib/species.js";

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const MAGENTA = "\x1b[35m";

// Convert Windows backslash paths to forward slashes for Git Bash compatibility
const toUnix = (p: string) => p.replace(/\\/g, "/");

const BUDDY_STATUS_PATH = join(homedir(), ".claude", "buddy-status.json");

// Animation: cycle frames every ~2 seconds
const FRAME_INTERVAL_MS = 2000;

// Read stdin from Claude Code
let stdinData = "";
try {
  stdinData = readFileSync(0, "utf-8");
} catch { /* no stdin */ }

// Run claude-hud and capture output
try {
  const configDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
  const cacheDir = join(configDir, "plugins", "cache", "claude-hud", "claude-hud");

  // Find latest claude-hud version
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
    const bunPath = "/c/Users/steven.wu/.bun/bin/bun";
    const entryPoint = toUnix(join(pluginDir, "src", "index.ts"));
    const result = execSync(
      `"${bunPath}" --env-file /dev/null "${entryPoint}"`,
      { input: stdinData, timeout: 5000, encoding: "utf-8", shell: "bash", stdio: ["pipe", "pipe", "pipe"] }
    );
    if (result) {
      process.stdout.write(result);
    }
  }
} catch { /* claude-hud failed, continue with buddy only */ }

// Read buddy status and append animated ASCII art
try {
  const raw = readFileSync(BUDDY_STATUS_PATH, "utf-8");
  const buddy = JSON.parse(raw);
  if (buddy && buddy.name) {
    // Pick animation frame based on time
    const stage = (buddy.level || 1) >= 10 ? "adult" : "hatchling";
    const animation = SPECIES_ANIMATIONS[buddy.species];
    const frames = animation?.[stage];

    let ascii: string;
    if (frames && frames.length > 0) {
      const frameIndex = Math.floor(Date.now() / FRAME_INTERVAL_MS) % frames.length;
      ascii = frames[frameIndex];
    } else {
      ascii = buddy.ascii || "";
    }

    if (!ascii) process.exit(0);

    const asciiLines = ascii.split("\n");
    const shinyTag = buddy.is_shiny ? " ✨" : "";
    const infoLines = [
      `${CYAN}${buddy.name}${RESET} ${DIM}(${buddy.species})${RESET} ${YELLOW}Lv.${buddy.level}${shinyTag}${RESET}`,
      `${DIM}Mood:${RESET} ${moodColor(buddy.mood)}${buddy.mood}${RESET}  ${DIM}XP:${RESET} ${buddy.xp}`,
    ];

    // Pad ASCII art lines to consistent width for alignment
    const artWidth = Math.max(...asciiLines.map((l: string) => l.length));

    for (let i = 0; i < Math.max(asciiLines.length, infoLines.length); i++) {
      const artPart = (asciiLines[i] || "").padEnd(artWidth);
      const infoPart = infoLines[i] || "";
      console.log(`${RESET}${MAGENTA}${artPart}${RESET}  ${infoPart}`);
    }
  }
} catch { /* no buddy status file, skip */ }

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
