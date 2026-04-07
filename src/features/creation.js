import { CLASSES, RACES } from "../data/content.js";
import { CHARACTER_SHEET_PATH, PIXEL_ASSET_ROOT, TITLE_SCREEN_ASSETS } from "../data/assets.js";
import { getClass, getRace } from "../core/entities.js";
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
  game.modalSurfaceKey = "title";
  game.recordTelemetry?.("modal_opened", { surface: "title" });
  const template = document.getElementById("title-template");
  const fragment = template.content.cloneNode(true);
  const titleLoopImage = fragment.getElementById("title-loop-image");
  const saveSummary = fragment.getElementById("title-save-summary");
  const loadButton = fragment.getElementById("title-load-button");
  const savedMeta = game.getSavedRunMeta();
  const savedSlots = typeof game.getAllSavedRunMeta === "function" ? game.getAllSavedRunMeta() : [];
  const hasSavedRun = savedSlots.some((entry) => Boolean(entry.meta));

  if (titleLoopImage) {
    const prefersReducedMotion = Boolean(game.reducedMotionQuery?.matches);
    titleLoopImage.src = prefersReducedMotion ? TITLE_SCREEN_ASSETS.still : TITLE_SCREEN_ASSETS.loop;
    titleLoopImage.onerror = () => {
      titleLoopImage.onerror = null;
      titleLoopImage.src = TITLE_SCREEN_ASSETS.still;
    };
  }

  if (savedMeta && saveSummary) {
    saveSummary.classList.remove("hidden");
    saveSummary.innerHTML = `
      <button class="title-save-card" data-action="load-game" data-save-slot="${savedMeta.slotId}" data-focus-key="title:continue-card" type="button">
        <div class="title-save-label">Continue</div>
        <div class="title-save-name">${escapeHtml(savedMeta.name)}</div>
        <div class="title-save-meta">Depth ${savedMeta.depth} &middot; Level ${savedMeta.level}${savedMeta.className ? ` &middot; ${escapeHtml(savedMeta.className)}` : ""}</div>
      </button>
    `;
  } else if (hasSavedRun && saveSummary) {
    saveSummary.classList.remove("hidden");
    saveSummary.innerHTML = `
      <div class="title-save-label">Continue</div>
      <div class="title-save-name">Saved Run Available</div>
      <div class="title-save-meta">Choose a slot and return to the keep.</div>
    `;
  } else if (saveSummary) {
    saveSummary.innerHTML = "";
    saveSummary.classList.add("hidden");
  }
  loadButton.disabled = !hasSavedRun;

  game.modalRoot.innerHTML = "";
  game.modalRoot.appendChild(fragment);
  game.modalRoot.classList.remove("hidden");
  game.refreshChrome();
  game.syncMusicToggleUi?.();
  game.syncSurfaceMusic?.();
  const modal = game.modalRoot.querySelector(".title-screen");
  if (modal) {
    modal.scrollTop = 0;
  }
  if (game.layoutMode === "mobile" && modal) {
    modal.tabIndex = -1;
    modal.focus({ preventScroll: true });
    return;
  }
  game.focusFirstUiElement?.();
}

export function showCreationModal(game, options = {}) {
  const {
    focusTarget = null,
    preserveScroll = false
  } = options;
  game.mode = "creation";
  game.setModalVisibility(true);
  const previousState = preserveScroll ? game.captureModalRefreshState?.("creation") : null;
  game.recordTelemetry?.("modal_opened", { surface: "creation" });
  const template = document.getElementById("creation-template");
  const fragment = template.content.cloneNode(true);
  const nameInput = fragment.getElementById("hero-name");
  const raceChoice = fragment.getElementById("race-choice");
  const classChoice = fragment.getElementById("class-choice");
  const statPoints = fragment.getElementById("creation-stat-points");
  const statAllocation = fragment.getElementById("creation-stat-allocation");

  nameInput.value = game.creationName;
  RACES.forEach((race) => {
    const art = buildChoiceArtMarkup("race", race);
    const element = choiceCard(race, "race", race.id === game.selectedRace, {
      ...art,
      className: "choice-card-compact",
      noteText: race.summary
    });
    element.dataset.focusKey = `creation:race:${race.id}`;
    raceChoice.appendChild(element);
  });
  CLASSES.forEach((role) => {
    const art = buildChoiceArtMarkup("class", role);
    const element = choiceCard(role, "class", role.id === game.selectedClass, {
      ...art,
      className: "choice-card-compact",
      noteText: role.summary
    });
    element.dataset.focusKey = `creation:class:${role.id}`;
    classChoice.appendChild(element);
  });

  const stats = game.getCreationStats();
  const pointsRemaining = game.getCreationPointsRemaining();

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

  game.modalRoot.innerHTML = "";
  game.modalRoot.appendChild(fragment);
  game.modalRoot.classList.remove("hidden");
  game.modalSurfaceKey = "creation";
  game.refreshChrome();
  game.syncMusicToggleUi?.();
  game.syncSurfaceMusic?.();
  game.applyControllerNavigationMetadata?.();
  const nextModal = game.getModalElement?.();
  if (nextModal && previousState) {
    nextModal.scrollTop = previousState.scrollTop;
  }
  const statButtons = game.modalRoot.querySelectorAll(".creation-stat-button");
  statButtons.forEach((button) => {
    const stat = button.dataset.stat || "str";
    const delta = button.dataset.delta === "-1" ? "down" : "up";
    button.dataset.focusKey = `creation:stat:${stat}:${delta}`;
  });
  const focusElement = game.resolveModalFocusTarget?.(focusTarget, previousState)
    || (focusTarget ? game.findUiElementByFocusKey?.(focusTarget) : null);
  if (focusElement) {
    game.focusUiElement?.(focusElement);
    return;
  }
  game.focusFirstUiElement?.();
}
