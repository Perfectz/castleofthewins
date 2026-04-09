/**
 * @module monster-behaviors
 * @owns Data-driven monster AI behavior table
 * @reads game.player, game.currentLevel, game.currentDepth
 * @mutates monster position, status, chargeWindup, mana;
 *          game.player.held, game.player.slowed (via pinning/spells)
 *
 * Each behavior is a { id, condition, action } entry evaluated top-to-bottom.
 * The first behavior whose condition returns true and whose action returns
 * true consumes the monster's turn.
 *
 * To add a new monster behavior:
 *   1. Add an entry to MONSTER_BEHAVIORS at the correct priority position
 *   2. No other files need editing
 */

import { actorAt, getTile, hasLineOfSight, inBounds, isVisible, summonMonsterNear } from "../core/world.js";
import { weightedMonster } from "../core/entities.js";
import { distance, nowTime, randInt, roll } from "../core/utils.js";

// --- shared helpers ---

export function canMonsterMoveToTile(game, monster, x, y) {
  if (!inBounds(game.currentLevel, x, y)) return false;
  if (game.player.x === x && game.player.y === y) return false;
  const tile = getTile(game.currentLevel, x, y);
  const canPhase = monster.abilities?.includes("phase");
  if (actorAt(game.currentLevel, x, y)) return false;
  return (tile.walkable || (canPhase && tile.kind === "wall")) && !(tile.kind === "secretDoor" && tile.hidden);
}

export function findRetreat(game, monster) {
  const options = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = monster.x + dx;
      const ny = monster.y + dy;
      if (!canMonsterMoveToTile(game, monster, nx, ny)) continue;
      options.push({
        x: nx, y: ny,
        score: distance({ x: nx, y: ny }, game.player) +
               (hasLineOfSight(game.currentLevel, nx, ny, game.player.x, game.player.y) ? 1 : 0)
      });
    }
  }
  options.sort((a, b) => b.score - a.score);
  return options[0] || null;
}

export function findNearbyCorpse(level, monster, radius = 4) {
  if (!level?.corpses?.length) return null;
  return level.corpses.find((c) => distance(monster, c) <= radius);
}

// --- context builder ---

export function buildMonsterContext(game, monster) {
  const dx = game.player.x - monster.x;
  const dy = game.player.y - monster.y;
  const distanceToPlayer = Math.max(Math.abs(dx), Math.abs(dy));
  const canSeePlayer = distanceToPlayer <= 9 &&
    hasLineOfSight(game.currentLevel, monster.x, monster.y, game.player.x, game.player.y);
  return { dx, dy, distanceToPlayer, canSeePlayer };
}

// --- behavior table (evaluated top-to-bottom) ---

export const MONSTER_BEHAVIORS = [
  {
    id: "charge_followthrough",
    condition: (game, m, ctx) => !!m.chargeWindup,
    action: (game, m, ctx) => {
      game.applyCharge(m);
      return true;
    }
  },

  {
    id: "banner_rally",
    condition: (game, m, ctx) =>
      m.behaviorKit === "banner_captain" && ctx.canSeePlayer &&
      (m.bannerCooldown || 0) <= 0 && Math.random() < 0.26,
    action: (game, m) => {
      const allies = (game.currentLevel?.actors || []).filter((a) =>
        a !== m && distance(a, m) <= 4 && a.hp > 0
      );
      if (allies.length === 0) return false;
      allies.forEach((a) => {
        a.tempAttackBuff = Math.max(a.tempAttackBuff || 0, 2);
        a.tempBuffTurns = Math.max(a.tempBuffTurns || 0, 2);
        a.alerted = Math.max(a.alerted || 0, 6);
        a.sleeping = false;
      });
      m.bannerCooldown = 4;
      game.emitReadout("Rally", m.x, m.y, "#ffd27b", 320);
      if (isVisible(game.currentLevel, m.x, m.y)) {
        game.log(`${m.name} rallies the room around you.`, "bad");
      }
      return true;
    }
  },

  {
    id: "corpse_raise",
    condition: (game, m, ctx) =>
      m.behaviorKit === "corpse_raiser" && ctx.canSeePlayer &&
      m.mana >= 3 && Math.random() < 0.24,
    action: (game, m) => {
      m.mana -= 3;
      const corpse = findNearbyCorpse(game.currentLevel, m, 4);
      if (!corpse || !game.canAddDynamicMonster?.(1)) return false;
      summonMonsterNear(game.currentLevel, corpse.x, corpse.y, weightedMonster(Math.max(2, game.currentDepth - 1)));
      const raised = game.currentLevel.actors[game.currentLevel.actors.length - 1];
      if (raised) {
        Object.assign(raised, {
          id: "skeleton", name: "Raised Dead", sprite: "skeleton",
          visualId: "skeleton", color: "#cfc8b0", role: "frontliner",
          behaviorKit: "", sleeping: false, alerted: 7, raisedCorpse: true
        });
      }
      game.currentLevel.corpses = game.currentLevel.corpses.filter((e) => e !== corpse);
      game.emitReadout("Raise", m.x, m.y, "#d6a8ff", 360);
      game.log(`${m.name} drags a corpse back into the fight.`, "bad");
      return true;
    }
  },

  {
    id: "pinning_hex",
    condition: (game, m, ctx) =>
      m.behaviorKit === "pinning_controller" && ctx.canSeePlayer &&
      m.mana >= 2 && ctx.distanceToPlayer <= 6 && Math.random() < 0.28,
    action: (game, m) => {
      m.mana -= 2;
      game.log(`${m.name} pins the lane with binding force.`, "bad");
      game.emitReadout("Pin", m.x, m.y, "#ccbfff", 320);
      game.player.held = Math.max(game.player.held || 0, 1);
      game.player.slowed = Math.max(game.player.slowed || 0, 2);
      return true;
    }
  },

  {
    id: "melee_attack",
    condition: (game, m, ctx) => ctx.distanceToPlayer <= 1,
    action: (game, m) => {
      game.attack(m, game.player);
      return true;
    }
  },

  {
    id: "ranged_retreat",
    condition: (game, m, ctx) =>
      m.ranged && ctx.canSeePlayer && ctx.distanceToPlayer <= m.ranged.range &&
      ctx.distanceToPlayer <= (m.behaviorKit === "coward_caster" ? 3 : 2),
    action: (game, m) => {
      const retreat = findRetreat(game, m);
      if (!retreat) return false;
      m.x = retreat.x;
      m.y = retreat.y;
      return true;
    }
  },

  {
    id: "ranged_attack",
    condition: (game, m, ctx) =>
      m.ranged && ctx.canSeePlayer && ctx.distanceToPlayer <= m.ranged.range &&
      Math.random() < (m.behaviorKit === "coward_caster" ? 0.72 : 0.55),
    action: (game, m) => {
      game.playProjectile(m, game.player, m.ranged.color);
      game.log(`${m.name} launches a ranged attack.`, "bad");
      game.emitReadout("Shot", m.x, m.y, "#ffd46b", 320);
      game.audio.play("hit");
      game.damageActor(m, game.player, roll(...m.ranged.damage), "physical");
      return true;
    }
  },

  {
    id: "spellcast",
    condition: (game, m, ctx) =>
      m.spells && ctx.canSeePlayer && m.mana >= 4 &&
      Math.random() < (m.behaviorKit === "coward_caster" ? 0.36 : 0.24),
    action: (game, m) => {
      const spellId = m.spells[randInt(0, m.spells.length - 1)];
      const spellCost = spellId === "lightningBolt" ? 6 : spellId === "holdMonster" ? 5 : 4;
      m.mana -= spellCost;
      const isSummoner = m.abilities?.includes("summon");
      game.emitCastCircle(m.x, m.y, isSummoner ? "#d6a8ff" : "#c9a5ff");

      const SPELL_FX = {
        slowMonster: { text: "casts a crippling spell", label: "Hex", color: "#bfd9ff",
          apply: () => { game.player.slowed = Math.max(game.player.slowed || 0, 3); } },
        holdMonster: { text: "binds you in place", label: "Hold", color: "#ccbfff",
          apply: () => { game.player.held = Math.max(game.player.held || 0, 1); game.player.slowed = Math.max(game.player.slowed || 0, 2); } },
        lightningBolt: { text: "tears a line of lightning through the room", label: "Bolt", color: "#ffe27a",
          apply: () => { game.damageActor(m, game.player, roll(3, 5) + Math.floor(game.currentDepth / 2), "magic"); } },
        frostBolt: { text: "lashes you with freezing magic", label: "Frost", color: "#9ad7ff",
          apply: () => { game.damageActor(m, game.player, roll(2, 5) + Math.floor(game.currentDepth / 2), "cold"); game.player.slowed = Math.max(game.player.slowed || 0, 2); } }
      };

      const effect = SPELL_FX[spellId];
      if (effect) {
        game.log(`${m.name} ${effect.text}.`, "bad");
        game.emitReadout(effect.label, m.x, m.y, effect.color, 340);
        game.playProjectile(m, game.player, effect.color);
        effect.apply();
      } else {
        game.log(`${m.name} hurls dark magic.`, "bad");
        game.emitReadout("Cast", m.x, m.y, "#c9a5ff", 340);
        game.playProjectile(m, game.player, "#c9a5ff");
        game.damageActor(m, game.player, roll(2, 5) + game.currentDepth, "magic");
      }

      if (isSummoner && Math.random() < 0.12) {
        summonMonsterNear(game.currentLevel, m.x, m.y, weightedMonster(game.currentDepth));
        game.log(`${m.name} calls for aid from the dark.`, "bad");
        game.emitReadout("Summon", m.x, m.y, "#d6a8ff", 360);
      }
      if (m.abilities?.includes("teleport") && Math.random() < 0.2) {
        const pos = game.findSafeTile(game.currentLevel, 12);
        if (pos) {
          m.x = pos.x;
          m.y = pos.y;
          game.addEffect({ type: "blink", x: m.x, y: m.y, color: "#ba8eff", until: nowTime() + 180 });
        }
      }
      return true;
    }
  },

  {
    id: "charge_windup",
    condition: (game, m, ctx) =>
      ctx.canSeePlayer && m.abilities?.includes("charge") &&
      ctx.distanceToPlayer >= 2 && ctx.distanceToPlayer <= 4 &&
      (ctx.dx === 0 || ctx.dy === 0 || Math.abs(ctx.dx) === Math.abs(ctx.dy)) &&
      hasLineOfSight(game.currentLevel, m.x, m.y, game.player.x, game.player.y) &&
      Math.random() < 0.4,
    action: (game, m, ctx) => {
      m.chargeWindup = { dx: Math.sign(ctx.dx), dy: Math.sign(ctx.dy) };
      game.emitTelegraphPulse(m.x, m.y, "#ff9f6b", 260);
      game.emitReadout("Charge", m.x, m.y, "#ffb487", 340);
      if (isVisible(game.currentLevel, m.x, m.y)) {
        game.log(`${m.name} lowers itself for a brutal rush.`, "warning");
      }
      return true;
    }
  },

  {
    id: "stalker_retreat",
    condition: (game, m, ctx) =>
      m.behaviorKit === "stalker" && m.alerted > 0 &&
      ctx.canSeePlayer && ctx.distanceToPlayer <= 3,
    action: (game, m) => {
      const retreat = findRetreat(game, m);
      if (!retreat) return false;
      m.x = retreat.x;
      m.y = retreat.y;
      return true;
    }
  },

  {
    id: "skirmish_retreat",
    condition: (game, m, ctx) =>
      m.tactic === "skirmish" && m.alerted > 0 && ctx.distanceToPlayer <= 4,
    action: (game, m) => {
      const retreat = findRetreat(game, m);
      if (!retreat) return false;
      m.x = retreat.x;
      m.y = retreat.y;
      return true;
    }
  }
];

/**
 * Execute one monster's turn using the behavior table.
 * Called by processMonsters in combat.js for each actor.
 * @param {object} game
 * @param {object} monster
 * @param {object} ctx - precomputed context from buildMonsterContext
 * @param {function} canSpendMovement - movement budget check
 * @mutates monster.x, monster.y, monster.chargeWindup, monster.mana,
 *          game.player.held, game.player.slowed
 */
export function executeMonsterBehavior(game, monster, ctx, canSpendMovement) {
  for (const behavior of MONSTER_BEHAVIORS) {
    if (behavior.condition(game, monster, ctx)) {
      ctx.canSpendMovement = canSpendMovement();
      if (behavior.action(game, monster, ctx)) return true;
    }
  }
  return false;
}
