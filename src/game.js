import { APP_VERSION, DIRECTIONS, DUNGEON_DEPTH, FOV_RADIUS, SAVE_KEY, TILE_SIZE, VIEW_SIZE } from "./core/constants.js";
import { BOON_DEFS, CLASSES, ITEM_DEFS, MONSTER_DEFS, OBJECTIVE_DEFS, PERK_DEFS, RACES, RELIC_DEFS, SHOPS, SPELLS, TEMPLE_SERVICES, TOWN_UNLOCK_DEFS } from "./data/content.js";
import { createInitialShopState, normalizeItem, normalizeLevels, normalizePlayer, normalizeShopState, createItem, createMonster, createTownItem, getCarryCapacity, getCarryWeight, getClass, getEncumbranceTier, getExploredPercent, getHealthRatio, getItemArmor, getItemDexBonus, getItemLightBonus, getItemManaBonus, getItemName, getItemPower, getItemValue, getMonsterHealthState, getRace, miniMapColor, rollTreasure, weightedMonster, describeItem, canIdentify, countUnknownItems, classifyItem, shopAcceptsItem, curseRandomCarriedItem } from "./core/entities.js";
import { actorAt, addSecretVault, addSetPiece, blankLevel, bresenhamLine, carveRoom, carveTunnel, centerOf, clearVisibility, fillRect, getTile, hasLineOfSight, inBounds, intersects, isExplored, isOccupied, isVisible, isWalkable, itemsAt, placeBuilding, randomRoomTile, revealAll, revealAllSecrets, revealCircle, revealNearbySecrets, revealSecretTile, setExplored, setTile, setVisible, summonMonsterNear, tileDef, findInitialTargetCursor, carveHorizontal, carveVertical } from "./core/world.js";
import { capitalize, choice, choiceCard, clamp, distance, escapeHtml, nowTime, randInt, removeAt, removeFromArray, removeOne, roll, shuffle, valueTone } from "./core/utils.js";
import { defaultSettings, loadSettings, saveSettings } from "./core/settings.js";
import { drawBoardAtmosphere, drawBoardBurdenVignette, drawBoardVignette, drawCenteredText, drawEffect, drawItem, drawMonster, drawMonsterHealthBar, drawMonsterIntent, drawPlayer, drawTargetCursor, drawTile, drawTownBuildings } from "./ui/render.js";
import { SoundBoard } from "./audio/soundboard.js";
import { GamepadInput } from "./input/gamepad.js";
import { applyCommandResult } from "./core/command-result.js";
import { adjustCreationStat as adjustCreationStatDraft, captureCreationDraft as captureCreationDraftState, getCreationPointsRemaining as getCreationDraftPointsRemaining, getCreationStats as getCreationDraftStats, resetCreationDraft as resetCreationState, showCreationModal as showCreationScreen, showTitleScreen as showTitleModal } from "./features/creation.js";
import { getSavedRunMeta as loadSavedRunMeta, formatSaveStamp as formatSavedRunStamp, loadGame as loadGameState, saveGame as saveGameState, syncSaveChrome } from "./features/persistence.js";
import { performSearchCommand, useStairsCommand } from "./features/exploration.js";
import { applyCharge, attack as attackActors, canCharge as canMonsterCharge, canMonsterMoveTo as canMonsterMove, checkLevelUp as checkPlayerLevelUp, damageActor as damageActorTarget, findRetreatStep as findMonsterRetreatStep, getMonsterIntent as getMonsterIntentModel, handleDeath as handlePlayerDeath, killMonster as killMonsterActor, makeNoise as makeDungeonNoise, processMonsters as processMonsterTurns, updateMonsterIntents as updateAllMonsterIntents, visibleEnemies as getVisibleEnemies } from "./features/combat.js";
import { endTurn as endGameTurn, performWait as performWaitTurn, resolveTurn as resolveGameTurn, restUntilSafe as restUntilSafeTurn } from "./features/turns.js";
import { getAdvisorModel as buildAdvisorModel, renderActionBar as renderAdvisorActionBar, renderPanels as renderAdvisorPanels } from "./features/advisor.js";
import { getDepthTheme, getEncounterSummary, populateDungeonEncounters } from "./features/encounters.js";
import { getObjectiveRewardPreview, getObjectiveStatusText, getOptionalStatusText, grantObjectiveRumor, handleObjectiveInteraction, handleObjectivePickup, resolveFloorObjective, setupFloorDirectives, syncFloorState } from "./features/objectives.js";
import { advanceDangerTurn, getDangerSummary, increaseDanger as raiseDanger, initializeDangerState, markGreedAction as markFloorGreedAction, noteFloorIntro, syncDangerState } from "./features/director.js";
import { chooseReward, clearRewardChoice, ensureBuildState, getBuildArmorBonus, getBuildAttackBonus, getBuildDamageBonus, getBuildEvadeBonus, getBuildMaxHpBonus, getBuildMaxManaBonus, getBuildSearchBonus, getKnownRumors, getOvercastLoss, getSpellCost, grantBoon as applyBoonReward, grantRumorToken as addRumorToken, hasPendingProgressionChoice, onPlayerMove, onPlayerWait, prepareNextRewardChoice, queueObjectiveReward, queuePerkChoice } from "./features/builds.js";
import { buyTownRumor, ensureTownMetaState, getAvailableTownUnlocks, getShopPool, getTemplePrice, getTownIntel, purchaseTownUnlock, refreshTownStocks } from "./features/town-meta.js";
import { buildDeathRecapMarkup, ensureChronicleState, noteDeathContext, recordChronicleEvent, renderChronicleMarkup } from "./features/chronicle.js";

export class Game {
  constructor() {
    this.appShell = document.querySelector(".mobile-app");
    this.canvas = document.getElementById("game-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.mapCanvas = document.getElementById("map-canvas");
    this.mapCtx = this.mapCanvas ? this.mapCanvas.getContext("2d") : null;
    this.mapCaption = document.getElementById("map-caption");
    this.modalRoot = document.getElementById("modal-root");
    this.actionBar = document.getElementById("action-bar");
    this.controllerStatus = document.getElementById("controller-status");
    this.saveStamp = document.getElementById("save-stamp");
    this.quickSaveButton = document.getElementById("quick-save-button");
    this.quickLoadButton = document.getElementById("quick-load-button");
    this.touchControls = document.getElementById("touch-controls");
    this.playerCapsule = document.getElementById("player-capsule");
    this.threatCapsule = document.getElementById("threat-capsule");
    this.advisorStrip = document.getElementById("advisor-strip");
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
    this.rumorTable = [];
    this.chronicleEvents = [];
    this.deathContext = null;
    this.seenMonsters = new Set();
    this.loggedRoomReads = new Set();
    this.focusedThreat = null;
    this.pendingPickupPrompt = null;
    this.lastTownRefreshTurn = 0;
    this.settings = loadSettings();
    this.reducedMotionQuery = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
    document.documentElement.dataset.uiScale = this.settings.uiScale;
    this.shopState = createInitialShopState();
    ensureTownMetaState(this);
    ensureChronicleState(this);
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
    document.addEventListener("keydown", (event) => this.handleKeydown(event));
    document.addEventListener("click", (event) => this.handleClick(event));
    document.addEventListener("input", (event) => {
      if (event.target && event.target.id === "hero-name") {
        this.creationName = event.target.value;
      }
    });
    this.canvas.addEventListener("click", (event) => this.handleCanvasClick(event));
    window.addEventListener("gamepadconnected", () => this.refreshChrome());
    window.addEventListener("gamepaddisconnected", () => this.refreshChrome());
    window.addEventListener("resize", () => this.refreshChrome());
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

  getLearnableSpellOptions() {
    return Object.values(SPELLS)
      .filter((spell) => (spell.learnLevel || 1) <= this.player.level && !this.player.spellsKnown.includes(spell.id))
      .sort((a, b) => {
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
      const [dx, dy] = moveButton.dataset.move.split(",").map(Number);
      this.handleMovementIntent(dx, dy);
      return;
    }

    const action = event.target.closest("[data-action]");
    if (action) {
      this.handleAction(action.dataset.action, action);
      return;
    }

    const raceChoice = event.target.closest("[data-race]");
    if (raceChoice) {
      this.captureCreationDraft();
      this.selectedRace = raceChoice.dataset.race;
      this.showCreationModal();
      return;
    }

    const classChoice = event.target.closest("[data-class]");
    if (classChoice) {
      this.captureCreationDraft();
      this.selectedClass = classChoice.dataset.class;
      this.showCreationModal();
    }
  }

  handleCanvasClick(event) {
    if (!this.player || (this.mode !== "game" && this.mode !== "target")) {
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
    switch (actionName) {
      case "new-game":
        this.resetCreationDraft();
        this.showCreationModal();
        break;
      case "save-game":
        this.saveGame();
        break;
      case "load-game":
        this.loadGame();
        break;
      case "open-hub":
        this.showHubModal(element && element.dataset.tab ? element.dataset.tab : "pack");
        break;
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
      case "help":
        this.showHelpModal();
        break;
      case "settings":
        this.showSettingsModal();
        break;
      case "begin-adventure":
        this.beginAdventure();
        break;
      case "creation-reset-stats":
        this.captureCreationDraft();
        this.creationStatBonuses = { str: 0, dex: 0, con: 0, int: 0 };
        this.showCreationModal();
        break;
      case "creation-adjust-stat":
        this.captureCreationDraft();
        if (this.adjustCreationStat(element.dataset.stat, Number(element.dataset.delta))) {
          this.showCreationModal();
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
        this.showHubModal("pack", { selection: { type: "inventory", value: Number(element.dataset.index) } });
        break;
      case "inspect-slot":
        this.showHubModal("pack", { selection: { type: "slot", value: element.dataset.slot } });
        break;
      case "unequip-slot":
        this.unequipSlot(element.dataset.slot);
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
          this.showBankModal();
          this.render();
        }
        break;
      case "town-rumor":
        if (buyTownRumor(this)) {
          this.showBankModal();
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

    if (!this.player || this.mode !== "game") {
      return;
    }

    const lower = event.key.length === 1 ? event.key.toLowerCase() : event.key;
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
    if (!this.player) {
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

    this.player = {
      id: "player",
      name: heroName,
      race: race.name,
      className: role.name,
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
        complete: false
      }
    };

    role.startItems.forEach((itemId) => this.addItemToInventory(createTownItem(itemId)));
    this.autoEquipStarterGear();
    this.turn = 1;
    this.storyFlags = {};
    this.shopState = createInitialShopState();
    this.townUnlocks = {};
    this.shopTiers = {};
    this.rumorTable = [];
    this.chronicleEvents = [];
    this.deathContext = null;
    this.lastTownRefreshTurn = 0;
    this.pendingSpellChoices = 0;
    this.pendingPerkChoices = 0;
    this.pendingRewardChoice = null;
    this.pendingRewardQueue = [];
    this.pendingTurnResolution = null;
    this.resetReadState();
    ensureBuildState(this);
    ensureTownMetaState(this);
    ensureChronicleState(this);
    this.generateWorld();
    refreshTownStocks(this);
    this.recalculateDerivedStats();
    this.player.hp = this.player.maxHp;
    this.player.mana = this.player.maxMana;
    this.mode = "game";
    this.closeModal();
    this.log(`${heroName} enters the valley beneath the ruined keep.`, "good");
    this.log("Recover the Runestone of the Winds from the lower halls and return to town.", "warning");
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
    revealAll(level);
    return level;
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

    if (rooms.length < 2) {
      return this.generateDungeonLevel(depth);
    }

    level.rooms = rooms;
    level.start = centerOf(rooms[0]);
    level.stairsUp = centerOf(rooms[0]);
    level.stairsDown = centerOf(rooms[rooms.length - 1]);
    setTile(level, level.stairsUp.x, level.stairsUp.y, tileDef("stairUp"));
    setTile(level, level.stairsDown.x, level.stairsDown.y, tileDef(depth === DUNGEON_DEPTH ? "altar" : "stairDown"));
    const theme = getDepthTheme(depth);
    level.description = `${theme.name} - depth ${depth}`;
    initializeDangerState(level, depth);
    this.placeDungeonContent(level, depth);
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

  placeDungeonContent(level, depth) {
    const spawnRooms = level.rooms.slice(1);
    const encounterState = populateDungeonEncounters(level, depth);
    setupFloorDirectives(level, depth, this.townUnlocks);

    const itemCount = 5 + depth;
    for (let i = 0; i < itemCount; i += 1) {
      const room = choice(spawnRooms);
      const position = randomRoomTile(room);
      if (isOccupied(level, position.x, position.y) || itemsAt(level, position.x, position.y).length > 0) {
        continue;
      }
      level.items.push({ ...rollTreasure(depth), x: position.x, y: position.y });
    }

    for (let i = 0; i < 3 + Math.floor(depth / 2); i += 1) {
      const room = choice(spawnRooms);
      const position = randomRoomTile(room);
      if (isWalkable(level, position.x, position.y)) {
        level.items.push({ x: position.x, y: position.y, kind: "gold", name: "Gold", amount: randInt(5, 12) * depth });
      }
    }

    if (depth === 1 && spawnRooms.length > 0) {
      const earlyLootRoom = spawnRooms[0];
      const heavyLootSpot = randomRoomTile(earlyLootRoom);
      if (isWalkable(level, heavyLootSpot.x, heavyLootSpot.y) && itemsAt(level, heavyLootSpot.x, heavyLootSpot.y).length === 0) {
        level.items.push({ ...createItem("rustedMail", { identified: true }), x: heavyLootSpot.x, y: heavyLootSpot.y });
      }
      const quickLootRoom = spawnRooms[Math.min(1, spawnRooms.length - 1)];
      const quickLootSpot = randomRoomTile(quickLootRoom);
      if (isWalkable(level, quickLootSpot.x, quickLootSpot.y) && itemsAt(level, quickLootSpot.x, quickLootSpot.y).length === 0) {
        level.items.push({ ...createItem("healingPotion", { identified: true }), x: quickLootSpot.x, y: quickLootSpot.y });
      }
    }

    const featureRooms = spawnRooms.slice(0, Math.max(3, Math.floor(spawnRooms.length / 2)));
    for (let i = 0; i < 3 + depth; i += 1) {
      const room = choice(featureRooms);
      const position = randomRoomTile(room);
      if (isWalkable(level, position.x, position.y) && getTile(level, position.x, position.y).kind === "floor") {
        setTile(level, position.x, position.y, tileDef("trap", { hidden: Math.random() < 0.55, trapEffect: choice(["dart", "poison", "teleport", "alarm", "trapdoor", "arrow", "summon"]) }));
      }
    }

    if (Math.random() < 0.85) {
      const room = choice(featureRooms);
      const position = randomRoomTile(room);
      setTile(level, position.x, position.y, tileDef("fountain", { featureUsed: false, featureEffect: choice(["heal", "mana", "poison", "vision", "damage"]) }));
    }

    if (depth >= 2 && Math.random() < 0.65) {
      const room = choice(featureRooms);
      const position = randomRoomTile(room);
      setTile(level, position.x, position.y, tileDef("throne", { featureUsed: false, featureEffect: choice(["gold", "exp", "curse", "summon", "teleport"]) }));
    }

    addSetPiece(level, depth);
    addSecretVault(level, depth);

    if (depth === DUNGEON_DEPTH) {
      const room = choice(spawnRooms.slice(-3));
      const position = randomRoomTile(room);
      level.items.push({ ...createItem("runestone"), x: position.x, y: position.y });
      level.actors.push(createMonster(MONSTER_DEFS[MONSTER_DEFS.length - 1], position.x + 1, position.y));
    }

    level.encounterSummary = getEncounterSummary(level);
    level.floorTheme = encounterState.theme.id;
    level.floorThemeName = encounterState.theme.name;
  }

  placePlayerAt(x, y) {
    this.player.x = x;
    this.player.y = y;
    syncFloorState(this);
    syncDangerState(this);
    this.updateFov();
    this.updateMonsterIntents();
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

  getAttackValue() {
    const weapon = this.player.equipment.weapon;
    const base = weapon ? getItemPower(weapon) : 2;
    return this.getAttackValueForStats(this.player.stats, base);
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

  getLightRadius() {
    let radius = FOV_RADIUS;
    Object.values(this.player.equipment).forEach((item) => {
      if (item && item.lightBonus) {
        radius += getItemLightBonus(item);
      }
    });
    return radius;
  }

  getEncumbranceTier() {
    return getEncumbranceTier(this.player);
  }

  getSpellDamageBonus(defender, damageType = "magic") {
    return getBuildDamageBonus(this, defender, damageType);
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
    if (tile.objectiveId) {
      const objective = OBJECTIVE_DEFS[tile.objectiveId];
      this.log(`${objective ? objective.label : "Objective"} is here.`, "warning");
      return;
    }
    if (tile.optionalId) {
      this.log(`${tile.label || "Temptation"} waits here. Greed will raise the floor's danger.`, "warning");
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
      summonMonsterNear(this.currentLevel, this.player.x, this.player.y, weightedMonster(this.currentDepth));
    }
  }

  legacyPerformSearchUnused() {
    if (!this.player || this.mode !== "game") {
      return;
    }
    const radius = this.getSearchRadiusForStats(this.player.stats);
    const searchPower = this.getSearchPowerForStats(this.player.stats, this.player.level);
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
    this.refreshChrome();
    if (intent.type === "move") {
      this.handleMovementIntent(intent.dx, intent.dy);
      return;
    }
    if (intent.type === "target") {
      this.moveTargetCursor(intent.dx, intent.dy);
      return;
    }
    if (intent.type === "dock") {
      this.triggerDockSlot(intent.slot);
      return;
    }
    if (intent.type === "confirm") {
      if (this.mode === "target") {
        this.confirmTargetSelection();
      } else if (this.mode === "creation") {
        this.beginAdventure();
      }
      return;
    }
    if (intent.type === "cancel") {
      if (this.mode === "target") {
        this.cancelTargetMode();
      } else if (this.mode === "modal") {
        this.closeModal();
      }
      return;
    }
    if (intent.type === "action") {
      this.handleAction(intent.action, intent.tab ? { dataset: { tab: intent.tab } } : null);
    }
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

  showSettingsModal() {
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
    `);
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
    this.showSettingsModal();
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
        summonMonsterNear(this.currentLevel, x, y, weightedMonster(this.currentDepth));
        this.log("A summoning glyph tears open beside you.", "bad");
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
          summonMonsterNear(level, monster.x, monster.y, weightedMonster(this.currentDepth));
          this.log(`${monster.name} calls for aid from the dark.`, "bad");
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
      "depth-4": "Scratched runes warn of a prisoner and a chapel below. The dungeon has more memory than mercy.",
      "depth-7": "The air turns still and ceremonial. Whatever guards the Runestone has been waiting a very long time."
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
      this.showHubModal("pack", { selection: this.getDefaultPackSelection(Number(index)) });
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
        if (this.currentDepth === 0) {
          this.log("The rune gutters out. You are already in town.", "warning");
          return;
        }
        this.currentDepth = 0;
        this.currentLevel = this.levels[0];
        this.placePlayerAt(this.currentLevel.start.x, this.currentLevel.start.y);
        this.log("The rune of return carries you safely back to town.", "good");
        break;
      default:
        break;
    }
    removeAt(this.player.inventory, Number(index));
    this.closeModal();
    this.endTurn();
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
        this.showHubModal("pack", { selection: { type: "slot", value: item.slot } });
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
      this.showHubModal("pack", { selection: { type: "slot", value: item.slot } });
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
    this.showHubModal("pack", { selection: this.getDefaultPackSelection(Number(index)) });
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
      this.showHubModal("pack", { selection: { type: "slot", value: slot } });
      this.render();
      return;
    }
    this.player.equipment[slot] = null;
    this.player.inventory.push(item);
    this.recalculateDerivedStats();
    this.log(`You stow ${getItemName(item, true)} in your pack.`, "good");
    this.showHubModal("pack", { selection: { type: "inventory", value: this.player.inventory.length - 1 } });
    this.render();
  }

  prepareSpell(spellId) {
    const spell = SPELLS[spellId];
    if (!spell) {
      return;
    }
    const spellCost = getSpellCost(this, spell);
    if (this.player.mana < spellCost) {
      const shortage = getOvercastLoss(this, spellCost - this.player.mana);
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
        this.audio.play("cast");
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
    if (service === "bank") {
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
    const price = Math.round(getItemValue(item) * 1.2);
    if (this.player.gold < price) {
      this.log("You cannot afford that.", "warning");
      return;
    }
    this.player.gold -= price;
    this.addItemToInventory(item);
    const shop = this.shopState[shopId];
    if (shop) {
      removeOne(shop.stock, itemId);
    }
    this.log(`Purchased ${getItemName(item, true)} for ${price} gold.`, "good");
    this.showShopModal(shopId, SHOPS[shopId]);
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
    const basePrice = this.pendingShop && this.pendingShop.id === "junk" ? 25 : Math.round(getItemValue(item) * 0.55);
    const price = Math.max(1, basePrice);
    this.player.gold += price;
    item.identified = true;
    if (this.pendingShop && this.pendingShop.id !== "junk") {
      this.shopState[this.pendingShop.id].buyback.unshift(item.id);
      this.shopState[this.pendingShop.id].buyback = this.shopState[this.pendingShop.id].buyback.slice(0, 8);
    }
    removeAt(this.player.inventory, Number(index));
    this.log(`Sold ${getItemName(item, true)} for ${price} gold.`, "good");
    if (this.pendingShop) {
      this.showShopModal(this.pendingShop.id, this.pendingShop);
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
    this.showBankModal();
    this.render();
  }

  refreshShopState(force = false) {
    if (!force && this.turn - this.lastTownRefreshTurn < 120) {
      return;
    }
    ensureTownMetaState(this);
    refreshTownStocks(this);
    this.lastTownRefreshTurn = this.turn;
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
    this.showTempleModal();
    this.render();
  }

  useSageService(serviceId) {
    if (serviceId !== "identifyAll") {
      return;
    }
    const price = 60;
    if (this.player.gold < price) {
      this.log("The sage will not work for free.", "warning");
      return;
    }
    this.player.gold -= price;
    const count = this.identifyInventoryAndEquipment();
    this.log(count > 0 ? `The sage identifies ${count} item${count === 1 ? "" : "s"}.` : "The sage shrugs. Nothing remains mysterious.", "good");
    this.showSageModal();
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
      this.mode = "modal";
      this.showSimpleModal("Victory", `
        <div class="text-block">
          ${escapeHtml(this.player.name)} returns the Runestone of the Winds to the valley town.<br><br>
          The keep above remains dangerous, but the first great descent is complete.
        </div>
      `);
    }
  }

  hasPendingProgressionChoice() {
    return hasPendingProgressionChoice(this);
  }

  recordChronicleEvent(type, payload = {}) {
    recordChronicleEvent(this, type, payload);
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
              <button class="spell-learn-card" data-action="choose-reward" data-reward="${id}" type="button">
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
    this.recalculateDerivedStats();
    this.closeModal();
    this.updateFov();
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
            <button class="spell-learn-card" data-action="learn-spell" data-spell="${spell.id}" type="button">
              <span class="spell-learn-tier">Spell Level ${spell.learnLevel || 1}</span>
              <span class="spell-learn-name">${escapeHtml(spell.name)}</span>
              <span class="spell-learn-meta">${escapeHtml(spell.target === "monster" ? `Range ${spell.range || 1}` : "Self cast")} · ${getSpellCost(this, spell)} mana</span>
              <span class="spell-learn-copy">${escapeHtml(spell.description)}</span>
            </button>
          `).join("")}
        </div>
      </div>
    `;
    this.modalRoot.classList.remove("hidden");
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

  showSimpleModal(title, bodyHtml) {
    this.setModalVisibility(true);
    const template = document.getElementById("list-modal-template");
    const fragment = template.content.cloneNode(true);
    fragment.getElementById("generic-modal-title").textContent = title;
    fragment.getElementById("generic-modal-body").innerHTML = bodyHtml;
    this.modalRoot.innerHTML = "";
    this.modalRoot.appendChild(fragment);
    this.modalRoot.classList.remove("hidden");
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
    return item.kind === "weapon" || item.kind === "armor" ? "Equip" : "Use";
  }

  getPackItemMeta(item) {
    const bits = [item.slot ? this.getPackSlotDefinition(item.slot).label : item.kindLabel || classifyItem(item)];
    if (item.kind === "weapon") {
      bits.push(`Atk ${getItemPower(item)}`);
    } else if (item.kind === "armor") {
      bits.push(`Arm ${getItemArmor(item)}`);
    } else if (item.kind === "charged" && item.identified) {
      bits.push(`${item.charges}/${item.maxCharges || item.charges} ch`);
    } else if (item.kind === "spellbook") {
      bits.push("Learn spell");
    }
    return bits.join(" • ");
  }

  getPackItemNote(item) {
    const bits = [`Wt ${item.weight || 0}`, `${Math.floor(getItemValue(item))} gp`];
    if (canIdentify(item) && !item.identified) {
      bits.push("Unknown");
    }
    if (item.cursed && item.identified) {
      bits.push("Cursed");
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
      return {
        equipped: null,
        deltas: [],
        weightDelta: item.weight || 0,
        encumbrancePreview: this.describeBurdenPreview(0)
      };
    }

    const deltas = [
      this.buildComparisonDelta("Attack", getItemPower(item) - getItemPower(equipped)),
      this.buildComparisonDelta("Armor", getItemArmor(item) - getItemArmor(equipped)),
      this.buildComparisonDelta("Mana", getItemManaBonus(item) - getItemManaBonus(equipped)),
      this.buildComparisonDelta("Dex", getItemDexBonus(item) - getItemDexBonus(equipped)),
      this.buildComparisonDelta("Sight", getItemLightBonus(item) - getItemLightBonus(equipped)),
      this.buildComparisonDelta("Weight", (item.weight || 0) - (equipped.weight || 0), true)
    ].filter(Boolean);

    return {
      equipped,
      deltas,
      weightDelta: (item.weight || 0) - (equipped.weight || 0),
      encumbrancePreview: this.describeBurdenPreview(0)
    };
  }

  getItemBadgeMarkup(item) {
    const badges = [
      `<span class="item-chip kind-chip">${escapeHtml(item.kindLabel || classifyItem(item))}</span>`
    ];
    if (item.slot) {
      badges.push(`<span class="item-chip">Slot ${escapeHtml(this.getPackSlotDefinition(item.slot).label)}</span>`);
    }
    if (item.kind === "weapon") {
      badges.push(`<span class="item-chip">Power ${getItemPower(item)}</span>`);
    }
    if (item.kind === "armor") {
      badges.push(`<span class="item-chip">Armor ${getItemArmor(item)}</span>`);
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
    if (item.weight) {
      badges.push(`<span class="item-chip">Wt ${item.weight}</span>`);
    }
    badges.push(`<span class="item-chip">Value ${Math.floor(getItemValue(item))} gp</span>`);
    if (canIdentify(item) && !item.identified) {
      badges.push(`<span class="item-chip warning-chip">Unknown quality</span>`);
    }
    if (item.cursed && item.identified) {
      badges.push(`<span class="item-chip bad-chip">Cursed</span>`);
    }
    return badges.join("");
  }

  getInventoryGroupsMarkup(selectedIndex) {
    const groups = [
      {
        label: "Gear",
        items: this.player.inventory
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.kind === "weapon" || item.kind === "armor")
      },
      {
        label: "Consumables",
        items: this.player.inventory
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.kind === "consumable")
      },
      {
        label: "Arcana",
        items: this.player.inventory
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.kind === "charged" || item.kind === "spellbook")
      },
      {
        label: "Other",
        items: this.player.inventory
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => !["weapon", "armor", "consumable", "charged", "spellbook"].includes(item.kind))
      }
    ].filter((group) => group.items.length > 0);

    if (groups.length === 0) {
      return `<div class="text-block">Your pack is empty.</div>`;
    }

    return groups.map((group) => `
      <section class="pack-group">
        <div class="pack-group-title">${group.label}</div>
        <div class="pack-group-list">
          ${group.items.map(({ item, index }) => `
            <button class="pack-item-row${selectedIndex === index ? " active" : ""}" data-action="inspect-pack-item" data-index="${index}" type="button">
              <span class="pack-item-name">${escapeHtml(getItemName(item))}</span>
              <span class="pack-item-meta">${escapeHtml(this.getPackItemMeta(item))}</span>
              <span class="pack-item-note">${escapeHtml(this.getPackItemNote(item))}</span>
            </button>
          `).join("")}
        </div>
      </section>
    `).join("");
  }

  getPackInspectorMarkup(model) {
    if (!model.item && model.selection.type === "slot") {
      const compatibleRows = model.compatibleIndexes.length === 0
        ? `<div class="muted">No carried item fits this slot right now.</div>`
        : `
          <div class="pack-compatible-list">
            ${model.compatibleIndexes.map((index) => `
              <button class="tiny-button pack-ready-chip" data-action="inspect-pack-item" data-index="${index}" type="button">${escapeHtml(getItemName(this.player.inventory[index]))}</button>
            `).join("")}
          </div>
        `;
      return `
        <section class="hub-section pack-inspector-panel">
          <div class="panel-title">Decision Card</div>
          <div class="pack-inspector-card">
            <div class="pack-inspector-kicker">${escapeHtml(model.slotDef.label)}</div>
            <div class="pack-inspector-title">Empty Slot</div>
            <div class="pack-inspector-copy">${escapeHtml(model.slotDef.emptyText)}</div>
            <div class="pack-inspector-note ${model.encumbrancePreview.tone}">${escapeHtml(model.encumbrancePreview.text)}</div>
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
    const statLines = [
      item.kind === "weapon" ? `Attack ${getItemPower(item)}` : "",
      item.kind === "armor" ? `Armor ${getItemArmor(item)}` : "",
      getItemManaBonus(item) ? `Mana +${getItemManaBonus(item)}` : "",
      getItemDexBonus(item) ? `Dex +${getItemDexBonus(item)}` : "",
      getItemLightBonus(item) ? `Sight +${getItemLightBonus(item)}` : "",
      item.weight || item.weight === 0 ? `Weight ${item.weight || 0}` : "",
      `Value ${Math.floor(getItemValue(item))} gp`
    ].filter(Boolean);
    const actions = model.selection.type === "inventory"
      ? `
        <button class="menu-button pack-action-primary is-active" data-action="item-use" data-index="${model.selection.value}" type="button">${this.getPackItemActionLabel(item)}</button>
        <button class="menu-button" data-action="item-drop" data-index="${model.selection.value}" type="button">Drop</button>
      `
      : `
        <button class="menu-button pack-action-primary is-active" data-action="unequip-slot" data-slot="${model.selection.value}" type="button"${item.cursed ? " disabled" : ""}>Unequip</button>
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

    return `
      <section class="hub-section pack-inspector-panel">
        <div class="panel-title">${model.selection.type === "slot" ? "Equipped Detail" : "Decision Card"}</div>
        <div class="pack-inspector-card">
          <div class="pack-inspector-kicker">${escapeHtml(model.slotDef ? model.slotDef.label : item.kindLabel || classifyItem(item))}</div>
          <div class="pack-inspector-title">${escapeHtml(getItemName(item))}</div>
          <div class="pack-item-badges">${this.getItemBadgeMarkup(item)}</div>
          <div class="pack-inspector-copy">${escapeHtml(describeItem(item))}</div>
          <div class="pack-stat-grid">
            ${statLines.map((line) => `<div class="pack-stat-pill">${escapeHtml(line)}</div>`).join("")}
          </div>
          ${equippedSwap}
          ${comparisonBlock}
          ${cursedNote}
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
          <button class="hub-tab${tab.id === activeTab ? " active" : ""}" data-action="open-hub" data-tab="${tab.id}" type="button">${tab.label}</button>
        `).join("")}
      </div>
    `;
  }

  getPackHubMarkup() {
    const model = this.getPackSelectionModel();
    const burdenUi = this.getBurdenUiState();
    const equipmentValue = Object.values(this.player.equipment).reduce((sum, item) => sum + (item ? getItemValue(item) : 0), 0);
    const packValue = this.player.inventory.reduce((sum, item) => sum + getItemValue(item), 0);
    const paperdoll = this.getPackSlotDefinitions().map((slotDef) => {
      const item = this.player.equipment[slotDef.slot];
      const compatibleCount = this.getCompatibleInventoryIndexes(slotDef.slot).length;
      const isActive = model.selection.type === "slot" && model.selection.value === slotDef.slot;
      return `
        <button class="paper-slot slot-${slotDef.area}${isActive ? " active" : ""}" data-action="inspect-slot" data-slot="${slotDef.slot}" type="button">
          <span class="paper-slot-label">${escapeHtml(slotDef.label)}</span>
          <span class="paper-slot-item">${item ? escapeHtml(getItemName(item)) : "Empty"}</span>
          <span class="paper-slot-note">${item ? escapeHtml(describeItem(item)) : escapeHtml(slotDef.emptyText)}</span>
          ${compatibleCount > 0 ? `<span class="paper-slot-badge">${compatibleCount} ready</span>` : ""}
        </button>
      `;
    }).join("");

    return `
      <div class="hub-body">
        <div class="hub-summary">
          <div class="mini-panel"><strong>Gold</strong><br>${Math.floor(this.player.gold)} gp</div>
          <div class="mini-panel burden-panel burden-${burdenUi.state}"><strong>Burden</strong><br><span class="burden-value burden-${burdenUi.state}">${burdenUi.weight} / ${burdenUi.capacity}</span><div class="mini-meter burden burden-${burdenUi.state}"><span style="width:${burdenUi.percent}%"></span></div><span class="mini-panel-note">${escapeHtml(burdenUi.label)}</span></div>
          <div class="mini-panel"><strong>Attack</strong><br>${this.getAttackValue()}</div>
          <div class="mini-panel"><strong>Armor</strong><br>${this.getArmorValue()}</div>
          <div class="mini-panel"><strong>Pack Value</strong><br>${Math.floor(packValue)} gp</div>
          <div class="mini-panel"><strong>Equipped Value</strong><br>${Math.floor(equipmentValue)} gp</div>
        </div>
        <div class="pack-layout">
          <section class="hub-section pack-equipment-panel">
            <div class="panel-title">Equipment Layout</div>
            <div class="pack-paperdoll">
              ${paperdoll}
              <div class="paperdoll-core">
                <div class="paperdoll-core-kicker">Loadout</div>
                <div class="paperdoll-avatar">
                  <div class="avatar-head"></div>
                  <div class="avatar-body"></div>
                  <div class="avatar-arms"></div>
                  <div class="avatar-legs"></div>
                </div>
                <div class="paperdoll-core-note">Pick a slot to inspect what is worn there, or choose an item from the pack to compare and equip it.</div>
              </div>
            </div>
          </section>
          <section class="hub-section pack-inventory-panel">
            <div class="panel-title">Pack Contents</div>
            <div class="inventory-list-panel pack-list-panel">
              ${this.getInventoryGroupsMarkup(model.selection.type === "inventory" ? model.selection.value : -1)}
            </div>
          </section>
          ${this.getPackInspectorMarkup(model)}
        </div>
        <section class="hub-section inventory-detail">
          <strong>Field Notes</strong><br>
          Unknown gear hides its real quality until identified. Charged items only reveal remaining power once understood.
          Cursed worn gear locks to its slot until the curse is broken.
        </section>
      </div>
    `;
  }

  getMagicHubMarkup() {
    const rows = this.player.spellsKnown.length === 0
      ? `<div class="text-block">No spells are known.</div>`
      : this.player.spellsKnown.map((spellId) => {
        const spell = SPELLS[spellId];
        const targetLabel = spell.target === "monster" ? `Range ${spell.range || 1}` : "Self cast";
        return `
          <div class="list-row">
            <div>
              <div><strong>${escapeHtml(spell.name)}</strong> <span class="muted">(${getSpellCost(this, spell)} mana${this.player.mana < getSpellCost(this, spell) ? ", overcast" : ""})</span></div>
              <div class="muted">${escapeHtml(targetLabel)} &middot; ${escapeHtml(spell.description)}</div>
            </div>
            <div class="actions">
              <button class="tiny-button" data-action="spell-cast" data-spell="${spellId}" type="button">Cast</button>
            </div>
          </div>
        `;
      }).join("");

    return `
      <div class="hub-body">
        <div class="hub-summary">
          <div class="mini-panel"><strong>Mana</strong><br>${Math.floor(this.player.mana)} / ${this.player.maxMana}</div>
          <div class="mini-panel"><strong>Known</strong><br>${this.player.spellsKnown.length}</div>
          <div class="mini-panel"><strong>Overcast</strong><br>${this.player.mana > 0 ? "Available" : "Risky"}</div>
        </div>
        <section class="hub-section">
          <div class="panel-title">Spell Book</div>
          ${rows}
        </section>
      </div>
    `;
  }

  getJournalHubMarkup() {
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

    return `
      <div class="hub-body">
        <div class="hub-summary">
          <div class="mini-panel"><strong>Depth</strong><br>${this.currentDepth}</div>
          <div class="mini-panel"><strong>Turn</strong><br>${this.turn}</div>
          <div class="mini-panel"><strong>Explored</strong><br>${getExploredPercent(this.currentLevel)}%</div>
          <div class="mini-panel"><strong>Deepest</strong><br>${this.player.deepestDepth}</div>
        </div>
        <section class="hub-section">
          <div class="panel-title">Objective Loop</div>
          <div class="text-block">
            <strong>${escapeHtml(this.currentLevel.description)}</strong><br>
            ${escapeHtml(objectiveText)}<br><br>
            ${escapeHtml(optionalText || questState)}
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
          <div class="panel-title">Build</div>
          <div class="text-block">
            ${buildSummary.length > 0 ? escapeHtml(buildSummary.join(", ")) : "No perks or relics claimed yet."}<br><br>
            ${escapeHtml(getObjectiveRewardPreview(this.currentLevel) || "No objective reward preview available.")}
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Chronicle</div>
          <div class="message-log journal-log">${renderChronicleMarkup(this, 12)}</div>
        </section>
        <section class="hub-section utility-row">
          <button class="menu-button" data-action="save-game" type="button">Save</button>
          <button class="menu-button" data-action="load-game" type="button">Load</button>
          <button class="menu-button" data-action="settings" type="button">Settings</button>
          <button class="menu-button" data-action="help" type="button">Help</button>
        </section>
      </div>
    `;
  }

  showHubModal(defaultTab = "pack", options = {}) {
    if (!this.player) {
      return;
    }
    this.mode = "modal";
    this.activeHubTab = ["pack", "magic", "journal"].includes(defaultTab) ? defaultTab : "pack";
    if (this.activeHubTab === "pack") {
      this.setPackSelection(options.selection || this.activePackSelection || this.getDefaultPackSelection());
      this.resolvePackSelection();
    }

    const tabMarkup = this.getHubTabsMarkup(this.activeHubTab);
    const bodyMarkup = this.activeHubTab === "magic"
      ? this.getMagicHubMarkup()
      : this.activeHubTab === "journal"
        ? this.getJournalHubMarkup()
        : this.getPackHubMarkup();

    this.showSimpleModal("Field Hub", `
      <div class="hub-window">
        ${tabMarkup}
        ${bodyMarkup}
      </div>
    `);
  }

  showInventoryModal() {
    this.showHubModal("pack");
  }

  showSpellModal() {
    this.showHubModal("magic");
  }

  showShopModal(shopId, shop) {
    this.mode = "modal";
    this.pendingShop = { ...shop, id: shopId };
    this.pendingService = null;
    const state = this.shopState[shopId] || { stock: [...shop.stock], buyback: [] };
    const liveStock = [...state.stock, ...state.buyback];
    const stockRows = liveStock.map((itemId) => {
      const item = createTownItem(itemId);
      const price = Math.round(getItemValue(item) * 1.2);
      const disabled = this.player.gold < price ? "disabled" : "";
      return `
        <div class="shop-row">
          <div>
            <div><strong>${escapeHtml(getItemName(item, true))}</strong> <span class="muted">${price} gp</span></div>
            <div class="muted">${escapeHtml(describeItem(item))}</div>
          </div>
          <div class="actions">
            <button class="tiny-button" data-action="shop-buy" data-shop="${shopId}" data-item="${itemId}" type="button" ${disabled}>Buy</button>
          </div>
        </div>
      `;
    }).join("");

    const sellableItems = this.player.inventory.filter((item) => shopId === "junk" || shopAcceptsItem(shopId, item));
    const sellRows = sellableItems.length === 0
      ? `<div class="text-block">Nothing here matches what this shop buys.</div>`
      : sellableItems.map((item) => `
        <div class="shop-row">
          <div>
            <div><strong>${escapeHtml(getItemName(item))}</strong> <span class="muted">${shopId === "junk" ? 25 : Math.max(1, Math.round(getItemValue(item) * 0.55))} gp</span></div>
            <div class="muted">${escapeHtml(describeItem(item))}</div>
          </div>
          <div class="actions">
            <button class="tiny-button" data-action="shop-sell" data-index="${this.player.inventory.indexOf(item)}" type="button">Sell</button>
          </div>
        </div>
      `).join("");

    this.showSimpleModal(`${shop.name}`, `
      <div class="section-block text-block">${escapeHtml(shop.greeting)}</div>
      <div class="section-block"><strong>Your gold:</strong> ${Math.floor(this.player.gold)}</div>
      <div class="section-block">
        <div class="field-label">Buy</div>
        ${stockRows}
      </div>
      <div class="section-block">
        <div class="field-label">Sell</div>
        ${sellRows}
      </div>
    `);
  }

  showTempleModal() {
    this.mode = "modal";
    this.pendingShop = null;
    this.pendingService = { type: "temple" };
    this.showSimpleModal("Temple", `
      <div class="section-block text-block">The priests offer healing, restoration, and the expensive correction of cursed mistakes.</div>
      <div class="section-block"><strong>Your gold:</strong> ${Math.floor(this.player.gold)}</div>
      ${TEMPLE_SERVICES.map((service) => `
        <div class="shop-row">
          <div>
            <div><strong>${escapeHtml(service.name)}</strong> <span class="muted">${getTemplePrice(this, service.price)} gp</span></div>
            <div class="muted">${escapeHtml(service.description)}</div>
          </div>
          <div class="actions">
            <button class="tiny-button" data-action="service-use" data-service="${service.id}" type="button">Use</button>
          </div>
        </div>
      `).join("")}
    `);
  }

  showSageModal() {
    this.mode = "modal";
    this.pendingShop = null;
    this.pendingService = { type: "sage" };
    const unknownCount = countUnknownItems(this.player);
    this.showSimpleModal("Sage's Tower", `
      <div class="section-block text-block">The sage identifies your mysterious belongings for a flat fee.</div>
      <div class="section-block">
        <div class="stat-line"><span>Your gold</span><strong>${Math.floor(this.player.gold)} gp</strong></div>
        <div class="stat-line"><span>Unknown items</span><strong>${unknownCount}</strong></div>
        <div class="stat-line"><span>Price</span><strong>60 gp</strong></div>
      </div>
      <div class="modal-actions">
        <button class="menu-button" data-action="service-use" data-service="identifyAll" type="button">Identify</button>
        <button class="menu-button" data-action="close-modal" type="button">Close</button>
      </div>
    `);
  }

  showBankModal() {
    this.mode = "modal";
    ensureTownMetaState(this);
    const unlockRows = getAvailableTownUnlocks(this).slice(0, 3).map((unlockDef) => `
      <div class="shop-row">
        <div>
          <div><strong>${escapeHtml(unlockDef.name)}</strong> <span class="muted">${unlockDef.cost} gp</span></div>
          <div class="muted">${escapeHtml(unlockDef.description)}</div>
        </div>
        <div class="actions">
          <button class="tiny-button" data-action="town-unlock" data-unlock="${unlockDef.id}" type="button"${this.player.gold < unlockDef.cost ? " disabled" : ""}>Fund</button>
        </div>
      </div>
    `).join("");
    const intel = getTownIntel(this);
    const nextRumor = intel.nextRumor
      ? `<div class="text-block">${escapeHtml(intel.nextRumor.text)}</div>`
      : `<div class="text-block muted">No clear rumor about the next floor yet.</div>`;
    const knownRumors = intel.known.length > 0
      ? intel.known.map((rumor) => `<div class="log-line">${escapeHtml(rumor.text)}</div>`).join("")
      : "<div class='muted'>No secured rumors yet.</div>";
    this.showSimpleModal("Bank", `
      <div class="section-block text-block">Town return is a strategic layer now: bank gold if you want, but you can also fund better stock and buy forward intel.</div>
      <div class="section-block">
        <div class="stat-line"><span>On Hand</span><strong>${Math.floor(this.player.gold)} gp</strong></div>
        <div class="stat-line"><span>On Account</span><strong>${Math.floor(this.player.bankGold)} gp</strong></div>
        <div class="stat-line"><span>Rumor Tokens</span><strong>${this.player.runCurrencies?.rumorTokens || 0}</strong></div>
      </div>
      <div class="modal-actions">
        <button class="menu-button" data-action="bank-deposit" type="button">Deposit 100</button>
        <button class="menu-button" data-action="bank-withdraw" type="button">Withdraw 100</button>
        <button class="menu-button" data-action="town-rumor" type="button">Buy Intel</button>
        <button class="menu-button" data-action="close-modal" type="button">Close</button>
      </div>
      <div class="section-block">
        <div class="field-label">Next Floor Intel</div>
        ${nextRumor}
      </div>
      <div class="section-block">
        <div class="field-label">Investments</div>
        ${unlockRows || "<div class='text-block muted'>All current town investments are funded.</div>"}
      </div>
      <div class="section-block">
        <div class="field-label">Rumor Archive</div>
        <div class="message-log journal-log">${knownRumors}</div>
      </div>
    `);
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
          Keyboard: arrows or numpad move, F searches, U uses, I opens pack, S opens spells<br>
          Controller: stick or D-pad moves, A takes the primary action, X triggers the secondary action, Y opens pack, B waits or cancels targeting<br>
          Touch: use the on-screen pad as fallback movement and the dock for your main actions
      </div>
      </div>
      <div class="section-block">
        <div class="field-label">Dungeon Notes</div>
        <div class="text-block">
          Search for hidden doors and traps. Heavy burden reduces dodge and lets monsters press harder.
          Targeted spells and wands require line of sight. Resting is noisy, and enemy intent icons now telegraph rushes,
          ranged shots, summons, and other ugly plans before they land.
        </div>
      </div>
    `);
  }

  closeModal() {
    this.setModalVisibility(false);
    this.modalRoot.classList.add("hidden");
    this.modalRoot.innerHTML = "";
    this.pendingService = null;
    this.activeHubTab = "pack";
    if (this.targetMode && this.mode !== "target") {
      this.targetMode = null;
    }
    if (!this.player) {
      this.showTitleScreen();
      return;
    }
    if (this.player && this.player.hp > 0 && !this.player.quest.complete) {
      this.mode = "game";
    }
  }

  log(message, tone = "") {
    this.messages.push({ turn: this.turn, message, tone });
    if (this.messages.length > 120) {
      this.messages.shift();
    }
  }

  render() {
    this.renderBoard();
    this.renderMiniMap();
    this.renderPanels();
    this.renderActionBar();
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

    this.currentLevel.actors.forEach((actor) => {
      if (this.currentDepth !== 0 && !isVisible(this.currentLevel, actor.x, actor.y)) {
        return;
      }
      ctx.fillStyle = "#c94a4a";
      ctx.fillRect(Math.floor(actor.x * scaleX), Math.floor(actor.y * scaleY), Math.max(2, Math.ceil(scaleX)), Math.max(2, Math.ceil(scaleY)));
    });

    ctx.fillStyle = "#7bd0ff";
    ctx.fillRect(Math.floor(this.player.x * scaleX), Math.floor(this.player.y * scaleY), Math.max(3, Math.ceil(scaleX)), Math.max(3, Math.ceil(scaleY)));

    if (this.mapCaption) {
      const modeLabel = this.currentDepth === 0 ? "Town routes" : "Dungeon survey";
      this.mapCaption.innerHTML = `
        <div class="map-caption-row">
          <span class="map-chip">Depth ${this.currentDepth}</span>
          <span class="map-chip">${escapeHtml(this.currentLevel.description)}</span>
        </div>
        <div class="map-caption-row">
          <span class="map-chip subtle">Explored ${getExploredPercent(this.currentLevel)}%</span>
          <span class="map-chip subtle">${modeLabel}</span>
        </div>
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
      ...effectProfile
    });

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
      drawMonsterIntent(ctx, actor, sx, sy, time, effectProfile);
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
    if (this.controllerStatus) {
      const connected = this.gamepadInput.isConnected();
      const compact = typeof window !== "undefined" && window.innerWidth <= 640;
      this.controllerStatus.textContent = connected
        ? compact ? "Controller ready" : `Controller: ${this.gamepadInput.getControllerName()}`
        : compact ? "Touch active" : "Touch controls active";
    }
    if (this.touchControls) {
      const hiddenBySetting = !this.settings.touchControlsEnabled;
      const hiddenByController = this.settings.controllerHintsEnabled && this.gamepadInput.isConnected();
      this.touchControls.classList.toggle("hidden", hiddenBySetting || hiddenByController);
    }
    syncSaveChrome(this);
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

  showCreationModal() { showCreationScreen(this); }

  renderActionBar() { renderAdvisorActionBar(this); }

  getAdvisorModel() { return buildAdvisorModel(this); }

  renderPanels() { renderAdvisorPanels(this); }

  renderLog() {
    return this.renderLogMarkup(32);
  }
}
