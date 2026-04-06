import { BOON_DEFS, PERK_DEFS, RELIC_DEFS, RUMOR_DEFS } from "../data/content.js";
import { createItem } from "../core/entities.js";
import { choice, clamp } from "../core/utils.js";

const CLASS_FAMILY = {
  Fighter: "fighter",
  Rogue: "rogue",
  Wizard: "wizard"
};

function uniqueChoicePool(entries, excludeIds = []) {
  const excluded = new Set(excludeIds);
  return entries.filter((entry) => !excluded.has(entry.id));
}

function weightedDraw(entries, count = 3, excludeIds = []) {
  const available = uniqueChoicePool(entries, excludeIds);
  const picks = [];
  const blocked = new Set(excludeIds);
  while (picks.length < count && available.length > 0) {
    const bucket = [];
    available.forEach((entry) => {
      if (blocked.has(entry.id)) {
        return;
      }
      const weight = entry.weight || 1;
      for (let i = 0; i < weight; i += 1) {
        bucket.push(entry);
      }
    });
    if (bucket.length === 0) {
      break;
    }
    const next = choice(bucket);
    blocked.add(next.id);
    picks.push(next);
  }
  return picks;
}

export function ensureBuildState(game) {
  if (!game.player) {
    return;
  }
  game.player.perks = Array.isArray(game.player.perks) ? game.player.perks : [];
  game.player.relics = Array.isArray(game.player.relics) ? game.player.relics : [];
  game.player.runCurrencies = {
    rumorTokens: 0,
    hunterMark: 0,
    templeFavor: 0,
    ...(game.player.runCurrencies || {})
  };
  game.pendingPerkChoices = game.pendingPerkChoices || 0;
  game.pendingRewardChoice = game.pendingRewardChoice || null;
  game.pendingRewardQueue = Array.isArray(game.pendingRewardQueue) ? game.pendingRewardQueue : [];
  game.player.knownRumors = Array.isArray(game.player.knownRumors) ? game.player.knownRumors : [];
}

export function hasPerk(game, perkId) {
  return Boolean(game.player?.perks?.includes(perkId));
}

export function hasRelic(game, relicId) {
  return Boolean(game.player?.relics?.includes(relicId));
}

export function getPerkFamily(game) {
  return CLASS_FAMILY[game.player?.className] || "fighter";
}

export function getPerkChoices(game, count = 3) {
  ensureBuildState(game);
  const family = getPerkFamily(game);
  const pool = Object.values(PERK_DEFS).filter((perk) => perk.family === family);
  return weightedDraw(pool, count, game.player.perks);
}

export function queuePerkChoice(game, count = 1) {
  ensureBuildState(game);
  game.pendingPerkChoices += count;
}

function buildRewardChoice(type, source, options) {
  return {
    type,
    source,
    options: options.map((entry) => entry.id)
  };
}

export function queueObjectiveReward(game, source = "objective", rewardType = "relic") {
  ensureBuildState(game);
  if (rewardType === "rumor") {
    grantRumorToken(game, 1);
    const rumor = choice(Object.values(RUMOR_DEFS));
    if (rumor) {
      learnRumor(game, rumor.id);
    }
    return null;
  }
  if (rewardType === "boon") {
    const options = weightedDraw(Object.values(BOON_DEFS), 3);
    if (options.length === 0) {
      return null;
    }
    const choiceState = buildRewardChoice("boon", source, options);
    game.pendingRewardQueue.push(choiceState);
    return choiceState;
  }
  const options = weightedDraw(Object.values(RELIC_DEFS), 3, game.player.relics);
  if (options.length === 0) {
    return queueObjectiveReward(game, source, "boon");
  }
  const choiceState = buildRewardChoice("relic", source, options);
  game.pendingRewardQueue.push(choiceState);
  return choiceState;
}

export function prepareNextRewardChoice(game) {
  ensureBuildState(game);
  if (game.pendingRewardChoice) {
    return game.pendingRewardChoice;
  }
  if (game.pendingPerkChoices > 0) {
    const options = getPerkChoices(game, 3);
    if (options.length > 0) {
      game.pendingRewardChoice = buildRewardChoice("perk", "level", options);
      return game.pendingRewardChoice;
    }
    game.pendingPerkChoices = 0;
  }
  if (game.pendingRewardQueue.length > 0) {
    game.pendingRewardChoice = game.pendingRewardQueue.shift();
    return game.pendingRewardChoice;
  }
  return null;
}

export function clearRewardChoice(game) {
  game.pendingRewardChoice = null;
}

export function chooseReward(game, rewardId) {
  ensureBuildState(game);
  const choiceState = game.pendingRewardChoice;
  if (!choiceState) {
    return false;
  }
  if (!choiceState.options.includes(rewardId)) {
    return false;
  }

  if (choiceState.type === "perk") {
    if (!game.player.perks.includes(rewardId)) {
      game.player.perks.push(rewardId);
      game.log(`${game.player.name} learns ${PERK_DEFS[rewardId].name}.`, "good");
      game.pendingPerkChoices = Math.max(0, game.pendingPerkChoices - 1);
    }
  } else if (choiceState.type === "relic") {
    if (!game.player.relics.includes(rewardId)) {
      game.player.relics.push(rewardId);
      game.log(`You claim ${RELIC_DEFS[rewardId].name}.`, "good");
    }
  } else if (choiceState.type === "boon") {
    grantBoon(game, rewardId);
  } else {
    return false;
  }

  clearRewardChoice(game);
  game.recalculateDerivedStats?.();
  return true;
}

export function hasPendingProgressionChoice(game) {
  ensureBuildState(game);
  return game.pendingPerkChoices > 0 || Boolean(game.pendingRewardChoice) || game.pendingRewardQueue.length > 0 || game.pendingSpellChoices > 0;
}

export function grantBoon(game, boonId) {
  ensureBuildState(game);
  const boon = BOON_DEFS[boonId];
  if (!boon) {
    return false;
  }
  if (boonId === "windfall") {
    const gold = 60 + Math.max(0, game.currentDepth) * 20;
    game.player.gold += gold;
    grantRumorToken(game, 1);
    game.log(`Windfall: ${gold} gold and one rumor token.`, "good");
  } else if (boonId === "field_medicine") {
    game.player.hp = game.player.maxHp;
    game.addItemToInventory(createItem("healingPotion", { identified: true }));
    game.log("Field Medicine: full recovery and one healing potion.", "good");
  } else if (boonId === "aether_cache") {
    game.player.mana = game.player.maxMana;
    game.addItemToInventory(createItem("manaPotion", { identified: true }));
    game.log("Aether Cache: full mana and one mana potion.", "good");
  } else if (boonId === "hunter_mark") {
    game.player.runCurrencies.hunterMark += 1;
    game.log("Hunter's Mark: the next elite will yield extra value.", "good");
  }
  return true;
}

export function grantRumorToken(game, amount = 1) {
  ensureBuildState(game);
  game.player.runCurrencies.rumorTokens += amount;
}

export function learnRumor(game, rumorId) {
  ensureBuildState(game);
  if (!game.player.knownRumors.includes(rumorId)) {
    game.player.knownRumors.push(rumorId);
  }
}

export function getKnownRumors(game) {
  ensureBuildState(game);
  return game.player.knownRumors.map((id) => RUMOR_DEFS[id]).filter(Boolean);
}

export function getBuildArmorBonus(game) {
  let armor = 0;
  if (hasPerk(game, "shield_mastery") && game.player.equipment?.offhand) {
    armor += 2;
  }
  if (hasPerk(game, "warding")) {
    armor += 1;
  }
  if (game.player.tempGuard) {
    armor += game.player.tempGuard;
  }
  if ((game.player.arcaneWardTurns || 0) > 0) {
    armor += 2;
  }
  if ((game.player.stoneSkinTurns || 0) > 0) {
    armor += 4;
  }
  if (hasRelic(game, "survivor_talisman")) {
    armor += 1;
  }
  return armor;
}

export function getBuildEvadeBonus(game) {
  let evade = 0;
  const burden = game.getEncumbranceTier ? game.getEncumbranceTier() : 0;
  if (hasPerk(game, "evasion")) {
    evade += burden === 0 ? 4 : 2;
  }
  if (hasRelic(game, "fleet_boots")) {
    evade += 1;
  }
  return evade;
}

export function getBuildAttackBonus(game, defender) {
  let bonus = 0;
  if (hasPerk(game, "backstab") && defender && (defender.sleeping || (defender.alerted || 0) <= 1)) {
    bonus += 3;
  }
  if (game.player.runCurrencies?.hunterMark > 0 && defender?.elite) {
    bonus += 2;
  }
  if (hasRelic(game, "anchoring_pin") && defender?.abilities?.includes("summon")) {
    bonus += 1;
  }
  return bonus;
}

export function getBuildDamageBonus(game, defender, damageType = "physical") {
  let bonus = 0;
  if (hasPerk(game, "blooded") && game.player.maxHp > 0 && game.player.hp / game.player.maxHp <= 0.5) {
    bonus += 2;
  }
  if (hasPerk(game, "backstab") && defender && (defender.sleeping || (defender.alerted || 0) <= 1)) {
    bonus += 3;
  }
  if (hasPerk(game, "element_focus") && damageType !== "physical") {
    bonus += 2;
  }
  if (hasRelic(game, "cursed_prism")) {
    const cursedCount = [...game.player.inventory, ...Object.values(game.player.equipment || {}).filter(Boolean)]
      .filter((item) => item.cursed)
      .length;
    bonus += clamp(cursedCount, 0, 3);
  }
  return bonus;
}

export function getBuildMaxHpBonus(game) {
  return hasRelic(game, "survivor_talisman") ? 8 : 0;
}

export function getBuildMaxManaBonus(game) {
  return hasPerk(game, "warding") ? 4 : 0;
}

export function getBuildSearchBonus(game) {
  let bonus = 0;
  if (hasPerk(game, "trap_sense")) {
    bonus += 5;
  }
  if (hasRelic(game, "hunter_map")) {
    bonus += 2;
  }
  return bonus;
}

export function getSpellCost(game, spell) {
  const base = spell.cost || 0;
  if (hasPerk(game, "spell_efficiency")) {
    return Math.max(1, base - 1);
  }
  return base;
}

export function getOvercastLoss(game, shortage) {
  if (hasPerk(game, "overcast_control")) {
    return Math.max(1, shortage - 1);
  }
  return shortage;
}

export function onPlayerWait(game) {
  if (hasPerk(game, "brace")) {
    game.player.tempGuard = 2;
  }
}

export function onPlayerMove(game) {
  game.player.tempGuard = 0;
}

export function onMonsterKilled(game, monster) {
  if (hasPerk(game, "cleave")) {
    const splash = game.currentLevel.actors.find((other) => other !== monster && Math.max(Math.abs(other.x - monster.x), Math.abs(other.y - monster.y)) <= 1);
    if (splash) {
      splash.hp -= 2;
      game.log(`Cleave bites into ${splash.name}.`, "good");
      if (splash.hp <= 0) {
        game.killMonster(splash);
      }
    }
  }
  if (game.player.runCurrencies?.hunterMark > 0 && monster.elite) {
    game.player.runCurrencies.hunterMark -= 1;
    game.player.gold += 40 + game.currentDepth * 12;
    game.log("Hunter's Mark pays out in extra bounty.", "good");
  }
}
