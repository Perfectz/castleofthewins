import { CLASSES, ITEM_DEFS, LOOT_AFFIX_DEFS, MONSTER_DEFS, RACES, SHOPS, SPELLS } from "../data/content.js";
import { choice, randInt, shuffle, structuredCloneCompat } from "./utils.js";

const SPELL_ID_ALIASES = {
  runeReturn: "runeOfReturn"
};

export function canonicalizeSpellId(spellId = "") {
  if (!spellId) {
    return "";
  }
  if (SPELLS[spellId]) {
    return spellId;
  }
  const aliasId = SPELL_ID_ALIASES[spellId];
  return aliasId && SPELLS[aliasId] ? aliasId : "";
}

export function normalizeKnownSpellIds(spellIds = []) {
  if (!Array.isArray(spellIds)) {
    return [];
  }
  return [...new Set(spellIds.map((spellId) => canonicalizeSpellId(spellId)).filter(Boolean))];
}

export function weightedMonster(depth) {
  const options = MONSTER_DEFS.filter((monster) => monster.depth <= depth + 1 && !monster.unique);
  const bucket = [];
  options.forEach((monster) => {
    const weight = Math.max(1, 8 - Math.abs(depth - monster.depth) * 2);
    for (let i = 0; i < weight; i += 1) {
      bucket.push(monster);
    }
  });
  return choice(bucket);
}

export function createMonster(template, x, y) {
  const depthBonus = Math.max(0, (template.depth || 1) - 1);
  const maxHp = template.hp + depthBonus * 3;
  return {
    ...structuredCloneCompat(template),
    x,
    y,
    hp: maxHp,
    maxHp,
    attack: template.attack + Math.floor(depthBonus / 2),
    defense: template.defense + Math.floor(depthBonus / 2),
    exp: template.exp + depthBonus * 6,
    mana: typeof template.mana === "number" ? template.mana : template.spells ? 12 : 0,
    alerted: 0,
    sleeping: Math.random() < 0.4,
    held: 0,
    slowed: 0,
    moveMeter: 100,
    chargeWindup: null,
    intent: null
  };
}

export function createItem(id, overrides = {}) {
  const base = structuredCloneCompat(ITEM_DEFS[id]);
  if (!base) {
    return null;
  }
  const item = { ...base };
  if (item.kind === "weapon" || item.kind === "armor") {
    const rollValue = randInt(-2, 4);
    item.enchantment = rollValue <= -1 ? rollValue : rollValue >= 3 ? rollValue - 1 : 0;
    if (item.enchantment < 0 && Math.random() < 0.78) {
      item.cursed = true;
    }
    item.identified = overrides.identified ?? false;
  } else if (item.kind === "charged") {
    item.charges = randInt(Math.max(1, item.charges - 2), item.charges + 1);
    item.maxCharges = item.charges;
    item.identified = overrides.identified ?? false;
  } else if (item.kind === "spellbook") {
    item.identified = true;
  } else if (item.kind === "consumable") {
    item.identified = true;
  } else if (item.kind === "junk") {
    item.identified = true;
    item.cursed = Math.random() < 0.35;
  } else {
    item.identified = true;
  }
  const resolved = { ...item, ...overrides };
  return applyLootAffix(resolved, resolved.affixId);
}

export function createTownItem(id) {
  const base = ITEM_DEFS[id];
  const overrides = { identified: true, cursed: false };
  if (base && (base.kind === "weapon" || base.kind === "armor")) {
    overrides.enchantment = 0;
  }
  if (base && base.kind === "charged") {
    overrides.charges = base.charges;
    overrides.maxCharges = base.charges;
  }
  return createItem(id, overrides);
}

export function rollTreasure(depth) {
  let options = {};
  if (typeof depth === "object") {
    options = depth || {};
    depth = options.depth || 1;
  }
  const pool = Object.values(ITEM_DEFS).filter((item) => item.rarity <= depth + 2 && item.kind !== "quest");
  const bucket = [];
  pool.forEach((item) => {
    const weight = Math.max(1, 9 - item.rarity * 2);
    for (let i = 0; i < weight; i += 1) {
      bucket.push(item.id);
    }
  });
  const item = createItem(choice(bucket));
  if (!item) {
    return null;
  }
  const affixChance = options.quality === "milestone"
    ? 1
    : options.quality === "elite"
      ? 0.8
      : options.quality === "guarded"
        ? 0.55
        : depth >= 5
          ? 0.32
          : depth >= 3
            ? 0.18
            : 0;
  if ((item.kind === "weapon" || item.kind === "armor") && !item.affixId && affixChance > 0 && Math.random() < affixChance) {
    item.affixId = pickLootAffixId(item, depth, options);
    applyLootAffix(item, item.affixId);
  }
  return item;
}

function getLootAffix(item) {
  return item?.affixId ? LOOT_AFFIX_DEFS[item.affixId] || null : null;
}

function applyLootAffix(item, affixId) {
  if (!item || !affixId || item.affixApplied) {
    return item;
  }
  const affix = LOOT_AFFIX_DEFS[affixId];
  if (!affix) {
    return item;
  }
  const stats = affix.stats || {};
  item.affixId = affixId;
  item.affixApplied = true;
  item.affixCategory = affix.category;
  item.affixTags = affix.tags || [];
  if (stats.power) {
    item.power = (item.power || 0) + stats.power;
  }
  if (stats.armor) {
    item.armor = (item.armor || 0) + stats.armor;
  }
  if (stats.accuracyBonus) {
    item.accuracyBonus = (item.accuracyBonus || 0) + stats.accuracyBonus;
  }
  if (stats.critBonus) {
    item.critBonus = (item.critBonus || 0) + stats.critBonus;
  }
  if (stats.guardBonus) {
    item.guardBonus = (item.guardBonus || 0) + stats.guardBonus;
  }
  if (stats.wardBonus) {
    item.wardBonus = (item.wardBonus || 0) + stats.wardBonus;
  }
  if (stats.manaBonus) {
    item.manaBonus = (item.manaBonus || 0) + stats.manaBonus;
  }
  if (stats.strBonus) {
    item.strBonus = (item.strBonus || 0) + stats.strBonus;
  }
  if (stats.dexBonus) {
    item.dexBonus = (item.dexBonus || 0) + stats.dexBonus;
  }
  if (stats.conBonus) {
    item.conBonus = (item.conBonus || 0) + stats.conBonus;
  }
  if (stats.intBonus) {
    item.intBonus = (item.intBonus || 0) + stats.intBonus;
  }
  if (stats.searchBonus) {
    item.searchBonus = (item.searchBonus || 0) + stats.searchBonus;
  }
  if (stats.lightBonus) {
    item.lightBonus = (item.lightBonus || 0) + stats.lightBonus;
  }
  if (stats.bonusVsUndead) {
    item.bonusVsUndead = (item.bonusVsUndead || 0) + stats.bonusVsUndead;
  }
  if (stats.overcastRelief) {
    item.overcastRelief = (item.overcastRelief || 0) + stats.overcastRelief;
  }
  if (stats.cursedBias) {
    item.cursed = true;
  }
  return item;
}

function pickLootAffixId(item, depth, options = {}) {
  if (options.affixId && LOOT_AFFIX_DEFS[options.affixId]) {
    return options.affixId;
  }
  const candidates = [];
  const push = (id, weight = 1) => {
    for (let index = 0; index < weight; index += 1) {
      candidates.push(id);
    }
  };
  if (item.kind === "weapon") {
    push("executioners", 3);
    push("gravebane", depth >= 4 ? 2 : 1);
    if ((item.manaBonus || 0) > 0) {
      push("stormtouched", 3);
    }
    if ((item.weight || 0) <= 4) {
      push("scouts", 2);
    }
  }
  if (item.kind === "armor") {
    if (item.slot === "body" || item.slot === "offhand" || item.slot === "head") {
      push("wardens", 3);
    }
    if (item.slot === "cloak" || item.slot === "feet" || item.slot === "amulet") {
      push("scouts", 2);
    }
    if ((item.manaBonus || 0) > 0 || (item.wardBonus || 0) > 0 || item.slot === "ring" || item.slot === "amulet") {
      push("stormtouched", 3);
    }
    if (depth >= 4) {
      push("gravebane", 1);
    }
  }
  if (options.quality === "elite" || options.quality === "milestone") {
    push("wardens", 2);
    push("executioners", 2);
    push("stormtouched", 2);
    if (depth >= 4) {
      push("gravebane", 2);
    }
  }
  if (options.quality === "guarded") {
    push("wardens", 3);
  }
  if (depth >= 5) {
    push("hollow", 1);
  }
  return choice(candidates.length > 0 ? candidates : Object.keys(LOOT_AFFIX_DEFS));
}

export function getRace(id) {
  return RACES.find((race) => race.id === id);
}

export function getClass(id) {
  return CLASSES.find((role) => role.id === id);
}

export function describeItem(item) {
  if (!item.identified && canIdentify(item)) {
    if (item.kind === "weapon") {
      return "Weapon of unknown quality";
    }
    if (item.kind === "armor") {
      return "Armor of unknown quality";
    }
    if (item.kind === "charged") {
      return "Charged item with hidden power";
    }
  }
  if (item.kind === "weapon") {
    const details = [`Weapon, power ${getItemPower(item)}`];
    if (item.affixId) {
      details.push(LOOT_AFFIX_DEFS[item.affixId]?.description || "specialized");
    }
    if (getItemAccuracyBonus(item)) {
      details.push(`${getItemAccuracyBonus(item) > 0 ? "+" : ""}${getItemAccuracyBonus(item)} accuracy`);
    }
    if (getItemCritBonus(item)) {
      details.push(`+${getItemCritBonus(item)} crit`);
    }
    if (getItemManaBonus(item)) {
      details.push(`+${getItemManaBonus(item)} mana`);
    }
    if (getItemStrBonus(item)) {
      details.push(`+${getItemStrBonus(item)} strength`);
    }
    if (getItemDexBonus(item)) {
      details.push(`+${getItemDexBonus(item)} dexterity`);
    }
    if (getItemConBonus(item)) {
      details.push(`+${getItemConBonus(item)} constitution`);
    }
    if (getItemIntBonus(item)) {
      details.push(`+${getItemIntBonus(item)} intelligence`);
    }
    if (getItemWardBonus(item)) {
      details.push(`ward ${getItemWardBonus(item)}`);
    }
    if (getItemBonusVsUndead(item)) {
      details.push(`+${getItemBonusVsUndead(item)} vs undead`);
    }
    if (getItemOvercastRelief(item)) {
      details.push(`-${getItemOvercastRelief(item)} overcast loss`);
    }
    if (item.identified && item.cursed) {
      details.push("cursed");
    }
    return details.join(", ");
  }
  if (item.kind === "armor") {
    const details = [`Armor ${getItemArmor(item)}`];
    if (item.affixId) {
      details.push(LOOT_AFFIX_DEFS[item.affixId]?.description || "specialized");
    }
    if (getItemGuardBonus(item)) {
      details.push(`guard ${getItemGuardBonus(item)}`);
    }
    if (getItemWardBonus(item)) {
      details.push(`ward ${getItemWardBonus(item)}`);
    }
    if (getItemManaBonus(item)) {
      details.push(`+${getItemManaBonus(item)} mana`);
    }
    if (getItemStrBonus(item)) {
      details.push(`+${getItemStrBonus(item)} strength`);
    }
    if (getItemDexBonus(item)) {
      details.push(`+${getItemDexBonus(item)} dexterity`);
    }
    if (getItemConBonus(item)) {
      details.push(`+${getItemConBonus(item)} constitution`);
    }
    if (getItemIntBonus(item)) {
      details.push(`+${getItemIntBonus(item)} intelligence`);
    }
    if (getItemLightBonus(item)) {
      details.push(`+${getItemLightBonus(item)} sight`);
    }
    if (getItemSearchBonus(item)) {
      details.push(`+${getItemSearchBonus(item)} search`);
    }
    if (getItemFireResist(item)) {
      details.push(`fire resist ${getItemFireResist(item)}`);
    }
    if (getItemColdResist(item)) {
      details.push(`cold resist ${getItemColdResist(item)}`);
    }
    if (getItemBonusVsUndead(item)) {
      details.push(`+${getItemBonusVsUndead(item)} vs undead`);
    }
    if (getItemOvercastRelief(item)) {
      details.push(`-${getItemOvercastRelief(item)} overcast loss`);
    }
    if (item.identified && item.cursed) {
      details.push("cursed");
    }
    return details.join(", ");
  }
  if (item.kind === "spellbook") {
    return `Teaches ${SPELLS[item.spell].name}`;
  }
  if (item.kind === "consumable") {
    return item.name;
  }
  if (item.kind === "charged") {
    return item.identified ? `${item.name}, ${item.charges}/${item.maxCharges || item.charges} charges` : "Mysterious wand or staff";
  }
  if (item.kind === "junk") {
    return item.cursed ? "Worthless and unpleasant to carry" : "Worth little";
  }
  if (item.kind === "quest") {
    return "Quest item";
  }
  return item.name || "";
}

export function getItemName(item, forceReveal = false) {
  if (!item) {
    return "";
  }
  if (!forceReveal && !item.identified && canIdentify(item)) {
    if (item.kind === "weapon") {
      return "Unidentified Weapon";
    }
    if (item.kind === "armor") {
      return "Unidentified Armor";
    }
    if (item.kind === "charged") {
      return "Unknown Wand";
    }
  }
  const parts = [];
  if (item.cursed && (forceReveal || item.identified)) {
    parts.push("Cursed");
  }
  if ((item.kind === "weapon" || item.kind === "armor") && item.enchantment) {
    parts.push(item.enchantment > 0 ? `+${item.enchantment}` : `${item.enchantment}`);
  }
  if (item.affixId && (forceReveal || item.identified || !canIdentify(item))) {
    parts.push(LOOT_AFFIX_DEFS[item.affixId]?.name || "");
  }
  parts.push(item.name);
  if (item.kind === "charged" && (forceReveal || item.identified)) {
    parts.push(`(${item.charges}/${item.maxCharges || item.charges})`);
  }
  return parts.join(" ");
}

export function getItemPower(item) {
  return Math.max(0, (item.power || 0) + (item.enchantment || 0));
}

export function getItemArmor(item) {
  return Math.max(0, (item.armor || 0) + (item.enchantment || 0));
}

export function getItemAccuracyBonus(item) {
  return item ? (item.accuracyBonus || 0) : 0;
}

export function getItemCritBonus(item) {
  return item ? Math.max(0, item.critBonus || 0) : 0;
}

export function getItemManaBonus(item) {
  if (!item) {
    return 0;
  }
  return (item.manaBonus || 0) + ((item.kind === "armor" && item.enchantment > 0 && item.slot === "ring") ? item.enchantment : 0);
}

export function getItemStrBonus(item) {
  return item ? (item.strBonus || 0) : 0;
}

export function getItemDexBonus(item) {
  if (!item) {
    return 0;
  }
  return (item.dexBonus || 0) + ((item.kind === "armor" && item.enchantment > 0 && item.slot === "feet") ? 1 : 0);
}

export function getItemConBonus(item) {
  return item ? (item.conBonus || 0) : 0;
}

export function getItemIntBonus(item) {
  return item ? (item.intBonus || 0) : 0;
}

export function getItemLightBonus(item) {
  return (item.lightBonus || 0) + ((item.kind === "armor" && item.enchantment > 1 && item.slot === "amulet") ? 1 : 0);
}

export function getItemGuardBonus(item) {
  return (item.guardBonus || 0) + ((item.kind === "armor" && item.enchantment > 1 && item.slot === "offhand") ? 1 : 0);
}

export function getItemWardBonus(item) {
  return (item.wardBonus || 0) + ((item.kind === "armor" && item.enchantment > 1 && (item.slot === "ring" || item.slot === "amulet" || item.slot === "cloak")) ? 1 : 0);
}

export function getItemFireResist(item) {
  return item ? (item.fireResist || 0) : 0;
}

export function getItemColdResist(item) {
  return item ? (item.coldResist || 0) : 0;
}

export function getItemSearchBonus(item) {
  return item ? (item.searchBonus || 0) : 0;
}

export function getItemBonusVsUndead(item) {
  return item ? (item.bonusVsUndead || 0) : 0;
}

export function getItemOvercastRelief(item) {
  return item ? (item.overcastRelief || 0) : 0;
}

export function getItemValue(item) {
  let value = item.value || 0;
  if (item.enchantment) {
    value += item.enchantment * 18;
  }
  value += getItemAccuracyBonus(item) * 10;
  value += getItemCritBonus(item) * 14;
  value += getItemGuardBonus(item) * 16;
  value += getItemWardBonus(item) * 18;
  value += getItemManaBonus(item) * 14;
  value += getItemStrBonus(item) * 16;
  value += getItemDexBonus(item) * 16;
  value += getItemConBonus(item) * 18;
  value += getItemIntBonus(item) * 18;
  value += getItemSearchBonus(item) * 10;
  value += getItemFireResist(item) * 12;
  value += getItemColdResist(item) * 12;
  value += getItemBonusVsUndead(item) * 16;
  value += getItemOvercastRelief(item) * 18;
  if (item.affixId) {
    value += 26;
  }
  if (item.cursed) {
    value = Math.max(1, Math.round(value * 0.5));
  }
  if (item.kind === "charged") {
    value += (item.charges || 0) * 8;
  }
  return Math.max(1, value);
}

export function getHealthRatio(actor) {
  if (!actor) {
    return 0;
  }
  const maxHp = Math.max(1, actor.maxHp || actor.hp || 1);
  return Math.max(0, Math.min(1, (actor.hp || 0) / maxHp));
}

export function getMonsterHealthState(actor) {
  const ratio = getHealthRatio(actor);
  if (ratio >= 1) {
    return { label: "Unhurt", tone: "good", ratio };
  }
  if (ratio >= 0.78) {
    return { label: "Lightly injured", tone: "good", ratio };
  }
  if (ratio >= 0.48) {
    return { label: "Moderately injured", tone: "warning", ratio };
  }
  if (ratio >= 0.18) {
    return { label: "Heavily injured", tone: "bad", ratio };
  }
  return { label: "Near death", tone: "bad", ratio };
}

export function canIdentify(item) {
  return item.kind === "weapon" || item.kind === "armor" || item.kind === "charged";
}

export function countUnknownItems(player) {
  let count = 0;
  player.inventory.forEach((item) => { if (canIdentify(item) && !item.identified) { count += 1; } });
  Object.values(player.equipment).forEach((item) => { if (item && canIdentify(item) && !item.identified) { count += 1; } });
  return count;
}

export function classifyItem(item) {
  switch (item.kind) {
    case "weapon":
      return "Weapon";
    case "armor":
      return "Armor";
    case "consumable":
      return "Potion or Scroll";
    case "charged":
      return "Wand or Staff";
    case "spellbook":
      return "Spellbook";
    case "junk":
      return "Junk";
    case "quest":
      return "Quest Item";
    default:
      return "Item";
  }
}

export function getCarryWeight(player) {
  const inventoryWeight = player.inventory.reduce((sum, item) => sum + (item.weight || 0), 0);
  const equippedWeight = Object.values(player.equipment).reduce((sum, item) => sum + (item ? item.weight || 0 : 0), 0);
  const goldWeight = Math.floor((player.gold || 0) / 120);
  return inventoryWeight + equippedWeight + goldWeight;
}

export function getCarryCapacity(player) {
  const strength = player?.effectiveStats?.str ?? player?.stats?.str ?? 0;
  return strength * 3 + 12;
}

export function encumbranceTone(player) {
  const weight = getCarryWeight(player);
  const capacity = getCarryCapacity(player);
  if (weight > capacity) {
    return "value-bad";
  }
  if (weight > capacity * 0.75) {
    return "value-warning";
  }
  return "value-good";
}

export function shopAcceptsItem(shopId, item) {
  if (shopId === "junk") {
    return true;
  }
  if (shopId === "armory") {
    return item.kind === "weapon" || item.kind === "armor";
  }
  if (shopId === "guild") {
    return item.kind === "spellbook" || item.kind === "charged" || (item.kind === "weapon" && item.manaBonus) || (item.kind === "armor" && (item.manaBonus || item.wardBonus));
  }
  if (shopId === "general") {
    return item.kind === "consumable" || item.kind === "charged" || (item.kind === "armor" && ["feet", "cloak", "amulet"].includes(item.slot));
  }
  return false;
}

export function curseRandomCarriedItem(player) {
  const candidates = [...player.inventory, ...Object.values(player.equipment).filter(Boolean)].filter((item) => item.kind === "weapon" || item.kind === "armor");
  if (candidates.length === 0) {
    return;
  }
  const item = choice(candidates);
  item.cursed = true;
  item.identified = true;
}

export function miniMapColor(tile, visible) {
  switch (tile.kind) {
    case "wall":
    case "buildingWall":
    case "pillar":
    case "tree":
    case "secretWall":
      return visible ? "#343434" : "#1b1b1b";
    case "secretDoor":
      return tile.hidden ? (visible ? "#343434" : "#1b1b1b") : "#c0a16b";
    case "floor":
    case "road":
    case "stone":
    case "plaza":
    case "buildingFloor":
      return visible ? "#9f947e" : "#5f574c";
    case "stairDown":
      return "#b68c2f";
    case "stairUp":
      return "#8db551";
    case "altar":
      return "#b28ecf";
    case "trap":
      return tile.hidden && !visible ? "#5f574c" : "#a34b35";
    case "fountain":
      return "#63a5cf";
    case "throne":
      return "#d0b06d";
    default:
      return visible ? "#8a8a8a" : "#4a4a4a";
  }
}

export function createEmptyEquipment() {
  return {
    weapon: null,
    offhand: null,
    head: null,
    body: null,
    cloak: null,
    feet: null,
    ring1: null,
    ring2: null,
    ring3: null,
    ring4: null,
    amulet1: null,
    amulet2: null
  };
}

function normalizeEquipment(equipment = {}) {
  const normalized = {
    ...createEmptyEquipment(),
    ...(equipment || {})
  };
  if (!normalized.ring1 && equipment?.ring) {
    normalized.ring1 = equipment.ring;
  }
  if (!normalized.amulet1 && equipment?.amulet) {
    normalized.amulet1 = equipment.amulet;
  }
  return Object.fromEntries(Object.entries(createEmptyEquipment()).map(([slot]) => [slot, normalized[slot] || null]));
}

export function getExploredPercent(level) {
  if (!level || !level.explored || level.explored.length === 0) {
    return 0;
  }
  const explored = level.explored.reduce((sum, cell) => sum + (cell ? 1 : 0), 0);
  return Math.round((explored / level.explored.length) * 100);
}

export function normalizePlayer(player) {
  const normalized = structuredCloneCompat(player);
  normalized.constitutionLoss = normalized.constitutionLoss || 0;
  normalized.deepestDepth = normalized.deepestDepth || normalized.currentDepth || 0;
  normalized.moveSpeed = normalized.moveSpeed || 100;
  normalized.moveTurnBudget = normalized.moveTurnBudget || 0;
  normalized.slowed = normalized.slowed || 0;
  normalized.tempGuard = normalized.tempGuard || 0;
  normalized.held = normalized.held || 0;
  normalized.lightBuffTurns = normalized.lightBuffTurns || 0;
  normalized.arcaneWardTurns = normalized.arcaneWardTurns || 0;
  normalized.stoneSkinTurns = normalized.stoneSkinTurns || 0;
  normalized.resistFireTurns = normalized.resistFireTurns || 0;
  normalized.resistColdTurns = normalized.resistColdTurns || 0;
  normalized.perks = Array.isArray(normalized.perks) ? normalized.perks : [];
  normalized.relics = Array.isArray(normalized.relics) ? normalized.relics : [];
  normalized.knownRumors = Array.isArray(normalized.knownRumors) ? normalized.knownRumors : [];
  normalized.spellsKnown = normalizeKnownSpellIds(normalized.spellsKnown);
  normalized.spellTrayIds = Array.isArray(normalized.spellTrayIds)
    ? [...new Set(normalized.spellTrayIds.map((spellId) => canonicalizeSpellId(spellId)).filter((spellId) => normalized.spellsKnown.includes(spellId)))]
    : normalized.spellsKnown.slice(0, 8);
  if (normalized.spellTrayIds.length === 0 && normalized.spellsKnown.length > 0) {
    normalized.spellTrayIds = normalized.spellsKnown.slice(0, 8);
  }
  normalized.runCurrencies = {
    rumorTokens: 0,
    hunterMark: 0,
    templeFavor: 0,
    ...(normalized.runCurrencies || {})
  };
  normalized.quest = {
    hasRunestone: false,
    complete: false,
    milestonesCleared: [],
    namedBossesDefeated: [],
    briefingsSeen: [],
    discoveryIdsFound: [],
    storyBeatFlags: {},
    npcSceneFlags: {},
    returnSting: null,
    ...(normalized.quest || {})
  };
  normalized.quest.milestonesCleared = Array.isArray(normalized.quest.milestonesCleared) ? normalized.quest.milestonesCleared : [];
  normalized.quest.namedBossesDefeated = Array.isArray(normalized.quest.namedBossesDefeated) ? normalized.quest.namedBossesDefeated : [];
  normalized.quest.briefingsSeen = Array.isArray(normalized.quest.briefingsSeen) ? normalized.quest.briefingsSeen : [];
  normalized.quest.discoveryIdsFound = Array.isArray(normalized.quest.discoveryIdsFound) ? normalized.quest.discoveryIdsFound : [];
  normalized.quest.storyBeatFlags = normalized.quest.storyBeatFlags || {};
  normalized.quest.npcSceneFlags = normalized.quest.npcSceneFlags || {};
  normalized.quest.returnSting = normalized.quest.returnSting || null;
  normalized.inventory = (normalized.inventory || []).map(normalizeItem);
  normalized.equipment = normalizeEquipment(normalized.equipment);
  Object.keys(normalized.equipment || {}).forEach((slot) => {
    if (normalized.equipment[slot]) {
      normalized.equipment[slot] = normalizeItem(normalized.equipment[slot]);
    }
  });
  return normalized;
}

export function normalizeLevels(levels) {
  return (levels || []).map((level) => ({
    ...level,
    floorObjective: level.floorObjective || null,
    floorOptional: level.floorOptional || null,
    floorSpecial: level.floorSpecial || null,
    floorSpecialSummary: level.floorSpecialSummary || "",
    activeEliteNames: Array.isArray(level.activeEliteNames) ? level.activeEliteNames : [],
    milestone: level.milestone || null,
    discoveries: level.discoveries || [],
    reservedRoomIndexes: level.reservedRoomIndexes || [],
    floorResolved: Boolean(level.floorResolved),
    dangerScore: level.dangerScore || 0,
    dangerLevel: level.dangerLevel || "Low",
    dangerTone: level.dangerTone || "good",
    dangerTriggers: level.dangerTriggers || { turns: 0, rests: 0, waits: 0, searches: 0, loud: 0, greed: 0 },
    reinforcementClock: level.reinforcementClock || 0,
    directorFlags: level.directorFlags || { mediumTriggered: false, highTriggered: false, criticalTriggered: false, introShown: false },
    items: (level.items || []).map((item) => item.kind === "gold" ? item : normalizeItem(item)),
    actors: (level.actors || []).map((actor) => ({
      sleeping: actor.sleeping ?? false,
      alerted: actor.alerted || 0,
      mana: actor.mana || 0,
      held: actor.held || 0,
      slowed: actor.slowed || 0,
      moveMeter: typeof actor.moveMeter === "number" ? actor.moveMeter : 100,
      chargeWindup: actor.chargeWindup || null,
      intent: null,
      maxHp: actor.maxHp || actor.hp || 1,
      ...actor
    }))
  }));
}

export function normalizeItem(item) {
  const base = ITEM_DEFS[item.id] || {};
  const normalized = { ...base, ...structuredCloneCompat(item) };
  normalized.doNotSell = Boolean(normalized.doNotSell);
  delete normalized.markedForSale;
  if (normalized.kind === "charged") {
    normalized.maxCharges = normalized.maxCharges || base.charges || normalized.charges || 1;
    normalized.identified = normalized.identified ?? false;
  }
  if (normalized.kind === "weapon" || normalized.kind === "armor") {
    normalized.enchantment = normalized.enchantment || 0;
    normalized.identified = normalized.identified ?? false;
    normalized.cursed = normalized.cursed || false;
  }
  if (normalized.kind === "consumable" || normalized.kind === "spellbook" || normalized.kind === "quest" || normalized.kind === "junk") {
    normalized.identified = normalized.identified ?? true;
  }
  return normalized;
}

export function createInitialShopState() {
  return normalizeShopState(Object.fromEntries(Object.entries(SHOPS).map(([id, shop]) => [id, {
    stock: shuffle([...shop.stock]).slice(0, Math.max(0, Math.min(shop.stock.length, id === "guild" ? 8 : 6))),
    buyback: [],
    lastRefresh: 0
  }])));
}

export function normalizeShopState(shopState) {
  const state = structuredCloneCompat(shopState || {});
  Object.keys(SHOPS).forEach((id) => {
    if (!state[id]) {
      state[id] = { stock: [...SHOPS[id].stock], buyback: [], lastRefresh: 0 };
    }
    state[id].stock = state[id].stock || [...SHOPS[id].stock];
    state[id].buyback = state[id].buyback || [];
    state[id].lastRefresh = state[id].lastRefresh || 0;
  });
  return state;
}

export function getEncumbranceTier(player) {
  const weight = getCarryWeight(player);
  const capacity = getCarryCapacity(player);
  if (weight > capacity) {
    return 2;
  }
  if (weight > capacity * 0.75) {
    return 1;
  }
  return 0;
}
