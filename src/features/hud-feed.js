/**
 * @module hud-feed
 * @owns Ticker/log display, prioritized message feed
 * @reads game.messages, game.turn
 * @mutates None — pure display data composition
 */
import { escapeHtml } from "../core/utils.js";
import { getValidationVariant } from "./validation.js";

const ACTION_LABELS = {
  bank: "Bank",
  interact: "Interact",
  move: "Move",
  search: "Search",
  stairs_down: "Descend",
  stairs_up: "Ascend",
  "stairs-up": "Ascend",
  "stairs-down": "Descend",
  town_service: "Town Door",
  town_rumor: "Buy Intel"
};
function scoreEntry(entry, currentTurn) {
  const message = entry?.message || "";
  const age = Math.max(0, currentTurn - (entry?.turn || 0));
  let score = Math.max(0, 12 - age);
  if (entry?.tone === "bad") {
    score += 24;
  } else if (entry?.tone === "warning") {
    score += 14;
  } else if (entry?.tone === "good") {
    score += 8;
  }
  if (/objective complete|stairs up are live|stairs down remain sealed|clear the room first|free the captive|burn the nest|seal the shrine/i.test(message)) {
    score += 32;
  }
  if (/reinforcement|pressure|leave now|arrives .* sooner|raised pressure/i.test(message)) {
    score += 28;
  }
  if (/charge|summon|ranged|closing|hold the room/i.test(message)) {
    score += 20;
  }
  return score;
}

function getStickyEvent(game) {
  if (typeof game.getStickyFeedEvent === "function") {
    const sticky = game.getStickyFeedEvent();
    if (sticky) {
      return sticky;
    }
  }
  const currentTurn = game.turn || 0;
  const best = [...(game.messages || [])]
    .slice(-10)
    .map((entry) => ({ entry, score: scoreEntry(entry, currentTurn) }))
    .sort((left, right) => right.score - left.score || right.entry.turn - left.entry.turn)[0]?.entry;
  if (!best) {
    return null;
  }
  return {
    turnLabel: `T${best.turn}`,
    tone: best.tone || "ticker-context",
    text: best.message
  };
}

function getObjectiveLine(game) {
  if (!game.player || !game.currentLevel) {
    return {
      turnLabel: "Goal",
      tone: "ticker-context",
      text: "Create a character to begin."
    };
  }
  const directive = typeof game.getLoopDirective === "function" ? game.getLoopDirective() : null;
  const dominantHud = getValidationVariant(game, "hud") === "dominant_cta";
  const recommendedAction = ACTION_LABELS[directive?.recommendedActionId || ""] || "";
  return {
    turnLabel: dominantHud ? "Next" : (directive?.phase ? (typeof game.getLoopDirectiveLabel === "function" ? game.getLoopDirectiveLabel(directive.phase) : "Loop") : "Goal"),
    tone: "ticker-context",
    text: dominantHud && recommendedAction
      ? `${recommendedAction}: ${directive?.primaryText || "Follow the current directive."}`
      : directive?.primaryText || "Follow the current directive."
  };
}

function getPressureLine(game) {
  if (!game.player || !game.currentLevel) {
    return null;
  }
  if (game.currentDepth === 0) {
    return {
      turnLabel: "Town",
      tone: "ticker-context",
      text: game.getTownReturnStingText?.() || "Town is quiet."
    };
  }
  const recentPressure = [...(game.messages || [])]
    .slice(-8)
    .reverse()
    .find((entry) => /pressure|reinforcement|arrives .* sooner|stairs up are live|remain sealed/i.test(entry.message));
  if (recentPressure) {
    return {
      turnLabel: `T${recentPressure.turn}`,
      tone: recentPressure.tone ? `ticker-${recentPressure.tone}` : "ticker-context",
      text: recentPressure.message
    };
  }
  const pressure = game.getPressureUiState();
  return {
    turnLabel: "Pressure",
    tone: pressure.tone === "bad" ? "ticker-bad" : pressure.tone === "warning" ? "ticker-warning" : "ticker-context",
    text: pressure.summary
  };
}

function getThreatLine(game) {
  if (!game.player || !game.currentLevel) {
    return null;
  }
  const combatLine = game.getCombatFeedLines?.(3)?.[0] ?? "";
  if (combatLine) {
    return {
      turnLabel: "Threat",
      tone: "ticker-context",
      text: combatLine
    };
  }
  const tileAction = game.getTileActionPrompt?.() ?? null;
  if (tileAction) {
    return {
      turnLabel: tileAction.label,
      tone: tileAction.tone === "good" ? "ticker-good" : tileAction.tone === "bad" ? "ticker-bad" : "ticker-context",
      text: tileAction.detail
    };
  }
  const directive = typeof game.getLoopDirective === "function" ? game.getLoopDirective() : null;
  const fallback = directive?.supportText || directive?.dangerText || (game.currentDepth === 0 ? game.getTownReturnStingText?.() || "" : game.getImmediateDangerNote?.() || "");
  if (!fallback) {
    return null;
  }
  return {
    turnLabel: "Now",
    tone: "ticker-context",
    text: fallback
  };
}

function buildDrawerMarkup(game) {
  const entries = (game.messages || []).slice(-12).reverse();
  if (entries.length === 0) {
    return "<div class='event-feed-drawer-empty'>No recent messages.</div>";
  }
  return entries.map((entry) => `
    <div class="event-feed-drawer-line ${entry.tone ? `ticker-${entry.tone}` : ""}">
      <span class="event-feed-drawer-turn">T${entry.turn}</span>
      <span class="event-feed-drawer-text">${escapeHtml(entry.message)}</span>
    </div>
  `).join("");
}

export function buildHudFeedModel(game) {
  const stickyEvent = getStickyEvent(game);
  const dedupe = new Set();
  const lines = [getObjectiveLine(game), getPressureLine(game), getThreatLine(game)]
    .filter(Boolean)
    .filter((line) => {
      const key = `${line.turnLabel}:${line.text}`;
      if (dedupe.has(key)) {
        return false;
      }
      dedupe.add(key);
      return true;
    })
    .slice(0, 3);
  return {
    stickyEvent,
    lines,
    historyAvailable: Boolean((game.messages || []).length > 0)
  };
}

export function renderHudFeed(game) {
  const model = typeof game.getLiveFeedModel === "function" ? game.getLiveFeedModel() : buildHudFeedModel(game);
  const stickyMarkup = model.stickyEvent
    ? `
      <div class="event-feed-sticky ${model.stickyEvent.tone || "ticker-context"}">
        <span class="event-feed-sticky-turn">${escapeHtml(model.stickyEvent.turnLabel || "Now")}</span>
        <span class="event-feed-sticky-text">${escapeHtml(model.stickyEvent.text || "")}</span>
      </div>
    `
    : "";
  const linesMarkup = (model.lines || []).map((line) => `
    <div class="event-ticker-line ${line.tone || ""}">
      <span class="event-ticker-turn">${escapeHtml(line.turnLabel)}</span>
      <span class="event-ticker-text">${escapeHtml(line.text)}</span>
    </div>
  `).join("");
  return `
    <button class="event-feed-toggle" data-action="toggle-feed-log" data-focus-key="feed:toggle" type="button" aria-expanded="${game.feedDrawerOpen ? "true" : "false"}">
      <span class="event-feed-toggle-label">Live Feed</span>
      <span class="event-feed-toggle-note">${game.feedDrawerOpen ? "Hide recent log" : "Show recent log"}</span>
    </button>
    ${stickyMarkup}
    <div class="event-feed-lines">${linesMarkup}</div>
    <div class="event-feed-drawer${game.feedDrawerOpen ? "" : " hidden"}">
      ${buildDrawerMarkup(game)}
    </div>
  `;
}
