/**
 * @module persistence
 * @owns Save/load, save metadata, save migration, save chrome display
 * @reads SAVE_FIELDS from save-contract.js, entire game state for serialization
 * @mutates All SAVE_FIELDS on game during load, localStorage
 */
import { APP_VERSION, SAVE_KEY } from "../core/constants.js";
import { SAVE_FIELDS, SAVE_FIELD_DEFAULTS } from "../core/save-contract.js";
import { normalizeLevels, normalizePlayer, normalizeShopState } from "../core/entities.js";
import { defaultSettings, saveSettings } from "../core/settings.js";
import { ensureBuildState } from "./builds.js";
import { ensureTownMetaState } from "./town-meta.js";
import { ensureChronicleState } from "./chronicle.js";
import { ensureMetaProgressionState, mergeLegacyTownUnlocks } from "./meta-progression.js";
import { syncFloorState } from "./objectives.js";
import { syncDangerState } from "./director.js";
import { initializeTelemetry, recordTelemetry } from "./telemetry.js";

const SAVE_FORMAT_VERSION = 9;
const SAVE_SLOT_COUNT = 3;

function getSaveSlotKey(slotId) {
  return `${SAVE_KEY}:slot:${slotId}`;
}

function getOrderedSlotIds() {
  return Array.from({ length: SAVE_SLOT_COUNT }, (_, index) => index + 1);
}

function parseStoredSnapshot(raw) {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.warn("Save parse failed:", err.message);
    return null;
  }
}

function buildSaveMeta(snapshot, slotId = null) {
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }
  const meta = snapshot.meta || {};
  const player = snapshot.player || {};
  return {
    slotId,
    name: meta.name || player.name || "Unknown",
    level: meta.level || player.level || "?",
    depth: meta.depth || snapshot.currentDepth || "?",
    savedAt: meta.savedAt || "",
    classId: meta.classId || player.classId || "",
    className: meta.className || player.className || "",
    raceId: meta.raceId || player.raceId || "",
    raceName: meta.raceName || player.race || ""
  };
}

function getLegacySnapshot() {
  return parseStoredSnapshot(typeof localStorage !== "undefined" ? localStorage.getItem(SAVE_KEY) : null);
}

function getStoredSlotEntries() {
  const entries = getOrderedSlotIds().map((slotId) => {
    const snapshot = parseStoredSnapshot(typeof localStorage !== "undefined" ? localStorage.getItem(getSaveSlotKey(slotId)) : null);
    return {
      slotId,
      snapshot,
      meta: buildSaveMeta(snapshot, slotId)
    };
  });
  const hasSlotSnapshot = entries.some((entry) => Boolean(entry.snapshot));
  if (!hasSlotSnapshot) {
    const legacySnapshot = getLegacySnapshot();
    if (legacySnapshot) {
      entries[0] = {
        slotId: 1,
        snapshot: legacySnapshot,
        meta: buildSaveMeta(legacySnapshot, 1)
      };
    }
  }
  return entries;
}

function getLatestSlotEntry(entries = getStoredSlotEntries()) {
  return entries
    .filter((entry) => Boolean(entry.meta))
    .sort((left, right) => {
      const leftTime = left.meta?.savedAt ? new Date(left.meta.savedAt).getTime() : 0;
      const rightTime = right.meta?.savedAt ? new Date(right.meta.savedAt).getTime() : 0;
      if (rightTime !== leftTime) {
        return rightTime - leftTime;
      }
      return left.slotId - right.slotId;
    })[0] || null;
}

function getPreferredSaveSlotId(activeSlotId = null) {
  const entries = getStoredSlotEntries();
  if (activeSlotId && entries.some((entry) => entry.slotId === activeSlotId)) {
    return activeSlotId;
  }
  const firstEmpty = entries.find((entry) => !entry.meta);
  if (firstEmpty) {
    return firstEmpty.slotId;
  }
  const oldestFilled = entries
    .filter((entry) => Boolean(entry.meta))
    .sort((left, right) => {
      const leftTime = left.meta?.savedAt ? new Date(left.meta.savedAt).getTime() : 0;
      const rightTime = right.meta?.savedAt ? new Date(right.meta.savedAt).getTime() : 0;
      if (leftTime !== rightTime) {
        return leftTime - rightTime;
      }
      return left.slotId - right.slotId;
    })[0];
  return oldestFilled?.slotId || 1;
}

function getSnapshotForSlot(slotId = null) {
  const entries = getStoredSlotEntries();
  if (slotId) {
    const target = entries.find((entry) => entry.slotId === slotId);
    return target?.snapshot ? { slotId, snapshot: target.snapshot } : null;
  }
  const latest = getLatestSlotEntry(entries);
  return latest?.snapshot ? { slotId: latest.slotId, snapshot: latest.snapshot } : null;
}

function packBooleanArray(values = []) {
  let packed = "";
  for (let index = 0; index < values.length; index += 4) {
    let nibble = 0;
    if (values[index]) {
      nibble |= 8;
    }
    if (values[index + 1]) {
      nibble |= 4;
    }
    if (values[index + 2]) {
      nibble |= 2;
    }
    if (values[index + 3]) {
      nibble |= 1;
    }
    packed += nibble.toString(16);
  }
  return packed;
}

function unpackBooleanArray(packed = "", length = 0) {
  const values = [];
  for (let index = 0; index < packed.length; index += 1) {
    const nibble = Number.parseInt(packed[index], 16) || 0;
    values.push(Boolean(nibble & 8));
    values.push(Boolean(nibble & 4));
    values.push(Boolean(nibble & 2));
    values.push(Boolean(nibble & 1));
  }
  return values.slice(0, length);
}

function serializeTiles(tiles = []) {
  const palette = [];
  const paletteIndex = new Map();
  const refs = [];
  tiles.forEach((tile) => {
    const key = JSON.stringify(tile || {});
    let index = paletteIndex.get(key);
    if (typeof index !== "number") {
      index = palette.length;
      palette.push(key);
      paletteIndex.set(key, index);
    }
    refs.push(index);
  });
  return { palette, refs };
}

function deserializeTiles(palette = [], refs = []) {
  const parsedPalette = palette.map((entry) => parseStoredSnapshot(entry) || {});
  return refs.map((index) => ({ ...(parsedPalette[index] || {}) }));
}

function serializeLevel(level) {
  if (!level || typeof level !== "object") {
    return level;
  }
  const serialized = { ...level };
  if (Array.isArray(level.tiles)) {
    const { palette, refs } = serializeTiles(level.tiles);
    serialized.tilePalette = palette;
    serialized.tileRefs = refs;
    delete serialized.tiles;
  }
  if (Array.isArray(level.explored)) {
    serialized.exploredBits = packBooleanArray(level.explored);
    serialized.exploredLength = level.explored.length;
    delete serialized.explored;
  }
  if (Array.isArray(level.visible)) {
    serialized.visibleBits = packBooleanArray(level.visible);
    serialized.visibleLength = level.visible.length;
    delete serialized.visible;
  }
  return serialized;
}

function deserializeLevel(level) {
  if (!level || typeof level !== "object") {
    return level;
  }
  const restored = { ...level };
  if (Array.isArray(level.tilePalette) && Array.isArray(level.tileRefs)) {
    restored.tiles = deserializeTiles(level.tilePalette, level.tileRefs);
    delete restored.tilePalette;
    delete restored.tileRefs;
  }
  if (typeof level.exploredBits === "string") {
    restored.explored = unpackBooleanArray(level.exploredBits, level.exploredLength || 0);
    delete restored.exploredBits;
    delete restored.exploredLength;
  }
  if (typeof level.visibleBits === "string") {
    restored.visible = unpackBooleanArray(level.visibleBits, level.visibleLength || 0);
    delete restored.visibleBits;
    delete restored.visibleLength;
  }
  return restored;
}

function serializeSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return snapshot;
  }
  return {
    ...snapshot,
    levels: Array.isArray(snapshot.levels) ? snapshot.levels.map((level) => serializeLevel(level)) : []
  };
}

function deserializeSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return snapshot;
  }
  return {
    ...snapshot,
    levels: Array.isArray(snapshot.levels) ? snapshot.levels.map((level) => deserializeLevel(level)) : []
  };
}

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

export function getAllSavedRunMeta() {
  return getStoredSlotEntries().map((entry) => ({
    slotId: entry.slotId,
    meta: entry.meta ? { ...entry.meta } : null
  }));
}

export function getSavedRunMeta(slotId = null) {
  const entries = getStoredSlotEntries();
  if (slotId) {
    return entries.find((entry) => entry.slotId === slotId)?.meta || null;
  }
  return getLatestSlotEntry(entries)?.meta || null;
}

export function formatSaveStamp(isoString) {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return `Saved ${parsed.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
}

export function syncSaveChrome(game) {
  const meta = getSavedRunMeta(game.activeSaveSlotId) || getSavedRunMeta();
  const width = typeof window !== "undefined" ? window.innerWidth : 999;
  if (game.saveStamp) {
    if (!meta) {
      game.saveStamp.textContent = width <= 640 ? "No save" : "No save available";
      game.saveStamp.title = "No saved run in browser storage";
    } else {
      const timeLabel = meta.savedAt ? formatSaveStamp(meta.savedAt) : null;
      const slotPrefix = meta.slotId ? `S${meta.slotId} ` : "";
      const compact = width <= 640;
      const veryCompact = width <= 520;
      game.saveStamp.textContent = veryCompact
        ? timeLabel
          ? `${slotPrefix}Lv.${meta.level} D${meta.depth} - ${timeLabel.replace("Saved ", "")}`
          : `${slotPrefix}Lv.${meta.level} D${meta.depth}`
        : compact
          ? timeLabel
            ? `${slotPrefix}${meta.name} Lv.${meta.level} D${meta.depth} - ${timeLabel.replace("Saved ", "")}`
            : `${slotPrefix}${meta.name} Lv.${meta.level} D${meta.depth}`
        : timeLabel
          ? `${slotPrefix}${meta.name} Lv.${meta.level} Depth ${meta.depth} - ${timeLabel}`
          : `${slotPrefix}${meta.name} Lv.${meta.level} Depth ${meta.depth}`;
      game.saveStamp.title = timeLabel
        ? `Save slot ${meta.slotId || "?"}: ${meta.name}, level ${meta.level}, depth ${meta.depth}. ${timeLabel}.`
        : `Save slot ${meta.slotId || "?"}: ${meta.name}, level ${meta.level}, depth ${meta.depth}.`;
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
  const snapshot = {
    saveFormatVersion: SAVE_FORMAT_VERSION,
    version: APP_VERSION
  };
  for (const key of SAVE_FIELDS) {
    snapshot[key] = game[key];
  }
  snapshot.meta = {
    name: game.player.name,
    level: game.player.level,
    depth: game.currentDepth,
    classId: game.player.classId,
    className: game.player.className,
    raceId: game.player.raceId,
    raceName: game.player.race,
    savedAt: new Date().toISOString()
  };
  return snapshot;
}

export function migrateSnapshot(snapshot) {
  const migrated = { ...snapshot };
  const originalVersion = migrated.saveFormatVersion || 1;
  if (!migrated.saveFormatVersion) {
    migrated.saveFormatVersion = 1;
  }
  for (const [key, defaultFactory] of Object.entries(SAVE_FIELD_DEFAULTS)) {
    if (!(key in migrated) || migrated[key] === undefined) {
      migrated[key] = defaultFactory();
    }
  }
  if (originalVersion < 6 && Array.isArray(migrated.levels)) {
    resetDungeonMapState(migrated.levels);
  }
  migrated.saveFormatVersion = SAVE_FORMAT_VERSION;
  return migrated;
}

export function saveGame(game, options = {}) {
  if (!game.player || game.player.hp <= 0) {
    return;
  }
  const { silent = false, slotId = null, skipUiRefresh = false } = options;
  recordTelemetry(game, "save_game", {
    saveMode: silent ? "autosave" : "manual"
  });
  const resolvedSlotId = getPreferredSaveSlotId(slotId || game.activeSaveSlotId || null);
  const snapshot = createSaveSnapshot(game);
  localStorage.setItem(getSaveSlotKey(resolvedSlotId), JSON.stringify(serializeSnapshot(snapshot)));
  game.activeSaveSlotId = resolvedSlotId;
  if (!silent) {
    game.log(`Game saved to slot ${resolvedSlotId}.`, "good");
  }
  if (!skipUiRefresh) {
    game.refreshChrome();
    game.render();
  }
}

export function loadGame(game, options = {}) {
  const { slotId = null } = options;
  const resolved = getSnapshotForSlot(slotId || game.activeSaveSlotId || null);
  if (!resolved?.snapshot) {
    game.log("No saved game is available.", "warning");
    game.render();
    return;
  }
  const snapshot = migrateSnapshot(deserializeSnapshot(resolved.snapshot));
  localStorage.setItem(getSaveSlotKey(resolved.slotId), JSON.stringify(serializeSnapshot(snapshot)));
  // Restore fields that need normalization
  game.turn = snapshot.turn;
  game.levels = normalizeLevels(snapshot.levels);
  game.player = normalizePlayer(snapshot.player);
  game.ensureEquipmentAliases?.(game.player);
  game.syncPlayerSpellTray?.(game.player);
  game.currentDepth = snapshot.currentDepth;
  game.currentLevel = game.levels[game.currentDepth];
  game.settings = { ...defaultSettings(), ...(snapshot.settings || game.settings) };
  saveSettings(game.settings);
  game.audio.updateSettings(game.settings);
  game.shopState = normalizeShopState(snapshot.shopState);
  // Restore plain fields using the save contract
  for (const key of SAVE_FIELDS) {
    if (key === "turn" || key === "currentDepth" || key === "levels" || key === "player" || key === "settings" || key === "shopState") continue;
    const defaultFactory = SAVE_FIELD_DEFAULTS[key];
    game[key] = (key in snapshot && snapshot[key] !== undefined) ? snapshot[key] : (defaultFactory ? defaultFactory() : null);
  }
  game.pendingSpellChoices = 0;
  game.pendingPerkChoices = 0;
  game.pendingRewardChoice = null;
  game.pendingRewardQueue = [];
  game.pendingTurnResolution = null;
  game.activeSaveSlotId = resolved.slotId;
  game.mode = "game";
  game.pendingShop = null;
  game.pendingService = null;
  if (game.resetReadState) {
    game.resetReadState();
  }
  ensureBuildState(game);
  ensureMetaProgressionState(game);
  mergeLegacyTownUnlocks(game, snapshot.townUnlocks || {});
  ensureTownMetaState(game);
  ensureChronicleState(game);
  initializeTelemetry(game);
  game.recalculateDerivedStats();
  game.closeModal();
  game.syncAdaptiveLayout?.(true);
  syncFloorState(game);
  syncDangerState(game);
  game.updateFov();
  game.updateMonsterIntents();
  recordTelemetry(game, "load_game", {
    saveMode: "manual"
  });
  game.log(`Save slot ${resolved.slotId} restored.`, "good");
  game.refreshChrome();
  game.render();
}
