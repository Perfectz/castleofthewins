/**
 * @module objectives
 * @owns Floor objectives, optional greed encounters, objective/optional resolution
 * @reads game.currentLevel, game.currentDepth, game.player, game.townUnlocks
 * @mutates level.floorObjective, level.floorOptional, level.floorResolved,
 *          level.items, level.actors, level.tiles
 * @emits game.log, game.emitReadout
 */
import { OBJECTIVE_DEFS, OPTIONAL_ENCOUNTER_DEFS, RUMOR_DEFS } from "../data/content.js";
import { createItem, rollTreasure } from "../core/entities.js";
import {
  actorAt,
  addLevelProp,
  centerOf,
  itemsAt,
  randomRoomTile,
  revealCircle,
  setTile,
  tileDef
} from "../core/world.js";
import { choice, distance, randInt, shuffle } from "../core/utils.js";
import { spawnObjectiveGuard } from "./encounters.js";

function getAvailableOptionals(townUnlocks = {}) {
  return Object.values(OPTIONAL_ENCOUNTER_DEFS).filter((optional) => !optional.unlock || townUnlocks[optional.unlock]);
}

function getDirectiveRooms(level) {
  const safeRoomIndexes = new Set(level.safeEntryRoomIndexes || [0]);
  const reservedRoomIndexes = new Set(level.reservedRoomIndexes || []);
  if (typeof level.exitRoomIndex === "number") {
    reservedRoomIndexes.add(level.exitRoomIndex);
  }
  const rooms = (level.rooms || []).filter((room, index) => index > 0 && !safeRoomIndexes.has(index) && !reservedRoomIndexes.has(index));
  const fallbackRooms = (level.rooms || []).filter((room, index) => index > 0 && !reservedRoomIndexes.has(index));
  return rooms.length >= 2 ? rooms : fallbackRooms;
}

function roomsOverlapOrTouch(left, right) {
  if (!left || !right) {
    return false;
  }
  return !(
    left.x + left.w + 1 < right.x
    || right.x + right.w + 1 < left.x
    || left.y + left.h + 1 < right.y
    || right.y + right.h + 1 < left.y
  );
}

function placeObjectiveTile(level, room, tileKind, extra = {}) {
  const position = randomRoomTile(room);
  setTile(level, position.x, position.y, tileDef(tileKind, extra));
  return position;
}

function placeObjectiveItem(level, room, objectiveId, depth, options = {}) {
  const {
    itemName = depth >= 4 ? "Storm Sigil" : "Wind Relic",
    rewardType = "relic"
  } = options;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const position = randomRoomTile(room);
    if (actorAt(level, position.x, position.y) || itemsAt(level, position.x, position.y).length > 0) {
      continue;
    }
    const item = {
      ...createItem("goldCharm", { id: `objectiveRelic${depth}`, name: itemName }),
      kind: "objective",
      objectiveId,
      rewardType,
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

function roomCorners(room) {
  return [
    { x: room.x + 1, y: room.y + 1 },
    { x: room.x + room.w - 2, y: room.y + 1 },
    { x: room.x + 1, y: room.y + room.h - 2 },
    { x: room.x + room.w - 2, y: room.y + room.h - 2 }
  ];
}

function addRoomTorches(level, room, propId = "roomTorch", count = 2) {
  roomCorners(room).slice(0, count).forEach((corner, index) => {
    addLevelProp(level, {
      id: `${propId}-${room.x}-${room.y}-${index}`,
      x: corner.x,
      y: corner.y,
      propId,
      layer: "fixture",
      light: true
    });
  });
}

const LIT_MARKER_PROPS = new Set(["relicPedestal", "shrineSeal", "bloodAltar", "ghostMerchant", "well", "beaconFocus"]);

function addRoomDress(level, room, objectiveId, optionalId = "") {
  if (objectiveId === "recover_relic" || objectiveId === "recover_waystone") {
    addRoomTorches(level, room, "roomTorch", 4);
    return;
  }
  if (objectiveId === "rescue_captive") {
    addRoomTorches(level, room, "shrineTorch", 2);
    addLevelProp(level, {
      id: `rescue-banner-${room.x}-${room.y}`,
      x: room.x + Math.max(1, Math.floor(room.w / 2)),
      y: room.y + 1,
      propId: "rescueBanner",
      layer: "fixture"
    });
    return;
  }
  if (objectiveId === "purge_nest") {
    addRoomTorches(level, room, "roomTorch", 2);
    return;
  }
  if (objectiveId === "seal_shrine" || objectiveId === "purify_well") {
    addRoomTorches(level, room, "shrineTorch", 4);
    return;
  }
  if (optionalId === "vault_room") {
    addRoomTorches(level, room, "roomTorch", 2);
  }
}

function decorateObjectiveMarker(level, objective, room) {
  if (!objective?.marker) {
    return;
  }
  const propId = objective.visualId || "relicPedestal";
  addLevelProp(level, {
    id: `objective-${objective.id}-${objective.marker.x}-${objective.marker.y}`,
    x: objective.marker.x,
    y: objective.marker.y,
    propId,
    layer: "fixture",
    light: LIT_MARKER_PROPS.has(propId)
  });
  addRoomDress(level, room, objective.id);
}

function decorateOptionalMarker(level, optional, room) {
  if (!optional?.marker) {
    return;
  }
  addLevelProp(level, {
    id: `optional-${optional.id}-${optional.marker.x}-${optional.marker.y}`,
    x: optional.marker.x,
    y: optional.marker.y,
    propId: optional.visualId || "vaultChest",
    layer: "fixture",
    light: LIT_MARKER_PROPS.has(optional.visualId || "vaultChest")
  });
  addRoomDress(level, room, "", optional.id);
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
  } else if (objectiveId === "secure_supplies") {
    objective.marker = placeObjectiveItem(level, room, objectiveId, depth);
    if (objective.marker) {
      const cacheItem = level.items.find((entry) => entry.objectiveId === objectiveId && entry.x === objective.marker.x && entry.y === objective.marker.y);
      if (cacheItem) {
        cacheItem.name = "Field Cache";
      }
    }
    objective.detail = "Recover the sealed cache and carry the supplies back into the run.";
  } else if (objectiveId === "recover_waystone") {
    objective.marker = placeObjectiveItem(level, room, objectiveId, depth, {
      itemName: depth >= 4 ? "Storm Waystone" : "Survey Waystone",
      rewardType: "rumor"
    });
    objective.detail = "Recover the waystone and cash it into cleaner route intel for what comes next.";
  } else if (objectiveId === "secure_ledger") {
    objective.marker = placeObjectiveItem(level, room, objectiveId, depth, {
      itemName: depth >= 4 ? "Storm Ledger" : "Survey Ledger",
      rewardType: "rumor"
    });
    objective.detail = "Recover the route ledger and turn it into cleaner pathing for the next descent.";
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
  } else if (objectiveId === "purify_well") {
    objective.marker = placeObjectiveTile(level, room, "fountain", {
      label: "Purifying Well",
      objectiveId,
      objectiveAction: "purifyWell"
    });
    objective.detail = "Clear the room, then purify the well for a clean refill before the floor answers back.";
  } else if (objectiveId === "break_beacon") {
    objective.marker = placeObjectiveTile(level, room, "altar", {
      label: "Alarm Beacon",
      objectiveId,
      objectiveAction: "breakBeacon"
    });
    objective.detail = "Clear the room, then smash the beacon before it pulls more patrols into the floor.";
  } else if (objectiveId === "light_watchfire") {
    objective.marker = placeObjectiveTile(level, room, "altar", {
      label: "Watchfire Brazier",
      objectiveId,
      objectiveAction: "watchfire"
    });
    objective.detail = "Clear the chamber, then light the watchfire to reveal more of the floor before the keep answers back.";
  }

  spawnObjectiveGuard(level, depth, room, roomIndex, objectiveId);
  decorateObjectiveMarker(level, objective, room);
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
  } else if (optionalId === "scout_cache") {
    optional.marker = placeObjectiveTile(level, room, "throne", {
      label: "Scout Cache",
      optionalId,
      optionalAction: "scout"
    });
  } else if (optionalId === "smuggler_cache") {
    optional.marker = placeObjectiveTile(level, room, "throne", {
      label: "Smuggler Cache",
      optionalId,
      optionalAction: "smuggler"
    });
  } else if (optionalId === "oath_shrine") {
    optional.marker = placeObjectiveTile(level, room, "altar", {
      label: "Oath Shrine",
      optionalId,
      optionalAction: "oath"
    });
  } else if (optionalId === "pilgrim_pool") {
    optional.marker = placeObjectiveTile(level, room, "fountain", {
      label: "Pilgrim Pool",
      optionalId,
      optionalAction: "pilgrimPool"
    });
  } else if (optionalId === "moon_well") {
    optional.marker = placeObjectiveTile(level, room, "fountain", {
      label: "Moon Well",
      optionalId,
      optionalAction: "moonWell"
    });
  } else if (optionalId === "surveyor_stash") {
    optional.marker = placeObjectiveTile(level, room, "throne", {
      label: "Surveyor Stash",
      optionalId,
      optionalAction: "surveyor"
    });
  } else if (optionalId === "ember_cache") {
    optional.marker = placeObjectiveTile(level, room, "throne", {
      label: "Ember Cache",
      optionalId,
      optionalAction: "ember"
    });
  }

  decorateOptionalMarker(level, optional, room);
  return optional;
}

export function setupFloorDirectives(level, depth, townUnlocks = {}) {
  if (!level || level.kind !== "dungeon" || !level.rooms || level.rooms.length < 3) {
    return null;
  }
  if (level.milestone?.id === "depth7_stormwarden" || depth >= 7) {
    level.floorObjective = null;
    level.floorOptional = null;
    level.floorResolved = false;
    return { floorObjective: null, floorOptional: null };
  }
  const rooms = getDirectiveRooms(level);
  const entryPoint = centerOf(level.rooms[0]);
  const orderedRooms = shuffle(rooms).sort((left, right) => distance(centerOf(left), entryPoint) - distance(centerOf(right), entryPoint));
  const objectiveRoom = depth === 1
    ? orderedRooms[Math.min(1, orderedRooms.length - 1)]
    : orderedRooms[Math.max(0, orderedRooms.length - 1)];
  const optionalCandidates = (depth === 1 ? orderedRooms.slice().reverse() : orderedRooms.slice().reverse())
    .filter((room) => room && room !== objectiveRoom && !roomsOverlapOrTouch(room, objectiveRoom));
  const optionalRoom = optionalCandidates[0]
    || orderedRooms.find((room) => room && room !== objectiveRoom)
    || orderedRooms[0];
  const objectivePool = depth === 1
    ? ["recover_relic", "seal_shrine", "purge_nest", "rescue_captive"]
    : Object.keys(OBJECTIVE_DEFS);
  const objectiveId = choice(objectivePool);
  const availableOptionals = getAvailableOptionals(townUnlocks);
  const optionalId = depth === 1 && level.tutorialFloor
    ? null
    : availableOptionals.length > 0 ? choice(availableOptionals).id : null;

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

export function getObjectiveDefendersRemaining(level) {
  const roomIndex = level?.floorObjective?.roomIndex;
  if (roomIndex === undefined || roomIndex === null) {
    return 0;
  }
  return level.actors.filter((monster) => monster.roomIndex === roomIndex && monster.hp > 0).length;
}

function updatePropState(level, propId, nextPropId) {
  if (!level?.props) {
    return;
  }
  level.props.forEach((prop) => {
    if (prop.propId === propId) {
      prop.propId = nextPropId;
    }
  });
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
  if (game.recordTelemetry) {
    game.recordTelemetry("objective_resolved", {
      objectiveId: objective.id,
      rewardType: objective.rewardType || "relic",
      source: source || objective.id,
      searchCount: game.telemetry?.activeRun?.searchCount || 0
    });
  }
}

export function resolveFloorObjective(game, reason = "completed") {
  const objective = game.currentLevel?.floorObjective;
  if (!objective || objective.status === "resolved") {
    return false;
  }
  game.markOnboarding?.("clear_objective");
  objective.status = "resolved";
  game.currentLevel.floorResolved = true;
  game.floorResolved = true;
  const label = OBJECTIVE_DEFS[objective.id]?.label || "Objective";
  game.log(`${label} complete. Stairs up bank the floor now. Staying for greed will keep raising pressure.`, "good");
  if (objective.marker && game.emitReadout) {
    game.emitReadout("Objective", objective.marker.x, objective.marker.y, "#ffd3bf", 520);
  }
  if (game.increaseDanger) {
    game.increaseDanger("objective_clear", 1);
  }
  if (game.getObjectiveRumorBonus && game.grantRumorToken) {
    const rumorBonus = game.getObjectiveRumorBonus();
    if (rumorBonus > 0) {
      game.grantRumorToken(rumorBonus);
      game.log(`Contract payout: +${rumorBonus} rumor token${rumorBonus === 1 ? "" : "s"}.`, "good");
    }
  }
  game.onObjectiveResolved?.(objective.id);
  applyObjectiveReward(game, reason);
  return true;
}

export function handleObjectivePickup(game, item) {
  if (!item || !["recover_relic", "secure_supplies", "recover_waystone", "secure_ledger"].includes(item.objectiveId)) {
    return false;
  }
  game.markOnboarding?.("find_objective");
  resolveFloorObjective(game, "pickup");
  if (item.objectiveId === "secure_supplies") {
    game.log("You secure the cache and feel the floor shift around you.", "good");
  } else if (item.objectiveId === "recover_waystone") {
    game.log("You recover the waystone and the next route sharpens in your mind.", "good");
    game.revealGuidedObjectiveRoute?.("recover_waystone");
  } else if (item.objectiveId === "secure_ledger") {
    game.log("You recover the ledger and sketch a cleaner route for what comes next.", "good");
    game.grantRumorToken?.(1);
    game.revealGuidedObjectiveRoute?.("secure_ledger");
    game.revealGuidedObjectiveRoute?.("secure_ledger");
  } else {
    game.log("You secure the relic and feel the floor shift around you.", "good");
  }
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
  if (optionalId === "scout_cache") {
    game.grantRumorToken(1);
    return;
  }
  if (optionalId === "smuggler_cache" || optionalId === "pilgrim_pool") {
    game.grantRumorToken(1);
    return;
  }
  if (optionalId === "oath_shrine") {
    game.grantBoon(choice(["hunter_mark", "aether_cache"]));
    return;
  }
  if (optionalId === "ghost_merchant" || optionalId === "vault_room" || optionalId === "moon_well") {
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
  game.markOnboarding?.("choose_extract_or_greed");
  game.recordTelemetry?.("optional_triggered", {
    optionalId: optional.id
  });
  const greedGoldMultiplier = game.getGreedGoldMultiplier?.() ?? 1;
  const greedRumorBonus = game.getGreedRumorBonus?.() ?? 0;

  switch (optional.id) {
    case "cursed_cache": {
      const gold = Math.round(randInt(35, 85) * Math.max(1, game.currentDepth) * greedGoldMultiplier);
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
      updatePropState(game.currentLevel, "cacheClosed", "cacheOpen");
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
      const gold = Math.round(randInt(40, 110) * Math.max(1, game.currentDepth) * greedGoldMultiplier);
      game.player.gold += gold;
      game.log(`The vault yields ${gold} gold and draws attention from the floor.`, "good");
      updatePropState(game.currentLevel, "vaultChest", "openedChest");
      break;
    }
    case "scout_cache": {
      game.addItemToInventory(createItem("mappingScroll", { identified: true }));
      game.grantRumorToken?.(1);
      if (game.revealGuidedObjectiveRoute) {
        game.revealGuidedObjectiveRoute("scout_cache");
        game.revealGuidedObjectiveRoute("scout_cache");
      }
      game.log("The scout cache yields route notes and a clean mapping scroll.", "good");
      updatePropState(game.currentLevel, "cacheClosed", "cacheOpen");
      break;
    }
    case "smuggler_cache": {
      const gold = Math.round(randInt(28, 70) * Math.max(1, game.currentDepth) * greedGoldMultiplier);
      game.player.gold += gold;
      game.addItemToInventory(createItem("teleportScroll", { identified: true }));
      game.addItemToInventory(createItem("healingPotion", { identified: true }));
      game.log(`The smuggler cache yields ${gold} gold, a teleport scroll, and a field heal.`, "good");
      updatePropState(game.currentLevel, "cacheClosed", "cacheOpen");
      break;
    }
    case "oath_shrine": {
      const manaCost = Math.min(game.player.mana, 3);
      if (manaCost > 0) {
        game.player.mana -= manaCost;
      } else {
        game.player.hp = Math.max(1, game.player.hp - 4);
      }
      game.addItemToInventory(createItem("wardingAmulet", { identified: true }));
      game.log(manaCost > 0
        ? "The oath shrine drinks mana and leaves behind a warded charm."
        : "The oath shrine takes blood and leaves behind a warded charm.", "warning");
      break;
    }
    case "pilgrim_pool": {
      const curseCount = typeof game.removeCurses === "function" ? game.removeCurses() : 0;
      game.player.constitutionLoss = Math.max(0, (game.player.constitutionLoss || 0) - 2);
      game.player.hp = Math.min(game.player.maxHp, game.player.hp + 8);
      game.player.mana = Math.min(game.player.maxMana, game.player.mana + 6);
      game.log(curseCount > 0
        ? `The pilgrim pool lifts ${curseCount} curse${curseCount === 1 ? "" : "s"} and steadies your breathing.`
        : "The pilgrim pool steadies your breathing and clears the ache from the run.", "good");
      break;
    }
    case "moon_well": {
      game.player.hp = game.player.maxHp;
      game.player.mana = game.player.maxMana;
      for (let index = 0; index < 18; index += 1) {
        revealCircle(game.currentLevel, randInt(1, game.currentLevel.width - 2), randInt(1, game.currentLevel.height - 2), 2);
      }
      game.log("Moonlight floods the room, restoring you and sketching more of the floor.", "good");
      break;
    }
    case "surveyor_stash": {
      game.addItemToInventory(createItem("mappingScroll", { identified: true }));
      game.grantRumorToken?.(1);
      game.revealGuidedObjectiveRoute?.("surveyor_stash");
      game.revealGuidedObjectiveRoute?.("surveyor_stash");
      game.log("The surveyor stash yields route notes, a mapping scroll, and one clean rumor.", "good");
      updatePropState(game.currentLevel, "cacheClosed", "cacheOpen");
      break;
    }
    case "ember_cache": {
      const gold = Math.round(randInt(24, 60) * Math.max(1, game.currentDepth) * greedGoldMultiplier);
      game.player.gold += gold;
      game.addItemToInventory(createItem("healingPotion", { identified: true }));
      game.addItemToInventory(createItem("emberCharm", { identified: true }));
      game.log(`The ember cache yields ${gold} gold, a field heal, and a fire ward charm.`, "good");
      updatePropState(game.currentLevel, "cacheClosed", "cacheOpen");
      break;
    }
    default:
      return false;
  }

  if (game.increaseDanger) {
    const dangerBonus = game.getGreedDangerBonus?.() ?? 0;
    game.increaseDanger(`optional_${optional.id}`, (optional.id === "vault_room" ? 3 : 2) + dangerBonus);
  }
  if (game.recordChronicleEvent) {
    game.recordChronicleEvent("greed_choice", {
      optionalId: optional.id,
      label: optional.label,
      depth: game.currentDepth
    });
  }
  game.recordTelemetry?.("optional_triggered", {
    optionalId: optional.id,
    source: "interaction"
  });
  grantOptionalReward(game, optional.id);
  if (greedRumorBonus > 0 && game.grantRumorToken) {
    game.grantRumorToken(greedRumorBonus);
    game.log(`Contract payout: +${greedRumorBonus} rumor token${greedRumorBonus === 1 ? "" : "s"}.`, "good");
  }
  return true;
}

export function handleObjectiveInteraction(game, tile) {
  const objective = game.currentLevel?.floorObjective;
  if (objective && tile.objectiveId === objective.id) {
    game.markOnboarding?.("find_objective");
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
    if (objective.id === "purify_well") {
      if (!getObjectiveRoomClear(game)) {
        game.log("The well cannot be purified while enemies still hold the room.", "warning");
        return true;
      }
      game.player.hp = game.player.maxHp;
      game.player.mana = game.player.maxMana;
      game.player.constitutionLoss = Math.max(0, (game.player.constitutionLoss || 0) - 1);
      game.log("You purify the well and drink deep before the halls answer back.", "good");
      game.increaseDanger?.("fountain", 2);
      return resolveFloorObjective(game, "purify");
    }
    if (objective.id === "break_beacon") {
      game.log("You smash the beacon. The hall falls dark for a precious moment.", "good");
      return resolveFloorObjective(game, "beacon");
    }
    if (objective.id === "light_watchfire") {
      if (!getObjectiveRoomClear(game)) {
        game.log("The watchfire cannot be lit while enemies still hold the chamber.", "warning");
        return true;
      }
      for (let index = 0; index < 10; index += 1) {
        revealCircle(game.currentLevel, randInt(1, game.currentLevel.width - 2), randInt(1, game.currentLevel.height - 2), 2);
      }
      game.addItemToInventory(createItem("mappingScroll", { identified: true }));
      game.log("You light the watchfire. More of the floor answers in clean lines before the danger returns.", "good");
      return resolveFloorObjective(game, "watchfire");
    }
  }

  if (tile.optionalId) {
    return handleOptionalInteraction(game, tile);
  }

  return false;
}

export function getObjectiveStatusText(level) {
  if (!level || !level.floorObjective) {
    if (level?.milestone && level.milestone.status !== "cleared") {
      return `${level.milestone.name}: ${level.milestone.journal || "Break the guardian and press on."}`;
    }
    return "No active floor objective.";
  }
  if (level.floorResolved) {
    return `Objective cleared: ${level.floorObjective.shortLabel}. Extraction or greed.`;
  }
  const blockers = getObjectiveDefendersRemaining(level);
  if (blockers > 0) {
    return `${level.floorObjective.shortLabel}: ${level.floorObjective.detail || level.floorObjective.summary} ${blockers} defender${blockers === 1 ? "" : "s"} remain. Deeper stairs stay sealed until this is done.`;
  }
  return `${level.floorObjective.shortLabel}: ${level.floorObjective.detail || level.floorObjective.summary} Room clear. Step onto the marker to resolve it and unlock the stairs.`;
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
  const rumorPool = [RUMOR_DEFS.relic_hunt, RUMOR_DEFS.nest, RUMOR_DEFS.captive, RUMOR_DEFS.supplies, RUMOR_DEFS.waystone, RUMOR_DEFS.ledger, RUMOR_DEFS.shrine_path, RUMOR_DEFS.purify_well, RUMOR_DEFS.beacon, RUMOR_DEFS.watchfire].filter(Boolean);
  const rumor = choice(rumorPool);
  if (rumor && game.learnRumor) {
    game.learnRumor(rumor.id);
  }
}

export function getObjectiveRewardPreview(level) {
  if (!level || !level.floorObjective) {
    if (level?.milestone?.id === "depth7_stormwarden") {
      return "Runestone objective";
    }
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
