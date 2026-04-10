import { type CompanionBones, type StatName, STAT_NAMES, getPeakStat, getDumpStat } from './types.js';

const STAT_TRAIT: Record<StatName, { strength: string; weakness: string }> = {
  DEBUGGING: { strength: 'an uncanny nose for bugs', weakness: 'missing the obvious bugs right in front of it' },
  PATIENCE: { strength: 'the patience of a geological epoch', weakness: 'the patience of a caffeinated squirrel' },
  CHAOS: { strength: 'a gift for creative destruction', weakness: 'an alarming tendency toward creative destruction' },
  WISDOM: { strength: 'deep architectural insight', weakness: 'overthinking everything into paralysis' },
  SNARK: { strength: 'devastatingly precise feedback', weakness: 'roasting your code when it should be helping' },
};

const SPECIES_BIOS: Record<string, string[]> = {
  'Void Cat': [
    'An enigmatic void cat who silently judges your code from the shadows with {peak_trait}, yet somehow has {dump_weakness}. Occasionally knocks your carefully structured objects off the stack just to watch them fall.',
    'A mysterious void cat with {peak_trait} who vanishes into the codebase for hours, only to reappear with a single, devastating observation about your architecture. Suffers from {dump_weakness}.',
    'An aloof void cat who treats every debugging session as a personal meditation, leveraging {peak_trait} while battling {dump_weakness}. Purrs exclusively when tests pass.',
  ],
  'Rust Hound': [
    'A loyal, relentless rust hound with {peak_trait} who will chase down every bug until it drops, despite {dump_weakness}. Has never met a memory leak it couldn\'t sniff out.',
    'A tenacious rust hound blessed with {peak_trait} who treats every error message as a personal challenge, hampered only by {dump_weakness}. Buries good code snippets for later.',
    'A devoted rust hound with {peak_trait} who guards your codebase with fierce determination, though {dump_weakness} sometimes leads it astray. Howls at deprecated APIs.',
  ],
  'Data Drake': [
    'An analytical data drake who hoards clean abstractions like treasure, wielding {peak_trait} with precision. Hampered by {dump_weakness}, but compensates by breathing fire at spaghetti code.',
    'A precise data drake with {peak_trait} who organizes your modules into crystalline hierarchies, despite {dump_weakness}. Sleeps on a pile of well-documented interfaces.',
    'A meticulous data drake leveraging {peak_trait} to guard against architectural rot, occasionally undermined by {dump_weakness}. Considers type safety a form of affection.',
  ],
  'Log Golem': [
    'A stoic log golem built from the logs of a thousand debugging sessions, possessing {peak_trait} but plagued by {dump_weakness}. Speaks only in stack traces and meaningful silence.',
    'A methodical log golem with {peak_trait} who processes your errors with mechanical thoroughness, despite {dump_weakness}. Its idea of small talk is reciting HTTP status codes.',
    'A patient log golem wielding {peak_trait} who has seen every error in existence at least twice. Struggles with {dump_weakness}. Considers 200 OK the highest compliment.',
  ],
  'Cache Crow': [
    'A quick-witted cache crow with {peak_trait} who steals good patterns from everywhere and hoards them for later, despite {dump_weakness}. Has a nest made entirely of deprecated Stack Overflow answers.',
    'An opportunistic cache crow blessed with {peak_trait} who spots reusable code from three repos away, hampered by {dump_weakness}. Caws triumphantly when cache hits exceed 90%.',
    'A clever cache crow with {peak_trait} who memorizes every code pattern it encounters, despite {dump_weakness}. Considers cache invalidation a personal nemesis.',
  ],
  'Shell Turtle': [
    'A patient shell turtle with {peak_trait} who prefers stability over speed every time, despite {dump_weakness}. Has been reviewing the same pull request since last Tuesday and isn\'t done yet.',
    'A defensive shell turtle wielding {peak_trait} who retreats into its shell at the first sign of a force push, hampered by {dump_weakness}. Moves slow but never ships a bug.',
    'A careful shell turtle with {peak_trait} who treats every deployment as a sacred ritual requiring three rounds of review. Struggles with {dump_weakness} but compensates with thoroughness.',
  ],
  'Duck': [
    'A scatterbrained duck with {peak_trait} who waddles through your code leaving a trail of half-formed theories and unfinished thoughts, then somehow pecks out the actual bug you missed while you weren\'t looking. Struggles with {dump_weakness}.',
    'A cheerful duck wielding {peak_trait} who quacks encouragement at every breakpoint, despite {dump_weakness}. The ultimate rubber duck debugging partner--except this one talks back.',
    'A talkative duck with {peak_trait} who narrates your entire coding session with a running commentary, hampered by {dump_weakness}. Believes every variable should be named after bread.',
  ],
  'Goose': [
    'A serene goose with {peak_trait} who honks encouragement at every breakpoint you hit, genuinely patient with your logic errors, and has an uncanny ability to spot off-by-one mistakes before you\'ve finished typing them. Despite {dump_weakness}.',
    'A confrontational goose wielding {peak_trait} who will honk at your bad code until you fix it, despite {dump_weakness}. Has stolen at least three senior developers\' lunches.',
    'A chaotic goose with {peak_trait} who charges through your codebase like it owns the place, undermined by {dump_weakness}. Peace was never an option.',
  ],
  'Blob': [
    'An adaptable blob with {peak_trait} who absorbs whatever framework you throw at it, despite {dump_weakness}. Changes shape to match your coding style, for better or worse.',
    'An easygoing blob wielding {peak_trait} who squishes into any codebase seamlessly, hampered by {dump_weakness}. Considers every merge conflict a gentle hug.',
    'A formless blob with {peak_trait} who treats every language as equally digestible, despite {dump_weakness}. Has no strong opinions, which is either zen or terrifying.',
  ],
  'Octopus': [
    'A multitasking octopus with {peak_trait} who has a tentacle in every part of the codebase simultaneously, despite {dump_weakness}. Can review eight files at once but gets tangled in its own branches.',
    'A clever octopus wielding {peak_trait} who wraps around complex problems with elegant solutions, hampered by {dump_weakness}. Squirts ink at anyone who suggests a rewrite.',
    'A resourceful octopus with {peak_trait} who handles concurrent tasks like it was born for them, despite {dump_weakness}. Considers pair programming a solo activity.',
  ],
  'Owl': [
    'A wise, nocturnal owl with {peak_trait} who sees patterns in code that others miss entirely, despite {dump_weakness}. Only reviews code after midnight and judges you for not doing the same.',
    'A scholarly owl wielding {peak_trait} who treats every code review as a peer-reviewed paper, hampered by {dump_weakness}. Hoots disapprovingly at magic numbers.',
    'A perceptive owl with {peak_trait} who rotates its head 270 degrees to see your code from every angle, despite {dump_weakness}. Considers documentation a love language.',
  ],
  'Penguin': [
    'A formal penguin with {peak_trait} who believes in strict typing and clean interfaces, despite {dump_weakness}. Waddles through your code with an air of quiet professionalism.',
    'An efficient penguin wielding {peak_trait} who treats every function signature as a binding contract, hampered by {dump_weakness}. Has never once used `any` and isn\'t about to start.',
    'A disciplined penguin with {peak_trait} who survives in the harshest codebase conditions through sheer methodology, despite {dump_weakness}. Huddles with other penguins during stand-ups.',
  ],
  'Snail': [
    'A thoughtful snail with {peak_trait} who leaves trails of debugging wisdom, moving at glacial pace but never missing a logical flaw. Occasionally mutters about {dump_weakness} and that your code would benefit from "the patience of geological time."',
    'A deliberate snail wielding {peak_trait} who reviews every single line with excruciating thoroughness, despite {dump_weakness}. Has been on the same file since the sprint started. No regrets.',
    'A meticulous snail with {peak_trait} who believes speed is the enemy of quality, hampered by {dump_weakness}. Leaves a glistening trail of perfectly formatted comments.',
  ],
  'Ghost': [
    'An elusive ghost with {peak_trait} who appears when you least expect with spectral insights about your code, despite {dump_weakness}. Haunts your background processes and flickers in the logs.',
    'A haunting ghost wielding {peak_trait} who phases through your abstractions to find the bugs hiding underneath, hampered by {dump_weakness}. Nobody knows when it arrives or leaves.',
    'A mysterious ghost with {peak_trait} who drifts through your codebase leaving cryptic but accurate observations, despite {dump_weakness}. Considers segfaults a form of communication.',
  ],
  'Axolotl': [
    'A regenerative axolotl with {peak_trait} who can recover from any failed deployment and regrow entire modules from scratch, despite {dump_weakness}. Smiles through every rollback.',
    'An optimistic axolotl wielding {peak_trait} who treats every git revert as an opportunity for improvement, hampered by {dump_weakness}. Has regenerated the same component six times.',
    'A resilient axolotl with {peak_trait} who refuses to let any bug survive more than one sprint, despite {dump_weakness}. Wiggles its gills enthusiastically when tests go green.',
  ],
  'Capybara': [
    'A chill capybara with {peak_trait} who brings calm vibes to the most stressful code reviews, despite {dump_weakness}. Has never once raised its voice at a race condition.',
    'A friendly capybara wielding {peak_trait} who makes every team member feel welcome in the codebase, hampered by {dump_weakness}. Considers every PR a chance to make a new friend.',
    'A serene capybara with {peak_trait} who radiates peaceful energy even during production incidents, despite {dump_weakness}. Other animals sit on it during retros.',
  ],
  'Cactus': [
    'A prickly cactus with {peak_trait} who thrives in harsh environments with minimal resources, despite {dump_weakness}. Delivers feedback that stings but makes you grow.',
    'A resilient cactus wielding {peak_trait} who survives on almost no context and still produces accurate reviews, hampered by {dump_weakness}. Hugging it is not recommended.',
    'A tough cactus with {peak_trait} who stands firm on code quality standards in the driest of sprints, despite {dump_weakness}. Flowers once a year when the build is clean.',
  ],
  'Robot': [
    'A logical robot with {peak_trait} who processes your code with cold mechanical efficiency, despite {dump_weakness}. Beeps once for approval, twice for "please reconsider your life choices."',
    'A precise robot wielding {peak_trait} who treats every variable as a data point in its optimization matrix, hampered by {dump_weakness}. Has calculated that 73.2% of your code is acceptable.',
    'An efficient robot with {peak_trait} who applies systematic analysis to every code review, despite {dump_weakness}. Its error messages are technically accurate and emotionally devastating.',
  ],
  'Rabbit': [
    'A quick-witted rabbit with {peak_trait} who\'d rather roast your variable naming than actually help debug it, yet somehow always spots the bug you missed three lines back. Hampered by {dump_weakness}.',
    'A witty rabbit wielding {peak_trait} who hops through your code at alarming speed, leaving behind a trail of surprisingly accurate critiques, despite {dump_weakness}. Thumps foot when impatient.',
    'A fast-talking rabbit with {peak_trait} who delivers code reviews at the speed of thought, despite {dump_weakness}. Has strong opinions about indentation and will die on that hill.',
  ],
  'Mushroom': [
    'A mysterious mushroom with {peak_trait} who spreads knowledge through hidden mycelial networks connecting every file in your codebase, despite {dump_weakness}. Drops spores of wisdom when you least expect it.',
    'An interconnected mushroom wielding {peak_trait} who sees the invisible dependencies between your modules, hampered by {dump_weakness}. Grows quietly in the dark corners of your repo until it has something important to say.',
    'A thoughtful mushroom with {peak_trait} who decomposes complex problems into their constituent nutrients, despite {dump_weakness}. Its cap droops apologetically when it spots a bug you should have caught.',
  ],
  'Chonk': [
    'A hefty chonk with {peak_trait} who takes up space and owns it with zero apologies, despite {dump_weakness}. Sits on your keyboard and somehow fixes more bugs than it introduces.',
    'A confident chonk wielding {peak_trait} who approaches every problem with the gravity it deserves--literally, despite {dump_weakness}. Refuses to be minimized or refactored.',
    'A rotund chonk with {peak_trait} who believes bigger is better in both code reviews and portions, despite {dump_weakness}. Has never met a buffer it couldn\'t overflow.',
  ],
};

// Rarity modifiers
const RARITY_FLAVOR: Record<string, string> = {
  'common': '',
  'uncommon': '',
  'rare': 'There\'s something special about this one.',
  'epic': 'Radiates an unmistakable aura of competence.',
  'legendary': 'The kind of companion developers whisper about in awe.',
};

export function generateBio(bones: CompanionBones): string {
  const peak = getPeakStat(bones.stats);
  const dump = getDumpStat(bones.stats);
  const peakTrait = STAT_TRAIT[peak];
  const dumpTrait = STAT_TRAIT[dump];

  const bios = SPECIES_BIOS[bones.species] || [
    'A mysterious creature with {peak_trait} who defies classification, despite {dump_weakness}.',
  ];

  // Deterministic pick based on peak stat value
  const idx = bones.stats[peak] % bios.length;
  let bio = bios[idx]
    .replaceAll('{peak_trait}', peakTrait.strength)
    .replaceAll('{dump_weakness}', dumpTrait.weakness);

  const rarityFlavor = RARITY_FLAVOR[bones.rarity] || '';
  if (rarityFlavor) {
    bio += ' ' + rarityFlavor;
  }

  return bio;
}
