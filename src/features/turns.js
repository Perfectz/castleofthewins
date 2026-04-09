/**
 * @module turns
 * @owns Turn advancement, wait, rest, sleep, passive recovery, status effect countdown
 * @reads game.player, game.currentLevel, game.mode, game.currentDepth
 * @mutates game.turn, game.player.hp, game.player.mana, game.player status effect counters
 * @emits effects (logs, sounds, render)
 */

import { createEffects, addLog, addSound, requestRender } from "../core/effect-bus.js";
import { onPlayerWait } from "./builds.js";
import { advanceDangerTurn } from "./director.js";

export function performWait(game) {
  const fx = createEffects();
  if (!game.player || game.mode !== "game" || game.player.hp <= 0) {
    return fx;
  }
  game.recordTelemetry?.("wait_used");
  addLog(fx, `${game.player.name} waits.`, "warning");
  addSound(fx, "ui");
  onPlayerWait(game);
  game.makeNoise(3, game.player, "wait");
  game.endTurn();
  return fx;
}

export function restUntilSafe(game) {
  const fx = createEffects();
  if (!game.player || game.mode !== "game" || game.player.hp <= 0) {
    return fx;
  }
  game.recordTelemetry?.("rest_used", { kind: "rest" });
  let recovered = 0;
  let interrupted = false;
  onPlayerWait(game);
  for (let i = 0; i < 6; i += 1) {
    if (game.visibleEnemies().length > 0 || game.player.hp >= game.player.maxHp) {
      break;
    }
    if (game.makeNoise(4, game.player, "rest") > 0) {
      interrupted = true;
      break;
    }
    game.player.hp = Math.min(game.player.maxHp, game.player.hp + 1);
    game.player.mana = Math.min(game.player.maxMana, game.player.mana + 1);
    recovered += 1;
    game.endTurn(false);
  }
  addLog(fx,
    interrupted
      ? "You try to rest, but the halls answer back."
      : recovered > 0
        ? "You pause to recover your breath."
        : "You find no safe moment to rest.",
    interrupted ? "bad" : recovered > 0 ? "good" : "warning"
  );
  requestRender(fx);
  return fx;
}

export function sleepUntilRestored(game) {
  const fx = createEffects();
  if (!game.player || game.mode !== "game" || game.player.hp <= 0) {
    return fx;
  }
  game.recordTelemetry?.("rest_used", { kind: "sleep" });
  if (game.player.hp >= game.player.maxHp && game.player.mana >= game.player.maxMana) {
    addLog(fx, "You are already fully restored.", "warning");
    requestRender(fx);
    return fx;
  }
  if (game.visibleEnemies().length > 0) {
    addLog(fx, "You cannot sleep with an enemy in sight.", "warning");
    requestRender(fx);
    return fx;
  }

  let recovered = 0;
  let interrupted = false;
  const maxCycles = Math.max(
    8,
    Math.ceil(Math.max(game.player.maxHp - game.player.hp, game.player.maxMana - game.player.mana)) + 6
  );

  onPlayerWait(game);
  for (let i = 0; i < maxCycles; i += 1) {
    if (game.visibleEnemies().length > 0) {
      interrupted = true;
      break;
    }
    if (game.player.hp >= game.player.maxHp && game.player.mana >= game.player.maxMana) {
      break;
    }
    if (game.makeNoise(4, game.player, "rest") > 0) {
      interrupted = true;
      break;
    }
    game.player.hp = Math.min(game.player.maxHp, game.player.hp + 1);
    game.player.mana = Math.min(game.player.maxMana, game.player.mana + 1);
    recovered += 1;
    game.endTurn(false);
    if (game.mode !== "game") {
      break;
    }
    if (game.visibleEnemies().length > 0) {
      interrupted = true;
      break;
    }
  }

  addLog(fx,
    interrupted
      ? "You wake as danger steps into view."
      : recovered > 0
        ? "You sleep until your strength returns."
        : "You cannot find a safe moment to sleep.",
    interrupted ? "warning" : recovered > 0 ? "good" : "warning"
  );
  requestRender(fx);
  return fx;
}

const TIMED_EFFECTS = ["slowed", "held", "lightBuffTurns", "arcaneWardTurns",
  "stoneSkinTurns", "resistFireTurns", "resistColdTurns", "guardBrokenTurns"];

export function resolveTurn(game, advanceTurn = true) {
  if (!game.player || game.player.hp <= 0) {
    return;
  }
  let monsterActions = 1;
  if (typeof advanceTurn === "object") {
    monsterActions = Math.max(0, Math.floor(advanceTurn.monsterActions ?? 1));
    advanceTurn = advanceTurn.advanceTurn ?? true;
  }
  if (advanceTurn) {
    game.turn += 1;
  }
  const encumbrance = game.getEncumbranceTier?.() ?? 0;
  const stats = game.getActorStats?.(game.player) ?? game.player.stats;
  const hpRegenBase = encumbrance >= 2 ? 0.01 : encumbrance === 1 ? 0.02 : 0.03;
  const manaRegenBase = encumbrance >= 2 ? 0.02 : encumbrance === 1 ? 0.04 : 0.06;
  const hpRegen = hpRegenBase + Math.max(0, stats.con - 10) * 0.004;
  const manaRegen = manaRegenBase + Math.max(0, stats.int - 10) * 0.006;
  game.player.hp = Math.min(game.player.maxHp, game.player.hp + hpRegen);
  game.player.mana = Math.min(game.player.maxMana, game.player.mana + manaRegen);
  advanceDangerTurn(game);
  for (let index = 0; index < monsterActions; index += 1) {
    game.processMonsters();
  }
  if (monsterActions > 0 && encumbrance >= 2 && game.currentDepth > 0) {
    game.processMonsters();
  }
  for (const key of TIMED_EFFECTS) {
    if ((game.player[key] || 0) > 0) game.player[key] -= 1;
  }
  if (game.recalculateDerivedStats) {
    game.recalculateDerivedStats();
  }
  if (game.syncTownCycle) {
    game.syncTownCycle(false, game.currentDepth === 0);
  }
  game.updateFov();
  game.updateMonsterIntents();
  game.checkQuestState();
  game.render();
}

export function endTurn(game, advanceTurn = true) {
  if (!game.player || game.player.hp <= 0) {
    return;
  }
  let options = {};
  if (typeof advanceTurn === "object") {
    options = advanceTurn;
    advanceTurn = advanceTurn.advanceTurn ?? true;
  }
  if ((game.hasPendingProgressionChoice && game.hasPendingProgressionChoice()) || game.pendingSpellChoices > 0) {
    game.pendingTurnResolution = { advanceTurn, ...options };
    if (!game.showNextProgressionModal || !game.showNextProgressionModal()) {
      game.render();
    }
    return;
  }
  game.resolveTurn({ advanceTurn, ...options });
}
