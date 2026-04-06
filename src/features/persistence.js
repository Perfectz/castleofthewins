import { APP_VERSION, SAVE_KEY } from "../core/constants.js";
import { normalizeLevels, normalizePlayer, normalizeShopState } from "../core/entities.js";
import { defaultSettings, saveSettings } from "../core/settings.js";
import { ensureBuildState } from "./builds.js";
import { ensureTownMetaState } from "./town-meta.js";
import { ensureChronicleState } from "./chronicle.js";
import { ensureMetaProgressionState } from "./meta-progression.js";
import { syncFloorState } from "./objectives.js";
import { syncDangerState } from "./director.js";
import { initializeTelemetry, recordTelemetry } from "./telemetry.js";

const SAVE_FORMAT_VERSION = 7;

function resetDungeonMapState(levels = []) {
  levels.forEach((level) => {
    if (!level || level.kind !== "dungeon") {
      return;
    }
    if (Array.isArray(level.explored)) {
      level.explored = level.explored.map(() => false);
    }
    if (Array.isArray(level.visible)) {
      level.visible = level.visible.map(() => false);
    }
    if (level.guidance && typeof level.guidance === "object") {
      level.guidance.entryReconApplied = false;
      if (typeof level.guidance.revealedRouteSteps === "number") {
        level.guidance.revealedRouteSteps = 0;
      }
    }
  });
}

export function getSavedRunMeta() {
  const raw = typeof localStorage !== "undefined" ? localStorage.getItem(SAVE_KEY) : null;
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    const meta = parsed.meta || {};
    const player = parsed.player || {};
    return {
      name: meta.name || player.name || "Unknown",
      level: meta.level || player.level || "?",
      depth: meta.depth || parsed.currentDepth || "?",
      savedAt: meta.savedAt || "",
      classId: meta.classId || player.classId || "",
      className: meta.className || player.className || "",
      raceId: meta.raceId || player.raceId || "",
      raceName: meta.raceName || player.race || ""
    };
  } catch {
    return { name: "Unknown", level: "?", depth: "?" };
  }
}

export function formatSaveStamp(isoString) {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return `Saved ${parsed.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
}

export function syncSaveChrome(game) {
  const meta = getSavedRunMeta();
  const width = typeof window !== "undefined" ? window.innerWidth : 999;
  if (game.saveStamp) {
    if (!meta) {
      game.saveStamp.textContent = width <= 640 ? "No save" : "No save available";
      game.saveStamp.title = "No saved run in browser storage";
    } else {
      const timeLabel = meta.savedAt ? formatSaveStamp(meta.savedAt) : null;
      const compact = width <= 640;
      const veryCompact = width <= 520;
      game.saveStamp.textContent = veryCompact
        ? timeLabel
          ? `Lv.${meta.level} D${meta.depth} - ${timeLabel.replace("Saved ", "")}`
          : `Lv.${meta.level} D${meta.depth}`
        : compact
          ? timeLabel
            ? `${meta.name} Lv.${meta.level} D${meta.depth} - ${timeLabel.replace("Saved ", "")}`
            : `${meta.name} Lv.${meta.level} D${meta.depth}`
        : timeLabel
          ? `${meta.name} Lv.${meta.level} Depth ${meta.depth} - ${timeLabel}`
          : `${meta.name} Lv.${meta.level} Depth ${meta.depth}`;
      game.saveStamp.title = timeLabel
        ? `Latest save: ${meta.name}, level ${meta.level}, depth ${meta.depth}. ${timeLabel}.`
        : `Latest save: ${meta.name}, level ${meta.level}, depth ${meta.depth}.`;
    }
  }
  if (game.quickSaveButton) {
    game.quickSaveButton.disabled = !game.player || game.mode === "title";
  }
  if (game.quickLoadButton) {
    game.quickLoadButton.disabled = !meta;
  }
}

export function createSaveSnapshot(game) {
  return {
    saveFormatVersion: SAVE_FORMAT_VERSION,
    version: APP_VERSION,
    turn: game.turn,
    currentDepth: game.currentDepth,
    levels: game.levels,
    player: game.player,
    settings: game.settings,
    shopState: game.shopState,
    storyFlags: game.storyFlags,
    townUnlocks: game.townUnlocks,
    shopTiers: game.shopTiers,
    townState: game.townState,
    rumorTable: game.rumorTable,
    chronicleEvents: game.chronicleEvents,
    deathContext: game.deathContext,
    telemetry: game.telemetry,
    contracts: game.contracts,
    classMasteries: game.classMasteries,
    runSummaryHistory: game.runSummaryHistory,
    lastTownRefreshTurn: game.lastTownRefreshTurn,
    meta: {
      name: game.player.name,
      level: game.player.level,
      depth: game.currentDepth,
      classId: game.player.classId,
      className: game.player.className,
      raceId: game.player.raceId,
      raceName: game.player.race,
      savedAt: new Date().toISOString()
    }
  };
}

export function migrateSnapshot(snapshot) {
  const migrated = { ...snapshot };
  const originalVersion = migrated.saveFormatVersion || 1;
  if (!migrated.saveFormatVersion) {
    migrated.saveFormatVersion = 1;
  }
  if (!migrated.storyFlags) {
    migrated.storyFlags = {};
  }
  if (!migrated.lastTownRefreshTurn) {
    migrated.lastTownRefreshTurn = 0;
  }
  if (!migrated.shopState) {
    migrated.shopState = {};
  }
  if (!migrated.townUnlocks) {
    migrated.townUnlocks = {};
  }
  if (!migrated.shopTiers) {
    migrated.shopTiers = {};
  }
  if (!migrated.townState) {
    migrated.townState = {};
  }
  if (!migrated.rumorTable) {
    migrated.rumorTable = [];
  }
  if (!migrated.chronicleEvents) {
    migrated.chronicleEvents = [];
  }
  if (!("deathContext" in migrated)) {
    migrated.deathContext = null;
  }
  if (!("telemetry" in migrated)) {
    migrated.telemetry = null;
  }
  if (!("contracts" in migrated)) {
    migrated.contracts = null;
  }
  if (!("classMasteries" in migrated)) {
    migrated.classMasteries = null;
  }
  if (!("runSummaryHistory" in migrated)) {
    migrated.runSummaryHistory = [];
  }
  if (originalVersion < 6 && Array.isArray(migrated.levels)) {
    resetDungeonMapState(migrated.levels);
  }
  migrated.saveFormatVersion = SAVE_FORMAT_VERSION;
  return migrated;
}

export function saveGame(game, options = {}) {
  if (!game.player) {
    return;
  }
  const { silent = false } = options;
  recordTelemetry(game, "save_game", {
    saveMode: silent ? "autosave" : "manual"
  });
  const snapshot = createSaveSnapshot(game);
  localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
  if (!silent) {
    game.log("Game saved to browser storage.", "good");
  }
  game.refreshChrome();
  game.render();
}

export function loadGame(game) {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    game.log("No saved game is available.", "warning");
    game.render();
    return;
  }
  const snapshot = migrateSnapshot(JSON.parse(raw));
  localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
  game.turn = snapshot.turn;
  game.levels = normalizeLevels(snapshot.levels);
  game.player = normalizePlayer(snapshot.player);
  game.currentDepth = snapshot.currentDepth;
  game.currentLevel = game.levels[game.currentDepth];
  game.settings = { ...defaultSettings(), ...(snapshot.settings || game.settings) };
  saveSettings(game.settings);
  game.audio.updateSettings(game.settings);
  game.shopState = normalizeShopState(snapshot.shopState);
  game.storyFlags = snapshot.storyFlags || {};
  game.townUnlocks = snapshot.townUnlocks || {};
  game.shopTiers = snapshot.shopTiers || {};
  game.townState = snapshot.townState || {};
  game.rumorTable = snapshot.rumorTable || [];
  game.chronicleEvents = snapshot.chronicleEvents || [];
  game.deathContext = snapshot.deathContext || null;
  game.lastTownRefreshTurn = snapshot.lastTownRefreshTurn || 0;
  game.telemetry = snapshot.telemetry || null;
  game.contracts = snapshot.contracts || null;
  game.classMasteries = snapshot.classMasteries || null;
  game.runSummaryHistory = snapshot.runSummaryHistory || [];
  game.pendingSpellChoices = 0;
  game.pendingPerkChoices = 0;
  game.pendingRewardChoice = null;
  game.pendingRewardQueue = [];
  game.pendingTurnResolution = null;
  game.mode = "game";
  game.pendingShop = null;
  game.pendingService = null;
  if (game.resetReadState) {
    game.resetReadState();
  }
  ensureBuildState(game);
  ensureTownMetaState(game);
  ensureChronicleState(game);
  ensureMetaProgressionState(game);
  initializeTelemetry(game);
  game.recalculateDerivedStats();
  game.closeModal();
  syncFloorState(game);
  syncDangerState(game);
  game.updateFov();
  game.updateMonsterIntents();
  recordTelemetry(game, "load_game", {
    saveMode: "manual"
  });
  game.log("Saved game restored.", "good");
  game.refreshChrome();
  game.render();
}
