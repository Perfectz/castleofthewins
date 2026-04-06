import { CLASS_MASTERY_DEFS, CONTRACT_DEFS, SPELLS } from "../data/content.js";
import { createTownItem } from "../core/entities.js";

const META_PROFILE_KEY = "cotw.meta.v1";

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

const CONTRACT_UNLOCK_HINTS = {
  pressed_descent: "Available by default for new adventurers.",
  greed_ledger: "Unlocks after clearing any floor objective.",
  scholar_road: "Unlocks after banking one successful extract."
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
    currentRunId: "",
    ...(game.contracts || {})
  };
  game.contracts.unlocked = Array.isArray(game.contracts.unlocked) ? game.contracts.unlocked : defaultUnlockedContracts();
  defaultUnlockedContracts().forEach((contractId) => {
    if (!game.contracts.unlocked.includes(contractId)) {
      game.contracts.unlocked.push(contractId);
    }
  });
}

export function persistMetaProgressionState(game) {
  ensureMetaProgressionState(game);
  saveMetaProfile({
    classMasteries: game.classMasteries,
    unlockedContracts: game.contracts.unlocked,
    activeContractId: game.contracts.activeId || ""
  });
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

export function getRecommendedContract(game) {
  ensureMetaProgressionState(game);
  const history = Array.isArray(game.runSummaryHistory) ? game.runSummaryHistory.slice(-5) : [];
  if (history.length === 0) {
    return {
      id: "pressed_descent",
      reason: "Low-friction opt-in contract for the next run."
    };
  }
  const searchAverage = history.reduce((sum, summary) => sum + (summary.searchCount || 0), 0) / history.length;
  const greedAverage = history.reduce((sum, summary) => sum + (summary.greedCount || 0), 0) / history.length;
  if (greedAverage >= 1) {
    return {
      id: "greed_ledger",
      reason: "Recent runs lean greedy, so this converts that habit into clearer payout."
    };
  }
  if (searchAverage >= 2) {
    return {
      id: "scholar_road",
      reason: "Recent runs lean on routing and search, so this sharpens the objective path."
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
