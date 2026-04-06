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
  getItemLightBonus,
  getItemManaBonus,
  getItemName,
  getItemOvercastRelief,
  getItemPower,
  getItemSearchBonus,
  getItemValue,
  getItemWardBonus,
  shopAcceptsItem
} from "../core/entities.js";

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
  { key: "all", label: "All" },
  { key: "use", label: "Use" },
  { key: "equip", label: "Equip" },
  { key: "sell", label: "Sell" }
];

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
  const manaLean = armorPieces.reduce((sum, item) => sum + getItemManaBonus(item), 0) + ((game.player?.spellsKnown?.length || 0) * 2);
  const utilityLean = armorPieces.reduce((sum, item) => sum + getItemDexBonus(item) + getItemLightBonus(item) + getItemSearchBonus(item), 0);
  const guardLean = armorPieces.reduce((sum, item) => sum + getItemGuardBonus(item) + getItemWardBonus(item), 0);
  let headline = "Balanced kit";
  let note = "Mixed offense, defense, and utility.";

  if (manaLean >= attackValue + 2) {
    headline = "Mana-leaning";
    note = "Built around spells, mana pieces, and tools.";
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
  if (getItemManaBonus(item) > 0) {
    return "Mana piece";
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

function getComparisonDeltas(game, item) {
  if (!item.slot || (item.kind !== "weapon" && item.kind !== "armor")) {
    return null;
  }
  const equipped = game.player.equipment[item.slot] || null;
  return {
    equipped,
    attack: item.kind === "weapon" ? getItemPower(item) - (equipped ? getItemPower(equipped) : 0) : 0,
    armor: item.kind === "armor" ? getItemArmor(item) - (equipped ? getItemArmor(equipped) : 0) : 0,
    accuracy: getItemAccuracyBonus(item) - (equipped ? getItemAccuracyBonus(equipped) : 0),
    crit: getItemCritBonus(item) - (equipped ? getItemCritBonus(equipped) : 0),
    guard: getItemGuardBonus(item) - (equipped ? getItemGuardBonus(equipped) : 0),
    ward: getItemWardBonus(item) - (equipped ? getItemWardBonus(equipped) : 0),
    mana: getItemManaBonus(item) - (equipped ? getItemManaBonus(equipped) : 0),
    dex: getItemDexBonus(item) - (equipped ? getItemDexBonus(equipped) : 0),
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

  const slotLabel = game.getPackSlotDefinition(item.slot).label.toLowerCase();
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
    + deltas.dex
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
  if (deltas.dex > 0) {
    return { isUpgrade: true, score, reason: `Adds +${deltas.dex} dexterity`, fillsGap: false };
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

function buildItemSemantics(game, item, index, options = {}) {
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
  const isDuplicateSpellbook = item.kind === "spellbook" && game.player.spellsKnown.includes(item.spell);
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
    reason = "Teaches an unknown spell";
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
    kindLabel: classifyItem(item)
  };
}

function stackGroupEntries(entries, selectedIndex) {
  const stacks = new Map();
  entries.forEach((entry) => {
    const shouldStack = entry.item.kind === "consumable";
    const stackKey = shouldStack
      ? `${entry.groupKey}:${entry.item.id}:${entry.reason}:${entry.recommendation}`
      : `single:${entry.index}`;
    if (!stacks.has(stackKey)) {
      stacks.set(stackKey, {
        ...entry,
        indexes: [entry.index],
        count: 1,
        isSelected: entry.index === selectedIndex
      });
      return;
    }
    const stack = stacks.get(stackKey);
    stack.indexes.push(entry.index);
    stack.count += 1;
    stack.isSelected = stack.isSelected || entry.index === selectedIndex;
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
      return inTown ? entry.shopTags.length > 0 : false;
    default:
      return true;
  }
}

export function buildInventoryPresentationModel(game, options = {}) {
  const { filter = "all", selectedIndex = -1, shopId = "" } = options;
  const inTown = game.currentDepth === 0;
  const entries = game.player.inventory.map((item, index) => buildItemSemantics(game, item, index, { shopId }));
  const visibleEntries = entries.filter((entry) => matchesFilter(entry, filter, shopId, inTown));
  const groups = GROUP_DEFS.map((group) => {
    const groupedEntries = entries
      .filter((entry) => entry.groupKey === group.key)
      .filter((entry) => matchesFilter(entry, filter, shopId, inTown));
    return {
      ...group,
      items: stackGroupEntries(groupedEntries, selectedIndex)
    };
  }).filter((group) => group.items.length > 0);
  const sortedVisibleEntries = groups.flatMap((group) => group.items);

  const filterDefs = FILTER_DEFS.filter((filterDef) => filterDef.key !== "sell" || inTown || shopId).map((filterDef) => ({
    ...filterDef,
    label: filterDef.key === "sell" ? (shopId ? "Sell Here" : "Sell") : filterDef.label
  }));

  return {
    entries,
    groups,
    filterDefs,
    burdenUi: game.getBurdenUiState(),
    buildSummary: getBuildSummary(game),
    selectedEntry: entries.find((entry) => entry.index === selectedIndex) || null,
    selectedVisible: visibleEntries.some((entry) => entry.index === selectedIndex),
    firstVisibleIndex: sortedVisibleEntries.length > 0 ? sortedVisibleEntries[0].index : -1,
    visibleCount: visibleEntries.length
  };
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
