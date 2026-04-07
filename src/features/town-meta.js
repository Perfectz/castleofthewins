import { ITEM_DEFS, RUMOR_DEFS, SHOPS, TOWN_REACTION_DEFS, TOWN_UNLOCK_DEFS } from "../data/content.js";
import { getItemValue } from "../core/entities.js";
import { shuffle } from "../core/utils.js";
import { getDepthTheme } from "./encounters.js";
import { getDurableTownUnlocks, unlockDurableTownProject } from "./meta-progression.js";

export const TOWN_CYCLE_TURNS = 120;

const TOWN_PHASES = [
  "Dawn",
  "Day",
  "Dusk",
  "Night"
];

const TOWN_PHASE_DETAILS = {
  Dawn: {
    buyMultiplier: 1,
    sellMultiplier: 1,
    templeMultiplier: 0.9,
    sageMultiplier: 1,
    rumorMultiplier: 1,
    stockSummary: "Recovery tools and mapping notes are easiest to secure at first light.",
    rumorSummary: "Rumors skew practical and route-focused."
  },
  Day: {
    buyMultiplier: 1,
    sellMultiplier: 1,
    templeMultiplier: 1,
    sageMultiplier: 1,
    rumorMultiplier: 1,
    stockSummary: "General and armory stock are at full daytime breadth.",
    rumorSummary: "Intel is steady and mercantile rather than dramatic."
  },
  Dusk: {
    buyMultiplier: 1,
    sellMultiplier: 1.03,
    templeMultiplier: 1,
    sageMultiplier: 1,
    rumorMultiplier: 0.95,
    stockSummary: "Guild shelves lean toward spellwork, wards, and deep tools.",
    rumorSummary: "Rumors skew deeper and stranger toward dusk."
  },
  Night: {
    buyMultiplier: 1.08,
    sellMultiplier: 1.1,
    templeMultiplier: 1,
    sageMultiplier: 1,
    rumorMultiplier: 1,
    stockSummary: "Night trade is expensive, but dealers pay more for useful salvage.",
    rumorSummary: "Intel turns riskier and more ominous at night."
  }
};

const SHOP_TIER_STOCK = {
  general: {
    1: ["healingPotion", "manaPotion", "identifyScroll", "mappingScroll", "travelBoots", "spellbookLight"],
    2: ["teleportScroll", "removeCurseScroll", "torchCharm", "shadowCloak", "spellbookTraps"],
    3: ["runeScroll", "goldCharm", "emberCharm", "frostCharm", "scoutCloak", "spellbookTeleport"]
  },
  armory: {
    1: ["knife", "shortSword", "leatherArmor", "buckler", "paddedCap", "travelBoots"],
    2: ["rapier", "handAxe", "broadSword", "brigandine", "chainMail", "kiteShield", "bronzeHelm", "greaves"],
    3: ["mace", "battleAxe", "warPick", "warHammer", "scaleMail", "plateMail", "towerShield", "hoodedCowl", "ironHelm", "strideBoots"]
  },
  guild: {
    1: ["oakStaff", "ashStaff", "spellfocusRing", "ironRing", "spellbookFrost", "spellbookIdentify", "spellbookShield", "manaPotion"],
    2: ["wardedCloak", "spellbookPhase", "spellbookSlow", "spellbookHold", "wandLightning", "wandSlow"],
    3: ["runeBlade", "wardingAmulet", "spellbookFire", "spellbookCurse", "spellbookStone", "spellbookLightning", "staffHealing"]
  },
  temple: {
    1: ["healingPotion", "manaPotion", "goldCharm"],
    2: ["torchCharm", "emberCharm", "frostCharm", "spellbookMind", "spellbookSerious", "runeScroll"],
    3: ["removeCurseScroll", "wardingAmulet", "spellbookResistFire", "spellbookResistCold"]
  }
};

function unlocked(game, unlockId) {
  return Boolean(game.durableTownUnlocks?.[unlockId] || game.townUnlocks?.[unlockId]);
}

function getPhaseConfig(phase) {
  return TOWN_PHASE_DETAILS[phase] || TOWN_PHASE_DETAILS.Day;
}

function getShopPoolInternal(game, shopId) {
  const tiers = SHOP_TIER_STOCK[shopId];
  if (!tiers) {
    return [...(SHOPS[shopId]?.stock || [])];
  }
  const tier = game.shopTiers[shopId] || 1;
  const pool = [];
  for (let current = 1; current <= tier; current += 1) {
    pool.push(...(tiers[current] || []));
  }
  pool.push(...getReactionStockBonus(game, shopId));
  return [...new Set(pool)];
}

function getActiveReactionIds(game) {
  const milestones = game.player?.quest?.milestonesCleared || [];
  const discoveries = game.player?.quest?.discoveryIdsFound || [];
  const chronicle = game.chronicleEvents || [];
  const knownRumors = game.player?.knownRumors || [];
  const hasEliteKill = chronicle.some((entry) => entry?.type === "elite_kill");
  const hasGreedLine = chronicle.some((entry) => entry?.type === "greed_choice");
  const carriesCurse = Boolean((game.player?.inventory || []).some((item) => item?.cursed))
    || Boolean(Object.values(game.player?.equipment || {}).some((item) => item?.cursed))
    || (game.player?.constitutionLoss || 0) > 0;
  const ids = [];
  if (hasEliteKill) {
    ids.push("first_elite");
  }
  if (milestones.includes("depth3_gatekeeper")) {
    ids.push("depth3_gatekeeper");
  }
  if (milestones.includes("depth5_cryptlord")) {
    ids.push("depth5_cryptlord");
  }
  if (discoveries.includes("storm_oath") || discoveries.includes("weather_log") || milestones.includes("depth5_cryptlord")) {
    ids.push("storm_knowledge");
  }
  if (carriesCurse) {
    ids.push("curse_pressure");
  }
  if (knownRumors.includes("supplies") || knownRumors.includes("beacon")) {
    ids.push("route_ledger");
  }
  if (game.townUnlocks?.supply_cache || hasGreedLine) {
    ids.push("cache_runners");
  }
  return ids.filter((id, index, array) => array.indexOf(id) === index);
}

function getReactionStockBonus(game, shopId) {
  const activeIds = getActiveReactionIds(game);
  const bonus = [];
  activeIds.forEach((reactionId) => {
    switch (reactionId) {
      case "first_elite":
        if (shopId === "armory") {
          bonus.push("warPick", "strideBoots");
        }
        break;
      case "depth3_gatekeeper":
        if (shopId === "armory") {
          bonus.push("brigandine", "kiteShield", "greaves");
        }
        break;
      case "depth5_cryptlord":
        if (shopId === "guild") {
          bonus.push("wardingAmulet", "spellbookResistFire", "spellbookResistCold", "spellbookCurse");
        }
        if (shopId === "temple") {
          bonus.push("removeCurseScroll", "spellbookSerious");
        }
        break;
      case "storm_knowledge":
        if (shopId === "guild") {
          bonus.push("wandLightning", "spellbookLightning", "spellbookTeleport");
        }
        if (shopId === "general" || shopId === "temple") {
          bonus.push("runeScroll", "emberCharm", "frostCharm");
        }
        break;
      case "curse_pressure":
        if (shopId === "temple") {
          bonus.push("removeCurseScroll", "runeScroll", "spellbookSerious");
        }
        break;
      case "route_ledger":
        if (shopId === "general" || shopId === "guild") {
          bonus.push("mappingScroll", "surveyorCharm");
        }
        break;
      case "cache_runners":
        if (shopId === "general" || shopId === "armory") {
          bonus.push("healingPotion", "pathfinderSandals", "brigandVest");
        }
        break;
      default:
        break;
    }
  });
  return [...new Set(bonus)];
}

function chooseFeaturedItems(pool, predicate, fallbackCount = 2) {
  const preferred = shuffle(pool.filter((itemId) => predicate(ITEM_DEFS[itemId] || {})));
  const fallback = shuffle(pool.filter((itemId) => !preferred.includes(itemId)));
  return [...preferred, ...fallback].slice(0, fallbackCount);
}

function buildDailyFeaturedStock(game) {
  return {
    general: chooseFeaturedItems(getShopPoolInternal(game, "general"), (item) => item.kind === "consumable" || item.id === "mappingScroll"),
    armory: chooseFeaturedItems(getShopPoolInternal(game, "armory"), (item) => item.kind === "weapon" || item.guardBonus || item.slot === "body"),
    guild: chooseFeaturedItems(getShopPoolInternal(game, "guild"), (item) => item.kind === "spellbook" || item.kind === "charged" || item.wardBonus || item.manaBonus),
    temple: chooseFeaturedItems(getShopPoolInternal(game, "temple"), (item) => item.id === "healingPotion" || item.id === "manaPotion" || item.id === "spellbookSerious" || item.fireResist || item.coldResist)
  };
}

function hasFeaturedStock(featuredStock) {
  return Boolean(featuredStock && Object.values(featuredStock).some((items) => Array.isArray(items) && items.length > 0));
}

export function ensureTownMetaState(game) {
  const durableTownUnlocks = typeof game.getDurableTownUnlocks === "function"
    ? game.getDurableTownUnlocks()
    : getDurableTownUnlocks(game);
  game.townUnlocks = {
    supply_cache: false,
    guild_license: false,
    temple_favors: false,
    archive_maps: false,
    ghost_bargains: false,
    deep_contracts: false,
    ...(game.townUnlocks || {}),
    ...(durableTownUnlocks || {})
  };
  game.rumorTable = Array.isArray(game.rumorTable) ? game.rumorTable : [];
  game.shopTiers = {
    general: 1,
    armory: 1,
    guild: 1,
    temple: 1,
    ...(game.shopTiers || {})
  };
  game.townState = {
    dailyFeaturedStock: {},
    phaseModifiers: { ...getPhaseConfig("Dawn") },
    lastCycleIndex: 0,
    ...(game.townState || {})
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
  game.townState.dailyFeaturedStock = game.townState.dailyFeaturedStock || {};
  game.townState.phaseModifiers = game.townState.phaseModifiers || { ...getPhaseConfig("Dawn") };
  if (!hasFeaturedStock(game.townState.dailyFeaturedStock)) {
    game.townState.dailyFeaturedStock = buildDailyFeaturedStock(game);
  }
}

export function getTemplePrice(game, basePrice) {
  const state = getTownCycleState(game);
  const favorMultiplier = unlocked(game, "temple_favors") ? 0.85 : 1;
  return Math.max(1, Math.round(basePrice * favorMultiplier * state.phaseModifiers.templeMultiplier));
}

export function getShopPool(game, shopId) {
  ensureTownMetaState(game);
  return getShopPoolInternal(game, shopId);
}

export function getTownReactionBundle(game, serviceId = "") {
  const ids = getActiveReactionIds(game);
  const lines = ids
    .map((reactionId) => {
      const reaction = TOWN_REACTION_DEFS[reactionId];
      if (!reaction) {
        return "";
      }
      if (serviceId && reaction[serviceId]) {
        return reaction[serviceId];
      }
      return reaction.steward || reaction.guild || reaction.temple || reaction.bank || "";
    })
    .filter(Boolean);
  const stockTags = ids
    .map((reactionId) => TOWN_REACTION_DEFS[reactionId]?.stockTag || "")
    .filter(Boolean);
  return {
    ids,
    lines,
    stockTags
  };
}

export function getTownCycleState(game, turn = game.turn) {
  ensureTownMetaState(game);
  const normalizedTurn = Math.max(1, turn || 1);
  const elapsedTurns = normalizedTurn - 1;
  const cycleIndex = Math.floor(elapsedTurns / TOWN_CYCLE_TURNS);
  const turnsIntoCycle = elapsedTurns % TOWN_CYCLE_TURNS;
  const phaseLength = TOWN_CYCLE_TURNS / TOWN_PHASES.length;
  const phaseIndex = Math.min(TOWN_PHASES.length - 1, Math.floor(turnsIntoCycle / phaseLength));
  const phase = TOWN_PHASES[phaseIndex];
  const phaseModifiers = { ...getPhaseConfig(phase) };
  const featuredStock = hasFeaturedStock(game.townState.dailyFeaturedStock)
    ? game.townState.dailyFeaturedStock
    : buildDailyFeaturedStock(game);
  game.townState.dailyFeaturedStock = featuredStock;
  return {
    day: cycleIndex + 1,
    phase,
    cycleIndex,
    turnsIntoCycle,
    turnsUntilRefresh: TOWN_CYCLE_TURNS - turnsIntoCycle,
    phaseModifiers,
    featuredStock,
    stockSummary: phaseModifiers.stockSummary,
    rumorSummary: phaseModifiers.rumorSummary
  };
}

export function formatTownCycle(state) {
  if (!state) {
    return "Day 1 - Dawn";
  }
  return `Day ${state.day} - ${state.phase}`;
}

export function refreshTownStocks(game, options = {}) {
  const { clearBuyback = true, turn = game.turn } = options;
  ensureTownMetaState(game);
  Object.keys(game.shopState || {}).forEach((shopId) => {
    if (!SHOPS[shopId] || SHOPS[shopId].stock.length === 0) {
      return;
    }
    const pool = getShopPool(game, shopId);
    const count = Math.max(4, Math.min(pool.length, shopId === "guild" ? 8 : 6 + Math.max(0, (game.shopTiers[shopId] || 1) - 1)));
    game.shopState[shopId].stock = shuffle(pool).slice(0, count);
    if (clearBuyback) {
      game.shopState[shopId].buyback = [];
    }
    game.shopState[shopId].lastRefresh = turn;
  });
  const cycle = getTownCycleState(game, turn);
  game.townState.dailyFeaturedStock = buildDailyFeaturedStock(game);
  game.townState.lastCycleIndex = cycle.cycleIndex;
  game.townState.phaseModifiers = { ...cycle.phaseModifiers };
}

export function getShopBuyPrice(game, item, shopId = "") {
  const effectiveBase = Math.max(1, Math.round(getItemValue(item) * 1.2));
  const state = getTownCycleState(game);
  return Math.max(1, Math.round(effectiveBase * state.phaseModifiers.buyMultiplier));
}

export function getShopSellPrice(game, item, shopId = "") {
  const basePrice = shopId === "junk" ? 25 : Math.round(getItemValue(item) * 0.55);
  const state = getTownCycleState(game);
  const contractMultiplier = typeof game.getTownSellBonusMultiplier === "function"
    ? game.getTownSellBonusMultiplier()
    : 1;
  return Math.max(1, Math.round(basePrice * state.phaseModifiers.sellMultiplier * contractMultiplier));
}

export function getSagePrice(game, basePrice = 60) {
  const state = getTownCycleState(game);
  return Math.max(1, Math.round(basePrice * state.phaseModifiers.sageMultiplier));
}

export function getRumorPrice(game) {
  const state = getTownCycleState(game);
  const basePrice = unlocked(game, "archive_maps") ? 25 : 40;
  return Math.max(1, Math.round(basePrice * state.phaseModifiers.rumorMultiplier));
}

export function getUnlockCost(unlockId) {
  const ordered = ["supply_cache", "guild_license", "temple_favors", "archive_maps", "ghost_bargains", "deep_contracts"];
  const index = Math.max(0, ordered.indexOf(unlockId));
  return 140 + index * 70;
}

export function getAvailableTownUnlocks(game) {
  ensureTownMetaState(game);
  return Object.values(TOWN_UNLOCK_DEFS)
    .filter((unlockDef) => !unlocked(game, unlockDef.id))
    .map((unlockDef) => ({
      ...unlockDef,
      cost: getUnlockCost(unlockDef.id)
    }));
}

export function purchaseTownUnlock(game, unlockId) {
  ensureTownMetaState(game);
  const unlockDef = TOWN_UNLOCK_DEFS[unlockId];
  if (!unlockDef || unlocked(game, unlockId)) {
    return false;
  }
  const cost = getUnlockCost(unlockId);
  if (game.player.gold < cost) {
    game.log("You cannot fund that town project yet.", "warning");
    return false;
  }
  game.player.gold -= cost;
  unlockDurableTownProject(game, unlockId);
  game.townUnlocks[unlockId] = true;
  ensureTownMetaState(game);
  refreshTownStocks(game);
  game.log(`Town improvement funded: ${unlockDef.name}.`, "good");
  game.recordChronicleEvent?.("town_unlock", {
    unlockId,
    label: unlockDef.name
  });
  game.recordTelemetry?.("town_unlock_purchase", {
    unlockId,
    cost,
    unlockOrder: Object.values(game.durableTownUnlocks || game.townUnlocks).filter(Boolean).length
  });
  return true;
}

export function getNextFloorRumor(game) {
  const depth = Math.min(game.levels.length - 1, Math.max(1, game.currentDepth + 1));
  const level = game.levels?.[depth];
  const theme = getDepthTheme(depth);
  const cycle = getTownCycleState(game);
  const rumorEntries = [];
  const milestone = level?.milestone;
  if (milestone) {
    const milestoneRumor = RUMOR_DEFS[milestone.id === "depth3_gatekeeper" ? "gatekeeper" : milestone.id === "depth5_cryptlord" ? "cryptlord" : "stormwarden"];
    if (milestoneRumor) {
      rumorEntries.push(milestoneRumor);
    }
  }
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
  if (level?.floorObjective?.id === "seal_shrine" && RUMOR_DEFS.shrine_path) {
    rumorEntries.push(RUMOR_DEFS.shrine_path);
  }
  if (level?.floorObjective?.id === "secure_supplies" && RUMOR_DEFS.supplies) {
    rumorEntries.push(RUMOR_DEFS.supplies);
  }
  if (level?.floorObjective?.id === "recover_waystone" && RUMOR_DEFS.waystone) {
    rumorEntries.push(RUMOR_DEFS.waystone);
  }
  if (level?.floorObjective?.id === "secure_ledger" && RUMOR_DEFS.ledger) {
    rumorEntries.push(RUMOR_DEFS.ledger);
  }
  if (level?.floorObjective?.id === "purify_well" && RUMOR_DEFS.purify_well) {
    rumorEntries.push(RUMOR_DEFS.purify_well);
  }
  if (level?.floorObjective?.id === "break_beacon" && RUMOR_DEFS.beacon) {
    rumorEntries.push(RUMOR_DEFS.beacon);
  }
  if (level?.floorObjective?.id === "light_watchfire" && RUMOR_DEFS.watchfire) {
    rumorEntries.push(RUMOR_DEFS.watchfire);
  }
  if (cycle.phase === "Dawn") {
    return rumorEntries.find((entry) => ["relic_hunt", "nest", "captive", "supplies", "waystone", "ledger", "shrine_path", "watchfire", theme?.id].includes(entry.id)) || rumorEntries[0] || null;
  }
  if (cycle.phase === "Dusk" || cycle.phase === "Night") {
    return rumorEntries[0] || null;
  }
  return rumorEntries[1] || rumorEntries[0] || null;
}

export function buyTownRumor(game) {
  ensureTownMetaState(game);
  const price = getRumorPrice(game);
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
  game.recordTelemetry?.("town_rumor_buy", {
    rumorId: rumor.id,
    spendType: spendToken ? "token" : "gold",
    price: spendToken ? 0 : price
  });
  return true;
}

export function getTownIntel(game) {
  ensureTownMetaState(game);
  const cycle = getTownCycleState(game);
  const nextRumor = getNextFloorRumor(game);
  const known = game.rumorTable
    .map((id) => RUMOR_DEFS[id])
    .filter(Boolean)
    .slice(-3);
  return {
    nextRumor,
    known,
    cycle,
    featuredStock: cycle.featuredStock,
    reactions: getTownReactionBundle(game)
  };
}

export function getTownMetaSummary(game) {
  ensureTownMetaState(game);
  const intel = getTownIntel(game);
  const nextUnlock = getAvailableTownUnlocks(game)[0] || null;
  const rumorTokens = game.player?.runCurrencies?.rumorTokens || 0;
  const bankGold = Math.floor(game.player?.bankGold || 0);
  const onHand = Math.floor(game.player?.gold || 0);
  const rumorPrice = getRumorPrice(game);
  const nextRunIntent = typeof game.getNextRunIntent === "function" ? game.getNextRunIntent() : null;
  const nextRunFocus = nextRunIntent?.progressText || (typeof game.getNextRunFocusLines === "function" ? game.getNextRunFocusLines().find(Boolean) || "" : "");
  const contractModel = typeof game.getContractViewModel === "function" ? game.getContractViewModel() : null;
  const recommendedContract = contractModel?.all?.find((contract) => contract.id === contractModel.recommendedId) || null;
  const canArmRecommendedContract = Boolean(recommendedContract?.unlocked && !recommendedContract?.active);
  const canBuyRumor = rumorTokens > 0 || onHand >= rumorPrice;
  const nextUnlockText = nextUnlock
    ? onHand >= nextUnlock.cost
      ? `Fund ${nextUnlock.name}`
      : `Save for ${nextUnlock.name} (${nextUnlock.cost} gp)`
    : "All current projects funded";
  const intelText = intel.nextRumor?.text || "No clear rumor posted for the next floor.";
  let recommendedActionId = "bank";
  let recommendedActionLabel = "Review Bank Plan";
  let recommendedAction = "Check the bank for next-floor intel and support for this adventurer.";
  let recommendedReason = "Town persistence turns a clean return into the next run's edge.";

  if (nextRunIntent?.cta?.actionId?.startsWith("town_unlock:") && nextUnlock && onHand >= nextUnlock.cost) {
    recommendedActionId = nextRunIntent.cta.actionId;
    recommendedActionLabel = nextRunIntent.cta.label;
    recommendedAction = nextRunIntent.cta.text;
    recommendedReason = nextRunIntent.cta.progressText;
  } else if (nextRunIntent?.cta?.actionId === "contract_recommended" && canArmRecommendedContract) {
    recommendedActionId = nextRunIntent.cta.actionId;
    recommendedActionLabel = nextRunIntent.cta.label;
    recommendedAction = nextRunIntent.cta.text;
    recommendedReason = nextRunIntent.cta.progressText;
  } else if (nextRunIntent?.cta?.actionId === "town_rumor" && canBuyRumor) {
    recommendedActionId = nextRunIntent.cta.actionId;
    recommendedActionLabel = nextRunIntent.cta.label;
    recommendedAction = nextRunIntent.cta.text;
    recommendedReason = nextRunIntent.cta.progressText;
  } else if (game.storyFlags?.postReturnBankPrompt && canArmRecommendedContract) {
    recommendedActionId = "contract_recommended";
    recommendedActionLabel = `Arm ${recommendedContract.name}`;
    recommendedAction = `Arm ${recommendedContract.name} before the next run.`;
    recommendedReason = recommendedContract.recommendationReason || recommendedContract.description;
  } else if (game.storyFlags?.postReturnBankPrompt && canBuyRumor) {
    recommendedActionId = "town_rumor";
    recommendedActionLabel = rumorTokens > 0 ? "Spend Rumor Token" : "Buy Intel";
    recommendedAction = rumorTokens > 0
      ? "Spend a rumor token on next-floor intel while the last return is still fresh."
      : "Buy next-floor intel before heading north again.";
    recommendedReason = intelText;
  } else if (canArmRecommendedContract) {
    recommendedActionId = "contract_recommended";
    recommendedActionLabel = `Arm ${recommendedContract.name}`;
    recommendedAction = `Arm ${recommendedContract.name} for the next run.`;
    recommendedReason = recommendedContract.recommendationReason || recommendedContract.description;
  } else if (rumorTokens > 0) {
    recommendedActionId = "town_rumor";
    recommendedActionLabel = "Spend Rumor Token";
    recommendedAction = "Spend a rumor token at the bank for fresh intel.";
    recommendedReason = intelText;
  } else if (nextUnlock && onHand >= nextUnlock.cost) {
    recommendedActionId = `town_unlock:${nextUnlock.id}`;
    recommendedActionLabel = `Fund ${nextUnlock.name}`;
    recommendedAction = `Fund ${nextUnlock.name} now to improve this adventurer's next descents.`;
    recommendedReason = nextUnlock.description;
  } else if (canBuyRumor) {
    recommendedActionId = "town_rumor";
    recommendedActionLabel = "Buy Intel";
    recommendedAction = "Buy intel before heading north again.";
    recommendedReason = intelText;
  } else if (bankGold > 0 && onHand < 100) {
    recommendedActionId = "bank_withdraw";
    recommendedActionLabel = "Withdraw 100";
    recommendedAction = "Use banked gold for safety, intel, or your next town project before descending.";
    recommendedReason = "Liquid gold lets this adventurer convert value before the next descent.";
  } else if (onHand > 0) {
    recommendedActionId = "bank_deposit";
    recommendedActionLabel = "Deposit 100";
    recommendedAction = "Bank spare gold if you want a safer next descent.";
    recommendedReason = "Account gold survives the trip back north better than loose coin.";
  }
  return {
    bankGold,
    rumorTokens,
    nextUnlock,
    nextRumor: intel.nextRumor || null,
    nextRunIntent,
    recommendedActionId,
    recommendedActionLabel,
    recommendedAction,
    recommendedReason: nextRunFocus ? `${recommendedReason} ${nextRunFocus}` : recommendedReason,
    recommendedContractId: recommendedContract?.id || "",
    summary: `Secured ${bankGold} gp | Rumor tokens ${rumorTokens} | ${nextUnlockText} | Next-floor intel: ${intelText} | Next: ${recommendedActionLabel}${nextRunFocus ? ` | ${nextRunFocus}` : ""}`
  };
}
