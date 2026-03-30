import { CLASSES, RACES } from "../data/content.js";
import { getCarryCapacity, getClass, getRace } from "../core/entities.js";
import { choiceCard, escapeHtml } from "../core/utils.js";

export const CREATION_STAT_KEYS = ["str", "dex", "con", "int"];
export const CREATION_STAT_LABELS = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence"
};
export const CREATION_STAT_NOTES = {
  str: "Melee accuracy, damage, burden",
  dex: "Evasion, armor read, searching",
  con: "Health, recovery, overcast safety",
  int: "Mana, spell power, searching"
};
export const CREATION_STAT_POINT_BUDGET = 6;
export const CREATION_STAT_POINT_CAP = 4;

export function resetCreationDraft(game) {
  game.selectedRace = RACES[0].id;
  game.selectedClass = CLASSES[0].id;
  game.creationName = "Morgan";
  game.creationStatBonuses = { str: 0, dex: 0, con: 0, int: 0 };
}

export function captureCreationDraft(game) {
  const nameInput = document.getElementById("hero-name");
  if (nameInput) {
    game.creationName = nameInput.value.trim() || "Morgan";
  }
}

export function getCreationPointsRemaining(game) {
  return CREATION_STAT_POINT_BUDGET - CREATION_STAT_KEYS.reduce((sum, stat) => sum + (game.creationStatBonuses[stat] || 0), 0);
}

export function adjustCreationStat(game, stat, delta) {
  if (!CREATION_STAT_KEYS.includes(stat) || delta === 0) {
    return false;
  }
  const current = game.creationStatBonuses[stat] || 0;
  if (delta > 0 && (getCreationPointsRemaining(game) <= 0 || current >= CREATION_STAT_POINT_CAP)) {
    return false;
  }
  if (delta < 0 && current <= 0) {
    return false;
  }
  game.creationStatBonuses[stat] = current + delta;
  return true;
}

export function getCreationStats(game) {
  const race = getRace(game.selectedRace);
  const role = getClass(game.selectedClass);
  return {
    str: race.stats.str + role.bonuses.str + (game.creationStatBonuses.str || 0),
    dex: race.stats.dex + role.bonuses.dex + (game.creationStatBonuses.dex || 0),
    con: race.stats.con + role.bonuses.con + (game.creationStatBonuses.con || 0),
    int: race.stats.int + role.bonuses.int + (game.creationStatBonuses.int || 0)
  };
}

export function showTitleScreen(game) {
  game.mode = "title";
  game.setModalVisibility(true);
  const template = document.getElementById("title-template");
  const fragment = template.content.cloneNode(true);
  const saveSummary = fragment.getElementById("title-save-summary");
  const loadButton = fragment.getElementById("title-load-button");
  const savedMeta = game.getSavedRunMeta();

  if (savedMeta) {
    const savedTime = savedMeta.savedAt ? game.formatSaveStamp(savedMeta.savedAt) : null;
    saveSummary.innerHTML = `
      <div class="title-save-label">Continue Run</div>
      <div class="title-save-name">${escapeHtml(savedMeta.name)}</div>
      <div class="title-save-meta">Level ${savedMeta.level} - Depth ${savedMeta.depth}</div>
      ${savedTime ? `<div class="title-save-meta">${escapeHtml(savedTime)}</div>` : ""}
    `;
  } else {
    saveSummary.innerHTML = `
      <div class="title-save-label">No Saved Run</div>
      <div class="title-save-meta">Start a fresh descent and your latest run will appear here.</div>
    `;
    loadButton.disabled = true;
  }

  game.modalRoot.innerHTML = "";
  game.modalRoot.appendChild(fragment);
  game.modalRoot.classList.remove("hidden");
  game.refreshChrome();
}

export function showCreationModal(game) {
  game.mode = "creation";
  game.setModalVisibility(true);
  const template = document.getElementById("creation-template");
  const fragment = template.content.cloneNode(true);
  const nameInput = fragment.getElementById("hero-name");
  const raceChoice = fragment.getElementById("race-choice");
  const classChoice = fragment.getElementById("class-choice");
  const statPoints = fragment.getElementById("creation-stat-points");
  const statAllocation = fragment.getElementById("creation-stat-allocation");
  const preview = fragment.getElementById("creation-preview");

  nameInput.value = game.creationName;
  RACES.forEach((race) => raceChoice.appendChild(choiceCard(race, "race", race.id === game.selectedRace)));
  CLASSES.forEach((role) => classChoice.appendChild(choiceCard(role, "class", role.id === game.selectedClass)));

  const race = getRace(game.selectedRace);
  const role = getClass(game.selectedClass);
  const stats = game.getCreationStats();
  const pointsRemaining = game.getCreationPointsRemaining();
  const previewHp = game.getMaxHpForStats(stats, 1, role.name, 0, race.hp + role.bonuses.hp);
  const previewMana = game.getMaxManaForStats(stats, role.name, 0, race.mana + role.bonuses.mana);
  const [damageLow, damageHigh] = game.getDamageRangeForStats(stats, 2);

  statPoints.innerHTML = `Training points remaining: <strong>${pointsRemaining}</strong>`;
  statAllocation.innerHTML = CREATION_STAT_KEYS.map((stat) => `
    <div class="creation-stat-row">
      <div class="creation-stat-copy">
        <div class="creation-stat-title">${CREATION_STAT_LABELS[stat]}</div>
        <div class="creation-stat-notes">
          <span>${escapeHtml(CREATION_STAT_NOTES[stat])}</span>
        </div>
      </div>
      <div class="creation-stat-stepper">
        <button class="tiny-button creation-stat-button" data-action="creation-adjust-stat" data-stat="${stat}" data-delta="-1" type="button" ${game.creationStatBonuses[stat] <= 0 ? "disabled" : ""}>-</button>
        <div class="creation-stat-value">${stats[stat]}</div>
        <button class="tiny-button creation-stat-button" data-action="creation-adjust-stat" data-stat="${stat}" data-delta="1" type="button" ${(pointsRemaining <= 0 || game.creationStatBonuses[stat] >= CREATION_STAT_POINT_CAP) ? "disabled" : ""}>+</button>
      </div>
    </div>
  `).join("");

  preview.innerHTML = `
    <div class="section-block"><span class="pill">${escapeHtml(race.name)}</span><span class="pill">${escapeHtml(role.name)}</span></div>
    <div class="section-block muted">${escapeHtml(race.summary)} ${escapeHtml(role.summary)}</div>
    <div class="stat-grid">
      <div class="stat-line"><span>Strength</span><strong>${stats.str}</strong></div>
      <div class="stat-line"><span>Dexterity</span><strong>${stats.dex}</strong></div>
      <div class="stat-line"><span>Constitution</span><strong>${stats.con}</strong></div>
      <div class="stat-line"><span>Intelligence</span><strong>${stats.int}</strong></div>
      <div class="stat-line"><span>Hit Points</span><strong>${previewHp}</strong></div>
      <div class="stat-line"><span>Mana</span><strong>${previewMana}</strong></div>
      <div class="stat-line"><span>Attack</span><strong>${game.getAttackValueForStats(stats, 2)}</strong></div>
      <div class="stat-line"><span>Damage</span><strong>${damageLow}-${damageHigh}</strong></div>
      <div class="stat-line"><span>Evade</span><strong>${game.getEvadeValueForStats(stats)}</strong></div>
      <div class="stat-line"><span>Armor</span><strong>${game.getArmorValueForStats(stats)}</strong></div>
      <div class="stat-line"><span>Search</span><strong>${game.getSearchRadiusForStats(stats)} tiles</strong></div>
      <div class="stat-line"><span>Carry</span><strong>${getCarryCapacity({ stats })}</strong></div>
    </div>
  `;

  game.modalRoot.innerHTML = "";
  game.modalRoot.appendChild(fragment);
  game.modalRoot.classList.remove("hidden");
  game.refreshChrome();
}
