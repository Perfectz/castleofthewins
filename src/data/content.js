import { clamp, randInt, roll } from "../core/utils.js";
import { revealCircle, revealNearbySecrets, revealSecretTile } from "../core/world.js";

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
    school: "arcane",
    tier: 1,
    classAffinity: "wizard",
    learnLevel: 1,
    cost: 3,
    range: 8,
    effectColor: "#d6c1ff",
    previewColor: "#d8c4ff",
    projectileStyle: "arcane",
    targetingMode: "single",
    roleLabel: "opener",
    description: "Unerring arcane dart for moderate damage.",
    target: "monster",
    cast(game, caster, target) {
      const casterStats = game.getActorStats ? game.getActorStats(caster) : caster.stats;
      const damage = roll(2, 4) + Math.floor(casterStats.int / 3) + (game.getSpellDamageBonus ? game.getSpellDamageBonus(target, "magic") : 0);
      game.log(`A crackling bolt strikes ${target.name} for ${damage} damage.`, "good");
      game.damageActor(caster, target, damage, "magic");
      return true;
    }
  },
  healMinor: {
    id: "healMinor",
    name: "Cure Light Wounds",
    school: "restoration",
    tier: 1,
    classAffinity: "shared",
    learnLevel: 1,
    cost: 4,
    description: "Restores a small amount of vitality.",
    target: "self",
    cast(game, caster) {
      const casterStats = game.getActorStats ? game.getActorStats(caster) : caster.stats;
      const healed = clamp(roll(2, 5) + Math.floor(casterStats.int / 4), 4, caster.maxHp);
      const before = caster.hp;
      caster.hp = Math.min(caster.maxHp, caster.hp + healed);
      game.log(`${caster.name} recovers ${caster.hp - before} hit points.`, "good");
      return true;
    }
  },
  frostBolt: {
    id: "frostBolt",
    name: "Frost Bolt",
    school: "elemental",
    tier: 2,
    classAffinity: "wizard",
    learnLevel: 3,
    cost: 6,
    range: 7,
    effectColor: "#9ad7ff",
    previewColor: "#b6e6ff",
    projectileStyle: "frost",
    targetingMode: "single",
    roleLabel: "control",
    description: "Cold damage with a chance to slow the foe.",
    target: "monster",
    cast(game, caster, target) {
      const casterStats = game.getActorStats ? game.getActorStats(caster) : caster.stats;
      const damage = roll(2, 6) + Math.floor(casterStats.int / 2) + (game.getSpellDamageBonus ? game.getSpellDamageBonus(target, "cold") : 0);
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
    name: "Ball of Fire",
    school: "elemental",
    tier: 4,
    classAffinity: "wizard",
    learnLevel: 7,
    cost: 9,
    range: 7,
    effectColor: "#ffb16f",
    previewColor: "#ffc48e",
    projectileStyle: "fire",
    targetingMode: "blast",
    allowFloorTarget: true,
    blastRadius: 1,
    roleLabel: "burst",
    description: "A floor-targeted fire blast that engulfs a small cluster of enemies.",
    target: "monster",
    cast(game, caster, target) {
      const preview = game.resolveSpellTargetPreview ? game.resolveSpellTargetPreview(this, target) : null;
      const affected = Array.isArray(preview?.actors) ? preview.actors : [];
      if (affected.length <= 0) {
        game.log("The flames fail to catch anything worth the cast.", "warning");
        return false;
      }
      const casterStats = game.getActorStats ? game.getActorStats(caster) : caster.stats;
      const center = preview?.center || target;
      if (center && game.emitSpellBurst) {
        game.emitSpellBurst(center.x, center.y, this.effectColor || "#ffb16f", this.blastRadius || 1, "fire");
      }
      game.log(`The ball of fire bursts across ${affected.length} foe${affected.length === 1 ? "" : "s"}.`, "good");
      affected.forEach((enemy, index) => {
        const damage = roll(3, 6) + Math.floor(casterStats.int / 2) + (game.getSpellDamageBonus ? game.getSpellDamageBonus(enemy, "fire") : 0);
        if (index > 0 && center && game.playProjectile) {
          game.playProjectile(center, enemy, this.effectColor || "#ffb16f", {
            style: "fire",
            duration: 150
          });
        }
        game.damageActor(caster, enemy, damage, "fire");
      });
      return true;
    }
  },
  phaseDoor: {
    id: "phaseDoor",
    name: "Phase Door",
    school: "escape",
    tier: 2,
    classAffinity: "rogue",
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
    school: "divination",
    tier: 3,
    classAffinity: "shared",
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
    school: "divination",
    tier: 1,
    classAffinity: "shared",
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
    school: "control",
    tier: 1,
    classAffinity: "rogue",
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
    school: "holy",
    tier: 3,
    classAffinity: "shared",
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
    school: "escape",
    tier: 4,
    classAffinity: "shared",
    learnLevel: 8,
    cost: 8,
    description: "Returns you to town, or from town back to your deepest explored floor.",
    target: "self",
    cast(game) {
      return game.useRuneOfReturn ? game.useRuneOfReturn({ source: "spell" }) : false;
    }
  },
  lightningBolt: {
    id: "lightningBolt",
    name: "Lightning Bolt",
    school: "elemental",
    tier: 3,
    classAffinity: "wizard",
    learnLevel: 5,
    cost: 7,
    range: 8,
    effectColor: "#ffe27a",
    previewColor: "#fff0a8",
    projectileStyle: "lightning",
    targetingMode: "single",
    roleLabel: "finisher",
    description: "High-voltage strike that rips through a single visible foe.",
    target: "monster",
    cast(game, caster, target) {
      const casterStats = game.getActorStats ? game.getActorStats(caster) : caster.stats;
      const damage = roll(3, 5) + Math.floor(casterStats.int / 2) + (game.getSpellDamageBonus ? game.getSpellDamageBonus(target, "magic") : 0);
      game.log(`Lightning cracks across ${target.name}.`, "good");
      game.damageActor(caster, target, damage, "magic");
      return true;
    }
  },
  holdMonster: {
    id: "holdMonster",
    name: "Hold Monster",
    school: "control",
    tier: 2,
    classAffinity: "rogue",
    learnLevel: 4,
    cost: 6,
    range: 7,
    effectColor: "#cbbfff",
    description: "Pins a monster in place and leaves it sluggish afterward.",
    target: "monster",
    cast(game, caster, target) {
      target.held = Math.max(target.held || 0, 2);
      target.slowed = Math.max(target.slowed || 0, 4);
      game.log(`${target.name} locks in place under a binding spell.`, "good");
      return true;
    }
  },
  cureSerious: {
    id: "cureSerious",
    name: "Cure Serious Wounds",
    school: "restoration",
    tier: 2,
    classAffinity: "fighter",
    learnLevel: 4,
    cost: 7,
    description: "Restores a substantial amount of vitality.",
    target: "self",
    cast(game, caster) {
      const casterStats = game.getActorStats ? game.getActorStats(caster) : caster.stats;
      const healed = clamp(roll(4, 5) + Math.floor(casterStats.int / 3), 8, caster.maxHp);
      const before = caster.hp;
      caster.hp = Math.min(caster.maxHp, caster.hp + healed);
      game.log(`${caster.name} recovers ${caster.hp - before} hit points.`, "good");
      return true;
    }
  },
  stoneSkin: {
    id: "stoneSkin",
    name: "Stone Skin",
    school: "warding",
    tier: 3,
    classAffinity: "fighter",
    learnLevel: 5,
    cost: 6,
    description: "Hardens your body into a temporary shell of living stone.",
    target: "self",
    cast(game, caster) {
      caster.stoneSkinTurns = Math.max(caster.stoneSkinTurns || 0, 18);
      game.log(`${caster.name}'s skin hardens like carved granite.`, "good");
      return true;
    }
  },
  shield: {
    id: "shield",
    name: "Shield",
    school: "warding",
    tier: 1,
    classAffinity: "fighter",
    learnLevel: 2,
    cost: 4,
    description: "Raises a brief but reliable arcane ward.",
    target: "self",
    cast(game, caster) {
      caster.arcaneWardTurns = Math.max(caster.arcaneWardTurns || 0, 16);
      game.log(`${caster.name} raises a shimmering ward.`, "good");
      return true;
    }
  },
  resistFire: {
    id: "resistFire",
    name: "Resist Fire",
    school: "warding",
    tier: 2,
    classAffinity: "fighter",
    learnLevel: 4,
    cost: 4,
    description: "Blunts incoming fire damage for a long stretch of turns.",
    target: "self",
    cast(game, caster) {
      caster.resistFireTurns = Math.max(caster.resistFireTurns || 0, 30);
      game.log(`${caster.name} steels against flame.`, "good");
      return true;
    }
  },
  resistCold: {
    id: "resistCold",
    name: "Resist Cold",
    school: "warding",
    tier: 2,
    classAffinity: "fighter",
    learnLevel: 4,
    cost: 4,
    description: "Blunts incoming cold damage for a long stretch of turns.",
    target: "self",
    cast(game, caster) {
      caster.resistColdTurns = Math.max(caster.resistColdTurns || 0, 30);
      game.log(`${caster.name} hardens against frost.`, "good");
      return true;
    }
  },
  teleport: {
    id: "teleport",
    name: "Teleport",
    school: "escape",
    tier: 3,
    classAffinity: "rogue",
    learnLevel: 6,
    cost: 7,
    description: "Teleports you to a safer tile elsewhere on the current floor.",
    target: "self",
    cast(game, caster) {
      const position = game.findSafeTile(game.currentLevel, 28);
      if (!position) {
        game.log("Space will not yield to the spell.", "warning");
        return false;
      }
      caster.x = position.x;
      caster.y = position.y;
      game.log(`${caster.name} vanishes and reappears elsewhere in the keep.`, "good");
      return true;
    }
  },
  light: {
    id: "light",
    name: "Light",
    school: "divination",
    tier: 1,
    classAffinity: "rogue",
    learnLevel: 1,
    cost: 2,
    description: "Brightens your immediate surroundings and extends sight for a while.",
    target: "self",
    cast(game, caster) {
      caster.lightBuffTurns = Math.max(caster.lightBuffTurns || 0, 40);
      game.recalculateDerivedStats?.();
      game.log("A steady white light gathers around you.", "good");
      return true;
    }
  },
  detectTraps: {
    id: "detectTraps",
    name: "Detect Traps",
    school: "divination",
    tier: 2,
    classAffinity: "rogue",
    learnLevel: 3,
    cost: 3,
    description: "Reveals hidden traps and nearby secret doors.",
    target: "self",
    cast(game) {
      const level = game.currentLevel;
      let revealed = 0;
      for (let y = game.player.y - 10; y <= game.player.y + 10; y += 1) {
        for (let x = game.player.x - 10; x <= game.player.x + 10; x += 1) {
          if (x < 0 || y < 0 || x >= level.width || y >= level.height) {
            continue;
          }
          const before = level.tiles[y * level.width + x];
          if ((before.kind === "trap" && before.hidden) || before.kind === "secretDoor" || before.kind === "secretWall") {
            revealSecretTile(level, x, y);
            revealed += 1;
          }
        }
      }
      revealNearbySecrets(level, game.player.x, game.player.y, 10);
      game.log(revealed > 0 ? `Hidden dangers flare into view in ${revealed} place${revealed === 1 ? "" : "s"}.` : "The spell finds no hidden danger nearby.", "good");
      return true;
    }
  }
};

export const ITEM_DEFS = {
  knife: { id: "knife", name: "Knife", kind: "weapon", slot: "weapon", power: 2, accuracyBonus: 2, critBonus: 1, value: 18, rarity: 1, weight: 1, visualId: "sword" },
  dagger: { id: "dagger", name: "Dagger", kind: "weapon", slot: "weapon", power: 3, accuracyBonus: 2, critBonus: 1, value: 24, rarity: 1, weight: 2, visualId: "sword" },
  shortSword: { id: "shortSword", name: "Short Sword", kind: "weapon", slot: "weapon", power: 5, accuracyBonus: 1, value: 42, rarity: 1, weight: 4, visualId: "sword" },
  rapier: { id: "rapier", name: "Rapier", kind: "weapon", slot: "weapon", power: 5, accuracyBonus: 2, critBonus: 2, value: 60, rarity: 2, weight: 3, visualId: "sword" },
  handAxe: { id: "handAxe", name: "Hand Axe", kind: "weapon", slot: "weapon", power: 7, critBonus: 1, value: 68, rarity: 2, weight: 5, visualId: "sword" },
  broadSword: { id: "broadSword", name: "Broad Sword", kind: "weapon", slot: "weapon", power: 7, accuracyBonus: 1, value: 80, rarity: 2, weight: 5, visualId: "sword" },
  mace: { id: "mace", name: "Mace", kind: "weapon", slot: "weapon", power: 8, value: 92, rarity: 3, weight: 6, visualId: "sword" },
  battleAxe: { id: "battleAxe", name: "Battle Axe", kind: "weapon", slot: "weapon", power: 9, accuracyBonus: -1, critBonus: 1, value: 120, rarity: 3, weight: 7, visualId: "sword" },
  warPick: { id: "warPick", name: "War Pick", kind: "weapon", slot: "weapon", power: 10, accuracyBonus: 1, critBonus: 1, value: 140, rarity: 4, weight: 7, visualId: "sword" },
  warHammer: { id: "warHammer", name: "War Hammer", kind: "weapon", slot: "weapon", power: 11, accuracyBonus: -1, critBonus: 2, value: 160, rarity: 4, weight: 8, visualId: "sword" },
  oakStaff: { id: "oakStaff", name: "Oak Staff", kind: "weapon", slot: "weapon", power: 4, accuracyBonus: 1, manaBonus: 2, wardBonus: 1, value: 26, rarity: 1, weight: 5, visualId: "wand" },
  ashStaff: { id: "ashStaff", name: "Ash Staff", kind: "weapon", slot: "weapon", power: 5, accuracyBonus: 1, manaBonus: 3, wardBonus: 1, value: 64, rarity: 2, weight: 4, visualId: "wand" },
  runeBlade: { id: "runeBlade", name: "Rune Blade", kind: "weapon", slot: "weapon", power: 9, accuracyBonus: 1, critBonus: 1, manaBonus: 2, value: 152, rarity: 4, weight: 5, visualId: "sword" },
  clothRobe: { id: "clothRobe", name: "Cloth Robe", kind: "armor", slot: "body", armor: 1, manaBonus: 2, wardBonus: 1, value: 20, rarity: 1, weight: 2, visualId: "armor" },
  quiltArmor: { id: "quiltArmor", name: "Quilt Armor", kind: "armor", slot: "body", armor: 2, searchBonus: 1, value: 30, rarity: 1, weight: 3, visualId: "armor" },
  leatherArmor: { id: "leatherArmor", name: "Leather Armor", kind: "armor", slot: "body", armor: 3, dexBonus: 1, searchBonus: 1, value: 46, rarity: 1, weight: 5, visualId: "armor" },
  brigandine: { id: "brigandine", name: "Brigandine", kind: "armor", slot: "body", armor: 4, guardBonus: 1, value: 66, rarity: 2, weight: 6, visualId: "armor" },
  chainMail: { id: "chainMail", name: "Chain Mail", kind: "armor", slot: "body", armor: 5, guardBonus: 1, value: 88, rarity: 2, weight: 8, visualId: "armor" },
  scaleMail: { id: "scaleMail", name: "Scale Mail", kind: "armor", slot: "body", armor: 6, guardBonus: 2, dexPenalty: 1, value: 118, rarity: 3, weight: 9, visualId: "armor" },
  plateMail: { id: "plateMail", name: "Plate Mail", kind: "armor", slot: "body", armor: 7, guardBonus: 3, dexPenalty: 1, value: 155, rarity: 4, weight: 11, visualId: "armor" },
  buckler: { id: "buckler", name: "Buckler", kind: "armor", slot: "offhand", armor: 1, guardBonus: 1, dexBonus: 1, value: 22, rarity: 1, weight: 3, visualId: "shield" },
  kiteShield: { id: "kiteShield", name: "Kite Shield", kind: "armor", slot: "offhand", armor: 2, guardBonus: 2, value: 58, rarity: 2, weight: 6, visualId: "shield" },
  towerShield: { id: "towerShield", name: "Tower Shield", kind: "armor", slot: "offhand", armor: 3, guardBonus: 3, dexPenalty: 1, value: 94, rarity: 3, weight: 8, visualId: "shield" },
  paddedCap: { id: "paddedCap", name: "Padded Cap", kind: "armor", slot: "head", armor: 1, searchBonus: 1, value: 24, rarity: 1, weight: 1, visualId: "armor" },
  bronzeHelm: { id: "bronzeHelm", name: "Bronze Helm", kind: "armor", slot: "head", armor: 2, guardBonus: 1, value: 40, rarity: 2, weight: 2, visualId: "armor" },
  hoodedCowl: { id: "hoodedCowl", name: "Hooded Cowl", kind: "armor", slot: "head", armor: 1, lightBonus: 1, wardBonus: 1, value: 48, rarity: 2, weight: 1, visualId: "armor" },
  ironHelm: { id: "ironHelm", name: "Iron Helm", kind: "armor", slot: "head", armor: 3, guardBonus: 1, value: 64, rarity: 3, weight: 3, visualId: "armor" },
  travelBoots: { id: "travelBoots", name: "Travel Boots", kind: "armor", slot: "feet", armor: 1, dexBonus: 1, searchBonus: 1, value: 26, rarity: 1, weight: 2, visualId: "armor" },
  greaves: { id: "greaves", name: "Greaves", kind: "armor", slot: "feet", armor: 2, guardBonus: 1, value: 46, rarity: 2, weight: 3, visualId: "armor" },
  strideBoots: { id: "strideBoots", name: "Stride Boots", kind: "armor", slot: "feet", armor: 1, dexBonus: 2, value: 62, rarity: 3, weight: 2, visualId: "armor" },
  shadowCloak: { id: "shadowCloak", name: "Shadow Cloak", kind: "armor", slot: "cloak", armor: 1, dexBonus: 1, searchBonus: 1, value: 40, rarity: 2, weight: 1, visualId: "armor" },
  wardedCloak: { id: "wardedCloak", name: "Warded Cloak", kind: "armor", slot: "cloak", armor: 1, manaBonus: 1, wardBonus: 1, value: 68, rarity: 3, weight: 1, visualId: "armor" },
  scoutCloak: { id: "scoutCloak", name: "Scout Cloak", kind: "armor", slot: "cloak", armor: 0, dexBonus: 1, searchBonus: 2, lightBonus: 1, value: 74, rarity: 3, weight: 1, visualId: "armor" },
  spellfocusRing: { id: "spellfocusRing", name: "Ring of Focus", kind: "armor", slot: "ring", armor: 0, manaBonus: 4, wardBonus: 1, value: 88, rarity: 2, weight: 0, visualId: "relic" },
  ironRing: { id: "ironRing", name: "Iron Ring", kind: "armor", slot: "ring", armor: 1, guardBonus: 1, value: 54, rarity: 2, weight: 0, visualId: "relic" },
  ringOfMight: { id: "ringOfMight", name: "Ring of Might", kind: "armor", slot: "ring", armor: 0, strBonus: 1, value: 84, rarity: 2, weight: 0, visualId: "relic" },
  ringOfGrace: { id: "ringOfGrace", name: "Ring of Grace", kind: "armor", slot: "ring", armor: 0, dexBonus: 1, value: 86, rarity: 2, weight: 0, visualId: "relic" },
  ringOfVigor: { id: "ringOfVigor", name: "Ring of Vigor", kind: "armor", slot: "ring", armor: 0, conBonus: 1, value: 96, rarity: 3, weight: 0, visualId: "relic" },
  ringOfInsight: { id: "ringOfInsight", name: "Ring of Insight", kind: "armor", slot: "ring", armor: 0, intBonus: 1, value: 96, rarity: 3, weight: 0, visualId: "relic" },
  goldCharm: { id: "goldCharm", name: "Charm of Fortune", kind: "armor", slot: "amulet", armor: 0, goldBonus: 0.15, searchBonus: 1, value: 94, rarity: 3, weight: 0, visualId: "relic" },
  torchCharm: { id: "torchCharm", name: "Charm of Light", kind: "armor", slot: "amulet", armor: 0, lightBonus: 1, value: 70, rarity: 2, weight: 0, visualId: "relic" },
  emberCharm: { id: "emberCharm", name: "Ember Charm", kind: "armor", slot: "amulet", armor: 0, fireResist: 2, value: 92, rarity: 3, weight: 0, visualId: "relic" },
  frostCharm: { id: "frostCharm", name: "Frost Charm", kind: "armor", slot: "amulet", armor: 0, coldResist: 2, value: 92, rarity: 3, weight: 0, visualId: "relic" },
  wardingAmulet: { id: "wardingAmulet", name: "Warding Amulet", kind: "armor", slot: "amulet", armor: 0, manaBonus: 1, wardBonus: 2, value: 122, rarity: 4, weight: 0, visualId: "relic" },
  giantTorque: { id: "giantTorque", name: "Giant Torque", kind: "armor", slot: "amulet", armor: 0, strBonus: 2, value: 126, rarity: 4, weight: 0, visualId: "relic" },
  windlaceAmulet: { id: "windlaceAmulet", name: "Windlace Amulet", kind: "armor", slot: "amulet", armor: 0, dexBonus: 2, value: 128, rarity: 4, weight: 0, visualId: "relic" },
  heartstoneAmulet: { id: "heartstoneAmulet", name: "Heartstone Amulet", kind: "armor", slot: "amulet", armor: 0, conBonus: 2, value: 138, rarity: 4, weight: 0, visualId: "relic" },
  sageCharm: { id: "sageCharm", name: "Sage Charm", kind: "armor", slot: "amulet", armor: 0, intBonus: 2, value: 138, rarity: 4, weight: 0, visualId: "relic" },
  loadbearerMail: { id: "loadbearerMail", name: "Loadbearer Mail", kind: "armor", slot: "body", armor: 4, strBonus: 1, guardBonus: 1, value: 92, rarity: 3, weight: 7, visualId: "armor" },
  scholarCowl: { id: "scholarCowl", name: "Scholar Cowl", kind: "armor", slot: "head", armor: 1, intBonus: 1, wardBonus: 1, value: 62, rarity: 3, weight: 1, visualId: "armor" },
  veteranMantle: { id: "veteranMantle", name: "Veteran Mantle", kind: "armor", slot: "cloak", armor: 1, conBonus: 1, guardBonus: 1, value: 78, rarity: 3, weight: 1, visualId: "armor" },
  healingPotion: { id: "healingPotion", name: "Potion of Healing", kind: "consumable", effect: "heal", value: 28, rarity: 1, weight: 1, visualId: "potionRed" },
  manaPotion: { id: "manaPotion", name: "Potion of Mana", kind: "consumable", effect: "mana", value: 34, rarity: 1, weight: 1, visualId: "potionBlue" },
  identifyScroll: { id: "identifyScroll", name: "Scroll of Identify", kind: "consumable", effect: "identify", value: 36, rarity: 2, weight: 0, visualId: "spellbook" },
  mappingScroll: { id: "mappingScroll", name: "Scroll of Mapping", kind: "consumable", effect: "mapping", value: 46, rarity: 2, weight: 0, visualId: "spellbook" },
  teleportScroll: { id: "teleportScroll", name: "Scroll of Teleport", kind: "consumable", effect: "teleport", value: 52, rarity: 3, weight: 0, visualId: "spellbook" },
  removeCurseScroll: { id: "removeCurseScroll", name: "Scroll of Remove Curse", kind: "consumable", effect: "removeCurse", value: 68, rarity: 4, weight: 0, visualId: "spellbook" },
  runeScroll: { id: "runeScroll", name: "Rune of Return", kind: "consumable", effect: "runeReturn", value: 90, rarity: 5, weight: 0, visualId: "relic" },
  wandLightning: { id: "wandLightning", name: "Wand of Lightning", kind: "charged", effect: "lightning", charges: 5, value: 110, rarity: 4, weight: 1, visualId: "wand" },
  wandSlow: { id: "wandSlow", name: "Wand of Slow Monster", kind: "charged", effect: "slow", charges: 6, value: 92, rarity: 4, weight: 1, visualId: "wand" },
  staffHealing: { id: "staffHealing", name: "Staff of Healing", kind: "charged", effect: "staffHeal", charges: 5, value: 128, rarity: 5, weight: 3, visualId: "wand" },
  spellbookFrost: { id: "spellbookFrost", name: "Spellbook of Frost", kind: "spellbook", spell: "frostBolt", value: 90, rarity: 4, weight: 1, visualId: "spellbook" },
  spellbookFire: { id: "spellbookFire", name: "Spellbook of Fire", kind: "spellbook", spell: "fireball", value: 130, rarity: 5, weight: 1, visualId: "spellbook" },
  spellbookPhase: { id: "spellbookPhase", name: "Spellbook of Phase Door", kind: "spellbook", spell: "phaseDoor", value: 96, rarity: 4, weight: 1, visualId: "spellbook" },
  spellbookMind: { id: "spellbookMind", name: "Spellbook of Clairvoyance", kind: "spellbook", spell: "clairvoyance", value: 86, rarity: 4, weight: 1, visualId: "spellbook" },
  spellbookIdentify: { id: "spellbookIdentify", name: "Spellbook of Identify", kind: "spellbook", spell: "identify", value: 82, rarity: 4, weight: 1, visualId: "spellbook" },
  spellbookSlow: { id: "spellbookSlow", name: "Spellbook of Slow Monster", kind: "spellbook", spell: "slowMonster", value: 92, rarity: 5, weight: 1, visualId: "spellbook" },
  spellbookCurse: { id: "spellbookCurse", name: "Spellbook of Remove Curse", kind: "spellbook", spell: "removeCurse", value: 120, rarity: 5, weight: 1, visualId: "spellbook" },
  spellbookSerious: { id: "spellbookSerious", name: "Spellbook of Major Healing", kind: "spellbook", spell: "cureSerious", value: 112, rarity: 5, weight: 1, visualId: "spellbook" },
  spellbookShield: { id: "spellbookShield", name: "Spellbook of Shield", kind: "spellbook", spell: "shield", value: 72, rarity: 3, weight: 1, visualId: "spellbook" },
  spellbookStone: { id: "spellbookStone", name: "Spellbook of Stone Skin", kind: "spellbook", spell: "stoneSkin", value: 116, rarity: 5, weight: 1, visualId: "spellbook" },
  spellbookResistFire: { id: "spellbookResistFire", name: "Spellbook of Fire Ward", kind: "spellbook", spell: "resistFire", value: 88, rarity: 4, weight: 1, visualId: "spellbook" },
  spellbookResistCold: { id: "spellbookResistCold", name: "Spellbook of Frost Ward", kind: "spellbook", spell: "resistCold", value: 88, rarity: 4, weight: 1, visualId: "spellbook" },
  spellbookTeleport: { id: "spellbookTeleport", name: "Spellbook of Teleport", kind: "spellbook", spell: "teleport", value: 124, rarity: 5, weight: 1, visualId: "spellbook" },
  spellbookLight: { id: "spellbookLight", name: "Spellbook of Light", kind: "spellbook", spell: "light", value: 52, rarity: 2, weight: 1, visualId: "spellbook" },
  spellbookTraps: { id: "spellbookTraps", name: "Spellbook of Trap Sight", kind: "spellbook", spell: "detectTraps", value: 76, rarity: 3, weight: 1, visualId: "spellbook" },
  spellbookHold: { id: "spellbookHold", name: "Spellbook of Holding", kind: "spellbook", spell: "holdMonster", value: 120, rarity: 5, weight: 1, visualId: "spellbook" },
  spellbookLightning: { id: "spellbookLightning", name: "Spellbook of Lightning", kind: "spellbook", spell: "lightningBolt", value: 134, rarity: 5, weight: 1, visualId: "spellbook" },
  pathfinderSandals: { id: "pathfinderSandals", name: "Pathfinder Sandals", kind: "armor", slot: "feet", armor: 1, dexBonus: 1, searchBonus: 2, lightBonus: 1, value: 84, rarity: 3, weight: 1, visualId: "armor" },
  surveyorCharm: { id: "surveyorCharm", name: "Surveyor Charm", kind: "armor", slot: "amulet", armor: 0, searchBonus: 2, lightBonus: 1, manaBonus: 1, value: 104, rarity: 4, weight: 0, visualId: "relic" },
  brigandVest: { id: "brigandVest", name: "Brigand Vest", kind: "armor", slot: "body", armor: 4, dexBonus: 1, searchBonus: 1, value: 78, rarity: 2, weight: 5, visualId: "armor" },
  wardedGreaves: { id: "wardedGreaves", name: "Warded Greaves", kind: "armor", slot: "feet", armor: 2, guardBonus: 1, wardBonus: 1, value: 72, rarity: 3, weight: 3, visualId: "armor" },
  brokenDagger: { id: "brokenDagger", name: "Broken Dagger", kind: "junk", value: 6, rarity: 2, weight: 2, visualId: "sword" },
  rustedMail: { id: "rustedMail", name: "Rusted Mail", kind: "junk", value: 10, rarity: 3, weight: 7, visualId: "armor" },
  runestone: { id: "runestone", name: "Runestone of the Winds", kind: "quest", value: 0, rarity: 99, visualId: "relic" }
};

export const LOOT_AFFIX_DEFS = {
  scouts: {
    id: "scouts",
    name: "Scout's",
    category: "utility",
    description: "Built for route-finding, search, and clean movement through uncertain rooms.",
    stats: { dexBonus: 1, searchBonus: 2, lightBonus: 1 },
    tags: ["scouting", "utility"]
  },
  wardens: {
    id: "wardens",
    name: "Warden's",
    category: "reliable",
    description: "Layered guard and ward gear for longer descents.",
    stats: { guardBonus: 1, wardBonus: 1 },
    tags: ["guard", "ward"]
  },
  gravebane: {
    id: "gravebane",
    name: "Gravebane",
    category: "reliable",
    description: "A favored answer to crypt floors and undead pressure.",
    stats: { bonusVsUndead: 3, critBonus: 1 },
    tags: ["anti-undead", "precision"]
  },
  stormtouched: {
    id: "stormtouched",
    name: "Stormtouched",
    category: "utility",
    description: "Channels mana cleanly and softens overcast costs.",
    stats: { manaBonus: 2, overcastRelief: 1 },
    tags: ["mana", "overcast"]
  },
  executioners: {
    id: "executioners",
    name: "Executioner's",
    category: "reliable",
    description: "Sharpens pressure against injured or pinned targets.",
    stats: { power: 1, critBonus: 2 },
    tags: ["crit", "offense"]
  },
  hollow: {
    id: "hollow",
    name: "Hollow",
    category: "risky",
    description: "Cursed power that hits harder but leaves less margin.",
    stats: { power: 2, guardBonus: -1, cursedBias: true },
    tags: ["cursed", "power"]
  }
};

export const ROOM_EVENT_DEFS = {
  wounded_survivor: {
    id: "wounded_survivor",
    label: "Wounded Survivor",
    summary: "A battered holdout offers a reward if you reach them before the floor turns ugly.",
    eventType: "rescue",
    guide: "A survivor is still breathing somewhere on this floor.",
    roomHint: "A blood trail and broken kit mark a desperate holdout.",
    pressureText: "The wounded survivor will not last if the floor stays loud.",
    rewardText: "The survivor trades hard-kept supplies for the rescue.",
    propId: "rescueBanner",
    reward: { type: "item", itemId: "healingPotion", extraItemId: "mappingScroll" }
  },
  sealed_reliquary: {
    id: "sealed_reliquary",
    label: "Sealed Reliquary",
    summary: "A locked reliquary promises stronger treasure if you risk opening it.",
    eventType: "cache",
    guide: "A sealed reliquary is waiting in one of the deeper rooms.",
    roomHint: "Old ward marks and a sealed stand suggest preserved valuables.",
    pressureText: "Breaking the reliquary will stir the floor and draw attention.",
    rewardText: "The reliquary cracks open and yields prepared treasure.",
    propId: "relicPedestal",
    reward: { type: "treasure", quality: "elite" }
  },
  failed_summoning: {
    id: "failed_summoning",
    label: "Failed Summoning",
    summary: "An unstable ritual room offers power, but it can wake the wrong thing.",
    eventType: "ritual",
    guide: "An unstable ritual chamber is active on this floor.",
    roomHint: "Burnt circles and split glyphs hum underfoot.",
    pressureText: "The ritual room can feed pressure into the whole floor.",
    rewardText: "You pull power from the ritual before it collapses.",
    propId: "shrineSeal",
    reward: { type: "mana", amount: 1 }
  },
  barricaded_hold: {
    id: "barricaded_hold",
    label: "Barricaded Hold",
    summary: "A fortified room anchors an elite-led defensive pack.",
    eventType: "eliteRoom",
    guide: "One room on this floor has been turned into a holdout.",
    roomHint: "Furniture and shields choke the doorway into a fortified hold.",
    pressureText: "The holdout is coordinating the floor's defenders.",
    rewardText: "Breaking the hold leaves behind disciplined war gear.",
    propId: "barricade",
    reward: { type: "treasure", quality: "guarded" }
  },
  cursed_library: {
    id: "cursed_library",
    label: "Cursed Library",
    summary: "A dead study offers lore and tools, but the books bite back.",
    eventType: "library",
    guide: "A ruined library still holds dangerous knowledge.",
    roomHint: "Spell ash and chained books cover the room.",
    pressureText: "The library is loud with ward-breaks and old curses.",
    rewardText: "You salvage a spellbook and a page of useful warding notes.",
    propId: "archiveStack",
    reward: { type: "spellbook" }
  },
  route_cache: {
    id: "route_cache",
    label: "Route Cache",
    summary: "A hidden forward cache offers clean route tools and practical field gear.",
    eventType: "cache",
    guide: "A route cache was left somewhere off the main approach.",
    roomHint: "Chalk arrows and wax-sealed satchels suggest a scout cache.",
    pressureText: "Breaking the cache still makes noise, but it pays back immediately.",
    rewardText: "The cache yields route notes and packed field gear.",
    propId: "cacheClosed",
    reward: { type: "item", itemId: "pathfinderSandals", extraItemId: "mappingScroll" }
  },
  watchers_archive: {
    id: "watchers_archive",
    label: "Watcher's Archive",
    summary: "A warded archive preserves survey tools and notes from earlier descents.",
    eventType: "library",
    guide: "A watch archive still survives on this floor.",
    roomHint: "Ledger shelves and ward-scratched walls mark an old survey post.",
    pressureText: "The archive is brittle and full of broken ward splinters.",
    rewardText: "You strip the archive for route tools and careful warding notes.",
    propId: "loreBook",
    reward: { type: "item", itemId: "surveyorCharm", extraItemId: "wardedGreaves" }
  }
};

export const ENEMY_BEHAVIOR_KITS = {
  pinning_controller: {
    id: "pinning_controller",
    label: "Pinning Controller",
    tell: "Projects a pinning hex when it can see you.",
    summary: "Locks movement before the rest of the squad closes."
  },
  banner_captain: {
    id: "banner_captain",
    label: "Banner Captain",
    tell: "Raises nearby melee pressure and anchors a room push.",
    summary: "Buffs nearby allies and drives formed advances."
  },
  corpse_raiser: {
    id: "corpse_raiser",
    label: "Corpse Raiser",
    tell: "Turns fresh corpses into new pressure if left alone.",
    summary: "Converts dead bodies into revived threats."
  },
  stalker: {
    id: "stalker",
    label: "Stalker",
    tell: "Repositions and disengages instead of standing still.",
    summary: "Uses angles, retreats, and re-entry pressure."
  },
  breaker: {
    id: "breaker",
    label: "Breaker",
    tell: "Punishes shielded or heavily guarded targets.",
    summary: "Targets defensive builds and breaks layered guard."
  },
  coward_caster: {
    id: "coward_caster",
    label: "Coward Caster",
    tell: "Retreats, summons, and attacks from behind others.",
    summary: "Avoids fair trades and drags fights out."
  }
};

export const TEMPLE_SERVICES = [
  { id: "heal", name: "Healing", price: 40, description: "Restore hit points and mana." },
  { id: "restore", name: "Restoration", price: 90, description: "Recover lost Constitution and mana." },
  { id: "removeCurse", name: "Remove Curse", price: 120, description: "Break curses on all carried gear." },
  { id: "runeReturn", name: "Rune of Return", price: 160, description: "Receive a fresh rune scroll." }
];

export const MONSTER_DEFS = [
  { id: "rat", name: "Giant Rat", depth: 1, hp: 6, attack: 3, defense: 7, damage: [1, 4], exp: 12, gold: [2, 10], color: "#8e8e75", sprite: "rat", visualId: "rat", tactic: "pack", moveSpeed: 100 },
  { id: "kobold", name: "Kobold", depth: 1, hp: 8, attack: 4, defense: 8, damage: [1, 5], exp: 15, gold: [4, 12], color: "#b19061", sprite: "kobold", visualId: "kobold", tactic: "pack", moveSpeed: 94 },
  { id: "slinger", name: "Kobold Slinger", depth: 1, hp: 7, attack: 5, defense: 8, damage: [1, 4], exp: 18, gold: [4, 12], color: "#b89066", sprite: "kobold", visualId: "kobold", tactic: "skirmish", moveSpeed: 78, ranged: { range: 5, damage: [1, 4], color: "#e0c7a2" } },
  { id: "goblin", name: "Goblin", depth: 2, hp: 12, attack: 5, defense: 9, damage: [1, 6], exp: 24, gold: [5, 18], color: "#6e9d4f", sprite: "goblin", visualId: "goblin", tactic: "pack", moveSpeed: 96 },
  { id: "archer", name: "Goblin Archer", depth: 2, hp: 11, attack: 6, defense: 9, damage: [1, 6], exp: 28, gold: [6, 20], color: "#8caf56", sprite: "goblin", visualId: "goblin", tactic: "skirmish", moveSpeed: 80, ranged: { range: 6, damage: [1, 5], color: "#c2a56a" } },
  { id: "wolf", name: "Dire Wolf", depth: 2, hp: 14, attack: 6, defense: 10, damage: [2, 4], exp: 28, gold: [0, 0], color: "#a7a7a7", sprite: "wolf", visualId: "wolf", abilities: ["charge"], tactic: "charge", moveSpeed: 104 },
  { id: "skeleton", name: "Skeleton", depth: 2, hp: 18, attack: 7, defense: 11, damage: [2, 5], exp: 40, gold: [8, 22], color: "#d9d9ca", sprite: "skeleton", visualId: "skeleton", tactic: "line", moveSpeed: 84 },
  { id: "orc", name: "Orc", depth: 3, hp: 22, attack: 8, defense: 11, damage: [2, 6], exp: 46, gold: [10, 28], color: "#709243", sprite: "orc", visualId: "orc", tactic: "press", moveSpeed: 90 },
  { id: "pikeguard", name: "Pike Guard", depth: 3, hp: 24, attack: 9, defense: 12, damage: [2, 6], exp: 52, gold: [12, 30], color: "#8f7b58", sprite: "orc", visualId: "orc", tactic: "line", moveSpeed: 82 },
  { id: "slime", name: "Ochre Jelly", depth: 4, hp: 26, attack: 8, defense: 10, damage: [2, 6], exp: 52, gold: [0, 0], color: "#c8a73c", sprite: "slime", visualId: "slime", tactic: "press", moveSpeed: 68 },
  { id: "boneArcher", name: "Bone Archer", depth: 4, hp: 20, attack: 8, defense: 12, damage: [2, 5], exp: 60, gold: [12, 34], color: "#d9d9ca", sprite: "skeleton", visualId: "skeleton", tactic: "skirmish", moveSpeed: 78, ranged: { range: 6, damage: [2, 5], color: "#d9c18a" } },
  { id: "cultAdept", name: "Cult Adept", depth: 4, hp: 24, attack: 9, defense: 12, damage: [2, 5], exp: 64, gold: [12, 38], color: "#7566a6", sprite: "mage", visualId: "mage", spells: ["slowMonster", "magicMissile"], abilities: ["slow"], tactic: "control", moveSpeed: 84 },
  { id: "troll", name: "Troll", depth: 4, hp: 36, attack: 10, defense: 12, damage: [2, 8], exp: 80, gold: [16, 40], color: "#5f7b3f", sprite: "troll", visualId: "troll", abilities: ["charge"], tactic: "charge", moveSpeed: 84 },
  { id: "wraith", name: "Wraith", depth: 5, hp: 30, attack: 11, defense: 14, damage: [3, 6], exp: 98, gold: [18, 54], color: "#b4a7df", sprite: "wraith", visualId: "wraith", abilities: ["phase", "drain"], tactic: "phase", moveSpeed: 94 },
  { id: "graveHound", name: "Grave Hound", depth: 5, hp: 30, attack: 11, defense: 13, damage: [2, 7], exp: 94, gold: [8, 24], color: "#9ca39f", sprite: "wolf", visualId: "wolf", abilities: ["charge", "drain"], tactic: "charge", moveSpeed: 102 },
  { id: "ogre", name: "Ogre", depth: 5, hp: 44, attack: 12, defense: 13, damage: [3, 7], exp: 106, gold: [20, 68], color: "#ab7c50", sprite: "ogre", visualId: "ogre", abilities: ["charge"], tactic: "charge", moveSpeed: 80 },
  { id: "shaman", name: "Orc Shaman", depth: 5, hp: 28, attack: 11, defense: 13, damage: [2, 6], exp: 110, gold: [18, 58], color: "#4a8f8f", sprite: "mage", visualId: "mage", spells: ["slowMonster", "holdMonster"], abilities: ["slow", "summon"], tactic: "control", moveSpeed: 82 },
  { id: "warlock", name: "Warlock", depth: 6, hp: 34, attack: 12, defense: 15, damage: [3, 8], exp: 124, gold: [28, 80], color: "#7854b8", sprite: "mage", visualId: "mage", spells: ["magicMissile", "holdMonster", "lightningBolt"], abilities: ["teleport", "summon"], tactic: "control", moveSpeed: 84 },
  { id: "wyrm", name: "Cave Wyrm", depth: 7, hp: 60, attack: 14, defense: 16, damage: [4, 8], exp: 180, gold: [30, 96], color: "#be5b33", sprite: "dragon", visualId: "dragon", tactic: "skirmish", moveSpeed: 86, ranged: { range: 5, damage: [3, 7], color: "#f08c4f" } },
  { id: "gatekeeper", name: "Gatekeeper Hroth", depth: 3, hp: 34, attack: 10, defense: 13, damage: [2, 7], exp: 140, gold: [30, 60], color: "#b37f54", sprite: "orc", visualId: "orc", unique: true, elite: true, spells: ["holdMonster"], abilities: ["charge"], tactic: "press", role: "elite", moveSpeed: 90 },
  { id: "cryptlord", name: "Veyra The Crypt Lord", depth: 5, hp: 48, attack: 12, defense: 15, damage: [3, 8], exp: 210, gold: [50, 90], color: "#a98bdd", sprite: "mage", visualId: "mage", unique: true, elite: true, spells: ["holdMonster", "slowMonster", "lightningBolt"], abilities: ["summon", "phase"], tactic: "control", role: "elite", moveSpeed: 86 },
  { id: "stormWarden", name: "The Storm Warden", depth: 7, hp: 78, attack: 15, defense: 18, damage: [4, 9], exp: 320, gold: [0, 0], color: "#d6c08a", sprite: "dragon", visualId: "dragon", unique: true, elite: true, spells: ["lightningBolt", "frostBolt", "holdMonster"], abilities: ["charge"], tactic: "skirmish", role: "elite", moveSpeed: 92, ranged: { range: 6, damage: [4, 7], color: "#ffd676" } }
];

export const SHOPS = {
  general: {
    name: "Provisioner",
    greeting: "Food is scarce in the mountain, but charms, books, and restoratives are not.",
    stock: ["healingPotion", "manaPotion", "identifyScroll", "mappingScroll", "teleportScroll", "travelBoots", "shadowCloak", "scoutCloak", "spellbookMind", "removeCurseScroll", "torchCharm", "emberCharm", "frostCharm"]
  },
  armory: {
    name: "Armory",
    greeting: "Steel, leather, and hard-won practical judgment.",
    stock: ["knife", "shortSword", "rapier", "handAxe", "broadSword", "mace", "battleAxe", "warPick", "leatherArmor", "brigandine", "chainMail", "scaleMail", "plateMail", "buckler", "kiteShield", "towerShield", "paddedCap", "bronzeHelm", "hoodedCowl", "ironHelm", "greaves", "strideBoots"]
  },
  guild: {
    name: "Wizard's Guild",
    greeting: "Arcane work is expensive. So is burying careless apprentices.",
    stock: ["oakStaff", "ashStaff", "runeBlade", "spellfocusRing", "ironRing", "wardingAmulet", "wardedCloak", "spellbookFrost", "spellbookFire", "spellbookPhase", "spellbookIdentify", "spellbookSlow", "spellbookCurse", "spellbookShield", "spellbookStone", "spellbookHold", "spellbookLightning", "spellbookTeleport", "manaPotion", "wandLightning", "wandSlow", "staffHealing"]
  },
  temple: {
    name: "Temple",
    greeting: "Restoration, blessing, and the expensive reversal of reckless mistakes.",
    stock: ["healingPotion", "manaPotion", "goldCharm", "torchCharm", "emberCharm", "frostCharm", "wardingAmulet", "spellbookMind", "spellbookSerious", "spellbookResistFire", "spellbookResistCold", "runeScroll", "surveyorCharm"]
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
  pikeguard: "frontliner",
  slime: "controller",
  boneArcher: "artillery",
  cultAdept: "controller",
  troll: "frontliner",
  wraith: "skirmisher",
  graveHound: "hunter",
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
  },
  kill_box: {
    id: "kill_box",
    label: "Kill Box",
    roles: ["artillery", "artillery", "frontliner", "controller"]
  },
  summoner_escort: {
    id: "summoner_escort",
    label: "Summoner Escort",
    roles: ["summoner", "frontliner", "artillery", "frontliner"]
  },
  bruiser_hunt: {
    id: "bruiser_hunt",
    label: "Bruiser Hunt",
    roles: ["elite", "skirmisher", "hunter", "frontliner"]
  },
  crypt_control: {
    id: "crypt_control",
    label: "Crypt Control",
    roles: ["controller", "summoner", "frontliner", "artillery"]
  },
  torch_patrol: {
    id: "torch_patrol",
    label: "Torch Patrol",
    roles: ["frontliner", "artillery", "hunter"]
  },
  grave_picket: {
    id: "grave_picket",
    label: "Grave Picket",
    roles: ["hunter", "frontliner", "controller"]
  }
};

export const DEPTH_THEMES = [
  {
    id: "vermin_halls",
    name: "Vermin Halls",
    depths: [1, 2],
    summary: "Fast packs, anxious corridors, and too many eyes in the dark.",
    templates: ["wolf_pack", "ambush_cell", "shield_wall", "bruiser_hunt", "torch_patrol"],
    monsterBias: ["rat", "kobold", "slinger", "goblin", "wolf"]
  },
  {
    id: "barracks",
    name: "Broken Barracks",
    depths: [2, 3, 4],
    summary: "Disciplined pressure from archers, shields, and orc raiders.",
    templates: ["shield_wall", "orc_push", "ambush_cell", "kill_box", "bruiser_hunt", "torch_patrol"],
    monsterBias: ["goblin", "archer", "skeleton", "orc", "troll"]
  },
  {
    id: "crypts",
    name: "Echo Crypts",
    depths: [4, 5, 6, 7],
    summary: "Necromancy, phasing threats, and reinforcements that never stay dead long enough.",
    templates: ["necromancer_screen", "shield_wall", "orc_push", "summoner_escort", "crypt_control", "grave_picket"],
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
    rewardType: "relic",
    visualId: "relicPedestal"
  },
  purge_nest: {
    id: "purge_nest",
    label: "Purge The Nest",
    shortLabel: "Purge Nest",
    intro: "A breeding nest is feeding the floor. Clear its defenders and crush it.",
    summary: "Clear the nest room, then interact with the nest to end the threat and earn a reward.",
    completion: "interact",
    rewardType: "boon",
    visualId: "broodNest"
  },
  rescue_captive: {
    id: "rescue_captive",
    label: "Rescue The Captive",
    shortLabel: "Rescue Captive",
    intro: "Someone is still alive below. Reach them before the floor tightens around you.",
    summary: "Find the captive, clear the room, and escort the rescue by interacting with the prison marker.",
    completion: "interact",
    rewardType: "rumor",
    visualId: "prisonerCell"
  },
  seal_shrine: {
    id: "seal_shrine",
    label: "Seal The Shrine",
    shortLabel: "Seal Shrine",
    intro: "An unstable shrine is feeding the floor's hostility. Seal it before pushing deeper.",
    summary: "Reach the shrine and perform the seal. Expect noise and retaliation.",
    completion: "interact",
    rewardType: "boon",
    visualId: "shrineSeal"
  },
  secure_supplies: {
    id: "secure_supplies",
    label: "Recover The Cache",
    shortLabel: "Recover Cache",
    intro: "A sealed field cache was left behind in the chaos. Recover it before the floor strips it bare.",
    summary: "Push to the marked cache, claim it, and carry the supplies back into your run.",
    completion: "pickup",
    rewardType: "boon",
    visualId: "vaultChest"
  },
  recover_waystone: {
    id: "recover_waystone",
    label: "Recover The Waystone",
    shortLabel: "Recover Waystone",
    intro: "A survey waystone is still intact somewhere ahead. Recover it before the floor breaks it apart.",
    summary: "Push to the marked chamber, claim the waystone, and turn the recovery into cleaner next-floor intel.",
    completion: "pickup",
    rewardType: "rumor",
    visualId: "relicPedestal"
  },
  secure_ledger: {
    id: "secure_ledger",
    label: "Recover The Ledger",
    shortLabel: "Recover Ledger",
    intro: "A survey ledger is still intact below. Recover it before the floor tears the route notes apart.",
    summary: "Claim the marked archive ledger and turn it into cleaner route planning for what comes next.",
    completion: "pickup",
    rewardType: "rumor",
    visualId: "archiveStack"
  },
  purify_well: {
    id: "purify_well",
    label: "Purify The Well",
    shortLabel: "Purify Well",
    intro: "A corrupted well is spoiling the air on this floor. Clear it and purify the water before the floor closes in.",
    summary: "Clear the chamber, then purify the well for a full refill and a boon before the floor answers back.",
    completion: "interact",
    rewardType: "boon",
    visualId: "well"
  },
  break_beacon: {
    id: "break_beacon",
    label: "Break The Beacon",
    shortLabel: "Break Beacon",
    intro: "A warning beacon is feeding patrol pressure deeper in the halls.",
    summary: "Clear the beacon chamber, then smash the signal focus before it draws more patrols.",
    completion: "interact",
    rewardType: "rumor",
    visualId: "beaconFocus"
  },
  light_watchfire: {
    id: "light_watchfire",
    label: "Light The Watchfire",
    shortLabel: "Light Watchfire",
    intro: "A dead watchfire sits in the marked chamber. Rekindle it before the floor's route memory is lost.",
    summary: "Clear the room, then light the watchfire to reveal more of the floor and secure a cleaner push.",
    completion: "interact",
    rewardType: "boon",
    visualId: "beaconFocus"
  }
};

export const MILESTONE_DEFS = {
  depth3_gatekeeper: {
    id: "depth3_gatekeeper",
    depth: 3,
    bossId: "gatekeeper",
    name: "The Gatekeeper",
    roomLabel: "Gatehouse Reliquary",
    intro: "The deeper halls were sealed from within, and the old gate captain still enforces that order.",
    journal: "Break the Gatekeeper on depth 3 and learn why the keep's own defenders barred the lower route.",
    clearText: "The Gatekeeper falls, and the broken seal of the barracks finally yields.",
    rewardType: "perk",
    guideLabel: "Gatekeeper",
    storyTag: "depth3",
    discoveryId: "gatehouse_orders",
    bossStory: "Hroth was the captain ordered to close the lower keep when the Runestone was taken below."
  },
  depth5_cryptlord: {
    id: "depth5_cryptlord",
    depth: 5,
    bossId: "cryptlord",
    name: "The Crypt Lord",
    roomLabel: "Hall of Echoed Names",
    intro: "The dead lord below preserved rank, ritual, and fear long after the keep should have been laid to rest.",
    journal: "Break Veyra in the crypt halls and uncover how the lower court twisted the Runestone's loss into a burial oath.",
    clearText: "Veyra collapses into ash, and the crypt's false court finally loses its voice.",
    rewardType: "relic",
    guideLabel: "Crypt Lord",
    storyTag: "depth5",
    discoveryId: "crypt_epitaph",
    bossStory: "Veyra kept the dead enthroned so the town above would never reclaim what the court hid below."
  },
  depth7_stormwarden: {
    id: "depth7_stormwarden",
    depth: 7,
    bossId: "stormWarden",
    name: "The Storm Warden",
    roomLabel: "Runestone Sanctum",
    intro: "The final chamber still obeys an oath sworn to the Runestone before the keep fell into fear and silence.",
    journal: "Cross the sanctum, break the Storm Warden, and reclaim the Runestone that once held the valley together.",
    clearText: "The Storm Warden breaks, and the last oath around the Runestone gives way.",
    rewardType: "none",
    guideLabel: "Runestone Guard",
    storyTag: "depth7",
    discoveryId: "storm_oath",
    bossStory: "The Warden was bound to guard the stone itself, not the ruined court that chose to hide behind it."
  }
};

export const OPTIONAL_ENCOUNTER_DEFS = {
  cursed_cache: {
    id: "cursed_cache",
    label: "Cursed Cache",
    summary: "Fast value, real risk. Open it for gold and a tainted item.",
    unlock: "archive_maps",
    visualId: "cacheClosed"
  },
  ghost_merchant: {
    id: "ghost_merchant",
    label: "Ghost Merchant",
    summary: "Spend gold or blood for a precise tool while the dead keep score.",
    unlock: "ghost_bargains",
    visualId: "ghostMerchant"
  },
  blood_altar: {
    id: "blood_altar",
    label: "Blood Altar",
    summary: "Trade life for immediate power and a spike in floor danger.",
    visualId: "bloodAltar"
  },
  vault_room: {
    id: "vault_room",
    label: "Vault Room",
    summary: "A high-value chamber guarded by a formed squad.",
    visualId: "vaultChest"
  },
  scout_cache: {
    id: "scout_cache",
    label: "Scout Cache",
    summary: "Route notes and emergency stock in exchange for drawing fresh attention.",
    visualId: "cacheClosed"
  },
  smuggler_cache: {
    id: "smuggler_cache",
    label: "Smuggler Cache",
    summary: "Fast extract tools and hidden coin, if you are willing to announce that you found them.",
    unlock: "supply_cache",
    visualId: "cacheClosed"
  },
  oath_shrine: {
    id: "oath_shrine",
    label: "Oath Shrine",
    summary: "Trade blood or mana for warded gear and sharper next-floor leverage.",
    unlock: "temple_favors",
    visualId: "bloodAltar"
  },
  pilgrim_pool: {
    id: "pilgrim_pool",
    label: "Pilgrim Pool",
    summary: "Wash off curses and strain, but the glow tells the floor exactly where you are.",
    unlock: "temple_favors",
    visualId: "well"
  },
  moon_well: {
    id: "moon_well",
    label: "Moon Well",
    summary: "Restore fully and reveal the floor, but the glow stirs the halls.",
    visualId: "well"
  },
  surveyor_stash: {
    id: "surveyor_stash",
    label: "Surveyor Stash",
    summary: "A ledger case with route marks and a clean escape line, if you are willing to announce that you found it.",
    unlock: "archive_maps",
    visualId: "cacheClosed"
  },
  ember_cache: {
    id: "ember_cache",
    label: "Ember Cache",
    summary: "Emergency supplies for a second push: resist stock, field gold, and a little extra heat on the floor.",
    unlock: "guild_license",
    visualId: "cacheClosed"
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
    description: "Provisioner stocks one extra emergency tool each refresh, and smuggler caches begin appearing below."
  },
  guild_license: {
    id: "guild_license",
    name: "Guild License",
    description: "Wizard's Guild carries deeper books, battlefield wards, and charged tools."
  },
  temple_favors: {
    id: "temple_favors",
    name: "Temple Favors",
    description: "Temple services are cheaper, and blood altars, oath shrines, and pilgrim pools start appearing below."
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

export const CONTRACT_DEFS = {
  pressed_descent: {
    id: "pressed_descent",
    name: "Pressed Descent",
    summary: "More rumor value, less breathing room.",
    description: "Reinforcement clocks start shorter, but resolved objectives pay one extra rumor token."
  },
  greed_ledger: {
    id: "greed_ledger",
    name: "Greed Ledger",
    summary: "Optional rooms pay more, and the floor notices.",
    description: "Greed rooms pay extra gold and one extra rumor token, but greed raises pressure harder."
  },
  scholar_road: {
    id: "scholar_road",
    name: "Scholar's Road",
    summary: "Cleaner route reads for a frailer start.",
    description: "Search reveals more route at a time and objectives pay extra rumor, but you begin each run with less maximum health."
  },
  hunters_call: {
    id: "hunters_call",
    name: "Hunter's Call",
    summary: "Elite bounty up, elite pressure up.",
    description: "Elite kills pay extra gold and rumor, but reinforcement waves are more likely to include an elite."
  },
  ration_run: {
    id: "ration_run",
    name: "Ration Run",
    summary: "Cleaner opening, less idle time.",
    description: "Begin with a healing potion and mapping scroll, but waiting, resting, and searching raise pressure harder."
  },
  sealed_return: {
    id: "sealed_return",
    name: "Sealed Return",
    summary: "Safer extract tools, harsher greed tax.",
    description: "Begin with a Rune of Return and one rumor token, but greed raises pressure harder and you begin runs with less maximum health."
  },
  route_debt: {
    id: "route_debt",
    name: "Route Debt",
    summary: "Sharper routes, harsher scouting tax.",
    description: "Begin with one rumor token and larger route reveals, but you start runs with lower maximum health and searching raises pressure harder."
  },
  trophy_path: {
    id: "trophy_path",
    name: "Trophy Path",
    summary: "Bigger elite payoff, meaner elite pressure.",
    description: "Elite kills pay extra gold and rumor, but reinforcement waves are more likely to include elite threats."
  },
  greedy_burden: {
    id: "greedy_burden",
    name: "Greedy Burden",
    summary: "Greed pays harder, weight punishes harder.",
    description: "Greed rooms pay more and town buyers pay better after return, but burden penalties worsen during the run and greed raises pressure harder."
  },
  last_light: {
    id: "last_light",
    name: "Last Light",
    summary: "Emergency opener, no room to idle.",
    description: "Begin with emergency stock, but waiting, resting, and searching all accelerate pressure harder than usual."
  }
};

export const COMMENDATION_DEFS = {
  clean_extract: {
    id: "clean_extract",
    name: "Clean Extract",
    summary: "Archive badge for returning without taking a greed room.",
    rewardLabel: "Archive badge"
  },
  greed_specialist: {
    id: "greed_specialist",
    name: "Greed Specialist",
    summary: "Unlocks Greedy Burden after a greed-heavy extract.",
    rewardLabel: "Unlocks contract: Greedy Burden"
  },
  elite_hunter: {
    id: "elite_hunter",
    name: "Elite Hunter",
    summary: "Unlocks Trophy Path after an elite-heavy run.",
    rewardLabel: "Unlocks contract: Trophy Path"
  },
  route_reader: {
    id: "route_reader",
    name: "Route Reader",
    summary: "Unlocks Route Debt after a route-heavy extract.",
    rewardLabel: "Unlocks contract: Route Debt"
  },
  curse_survivor: {
    id: "curse_survivor",
    name: "Curse Survivor",
    summary: "Archive badge for extracting while carrying a curse or constitution strain.",
    rewardLabel: "Archive badge"
  },
  class_loyalist: {
    id: "class_loyalist",
    name: "Class Loyalist",
    summary: "Loyal class streaks earn a small prep edge on future runs.",
    rewardLabel: "Prep bonus: +1 rumor token on matching class starts"
  }
};

export const CLASS_MASTERY_DEFS = {
  fighter: {
    id: "fighter",
    name: "Fighter Mastery",
    ranks: [
      {
        rank: 1,
        trigger: "objective",
        name: "Field Dressing",
        description: "Start future Fighter runs with one extra healing potion.",
        itemIds: ["healingPotion"]
      },
      {
        rank: 2,
        trigger: "extract",
        name: "Shield Drill",
        description: "Start future Fighter runs with a padded cap.",
        itemIds: ["paddedCap"]
      },
      {
        rank: 3,
        trigger: "objective",
        name: "Iron March",
        description: "Start future Fighter runs with warded greaves.",
        itemIds: ["wardedGreaves"]
      },
      {
        rank: 4,
        trigger: "extract",
        name: "Siege Lessons",
        description: "Start future Fighter runs already knowing Shield.",
        spellIds: ["shield"]
      }
    ]
  },
  rogue: {
    id: "rogue",
    name: "Rogue Mastery",
    ranks: [
      {
        rank: 1,
        trigger: "objective",
        name: "Route Notes",
        description: "Start future Rogue runs with a mapping scroll.",
        itemIds: ["mappingScroll"]
      },
      {
        rank: 2,
        trigger: "extract",
        name: "Street Contacts",
        description: "Start future Rogue runs with one rumor token.",
        rumorTokens: 1
      },
      {
        rank: 3,
        trigger: "objective",
        name: "Forward Kit",
        description: "Start future Rogue runs with pathfinder sandals.",
        itemIds: ["pathfinderSandals"]
      },
      {
        rank: 4,
        trigger: "extract",
        name: "Clean Exit",
        description: "Start future Rogue runs with a teleport scroll.",
        itemIds: ["teleportScroll"]
      }
    ]
  },
  wizard: {
    id: "wizard",
    name: "Wizard Mastery",
    ranks: [
      {
        rank: 1,
        trigger: "objective",
        name: "Guild Stores",
        description: "Start future Wizard runs with one extra mana potion.",
        itemIds: ["manaPotion"]
      },
      {
        rank: 2,
        trigger: "extract",
        name: "Prepared Study",
        description: "Start future Wizard runs already knowing Identify.",
        spellIds: ["identify"]
      },
      {
        rank: 3,
        trigger: "objective",
        name: "Warding Primer",
        description: "Start future Wizard runs with a Spellbook of Shield.",
        itemIds: ["spellbookShield"]
      },
      {
        rank: 4,
        trigger: "extract",
        name: "Far Sight",
        description: "Start future Wizard runs already knowing Clairvoyance.",
        spellIds: ["clairvoyance"]
      }
    ]
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
  gatekeeper: {
    id: "gatekeeper",
    text: "A scarred gatekeeper still commands the broken barracks below."
  },
  cryptlord: {
    id: "cryptlord",
    text: "The fifth depth is ruled by a named crypt lord and her dead household."
  },
  stormwarden: {
    id: "stormwarden",
    text: "The lowest sanctum still serves a storm-bound guardian and the Runestone behind it."
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
  },
  supplies: {
    id: "supplies",
    text: "A sealed field cache lies below. Whoever reaches it first will fight better for the rest of the floor."
  },
  waystone: {
    id: "waystone",
    text: "A survey waystone still survives below. Recover it and the next floor will read cleaner."
  },
  ledger: {
    id: "ledger",
    text: "An old route ledger still survives below. Recover it and the next descent will read cleaner."
  },
  shrine_path: {
    id: "shrine_path",
    text: "A ruined shrine is pulsing below. Clear the room first, then seal it before pressure breaks the line."
  },
  purify_well: {
    id: "purify_well",
    text: "A corrupted well is spoiling one floor. Purify it fast if you want a clean refill before greed."
  },
  beacon: {
    id: "beacon",
    text: "A warning beacon is waking patrols deeper in the keep. Break it fast if it appears."
  },
  watchfire: {
    id: "watchfire",
    text: "A dead watchfire sits below. Light it and the floor will read more clearly for a few clean turns."
  }
};

export const STORY_NPCS = {
  steward: {
    id: "steward",
    name: "Halric Voss",
    title: "Town Steward",
    role: "Steward of the square and keeper of the old levy rolls."
  },
  templeKeeper: {
    id: "templeKeeper",
    name: "Sister Elira",
    title: "Temple Keeper",
    role: "Priestess who remembers the vows sworn when the keep still watched the valley."
  },
  guildSage: {
    id: "guildSage",
    name: "Magister Iven",
    title: "Guild Sage",
    role: "Old guild scholar who studies the Runestone and the weather it once anchored."
  },
  chronicler: {
    id: "chronicler",
    name: "Osric Dane",
    title: "Banker-Chronicler",
    role: "Ledger keeper who records each descent and keeps the town's surviving testimonies."
  }
};

export const STORY_BEATS = {
  intro: {
    id: "intro",
    title: "The Steward's Charge",
    chapterObjective: "Go north into the keep, learn why its halls were sealed, and trace the Runestone into the lower vaults.",
    scene: [
      {
        speaker: "steward",
        text: "The valley still stands because the keep broke before the storms finished the job. When the Runestone vanished below, the garrison sealed the lower halls and never came back out."
      },
      {
        speaker: "guildSage",
        text: "The stone once held weather, warding, and order in balance. Without it, the keep rotted into factions: soldiers above, dead nobility below, and something older guarding the sanctum."
      },
      {
        speaker: "templeKeeper",
        text: "Bring the Runestone back and the town can breathe again. Learn what happened down there, but do not mistake every guardian for a simple monster."
      }
    ],
    journal: "Halric sent you into the keep to recover the Runestone and learn why the garrison sealed its own lower halls."
  },
  depth3: {
    id: "depth3",
    title: "The Sealed Barracks",
    chapterObjective: "Push below the gatehouse and find who ordered the keep closed against its own town.",
    entryText: "Barracks seals and execution marks still line the stone. This level was closed by loyal hands, not invaders.",
    clearText: "Hroth dies defending an order that should have ended with the keep.",
    returnScene: [
      {
        speaker: "steward",
        text: "The gate captain sealed the lower halls on command, then held that order past death. Whatever happened below was feared more than the storm outside."
      },
      {
        speaker: "chronicler",
        text: "That matches the surviving ledgers. Food and bodies both vanished into the lower stairs in the same week. After that, the keep stopped answering the town."
      }
    ],
    journal: "Hroth's orders prove the barracks sealed the lower keep from within. Someone chose secrecy over evacuation.",
    chronicleLabel: "Learned the barracks sealed the lower keep from within."
  },
  depth5: {
    id: "depth5",
    title: "The False Court Below",
    chapterObjective: "Break the crypt court and learn why the dead kept the Runestone buried instead of returning it to the valley.",
    entryText: "The crypt halls are arranged like a court that refused to admit its kingdom had already died.",
    clearText: "Veyra's court collapses, and with it the lie that the dead preserved the valley by hiding the stone.",
    returnScene: [
      {
        speaker: "guildSage",
        text: "The crypt lord did not guard the Runestone for the valley. She guarded the dignity of a dead court that would rather bury the world than surrender its last symbol of rule."
      },
      {
        speaker: "templeKeeper",
        text: "Then the oath below is broken in two parts: soldiers kept the door, and nobles kept the silence. Only the oldest vow remains now."
      }
    ],
    journal: "Veyra's court preserved the lie that the Runestone had to remain buried. The dead below chose possession over duty.",
    chronicleLabel: "Learned the dead court hid the Runestone to preserve its own broken authority."
  },
  depth7: {
    id: "depth7",
    title: "The Last Oath",
    chapterObjective: "Cross the sanctum, face the final oathbound guardian, and reclaim the Runestone for the town above.",
    entryText: "The sanctum is older than the ruined keep above it. Here the oath is to the stone itself, not to the soldiers or court that failed around it.",
    clearText: "The final oath breaks. The Runestone is no longer kept from the valley by fear, rank, or ritual.",
    journal: "Only the Storm Warden remains between the town and the Runestone. This guardian serves the oldest promise in the keep.",
    chronicleLabel: "Reached the sanctum where the oldest oath still bound the Runestone."
  },
  return: {
    id: "return",
    title: "The Runestone Returned",
    chapterObjective: "The first descent is complete. The town has the Runestone again, but the keep's full history is only beginning to surface.",
    scene: [
      {
        speaker: "steward",
        text: "The square feels different with the stone back in town. The keep above is still ruined, but it is no longer choosing our weather and fear for us."
      },
      {
        speaker: "guildSage",
        text: "You were right about the guardian below. The last oath was not hatred. It was duty twisted loose from the people it was meant to protect."
      },
      {
        speaker: "chronicler",
        text: "I will record this descent properly. The valley remembers storms, not causes. Now we finally have both."
      }
    ],
    journal: "The Runestone has been returned to town. The valley has its first real answer about the keep's fall."
  }
};

export const TOWN_REACTION_DEFS = {
  first_elite: {
    id: "first_elite",
    label: "First Elite Down",
    steward: "Word is spreading that even the keep's named hunters can be broken.",
    guild: "Named foes leave stronger salvage. The guild wants to see what you carry back.",
    bank: "Osric has started a separate line in the ledger for elite kills."
  },
  depth3_gatekeeper: {
    id: "depth3_gatekeeper",
    label: "Gatekeeper Broken",
    steward: "The old barracks seal is broken. Halric starts planning for deeper supply pushes.",
    temple: "Sister Elira offers steadier prices now that the first oath below has cracked.",
    stockTag: "discipline"
  },
  depth5_cryptlord: {
    id: "depth5_cryptlord",
    label: "Crypt Court Broken",
    guild: "Magister Iven starts putting deeper warding tools on the shelf.",
    bank: "Osric records the fall of the false court and loosens rare contracts.",
    stockTag: "deep"
  },
  storm_knowledge: {
    id: "storm_knowledge",
    label: "Storm Knowledge",
    guild: "The guild starts prioritizing storm wards and return tools after your discoveries.",
    temple: "The temple warns that the last oath below is older and harsher than the others.",
    stockTag: "storm"
  },
  curse_pressure: {
    id: "curse_pressure",
    label: "Curse Pressure",
    temple: "The priests recognize the keep's corruption on sight and speak more urgently.",
    stockTag: "restoration"
  },
  route_ledger: {
    id: "route_ledger",
    label: "Route Ledger",
    bank: "Osric keeps a sharper route ledger now. Clean descents are worth more than blind wandering.",
    guild: "The guild has started marking cleaner survey tools for proven route-runners.",
    stockTag: "survey"
  },
  cache_runners: {
    id: "cache_runners",
    label: "Cache Runners",
    steward: "Scouts are posting cleaner notes after your first returns. People are planning deeper pushes again.",
    bank: "The steward wants spare gold turned into stockpiles, not pride. The ledger shows it.",
    stockTag: "supply"
  }
};

export const DISCOVERY_DEFS = {
  gatehouse_orders: {
    id: "gatehouse_orders",
    title: "Torn Gate Orders",
    label: "Torn Orders",
    kind: "orders",
    propId: "loreBook",
    text: "Seal the lower route. No one from the valley enters. No one below returns without the chamberlain's writ. If the Runestone is not restored by dawn, the gate stays barred even against our own.",
    summary: "The gatehouse was ordered to seal the lower keep against the town itself."
  },
  crypt_epitaph: {
    id: "crypt_epitaph",
    title: "Crypt Epitaph",
    label: "Epitaph Slab",
    kind: "epitaph",
    propId: "inscribedStone",
    text: "Here the court keeps faith with stone, rank, and burial. Better the valley weather the storm above than witness the house of the keep surrender what made it sovereign.",
    summary: "The dead court hid the Runestone to preserve rank and sovereignty, not to save the valley."
  },
  storm_oath: {
    id: "storm_oath",
    title: "Sanctum Oath",
    label: "Oath Stone",
    kind: "oath",
    propId: "inscribedStone",
    text: "Guard the Runestone until it is claimed by one who serves the valley over crown, levy, or tomb. Let oath break before the storm is chained to pride again.",
    summary: "The oldest oath was meant to protect the valley from pride, not keep the Runestone hidden forever."
  },
  barracks_roll: {
    id: "barracks_roll",
    title: "Barracks Muster Roll",
    label: "Muster Roll",
    kind: "orders",
    propId: "loreBook",
    text: "Three squads reassigned below. Two returned without helms, and one did not return at all. Margin note: Keep the town ignorant until the chamberlain speaks.",
    summary: "The barracks sent men below in secret and hid the losses from the town."
  },
  shrine_inscription: {
    id: "shrine_inscription",
    title: "Shrine Inscription",
    label: "Shrine Tablet",
    kind: "inscription",
    propId: "inscribedStone",
    text: "The stone governs more than weather. It binds promise to place. Break oath around it, and the house that keeps it will sour before the land does.",
    summary: "The Runestone bound oath and place together; breaking faith around it corrupted the keep."
  },
  weather_log: {
    id: "weather_log",
    title: "Weather Log",
    label: "Weather Log",
    kind: "record",
    propId: "loreBook",
    text: "Wind rose from the valley after the stone was moved below. Frost formed indoors. Quartermaster requests release of the Runestone. Request denied by the court.",
    summary: "The valley began failing as soon as the court moved the Runestone below and refused to return it."
  },
  memorial_slate: {
    id: "memorial_slate",
    title: "Memorial Slate",
    label: "Memorial Slate",
    kind: "epitaph",
    propId: "inscribedStone",
    text: "For the carriers, warders, and nameless who took the stone below believing they would spare the valley. Their oath outlived their wisdom.",
    summary: "Some of the keep's defenders meant to save the valley, but their oath outlived their judgment."
  }
};
