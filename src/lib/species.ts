export const SPECIES = {
  VOID_CAT: 'Void Cat',
  RUST_HOUND: 'Rust Hound',
  DATA_DRAKE: 'Data Drake',
  LOG_GOLEM: 'Log Golem',
  CACHE_CROW: 'Cache Crow',
  SHELL_TURTLE: 'Shell Turtle'
};

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
    hatchling: `
    |\\---/|
    | o_o |
     \\_^_/
    `,
    adult: `
    |\\      /|
    | \\____/ |
    |  o  o  |
    |   ^^   |
     \\______/
    `
  },
  [SPECIES.RUST_HOUND]: {
    egg: EGG_ART,
    hatchling: `
    /^ ^\\
   / 0 0 \\
   V\\ Y /V
    `,
    adult: `
     / \\__   / \\
    (   @ \\_/ @ )
     \\__  Y  __/
        \\ | /
         \\|/
    `
  },
  [SPECIES.DATA_DRAKE]: {
    egg: EGG_ART,
    hatchling: `
    < ^_^ >
     (0 0)
     ^^ ^^
    `,
    adult: `
       /\\___/\\
      (  o o  )
      (  =v=  )
      /|     |\\
     / |     | \\
    `
  },
  [SPECIES.LOG_GOLEM]: {
    egg: EGG_ART,
    hatchling: `
    [-----]
    [ o o ]
    [  -  ]
    `,
    adult: `
     _______
    |       |
    | [o] [o]|
    |   _   |
    |_______|
     |     |
    `
  },
  [SPECIES.CACHE_CROW]: {
    egg: EGG_ART,
    hatchling: `
     \\ ^ /
      (V)
     /   \\
    `,
    adult: `
      ___
     (o o)
    /| V |\\
   / |   | \\
     ^^ ^^
    `
  },
  [SPECIES.SHELL_TURTLE]: {
    egg: EGG_ART,
    hatchling: `
     .---.
    ( o o )
     '---'
    `,
    adult: `
       _____
      /     \\
     /       \\
    (  o   o  )
     \\_______/
      | | | |
    `
  }
};

export type Mood = 'happy' | 'content' | 'neutral' | 'curious' | 'grumpy' | 'exhausted';

export function calculateMood(xpEvents: any[], recentInteractions: number): Mood {
  // Logic: XP burst = happy/curious, No interactions = grumpy, High interactions = content
  if (recentInteractions > 10) return 'content';
  if (recentInteractions > 5) return 'happy';
  if (xpEvents.length > 3) return 'curious';
  if (recentInteractions === 0) return 'grumpy';
  return 'neutral';
}

export function getStatusCard(companion: any): string {
  const { name, species, level, xp, mood } = companion;
  const art = SPECIES_ART[species] || { egg: '', hatchling: '', adult: '' };
  const stage = level >= 10 ? 'adult' : 'hatchling';
  const ascii = art[stage];

  return `
+---------------------------------------+
| BUDDY STATUS CARD                     |
+---------------------------------------+
| Name:    ${name.padEnd(28)} |
| Species: ${species.padEnd(28)} |
| Level:   ${level.toString().padEnd(28)} |
| XP:      ${xp.toString().padEnd(28)} |
| Mood:    ${mood.padEnd(28)} |
+---------------------------------------+
${ascii}
+---------------------------------------+
  `;
}


export function generatePersonality(species: string) {
  // Stats: Focus, Curiosity, Loyalty, Energy
  // Based on XP weights from PRD (conceptual)
  const baseStats = {
    focus: 10,
    curiosity: 10,
    loyalty: 10,
    energy: 10
  };

  switch (species) {
    case SPECIES.VOID_CAT:
      baseStats.curiosity += 5;
      baseStats.focus -= 2;
      break;
    case SPECIES.RUST_HOUND:
      baseStats.loyalty += 5;
      baseStats.energy += 3;
      break;
    case SPECIES.DATA_DRAKE:
      baseStats.focus += 5;
      baseStats.curiosity += 2;
      break;
    case SPECIES.LOG_GOLEM:
      baseStats.focus += 8;
      baseStats.energy -= 4;
      break;
    case SPECIES.CACHE_CROW:
      baseStats.energy += 5;
      baseStats.loyalty -= 2;
      break;
    case SPECIES.SHELL_TURTLE:
      baseStats.loyalty += 8;
      baseStats.energy -= 5;
      break;
  }

  return baseStats;
}

export function generateName(species: string): string {
  const prefixes = ['Bit', 'Hex', 'Zip', 'Log', 'Null', 'Void', 'Rust', 'Data'];
  const suffixes = ['y', 'o', 'it', 'ox', 'us', 'ix', 'en', 'ly'];
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  
  return prefix + suffix;
}
