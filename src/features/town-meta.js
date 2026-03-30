import { RUMOR_DEFS, SHOPS, TOWN_UNLOCK_DEFS } from "../data/content.js";
import { shuffle } from "../core/utils.js";
import { getDepthTheme } from "./encounters.js";

const SHOP_TIER_STOCK = {
  general: {
    1: ["healingPotion", "manaPotion", "identifyScroll", "mappingScroll", "travelBoots"],
    2: ["teleportScroll", "removeCurseScroll", "torchCharm"],
    3: ["runeScroll", "goldCharm"]
  },
  armory: {
    1: ["shortSword", "broadSword", "leatherArmor", "buckler", "bronzeHelm"],
    2: ["battleAxe", "chainMail", "towerShield", "ironHelm"],
    3: ["warHammer", "plateMail"]
  },
  guild: {
    1: ["oakStaff", "spellfocusRing", "spellbookFrost", "spellbookIdentify", "manaPotion"],
    2: ["spellbookPhase", "spellbookSlow", "wandLightning", "wandSlow"],
    3: ["spellbookFire", "spellbookCurse", "staffHealing"]
  },
  temple: {
    1: ["healingPotion", "manaPotion", "goldCharm"],
    2: ["torchCharm", "spellbookMind", "runeScroll"],
    3: ["removeCurseScroll"]
  }
};

function unlocked(game, unlockId) {
  return Boolean(game.townUnlocks?.[unlockId]);
}

export function ensureTownMetaState(game) {
  game.townUnlocks = {
    supply_cache: false,
    guild_license: false,
    temple_favors: false,
    archive_maps: false,
    ghost_bargains: false,
    deep_contracts: false,
    ...(game.townUnlocks || {})
  };
  game.rumorTable = Array.isArray(game.rumorTable) ? game.rumorTable : [];
  game.shopTiers = {
    general: 1,
    armory: 1,
    guild: 1,
    temple: 1,
    ...(game.shopTiers || {})
  };
  if (unlocked(game, "supply_cache")) {
    game.shopTiers.general = 2;
  }
  if (unlocked(game, "guild_license")) {
    game.shopTiers.guild = 2;
  }
  if (unlocked(game, "temple_favors")) {
    game.shopTiers.temple = 2;
  }
  if (unlocked(game, "deep_contracts")) {
    game.shopTiers.armory = 3;
    game.shopTiers.guild = 3;
  }
  if (unlocked(game, "archive_maps")) {
    game.shopTiers.general = Math.max(game.shopTiers.general, 2);
  }
}

export function getTemplePrice(game, basePrice) {
  ensureTownMetaState(game);
  return unlocked(game, "temple_favors") ? Math.round(basePrice * 0.85) : basePrice;
}

export function getShopPool(game, shopId) {
  ensureTownMetaState(game);
  const tiers = SHOP_TIER_STOCK[shopId];
  if (!tiers) {
    return [...(SHOPS[shopId]?.stock || [])];
  }
  const tier = game.shopTiers[shopId] || 1;
  const pool = [];
  for (let current = 1; current <= tier; current += 1) {
    pool.push(...(tiers[current] || []));
  }
  return [...new Set(pool)];
}

export function refreshTownStocks(game) {
  ensureTownMetaState(game);
  Object.keys(game.shopState || {}).forEach((shopId) => {
    if (!SHOPS[shopId] || SHOPS[shopId].stock.length === 0) {
      return;
    }
    const pool = getShopPool(game, shopId);
    const count = Math.max(4, Math.min(pool.length, shopId === "guild" ? 8 : 6 + Math.max(0, (game.shopTiers[shopId] || 1) - 1)));
    game.shopState[shopId].stock = shuffle(pool).slice(0, count);
    game.shopState[shopId].lastRefresh = game.turn;
  });
}

export function getUnlockCost(unlockId) {
  const ordered = ["supply_cache", "guild_license", "temple_favors", "archive_maps", "ghost_bargains", "deep_contracts"];
  const index = Math.max(0, ordered.indexOf(unlockId));
  return 140 + index * 70;
}

export function getAvailableTownUnlocks(game) {
  ensureTownMetaState(game);
  return Object.values(TOWN_UNLOCK_DEFS)
    .filter((unlockDef) => !game.townUnlocks[unlockDef.id])
    .map((unlockDef) => ({
      ...unlockDef,
      cost: getUnlockCost(unlockDef.id)
    }));
}

export function purchaseTownUnlock(game, unlockId) {
  ensureTownMetaState(game);
  const unlockDef = TOWN_UNLOCK_DEFS[unlockId];
  if (!unlockDef || game.townUnlocks[unlockId]) {
    return false;
  }
  const cost = getUnlockCost(unlockId);
  if (game.player.gold < cost) {
    game.log("You cannot fund that town project yet.", "warning");
    return false;
  }
  game.player.gold -= cost;
  game.townUnlocks[unlockId] = true;
  ensureTownMetaState(game);
  refreshTownStocks(game);
  game.log(`Town improvement funded: ${unlockDef.name}.`, "good");
  game.recordChronicleEvent?.("town_unlock", {
    unlockId,
    label: unlockDef.name
  });
  return true;
}

export function getNextFloorRumor(game) {
  const depth = Math.min(game.levels.length - 1, Math.max(1, game.currentDepth + 1));
  const level = game.levels?.[depth];
  const theme = getDepthTheme(depth);
  const rumorEntries = [];
  if (theme && RUMOR_DEFS[theme.id]) {
    rumorEntries.push(RUMOR_DEFS[theme.id]);
  }
  if (level?.floorObjective?.id === "recover_relic" && RUMOR_DEFS.relic_hunt) {
    rumorEntries.push(RUMOR_DEFS.relic_hunt);
  }
  if (level?.floorObjective?.id === "purge_nest" && RUMOR_DEFS.nest) {
    rumorEntries.push(RUMOR_DEFS.nest);
  }
  if (level?.floorObjective?.id === "rescue_captive" && RUMOR_DEFS.captive) {
    rumorEntries.push(RUMOR_DEFS.captive);
  }
  return rumorEntries[0] || null;
}

export function buyTownRumor(game) {
  ensureTownMetaState(game);
  const price = unlocked(game, "archive_maps") ? 25 : 40;
  const spendToken = (game.player.runCurrencies?.rumorTokens || 0) > 0;
  if (!spendToken && game.player.gold < price) {
    game.log("You cannot afford fresh intel.", "warning");
    return false;
  }
  const rumor = getNextFloorRumor(game);
  if (!rumor) {
    game.log("No new intel is available right now.", "warning");
    return false;
  }
  if (spendToken) {
    game.player.runCurrencies.rumorTokens -= 1;
  } else {
    game.player.gold -= price;
  }
  if (!game.rumorTable.includes(rumor.id)) {
    game.rumorTable.push(rumor.id);
  }
  game.learnRumor?.(rumor.id);
  game.log(`Rumor secured: ${rumor.text}`, "good");
  return true;
}

export function getTownIntel(game) {
  ensureTownMetaState(game);
  const nextRumor = getNextFloorRumor(game);
  const known = game.rumorTable
    .map((id) => RUMOR_DEFS[id])
    .filter(Boolean)
    .slice(-3);
  return {
    nextRumor,
    known
  };
}
