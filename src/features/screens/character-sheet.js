/**
 * @module screens/character-sheet
 * @owns Character sheet modal presentation
 * @reads game.player, combat/field derived stats, burden, contracts
 * @mutates game.mode (via game.showSimpleModal)
 *
 * Extracted from src/game.js to lighten the coordinator. The function takes
 * the Game instance because every data read is against live Game state
 * (stats, burden, contracts, equipment). Selectors and IDs are preserved
 * byte-for-byte so the harness and rules tests continue to work.
 */
import { clamp, escapeHtml } from "../../core/utils.js";

export function renderCharacterSheet(game, options = {}) {
  if (!game.player) {
    return;
  }
  game.syncAdaptiveLayout();
  game.clearModalInteractionFeedback();
  const {
    preserveScroll = false,
    focusTarget = null,
    fallbackFocus = true,
    closeLabel = "Close",
    modalReturnContext = null
  } = options;
  const player = game.player;
  const stats = game.getActorStats(player);
  const baseStats = player.stats || stats;
  const bonuses = game.getEquipmentStatBonuses(player);
  const hpRatio = player.maxHp > 0 ? player.hp / player.maxHp : 1;
  const manaRatio = player.maxMana > 0 ? player.mana / player.maxMana : 1;
  const burdenUi = game.getBurdenUiState();
  const expProgress = game.getLevelProgress(player);
  const [damageLow, damageHigh] = game.getDamageRange();
  const activeContract = game.getActiveContract(true) || game.getActiveContract(false);
  const conditionTags = [];
  if ((player.held || 0) > 0) {
    conditionTags.push(`Held ${player.held}`);
  }
  if ((player.slowed || 0) > 0) {
    conditionTags.push(`Slowed ${player.slowed}`);
  }
  if ((player.guardBrokenTurns || 0) > 0) {
    conditionTags.push(`Guard broken ${player.guardBrokenTurns}`);
  }
  if ((player.arcaneWardTurns || 0) > 0) {
    conditionTags.push(`Arcane ward ${player.arcaneWardTurns}`);
  }
  if ((player.resistFireTurns || 0) > 0) {
    conditionTags.push(`Fire ward ${player.resistFireTurns}`);
  }
  if ((player.resistColdTurns || 0) > 0) {
    conditionTags.push(`Cold ward ${player.resistColdTurns}`);
  }
  if ((player.lightBuffTurns || 0) > 0) {
    conditionTags.push(`Light ${player.lightBuffTurns}`);
  }
  if (burdenUi.state !== "safe") {
    conditionTags.push(burdenUi.label);
  }
  const attributeRows = [
    ["Strength", "str"],
    ["Dexterity", "dex"],
    ["Constitution", "con"],
    ["Intelligence", "int"]
  ].map(([label, key]) => {
    const base = baseStats[key] || 0;
    const effective = stats[key] || 0;
    const bonus = bonuses[key] || 0;
    const detail = bonus === 0
      ? `${base} base`
      : `${base} base, ${bonus > 0 ? "+" : ""}${bonus} gear`;
    return `
      <div class="character-sheet-row">
        <strong>${label}</strong>
        <span class="muted">${escapeHtml(detail)}</span>
        <span>${effective}</span>
      </div>
    `;
  }).join("");
  const combatRows = [
    ["Attack", game.getAttackValue()],
    ["Damage", `${damageLow}-${damageHigh}`],
    ["Armor", game.getArmorValue()],
    ["Evade", game.getEvadeValue()],
    ["Guard", game.getGuardValue()],
    ["Ward", game.getWardValue()]
  ].map(([label, value]) => `
    <div class="character-sheet-row">
      <strong>${escapeHtml(label)}</strong>
      <span class="muted">Current total</span>
      <span>${escapeHtml(String(value))}</span>
    </div>
  `).join("");
  const fieldRows = [
    ["Search", game.getSearchPower()],
    ["Move Speed", `${player.moveSpeed}%`],
    ["Light Radius", player.lightRadius],
    ["Fire Resist", game.getFireResistValue()],
    ["Cold Resist", game.getColdResistValue()],
    ["Load", `${burdenUi.weight} / ${burdenUi.capacity}`],
    ["Gold", `${player.gold} gp`],
    ["Spells Known", player.spellsKnown.length]
  ].map(([label, value]) => `
    <div class="character-sheet-row">
      <strong>${escapeHtml(label)}</strong>
      <span class="muted">Run state</span>
      <span>${escapeHtml(String(value))}</span>
    </div>
  `).join("");

  game.mode = "modal";
  game.showSimpleModal("Character Sheet", `
    <div class="workspace-stack character-sheet character-sheet-workspace">
      <div class="workspace-summary-strip">
        <div class="workspace-summary-chip">
          <span class="workspace-summary-label">Adventurer</span>
          <strong>${escapeHtml(player.name)} | ${escapeHtml(player.className)}</strong>
        </div>
        <div class="workspace-summary-chip">
          <span class="workspace-summary-label">Run State</span>
          <strong>${escapeHtml(`${game.currentDepth === 0 ? "Town" : `Depth ${game.currentDepth}`} | Level ${player.level} | Turn ${game.turn}`)}</strong>
        </div>
        <div class="workspace-summary-chip">
          <span class="workspace-summary-label">Contract</span>
          <strong>${escapeHtml(activeContract ? activeContract.name : "None armed")}</strong>
        </div>
      </div>
      <div class="workspace-shell character-sheet-shell">
        <section class="workspace-rail character-sheet-identity-rail">
          <section class="workspace-detail-card">
            <div class="panel-title">Identity</div>
            <div class="workspace-detail-title">${escapeHtml(player.name)}</div>
            <div class="workspace-plain-copy">${escapeHtml(`${player.race} ${player.className} | ${game.currentDepth === 0 ? "Town" : `Depth ${game.currentDepth}`} | Level ${player.level}`)}</div>
            <div class="character-sheet-tags">
              ${conditionTags.length > 0
                ? conditionTags.map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("")
                : `<span class="pill">Stable</span>`}
            </div>
          </section>
          <section class="workspace-detail-card">
            <div class="panel-title">Resources</div>
            <div class="character-resource-stack">
              <div class="rail-stat-pill tone-health">
                <span>Health</span>
                <strong>${Math.floor(player.hp)} / ${player.maxHp}</strong>
                <div class="rail-meter hp"><span style="width:${clamp(Math.round(hpRatio * 100), 0, 100)}%"></span></div>
                <div class="character-sheet-meter-note">${clamp(Math.round(hpRatio * 100), 0, 100)}% ready</div>
              </div>
              <div class="rail-stat-pill tone-mana">
                <span>Mana</span>
                <strong>${Math.floor(player.mana)} / ${player.maxMana}</strong>
                <div class="rail-meter mana"><span style="width:${clamp(Math.round(manaRatio * 100), 0, 100)}%"></span></div>
                <div class="character-sheet-meter-note">${clamp(Math.round(manaRatio * 100), 0, 100)}% reserve</div>
              </div>
              <div class="rail-stat-pill tone-meta">
                <span>Experience</span>
                <strong>${expProgress.exp} / ${expProgress.nextThreshold}</strong>
                <div class="rail-meter xp"><span style="width:${expProgress.percent}%"></span></div>
                <div class="character-sheet-meter-note">${expProgress.remaining} to next level</div>
              </div>
              <div class="rail-stat-pill tone-load burden-${burdenUi.state}">
                <span>Burden</span>
                <strong>${burdenUi.weight} / ${burdenUi.capacity}</strong>
                <div class="rail-meter burden burden-${burdenUi.state}"><span style="width:${burdenUi.percent}%"></span></div>
                <div class="character-sheet-meter-note">${escapeHtml(burdenUi.label)}</div>
              </div>
            </div>
          </section>
          <section class="workspace-ledger-group">
            <div class="panel-title">Attributes</div>
            <div class="workspace-ledger">
              ${attributeRows}
            </div>
          </section>
        </section>
        <section class="workspace-rail-detail character-sheet-detail-rail">
          <section class="workspace-ledger-group">
            <div class="panel-title">Combat</div>
            <div class="workspace-ledger">
              ${combatRows}
            </div>
          </section>
          <section class="workspace-ledger-group">
            <div class="panel-title">Field</div>
            <div class="workspace-ledger">
              ${fieldRows}
            </div>
          </section>
        </section>
      </div>
    </div>
  `, {
    surfaceKey: "character-sheet",
    preserveScroll,
    focusTarget,
    fallbackFocus,
    closeLabel,
    modalReturnContext
  });
}
