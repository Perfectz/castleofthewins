import { getCarryCapacity, getCarryWeight, getEncumbranceTier, getHealthRatio, getMonsterHealthState } from "../core/entities.js";
import { getTile, itemsAt } from "../core/world.js";
import { clamp, distance, escapeHtml } from "../core/utils.js";
import { getDangerSummary } from "./director.js";
import { getObjectiveStatusText, getOptionalStatusText } from "./objectives.js";

function buildObjectiveAdvice(game, tile, hpRatio, visible, focus, lootHere) {
  const objectiveText = getObjectiveStatusText(game.currentLevel);
  const optionalText = getOptionalStatusText(game.currentLevel);
  const actions = [];
  const pushAction = (action, label, note, recommended = false, tab = "") => {
    if (!actions.some((entry) => entry.action === action)) {
      actions.push({ action, label, note, recommended, tab });
    }
  };

  let advice = objectiveText;
  if (visible.length > 0 && focus) {
    const health = getMonsterHealthState(focus);
    advice = `${focus.name}: ${health.label.toLowerCase()}, ${game.getMonsterIntentLabel(focus).toLowerCase()}.`;
    if (hpRatio < 0.35) {
      advice = `${focus.name} has you in lethal range. Break contact or spend a tool now.`;
      pushAction("stairs-up", "Ascend", "Leave the floor", true);
      pushAction("open-hub", "Magic", "Use control or escape", false, "magic");
    } else if (focus.ranged) {
      pushAction("open-hub", "Magic", "Answer ranged pressure", true, "magic");
      pushAction("wait", "Hold", "Do not walk into fire", false);
    } else if (focus.abilities && focus.abilities.includes("charge")) {
      pushAction("wait", "Hold", "Read the charge lane", true);
      pushAction("open-hub", "Magic", "Slow or burst it", false, "magic");
    } else if (focus.abilities && focus.abilities.includes("summon")) {
      pushAction("open-hub", "Magic", "Kill the summoner", true, "magic");
    } else {
      pushAction("wait", "Hold", "Take the clean exchange", false);
    }
  } else if (lootHere.length > 0) {
    advice = `Underfoot: ${game.summarizeLoot(lootHere, 2)}.`;
    pushAction("pickup", "Pick Up", lootHere.length === 1 ? game.describeItemReadout(lootHere[0]) : `${lootHere.length} items underfoot`, true);
  } else if (tile.objectiveId) {
    advice = game.currentLevel.floorResolved
      ? "The floor objective is already cleared. Decide whether to extract or stay greedy."
      : "You have reached the objective tile. Resolve it before you think about the stairs.";
    pushAction("interact", "Resolve", "Finish the floor objective", true);
  } else if (tile.optionalId) {
    advice = "Optional value is here. Touch it only if you want more reward and more danger.";
    pushAction("interact", "Tempt Fate", "Open the optional encounter", true);
  } else if (tile.kind === "stairUp" && game.currentDepth > 0) {
    advice = hpRatio < 0.45 ? "You have an escape route under your feet." : "The stairs up are ready if you want to bank progress.";
    pushAction("stairs-up", "Ascend", "Leave the floor", hpRatio < 0.45);
  } else if (tile.kind === "stairDown") {
    if (game.currentLevel.floorResolved) {
      advice = "The stairs down are open.";
      pushAction("stairs-down", "Descend", "Push the run deeper", true);
    } else {
      advice = "The stairs are here, but the floor objective still matters.";
      pushAction("search", "Scout", "Find the objective", true);
    }
  } else if (game.currentDepth > 0 && hpRatio < 0.75) {
    advice = "The floor is quiet enough to recover, but resting still creates pressure.";
    pushAction("rest", "Rest", "Recover until disturbed", true);
    pushAction("search", "Search", "Probe for routes", false);
  } else if (game.currentDepth > 0) {
    advice = game.currentLevel.floorResolved
      ? "Objective complete. Search for greed, or leave while the floor still allows it."
      : objectiveText;
    pushAction("search", "Search", "Probe for secrets or routes", true);
  }

  return {
    advice,
    objectiveText,
    optionalText,
    actions
  };
}

function renderThreatRows(game, visible, focus) {
  if (visible.length === 0) {
    return "<div class='muted'>No visible enemies.</div>";
  }
  return visible.slice(0, 4).map((monster) => {
    const health = getMonsterHealthState(monster);
    const ratio = Math.round(getHealthRatio(monster) * 100);
    const isFocus = monster === focus;
    return `
      <div class="threat-row${isFocus ? " active" : ""}">
        <div class="threat-row-main">
          <div class="threat-row-name">${escapeHtml(monster.name)}</div>
          <div class="threat-row-meta">${escapeHtml(game.getMonsterRoleLabel(monster))} · ${escapeHtml(game.getMonsterIntentLabel(monster))}</div>
        </div>
        <div class="threat-row-side">
          <div class="threat-tag ${health.tone}">${escapeHtml(health.label)}</div>
          <div class="threat-row-distance">${distance(game.player, monster)} tiles · ${monster.hp}/${monster.maxHp || monster.hp} HP</div>
        </div>
        <div class="meter threat-health"><span style="width:${ratio}%"></span></div>
      </div>
    `;
  }).join("");
}

export function getAdvisorModel(game) {
  if (!game.player || !game.currentLevel) {
    return {
      playerHtml: "<div class='muted'>No active run.</div>",
      threatHtml: "<div class='muted'>No threats yet.</div>",
      advisorHtml: "<div class='advisor-label'>Field Read</div><div class='advisor-text'>Create a character to begin.</div>",
      actionsHtml: ""
    };
  }

  const tile = getTile(game.currentLevel, game.player.x, game.player.y);
  const visible = game.getSortedVisibleEnemies ? game.getSortedVisibleEnemies() : game.visibleEnemies();
  const focus = game.getFocusedThreat ? game.getFocusedThreat(visible) : visible[0] || null;
  const hpRatio = game.player.maxHp > 0 ? game.player.hp / game.player.maxHp : 1;
  const manaRatio = game.player.maxMana > 0 ? game.player.mana / game.player.maxMana : 1;
  const lootHere = itemsAt(game.currentLevel, game.player.x, game.player.y);
  const burden = getEncumbranceTier(game.player);
  const burdenWeight = getCarryWeight(game.player);
  const burdenCapacity = getCarryCapacity(game.player);
  const condition = game.player.slowed ? "Slowed" : burden >= 2 ? "Overburdened" : burden === 1 ? "Burdened" : "Steady";
  const locationLabel = game.currentDepth > 0 ? `Depth ${game.currentDepth}` : "Town";
  const objectiveView = buildObjectiveAdvice(game, tile, hpRatio, visible, focus, lootHere);
  const visibleLoot = game.getVisibleLootItems ? game.getVisibleLootItems() : [];
  const focusHealth = focus ? getMonsterHealthState(focus) : null;

  const playerHtml = `
    <div class="capsule-topline">
      <div>
        <div class="capsule-label">Adventurer</div>
        <div class="capsule-headline">${escapeHtml(game.player.name)}</div>
      </div>
      <div class="capsule-badge ${game.currentDepth > 0 ? "warning" : "good"}">${escapeHtml(locationLabel)}</div>
    </div>
    <div class="meter-stack">
      <div class="meter-row"><span>Vitality</span><strong>${Math.floor(game.player.hp)}/${game.player.maxHp}</strong></div>
      <div class="meter hp"><span style="width:${clamp(Math.round(hpRatio * 100), 0, 100)}%"></span></div>
      <div class="meter-row"><span>Aether</span><strong class="${manaRatio < 0.3 ? "value-warning" : ""}">${Math.floor(game.player.mana)}/${game.player.maxMana}</strong></div>
      <div class="meter mana"><span style="width:${clamp(Math.round(manaRatio * 100), 0, 100)}%"></span></div>
    </div>
    <div class="capsule-line compact-line"><span>Burden</span><strong class="${burden >= 2 ? "value-bad" : burden >= 1 ? "value-warning" : "value-good"}">${burdenWeight} / ${burdenCapacity}</strong></div>
    <div class="capsule-line compact-line"><span>Condition</span><strong class="${game.player.slowed || burden ? "value-warning" : ""}">${condition}</strong></div>
  `;

  const threatSummary = focus
    ? `
      <div class="capsule-topline">
        <div>
          <div class="capsule-label">Primary Threat</div>
          <div class="capsule-headline">${escapeHtml(focus.name)}</div>
        </div>
        <div class="capsule-badge ${focusHealth.tone}">${escapeHtml(focusHealth.label)}</div>
      </div>
      <div class="capsule-subline">${escapeHtml(game.getMonsterRoleLabel(focus))} · ${escapeHtml(game.getMonsterIntentLabel(focus))} · ${distance(game.player, focus)} tiles</div>
      <div class="meter-stack">
        <div class="meter-row"><span>Enemy Health</span><strong>${focus.hp}/${focus.maxHp || focus.hp}</strong></div>
        <div class="meter threat-health"><span style="width:${Math.round(getHealthRatio(focus) * 100)}%"></span></div>
      </div>
      <div class="threat-roster">${renderThreatRows(game, visible, focus)}</div>
      <div class="capsule-line compact-line"><span>Underfoot</span><strong>${escapeHtml(lootHere.length > 0 ? game.summarizeLoot(lootHere, 2) : "Nothing")}</strong></div>
    `
    : `
      <div class="capsule-topline">
        <div>
          <div class="capsule-label">Sightline</div>
          <div class="capsule-headline">No visible enemies</div>
        </div>
        <div class="capsule-badge good">Clear</div>
      </div>
      <div class="capsule-subline">${escapeHtml(game.currentDepth > 0 ? getDangerSummary(game.currentLevel) : "Town is quiet.")}</div>
      <div class="capsule-line compact-line"><span>Objective</span><strong>${escapeHtml(objectiveView.objectiveText)}</strong></div>
      <div class="capsule-line compact-line"><span>Visible Loot</span><strong>${escapeHtml(visibleLoot.length > 0 ? game.summarizeLoot(visibleLoot, 2) : "None in sight")}</strong></div>
      <div class="capsule-line compact-line"><span>Underfoot</span><strong>${escapeHtml(lootHere.length > 0 ? game.summarizeLoot(lootHere, 2) : "Nothing")}</strong></div>
    `;

  const advisorHtml = `
    <div class="advisor-label">Field Read</div>
    <div class="advisor-text">${escapeHtml(objectiveView.advice)}</div>
    <div class="advisor-meta">
      <span class="advisor-chip">${escapeHtml(objectiveView.objectiveText)}</span>
      ${objectiveView.optionalText ? `<span class="advisor-chip">${escapeHtml(objectiveView.optionalText)}</span>` : ""}
    </div>
  `;

  const actionsHtml = objectiveView.actions.slice(0, 3).map((entry, index) => `
    <button class="action-button dock-action${entry.recommended && index === 0 ? " recommended" : ""}" data-action="${entry.action}"${entry.tab ? ` data-tab="${entry.tab}"` : ""} type="button">
      <span class="context-slot">${index + 1}</span>
      <span class="context-copy">
        <span class="context-main">${escapeHtml(entry.label)}</span>
        <span class="context-note">${escapeHtml(entry.note)}</span>
      </span>
    </button>
  `).join("");

  return { playerHtml, threatHtml: threatSummary, advisorHtml, actionsHtml };
}

export function renderPanels(game) {
  if (!game.player) {
    if (game.playerCapsule) {
      game.playerCapsule.innerHTML = "<div class='muted'>No active run.</div>";
    }
    if (game.threatCapsule) {
      game.threatCapsule.innerHTML = "<div class='muted'>No visible threats.</div>";
    }
    if (game.advisorStrip) {
      game.advisorStrip.innerHTML = "<div class='advisor-label'>Field Read</div><div class='advisor-text'>Create a character to begin.</div>";
    }
    return;
  }

  const advisor = getAdvisorModel(game);
  if (game.playerCapsule) {
    game.playerCapsule.innerHTML = advisor.playerHtml;
  }
  if (game.threatCapsule) {
    game.threatCapsule.innerHTML = advisor.threatHtml;
  }
  if (game.advisorStrip) {
    game.advisorStrip.innerHTML = advisor.advisorHtml;
  }
}

export function renderActionBar(game) {
  if (!game.actionBar) {
    return;
  }
  if (!game.player) {
    game.actionBar.innerHTML = "";
    return;
  }
  const advisor = getAdvisorModel(game);
  game.actionBar.innerHTML = `
    ${advisor.actionsHtml}
    <button class="action-button dock-action hub-button" data-action="open-hub" data-tab="pack" type="button">
      <span class="context-main">Hub</span>
      <span class="context-note">Pack, magic, journal</span>
    </button>
  `;
}
