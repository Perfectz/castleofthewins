import { rollTreasure, weightedMonster } from "../core/entities.js";
import { actorAt, getTile, hasLineOfSight, inBounds, isVisible, summonMonsterNear } from "../core/world.js";
import { distance, nowTime, randInt, removeFromArray, roll } from "../core/utils.js";
import { buildDeathRecapMarkup, noteDeathContext, recordChronicleEvent } from "./chronicle.js";
import { getBuildAttackBonus, getBuildDamageBonus, onMonsterKilled, queuePerkChoice } from "./builds.js";

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
  if (!inBounds(game.currentLevel, x, y)) {
    return false;
  }
  if (game.player.x === x && game.player.y === y) {
    return false;
  }
  const tile = getTile(game.currentLevel, x, y);
  const canPhase = monster.abilities && monster.abilities.includes("phase");
  if (actorAt(game.currentLevel, x, y)) {
    return false;
  }
  return (tile.walkable || (canPhase && tile.kind === "wall")) && !(tile.kind === "secretDoor" && tile.hidden);
}

export function findRetreatStep(game, monster) {
  const options = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) {
        continue;
      }
      const nx = monster.x + dx;
      const ny = monster.y + dy;
      if (!canMonsterMoveTo(game, monster, nx, ny)) {
        continue;
      }
      options.push({
        x: nx,
        y: ny,
        score: distance({ x: nx, y: ny }, game.player) + (hasLineOfSight(game.currentLevel, nx, ny, game.player.x, game.player.y) ? 1 : 0)
      });
    }
  }
  options.sort((a, b) => b.score - a.score);
  return options[0] || null;
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
  const attackScore = isPlayer ? 10 + game.getAttackValue() + Math.floor(game.player.level / 2) + getBuildAttackBonus(game, defender) : attacker.attack;
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
  const damage = isPlayer ? roll(...game.getDamageRange()) + getBuildDamageBonus(game, defender, "physical") : roll(...attacker.damage);
  game.damageActor(attacker, defender, damage, "physical");
  return true;
}

export function damageActor(game, attacker, defender, amount, damageType = "physical") {
  defender.hp -= amount;
  game.audio.play(defender.id === "player" ? "bad" : "hit");
  game.emitImpact(attacker, defender, game.getDamageEffectColor(damageType, defender), damageType);
  game.emitReadout(`-${amount}`, defender.x, defender.y, defender.id === "player" ? "#ffb0a0" : "#f4edd7");
  if (defender.id === "player") {
    game.log(`${attacker.name} hits ${defender.name} for ${amount}.`, "bad");
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

  game.log(`${attacker.name} hits ${defender.name} for ${amount}.`, attacker.id === "player" ? "good" : "bad");
  if (defender.hp <= 0) {
    game.killMonster(defender);
  }
}

export function killMonster(game, monster) {
  removeFromArray(game.currentLevel.actors, monster);
  game.emitDeathBurst(monster.x, monster.y, monster.color || "#f2deb1");
  const gold = randInt(monster.gold[0], monster.gold[1]);
  if (gold > 0) {
    game.currentLevel.items.push({ x: monster.x, y: monster.y, kind: "gold", name: "Gold", amount: gold });
  }
  if (Math.random() < 0.42) {
    game.currentLevel.items.push({ ...rollTreasure(game.currentDepth), x: monster.x, y: monster.y });
  }
  if (monster.elite) {
    game.currentLevel.items.push({ ...rollTreasure(game.currentDepth + 1), x: monster.x, y: monster.y });
    recordChronicleEvent(game, "elite_kill", {
      label: monster.name,
      depth: game.currentDepth
    });
  }
  game.player.exp += monster.exp;
  game.log(`${monster.name} dies.`, "good");
  game.audio.play("good");
  game.flashTile(monster.x, monster.y, "#f2deb1", 180, { alpha: 0.16 });
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
  game.mode = "modal";
  game.showSimpleModal("Fallen", buildDeathRecapMarkup(game));
  game.render();
}

export function processMonsters(game) {
  const level = game.currentLevel;
  level.actors.forEach((monster) => {
    if (monster.sleeping) {
      const wakes = distance(game.player, monster) <= 3 || (isVisible(level, monster.x, monster.y) && Math.random() < 0.55);
      if (wakes) {
        monster.sleeping = false;
        monster.alerted = 4;
      } else {
        return;
      }
    }
    if (monster.slowed) {
      monster.slowed -= 1;
      if (game.turn % 2 === 0) {
        return;
      }
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

    if (monster.chargeWindup) {
      applyCharge(game, monster);
      return;
    }

    if (distanceToPlayer <= 1) {
      game.attack(monster, game.player);
      return;
    }

    if (monster.ranged && canSeePlayer && distanceToPlayer <= monster.ranged.range) {
      if (distanceToPlayer <= 2) {
        const retreat = findRetreatStep(game, monster);
        if (retreat) {
          monster.x = retreat.x;
          monster.y = retreat.y;
          return;
        }
      }
      if (Math.random() < 0.55) {
        game.playProjectile(monster, game.player, monster.ranged.color);
        game.log(`${monster.name} launches a ranged attack.`, "bad");
        game.audio.play("hit");
        game.damageActor(monster, game.player, roll(...monster.ranged.damage), "physical");
        return;
      }
    }

    if (monster.spells && canSeePlayer && monster.mana >= 4 && Math.random() < 0.24) {
      monster.mana -= 4;
      game.emitCastCircle(monster.x, monster.y, monster.abilities && monster.abilities.includes("summon") ? "#d6a8ff" : "#c9a5ff");
      if (monster.abilities && monster.abilities.includes("slow") && Math.random() < 0.35) {
        game.log(`${monster.name} casts a crippling spell.`, "bad");
        game.playProjectile(monster, game.player, "#bfd9ff");
        game.player.slowed = Math.max(game.player.slowed || 0, 2);
      } else {
        game.log(`${monster.name} hurls dark magic.`, "bad");
        game.playProjectile(monster, game.player, "#c9a5ff");
        game.damageActor(monster, game.player, roll(2, 5) + game.currentDepth, "magic");
      }
      if (monster.abilities && monster.abilities.includes("summon") && Math.random() < 0.25) {
        summonMonsterNear(level, monster.x, monster.y, weightedMonster(game.currentDepth));
        game.log(`${monster.name} calls for aid from the dark.`, "bad");
      }
      if (monster.abilities && monster.abilities.includes("teleport") && Math.random() < 0.2) {
        const position = game.findSafeTile(level, 12);
        if (position) {
          monster.x = position.x;
          monster.y = position.y;
          game.addEffect({ type: "blink", x: monster.x, y: monster.y, color: "#ba8eff", until: nowTime() + 180 });
        }
      }
      return;
    }

    if (canSeePlayer && canCharge(game, monster, dx, dy, distanceToPlayer) && Math.random() < 0.4) {
      monster.chargeWindup = { dx: Math.sign(dx), dy: Math.sign(dy) };
      game.emitTelegraphPulse(monster.x, monster.y, "#ff9f6b", 260);
      if (isVisible(level, monster.x, monster.y)) {
        game.log(`${monster.name} lowers itself for a brutal rush.`, "warning");
      }
      return;
    }

    let stepX = 0;
    let stepY = 0;
    if (monster.alerted > 0) {
      if (monster.tactic === "skirmish" && distanceToPlayer <= 4) {
        const retreat = findRetreatStep(game, monster);
        if (retreat) {
          monster.x = retreat.x;
          monster.y = retreat.y;
          return;
        }
      }
      if (monster.tactic === "pack" && distanceToPlayer <= 5) {
        const flankLeft = canMonsterMoveTo(game, monster, monster.x + Math.sign(dx), monster.y);
        const flankRight = canMonsterMoveTo(game, monster, monster.x, monster.y + Math.sign(dy));
        if (flankLeft && flankRight && Math.random() < 0.5) {
          stepX = Math.sign(dx);
          stepY = 0;
        } else {
          stepX = Math.sign(dx);
          stepY = Math.sign(dy);
        }
      } else {
        stepX = Math.sign(dx);
        stepY = Math.sign(dy);
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
    if (canMonsterMoveTo(game, monster, nx, ny)) {
      monster.x = nx;
      monster.y = ny;
    }
  });
}
