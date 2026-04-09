/**
 * @module spell-manager
 * @owns Spell tray management, spell targeting, spell casting preparation,
 *       spell metadata queries, learnable spell selection
 * @reads game.player.spellsKnown, game.player.spellTrayIds, game.pendingSpell,
 *        game.targetMode, game.mode, game.currentLevel, SPELLS
 * @mutates game.player.spellTrayIds, game.pendingSpell, game.spellTrayOpen,
 *          game.targetMode, game.mode, game.player.mana, game.player.constitutionLoss
 * @emits game.log, game.render, game.refreshChrome, game.emitCastCircle
 */

import { SPELLS } from "../data/content.js";
import { actorAt, hasLineOfSight, inBounds } from "../core/world.js";
import { clamp, distance } from "../core/utils.js";
import { findInitialTargetCursor } from "../core/world.js";
import { getSpellCost, getOvercastLoss } from "./builds.js";
import { getSpellCategoryDefs, getSpellCategoryKey } from "./inventory-ui.js";

const SPELL_TRAY_LIMIT = 8;

// --- pure queries ---

export function getSpellTrayLimit() {
  return SPELL_TRAY_LIMIT;
}

export function getSpellTargetingMode(spell) {
  if (!spell) return "single";
  if (spell.targetingMode) return spell.targetingMode;
  return spell.target === "self" ? "self" : "single";
}

export function getSpellRoleLabel(spell) {
  if (!spell) return "spell";
  if (spell.roleLabel) return spell.roleLabel;
  if (getSpellTargetingMode(spell) === "self") return "utility";
  return spell.school || "spell";
}

export function getSpellTargetingLabel(spell) {
  switch (getSpellTargetingMode(spell)) {
    case "self":
      return "Self";
    case "blast":
      return `Blast ${((spell?.blastRadius || 0) * 2) + 1}x${((spell?.blastRadius || 0) * 2) + 1}`;
    default:
      return `Single · Range ${spell?.range || 1}`;
  }
}

export function getSpellProjectileStyle(spell) {
  if (!spell) return "arcane";
  return spell.projectileStyle || (spell.school === "elemental" ? "elemental" : "arcane");
}

export function getDamageEffectColor(damageType, defender) {
  if (damageType === "magic") return "#d8bcff";
  if (damageType === "fire") return "#ffb16f";
  if (damageType === "cold") return "#9ad7ff";
  if (damageType === "poison") return "#97d67f";
  return defender && defender.id === "player" ? "#ff8d73" : "#f2deb1";
}

// --- tray management ---

export function syncSpellTray(game, player = game.player) {
  if (!player) return [];
  player.spellsKnown = Array.isArray(player.spellsKnown)
    ? [...new Set(player.spellsKnown.filter((id) => Boolean(SPELLS[id])))]
    : [];
  const hasSavedTray = Array.isArray(player.spellTrayIds);
  const tray = hasSavedTray
    ? [...new Set(player.spellTrayIds.filter((id) => player.spellsKnown.includes(id)))]
    : [];
  if ((!hasSavedTray || tray.length === 0) && player.spellsKnown.length > 0) {
    tray.push(...player.spellsKnown.slice(0, SPELL_TRAY_LIMIT));
  }
  player.spellTrayIds = tray.slice(0, SPELL_TRAY_LIMIT);
  if (player === game.player) {
    if (game.pendingSpell && !player.spellsKnown.includes(game.pendingSpell)) {
      game.pendingSpell = null;
    }
    if (!game.pendingSpell) {
      game.pendingSpell = player.spellTrayIds[0] || player.spellsKnown[0] || null;
    }
  }
  return [...player.spellTrayIds];
}

export function getPinnedSpellIds(game, player = game.player) {
  return syncSpellTray(game, player);
}

export function addSpellToTrayIfSpace(game, player, spellId) {
  const tray = getPinnedSpellIds(game, player);
  if (tray.includes(spellId) || tray.length >= SPELL_TRAY_LIMIT) return false;
  player.spellTrayIds = [...tray, spellId];
  if (!game.pendingSpell) game.pendingSpell = spellId;
  return true;
}

export function pinSpellToTray(game, spellId) {
  if (!game.player || !SPELLS[spellId] || !game.player.spellsKnown.includes(spellId)) return false;
  const tray = getPinnedSpellIds(game);
  if (tray.includes(spellId)) return true;
  if (tray.length >= SPELL_TRAY_LIMIT) {
    game.log("Spell tray is full. Remove one before pinning another.", "warning");
    return false;
  }
  game.player.spellTrayIds = [...tray, spellId];
  game.pendingSpell = spellId;
  return true;
}

export function unpinSpellFromTray(game, spellId) {
  if (!game.player) return false;
  const tray = getPinnedSpellIds(game);
  if (!tray.includes(spellId)) return false;
  game.player.spellTrayIds = tray.filter((id) => id !== spellId);
  if (game.pendingSpell === spellId) {
    game.pendingSpell = game.player.spellTrayIds[0] || game.player.spellsKnown[0] || null;
  }
  return true;
}

export function moveTraySpell(game, spellId, direction = 0) {
  if (!game.player || !direction) return false;
  const tray = getPinnedSpellIds(game);
  const index = tray.indexOf(spellId);
  if (index < 0) return false;
  const nextIndex = clamp(index + direction, 0, tray.length - 1);
  if (nextIndex === index) return false;
  const reordered = [...tray];
  const [entry] = reordered.splice(index, 1);
  reordered.splice(nextIndex, 0, entry);
  game.player.spellTrayIds = reordered;
  return true;
}

export function selectSpell(game, spellId, options = {}) {
  if (!game.player || !SPELLS[spellId] || !game.player.spellsKnown.includes(spellId)) return false;
  const { openTray = false, focusTarget = null } = options;
  if (game.mode === "target" && game.targetMode?.type === "spell" && game.targetMode.spellId !== spellId) {
    game.cancelTargetMode({ silent: true, keepTrayOpen: true });
  }
  game.pendingSpell = spellId;
  if (openTray) game.spellTrayOpen = true;
  if (openTray && game.mode !== "modal") {
    game.refreshChrome();
    return true;
  }
  game.refreshMagicHub(focusTarget);
  return true;
}

export function getSpellTraySelectionId(game) {
  const pinned = getPinnedSpellIds(game);
  if (game.targetMode?.type === "spell" && game.targetMode.spellId) return game.targetMode.spellId;
  if (game.pendingSpell && pinned.includes(game.pendingSpell)) return game.pendingSpell;
  return pinned[0] || null;
}

export function getSortedKnownSpellIds(game, filterKey = "all") {
  if (!game.player?.spellsKnown) return [];
  return game.player.spellsKnown
    .filter((id) => SPELLS[id])
    .filter((id) => filterKey === "all" || getSpellCategoryKey(SPELLS[id]) === filterKey)
    .sort((a, b) => {
      const sa = SPELLS[a];
      const sb = SPELLS[b];
      const catA = getSpellCategoryKey(sa) || "";
      const catB = getSpellCategoryKey(sb) || "";
      if (catA !== catB) return catA.localeCompare(catB);
      return (sa.cost || 0) - (sb.cost || 0);
    });
}

export function getLearnableSpellOptions(game) {
  const affinity = game.player?.className === "Fighter" ? "fighter"
    : game.player?.className === "Rogue" ? "rogue" : "wizard";
  return Object.values(SPELLS)
    .filter((spell) => (spell.learnLevel || 1) <= game.player.level && !game.player.spellsKnown.includes(spell.id))
    .sort((a, b) => {
      const afA = a.classAffinity === affinity ? 2 : a.classAffinity === "shared" ? 1 : 0;
      const afB = b.classAffinity === affinity ? 2 : b.classAffinity === "shared" ? 1 : 0;
      if (afA !== afB) return afB - afA;
      const ld = (a.learnLevel || 1) - (b.learnLevel || 1);
      return ld !== 0 ? ld : a.cost - b.cost;
    });
}

// --- spell target preview ---

export function resolveSpellTargetPreview(game, spellOrId, point = null) {
  const spell = typeof spellOrId === "string" ? SPELLS[spellOrId] : spellOrId;
  const targetingMode = getSpellTargetingMode(spell);
  const center = point
    ? { x: point.x, y: point.y }
    : game.targetMode?.cursor
      ? { x: game.targetMode.cursor.x, y: game.targetMode.cursor.y }
      : null;
  const preview = {
    spell, targetingMode, center, tiles: [], actors: [],
    targetActor: null, hitCount: 0,
    withinRange: targetingMode === "self",
    los: targetingMode === "self",
    valid: targetingMode === "self",
    reason: ""
  };
  if (!spell || !game.player || !game.currentLevel) {
    preview.valid = false;
    preview.reason = "No spell target is available.";
    return preview;
  }
  if (targetingMode === "self") {
    preview.valid = true;
    return preview;
  }
  if (!center || !inBounds(game.currentLevel, center.x, center.y)) {
    preview.valid = false;
    preview.reason = "Move the cursor onto the board.";
    return preview;
  }
  preview.withinRange = distance(game.player, center) <= (spell.range || 8);
  preview.los = hasLineOfSight(game.currentLevel, game.player.x, game.player.y, center.x, center.y);

  if (targetingMode === "blast") {
    const radius = Math.max(0, spell.blastRadius || 1);
    for (let y = center.y - radius; y <= center.y + radius; y++) {
      for (let x = center.x - radius; x <= center.x + radius; x++) {
        if (inBounds(game.currentLevel, x, y)) preview.tiles.push({ x, y });
      }
    }
    preview.actors = game.currentLevel.actors.filter((a) =>
      a.hp > 0 && preview.tiles.some((t) => t.x === a.x && t.y === a.y)
    );
    preview.hitCount = preview.actors.length;
    preview.valid = preview.withinRange && preview.los && preview.hitCount > 0;
    if (!preview.withinRange) preview.reason = `${spell.name} is out of range.`;
    else if (!preview.los) preview.reason = "The blast point is out of line of sight.";
    else if (preview.hitCount <= 0) preview.reason = "No enemy stands in the blast.";
    return preview;
  }

  preview.targetActor = actorAt(game.currentLevel, center.x, center.y);
  preview.actors = preview.targetActor ? [preview.targetActor] : [];
  preview.hitCount = preview.actors.length;
  preview.valid = preview.withinRange && preview.los && Boolean(preview.targetActor);
  if (!preview.withinRange) preview.reason = `${spell.name} is out of range.`;
  else if (!preview.los) preview.reason = "That target is out of line of sight.";
  else if (!preview.targetActor) preview.reason = "No target stands on that square.";
  return preview;
}

export function getActiveSpellTargetPreview(game) {
  if (!game.targetMode?.spellId) return null;
  return resolveSpellTargetPreview(game, game.targetMode.spellId, game.targetMode.cursor);
}

// --- targeting mode ---

export function startTargetMode(game, options) {
  game.setModalVisibility(false);
  game.modalRoot.classList.add("hidden");
  game.modalRoot.innerHTML = "";
  game.pendingSpell = options.spellId || game.pendingSpell || null;
  if (options.type === "spell") game.spellTrayOpen = true;
  game.targetMode = {
    type: options.type,
    name: options.name,
    range: options.range || 8,
    allowFloor: options.allowFloor || false,
    spellId: options.spellId || "",
    targetingMode: options.targetingMode || "single",
    manaCost: options.manaCost || 0,
    overcast: Boolean(options.overcast),
    previewColor: options.previewColor || options.effectColor || "#ffd36b",
    effectColor: options.effectColor || "#ffd36b",
    projectileStyle: options.projectileStyle || "arcane",
    roleLabel: options.roleLabel || "spell",
    invalidReason: "",
    callback: options.callback,
    cursor: options.cursor || findInitialTargetCursor(game, options.range || 8)
  };
  const preview = getActiveSpellTargetPreview(game);
  if (preview) game.targetMode.invalidReason = preview.reason || "";
  game.mode = "target";
  game.log(`Set ${options.name}. Confirm to cast, cancel to abort.`, "warning");
  game.refreshChrome();
  game.render();
}

export function moveTargetCursor(game, dx, dy) {
  if (!game.targetMode) return;
  game.targetMode.cursor.x = clamp(game.targetMode.cursor.x + dx, 0, game.currentLevel.width - 1);
  game.targetMode.cursor.y = clamp(game.targetMode.cursor.y + dy, 0, game.currentLevel.height - 1);
  const preview = getActiveSpellTargetPreview(game);
  if (preview) game.targetMode.invalidReason = preview.reason || "";
  game.render();
}

export function confirmTargetSelection(game) {
  if (!game.targetMode) return;
  const cursor = { x: game.targetMode.cursor.x, y: game.targetMode.cursor.y };
  const spellPreview = getActiveSpellTargetPreview(game);
  if (game.targetMode.type === "spell" && spellPreview) {
    if (!spellPreview.valid) {
      game.targetMode.invalidReason = spellPreview.reason || "That cast is not ready.";
      game.render();
      return;
    }
    const callback = game.targetMode.callback;
    const targetActor = spellPreview.targetActor || actorAt(game.currentLevel, cursor.x, cursor.y);
    game.targetMode = null;
    game.mode = "game";
    game.setModalVisibility(false);
    game.refreshChrome();
    game.renderBoard();
    callback(targetActor, cursor, spellPreview);
    game.render();
    return;
  }
  const range = game.targetMode.range;
  const targetActor = actorAt(game.currentLevel, cursor.x, cursor.y);
  const withinRange = distance(game.player, cursor) <= range;
  const los = hasLineOfSight(game.currentLevel, game.player.x, game.player.y, cursor.x, cursor.y);
  if (!withinRange || !los) {
    game.log("That target is out of line or out of range.", "warning");
    return;
  }
  if (!game.targetMode.allowFloor && !targetActor) {
    game.log("No target stands on that square.", "warning");
    return;
  }
  const callback = game.targetMode.callback;
  game.targetMode = null;
  game.mode = "game";
  game.setModalVisibility(false);
  game.refreshChrome();
  game.renderBoard();
  callback(targetActor, cursor);
  game.render();
}

export function cancelTargetMode(game, options = {}) {
  if (!game.targetMode) return;
  const { silent = false, keepTrayOpen = false } = options;
  game.targetMode = null;
  game.mode = "game";
  game.setModalVisibility(false);
  if (!silent) game.log("Targeting cancelled.", "warning");
  if (keepTrayOpen) game.spellTrayOpen = true;
  game.refreshChrome();
  game.render();
}

// --- spell casting preparation ---

export function prepareSpell(game, spellId) {
  const spell = SPELLS[spellId];
  if (!spell) return;
  game.pendingSpell = spellId;
  game.spellTrayOpen = true;
  const spellCost = getSpellCost(game, spell);
  const overcast = game.player.mana < spellCost;
  if (game.player.mana < spellCost) {
    const shortage = Math.max(0, getOvercastLoss(game, spellCost - game.player.mana) - game.getOvercastRelief());
    if (game.player.stats.con - (game.player.constitutionLoss || 0) <= shortage) {
      game.log("You lack the strength to overcast that spell safely.", "warning");
      return;
    }
    game.player.constitutionLoss += shortage;
    game.player.mana = 0;
    game.recalculateDerivedStats();
    game.log(`You overcast ${spell.name} and lose ${shortage} Constitution.`, "bad");
  } else {
    game.player.mana -= spellCost;
  }
  if (spell.target === "self") {
    game.emitCastCircle(game.player.x, game.player.y, spell.effectColor || "#ffca73");
    game.emitCastFlare(game.player.x, game.player.y, spell.effectColor || "#ffca73", getSpellProjectileStyle(spell));
    if (spell.cast(game, game.player)) {
      game.recordTelemetry("spell_cast", { spellId, overcast });
      game.audio.play("cast");
      game.spellTrayOpen = false;
      if (spell.id === "runeOfReturn") {
        game.render();
        return;
      }
      game.closeModal();
      game.endTurn();
    }
    return;
  }
  startTargetMode(game, {
    type: "spell",
    name: spell.name,
    range: spell.range || 8,
    allowFloor: Boolean(spell.allowFloorTarget),
    spellId,
    targetingMode: getSpellTargetingMode(spell),
    manaCost: spellCost,
    overcast,
    previewColor: spell.previewColor || spell.effectColor || "#ffca73",
    effectColor: spell.effectColor || "#ffca73",
    projectileStyle: getSpellProjectileStyle(spell),
    roleLabel: getSpellRoleLabel(spell),
    callback: (target, cursor, preview = null) => {
      game.emitCastCircle(game.player.x, game.player.y, spell.effectColor || "#ffca73");
      game.emitCastFlare(game.player.x, game.player.y, spell.effectColor || "#ffca73", getSpellProjectileStyle(spell));
      if (target || spell.allowFloorTarget) {
        const projectileTarget = preview?.center || cursor;
        game.playProjectile(game.player, projectileTarget, spell.effectColor || "#ffca73", {
          style: getSpellProjectileStyle(spell)
        });
      }
      spell.cast(game, game.player, target || cursor, preview);
      game.recordTelemetry("spell_cast", {
        spellId,
        overcast,
        targetId: target?.id || "",
        hitCount: preview?.hitCount || (target ? 1 : 0)
      });
      game.audio.play("cast");
      game.spellTrayOpen = false;
      game.closeModal();
      game.endTurn();
    }
  });
}

// --- spell tray open/close ---

export function openSpellTray(game) {
  if (!game.player || game.mode === "title" || game.mode === "creation" || game.mode === "levelup") return false;
  const pinned = getPinnedSpellIds(game);
  if (game.player.spellsKnown.length <= 0) {
    game.log("No spells are known.", "warning");
    game.render();
    return false;
  }
  if (pinned.length <= 0) {
    game.log("No spells are pinned to the tray. Open the Book to add one.", "warning");
    game.render();
    return false;
  }
  if (game.mode !== "target" && game.spellTrayOpen) {
    closeSpellTray(game);
    return false;
  }
  game.spellTrayOpen = true;
  game.pendingSpell = game.pendingSpell && game.player.spellsKnown.includes(game.pendingSpell)
    ? game.pendingSpell
    : pinned[0];
  game.refreshChrome();
  game.render();
  return true;
}

export function closeSpellTray(game) {
  game.spellTrayOpen = false;
  if (game.mode === "target" && game.targetMode?.type === "spell") {
    cancelTargetMode(game);
    return;
  }
  game.refreshChrome();
  game.render();
}

// --- filter helpers ---

export function getSpellFilterDefs() {
  return [
    { key: "all", label: "All" },
    ...getSpellCategoryDefs().map((entry) => ({ key: entry.key, label: entry.label }))
  ];
}

export function getSpellFilterDefsForEntries(entries = []) {
  const keys = new Set(entries.map((entry) => getSpellCategoryKey(entry)).filter(Boolean));
  return [
    { key: "all", label: "All" },
    ...getSpellCategoryDefs()
      .filter((entry) => keys.has(entry.key))
      .map((entry) => ({ key: entry.key, label: entry.label }))
  ];
}
