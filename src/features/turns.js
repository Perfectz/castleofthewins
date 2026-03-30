import { getEncumbranceTier } from "../core/entities.js";
import { onPlayerWait } from "./builds.js";
import { advanceDangerTurn } from "./director.js";

export function performWait(game) {
  if (!game.player || game.mode !== "game") {
    return;
  }
  game.log(`${game.player.name} waits.`, "warning");
  game.audio.play("ui");
  onPlayerWait(game);
  game.makeNoise(3, game.player, "wait");
  game.endTurn();
}

export function restUntilSafe(game) {
  if (!game.player || game.mode !== "game") {
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

export function resolveTurn(game, advanceTurn = true) {
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
  game.updateFov();
  game.updateMonsterIntents();
  game.checkQuestState();
  game.render();
}

export function endTurn(game, advanceTurn = true) {
  if ((game.hasPendingProgressionChoice && game.hasPendingProgressionChoice()) || game.pendingSpellChoices > 0) {
    game.pendingTurnResolution = advanceTurn;
    if (!game.showNextProgressionModal || !game.showNextProgressionModal()) {
      game.render();
    }
    return;
  }
  game.resolveTurn(advanceTurn);
}
