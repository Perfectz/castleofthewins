/**
 * @module screens/magic-hub
 * @owns Magic hub body markup + result panel (spellbook + cast workspace)
 * @reads player spells, pinned tray, spell metadata
 * @mutates none (pure renderer)
 *
 * Extracted from src/game.js. Preserves selectors (hub-body-magic,
 * magic-card, magic-result-panel) and data-action hooks
 * (spell-select, spell-cast, spell-pin-toggle, spell-pin-up/down,
 * magic-filter).
 */
import { escapeHtml, capitalize } from "../../core/utils.js";
import { SPELLS } from "../../data/content.js";
import { getSpellCost } from "../builds.js";
import { getSpellCategoryLabel } from "../inventory-ui.js";

export function renderMagicHubMarkup(game) {
  const pinnedSpellIds = game.getPinnedSpellIds();
  const {
    sortedSpellIds,
    filterDefs,
    activeFilter,
    visibleSpellIds
  } = game.getMagicSpellListState(game.activeMagicFilter, game.player.spellsKnown);
  const selectedSpellId = game.getMagicSelectedSpellId({
    sortedSpellIds,
    filterDefs,
    activeFilter,
    visibleSpellIds
  });
  const activeFilterLabel = filterDefs.find((entry) => entry.key === activeFilter)?.label || "All";
  const rows = visibleSpellIds.length === 0
    ? `<div class="text-block magic-list-empty">No spells are known for this filter.</div>`
    : visibleSpellIds.map((spellId) => {
      const spell = SPELLS[spellId];
      const manaCost = getSpellCost(game, spell);
      const overcast = game.player.mana < manaCost;
      const pinnedIndex = pinnedSpellIds.indexOf(spellId);
      const isPinned = pinnedIndex >= 0;
      const isSelected = selectedSpellId === spellId;
      const iconMeta = game.getSpellIconMeta(spell);
      const rowTone = overcast
        ? "pack-item-row-bad"
        : isPinned
          ? "pack-item-row-good"
          : "pack-item-row-neutral";
      const rowMeta = `${getSpellCategoryLabel(spell)} / ${capitalize(spell.school || "spell")} / ${game.getSpellUiTargetingLabel(spell)}`;
      const rowCopy = game.getCompactUiCopy(game.getSpellMechanicalReadout(spell) || game.getSpellCardCopy(spell), 88);
      return `
        <button class="magic-card magic-card-select pack-item-row ${rowTone}${isSelected ? " active" : ""}" data-action="spell-select" data-double-action="spell-cast" data-surface="book" data-spell="${spellId}" data-spell-card="${spellId}" data-focus-key="${game.getSpellBookFocusKey(spellId)}" type="button">
          <div class="pack-item-head">
            <div class="pack-item-head-main">
              <div class="pack-item-name"><span class="spell-symbol-inline" aria-hidden="true">${escapeHtml(iconMeta.symbol)}</span><span>${escapeHtml(spell.name)}</span></div>
              <div class="pack-item-meta-compact">${escapeHtml(rowMeta)}</div>
            </div>
            <div class="pack-item-head-side">
              <span class="pack-row-chip${overcast ? " pack-row-chip-bad" : ""}">${escapeHtml(`${manaCost} mp`)}</span>
              <span class="pack-row-chip${isPinned ? " pack-row-chip-good" : ""}" data-spell-status="${spellId}">${escapeHtml(game.getMagicCardStatusText(spellId, selectedSpellId))}</span>
            </div>
          </div>
          <div class="magic-list-row-note">${escapeHtml(rowCopy)}</div>
        </button>
      `;
    }).join("");
  const toolbarMarkup = `
    <div class="pack-toolbar pack-classic-toolbar magic-classic-toolbar">
      <div class="pack-toolbar-meta">
        <span class="pack-toolbar-chip">${escapeHtml(`${game.player.name}  ${game.player.race} ${game.player.className}`)}</span>
        <span class="pack-toolbar-chip">Mana ${escapeHtml(`${Math.floor(game.player.mana)}/${game.player.maxMana}`)}</span>
        <span class="pack-toolbar-chip">Known ${game.player.spellsKnown.length}</span>
        <span class="pack-toolbar-chip">Tray ${pinnedSpellIds.length}/${game.getSpellTrayLimit()}</span>
        <span class="pack-toolbar-detail">${escapeHtml(game.spellTrayOpen || game.mode === "target" ? "Field tray live" : "Book view")}</span>
      </div>
    </div>
  `;

  return `
    <div class="hub-body hub-body-magic hub-body-magic-classic">
      <div data-magic-summary-host>
        ${toolbarMarkup}
      </div>
      <div class="magic-workspace">
        <div class="magic-controls">
          <div data-magic-filter-host>${game.getSpellFilterChipsMarkup(activeFilter, "magic-filter", (key) => game.getMagicFilterFocusKey(key), "magic-filter-row", filterDefs)}</div>
        </div>
        <div class="pack-layout pack-layout-equip magic-layout">
          <section class="hub-section pack-inventory-panel magic-book-panel pack-column pack-column-secondary">
            <div class="pack-equip-list-header">
              <div class="pack-equip-list-title">Spellbook</div>
              <div class="pack-equip-list-note">${escapeHtml(`${activeFilterLabel} | ${visibleSpellIds.length} visible`)}</div>
            </div>
            <div class="inventory-list-panel pack-list-panel pack-classic-list magic-book-list" data-magic-list-host>
              ${rows}
            </div>
          </section>
          <div class="pack-side-rail magic-side-rail">
            <div data-magic-result-host class="pack-column pack-column-primary">
              ${renderMagicResultPanelMarkup(game, selectedSpellId)}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderMagicResultPanelMarkup(game, selectedSpellId) {
  const pinnedSpellIds = game.getPinnedSpellIds();
  const selectedSpell = SPELLS[selectedSpellId] || null;
  if (!selectedSpell) {
    return `
      <section class="hub-section pack-inspector-panel magic-result-panel" data-magic-result-panel>
        <div class="panel-title">Result</div>
        <div class="pack-inspector-card">
          <div class="pack-inspector-kicker">Spellbook</div>
          <div class="pack-inspector-title">Choose A Spell</div>
          <div class="pack-inspector-note">Select a spell to review mana cost, targeting, tray status, and cast actions.</div>
        </div>
      </section>
    `;
  }

  const selectedPinnedIndex = pinnedSpellIds.indexOf(selectedSpellId);
  const selectedPinned = selectedPinnedIndex >= 0;
  const selectedTrayFull = pinnedSpellIds.length >= game.getSpellTrayLimit();
  const selectedManaCost = getSpellCost(game, selectedSpell);
  const overcast = game.player.mana < selectedManaCost;
  const categoryLabel = getSpellCategoryLabel(selectedSpell);
  const targetingLabel = game.getSpellUiTargetingLabel(selectedSpell);
  const roleLabel = capitalize(game.getSpellRoleLabel(selectedSpell));
  const schoolLabel = capitalize(selectedSpell.school || "spell");
  const selectedIconMeta = game.getSpellIconMeta(selectedSpell);
  const actionLabel = overcast ? "Overcast Risk" : "Cast Ready";
  const actionCopy = game.getSpellMechanicalReadout(selectedSpell) || game.getCompactUiCopy(game.getSpellCardCopy(selectedSpell), 148);
  const pinButtonLabel = selectedPinned
    ? "Remove From Tray"
    : selectedTrayFull
      ? "Tray Full"
      : "Pin To Tray";
  const detailBody = `
    <div class="magic-result-copy">${escapeHtml(game.getSpellCardCopy(selectedSpell) || actionCopy)}</div>
    <div class="magic-feature-meta-grid">
      <div class="pack-stat-pill">${escapeHtml(categoryLabel)}</div>
      <div class="pack-stat-pill">${escapeHtml(schoolLabel)}</div>
      <div class="pack-stat-pill">${escapeHtml(roleLabel)}</div>
      <div class="pack-stat-pill">${escapeHtml(`Tier ${selectedSpell.tier || 1}`)}</div>
      <div class="pack-stat-pill">${escapeHtml(targetingLabel)}</div>
      <div class="pack-stat-pill">${escapeHtml(selectedPinned ? `Tray ${selectedPinnedIndex + 1}` : "Book only")}</div>
    </div>
    ${selectedPinned
      ? `
        <div class="magic-result-actions magic-result-actions-secondary">
          <button class="menu-button" data-action="spell-pin-up" data-spell="${selectedSpellId}" data-focus-key="magic:result:up" type="button"${selectedPinnedIndex === 0 ? " disabled" : ""}>Move Up</button>
          <button class="menu-button" data-action="spell-pin-down" data-spell="${selectedSpellId}" data-focus-key="magic:result:down" type="button"${selectedPinnedIndex === pinnedSpellIds.length - 1 ? " disabled" : ""}>Move Down</button>
        </div>
      `
      : ""}
  `;

  return `
    <section class="hub-section pack-inspector-panel magic-result-panel" data-magic-result-panel>
      <div class="panel-title">Result</div>
      <div class="pack-inspector-card">
        <div class="pack-inspector-kicker">${escapeHtml(categoryLabel)}</div>
        <div class="pack-inspector-title"><span class="spell-symbol-inline" aria-hidden="true">${escapeHtml(selectedIconMeta?.symbol || "*")}</span><span>${escapeHtml(selectedSpell.name)}</span></div>
        <div class="pack-inspector-note">${escapeHtml(actionLabel)}</div>
        <div class="magic-result-copy">${escapeHtml(actionCopy)}</div>
        <div class="magic-result-rows">
          <div class="magic-result-row">
            <span>Mana</span>
            <strong>${escapeHtml(`${selectedManaCost} mana${overcast ? " / overcast" : ""}`)}</strong>
          </div>
          <div class="magic-result-row">
            <span>Target</span>
            <strong>${escapeHtml(targetingLabel)}</strong>
          </div>
          <div class="magic-result-row">
            <span>Tray</span>
            <strong>${escapeHtml(selectedPinned ? `Slot ${selectedPinnedIndex + 1}` : "Book only")}</strong>
          </div>
        </div>
        <div class="magic-result-actions" data-magic-result-actions>
          <button class="menu-button pack-action-primary" data-action="spell-cast" data-spell="${selectedSpellId}" data-focus-key="magic:result:cast" type="button">Cast</button>
          <button class="menu-button" data-action="spell-pin-toggle" data-spell="${selectedSpellId}" data-focus-key="magic:result:pin" type="button"${!selectedPinned && selectedTrayFull ? " disabled" : ""}>${pinButtonLabel}</button>
        </div>
        ${game.getDisclosureMarkup({
          title: "Details",
          summary: `${schoolLabel} | ${roleLabel}`,
          className: "magic-feature-disclosure",
          body: detailBody
        })}
      </div>
    </section>
  `;
}
