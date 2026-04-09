/**
 * @module save-contract
 * @owns Explicit declaration of all game state fields that must be persisted
 *
 * This is the single source of truth for what gets saved and loaded.
 * Both createSaveSnapshot() and loadGame() use this list.
 * When adding a new persistent field to the game, add it here.
 *
 * Fields listed here are direct properties of the game object.
 * The meta block (name, level, depth, class, race, savedAt) is derived
 * and built separately in persistence.js.
 */

/**
 * Game state fields that are serialized into save snapshots.
 * Order matches the historical save format for consistency.
 */
export const SAVE_FIELDS = [
  "turn",
  "currentDepth",
  "levels",
  "player",
  "settings",
  "shopState",
  "storyFlags",
  "townUnlocks",
  "shopTiers",
  "townState",
  "rumorTable",
  "chronicleEvents",
  "deathContext",
  "telemetry",
  "contracts",
  "classMasteries",
  "runSummaryHistory",
  "lastTownRefreshTurn"
];

/**
 * Default values for fields that may be missing from older save formats.
 * Used by migration logic to backfill missing properties.
 */
export const SAVE_FIELD_DEFAULTS = {
  storyFlags: () => ({}),
  lastTownRefreshTurn: () => 0,
  shopState: () => ({}),
  townUnlocks: () => ({}),
  shopTiers: () => ({}),
  townState: () => ({}),
  rumorTable: () => [],
  chronicleEvents: () => [],
  deathContext: () => null,
  telemetry: () => null,
  contracts: () => null,
  classMasteries: () => null,
  runSummaryHistory: () => []
};
