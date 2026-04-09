/**
 * @module stat-helpers
 * @owns Pure stat calculation formulas for attack, damage, armor, evasion, HP, mana, speed, search
 * @reads Player stats, equipment bonuses, class/race data
 * @mutates None — pure functions, no game state dependency
 *
 * These formulas were extracted from game.js to be independently testable
 * and reusable. Game.js delegates to these via thin wrappers.
 */

import { CLASSES, RACES } from "../data/content.js";
import { getItemStrBonus, getItemDexBonus, getItemConBonus, getItemIntBonus } from "./entities.js";
import { clamp } from "./utils.js";

export function attackValueForStats(stats, weaponPower = 2) {
  return weaponPower + Math.floor(stats.str / 2);
}

export function damageRangeForStats(stats, weaponPower = 2) {
  return [1, Math.max(2, weaponPower + Math.floor(stats.str / 2))];
}

export function armorValueForStats(stats) {
  return Math.floor(stats.dex / 2);
}

export function evadeValueForStats(stats) {
  return 6 + Math.floor(stats.dex * 0.75);
}

export function searchRadiusForStats(stats) {
  return 2 + (stats.dex >= 15 || stats.int >= 15 ? 1 : 0) + (stats.int >= 18 ? 1 : 0);
}

export function moveSpeedForStats(stats) {
  return clamp(90 + (stats.dex - 10) * 5, 72, 130);
}

export function searchPowerForStats(stats, level = 1) {
  return stats.dex + stats.int + level * 2;
}

export function maxHpForStats(stats, level, className, constitutionLoss = 0, hpBase = 0) {
  const effectiveCon = Math.max(1, stats.con - constitutionLoss);
  return Math.max(10, hpBase + level * 2 + effectiveCon + Math.floor(effectiveCon / 2) + (className === "Fighter" ? 4 : 0));
}

export function maxManaForStats(stats, className, bonusMana = 0, manaBase = 0) {
  return Math.max(0, manaBase + Math.floor(stats.int * 0.75) + bonusMana + (className === "Wizard" ? 6 : 0));
}

export function equipmentStatBonuses(actor) {
  const bonuses = { str: 0, dex: 0, con: 0, int: 0 };
  if (!actor?.equipment) return bonuses;
  Object.values(actor.equipment).forEach((item) => {
    if (!item) return;
    bonuses.str += getItemStrBonus(item);
    bonuses.dex += getItemDexBonus(item);
    bonuses.con += getItemConBonus(item);
    bonuses.int += getItemIntBonus(item);
  });
  return bonuses;
}

export function actorStats(actor) {
  if (!actor?.stats) return { str: 0, dex: 0, con: 0, int: 0 };
  const eq = equipmentStatBonuses(actor);
  return {
    str: actor.stats.str + eq.str,
    dex: actor.stats.dex + eq.dex,
    con: actor.stats.con + eq.con,
    int: actor.stats.int + eq.int
  };
}

export function playerRaceTemplate(player) {
  return RACES.find((race) => race.name === player.race) || null;
}

export function playerClassTemplate(player) {
  return CLASSES.find((role) => role.name === player.className) || null;
}

export function playerHpBase(player) {
  if (typeof player.hpBase === "number") return player.hpBase;
  const race = playerRaceTemplate(player);
  const role = playerClassTemplate(player);
  return (race ? race.hp : 0) + (role ? role.bonuses.hp : 0);
}

export function playerManaBase(player) {
  if (typeof player.manaBase === "number") return player.manaBase;
  const race = playerRaceTemplate(player);
  const role = playerClassTemplate(player);
  return (race ? race.mana : 0) + (role ? role.bonuses.mana : 0);
}

export function levelProgress(player) {
  const safePlayer = player || {};
  const level = Math.max(1, safePlayer.level || 1);
  let previousThreshold = 0;
  let nextThreshold = 80;
  for (let currentLevel = 1; currentLevel < level; currentLevel += 1) {
    previousThreshold = nextThreshold;
    nextThreshold = Math.floor(nextThreshold * 1.58);
  }
  nextThreshold = safePlayer.nextLevelExp || nextThreshold;
  const exp = Math.max(0, safePlayer.exp || 0);
  const levelSpan = Math.max(1, nextThreshold - previousThreshold);
  const gained = clamp(exp - previousThreshold, 0, levelSpan);
  return {
    exp,
    previousThreshold,
    nextThreshold,
    gained,
    remaining: Math.max(0, nextThreshold - exp),
    percent: clamp(Math.round((gained / levelSpan) * 100), 0, 100)
  };
}

export function burdenUiState(weight, capacity) {
  const safeCapacity = Math.max(1, capacity || 1);
  const ratio = weight / safeCapacity;
  let state = "safe";
  let label = "Light load";
  if (ratio > 1) {
    state = "overloaded";
    label = "Overloaded";
  } else if (ratio >= 0.95) {
    state = "danger";
    label = "Near limit";
  } else if (ratio >= 0.8) {
    state = "warning";
    label = "Heavy load";
  }
  return {
    weight,
    capacity: safeCapacity,
    ratio,
    percent: clamp(Math.round(ratio * 100), 0, 130),
    state,
    label
  };
}
