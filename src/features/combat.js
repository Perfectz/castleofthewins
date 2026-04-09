/**
 * @module combat
 * @owns Attack resolution, damage application, monster death, level-up, monster AI turns
 * @reads game.player, game.currentLevel.actors, game.currentDepth
 * @mutates defender.hp, monster status (sleeping/alerted/held/slowed),
 *          game.currentLevel.actors, game.currentLevel.items, game.currentLevel.corpses,
 *          game.player.exp, game.player.level, game.player.stats
 * @emits game.log, game.audio.play, game.emitReadout, game.emitImpact, game.flashTile,
 *        game.playProjectile, game.emitCastCircle, game.emitDeathBurst
 */
import { MAX_CORPSES, TREASURE_DROP_CHANCE } from "../core/constants.js";
import { rollTreasure } from "../core/entities.js";
import { hasLineOfSight, isVisible } from "../core/world.js";
import { clamp, distance, randInt, removeFromArray, roll } from "../core/utils.js";
import { buildDeathRecapMarkup, noteDeathContext, recordChronicleEvent } from "./chronicle.js";
import { getBuildAttackBonus, getBuildDamageBonus, onMonsterKilled, queuePerkChoice } from "./builds.js";
import { buildMonsterContext, canMonsterMoveToTile, executeMonsterBehavior, findRetreat } from "./monster-behaviors.js";

const UNDEAD_IDS = new Set(["skeleton", "wraith", "cryptlord"]);
const BASE_MOVE_THRESHOLD = 100;

function getMonsterMoveSpeed(monster) {
  let speed = typeof monster.moveSpeed === "number" ? monster.moveSpeed : BASE_MOVE_THRESHOLD;
  if ((monster.slowed || 0) > 0) {
    speed *= 0.5;
  }
  return clamp(Math.round(speed), 40, 120);
}

function bankMonsterMovement(monster) {
  monster.moveMeter = Math.min(
    BASE_MOVE_THRESHOLD * 2,
    (typeof monster.moveMeter === "number" ? monster.moveMeter : BASE_MOVE_THRESHOLD) + getMonsterMoveSpeed(monster)
  );
}

function canMonsterSpendMovement(monster) {
  if ((monster.moveMeter || 0) < BASE_MOVE_THRESHOLD) {
    return false;
  }
  monster.moveMeter -= BASE_MOVE_THRESHOLD;
  return true;
}

function isUndead(actor) {
  return Boolean(actor && UNDEAD_IDS.has(actor.id));
}

// applyBannerBuff, raiseCorpse, findNearbyCorpse moved to monster-behaviors.js

export function visibleEnemies(game) {
  return game.currentLevel.actors.filter((actor) => isVisible(game.currentLevel, actor.x, actor.y));
}

export function makeNoise(game, radius, source = game.player, reason = "noise") {
  if (!game.currentLevel || game.currentDepth === 0) {
    return 0;
  }
  let stirred = 0;
  game.currentLevel.actors.forEach((monster) => {
    const hears = distance(source, monster) <= radius || (distance(source, monster) <= radius + 2 && hasLineOfSight(game.currentLevel, source.x, source.y, monster.x, monster.y));
    if (!hears) {
      return;
    }
    if (monster.sleeping || monster.alerted < Math.max(4, radius - 1)) {
      stirred += 1;
    }
    monster.sleeping = false;
    monster.alerted = Math.max(monster.alerted || 0, Math.max(4, radius));
  });
  if (reason === "rest" && stirred > 0) {
    game.log("Your pause carries through the halls. Something is moving.", "bad");
  }
  if (radius >= 4 && game.increaseDanger) {
    game.increaseDanger(reason, reason === "rest" ? 2 : 1);
  }
  return stirred;
}

export function canMonsterMoveTo(game, monster, x, y) {
  return canMonsterMoveToTile(game, monster, x, y);
}

export function findRetreatStep(game, monster) {
  return findRetreat(game, monster);
}

export function canCharge(game, monster, dx, dy, distanceToPlayer) {
  if (!monster.abilities || !monster.abilities.includes("charge")) {
    return false;
  }
  if (distanceToPlayer < 2 || distanceToPlayer > 4) {
    return false;
  }
  if (!(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy))) {
    return false;
  }
  return hasLineOfSight(game.currentLevel, monster.x, monster.y, game.player.x, game.player.y);
}

export function applyCharge(game, monster) {
  if (!monster.chargeWindup) {
    return false;
  }
  const { dx, dy } = monster.chargeWindup;
  monster.chargeWindup = null;
  for (let step = 0; step < 2; step += 1) {
    const nx = monster.x + dx;
    const ny = monster.y + dy;
    if (nx === game.player.x && ny === game.player.y) {
      game.log(`${monster.name} slams into you.`, "bad");
      game.attack(monster, game.player);
      return true;
    }
    if (!canMonsterMoveTo(game, monster, nx, ny)) {
      return false;
    }
    monster.x = nx;
    monster.y = ny;
  }
  return true;
}

export function getMonsterIntent(game, monster) {
  if (monster.sleeping) {
    return { type: "sleep", symbol: "z", color: "#8ea3b5" };
  }
  if (monster.held) {
    return { type: "held", symbol: "#", color: "#ccbfff" };
  }
  if (monster.chargeWindup) {
    return { type: "charge", symbol: ">", color: "#ff9f6b" };
  }
  const dx = game.player.x - monster.x;
  const dy = game.player.y - monster.y;
  const distanceToPlayer = Math.max(Math.abs(dx), Math.abs(dy));
  const canSeePlayer = distanceToPlayer <= 9 && hasLineOfSight(game.currentLevel, monster.x, monster.y, game.player.x, game.player.y);
  if (distanceToPlayer <= 1) {
    return { type: "melee", symbol: "!", color: "#ff6f6f" };
  }
  if (monster.ranged && canSeePlayer && distanceToPlayer <= monster.ranged.range) {
    if (distanceToPlayer <= 2) {
      return { type: "retreat", symbol: "<", color: "#9fd0ff" };
    }
    return { type: "shoot", symbol: "*", color: "#ffd46b" };
  }
  if (monster.spells && canSeePlayer && monster.mana >= 4) {
    if (monster.abilities && monster.abilities.includes("summon")) {
      return { type: "summon", symbol: "+", color: "#d6a8ff" };
    }
    return { type: "hex", symbol: "~", color: "#c9b6ff" };
  }
  if (canSeePlayer && canCharge(game, monster, dx, dy, distanceToPlayer)) {
    return { type: "charge", symbol: ">", color: "#ff9f6b" };
  }
  if (monster.alerted > 0) {
    return { type: "advance", symbol: "!", color: "#f2deb1" };
  }
  return null;
}

export function updateMonsterIntents(game) {
  if (!game.currentLevel) {
    return;
  }
  game.currentLevel.actors.forEach((monster) => {
    monster.intent = getMonsterIntent(game, monster);
  });
}

export function attack(game, attacker, defender) {
  const isPlayer = attacker.id === "player";
  const attackScore = isPlayer
    ? 10 + game.getAttackValue() + Math.floor(game.player.level / 2) + getBuildAttackBonus(game, defender)
    : attacker.attack + (attacker.tempAttackBuff || 0);
  const defenseScore = defender.id === "player" ? game.getEvadeValue() + game.getArmorValue() : defender.defense;
  const rollHit = randInt(1, 20) + attackScore;
  makeNoise(game, isPlayer ? 5 : 4, attacker, "combat");
  if (rollHit < 10 + defenseScore) {
    game.log(`${attacker.name} misses ${defender.name}.`, "warning");
    game.audio.play("ui");
    if (defender && typeof defender.x === "number" && typeof defender.y === "number") {
      game.flashTile(defender.x, defender.y, "#f2deb1", 100, { alpha: 0.1, decorative: true });
    }
    return false;
  }
  let damage = isPlayer ? roll(...game.getDamageRange()) + getBuildDamageBonus(game, defender, "physical") : roll(...attacker.damage);
  if (isPlayer) {
    const critChance = Math.min(0.4, 0.05 + (game.getMeleeCritBonus?.() ?? 0) * 0.05);
    if (Math.random() < critChance) {
      damage += Math.max(2, Math.floor(damage * 0.5));
      game.log("Critical hit.", "good");
      game.emitReadout("Crit", defender.x, defender.y, "#ffd67e", 260);
    }
    if (isUndead(defender) && game.getAntiUndeadBonus) {
      const antiUndead = game.getAntiUndeadBonus();
      if (antiUndead > 0) {
        damage += antiUndead;
        game.emitReadout("Bane", defender.x, defender.y, "#efe9ad", 240);
      }
    }
  } else if (attacker.behaviorKit === "breaker" && defender.id === "player" && game.getGuardValue && game.getGuardValue() >= 3) {
    damage += 2;
  }
  game.damageActor(attacker, defender, damage, "physical");
  return true;
}

export function damageActor(game, attacker, defender, amount, damageType = "physical") {
  let resolvedAmount = amount;
  if (defender.id === "player") {
    if (attacker.behaviorKit === "breaker" && (game.getGuardValue?.() ?? 0) >= 3) {
      resolvedAmount += 1;
      game.player.guardBrokenTurns = Math.max(game.player.guardBrokenTurns || 0, 2);
      game.log(`${attacker.name} breaks through your guard.`, "bad");
    }
    if (damageType === "physical") {
      resolvedAmount = Math.max(1, resolvedAmount - (game.getGuardValue?.() ?? 0));
    }
    if (damageType === "magic") {
      resolvedAmount = Math.max(1, resolvedAmount - (game.getWardValue?.() ?? 0));
    }
    if (damageType === "fire" || damageType === "cold") {
      const buffKey = damageType === "fire" ? "resistFireTurns" : "resistColdTurns";
      const getResist = damageType === "fire" ? game.getFireResistValue : game.getColdResistValue;
      if ((game.player[buffKey] || 0) > 0) {
        resolvedAmount = Math.max(1, resolvedAmount - (game.getWardValue?.() ?? 0));
        resolvedAmount = Math.max(1, resolvedAmount - (getResist?.call(game) ?? 0));
        resolvedAmount = Math.max(1, Math.ceil(resolvedAmount * 0.6));
      } else if (getResist) {
        resolvedAmount = Math.max(1, resolvedAmount - getResist.call(game));
      }
    }
  }
  defender.hp -= resolvedAmount;
  game.audio.play(defender.id === "player" ? "bad" : "hit");
  game.emitImpact(attacker, defender, game.getDamageEffectColor(damageType, defender), damageType);
  game.emitReadout(`-${resolvedAmount}`, defender.x, defender.y, defender.id === "player" ? "#ffb0a0" : "#f4edd7");
  if (defender.id === "player") {
    game.log(`${attacker.name} hits ${defender.name} for ${resolvedAmount}.`, "bad");
    if (attacker.abilities && attacker.abilities.includes("drain") && Math.random() < 0.3) {
      game.player.constitutionLoss = Math.min(game.player.stats.con - 1, (game.player.constitutionLoss || 0) + 1);
      game.recalculateDerivedStats();
      game.log("A chill passes through you. Your Constitution is leeched away.", "bad");
    }
    if (defender.hp <= 0) {
      game.player.hp = 0;
      noteDeathContext(game, {
        cause: `${attacker.name} dealt the final blow.`,
        lastHitBy: attacker.name,
        dangerLevel: game.currentLevel?.dangerLevel || "Low"
      });
      game.handleDeath();
    }
    return;
  }

  game.log(`${attacker.name} hits ${defender.name} for ${resolvedAmount}.`, attacker.id === "player" ? "good" : "bad");
  if (defender.hp <= 0) {
    game.killMonster(defender);
  }
}

export function killMonster(game, monster) {
  if (game.currentLevel) {
    game.currentLevel.corpses = Array.isArray(game.currentLevel.corpses) ? game.currentLevel.corpses : [];
    game.currentLevel.corpses.push({
      x: monster.x,
      y: monster.y,
      sourceId: monster.id,
      turn: game.turn
    });
    if (game.currentLevel.corpses.length > MAX_CORPSES) {
      game.currentLevel.corpses.shift();
    }
  }
  removeFromArray(game.currentLevel.actors, monster);
  game.emitDeathBurst(monster.x, monster.y, monster.color || "#f2deb1");
  const gold = monster.gold ? randInt(monster.gold[0], monster.gold[1]) : 0;
  if (gold > 0) {
    game.currentLevel.items.push({ x: monster.x, y: monster.y, kind: "gold", name: "Gold", amount: gold });
  }
  if (Math.random() < TREASURE_DROP_CHANCE) {
    game.currentLevel.items.push({ ...rollTreasure({ depth: game.currentDepth, quality: monster.elite ? "guarded" : "" }), x: monster.x, y: monster.y });
  }
  if (monster.elite) {
    game.currentLevel.items.push({ ...rollTreasure({ depth: game.currentDepth + 1, quality: "elite" }), x: monster.x, y: monster.y });
    recordChronicleEvent(game, "elite_kill", {
      label: monster.name,
      depth: game.currentDepth
    });
    game.recordTelemetry?.("elite_kill", {
      label: monster.name,
      depth: game.currentDepth
    });
  }
  game.player.exp += monster.exp;
  game.log(`${monster.name} dies.`, "good");
  game.audio.play("good");
  game.flashTile(monster.x, monster.y, "#f2deb1", 180, { alpha: 0.16 });
  if (monster.milestoneBoss && game.resolveMilestoneBossKill) {
    game.resolveMilestoneBossKill(monster);
  }
  onMonsterKilled(game, monster);
  game.checkLevelUp();
}

export function checkLevelUp(game) {
  while (game.player.exp >= game.player.nextLevelExp) {
    game.player.level += 1;
    game.player.nextLevelExp = Math.floor(game.player.nextLevelExp * 1.58);
    game.player.stats.str += randInt(0, 1);
    game.player.stats.dex += randInt(0, 1);
    game.player.stats.con += randInt(0, 1);
    game.player.stats.int += randInt(0, 1);
    game.recalculateDerivedStats();
    game.player.hp = game.player.maxHp;
    game.player.mana = game.player.maxMana;
    game.log(`${game.player.name} reaches level ${game.player.level}.`, "good");
    game.pulseScreen("rgba(214, 170, 88, 0.18)", 240, 0.16);
    game.pendingSpellChoices += 1;
    queuePerkChoice(game, 1);
  }

  if (game.pendingSpellChoices > 0 || game.pendingPerkChoices > 0 || game.pendingRewardQueue?.length > 0) {
    if (!game.showNextProgressionModal()) {
      if (game.pendingSpellChoices > 0) {
        game.log("No additional spells are available to learn at this level.", "warning");
        game.pendingSpellChoices = 0;
      }
    }
  }
}

export function handleDeath(game) {
  game.recordTelemetry?.("run_death", {
    cause: game.deathContext?.cause || "Unknown",
    lastHitBy: game.deathContext?.lastHitBy || "Unknown",
    dangerLevel: game.deathContext?.dangerLevel || game.currentLevel?.dangerLevel || "Low"
  });
  game.handleRunDeath?.();
  game.mode = "modal";
  game.showSimpleModal("Fallen", buildDeathRecapMarkup(game));
  game.render();
}

export function processMonsters(game) {
  const level = game.currentLevel;
  level.actors.forEach((monster) => {
    bankMonsterMovement(monster);
    if ((monster.tempBuffTurns || 0) > 0) {
      monster.tempBuffTurns -= 1;
      if (monster.tempBuffTurns <= 0) {
        monster.tempAttackBuff = 0;
      }
    }
    if ((monster.bannerCooldown || 0) > 0) {
      monster.bannerCooldown -= 1;
    }
    if ((monster.slowed || 0) > 0) {
      monster.slowed -= 1;
    }
    if (monster.sleeping) {
      const wakes = distance(game.player, monster) <= 3 || (isVisible(level, monster.x, monster.y) && Math.random() < 0.55);
      if (wakes) {
        monster.sleeping = false;
        monster.alerted = 4;
      } else {
        return;
      }
    }
    if (monster.held) {
      monster.held -= 1;
      game.emitReadout("Held", monster.x, monster.y, "#cbbfff", 220);
      return;
    }
    const dx = game.player.x - monster.x;
    const dy = game.player.y - monster.y;
    const distanceToPlayer = Math.max(Math.abs(dx), Math.abs(dy));
    const canSeePlayer = distanceToPlayer <= 9 && hasLineOfSight(level, monster.x, monster.y, game.player.x, game.player.y);
    if (canSeePlayer) {
      monster.alerted = 6;
      monster.sleeping = false;
    } else if (monster.alerted > 0) {
      monster.alerted -= 1;
    }

    // --- behavior table dispatch ---
    const ctx = buildMonsterContext(game, monster);
    if (executeMonsterBehavior(game, monster, ctx, () => canMonsterSpendMovement(monster))) {
      return;
    }

    // --- movement fallback (no behavior matched) ---
    let stepX = 0;
    let stepY = 0;
    if (monster.alerted > 0) {
      if (monster.tactic === "pack" && ctx.distanceToPlayer <= 5) {
        const flankLeft = canMonsterMoveToTile(game, monster, monster.x + Math.sign(ctx.dx), monster.y);
        const flankRight = canMonsterMoveToTile(game, monster, monster.x, monster.y + Math.sign(ctx.dy));
        if (flankLeft && flankRight && Math.random() < 0.5) {
          stepX = Math.sign(ctx.dx);
          stepY = 0;
        } else {
          stepX = Math.sign(ctx.dx);
          stepY = Math.sign(ctx.dy);
        }
      } else {
        stepX = Math.sign(ctx.dx);
        stepY = Math.sign(ctx.dy);
      }
    } else if (Math.random() < 0.55) {
      stepX = randInt(-1, 1);
      stepY = randInt(-1, 1);
    }

    const nx = monster.x + stepX;
    const ny = monster.y + stepY;
    if (nx === game.player.x && ny === game.player.y) {
      game.attack(monster, game.player);
      return;
    }
    if (canMonsterMoveToTile(game, monster, nx, ny) && canMonsterSpendMovement(monster)) {
      monster.x = nx;
      monster.y = ny;
    }
  });
}
