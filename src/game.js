import {
  BOARD_CANVAS_SIZE,
  DUNGEON_DEPTH,
  FOV_RADIUS,
  TILE_SIZE,
  VIEW_SIZE
} from "./core/constants.js";
import {
  BOON_DEFS,
  CLASSES,
  COMMENDATION_DEFS,
  DISCOVERY_DEFS,
  ENEMY_BEHAVIOR_KITS,
  ITEM_DEFS,
  LOOT_AFFIX_DEFS,
  MILESTONE_DEFS,
  MONSTER_DEFS,
  OBJECTIVE_DEFS,
  PERK_DEFS,
  RACES,
  RELIC_DEFS,
  ROOM_EVENT_DEFS,
  SHOPS,
  SPELLS,
  STORY_BEATS,
  STORY_NPCS,
  TEMPLE_SERVICES,
  TOWN_REACTION_DEFS,
  TOWN_UNLOCK_DEFS
} from "./data/content.js";
import { AMBIENT_MUSIC_ASSETS, TITLE_SCREEN_ASSETS } from "./data/assets.js";
import {
  createInitialShopState,
  createEmptyEquipment,
  createItem,
  createMonster,
  createTownItem,
  getCarryCapacity,
  getCarryWeight,
  getClass,
  getEncumbranceTier,
  getExploredPercent,
  getItemAccuracyBonus,
  getItemArmor,
  getItemBonusVsUndead,
  getItemColdResist,
  getItemCritBonus,
  getItemDexBonus,
  getItemFireResist,
  getItemGuardBonus,
  getItemIntBonus,
  getItemLightBonus,
  getItemManaBonus,
  getItemName,
  getItemPower,
  getItemStrBonus,
  getItemSearchBonus,
  getItemConBonus,
  getItemValue,
  getItemWardBonus,
  getItemOvercastRelief,
  getMonsterHealthState,
  getRace,
  miniMapColor,
  rollTreasure,
  weightedMonster,
  describeItem,
  canIdentify,
  countUnknownItems,
  classifyItem,
  shopAcceptsItem,
  curseRandomCarriedItem
} from "./core/entities.js";
import {
  actorAt,
  addLevelProp,
  addSecretVault,
  addSetPiece,
  blankLevel,
  carveRoom,
  carveTunnel,
  centerOf,
  clearVisibility,
  fillRect,
  getTile,
  hasLineOfSight,
  inBounds,
  intersects,
  isExplored,
  isOccupied,
  isVisible,
  isWalkable,
  itemsAt,
  placeBuilding,
  randomRoomTile,
  revealAll,
  revealCircle,
  revealNearbySecrets,
  setExplored,
  setTile,
  setVisible,
  summonMonsterNear,
  tileDef
} from "./core/world.js";
import {
  capitalize,
  choice,
  clamp,
  distance,
  escapeHtml,
  nowTime,
  randInt,
  removeAt,
  roll
} from "./core/utils.js";
import { loadSettings, saveSettings } from "./core/settings.js";
import {
  drawBoardAtmosphere,
  drawBoardBurdenVignette,
  drawBoardProps,
  drawBoardVignette,
  drawCenteredText,
  drawEffect,
  drawItem,
  drawMonster,
  drawMonsterHealthBar,
  drawMonsterIntent,
  drawPlayer,
  drawTargetCursor,
  drawTile,
  drawTownBuildings
} from "./ui/render.js";
import { SoundBoard } from "./audio/soundboard.js";
import { GamepadInput } from "./input/gamepad.js";
import { applyCommandResult } from "./core/command-result.js";
import { applyEffects } from "./core/effect-bus.js";
import { createPlayerState } from "./core/player-state.js";
import {
  actorStats,
  armorValueForStats,
  attackValueForStats,
  damageRangeForStats,
  equipmentStatBonuses,
  evadeValueForStats,
  levelProgress,
  maxHpForStats,
  maxManaForStats,
  moveSpeedForStats,
  playerClassTemplate,
  playerHpBase,
  playerManaBase,
  playerRaceTemplate,
  searchPowerForStats,
  searchRadiusForStats
} from "./core/stat-helpers.js";
import {
  addSpellToTrayIfSpace as addSpellToTray,
  cancelTargetMode as cancelSpellTarget,
  closeSpellTray as closeSpellTrayFn,
  confirmTargetSelection as confirmSpellTarget,
  getActiveSpellTargetPreview as getSpellPreview,
  getDamageEffectColor as getDmgColor,
  getLearnableSpellOptions as getLearnableSpells,
  getPinnedSpellIds as getPinnedSpells,
  getSpellFilterDefs as spellFilterDefs,
  getSpellProjectileStyle as getSpellProjStyle,
  getSpellRoleLabel as getSpellRole,
  getSpellTargetingLabel as getSpellTargetLabel,
  getSpellTargetingMode as getSpellTargetMode,
  getSpellTrayLimit as spellTrayLimit,
  getSortedKnownSpellIds as sortedSpellIds,
  moveTargetCursor as moveSpellCursor,
  moveTraySpell as moveTraySpellFn,
  openSpellTray as openSpellTrayFn,
  pinSpellToTray as pinSpellFn,
  prepareSpell as prepareSpellFn,
  resolveSpellTargetPreview as resolveSpellPreview,
  selectSpell as selectSpellFn,
  startTargetMode as startSpellTarget,
  syncSpellTray,
  unpinSpellFromTray as unpinSpellFn
} from "./features/spell-manager.js";
import {
  addItemToInventory as addItemToInventoryFn,
  buyShopItem as buyShopItemFn,
  cancelPendingPickup as cancelPendingPickupFn,
  confirmPendingPickup as confirmPendingPickupFn,
  dropInventoryItem as dropInventoryItemFn,
  equipInventoryItem as equipInventoryItemFn,
  finishPickupTurn as finishPickupTurnFn,
  getPickupBurdenPreview as getPickupBurdenPreviewFn,
  identifyInventoryAndEquipment as identifyInventoryAndEquipmentFn,
  pickupHere as pickupHereFn,
  removeCurses as removeCursesFn,
  resolvePickupItem as resolvePickupItemFn,
  sellShopItem as sellShopItemFn,
  showPickupPrompt as showPickupPromptFn,
  unequipSlot as unequipSlotFn,
  useChargedItem as useChargedItemFn,
  useInventoryItem as useInventoryItemFn,
  useRuneOfReturn as useRuneOfReturnFn
} from "./features/inventory-manager.js";
import {
  adjustCreationStat as adjustCreationStatDraft,
  captureCreationDraft as captureCreationDraftState,
  getCreationPointsRemaining as getCreationDraftPointsRemaining,
  getCreationStats as getCreationDraftStats,
  resetCreationDraft as resetCreationState,
  showCreationModal as showCreationScreen,
  showTitleScreen as showTitleModal
} from "./features/creation.js";
import {
  getAllSavedRunMeta as loadAllSavedRunMeta,
  getSavedRunMeta as loadSavedRunMeta,
  formatSaveStamp as formatSavedRunStamp,
  loadGame as loadGameState,
  saveGame as saveGameState,
  syncSaveChrome
} from "./features/persistence.js";
import { performSearchCommand, useStairsCommand } from "./features/exploration.js";
import {
  applyCharge,
  attack as attackActors,
  canCharge as canMonsterCharge,
  canMonsterMoveTo as canMonsterMove,
  checkLevelUp as checkPlayerLevelUp,
  damageActor as damageActorTarget,
  findRetreatStep as findMonsterRetreatStep,
  getMonsterIntent as getMonsterIntentModel,
  handleDeath as handlePlayerDeath,
  killMonster as killMonsterActor,
  makeNoise as makeDungeonNoise,
  processMonsters as processMonsterTurns,
  updateMonsterIntents as updateAllMonsterIntents,
  visibleEnemies as getVisibleEnemies
} from "./features/combat.js";
import {
  endTurn as endGameTurn,
  performWait as performWaitTurn,
  resolveTurn as resolveGameTurn,
  restUntilSafe as restUntilSafeTurn,
  sleepUntilRestored as sleepUntilRestoredTurn
} from "./features/turns.js";
import { getAdvisorModel as buildAdvisorModel, renderActionBar as renderAdvisorActionBar, renderPanels as renderAdvisorPanels } from "./features/advisor.js";
import { getDepthTheme, getDynamicMonsterCap, getEncounterSummary, populateDungeonEncounters } from "./features/encounters.js";
import {
  getObjectiveDefendersRemaining,
  getObjectiveRoomClear,
  getObjectiveRewardPreview,
  getObjectiveStatusText,
  getOptionalStatusText,
  grantObjectiveRumor,
  handleObjectiveInteraction,
  setupFloorDirectives,
  syncFloorState
} from "./features/objectives.js";
import {
  getDangerSummary,
  getPressureStatus,
  increaseDanger as raiseDanger,
  initializeDangerState,
  markGreedAction as markFloorGreedAction,
  noteFloorIntro,
  syncDangerState
} from "./features/director.js";
import {
  chooseReward,
  ensureBuildState,
  getBuildArmorBonus,
  getBuildDamageBonus,
  getBuildEvadeBonus,
  getBuildMaxHpBonus,
  getBuildMaxManaBonus,
  getBuildSearchBonus,
  getSpellCost,
  grantBoon as applyBoonReward,
  grantRumorToken as addRumorToken,
  hasPendingProgressionChoice,
  onPlayerMove,
  prepareNextRewardChoice,
  queueObjectiveReward,
  queuePerkChoice
} from "./features/builds.js";
import {
  ensureTownMetaState,
  formatTownCycle,
  getAvailableTownUnlocks,
  getRumorPrice,
  getSagePrice,
  getShopBuyPrice,
  getShopSellPrice,
  getTemplePrice,
  getTownCycleState as getTownCycleMeta,
  getTownIntel,
  getTownMetaSummary as buildTownMetaSummary,
  getTownReactionBundle,
  refreshTownStocks
} from "./features/town-meta.js";
import { ensureChronicleState, noteDeathContext, recordChronicleEvent } from "./features/chronicle.js";
import {
  advanceClassMastery,
  applyClassMasteryBonuses,
  applyCommendationBonuses,
  applyContractToNewRun,
  ensureMetaProgressionState,
  evaluateRunCommendations,
  getActiveContract,
  getAvailableCommendations,
  getAvailableContracts,
  getCampaignArchive,
  getClassMasterySummary,
  getClassMasteryViewModel,
  getContractViewModel,
  getCreationPersistencePreview,
  getDurableTownUnlocks,
  getNextCommendationGoal,
  getRecommendedContract,
  recordCampaignSummary,
  setActiveContract,
  unlockContract
} from "./features/meta-progression.js";
import {
  buildTelemetrySummary,
  exportTelemetryTrace,
  getTelemetryReviewSnapshot,
  initializeTelemetry,
  recordRunSummary,
  recordTelemetry,
  recordTownServiceOpen,
  resetTelemetry,
  startTelemetryRun,
  trackFirstPlayerMove,
  trackObjectiveProgress,
  trackOptionalProgress
} from "./features/telemetry.js";
import { markOnboardingFlag } from "./features/onboarding.js";
import { buildHudFeedModel, renderHudFeed } from "./features/hud-feed.js";
import {
  buildEquipmentSlotSummary,
  buildInventoryItemSemantics,
  buildInventoryPresentationModel,
  getInventoryCategoryDefs,
  getInventoryRowGlyph,
  getSpellCategoryDefs,
  getSpellCategoryKey,
  getSpellCategoryLabel,
  isInventoryRowNoise
} from "./features/inventory-ui.js";
import { getOnboardingVariantMeta, getRouteExperimentTuning, getValidationSummary as buildValidationSummary, initializeValidationState } from "./features/validation.js";
import { renderCharacterSheet } from "./features/screens/character-sheet.js";
import { renderBankModal } from "./features/screens/bank-modal.js";
import { renderSettingsModal } from "./features/screens/settings-modal.js";
import { renderJournalChronicleSection } from "./features/screens/journal-chronicle-section.js";
import { renderPackInspector } from "./features/screens/pack-inspector.js";
import { renderPackHubMarkup } from "./features/screens/pack-hub.js";
import { renderMagicHubMarkup, renderMagicResultPanelMarkup } from "./features/screens/magic-hub.js";
import { dispatchAction } from "./features/action-dispatch.js";
import { dispatchKeydown } from "./features/input-dispatch.js";
import { renderBoard as renderBoardComposed, renderMiniMap as renderMiniMapComposed } from "./ui/board-renderer.js";

const BOARD_OVERLAY_HEIGHT_PX = {
  mobile: 156,
  desktop: 176
};
const BOARD_OVERLAY_BUFFER_ROWS = 1;
const MUSIC_TRACK_CHOICES = [
  { id: "area", label: "Area", track: "" },
  { id: "town", label: "Town", track: AMBIENT_MUSIC_ASSETS.town },
  { id: "dungeon", label: "Dungeon", track: AMBIENT_MUSIC_ASSETS.dungeon },
  { id: "title", label: "Title", track: TITLE_SCREEN_ASSETS.music }
];
const SPELL_ICON_SYMBOLS = {
  spark: { symbol: "✦", label: "Spark" },
  cross: { symbol: "✚", label: "Heal" },
  snowflake: { symbol: "❄", label: "Frost" },
  flame: { symbol: "✹", label: "Fire" },
  door: { symbol: "⌂", label: "Door" },
  eye: { symbol: "◉", label: "Sight" },
  magnifier: { symbol: "⌕", label: "Identify" },
  hourglass: { symbol: "⌛", label: "Slow" },
  "broken-chain": { symbol: "⛓", label: "Unbind" },
  "return-arrow": { symbol: "↩", label: "Return" },
  lightning: { symbol: "ϟ", label: "Storm" },
  hand: { symbol: "☞", label: "Hold" },
  "cross-bold": { symbol: "✛", label: "Greater Heal" },
  "stone-shield": { symbol: "⬟", label: "Stone Ward" },
  shield: { symbol: "⛨", label: "Ward" },
  "shield-flame": { symbol: "⛨", label: "Fire Ward" },
  "shield-snow": { symbol: "⛨", label: "Cold Ward" },
  swirl: { symbol: "⟳", label: "Teleport" },
  lantern: { symbol: "☼", label: "Light" },
  "warning-eye": { symbol: "◌", label: "Detect" }
};

export class Game {
  constructor() {
    this.appShell = document.querySelector(".mobile-app");
    // Opt into the JRPG visual language. The flag is set on <body> (not
    // just .mobile-app) because #modal-root is a SIBLING of .mobile-app,
    // not a descendant — modals need to inherit the attribute too.
    // This replaces the earlier :has() runtime checks with a cheap
    // attribute match, gives a stable hook for A/B disabling, and lets
    // every subtree in the document participate in the JRPG rules.
    if (typeof document !== "undefined" && document.body) {
      document.body.dataset.jrpgUi = "true";
    }
    if (this.appShell) {
      this.appShell.dataset.jrpgUi = "true";
    }
    this.canvas = document.getElementById("game-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.mapCanvas = document.getElementById("map-canvas");
    this.mapCtx = this.mapCanvas ? this.mapCanvas.getContext("2d") : null;
    this.boardOverlays = document.querySelector(".board-overlays");
    this.mapCaption = document.getElementById("map-caption");
    this.mapDrawer = document.getElementById("map-drawer");
    this.mapPanelLabel = document.getElementById("map-panel-label");
    this.mapPanelState = document.getElementById("map-panel-state");
    this.mapToggleButton = document.getElementById("map-toggle-button");
    this.spellTrayToggleButton = document.getElementById("spell-tray-toggle-button");
    this.spellTray = document.getElementById("spell-tray");
    this.modalRoot = document.getElementById("modal-root");
    this.actionBar = document.getElementById("action-bar");
    this.runStatus = document.getElementById("run-status");
    this.pressureStatus = document.getElementById("pressure-status");
    this.topMusicButton = document.getElementById("top-music-button");
    this.topMapButton = document.getElementById("top-map-button");
    this.utilityMenuButton = document.getElementById("utility-menu-button");
    this.topBand = document.querySelector(".top-band");
    this.topBandStatus = this.topBand?.querySelector(".top-band-status") || null;
    this.topBandActions = this.topBand?.querySelector(".top-band-actions") || null;
    this.controllerStatus = document.getElementById("controller-status");
    this.saveStamp = document.getElementById("save-stamp");
    this.quickSaveButton = document.getElementById("quick-save-button");
    this.quickLoadButton = document.getElementById("quick-load-button");
    this.touchControls = document.getElementById("touch-controls");
    this.bottomBand = document.querySelector(".bottom-band");
    this.statusBand = this.bottomBand?.querySelector(".status-band") || null;
    this.playerCapsule = document.getElementById("player-capsule");
    this.threatCapsule = document.getElementById("threat-capsule");
    this.advisorStrip = document.getElementById("advisor-strip");
    this.eventTicker = document.getElementById("event-ticker");
    this.desktopOverlay = document.getElementById("desktop-overlay");
    this.desktopVerbHost = document.getElementById("desktop-verb-host");
    this.desktopQuickslotsHost = document.getElementById("desktop-quickslots-host");
    this.desktopAuxStack = document.getElementById("desktop-aux-stack");
    this.desktopStatusHost = document.getElementById("desktop-status-host");
    this.desktopOverlayMapHost = document.getElementById("desktop-overlay-map-host");
    this.turn = 1;
    this.mode = "title";
    this.activeSaveSlotId = null;
    this.levels = [];
    this.currentDepth = 0;
    this.currentLevel = null;
    this.player = null;
    this.messages = [];
    this.selectedRace = RACES[0].id;
    this.selectedClass = CLASSES[0].id;
    this.creationName = "Morgan";
    this.creationStatBonuses = { str: 0, dex: 0, con: 0, int: 0 };
    this.pendingShop = null;
    this.pendingService = null;
    this.pendingSpell = null;
    this.pendingSpellChoices = 0;
    this.pendingPerkChoices = 0;
    this.pendingRewardChoice = null;
    this.pendingRewardQueue = [];
    this.pendingTurnResolution = null;
    this.activeHubTab = "pack";
    this.activeJournalSection = "current";
    this.activePackFilter = "equip";
    this.activeMagicFilter = "all";
    this.activeSpellLearnFilter = "all";
    this.activeShopPanel = "buy";
    this.utilityMenuSecondaryExpanded = false;
    this.fieldGuideRailCollapsed = false;
    this.activePackSelection = { type: "inventory", value: 0 };
    this.spellTrayOpen = false;
    this.targetMode = null;
    this.visualEffects = [];
    this.boardImpulse = null;
    this.storyFlags = {};
    this.floorObjective = null;
    this.floorOptional = null;
    this.floorResolved = false;
    this.dangerLevel = "Low";
    this.dangerTriggers = null;
    this.reinforcementClock = 0;
    this.townUnlocks = {};
    this.shopTiers = {};
    this.townState = {};
    this.rumorTable = [];
    this.chronicleEvents = [];
    this.deathContext = null;
    this.seenMonsters = new Set();
    this.loggedRoomReads = new Set();
    this.focusedThreat = null;
    this.pendingPickupPrompt = null;
    this.lastTownRefreshTurn = 0;
    this.lastRunSummary = null;
    this.runPersistenceChanges = null;
    this.modalSurfaceKey = null;
    this.modalReturnContext = null;
    this.utilityMenuOpenerFocusKey = null;
    this.settings = loadSettings();
    this.mapDrawerOpen = false;
    this.layoutMode = "mobile";
    this.lastInputSource = "pointer";
    this.controllerFocusKey = null;
    this.modalInteractionFeedback = { message: "", tone: "" };
    this.pendingModalFeedbackHandle = 0;
    this.pendingModalFeedbackMode = "";
    this.pendingDesktopOverlayCollapseHandle = 0;
    this.pendingDesktopOverlayCollapseMode = "";
    this.uiInteractionAckHandles = new WeakMap();
    this.uiNavigationCache = {
      root: null,
      focusables: [],
      focusKeyMap: new Map()
    };
    this.reducedMotionQuery = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
    this.liveFeedSticky = null;
    this.movementCadence = this.createMovementCadenceState();
    document.documentElement.dataset.uiScale = this.settings.uiScale;
    this.shopState = createInitialShopState();
    this.shopBrowseState = null;
    this.lastPreviewKey = "";
    this.lastEventTickerMarkup = "";
    this.lastDesktopVerbMarkup = "";
    this.lastDesktopQuickslotsMarkup = "";
    this.runtimeFrameHandle = 0;
    this.hoveredPackSelection = null;
    this.hoveredShopPreview = null;
    this.pendingAutosaveHandle = 0;
    this.pendingAutosaveMode = "";
    this.pendingUtilitySummaryFrame = 0;
    this.pendingHubPrewarmHandle = 0;
    this.pendingHubPrewarmMode = "";
    this.pendingAdventureBootstrapFrame = 0;
    this.transitionPending = false;
    this.desktopOverlayExpanded = true;
    this.desktopOverlayEventsBound = false;
    this.canvas.width = BOARD_CANVAS_SIZE;
    this.canvas.height = BOARD_CANVAS_SIZE;
    this.hubPaneDirty = {
      pack: true,
      magic: true,
      journal: true
    };
    ensureTownMetaState(this);
    ensureChronicleState(this);
    ensureMetaProgressionState(this);
    initializeTelemetry(this);
    initializeValidationState(this);
    this.ps = createPlayerState(() => this.player);
    this.audio = new SoundBoard(this.settings);
    this.gamepadInput = new GamepadInput();
    this.bindEvents();
    this.bindDesktopOverlayEvents();
    this.syncAdaptiveLayout(true);
    this.registerServiceWorker();
    this.startRuntimeLoop();
    this.refreshChrome();
    this.showTitleScreen();
    this.render();
  }

  bindEvents() {
    document.addEventListener("keydown", (event) => {
      this.setInputSource("keyboard");
      this.handleKeydown(event);
    });
    document.addEventListener("keyup", (event) => this.handleKeyup(event));
    document.addEventListener("click", (event) => this.handleClick(event));
    document.addEventListener("dblclick", (event) => this.handleDoubleClick(event));
    document.addEventListener("change", (event) => this.handleChange(event));
    document.addEventListener("mouseover", (event) => this.handlePreviewPointer(event));
    document.addEventListener("focusin", (event) => this.handlePreviewFocus(event));
    document.addEventListener("pointerdown", (event) => {
      this.setInputSource("pointer");
      this.handlePointerDown(event);
    });
    document.addEventListener("pointerup", () => this.releaseHeldMovement("pointer"));
    document.addEventListener("pointercancel", () => this.releaseHeldMovement("pointer"));
    document.addEventListener("mousedown", () => this.setInputSource("pointer"));
    document.addEventListener("touchstart", () => this.setInputSource("pointer"), { passive: true });
    document.addEventListener("input", (event) => {
      if (event.target && event.target.id === "hero-name") {
        this.creationName = event.target.value;
      }
    });
    this.canvas.addEventListener("click", (event) => this.handleCanvasClick(event));
    window.addEventListener("gamepadconnected", () => {
      this.refreshChrome();
      this.startRuntimeLoop();
    });
    window.addEventListener("gamepaddisconnected", () => this.refreshChrome());
    window.addEventListener("resize", () => this.refreshChrome());
    window.addEventListener("pagehide", () => {
      if (!this.player) {
      } else {
      }
      this.recordTelemetry("session_end", {
        reason: "pagehide"
      });
    });
    window.addEventListener("blur", () => this.resetMovementCadence());
  }

  startRuntimeLoop() {
    if (this.runtimeFrameHandle) {
      return;
    }
    const tick = () => {
      this.runtimeFrameHandle = 0;
      const gamepadHandled = this.gamepadInput.isConnected() ? this.pollGamepad() : false;
      if (!gamepadHandled) {
        this.pollHeldMovement();
      }
      this.updateEffects();
      if (this.shouldKeepRuntimeLoopAlive()) {
        this.startRuntimeLoop();
      }
    };
    this.runtimeFrameHandle = requestAnimationFrame(tick);
  }

  shouldKeepRuntimeLoopAlive() {
    return Boolean(
      this.getHeldMovement("keyboard")
      || this.getHeldMovement("pointer")
      || this.gamepadInput.isConnected()
      || this.shouldAnimateBoard()
    );
  }

  ensureRuntimeLoop() {
    if (this.shouldKeepRuntimeLoopAlive()) {
      this.startRuntimeLoop();
    }
  }

  queueAnimationFrame(callback) {
    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
      callback();
      return 0;
    }
    return window.requestAnimationFrame(() => callback());
  }

  queueDeferredUiTask(callback, options = {}) {
    const { preferIdle = false, timeout = 1200 } = options;
    if (typeof window === "undefined") {
      callback();
      return { mode: "", handle: 0 };
    }
    if (preferIdle && typeof window.requestIdleCallback === "function") {
      return {
        mode: "idle",
        handle: window.requestIdleCallback(() => callback(), { timeout })
      };
    }
    return {
      mode: "timeout",
      handle: window.setTimeout(() => callback(), 0)
    };
  }

  clearDeferredUiTask(handle, mode = "") {
    if (!handle || typeof window === "undefined") {
      return;
    }
    if (mode === "idle" && typeof window.cancelIdleCallback === "function") {
      window.cancelIdleCallback(handle);
      return;
    }
    if (mode === "timeout") {
      window.clearTimeout(handle);
      return;
    }
    if (mode === "frame" && typeof window.cancelAnimationFrame === "function") {
      window.cancelAnimationFrame(handle);
    }
  }

  cancelPendingHubPanePrewarm() {
    this.clearDeferredUiTask(this.pendingHubPrewarmHandle, this.pendingHubPrewarmMode);
    this.pendingHubPrewarmHandle = 0;
    this.pendingHubPrewarmMode = "";
  }

  bindDesktopOverlayEvents() {
    if (this.desktopOverlayEventsBound || !(this.desktopOverlay instanceof HTMLElement)) {
      return;
    }
    this.desktopOverlayEventsBound = true;
    this.desktopOverlay.addEventListener("pointerenter", () => {
      this.cancelScheduledDesktopOverlayCollapse();
      this.setDesktopOverlayExpanded(true);
    });
    this.desktopOverlay.addEventListener("pointerleave", () => {
      this.scheduleDesktopOverlayCollapse(900);
    });
    this.desktopOverlay.addEventListener("focusin", () => {
      this.cancelScheduledDesktopOverlayCollapse();
      this.setDesktopOverlayExpanded(true);
    });
    this.desktopOverlay.addEventListener("focusout", () => {
      this.queueAnimationFrame(() => {
        if (!this.desktopOverlay?.contains(document.activeElement)) {
          this.scheduleDesktopOverlayCollapse(900);
        }
      });
    });
  }

  cancelScheduledDesktopOverlayCollapse() {
    this.clearDeferredUiTask(this.pendingDesktopOverlayCollapseHandle, this.pendingDesktopOverlayCollapseMode);
    this.pendingDesktopOverlayCollapseHandle = 0;
    this.pendingDesktopOverlayCollapseMode = "";
  }

  setDesktopOverlayExpanded(expanded) {
    this.desktopOverlayExpanded = Boolean(expanded);
    if (this.desktopOverlay instanceof HTMLElement) {
      this.desktopOverlay.classList.toggle("is-expanded", this.desktopOverlayExpanded);
      this.desktopOverlay.classList.toggle("is-collapsed", !this.desktopOverlayExpanded);
    }
    if (this.appShell instanceof HTMLElement) {
      this.appShell.dataset.desktopOverlay = this.desktopOverlayExpanded ? "expanded" : "collapsed";
    }
  }

  scheduleDesktopOverlayCollapse(delayMs = 2200) {
    if (this.layoutMode !== "desktop" || !(this.desktopOverlay instanceof HTMLElement)) {
      return;
    }
    this.cancelScheduledDesktopOverlayCollapse();
    const handle = typeof window !== "undefined"
      ? window.setTimeout(() => {
      this.pendingDesktopOverlayCollapseHandle = 0;
      this.pendingDesktopOverlayCollapseMode = "";
      if (
        this.layoutMode !== "desktop"
        || this.mode === "modal"
        || this.desktopOverlay.matches(":hover")
        || this.desktopOverlay.contains(document.activeElement)
      ) {
        return;
      }
      this.setDesktopOverlayExpanded(false);
      }, delayMs)
      : 0;
    this.pendingDesktopOverlayCollapseHandle = handle;
    this.pendingDesktopOverlayCollapseMode = "timeout";
  }

  noteDesktopOverlayActivity(delayMs = 2200) {
    void delayMs;
    if (this.layoutMode === "desktop" && this.desktopOverlay instanceof HTMLElement) {
      this.setDesktopOverlayExpanded(true);
    }
  }

  moveUiNode(node, parent, options = {}) {
    if (!(node instanceof HTMLElement) || !(parent instanceof HTMLElement) || node.parentElement === parent) {
      return;
    }
    if (options.prepend) {
      parent.prepend(node);
      return;
    }
    if (options.before instanceof HTMLElement && options.before.parentElement === parent) {
      parent.insertBefore(node, options.before);
      return;
    }
    parent.appendChild(node);
  }

  getMapPanelElement() {
    return this.mapCanvas?.closest("#map-panel") || null;
  }

  mountDesktopOverlayShell() {
    const hasDesktopRun = Boolean(
      this.layoutMode === "desktop"
      && this.player
      && this.currentLevel
      && this.desktopOverlay instanceof HTMLElement
      && this.desktopStatusHost instanceof HTMLElement
      && this.desktopOverlayMapHost instanceof HTMLElement
    );
    this.desktopOverlay?.classList.toggle("hidden", !hasDesktopRun);
    this.desktopAuxStack?.classList.toggle("hidden", !hasDesktopRun);
    if (!hasDesktopRun) {
      return;
    }
    this.moveUiNode(this.playerCapsule, this.desktopStatusHost);
    this.moveUiNode(this.getMapPanelElement(), this.desktopOverlayMapHost);
  }

  restoreStandardShell() {
    this.desktopOverlay?.classList.add("hidden");
    this.desktopAuxStack?.classList.add("hidden");
    this.moveUiNode(this.getMapPanelElement(), this.statusBand, { prepend: true });
    this.moveUiNode(this.playerCapsule, this.statusBand);
  }

  syncDesktopOverlayPlacement() {
    const desktop = this.layoutMode === "desktop";
    if (
      !(this.desktopOverlay instanceof HTMLElement)
      || !(this.desktopVerbHost instanceof HTMLElement)
      || !(this.desktopQuickslotsHost instanceof HTMLElement)
      || !(this.desktopStatusHost instanceof HTMLElement)
      || !(this.desktopOverlayMapHost instanceof HTMLElement)
      || !(this.desktopAuxStack instanceof HTMLElement)
      || !(this.statusBand instanceof HTMLElement)
    ) {
      return;
    }
    if (desktop) {
      this.mountDesktopOverlayShell();
      return;
    }
    this.restoreStandardShell();
    this.setDesktopOverlayExpanded(true);
  }

  resetHubPaneDirtyState() {
    this.hubPaneDirty = {
      pack: true,
      magic: true,
      journal: true
    };
  }

  markHubPaneDirty(tab = "") {
    if (tab && Object.prototype.hasOwnProperty.call(this.hubPaneDirty, tab)) {
      this.hubPaneDirty[tab] = true;
      return;
    }
    this.resetHubPaneDirtyState();
  }

  cancelScheduledAutosave() {
    this.clearDeferredUiTask(this.pendingAutosaveHandle, this.pendingAutosaveMode);
    this.pendingAutosaveHandle = 0;
    this.pendingAutosaveMode = "";
  }

  scheduleAutosave() {
    if (!this.player) {
      return;
    }
    this.cancelScheduledAutosave();
    const scheduled = this.queueDeferredUiTask(() => {
      this.pendingAutosaveHandle = 0;
      this.pendingAutosaveMode = "";
      if (!this.player) {
        return;
      }
      this.saveGame({ silent: true, skipUiRefresh: true });
    }, {
      preferIdle: true,
      timeout: 1800
    });
    this.pendingAutosaveHandle = scheduled.handle;
    this.pendingAutosaveMode = scheduled.mode;
  }

  registerServiceWorker() {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js").catch(() => {});
      });
    }
  }

  createMovementCadenceState() {
    return {
      strideSteps: 0,
      lastStepAt: 0,
      heldKeyboard: null,
      heldPointer: null,
      ignoreMoveClickUntil: 0
    };
  }

  getMovementRepeatInterval() {
    const steps = this.movementCadence?.strideSteps || 0;
    if (steps >= 8) {
      return 72;
    }
    if (steps >= 5) {
      return 94;
    }
    if (steps >= 4) {
      return 118;
    }
    return 168;
  }

  noteSuccessfulMove() {
    const cadence = this.movementCadence || (this.movementCadence = this.createMovementCadenceState());
    const now = nowTime();
    cadence.strideSteps = now - cadence.lastStepAt <= 420
      ? cadence.strideSteps + 1
      : 1;
    cadence.lastStepAt = now;
  }

  resetMovementCadence(options = {}) {
    const {
      clearHeld = true,
      clearStride = true
    } = options;
    const cadence = this.movementCadence || (this.movementCadence = this.createMovementCadenceState());
    if (clearStride) {
      cadence.strideSteps = 0;
      cadence.lastStepAt = 0;
    }
    if (clearHeld) {
      cadence.heldKeyboard = null;
      cadence.heldPointer = null;
      cadence.ignoreMoveClickUntil = 0;
    }
    if (clearStride) {
      this.gamepadInput?.resetMoveState?.();
    }
  }

  setHeldMovement(source, dx, dy, key = "") {
    const held = {
      dx,
      dy,
      key,
      nextRepeatAt: 0
    };
    if (source === "keyboard") {
      this.movementCadence.heldKeyboard = held;
    } else if (source === "pointer") {
      this.movementCadence.heldPointer = held;
    }
    this.startRuntimeLoop();
    return held;
  }

  getHeldMovement(source) {
    if (source === "keyboard") {
      return this.movementCadence?.heldKeyboard || null;
    }
    if (source === "pointer") {
      return this.movementCadence?.heldPointer || null;
    }
    return null;
  }

  releaseHeldMovement(source) {
    if (!this.movementCadence) {
      return;
    }
    if (source === "keyboard") {
      this.movementCadence.heldKeyboard = null;
      return;
    }
    if (source === "pointer") {
      this.movementCadence.heldPointer = null;
    }
  }

  scheduleHeldMovementRepeat(source) {
    const held = this.getHeldMovement(source);
    if (held) {
      held.nextRepeatAt = nowTime() + this.getMovementRepeatInterval();
    }
  }

  pollHeldMovement() {
    if (!this.canPlayerAct()) {
      return false;
    }
    const sources = this.lastInputSource === "pointer" ? ["pointer", "keyboard"] : ["keyboard", "pointer"];
    const now = nowTime();
    for (const source of sources) {
      const held = this.getHeldMovement(source);
      if (!held || now < held.nextRepeatAt) {
        continue;
      }
      this.handleMovementIntent(held.dx, held.dy);
      if (this.getHeldMovement(source) === held) {
        held.nextRepeatAt = nowTime() + this.getMovementRepeatInterval();
      }
      return true;
    }
    return false;
  }

  handleKeyup(event) {
    const lower = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const held = this.getHeldMovement("keyboard");
    if (held?.key === lower) {
      this.releaseHeldMovement("keyboard");
    }
  }

  handlePointerDown(event) {
    const actionableTarget = event.target instanceof Element
      ? event.target.closest("button, [data-action], [data-race], [data-class]")
      : null;
    if (
      actionableTarget instanceof HTMLElement
      && this.modalRoot?.contains(actionableTarget)
      && !actionableTarget.matches(":disabled, [aria-disabled='true']")
    ) {
      this.flashUiInteractionTarget(actionableTarget);
    }
    const moveButton = event.target.closest("[data-move]");
    if (!moveButton || !this.canPlayerAct()) {
      return;
    }
    event.preventDefault();
    const [dx, dy] = moveButton.dataset.move.split(",").map(Number);
    this.movementCadence.ignoreMoveClickUntil = nowTime() + 400;
    this.setHeldMovement("pointer", dx, dy);
    this.handleMovementIntent(dx, dy);
    this.scheduleHeldMovementRepeat("pointer");
  }

  getAttackValueForStats(stats, weaponPower = 2) { return attackValueForStats(stats, weaponPower); }

  getDamageRangeForStats(stats, weaponPower = 2) { return damageRangeForStats(stats, weaponPower); }

  getArmorValueForStats(stats) { return armorValueForStats(stats); }

  getEvadeValueForStats(stats) { return evadeValueForStats(stats); }

  getSearchRadiusForStats(stats) { return searchRadiusForStats(stats); }

  getMoveSpeedForStats(stats) { return moveSpeedForStats(stats); }

  getSearchPowerForStats(stats, level = 1) { return searchPowerForStats(stats, level); }

  getMaxHpForStats(stats, level, className, constitutionLoss = 0, hpBase = 0) { return maxHpForStats(stats, level, className, constitutionLoss, hpBase); }

  getMaxManaForStats(stats, className, bonusMana = 0, manaBase = 0) { return maxManaForStats(stats, className, bonusMana, manaBase); }

  getPlayerRaceTemplate(player) { return playerRaceTemplate(player); }

  getPlayerClassTemplate(player) { return playerClassTemplate(player); }

  getPlayerHpBase(player) { return playerHpBase(player); }

  getPlayerManaBase(player) { return playerManaBase(player); }

  getLevelProgress(player = this.player) { return levelProgress(player); }

  getEquipmentStatBonuses(actor = this.player) { return equipmentStatBonuses(actor); }

  getActorStats(actor = this.player) { return actorStats(actor); }

  isPlayerDead() {
    return Boolean(this.player && this.player.hp <= 0);
  }

  canPlayerAct() {
    return Boolean(this.player && this.mode === "game" && !this.transitionPending && !this.isPlayerDead());
  }

  getBurdenUiState(weight = getCarryWeight(this.player), capacity = getCarryCapacity(this.player)) {
    const safeCapacity = Math.max(1, capacity || 1);
    const ratio = weight / safeCapacity;
    let state = "safe";
    let label = "Light load";
    if (ratio > 1) {
      state = "overloaded";
      label = "Overloaded";
    } else if (ratio >= 0.95) {
      state = "danger";
      label = "Near limit";
    } else if (ratio >= 0.8) {
      state = "warning";
      label = "Heavy load";
    }
    return {
      weight,
      capacity: safeCapacity,
      ratio,
      percent: clamp(Math.round(ratio * 100), 0, 130),
      state,
      label
    };
  }

  getBurdenPreview(weightDelta = 0) {
    return this.getBurdenUiState(getCarryWeight(this.player) + weightDelta);
  }

  getDynamicMonsterCap(depth = this.currentDepth) {
    return getDynamicMonsterCap(depth);
  }

  canAddDynamicMonster(count = 1, depth = this.currentDepth) {
    if (!this.currentLevel || depth <= 0) {
      return false;
    }
    return (this.currentLevel.actors?.length || 0) + count <= this.getDynamicMonsterCap(depth);
  }

  summonMonsterNearWithCap(x, y, template) {
    if (!this.canAddDynamicMonster(1)) {
      return false;
    }
    const before = this.currentLevel.actors.length;
    summonMonsterNear(this.currentLevel, x, y, template);
    return this.currentLevel.actors.length > before;
  }

  describeBurdenPreview(weightDelta = 0) {
    if (weightDelta === 0) {
      return {
        text: "Burden unchanged while carried.",
        tone: "value-good"
      };
    }
    const preview = this.getBurdenPreview(weightDelta);
    if (preview.state === "overloaded") {
      return {
        text: `Will overload you at ${preview.weight} / ${preview.capacity}.`,
        tone: "value-bad"
      };
    }
    if (preview.state === "danger") {
      return {
        text: `Will enter danger burden at ${preview.weight} / ${preview.capacity}.`,
        tone: "value-bad"
      };
    }
    if (preview.state === "warning") {
      return {
        text: `Will enter warning burden at ${preview.weight} / ${preview.capacity}.`,
        tone: "value-warning"
      };
    }
    return {
      text: `Burden after change: ${preview.weight} / ${preview.capacity}.`,
      tone: "value-good"
    };
  }

  resetReadState() {
    this.seenMonsters = new Set();
    this.loggedRoomReads = new Set();
    this.focusedThreat = null;
    this.pendingPickupPrompt = null;
  }

  getMonsterIntentLabel(monster) {
    const type = monster?.intent?.type;
    switch (type) {
      case "shoot":
        return "Ranged attack";
      case "summon":
        return "Summoning";
      case "charge":
        return monster.chargeWindup ? "Charging now" : "Charge lane";
      case "hex":
        return "Spellcasting";
      case "retreat":
        return "Retreating";
      case "advance":
        return "Closing in";
      case "melee":
        return "Melee";
      case "sleep":
        return "Sleeping";
      default:
        return "Watching";
    }
  }

  getMonsterRoleLabel(monster) {
    if (!monster) {
      return "Threat";
    }
    if (monster.abilities && monster.abilities.includes("summon")) {
      return "Summoner";
    }
    if (monster.ranged) {
      return "Ranged";
    }
    if (monster.abilities && monster.abilities.includes("charge")) {
      return "Charger";
    }
    if (monster.tactic === "skirmish" || monster.tactic === "phase") {
      return "Skirmisher";
    }
    if (monster.tactic === "pack" || monster.tactic === "press" || monster.tactic === "line") {
      return "Melee";
    }
    return "Threat";
  }

  getSortedVisibleEnemies() {
    const visible = this.visibleEnemies();
    visible.sort((a, b) => {
      const score = (monster) => {
        const roleWeight = monster.abilities?.includes("summon")
          ? 5
          : monster.ranged
            ? 4
            : monster.abilities?.includes("charge")
              ? 3
              : 2;
        return roleWeight * 100 - distance(this.player, monster) * 10 + (monster.elite ? 15 : 0);
      };
      return score(b) - score(a);
    });
    return visible;
  }

  getFocusedThreat(visible = this.getSortedVisibleEnemies()) {
    if (this.focusedThreat && visible.includes(this.focusedThreat) && this.focusedThreat.hp > 0) {
      return this.focusedThreat;
    }
    this.focusedThreat = visible[0] || null;
    return this.focusedThreat;
  }

  getPlayerRoomIndex() {
    if (!this.currentLevel?.rooms) {
      return null;
    }
    const index = this.currentLevel.rooms.findIndex((room) =>
      this.player.x >= room.x &&
      this.player.x < room.x + room.w &&
      this.player.y >= room.y &&
      this.player.y < room.y + room.h
    );
    return index >= 0 ? index : null;
  }

  getVisibleLootItems() {
    if (!this.currentLevel) {
      return [];
    }
    return this.currentLevel.items.filter((item) => isVisible(this.currentLevel, item.x, item.y));
  }

  getUnderfootLoot() {
    if (!this.currentLevel || !this.player) {
      return [];
    }
    return itemsAt(this.currentLevel, this.player.x, this.player.y);
  }

  describeFeatureTile(tile) {
    if (!tile) {
      return "";
    }
    if (tile.discoveryId) {
      const discovery = this.getDiscoveryDef(tile.discoveryId);
      return discovery ? discovery.label : "Discovery";
    }
    if (tile.objectiveId) {
      const objective = OBJECTIVE_DEFS[tile.objectiveId];
      return objective ? objective.shortLabel : "Objective";
    }
    if (tile.optionalId) {
      return tile.label || "Temptation";
    }
    if (tile.kind === "fountain") {
      return "Fountain";
    }
    if (tile.kind === "throne") {
      return "Throne";
    }
    if (tile.kind === "altar") {
      return tile.featureEffect ? "Shrine" : "Altar";
    }
    if (tile.kind === "stairDown") {
      return "Stairs down";
    }
    if (tile.kind === "stairUp") {
      return "Stairs up";
    }
    return "";
  }

  formatNamedCounts(entries) {
    const counts = new Map();
    entries.forEach((label) => {
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return [...counts.entries()].map(([label, count]) => count > 1 ? `${count}x ${label}` : label).join(", ");
  }

  describeItemReadout(item) {
    if (!item) {
      return "";
    }
    if (item.kind === "gold") {
      return `${item.amount} gold`;
    }
    const category = item.slot ? this.getPackSlotDefinition(item.slot).label : classifyItem(item);
    const details = [];
    if (item.weight) {
      details.push(`wt ${item.weight}`);
    }
    return `${getItemName(item)} (${category}${details.length > 0 ? `, ${details.join(", ")}` : ""})`;
  }

  summarizeLoot(items, limit = 3) {
    if (!items || items.length === 0) {
      return "No loot";
    }
    const visibleItems = items.slice(0, limit).map((item) => this.describeItemReadout(item));
    const extra = items.length > limit ? ` +${items.length - limit} more` : "";
    return `${visibleItems.join(", ")}${extra}`;
  }

  getActionDockModel() {
    return this.getAdvisorModel().dockSlots || [];
  }

  getControllerContextAction() {
    if (!this.player || !this.currentLevel) {
      return null;
    }
    const tile = getTile(this.currentLevel, this.player.x, this.player.y);
    const directive = typeof this.getLoopDirective === "function" ? this.getLoopDirective(tile) : null;
    const recommendedActionId = directive?.recommendedActionId || "";
    const lootHere = itemsAt(this.currentLevel, this.player.x, this.player.y);
    if (lootHere.length > 0) {
      return {
        action: "pickup",
        label: "Pick Up",
        note: lootHere.length === 1
          ? this.describeItemReadout(lootHere[0])
          : `${lootHere.length} items underfoot`
      };
    }
    if (this.currentDepth === 0 && tile?.kind === "buildingDoor" && tile.service) {
      return {
        action: "open-town-service",
        service: tile.service,
        label: "Open",
        note: `Open ${SHOPS[tile.service]?.name || tile.label || "town service"}`
      };
    }
    if (tile?.kind === "stairUp" && this.currentDepth > 0 && recommendedActionId === "stairs-up") {
      return {
        action: "stairs-up",
        label: "Ascend",
        note: "Leave the floor"
      };
    }
    if (tile?.kind === "stairDown" && this.currentDepth > 0 && recommendedActionId === "stairs-down") {
      return {
        action: "stairs-down",
        label: "Descend",
        note: "Go deeper"
      };
    }
    if (recommendedActionId === "search") {
      return {
        action: "search",
        label: "Search",
        note: directive?.routeCueText || directive?.supportText || "Reveal more of the route"
      };
    }
    if (tile && (
      tile.objectiveId
      || tile.optionalId
      || tile.discoveryId
      || tile.roomEventId
      || tile.kind === "altar"
      || tile.kind === "fountain"
      || tile.kind === "throne"
    )) {
      const prompt = this.getTileActionPrompt(tile);
      return {
        action: "interact",
        label: prompt?.label || "Use",
        note: prompt?.detail || "Resolve the current tile"
      };
    }
    return null;
  }

  getControllerPrimaryDockAction(candidates = []) {
    const contextAction = this.getControllerContextAction();
    if (contextAction) {
      return contextAction;
    }
    return candidates[0] || {
      action: "open-utility-menu",
      label: "Menu",
      note: "Save, settings, and help"
    };
  }

  getDesktopVerbEntries() {
    const activeRun = Boolean(this.player && this.currentLevel && this.mode !== "title" && this.mode !== "creation");
    const fallbackSlots = [
      { key: "primary", prompt: "A", label: "Act", note: "No active run", action: "", tone: "primary" },
      { key: "secondary", prompt: "X", label: "Survey", note: "No active run", action: "", tone: "secondary" },
      { key: "back", prompt: "B", label: "Back", note: "No active run", action: "", tone: "secondary" },
      { key: "pack", prompt: "Y", label: "Pack", note: "No active run", action: "", tone: "utility" }
    ];
    const sourceSlots = activeRun ? this.getActionDockModel().slice(0, 4) : fallbackSlots;
    return sourceSlots.map((slot, index) => {
      const key = slot.key || ["primary", "secondary", "back", "pack"][index] || `slot-${index}`;
      let action = slot.action || "";
      let tab = slot.tab || "";
      let note = slot.note || "";
      if (action === "open-spell-tray") {
        action = "open-hub";
        tab = "magic";
        note = "Open spell desk";
      } else if (action === "map-focus") {
        action = "toggle-map";
        note = this.mapDrawerOpen ? "Hide survey" : "Show survey";
      } else if (key === "back") {
        action = "controller-back";
        note = this.mode === "target"
          ? "Cancel targeting"
          : this.mode === "modal"
            ? "Close menus"
            : this.mapDrawerOpen
              ? "Hide survey"
              : "Cancel targeting or close menus";
      }
      if (action === "pickup") {
        note = note || "Claim the item";
      }
      return {
        ...slot,
        action,
        tab,
        note,
        focusKey: `desktop:verb:${key}`,
        disabled: !activeRun || !action,
        active: action === "toggle-map" && this.mapDrawerOpen
      };
    });
  }

  getDesktopVerbMarkup() {
    return this.getDesktopVerbEntries().map((entry) => {
      const classes = [
        "desktop-verb-button",
        entry.active ? "active" : "",
        entry.tone === "primary" ? "desktop-context-verb" : ""
      ].filter(Boolean).join(" ");
      const serviceAttribute = entry.service ? ` data-service="${escapeHtml(entry.service)}"` : "";
      const tabAttribute = entry.tab ? ` data-tab="${escapeHtml(entry.tab)}"` : "";
      return `
        <button class="${classes}" data-action="${escapeHtml(entry.action || "")}" data-focus-key="${escapeHtml(entry.focusKey)}" type="button"${serviceAttribute}${tabAttribute}${entry.disabled ? " disabled" : ""}>
          <span class="desktop-verb-head">
            <span class="desktop-verb-prompt">${escapeHtml(entry.prompt || "")}</span>
            <span class="desktop-verb-label">${escapeHtml(entry.label)}</span>
          </span>
        </button>
      `;
    }).join("");
  }

  getSpellIconMeta(spellOrId) {
    const spell = typeof spellOrId === "string" ? SPELLS[spellOrId] : spellOrId;
    const fallback = { symbol: "✦", label: "Spell" };
    if (!spell) {
      return { iconKey: "spark", ...fallback };
    }
    const iconKey = spell.iconKey || "spark";
    const iconMeta = SPELL_ICON_SYMBOLS[iconKey] || fallback;
    return {
      iconKey,
      symbol: iconMeta.symbol,
      label: iconMeta.label
    };
  }

  getDesktopQuickslotMarkup() {
    if (!this.player) {
      return "";
    }
    const limit = this.getSpellTrayLimit();
    const pinnedSpellIds = this.getPinnedSpellIds().slice(0, limit);
    const selectedSpellId = this.targetMode?.spellId || this.pendingSpell || pinnedSpellIds[0] || "";
    const slots = pinnedSpellIds.map((spellId, index) => {
      const spell = SPELLS[spellId];
      if (!spell) {
        return "";
      }
      const iconMeta = this.getSpellIconMeta(spell);
      const manaCost = getSpellCost(this, spell);
      const overcast = this.player.mana < manaCost;
      return `
        <button class="desktop-quickslot${selectedSpellId === spellId ? " active" : ""}${overcast ? " warning" : ""}" data-action="spell-cast" data-spell="${spellId}" data-focus-key="desktop:spell:${spellId}" type="button" aria-label="Cast ${escapeHtml(spell.name)}" title="${escapeHtml(`${spell.name} · ${manaCost} mana`)}">
          <span class="desktop-quickslot-symbol" aria-hidden="true" title="${escapeHtml(iconMeta.label)}">${escapeHtml(iconMeta.symbol)}</span>
          <span class="desktop-quickslot-cost">${manaCost}</span>
        </button>
      `;
    }).join("");
    const emptyCount = Math.max(0, limit - pinnedSpellIds.length);
    const emptySlots = Array.from({ length: emptyCount }, (_, index) => `
      <div class="desktop-quickslot desktop-quickslot-empty" aria-hidden="true">
        <span class="desktop-quickslot-symbol" aria-hidden="true"></span>
      </div>
    `).join("");
    const bookButton = `
      <button class="desktop-quickslot desktop-quickslot-open" data-action="open-hub" data-tab="magic" data-focus-key="desktop:spell:book" type="button">
        <span class="desktop-quickslot-name">Magic</span>
      </button>
    `;
    return `${slots}${emptySlots}${bookButton}`;
  }

  renderDesktopShell() {
    if (
      !(this.desktopOverlay instanceof HTMLElement)
      || !(this.desktopVerbHost instanceof HTMLElement)
      || !(this.desktopQuickslotsHost instanceof HTMLElement)
      || !(this.desktopStatusHost instanceof HTMLElement)
      || !(this.desktopOverlayMapHost instanceof HTMLElement)
      || !(this.desktopAuxStack instanceof HTMLElement)
    ) {
      return;
    }
    const activeRun = Boolean(this.layoutMode === "desktop" && this.player && this.currentLevel);
    this.desktopOverlay.classList.toggle("hidden", !activeRun);
    this.desktopAuxStack.classList.toggle("hidden", !activeRun);
    if (!activeRun) {
      this.desktopVerbHost.innerHTML = "";
      this.desktopQuickslotsHost.innerHTML = "";
      this.lastDesktopVerbMarkup = "";
      this.lastDesktopQuickslotsMarkup = "";
      this.desktopOverlayMapHost.classList.add("hidden");
      this.desktopStatusHost.classList.add("hidden");
      return;
    }
    const menuButtons = Array.from(this.desktopOverlay.querySelectorAll(".desktop-shell-menu-row button"));
    menuButtons.forEach((button) => {
      button.disabled = !this.player;
    });
    const verbMarkup = this.getDesktopVerbMarkup();
    if (this.lastDesktopVerbMarkup !== verbMarkup) {
      this.desktopVerbHost.innerHTML = verbMarkup;
      this.lastDesktopVerbMarkup = verbMarkup;
    }
    const quickslotMarkup = this.getDesktopQuickslotMarkup();
    if (this.lastDesktopQuickslotsMarkup !== quickslotMarkup) {
      this.desktopQuickslotsHost.innerHTML = quickslotMarkup;
      this.lastDesktopQuickslotsMarkup = quickslotMarkup;
    }
    this.desktopStatusHost.classList.remove("hidden");
    const showMapPanel = this.mapDrawerOpen && Boolean(this.player);
    this.desktopOverlayMapHost.classList.toggle("hidden", !showMapPanel);
  }

  handleControllerBackAction() {
    this.resetMovementCadence({ clearHeld: false });
    if (this.mode === "target") {
      this.cancelTargetMode();
      return true;
    }
    if (this.pendingPickupPrompt) {
      this.cancelPendingPickup();
      return true;
    }
    if (this.spellTrayOpen) {
      this.closeSpellTray();
      return true;
    }
    if (this.mode === "modal" || this.mode === "creation") {
      this.closeModal();
      this.render();
      return true;
    }
    if (this.mapDrawerOpen && this.layoutMode !== "desktop") {
      this.mapDrawerOpen = false;
      this.refreshChrome();
      return true;
    }
    return false;
  }

  triggerDockSlot(key) {
    if (key === "back") {
      this.handleControllerBackAction();
      return;
    }
    if (!this.player) {
      return;
    }
    const slot = this.getActionDockModel().find((entry) => entry.key === key);
    if (!slot || !slot.action) {
      return;
    }
    this.handleAction(slot.action, {
      dataset: {
        action: slot.action,
        tab: slot.tab || "",
        service: slot.service || ""
      }
    });
  }

  buildMonsterDiscoveryMessage(monsters) {
    if (!monsters || monsters.length === 0) {
      return "";
    }
    return `You see ${this.formatNamedCounts(monsters.map((monster) => monster.name))}.`;
  }

  buildRoomReadMessage(roomIndex) {
    if (roomIndex === null || !this.currentLevel?.rooms || !this.currentLevel.rooms[roomIndex]) {
      return "";
    }
    const room = this.currentLevel.rooms[roomIndex];
    const monsters = this.getSortedVisibleEnemies().filter((monster) => monster.roomIndex === roomIndex);
    const loot = this.getVisibleLootItems().filter((item) =>
      item.x >= room.x &&
      item.x < room.x + room.w &&
      item.y >= room.y &&
      item.y < room.y + room.h
    );
    const features = [];
    for (let y = room.y; y < room.y + room.h; y += 1) {
      for (let x = room.x; x < room.x + room.w; x += 1) {
        if (!isVisible(this.currentLevel, x, y)) {
          continue;
        }
        const label = this.describeFeatureTile(getTile(this.currentLevel, x, y));
        if (label && !features.includes(label)) {
          features.push(label);
        }
      }
    }
    const parts = [];
    if (monsters.length > 0) {
      parts.push(`Hostiles: ${this.formatNamedCounts(monsters.map((monster) => monster.name))}`);
    }
    if (loot.length > 0) {
      parts.push(`Loot: ${this.summarizeLoot(loot, 2)}`);
    }
    if (features.length > 0) {
      parts.push(`Feature: ${features.join(", ")}`);
    }
    if (this.currentLevel?.milestone?.roomIndex === roomIndex && this.currentLevel.milestone.status !== "cleared") {
      parts.push(`Milestone: ${this.currentLevel.milestone.name}`);
    }
    const discoveries = (this.currentLevel?.discoveries || []).filter((entry) => entry.roomIndex === roomIndex);
    if (discoveries.length > 0) {
      parts.push(`Discovery: ${discoveries.map((entry) => entry.label).join(", ")}`);
    }
    return parts.length > 0 ? `Room opens. ${parts.join(". ")}.` : "";
  }

  processDiscoveryEvents() {
    if (!this.player || !this.currentLevel) {
      return;
    }
    const visible = this.getSortedVisibleEnemies();
    const newlySeen = visible.filter((monster) => !this.seenMonsters.has(monster));
    newlySeen.forEach((monster) => this.seenMonsters.add(monster));
    if (newlySeen.length > 0) {
      this.log(this.buildMonsterDiscoveryMessage(newlySeen), "warning");
    }

    const roomIndex = this.getPlayerRoomIndex();
    if (roomIndex !== null) {
      const roomKey = `${this.currentDepth}:${roomIndex}`;
      if (!this.loggedRoomReads.has(roomKey)) {
        const summary = this.buildRoomReadMessage(roomIndex);
        if (summary) {
          this.log(summary, "warning");
        }
        this.loggedRoomReads.add(roomKey);
      }
    }

    this.getFocusedThreat(visible);
  }

  shouldPromptForPickup(item) {
    if (!item || item.kind === "gold" || !this.player) {
      return false;
    }
    if (this.isQuickHandsUtilityPickup(item)) {
      return false;
    }
    const capacity = getCarryCapacity(this.player);
    const beforeWeight = getCarryWeight(this.player);
    const itemWeight = item.weight || 0;
    const afterWeight = beforeWeight + itemWeight;
    if (afterWeight > capacity) {
      return true;
    }
    return beforeWeight > capacity && itemWeight >= 5;
  }

  isQuickHandsUtilityPickup(item) {
    if (!item || !this.player?.perks?.includes("quick_hands")) {
      return false;
    }
    if (item.kind === "gold" || item.kind === "consumable" || item.kind === "spellbook") {
      return true;
    }
    return !item.slot && (item.weight || 0) <= 1;
  }

  setModalVisibility(isOpen) {
    if (this.appShell) {
      this.appShell.classList.toggle("modal-open", isOpen);
    }
  }

  setInputSource(source = "pointer") {
    if (!source || this.lastInputSource === source) {
      return;
    }
    this.lastInputSource = source;
    const controllerActive = source === "gamepad";
    if (this.appShell) {
      this.appShell.classList.toggle("controller-active", controllerActive);
    }
    document.documentElement.classList.toggle("controller-active", controllerActive);
  }

  getSpellTrayLimit() { return spellTrayLimit(); }

  syncPlayerSpellTray(player = this.player) { return syncSpellTray(this, player); }

  getPinnedSpellIds(player = this.player) { return getPinnedSpells(this, player); }

  getSpellBookFocusKey(spellId) {
    return `hub:spell:${spellId}`;
  }

  getSpellCastFocusKey(spellId, surface = "hub") {
    return `${surface}:spell-cast:${spellId}`;
  }

  getMagicFilterFocusKey(filter) {
    return `magic:filter:${filter}`;
  }

  getSpellLearnFilterFocusKey(filter) {
    return `spell-learn:filter:${filter}`;
  }

  getSpellFilterDefs() { return spellFilterDefs(); }

  getSpellFilterDefsForEntries(entries = [], pinnedSpellIds = this.getPinnedSpellIds()) {
    const keys = new Set(entries.map((entry) => getSpellCategoryKey(entry)).filter(Boolean));
    const filters = [{ key: "all", label: "All" }];
    if ((pinnedSpellIds || []).length > 0) {
      filters.push({ key: "tray", label: "Spell Tray" });
    }
    filters.push(
      ...getSpellCategoryDefs()
        .filter((entry) => keys.has(entry.key))
        .map((entry) => ({ key: entry.key, label: entry.label }))
    );
    return filters;
  }

  getMagicSpellListState(filter = this.activeMagicFilter, spellIds = this.player?.spellsKnown || []) {
    const sortedSpellIds = this.getSortedKnownSpellIds(spellIds);
    const pinnedSpellIds = this.getPinnedSpellIds();
    const filterDefs = this.getSpellFilterDefsForEntries(
      sortedSpellIds.map((spellId) => SPELLS[spellId]).filter(Boolean),
      pinnedSpellIds
    );
    const activeFilter = filterDefs.some((entry) => entry.key === filter) ? filter : "all";
    const visibleSpellIds = sortedSpellIds.filter((spellId) => {
      if (activeFilter === "all") {
        return true;
      }
      if (activeFilter === "tray") {
        return pinnedSpellIds.includes(spellId);
      }
      return getSpellCategoryKey(SPELLS[spellId]) === activeFilter;
    });
    return {
      sortedSpellIds,
      pinnedSpellIds,
      filterDefs,
      activeFilter,
      visibleSpellIds
    };
  }

  getMagicSelectedSpellId(state = this.getMagicSpellListState()) {
    const preferredSpellId = this.targetMode?.spellId || this.pendingSpell || "";
    if (preferredSpellId && state.visibleSpellIds.includes(preferredSpellId)) {
      return preferredSpellId;
    }
    const pinnedSpellId = this.getPinnedSpellIds().find((spellId) => state.visibleSpellIds.includes(spellId));
    return pinnedSpellId || state.visibleSpellIds[0] || state.sortedSpellIds[0] || preferredSpellId || "";
  }

  getSpellFilterChipsMarkup(currentFilter = "all", actionName = "magic-filter", focusKeyGetter = (key) => key, rowClass = "magic-filter-row", filterDefs = this.getSpellFilterDefs()) {
    return `
      <div class="pack-filter-row ${rowClass}">
        ${filterDefs.map((filterDef) => `
          <button class="hub-filter-chip${currentFilter === filterDef.key ? " active" : ""}" data-action="${actionName}" data-filter="${filterDef.key}" data-focus-key="${focusKeyGetter(filterDef.key)}" type="button">${escapeHtml(filterDef.label)}</button>
        `).join("")}
      </div>
    `;
  }

  getSpellTrayToggleFocusKey() {
    return "top:spell-tray";
  }

  getSpellTraySelectionId() {
    const pinned = this.getPinnedSpellIds();
    if (this.targetMode?.type === "spell" && this.targetMode.spellId) {
      return this.targetMode.spellId;
    }
    if (this.pendingSpell && pinned.includes(this.pendingSpell)) {
      return this.pendingSpell;
    }
    return pinned[0] || this.player?.spellsKnown?.[0] || "";
  }

  getSortedKnownSpellIds(spellIds = this.player?.spellsKnown || []) {
    return [...new Set((spellIds || []).filter((spellId) => Boolean(SPELLS[spellId])))]
      .sort((leftId, rightId) => {
        const left = SPELLS[leftId];
        const right = SPELLS[rightId];
        const roleCompare = this.getSpellRoleLabel(left).localeCompare(this.getSpellRoleLabel(right));
        if (roleCompare) {
          return roleCompare;
        }
        const schoolCompare = String(left.school || "spell").localeCompare(String(right.school || "spell"));
        if (schoolCompare) {
          return schoolCompare;
        }
        const tierCompare = (left.tier || 1) - (right.tier || 1);
        if (tierCompare) {
          return tierCompare;
        }
        return left.name.localeCompare(right.name);
      });
  }

  addSpellToTrayIfSpace(spellId, player = this.player) { return addSpellToTray(this, player, spellId); }

  refreshMagicHub(focusTarget = null) {
    if (this.mode === "modal" && this.activeHubTab === "magic") {
      this.refreshMagicHubContent(focusTarget || this.getSpellBookFocusKey(this.pendingSpell || this.player?.spellsKnown?.[0] || ""), {
        preserveScroll: true,
        fallbackFocus: true,
        sections: ["summary", "list", "result"]
      });
      return;
    }
    this.refreshChrome();
    this.render();
  }

  getMagicCardStatusText(spellId, selectedSpellId = this.targetMode?.spellId || this.pendingSpell || this.getPinnedSpellIds()[0] || this.player?.spellsKnown?.[0] || "") {
    const pinnedSpellIds = this.getPinnedSpellIds();
    const pinnedIndex = pinnedSpellIds.indexOf(spellId);
    const pinLabel = pinnedIndex >= 0 ? `Tray ${pinnedIndex + 1}` : "Book";
    return selectedSpellId === spellId ? `${pinLabel} selected` : pinLabel;
  }

  syncMagicSelectedSpellState(previousSpellId, nextSpellId, options = {}) {
    const {
      preserveScroll = true,
      focusTarget = null,
      fallbackFocus = true
    } = options;
    const currentSurfaceKey = this.modalSurfaceKey;
    if (this.mode !== "modal" || this.activeHubTab !== "magic" || !String(currentSurfaceKey || "").startsWith("hub:")) {
      return false;
    }
    const paneHost = this.getHubPaneHost("magic");
    if (!(paneHost instanceof HTMLElement)) {
      return false;
    }
    const spellIds = [...new Set([previousSpellId, nextSpellId].filter((spellId) => typeof spellId === "string" && spellId.length > 0))];
    if (spellIds.length === 0) {
      return false;
    }
    const previousState = preserveScroll ? this.captureModalRefreshState(currentSurfaceKey) : null;
    let changed = false;
    spellIds.forEach((spellId) => {
      const card = paneHost.querySelector(`[data-spell-card="${spellId}"]`);
      const status = paneHost.querySelector(`[data-spell-status="${spellId}"]`);
      if (card instanceof HTMLElement) {
        card.classList.toggle("active", spellId === nextSpellId);
        changed = true;
      }
      if (status instanceof HTMLElement) {
        status.textContent = this.getMagicCardStatusText(spellId, nextSpellId);
        changed = true;
      }
    });
    if (!changed) {
      return false;
    }
    this.applyControllerNavigationMetadata();
    this.restoreModalRefreshState(previousState, focusTarget, fallbackFocus);
    return true;
  }

  selectSpell(spellId, options = {}) { return selectSpellFn(this, spellId, options); }

  pinSpellToTray(spellId) { return pinSpellFn(this, spellId); }

  unpinSpellFromTray(spellId) { return unpinSpellFn(this, spellId); }

  moveTraySpell(spellId, direction = 0) { return moveTraySpellFn(this, spellId, direction); }

  getLearnableSpellOptions() { return getLearnableSpells(this); }

  getReducedMotionActive() {
    return Boolean(this.settings.reducedMotionEnabled || (this.reducedMotionQuery && this.reducedMotionQuery.matches));
  }

  getEffectProfile() {
    return {
      intensity: this.settings.effectIntensity || "standard",
      reducedMotion: this.getReducedMotionActive()
    };
  }

  setBoardImpulse(dx, dy, strength = 1, duration = 70) {
    const profile = this.getEffectProfile();
    if (profile.reducedMotion || profile.intensity === "minimal") {
      return;
    }
    this.boardImpulse = {
      dx: clamp(dx, -1, 1) * strength,
      dy: clamp(dy, -1, 1) * strength,
      created: nowTime(),
      until: nowTime() + duration
    };
    this.startRuntimeLoop();
  }

  flashTile(x, y, color, duration = 180, extra = {}) {
    this.addEffect({ type: "tileFlash", x, y, color, duration, ...extra });
  }

  pulseScreen(color, duration = 180, alpha = 0.16) {
    this.addEffect({ type: "screenPulse", color, alpha, duration });
  }

  emitCastCircle(x, y, color) {
    this.addEffect({ type: "castCircle", x, y, color, duration: 220 });
  }

  emitCastFlare(x, y, color, style = "arcane") {
    this.addEffect({ type: "castFlare", x, y, color, style, duration: 220, decorative: true });
  }

  emitTelegraphPulse(x, y, color, duration = 260) {
    this.addEffect({ type: "telegraphPulse", x, y, color, duration });
  }

  emitReadout(text, x, y, color = "#f4edd7", duration = 420) {
    this.addEffect({ type: "floatingText", text, x, y, color, duration });
  }

  emitImpact(attacker, defender, color, damageType = "physical") {
    if (!defender || typeof defender.x !== "number" || typeof defender.y !== "number") {
      return;
    }
    this.addEffect({ type: "impactSpark", x: defender.x, y: defender.y, color, duration: 170, rays: damageType === "magic" ? 7 : 6 });
    this.flashTile(defender.x, defender.y, color, 160, { alpha: 0.24 });
    if (attacker && typeof attacker.x === "number" && typeof attacker.y === "number") {
      this.setBoardImpulse(defender.x - attacker.x, defender.y - attacker.y, 1.2, 75);
    }
  }

  emitDeathBurst(x, y, color) {
    this.addEffect({ type: "deathBurst", x, y, color, duration: 240 });
  }

  emitSpellBurst(x, y, color, radius = 1, style = "arcane") {
    this.addEffect({
      type: "spellBurst",
      x,
      y,
      color,
      radius,
      style,
      duration: this.getReducedMotionActive() ? 150 : 240,
      decorative: true
    });
  }

  getSpellTargetingMode(spell) { return getSpellTargetMode(spell); }

  getSpellRoleLabel(spell) { return getSpellRole(spell); }

  getSpellMechanicalReadout(spell) {
    if (!spell) {
      return "";
    }
    switch (spell.id) {
      case "magicMissile":
        return "Deals 2d4 + INT/3 arcane damage.";
      case "healMinor":
        return "Heals 2d5 + INT/4 HP, minimum 4.";
      case "frostBolt":
        return "Deals 2d6 + INT/2 cold damage with a 35% chance to slow for 2 turns.";
      case "fireball":
        return "Deals 3d6 + INT/2 fire damage in a 3x3 blast.";
      case "phaseDoor":
        return "Blinks to a safe tile inside the current fight.";
      case "clairvoyance":
        return "Reveals 40 patches of the floor and nearby secrets.";
      case "identify":
        return "Identifies your inventory and equipped gear.";
      case "slowMonster":
        return "Slows one target for 5 turns.";
      case "removeCurse":
        return "Removes curses from equipped gear and inventory.";
      case "runeOfReturn":
        return "Returns to town, or from town back to your deepest explored floor.";
      case "lightningBolt":
        return "Deals 3d5 + INT/2 magic damage to one target.";
      case "holdMonster":
        return "Holds one target for 2 turns, then slows it for 4 turns.";
      case "cureSerious":
        return "Heals 4d5 + INT/3 HP, minimum 8.";
      case "stoneSkin":
        return "Grants +4 armor for 18 turns.";
      case "shield":
        return "Grants +2 ward for 16 turns.";
      case "resistFire":
        return "Grants +2 fire resist for 30 turns.";
      case "resistCold":
        return "Grants +2 cold resist for 30 turns.";
      case "teleport":
        return "Teleports to a safer tile elsewhere on the current floor.";
      case "light":
        return "Grants +2 sight for 40 turns and reveals hidden threats within 6 tiles.";
      case "detectTraps":
        return "Reveals traps and secret doors in a 21x21 area around you.";
      default:
        return "";
    }
  }

  getSpellCardCopy(spell) {
    if (!spell) {
      return "";
    }
    const readout = this.getSpellMechanicalReadout(spell);
    if (!readout || readout === spell.description) {
      return spell.description || "";
    }
    return `${spell.description} ${readout}`;
  }

  getSpellUnlockTimingText(spell) {
    const learnLevel = spell?.learnLevel || 1;
    return learnLevel === this.player?.level
      ? `New at Lv ${learnLevel}`
      : `Available since Lv ${learnLevel}`;
  }

  getSpellUiTargetingLabel(spell) {
    switch (this.getSpellTargetingMode(spell)) {
      case "self":
        return "Self";
      case "blast":
        return `Blast ${((spell?.blastRadius || 0) * 2) + 1}x${((spell?.blastRadius || 0) * 2) + 1}`;
      default:
        return `Single target | Range ${spell?.range || 1}`;
    }
  }

  getSpellTargetingLabel(spell) { return getSpellTargetLabel(spell); }

  getSpellProjectileStyle(spell) { return getSpellProjStyle(spell); }

  resolveSpellTargetPreview(spellOrId, point = null) { return resolveSpellPreview(this, spellOrId, point); }

  getActiveSpellTargetPreview() { return getSpellPreview(this); }

  getDamageEffectColor(damageType, defender) { return getDmgColor(damageType, defender); }

  hasAnimatedFeatureTileInView() {
    if (!this.player || !this.currentLevel) {
      return false;
    }
    const view = this.getViewport();
    for (let sy = 0; sy < VIEW_SIZE; sy += 1) {
      for (let sx = 0; sx < VIEW_SIZE; sx += 1) {
        const x = view.x + sx;
        const y = view.y + sy;
        if (!isVisible(this.currentLevel, x, y)) {
          continue;
        }
        const tile = getTile(this.currentLevel, x, y);
        if (tile && ["fountain", "throne", "altar", "stairDown", "stairUp"].includes(tile.kind)) {
          return true;
        }
      }
    }
    return false;
  }

  shouldAnimateBoard() {
    if (!this.player || !this.currentLevel || (this.mode !== "game" && this.mode !== "target")) {
      return false;
    }
    if (this.visualEffects.length > 0) {
      return true;
    }
    if (this.boardImpulse && this.boardImpulse.until > nowTime()) {
      return true;
    }
    if (this.targetMode) {
      return true;
    }
    const profile = this.getEffectProfile();
    const hpRatio = this.player.maxHp > 0 ? this.player.hp / this.player.maxHp : 1;
    const burdenRatio = getCarryWeight(this.player) / Math.max(1, getCarryCapacity(this.player));
    if (hpRatio < 0.42) {
      return true;
    }
    if (burdenRatio >= 0.95) {
      return true;
    }
    if (!profile.reducedMotion && this.hasAnimatedFeatureTileInView()) {
      return true;
    }
    return this.visibleEnemies().some((monster) => monster.intent && ["shoot", "charge", "summon"].includes(monster.intent.type));
  }

  handleClick(event) {
    const moveButton = event.target.closest("[data-move]");
    if (moveButton) {
      if ((this.movementCadence?.ignoreMoveClickUntil || 0) > nowTime()) {
        this.movementCadence.ignoreMoveClickUntil = 0;
        event.preventDefault();
        return;
      }
      if (!this.canPlayerAct()) {
        return;
      }
      event.preventDefault();
      const [dx, dy] = moveButton.dataset.move.split(",").map(Number);
      this.handleMovementIntent(dx, dy);
      return;
    }

    const action = event.target.closest("[data-action]");
    if (action) {
      if (event.target instanceof HTMLInputElement && event.target.type === "checkbox") {
        return;
      }
      event.preventDefault();
      if (event.detail === 0) {
        this.flashUiInteractionTarget(action);
      }
      this.handleAction(action.dataset.action, action);
      return;
    }

    const raceChoice = event.target.closest("[data-race]");
    if (raceChoice) {
      if (event.detail === 0) {
        this.flashUiInteractionTarget(raceChoice);
      }
      this.captureCreationDraft();
      this.selectedRace = raceChoice.dataset.race;
      this.showCreationModal({
        preserveScroll: true,
        focusTarget: `creation:race:${raceChoice.dataset.race}`
      });
      return;
    }

    const classChoice = event.target.closest("[data-class]");
    if (classChoice) {
      if (event.detail === 0) {
        this.flashUiInteractionTarget(classChoice);
      }
      this.captureCreationDraft();
      this.selectedClass = classChoice.dataset.class;
      this.showCreationModal({
        preserveScroll: true,
        focusTarget: `creation:class:${classChoice.dataset.class}`
      });
      return;
    }

    if (
      this.spellTrayOpen
      && this.mode === "game"
      && !event.target.closest("#spell-tray")
      && !event.target.closest("#spell-tray-toggle-button")
      && !event.target.closest("#game-canvas")
    ) {
      this.closeSpellTray();
    }
  }

  handleDoubleClick(event) {
    const action = event.target.closest("[data-double-action]");
    if (!action) {
      return;
    }
    event.preventDefault();
    this.handleAction(action.dataset.doubleAction, action);
  }

  handleChange(event) {
    const action = event.target.closest("[data-action]");
    if (!action) {
      return;
    }
    this.handleAction(action.dataset.action, action);
  }

  handlePreviewPointer(event) {
    this.lastPreviewKey = event.target.closest("[data-preview-key]")?.dataset?.previewKey || this.lastPreviewKey;
    this.syncPackHoverPreview(event.target, { allowKeyboard: false });
    this.syncShopHoverPreview(event.target, { allowKeyboard: false });
  }

  handlePreviewFocus(event) {
    this.lastPreviewKey = event.target.closest("[data-preview-key]")?.dataset?.previewKey || this.lastPreviewKey;
    this.syncPackHoverPreview(event.target, { allowKeyboard: true });
    this.syncShopHoverPreview(event.target, { allowKeyboard: true });
  }

  canUsePackHoverPreview({ allowKeyboard = false } = {}) {
    if (this.mode !== "modal" || this.activeHubTab !== "pack" || this.layoutMode !== "desktop") {
      return false;
    }
    const finePointer = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(pointer:fine)").matches
      : false;
    if (!finePointer) {
      return false;
    }
    return allowKeyboard ? this.lastInputSource === "keyboard" : this.lastInputSource === "pointer";
  }

  getPackHoverSelectionFromTarget(target) {
    if (!(target instanceof HTMLElement)) {
      return null;
    }
    const previewNode = target.closest("[data-pack-preview-type]");
    if (!previewNode) {
      return null;
    }
    if (previewNode.dataset.packPreviewType === "slot") {
      return previewNode.dataset.packPreviewValue
        ? { type: "slot", value: previewNode.dataset.packPreviewValue }
        : null;
    }
    const index = Number(previewNode.dataset.packPreviewValue);
    return Number.isFinite(index) ? { type: "inventory", value: index } : null;
  }

  isSamePackSelection(left, right) {
    return Boolean(left && right && left.type === right.type && left.value === right.value);
  }

  refreshPackInspectorPreview() {
    if (this.mode !== "modal" || this.activeHubTab !== "pack") {
      return;
    }
    const currentInspector = this.modalRoot.querySelector(".pack-inspector-panel");
    if (!currentInspector) {
      return;
    }
    const { model, inventoryModel } = this.buildPackHubViewModel();
    const wrapper = document.createElement("div");
    if (this.shouldUsePackEquipmentLayout(model)) {
      const equipmentModel = this.getPackEquipmentWorkspaceModel(model, inventoryModel);
      wrapper.innerHTML = this.getPackDecisionInspectorMarkup(equipmentModel.compareModel, inventoryModel).trim();
    } else {
      wrapper.innerHTML = this.getPackInspectorMarkup(model, inventoryModel).trim();
    }
    const nextInspector = wrapper.firstElementChild;
    if (nextInspector) {
      currentInspector.replaceWith(nextInspector);
    }
  }

  setHoveredPackSelection(selection) {
    if (!selection) {
      this.clearHoveredPackSelection();
      return;
    }
    const normalized = selection.type === "slot"
      ? { type: "slot", value: selection.value }
      : { type: "inventory", value: Math.max(0, Number(selection.value) || 0) };
    if (this.isSamePackSelection(this.hoveredPackSelection, normalized)) {
      return;
    }
    this.hoveredPackSelection = normalized;
    this.refreshPackInspectorPreview();
  }

  clearHoveredPackSelection() {
    if (!this.hoveredPackSelection) {
      return;
    }
    this.hoveredPackSelection = null;
    this.refreshPackInspectorPreview();
  }

  syncPackHoverPreview(target, { allowKeyboard = false } = {}) {
    if (!this.canUsePackHoverPreview({ allowKeyboard })) {
      this.clearHoveredPackSelection();
      return;
    }
    const selection = this.getPackHoverSelectionFromTarget(target);
    if (selection) {
      this.setHoveredPackSelection(selection);
      return;
    }
    if (target instanceof HTMLElement && target.closest(".hub-window-pack")) {
      this.clearHoveredPackSelection();
    }
  }

  canUseShopHoverPreview({ allowKeyboard = false } = {}) {
    if (this.mode !== "modal" || !String(this.modalSurfaceKey || "").startsWith("shop:") || this.layoutMode !== "desktop") {
      return false;
    }
    const finePointer = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(pointer:fine)").matches
      : false;
    if (!finePointer) {
      return false;
    }
    return allowKeyboard ? this.lastInputSource === "keyboard" : this.lastInputSource === "pointer";
  }

  getShopHoverPreviewFromTarget(target) {
    if (!(target instanceof HTMLElement)) {
      return null;
    }
    const previewNode = target.closest("[data-shop-preview-kind]");
    if (!previewNode) {
      return null;
    }
    const kind = previewNode.dataset.shopPreviewKind || "";
    if (kind === "buy") {
      const value = previewNode.dataset.shopPreviewValue || "";
      return value ? { kind, value } : null;
    }
    const index = Number(previewNode.dataset.shopPreviewValue);
    return Number.isFinite(index) ? { kind: "sell", value: index } : null;
  }

  isSameShopHoverPreview(left, right) {
    return Boolean(left && right && left.kind === right.kind && left.value === right.value);
  }

  getShopHoverPreviewModelFor(preview) {
    const shopId = this.pendingShop?.id || "";
    if (!preview || !shopId) {
      return null;
    }
    if (preview.kind === "buy") {
      const item = createTownItem(preview.value);
      if (!item) {
        return null;
      }
      return {
        preview,
        item,
        semanticEntry: buildInventoryItemSemantics(this, item, -1, { shopId }),
        price: getShopBuyPrice(this, item, shopId),
        comparison: this.getPackComparisonModel(item)
      };
    }
    const index = Number(preview.value);
    const item = this.player?.inventory?.[index] || null;
    if (!item) {
      return null;
    }
    return {
      preview: { kind: "sell", value: index },
      item,
      semanticEntry: buildInventoryItemSemantics(this, item, index, { shopId }),
      price: getShopSellPrice(this, item, shopId),
      comparison: this.getPackComparisonModel(item)
    };
  }

  getShopHoverPreviewMarkup(previewModel) {
    if (!previewModel?.item) {
      return "";
    }
    const { item, semanticEntry, price, comparison, preview } = previewModel;
    const targetComparison = comparison?.comparisons?.find((entry) => entry.slot === comparison.targetSlot)
      || comparison?.comparisons?.[0]
      || null;
    const slotLabel = item.slot ? this.getPackSlotDefinition(item.slot).label : "";
    const comparisonTitle = !item.slot
      ? ""
      : comparison?.blockedByCurse
        ? `Compare vs ${slotLabel}`
        : comparison?.fitsEmptySlot
          ? `Fits ${this.getPackSlotDefinition(comparison.targetSlot).label}`
            : targetComparison?.equipped
              ? `Compare vs ${getItemName(targetComparison.equipped, true)}`
              : `Compare ${slotLabel}`;
    const primaryDelta = (targetComparison?.deltas || []).find((delta) => delta.label !== "Weight")
      || targetComparison?.deltas?.[0]
      || null;
    const leadChip = !item.slot
      ? ""
      : comparison?.blockedByCurse
        ? `<span class="pack-inline-chip tone-bad">Slot locked by curse</span>`
        : comparison?.fitsEmptySlot
          ? `<span class="pack-inline-chip tone-good">Open ${escapeHtml(this.getPackSlotDefinition(comparison.targetSlot).label)}</span>`
          : primaryDelta
            ? `<span class="pack-inline-chip tone-${escapeHtml(primaryDelta.tone || "neutral")}">${escapeHtml(primaryDelta.text)}</span>`
            : `<span class="pack-inline-chip tone-neutral">No practical change</span>`;
    const comparisonRows = !item.slot
      ? ""
      : `
        <div class="pack-comparison-card shop-hover-comparison-card">
          <div class="pack-comparison-title">${escapeHtml(comparisonTitle)}</div>
          <div class="pack-comparison-list">
            ${comparison?.blockedByCurse
              ? `<div class="pack-comparison-row value-bad">All ${escapeHtml(slotLabel.toLowerCase())} slots are locked by curses.</div>`
              : comparison?.fitsEmptySlot
                ? `<div class="pack-comparison-row value-good">No swap needed. ${escapeHtml(this.getPackSlotDefinition(comparison.targetSlot).label)} is open.</div>`
                : ""}
            ${targetComparison?.deltas?.length
              ? targetComparison.deltas.slice(0, 4).map((delta) => `<div class="pack-comparison-row value-${delta.tone}">${escapeHtml(delta.text)}</div>`).join("")
              : !comparison?.fitsEmptySlot && !comparison?.blockedByCurse
                ? `<div class="pack-comparison-row muted">No practical change.</div>`
                : ""}
          </div>
          <div class="pack-inspector-note ${comparison?.encumbrancePreview?.tone || "muted"}">${escapeHtml(comparison?.encumbrancePreview?.text || this.describeBurdenPreview(0).text)}</div>
        </div>
      `;
    const summary = item.slot
      ? this.getPackHoverPreviewSummary({
          selection: { type: "inventory", value: -1 },
          item,
          comparison
        }, semanticEntry)
      : semanticEntry?.reason || describeItem(item);
    return `
      <div class="pack-hover-preview shop-hover-preview">
        <div class="pack-hover-preview-head">
          <div>
            <div class="pack-hover-preview-kicker">${preview.kind === "buy" ? "Hover Compare" : "Sell Compare"}</div>
            <div class="pack-hover-preview-title">${escapeHtml(getItemName(item, true))}</div>
            ${leadChip ? `<div class="shop-hover-preview-hero">${leadChip}</div>` : ""}
          </div>
          <div class="pack-hover-preview-note">${escapeHtml(`${price} gp ${preview.kind === "buy" ? "to buy" : "to sell"}`)}</div>
        </div>
        <div class="pack-item-badges">${this.getItemBadgeMarkup(item, semanticEntry, { selection: { type: "inventory", value: -1 }, item, comparison, weightDelta: comparison?.weightDelta || 0 })}</div>
        <div class="pack-hover-preview-copy">${escapeHtml(summary)}</div>
        ${comparisonRows}
      </div>
    `;
  }

  refreshShopHoverPreview() {
    if (this.mode !== "modal" || !String(this.modalSurfaceKey || "").startsWith("shop:")) {
      return;
    }
    const host = this.modalRoot.querySelector("[data-shop-hover-preview-host]");
    if (!(host instanceof HTMLElement)) {
      return;
    }
    const previewModel = this.getShopHoverPreviewModelFor(this.hoveredShopPreview);
    host.innerHTML = this.getShopHoverPreviewMarkup(previewModel);
  }

  setHoveredShopPreview(preview) {
    if (!preview) {
      this.clearHoveredShopPreview();
      return;
    }
    const normalized = preview.kind === "buy"
      ? { kind: "buy", value: String(preview.value || "") }
      : { kind: "sell", value: Math.max(0, Number(preview.value) || 0) };
    if (this.isSameShopHoverPreview(this.hoveredShopPreview, normalized)) {
      return;
    }
    this.hoveredShopPreview = normalized;
    this.refreshShopHoverPreview();
  }

  clearHoveredShopPreview() {
    if (!this.hoveredShopPreview) {
      return;
    }
    this.hoveredShopPreview = null;
    this.refreshShopHoverPreview();
  }

  syncShopHoverPreview(target, { allowKeyboard = false } = {}) {
    if (!this.canUseShopHoverPreview({ allowKeyboard })) {
      this.clearHoveredShopPreview();
      return;
    }
    if (target instanceof HTMLElement && target.closest("[data-shop-hover-preview-host]")) {
      return;
    }
    const preview = this.getShopHoverPreviewFromTarget(target);
    if (preview) {
      this.setHoveredShopPreview(preview);
      return;
    }
    if (target instanceof HTMLElement && target.closest(".town-workspace")) {
      this.clearHoveredShopPreview();
    }
  }

  handleCanvasClick(event) {
    if (!this.player || this.isPlayerDead() || (this.mode !== "game" && this.mode !== "target")) {
      return;
    }
    if (this.spellTrayOpen && this.mode === "game") {
      this.closeSpellTray();
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const localX = (event.clientX - rect.left) * scaleX;
    const localY = (event.clientY - rect.top) * scaleY;
    const view = this.getViewport();
    const tileX = Math.floor(localX / TILE_SIZE) + view.x;
    const tileY = Math.floor(localY / TILE_SIZE) + view.y;
    if (this.mode === "target") {
      this.targetMode.cursor = { x: tileX, y: tileY };
      this.confirmTargetSelection();
      return;
    }
    const dx = clamp(tileX - this.player.x, -1, 1);
    const dy = clamp(tileY - this.player.y, -1, 1);
    if (dx === 0 && dy === 0) {
      const currentTile = getTile(this.currentLevel, this.player.x, this.player.y);
      if (currentTile?.optionalId) {
        this.interactHere();
        return;
      }
      this.performWait();
      return;
    }
    this.handleMovementIntent(dx, dy);
  }

  handleAction(actionName, element) {
    return dispatchAction(this, actionName, element);
  }

  handleKeydown(event) {
    return dispatchKeydown(this, event);
  }

  handleMovementIntent(dx, dy) {
    if (!this.player || this.isPlayerDead()) {
      return;
    }
    if (this.mode === "target") {
      this.moveTargetCursor(dx, dy);
      return;
    }
    this.tryMovePlayer(dx, dy);
  }

  beginAdventure() {
    if (this.transitionPending || this.pendingAdventureBootstrapFrame) {
      return;
    }
    this.resetMovementCadence();
    this.cancelScheduledAutosave();
    this.activeSaveSlotId = null;
    const race = getRace(this.selectedRace);
    const role = getClass(this.selectedClass);
    this.captureCreationDraft();
    const heroName = this.creationName || "Morgan";
    const stats = this.getCreationStats();
    ensureMetaProgressionState(this);
    initializeValidationState(this);
    const onboardingMeta = getOnboardingVariantMeta(this);

    this.player = {
      id: "player",
      name: heroName,
      race: race.name,
      raceId: race.id,
      className: role.name,
      classId: role.id,
      x: 0,
      y: 0,
      level: 1,
      exp: 0,
      nextLevelExp: 80,
      gold: 55,
      bankGold: 0,
      constitutionLoss: 0,
      deepestDepth: 0,
      hpBase: race.hp + role.bonuses.hp,
      manaBase: race.mana + role.bonuses.mana,
      stats,
      hp: 1,
      maxHp: 1,
      mana: 0,
      maxMana: 0,
      moveSpeed: 100,
      moveTurnBudget: 0,
      inventory: [],
      equipment: createEmptyEquipment(),
      perks: [],
      relics: [],
      runCurrencies: {
        rumorTokens: 0,
        hunterMark: 0,
        templeFavor: 0
      },
      knownRumors: [],
      spellsKnown: [...role.spells],
      spellTrayIds: [...role.spells].slice(0, this.getSpellTrayLimit()),
      lightRadius: FOV_RADIUS,
      quest: {
        hasRunestone: false,
        complete: false,
        milestonesCleared: [],
        namedBossesDefeated: [],
        briefingsSeen: [],
        discoveryIdsFound: [],
        storyBeatFlags: {},
        npcSceneFlags: {}
      }
    };
    this.ensureEquipmentAliases(this.player);
    this.syncPlayerSpellTray(this.player);

    role.startItems.forEach((itemId) => this.addItemToInventory(createTownItem(itemId)));
    const activeContract = applyContractToNewRun(this);
    const masteryRewards = applyClassMasteryBonuses(this);
    const commendationRewards = applyCommendationBonuses(this);
    this.autoEquipStarterGear();
    this.turn = 1;
    this.storyFlags = {
      introBriefingAvailable: true,
      townServiceVisited: false,
      firstTownGuidance: "service"
    };
    this.shopState = createInitialShopState();
    this.townUnlocks = {};
    this.shopTiers = {};
    this.townState = {};
    this.rumorTable = [];
    this.chronicleEvents = [];
    this.deathContext = null;
    this.runPersistenceChanges = {
      masteryUnlocks: [],
      contractUnlocks: [],
      commendationUnlocks: []
    };
    this.lastTownRefreshTurn = 0;
    this.pendingSpellChoices = 0;
    this.pendingPerkChoices = 0;
    this.pendingRewardChoice = null;
    this.pendingRewardQueue = [];
    this.pendingTurnResolution = null;
    this.liveFeedSticky = null;
    this.storyFlags.postReturnBankPrompt = false;
    this.resetReadState();
    resetTelemetry(this);
    ensureBuildState(this);
    ensureTownMetaState(this);
    ensureChronicleState(this);
    ensureMetaProgressionState(this);
    this.generateWorld(1);
    this.applyRunContractPlayerModifiers(activeContract);
    this.syncTownCycle(true);
    this.recalculateDerivedStats();
    this.player.hp = this.player.maxHp;
    this.player.mana = this.player.maxMana;
    this.mode = "game";
    this.transitionPending = true;
    this.liveFeedSticky = {
      message: `${heroName} is entering the valley below the keep.`,
      tone: "warning",
      turn: this.turn,
      priority: 2,
      expiresAt: this.turn + 1
    };
    this.closeModal();
    this.syncAdaptiveLayout(true);
    startTelemetryRun(this);
    this.recordTelemetry("creation_confirmed", {
      heroName,
      raceId: race.id,
      classId: role.id,
      stats,
      pointsAllocated: Object.values(this.creationStatBonuses).reduce((sum, value) => sum + value, 0)
    });
    this.recordChronicleEvent("floor_enter", { label: "The valley town below the keep" });
    this.updateFov();
    this.updateMonsterIntents();
    this.refreshChrome();
    this.render();
    this.pendingAdventureBootstrapFrame = this.queueAnimationFrame(() => {
      this.pendingAdventureBootstrapFrame = 0;
      this.log(`${heroName} enters the valley beneath the ruined keep.`, "good");
      this.log("Recover the Runestone of the Winds from the lower halls and return to town.", "warning");
      this.log(`${onboardingMeta.firstTownPrimary} ${onboardingMeta.firstTownSupport}`, "warning");
      if (activeContract) {
        this.log(`Contract active: ${activeContract.name}. ${activeContract.summary}`, "warning");
      }
      if (masteryRewards.length > 0) {
        this.log(`Class mastery loadout: ${masteryRewards.join(", ")}.`, "good");
      }
      if (commendationRewards.length > 0) {
        this.log(`Commendation prep: ${commendationRewards.join(", ")}.`, "good");
      }
      this.transitionPending = false;
      this.render();
      this.scheduleAutosave();
    });
  }

  autoEquipStarterGear() {
    const equippedIds = new Set();
    this.player.inventory.forEach((item, index) => {
      const equipTarget = this.getEquipmentSlotForItem(item);
      if ((item.kind === "weapon" || item.kind === "armor") && equipTarget.targetSlot) {
        this.player.equipment[equipTarget.targetSlot] = item;
        equippedIds.add(index);
      }
    });
    this.player.inventory = this.player.inventory.filter((_, index) => !equippedIds.has(index));
    this.recalculateDerivedStats();
  }

  generateWorld(preloadDepth = 1) {
    this.levels = [this.generateTownLevel()];
    this.ensureWorldDepth(preloadDepth);
    this.currentDepth = 0;
    this.currentLevel = this.levels[0];
    this.resetReadState();
    this.placePlayerAt(this.currentLevel.start.x, this.currentLevel.start.y);
  }

  ensureWorldDepth(targetDepth = 1) {
    if (!Array.isArray(this.levels) || this.levels.length === 0) {
      this.levels = [this.generateTownLevel()];
    }
    const desiredDepth = clamp(Math.floor(Number(targetDepth) || 0), 0, DUNGEON_DEPTH);
    for (let depth = Math.max(1, this.levels.length); depth <= desiredDepth; depth += 1) {
      this.levels[depth] = this.generateDungeonLevel(depth);
      this.applyRunContractWorldModifiers(this.getActiveContract(true), {
        includePlayer: false,
        startDepth: depth,
        endDepth: depth
      });
    }
    return this.levels[desiredDepth] || null;
  }

  generateTownLevel() {
    const width = 48;
    const height = 34;
    const level = blankLevel(width, height, "town");
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const border = x === 0 || y === 0 || x === width - 1 || y === height - 1;
        setTile(level, x, y, tileDef(border ? "tree" : "grass"));
      }
    }

    fillRect(level, 23, 2, 3, 31, tileDef("road"));

    fillRect(level, 20, 2, 9, 4, tileDef("stone"));
    fillRect(level, 21, 2, 7, 4, tileDef("plaza"));
    fillRect(level, 18, 16, 13, 6, tileDef("stone"));
    fillRect(level, 19, 17, 11, 4, tileDef("plaza"));
    fillRect(level, 18, 24, 13, 8, tileDef("stone"));
    fillRect(level, 19, 25, 11, 6, tileDef("plaza"));

    placeBuilding(level, 8, 5, 7, 6, "Sage Tower", "sage");
    placeBuilding(level, 33, 5, 6, 6, "Junk Shop", "junk");
    placeBuilding(level, 4, 12, 9, 6, "General Store", "general");
    placeBuilding(level, 35, 12, 9, 6, "Armory", "armory");
    placeBuilding(level, 4, 19, 9, 6, "Wizard Guild", "guild");
    placeBuilding(level, 35, 19, 9, 6, "Bank", "bank");
    placeBuilding(level, 19, 27, 11, 5, "Temple", "temple");

    fillRect(level, 11, 11, 4, 1, tileDef("road"));
    fillRect(level, 14, 10, 4, 1, tileDef("road"));
    fillRect(level, 17, 9, 4, 1, tileDef("road"));
    fillRect(level, 20, 8, 4, 1, tileDef("road"));
    fillRect(level, 33, 11, 4, 1, tileDef("road"));
    fillRect(level, 30, 10, 4, 1, tileDef("road"));
    fillRect(level, 27, 9, 4, 1, tileDef("road"));
    fillRect(level, 24, 8, 4, 1, tileDef("road"));

    fillRect(level, 8, 18, 16, 1, tileDef("road"));
    fillRect(level, 25, 18, 15, 1, tileDef("road"));
    fillRect(level, 8, 25, 16, 1, tileDef("road"));
    fillRect(level, 25, 25, 15, 1, tileDef("road"));

    setTile(level, 24, 3, tileDef("stairDown"));
    level.start = { x: 24, y: 18 };
    level.stairsDown = { x: 24, y: 3 };
    level.description = "The valley town below the keep";
    this.addTownGuideProps(level);
    revealAll(level);
    return level;
  }

  chooseSecondaryEntryRoomIndex(rooms) {
    if (!rooms || rooms.length < 3) {
      return null;
    }
    const primaryCenter = centerOf(rooms[1]);
    let bestIndex = 2;
    let bestDistance = -1;
    for (let index = 2; index < Math.min(rooms.length, 7); index += 1) {
      const candidateCenter = centerOf(rooms[index]);
      const candidateDistance = distance(primaryCenter, candidateCenter);
      if (candidateDistance > bestDistance) {
        bestDistance = candidateDistance;
        bestIndex = index;
      }
    }
    return bestIndex;
  }

  ensureEntryRoutes(level, rooms) {
    const secondaryIndex = this.chooseSecondaryEntryRoomIndex(rooms);
    if (secondaryIndex === null) {
      level.safeEntryRoomIndexes = [0];
      return;
    }
    carveTunnel(level, centerOf(rooms[0]), centerOf(rooms[secondaryIndex]));
    level.safeEntryRoomIndexes = [0, 1, secondaryIndex];
  }

  addTownGuideProps(level) {
    [
      { x: 24, y: 18 },
      { x: 24, y: 14 },
      { x: 24, y: 10 },
      { x: 24, y: 6 }
    ].forEach((point, index) => {
      addLevelProp(level, {
        id: `road-beacon-${index}`,
        x: point.x,
        y: point.y,
        propId: "roadBeacon",
        layer: "fixture",
        alwaysVisible: true,
        light: true
      });
    });
    (level.buildings || []).forEach((building) => {
      const doorX = building.x + Math.floor(building.w / 2);
      addLevelProp(level, {
        id: `town-sign-${building.service}`,
        x: doorX,
        y: building.y,
        propId: "townSign",
        layer: "fixture",
        alwaysVisible: true
      });
    });
  }

  findPathOnLevel(level, start, goal) {
    return Boolean(this.findPathRouteOnLevel(level, start, goal));
  }

  findPathRouteOnLevel(level, start, goal) {
    if (!level || !start || !goal) {
      return null;
    }
    const keyFor = (x, y) => `${x},${y}`;
    const queue = [{ x: start.x, y: start.y }];
    const parents = new Map([[keyFor(start.x, start.y), null]]);
    while (queue.length > 0) {
      const current = queue.shift();
      if (current.x === goal.x && current.y === goal.y) {
        const route = [];
        let key = keyFor(current.x, current.y);
        while (key) {
          const [xText, yText] = key.split(",");
          route.push({ x: Number(xText), y: Number(yText) });
          key = parents.get(key);
        }
        return route.reverse();
      }
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) {
            continue;
          }
          const nextX = current.x + dx;
          const nextY = current.y + dy;
          const key = keyFor(nextX, nextY);
          if (parents.has(key) || !inBounds(level, nextX, nextY) || !isWalkable(level, nextX, nextY)) {
            continue;
          }
          parents.set(key, keyFor(current.x, current.y));
          queue.push({ x: nextX, y: nextY });
        }
      }
    }
    return null;
  }

  getPrimaryGoalMarker(level = this.currentLevel) {
    if (!level) {
      return null;
    }
    if (level.floorObjective?.marker && !level.floorResolved) {
      return level.floorObjective.marker;
    }
    if (level.milestone?.marker && level.milestone.status !== "cleared") {
      return level.milestone.marker;
    }
    return null;
  }

  getDepthOneMaxObjectiveSteps() {
    return 40;
  }

  getDepthOneMaxExitSteps() {
    return 60;
  }

  roomsOverlapOrTouch(left, right) {
    if (!left || !right) {
      return false;
    }
    return !(
      left.x + left.w + 1 < right.x
      || right.x + right.w + 1 < left.x
      || left.y + left.h + 1 < right.y
      || right.y + right.h + 1 < left.y
    );
  }

  getRoomIndexForPoint(level, point) {
    if (!level?.rooms || !point) {
      return null;
    }
    const index = level.rooms.findIndex((room) =>
      point.x >= room.x &&
      point.x < room.x + room.w &&
      point.y >= room.y &&
      point.y < room.y + room.h
    );
    return index >= 0 ? index : null;
  }

  revealRoom(level, roomIndex) {
    if (!level?.rooms || roomIndex === null || roomIndex === undefined || !level.rooms[roomIndex]) {
      return false;
    }
    const room = level.rooms[roomIndex];
    for (let y = room.y; y < room.y + room.h; y += 1) {
      for (let x = room.x; x < room.x + room.w; x += 1) {
        setExplored(level, x, y, true);
      }
    }
    return true;
  }

  revealRouteSlice(level, route, fromIndex, toIndex, pocketStride = 4) {
    if (!level || !Array.isArray(route) || route.length === 0) {
      return;
    }
    const startIndex = clamp(fromIndex, 0, route.length);
    const endIndex = clamp(toIndex, startIndex, route.length);
    for (let index = startIndex; index < endIndex; index += 1) {
      const point = route[index];
      if (!point || !inBounds(level, point.x, point.y)) {
        continue;
      }
      const pocketRadius = index % pocketStride === 0 ? 1 : 0;
      for (let y = point.y - pocketRadius; y <= point.y + pocketRadius; y += 1) {
        for (let x = point.x - pocketRadius; x <= point.x + pocketRadius; x += 1) {
          if (!inBounds(level, x, y)) {
            continue;
          }
          setExplored(level, x, y, true);
        }
      }
    }
  }

  getObjectiveBreadcrumbStyle(objectiveId = "") {
    const styles = {
      recover_relic: {
        id: "relic_route",
        breadcrumbPropId: "routeRune",
        landmarkPropId: "relicPedestal",
        label: "runic cuts",
        leadText: "Follow the runic cuts into the relic hall."
      },
      purge_nest: {
        id: "nest_route",
        breadcrumbPropId: "routeTorch",
        landmarkPropId: "broodNest",
        label: "smoke-marked torches",
        leadText: "Follow the smoke-marked torches toward the kennels."
      },
      rescue_captive: {
        id: "cell_route",
        breadcrumbPropId: "routePennant",
        landmarkPropId: "prisonerCell",
        label: "torn pennants",
        leadText: "Follow the torn pennants toward the cells."
      },
      seal_shrine: {
        id: "shrine_route",
        breadcrumbPropId: "routeLamp",
        landmarkPropId: "shrineSeal",
        label: "violet lamps",
        leadText: "Follow the violet lamps toward the chapel."
      },
      break_beacon: {
        id: "watch_route",
        breadcrumbPropId: "routeBeacon",
        landmarkPropId: "beaconFocus",
        label: "watch sparks",
        leadText: "Follow the watch sparks toward the beacon room."
      },
      secure_supplies: {
        id: "supply_route",
        breadcrumbPropId: "routeSupply",
        landmarkPropId: "vaultChest",
        label: "chalk supply marks",
        leadText: "Follow the chalk supply marks into the store rooms."
      },
      recover_waystone: {
        id: "waystone_route",
        breadcrumbPropId: "routeCairn",
        landmarkPropId: "relicPedestal",
        label: "survey cairns",
        leadText: "Follow the survey cairns toward the waystone chamber."
      },
      purify_well: {
        id: "well_route",
        breadcrumbPropId: "routeWater",
        landmarkPropId: "well",
        label: "silver ripples",
        leadText: "Follow the silver ripples toward the corrupted well."
      }
    };
    return styles[objectiveId] || {
      id: "floor_route",
      breadcrumbPropId: "routeMark",
      landmarkPropId: "inscribedStone",
      label: "route marks",
      leadText: "Follow the route marks toward the floor objective."
    };
  }

  getWingDirectionLabel(fromPoint, toPoint) {
    if (!fromPoint || !toPoint) {
      return "inner";
    }
    const dx = toPoint.x - fromPoint.x;
    const dy = toPoint.y - fromPoint.y;
    if (Math.abs(dx) >= Math.abs(dy) + 4) {
      return dx >= 0 ? "east" : "west";
    }
    if (Math.abs(dy) >= Math.abs(dx) + 4) {
      return dy >= 0 ? "south" : "north";
    }
    if (dx >= 0 && dy >= 0) {
      return "southeast";
    }
    if (dx >= 0 && dy < 0) {
      return "northeast";
    }
    if (dx < 0 && dy >= 0) {
      return "southwest";
    }
    return "northwest";
  }

  buildObjectiveWingLabel(level) {
    const objective = level?.floorObjective;
    if (!objective?.marker || !level?.start) {
      return "objective wing";
    }
    const direction = this.getWingDirectionLabel(level.start, objective.marker);
    const nouns = {
      recover_relic: "relic hall",
      purge_nest: "kennels",
      rescue_captive: "cell wing",
      seal_shrine: "chapel",
      break_beacon: "watch post",
      secure_supplies: "store rooms",
      recover_waystone: "survey vault",
      purify_well: "well chamber"
    };
    return `${direction} ${nouns[objective.id] || "objective wing"}`;
  }

  buildRouteGuide(level, depth, objectiveRoute = [], routeBeats = [], signatureReveal = null) {
    const objectiveId = level?.floorObjective?.id || "";
    const breadcrumbStyle = this.getObjectiveBreadcrumbStyle(objectiveId);
    const objectiveWingLabel = this.buildObjectiveWingLabel(level);
    const milestones = routeBeats.map((beat, index) => ({
      id: beat.id,
      label: beat.label,
      x: beat.x,
      y: beat.y,
      routeIndex: objectiveRoute.findIndex((point) => point.x === beat.x && point.y === beat.y),
      hint: beat.cue || beat.text,
      reached: false,
      priority: index
    }));
    const firstHint = depth === 1
      ? `Objective route: ${objectiveWingLabel}. ${breadcrumbStyle.leadText}`
      : signatureReveal?.routeCue || `Objective route: ${objectiveWingLabel}.`;
    return {
      objectiveWingLabel,
      currentHint: firstHint,
      milestones,
      spineTiles: objectiveRoute.map((point) => ({ x: point.x, y: point.y })),
      breadcrumbStyle,
      firstHint
    };
  }

  addRouteBreadcrumbs(level, depth, routeGuide) {
    if (!level || level.kind !== "dungeon" || !routeGuide?.spineTiles?.length) {
      return;
    }
    const route = routeGuide.spineTiles;
    const style = routeGuide.breadcrumbStyle || this.getObjectiveBreadcrumbStyle(level.floorObjective?.id || "");
    const startOffset = depth === 1 ? 3 : 5;
    const stride = depth === 1 ? 5 : 7;
    let placed = 0;
    for (let index = startOffset; index < route.length - 2; index += stride) {
      const point = route[index];
      if (!point || !inBounds(level, point.x, point.y)) {
        continue;
      }
      const tile = getTile(level, point.x, point.y);
      if (!tile?.walkable || tile.objectiveId || tile.optionalId || tile.roomEventId || tile.kind === "stairUp" || tile.kind === "stairDown") {
        continue;
      }
      const propId = style.breadcrumbPropId;
      addLevelProp(level, {
        id: `route-crumb-${depth}-${style.id}-${index}`,
        x: point.x,
        y: point.y,
        propId,
        layer: "fixture",
        light: ["routeTorch", "routeLamp", "routeBeacon", "routeWater"].includes(propId)
      });
      setTile(level, point.x, point.y, tileDef(tile.kind || "floor", {
        ...tile,
        routeBreadcrumb: style.label,
        routeCue: routeGuide.firstHint
      }));
      placed += 1;
      if (depth === 1 && placed >= 5) {
        break;
      }
    }
  }

  prepareGuidedRouteState(level, depth) {
    if (!level || level.kind !== "dungeon") {
      return;
    }
    const objectiveMarker = level.floorObjective?.marker || level.milestone?.marker || null;
    const objectiveRoute = objectiveMarker ? this.findPathRouteOnLevel(level, level.start, objectiveMarker) || [] : [];
    const stairsRoute = level.stairsDown ? this.findPathRouteOnLevel(level, level.start, level.stairsDown) || [] : [];
    const signatureReveal = this.buildSignatureReveal(level, depth, objectiveRoute);
    const routeBeats = this.buildRouteBeats(level, depth, objectiveRoute, signatureReveal);
    const objectiveRoomIndex = level.floorObjective?.roomIndex ?? null;
    const supportRoomIndex = objectiveRoute
      .map((point) => this.getRoomIndexForPoint(level, point))
      .find((roomIndex) => roomIndex !== null && roomIndex !== undefined && roomIndex !== 0 && roomIndex !== objectiveRoomIndex) ?? null;
    const routeTuning = getRouteExperimentTuning(this, depth);
    const entryRevealSteps = depth === 1
      ? Math.max(1, Math.min(14, objectiveRoute.length - 1))
      : depth <= 3
        ? Math.min(objectiveRoute.length, 8)
        : Math.min(objectiveRoute.length, 5);
    const searchRevealChunk = depth === 1 ? 12 : depth <= 3 ? 8 : 6;
    const routeGuide = this.buildRouteGuide(level, depth, objectiveRoute, routeBeats, signatureReveal);
    level.guidance = {
      objectiveRoute,
      stairsRoute,
      routeBeats,
      entryRevealSteps: Math.min(objectiveRoute.length, entryRevealSteps + (routeTuning.entryRevealBonus || 0)),
      revealedRouteSteps: Math.min(objectiveRoute.length, entryRevealSteps + (routeTuning.entryRevealBonus || 0)),
      searchRevealChunk: searchRevealChunk + (routeTuning.searchRevealBonus || 0),
      entryReconApplied: false,
      criticalPathExposed: false,
      routeConfidence: depth === 1 ? "seeded" : "partial",
      searchesUsed: 0,
      objectiveSeen: false,
      supportRoomIndex,
      routeQuality: {
        objectiveSteps: objectiveRoute.length,
        exitSteps: stairsRoute.length,
        optionalSeparation: level.floorOptional && level.floorObjective
          ? Math.max(
              Math.abs((level.floorOptional.marker?.x || 0) - (level.floorObjective.marker?.x || 0)),
              Math.abs((level.floorOptional.marker?.y || 0) - (level.floorObjective.marker?.y || 0))
            )
          : 0
      }
    };
    level.routeGuide = routeGuide;
    level.signatureReveal = signatureReveal;
    level.routeBeats = routeBeats;
    level.floorThesis = signatureReveal?.thesis
      || level.floorSpecialSummary
      || level.signatureEncounter?.summary
      || (level.floorThemeName ? `${level.floorThemeName} is active on this floor.` : "");
    this.applyRouteLandmarks(level, depth, signatureReveal, routeBeats);
    this.addRouteBreadcrumbs(level, depth, routeGuide);
  }

  applyIntroFloorRecon(level = this.currentLevel) {
    if (!level || this.currentDepth <= 0) {
      return false;
    }
    level.guidance = level.guidance || {};
    if (level.guidance.entryReconApplied) {
      return false;
    }
    level.guidance.entryReconApplied = true;
    const route = level.guidance.objectiveRoute || [];
    if (route.length > 0) {
      this.revealRouteSlice(level, route, 0, level.guidance.revealedRouteSteps || 0, this.currentDepth === 1 ? 3 : 4);
      level.guidance.criticalPathExposed = true;
      level.guidance.routeConfidence = route.length <= (level.guidance.revealedRouteSteps || 0) ? "clear" : "guided";
      this.syncRouteGuideState(level);
      const thesis = this.getFloorThesisText(level);
      const cue = this.getObjectiveRouteHint(level) || this.getCurrentRouteCueText(level);
      this.log(thesis || "You get your bearings and pick out the first corridor toward the objective.", "warning");
      if (cue && cue !== thesis) {
        this.log(cue, "warning");
      }
      return true;
    }
    return false;
  }

  revealGuidedObjectiveRoute(source = "search") {
    if (!this.currentLevel || this.currentDepth <= 0 || this.currentLevel.floorResolved) {
      return null;
    }
    const guidance = this.currentLevel.guidance;
    const route = guidance?.objectiveRoute || [];
    if (route.length === 0) {
      return null;
    }
    const previous = guidance.revealedRouteSteps || 0;
    const chunk = (guidance.searchRevealChunk || 10) + (source === "search" ? (this.getSearchRevealBonus ? this.getSearchRevealBonus() : 0) : 0);
    const next = Math.min(route.length, previous + chunk);
    if (next <= previous) {
      return {
        revealed: false,
        complete: true,
        direction: this.getDirectionToPoint(route[route.length - 1])
      };
    }
    this.revealRouteSlice(this.currentLevel, route, previous, next);
    guidance.revealedRouteSteps = next;
    guidance.criticalPathExposed = true;
    guidance.routeConfidence = next >= route.length ? "clear" : "guided";
    guidance.searchesUsed = (guidance.searchesUsed || 0) + (source === "search" ? 1 : 0);
    let revealedRoom = null;
    if (source === "search" && guidance.searchesUsed === 1 && guidance.supportRoomIndex !== null && guidance.supportRoomIndex !== undefined) {
      if (this.revealRoom(this.currentLevel, guidance.supportRoomIndex)) {
        revealedRoom = this.currentLevel.rooms?.[guidance.supportRoomIndex] || null;
      }
    }
    this.syncRouteGuideState(this.currentLevel);
    return {
      revealed: true,
      complete: next >= route.length,
      direction: this.getDirectionToPoint(route[Math.max(0, next - 1)]),
      steps: Math.max(1, route.length - next),
      revealedRoom
    };
  }

  getGuidedRoutePoints(level = this.currentLevel) {
    if (!level || this.currentDepth <= 0 || level.floorResolved) {
      return [];
    }
    const route = level.guidance?.objectiveRoute || [];
    const revealed = level.guidance?.revealedRouteSteps || 0;
    if (route.length === 0 || revealed <= 0) {
      return [];
    }
    return route
      .slice(0, revealed)
      .filter((point, index, points) => index === 0 || index === points.length - 1 || index % 2 === 0);
  }

  buildSignatureReveal(level, depth, objectiveRoute = []) {
    if (!level || depth <= 0) {
      return null;
    }
    const routePoint = objectiveRoute[Math.min(objectiveRoute.length - 1, depth === 1 ? 6 : depth <= 3 ? 8 : 10)] || objectiveRoute[0] || level.start;
    const roomEvent = level.roomEvents?.[0] || null;
    const floorSpecialId = typeof level.floorSpecial === "string" ? level.floorSpecial : level.floorSpecial?.id || "";
    const specialElite = (level.activeEliteNames || [])[0] || "";
    let reveal = {
      id: "sealed_route",
      label: "Broken Ward Seal",
      thesis: "The approach is marked by old warding and a deliberate route into danger.",
      routeCue: "Objective route passes a broken ward seal.",
      warning: "The floor was shaped to funnel intruders inward.",
      propId: "routeSeal",
      cuePropId: "routeRune",
      point: routePoint
    };
    if (depth === 1) {
      reveal = {
        id: "survivor_trace",
        label: "Survivor Trace",
        thesis: "The first halls still show the path of someone who tried to flee the keep.",
        routeCue: "The first route follows a survivor's trace toward the objective.",
        warning: "Early rooms are meant to teach the path, not bury it.",
        propId: "routeJournal",
        cuePropId: "routeTorch",
        point: routePoint
      };
    } else if (roomEvent?.id === "failed_summoning" || floorSpecialId === "restless_dead") {
      reveal = {
        id: "ritual_glow",
        label: "Ritual Glow",
        thesis: "Restless energy is pooling ahead. Corpses and summons are part of this floor's pressure.",
        routeCue: "Ritual pressure stains the route ahead.",
        warning: "Fresh bodies may not stay down.",
        propId: "routeRitual",
        cuePropId: "routeLamp",
        point: routePoint
      };
    } else if (roomEvent?.id === "barricaded_hold" || floorSpecialId === "barricaded_rooms" || floorSpecialId === "warband") {
      reveal = {
        id: "barricade_breach",
        label: "Barricade Breach",
        thesis: "The floor is organized around holds and choke points rather than loose skirmishes.",
        routeCue: "Barricades mark the approach to the objective wing.",
        warning: "Expect tighter, denser holds.",
        propId: "routeBarricade",
        cuePropId: "routeTorch",
        point: routePoint
      };
    } else if (roomEvent?.id === "wounded_survivor") {
      reveal = {
        id: "survivor_trace",
        label: "Survivor Trace",
        thesis: "Someone made it this far and left warnings in the dark.",
        routeCue: "A survivor's trail points toward the first real decision.",
        warning: "The route carries signs of a hurried retreat.",
        propId: "routeJournal",
        cuePropId: "routeTorch",
        point: routePoint
      };
    } else if (floorSpecialId === "hunting_party" || specialElite) {
      reveal = {
        id: "patrol_sighting",
        label: "Patrol Sign",
        thesis: "A formed hunting party is active on this floor and moving before you do.",
        routeCue: "Tracks and torchlight suggest a patrol ahead.",
        warning: "Something active is moving ahead of you.",
        propId: "routeTracks",
        cuePropId: "routeBeacon",
        point: routePoint
      };
    }
    return reveal;
  }

  buildRouteBeats(level, depth, objectiveRoute = [], signatureReveal = null) {
    if (!Array.isArray(objectiveRoute) || objectiveRoute.length === 0) {
      return [];
    }
    const getPointAt = (index) => objectiveRoute[clamp(index, 0, objectiveRoute.length - 1)];
    const stairsPoint = getPointAt(depth === 1 ? 3 : 2);
    const thesisPoint = signatureReveal?.point || getPointAt(depth === 1 ? 6 : 8);
    const approachPoint = getPointAt(Math.max(0, objectiveRoute.length - (depth <= 2 ? 5 : 7)));
    return [
      {
        id: "stairs",
        label: "Stairs Beat",
        x: stairsPoint.x,
        y: stairsPoint.y,
        text: depth === 1
          ? "The first corridor is legible. Follow the marked route before you widen the map."
          : "The floor gives you a direction quickly. Use it before pressure sets the pace.",
        cue: "The first route segment is safe enough to read."
      },
      {
        id: "thesis",
        label: signatureReveal?.label || "Floor Thesis",
        x: thesisPoint.x,
        y: thesisPoint.y,
        text: signatureReveal?.warning || "The floor is telling you what kind of fight it wants.",
        cue: signatureReveal?.routeCue || ""
      },
      {
        id: "approach",
        label: "Objective Approach",
        x: approachPoint.x,
        y: approachPoint.y,
        text: level.floorObjective
          ? `The objective wing is close. ${level.floorObjective.shortLabel} will decide the floor.`
          : "The main chamber is close now.",
        cue: "Objective approach is no longer far off."
      }
    ];
  }

  applyRouteLandmarks(level, depth, signatureReveal, routeBeats = []) {
    if (!level || level.kind !== "dungeon") {
      return;
    }
    const guidance = level.guidance || {};
    guidance.routeBeats = routeBeats;
    routeBeats.forEach((beat, index) => {
      const cuePropId = beat.id === "thesis"
        ? (signatureReveal?.cuePropId || "routeTorch")
        : beat.id === "approach"
          ? "routeMark"
          : "routeTorch";
      addLevelProp(level, {
        id: `route-beat-${depth}-${beat.id}`,
        x: beat.x,
        y: beat.y,
        propId: cuePropId,
        layer: "fixture",
        light: ["routeTorch", "routeLamp", "routeBeacon", "routeWater", "routeRitual"].includes(cuePropId)
      });
      const existingTile = getTile(level, beat.x, beat.y);
      if (existingTile?.walkable) {
        setTile(level, beat.x, beat.y, tileDef(existingTile.kind || "floor", {
          ...existingTile,
          routeBeatId: beat.id,
          label: beat.label,
          routeCue: beat.cue || beat.text
        }));
      }
      if (index === 1 && signatureReveal) {
        addLevelProp(level, {
          id: `signature-reveal-${depth}`,
          x: beat.x,
          y: beat.y,
          propId: signatureReveal.propId,
          layer: "fixture",
          light: ["routeTorch", "routeLamp", "routeBeacon", "routeWater", "routeRitual"].includes(signatureReveal.propId)
        });
      }
    });
  }

  getCurrentRouteBeat(level = this.currentLevel) {
    const beats = level?.guidance?.routeBeats || level?.routeBeats || [];
    if (!beats.length || this.currentDepth <= 0 || level?.floorResolved) {
      return null;
    }
    const pending = beats.find((beat) => !beat.shown);
    return pending || beats[beats.length - 1] || null;
  }

  getFloorThesisText(level = this.currentLevel) {
    if (!level || this.currentDepth <= 0) {
      return "";
    }
    return level.floorThesis || level.floorSpecialSummary || level.signatureEncounter?.summary || "";
  }

  getRouteProgressIndex(level = this.currentLevel) {
    const route = level?.routeGuide?.spineTiles || level?.guidance?.objectiveRoute || [];
    if (!route.length || !this.player) {
      return -1;
    }
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    route.forEach((point, index) => {
      const tileDistance = Math.max(Math.abs(point.x - this.player.x), Math.abs(point.y - this.player.y));
      if (tileDistance < bestDistance || (tileDistance === bestDistance && index > bestIndex)) {
        bestDistance = tileDistance;
        bestIndex = index;
      }
    });
    return bestDistance <= 2 ? bestIndex : -1;
  }

  getObjectiveRoomHint(level = this.currentLevel) {
    const objective = level?.floorObjective;
    if (!objective || level?.floorResolved) {
      return "";
    }
    const blockers = getObjectiveDefendersRemaining(level);
    switch (objective.id) {
      case "purge_nest":
        return blockers > 0
          ? `Clear ${blockers} defender${blockers === 1 ? "" : "s"}, then burn the nest.`
          : "Room clear. Step onto the nest and burn it out.";
      case "rescue_captive":
        return blockers > 0
          ? `Reach the cell, then clear ${blockers} guard${blockers === 1 ? "" : "s"} before freeing the captive.`
          : "Room clear. Step onto the cell, then free the captive.";
      case "seal_shrine":
        return "Seal the shrine; pressure will jump the moment you commit.";
      case "recover_relic":
        return "Reach the pedestal and claim the relic to unlock the exit.";
      case "recover_waystone":
        return "Reach the waystone and claim it to sharpen the next route.";
      case "break_beacon":
        return blockers > 0
          ? `Break the beacon after the last ${blockers} defender${blockers === 1 ? "" : "s"} drop.`
          : "Room clear. Smash the beacon now.";
      case "purify_well":
        return blockers > 0
          ? `Clear ${blockers} defender${blockers === 1 ? "" : "s"}, then purify the well for a full refill.`
          : "Room clear. Purify the well now for a clean refill.";
      default:
        return "Reach the marker and resolve the floor objective.";
    }
  }

  syncRouteGuideState(level = this.currentLevel) {
    if (!level || this.currentDepth <= 0) {
      return null;
    }
    if (!level.routeGuide) {
      level.routeGuide = this.buildRouteGuide(
        level,
        this.currentDepth,
        level.guidance?.objectiveRoute || [],
        level.guidance?.routeBeats || level.routeBeats || [],
        level.signatureReveal || null
      );
    }
    const routeGuide = level.routeGuide;
    const progressIndex = this.getRouteProgressIndex(level);
    routeGuide.milestones = (routeGuide.milestones || []).map((milestone) => ({
      ...milestone,
      reached: milestone.reached || (progressIndex >= 0 && milestone.routeIndex >= 0 && progressIndex >= milestone.routeIndex)
    }));
    const pressure = this.getPressureUiState();
    if (level.floorResolved) {
      const baseHint = pressure.shortLabel === "Leave now" || (this.reinforcementClock || 0) <= 3
        ? "Leave now. Stairs up are live."
        : "Stairs up are live. Optional greed will raise pressure.";
      routeGuide.currentHint = level.floorOptional && !level.floorOptional.opened
        ? `${baseHint} ${level.floorOptional.label} remains if you stay greedy.`
        : baseHint;
      return routeGuide;
    }
    const objectiveRoomSeen = typeof level.floorObjective?.roomIndex === "number"
      && (this.getPlayerRoomIndex() === level.floorObjective.roomIndex
        || progressIndex >= Math.max(0, (routeGuide.spineTiles?.length || 1) - 5));
    if (objectiveRoomSeen) {
      routeGuide.currentHint = this.getObjectiveRoomHint(level);
      return routeGuide;
    }
    const nextMilestone = (routeGuide.milestones || []).find((milestone) => !milestone.reached);
    routeGuide.currentHint = nextMilestone?.hint
      || routeGuide.firstHint
      || `Objective route: ${routeGuide.objectiveWingLabel}.`;
    return routeGuide;
  }

  getObjectiveRouteHint(level = this.currentLevel) {
    if (!level || this.currentDepth <= 0) {
      return "";
    }
    return this.syncRouteGuideState(level)?.currentHint || "";
  }

  getBaseRouteCueText(level = this.currentLevel) {
    if (!level || this.currentDepth <= 0) {
      return "";
    }
    const routeHint = this.getObjectiveRouteHint(level);
    if (routeHint) {
      return routeHint;
    }
    const beat = this.getCurrentRouteBeat(level);
    if (beat?.cue) {
      return beat.cue;
    }
    return level.signatureReveal?.routeCue || "";
  }

  getBaseDangerNote(level = this.currentLevel) {
    if (!level || this.currentDepth <= 0) {
      return "";
    }
    if (level.floorResolved) {
      const stairsDirection = level.stairsUp ? this.getDirectionToPoint(level.stairsUp) : "back";
      const turns = Math.max(0, this.reinforcementClock || level.reinforcementClock || 0);
      if (level.floorOptional && !level.floorOptional.opened && level.floorOptional.marker) {
        return `${level.floorOptional.label} ${this.getDirectionToPoint(level.floorOptional.marker)} if you stay greedy. Stairs up ${stairsDirection} bank the floor.`;
      }
      return turns > 0
        ? `Stairs up ${stairsDirection} bank the floor. Another wave lands in about ${turns} turns.`
        : `Stairs up ${stairsDirection} bank the floor before the next wave closes in.`;
    }
    const specialist = (level.actors || []).find((monster) => monster.elite || monster.behaviorKit);
    if (specialist?.behaviorKit) {
      const behavior = ENEMY_BEHAVIOR_KITS[specialist.behaviorKit];
      return behavior ? `${behavior.label}: ${behavior.tell}` : `${specialist.name} is shaping the floor ahead.`;
    }
    if (specialist?.elite) {
      return `${specialist.name} is the first major threat on this floor.`;
    }
    if ((this.reinforcementClock || level.reinforcementClock || 0) <= 4) {
      return `Reinforcements lean ${this.getReinforcementProfileLabel(level.reinforcementProfile)}.`;
    }
    return level.signatureReveal?.warning || level.floorSpecialSummary || "";
  }

  getObjectiveInteractionPromptData(objective = this.currentLevel?.floorObjective, blockers = null) {
    if (!objective) {
      return null;
    }
    const remaining = blockers === null ? getObjectiveDefendersRemaining(this.currentLevel) : blockers;
    const blockerText = `${remaining} defender${remaining === 1 ? "" : "s"} remain.`;
    switch (objective.id) {
      case "recover_relic":
        return {
          label: "Take Relic",
          tone: "good",
          roomDetail: "The relic is in this room. Pick it up.",
          readyDetail: "Pick up the relic.",
          recommendedActionId: "pickup"
        };
      case "secure_supplies":
        return {
          label: "Take Cache",
          tone: "good",
          roomDetail: "The cache is in this room. Pick it up.",
          readyDetail: "Pick up the cache.",
          recommendedActionId: "pickup"
        };
      case "recover_waystone":
        return {
          label: "Take Waystone",
          tone: "good",
          roomDetail: "The waystone is in this room. Pick it up.",
          readyDetail: "Pick up the waystone.",
          recommendedActionId: "pickup"
        };
      case "rescue_captive":
        return {
          label: "Free Captive",
          tone: remaining > 0 ? "warning" : "good",
          blockedDetail: `${blockerText} Clear the room, then step onto the cell.`,
          roomDetail: remaining > 0 ? `${blockerText} Clear the room, then step onto the cell.` : "The cell is clear. Step onto it.",
          readyDetail: "Step onto the cell.",
          recommendedActionId: remaining > 0 ? "wait" : "move"
        };
      case "purge_nest":
        return {
          label: "Burn Nest",
          tone: remaining > 0 ? "warning" : "good",
          blockedDetail: `${blockerText} Clear the room, then press U on the nest.`,
          roomDetail: remaining > 0 ? `${blockerText} Clear the room, then press U on the nest.` : "The nest is exposed. Press U on it.",
          readyDetail: "Press U on the nest.",
          recommendedActionId: remaining > 0 ? "wait" : "interact"
        };
      case "seal_shrine":
        return {
          label: "Seal Shrine",
          tone: "warning",
          blockedDetail: `${blockerText} Clear the room, then press U on the shrine.`,
          roomDetail: remaining > 0 ? `${blockerText} Clear the room, then press U on the shrine.` : "The shrine is ready. Press U on it; this raises pressure.",
          readyDetail: "Press U on the shrine; this raises pressure.",
          recommendedActionId: remaining > 0 ? "wait" : "interact"
        };
      case "purify_well":
        return {
          label: "Purify Well",
          tone: remaining > 0 ? "warning" : "good",
          blockedDetail: `${blockerText} Clear the room, then press U on the well.`,
          roomDetail: remaining > 0 ? `${blockerText} Clear the room, then press U on the well.` : "The well is clear. Press U on it for a full refill and a pressure spike.",
          readyDetail: "Press U on the well for a full refill and a pressure spike.",
          recommendedActionId: remaining > 0 ? "wait" : "interact"
        };
      case "break_beacon":
        return {
          label: "Break Beacon",
          tone: remaining > 0 ? "warning" : "good",
          blockedDetail: `${blockerText} Clear the room, then press U on the beacon.`,
          roomDetail: remaining > 0 ? `${blockerText} Clear the room, then press U on the beacon.` : "The beacon is exposed. Press U on it.",
          readyDetail: "Press U on the beacon.",
          recommendedActionId: remaining > 0 ? "wait" : "interact"
        };
      default:
        return {
          label: "Resolve Objective",
          tone: remaining > 0 ? "warning" : "good",
          blockedDetail: `${blockerText} Clear the room first.`,
          roomDetail: remaining > 0 ? `${blockerText} Clear the room first.` : "The room is clear. Resolve the objective now.",
          readyDetail: "Resolve the objective now.",
          recommendedActionId: remaining > 0 ? "wait" : "interact"
        };
    }
  }

  getLoopDirective(tile = this.player && this.currentLevel ? getTile(this.currentLevel, this.player.x, this.player.y) : null, level = this.currentLevel) {
    const onboardingMeta = getOnboardingVariantMeta(this);
    if (!this.player || !level) {
      return {
        phase: "town_prep",
        primaryText: "Create a character to begin.",
        supportText: "",
        recommendedActionId: "new-game",
        routeCueText: "",
        dangerText: ""
      };
    }

    if (this.currentDepth === 0) {
      if (this.isFirstTownRun() && !this.storyFlags.townServiceVisited) {
        return {
          phase: "town_prep",
          primaryText: onboardingMeta.firstTownPrimary,
          supportText: onboardingMeta.firstTownSupport,
          recommendedActionId: "town_service",
          routeCueText: "",
          dangerText: ""
        };
      }
      if (this.isFirstTownRun()) {
        return {
          phase: "enter_keep",
          primaryText: onboardingMeta.enterKeepPrimary,
          supportText: onboardingMeta.enterKeepSupport,
          recommendedActionId: "stairs_down",
          routeCueText: "",
          dangerText: ""
        };
      }
      const townMeta = this.getTownMetaSummary();
      return {
        phase: "town_prep",
        primaryText: townMeta.recommendedAction,
        supportText: townMeta.summary,
        recommendedActionId: "bank",
        routeCueText: "",
        dangerText: ""
      };
    }

    const routeCueText = this.getBaseRouteCueText(level);
    const dangerText = this.getBaseDangerNote(level);
    const objective = level.floorObjective;
    if (level.floorResolved) {
      const stairsDirection = level.stairsUp ? this.getDirectionToPoint(level.stairsUp) : "back";
      const turns = Math.max(0, this.reinforcementClock || level.reinforcementClock || 0);
      const optionalText = level.floorOptional && !level.floorOptional.opened && level.floorOptional.marker
        ? `${level.floorOptional.label} ${this.getDirectionToPoint(level.floorOptional.marker)} if you stay greedy.`
        : "";
      return {
        phase: "extract_or_greed",
        primaryText: `Stairs up ${stairsDirection} bank the floor now.`,
        supportText: [optionalText, turns > 0 ? `Another wave lands in about ${turns} turn${turns === 1 ? "" : "s"}.` : "Staying longer will keep raising pressure."].filter(Boolean).join(" "),
        recommendedActionId: "stairs-up",
        routeCueText: "",
        dangerText
      };
    }

    if (!objective || !objective.marker) {
      return {
        phase: "reach_objective",
        primaryText: routeCueText || "Push deeper into the floor.",
        supportText: dangerText,
        recommendedActionId: "search",
        routeCueText,
        dangerText
      };
    }

    const blockers = getObjectiveDefendersRemaining(level);
    const inObjectiveRoom = this.getPlayerRoomIndex() === objective.roomIndex;
    const onObjectiveMarker = tile?.objectiveId === objective.id;
    const interaction = this.getObjectiveInteractionPromptData(objective, blockers);
    const unrevealedRoute = Math.max(0, (level.guidance?.objectiveRoute?.length || 0) - (level.guidance?.revealedRouteSteps || 0));
    const searchHint = this.currentDepth === 1 && !level.guidance?.objectiveSeen && unrevealedRoute > 0
      ? onboardingMeta.objectiveSearchHint
      : "";

    if (onObjectiveMarker) {
      if (blockers > 0 && interaction?.blockedDetail) {
        return {
          phase: "clear_room",
          primaryText: interaction.blockedDetail,
          supportText: "Search is no longer the answer here. Finish the room.",
          recommendedActionId: "wait",
          routeCueText,
          dangerText
        };
      }
      return {
        phase: "interact_objective",
        primaryText: interaction?.readyDetail || "Resolve the objective now.",
        supportText: dangerText,
        recommendedActionId: interaction?.recommendedActionId || "interact",
        routeCueText,
        dangerText
      };
    }

    if (inObjectiveRoom) {
      if (blockers > 0) {
        return {
          phase: "clear_room",
          primaryText: interaction?.roomDetail || `Clear the room for ${objective.label.toLowerCase()}.`,
          supportText: "Finish the defenders, then take the objective action.",
          recommendedActionId: "wait",
          routeCueText,
          dangerText
        };
      }
      return {
        phase: "interact_objective",
        primaryText: interaction?.roomDetail || interaction?.readyDetail || "The room is clear. Resolve the objective now.",
        supportText: dangerText,
        recommendedActionId: interaction?.recommendedActionId || "interact",
        routeCueText,
        dangerText
      };
    }

    const direction = this.getDirectionToPoint(objective.marker);
    return {
      phase: "reach_objective",
      primaryText: routeCueText || `${objective.shortLabel} ${direction}`,
      supportText: [searchHint, dangerText].filter(Boolean).join(" "),
      recommendedActionId: searchHint ? "search" : "move",
      routeCueText: routeCueText || `${objective.shortLabel} ${direction}`,
      dangerText
    };
  }

  getCurrentRouteCueText(level = this.currentLevel) {
    return this.getLoopDirective(null, level).routeCueText || "";
  }

  getImmediateDangerNote(level = this.currentLevel) {
    const directive = this.getLoopDirective(null, level);
    return directive.supportText || directive.dangerText || "";
  }

  getLoopDirectiveLabel(phase = this.getLoopDirective().phase) {
    const labels = {
      town_prep: "Town",
      enter_keep: "Keep",
      reach_objective: "Route",
      clear_room: "Room",
      interact_objective: "Objective",
      extract_or_greed: "Exit"
    };
    return labels[phase] || "Loop";
  }

  maybeTriggerRouteBeat(level = this.currentLevel) {
    if (!level || this.currentDepth <= 0 || level.floorResolved) {
      return false;
    }
    const beat = this.getCurrentRouteBeat(level);
    if (!beat || beat.shown) {
      return false;
    }
    if (Math.max(Math.abs(this.player.x - beat.x), Math.abs(this.player.y - beat.y)) > 1) {
      return false;
    }
    beat.shown = true;
    this.syncRouteGuideState(level);
    this.log(beat.text, "warning");
    if (beat.cue && beat.cue !== beat.text) {
      this.log(beat.cue, "warning");
    }
    return true;
  }

  setTownReturnStingFromLevel(level, options = {}) {
    if (!this.player?.quest || !level || level.kind !== "dungeon") {
      return;
    }
    const parts = [];
    if (level.floorObjective?.label) {
      parts.push(level.floorResolved ? `${level.floorObjective.label.toLowerCase()} cleared` : level.floorObjective.label.toLowerCase());
    }
    if (level.signatureReveal?.label) {
      parts.push(level.signatureReveal.label);
    }
    if (level.roomEvents?.[0]?.status === "cleared") {
      parts.push(`resolved ${level.roomEvents[0].label.toLowerCase()}`);
    }
    if ((level.activeEliteNames || []).length > 0) {
      parts.push(`faced ${level.activeEliteNames[0]}`);
    }
    const rumorTokens = this.player.runCurrencies?.rumorTokens || 0;
    const goldSummary = `${Math.floor(this.player.gold)} gp on hand`;
    if (rumorTokens > 0) {
      parts.push(`${rumorTokens} rumor token${rumorTokens === 1 ? "" : "s"}`);
    }
    parts.push(goldSummary);
    const focus = parts.length > 0 ? parts.join(", ") : (level.floorThesis || level.floorSpecialSummary || level.description);
    this.player.quest.returnSting = {
      depth: options.depth || this.currentDepth,
      area: level.description,
      text: `Town return: ${focus}.`
    };
  }

  getTownReturnStingText() {
    return this.player?.quest?.returnSting?.text || "";
  }

  pointNearRoute(point, route = [], maxDistance = 3) {
    if (!point || !Array.isArray(route) || route.length === 0) {
      return false;
    }
    return route.some((entry) => Math.max(Math.abs((entry.x || 0) - point.x), Math.abs((entry.y || 0) - point.y)) <= maxDistance);
  }

  validateDungeonLevel(level, depth) {
    if (!level?.rooms?.length) {
      return false;
    }
    const primaryGoal = level.floorObjective?.marker || level.milestone?.marker;
    if (!primaryGoal) {
      return false;
    }
    const objectivePath = this.findPathRouteOnLevel(level, level.start, primaryGoal);
    if (!objectivePath) {
      return false;
    }
    if (depth === 1 && objectivePath.length > this.getDepthOneMaxObjectiveSteps()) {
      return false;
    }
    const exitPath = this.findPathRouteOnLevel(level, level.start, level.stairsDown);
    if (depth === 1 && (!exitPath || exitPath.length > this.getDepthOneMaxExitSteps())) {
      return false;
    }
    if (depth === 1) {
      const routeGuide = level.routeGuide || level.guidance;
      const firstMilestone = routeGuide?.milestones?.[0] || level.routeBeats?.[0] || null;
      if (!routeGuide?.spineTiles?.length || !firstMilestone) {
        return false;
      }
      const milestoneDistance = Math.max(Math.abs(firstMilestone.x - level.start.x), Math.abs(firstMilestone.y - level.start.y));
      if (milestoneDistance > 8) {
        return false;
      }
      if (level.floorOptional?.marker && this.pointNearRoute(level.floorOptional.marker, objectivePath.slice(0, Math.min(objectivePath.length, 16)), 3)) {
        return false;
      }
    }
    if (level.floorOptional?.marker && !this.findPathOnLevel(level, level.start, level.floorOptional.marker)) {
      return false;
    }
    if (depth === 1 && level.floorObjective && level.floorOptional) {
      const objectiveRoom = level.rooms?.[level.floorObjective.roomIndex] || null;
      const optionalRoom = level.rooms?.[level.floorOptional.roomIndex] || null;
      if (this.roomsOverlapOrTouch(objectiveRoom, optionalRoom)) {
        return false;
      }
    }
    const objectiveTile = getTile(level, primaryGoal.x, primaryGoal.y);
    if (!objectiveTile || !objectiveTile.walkable) {
      return false;
    }
    const exitTile = getTile(level, level.stairsDown.x, level.stairsDown.y);
    if (!exitTile || (depth === DUNGEON_DEPTH ? exitTile.kind !== "altar" : exitTile.kind !== "stairDown")) {
      return false;
    }
    return true;
  }

  generateDungeonLevel(depth) {
    const width = 64;
    const height = 64;
    const level = blankLevel(width, height, "dungeon");
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        setTile(level, x, y, tileDef("wall"));
      }
    }

    const rooms = [];
    const roomCount = 12 + depth * 2;
    for (let i = 0; i < roomCount; i += 1) {
      const room = {
        x: randInt(2, width - 12),
        y: randInt(2, height - 12),
        w: randInt(5, 11),
        h: randInt(5, 11)
      };
      if (rooms.some((other) => intersects(room, other, 1))) {
        continue;
      }
      carveRoom(level, room);
      if (rooms.length > 0) {
        carveTunnel(level, centerOf(rooms[rooms.length - 1]), centerOf(room));
      }
      rooms.push(room);
    }

    if (rooms.length < 3) {
      return this.generateDungeonLevel(depth);
    }

    this.ensureEntryRoutes(level, rooms);
    level.rooms = rooms;
    level.start = centerOf(rooms[0]);
    level.stairsUp = centerOf(rooms[0]);
    level.stairsDown = centerOf(rooms[rooms.length - 1]);
    level.exitRoomIndex = rooms.length - 1;
    level.reservedRoomIndexes = Array.isArray(level.reservedRoomIndexes) ? level.reservedRoomIndexes : [];
    if (!level.reservedRoomIndexes.includes(level.exitRoomIndex)) {
      level.reservedRoomIndexes.push(level.exitRoomIndex);
    }
    setTile(level, level.stairsUp.x, level.stairsUp.y, tileDef("stairUp"));
    setTile(level, level.stairsDown.x, level.stairsDown.y, tileDef(depth === DUNGEON_DEPTH ? "altar" : "stairDown"));
    const theme = getDepthTheme(depth);
    level.description = `${theme.name} - depth ${depth}`;
    initializeDangerState(level, depth);
    this.placeDungeonContent(level, depth);
    setTile(level, level.stairsUp.x, level.stairsUp.y, tileDef("stairUp"));
    setTile(level, level.stairsDown.x, level.stairsDown.y, tileDef(depth === DUNGEON_DEPTH ? "altar" : "stairDown"));
    if (!this.validateDungeonLevel(level, depth)) {
      return this.generateDungeonLevel(depth);
    }
    return level;
  }

  ensureMonsterSpawn(level, rooms, monsterId) {
    const template = MONSTER_DEFS.find((monster) => monster.id === monsterId);
    if (!template) {
      return false;
    }
    const candidates = rooms && rooms.length > 0 ? rooms : level.rooms.slice(1);
    for (const room of candidates) {
      for (let attempt = 0; attempt < 16; attempt += 1) {
        const position = randomRoomTile(room);
        if (isOccupied(level, position.x, position.y)) {
          continue;
        }
        level.actors.push(createMonster(template, position.x, position.y));
        return true;
      }
    }
    return false;
  }

  getMilestoneDefinitionForDepth(depth) {
    return Object.values(MILESTONE_DEFS).find((entry) => entry.depth === depth) || null;
  }

  getDiscoveryDef(discoveryId) {
    return discoveryId ? DISCOVERY_DEFS[discoveryId] || null : null;
  }

  getStoryNpc(npcId) {
    return npcId ? STORY_NPCS[npcId] || null : null;
  }

  getStoryBeat(beatId) {
    return beatId ? STORY_BEATS[beatId] || null : null;
  }

  getRoomEventDefinition(eventId) {
    return eventId ? ROOM_EVENT_DEFS[eventId] || null : null;
  }

  getTownReactionDefinition(reactionId) {
    return reactionId ? TOWN_REACTION_DEFS[reactionId] || null : null;
  }

  ensureQuestReactionState() {
    if (!this.player?.quest) {
      return;
    }
    this.player.quest.townReactionFlags = this.player.quest.townReactionFlags || {};
    this.player.quest.namedLootHistory = this.player.quest.namedLootHistory || [];
  }

  hasTownReactionSeen(reactionId) {
    this.ensureQuestReactionState();
    return Boolean(reactionId && this.player?.quest?.townReactionFlags?.[reactionId]);
  }

  markTownReactionSeen(reactionId) {
    if (!reactionId || !this.player) {
      return;
    }
    this.ensureQuestReactionState();
    this.player.quest.townReactionFlags[reactionId] = true;
  }

  recordNamedLoot(item) {
    if (!item?.affixId || !this.player) {
      return;
    }
    this.ensureQuestReactionState();
    const label = `${item.affixId}:${item.id}`;
    if (!this.player.quest.namedLootHistory.includes(label)) {
      this.player.quest.namedLootHistory.push(label);
    }
  }

  chooseRoomEventDefinition(depth, themeId = "") {
    if (depth <= 1 || depth >= DUNGEON_DEPTH) {
      return null;
    }
    if (themeId === "vermin_halls") {
      return depth === 2
        ? choice([ROOM_EVENT_DEFS.wounded_survivor, ROOM_EVENT_DEFS.route_cache])
        : choice([ROOM_EVENT_DEFS.wounded_survivor, ROOM_EVENT_DEFS.route_cache, ROOM_EVENT_DEFS.sealed_reliquary]);
    }
    if (themeId === "barracks") {
      return depth <= 3
        ? choice([ROOM_EVENT_DEFS.barricaded_hold, ROOM_EVENT_DEFS.route_cache])
        : choice([ROOM_EVENT_DEFS.barricaded_hold, ROOM_EVENT_DEFS.route_cache, ROOM_EVENT_DEFS.sealed_reliquary]);
    }
    if (themeId === "crypts") {
      return depth >= 6
        ? choice([ROOM_EVENT_DEFS.failed_summoning, ROOM_EVENT_DEFS.watchers_archive])
        : choice([ROOM_EVENT_DEFS.cursed_library, ROOM_EVENT_DEFS.failed_summoning, ROOM_EVENT_DEFS.watchers_archive]);
    }
    return choice(Object.values(ROOM_EVENT_DEFS));
  }

  getRoomEventBlockers(event) {
    if (!event || !this.currentLevel) {
      return 0;
    }
    return this.currentLevel.actors.filter((monster) => monster.roomIndex === event.roomIndex && monster.hp > 0).length;
  }

  getCurrentRoomEvent() {
    if (!this.currentLevel?.roomEvents?.length) {
      return null;
    }
    return this.currentLevel.roomEvents.find((event) =>
      event.marker &&
      event.marker.x === this.player.x &&
      event.marker.y === this.player.y
    ) || null;
  }

  placeRoomEvent(level, depth, rooms) {
    const eventDef = this.chooseRoomEventDefinition(depth, level.floorTheme);
    if (!eventDef || !rooms || rooms.length === 0) {
      level.roomEvents = [];
      level.signatureEncounter = null;
      return null;
    }
    const blockedRoomIndexes = new Set([
      level.floorObjective?.roomIndex,
      level.floorOptional?.roomIndex,
      level.milestone?.roomIndex
    ].filter((value) => value !== undefined && value !== null));
    const candidates = rooms.filter((room) => !blockedRoomIndexes.has(level.rooms.indexOf(room)));
    const room = choice(candidates.length > 0 ? candidates : rooms);
    const roomIndex = level.rooms.indexOf(room);
    if (!room || roomIndex < 0) {
      level.roomEvents = [];
      level.signatureEncounter = null;
      return null;
    }
    const marker = centerOf(room);
    const eventTileKind = eventDef.eventType === "ritual" || eventDef.eventType === "library"
      ? "altar"
      : eventDef.eventType === "rescue"
        ? "fountain"
        : "throne";
    setTile(level, marker.x, marker.y, tileDef(eventTileKind, {
      label: eventDef.label,
      roomEventId: eventDef.id,
      roomEventAction: eventDef.eventType
    }));
    addLevelProp(level, {
      id: `room-event-${eventDef.id}-${depth}`,
      x: marker.x,
      y: marker.y,
      propId: eventDef.propId,
      layer: "fixture",
      light: ["relicPedestal", "shrineSeal", "bloodAltar", "ghostMerchant", "well", "beaconFocus"].includes(eventDef.propId)
    });
    [
      { x: room.x + 1, y: room.y + 1 },
      { x: room.x + room.w - 2, y: room.y + 1 }
    ].forEach((point, index) => {
      addLevelProp(level, {
        id: `room-event-torch-${eventDef.id}-${depth}-${index}`,
        x: point.x,
        y: point.y,
        propId: depth >= 5 ? "shrineTorch" : "roomTorch",
        layer: "fixture",
        light: true
      });
    });
    const eventState = {
      ...eventDef,
      roomIndex,
      marker,
      status: "active",
      rewardClaimed: false
    };
    level.roomEvents = [eventState];
    level.signatureEncounter = {
      id: eventState.id,
      label: eventState.label,
      summary: eventState.summary,
      roomIndex
    };

    if (eventDef.id === "barricaded_hold") {
      this.ensureMonsterSpawn(level, [room], depth >= 4 ? "orc" : "goblin");
      this.ensureMonsterSpawn(level, [room], depth >= 4 ? "archer" : "slinger");
      level.actors.forEach((monster) => {
        if (monster.roomIndex === roomIndex || (monster.x >= room.x && monster.x < room.x + room.w && monster.y >= room.y && monster.y < room.y + room.h)) {
          monster.roomIndex = roomIndex;
          monster.alerted = Math.max(monster.alerted || 0, 5);
          monster.sleeping = false;
        }
      });
    } else if (eventDef.id === "failed_summoning") {
      this.ensureMonsterSpawn(level, [room], depth >= 5 ? "warlock" : "shaman");
      level.actors.forEach((monster) => {
        if (monster.x >= room.x && monster.x < room.x + room.w && monster.y >= room.y && monster.y < room.y + room.h) {
          monster.roomIndex = roomIndex;
        }
      });
    } else if (eventDef.id === "cursed_library") {
      this.ensureMonsterSpawn(level, [room], depth >= 5 ? "wraith" : "skeleton");
    }
    return eventState;
  }

  hasSeenBriefing(briefingId) {
    return Boolean(this.player?.quest?.briefingsSeen?.includes(briefingId));
  }

  markBriefingSeen(briefingId) {
    if (!briefingId || !this.player) {
      return;
    }
    if (!this.player.quest.briefingsSeen.includes(briefingId)) {
      this.player.quest.briefingsSeen.push(briefingId);
    }
  }

  hasSeenNpcScene(sceneId) {
    return Boolean(sceneId && this.player?.quest?.npcSceneFlags?.[sceneId]);
  }

  markNpcSceneSeen(sceneId) {
    if (!sceneId || !this.player) {
      return;
    }
    this.player.quest.npcSceneFlags[sceneId] = true;
  }

  hasStoryBeatFlag(flagId) {
    return Boolean(flagId && this.player?.quest?.storyBeatFlags?.[flagId]);
  }

  markStoryBeatFlag(flagId) {
    if (!flagId || !this.player) {
      return;
    }
    this.player.quest.storyBeatFlags[flagId] = true;
  }

  getDiscoveryAt(x, y, level = this.currentLevel) {
    if (!level?.discoveries) {
      return null;
    }
    return level.discoveries.find((entry) => entry.x === x && entry.y === y) || null;
  }

  addLevelDiscovery(level, discoveryId, x, y, extra = {}) {
    const definition = this.getDiscoveryDef(discoveryId);
    if (!level || !definition) {
      return null;
    }
    level.discoveries = Array.isArray(level.discoveries) ? level.discoveries : [];
    const discovery = {
      id: discoveryId,
      title: definition.title,
      label: definition.label,
      text: definition.text,
      summary: definition.summary,
      propId: definition.propId || "loreBook",
      x,
      y,
      read: false,
      ...extra
    };
    level.discoveries.push(discovery);
    const tile = getTile(level, x, y);
    setTile(level, x, y, tileDef(tile?.kind || "floor", {
      ...(tile || {}),
      discoveryId,
      label: definition.label
    }));
    addLevelProp(level, {
      id: `discovery-${discoveryId}-${x}-${y}`,
      x,
      y,
      propId: discovery.propId,
      layer: "fixture",
      alwaysVisible: false,
      light: definition.kind === "oath" || definition.kind === "inscription"
    });
    return discovery;
  }

  findDiscoverySpot(level, room, anchor = null) {
    if (!level || !room) {
      return null;
    }
    const candidatePoints = anchor
      ? [
          { x: anchor.x + 1, y: anchor.y },
          { x: anchor.x - 1, y: anchor.y },
          { x: anchor.x, y: anchor.y + 1 },
          { x: anchor.x, y: anchor.y - 1 }
        ]
      : [];
    for (const point of candidatePoints) {
      const tile = getTile(level, point.x, point.y);
      if (tile?.walkable && !actorAt(level, point.x, point.y) && itemsAt(level, point.x, point.y).length === 0) {
        return point;
      }
    }
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const point = randomRoomTile(room);
      const tile = getTile(level, point.x, point.y);
      if (tile?.walkable && !tile.objectiveId && !tile.optionalId && !actorAt(level, point.x, point.y) && itemsAt(level, point.x, point.y).length === 0) {
        return point;
      }
    }
    return null;
  }

  placeAmbientDiscoveries(level, depth, rooms) {
    const discoveryPool = depth <= 2
      ? ["barracks_roll", "shrine_inscription"]
      : depth <= 4
        ? ["shrine_inscription", "memorial_slate"]
        : ["weather_log", "memorial_slate"];
    if (!rooms || rooms.length === 0) {
      return;
    }
    const ambientId = choice(discoveryPool);
    let room = choice(rooms);
    if (depth === 1 && level.floorObjective?.marker) {
      const route = this.findPathRouteOnLevel(level, level.start, level.floorObjective.marker) || [];
      const supportPoint = route[Math.min(route.length - 1, 10)] || null;
      const supportRoomIndex = this.getRoomIndexForPoint(level, supportPoint);
      if (supportRoomIndex !== null && supportRoomIndex !== undefined && level.rooms?.[supportRoomIndex]) {
        room = level.rooms[supportRoomIndex];
      }
    }
    const point = this.findDiscoverySpot(level, room);
    if (ambientId && point) {
      this.addLevelDiscovery(level, ambientId, point.x, point.y, { roomIndex: level.rooms.indexOf(room), ambient: true });
    }
  }

  renderStorySceneMarkup(scene) {
    return `
      <div class="section-block text-block">${escapeHtml(scene.chapterObjective || "")}</div>
      <div class="section-block">
        ${scene.scene.map((entry) => {
          const npc = this.getStoryNpc(entry.speaker);
          return `
            <div class="shop-row">
              <div>
                <div><strong>${escapeHtml(npc ? `${npc.name}, ${npc.title}` : "Voice")}</strong></div>
                <div class="muted">${escapeHtml(entry.text)}</div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
      <div class="modal-actions">
        <button class="menu-button" data-action="close-modal" data-focus-key="story:continue" type="button">Continue</button>
      </div>
    `;
  }

  showStoryScene(beatId, phase = "scene") {
    const beat = this.getStoryBeat(beatId);
    if (!beat) {
      return false;
    }
    const lines = phase === "return" ? beat.returnScene : beat.scene;
    if (!Array.isArray(lines) || lines.length === 0) {
      return false;
    }
    const sceneId = phase === "return" ? `${beatId}:return` : beatId;
    this.markBriefingSeen(sceneId);
    this.markNpcSceneSeen(sceneId);
    this.recordChronicleEvent("story_scene", {
      label: phase === "return" ? `${beat.title}: town reaction.` : `${beat.title}: briefing received.`
    });
    this.mode = "modal";
    this.showSimpleModal(beat.title, this.renderStorySceneMarkup({
      chapterObjective: beat.chapterObjective,
      scene: lines
    }), {
      surfaceKey: `story:${sceneId}`,
      focusTarget: "story:continue"
    });
    return true;
  }

  maybeShowTownStoryScene() {
    if (!this.player || this.currentDepth !== 0) {
      return false;
    }
    if (this.player.quest.milestonesCleared.includes("depth5_cryptlord") && !this.hasSeenNpcScene("depth5:return")) {
      return this.showStoryScene("depth5", "return");
    }
    if (this.player.quest.milestonesCleared.includes("depth3_gatekeeper") && !this.hasSeenNpcScene("depth3:return")) {
      return this.showStoryScene("depth3", "return");
    }
    return false;
  }

  readDiscovery(discovery) {
    if (!discovery || !this.player) {
      return false;
    }
    if (!this.player.quest.discoveryIdsFound.includes(discovery.id)) {
      this.player.quest.discoveryIdsFound.push(discovery.id);
      this.recordChronicleEvent("discovery_found", {
        label: discovery.title
      });
    }
    discovery.read = true;
    this.mode = "modal";
    this.showSimpleModal(discovery.title, `
      <div class="section-block text-block">${escapeHtml(discovery.text)}</div>
      <div class="section-block text-block muted">${escapeHtml(discovery.summary)}</div>
      <div class="modal-actions">
        <button class="menu-button" data-action="close-modal" data-focus-key="discovery:continue" type="button">Continue</button>
      </div>
    `, {
      surfaceKey: `discovery:${discovery.id}`,
      focusTarget: "discovery:continue"
    });
    this.log(`${discovery.title} recorded in your journal.`, "good");
    return true;
  }

  getKnownDiscoveryLines(limit = 5) {
    const knownIds = this.player?.quest?.discoveryIdsFound || [];
    return knownIds
      .map((id) => this.getDiscoveryDef(id))
      .filter(Boolean)
      .slice(-limit)
      .reverse()
      .map((entry) => `${entry.title}: ${entry.summary}`);
  }

  getNamedLootLines(limit = 4) {
    this.ensureQuestReactionState();
    const history = this.player?.quest?.namedLootHistory || [];
    return history
      .slice(-limit)
      .reverse()
      .map((entry) => {
        const [affixId, itemId] = String(entry).split(":");
        const affix = LOOT_AFFIX_DEFS[affixId];
        const item = ITEM_DEFS[itemId];
        if (affix && item) {
          return `${affix.name} ${item.name}`;
        }
        return item?.name || entry;
      });
  }

  getTownReactionLines(serviceId = "") {
    return getTownReactionBundle(this, serviceId);
  }

  getReinforcementProfileLabel(profile = this.currentLevel?.reinforcementProfile) {
    switch (profile) {
      case "summons":
        return "summoning wave";
      case "formed":
        return "formed warband";
      case "quiet":
        return "quiet floor";
      default:
        return "hunter wave";
    }
  }

  getCombatFeedLines(limit = 2) {
    if (!this.player || !this.currentLevel || this.currentDepth === 0) {
      return [];
    }
    const lines = [];
    const visible = this.getSortedVisibleEnemies();
    visible.slice(0, Math.max(1, limit)).forEach((monster) => {
      const health = getMonsterHealthState(monster);
      const intent = monster.intent ? this.getMonsterIntentLabel(monster).toLowerCase() : this.getMonsterRoleLabel(monster).toLowerCase();
      lines.push(`${monster.name}: ${health.label.toLowerCase()} | ${intent}.`);
    });
    const visibleElite = visible.find((monster) => monster.elite);
    const visibleRaiser = visible.find((monster) => monster.behaviorKit === "corpse_raiser");
    const roomEvent = this.currentLevel.roomEvents?.find((event) => event.status !== "cleared") || null;
    const objective = this.currentLevel.floorObjective;
    if (visibleElite) {
      const behavior = ENEMY_BEHAVIOR_KITS[visibleElite.behaviorKit]?.short || this.getMonsterRoleLabel(visibleElite);
      lines.push(`${visibleElite.name} is active | ${behavior}.`);
    }
    const visibleSpecialist = visible.find((monster) => !monster.elite && monster.behaviorKit);
    if (!visibleElite && visibleSpecialist) {
      const behavior = ENEMY_BEHAVIOR_KITS[visibleSpecialist.behaviorKit];
      if (behavior) {
        lines.push(`${behavior.label}: ${behavior.tell}`);
      }
    }
    if (roomEvent) {
      const blockers = this.getRoomEventBlockers(roomEvent);
      lines.push(blockers > 0
        ? `${roomEvent.label}: ${blockers} defender${blockers === 1 ? "" : "s"} still hold the room.`
        : `${roomEvent.label}: open to resolve at the marker.`);
    }
    if (objective && objective.roomIndex !== null && objective.roomIndex !== undefined) {
      const remaining = this.currentLevel.actors.filter((monster) => monster.roomIndex === objective.roomIndex && monster.hp > 0).length;
      lines.push(remaining > 0
        ? `${objective.label}: ${remaining} guard${remaining === 1 ? "" : "s"} remain in the objective room.`
        : `${objective.label}: objective room is clear.`);
    }
    if (this.currentLevel.floorResolved) {
      const extractDirection = this.currentLevel.stairsUp ? this.getDirectionToPoint(this.currentLevel.stairsUp) : "back";
      if (this.currentLevel.floorOptional && !this.currentLevel.floorOptional.opened && this.currentLevel.floorOptional.marker) {
        lines.push(`Objective clear. Extract ${extractDirection} or stay greedy for ${this.currentLevel.floorOptional.label}.`);
      } else {
        lines.push(`Objective clear. Stairs up ${extractDirection} bank the floor now.`);
      }
    }
    if (this.currentLevel.floorSpecialSummary) {
      lines.push(this.currentLevel.floorSpecialSummary);
    }
    if (this.getCurrentRouteCueText()) {
      lines.push(this.getCurrentRouteCueText());
    }
    if (this.getImmediateDangerNote()) {
      lines.push(this.getImmediateDangerNote());
    }
    if (visibleRaiser && (this.currentLevel.corpses?.length || 0) > 0) {
      lines.push("Fresh corpses are on the floor. Expect raised dead.");
    }
    if ((this.reinforcementClock || 0) <= 4) {
      const turns = Math.max(0, this.reinforcementClock || 0);
      lines.push(`Reinforcements in ${turns} turn${turns === 1 ? "" : "s"} | ${this.getReinforcementProfileLabel()}.`);
    }
    return [...new Set(lines)].slice(0, limit);
  }

  getCurrentChapterObjective() {
    if (this.player?.quest?.complete) {
      return STORY_BEATS.return.chapterObjective;
    }
    if (this.player?.quest?.hasRunestone) {
      return "Return the Runestone to town and hear the valley's first true account of the keep's fall.";
    }
    if (this.player?.quest?.milestonesCleared.includes("depth5_cryptlord")) {
      return STORY_BEATS.depth7.chapterObjective;
    }
    if (this.player?.quest?.milestonesCleared.includes("depth3_gatekeeper")) {
      return STORY_BEATS.depth5.chapterObjective;
    }
    return STORY_BEATS.intro.chapterObjective;
  }

  getActiveBriefingText() {
    if (this.player?.quest?.complete) {
      return STORY_BEATS.return.journal;
    }
    if (this.player?.quest?.milestonesCleared.includes("depth5_cryptlord")) {
      return STORY_BEATS.depth5.journal;
    }
    if (this.player?.quest?.milestonesCleared.includes("depth3_gatekeeper")) {
      return STORY_BEATS.depth3.journal;
    }
    return STORY_BEATS.intro.journal;
  }

  placeMilestoneEncounter(level, depth, sourceRooms) {
    const milestoneDef = this.getMilestoneDefinitionForDepth(depth);
    if (!milestoneDef || !sourceRooms || sourceRooms.length === 0) {
      return null;
    }
    const room = depth === DUNGEON_DEPTH
      ? level.rooms[level.rooms.length - 1]
      : sourceRooms[sourceRooms.length - 1];
    const roomIndex = level.rooms.indexOf(room);
    if (!room || roomIndex < 0) {
      return null;
    }

    const marker = centerOf(room);
    const corners = [
      { x: room.x + 1, y: room.y + 1 },
      { x: room.x + room.w - 2, y: room.y + 1 },
      { x: room.x + 1, y: room.y + room.h - 2 },
      { x: room.x + room.w - 2, y: room.y + room.h - 2 }
    ];
    corners.forEach((point, index) => {
      addLevelProp(level, {
        id: `milestone-torch-${depth}-${index}`,
        x: point.x,
        y: point.y,
        propId: depth === DUNGEON_DEPTH ? "shrineTorch" : "roomTorch",
        layer: "fixture",
        light: true
      });
    });

    const centerpieceProp = depth === 3
      ? "shrineSeal"
      : depth === 5
        ? "bloodAltar"
        : "relicPedestal";
    addLevelProp(level, {
      id: `milestone-center-${depth}`,
      x: marker.x,
      y: marker.y,
      propId: centerpieceProp,
      layer: "fixture",
      light: true
    });
    setTile(level, marker.x, marker.y, tileDef(depth === 5 ? "throne" : "altar", { label: milestoneDef.roomLabel }));

    level.reservedRoomIndexes = [...new Set([...(level.reservedRoomIndexes || []), roomIndex])];
    level.discoveries = Array.isArray(level.discoveries) ? level.discoveries : [];
    level.milestone = {
      ...milestoneDef,
      status: "active",
      roomIndex,
      marker,
      rewardClaimed: false
    };

    const bossTemplate = MONSTER_DEFS.find((monster) => monster.id === milestoneDef.bossId);
    const spawnPoints = [
      { x: marker.x + 1, y: marker.y },
      { x: marker.x - 1, y: marker.y },
      { x: marker.x, y: marker.y - 1 },
      { x: marker.x, y: marker.y + 1 }
    ];
    const bossSpot = spawnPoints.find((point) => isWalkable(level, point.x, point.y) && !actorAt(level, point.x, point.y))
      || randomRoomTile(room);
    if (bossTemplate && bossSpot && !actorAt(level, bossSpot.x, bossSpot.y)) {
      const boss = createMonster(bossTemplate, bossSpot.x, bossSpot.y);
      boss.milestoneBoss = true;
      boss.milestoneId = milestoneDef.id;
      boss.sleeping = false;
      boss.alerted = 8;
      boss.elite = true;
      boss.roomIndex = roomIndex;
      level.actors.push(boss);
    }

    const guardIds = depth === 3
      ? ["orc", "skeleton"]
      : depth === 5
        ? ["wraith", "shaman", "skeleton"]
        : ["warlock", "wraith"];
    guardIds.forEach((monsterId, index) => {
      const template = MONSTER_DEFS.find((monster) => monster.id === monsterId);
      const point = corners[index % corners.length];
      if (!template || !point || !isWalkable(level, point.x, point.y) || actorAt(level, point.x, point.y)) {
        return;
      }
      const guard = createMonster(template, point.x, point.y);
      guard.sleeping = false;
      guard.alerted = 8;
      guard.roomIndex = roomIndex;
      level.actors.push(guard);
    });

    if (depth === DUNGEON_DEPTH) {
      level.items.push({ ...createItem("runestone"), x: marker.x, y: marker.y });
    }

    const discoverySpot = this.findDiscoverySpot(level, room, marker);
    if (milestoneDef.discoveryId && discoverySpot) {
      this.addLevelDiscovery(level, milestoneDef.discoveryId, discoverySpot.x, discoverySpot.y, {
        roomIndex,
        milestoneId: milestoneDef.id
      });
    }

    return level.milestone;
  }

  placeDungeonContent(level, depth) {
    const safeEntryRoomIndexes = new Set(level.safeEntryRoomIndexes || [0]);
    const allContentRooms = level.rooms.slice(1);
    const milestone = this.placeMilestoneEncounter(level, depth, allContentRooms);
    const reservedRoomIndexes = new Set(level.reservedRoomIndexes || []);
    const contentRooms = level.rooms.filter((room, index) => index > 0 && !reservedRoomIndexes.has(index));
    const spawnRooms = level.rooms.filter((room, index) => index > 0 && !safeEntryRoomIndexes.has(index) && !reservedRoomIndexes.has(index));
    const activeSpawnRooms = spawnRooms.length > 0 ? spawnRooms : contentRooms;
    const encounterState = populateDungeonEncounters(level, depth);
    level.tutorialFloor = depth === 1 && (this.player?.deepestDepth || 0) === 0;
    setupFloorDirectives(level, depth, this.townUnlocks);
    this.placeRoomEvent(level, depth, contentRooms);

    const itemCount = 5 + depth;
    for (let i = 0; i < itemCount; i += 1) {
      const room = choice(contentRooms);
      const position = randomRoomTile(room);
      const tile = getTile(level, position.x, position.y);
      if (isOccupied(level, position.x, position.y) || itemsAt(level, position.x, position.y).length > 0 || tile.objectiveId || tile.optionalId || tile.roomEventId || tile.kind !== "floor") {
        continue;
      }
      level.items.push({ ...rollTreasure({ depth, quality: depth >= 4 ? "guarded" : "" }), x: position.x, y: position.y });
    }

    for (let i = 0; i < 3 + Math.floor(depth / 2); i += 1) {
      const room = choice(contentRooms);
      const position = randomRoomTile(room);
      const tile = getTile(level, position.x, position.y);
      if (isWalkable(level, position.x, position.y) && !tile.objectiveId && !tile.optionalId && !tile.roomEventId && tile.kind === "floor") {
        level.items.push({ x: position.x, y: position.y, kind: "gold", name: "Gold", amount: randInt(5, 12) * depth });
      }
    }

    if (depth === 1 && contentRooms.length > 0) {
      const route = level.floorObjective?.marker
        ? this.findPathRouteOnLevel(level, level.start, level.floorObjective.marker) || []
        : [];
      const supportPoint = route[Math.min(route.length - 1, 10)] || null;
      const supportRoomIndex = this.getRoomIndexForPoint(level, supportPoint);
      const supportRoom = supportRoomIndex !== null && supportRoomIndex !== undefined && level.rooms?.[supportRoomIndex]
        ? level.rooms[supportRoomIndex]
        : null;
      const earlyLootRoom = supportRoom || contentRooms[0];
      const heavyLootSpot = randomRoomTile(earlyLootRoom);
      if (isWalkable(level, heavyLootSpot.x, heavyLootSpot.y) && itemsAt(level, heavyLootSpot.x, heavyLootSpot.y).length === 0) {
        level.items.push({ ...createItem("rustedMail", { identified: true }), x: heavyLootSpot.x, y: heavyLootSpot.y });
      }
      const quickLootRoom = supportRoom || contentRooms[Math.min(1, contentRooms.length - 1)];
      const quickLootSpot = randomRoomTile(quickLootRoom);
      if (isWalkable(level, quickLootSpot.x, quickLootSpot.y) && itemsAt(level, quickLootSpot.x, quickLootSpot.y).length === 0) {
        level.items.push({ ...createItem("healingPotion", { identified: true }), x: quickLootSpot.x, y: quickLootSpot.y });
      }
    }

    if (depth !== DUNGEON_DEPTH) {
      this.placeAmbientDiscoveries(level, depth, contentRooms);
    }

    const featureRooms = activeSpawnRooms.slice(0, Math.max(3, Math.floor(activeSpawnRooms.length / 2)));
    featureRooms.slice(0, Math.min(4, featureRooms.length)).forEach((room, index) => {
      const corner = [
        { x: room.x + 1, y: room.y + 1 },
        { x: room.x + room.w - 2, y: room.y + room.h - 2 }
      ][index % 2];
      addLevelProp(level, {
        id: `ambient-torch-${depth}-${index}`,
        x: corner.x,
        y: corner.y,
        propId: "roomTorch",
        layer: "fixture",
        light: true
      });
    });
    for (let i = 0; i < 3 + depth; i += 1) {
      const room = choice(featureRooms);
      const position = randomRoomTile(room);
      const tile = getTile(level, position.x, position.y);
      if (isWalkable(level, position.x, position.y) && tile.kind === "floor" && !tile.objectiveId && !tile.optionalId) {
        setTile(level, position.x, position.y, tileDef("trap", { hidden: Math.random() < 0.55, trapEffect: choice(["dart", "poison", "teleport", "alarm", "trapdoor", "arrow", "summon"]) }));
      }
    }

    if (Math.random() < 0.85) {
      const room = choice(featureRooms);
      const position = randomRoomTile(room);
      if (getTile(level, position.x, position.y).kind === "floor") {
        setTile(level, position.x, position.y, tileDef("fountain", { featureUsed: false, featureEffect: choice(["heal", "mana", "poison", "vision", "damage"]) }));
      }
    }

    if (depth >= 2 && Math.random() < 0.65) {
      const room = choice(featureRooms);
      const position = randomRoomTile(room);
      if (getTile(level, position.x, position.y).kind === "floor") {
        setTile(level, position.x, position.y, tileDef("throne", { featureUsed: false, featureEffect: choice(["gold", "exp", "curse", "summon", "teleport"]) }));
      }
    }

    addSetPiece(level, depth);
    addSecretVault(level, depth);

    if (milestone) {
      level.description = milestone.roomLabel;
    }

    this.prepareGuidedRouteState(level, depth);
    level.floorTheme = encounterState.theme.id;
    level.floorThemeName = encounterState.theme.name;
    level.encounterSummary = getEncounterSummary(level);
  }

  placePlayerAt(x, y) {
    this.player.x = x;
    this.player.y = y;
    syncFloorState(this);
    syncDangerState(this);
    if (this.currentLevel?.kind === "dungeon" && (!this.currentLevel.guidance || !this.currentLevel.routeGuide)) {
      this.prepareGuidedRouteState(this.currentLevel, this.currentDepth);
    }
    this.syncRouteGuideState(this.currentLevel);
    this.updateFov();
    this.applyIntroFloorRecon();
    this.updateMonsterIntents();
  }

  getEventRewardTile(roomEvent) {
    return roomEvent?.marker || { x: this.player.x, y: this.player.y };
  }

  grantRoomEventReward(roomEvent) {
    if (!roomEvent || roomEvent.rewardClaimed) {
      return false;
    }
    const reward = roomEvent.reward || {};
    const drop = this.getEventRewardTile(roomEvent);
    if (reward.type === "item") {
      const primary = createItem(reward.itemId, { identified: true });
      if (primary) {
        this.currentLevel.items.push({ ...primary, x: drop.x, y: drop.y });
        this.recordNamedLoot(primary);
      }
      if (reward.extraItemId) {
        const extra = createItem(reward.extraItemId, { identified: true });
        if (extra) {
          this.currentLevel.items.push({ ...extra, x: drop.x, y: drop.y });
        }
      }
    } else if (reward.type === "treasure") {
      const treasure = rollTreasure({ depth: Math.min(DUNGEON_DEPTH, this.currentDepth + 1), quality: reward.quality || "elite" });
      if (treasure) {
        this.currentLevel.items.push({ ...treasure, x: drop.x, y: drop.y });
        this.recordNamedLoot(treasure);
      }
    } else if (reward.type === "spellbook") {
      const spellbooks = Object.values(ITEM_DEFS).filter((item) => item.kind === "spellbook");
      const unknown = spellbooks.filter((item) => !this.player.spellsKnown.includes(item.spell));
      const template = choice(unknown.length > 0 ? unknown : spellbooks);
      if (template) {
        const book = createItem(template.id, { identified: true });
        this.currentLevel.items.push({ ...book, x: drop.x, y: drop.y });
      }
    } else if (reward.type === "mana") {
      this.player.mana = this.player.maxMana;
      this.currentLevel.items.push({ ...createItem("manaPotion", { identified: true }), x: drop.x, y: drop.y });
    }
    roomEvent.rewardClaimed = true;
    roomEvent.status = "cleared";
    if (this.currentLevel.signatureEncounter?.id === roomEvent.id) {
      this.currentLevel.signatureEncounter = {
        ...this.currentLevel.signatureEncounter,
        summary: `${roomEvent.label} has been resolved.`
      };
    }
    this.recordChronicleEvent("room_event_clear", {
      label: roomEvent.label,
      depth: this.currentDepth
    });
    return true;
  }

  handleRoomEventInteraction(tile) {
    const roomEvent = this.getCurrentRoomEvent();
    if (!roomEvent || roomEvent.status === "cleared") {
      return false;
    }
    const blockers = this.getRoomEventBlockers(roomEvent);
    if (blockers > 0 && roomEvent.eventType !== "ritual") {
      this.log(`${roomEvent.label} is still contested. ${blockers} defender${blockers === 1 ? "" : "s"} remain.`, "warning");
      return true;
    }
    if (roomEvent.id === "failed_summoning") {
      this.player.mana = Math.min(this.player.maxMana, this.player.mana + Math.max(6, Math.floor(this.player.maxMana * 0.45)));
      this.makeNoise(8, this.player, "room_event");
      if (Math.random() < 0.45) {
        this.summonMonsterNearWithCap(this.player.x, this.player.y, weightedMonster(this.currentDepth));
        this.log("The ritual lashes back and spits a body into the room.", "bad");
      } else {
        this.log(roomEvent.rewardText, "good");
      }
      this.grantRoomEventReward(roomEvent);
      return true;
    }
    if (roomEvent.id === "cursed_library") {
      this.log(roomEvent.rewardText, "good");
      if (Math.random() < 0.35) {
        curseRandomCarriedItem(this.player);
        this.log("One of the recovered pages bites back with a curse.", "bad");
      }
      this.grantRoomEventReward(roomEvent);
      this.makeNoise(5, this.player, "room_event");
      return true;
    }
    if (roomEvent.id === "sealed_reliquary" || roomEvent.id === "barricaded_hold") {
      this.log(roomEvent.rewardText, "good");
      this.grantRoomEventReward(roomEvent);
      this.increaseDanger("room_event", 2);
      this.makeNoise(7, this.player, "room_event");
      return true;
    }
    if (roomEvent.id === "wounded_survivor") {
      this.log(roomEvent.rewardText, "good");
      this.grantRoomEventReward(roomEvent);
      grantObjectiveRumor(this);
      addRumorToken(this, 1);
      return true;
    }
    if (roomEvent.eventType === "cache" || roomEvent.eventType === "eliteRoom") {
      this.log(roomEvent.rewardText, "good");
      this.grantRoomEventReward(roomEvent);
      this.increaseDanger("room_event", 2);
      this.makeNoise(6, this.player, "room_event");
      return true;
    }
    if (roomEvent.eventType === "library") {
      this.log(roomEvent.rewardText, "good");
      if (Math.random() < 0.2) {
        curseRandomCarriedItem(this.player);
        this.log("An old ward snaps across your pack as you pull the archive apart.", "bad");
      }
      this.grantRoomEventReward(roomEvent);
      this.makeNoise(4, this.player, "room_event");
      return true;
    }
    if (roomEvent.eventType === "rescue") {
      this.log(roomEvent.rewardText, "good");
      this.grantRoomEventReward(roomEvent);
      addRumorToken(this, 1);
      return true;
    }
    return false;
  }

  getArmorValue() {
    const stats = this.getActorStats(this.player);
    let armor = this.getArmorValueForStats(stats);
    Object.values(this.player.equipment).forEach((item) => {
      if (item && item.armor) {
        armor += getItemArmor(item);
      }
    });
    armor += getBuildArmorBonus(this);
    return armor;
  }

  getGuardValue() {
    const total = Object.values(this.player.equipment).reduce((sum, item) => sum + (item ? getItemGuardBonus(item) : 0), 0);
    return Math.max(0, total - ((this.player.guardBrokenTurns || 0) > 0 ? 2 : 0));
  }

  getWardValue() {
    let ward = Object.values(this.player.equipment).reduce((sum, item) => sum + (item ? getItemWardBonus(item) : 0), 0);
    if ((this.player.arcaneWardTurns || 0) > 0) {
      ward += 2;
    }
    return ward;
  }

  getFireResistValue() {
    let resist = Object.values(this.player.equipment).reduce((sum, item) => sum + (item ? getItemFireResist(item) : 0), 0);
    if ((this.player.resistFireTurns || 0) > 0) {
      resist += 2;
    }
    return resist;
  }

  getColdResistValue() {
    let resist = Object.values(this.player.equipment).reduce((sum, item) => sum + (item ? getItemColdResist(item) : 0), 0);
    if ((this.player.resistColdTurns || 0) > 0) {
      resist += 2;
    }
    return resist;
  }

  getMeleeAccuracyBonus() {
    const weapon = this.player.equipment.weapon;
    return weapon ? getItemAccuracyBonus(weapon) : 0;
  }

  getMeleeCritBonus() {
    const weapon = this.player.equipment.weapon;
    return weapon ? getItemCritBonus(weapon) : 0;
  }

  getAttackValue() {
    const weapon = this.player.equipment.weapon;
    const base = weapon ? getItemPower(weapon) : 2;
    return this.getAttackValueForStats(this.getActorStats(this.player), base) + this.getMeleeAccuracyBonus();
  }

  getDamageRange() {
    const weapon = this.player.equipment.weapon;
    const base = weapon ? getItemPower(weapon) : 2;
    return this.getDamageRangeForStats(this.getActorStats(this.player), base);
  }

  getEvadeValue() {
    let evade = this.getEvadeValueForStats(this.getActorStats(this.player));
    evade -= this.getEncumbranceTier() * 2;
    Object.values(this.player.equipment).forEach((item) => {
      if (item && item.dexPenalty) {
        evade -= item.dexPenalty;
      }
    });
    evade += getBuildEvadeBonus(this);
    return evade;
  }

  getSearchPower() {
    const gearBonus = Object.values(this.player.equipment).reduce((sum, item) => sum + (item ? getItemSearchBonus(item) : 0), 0);
    return this.getSearchPowerForStats(this.getActorStats(this.player), this.player.level) + getBuildSearchBonus(this) + gearBonus;
  }

  getLightRadius() {
    let radius = FOV_RADIUS;
    Object.values(this.player.equipment).forEach((item) => {
      if (item && item.lightBonus) {
        radius += getItemLightBonus(item);
      }
    });
    if ((this.player.lightBuffTurns || 0) > 0) {
      radius += 2;
    }
    return radius;
  }

  getEncumbranceTier() {
    const baseTier = getEncumbranceTier(this.player);
    const activeContract = this.getActiveContract(true);
    if (activeContract?.id === "greedy_burden" && baseTier > 0) {
      return Math.min(2, baseTier + 1);
    }
    return baseTier;
  }

  getSpellDamageBonus(defender, damageType = "magic") {
    return getBuildDamageBonus(this, defender, damageType);
  }

  getAntiUndeadBonus() {
    return Object.values(this.player.equipment).reduce((sum, item) => sum + (item ? getItemBonusVsUndead(item) : 0), 0);
  }

  getOvercastRelief() {
    return Object.values(this.player.equipment).reduce((sum, item) => sum + (item ? getItemOvercastRelief(item) : 0), 0);
  }

  getPlayerMoveSpeed() {
    if (!this.player) {
      return 100;
    }
    let speed = this.getMoveSpeedForStats(this.getActorStats(this.player));
    const encumbrance = this.getEncumbranceTier();
    if (encumbrance === 1) {
      speed -= 10;
    } else if (encumbrance >= 2) {
      speed -= 22;
    }
    if (this.player.relics?.includes("fleet_boots")) {
      speed += 10;
    }
    if ((this.player.slowed || 0) > 0) {
      speed = Math.round(speed * 0.5);
    }
    return clamp(speed, 45, 140);
  }

  consumePlayerMoveTurnBudget() {
    if (!this.player) {
      return 1;
    }
    const speed = this.player.moveSpeed || this.getPlayerMoveSpeed();
    const moveCost = 10000 / Math.max(45, speed);
    this.player.moveTurnBudget = (this.player.moveTurnBudget || 0) + moveCost;
    const monsterActions = Math.floor(this.player.moveTurnBudget / 100);
    this.player.moveTurnBudget -= monsterActions * 100;
    return monsterActions;
  }

  recalculateDerivedStats() {
    const stats = this.getActorStats(this.player);
    const bonusMana = Object.values(this.player.equipment).reduce((sum, item) => sum + (item ? getItemManaBonus(item) : 0), 0);
    const maxMana = this.getMaxManaForStats(stats, this.player.className, bonusMana + getBuildMaxManaBonus(this), this.getPlayerManaBase(this.player));
    const maxHp = this.getMaxHpForStats(stats, this.player.level, this.player.className, this.player.constitutionLoss || 0, this.getPlayerHpBase(this.player) + getBuildMaxHpBonus(this));
    const hpRatio = this.player.maxHp > 0 ? this.player.hp / this.player.maxHp : 1;
    const manaRatio = this.player.maxMana > 0 ? this.player.mana / this.player.maxMana : 1;
    this.player.effectiveStats = stats;
    this.player.maxHp = maxHp;
    this.player.maxMana = maxMana;
    this.player.hp = Math.max(1, Math.round(this.player.maxHp * hpRatio));
    this.player.mana = Math.max(0, Math.round(this.player.maxMana * manaRatio));
    this.player.moveSpeed = this.getPlayerMoveSpeed();
    this.player.lightRadius = this.getLightRadius();
  }

  tryMovePlayer(dx, dy) {
    if ((this.player.held || 0) > 0) {
      this.resetMovementCadence({ clearHeld: false });
      this.log("You strain against a holding spell and fail to move.", "warning");
      this.endTurn();
      return;
    }
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;
    if (!inBounds(this.currentLevel, nx, ny)) {
      this.resetMovementCadence({ clearHeld: false });
      return;
    }
    const monster = actorAt(this.currentLevel, nx, ny);
    if (monster) {
      this.resetMovementCadence({ clearHeld: false });
      this.attack(this.player, monster);
      this.endTurn();
      return;
    }

    const tile = getTile(this.currentLevel, nx, ny);
    if (!tile.walkable) {
      this.resetMovementCadence({ clearHeld: false });
      if (tile.kind === "sign") {
        this.log(tile.label, "warning");
        this.render();
      }
      return;
    }

    this.player.x = nx;
    this.player.y = ny;
    this.noteSuccessfulMove();
    this.trackFirstPlayerMove(nx, ny);
    this.flashTile(nx, ny, "#ffd36b", 120, { alpha: 0.12, decorative: true });
    onPlayerMove(this);
    this.audio.play("move");
    const current = getTile(this.currentLevel, nx, ny);
    this.handleTileEntry(current);
    if (current.kind === "stairDown") {
      this.resetMovementCadence();
      this.useStairs("down");
      return;
    }
    if (current.kind === "stairUp") {
      this.resetMovementCadence();
      this.useStairs("up");
      return;
    }
    this.pickupHere(true, true);
    if (this.pendingPickupPrompt) {
      this.resetMovementCadence();
      this.render();
      return;
    }
    if (current.kind === "buildingDoor" && current.service) {
      this.resetMovementCadence();
      this.openTownService(current.service);
    }
    this.endTurn({ monsterActions: this.consumePlayerMoveTurnBudget() });
  }

  handleTileEntry(tile) {
    const firstTownRun = this.currentDepth === 0 && (this.player.deepestDepth || 0) === 0;
    if (this.currentDepth > 0) {
      this.maybeTriggerRouteBeat(this.currentLevel);
    }
    this.trackObjectiveProgress(tile);
    this.trackOptionalProgress(tile);
    if (firstTownRun && tile.kind === "road" && this.player.y <= 12 && !this.storyFlags.keepPromptShown) {
      this.storyFlags.keepPromptShown = true;
      this.log(this.storyFlags.townServiceVisited
        ? "The keep stairs are directly ahead. Stay on the north road to descend."
        : "The keep stairs are ahead. Check one town door first, then return to the north road.", "warning");
    }
    if (this.currentDepth === 0 && tile.kind === "buildingDoor" && tile.service && !this.storyFlags.servicePromptShown) {
      this.storyFlags.servicePromptShown = true;
      this.log("Town doors open services immediately. Step onto any labeled doorway to trade, heal, identify, or bank gold.", "warning");
    }
    if (tile.objectiveId) {
      this.markOnboarding("find_objective");
      const objective = this.currentLevel?.floorObjective;
      const blockers = getObjectiveDefendersRemaining(this.currentLevel);
      const interaction = this.getObjectiveInteractionPromptData(objective, blockers);
      if (objective?.id === "rescue_captive" && getObjectiveRoomClear(this)) {
        handleObjectiveInteraction(this, tile);
        return;
      }
      this.log(interaction?.roomDetail || `${interaction?.label || "Objective"} is here.`, interaction?.tone || "warning");
      return;
    }
    if (tile.optionalId) {
      this.log(`${tile.label || "Temptation"} waits here. Greed will raise the floor's danger.`, "warning");
      return;
    }
    if (tile.discoveryId) {
      const discovery = this.getDiscoveryDef(tile.discoveryId);
      const verb = this.player.quest.discoveryIdsFound.includes(tile.discoveryId) ? "review" : "read";
      this.log(`${discovery ? discovery.label : "An inscription"} is here. Press U to ${verb} it.`, "warning");
      return;
    }
    if (tile.roomEventId) {
      const roomEvent = this.getCurrentRoomEvent();
      const blockers = this.getRoomEventBlockers(roomEvent);
      const blockerText = blockers > 0 && roomEvent?.eventType !== "ritual"
        ? ` ${blockers} defender${blockers === 1 ? "" : "s"} remain before it is safe.`
        : "";
      this.log(`${roomEvent ? roomEvent.roomHint : tile.label} Press U to resolve it.${blockerText}`, "warning");
      return;
    }
    if (tile.kind === "altar") {
      if (tile.featureEffect) {
        this.log("A shrine waits here. Press U to risk a bargain.", "warning");
      } else {
        this.log("An ancient altar dominates this chamber. Something important rests nearby.", "warning");
      }
      return;
    }
    if (tile.kind === "trap") {
      this.triggerTrap(tile, this.player.x, this.player.y);
      return;
    }
    if (tile.kind === "fountain") {
      this.log("A stone fountain bubbles here. Press U to drink.", "warning");
      return;
    }
    if (tile.kind === "throne") {
      this.log("A lonely throne stands here. Press U to sit.", "warning");
    }
  }

  interactHere() {
    const tile = getTile(this.currentLevel, this.player.x, this.player.y);
    const discovery = tile?.discoveryId ? this.getDiscoveryAt(this.player.x, this.player.y) : null;
    if (discovery && this.readDiscovery(discovery)) {
      this.render();
      return;
    }
    if (tile?.roomEventId && this.handleRoomEventInteraction(tile)) {
      this.endTurn();
      return;
    }
    if (handleObjectiveInteraction(this, tile)) {
      this.endTurn();
      return;
    }
    if (tile.kind === "altar" && tile.featureEffect) {
      this.useAltar(tile);
      this.endTurn();
      return;
    }
    if (tile.kind === "fountain") {
      this.useFountain(tile);
      this.endTurn();
      return;
    }
    if (tile.kind === "throne") {
      this.useThrone(tile);
      this.endTurn();
      return;
    }
    this.log("There is nothing here to use.", "warning");
    this.render();
  }

  useAltar(tile) {
    if (tile.featureUsed) {
      this.log("The shrine has already taken its due.", "warning");
      return;
    }
    tile.featureUsed = true;
    this.flashTile(this.player.x, this.player.y, "#caa8ff", 220, { alpha: 0.18 });
    if (tile.featureEffect === "tribute") {
      const gold = randInt(45, 120) * Math.max(1, this.currentDepth);
      this.player.gold += gold;
      if (Math.random() < 0.75) {
        this.addItemToInventory(createItem(Math.random() < 0.4 ? "wandSlow" : "identifyScroll"));
        this.log(`The idol spills ${gold} gold and a strange gift. The room stirs.`, "good");
      } else {
        this.log(`The idol spills ${gold} gold. Every lurking thing hears your greed.`, "good");
      }
      this.makeNoise(12, this.player, "tribute");
      if (this.floorResolved) {
        this.markGreedAction("altar");
      }
      if (Math.random() < 0.35) {
        curseRandomCarriedItem(this.player);
        this.log("The gift carries a hidden malice.", "bad");
      }
      return;
    }
    if (tile.featureEffect === "blood") {
      const pain = Math.max(2, roll(1, 4) + Math.floor(this.currentDepth / 2));
      this.player.hp = Math.max(1, this.player.hp - pain);
      this.player.mana = this.player.maxMana;
      this.log(`The shrine drinks ${pain} blood and floods you with power.`, "good");
      this.makeNoise(5, this.player, "blood");
      if (this.floorResolved) {
        this.markGreedAction("altar");
      }
      return;
    }
    if (tile.featureEffect === "revelation") {
      revealCircle(this.currentLevel, this.player.x, this.player.y, 8);
      revealNearbySecrets(this.currentLevel, this.player.x, this.player.y, 8);
      this.log("Cold insight reveals the nearby halls, but something answers the omen.", "warning");
      this.makeNoise(9, this.player, "revelation");
      if (this.floorResolved) {
        this.markGreedAction("altar");
      }
      this.summonMonsterNearWithCap(this.player.x, this.player.y, weightedMonster(this.currentDepth));
    }
  }

  focusMap() {
    if (this.layoutMode === "desktop") {
      this.mapDrawerOpen = true;
      this.refreshChrome();
    } else if (this.mapDrawer) {
      this.mapDrawerOpen = true;
      this.refreshChrome();
    }
    if (this.mapCanvas && this.layoutMode !== "desktop") {
      this.mapCanvas.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    this.mapCanvas?.focus?.();
  }

  pollGamepad() {
    const intent = this.gamepadInput.poll(this.mode, this.getMovementRepeatInterval());
    if (!intent) {
      return false;
    }
    this.setInputSource("gamepad");
    if (intent.type === "move") {
      this.handleMovementIntent(intent.dx, intent.dy);
      return true;
    }
    if (intent.type === "target") {
      this.moveTargetCursor(intent.dx, intent.dy);
      return true;
    }
    if (intent.type === "ui-move") {
      this.handleUiNavigationIntent(intent.dx, intent.dy);
      return true;
    }
    if (intent.type === "ui-tab-prev") {
      this.handleUiTabIntent(-1);
      return true;
    }
    if (intent.type === "ui-tab-next") {
      this.handleUiTabIntent(1);
      return true;
    }
    if (intent.type === "ui-scroll") {
      this.handleUiScrollIntent(intent.delta);
      return true;
    }
    if (intent.type === "dock") {
      this.resetMovementCadence({ clearHeld: false });
      this.triggerDockSlot(intent.slot);
      return true;
    }
    if (intent.type === "ui-confirm") {
      this.resetMovementCadence({ clearHeld: false });
      if (this.mode === "target") {
        this.confirmTargetSelection();
      } else if (this.mode === "modal" || this.mode === "creation" || this.mode === "title" || this.mode === "levelup") {
        const target = this.getActiveUiActionableElement() || this.focusFirstUiElement();
        if (target && typeof target.click === "function") {
          this.flashUiInteractionTarget(target);
          target.click();
        } else if (this.mode === "creation") {
          this.beginAdventure();
        }
      }
      return true;
    }
    if (intent.type === "ui-back") {
      this.resetMovementCadence({ clearHeld: false });
      this.handleControllerBackAction();
      return true;
    }
    if (intent.type === "action") {
      this.resetMovementCadence({ clearHeld: false });
      this.handleAction(intent.action, intent.tab ? { dataset: { tab: intent.tab } } : null);
      return true;
    }
    return false;
  }

  getUiNavigationRoot() {
    return this.modalRoot && !this.modalRoot.classList.contains("hidden")
      ? this.modalRoot
      : this.appShell || document;
  }

  isNavigableElement(element) {
    return Boolean(
      element &&
      element instanceof HTMLElement &&
      element.offsetParent !== null &&
      !element.disabled &&
      !element.hasAttribute("disabled") &&
      !element.hidden &&
      element.getAttribute("aria-hidden") !== "true"
    );
  }

  getUiNavigableSelector() {
    return [
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[data-action]:not([disabled])",
      "[data-move]:not([disabled])",
      "[tabindex]:not([tabindex='-1'])"
    ].join(", ");
  }

  resetUiNavigationCache() {
    this.uiNavigationCache.root = null;
    this.uiNavigationCache.focusables = [];
    this.uiNavigationCache.focusKeyMap = new Map();
  }

  rebuildUiNavigationCache(root = this.getUiNavigationRoot()) {
    if (!root?.querySelectorAll) {
      this.resetUiNavigationCache();
      return this.uiNavigationCache;
    }
    const seen = new Set();
    const focusables = Array.from(root.querySelectorAll(this.getUiNavigableSelector()))
      .filter((element) => {
        if (!this.isNavigableElement(element) || seen.has(element)) {
          return false;
        }
        seen.add(element);
        return true;
      });
    const focusKeyMap = new Map();
    focusables.forEach((element) => {
      const focusKey = element.dataset?.focusKey || "";
      if (focusKey && !focusKeyMap.has(focusKey)) {
        focusKeyMap.set(focusKey, element);
      }
    });
    this.uiNavigationCache = {
      root,
      focusables,
      focusKeyMap
    };
    return this.uiNavigationCache;
  }

  getUiNavigationCache(root = this.getUiNavigationRoot()) {
    if (this.uiNavigationCache.root === root && Array.isArray(this.uiNavigationCache.focusables)) {
      return this.uiNavigationCache;
    }
    return this.rebuildUiNavigationCache(root);
  }

  getUiNavigableElements(root = this.getUiNavigationRoot()) {
    return this.getUiNavigationCache(root).focusables;
  }

  getUiNavMeta(element) {
    if (!element) {
      return null;
    }
    const rect = element.getBoundingClientRect();
    return {
      element,
      zone: element.dataset.navZone || "default",
      row: Number.isFinite(Number(element.dataset.navRow)) ? Number(element.dataset.navRow) : null,
      col: Number.isFinite(Number(element.dataset.navCol)) ? Number(element.dataset.navCol) : null,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }

  getUiDirectionName(dx, dy) {
    if (dx > 0) {
      return "right";
    }
    if (dx < 0) {
      return "left";
    }
    if (dy > 0) {
      return "down";
    }
    if (dy < 0) {
      return "up";
    }
    return "";
  }

  getUiDirectionalOverride(active, dx, dy) {
    if (!active?.dataset) {
      return null;
    }
    const direction = this.getUiDirectionName(dx, dy);
    if (!direction) {
      return null;
    }
    const overrideKey = active.dataset[`nav${direction.charAt(0).toUpperCase()}${direction.slice(1)}`];
    return overrideKey ? this.findUiElementByFocusKey(overrideKey) : null;
  }

  getSequentialUiElement(active, step, focusables = this.getUiNavigableElements()) {
    if (!focusables.length) {
      return null;
    }
    let index = focusables.indexOf(active);
    if (index < 0) {
      index = 0;
    } else {
      index = (index + step + focusables.length) % focusables.length;
    }
    return focusables[index] || null;
  }

  scoreDirectionalCandidate(activeMeta, candidateMeta, dx, dy, sameZone) {
    const deltaX = candidateMeta.x - activeMeta.x;
    const deltaY = candidateMeta.y - activeMeta.y;
    const primaryDistance = dx !== 0 ? deltaX * dx : deltaY * dy;
    if (primaryDistance <= 1) {
      return Number.POSITIVE_INFINITY;
    }
    const crossDistance = Math.abs(dx !== 0 ? deltaY : deltaX);
    const rowPenalty = activeMeta.row !== null && candidateMeta.row !== null ? Math.abs(candidateMeta.row - activeMeta.row) * 8 : 0;
    const colPenalty = activeMeta.col !== null && candidateMeta.col !== null ? Math.abs(candidateMeta.col - activeMeta.col) * 6 : 0;
    return primaryDistance + crossDistance * 1.8 + rowPenalty + colPenalty - (sameZone ? 18 : 0);
  }

  getGridDirectionalUiTarget(activeMeta, candidates, dx, dy) {
    if (!activeMeta || activeMeta.row === null || activeMeta.col === null || candidates.length === 0) {
      return null;
    }
    const withGrid = candidates.filter((candidate) => candidate.row !== null && candidate.col !== null);
    if (withGrid.length === 0) {
      return null;
    }

    const scoreCandidate = (candidate) => {
      const rowDelta = candidate.row - activeMeta.row;
      const colDelta = candidate.col - activeMeta.col;
      if (dx !== 0) {
        const primary = colDelta * dx;
        if (primary <= 0) {
          return Number.POSITIVE_INFINITY;
        }
        return primary * 100 + Math.abs(rowDelta) * 10 + Math.abs(colDelta);
      }
      const primary = rowDelta * dy;
      if (primary <= 0) {
        return Number.POSITIVE_INFINITY;
      }
      return primary * 100 + Math.abs(colDelta) * 10 + Math.abs(rowDelta);
    };

    let best = null;
    let bestScore = Number.POSITIVE_INFINITY;
    withGrid.forEach((candidate) => {
      const score = scoreCandidate(candidate);
      if (score < bestScore) {
        best = candidate.element;
        bestScore = score;
      }
    });
    return best;
  }

  findDirectionalUiTarget(active, dx, dy) {
    const focusables = this.getUiNavigableElements();
    if (!focusables.length) {
      return null;
    }
    const override = this.getUiDirectionalOverride(active, dx, dy);
    if (override) {
      return override;
    }
    const activeMeta = this.getUiNavMeta(active);
    if (!activeMeta) {
      return this.getSequentialUiElement(active, dy > 0 || dx > 0 ? 1 : -1, focusables);
    }
    const candidates = focusables
      .filter((element) => element !== active)
      .map((element) => this.getUiNavMeta(element))
      .filter(Boolean);
    const groups = [
      candidates.filter((candidate) => candidate.zone === activeMeta.zone),
      candidates
    ];
    for (const group of groups) {
      const gridTarget = this.getGridDirectionalUiTarget(activeMeta, group, dx, dy);
      if (gridTarget) {
        return gridTarget;
      }
      let best = null;
      let bestScore = Number.POSITIVE_INFINITY;
      group.forEach((candidate) => {
        const sameZone = candidate.zone === activeMeta.zone;
        const score = this.scoreDirectionalCandidate(activeMeta, candidate, dx, dy, sameZone);
        if (score < bestScore) {
          best = candidate.element;
          bestScore = score;
        }
      });
      if (best) {
        return best;
      }
    }
    return this.getSequentialUiElement(active, dy > 0 || dx > 0 ? 1 : -1, focusables);
  }

  focusUiElement(element) {
    if (!element || typeof element.focus !== "function") {
      return;
    }
    if (element.dataset?.focusKey) {
      this.controllerFocusKey = element.dataset.focusKey;
    }
    element.focus({ preventScroll: true });
    if (this.modalRoot && this.modalRoot.contains(element)) {
      const scrollHost = this.getScrollHostForElement(element);
      this.ensureElementVisibleInScrollHost(element, scrollHost);
    }
  }

  handleUiNavigationIntent(dx, dy) {
    const focusables = this.getUiNavigableElements();
    if (focusables.length === 0) {
      return;
    }
    const active = document.activeElement;
    if (!this.isNavigableElement(active) || !focusables.includes(active)) {
      this.focusUiElement(focusables[0]);
      this.flashUiInteractionTarget(focusables[0], { durationMs: 80 });
      return;
    }
    const next = this.findDirectionalUiTarget(active, dx, dy);
    if (next) {
      this.focusUiElement(next);
      this.flashUiInteractionTarget(next, { durationMs: 80 });
    }
  }

  getActiveUiActionableElement() {
    const active = document.activeElement;
    if (!active || !(active instanceof HTMLElement)) {
      return null;
    }
    if (active.matches("button:not([disabled]), [data-action]:not([disabled]), [data-move]:not([disabled])")) {
      return active;
    }
    return null;
  }

  focusFirstUiElement(zone = "") {
    const focusables = this.getUiNavigableElements().filter((element) => !zone || element.dataset.navZone === zone);
    if (focusables.length === 0) {
      return null;
    }
    this.focusUiElement(focusables[0]);
    return focusables[0];
  }

  getModalElement() {
    return this.modalRoot ? this.modalRoot.querySelector(".modal") : null;
  }

  getModalScrollHost() {
    const modal = this.getModalElement();
    if (!modal) {
      return null;
    }
    return modal.querySelector(".modal-body") || modal;
  }

  getUiInteractionAckElement(element) {
    if (!(element instanceof HTMLElement)) {
      return null;
    }
    return element.closest(
      ".magic-card, .pack-item-row, .paper-slot, .hub-tab, .hub-filter-chip, .action-button, .menu-button, .tiny-button, .spell-learn-card, .choice-card, .dock-slot, .utility-menu-button, .spell-tray-card"
    ) || element;
  }

  flashUiInteractionTarget(element, options = {}) {
    const target = this.getUiInteractionAckElement(element);
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const durationMs = Math.max(50, Number(options.durationMs) || 70);
    const previousAnimation = this.uiInteractionAckHandles.get(target);
    if (previousAnimation && typeof previousAnimation.cancel === "function") {
      previousAnimation.cancel();
    }
    if (typeof target.animate !== "function") {
      return;
    }
    const animation = target.animate([
      { filter: "brightness(1) saturate(1)", transform: "translateY(0)" },
      { filter: "brightness(1.08) saturate(1.06)", transform: "translateY(-1px)" },
      { filter: "brightness(1) saturate(1)", transform: "translateY(0)" }
    ], {
      duration: durationMs,
      easing: "ease-out"
    });
    this.uiInteractionAckHandles.set(target, animation);
    const clearAnimation = () => {
      if (this.uiInteractionAckHandles.get(target) === animation) {
        this.uiInteractionAckHandles.delete(target);
      }
    };
    animation.addEventListener("finish", clearAnimation, { once: true });
    animation.addEventListener("cancel", clearAnimation, { once: true });
  }

  cancelModalInteractionFeedback() {
    this.clearDeferredUiTask(this.pendingModalFeedbackHandle, this.pendingModalFeedbackMode);
    this.pendingModalFeedbackHandle = 0;
    this.pendingModalFeedbackMode = "";
  }

  ensureModalInteractionFeedbackHost() {
    const modal = this.getModalElement();
    if (!(modal instanceof HTMLElement)) {
      return null;
    }
    let host = modal.querySelector("[data-modal-interaction-feedback]");
    if (host instanceof HTMLElement) {
      return host;
    }
    host = document.createElement("div");
    host.className = "modal-interaction-feedback";
    host.hidden = true;
    host.setAttribute("data-modal-interaction-feedback", "true");
    host.setAttribute("role", "status");
    host.setAttribute("aria-live", "polite");
    const title = modal.querySelector(".modal-title");
    if (title?.nextSibling) {
      title.parentNode.insertBefore(host, title.nextSibling);
    } else if (title?.parentNode) {
      title.parentNode.appendChild(host);
    } else {
      modal.prepend(host);
    }
    return host;
  }

  syncModalInteractionFeedbackHost() {
    const host = this.ensureModalInteractionFeedbackHost();
    if (!(host instanceof HTMLElement)) {
      return null;
    }
    const { message, tone } = this.modalInteractionFeedback || { message: "", tone: "" };
    const hasMessage = typeof message === "string" && message.length > 0;
    host.hidden = !hasMessage;
    host.textContent = hasMessage ? message : "";
    host.className = `modal-interaction-feedback${hasMessage ? " visible" : ""}${tone ? ` ${tone}` : ""}`;
    if (tone) {
      host.dataset.tone = tone;
    } else {
      delete host.dataset.tone;
    }
    return host;
  }

  clearModalInteractionFeedback() {
    this.cancelModalInteractionFeedback();
    this.modalInteractionFeedback = { message: "", tone: "" };
    this.syncModalInteractionFeedbackHost();
  }

  showModalInteractionFeedback(message, tone = "info", options = {}) {
    const text = typeof message === "string" ? message.trim() : "";
    if (!text) {
      this.clearModalInteractionFeedback();
      return;
    }
    const persistMs = Math.max(0, Number(options.persistMs) || 1200);
    this.cancelModalInteractionFeedback();
    this.modalInteractionFeedback = {
      message: text,
      tone: tone || "info"
    };
    this.syncModalInteractionFeedbackHost();
    if (persistMs <= 0 || typeof window === "undefined") {
      return;
    }
    this.pendingModalFeedbackHandle = window.setTimeout(() => {
      this.pendingModalFeedbackHandle = 0;
      this.pendingModalFeedbackMode = "";
      this.modalInteractionFeedback = { message: "", tone: "" };
      this.syncModalInteractionFeedbackHost();
    }, persistMs);
    this.pendingModalFeedbackMode = "timeout";
  }

  getScrollHostForElement(element) {
    if (!(element instanceof HTMLElement)) {
      return this.getModalScrollHost();
    }
    return element.closest(".pack-list-panel, .message-log, .journal-log, .modal-body, .modal, .modal-root")
      || this.getModalScrollHost();
  }

  ensureElementVisibleInScrollHost(element, scrollHost, padding = 10) {
    if (!(element instanceof HTMLElement) || !(scrollHost instanceof HTMLElement)) {
      return false;
    }
    const elementRect = element.getBoundingClientRect();
    const hostRect = scrollHost.getBoundingClientRect();
    const topBound = hostRect.top + padding;
    const bottomBound = hostRect.bottom - padding;
    if (elementRect.top < topBound) {
      scrollHost.scrollTop += elementRect.top - topBound;
      return true;
    }
    if (elementRect.bottom > bottomBound) {
      scrollHost.scrollTop += elementRect.bottom - bottomBound;
      return true;
    }
    return false;
  }

  getFocusKeyCandidates(focusTarget) {
    const raw = Array.isArray(focusTarget) ? focusTarget : [focusTarget];
    return [...new Set(raw.filter((key) => typeof key === "string" && key.length > 0))];
  }

  getUtilityModalReturnOptions(returnFocusKey = "") {
    if (this.modalSurfaceKey !== "utility-menu" || !returnFocusKey) {
      return {};
    }
    return {
      closeLabel: "Back to Menu",
      modalReturnContext: {
        originSurface: "utility-menu",
        returnFocusKey
      }
    };
  }

  findUiElementByFocusKey(focusKey) {
    if (!focusKey) {
      return null;
    }
    const root = this.getUiNavigationRoot();
    const cache = this.getUiNavigationCache(root);
    const cached = cache.focusKeyMap.get(focusKey);
    if (this.isNavigableElement(cached)) {
      return cached;
    }
    if (cached) {
      this.rebuildUiNavigationCache(root);
      const refreshed = this.uiNavigationCache.focusKeyMap.get(focusKey);
      if (this.isNavigableElement(refreshed)) {
        return refreshed;
      }
    }
    return Array.from(root.querySelectorAll("[data-focus-key]"))
      .find((element) => element.dataset.focusKey === focusKey && this.isNavigableElement(element)) || null;
  }

  getElementOffsetInModal(element, modal = this.getModalScrollHost()) {
    if (!element || !modal || !modal.contains(element)) {
      return null;
    }
    const elementRect = element.getBoundingClientRect();
    const modalRect = modal.getBoundingClientRect();
    return (elementRect.top - modalRect.top) + modal.scrollTop;
  }

  captureModalRefreshState(surfaceKey) {
    const modal = this.getModalScrollHost();
    if (!modal || !surfaceKey || surfaceKey !== this.modalSurfaceKey) {
      return null;
    }
    const active = this.getActiveUiActionableElement();
    return {
      surfaceKey,
      scrollTop: modal.scrollTop,
      focusKey: active?.dataset?.focusKey || null,
      focusOffsetTop: this.getElementOffsetInModal(active, modal)
    };
  }

  findNearestUiElementByOffset(targetOffset) {
    if (typeof targetOffset !== "number") {
      return null;
    }
    const modal = this.getModalScrollHost();
    const focusables = this.getUiNavigableElements().filter((element) => !modal || modal.contains(element));
    if (focusables.length === 0) {
      return null;
    }
    const candidates = focusables.some((element) => element.dataset.focusKey)
      ? focusables.filter((element) => element.dataset.focusKey)
      : focusables;
    let best = candidates[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    candidates.forEach((element) => {
      const offset = this.getElementOffsetInModal(element, modal);
      if (typeof offset !== "number") {
        return;
      }
      const distanceToTarget = Math.abs(offset - targetOffset);
      if (distanceToTarget < bestDistance) {
        best = element;
        bestDistance = distanceToTarget;
      }
    });
    return best;
  }

  resolveModalFocusTarget(focusTarget, previousState = null) {
    const candidates = this.getFocusKeyCandidates(focusTarget);
    if (previousState?.focusKey) {
      candidates.push(previousState.focusKey);
    }
    for (const key of [...new Set(candidates)]) {
      const element = this.findUiElementByFocusKey(key);
      if (element) {
        return element;
      }
    }
    if (typeof previousState?.focusOffsetTop === "number") {
      return this.findNearestUiElementByOffset(previousState.focusOffsetTop);
    }
    if (typeof previousState?.scrollTop === "number") {
      return this.findNearestUiElementByOffset(previousState.scrollTop);
    }
    return null;
  }

  handleUiTabIntent(step) {
    if (this.mode === "target") {
      return;
    }
    if (this.mode === "modal" && this.activeHubTab) {
      const tabs = ["pack", "magic", "journal"];
      const currentIndex = tabs.indexOf(this.activeHubTab);
      if (currentIndex >= 0) {
        const nextTab = tabs[(currentIndex + step + tabs.length) % tabs.length];
        this.showHubModal(nextTab, {
          preserveScroll: true,
          focusTarget: this.getHubTabFocusKey(nextTab)
        });
      }
    }
  }

  handleUiScrollIntent(delta) {
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const host = this.getScrollHostForElement(active) || this.getModalScrollHost() || this.modalRoot;
    if (!host || typeof host.scrollBy !== "function") {
      return;
    }
    host.scrollBy({ top: delta * 96, left: 0, behavior: "smooth" });
  }

  ensureFocusKey(element, fallbackKey) {
    if (!(element instanceof HTMLElement)) {
      return "";
    }
    if (element.dataset.focusKey) {
      return element.dataset.focusKey;
    }
    const derivedKey = element.id
      || (element.dataset.action
        ? `${element.dataset.action}:${element.dataset.tab || element.dataset.setting || element.dataset.service || element.dataset.reward || element.dataset.spell || element.dataset.index || element.dataset.slot || element.dataset.move || "default"}`
        : fallbackKey);
    if (derivedKey) {
      element.dataset.focusKey = derivedKey;
    }
    return element.dataset.focusKey || "";
  }

  assignNavMetadata(elements, zone, columns = 1, rowOffset = 0) {
    elements
      .filter((element) => element instanceof HTMLElement)
      .forEach((element, index) => {
        this.ensureFocusKey(element, `${zone}:${index}`);
        element.dataset.navZone = zone;
        element.dataset.navRow = String(rowOffset + Math.floor(index / columns));
        element.dataset.navCol = String(index % columns);
      });
  }

  applyShellNavigationMetadata(root) {
    if (this.layoutMode === "desktop") {
      const menuButtons = Array.from(this.desktopOverlay?.querySelectorAll(".desktop-shell-menu-row button") || []);
      const verbButtons = Array.from(this.desktopVerbHost?.querySelectorAll("button") || []);
      const quickslotButtons = Array.from(this.desktopQuickslotsHost?.querySelectorAll("button") || []);
      this.assignNavMetadata(menuButtons, "desktop-menu", 4);
      this.assignNavMetadata(verbButtons, "desktop-verbs", 4);
      this.assignNavMetadata(quickslotButtons, "desktop-quickslots", Math.max(1, quickslotButtons.length));
      if (menuButtons[0] && verbButtons[0]) {
        menuButtons.forEach((element) => {
          element.dataset.navDown = verbButtons[0].dataset.focusKey;
        });
        verbButtons.forEach((element) => {
          element.dataset.navUp = menuButtons[0].dataset.focusKey;
        });
      }
      if (verbButtons[verbButtons.length - 1] && quickslotButtons[0]) {
        verbButtons[verbButtons.length - 1].dataset.navRight = quickslotButtons[0].dataset.focusKey;
        quickslotButtons[0].dataset.navLeft = verbButtons[verbButtons.length - 1].dataset.focusKey;
      }
      if (this.mapCanvas && !this.desktopOverlayMapHost?.classList.contains("hidden")) {
        this.mapCanvas.tabIndex = 0;
        this.mapCanvas.dataset.focusKey = this.mapCanvas.dataset.focusKey || "map:canvas";
        this.mapCanvas.dataset.navZone = "desktop-map";
        this.mapCanvas.dataset.navRow = "0";
        this.mapCanvas.dataset.navCol = "0";
        if (quickslotButtons[0]) {
          this.mapCanvas.dataset.navUp = quickslotButtons[0].dataset.focusKey;
          quickslotButtons.forEach((element) => {
            element.dataset.navDown = this.mapCanvas.dataset.focusKey;
          });
        }
      }
      return;
    }
    this.assignNavMetadata(
      [
        this.quickSaveButton,
        this.quickLoadButton,
        this.mapToggleButton,
        this.spellTrayToggleButton,
        this.topMusicButton,
        this.utilityMenuButton
      ].filter(Boolean),
      "top-band",
      6
    );
    if (this.mapCanvas) {
      this.mapCanvas.tabIndex = 0;
      this.mapCanvas.dataset.focusKey = this.mapCanvas.dataset.focusKey || "map:canvas";
      this.mapCanvas.dataset.navZone = "map-drawer";
      this.mapCanvas.dataset.navRow = "0";
      this.mapCanvas.dataset.navCol = "0";
    }
    this.assignNavMetadata(Array.from(this.actionBar?.querySelectorAll("button") || []), "action-bar", 4);
    this.assignNavMetadata(Array.from(root?.querySelectorAll("#spell-tray button") || []), "spell-tray", this.layoutMode === "desktop" ? 1 : 2);
    this.assignNavMetadata(Array.from(this.touchControls?.querySelectorAll("button") || []), "touch-pad", 3);
  }

  assignModalActionNavigation(root, columns = 3) {
    this.assignNavMetadata(Array.from(root.querySelectorAll(".modal-actions button")), "modal-actions", columns);
  }

  applyHubNavigationMetadata(root) {
    this.assignNavMetadata(Array.from(root.querySelectorAll(".hub-tabs .hub-tab")), "hub-tabs", 3);
    this.assignModalActionNavigation(root);
    if (this.activeHubTab === "pack") {
      const packSlots = Array.from(root.querySelectorAll(".pack-paperdoll .paper-slot, .pack-slot-list .pack-slot-row, .pack-slot-tabs .pack-slot-tab, .pack-slot-subtabs .pack-slot-subtab"));
      const packFilters = Array.from(root.querySelectorAll(".pack-filter-row .hub-filter-chip"));
      const packItems = Array.from(root.querySelectorAll(".pack-group-list .pack-item-row, .pack-classic-list .pack-item-row"));
      const equipmentColumns = root.querySelector(".pack-slot-tabs")
        ? (this.layoutMode === "desktop" ? 6 : 3)
        : (this.layoutMode === "desktop" ? 1 : 2);
      this.assignNavMetadata(packSlots, "equipment", equipmentColumns);
      this.assignNavMetadata(packFilters, "inventory-filters", 4);
      this.assignNavMetadata(packItems, "inventory-list", 1);
      if (packItems[0] && packFilters[0]) {
        packFilters.forEach((element) => {
          element.dataset.navDown = packItems[0].dataset.focusKey;
        });
        packItems.forEach((element) => {
          element.dataset.navUp = packFilters[0].dataset.focusKey;
        });
      }
      if (packSlots[0] && packItems[0]) {
        packSlots.forEach((element) => {
          element.dataset.navRight = packItems[0].dataset.focusKey;
        });
        packItems.forEach((element) => {
          element.dataset.navLeft = packSlots[0].dataset.focusKey;
        });
      }
      this.assignNavMetadata(
        Array.from(root.querySelectorAll(".pack-inspector-panel .pack-ready-chip, .pack-inspector-panel .menu-button, .pack-inspector-panel .tiny-button, .pack-inspector-panel [data-action='toggle-do-not-sell']")),
        "inspector-actions",
        2
      );
      return;
    }
    if (this.activeHubTab === "magic") {
      const magicFilters = Array.from(root.querySelectorAll(".magic-filter-row .hub-filter-chip"));
      const magicListButtons = Array.from(root.querySelectorAll(".magic-book-list .magic-card-select"));
      const magicResultButtons = Array.from(root.querySelectorAll("[data-magic-result-actions] .menu-button"));
      this.assignNavMetadata(magicFilters, "magic-filters", 4);
      this.assignNavMetadata(magicListButtons, "spell-grid", 1);
      this.assignNavMetadata(magicResultButtons, "magic-result", this.layoutMode === "desktop" ? 2 : 1);
      if (magicListButtons[0]) {
        magicFilters.forEach((element) => {
          element.dataset.navDown = magicListButtons[0].dataset.focusKey;
        });
        magicListButtons.forEach((element) => {
          if (magicFilters[0]) {
            element.dataset.navUp = magicFilters[0].dataset.focusKey;
          }
          if (magicResultButtons[0]) {
            element.dataset.navRight = magicResultButtons[0].dataset.focusKey;
          }
        });
      }
      if (magicResultButtons[0]) {
        const activeMagicButton = root.querySelector(".magic-book-list .magic-card-select.active") || magicListButtons[0] || null;
        magicResultButtons.forEach((element) => {
          if (activeMagicButton instanceof HTMLElement) {
            element.dataset.navLeft = activeMagicButton.dataset.focusKey;
          }
          element.dataset.navUp = magicFilters[0]?.dataset.focusKey || "";
        });
      }
      return;
    }
    const journalSections = Array.from(root.querySelectorAll(".journal-section-row .hub-filter-chip"));
    const journalLogs = Array.from(root.querySelectorAll(".journal-log"));
    this.assignNavMetadata(journalSections, "journal-sections", 4);
    this.assignNavMetadata(journalLogs, "journal-log", 1);
    this.assignNavMetadata(Array.from(root.querySelectorAll(".utility-row .menu-button")), "journal-actions", 4);
    if (journalLogs[0]) {
      journalSections.forEach((element) => {
        element.dataset.navDown = journalLogs[0].dataset.focusKey || "journal-log";
      });
    }
    if (journalSections[0]) {
      journalLogs.forEach((element) => {
        element.dataset.navUp = journalSections[0].dataset.focusKey;
      });
    }
  }

  applyShopNavigationMetadata(root) {
    const shopPanels = Array.from(root.querySelectorAll(".shop-panel-row .hub-filter-chip"));
    const shopListButtons = Array.from(root.querySelectorAll("[data-action='shop-select-buy'], [data-action='shop-select-sell'], [data-action='shop-sell-unmarked']"));
    const shopResultActions = Array.from(root.querySelectorAll("[data-shop-result-actions] .menu-button, [data-shop-result-actions] [data-action='toggle-do-not-sell']"));
    this.assignNavMetadata(shopPanels, "shop-panels", 2);
    this.assignNavMetadata(shopListButtons, "shop-list", 1);
    this.assignNavMetadata(shopResultActions, "shop-result-actions", 1);
    if (shopListButtons[0]) {
      shopPanels.forEach((element) => {
        element.dataset.navDown = shopListButtons[0].dataset.focusKey;
      });
      shopListButtons.forEach((element) => {
        if (shopPanels[0]) {
          element.dataset.navUp = shopPanels[0].dataset.focusKey;
        }
        if (shopResultActions[0]) {
          element.dataset.navRight = shopResultActions[0].dataset.focusKey;
        }
      });
    }
    if (shopResultActions[0] && shopListButtons[0]) {
      shopResultActions.forEach((element) => {
        element.dataset.navLeft = shopListButtons[0].dataset.focusKey;
      });
    }
  }

  applyUtilityMenuNavigationMetadata(root) {
    const primaryButtons = Array.from(root.querySelectorAll(".utility-menu-group-primary .action-button"));
    const secondaryButtons = Array.from(root.querySelectorAll(".utility-menu-secondary-links .action-button"));
    this.assignNavMetadata(primaryButtons, "utility-primary", 2);
    this.assignNavMetadata(secondaryButtons, "utility-secondary", 3);
    if (primaryButtons[0] && secondaryButtons[0]) {
      primaryButtons.forEach((element) => {
        element.dataset.navRight = secondaryButtons[0].dataset.focusKey;
      });
      secondaryButtons.forEach((element) => {
        element.dataset.navLeft = primaryButtons[0].dataset.focusKey;
      });
    }
    this.assignModalActionNavigation(root, 1);
  }

  applySaveSlotNavigationMetadata(root) {
    const slotButtons = Array.from(root.querySelectorAll(".save-slot-select"));
    const detailButtons = Array.from(root.querySelectorAll("[data-save-slot-detail-actions] .menu-button, [data-save-slot-detail-actions] .action-button"));
    this.assignNavMetadata(slotButtons, "save-slot-list", 1);
    this.assignNavMetadata(detailButtons, "save-slot-detail", 1);
    if (slotButtons[0] && detailButtons[0]) {
      slotButtons.forEach((element) => {
        element.dataset.navRight = detailButtons[0].dataset.focusKey;
      });
      detailButtons.forEach((element) => {
        element.dataset.navLeft = slotButtons[0].dataset.focusKey;
      });
    }
    this.assignModalActionNavigation(root);
  }

  applySettingsNavigationMetadata(root) {
    this.assignNavMetadata(Array.from(root.querySelectorAll("[data-action='setting-toggle']")), "settings", 1);
    this.assignModalActionNavigation(root);
  }

  applyServiceNavigationMetadata(root) {
    this.assignNavMetadata(Array.from(root.querySelectorAll("[data-action='service-use']")), "services", 1);
    this.assignModalActionNavigation(root);
  }

  applyBankNavigationMetadata(root) {
    this.assignNavMetadata(Array.from(root.querySelectorAll("[data-action='bank-deposit'], [data-action='bank-withdraw'], [data-action='town-rumor'], [data-action='town-unlock']")), "bank-actions", 4);
    this.assignNavMetadata(Array.from(root.querySelectorAll("[data-action='contract-toggle']")), "contracts", 1);
    this.assignModalActionNavigation(root);
  }

  applyModalNavigationMetadata(root) {
    if (!root) {
      return;
    }
    this.assignNavMetadata(Array.from(root.querySelectorAll(".title-actions button")), "title-actions", 3);
    this.assignNavMetadata(Array.from(root.querySelectorAll("[data-role='title-music-toggle']")), "title-music", 1);
    if (root.querySelector(".title-screen")) {
      return;
    }
    const creationName = root.querySelector("#hero-name");
    if (creationName) {
      const creationActions = Array.from(root.querySelectorAll("[data-focus-key='creation:back'], [data-focus-key='creation:begin'], [data-focus-key='creation:contract:recommended']"));
      this.ensureFocusKey(creationName, "creation:name");
      creationName.dataset.navZone = "name";
      creationName.dataset.navRow = "0";
      creationName.dataset.navCol = "0";
      const raceChoices = Array.from(root.querySelectorAll("#race-choice [data-race]"));
      const classChoices = Array.from(root.querySelectorAll("#class-choice [data-class]"));
      this.assignNavMetadata(raceChoices, "race-grid", 1);
      this.assignNavMetadata(classChoices, "class-grid", 1);
      const resetButton = root.querySelector("[data-action='creation-reset-stats']");
      if (resetButton) {
        this.ensureFocusKey(resetButton, "creation:reset-stats");
        resetButton.dataset.navZone = "stats";
        resetButton.dataset.navRow = "0";
        resetButton.dataset.navCol = "2";
      }
      const statButtons = Array.from(root.querySelectorAll(".creation-stat-button"));
      this.assignNavMetadata(statButtons, "stats", 2, 1);
      this.assignNavMetadata(creationActions, "creation-actions", 2);
      if (raceChoices[0]) {
        creationName.dataset.navDown = raceChoices[0].dataset.focusKey;
      }
      raceChoices.forEach((element, index) => {
        element.dataset.navUp = creationName.dataset.focusKey;
        const nextClass = classChoices[Math.min(index, classChoices.length - 1)];
        if (nextClass) {
          element.dataset.navDown = nextClass.dataset.focusKey;
        }
      });
      classChoices.forEach((element, index) => {
        const priorRace = raceChoices[Math.min(index, raceChoices.length - 1)];
        if (priorRace) {
          element.dataset.navUp = priorRace.dataset.focusKey;
        }
        if (statButtons[0]) {
          element.dataset.navDown = statButtons[0].dataset.focusKey;
        }
      });
      statButtons.forEach((element) => {
        if (classChoices[0]) {
          element.dataset.navUp = classChoices[0].dataset.focusKey;
        }
      });
      const lastStatButton = statButtons[statButtons.length - 1];
      if (lastStatButton && creationActions[0]) {
        lastStatButton.dataset.navDown = creationActions[0].dataset.focusKey;
      }
      creationActions.forEach((element) => {
        if (lastStatButton) {
          element.dataset.navUp = lastStatButton.dataset.focusKey;
        }
      });
      return;
    }
    const surfaceKey = String(this.modalSurfaceKey || "");
    if (surfaceKey === "utility-menu") {
      this.applyUtilityMenuNavigationMetadata(root);
      return;
    }
    if (surfaceKey.startsWith("hub:")) {
      this.applyHubNavigationMetadata(root);
      return;
    }
    if (surfaceKey.startsWith("shop:")) {
      this.applyShopNavigationMetadata(root);
      return;
    }
    if (surfaceKey === "settings") {
      this.applySettingsNavigationMetadata(root);
      return;
    }
    if (surfaceKey.startsWith("save-slots:")) {
      this.applySaveSlotNavigationMetadata(root);
      return;
    }
    if (surfaceKey === "bank") {
      this.applyBankNavigationMetadata(root);
      return;
    }
    if (surfaceKey === "sage" || surfaceKey === "temple") {
      this.applyServiceNavigationMetadata(root);
      return;
    }
    if (this.mode === "levelup") {
      const spellLearnFilters = Array.from(root.querySelectorAll(".spell-learn-filter-row .hub-filter-chip"));
      const spellLearnCards = Array.from(root.querySelectorAll(".spell-learn-grid .spell-learn-card"));
      this.assignNavMetadata(spellLearnFilters, "spell-learn-filters", 4);
      this.assignNavMetadata(spellLearnCards, "spell-learn-grid", 2);
      if (spellLearnCards[0]) {
        spellLearnFilters.forEach((element) => {
          element.dataset.navDown = spellLearnCards[0].dataset.focusKey;
        });
        spellLearnCards.forEach((element) => {
          if (spellLearnFilters[0]) {
            element.dataset.navUp = spellLearnFilters[0].dataset.focusKey;
          }
        });
      }
      this.assignModalActionNavigation(root);
      return;
    }
    this.assignModalActionNavigation(root);
    this.assignNavMetadata(Array.from(root.querySelectorAll("[data-action='service-use']")), "services", 1);
  }

  applyControllerNavigationMetadata() {
    const modalVisible = this.modalRoot && !this.modalRoot.classList.contains("hidden");
    if (modalVisible) {
      this.applyModalNavigationMetadata(this.modalRoot);
      this.rebuildUiNavigationCache(this.modalRoot);
      return;
    }
    const root = this.appShell || document;
    if (!root) {
      this.resetUiNavigationCache();
      return;
    }
    this.applyShellNavigationMetadata(root);
    this.rebuildUiNavigationCache(root);
  }

  updateEffects() {
    const now = nowTime();
    if (this.boardImpulse && this.boardImpulse.until <= now) {
      this.boardImpulse = null;
    }
    if (this.visualEffects.length > 0) {
      this.visualEffects = this.visualEffects.filter((effect) => effect.until > now);
    }
    if (!this.shouldAnimateBoard()) {
      return;
    }
    this.renderBoard();
  }

  addEffect(effect) {
    if (!effect) {
      return;
    }
    const profile = this.getEffectProfile();
    if (profile.intensity === "minimal" && effect.decorative) {
      return;
    }
    const created = nowTime();
    const duration = effect.duration || Math.max(60, (effect.until || created + 180) - created);
    this.visualEffects.push({
      intensity: effect.intensity || (profile.intensity === "enhanced" ? 1.15 : 1),
      radius: effect.radius || 1,
      ...effect,
      created,
      until: effect.until || created + duration
    });
    if (this.visualEffects.length > 48) {
      this.visualEffects.splice(0, this.visualEffects.length - 48);
    }
    this.startRuntimeLoop();
    if (this.mode === "game" || this.mode === "target") {
      this.renderBoard();
    }
  }

  showSettingsModal(options = {}) {
    return renderSettingsModal(this, options);
  }

  showCharacterSheet(options = {}) {
    return renderCharacterSheet(this, options);
  }

  toggleSetting(setting) {
    if (setting === "uiScale") {
      this.settings.uiScale = this.settings.uiScale === "compact" ? "large" : "compact";
      document.documentElement.dataset.uiScale = this.settings.uiScale;
    } else if (setting === "effectIntensity") {
      const order = ["minimal", "standard", "enhanced"];
      const currentIndex = order.indexOf(this.settings.effectIntensity || "standard");
      this.settings.effectIntensity = order[(currentIndex + 1) % order.length];
    } else {
      this.settings[setting] = !this.settings[setting];
    }
    this.audio.updateSettings(this.settings);
    saveSettings(this.settings);
    this.syncSurfaceMusic();
    if (setting === "musicEnabled" && this.settings.musicEnabled) {
      this.audio.resumeMusic();
    }
    this.refreshChrome();
    this.showSettingsModal({
      preserveScroll: true,
      focusTarget: `setting-toggle:${setting}`
    });
  }

  isTitleMusicSurface() {
    return !this.player && (
      this.mode === "title"
      || this.mode === "creation"
      || this.modalSurfaceKey === "title"
      || this.modalSurfaceKey === "creation"
      || this.modalSurfaceKey === "save-slots:load"
    );
  }

  getDefaultMusicTrack() {
    if (this.isTitleMusicSurface()) {
      return TITLE_SCREEN_ASSETS.music;
    }
    if (!this.player) {
      return "";
    }
    return this.currentDepth === 0 ? AMBIENT_MUSIC_ASSETS.town : AMBIENT_MUSIC_ASSETS.dungeon;
  }

  getDefaultMusicTrackLabel() {
    if (this.isTitleMusicSurface()) {
      return "Title";
    }
    if (!this.player) {
      return "Area";
    }
    return this.currentDepth === 0 ? "Town" : "Dungeon";
  }

  getMusicTrackChoiceId() {
    const choiceId = typeof this.settings.musicTrackChoice === "string" ? this.settings.musicTrackChoice : "area";
    return MUSIC_TRACK_CHOICES.some((choice) => choice.id === choiceId) ? choiceId : "area";
  }

  getMusicTrackChoice() {
    const choiceId = this.getMusicTrackChoiceId();
    return MUSIC_TRACK_CHOICES.find((choice) => choice.id === choiceId) || MUSIC_TRACK_CHOICES[0];
  }

  getCurrentMusicTrack() {
    if (!this.settings.musicEnabled) {
      return "";
    }
    const choice = this.getMusicTrackChoice();
    return choice.id === "area" ? this.getDefaultMusicTrack() : choice.track;
  }

  syncSurfaceMusic() {
    this.audio.syncMusic(this.getCurrentMusicTrack());
  }

  getMusicToggleLabel() {
    return this.settings.musicEnabled ? "Mute Music" : "Play Music";
  }

  getMusicToggleNote() {
    const choice = this.getMusicTrackChoice();
    if (!this.settings.musicEnabled) {
      return "Music is off. Turn it on here, then use the in-run music button to cycle tracks or return to Area.";
    }
    if (choice.id === "area") {
      return `Music is on and following the ${this.getDefaultMusicTrackLabel().toLowerCase()} theme here.`;
    }
    return `Music is on and locked to the ${choice.label.toLowerCase()} theme until you switch back to Area.`;
  }

  syncMusicToggleUi(root = this.modalRoot) {
    if (!(root instanceof HTMLElement)) {
      return;
    }
    const label = this.getMusicToggleLabel();
    const note = this.getMusicToggleNote();
    root.querySelectorAll("[data-role='title-music-toggle']").forEach((element) => {
      element.textContent = label;
      element.setAttribute("aria-pressed", this.settings.musicEnabled ? "true" : "false");
    });
    root.querySelectorAll("[data-role='title-music-note']").forEach((element) => {
      element.textContent = note;
    });
  }

  cycleMusicTrack(direction) {
    const currentChoiceId = this.getMusicTrackChoiceId();
    const currentIndex = Math.max(0, MUSIC_TRACK_CHOICES.findIndex((choice) => choice.id === currentChoiceId));
    const nextIndex = (currentIndex + (direction < 0 ? -1 : 1) + MUSIC_TRACK_CHOICES.length) % MUSIC_TRACK_CHOICES.length;
    this.settings.musicTrackChoice = MUSIC_TRACK_CHOICES[nextIndex].id;
    this.settings.musicEnabled = true;
    this.audio.updateSettings(this.settings);
    saveSettings(this.settings);
    this.syncSurfaceMusic();
    this.audio.resumeMusic();
    this.syncMusicToggleUi();
    this.refreshChrome();
  }

  handleTopMusicButtonKeydown(event) {
    if (!this.topMusicButton || document.activeElement !== this.topMusicButton) {
      return false;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      this.cycleMusicTrack(-1);
      return true;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      this.cycleMusicTrack(1);
      return true;
    }
    return false;
  }

  toggleMusicPreference() {
    const shouldEnable = !this.settings.musicEnabled;
    this.settings.musicEnabled = shouldEnable;
    this.audio.updateSettings(this.settings);
    saveSettings(this.settings);
    this.syncSurfaceMusic();
    if (shouldEnable) {
      this.audio.resumeMusic();
    }
    this.syncMusicToggleUi();
    this.refreshChrome();
  }

  startTargetMode(options) { startSpellTarget(this, options); }

  moveTargetCursor(dx, dy) { moveSpellCursor(this, dx, dy); }

  confirmTargetSelection() { confirmSpellTarget(this); }

  cancelTargetMode(options = {}) { cancelSpellTarget(this, options); }

  triggerTrap(tile, x, y) {
    const sourceLevel = this.currentLevel;
    if (tile.hidden) {
      tile.hidden = false;
    }
    this.log("A trap clicks beneath your feet.", "bad");
    this.audio.play("trap");
    this.emitTelegraphPulse(x, y, "#ff8d73", 240);
    this.pulseScreen("rgba(110, 14, 14, 0.22)", 170, 0.14);
    switch (tile.trapEffect) {
      case "dart":
        this.damageActor({ name: "A poison dart" }, this.player, roll(2, 4));
        break;
      case "poison":
        this.damageActor({ name: "Hidden needles" }, this.player, roll(1, 4), "poison");
        this.player.constitutionLoss = Math.min(this.player.stats.con - 1, (this.player.constitutionLoss || 0) + 1);
        this.recalculateDerivedStats();
        this.log("Your Constitution is weakened by poison.", "bad");
        break;
      case "teleport": {
        const position = this.findSafeTile(this.currentLevel, 24);
        if (position) {
          this.player.x = position.x;
          this.player.y = position.y;
          this.addEffect({ type: "blink", x: position.x, y: position.y, color: "#ba8eff", duration: 180 });
          this.log("The trap whirls you elsewhere.", "bad");
        }
        break;
      }
      case "alarm":
        this.currentLevel.actors.forEach((monster) => { monster.alerted = 8; monster.sleeping = false; });
        this.log("The noise wakes the level.", "bad");
        break;
      case "arrow":
        this.damageActor({ name: "A spring bow" }, this.player, roll(2, 5));
        break;
      case "summon":
        if (this.summonMonsterNearWithCap(x, y, weightedMonster(this.currentDepth))) {
          this.log("A summoning glyph tears open beside you.", "bad");
        } else {
          this.log("The summoning glyph flares, but the floor cannot feed more bodies into the fight.", "warning");
        }
        break;
      case "trapdoor":
        if (this.currentDepth < this.levels.length - 1) {
          this.log("The floor gives way under you.", "bad");
          this.pulseScreen("rgba(94, 35, 8, 0.28)", 220, 0.18);
          this.currentDepth += 1;
          this.player.deepestDepth = Math.max(this.player.deepestDepth, this.currentDepth);
          this.currentLevel = this.levels[this.currentDepth];
          this.placePlayerAt(this.currentLevel.stairsUp.x, this.currentLevel.stairsUp.y);
        } else {
          this.damageActor({ name: "The collapsing floor" }, this.player, roll(2, 5));
        }
        break;
      default:
        break;
    }
    this.makeNoise(9, { x, y }, "trap");
    setTile(sourceLevel, x, y, tileDef("floor"));
  }

  useFountain(tile) {
    if (tile.featureUsed) {
      this.log("The fountain is dry.", "warning");
      return;
    }
    tile.featureUsed = true;
    if (this.floorResolved) {
      this.markGreedAction("fountain");
    }
    this.flashTile(this.player.x, this.player.y, "#8bcde9", 220, { alpha: 0.18 });
    switch (tile.featureEffect) {
      case "heal":
        this.player.hp = this.player.maxHp;
        this.log("Cool water restores your wounds.", "good");
        break;
      case "mana":
        this.player.mana = this.player.maxMana;
        this.log("Arcane strength returns at once.", "good");
        break;
      case "poison":
        this.player.constitutionLoss = Math.min(this.player.stats.con - 1, (this.player.constitutionLoss || 0) + 1);
        this.recalculateDerivedStats();
        this.log("The water was tainted. You feel weaker.", "bad");
        break;
      case "vision":
        revealAll(this.currentLevel);
        this.log("The dungeon map blooms in your mind.", "good");
        break;
      case "damage":
        this.damageActor({ name: "The cursed fountain" }, this.player, roll(2, 5), "magic");
        break;
      default:
        break;
    }
    this.makeNoise(4, this.player, "fountain");
  }

  useThrone(tile) {
    if (tile.featureUsed) {
      this.log("The throne no longer answers.", "warning");
      return;
    }
    tile.featureUsed = true;
    if (this.floorResolved) {
      this.markGreedAction("throne");
    }
    this.flashTile(this.player.x, this.player.y, "#d6aa5d", 220, { alpha: 0.18 });
    switch (tile.featureEffect) {
      case "gold":
        this.player.gold += randInt(50, 150);
        this.log("Hidden tribute spills from the throne.", "good");
        break;
      case "exp":
        this.player.exp += 60 + this.currentDepth * 10;
        this.checkLevelUp();
        this.log("Ancient memory sharpens your skill.", "good");
        break;
      case "curse":
        curseRandomCarriedItem(this.player);
        this.log("A malignant oath settles over your gear.", "bad");
        break;
      case "summon":
        this.summonNearbyMonster();
        this.log("The throne answers with hostility.", "bad");
        break;
      case "teleport":
        this.log("The throne rejects you and throws you elsewhere.", "bad");
        {
          const position = this.findSafeTile(this.currentLevel, 20);
          if (position) {
            this.player.x = position.x;
            this.player.y = position.y;
            this.addEffect({ type: "blink", x: position.x, y: position.y, color: "#ba8eff", duration: 180 });
          }
        }
        break;
      default:
        break;
    }
    this.makeNoise(7, this.player, "throne");
  }

  triggerStoryBeat(key) {
    if (this.storyFlags[key]) {
      return;
    }
    this.storyFlags[key] = true;
    const beats = {
      "depth-1": "A cold draft whispers through the keep. Someone once fled these halls and did not make it out.",
      "depth-3": STORY_BEATS.depth3.entryText,
      "depth-4": "Scratched runes warn of a prisoner and a chapel below. The dungeon has more memory than mercy.",
      "depth-5": STORY_BEATS.depth5.entryText,
      "depth-7": STORY_BEATS.depth7.entryText
    };
    if (beats[key]) {
      this.log(beats[key], "warning");
    }
  }

  getPickupBurdenPreview(item) { return getPickupBurdenPreviewFn(this, item); }

  showPickupPrompt(item, turnPending = false) { showPickupPromptFn(this, item, turnPending); }

  finishPickupTurn(turnPending) { finishPickupTurnFn(this, turnPending); }

  resolvePickupItem(item) { resolvePickupItemFn(this, item); }

  confirmPendingPickup(equipOnTake = false) { confirmPendingPickupFn(this, equipOnTake); }

  cancelPendingPickup() { cancelPendingPickupFn(this); }

  pickupHere(silent = false, turnPending = false) { pickupHereFn(this, silent, turnPending); }

  addItemToInventory(item) { addItemToInventoryFn(this, item); }

  useInventoryItem(index) { useInventoryItemFn(this, index); }

  useRuneOfReturn(options = {}) { return useRuneOfReturnFn(this, options); }

  useChargedItem(index, item) { useChargedItemFn(this, index, item); }

  equipInventoryItem(index, options = {}) { equipInventoryItemFn(this, index, options); }

  dropInventoryItem(index) { dropInventoryItemFn(this, index); }

  toggleInventoryDoNotSell(index, forcedValue = null) {
    const item = this.player.inventory[Number(index)];
    if (!item) {
      return;
    }
    if (item.kind === "quest") {
      this.log("Quest items are never part of bulk sales.", "warning");
      return;
    }
    const nextValue = typeof forcedValue === "boolean" ? forcedValue : !item.doNotSell;
    if (item.doNotSell === nextValue) {
      return;
    }
    item.doNotSell = nextValue;
    this.log(`${getItemName(item, true)} ${item.doNotSell ? "marked do not sell" : "removed from the do not sell list"}.`, item.doNotSell ? "good" : "warning");
    if (this.mode === "modal" && this.activeHubTab === "pack") {
      this.showHubModal("pack", {
        selection: { type: "inventory", value: Number(index) },
        preserveScroll: true,
        focusTarget: this.getPackActionFocusKey("protect", Number(index))
      });
    } else if (this.mode === "modal" && this.pendingShop) {
      this.showShopModal(this.pendingShop.id, this.pendingShop, {
        preserveScroll: true,
        focusTarget: this.getShopSellFocusKey(Number(index)),
        panel: "sell",
        selection: { kind: "sell", value: Number(index) }
      });
    } else {
      this.render();
    }
  }

  unequipSlot(slot) { unequipSlotFn(this, slot); }

  prepareSpell(spellId) { prepareSpellFn(this, spellId); }

  openTownService(service) {
    if (this.currentDepth !== 0) {
      return;
    }
    this.refreshShopState();
    this.recordTownServiceOpen(service);
    this.completeTownServiceTutorial(service);
    if (service === "bank") {
      if (!this.storyFlags.bankPromptShown) {
        this.storyFlags.bankPromptShown = true;
        this.log("The bank turns spare gold into intel, funded upgrades, and cleaner next-floor prep.", "good");
      }
      this.showBankModal();
      return;
    }
    if (service === "sage") {
      this.showSageModal();
      return;
    }
    if (service === "temple") {
      this.showTempleModal();
      return;
    }
    const shop = SHOPS[service];
    if (!shop) {
      return;
    }
    this.showShopModal(service, shop);
  }

  buyShopItem(shopId, itemId, options = {}) {
    const { equipOnBuy = false } = options;
    const normalizedItemId = String(itemId || "");
    if (!shopId || !normalizedItemId) {
      return;
    }
    const previousInventoryLength = this.player.inventory.length;
    buyShopItemFn(this, shopId, normalizedItemId);
    if (!equipOnBuy) {
      this.showShopModal(shopId, SHOPS[shopId], {
        preserveScroll: true,
        panel: "buy",
        selection: { kind: "buy", value: normalizedItemId }
      });
      this.render();
      return;
    }
    const boughtItem = this.player.inventory[previousInventoryLength] || this.player.inventory[this.player.inventory.length - 1] || null;
    if (!boughtItem || !["weapon", "armor"].includes(boughtItem.kind)) {
      this.showShopModal(shopId, SHOPS[shopId], {
        preserveScroll: true,
        panel: "buy"
      });
      this.render();
      return;
    }
    const boughtIndex = this.player.inventory.indexOf(boughtItem);
    if (boughtIndex >= 0) {
      this.equipInventoryItem(boughtIndex, { openHub: false });
    }
    this.showShopModal(shopId, SHOPS[shopId], {
      preserveScroll: true,
      panel: "buy"
    });
    this.render();
  }

  sellShopItem(index) {
    const normalizedIndex = Number(index);
    sellShopItemFn(this, normalizedIndex);
    if (this.pendingShop) {
      this.showShopModal(this.pendingShop.id, this.pendingShop, {
        preserveScroll: true,
        panel: "sell"
      });
      this.render();
    }
  }

  sellUnmarkedItems() {
    if (!this.pendingShop) {
      return;
    }
    const sellableEntries = this.player.inventory
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !item?.doNotSell)
      .filter(({ item }) => this.pendingShop.id === "junk" || shopAcceptsItem(this.pendingShop.id, item));
    if (sellableEntries.length === 0) {
      this.log("Nothing eligible remains for bulk sale at this shop.", "warning");
      return;
    }
    let totalGold = 0;
    sellableEntries
      .sort((a, b) => b.index - a.index)
      .forEach(({ item, index }) => {
        const price = getShopSellPrice(this, item, this.pendingShop?.id || "");
        totalGold += price;
        this.player.gold += price;
        item.identified = true;
        this.recordTelemetry("shop_sell", {
          shopId: this.pendingShop?.id || "unknown",
          itemId: item.id || item.kind || "item",
          itemKind: item.kind || "",
          price
        });
        if (this.pendingShop.id !== "junk") {
          this.shopState[this.pendingShop.id].buyback.unshift(item.id);
          this.shopState[this.pendingShop.id].buyback = this.shopState[this.pendingShop.id].buyback.slice(0, 8);
        }
        removeAt(this.player.inventory, index);
      });
    this.log(`Sold ${sellableEntries.length} unmarked item${sellableEntries.length === 1 ? "" : "s"} for ${totalGold} gold.`, "good");
    this.showShopModal(this.pendingShop.id, this.pendingShop, {
      preserveScroll: true,
      focusTarget: "shop:sell-unmarked",
      panel: "sell"
    });
    this.render();
  }

  handleBank(mode) {
    if (mode === "deposit") {
      const amount = Math.min(100, this.player.gold);
      if (amount <= 0) {
        this.log("You have no gold to deposit.", "warning");
        return;
      }
      this.player.gold -= amount;
      this.player.bankGold += amount;
      this.log(`Deposited ${amount} gold.`, "good");
    } else {
      const amount = Math.min(100, this.player.bankGold);
      if (amount <= 0) {
        this.log("Nothing remains on account.", "warning");
        return;
      }
      this.player.bankGold -= amount;
      this.player.gold += amount;
      this.log(`Withdrew ${amount} gold.`, "good");
    }
    this.showBankModal({
      preserveScroll: true,
      focusTarget: this.getTownActionFocusKey(mode === "deposit" ? "deposit" : "withdraw")
    });
    this.render();
  }

  refreshShopState(force = false) {
    return this.syncTownCycle(force, this.currentDepth === 0 && !force);
  }

  getTownCycleState(turn = this.turn) {
    return getTownCycleMeta(this, turn);
  }

  getTownCycleLabel(turn = this.turn) {
    return formatTownCycle(this.getTownCycleState(turn));
  }

  getTownPrepAdvice() {
    const unknownCount = countUnknownItems(this.player);
    const affordableUnlock = getAvailableTownUnlocks(this).find((unlockDef) => this.player.gold >= unlockDef.cost);
    const canBuyRumor = (this.player.runCurrencies?.rumorTokens || 0) > 0 || this.player.gold >= getRumorPrice(this);
    const intent = this.getNextRunIntent();
    const nextRunFocus = intent.primaryGoal?.label || this.getNextRunFocusLines().find(Boolean) || "";
    if (this.storyFlags?.postReturnBankPrompt) {
      return nextRunFocus || "Bank first. Review your last return, arm a contract if needed, then decide whether this adventurer goes back north.";
    }
    if (this.player.constitutionLoss > 0 || this.player.hp < this.player.maxHp || this.player.mana < this.player.maxMana) {
      return "Temple first if you want a clean second descent. Recovery preserves more value than gambling on a weak re-entry.";
    }
    if (unknownCount > 0) {
      return `Sage value is live. ${unknownCount} unknown item${unknownCount === 1 ? "" : "s"} could clarify your next equip or buy.`;
    }
    if (affordableUnlock) {
      return `You can already fund ${affordableUnlock.name}. That is the cleanest long-term conversion for spare town gold.`;
    }
    if (canBuyRumor) {
      return "Buy intel before heading north again. Objective and theme knowledge cut more dead turns than a blind roam.";
    }
    return "North road remains the critical path. Convert value quickly, then get back into the keep.";
  }

  applyRunContractLevelModifiers(level, depth, activeContract = this.getActiveContract(true)) {
    if (!activeContract || !level || level.kind !== "dungeon") {
      return;
    }
    level.contractModifierFlags = level.contractModifierFlags || {};
    if (level.contractModifierFlags[activeContract.id]) {
      return;
    }
    if (activeContract.id === "pressed_descent") {
      const pressureCut = depth === 1 ? 8 : 4;
      level.reinforcementClock = Math.max(10, (level.reinforcementClock || 18) - pressureCut);
      level.contractModifierFlags[activeContract.id] = true;
      return;
    }
    if (activeContract.id === "scholar_road" || activeContract.id === "route_debt") {
      if (!level.guidance) {
        return;
      }
      const revealBonus = activeContract.id === "route_debt" ? 6 : 4;
      level.guidance.searchRevealChunk = (level.guidance.searchRevealChunk || 0) + revealBonus;
      level.contractModifierFlags[activeContract.id] = true;
    }
  }

  applyRunContractPlayerModifiers(activeContract = this.getActiveContract(true)) {
    if (!activeContract || !this.player) {
      return;
    }
    if (activeContract.id === "scholar_road" || activeContract.id === "route_debt") {
      if (activeContract.id === "route_debt") {
        this.grantRumorToken?.(1);
      }
      this.player.maxHp = Math.max(10, this.player.maxHp - (activeContract.id === "route_debt" ? 5 : 4));
      this.player.hp = Math.min(this.player.hp, this.player.maxHp);
      return;
    }
    if (activeContract.id === "ration_run") {
      this.addItemToInventory(createTownItem("healingPotion"));
      this.addItemToInventory(createTownItem("mappingScroll"));
      return;
    }
    if (activeContract.id === "sealed_return") {
      this.addItemToInventory(createTownItem("runeScroll"));
      this.grantRumorToken?.(1);
      this.player.maxHp = Math.max(10, this.player.maxHp - 3);
      this.player.hp = Math.min(this.player.hp, this.player.maxHp);
      return;
    }
    if (activeContract.id === "last_light") {
      this.addItemToInventory(createTownItem("healingPotion"));
      this.addItemToInventory(createTownItem("manaPotion"));
      this.addItemToInventory(createTownItem("torchCharm"));
    }
  }

  applyRunContractWorldModifiers(activeContract = this.getActiveContract(true), options = {}) {
    const {
      includePlayer = true,
      startDepth = 1,
      endDepth = this.levels.length - 1
    } = options;
    if (!activeContract) {
      return;
    }
    if (includePlayer) {
      this.applyRunContractPlayerModifiers(activeContract);
    }
    const firstDepth = Math.max(1, Math.floor(startDepth));
    const lastDepth = Math.min(this.levels.length - 1, Math.max(firstDepth, Math.floor(endDepth)));
    for (let depth = firstDepth; depth <= lastDepth; depth += 1) {
      this.applyRunContractLevelModifiers(this.levels[depth], depth, activeContract);
    }
  }

  getAvailableContracts() {
    return getAvailableContracts(this);
  }

  getContractViewModel() {
    return getContractViewModel(this);
  }

  getActiveContract(useCurrentRun = false) {
    return getActiveContract(this, useCurrentRun);
  }

  getClassMasterySummary(classId = this.player?.classId || this.selectedClass) {
    return getClassMasterySummary(this, classId);
  }

  getClassMasteryViewModel(classId = this.player?.classId || this.selectedClass) {
    return getClassMasteryViewModel(this, classId);
  }

  getCreationPersistencePreview(classId = this.selectedClass) {
    return getCreationPersistencePreview(this, classId);
  }

  getRecommendedContract() {
    return getRecommendedContract(this);
  }

  getAvailableCommendations() {
    return getAvailableCommendations(this);
  }

  getDurableTownUnlocks() {
    return getDurableTownUnlocks(this);
  }

  getCampaignArchive(limit = 5) {
    return getCampaignArchive(this, limit);
  }

  getPersistenceArchive(limit = 5) {
    if (Array.isArray(this.runSummaryHistory) && this.runSummaryHistory.length > 0) {
      return [...this.runSummaryHistory].slice(-limit).reverse();
    }
    return this.getCampaignArchive(limit);
  }

  getLatestPersistenceSummary() {
    return this.getPersistenceArchive(1)[0] || this.lastRunSummary || null;
  }

  getTownCarryForwardSummary() {
    const unlocks = Object.values(TOWN_UNLOCK_DEFS).filter((unlockDef) => this.getDurableTownUnlocks()[unlockDef.id]);
    if (unlocks.length === 0) {
      return "Town improvements carried forward: none yet.";
    }
    const names = unlocks.map((unlockDef) => unlockDef.name);
    return `Town improvements carried forward: ${names.join(", ")}.`;
  }

  getNextRunIntent(classId = this.player?.classId || this.selectedClass) {
    const durableTownUnlocks = this.getDurableTownUnlocks();
    const nextTownUnlock = getAvailableTownUnlocks(this)[0] || null;
    const onHand = Math.floor(this.player?.gold || 0);
    const contractModel = this.getContractViewModel();
    const recommendedContract = contractModel.all.find((contract) => contract.id === contractModel.recommendedId) || null;
    const mastery = this.getClassMasteryViewModel(classId);
    const commendationGoal = getNextCommendationGoal(this, classId);
    const motivators = [];

    if (nextTownUnlock) {
      const gap = Math.max(0, nextTownUnlock.cost - onHand);
      motivators.push({
        type: "town",
        label: gap === 0
          ? `Fund ${nextTownUnlock.name} now.`
          : `${gap} gp funds ${nextTownUnlock.name}.`,
        detail: nextTownUnlock.description
      });
    } else {
      const fundedCount = Object.values(durableTownUnlocks).filter(Boolean).length;
      motivators.push({
        type: "town",
        label: fundedCount > 0 ? "All current town projects are funded." : "Fund the first town project when you can.",
        detail: this.getTownCarryForwardSummary()
      });
    }

    if (recommendedContract) {
      motivators.push({
        type: "contract",
        label: recommendedContract.active
          ? `${recommendedContract.name} is already armed.`
          : recommendedContract.unlocked
            ? `Arm ${recommendedContract.name}.`
            : `${recommendedContract.name} stays locked.`,
        detail: recommendedContract.active || recommendedContract.unlocked
          ? (recommendedContract.recommendationReason || recommendedContract.description)
          : recommendedContract.unlockHint
      });
    }

    motivators.push({
      type: mastery.nextReward ? "mastery" : "commendation",
      label: mastery.nextReward
        ? `${mastery.className}: ${mastery.nextReward.triggerLabel} unlocks ${mastery.nextReward.name}.`
        : commendationGoal.text,
      detail: mastery.nextReward
        ? mastery.nextReward.description
        : (COMMENDATION_DEFS[commendationGoal.id]?.summary || "Current commendation set is complete.")
    });

    let cta = {
      actionId: "bank",
      label: "Review Bank Plan",
      text: "Review the bank plan before the next descent.",
      progressText: motivators[0]?.label || ""
    };
    if (nextTownUnlock && onHand >= nextTownUnlock.cost) {
      cta = {
        actionId: `town_unlock:${nextTownUnlock.id}`,
        label: `Fund ${nextTownUnlock.name}`,
        text: `Fund ${nextTownUnlock.name} now.`,
        progressText: nextTownUnlock.description
      };
    } else if (recommendedContract?.unlocked && !recommendedContract.active) {
      cta = {
        actionId: "contract_recommended",
        label: `Arm ${recommendedContract.name}`,
        text: `Arm ${recommendedContract.name} before the next run.`,
        progressText: recommendedContract.recommendationReason || recommendedContract.description
      };
    } else if ((this.player?.runCurrencies?.rumorTokens || 0) > 0 || onHand >= getRumorPrice(this)) {
      cta = {
        actionId: "town_rumor",
        label: (this.player?.runCurrencies?.rumorTokens || 0) > 0 ? "Spend Rumor Token" : "Buy Intel",
        text: "Secure next-floor intel before heading north again.",
        progressText: getTownIntel(this).nextRumor?.text || "No clear rumor posted for the next floor."
      };
    }

    return {
      primaryGoal: motivators[0] || null,
      secondaryGoal: motivators[1] || null,
      tertiaryGoal: motivators[2] || null,
      motivators: motivators.slice(0, 3),
      cta,
      progressText: motivators.map((entry) => entry.label).join(" | ")
    };
  }

  getLatestPermanentUnlock() {
    const latest = this.getLatestPersistenceSummary();
    const changes = Array.isArray(latest?.persistentChanges) ? latest.persistentChanges : [];
    return changes[0] || null;
  }

  describePersistentChanges(summary) {
    const changes = Array.isArray(summary?.persistentChanges) ? summary.persistentChanges : [];
    return changes.length > 0 ? changes.join(", ") : "No permanent change recorded.";
  }

  getNextRunFocusLines(classId = this.player?.classId || this.selectedClass) {
    if (!classId) {
      return [];
    }
    return this.getNextRunIntent(classId).motivators
      .map((entry) => [entry?.label, entry?.detail].filter(Boolean).join(" "))
      .filter(Boolean)
      .slice(0, 3);
  }

  getNextRunFocusMarkup(options = {}) {
    const {
      label = "One More Run",
      classId = this.player?.classId || this.selectedClass
    } = options;
    const lines = this.getNextRunFocusLines(classId);
    if (lines.length === 0) {
      return `
        <div class="section-block">
          <div class="field-label">${escapeHtml(label)}</div>
          <div class="text-block muted">No next-run goals are surfaced yet.</div>
        </div>
      `;
    }
    return `
      <div class="section-block">
        <div class="field-label">${escapeHtml(label)}</div>
        <div class="text-block">${lines.map((line) => escapeHtml(line)).join("<br><br>")}</div>
      </div>
    `;
  }

  getRunSummaryArchiveMarkup(limit = 5) {
    const summaries = this.getPersistenceArchive(limit);
    if (summaries.length === 0) {
      return "<div class='text-block muted'>No return archive recorded yet.</div>";
    }
    return summaries.map((summary) => `
      <div class="section-block">
        <div class="stat-line"><span>${escapeHtml(summary.outcome === "death" ? "Death" : "Return")}</span><strong>Depth ${summary.extractedDepth}</strong></div>
        <div class="text-block">
          Objective: ${escapeHtml(summary.firstObjectiveType || "unknown")}<br>
          Greed: ${summary.greedCount} | Elite kills: ${summary.eliteKills || 0} | Value: ${summary.returnValue} gp<br>
          ${escapeHtml(this.describePersistentChanges(summary))}
        </div>
      </div>
    `).join("");
  }

  getMasteryReviewMarkup(classId = this.player?.classId || this.selectedClass) {
    const mastery = this.getClassMasteryViewModel(classId);
    return `
      <div class="text-block">
        ${escapeHtml(`Class-based. Permanent. Finite ranks. ${mastery.summary}`)}
      </div>
      ${mastery.ladder.map((entry) => `
        <div class="shop-row">
          <div>
            <div><strong>${escapeHtml(`Rank ${entry.rank}: ${entry.name}`)}</strong>${entry.unlocked ? " <span class=\"muted\">(Unlocked)</span>" : ""}</div>
            <div class="muted">${escapeHtml(entry.description)}</div>
            <div class="muted">${escapeHtml(`Trigger: ${entry.triggerLabel}`)}</div>
            <div class="muted">${escapeHtml(entry.rewardLines.length > 0 ? `Reward: ${entry.rewardLines.join(", ")}` : "Reward: none")}</div>
          </div>
        </div>
      `).join("")}
    `;
  }

  getContractReviewMarkup(options = {}) {
    const {
      interactive = true
    } = options;
    const contracts = this.getContractViewModel();
    const renderContractRow = (contract, mode = "inactive") => `
      <div class="shop-row">
        <div>
          <div>
            <strong>${escapeHtml(contract.name)}</strong>
            ${contract.recommended ? ' <span class="pill">Recommended</span>' : ""}
            ${contract.active ? ' <span class="muted">(Active)</span>' : ""}
          </div>
          <div class="muted">${escapeHtml(contract.effectLines.join(" | "))}</div>
          <div class="muted">${escapeHtml(contract.recommended ? contract.recommendationReason : contract.unlocked ? contract.description : contract.unlockHint)}</div>
        </div>
        ${interactive ? `
          <div class="actions">
            <button class="tiny-button" data-action="contract-toggle" data-contract="${contract.active ? "" : contract.id}" data-focus-key="contract:${contract.id}" type="button"${contract.unlocked ? "" : " disabled"}>${contract.active ? "Clear" : mode === "active" ? "Clear" : "Arm Next Run"}</button>
          </div>
        ` : ""}
      </div>
    `;
    return `
      <div class="section-block">
        <div class="field-label">Active Contract</div>
        ${contracts.active ? renderContractRow(contracts.active, "active") : "<div class='text-block muted'>No contract armed for the next run.</div>"}
      </div>
      <div class="section-block">
        <div class="field-label">Unlocked Contracts</div>
        ${contracts.unlocked.length > 0 ? contracts.unlocked.map((contract) => renderContractRow(contract)).join("") : "<div class='text-block muted'>No inactive unlocked contracts.</div>"}
      </div>
      <div class="section-block">
        <div class="field-label">Locked Contracts</div>
        ${contracts.locked.length > 0 ? contracts.locked.map((contract) => renderContractRow(contract)).join("") : "<div class='text-block muted'>All current contracts are unlocked.</div>"}
      </div>
    `;
  }

  setActiveContract(contractId = "") {
    const previous = this.getActiveContract(false);
    const changed = setActiveContract(this, contractId);
    if (!changed) {
      return false;
    }
    const next = this.getActiveContract(false);
    if (!previous && next) {
      this.recordTelemetry("contract_armed", {
        contractId: next.id
      });
      this.log(`${next.name} armed for the next run.`, "good");
    } else if (previous && !next) {
      this.recordTelemetry("contract_cleared", {
        contractId: previous.id
      });
      this.log(`${previous.name} cleared. No contract is armed for the next run.`, "warning");
    } else if (previous?.id !== next?.id && next) {
      this.recordTelemetry("contract_armed", {
        contractId: next.id,
        previousContractId: previous?.id || ""
      });
      this.log(`${next.name} armed for the next run.`, "good");
    }
    return true;
  }

  getObjectiveRumorBonus() {
    const activeContract = this.getActiveContract(true);
    if (!activeContract) {
      return 0;
    }
    return activeContract.id === "pressed_descent" || activeContract.id === "scholar_road" ? 1 : 0;
  }

  getGreedGoldMultiplier() {
    const activeContract = this.getActiveContract(true);
    if (activeContract?.id === "greedy_burden") {
      return 1.55;
    }
    return activeContract?.id === "greed_ledger" ? 1.4 : 1;
  }

  getGreedDangerBonus() {
    const activeContract = this.getActiveContract(true);
    if (activeContract?.id === "greed_ledger") {
      return 1;
    }
    if (activeContract?.id === "greedy_burden") {
      return 2;
    }
    if (activeContract?.id === "sealed_return") {
      return 1;
    }
    return 0;
  }

  getGreedRumorBonus() {
    const activeContract = this.getActiveContract(true);
    return activeContract?.id === "greed_ledger" || activeContract?.id === "greedy_burden" ? 1 : 0;
  }

  getSearchRevealBonus() {
    const activeContract = this.getActiveContract(true);
    if (activeContract?.id === "route_debt") {
      return 6;
    }
    return activeContract?.id === "scholar_road" ? 4 : 0;
  }

  getContractPaceDangerBonus(source = "") {
    const activeContract = this.getActiveContract(true);
    if (activeContract?.id === "route_debt" && source === "search") {
      return 1;
    }
    if (activeContract?.id === "ration_run" && ["wait", "rest", "search"].includes(source)) {
      return 1;
    }
    if (activeContract?.id === "last_light" && ["wait", "rest", "search"].includes(source)) {
      return 2;
    }
    return 0;
  }

  getContractEliteWaveChanceBonus() {
    const activeContract = this.getActiveContract(true);
    if (activeContract?.id === "trophy_path") {
      return 0.26;
    }
    return activeContract?.id === "hunters_call" ? 0.18 : 0;
  }

  getEliteRewardGoldBonus() {
    const activeContract = this.getActiveContract(true);
    if (activeContract?.id === "trophy_path") {
      return 90;
    }
    return activeContract?.id === "hunters_call" ? 60 : 0;
  }

  getEliteRewardRumorBonus() {
    const activeContract = this.getActiveContract(true);
    return activeContract?.id === "hunters_call" || activeContract?.id === "trophy_path" ? 1 : 0;
  }

  getTownSellBonusMultiplier() {
    const activeContract = this.getActiveContract(true);
    return activeContract?.id === "greedy_burden" ? 1.15 : 1;
  }

  onEliteKillProgress(monster) {
    if (!monster?.elite) {
      return;
    }
    const goldBonus = this.getEliteRewardGoldBonus();
    if (goldBonus > 0) {
      this.player.gold += goldBonus;
      this.log(`Contract payout: +${goldBonus} gold for bringing down ${monster.name}.`, "good");
    }
    const rumorBonus = this.getEliteRewardRumorBonus();
    if (rumorBonus > 0) {
      this.grantRumorToken?.(rumorBonus);
      this.log(`Contract payout: +${rumorBonus} rumor token${rumorBonus === 1 ? "" : "s"} from the elite kill.`, "good");
    }
    if (unlockContract(this, "hunters_call")) {
      this.runPersistenceChanges?.contractUnlocks.push("Hunter's Call");
      this.recordTelemetry("contract_unlocked", {
        contractId: "hunters_call"
      });
      this.log("Contract unlocked: Hunter's Call. Review it in the bank before the next run.", "good");
    }
  }

  onObjectiveResolved(objectiveId = this.currentLevel?.floorObjective?.id || "") {
    const unlocks = [];
    const masteryUnlock = advanceClassMastery(this, "objective");
    if (masteryUnlock) {
      this.runPersistenceChanges?.masteryUnlocks.push({
        classId: this.player?.classId || "",
        rank: masteryUnlock.rank,
        name: masteryUnlock.name,
        trigger: "objective"
      });
      this.recordTelemetry("mastery_advanced", {
        classId: this.player?.classId || "",
        rank: masteryUnlock.rank,
        name: masteryUnlock.name,
        trigger: "objective"
      });
      this.log(`Mastery unlocked: ${masteryUnlock.name}. ${masteryUnlock.description}`, "good");
    }
    if (objectiveId && unlockContract(this, "greed_ledger")) {
      this.runPersistenceChanges?.contractUnlocks.push("Greed Ledger");
      this.recordTelemetry("contract_unlocked", {
        contractId: "greed_ledger"
      });
      unlocks.push("Greed Ledger");
    }
    if (unlocks.length > 0) {
      this.log(`Contract unlocked: ${unlocks.join(", ")}. Activate it from the bank before the next run.`, "good");
    }
  }

  recordTownReturnSummary(level, fromDepth = 0) {
    const masteryUnlock = advanceClassMastery(this, "extract");
    const unlockedContracts = [];
    const pushUnlockedContract = (contractId, label) => {
      if (!unlockContract(this, contractId)) {
        return false;
      }
      this.runPersistenceChanges?.contractUnlocks.push(label);
      this.recordTelemetry("contract_unlocked", {
        contractId
      });
      unlockedContracts.push(label);
      return true;
    };
    if (masteryUnlock) {
      this.runPersistenceChanges?.masteryUnlocks.push({
        classId: this.player?.classId || "",
        rank: masteryUnlock.rank,
        name: masteryUnlock.name,
        trigger: "extract"
      });
      this.recordTelemetry("mastery_advanced", {
        classId: this.player?.classId || "",
        rank: masteryUnlock.rank,
        name: masteryUnlock.name,
        trigger: "extract"
      });
    }
    pushUnlockedContract("scholar_road", "Scholar's Road");
    if ((this.telemetry?.activeRun?.searchCount || 0) >= 3) {
      pushUnlockedContract("ration_run", "Ration Run");
    }
    if ((this.telemetry?.activeRun?.greedCount || 0) === 0) {
      pushUnlockedContract("sealed_return", "Sealed Return");
    }
    if ((this.telemetry?.activeRun?.restCount || 0) === 0 && (this.telemetry?.activeRun?.waitCount || 0) <= 2) {
      pushUnlockedContract("last_light", "Last Light");
    }
    const carriedCurse = Boolean((this.player?.inventory || []).some((item) => item?.cursed))
      || Boolean(Object.values(this.player?.equipment || {}).some((item) => item?.cursed))
      || (this.player?.constitutionLoss || 0) > 0;
    const persistentChanges = [
      ...((this.runPersistenceChanges?.masteryUnlocks || []).map((entry) => `Mastery: ${entry.name}`)),
      ...((this.runPersistenceChanges?.contractUnlocks || []).map((entry) => `Contract: ${entry}`))
    ];
    const summary = recordRunSummary(this, "extract", {
      extractedDepth: fromDepth || this.currentDepth,
      cause: level?.floorObjective?.id || "",
      persistentChanges,
      carriedCurse,
      masteryAdvance: masteryUnlock
        ? {
            classId: this.player?.classId || "",
            rank: masteryUnlock.rank,
            name: masteryUnlock.name,
            trigger: "extract"
          }
        : null,
      unlockedContracts
    });
    recordCampaignSummary(this, summary);
    const commendationUnlocks = evaluateRunCommendations(this, summary);
    if (commendationUnlocks.length > 0) {
      this.runPersistenceChanges?.commendationUnlocks.push(...commendationUnlocks);
      commendationUnlocks.forEach((entry) => {
        if (entry.contractId) {
          const contractName = CONTRACT_DEFS[entry.contractId]?.name || entry.contractId;
          if (!unlockedContracts.includes(contractName)) {
            unlockedContracts.push(contractName);
          }
        }
        this.recordTelemetry("commendation_unlocked", {
          commendationId: entry.id,
          contractId: entry.contractId || ""
        });
      });
    }
    summary.commendationUnlocks = [...commendationUnlocks];
    summary.persistentChanges = persistentChanges;
    summary.masteryAdvance = masteryUnlock
      ? {
          classId: this.player?.classId || "",
          rank: masteryUnlock.rank,
          name: masteryUnlock.name,
          trigger: "extract"
        }
      : null;
    summary.unlockedContracts = [...unlockedContracts];
    if (commendationUnlocks.length > 0) {
      const commendationChanges = commendationUnlocks.map((entry) => `Commendation: ${entry.name}`);
      summary.persistentChanges = [...summary.persistentChanges, ...commendationChanges];
    }
    this.lastRunSummary = summary;
    if (masteryUnlock) {
      this.log(`Mastery unlocked: ${masteryUnlock.name}. ${masteryUnlock.description}`, "good");
    }
    if (unlockedContracts.length > 0) {
      this.log(`Contract unlocked: ${unlockedContracts.join(", ")}. Review it in the bank before starting the next run.`, "good");
    }
    if (commendationUnlocks.length > 0) {
      this.log(`Commendation unlocked: ${commendationUnlocks.map((entry) => entry.name).join(", ")}.`, "good");
    }
    return {
      summary,
      masteryUnlock,
      unlockedContracts,
      commendationUnlocks
    };
  }

  handleRunDeath() {
    const latestMastery = (this.runPersistenceChanges?.masteryUnlocks || []).at(-1) || null;
    const unlockedContracts = [...(this.runPersistenceChanges?.contractUnlocks || [])];
    const summary = recordRunSummary(this, "death", {
      extractedDepth: this.currentDepth,
      cause: this.deathContext?.cause || "Unknown",
      carriedCurse: Boolean((this.player?.inventory || []).some((item) => item?.cursed))
        || Boolean(Object.values(this.player?.equipment || {}).some((item) => item?.cursed))
        || (this.player?.constitutionLoss || 0) > 0,
      persistentChanges: [
        ...((this.runPersistenceChanges?.masteryUnlocks || []).map((entry) => `Mastery: ${entry.name}`)),
        ...((this.runPersistenceChanges?.contractUnlocks || []).map((entry) => `Contract: ${entry}`))
      ],
      masteryAdvance: latestMastery,
      unlockedContracts
    });
    recordCampaignSummary(this, summary);
    this.lastRunSummary = summary;
    return summary;
  }

  syncTownCycle(force = false, announce = false) {
    const currentCycle = this.getTownCycleState();
    const previousCycle = this.getTownCycleState(Math.max(1, this.lastTownRefreshTurn || 1));
    ensureTownMetaState(this);
    this.townState.phaseModifiers = { ...currentCycle.phaseModifiers };
    if (!force && currentCycle.cycleIndex <= previousCycle.cycleIndex) {
      return false;
    }
    refreshTownStocks(this, { clearBuyback: true, turn: this.turn });
    this.lastTownRefreshTurn = this.turn;
    if (announce) {
      this.log(`${this.getTownCycleLabel()} settles over town. Merchants clear their old shelves and lay out fresh stock.`, "warning");
    }
    return true;
  }

  useService(serviceId) {
    const service = this.pendingService;
    if (!service) {
      return;
    }
    switch (service.type) {
      case "temple":
        this.useTempleService(serviceId);
        break;
      case "sage":
        this.useSageService(serviceId);
        break;
      default:
        break;
    }
  }

  useTempleService(serviceId) {
    const service = TEMPLE_SERVICES.find((entry) => entry.id === serviceId);
    if (!service) {
      return;
    }
    const price = getTemplePrice(this, service.price);
    if (this.player.gold < price) {
      this.log("You cannot afford that blessing.", "warning");
      return;
    }
    this.player.gold -= price;
    switch (service.id) {
      case "heal":
        this.player.hp = this.player.maxHp;
        this.player.mana = this.player.maxMana;
        this.log("The temple restores your wounds and spirit.", "good");
        break;
      case "restore":
        this.player.constitutionLoss = 0;
        this.recalculateDerivedStats();
        this.player.hp = this.player.maxHp;
        this.player.mana = this.player.maxMana;
        this.log("The priests restore what poison and overcasting stole.", "good");
        break;
      case "removeCurse":
        this.log(this.removeCurses() > 0 ? "The temple breaks the curses on your belongings." : "The temple finds no curse to lift.", "good");
        break;
      case "runeReturn":
        this.addItemToInventory(createItem("runeScroll", { identified: true }));
        this.log("A fresh rune of return is pressed into your hand.", "good");
        break;
      default:
        break;
    }
    this.recordTelemetry("temple_service", {
      serviceId,
      price
    });
    this.showTempleModal({
      preserveScroll: true,
      focusTarget: this.getServiceFocusKey("temple", serviceId)
    });
    this.render();
  }

  useSageService(serviceId) {
    if (serviceId !== "identifyAll") {
      return;
    }
    const price = getSagePrice(this);
    if (this.player.gold < price) {
      this.log("The sage will not work for free.", "warning");
      return;
    }
    this.player.gold -= price;
    const count = this.identifyInventoryAndEquipment();
    this.log(count > 0 ? `The sage identifies ${count} item${count === 1 ? "" : "s"}.` : "The sage shrugs. Nothing remains mysterious.", "good");
    this.recordTelemetry("sage_identify", {
      price,
      identifiedCount: count
    });
    this.showSageModal({
      preserveScroll: true,
      focusTarget: this.getServiceFocusKey("sage", serviceId)
    });
    this.render();
  }

  identifyInventoryAndEquipment() { return identifyInventoryAndEquipmentFn(this); }

  removeCurses() { return removeCursesFn(this); }

  summonNearbyMonster() {
    if (!this.currentLevel.rooms) {
      return;
    }
    if (!this.canAddDynamicMonster(1)) {
      return;
    }
    const template = weightedMonster(Math.max(1, this.currentDepth));
    const points = [
      { x: this.player.x + 1, y: this.player.y },
      { x: this.player.x - 1, y: this.player.y },
      { x: this.player.x, y: this.player.y + 1 },
      { x: this.player.x, y: this.player.y - 1 }
    ];
    const spot = points.find((point) => isWalkable(this.currentLevel, point.x, point.y) && !actorAt(this.currentLevel, point.x, point.y));
    if (spot) {
      const monster = createMonster(template, spot.x, spot.y);
      monster.sleeping = false;
      monster.alerted = 8;
      this.currentLevel.actors.push(monster);
    }
  }

  findSafeTile(level, attempts = 20) {
    for (let i = 0; i < attempts; i += 1) {
      const room = choice(level.rooms || [{ x: 2, y: 2, w: level.width - 4, h: level.height - 4 }]);
      const position = randomRoomTile(room);
      if (isWalkable(level, position.x, position.y) && !actorAt(level, position.x, position.y)) {
        return position;
      }
    }
    return null;
  }

  resolveMilestoneBossKill(monster) {
    const milestone = this.currentLevel?.milestone;
    if (!milestone || milestone.status === "cleared" || monster.milestoneId !== milestone.id) {
      return;
    }
    const storyBeat = this.getStoryBeat(milestone.storyTag);
    milestone.status = "cleared";
    milestone.clearedTurn = this.turn;
    if (!this.player.quest.milestonesCleared.includes(milestone.id)) {
      this.player.quest.milestonesCleared.push(milestone.id);
    }
    if (!this.player.quest.namedBossesDefeated.includes(monster.name)) {
      this.player.quest.namedBossesDefeated.push(monster.name);
    }
    this.markStoryBeatFlag(`${milestone.storyTag}:cleared`);
    this.log(storyBeat?.clearText || milestone.clearText, "good");
    this.recordChronicleEvent("milestone_clear", {
      label: monster.name,
      depth: this.currentDepth,
      summary: storyBeat?.chronicleLabel || `Broke ${monster.name} on depth ${this.currentDepth}.`
    });
    this.recordTelemetry("milestone_clear", {
      milestoneId: milestone.id,
      bossId: monster.id,
      rewardType: milestone.rewardType || "none"
    });
    if (milestone.rewardType === "perk") {
      queuePerkChoice(this, 1);
    } else if (milestone.rewardType === "relic") {
      queueObjectiveReward(this, milestone.id, "relic");
    }
  }

  getQuestMilestoneSummary() {
    const milestones = Object.values(MILESTONE_DEFS)
      .sort((left, right) => left.depth - right.depth)
      .map((milestone) => {
        const cleared = this.player.quest.milestonesCleared.includes(milestone.id);
        return `${cleared ? "Cleared" : "Pending"}: ${milestone.name} (Depth ${milestone.depth})`;
      });
    return milestones.join(" | ");
  }

  getActiveMilestoneJournalText() {
    if (this.player.quest.hasRunestone) {
      return "The Runestone is in hand. Return it to town and let the valley hear what the keep became.";
    }
    if (this.player.quest.milestonesCleared.includes("depth5_cryptlord")) {
      return STORY_BEATS.depth7.journal;
    }
    if (this.player.quest.milestonesCleared.includes("depth3_gatekeeper")) {
      return STORY_BEATS.depth5.journal;
    }
    return STORY_BEATS.intro.journal;
  }

  checkQuestState() {
    if (!this.player.quest.hasRunestone && this.player.inventory.some((item) => item.kind === "quest")) {
      this.player.quest.hasRunestone = true;
    }
    if (this.player.quest.complete) {
      return;
    }
    if (this.currentDepth === 0 && this.player.quest.hasRunestone) {
      this.player.quest.complete = true;
      this.recordChronicleEvent("objective_complete", {
        label: "Returned the Runestone of the Winds",
        depth: 0
      });
      this.recordTelemetry("run_complete", {
        deepestDepth: this.player.deepestDepth,
        level: this.player.level
      });
      if (!this.hasSeenNpcScene("return")) {
        this.showStoryScene("return");
      }
    }
  }

  hasPendingProgressionChoice() {
    return hasPendingProgressionChoice(this);
  }

  recordChronicleEvent(type, payload = {}) {
    recordChronicleEvent(this, type, payload);
  }

  recordTelemetry(type, context = {}) {
    return recordTelemetry(this, type, context);
  }

  getTelemetryReviewSnapshot() {
    return getTelemetryReviewSnapshot(this);
  }

  markOnboarding(stepId) {
    return markOnboardingFlag(this, stepId);
  }

  noteDeathContext(context) {
    noteDeathContext(this, context);
  }

  grantBoon(boonId) {
    applyEffects(this, applyBoonReward(this, boonId));
  }

  grantRumorToken(amount = 1) {
    addRumorToken(this, amount);
  }

  learnRumor(rumorId) {
    ensureBuildState(this);
    if (!this.player.knownRumors.includes(rumorId)) {
      this.player.knownRumors.push(rumorId);
    }
    if (!this.rumorTable.includes(rumorId)) {
      this.rumorTable.push(rumorId);
    }
  }

  offerObjectiveReward(source = "objective") {
    const rewardType = this.floorObjective?.rewardType || "relic";
    const queued = queueObjectiveReward(this, source, rewardType);
    if (!queued && rewardType === "rumor") {
      grantObjectiveRumor(this);
    }
    this.showNextProgressionModal();
  }

  increaseDanger(source = "unknown", amount = 1) {
    return raiseDanger(this, source, amount);
  }

  markGreedAction(source = "greed") {
    return markFloorGreedAction(this, source);
  }

  noteFloorIntro() {
    noteFloorIntro(this);
  }

  getTownMetaSummary() {
    return buildTownMetaSummary(this);
  }

  getValidationSummary() {
    return buildValidationSummary(this);
  }

  isFirstTownRun() {
    return Boolean(this.player && this.currentDepth === 0 && (this.player.deepestDepth || 0) === 0);
  }

  completeTownServiceTutorial(service) {
    if (!this.isFirstTownRun() || this.storyFlags.townServiceVisited) {
      return false;
    }
    const onboardingMeta = getOnboardingVariantMeta(this);
    this.storyFlags.townServiceVisited = true;
    this.storyFlags.firstTownGuidance = "keep";
    this.markOnboarding("visit_town_door");
    const label = service === "bank"
      ? "Bank"
      : service === "sage"
        ? "Sage"
        : SHOPS[service]?.name || "Town service";
    this.log(`${label} checked. Town support is live for this adventurer. ${onboardingMeta.enterKeepPrimary}`, "good");
    return true;
  }

  showBriefingModal(options = {}) {
    if (!this.player) {
      return;
    }
    if (this.currentDepth === 0 && !this.hasSeenBriefing("intro")) {
      this.showStoryScene("intro");
      return;
    }
    this.showHubModal("journal", {
      preserveScroll: this.mode === "modal",
      focusTarget: this.getJournalSectionFocusKey("mission"),
      journalSection: "mission"
    });
  }

  getTileActionPrompt(tile = this.player && this.currentLevel ? getTile(this.currentLevel, this.player.x, this.player.y) : null) {
    if (!this.player || !this.currentLevel || !tile) {
      return null;
    }
    const onboardingMeta = getOnboardingVariantMeta(this);
    if (this.isFirstTownRun() && !this.storyFlags.townServiceVisited) {
      return {
        label: "Town Task",
        detail: onboardingMeta.townDoorPrompt,
        tone: "warning"
      };
    }
    if (this.currentDepth === 0 && tile.kind === "buildingDoor" && tile.service) {
      return {
        label: "Town Door",
        detail: `Step here to open ${SHOPS[tile.service]?.name || tile.label || "this service"}.`,
        tone: "good"
      };
    }
    const objective = this.currentLevel.floorObjective;
    if (tile.objectiveId && objective && !this.currentLevel.floorResolved) {
      const blockers = getObjectiveDefendersRemaining(this.currentLevel);
      const interaction = this.getObjectiveInteractionPromptData(objective, blockers);
      return {
        label: interaction?.label || "Objective",
        detail: blockers > 0 ? interaction?.blockedDetail || interaction?.roomDetail || "Clear the room first." : interaction?.readyDetail || interaction?.roomDetail || "Resolve the objective now.",
        tone: interaction?.tone || (blockers > 0 ? "warning" : "good")
      };
    }
    if (tile.optionalId) {
      return { label: "Greed Choice", detail: `${tile.label || "Optional reward"} will raise pressure if you take it.`, tone: "warning" };
    }
    if (tile.discoveryId) {
      return { label: "Read", detail: "Press U to read and archive this discovery.", tone: "good" };
    }
    if (tile.roomEventId) {
      return { label: "Resolve", detail: "Press U to resolve this room event when the room is safe.", tone: "warning" };
    }
    if (tile.kind === "altar") {
      return { label: "Use Shrine", detail: "Press U to bargain here. It can raise pressure or carry risk.", tone: "warning" };
    }
    if (tile.kind === "fountain") {
      return { label: "Drink", detail: "Press U to use the fountain.", tone: "good" };
    }
    if (tile.kind === "throne") {
      return { label: "Sit", detail: "Press U to use the throne.", tone: "warning" };
    }
    return null;
  }

  restoreUiFocus(focusKey) {
    const candidates = this.getFocusKeyCandidates(focusKey);
    this.applyControllerNavigationMetadata();
    for (const key of candidates) {
      const nextFocus = this.findUiElementByFocusKey(key);
      if (nextFocus) {
        this.focusUiElement(nextFocus);
        return true;
      }
    }
    if (candidates.length > 0) {
      this.controllerFocusKey = null;
    }
    return false;
  }

  getCurrentUiFocusKey() {
    return this.getActiveUiActionableElement()?.dataset?.focusKey || this.controllerFocusKey || null;
  }

  openSpellTray() { return openSpellTrayFn(this); }

  closeSpellTray() { closeSpellTrayFn(this); }

  shouldShowSpellTray() {
    return Boolean(
      this.spellTray
      && this.player
      && this.getPinnedSpellIds().length > 0
      && this.mode !== "title"
      && this.mode !== "creation"
      && this.mode !== "modal"
      && this.mode !== "levelup"
      && this.layoutMode !== "desktop"
      && (this.spellTrayOpen || (this.mode === "target" && this.targetMode?.type === "spell"))
    );
  }

  getSpellTrayMarkup() {
    const spellIds = this.getPinnedSpellIds();
    const activeSpellId = this.targetMode?.spellId || this.getSpellTraySelectionId();
    const activeSpell = SPELLS[activeSpellId];
    const preview = this.targetMode?.type === "spell" ? this.getActiveSpellTargetPreview() : null;
    const focusState = activeSpell
      ? this.mode === "target" && preview
        ? (preview.valid
          ? `Will hit ${preview.hitCount} foe${preview.hitCount === 1 ? "" : "s"}${preview.targetingMode === "blast" ? " in the blast" : ""}.`
          : preview.reason || "Move the cursor to a better cast.")
        : this.getSpellMechanicalReadout(activeSpell) || activeSpell.description
      : "No spell selected.";
    const focusTone = this.mode === "target" && preview && !preview.valid ? "invalid" : "valid";
    const rows = spellIds.map((spellId) => {
      const spell = SPELLS[spellId];
      if (!spell) {
        return "";
      }
      const iconMeta = this.getSpellIconMeta(spell);
      const manaCost = getSpellCost(this, spell);
      const overcast = this.player.mana < manaCost;
      const active = activeSpellId === spellId;
      return `
        <button class="spell-tray-card${active ? " active" : ""}${overcast ? " warning" : ""}" data-action="spell-select" data-double-action="spell-cast" data-surface="tray" data-spell="${spellId}" data-focus-key="spell-tray:${spellId}" type="button" aria-label="${escapeHtml(`Select ${spell.name}`)}" title="${escapeHtml(`${spell.name} · ${manaCost} mana${overcast ? " · overcast" : ""}`)}">
          <span class="spell-tray-card-symbol" aria-hidden="true">${escapeHtml(iconMeta.symbol)}</span>
        </button>
      `;
    }).join("");

    return `
      <div class="spell-tray-shell${this.mode === "target" ? " targeting" : ""}">
        <div class="spell-tray-header">
          <div>
            <div class="spell-tray-kicker">Field Casting</div>
            <div class="spell-tray-title">Spell Tray ${spellIds.length > 0 ? `(${spellIds.length}/${this.getSpellTrayLimit()})` : ""}</div>
          </div>
        </div>
        <div class="spell-tray-summary ${focusTone}">
          <div class="spell-tray-summary-head">
            <strong>${escapeHtml(activeSpell?.name || "Spell ready")}</strong>
            <span>${escapeHtml(activeSpell ? `${getSpellCost(this, activeSpell)} mana | ${getSpellCategoryLabel(activeSpell)} | ${this.getSpellUiTargetingLabel(activeSpell)}` : "")}</span>
          </div>
          <div class="spell-tray-summary-copy">${escapeHtml(focusState)}</div>
          <div class="spell-tray-summary-actions">
            <button class="tiny-button" data-action="spell-cast" data-spell="${activeSpellId}" data-focus-key="${this.getSpellCastFocusKey(activeSpellId, "tray")}" type="button"${activeSpell ? "" : " disabled"}>Cast</button>
            <button class="tiny-button" data-action="open-hub" data-tab="magic" data-focus-key="spell-tray:book" type="button">Book</button>
            <button class="tiny-button" data-action="spell-tray-close" data-focus-key="spell-tray:close" type="button">Hide</button>
          </div>
          ${this.mode === "target" && activeSpell ? `<div class="spell-tray-summary-note">Confirm cast or tap a valid tile. Cancel keeps the board clear.</div>` : ""}
        </div>
        <div class="spell-tray-grid">${rows}</div>
      </div>
    `;
  }

  syncSpellTray() {
    if (!this.spellTray) {
      return;
    }
    if (!this.shouldShowSpellTray()) {
      this.spellTray.classList.add("hidden");
      this.spellTray.innerHTML = "";
      this.lastSpellTrayMarkup = "";
      return;
    }
    const markup = this.getSpellTrayMarkup();
    if (this.lastSpellTrayMarkup !== markup) {
      this.spellTray.innerHTML = markup;
      this.lastSpellTrayMarkup = markup;
    }
    this.spellTray.classList.remove("hidden");
  }

  showNextProgressionModal() {
    const rewardChoice = prepareNextRewardChoice(this);
    if (rewardChoice) {
      this.showRewardChoiceModal(rewardChoice);
      return true;
    }
    if (this.pendingSpellChoices > 0) {
      this.showSpellLearnModal();
      return true;
    }
    return false;
  }

  showRewardChoiceModal(choiceState) {
    const title = choiceState.type === "perk"
      ? "Level Up Perk"
      : choiceState.type === "relic"
        ? "Objective Reward"
        : "Boon Choice";
    const lookup = choiceState.type === "perk"
      ? PERK_DEFS
      : choiceState.type === "relic"
        ? RELIC_DEFS
        : BOON_DEFS;
    this.mode = "levelup";
    this.setModalVisibility(true);
    this.modalRoot.innerHTML = `
      <div class="modal mobile-sheet modal-large">
        <div class="modal-title">${escapeHtml(title)}</div>
        <div class="section-block text-block">
          ${choiceState.type === "perk"
            ? `${escapeHtml(this.player.name)} grows into a sharper build. Choose one perk.`
            : choiceState.type === "relic"
              ? "The floor breaks open and offers a meaningful relic. Choose one reward."
              : "Choose one boon and commit to how this run develops."}
        </div>
        <div class="spell-learn-grid">
          ${choiceState.options.map((id) => {
            const entry = lookup[id];
            if (!entry) {
              return "";
            }
            return `
              <button class="spell-learn-card" data-action="choose-reward" data-reward="${id}" data-focus-key="reward:${id}" type="button">
                <span class="spell-learn-tier">${escapeHtml(choiceState.type === "perk" ? "Perk" : choiceState.type === "relic" ? entry.category || "Relic" : "Boon")}</span>
                <span class="spell-learn-name">${escapeHtml(entry.name)}</span>
                <span class="spell-learn-copy">${escapeHtml(entry.description)}</span>
              </button>
            `;
          }).join("")}
        </div>
      </div>
    `;
    this.modalRoot.classList.remove("hidden");
    this.applyControllerNavigationMetadata();
    this.focusFirstUiElement();
  }

  chooseRewardChoice(rewardId) {
    if (!chooseReward(this, rewardId)) {
      return;
    }
    if (this.showNextProgressionModal()) {
      this.render();
      return;
    }
    if (this.pendingTurnResolution !== null) {
      this.setModalVisibility(false);
      this.modalRoot.classList.add("hidden");
      this.modalRoot.innerHTML = "";
      this.mode = "game";
      const advanceTurn = this.pendingTurnResolution;
      this.pendingTurnResolution = null;
      this.resolveTurn(advanceTurn);
      return;
    }
    this.closeModal();
    this.render();
  }

  updateFov() {
    if (!this.player || !this.currentLevel) {
      return;
    }
    clearVisibility(this.currentLevel);
    const radius = this.getLightRadius();
    for (let y = this.player.y - radius; y <= this.player.y + radius; y += 1) {
      for (let x = this.player.x - radius; x <= this.player.x + radius; x += 1) {
        if (!inBounds(this.currentLevel, x, y)) {
          continue;
        }
        if (distance({ x, y }, this.player) <= radius && hasLineOfSight(this.currentLevel, this.player.x, this.player.y, x, y)) {
          setVisible(this.currentLevel, x, y, true);
          setExplored(this.currentLevel, x, y, true);
        }
      }
    }
    this.processDiscoveryEvents();
  }

  getViewport() {
    const half = Math.floor(VIEW_SIZE / 2);
    let vx = this.player ? this.player.x - half : 0;
    let vy = this.player ? this.player.y - this.getViewportAnchorRow() : 0;
    vx = clamp(vx, 0, Math.max(0, this.currentLevel.width - VIEW_SIZE));
    vy = clamp(vy, 0, Math.max(0, this.currentLevel.height - VIEW_SIZE));
    return { x: vx, y: vy };
  }

  showSpellLearnModal() {
    const options = this.getLearnableSpellOptions();
    if (options.length === 0) {
      this.pendingSpellChoices = 0;
      if (this.showNextProgressionModal()) {
        return;
      }
      if (this.pendingTurnResolution !== null) {
        const advanceTurn = this.pendingTurnResolution;
        this.pendingTurnResolution = null;
        this.resolveTurn(advanceTurn);
      } else {
        this.closeModal();
        this.render();
      }
      return;
    }

    const groupedOptions = getSpellCategoryDefs().map((category) => ({
      ...category,
      spells: options.filter((spell) => getSpellCategoryKey(spell) === category.key)
    })).filter((group) => group.spells.length > 0);
    const filterDefs = this.getSpellFilterDefsForEntries(options);
    const activeFilter = filterDefs.some((entry) => entry.key === this.activeSpellLearnFilter) ? this.activeSpellLearnFilter : "all";
    this.mode = "levelup";
    this.setModalVisibility(true);
    this.modalRoot.innerHTML = `
      <div class="modal mobile-sheet modal-large">
        <div class="modal-title">Spell Study</div>
        <div class="section-block text-block">
          ${escapeHtml(this.player.name)} has reached level ${this.player.level}. Choose ${this.pendingSpellChoices > 1 ? "a spell for this level and then choose another." : "a new spell to learn."}
        </div>
        ${this.getSpellFilterChipsMarkup(activeFilter, "spell-learn-filter", (key) => this.getSpellLearnFilterFocusKey(key), "spell-learn-filter-row", filterDefs)}
        <div class="spell-learn-groups">
          ${groupedOptions.map((group) => `
            ${activeFilter !== "all" && activeFilter !== group.key ? "" : `
            <section class="spell-learn-group">
              <div class="magic-category-heading">
                <div class="magic-category-title">${escapeHtml(group.label)}</div>
                <div class="magic-category-count">${group.spells.length}</div>
              </div>
              <div class="spell-learn-grid">
                ${group.spells.map((spell) => `
                  <button class="spell-learn-card" data-action="learn-spell" data-spell="${spell.id}" data-focus-key="learn-spell:${spell.id}" type="button">
                    <span class="spell-learn-tier">${escapeHtml(`${group.label} | ${spell.classAffinity === "shared" ? "Shared" : capitalize(spell.classAffinity || "shared")} | Tier ${spell.tier || 1}`)}</span>
                    <span class="spell-learn-name">${escapeHtml(spell.name)}</span>
                    <span class="spell-learn-meta">${escapeHtml(`${capitalize(spell.school || "spell")} | ${spell.target === "monster" ? `Range ${spell.range || 1}` : "Self cast"} | ${getSpellCost(this, spell)} mana | ${this.getSpellUnlockTimingText(spell)}`)}</span>
                    <span class="spell-learn-copy">${escapeHtml(this.getSpellCardCopy(spell))}</span>
                  </button>
                `).join("")}
              </div>
            </section>
            `}
          `).join("")}
        </div>
      </div>
    `;
    this.modalRoot.classList.remove("hidden");
    this.applyModalSurfacePresentation("spell-study", this.modalRoot.querySelector(".modal"));
    this.applyControllerNavigationMetadata();
    this.focusFirstUiElement();
  }

  learnLevelUpSpell(spellId) {
    if (this.mode !== "levelup") {
      return;
    }
    const spell = SPELLS[spellId];
    if (!spell || this.player.spellsKnown.includes(spellId) || (spell.learnLevel || 1) > this.player.level) {
      return;
    }

    this.player.spellsKnown.push(spellId);
    const trayBefore = new Set(this.getPinnedSpellIds());
    this.addSpellToTrayIfSpace(spellId);
    this.pendingSpellChoices = Math.max(0, this.pendingSpellChoices - 1);
    const trayAdded = !trayBefore.has(spellId) && this.getPinnedSpellIds().includes(spellId);
    this.log(`${this.player.name} learns ${spell.name}. ${this.getSpellMechanicalReadout(spell) || spell.description}${trayAdded ? " Added to the tray." : ""}`, "good");

    if (this.pendingSpellChoices > 0 && this.getLearnableSpellOptions().length > 0) {
      this.showSpellLearnModal();
      this.render();
      return;
    }

    this.pendingSpellChoices = 0;
    if (this.showNextProgressionModal()) {
      this.render();
      return;
    }
    if (this.pendingTurnResolution !== null) {
      this.setModalVisibility(false);
      this.modalRoot.classList.add("hidden");
      this.modalRoot.innerHTML = "";
      this.mode = "game";
      const advanceTurn = this.pendingTurnResolution;
      this.pendingTurnResolution = null;
      this.resolveTurn(advanceTurn);
      return;
    }

    this.closeModal();
    this.render();
  }

  getModalSurfaceTier(surfaceKey = "") {
    if (!surfaceKey) {
      return "workspace";
    }
    if (surfaceKey === "utility-menu" || surfaceKey === "burden-check") {
      return "quick";
    }
    if (surfaceKey === "help" || surfaceKey === "hub:journal") {
      return "reader";
    }
    if (
      surfaceKey.startsWith("hub:")
      || surfaceKey.startsWith("shop:")
      || surfaceKey.startsWith("save-slots:")
      || ["settings", "character-sheet", "bank", "sage", "temple", "spell-study", "title", "creation"].includes(surfaceKey)
    ) {
      return "workspace";
    }
    return "quick";
  }

  getModalFrameClass(surfaceKey = "") {
    return `modal-surface-${this.getModalSurfaceTier(surfaceKey)}`;
  }

  applyModalSurfacePresentation(surfaceKey = "", modalElement = null) {
    if (this.modalRoot) {
      this.modalRoot.dataset.surfaceTier = this.getModalSurfaceTier(surfaceKey);
      this.modalRoot.dataset.surfaceKey = surfaceKey || "";
    }
    if (!(modalElement instanceof HTMLElement)) {
      return;
    }
    modalElement.classList.add("modal-frame");
    modalElement.classList.remove("modal-surface-quick", "modal-surface-workspace", "modal-surface-reader");
    modalElement.classList.add(this.getModalFrameClass(surfaceKey));
    this.ensureModalCloseButton(surfaceKey, modalElement);
  }

  ensureModalCloseButton(surfaceKey = "", modalElement = null) {
    if (!(modalElement instanceof HTMLElement)) {
      return;
    }
    const forcedChoiceSurfaces = new Set(["spell-study", "title", "creation", "burden-check"]);
    const existing = modalElement.querySelector(":scope > .modal-close-button");
    if (forcedChoiceSurfaces.has(surfaceKey)) {
      if (existing) {
        existing.remove();
      }
      return;
    }
    if (existing) {
      return;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "modal-close-button";
    button.dataset.action = "close-modal";
    button.dataset.focusKey = "modal:close";
    button.setAttribute("aria-label", "Close");
    button.title = "Close";
    button.innerHTML = "<span aria-hidden=\"true\">\u00d7</span>";
    modalElement.prepend(button);
  }

  getUtilityMenuRoot(root = this.modalRoot) {
    return root?.querySelector(".utility-menu-sheet") || null;
  }

  syncUtilityMenuExpansion(root = this.modalRoot) {
    if (this.modalSurfaceKey !== "utility-menu") {
      return;
    }
    const menuRoot = this.getUtilityMenuRoot(root);
    if (!(menuRoot instanceof HTMLElement)) {
      return;
    }
    const disclosure = menuRoot.querySelector("[data-utility-more-host]");
    const toggle = menuRoot.querySelector('[data-action="toggle-utility-more"]');
    menuRoot.classList.toggle("utility-menu-expanded", this.utilityMenuSecondaryExpanded);
    if (disclosure instanceof HTMLElement) {
      disclosure.hidden = !this.utilityMenuSecondaryExpanded;
    }
    if (toggle instanceof HTMLElement) {
      toggle.setAttribute("aria-expanded", this.utilityMenuSecondaryExpanded ? "true" : "false");
      toggle.dataset.expanded = this.utilityMenuSecondaryExpanded ? "true" : "false";
      toggle.querySelector("[data-utility-more-label]")?.replaceChildren(
        document.createTextNode(this.utilityMenuSecondaryExpanded ? "Hide Secondary Tools" : "More Tools")
      );
      toggle.querySelector("[data-utility-more-meta]")?.replaceChildren(
        document.createTextNode(this.utilityMenuSecondaryExpanded ? "Collapse map, rules, and trace" : "Reveal map, rules, and trace")
      );
    }
  }

  setUtilityMenuSecondaryExpanded(expanded, options = {}) {
    const {
      focusTarget = null,
      fallbackFocus = false
    } = options;
    this.utilityMenuSecondaryExpanded = Boolean(expanded);
    this.syncUtilityMenuExpansion();
    this.applyControllerNavigationMetadata();
    const focusElement = this.resolveModalFocusTarget(
      focusTarget || (this.utilityMenuSecondaryExpanded ? "utility:more-toggle" : "utility:more-toggle")
    );
    if (focusElement) {
      this.focusUiElement(focusElement);
    } else if (fallbackFocus) {
      this.focusFirstUiElement();
    }
  }

  syncFieldGuideRailState(root = this.modalRoot) {
    const rail = root?.querySelector(".field-guide-rail");
    const shell = root?.querySelector(".field-guide-shell");
    const scrollHost = this.getModalScrollHost();
    const shouldCollapse = this.getModalLayoutMode() === "mobile" && scrollHost instanceof HTMLElement && scrollHost.scrollTop > 140;
    this.fieldGuideRailCollapsed = shouldCollapse;
    if (shell instanceof HTMLElement) {
      shell.classList.toggle("field-guide-rail-collapsed", shouldCollapse);
    }
    if (rail instanceof HTMLElement) {
      rail.dataset.collapsed = shouldCollapse ? "true" : "false";
    }
  }

  syncModalAdaptiveUiState() {
    if (!(this.modalRoot instanceof HTMLElement) || this.modalRoot.classList.contains("hidden")) {
      return;
    }
    this.syncUtilityMenuExpansion();
    if (this.modalSurfaceKey === "hub:journal") {
      const scrollHost = this.getModalScrollHost();
      if (scrollHost instanceof HTMLElement && scrollHost.dataset.fieldGuideScrollBound !== "true") {
        scrollHost.addEventListener("scroll", () => {
          if (this.modalSurfaceKey === "hub:journal") {
            this.syncFieldGuideRailState();
          }
        }, { passive: true });
        scrollHost.dataset.fieldGuideScrollBound = "true";
      }
      this.syncFieldGuideRailState();
      return;
    }
    this.fieldGuideRailCollapsed = false;
  }

  showSimpleModal(title, bodyHtml, options = {}) {
    const {
      surfaceKey = null,
      preserveScroll = false,
      focusTarget = null,
      fallbackFocus = true,
      closeLabel = "Close",
      closeFocusKey = "modal:close",
      modalReturnContext = null
    } = options;
    this.setModalVisibility(true);
    const previousState = preserveScroll ? this.captureModalRefreshState(surfaceKey) : null;
    const template = document.getElementById("list-modal-template");
    const fragment = template.content.cloneNode(true);
    fragment.getElementById("generic-modal-title").textContent = title;
    fragment.getElementById("generic-modal-body").innerHTML = bodyHtml;
    this.applyModalSurfacePresentation(surfaceKey, fragment.querySelector(".modal"));
    const closeButton = fragment.querySelector('[data-action="close-modal"]');
    if (closeButton) {
      closeButton.textContent = closeLabel;
      closeButton.dataset.focusKey = closeFocusKey;
    }
    this.clearModalInteractionFeedback();
    this.modalRoot.innerHTML = "";
    this.modalRoot.appendChild(fragment);
    this.modalRoot.classList.remove("hidden");
    this.modalSurfaceKey = surfaceKey;
    this.modalReturnContext = modalReturnContext;
    this.recordTelemetry("modal_opened", {
      surface: surfaceKey || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    });
    this.ensureModalInteractionFeedbackHost();
    this.syncModalInteractionFeedbackHost();
    this.syncModalAdaptiveUiState();
    this.applyControllerNavigationMetadata();
    const nextModal = this.getModalScrollHost();
    if (nextModal && previousState) {
      nextModal.scrollTop = previousState.scrollTop;
    }
    const focusElement = this.resolveModalFocusTarget(focusTarget, previousState);
    if (focusElement) {
      this.focusUiElement(focusElement);
      return;
    }
    if (fallbackFocus) {
      this.focusFirstUiElement();
    }
  }

  renderLogMarkup(limit = 24) {
    return this.messages.slice(-limit).map((entry) => `
      <div class="log-line ${entry.tone ? `log-${entry.tone}` : ""}">
        <span class="log-turn">[${entry.turn}]</span> ${escapeHtml(entry.message)}
      </div>
    `).join("");
  }

  getEquipmentBaseSlot(slot = "") {
    if (slot.startsWith("ring")) {
      return "ring";
    }
    if (slot.startsWith("amulet")) {
      return "amulet";
    }
    return slot;
  }

  ensureEquipmentAliases(player = this.player) {
    const equipment = player?.equipment;
    if (!equipment) {
      return;
    }
    const defineAlias = (legacySlot, targetSlot) => {
      Object.defineProperty(equipment, legacySlot, {
        configurable: true,
        enumerable: false,
        get: () => equipment[targetSlot] || null,
        set: (value) => {
          equipment[targetSlot] = value || null;
        }
      });
    };
    defineAlias("ring", "ring1");
    defineAlias("amulet", "amulet1");
  }

  getEquipmentFamilySlots(slot = "") {
    const baseSlot = this.getEquipmentBaseSlot(slot);
    if (baseSlot === "ring") {
      return ["ring1", "ring2", "ring3", "ring4"];
    }
    if (baseSlot === "amulet") {
      return ["amulet1", "amulet2"];
    }
    return baseSlot ? [baseSlot] : [];
  }

  getEquipmentEntriesForSlot(slot = "") {
    return this.getEquipmentFamilySlots(slot).map((entrySlot) => ({
      slot: entrySlot,
      item: this.player?.equipment?.[entrySlot] || null
    }));
  }

  getEquipmentSlotForItem(item) {
    if (!item?.slot) {
      return {
        targetSlot: "",
        entries: [],
        emptyEntries: [],
        occupiedEntries: [],
        swappableEntries: [],
        blockedByCurse: false
      };
    }
    const entries = this.getEquipmentEntriesForSlot(item.slot);
    const emptyEntries = entries.filter((entry) => !entry.item);
    const occupiedEntries = entries.filter((entry) => Boolean(entry.item));
    const swappableEntries = occupiedEntries.filter((entry) => !entry.item.cursed);
    const targetEntry = emptyEntries[0] || swappableEntries[0] || null;
    return {
      targetSlot: targetEntry?.slot || "",
      targetEntry,
      entries,
      emptyEntries,
      occupiedEntries,
      swappableEntries,
      blockedByCurse: !targetEntry && occupiedEntries.length > 0
    };
  }

  getPackSlotDefinitions() {
    return [
      { slot: "cloak", label: "Cloak", emptyText: "Back slot for cloaks and wraps.", area: "cloak" },
      { slot: "head", label: "Head", emptyText: "Helms, hoods, and crowns.", area: "head" },
      { slot: "amulet1", label: "Amulet I", emptyText: "First neck slot for charms and talismans.", area: "amulet1" },
      { slot: "amulet2", label: "Amulet II", emptyText: "Second neck slot for charms and talismans.", area: "amulet2" },
      { slot: "weapon", label: "Weapon", emptyText: "Your main striking hand.", area: "weapon" },
      { slot: "body", label: "Armor", emptyText: "Chest armor and robes.", area: "armor" },
      { slot: "offhand", label: "Offhand", emptyText: "Shield or focus carried opposite the weapon.", area: "offhand" },
      { slot: "ring1", label: "Ring I", emptyText: "First active ring slot.", area: "ring1" },
      { slot: "ring2", label: "Ring II", emptyText: "Second active ring slot.", area: "ring2" },
      { slot: "ring3", label: "Ring III", emptyText: "Third active ring slot.", area: "ring3" },
      { slot: "ring4", label: "Ring IV", emptyText: "Fourth active ring slot.", area: "ring4" },
      { slot: "feet", label: "Feet", emptyText: "Boots and travel footwear.", area: "feet" }
    ];
  }

  getPackSlotDefinition(slot) {
    const exact = this.getPackSlotDefinitions().find((entry) => entry.slot === slot);
    if (exact) {
      return exact;
    }
    const baseSlot = this.getEquipmentBaseSlot(slot);
    const familyEntry = this.getPackSlotDefinitions().find((entry) => this.getEquipmentBaseSlot(entry.slot) === baseSlot);
    if (familyEntry) {
      return {
        ...familyEntry,
        slot,
        label: capitalize(baseSlot)
      };
    }
    return { slot, label: capitalize(slot), emptyText: "Unused slot.", area: slot };
  }

  getHubTabFocusKey(tabId) {
    return `hub:tab:${tabId}`;
  }

  getJournalSectionFocusKey(sectionId) {
    return `journal:section:${sectionId}`;
  }

  getJournalSectionDefs() {
    return [
      { id: "current", label: "Current" },
      { id: "mission", label: "Mission" },
      { id: "guide", label: "Rules" },
      { id: "chronicle", label: "Chronicle" }
    ];
  }

  getResolvedJournalSection(sectionId = this.activeJournalSection) {
    const fallback = this.getJournalSectionDefs()[0]?.id || "current";
    return this.getJournalSectionDefs().some((section) => section.id === sectionId)
      ? sectionId
      : fallback;
  }

  getPackItemFocusKey(index) {
    return `pack:item:${index}`;
  }

  getPackSlotFocusKey(slot) {
    return `pack:slot:${slot}`;
  }

  getPackActionFocusKey(action, value) {
    return `pack:${action}:${value}`;
  }

  getPackFilterFocusKey(filter) {
    return `pack:filter:${filter}`;
  }

  getShopBuyFocusKey(shopId, itemId) {
    return `shop:buy:${shopId}:${itemId}`;
  }

  getShopPanelFocusKey(panel) {
    return `shop:panel:${panel}`;
  }

  getShopSellFocusKey(index) {
    return `shop:sell:${index}`;
  }

  getTownActionFocusKey(action) {
    return `town:${action}`;
  }

  getTownUnlockFocusKey(unlockId) {
    return `town:unlock:${unlockId}`;
  }

  getServiceFocusKey(serviceType, serviceId) {
    return `${serviceType}:${serviceId}`;
  }

  setPackSelection(selection) {
    if (!selection) {
      return;
    }
    this.hoveredPackSelection = null;
    if (selection.type === "slot") {
      this.activePackSelection = { type: "slot", value: selection.value };
      return;
    }
    this.activePackSelection = { type: "inventory", value: Math.max(0, Number(selection.value) || 0) };
  }

  getDefaultPackSelection(preferredIndex = 0) {
    if (this.player.inventory.length > 0) {
      return { type: "inventory", value: clamp(preferredIndex, 0, this.player.inventory.length - 1) };
    }
    const equippedSlot = this.getPackSlotDefinitions().find(({ slot }) => this.player.equipment[slot]);
    if (equippedSlot) {
      return { type: "slot", value: equippedSlot.slot };
    }
    return { type: "slot", value: "weapon" };
  }

  getDefaultEquipmentPackSelection(preferredSlot = "") {
    const validPreferredSlot = preferredSlot && this.getPackSlotDefinitions().some(({ slot }) => slot === preferredSlot)
      ? preferredSlot
      : "";
    if (validPreferredSlot) {
      return { type: "slot", value: validPreferredSlot };
    }
    if (this.activePackSelection?.type === "slot" && this.getPackSlotDefinitions().some(({ slot }) => slot === this.activePackSelection.value)) {
      return { type: "slot", value: this.activePackSelection.value };
    }
    if (this.activePackSelection?.type === "inventory") {
      const selectedItem = this.player.inventory[this.activePackSelection.value] || null;
      const targetSlot = selectedItem?.slot
        ? (this.getEquipmentSlotForItem(selectedItem).targetSlot || this.getPackSlotDefinition(selectedItem.slot).slot)
        : "";
      if (targetSlot) {
        return { type: "slot", value: targetSlot };
      }
    }
    const equippedSlot = this.getPackSlotDefinitions().find(({ slot }) => this.player.equipment[slot]);
    return { type: "slot", value: equippedSlot?.slot || "weapon" };
  }

  resolvePackSelection() {
    const selection = this.activePackSelection;
    if (selection?.type === "inventory" && this.player.inventory[selection.value]) {
      return selection;
    }
    if (selection?.type === "slot" && this.getPackSlotDefinitions().some(({ slot }) => slot === selection.value)) {
      return selection;
    }
    this.activePackSelection = this.getDefaultPackSelection();
    return this.activePackSelection;
  }

  getCompatibleInventoryIndexes(slot) {
    return this.player.inventory.reduce((matches, item, index) => {
      if (this.getEquipmentBaseSlot(item.slot || "") === this.getEquipmentBaseSlot(slot)) {
        matches.push(index);
      }
      return matches;
    }, []);
  }

  getPackSelectionModelFor(selectionInput) {
    const selection = selectionInput?.type ? selectionInput : this.resolvePackSelection();
    if (selection.type === "slot") {
      const slotDef = this.getPackSlotDefinition(selection.value);
      const item = this.player.equipment[selection.value] || null;
      return {
        selection,
        slotDef,
        item,
        compatibleIndexes: this.getCompatibleInventoryIndexes(selection.value),
        comparison: null,
        weightDelta: 0,
        encumbrancePreview: this.describeBurdenPreview(0)
      };
    }
    const item = this.player.inventory[selection.value] || null;
    const slotDef = item && item.slot ? this.getPackSlotDefinition(item.slot) : null;
    const comparison = this.getPackComparisonModel(item);
    return {
      selection,
      slotDef,
      item,
      compatibleIndexes: [],
      comparison,
      weightDelta: comparison.weightDelta,
      encumbrancePreview: comparison.encumbrancePreview
    };
  }

  getPackSelectionModel() {
    return this.getPackSelectionModelFor(this.resolvePackSelection());
  }

  getPackItemActionLabel(item) {
    if (!item) {
      return "Use";
    }
    if (item.kind === "weapon" || item.kind === "armor") {
      return "Equip";
    }
    if (item.kind === "spellbook") {
      return "Study";
    }
    if (item.kind === "charged") {
      return "Use Charge";
    }
    return "Use";
  }

  getCurrentPackShopContext() {
    return this.currentDepth === 0 && this.pendingShop ? this.pendingShop.id : "";
  }

  getPackItemMeta(item, semanticEntry = null) {
    const bits = [];
    if (semanticEntry?.recommendation) {
      bits.push(semanticEntry.recommendation);
    }
    if (semanticEntry?.categoryLabel) {
      bits.push(semanticEntry.categoryLabel);
    }
    bits.push(item.slot ? this.getPackSlotDefinition(item.slot).label : semanticEntry?.kindLabel || item.kindLabel || classifyItem(item));
    if (item.kind === "weapon") {
      bits.push(`Atk ${getItemPower(item)}`);
      if (getItemAccuracyBonus(item)) {
        bits.push(`Hit ${getItemAccuracyBonus(item) > 0 ? `+${getItemAccuracyBonus(item)}` : getItemAccuracyBonus(item)}`);
      }
      if (getItemCritBonus(item)) {
        bits.push(`Crit +${getItemCritBonus(item)}`);
      }
    } else if (item.kind === "armor") {
      bits.push(`Arm ${getItemArmor(item)}`);
      if (getItemGuardBonus(item)) {
        bits.push(`Guard ${getItemGuardBonus(item)}`);
      }
      if (getItemWardBonus(item)) {
        bits.push(`Ward ${getItemWardBonus(item)}`);
      }
    } else if (item.kind === "charged" && item.identified) {
      bits.push(`${item.charges}/${item.maxCharges || item.charges} ch`);
    } else if (item.kind === "spellbook") {
      bits.push(this.player.spellsKnown.includes(item.spell) ? "Known spell" : "Learn spell");
    }
    if (semanticEntry?.sellHereTag) {
      bits.push("Sell Here");
    } else if (semanticEntry?.shopTags?.[0]) {
      bits.push(semanticEntry.shopTags[0]);
    }
    return bits.join(" • ");
  }

  getPackItemNote(item, semanticEntry = null) {
    const bits = [`Wt ${item.weight || 0}`, `${Math.floor(getItemValue(item))} gp`];
    if (item.affixId && LOOT_AFFIX_DEFS[item.affixId]) {
      bits.push(LOOT_AFFIX_DEFS[item.affixId].name);
    }
    if (semanticEntry?.unknown || (canIdentify(item) && !item.identified)) {
      bits.push("Unknown");
    } else {
      bits.push("Known");
    }
    if (item.cursed) {
      bits.push("Cursed");
    }
    if (item.doNotSell) {
      bits.push("No Sell");
    }
    const undeadBonus = getItemBonusVsUndead(item);
    if (undeadBonus > 0) {
      bits.push(`Vs Undead +${undeadBonus}`);
    }
    const overcastRelief = getItemOvercastRelief(item);
    if (overcastRelief > 0) {
      bits.push(`Overcast -${overcastRelief}`);
    }
    if (semanticEntry?.heavyLabel) {
      bits.push(semanticEntry.heavyLabel);
    } else if (!semanticEntry?.shopTags?.length) {
      bits.push("No buyer yet");
    }
    return bits.join(" • ");
  }

  getPackCompactRowMeta(item, semanticEntry = null) {
    const shopId = this.getCurrentPackShopContext();
    const bits = [];
    bits.push(item.slot ? this.getPackSlotDefinition(item.slot).label : semanticEntry?.kindLabel || item.kindLabel || classifyItem(item));
    if (item.kind === "weapon") {
      bits.push(`Atk ${getItemPower(item)}`);
    } else if (item.kind === "armor") {
      bits.push(`Arm ${getItemArmor(item)}`);
    } else if (item.kind === "charged" && item.identified) {
      bits.push(`${item.charges || 0}/${item.maxCharges || item.charges || 0} chg`);
    }
    bits.push(shopId || this.activePackFilter === "sell"
      ? `${Math.floor(getItemValue(item))} gp`
      : `Wt ${item.weight || 0}`);
    return bits.filter(Boolean).slice(0, 3).join(" / ");
  }

  getPackToolbarMarkup(inventoryModel) {
    const filterLabel = inventoryModel.filterDefs.find((entry) => entry.key === this.activePackFilter)?.label || "All";
    const selectedLabel = inventoryModel.selectedEntry
      ? getItemName(inventoryModel.selectedEntry.item)
      : inventoryModel.firstVisibleIndex >= 0
        ? "Ready to inspect"
        : "No visible item";
    return `
      <div class="pack-toolbar">
        <div class="pack-toolbar-meta">
          <span class="pack-toolbar-chip">${escapeHtml(filterLabel)}</span>
          <span class="pack-toolbar-detail">${inventoryModel.visibleCount} visible</span>
          <span class="pack-toolbar-focus">${escapeHtml(this.getCompactUiCopy(selectedLabel, 28))}</span>
        </div>
        <div class="pack-filter-row">
          ${inventoryModel.filterDefs.map((filterDef) => `
            <button class="hub-filter-chip${this.activePackFilter === filterDef.key ? " active" : ""}" data-action="pack-filter" data-filter="${filterDef.key}" data-focus-key="${this.getPackFilterFocusKey(filterDef.key)}" type="button">${escapeHtml(filterDef.label)}</button>
          `).join("")}
        </div>
      </div>
    `;
  }

  getPackActiveRowInlineMarkup(entry) {
    if (!entry?.item?.slot) {
      return "";
    }
    const selectionModel = this.getPackSelectionModelFor({ type: "inventory", value: entry.index });
    const comparison = selectionModel?.comparison;
    if (!comparison) {
      return "";
    }
    const rows = [];
    const targetSlotLabel = comparison.targetSlot ? this.getPackSlotDefinition(comparison.targetSlot).label : "";
    if (comparison.blockedByCurse) {
      rows.push({ tone: "bad", text: "Slot locked by curse" });
    } else if (comparison.fitsEmptySlot && targetSlotLabel) {
      rows.push({ tone: "good", text: `Open ${targetSlotLabel}` });
    } else if (comparison.equipped && targetSlotLabel) {
      rows.push({ tone: "neutral", text: `Swap ${targetSlotLabel}` });
    }
    const targetComparison = comparison.comparisons?.find((item) => item.slot === comparison.targetSlot)
      || comparison.comparisons?.[0]
      || null;
    (targetComparison?.deltas || []).slice(0, 2).forEach((delta) => {
      rows.push({
        tone: delta.tone || "neutral",
        text: this.getCompactUiCopy(
          String(delta.text || "")
            .replace(/^Attack\b/i, "Atk")
            .replace(/^Armor\b/i, "Arm"),
          22
        )
      });
    });
    if (rows.length === 0) {
      return "";
    }
    return `
      <span class="pack-row-inline-compare">
        ${rows.map((row) => `<span class="pack-inline-chip tone-${escapeHtml(row.tone)}">${escapeHtml(row.text)}</span>`).join("")}
      </span>
    `;
  }

  getPackRowTagMarkup(entry) {
    if (!entry) {
      return "";
    }
    const tags = [
      `<span class="item-chip category-chip">${escapeHtml(entry.categoryLabel || "Item")}</span>`,
      ...((entry.scanTags || []).slice(0, 3).map((tag) => `<span class="item-chip semantic-chip">${escapeHtml(capitalize(tag.replace(/-/g, " ")))}</span>`))
    ];
    return `<div class="pack-item-tags">${tags.join("")}</div>`;
  }

  getPackHoverPreviewSummary(model, semanticEntry = null) {
    if (!model) {
      return "";
    }
    if (model.selection.type === "slot") {
      if (!model.item) {
        return model.compatibleIndexes.length > 0
          ? `${model.compatibleIndexes.length} carried item${model.compatibleIndexes.length === 1 ? "" : "s"} fit this slot.`
          : "No carried item fits this slot right now.";
      }
      return buildEquipmentSlotSummary(this, model.slotDef, model.compatibleIndexes.length).reason;
    }
    if (model.comparison?.blockedByCurse) {
      return `All ${this.getPackSlotDefinition(model.item.slot).label.toLowerCase()} slots are locked by curses.`;
    }
    if (model.comparison?.fitsEmptySlot) {
      return `Fits empty ${this.getPackSlotDefinition(model.comparison.targetSlot).label} slot.`;
    }
    if (model.comparison?.deltas?.length > 0) {
      return model.comparison.deltas.slice(0, 2).map((delta) => delta.text).join(" | ");
    }
    return semanticEntry?.reason || describeItem(model.item);
  }

  getPackHoverPreviewMarkup(previewModel, inventoryModel) {
    if (!previewModel || this.isSamePackSelection(previewModel.selection, this.resolvePackSelection())) {
      return "";
    }
    const previewEntry = previewModel.selection.type === "inventory"
      ? inventoryModel.entries.find((entry) => entry.index === previewModel.selection.value) || null
      : null;
    const previewTitle = previewModel.item
      ? getItemName(previewModel.item)
      : previewModel.slotDef?.label || "Preview";
    const previewSummary = this.getPackHoverPreviewSummary(previewModel, previewEntry);
    const previewTags = previewModel.item
      ? this.getItemBadgeMarkup(previewModel.item, previewEntry, previewModel)
      : `<span class="item-chip">${escapeHtml(previewModel.slotDef?.label || "Slot")}</span>`;
    return `
      <div class="pack-hover-preview">
        <div class="pack-hover-preview-head">
          <div>
            <div class="pack-hover-preview-kicker">Hover Preview</div>
            <div class="pack-hover-preview-title">${escapeHtml(previewTitle)}</div>
          </div>
          <div class="pack-hover-preview-note">Preview only. Select to act.</div>
        </div>
        <div class="pack-item-badges">${previewTags}</div>
        <div class="pack-hover-preview-copy">${escapeHtml(previewSummary)}</div>
      </div>
    `;
  }

  buildComparisonDelta(label, delta, invert = false) {
    if (!delta) {
      return null;
    }
    const good = invert ? delta < 0 : delta > 0;
    return {
      label,
      delta,
      tone: good ? "good" : "bad",
      text: `${label} ${delta > 0 ? `+${delta}` : delta}`
    };
  }

  getPackComparisonModel(item) {
    if (!item || !item.slot) {
      return {
        equipped: null,
        targetSlot: "",
        slotEntries: [],
        emptySlots: [],
        fitsEmptySlot: false,
        blockedByCurse: false,
        comparisons: [],
        deltas: [],
        weightDelta: 0,
        encumbrancePreview: this.describeBurdenPreview(0)
      };
    }

    const equipTarget = this.getEquipmentSlotForItem(item);
    const comparisons = equipTarget.entries
      .filter((entry) => entry.item)
      .map((entry) => ({
        slot: entry.slot,
        label: this.getPackSlotDefinition(entry.slot).label,
        equipped: entry.item,
        deltas: [
          this.buildComparisonDelta("Attack", getItemPower(item) - getItemPower(entry.item)),
          this.buildComparisonDelta("Armor", getItemArmor(item) - getItemArmor(entry.item)),
          this.buildComparisonDelta("Accuracy", getItemAccuracyBonus(item) - getItemAccuracyBonus(entry.item)),
          this.buildComparisonDelta("Crit", getItemCritBonus(item) - getItemCritBonus(entry.item)),
          this.buildComparisonDelta("Guard", getItemGuardBonus(item) - getItemGuardBonus(entry.item)),
          this.buildComparisonDelta("Ward", getItemWardBonus(item) - getItemWardBonus(entry.item)),
          this.buildComparisonDelta("Mana", getItemManaBonus(item) - getItemManaBonus(entry.item)),
          this.buildComparisonDelta("Str", getItemStrBonus(item) - getItemStrBonus(entry.item)),
          this.buildComparisonDelta("Dex", getItemDexBonus(item) - getItemDexBonus(entry.item)),
          this.buildComparisonDelta("Con", getItemConBonus(item) - getItemConBonus(entry.item)),
          this.buildComparisonDelta("Int", getItemIntBonus(item) - getItemIntBonus(entry.item)),
          this.buildComparisonDelta("Sight", getItemLightBonus(item) - getItemLightBonus(entry.item)),
          this.buildComparisonDelta("Search", getItemSearchBonus(item) - getItemSearchBonus(entry.item)),
          this.buildComparisonDelta("Fire Resist", getItemFireResist(item) - getItemFireResist(entry.item)),
          this.buildComparisonDelta("Cold Resist", getItemColdResist(item) - getItemColdResist(entry.item)),
          this.buildComparisonDelta("Weight", (item.weight || 0) - (entry.item.weight || 0), true)
        ].filter(Boolean)
      }));
    const primaryComparison = comparisons.find((entry) => entry.slot === equipTarget.targetSlot) || comparisons[0] || null;
    const equipped = primaryComparison?.equipped || null;
    const weightDelta = equipped ? (item.weight || 0) - (equipped.weight || 0) : (item.weight || 0);
    return {
      equipped,
      targetSlot: equipTarget.targetSlot,
      slotEntries: equipTarget.entries.map((entry) => ({
        ...entry,
        label: this.getPackSlotDefinition(entry.slot).label
      })),
      emptySlots: equipTarget.emptyEntries.map((entry) => entry.slot),
      fitsEmptySlot: equipTarget.emptyEntries.length > 0,
      blockedByCurse: equipTarget.blockedByCurse,
      comparisons,
      deltas: primaryComparison?.deltas || [],
      weightDelta,
      encumbrancePreview: this.describeBurdenPreview(weightDelta)
    };
  }

  getPackDeltaShortLabel(label = "") {
    switch (label) {
      case "Attack":
        return "ATK";
      case "Accuracy":
        return "HIT";
      case "Armor":
        return "ARM";
      case "Guard":
        return "GRD";
      case "Ward":
        return "WRD";
      case "Fire Resist":
        return "FIRE";
      case "Cold Resist":
        return "COLD";
      case "Weight":
        return "WT";
      case "Strength":
      case "Str":
        return "STR";
      case "Dexterity":
      case "Dex":
        return "DEX";
      case "Constitution":
      case "Con":
        return "CON";
      case "Intelligence":
      case "Int":
        return "INT";
      default:
        return label.toUpperCase();
    }
  }

  getPackComparisonTarget(item, comparison) {
    return comparison?.comparisons?.find((entry) => entry.slot === comparison.targetSlot)
      || comparison?.comparisons?.[0]
      || null;
  }

  getPackSpecialCompareRows(item, comparison) {
    if (!item || !comparison || canIdentify(item) && !item.identified) {
      return [];
    }
    const targetComparison = this.getPackComparisonTarget(item, comparison);
    const equipped = targetComparison?.equipped || comparison.equipped || null;
    const rows = [];
    const selectedUndead = getItemBonusVsUndead(item);
    const equippedUndead = equipped ? getItemBonusVsUndead(equipped) : 0;
    if (selectedUndead !== equippedUndead && selectedUndead > 0) {
      rows.push({
        label: "Special",
        tone: selectedUndead > equippedUndead ? "good" : "bad",
        text: `Undead +${selectedUndead}`
      });
    }
    const selectedEffect = String(item.effect || "").trim();
    const equippedEffect = String(equipped?.effect || "").trim();
    if (selectedEffect && selectedEffect !== equippedEffect) {
      rows.push({
        label: "Special",
        tone: "good",
        text: capitalize(selectedEffect.replace(/([A-Z])/g, " $1").trim())
      });
    }
    return rows;
  }

  getPackVisibleCompareRows(item, comparison, limit = 4) {
    if (!item || !comparison) {
      return [];
    }
    if (canIdentify(item) && !item.identified) {
      return [];
    }
    const targetComparison = this.getPackComparisonTarget(item, comparison);
    const priority = item.kind === "weapon"
      ? ["Attack", "Accuracy", "Crit", "Special", "Weight"]
      : ["Armor", "Guard", "Ward", "Str", "Dex", "Con", "Int", "Fire Resist", "Cold Resist", "Weight"];
    const priorityMap = new Map(priority.map((label, index) => [label, index]));
    const numericRows = (targetComparison?.deltas || []).map((delta) => ({
      ...delta,
      shortLabel: this.getPackDeltaShortLabel(delta.label),
      sortOrder: priorityMap.has(delta.label) ? priorityMap.get(delta.label) : 100 + Math.abs(delta.delta || 0) * -1,
      text: `${this.getPackDeltaShortLabel(delta.label)} ${delta.delta > 0 ? `+${delta.delta}` : delta.delta}`
    }));
    const specialRows = this.getPackSpecialCompareRows(item, comparison).map((row, index) => ({
      ...row,
      shortLabel: row.label,
      sortOrder: priorityMap.has("Special") ? priorityMap.get("Special") + index : 30 + index
    }));
    return [...numericRows, ...specialRows]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .slice(0, limit);
  }

  getPackVerdict(item, semanticEntry = null, comparison = null, keepCurrent = false) {
    if (keepCurrent || !item) {
      return "Keep Current";
    }
    if (canIdentify(item) && !item.identified) {
      return "Risk";
    }
    if (item.cursed || comparison?.blockedByCurse) {
      return "Risk";
    }
    if (comparison?.fitsEmptySlot) {
      return "Upgrade";
    }
    const targetComparison = this.getPackComparisonTarget(item, comparison);
    const rows = [...(targetComparison?.deltas || []), ...this.getPackSpecialCompareRows(item, comparison)];
    const goodCount = rows.filter((row) => row.tone === "good").length;
    const badCount = rows.filter((row) => row.tone === "bad").length;
    if (semanticEntry?.upgrade?.isUpgrade && (semanticEntry?.upgrade?.score || 0) >= 2) {
      return badCount > 1 ? "Tradeoff" : "Upgrade";
    }
    if (goodCount > 0 && badCount === 0) {
      return "Upgrade";
    }
    if (goodCount > 0 && badCount > 0) {
      return "Tradeoff";
    }
    if (goodCount === 0 && badCount === 0) {
      return semanticEntry?.upgrade?.score > 0 ? "Upgrade" : "Keep Current";
    }
    return Math.abs(semanticEntry?.upgrade?.score || 0) <= 1 ? "Sidegrade" : "Keep Current";
  }

  getPackRiskSummary(item, semanticEntry = null, comparison = null) {
    if (!item) {
      return "";
    }
    const risks = [];
    if (canIdentify(item) && !item.identified) {
      risks.push("Unknown");
    }
    if (comparison?.blockedByCurse) {
      risks.push("Blocked by curse");
    } else if (item.cursed) {
      risks.push("Cursed");
    }
    if (getItemOvercastRelief(item) > 0 && item.identified) {
      risks.push(`Overcast relief +${getItemOvercastRelief(item)}`);
    }
    if (semanticEntry?.heavyLabel) {
      risks.push(semanticEntry.heavyLabel);
    }
    return risks.join(" | ");
  }

  getPackBurdenLine(item, comparison = null) {
    if (!item) {
      return this.describeBurdenPreview(0).text;
    }
    const weightDelta = comparison?.weightDelta ?? (item.weight || 0);
    const weightText = `WT ${weightDelta > 0 ? `+${weightDelta}` : weightDelta}`;
    return `${weightText}. ${(comparison?.encumbrancePreview?.text || this.describeBurdenPreview(weightDelta).text)}`;
  }

  getPackNeutralOutcomeText(item, comparison = null) {
    if (!item) {
      return "Keep current.";
    }
    if (comparison?.fitsEmptySlot) {
      return "Empty slot fill.";
    }
    if (comparison?.equipped && getItemName(comparison.equipped, true) === getItemName(item, true)) {
      return "Keep current.";
    }
    return "No gain.";
  }

  getPackCompactSlotRowNote(row) {
    if (!row) {
      return "";
    }
    if (!row.item) {
      return row.compatibleEntries.length > 0 ? `${row.compatibleEntries.length} ready` : "open";
    }
    if (row.item.cursed) {
      return "cursed";
    }
    if (row.compatibleEntries.length > 0) {
      return `${row.compatibleEntries.length} ready`;
    }
    return "stable";
  }

  getPackDecisionDetailsMarkup(item, semanticEntry = null, comparison = null) {
    if (!item) {
      return `<div class="text-block muted">Nothing is selected.</div>`;
    }
    const targetComparison = this.getPackComparisonTarget(item, comparison);
    if (canIdentify(item) && !item.identified) {
      return `
        <div class="pack-item-badges">${this.getItemBadgeMarkup(item, semanticEntry, { selection: { type: "inventory", value: -1 }, item, comparison, weightDelta: comparison?.weightDelta || 0 })}</div>
        <div class="text-block muted">Identify first to reveal exact stat changes and hidden rolls.</div>
      `;
    }
    const rawStats = [
      item.kind === "weapon" ? `ATK ${getItemPower(item)}` : "",
      item.kind === "armor" ? `ARM ${getItemArmor(item)}` : "",
      getItemAccuracyBonus(item) ? `HIT ${getItemAccuracyBonus(item) > 0 ? `+${getItemAccuracyBonus(item)}` : getItemAccuracyBonus(item)}` : "",
      getItemCritBonus(item) ? `CRIT +${getItemCritBonus(item)}` : "",
      getItemGuardBonus(item) ? `GRD ${getItemGuardBonus(item)}` : "",
      getItemWardBonus(item) ? `WRD ${getItemWardBonus(item)}` : "",
      getItemStrBonus(item) ? `STR +${getItemStrBonus(item)}` : "",
      getItemDexBonus(item) ? `DEX +${getItemDexBonus(item)}` : "",
      getItemConBonus(item) ? `CON +${getItemConBonus(item)}` : "",
      getItemIntBonus(item) ? `INT +${getItemIntBonus(item)}` : "",
      getItemFireResist(item) ? `FIRE ${getItemFireResist(item)}` : "",
      getItemColdResist(item) ? `COLD ${getItemColdResist(item)}` : "",
      item.weight || item.weight === 0 ? `WT ${item.weight || 0}` : ""
    ].filter(Boolean);
    const compareRows = targetComparison?.deltas?.length
      ? targetComparison.deltas.map((delta) => `<div class="pack-comparison-row value-${delta.tone}">${escapeHtml(`${this.getPackDeltaShortLabel(delta.label)} ${delta.delta > 0 ? `+${delta.delta}` : delta.delta}`)}</div>`).join("")
      : `<div class="pack-comparison-row muted">No stat change.</div>`;
    return `
      <div class="pack-item-badges">${this.getItemBadgeMarkup(item, semanticEntry, { selection: { type: "inventory", value: -1 }, item, comparison, weightDelta: comparison?.weightDelta || 0 })}</div>
      ${rawStats.length > 0 ? `<div class="pack-stat-grid">${rawStats.map((line) => `<div class="pack-stat-pill">${escapeHtml(line)}</div>`).join("")}</div>` : ""}
      ${item.slot ? `
        <div class="pack-comparison-card">
          <div class="pack-comparison-title">${comparison?.fitsEmptySlot ? `Fits ${escapeHtml(this.getPackSlotDefinition(comparison.targetSlot).label)}` : targetComparison?.equipped ? `Current ${escapeHtml(getItemName(targetComparison.equipped, true))}` : "Comparison"}</div>
          <div class="pack-comparison-list">${compareRows}</div>
          <div class="pack-inspector-note ${comparison?.encumbrancePreview?.tone || "muted"}">${escapeHtml(this.getPackBurdenLine(item, comparison))}</div>
        </div>
      ` : ""}
    `;
  }

  getPackDecisionInspectorMarkup(model, inventoryModel) {
    const currentItem = model.selection.type === "slot" ? (model.item || null) : (model.comparison?.equipped || null);
    const selectedEntry = model.selection.type === "inventory"
      ? inventoryModel.entries.find((entry) => entry.index === model.selection.value) || inventoryModel.selectedEntry
      : null;
    const selectedItem = model.selection.type === "inventory" ? model.item : currentItem;
    const slotLabel = model.slotDef?.label || this.getPackSlotDefinition(model.comparison?.targetSlot || model.selection.value || "weapon").label;
    const selectedLabel = model.selection.type === "inventory"
      ? getItemName(selectedItem, true)
      : currentItem
        ? "Leave Current"
        : "Leave Empty";
    const verdict = this.getPackVerdict(selectedItem, selectedEntry, model.comparison, model.selection.type === "slot");
    const deltaRows = model.selection.type === "inventory"
      ? this.getPackVisibleCompareRows(selectedItem, model.comparison, this.layoutMode === "mobile" ? 2 : 4)
      : [];
    const riskLine = this.getPackRiskSummary(selectedItem, selectedEntry, model.comparison);
    const burdenLine = this.getPackBurdenLine(selectedItem, model.comparison);
    const actionMarkup = model.selection.type === "inventory"
      ? `
        <button class="menu-button primary" data-action="item-use" data-index="${model.selection.value}" data-focus-key="${this.getPackActionFocusKey("use", model.selection.value)}" type="button">${escapeHtml(this.getPackItemActionLabel(selectedItem))}</button>
        <button class="menu-button" data-action="inspect-slot" data-slot="${model.comparison?.targetSlot || model.slotDef?.slot || "weapon"}" data-focus-key="${this.getPackSlotFocusKey(model.comparison?.targetSlot || model.slotDef?.slot || "weapon")}" type="button">Back</button>
      `
      : currentItem
        ? `
          <button class="menu-button primary" data-action="unequip-slot" data-slot="${model.selection.value}" data-focus-key="${this.getPackActionFocusKey("unequip", model.selection.value)}" type="button"${currentItem.cursed ? " disabled" : ""}>Unequip</button>
        `
        : ``;
    // Hide the Result panel entirely when viewing an empty slot with no candidates — the slot card above already covers it.
    if (model.selection.type === "slot" && !currentItem) {
      return "";
    }
    return `
      <section class="hub-section pack-inspector-panel pack-decision-panel" data-pack-result-panel>
        <div class="panel-title">Result</div>
        <div class="pack-inspector-card pack-decision-result-card">
          <div class="pack-inspector-kicker">${escapeHtml(slotLabel)}</div>
          <div class="pack-inspector-title">${escapeHtml(selectedLabel)}</div>
          <div class="pack-decision-summary-grid">
            <div class="pack-decision-summary-row"><span>Current</span><strong>${escapeHtml(currentItem ? getItemName(currentItem, true) : "Empty")}</strong></div>
            <div class="pack-decision-summary-row"><span>Selected</span><strong>${escapeHtml(selectedLabel)}</strong></div>
            <div class="pack-decision-summary-row"><span>Verdict</span><strong>${escapeHtml(verdict)}</strong></div>
          </div>
          ${model.selection.type === "inventory" && canIdentify(selectedItem) && !selectedItem.identified
            ? `<div class="pack-inspector-copy">Identify first to reveal the exact payoff.</div>`
            : ""}
          <div class="pack-comparison-list pack-decision-deltas" data-pack-result-deltas>
            ${deltaRows.length > 0
              ? deltaRows.map((row) => `<div class="pack-comparison-row value-${row.tone}">${escapeHtml(row.text)}</div>`).join("")
              : `<div class="pack-comparison-row muted">${escapeHtml(model.selection.type === "inventory" ? this.getPackNeutralOutcomeText(selectedItem, model.comparison) : "Keep current.")}</div>`}
          </div>
          <div class="pack-inspector-note">${escapeHtml(burdenLine)}</div>
          ${riskLine ? `<div class="pack-risk-callout">${escapeHtml(riskLine)}</div>` : ""}
          ${this.getDisclosureMarkup({
            title: "Details",
            summary: model.selection.type === "inventory" ? "Raw values and fit" : "Current slot detail",
            className: "pack-inspector-disclosure",
            body: this.getPackDecisionDetailsMarkup(selectedItem, selectedEntry, model.comparison)
          })}
          <div class="modal-actions pack-inspector-actions">${actionMarkup}</div>
        </div>
      </section>
    `;
  }

  getShopBuyEntries(shopId, shop) {
    const state = this.shopState[shopId] || { stock: [...shop.stock], buyback: [] };
    const liveStock = [...state.stock, ...state.buyback];
    return liveStock.map((itemId) => {
      const item = createTownItem(itemId);
      const semanticEntry = buildInventoryItemSemantics(this, item, -1, { shopId });
      return {
        itemId,
        item,
        semanticEntry,
        price: getShopBuyPrice(this, item, shopId)
      };
    });
  }

  getShopSellEntries(shopId) {
    const sellModel = buildInventoryPresentationModel(this, {
      filter: "sell",
      selectedIndex: this.shopBrowseState?.kind === "sell" ? Number(this.shopBrowseState.value) : -1,
      shopId
    });
    return sellModel.groups.flatMap((group) => group.sections.flatMap((section) => section.items));
  }

  resolveShopBrowseState(panel, entries = [], preferred = null) {
    const kind = panel === "sell" ? "sell" : "buy";
    const values = entries.map((entry) => (kind === "buy" ? String(entry.itemId) : Number(entry.index)));
    const preferredValue = preferred?.kind === kind
      ? preferred.value
      : preferred && !preferred.kind
        ? preferred.value
        : null;
    let nextValue = this.shopBrowseState?.kind === kind ? this.shopBrowseState.value : preferredValue;
    if (preferredValue !== null && preferredValue !== undefined && preferredValue !== "") {
      nextValue = preferredValue;
    }
    const normalized = kind === "buy" ? String(nextValue || "") : Number(nextValue);
    const hasValue = values.some((value) => value === normalized);
    const fallbackValue = values.length > 0 ? values[0] : (kind === "buy" ? "" : -1);
    this.shopBrowseState = {
      kind,
      value: hasValue ? normalized : fallbackValue
    };
    return this.shopBrowseState;
  }

  getSelectedShopPreviewModel(panel, entries = [], browseState = this.shopBrowseState, shopId = this.pendingShop?.id || "") {
    if (!shopId || !browseState) {
      return null;
    }
    if (panel === "sell") {
      const selected = entries.find((entry) => entry.index === Number(browseState.value)) || null;
      if (!selected) {
        return null;
      }
      return {
        panel,
        item: selected.item,
        semanticEntry: selected,
        price: getShopSellPrice(this, selected.item, shopId),
        comparison: this.getPackComparisonModel(selected.item),
        postGold: this.player.gold + getShopSellPrice(this, selected.item, shopId),
        postBurden: this.getBurdenPreview(-(selected.item.weight || 0)),
        selectedValue: selected.index
      };
    }
    const selected = entries.find((entry) => entry.itemId === String(browseState.value)) || null;
    if (!selected) {
      return null;
    }
    return {
      panel,
      item: selected.item,
      semanticEntry: selected.semanticEntry,
      price: selected.price,
      comparison: this.getPackComparisonModel(selected.item),
      postGold: this.player.gold - selected.price,
      postBurden: this.getBurdenPreview(selected.item.weight || 0),
      selectedValue: selected.itemId
    };
  }

  getShopTransactionToolbarMarkup(shopId, shop) {
    const burdenUi = this.getBurdenUiState();
    const townCycle = this.getTownCycleState();
    const turnoverLabel = townCycle.turnsUntilRefresh === 1 ? "1 turn" : `${townCycle.turnsUntilRefresh} turns`;
    return `
      <div class="pack-toolbar shop-transaction-toolbar">
        <div class="pack-toolbar-meta">
          <span class="pack-toolbar-chip">${escapeHtml(shop.name)}</span>
          <span class="pack-toolbar-chip">${Math.floor(this.player.gold)} gp</span>
          <span class="pack-toolbar-chip">${escapeHtml(`Burden ${burdenUi.weight}/${burdenUi.capacity}`)}</span>
          <span class="pack-toolbar-detail">${escapeHtml(this.getTownCycleLabel())}</span>
          <span class="pack-toolbar-detail">${escapeHtml(`Turnover ${turnoverLabel}`)}</span>
        </div>
      </div>
    `;
  }

  getShopDecisionResultMarkup(previewModel, shopId) {
    if (!previewModel?.item) {
      return `
        <section class="hub-section pack-inspector-panel shop-result-panel" data-shop-result-panel>
          <div class="panel-title">Result</div>
          <div class="pack-inspector-card">
            <div class="pack-inspector-title">Nothing available</div>
            <div class="pack-inspector-copy">There is nothing to act on in this panel right now.</div>
            <div class="modal-actions pack-inspector-actions" data-shop-result-actions>
              <button class="menu-button" data-action="close-modal" data-focus-key="shop:close" type="button">Back</button>
            </div>
          </div>
        </section>
      `;
    }
    const { item, semanticEntry, comparison, price, panel, postGold, postBurden, selectedValue } = previewModel;
    const deltaRows = panel === "buy" ? this.getPackVisibleCompareRows(item, comparison, this.layoutMode === "mobile" ? 2 : 4) : [];
    const verdict = panel === "buy"
      ? this.getPackVerdict(item, semanticEntry, comparison, false)
      : (item.doNotSell ? "Keep Current" : "Sell");
    const riskLine = panel === "buy"
      ? this.getPackRiskSummary(item, semanticEntry, comparison)
      : (item.doNotSell ? "Protected from sale." : "");
    const detailBody = panel === "buy"
      ? this.getPackDecisionDetailsMarkup(item, semanticEntry, comparison)
      : `
        <div class="pack-item-badges">${this.getItemBadgeMarkup(item, semanticEntry, { selection: { type: "inventory", value: -1 }, item, comparison, weightDelta: -(item.weight || 0) })}</div>
        <div class="text-block muted">${escapeHtml(semanticEntry.reason || describeItem(item))}</div>
      `;
    const actionMarkup = panel === "buy"
      ? `
        <button class="menu-button primary" data-action="shop-buy" data-shop="${shopId}" data-item="${selectedValue}" data-focus-key="${this.getShopBuyFocusKey(shopId, selectedValue)}:buy" type="button"${this.player.gold < price ? " disabled" : ""}>Buy</button>
        ${(item.kind === "weapon" || item.kind === "armor")
          ? `<button class="menu-button" data-action="shop-buy-equip" data-shop="${shopId}" data-item="${selectedValue}" data-focus-key="${this.getShopBuyFocusKey(shopId, selectedValue)}:equip" type="button"${this.player.gold < price ? " disabled" : ""}>Buy+Equip</button>`
          : ""}
      `
      : `
        <button class="menu-button primary" data-action="shop-sell" data-index="${selectedValue}" data-focus-key="${this.getShopSellFocusKey(selectedValue)}:sell" type="button"${item.doNotSell ? " disabled" : ""}>Sell</button>
        <button class="menu-button" data-action="toggle-do-not-sell" data-index="${selectedValue}" data-focus-key="${this.getShopSellFocusKey(selectedValue)}:protect" type="button">${item.doNotSell ? "Unmark Keep" : "Mark Keep"}</button>
        <button class="menu-button" data-action="open-hub" data-tab="pack" data-filter="sell" data-focus-key="shop:review-pack" type="button">Review Pack</button>
      `;
    return `
      <section class="hub-section pack-inspector-panel shop-result-panel" data-shop-result-panel>
        <div class="panel-title">Result</div>
        <div class="pack-inspector-card pack-decision-result-card">
          <div class="pack-inspector-kicker">${escapeHtml(panel === "buy" ? "Purchase" : "Sale")}</div>
          <div class="pack-inspector-title">${escapeHtml(getItemName(item, true))}</div>
          <div class="pack-decision-summary-grid">
            <div class="pack-decision-summary-row"><span>${panel === "buy" ? "Cost" : "Value"}</span><strong>${price} gp</strong></div>
            <div class="pack-decision-summary-row"><span>${panel === "buy" ? "After Buy" : "After Sale"}</span><strong>${Math.floor(postGold)} gp</strong></div>
            <div class="pack-decision-summary-row"><span>Verdict</span><strong>${escapeHtml(verdict)}</strong></div>
          </div>
          ${panel === "buy" && item.slot
            ? `<div class="pack-decision-summary-row pack-decision-inline-row"><span>Equip</span><strong>${escapeHtml(comparison?.equipped ? `${getItemName(comparison.equipped, true)} -> ${getItemName(item, true)}` : `Empty -> ${getItemName(item, true)}`)}</strong></div>`
            : ""}
          <div class="pack-comparison-list shop-decision-list">
            ${deltaRows.length > 0
              ? deltaRows.map((row) => `<div class="pack-comparison-row value-${row.tone}">${escapeHtml(row.text)}</div>`).join("")
              : `<div class="pack-comparison-row muted">${escapeHtml(panel === "buy" ? (item.slot ? this.getPackNeutralOutcomeText(item, comparison) : semanticEntry.reason || describeItem(item)) : (item.doNotSell ? "Protected." : "Ready to sell."))}</div>`}
          </div>
          <div class="pack-inspector-note">${escapeHtml(`Burden after ${panel === "buy" ? "buy" : "sale"}: ${postBurden.weight} / ${postBurden.capacity} (${postBurden.label}).`)}</div>
          ${riskLine ? `<div class="pack-risk-callout">${escapeHtml(riskLine)}</div>` : ""}
          ${panel === "sell"
            ? `<div class="pack-inspector-copy">${escapeHtml(`Do Not Sell: ${item.doNotSell ? "On" : "Off"}`)}</div>`
            : ""}
          ${this.getDisclosureMarkup({
            title: "Details",
            summary: panel === "buy" ? "Price, burden, and compare" : "Sale context",
            className: "pack-inspector-disclosure",
            body: detailBody
          })}
          <div class="modal-actions pack-inspector-actions" data-shop-result-actions>${actionMarkup}</div>
        </div>
      </section>
    `;
  }

  getShopTransactionShellMarkup(panel, entries, previewModel, shopId, options = {}) {
    const {
      bulkSellCount = 0,
      bulkSellGold = 0
    } = options;
    const rowMarkup = entries.map((entry) => {
        const isSelected = panel === "buy"
          ? this.shopBrowseState?.kind === "buy" && this.shopBrowseState.value === entry.itemId
          : this.shopBrowseState?.kind === "sell" && Number(this.shopBrowseState.value) === entry.index;
        const item = panel === "buy" ? entry.item : entry.item;
        const meta = panel === "buy"
          ? `${entry.price} gp`
          : `${getShopSellPrice(this, entry.item, shopId)} gp`;
        const rowNote = panel === "buy"
          ? (entry.semanticEntry.reason || describeItem(entry.item))
          : (entry.reason || describeItem(entry.item));
        const rowAction = panel === "buy" ? "shop-select-buy" : "shop-select-sell";
        const rowValueAttr = panel === "buy"
          ? `data-item="${entry.itemId}"`
          : `data-index="${entry.index}"`;
        const rowFocusKey = panel === "buy"
          ? this.getShopBuyFocusKey(shopId, entry.itemId)
          : this.getShopSellFocusKey(entry.index);
        const chipLabel = panel === "buy"
          ? entry.semanticEntry.recommendation
          : (entry.item.doNotSell ? "Keep" : "Sell");
        // Smart glyph: derive from the semantic entry for both buy and sell
        // panels. For sell, the player's own curse/upgrade/unknown signals
        // are what matters; for buy, we use the shop-computed semantics so
        // "upgrade over your loadout" surfaces as ↑.
        const glyph = getInventoryRowGlyph(entry.semanticEntry || entry);
        const noiseClass = isInventoryRowNoise(entry.semanticEntry || entry, this) ? " is-noise" : "";
        const affordClass = panel === "buy" && typeof entry.cost === "number" && entry.cost > (this.player?.gold || 0) ? " is-unaffordable" : "";
        return `
          <button class="pack-item-row shop-transaction-row${isSelected ? " active" : ""}${noiseClass}${affordClass}" data-action="${rowAction}" ${rowValueAttr} data-focus-key="${rowFocusKey}" type="button">
            <span class="pack-item-glyph" aria-hidden="true">${glyph}</span>
            <span class="pack-item-head">
              <span class="pack-item-head-main">
                <span class="pack-item-name">${escapeHtml(getItemName(item, true))}</span>
                <span class="pack-item-meta pack-item-meta-compact">${escapeHtml(meta)}</span>
              </span>
              <span class="pack-item-head-side">
                ${entry.count > 1 ? `<span class="pack-item-stack">x${entry.count}</span>` : ""}
                <span class="pack-row-chip">${escapeHtml(chipLabel)}</span>
              </span>
            </span>
            <span class="pack-slot-row-note">${escapeHtml(this.getCompactUiCopy(rowNote, 84))}</span>
          </button>
        `;
      }).join("");
    // Bulk sell row — pinned at the top of the sell list as a hero action.
    // Shows a concrete gold preview ("Sell 4 → +88 gp") so the player knows
    // exactly what will happen. Styled as a gold-bordered JRPG window option
    // via .shop-transaction-row-bulk + .is-hero, which the CSS picks up.
    const bulkSellRowMarkup = panel === "sell"
      ? `
        <button class="pack-item-row shop-transaction-row shop-transaction-row-bulk is-hero" data-action="shop-sell-unmarked" data-focus-key="shop:sell-unmarked" type="button"${bulkSellCount === 0 ? " disabled" : ""}>
          <span class="pack-item-glyph" aria-hidden="true">\u2605</span>
          <span class="pack-item-head">
            <span class="pack-item-head-main">
              <span class="pack-item-name">${bulkSellCount > 0 ? `Sell All Unmarked Items (${bulkSellCount})` : "Sell All Unmarked Items"}</span>
              <span class="pack-item-meta pack-item-meta-compact">${escapeHtml(bulkSellCount > 0 ? `+${bulkSellGold} gp` : "Nothing unmarked to sell")}</span>
            </span>
            <span class="pack-item-head-side">
              <span class="pack-row-chip">${escapeHtml(bulkSellCount > 0 ? "BULK" : "0")}</span>
            </span>
          </span>
          <span class="pack-slot-row-note">${escapeHtml(bulkSellCount > 0 ? "Items marked Keep are protected." : "Mark items Keep to protect them from bulk sale.")}</span>
        </button>
      `
      : "";
    const emptyMarkup = entries.length === 0
      ? `<div class="text-block muted">${escapeHtml(panel === "buy" ? "The shelves are empty for now." : "Nothing here matches what this shop buys.")}</div>`
      : "";
    const listMarkup = `${bulkSellRowMarkup}${rowMarkup}${emptyMarkup}`;
    return `
      <div class="shop-transaction-shell">
        <section class="hub-section pack-inventory-panel shop-transaction-list-panel">
          <div class="panel-title">${panel === "buy" ? "Stock" : "Sellable"}</div>
          <div class="pack-classic-list shop-transaction-list">${listMarkup}</div>
        </section>
        <div class="pack-side-rail">
          ${this.getShopDecisionResultMarkup(previewModel, shopId)}
        </div>
      </div>
    `;
  }

  getItemBadgeMarkup(item, semanticEntry = null, model = null) {
    const badges = [
      `<span class="item-chip category-chip">${escapeHtml(semanticEntry?.categoryLabel || "Item")}</span>`,
      `<span class="item-chip kind-chip">${escapeHtml(item.kindLabel || semanticEntry?.kindLabel || classifyItem(item))}</span>`
    ];
    (semanticEntry?.scanTags || []).forEach((tag) => {
      badges.push(`<span class="item-chip semantic-chip">${escapeHtml(capitalize(tag.replace(/-/g, " ")))}</span>`);
    });
    if (item.slot) {
      badges.push(`<span class="item-chip">Slot ${escapeHtml(this.getPackSlotDefinition(item.slot).label)}</span>`);
    }
    if (item.kind === "weapon") {
      badges.push(`<span class="item-chip">Power ${getItemPower(item)}</span>`);
      if (getItemAccuracyBonus(item)) {
        badges.push(`<span class="item-chip">Hit ${getItemAccuracyBonus(item) > 0 ? `+${getItemAccuracyBonus(item)}` : getItemAccuracyBonus(item)}</span>`);
      }
      if (getItemCritBonus(item)) {
        badges.push(`<span class="item-chip">Crit +${getItemCritBonus(item)}</span>`);
      }
    }
    if (item.kind === "armor") {
      badges.push(`<span class="item-chip">Armor ${getItemArmor(item)}</span>`);
    }
    if (getItemGuardBonus(item)) {
      badges.push(`<span class="item-chip">Guard ${getItemGuardBonus(item)}</span>`);
    }
    if (getItemWardBonus(item)) {
      badges.push(`<span class="item-chip">Ward ${getItemWardBonus(item)}</span>`);
    }
    if (getItemManaBonus(item)) {
      badges.push(`<span class="item-chip">Mana +${getItemManaBonus(item)}</span>`);
    }
    if (getItemStrBonus(item)) {
      badges.push(`<span class="item-chip">Str +${getItemStrBonus(item)}</span>`);
    }
    if (getItemDexBonus(item)) {
      badges.push(`<span class="item-chip">Dex +${getItemDexBonus(item)}</span>`);
    }
    if (getItemConBonus(item)) {
      badges.push(`<span class="item-chip">Con +${getItemConBonus(item)}</span>`);
    }
    if (getItemIntBonus(item)) {
      badges.push(`<span class="item-chip">Int +${getItemIntBonus(item)}</span>`);
    }
    if (getItemLightBonus(item)) {
      badges.push(`<span class="item-chip">Sight +${getItemLightBonus(item)}</span>`);
    }
    if (getItemSearchBonus(item)) {
      badges.push(`<span class="item-chip">Search +${getItemSearchBonus(item)}</span>`);
    }
    if (getItemFireResist(item)) {
      badges.push(`<span class="item-chip">Fire ${getItemFireResist(item)}</span>`);
    }
    if (getItemColdResist(item)) {
      badges.push(`<span class="item-chip">Cold ${getItemColdResist(item)}</span>`);
    }
    if (item.weight) {
      badges.push(`<span class="item-chip">Wt ${item.weight}</span>`);
    }
    if (item.kind === "charged" && item.identified) {
      badges.push(`<span class="item-chip">Charges ${item.charges}/${item.maxCharges || item.charges}</span>`);
    }
    if (model && model.selection.type === "inventory" && item.slot) {
      badges.push(`<span class="item-chip">Burden ${escapeHtml(this.getBurdenPreview(model.weightDelta).label)}</span>`);
    } else {
      badges.push(`<span class="item-chip">Burden ${escapeHtml(this.getBurdenUiState().label)}</span>`);
    }
    badges.push(`<span class="item-chip">Sell ${Math.floor(getItemValue(item))} gp</span>`);
    if (semanticEntry?.sellHereTag) {
      badges.push(`<span class="item-chip">${escapeHtml(semanticEntry.sellHereTag)}</span>`);
    } else if (semanticEntry?.shopTags?.length) {
      badges.push(`<span class="item-chip">${escapeHtml(semanticEntry.shopTags[0])}</span>`);
    } else {
      badges.push(`<span class="item-chip">No buyer yet</span>`);
    }
    if (canIdentify(item) && !item.identified) {
      badges.push(`<span class="item-chip warning-chip">Unknown quality</span>`);
    }
    if (item.cursed && item.identified) {
      badges.push(`<span class="item-chip bad-chip">Cursed</span>`);
    }
    if (item.doNotSell) {
      badges.push(`<span class="item-chip">No Sell</span>`);
    }
    return badges.join("");
  }

  getPackFilterMarkup(inventoryModel) {
    if (this.activePackFilter === "equip") {
      return `
        <div class="pack-filter-row pack-filter-row-compact">
          ${inventoryModel.filterDefs.map((filterDef) => `
            <button class="hub-filter-chip${this.activePackFilter === filterDef.key ? " active" : ""}" data-action="pack-filter" data-filter="${filterDef.key}" data-focus-key="${this.getPackFilterFocusKey(filterDef.key)}" type="button">${escapeHtml(filterDef.label)}</button>
          `).join("")}
        </div>
      `;
    }
    return this.getPackToolbarMarkup(inventoryModel);
  }

  getMenuQuickStateMarkup(options = {}) {
    const {
      eyebrow = "",
      title = "",
      detail = "",
      tone = ""
    } = options;
    if (!title && !detail) {
      return "";
    }
    return `
      <div class="menu-quick-state${tone ? ` ${tone}` : ""}">
        ${eyebrow ? `<div class="menu-quick-state-eyebrow">${escapeHtml(eyebrow)}</div>` : ""}
        ${title ? `<div class="menu-quick-state-title">${escapeHtml(title)}</div>` : ""}
        ${detail ? `<div class="menu-quick-state-detail">${escapeHtml(detail)}</div>` : ""}
      </div>
    `;
  }

  getPackQuickStateMarkup(model, inventoryModel) {
    if (this.activePackFilter === "equip") {
      return "";
    }
    const filterLabel = inventoryModel.filterDefs.find((entry) => entry.key === this.activePackFilter)?.label || "All";
    if (model.selection.type === "slot") {
      const slotLabel = model.slotDef?.label || "Slot";
      const slotReason = buildEquipmentSlotSummary(this, model.slotDef, model.compatibleIndexes.length).reason;
      return this.getMenuQuickStateMarkup({
        eyebrow: "Pack Focus",
        title: `${slotLabel} selected · ${inventoryModel.visibleCount} visible item${inventoryModel.visibleCount === 1 ? "" : "s"}`,
        detail: slotReason
      });
    }
    const selectedEntry = inventoryModel.selectedEntry;
    if (!selectedEntry) {
      return this.getMenuQuickStateMarkup({
        eyebrow: "Pack Focus",
        title: `${filterLabel} · ${inventoryModel.visibleCount} visible item${inventoryModel.visibleCount === 1 ? "" : "s"}`,
        detail: "Choose an item to update the inspector and action row."
      });
    }
    return this.getMenuQuickStateMarkup({
      eyebrow: "Pack Focus",
      title: `${filterLabel} · ${inventoryModel.visibleCount} visible item${inventoryModel.visibleCount === 1 ? "" : "s"}`,
      detail: `${getItemName(selectedEntry.item)} selected. ${selectedEntry.recommendation}: ${selectedEntry.reason}`
    });
  }

  shouldUsePackEquipmentLayout(model) {
    if (this.activePackFilter === "equip") {
      return true;
    }
    if (model.selection.type === "slot") {
      return true;
    }
    return Boolean(model.item?.slot && (model.item.kind === "weapon" || model.item.kind === "armor"));
  }

  getPackSlotRowStat(item) {
    if (!item) {
      return "Open";
    }
    if (item.kind === "weapon") {
      const bits = [`ATK ${getItemPower(item)}`];
      if (getItemAccuracyBonus(item)) {
        bits.push(`HIT ${getItemAccuracyBonus(item) > 0 ? `+${getItemAccuracyBonus(item)}` : getItemAccuracyBonus(item)}`);
      }
      return bits.join("  ");
    }
    if (item.kind === "armor") {
      const bits = [`ARM ${getItemArmor(item)}`];
      if (getItemGuardBonus(item)) {
        bits.push(`GRD ${getItemGuardBonus(item)}`);
      }
      if (getItemWardBonus(item)) {
        bits.push(`WRD ${getItemWardBonus(item)}`);
      }
      return bits.join("  ");
    }
    return item.kindLabel || classifyItem(item);
  }

  getPackEquipmentWorkspaceModel(model, inventoryModel) {
    const focusSlot = model.selection.type === "slot"
      ? model.selection.value
      : (model.comparison?.targetSlot || model.slotDef?.slot || this.getDefaultEquipmentPackSelection().value);
    const slotRows = this.getPackSlotDefinitions().map((slotDef) => {
      const compatibleEntries = inventoryModel.entries
        .filter((entry) => (
          entry.item?.slot
          && this.getEquipmentBaseSlot(entry.item.slot) === this.getEquipmentBaseSlot(slotDef.slot)
        ))
        .slice()
        .sort((left, right) => {
          const leftComparison = this.getPackComparisonModel(left.item);
          const rightComparison = this.getPackComparisonModel(right.item);
          const leftRank = left.cursed || leftComparison.blockedByCurse ? 2 : left.unknown ? 1 : 0;
          const rightRank = right.cursed || rightComparison.blockedByCurse ? 2 : right.unknown ? 1 : 0;
          if (leftRank !== rightRank) {
            return leftRank - rightRank;
          }
          const scoreDelta = (right.upgrade?.score || 0) - (left.upgrade?.score || 0);
          if (scoreDelta !== 0) {
            return scoreDelta;
          }
          const valueDelta = Math.floor(getItemValue(right.item)) - Math.floor(getItemValue(left.item));
          if (valueDelta !== 0) {
            return valueDelta;
          }
          return left.index - right.index;
        });
      return {
        slotDef,
        item: this.player.equipment[slotDef.slot] || null,
        compatibleEntries,
        slotSummary: buildEquipmentSlotSummary(this, slotDef, compatibleEntries.length),
        isActive: slotDef.slot === focusSlot
      };
    });
    const focusRow = slotRows.find((row) => row.slotDef.slot === focusSlot) || slotRows[0] || null;
    const focusBaseSlot = this.getEquipmentBaseSlot(focusRow?.slotDef?.slot || "");
    const familyMap = new Map();
    slotRows.forEach((row) => {
      const baseSlot = this.getEquipmentBaseSlot(row.slotDef.slot);
      if (!familyMap.has(baseSlot)) {
        familyMap.set(baseSlot, {
          baseSlot,
          label: this.getPackSlotDefinition(baseSlot).label,
          slotRows: [],
          compatibleCount: 0,
          equippedCount: 0,
          focusSlot: row.slotDef.slot,
          isActive: false
        });
      }
      const family = familyMap.get(baseSlot);
      family.slotRows.push(row);
      family.compatibleCount += row.compatibleEntries.length;
      if (row.item) {
        family.equippedCount += 1;
        family.focusSlot = row.slotDef.slot;
      }
    });
    const familyRows = Array.from(familyMap.values()).map((family) => ({
      ...family,
      focusSlot: family.baseSlot === focusBaseSlot
        ? (focusRow?.slotDef?.slot || family.focusSlot)
        : family.focusSlot,
      isActive: family.baseSlot === focusBaseSlot
    }));
    const focusFamilyRows = slotRows.filter((row) => this.getEquipmentBaseSlot(row.slotDef.slot) === focusBaseSlot);
    const candidateEntries = focusRow?.compatibleEntries || [];
    const selectedCandidate = model.selection.type === "inventory"
      ? candidateEntries.find((entry) => entry.index === model.selection.value) || null
      : null;
    const compareModel = selectedCandidate
      ? this.getPackSelectionModelFor({ type: "inventory", value: selectedCandidate.index })
      : this.getPackSelectionModelFor({ type: "slot", value: focusRow?.slotDef?.slot || this.getDefaultEquipmentPackSelection().value });
    return {
      focusSlot: focusRow?.slotDef?.slot || "",
      focusRow,
      slotRows,
      familyRows,
      focusBaseSlot,
      focusFamilyRows,
      focusFamilyLabel: this.getPackSlotDefinition(focusBaseSlot).label,
      candidateEntries,
      selectedCandidate,
      compareModel
    };
  }

  getPackEquipmentCandidateCompareMarkup(entry, focusSlot) {
    if (!entry?.item?.slot) {
      return "";
    }
    const comparison = this.getPackComparisonModel(entry.item);
    const targetComparison = comparison.comparisons?.find((row) => row.slot === focusSlot)
      || this.getPackComparisonTarget(entry.item, comparison);
    const chips = [];
    if (comparison.blockedByCurse) {
      chips.push({ tone: "bad", text: "Locked" });
    } else if (comparison.fitsEmptySlot && comparison.targetSlot === focusSlot) {
      chips.push({ tone: "good", text: "Open slot" });
    }
    this.getPackVisibleCompareRows(entry.item, {
      ...comparison,
      comparisons: targetComparison ? [targetComparison] : comparison.comparisons
    }, 3).forEach((delta) => {
      chips.push({
        tone: delta.tone || "neutral",
        text: this.getCompactUiCopy(String(delta.text || ""), 18)
      });
    });
    if (chips.length === 0) {
      return "";
    }
    return `<span class="pack-row-inline-compare">${chips.map((chip) => `<span class="pack-inline-chip tone-${escapeHtml(chip.tone)}">${escapeHtml(chip.text)}</span>`).join("")}</span>`;
  }

  getPackEquipmentSlotTabsMarkup(equipmentModel) {
    return `
      <div class="pack-slot-tabs" role="tablist" aria-label="Equipment slots">
        ${equipmentModel.familyRows.map((family) => `
          <button
            class="pack-slot-tab${family.isActive ? " active" : ""}"
            data-action="inspect-slot"
            data-slot="${family.focusSlot}"
            data-focus-key="${this.getPackSlotFocusKey(family.focusSlot)}"
            data-pack-preview-type="slot"
            data-pack-preview-value="${family.focusSlot}"
            type="button"
            role="tab"
            aria-selected="${family.isActive ? "true" : "false"}"
          >
            <span class="pack-slot-tab-label">${escapeHtml(family.label)}</span>
            ${family.compatibleCount > 0
              ? `<span class="pack-slot-tab-badge">${family.compatibleCount}</span>`
              : family.equippedCount > 0
                ? `<span class="pack-slot-tab-state">On</span>`
                : ""}
          </button>
        `).join("")}
      </div>
    `;
  }

  getPackEquipmentSlotSubtabsMarkup(equipmentModel) {
    if (!equipmentModel.focusFamilyRows || equipmentModel.focusFamilyRows.length <= 1) {
      return "";
    }
    return `
      <div class="pack-slot-subtabs" role="tablist" aria-label="${escapeHtml(equipmentModel.focusFamilyLabel)} slots">
        ${equipmentModel.focusFamilyRows.map((row) => `
          <button
            class="pack-slot-subtab${row.isActive ? " active" : ""}"
            data-action="inspect-slot"
            data-slot="${row.slotDef.slot}"
            data-focus-key="${this.getPackSlotFocusKey(row.slotDef.slot)}"
            data-pack-preview-type="slot"
            data-pack-preview-value="${row.slotDef.slot}"
            type="button"
            role="tab"
            aria-selected="${row.isActive ? "true" : "false"}"
          >
            <span class="pack-slot-subtab-label">${escapeHtml(row.slotDef.label)}</span>
            <span class="pack-slot-subtab-state">${escapeHtml(row.item ? "On" : "Open")}</span>
          </button>
        `).join("")}
      </div>
    `;
  }

  getPackEquipmentSlotListMarkup(equipmentModel) {
    return `
      <div class="pack-slot-list">
        ${equipmentModel.slotRows.map((row) => `
          <button class="pack-slot-row${row.isActive ? " active" : ""}" data-action="inspect-slot" data-slot="${row.slotDef.slot}" data-focus-key="${this.getPackSlotFocusKey(row.slotDef.slot)}" data-pack-preview-type="slot" data-pack-preview-value="${row.slotDef.slot}" type="button">
            <span class="pack-slot-row-main">
              <span class="pack-slot-row-label">${escapeHtml(row.slotDef.label)}</span>
              <span class="pack-slot-row-item">${escapeHtml(row.item ? getItemName(row.item, true) : "Empty")}</span>
              <span class="pack-slot-row-note">${escapeHtml(this.getPackCompactSlotRowNote(row))}</span>
            </span>
            <span class="pack-slot-row-side">
              <span class="pack-slot-row-stat">${escapeHtml(this.getPackSlotRowStat(row.item))}</span>
              <span class="pack-slot-row-ready">${row.compatibleEntries.length > 0 ? `${row.compatibleEntries.length} ready` : (row.item?.cursed ? "cursed" : "keep")}</span>
            </span>
          </button>
        `).join("")}
      </div>
    `;
  }

  getPackEquipmentCandidateListMarkup(equipmentModel) {
    const focusRow = equipmentModel.focusRow;
    if (!focusRow) {
      return `<div class="text-block">No equipment slots are available.</div>`;
    }
    const currentLabel = focusRow.item ? "Leave Current" : "Leave Empty";
    const currentMeta = focusRow.item
      ? `${getItemName(focusRow.item, true)} | ${this.getPackSlotRowStat(focusRow.item)}`
      : focusRow.slotDef.emptyText;
    return `
      <div class="pack-equip-list-header">
        <div class="pack-equip-list-title">${escapeHtml(focusRow.slotDef.label)}</div>
        <div class="pack-equip-list-note">${escapeHtml(focusRow.compatibleEntries.length > 0 ? `${focusRow.compatibleEntries.length} carried option${focusRow.compatibleEntries.length === 1 ? "" : "s"}` : "No carried options")}</div>
      </div>
      <div class="pack-classic-list">
        <button class="pack-item-row pack-item-row-keep${equipmentModel.selectedCandidate ? "" : " active"}" data-action="inspect-slot" data-slot="${focusRow.slotDef.slot}" data-focus-key="${this.getPackSlotFocusKey(focusRow.slotDef.slot)}" type="button">
          <span class="pack-item-head">
            <span class="pack-item-head-main">
              <span class="pack-item-name">${escapeHtml(currentLabel)}</span>
              <span class="pack-item-meta pack-item-meta-compact">${escapeHtml(currentMeta)}</span>
            </span>
            <span class="pack-item-head-side">
              <span class="pack-row-chip">Current</span>
            </span>
          </span>
        </button>
        ${equipmentModel.candidateEntries.length > 0
          ? equipmentModel.candidateEntries.map((entry) => {
            const glyph = getInventoryRowGlyph(entry);
            const noiseClass = isInventoryRowNoise(entry, this) ? " is-noise" : "";
            return `
            <button class="pack-item-row${entry.compareTone ? ` pack-item-row-${entry.compareTone}` : ""}${equipmentModel.selectedCandidate?.index === entry.index ? " active" : ""}${noiseClass}" data-action="inspect-pack-item" data-index="${entry.index}" data-focus-key="${this.getPackItemFocusKey(entry.index)}" data-pack-preview-type="inventory" data-pack-preview-value="${entry.index}" type="button">
              <span class="pack-item-glyph" aria-hidden="true">${glyph}</span>
              <span class="pack-item-head">
                <span class="pack-item-head-main">
                  <span class="pack-item-name">${escapeHtml(getItemName(entry.item, true))}</span>
                  <span class="pack-item-meta pack-item-meta-compact">${escapeHtml(this.getPackCompactRowMeta(entry.item, entry))}</span>
                </span>
                <span class="pack-item-head-side">
                  ${entry.count > 1 ? `<span class="pack-item-stack">x${entry.count}</span>` : ""}
                  <span class="pack-row-chip${entry.compareTone ? ` pack-row-chip-${entry.compareTone}` : ""}">${escapeHtml(entry.recommendation)}</span>
                </span>
              </span>
              ${this.getPackEquipmentCandidateCompareMarkup(entry, equipmentModel.focusSlot)}
            </button>`;
          }).join("")
          : `<div class="text-block pack-classic-empty">Nothing in your pack fits this slot right now.</div>`}
      </div>
    `;
  }

  getMagicQuickStateMarkup(selectedSpellId, filterDefs, orderedGroups) {
    const activeFilterLabel = filterDefs.find((entry) => entry.key === this.activeMagicFilter)?.label || "All";
    const visibleCount = orderedGroups.reduce((sum, group) => sum + group.spellIds.length, 0);
    const spell = SPELLS[selectedSpellId];
    if (!spell) {
      return this.getMenuQuickStateMarkup({
        eyebrow: "Magic Focus",
        title: `${activeFilterLabel} · ${visibleCount} visible spell${visibleCount === 1 ? "" : "s"}`,
        detail: "Choose a spell to preview its cost, tray status, and quick actions."
      });
    }
    const manaCost = getSpellCost(this, spell);
    return this.getMenuQuickStateMarkup({
      eyebrow: "Magic Focus",
      title: `${activeFilterLabel} · ${visibleCount} visible spell${visibleCount === 1 ? "" : "s"}`,
      detail: `${spell.name} selected. ${this.getSpellMechanicalReadout(spell) || spell.description} ${this.player.mana < manaCost ? `Casting now will overcast at ${manaCost} mana.` : `${manaCost} mana to cast right now.`}`
    });
  }

  getJournalQuickStateMarkup(activeSection = this.getResolvedJournalSection()) {
    const sectionMeta = {
      current: {
        title: "Current floor, pressure, and build",
        detail: "Best when you need the run-now answer without leaving the guide."
      },
      mission: {
        title: "Objective path and reward stakes",
        detail: "Shows the chapter goal, route context, and what this floor is paying for."
      },
      guide: {
        title: "Rules and control reference",
        detail: "A lighter-reading section for controls, core loop, and dungeon rules."
      },
      chronicle: {
        title: "Run history, town shifts, and telemetry",
        detail: "The longest section. It is useful, but it naturally reads heavier than the others."
      }
    };
    const meta = sectionMeta[activeSection] || sectionMeta.current;
    return this.getMenuQuickStateMarkup({
      eyebrow: "Field Guide",
      title: meta.title,
      detail: meta.detail
    });
  }

  getFieldGuideHeroModel(activeSection = this.getResolvedJournalSection()) {
    const meta = {
      current: {
        title: "Read the current state fast.",
        detail: "Objective, pressure, and next move for the active floor or town stop."
      },
      mission: {
        title: "Keep the mission legible.",
        detail: "Chapter goal, route context, and why this floor matters."
      },
      guide: {
        title: "Check rules without losing pace.",
        detail: "Controls, loop reminders, and high-friction dungeon rules in one place."
      },
      chronicle: {
        title: "Review the long game.",
        detail: "Town shifts, discoveries, persistence, and the recent record of this run."
      }
    };
    return meta[activeSection] || meta.current;
  }

  getFieldGuideBriefMarkup(options = {}) {
    const {
      label = "",
      title = "",
      detail = "",
      tone = "",
      actions = ""
    } = options;
    return `
      <section class="field-guide-brief${tone ? ` ${tone}` : ""}">
        ${label ? `<div class="field-guide-brief-label">${escapeHtml(label)}</div>` : ""}
        ${title ? `<div class="field-guide-brief-title">${escapeHtml(title)}</div>` : ""}
        ${detail ? `<div class="field-guide-brief-detail">${escapeHtml(detail)}</div>` : ""}
        ${actions ? `<div class="field-guide-brief-actions">${actions}</div>` : ""}
      </section>
    `;
  }

  getFieldGuideFactListMarkup(rows = []) {
    const safeRows = rows.filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "");
    if (safeRows.length === 0) {
      return `<div class="field-guide-copy muted">No guide data is available yet.</div>`;
    }
    return `
      <div class="field-guide-fact-list">
        ${safeRows.map(([label, value]) => `
          <div class="field-guide-fact-row">
            <span class="field-guide-fact-label">${escapeHtml(String(label))}</span>
            <span class="field-guide-fact-value">${escapeHtml(String(value))}</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  getFieldGuideBulletListMarkup(items = []) {
    const safeItems = items.filter((item) => item && String(item).trim() !== "");
    if (safeItems.length === 0) {
      return `<div class="field-guide-copy muted">Nothing notable is recorded yet.</div>`;
    }
    return `
      <ul class="field-guide-list">
        ${safeItems.map((item) => `<li>${escapeHtml(String(item))}</li>`).join("")}
      </ul>
    `;
  }

  getDisclosureMarkup(options = {}) {
    const {
      title = "More",
      summary = "",
      body = "",
      open = false,
      className = ""
    } = options;
    if (!body) {
      return "";
    }
    return `
      <details class="ui-disclosure${className ? ` ${className}` : ""}"${open ? " open" : ""}>
        <summary>
          <span class="ui-disclosure-title">${escapeHtml(title)}</span>
          ${summary ? `<span class="ui-disclosure-summary">${escapeHtml(summary)}</span>` : ""}
        </summary>
        <div class="ui-disclosure-body">${body}</div>
      </details>
    `;
  }

  getCompactUiCopy(text = "", maxLength = 120) {
    const value = String(text || "").replace(/\s+/g, " ").trim();
    if (!value) {
      return "";
    }
    if (value.length <= maxLength) {
      return value;
    }
    return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
  }

  getShopQuickStateMarkup(shopId, shop) {
    if (this.activeShopPanel === "sell") {
      const eligibleCount = this.player.inventory.filter((item) => item && (shopId === "junk" || shopAcceptsItem(shopId, item))).length;
      const protectedCount = this.player.inventory.filter((item) => item?.doNotSell && (shopId === "junk" || shopAcceptsItem(shopId, item))).length;
      return this.getMenuQuickStateMarkup({
        eyebrow: `${shop.name} · Sell`,
        title: `${eligibleCount} item${eligibleCount === 1 ? "" : "s"} can move here`,
        detail: protectedCount > 0
          ? `${protectedCount} item${protectedCount === 1 ? "" : "s"} are protected by No Sell.`
          : "Use No Sell to protect anything you are only reviewing."
      });
    }
    const state = this.shopState[shopId] || { stock: [...shop.stock], buyback: [] };
    const liveStock = [...state.stock, ...state.buyback];
    const affordableCount = liveStock.reduce((sum, itemId) => {
      const item = createTownItem(itemId);
      return sum + (this.player.gold >= getShopBuyPrice(this, item, shopId) ? 1 : 0);
    }, 0);
    return this.getMenuQuickStateMarkup({
      eyebrow: `${shop.name} · Buy`,
      title: `${liveStock.length} offer${liveStock.length === 1 ? "" : "s"} on the table`,
      detail: affordableCount > 0
        ? `${affordableCount} item${affordableCount === 1 ? "" : "s"} are affordable with your current gold.`
        : "You can browse now and buy once town prep or a return gives you the gold."
    });
  }

  getInventoryGroupsMarkup(inventoryModel, selectedIndex) {
    if (inventoryModel.groups.length === 0) {
      return `<div class="text-block">Nothing matches this pack filter right now.</div>`;
    }

    return inventoryModel.groups.map((group) => `
      <section class="pack-group">
        <div class="pack-group-heading">
          <div class="pack-group-title">${escapeHtml(group.label)}</div>
          <div class="pack-group-count">${group.items.reduce((sum, entry) => sum + entry.count, 0)}</div>
        </div>
        ${group.sections.map((section) => `
          <div class="pack-subgroup">
            <div class="pack-subgroup-heading">
              <div class="pack-subgroup-title">${escapeHtml(section.label)}</div>
              <div class="pack-subgroup-count">${section.items.reduce((sum, entry) => sum + entry.count, 0)}</div>
            </div>
            <div class="pack-group-list">
              ${section.items.map((entry) => {
                // Smart row decorators: single-char glyph encodes the most
                // important signal, .is-noise fades already-spent/cursed items
                // so signal pops without adding another chip.
                const glyph = getInventoryRowGlyph(entry);
                const noiseClass = isInventoryRowNoise(entry, this) ? " is-noise" : "";
                const glyphClass = glyph ? ` has-glyph glyph-${entry.cursed ? "cursed" : entry.upgrade ? "upgrade" : entry.unknown ? "unknown" : glyph === "!" ? "urgent" : "damaged"}` : "";
                return `
                <button class="pack-item-row${entry.compareTone ? ` pack-item-row-${entry.compareTone}` : ""}${selectedIndex === entry.index || entry.indexes?.includes(selectedIndex) ? " active" : ""}${noiseClass}${glyphClass}" data-action="inspect-pack-item" data-index="${entry.index}" data-focus-key="${this.getPackItemFocusKey(entry.index)}" data-pack-preview-type="inventory" data-pack-preview-value="${entry.index}" type="button">
                  <span class="pack-item-glyph" aria-hidden="true">${glyph}</span>
                  <span class="pack-item-head">
                    <span class="pack-item-head-main">
                      <span class="pack-item-name">${escapeHtml(getItemName(entry.item))}</span>
                      <span class="pack-item-meta pack-item-meta-compact">${escapeHtml(this.getPackCompactRowMeta(entry.item, entry))}</span>
                    </span>
                    <span class="pack-item-head-side">
                      ${entry.count > 1 ? `<span class="pack-item-stack">x${entry.count}</span>` : ""}
                      <span class="pack-row-chip${entry.compareTone ? ` pack-row-chip-${entry.compareTone}` : ""}">${escapeHtml(entry.recommendation)}</span>
                    </span>
                  </span>
                  ${selectedIndex === entry.index || entry.indexes?.includes(selectedIndex) ? this.getPackActiveRowInlineMarkup(entry) : ""}
                </button>
              `;
              }).join("")}
            </div>
          </div>
        `).join("")}
      </section>
    `).join("");
  }

  getSemanticRiskCallout(item, semanticEntry = null, model = null, slotSummary = null) {
    if (slotSummary?.risk) {
      return slotSummary.risk;
    }
    if (!item) {
      return "";
    }
    if (semanticEntry?.recommendation === "Identify first") {
      return "Unknown quality may hide a curse or weak roll.";
    }
    if (item.kind === "spellbook" && this.player.spellsKnown.includes(item.spell)) {
      return "Already learned. Safe to sell or stash.";
    }
    if (item.kind === "charged" && (item.charges || 0) <= 0) {
      return "No charges left.";
    }
    if (item.cursed) {
      return model?.selection?.type === "slot" ? "Locked by curse." : "Locks if cursed.";
    }
    if (model?.selection?.type === "inventory" && item.slot && model.encumbrancePreview?.tone !== "value-good") {
      return model.encumbrancePreview.text;
    }
    if (semanticEntry?.heavyLabel) {
      return semanticEntry.heavyLabel;
    }
    return "";
  }

  getPackInspectorMarkup(model, inventoryModel) {
    return renderPackInspector(this, model, inventoryModel);
  }

  getHubTabsMarkup(activeTab) {
    const tabs = [
      { id: "pack", label: "Pack" },
      { id: "magic", label: "Magic" },
      { id: "journal", label: "Guide" }
    ];
    const subduedClass = activeTab === "pack" && this.activePackFilter === "equip" ? " hub-tabs-subdued" : "";
    return `
      <div class="hub-tabs${subduedClass}">
        ${tabs.map((tab) => `
          <button class="hub-tab${tab.id === activeTab ? " active" : ""}" data-action="open-hub" data-tab="${tab.id}" data-focus-key="${this.getHubTabFocusKey(tab.id)}" type="button">${tab.label}</button>
        `).join("")}
      </div>
    `;
  }

  getHubModalTitle(activeTab = this.activeHubTab) {
    return activeTab === "magic"
      ? "Magic"
      : activeTab === "journal"
        ? "Field Guide"
        : this.activePackFilter === "equip"
          ? "Equip"
          : "Pack";
  }

  getHubModalBodyMarkup(activeTab = this.activeHubTab) {
    if (activeTab === "magic") {
      return this.getMagicHubMarkup();
    }
    if (activeTab === "journal") {
      return this.getJournalHubMarkup();
    }
    return this.getPackHubMarkup();
  }

  getHubPaneMarkup(tab, activeTab = this.activeHubTab) {
    return `
      <div data-hub-pane="${tab}"${tab === activeTab ? "" : " hidden"}>
        ${tab === activeTab ? this.getHubModalBodyMarkup(tab) : ""}
      </div>
    `;
  }

  getHubModalShellMarkup(activeTab = this.activeHubTab) {
    const shellClass = activeTab === "pack" && this.activePackFilter === "equip"
      ? " hub-window-pack-equip"
      : "";
    return `
      <div class="hub-window hub-window-${activeTab}${shellClass}">
        <div data-hub-tabs-host>${this.getHubTabsMarkup(activeTab)}</div>
        <div data-hub-body-host>
          ${["pack", "magic", "journal"].map((tab) => this.getHubPaneMarkup(tab, activeTab)).join("")}
        </div>
      </div>
    `;
  }

  getHubPaneHost(tab, root = this.modalRoot) {
    if (!root || !tab) {
      return null;
    }
    return root.querySelector(`[data-hub-pane="${tab}"]`);
  }

  renderHubPaneContent(tab, options = {}) {
    const { forceRefresh = false, root = this.modalRoot } = options;
    const paneHost = this.getHubPaneHost(tab, root);
    if (!paneHost) {
      return false;
    }
    if (!forceRefresh && paneHost.childElementCount > 0 && !this.hubPaneDirty[tab]) {
      return false;
    }
    paneHost.innerHTML = this.getHubModalBodyMarkup(tab);
    this.hubPaneDirty[tab] = false;
    return true;
  }

  syncHubTabButtons(activeTab, tabsHost) {
    if (!(tabsHost instanceof HTMLElement)) {
      return;
    }
    const buttons = Array.from(tabsHost.querySelectorAll('[data-action="open-hub"][data-tab]'));
    if (buttons.length !== 3) {
      tabsHost.innerHTML = this.getHubTabsMarkup(activeTab);
      return;
    }
    buttons.forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === activeTab);
    });
  }

  syncHubPaneVisibility(activeTab, bodyHost) {
    if (!(bodyHost instanceof HTMLElement)) {
      return;
    }
    bodyHost.querySelectorAll("[data-hub-pane]").forEach((paneHost) => {
      paneHost.hidden = paneHost.dataset.hubPane !== activeTab;
    });
  }

  queueHubPanePrewarm(activeTab = this.activeHubTab) {
    this.cancelPendingHubPanePrewarm();
    const prewarmTabs = activeTab === "journal"
      ? ["pack"]
      : activeTab === "pack"
        ? ["magic", "journal"]
        : ["journal", "pack"];
    const scheduled = this.queueDeferredUiTask(() => {
      this.pendingHubPrewarmHandle = 0;
      this.pendingHubPrewarmMode = "";
      if (this.mode !== "modal" || !String(this.modalSurfaceKey || "").startsWith("hub:")) {
        return;
      }
      const bodyHost = this.modalRoot.querySelector("[data-hub-body-host]");
      if (!(bodyHost instanceof HTMLElement)) {
        return;
      }
      prewarmTabs.forEach((tab) => {
        this.renderHubPaneContent(tab, { root: this.modalRoot });
      });
    }, {
      preferIdle: true,
      timeout: 900
    });
    this.pendingHubPrewarmHandle = scheduled.handle;
    this.pendingHubPrewarmMode = scheduled.mode;
  }

  updateHubModalContent(activeTab = this.activeHubTab, options = {}) {
    const {
      preserveScroll = false,
      focusTarget = null,
      fallbackFocus = true,
      recordOpenTelemetry = false,
      forceRefresh = false
    } = options;
    const currentSurfaceKey = this.modalSurfaceKey;
    const nextSurfaceKey = `hub:${activeTab}`;
    const previousState = preserveScroll ? this.captureModalRefreshState(currentSurfaceKey) : null;
    const modalTitle = this.modalRoot.querySelector("#generic-modal-title");
    const hubWindow = this.modalRoot.querySelector(".hub-window");
    const tabsHost = this.modalRoot.querySelector("[data-hub-tabs-host]");
    const bodyHost = this.modalRoot.querySelector("[data-hub-body-host]");
    if (!modalTitle || !hubWindow || !tabsHost || !bodyHost || !String(currentSurfaceKey || "").startsWith("hub:")) {
      return false;
    }
    this.setModalVisibility(true);
    this.modalRoot.classList.remove("hidden");
    modalTitle.textContent = this.getHubModalTitle(activeTab);
    hubWindow.className = `hub-window hub-window-${activeTab}`;
    this.syncHubTabButtons(activeTab, tabsHost);
    this.renderHubPaneContent(activeTab, {
      forceRefresh: forceRefresh || currentSurfaceKey === nextSurfaceKey
    });
    this.syncHubPaneVisibility(activeTab, bodyHost);
    this.modalSurfaceKey = nextSurfaceKey;
    this.modalReturnContext = null;
    if (recordOpenTelemetry) {
      this.recordTelemetry(activeTab === "magic"
        ? "magic_opened"
        : activeTab === "journal"
          ? "journal_opened"
          : "pack_opened");
    }
    this.ensureModalInteractionFeedbackHost();
    this.syncModalInteractionFeedbackHost();
    this.syncModalAdaptiveUiState();
    this.applyControllerNavigationMetadata();
    const nextModal = this.getModalScrollHost();
    if (nextModal && previousState) {
      nextModal.scrollTop = previousState.scrollTop;
    }
    const focusElement = this.resolveModalFocusTarget(focusTarget, previousState);
    if (focusElement) {
      this.focusUiElement(focusElement);
      return true;
    }
    if (fallbackFocus) {
      this.focusFirstUiElement();
    }
    if (currentSurfaceKey !== nextSurfaceKey) {
      this.queueHubPanePrewarm(activeTab);
    }
    return true;
  }

  restoreModalRefreshState(previousState = null, focusTarget = null, fallbackFocus = true) {
    const nextModal = this.getModalScrollHost();
    if (nextModal && previousState) {
      nextModal.scrollTop = previousState.scrollTop;
    }
    const focusElement = this.resolveModalFocusTarget(focusTarget, previousState);
    if (focusElement) {
      this.focusUiElement(focusElement);
      return true;
    }
    if (fallbackFocus) {
      this.focusFirstUiElement();
      return true;
    }
    return false;
  }

  refreshHubPaneRegions(tab, selectors = [], options = {}) {
    const {
      preserveScroll = true,
      focusTarget = null,
      fallbackFocus = true
    } = options;
    const currentSurfaceKey = this.modalSurfaceKey;
    if (this.mode !== "modal" || this.activeHubTab !== tab || !String(currentSurfaceKey || "").startsWith("hub:")) {
      return false;
    }
    const paneHost = this.getHubPaneHost(tab);
    if (!(paneHost instanceof HTMLElement) || selectors.length === 0) {
      return false;
    }
    const wrapper = document.createElement("div");
    wrapper.innerHTML = this.getHubModalBodyMarkup(tab).trim();
    const nextPaneHost = wrapper.firstElementChild;
    if (!(nextPaneHost instanceof HTMLElement)) {
      return false;
    }
    const regionPairs = selectors.map((selector) => ({
      current: paneHost.querySelector(selector),
      next: nextPaneHost.querySelector(selector)
    }));
    if (regionPairs.some(({ current, next }) => !(current instanceof HTMLElement) || !(next instanceof HTMLElement))) {
      return false;
    }
    const previousState = preserveScroll ? this.captureModalRefreshState(currentSurfaceKey) : null;
    regionPairs.forEach(({ current, next }) => {
      current.innerHTML = next.innerHTML;
    });
    this.hubPaneDirty[tab] = false;
    this.syncModalAdaptiveUiState();
    this.applyControllerNavigationMetadata();
    this.restoreModalRefreshState(previousState, focusTarget, fallbackFocus);
    return true;
  }

  refreshModalBodyRegions(surfaceKey, bodyHtml, selectors = [], options = {}) {
    const {
      preserveScroll = true,
      focusTarget = null,
      fallbackFocus = true
    } = options;
    if (this.mode !== "modal" || this.modalSurfaceKey !== surfaceKey || selectors.length === 0) {
      return false;
    }
    const modalBody = this.modalRoot?.querySelector("#generic-modal-body");
    if (!(modalBody instanceof HTMLElement)) {
      return false;
    }
    const wrapper = document.createElement("div");
    wrapper.innerHTML = bodyHtml.trim();
    const regionPairs = selectors.map((selector) => ({
      current: modalBody.querySelector(selector),
      next: wrapper.querySelector(selector)
    }));
    if (regionPairs.some(({ current, next }) => !(current instanceof HTMLElement) || !(next instanceof HTMLElement))) {
      return false;
    }
    const previousState = preserveScroll ? this.captureModalRefreshState(surfaceKey) : null;
    regionPairs.forEach(({ current, next }) => {
      current.innerHTML = next.innerHTML;
    });
    this.syncModalAdaptiveUiState();
    this.applyControllerNavigationMetadata();
    this.restoreModalRefreshState(previousState, focusTarget, fallbackFocus);
    return true;
  }

  refreshMagicHubContent(focusTarget = null, options = {}) {
    const {
      preserveScroll = true,
      fallbackFocus = true,
      sections = ["summary", "filter", "list", "result"]
    } = options;
    const selectorMap = {
      summary: "[data-magic-summary-host]",
      filter: "[data-magic-filter-host]",
      list: "[data-magic-list-host]",
      result: "[data-magic-result-host]"
    };
    const selectors = sections.map((section) => selectorMap[section]).filter(Boolean);
    if (selectors.length === 0) {
      return false;
    }
    if (this.refreshHubPaneRegions("magic", selectors, {
      preserveScroll,
      focusTarget,
      fallbackFocus
    })) {
      return true;
    }
    return this.updateHubModalContent("magic", {
      preserveScroll,
      focusTarget,
      fallbackFocus,
      recordOpenTelemetry: false,
      forceRefresh: true
    });
  }

  refreshJournalHubSection(focusTarget = null, options = {}) {
    const {
      preserveScroll = true,
      fallbackFocus = true
    } = options;
    const currentSurfaceKey = this.modalSurfaceKey;
    if (this.mode === "modal" && this.activeHubTab === "journal" && String(currentSurfaceKey || "").startsWith("hub:")) {
      const paneHost = this.getHubPaneHost("journal");
      const activeSectionHost = paneHost?.querySelector("[data-journal-active-section-host]");
      if (paneHost instanceof HTMLElement && activeSectionHost instanceof HTMLElement) {
        const previousState = preserveScroll ? this.captureModalRefreshState(currentSurfaceKey) : null;
        paneHost.querySelectorAll('[data-action="journal-section"][data-section]').forEach((button) => {
          button.classList.toggle("active", button.dataset.section === this.activeJournalSection);
        });
        activeSectionHost.innerHTML = this.getJournalActiveSectionMarkup(this.activeJournalSection);
        this.hubPaneDirty.journal = false;
        this.syncModalAdaptiveUiState();
        this.applyControllerNavigationMetadata();
        this.restoreModalRefreshState(previousState, focusTarget, fallbackFocus);
        return true;
      }
    }
    return this.updateHubModalContent("journal", {
      preserveScroll,
      focusTarget,
      fallbackFocus,
      recordOpenTelemetry: false,
      forceRefresh: true
    });
  }

  updateShopModalPanel(focusTarget = null, options = {}) {
    const {
      preserveScroll = true,
      fallbackFocus = true
    } = options;
    const shopId = this.pendingShop?.id || "";
    if (!shopId || !this.pendingShop) {
      return false;
    }
    const surfaceKey = `shop:${shopId}`;
    if (this.mode === "modal" && this.modalSurfaceKey === surfaceKey) {
      const modalBody = this.modalRoot?.querySelector("#generic-modal-body");
      const currentPanelBody = modalBody?.querySelector("[data-shop-panel-body-host]");
      if (modalBody instanceof HTMLElement && currentPanelBody instanceof HTMLElement) {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = this.getShopModalBodyMarkup(shopId, this.pendingShop).trim();
        const nextPanelBody = wrapper.querySelector("[data-shop-panel-body-host]");
        if (nextPanelBody instanceof HTMLElement) {
          const previousState = preserveScroll ? this.captureModalRefreshState(surfaceKey) : null;
          modalBody.querySelectorAll('[data-action="shop-panel"][data-panel]').forEach((button) => {
            button.classList.toggle("active", button.dataset.panel === this.activeShopPanel);
          });
          currentPanelBody.innerHTML = nextPanelBody.innerHTML;
          this.refreshShopHoverPreview();
          this.syncModalAdaptiveUiState();
          this.applyControllerNavigationMetadata();
          this.restoreModalRefreshState(previousState, focusTarget, fallbackFocus);
          return true;
        }
      }
    }
    this.showShopModal(shopId, this.pendingShop, {
      preserveScroll,
      focusTarget,
      fallbackFocus,
      panel: this.activeShopPanel
    });
    return true;
  }

  refreshPackHub(options = {}) {
    const {
      selection = null,
      preserveScroll = true,
      focusTarget = null,
      fallbackFocus = true
    } = options;
    // Fast path: if the user clicks the same slot/item that's already selected,
    // skip the full hub re-render (it was costing ~33ms/click with layout thrash)
    // and just refocus. This keeps selection feedback snappy for rapid taps.
    if (
      selection
      && this.mode === "modal"
      && this.activeHubTab === "pack"
      && this.activePackSelection
      && this.activePackSelection.type === selection.type
      && String(this.activePackSelection.value) === String(selection.value)
    ) {
      if (focusTarget) {
        const focusElement = this.resolveModalFocusTarget(focusTarget);
        if (focusElement) {
          this.focusUiElement(focusElement);
        }
      }
      return;
    }
    if (selection) {
      this.setPackSelection(selection);
      this.resolvePackSelection();
    }
    if (this.mode === "modal" && this.activeHubTab === "pack") {
      const refreshSections = ["equipment", "filter", "list", "inspector"];
      if (this.refreshPackHubContent(focusTarget, {
        preserveScroll,
        fallbackFocus,
        sections: refreshSections
      })) {
        return;
      }
      this.updateHubModalContent("pack", {
        preserveScroll,
        focusTarget,
        fallbackFocus,
        recordOpenTelemetry: false
      });
      return;
    }
    this.showHubModal("pack", { selection, preserveScroll, focusTarget, fallbackFocus });
  }

  refreshPackHubContent(focusTarget = null, options = {}) {
    const {
      preserveScroll = true,
      fallbackFocus = true,
      sections = ["equipment", "filter", "list", "inspector"]
    } = options;
    const selectorMap = {
      equipment: "[data-pack-equipment-host]",
      filter: "[data-pack-filter-host]",
      list: "[data-pack-list-host]",
      inspector: "[data-pack-inspector-host]"
    };
    const selectors = sections.map((section) => selectorMap[section]).filter(Boolean);
    if (selectors.length === 0) {
      return false;
    }
    if (this.refreshHubPaneRegions("pack", selectors, {
      preserveScroll,
      focusTarget,
      fallbackFocus
    })) {
      return true;
    }
    return this.updateHubModalContent("pack", {
      preserveScroll,
      focusTarget,
      fallbackFocus,
      recordOpenTelemetry: false,
      forceRefresh: true
    });
  }

  buildPackHubViewModel() {
    const shopId = this.getCurrentPackShopContext();
    let model = this.getPackSelectionModel();
    let inventoryModel = buildInventoryPresentationModel(this, {
      filter: this.activePackFilter,
      selectedIndex: model.selection.type === "inventory" ? model.selection.value : -1,
      shopId
    });
    if (inventoryModel.firstVisibleIndex >= 0 && model.selection.type === "inventory" && !inventoryModel.selectedVisible) {
      this.setPackSelection({ type: "inventory", value: inventoryModel.firstVisibleIndex });
      model = this.getPackSelectionModel();
      inventoryModel = buildInventoryPresentationModel(this, {
        filter: this.activePackFilter,
        selectedIndex: model.selection.type === "inventory" ? model.selection.value : -1,
        shopId
      });
    }
    return { shopId, model, inventoryModel };
  }

  getPackHubMarkup(viewModel = null) {
    return renderPackHubMarkup(this, viewModel);
  }

  getMagicHubMarkup() {
    return renderMagicHubMarkup(this);
  }
  getMagicResultPanelMarkup(selectedSpellId) {
    return renderMagicResultPanelMarkup(this, selectedSpellId);
  }

  getJournalCurrentSectionMarkup() {
    const townCycle = this.getTownCycleState();
    const milestoneSummary = this.getQuestMilestoneSummary();
    const roomEvent = this.currentLevel?.roomEvents?.[0] || null;
    const questState = this.player.quest.complete
      ? "Returned to town with the Runestone."
      : this.player.quest.hasRunestone
        ? "The Runestone is in your possession. Return to town."
        : "Descend to the lowest halls and recover the Runestone.";
    const objectiveText = getObjectiveStatusText(this.currentLevel);
    const optionalText = getOptionalStatusText(this.currentLevel);
    const dangerText = getDangerSummary(this.currentLevel);
    const buildSummary = [
      ...(this.player.perks || []).map((id) => PERK_DEFS[id]?.name).filter(Boolean),
      ...(this.player.relics || []).map((id) => RELIC_DEFS[id]?.name).filter(Boolean)
    ];
    const townStateLine = this.currentDepth === 0
      ? `${this.getTownCycleLabel()} | ${townCycle.stockSummary}`
      : `Deepest ${this.player.deepestDepth} | ${this.currentLevel?.encounterSummary || "The floor is still quiet enough to read."}`;
    const buildLine = buildSummary.length > 0
      ? buildSummary.join(", ")
      : "No perks or relics claimed yet.";
    const inTown = this.currentDepth === 0;
    const nextMoveTitle = inTown
      ? "Prepare, then enter the keep."
      : this.currentLevel?.floorResolved
        ? "Choose extract or greed."
        : "Push toward the floor objective.";
    const nextMoveDetail = inTown
      ? "Town has no active floor objective. Use the bank or a service if needed, then take the north road into the keep."
      : this.currentLevel?.floorResolved
        ? "The floor objective is done. Review risk, route, and supplies before committing to one more room."
        : `${objectiveText}${optionalText ? ` Optional: ${optionalText}` : ""}`;
    const actionButtons = `
      <div class="modal-actions utility-row field-guide-action-row field-guide-article-actions">
        <button class="menu-button" data-action="open-hub" data-tab="pack" data-focus-key="journal:pack" type="button">Pack</button>
        <button class="menu-button" data-action="open-hub" data-tab="magic" data-focus-key="journal:magic" type="button">Magic</button>
        <button class="menu-button" data-action="view-map" data-focus-key="journal:map" type="button">Floor Map</button>
      </div>
    `;
    return `
      <div class="field-guide-article field-guide-article-current">
        <section class="workspace-detail-card field-guide-article-hero field-guide-article-priority">
          <div class="panel-title">${escapeHtml(inTown ? "Town pause" : this.currentLevel?.floorResolved ? "Objective resolved" : "Objective live")}</div>
          <div class="workspace-detail-title">${escapeHtml(nextMoveTitle)}</div>
          <div class="workspace-plain-copy">${escapeHtml(nextMoveDetail)}</div>
          <div class="workspace-plain-copy muted">${escapeHtml(inTown
            ? "Open a service, review gear, or step into the keep."
            : this.currentLevel?.floorResolved
              ? "Extract if the pack is shaky. Push only if the route still looks clean."
              : "Keep the route and pressure in view while you move.")}</div>
          ${actionButtons}
        </section>
        <section class="workspace-ledger-group">
          <div class="panel-title">Current Floor</div>
          <div class="field-guide-copy">
            <strong>${escapeHtml(this.currentLevel.description)}</strong><br><br>
            ${escapeHtml(objectiveText)}<br><br>
            ${escapeHtml(optionalText || questState)}
          </div>
        </section>
        <section class="workspace-ledger-group">
          <div class="panel-title">Pressure</div>
          ${this.getFieldGuideFactListMarkup([
            ["Pressure", dangerText],
            ["Encounter read", this.currentLevel?.encounterSummary || "The floor is still quiet enough to read."]
          ])}
        </section>
        <section class="workspace-ledger-group">
          <div class="panel-title">Run Build</div>
          ${this.getFieldGuideFactListMarkup([
            ["Build read", buildLine],
            ["Reward preview", getObjectiveRewardPreview(this.currentLevel) || "No objective reward preview available."]
          ])}
        </section>
        <section class="workspace-ledger-group">
          <div class="panel-title">${this.currentDepth === 0 ? "Town State" : "Run State"}</div>
          ${this.getFieldGuideFactListMarkup([
            [this.currentDepth === 0 ? "Town cycle" : "Run state", townStateLine],
            ["Milestones", milestoneSummary],
            ["Signature room", roomEvent ? `${roomEvent.label}. ${roomEvent.summary}` : ""]
          ])}
        </section>
      </div>
    `;
  }

  getJournalMissionSectionMarkup() {
    const currentChapter = this.getCurrentChapterObjective();
    const activeBriefing = this.getActiveBriefingText();
    const milestoneJournal = this.getActiveMilestoneJournalText();
    const latestSummary = (this.runSummaryHistory || []).at(-1) || this.lastRunSummary;
    const questState = this.player.quest.complete
      ? "Returned to town with the Runestone."
      : this.player.quest.hasRunestone
        ? "The Runestone is in your possession. Return to town."
        : "Descend to the lowest halls and recover the Runestone.";
    const rewardPreview = getObjectiveRewardPreview(this.currentLevel) || "No floor reward preview available.";
    return `
      <div class="field-guide-article field-guide-article-mission">
        <section class="workspace-detail-card field-guide-article-hero field-guide-article-priority">
          <div class="panel-title">Goal</div>
          <div class="workspace-detail-title">${escapeHtml(currentChapter)}</div>
          <div class="workspace-plain-copy">Use this section when you need the chapter objective and route context in one glance.</div>
          <div class="workspace-plain-copy muted">${escapeHtml(latestSummary
            ? `Last return reached depth ${latestSummary.extractedDepth} and banked or carried ${latestSummary.returnValue} gp.`
            : "No banked return record yet.")}</div>
        </section>
        <section class="workspace-ledger-group">
          <div class="panel-title">Mission Brief</div>
          <div class="field-guide-copy">
            <strong>${escapeHtml(currentChapter)}</strong><br><br>
            ${escapeHtml(activeBriefing)}
          </div>
        </section>
        <section class="workspace-ledger-group">
          <div class="panel-title">Objective Path</div>
          ${this.getFieldGuideFactListMarkup([
            ["Route context", milestoneJournal],
            ["Quest state", questState]
          ])}
        </section>
        <section class="workspace-ledger-group">
          <div class="panel-title">Reward Stakes</div>
          ${this.getFieldGuideFactListMarkup([
            ["Floor reward", rewardPreview],
            ["Last return", latestSummary
              ? `Depth ${latestSummary.extractedDepth}, ${latestSummary.greedCount} greed room${latestSummary.greedCount === 1 ? "" : "s"}, ${latestSummary.returnValue} gp banked or carried.`
              : "No banked return record yet."]
          ])}
        </section>
      </div>
    `;
  }

  getJournalGuideSectionMarkup() {
    const controlLead = this.gamepadInput?.isConnected()
      ? {
          title: this.gamepadInput.getControllerName() || "Controller",
          detail: "Controller is connected, so this is the fastest control reference right now."
        }
      : this.layoutMode === "mobile" && this.settings.touchControlsEnabled
        ? {
            title: "Touch controls",
            detail: "Mobile layout is active. Use the on-screen pad and dock first, then fall back to keyboard if needed."
          }
        : {
            title: "Keyboard first",
            detail: "Desktop play is active. Arrows or numpad remain the quickest way to move and search."
          };
    return `
      <div class="field-guide-article field-guide-article-guide">
        <section class="workspace-detail-card field-guide-article-hero field-guide-article-priority">
          <div class="panel-title">Best Match Right Now</div>
          <div class="workspace-detail-title">${escapeHtml(controlLead.title)}</div>
          <div class="workspace-plain-copy">${escapeHtml(controlLead.detail)}</div>
          <div class="workspace-plain-copy muted">Check one rule, then leave. This page should settle movement, controls, or dungeon behavior without becoming a manual.</div>
        </section>
        <section class="workspace-ledger-group">
          <div class="panel-title">Core Loop</div>
          <div class="field-guide-copy">
            Start in town, prep the build, enter the keep, clear the floor objective, then decide whether to extract or push deeper.
          </div>
        </section>
        <section class="workspace-ledger-group">
          <div class="panel-title">Surface Reference</div>
          <div class="field-guide-copy">
            HUD handles tactical-now status. Pack handles gear and burden. Magic handles tray management and casting. Open the pieces you need, then leave.
          </div>
        </section>
        <section class="workspace-ledger-group">
          <div class="panel-title">Controls</div>
          ${this.getFieldGuideFactListMarkup([
            ["Keyboard", "Arrows or numpad move. F searches. U uses. I opens pack. S opens magic. M opens the map. R rests. Shift+R sleeps until restored."],
            ["Controller", "D-pad or left stick moves. A confirms or uses. B backs out. X uses the alternate action. Y opens pack. Start opens the run menu. Back toggles the map. LB or RB switch tabs. RT or the right stick scrolls long lists."],
            ["Touch", "Use the on-screen pad for fallback movement and the dock for your main actions."]
          ])}
        </section>
        <section class="workspace-ledger-group">
          <div class="panel-title">Dungeon Rules</div>
          ${this.getFieldGuideBulletListMarkup([
            "Search reveals hidden doors, traps, and better routes.",
            "Heavy burden lowers dodge and lets monsters press harder.",
            "Targeted spells and wands need line of sight.",
            "Resting and sleeping are noisy, and sleep breaks when a monster enters view.",
            "Enemy intent icons warn about rushes, ranged shots, summons, and other dangerous turns before they land."
          ])}
        </section>
      </div>
    `;
  }

  getJournalChronicleSectionMarkup() {
    return renderJournalChronicleSection(this);
  }

  getJournalActiveSectionMarkup(activeSection = this.getResolvedJournalSection()) {
    if (activeSection === "mission") {
      return this.getJournalMissionSectionMarkup();
    }
    if (activeSection === "guide") {
      return this.getJournalGuideSectionMarkup();
    }
    if (activeSection === "chronicle") {
      return this.getJournalChronicleSectionMarkup();
    }
    return this.getJournalCurrentSectionMarkup();
  }

  getJournalHubMarkup() {
    const activeSection = this.getResolvedJournalSection();
    const objectiveText = getObjectiveStatusText(this.currentLevel);
    const hero = this.getFieldGuideHeroModel(activeSection);
    const sectionButtons = this.getJournalSectionDefs().map((section) => `
      <button class="hub-filter-chip${section.id === activeSection ? " active" : ""}" data-action="journal-section" data-section="${section.id}" data-focus-key="${this.getJournalSectionFocusKey(section.id)}" type="button">${section.label}</button>
    `).join("");
    return `
      <div class="hub-body field-guide-body field-guide-reader-workspace">
        <div class="workspace-summary-strip field-guide-summary-strip">
          <div class="workspace-summary-chip">
            <span class="workspace-summary-label">Field Guide</span>
            <strong>${escapeHtml(hero.title)}</strong>
          </div>
          <div class="workspace-summary-chip">
            <span class="workspace-summary-label">Run State</span>
            <strong>${escapeHtml(`Depth ${this.currentDepth} | Turn ${this.turn} | ${this.dangerLevel}`)}</strong>
          </div>
          <div class="workspace-summary-chip">
            <span class="workspace-summary-label">Objective</span>
            <strong>${escapeHtml(objectiveText)}</strong>
          </div>
        </div>
        <div class="workspace-shell field-guide-reader-shell">
          <aside class="workspace-rail field-guide-index-rail">
            <div class="panel-title">Sections</div>
            <div class="pack-filter-row journal-section-row" data-journal-section-host>
              ${sectionButtons}
            </div>
            <section class="workspace-detail-card">
              <div class="panel-title">Section Focus</div>
              <div class="workspace-plain-copy">${escapeHtml(hero.detail)}</div>
            </section>
          </aside>
          <section class="workspace-rail-detail field-guide-reader-detail" data-journal-active-section-host>
            ${this.getJournalActiveSectionMarkup(activeSection)}
          </section>
        </div>
      </div>
    `;
  }

  showHubModal(defaultTab = "pack", options = {}) {
    if (!this.player) {
      return;
    }
    this.syncAdaptiveLayout();
    this.clearModalInteractionFeedback();
    const {
      selection = null,
      preserveScroll = false,
      focusTarget = null,
      fallbackFocus = true,
      journalSection = null
    } = options;
    this.mode = "modal";
    this.activeHubTab = ["pack", "magic", "journal"].includes(defaultTab) ? defaultTab : "pack";
    if (this.activeHubTab === "journal") {
      this.activeJournalSection = this.getResolvedJournalSection(journalSection || this.activeJournalSection);
    }
    if (this.activeHubTab === "pack") {
      this.setPackSelection(selection || this.activePackSelection || this.getDefaultPackSelection());
      this.resolvePackSelection();
    } else {
      this.hoveredPackSelection = null;
    }
    if (this.updateHubModalContent(this.activeHubTab, {
      preserveScroll,
      focusTarget,
      fallbackFocus,
      recordOpenTelemetry: true,
      forceRefresh: Boolean(selection) || journalSection !== null
    })) {
      return;
    }
    this.recordTelemetry(this.activeHubTab === "magic"
      ? "magic_opened"
      : this.activeHubTab === "journal"
        ? "journal_opened"
        : "pack_opened");
    this.showSimpleModal(this.getHubModalTitle(this.activeHubTab), this.getHubModalShellMarkup(this.activeHubTab), {
      surfaceKey: `hub:${this.activeHubTab}`,
      preserveScroll,
      focusTarget,
      fallbackFocus
    });
    this.hubPaneDirty[this.activeHubTab] = false;
    this.queueHubPanePrewarm(this.activeHubTab);
  }

  showInventoryModal(options = {}) {
    const preferredSlot = typeof options === "string" ? options : (options.preferredSlot || "");
    this.activePackFilter = "equip";
    this.showHubModal("pack", {
      selection: this.getDefaultEquipmentPackSelection(preferredSlot)
    });
  }

  showSpellModal() {
    this.showHubModal("magic");
  }

  getShopPanelTabsMarkup(activePanel = "buy") {
    return `
      <div class="pack-filter-row shop-panel-row">
        <button class="hub-filter-chip${activePanel === "buy" ? " active" : ""}" data-action="shop-panel" data-panel="buy" data-focus-key="${this.getShopPanelFocusKey("buy")}" type="button">Buy</button>
        <button class="hub-filter-chip${activePanel === "sell" ? " active" : ""}" data-action="shop-panel" data-panel="sell" data-focus-key="${this.getShopPanelFocusKey("sell")}" type="button">Sell</button>
      </div>
    `;
  }

  groupShopEntriesByCategory(entries = [], getCategoryKey) {
    return getInventoryCategoryDefs().map((category) => ({
      ...category,
      entries: entries.filter((entry) => getCategoryKey(entry) === category.key)
    })).filter((group) => group.entries.length > 0);
  }

  getShopBuyPanelMarkup(shopId, shop, turnoverLabel) {
    const stockEntries = this.getShopBuyEntries(shopId, shop);
    const browseState = this.resolveShopBrowseState("buy", stockEntries);
    const previewModel = this.getSelectedShopPreviewModel("buy", stockEntries, browseState, shopId);
    return this.getShopTransactionShellMarkup("buy", stockEntries, previewModel, shopId);
  }

  getShopSellPanelMarkup(shopId) {
    const sellEntries = this.getShopSellEntries(shopId);
    const browseState = this.resolveShopBrowseState("sell", sellEntries);
    const previewModel = this.getSelectedShopPreviewModel("sell", sellEntries, browseState, shopId);
    const protectedCount = this.player.inventory.filter((item) => item?.doNotSell && (shopId === "junk" || shopAcceptsItem(shopId, item))).length;
    // Compute both the count AND the total gold preview so the bulk sell row
    // can show "Sell 4 items → +88 gp" — the player sees exactly what will
    // happen before tapping. This is the "manageability" promise: no surprise.
    const sellableItems = this.player.inventory.filter((item) => item && !item.doNotSell && (shopId === "junk" || shopAcceptsItem(shopId, item)));
    const bulkSellCount = sellableItems.length;
    const bulkSellGold = sellableItems.reduce((sum, item) => sum + (getShopSellPrice(this, item, shopId) || 0), 0);
    return `
      ${this.getShopTransactionShellMarkup("sell", sellEntries, previewModel, shopId, { bulkSellCount, bulkSellGold })}
      <div class="text-block muted shop-sell-note">${escapeHtml(protectedCount > 0 ? `${protectedCount} item${protectedCount === 1 ? "" : "s"} are protected by Do Not Sell.` : "Unmarked items can be sold immediately from this screen.")}</div>
    `;
  }

  getShopPanelBodyMarkup(shopId, shop, panel = this.activeShopPanel) {
    const townCycle = this.getTownCycleState();
    const turnoverLabel = townCycle.turnsUntilRefresh === 1 ? "1 turn" : `${townCycle.turnsUntilRefresh} turns`;
    return panel === "sell"
      ? this.getShopSellPanelMarkup(shopId)
      : this.getShopBuyPanelMarkup(shopId, shop, turnoverLabel);
  }

  getShopModalBodyMarkup(shopId, shop) {
    const panelTabs = this.getShopPanelTabsMarkup(this.activeShopPanel);
    const panelBody = this.getShopPanelBodyMarkup(shopId, shop, this.activeShopPanel);

    return `
      <div class="workspace-stack town-workspace shop-workspace">
        ${this.getShopTransactionToolbarMarkup(shopId, shop)}
        <div data-shop-panel-tabs-host>${panelTabs}</div>
        <div data-shop-panel-body-host>${panelBody}</div>
      </div>
    `;
  }

  showShopModal(shopId, shop, options = {}) {
    this.syncAdaptiveLayout();
    this.clearModalInteractionFeedback();
    const {
      preserveScroll = false,
      focusTarget = null,
      fallbackFocus = true,
      panel = null,
      selection = null
    } = options;
    this.mode = "modal";
    const previousShopId = this.pendingShop?.id || "";
    this.pendingShop = { ...shop, id: shopId };
    this.hoveredShopPreview = null;
    this.pendingService = null;
    this.activeShopPanel = panel || (previousShopId === shopId ? this.activeShopPanel : "buy");
    const initialEntries = this.activeShopPanel === "sell"
      ? this.getShopSellEntries(shopId)
      : this.getShopBuyEntries(shopId, shop);
    this.resolveShopBrowseState(this.activeShopPanel, initialEntries, selection);
    this.showSimpleModal(`${shop.name}`, this.getShopModalBodyMarkup(shopId, shop), {
      surfaceKey: `shop:${shopId}`,
      preserveScroll,
      focusTarget,
      fallbackFocus
    });
  }

  showTempleModal(options = {}) {
    this.syncAdaptiveLayout();
    this.clearModalInteractionFeedback();
    const {
      preserveScroll = false,
      focusTarget = null,
      fallbackFocus = true
    } = options;
    this.mode = "modal";
    this.pendingShop = null;
    this.pendingService = { type: "temple" };
    const townCycle = this.getTownCycleState();
    const reactions = this.getTownReactionLines("temple");
    const returnSting = this.getTownReturnStingText();
    const recommendedService = TEMPLE_SERVICES.find((service) => service.id === "heal")
      || TEMPLE_SERVICES[0]
      || null;
    const serviceListMarkup = TEMPLE_SERVICES.map((service) => `
      <div class="workspace-ledger-row service-ledger-row">
        <div>
          <strong>${escapeHtml(service.name)}</strong>
          <div class="muted">${escapeHtml(service.description)}</div>
        </div>
        <div class="service-ledger-actions">
          <span class="save-slot-badge">${getTemplePrice(this, service.price)} gp</span>
          <button class="menu-button" data-action="service-use" data-service="${service.id}" data-focus-key="${this.getServiceFocusKey("temple", service.id)}" type="button">Use</button>
        </div>
      </div>
    `).join("");
    this.showSimpleModal("Temple", `
      <div class="workspace-stack town-workspace">
        <div class="workspace-summary-strip">
          <div class="workspace-summary-chip">
            <span class="workspace-summary-label">Temple</span>
            <strong>${escapeHtml(STORY_NPCS.templeKeeper.name)}</strong>
          </div>
          <div class="workspace-summary-chip">
            <span class="workspace-summary-label">Gold</span>
            <strong>${Math.floor(this.player.gold)} gp</strong>
          </div>
          <div class="workspace-summary-chip">
            <span class="workspace-summary-label">Recommended</span>
            <strong>${escapeHtml(recommendedService ? recommendedService.name : "Review your wounds")}</strong>
          </div>
        </div>
        <div class="workspace-shell service-shell">
          <section class="workspace-rail service-list-rail">
            <div class="panel-title">Services</div>
            <div class="workspace-ledger">
              ${serviceListMarkup}
            </div>
          </section>
          <section class="workspace-rail-detail service-detail-rail">
            <section class="workspace-detail-card">
              <div class="panel-title">Result</div>
              <div class="workspace-detail-title">${escapeHtml(recommendedService ? recommendedService.name : "Temple review")}</div>
              <div class="workspace-plain-copy">${escapeHtml(recommendedService ? recommendedService.description : "Choose a service to recover before the next descent.")}</div>
              <div class="workspace-ledger">
                <div class="workspace-ledger-row">
                  <div><strong>Town cycle</strong><div class="muted">${escapeHtml(townCycle.stockSummary)}</div></div>
                  <span>${escapeHtml(this.getTownCycleLabel())}</span>
                </div>
                ${reactions.lines.length > 0 ? `
                  <div class="workspace-ledger-row">
                    <div><strong>Priest's read</strong><div class="muted">${escapeHtml(reactions.lines[0])}</div></div>
                    <span>Current</span>
                  </div>
                ` : ""}
              </div>
            </section>
            ${returnSting ? `
              <section class="workspace-detail-card">
                <div class="panel-title">Before You Leave</div>
                <div class="workspace-plain-copy">${escapeHtml(returnSting)}</div>
              </section>
            ` : ""}
          </section>
        </div>
      </div>
    `, {
      surfaceKey: "temple",
      preserveScroll,
      focusTarget,
      fallbackFocus
    });
  }

  showSageModal(options = {}) {
    this.syncAdaptiveLayout();
    this.clearModalInteractionFeedback();
    const {
      preserveScroll = false,
      focusTarget = null,
      fallbackFocus = true
    } = options;
    this.mode = "modal";
    this.pendingShop = null;
    this.pendingService = { type: "sage" };
    const unknownCount = countUnknownItems(this.player);
    const sagePrice = getSagePrice(this);
    const townCycle = this.getTownCycleState();
    const reactions = this.getTownReactionLines("guild");
    const returnSting = this.getTownReturnStingText();
    this.showSimpleModal("Sage's Tower", `
      <div class="workspace-stack town-workspace">
        <div class="workspace-summary-strip">
          <div class="workspace-summary-chip">
            <span class="workspace-summary-label">Sage</span>
            <strong>${escapeHtml(STORY_NPCS.guildSage.name)}</strong>
          </div>
          <div class="workspace-summary-chip">
            <span class="workspace-summary-label">Unknown Items</span>
            <strong>${unknownCount}</strong>
          </div>
          <div class="workspace-summary-chip">
            <span class="workspace-summary-label">Price</span>
            <strong>${sagePrice} gp</strong>
          </div>
        </div>
        <div class="workspace-shell service-shell">
          <section class="workspace-rail service-list-rail">
            <div class="panel-title">Actions</div>
            <div class="workspace-ledger">
              <div class="workspace-ledger-row service-ledger-row">
                <div>
                  <strong>Identify All</strong>
                  <div class="muted">${escapeHtml(unknownCount > 0 ? `Identify ${unknownCount} unknown item${unknownCount === 1 ? "" : "s"} before buying or descending again.` : "No unknown items are waiting on identification.")}</div>
                </div>
                <div class="service-ledger-actions">
                  <span class="save-slot-badge">${sagePrice} gp</span>
                  <button class="menu-button primary" data-action="service-use" data-service="identifyAll" data-focus-key="${this.getServiceFocusKey("sage", "identifyAll")}" type="button"${unknownCount === 0 || this.player.gold < sagePrice ? " disabled" : ""}>Use</button>
                </div>
              </div>
            </div>
          </section>
          <section class="workspace-rail-detail service-detail-rail">
            <section class="workspace-detail-card">
              <div class="panel-title">Result</div>
              <div class="workspace-detail-title">Clear the next loot decision.</div>
              <div class="workspace-plain-copy">${escapeHtml("Identify mysterious belongings for a flat fee, then leave with a cleaner read on the next floor.")}</div>
              <div class="workspace-ledger">
                <div class="workspace-ledger-row">
                  <div><strong>Your gold</strong><div class="muted">${escapeHtml(townCycle.rumorSummary)}</div></div>
                  <span>${Math.floor(this.player.gold)} gp</span>
                </div>
                <div class="workspace-ledger-row">
                  <div><strong>Town cycle</strong><div class="muted">${escapeHtml(reactions.lines[0] || "The guild is quiet right now.")}</div></div>
                  <span>${escapeHtml(this.getTownCycleLabel())}</span>
                </div>
              </div>
            </section>
            ${returnSting ? `
              <section class="workspace-detail-card">
                <div class="panel-title">Before You Leave</div>
                <div class="workspace-plain-copy">${escapeHtml(returnSting)}</div>
              </section>
            ` : ""}
          </section>
        </div>
      </div>
    `, {
      surfaceKey: "sage",
      preserveScroll,
      focusTarget,
      fallbackFocus
    });
  }

  showBankModal(options = {}) {
    return renderBankModal(this, options);
  }

  getSaveSlotLabel(slotId = 1) {
    return `Slot ${slotId}`;
  }

  getSaveSlotSummaryMarkup(options = {}) {
    const {
      action = "load",
      actionLabel = action === "save" ? "Save Here" : "Load",
      buttonClass = "tiny-button",
      focusPrefix = `save-slot:${action}`,
      includeButtons = true
    } = options;
    const latestMeta = this.getSavedRunMeta();
    return `
      <div class="save-slot-list${buttonClass === "tiny-button" ? " compact" : ""}">
        ${this.getAllSavedRunMeta().map(({ slotId, meta }) => {
          const disabled = action === "save" ? !this.player : !meta;
          const isActive = this.activeSaveSlotId === slotId;
          const isLatest = latestMeta?.slotId === slotId;
          const slotBadges = [
            isActive ? `<span class="save-slot-badge active">Active</span>` : "",
            isLatest ? `<span class="save-slot-badge">Latest</span>` : ""
          ].filter(Boolean).join("");
          const classLine = meta?.className ? ` | ${escapeHtml(meta.className)}` : "";
          const raceLine = meta?.raceName ? ` | ${escapeHtml(meta.raceName)}` : "";
          const timeLine = meta?.savedAt ? this.formatSaveStamp(meta.savedAt) : "";
          const buttonLabel = action === "save"
            ? (meta ? "Overwrite" : actionLabel)
            : actionLabel;
          return `
            <section class="save-slot-card${isActive ? " active" : ""}">
              <div class="save-slot-head">
                <div class="save-slot-title-row">
                  <strong class="save-slot-title">${this.getSaveSlotLabel(slotId)}</strong>
                  ${slotBadges}
                </div>
                <div class="save-slot-name">${meta ? escapeHtml(meta.name) : "Empty slot"}</div>
                <div class="save-slot-meta">${meta ? `Level ${meta.level} | Depth ${meta.depth}${classLine}${raceLine}` : action === "save" ? "No run saved here yet." : "No saved run in this slot."}</div>
                ${timeLine ? `<div class="save-slot-meta">${escapeHtml(timeLine)}</div>` : ""}
              </div>
              ${includeButtons ? `
                <div class="save-slot-actions">
                  <button class="${buttonClass}" data-action="${action === "save" ? "save-game" : "load-game"}" data-save-slot="${slotId}" data-focus-key="${focusPrefix}:${slotId}" type="button"${disabled ? " disabled" : ""}>${buttonLabel}</button>
                </div>
              ` : ""}
            </section>
          `;
        }).join("")}
      </div>
    `;
  }

  getSelectedSaveSlotMeta(mode = "load") {
    const latestMeta = this.getSavedRunMeta();
    const selectedSlotId = clamp(
      Number(this.activeSaveSlotId || (mode === "save" ? this.activeSaveSlotId || 1 : latestMeta?.slotId || 1)),
      1,
      3
    );
    const allSlots = this.getAllSavedRunMeta();
    const selectedEntry = allSlots.find((entry) => entry.slotId === selectedSlotId) || allSlots[0] || { slotId: 1, meta: null };
    return {
      latestMeta,
      allSlots,
      selectedSlotId,
      selectedMeta: selectedEntry.meta || null
    };
  }

  getSaveSlotWorkspaceListMarkup(mode = "load") {
    const {
      latestMeta,
      allSlots,
      selectedSlotId
    } = this.getSelectedSaveSlotMeta(mode);
    return `
      <div class="save-slot-ledger">
        ${allSlots.map(({ slotId, meta }) => {
          const isSelected = slotId === selectedSlotId;
          const isLatest = latestMeta?.slotId === slotId;
          const buttonLabel = meta ? escapeHtml(meta.name) : "Empty slot";
          const subtitle = meta
            ? `Level ${meta.level} | Depth ${meta.depth}${meta.className ? ` | ${escapeHtml(meta.className)}` : ""}${meta.raceName ? ` | ${escapeHtml(meta.raceName)}` : ""}`
            : (mode === "save" ? "No run saved here yet." : "No saved run in this slot.");
          return `
            <button
              class="save-slot-select${isSelected ? " active" : ""}"
              data-action="select-save-slot"
              data-save-slot="${slotId}"
              data-save-mode="${mode}"
              data-focus-key="save-slots:slot:${mode}:${slotId}"
              type="button"
            >
              <span class="save-slot-select-head">
                <span class="save-slot-title">${this.getSaveSlotLabel(slotId)}</span>
                <span class="save-slot-select-badges">
                  ${isSelected ? `<span class="save-slot-badge active">Selected</span>` : ""}
                  ${isLatest ? `<span class="save-slot-badge">Latest</span>` : ""}
                </span>
              </span>
              <span class="save-slot-select-name">${buttonLabel}</span>
              <span class="save-slot-select-meta">${subtitle}</span>
            </button>
          `;
        }).join("")}
      </div>
    `;
  }

  getSaveSlotWorkspaceDetailMarkup(mode = "load") {
    const {
      selectedSlotId,
      selectedMeta
    } = this.getSelectedSaveSlotMeta(mode);
    const isSaveMode = mode === "save";
    const disabled = isSaveMode ? !this.player : !selectedMeta;
    const actionLabel = isSaveMode
      ? (selectedMeta ? "Overwrite Slot" : "Save Here")
      : "Continue Run";
    const stateLabel = selectedMeta
      ? `${this.getSaveSlotLabel(selectedSlotId)} ready`
      : (isSaveMode ? "Open slot" : "No save in slot");
    const savedAt = selectedMeta?.savedAt ? this.formatSaveStamp(selectedMeta.savedAt) : "";
    const latestLabel = selectedMeta
      ? `${selectedMeta.name} | Level ${selectedMeta.level} | Depth ${selectedMeta.depth}`
      : (isSaveMode ? "Choose this slot to write the current run." : "Choose another slot or return.");
    const titleMusicMarkup = !this.player ? `
      <section class="workspace-detail-card save-slot-title-music">
        <div class="panel-title">Title Theme</div>
        <div class="workspace-plain-copy">Music is ${this.settings.musicEnabled ? "on" : "off"}. Use this to set the title-state track before you continue.</div>
        <div class="save-slot-title-music-row">
          <div class="title-audio-copy">
            <div class="title-audio-label">Theme</div>
            <div class="title-audio-note" data-role="title-music-note"></div>
          </div>
          <button class="menu-button" data-action="toggle-music" data-role="title-music-toggle" data-focus-key="save-slots:music" type="button">${escapeHtml(this.getMusicToggleLabel())}</button>
        </div>
      </section>
    ` : "";
    return `
      <div class="save-slot-detail-stack">
        <section class="workspace-detail-card">
          <div class="panel-title">Slot Preview</div>
          <div class="workspace-detail-title">${escapeHtml(this.getSaveSlotLabel(selectedSlotId))}</div>
          <div class="workspace-plain-copy">${escapeHtml(latestLabel)}</div>
          <div class="workspace-ledger">
            <div class="workspace-ledger-row">
              <div>
                <strong>Status</strong>
                <div class="muted">${escapeHtml(isSaveMode ? "Write the current run here." : "Loads this run from local storage.")}</div>
              </div>
              <span class="save-slot-badge${selectedMeta ? " active" : ""}">${escapeHtml(stateLabel)}</span>
            </div>
            <div class="workspace-ledger-row">
              <div>
                <strong>Saved</strong>
                <div class="muted">${escapeHtml(savedAt || (selectedMeta ? "Stored on this device." : "Nothing stored yet."))}</div>
              </div>
              <span>${escapeHtml(savedAt || (selectedMeta ? "Ready" : "Empty"))}</span>
            </div>
          </div>
          <div class="modal-actions save-slot-detail-actions" data-save-slot-detail-actions>
            <button
              class="menu-button primary"
              data-action="${isSaveMode ? "save-game" : "load-game"}"
              data-save-slot="${selectedSlotId}"
              data-focus-key="save-slots:${mode}:${selectedSlotId}"
              type="button"
              ${disabled ? " disabled" : ""}
            >${escapeHtml(actionLabel)}</button>
          </div>
        </section>
        ${titleMusicMarkup}
      </div>
    `;
  }

  showSaveSlotsModal(mode = "load", options = {}) {
    this.syncAdaptiveLayout();
    this.clearModalInteractionFeedback();
    const { preserveScroll = false, focusTarget = null } = options;
    const hasAnySave = this.getAllSavedRunMeta().some((entry) => Boolean(entry.meta));
    const latestMeta = this.getSavedRunMeta();
    const selectedSlotId = clamp(
      Number(this.activeSaveSlotId || (mode === "save" ? this.activeSaveSlotId || 1 : latestMeta?.slotId || 1)),
      1,
      3
    );
    this.activeSaveSlotId = selectedSlotId;
    const resolvedFocus = focusTarget || `save-slots:slot:${mode}:${selectedSlotId}`;
    const intro = mode === "save"
      ? (this.player ? "Choose a slot for this run. Existing slots can be overwritten." : "No active run is available to save.")
      : (hasAnySave ? "Choose which save slot to continue from." : "No saved runs are available yet.");
    this.mode = "modal";
    this.showSimpleModal(mode === "save" ? "Save Slots" : "Continue Run", `
      <div class="workspace-stack save-slot-workspace">
        <div class="workspace-summary-strip">
          <div class="workspace-summary-chip">
            <span class="workspace-summary-label">${mode === "save" ? "Save Slots" : "Continue Run"}</span>
            <strong>${escapeHtml(intro)}</strong>
          </div>
          <div class="workspace-summary-chip">
            <span class="workspace-summary-label">Latest</span>
            <strong>${escapeHtml(latestMeta ? `${this.getSaveSlotLabel(latestMeta.slotId)} | ${latestMeta.name}` : "No saved run yet")}</strong>
          </div>
          <div class="workspace-summary-chip">
            <span class="workspace-summary-label">Saved Slots</span>
            <strong>${this.getAllSavedRunMeta().filter((entry) => Boolean(entry.meta)).length} / 3</strong>
          </div>
        </div>
        <div class="workspace-shell save-slot-shell">
          <section class="workspace-rail save-slot-list-rail">
            <div class="panel-title">Slots</div>
            ${this.getSaveSlotWorkspaceListMarkup(mode)}
          </section>
          <section class="workspace-rail-detail save-slot-detail-rail">
            ${this.getSaveSlotWorkspaceDetailMarkup(mode)}
          </section>
        </div>
      </div>
    `, {
      surfaceKey: `save-slots:${mode}`,
      preserveScroll,
      focusTarget: resolvedFocus
    });
    this.syncMusicToggleUi();
    this.syncSurfaceMusic();
  }

  showHelpModal(options = {}) {
    if (this.player && this.mode !== "title") {
      this.showHubModal("journal", {
        preserveScroll: this.mode === "modal",
        focusTarget: this.getJournalSectionFocusKey("guide"),
        journalSection: "guide"
      });
      return;
    }
    this.mode = "modal";
    const hasGamepad = this.gamepadInput?.isConnected?.() || false;
    const isTouch = this.layoutMode === "mobile" && !hasGamepad;
    const controlLines = [];
    if (isTouch) {
      controlLines.push("<li><strong>Touch:</strong> Use the on-screen pad for movement and the command dock for actions. Tap Menu for save, map, and settings.</li>");
    } else if (hasGamepad) {
      controlLines.push("<li><strong>Controller:</strong> D-pad or left stick moves. A confirms or uses. B backs out of menus. X is the alternate action. Y opens pack. Start opens the run menu. Back toggles the map. LB / RB switch tabs. RT or right stick scrolls.</li>");
      controlLines.push("<li><strong>Keyboard:</strong> Arrows or numpad move. F searches. U uses. I opens pack. S opens magic. M opens the map. R rests. Shift+R sleeps until restored.</li>");
    } else {
      controlLines.push("<li><strong>Keyboard:</strong> Arrows or numpad move. F searches. U uses. I opens pack. S opens magic. M opens the map. R rests. Shift+R sleeps until restored.</li>");
      controlLines.push("<li><strong>Controller / Touch:</strong> Connect a gamepad or switch to a phone for on-screen controls. Same menus, different input.</li>");
    }
    this.showSimpleModal("How to Play", `
      <div class="section-block help-panel">
        <div class="field-label">Core Loop</div>
        <div class="text-block">
          Start in town, prep the build, enter the keep, clear the floor objective, then decide whether to extract or push deeper.
        </div>
      </div>
      <div class="section-block help-panel">
        <div class="field-label">Controls</div>
        <ul class="help-list">
          ${controlLines.join("\n          ")}
        </ul>
      </div>
      <div class="section-block help-panel">
        <div class="field-label">Dungeon Rules</div>
        <ul class="help-list">
          <li>Search reveals hidden doors, traps, and better routes.</li>
          <li>Heavy burden lowers dodge and lets monsters press harder.</li>
          <li>Targeted spells and wands need line of sight.</li>
          <li>Resting and sleeping are noisy, and sleep breaks when a monster enters view.</li>
          <li>Enemy intent icons warn about rushes, ranged shots, summons, and other dangerous turns before they land.</li>
        </ul>
      </div>
    `, {
      surfaceKey: "help",
      closeLabel: options.closeLabel || "Close",
      modalReturnContext: options.modalReturnContext || null
    });
  }

  cancelPendingUtilityMenuSummary() {
    this.clearDeferredUiTask(this.pendingUtilitySummaryFrame, "frame");
    this.pendingUtilitySummaryFrame = 0;
  }

  getUtilityMenuPlaceholderMarkup(title, detail) {
    return `
      <div class="utility-menu-title">${escapeHtml(title)}</div>
      <div class="utility-menu-meta">${escapeHtml(detail)}</div>
    `;
  }

  hydrateUtilityMenuSummaries(root = this.modalRoot) {
    if (this.modalSurfaceKey !== "utility-menu") {
      return;
    }
    const savedMeta = this.getSavedRunMeta();
    const connected = this.gamepadInput.isConnected();
    const activeContract = this.getActiveContract(true) || this.getActiveContract(false);
    const latestSummary = this.getLatestPersistenceSummary();
    const latestUnlock = this.getLatestPermanentUnlock();
    const utilityRunSummary = root?.querySelector("#utility-run-summary");
    const utilitySaveSummary = root?.querySelector("#utility-save-summary");
    const utilityControlSummary = root?.querySelector("#utility-control-summary");

    if (utilityRunSummary) {
      utilityRunSummary.innerHTML = this.player
        ? `
          <div class="utility-menu-title">${escapeHtml(this.player.name)} | ${escapeHtml(this.currentDepth === 0 ? "Town" : `Depth ${this.currentDepth}`)}</div>
          <div class="utility-menu-meta">${escapeHtml([
            this.currentLevel?.description || "Run in progress.",
            activeContract ? `Contract: ${activeContract.name}` : "No contract armed"
          ].join(" | "))}</div>
        `
        : `
          <div class="utility-menu-title">No active run</div>
          <div class="utility-menu-meta">${escapeHtml(activeContract ? `Contract armed: ${activeContract.name}` : "Start a new adventurer to begin a descent.")}</div>
        `;
    }

    if (utilitySaveSummary) {
      if (!savedMeta) {
        utilitySaveSummary.innerHTML = `
          <div class="utility-menu-title">Resume Point</div>
          <div class="utility-menu-meta">${escapeHtml(latestSummary ? `Latest return: ${latestSummary.outcome} depth ${latestSummary.extractedDepth}` : "No saved run yet.")}</div>
          <div class="utility-menu-meta subtle">${escapeHtml(latestUnlock ? `Unlock: ${latestUnlock}` : "No unlock yet")}</div>
        `;
      } else {
        const timeLabel = savedMeta.savedAt ? this.formatSaveStamp(savedMeta.savedAt) : null;
        utilitySaveSummary.innerHTML = `
          <div class="utility-menu-title">${escapeHtml(savedMeta.name)}</div>
          <div class="utility-menu-meta">${escapeHtml(`${this.getSaveSlotLabel(savedMeta.slotId || 1)} | Level ${savedMeta.level} | Depth ${savedMeta.depth}`)}</div>
          <div class="utility-menu-meta subtle">${escapeHtml(timeLabel || (latestUnlock ? `Unlock: ${latestUnlock}` : "Saved on this device"))}</div>
        `;
      }
    }

    if (utilityControlSummary) {
      utilityControlSummary.innerHTML = `
        <div class="utility-menu-title">${connected ? "Controller ready" : "Touch active"}</div>
        <div class="utility-menu-meta">${escapeHtml(connected ? `${this.gamepadInput.getControllerName()} | A confirm | B back | RT scroll` : "Pad and dock are active for movement and actions.")}</div>
      `;
    }
  }

  showUtilityMenu(options = {}) {
    const {
      focusTarget = null,
      openerFocusKey = undefined
    } = options;
    this.syncAdaptiveLayout();
    this.utilityMenuSecondaryExpanded = this.getModalLayoutMode() === "desktop";
    const currentOpenerFocusKey = this.getCurrentUiFocusKey() || "utility-menu-button";
    if (typeof openerFocusKey === "string") {
      this.utilityMenuOpenerFocusKey = openerFocusKey || null;
    } else if (currentOpenerFocusKey) {
      this.utilityMenuOpenerFocusKey = currentOpenerFocusKey;
    }
    this.mode = "modal";
    this.setModalVisibility(true);
    const template = document.getElementById("utility-menu-template");
    const fragment = template.content.cloneNode(true);
    const savedSlots = this.getAllSavedRunMeta();
    const hasSavedRun = savedSlots.some((entry) => Boolean(entry.meta));
    const utilityRunSummary = fragment.getElementById("utility-run-summary");
    const utilitySaveSummary = fragment.getElementById("utility-save-summary");
    const utilityControlSummary = fragment.getElementById("utility-control-summary");
    const utilitySaveButton = fragment.getElementById("utility-save-button");
    const utilityLoadButton = fragment.getElementById("utility-load-button");
    const utilityStatsButton = fragment.getElementById("utility-stats-button");

    if (utilityRunSummary) {
      utilityRunSummary.innerHTML = this.getUtilityMenuPlaceholderMarkup(
        this.player ? `${this.player.name} · ${this.currentDepth === 0 ? "Town" : `Depth ${this.currentDepth}`}` : "No active run",
        "Syncing current run summary..."
      );
    }

    if (utilitySaveSummary) {
      utilitySaveSummary.innerHTML = this.getUtilityMenuPlaceholderMarkup("Resume Point", "Checking save slots...");
    }

    if (utilityControlSummary) {
      utilityControlSummary.innerHTML = this.getUtilityMenuPlaceholderMarkup("Device & Controls", "Reading current input mode...");
    }

    if (utilitySaveButton) {
      utilitySaveButton.disabled = !this.player || this.mode === "title";
    }
    if (utilityLoadButton) {
      utilityLoadButton.disabled = !hasSavedRun;
    }
    if (utilityStatsButton) {
      utilityStatsButton.disabled = !this.player;
    }

    this.cancelPendingUtilityMenuSummary();
    this.clearModalInteractionFeedback();
    this.modalRoot.innerHTML = "";
    this.modalRoot.appendChild(fragment);
    this.modalRoot.classList.remove("hidden");
    this.applyModalSurfacePresentation("utility-menu", this.modalRoot.querySelector(".modal"));
    this.modalSurfaceKey = "utility-menu";
    this.modalReturnContext = null;
    this.recordTelemetry("modal_opened", {
      surface: "utility-menu"
    });
    this.ensureModalInteractionFeedbackHost();
    this.syncModalInteractionFeedbackHost();
    this.syncUtilityMenuExpansion();
    this.syncModalAdaptiveUiState();
    this.applyControllerNavigationMetadata();
    this.pendingUtilitySummaryFrame = this.queueAnimationFrame(() => {
      this.pendingUtilitySummaryFrame = 0;
      this.hydrateUtilityMenuSummaries();
    });
    const focusElement = this.resolveModalFocusTarget(focusTarget);
    if (focusElement) {
      this.focusUiElement(focusElement);
      return;
    }
    this.focusFirstUiElement();
  }

  closeModal() {
    this.resetMovementCadence();
    this.cancelPendingUtilityMenuSummary();
    this.cancelPendingHubPanePrewarm();
    this.cancelModalInteractionFeedback();
    this.modalInteractionFeedback = { message: "", tone: "" };
    const closingSurfaceKey = this.modalSurfaceKey;
    const modalReturnContext = this.modalReturnContext;
    const openerFocusKey = this.utilityMenuOpenerFocusKey;
    this.setModalVisibility(false);
    this.modalRoot.classList.add("hidden");
    this.modalRoot.innerHTML = "";
    delete this.modalRoot.dataset.surfaceTier;
    delete this.modalRoot.dataset.surfaceKey;
    this.modalSurfaceKey = null;
    this.modalReturnContext = null;
    this.pendingService = null;
    this.activeHubTab = "pack";
    this.hoveredPackSelection = null;
    this.utilityMenuSecondaryExpanded = false;
    this.fieldGuideRailCollapsed = false;
    this.resetHubPaneDirtyState();
    if (this.targetMode && this.mode !== "target") {
      this.targetMode = null;
    }
    if (modalReturnContext?.originSurface === "utility-menu" && this.player) {
      this.showUtilityMenu({
        focusTarget: modalReturnContext.returnFocusKey,
        openerFocusKey
      });
      return;
    }
    if (!this.player) {
      this.utilityMenuOpenerFocusKey = null;
      this.showTitleScreen();
      return;
    }
    if (this.isPlayerDead()) {
      this.utilityMenuOpenerFocusKey = null;
      this.showTitleScreen();
      return;
    }
    if (this.player && this.player.hp > 0) {
      this.mode = "game";
    }
    if (closingSurfaceKey === "utility-menu") {
      this.restoreUiFocus(openerFocusKey || "utility-menu-button");
    } else if (this.controllerFocusKey && !this.findUiElementByFocusKey(this.controllerFocusKey)) {
      this.controllerFocusKey = null;
    }
  }

  log(message, tone = "") {
    this.messages.push({ turn: this.turn, message, tone });
    if (this.messages.length > 120) {
      this.messages.shift();
    }
    const priority = this.getStickyFeedPriority(message, tone);
    if (priority > 0) {
      const currentPriority = this.liveFeedSticky?.priority || 0;
      const currentTurn = this.liveFeedSticky?.turn || 0;
      if (!this.liveFeedSticky || priority > currentPriority || (priority === currentPriority && this.turn >= currentTurn)) {
        this.liveFeedSticky = {
          message,
          tone,
          turn: this.turn,
          priority,
          expiresAt: this.turn + 2
        };
      }
    }
    if (
      this.mode === "modal"
      && this.modalRoot
      && !this.modalRoot.classList.contains("hidden")
      && ["good", "warning", "bad"].includes(tone)
    ) {
      this.showModalInteractionFeedback(message, tone, {
        persistMs: tone === "bad" ? 1600 : tone === "warning" ? 1350 : 1100
      });
    }
  }

  render() {
    const previousFocusKey = this.mode === "modal" ? null : (this.getActiveUiActionableElement()?.dataset?.focusKey || this.controllerFocusKey || null);
    const advisor = this.player && this.currentLevel ? this.getAdvisorModel() : null;
    this.syncSurfaceMusic();
    this.syncUtilityBar();
    this.renderBoard();
    this.renderMiniMap();
    this.renderPanels(advisor);
    this.renderEventTicker();
    this.renderActionBar(advisor);
    this.renderDesktopShell();
    this.syncSpellTray();
    this.applyControllerNavigationMetadata();
    this.ensureRuntimeLoop();
    if (previousFocusKey && this.lastInputSource !== "pointer") {
      const nextFocus = this.findUiElementByFocusKey(previousFocusKey);
      if (nextFocus) {
        this.focusUiElement(nextFocus);
      }
    }
  }

  renderMiniMap() {
    return renderMiniMapComposed(this);
  }

  renderBoard() {
    return renderBoardComposed(this);
  }

  playProjectile(from, to, color, options = {}) {
    this.addEffect({
      type: "projectileTrail",
      from: { x: from.x, y: from.y },
      to: { x: to.x, y: to.y },
      color,
      style: options.style || "arcane",
      duration: options.duration || (this.getReducedMotionActive() ? 120 : 210)
    });
  }

  refreshChrome() {
    this.syncAdaptiveLayout();
    if (this.appShell) {
      this.appShell.classList.toggle("targeting-active", this.mode === "target" && Boolean(this.targetMode));
    }
    this.syncUtilityBar();
    this.syncDesktopOverlayPlacement();
    if (this.mapDrawer) {
      const showMap = this.mapDrawerOpen && Boolean(this.player);
      this.mapDrawer.classList.toggle("hidden", !showMap);
    }
    if (this.mapToggleButton) {
      this.mapToggleButton.disabled = !this.player;
      this.mapToggleButton.textContent = this.mapDrawerOpen && this.player ? "Hide Survey" : "Survey";
    }
    if (this.spellTrayToggleButton) {
      const hasSpellTray = Boolean(this.player && this.getPinnedSpellIds().length > 0);
      const canShowToggle = this.layoutMode !== "desktop" && hasSpellTray && !["title", "creation", "levelup"].includes(this.mode);
      this.spellTrayToggleButton.classList.toggle("hidden", !canShowToggle);
      this.spellTrayToggleButton.disabled = !canShowToggle;
      this.spellTrayToggleButton.textContent = this.spellTrayOpen || (this.mode === "target" && this.targetMode?.type === "spell")
        ? "Hide Magic"
        : "Magic";
    }
    if (this.touchControls) {
      const hiddenBySetting = !this.settings.touchControlsEnabled;
      const hiddenByController = this.settings.controllerHintsEnabled && this.gamepadInput.isConnected();
      this.touchControls.classList.toggle("hidden", hiddenBySetting || hiddenByController);
    }
    this.renderDesktopShell();
    this.syncSpellTray();
    syncSaveChrome(this);
    this.applyControllerNavigationMetadata();
  }

  getPressureUiState() {
    return getPressureStatus(this.currentLevel);
  }

  getViewportMetrics() {
    const viewport = typeof window !== "undefined" ? window.visualViewport : null;
    const width = Math.round(viewport?.width || window.innerWidth || 0);
    const height = Math.round(viewport?.height || window.innerHeight || 0);
    return { width, height };
  }

  getModalLayoutMode() {
    const { width } = this.getViewportMetrics();
    return width >= 920 ? "desktop" : "mobile";
  }

  getBoardOverlayHeightPx() {
    if (!this.eventTicker || this.eventTicker.classList.contains("hidden")) {
      return 0;
    }
    const overlayRect = this.eventTicker.getBoundingClientRect?.();
    if (overlayRect?.height > 0) {
      return overlayRect.height;
    }
    return BOARD_OVERLAY_HEIGHT_PX[this.layoutMode] || BOARD_OVERLAY_HEIGHT_PX.mobile;
  }

  getBoardOverlayReserveRows() {
    const overlayHeight = this.getBoardOverlayHeightPx();
    if (overlayHeight <= 0) {
      return 0;
    }
    const canvasRect = this.canvas?.getBoundingClientRect?.();
    const canvasHeight = canvasRect?.height || this.canvas?.height || (VIEW_SIZE * TILE_SIZE);
    const tileHeight = canvasHeight > 0 ? canvasHeight / VIEW_SIZE : TILE_SIZE;
    return clamp(Math.ceil(overlayHeight / Math.max(tileHeight, 1)), 0, VIEW_SIZE - 1);
  }

  getViewportAnchorRow() {
    const reserveRows = this.getBoardOverlayReserveRows();
    if (reserveRows <= 0) {
      return Math.floor(VIEW_SIZE / 2);
    }
    return clamp(VIEW_SIZE - reserveRows - 1 - BOARD_OVERLAY_BUFFER_ROWS, 0, VIEW_SIZE - 1);
  }

  getResponsiveLayoutMode() {
    const { width, height } = this.getViewportMetrics();
    const desktopWidth = width >= 1080;
    const landscapeEnough = width >= Math.round(height * 1.12);
    return desktopWidth && landscapeEnough ? "desktop" : "mobile";
  }

  syncAdaptiveLayout(force = false) {
    const nextMode = this.getResponsiveLayoutMode();
    const changed = this.layoutMode !== nextMode;
    this.layoutMode = nextMode;
    if (this.appShell) {
      this.appShell.dataset.layout = nextMode;
      this.appShell.dataset.input = this.gamepadInput.isConnected()
        ? "controller"
        : nextMode === "mobile"
          ? "touch"
          : "keyboard";
    }
    document.documentElement.dataset.layout = nextMode;
    if ((force || changed) && this.player) {
      if (this.mapDrawer) {
        this.mapDrawerOpen = nextMode === "desktop";
      } else if (nextMode === "desktop") {
        this.mapDrawerOpen = true;
      } else if (nextMode === "mobile") {
        this.mapDrawerOpen = false;
        if (this.appShell) {
          this.appShell.classList.remove("mobile-map-open");
        }
      }
    }
    this.syncDesktopOverlayPlacement();
  }

  getDirectionToPoint(point) {
    if (!this.player || !point) {
      return "";
    }
    const dy = point.y - this.player.y;
    const dx = point.x - this.player.x;
    const vertical = dy < -1 ? "north" : dy > 1 ? "south" : "";
    const horizontal = dx < -1 ? "west" : dx > 1 ? "east" : "";
    if (vertical && horizontal) {
      return `${vertical}-${horizontal}`;
    }
    return vertical || horizontal || "here";
  }

  getTownAreaTitle() {
    if (!this.player || this.currentDepth !== 0 || !this.currentLevel) {
      return this.currentLevel?.description || "Town";
    }
    const building = (this.currentLevel.buildings || []).find((entry) =>
      this.player.x >= entry.x &&
      this.player.x < entry.x + entry.w &&
      this.player.y >= entry.y &&
      this.player.y < entry.y + entry.h
    );
    if (building) {
      return building.name || "Town Service";
    }
    if (this.player.x >= 19 && this.player.x <= 29 && this.player.y >= 16 && this.player.y <= 22) {
      return "Town Square";
    }
    if (this.player.x >= 23 && this.player.x <= 25 && this.player.y <= 9) {
      return "Keep Road";
    }
    if (this.player.x >= 22 && this.player.x <= 26 && this.player.y >= 23) {
      return "South Road";
    }
    if (this.player.x < 20 && this.player.y < 12) {
      return "West Market";
    }
    if (this.player.x > 28 && this.player.y < 12) {
      return "East Market";
    }
    if (this.player.x < 20) {
      return "West Quarter";
    }
    if (this.player.x > 28) {
      return "East Quarter";
    }
    return "Town";
  }

  getCurrentAreaTitle() {
    if (!this.currentLevel) {
      return "";
    }
    return this.currentDepth === 0 ? this.getTownAreaTitle() : this.currentLevel.description;
  }

  getObjectiveGuideText() {
    return this.getLoopDirective().primaryText || "";
  }

  getEventTickerEntries(limit = 1) {
    if (!this.player || this.messages.length === 0) {
      return [];
    }
    const important = [];
    const minTurn = Math.max(1, this.turn - 3);
    for (let index = this.messages.length - 1; index >= 0; index -= 1) {
      const entry = this.messages[index];
      const isRecent = entry.turn >= minTurn;
      const importantText = /reinforcement|objective|stairs|sealed|cursed|pick|learn|descend|ascend|free|altar|shrine|captive|cache|merchant|summon|trap|hits|misses|dies|wakes|casts/i.test(entry.message);
      const skipLowValueLore = this.turn > 6 && entry.turn <= 2 && !importantText;
      if (!skipLowValueLore && (isRecent || importantText || entry.tone === "bad" || entry.tone === "warning")) {
        important.push(entry);
      }
      if (important.length >= limit) {
        break;
      }
    }
    return important.reverse();
  }

  getPinnedTickerEntry() {
    if (!this.player || this.messages.length === 0) {
      return null;
    }
    for (let index = this.messages.length - 1; index >= 0; index -= 1) {
      const entry = this.messages[index];
      const importantText = /reinforcement|objective|stairs|sealed|cursed|pick|learn|descend|ascend|free|altar|shrine|captive|cache|merchant|summon|trap/i.test(entry.message);
      if (importantText || entry.tone === "bad") {
        return this.turn - entry.turn <= 3 ? entry : null;
      }
    }
    return null;
  }

  getStickyFeedPriority(message = "", tone = "") {
    if (!message) {
      return 0;
    }
    if (/stairs up are live|leave now|remain sealed|clear the room first|raised pressure|objective complete|free the captive|burn the nest|seal the shrine/i.test(message)) {
      return 3;
    }
    if (/reinforcement|collapse risk|charge|summon|ranged|trap|cursed/i.test(message) || tone === "bad") {
      return 2;
    }
    if (/route|search|greed|extract|bank the floor|descend|ascend/i.test(message)) {
      return 1;
    }
    return 0;
  }

  getStickyFeedEvent() {
    if (!this.player) {
      return null;
    }
    if (this.liveFeedSticky && this.turn <= (this.liveFeedSticky.expiresAt || 0)) {
      return {
        turnLabel: `T${this.liveFeedSticky.turn}`,
        tone: this.liveFeedSticky.tone ? `ticker-${this.liveFeedSticky.tone}` : "ticker-context",
        text: this.liveFeedSticky.message
      };
    }
    this.liveFeedSticky = null;
    const pinned = this.getPinnedTickerEntry();
    if (!pinned) {
      return null;
    }
    return {
      turnLabel: `T${pinned.turn}`,
      tone: pinned.tone ? `ticker-${pinned.tone}` : "ticker-context",
      text: pinned.message
    };
  }

  getLiveFeedModel() {
    return buildHudFeedModel(this);
  }

  renderEventTicker() {
    if (!this.eventTicker) {
      return;
    }
    const model = this.getLiveFeedModel();
    const markup = renderHudFeed(this, model);
    const previousScrollTop = this.eventTicker.scrollTop || 0;
    if (this.lastEventTickerMarkup !== markup) {
      this.eventTicker.innerHTML = markup;
      this.lastEventTickerMarkup = markup;
      if (previousScrollTop > 0) {
        this.eventTicker.scrollTop = previousScrollTop;
      }
    }
    this.eventTicker.classList.toggle("hidden", !model.visible || !markup);
  }

  syncUtilityBar() {
    const connected = this.gamepadInput.isConnected();
    if (this.controllerStatus) {
      if (connected) {
        this.controllerStatus.textContent = this.mode === "modal" || this.mode === "creation" || this.mode === "title" || this.mode === "levelup"
          ? "A Confirm  B Back  LB/RB Tabs  RT Scroll"
          : "A Confirm/Use  B Back  X Alt  Y Pack";
      } else {
        this.controllerStatus.textContent = "Touch active";
      }
    }
    if (this.pressureStatus) {
      if (!this.player || !this.currentLevel) {
        this.pressureStatus.textContent = "Quiet";
        this.pressureStatus.className = "utility-chip utility-chip-muted";
      } else if (this.currentDepth === 0) {
        const firstTownRun = (this.player.deepestDepth || 0) === 0;
        this.pressureStatus.textContent = firstTownRun
          ? (this.storyFlags.townServiceVisited ? "North Road" : "Services")
          : "Town Calm";
        this.pressureStatus.className = "utility-chip utility-chip-muted";
      } else {
        const pressure = this.getPressureUiState();
        this.pressureStatus.textContent = pressure.label;
        this.pressureStatus.className = `utility-chip utility-pressure-status tone-${pressure.tone}`;
      }
    }
    // Step 3 — JRPG pressure feedback. Cascade a frame-tint class onto the
    // board wrapper so any .jrpg-window descendants (status + command) also
    // pick up the border color, and surface a warning/alert window on the
    // board overlay when the floor is not calm.
    this.applyPressureFrameTint();
    this.applyPressureWarningWindow();
    if (this.topMusicButton) {
      const musicOn = Boolean(this.settings.musicEnabled);
      const choice = this.getMusicTrackChoice();
      const currentTheme = choice.id === "area" ? `${this.getDefaultMusicTrackLabel()} default` : `${choice.label} theme`;
      this.topMusicButton.textContent = musicOn ? `Music: ${choice.label}` : "Music Off";
      this.topMusicButton.setAttribute("aria-pressed", musicOn ? "true" : "false");
      this.topMusicButton.setAttribute(
        "aria-label",
        musicOn
          ? `Music on. Current selection ${currentTheme}. Press left or right to change tracks.`
          : "Music off. Press Enter to turn music on, or press left or right to choose a track."
      );
      this.topMusicButton.title = musicOn
        ? `Current selection: ${currentTheme}. Press Left or Right to change tracks.`
        : "Music is off. Press Left or Right to choose a track, or Enter to toggle music.";
      this.topMusicButton.dataset.musicTrack = choice.id;
    }
    if (this.topMapButton) {
      const inRun = Boolean(this.player && this.currentLevel);
      this.topMapButton.hidden = !inRun;
      this.topMapButton.disabled = !inRun;
      if (inRun) {
        this.topMapButton.setAttribute("aria-pressed", this.mapDrawerOpen ? "true" : "false");
      }
    }
    if (this.runStatus) {
      if (!this.player || !this.currentLevel) {
        this.runStatus.textContent = "Title Screen";
        return;
      }
      this.runStatus.textContent = this.currentDepth === 0
        ? `${this.getCurrentAreaTitle()} · ${this.getTownCycleLabel()}`
        : `Depth ${this.currentDepth} · ${this.getCurrentAreaTitle()}`;
    }
  }

  // Map the internal pressure tone (good/warning/bad) to the JRPG frame
  // tint bucket (calm/rising/leave). Returns null when there is no run.
  getJrpgPressureBucket() {
    if (!this.player || !this.currentLevel || this.currentDepth === 0) {
      return "calm";
    }
    const tone = this.getPressureUiState()?.tone || "good";
    if (tone === "bad") return "leave";
    if (tone === "warning") return "rising";
    return "calm";
  }

  // Apply jrpg-frame-tint-* to the board stage so every .jrpg-window
  // descendant inherits the border color via the cascading custom property.
  // Uses dataset writes (single attribute flip) instead of three classList
  // operations so the browser only has one style invalidation per tick.
  applyPressureFrameTint() {
    if (!this.boardFrameTintHost) {
      this.boardFrameTintHost = document.querySelector(".board-stage")
        || document.querySelector(".board-frame")
        || this.appShell;
    }
    const bucket = this.getJrpgPressureBucket();
    if (this.boardFrameTintHost && this.boardFrameTintHost.dataset.jrpgPressure !== bucket) {
      this.boardFrameTintHost.dataset.jrpgPressure = bucket;
    }
    // Mirror the bucket onto the app shell so the bottom-band windows
    // inherit --jrpg-border from an ancestor (board-stage is a sibling).
    if (this.appShell && this.appShell.dataset.jrpgPressure !== bucket) {
      this.appShell.dataset.jrpgPressure = bucket;
    }
  }

  // Surface a windowed warning/alert banner on the board overlay when the
  // floor is not calm. Calm state removes the banner entirely.
  applyPressureWarningWindow() {
    const overlays = document.querySelector(".board-overlays");
    if (!overlays) return;
    const bucket = this.getJrpgPressureBucket();
    let banner = overlays.querySelector("[data-jrpg-pressure-banner]");
    if (bucket === "calm") {
      if (banner) banner.remove();
      return;
    }
    if (!banner) {
      banner = document.createElement("section");
      banner.setAttribute("data-jrpg-pressure-banner", "");
      overlays.appendChild(banner);
    }
    const pressure = this.getPressureUiState();
    const titleText = bucket === "leave" ? "LEAVE NOW" : "PRESSURE RISING";
    const bodyText = pressure?.summary || (bucket === "leave"
      ? "Reinforcements inbound."
      : "Patrols are active.");
    const variantClass = bucket === "leave" ? "is-alert" : "is-warning";
    banner.className = `jrpg-window jrpg-pressure-banner ${variantClass}`;
    banner.innerHTML = `
      <h3 class="jrpg-window-title">${titleText}</h3>
      <div class="jrpg-window-row">${escapeHtml(bodyText)}</div>
    `;
  }

  getAllSavedRunMeta() { return loadAllSavedRunMeta(); }

  getSavedRunMeta(slotId = null) { return loadSavedRunMeta(slotId); }

  formatSaveStamp(isoString) { return formatSavedRunStamp(isoString); }

  resetCreationDraft() {
    resetCreationState(this);
  }

  captureCreationDraft() { captureCreationDraftState(this); }

  getCreationPointsRemaining() { return getCreationDraftPointsRemaining(this); }

  adjustCreationStat(stat, delta) { return adjustCreationStatDraft(this, stat, delta); }

  getCreationStats() { return getCreationDraftStats(this); }

  performSearch() {
    if (!this.player || this.mode !== "game") {
      return;
    }
    applyCommandResult(this, performSearchCommand(this));
    this.endTurn();
  }

  performWait() {
    this.resetMovementCadence();
    applyEffects(this, performWaitTurn(this));
  }

  restUntilSafe() {
    this.resetMovementCadence();
    applyEffects(this, restUntilSafeTurn(this));
  }

  sleepUntilRestored() {
    this.resetMovementCadence();
    applyEffects(this, sleepUntilRestoredTurn(this));
  }

  visibleEnemies() { return getVisibleEnemies(this); }

  makeNoise(radius, source = this.player, reason = "noise") { return makeDungeonNoise(this, radius, source, reason); }

  canMonsterMoveTo(monster, x, y) { return canMonsterMove(this, monster, x, y); }

  findRetreatStep(monster) { return findMonsterRetreatStep(this, monster); }

  canCharge(monster, dx, dy, distanceToPlayer) { return canMonsterCharge(this, monster, dx, dy, distanceToPlayer); }

  applyCharge(monster) { return applyCharge(this, monster); }

  getMonsterIntent(monster) { return getMonsterIntentModel(this, monster); }

  updateMonsterIntents() { updateAllMonsterIntents(this); }

  attack(attacker, defender) { return attackActors(this, attacker, defender); }

  damageActor(attacker, defender, amount, damageType = "physical") { return damageActorTarget(this, attacker, defender, amount, damageType); }

  killMonster(monster) { killMonsterActor(this, monster); }

  checkLevelUp() { checkPlayerLevelUp(this); }

  handleDeath() { handlePlayerDeath(this); }

  resolveTurn(advanceTurn = true) { resolveGameTurn(this, advanceTurn); }

  endTurn(advanceTurn = true) { endGameTurn(this, advanceTurn); }

  processMonsters() { processMonsterTurns(this); }

  useStairs(direction) {
    this.resetMovementCadence();
    const result = useStairsCommand(this, direction);
    if (!result) {
      return;
    }
    result.logs.forEach((entry) => this.log(entry.message, entry.tone));
    result.sounds.forEach((sound) => this.audio.play(sound));
    if (result.refreshChrome) {
      this.refreshChrome();
    }
    if (!result.render) {
      if (result.autosave) {
        this.scheduleAutosave();
      }
      return;
    }
    this.transitionPending = true;
    this.updateFov();
    this.applyIntroFloorRecon();
    this.refreshChrome();
    this.render();
    this.queueAnimationFrame(() => {
      this.updateMonsterIntents();
      this.checkQuestState();
      this.transitionPending = false;
      this.render();
      if (result.autosave) {
        this.scheduleAutosave();
      }
    });
  }

  saveGame(options = {}) { saveGameState(this, options); }

  loadGame(options = {}) {
    this.resetMovementCadence();
    this.cancelScheduledAutosave();
    this.cancelPendingHubPanePrewarm();
    this.clearDeferredUiTask(this.pendingAdventureBootstrapFrame, "frame");
    this.pendingAdventureBootstrapFrame = 0;
    this.transitionPending = false;
    this.resetHubPaneDirtyState();
    loadGameState(this, options);
    this.syncSurfaceMusic();
  }

  showTitleScreen() {
    this.resetMovementCadence();
    this.cancelScheduledAutosave();
    this.cancelPendingHubPanePrewarm();
    this.clearDeferredUiTask(this.pendingAdventureBootstrapFrame, "frame");
    this.pendingAdventureBootstrapFrame = 0;
    this.transitionPending = false;
    this.resetHubPaneDirtyState();
    showTitleModal(this);
  }

  showCreationModal(options = {}) { showCreationScreen(this, options); }

  renderActionBar(advisor = null) { renderAdvisorActionBar(this, advisor); }

  getAdvisorModel() { return buildAdvisorModel(this); }

  renderPanels(advisor = null) { renderAdvisorPanels(this, advisor); }

  recordTelemetry(type, context = {}) {
    return recordTelemetry(this, type, context);
  }

  recordTownServiceOpen(serviceId) {
    return recordTownServiceOpen(this, serviceId);
  }

  trackFirstPlayerMove(x, y) {
    return trackFirstPlayerMove(this, x, y);
  }

  trackObjectiveProgress(tile = null) {
    return trackObjectiveProgress(this, tile);
  }

  trackOptionalProgress(tile = null) {
    return trackOptionalProgress(this, tile);
  }

  getTelemetrySummary() {
    return buildTelemetrySummary(this);
  }

  exportTelemetryTrace() {
    if (exportTelemetryTrace(this)) {
      this.log("Current run trace exported.", "good");
      this.render();
    }
  }

  renderLog() {
    return this.renderLogMarkup(32);
  }
}
