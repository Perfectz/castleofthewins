/**
 * @module screens/pack-hub
 * @owns Pack hub body markup (inventory + equipment layouts)
 * @reads live player, inventory model, equipment model, shop context
 * @mutates none (pure renderer)
 *
 * Extracted from src/game.js. Selectors (hub-body-pack, pack-layout,
 * paper-slot, pack-inventory-panel) and data-action hooks (inspect-slot,
 * inspect-pack-item) are preserved byte-for-byte.
 */
import { getItemName, getItemValue } from "../../core/entities.js";
import { escapeHtml } from "../../core/utils.js";
import { buildEquipmentSlotSummary } from "../inventory-ui.js";

export function renderPackHubMarkup(game, viewModel = null) {
  const {
    shopId,
    model,
    inventoryModel
  } = viewModel || game.buildPackHubViewModel();
  const useEquipmentLayout = game.shouldUsePackEquipmentLayout(model);
  const equipmentModel = useEquipmentLayout ? game.getPackEquipmentWorkspaceModel(model, inventoryModel) : null;
  const burdenUi = inventoryModel.burdenUi;
  const equipmentValue = Object.values(game.player.equipment).reduce((sum, item) => sum + (item ? getItemValue(item) : 0), 0);
  const packValue = game.player.inventory.reduce((sum, item) => sum + getItemValue(item), 0);
  const buildSummary = inventoryModel.buildSummary;
  const paperdoll = game.getPackSlotDefinitions().map((slotDef) => {
    const item = game.player.equipment[slotDef.slot];
    const compatibleCount = inventoryModel.entries.filter((entry) => game.getEquipmentBaseSlot(entry.item.slot || "") === game.getEquipmentBaseSlot(slotDef.slot) && entry.recommendation === "Equip").length;
    const slotSummary = buildEquipmentSlotSummary(game, slotDef, compatibleCount);
    const isActive = model.selection.type === "slot" && model.selection.value === slotDef.slot;
    return `
      <button class="paper-slot slot-${slotDef.area}${isActive ? " active" : ""}" data-action="inspect-slot" data-slot="${slotDef.slot}" data-focus-key="${game.getPackSlotFocusKey(slotDef.slot)}" data-pack-preview-type="slot" data-pack-preview-value="${slotDef.slot}" type="button">
        <span class="paper-slot-label">${escapeHtml(slotDef.label)}</span>
        <span class="paper-slot-item">${item ? escapeHtml(getItemName(item)) : "Empty"}</span>
        <span class="paper-slot-quality">${escapeHtml(slotSummary.quality)}</span>
        <span class="paper-slot-note">${escapeHtml(slotSummary.reason)}</span>
        ${compatibleCount > 0 ? `<span class="paper-slot-badge">${compatibleCount} ready</span>` : ""}
      </button>
    `;
  }).join("");
  const loadoutInnerMarkup = `
    <div class="pack-equipment-summary workspace-hero compact">
      <div class="workspace-title">${escapeHtml(buildSummary.headline)}</div>
      <div class="pack-build-tags">${buildSummary.tags.map((tag) => `<span class="item-chip">${escapeHtml(tag)}</span>`).join("")}</div>
    </div>
    <div class="pack-paperdoll">
      ${paperdoll}
    </div>
    <div class="inventory-detail pack-field-note pack-value-strip">
      <span class="pack-value-chip">Pack ${Math.floor(packValue)} gp</span>
      <span class="pack-value-chip">Equipped ${Math.floor(equipmentValue)} gp</span>
    </div>
  `;
  const loadoutMarkup = game.layoutMode === "mobile"
    ? game.getDisclosureMarkup({
      title: "Loadout",
      summary: game.getCompactUiCopy(buildSummary.headline, 34),
      className: "pack-loadout-disclosure",
      open: false,
      body: loadoutInnerMarkup
    })
    : loadoutInnerMarkup;
  const showClassicLoadoutPanel = !useEquipmentLayout && game.activePackFilter !== "use";
  const classicToolbarMarkup = `
    <div class="pack-toolbar pack-classic-toolbar">
      <div class="pack-toolbar-meta">
        <span class="pack-toolbar-chip">${escapeHtml(`${game.player.name}  ${game.player.race} ${game.player.className}`)}</span>
        <span class="pack-toolbar-chip">Burden ${escapeHtml(`${burdenUi.weight}/${burdenUi.capacity}`)}</span>
        <span class="pack-toolbar-chip">ATK ${game.getAttackValue()} ARM ${game.getArmorValue()}</span>
        <span class="pack-toolbar-detail">${escapeHtml(`GRD ${game.getGuardValue()} WRD ${game.getWardValue()}`)}</span>
        <span class="pack-toolbar-chip">${Math.floor(game.player.gold)} gp</span>
      </div>
    </div>
  `;

  return `
    <div class="hub-body hub-body-pack${useEquipmentLayout ? " hub-body-pack-classic" : ""}">
      ${useEquipmentLayout ? classicToolbarMarkup : ""}
      <div class="hub-summary hub-summary-compact pack-build-strip">
        <div class="mini-panel"><strong>${escapeHtml(game.player.name)}</strong><br>${escapeHtml(`${game.player.race} ${game.player.className}`)}<div class="mini-panel-note">${escapeHtml(buildSummary.headline)}</div></div>
        <div class="mini-panel burden-panel burden-${burdenUi.state}"><strong>Burden</strong><br><span class="burden-value burden-${burdenUi.state}">${burdenUi.weight} / ${burdenUi.capacity}</span><div class="mini-meter burden burden-${burdenUi.state}"><span style="width:${burdenUi.percent}%"></span></div><span class="mini-panel-note">${escapeHtml(burdenUi.label)}</span></div>
        <div class="mini-panel"><strong>Attack / Armor</strong><br>${game.getAttackValue()} / ${game.getArmorValue()}<div class="mini-panel-note">Guard ${game.getGuardValue()} \u00b7 Ward ${game.getWardValue()} \u00b7 ${Math.floor(game.player.gold)} gp</div></div>
      </div>
      ${game.getPackQuickStateMarkup(model, inventoryModel)}
      ${useEquipmentLayout
        ? `
          <div class="pack-equip-workspace">
            <div class="pack-equip-controls">
              <div data-pack-filter-host>${game.getPackFilterMarkup(inventoryModel)}</div>
              <div data-pack-equipment-host class="pack-slot-tabs-host">
                ${game.getPackEquipmentSlotTabsMarkup(equipmentModel)}
                ${game.getPackEquipmentSlotSubtabsMarkup(equipmentModel)}
              </div>
            </div>
            <div class="pack-layout pack-layout-equip">
              <section class="hub-section pack-inventory-panel pack-equip-list-panel pack-column pack-column-secondary">
                <div class="inventory-list-panel pack-list-panel pack-classic-candidates" data-pack-list-host>
                  ${game.getPackEquipmentCandidateListMarkup(equipmentModel)}
                </div>
              </section>
              <div class="pack-side-rail pack-side-rail-equip">
                <div data-pack-inspector-host class="pack-column pack-column-primary">${game.getPackDecisionInspectorMarkup(equipmentModel.compareModel, inventoryModel)}</div>
              </div>
            </div>
          </div>
        `
        : `
          <div class="pack-layout">
            <section class="hub-section pack-inventory-panel pack-column pack-column-secondary">
              <div class="panel-title">Inventory</div>
              <div data-pack-filter-host>${game.getPackFilterMarkup(inventoryModel)}</div>
              <div class="inventory-list-panel pack-list-panel" data-pack-list-host>
                ${game.getInventoryGroupsMarkup(inventoryModel, model.selection.type === "inventory" ? model.selection.value : -1)}
              </div>
            </section>
            <div class="pack-side-rail">
              <div data-pack-inspector-host class="pack-column pack-column-primary">${game.getPackInspectorMarkup(model, inventoryModel)}</div>
              ${showClassicLoadoutPanel
                ? `
                  <div data-pack-equipment-host class="pack-column pack-column-secondary">
                    <section class="hub-section pack-equipment-panel">
                      <div class="panel-title">Loadout</div>
                      ${loadoutMarkup}
                    </section>
                  </div>
                `
                : ""}
            </div>
          </div>
        `}
      ${shopId
        ? `<section class="hub-section inventory-detail pack-field-note"><strong>Shop Context</strong><br>${escapeHtml(game.pendingShop.name)} accepts the highlighted sell tags in this view.</section>`
        : ""}
    </div>
  `;
}
