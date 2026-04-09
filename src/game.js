import { APP_VERSION, DIRECTIONS, DUNGEON_DEPTH, FOV_RADIUS, SAVE_KEY, TILE_SIZE, VIEW_SIZE } from "./core/constants.js";
import { BOON_DEFS, CLASSES, COMMENDATION_DEFS, DISCOVERY_DEFS, ENEMY_BEHAVIOR_KITS, ITEM_DEFS, LOOT_AFFIX_DEFS, MILESTONE_DEFS, MONSTER_DEFS, OBJECTIVE_DEFS, PERK_DEFS, RACES, RELIC_DEFS, ROOM_EVENT_DEFS, SHOPS, SPELLS, STORY_BEATS, STORY_NPCS, TEMPLE_SERVICES, TOWN_REACTION_DEFS, TOWN_UNLOCK_DEFS } from "./data/content.js";
import { AMBIENT_MUSIC_ASSETS, TITLE_SCREEN_ASSETS } from "./data/assets.js";
import {
  createInitialShopState,
  createEmptyEquipment,
  normalizeItem,
  normalizeLevels,
  normalizePlayer,
  normalizeShopState,
  createItem,
  createMonster,
  createTownItem,
  getCarryCapacity,
  getCarryWeight,
  getClass,
  getEncumbranceTier,
  getExploredPercent,
  getHealthRatio,
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
import { actorAt, addLevelProp, addSecretVault, addSetPiece, blankLevel, bresenhamLine, carveRoom, carveTunnel, centerOf, clearVisibility, fillRect, getTile, hasLineOfSight, inBounds, intersects, isExplored, isOccupied, isVisible, isWalkable, itemsAt, placeBuilding, randomRoomTile, revealAll, revealAllSecrets, revealCircle, revealNearbySecrets, revealSecretTile, setExplored, setTile, setVisible, summonMonsterNear, tileDef, findInitialTargetCursor, carveHorizontal, carveVertical } from "./core/world.js";
import { capitalize, choice, choiceCard, clamp, distance, escapeHtml, nowTime, randInt, removeAt, removeFromArray, removeOne, roll, shuffle, valueTone } from "./core/utils.js";
import { defaultSettings, loadSettings, saveSettings } from "./core/settings.js";
import { drawBoardAtmosphere, drawBoardBurdenVignette, drawBoardProps, drawBoardVignette, drawCenteredText, drawEffect, drawItem, drawMonster, drawMonsterHealthBar, drawMonsterIntent, drawPlayer, drawTargetCursor, drawTile, drawTownBuildings } from "./ui/render.js";
import { SoundBoard } from "./audio/soundboard.js";
import { GamepadInput } from "./input/gamepad.js";
import { applyEffects } from "./core/effect-bus.js";
import { createPlayerState } from "./core/player-state.js";
import { actorStats, armorValueForStats, attackValueForStats, burdenUiState, damageRangeForStats, equipmentStatBonuses, evadeValueForStats, levelProgress, maxHpForStats, maxManaForStats, moveSpeedForStats, playerClassTemplate, playerHpBase, playerManaBase, playerRaceTemplate, searchPowerForStats, searchRadiusForStats } from "./core/stat-helpers.js";
import { addSpellToTrayIfSpace as addSpellToTray, cancelTargetMode as cancelSpellTarget, closeSpellTray as closeSpellTrayFn, confirmTargetSelection as confirmSpellTarget, getActiveSpellTargetPreview as getSpellPreview, getDamageEffectColor as getDmgColor, getLearnableSpellOptions as getLearnableSpells, getPinnedSpellIds as getPinnedSpells, getSpellFilterDefs as spellFilterDefs, getSpellFilterDefsForEntries as spellFilterDefsForEntries, getSpellProjectileStyle as getSpellProjStyle, getSpellRoleLabel as getSpellRole, getSpellTargetingLabel as getSpellTargetLabel, getSpellTargetingMode as getSpellTargetMode, getSpellTrayLimit as spellTrayLimit, getSpellTraySelectionId as spellTraySelection, getSortedKnownSpellIds as sortedSpellIds, moveTargetCursor as moveSpellCursor, moveTraySpell as moveTraySpellFn, openSpellTray as openSpellTrayFn, pinSpellToTray as pinSpellFn, prepareSpell as prepareSpellFn, resolveSpellTargetPreview as resolveSpellPreview, selectSpell as selectSpellFn, startTargetMode as startSpellTarget, syncSpellTray, unpinSpellFromTray as unpinSpellFn } from "./features/spell-manager.js";
import { addItemToInventory as addItemToInventoryFn, buyShopItem as buyShopItemFn, cancelPendingPickup as cancelPendingPickupFn, confirmPendingPickup as confirmPendingPickupFn, dropInventoryItem as dropInventoryItemFn, equipInventoryItem as equipInventoryItemFn, finishPickupTurn as finishPickupTurnFn, getPickupBurdenPreview as getPickupBurdenPreviewFn, identifyInventoryAndEquipment as identifyInventoryAndEquipmentFn, pickupHere as pickupHereFn, removeCurses as removeCursesFn, resolvePickupItem as resolvePickupItemFn, sellMarkedItems as sellMarkedItemsFn, sellShopItem as sellShopItemFn, showPickupPrompt as showPickupPromptFn, toggleInventorySaleMark as toggleInventorySaleMarkFn, unequipSlot as unequipSlotFn, useChargedItem as useChargedItemFn, useInventoryItem as useInventoryItemFn, useRuneOfReturn as useRuneOfReturnFn } from "./features/inventory-manager.js";
import { applyCommandResult } from "./core/command-result.js";
import { applyEffects } from "./core/effect-bus.js";
import { createPlayerState } from "./core/player-state.js";
import { actorStats, armorValueForStats, attackValueForStats, burdenUiState, damageRangeForStats, equipmentStatBonuses, evadeValueForStats, levelProgress, maxHpForStats, maxManaForStats, moveSpeedForStats, playerClassTemplate, playerHpBase, playerManaBase, playerRaceTemplate, searchPowerForStats, searchRadiusForStats } from "./core/stat-helpers.js";
import { addSpellToTrayIfSpace as addSpellToTray, cancelTargetMode as cancelSpellTarget, closeSpellTray as closeSpellTrayFn, confirmTargetSelection as confirmSpellTarget, getActiveSpellTargetPreview as getSpellPreview, getDamageEffectColor as getDmgColor, getLearnableSpellOptions as getLearnableSpells, getPinnedSpellIds as getPinnedSpells, getSpellFilterDefs as spellFilterDefs, getSpellFilterDefsForEntries as spellFilterDefsForEntries, getSpellProjectileStyle as getSpellProjStyle, getSpellRoleLabel as getSpellRole, getSpellTargetingLabel as getSpellTargetLabel, getSpellTargetingMode as getSpellTargetMode, getSpellTrayLimit as spellTrayLimit, getSpellTraySelectionId as spellTraySelection, getSortedKnownSpellIds as sortedSpellIds, moveTargetCursor as moveSpellCursor, moveTraySpell as moveTraySpellFn, openSpellTray as openSpellTrayFn, pinSpellToTray as pinSpellFn, prepareSpell as prepareSpellFn, resolveSpellTargetPreview as resolveSpellPreview, selectSpell as selectSpellFn, startTargetMode as startSpellTarget, syncSpellTray, unpinSpellFromTray as unpinSpellFn } from "./features/spell-manager.js";
import { addItemToInventory as addItemToInventoryFn, buyShopItem as buyShopItemFn, cancelPendingPickup as cancelPendingPickupFn, confirmPendingPickup as confirmPendingPickupFn, dropInventoryItem as dropInventoryItemFn, equipInventoryItem as equipInventoryItemFn, finishPickupTurn as finishPickupTurnFn, getPickupBurdenPreview as getPickupBurdenPreviewFn, identifyInventoryAndEquipment as identifyInventoryAndEquipmentFn, pickupHere as pickupHereFn, removeCurses as removeCursesFn, resolvePickupItem as resolvePickupItemFn, sellMarkedItems as sellMarkedItemsFn, sellShopItem as sellShopItemFn, showPickupPrompt as showPickupPromptFn, toggleInventorySaleMark as toggleInventorySaleMarkFn, unequipSlot as unequipSlotFn, useChargedItem as useChargedItemFn, useInventoryItem as useInventoryItemFn, useRuneOfReturn as useRuneOfReturnFn } from "./features/inventory-manager.js";
import { adjustCreationStat as adjustCreationStatDraft, captureCreationDraft as captureCreationDraftState, getCreationPointsRemaining as getCreationDraftPointsRemaining, getCreationStats as getCreationDraftStats, resetCreationDraft as resetCreationState, showCreationModal as showCreationScreen, showTitleScreen as showTitleModal } from "./features/creation.js";
import { getAllSavedRunMeta as loadAllSavedRunMeta, getSavedRunMeta as loadSavedRunMeta, formatSaveStamp as formatSavedRunStamp, loadGame as loadGameState, saveGame as saveGameState, syncSaveChrome } from "./features/persistence.js";
import { performSearchCommand, useStairsCommand } from "./features/exploration.js";
import { applyCharge, attack as attackActors, canCharge as canMonsterCharge, canMonsterMoveTo as canMonsterMove, checkLevelUp as checkPlayerLevelUp, damageActor as damageActorTarget, findRetreatStep as findMonsterRetreatStep, getMonsterIntent as getMonsterIntentModel, handleDeath as handlePlayerDeath, killMonster as killMonsterActor, makeNoise as makeDungeonNoise, processMonsters as processMonsterTurns, updateMonsterIntents as updateAllMonsterIntents, visibleEnemies as getVisibleEnemies } from "./features/combat.js";
import { endTurn as endGameTurn, performWait as performWaitTurn, resolveTurn as resolveGameTurn, restUntilSafe as restUntilSafeTurn, sleepUntilRestored as sleepUntilRestoredTurn } from "./features/turns.js";
import { getAdvisorModel as buildAdvisorModel, renderActionBar as renderAdvisorActionBar, renderPanels as renderAdvisorPanels } from "./features/advisor.js";
import { getDepthTheme, getDynamicMonsterCap, getEncounterSummary, populateDungeonEncounters } from "./features/encounters.js";
import { getObjectiveDefendersRemaining, getObjectiveRoomClear, getObjectiveRewardPreview, getObjectiveStatusText, getOptionalStatusText, grantObjectiveRumor, handleObjectiveInteraction, handleObjectivePickup, resolveFloorObjective, setupFloorDirectives, syncFloorState } from "./features/objectives.js";
import { advanceDangerTurn, getDangerSummary, getPressureStatus, increaseDanger as raiseDanger, initializeDangerState, markGreedAction as markFloorGreedAction, noteFloorIntro, syncDangerState } from "./features/director.js";
import { chooseReward, clearRewardChoice, ensureBuildState, getBuildArmorBonus, getBuildAttackBonus, getBuildDamageBonus, getBuildEvadeBonus, getBuildMaxHpBonus, getBuildMaxManaBonus, getBuildSearchBonus, getKnownRumors, getOvercastLoss, getSpellCost, grantBoon as applyBoonReward, grantRumorToken as addRumorToken, hasPendingProgressionChoice, onPlayerMove, onPlayerWait, prepareNextRewardChoice, queueObjectiveReward, queuePerkChoice } from "./features/builds.js";
import { buyTownRumor, ensureTownMetaState, formatTownCycle, getAvailableTownUnlocks, getRumorPrice, getSagePrice, getShopBuyPrice, getShopPool, getShopSellPrice, getTemplePrice, getTownCycleState as getTownCycleMeta, getTownIntel, getTownMetaSummary as buildTownMetaSummary, getTownReactionBundle, purchaseTownUnlock, refreshTownStocks } from "./features/town-meta.js";
import { buildDeathRecapMarkup, ensureChronicleState, noteDeathContext, recordChronicleEvent, renderChronicleMarkup } from "./features/chronicle.js";
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
import { buildTelemetrySummary, exportTelemetryTrace, getTelemetryReviewSnapshot, initializeTelemetry, recordRunSummary, recordTelemetry, recordTownServiceOpen, resetTelemetry, startTelemetryRun, trackFirstPlayerMove, trackObjectiveProgress, trackOptionalProgress } from "./features/telemetry.js";
import { markOnboardingFlag } from "./features/onboarding.js";
import { buildHudFeedModel, renderHudFeed } from "./features/hud-feed.js";
import {
  buildEquipmentSlotSummary,
  buildInventoryItemSemantics,
  buildInventoryPresentationModel,
  getInventoryCategoryDefs,
  getItemEffectKey,
  getSpellCategoryDefs,
  getSpellCategoryKey,
  getSpellCategoryLabel,
  getSpellEffectKey
} from "./features/inventory-ui.js";
import { getOnboardingVariantMeta, getRouteExperimentTuning, getValidationSummary as buildValidationSummary, initializeValidationState } from "./features/validation.js";

export class Game {
  constructor() {
    this.appShell = document.querySelector(".mobile-app");
    this.canvas = document.getElementById("game-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.mapCanvas = document.getElementById("map-canvas");
    this.mapCtx = this.mapCanvas ? this.mapCanvas.getContext("2d") : null;
    this.mapCaption = document.getElementById("map-caption");
    this.mapDrawer = document.getElementById("map-drawer");
    this.mapPanelLabel = document.getElementById("map-panel-label");
    this.mapPanelState = document.getElementById("map-panel-state");
    this.mapToggleButton = document.getElementById("map-toggle-button");
    this.spellTrayToggleButton = document.getElementById("spell-tray-toggle-button");
    this.spellTray = document.getElementById("spell-tray");
    this.contextChip = document.getElementById("context-chip");
    this.modalRoot = document.getElementById("modal-root");
    this.actionBar = document.getElementById("action-bar");
    this.runStatus = document.getElementById("run-status");
    this.pressureStatus = document.getElementById("pressure-status");
    this.controllerStatus = document.getElementById("controller-status");
    this.saveStamp = document.getElementById("save-stamp");
    this.quickSaveButton = document.getElementById("quick-save-button");
    this.quickLoadButton = document.getElementById("quick-load-button");
    this.touchControls = document.getElementById("touch-controls");
    this.playerCapsule = document.getElementById("player-capsule");
    this.threatCapsule = document.getElementById("threat-capsule");
    this.advisorStrip = document.getElementById("advisor-strip");
    this.eventTicker = document.getElementById("event-ticker");
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
    this.activePackFilter = "all";
    this.activeMagicFilter = "all";
    this.activeSpellLearnFilter = "all";
    this.activeShopPanel = "buy";
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
    this.reducedMotionQuery = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
    this.feedDrawerOpen = false;
    this.liveFeedSticky = null;
    this.movementCadence = this.createMovementCadenceState();
    document.documentElement.dataset.uiScale = this.settings.uiScale;
    this.shopState = createInitialShopState();
    this.shopBrowseState = null;
    this.lastPreviewKey = "";
    this.hoveredPackSelection = null;
    ensureTownMetaState(this);
    ensureChronicleState(this);
    ensureMetaProgressionState(this);
    initializeTelemetry(this);
    initializeValidationState(this);
    this.ps = createPlayerState(() => this.player);
    this.audio = new SoundBoard(this.settings);
    this.gamepadInput = new GamepadInput();
    this.bindEvents();
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
    window.addEventListener("gamepadconnected", () => this.refreshChrome());
    window.addEventListener("gamepaddisconnected", () => this.refreshChrome());
    window.addEventListener("resize", () => this.refreshChrome());
    window.addEventListener("pagehide", () => {
      if (!this.player) {
        return;
      }
      this.recordTelemetry("session_end", {
        reason: "pagehide"
      });
    });
    window.addEventListener("blur", () => this.resetMovementCadence());
  }

  startRuntimeLoop() {
    const tick = () => {
      const gamepadHandled = this.pollGamepad();
      if (!gamepadHandled) {
        this.pollHeldMovement();
      }
      this.updateEffects();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
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
    return Boolean(this.player && this.mode === "game" && !this.isPlayerDead());
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
    if (this.feedDrawerOpen) {
      this.feedDrawerOpen = false;
      this.render();
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
    const capacity = getCarryCapacity(this.player);
    const beforeWeight = getCarryWeight(this.player);
    const itemWeight = item.weight || 0;
    const afterWeight = beforeWeight + itemWeight;
    if (afterWeight > capacity) {
      return true;
    }
    return beforeWeight > capacity && itemWeight >= 5;
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

  getSpellFilterDefsForEntries(entries = []) { return spellFilterDefsForEntries(entries); }

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
      this.showHubModal("magic", {
        preserveScroll: true,
        focusTarget: focusTarget || this.getSpellBookFocusKey(this.pendingSpell || this.player?.spellsKnown?.[0] || "")
      });
      return;
    }
    this.refreshChrome();
    this.render();
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
      this.handleAction(action.dataset.action, action);
      return;
    }

    const raceChoice = event.target.closest("[data-race]");
    if (raceChoice) {
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
  }

  handlePreviewFocus(event) {
    this.lastPreviewKey = event.target.closest("[data-preview-key]")?.dataset?.previewKey || this.lastPreviewKey;
    this.syncPackHoverPreview(event.target, { allowKeyboard: true });
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
    const model = this.getPackSelectionModel();
    const inventoryModel = buildInventoryPresentationModel(this, {
      filter: this.activePackFilter,
      selectedIndex: model.selection.type === "inventory" ? model.selection.value : -1,
      shopId: this.getCurrentPackShopContext()
    });
    const wrapper = document.createElement("div");
    wrapper.innerHTML = this.getPackInspectorMarkup(model, inventoryModel).trim();
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
    if (this.isPlayerDead() && !["new-game", "load-game"].includes(actionName)) {
      return;
    }
    this.resetMovementCadence({ clearHeld: false });
    switch (actionName) {
      case "new-game":
        this.resetCreationDraft();
        this.showCreationModal();
        break;
      case "save-game": {
        const requestedSlot = Number(element?.dataset?.saveSlot || 0) || null;
        if (requestedSlot) {
          this.saveGame({ slotId: requestedSlot });
          this.showSaveSlotsModal("save", {
            preserveScroll: true,
            focusTarget: `save-slots:save:${requestedSlot}`
          });
          break;
        }
        this.showSaveSlotsModal("save", {
          preserveScroll: this.mode === "modal",
          focusTarget: element?.dataset?.focusKey || null
        });
        break;
      }
      case "load-game": {
        const requestedSlot = Number(element?.dataset?.saveSlot || 0) || null;
        if (!requestedSlot) {
          this.showSaveSlotsModal("load", {
            preserveScroll: this.mode === "modal" || this.mode === "title",
            focusTarget: element?.dataset?.focusKey || null
          });
          break;
        }
        if (this.mode === "title") {
          this.recordTelemetry("title_continue_used", {
            hasSave: Boolean(this.getSavedRunMeta(requestedSlot)),
            slotId: requestedSlot
          });
        }
        this.loadGame({ slotId: requestedSlot });
        break;
      }
      case "toggle-music":
        this.toggleMusicPreference();
        break;
      case "export-telemetry":
        this.exportTelemetryTrace();
        break;
      case "open-hub": {
        const tab = element && element.dataset.tab ? element.dataset.tab : "pack";
        const journalSection = element?.dataset?.journalSection || null;
        if (tab === "pack" && element?.dataset?.filter) {
          this.activePackFilter = element.dataset.filter;
          const inventoryModel = buildInventoryPresentationModel(this, {
            filter: this.activePackFilter,
            selectedIndex: this.activePackSelection?.type === "inventory" ? this.activePackSelection.value : -1,
            shopId: this.getCurrentPackShopContext()
          });
          if (inventoryModel.firstVisibleIndex >= 0) {
            this.setPackSelection({ type: "inventory", value: inventoryModel.firstVisibleIndex });
          }
        }
        this.showHubModal(tab, {
          preserveScroll: this.mode === "modal",
          focusTarget: tab === "journal" && journalSection
            ? this.getJournalSectionFocusKey(journalSection)
            : element
              ? this.getHubTabFocusKey(tab)
              : null,
          journalSection
        });
        break;
      }
      case "journal-section":
        this.showHubModal("journal", {
          preserveScroll: true,
          focusTarget: this.getJournalSectionFocusKey(element?.dataset?.section || "current"),
          journalSection: element?.dataset?.section || "current"
        });
        break;
      case "open-spell-tray":
        this.openSpellTray();
        break;
      case "inventory":
        this.showInventoryModal();
        break;
      case "open-character-sheet":
        this.showCharacterSheet(this.getUtilityModalReturnOptions("utility:stats"));
        break;
      case "spells":
        this.showSpellModal();
        break;
      case "wait":
        this.performWait();
        break;
      case "stairs-or-wait": {
        const tile = this.currentLevel && this.player ? getTile(this.currentLevel, this.player.x, this.player.y) : null;
        if (tile?.kind === "stairDown") {
          this.useStairs("down");
          break;
        }
        if (tile?.kind === "stairUp") {
          this.useStairs("up");
          break;
        }
        this.performWait();
        break;
      }
      case "rest":
        this.restUntilSafe();
        break;
      case "sleep":
        this.sleepUntilRestored();
        break;
      case "help":
        this.showHelpModal(this.getUtilityModalReturnOptions("utility:help"));
        break;
      case "open-briefing":
        this.showBriefingModal(this.getUtilityModalReturnOptions("utility:briefing"));
        break;
      case "open-bank":
        this.showBankModal({
          focusTarget: this.getTownActionFocusKey("rumor")
        });
        this.render();
        break;
      case "settings":
        this.showSettingsModal(this.getUtilityModalReturnOptions("utility:settings"));
        break;
      case "open-utility-menu":
        this.showUtilityMenu();
        break;
      case "open-town-service":
        this.openTownService(element.dataset.service);
        break;
      case "view-map":
        if (this.mode === "modal" && !this.pendingPickupPrompt) {
          this.closeModal();
        }
        this.focusMap();
        break;
      case "toggle-map":
        if (this.mapDrawer) {
          this.mapDrawerOpen = !this.mapDrawerOpen;
          this.refreshChrome();
        } else {
          this.focusMap();
        }
        break;
      case "toggle-feed-log":
        this.feedDrawerOpen = !this.feedDrawerOpen;
        this.render();
        break;
      case "begin-adventure":
        this.beginAdventure();
        break;
      case "creation-reset-stats":
        this.captureCreationDraft();
        this.creationStatBonuses = { str: 0, dex: 0, con: 0, int: 0 };
        this.showCreationModal({
          preserveScroll: true,
          focusTarget: "creation:reset-stats"
        });
        break;
      case "creation-adjust-stat":
        this.captureCreationDraft();
        if (this.adjustCreationStat(element.dataset.stat, Number(element.dataset.delta))) {
          this.showCreationModal({
            preserveScroll: true,
            focusTarget: `creation:stat:${element.dataset.stat}:${element.dataset.delta === "-1" ? "down" : "up"}`
          });
        }
        break;
      case "close-modal":
        if (this.pendingPickupPrompt) {
          this.cancelPendingPickup();
          break;
        }
        this.closeModal();
        break;
      case "pickup-confirm":
        this.confirmPendingPickup(false);
        break;
      case "pickup-equip":
        this.confirmPendingPickup(true);
        break;
      case "pickup-cancel":
        this.cancelPendingPickup();
        break;
      case "item-use":
        this.useInventoryItem(element.dataset.index);
        break;
      case "item-drop":
        this.dropInventoryItem(element.dataset.index);
        break;
      case "toggle-sale-mark":
        this.toggleInventorySaleMark(
          element.dataset.index,
          element instanceof HTMLInputElement && element.type === "checkbox" ? element.checked : null
        );
        break;
      case "inspect-pack-item":
        this.showHubModal("pack", {
          selection: { type: "inventory", value: Number(element.dataset.index) },
          preserveScroll: true,
          focusTarget: this.getPackItemFocusKey(Number(element.dataset.index))
        });
        break;
      case "inspect-slot":
        this.showHubModal("pack", {
          selection: { type: "slot", value: element.dataset.slot },
          preserveScroll: true,
          focusTarget: this.getPackSlotFocusKey(element.dataset.slot)
        });
        break;
      case "unequip-slot":
        this.unequipSlot(element.dataset.slot);
        break;
      case "pack-filter":
        this.activePackFilter = element.dataset.filter || "all";
        if (this.player) {
          const inventoryModel = buildInventoryPresentationModel(this, {
            filter: this.activePackFilter,
            selectedIndex: this.activePackSelection?.type === "inventory" ? this.activePackSelection.value : -1,
            shopId: this.getCurrentPackShopContext()
          });
          if (inventoryModel.firstVisibleIndex >= 0) {
            this.setPackSelection({ type: "inventory", value: inventoryModel.firstVisibleIndex });
          }
        }
        this.showHubModal("pack", {
          preserveScroll: true,
          focusTarget: this.getPackFilterFocusKey(this.activePackFilter)
        });
        break;
      case "magic-filter":
        this.activeMagicFilter = element.dataset.filter || "all";
        this.refreshMagicHub(this.getMagicFilterFocusKey(this.activeMagicFilter));
        break;
      case "spell-learn-filter":
        this.activeSpellLearnFilter = element.dataset.filter || "all";
        this.showSpellLearnModal();
        break;
      case "learn-spell":
        this.learnLevelUpSpell(element.dataset.spell);
        break;
      case "choose-reward":
        this.chooseRewardChoice(element.dataset.reward);
        break;
      case "spell-select":
        this.selectSpell(element.dataset.spell, {
          openTray: element.dataset.surface === "tray",
          focusTarget: element.dataset.focusKey || this.getSpellBookFocusKey(element.dataset.spell || "")
        });
        break;
      case "spell-cast":
        this.selectSpell(element.dataset.spell, {
          openTray: true,
          focusTarget: element.dataset.focusKey || this.getSpellBookFocusKey(element.dataset.spell || "")
        });
        this.prepareSpell(element.dataset.spell);
        break;
      case "spell-pin-toggle": {
        const spellId = element.dataset.spell || "";
        const changed = this.getPinnedSpellIds().includes(spellId)
          ? this.unpinSpellFromTray(spellId)
          : this.pinSpellToTray(spellId);
        if (changed) {
          this.refreshMagicHub(this.getSpellBookFocusKey(spellId));
        }
        break;
      }
      case "spell-pin-up":
        if (this.moveTraySpell(element.dataset.spell || "", -1)) {
          this.refreshMagicHub(this.getSpellBookFocusKey(element.dataset.spell || ""));
        }
        break;
      case "spell-pin-down":
        if (this.moveTraySpell(element.dataset.spell || "", 1)) {
          this.refreshMagicHub(this.getSpellBookFocusKey(element.dataset.spell || ""));
        }
        break;
      case "spell-tray-close":
        this.closeSpellTray();
        break;
      case "shop-buy":
        this.buyShopItem(element.dataset.shop, element.dataset.item);
        break;
      case "shop-sell":
        this.sellShopItem(element.dataset.index);
        break;
      case "shop-panel":
        this.activeShopPanel = element.dataset.panel === "sell" ? "sell" : "buy";
        if (this.pendingShop) {
          this.showShopModal(this.pendingShop.id, this.pendingShop, {
            preserveScroll: true,
            focusTarget: this.getShopPanelFocusKey(this.activeShopPanel),
            panel: this.activeShopPanel
          });
        }
        break;
      case "shop-sell-marked":
        this.sellMarkedItems();
        break;
      case "bank-deposit":
        this.handleBank("deposit");
        break;
      case "bank-withdraw":
        this.handleBank("withdraw");
        break;
      case "town-unlock":
        if (purchaseTownUnlock(this, element.dataset.unlock)) {
          this.showBankModal({
            preserveScroll: true,
            focusTarget: this.getTownUnlockFocusKey(element.dataset.unlock)
          });
          this.render();
        }
        break;
      case "town-rumor":
        if (buyTownRumor(this)) {
          this.showBankModal({
            preserveScroll: true,
            focusTarget: this.getTownActionFocusKey("rumor")
          });
          this.render();
        }
        break;
      case "contract-toggle":
        if (this.setActiveContract(element.dataset.contract || "")) {
          this.showBankModal({
            preserveScroll: true,
            focusTarget: `contract:${element.dataset.contract || "clear"}`
          });
          this.render();
        }
        break;
      case "contract-arm-recommended": {
        const recommendation = this.getRecommendedContract();
        if (recommendation?.id && this.setActiveContract(recommendation.id)) {
          if (this.mode === "creation") {
            this.showCreationModal({
              preserveScroll: true,
              focusTarget: "creation:contract:recommended"
            });
          } else if (this.mode === "title") {
            this.showTitleScreen();
          } else {
            this.showBankModal({
              preserveScroll: true,
              focusTarget: `contract:${recommendation.id}`
            });
          }
          this.render();
        }
        break;
      }
      case "service-use":
        if (!this.pendingService && this.currentDepth === 0 && element?.dataset?.service) {
          this.openTownService(element.dataset.service);
          break;
        }
        this.useService(element.dataset.service);
        break;
      case "interact":
        this.interactHere();
        break;
      case "search":
        this.performSearch();
        break;
      case "pickup":
        this.pickupHere(false, false);
        break;
      case "stairs-up":
        this.useStairs("up");
        break;
      case "stairs-down":
        this.useStairs("down");
        break;
      case "map-focus":
        this.focusMap();
        break;
      case "setting-toggle":
        this.toggleSetting(element.dataset.setting);
        break;
      case "target-confirm":
        this.confirmTargetSelection();
        break;
      case "target-cancel":
        this.cancelTargetMode();
        break;
      default:
        break;
    }
  }

  handleKeydown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      this.saveGame();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "l") {
      event.preventDefault();
      this.loadGame();
      return;
    }

    if (this.mode === "title") {
      if (event.key === "Enter") {
        event.preventDefault();
        this.resetCreationDraft();
        this.showCreationModal();
      }
      if (event.key.toLowerCase() === "l") {
        event.preventDefault();
        this.loadGame();
      }
      return;
    }

    if (this.mode === "creation") {
      if (event.key === "Enter") {
        this.beginAdventure();
      }
      return;
    }

    if (this.mode === "levelup") {
      return;
    }

    if (this.mode === "modal") {
      if (event.key === "Escape") {
        if (this.isPlayerDead()) {
          return;
        }
        if (this.pendingPickupPrompt) {
          this.cancelPendingPickup();
        } else {
          this.closeModal();
        }
      }
      return;
    }

    if (this.mode === "target") {
      const lowerTarget = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (DIRECTIONS[lowerTarget]) {
        event.preventDefault();
        const [dx, dy] = DIRECTIONS[lowerTarget];
        this.moveTargetCursor(dx, dy);
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.confirmTargetSelection();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        this.cancelTargetMode();
      }
      return;
    }

    if (!this.player || this.mode !== "game" || this.isPlayerDead()) {
      return;
    }

    const lower = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (event.shiftKey && lower === "r") {
      event.preventDefault();
      this.sleepUntilRestored();
      return;
    }

    if (DIRECTIONS[lower]) {
      event.preventDefault();
      const [dx, dy] = DIRECTIONS[lower];
      this.setHeldMovement("keyboard", dx, dy, lower);
      if (!event.repeat) {
        this.handleMovementIntent(dx, dy);
        this.scheduleHeldMovementRepeat("keyboard");
      }
      return;
    }

    this.resetMovementCadence();
    if (event.key === "Escape") {
      event.preventDefault();
      if (this.handleControllerBackAction()) {
        this.render();
      }
      return;
    }
    switch (lower) {
      case ".":
      case "5":
      case " ":
        event.preventDefault();
        this.performWait();
        break;
      case "m":
        event.preventDefault();
        if (this.mapDrawer && this.mapDrawerOpen) {
          this.mapDrawerOpen = false;
          this.refreshChrome();
        } else {
          this.focusMap();
        }
        break;
      case "i":
        event.preventDefault();
        this.showInventoryModal();
        break;
      case "s":
        event.preventDefault();
        if (event.shiftKey) {
          this.showSpellModal();
        } else {
          this.openSpellTray();
        }
        break;
      case ">":
        event.preventDefault();
        this.useStairs("down");
        break;
      case "<":
        event.preventDefault();
        this.useStairs("up");
        break;
      case "g":
        event.preventDefault();
        this.pickupHere();
        break;
      case "r":
        event.preventDefault();
        this.restUntilSafe();
        break;
      case "h":
        event.preventDefault();
        this.showHelpModal();
        break;
      case "u":
      case "v":
        event.preventDefault();
        this.interactHere();
        break;
      case "f":
        event.preventDefault();
        this.performSearch();
        break;
      default:
        break;
    }
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
    this.resetMovementCadence();
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
    this.feedDrawerOpen = false;
    this.liveFeedSticky = null;
    this.storyFlags.postReturnBankPrompt = false;
    this.resetReadState();
    resetTelemetry(this);
    ensureBuildState(this);
    ensureTownMetaState(this);
    ensureChronicleState(this);
    ensureMetaProgressionState(this);
    this.generateWorld();
    this.applyRunContractWorldModifiers(activeContract);
    this.syncTownCycle(true);
    this.recalculateDerivedStats();
    this.player.hp = this.player.maxHp;
    this.player.mana = this.player.maxMana;
    this.mode = "game";
    this.closeModal();
    this.syncAdaptiveLayout(true);
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
    this.saveGame({ silent: true });
    this.render();
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

  generateWorld() {
    this.levels = [];
    this.levels.push(this.generateTownLevel());
    for (let depth = 1; depth <= DUNGEON_DEPTH; depth += 1) {
      this.levels.push(this.generateDungeonLevel(depth));
    }
    this.currentDepth = 0;
    this.currentLevel = this.levels[0];
    this.resetReadState();
    this.placePlayerAt(this.currentLevel.start.x, this.currentLevel.start.y);
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

    for (let x = 4; x < width - 4; x += 1) {
      setTile(level, x, 16, tileDef("road"));
    }
    for (let y = 4; y < height - 4; y += 1) {
      setTile(level, 24, y, tileDef("road"));
    }
    fillRect(level, 19, 12, 11, 9, tileDef("stone"));
    fillRect(level, 20, 13, 9, 7, tileDef("plaza"));
    fillRect(level, 22, 6, 5, 5, tileDef("stone"));
    fillRect(level, 23, 7, 3, 3, tileDef("plaza"));
    placeBuilding(level, 4, 4, 9, 7, "General Store", "general");
    placeBuilding(level, 35, 4, 9, 7, "Armory", "armory");
    placeBuilding(level, 4, 22, 9, 7, "Wizard Guild", "guild");
    placeBuilding(level, 35, 22, 9, 7, "Temple", "temple");
    placeBuilding(level, 20, 25, 9, 5, "Bank", "bank");
    placeBuilding(level, 15, 4, 7, 6, "Sage Tower", "sage");
    placeBuilding(level, 27, 4, 6, 6, "Junk Shop", "junk");
    setTile(level, 24, 8, tileDef("stairDown"));
    level.start = { x: 24, y: 16 };
    level.stairsDown = { x: 24, y: 8 };
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
      { x: 24, y: 12 },
      { x: 24, y: 10 },
      { x: 24, y: 8 }
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
    if (this.mapDrawer) {
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
      this.refreshChrome();
      return false;
    }
    this.setInputSource("gamepad");
    this.refreshChrome();
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

  getUiNavigableElements(root = this.getUiNavigationRoot()) {
    const selector = [
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[data-action]:not([disabled])",
      "[data-move]:not([disabled])",
      "[tabindex]:not([tabindex='-1'])"
    ].join(", ");
    const seen = new Set();
    return Array.from(root.querySelectorAll(selector))
      .filter((element) => {
        if (!this.isNavigableElement(element) || seen.has(element)) {
          return false;
        }
        seen.add(element);
        return true;
      });
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
    if (this.modalRoot && this.modalRoot.contains(element) && typeof element.scrollIntoView === "function") {
      element.scrollIntoView({ block: "nearest", inline: "nearest" });
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
      return;
    }
    const next = this.findDirectionalUiTarget(active, dx, dy);
    if (next) {
      this.focusUiElement(next);
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
    return Array.from(root.querySelectorAll("[data-focus-key]"))
      .find((element) => element.dataset.focusKey === focusKey && element.offsetParent !== null && !element.disabled) || null;
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

  getScrollHostForElement(element) {
    if (!(element instanceof HTMLElement)) {
      return null;
    }
    return element.closest(".pack-list-panel, .message-log, .journal-log, .modal-body, .modal, .modal-root");
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

  applyControllerNavigationMetadata() {
    const root = this.getUiNavigationRoot();
    if (!root) {
      return;
    }
    this.assignNavMetadata(
      [
        this.quickSaveButton,
        this.quickLoadButton,
        this.mapToggleButton,
        this.spellTrayToggleButton,
        document.getElementById("utility-menu-button")
      ].filter(Boolean),
      "top-band",
      5
    );
    if (this.mapCanvas) {
      this.mapCanvas.tabIndex = 0;
      this.mapCanvas.dataset.focusKey = this.mapCanvas.dataset.focusKey || "map:canvas";
      this.mapCanvas.dataset.navZone = "map-drawer";
      this.mapCanvas.dataset.navRow = "0";
      this.mapCanvas.dataset.navCol = "0";
    }
    this.assignNavMetadata(Array.from(this.actionBar?.querySelectorAll("button") || []), "action-bar", 4);
    this.assignNavMetadata(Array.from(root.querySelectorAll("#spell-tray button")), "spell-tray", this.layoutMode === "desktop" ? 1 : 2);
    this.assignNavMetadata(Array.from(this.touchControls?.querySelectorAll("button") || []), "touch-pad", 3);
    this.assignNavMetadata(Array.from(root.querySelectorAll(".title-actions button")), "title-actions", 3);
    this.assignNavMetadata(Array.from(root.querySelectorAll("[data-role='title-music-toggle']")), "title-music", 1);
    const creationName = root.querySelector("#hero-name");
    const creationActions = Array.from(root.querySelectorAll("[data-focus-key='creation:back'], [data-focus-key='creation:begin']"));
    if (creationName) {
      this.ensureFocusKey(creationName, "creation:name");
      creationName.dataset.navZone = "name";
      creationName.dataset.navRow = "0";
      creationName.dataset.navCol = "0";
    }
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
    if (creationName && raceChoices[0]) {
      creationName.dataset.navDown = raceChoices[0].dataset.focusKey;
    }
    raceChoices.forEach((element, index) => {
      if (creationName) {
        element.dataset.navUp = creationName.dataset.focusKey;
      }
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
      if (statButtons[statButtons.length - 1]) {
        element.dataset.navUp = statButtons[statButtons.length - 1].dataset.focusKey;
      }
    });
    this.assignNavMetadata(Array.from(root.querySelectorAll(".hub-tabs .hub-tab")), "hub-tabs", 3);
    this.assignNavMetadata(Array.from(root.querySelectorAll(".pack-paperdoll .paper-slot")), "equipment", 2);
    const packFilters = Array.from(root.querySelectorAll(".pack-filter-row .hub-filter-chip"));
    const magicFilters = Array.from(root.querySelectorAll(".magic-filter-row .hub-filter-chip"));
    const spellLearnFilters = Array.from(root.querySelectorAll(".spell-learn-filter-row .hub-filter-chip"));
    const shopPanels = Array.from(root.querySelectorAll(".shop-panel-row .hub-filter-chip"));
    const journalSections = Array.from(root.querySelectorAll(".journal-section-row .hub-filter-chip"));
    const packItems = Array.from(root.querySelectorAll(".pack-group-list .pack-item-row"));
    this.assignNavMetadata(packFilters, "inventory-filters", 4);
    this.assignNavMetadata(magicFilters, "magic-filters", 4);
    this.assignNavMetadata(spellLearnFilters, "spell-learn-filters", 4);
    this.assignNavMetadata(shopPanels, "shop-panels", 2);
    this.assignNavMetadata(journalSections, "journal-sections", 4);
    this.assignNavMetadata(packItems, "inventory-list", 1);
    if (packItems[0]) {
      packFilters.forEach((element) => {
        element.dataset.navDown = packItems[0].dataset.focusKey;
      });
      packItems.forEach((element) => {
        element.dataset.navUp = packFilters[0].dataset.focusKey;
      });
    }
    this.assignNavMetadata(Array.from(root.querySelectorAll(".pack-inspector-panel .pack-ready-chip, .pack-inspector-panel .menu-button, .pack-inspector-panel .tiny-button, .pack-inspector-panel [data-action='toggle-sale-mark']")), "inspector-actions", 2);
    this.assignNavMetadata(Array.from(root.querySelectorAll(".magic-grid button")), "spell-grid", 2);
    const magicGridButtons = Array.from(root.querySelectorAll(".magic-grid button"));
    if (magicGridButtons[0]) {
      magicFilters.forEach((element) => {
        element.dataset.navDown = magicGridButtons[0].dataset.focusKey;
      });
    }
    this.assignNavMetadata(Array.from(root.querySelectorAll(".spell-learn-grid .spell-learn-card")), "spell-learn-grid", 2);
    const spellLearnCards = Array.from(root.querySelectorAll(".spell-learn-grid .spell-learn-card"));
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
    this.assignNavMetadata(Array.from(root.querySelectorAll(".journal-log")), "journal-log", 1);
    this.assignNavMetadata(Array.from(root.querySelectorAll(".utility-row .menu-button")), "journal-actions", 4);
    const journalLogs = Array.from(root.querySelectorAll(".journal-log"));
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
    this.assignNavMetadata(Array.from(root.querySelectorAll("[data-action='shop-buy']")), "shop-buy", 1);
    const shopSellControls = Array.from(root.querySelectorAll("[data-action='shop-sell'], [data-action='toggle-sale-mark'][data-shop-sell-row='true']"));
    this.assignNavMetadata(shopSellControls, "shop-sell", 1);
    const shopBuyButtons = Array.from(root.querySelectorAll("[data-action='shop-buy']"));
    const shopSellButtons = shopSellControls;
    if (shopBuyButtons[0]) {
      shopPanels.forEach((element) => {
        if (element.dataset.panel === "buy") {
          element.dataset.navDown = shopBuyButtons[0].dataset.focusKey;
        }
      });
    }
    if (shopSellButtons[0]) {
      shopPanels.forEach((element) => {
        if (element.dataset.panel === "sell") {
          element.dataset.navDown = shopSellButtons[0].dataset.focusKey;
        }
      });
    }
    this.assignNavMetadata(Array.from(root.querySelectorAll("[data-action='service-use']")), "services", 1);
    this.assignNavMetadata(Array.from(root.querySelectorAll("[data-action='setting-toggle']")), "settings", 1);
    this.assignNavMetadata(Array.from(root.querySelectorAll("[data-action='bank-deposit'], [data-action='bank-withdraw'], [data-action='town-rumor'], [data-action='town-unlock']")), "bank-actions", 4);
    this.assignNavMetadata(Array.from(root.querySelectorAll("[data-action='contract-toggle']")), "contracts", 1);
    this.assignNavMetadata(Array.from(root.querySelectorAll(".spell-learn-card")), "reward-grid", 2);
    this.assignNavMetadata(Array.from(root.querySelectorAll(".modal-actions button")), "modal-actions", 3);
    this.assignNavMetadata(Array.from(root.querySelectorAll(".utility-menu-actions .action-button")), "utility-menu", 2);
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
    if (this.mode === "game" || this.mode === "target") {
      this.renderBoard();
    }
  }

  showSettingsModal(options = {}) {
    const {
      preserveScroll = false,
      focusTarget = null,
      fallbackFocus = true,
      closeLabel = "Close",
      modalReturnContext = null
    } = options;
    this.mode = "modal";
    this.showSimpleModal("Device Settings", `
      <div class="section-block text-block">Travel settings are stored on this device.</div>
      <div class="shop-row">
        <div><strong>Touch Controls</strong><div class="muted">Show the on-screen movement pad when not hidden.</div></div>
        <div class="actions"><button class="tiny-button" data-action="setting-toggle" data-setting="touchControlsEnabled" type="button">${this.settings.touchControlsEnabled ? "On" : "Off"}</button></div>
      </div>
      <div class="shop-row">
        <div><strong>Hide Touch When Controller Connected</strong><div class="muted">Cleaner screen for paired joypads.</div></div>
        <div class="actions"><button class="tiny-button" data-action="setting-toggle" data-setting="controllerHintsEnabled" type="button">${this.settings.controllerHintsEnabled ? "On" : "Off"}</button></div>
      </div>
      <div class="shop-row">
        <div><strong>Sound Effects</strong><div class="muted">Combat, movement, and UI feedback.</div></div>
        <div class="actions"><button class="tiny-button" data-action="setting-toggle" data-setting="soundEnabled" type="button">${this.settings.soundEnabled ? "On" : "Off"}</button></div>
      </div>
      <div class="shop-row">
        <div><strong>Music</strong><div class="muted">Optional soundtrack with title, town, and dungeon themes.</div></div>
        <div class="actions"><button class="tiny-button" data-action="setting-toggle" data-setting="musicEnabled" type="button">${this.settings.musicEnabled ? "On" : "Off"}</button></div>
      </div>
      <div class="shop-row">
        <div><strong>Effect Intensity</strong><div class="muted">Choose how animated combat and board effects should feel.</div></div>
        <div class="actions"><button class="tiny-button" data-action="setting-toggle" data-setting="effectIntensity" type="button">${this.settings.effectIntensity}</button></div>
      </div>
      <div class="shop-row">
        <div><strong>Reduced Motion</strong><div class="muted">Prefer simpler flashes over animated travel and pulsing effects.</div></div>
        <div class="actions"><button class="tiny-button" data-action="setting-toggle" data-setting="reducedMotionEnabled" type="button">${this.settings.reducedMotionEnabled ? "On" : "Off"}</button></div>
      </div>
      <div class="shop-row">
        <div><strong>UI Scale</strong><div class="muted">Alternate between compact and large mobile spacing.</div></div>
        <div class="actions"><button class="tiny-button" data-action="setting-toggle" data-setting="uiScale" type="button">${this.settings.uiScale}</button></div>
      </div>
    `, {
      surfaceKey: "settings",
      preserveScroll,
      focusTarget,
      fallbackFocus,
      closeLabel,
      modalReturnContext
    });
  }

  showCharacterSheet(options = {}) {
    if (!this.player) {
      return;
    }
    const {
      preserveScroll = false,
      focusTarget = null,
      fallbackFocus = true,
      closeLabel = "Close",
      modalReturnContext = null
    } = options;
    const player = this.player;
    const stats = this.getActorStats(player);
    const baseStats = player.stats || stats;
    const bonuses = this.getEquipmentStatBonuses(player);
    const hpRatio = player.maxHp > 0 ? player.hp / player.maxHp : 1;
    const manaRatio = player.maxMana > 0 ? player.mana / player.maxMana : 1;
    const burdenUi = this.getBurdenUiState();
    const expProgress = this.getLevelProgress(player);
    const [damageLow, damageHigh] = this.getDamageRange();
    const activeContract = this.getActiveContract(true) || this.getActiveContract(false);
    const conditionTags = [];
    if ((player.held || 0) > 0) {
      conditionTags.push(`Held ${player.held}`);
    }
    if ((player.slowed || 0) > 0) {
      conditionTags.push(`Slowed ${player.slowed}`);
    }
    if ((player.guardBrokenTurns || 0) > 0) {
      conditionTags.push(`Guard broken ${player.guardBrokenTurns}`);
    }
    if ((player.arcaneWardTurns || 0) > 0) {
      conditionTags.push(`Arcane ward ${player.arcaneWardTurns}`);
    }
    if ((player.resistFireTurns || 0) > 0) {
      conditionTags.push(`Fire ward ${player.resistFireTurns}`);
    }
    if ((player.resistColdTurns || 0) > 0) {
      conditionTags.push(`Cold ward ${player.resistColdTurns}`);
    }
    if ((player.lightBuffTurns || 0) > 0) {
      conditionTags.push(`Light ${player.lightBuffTurns}`);
    }
    if (burdenUi.state !== "safe") {
      conditionTags.push(burdenUi.label);
    }
    const attributeRows = [
      ["Strength", "str"],
      ["Dexterity", "dex"],
      ["Constitution", "con"],
      ["Intelligence", "int"]
    ].map(([label, key]) => {
      const base = baseStats[key] || 0;
      const effective = stats[key] || 0;
      const bonus = bonuses[key] || 0;
      const detail = bonus === 0
        ? `${base} base`
        : `${base} base, ${bonus > 0 ? "+" : ""}${bonus} gear`;
      return `
        <div class="character-sheet-row">
          <strong>${label}</strong>
          <span class="muted">${escapeHtml(detail)}</span>
          <span>${effective}</span>
        </div>
      `;
    }).join("");
    const combatRows = [
      ["Attack", this.getAttackValue()],
      ["Damage", `${damageLow}-${damageHigh}`],
      ["Armor", this.getArmorValue()],
      ["Evade", this.getEvadeValue()],
      ["Guard", this.getGuardValue()],
      ["Ward", this.getWardValue()]
    ].map(([label, value]) => `
      <div class="character-sheet-row">
        <strong>${escapeHtml(label)}</strong>
        <span class="muted">Current total</span>
        <span>${escapeHtml(String(value))}</span>
      </div>
    `).join("");
    const fieldRows = [
      ["Search", this.getSearchPower()],
      ["Move Speed", `${player.moveSpeed}%`],
      ["Light Radius", player.lightRadius],
      ["Fire Resist", this.getFireResistValue()],
      ["Cold Resist", this.getColdResistValue()],
      ["Load", `${burdenUi.weight} / ${burdenUi.capacity}`],
      ["Gold", `${player.gold} gp`],
      ["Spells Known", player.spellsKnown.length]
    ].map(([label, value]) => `
      <div class="character-sheet-row">
        <strong>${escapeHtml(label)}</strong>
        <span class="muted">Run state</span>
        <span>${escapeHtml(String(value))}</span>
      </div>
    `).join("");

    this.mode = "modal";
    this.showSimpleModal("Character Sheet", `
      <div class="character-sheet">
        <section class="character-sheet-hero">
          <div>
            <div class="field-label">Adventurer</div>
            <div class="character-sheet-name">${escapeHtml(player.name)}</div>
            <div class="character-sheet-subtitle">${escapeHtml(`${player.race} ${player.className}`)}</div>
            <div class="character-sheet-subtitle">${escapeHtml(`${this.currentDepth === 0 ? "Town" : `Depth ${this.currentDepth}`} | Level ${player.level} | Turn ${this.turn}`)}</div>
            <div class="character-sheet-subtitle">${escapeHtml(activeContract ? `Active contract: ${activeContract.name}` : "Active contract: none armed")}</div>
          </div>
          <div class="character-sheet-tags">
            ${conditionTags.length > 0
              ? conditionTags.map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("")
              : `<span class="pill">Stable</span>`}
          </div>
        </section>

        <section class="character-sheet-grid">
          <div class="rail-stat-pill tone-health">
            <span>Health</span>
            <strong>${Math.floor(player.hp)} / ${player.maxHp}</strong>
            <div class="rail-meter hp"><span style="width:${clamp(Math.round(hpRatio * 100), 0, 100)}%"></span></div>
            <div class="character-sheet-meter-note">${clamp(Math.round(hpRatio * 100), 0, 100)}% ready</div>
          </div>
          <div class="rail-stat-pill tone-mana">
            <span>Mana</span>
            <strong>${Math.floor(player.mana)} / ${player.maxMana}</strong>
            <div class="rail-meter mana"><span style="width:${clamp(Math.round(manaRatio * 100), 0, 100)}%"></span></div>
            <div class="character-sheet-meter-note">${clamp(Math.round(manaRatio * 100), 0, 100)}% reserve</div>
          </div>
          <div class="rail-stat-pill tone-meta">
            <span>Experience</span>
            <strong>${expProgress.exp} / ${expProgress.nextThreshold}</strong>
            <div class="rail-meter xp"><span style="width:${expProgress.percent}%"></span></div>
            <div class="character-sheet-meter-note">${expProgress.remaining} to next level</div>
          </div>
          <div class="rail-stat-pill tone-load burden-${burdenUi.state}">
            <span>Burden</span>
            <strong>${burdenUi.weight} / ${burdenUi.capacity}</strong>
            <div class="rail-meter burden burden-${burdenUi.state}"><span style="width:${burdenUi.percent}%"></span></div>
            <div class="character-sheet-meter-note">${escapeHtml(burdenUi.label)}</div>
          </div>
        </section>

        <section class="character-sheet-section">
          <div class="field-label">Attributes</div>
          <div class="character-sheet-card">
            ${attributeRows}
          </div>
        </section>

        <section class="character-sheet-columns">
          <div class="character-sheet-section">
            <div class="field-label">Combat</div>
            <div class="character-sheet-card">
              ${combatRows}
            </div>
          </div>
          <div class="character-sheet-section">
            <div class="field-label">Field</div>
            <div class="character-sheet-card">
              ${fieldRows}
            </div>
          </div>
        </section>
      </div>
    `, {
      surfaceKey: "character-sheet",
      preserveScroll,
      focusTarget,
      fallbackFocus,
      closeLabel,
      modalReturnContext
    });
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

  getCurrentMusicTrack() {
    if (!this.settings.musicEnabled) {
      return "";
    }
    if (this.isTitleMusicSurface()) {
      return TITLE_SCREEN_ASSETS.music;
    }
    if (!this.player) {
      return "";
    }
    return this.currentDepth === 0 ? AMBIENT_MUSIC_ASSETS.town : AMBIENT_MUSIC_ASSETS.dungeon;
  }

  syncSurfaceMusic() {
    this.audio.syncMusic(this.getCurrentMusicTrack());
  }

  getMusicToggleLabel() {
    return this.audio.isMusicPlaying() ? "Mute Music" : "Play Music";
  }

  getMusicToggleNote() {
    return this.audio.isMusicPlaying()
      ? "Music is playing and will switch between title, town, and dungeon themes automatically."
      : "Music is available here, but it will stay off until you press Play Music.";
  }

  syncMusicToggleUi(root = this.modalRoot) {
    if (!(root instanceof HTMLElement)) {
      return;
    }
    const label = this.getMusicToggleLabel();
    const note = this.getMusicToggleNote();
    root.querySelectorAll("[data-role='title-music-toggle']").forEach((element) => {
      element.textContent = label;
      element.setAttribute("aria-pressed", this.audio.isMusicPlaying() ? "true" : "false");
    });
    root.querySelectorAll("[data-role='title-music-note']").forEach((element) => {
      element.textContent = note;
    });
  }

  toggleMusicPreference() {
    const shouldEnable = !this.audio.isMusicPlaying();
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

  toggleInventorySaleMark(index, forcedValue = null) { toggleInventorySaleMarkFn(this, index, forcedValue); }

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

  buyShopItem(shopId, itemId) { buyShopItemFn(this, shopId, itemId); }

  sellShopItem(index) { sellShopItemFn(this, index); }

  sellMarkedItems() { sellMarkedItemsFn(this); }

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

  applyRunContractWorldModifiers(activeContract = this.getActiveContract(true)) {
    if (!activeContract || !this.player) {
      return;
    }
    if (activeContract.id === "pressed_descent") {
      this.levels.slice(1).forEach((level, index) => {
        if (!level || level.kind !== "dungeon") {
          return;
        }
        const pressureCut = index === 0 ? 8 : 4;
        level.reinforcementClock = Math.max(10, (level.reinforcementClock || 18) - pressureCut);
      });
      return;
    }
    if (activeContract.id === "scholar_road" || activeContract.id === "route_debt") {
      this.levels.slice(1).forEach((level) => {
        if (!level?.guidance) {
          return;
        }
        const revealBonus = activeContract.id === "route_debt" ? 6 : 4;
        level.guidance.searchRevealChunk = Math.max(level.guidance.searchRevealChunk || 0, (level.guidance.searchRevealChunk || 0) + revealBonus);
      });
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

  showExtractionSummaryModal(summary = this.lastRunSummary, extras = {}) {
    if (!summary) {
      return;
    }
    const persistentChanges = Array.isArray(summary.persistentChanges) ? summary.persistentChanges : [];
    const unlockedText = extras.unlockedContracts?.length > 0
      ? extras.unlockedContracts.join(", ")
      : "No new contract unlock this return.";
    const masteryText = extras.masteryUnlock
      ? `${extras.masteryUnlock.name}. ${extras.masteryUnlock.description}`
      : this.getClassMasterySummary(this.player?.classId);
    const activeContract = this.getActiveContract(true);
    const townMeta = this.getTownMetaSummary();
    const nextRunIntent = this.getNextRunIntent(this.player?.classId);
    const carryForward = this.getTownCarryForwardSummary();
    const commendationText = extras.commendationUnlocks?.length > 0
      ? extras.commendationUnlocks.map((entry) => `${entry.name} (${entry.rewardLabel})`).join(" | ")
      : "No new commendation unlock this return.";
    this.recordTelemetry("return_summary_opened", {
      outcome: summary.outcome,
      extractedDepth: summary.extractedDepth
    });
    this.mode = "modal";
    this.showSimpleModal("Return Summary", `
      <div class="section-block text-block">
        Banked a clean return from ${escapeHtml(extras.level?.description || "the keep")} after ${summary.turns} turns.
      </div>
      ${persistentChanges.length > 0 ? `
        <div class="section-block text-block">
          <strong>Permanent change:</strong> ${escapeHtml(persistentChanges.join(" | "))}
        </div>
      ` : ""}
      <div class="section-block">
        <div class="field-label">Run Build</div>
        <div class="text-block">
          First objective: ${escapeHtml(summary.firstObjectiveType || "unknown")}<br>
          Searches: ${summary.searchCount} | Greed rooms: ${summary.greedCount} | Elite kills: ${summary.eliteKills || 0} | Return value: ${summary.returnValue} gp<br><br>
          What mattered: objective clear turn ${summary.firstObjectiveClearTurn ?? "?"}, deepest depth ${summary.deepestDepth}, active contract ${escapeHtml(activeContract?.name || "none")}
        </div>
      </div>
      <div class="section-block">
        <div class="field-label">Floor Rewards</div>
        <div class="text-block">
          Cleared depth ${summary.extractedDepth} with ${summary.modalOpenCounts.pack} pack checks, ${summary.modalOpenCounts.magic} magic checks, and ${summary.modalOpenCounts.journal} journal checks.<br><br>
          Greed taken: ${summary.greedCount} | Carried or banked value: ${summary.returnValue} gp
        </div>
      </div>
      <div class="section-block">
        <div class="field-label">Town Persistence</div>
        <div class="text-block">
          Mastery: ${escapeHtml(masteryText)}<br><br>
          Contracts: ${escapeHtml(unlockedText)}<br><br>
          Commendations: ${escapeHtml(commendationText)}<br><br>
          Active next-run contract: ${escapeHtml(this.getActiveContract(false)?.name || "No contract armed")}<br><br>
          ${escapeHtml(carryForward)}
        </div>
      </div>
      <div class="section-block">
        <div class="field-label">Next Step</div>
        <div class="text-block">
          ${escapeHtml(townMeta.recommendedActionLabel)}<br><br>
          ${escapeHtml(townMeta.recommendedAction)}<br><br>
          ${escapeHtml(townMeta.recommendedReason)}
        </div>
      </div>
      <div class="section-block">
        <div class="field-label">Why Run Again</div>
        <div class="text-block">${nextRunIntent.motivators.map((entry) => escapeHtml(`${entry.label} ${entry.detail}`)).join("<br><br>")}</div>
      </div>
      <div class="modal-actions">
        <button class="menu-button primary" data-action="open-bank" data-focus-key="return-summary:bank" type="button">Open Bank Plan</button>
        <button class="menu-button" data-action="close-modal" data-focus-key="return-summary:continue" type="button">Continue</button>
      </div>
    `, {
      surfaceKey: "return-summary"
    });
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
        : activeSpell.target === "self"
          ? `${getSpellCategoryLabel(activeSpell)} spell. Self cast resolves immediately.`
          : `${getSpellCategoryLabel(activeSpell)} | ${this.getSpellTargetingLabel(activeSpell)} | ${activeSpell.description}`
      : "No spell selected.";
    const focusTone = this.mode === "target" && preview && !preview.valid ? "invalid" : "valid";
    const rows = spellIds.map((spellId) => {
      const spell = SPELLS[spellId];
      if (!spell) {
        return "";
      }
      const manaCost = getSpellCost(this, spell);
      const overcast = this.player.mana < manaCost;
      const active = activeSpellId === spellId;
      const categoryLabel = getSpellCategoryLabel(spell);
      return `
        <button class="spell-tray-card${active ? " active" : ""}${overcast ? " warning" : ""}" data-action="spell-select" data-double-action="spell-cast" data-surface="tray" data-spell="${spellId}" data-focus-key="spell-tray:${spellId}" type="button">
          <span class="spell-tray-card-head">
            <span class="spell-tray-card-title">${escapeHtml(spell.name)}</span>
            <span class="spell-tray-card-cost">${manaCost} mana${overcast ? " / overcast" : ""}</span>
          </span>
          <span class="spell-tray-card-badges">
            <span class="spell-badge accent">${escapeHtml(categoryLabel)}</span>
            <span class="spell-badge">${escapeHtml(capitalize(spell.school || "spell"))}</span>
            <span class="spell-badge subtle">${escapeHtml(this.getSpellTargetingLabel(spell))}</span>
          </span>
          <span class="spell-tray-card-copy">${escapeHtml(spell.description)}</span>
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
            <span>${escapeHtml(activeSpell ? `${getSpellCost(this, activeSpell)} mana | ${getSpellCategoryLabel(activeSpell)} | ${this.getSpellTargetingLabel(activeSpell)}` : "")}</span>
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

  syncContextChip() {
    if (!this.contextChip) {
      return;
    }
    const prompt = this.getTileActionPrompt();
    if (!prompt || this.mode === "title" || this.mode === "creation") {
      this.contextChip.classList.add("hidden");
      this.contextChip.textContent = "";
      return;
    }
    this.contextChip.textContent = `${prompt.label}: ${prompt.detail}`;
    this.contextChip.className = `context-chip tone-${prompt.tone || "good"}`;
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
    let vy = this.player ? this.player.y - half : 0;
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
                    <span class="spell-learn-meta">${escapeHtml(`${capitalize(spell.school || "spell")} | ${spell.target === "monster" ? `Range ${spell.range || 1}` : "Self cast"} | ${getSpellCost(this, spell)} mana`)}</span>
                    <span class="spell-learn-copy">${escapeHtml(spell.description)}</span>
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
    this.addSpellToTrayIfSpace(spellId);
    this.pendingSpellChoices = Math.max(0, this.pendingSpellChoices - 1);
    this.log(`${this.player.name} learns ${spell.name}.`, "good");

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
    const closeButton = fragment.querySelector('[data-action="close-modal"]');
    if (closeButton) {
      closeButton.textContent = closeLabel;
      closeButton.dataset.focusKey = closeFocusKey;
    }
    this.modalRoot.innerHTML = "";
    this.modalRoot.appendChild(fragment);
    this.modalRoot.classList.remove("hidden");
    this.modalSurfaceKey = surfaceKey;
    this.modalReturnContext = modalReturnContext;
    this.recordTelemetry("modal_opened", {
      surface: surfaceKey || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    });
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
    if (item.markedForSale) {
      bits.push("Marked");
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
    if (item.markedForSale) {
      badges.push(`<span class="item-chip">Marked</span>`);
    }
    return badges.join("");
  }

  getPackFilterMarkup(inventoryModel) {
    return `
      <div class="pack-filter-row">
        ${inventoryModel.filterDefs.map((filterDef) => `
          <button class="hub-filter-chip${this.activePackFilter === filterDef.key ? " active" : ""}" data-action="pack-filter" data-filter="${filterDef.key}" data-focus-key="${this.getPackFilterFocusKey(filterDef.key)}" type="button">${escapeHtml(filterDef.label)}</button>
        `).join("")}
      </div>
    `;
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
              ${section.items.map((entry) => `
                <button class="pack-item-row${selectedIndex === entry.index || entry.isSelected ? " active" : ""}" data-action="inspect-pack-item" data-index="${entry.index}" data-focus-key="${this.getPackItemFocusKey(entry.index)}" data-pack-preview-type="inventory" data-pack-preview-value="${entry.index}" type="button">
                  <span class="pack-item-head">
                    <span class="pack-item-name">${escapeHtml(getItemName(entry.item))}</span>
                    ${entry.count > 1 ? `<span class="pack-item-stack">x${entry.count}</span>` : ""}
                  </span>
                  <span class="pack-item-meta">${escapeHtml(this.getPackItemMeta(entry.item, entry))}</span>
                  ${this.getPackRowTagMarkup(entry)}
                  <span class="pack-item-reason">${escapeHtml(entry.reason)}</span>
                  <span class="pack-item-note">${escapeHtml(this.getPackItemNote(entry.item, entry))}</span>
                </button>
              `).join("")}
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
    const shopId = this.getCurrentPackShopContext();
    const selectedEntry = model.selection.type === "inventory" ? inventoryModel.selectedEntry : null;
    const hoverPreviewModel = this.hoveredPackSelection && !this.isSamePackSelection(this.hoveredPackSelection, model.selection)
      ? this.getPackSelectionModelFor(this.hoveredPackSelection)
      : null;
    const hoverPreviewMarkup = this.getPackHoverPreviewMarkup(hoverPreviewModel, inventoryModel);
    if (!model.item && model.selection.type === "slot") {
      const slotSummary = buildEquipmentSlotSummary(this, model.slotDef, model.compatibleIndexes.length);
      const compatibleRows = model.compatibleIndexes.length === 0
        ? `<div class="muted">No carried item fits this slot right now.</div>`
        : `
          <div class="pack-compatible-list">
            ${model.compatibleIndexes.map((index) => `
              <button class="tiny-button pack-ready-chip" data-action="inspect-pack-item" data-index="${index}" data-focus-key="${this.getPackItemFocusKey(index)}" type="button">${escapeHtml(getItemName(this.player.inventory[index]))}</button>
            `).join("")}
          </div>
        `;
      return `
        <section class="hub-section pack-inspector-panel">
          <div class="panel-title">Selected Slot</div>
          ${hoverPreviewMarkup}
          <div class="pack-inspector-card">
            <div class="pack-inspector-kicker">${escapeHtml(slotSummary.recommendation)}</div>
            <div class="pack-inspector-title">Empty Slot</div>
            <div class="pack-inspector-summary">
              <span class="pack-decision-chip">${escapeHtml(model.slotDef.label)}</span>
              <span class="pack-decision-reason">${escapeHtml(slotSummary.reason)}</span>
            </div>
            <div class="pack-inspector-copy">${escapeHtml(model.slotDef.emptyText)}</div>
            <div class="pack-stat-grid">
              <div class="pack-stat-pill">Burden ${escapeHtml(inventoryModel.burdenUi.label)}</div>
              <div class="pack-stat-pill">${model.compatibleIndexes.length} ready</div>
            </div>
            <div class="pack-inspector-section">
              <strong>Ready To Equip</strong>
              ${compatibleRows}
            </div>
          </div>
        </section>
      `;
    }

    if (!model.item) {
      return "";
    }

    const item = model.item;
    const detailEntry = selectedEntry || buildInventoryItemSemantics(this, item, -1, { shopId });
    const slotSummary = model.selection.type === "slot" ? buildEquipmentSlotSummary(this, model.slotDef, model.compatibleIndexes.length) : null;
    const recommendation = selectedEntry?.recommendation || slotSummary?.recommendation || "Keep";
    const reason = selectedEntry?.reason || slotSummary?.reason || describeItem(item);
    const riskCallout = this.getSemanticRiskCallout(item, detailEntry, model, slotSummary);
    const statLines = [
      item.kind === "weapon" ? `Attack ${getItemPower(item)}` : "",
      item.kind === "armor" ? `Armor ${getItemArmor(item)}` : "",
      getItemAccuracyBonus(item) ? `Accuracy ${getItemAccuracyBonus(item) > 0 ? `+${getItemAccuracyBonus(item)}` : getItemAccuracyBonus(item)}` : "",
      getItemCritBonus(item) ? `Crit +${getItemCritBonus(item)}` : "",
      getItemGuardBonus(item) ? `Guard ${getItemGuardBonus(item)}` : "",
      getItemWardBonus(item) ? `Ward ${getItemWardBonus(item)}` : "",
      getItemManaBonus(item) ? `Mana +${getItemManaBonus(item)}` : "",
      getItemStrBonus(item) ? `Str +${getItemStrBonus(item)}` : "",
      getItemDexBonus(item) ? `Dex +${getItemDexBonus(item)}` : "",
      getItemConBonus(item) ? `Con +${getItemConBonus(item)}` : "",
      getItemIntBonus(item) ? `Int +${getItemIntBonus(item)}` : "",
      getItemLightBonus(item) ? `Sight +${getItemLightBonus(item)}` : "",
      getItemSearchBonus(item) ? `Search +${getItemSearchBonus(item)}` : "",
      getItemFireResist(item) ? `Fire Resist ${getItemFireResist(item)}` : "",
      getItemColdResist(item) ? `Cold Resist ${getItemColdResist(item)}` : "",
      item.kind === "charged" && item.identified ? `Charges ${item.charges}/${item.maxCharges || item.charges}` : "",
      item.weight || item.weight === 0 ? `Weight ${item.weight || 0}` : "",
      `Value ${Math.floor(getItemValue(item))} gp`,
      canIdentify(item) && !item.identified ? "Unknown" : "Known",
      item.cursed ? "Cursed" : ""
    ].filter(Boolean);
    const actions = model.selection.type === "inventory"
      ? `
        <button class="menu-button pack-action-primary is-active" data-action="item-use" data-index="${model.selection.value}" data-focus-key="${this.getPackActionFocusKey("use", model.selection.value)}" type="button">${this.getPackItemActionLabel(item)}</button>
        ${shopId && selectedEntry?.sellHereTag
          ? `<button class="menu-button" data-action="shop-sell" data-index="${model.selection.value}" data-focus-key="${this.getShopSellFocusKey(model.selection.value)}" type="button">Sell</button>`
          : `<label class="mark-sale-toggle inspector-mark-toggle"><input type="checkbox" data-action="toggle-sale-mark" data-index="${model.selection.value}" data-focus-key="${this.getPackActionFocusKey("mark", model.selection.value)}" ${item.markedForSale ? "checked" : ""}><span>Mark For Sale</span></label>`}
        <button class="menu-button" data-action="item-drop" data-index="${model.selection.value}" data-focus-key="${this.getPackActionFocusKey("drop", model.selection.value)}" type="button">Drop</button>
      `
      : `
        <button class="menu-button pack-action-primary is-active" data-action="unequip-slot" data-slot="${model.selection.value}" data-focus-key="${this.getPackActionFocusKey("unequip", model.selection.value)}" type="button"${item.cursed ? " disabled" : ""}>Unequip</button>
      `;

    const equippedSwap = model.selection.type === "inventory" && item.slot
      ? model.comparison?.fitsEmptySlot
        ? `<div class="pack-inspector-note">Fits empty ${escapeHtml(this.getPackSlotDefinition(model.comparison.targetSlot).label)} slot.</div>`
        : model.comparison?.equipped
          ? `<div class="pack-inspector-note">Equips over ${escapeHtml(getItemName(model.comparison.equipped, true))}.</div>`
          : ""
      : "";

    const cursedNote = model.selection.type === "slot" && item.cursed
      ? `<div class="pack-inspector-note bad-note">${escapeHtml(getItemName(item, true))} is cursed and cannot be removed yet.</div>`
      : "";

    const comparisonBlock = model.selection.type === "inventory" && item.slot && (model.comparison?.comparisons?.length > 0 || model.comparison?.fitsEmptySlot || model.comparison?.blockedByCurse)
      ? `
        <div class="pack-comparison-card">
          <div class="pack-comparison-title">${model.comparison.fitsEmptySlot ? `Fits ${escapeHtml(this.getPackSlotDefinition(model.comparison.targetSlot).label)}` : model.comparison.equipped ? `Compare vs ${escapeHtml(getItemName(model.comparison.equipped, true))}` : "Accessory Fit"}</div>
          <div class="pack-comparison-list">
            ${model.comparison.blockedByCurse
              ? `<div class="pack-comparison-row value-bad">All ${escapeHtml(this.getPackSlotDefinition(item.slot).label.toLowerCase())} slots are locked by curses.</div>`
              : model.comparison.fitsEmptySlot
                ? `<div class="pack-comparison-row value-good">No swap needed. ${escapeHtml(this.getPackSlotDefinition(model.comparison.targetSlot).label)} is open.</div>`
                : ""}
            ${model.comparison.comparisons?.map((entry) => `
              <div class="pack-comparison-row"><strong>${escapeHtml(entry.label)}</strong>${entry.slot === model.comparison.targetSlot ? " · target" : ""}</div>
              ${entry.deltas.length > 0
                ? entry.deltas.map((delta) => `<div class="pack-comparison-row value-${delta.tone}">${escapeHtml(delta.text)}</div>`).join("")
                : `<div class="pack-comparison-row muted">No practical change.</div>`}
            `).join("") || ""}
          </div>
          <div class="pack-inspector-note ${model.encumbrancePreview.tone}">${escapeHtml(model.encumbrancePreview.text)}</div>
        </div>
      `
      : item.slot
        ? `<div class="pack-inspector-note ${model.encumbrancePreview.tone}">${escapeHtml(model.encumbrancePreview.text)}</div>`
        : "";

    const readyRows = model.selection.type === "slot" && model.compatibleIndexes.length > 0 && !item.cursed
      ? `
        <div class="pack-inspector-section">
          <strong>Ready To Equip</strong>
          <div class="pack-compatible-list">
            ${model.compatibleIndexes.map((index) => `
              <button class="tiny-button pack-ready-chip" data-action="inspect-pack-item" data-index="${index}" data-focus-key="${this.getPackItemFocusKey(index)}" type="button">${escapeHtml(getItemName(this.player.inventory[index]))}</button>
            `).join("")}
          </div>
        </div>
      `
      : "";

    return `
      <section class="hub-section pack-inspector-panel">
        <div class="panel-title">${model.selection.type === "slot" ? "Equipped Detail" : "Selected Item"}</div>
        ${hoverPreviewMarkup}
        <div class="pack-inspector-card">
          <div class="pack-inspector-kicker">${escapeHtml(recommendation)}</div>
          <div class="pack-inspector-title">${escapeHtml(getItemName(item))}</div>
          <div class="pack-inspector-summary">
            <span class="pack-decision-chip">${escapeHtml(model.slotDef ? model.slotDef.label : selectedEntry?.kindLabel || classifyItem(item))}</span>
            <span class="pack-decision-reason">${escapeHtml(reason)}</span>
          </div>
          <div class="pack-item-badges">${this.getItemBadgeMarkup(item, detailEntry, model)}</div>
          ${riskCallout ? `<div class="pack-risk-callout">${escapeHtml(riskCallout)}</div>` : ""}
          <div class="pack-inspector-copy">${escapeHtml(describeItem(item))}</div>
          <div class="pack-stat-grid">
            ${statLines.map((line) => `<div class="pack-stat-pill">${escapeHtml(line)}</div>`).join("")}
          </div>
          ${equippedSwap}
          ${comparisonBlock}
          ${cursedNote}
          ${readyRows}
          <div class="modal-actions pack-inspector-actions">
            ${actions}
          </div>
        </div>
      </section>
    `;
  }

  getHubTabsMarkup(activeTab) {
    const tabs = [
      { id: "pack", label: "Pack" },
      { id: "magic", label: "Magic" },
      { id: "journal", label: "Guide" }
    ];
    return `
      <div class="hub-tabs">
        ${tabs.map((tab) => `
          <button class="hub-tab${tab.id === activeTab ? " active" : ""}" data-action="open-hub" data-tab="${tab.id}" data-focus-key="${this.getHubTabFocusKey(tab.id)}" type="button">${tab.label}</button>
        `).join("")}
      </div>
    `;
  }

  getPackHubMarkup() {
    const shopId = this.getCurrentPackShopContext();
    let model = this.getPackSelectionModel();
    let inventoryModel = buildInventoryPresentationModel(this, {
      filter: this.activePackFilter,
      selectedIndex: model.selection.type === "inventory" ? model.selection.value : -1,
      shopId
    });
    if (inventoryModel.firstVisibleIndex >= 0 && (this.activePackFilter !== "all" || model.selection.type === "inventory") && !inventoryModel.selectedVisible) {
      this.setPackSelection({ type: "inventory", value: inventoryModel.firstVisibleIndex });
      model = this.getPackSelectionModel();
      inventoryModel = buildInventoryPresentationModel(this, {
        filter: this.activePackFilter,
        selectedIndex: model.selection.type === "inventory" ? model.selection.value : -1,
        shopId
      });
    }
    const burdenUi = inventoryModel.burdenUi;
    const equipmentValue = Object.values(this.player.equipment).reduce((sum, item) => sum + (item ? getItemValue(item) : 0), 0);
    const packValue = this.player.inventory.reduce((sum, item) => sum + getItemValue(item), 0);
    const buildSummary = inventoryModel.buildSummary;
    const paperdoll = this.getPackSlotDefinitions().map((slotDef) => {
      const item = this.player.equipment[slotDef.slot];
      const compatibleCount = inventoryModel.entries.filter((entry) => this.getEquipmentBaseSlot(entry.item.slot || "") === this.getEquipmentBaseSlot(slotDef.slot) && entry.recommendation === "Equip").length;
      const slotSummary = buildEquipmentSlotSummary(this, slotDef, compatibleCount);
      const isActive = model.selection.type === "slot" && model.selection.value === slotDef.slot;
      return `
        <button class="paper-slot slot-${slotDef.area}${isActive ? " active" : ""}" data-action="inspect-slot" data-slot="${slotDef.slot}" data-focus-key="${this.getPackSlotFocusKey(slotDef.slot)}" data-pack-preview-type="slot" data-pack-preview-value="${slotDef.slot}" type="button">
          <span class="paper-slot-label">${escapeHtml(slotDef.label)}</span>
          <span class="paper-slot-item">${item ? escapeHtml(getItemName(item)) : "Empty"}</span>
          <span class="paper-slot-quality">${escapeHtml(slotSummary.quality)}</span>
          <span class="paper-slot-note">${escapeHtml(slotSummary.reason)}</span>
          ${compatibleCount > 0 ? `<span class="paper-slot-badge">${compatibleCount} ready</span>` : ""}
        </button>
      `;
    }).join("");

    return `
      <div class="hub-body hub-body-pack">
        <div class="hub-summary hub-summary-compact">
          <div class="mini-panel"><strong>${escapeHtml(this.player.name)}</strong><br>${escapeHtml(`${this.player.race} ${this.player.className}`)}<div class="mini-panel-note">${escapeHtml(buildSummary.headline)}</div></div>
          <div class="mini-panel burden-panel burden-${burdenUi.state}"><strong>Burden</strong><br><span class="burden-value burden-${burdenUi.state}">${burdenUi.weight} / ${burdenUi.capacity}</span><div class="mini-meter burden burden-${burdenUi.state}"><span style="width:${burdenUi.percent}%"></span></div><span class="mini-panel-note">${escapeHtml(burdenUi.label)}</span></div>
          <div class="mini-panel"><strong>Attack / Armor</strong><br>${this.getAttackValue()} / ${this.getArmorValue()}<div class="mini-panel-note">Guard ${this.getGuardValue()} · Ward ${this.getWardValue()} · ${Math.floor(this.player.gold)} gp</div></div>
        </div>
        <div class="pack-layout">
          <section class="hub-section pack-equipment-panel">
            <div class="panel-title">Equipped Gear</div>
            <div class="pack-equipment-summary">
              <div class="pack-equipment-name">${escapeHtml(this.player.name)}</div>
              <div class="pack-equipment-copy">${escapeHtml(`${buildSummary.note}`)}</div>
              <div class="pack-build-tags">${buildSummary.tags.map((tag) => `<span class="item-chip">${escapeHtml(tag)}</span>`).join("")}</div>
            </div>
            <div class="pack-paperdoll">
              ${paperdoll}
            </div>
            <div class="inventory-detail pack-field-note">
              <strong>Pack Value</strong> ${Math.floor(packValue)} gp<br>
              <strong>Equipped Value</strong> ${Math.floor(equipmentValue)} gp
            </div>
          </section>
          <section class="hub-section pack-inventory-panel">
            <div class="panel-title">Pack Contents</div>
            ${this.getPackFilterMarkup(inventoryModel)}
            <div class="inventory-list-panel pack-list-panel">
              ${this.getInventoryGroupsMarkup(inventoryModel, model.selection.type === "inventory" ? model.selection.value : -1)}
            </div>
          </section>
          ${this.getPackInspectorMarkup(model, inventoryModel)}
        </div>
        ${shopId
          ? `<section class="hub-section inventory-detail pack-field-note"><strong>Shop Context</strong><br>${escapeHtml(this.pendingShop.name)} accepts the highlighted sell tags in this view.</section>`
          : ""}
      </div>
    `;
  }

  getMagicHubMarkup() {
    const pinnedSpellIds = this.getPinnedSpellIds();
    const sortedSpellIds = this.getSortedKnownSpellIds();
    const selectedSpellId = this.targetMode?.spellId || this.pendingSpell || pinnedSpellIds[0] || sortedSpellIds[0] || "";
    const filterDefs = this.getSpellFilterDefsForEntries(sortedSpellIds.map((spellId) => SPELLS[spellId]).filter(Boolean));
    const activeFilter = filterDefs.some((entry) => entry.key === this.activeMagicFilter) ? this.activeMagicFilter : "all";
    const rows = sortedSpellIds.length === 0
      ? `<div class="text-block">No spells are known.</div>`
      : getSpellCategoryDefs().map((category) => {
        if (activeFilter !== "all" && activeFilter !== category.key) {
          return "";
        }
        const spellIds = sortedSpellIds.filter((spellId) => getSpellCategoryKey(SPELLS[spellId]) === category.key);
        if (spellIds.length === 0) {
          return "";
        }
        return `
          <section class="magic-category-group">
            <div class="magic-category-heading">
              <div class="magic-category-title">${escapeHtml(category.label)}</div>
              <div class="magic-category-count">${spellIds.length}</div>
            </div>
            <div class="magic-grid">
              ${spellIds.map((spellId) => {
                const spell = SPELLS[spellId];
                const manaCost = getSpellCost(this, spell);
                const overcast = this.player.mana < manaCost;
                const targetingLabel = this.getSpellTargetingLabel(spell);
                const pinnedIndex = pinnedSpellIds.indexOf(spellId);
                const isPinned = pinnedIndex >= 0;
                const trayFull = pinnedSpellIds.length >= this.getSpellTrayLimit();
                const isSelected = selectedSpellId === spellId;
                const pinLabel = isPinned
                  ? `Tray Slot ${pinnedIndex + 1}`
                  : "Book Only";
                return `
                  <article class="magic-card${isSelected ? " active" : ""}${isPinned ? " pinned" : ""}">
                    <button class="magic-card-select" data-action="spell-select" data-double-action="spell-cast" data-surface="book" data-spell="${spellId}" data-focus-key="${this.getSpellBookFocusKey(spellId)}" type="button">
                      <div class="magic-card-header">
                        <div class="magic-card-title">${escapeHtml(spell.name)}</div>
                        <div class="magic-card-cost${overcast ? " warning" : ""}">${manaCost} mana${overcast ? " / overcast" : ""}</div>
                      </div>
                      <div class="magic-card-tags">
                        <span class="spell-badge accent">${escapeHtml(category.label)}</span>
                        <span class="spell-badge">${escapeHtml(capitalize(spell.school || "spell"))}</span>
                        <span class="spell-badge subtle">${escapeHtml(targetingLabel)}</span>
                      </div>
                      <div class="magic-card-meta">${escapeHtml(`Tier ${spell.tier || 1} | ${capitalize(this.getSpellRoleLabel(spell))} | ${spell.target === "self" ? "Self cast" : `Range ${spell.range || 1}`}`)}</div>
                      <div class="magic-card-copy">${escapeHtml(spell.description)}</div>
                      <div class="magic-card-status">${escapeHtml(isSelected ? `${pinLabel} | Selected` : pinLabel)}</div>
                    </button>
                    <div class="magic-card-actions">
                      <button class="menu-button pack-action-primary" data-action="spell-cast" data-spell="${spellId}" data-focus-key="${this.getSpellCastFocusKey(spellId)}" type="button">Cast</button>
                      <button class="menu-button" data-action="spell-pin-toggle" data-spell="${spellId}" data-focus-key="hub:spell-pin:${spellId}" type="button"${!isPinned && trayFull ? " disabled" : ""}>${isPinned ? "Remove From Tray" : trayFull ? "Tray Full" : "Pin To Tray"}</button>
                      <button class="menu-button" data-action="spell-pin-up" data-spell="${spellId}" data-focus-key="hub:spell-up:${spellId}" type="button"${!isPinned || pinnedIndex === 0 ? " disabled" : ""}>Move Up</button>
                      <button class="menu-button" data-action="spell-pin-down" data-spell="${spellId}" data-focus-key="hub:spell-down:${spellId}" type="button"${!isPinned || pinnedIndex === pinnedSpellIds.length - 1 ? " disabled" : ""}>Move Down</button>
                    </div>
                  </article>
                `;
              }).join("")}
            </div>
          </section>
        `;
      }).join("");

    return `
      <div class="hub-body hub-body-magic">
        <div class="hub-summary hub-summary-compact">
          <div class="mini-panel"><strong>Mana</strong><br>${Math.floor(this.player.mana)} / ${this.player.maxMana}</div>
          <div class="mini-panel"><strong>Known</strong><br>${this.player.spellsKnown.length}</div>
          <div class="mini-panel"><strong>Tray</strong><br>${pinnedSpellIds.length} / ${this.getSpellTrayLimit()}</div>
          <div class="mini-panel"><strong>Casting</strong><br>${this.spellTrayOpen || this.mode === "target" ? "Field tray" : "Book view"}</div>
        </div>
        <section class="hub-section">
          <div class="panel-title">Spell Book</div>
          <div class="text-block magic-intro">Single-click selects a spell. Double-click or Cast starts it immediately. Spells are grouped by job so travel, identify, defense, and offense tools stay easy to scan on a phone. The field tray only shows pinned quick casts, so manage those tray slots here.</div>
          ${this.getSpellFilterChipsMarkup(activeFilter, "magic-filter", (key) => this.getMagicFilterFocusKey(key), "magic-filter-row", filterDefs)}
          <div class="magic-category-list">${rows}</div>
        </section>
      </div>
    `;
  }

  getJournalHubMarkup() {
    const activeSection = this.getResolvedJournalSection();
    const townCycle = this.getTownCycleState();
    const reactions = this.getTownReactionLines();
    const milestoneSummary = this.getQuestMilestoneSummary();
    const milestoneJournal = this.getActiveMilestoneJournalText();
    const currentChapter = this.getCurrentChapterObjective();
    const activeBriefing = this.getActiveBriefingText();
    const discoverySummary = this.getKnownDiscoveryLines();
    const namedLootSummary = this.getNamedLootLines();
    const roomEvent = this.currentLevel?.roomEvents?.[0] || null;
    const featuredStockSummary = Object.entries(townCycle.featuredStock || {})
      .map(([shopId, itemIds]) => {
        const label = SHOPS[shopId]?.name;
        const names = (itemIds || []).map((itemId) => ITEM_DEFS[itemId]?.name).filter(Boolean).join(", ");
        return label && names ? `${label}: ${names}` : "";
      })
      .filter(Boolean)
      .join(" | ");
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
    const telemetrySummary = this.getTelemetrySummary();
    const telemetryReview = this.getTelemetryReviewSnapshot();
    const latestSummary = (this.runSummaryHistory || []).at(-1) || this.lastRunSummary;
    const activeContract = this.getActiveContract(true) || this.getActiveContract(false);
    const masterySummary = this.getClassMasterySummary(this.player.classId);
    const archiveMarkup = this.getRunSummaryArchiveMarkup(3);
    const masteryMarkup = this.getMasteryReviewMarkup(this.player.classId);
    const contractMarkup = this.getContractReviewMarkup({ interactive: false });
    const metaReview = telemetryReview.meta || {};
    const telemetryRecent = telemetryReview.recentEvents.length > 0
      ? telemetryReview.recentEvents.map((entry) => `<div class="log-line">[T${entry.turn} D${entry.depth}] ${escapeHtml(entry.text)}</div>`).join("")
      : "<div class='muted'>No run telemetry captured yet.</div>";
    const sectionButtons = this.getJournalSectionDefs().map((section) => `
      <button class="hub-filter-chip${section.id === activeSection ? " active" : ""}" data-action="journal-section" data-section="${section.id}" data-focus-key="${this.getJournalSectionFocusKey(section.id)}" type="button">${section.label}</button>
    `).join("");
    const townStateLine = this.currentDepth === 0
      ? `${this.getTownCycleLabel()} | ${townCycle.stockSummary}`
      : `Deepest ${this.player.deepestDepth} | ${this.currentLevel?.encounterSummary || "The floor is still quiet enough to read."}`;
    const buildLine = buildSummary.length > 0
      ? buildSummary.join(", ")
      : "No perks or relics claimed yet.";
    const currentSectionMarkup = `
      <div class="field-guide-layout">
        <section class="hub-section">
          <div class="panel-title">Current Floor</div>
          <div class="text-block">
            <strong>${escapeHtml(this.currentLevel.description)}</strong><br><br>
            ${escapeHtml(objectiveText)}<br><br>
            ${escapeHtml(optionalText || questState)}
          </div>
          <div class="modal-actions utility-row">
            <button class="menu-button" data-action="open-hub" data-tab="pack" data-focus-key="journal:pack" type="button">Pack</button>
            <button class="menu-button" data-action="open-hub" data-tab="magic" data-focus-key="journal:magic" type="button">Magic</button>
            <button class="menu-button" data-action="view-map" data-focus-key="journal:map" type="button">Floor Map</button>
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Pressure</div>
          <div class="text-block">
            ${escapeHtml(dangerText)}<br><br>
            ${escapeHtml(this.currentLevel?.encounterSummary || "The floor is still quiet enough to read.")}
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Run Build</div>
          <div class="text-block">
            ${escapeHtml(buildLine)}<br><br>
            ${escapeHtml(getObjectiveRewardPreview(this.currentLevel) || "No objective reward preview available.")}
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">${this.currentDepth === 0 ? "Town State" : "Run State"}</div>
          <div class="text-block">
            ${escapeHtml(townStateLine)}<br><br>
            ${escapeHtml(milestoneSummary)}
            ${roomEvent ? `<br><br>${escapeHtml(`Signature room: ${roomEvent.label}. ${roomEvent.summary}`)}` : ""}
          </div>
        </section>
      </div>
    `;
    const missionSectionMarkup = `
      <div class="field-guide-layout">
        <section class="hub-section">
          <div class="panel-title">Mission Brief</div>
          <div class="text-block">
            <strong>${escapeHtml(currentChapter)}</strong><br><br>
            ${escapeHtml(activeBriefing)}
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Objective Path</div>
          <div class="text-block">
            ${escapeHtml(milestoneJournal)}<br><br>
            ${escapeHtml(questState)}
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Reward Stakes</div>
          <div class="text-block">
            ${escapeHtml(getObjectiveRewardPreview(this.currentLevel) || "No floor reward preview available.")}<br><br>
            ${latestSummary
              ? escapeHtml(`Last return: depth ${latestSummary.extractedDepth}, ${latestSummary.greedCount} greed room${latestSummary.greedCount === 1 ? "" : "s"}, ${latestSummary.returnValue} gp banked or carried.`)
              : "No banked return summary yet."}
          </div>
        </section>
      </div>
    `;
    const guideSectionMarkup = `
      <div class="field-guide-layout">
        <section class="hub-section help-panel">
          <div class="panel-title">Core Loop</div>
          <div class="text-block">
            Start in town, prep the build, enter the keep, clear the floor objective, then decide whether to extract or push deeper.
          </div>
        </section>
        <section class="hub-section help-panel">
          <div class="panel-title">Where Info Lives</div>
          <div class="text-block">
            HUD handles tactical-now status. Pack handles gear and burden. Magic handles tray management and casting. Field Guide holds mission, rules, and run history.
          </div>
        </section>
        <section class="hub-section help-panel">
          <div class="panel-title">Controls</div>
          <ul class="help-list">
            <li><strong>Keyboard:</strong> Arrows or numpad move. F searches. U uses. I opens pack. S opens magic. M opens the map. R rests. Shift+R sleeps until restored.</li>
            <li><strong>Controller:</strong> D-pad or left stick moves. A confirms or uses. B backs out of targeting and menus. X triggers the alternate action. Y opens pack. Start opens the run menu. Back toggles the map. LB or RB switch tabs. RT or the right stick scrolls long lists.</li>
            <li><strong>Touch:</strong> Use the on-screen pad for fallback movement and the dock for your main actions.</li>
          </ul>
        </section>
        <section class="hub-section help-panel">
          <div class="panel-title">Dungeon Rules</div>
          <ul class="help-list">
            <li>Search reveals hidden doors, traps, and better routes.</li>
            <li>Heavy burden lowers dodge and lets monsters press harder.</li>
            <li>Targeted spells and wands need line of sight.</li>
            <li>Resting and sleeping are noisy, and sleep breaks when a monster enters view.</li>
            <li>Enemy intent icons warn about rushes, ranged shots, summons, and other dangerous turns before they land.</li>
          </ul>
        </section>
      </div>
    `;
    const chronicleSectionMarkup = `
      <div class="field-guide-layout">
        <section class="hub-section">
          <div class="panel-title">Discoveries</div>
          <div class="text-block">
            ${discoverySummary.length > 0
              ? discoverySummary.map((line) => escapeHtml(line)).join("<br><br>")
              : "No written fragments recovered yet."}
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Town Cycle</div>
          <div class="text-block">
            ${escapeHtml(this.getTownCycleLabel())}<br><br>
            ${escapeHtml(townCycle.turnsUntilRefresh === 1 ? "Next market turnover in 1 turn." : `Next market turnover in ${townCycle.turnsUntilRefresh} turns.`)}<br><br>
            ${escapeHtml(townCycle.stockSummary)}<br>
            ${escapeHtml(townCycle.rumorSummary)}<br><br>
            ${escapeHtml(featuredStockSummary || "No featured market picks are posted yet.")}
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Town Reactions</div>
          <div class="text-block">
            ${reactions.lines.length > 0
              ? reactions.lines.slice(0, 4).map((line) => escapeHtml(line)).join("<br><br>")
              : "The town has not shifted around your run yet."}
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Named Loot</div>
          <div class="text-block">
            ${namedLootSummary.length > 0
              ? namedLootSummary.map((line) => escapeHtml(line)).join("<br>")
              : "No signature finds claimed yet."}
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Town Persistence</div>
          <div class="text-block">
            ${escapeHtml(activeContract ? `Active contract: ${activeContract.name}. Town Persistence, opt-in, next run only.` : "No contract armed for the next run.")}<br><br>
            ${escapeHtml(masterySummary)}<br><br>
            ${escapeHtml(`Contract adoption: ${Math.round((metaReview.armedRunStartRate || 0) * 100)}% of tracked runs started armed. Most armed: ${metaReview.mostArmedContract || "none yet"}.`)}
          </div>
          ${contractMarkup}
          <div class="section-block">
            <div class="field-label">Current Class Mastery</div>
            ${masteryMarkup}
          </div>
          <div class="section-block">
            <div class="field-label">Latest 3 Returns</div>
            ${archiveMarkup}
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Chronicle</div>
          <div class="message-log journal-log">${renderChronicleMarkup(this, 12)}</div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Run Telemetry</div>
          <div class="text-block">
            ${escapeHtml(`Events ${telemetrySummary.eventCount} | Searches ${telemetrySummary.searches} | Buys ${telemetrySummary.shopBuys} | Sells ${telemetrySummary.shopSells} | Spells ${telemetrySummary.spellsCast} | Items ${telemetrySummary.itemsUsed} | Returns ${telemetrySummary.townReturns}`)}<br><br>
            ${escapeHtml(latestSummary
              ? `Latest summary: ${latestSummary.outcome} | first objective ${latestSummary.firstObjectiveType || "unknown"} | clear turn ${latestSummary.firstObjectiveClearTurn ?? "?"} | greed ${latestSummary.greedCount}`
              : "No extraction or death summary recorded yet.")}
          </div>
          <div class="message-log journal-log">${telemetryRecent}</div>
        </section>
      </div>
    `;
    const activeSectionMarkup = activeSection === "mission"
      ? missionSectionMarkup
      : activeSection === "guide"
        ? guideSectionMarkup
        : activeSection === "chronicle"
          ? chronicleSectionMarkup
          : currentSectionMarkup;

    return `
      <div class="hub-body field-guide-body">
        <div class="hub-summary hub-summary-compact">
          <div class="mini-panel"><strong>Depth</strong><br>${this.currentDepth}</div>
          <div class="mini-panel"><strong>Turn</strong><br>${this.turn}</div>
          <div class="mini-panel"><strong>Objective</strong><br>${escapeHtml(objectiveText)}</div>
          <div class="mini-panel"><strong>Pressure</strong><br>${escapeHtml(this.dangerLevel)}</div>
        </div>
        <section class="hub-section field-guide-kicker">
          <div class="panel-title">Field Guide</div>
          <div class="text-block">One support surface for the current floor, mission context, rules reference, and the long-form run record.</div>
        </section>
        <div class="pack-filter-row journal-section-row">
          ${sectionButtons}
        </div>
        ${activeSectionMarkup}
      </div>
    `;
  }

  showHubModal(defaultTab = "pack", options = {}) {
    if (!this.player) {
      return;
    }
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
    this.recordTelemetry(this.activeHubTab === "magic"
      ? "magic_opened"
      : this.activeHubTab === "journal"
        ? "journal_opened"
        : "pack_opened");
    if (this.activeHubTab === "pack") {
      this.setPackSelection(selection || this.activePackSelection || this.getDefaultPackSelection());
      this.resolvePackSelection();
    } else {
      this.hoveredPackSelection = null;
    }

    const tabMarkup = this.getHubTabsMarkup(this.activeHubTab);
    const bodyMarkup = this.activeHubTab === "magic"
      ? this.getMagicHubMarkup()
      : this.activeHubTab === "journal"
        ? this.getJournalHubMarkup()
        : this.getPackHubMarkup();

    const title = this.activeHubTab === "magic"
      ? "Magic"
      : this.activeHubTab === "journal"
        ? "Field Guide"
        : "Pack & Equipment";

    this.showSimpleModal(title, `
      <div class="hub-window hub-window-${this.activeHubTab}">
        ${tabMarkup}
        ${bodyMarkup}
      </div>
    `, {
      surfaceKey: `hub:${this.activeHubTab}`,
      preserveScroll,
      focusTarget,
      fallbackFocus
    });
  }

  showInventoryModal() {
    this.showHubModal("pack");
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

  showShopModal(shopId, shop, options = {}) {
    const {
      preserveScroll = false,
      focusTarget = null,
      fallbackFocus = true,
      panel = null
    } = options;
    this.mode = "modal";
    const previousShopId = this.pendingShop?.id || "";
    this.pendingShop = { ...shop, id: shopId };
    this.pendingService = null;
    this.activeShopPanel = panel || (previousShopId === shopId ? this.activeShopPanel : "buy");
    const townCycle = this.getTownCycleState();
    const reactions = this.getTownReactionLines(shopId);
    const returnSting = this.getTownReturnStingText();
    const turnoverLabel = townCycle.turnsUntilRefresh === 1 ? "1 turn" : `${townCycle.turnsUntilRefresh} turns`;
    const state = this.shopState[shopId] || { stock: [...shop.stock], buyback: [] };
    const liveStock = [...state.stock, ...state.buyback];
    const featuredToday = (townCycle.featuredStock?.[shopId] || [])
      .map((itemId) => ITEM_DEFS[itemId]?.name)
      .filter(Boolean)
      .join(", ");
    const stockEntries = liveStock.map((itemId) => {
      const item = createTownItem(itemId);
      const semanticEntry = buildInventoryItemSemantics(this, item, -1, { shopId });
      return {
        itemId,
        item,
        semanticEntry,
        price: getShopBuyPrice(this, item, shopId)
      };
    });
    const stockGroups = this.groupShopEntriesByCategory(stockEntries, (entry) => entry.semanticEntry.categoryKey);
    const stockRows = stockEntries.length === 0
      ? `<div class="text-block muted">The shelves are empty. Fresh stock arrives in ${escapeHtml(turnoverLabel)}.</div>`
      : stockGroups.map((group) => `
        <div class="shop-sell-group">
          <div class="field-label">${escapeHtml(group.label)}</div>
          ${group.entries.map((entry) => `
            <div class="shop-row">
              <div>
                <div><strong>${escapeHtml(getItemName(entry.item, true))}</strong> <span class="muted">${entry.price} gp</span></div>
                <div class="muted">${escapeHtml(describeItem(entry.item))}</div>
                ${this.getPackRowTagMarkup(entry.semanticEntry)}
              </div>
              <div class="actions">
                <button class="tiny-button" data-action="shop-buy" data-shop="${shopId}" data-item="${entry.itemId}" data-focus-key="${this.getShopBuyFocusKey(shopId, entry.itemId)}" type="button"${this.player.gold < entry.price ? " disabled" : ""}>Buy</button>
              </div>
            </div>
          `).join("")}
        </div>
      `).join("");

    const sellModel = buildInventoryPresentationModel(this, {
      filter: "sell",
      selectedIndex: this.activePackSelection?.type === "inventory" ? this.activePackSelection.value : -1,
      shopId
    });
    const markedSellEntries = this.player.inventory.filter((item) => item?.markedForSale && (shopId === "junk" || shopAcceptsItem(shopId, item)));
    const markedSellValue = markedSellEntries.reduce((sum, item) => sum + getShopSellPrice(this, item, shopId), 0);
    const sellEntries = sellModel.groups.flatMap((group) => group.sections.flatMap((section) => section.items));
    const sellGroups = this.groupShopEntriesByCategory(sellEntries, (entry) => entry.categoryKey);
    const sellRows = sellModel.visibleCount === 0
      ? `<div class="text-block">Nothing here matches what this shop buys.</div>`
      : sellGroups.map((group) => `
        <div class="shop-sell-group">
          <div class="field-label">${escapeHtml(group.label)}</div>
          ${group.entries.map((entry) => `
            <div class="shop-row">
              <div>
                <div><strong>${escapeHtml(getItemName(entry.item))}</strong>${entry.count > 1 ? ` <span class="muted">x${entry.count}</span>` : ""} <span class="muted">${getShopSellPrice(this, entry.item, shopId)} gp</span></div>
                <div class="muted">${escapeHtml(entry.reason)}</div>
                ${this.getPackRowTagMarkup(entry)}
                <div class="muted">${escapeHtml(this.getPackItemNote(entry.item, entry))}</div>
              </div>
              <div class="actions">
                <label class="mark-sale-toggle">
                  <input type="checkbox" data-action="toggle-sale-mark" data-index="${entry.index}" data-shop-sell-row="true" data-focus-key="${this.getShopSellFocusKey(entry.index)}:mark" ${entry.item.markedForSale ? "checked" : ""}>
                  <span>Mark</span>
                </label>
                <button class="tiny-button" data-action="shop-sell" data-index="${entry.index}" data-focus-key="${this.getShopSellFocusKey(entry.index)}" type="button">Sell</button>
              </div>
            </div>
          `).join("")}
        </div>
      `).join("");
    const panelTabs = this.getShopPanelTabsMarkup(this.activeShopPanel);
    const panelBody = this.activeShopPanel === "sell"
      ? `
        <div class="section-block">
          <div class="field-label">Sell</div>
          <div class="modal-actions utility-row">
            <button class="menu-button" data-action="shop-sell-marked" data-focus-key="shop:sell-marked" type="button"${markedSellEntries.length === 0 ? " disabled" : ""}>Sell Marked${markedSellEntries.length > 0 ? ` (${markedSellEntries.length})` : ""}</button>
            <button class="menu-button" data-action="open-hub" data-tab="pack" data-filter="sell" data-focus-key="shop:review-pack" type="button">Review Pack</button>
          </div>
          <div class="text-block muted">${escapeHtml(markedSellEntries.length > 0 ? `${markedSellEntries.length} marked item${markedSellEntries.length === 1 ? "" : "s"} will sell here for ${markedSellValue} gp.` : "Use the checkboxes to mark items, then sell the whole marked bundle here.")}</div>
          ${sellRows}
        </div>
      `
      : `
        <div class="section-block">
          <div class="field-label">Buy</div>
          ${stockRows}
        </div>
      `;

    this.showSimpleModal(`${shop.name}`, `
      <div class="section-block text-block">${escapeHtml(shop.greeting)}</div>
      <div class="section-block">
        <div class="stat-line"><span>Your gold</span><strong>${Math.floor(this.player.gold)} gp</strong></div>
        <div class="stat-line"><span>Town cycle</span><strong>${escapeHtml(this.getTownCycleLabel())}</strong></div>
        <div class="stat-line"><span>Stock turnover</span><strong>${escapeHtml(turnoverLabel)}</strong></div>
        <div class="stat-line"><span>Phase note</span><strong>${escapeHtml(townCycle.stockSummary)}</strong></div>
        <div class="stat-line"><span>Featured today</span><strong>${escapeHtml(featuredToday || "No special picks")}</strong></div>
        <div class="stat-line"><span>Reaction tags</span><strong>${escapeHtml(reactions.stockTags.join(", ") || "None")}</strong></div>
      </div>
      ${reactions.lines.length > 0 ? `
        <div class="section-block text-block">${escapeHtml(reactions.lines[0])}</div>
      ` : ""}
      ${returnSting ? `<div class="section-block text-block muted">${escapeHtml(returnSting)}</div>` : ""}
      ${panelTabs}
      ${panelBody}
    `, {
      surfaceKey: `shop:${shopId}`,
      preserveScroll,
      focusTarget,
      fallbackFocus
    });
  }

  showTempleModal(options = {}) {
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
    this.showSimpleModal("Temple", `
      <div class="section-block text-block">${escapeHtml(STORY_NPCS.templeKeeper.name)}, ${escapeHtml(STORY_NPCS.templeKeeper.title)}, offers healing, restoration, and the expensive correction of cursed mistakes.</div>
      <div class="section-block">
        <div class="stat-line"><span>Your gold</span><strong>${Math.floor(this.player.gold)} gp</strong></div>
        <div class="stat-line"><span>Town cycle</span><strong>${escapeHtml(this.getTownCycleLabel())}</strong></div>
        <div class="stat-line"><span>Phase note</span><strong>${escapeHtml(townCycle.stockSummary)}</strong></div>
      </div>
      ${reactions.lines.length > 0 ? `<div class="section-block text-block">${escapeHtml(reactions.lines[0])}</div>` : ""}
      ${returnSting ? `<div class="section-block text-block muted">${escapeHtml(returnSting)}</div>` : ""}
      ${TEMPLE_SERVICES.map((service) => `
        <div class="shop-row">
          <div>
            <div><strong>${escapeHtml(service.name)}</strong> <span class="muted">${getTemplePrice(this, service.price)} gp</span></div>
            <div class="muted">${escapeHtml(service.description)}</div>
          </div>
          <div class="actions">
            <button class="tiny-button" data-action="service-use" data-service="${service.id}" data-focus-key="${this.getServiceFocusKey("temple", service.id)}" type="button">Use</button>
          </div>
        </div>
      `).join("")}
    `, {
      surfaceKey: "temple",
      preserveScroll,
      focusTarget,
      fallbackFocus
    });
  }

  showSageModal(options = {}) {
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
      <div class="section-block text-block">${escapeHtml(STORY_NPCS.guildSage.name)} identifies your mysterious belongings for a flat fee and keeps the old warding records close at hand.</div>
      <div class="section-block">
        <div class="stat-line"><span>Your gold</span><strong>${Math.floor(this.player.gold)} gp</strong></div>
        <div class="stat-line"><span>Unknown items</span><strong>${unknownCount}</strong></div>
        <div class="stat-line"><span>Price</span><strong>${sagePrice} gp</strong></div>
        <div class="stat-line"><span>Town cycle</span><strong>${escapeHtml(this.getTownCycleLabel())}</strong></div>
        <div class="stat-line"><span>Phase note</span><strong>${escapeHtml(townCycle.rumorSummary)}</strong></div>
      </div>
      ${reactions.lines.length > 0 ? `<div class="section-block text-block">${escapeHtml(reactions.lines[0])}</div>` : ""}
      ${returnSting ? `<div class="section-block text-block muted">${escapeHtml(returnSting)}</div>` : ""}
      <div class="modal-actions">
        <button class="menu-button" data-action="service-use" data-service="identifyAll" data-focus-key="${this.getServiceFocusKey("sage", "identifyAll")}" type="button">Identify</button>
        <button class="menu-button" data-action="close-modal" data-focus-key="sage:close" type="button">Close</button>
      </div>
    `, {
      surfaceKey: "sage",
      preserveScroll,
      focusTarget,
      fallbackFocus
    });
  }

  showBankModal(options = {}) {
    const {
      preserveScroll = false,
      focusTarget = null,
      fallbackFocus = true
    } = options;
    this.mode = "modal";
    this.storyFlags.postReturnBankPrompt = false;
    ensureTownMetaState(this);
    this.recordTelemetry("bank_persistence_viewed", {
      activeContractId: this.getActiveContract(false)?.id || ""
    });
    this.recordTelemetry("mastery_viewed", {
      classId: this.player?.classId || ""
    });
    const townCycle = this.getTownCycleState();
    const reactions = this.getTownReactionLines("bank");
    const returnSting = this.getTownReturnStingText();
    const investmentPreview = {
      supply_cache: "Next refresh: provisioner adds another emergency tool.",
      guild_license: "Next refresh: guild stock opens deeper books and charged tools.",
      temple_favors: "Now: temple prices drop. Later: blood altars, oath shrines, and pilgrim pools can appear below.",
      archive_maps: "Next intel pull gets cheaper and cursed caches can start appearing.",
      ghost_bargains: "Future floors can roll ghost merchants.",
      deep_contracts: "Future floors can roll vault rooms and stronger reward tables."
    };
    const unlockRows = getAvailableTownUnlocks(this).slice(0, 3).map((unlockDef) => `
      <div class="shop-row">
        <div>
          <div><strong>${escapeHtml(unlockDef.name)}</strong> <span class="muted">${unlockDef.cost} gp</span></div>
          <div class="muted">${escapeHtml(unlockDef.description)}</div>
          <div class="muted">${escapeHtml(investmentPreview[unlockDef.id] || "Improves the next few descents for this adventurer.")}</div>
        </div>
        <div class="actions">
          <button class="tiny-button" data-action="town-unlock" data-unlock="${unlockDef.id}" data-focus-key="${this.getTownUnlockFocusKey(unlockDef.id)}" type="button"${this.player.gold < unlockDef.cost ? " disabled" : ""}>Fund</button>
        </div>
      </div>
    `).join("");
    const intel = getTownIntel(this);
    const townMeta = this.getTownMetaSummary();
    const masterySummary = this.getClassMasterySummary(this.player?.classId);
    const latestSummary = (this.runSummaryHistory || []).at(-1) || this.lastRunSummary;
    const contractModel = this.getContractViewModel();
    const masteryMarkup = this.getMasteryReviewMarkup(this.player?.classId);
    const archiveMarkup = this.getRunSummaryArchiveMarkup(5);
    const featuredStockSummary = Object.entries(intel.featuredStock || {})
      .map(([shopId, itemIds]) => {
        const label = SHOPS[shopId]?.name;
        const names = (itemIds || []).map((itemId) => ITEM_DEFS[itemId]?.name).filter(Boolean).join(", ");
        return label && names ? `${label}: ${names}` : "";
      })
      .filter(Boolean)
      .join(" | ");
    const nextRumor = intel.nextRumor
      ? `<div class="text-block">${escapeHtml(intel.nextRumor.text)}</div>`
      : `<div class="text-block muted">No clear rumor about the next floor yet.</div>`;
    const knownRumors = intel.known.length > 0
      ? intel.known.map((rumor) => `<div class="log-line">${escapeHtml(rumor.text)}</div>`).join("")
      : "<div class='muted'>No secured rumors yet.</div>";
    const prepAdvice = this.getTownPrepAdvice();
    const nextRunIntent = this.getNextRunIntent(this.player?.classId);
    const carryForward = this.getTownCarryForwardSummary();
    const recommendedText = contractModel.recommendedId
      ? `Recommended next run: ${contractModel.all.find((contract) => contract.id === contractModel.recommendedId)?.name || contractModel.recommendedId}. ${contractModel.recommendedReason}`
      : "No contract recommendation available.";
    const recommendedTownActionButton = townMeta.recommendedActionId === "contract_recommended"
      ? `<button class="menu-button primary" data-action="contract-arm-recommended" data-focus-key="bank:recommended-contract" type="button">${escapeHtml(townMeta.recommendedActionLabel)}</button>`
      : townMeta.recommendedActionId?.startsWith("town_unlock:")
        ? `<button class="menu-button primary" data-action="town-unlock" data-unlock="${townMeta.recommendedActionId.split(":")[1]}" data-focus-key="bank:recommended-unlock" type="button"${this.player.gold < (townMeta.nextUnlock?.cost || 0) ? " disabled" : ""}>${escapeHtml(townMeta.recommendedActionLabel)}</button>`
        : townMeta.recommendedActionId === "town_rumor"
          ? `<button class="menu-button primary" data-action="town-rumor" data-focus-key="bank:recommended-rumor" type="button">${escapeHtml(townMeta.recommendedActionLabel)}</button>`
          : townMeta.recommendedActionId === "bank_withdraw"
            ? `<button class="menu-button primary" data-action="bank-withdraw" data-focus-key="bank:recommended-withdraw" type="button">${escapeHtml(townMeta.recommendedActionLabel)}</button>`
            : townMeta.recommendedActionId === "bank_deposit"
              ? `<button class="menu-button primary" data-action="bank-deposit" data-focus-key="bank:recommended-deposit" type="button">${escapeHtml(townMeta.recommendedActionLabel)}</button>`
              : "";
    this.showSimpleModal("Bank", `
      <div class="section-block text-block">${escapeHtml(STORY_NPCS.chronicler.name)} keeps the ledgers while ${escapeHtml(STORY_NPCS.steward.name)} turns banked gold into safer carry, forward intel, and funded leverage for this adventurer.</div>
      <div class="section-block text-block">
        Bank gold for safety on the next descent.<br>
        Buy intel to learn the next floor before you walk into it.<br>
        Fund projects to improve stock and encounters for this current campaign.<br>
        Contracts stay opt-in and apply to the next run only.
      </div>
      <div class="section-block">
        <div class="field-label">Next Run Prep</div>
        <div class="stat-line"><span>On Hand</span><strong>${Math.floor(this.player.gold)} gp</strong></div>
        <div class="stat-line"><span>On Account</span><strong>${Math.floor(this.player.bankGold)} gp</strong></div>
        <div class="stat-line"><span>Rumor Tokens</span><strong>${this.player.runCurrencies?.rumorTokens || 0}</strong></div>
        <div class="stat-line"><span>Town Cycle</span><strong>${escapeHtml(this.getTownCycleLabel())}</strong></div>
        <div class="stat-line"><span>Next Turnover</span><strong>${escapeHtml(townCycle.turnsUntilRefresh === 1 ? "1 turn" : `${townCycle.turnsUntilRefresh} turns`)}</strong></div>
        <div class="stat-line"><span>Phase note</span><strong>${escapeHtml(townCycle.rumorSummary)}</strong></div>
      </div>
      ${reactions.lines.length > 0 ? `<div class="section-block text-block">${escapeHtml(reactions.lines[0])}</div>` : ""}
      ${returnSting ? `<div class="section-block text-block muted">${escapeHtml(returnSting)}</div>` : ""}
      <div class="section-block text-block">${escapeHtml(prepAdvice)}</div>
      <div class="section-block">
        <div class="field-label">One More Run</div>
        <div class="text-block">${nextRunIntent.motivators.map((entry) => escapeHtml(`${entry.label} ${entry.detail}`)).join("<br><br>")}</div>
      </div>
      <div class="section-block">
        <div class="field-label">Recommended Next Action</div>
        <div class="text-block">
          ${escapeHtml(townMeta.recommendedAction)}<br><br>
          ${escapeHtml(townMeta.recommendedReason)}
        </div>
        ${recommendedTownActionButton ? `<div class="modal-actions inline-modal-actions">${recommendedTownActionButton}</div>` : ""}
      </div>
      <div class="modal-actions">
        <button class="menu-button" data-action="bank-deposit" data-focus-key="${this.getTownActionFocusKey("deposit")}" type="button">Deposit 100</button>
        <button class="menu-button" data-action="bank-withdraw" data-focus-key="${this.getTownActionFocusKey("withdraw")}" type="button">Withdraw 100</button>
        <button class="menu-button" data-action="town-rumor" data-focus-key="${this.getTownActionFocusKey("rumor")}" type="button">Buy Intel (${getRumorPrice(this)} gp)</button>
        <button class="menu-button" data-action="close-modal" data-focus-key="bank:close" type="button">Close</button>
      </div>
      <div class="section-block">
        <div class="text-block">${escapeHtml(recommendedText)}</div><br>
        <div class="text-block muted">${escapeHtml(carryForward)}</div><br>
        <div class="field-label">Next Floor Intel</div>
        ${nextRumor}
      </div>
      <div class="section-block">
        <div class="field-label">Featured Market Picks</div>
        <div class="text-block">${escapeHtml(featuredStockSummary || "No featured wares are posted for this cycle.")}</div>
      </div>
      <div class="section-block">
        <div class="field-label">Investments</div>
        ${unlockRows || "<div class='text-block muted'>All current town investments are funded.</div>"}
      </div>
      <div class="section-block">
        <div class="field-label">Contracts</div>
        <div class="text-block">
          Town Persistence. Opt-in. Applies to next run only.
        </div>
        ${this.getContractReviewMarkup()}
      </div>
      <div class="section-block">
        <div class="field-label">Mastery</div>
        <div class="text-block">
          ${escapeHtml(`Class-based. Permanent. Finite ranks. ${masterySummary}`)}
        </div>
        ${masteryMarkup}
      </div>
      <div class="section-block">
        <div class="field-label">Return Archive</div>
        ${archiveMarkup}
      </div>
      <div class="section-block">
        <div class="field-label">Rumor Archive</div>
        <div class="message-log journal-log">${knownRumors}</div>
      </div>
    `, {
      surfaceKey: "bank",
      preserveScroll,
      focusTarget,
      fallbackFocus
    });
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

  showSaveSlotsModal(mode = "load", options = {}) {
    const { preserveScroll = false, focusTarget = null } = options;
    const hasAnySave = this.getAllSavedRunMeta().some((entry) => Boolean(entry.meta));
    const latestMeta = this.getSavedRunMeta();
    const resolvedFocus = focusTarget
      || (mode === "save"
        ? `save-slots:save:${this.activeSaveSlotId || 1}`
        : latestMeta
          ? `save-slots:load:${latestMeta.slotId}`
          : null);
    const intro = mode === "save"
      ? (this.player ? "Choose a slot for this run. Existing slots can be overwritten." : "No active run is available to save.")
      : (hasAnySave ? "Choose which save slot to continue from." : "No saved runs are available yet.");
    const musicControls = !this.player ? `
      <div class="save-slot-music-banner">
        <div class="title-audio-copy">
          <div class="title-audio-label">Title Theme</div>
          <div class="title-audio-note" data-role="title-music-note"></div>
        </div>
        <button class="action-button title-audio-toggle" data-action="toggle-music" data-role="title-music-toggle" data-focus-key="save-slots:music" type="button">${escapeHtml(this.getMusicToggleLabel())}</button>
      </div>
    ` : "";
    this.mode = "modal";
    this.showSimpleModal(mode === "save" ? "Save Slots" : "Continue Run", `
      <div class="section-block text-block">${escapeHtml(intro)}</div>
      ${musicControls}
      <div class="save-slot-modal">
        ${this.getSaveSlotSummaryMarkup({
          action: mode,
          actionLabel: mode === "save" ? "Save Here" : "Continue",
          buttonClass: "menu-button",
          focusPrefix: `save-slots:${mode}`
        })}
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
          <li><strong>Keyboard:</strong> Arrows or numpad move. F searches. U uses. I opens pack. S opens magic. M opens the map. R rests. Shift+R sleeps until restored.</li>
          <li><strong>Controller:</strong> D-pad or left stick moves. A confirms or uses. B backs out of targeting and menus. X triggers the alternate action. Y opens pack. Start opens the run menu. Back toggles the map. LB or RB switch tabs. RT or the right stick scrolls long lists.</li>
          <li><strong>Touch:</strong> Use the on-screen pad for fallback movement and the dock for your main actions.</li>
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

  showUtilityMenu(options = {}) {
    const {
      focusTarget = null,
      openerFocusKey = undefined
    } = options;
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
    const savedMeta = this.getSavedRunMeta();
    const savedSlots = this.getAllSavedRunMeta();
    const hasSavedRun = savedSlots.some((entry) => Boolean(entry.meta));
    const connected = this.gamepadInput.isConnected();
    const utilityRunSummary = fragment.getElementById("utility-run-summary");
    const utilitySaveSummary = fragment.getElementById("utility-save-summary");
    const utilityControlSummary = fragment.getElementById("utility-control-summary");
    const utilitySaveButton = fragment.getElementById("utility-save-button");
    const utilityLoadButton = fragment.getElementById("utility-load-button");
    const utilityStatsButton = fragment.getElementById("utility-stats-button");
    const activeContract = this.getActiveContract(true) || this.getActiveContract(false);
    const latestSummary = this.getLatestPersistenceSummary();
    const latestUnlock = this.getLatestPermanentUnlock();

    if (utilityRunSummary) {
      utilityRunSummary.innerHTML = this.player
        ? `
          <div class="utility-menu-title">${escapeHtml(this.player.name)} &middot; ${escapeHtml(this.currentDepth === 0 ? "Town" : `Depth ${this.currentDepth}`)}</div>
          <div class="utility-menu-meta">${escapeHtml(this.currentLevel?.description || "Run in progress.")}</div>
          <div class="utility-menu-meta">${escapeHtml(activeContract ? `Active contract: ${activeContract.name}` : "Active contract: none armed")}</div>
        `
        : `
          <div class="utility-menu-title">No active run</div>
          <div class="utility-menu-meta">Start a new adventurer to begin a descent.</div>
          <div class="utility-menu-meta">${escapeHtml(activeContract ? `Active contract: ${activeContract.name}` : "Active contract: none armed")}</div>
        `;
    }

    if (utilitySaveSummary) {
      if (!savedMeta) {
        utilitySaveSummary.innerHTML = `
          <div class="utility-menu-title">No saved run</div>
          <div class="utility-menu-meta">Save slots appear here once you bank a run.</div>
          <div class="utility-menu-meta">${escapeHtml(latestSummary ? `Latest return: ${latestSummary.outcome} depth ${latestSummary.extractedDepth}, ${latestSummary.returnValue} gp value.` : "Latest return: none recorded yet.")}</div>
          <div class="utility-menu-meta">${escapeHtml(latestUnlock ? `Latest permanent unlock: ${latestUnlock}` : "Latest permanent unlock: none yet.")}</div>
          ${this.getSaveSlotSummaryMarkup({
            action: "load",
            actionLabel: "Load",
            focusPrefix: "utility:load-slot"
          })}
        `;
      } else {
        const timeLabel = savedMeta.savedAt ? this.formatSaveStamp(savedMeta.savedAt) : null;
        utilitySaveSummary.innerHTML = `
          <div class="utility-menu-title">${escapeHtml(savedMeta.name)}</div>
          <div class="utility-menu-meta">${escapeHtml(this.getSaveSlotLabel(savedMeta.slotId || 1))} &middot; ${escapeHtml(`Level ${savedMeta.level} | Depth ${savedMeta.depth}`)}</div>
          ${timeLabel ? `<div class="utility-menu-meta">${escapeHtml(timeLabel)}</div>` : ""}
          <div class="utility-menu-meta">${escapeHtml(latestSummary ? `Latest return: ${latestSummary.outcome} depth ${latestSummary.extractedDepth}, ${latestSummary.returnValue} gp value.` : "Latest return: none recorded yet.")}</div>
          <div class="utility-menu-meta">${escapeHtml(latestUnlock ? `Latest permanent unlock: ${latestUnlock}` : "Latest permanent unlock: none yet.")}</div>
          ${this.getSaveSlotSummaryMarkup({
            action: "load",
            actionLabel: "Load",
            focusPrefix: "utility:load-slot"
          })}
        `;
      }
    }

    if (utilityControlSummary) {
      utilityControlSummary.innerHTML = `
        <div class="utility-menu-title">${connected ? "Controller ready" : "Touch active"}</div>
        <div class="utility-menu-meta">${escapeHtml(connected ? `${this.gamepadInput.getControllerName()} | A Confirm/Use | B Back | X Alt | Y Pack | RT Scroll` : "Touch controls are available for movement and actions.")}</div>
      `;
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

    this.modalRoot.innerHTML = "";
    this.modalRoot.appendChild(fragment);
    this.modalRoot.classList.remove("hidden");
    this.modalSurfaceKey = "utility-menu";
    this.modalReturnContext = null;
    this.recordTelemetry("modal_opened", {
      surface: "utility-menu"
    });
    this.applyControllerNavigationMetadata();
    const focusElement = this.resolveModalFocusTarget(focusTarget);
    if (focusElement) {
      this.focusUiElement(focusElement);
      return;
    }
    this.focusFirstUiElement();
  }

  closeModal() {
    this.resetMovementCadence();
    const closingSurfaceKey = this.modalSurfaceKey;
    const modalReturnContext = this.modalReturnContext;
    const openerFocusKey = this.utilityMenuOpenerFocusKey;
    if (this.modalSurfaceKey === "return-summary") {
      this.recordTelemetry("return_summary_closed", {
        outcome: this.lastRunSummary?.outcome || ""
      });
      this.storyFlags.postReturnBankPrompt = true;
      this.log("Bank is the cleanest next stop. Review town persistence before sending this adventurer north again.", "warning");
    }
    this.setModalVisibility(false);
    this.modalRoot.classList.add("hidden");
    this.modalRoot.innerHTML = "";
    this.modalSurfaceKey = null;
    this.modalReturnContext = null;
    this.pendingService = null;
    this.activeHubTab = "pack";
    this.hoveredPackSelection = null;
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
  }

  render() {
    const previousFocusKey = this.mode === "modal" ? null : (this.getActiveUiActionableElement()?.dataset?.focusKey || this.controllerFocusKey || null);
    this.syncSurfaceMusic();
    this.syncUtilityBar();
    this.renderBoard();
    this.renderMiniMap();
    this.renderPanels();
    this.renderEventTicker();
    this.renderActionBar();
    this.syncSpellTray();
    this.syncContextChip();
    this.applyControllerNavigationMetadata();
    if (previousFocusKey && this.lastInputSource !== "pointer") {
      const nextFocus = this.findUiElementByFocusKey(previousFocusKey);
      if (nextFocus) {
        this.focusUiElement(nextFocus);
      }
    }
  }

  renderMiniMap() {
    if (!this.mapCtx || !this.mapCanvas) {
      return;
    }
    const ctx = this.mapCtx;
    ctx.clearRect(0, 0, this.mapCanvas.width, this.mapCanvas.height);
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, this.mapCanvas.width, this.mapCanvas.height);

    if (!this.currentLevel || !this.player) {
      if (this.mapPanelLabel) {
        this.mapPanelLabel.textContent = "Overworld Map";
      }
      if (this.mapPanelState) {
        this.mapPanelState.textContent = "No active run";
      }
      if (this.mapCaption) {
        this.mapCaption.textContent = "Create a character to begin.";
      }
      return;
    }

    const scaleX = this.mapCanvas.width / this.currentLevel.width;
    const scaleY = this.mapCanvas.height / this.currentLevel.height;
    const time = nowTime();
    const pulse = 0.42 + ((Math.sin(time / 180) + 1) * 0.2);
    const markPoint = (point, fillStyle, borderStyle = "", size = 4) => {
      if (!point) {
        return;
      }
      const px = Math.floor(point.x * scaleX);
      const py = Math.floor(point.y * scaleY);
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.fillStyle = fillStyle;
      ctx.fillRect(px - 1, py - 1, Math.max(size, Math.ceil(scaleX) + 2), Math.max(size, Math.ceil(scaleY) + 2));
      if (borderStyle) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = borderStyle;
        ctx.lineWidth = 1;
        ctx.strokeRect(px - 2, py - 2, Math.max(size + 2, Math.ceil(scaleX) + 4), Math.max(size + 2, Math.ceil(scaleY) + 4));
      }
      ctx.restore();
    };

    for (let y = 0; y < this.currentLevel.height; y += 1) {
      for (let x = 0; x < this.currentLevel.width; x += 1) {
        if (!isExplored(this.currentLevel, x, y) && this.currentDepth !== 0) {
          continue;
        }
        const tile = getTile(this.currentLevel, x, y);
        ctx.fillStyle = miniMapColor(tile, isVisible(this.currentLevel, x, y));
        ctx.fillRect(Math.floor(x * scaleX), Math.floor(y * scaleY), Math.ceil(scaleX), Math.ceil(scaleY));
      }
    }

    this.currentLevel.items.forEach((item) => {
      if (this.currentDepth !== 0 && !isExplored(this.currentLevel, item.x, item.y)) {
        return;
      }
      ctx.fillStyle = item.kind === "gold" ? "#ebcf60" : "#9bc4df";
      ctx.fillRect(Math.floor(item.x * scaleX), Math.floor(item.y * scaleY), Math.max(2, Math.ceil(scaleX)), Math.max(2, Math.ceil(scaleY)));
    });

    if (this.currentDepth === 0 && this.currentLevel.buildings) {
      this.currentLevel.buildings.forEach((building) => {
        const doorX = building.x + Math.floor(building.w / 2);
        const doorY = building.y + building.h - 1;
        markPoint({ x: doorX, y: doorY }, "#d6b06a", "#f3ddb3", 4);
      });
    }

    this.currentLevel.actors.forEach((actor) => {
      if (this.currentDepth !== 0 && !isVisible(this.currentLevel, actor.x, actor.y)) {
        return;
      }
      ctx.fillStyle = "#c94a4a";
      ctx.fillRect(Math.floor(actor.x * scaleX), Math.floor(actor.y * scaleY), Math.max(2, Math.ceil(scaleX)), Math.max(2, Math.ceil(scaleY)));
    });

    ctx.fillStyle = "#7bd0ff";
    ctx.fillRect(Math.floor(this.player.x * scaleX), Math.floor(this.player.y * scaleY), Math.max(3, Math.ceil(scaleX)), Math.max(3, Math.ceil(scaleY)));

    const unresolvedObjective = this.currentLevel.floorObjective && !this.currentLevel.floorResolved
      ? this.currentLevel.floorObjective.marker
      : this.currentLevel.milestone && this.currentLevel.milestone.status !== "cleared"
        ? this.currentLevel.milestone.marker
        : null;
    const unopenedOptional = this.currentLevel.floorOptional && !this.currentLevel.floorOptional.opened ? this.currentLevel.floorOptional.marker : null;
    const highlightedRoomIndex = this.currentLevel.floorObjective && !this.currentLevel.floorResolved
      ? this.currentLevel.floorObjective.roomIndex
      : this.currentLevel.milestone && this.currentLevel.milestone.status !== "cleared"
        ? this.currentLevel.milestone.roomIndex
        : null;
    if (highlightedRoomIndex !== null && highlightedRoomIndex !== undefined && this.currentLevel.rooms?.[highlightedRoomIndex]) {
      const room = this.currentLevel.rooms[highlightedRoomIndex];
      ctx.save();
      ctx.strokeStyle = "rgba(255, 153, 125, 0.9)";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        Math.floor(room.x * scaleX),
        Math.floor(room.y * scaleY),
        Math.max(4, Math.floor(room.w * scaleX)),
        Math.max(4, Math.floor(room.h * scaleY))
      );
      ctx.restore();
    }
    this.getGuidedRoutePoints(this.currentLevel).forEach((point, index, points) => {
      if (!isExplored(this.currentLevel, point.x, point.y)) {
        return;
      }
      const px = Math.floor(point.x * scaleX);
      const py = Math.floor(point.y * scaleY);
      ctx.fillStyle = index === points.length - 1 ? "rgba(255, 213, 122, 0.92)" : "rgba(255, 213, 122, 0.54)";
      ctx.fillRect(px, py, Math.max(2, Math.ceil(scaleX)), Math.max(2, Math.ceil(scaleY)));
    });
    markPoint(this.currentLevel.stairsUp, "#93d7ff", "#dff7ff", 5);
    markPoint(this.currentLevel.stairsDown, this.currentDepth === 0 && (this.player.deepestDepth || 0) === 0 ? "#ffd36b" : "#caa44a", "#ffe7ab", 5);
    markPoint(unresolvedObjective, "#ff8c6d", "#ffd3bf", 6);
    markPoint(unopenedOptional, "#c991ff", "#ead7ff", 5);
    markPoint(this.currentLevel.signatureReveal?.point, "#f0d27d", "#fff0c3", 5);

    if (this.mapPanelLabel) {
      this.mapPanelLabel.textContent = this.currentDepth === 0 ? "Overworld Map" : "Floor Survey";
    }
    if (this.mapPanelState) {
      this.mapPanelState.textContent = this.currentDepth === 0
        ? this.getTownCycleLabel()
        : `Depth ${this.currentDepth}`;
    }
    if (this.mapCaption) {
      const modeLabel = this.currentDepth === 0 ? this.getTownCycleLabel() : "Dungeon survey";
      const pressure = this.getPressureUiState();
      this.mapCaption.innerHTML = `
        <div class="map-caption-row">
          <span class="map-chip">${escapeHtml(this.getCurrentAreaTitle())}</span>
          <span class="map-chip subtle">Explored ${getExploredPercent(this.currentLevel)}%</span>
          <span class="map-chip subtle">${escapeHtml(this.currentDepth > 0 ? pressure.label : modeLabel)}</span>
        </div>
      `;
    }
  }

  renderBoard() {
    const ctx = this.ctx;
    const time = nowTime();
    const effectProfile = this.getEffectProfile();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (!this.currentLevel || !this.player) {
      drawCenteredText(ctx, "Create a character to begin", 300, 300, "#f2deb1");
      return;
    }

    const view = this.getViewport();
    let offsetX = 0;
    let offsetY = 0;
    if (this.boardImpulse && this.boardImpulse.until > time) {
      const life = clamp((time - this.boardImpulse.created) / Math.max(1, this.boardImpulse.until - this.boardImpulse.created), 0, 1);
      const falloff = Math.pow(1 - life, 2);
      offsetX = this.boardImpulse.dx * 4 * falloff;
      offsetY = this.boardImpulse.dy * 4 * falloff;
    }

    ctx.save();
    if (offsetX || offsetY) {
      ctx.translate(offsetX, offsetY);
    }

    for (let sy = 0; sy < VIEW_SIZE; sy += 1) {
      for (let sx = 0; sx < VIEW_SIZE; sx += 1) {
        const x = view.x + sx;
        const y = view.y + sy;
        const tile = getTile(this.currentLevel, x, y);
        const visible = isVisible(this.currentLevel, x, y);
        const explored = isExplored(this.currentLevel, x, y);
        if (!tile || !explored) {
          ctx.fillStyle = "#040404";
          ctx.fillRect(sx * TILE_SIZE, sy * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          continue;
        }
        drawTile(ctx, this.currentLevel, tile, x, y, sx, sy, visible);
      }
    }
    drawTownBuildings(ctx, this.currentLevel, view);
    drawBoardAtmosphere(ctx, this.currentLevel, view, time, {
      depth: this.currentDepth,
      firstTownRun: this.currentDepth === 0 && (this.player.deepestDepth || 0) === 0,
      ...effectProfile
    });
    this.getGuidedRoutePoints(this.currentLevel).forEach((point, index, points) => {
      if (!isExplored(this.currentLevel, point.x, point.y) || !isVisible(this.currentLevel, point.x, point.y)) {
        return;
      }
      const sx = point.x - view.x;
      const sy = point.y - view.y;
      if (sx < 0 || sy < 0 || sx >= VIEW_SIZE || sy >= VIEW_SIZE) {
        return;
      }
      const tileX = sx * TILE_SIZE;
      const tileY = sy * TILE_SIZE;
      const isEndpoint = index === points.length - 1;
      ctx.save();
      ctx.strokeStyle = isEndpoint ? "rgba(255, 214, 125, 0.9)" : "rgba(255, 214, 125, 0.55)";
      ctx.lineWidth = isEndpoint ? 2 : 1.5;
      ctx.strokeRect(tileX + 7, tileY + 7, TILE_SIZE - 14, TILE_SIZE - 14);
      ctx.fillStyle = isEndpoint ? "rgba(255, 214, 125, 0.3)" : "rgba(255, 214, 125, 0.16)";
      ctx.fillRect(tileX + 8, tileY + 8, TILE_SIZE - 16, TILE_SIZE - 16);
      ctx.restore();
    });
    drawBoardProps(ctx, this.currentLevel, view, time, effectProfile);

    this.currentLevel.items.forEach((item) => {
      if (!isVisible(this.currentLevel, item.x, item.y)) {
        return;
      }
      const sx = item.x - view.x;
      const sy = item.y - view.y;
      if (sx < 0 || sy < 0 || sx >= VIEW_SIZE || sy >= VIEW_SIZE) {
        return;
      }
      drawItem(ctx, item, sx, sy, time, effectProfile);
    });

    const targetActor = this.targetMode ? actorAt(this.currentLevel, this.targetMode.cursor.x, this.targetMode.cursor.y) : null;
    const focusedThreat = targetActor || this.getFocusedThreat();
    this.currentLevel.actors.forEach((actor) => {
      if (!isVisible(this.currentLevel, actor.x, actor.y)) {
        return;
      }
      const sx = actor.x - view.x;
      const sy = actor.y - view.y;
      if (sx < 0 || sy < 0 || sx >= VIEW_SIZE || sy >= VIEW_SIZE) {
        return;
      }
      drawMonster(ctx, actor, sx, sy, time, effectProfile);
      drawMonsterHealthBar(ctx, actor, sx, sy, {
        focused: actor === focusedThreat
      });
      drawMonsterIntent(ctx, actor, sx, sy, time, {
        ...effectProfile,
        player: this.player,
        view
      });
    });

    this.visualEffects
      .filter((effect) => effect.type !== "screenPulse")
      .forEach((effect) => drawEffect(ctx, effect, view, time, effectProfile));
    drawPlayer(ctx, this.player, this.player.x - view.x, this.player.y - view.y, time, effectProfile);
    if (this.targetMode) {
      drawTargetCursor(ctx, this.targetMode.cursor, view, this.player, time, {
        ...effectProfile,
        targetPreview: this.getActiveSpellTargetPreview(),
        targetMode: this.targetMode
      });
    }
    ctx.restore();

    this.visualEffects
      .filter((effect) => effect.type === "screenPulse")
      .forEach((effect) => drawEffect(ctx, effect, view, time, effectProfile));
    const hpRatio = this.player.maxHp > 0 ? this.player.hp / this.player.maxHp : 1;
    const burdenRatio = getCarryWeight(this.player) / Math.max(1, getCarryCapacity(this.player));
    drawBoardVignette(ctx, hpRatio, time, effectProfile);
    drawBoardBurdenVignette(ctx, burdenRatio, time, effectProfile);
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
      const canShowToggle = hasSpellTray && !["title", "creation", "levelup"].includes(this.mode);
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
    if ((force || changed) && this.player && this.mapDrawer) {
      this.mapDrawerOpen = nextMode === "desktop";
    }
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
    if (this.player.x >= 20 && this.player.x <= 28 && this.player.y >= 13 && this.player.y <= 19) {
      return "Town Square";
    }
    if (this.player.x === 24 && this.player.y <= 12) {
      return "Keep Road";
    }
    if (this.player.x === 24 && this.player.y >= 20) {
      return "South Road";
    }
    if (this.player.x < 20 && this.player.y < 16) {
      return "West Market";
    }
    if (this.player.x > 28 && this.player.y < 16) {
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
    this.eventTicker.innerHTML = renderHudFeed(this);
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

  useStairs(direction) { applyCommandResult(this, useStairsCommand(this, direction)); }

  saveGame(options = {}) { saveGameState(this, options); }

  loadGame(options = {}) {
    this.resetMovementCadence();
    loadGameState(this, options);
    this.syncSurfaceMusic();
  }

  showTitleScreen() {
    this.resetMovementCadence();
    showTitleModal(this);
  }

  showCreationModal(options = {}) { showCreationScreen(this, options); }

  renderActionBar() { renderAdvisorActionBar(this); }

  getAdvisorModel() { return buildAdvisorModel(this); }

  renderPanels() { renderAdvisorPanels(this); }

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
