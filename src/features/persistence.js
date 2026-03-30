import { APP_VERSION, SAVE_KEY } from "../core/constants.js";
import { normalizeLevels, normalizePlayer, normalizeShopState } from "../core/entities.js";
import { defaultSettings, saveSettings } from "../core/settings.js";
import { ensureBuildState } from "./builds.js";
import { ensureTownMetaState } from "./town-meta.js";
import { ensureChronicleState } from "./chronicle.js";
import { syncFloorState } from "./objectives.js";
import { syncDangerState } from "./director.js";

const SAVE_FORMAT_VERSION = 3;

export function getSavedRunMeta() {
  const raw = typeof localStorage !== "undefined" ? localStorage.getItem(SAVE_KEY) : null;
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed.meta || { name: "Unknown", level: "?", depth: "?" };
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
  if (game.saveStamp) {
    if (!meta) {
      game.saveStamp.textContent = "No save loaded";
    } else {
      const timeLabel = meta.savedAt ? formatSaveStamp(meta.savedAt) : null;
      game.saveStamp.textContent = timeLabel ? `${meta.name} Lv.${meta.level} Depth ${meta.depth} - ${timeLabel}` : `${meta.name} Lv.${meta.level} Depth ${meta.depth}`;
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
    rumorTable: game.rumorTable,
    chronicleEvents: game.chronicleEvents,
    deathContext: game.deathContext,
    lastTownRefreshTurn: game.lastTownRefreshTurn,
    meta: {
      name: game.player.name,
      level: game.player.level,
      depth: game.currentDepth,
      savedAt: new Date().toISOString()
    }
  };
}

export function migrateSnapshot(snapshot) {
  const migrated = { ...snapshot };
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
  if (!migrated.rumorTable) {
    migrated.rumorTable = [];
  }
  if (!migrated.chronicleEvents) {
    migrated.chronicleEvents = [];
  }
  if (!("deathContext" in migrated)) {
    migrated.deathContext = null;
  }
  return migrated;
}

export function saveGame(game, options = {}) {
  if (!game.player) {
    return;
  }
  const { silent = false } = options;
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
  game.rumorTable = snapshot.rumorTable || [];
  game.chronicleEvents = snapshot.chronicleEvents || [];
  game.deathContext = snapshot.deathContext || null;
  game.lastTownRefreshTurn = snapshot.lastTownRefreshTurn || 0;
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
  game.recalculateDerivedStats();
  game.closeModal();
  syncFloorState(game);
  syncDangerState(game);
  game.updateFov();
  game.updateMonsterIntents();
  game.log("Saved game restored.", "good");
  game.refreshChrome();
  game.render();
}
