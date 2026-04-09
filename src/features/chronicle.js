/**
 * @module chronicle
 * @owns Run history tracking, chronicle events, death recap
 * @reads game.player, game.chronicleEvents, game.deathContext
 * @mutates game.chronicleEvents, game.deathContext
 */
import { escapeHtml } from "../core/utils.js";
import { MAX_CHRONICLE_EVENTS } from "../core/constants.js";

export function ensureChronicleState(game) {
  game.chronicleEvents = Array.isArray(game.chronicleEvents) ? game.chronicleEvents : [];
  game.deathContext = game.deathContext || null;
}

export function recordChronicleEvent(game, type, payload = {}) {
  ensureChronicleState(game);
  game.chronicleEvents.push({
    turn: game.turn,
    depth: game.currentDepth,
    type,
    payload
  });
  if (game.chronicleEvents.length > MAX_CHRONICLE_EVENTS) {
    game.chronicleEvents.shift();
  }
}

export function noteDeathContext(game, context) {
  ensureChronicleState(game);
  game.deathContext = {
    turn: game.turn,
    depth: game.currentDepth,
    location: game.currentLevel?.description || "the dungeon",
    ...context
  };
}

function formatChronicleLine(entry) {
  if (entry.type === "story_scene") {
    return entry.payload?.label || "Received a town briefing.";
  }
  if (entry.type === "discovery_found") {
    return `Found ${entry.payload.label} on depth ${entry.depth}.`;
  }
  if (entry.type === "objective_complete") {
    return `Objective cleared: ${entry.payload.label} on depth ${entry.depth}.`;
  }
  if (entry.type === "greed_choice") {
    return `Stayed greedy at ${entry.payload.label} on depth ${entry.depth}.`;
  }
  if (entry.type === "elite_kill") {
    return `Killed ${entry.payload.label} on depth ${entry.depth}.`;
  }
  if (entry.type === "milestone_clear") {
    return entry.payload?.summary || `Broke ${entry.payload.label} on depth ${entry.depth}.`;
  }
  if (entry.type === "room_event_clear") {
    return `Resolved ${entry.payload.label} on depth ${entry.depth}.`;
  }
  if (entry.type === "town_unlock") {
    return `Funded town upgrade: ${entry.payload.label}.`;
  }
  if (entry.type === "reinforcements") {
    return `Reinforcements arrived at ${entry.payload.band} danger on depth ${entry.depth}.`;
  }
  if (entry.type === "floor_enter") {
    return `Entered ${entry.payload.label}.`;
  }
  return entry.payload?.label || entry.type;
}

export function renderChronicleMarkup(game, limit = 10) {
  ensureChronicleState(game);
  const lines = game.chronicleEvents.slice(-limit).reverse();
  if (lines.length === 0) {
    return "<div class='muted'>No memorable beats recorded yet.</div>";
  }
  return lines.map((entry) => `
    <div class="log-line">
      <span class="log-turn">[${entry.turn}]</span> ${escapeHtml(formatChronicleLine(entry))}
    </div>
  `).join("");
}

export function buildDeathRecapMarkup(game) {
  ensureChronicleState(game);
  if (!game.player) {
    return "<div class='section-block text-block'>No death data available.</div>";
  }
  const context = game.deathContext || {
    location: game.currentLevel?.description || "the dungeon",
    cause: "Unknown cause",
    lastHitBy: "Unknown foe",
    dangerLevel: game.currentLevel?.dangerLevel || "Low"
  };
  const recent = game.chronicleEvents.slice(-5).reverse();
  const recentMarkup = recent.length === 0
    ? "<div class='muted'>No major beats were recorded.</div>"
    : recent.map((entry) => `<div class="log-line">${escapeHtml(formatChronicleLine(entry))}</div>`).join("");
  const summary = game.lastRunSummary || null;
  const persistentChanges = Array.isArray(summary?.persistentChanges) ? summary.persistentChanges : [];
  const activeContract = typeof game.getActiveContract === "function" ? game.getActiveContract(true) || game.getActiveContract(false) : null;
  const masterySummary = typeof game.getClassMasterySummary === "function"
    ? game.getClassMasterySummary(game.player?.classId)
    : "No mastery track.";
  const carryForward = typeof game.getTownCarryForwardSummary === "function"
    ? game.getTownCarryForwardSummary()
    : "Town improvements carried forward: none yet.";
  const nextRunMarkup = typeof game.getNextRunFocusMarkup === "function"
    ? game.getNextRunFocusMarkup({ label: "Why Run Again" })
    : "";

  return `
    <div class="section-block text-block">
      ${escapeHtml(game.player.name)} fell in ${escapeHtml(context.location)}.
    </div>
    <div class="section-block">
      <div class="stat-line"><span>Cause</span><strong>${escapeHtml(context.cause || "Unknown")}</strong></div>
      <div class="stat-line"><span>Last threat</span><strong>${escapeHtml(context.lastHitBy || "Unknown")}</strong></div>
      <div class="stat-line"><span>Danger</span><strong>${escapeHtml(context.dangerLevel || "Low")}</strong></div>
      <div class="stat-line"><span>Turn</span><strong>${context.turn || game.turn}</strong></div>
      <div class="stat-line"><span>Depth</span><strong>${context.depth ?? game.currentDepth}</strong></div>
    </div>
    <div class="section-block">
      <div class="field-label">Run Chronicle</div>
      <div class="message-log journal-log">${recentMarkup}</div>
    </div>
    <div class="section-block">
      <div class="field-label">Town Persistence</div>
      <div class="text-block">
        ${escapeHtml(`Mastery: ${masterySummary}`)}<br><br>
        ${escapeHtml(activeContract ? `Active contract: ${activeContract.name}` : "Active contract: none armed")}<br><br>
        ${escapeHtml(persistentChanges.length > 0 ? persistentChanges.join(", ") : "No permanent unlock changed during this run.")}<br><br>
        ${escapeHtml(carryForward)}
      </div>
    </div>
    ${nextRunMarkup}
  `;
}
