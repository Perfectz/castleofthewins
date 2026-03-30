import { CLASSES, ITEM_DEFS, MONSTER_DEFS, RACES, SHOPS, SPELLS } from "../data/content.js";
import { choice, randInt, shuffle, structuredCloneCompat } from "./utils.js";

export function weightedMonster(depth) {
  const options = MONSTER_DEFS.filter((monster) => monster.depth <= depth + 1);
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
    mana: template.spells ? 12 : 0,
    alerted: 0,
    sleeping: Math.random() < 0.4,
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
  return { ...item, ...overrides };
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
  const pool = Object.values(ITEM_DEFS).filter((item) => item.rarity <= depth + 2 && item.kind !== "quest");
  const bucket = [];
  pool.forEach((item) => {
    const weight = Math.max(1, 9 - item.rarity * 2);
    for (let i = 0; i < weight; i += 1) {
      bucket.push(item.id);
    }
  });
  return createItem(choice(bucket));
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
    return `Weapon, power ${getItemPower(item)}${item.identified && item.cursed ? ", cursed" : ""}`;
  }
  if (item.kind === "armor") {
    const details = [`Armor ${getItemArmor(item)}`];
    if (getItemManaBonus(item)) {
      details.push(`+${getItemManaBonus(item)} mana`);
    }
    if (getItemDexBonus(item)) {
      details.push(`+${getItemDexBonus(item)} dexterity`);
    }
    if (getItemLightBonus(item)) {
      details.push(`+${getItemLightBonus(item)} sight`);
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

export function getItemManaBonus(item) {
  return (item.manaBonus || 0) + ((item.kind === "armor" && item.enchantment > 0 && item.slot === "ring") ? item.enchantment : 0);
}

export function getItemDexBonus(item) {
  return (item.dexBonus || 0) + ((item.kind === "armor" && item.enchantment > 0 && item.slot === "feet") ? 1 : 0);
}

export function getItemLightBonus(item) {
  return (item.lightBonus || 0) + ((item.kind === "armor" && item.enchantment > 1 && item.slot === "amulet") ? 1 : 0);
}

export function getItemValue(item) {
  let value = item.value || 0;
  if (item.enchantment) {
    value += item.enchantment * 18;
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
  if (ratio >= 0.7) {
    return { label: "Scratched", tone: "good", ratio };
  }
  if (ratio >= 0.4) {
    return { label: "Wounded", tone: "warning", ratio };
  }
  if (ratio >= 0.18) {
    return { label: "Bloodied", tone: "bad", ratio };
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
  return player.stats.str * 3 + 12;
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
    return item.kind === "spellbook" || item.kind === "charged";
  }
  if (shopId === "general") {
    return item.kind === "consumable" || item.kind === "charged";
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
  normalized.slowed = normalized.slowed || 0;
  normalized.tempGuard = normalized.tempGuard || 0;
  normalized.perks = Array.isArray(normalized.perks) ? normalized.perks : [];
  normalized.relics = Array.isArray(normalized.relics) ? normalized.relics : [];
  normalized.knownRumors = Array.isArray(normalized.knownRumors) ? normalized.knownRumors : [];
  normalized.runCurrencies = {
    rumorTokens: 0,
    hunterMark: 0,
    templeFavor: 0,
    ...(normalized.runCurrencies || {})
  };
  normalized.inventory = (normalized.inventory || []).map(normalizeItem);
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
