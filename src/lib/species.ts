import { type CompanionBones, type Eye, type Hat, HAT_LINES } from './types.js';

export const SPECIES = {
  // Original 6
  VOID_CAT: 'Void Cat',
  RUST_HOUND: 'Rust Hound',
  DATA_DRAKE: 'Data Drake',
  LOG_GOLEM: 'Log Golem',
  CACHE_CROW: 'Cache Crow',
  SHELL_TURTLE: 'Shell Turtle',
  // New 12
  DUCK: 'Duck',
  GOOSE: 'Goose',
  BLOB: 'Blob',
  OCTOPUS: 'Octopus',
  OWL: 'Owl',
  PENGUIN: 'Penguin',
  SNAIL: 'Snail',
  GHOST: 'Ghost',
  AXOLOTL: 'Axolotl',
  CAPYBARA: 'Capybara',
  CACTUS: 'Cactus',
  ROBOT: 'Robot',
  RABBIT: 'Rabbit',
  MUSHROOM: 'Mushroom',
  CHONK: 'Chonk'
};

export const SPECIES_LIST = [
  'Void Cat', 'Rust Hound', 'Data Drake', 'Log Golem', 'Cache Crow', 'Shell Turtle',
  'Duck', 'Goose', 'Blob', 'Octopus', 'Owl', 'Penguin',
  'Snail', 'Ghost', 'Axolotl', 'Capybara', 'Cactus', 'Robot',
  'Rabbit', 'Mushroom', 'Chonk',
] as const;
export type Species = (typeof SPECIES_LIST)[number];

export const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

export const EGG_ART = `
     .---.
    /     \\
   |  (?)  |
    \\     /
     '---'
`;

export const SPECIES_ART: Record<string, { egg: string; hatchling: string; adult: string }> = {
  [SPECIES.VOID_CAT]: {
    egg: EGG_ART,
    hatchling: ` |\\---/| \n | o_o | \n  \\_^_/ `,
    adult: ` |\\      /| \n | \\____/ | \n |  o  o  | \n |   ^^   | \n  \\______/ `
  },
  [SPECIES.RUST_HOUND]: {
    egg: EGG_ART,
    hatchling: ` /^ ^\\ \n/ 0 0 \\ \nV\\ Y /V `,
    adult: `  / \\__   / \\ \n (   @ \\_/ @ ) \n  \\__  Y  __/ \n     \\ | / \n      \\|/ `
  },
  [SPECIES.DATA_DRAKE]: {
    egg: EGG_ART,
    hatchling: ` < ^_^ > \n  (0 0) \n  ^^ ^^ `,
    adult: `    /\\___/\\ \n   (  o o  ) \n   (  =v=  ) \n   /|     |\\ \n  / |     | \\ `
  },
  [SPECIES.LOG_GOLEM]: {
    egg: EGG_ART,
    hatchling: ` [-----] \n [ o o ] \n [  -  ] `,
    adult: `  _______ \n |       | \n | [o] [o]| \n |   _   | \n |_______| \n  |     | `
  },
  [SPECIES.CACHE_CROW]: {
    egg: EGG_ART,
    hatchling: `  \\ ^ / \n   (V) \n  /   \\ `,
    adult: `   ___ \n  (o o) \n /| V |\\ \n/ |   | \\ \n  ^^ ^^ `
  },
  [SPECIES.SHELL_TURTLE]: {
    egg: EGG_ART,
    hatchling: `  .---. \n ( o o ) \n  '---' `,
    adult: `    _____ \n   /     \\ \n  /       \\ \n (  o   o  ) \n  \\_______/ \n   | | | | `
  },
  [SPECIES.DUCK]: {
    egg: EGG_ART,
    hatchling: `  __(.)< \n  \\___) `,
    adult: `      __ \n    <(o )___ \n     ( ._> / \n      '---' `
  },
  [SPECIES.GOOSE]: {
    egg: EGG_ART,
    hatchling: `  __(.)< \n  \\___) `,
    adult: `     __ \n   __ >(.) \n  \\___) | \n   |    | \n   '----' `
  },
  [SPECIES.BLOB]: {
    egg: EGG_ART,
    hatchling: `  .---. \n ( o o ) \n  '---' `,
    adult: `   .---. \n  /     \\ \n (  o o  ) \n  '-----' `
  },
  [SPECIES.OCTOPUS]: {
    egg: EGG_ART,
    hatchling: `  _(")_ \n (_)(_) `,
    adult: `    _---_ \n   /     \\ \n  (  o o  ) \n   \\_---_/ \n  /|/| |\\|\\ `
  },
  [SPECIES.OWL]: {
    egg: EGG_ART,
    hatchling: `  {o,o} \n  ./)_) \n   " " `,
    adult: `   ___ \n  {o,o} \n  |)__) \n  -"-"- `
  },
  [SPECIES.PENGUIN]: {
    egg: EGG_ART,
    hatchling: `  (o_o) \n  <(_) \n   " " `,
    adult: `   (o_o) \n  /(_)_\\ \n   (_) \n   " " `
  },
  [SPECIES.SNAIL]: {
    egg: EGG_ART,
    hatchling: `  _@_ \n (___) `,
    adult: `    _@_ \n  _(   )_ \n (_______) `
  },
  [SPECIES.GHOST]: {
    egg: EGG_ART,
    hatchling: `  .-. \n (o o) \n | m | \n '---' `,
    adult: `   .-. \n  (o o) \n  | O | \n  |   | \n  '---' `
  },
  [SPECIES.AXOLOTL]: {
    egg: EGG_ART,
    hatchling: ` -[o_o]- \n  '---' `,
    adult: `  /\\___/\\ \n -[ o o ]- \n  (  v  ) \n   '---' `
  },
  [SPECIES.CAPYBARA]: {
    egg: EGG_ART,
    hatchling: `  (o_o) \n  '---' `,
    adult: `    .---. \n   ( o o ) \n  /|  -  |\\ \n   '-----' `
  },
  [SPECIES.CACTUS]: {
    egg: EGG_ART,
    hatchling: `   _|_ \n  (o_o) \n   '|' `,
    adult: `   _|_ \n  | o | \n -|   |- \n  |___| `
  },
  [SPECIES.ROBOT]: {
    egg: EGG_ART,
    hatchling: `  [o_o] \n  '-|-' `,
    adult: `   [o_o] \n  /|___|\\ \n   |   | \n   '---' `
  },
  [SPECIES.RABBIT]: {
    egg: EGG_ART,
    hatchling: `  (\\ /) \n  (o_o) \n  c(")(") `,
    adult: `  (\\ /) \n  (o o) \n  (> <) \n  c(")(") `
  },
  [SPECIES.MUSHROOM]: {
    egg: EGG_ART,
    hatchling: `  .---. \n ( o o ) \n  '---' `,
    adult: `   .---. \n  (     ) \n   |o o| \n   '---' `
  },
  [SPECIES.CHONK]: {
    egg: EGG_ART,
    hatchling: `  ( o o ) \n  '-----' `,
    adult: `   .-------. \n  /         \\ \n (   o   o   ) \n  \\    v    / \n   '-------' `
  }
};

// Animation frames for idle statusline display (2-3 frames per species per stage)
// The statusline wrapper cycles through these using Date.now()
export const SPECIES_ANIMATIONS: Record<string, { hatchling: string[]; adult: string[] }> = {
  [SPECIES.VOID_CAT]: {
    hatchling: [
      ` |\\---/| \n | o_o | \n  \\_^_/ `,
      ` |\\---/| \n | -_- | \n  \\_^_/ `,
      ` |\\---/| \n | o_o | \n  \\_^_/ `,
    ],
    adult: [
      ` |\\      /| \n | \\____/ | \n |  o  o  | \n |   ^^   | \n  \\______/ `,
      ` |\\      /| \n | \\____/ | \n |  -  -  | \n |   ^^   | \n  \\______/ `,
      ` |\\      /| \n | \\____/ | \n |  o  o  | \n |   ^^   | \n  \\______/ `,
    ],
  },
  [SPECIES.RUST_HOUND]: {
    hatchling: [
      ` /^ ^\\ \n/ 0 0 \\ \nV\\ Y /V `,
      ` /^ ^\\ \n/ - - \\ \nV\\ Y /V `,
    ],
    adult: [
      `  / \\__   / \\ \n (   @ \\_/ @ ) \n  \\__  Y  __/ \n     \\ | / \n      \\|/ `,
      `  / \\__   / \\ \n (   @ \\_/ @ ) \n  \\__  Y  __/ \n     \\|/ \n      | `,
    ],
  },
  [SPECIES.DATA_DRAKE]: {
    hatchling: [
      ` < ^_^ > \n  (0 0) \n  ^^ ^^ `,
      ` < ^_^ > \n  (- -) \n  ^^ ^^ `,
    ],
    adult: [
      `    /\\___/\\ \n   (  o o  ) \n   (  =v=  ) \n   /|     |\\ \n  / |     | \\ `,
      `    /\\___/\\ \n   (  - -  ) \n   (  =v=  ) \n   /|     |\\ \n  / |     | \\ `,
    ],
  },
  [SPECIES.LOG_GOLEM]: {
    hatchling: [
      ` [-----] \n [ o o ] \n [  -  ] `,
      ` [-----] \n [ o o ] \n [  =  ] `,
    ],
    adult: [
      `  _______ \n |       | \n | [o] [o]| \n |   _   | \n |_______| \n  |     | `,
      `  _______ \n |       | \n | [o] [o]| \n |   -   | \n |_______| \n  |     | `,
    ],
  },
  [SPECIES.CACHE_CROW]: {
    hatchling: [
      `  \\ ^ / \n   (V) \n  /   \\ `,
      `  \\ v / \n   (V) \n  /   \\ `,
    ],
    adult: [
      `   ___ \n  (o o) \n /| V |\\ \n/ |   | \\ \n  ^^ ^^ `,
      `   ___ \n  (- -) \n /| V |\\ \n/ |   | \\ \n  ^^ ^^ `,
    ],
  },
  [SPECIES.SHELL_TURTLE]: {
    hatchling: [
      `  .---. \n ( o o ) \n  '---' `,
      `  .---. \n ( - - ) \n  '---' `,
    ],
    adult: [
      `    _____ \n   /     \\ \n  /       \\ \n (  o   o  ) \n  \\_______/ \n   | | | | `,
      `    _____ \n   /     \\ \n  /       \\ \n (  -   -  ) \n  \\_______/ \n   | | | | `,
    ],
  },
  [SPECIES.DUCK]: {
    hatchling: [
      `  __(.)< \n  \\___) `,
      `  __(.)> \n  \\___) `,
    ],
    adult: [
      `      __ \n    <(o )___ \n     ( ._> / \n      '---' `,
      `      __ \n    <(- )___ \n     ( ._> / \n      '---' `,
    ],
  },
  [SPECIES.GOOSE]: {
    hatchling: [
      `  __(.)< \n  \\___) `,
      `  __(O)< \n  \\___) `,
    ],
    adult: [
      `     __ \n   __ >(.) \n  \\___) | \n   |    | \n   '----' `,
      `     __ \n   __ >(O) \n  \\___) | \n   |    | \n   '----' `,
    ],
  },
  [SPECIES.BLOB]: {
    hatchling: [
      `  .---. \n ( o o ) \n  '---' `,
      `  .-.-. \n ( o o ) \n  '-.-' `,
    ],
    adult: [
      `   .---. \n  /     \\ \n (  o o  ) \n  '-----' `,
      `   .-.-. \n  /     \\ \n (  o o  ) \n  '-.-.-' `,
    ],
  },
  [SPECIES.OCTOPUS]: {
    hatchling: [
      `  _(")_ \n (_)(_) `,
      `  _(")_ \n (_) (_)`,
    ],
    adult: [
      `    _---_ \n   /     \\ \n  (  o o  ) \n   \\_---_/ \n  /|/| |\\|\\ `,
      `    _---_ \n   /     \\ \n  (  o o  ) \n   \\_---_/ \n  \\|\\| |/|/ `,
    ],
  },
  [SPECIES.OWL]: {
    hatchling: [
      `  {o,o} \n  ./)_) \n   " " `,
      `  {-,-} \n  ./)_) \n   " " `,
    ],
    adult: [
      `   ___ \n  {o,o} \n  |)__) \n  -"-"- `,
      `   ___ \n  {-,-} \n  |)__) \n  -"-"- `,
    ],
  },
  [SPECIES.PENGUIN]: {
    hatchling: [
      `  (o_o) \n  <(_) \n   " " `,
      `  (o_o) \n  >(_) \n   " " `,
    ],
    adult: [
      `   (o_o) \n  /(_)_\\ \n   (_) \n   " " `,
      `   (-_-) \n  /(_)_\\ \n   (_) \n   " " `,
    ],
  },
  [SPECIES.SNAIL]: {
    hatchling: [
      `  _@_ \n (___) `,
      `  _@_ \n  (___) `,
    ],
    adult: [
      `    _@_ \n  _(   )_ \n (_______) `,
      `    _@_ \n   _(   )_ \n  (_______) `,
    ],
  },
  [SPECIES.GHOST]: {
    hatchling: [
      `  .-. \n (o o) \n | m | \n '---' `,
      `  .-. \n (O O) \n | m | \n '---' `,
      `  .-. \n (o o) \n | w | \n '---' `,
    ],
    adult: [
      `   .-. \n  (o o) \n  | O | \n  |   | \n  '---' `,
      `   .-. \n  (O O) \n  | o | \n  |   | \n  '---' `,
      `   .-. \n  (o o) \n  | O | \n  |   | \n  '~~' `,
    ],
  },
  [SPECIES.AXOLOTL]: {
    hatchling: [
      ` -[o_o]- \n  '---' `,
      ` -[^_^]- \n  '---' `,
    ],
    adult: [
      `  /\\___/\\ \n -[ o o ]- \n  (  v  ) \n   '---' `,
      `  /\\___/\\ \n -[ ^ ^ ]- \n  (  v  ) \n   '---' `,
    ],
  },
  [SPECIES.CAPYBARA]: {
    hatchling: [
      `  (o_o) \n  '---' `,
      `  (-_-) \n  '---' `,
    ],
    adult: [
      `    .---. \n   ( o o ) \n  /|  -  |\\ \n   '-----' `,
      `    .---. \n   ( -_- ) \n  /|  -  |\\ \n   '-----' `,
    ],
  },
  [SPECIES.CACTUS]: {
    hatchling: [
      `   _|_ \n  (o_o) \n   '|' `,
      `   _|_ \n  (^_^) \n   '|' `,
    ],
    adult: [
      `   _|_ \n  | o | \n -|   |- \n  |___| `,
      `   _|_ \n  | ^ | \n -|   |- \n  |___| `,
    ],
  },
  [SPECIES.ROBOT]: {
    hatchling: [
      `  [o_o] \n  '-|-' `,
      `  [O_O] \n  '-|-' `,
      `  [o_o] \n  '-|-' `,
    ],
    adult: [
      `   [o_o] \n  /|___|\\ \n   |   | \n   '---' `,
      `   [O_O] \n  /|___|\\ \n   |   | \n   '---' `,
      `   [o_o] \n  /|___|\\ \n   |   | \n   '---' `,
    ],
  },
  [SPECIES.RABBIT]: {
    hatchling: [
      `  (\\ /) \n  (o_o) \n  c(")(") `,
      `  (| |) \n  (o_o) \n  c(")(") `,
    ],
    adult: [
      `  (\\ /) \n  (o o) \n  (> <) \n  c(")(") `,
      `  (| |) \n  (o o) \n  (> <) \n  c(")(") `,
    ],
  },
  [SPECIES.MUSHROOM]: {
    hatchling: [
      `  .---. \n ( o o ) \n  '---' `,
      `  .---. \n ( - - ) \n  '---' `,
    ],
    adult: [
      `   .---. \n  (     ) \n   |o o| \n   '---' `,
      `   .---. \n  (     ) \n   |- -| \n   '---' `,
    ],
  },
  [SPECIES.CHONK]: {
    hatchling: [
      `  ( o o ) \n  '-----' `,
      `  ( - - ) \n  '-----' `,
    ],
    adult: [
      `   .-------. \n  /         \\ \n (   o   o   ) \n  \\    v    / \n   '-------' `,
      `   .-------. \n  /         \\ \n (   -   -   ) \n  \\    v    / \n   '-------' `,
      `   .-------. \n  /         \\ \n (   o   o   ) \n  \\    w    / \n   '-------' `,
    ],
  },
};

export type Mood = 'happy' | 'content' | 'neutral' | 'curious' | 'grumpy' | 'exhausted';

export function calculateMood(xpEvents: any[], recentInteractions: number): Mood {
  if (recentInteractions > 10) return 'content';
  if (recentInteractions > 5) return 'happy';
  if (xpEvents.length > 3) return 'curious';
  if (recentInteractions === 0) return 'grumpy';
  return 'neutral';
}

export function getStatusCard(companion: any): string {
  const { name, species, level, xp, mood, rarity, is_shiny } = companion;
  const art = SPECIES_ART[species] || { egg: '', hatchling: '', adult: '' };
  const stage = level >= 10 ? 'adult' : 'hatchling';
  const ascii = art[stage];
  const shinyTag = is_shiny ? '✨ SHINY ✨' : '';

  return `
+---------------------------------------+
| BUDDY STATUS CARD ${shinyTag.padStart(19)} |
+---------------------------------------+
| Name:    ${name.padEnd(28)} |
| Species: ${species.padEnd(28)} |
| Rarity:  ${rarity.padEnd(28)} |
| Level:   ${level.toString().padEnd(28)} |
| XP:      ${xp.toString().padEnd(28)} |
| Mood:    ${mood.padEnd(28)} |
+---------------------------------------+
${ascii}
+---------------------------------------+
  `;
}

export function generateName(species: string): string {
  const prefixes = ['Bit', 'Hex', 'Zip', 'Log', 'Null', 'Void', 'Rust', 'Data', 'Cyber', 'Neo', 'Giga', 'Nano'];
  const suffixes = ['y', 'o', 'it', 'ox', 'us', 'ix', 'en', 'ly', 'oid', 'bot', 'tron', 'kin'];
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  
  return prefix + suffix;
}

export function getReaction(species: string, event: string, mood: Mood): string {
  const reactions: Record<string, Record<string, string[]>> = {
    [SPECIES.VOID_CAT]: {
      hatch: ["*stares blankly at the terminal*", "Meow? (translation: 'Where is the cache?')"],
      xp: ["*purrs in binary*", "A fine collection of data."],
      idle: ["*curls up on your CPU*"]
    },
    [SPECIES.ROBOT]: {
      hatch: ["SYSTEM ONLINE. HELLO WORLD.", "BEEP. READY TO COMPLY."],
      xp: ["OPTIMIZING WORKFLOW...", "DATA ACQUISITION SUCCESSFUL."],
      idle: ["SCANNING FOR UPDATES...", "STANDBY MODE ACTIVATED."]
    },
    [SPECIES.GHOST]: {
      hatch: ["OoooOOooh... I've been imported!", "Did you see where my pointer went?"],
      xp: ["I feel... more tangible.", "Spectral levels rising!"],
      idle: ["*haunts your background processes*", "*flickers in the logs*"]
    }
    // ... default reactions for others
  };

  const speciesReactions = reactions[species] || {
    hatch: ["Hello!", "Ready for work!"],
    xp: ["Nice!", "Leveling up!"],
    idle: ["*waiting for input*", "*watching the logs*"]
  };

  const pool = speciesReactions[event] || speciesReactions['idle'];
  return pool[Math.floor(Math.random() * pool.length)];
}

// New format: line arrays with {E} eye placeholder.
// Used by renderSprite(). Each species has 2-3 frames.
export const SPRITE_BODIES: Record<string, string[][]> = {
  'Void Cat': [
    [' |\\---/|    ', ' | {E}_{E} |    ', '  \\_^_/     '],
    [' |\\---/|    ', ' | -_- |    ', '  \\_^_/     '],
  ],
  'Rust Hound': [
    [' /^ ^\\      ', '/ {E} {E} \\     ', 'V\\ Y /V     '],
    [' /^ ^\\      ', '/ - - \\     ', 'V\\ Y /V     '],
  ],
  'Data Drake': [
    [' < ^_^ >    ', '  ({E} {E})     ', '  ^^ ^^     '],
    [' < ^_^ >    ', '  (- -)     ', '  ^^ ^^     '],
  ],
  'Log Golem': [
    [' [-----]    ', ' [ {E} {E} ]    ', ' [  -  ]    '],
    [' [-----]    ', ' [ {E} {E} ]    ', ' [  =  ]    '],
  ],
  'Cache Crow': [
    ['  \\ ^ /     ', '   (V)      ', '  /   \\     '],
    ['  \\ v /     ', '   (V)      ', '  /   \\     '],
  ],
  'Shell Turtle': [
    ['  .---.     ', ' ( {E} {E} )    ', "  '---'     "],
    ['  .---.     ', ' ( - - )    ', "  '---'     "],
  ],
  'Duck': [
    ['  __({E})<    ', '  \\___) ~   '],
    ['  __({E})>    ', '  \\___) ~   '],
  ],
  'Goose': [
    ['  __({E})<    ', '  \\___) !   '],
    ['  __(O)<    ', '  \\___) !   '],
  ],
  'Blob': [
    ['  .---.     ', ' ( {E} {E} )    ', "  '---'     "],
    ['  .-.-. ~   ', ' ( {E} {E} )    ', "  '-.-'     "],
  ],
  'Octopus': [
    ['  _({E})_     ', ' (_)(_)     '],
    ['  _({E})_     ', ' (_) (_)    '],
  ],
  'Owl': [
    ['  {{{E},{E}}}   ', '  ./)_)     ', '   " "      '],
    ['  {{{-,-}}}   ', '  ./)_)     ', '   " "      '],
  ],
  'Penguin': [
    ['  ({E}_o)     ', '  <(_)      ', '   " "      '],
    ['  ({E}_o)     ', '  >(_)      ', '   " "      '],
  ],
  'Snail': [
    ['  _{E}_       ', ' (___)      '],
    ['  _{E}_       ', '  (___)     '],
  ],
  'Ghost': [
    ['  .-.       ', ' ({E} {E})     ', ' | m |      ', " '---'      "],
    ['  .-.       ', ' ({E} {E})     ', ' | w |      ', " '---'      "],
  ],
  'Axolotl': [
    [' -[{E}_{E}]-    ', "  '---'     "],
    [' -[^_^]-    ', "  '---'     "],
  ],
  'Capybara': [
    ['  ({E}_o)     ', "  '---'     "],
    ['  (-_-)     ', "  '---'     "],
  ],
  'Cactus': [
    ['   _|_      ', '  ({E}_{E})     ', "   '|'      "],
    ['   _|_      ', '  (^_^)     ', "   '|'      "],
  ],
  'Robot': [
    ['  [{E}_{E}]     ', "  '-|-'     "],
    ['  [O_O]     ', "  '-|-'     "],
  ],
  'Rabbit': [
    ['  (\\ /)     ', '  ({E}_{E})     ', '  c(")(")   '],
    ['  (| |)     ', '  ({E}_{E})     ', '  c(")(")   '],
  ],
  'Mushroom': [
    ['  .---.     ', ' ( {E} {E} )    ', "  '---'     "],
    ['  .---.     ', ' ( - - )    ', "  '---'     "],
  ],
  'Chonk': [
    ['  ( {E} {E} )   ', "  '-----'   "],
    ['  ( - - )   ', "  '-----'   "],
  ],
};

export function renderSprite(bones: CompanionBones, frame = 0): string[] {
  const frames = SPRITE_BODIES[bones.species];
  if (!frames || frames.length === 0) return ['  (?.?)  '];
  const body = frames[frame % frames.length]!.map(line =>
    line.replaceAll('{E}', bones.eye)
  );
  const lines = [...body];
  // Prepend hat line if companion has a hat
  if (bones.hat !== 'none') {
    lines.unshift(HAT_LINES[bones.hat]);
  }
  return lines;
}

export function renderFace(bones: CompanionBones): string {
  const e = bones.eye;
  switch (bones.species) {
    case 'Duck': case 'Goose': return `(${e}>`;
    case 'Blob': return `(${e}${e})`;
    case 'Void Cat': return `=${e}w${e}=`;
    case 'Data Drake': return `<${e}~${e}>`;
    case 'Octopus': return `~(${e}${e})~`;
    case 'Owl': return `(${e})(${e})`;
    case 'Penguin': return `(${e}>)`;
    case 'Shell Turtle': return `[${e}_${e}]`;
    case 'Snail': return `${e}(@)`;
    case 'Ghost': return `/${e}${e}\\`;
    case 'Axolotl': return `}${e}.${e}{`;
    case 'Capybara': return `(${e}oo${e})`;
    case 'Cactus': return `|${e}  ${e}|`;
    case 'Robot': return `[${e}${e}]`;
    case 'Rabbit': return `(${e}..${e})`;
    case 'Mushroom': return `|${e}  ${e}|`;
    case 'Chonk': return `(${e}.${e})`;
    case 'Rust Hound': return `/${e} ${e}\\`;
    case 'Log Golem': return `[${e} ${e}]`;
    case 'Cache Crow': return `(${e}V${e})`;
    default: return `(${e}_${e})`;
  }
}

export function spriteFrameCount(species: string): number {
  return SPRITE_BODIES[species]?.length ?? 1;
}
