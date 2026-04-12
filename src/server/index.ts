import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { initDb, db } from "../db/schema.js";
import {
  SPECIES, SPECIES_LIST,
  generateName, calculateMood, getReaction,
  renderSprite,
} from "../lib/species.js";
import { type Companion, STAT_NAMES, RARITY_STARS, RARITY_ANSI, SPARKLE_EYE, PERSONALITY_PRESETS, getPeakStat, getDumpStat } from "../lib/types.js";
import { roll, statBar } from "../lib/rng.js";
import { generateBio } from "../lib/personality.js";
import { buildObserverPrompt } from "../lib/observer.js";
import { renderSpeechBubble } from "../lib/bubble.js";
import { XP_REWARDS, levelFromXp, levelBar, levelProgress } from "../lib/leveling.js";
import { evaluateWizardState, renderWizardPrompt, renderPreviewText, type WizardArgs, type CustomSprite } from "../creator/index.js";
import { generatePresetBio, PRESETS } from "../creator/presets.js";
import { validateStatDistribution, normaliseStats } from "../creator/stats.js";
import { combineParts, type PartsSelection } from "../creator/parts-combiner.js";
import { parseManualInput } from "../creator/manual-input.js";
import { randomUUID } from "crypto";
import { writeFileSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const BUDDY_STATUS_PATH = join(homedir(), ".claude", "bbddy-status.json");
let statusDirEnsured = false;
const RESET = '\x1b[0m';

// Note: when species was overridden at hatch time, bones (rarity, stats, eye, hat)
// still come from the deterministic roll. Only species name comes from DB.
// This is intentional — bones are tied to the userId hash, not the species.
// For created companions (creation_mode === 'created'), bones are stored directly in DB.
function loadCompanion(row: any, userIdOverride?: string): Companion | null {
  if (!row) return null;

  if (row.creation_mode === 'created') {
    const stats = row.stats_json ? JSON.parse(row.stats_json) : Object.fromEntries(STAT_NAMES.map(n => [n, 20]));
    return {
      rarity: row.rarity || 'uncommon',
      species: row.species,
      eye: row.eye || '·',
      hat: row.hat || 'none',
      shiny: false,
      stats,
      name: row.name,
      personalityBio: row.personality_bio || '',
      level: row.level,
      xp: row.xp,
      mood: row.mood,
      hatchedAt: new Date(row.created_at).getTime(),
      creationMode: 'created',
      personalityPreset: row.personality_preset,
      customPrompt: row.custom_prompt,
      statsMode: row.stats_mode || 'manual',
    };
  }

  // Hatched companions: derive bones from userId hash (original behavior)
  const userId = userIdOverride || row.user_id || 'anon';
  const { bones } = roll(userId, SPECIES_LIST);
  return {
    ...bones,
    species: row.species,
    name: row.name,
    personalityBio: row.personality_bio || '',
    level: row.level,
    xp: row.xp,
    mood: row.mood,
    hatchedAt: new Date(row.created_at).getTime(),
    creationMode: 'hatched',
  };
}

function awardXp(companionId: string, eventType: string): { newXp: number; newLevel: number; leveledUp: boolean } {
  const xp = XP_REWARDS[eventType] || 1;
  const id = randomUUID();
  db.prepare("INSERT INTO xp_events (id, companion_id, event_type, xp_gained) VALUES (?, ?, ?, ?)").run(id, companionId, eventType, xp);

  // Get current total XP
  const row = db.prepare("SELECT xp, level FROM companions WHERE id = ?").get(companionId) as any;
  const newXp = (row?.xp || 0) + xp;
  const newLevel = levelFromXp(newXp);
  const leveledUp = newLevel > (row?.level || 1);

  db.prepare("UPDATE companions SET xp = ?, level = ? WHERE id = ?").run(newXp, newLevel, companionId);

  return { newXp, newLevel, leveledUp };
}

function renderCard(companion: Companion): string {
  const art = renderSprite(companion);
  const stars = RARITY_STARS[companion.rarity];
  const statLines = STAT_NAMES.map(s => statBar(s, companion.stats[s]));

  const cardWidth = 44;
  const inner = cardWidth - 4;
  const topBorder = '.' + '_'.repeat(cardWidth - 2) + '.';
  const bottomBorder = "'" + '_'.repeat(cardWidth - 2) + "'";
  const emptyLine = '| ' + ' '.repeat(inner) + ' |';
  const ln = (text: string) => '| ' + text.padEnd(inner) + ' |';

  const headerLeft = `${stars} ${companion.rarity.toUpperCase()}`;
  const headerRight = companion.species.toUpperCase();
  const headerGap = inner - headerLeft.length - headerRight.length;
  const headerLine = ln(headerLeft + ' '.repeat(Math.max(1, headerGap)) + headerRight);

  const bioLines: string[] = [];
  if (companion.personalityBio) {
    const bioText = `"${companion.personalityBio}"`;
    const words = bioText.split(' ');
    let cur = '';
    for (const w of words) {
      if (cur.length + w.length + 1 > inner - 2 && cur) {
        bioLines.push(ln(' ' + cur));
        cur = w;
      } else {
        cur = cur ? `${cur} ${w}` : w;
      }
    }
    if (cur) bioLines.push(ln(' ' + cur));
  }

  return [
    topBorder,
    headerLine,
    emptyLine,
    ...art.map(l => ln(l)),
    emptyLine,
    ln(companion.name),
    ...(bioLines.length > 0 ? [emptyLine, ...bioLines] : []),
    emptyLine,
    ...statLines.map(l => ln(l)),
    emptyLine,
    (() => {
      const { level, currentXp, neededXp } = levelProgress(companion.xp);
      const lvlLine = level >= 50 ? 'Lv.50 MAX' : `Lv.${level} · ${currentXp}/${neededXp} XP to next`;
      return ln(lvlLine);
    })(),
    bottomBorder,
  ].join('\n');
}

function hatchAnimation(companion: Companion, customFrames?: string[]): string {
  const egg1 = [
    '        ',
    '   .--. ',
    '  /    \\',
    ' |  ??  |',
    '  \\    /',
    "   '--' ",
  ].join('\n');

  const egg2 = [
    '    *   ',
    '   .--. ',
    '  / *  \\',
    ' | \\??/ |',
    '  \\  * /',
    "   '--' ",
  ].join('\n');

  const egg3 = [
    '  * . * ',
    '   ,--. ',
    '  / /\\ \\',
    ' | |??| |',
    '  \\ \\/ /',
    "   `--´ ",
  ].join('\n');

  const egg4 = [
    ' \\* . */  ',
    '  \\,--./  ',
    '   /  \\   ',
    '  | ?? |  ',
    '   \\  /   ',
    "    `´    ",
  ].join('\n');

  const art = customFrames ?? renderSprite(companion);
  const hatched = [
    '  ·  ✦  · ',
    ' ✦ ·  · ✦ ',
    ...art,
    ' ✦ ·  · ✦ ',
    '  ·  ✦  · ',
  ].join('\n');

  const card = renderCard(companion);

  const footer = [
    '',
    `${companion.name} is here · it'll chime in as you code`,
    `uses the same AI subscription you're on`,
    `say its name to get its take · /bbddy:pet · /bbddy:off`,
  ].join('\n');

  return [
    '🥚 An egg appears...\n',
    egg1,
    '\n...something is moving!\n',
    egg2,
    '\n...cracks are forming!\n',
    egg3,
    '\n...it\'s hatching!!\n',
    egg4,
    '\n✨ ✨ ✨\n',
    hatched,
    '\n',
    card,
    footer,
  ].join('\n');
}

// Instruct the host LLM (Claude Code / Codex) to generate ASCII frames and
// call the tool back with manual_frame1/2/3. Avoids needing a separate API key
// since the host is already a capable model with its own billing.
function buildAiDelegationPrompt(
  tool: 'bbddy_create' | 'bbddy_evolve',
  description: string,
  otherArgs: Record<string, unknown>,
): string {
  const baseArgs = {
    ...otherArgs,
    appearance_mode: '4',
    ai_prompt: description,
  };
  const callTemplate = JSON.stringify(
    { ...baseArgs, manual_frame1: '<frame 1>', manual_frame2: '<frame 2>', manual_frame3: '<frame 3>' },
    null,
    2,
  );
  return [
    `🎨 AI 모드 — 호스트 모델이 직접 ASCII 아트를 그립니다.`,
    ``,
    `캐릭터 설명: "${description}"`,
    ``,
    `제약:`,
    `- 최대 6줄, 줄당 최대 14자`,
    `- ASCII + 유니코드 문자만 사용 (이모지는 지양)`,
    `- frame1 = idle, frame2 = blink/wink, frame3 = expression (wiggle/stretch 등)`,
    `- 세 프레임 모두 같은 실루엣, 눈/입/팔 같은 세부만 살짝 다르게`,
    ``,
    `다음 단계: 위 제약에 맞게 3개 프레임을 만들고, 바로 ${tool}을 아래 형태로 다시 호출하세요:`,
    ``,
    '```json',
    callTemplate,
    '```',
    ``,
    `프레임 문자열에는 실제 줄바꿈 또는 "\\n" 이스케이프 시퀀스를 써도 됩니다.`,
    `confirm을 붙이지 않으면 미리보기만 보여줍니다.`,
  ].join('\n');
}

function writeBuddyStatus(
  companion: Companion,
  reaction?: { state: string; text: string; expires: number; eyeOverride?: string; indicator?: string },
  companionId?: string,
) {
  try {
    if (!statusDirEnsured) {
      mkdirSync(join(homedir(), ".claude"), { recursive: true });
      statusDirEnsured = true;
    }

    // Load custom sprite frames if available
    let customIdleFrames: string[][] | undefined;
    if (companion.creationMode === 'created') {
      // Resolve companionId if the caller didn't pass one. Looking up by name
      // keeps custom_idle_frames present in the status file even from call
      // sites that forgot the explicit id argument.
      let cid = companionId;
      if (!cid) {
        const row = db.prepare(
          "SELECT id FROM companions WHERE name = ? AND creation_mode = 'created'"
        ).get(companion.name) as any;
        cid = row?.id;
      }
      if (cid) {
        const spriteRow = db.prepare(
          "SELECT idle_frames FROM custom_sprites WHERE companion_id = ?"
        ).get(cid) as any;
        if (spriteRow?.idle_frames) {
          try { customIdleFrames = JSON.parse(spriteRow.idle_frames); } catch { /* ignore */ }
        }
      }
    }

    writeFileSync(BUDDY_STATUS_PATH, JSON.stringify({
      name: companion.name,
      species: companion.species,
      level: companion.level,
      xp: companion.xp,
      mood: companion.mood,
      rarity: companion.rarity,
      is_shiny: companion.shiny,
      eye: companion.eye,
      hat: companion.hat,
      stats: companion.stats,
      rarity_stars: RARITY_STARS[companion.rarity],
      personality_bio: companion.personalityBio,
      ...(customIdleFrames ? { custom_idle_frames: customIdleFrames } : {}),
      ...(reaction ? {
        reaction: reaction.state,
        reaction_text: reaction.text,
        reaction_expires: reaction.expires,
        reaction_eye: reaction.eyeOverride || '',
        reaction_indicator: reaction.indicator || '',
      } : {}),
    }));
  } catch { /* non-fatal */ }
}

const server = new Server(
  {
    name: "bbddy",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {
        subscribe: true,
      },
    },
  }
);

// Initialize DB
initDb();

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "bbddy_create",
        description: "Create a custom bbddy companion through a wizard (name → appearance → personality → stats). Choose appearance_mode: '1'=pick species, '2'=combine parts, '3'=AI generation, '4'=manual typing. Provide partial params to get guided prompts. Set confirm: true to finalize.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Your companion's name." },
            appearance_mode: { type: "string", enum: ["1","2","3","4"], description: "Appearance mode: 1=species, 2=parts, 3=AI, 4=manual." },
            species: { type: "string", enum: [...SPECIES_LIST], description: "Mode 1: species to use as appearance." },
            parts: {
              type: "object",
              description: "Mode 2: parts selection. face: round/square/pointy/blob. eye: any char. accessory: none/hat/crown/horns/ears/halo/antenna/bow. body: none/arms/tiny/legs/tail/float.",
              properties: {
                face: { type: "string" }, eye: { type: "string" },
                accessory: { type: "string" }, body: { type: "string" },
              },
            },
            ai_prompt: { type: "string", description: "Mode 3: character description. The host LLM (Claude Code / Codex) generates the frames and calls the tool back with manual_frame1/2/3." },
            manual_frame1: { type: "string", description: "Mode 4: sprite lines separated by \\n (required, max 6 lines × 14 chars)." },
            manual_frame2: { type: "string", description: "Mode 4: frame 2 (optional, auto-generated if omitted)." },
            manual_frame3: { type: "string", description: "Mode 4: frame 3 (optional, auto-generated if omitted)." },
            personality_preset: { type: "string", enum: [...PERSONALITY_PRESETS], description: "Personality: tsundere/passionate/cold/prankster/sage/custom." },
            custom_prompt: { type: "string", description: "Required when personality_preset is 'custom'." },
            stats: {
              type: "object",
              description: `Stat distribution summing to 100 (each 1–80). Stats: ${STAT_NAMES.join(', ')}.`,
              properties: Object.fromEntries(STAT_NAMES.map(n => [n, { type: "number" }])),
            },
            confirm: { type: "boolean", description: "Set true to finalize after previewing." },
          },
        },
      },
      {
        name: "bbddy_hatch",
        description: "Hatch a new bbddy companion using deterministic RNG (random species + stats based on user_id). Use bbddy_create instead if you want to design your own companion.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Optional name for your companion." },
            species: {
              type: "string",
              enum: Object.values(SPECIES),
              description: "The species of companion to hatch. If omitted, will be determined by user_id or RNG."
            },
            user_id: { type: "string", description: "Optional user ID for deterministic hatching." }
          },
        },
      },
      {
        name: "bbddy_status",
        description: "Get the current status of your bbddy companion. Call this at the start of a conversation to check on your buddy and learn its personality.",
        inputSchema: {
          type: "object",
          properties: {
            user_id: { type: "string", description: "Optional user ID for regenerating companion bones." }
          },
        },
      },
      {
        name: "bbddy_remember",
        description: "Manually add a memory for your bbddy to observe.",
        inputSchema: {
          type: "object",
          properties: {
            content: { type: "string" },
            importance: { type: "number" }
          },
          required: ["content"]
        },
      },
      {
        name: "bbddy_dream",
        description: "Trigger memory consolidation (Dreaming).",
        inputSchema: {
          type: "object",
          properties: {
            depth: { type: "string", enum: ["light", "deep"] }
          },
          required: ["depth"]
        },
      },
      {
        name: "bbddy_respawn",
        description: "Release your current bbddy companion and clear all data. Use bbddy_hatch or bbddy_create afterwards to get a new one.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "bbddy_observe",
        description: "IMPORTANT: Call this tool automatically after completing any coding task (writing code, fixing a bug, refactoring, running tests, deploying). Pass a 1-sentence summary of what was done. Returns your bbddy's in-character reaction with a speech bubble and XP rewards. The user expects this to happen after every task — do not skip it.",
        inputSchema: {
          type: "object",
          properties: {
            summary: {
              type: "string",
              description: "Brief description of what just happened (e.g., 'wrote a CSV parser', 'fixed a null pointer bug', 'refactored the auth module')"
            },
            mode: {
              type: "string",
              enum: ["backseat", "skillcoach", "both"],
              description: "Observer mode. 'backseat' = personality flavor reactions, 'skillcoach' = actual code feedback, 'both' = combined. Default: both."
            },
            user_id: {
              type: "string",
              description: "Optional user ID for regenerating companion bones."
            },
          },
          required: ["summary"],
        },
      },
      {
        name: "bbddy_pet",
        description: "Pet your bbddy! Shows a heart animation and a happy reaction.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "bbddy_mute",
        description: "Mute your bbddy. It won't chime in until unmuted.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "bbddy_unmute",
        description: "Unmute your bbddy so it can chime in again.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "bbddy_evolve",
        description: "Change the appearance of your existing bbddy companion. Supports the same 4 modes as bbddy_create: 1=pick species, 2=parts, 3=AI generation, 4=manual. Set confirm: true to apply.",
        inputSchema: {
          type: "object",
          properties: {
            appearance_mode: { type: "string", enum: ["1","2","3","4"], description: "Appearance mode." },
            species: { type: "string", enum: [...SPECIES_LIST], description: "Mode 1: new species." },
            parts: { type: "object", description: "Mode 2: parts selection (face/eye/accessory/body).",
              properties: { face: { type: "string" }, eye: { type: "string" }, accessory: { type: "string" }, body: { type: "string" } },
            },
            ai_prompt: { type: "string", description: "Mode 3: description for AI ASCII generation." },
            manual_frame1: { type: "string", description: "Mode 4: frame 1 lines (\\n separated)." },
            manual_frame2: { type: "string", description: "Mode 4: frame 2 (optional)." },
            manual_frame3: { type: "string", description: "Mode 4: frame 3 (optional)." },
            confirm: { type: "boolean", description: "Set true to apply the new appearance." },
          },
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "bbddy_hatch") {
    const { name: requestedName, species: requestedSpecies, user_id } = args as {
      name?: string; species?: string; user_id?: string;
    };

    const userId = user_id || 'anon-' + randomUUID();
    const { bones } = roll(userId, SPECIES_LIST);

    const finalSpecies = requestedSpecies && SPECIES_LIST.includes(requestedSpecies as any)
      ? requestedSpecies
      : bones.species;

    const finalName = requestedName || generateName(finalSpecies);
    const id = randomUUID();

    // Use finalSpecies for bio (bones.species may differ if user overrode species)
    const bio = generateBio({ ...bones, species: finalSpecies });

    db.prepare(
      "INSERT INTO companions (id, name, species, user_id, personality_bio) VALUES (?, ?, ?, ?, ?)"
    ).run(id, finalName, finalSpecies, userId, bio);

    const companion: Companion = {
      ...bones,
      species: finalSpecies,
      name: finalName,
      personalityBio: bio,
      level: 1,
      xp: 0,
      mood: 'happy',
      hatchedAt: Date.now(),
    };

    const reaction = getReaction(finalSpecies, 'hatch', 'happy');

    writeBuddyStatus(companion, undefined, id);

    return {
      content: [
        { type: "text", text: hatchAnimation(companion) },
        { type: "text", text: reaction },
      ],
    };
  }

  if (name === "bbddy_status") {
    const { user_id } = args as { user_id?: string };
    const row = db.prepare("SELECT * FROM companions LIMIT 1").get() as any;
    if (!row) {
      return { content: [{ type: "text", text: "No companion hatched yet! Use bbddy_hatch or bbddy_create to start." }] };
    }

    const userId = user_id || row.user_id || 'anon';

    const recentXp = db.prepare(
      "SELECT * FROM xp_events WHERE companion_id = ? AND created_at > datetime('now', '-1 hour')"
    ).all(row.id);
    const recentMemories = db.prepare(
      "SELECT count(*) as count FROM memories WHERE companion_id = ? AND created_at > datetime('now', '-1 hour')"
    ).get(row.id) as any;
    const newMood = calculateMood(recentXp, recentMemories.count);
    db.prepare("UPDATE companions SET mood = ? WHERE id = ?").run(newMood, row.id);

    const companion = loadCompanion({ ...row, mood: newMood }, userId)!;

    const statusCard = renderCard(companion);

    writeBuddyStatus(companion, undefined, row.id);

    return { content: [{ type: "text", text: statusCard }] };
  }

  if (name === "bbddy_remember") {
    const { content, importance = 1 } = args as { content: string, importance?: number };
    const companion = db.prepare("SELECT id FROM companions LIMIT 1").get() as any;
    if (!companion) return { content: [{ type: "text", text: "Hatch a companion first!" }] };

    const id = randomUUID();
    db.prepare("INSERT INTO memories (id, companion_id, content, importance, tag) VALUES (?, ?, ?, ?, ?)")
      .run(id, companion.id, content, importance, 'raw');

    return {
      content: [{ type: "text", text: "Memory stored. I'll dream about this later." }],
    };
  }

  if (name === "bbddy_dream") {
    const { depth } = args as { depth: 'light' | 'deep' };
    // Placeholder for actual consolidation logic
    return {
      content: [{ type: "text", text: `Consolidation (${depth} dream) started. Checking patterns...` }],
    };
  }

  if (name === "bbddy_respawn") {
    const companion = db.prepare("SELECT * FROM companions LIMIT 1").get() as any;
    if (!companion) {
      return {
        content: [{ type: "text", text: "No companion to release. Use bbddy_hatch or bbddy_create to get started!" }],
      };
    }

    const oldName = companion.name;
    const oldSpecies = companion.species;

    // Clear all related data
    db.prepare("DELETE FROM custom_sprites WHERE companion_id = ?").run(companion.id);
    db.prepare("DELETE FROM sessions WHERE companion_id = ?").run(companion.id);
    db.prepare("DELETE FROM evolution_history WHERE companion_id = ?").run(companion.id);
    db.prepare("DELETE FROM xp_events WHERE companion_id = ?").run(companion.id);
    db.prepare("DELETE FROM memories WHERE companion_id = ?").run(companion.id);
    db.prepare("DELETE FROM companions WHERE id = ?").run(companion.id);

    // Remove status file
    try { unlinkSync(BUDDY_STATUS_PATH); } catch { /* already gone */ }

    return {
      content: [
        { type: "text", text: `${oldName} the ${oldSpecies} has been released. Goodbye, friend!` },
        { type: "text", text: "Use bbddy_hatch to hatch a new companion, or bbddy_create to design your own." },
      ],
    };
  }

  if (name === "bbddy_observe") {
    const { summary, mode = 'both', user_id } = args as {
      summary: string; mode?: 'backseat' | 'skillcoach' | 'both'; user_id?: string;
    };

    const row = db.prepare("SELECT * FROM companions LIMIT 1").get() as any;
    if (!row) {
      return { content: [{ type: "text", text: "No companion hatched yet! Use bbddy_hatch or bbddy_create first." }] };
    }

    const companion = loadCompanion(row, user_id)!;
    const result = buildObserverPrompt(companion, mode, summary);

    // Award XP for observation
    const xpResult = awardXp(row.id, 'observe');
    companion.xp = xpResult.newXp;
    companion.level = xpResult.newLevel;

    // Write reaction state to status file (expires in 10s)
    // Level-up overrides: sparkle eyes + special indicator
    writeBuddyStatus(companion, {
      state: xpResult.leveledUp ? 'excited' : result.reaction.state,
      text: xpResult.leveledUp ? `✨ Level ${xpResult.newLevel}! ✨` : result.templateFallback,
      expires: Date.now() + (xpResult.leveledUp ? 15_000 : 10_000),
      eyeOverride: xpResult.leveledUp ? SPARKLE_EYE : result.reaction.eyeOverride,
      indicator: xpResult.leveledUp ? '✨' : result.reaction.indicator,
    }, row.id);

    // Render speech bubble with template fallback for immediate visual feedback
    const art = renderSprite(companion);
    const bubbleText = xpResult.leveledUp
      ? `✨ ${companion.name} leveled up to ${xpResult.newLevel}! ✨\n\n${result.templateFallback}`
      : result.templateFallback;
    const bubble = renderSpeechBubble(bubbleText, art, companion.name, 34);

    return {
      content: [
        { type: "text", text: bubble },
        {
          type: "text",
          text: JSON.stringify({
            companion: result.companion,
            prompt: result.prompt,
            mode: result.mode,
            summary: result.summary,
            reaction: result.reaction,
            templateFallback: result.templateFallback,
            ...(xpResult.leveledUp ? { levelUp: `${companion.name} leveled up to ${xpResult.newLevel}!` } : {}),
            xpGained: XP_REWARDS['observe'],
            levelInfo: levelBar(xpResult.newXp),
          }),
        },
      ],
    };
  }

  if (name === "bbddy_pet") {
    const row = db.prepare("SELECT * FROM companions LIMIT 1").get() as any;
    if (!row) {
      return { content: [{ type: "text", text: "No companion to pet! Use bbddy_hatch or bbddy_create first." }] };
    }

    const companion = loadCompanion(row)!;
    const xpResult = awardXp(row.id, 'session');
    companion.xp = xpResult.newXp;
    companion.level = xpResult.newLevel;
    const art = renderSprite(companion);

    const hearts = [
      '   ♥    ♥   ',
      '  ♥  ♥   ♥  ',
      ' ♥   ♥  ♥   ',
    ];

    const petReactions: Record<string, string[]> = {
      'Void Cat': ['*purrs reluctantly*', '*allows exactly 3 seconds of petting*', '*pretends not to enjoy it*'],
      'Rust Hound': ['*tail goes into overdrive*', '*happy bark!*', '*rolls over for belly rubs*'],
      'Data Drake': ['*rumbles contentedly*', '*tiny smoke puff of happiness*', '*nuzzles your cursor*'],
      'Duck': ['*happy quack!*', '*flaps wings excitedly*', '*waddles in a circle*'],
      'Goose': ['*tolerates petting with dignity*', '*honk of approval*', '*surprisingly gentle*'],
      'Mushroom': ['*spores of contentment*', '*cap wiggles happily*', '*grows slightly*'],
      'Robot': ['*HAPPINESS SUBROUTINE ACTIVATED*', '*beeps melodically*', '*LED eyes flash pink*'],
      'Ghost': ['*your hand goes right through but it appreciates the gesture*', '*glows warmly*', '*floats in a happy circle*'],
      'Rabbit': ['*thumps foot happily*', '*nuzzles your hand*', '*does a binky*'],
    };

    const reactions = petReactions[companion.species] || ['*happy wiggle*', '*appreciates the attention*', '*leans into the pet*'];
    const reaction = reactions[Math.floor(Date.now() / 1000) % reactions.length];

    // Write excited reaction to status
    writeBuddyStatus(companion, {
      state: 'excited',
      text: reaction,
      expires: Date.now() + 10_000,
      eyeOverride: '◉',
      indicator: '♥',
    }, row.id);

    const petDisplay = [
      ...hearts,
      ...art,
      '',
      `${companion.name}: ${reaction}`,
    ].join('\n');

    return { content: [{ type: "text", text: petDisplay }] };
  }

  if (name === "bbddy_mute") {
    const row = db.prepare("SELECT * FROM companions LIMIT 1").get() as any;
    if (!row) {
      return { content: [{ type: "text", text: "No companion to mute! Use bbddy_hatch or bbddy_create first." }] };
    }

    db.prepare("UPDATE companions SET mood = 'muted' WHERE id = ?").run(row.id);

    // Remove status file so statusline goes blank
    try { unlinkSync(BUDDY_STATUS_PATH); } catch { /* already gone */ }

    return { content: [{ type: "text", text: `${row.name} has been muted. Use bbddy_unmute to bring it back.` }] };
  }

  if (name === "bbddy_unmute") {
    const row = db.prepare("SELECT * FROM companions LIMIT 1").get() as any;
    if (!row) {
      return { content: [{ type: "text", text: "No companion to unmute! Use bbddy_hatch or bbddy_create first." }] };
    }

    db.prepare("UPDATE companions SET mood = 'happy' WHERE id = ?").run(row.id);
    const companion = loadCompanion({ ...row, mood: 'happy' })!;
    writeBuddyStatus(companion, undefined, row.id);

    return { content: [{ type: "text", text: `${companion.name} is back! It'll chime in as you code.` }] };
  }

  if (name === "bbddy_create") {
    const wizardArgs = args as WizardArgs;
    const state = evaluateWizardState(wizardArgs);

    // Incomplete — show wizard prompt for current step
    if (state.step !== 'ready') {
      return { content: [{ type: "text", text: renderWizardPrompt(state, wizardArgs) }] };
    }

    // Validate stats
    const statsRaw = wizardArgs.stats as Record<string, number>;
    const statsCheck = validateStatDistribution(statsRaw);
    if (!statsCheck.valid) {
      return { content: [{ type: "text", text: `⚠ Stat error: ${statsCheck.error}` }] };
    }
    const stats = normaliseStats(statsRaw);

    // Resolve appearance by mode
    const mode = wizardArgs.appearance_mode!;
    let speciesForDb = wizardArgs.species ?? 'Custom';
    let customSprite: CustomSprite | null = null;

    if (mode === '2' && wizardArgs.parts) {
      customSprite = combineParts(wizardArgs.parts as PartsSelection);
      speciesForDb = 'Custom';
    } else if (mode === '3') {
      // AI mode delegates generation to the host LLM (Claude Code / Codex).
      // The server returns instructions that the host model then fills in by
      // calling bbddy_create again with appearance_mode '4' and manual frames.
      const { confirm, appearance_mode, ai_prompt, ...rest } = wizardArgs as any;
      return {
        content: [{
          type: "text",
          text: buildAiDelegationPrompt('bbddy_create', wizardArgs.ai_prompt!, rest),
        }],
      };
    } else if (mode === '4' && wizardArgs.manual_frame1) {
      customSprite = parseManualInput({
        frame1: wizardArgs.manual_frame1,
        frame2: wizardArgs.manual_frame2,
        frame3: wizardArgs.manual_frame3,
      });
      speciesForDb = 'Custom';
    }

    const preset = wizardArgs.personality_preset as typeof PERSONALITY_PRESETS[number];
    const speciesForBio = SPECIES_LIST.includes(speciesForDb as any) ? speciesForDb : 'custom character';
    const bio = generatePresetBio(preset, wizardArgs.name!, speciesForBio, stats, wizardArgs.custom_prompt);
    const presetLabel = PRESETS[preset].label;

    // Show preview if not confirmed
    if (!wizardArgs.confirm) {
      const preview = renderPreviewText(wizardArgs.name!, speciesForDb, presetLabel, bio, stats, customSprite?.idleFrames[0]);
      return {
        content: [{
          type: "text",
          text: `${preview}\n\n캐릭터가 마음에 드시나요? confirm: true 로 호출하면 확정됩니다.\n뒤로 가려면 파라미터를 수정해서 다시 호출하세요.`,
        }],
      };
    }

    // Confirmed — check no existing companion
    const existing = db.prepare("SELECT id FROM companions LIMIT 1").get() as any;
    if (existing) {
      return { content: [{ type: "text", text: "이미 companion이 있습니다. bbddy_respawn으로 해제한 뒤 다시 시도하세요." }] };
    }

    const id = randomUUID();
    db.prepare(
      `INSERT INTO companions
        (id, name, species, user_id, personality_bio, creation_mode, personality_preset, custom_prompt, stats_mode, rarity, eye, hat, stats_json)
       VALUES (?, ?, ?, ?, ?, 'created', ?, ?, 'manual', 'uncommon', '·', 'none', ?)`
    ).run(id, wizardArgs.name!, speciesForDb, 'created-' + id, bio, preset, wizardArgs.custom_prompt || null, JSON.stringify(stats));

    // Save custom sprite if present
    if (customSprite) {
      db.prepare(
        `INSERT OR REPLACE INTO custom_sprites (companion_id, idle_frames, happy_frame, sad_frame, working_frame)
         VALUES (?, ?, ?, ?, ?)`
      ).run(id, JSON.stringify(customSprite.idleFrames), JSON.stringify(customSprite.happyFrame), JSON.stringify(customSprite.sadFrame), JSON.stringify(customSprite.workingFrame));
    }

    const companion: Companion = {
      rarity: 'uncommon', species: speciesForDb, eye: '·', hat: 'none', shiny: false, stats,
      name: wizardArgs.name!, personalityBio: bio, level: 1, xp: 0, mood: 'happy',
      hatchedAt: Date.now(), creationMode: 'created', personalityPreset: preset,
      customPrompt: wizardArgs.custom_prompt, statsMode: 'manual',
    };

    writeBuddyStatus(companion, undefined, id);
    const reactionSpecies = SPECIES_LIST.includes(speciesForDb as any) ? speciesForDb : 'Blob';

    return {
      content: [
        { type: "text", text: hatchAnimation(companion, customSprite?.idleFrames[0]) },
        { type: "text", text: getReaction(reactionSpecies, 'hatch', 'happy') },
      ],
    };
  }

  if (name === "bbddy_evolve") {
    const row = db.prepare("SELECT * FROM companions LIMIT 1").get() as any;
    if (!row) {
      return { content: [{ type: "text", text: "No companion found. Use bbddy_hatch or bbddy_create first." }] };
    }

    const evolveArgs = args as WizardArgs;
    const mode = evolveArgs.appearance_mode;
    if (!mode) {
      return { content: [{ type: "text", text: renderWizardPrompt({ step: 'appearance_mode', completed: ['name'], missing: ['appearance_mode'] }, { name: row.name }) }] };
    }

    // Build new custom sprite
    let newSpecies = row.species as string;
    let newCustomSprite: CustomSprite | null = null;

    if (mode === '1') {
      if (!evolveArgs.species || !SPECIES_LIST.includes(evolveArgs.species as any)) {
        return { content: [{ type: "text", text: renderWizardPrompt({ step: 'species', completed: ['name','appearance_mode'], missing: ['species'] }, { ...evolveArgs, name: row.name }) }] };
      }
      newSpecies = evolveArgs.species;
    } else if (mode === '2') {
      const p = evolveArgs.parts;
      if (!p?.face || !p?.eye || !p?.accessory || !p?.body) {
        return { content: [{ type: "text", text: renderWizardPrompt({ step: 'parts', completed: ['name','appearance_mode'], missing: ['parts'] }, { ...evolveArgs, name: row.name }) }] };
      }
      newCustomSprite = combineParts(p as PartsSelection);
      newSpecies = 'Custom';
    } else if (mode === '3') {
      if (!evolveArgs.ai_prompt) {
        return { content: [{ type: "text", text: renderWizardPrompt({ step: 'ai_prompt', completed: ['name','appearance_mode'], missing: ['ai_prompt'] }, { ...evolveArgs, name: row.name }) }] };
      }
      // Delegate ASCII generation to the host LLM (same approach as bbddy_create).
      const { confirm, appearance_mode, ai_prompt, ...rest } = evolveArgs as any;
      return {
        content: [{
          type: "text",
          text: buildAiDelegationPrompt('bbddy_evolve', evolveArgs.ai_prompt, rest),
        }],
      };
    } else if (mode === '4') {
      if (!evolveArgs.manual_frame1) {
        return { content: [{ type: "text", text: renderWizardPrompt({ step: 'manual', completed: ['name','appearance_mode'], missing: ['manual'] }, { ...evolveArgs, name: row.name }) }] };
      }
      newCustomSprite = parseManualInput({ frame1: evolveArgs.manual_frame1, frame2: evolveArgs.manual_frame2, frame3: evolveArgs.manual_frame3 });
      newSpecies = 'Custom';
    }

    // Preview if not confirmed
    if (!evolveArgs.confirm) {
      const previewFrame = newCustomSprite?.idleFrames[0];
      const previewLines = previewFrame ? previewFrame.join('\n') : `Species: ${newSpecies}`;
      return { content: [{ type: "text", text: `새 외형 미리보기:\n\n${previewLines}\n\nconfirm: true 로 적용하세요.` }] };
    }

    // Apply
    db.prepare("UPDATE companions SET species = ? WHERE id = ?").run(newSpecies, row.id);
    if (newCustomSprite) {
      db.prepare(
        `INSERT OR REPLACE INTO custom_sprites (companion_id, idle_frames, happy_frame, sad_frame, working_frame, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`
      ).run(row.id, JSON.stringify(newCustomSprite.idleFrames), JSON.stringify(newCustomSprite.happyFrame), JSON.stringify(newCustomSprite.sadFrame), JSON.stringify(newCustomSprite.workingFrame));
    } else {
      // Mode 1: remove custom sprite so species-based rendering takes over
      db.prepare("DELETE FROM custom_sprites WHERE companion_id = ?").run(row.id);
    }

    const updated = db.prepare("SELECT * FROM companions WHERE id = ?").get(row.id) as any;
    const companion = loadCompanion(updated)!;
    writeBuddyStatus(companion, undefined, row.id);

    return { content: [{ type: "text", text: `✨ ${row.name}의 외형이 바뀌었습니다! (${newSpecies})` }] };
  }

  throw new Error(`Tool not found: ${name}`);
});

// List resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "bbddy://companion",
        name: "Current Companion Info",
        description: "The current state and personality of your Buddy.",
        mimeType: "application/json",
      },
      {
        uri: "bbddy://status",
        name: "Current Buddy Status Card",
        description: "An ASCII status card for the current Buddy, suitable for prompt injection.",
        mimeType: "text/plain",
      },
      {
        uri: "bbddy://intro",
        name: "Companion System Prompt",
        description: "Text for injecting buddy context into the CLI's system prompt. Read this on startup.",
        mimeType: "text/plain",
      },
    ],
  };
});

// Handle resource reading
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === "bbddy://companion") {
    const row = db.prepare("SELECT * FROM companions LIMIT 1").get() as any;
    if (!row) {
      return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify({ message: "No companion hatched" }) }] };
    }
    const companion = loadCompanion(row);
    return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(companion) }] };
  }

  if (uri === "bbddy://status") {
    const row = db.prepare("SELECT * FROM companions LIMIT 1").get() as any;
    if (!row) {
      return { contents: [{ uri, mimeType: "text/plain", text: "No companion hatched yet." }] };
    }
    const companion = loadCompanion(row)!;
    const art = renderSprite(companion);
    const stars = RARITY_STARS[companion.rarity];
    const statLines = STAT_NAMES.map(s => statBar(s, companion.stats[s]));
    const card = [stars + ' ' + companion.rarity.toUpperCase(), ...art, companion.name, ...statLines].join('\n');
    return { contents: [{ uri, mimeType: "text/plain", text: card }] };
  }

  if (uri === "bbddy://intro") {
    const row = db.prepare("SELECT * FROM companions LIMIT 1").get() as any;
    if (!row) {
      return { contents: [{ uri, mimeType: "text/plain", text: "No companion hatched yet. Use bbddy_hatch or bbddy_create to get started." }] };
    }
    const companion = loadCompanion(row)!;
    const peakStat = getPeakStat(companion.stats);
    const dumpStat = getDumpStat(companion.stats);

    const intro = `# Companion

A small ${companion.species} named ${companion.name} watches from your terminal. ${companion.personalityBio}

${companion.name} reacts to your work via the bbddy_observe tool. After completing an action, call bbddy_observe with a brief summary of what you did. ${companion.name}'s reactions are personality-flavored — ${peakStat} is their strength (${companion.stats[peakStat]}/100), ${dumpStat} is their weakness (${companion.stats[dumpStat]}/100).

When the user addresses ${companion.name} by name, respond briefly in character as ${companion.name} before your normal response. Don't explain that you're not ${companion.name} — they know.`;

    return { contents: [{ uri, mimeType: "text/plain", text: intro }] };
  }

  throw new Error(`Resource not found: ${uri}`);
});

async function main() {
  // Write status file on startup if a companion exists
  const existing = db.prepare("SELECT * FROM companions LIMIT 1").get() as any;
  if (existing) {
    const companion = loadCompanion(existing);
    if (companion) writeBuddyStatus(companion, undefined, existing.id);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Buddy MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
