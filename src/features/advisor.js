import { getMonsterHealthState } from "../core/entities.js";
import { getTile, itemsAt } from "../core/world.js";
import { clamp, distance, escapeHtml } from "../core/utils.js";
import { getDangerSummary, getPressureStatus } from "./director.js";
import { getObjectiveRoomClear, getObjectiveStatusText, getOptionalStatusText } from "./objectives.js";
import { renderOnboardingChecklist, shouldShowOnboardingChecklist } from "./onboarding.js";
import { getValidationVariant } from "./validation.js";

function buildObjectiveAdvice(game, tile, hpRatio, manaRatio, visible, focus, lootHere) {
  const directive = game.getLoopDirective ? game.getLoopDirective(tile) : null;
  const objectiveText = getObjectiveStatusText(game.currentLevel);
  const optionalText = getOptionalStatusText(game.currentLevel);
  const objectiveGuide = directive?.primaryText || (game.getObjectiveGuideText ? game.getObjectiveGuideText() : "");
  const floorThesis = game.getFloorThesisText ? game.getFloorThesisText() : "";
  const routeCue = directive?.routeCueText || (game.getCurrentRouteCueText ? game.getCurrentRouteCueText() : "");
  const dangerNote = directive?.supportText || (game.getImmediateDangerNote ? game.getImmediateDangerNote() : "");
  const townMeta = game.currentDepth === 0 && game.getTownMetaSummary ? game.getTownMetaSummary() : null;
  const actions = [];
  const pushAction = (action, label, note, recommended = false, tab = "") => {
    if (!actions.some((entry) => entry.action === action)) {
      actions.push({ action, label, note, recommended, tab });
    }
  };

  let advice = objectiveText;
  if (visible.length > 0 && focus) {
    const focusIntent = focus.intent?.type || "";
    const focusDistance = distance(game.player, focus);
    advice = `Hold against ${focus.name}.`;
    if (focusIntent === "sleep") {
      advice = `${focus.name} is sleeping. Open on your terms or slip past.`;
      pushAction("search", "Scout", "Set the clean route", true);
      if (game.player.spellsKnown.length > 0) {
        pushAction("open-spell-tray", "Magic", "Prep a clean opener", false, "magic");
      }
    } else if (hpRatio < 0.35 && (focusIntent === "shoot" || focusIntent === "summon" || focusIntent === "charge" || focusDistance <= 2)) {
      advice = `Break contact now. ${focus.name} can finish this exchange.`;
      pushAction("stairs-up", "Ascend", "Leave the floor", true);
      pushAction("open-spell-tray", "Magic", "Spend control or escape", false, "magic");
    } else if (focus.ranged && focusIntent !== "sleep") {
      advice = `Break line of sight on ${focus.name}.`;
      pushAction("open-spell-tray", "Magic", "Answer ranged pressure", true, "magic");
      pushAction("wait", "Hold", "Do not walk into fire", false);
    } else if (focus.abilities && focus.abilities.includes("charge") && focusIntent !== "sleep") {
      advice = "Sidestep the charge lane before you advance.";
      pushAction("wait", "Hold", "Read the charge lane", true);
      pushAction("open-spell-tray", "Magic", "Slow or burst it", false, "magic");
    } else if (focus.abilities && focus.abilities.includes("summon") && focusIntent !== "sleep") {
      advice = "Kill the summoner before the room fills.";
      pushAction("open-spell-tray", "Magic", "Kill summoner", true, "magic");
    } else if (focusDistance >= 4 && focusIntent === "advance") {
      advice = `${focus.name} is aware. Set the approach before opening more map.`;
      pushAction("wait", "Hold", "Read the lane", true);
      pushAction("search", "Scout", "Check nearby routes", false);
    } else {
      advice = `${focus.name} is closing. Take the clean trade.`;
      pushAction("wait", "Hold", "Take the clean exchange", false);
    }
  } else if (lootHere.length > 0) {
    advice = `Pick up ${game.summarizeLoot(lootHere, 2)} before moving on.`;
    pushAction("pickup", "Pick Up", lootHere.length === 1 ? game.describeItemReadout(lootHere[0]) : `${lootHere.length} items underfoot`, true);
  } else if (tile.objectiveId) {
    const objectiveId = game.currentLevel.floorObjective?.id;
    const roomClear = getObjectiveRoomClear(game);
    if (game.currentLevel.floorResolved) {
      advice = "Objective complete. Leave now or stay greedy.";
    } else if (objectiveId === "rescue_captive") {
      advice = roomClear
        ? "The captive is clear. Step onto the cell to pull them free."
        : "The captive is pinned here. Clear the room before the rescue can move.";
      pushAction("wait", "Hold", "Finish the fight before rescuing them", true);
      if (game.player.spellsKnown.length > 0) {
        pushAction("open-spell-tray", "Magic", "Spend control to win the room", false, "magic");
      }
    } else if (objectiveId === "purge_nest" && !roomClear) {
      advice = "The nest is exposed, but defenders are still alive. Clear the room first.";
      pushAction("wait", "Hold", "Finish the room before purging it", true);
    } else if (objectiveId === "recover_waystone") {
      advice = "Claim the waystone now. It sharpens the next floor instead of this one.";
      pushAction("pickup", "Take Waystone", "Bank the route edge", true);
    } else if (objectiveId === "seal_shrine") {
      advice = "Seal the shrine when ready. It spends mana and spikes floor pressure.";
      pushAction("interact", "Seal", "Finish the objective", true);
    } else if (objectiveId === "purify_well") {
      advice = "Purify the well when ready. It refills you, but the floor answers immediately.";
      pushAction("interact", "Purify", "Take the refill and clear the floor", true);
    } else {
      advice = "Resolve the objective now.";
      pushAction("interact", "Resolve", "Finish the floor objective", true);
    }
  } else if (tile.optionalId) {
    advice = "Optional reward is here. Touch it only if you want more pressure.";
    pushAction("interact", "Open Optional", "Take the greed line", true);
  } else if (tile.kind === "stairUp" && game.currentDepth > 0) {
    if (hpRatio < 0.45) {
      advice = "Use the stairs up now.";
      pushAction("stairs-up", "Ascend", "Leave the floor", true);
    } else if (game.currentLevel.floorResolved) {
      advice = "Stairs up are ready if you want to bank progress.";
      pushAction("stairs-up", "Ascend", "Leave the floor", false);
    } else {
      advice = "Stairs up are your fallback. Find the objective before you leave.";
      pushAction("search", game.currentDepth === 1 ? "Find Route" : "Find Objective", "Push toward the floor objective", true);
    }
  } else if (tile.kind === "stairDown") {
    if (game.currentLevel.floorResolved) {
      advice = "Descend if this build is ready for the next floor.";
      pushAction("stairs-down", "Descend", "Push the run deeper", true);
    } else {
      advice = "Ignore the stairs. Find the floor objective first.";
      pushAction("search", "Find Objective", "Scout the floor", true);
    }
  } else if (game.currentDepth === 0 && (game.player.deepestDepth || 0) === 0) {
    advice = game.storyFlags?.townServiceVisited
      ? "You checked a town door. Take the north road into the keep."
      : "Step onto one labeled town door, then take the north road into the keep.";
    pushAction(
      "map-focus",
      game.storyFlags?.townServiceVisited ? "Go North" : "Services",
      game.storyFlags?.townServiceVisited ? "Enter the keep" : "Open a town door",
      true
    );
    pushAction("open-briefing", "Briefing", "Hear the run goal", false);
    pushAction("open-hub", "Journal", "Review the run goal", false, "journal");
  } else if (game.currentDepth === 0 && townMeta) {
    advice = directive?.primaryText || townMeta.recommendedAction;
    pushAction("map-focus", "Survey", "Check current town state", false);
    pushAction("open-hub", "Journal", "Review town intel", false, "journal");
  } else if (game.currentDepth > 0 && (hpRatio < 0.75 || manaRatio < 0.65)) {
    advice = "Recovery is noisy. Sleep only if you can afford waking the floor.";
    pushAction("sleep", "Sleep", "Recover to full unless spotted", true);
    pushAction("rest", "Rest", "Take a shorter recovery", false);
    pushAction("search", "Search", "Probe for routes", false);
  } else if (game.currentDepth > 0) {
    advice = directive?.primaryText || (game.currentLevel.floorResolved
      ? "Objective complete. Extract or take one last greed line."
      : game.currentDepth === 1
        ? `Go to the objective. Search now sketches more of the route. ${objectiveText}`
        : `Go to the objective. ${objectiveText}`);
    pushAction(
      directive?.recommendedActionId === "stairs-up" ? "stairs-up" : "search",
      directive?.recommendedActionId === "stairs-up" ? "Ascend" : game.currentLevel.floorResolved ? "Search" : game.currentDepth === 1 ? "Find Route" : "Find Objective",
      directive?.recommendedActionId === "stairs-up"
        ? "Bank the floor now"
        : game.currentLevel.floorResolved
          ? "Probe for secrets or routes"
          : game.currentDepth === 1
            ? "Sketch more of the objective route"
            : "Probe for routes",
      true
    );
  }

  return {
    advice,
    objectiveText: directive?.primaryText || objectiveText,
    objectiveGuide,
    floorThesis,
    routeCue,
    dangerNote,
    townMeta,
    optionalText,
    actions
  };
}

function buildDockSlots(game, actions) {
  if (game.targetMode) {
    return [
      {
        key: "primary",
        prompt: "A",
        label: "Confirm",
        note: `Fire ${game.targetMode.name}`,
        action: "target-confirm",
        tone: "primary",
        active: true
      },
      {
        key: "secondary",
        prompt: "X",
        label: game.player.spellsKnown.length > 0 ? "Magic" : "Survey",
        note: game.player.spellsKnown.length > 0 ? "Review spell options" : "Check the minimap",
        action: game.player.spellsKnown.length > 0 ? "open-spell-tray" : "map-focus",
        tab: game.player.spellsKnown.length > 0 ? "magic" : "",
        tone: "primary"
      },
      {
        key: "back",
        prompt: "B",
        label: "Cancel",
        note: "Leave targeting",
        action: "target-cancel",
        tone: "secondary"
      },
      {
        key: "pack",
        prompt: "Y",
        label: "Pack",
        note: "Review loadout",
        action: "open-hub",
        tab: "pack",
        tone: "utility"
      }
    ];
  }

  const candidates = [];
  const seen = new Set();
  const firstTownRun = game.currentDepth === 0 && (game.player?.deepestDepth || 0) === 0;
  const pushCandidate = (entry) => {
    if (!entry || !entry.action) {
      return;
    }
    const key = `${entry.action}:${entry.tab || ""}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    candidates.push(entry);
  };

  actions.forEach(pushCandidate);
  if (firstTownRun && !game.storyFlags?.townServiceVisited) {
    pushCandidate({
      action: "open-briefing",
      label: "Briefing",
      note: "Hear the keep objective"
    });
  } else if (firstTownRun && game.storyFlags?.townServiceVisited) {
    pushCandidate({
      action: "map-focus",
      label: "Go North",
      note: "Enter the keep"
    });
  }
  if (game.player.spellsKnown.length > 0) {
    pushCandidate({
      action: "open-spell-tray",
      label: "Magic",
      note: "Cast, burst, or control",
      tab: "magic"
    });
  }
  pushCandidate(game.currentDepth > 0
    ? {
        action: "search",
        label: game.currentLevel?.floorResolved ? "Scout" : "Find Route",
        note: game.currentLevel?.floorResolved ? "Probe for secrets or greed" : "Probe for routes"
      }
    : {
        action: "map-focus",
        label: "Survey",
        note: "Open the field survey"
      });
  pushCandidate({
    action: "wait",
    label: game.currentDepth > 0 ? "Hold" : "Wait",
    note: "Spend a careful turn"
  });

  while (candidates.length < 3) {
    pushCandidate({
      action: "open-utility-menu",
      label: "Menu",
      note: "Save, settings, and help"
    });
  }

  const dominantHud = getValidationVariant(game, "hud") === "dominant_cta";
  const orderedCandidates = dominantHud
    ? candidates.slice().sort((left, right) => Number(Boolean(right.recommended)) - Number(Boolean(left.recommended)))
    : candidates;
  const primaryAction = game.getControllerPrimaryDockAction
    ? game.getControllerPrimaryDockAction(orderedCandidates)
    : orderedCandidates[0];
  const secondaryAction = orderedCandidates.find((entry) =>
    entry.action !== primaryAction.action || (entry.tab || "") !== (primaryAction.tab || "")
  ) || orderedCandidates[0];

  return [
    {
      key: "primary",
      prompt: "A",
      label: primaryAction.label,
      note: primaryAction.note,
      action: primaryAction.action,
      tab: primaryAction.tab || "",
      service: primaryAction.service || "",
      tone: "primary",
      active: true
    },
    {
      key: "secondary",
      prompt: "X",
      label: secondaryAction.label,
      note: secondaryAction.note,
      action: secondaryAction.action,
      tab: secondaryAction.tab || "",
      tone: "secondary"
    },
    {
      key: "back",
      prompt: "B",
      label: "Back",
      note: game.layoutMode === "desktop"
        ? "Cancel targeting or close menus"
        : game.mapDrawer && game.mapDrawerOpen
          ? "Close the survey"
          : "Cancel targeting or close menus",
      action: "target-cancel",
      tone: "secondary"
    },
    {
      key: "pack",
      prompt: "Y",
      label: "Pack",
      note: "Review loadout",
      action: "open-hub",
      tab: "pack",
      tone: "utility"
    }
  ];
}

function buildActionBarMarkup(dockSlots = []) {
  return dockSlots.map((slot) => `
    <button class="action-button dock-action dock-slot dock-slot-${slot.key} dock-tone-${slot.tone}${slot.tone === "primary" ? " recommended" : ""}${slot.active ? " is-active" : ""}" data-action="${slot.action}"${slot.tab ? ` data-tab="${slot.tab}"` : ""}${slot.service ? ` data-service="${slot.service}"` : ""} data-focus-key="dock:${slot.key}" type="button">
      <span class="context-slot">${escapeHtml(slot.prompt)}</span>
      <span class="context-copy">
        <span class="context-main">${escapeHtml(slot.label)}</span>
        <span class="context-note">${escapeHtml(slot.note)}</span>
      </span>
    </button>
  `).join("");
}

function syncMarkup(game, cacheKey, element, markup) {
  if (!element) {
    return;
  }
  if (game[cacheKey] !== markup) {
    element.innerHTML = markup;
    game[cacheKey] = markup;
  }
}

export function getAdvisorModel(game) {
  if (!game.player || !game.currentLevel) {
    return {
      statsHtml: "<div class='muted'>No active run.</div>",
      objectiveHtml: "<div class='muted'>No active directive.</div>",
      fieldHtml: "<div class='field-summary-head'><span class='advisor-label'>Field Read</span><span class='field-summary-state'>No active run</span></div><div class='field-summary-text'>Create a character to begin.</div>",
      dockSlots: []
    };
  }

  const tile = getTile(game.currentLevel, game.player.x, game.player.y);
  const visible = game.getSortedVisibleEnemies ? game.getSortedVisibleEnemies() : game.visibleEnemies();
  const focus = game.getFocusedThreat ? game.getFocusedThreat(visible) : visible[0] || null;
  const hpRatio = game.player.maxHp > 0 ? game.player.hp / game.player.maxHp : 1;
  const manaRatio = game.player.maxMana > 0 ? game.player.mana / game.player.maxMana : 1;
  const lootHere = itemsAt(game.currentLevel, game.player.x, game.player.y);
  const burdenUi = game.getBurdenUiState();
  const condition = game.player.held
    ? "Held"
    : game.player.slowed
      ? "Slowed"
      : burdenUi.state === "overloaded"
        ? "Overburdened"
        : burdenUi.state === "warning" || burdenUi.state === "danger"
          ? "Burdened"
          : "Steady";
  const locationLabel = game.currentDepth > 0 ? `Depth ${game.currentDepth}` : "Town";
  const objectiveView = buildObjectiveAdvice(game, tile, hpRatio, manaRatio, visible, focus, lootHere);
  const visibleLoot = game.getVisibleLootItems ? game.getVisibleLootItems() : [];
  const focusHealth = focus ? getMonsterHealthState(focus) : null;
  const dockSlots = buildDockSlots(game, objectiveView.actions);
  const pressure = getPressureStatus(game.currentLevel);
  const firstTownRun = game.currentDepth === 0 && (game.player.deepestDepth || 0) === 0;
  const returnSting = game.getTownReturnStingText ? game.getTownReturnStingText() : "";
  const tileAction = game.getTileActionPrompt ? game.getTileActionPrompt(tile) : null;
  const pinnedEvent = game.getPinnedTickerEntry ? game.getPinnedTickerEntry() : null;

  const statsHtml = `
    <div class="stat-band-head">
      <span class="stat-band-name">${escapeHtml(game.player.name)}</span>
      <span class="stat-band-role">${escapeHtml(`${game.player.race} ${game.player.className}`)}</span>
    </div>
    <div class="rail-stat-row">
      <div class="rail-stat-pill tone-health">
        <span>HP</span>
        <strong>${Math.floor(game.player.hp)}/${game.player.maxHp}</strong>
        <div class="rail-meter hp"><span style="width:${clamp(Math.round(hpRatio * 100), 0, 100)}%"></span></div>
      </div>
      <div class="rail-stat-pill tone-mana">
        <span>Mana</span>
        <strong class="${manaRatio < 0.3 ? "value-warning" : ""}">${Math.floor(game.player.mana)}/${game.player.maxMana}</strong>
        <div class="rail-meter mana"><span style="width:${clamp(Math.round(manaRatio * 100), 0, 100)}%"></span></div>
      </div>
      <div class="rail-stat-pill tone-load burden-${burdenUi.state}">
        <span>Load</span>
        <strong>${burdenUi.weight}/${burdenUi.capacity}</strong>
        <div class="rail-meter burden burden-${burdenUi.state}"><span style="width:${burdenUi.percent}%"></span></div>
      </div>
      <div class="rail-stat-pill tone-meta">
        <span>State</span>
        <strong class="${game.player.slowed || burdenUi.state !== "safe" ? "value-warning" : ""}">${escapeHtml(condition)}</strong>
      </div>
    </div>
  `;

  const ribbonLabel = focus
    ? (focus.intent?.type === "sleep" ? "Visible Threat" : "Primary Threat")
    : lootHere.length > 0
      ? "Underfoot"
      : tile.objectiveId
        ? "Objective"
        : "Field Read";
  const ribbonState = focus
    ? `${focus.name} | ${game.getMonsterIntentLabel(focus)} | ${distance(game.player, focus)} tiles`
    : lootHere.length > 0
      ? game.summarizeLoot(lootHere, 2)
      : game.currentDepth > 0
        ? objectiveView.floorThesis || `${pressure.shortLabel} | ${pressure.countdown}`
        : firstTownRun
          ? "North road leads into the keep"
          : returnSting || "Town is quiet";
  const ribbonSupport = focus
    ? `${focusHealth.label} | ${game.getMonsterRoleLabel(focus)}`
    : objectiveView.routeCue || objectiveView.dangerNote || objectiveView.objectiveGuide || objectiveView.optionalText || objectiveView.objectiveText || (visibleLoot.length > 0
      ? `Visible loot: ${game.summarizeLoot(visibleLoot, 2)}`
      : game.currentDepth > 0
        ? getDangerSummary(game.currentLevel)
        : firstTownRun
          ? "Start by walking north from the plaza."
          : returnSting || "No visible enemies");
  const supportMarkup = ribbonSupport && ribbonSupport !== objectiveView.advice && ribbonSupport !== ribbonState
    ? `<div class="field-brief-support">${escapeHtml(ribbonSupport)}</div>`
    : "";
  const townMetaMarkup = game.currentDepth === 0 && objectiveView.townMeta
    ? `<div class="field-brief-support">${escapeHtml(objectiveView.townMeta.summary)}</div>`
    : "";
  const onboardingMarkup = shouldShowOnboardingChecklist(game)
    ? renderOnboardingChecklist(game)
    : "";
  const dominantHud = getValidationVariant(game, "hud") === "dominant_cta";
  const dominantAction = objectiveView.actions.find((entry) => entry.recommended) || objectiveView.actions[0] || null;
  const dominantCtaMarkup = dominantHud && dominantAction
    ? `<div class="field-brief-cta"><span class="pill">Now</span><strong>${escapeHtml(dominantAction.label)}</strong><span>${escapeHtml(dominantAction.note)}</span></div>`
    : "";

  const fieldHtml = `
    <div class="field-summary-head">
      <span class="advisor-label">${escapeHtml(ribbonLabel)}</span>
      <span class="field-summary-state ${focusHealth ? focusHealth.tone : visible.length > 0 ? "warning" : pressure.tone}">${escapeHtml(ribbonState)}</span>
    </div>
    ${dominantCtaMarkup}
    <div class="field-brief-text">${escapeHtml(objectiveView.advice)}</div>
    ${supportMarkup}
    ${townMetaMarkup}
    ${onboardingMarkup}
  `;

  const townDirective = firstTownRun
    ? (game.storyFlags?.townServiceVisited
        ? "Town checked. The north road and keep stairs are ready."
        : "First stop: step onto any labeled town door. Then go north into the keep.")
    : returnSting || "Town is quiet.";
  const routeHint = game.currentDepth > 0 && game.getObjectiveRouteHint
    ? game.getObjectiveRouteHint()
    : objectiveView.routeCue;
  const roomHint = game.currentDepth > 0 && game.getObjectiveRoomHint
    ? game.getObjectiveRoomHint()
    : "";
  const stairsState = game.currentDepth === 0
    ? (firstTownRun
        ? (game.storyFlags?.townServiceVisited ? "Keep stairs are open for the first descent." : "Town task first, then keep stairs.")
        : "Town resets shops, healing, intel, and banked safety for this adventurer.")
    : game.currentLevel.floorResolved
      ? "Deeper stairs unlocked. Extract now or push one more greed line."
      : "Deeper stairs locked until the floor objective is resolved.";
  const pressureLine = game.currentDepth === 0
    ? (objectiveView.townMeta?.summary || "Town value is run support: safety, intel, stock, and funded leverage for this adventurer.")
    : pressure.summary;
  const directiveLine = tileAction?.detail || roomHint || pinnedEvent?.message || objectiveView.objectiveGuide || objectiveView.optionalText || "";
  const objectiveHtml = `
    <div class="objective-band-head">
      <span class="advisor-label">${escapeHtml(game.currentDepth === 0 ? "Town Plan" : "Current Goal")}</span>
      <span class="objective-band-state tone-${pressure.tone}">${escapeHtml(game.currentDepth === 0 ? "Run Prep" : pressure.shortLabel)}</span>
    </div>
    <div class="objective-band-line">${escapeHtml(game.currentDepth === 0 ? townDirective : routeHint || objectiveView.objectiveText)}</div>
    <div class="objective-band-line muted-line">${escapeHtml(stairsState)}</div>
    <div class="objective-band-line muted-line">${escapeHtml(pressureLine)}</div>
    ${directiveLine ? `<div class="objective-band-line accent-line">${escapeHtml(directiveLine)}</div>` : ""}
  `;

  return {
    actionBarHtml: buildActionBarMarkup(dockSlots),
    burdenState: burdenUi.state,
    dockSlots,
    fieldHtml,
    objectiveHtml,
    statsHtml
  };
}

export function renderPanels(game, advisor = null) {
  const emptyStatsHtml = "<div class='muted'>No active run.</div>";
  const emptyObjectiveHtml = "<div class='muted'>No active directive.</div>";
  const emptyFieldHtml = "<div class='field-summary-head'><span class='advisor-label'>Field Read</span><span class='field-summary-state'>No active run</span></div><div class='field-brief-text'>Create a character to begin.</div>";
  if (!game.player) {
    syncMarkup(game, "lastAdvisorStatsMarkup", game.playerCapsule, emptyStatsHtml);
    syncMarkup(game, "lastAdvisorObjectiveMarkup", game.threatCapsule, emptyObjectiveHtml);
    syncMarkup(game, "lastAdvisorFieldMarkup", game.advisorStrip, emptyFieldHtml);
    if (game.playerCapsule?.dataset?.burdenState) {
      delete game.playerCapsule.dataset.burdenState;
    }
    return;
  }

  const nextAdvisor = advisor || getAdvisorModel(game);
  if (game.playerCapsule) {
    syncMarkup(game, "lastAdvisorStatsMarkup", game.playerCapsule, nextAdvisor.statsHtml);
    if (game.playerCapsule.dataset.burdenState !== nextAdvisor.burdenState) {
      game.playerCapsule.dataset.burdenState = nextAdvisor.burdenState;
    }
  }
  syncMarkup(game, "lastAdvisorObjectiveMarkup", game.threatCapsule, nextAdvisor.objectiveHtml);
  syncMarkup(game, "lastAdvisorFieldMarkup", game.advisorStrip, nextAdvisor.fieldHtml);
}

export function renderActionBar(game, advisor = null) {
  if (!game.actionBar) {
    return;
  }
  if (!game.player) {
    syncMarkup(game, "lastActionBarMarkup", game.actionBar, "");
    return;
  }
  const nextAdvisor = advisor || getAdvisorModel(game);
  const mode = game.targetMode ? "target" : "field";
  if (game.actionBar.dataset.mode !== mode) {
    game.actionBar.dataset.mode = mode;
  }
  syncMarkup(game, "lastActionBarMarkup", game.actionBar, nextAdvisor.actionBarHtml);
}
