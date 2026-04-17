/**
 * @module inventory-ui
 * @owns Item and spell classification for UI display
 * @reads SPELLS from content.js, item properties
 * @mutates None — pure UI model generation
 */
import {
  canIdentify,
  classifyItem,
  getItemAccuracyBonus,
  getItemArmor,
  getItemBonusVsUndead,
  getItemColdResist,
  getItemCritBonus,
  getItemDexBonus,
  getItemFireResist,
  getItemGuardBonus,
  getItemIntBonus,
  getItemLightBonus,
  getItemManaBonus,
  getItemName,
  getItemOvercastRelief,
  getItemPower,
  getItemStrBonus,
  getItemSearchBonus,
  getItemConBonus,
  getItemWardBonus,
  shopAcceptsItem
} from "../core/entities.js";
import { SPELLS } from "../data/content.js";

const GROUP_DEFS = [
  { key: "recommended", label: "Recommended Now" },
  { key: "upgrades", label: "Upgrades" },
  { key: "emergency", label: "Emergency" },
  { key: "risky", label: "Unknown / Risky" },
  { key: "sell", label: "Sell / Stash" },
  { key: "quest", label: "Quest / Keep" }
];

const SHOP_LABELS = {
  armory: "Armory",
  guild: "Guild",
  general: "General",
  junk: "Junk"
};

const FILTER_DEFS = [
  { key: "equip", label: "Equip" },
  { key: "all", label: "Pack" },
  { key: "use", label: "Use" },
  { key: "sell", label: "Sell" }
];

const SPELL_CATEGORY_DEFS = [
  { key: "offense", label: "Offense" },
  { key: "defense", label: "Defense" },
  { key: "recovery", label: "Recovery" },
  { key: "control", label: "Control" },
  { key: "travel", label: "Travel" },
  { key: "sight", label: "Sight" },
  { key: "identify", label: "Identify" },
  { key: "curse", label: "Curse" },
  { key: "utility", label: "Utility" }
];

const INVENTORY_CATEGORY_DEFS = [
  { key: "weapons", label: "Weapons" },
  { key: "armor", label: "Armor" },
  { key: "accessories", label: "Accessories" },
  { key: "consumables", label: "Consumables" },
  { key: "spellbooks", label: "Spellbooks" },
  { key: "wands", label: "Wands & Tools" },
  { key: "valuables", label: "Valuables" },
  { key: "quest", label: "Quest" }
];

const EFFECT_ALIASES = {
  clairvoyance: "mapping"
};

const INVENTORY_PRESENTATION_CACHE = new WeakMap();

export function getSpellEffectKey(spellId = "") {
  if (!spellId) {
    return "";
  }
  return EFFECT_ALIASES[spellId] || spellId;
}

export function getSpellCategoryDefs() {
  return SPELL_CATEGORY_DEFS;
}

export function getInventoryCategoryDefs() {
  return INVENTORY_CATEGORY_DEFS;
}

export function getSpellCategoryKey(spellOrId) {
  const spell = typeof spellOrId === "string" ? SPELLS[spellOrId] : spellOrId;
  const spellId = typeof spellOrId === "string" ? spellOrId : spellOrId?.id;
  if (!spell) {
    return "utility";
  }
  if (spellId === "identify") {
    return "identify";
  }
  if (spellId === "removeCurse") {
    return "curse";
  }
  if (["phaseDoor", "teleport", "runeOfReturn"].includes(spellId) || spell.school === "escape") {
    return "travel";
  }
  if (["clairvoyance", "light", "detectTraps"].includes(spellId) || spell.school === "divination") {
    return "sight";
  }
  if (spell.school === "restoration") {
    return "recovery";
  }
  if (spell.school === "warding") {
    return "defense";
  }
  if (spell.school === "control" || ["frostBolt", "slowMonster", "holdMonster"].includes(spellId)) {
    return "control";
  }
  if (
    ["magicMissile", "fireball", "lightningBolt"].includes(spellId)
    || ["opener", "burst"].includes(String(spell.roleLabel || "").toLowerCase())
  ) {
    return "offense";
  }
  return "utility";
}

export function getSpellCategoryLabel(spellOrId) {
  const key = getSpellCategoryKey(spellOrId);
  return SPELL_CATEGORY_DEFS.find((entry) => entry.key === key)?.label || "Utility";
}

export function getItemEffectKey(item) {
  if (!item) {
    return "";
  }
  if (item.kind === "spellbook") {
    return getSpellEffectKey(item.spell);
  }
  if (item.effect) {
    return EFFECT_ALIASES[item.effect] || item.effect;
  }
  return "";
}

function getVisibleEnemyCount(game) {
  if (!game.player || !game.currentLevel) {
    return 0;
  }
  if (typeof game.getSortedVisibleEnemies === "function") {
    return game.getSortedVisibleEnemies().length;
  }
  if (typeof game.visibleEnemies === "function") {
    return game.visibleEnemies().length;
  }
  return 0;
}

function getShopTags(item) {
  const order = ["armory", "guild", "general", "junk"];
  return order.filter((shopId) => shopAcceptsItem(shopId, item)).map((shopId) => SHOP_LABELS[shopId]);
}

function getShopTagForContext(item, shopId = "") {
  if (!shopId || !shopAcceptsItem(shopId, item)) {
    return null;
  }
  return SHOP_LABELS[shopId] || null;
}

function getInventoryCategoryLabel(categoryKey = "utility") {
  return INVENTORY_CATEGORY_DEFS.find((entry) => entry.key === categoryKey)?.label || "Item";
}

function getSemanticScanTags(item, context = {}) {
  if (!item) {
    return [];
  }
  const {
    unknown = false,
    cursed = false,
    sellHereTag = null,
    groupKey = "",
    recommendation = ""
  } = context;
  const tags = [];
  if (
    item.kind === "weapon"
    || getItemPower(item) > 0
    || getItemAccuracyBonus(item) > 0
    || getItemCritBonus(item) > 0
    || item.effect === "lightning"
  ) {
    tags.push("damage");
  }
  if (getItemArmor(item) >= 3 || getItemGuardBonus(item) > 0 || item.effect === "slow") {
    tags.push("guard");
  }
  if (getItemWardBonus(item) > 0) {
    tags.push("ward");
  }
  if (getItemSearchBonus(item) > 0 || getItemLightBonus(item) > 0) {
    tags.push("search");
  }
  if (
    getItemDexBonus(item) > 0
    || ["teleport", "runeReturn", "mapping"].includes(getItemEffectKey(item))
  ) {
    tags.push("travel");
  }
  if (getItemFireResist(item) > 0 || getItemColdResist(item) > 0) {
    tags.push("resist");
  }
  if (unknown || cursed || recommendation === "Identify first") {
    tags.push("cursed-risk");
  }
  if (sellHereTag || groupKey === "sell") {
    tags.push("sell");
  }
  return [...new Set(tags)];
}

function getInventoryCategoryKey(item, context = {}) {
  if (!item) {
    return "valuables";
  }
  if (item.kind === "quest") {
    return "quest";
  }
  if (item.kind === "spellbook" && item.spell) {
    return "spellbooks";
  }
  if (item.kind === "charged") {
    return "wands";
  }
  if (item.kind === "consumable") {
    return "consumables";
  }
  if (item.kind === "weapon") {
    return "weapons";
  }
  if (item.kind === "armor") {
    if (["ring", "amulet"].includes(item.slot)) {
      return "accessories";
    }
    return "armor";
  }
  if (item.kind === "junk") {
    return "valuables";
  }
  return "valuables";
}

function getBurdenWeightTone(game, item) {
  const state = game.getBurdenUiState();
  const weight = item.weight || 0;
  if (weight >= 7 || (weight >= 5 && state.state !== "safe")) {
    return "Too heavy for current build";
  }
  if (weight >= 5) {
    return "Heavy burden item";
  }
  return "";
}

function getBuildSummary(game) {
  const weapon = game.player?.equipment?.weapon || null;
  const armorPieces = Object.values(game.player?.equipment || {}).filter(Boolean);
  const burdenUi = game.getBurdenUiState();
  const armorValue = typeof game.getArmorValue === "function" ? game.getArmorValue() : 0;
  const attackValue = typeof game.getAttackValue === "function" ? game.getAttackValue() : 0;
  const manaLean = armorPieces.reduce((sum, item) => sum + getItemManaBonus(item) + getItemIntBonus(item), 0) + ((game.player?.spellsKnown?.length || 0) * 2);
  const utilityLean = armorPieces.reduce((sum, item) => sum + getItemDexBonus(item) + getItemLightBonus(item) + getItemSearchBonus(item), 0);
  const guardLean = armorPieces.reduce((sum, item) => sum + getItemGuardBonus(item) + getItemWardBonus(item) + getItemConBonus(item), 0);
  const strengthLean = armorPieces.reduce((sum, item) => sum + getItemStrBonus(item), 0);
  let headline = "Balanced kit";
  let note = "Mixed offense, defense, and utility.";

  if (manaLean >= attackValue + 2) {
    headline = "Mana-leaning";
    note = "Built around spells, mana pieces, and tools.";
  } else if (strengthLean >= 2) {
    headline = "Heavy hauler";
    note = "Leans on strength pieces, burden control, and harder swings.";
  } else if (guardLean >= 4) {
    headline = "Layered defense";
    note = "Guard and ward pieces soak hits instead of just stacking armor.";
  } else if (burdenUi.state === "warning" || burdenUi.state === "danger" || burdenUi.state === "overloaded" || armorValue >= attackValue) {
    headline = "Heavy melee";
    note = "Built to trade hits and carry weight.";
  } else if (utilityLean >= 2 || burdenUi.state === "safe") {
    headline = "Light skirmish";
    note = "Plays angles, vision, and cleaner movement.";
  }

  return {
    headline,
    note,
    tags: [
      burdenUi.label,
      weapon ? getItemName(weapon, true) : "No main weapon",
      `${game.player?.spellsKnown?.length || 0} spells`
    ]
  };
}

function getSlotQualityLabel(game, slotDef, compatibleCount = 0) {
  const item = game.player?.equipment?.[slotDef.slot] || null;
  if (!item) {
    return compatibleCount > 0 ? "Empty upgrade slot" : "Open slot";
  }
  if (item.cursed) {
    return "Locked by curse";
  }
  if (slotDef.slot === "weapon") {
    if (getItemCritBonus(item) >= 2 || getItemAccuracyBonus(item) >= 2) {
      return "Precision weapon";
    }
    return getItemManaBonus(item) > 0 ? "Mana weapon" : getItemPower(item) >= 8 ? "Heavy offense" : "Stable weapon";
  }
  if (getItemGuardBonus(item) >= 2 || getItemWardBonus(item) >= 2) {
    return "Protection piece";
  }
  if (getItemManaBonus(item) > 0 || getItemIntBonus(item) > 0) {
    return "Mana piece";
  }
  if (getItemStrBonus(item) > 0) {
    return "Power piece";
  }
  if (getItemConBonus(item) > 0) {
    return "Endurance piece";
  }
  if (getItemDexBonus(item) > 0 || getItemLightBonus(item) > 0 || getItemSearchBonus(item) > 0) {
    return "Utility piece";
  }
  if ((slotDef.slot === "body" || slotDef.slot === "offhand" || slotDef.slot === "head") && getItemArmor(item) >= 3) {
    return "Core defense";
  }
  if ((item.weight || 0) >= 7 && getItemArmor(item) <= 1 && getItemManaBonus(item) <= 0 && getItemDexBonus(item) <= 0 && getItemLightBonus(item) <= 0) {
    return "Dead weight";
  }
  return "Stable slot";
}

function getEquipmentComparisonTarget(game, item) {
  if (!item?.slot) {
    return {
      targetSlot: "",
      equipped: null
    };
  }
  if (typeof game.getEquipmentSlotForItem === "function") {
    const target = game.getEquipmentSlotForItem(item) || {};
    const targetSlot = target.targetSlot || "";
    return {
      targetSlot,
      equipped: targetSlot ? game.player?.equipment?.[targetSlot] || null : null
    };
  }
  return {
    targetSlot: item.slot,
    equipped: game.player?.equipment?.[item.slot] || null
  };
}

function getComparisonDeltas(game, item) {
  if (!item.slot || (item.kind !== "weapon" && item.kind !== "armor")) {
    return null;
  }
  const { targetSlot, equipped } = getEquipmentComparisonTarget(game, item);
  return {
    targetSlot,
    equipped,
    attack: item.kind === "weapon" ? getItemPower(item) - (equipped ? getItemPower(equipped) : 0) : 0,
    armor: item.kind === "armor" ? getItemArmor(item) - (equipped ? getItemArmor(equipped) : 0) : 0,
    accuracy: getItemAccuracyBonus(item) - (equipped ? getItemAccuracyBonus(equipped) : 0),
    crit: getItemCritBonus(item) - (equipped ? getItemCritBonus(equipped) : 0),
    guard: getItemGuardBonus(item) - (equipped ? getItemGuardBonus(equipped) : 0),
    ward: getItemWardBonus(item) - (equipped ? getItemWardBonus(equipped) : 0),
    mana: getItemManaBonus(item) - (equipped ? getItemManaBonus(equipped) : 0),
    str: getItemStrBonus(item) - (equipped ? getItemStrBonus(equipped) : 0),
    dex: getItemDexBonus(item) - (equipped ? getItemDexBonus(equipped) : 0),
    con: getItemConBonus(item) - (equipped ? getItemConBonus(equipped) : 0),
    int: getItemIntBonus(item) - (equipped ? getItemIntBonus(equipped) : 0),
    sight: getItemLightBonus(item) - (equipped ? getItemLightBonus(equipped) : 0),
    search: getItemSearchBonus(item) - (equipped ? getItemSearchBonus(equipped) : 0),
    fireResist: getItemFireResist(item) - (equipped ? getItemFireResist(equipped) : 0),
    coldResist: getItemColdResist(item) - (equipped ? getItemColdResist(equipped) : 0)
  };
}

function getUpgradeSummary(game, item) {
  const deltas = getComparisonDeltas(game, item);
  if (!deltas) {
    return {
      isUpgrade: false,
      score: 0,
      reason: "",
      fillsGap: false
    };
  }

  const slotLabel = game.getPackSlotDefinition(deltas.targetSlot || item.slot).label.toLowerCase();
  if (!deltas.equipped) {
    return {
      isUpgrade: true,
      score: 4,
      reason: `Fills empty ${slotLabel} slot`,
      fillsGap: true
    };
  }

  const score = (deltas.attack * 3)
    + (deltas.armor * 2)
    + (deltas.accuracy * 2)
    + (deltas.crit * 2)
    + (deltas.guard * 2)
    + (deltas.ward * 2)
    + deltas.mana
    + (deltas.str * 2)
    + deltas.dex
    + (deltas.con * 2)
    + (deltas.int * 2)
    + deltas.sight
    + deltas.search
    + deltas.fireResist
    + deltas.coldResist;
  if (deltas.attack > 0) {
    return { isUpgrade: true, score, reason: `Upgrades weapon by +${deltas.attack}`, fillsGap: false };
  }
  if (deltas.accuracy > 0 || deltas.crit > 0) {
    const part = deltas.accuracy > 0 ? `+${deltas.accuracy} accuracy` : `+${deltas.crit} crit`;
    return { isUpgrade: true, score, reason: `Sharpens offense with ${part}`, fillsGap: false };
  }
  if (deltas.armor > 0) {
    return { isUpgrade: true, score, reason: `Upgrades ${slotLabel} armor by +${deltas.armor}`, fillsGap: false };
  }
  if (deltas.guard > 0 || deltas.ward > 0) {
    const part = deltas.guard > 0 ? `+${deltas.guard} guard` : `+${deltas.ward} ward`;
    return { isUpgrade: true, score, reason: `Adds ${part} to your defenses`, fillsGap: false };
  }
  if (deltas.mana > 0) {
    return { isUpgrade: true, score, reason: `Adds +${deltas.mana} mana to your build`, fillsGap: false };
  }
  if (deltas.str > 0) {
    return { isUpgrade: true, score, reason: `Adds +${deltas.str} strength`, fillsGap: false };
  }
  if (deltas.dex > 0) {
    return { isUpgrade: true, score, reason: `Adds +${deltas.dex} dexterity`, fillsGap: false };
  }
  if (deltas.con > 0) {
    return { isUpgrade: true, score, reason: `Adds +${deltas.con} constitution`, fillsGap: false };
  }
  if (deltas.int > 0) {
    return { isUpgrade: true, score, reason: `Adds +${deltas.int} intelligence`, fillsGap: false };
  }
  if (deltas.sight > 0) {
    return { isUpgrade: true, score, reason: `Improves sight by +${deltas.sight}`, fillsGap: false };
  }
  if (deltas.search > 0) {
    return { isUpgrade: true, score, reason: `Improves search by +${deltas.search}`, fillsGap: false };
  }
  if (deltas.fireResist > 0 || deltas.coldResist > 0) {
    return { isUpgrade: true, score, reason: "Adds elemental protection", fillsGap: false };
  }
  return {
    isUpgrade: false,
    score,
    reason: score < 0 ? "Sidegrade at best" : "No clear upgrade",
    fillsGap: false
  };
}

function getComparisonTone(item, context = {}) {
  const {
    unknown = false,
    cursed = false,
    upgrade = null
  } = context;
  if (!item?.slot || (item.kind !== "weapon" && item.kind !== "armor")) {
    return "";
  }
  if (cursed) {
    return "bad";
  }
  if (unknown) {
    return "neutral";
  }
  if (upgrade?.fillsGap || upgrade?.isUpgrade) {
    return "good";
  }
  if ((upgrade?.score || 0) < 0) {
    return "bad";
  }
  return "neutral";
}

export function buildInventoryItemSemantics(game, item, index, options = {}) {
  const { shopId = "" } = options;
  const hpRatio = game.player.maxHp > 0 ? game.player.hp / game.player.maxHp : 1;
  const manaRatio = game.player.maxMana > 0 ? game.player.mana / game.player.maxMana : 1;
  const visibleEnemies = getVisibleEnemyCount(game);
  const burdenUi = game.getBurdenUiState();
  const unknown = canIdentify(item) && !item.identified;
  const cursed = Boolean(item.cursed);
  const shopTags = getShopTags(item);
  const sellHereTag = getShopTagForContext(item, shopId);
  const upgrade = getUpgradeSummary(game, item);
  const heavyLabel = getBurdenWeightTone(game, item);
  const hasCursedEquipped = Object.values(game.player.equipment || {}).some((equippedItem) => equippedItem && equippedItem.cursed);
  const itemEffectKey = getItemEffectKey(item);
  const knownEffectKeys = (game.player?.spellsKnown || []).map((spellId) => getSpellEffectKey(spellId));
  const isDuplicateSpellbook = item.kind === "spellbook" && game.player.spellsKnown.includes(item.spell);
  const isKnownEffect = Boolean(itemEffectKey && knownEffectKeys.includes(itemEffectKey));
  const isEmptyCharged = item.kind === "charged" && (item.charges || 0) <= 0;
  const inDanger = visibleEnemies > 0 || hpRatio < 0.45 || (game.currentDepth > 0 && burdenUi.state !== "safe");
  const buildIdentity = item.affixId
    ? getItemBonusVsUndead(item) > 0
      ? "Anti-undead gear"
      : getItemOvercastRelief(item) > 0
        ? "Overcast gear"
        : getItemGuardBonus(item) + getItemWardBonus(item) >= 2
          ? "Tank gear"
          : getItemCritBonus(item) + getItemAccuracyBonus(item) >= 2
            ? "Precision gear"
            : getItemSearchBonus(item) + getItemDexBonus(item) + getItemLightBonus(item) >= 2
              ? "Scout gear"
              : "Named gear"
    : "";
  let recommendation = "Keep";
  let reason = "Low-priority carry";
  let groupKey = "sell";
  let sortScore = 0;
  let risk = "";

  if (item.kind === "quest") {
    recommendation = "Keep";
    reason = "Required to finish the run";
    groupKey = "quest";
    sortScore = 100;
  } else if (item.kind === "consumable" && item.effect === "heal" && hpRatio < 0.55) {
    recommendation = "Use";
    reason = "Best heal you can use now";
    groupKey = "recommended";
    sortScore = 95;
  } else if (item.kind === "consumable" && item.effect === "mana" && manaRatio < 0.45 && game.player.spellsKnown.length > 0) {
    recommendation = "Use";
    reason = "Restores mana for your next cast";
    groupKey = "recommended";
    sortScore = 92;
  } else if (item.kind === "consumable" && item.effect === "removeCurse" && hasCursedEquipped) {
    recommendation = "Use";
    reason = "Breaks your locked curse";
    groupKey = "recommended";
    sortScore = 90;
  } else if (item.kind === "consumable" && (item.effect === "teleport" || item.effect === "runeReturn") && inDanger) {
    recommendation = "Use";
    reason = "Clean escape if the floor turns";
    groupKey = "recommended";
    sortScore = 88;
  } else if (item.kind === "charged" && !isEmptyCharged && inDanger) {
    recommendation = "Use";
    reason = item.effect === "staffHeal" ? "Live recovery tool with charges" : "Ready control tool for this fight";
    groupKey = "recommended";
    sortScore = 86;
  } else if (item.affixId && !unknown && (item.kind === "weapon" || item.kind === "armor")) {
    recommendation = "Keep";
    reason = buildIdentity || "Named build-around gear";
    groupKey = upgrade.isUpgrade ? "upgrades" : "recommended";
    sortScore = 82 + Math.max(0, upgrade.score);
  } else if ((item.kind === "weapon" || item.kind === "armor") && upgrade.isUpgrade && !unknown) {
    recommendation = "Equip";
    reason = upgrade.reason;
    groupKey = "upgrades";
    sortScore = 80 + upgrade.score;
  } else if ((item.kind === "weapon" || item.kind === "armor") && upgrade.fillsGap) {
    recommendation = "Equip";
    reason = upgrade.reason;
    groupKey = "upgrades";
    sortScore = 79;
    if (unknown) {
      risk = "Unknown quality";
    }
  } else if (item.kind === "consumable" && ["heal", "mana", "teleport", "removeCurse", "runeReturn"].includes(item.effect)) {
    recommendation = "Keep";
    reason = item.effect === "heal"
      ? "Emergency sustain"
      : item.effect === "mana"
        ? "Emergency mana reserve"
        : item.effect === "removeCurse"
          ? "Breaks curses when needed"
          : "Emergency escape tool";
    groupKey = "emergency";
    sortScore = 70;
  } else if (item.kind === "charged" && !isEmptyCharged) {
    recommendation = "Keep";
    reason = `Reserve tool with ${item.charges}/${item.maxCharges || item.charges} charges`;
    groupKey = "emergency";
    sortScore = 68;
  } else if (unknown && !upgrade.fillsGap) {
    recommendation = "Identify first";
    reason = `Unknown ${classifyItem(item).toLowerCase()}, possible curse risk`;
    groupKey = "risky";
    sortScore = 76;
    risk = "Identify first";
  } else if (cursed) {
    recommendation = "Remove curse first";
    reason = item.kind === "weapon" || item.kind === "armor" ? "Cursed gear with equip risk" : "Cursed item, handle carefully";
    groupKey = "risky";
    sortScore = 74;
    risk = "Cursed";
  } else if (heavyLabel) {
    recommendation = "Keep";
    reason = heavyLabel;
    groupKey = "risky";
    sortScore = 66;
    risk = heavyLabel;
  } else if (isDuplicateSpellbook) {
    recommendation = "Sell later";
    reason = "Already learned";
    groupKey = "sell";
    sortScore = 60;
  } else if (isEmptyCharged) {
    recommendation = "Sell later";
    reason = "Empty wand, safe to sell";
    groupKey = "sell";
    sortScore = 59;
  } else if (item.kind === "junk") {
    recommendation = "Sell later";
    reason = shopTags.length > 0 ? `Good ${shopTags[0].toLowerCase()} sale item` : "Low-priority junk";
    groupKey = "sell";
    sortScore = 58;
  } else if (item.kind === "spellbook") {
    recommendation = "Keep";
    reason = isKnownEffect ? "Already covered by a known spell" : "Teaches an unknown spell";
    groupKey = "recommended";
    sortScore = 72;
  } else if ((item.kind === "weapon" || item.kind === "armor") && shopTags.length > 0) {
    recommendation = "Sell later";
    reason = upgrade.score < 0 ? `Good ${shopTags[0].toLowerCase()} sale item` : "Keep for later evaluation";
    groupKey = upgrade.score < 0 ? "sell" : "risky";
    sortScore = upgrade.score < 0 ? 57 : 62;
  } else {
    recommendation = "Keep";
    reason = shopTags.length > 0 ? `Good ${shopTags[0].toLowerCase()} sale item` : "Low-priority carry";
    groupKey = shopTags.length > 0 ? "sell" : "emergency";
    sortScore = 50;
  }

  const categoryKey = getInventoryCategoryKey(item, {
    unknown,
    cursed,
    groupKey,
    isDuplicateSpellbook,
    heavyLabel,
    upgrade
  });
  const categoryLabel = getInventoryCategoryLabel(categoryKey);
  const scanTags = getSemanticScanTags(item, {
    unknown,
    cursed,
    sellHereTag,
    groupKey,
    recommendation
  });
  const compareTone = getComparisonTone(item, {
    unknown,
    cursed,
    upgrade
  });

  return {
    index,
    item,
    recommendation,
    reason,
    groupKey,
    sortScore,
    risk,
    upgrade,
    unknown,
    cursed,
    shopTags,
    sellHereTag,
    heavyLabel,
    kindLabel: classifyItem(item),
    effectKey: itemEffectKey,
    isKnownEffect,
    compareTone,
    categoryKey,
    categoryLabel,
    scanTags
  };
}

function stackGroupEntries(entries) {
  const stacks = new Map();
  entries.forEach((entry) => {
    const shouldStack = entry.item.kind === "consumable";
    const stackKey = shouldStack
      ? `${entry.groupKey}:${entry.categoryKey}:${entry.item.id}:${entry.reason}:${entry.recommendation}`
      : `single:${entry.index}`;
    if (!stacks.has(stackKey)) {
      stacks.set(stackKey, {
        ...entry,
        indexes: [entry.index],
        count: 1
      });
      return;
    }
    const stack = stacks.get(stackKey);
    stack.indexes.push(entry.index);
    stack.count += 1;
  });

  return [...stacks.values()].sort((a, b) => b.sortScore - a.sortScore || a.index - b.index);
}

function matchesFilter(entry, filter, shopId = "", inTown = false) {
  switch (filter) {
    case "use":
      return !["weapon", "armor"].includes(entry.item.kind);
    case "equip":
      return entry.item.kind === "weapon" || entry.item.kind === "armor";
    case "sell":
      if (shopId) {
        return Boolean(entry.sellHereTag);
      }
      return !entry.item.doNotSell;
    default:
      return true;
  }
}

function getInventoryPresentationCache(game) {
  let cache = INVENTORY_PRESENTATION_CACHE.get(game);
  if (!cache) {
    cache = new Map();
    INVENTORY_PRESENTATION_CACHE.set(game, cache);
  }
  return cache;
}

function serializeInventoryStateItem(item) {
  if (!item) {
    return "";
  }
  return [
    item.id || "",
    item.kind || "",
    item.slot || "",
    item.spell || "",
    item.effect || "",
    item.affixId || "",
    item.identified ? "1" : "0",
    item.cursed ? "1" : "0",
    item.doNotSell ? "1" : "0",
    item.charges ?? "",
    item.maxCharges ?? "",
    item.power ?? "",
    item.armor ?? "",
    item.value ?? "",
    item.weight ?? ""
  ].join("~");
}

function getInventoryPresentationCacheKey(game, filter = "all", shopId = "") {
  const player = game.player || {};
  const inventorySig = (player.inventory || []).map(serializeInventoryStateItem).join("|");
  const equipmentSig = Object.values(player.equipment || {}).map(serializeInventoryStateItem).join("|");
  const spellSig = (player.spellsKnown || []).join(",");
  const visibleEnemies = getVisibleEnemyCount(game);
  return [
    filter,
    shopId,
    game.currentDepth ?? "",
    player.hp ?? "",
    player.maxHp ?? "",
    player.mana ?? "",
    player.maxMana ?? "",
    spellSig,
    visibleEnemies,
    equipmentSig,
    inventorySig
  ].join("::");
}

export function buildInventoryPresentationModel(game, options = {}) {
  const { filter = "all", selectedIndex = -1, shopId = "" } = options;
  const cacheKey = getInventoryPresentationCacheKey(game, filter, shopId);
  const cache = getInventoryPresentationCache(game);
  let baseModel = cache.get(cacheKey);
  const inTown = game.currentDepth === 0;
  if (!baseModel) {
    const entries = game.player.inventory.map((item, index) => buildInventoryItemSemantics(game, item, index, { shopId }));
    const visibleEntries = entries.filter((entry) => matchesFilter(entry, filter, shopId, inTown));
    const groups = GROUP_DEFS.map((group) => {
      const groupedEntries = visibleEntries.filter((entry) => entry.groupKey === group.key);
      const items = stackGroupEntries(groupedEntries);
      return {
        ...group,
        items,
        sections: INVENTORY_CATEGORY_DEFS.map((category) => ({
          ...category,
          items: items.filter((entry) => entry.categoryKey === category.key)
        })).filter((section) => section.items.length > 0)
      };
    }).filter((group) => group.items.length > 0);
    const sortedVisibleEntries = groups.flatMap((group) => group.items);

    baseModel = {
      entries,
      visibleEntries,
      groups,
      filterDefs: FILTER_DEFS.filter((filterDef) => filterDef.key !== "sell" || inTown || shopId).map((filterDef) => ({
        ...filterDef,
        label: filterDef.key === "sell" ? (shopId ? "Sell Here" : "Sell") : filterDef.label
      })),
      burdenUi: game.getBurdenUiState(),
      buildSummary: getBuildSummary(game),
      firstVisibleIndex: sortedVisibleEntries.length > 0 ? sortedVisibleEntries[0].index : -1,
      visibleCount: visibleEntries.length
    };
    if (cache.size >= 24) {
      cache.clear();
    }
    cache.set(cacheKey, baseModel);
  }

  return {
    entries: baseModel.entries,
    groups: baseModel.groups,
    filterDefs: baseModel.filterDefs,
    burdenUi: baseModel.burdenUi,
    buildSummary: baseModel.buildSummary,
    selectedEntry: baseModel.entries.find((entry) => entry.index === selectedIndex) || null,
    selectedVisible: baseModel.visibleEntries.some((entry) => entry.index === selectedIndex),
    firstVisibleIndex: baseModel.firstVisibleIndex,
    visibleCount: baseModel.visibleCount
  };
}

// Smart inventory glyphs — a single character that encodes the item's most
// important signal. Ordered by urgency: curse beats everything, urgent use
// beats upgrade, upgrade beats unknown. Keeps the row scannable without
// adding a second chip, and lets noise (cursed/junk) visually sink via
// companion .is-dim / .is-noise classes applied by the renderer.
export function getInventoryRowGlyph(entry) {
  if (!entry) return "";
  if (entry.cursed) return "\u00D7";               // × cursed
  if (isUrgentUse(entry)) return "!";             // ! use me now
  if (entry.upgrade) return "\u2191";              // ↑ upgrade available
  if (entry.unknown) return "?";                   // ? unidentified
  if (isDamagedOrSpent(entry.item)) return "~";   // ~ damaged / no charges
  return "";
}

// An item is "urgent use" when the recommendation system flagged it as the
// thing to do right now — e.g. a healing potion when HP is low, or a scroll
// the current floor strongly wants. We read the existing `recommendation`
// field instead of recomputing so the glyph can't diverge from the text.
function isUrgentUse(entry) {
  const rec = (entry.recommendation || "").toLowerCase();
  if (!rec) return false;
  return rec === "use"
    || rec === "use now"
    || rec === "drink"
    || rec === "read"
    || rec === "cast"
    || rec.startsWith("use ");
}

function isDamagedOrSpent(item) {
  if (!item) return false;
  if (item.kind === "charged" && (item.charges || 0) <= 0) return true;
  if (typeof item.durability === "number" && item.maxDurability > 0) {
    return item.durability / item.maxDurability < 0.25;
  }
  return false;
}

// The renderer uses this to decide whether a row should be visually dimmed
// so noise sinks. We dim items that are: cursed, already-learned spellbooks,
// charged items with no charges, and duplicates the player is unlikely to use.
export function isInventoryRowNoise(entry, game) {
  if (!entry) return false;
  if (entry.cursed) return true;
  if (entry.item?.kind === "charged" && (entry.item.charges || 0) <= 0) return true;
  if (entry.item?.kind === "spellbook"
    && game?.player?.spellsKnown?.includes(entry.item.spell)) return true;
  return false;
}

export function buildEquipmentSlotSummary(game, slotDef, compatibleCount = 0) {
  const item = game.player.equipment[slotDef.slot] || null;
  const quality = getSlotQualityLabel(game, slotDef, compatibleCount);
  if (!item) {
    return {
      quality,
      recommendation: compatibleCount > 0 ? "Equip" : "Keep",
      reason: compatibleCount > 0 ? `${compatibleCount} item${compatibleCount === 1 ? "" : "s"} ready for this slot` : "Keep this slot open for upgrades",
      risk: ""
    };
  }
  return {
    quality,
    recommendation: item.cursed ? "Remove curse first" : "Keep",
    reason: item.cursed ? "Locked by curse" : `${quality} in your current build`,
    risk: item.cursed ? "Locks if cursed" : ""
  };
}
