/**
 * @module screens/bank-modal
 * @owns Bank / persistence modal presentation
 * @reads town meta, mastery, contracts, rumor intel, run summary history
 * @mutates game.mode, game.storyFlags.postReturnBankPrompt (via game.showSimpleModal)
 *
 * Extracted from src/game.js. Takes the Game instance because every data
 * read and action hook is bound to live Game state. All selectors and
 * data-action hooks are preserved so the harness keeps working.
 */
import { escapeHtml } from "../../core/utils.js";
import { ITEM_DEFS, SHOPS } from "../../data/content.js";
import { ensureTownMetaState, getAvailableTownUnlocks, getRumorPrice, getTownIntel } from "../town-meta.js";

export function renderBankModal(game, options = {}) {
  game.syncAdaptiveLayout();
  game.clearModalInteractionFeedback();
  const {
    preserveScroll = false,
    focusTarget = null,
    fallbackFocus = true
  } = options;
  game.mode = "modal";
  game.storyFlags.postReturnBankPrompt = false;
  ensureTownMetaState(game);
  game.recordTelemetry("bank_persistence_viewed", {
    activeContractId: game.getActiveContract(false)?.id || ""
  });
  game.recordTelemetry("mastery_viewed", {
    classId: game.player?.classId || ""
  });
  const townCycle = game.getTownCycleState();
  const reactions = game.getTownReactionLines("bank");
  const returnSting = game.getTownReturnStingText();
  const investmentPreview = {
    supply_cache: "Next refresh: provisioner adds another emergency tool.",
    guild_license: "Next refresh: guild stock opens deeper books and charged tools.",
    temple_favors: "Now: temple prices drop. Later: blood altars, oath shrines, and pilgrim pools can appear below.",
    archive_maps: "Next intel pull gets cheaper and cursed caches can start appearing.",
    ghost_bargains: "Future floors can roll ghost merchants.",
    deep_contracts: "Future floors can roll vault rooms and stronger reward tables."
  };
  const unlockRows = getAvailableTownUnlocks(game).slice(0, 3).map((unlockDef) => `
    <div class="workspace-ledger-row bank-investment-row">
      <div>
        <div><strong>${escapeHtml(unlockDef.name)}</strong> <span class="muted">${unlockDef.cost} gp</span></div>
        <div class="muted">${escapeHtml(unlockDef.description)}</div>
        <div class="muted">${escapeHtml(investmentPreview[unlockDef.id] || "Improves the next few descents for this adventurer.")}</div>
      </div>
      <div class="bank-investment-actions">
        <button class="menu-button" data-action="town-unlock" data-unlock="${unlockDef.id}" data-focus-key="${game.getTownUnlockFocusKey(unlockDef.id)}" type="button"${game.player.gold < unlockDef.cost ? " disabled" : ""}>Fund</button>
      </div>
    </div>
  `).join("");
  const intel = getTownIntel(game);
  const townMeta = game.getTownMetaSummary();
  const masterySummary = game.getClassMasterySummary(game.player?.classId);
  const latestSummary = (game.runSummaryHistory || []).at(-1) || game.lastRunSummary;
  const contractModel = game.getContractViewModel();
  const activeContract = game.getActiveContract(true) || game.getActiveContract(false);
  const masteryMarkup = game.getMasteryReviewMarkup(game.player?.classId);
  const archiveMarkup = game.getRunSummaryArchiveMarkup(5);
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
  const prepAdvice = game.getTownPrepAdvice();
  const nextRunIntent = game.getNextRunIntent(game.player?.classId);
  const carryForward = game.getTownCarryForwardSummary();
  const menuLayoutMode = game.getModalLayoutMode();
  const recommendedText = contractModel.recommendedId
    ? `Recommended next run: ${contractModel.all.find((contract) => contract.id === contractModel.recommendedId)?.name || contractModel.recommendedId}. ${contractModel.recommendedReason}`
    : "No contract recommendation available.";
  const recommendedTownActionButton = townMeta.recommendedActionId === "contract_recommended"
    ? `<button class="menu-button primary" data-action="contract-arm-recommended" data-focus-key="bank:recommended-contract" type="button">${escapeHtml(townMeta.recommendedActionLabel)}</button>`
    : townMeta.recommendedActionId?.startsWith("town_unlock:")
      ? `<button class="menu-button primary" data-action="town-unlock" data-unlock="${townMeta.recommendedActionId.split(":")[1]}" data-focus-key="bank:recommended-unlock" type="button"${game.player.gold < (townMeta.nextUnlock?.cost || 0) ? " disabled" : ""}>${escapeHtml(townMeta.recommendedActionLabel)}</button>`
      : townMeta.recommendedActionId === "town_rumor"
        ? `<button class="menu-button primary" data-action="town-rumor" data-focus-key="bank:recommended-rumor" type="button">${escapeHtml(townMeta.recommendedActionLabel)}</button>`
        : townMeta.recommendedActionId === "bank_withdraw"
          ? `<button class="menu-button primary" data-action="bank-withdraw" data-focus-key="bank:recommended-withdraw" type="button">${escapeHtml(townMeta.recommendedActionLabel)}</button>`
          : townMeta.recommendedActionId === "bank_deposit"
            ? `<button class="menu-button primary" data-action="bank-deposit" data-focus-key="bank:recommended-deposit" type="button">${escapeHtml(townMeta.recommendedActionLabel)}</button>`
            : "";
  game.showSimpleModal("Bank", `
    <div class="workspace-stack town-workspace bank-workspace">
      <div class="workspace-summary-strip">
        <div class="workspace-summary-chip">
          <span class="workspace-summary-label">Bank</span>
          <strong>Plan the next descent before you spend.</strong>
        </div>
        <div class="workspace-summary-chip">
          <span class="workspace-summary-label">On Hand / Bank</span>
          <strong>${Math.floor(game.player.gold)} gp / ${Math.floor(game.player.bankGold)} gp</strong>
        </div>
        <div class="workspace-summary-chip">
          <span class="workspace-summary-label">Town Cycle</span>
          <strong>${escapeHtml(`${game.getTownCycleLabel()} | ${townCycle.turnsUntilRefresh === 1 ? "1 turn" : `${townCycle.turnsUntilRefresh} turns`} to turnover`)}</strong>
        </div>
      </div>
      <div class="workspace-shell bank-shell">
        <section class="workspace-rail bank-actions-rail">
          <section class="workspace-detail-card bank-recommended-panel">
            <div class="panel-title">One More Run</div>
            <div class="workspace-plain-copy">${escapeHtml(townMeta.recommendedAction)}</div>
            <div class="workspace-plain-copy muted">${escapeHtml(townMeta.recommendedReason)}</div>
            ${recommendedTownActionButton ? `<div class="modal-actions inline-modal-actions">${recommendedTownActionButton}</div>` : ""}
          </section>
          <section class="workspace-detail-card bank-actions-panel">
            <div class="panel-title">Transactions</div>
            <div class="modal-actions">
              <button class="menu-button" data-action="bank-deposit" data-focus-key="${game.getTownActionFocusKey("deposit")}" type="button">Deposit 100</button>
              <button class="menu-button" data-action="bank-withdraw" data-focus-key="${game.getTownActionFocusKey("withdraw")}" type="button">Withdraw 100</button>
              <button class="menu-button" data-action="town-rumor" data-focus-key="${game.getTownActionFocusKey("rumor")}" type="button">Buy Intel (${getRumorPrice(game)} gp)</button>
            </div>
            <div class="workspace-plain-copy muted">${escapeHtml(carryForward)}</div>
          </section>
          <section class="workspace-detail-card">
            <div class="panel-title">Investments</div>
            <div class="workspace-plain-copy">${townMeta.nextUnlock ? escapeHtml(`${townMeta.nextUnlock.name} | ${townMeta.nextUnlock.cost} gp`) : "All current town investments are funded."}</div>
            <div class="workspace-ledger bank-investment-ledger">
              ${unlockRows || "<div class='workspace-plain-copy muted'>No investments are waiting right now.</div>"}
            </div>
          </section>
        </section>
        <section class="workspace-rail-detail bank-detail-rail">
          <section class="workspace-ledger-group">
            <div class="panel-title">Current State</div>
            <div class="workspace-ledger">
              <div class="workspace-ledger-row"><div><strong>On hand</strong><div class="muted">Carry gold available right now.</div></div><span>${Math.floor(game.player.gold)} gp</span></div>
              <div class="workspace-ledger-row"><div><strong>On account</strong><div class="muted">Stored value for the next run.</div></div><span>${Math.floor(game.player.bankGold)} gp</span></div>
              <div class="workspace-ledger-row"><div><strong>Rumor tokens</strong><div class="muted">${escapeHtml(townCycle.rumorSummary)}</div></div><span>${game.player.runCurrencies?.rumorTokens || 0}</span></div>
              <div class="workspace-ledger-row"><div><strong>Turnover</strong><div class="muted">${escapeHtml(reactions.lines[0] || "Town services are steady right now.")}</div></div><span>${escapeHtml(game.getTownCycleLabel())}</span></div>
            </div>
          </section>
          <section class="workspace-detail-card">
            <div class="panel-title">Prep Read</div>
            <div class="workspace-plain-copy">${escapeHtml(prepAdvice)}</div>
            ${returnSting ? `<div class="workspace-plain-copy muted">${escapeHtml(returnSting)}</div>` : ""}
          </section>
          <section class="workspace-detail-card">
            <div class="panel-title">Next Floor Intel</div>
            <div class="workspace-plain-copy">${escapeHtml(recommendedText)}</div>
            ${nextRumor}
          </section>
        </section>
      </div>
      ${menuLayoutMode === "desktop" ? "" : game.getDisclosureMarkup({
        title: "One More Run",
        summary: game.getCompactUiCopy(nextRunIntent.motivators[0] ? `${nextRunIntent.motivators[0].label} ${nextRunIntent.motivators[0].detail}` : "No extra run motivator yet.", 72),
        className: "bank-disclosure",
        body: `<div class="text-block">${nextRunIntent.motivators.map((entry) => escapeHtml(`${entry.label} ${entry.detail}`)).join("<br><br>")}</div>`
      })}
      ${menuLayoutMode === "desktop" ? "" : game.getDisclosureMarkup({
        title: "Next Floor Intel",
        summary: game.getCompactUiCopy(recommendedText, 72),
        className: "bank-disclosure",
        body: `<div class="text-block">${escapeHtml(recommendedText)}</div><br>${nextRumor}`
      })}
      ${menuLayoutMode === "desktop" ? "" : game.getDisclosureMarkup({
        title: "Featured Market Picks",
        summary: game.getCompactUiCopy(featuredStockSummary || "No featured wares are posted for this cycle.", 72),
        className: "bank-disclosure",
        body: `<div class="text-block">${escapeHtml(featuredStockSummary || "No featured wares are posted for this cycle.")}</div>`
      })}
      ${menuLayoutMode === "desktop" ? "" : game.getDisclosureMarkup({
        title: "Investments",
        summary: townMeta.nextUnlock ? `${townMeta.nextUnlock.name} | ${townMeta.nextUnlock.cost} gp` : "All current investments funded",
        className: "bank-disclosure",
        body: unlockRows || "<div class='text-block muted'>All current town investments are funded.</div>"
      })}
      ${menuLayoutMode === "desktop" ? "" : game.getDisclosureMarkup({
        title: "Contracts",
        summary: activeContract ? activeContract.name : "No contract armed",
        className: "bank-disclosure",
        body: `<div class="text-block">Town Persistence. Opt-in. Applies to next run only.</div>${game.getContractReviewMarkup()}`
      })}
      ${menuLayoutMode === "desktop" ? "" : game.getDisclosureMarkup({
        title: "Mastery",
        summary: masterySummary,
        className: "bank-disclosure",
        body: `<div class="text-block">${escapeHtml(`Class-based. Permanent. Finite ranks. ${masterySummary}`)}</div>${masteryMarkup}`
      })}
      ${menuLayoutMode === "desktop" ? "" : game.getDisclosureMarkup({
        title: "Return Archive",
        summary: latestSummary ? `${latestSummary.outcome} depth ${latestSummary.extractedDepth}` : "No return archive yet",
        className: "bank-disclosure",
        body: archiveMarkup
      })}
      ${menuLayoutMode === "desktop" ? "" : game.getDisclosureMarkup({
        title: "Rumor Archive",
        summary: intel.known.length > 0 ? `${intel.known.length} secured rumor${intel.known.length === 1 ? "" : "s"}` : "No secured rumors yet",
        className: "bank-disclosure",
        body: `<div class="message-log journal-log">${knownRumors}</div>`
      })}
    </div>
  `, {
    surfaceKey: "bank",
    preserveScroll,
    focusTarget,
    fallbackFocus
  });
}
