import { APP_VERSION, DIRECTIONS, DUNGEON_DEPTH, FOV_RADIUS, SAVE_KEY, TILE_SIZE, VIEW_SIZE } from "./core/constants.js";
import { BOON_DEFS, CLASSES, DISCOVERY_DEFS, ENEMY_BEHAVIOR_KITS, ITEM_DEFS, LOOT_AFFIX_DEFS, MILESTONE_DEFS, MONSTER_DEFS, OBJECTIVE_DEFS, PERK_DEFS, RACES, RELIC_DEFS, ROOM_EVENT_DEFS, SHOPS, SPELLS, STORY_BEATS, STORY_NPCS, TEMPLE_SERVICES, TOWN_REACTION_DEFS, TOWN_UNLOCK_DEFS } from "./data/content.js";
import {
  createInitialShopState,
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
  getItemLightBonus,
  getItemManaBonus,
  getItemName,
  getItemPower,
  getItemSearchBonus,
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
import { applyCommandResult } from "./core/command-result.js";
import { adjustCreationStat as adjustCreationStatDraft, captureCreationDraft as captureCreationDraftState, getCreationPointsRemaining as getCreationDraftPointsRemaining, getCreationStats as getCreationDraftStats, resetCreationDraft as resetCreationState, showCreationModal as showCreationScreen, showTitleScreen as showTitleModal } from "./features/creation.js";
import { getSavedRunMeta as loadSavedRunMeta, formatSaveStamp as formatSavedRunStamp, loadGame as loadGameState, saveGame as saveGameState, syncSaveChrome } from "./features/persistence.js";
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
import { advanceClassMastery, applyClassMasteryBonuses, applyContractToNewRun, ensureMetaProgressionState, getActiveContract, getAvailableContracts, getClassMasterySummary, getClassMasteryViewModel, getContractViewModel, getCreationPersistencePreview, getRecommendedContract, setActiveContract, unlockContract } from "./features/meta-progression.js";
import { buildTelemetrySummary, exportTelemetryTrace, getTelemetryReviewSnapshot, initializeTelemetry, recordRunSummary, recordTelemetry, recordTownServiceOpen, resetTelemetry, startTelemetryRun, trackFirstPlayerMove, trackObjectiveProgress, trackOptionalProgress } from "./features/telemetry.js";
import { markOnboardingFlag } from "./features/onboarding.js";
import { buildHudFeedModel, renderHudFeed } from "./features/hud-feed.js";
import { buildEquipmentSlotSummary, buildInventoryPresentationModel } from "./features/inventory-ui.js";

export class Game {
  constructor() {
    this.appShell = document.querySelector(".mobile-app");
    this.canvas = document.getElementById("game-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.mapCanvas = document.getElementById("map-canvas");
    this.mapCtx = this.mapCanvas ? this.mapCanvas.getContext("2d") : null;
    this.mapCaption = document.getElementById("map-caption");
    this.mapDrawer = document.getElementById("map-drawer");
    this.mapToggleButton = document.getElementById("map-toggle-button");
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
    this.activePackFilter = "all";
    this.activePackSelection = { type: "inventory", value: 0 };
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
    this.settings = loadSettings();
    this.mapDrawerOpen = false;
    this.lastInputSource = "pointer";
    this.controllerFocusKey = null;
    this.reducedMotionQuery = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
    this.feedDrawerOpen = false;
    this.liveFeedSticky = null;
    document.documentElement.dataset.uiScale = this.settings.uiScale;
    this.shopState = createInitialShopState();
    ensureTownMetaState(this);
    ensureChronicleState(this);
    ensureMetaProgressionState(this);
    initializeTelemetry(this);
    this.audio = new SoundBoard(this.settings);
    this.gamepadInput = new GamepadInput();
    this.bindEvents();
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
    document.addEventListener("click", (event) => this.handleClick(event));
    document.addEventListener("pointerdown", () => this.setInputSource("pointer"));
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
  }

  startRuntimeLoop() {
    const tick = () => {
      this.pollGamepad();
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

  legacyRefreshChromeUnused() {
    const meta = this.getSavedRunMeta();
    if (this.controllerStatus) {
      const connected = this.gamepadInput.isConnected();
      this.controllerStatus.textContent = connected ? `Controller: ${this.gamepadInput.getControllerName()}` : "Touch controls active";
    }
    if (this.touchControls) {
      const hiddenBySetting = !this.settings.touchControlsEnabled;
      const hiddenByController = this.settings.controllerHintsEnabled && this.gamepadInput.isConnected();
      this.touchControls.classList.toggle("hidden", hiddenBySetting || hiddenByController);
    }
    if (this.saveStamp) {
      if (!meta) {
        this.saveStamp.textContent = "No save loaded";
      } else {
        const timeLabel = meta.savedAt ? this.formatSaveStamp(meta.savedAt) : null;
        this.saveStamp.textContent = timeLabel ? `${meta.name} Lv.${meta.level} Depth ${meta.depth} · ${timeLabel}` : `${meta.name} Lv.${meta.level} Depth ${meta.depth}`;
      }
    }
    if (this.quickSaveButton) {
      this.quickSaveButton.disabled = !this.player || this.mode === "title";
    }
    if (this.quickLoadButton) {
      this.quickLoadButton.disabled = !meta;
    }
  }

  legacyGetSavedRunMetaUnused() { return loadSavedRunMeta(); }

  legacyFormatSaveStampUnused(isoString) { return formatSavedRunStamp(isoString); }

  legacyResetCreationDraftUnused() { resetCreationState(this); }

  legacyCaptureCreationDraftUnused() { captureCreationDraftState(this); }

  legacyGetCreationPointsRemainingUnused() { return getCreationDraftPointsRemaining(this); }

  legacyAdjustCreationStatUnused(stat, delta) { return adjustCreationStatDraft(this, stat, delta); }

  legacyGetCreationStatsUnused() { return getCreationDraftStats(this); }

  getAttackValueForStats(stats, weaponPower = 2) {
    return weaponPower + Math.floor(stats.str / 2);
  }

  getDamageRangeForStats(stats, weaponPower = 2) {
    return [1, Math.max(2, weaponPower + Math.floor(stats.str / 2))];
  }

  getArmorValueForStats(stats) {
    return Math.floor(stats.dex / 2);
  }

  getEvadeValueForStats(stats) {
    return 6 + Math.floor(stats.dex * 0.75);
  }

  getSearchRadiusForStats(stats) {
    return 2 + (stats.dex >= 15 || stats.int >= 15 ? 1 : 0) + (stats.int >= 18 ? 1 : 0);
  }

  getSearchPowerForStats(stats, level = 1) {
    return stats.dex + stats.int + level * 2;
  }

  getMaxHpForStats(stats, level, className, constitutionLoss = 0, hpBase = 0) {
    const effectiveCon = Math.max(1, stats.con - constitutionLoss);
    return Math.max(10, hpBase + level * 2 + effectiveCon + Math.floor(effectiveCon / 2) + (className === "Fighter" ? 4 : 0));
  }

  getMaxManaForStats(stats, className, bonusMana = 0, manaBase = 0) {
    return Math.max(0, manaBase + Math.floor(stats.int * 0.75) + bonusMana + (className === "Wizard" ? 6 : 0));
  }

  getPlayerRaceTemplate(player) {
    return RACES.find((race) => race.name === player.race) || null;
  }

  getPlayerClassTemplate(player) {
    return CLASSES.find((role) => role.name === player.className) || null;
  }

  getPlayerHpBase(player) {
    if (typeof player.hpBase === "number") {
      return player.hpBase;
    }
    const race = this.getPlayerRaceTemplate(player);
    const role = this.getPlayerClassTemplate(player);
    return (race ? race.hp : 0) + (role ? role.bonuses.hp : 0);
  }

  getPlayerManaBase(player) {
    if (typeof player.manaBase === "number") {
      return player.manaBase;
    }
    const race = this.getPlayerRaceTemplate(player);
    const role = this.getPlayerClassTemplate(player);
    return (race ? race.mana : 0) + (role ? role.bonuses.mana : 0);
  }

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

  triggerDockSlot(key) {
    if (!this.player) {
      return;
    }
    const slot = this.getActionDockModel().find((entry) => entry.key === key);
    if (!slot || !slot.action) {
      return;
    }
    this.handleAction(slot.action, { dataset: { action: slot.action, tab: slot.tab || "" } });
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
    const afterWeight = beforeWeight + (item.weight || 0);
    const beforeTier = getEncumbranceTier(this.player);
    const afterTier = afterWeight > capacity ? 2 : afterWeight > capacity * 0.75 ? 1 : 0;
    return afterTier > beforeTier || (item.weight || 0) >= 5;
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

  getLearnableSpellOptions() {
    const affinity = this.player?.className === "Fighter"
      ? "fighter"
      : this.player?.className === "Rogue"
        ? "rogue"
        : "wizard";
    return Object.values(SPELLS)
      .filter((spell) => (spell.learnLevel || 1) <= this.player.level && !this.player.spellsKnown.includes(spell.id))
      .sort((a, b) => {
        const affinityScoreA = a.classAffinity === affinity ? 2 : a.classAffinity === "shared" ? 1 : 0;
        const affinityScoreB = b.classAffinity === affinity ? 2 : b.classAffinity === "shared" ? 1 : 0;
        if (affinityScoreA !== affinityScoreB) {
          return affinityScoreB - affinityScoreA;
        }
        const levelDiff = (a.learnLevel || 1) - (b.learnLevel || 1);
        return levelDiff !== 0 ? levelDiff : a.cost - b.cost;
      });
  }

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

  getDamageEffectColor(damageType, defender) {
    if (damageType === "magic") {
      return "#d8bcff";
    }
    if (damageType === "fire") {
      return "#ffb16f";
    }
    if (damageType === "cold") {
      return "#9ad7ff";
    }
    if (damageType === "poison") {
      return "#97d67f";
    }
    return defender && defender.id === "player" ? "#ff8d73" : "#f2deb1";
  }

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
      event.preventDefault();
      this.handleAction(action.dataset.action, action);
      return;
    }

    const raceChoice = event.target.closest("[data-race]");
    if (raceChoice) {
      this.captureCreationDraft();
      this.selectedRace = raceChoice.dataset.race;
      this.showCreationModal({ focusTarget: `creation:race:${raceChoice.dataset.race}` });
      return;
    }

    const classChoice = event.target.closest("[data-class]");
    if (classChoice) {
      this.captureCreationDraft();
      this.selectedClass = classChoice.dataset.class;
      this.showCreationModal({ focusTarget: `creation:class:${classChoice.dataset.class}` });
    }
  }

  handleCanvasClick(event) {
    if (!this.player || this.isPlayerDead() || (this.mode !== "game" && this.mode !== "target")) {
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
      this.performWait();
      return;
    }
    this.handleMovementIntent(dx, dy);
  }

  handleAction(actionName, element) {
    if (this.isPlayerDead() && !["new-game", "load-game"].includes(actionName)) {
      return;
    }
    switch (actionName) {
      case "new-game":
        this.resetCreationDraft();
        this.showCreationModal();
        break;
      case "save-game":
        this.saveGame();
        break;
      case "load-game":
        if (this.mode === "title") {
          this.recordTelemetry("title_continue_used", {
            hasSave: Boolean(this.getSavedRunMeta())
          });
        }
        this.loadGame();
        break;
      case "export-telemetry":
        this.exportTelemetryTrace();
        break;
      case "open-hub": {
        const tab = element && element.dataset.tab ? element.dataset.tab : "pack";
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
          focusTarget: element ? this.getHubTabFocusKey(tab) : null
        });
        break;
      }
      case "inventory":
        this.showInventoryModal();
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
        this.showHelpModal();
        break;
      case "open-briefing":
        this.showBriefingModal();
        break;
      case "settings":
        this.showSettingsModal();
        break;
      case "open-utility-menu":
        this.showUtilityMenu();
        break;
      case "view-map":
        if (this.mode === "modal" && !this.pendingPickupPrompt) {
          this.closeModal();
        }
        this.focusMap();
        break;
      case "toggle-map":
        this.mapDrawerOpen = !this.mapDrawerOpen;
        this.refreshChrome();
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
        this.showCreationModal({ focusTarget: "creation:reset-stats" });
        break;
      case "creation-adjust-stat":
        this.captureCreationDraft();
        if (this.adjustCreationStat(element.dataset.stat, Number(element.dataset.delta))) {
          this.showCreationModal({
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
      case "learn-spell":
        this.learnLevelUpSpell(element.dataset.spell);
        break;
      case "choose-reward":
        this.chooseRewardChoice(element.dataset.reward);
        break;
      case "spell-cast":
        this.prepareSpell(element.dataset.spell);
        break;
      case "shop-buy":
        this.buyShopItem(element.dataset.shop, element.dataset.item);
        break;
      case "shop-sell":
        this.sellShopItem(element.dataset.index);
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
      case "service-use":
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
      this.handleMovementIntent(dx, dy);
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
        if (this.mapDrawerOpen) {
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
        this.showSpellModal();
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
    const race = getRace(this.selectedRace);
    const role = getClass(this.selectedClass);
    this.captureCreationDraft();
    const heroName = this.creationName || "Morgan";
    const stats = this.getCreationStats();
    ensureMetaProgressionState(this);

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
      inventory: [],
      equipment: {
        weapon: null,
        offhand: null,
        head: null,
        body: null,
        cloak: null,
        feet: null,
        ring: null,
        amulet: null
      },
      perks: [],
      relics: [],
      runCurrencies: {
        rumorTokens: 0,
        hunterMark: 0,
        templeFavor: 0
      },
      knownRumors: [],
      spellsKnown: [...role.spells],
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

    role.startItems.forEach((itemId) => this.addItemToInventory(createTownItem(itemId)));
    const activeContract = applyContractToNewRun(this);
    const masteryRewards = applyClassMasteryBonuses(this);
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
      contractUnlocks: []
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
    this.log(`${heroName} enters the valley beneath the ruined keep.`, "good");
    this.log("Recover the Runestone of the Winds from the lower halls and return to town.", "warning");
    this.log("Step onto one labeled town door first. Then follow the north road into the keep.", "warning");
    if (activeContract) {
      this.log(`Contract active: ${activeContract.name}. ${activeContract.summary}`, "warning");
    }
    if (masteryRewards.length > 0) {
      this.log(`Class mastery loadout: ${masteryRewards.join(", ")}.`, "good");
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
      if ((item.kind === "weapon" || item.kind === "armor") && !this.player.equipment[item.slot]) {
        this.player.equipment[item.slot] = item;
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
    fillRect(level, 20, 13, 9, 7, tileDef("stone"));
    fillRect(level, 21, 14, 7, 5, tileDef("plaza"));
    placeBuilding(level, 4, 4, 9, 7, "Provisioner", "general");
    placeBuilding(level, 35, 4, 9, 7, "Armory", "armory");
    placeBuilding(level, 4, 22, 9, 7, "Guild", "guild");
    placeBuilding(level, 35, 22, 9, 7, "Temple", "temple");
    placeBuilding(level, 20, 25, 9, 5, "Bank", "bank");
    placeBuilding(level, 15, 4, 7, 6, "Sage", "sage");
    placeBuilding(level, 27, 4, 6, 6, "Junk", "junk");
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
        breadcrumbPropId: "inscribedStone",
        landmarkPropId: "shrineSeal",
        label: "inscribed stones",
        leadText: "Follow the inscribed stones into the relic hall."
      },
      purge_nest: {
        id: "nest_route",
        breadcrumbPropId: "roomTorch",
        landmarkPropId: "broodNest",
        label: "smoke-marked torches",
        leadText: "Follow the smoke-marked torches toward the kennels."
      },
      rescue_captive: {
        id: "cell_route",
        breadcrumbPropId: "rescueBanner",
        landmarkPropId: "prisonerCell",
        label: "torn pennants",
        leadText: "Follow the torn pennants toward the cells."
      },
      seal_shrine: {
        id: "shrine_route",
        breadcrumbPropId: "shrineTorch",
        landmarkPropId: "shrineSeal",
        label: "violet lamps",
        leadText: "Follow the violet lamps toward the chapel."
      },
      break_beacon: {
        id: "watch_route",
        breadcrumbPropId: "roadBeacon",
        landmarkPropId: "inscribedStone",
        label: "watch lights",
        leadText: "Follow the watch lights toward the beacon room."
      },
      secure_supplies: {
        id: "supply_route",
        breadcrumbPropId: "cacheClosed",
        landmarkPropId: "vaultChest",
        label: "stacked supply marks",
        leadText: "Follow the supply marks into the store rooms."
      }
    };
    return styles[objectiveId] || {
      id: "floor_route",
      breadcrumbPropId: "roomTorch",
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
      secure_supplies: "store rooms"
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
      const propId = placed === 0 ? style.landmarkPropId : style.breadcrumbPropId;
      addLevelProp(level, {
        id: `route-crumb-${depth}-${style.id}-${index}`,
        x: point.x,
        y: point.y,
        propId,
        layer: "fixture",
        light: propId === "roomTorch" || propId === "roadBeacon" || propId === "shrineTorch" || propId === "shrineSeal"
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
      entryRevealSteps,
      revealedRouteSteps: entryRevealSteps,
      searchRevealChunk,
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
      propId: "shrineSeal",
      cuePropId: "inscribedStone",
      point: routePoint
    };
    if (depth === 1) {
      reveal = {
        id: "survivor_trace",
        label: "Survivor Trace",
        thesis: "The first halls still show the path of someone who tried to flee the keep.",
        routeCue: "The first route follows a survivor's trace toward the objective.",
        warning: "Early rooms are meant to teach the path, not bury it.",
        propId: "loreBook",
        cuePropId: "roomTorch",
        point: routePoint
      };
    } else if (roomEvent?.id === "failed_summoning" || floorSpecialId === "restless_dead") {
      reveal = {
        id: "ritual_glow",
        label: "Ritual Glow",
        thesis: "Restless energy is pooling ahead. Corpses and summons are part of this floor's pressure.",
        routeCue: "Ritual pressure stains the route ahead.",
        warning: "Fresh bodies may not stay down.",
        propId: "summonTrap",
        cuePropId: "shrineTorch",
        point: routePoint
      };
    } else if (roomEvent?.id === "barricaded_hold" || floorSpecialId === "barricaded_rooms" || floorSpecialId === "warband") {
      reveal = {
        id: "barricade_breach",
        label: "Barricade Breach",
        thesis: "The floor is organized around holds and choke points rather than loose skirmishes.",
        routeCue: "Barricades mark the approach to the objective wing.",
        warning: "Expect tighter, denser holds.",
        propId: "cacheClosed",
        cuePropId: "roomTorch",
        point: routePoint
      };
    } else if (roomEvent?.id === "wounded_survivor") {
      reveal = {
        id: "survivor_trace",
        label: "Survivor Trace",
        thesis: "Someone made it this far and left warnings in the dark.",
        routeCue: "A survivor's trail points toward the first real decision.",
        warning: "The route carries signs of a hurried retreat.",
        propId: "loreBook",
        cuePropId: "roomTorch",
        point: routePoint
      };
    } else if (floorSpecialId === "hunting_party" || specialElite) {
      reveal = {
        id: "patrol_sighting",
        label: "Patrol Sign",
        thesis: "A formed hunting party is active on this floor and moving before you do.",
        routeCue: "Tracks and torchlight suggest a patrol ahead.",
        warning: "Something active is moving ahead of you.",
        propId: "roomTorch",
        cuePropId: "roadBeacon",
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
        ? (signatureReveal?.cuePropId || "roomTorch")
        : beat.id === "approach"
          ? "shrineSeal"
          : "roomTorch";
      addLevelProp(level, {
        id: `route-beat-${depth}-${beat.id}`,
        x: beat.x,
        y: beat.y,
        propId: cuePropId,
        layer: "fixture",
        light: cuePropId === "roomTorch" || cuePropId === "roadBeacon" || cuePropId === "shrineTorch" || cuePropId === "shrineSeal"
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
          light: signatureReveal.propId !== "cacheClosed"
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
      case "break_beacon":
        return blockers > 0
          ? `Break the beacon after the last ${blockers} defender${blockers === 1 ? "" : "s"} drop.`
          : "Room clear. Smash the beacon now.";
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
          primaryText: "Step onto one labeled town door once.",
          supportText: "Then take the north road into the keep.",
          recommendedActionId: "town_service",
          routeCueText: "",
          dangerText: ""
        };
      }
      if (this.isFirstTownRun()) {
        return {
          phase: "enter_keep",
          primaryText: "Take the north road and enter the keep.",
          supportText: "Ignore extra town prep for now. The first descent is next.",
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
      ? "Search once to extend the marked route."
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
      light: eventDef.eventType !== "rescue"
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
    let armor = this.getArmorValueForStats(this.player.stats);
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
    return this.getAttackValueForStats(this.player.stats, base) + this.getMeleeAccuracyBonus();
  }

  getDamageRange() {
    const weapon = this.player.equipment.weapon;
    const base = weapon ? getItemPower(weapon) : 2;
    return this.getDamageRangeForStats(this.player.stats, base);
  }

  getEvadeValue() {
    let evade = this.getEvadeValueForStats(this.player.stats);
    evade -= getEncumbranceTier(this.player) * 2;
    Object.values(this.player.equipment).forEach((item) => {
      if (item && item.dexPenalty) {
        evade -= item.dexPenalty;
      }
      if (item && item.dexBonus) {
        evade += getItemDexBonus(item);
      }
    });
    evade += getBuildEvadeBonus(this);
    return evade;
  }

  getSearchPower() {
    const gearBonus = Object.values(this.player.equipment).reduce((sum, item) => sum + (item ? getItemSearchBonus(item) : 0), 0);
    return this.getSearchPowerForStats(this.player.stats, this.player.level) + getBuildSearchBonus(this) + gearBonus;
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
    return getEncumbranceTier(this.player);
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

  recalculateDerivedStats() {
    const bonusMana = Object.values(this.player.equipment).reduce((sum, item) => sum + (item ? getItemManaBonus(item) : 0), 0);
    const maxMana = this.getMaxManaForStats(this.player.stats, this.player.className, bonusMana + getBuildMaxManaBonus(this), this.getPlayerManaBase(this.player));
    const maxHp = this.getMaxHpForStats(this.player.stats, this.player.level, this.player.className, this.player.constitutionLoss || 0, this.getPlayerHpBase(this.player) + getBuildMaxHpBonus(this));
    const hpRatio = this.player.maxHp > 0 ? this.player.hp / this.player.maxHp : 1;
    const manaRatio = this.player.maxMana > 0 ? this.player.mana / this.player.maxMana : 1;
    this.player.maxHp = maxHp;
    this.player.maxMana = maxMana;
    this.player.hp = Math.max(1, Math.round(this.player.maxHp * hpRatio));
    this.player.mana = Math.max(0, Math.round(this.player.maxMana * manaRatio));
    this.player.lightRadius = this.getLightRadius();
  }

  tryMovePlayer(dx, dy) {
    if ((this.player.held || 0) > 0) {
      this.log("You strain against a holding spell and fail to move.", "warning");
      this.endTurn();
      return;
    }
    if ((this.player.slowed || 0) > 0 && this.turn % 2 === 0) {
      this.player.slowed -= 1;
      this.log("You struggle to move under a slowing effect.", "warning");
      this.endTurn();
      return;
    }
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;
    if (!inBounds(this.currentLevel, nx, ny)) {
      return;
    }
    const monster = actorAt(this.currentLevel, nx, ny);
    if (monster) {
      this.attack(this.player, monster);
      this.endTurn();
      return;
    }

    const tile = getTile(this.currentLevel, nx, ny);
    if (!tile.walkable) {
      if (tile.kind === "sign") {
        this.log(tile.label, "warning");
        this.render();
      }
      return;
    }

    this.player.x = nx;
    this.player.y = ny;
    this.trackFirstPlayerMove(nx, ny);
    this.flashTile(nx, ny, "#ffd36b", 120, { alpha: 0.12, decorative: true });
    onPlayerMove(this);
    this.audio.play("move");
    const current = getTile(this.currentLevel, nx, ny);
    this.handleTileEntry(current);
    if (current.kind === "stairDown") {
      this.useStairs("down");
      return;
    }
    if (current.kind === "stairUp") {
      this.useStairs("up");
      return;
    }
    this.pickupHere(true, true);
    if (this.pendingPickupPrompt) {
      this.render();
      return;
    }
    if (current.kind === "buildingDoor" && current.service) {
      this.openTownService(current.service);
    }
    this.endTurn();
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

  legacyPerformSearchUnused() {
    if (!this.player || this.mode !== "game") {
      return;
    }
    const radius = this.getSearchRadiusForStats(this.player.stats);
    const searchPower = this.getSearchPower();
    let found = 0;
    for (let y = this.player.y - radius; y <= this.player.y + radius; y += 1) {
      for (let x = this.player.x - radius; x <= this.player.x + radius; x += 1) {
        if (!inBounds(this.currentLevel, x, y)) {
          continue;
        }
        const tile = getTile(this.currentLevel, x, y);
        if ((tile.kind === "trap" && tile.hidden) || tile.kind === "secretDoor" || tile.kind === "secretWall") {
          const targetNumber = tile.kind === "trap" ? 24 : 28;
          if (randInt(1, 20) + searchPower >= targetNumber) {
            revealSecretTile(this.currentLevel, x, y);
            found += 1;
          }
        }
      }
    }
    this.log(found > 0 ? `You discover ${found} hidden feature${found === 1 ? "" : "s"}.` : "You search carefully but find nothing.", found > 0 ? "good" : "warning");
    this.audio.play(found > 0 ? "searchGood" : "search");
    this.endTurn();
  }

  focusMap() {
    this.mapDrawerOpen = true;
    this.refreshChrome();
    if (this.mapCanvas) {
      this.mapCanvas.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  pollGamepad() {
    const intent = this.gamepadInput.poll(this.mode);
    if (!intent) {
      this.refreshChrome();
      return;
    }
    this.setInputSource("gamepad");
    this.refreshChrome();
    if (intent.type === "move") {
      this.handleMovementIntent(intent.dx, intent.dy);
      return;
    }
    if (intent.type === "target") {
      this.moveTargetCursor(intent.dx, intent.dy);
      return;
    }
    if (intent.type === "ui-move") {
      this.handleUiNavigationIntent(intent.dx, intent.dy);
      return;
    }
    if (intent.type === "ui-tab-prev") {
      this.handleUiTabIntent(-1);
      return;
    }
    if (intent.type === "ui-tab-next") {
      this.handleUiTabIntent(1);
      return;
    }
    if (intent.type === "ui-scroll") {
      this.handleUiScrollIntent(intent.delta);
      return;
    }
    if (intent.type === "dock") {
      this.triggerDockSlot(intent.slot);
      return;
    }
    if (intent.type === "ui-confirm") {
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
      return;
    }
    if (intent.type === "ui-back") {
      if (this.mode === "target") {
        this.cancelTargetMode();
      } else if (this.pendingPickupPrompt) {
        this.cancelPendingPickup();
      } else if ((this.mode === "modal" || this.mode === "creation") && !this.isPlayerDead()) {
        this.closeModal();
      }
      return;
    }
    if (intent.type === "action") {
      this.handleAction(intent.action, intent.tab ? { dataset: { tab: intent.tab } } : null);
    }
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

  getFocusKeyCandidates(focusTarget) {
    const raw = Array.isArray(focusTarget) ? focusTarget : [focusTarget];
    return [...new Set(raw.filter((key) => typeof key === "string" && key.length > 0))];
  }

  findUiElementByFocusKey(focusKey) {
    if (!focusKey) {
      return null;
    }
    const root = this.getUiNavigationRoot();
    return Array.from(root.querySelectorAll("[data-focus-key]"))
      .find((element) => element.dataset.focusKey === focusKey && element.offsetParent !== null && !element.disabled) || null;
  }

  getElementOffsetInModal(element, modal = this.getModalElement()) {
    if (!element || !modal || !modal.contains(element)) {
      return null;
    }
    const elementRect = element.getBoundingClientRect();
    const modalRect = modal.getBoundingClientRect();
    return (elementRect.top - modalRect.top) + modal.scrollTop;
  }

  captureModalRefreshState(surfaceKey) {
    const modal = this.getModalElement();
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
    const modal = this.getModalElement();
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
    return element.closest(".pack-list-panel, .message-log, .journal-log, .modal, .modal-root");
  }

  handleUiScrollIntent(delta) {
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const host = this.getScrollHostForElement(active) || this.getModalElement() || this.modalRoot;
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
        document.getElementById("utility-menu-button")
      ].filter(Boolean),
      "top-band",
      4
    );
    if (this.mapCanvas) {
      this.mapCanvas.tabIndex = 0;
      this.mapCanvas.dataset.focusKey = this.mapCanvas.dataset.focusKey || "map:canvas";
      this.mapCanvas.dataset.navZone = "map-drawer";
      this.mapCanvas.dataset.navRow = "0";
      this.mapCanvas.dataset.navCol = "0";
    }
    this.assignNavMetadata(Array.from(this.actionBar?.querySelectorAll("button") || []), "action-bar", 4);
    this.assignNavMetadata(Array.from(this.touchControls?.querySelectorAll("button") || []), "touch-pad", 3);
    this.assignNavMetadata(Array.from(root.querySelectorAll(".title-actions button")), "title-actions", 3);
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
    const packItems = Array.from(root.querySelectorAll(".pack-group-list .pack-item-row"));
    this.assignNavMetadata(packFilters, "inventory-filters", 4);
    this.assignNavMetadata(packItems, "inventory-list", 1);
    if (packItems[0]) {
      packFilters.forEach((element) => {
        element.dataset.navDown = packItems[0].dataset.focusKey;
      });
      packItems.forEach((element) => {
        element.dataset.navUp = packFilters[0].dataset.focusKey;
      });
    }
    this.assignNavMetadata(Array.from(root.querySelectorAll(".pack-inspector-panel .pack-ready-chip, .pack-inspector-panel .menu-button, .pack-inspector-panel .tiny-button")), "inspector-actions", 2);
    this.assignNavMetadata(Array.from(root.querySelectorAll(".magic-grid .menu-button")), "spell-grid", 2);
    this.assignNavMetadata(Array.from(root.querySelectorAll(".journal-log")), "journal-log", 1);
    this.assignNavMetadata(Array.from(root.querySelectorAll(".utility-row .menu-button")), "journal-actions", 4);
    this.assignNavMetadata(Array.from(root.querySelectorAll("[data-action='shop-buy']")), "shop-buy", 1);
    this.assignNavMetadata(Array.from(root.querySelectorAll("[data-action='shop-sell']")), "shop-sell", 1);
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
      fallbackFocus = true
    } = options;
    this.mode = "modal";
    this.showSimpleModal("Settings", `
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
        <div><strong>Sound</strong><div class="muted">Simple effects only, no music by default.</div></div>
        <div class="actions"><button class="tiny-button" data-action="setting-toggle" data-setting="soundEnabled" type="button">${this.settings.soundEnabled ? "On" : "Off"}</button></div>
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
      fallbackFocus
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
    this.refreshChrome();
    this.showSettingsModal({
      preserveScroll: true,
      focusTarget: `setting-toggle:${setting}`
    });
  }

  startTargetMode(options) {
    this.modalRoot.classList.add("hidden");
    this.modalRoot.innerHTML = "";
    this.targetMode = {
      type: options.type,
      name: options.name,
      range: options.range || 8,
      allowFloor: options.allowFloor || false,
      callback: options.callback,
      cursor: options.cursor || findInitialTargetCursor(this, options.range || 8)
    };
    this.mode = "target";
    this.log(`Target ${options.name}. Confirm to fire, cancel to abort.`, "warning");
    this.render();
  }

  moveTargetCursor(dx, dy) {
    if (!this.targetMode) {
      return;
    }
    this.targetMode.cursor.x = clamp(this.targetMode.cursor.x + dx, 0, this.currentLevel.width - 1);
    this.targetMode.cursor.y = clamp(this.targetMode.cursor.y + dy, 0, this.currentLevel.height - 1);
    this.render();
  }

  confirmTargetSelection() {
    if (!this.targetMode) {
      return;
    }
    const cursor = { x: this.targetMode.cursor.x, y: this.targetMode.cursor.y };
    const range = this.targetMode.range;
    const targetActor = actorAt(this.currentLevel, cursor.x, cursor.y);
    const withinRange = distance(this.player, cursor) <= range;
    const los = hasLineOfSight(this.currentLevel, this.player.x, this.player.y, cursor.x, cursor.y);
    if (!withinRange || !los) {
      this.log("That target is out of line or out of range.", "warning");
      return;
    }
    if (!this.targetMode.allowFloor && !targetActor) {
      this.log("No target stands on that square.", "warning");
      return;
    }
    const callback = this.targetMode.callback;
    this.targetMode = null;
    this.mode = "game";
    this.renderBoard();
    callback(targetActor, cursor);
    this.render();
  }

  cancelTargetMode() {
    if (!this.targetMode) {
      return;
    }
    this.targetMode = null;
    this.mode = "game";
    this.log("Targeting cancelled.", "warning");
    this.render();
  }

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

  legacyPerformWaitUnused() {
    if (!this.player || this.mode !== "game") {
      return;
    }
    this.log(`${this.player.name} waits.`, "warning");
    this.audio.play("ui");
    this.makeNoise(3, this.player, "wait");
    this.endTurn();
  }

  legacyRestUntilSafeUnused() {
    if (!this.player || this.mode !== "game") {
      return;
    }
    let recovered = 0;
    let interrupted = false;
    for (let i = 0; i < 6; i += 1) {
      if (this.visibleEnemies().length > 0 || this.player.hp >= this.player.maxHp) {
        break;
      }
      if (this.makeNoise(4, this.player, "rest") > 0) {
        interrupted = true;
        break;
      }
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 1);
      this.player.mana = Math.min(this.player.maxMana, this.player.mana + 1);
      recovered += 1;
      this.endTurn(false);
    }
    this.log(interrupted ? "You try to rest, but the halls answer back." : recovered > 0 ? "You pause to recover your breath." : "You find no safe moment to rest.", interrupted ? "bad" : recovered > 0 ? "good" : "warning");
    this.render();
  }

  legacyVisibleEnemiesUnused() {
    return this.currentLevel.actors.filter((actor) => isVisible(this.currentLevel, actor.x, actor.y));
  }

  legacyMakeNoiseUnused(radius, source = this.player, reason = "noise") {
    if (!this.currentLevel || this.currentDepth === 0) {
      return 0;
    }
    let stirred = 0;
    this.currentLevel.actors.forEach((monster) => {
      const hears = distance(source, monster) <= radius || (distance(source, monster) <= radius + 2 && hasLineOfSight(this.currentLevel, source.x, source.y, monster.x, monster.y));
      if (!hears) {
        return;
      }
      if (monster.sleeping || monster.alerted < Math.max(4, radius - 1)) {
        stirred += 1;
      }
      monster.sleeping = false;
      monster.alerted = Math.max(monster.alerted || 0, Math.max(4, radius));
    });
    if (reason === "rest" && stirred > 0) {
      this.log("Your pause carries through the halls. Something is moving.", "bad");
    }
    return stirred;
  }

  legacyCanMonsterMoveToUnused(monster, x, y) {
    if (!inBounds(this.currentLevel, x, y)) {
      return false;
    }
    if (this.player.x === x && this.player.y === y) {
      return false;
    }
    const tile = getTile(this.currentLevel, x, y);
    const canPhase = monster.abilities && monster.abilities.includes("phase");
    if (actorAt(this.currentLevel, x, y)) {
      return false;
    }
    return (tile.walkable || (canPhase && tile.kind === "wall")) && !(tile.kind === "secretDoor" && tile.hidden);
  }

  legacyFindRetreatStepUnused(monster) {
    const options = [];
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) {
          continue;
        }
        const nx = monster.x + dx;
        const ny = monster.y + dy;
        if (!this.canMonsterMoveTo(monster, nx, ny)) {
          continue;
        }
        options.push({
          x: nx,
          y: ny,
          score: distance({ x: nx, y: ny }, this.player) + (hasLineOfSight(this.currentLevel, nx, ny, this.player.x, this.player.y) ? 1 : 0)
        });
      }
    }
    options.sort((a, b) => b.score - a.score);
    return options[0] || null;
  }

  legacyCanChargeUnused(monster, dx, dy, distanceToPlayer) {
    if (!monster.abilities || !monster.abilities.includes("charge")) {
      return false;
    }
    if (distanceToPlayer < 2 || distanceToPlayer > 4) {
      return false;
    }
    if (!(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy))) {
      return false;
    }
    return hasLineOfSight(this.currentLevel, monster.x, monster.y, this.player.x, this.player.y);
  }

  legacyApplyChargeUnused(monster) {
    if (!monster.chargeWindup) {
      return false;
    }
    const { dx, dy } = monster.chargeWindup;
    monster.chargeWindup = null;
    for (let step = 0; step < 2; step += 1) {
      const nx = monster.x + dx;
      const ny = monster.y + dy;
      if (nx === this.player.x && ny === this.player.y) {
        this.log(`${monster.name} slams into you.`, "bad");
        this.attack(monster, this.player);
        return true;
      }
      if (!this.canMonsterMoveTo(monster, nx, ny)) {
        return false;
      }
      monster.x = nx;
      monster.y = ny;
    }
    return true;
  }

  legacyGetMonsterIntentUnused(monster) {
    if (monster.sleeping) {
      return { type: "sleep", symbol: "z", color: "#8ea3b5" };
    }
    if (monster.chargeWindup) {
      return { type: "charge", symbol: "»", color: "#ff9f6b" };
    }
    const dx = this.player.x - monster.x;
    const dy = this.player.y - monster.y;
    const distanceToPlayer = Math.max(Math.abs(dx), Math.abs(dy));
    const canSeePlayer = distanceToPlayer <= 9 && hasLineOfSight(this.currentLevel, monster.x, monster.y, this.player.x, this.player.y);
    if (distanceToPlayer <= 1) {
      return { type: "melee", symbol: "!", color: "#ff6f6f" };
    }
    if (monster.ranged && canSeePlayer && distanceToPlayer <= monster.ranged.range) {
      if (distanceToPlayer <= 2) {
        return { type: "retreat", symbol: "‹", color: "#9fd0ff" };
      }
      return { type: "shoot", symbol: "*", color: "#ffd46b" };
    }
    if (monster.spells && canSeePlayer && monster.mana >= 4) {
      if (monster.abilities && monster.abilities.includes("summon")) {
        return { type: "summon", symbol: "+", color: "#d6a8ff" };
      }
      return { type: "hex", symbol: "~", color: "#c9b6ff" };
    }
    if (canSeePlayer && this.canCharge(monster, dx, dy, distanceToPlayer)) {
      return { type: "charge", symbol: "»", color: "#ff9f6b" };
    }
    if (monster.alerted > 0) {
      return { type: "advance", symbol: "!", color: "#f2deb1" };
    }
    return null;
  }

  legacyUpdateMonsterIntentsUnused() {
    if (!this.currentLevel) {
      return;
    }
    this.currentLevel.actors.forEach((monster) => {
      monster.intent = this.getMonsterIntent(monster);
    });
  }

  legacyAttackUnused(attacker, defender) {
    const isPlayer = attacker.id === "player";
    const attackScore = isPlayer ? 10 + this.getAttackValue() + Math.floor(this.player.level / 2) : attacker.attack;
    const defenseScore = defender.id === "player" ? this.getEvadeValue() + this.getArmorValue() : defender.defense;
    const rollHit = randInt(1, 20) + attackScore;
    this.makeNoise(isPlayer ? 5 : 4, attacker, "combat");
    if (rollHit < 10 + defenseScore) {
      this.log(`${attacker.name} misses ${defender.name}.`, "warning");
      this.audio.play("ui");
      if (defender && typeof defender.x === "number" && typeof defender.y === "number") {
        this.flashTile(defender.x, defender.y, "#f2deb1", 100, { alpha: 0.1, decorative: true });
      }
      return false;
    }
    const damage = isPlayer ? roll(...this.getDamageRange()) : roll(...attacker.damage);
    this.damageActor(attacker, defender, damage, "physical");
    return true;
  }

  legacyDamageActorUnused(attacker, defender, amount, damageType = "physical") {
    defender.hp -= amount;
    this.audio.play(defender.id === "player" ? "bad" : "hit");
    this.emitImpact(attacker, defender, this.getDamageEffectColor(damageType, defender), damageType);
    if (defender.id === "player") {
      this.log(`${attacker.name} hits ${defender.name} for ${amount}.`, "bad");
      if (attacker.abilities && attacker.abilities.includes("drain") && Math.random() < 0.3) {
        this.player.constitutionLoss = Math.min(this.player.stats.con - 1, (this.player.constitutionLoss || 0) + 1);
        this.recalculateDerivedStats();
        this.log("A chill passes through you. Your Constitution is leeched away.", "bad");
      }
      if (defender.hp <= 0) {
        this.player.hp = 0;
        this.handleDeath();
      }
      return;
    }

    this.log(`${attacker.name} hits ${defender.name} for ${amount}.`, attacker.id === "player" ? "good" : "bad");
    if (defender.hp <= 0) {
      this.killMonster(defender);
    }
  }

  legacyKillMonsterUnused(monster) {
    removeFromArray(this.currentLevel.actors, monster);
    this.emitDeathBurst(monster.x, monster.y, monster.color || "#f2deb1");
    const gold = randInt(monster.gold[0], monster.gold[1]);
    if (gold > 0) {
      this.currentLevel.items.push({ x: monster.x, y: monster.y, kind: "gold", name: "Gold", amount: gold });
    }
    if (Math.random() < 0.42) {
      this.currentLevel.items.push({ ...rollTreasure(this.currentDepth), x: monster.x, y: monster.y });
    }
    this.player.exp += monster.exp;
    this.log(`${monster.name} dies.`, "good");
    this.audio.play("good");
    this.flashTile(monster.x, monster.y, "#f2deb1", 180, { alpha: 0.16 });
    this.checkLevelUp();
  }

  legacyCheckLevelUpUnused() {
    while (this.player.exp >= this.player.nextLevelExp) {
      this.player.level += 1;
      this.player.nextLevelExp = Math.floor(this.player.nextLevelExp * 1.58);
      this.player.stats.str += randInt(0, 1);
      this.player.stats.dex += randInt(0, 1);
      this.player.stats.con += randInt(0, 1);
      this.player.stats.int += randInt(0, 1);
      this.recalculateDerivedStats();
      this.player.hp = this.player.maxHp;
      this.player.mana = this.player.maxMana;
      this.log(`${this.player.name} reaches level ${this.player.level}.`, "good");
      this.pulseScreen("rgba(214, 170, 88, 0.18)", 240, 0.16);
      this.pendingSpellChoices += 1;
    }

    if (this.pendingSpellChoices > 0) {
      if (this.getLearnableSpellOptions().length > 0) {
        this.showSpellLearnModal();
      } else {
        this.log("No additional spells are available to learn at this level.", "warning");
        this.pendingSpellChoices = 0;
      }
    }
  }

  legacyHandleDeathUnused() {
    this.mode = "modal";
    this.showSimpleModal("Fallen", `
      <div class="text-block">
        ${escapeHtml(this.player.name)} has fallen in ${escapeHtml(this.currentLevel.description)}.<br><br>
        Use <strong>New Game</strong> to begin again.
      </div>
    `);
    this.render();
  }

  legacyResolveTurnUnused(advanceTurn = true) {
    if (advanceTurn) {
      this.turn += 1;
    }
    const encumbrance = getEncumbranceTier(this.player);
    const hpRegenBase = encumbrance >= 2 ? 0.01 : encumbrance === 1 ? 0.02 : 0.03;
    const manaRegenBase = encumbrance >= 2 ? 0.02 : encumbrance === 1 ? 0.04 : 0.06;
    const hpRegen = hpRegenBase + Math.max(0, this.player.stats.con - 10) * 0.004;
    const manaRegen = manaRegenBase + Math.max(0, this.player.stats.int - 10) * 0.006;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + hpRegen);
    this.player.mana = Math.min(this.player.maxMana, this.player.mana + manaRegen);
    this.processMonsters();
    if (encumbrance >= 2 && this.currentDepth > 0) {
      this.processMonsters();
    }
    if ((this.player.slowed || 0) > 0) {
      this.player.slowed -= 1;
    }
    this.updateFov();
    this.updateMonsterIntents();
    this.checkQuestState();
    this.render();
  }

  legacyEndTurnUnused(advanceTurn = true) {
    if (this.pendingSpellChoices > 0) {
      this.pendingTurnResolution = advanceTurn;
      this.render();
      return;
    }
    this.resolveTurn(advanceTurn);
  }

  legacyProcessMonstersUnused() {
    const level = this.currentLevel;
    level.actors.forEach((monster) => {
      if (monster.sleeping) {
        const wakes = distance(this.player, monster) <= 3 || (isVisible(level, monster.x, monster.y) && Math.random() < 0.55);
        if (wakes) {
          monster.sleeping = false;
          monster.alerted = 4;
        } else {
          return;
        }
      }
      if (monster.slowed) {
        monster.slowed -= 1;
        if (this.turn % 2 === 0) {
          return;
        }
      }
      const dx = this.player.x - monster.x;
      const dy = this.player.y - monster.y;
      const distanceToPlayer = Math.max(Math.abs(dx), Math.abs(dy));
      const canSeePlayer = distanceToPlayer <= 9 && hasLineOfSight(level, monster.x, monster.y, this.player.x, this.player.y);
      if (canSeePlayer) {
        monster.alerted = 6;
        monster.sleeping = false;
      } else if (monster.alerted > 0) {
        monster.alerted -= 1;
      }

      if (monster.chargeWindup) {
        this.applyCharge(monster);
        return;
      }

      if (distanceToPlayer <= 1) {
        this.attack(monster, this.player);
        return;
      }

      if (monster.ranged && canSeePlayer && distanceToPlayer <= monster.ranged.range) {
        if (distanceToPlayer <= 2) {
          const retreat = this.findRetreatStep(monster);
          if (retreat) {
            monster.x = retreat.x;
            monster.y = retreat.y;
            return;
          }
        }
        if (Math.random() < 0.55) {
          this.playProjectile(monster, this.player, monster.ranged.color);
          this.log(`${monster.name} launches a ranged attack.`, "bad");
          this.audio.play("hit");
          this.damageActor(monster, this.player, roll(...monster.ranged.damage));
          return;
        }
      }

      if (monster.spells && canSeePlayer && monster.mana >= 4 && Math.random() < 0.24) {
        monster.mana -= 4;
        this.emitCastCircle(monster.x, monster.y, monster.abilities && monster.abilities.includes("summon") ? "#d6a8ff" : "#c9a5ff");
        if (monster.abilities && monster.abilities.includes("slow") && Math.random() < 0.35) {
          this.log(`${monster.name} casts a crippling spell.`, "bad");
          this.playProjectile(monster, this.player, "#bfd9ff");
          this.player.slowed = Math.max(this.player.slowed || 0, 2);
        } else {
          this.log(`${monster.name} hurls dark magic.`, "bad");
          this.playProjectile(monster, this.player, "#c9a5ff");
          this.damageActor(monster, this.player, roll(2, 5) + this.currentDepth);
        }
        if (monster.abilities && monster.abilities.includes("summon") && Math.random() < 0.25) {
          if (this.summonMonsterNearWithCap(monster.x, monster.y, weightedMonster(this.currentDepth))) {
            this.log(`${monster.name} calls for aid from the dark.`, "bad");
          }
        }
        if (monster.abilities && monster.abilities.includes("teleport") && Math.random() < 0.2) {
          const position = this.findSafeTile(level, 12);
          if (position) {
            monster.x = position.x;
            monster.y = position.y;
            this.addEffect({ type: "blink", x: monster.x, y: monster.y, color: "#ba8eff", until: nowTime() + 180 });
          }
        }
        return;
      }

      if (canSeePlayer && this.canCharge(monster, dx, dy, distanceToPlayer) && Math.random() < 0.4) {
        monster.chargeWindup = { dx: Math.sign(dx), dy: Math.sign(dy) };
        this.emitTelegraphPulse(monster.x, monster.y, "#ff9f6b", 260);
        if (isVisible(level, monster.x, monster.y)) {
          this.log(`${monster.name} lowers itself for a brutal rush.`, "warning");
        }
        return;
      }

      let stepX = 0;
      let stepY = 0;
      if (monster.alerted > 0) {
        if (monster.tactic === "skirmish" && distanceToPlayer <= 4) {
          const retreat = this.findRetreatStep(monster);
          if (retreat) {
            monster.x = retreat.x;
            monster.y = retreat.y;
            return;
          }
        }
        if (monster.tactic === "pack" && distanceToPlayer <= 5) {
          const flankLeft = this.canMonsterMoveTo(monster, monster.x + Math.sign(dx), monster.y);
          const flankRight = this.canMonsterMoveTo(monster, monster.x, monster.y + Math.sign(dy));
          if (flankLeft && flankRight && Math.random() < 0.5) {
            stepX = Math.sign(dx);
            stepY = 0;
          } else {
            stepX = Math.sign(dx);
            stepY = Math.sign(dy);
          }
        } else {
          stepX = Math.sign(dx);
          stepY = Math.sign(dy);
        }
      } else if (Math.random() < 0.55) {
        stepX = randInt(-1, 1);
        stepY = randInt(-1, 1);
      }

      if (stepX === 0 && stepY === 0) {
        return;
      }

      const nx = monster.x + stepX;
      const ny = monster.y + stepY;
      if (nx === this.player.x && ny === this.player.y) {
        this.attack(monster, this.player);
        return;
      }
      if (this.canMonsterMoveTo(monster, nx, ny)) {
        monster.x = nx;
        monster.y = ny;
      }
    });
  }

  legacyUseStairsUnused(direction) {
    const tile = getTile(this.currentLevel, this.player.x, this.player.y);
    if (direction === "down") {
      if (tile.kind !== "stairDown") {
        this.log("There are no stairs leading down here.", "warning");
        this.render();
        return;
      }
      const nextDepth = this.currentDepth + 1;
      if (nextDepth >= this.levels.length) {
        this.log("No deeper path opens here.", "warning");
        return;
      }
      this.currentDepth = nextDepth;
      this.player.deepestDepth = Math.max(this.player.deepestDepth, this.currentDepth);
      this.currentLevel = this.levels[nextDepth];
      this.placePlayerAt(this.currentLevel.stairsUp.x, this.currentLevel.stairsUp.y);
      this.addEffect({ type: "blink", x: this.player.x, y: this.player.y, color: "#ffd36b", duration: 200 });
      this.flashTile(this.player.x, this.player.y, "#ffd36b", 180, { alpha: 0.16 });
      this.pulseScreen("rgba(255, 211, 107, 0.14)", 180, 0.14);
      this.triggerStoryBeat(`depth-${nextDepth}`);
      this.log(`You descend to ${this.currentLevel.description}.`, "warning");
      this.audio.play("stairs");
      this.saveGame({ silent: true });
      this.render();
      return;
    }

    if (tile.kind !== "stairUp") {
      this.log("There are no stairs leading up here.", "warning");
      this.render();
      return;
    }
    const nextDepth = this.currentDepth - 1;
    if (nextDepth < 0) {
      this.log("You are already in town.", "warning");
      return;
    }
    this.currentDepth = nextDepth;
    this.currentLevel = this.levels[nextDepth];
    this.placePlayerAt(this.currentLevel.stairsDown.x, this.currentLevel.stairsDown.y);
    this.addEffect({ type: "blink", x: this.player.x, y: this.player.y, color: "#8bcde9", duration: 200 });
    this.flashTile(this.player.x, this.player.y, "#8bcde9", 180, { alpha: 0.16 });
    this.pulseScreen("rgba(139, 205, 233, 0.14)", 180, 0.14);
    if (nextDepth === 0) {
      this.refreshShopState(true);
    }
    this.log(`You climb to ${this.currentLevel.description}.`, "warning");
    this.audio.play("stairs");
    this.saveGame({ silent: true });
    this.render();
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

  getPickupBurdenPreview(item) {
    const beforeWeight = getCarryWeight(this.player);
    const capacity = getCarryCapacity(this.player);
    const afterWeight = beforeWeight + (item.weight || 0);
    const beforeUi = this.getBurdenUiState(beforeWeight, capacity);
    const afterUi = this.getBurdenUiState(afterWeight, capacity);
    return {
      beforeWeight,
      afterWeight,
      capacity,
      beforeUi,
      afterUi,
      beforeTier: getEncumbranceTier(this.player),
      afterTier: afterWeight > capacity ? 2 : afterWeight > capacity * 0.75 ? 1 : 0
    };
  }

  showPickupPrompt(item, turnPending = false) {
    const burden = this.getPickupBurdenPreview(item);
    const equipped = item.slot ? this.player.equipment[item.slot] : null;
    const canQuickEquip = Boolean(item.slot && (item.kind === "weapon" || item.kind === "armor") && !(equipped && equipped.cursed));
    const compareNote = equipped
      ? `Currently worn: ${this.describeItemReadout(equipped)}`
      : item.slot
        ? `Open ${this.getPackSlotDefinition(item.slot).label} slot.`
        : "This item will sit in your pack.";
    const burdenLabel = burden.afterUi.state !== burden.beforeUi.state
      ? burden.afterUi.state === "overloaded"
        ? "This will overload your carry limit."
        : burden.afterUi.state === "danger"
          ? "This pushes you into danger burden."
          : burden.afterUi.state === "warning"
            ? "This pushes you into warning burden."
            : "This is still a safe load."
      : "This is heavy enough to deserve a quick check.";
    this.pendingPickupPrompt = {
      item,
      turnPending,
      canQuickEquip
    };
    this.mode = "modal";
    this.showSimpleModal("Burden Check", `
      <div class="pickup-triage">
        <div class="pickup-triage-summary">
          <div class="pickup-triage-title">${escapeHtml(getItemName(item))}</div>
          <div class="pickup-triage-note">${escapeHtml(describeItem(item))}</div>
        </div>
        <div class="pickup-triage-grid">
          <div class="mini-panel"><strong>Type</strong><br>${escapeHtml(item.slot ? this.getPackSlotDefinition(item.slot).label : classifyItem(item))}</div>
          <div class="mini-panel"><strong>Weight</strong><br>${item.weight || 0}</div>
          <div class="mini-panel"><strong>Burden</strong><br>${burden.beforeWeight} / ${burden.capacity}</div>
          <div class="mini-panel"><strong>After Take</strong><br><span class="burden-${burden.afterUi.state}">${burden.afterWeight} / ${burden.capacity}</span></div>
        </div>
        <div class="text-block pickup-triage-copy">
          ${escapeHtml(burdenLabel)}<br><br>
          ${escapeHtml(compareNote)}
        </div>
        <div class="modal-actions pickup-triage-actions">
          <button class="action-button primary" data-action="pickup-confirm" type="button">Take It</button>
          ${canQuickEquip ? `<button class="action-button" data-action="pickup-equip" type="button">Take + Equip</button>` : ""}
          <button class="action-button" data-action="pickup-cancel" type="button">Leave It</button>
        </div>
      </div>
    `);
  }

  finishPickupTurn(turnPending) {
    if (turnPending) {
      this.endTurn();
    } else {
      this.render();
    }
  }

  resolvePickupItem(item) {
    removeFromArray(this.currentLevel.items, item);
    if (handleObjectivePickup(this, item)) {
      this.flashTile(item.x, item.y, "#9fd0ff", 170, { alpha: 0.2, rise: true });
      this.emitReadout("Objective", item.x, item.y, "#b7f0ff", 480);
      this.audio.play("good");
      return;
    }
    this.flashTile(item.x, item.y, item.kind === "quest" ? "#b7f0ff" : "#8bcde9", 170, { alpha: 0.16, rise: true });
    this.emitReadout(item.kind === "quest" ? "Runestone" : "Loot", item.x, item.y, item.kind === "quest" ? "#b7f0ff" : "#8bcde9", 420);
    this.addItemToInventory(item);
    if (item.kind === "quest") {
      this.player.quest.hasRunestone = true;
      this.log("You recover the Runestone of the Winds.", "good");
    } else {
      this.log(`You pick up ${this.describeItemReadout(item)}.`, "good");
      this.audio.play("good");
    }
    if (this.currentDepth > 0 && this.floorResolved) {
      this.markGreedAction("loot");
    }
  }

  confirmPendingPickup(equipOnTake = false) {
    const prompt = this.pendingPickupPrompt;
    if (!prompt) {
      return;
    }
    const { item, turnPending, canQuickEquip } = prompt;
    this.pendingPickupPrompt = null;
    this.closeModal();
    if (!this.currentLevel.items.includes(item)) {
      this.finishPickupTurn(turnPending);
      return;
    }
    this.resolvePickupItem(item);
    if (equipOnTake && canQuickEquip) {
      const index = this.player.inventory.indexOf(item);
      if (index >= 0) {
        this.equipInventoryItem(index, { openHub: false });
      }
    }
    this.finishPickupTurn(turnPending);
  }

  cancelPendingPickup() {
    const prompt = this.pendingPickupPrompt;
    if (!prompt) {
      return;
    }
    const { turnPending, item } = prompt;
    this.pendingPickupPrompt = null;
    this.closeModal();
    this.log(`You leave ${getItemName(item)} on the ground.`, "warning");
    this.finishPickupTurn(turnPending);
  }

  pickupHere(silent = false, turnPending = false) {
    const items = itemsAt(this.currentLevel, this.player.x, this.player.y);
    if (items.length === 0) {
      if (!silent) {
        this.log("Nothing here to pick up.", "warning");
        this.render();
      }
      return false;
    }

    for (const item of items.slice()) {
      if (item.kind === "gold") {
        removeFromArray(this.currentLevel.items, item);
        const bonus = this.player.equipment.amulet && this.player.equipment.amulet.goldBonus ? this.player.equipment.amulet.goldBonus : 0;
        const total = Math.round(item.amount * (1 + bonus));
        this.player.gold += total;
        this.flashTile(this.player.x, this.player.y, "#ebcf60", 160, { alpha: 0.18, rise: true });
        this.emitReadout(`+${total}g`, this.player.x, this.player.y, "#ebcf60", 420);
        this.log(`You collect ${total} gold.`, "good");
        this.audio.play("good");
        if (this.currentDepth > 0 && this.floorResolved) {
          this.markGreedAction("loot");
        }
        continue;
      }
      if (this.shouldPromptForPickup(item)) {
        this.showPickupPrompt(item, turnPending);
        this.render();
        return false;
      }
      this.resolvePickupItem(item);
    }
    this.render();
    return true;
  }

  addItemToInventory(item) {
    this.player.inventory.push(item);
  }

  useInventoryItem(index) {
    const item = this.player.inventory[Number(index)];
    if (!item) {
      return;
    }
    if (item.kind === "weapon" || item.kind === "armor") {
      this.equipInventoryItem(index);
      return;
    }
    if (item.kind === "spellbook") {
      item.identified = true;
      if (!this.player.spellsKnown.includes(item.spell)) {
        this.player.spellsKnown.push(item.spell);
        this.log(`You learn ${SPELLS[item.spell].name}.`, "good");
      } else {
        this.log("That spell is already known.", "warning");
      }
      removeAt(this.player.inventory, Number(index));
      this.recordTelemetry("item_used", {
        itemId: item.id || "spellbook",
        itemKind: item.kind,
        effect: "study",
        spellId: item.spell || ""
      });
      const nextSelection = this.getDefaultPackSelection(Number(index));
      this.showHubModal("pack", {
        selection: nextSelection,
        preserveScroll: true,
        focusTarget: nextSelection.type === "inventory"
          ? this.getPackItemFocusKey(nextSelection.value)
          : this.getPackSlotFocusKey(nextSelection.value)
      });
      this.render();
      return;
    }
    if (item.kind === "charged") {
      this.useChargedItem(index, item);
      return;
    }
    if (item.kind === "quest") {
      this.log("The runestone must be returned to town.", "warning");
      return;
    }

    switch (item.effect) {
      case "heal": {
        const before = this.player.hp;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + roll(2, 6));
        this.flashTile(this.player.x, this.player.y, "#8fdaa0", 190, { alpha: 0.18 });
        this.log(`You drink the potion and recover ${Math.round(this.player.hp - before)} hit points.`, "good");
        break;
      }
      case "mana": {
        const before = this.player.mana;
        this.player.mana = Math.min(this.player.maxMana, this.player.mana + roll(2, 5));
        this.flashTile(this.player.x, this.player.y, "#8bcde9", 190, { alpha: 0.18 });
        this.log(`Arcane strength returns: ${Math.round(this.player.mana - before)} mana restored.`, "good");
        break;
      }
      case "identify":
        {
          const count = this.identifyInventoryAndEquipment();
          this.log(count > 0 ? `The scroll identifies ${count} item${count === 1 ? "" : "s"}.` : "Everything you carry is already known.", "good");
        }
        break;
      case "mapping":
        revealAll(this.currentLevel);
        revealAllSecrets(this.currentLevel);
        this.log("A map unfurls across your thoughts.", "good");
        break;
      case "teleport": {
        const position = this.findSafeTile(this.currentLevel, 20);
        if (position) {
          this.player.x = position.x;
          this.player.y = position.y;
          this.addEffect({ type: "blink", x: position.x, y: position.y, color: "#ba8eff", duration: 180 });
          this.log("The scroll tears space and throws you elsewhere.", "good");
        }
        break;
      }
      case "removeCurse":
        this.log(this.removeCurses() > 0 ? "Sacred script breaks the curses on your belongings." : "The scroll finds no curse to break.", "good");
        break;
      case "runeReturn":
        if (!this.useRuneOfReturn({ source: "scroll" })) {
          return;
        }
        removeAt(this.player.inventory, Number(index));
        this.render();
        return;
        break;
      default:
        break;
    }
    this.recordTelemetry("item_used", {
      itemId: item.id || item.kind || "item",
      itemKind: item.kind || "consumable",
      effect: item.effect || ""
    });
    removeAt(this.player.inventory, Number(index));
    this.closeModal();
    this.endTurn();
  }

  useRuneOfReturn(options = {}) {
    const { source = "spell" } = options;
    if (!this.player || !this.levels || this.levels.length === 0) {
      return false;
    }

    if (this.currentDepth > 0) {
      if (this.mode === "modal") {
        this.closeModal();
      }
      const previousDepth = this.currentDepth;
      const previousLevel = this.currentLevel;
      this.log("The rune begins to answer. Hold fast for 5 turns.", "warning");
      for (let i = 0; i < 5; i += 1) {
        if (!this.player || this.isPlayerDead()) {
          return true;
        }
        const hpBefore = this.player.hp;
        this.endTurn();
        if (!this.player || this.isPlayerDead() || this.currentDepth === 0) {
          return true;
        }
        if (this.player.hp < hpBefore) {
          this.log("Pain breaks the rune's cadence. The return fails.", "bad");
          return true;
        }
      }
      this.currentDepth = 0;
      this.currentLevel = this.levels[0];
      if (previousLevel) {
        this.setTownReturnStingFromLevel(previousLevel, { depth: previousDepth });
      }
      this.placePlayerAt(this.currentLevel.start.x, this.currentLevel.start.y);
      this.addEffect({ type: "blink", x: this.player.x, y: this.player.y, color: "#8bcde9", duration: 200 });
      this.flashTile(this.player.x, this.player.y, "#8bcde9", 180, { alpha: 0.16 });
      this.pulseScreen("rgba(139, 205, 233, 0.14)", 180, 0.14);
      this.refreshShopState(true);
      this.log(source === "scroll" ? "The rune of return carries you safely back to town." : "The rune folds the dungeon away and returns you to town.", "good");
      this.recordTelemetry("returned_to_town", {
        source: source === "scroll" ? "rune_scroll" : "rune_spell",
        fromDepth: previousDepth,
        floorResolved: Boolean(previousLevel?.floorResolved),
        optionalTaken: Boolean(previousLevel?.floorOptional?.opened)
      });
      if (this.player.quest.hasRunestone) {
        this.checkQuestState();
      } else {
        this.maybeShowTownStoryScene();
      }
      return true;
    }

    const targetDepth = Math.max(0, Math.min(this.player.deepestDepth || 0, this.levels.length - 1));
    if (targetDepth <= 0) {
      this.log("The rune has nowhere deeper to return you yet.", "warning");
      return false;
    }

    this.currentDepth = targetDepth;
    this.currentLevel = this.levels[targetDepth];
    this.placePlayerAt(this.currentLevel.stairsUp.x, this.currentLevel.stairsUp.y);
    this.addEffect({ type: "blink", x: this.player.x, y: this.player.y, color: "#ffd36b", duration: 200 });
    this.flashTile(this.player.x, this.player.y, "#ffd36b", 180, { alpha: 0.16 });
    this.pulseScreen("rgba(255, 211, 107, 0.14)", 180, 0.14);
    this.triggerStoryBeat(`depth-${targetDepth}`);
    this.recordTelemetry("depth_entered", {
      depth: targetDepth,
      source: source === "scroll" ? "rune_scroll" : "rune_spell",
      objectiveId: this.currentLevel.floorObjective?.id || "",
      optionalId: this.currentLevel.floorOptional?.id || ""
    });
    this.recordChronicleEvent?.("floor_enter", { label: this.currentLevel.description });
    this.noteFloorIntro?.();
    this.log(`The rune answers your memory and returns you to ${this.currentLevel.description}.`, "good");
    return true;
  }

  useChargedItem(index, item) {
    if (!item.charges || item.charges <= 0) {
      this.log(`${getItemName(item)} is empty.`, "warning");
      return;
    }
    item.identified = true;
    switch (item.effect) {
      case "lightning":
        this.startTargetMode({
          type: "wand",
          name: getItemName(item, true),
          range: 8,
          callback: (target, cursor) => {
            if (!target) {
              return;
            }
            item.charges -= 1;
            this.emitCastCircle(this.player.x, this.player.y, "#b9d2ff");
            this.playProjectile(this.player, cursor, "#b9d2ff");
            this.log(`Lightning leaps from ${getItemName(item, true)}.`, "good");
            this.recordTelemetry("item_used", {
              itemId: item.id || "charged",
              itemKind: item.kind,
              effect: item.effect || "",
              targetId: target.id || ""
            });
            this.damageActor(this.player, target, roll(3, 6) + 2);
            this.closeModal();
            this.endTurn();
          }
        });
        break;
      case "slow":
        this.startTargetMode({
          type: "wand",
          name: getItemName(item, true),
          range: 8,
          callback: (target, cursor) => {
            if (!target) {
              return;
            }
            item.charges -= 1;
            target.slowed = Math.max(target.slowed || 0, 6);
            this.emitCastCircle(this.player.x, this.player.y, "#bfe3ff");
            this.playProjectile(this.player, cursor, "#bfe3ff");
            this.log(`${target.name} is slowed by a pale beam.`, "good");
            this.recordTelemetry("item_used", {
              itemId: item.id || "charged",
              itemKind: item.kind,
              effect: item.effect || "",
              targetId: target.id || ""
            });
            this.closeModal();
            this.endTurn();
          }
        });
        break;
      case "staffHeal":
        item.charges -= 1;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + roll(4, 6));
        this.emitCastCircle(this.player.x, this.player.y, "#8fdaa0");
        this.flashTile(this.player.x, this.player.y, "#8fdaa0", 180, { alpha: 0.18 });
        this.log("Healing power flows from the staff.", "good");
        this.audio.play("cast");
        this.recordTelemetry("item_used", {
          itemId: item.id || "charged",
          itemKind: item.kind,
          effect: item.effect || ""
        });
        this.closeModal();
        this.endTurn();
        break;
      default:
        return;
    }
  }

  equipInventoryItem(index, options = {}) {
    const item = this.player.inventory[Number(index)];
    if (!item || !(item.kind === "weapon" || item.kind === "armor")) {
      return;
    }
    const { openHub = true } = options;
    const existing = this.player.equipment[item.slot];
    if (existing && existing.cursed) {
      existing.identified = true;
      this.log(`${getItemName(existing, true)} is cursed and will not come off.`, "bad");
      if (openHub) {
        this.showHubModal("pack", {
          selection: { type: "slot", value: item.slot },
          preserveScroll: true,
          focusTarget: this.getPackActionFocusKey("use", Number(index))
        });
      }
      this.render();
      return;
    }
    if (existing) {
      this.player.inventory.push(existing);
    }
    this.player.equipment[item.slot] = item;
    item.identified = true;
    removeAt(this.player.inventory, Number(index));
    this.recalculateDerivedStats();
    this.log(`You equip ${getItemName(item, true)}.${item.cursed ? " It bites into you with a cursed grip." : ""}`, item.cursed ? "bad" : "good");
    if (openHub) {
      this.showHubModal("pack", {
        selection: { type: "slot", value: item.slot },
        preserveScroll: true,
        focusTarget: this.getPackActionFocusKey("unequip", item.slot)
      });
    }
    this.render();
  }

  dropInventoryItem(index) {
    const item = this.player.inventory[Number(index)];
    if (!item) {
      return;
    }
    item.x = this.player.x;
    item.y = this.player.y;
    this.currentLevel.items.push(item);
    removeAt(this.player.inventory, Number(index));
    this.log(`You drop ${getItemName(item, true)}.`, "warning");
    const nextSelection = this.getDefaultPackSelection(Number(index));
    this.showHubModal("pack", {
      selection: nextSelection,
      preserveScroll: true,
      focusTarget: nextSelection.type === "inventory"
        ? this.getPackItemFocusKey(nextSelection.value)
        : this.getPackSlotFocusKey(nextSelection.value)
    });
    this.render();
  }

  unequipSlot(slot) {
    const item = this.player.equipment[slot];
    if (!item) {
      return;
    }
    if (item.cursed) {
      item.identified = true;
      this.log(`${getItemName(item, true)} is cursed and will not come off.`, "bad");
      this.showHubModal("pack", {
        selection: { type: "slot", value: slot },
        preserveScroll: true,
        focusTarget: this.getPackActionFocusKey("unequip", slot)
      });
      this.render();
      return;
    }
    this.player.equipment[slot] = null;
    this.player.inventory.push(item);
    this.recalculateDerivedStats();
    this.log(`You stow ${getItemName(item, true)} in your pack.`, "good");
    this.showHubModal("pack", {
      selection: { type: "inventory", value: this.player.inventory.length - 1 },
      preserveScroll: true,
      focusTarget: this.getPackItemFocusKey(this.player.inventory.length - 1)
    });
    this.render();
  }

  prepareSpell(spellId) {
    const spell = SPELLS[spellId];
    if (!spell) {
      return;
    }
    const spellCost = getSpellCost(this, spell);
    const overcast = this.player.mana < spellCost;
    if (this.player.mana < spellCost) {
      const shortage = Math.max(0, getOvercastLoss(this, spellCost - this.player.mana) - this.getOvercastRelief());
      if (this.player.stats.con - (this.player.constitutionLoss || 0) <= shortage) {
        this.log("You lack the strength to overcast that spell safely.", "warning");
        return;
      }
      this.player.constitutionLoss += shortage;
      this.player.mana = 0;
      this.recalculateDerivedStats();
      this.log(`You overcast ${spell.name} and lose ${shortage} Constitution.`, "bad");
    } else {
      this.player.mana -= spellCost;
    }
    if (spell.target === "self") {
      this.emitCastCircle(this.player.x, this.player.y, spell.effectColor || "#ffca73");
      if (spell.cast(this, this.player)) {
        this.recordTelemetry("spell_cast", {
          spellId,
          overcast
        });
        this.audio.play("cast");
        if (spell.id === "runeOfReturn") {
          this.render();
          return;
        }
        this.closeModal();
        this.endTurn();
      }
      return;
    }
    this.startTargetMode({
      type: "spell",
      name: spell.name,
      range: spell.range || 8,
      callback: (target, cursor) => {
        this.emitCastCircle(this.player.x, this.player.y, spell.effectColor || "#ffca73");
        spell.cast(this, this.player, target || cursor);
        if (target || spell.allowFloorTarget) {
          this.playProjectile(this.player, cursor, spell.effectColor || "#ffca73");
        }
        this.recordTelemetry("spell_cast", {
          spellId,
          overcast,
          targetId: target?.id || ""
        });
        this.audio.play("cast");
        this.closeModal();
        this.endTurn();
      }
    });
  }

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

  buyShopItem(shopId, itemId) {
    const item = createTownItem(itemId);
    const price = getShopBuyPrice(this, item, shopId);
    if (this.player.gold < price) {
      this.log("You cannot afford that.", "warning");
      return;
    }
    this.player.gold -= price;
    this.addItemToInventory(item);
    this.recordTelemetry("shop_buy", {
      shopId,
      itemId,
      itemKind: item.kind || "",
      price
    });
    const shop = this.shopState[shopId];
    if (shop) {
      removeOne(shop.stock, itemId);
    }
    this.log(`Purchased ${getItemName(item, true)} for ${price} gold.`, "good");
    this.showShopModal(shopId, SHOPS[shopId], {
      preserveScroll: true,
      focusTarget: this.getShopBuyFocusKey(shopId, itemId)
    });
    this.render();
  }

  sellShopItem(index) {
    const item = this.player.inventory[Number(index)];
    if (!item) {
      return;
    }
    if (this.pendingShop && this.pendingShop.id !== "junk" && !shopAcceptsItem(this.pendingShop.id, item)) {
      this.log(`${this.pendingShop.name} refuses to buy that item type.`, "warning");
      return;
    }
    const price = getShopSellPrice(this, item, this.pendingShop?.id || "");
    this.player.gold += price;
    item.identified = true;
    this.recordTelemetry("shop_sell", {
      shopId: this.pendingShop?.id || "unknown",
      itemId: item.id || item.kind || "item",
      itemKind: item.kind || "",
      price
    });
    if (this.pendingShop && this.pendingShop.id !== "junk") {
      this.shopState[this.pendingShop.id].buyback.unshift(item.id);
      this.shopState[this.pendingShop.id].buyback = this.shopState[this.pendingShop.id].buyback.slice(0, 8);
    }
    removeAt(this.player.inventory, Number(index));
    this.log(`Sold ${getItemName(item, true)} for ${price} gold.`, "good");
    if (this.pendingShop) {
      this.showShopModal(this.pendingShop.id, this.pendingShop, {
        preserveScroll: true,
        focusTarget: this.getShopSellFocusKey(Number(index))
      });
    } else {
      this.closeModal();
    }
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
    if (this.storyFlags?.postReturnBankPrompt) {
      return "Bank first. Review your last return, arm a contract if needed, then decide whether this adventurer goes back north.";
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
    if (activeContract.id === "scholar_road") {
      this.levels.slice(1).forEach((level) => {
        if (!level?.guidance) {
          return;
        }
        level.guidance.searchRevealChunk = Math.max(level.guidance.searchRevealChunk || 0, (level.guidance.searchRevealChunk || 0) + 4);
      });
      this.player.maxHp = Math.max(10, this.player.maxHp - 4);
      this.player.hp = Math.min(this.player.hp, this.player.maxHp);
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

  getPersistenceArchive(limit = 5) {
    const archive = [...(this.runSummaryHistory || [])].slice(-limit).reverse();
    return archive;
  }

  getLatestPersistenceSummary() {
    return this.getPersistenceArchive(1)[0] || this.lastRunSummary || null;
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
          Greed: ${summary.greedCount} | Value: ${summary.returnValue} gp<br>
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
    return activeContract?.id === "greed_ledger" ? 1.4 : 1;
  }

  getGreedDangerBonus() {
    const activeContract = this.getActiveContract(true);
    return activeContract?.id === "greed_ledger" ? 1 : 0;
  }

  getGreedRumorBonus() {
    const activeContract = this.getActiveContract(true);
    return activeContract?.id === "greed_ledger" ? 1 : 0;
  }

  getSearchRevealBonus() {
    const activeContract = this.getActiveContract(true);
    return activeContract?.id === "scholar_road" ? 4 : 0;
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
    if (unlockContract(this, "scholar_road")) {
      this.runPersistenceChanges?.contractUnlocks.push("Scholar's Road");
      this.recordTelemetry("contract_unlocked", {
        contractId: "scholar_road"
      });
      unlockedContracts.push("Scholar's Road");
    }
    const persistentChanges = [
      ...((this.runPersistenceChanges?.masteryUnlocks || []).map((entry) => `Mastery: ${entry.name}`)),
      ...((this.runPersistenceChanges?.contractUnlocks || []).map((entry) => `Contract: ${entry}`))
    ];
    const summary = recordRunSummary(this, "extract", {
      extractedDepth: fromDepth || this.currentDepth,
      cause: level?.floorObjective?.id || "",
      persistentChanges,
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
    this.lastRunSummary = summary;
    if (masteryUnlock) {
      this.log(`Mastery unlocked: ${masteryUnlock.name}. ${masteryUnlock.description}`, "good");
    }
    if (unlockedContracts.length > 0) {
      this.log(`Contract unlocked: ${unlockedContracts.join(", ")}. Review it in the bank before starting the next run.`, "good");
    }
    return {
      summary,
      masteryUnlock,
      unlockedContracts
    };
  }

  handleRunDeath() {
    const latestMastery = (this.runPersistenceChanges?.masteryUnlocks || []).at(-1) || null;
    const unlockedContracts = [...(this.runPersistenceChanges?.contractUnlocks || [])];
    const summary = recordRunSummary(this, "death", {
      extractedDepth: this.currentDepth,
      cause: this.deathContext?.cause || "Unknown",
      persistentChanges: [
        ...((this.runPersistenceChanges?.masteryUnlocks || []).map((entry) => `Mastery: ${entry.name}`)),
        ...((this.runPersistenceChanges?.contractUnlocks || []).map((entry) => `Contract: ${entry}`))
      ],
      masteryAdvance: latestMastery,
      unlockedContracts
    });
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
          Searches: ${summary.searchCount} | Greed rooms: ${summary.greedCount} | Return value: ${summary.returnValue} gp<br><br>
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
          Active next-run contract: ${escapeHtml(this.getActiveContract(false)?.name || "No contract armed")}
        </div>
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

  identifyInventoryAndEquipment() {
    let count = 0;
    this.player.inventory.forEach((item) => {
      if (canIdentify(item) && !item.identified) {
        item.identified = true;
        count += 1;
      }
    });
    Object.values(this.player.equipment).forEach((item) => {
      if (item && canIdentify(item) && !item.identified) {
        item.identified = true;
        count += 1;
      }
    });
    return count;
  }

  removeCurses() {
    let count = 0;
    this.player.inventory.forEach((item) => {
      if (item.cursed) {
        item.cursed = false;
        item.identified = true;
        count += 1;
      }
    });
    Object.values(this.player.equipment).forEach((item) => {
      if (item && item.cursed) {
        item.cursed = false;
        item.identified = true;
        count += 1;
      }
    });
    return count;
  }

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
    return applyBoonReward(this, boonId);
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

  isFirstTownRun() {
    return Boolean(this.player && this.currentDepth === 0 && (this.player.deepestDepth || 0) === 0);
  }

  completeTownServiceTutorial(service) {
    if (!this.isFirstTownRun() || this.storyFlags.townServiceVisited) {
      return false;
    }
    this.storyFlags.townServiceVisited = true;
    this.storyFlags.firstTownGuidance = "keep";
    this.markOnboarding("visit_town_door");
    const label = service === "bank"
      ? "Bank"
      : service === "sage"
        ? "Sage"
        : SHOPS[service]?.name || "Town service";
    this.log(`${label} checked. Town support is live for this adventurer. The north road is next.`, "good");
    return true;
  }

  showBriefingModal() {
    if (!this.player) {
      return;
    }
    if (this.currentDepth === 0 && !this.hasSeenBriefing("intro")) {
      this.showStoryScene("intro");
      return;
    }
    this.mode = "modal";
    this.showSimpleModal("Briefing", `
      <div class="section-block text-block"><strong>${escapeHtml(this.getCurrentChapterObjective())}</strong></div>
      <div class="section-block text-block">${escapeHtml(this.getActiveBriefingText())}</div>
      ${this.currentDepth === 0 ? `<div class="section-block text-block muted">${escapeHtml(this.storyFlags.townServiceVisited ? "Town checked. Follow the north road when ready." : "Step onto one labeled town door, then follow the north road into the keep.")}</div>` : ""}
    `, {
      surfaceKey: "briefing"
    });
  }

  getTileActionPrompt(tile = this.player && this.currentLevel ? getTile(this.currentLevel, this.player.x, this.player.y) : null) {
    if (!this.player || !this.currentLevel || !tile) {
      return null;
    }
    if (this.isFirstTownRun() && !this.storyFlags.townServiceVisited) {
      return {
        label: "Town Task",
        detail: "Step onto any labeled town door once. Then take the north road.",
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

  legacySaveGameUnused(options = {}) {
    if (!this.player) {
      return;
    }
    const { silent = false } = options;
    const snapshot = {
      version: APP_VERSION,
      turn: this.turn,
      currentDepth: this.currentDepth,
      levels: this.levels,
      player: this.player,
      settings: this.settings,
      shopState: this.shopState,
      storyFlags: this.storyFlags,
      lastTownRefreshTurn: this.lastTownRefreshTurn,
      meta: {
        name: this.player.name,
        level: this.player.level,
        depth: this.currentDepth,
        savedAt: new Date().toISOString()
      }
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
    if (!silent) {
      this.log("Game saved to browser storage.", "good");
    }
    this.refreshChrome();
    this.render();
  }

  legacyLoadGameUnused() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      this.log("No saved game is available.", "warning");
      this.render();
      return;
    }
    const snapshot = JSON.parse(raw);
    this.turn = snapshot.turn;
    this.levels = normalizeLevels(snapshot.levels);
    this.player = normalizePlayer(snapshot.player);
    this.currentDepth = snapshot.currentDepth;
    this.currentLevel = this.levels[this.currentDepth];
    this.settings = { ...defaultSettings(), ...(snapshot.settings || this.settings) };
    saveSettings(this.settings);
    this.audio.updateSettings(this.settings);
    this.shopState = normalizeShopState(snapshot.shopState);
    this.storyFlags = snapshot.storyFlags || {};
    this.lastTownRefreshTurn = snapshot.lastTownRefreshTurn || 0;
    this.pendingSpellChoices = 0;
    this.pendingTurnResolution = null;
    this.mode = "game";
    this.pendingShop = null;
    this.pendingService = null;
    if (this.currentLevel?.kind === "dungeon" && !this.currentLevel.guidance) {
      this.prepareGuidedRouteState(this.currentLevel, this.currentDepth);
    }
    this.recalculateDerivedStats();
    this.closeModal();
    this.updateFov();
    this.applyIntroFloorRecon();
    this.updateMonsterIntents();
    this.log("Saved game restored.", "good");
    this.refreshChrome();
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

  legacyShowTitleScreenUnused() {
    this.mode = "title";
    this.setModalVisibility(true);
    const template = document.getElementById("title-template");
    const fragment = template.content.cloneNode(true);
    const saveSummary = fragment.getElementById("title-save-summary");
    const loadButton = fragment.getElementById("title-load-button");
    const savedMeta = this.getSavedRunMeta();

    if (savedMeta) {
      saveSummary.innerHTML = `
        <div class="title-save-label">Continue Run</div>
        <div class="title-save-name">${escapeHtml(savedMeta.name)}</div>
        <div class="title-save-meta">Level ${savedMeta.level} · Depth ${savedMeta.depth}</div>
      `;
    } else {
      saveSummary.innerHTML = `
        <div class="title-save-label">No Saved Run</div>
        <div class="title-save-meta">Start a fresh descent and your latest run will appear here.</div>
      `;
      loadButton.disabled = true;
    }

    this.modalRoot.innerHTML = "";
    this.modalRoot.appendChild(fragment);
    this.modalRoot.classList.remove("hidden");
    this.refreshChrome();
  }

  legacyShowCreationModalUnused() {
    this.mode = "creation";
    this.setModalVisibility(true);
    const template = document.getElementById("creation-template");
    const fragment = template.content.cloneNode(true);
    const raceChoice = fragment.getElementById("race-choice");
    const classChoice = fragment.getElementById("class-choice");
    const preview = fragment.getElementById("creation-preview");

    RACES.forEach((race) => raceChoice.appendChild(choiceCard(race, "race", race.id === this.selectedRace)));
    CLASSES.forEach((role) => classChoice.appendChild(choiceCard(role, "class", role.id === this.selectedClass)));

    const race = getRace(this.selectedRace);
    const role = getClass(this.selectedClass);
    preview.innerHTML = `
      <div class="section-block"><span class="pill">${escapeHtml(race.name)}</span><span class="pill">${escapeHtml(role.name)}</span></div>
      <div class="section-block muted">${escapeHtml(race.summary)} ${escapeHtml(role.summary)}</div>
      <div class="stat-grid">
        <div class="stat-line"><span>Strength</span><strong>${race.stats.str + role.bonuses.str}</strong></div>
        <div class="stat-line"><span>Dexterity</span><strong>${race.stats.dex + role.bonuses.dex}</strong></div>
        <div class="stat-line"><span>Constitution</span><strong>${race.stats.con + role.bonuses.con}</strong></div>
        <div class="stat-line"><span>Intelligence</span><strong>${race.stats.int + role.bonuses.int}</strong></div>
        <div class="stat-line"><span>Hit Points</span><strong>${race.hp + role.bonuses.hp + race.stats.con + role.bonuses.con}</strong></div>
        <div class="stat-line"><span>Mana</span><strong>${race.mana + role.bonuses.mana + Math.floor((race.stats.int + role.bonuses.int) / 2)}</strong></div>
      </div>
    `;

    this.modalRoot.innerHTML = "";
    this.modalRoot.appendChild(fragment);
    this.modalRoot.classList.remove("hidden");
  }

  legacyShowTitleScreenModuleMigrated() {
    this.mode = "title";
    this.setModalVisibility(true);
    const template = document.getElementById("title-template");
    const fragment = template.content.cloneNode(true);
    const saveSummary = fragment.getElementById("title-save-summary");
    const loadButton = fragment.getElementById("title-load-button");
    const savedMeta = this.getSavedRunMeta();

    if (savedMeta) {
      const savedTime = savedMeta.savedAt ? this.formatSaveStamp(savedMeta.savedAt) : null;
      saveSummary.innerHTML = `
        <div class="title-save-label">Continue Run</div>
        <div class="title-save-name">${escapeHtml(savedMeta.name)}</div>
        <div class="title-save-meta">Level ${savedMeta.level} · Depth ${savedMeta.depth}</div>
        ${savedTime ? `<div class="title-save-meta">${escapeHtml(savedTime)}</div>` : ""}
      `;
    } else {
      saveSummary.innerHTML = `
        <div class="title-save-label">No Saved Run</div>
        <div class="title-save-meta">Start a fresh descent and your latest run will appear here.</div>
      `;
      loadButton.disabled = true;
    }

    this.modalRoot.innerHTML = "";
    this.modalRoot.appendChild(fragment);
    this.modalRoot.classList.remove("hidden");
    this.refreshChrome();
  }

  legacyShowCreationModalModuleMigrated() {
    this.mode = "creation";
    this.setModalVisibility(true);
    const template = document.getElementById("creation-template");
    const fragment = template.content.cloneNode(true);
    const nameInput = fragment.getElementById("hero-name");
    const raceChoice = fragment.getElementById("race-choice");
    const classChoice = fragment.getElementById("class-choice");
    const statPoints = fragment.getElementById("creation-stat-points");
    const statAllocation = fragment.getElementById("creation-stat-allocation");
    const preview = fragment.getElementById("creation-preview");

    nameInput.value = this.creationName;
    RACES.forEach((race) => raceChoice.appendChild(choiceCard(race, "race", race.id === this.selectedRace)));
    CLASSES.forEach((role) => classChoice.appendChild(choiceCard(role, "class", role.id === this.selectedClass)));

    const race = getRace(this.selectedRace);
    const role = getClass(this.selectedClass);
    const stats = this.getCreationStats();
    const pointsRemaining = this.getCreationPointsRemaining();
    const previewHp = this.getMaxHpForStats(stats, 1, role.name, 0, race.hp + role.bonuses.hp);
    const previewMana = this.getMaxManaForStats(stats, role.name, 0, race.mana + role.bonuses.mana);
    const [damageLow, damageHigh] = this.getDamageRangeForStats(stats, 2);

    statPoints.innerHTML = `Training points remaining: <strong>${pointsRemaining}</strong>`;
    statAllocation.innerHTML = CREATION_STAT_KEYS.map((stat) => `
      <div class="creation-stat-row">
        <div class="creation-stat-copy">
          <div class="creation-stat-title">${CREATION_STAT_LABELS[stat]}</div>
          <div class="creation-stat-notes">
            <span>${escapeHtml(CREATION_STAT_NOTES[stat])}</span>
          </div>
        </div>
        <div class="creation-stat-stepper">
          <button class="tiny-button creation-stat-button" data-action="creation-adjust-stat" data-stat="${stat}" data-delta="-1" type="button" ${this.creationStatBonuses[stat] <= 0 ? "disabled" : ""}>-</button>
          <div class="creation-stat-value">${stats[stat]}</div>
          <button class="tiny-button creation-stat-button" data-action="creation-adjust-stat" data-stat="${stat}" data-delta="1" type="button" ${(pointsRemaining <= 0 || this.creationStatBonuses[stat] >= CREATION_STAT_POINT_CAP) ? "disabled" : ""}>+</button>
        </div>
      </div>
    `).join("");

    preview.innerHTML = `
      <div class="section-block"><span class="pill">${escapeHtml(race.name)}</span><span class="pill">${escapeHtml(role.name)}</span></div>
      <div class="section-block muted">${escapeHtml(race.summary)} ${escapeHtml(role.summary)}</div>
      <div class="stat-grid">
        <div class="stat-line"><span>Strength</span><strong>${stats.str}</strong></div>
        <div class="stat-line"><span>Dexterity</span><strong>${stats.dex}</strong></div>
        <div class="stat-line"><span>Constitution</span><strong>${stats.con}</strong></div>
        <div class="stat-line"><span>Intelligence</span><strong>${stats.int}</strong></div>
        <div class="stat-line"><span>Hit Points</span><strong>${previewHp}</strong></div>
        <div class="stat-line"><span>Mana</span><strong>${previewMana}</strong></div>
        <div class="stat-line"><span>Attack</span><strong>${this.getAttackValueForStats(stats, 2)}</strong></div>
        <div class="stat-line"><span>Damage</span><strong>${damageLow}-${damageHigh}</strong></div>
        <div class="stat-line"><span>Evade</span><strong>${this.getEvadeValueForStats(stats)}</strong></div>
        <div class="stat-line"><span>Armor</span><strong>${this.getArmorValueForStats(stats)}</strong></div>
        <div class="stat-line"><span>Search</span><strong>${this.getSearchRadiusForStats(stats)} tiles</strong></div>
        <div class="stat-line"><span>Carry</span><strong>${getCarryCapacity({ stats })}</strong></div>
      </div>
    `;

    this.modalRoot.innerHTML = "";
    this.modalRoot.appendChild(fragment);
    this.modalRoot.classList.remove("hidden");
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

    this.mode = "levelup";
    this.setModalVisibility(true);
    this.modalRoot.innerHTML = `
      <div class="modal mobile-sheet modal-large">
        <div class="modal-title">Spell Study</div>
        <div class="section-block text-block">
          ${escapeHtml(this.player.name)} has reached level ${this.player.level}. Choose ${this.pendingSpellChoices > 1 ? "a spell for this level and then choose another." : "a new spell to learn."}
        </div>
        <div class="spell-learn-grid">
          ${options.map((spell) => `
            <button class="spell-learn-card" data-action="learn-spell" data-spell="${spell.id}" data-focus-key="learn-spell:${spell.id}" type="button">
              <span class="spell-learn-tier">${escapeHtml(`${spell.classAffinity === "shared" ? "Shared" : capitalize(spell.classAffinity || "shared")} · Tier ${spell.tier || 1}`)}</span>
              <span class="spell-learn-name">${escapeHtml(spell.name)}</span>
              <span class="spell-learn-meta">${escapeHtml(`${spell.school || "spell"} · ${spell.target === "monster" ? `Range ${spell.range || 1}` : "Self cast"} · ${getSpellCost(this, spell)} mana`)}</span>
              <span class="spell-learn-copy">${escapeHtml(spell.description)}</span>
            </button>
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
      fallbackFocus = true
    } = options;
    this.setModalVisibility(true);
    const previousState = preserveScroll ? this.captureModalRefreshState(surfaceKey) : null;
    const template = document.getElementById("list-modal-template");
    const fragment = template.content.cloneNode(true);
    fragment.getElementById("generic-modal-title").textContent = title;
    fragment.getElementById("generic-modal-body").innerHTML = bodyHtml;
    this.modalRoot.innerHTML = "";
    this.modalRoot.appendChild(fragment);
    this.modalRoot.classList.remove("hidden");
    this.modalSurfaceKey = surfaceKey;
    this.recordTelemetry("modal_opened", {
      surface: surfaceKey || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    });
    this.applyControllerNavigationMetadata();
    const nextModal = this.getModalElement();
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

  getPackSlotDefinitions() {
    return [
      { slot: "cloak", label: "Cloak", emptyText: "Back slot for cloaks and wraps.", area: "cloak" },
      { slot: "head", label: "Head", emptyText: "Helms, hoods, and crowns.", area: "head" },
      { slot: "amulet", label: "Amulet", emptyText: "Charms worn at the neck.", area: "amulet" },
      { slot: "weapon", label: "Weapon", emptyText: "Your main striking hand.", area: "weapon" },
      { slot: "body", label: "Armor", emptyText: "Chest armor and robes.", area: "armor" },
      { slot: "offhand", label: "Offhand", emptyText: "Shield or focus carried opposite the weapon.", area: "offhand" },
      { slot: "ring", label: "Ring", emptyText: "One active ring slot.", area: "ring" },
      { slot: "feet", label: "Feet", emptyText: "Boots and travel footwear.", area: "feet" }
    ];
  }

  getPackSlotDefinition(slot) {
    return this.getPackSlotDefinitions().find((entry) => entry.slot === slot) || { slot, label: capitalize(slot), emptyText: "Unused slot.", area: slot };
  }

  getHubTabFocusKey(tabId) {
    return `hub:tab:${tabId}`;
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
      if (item.slot === slot) {
        matches.push(index);
      }
      return matches;
    }, []);
  }

  getPackSelectionModel() {
    const selection = this.resolvePackSelection();
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
        deltas: [],
        weightDelta: 0,
        encumbrancePreview: this.describeBurdenPreview(0)
      };
    }

    const equipped = this.player.equipment[item.slot] || null;
    if (!equipped) {
      const weightDelta = item.weight || 0;
      return {
        equipped: null,
        deltas: [],
        weightDelta,
        encumbrancePreview: this.describeBurdenPreview(weightDelta)
      };
    }

    const deltas = [
      this.buildComparisonDelta("Attack", getItemPower(item) - getItemPower(equipped)),
      this.buildComparisonDelta("Armor", getItemArmor(item) - getItemArmor(equipped)),
      this.buildComparisonDelta("Accuracy", getItemAccuracyBonus(item) - getItemAccuracyBonus(equipped)),
      this.buildComparisonDelta("Crit", getItemCritBonus(item) - getItemCritBonus(equipped)),
      this.buildComparisonDelta("Guard", getItemGuardBonus(item) - getItemGuardBonus(equipped)),
      this.buildComparisonDelta("Ward", getItemWardBonus(item) - getItemWardBonus(equipped)),
      this.buildComparisonDelta("Mana", getItemManaBonus(item) - getItemManaBonus(equipped)),
      this.buildComparisonDelta("Dex", getItemDexBonus(item) - getItemDexBonus(equipped)),
      this.buildComparisonDelta("Sight", getItemLightBonus(item) - getItemLightBonus(equipped)),
      this.buildComparisonDelta("Search", getItemSearchBonus(item) - getItemSearchBonus(equipped)),
      this.buildComparisonDelta("Fire Resist", getItemFireResist(item) - getItemFireResist(equipped)),
      this.buildComparisonDelta("Cold Resist", getItemColdResist(item) - getItemColdResist(equipped)),
      this.buildComparisonDelta("Weight", (item.weight || 0) - (equipped.weight || 0), true)
    ].filter(Boolean);

    const weightDelta = (item.weight || 0) - (equipped.weight || 0);
    return {
      equipped,
      deltas,
      weightDelta,
      encumbrancePreview: this.describeBurdenPreview(weightDelta)
    };
  }

  getItemBadgeMarkup(item, semanticEntry = null, model = null) {
    const badges = [
      `<span class="item-chip kind-chip">${escapeHtml(item.kindLabel || semanticEntry?.kindLabel || classifyItem(item))}</span>`
    ];
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
    if (getItemDexBonus(item)) {
      badges.push(`<span class="item-chip">Dex +${getItemDexBonus(item)}</span>`);
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
        <div class="pack-group-list">
          ${group.items.map((entry) => `
            <button class="pack-item-row${selectedIndex === entry.index || entry.isSelected ? " active" : ""}" data-action="inspect-pack-item" data-index="${entry.index}" data-focus-key="${this.getPackItemFocusKey(entry.index)}" type="button">
              <span class="pack-item-head">
                <span class="pack-item-name">${escapeHtml(getItemName(entry.item))}</span>
                ${entry.count > 1 ? `<span class="pack-item-stack">x${entry.count}</span>` : ""}
              </span>
              <span class="pack-item-meta">${escapeHtml(this.getPackItemMeta(entry.item, entry))}</span>
              <span class="pack-item-reason">${escapeHtml(entry.reason)}</span>
              <span class="pack-item-note">${escapeHtml(this.getPackItemNote(entry.item, entry))}</span>
            </button>
          `).join("")}
        </div>
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
    const slotSummary = model.selection.type === "slot" ? buildEquipmentSlotSummary(this, model.slotDef, model.compatibleIndexes.length) : null;
    const recommendation = selectedEntry?.recommendation || slotSummary?.recommendation || "Keep";
    const reason = selectedEntry?.reason || slotSummary?.reason || describeItem(item);
    const riskCallout = this.getSemanticRiskCallout(item, selectedEntry, model, slotSummary);
    const statLines = [
      item.kind === "weapon" ? `Attack ${getItemPower(item)}` : "",
      item.kind === "armor" ? `Armor ${getItemArmor(item)}` : "",
      getItemAccuracyBonus(item) ? `Accuracy ${getItemAccuracyBonus(item) > 0 ? `+${getItemAccuracyBonus(item)}` : getItemAccuracyBonus(item)}` : "",
      getItemCritBonus(item) ? `Crit +${getItemCritBonus(item)}` : "",
      getItemGuardBonus(item) ? `Guard ${getItemGuardBonus(item)}` : "",
      getItemWardBonus(item) ? `Ward ${getItemWardBonus(item)}` : "",
      getItemManaBonus(item) ? `Mana +${getItemManaBonus(item)}` : "",
      getItemDexBonus(item) ? `Dex +${getItemDexBonus(item)}` : "",
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
          : ""}
        <button class="menu-button" data-action="item-drop" data-index="${model.selection.value}" data-focus-key="${this.getPackActionFocusKey("drop", model.selection.value)}" type="button">Drop</button>
      `
      : `
        <button class="menu-button pack-action-primary is-active" data-action="unequip-slot" data-slot="${model.selection.value}" data-focus-key="${this.getPackActionFocusKey("unequip", model.selection.value)}" type="button"${item.cursed ? " disabled" : ""}>Unequip</button>
      `;

    const equippedSwap = model.selection.type === "inventory" && item.slot && this.player.equipment[item.slot]
      ? `<div class="pack-inspector-note">Equips over ${escapeHtml(getItemName(this.player.equipment[item.slot], true))}.</div>`
      : "";

    const cursedNote = model.selection.type === "slot" && item.cursed
      ? `<div class="pack-inspector-note bad-note">${escapeHtml(getItemName(item, true))} is cursed and cannot be removed yet.</div>`
      : "";

    const comparisonBlock = model.selection.type === "inventory" && model.comparison?.equipped
      ? `
        <div class="pack-comparison-card">
          <div class="pack-comparison-title">Compare vs ${escapeHtml(getItemName(model.comparison.equipped, true))}</div>
          <div class="pack-comparison-list">
            ${model.comparison.deltas.length > 0
              ? model.comparison.deltas.map((entry) => `<div class="pack-comparison-row value-${entry.tone}">${escapeHtml(entry.text)}</div>`).join("")
              : `<div class="pack-comparison-row muted">No practical change.</div>`}
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
        <div class="pack-inspector-card">
          <div class="pack-inspector-kicker">${escapeHtml(recommendation)}</div>
          <div class="pack-inspector-title">${escapeHtml(getItemName(item))}</div>
          <div class="pack-inspector-summary">
            <span class="pack-decision-chip">${escapeHtml(model.slotDef ? model.slotDef.label : selectedEntry?.kindLabel || classifyItem(item))}</span>
            <span class="pack-decision-reason">${escapeHtml(reason)}</span>
          </div>
          <div class="pack-item-badges">${this.getItemBadgeMarkup(item, selectedEntry, model)}</div>
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
      { id: "journal", label: "Journal" }
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
      const compatibleCount = inventoryModel.entries.filter((entry) => entry.item.slot === slotDef.slot && entry.recommendation === "Equip").length;
      const slotSummary = buildEquipmentSlotSummary(this, slotDef, compatibleCount);
      const isActive = model.selection.type === "slot" && model.selection.value === slotDef.slot;
      return `
        <button class="paper-slot slot-${slotDef.area}${isActive ? " active" : ""}" data-action="inspect-slot" data-slot="${slotDef.slot}" data-focus-key="${this.getPackSlotFocusKey(slotDef.slot)}" type="button">
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
    const rows = this.player.spellsKnown.length === 0
      ? `<div class="text-block">No spells are known.</div>`
      : this.player.spellsKnown.map((spellId) => {
        const spell = SPELLS[spellId];
        const targetLabel = spell.target === "monster" ? `Range ${spell.range || 1}` : "Self cast";
        const manaCost = getSpellCost(this, spell);
        const overcast = this.player.mana < manaCost;
        return `
          <article class="magic-card">
            <div class="magic-card-header">
              <div class="magic-card-title">${escapeHtml(spell.name)}</div>
              <div class="magic-card-cost${overcast ? " warning" : ""}">${manaCost} mana${overcast ? " / overcast" : ""}</div>
            </div>
            <div class="magic-card-meta">${escapeHtml(`Tier ${spell.tier || 1} ${spell.school || "spell"} · ${targetLabel}`)}</div>
            <div class="magic-card-copy">${escapeHtml(spell.description)}</div>
            <div class="magic-card-actions">
              <button class="menu-button pack-action-primary" data-action="spell-cast" data-spell="${spellId}" data-focus-key="hub:spell:${spellId}" type="button">Cast</button>
            </div>
          </article>
        `;
      }).join("");

    return `
      <div class="hub-body hub-body-magic">
        <div class="hub-summary hub-summary-compact">
          <div class="mini-panel"><strong>Mana</strong><br>${Math.floor(this.player.mana)} / ${this.player.maxMana}</div>
          <div class="mini-panel"><strong>Known</strong><br>${this.player.spellsKnown.length}</div>
          <div class="mini-panel"><strong>Overcast</strong><br>${this.player.mana > 0 ? "Available" : "Risky"}</div>
        </div>
        <section class="hub-section">
          <div class="panel-title">Spell Book</div>
          <div class="text-block magic-intro">Self casts resolve immediately. Targeted spells switch to aiming mode.</div>
          <div class="magic-grid">${rows}</div>
        </section>
      </div>
    `;
  }

  getJournalHubMarkup() {
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

    return `
      <div class="hub-body">
        <div class="hub-summary">
          <div class="mini-panel"><strong>Depth</strong><br>${this.currentDepth}</div>
          <div class="mini-panel"><strong>Turn</strong><br>${this.turn}</div>
          <div class="mini-panel"><strong>Cycle</strong><br>${escapeHtml(this.getTownCycleLabel())}</div>
          <div class="mini-panel"><strong>Explored</strong><br>${getExploredPercent(this.currentLevel)}%</div>
          <div class="mini-panel"><strong>Deepest</strong><br>${this.player.deepestDepth}</div>
        </div>
        <section class="hub-section">
          <div class="panel-title">Story</div>
          <div class="text-block">
            ${escapeHtml(currentChapter)}<br><br>
            ${escapeHtml(activeBriefing)}<br><br>
            ${escapeHtml(milestoneJournal)}
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Objective Loop</div>
          <div class="text-block">
            <strong>${escapeHtml(this.currentLevel.description)}</strong><br>
            ${escapeHtml(objectiveText)}<br><br>
            ${escapeHtml(optionalText || questState)}<br><br>
            ${escapeHtml(milestoneSummary)}${roomEvent ? `<br><br>${escapeHtml(`Signature room: ${roomEvent.label}. ${roomEvent.summary}`)}` : ""}
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Pressure</div>
          <div class="text-block">
            ${escapeHtml(dangerText)}<br>
            ${escapeHtml(this.currentLevel?.encounterSummary || "The floor is still quiet enough to read.")}
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
          <div class="panel-title">Town Cycle</div>
          <div class="text-block">
            ${escapeHtml(this.getTownCycleLabel())}<br>
            ${escapeHtml(townCycle.turnsUntilRefresh === 1 ? "Next market turnover in 1 turn." : `Next market turnover in ${townCycle.turnsUntilRefresh} turns.`)}<br><br>
            ${escapeHtml(townCycle.stockSummary)}<br>
            ${escapeHtml(townCycle.rumorSummary)}<br><br>
            ${escapeHtml(featuredStockSummary || "No featured market picks are posted yet.")}
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Discoveries</div>
          <div class="text-block">
            ${discoverySummary.length > 0
              ? discoverySummary.map((line) => escapeHtml(line)).join("<br><br>")
              : "No written fragments recovered yet."}
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Run Build</div>
          <div class="text-block">
            ${buildSummary.length > 0 ? escapeHtml(buildSummary.join(", ")) : "No perks or relics claimed yet."}<br><br>
            ${escapeHtml(getObjectiveRewardPreview(this.currentLevel) || "No objective reward preview available.")}
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Floor Rewards</div>
          <div class="text-block">
            ${escapeHtml(getObjectiveRewardPreview(this.currentLevel) || "No floor reward preview available.")}<br><br>
            ${latestSummary
              ? escapeHtml(`Last return: depth ${latestSummary.extractedDepth}, ${latestSummary.greedCount} greed room${latestSummary.greedCount === 1 ? "" : "s"}, ${latestSummary.returnValue} gp banked or carried.`)
              : "No banked return summary yet."}
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
          <div class="panel-title">Named Loot</div>
          <div class="text-block">
            ${namedLootSummary.length > 0
              ? namedLootSummary.map((line) => escapeHtml(line)).join("<br>")
              : "No signature finds claimed yet."}
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
        <section class="hub-section utility-row">
          <button class="menu-button" data-action="save-game" data-focus-key="journal:save" type="button">Save</button>
          <button class="menu-button" data-action="load-game" data-focus-key="journal:load" type="button">Load</button>
          <button class="menu-button" data-action="export-telemetry" data-focus-key="journal:trace" type="button">Export Trace</button>
          <button class="menu-button" data-action="settings" data-focus-key="journal:settings" type="button">Settings</button>
          <button class="menu-button" data-action="help" data-focus-key="journal:help" type="button">Help</button>
        </section>
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
      fallbackFocus = true
    } = options;
    this.mode = "modal";
    this.activeHubTab = ["pack", "magic", "journal"].includes(defaultTab) ? defaultTab : "pack";
    this.recordTelemetry(this.activeHubTab === "magic"
      ? "magic_opened"
      : this.activeHubTab === "journal"
        ? "journal_opened"
        : "pack_opened");
    if (this.activeHubTab === "pack") {
      this.setPackSelection(selection || this.activePackSelection || this.getDefaultPackSelection());
      this.resolvePackSelection();
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
        ? "Journal"
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

  showShopModal(shopId, shop, options = {}) {
    const {
      preserveScroll = false,
      focusTarget = null,
      fallbackFocus = true
    } = options;
    this.mode = "modal";
    this.pendingShop = { ...shop, id: shopId };
    this.pendingService = null;
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
    const stockRows = liveStock.length === 0
      ? `<div class="text-block muted">The shelves are empty. Fresh stock arrives in ${escapeHtml(turnoverLabel)}.</div>`
      : liveStock.map((itemId) => {
        const item = createTownItem(itemId);
        const price = getShopBuyPrice(this, item, shopId);
        const disabled = this.player.gold < price ? "disabled" : "";
        return `
          <div class="shop-row">
            <div>
              <div><strong>${escapeHtml(getItemName(item, true))}</strong> <span class="muted">${price} gp</span></div>
              <div class="muted">${escapeHtml(describeItem(item))}</div>
            </div>
            <div class="actions">
              <button class="tiny-button" data-action="shop-buy" data-shop="${shopId}" data-item="${itemId}" data-focus-key="${this.getShopBuyFocusKey(shopId, itemId)}" type="button" ${disabled}>Buy</button>
            </div>
          </div>
        `;
      }).join("");

    const sellModel = buildInventoryPresentationModel(this, {
      filter: "sell",
      selectedIndex: this.activePackSelection?.type === "inventory" ? this.activePackSelection.value : -1,
      shopId
    });
    const sellRows = sellModel.visibleCount === 0
      ? `<div class="text-block">Nothing here matches what this shop buys.</div>`
      : sellModel.groups.map((group) => `
        <div class="shop-sell-group">
          <div class="field-label">${escapeHtml(group.label)}</div>
          ${group.items.map((entry) => `
            <div class="shop-row">
              <div>
                <div><strong>${escapeHtml(getItemName(entry.item))}</strong>${entry.count > 1 ? ` <span class="muted">x${entry.count}</span>` : ""} <span class="muted">${getShopSellPrice(this, entry.item, shopId)} gp</span></div>
                <div class="muted">${escapeHtml(entry.reason)}</div>
                <div class="muted">${escapeHtml(this.getPackItemNote(entry.item, entry))}</div>
              </div>
              <div class="actions">
                <button class="tiny-button" data-action="shop-sell" data-index="${entry.index}" data-focus-key="${this.getShopSellFocusKey(entry.index)}" type="button">Sell</button>
              </div>
            </div>
          `).join("")}
        </div>
      `).join("");

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
      <div class="section-block">
        <div class="field-label">Buy</div>
        ${stockRows}
      </div>
      <div class="section-block">
        <div class="field-label">Sell</div>
        <div class="modal-actions utility-row">
          <button class="menu-button" data-action="open-hub" data-tab="pack" data-filter="sell" data-focus-key="shop:review-pack" type="button">Review Pack</button>
        </div>
        ${sellRows}
      </div>
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
      temple_favors: "Now: temple prices drop. Later: blood altars can appear below.",
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
    const recommendedText = contractModel.recommendedId
      ? `Recommended next run: ${contractModel.all.find((contract) => contract.id === contractModel.recommendedId)?.name || contractModel.recommendedId}. ${contractModel.recommendedReason}`
      : "No contract recommendation available.";
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
      <div class="modal-actions">
        <button class="menu-button" data-action="bank-deposit" data-focus-key="${this.getTownActionFocusKey("deposit")}" type="button">Deposit 100</button>
        <button class="menu-button" data-action="bank-withdraw" data-focus-key="${this.getTownActionFocusKey("withdraw")}" type="button">Withdraw 100</button>
        <button class="menu-button" data-action="town-rumor" data-focus-key="${this.getTownActionFocusKey("rumor")}" type="button">Buy Intel (${getRumorPrice(this)} gp)</button>
        <button class="menu-button" data-action="close-modal" data-focus-key="bank:close" type="button">Close</button>
      </div>
      <div class="section-block">
        <div class="text-block">${escapeHtml(recommendedText)}</div><br>
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

  showHelpModal() {
    this.mode = "modal";
    this.showSimpleModal("Help", `
      <div class="section-block text-block">
        This mobile build is tuned for travel play: portrait layout, offline installability, paired controller support,
        touch fallback, targeted spells, heavier dungeon pressure, and clearer combat feedback.
      </div>
      <div class="section-block">
        <div class="field-label">Controls</div>
        <div class="text-block">
          Keyboard: arrows or numpad move, F searches, U uses, I opens pack, S opens spells, M opens the map, R rests briefly, Shift+R sleeps until restored<br>
          Controller: D-pad or left stick moves focus, A confirms, B backs out, Y opens pack, Start opens the run menu, Back toggles the map, LB/RB switch hub tabs, and RT or the right stick scrolls long lists<br>
          Touch: use the on-screen pad as fallback movement and the dock for your main actions
      </div>
      </div>
      <div class="section-block">
        <div class="field-label">Dungeon Notes</div>
        <div class="text-block">
          Search for hidden doors and traps. Heavy burden reduces dodge and lets monsters press harder.
          Targeted spells and wands require line of sight. Resting and sleeping are noisy, and sleep breaks the moment a monster enters view. Enemy intent icons now telegraph rushes,
          ranged shots, summons, and other ugly plans before they land.
        </div>
      </div>
    `, {
      surfaceKey: "help"
    });
  }

  showUtilityMenu() {
    this.mode = "modal";
    this.setModalVisibility(true);
    const template = document.getElementById("utility-menu-template");
    const fragment = template.content.cloneNode(true);
    const savedMeta = this.getSavedRunMeta();
    const connected = this.gamepadInput.isConnected();
    const utilityRunSummary = fragment.getElementById("utility-run-summary");
    const utilitySaveSummary = fragment.getElementById("utility-save-summary");
    const utilityControlSummary = fragment.getElementById("utility-control-summary");
    const utilitySaveButton = fragment.getElementById("utility-save-button");
    const utilityLoadButton = fragment.getElementById("utility-load-button");
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
          <div class="utility-menu-meta">Your latest browser save will appear here.</div>
          <div class="utility-menu-meta">${escapeHtml(latestSummary ? `Latest return: ${latestSummary.outcome} depth ${latestSummary.extractedDepth}, ${latestSummary.returnValue} gp value.` : "Latest return: none recorded yet.")}</div>
          <div class="utility-menu-meta">${escapeHtml(latestUnlock ? `Latest permanent unlock: ${latestUnlock}` : "Latest permanent unlock: none yet.")}</div>
        `;
      } else {
        const timeLabel = savedMeta.savedAt ? this.formatSaveStamp(savedMeta.savedAt) : null;
        utilitySaveSummary.innerHTML = `
          <div class="utility-menu-title">${escapeHtml(savedMeta.name)}</div>
          <div class="utility-menu-meta">Level ${savedMeta.level} &middot; Depth ${savedMeta.depth}</div>
          ${timeLabel ? `<div class="utility-menu-meta">${escapeHtml(timeLabel)}</div>` : ""}
          <div class="utility-menu-meta">${escapeHtml(latestSummary ? `Latest return: ${latestSummary.outcome} depth ${latestSummary.extractedDepth}, ${latestSummary.returnValue} gp value.` : "Latest return: none recorded yet.")}</div>
          <div class="utility-menu-meta">${escapeHtml(latestUnlock ? `Latest permanent unlock: ${latestUnlock}` : "Latest permanent unlock: none yet.")}</div>
        `;
      }
    }

    if (utilityControlSummary) {
      utilityControlSummary.innerHTML = `
        <div class="utility-menu-title">${connected ? "Controller ready" : "Touch active"}</div>
        <div class="utility-menu-meta">${escapeHtml(connected ? `${this.gamepadInput.getControllerName()} | A Confirm | B Back | LB/RB Tabs | RT Scroll` : "Touch controls are available for movement and actions.")}</div>
      `;
    }

    if (utilitySaveButton) {
      utilitySaveButton.disabled = !this.player || this.mode === "title";
    }
    if (utilityLoadButton) {
      utilityLoadButton.disabled = !savedMeta;
    }

    this.modalRoot.innerHTML = "";
    this.modalRoot.appendChild(fragment);
    this.modalRoot.classList.remove("hidden");
    this.modalSurfaceKey = "utility-menu";
    this.recordTelemetry("modal_opened", {
      surface: "utility-menu"
    });
    this.applyControllerNavigationMetadata();
    this.focusFirstUiElement();
  }

  closeModal() {
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
    this.pendingService = null;
    this.activeHubTab = "pack";
    if (this.targetMode && this.mode !== "target") {
      this.targetMode = null;
    }
    if (!this.player) {
      this.showTitleScreen();
      return;
    }
    if (this.player && this.player.hp > 0) {
      this.mode = "game";
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
    this.syncUtilityBar();
    this.renderBoard();
    this.renderMiniMap();
    this.renderPanels();
    this.renderEventTicker();
    this.renderActionBar();
    this.syncContextChip();
    this.applyControllerNavigationMetadata();
    if (previousFocusKey && this.lastInputSource === "gamepad") {
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
      if (this.mapCaption) {
        this.mapCaption.textContent = "No active map.";
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

    if (this.mapCaption) {
      const modeLabel = this.currentDepth === 0 ? this.getTownCycleLabel() : "Dungeon survey";
      const pressure = this.getPressureUiState();
      const firstTownRun = this.currentDepth === 0 && (this.player.deepestDepth || 0) === 0;
      const floorThesis = this.getFloorThesisText();
      const directive = this.getLoopDirective();
      const townReturnSting = this.getTownReturnStingText();
      this.mapCaption.innerHTML = `
        <div class="map-caption-row">
          <span class="map-chip">Depth ${this.currentDepth}</span>
          <span class="map-chip">${escapeHtml(this.getCurrentAreaTitle())}</span>
        </div>
        <div class="map-caption-row">
          <span class="map-chip subtle">Explored ${getExploredPercent(this.currentLevel)}%</span>
          <span class="map-chip subtle">${escapeHtml(this.currentDepth > 0 ? pressure.label : modeLabel)}</span>
        </div>
        ${this.currentDepth > 0 && floorThesis ? `<div class="map-caption-row"><span class="map-chip subtle">${escapeHtml(floorThesis)}</span></div>` : ""}
        ${this.currentDepth > 0 && directive.primaryText ? `<div class="map-caption-row"><span class="map-chip subtle objective-chip">${escapeHtml(directive.primaryText)}</span></div>` : ""}
        ${this.currentDepth > 0 && directive.supportText ? `<div class="map-caption-row"><span class="map-chip subtle">${escapeHtml(directive.supportText)}</span></div>` : ""}
        ${this.currentDepth === 0 && townReturnSting ? `<div class="map-caption-row"><span class="map-chip subtle">${escapeHtml(townReturnSting)}</span></div>` : ""}
        ${firstTownRun ? `<div class="map-caption-row"><span class="map-chip subtle">North road leads into the keep</span></div>` : ""}
      `;
    }
  }

  legacyRenderActionBarUnused() {
    if (!this.actionBar) {
      return;
    }
    if (!this.player) {
      this.actionBar.innerHTML = "";
      return;
    }
    const advisor = this.getAdvisorModel();
    this.actionBar.innerHTML = `
      <button class="action-button dock-action hub-button" data-action="open-hub" data-tab="pack" type="button">
        <span class="context-main">Hub</span>
        <span class="context-note">Pack, magic, journal</span>
      </button>
      ${advisor.actionsHtml}
    `;
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
      drawTargetCursor(ctx, this.targetMode.cursor, view, this.player, time, effectProfile);
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

  playProjectile(from, to, color) {
    this.addEffect({
      type: "projectileTrail",
      from: { x: from.x, y: from.y },
      to: { x: to.x, y: to.y },
      color,
      duration: this.getReducedMotionActive() ? 120 : 210
    });
  }

  legacyGetAdvisorModelUnused() {
    if (!this.player || !this.currentLevel) {
      return {
        playerHtml: "<div class='muted'>No active run.</div>",
        threatHtml: "<div class='muted'>No threats yet.</div>",
        advisorHtml: "<div class='advisor-label'>Advisor</div><div class='advisor-text'>Create a character to begin.</div>",
        actionsHtml: ""
      };
    }

    const tile = getTile(this.currentLevel, this.player.x, this.player.y);
    const visible = this.visibleEnemies();
    const hpRatio = this.player.maxHp > 0 ? this.player.hp / this.player.maxHp : 1;
    const manaRatio = this.player.maxMana > 0 ? this.player.mana / this.player.maxMana : 1;
    const rangedThreats = visible.filter((monster) => monster.intent && monster.intent.type === "shoot").length;
    const chargeThreats = visible.filter((monster) => monster.intent && monster.intent.type === "charge").length;
    const summonThreats = visible.filter((monster) => monster.intent && monster.intent.type === "summon").length;
    const lootHere = itemsAt(this.currentLevel, this.player.x, this.player.y);
    const burden = getEncumbranceTier(this.player);
    const condition = this.player.slowed ? "Slowed" : burden >= 2 ? "Overburdened" : burden === 1 ? "Burdened" : "Steady";
    const dangerScore = visible.length + rangedThreats * 2 + chargeThreats + summonThreats * 2 + (hpRatio < 0.5 ? 2 : 0);
    const dangerTone = visible.length === 0 ? "good" : dangerScore >= 7 || hpRatio < 0.35 ? "bad" : dangerScore >= 3 ? "warning" : "good";
    const dangerLabel = visible.length === 0 ? "Clear" : dangerTone === "bad" ? "Kill Zone" : dangerTone === "warning" ? "Pressured" : "Engaged";
    const pressurePercent = visible.length === 0 ? 0 : clamp(dangerScore * 12 + 14, 16, 100);
    const locationLabel = this.currentDepth > 0 ? `Depth ${this.currentDepth}` : "Town";
    const closestThreat = visible.length > 0
      ? Math.min(...visible.map((monster) => distance(this.player, monster)))
      : null;
    const primaryThreat = visible[0] ? visible[0].name : "No visible foes";
    const threatFocus = summonThreats > 0
      ? "Summoner pressure"
      : rangedThreats > 0
        ? "Ranged pressure"
        : chargeThreats > 0
          ? "Charge lane"
          : visible.length > 0
            ? escapeHtml(primaryThreat)
            : "No hostile contacts";

    const playerHtml = `
      <div class="capsule-topline">
        <div>
          <div class="capsule-label">Vanguard</div>
          <div class="capsule-headline">${escapeHtml(this.player.name)}</div>
        </div>
        <div class="capsule-badge ${dangerTone === "bad" ? "bad" : this.currentDepth > 0 ? "warning" : "good"}">${escapeHtml(locationLabel)}</div>
      </div>
      <div class="meter-stack">
        <div class="meter-row"><span>Vitality</span><strong class="${valueTone(hpRatio, true)}">${Math.floor(this.player.hp)}/${this.player.maxHp}</strong></div>
        <div class="meter hp"><span style="width:${clamp(Math.round(hpRatio * 100), 0, 100)}%"></span></div>
        <div class="meter-row"><span>Aether</span><strong class="${manaRatio < 0.3 ? "value-warning" : ""}">${Math.floor(this.player.mana)}/${this.player.maxMana}</strong></div>
        <div class="meter mana"><span style="width:${clamp(Math.round(manaRatio * 100), 0, 100)}%"></span></div>
      </div>
      <div class="capsule-line compact-line"><span>Condition</span><strong class="${this.player.slowed || burden ? "value-warning" : ""}">${condition}</strong></div>
    `;

    const threatHtml = `
      <div class="capsule-topline">
        <div>
          <div class="capsule-label">Threat Scan</div>
          <div class="capsule-headline">${visible.length > 0 ? `${visible.length} hostile${visible.length === 1 ? "" : "s"}` : "No immediate threat"}</div>
        </div>
        <div class="capsule-badge ${dangerTone}">${dangerLabel}</div>
      </div>
      <div class="capsule-subline">${threatFocus}</div>
      <div class="meter-stack">
        <div class="meter-row"><span>Pressure</span><strong class="${dangerTone === "bad" ? "value-bad" : dangerTone === "warning" ? "value-warning" : "value-good"}">${pressurePercent}%</strong></div>
        <div class="meter threat"><span style="width:${pressurePercent}%"></span></div>
      </div>
      <div class="capsule-line compact-line"><span>Closest</span><strong>${closestThreat === null ? "Clear" : `${closestThreat} tile${closestThreat === 1 ? "" : "s"}`}</strong></div>
    `;

    let advice = "Advance carefully. Keep the dungeon, not the menus, as the main thing you read.";
    const actions = [];
    const pushAction = (action, label, note, recommended = false, tab = "") => {
      if (!actions.some((entry) => entry.action === action)) {
        actions.push({ action, label, note, recommended, tab });
      }
    };

    if (lootHere.length > 0) {
      advice = `There ${lootHere.length === 1 ? "is loot" : "are valuables"} underfoot. Secure it before drifting deeper.`;
      pushAction("pickup", "Pick Up", lootHere[0].kind === "gold" ? "Collect the gold" : "Claim the item", true);
    }
    if (tile.kind === "fountain" || tile.kind === "throne" || (tile.kind === "altar" && tile.featureEffect)) {
      advice = "This tile offers a risky interaction. Touch it only if you want to spend tempo or accept danger.";
      pushAction("interact", "Interact", "Use the current feature", true);
    }
    if (tile.kind === "stairUp" && this.currentDepth > 0) {
      advice = hpRatio < 0.45 ? "You have an escape route under your feet. Use it if this floor is turning against you." : "The stairs up are ready if you want to bank progress or reset pressure.";
      pushAction("stairs-up", "Ascend", "Leave the floor now", hpRatio < 0.45);
    } else if (tile.kind === "stairDown") {
      advice = "The downward path is open. Descend only if your resources justify more risk.";
      pushAction("stairs-down", "Descend", "Push the run deeper", false);
    }

    if (visible.length > 0) {
      if (hpRatio < 0.35) {
        advice = "You are in the kill zone. Break contact, create space, or spend a tool immediately.";
        if (this.player.spellsKnown.length > 0) {
          pushAction("open-hub", "Magic", "Spend control or damage now", true, "magic");
        }
        pushAction("wait", "Hold", "Stabilize before moving", false);
      } else if (rangedThreats > 0) {
        advice = "Ranged pressure is active. Break line of sight with pillars, corners, or a fast disable.";
        if (this.player.spellsKnown.length > 0) {
          pushAction("open-hub", "Magic", "Answer ranged pressure", true, "magic");
        }
        pushAction("wait", "Hold", "Do not overextend", false);
      } else if (chargeThreats > 0) {
        advice = "A visible charger is winding up. Sidestep or block the lane before it lands.";
        pushAction("wait", "Hold", "Let the lane clarify", false);
        if (this.player.spellsKnown.length > 0) {
          pushAction("open-hub", "Magic", "Slow or burst the charger", true, "magic");
        }
      } else if (summonThreats > 0) {
        advice = "A summoner is online. Kill or disrupt it before the room fills in.";
        if (this.player.spellsKnown.length > 0) {
          pushAction("open-hub", "Magic", "Pressure the summoner", true, "magic");
        }
      } else {
        advice = "You are engaged. Win the current exchange before opening more of the map.";
        if (this.player.spellsKnown.length > 0) {
          pushAction("open-hub", "Magic", "Take initiative", true, "magic");
        }
        pushAction("wait", "Hold", "Read the room", false);
      }
    } else if (this.currentDepth > 0 && hpRatio < 0.75) {
      advice = "You can recover here, but rest is noisy. Use it only if you can afford waking the floor.";
      pushAction("rest", "Rest", "Recover until disturbed", true);
      pushAction("search", "Search", "Check nearby walls and traps", false);
    } else if (this.currentDepth > 0) {
      advice = "The floor is quiet. Search, scout, or push toward the next point of tension.";
      pushAction("search", "Search", "Probe for secrets", true);
      if (tile.kind === "stairDown") {
        pushAction("stairs-down", "Descend", "Push the run deeper", false);
      }
    }

    const advisorHtml = `
      <div class="advisor-label">Tactical Read</div>
      <div class="advisor-text">${escapeHtml(advice)}</div>
    `;

    const actionsHtml = actions.slice(0, 3).map((entry, index) => `
      <button class="action-button dock-action${entry.recommended && index === 0 ? " recommended" : ""}" data-action="${entry.action}"${entry.tab ? ` data-tab="${entry.tab}"` : ""} type="button">
        <span class="context-slot">${index + 1}</span>
        <span class="context-copy">
          <span class="context-main">${escapeHtml(entry.label)}</span>
          <span class="context-note">${escapeHtml(entry.note)}</span>
        </span>
      </button>
    `).join("");

    return { playerHtml, threatHtml, advisorHtml, actionsHtml };
  }

  legacyRenderPanelsUnused() {
    if (!this.player) {
      if (this.playerCapsule) {
        this.playerCapsule.innerHTML = "<div class='muted'>No active run.</div>";
      }
      if (this.threatCapsule) {
        this.threatCapsule.innerHTML = "<div class='muted'>No visible threats.</div>";
      }
      if (this.advisorStrip) {
        this.advisorStrip.innerHTML = "<div class='advisor-label'>Tactical Advisor</div><div class='advisor-text'>Create a character to begin.</div>";
      }
      return;
    }

    const advisor = this.getAdvisorModel();
    if (this.playerCapsule) {
      this.playerCapsule.innerHTML = advisor.playerHtml;
    }
    if (this.threatCapsule) {
      this.threatCapsule.innerHTML = advisor.threatHtml;
    }
    if (this.advisorStrip) {
      this.advisorStrip.innerHTML = advisor.advisorHtml;
    }
  }

  refreshChrome() {
    this.syncUtilityBar();
    if (this.mapDrawer) {
      const showMap = this.mapDrawerOpen && Boolean(this.player);
      this.mapDrawer.classList.toggle("hidden", !showMap);
    }
    if (this.mapToggleButton) {
      this.mapToggleButton.disabled = !this.player;
      this.mapToggleButton.textContent = this.mapDrawerOpen && this.player ? "Hide Survey" : "Survey";
    }
    if (this.touchControls) {
      const hiddenBySetting = !this.settings.touchControlsEnabled;
      const hiddenByController = this.settings.controllerHintsEnabled && this.gamepadInput.isConnected();
      this.touchControls.classList.toggle("hidden", hiddenBySetting || hiddenByController);
    }
    syncSaveChrome(this);
    this.applyControllerNavigationMetadata();
  }

  getPressureUiState() {
    return getPressureStatus(this.currentLevel);
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
          : "A Act  X Alt  Y Pack  Start Menu";
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
          ? (this.storyFlags.townServiceVisited ? "Go North" : "Visit Door")
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

  getSavedRunMeta() { return loadSavedRunMeta(); }

  formatSaveStamp(isoString) { return formatSavedRunStamp(isoString); }

  resetCreationDraft() { resetCreationState(this); }

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

  performWait() { performWaitTurn(this); }

  restUntilSafe() { restUntilSafeTurn(this); }

  sleepUntilRestored() { sleepUntilRestoredTurn(this); }

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

  loadGame() { loadGameState(this); }

  showTitleScreen() { showTitleModal(this); }

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
