import { getEncumbranceTier } from "../core/entities.js";
import { onPlayerWait } from "./builds.js";
import { advanceDangerTurn } from "./director.js";

export function performWait(game) {
  if (!game.player || game.mode !== "game" || game.player.hp <= 0) {
    return;
  }
  game.log(`${game.player.name} waits.`, "warning");
  game.audio.play("ui");
  onPlayerWait(game);
  game.makeNoise(3, game.player, "wait");
  game.endTurn();
}

export function restUntilSafe(game) {
  if (!game.player || game.mode !== "game" || game.player.hp <= 0) {
    return;
  }
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
  game.log(interrupted ? "You try to rest, but the halls answer back." : recovered > 0 ? "You pause to recover your breath." : "You find no safe moment to rest.", interrupted ? "bad" : recovered > 0 ? "good" : "warning");
  game.render();
}

export function sleepUntilRestored(game) {
  if (!game.player || game.mode !== "game" || game.player.hp <= 0) {
    return;
  }
  if (game.player.hp >= game.player.maxHp && game.player.mana >= game.player.maxMana) {
    game.log("You are already fully restored.", "warning");
    game.render();
    return;
  }
  if (game.visibleEnemies().length > 0) {
    game.log("You cannot sleep with an enemy in sight.", "warning");
    game.render();
    return;
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

  game.log(
    interrupted
      ? "You wake as danger steps into view."
      : recovered > 0
        ? "You sleep until your strength returns."
        : "You cannot find a safe moment to sleep.",
    interrupted ? "warning" : recovered > 0 ? "good" : "warning"
  );
  game.render();
}

export function resolveTurn(game, advanceTurn = true) {
  if (!game.player || game.player.hp <= 0) {
    return;
  }
  if (advanceTurn) {
    game.turn += 1;
  }
  const encumbrance = getEncumbranceTier(game.player);
  const hpRegenBase = encumbrance >= 2 ? 0.01 : encumbrance === 1 ? 0.02 : 0.03;
  const manaRegenBase = encumbrance >= 2 ? 0.02 : encumbrance === 1 ? 0.04 : 0.06;
  const hpRegen = hpRegenBase + Math.max(0, game.player.stats.con - 10) * 0.004;
  const manaRegen = manaRegenBase + Math.max(0, game.player.stats.int - 10) * 0.006;
  game.player.hp = Math.min(game.player.maxHp, game.player.hp + hpRegen);
  game.player.mana = Math.min(game.player.maxMana, game.player.mana + manaRegen);
  advanceDangerTurn(game);
  game.processMonsters();
  if (encumbrance >= 2 && game.currentDepth > 0) {
    game.processMonsters();
  }
  if ((game.player.slowed || 0) > 0) {
    game.player.slowed -= 1;
  }
  if ((game.player.held || 0) > 0) {
    game.player.held -= 1;
  }
  if ((game.player.lightBuffTurns || 0) > 0) {
    game.player.lightBuffTurns -= 1;
  }
  if ((game.player.arcaneWardTurns || 0) > 0) {
    game.player.arcaneWardTurns -= 1;
  }
  if ((game.player.stoneSkinTurns || 0) > 0) {
    game.player.stoneSkinTurns -= 1;
  }
  if ((game.player.resistFireTurns || 0) > 0) {
    game.player.resistFireTurns -= 1;
  }
  if ((game.player.resistColdTurns || 0) > 0) {
    game.player.resistColdTurns -= 1;
  }
  if ((game.player.guardBrokenTurns || 0) > 0) {
    game.player.guardBrokenTurns -= 1;
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
  if ((game.hasPendingProgressionChoice && game.hasPendingProgressionChoice()) || game.pendingSpellChoices > 0) {
    game.pendingTurnResolution = advanceTurn;
    if (!game.showNextProgressionModal || !game.showNextProgressionModal()) {
      game.render();
    }
    return;
  }
  game.resolveTurn(advanceTurn);
}
