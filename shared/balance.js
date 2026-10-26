/**
 * Every tunable number in the game. Rules live in logic.js; this file is only data,
 * so balancing never means touching code.
 *
 * Shared by client (display) and server (authority): both always agree on costs and
 * multipliers because they read the same table.
 */

// --- Training ---------------------------------------------------------------------

/** Seconds between auto-throws while standing in a lane. */
export const TRAIN_INTERVAL = 0.6
/**
 * Click throws: anywhere in the lobby outside the throw area, each click throws the
 * spear from your hand for a x1 training throw. This is the fastest they count, in
 * seconds (about six a second).
 */
export const CLICK_INTERVAL = 0.16
/** Training throws per level. */
export const LEVEL_STEPS = 10
/** Each level adds this fraction to the spear's base power: gain x (1 + level x k). */
export const LEVEL_GAIN = 0.15

/**
 * Training lanes, west to east order matches world.js lane indices.
 * `rebirths` = rebirths needed; `product` = the SHOP item that unlocks it instead.
 */
export const LANES = [
  { id: 'target', name: 'Target', mult: 1, rebirths: 0 },
  { id: 'ring', name: 'Green Ring', mult: 2, rebirths: 1 },
  { id: 'star', name: 'Blue Star', mult: 3, rebirths: 3 },
  { id: 'diamond', name: 'Purple Diamond', mult: 5, rebirths: 6 },
  { id: 'wheel', name: 'Gold Wheel', mult: 8, rebirths: 9 },
  { id: 'hex', name: 'Lava Hex', mult: 12, rebirths: 12 },
  { id: 'crystal', name: 'Red Crystal', mult: 18, rebirths: 15 },
  { id: 'rainbow', name: 'Rainbow Ring', mult: 30, product: 'laneVeryOp', tag: 'VERY OP!' },
  { id: 'galaxy', name: 'Galaxy Portal', mult: 100, product: 'laneBestOverall', tag: 'BEST OVERALL!' },
]

// --- Rebirth ----------------------------------------------------------------------

/** Max level by rebirth count: R0 = 2, R1 = 15, R2 = 25, then +10 per rebirth. */
export function levelCap(rebirths) {
  if (rebirths <= 0) return 2
  if (rebirths === 1) return 15
  return 25 + (rebirths - 2) * 10
}

/** Power multiplier from rebirths: R0 = x1, R1 = x2, R2 = x3 ... */
export const rebirthMultiplier = (rebirths) => rebirths + 1

// --- Spears -----------------------------------------------------------------------

/**
 * The spears you throw. `power` is base power per training throw; `cost` is in Wins.
 *
 * The table (and the profile's `equippedPlane` / `ownedPlanes`) keep the original
 * plane ids, so saves from before the switch to spears still load. Each spear's look
 * lives in client/src/game/spear.js, keyed by the same ids.
 */
export const PLANES = [
  { id: 'paper', name: 'Wooden Spear', power: 1, cost: 0 },
  { id: 'sky', name: 'Flint Spear', power: 2, cost: 3 },
  { id: 'newspaper', name: 'Harpoon Spear', power: 5, cost: 28 },
  { id: 'cardboard', name: 'Bronze Spear', power: 11, cost: 110 },
  { id: 'racer', name: 'Copper Spear', power: 21, cost: 280 },
  { id: 'ocean', name: 'Iron Pike', power: 46, cost: 840 },
  { id: 'jungle', name: 'Twinfang Iron Spear', power: 98, cost: 2100 },
  { id: 'royal', name: 'Steel Spear', power: 210, cost: 5600 },
  { id: 'crystal', name: 'Winged Steel Spear', power: 490, cost: 14000 },
  { id: 'golden', name: 'Bone Fang Spear', power: 1100, cost: 35000 },
  // The second stage: same curve, each about 2.5x the Wins for 2.2x the power.
  { id: 'candy', name: 'Bone Hunter Spear', power: 2400, cost: 90000 },
  { id: 'ice', name: 'Ribcage Spear', power: 5300, cost: 225000 },
  { id: 'lava', name: 'Magma Spear', power: 11500, cost: 560000 },
  { id: 'thunder', name: 'Thunder Pike', power: 25000, cost: 1400000 },
  { id: 'neon', name: 'Frost Spear', power: 55000, cost: 3500000 },
  { id: 'galaxy', name: 'Galaxy Spear', power: 120000, cost: 8800000 },
  { id: 'dragon', name: 'Dragon Trident', power: 260000, cost: 22000000 },
  { id: 'rainbow', name: 'Rainbow Spear', power: 570000, cost: 55000000 },
  { id: 'diamond', name: 'Diamond Spear', power: 1250000, cost: 140000000 },
  { id: 'cosmic', name: 'Cosmic Trident', power: 2750000, cost: 350000000 },
]

// --- Throwing ---------------------------------------------------------------------

/** distance (m) = base + k * sqrt(power). Tuned so 7.3K power flies ~460 m. */
export const DISTANCE_BASE = 10
export const DISTANCE_K = 5.27

/**
 * Themed track segments, as in the reference: the river meadow by the lobby, then the
 * farm, the jungle and the desert, and on into snow, volcano and space. `start` in
 * metres; later zones pay more Wins per metre.
 */
export const ZONES = [
  { id: 'river', name: 'River', start: 0, winsPerMeter: 0.3 },
  { id: 'farm', name: 'Farm', start: 150, winsPerMeter: 0.5 },
  { id: 'jungle', name: 'Jungle', start: 450, winsPerMeter: 0.8 },
  { id: 'desert', name: 'Desert', start: 900, winsPerMeter: 1.2 },
  { id: 'snow', name: 'Snow', start: 1500, winsPerMeter: 1.8 },
  { id: 'volcano', name: 'Volcano', start: 2400, winsPerMeter: 2.6 },
  { id: 'space', name: 'Space', start: 3600, winsPerMeter: 4 },
]

/** Trophy pickups along the track: first at 15 m, then every 30 m. */
export const TROPHY_FIRST = 15
export const TROPHY_SPACING = 30
/** A trophy is worth this many metres of its zone's Wins. */
export const TROPHY_METERS = 10

/**
 * The throw power meter: pressing THROW starts a bar sweeping up and down, and a second
 * press picks how hard to throw. Seconds for one sweep from empty to full.
 */
export const AIM_SWEEP = 0.9

/**
 * Throw grades by meter reading (0-1), weakest first. `mult` is how much of your full
 * throw distance you get. A perfect throw is your full throw and never more, so a
 * client that misreports the meter can't out-throw an honest perfect one.
 */
export const THROW_GRADES = [
  { id: 'weak', min: 0, label: 'Weak Throw', mult: 0.5 },
  { id: 'good', min: 0.35, label: 'Good Throw!', mult: 0.7 },
  { id: 'great', min: 0.65, label: 'Great Throw!', mult: 0.85 },
  { id: 'excellent', min: 0.85, label: 'Excellent Throw!', mult: 0.95 },
  { id: 'perfect', min: 0.95, label: 'PERFECT THROW!', mult: 1 },
]

/** Seconds a throw of `distance` metres takes to watch. Logarithmic: long throws stay short. */
export const flightDuration = (distance) => 2.6 + 1.5 * Math.log(1 + distance / 40)
/** Landing + result popup after the flight, before the next throw is allowed. */
export const THROW_RECOVERY = 1.2

// --- Pets & eggs ------------------------------------------------------------------

export const RARITIES = {
  common: { name: 'Common', color: '#b9c3cf', order: 0 },
  uncommon: { name: 'Uncommon', color: '#4ade80', order: 1 },
  rare: { name: 'Rare', color: '#38bdf8', order: 2 },
  epic: { name: 'Epic', color: '#b15cff', order: 3 },
  legendary: { name: 'Legendary', color: '#ffc41f', order: 4 },
  mythic: { name: 'Mythic', color: '#ff3b6b', order: 5 },
  secret: { name: 'Secret', color: '#ff5bd8', order: 6 },
}

/** `mult` multiplies training power. Equipped pets stack additively (see logic.js). */
export const PETS = {
  // Basic Egg
  cat: { name: 'Cat', rarity: 'common', mult: 1.2 },
  dog: { name: 'Dog', rarity: 'common', mult: 1.3 },
  piggy: { name: 'Piggy', rarity: 'uncommon', mult: 1.5 },
  bear: { name: 'Bear', rarity: 'rare', mult: 2 },
  // Forest Egg
  fox: { name: 'Fox', rarity: 'uncommon', mult: 2.5 },
  deer: { name: 'Deer', rarity: 'rare', mult: 3 },
  owl: { name: 'Owl', rarity: 'epic', mult: 4 },
  wolf: { name: 'Wolf', rarity: 'legendary', mult: 6 },
  // Jungle Egg
  monkey: { name: 'Monkey', rarity: 'uncommon', mult: 8 },
  toucan: { name: 'Toucan', rarity: 'rare', mult: 10 },
  frog: { name: 'Frog', rarity: 'epic', mult: 14 },
  tiger: { name: 'Tiger', rarity: 'legendary', mult: 25 },
  // Cactus Egg
  scorpion: { name: 'Scorpion', rarity: 'rare', mult: 15 },
  camel: { name: 'Camel', rarity: 'epic', mult: 20 },
  cobra: { name: 'Cobra', rarity: 'epic', mult: 30 },
  fennec: { name: 'Fennec Fox', rarity: 'legendary', mult: 45 },
  // Shadow Egg
  bat: { name: 'Shadow Bat', rarity: 'rare', mult: 30 },
  shadowWolf: { name: 'Shadow Wolf', rarity: 'epic', mult: 50 },
  demon: { name: 'Demon', rarity: 'legendary', mult: 80 },
  shadowDragon: { name: 'Shadow Dragon', rarity: 'mythic', mult: 120 },
  // Rewards and the shop
  duck: { name: 'Duck', rarity: 'epic', mult: 6 },
  crab: { name: 'Lucky Crab', rarity: 'uncommon', mult: 1.5 },
  kingDoggy: { name: 'King Doggy', rarity: 'secret', mult: 150 },
}

/**
 * Eggs, bought with Wins. `pets` are [petId, weight] - weights are percentages and
 * sum to 100. The ids are the original egg ids (saves and items refer to them); the
 * names are what players see, as in the reference: Basic, Forest, Jungle, Cactus and
 * the big Shadow Egg.
 */
export const EGGS = {
  basic: { name: 'Basic', cost: { wins: 25 }, pets: [['cat', 45], ['dog', 30], ['piggy', 20], ['bear', 5]] },
  meadow: { name: 'Forest', cost: { wins: 500 }, pets: [['fox', 45], ['deer', 30], ['owl', 20], ['wolf', 5]] },
  sunset: { name: 'Jungle', cost: { wins: 7500 }, pets: [['monkey', 45], ['toucan', 30], ['frog', 20], ['tiger', 5]] },
  unicorn: { name: 'Cactus', cost: { wins: 50000 }, pets: [['scorpion', 45], ['camel', 30], ['cobra', 20], ['fennec', 5]] },
  demon: { name: 'Shadow', cost: { wins: 150000 }, pets: [['bat', 50], ['shadowWolf', 30], ['demon', 15], ['shadowDragon', 5]] },
}

export const MAX_EQUIPPED_PETS = 3
export const MAX_PET_INVENTORY = 60
/** Multi-hatch opens this many at once, for that many times the cost. */
export const MULTI_HATCH = 3

// --- Items, boosts, rewards -------------------------------------------------------

export const POTION_DURATION_MS = 5 * 60 * 1000

export const ITEMS = {
  potionPower: { name: 'x2 Power Potion', kind: 'potion', boost: 'power', durationMs: POTION_DURATION_MS },
  potionWins: { name: 'x2 Wins Potion', kind: 'potion', boost: 'wins', durationMs: POTION_DURATION_MS },
  eggMeadow: { name: 'Forest Egg', kind: 'egg', egg: 'meadow' },
  eggSunset: { name: 'Jungle Egg', kind: 'egg', egg: 'sunset' },
  eggUnicorn: { name: 'Cactus Egg', kind: 'egg', egg: 'unicorn' },
  eggDemon: { name: 'Shadow Egg', kind: 'egg', egg: 'demon' },
}


/** 7-day cycle; day N unlocks N x 24h after the cycle started. */
export const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000
export const DAILY_REWARDS = [
  { label: 'x2 Wins', icon: 'potionWins', sub: '5m', grant: { item: 'potionWins' } },
  { label: '+1.4K Wins', icon: 'trophy', sub: 'OP!', grant: { wins: 1400 } },
  { label: 'x2 Power', icon: 'potionPower', sub: '5m', grant: { item: 'potionPower' } },
  { label: 'Jungle Egg', icon: 'egg:sunset', sub: 'x1', grant: { item: 'eggSunset' } },
  { label: 'x2 Wins', icon: 'potionWins', sub: '5m', grant: { item: 'potionWins' } },
  { label: '+3.5K Wins', icon: 'trophy', sub: 'OP!', grant: { wins: 3500 } },
  { label: 'Duck', icon: 'pet:duck', sub: 'x1', grant: { pet: 'duck' } },
]

/** Claimable once each per session, after this many minutes played. */
export const PLAYTIME_REWARDS = [
  { minutes: 5, label: '+50 Wins', icon: 'trophy', grant: { wins: 50 } },
  { minutes: 10, label: 'x2 Power', icon: 'potionPower', grant: { item: 'potionPower' } },
  { minutes: 15, label: 'Forest Egg', icon: 'egg:meadow', grant: { item: 'eggMeadow' } },
  { minutes: 30, label: 'x2 Wins', icon: 'potionWins', grant: { item: 'potionWins' } },
  { minutes: 45, label: '+1K Wins', icon: 'trophy', grant: { wins: 1000 } },
  { minutes: 60, label: 'Jungle Egg', icon: 'egg:sunset', grant: { item: 'eggSunset' } },
]

/** The stand by spawn: a pet the first time, a potion on later sessions. */
export const FREE_REWARD = { firstTime: { pet: 'crab' }, repeat: { item: 'potionPower' } }

/** Offline training: a quarter of your lane's rate, for up to 8 hours away. */
export const OFFLINE_RATE = 0.25
export const OFFLINE_MAX_MS = 8 * 60 * 60 * 1000
export const OFFLINE_MIN_MS = 60 * 1000

/** Power needed to step through the World 2 portal. */
export const WORLD2_POWER = 2.5e6

// --- Worlds -----------------------------------------------------------------------

/**
 * World 3, Halloween: the same lobby by moonlight, and its own throw track whose stages
 * pay three times World 1's Wins per metre. Starts and lengths match World 1's.
 */
export const HALLOWEEN_ZONES = [
  { id: 'pumpkin', name: 'Pumpkin Patch', start: 0, winsPerMeter: 0.9 },
  { id: 'graveyard', name: 'Graveyard', start: 150, winsPerMeter: 1.5 },
  { id: 'haunted', name: 'Haunted Forest', start: 450, winsPerMeter: 2.4 },
  { id: 'swamp', name: 'Witch Swamp', start: 900, winsPerMeter: 3.6 },
  { id: 'bones', name: 'Bone Valley', start: 1500, winsPerMeter: 5.4 },
  { id: 'vampire', name: 'Vampire Castle', start: 2400, winsPerMeter: 7.8 },
  { id: 'spirit', name: 'Spirit Realm', start: 3600, winsPerMeter: 12 },
]

/** Power needed to open the World 3 portal. Once open it stays open, rebirths or not. */
export const WORLD3_POWER = 10e6

/**
 * The worlds you can be in, by number. World 2 is still to come: its portal only
 * awards a badge. `power` is what opening a world the first time takes.
 */
export const WORLDS = {
  1: { id: 1, name: 'World 1', zones: ZONES, power: 0 },
  3: { id: 3, name: 'Halloween World', zones: HALLOWEEN_ZONES, power: WORLD3_POWER },
}

// --- Premium ----------------------------------------------------------------------

/**
 * The shop. Wins are the game's only currency: everything here, like spears and
 * eggs, is bought with them. `pass` = permanent unlock; `consumable` = grants every
 * time. Power packs are priced at a few throws' Wins for a player at that power, so
 * they speed you up without replacing the training loop.
 */
export const SHOP = {
  power100k: { name: '+100K Power', price: 5000, kind: 'consumable', grant: { power: 1e5 } },
  power1m: { name: '+1M Power', price: 40000, kind: 'consumable', grant: { power: 1e6 } },
  power10m: { name: '+10M Power', price: 200000, kind: 'consumable', grant: { power: 1e7 } },
  laneVeryOp: { name: 'VERY OP! Lane', price: 150000, kind: 'pass' },
  laneBestOverall: { name: 'BEST OVERALL! Lane', price: 2000000, kind: 'pass' },
  // The limited showcase pet. The product keeps its original id (the server's stock
  // counter is keyed by it); what it grants is King Doggy.
  sphinx: { name: 'King Doggy', price: 2500000, kind: 'consumable', grant: { pet: 'kingDoggy' }, stock: 1000 },
}

/** King Doggy stock shown before the server reports the live count. */
export const SPHINX_STOCK_DEFAULT = 954

// --- Tutorial & badges ------------------------------------------------------------

/** Each step completes when its event fires. */
export const TUTORIAL = [
  { text: 'Throw one time', event: 'throw', target: 'throw' },
  { text: 'Go to the FREE Training Area', event: 'train', target: 'lane0' },
  { text: 'Get your first Rebirth', event: 'rebirth', target: 'rebirth' },
  { text: 'Buy a better spear in the Shop', event: 'buyPlane', target: 'hangar' },
  { text: 'Hatch a pet from an egg', event: 'hatch', target: 'eggs' },
]

export const BADGES = {
  firstThrow: { name: 'First Throw' },
  firstRebirth: { name: 'First Rebirth' },
  firstPet: { name: 'Pet Owner' },
  kilometer: { name: 'Kilometre Club' },
  world2: { name: 'World Traveller' },
  world3: { name: 'Trick or Treat' },
}
