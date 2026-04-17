import { getMonsterHealthState } from "../core/entities.js";
import { getTile, itemsAt } from "../core/world.js";
import { clamp, distance, escapeHtml } from "../core/utils.js";
import { getDangerSummary, getPressureStatus } from "./director.js";
import { getObjectiveRoomClear, getObjectiveStatusText, getOptionalStatusText } from "./objectives.js";
import { renderOnboardingChecklist, shouldShowOnboardingChecklist } from "./onboarding.js";
import { getValidationVariant } from "./validation.js";

function buildObjectiveAdvice(game, tile, hpRatio, manaRatio, visible, focus, lootHere) {
  const directive = game.getLoopDirective?.(tile) ?? null;
  const objectiveText = getObjectiveStatusText(game.currentLevel);
  const optionalText = getOptionalStatusText(game.currentLevel);
  const objectiveGuide = directive?.primaryText || (game.getObjectiveGuideText?.() ?? "");
  const floorThesis = game.getFloorThesisText?.() ?? "";
  const routeCue = directive?.routeCueText || (game.getCurrentRouteCueText?.() ?? "");
  const dangerNote = directive?.supportText || (game.getImmediateDangerNote?.() ?? "");
  const townMeta = game.currentDepth === 0 ? (game.getTownMetaSummary?.() ?? null) : null;
  const actions = [];
  const pushAction = (action, label, note, recommended = false, tab = "", service = "") => {
    if (!actions.some((entry) => entry.action === action)) {
      actions.push({ action, label, note, recommended, tab, service });
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
    const onDoor = tile?.kind === "buildingDoor" && tile?.service;
    if (onDoor && !game.storyFlags?.townServiceVisited) {
      pushAction(
        "open-town-service",
        "Open Door",
        `Step inside ${tile.label || "this service"}`,
        true,
        "",
        tile.service
      );
    } else {
      pushAction(
        "map-focus",
        game.storyFlags?.townServiceVisited ? "Go North" : "Survey",
        game.storyFlags?.townServiceVisited ? "Enter the keep" : "Find a labeled door",
        true
      );
    }
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

  // Step 3 — pressure verb swap. When the run is in "leave now" (tone bad),
  // relabel the primary verb with an urgent tone and mark it .is-urgent so
  // the command window colors it red. The underlying action stays whatever
  // the objective system recommended (usually stairs-up or a safer route).
  const urgentPressure = game.currentDepth > 0
    && getPressureStatus(game.currentLevel)?.tone === "bad";
  const primaryLabel = urgentPressure
    ? (primaryAction.action === "stairs-up" ? "Ascend!" : "Flee!")
    : primaryAction.label;
  const primaryNote = urgentPressure
    ? "Reinforcements inbound"
    : primaryAction.note;

  return [
    {
      key: "primary",
      prompt: "A",
      label: primaryLabel,
      note: primaryNote,
      action: primaryAction.action,
      tab: primaryAction.tab || "",
      service: primaryAction.service || "",
      tone: "primary",
      active: true,
      urgent: urgentPressure
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
  // JRPG command window — FFVI style. Legacy dock classes are retained so
  // existing focus-navigation, gamepad, and selector-based tests keep working.
  const items = dockSlots.map((slot) => {
    const toneMods = slot.tone === "primary" ? " recommended" : "";
    const activeMod = slot.active ? " is-active" : "";
    const urgentMod = slot.urgent ? " is-urgent" : "";
    const legacyClasses = `action-button dock-action dock-slot dock-slot-${slot.key} dock-tone-${slot.tone}${toneMods}`;
    const tabAttr = slot.tab ? ` data-tab="${slot.tab}"` : "";
    const serviceAttr = slot.service ? ` data-service="${slot.service}"` : "";
    return `
      <button class="jrpg-window-option jrpg-command-option${activeMod}${urgentMod} ${legacyClasses}" data-action="${slot.action}"${tabAttr}${serviceAttr} data-focus-key="dock:${slot.key}" type="button">
        <span class="jrpg-command-prompt">${escapeHtml(slot.prompt)}</span>
        <span class="jrpg-command-label">${escapeHtml(slot.label)}</span>
        <span class="jrpg-command-note">${escapeHtml(slot.note)}</span>
      </button>
    `;
  }).join("");
  return `
    <section class="jrpg-window jrpg-command-window" aria-label="Command">
      <h3 class="jrpg-window-title">Command</h3>
      <div class="jrpg-command-list">${items}</div>
    </section>
  `;
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
  const visible = game.getSortedVisibleEnemies?.() ?? game.visibleEnemies();
  const focus = game.getFocusedThreat?.(visible) ?? visible[0] ?? null;
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
  const visibleLoot = game.getVisibleLootItems?.() ?? [];
  const focusHealth = focus ? getMonsterHealthState(focus) : null;
  const dockSlots = buildDockSlots(game, objectiveView.actions);
  const pressure = getPressureStatus(game.currentLevel);
  const firstTownRun = game.currentDepth === 0 && (game.player.deepestDepth || 0) === 0;
  const returnSting = game.getTownReturnStingText?.() ?? "";
  const tileAction = game.getTileActionPrompt?.(tile) ?? null;
  const pinnedEvent = game.getPinnedTickerEntry?.() ?? null;

  // JRPG status window — FFVI party-status style. One bar per resource, name
  // as the window title. Class/race subtitle and the Steady/Burdened "State"
  // pill are intentionally dropped from the play HUD per the redesign plan;
  // both still surface on the character sheet.
  const hpPercent = clamp(Math.round(hpRatio * 100), 0, 100);
  const manaPercent = clamp(Math.round(manaRatio * 100), 0, 100);
  const burdenPercent = clamp(Math.round(burdenUi.percent || 0), 0, 100);
  const hpCriticalClass = hpRatio < 0.25 ? " is-critical" : "";
  const statsHtml = `
    <section class="jrpg-window jrpg-status-window" aria-label="Party status" data-condition="${escapeHtml(condition)}">
      <h3 class="jrpg-window-title">${escapeHtml(String(game.player.name || "HERO"))}</h3>
      <div class="jrpg-bar is-hp${hpCriticalClass}">
        <span class="jrpg-bar-label">HP</span>
        <span class="jrpg-bar-track"><span class="jrpg-bar-fill" style="width:${hpPercent}%"></span></span>
        <span class="jrpg-bar-value">${Math.floor(game.player.hp)}/${game.player.maxHp}</span>
      </div>
      <div class="jrpg-bar is-mp">
        <span class="jrpg-bar-label">MP</span>
        <span class="jrpg-bar-track"><span class="jrpg-bar-fill" style="width:${manaPercent}%"></span></span>
        <span class="jrpg-bar-value">${Math.floor(game.player.mana)}/${game.player.maxMana}</span>
      </div>
      <div class="jrpg-bar is-load burden-${burdenUi.state}" title="Carry weight — over capacity slows dodge and lets monsters press harder.">
        <span class="jrpg-bar-label">Load</span>
        <span class="jrpg-bar-track"><span class="jrpg-bar-fill" style="width:${burdenPercent}%"></span></span>
        <span class="jrpg-bar-value">${burdenUi.weight}/${burdenUi.capacity}</span>
      </div>
    </section>
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
