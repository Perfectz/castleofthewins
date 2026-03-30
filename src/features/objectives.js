import { BOON_DEFS, OBJECTIVE_DEFS, OPTIONAL_ENCOUNTER_DEFS, RELIC_DEFS, RUMOR_DEFS } from "../data/content.js";
import { createItem, rollTreasure } from "../core/entities.js";
import { actorAt, itemsAt, randomRoomTile, setTile, tileDef } from "../core/world.js";
import { choice, randInt, shuffle } from "../core/utils.js";
import { spawnObjectiveGuard } from "./encounters.js";

function getAvailableOptionals(townUnlocks = {}) {
  return Object.values(OPTIONAL_ENCOUNTER_DEFS).filter((optional) => !optional.unlock || townUnlocks[optional.unlock]);
}

function placeObjectiveTile(level, room, tileKind, extra = {}) {
  const position = randomRoomTile(room);
  setTile(level, position.x, position.y, tileDef(tileKind, extra));
  return position;
}

function placeObjectiveItem(level, room, objectiveId, depth) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const position = randomRoomTile(room);
    if (actorAt(level, position.x, position.y) || itemsAt(level, position.x, position.y).length > 0) {
      continue;
    }
    const item = {
      ...createItem("goldCharm", { id: `objectiveRelic${depth}`, name: depth >= 4 ? "Storm Sigil" : "Wind Relic" }),
      kind: "objective",
      objectiveId,
      rewardType: "relic",
      x: position.x,
      y: position.y,
      value: 0,
      identified: true,
      weight: 0
    };
    level.items.push(item);
    return { x: position.x, y: position.y };
  }
  return null;
}

function setupObjectiveState(level, depth, objectiveId, room, roomIndex) {
  const definition = OBJECTIVE_DEFS[objectiveId];
  const objective = {
    ...definition,
    status: "active",
    roomIndex,
    rewardClaimed: false,
    marker: null,
    detail: ""
  };

  if (objectiveId === "recover_relic") {
    objective.marker = placeObjectiveItem(level, room, objectiveId, depth);
    objective.detail = "Claim the relic and survive the greed decision that follows.";
  } else if (objectiveId === "purge_nest") {
    objective.marker = placeObjectiveTile(level, room, "throne", {
      label: "Brood Nest",
      objectiveId,
      objectiveAction: "purge"
    });
    objective.detail = "Kill the nest guardians, then crush the brood.";
  } else if (objectiveId === "rescue_captive") {
    objective.marker = placeObjectiveTile(level, room, "fountain", {
      label: "Prison Cell",
      objectiveId,
      objectiveAction: "rescue",
      captiveName: choice(["Alda", "Seren", "Brom", "Mira"])
    });
    objective.detail = "Reach the captive and get them free before the floor closes in.";
  } else if (objectiveId === "seal_shrine") {
    objective.marker = placeObjectiveTile(level, room, "altar", {
      label: "Ruin Shrine",
      objectiveId,
      objectiveAction: "seal"
    });
    objective.detail = "Seal the shrine and weather the answer from the floor.";
  }

  spawnObjectiveGuard(level, depth, room, roomIndex);
  return objective;
}

function setupOptionalState(level, depth, optionalId, room, roomIndex) {
  const definition = OPTIONAL_ENCOUNTER_DEFS[optionalId];
  const optional = {
    ...definition,
    status: "hidden",
    roomIndex,
    opened: false,
    marker: null
  };

  if (optionalId === "vault_room") {
    optional.marker = placeObjectiveTile(level, room, "throne", {
      label: "Locked Vault",
      optionalId,
      optionalAction: "vault"
    });
    for (let i = 0; i < 3; i += 1) {
      const position = randomRoomTile(room);
      if (!actorAt(level, position.x, position.y) && itemsAt(level, position.x, position.y).length === 0) {
        level.items.push({ ...rollTreasure(depth + 1), x: position.x, y: position.y });
      }
    }
  } else if (optionalId === "ghost_merchant") {
    optional.marker = placeObjectiveTile(level, room, "fountain", {
      label: "Ghost Merchant",
      optionalId,
      optionalAction: "merchant"
    });
  } else if (optionalId === "blood_altar") {
    optional.marker = placeObjectiveTile(level, room, "altar", {
      label: "Blood Altar",
      optionalId,
      optionalAction: "blood"
    });
  } else if (optionalId === "cursed_cache") {
    optional.marker = placeObjectiveTile(level, room, "throne", {
      label: "Cursed Cache",
      optionalId,
      optionalAction: "cache"
    });
  }

  return optional;
}

export function setupFloorDirectives(level, depth, townUnlocks = {}) {
  if (!level || level.kind !== "dungeon" || !level.rooms || level.rooms.length < 3) {
    return null;
  }
  const rooms = level.rooms.slice(1);
  const orderedRooms = shuffle(rooms);
  const objectiveRoom = orderedRooms[Math.max(0, orderedRooms.length - 1)];
  const optionalRoom = orderedRooms[Math.max(0, orderedRooms.length - 2)] || orderedRooms[0];
  const objectiveId = choice(Object.keys(OBJECTIVE_DEFS));
  const availableOptionals = getAvailableOptionals(townUnlocks);
  const optionalId = availableOptionals.length > 0 ? choice(availableOptionals).id : null;

  level.floorObjective = setupObjectiveState(level, depth, objectiveId, objectiveRoom, level.rooms.indexOf(objectiveRoom));
  level.floorOptional = optionalId ? setupOptionalState(level, depth, optionalId, optionalRoom, level.rooms.indexOf(optionalRoom)) : null;
  level.floorResolved = false;
  return { floorObjective: level.floorObjective, floorOptional: level.floorOptional };
}

export function syncFloorState(game) {
  const level = game.currentLevel;
  if (!level) {
    game.floorObjective = null;
    game.floorOptional = null;
    game.floorResolved = false;
    return;
  }
  game.floorObjective = level.floorObjective || null;
  game.floorOptional = level.floorOptional || null;
  game.floorResolved = Boolean(level.floorResolved);
}

export function getObjectiveRoomClear(game) {
  const roomIndex = game.currentLevel?.floorObjective?.roomIndex;
  if (roomIndex === undefined || roomIndex === null) {
    return true;
  }
  return !game.currentLevel.actors.some((monster) => monster.roomIndex === roomIndex && monster.hp > 0);
}

function applyObjectiveReward(game, source) {
  const objective = game.currentLevel?.floorObjective;
  if (!objective || objective.rewardClaimed) {
    return;
  }
  objective.rewardClaimed = true;
  if (game.offerObjectiveReward) {
    game.offerObjectiveReward(source || objective.id);
  }
  if (game.recordChronicleEvent) {
    game.recordChronicleEvent("objective_complete", {
      objectiveId: objective.id,
      label: objective.label,
      depth: game.currentDepth
    });
  }
}

export function resolveFloorObjective(game, reason = "completed") {
  const objective = game.currentLevel?.floorObjective;
  if (!objective || objective.status === "resolved") {
    return false;
  }
  objective.status = "resolved";
  game.currentLevel.floorResolved = true;
  game.floorResolved = true;
  const label = OBJECTIVE_DEFS[objective.id]?.label || "Objective";
  game.log(`${label} complete. The floor is now yours to cash out or greed.`, "good");
  if (game.increaseDanger) {
    game.increaseDanger("objective_clear", 1);
  }
  applyObjectiveReward(game, reason);
  return true;
}

export function handleObjectivePickup(game, item) {
  if (!item || item.objectiveId !== "recover_relic") {
    return false;
  }
  resolveFloorObjective(game, "pickup");
  game.log("You secure the relic and feel the floor shift around you.", "good");
  return true;
}

function grantOptionalReward(game, optionalId) {
  if (!game.grantBoon || !game.grantRumorToken) {
    return;
  }
  if (optionalId === "blood_altar") {
    game.grantBoon(choice(["field_medicine", "aether_cache"]));
    return;
  }
  if (optionalId === "cursed_cache") {
    game.grantBoon("windfall");
    return;
  }
  if (optionalId === "ghost_merchant" || optionalId === "vault_room") {
    game.grantRumorToken(1);
  }
}

export function handleOptionalInteraction(game, tile) {
  const optional = game.currentLevel?.floorOptional;
  if (!optional || optional.opened || tile.optionalId !== optional.id) {
    return false;
  }

  optional.opened = true;
  optional.status = "resolved";
  if (game.markGreedAction) {
    game.markGreedAction(optional.id);
  }

  switch (optional.id) {
    case "cursed_cache": {
      const gold = randInt(35, 85) * Math.max(1, game.currentDepth);
      game.player.gold += gold;
      game.addItemToInventory(rollTreasure(game.currentDepth + 1));
      if (Math.random() < 0.5) {
        const carried = [...game.player.inventory, ...Object.values(game.player.equipment).filter(Boolean)];
        if (carried.length > 0) {
          const item = choice(carried);
          item.cursed = true;
          item.identified = true;
        }
      }
      game.log(`The cache breaks open: ${gold} gold and one dangerous prize.`, "good");
      break;
    }
    case "ghost_merchant": {
      const price = Math.min(game.player.gold, 45 + game.currentDepth * 20);
      if (price > 0) {
        game.player.gold -= price;
      } else {
        game.player.hp = Math.max(1, game.player.hp - 4);
      }
      game.addItemToInventory(rollTreasure(game.currentDepth + 2));
      game.log(price > 0 ? `The ghost merchant takes ${price} gold and leaves a precise tool behind.` : "The ghost merchant takes blood instead of coin.", "warning");
      break;
    }
    case "blood_altar": {
      const pain = Math.max(3, randInt(2, 6) + Math.floor(game.currentDepth / 2));
      game.player.hp = Math.max(1, game.player.hp - pain);
      game.player.mana = game.player.maxMana;
      game.log(`The blood altar drinks ${pain} life and floods you with aether.`, "warning");
      break;
    }
    case "vault_room": {
      const gold = randInt(40, 110) * Math.max(1, game.currentDepth);
      game.player.gold += gold;
      game.log(`The vault yields ${gold} gold and draws attention from the floor.`, "good");
      break;
    }
    default:
      return false;
  }

  if (game.increaseDanger) {
    game.increaseDanger(`optional_${optional.id}`, optional.id === "vault_room" ? 3 : 2);
  }
  if (game.recordChronicleEvent) {
    game.recordChronicleEvent("greed_choice", {
      optionalId: optional.id,
      label: optional.label,
      depth: game.currentDepth
    });
  }
  grantOptionalReward(game, optional.id);
  return true;
}

export function handleObjectiveInteraction(game, tile) {
  const objective = game.currentLevel?.floorObjective;
  if (objective && tile.objectiveId === objective.id) {
    if (objective.id === "purge_nest") {
      if (!getObjectiveRoomClear(game)) {
        game.log("The nest still has living defenders. Clear the room first.", "warning");
        return true;
      }
      game.log("You burn the nest out and the floor quiets for a moment.", "good");
      return resolveFloorObjective(game, "nest");
    }
    if (objective.id === "rescue_captive") {
      if (!getObjectiveRoomClear(game)) {
        game.log("The captive cannot move while enemies still hold the room.", "warning");
        return true;
      }
      game.grantRumorToken?.(1);
      const name = tile.captiveName || "The captive";
      game.log(`${name} slips free and presses a rumor into your hands.`, "good");
      return resolveFloorObjective(game, "rescue");
    }
    if (objective.id === "seal_shrine") {
      game.player.mana = Math.max(0, game.player.mana - Math.min(game.player.mana, 3));
      game.log("You seal the shrine. The answer from the halls is immediate.", "warning");
      game.increaseDanger?.("seal_shrine", 2);
      return resolveFloorObjective(game, "seal");
    }
  }

  if (tile.optionalId) {
    return handleOptionalInteraction(game, tile);
  }

  return false;
}

export function getObjectiveStatusText(level) {
  if (!level || !level.floorObjective) {
    return "No active floor objective.";
  }
  if (level.floorResolved) {
    return `Objective cleared: ${level.floorObjective.shortLabel}. Extraction or greed.`;
  }
  return `${level.floorObjective.shortLabel}: ${level.floorObjective.detail || level.floorObjective.summary}`;
}

export function getOptionalStatusText(level) {
  if (!level || !level.floorOptional) {
    return null;
  }
  if (level.floorOptional.opened) {
    return `${level.floorOptional.label} spent. The floor knows you stayed greedy.`;
  }
  return `${level.floorOptional.label}: ${level.floorOptional.summary}`;
}

export function grantObjectiveRumor(game) {
  const rumorPool = [RUMOR_DEFS.relic_hunt, RUMOR_DEFS.nest, RUMOR_DEFS.captive].filter(Boolean);
  const rumor = choice(rumorPool);
  if (rumor && game.learnRumor) {
    game.learnRumor(rumor.id);
  }
}

export function getObjectiveRewardPreview(level) {
  if (!level || !level.floorObjective) {
    return null;
  }
  if (level.floorObjective.rewardType === "relic") {
    return "Relic reward";
  }
  if (level.floorObjective.rewardType === "rumor") {
    return "Rumor reward";
  }
  return "Boon choice";
}
