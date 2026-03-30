import { clamp, randInt, roll } from "../core/utils.js";
import { revealCircle, revealNearbySecrets } from "../core/world.js";

export const RACES = [
  {
    id: "human",
    name: "Human",
    summary: "Balanced and resilient. Best all-around start.",
    stats: { str: 12, dex: 11, con: 12, int: 11 },
    hp: 12,
    mana: 4
  },
  {
    id: "elf",
    name: "Elf",
    summary: "Sharper minds and nimble hands, but lighter frames.",
    stats: { str: 10, dex: 13, con: 9, int: 14 },
    hp: 9,
    mana: 8
  },
  {
    id: "dwarf",
    name: "Dwarf",
    summary: "Sturdy tunnel fighter with high endurance.",
    stats: { str: 13, dex: 9, con: 14, int: 9 },
    hp: 14,
    mana: 3
  }
];

export const CLASSES = [
  {
    id: "fighter",
    name: "Fighter",
    summary: "Steel first, magic second. Toughest starting kit.",
    bonuses: { str: 3, con: 2, dex: 1, int: 0, hp: 6, mana: 0 },
    spells: [],
    startItems: ["shortSword", "leatherArmor", "buckler", "healingPotion", "healingPotion", "torchCharm"]
  },
  {
    id: "rogue",
    name: "Rogue",
    summary: "Quick, accurate, and well supplied.",
    bonuses: { str: 1, con: 1, dex: 3, int: 1, hp: 3, mana: 2 },
    spells: ["magicMissile"],
    startItems: ["dagger", "quiltArmor", "shadowCloak", "healingPotion", "identifyScroll", "goldCharm"]
  },
  {
    id: "wizard",
    name: "Wizard",
    summary: "Fragile at the start, strongest spell utility.",
    bonuses: { str: 0, con: 0, dex: 1, int: 4, hp: 0, mana: 8 },
    spells: ["magicMissile", "healMinor"],
    startItems: ["oakStaff", "clothRobe", "manaPotion", "manaPotion", "mappingScroll", "spellfocusRing"]
  }
];

export const SPELLS = {
  magicMissile: {
    id: "magicMissile",
    name: "Magic Missile",
    learnLevel: 1,
    cost: 3,
    range: 8,
    effectColor: "#d6c1ff",
    description: "Unerring arcane dart for moderate damage.",
    target: "monster",
    cast(game, caster, target) {
      const damage = roll(2, 4) + Math.floor(caster.stats.int / 3) + (game.getSpellDamageBonus ? game.getSpellDamageBonus(target, "magic") : 0);
      game.log(`A crackling bolt strikes ${target.name} for ${damage} damage.`, "good");
      game.damageActor(caster, target, damage, "magic");
      return true;
    }
  },
  healMinor: {
    id: "healMinor",
    name: "Cure Light Wounds",
    learnLevel: 1,
    cost: 4,
    description: "Restores a small amount of vitality.",
    target: "self",
    cast(game, caster) {
      const healed = clamp(roll(2, 5) + Math.floor(caster.stats.int / 4), 4, caster.maxHp);
      const before = caster.hp;
      caster.hp = Math.min(caster.maxHp, caster.hp + healed);
      game.log(`${caster.name} recovers ${caster.hp - before} hit points.`, "good");
      return true;
    }
  },
  frostBolt: {
    id: "frostBolt",
    name: "Frost Bolt",
    learnLevel: 3,
    cost: 6,
    range: 7,
    effectColor: "#9ad7ff",
    description: "Cold damage with a chance to slow the foe.",
    target: "monster",
    cast(game, caster, target) {
      const damage = roll(2, 6) + Math.floor(caster.stats.int / 2) + (game.getSpellDamageBonus ? game.getSpellDamageBonus(target, "cold") : 0);
      game.log(`Blue-white frost lashes ${target.name}.`, "good");
      game.damageActor(caster, target, damage, "cold");
      if (target.hp > 0 && Math.random() < 0.35) {
        target.slowed = 2;
        game.log(`${target.name} is slowed by the freezing impact.`, "warning");
      }
      return true;
    }
  },
  fireball: {
    id: "fireball",
    name: "Fireball",
    learnLevel: 7,
    cost: 9,
    range: 7,
    effectColor: "#ffb16f",
    description: "High damage blast against a single foe.",
    target: "monster",
    cast(game, caster, target) {
      const damage = roll(3, 6) + Math.floor(caster.stats.int / 2) + (game.getSpellDamageBonus ? game.getSpellDamageBonus(target, "fire") : 0);
      game.log(`The fireball bursts over ${target.name}.`, "good");
      game.damageActor(caster, target, damage, "fire");
      return true;
    }
  },
  phaseDoor: {
    id: "phaseDoor",
    name: "Phase Door",
    learnLevel: 4,
    cost: 5,
    description: "Teleports a short distance to safety.",
    target: "self",
    cast(game, caster) {
      const position = game.findSafeTile(game.currentLevel, 12);
      if (!position) {
        game.log("The spell fails to find an opening.", "warning");
        return false;
      }
      caster.x = position.x;
      caster.y = position.y;
      game.log(`${caster.name} blinks through the air.`, "good");
      return true;
    }
  },
  clairvoyance: {
    id: "clairvoyance",
    name: "Clairvoyance",
    learnLevel: 6,
    cost: 4,
    description: "Reveals part of the current dungeon floor.",
    target: "self",
    cast(game) {
      const level = game.currentLevel;
      for (let i = 0; i < 40; i += 1) {
        const x = randInt(1, level.width - 2);
        const y = randInt(1, level.height - 2);
        revealCircle(level, x, y, 4);
      }
      revealNearbySecrets(level, game.player.x, game.player.y, 6);
      game.log("The dungeon briefly clears in your mind.", "good");
      return true;
    }
  },
  identify: {
    id: "identify",
    name: "Identify",
    learnLevel: 2,
    cost: 3,
    description: "Reveals the true nature of your equipped gear and pack.",
    target: "self",
    cast(game) {
      const count = game.identifyInventoryAndEquipment();
      game.log(count > 0 ? `The spell reveals ${count} item${count === 1 ? "" : "s"}.` : "You already know your gear well.", "good");
      return true;
    }
  },
  slowMonster: {
    id: "slowMonster",
    name: "Slow Monster",
    learnLevel: 2,
    cost: 5,
    range: 7,
    effectColor: "#bcdfff",
    description: "Reduces a visible monster to half speed.",
    target: "monster",
    cast(game, caster, target) {
      target.slowed = Math.max(target.slowed || 0, 5);
      game.log(`${target.name} moves as if wading through tar.`, "good");
      return true;
    }
  },
  removeCurse: {
    id: "removeCurse",
    name: "Remove Curse",
    learnLevel: 5,
    cost: 6,
    description: "Breaks curses on equipped items and inventory.",
    target: "self",
    cast(game) {
      const count = game.removeCurses();
      game.log(count > 0 ? `Holy force breaks ${count} curse${count === 1 ? "" : "s"}.` : "No curses answer the prayer.", "good");
      return true;
    }
  },
  runeOfReturn: {
    id: "runeOfReturn",
    name: "Rune of Return",
    learnLevel: 8,
    cost: 8,
    description: "Returns you to town from the depths.",
    target: "self",
    cast(game) {
      if (game.currentDepth === 0) {
        game.log("You are already in town.", "warning");
        return false;
      }
      game.currentDepth = 0;
      game.currentLevel = game.levels[0];
      game.placePlayerAt(game.currentLevel.start.x, game.currentLevel.start.y);
      game.log("The rune folds the dungeon away and returns you to town.", "good");
      return true;
    }
  }
};

export const ITEM_DEFS = {
  dagger: { id: "dagger", name: "Dagger", kind: "weapon", slot: "weapon", power: 3, value: 24, rarity: 1, weight: 2 },
  shortSword: { id: "shortSword", name: "Short Sword", kind: "weapon", slot: "weapon", power: 5, value: 42, rarity: 1, weight: 4 },
  broadSword: { id: "broadSword", name: "Broad Sword", kind: "weapon", slot: "weapon", power: 7, value: 80, rarity: 2, weight: 6 },
  battleAxe: { id: "battleAxe", name: "Battle Axe", kind: "weapon", slot: "weapon", power: 9, value: 120, rarity: 3, weight: 7 },
  warHammer: { id: "warHammer", name: "War Hammer", kind: "weapon", slot: "weapon", power: 11, value: 160, rarity: 4, weight: 8 },
  oakStaff: { id: "oakStaff", name: "Oak Staff", kind: "weapon", slot: "weapon", power: 4, value: 26, rarity: 1, manaBonus: 2, weight: 5 },
  clothRobe: { id: "clothRobe", name: "Cloth Robe", kind: "armor", slot: "body", armor: 1, value: 20, rarity: 1, manaBonus: 2, weight: 2 },
  quiltArmor: { id: "quiltArmor", name: "Quilt Armor", kind: "armor", slot: "body", armor: 2, value: 30, rarity: 1, weight: 3 },
  leatherArmor: { id: "leatherArmor", name: "Leather Armor", kind: "armor", slot: "body", armor: 3, value: 46, rarity: 1, weight: 5 },
  chainMail: { id: "chainMail", name: "Chain Mail", kind: "armor", slot: "body", armor: 5, value: 88, rarity: 2, weight: 8 },
  plateMail: { id: "plateMail", name: "Plate Mail", kind: "armor", slot: "body", armor: 7, value: 155, rarity: 4, dexPenalty: 1, weight: 11 },
  buckler: { id: "buckler", name: "Buckler", kind: "armor", slot: "offhand", armor: 1, value: 22, rarity: 1, weight: 3 },
  towerShield: { id: "towerShield", name: "Tower Shield", kind: "armor", slot: "offhand", armor: 3, value: 94, rarity: 3, dexPenalty: 1, weight: 8 },
  bronzeHelm: { id: "bronzeHelm", name: "Bronze Helm", kind: "armor", slot: "head", armor: 2, value: 40, rarity: 2, weight: 2 },
  ironHelm: { id: "ironHelm", name: "Iron Helm", kind: "armor", slot: "head", armor: 3, value: 64, rarity: 3, weight: 3 },
  travelBoots: { id: "travelBoots", name: "Travel Boots", kind: "armor", slot: "feet", armor: 1, value: 26, rarity: 1, dexBonus: 1, weight: 2 },
  shadowCloak: { id: "shadowCloak", name: "Shadow Cloak", kind: "armor", slot: "cloak", armor: 1, value: 40, rarity: 2, dexBonus: 1, weight: 1 },
  spellfocusRing: { id: "spellfocusRing", name: "Ring of Focus", kind: "armor", slot: "ring", armor: 0, value: 88, rarity: 2, manaBonus: 4, weight: 0 },
  goldCharm: { id: "goldCharm", name: "Charm of Fortune", kind: "armor", slot: "amulet", armor: 0, value: 94, rarity: 3, goldBonus: 0.15, weight: 0 },
  torchCharm: { id: "torchCharm", name: "Charm of Light", kind: "armor", slot: "amulet", armor: 0, value: 70, rarity: 2, lightBonus: 1, weight: 0 },
  healingPotion: { id: "healingPotion", name: "Potion of Healing", kind: "consumable", effect: "heal", value: 28, rarity: 1, weight: 1 },
  manaPotion: { id: "manaPotion", name: "Potion of Mana", kind: "consumable", effect: "mana", value: 34, rarity: 1, weight: 1 },
  identifyScroll: { id: "identifyScroll", name: "Scroll of Identify", kind: "consumable", effect: "identify", value: 36, rarity: 2, weight: 0 },
  mappingScroll: { id: "mappingScroll", name: "Scroll of Mapping", kind: "consumable", effect: "mapping", value: 46, rarity: 2, weight: 0 },
  teleportScroll: { id: "teleportScroll", name: "Scroll of Teleport", kind: "consumable", effect: "teleport", value: 52, rarity: 3, weight: 0 },
  removeCurseScroll: { id: "removeCurseScroll", name: "Scroll of Remove Curse", kind: "consumable", effect: "removeCurse", value: 68, rarity: 4, weight: 0 },
  runeScroll: { id: "runeScroll", name: "Rune of Return", kind: "consumable", effect: "runeReturn", value: 90, rarity: 5, weight: 0 },
  wandLightning: { id: "wandLightning", name: "Wand of Lightning", kind: "charged", effect: "lightning", charges: 5, value: 110, rarity: 4, weight: 1 },
  wandSlow: { id: "wandSlow", name: "Wand of Slow Monster", kind: "charged", effect: "slow", charges: 6, value: 92, rarity: 4, weight: 1 },
  staffHealing: { id: "staffHealing", name: "Staff of Healing", kind: "charged", effect: "staffHeal", charges: 5, value: 128, rarity: 5, weight: 3 },
  spellbookFrost: { id: "spellbookFrost", name: "Spellbook of Frost", kind: "spellbook", spell: "frostBolt", value: 90, rarity: 4, weight: 1 },
  spellbookFire: { id: "spellbookFire", name: "Spellbook of Fire", kind: "spellbook", spell: "fireball", value: 130, rarity: 5, weight: 1 },
  spellbookPhase: { id: "spellbookPhase", name: "Spellbook of Phase Door", kind: "spellbook", spell: "phaseDoor", value: 96, rarity: 4, weight: 1 },
  spellbookMind: { id: "spellbookMind", name: "Spellbook of Clairvoyance", kind: "spellbook", spell: "clairvoyance", value: 86, rarity: 4, weight: 1 },
  spellbookIdentify: { id: "spellbookIdentify", name: "Spellbook of Identify", kind: "spellbook", spell: "identify", value: 82, rarity: 4, weight: 1 },
  spellbookSlow: { id: "spellbookSlow", name: "Spellbook of Slow Monster", kind: "spellbook", spell: "slowMonster", value: 92, rarity: 5, weight: 1 },
  spellbookCurse: { id: "spellbookCurse", name: "Spellbook of Remove Curse", kind: "spellbook", spell: "removeCurse", value: 120, rarity: 5, weight: 1 },
  brokenDagger: { id: "brokenDagger", name: "Broken Dagger", kind: "junk", value: 6, rarity: 2, weight: 2 },
  rustedMail: { id: "rustedMail", name: "Rusted Mail", kind: "junk", value: 10, rarity: 3, weight: 7 },
  runestone: { id: "runestone", name: "Runestone of the Winds", kind: "quest", value: 0, rarity: 99 }
};

export const TEMPLE_SERVICES = [
  { id: "heal", name: "Healing", price: 40, description: "Restore hit points and mana." },
  { id: "restore", name: "Restoration", price: 90, description: "Recover lost Constitution and mana." },
  { id: "removeCurse", name: "Remove Curse", price: 120, description: "Break curses on all carried gear." },
  { id: "runeReturn", name: "Rune of Return", price: 160, description: "Receive a fresh rune scroll." }
];

export const MONSTER_DEFS = [
  { id: "rat", name: "Giant Rat", depth: 1, hp: 6, attack: 3, defense: 7, damage: [1, 4], exp: 12, gold: [2, 10], color: "#8e8e75", sprite: "rat", tactic: "pack" },
  { id: "kobold", name: "Kobold", depth: 1, hp: 8, attack: 4, defense: 8, damage: [1, 5], exp: 15, gold: [4, 12], color: "#b19061", sprite: "kobold", tactic: "pack" },
  { id: "slinger", name: "Kobold Slinger", depth: 1, hp: 7, attack: 5, defense: 8, damage: [1, 4], exp: 18, gold: [4, 12], color: "#b89066", sprite: "kobold", tactic: "skirmish", ranged: { range: 5, damage: [1, 4], color: "#e0c7a2" } },
  { id: "goblin", name: "Goblin", depth: 2, hp: 12, attack: 5, defense: 9, damage: [1, 6], exp: 24, gold: [5, 18], color: "#6e9d4f", sprite: "goblin", tactic: "pack" },
  { id: "archer", name: "Goblin Archer", depth: 2, hp: 11, attack: 6, defense: 9, damage: [1, 6], exp: 28, gold: [6, 20], color: "#8caf56", sprite: "goblin", tactic: "skirmish", ranged: { range: 6, damage: [1, 5], color: "#c2a56a" } },
  { id: "wolf", name: "Dire Wolf", depth: 2, hp: 14, attack: 6, defense: 10, damage: [2, 4], exp: 28, gold: [0, 0], color: "#a7a7a7", sprite: "wolf", abilities: ["charge"], tactic: "charge" },
  { id: "skeleton", name: "Skeleton", depth: 2, hp: 18, attack: 7, defense: 11, damage: [2, 5], exp: 40, gold: [8, 22], color: "#d9d9ca", sprite: "skeleton", tactic: "line" },
  { id: "orc", name: "Orc", depth: 3, hp: 22, attack: 8, defense: 11, damage: [2, 6], exp: 46, gold: [10, 28], color: "#709243", sprite: "orc", tactic: "press" },
  { id: "slime", name: "Ochre Jelly", depth: 4, hp: 26, attack: 8, defense: 10, damage: [2, 6], exp: 52, gold: [0, 0], color: "#c8a73c", sprite: "slime", tactic: "press" },
  { id: "troll", name: "Troll", depth: 4, hp: 36, attack: 10, defense: 12, damage: [2, 8], exp: 80, gold: [16, 40], color: "#5f7b3f", sprite: "troll", abilities: ["charge"], tactic: "charge" },
  { id: "wraith", name: "Wraith", depth: 5, hp: 30, attack: 11, defense: 14, damage: [3, 6], exp: 98, gold: [18, 54], color: "#b4a7df", sprite: "wraith", abilities: ["phase", "drain"], tactic: "phase" },
  { id: "ogre", name: "Ogre", depth: 5, hp: 44, attack: 12, defense: 13, damage: [3, 7], exp: 106, gold: [20, 68], color: "#ab7c50", sprite: "ogre", abilities: ["charge"], tactic: "charge" },
  { id: "shaman", name: "Orc Shaman", depth: 5, hp: 28, attack: 11, defense: 13, damage: [2, 6], exp: 110, gold: [18, 58], color: "#4a8f8f", sprite: "mage", spells: ["magicMissile"], abilities: ["slow", "summon"], tactic: "control" },
  { id: "warlock", name: "Warlock", depth: 6, hp: 34, attack: 12, defense: 15, damage: [3, 8], exp: 124, gold: [28, 80], color: "#7854b8", sprite: "mage", spells: ["magicMissile", "frostBolt"], abilities: ["teleport", "summon"], tactic: "control" },
  { id: "wyrm", name: "Cave Wyrm", depth: 7, hp: 60, attack: 14, defense: 16, damage: [4, 8], exp: 180, gold: [30, 96], color: "#be5b33", sprite: "dragon", tactic: "skirmish", ranged: { range: 5, damage: [3, 7], color: "#f08c4f" } }
];

export const SHOPS = {
  general: {
    name: "Provisioner",
    greeting: "Food is scarce in the mountain, but charms, books, and restoratives are not.",
    stock: ["healingPotion", "manaPotion", "identifyScroll", "mappingScroll", "teleportScroll", "travelBoots", "shadowCloak", "spellbookMind", "removeCurseScroll"]
  },
  armory: {
    name: "Armory",
    greeting: "Steel, leather, and hard-won practical judgment.",
    stock: ["shortSword", "broadSword", "battleAxe", "leatherArmor", "chainMail", "plateMail", "buckler", "towerShield", "bronzeHelm", "ironHelm"]
  },
  guild: {
    name: "Wizard's Guild",
    greeting: "Arcane work is expensive. So is burying careless apprentices.",
    stock: ["oakStaff", "spellfocusRing", "spellbookFrost", "spellbookFire", "spellbookPhase", "spellbookIdentify", "spellbookSlow", "spellbookCurse", "manaPotion", "wandLightning", "wandSlow", "staffHealing"]
  },
  temple: {
    name: "Temple",
    greeting: "Restoration, blessing, and the expensive reversal of reckless mistakes.",
    stock: ["healingPotion", "manaPotion", "goldCharm", "torchCharm", "spellbookMind", "runeScroll"]
  },
  sage: {
    name: "Sage's Tower",
    greeting: "Items laid before the sage can be identified for a fee.",
    stock: []
  },
  junk: {
    name: "Junk Shop",
    greeting: "The proprietor buys almost anything, but pays very little.",
    stock: []
  }
};

export const MONSTER_ROLES = {
  rat: "hunter",
  kobold: "frontliner",
  slinger: "artillery",
  goblin: "skirmisher",
  archer: "artillery",
  wolf: "hunter",
  skeleton: "frontliner",
  orc: "frontliner",
  slime: "controller",
  troll: "frontliner",
  wraith: "skirmisher",
  ogre: "elite",
  shaman: "summoner",
  warlock: "controller",
  wyrm: "elite"
};

export const ENCOUNTER_TEMPLATES = {
  shield_wall: {
    id: "shield_wall",
    label: "Shield Wall",
    roles: ["frontliner", "frontliner", "artillery"]
  },
  wolf_pack: {
    id: "wolf_pack",
    label: "Wolf Pack",
    roles: ["hunter", "hunter", "skirmisher"]
  },
  necromancer_screen: {
    id: "necromancer_screen",
    label: "Necromancer Screen",
    roles: ["summoner", "frontliner", "frontliner"]
  },
  orc_push: {
    id: "orc_push",
    label: "Orc Push",
    roles: ["frontliner", "controller", "artillery"]
  },
  ambush_cell: {
    id: "ambush_cell",
    label: "Ambush Cell",
    roles: ["skirmisher", "skirmisher", "artillery"]
  }
};

export const DEPTH_THEMES = [
  {
    id: "vermin_halls",
    name: "Vermin Halls",
    depths: [1, 2],
    summary: "Fast packs, anxious corridors, and too many eyes in the dark.",
    templates: ["wolf_pack", "ambush_cell", "shield_wall"],
    monsterBias: ["rat", "kobold", "slinger", "goblin", "wolf"]
  },
  {
    id: "barracks",
    name: "Broken Barracks",
    depths: [2, 3, 4],
    summary: "Disciplined pressure from archers, shields, and orc raiders.",
    templates: ["shield_wall", "orc_push", "ambush_cell"],
    monsterBias: ["goblin", "archer", "skeleton", "orc", "troll"]
  },
  {
    id: "crypts",
    name: "Echo Crypts",
    depths: [4, 5, 6, 7],
    summary: "Necromancy, phasing threats, and reinforcements that never stay dead long enough.",
    templates: ["necromancer_screen", "shield_wall", "orc_push"],
    monsterBias: ["skeleton", "wraith", "shaman", "warlock", "ogre", "wyrm"]
  }
];

export const OBJECTIVE_DEFS = {
  recover_relic: {
    id: "recover_relic",
    label: "Recover The Relic",
    shortLabel: "Recover Relic",
    intro: "A marked relic lies somewhere deeper on this floor.",
    summary: "Push to the marked chamber, claim the relic, and decide whether to cash out or stay greedy.",
    completion: "pickup",
    rewardType: "relic"
  },
  purge_nest: {
    id: "purge_nest",
    label: "Purge The Nest",
    shortLabel: "Purge Nest",
    intro: "A breeding nest is feeding the floor. Clear its defenders and crush it.",
    summary: "Clear the nest room, then interact with the nest to end the threat and earn a reward.",
    completion: "interact",
    rewardType: "boon"
  },
  rescue_captive: {
    id: "rescue_captive",
    label: "Rescue The Captive",
    shortLabel: "Rescue Captive",
    intro: "Someone is still alive below. Reach them before the floor tightens around you.",
    summary: "Find the captive, clear the room, and escort the rescue by interacting with the prison marker.",
    completion: "interact",
    rewardType: "rumor"
  },
  seal_shrine: {
    id: "seal_shrine",
    label: "Seal The Shrine",
    shortLabel: "Seal Shrine",
    intro: "An unstable shrine is feeding the floor's hostility. Seal it before pushing deeper.",
    summary: "Reach the shrine and perform the seal. Expect noise and retaliation.",
    completion: "interact",
    rewardType: "boon"
  }
};

export const OPTIONAL_ENCOUNTER_DEFS = {
  cursed_cache: {
    id: "cursed_cache",
    label: "Cursed Cache",
    summary: "Fast value, real risk. Open it for gold and a tainted item.",
    unlock: "archive_maps"
  },
  ghost_merchant: {
    id: "ghost_merchant",
    label: "Ghost Merchant",
    summary: "Spend gold or blood for a precise tool while the dead keep score.",
    unlock: "ghost_bargains"
  },
  blood_altar: {
    id: "blood_altar",
    label: "Blood Altar",
    summary: "Trade life for immediate power and a spike in floor danger."
  },
  vault_room: {
    id: "vault_room",
    label: "Vault Room",
    summary: "A high-value chamber guarded by a formed squad."
  }
};

export const PERK_DEFS = {
  brace: {
    id: "brace",
    family: "fighter",
    name: "Brace",
    description: "Waiting or resting grants temporary guard against the next hit.",
    weight: 5
  },
  cleave: {
    id: "cleave",
    family: "fighter",
    name: "Cleave",
    description: "Melee kills splash damage into one adjacent foe.",
    weight: 4
  },
  shield_mastery: {
    id: "shield_mastery",
    family: "fighter",
    name: "Shield Mastery",
    description: "Gain extra armor and charge resistance while carrying an offhand shield.",
    weight: 4
  },
  blooded: {
    id: "blooded",
    family: "fighter",
    name: "Blooded",
    description: "When wounded, your melee attacks hit harder.",
    weight: 3
  },
  backstab: {
    id: "backstab",
    family: "rogue",
    name: "Backstab",
    description: "Opening strikes against sleeping or unaware enemies deal bonus damage.",
    weight: 5
  },
  evasion: {
    id: "evasion",
    family: "rogue",
    name: "Evasion",
    description: "Gain a flat evade bonus and a stronger dodge while lightly burdened.",
    weight: 4
  },
  trap_sense: {
    id: "trap_sense",
    family: "rogue",
    name: "Trap Sense",
    description: "Searches reveal more traps and nearby trap tiles shimmer sooner.",
    weight: 4
  },
  quick_hands: {
    id: "quick_hands",
    family: "rogue",
    name: "Quick Hands",
    description: "Consumables, pickups, and opportunistic looting are safer under pressure.",
    weight: 3
  },
  spell_efficiency: {
    id: "spell_efficiency",
    family: "wizard",
    name: "Spell Efficiency",
    description: "Spells cost less mana to cast.",
    weight: 5
  },
  element_focus: {
    id: "element_focus",
    family: "wizard",
    name: "Element Focus",
    description: "Direct damage spells strike harder.",
    weight: 4
  },
  overcast_control: {
    id: "overcast_control",
    family: "wizard",
    name: "Overcast Control",
    description: "Overcasting burns less Constitution.",
    weight: 3
  },
  warding: {
    id: "warding",
    family: "wizard",
    name: "Warding",
    description: "Gain a larger mana pool and a layer of passive warding.",
    weight: 4
  }
};

export const RELIC_DEFS = {
  survivor_talisman: {
    id: "survivor_talisman",
    category: "survival",
    name: "Survivor's Talisman",
    description: "Max HP rises and safe recovery becomes more reliable."
  },
  greedy_purse: {
    id: "greedy_purse",
    category: "greed",
    name: "Greedy Purse",
    description: "Extra gold drops, but danger rises faster after the objective is done."
  },
  anchoring_pin: {
    id: "anchoring_pin",
    category: "control",
    name: "Anchoring Pin",
    description: "Slows, summons, and hostile push effects are easier to resist."
  },
  fleet_boots: {
    id: "fleet_boots",
    category: "mobility",
    name: "Fleet Boots",
    description: "Move and reposition more safely under pressure."
  },
  cursed_prism: {
    id: "cursed_prism",
    category: "curse-tech",
    name: "Cursed Prism",
    description: "Gain power from cursed gear without paying the full price."
  },
  warding_lens: {
    id: "warding_lens",
    category: "control",
    name: "Warding Lens",
    description: "The floor telegraphs ranged and summoning threats more clearly."
  },
  hunter_map: {
    id: "hunter_map",
    category: "mobility",
    name: "Hunter's Map",
    description: "Objective markers reveal sooner, and search pressure rises more slowly."
  }
};

export const BOON_DEFS = {
  windfall: {
    id: "windfall",
    name: "Windfall",
    description: "Gain gold and a rumor token."
  },
  field_medicine: {
    id: "field_medicine",
    name: "Field Medicine",
    description: "Restore vitality and gain one emergency heal."
  },
  aether_cache: {
    id: "aether_cache",
    name: "Aether Cache",
    description: "Restore mana and gain one mana potion."
  },
  hunter_mark: {
    id: "hunter_mark",
    name: "Hunter's Mark",
    description: "Your next elite drops an extra reward."
  }
};

export const TOWN_UNLOCK_DEFS = {
  supply_cache: {
    id: "supply_cache",
    name: "Supply Cache",
    description: "Provisioner stocks one extra emergency tool each refresh."
  },
  guild_license: {
    id: "guild_license",
    name: "Guild License",
    description: "Wizard's Guild carries deeper books and charged tools."
  },
  temple_favors: {
    id: "temple_favors",
    name: "Temple Favors",
    description: "Temple services are cheaper and blood altars start appearing below."
  },
  archive_maps: {
    id: "archive_maps",
    name: "Archive Maps",
    description: "Rumors reveal themed objectives and cursed caches begin to appear."
  },
  ghost_bargains: {
    id: "ghost_bargains",
    name: "Ghost Bargains",
    description: "Ghost merchants begin appearing in the dungeon."
  },
  deep_contracts: {
    id: "deep_contracts",
    name: "Deep Contracts",
    description: "Vault rooms and higher-tier objective rewards enter the pool."
  }
};

export const RUMOR_DEFS = {
  vermin_halls: {
    id: "vermin_halls",
    text: "The upper halls are restless. Expect fast packs and flankers."
  },
  barracks: {
    id: "barracks",
    text: "Broken barracks below still favor shield lines and archers."
  },
  crypts: {
    id: "crypts",
    text: "The deeper crypts answer noise with sorcery and undead screens."
  },
  relic_hunt: {
    id: "relic_hunt",
    text: "A relic is being moved through the lower rooms. Someone marked the route."
  },
  nest: {
    id: "nest",
    text: "A nest is feeding one of the floors. Clear it before it floods the halls."
  },
  captive: {
    id: "captive",
    text: "A trapped survivor still lives below and may know the keep's patterns."
  }
};
