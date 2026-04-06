import { CLASSES, RACES } from "../data/content.js";
import { CHARACTER_SHEET_PATH, PIXEL_ASSET_ROOT } from "../data/assets.js";
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

const RACE_ART = {
  human: {
    title: "Valley-born",
    accent: "#d48b5a",
    sprite: {
      src: `${PIXEL_ASSET_ROOT}/Character_animation/priests_idle/priest1/v1/priest1_v1_1.png`,
      width: 16,
      height: 16
    }
  },
  elf: {
    title: "Moon-sighted",
    accent: "#7fc5b3",
    sprite: {
      src: `${PIXEL_ASSET_ROOT}/Character_animation/priests_idle/priest2/v1/priest2_v1_1.png`,
      width: 16,
      height: 16
    }
  },
  dwarf: {
    title: "Deepforged",
    accent: "#d2b06c",
    sprite: {
      src: `${PIXEL_ASSET_ROOT}/Character_animation/priests_idle/priest3/v1/priest3_v1_1.png`,
      width: 16,
      height: 16
    }
  }
};

const CLASS_ART = {
  fighter: {
    title: "Iron Vanguard",
    accent: "#c0c6d1",
    sprite: {
      src: CHARACTER_SHEET_PATH,
      width: 16,
      height: 16,
      x: 0,
      y: 0,
      sheetWidth: 112,
      sheetHeight: 64
    }
  },
  rogue: {
    title: "Knife Scout",
    accent: "#d8a066",
    sprite: {
      src: CHARACTER_SHEET_PATH,
      width: 16,
      height: 16,
      x: 64,
      y: 0,
      sheetWidth: 112,
      sheetHeight: 64
    }
  },
  wizard: {
    title: "Aether Reader",
    accent: "#8cc9ff",
    sprite: {
      src: CHARACTER_SHEET_PATH,
      width: 16,
      height: 16,
      x: 16,
      y: 0,
      sheetWidth: 112,
      sheetHeight: 64
    }
  }
};

const TITLE_PARTY = [
  { label: "Fighter", sprite: CLASS_ART.fighter.sprite, accent: CLASS_ART.fighter.accent },
  { label: "Wizard", sprite: CLASS_ART.wizard.sprite, accent: CLASS_ART.wizard.accent },
  { label: "Rogue", sprite: CLASS_ART.rogue.sprite, accent: CLASS_ART.rogue.accent }
];

const TITLE_THREATS = [
  {
    label: "Wisp",
    accent: "#8cc9ff",
    sprite: {
      src: CHARACTER_SHEET_PATH,
      width: 16,
      height: 16,
      x: 16,
      y: 16,
      sheetWidth: 112,
      sheetHeight: 64
    }
  },
  {
    label: "Ghoul",
    accent: "#b2bb94",
    sprite: {
      src: CHARACTER_SHEET_PATH,
      width: 16,
      height: 16,
      x: 32,
      y: 16,
      sheetWidth: 112,
      sheetHeight: 64
    }
  },
  {
    label: "Skeleton",
    accent: "#d5c7a8",
    sprite: {
      src: CHARACTER_SHEET_PATH,
      width: 16,
      height: 16,
      x: 80,
      y: 16,
      sheetWidth: 112,
      sheetHeight: 64
    }
  }
];

const TITLE_FEATURES = [
  {
    kicker: "1. Start In Town",
    copy: "Open services if you need them, then walk north on the main road to the keep stairs."
  },
  {
    kicker: "2. Enter The Keep",
    copy: "The first floor reveals a marked route segment on entry. Survey early and stay on the clean line."
  },
  {
    kicker: "3. Clear The Floor",
    copy: "Orange marks the floor objective. Resolve it before the deeper stairs unlock."
  },
  {
    kicker: "4. Extract Or Greed",
    copy: "Once the objective is done, decide whether to cash out in town or stay for one more risky reward."
  }
];

function styleMap(entries) {
  return entries.join("; ");
}

function renderPixelSprite(sprite, className = "", scale = 4) {
  const baseRules = [
    `background-image:url('${sprite.src}')`,
    `--frame-width:${sprite.width}px`,
    `--frame-height:${sprite.height}px`,
    `--pixel-scale:${scale}`
  ];
  if (sprite.sheetWidth && sprite.sheetHeight) {
    baseRules.push(
      `--sheet-width:${sprite.sheetWidth}px`,
      `--sheet-height:${sprite.sheetHeight}px`,
      `--frame-x:${sprite.x || 0}px`,
      `--frame-y:${sprite.y || 0}px`
    );
  }
  return `<span class="pixel-sprite${className ? ` ${className}` : ""}" style="${styleMap(baseRules)}" aria-hidden="true"></span>`;
}

function renderSpriteChip(entry, tone = "warm") {
  return `
    <div class="sprite-chip tone-${tone}" style="${styleMap([`--chip-accent:${entry.accent}`])}">
      <div class="sprite-chip-frame">
        ${renderPixelSprite(entry.sprite, "sprite-chip-sprite", 3)}
      </div>
      <span class="sprite-chip-label">${escapeHtml(entry.label)}</span>
    </div>
  `;
}

function buildChoiceArtMarkup(type, entry) {
  const art = type === "race" ? getRaceArt(entry.id) : getClassArt(entry.id);
  const tone = type === "race" ? art.accent : art.accent;
  const sprite = type === "race" ? art.sprite : art.sprite;
  return {
    artHtml: `
      <div class="choice-art-frame" style="${styleMap([`--choice-accent:${tone}`])}">
        ${renderPixelSprite(sprite, "choice-art-sprite", 3)}
      </div>
    `,
    metaHtml: `<span class="choice-chip">${escapeHtml(art.title)}</span>`
  };
}

function getRaceName(raceRef) {
  const race = RACES.find((entry) => entry.id === resolveRaceId(raceRef));
  return race ? race.name : RACES[0].name;
}

function getClassName(classRef) {
  const role = CLASSES.find((entry) => entry.id === resolveClassId(classRef));
  return role ? role.name : CLASSES[0].name;
}

function getIdentityAccent(raceRef, classRef) {
  const raceArt = getRaceArt(raceRef);
  const classArt = getClassArt(classRef);
  return {
    outer: classArt.accent,
    inner: raceArt.accent
  };
}

export function resolveRaceId(raceRef) {
  const direct = RACES.find((entry) => entry.id === raceRef);
  if (direct) {
    return direct.id;
  }
  const byName = RACES.find((entry) => entry.name === raceRef);
  return byName ? byName.id : RACES[0].id;
}

export function resolveClassId(classRef) {
  const direct = CLASSES.find((entry) => entry.id === classRef);
  if (direct) {
    return direct.id;
  }
  const byName = CLASSES.find((entry) => entry.name === classRef);
  return byName ? byName.id : CLASSES[0].id;
}

export function getRaceArt(raceRef) {
  return RACE_ART[resolveRaceId(raceRef)] || RACE_ART.human;
}

export function getClassArt(classRef) {
  return CLASS_ART[resolveClassId(classRef)] || CLASS_ART.fighter;
}

export function buildAdventurerIdentityMarkup(options) {
  const raceId = resolveRaceId(options.raceId);
  const classId = resolveClassId(options.classId);
  const raceArt = getRaceArt(raceId);
  const classArt = getClassArt(classId);
  const accents = getIdentityAccent(raceId, classId);
  const compact = Boolean(options.compact);
  const name = options.name || "Unnamed";
  const eyebrow = options.eyebrow || "Adventurer";
  const summary = options.summary || "";
  const detail = options.detail || "";
  const statsMarkup = options.statsMarkup || "";
  const tags = options.tags || [getRaceName(raceId), getClassName(classId), classArt.title];

  return `
    <section class="adventurer-card${compact ? " compact" : ""}" style="${styleMap([`--adventurer-accent:${accents.outer}`, `--adventurer-accent-soft:${accents.inner}`])}">
      <div class="adventurer-card-copy">
        <div class="adventurer-card-kicker">${escapeHtml(eyebrow)}</div>
        <div class="adventurer-card-name">${escapeHtml(name)}</div>
        <div class="adventurer-card-tags">
          ${tags.map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("")}
        </div>
        ${summary ? `<div class="adventurer-card-summary">${escapeHtml(summary)}</div>` : ""}
        ${detail ? `<div class="adventurer-card-detail">${escapeHtml(detail)}</div>` : ""}
      </div>
      <div class="adventurer-card-stage">
        <div class="adventurer-portrait-frame">
          ${renderPixelSprite(classArt.sprite, "adventurer-main-sprite", compact ? 5 : 6)}
          <div class="adventurer-race-seal">
            ${renderPixelSprite(raceArt.sprite, "adventurer-race-sprite", compact ? 2 : 3)}
            <span>${escapeHtml(raceArt.title)}</span>
          </div>
        </div>
      </div>
      ${statsMarkup}
    </section>
  `;
}

function buildTitleLineup(entries, tone) {
  return entries.map((entry) => renderSpriteChip(entry, tone)).join("");
}

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
  game.recordTelemetry?.("modal_opened", { surface: "title" });
  const template = document.getElementById("title-template");
  const fragment = template.content.cloneNode(true);
  const saveSummary = fragment.getElementById("title-save-summary");
  const loadButton = fragment.getElementById("title-load-button");
  const partyLineup = fragment.getElementById("title-party-lineup");
  const threatLineup = fragment.getElementById("title-threat-lineup");
  const featureList = fragment.getElementById("title-feature-list");
  const savedMeta = game.getSavedRunMeta();
  const latestSummary = typeof game.getLatestPersistenceSummary === "function" ? game.getLatestPersistenceSummary() : null;
  const activeContract = typeof game.getActiveContract === "function" ? game.getActiveContract(false) : null;
  const masteryClassId = savedMeta?.classId || latestSummary?.classId || game.selectedClass;
  const masterySummary = typeof game.getClassMasterySummary === "function"
    ? game.getClassMasterySummary(masteryClassId)
    : "No mastery track.";

  if (partyLineup) {
    partyLineup.innerHTML = buildTitleLineup(TITLE_PARTY, "warm");
  }
  if (threatLineup) {
    threatLineup.innerHTML = buildTitleLineup(TITLE_THREATS, "cool");
  }
  if (featureList) {
    featureList.innerHTML = TITLE_FEATURES.map((entry) => `
      <article class="title-feature-card">
        <div class="title-feature-kicker">${escapeHtml(entry.kicker)}</div>
        <div class="title-feature-copy">${escapeHtml(entry.copy)}</div>
      </article>
    `).join("");
  }

  if (savedMeta) {
    const savedTime = savedMeta.savedAt ? game.formatSaveStamp(savedMeta.savedAt) : null;
    saveSummary.innerHTML = `
      <div class="title-save-label">Continue Run</div>
      <div class="title-save-name">${escapeHtml(savedMeta.name)}</div>
      <div class="title-save-meta">Level ${savedMeta.level} &middot; Depth ${savedMeta.depth}${savedMeta.className ? ` &middot; ${escapeHtml(savedMeta.className)}` : ""}</div>
      ${savedTime ? `<div class="title-save-meta">${escapeHtml(savedTime)}</div>` : ""}
      <div class="title-save-meta">${escapeHtml(activeContract ? `Town Persistence: ${activeContract.name} armed` : "Town Persistence: No contract armed")}</div>
      <div class="title-save-meta">${escapeHtml(`Mastery: ${masterySummary}`)}</div>
      <div class="title-save-meta">${escapeHtml(latestSummary ? `Last return: ${latestSummary.outcome} on depth ${latestSummary.extractedDepth}, ${latestSummary.returnValue} gp value.` : "Last return: none recorded yet.")}</div>
    `;
  } else {
    saveSummary.innerHTML = `
      <div class="title-save-label">No Saved Run</div>
      <div class="title-save-name">No saved run</div>
      <div class="title-save-meta">Start a fresh descent and your latest browser save will appear here.</div>
      <div class="title-save-meta">${escapeHtml(activeContract ? `Town Persistence: ${activeContract.name} armed` : "Town Persistence: No contract armed")}</div>
      <div class="title-save-meta">${escapeHtml(`Mastery: ${masterySummary}`)}</div>
      <div class="title-save-meta">${escapeHtml(latestSummary ? `Last return: ${latestSummary.outcome} on depth ${latestSummary.extractedDepth}, ${latestSummary.returnValue} gp value.` : "Last return: none recorded yet.")}</div>
    `;
    loadButton.disabled = true;
  }

  game.modalRoot.innerHTML = "";
  game.modalRoot.appendChild(fragment);
  game.modalRoot.classList.remove("hidden");
  game.refreshChrome();
  game.focusFirstUiElement?.();
}

export function showCreationModal(game, options = {}) {
  const { focusTarget = null } = options;
  game.mode = "creation";
  game.setModalVisibility(true);
  game.recordTelemetry?.("modal_opened", { surface: "creation" });
  const template = document.getElementById("creation-template");
  const fragment = template.content.cloneNode(true);
  const nameInput = fragment.getElementById("hero-name");
  const raceChoice = fragment.getElementById("race-choice");
  const classChoice = fragment.getElementById("class-choice");
  const statPoints = fragment.getElementById("creation-stat-points");
  const statAllocation = fragment.getElementById("creation-stat-allocation");
  const preview = fragment.getElementById("creation-preview");

  nameInput.value = game.creationName;
  RACES.forEach((race) => {
    const art = buildChoiceArtMarkup("race", race);
    const element = choiceCard(race, "race", race.id === game.selectedRace, art);
    element.dataset.focusKey = `creation:race:${race.id}`;
    raceChoice.appendChild(element);
  });
  CLASSES.forEach((role) => {
    const art = buildChoiceArtMarkup("class", role);
    const element = choiceCard(role, "class", role.id === game.selectedClass, art);
    element.dataset.focusKey = `creation:class:${role.id}`;
    classChoice.appendChild(element);
  });

  const race = getRace(game.selectedRace);
  const role = getClass(game.selectedClass);
  const stats = game.getCreationStats();
  const persistencePreview = typeof game.getCreationPersistencePreview === "function"
    ? game.getCreationPersistencePreview(role.id)
    : {
        activeContract: null,
        mastery: { summary: "No mastery track." },
        startingBonuses: []
      };
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
    ${buildAdventurerIdentityMarkup({
      name: game.creationName || "Morgan",
      raceId: race.id,
      classId: role.id,
      eyebrow: "Pack Preview",
      summary: `${race.summary} ${role.summary}`,
      detail: `${getRaceArt(race.id).title} ancestry with ${getClassArt(role.id).title.toLowerCase()} discipline.`
    })}
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
    <div class="section-block">
      <div class="field-label">Town Persistence</div>
      <div class="text-block">
        ${escapeHtml(persistencePreview.activeContract ? `Active contract: ${persistencePreview.activeContract.name}. Town Persistence, opt-in, next run only.` : "No contract armed. Contracts stay opt-in at the bank and apply to the next run only.")}<br><br>
        ${escapeHtml(`Mastery: ${persistencePreview.mastery.summary}`)}<br><br>
        ${escapeHtml(persistencePreview.startingBonuses.length > 0
          ? `Starting bonuses on this run: ${persistencePreview.startingBonuses.join(", ")}.`
          : "Starting bonuses on this run: none yet.")}
      </div>
    </div>
  `;

  game.modalRoot.innerHTML = "";
  game.modalRoot.appendChild(fragment);
  game.modalRoot.classList.remove("hidden");
  game.refreshChrome();
  const statButtons = game.modalRoot.querySelectorAll(".creation-stat-button");
  statButtons.forEach((button) => {
    const stat = button.dataset.stat || "str";
    const delta = button.dataset.delta === "-1" ? "down" : "up";
    button.dataset.focusKey = `creation:stat:${stat}:${delta}`;
  });
  const focusElement = focusTarget ? game.findUiElementByFocusKey?.(focusTarget) : null;
  if (focusElement) {
    game.focusUiElement?.(focusElement);
    return;
  }
  game.focusFirstUiElement?.();
}
