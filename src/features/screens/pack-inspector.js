/**
 * @module screens/pack-inspector
 * @owns Pack hub right-rail inspector markup
 * @reads live game state via passed Game instance
 * @mutates none (pure renderer)
 *
 * Extracted from src/game.js. All selectors (pack-inspector-*,
 * pack-comparison-*, pack-compatible-list) and data-action hooks
 * (inspect-pack-item, item-use, item-drop, unequip-slot, shop-sell,
 * toggle-do-not-sell) are preserved byte-for-byte.
 */
import {
  canIdentify,
  classifyItem,
  describeItem,
  getItemAccuracyBonus,
  getItemArmor,
  getItemColdResist,
  getItemCritBonus,
  getItemDexBonus,
  getItemFireResist,
  getItemGuardBonus,
  getItemIntBonus,
  getItemLightBonus,
  getItemManaBonus,
  getItemName,
  getItemPower,
  getItemStrBonus,
  getItemSearchBonus,
  getItemConBonus,
  getItemValue,
  getItemWardBonus
} from "../../core/entities.js";
import { capitalize, escapeHtml } from "../../core/utils.js";
import { SPELLS } from "../../data/content.js";
import { buildEquipmentSlotSummary, buildInventoryItemSemantics } from "../inventory-ui.js";

export function renderPackInspector(game, model, inventoryModel) {
  const shopId = game.getCurrentPackShopContext();
  const selectedEntry = model.selection.type === "inventory" ? inventoryModel.selectedEntry : null;
  const hoverPreviewModel = game.hoveredPackSelection && !game.isSamePackSelection(game.hoveredPackSelection, model.selection)
    ? game.getPackSelectionModelFor(game.hoveredPackSelection)
    : null;
  const hoverPreviewMarkup = game.getPackHoverPreviewMarkup(hoverPreviewModel, inventoryModel);
  if (!model.item && model.selection.type === "slot") {
    const slotSummary = buildEquipmentSlotSummary(game, model.slotDef, model.compatibleIndexes.length);
    const compatibleRows = model.compatibleIndexes.length === 0
      ? `<div class="muted">No carried item fits this slot right now.</div>`
      : `
        <div class="pack-compatible-list">
          ${model.compatibleIndexes.map((index) => `
            <button class="tiny-button pack-ready-chip" data-action="inspect-pack-item" data-index="${index}" data-focus-key="${game.getPackItemFocusKey(index)}" type="button">${escapeHtml(getItemName(game.player.inventory[index]))}</button>
          `).join("")}
        </div>
      `;
    return `
      <section class="hub-section pack-inspector-panel">
        <div class="panel-title">Selected Slot</div>
        ${hoverPreviewMarkup}
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
  const detailEntry = selectedEntry || buildInventoryItemSemantics(game, item, -1, { shopId });
  const slotSummary = model.selection.type === "slot" ? buildEquipmentSlotSummary(game, model.slotDef, model.compatibleIndexes.length) : null;
  const recommendation = selectedEntry?.recommendation || slotSummary?.recommendation || "Keep";
  const reason = selectedEntry?.reason || slotSummary?.reason || describeItem(item);
  const riskCallout = game.getSemanticRiskCallout(item, detailEntry, model, slotSummary);
  const statLines = [
    item.kind === "weapon" ? `Attack ${getItemPower(item)}` : "",
    item.kind === "armor" ? `Armor ${getItemArmor(item)}` : "",
    getItemAccuracyBonus(item) ? `Accuracy ${getItemAccuracyBonus(item) > 0 ? `+${getItemAccuracyBonus(item)}` : getItemAccuracyBonus(item)}` : "",
    getItemCritBonus(item) ? `Crit +${getItemCritBonus(item)}` : "",
    getItemGuardBonus(item) ? `Guard ${getItemGuardBonus(item)}` : "",
    getItemWardBonus(item) ? `Ward ${getItemWardBonus(item)}` : "",
    getItemManaBonus(item) ? `Mana +${getItemManaBonus(item)}` : "",
    getItemStrBonus(item) ? `Str +${getItemStrBonus(item)}` : "",
    getItemDexBonus(item) ? `Dex +${getItemDexBonus(item)}` : "",
    getItemConBonus(item) ? `Con +${getItemConBonus(item)}` : "",
    getItemIntBonus(item) ? `Int +${getItemIntBonus(item)}` : "",
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
      <button class="menu-button pack-action-primary is-active" data-action="item-use" data-index="${model.selection.value}" data-focus-key="${game.getPackActionFocusKey("use", model.selection.value)}" type="button">${game.getPackItemActionLabel(item)}</button>
      ${shopId && selectedEntry?.sellHereTag
        ? `<button class="menu-button" data-action="shop-sell" data-index="${model.selection.value}" data-focus-key="${game.getShopSellFocusKey(model.selection.value)}" type="button">Sell</button>`
        : ""}
      <label class="mark-sale-toggle inspector-mark-toggle"><input type="checkbox" data-action="toggle-do-not-sell" data-index="${model.selection.value}" data-focus-key="${game.getPackActionFocusKey("protect", model.selection.value)}" ${item.doNotSell ? "checked" : ""}><span>Do Not Sell</span></label>
      <button class="menu-button" data-action="item-drop" data-index="${model.selection.value}" data-focus-key="${game.getPackActionFocusKey("drop", model.selection.value)}" type="button">Drop</button>
    `
    : `
      <button class="menu-button pack-action-primary is-active" data-action="unequip-slot" data-slot="${model.selection.value}" data-focus-key="${game.getPackActionFocusKey("unequip", model.selection.value)}" type="button"${item.cursed ? " disabled" : ""}>Unequip</button>
    `;

  const equippedSwap = model.selection.type === "inventory" && item.slot
    ? model.comparison?.fitsEmptySlot
      ? `<div class="pack-inspector-note">Fits empty ${escapeHtml(game.getPackSlotDefinition(model.comparison.targetSlot).label)} slot.</div>`
      : model.comparison?.equipped
        ? `<div class="pack-inspector-note">Equips over ${escapeHtml(getItemName(model.comparison.equipped, true))}.</div>`
        : ""
    : "";

  const cursedNote = model.selection.type === "slot" && item.cursed
    ? `<div class="pack-inspector-note bad-note">${escapeHtml(getItemName(item, true))} is cursed and cannot be removed yet.</div>`
    : "";

  const comparisonBlock = model.selection.type === "inventory" && item.slot && (model.comparison?.comparisons?.length > 0 || model.comparison?.fitsEmptySlot || model.comparison?.blockedByCurse)
    ? `
      <div class="pack-comparison-card">
        <div class="pack-comparison-title">${model.comparison.fitsEmptySlot ? `Fits ${escapeHtml(game.getPackSlotDefinition(model.comparison.targetSlot).label)}` : model.comparison.equipped ? `Compare vs ${escapeHtml(getItemName(model.comparison.equipped, true))}` : "Accessory Fit"}</div>
        <div class="pack-comparison-list">
          ${model.comparison.blockedByCurse
            ? `<div class="pack-comparison-row value-bad">All ${escapeHtml(game.getPackSlotDefinition(item.slot).label.toLowerCase())} slots are locked by curses.</div>`
            : model.comparison.fitsEmptySlot
              ? `<div class="pack-comparison-row value-good">No swap needed. ${escapeHtml(game.getPackSlotDefinition(model.comparison.targetSlot).label)} is open.</div>`
              : ""}
          ${model.comparison.comparisons?.map((entry) => `
            <div class="pack-comparison-row"><strong>${escapeHtml(entry.label)}</strong>${entry.slot === model.comparison.targetSlot ? " \u00b7 target" : ""}</div>
            ${entry.deltas.length > 0
              ? entry.deltas.map((delta) => `<div class="pack-comparison-row value-${delta.tone}">${escapeHtml(delta.text)}</div>`).join("")
              : `<div class="pack-comparison-row muted">No practical change.</div>`}
          `).join("") || ""}
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
            <button class="tiny-button pack-ready-chip" data-action="inspect-pack-item" data-index="${index}" data-focus-key="${game.getPackItemFocusKey(index)}" type="button">${escapeHtml(getItemName(game.player.inventory[index]))}</button>
          `).join("")}
        </div>
      </div>
    `
    : "";
  const inspectorCopy = item.kind === "charged" && item.identified
    ? `${item.charges || 0}/${item.maxCharges || item.charges || 0} charges ready.`
    : item.kind === "spellbook" && item.identified
      ? `Study to learn ${SPELLS[item.spell]?.name || capitalize(item.spell || "spell")}.`
      : canIdentify(item) && !item.identified
        ? "Identify before you commit this item to a swap or sale."
        : "";
  const visibleStatLines = statLines.slice(0, 4);
  const extraStatLines = statLines.slice(4);
  const inspectorDisclosure = game.getDisclosureMarkup({
    title: "Deep Readout",
    summary: model.selection.type === "slot"
      ? `${model.compatibleIndexes.length} ready item${model.compatibleIndexes.length === 1 ? "" : "s"}`
      : item.slot
        ? "Comparison, burden, and fit"
        : "Extended item detail",
    className: "pack-inspector-disclosure",
    open: model.selection.type === "slot" && model.compatibleIndexes.length > 0,
    body: `
      <div class="pack-item-badges">${game.getItemBadgeMarkup(item, detailEntry, model)}</div>
      ${visibleStatLines.length > 0 ? `<div class="pack-stat-grid">${visibleStatLines.map((line) => `<div class="pack-stat-pill">${escapeHtml(line)}</div>`).join("")}</div>` : ""}
      ${equippedSwap || ""}
      ${extraStatLines.length > 0 ? `<div class="pack-stat-grid pack-stat-grid-secondary">${extraStatLines.map((line) => `<div class="pack-stat-pill">${escapeHtml(line)}</div>`).join("")}</div>` : ""}
      ${comparisonBlock || ""}
      ${readyRows || ""}
    `
  });

  return `
    <section class="hub-section pack-inspector-panel">
      <div class="panel-title">${model.selection.type === "slot" ? "Equipped Detail" : "Selected Item"}</div>
      ${hoverPreviewMarkup}
      <div class="pack-inspector-card">
        <div class="pack-inspector-kicker">${escapeHtml(recommendation)}</div>
        <div class="pack-inspector-title">${escapeHtml(getItemName(item))}</div>
        <div class="pack-inspector-summary">
          <span class="pack-decision-chip">${escapeHtml(model.slotDef ? model.slotDef.label : selectedEntry?.kindLabel || classifyItem(item))}</span>
          <span class="pack-decision-reason">${escapeHtml(reason)}</span>
        </div>
        ${riskCallout ? `<div class="pack-risk-callout">${escapeHtml(riskCallout)}</div>` : ""}
        ${inspectorCopy ? `<div class="pack-inspector-copy">${escapeHtml(inspectorCopy)}</div>` : ""}
        ${cursedNote}
        ${inspectorDisclosure}
        <div class="modal-actions pack-inspector-actions">
          ${actions}
        </div>
      </div>
    </section>
  `;
}
