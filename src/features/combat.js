import { rollTreasure, weightedMonster } from "../core/entities.js";
import { actorAt, getTile, hasLineOfSight, inBounds, isVisible, summonMonsterNear } from "../core/world.js";
import { distance, nowTime, randInt, removeFromArray, roll } from "../core/utils.js";
import { buildDeathRecapMarkup, noteDeathContext, recordChronicleEvent } from "./chronicle.js";
import { getBuildAttackBonus, getBuildDamageBonus, onMonsterKilled, queuePerkChoice } from "./builds.js";

const UNDEAD_IDS = new Set(["skeleton", "wraith", "cryptlord"]);

function isUndead(actor) {
  return Boolean(actor && UNDEAD_IDS.has(actor.id));
}

function findNearbyCorpse(level, monster, radius = 4) {
  if (!level?.corpses?.length) {
    return null;
  }
  return level.corpses.find((corpse) => distance(monster, corpse) <= radius);
}

function applyBannerBuff(game, monster) {
  const allies = (game.currentLevel?.actors || []).filter((ally) =>
    ally !== monster &&
    distance(ally, monster) <= 4 &&
    ally.hp > 0
  );
  if (allies.length === 0) {
    return false;
  }
  allies.forEach((ally) => {
    ally.tempAttackBuff = Math.max(ally.tempAttackBuff || 0, 2);
    ally.tempBuffTurns = Math.max(ally.tempBuffTurns || 0, 2);
    ally.alerted = Math.max(ally.alerted || 0, 6);
    ally.sleeping = false;
  });
  monster.bannerCooldown = 4;
  game.emitReadout("Rally", monster.x, monster.y, "#ffd27b", 320);
  if (isVisible(game.currentLevel, monster.x, monster.y)) {
    game.log(`${monster.name} rallies the room around you.`, "bad");
  }
  return true;
}

function raiseCorpse(game, monster) {
  const corpse = findNearbyCorpse(game.currentLevel, monster, 4);
  if (!corpse || !game.canAddDynamicMonster?.(1)) {
    return false;
  }
  summonMonsterNear(game.currentLevel, corpse.x, corpse.y, weightedMonster(Math.max(2, game.currentDepth - 1)));
  const raised = game.currentLevel.actors[game.currentLevel.actors.length - 1];
  if (raised) {
    raised.id = "skeleton";
    raised.name = "Raised Dead";
    raised.sprite = "skeleton";
    raised.visualId = "skeleton";
    raised.color = "#cfc8b0";
    raised.role = "frontliner";
    raised.behaviorKit = "";
    raised.sleeping = false;
    raised.alerted = 7;
    raised.raisedCorpse = true;
  }
  game.currentLevel.corpses = game.currentLevel.corpses.filter((entry) => entry !== corpse);
  game.emitReadout("Raise", monster.x, monster.y, "#d6a8ff", 360);
  game.log(`${monster.name} drags a corpse back into the fight.`, "bad");
  return true;
}

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
    const critChance = Math.min(0.4, 0.05 + (game.getMeleeCritBonus ? game.getMeleeCritBonus() * 0.05 : 0));
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
    if (attacker.behaviorKit === "breaker" && game.getGuardValue && game.getGuardValue() >= 3) {
      resolvedAmount += 1;
      game.player.guardBrokenTurns = Math.max(game.player.guardBrokenTurns || 0, 2);
      game.log(`${attacker.name} breaks through your guard.`, "bad");
    }
    if (damageType === "physical" && game.getGuardValue) {
      resolvedAmount = Math.max(1, resolvedAmount - game.getGuardValue());
    }
    if (damageType === "magic" && game.getWardValue) {
      resolvedAmount = Math.max(1, resolvedAmount - game.getWardValue());
    }
    if (damageType === "fire" && (game.player.resistFireTurns || 0) > 0) {
      if (game.getWardValue) {
        resolvedAmount = Math.max(1, resolvedAmount - game.getWardValue());
      }
      if (game.getFireResistValue) {
        resolvedAmount = Math.max(1, resolvedAmount - game.getFireResistValue());
      }
      resolvedAmount = Math.max(1, Math.ceil(resolvedAmount * 0.6));
    } else if (damageType === "fire" && game.getFireResistValue) {
      resolvedAmount = Math.max(1, resolvedAmount - game.getFireResistValue());
    }
    if (damageType === "cold" && (game.player.resistColdTurns || 0) > 0) {
      if (game.getWardValue) {
        resolvedAmount = Math.max(1, resolvedAmount - game.getWardValue());
      }
      if (game.getColdResistValue) {
        resolvedAmount = Math.max(1, resolvedAmount - game.getColdResistValue());
      }
      resolvedAmount = Math.max(1, Math.ceil(resolvedAmount * 0.6));
    } else if (damageType === "cold" && game.getColdResistValue) {
      resolvedAmount = Math.max(1, resolvedAmount - game.getColdResistValue());
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
    if (game.currentLevel.corpses.length > 12) {
      game.currentLevel.corpses.shift();
    }
  }
  removeFromArray(game.currentLevel.actors, monster);
  game.emitDeathBurst(monster.x, monster.y, monster.color || "#f2deb1");
  const gold = randInt(monster.gold[0], monster.gold[1]);
  if (gold > 0) {
    game.currentLevel.items.push({ x: monster.x, y: monster.y, kind: "gold", name: "Gold", amount: gold });
  }
  if (Math.random() < 0.42) {
    game.currentLevel.items.push({ ...rollTreasure({ depth: game.currentDepth, quality: monster.elite ? "guarded" : "" }), x: monster.x, y: monster.y });
  }
  if (monster.elite) {
    game.currentLevel.items.push({ ...rollTreasure({ depth: game.currentDepth + 1, quality: "elite" }), x: monster.x, y: monster.y });
    recordChronicleEvent(game, "elite_kill", {
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
    if ((monster.tempBuffTurns || 0) > 0) {
      monster.tempBuffTurns -= 1;
      if (monster.tempBuffTurns <= 0) {
        monster.tempAttackBuff = 0;
      }
    }
    if ((monster.bannerCooldown || 0) > 0) {
      monster.bannerCooldown -= 1;
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

    if (monster.behaviorKit === "banner_captain" && canSeePlayer && (monster.bannerCooldown || 0) <= 0 && Math.random() < 0.26) {
      if (applyBannerBuff(game, monster)) {
        return;
      }
    }

    if (monster.behaviorKit === "corpse_raiser" && canSeePlayer && monster.mana >= 3 && Math.random() < 0.24) {
      monster.mana -= 3;
      if (raiseCorpse(game, monster)) {
        return;
      }
    }

    if (monster.behaviorKit === "pinning_controller" && canSeePlayer && monster.mana >= 2 && distanceToPlayer <= 6 && Math.random() < 0.28) {
      monster.mana -= 2;
      game.log(`${monster.name} pins the lane with binding force.`, "bad");
      game.emitReadout("Pin", monster.x, monster.y, "#ccbfff", 320);
      game.player.held = Math.max(game.player.held || 0, 1);
      game.player.slowed = Math.max(game.player.slowed || 0, 2);
      return;
    }

    if (distanceToPlayer <= 1) {
      game.attack(monster, game.player);
      return;
    }

    if (monster.ranged && canSeePlayer && distanceToPlayer <= monster.ranged.range) {
      if (distanceToPlayer <= (monster.behaviorKit === "coward_caster" ? 3 : 2)) {
        const retreat = findRetreatStep(game, monster);
        if (retreat) {
          monster.x = retreat.x;
          monster.y = retreat.y;
          return;
        }
      }
      if (Math.random() < (monster.behaviorKit === "coward_caster" ? 0.72 : 0.55)) {
        game.playProjectile(monster, game.player, monster.ranged.color);
        game.log(`${monster.name} launches a ranged attack.`, "bad");
        game.emitReadout("Shot", monster.x, monster.y, "#ffd46b", 320);
        game.audio.play("hit");
        game.damageActor(monster, game.player, roll(...monster.ranged.damage), "physical");
        return;
      }
    }

    if (monster.spells && canSeePlayer && monster.mana >= 4 && Math.random() < (monster.behaviorKit === "coward_caster" ? 0.36 : 0.24)) {
      const spellId = (monster.spells || [])[randInt(0, monster.spells.length - 1)];
      const spellCost = spellId === "lightningBolt" ? 6 : spellId === "holdMonster" ? 5 : 4;
      monster.mana -= spellCost;
      game.emitCastCircle(monster.x, monster.y, monster.abilities && monster.abilities.includes("summon") ? "#d6a8ff" : "#c9a5ff");
      if (spellId === "slowMonster") {
        game.log(`${monster.name} casts a crippling spell.`, "bad");
        game.emitReadout("Hex", monster.x, monster.y, "#bfd9ff", 340);
        game.playProjectile(monster, game.player, "#bfd9ff");
        game.player.slowed = Math.max(game.player.slowed || 0, 3);
      } else if (spellId === "holdMonster") {
        game.log(`${monster.name} binds you in place.`, "bad");
        game.emitReadout("Hold", monster.x, monster.y, "#ccbfff", 340);
        game.playProjectile(monster, game.player, "#ccbfff");
        game.player.held = Math.max(game.player.held || 0, 1);
        game.player.slowed = Math.max(game.player.slowed || 0, 2);
      } else if (spellId === "lightningBolt") {
        game.log(`${monster.name} tears a line of lightning through the room.`, "bad");
        game.emitReadout("Bolt", monster.x, monster.y, "#ffe27a", 340);
        game.playProjectile(monster, game.player, "#ffe27a");
        game.damageActor(monster, game.player, roll(3, 5) + Math.floor(game.currentDepth / 2), "magic");
      } else if (spellId === "frostBolt") {
        game.log(`${monster.name} lashes you with freezing magic.`, "bad");
        game.emitReadout("Frost", monster.x, monster.y, "#9ad7ff", 340);
        game.playProjectile(monster, game.player, "#9ad7ff");
        game.damageActor(monster, game.player, roll(2, 5) + Math.floor(game.currentDepth / 2), "cold");
        game.player.slowed = Math.max(game.player.slowed || 0, 2);
      } else {
        game.log(`${monster.name} hurls dark magic.`, "bad");
        game.emitReadout("Cast", monster.x, monster.y, "#c9a5ff", 340);
        game.playProjectile(monster, game.player, "#c9a5ff");
        game.damageActor(monster, game.player, roll(2, 5) + game.currentDepth, "magic");
      }
      if (monster.abilities && monster.abilities.includes("summon") && Math.random() < 0.12) {
        summonMonsterNear(level, monster.x, monster.y, weightedMonster(game.currentDepth));
        game.log(`${monster.name} calls for aid from the dark.`, "bad");
        game.emitReadout("Summon", monster.x, monster.y, "#d6a8ff", 360);
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
      game.emitReadout("Charge", monster.x, monster.y, "#ffb487", 340);
      if (isVisible(level, monster.x, monster.y)) {
        game.log(`${monster.name} lowers itself for a brutal rush.`, "warning");
      }
      return;
    }

    let stepX = 0;
    let stepY = 0;
    if (monster.alerted > 0) {
      if (monster.behaviorKit === "stalker" && canSeePlayer && distanceToPlayer <= 3) {
        const retreat = findRetreatStep(game, monster);
        if (retreat) {
          monster.x = retreat.x;
          monster.y = retreat.y;
          return;
        }
      }
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
