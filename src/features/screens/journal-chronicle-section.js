/**
 * @module screens/journal-chronicle-section
 * @owns Journal "Chronicle" section body markup
 * @reads game.player.classId, town cycle state, telemetry review, run summary history
 * @mutates none (pure renderer)
 *
 * Extracted from src/game.js. Returns the full HTML body for the
 * Chronicle tab inside the Journal hub. Selectors (field-guide-*,
 * workspace-*, message-log classes) and disclosure structure are
 * preserved byte-for-byte.
 */
import { escapeHtml } from "../../core/utils.js";
import { ITEM_DEFS, SHOPS } from "../../data/content.js";
import { renderChronicleMarkup } from "../chronicle.js";

export function renderJournalChronicleSection(game) {
  const townCycle = game.getTownCycleState();
  const reactions = game.getTownReactionLines();
  const discoverySummary = game.getKnownDiscoveryLines();
  const namedLootSummary = game.getNamedLootLines();
  const featuredStockSummary = Object.entries(townCycle.featuredStock || {})
    .map(([shopId, itemIds]) => {
      const label = SHOPS[shopId]?.name;
      const names = (itemIds || []).map((itemId) => ITEM_DEFS[itemId]?.name).filter(Boolean).join(", ");
      return label && names ? `${label}: ${names}` : "";
    })
    .filter(Boolean)
    .join(" | ");
  const telemetrySummary = game.getTelemetrySummary();
  const telemetryReview = game.getTelemetryReviewSnapshot();
  const latestSummary = (game.runSummaryHistory || []).at(-1) || game.lastRunSummary;
  const activeContract = game.getActiveContract(true) || game.getActiveContract(false);
  const masterySummary = game.getClassMasterySummary(game.player.classId);
  const archiveMarkup = game.getRunSummaryArchiveMarkup(3);
  const masteryMarkup = game.getMasteryReviewMarkup(game.player.classId);
  const contractMarkup = game.getContractReviewMarkup({ interactive: false });
  const metaReview = telemetryReview.meta || {};
  const telemetryRecent = telemetryReview.recentEvents.length > 0
    ? telemetryReview.recentEvents.map((entry) => `<div class="log-line">[T${entry.turn} D${entry.depth}] ${escapeHtml(entry.text)}</div>`).join("")
    : "<div class='muted'>No run telemetry captured yet.</div>";
  const latestDigest = latestSummary
    ? `${latestSummary.outcome} at depth ${latestSummary.extractedDepth}. Greed rooms: ${latestSummary.greedCount}.`
    : "No completed extraction or death summary is recorded yet.";
  const townDigest = [
    game.getTownCycleLabel(),
    townCycle.turnsUntilRefresh === 1 ? "Next market turnover in 1 turn." : `Next market turnover in ${townCycle.turnsUntilRefresh} turns.`,
    townCycle.stockSummary,
    townCycle.rumorSummary
  ].join(" ");
  return `
    <div class="field-guide-article field-guide-article-chronicle">
      <section class="workspace-detail-card field-guide-article-hero field-guide-article-priority">
        <div class="panel-title">Digest</div>
        <div class="workspace-detail-title">${escapeHtml(latestSummary ? (latestSummary.outcome || "Latest run") : "No completed run yet")}</div>
        <div class="workspace-plain-copy">${escapeHtml(latestDigest)}</div>
        <div class="workspace-plain-copy muted">${escapeHtml(reactions.lines[0] || townDigest)}</div>
      </section>
      <section class="workspace-ledger-group">
        <div class="panel-title">Discoveries</div>
        ${game.getFieldGuideBulletListMarkup(
          discoverySummary.length > 0 ? discoverySummary : ["No written fragments recovered yet."]
        )}
      </section>
      <section class="workspace-ledger-group">
        <div class="panel-title">Town Digest</div>
        ${game.getFieldGuideFactListMarkup([
          ["Cycle", game.getTownCycleLabel()],
          ["Turnover", townCycle.turnsUntilRefresh === 1 ? "1 turn" : `${townCycle.turnsUntilRefresh} turns`],
          ["Stock posture", townCycle.stockSummary],
          ["Rumor posture", townCycle.rumorSummary],
          ["Featured market", featuredStockSummary || "No featured market picks are posted yet."],
          ["Town reaction", reactions.lines[0] || "The town has not shifted around your run yet."]
        ])}
      </section>
      <section class="workspace-ledger-group">
        <div class="panel-title">Named Loot</div>
        ${game.getFieldGuideBulletListMarkup(
          namedLootSummary.length > 0 ? namedLootSummary : ["No signature finds claimed yet."]
        )}
      </section>
      <section class="workspace-ledger-group">
        <div class="panel-title">Persistence</div>
        ${game.getFieldGuideFactListMarkup([
          ["Contract state", activeContract ? `${activeContract.name}. Next run only.` : "No contract armed for the next run."],
          ["Mastery", masterySummary],
          ["Contract adoption", `${Math.round((metaReview.armedRunStartRate || 0) * 100)}% of tracked runs started armed. Most armed: ${metaReview.mostArmedContract || "none yet"}.`]
        ])}
        ${game.getDisclosureMarkup({
          title: "Contracts",
          summary: activeContract ? activeContract.name : "None armed",
          className: "field-guide-disclosure",
          body: contractMarkup
        })}
        ${game.getDisclosureMarkup({
          title: "Current Class Mastery",
          summary: masterySummary,
          className: "field-guide-disclosure",
          body: masteryMarkup
        })}
        ${game.getDisclosureMarkup({
          title: "Latest 3 Returns",
          summary: latestSummary ? `${latestSummary.outcome} depth ${latestSummary.extractedDepth}` : "No return archive yet",
          className: "field-guide-disclosure",
          body: archiveMarkup
        })}
      </section>
      <section class="workspace-ledger-group">
        <div class="panel-title">Chronicle</div>
        ${game.getDisclosureMarkup({
          title: "Recent Chronicle",
          summary: "Last 12 entries",
          className: "field-guide-disclosure",
          body: `<div class="message-log journal-log">${renderChronicleMarkup(game, 12)}</div>`
        })}
      </section>
      <section class="workspace-ledger-group">
        <div class="panel-title">Telemetry</div>
        ${game.getFieldGuideFactListMarkup([
          ["Events", telemetrySummary.eventCount],
          ["Searches", telemetrySummary.searches],
          ["Buys / Sells", `${telemetrySummary.shopBuys} / ${telemetrySummary.shopSells}`],
          ["Spells / Items", `${telemetrySummary.spellsCast} / ${telemetrySummary.itemsUsed}`],
          ["Returns", telemetrySummary.townReturns],
          ["Latest", latestSummary
            ? `${latestSummary.outcome} | first objective ${latestSummary.firstObjectiveType || "unknown"} | clear turn ${latestSummary.firstObjectiveClearTurn ?? "?"} | greed ${latestSummary.greedCount}`
            : "No extraction or death summary recorded yet."]
        ])}
        ${game.getDisclosureMarkup({
          title: "Recent Telemetry",
          summary: `${telemetryReview.recentEvents.length} recent event${telemetryReview.recentEvents.length === 1 ? "" : "s"}`,
          className: "field-guide-disclosure",
          body: `<div class="message-log journal-log">${telemetryRecent}</div>`
        })}
      </section>
    </div>
  `;
}
