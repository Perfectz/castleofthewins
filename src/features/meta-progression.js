import { CLASS_MASTERY_DEFS, COMMENDATION_DEFS, CONTRACT_DEFS, SPELLS, TOWN_UNLOCK_DEFS } from "../data/content.js";
import { createTownItem } from "../core/entities.js";

const META_PROFILE_KEY = "cotw.meta.v1";
const CAMPAIGN_ARCHIVE_LIMIT = 18;

function parseMetaProfile() {
  if (typeof localStorage === "undefined") {
    return {};
  }
  try {
    return JSON.parse(localStorage.getItem(META_PROFILE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveMetaProfile(profile) {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(META_PROFILE_KEY, JSON.stringify(profile));
}

function defaultMasteries() {
  return {
    fighter: 0,
    rogue: 0,
    wizard: 0
  };
}

function defaultUnlockedContracts() {
  return ["pressed_descent"];
}

function defaultTownUnlocks() {
  return Object.fromEntries(Object.keys(TOWN_UNLOCK_DEFS).map((unlockId) => [unlockId, false]));
}

function defaultCommendations() {
  return Object.fromEntries(Object.keys(COMMENDATION_DEFS).map((commendationId) => [commendationId, false]));
}

function normalizeBooleanMap(values = {}, defaults = {}) {
  return Object.fromEntries(
    Object.keys(defaults).map((key) => [key, Boolean(values?.[key])])
  );
}

function buildMasterySummary(def, rank) {
  const unlocked = (def.ranks || []).filter((entry) => entry.rank <= rank);
  const next = (def.ranks || []).find((entry) => entry.rank === rank + 1);
  if (unlocked.length === 0) {
    return next ? `Next unlock: ${next.name}. ${next.description}` : "No mastery bonus yet.";
  }
  const unlockedText = unlocked.map((entry) => entry.name).join(", ");
  return next
    ? `Unlocked: ${unlockedText}. Next: ${next.name}.`
    : `Unlocked: ${unlockedText}.`;
}

function getRelevantHistory(game, limit = 5) {
  const history = Array.isArray(game.runSummaryHistory) && game.runSummaryHistory.length > 0
    ? game.runSummaryHistory
    : Array.isArray(game.campaignArchive) ? game.campaignArchive : [];
  return history.slice(-limit);
}

function dedupeContractUnlocks(game) {
  game.contracts.unlocked = [...new Set(game.contracts.unlocked)];
  defaultUnlockedContracts().forEach((contractId) => {
    if (!game.contracts.unlocked.includes(contractId)) {
      game.contracts.unlocked.push(contractId);
    }
  });
}

const CONTRACT_UNLOCK_HINTS = {
  pressed_descent: "Available by default for new adventurers.",
  greed_ledger: "Unlocks after clearing any floor objective.",
  scholar_road: "Unlocks after banking one successful extract.",
  hunters_call: "Unlocks after killing any elite.",
  ration_run: "Unlocks after banking a route-heavy extract.",
  sealed_return: "Unlocks after banking a clean extract without taking a greed room.",
  route_debt: "Unlocks after earning the Route Reader commendation from a route-heavy extract.",
  trophy_path: "Unlocks after earning the Elite Hunter commendation from an elite-heavy run.",
  greedy_burden: "Unlocks after earning the Greed Specialist commendation from a greed-heavy extract.",
  last_light: "Unlocks after banking a low-recovery extract."
};

const CONTRACT_EFFECT_LINES = {
  pressed_descent: [
    "Town Persistence",
    "Opt-in",
    "Applies to next run only",
    "Reinforcement clocks start shorter.",
    "Resolved objectives pay +1 rumor token."
  ],
  greed_ledger: [
    "Town Persistence",
    "Opt-in",
    "Applies to next run only",
    "Greed rooms pay extra gold.",
    "Greed rooms pay +1 rumor token.",
    "Greed actions raise pressure harder."
  ],
  scholar_road: [
    "Town Persistence",
    "Opt-in",
    "Applies to next run only",
    "Search reveals more route at a time.",
    "Resolved objectives pay +1 rumor token.",
    "You begin runs with lower maximum health."
  ],
  hunters_call: [
    "Town Persistence",
    "Opt-in",
    "Applies to next run only",
    "Elite kills pay extra gold.",
    "Elite kills pay +1 rumor token.",
    "Reinforcement waves are more likely to include elites."
  ],
  ration_run: [
    "Town Persistence",
    "Opt-in",
    "Applies to next run only",
    "Start with a healing potion and mapping scroll.",
    "Waiting, resting, and searching raise pressure harder."
  ],
  sealed_return: [
    "Town Persistence",
    "Opt-in",
    "Applies to next run only",
    "Start with a Rune of Return and +1 rumor token.",
    "Greed raises pressure harder.",
    "You begin runs with lower maximum health."
  ],
  route_debt: [
    "Town Persistence",
    "Opt-in",
    "Applies to next run only",
    "Start with +1 rumor token.",
    "Search reveals more route at a time.",
    "Searching raises pressure harder and you begin runs with lower maximum health."
  ],
  trophy_path: [
    "Town Persistence",
    "Opt-in",
    "Applies to next run only",
    "Elite kills pay extra gold.",
    "Elite kills pay +1 rumor token.",
    "Elite reinforcements are more likely."
  ],
  greedy_burden: [
    "Town Persistence",
    "Opt-in",
    "Applies to next run only",
    "Greed rooms pay more.",
    "Town buyers pay better after return.",
    "Burden penalties worsen and greed raises pressure harder."
  ],
  last_light: [
    "Town Persistence",
    "Opt-in",
    "Applies to next run only",
    "Start with emergency stock.",
    "Waiting, resting, and searching all raise pressure harder."
  ]
};

const TRIGGER_LABELS = {
  objective: "Clear any floor objective",
  extract: "Return to town after banking a cleared floor"
};

function formatMasteryReward(entry = {}) {
  const rewards = [];
  (entry.itemIds || []).forEach((itemId) => {
    const item = createTownItem(itemId);
    rewards.push(item?.name || itemId);
  });
  (entry.spellIds || []).forEach((spellId) => {
    rewards.push(SPELLS[spellId]?.name || spellId);
  });
  if (entry.rumorTokens) {
    rewards.push(`${entry.rumorTokens} rumor token${entry.rumorTokens === 1 ? "" : "s"}`);
  }
  return rewards;
}

function sortContracts(left, right) {
  return left.name.localeCompare(right.name);
}

function countRecentClassExtracts(game, classId) {
  const archive = Array.isArray(game.campaignArchive) ? game.campaignArchive : [];
  let streak = 0;
  for (let index = archive.length - 1; index >= 0; index -= 1) {
    const entry = archive[index];
    if (entry?.outcome !== "extract") {
      break;
    }
    if (entry.classId !== classId) {
      break;
    }
    streak += 1;
  }
  return streak;
}

export function ensureMetaProgressionState(game) {
  const stored = parseMetaProfile();
  game.classMasteries = {
    ...defaultMasteries(),
    ...(stored.classMasteries || {}),
    ...(game.classMasteries || {})
  };
  game.contracts = {
    unlocked: Array.isArray(stored.unlockedContracts) && stored.unlockedContracts.length > 0
      ? [...stored.unlockedContracts]
      : defaultUnlockedContracts(),
    activeId: stored.activeContractId || "",
    currentRunId: game.contracts?.currentRunId || "",
    ...(game.contracts || {})
  };
  dedupeContractUnlocks(game);
  game.durableTownUnlocks = {
    ...defaultTownUnlocks(),
    ...normalizeBooleanMap(stored.durableTownUnlocks, defaultTownUnlocks()),
    ...normalizeBooleanMap(game.durableTownUnlocks, defaultTownUnlocks())
  };
  game.commendations = {
    ...defaultCommendations(),
    ...normalizeBooleanMap(stored.commendations, defaultCommendations()),
    ...normalizeBooleanMap(game.commendations, defaultCommendations())
  };
  game.campaignArchive = Array.isArray(stored.campaignArchive)
    ? stored.campaignArchive.slice(-CAMPAIGN_ARCHIVE_LIMIT)
    : Array.isArray(game.campaignArchive)
      ? game.campaignArchive.slice(-CAMPAIGN_ARCHIVE_LIMIT)
      : [];
}

export function persistMetaProgressionState(game) {
  ensureMetaProgressionState(game);
  saveMetaProfile({
    classMasteries: game.classMasteries,
    unlockedContracts: game.contracts.unlocked,
    activeContractId: game.contracts.activeId || "",
    durableTownUnlocks: game.durableTownUnlocks,
    commendations: game.commendations,
    campaignArchive: game.campaignArchive.slice(-CAMPAIGN_ARCHIVE_LIMIT)
  });
}

export function mergeLegacyTownUnlocks(game, legacyTownUnlocks = {}) {
  ensureMetaProgressionState(game);
  const defaults = defaultTownUnlocks();
  let changed = false;
  Object.keys(defaults).forEach((unlockId) => {
    if (legacyTownUnlocks?.[unlockId] && !game.durableTownUnlocks[unlockId]) {
      game.durableTownUnlocks[unlockId] = true;
      changed = true;
    }
  });
  if (changed) {
    persistMetaProgressionState(game);
  }
  return changed;
}

export function getDurableTownUnlocks(game) {
  ensureMetaProgressionState(game);
  return { ...game.durableTownUnlocks };
}

export function unlockDurableTownProject(game, unlockId) {
  ensureMetaProgressionState(game);
  if (!Object.prototype.hasOwnProperty.call(game.durableTownUnlocks, unlockId)) {
    return false;
  }
  if (game.durableTownUnlocks[unlockId]) {
    return false;
  }
  game.durableTownUnlocks[unlockId] = true;
  persistMetaProgressionState(game);
  return true;
}

export function getCampaignArchive(game, limit = CAMPAIGN_ARCHIVE_LIMIT) {
  ensureMetaProgressionState(game);
  return game.campaignArchive.slice(-limit).reverse();
}

export function recordCampaignSummary(game, summary) {
  ensureMetaProgressionState(game);
  if (!summary) {
    return null;
  }
  game.campaignArchive.push(summary);
  game.campaignArchive = game.campaignArchive.slice(-CAMPAIGN_ARCHIVE_LIMIT);
  persistMetaProgressionState(game);
  return summary;
}

export function getActiveContract(game, useCurrentRun = false) {
  ensureMetaProgressionState(game);
  const contractId = useCurrentRun ? (game.contracts.currentRunId || game.contracts.activeId) : game.contracts.activeId;
  return contractId ? CONTRACT_DEFS[contractId] || null : null;
}

export function setActiveContract(game, contractId = "") {
  ensureMetaProgressionState(game);
  if (!contractId) {
    game.contracts.activeId = "";
    persistMetaProgressionState(game);
    return true;
  }
  if (!game.contracts.unlocked.includes(contractId) || !CONTRACT_DEFS[contractId]) {
    return false;
  }
  game.contracts.activeId = contractId;
  persistMetaProgressionState(game);
  return true;
}

export function unlockContract(game, contractId) {
  ensureMetaProgressionState(game);
  if (!CONTRACT_DEFS[contractId] || game.contracts.unlocked.includes(contractId)) {
    return false;
  }
  game.contracts.unlocked.push(contractId);
  dedupeContractUnlocks(game);
  persistMetaProgressionState(game);
  return true;
}

export function applyContractToNewRun(game) {
  ensureMetaProgressionState(game);
  if (!game.contracts.unlocked.includes(game.contracts.activeId)) {
    game.contracts.activeId = "";
  }
  game.contracts.currentRunId = game.contracts.activeId || "";
  return getActiveContract(game, true);
}

export function getAvailableContracts(game) {
  ensureMetaProgressionState(game);
  return Object.values(CONTRACT_DEFS).map((contract) => ({
    ...contract,
    unlocked: game.contracts.unlocked.includes(contract.id),
    active: game.contracts.activeId === contract.id,
    unlockHint: CONTRACT_UNLOCK_HINTS[contract.id] || "Unlock condition not yet documented.",
    effectLines: CONTRACT_EFFECT_LINES[contract.id] || [
      "Town Persistence",
      "Opt-in",
      "Applies to next run only",
      contract.description
    ]
  })).sort(sortContracts);
}

export function getClassMasteryRank(game, classId) {
  ensureMetaProgressionState(game);
  return game.classMasteries[classId] || 0;
}

export function getClassMasterySummary(game, classId) {
  const def = CLASS_MASTERY_DEFS[classId];
  const rank = getClassMasteryRank(game, classId);
  if (!def) {
    return "No mastery track.";
  }
  return buildMasterySummary(def, rank);
}

export function getClassMasteryViewModel(game, classId) {
  ensureMetaProgressionState(game);
  const def = CLASS_MASTERY_DEFS[classId];
  if (!def) {
    return {
      classId,
      className: classId || "Unknown",
      rank: 0,
      summary: "No mastery track.",
      ladder: [],
      unlockedRewards: [],
      startingBonuses: [],
      nextReward: null
    };
  }
  const rank = getClassMasteryRank(game, classId);
  const ladder = (def.ranks || []).map((entry) => ({
    rank: entry.rank,
    name: entry.name,
    description: entry.description,
    trigger: entry.trigger,
    triggerLabel: TRIGGER_LABELS[entry.trigger] || entry.trigger,
    unlocked: entry.rank <= rank,
    rewardLines: formatMasteryReward(entry)
  }));
  const unlockedRewards = ladder.filter((entry) => entry.unlocked);
  const nextReward = ladder.find((entry) => !entry.unlocked) || null;
  return {
    classId,
    className: def.name,
    rank,
    summary: getClassMasterySummary(game, classId),
    ladder,
    unlockedRewards,
    startingBonuses: unlockedRewards.flatMap((entry) => entry.rewardLines),
    nextReward
  };
}

export function getAvailableCommendations(game) {
  ensureMetaProgressionState(game);
  return Object.values(COMMENDATION_DEFS).map((commendation) => ({
    ...commendation,
    unlocked: Boolean(game.commendations?.[commendation.id])
  }));
}

export function getNextCommendationGoal(game, classId = game.player?.classId || "") {
  ensureMetaProgressionState(game);
  const archive = Array.isArray(game.campaignArchive) ? game.campaignArchive : [];
  if (!game.commendations.clean_extract) {
    return {
      id: "clean_extract",
      text: "1 clean extract earns the Clean Extract archive badge."
    };
  }
  if (!game.commendations.route_reader) {
    const bestSearch = archive.reduce((max, entry) => Math.max(max, entry?.outcome === "extract" ? (entry.searchCount || 0) : 0), 0);
    return {
      id: "route_reader",
      text: `${Math.max(0, 4 - bestSearch)} more route searches in one extract earn Route Reader.`
    };
  }
  if (!game.commendations.elite_hunter) {
    const bestElites = archive.reduce((max, entry) => Math.max(max, entry?.eliteKills || 0), 0);
    return {
      id: "elite_hunter",
      text: `${Math.max(0, 2 - bestElites)} more elite kill${bestElites >= 1 ? "" : "s"} in one run earn Elite Hunter.`
    };
  }
  if (!game.commendations.class_loyalist) {
    const streak = countRecentClassExtracts(game, classId);
    return {
      id: "class_loyalist",
      text: `${Math.max(0, 3 - streak)} more ${CLASS_MASTERY_DEFS[classId]?.name?.replace(" Mastery", "") || classId || "class"} extract${streak === 2 ? "" : "s"} earn Class Loyalist.`
    };
  }
  return {
    id: "campaign_archive",
    text: "Current commendation set is complete."
  };
}

export function unlockCommendation(game, commendationId) {
  ensureMetaProgressionState(game);
  if (!COMMENDATION_DEFS[commendationId] || game.commendations[commendationId]) {
    return false;
  }
  game.commendations[commendationId] = true;
  persistMetaProgressionState(game);
  return true;
}

export function evaluateRunCommendations(game, summary) {
  ensureMetaProgressionState(game);
  if (!summary) {
    return [];
  }
  const unlocked = [];
  const maybeUnlock = (commendationId, contractId = "") => {
    if (!unlockCommendation(game, commendationId)) {
      return;
    }
    const commendation = COMMENDATION_DEFS[commendationId];
    const unlockedContract = contractId && unlockContract(game, contractId);
    unlocked.push({
      id: commendationId,
      name: commendation?.name || commendationId,
      rewardLabel: unlockedContract
        ? `Unlocks contract: ${CONTRACT_DEFS[contractId]?.name || contractId}`
        : commendation?.rewardLabel || "Archive badge",
      contractId: unlockedContract ? contractId : ""
    });
  };

  if (summary.outcome === "extract" && (summary.greedCount || 0) === 0) {
    maybeUnlock("clean_extract");
  }
  if (summary.outcome === "extract" && (summary.greedCount || 0) >= 2) {
    maybeUnlock("greed_specialist", "greedy_burden");
  }
  if ((summary.eliteKills || 0) >= 2) {
    maybeUnlock("elite_hunter", "trophy_path");
  }
  if (summary.outcome === "extract" && (summary.searchCount || 0) >= 4) {
    maybeUnlock("route_reader", "route_debt");
  }
  if (summary.outcome === "extract" && summary.carriedCurse) {
    maybeUnlock("curse_survivor");
  }
  if (summary.outcome === "extract" && countRecentClassExtracts(game, summary.classId) >= 3) {
    maybeUnlock("class_loyalist");
  }
  return unlocked;
}

export function getCreationPersistencePreview(game, classId) {
  const mastery = getClassMasteryViewModel(game, classId);
  const activeContract = getActiveContract(game, false);
  return {
    activeContract,
    mastery,
    startingBonuses: mastery.startingBonuses
  };
}

export function applyClassMasteryBonuses(game) {
  ensureMetaProgressionState(game);
  const classId = game.player?.classId;
  const def = CLASS_MASTERY_DEFS[classId];
  if (!def) {
    return [];
  }
  const rank = getClassMasteryRank(game, classId);
  const applied = [];
  (def.ranks || []).filter((entry) => entry.rank <= rank).forEach((entry) => {
    (entry.itemIds || []).forEach((itemId) => {
      const item = createTownItem(itemId);
      if (item) {
        game.addItemToInventory(item);
        applied.push(item.name || item.id);
      }
    });
    (entry.spellIds || []).forEach((spellId) => {
      if (!game.player.spellsKnown.includes(spellId)) {
        game.player.spellsKnown.push(spellId);
        game.addSpellToTrayIfSpace?.(spellId);
        applied.push(spellId);
      }
    });
    if (entry.rumorTokens) {
      game.player.runCurrencies.rumorTokens += entry.rumorTokens;
      applied.push(`${entry.rumorTokens} rumor token${entry.rumorTokens === 1 ? "" : "s"}`);
    }
  });
  return applied;
}

export function applyCommendationBonuses(game) {
  ensureMetaProgressionState(game);
  const applied = [];
  if (game.commendations.class_loyalist && countRecentClassExtracts(game, game.player?.classId) >= 3) {
    game.player.runCurrencies.rumorTokens += 1;
    applied.push("Class Loyalist: +1 rumor token");
  }
  return applied;
}

export function advanceClassMastery(game, trigger) {
  ensureMetaProgressionState(game);
  const classId = game.player?.classId;
  const def = CLASS_MASTERY_DEFS[classId];
  if (!def) {
    return null;
  }
  const currentRank = getClassMasteryRank(game, classId);
  const nextRank = (def.ranks || []).find((entry) => entry.rank === currentRank + 1 && entry.trigger === trigger);
  if (!nextRank) {
    return null;
  }
  game.classMasteries[classId] = nextRank.rank;
  persistMetaProgressionState(game);
  return nextRank;
}

export function getRecommendedContract(game) {
  ensureMetaProgressionState(game);
  const history = getRelevantHistory(game, 5);
  if (history.length === 0) {
    return {
      id: "pressed_descent",
      reason: "Low-friction opt-in contract for the next run."
    };
  }
  const searchAverage = history.reduce((sum, summary) => sum + (summary.searchCount || 0), 0) / history.length;
  const greedAverage = history.reduce((sum, summary) => sum + (summary.greedCount || 0), 0) / history.length;
  const eliteAverage = history.reduce((sum, summary) => sum + (summary.eliteKills || 0), 0) / history.length;
  const lowRecoveryRate = history.filter((summary) => summary.outcome === "extract" && (summary.restCount || 0) === 0 && (summary.waitCount || 0) <= 2).length / history.length;
  const cleanExtractRate = history.filter((summary) => summary.outcome === "extract" && (summary.greedCount || 0) === 0).length / history.length;

  if (searchAverage >= 4 && game.contracts.unlocked.includes("route_debt")) {
    return {
      id: "route_debt",
      reason: "Recent extracts lean on scouting, so Route Debt sharpens route value at the cost of breathing room."
    };
  }
  if (eliteAverage >= 1.5 && game.contracts.unlocked.includes("trophy_path")) {
    return {
      id: "trophy_path",
      reason: "Recent runs are already elite-heavy, so Trophy Path converts that into a clearer bounty loop."
    };
  }
  if (greedAverage >= 2 && game.contracts.unlocked.includes("greedy_burden")) {
    return {
      id: "greedy_burden",
      reason: "Recent extracts are staying greedy, so Greedy Burden pushes payout higher and punishes over-carry."
    };
  }
  if (lowRecoveryRate >= 0.4 && game.contracts.unlocked.includes("last_light")) {
    return {
      id: "last_light",
      reason: "Recent clean pushes avoided recovery turns, so Last Light sharpens the opener and taxes idle play."
    };
  }
  if (eliteAverage >= 1 && game.contracts.unlocked.includes("hunters_call")) {
    return {
      id: "hunters_call",
      reason: "Recent runs are already hunting elites, so this converts that into better bounty and stronger pressure."
    };
  }
  if (greedAverage >= 1 && game.contracts.unlocked.includes("greed_ledger")) {
    return {
      id: "greed_ledger",
      reason: "Recent runs lean greedy, so this converts that habit into clearer payout."
    };
  }
  if (searchAverage >= 3 && game.contracts.unlocked.includes("ration_run")) {
    return {
      id: "ration_run",
      reason: "Recent runs spend extra turns scouting, so this sharpens the opener but punishes idle play."
    };
  }
  if (searchAverage >= 2 && game.contracts.unlocked.includes("scholar_road")) {
    return {
      id: "scholar_road",
      reason: "Recent runs lean on routing and search, so this sharpens the objective path."
    };
  }
  if (cleanExtractRate >= 0.4 && game.contracts.unlocked.includes("sealed_return")) {
    return {
      id: "sealed_return",
      reason: "Recent returns have been clean and disciplined, so this rewards fast banking and cleaner exits."
    };
  }
  return {
    id: "pressed_descent",
    reason: "Stable opt-in contract when you want better objective payout without changing the loop."
  };
}

export function getContractViewModel(game) {
  const contracts = getAvailableContracts(game);
  const recommendation = getRecommendedContract(game);
  const decorated = contracts.map((contract) => ({
    ...contract,
    recommended: recommendation.id === contract.id,
    recommendationReason: recommendation.id === contract.id ? recommendation.reason : ""
  }));
  return {
    active: decorated.find((contract) => contract.active) || null,
    unlocked: decorated.filter((contract) => contract.unlocked && !contract.active),
    locked: decorated.filter((contract) => !contract.unlocked),
    recommendedId: recommendation.id,
    recommendedReason: recommendation.reason,
    all: decorated
  };
}
