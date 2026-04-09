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

function getTileActionLine(game) {
  if (!game.player || !game.currentLevel || typeof game.getTileActionPrompt !== "function") {
    return null;
  }
  const tileAction = game.getTileActionPrompt();
  if (!tileAction) {
    return null;
  }
  return {
    turnLabel: tileAction.label || "Use",
    tone: tileAction.tone === "good" ? "ticker-good" : tileAction.tone === "bad" ? "ticker-bad" : tileAction.tone === "warning" ? "ticker-warning" : "ticker-context",
    text: tileAction.detail || ""
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
  const combatLine = game.getCombatFeedLines ? game.getCombatFeedLines(3)[0] : "";
  if (combatLine) {
    return {
      turnLabel: "Threat",
      tone: "ticker-context",
      text: combatLine
    };
  }
  const tileAction = game.getTileActionPrompt ? game.getTileActionPrompt() : null;
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

function getRecentMessageLines(game, limit = 6) {
  const currentTurn = game.turn || 0;
  return [...(game.messages || [])]
    .slice(-24)
    .map((entry) => ({
      turn: entry.turn || 0,
      score: scoreEntry(entry, currentTurn),
      line: {
        turnLabel: `T${entry.turn}`,
        tone: entry.tone ? `ticker-${entry.tone}` : "ticker-context",
        text: entry.message
      }
    }))
    .sort((left, right) => right.score - left.score || right.turn - left.turn)
    .slice(0, limit)
    .map((entry) => entry.line);
}

export function buildHudFeedModel(game) {
  const stickyEvent = getStickyEvent(game);
  const dedupe = new Set();
  const visible = Boolean(game.player && game.currentLevel);
  const rows = [];
  const pushRow = (line) => {
    if (!line) {
      return;
    }
    const key = `${line.turnLabel}:${line.text}`;
    if (dedupe.has(key)) {
      return;
    }
    dedupe.add(key);
    rows.push(line);
  };

  pushRow(stickyEvent);
  [
    getObjectiveLine(game),
    getTileActionLine(game),
    getPressureLine(game),
    getThreatLine(game),
    ...getRecentMessageLines(game, 18)
  ].filter(Boolean).forEach((line) => {
    const key = `${line.turnLabel}:${line.text}`;
    if (dedupe.has(key)) {
      return;
    }
    dedupe.add(key);
    rows.push(line);
  });

  return {
    rows,
    visible
  };
}

export function renderHudFeed(game, model = null) {
  const resolvedModel = model || (typeof game.getLiveFeedModel === "function" ? game.getLiveFeedModel() : buildHudFeedModel(game));
  if (!resolvedModel.visible || (resolvedModel.rows || []).length === 0) {
    return "";
  }
  return (resolvedModel.rows || []).map((line) => `
    <div class="event-ticker-line ${line.tone || ""}">
      <span class="event-ticker-turn">${escapeHtml(line.turnLabel || "Now")}</span>
      <span class="event-ticker-text">${escapeHtml(line.text || "")}</span>
    </div>
  `).join("");
}
