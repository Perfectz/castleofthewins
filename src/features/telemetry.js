import { APP_VERSION } from "../core/constants.js";

const TELEMETRY_STORAGE_KEY = "cotw.telemetry.v1";
const RAW_EVENT_LIMIT = 220;
const SUMMARY_LIMIT = 18;

function makeId(prefix = "evt") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseTelemetryStore() {
  if (typeof localStorage === "undefined") {
    return {
      rawEvents: [],
      summaries: []
    };
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(TELEMETRY_STORAGE_KEY) || "{}");
    return {
      rawEvents: Array.isArray(parsed.rawEvents) ? parsed.rawEvents : [],
      summaries: Array.isArray(parsed.summaries) ? parsed.summaries : []
    };
  } catch {
    return {
      rawEvents: [],
      summaries: []
    };
  }
}

function writeTelemetryStore(store) {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify({
    rawEvents: (store.rawEvents || []).slice(-RAW_EVENT_LIMIT),
    summaries: (store.summaries || []).slice(-SUMMARY_LIMIT)
  }));
}

function average(values = []) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function createRunMetrics(game) {
  const validation = typeof game.getValidationSummary === "function"
    ? game.getValidationSummary()
    : { signature: "", variants: {} };
  return {
    runId: makeId("run"),
    startedAt: new Date().toISOString(),
    heroName: game.player?.name || "Unknown",
    classId: game.player?.classId || "",
    className: game.player?.className || "",
    raceId: game.player?.raceId || "",
    raceName: game.player?.race || "",
    contractId: game.contracts?.currentRunId || game.contracts?.activeId || "",
    firstMoveLogged: false,
    firstObjectiveType: null,
    firstObjectiveSeenTurn: null,
    firstObjectiveClearTurn: null,
    firstObjectiveReachSource: "",
    firstObjectiveSearchCount: 0,
    firstSearchBeforeObjectiveTurn: null,
    searchCount: 0,
    waitCount: 0,
    restCount: 0,
    eliteKills: 0,
    modalOpenCounts: {
      pack: 0,
      magic: 0,
      journal: 0,
      town: 0
    },
    greedCount: 0,
    greedLabels: [],
    townServicesOpened: [],
    serviceOpenCounts: {},
    objectiveSeenKeys: {},
    optionalSeenKeys: {},
    deepestDepth: Math.max(0, game.currentDepth || 0, game.player?.deepestDepth || 0),
    validationProfile: validation.signature,
    validationVariants: validation.variants
  };
}

function cloneMap(map) {
  return map && typeof map === "object" ? { ...map } : {};
}

function touchStoreSummaries(game) {
  const store = parseTelemetryStore();
  store.summaries = Array.isArray(game.runSummaryHistory) ? game.runSummaryHistory.slice(-SUMMARY_LIMIT) : [];
  writeTelemetryStore(store);
}

function normalizeRun(activeRun, game) {
  const base = createRunMetrics(game);
  return {
    ...base,
    ...(activeRun || {}),
    modalOpenCounts: {
      ...base.modalOpenCounts,
      ...(activeRun?.modalOpenCounts || {})
    },
    greedLabels: Array.isArray(activeRun?.greedLabels) ? [...activeRun.greedLabels] : [],
    townServicesOpened: Array.isArray(activeRun?.townServicesOpened) ? [...activeRun.townServicesOpened] : [],
    serviceOpenCounts: cloneMap(activeRun?.serviceOpenCounts),
    objectiveSeenKeys: cloneMap(activeRun?.objectiveSeenKeys),
    optionalSeenKeys: cloneMap(activeRun?.optionalSeenKeys)
  };
}

function buildEventContext(game) {
  return {
    turn: game.turn || 0,
    depth: game.currentDepth || 0,
    mode: game.mode || "game",
    location: game.currentLevel?.description || (game.currentDepth === 0 ? "Town" : ""),
    dangerLevel: game.currentLevel?.dangerLevel || (game.currentDepth === 0 ? "Town Calm" : ""),
    objectiveId: game.currentLevel?.floorObjective?.id || "",
    objectiveStatus: game.currentLevel?.floorObjective?.status || "",
    optionalId: game.currentLevel?.floorOptional?.id || "",
    optionalOpened: Boolean(game.currentLevel?.floorOptional?.opened)
  };
}

function normalizeType(type) {
  const aliases = {
    death: "run_death",
    floor_enter: "depth_entered",
    item_use: "item_used",
    keep_enter: "keep_entered",
    load_game: "load_game",
    objective_complete: "objective_resolved",
    objective_reach: "objective_reached",
    objective_spotted: "objective_reached",
    optional_opened: "optional_triggered",
    optional_take: "optional_triggered",
    run_start: "run_started",
    save_game: "save_game",
    search_use: "search_used",
    session_end: "session_end",
    spell_cast: "spell_cast",
    town_return: "returned_to_town",
    town_service_open: "town_service_opened"
  };
  return aliases[type] || type;
}

function describeEvent(event) {
  const detail = event.payload?.label
    || event.payload?.serviceId
    || event.payload?.objectiveId
    || event.payload?.optionalId
    || event.payload?.itemId
    || event.payload?.spellId
    || event.payload?.unlockId
    || event.payload?.rumorId
    || "";
  const label = event.type.replace(/_/g, " ");
  return detail ? `${label}: ${detail}` : label;
}

function buildSummaryFromState(game) {
  const events = Array.isArray(game.telemetry?.rawEvents)
    ? game.telemetry.rawEvents.filter((event) => event.runId === game.telemetry.activeRunId)
    : [];
  const count = (type) => events.filter((event) => event.type === type).length;
  return {
    runId: game.telemetry?.activeRunId || "",
    eventCount: events.length,
    searches: count("search_used"),
    shopBuys: count("shop_buy"),
    shopSells: count("shop_sell"),
    spellsCast: count("spell_cast"),
    itemsUsed: count("item_used"),
    townReturns: count("returned_to_town"),
    optionalsTaken: count("optional_triggered"),
    saves: count("save_game"),
    loads: count("load_game"),
    deaths: count("run_death"),
    recent: events.slice(-8).reverse().map((event) => ({
      text: describeEvent(event),
      turn: event.turn,
      depth: event.depth,
      type: event.type
    }))
  };
}

function buildReviewSnapshotFromState(game) {
  const events = Array.isArray(game.telemetry?.rawEvents)
    ? game.telemetry.rawEvents.filter((event) => event.runId === game.telemetry.activeRunId)
    : [];
  return {
    activeRun: game.telemetry?.activeRun || null,
    summary: buildSummaryFromState(game),
    recentEvents: events.slice(-12).reverse().map((event) => ({
      ...event,
      text: describeEvent(event)
    })),
    summaries: Array.isArray(game.runSummaryHistory) ? game.runSummaryHistory.slice(-5) : [],
    meta: computeMetaReview(game)
  };
}

function syncTelemetryMirror(game) {
  game.telemetry.events = game.telemetry.rawEvents;
  if (typeof window !== "undefined") {
    window.__castleTelemetry = {
      events: game.telemetry.rawEvents,
      activeRun: game.telemetry.activeRun,
      summaries: game.runSummaryHistory.slice(-5),
      meta: computeMetaReview(game),
      review: buildReviewSnapshotFromState(game)
    };
  }
}

function computeBankOpensAfterReturn(rawEvents = []) {
  let successfulReturns = 0;
  let bankOpensAfterReturn = 0;
  let pendingReturn = false;
  rawEvents.forEach((event) => {
    if (event.type === "returned_to_town") {
      successfulReturns += 1;
      pendingReturn = true;
      return;
    }
    if (event.type === "bank_persistence_viewed" && pendingReturn) {
      bankOpensAfterReturn += 1;
      pendingReturn = false;
      return;
    }
    if (event.type === "run_started" && pendingReturn) {
      pendingReturn = false;
    }
  });
  return {
    successfulReturns,
    bankOpensAfterReturn
  };
}

function computeReturnFollowThrough(rawEvents = []) {
  const summary = {
    successfulReturns: 0,
    bankOpensAfterReturn: 0,
    rumorBuysAfterReturn: 0,
    unlockPurchasesAfterReturn: 0,
    contractArmsAfterReturn: 0,
    returnsWithAnyTownAction: 0
  };
  let pendingReturn = null;

  const finalizePendingReturn = () => {
    if (!pendingReturn) {
      return;
    }
    if (pendingReturn.bank) {
      summary.bankOpensAfterReturn += 1;
    }
    if (pendingReturn.rumor) {
      summary.rumorBuysAfterReturn += 1;
    }
    if (pendingReturn.unlock) {
      summary.unlockPurchasesAfterReturn += 1;
    }
    if (pendingReturn.contract) {
      summary.contractArmsAfterReturn += 1;
    }
    if (pendingReturn.bank || pendingReturn.rumor || pendingReturn.unlock || pendingReturn.contract) {
      summary.returnsWithAnyTownAction += 1;
    }
    pendingReturn = null;
  };

  rawEvents.forEach((event) => {
    if (event.type === "returned_to_town") {
      finalizePendingReturn();
      summary.successfulReturns += 1;
      pendingReturn = {
        bank: false,
        rumor: false,
        unlock: false,
        contract: false
      };
      return;
    }
    if (!pendingReturn) {
      return;
    }
    if (event.type === "run_started") {
      finalizePendingReturn();
      return;
    }
    if (event.type === "bank_persistence_viewed") {
      pendingReturn.bank = true;
      return;
    }
    if (event.type === "town_rumor_buy") {
      pendingReturn.rumor = true;
      return;
    }
    if (event.type === "town_unlock_purchase") {
      pendingReturn.unlock = true;
      return;
    }
    if (event.type === "contract_armed") {
      pendingReturn.contract = true;
    }
  });

  finalizePendingReturn();
  return summary;
}

function computeMetaReview(game) {
  const rawEvents = Array.isArray(game.telemetry?.rawEvents) ? game.telemetry.rawEvents : [];
  const summaries = Array.isArray(game.runSummaryHistory) ? game.runSummaryHistory : [];
  const runStarts = rawEvents.filter((event) => event.type === "run_started");
  const armedStarts = runStarts.filter((event) => Boolean(event.payload?.contractId));
  const contractCounts = armedStarts.reduce((counts, event) => {
    const contractId = event.payload?.contractId;
    if (contractId) {
      counts[contractId] = (counts[contractId] || 0) + 1;
    }
    return counts;
  }, {});
  const masteryUnlocksByClass = rawEvents
    .filter((event) => event.type === "mastery_advanced")
    .reduce((counts, event) => {
      const classId = event.payload?.classId || "unknown";
      counts[classId] = (counts[classId] || 0) + 1;
      return counts;
    }, {});
  const mostArmedContract = Object.entries(contractCounts)
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0]);
    })[0]?.[0] || "";
  const returnSummaryOpens = rawEvents.filter((event) => event.type === "return_summary_opened").length;
  const returnSummaryCloses = rawEvents.filter((event) => event.type === "return_summary_closed").length;
  const bankAfterReturn = computeBankOpensAfterReturn(rawEvents);
  const returnFollowThrough = computeReturnFollowThrough(rawEvents);
  const clearTurns = summaries
    .map((summary) => summary.firstObjectiveClearTurn)
    .filter((value) => Number.isFinite(value));
  const searchCounts = summaries
    .map((summary) => Number.isFinite(summary.firstObjectiveSearchCount) ? summary.firstObjectiveSearchCount : summary.searchCount)
    .filter((value) => Number.isFinite(value));
  const validationProfileCounts = runStarts.reduce((counts, event) => {
    const key = event.payload?.validationProfile || "default";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  return {
    totalRunStarts: runStarts.length,
    armedRunStarts: armedStarts.length,
    armedRunStartRate: runStarts.length > 0 ? armedStarts.length / runStarts.length : 0,
    mostArmedContract,
    contractArmCounts: contractCounts,
    masteryUnlocksByClass,
    successfulReturns: bankAfterReturn.successfulReturns,
    bankOpensAfterReturn: bankAfterReturn.bankOpensAfterReturn,
    rumorBuysAfterReturn: returnFollowThrough.rumorBuysAfterReturn,
    unlockPurchasesAfterReturn: returnFollowThrough.unlockPurchasesAfterReturn,
    contractArmsAfterReturn: returnFollowThrough.contractArmsAfterReturn,
    returnsWithAnyTownAction: returnFollowThrough.returnsWithAnyTownAction,
    contractArmRateAfterReturn: returnFollowThrough.successfulReturns > 0
      ? returnFollowThrough.contractArmsAfterReturn / returnFollowThrough.successfulReturns
      : 0,
    averageFirstObjectiveClearTurn: average(clearTurns),
    averageFirstObjectiveSearchCount: average(searchCounts),
    validationProfileCounts,
    returnSummaryOpens,
    returnSummaryCloses,
    archivedReturns: summaries.filter((summary) => summary.outcome !== "death").length
  };
}

function markModalOpen(activeRun, type, payload = {}) {
  if (!activeRun) {
    return;
  }
  switch (type) {
    case "modal_opened":
      if (String(payload.surface || "").startsWith("hub:pack")) {
        activeRun.modalOpenCounts.pack += 1;
      } else if (String(payload.surface || "").startsWith("hub:magic")) {
        activeRun.modalOpenCounts.magic += 1;
      } else if (String(payload.surface || "").startsWith("hub:journal")) {
        activeRun.modalOpenCounts.journal += 1;
      } else if (["bank", "sage", "temple", "shop:general", "shop:armory", "shop:guild", "shop:junk", "utility-menu"].includes(payload.surface)) {
        activeRun.modalOpenCounts.town += 1;
      }
      break;
    case "pack_opened":
      activeRun.modalOpenCounts.pack += 1;
      break;
    case "magic_opened":
      activeRun.modalOpenCounts.magic += 1;
      break;
    case "journal_opened":
      activeRun.modalOpenCounts.journal += 1;
      break;
    default:
      break;
  }
}

function updateRunMetrics(game, activeRun, type, payload = {}) {
  if (!activeRun) {
    return;
  }
  activeRun.deepestDepth = Math.max(activeRun.deepestDepth || 0, game.currentDepth || 0, game.player?.deepestDepth || 0, payload.depth || 0);
  markModalOpen(activeRun, type, payload);

  if (type === "first_move") {
    activeRun.firstMoveLogged = true;
    return;
  }

  if (type === "town_service_opened" && payload.serviceId) {
    activeRun.serviceOpenCounts[payload.serviceId] = (activeRun.serviceOpenCounts[payload.serviceId] || 0) + 1;
    if (!activeRun.townServicesOpened.includes(payload.serviceId)) {
      activeRun.townServicesOpened.push(payload.serviceId);
    }
    return;
  }

  if (type === "search_used") {
    activeRun.searchCount += 1;
    if (!activeRun.firstObjectiveClearTurn && activeRun.firstSearchBeforeObjectiveTurn === null) {
      activeRun.firstSearchBeforeObjectiveTurn = game.turn || 0;
    }
    return;
  }

  if (type === "wait_used") {
    activeRun.waitCount += 1;
    return;
  }

  if (type === "rest_used") {
    activeRun.restCount += 1;
    return;
  }

  if (type === "elite_kill") {
    activeRun.eliteKills += 1;
    return;
  }

  if (type === "objective_seen") {
    activeRun.firstObjectiveType = activeRun.firstObjectiveType || payload.objectiveId || game.currentLevel?.floorObjective?.id || null;
    activeRun.firstObjectiveSeenTurn = activeRun.firstObjectiveSeenTurn || game.turn || 0;
    return;
  }

  if (type === "objective_reached") {
    activeRun.firstObjectiveType = activeRun.firstObjectiveType || payload.objectiveId || game.currentLevel?.floorObjective?.id || null;
    activeRun.firstObjectiveSeenTurn = activeRun.firstObjectiveSeenTurn || game.turn || 0;
    activeRun.firstObjectiveReachSource = activeRun.firstObjectiveReachSource || payload.source || "";
    return;
  }

  if (type === "objective_resolved") {
    activeRun.firstObjectiveType = activeRun.firstObjectiveType || payload.objectiveId || game.currentLevel?.floorObjective?.id || null;
    activeRun.firstObjectiveSeenTurn = activeRun.firstObjectiveSeenTurn || game.turn || 0;
    activeRun.firstObjectiveClearTurn = activeRun.firstObjectiveClearTurn || game.turn || 0;
    activeRun.firstObjectiveSearchCount = activeRun.firstObjectiveSearchCount || activeRun.searchCount || 0;
    return;
  }

  if (type === "optional_triggered") {
    activeRun.greedCount += 1;
    if (payload.optionalId) {
      activeRun.greedLabels.push(payload.optionalId);
    }
    activeRun.greedLabels = activeRun.greedLabels.slice(-8);
  }
}

function buildObjectiveReachSource(game, objective, markerReached) {
  const searchesUsed = game.currentLevel?.guidance?.searchesUsed || 0;
  if (game.currentDepth === 1 && searchesUsed > 0) {
    return "route";
  }
  return markerReached ? "marker" : "room";
}

export function ensureTelemetryState(game) {
  const stored = parseTelemetryStore();
  game.telemetry = {
    sessionId: makeId("session"),
    activeRunId: null,
    activeRun: null,
    rawEvents: [],
    ...(game.telemetry || {})
  };
  if (!game.telemetry.sessionId) {
    game.telemetry.sessionId = makeId("session");
  }
  if ((!Array.isArray(game.telemetry.rawEvents) || game.telemetry.rawEvents.length === 0) && stored.rawEvents.length > 0) {
    game.telemetry.rawEvents = stored.rawEvents.slice(-RAW_EVENT_LIMIT);
  }
  game.telemetry.rawEvents = Array.isArray(game.telemetry.rawEvents) ? game.telemetry.rawEvents.slice(-RAW_EVENT_LIMIT) : [];
  game.telemetry.activeRun = game.telemetry.activeRun ? normalizeRun(game.telemetry.activeRun, game) : null;
  if ((!Array.isArray(game.runSummaryHistory) || game.runSummaryHistory.length === 0) && stored.summaries.length > 0) {
    game.runSummaryHistory = stored.summaries.slice(-SUMMARY_LIMIT);
  }
  game.runSummaryHistory = Array.isArray(game.runSummaryHistory) ? game.runSummaryHistory.slice(-SUMMARY_LIMIT) : [];
  syncTelemetryMirror(game);
}

export function initializeTelemetry(game) {
  ensureTelemetryState(game);
}

export function startTelemetryRun(game) {
  ensureTelemetryState(game);
  const activeRun = createRunMetrics(game);
  game.telemetry.activeRunId = activeRun.runId;
  game.telemetry.activeRun = activeRun;
  recordTelemetryEvent(game, "run_started", {
    classId: activeRun.classId,
    raceId: activeRun.raceId,
    contractId: activeRun.contractId,
    validationProfile: activeRun.validationProfile,
    validationVariants: activeRun.validationVariants
  });
  return activeRun;
}

export function recordTelemetryEvent(game, type, payload = {}) {
  ensureTelemetryState(game);
  const canonicalType = normalizeType(type);
  if (canonicalType === "run_started" && !game.telemetry.activeRun) {
    const activeRun = createRunMetrics(game);
    game.telemetry.activeRunId = activeRun.runId;
    game.telemetry.activeRun = activeRun;
  }
  const event = {
    id: makeId("evt"),
    appVersion: APP_VERSION,
    timestamp: new Date().toISOString(),
    sessionId: game.telemetry.sessionId,
    runId: game.telemetry.activeRunId || null,
    type: canonicalType,
    ...buildEventContext(game),
    payload
  };
  game.telemetry.rawEvents.push(event);
  if (game.telemetry.rawEvents.length > RAW_EVENT_LIMIT) {
    game.telemetry.rawEvents.shift();
  }

  updateRunMetrics(game, game.telemetry.activeRun, canonicalType, payload);

  const store = parseTelemetryStore();
  store.rawEvents.push(event);
  if (store.rawEvents.length > RAW_EVENT_LIMIT) {
    store.rawEvents = store.rawEvents.slice(-RAW_EVENT_LIMIT);
  }
  writeTelemetryStore(store);
  syncTelemetryMirror(game);
  return event;
}

export function recordTelemetry(game, type, payload = {}) {
  return recordTelemetryEvent(game, type, payload);
}

export function recordTownServiceOpen(game, serviceId) {
  return recordTelemetryEvent(game, "town_service_opened", {
    serviceId
  });
}

export function trackFirstPlayerMove(game, x, y) {
  ensureTelemetryState(game);
  if (game.telemetry.activeRun?.firstMoveLogged) {
    return false;
  }
  recordTelemetryEvent(game, "first_move", { x, y });
  return true;
}

export function trackObjectiveProgress(game, tile = null) {
  ensureTelemetryState(game);
  const objective = game.currentLevel?.floorObjective;
  if (!objective || objective.status === "resolved") {
    return;
  }
  const playerRoomIndex = typeof game.getPlayerRoomIndex === "function" ? game.getPlayerRoomIndex() : null;
  const roomReached = playerRoomIndex !== null && playerRoomIndex === objective.roomIndex;
  const markerReached = tile?.objectiveId === objective.id;
  if (!roomReached && !markerReached) {
    return;
  }
  const reachKey = `${game.currentDepth}:${objective.id}:${markerReached ? "marker" : `room-${objective.roomIndex}`}`;
  if (game.telemetry.activeRun?.objectiveSeenKeys?.[reachKey]) {
    return;
  }
  if (game.telemetry.activeRun) {
    game.telemetry.activeRun.objectiveSeenKeys[reachKey] = true;
  }
  game.currentLevel.guidance = game.currentLevel.guidance || {};
  game.currentLevel.guidance.objectiveSeen = true;
  game.markOnboarding?.("find_objective");
  const remainingDefenders = (game.currentLevel?.actors || []).filter((monster) => monster.roomIndex === objective.roomIndex && monster.hp > 0).length;
  const source = buildObjectiveReachSource(game, objective, markerReached);
  recordTelemetryEvent(game, "objective_seen", {
    objectiveId: objective.id,
    stage: markerReached ? "marker" : "room"
  });
  recordTelemetryEvent(game, "objective_reached", {
    objectiveId: objective.id,
    source,
    stage: markerReached ? "marker" : "room",
    remainingDefenders,
    searchCount: game.telemetry.activeRun?.searchCount || 0
  });
}

export function trackOptionalProgress(game, tile = null) {
  ensureTelemetryState(game);
  const optional = game.currentLevel?.floorOptional;
  if (!optional || optional.opened) {
    return;
  }
  const playerRoomIndex = typeof game.getPlayerRoomIndex === "function" ? game.getPlayerRoomIndex() : null;
  const roomReached = playerRoomIndex !== null && playerRoomIndex === optional.roomIndex;
  const markerReached = tile?.optionalId === optional.id;
  if (!roomReached && !markerReached) {
    return;
  }
  const seenKey = `${game.currentDepth}:${optional.id}:${markerReached ? "marker" : `room-${optional.roomIndex}`}`;
  if (game.telemetry.activeRun?.optionalSeenKeys?.[seenKey]) {
    return;
  }
  if (game.telemetry.activeRun) {
    game.telemetry.activeRun.optionalSeenKeys[seenKey] = true;
  }
  recordTelemetryEvent(game, "optional_seen", {
    optionalId: optional.id,
    stage: markerReached ? "marker" : "room"
  });
}

export function getCurrentRunEvents(game) {
  ensureTelemetryState(game);
  return game.telemetry.rawEvents.filter((event) => event.runId === game.telemetry.activeRunId);
}

export function buildTelemetrySummary(game) {
  const events = getCurrentRunEvents(game);
  const count = (type) => events.filter((event) => event.type === type).length;
  return {
    runId: game.telemetry?.activeRunId || "",
    eventCount: events.length,
    searches: count("search_used"),
    shopBuys: count("shop_buy"),
    shopSells: count("shop_sell"),
    spellsCast: count("spell_cast"),
    itemsUsed: count("item_used"),
    townReturns: count("returned_to_town"),
    optionalsTaken: count("optional_triggered"),
    saves: count("save_game"),
    loads: count("load_game"),
    deaths: count("run_death"),
    recent: events.slice(-8).reverse().map((event) => ({
      text: describeEvent(event),
      turn: event.turn,
      depth: event.depth,
      type: event.type
    }))
  };
}

export function exportTelemetryTrace(game) {
  ensureTelemetryState(game);
  if (typeof document === "undefined" || typeof window === "undefined" || typeof Blob === "undefined") {
    return false;
  }
  const store = parseTelemetryStore();
  const currentRunEvents = store.rawEvents.filter((event) => event.runId === game.telemetry.activeRunId);
  const payload = {
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    sessionId: game.telemetry.sessionId,
    runId: game.telemetry.activeRunId,
    activeRun: game.telemetry.activeRun,
    summary: buildTelemetrySummary(game),
    currentRunEvents,
    allEventsCount: store.rawEvents.length,
    summaries: game.runSummaryHistory.slice(-5)
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = `castle-of-the-winds-run-trace-${game.telemetry.activeRunId || "run"}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 0);
  return true;
}

export function buildRunSummary(game, outcome = "extract", extra = {}) {
  ensureTelemetryState(game);
  const activeRun = game.telemetry.activeRun || createRunMetrics(game);
  return {
    id: makeId("summary"),
    runId: activeRun.runId,
    outcome,
    createdAt: new Date().toISOString(),
    heroName: game.player?.name || activeRun.heroName,
    classId: activeRun.classId,
    className: activeRun.className,
    raceId: activeRun.raceId,
    raceName: activeRun.raceName,
    contractId: activeRun.contractId || game.contracts?.currentRunId || "",
    turns: game.turn || 0,
    deepestDepth: Math.max(activeRun.deepestDepth || 0, game.player?.deepestDepth || 0, extra.deepestDepth || 0),
    extractedDepth: extra.extractedDepth ?? game.currentDepth ?? 0,
    firstObjectiveType: activeRun.firstObjectiveType,
    firstObjectiveSeenTurn: activeRun.firstObjectiveSeenTurn,
    firstObjectiveClearTurn: activeRun.firstObjectiveClearTurn,
    firstObjectiveReachSource: activeRun.firstObjectiveReachSource || "",
    firstSearchBeforeObjectiveTurn: activeRun.firstSearchBeforeObjectiveTurn,
    firstObjectiveSearchCount: activeRun.firstObjectiveSearchCount || activeRun.searchCount || 0,
    searchCount: activeRun.searchCount || 0,
    waitCount: activeRun.waitCount || 0,
    restCount: activeRun.restCount || 0,
    eliteKills: activeRun.eliteKills || 0,
    modalOpenCounts: {
      pack: activeRun.modalOpenCounts?.pack || 0,
      magic: activeRun.modalOpenCounts?.magic || 0,
      journal: activeRun.modalOpenCounts?.journal || 0,
      town: activeRun.modalOpenCounts?.town || 0
    },
    greedCount: activeRun.greedCount || 0,
    greedLabels: [...(activeRun.greedLabels || [])],
    returnValue: Math.floor(game.player?.gold || 0) + Math.floor(game.player?.bankGold || 0),
    cause: extra.cause || "",
    carriedCurse: Boolean(extra.carriedCurse),
    townServicesOpened: [...(activeRun.townServicesOpened || [])],
    persistentChanges: Array.isArray(extra.persistentChanges) ? [...extra.persistentChanges] : [],
    masteryAdvance: extra.masteryAdvance || null,
    unlockedContracts: Array.isArray(extra.unlockedContracts) ? [...extra.unlockedContracts] : []
  };
}

export function recordRunSummary(game, outcome = "extract", extra = {}) {
  ensureTelemetryState(game);
  const summary = buildRunSummary(game, outcome, extra);
  game.runSummaryHistory.push(summary);
  if (game.runSummaryHistory.length > SUMMARY_LIMIT) {
    game.runSummaryHistory = game.runSummaryHistory.slice(-SUMMARY_LIMIT);
  }
  touchStoreSummaries(game);
  if (outcome === "death" || outcome === "victory") {
    game.telemetry.activeRun = null;
    game.telemetry.activeRunId = null;
  }
  syncTelemetryMirror(game);
  return summary;
}

export function getTelemetryReviewSnapshot(game) {
  ensureTelemetryState(game);
  return buildReviewSnapshotFromState(game);
}

export function resetTelemetry(game) {
  ensureTelemetryState(game);
  game.telemetry.activeRunId = null;
  game.telemetry.activeRun = null;
  syncTelemetryMirror(game);
}
