/**
 * @module encounters
 * @owns Monster pool selection, spawning, reinforcement waves
 * @reads game.currentDepth, game.currentLevel
 * @mutates game.currentLevel.actors (adds spawned monsters)
 */
import { DEPTH_THEMES, ENCOUNTER_TEMPLATES, MONSTER_DEFS, MONSTER_ROLES } from "../data/content.js";
import { createMonster, weightedMonster } from "../core/entities.js";
import { actorAt, isWalkable, randomRoomTile } from "../core/world.js";
import { choice, shuffle } from "../core/utils.js";

const FLOOR_SPECIAL_DEFS = {
  hunting_party: {
    id: "hunting_party",
    label: "Hunting Party",
    summary: "An awake elite patrol is stalking the halls ahead of the main squads.",
    introLog: "A hunting party is stalking this floor.",
    pressureLog: "The hunting party is driving fresh patrols forward.",
    templateBias: ["bruiser_hunt", "wolf_pack"],
    extraElite: true,
    mediumBandWave: true,
    reinforcementBias: "aggressive"
  },
  barricaded_rooms: {
    id: "barricaded_rooms",
    label: "Barricaded Rooms",
    summary: "Several chambers are fortified and holding larger formed squads.",
    introLog: "Barricaded rooms are holding bigger squads.",
    pressureLog: "The barricades are spilling extra defenders into the halls.",
    roomPressureBias: 1,
    largeSquads: true,
    templateBias: ["shield_wall", "kill_box"],
    reinforcementBias: "formed"
  },
  restless_dead: {
    id: "restless_dead",
    label: "Restless Dead",
    summary: "Control casters and summoners are feeding the crypt pressure.",
    introLog: "Crypt pressure is feeding additional summons.",
    pressureLog: "The restless dead are answering every surge in danger.",
    templateBias: ["summoner_escort", "crypt_control", "necromancer_screen"],
    reinforcementBias: "summons",
    highBandWave: true
  },
  warband: {
    id: "warband",
    label: "Warband",
    summary: "Coordinated raiders are pushing in larger melee-and-ranged packs.",
    introLog: "A warband is moving through the floor in formed pushes.",
    pressureLog: "The warband is pressing harder with every alarm.",
    roomPressureBias: 1,
    templateBias: ["orc_push", "kill_box", "bruiser_hunt"],
    reinforcementBias: "formed",
    highBandWave: true
  }
};

function getEncounterRooms(level) {
  const safeRoomIndexes = new Set(level.safeEntryRoomIndexes || [0]);
  const reservedRoomIndexes = new Set(level.reservedRoomIndexes || []);
  const rooms = (level.rooms || []).filter((room, index) => index > 0 && !safeRoomIndexes.has(index) && !reservedRoomIndexes.has(index));
  return rooms.length > 0 ? rooms : (level.rooms || []).slice(1);
}

function getMonsterRole(monsterId) {
  return MONSTER_ROLES[monsterId] || "frontliner";
}

function assignBehaviorKit(monster, depth, templateId = "", options = {}) {
  if (!monster) {
    return monster;
  }
  if (monster.unique && monster.id === "gatekeeper") {
    monster.behaviorKit = "banner_captain";
    return monster;
  }
  if (monster.unique && monster.id === "cryptlord") {
    monster.behaviorKit = "corpse_raiser";
    return monster;
  }
  if (monster.unique && monster.id === "stormWarden") {
    monster.behaviorKit = "breaker";
    return monster;
  }
  if (monster.elite) {
    monster.behaviorKit = depth >= 5
      ? choice(["breaker", "banner_captain", "stalker"])
      : choice(["banner_captain", "stalker"]);
    return monster;
  }
  if (templateId === "crypt_control" || templateId === "necromancer_screen") {
    if (monster.role === "controller" || monster.role === "summoner") {
      monster.behaviorKit = depth >= 5 ? "corpse_raiser" : "pinning_controller";
    }
    return monster;
  }
  if (templateId === "kill_box" && monster.role === "artillery") {
    monster.behaviorKit = "coward_caster";
    return monster;
  }
  if (templateId === "bruiser_hunt" && (monster.role === "hunter" || monster.role === "skirmisher")) {
    monster.behaviorKit = "stalker";
    return monster;
  }
  if (monster.role === "controller") {
    monster.behaviorKit = "pinning_controller";
  } else if (monster.role === "summoner") {
    monster.behaviorKit = depth >= 5 ? "corpse_raiser" : "coward_caster";
  } else if (monster.role === "hunter" || monster.tactic === "skirmish") {
    monster.behaviorKit = depth >= 3 ? "stalker" : "";
  } else if (monster.role === "elite" || monster.role === "frontliner") {
    monster.behaviorKit = depth >= 4 ? "breaker" : "";
  }
  if (options.objectiveGuard && !monster.behaviorKit && monster.role === "frontliner") {
    monster.behaviorKit = "banner_captain";
  }
  return monster;
}

function getSpecialDefinition(floorSpecial) {
  if (!floorSpecial) {
    return null;
  }
  if (typeof floorSpecial === "string") {
    return FLOOR_SPECIAL_DEFS[floorSpecial] || null;
  }
  return FLOOR_SPECIAL_DEFS[floorSpecial.id] || floorSpecial;
}

function getSquadSizeLimit(depth, options = {}) {
  if (typeof options.maxUnits === "number") {
    return Math.max(1, options.maxUnits);
  }
  const special = getSpecialDefinition(options.floorSpecial);
  if (options.objectiveGuard) {
    if (depth <= 2) {
      return 2;
    }
    return depth >= 5 ? 4 : 3;
  }
  if (depth <= 1) {
    return 2;
  }
  if (depth <= 3) {
    return special?.largeSquads ? 3 : 2;
  }
  if (depth <= 5) {
    return special?.largeSquads ? 4 : 3;
  }
  return 4;
}

export function getDynamicMonsterCap(depth) {
  if (depth <= 1) {
    return 6;
  }
  if (depth === 2) {
    return 9;
  }
  if (depth === 3) {
    return 11;
  }
  if (depth === 4) {
    return 13;
  }
  if (depth <= 6) {
    return 15;
  }
  return 17;
}

function getRoomBudget(rooms, depth, floorSpecial = null) {
  const special = getSpecialDefinition(floorSpecial);
  const roomPressureBias = special?.roomPressureBias || 0;
  if (depth <= 2) {
    return Math.min(3, Math.max(1, Math.floor(rooms.length * 0.34) + roomPressureBias));
  }
  if (depth === 3) {
    return Math.min(4, Math.max(2, Math.floor(rooms.length * 0.4) + roomPressureBias));
  }
  if (depth === 4) {
    return Math.min(4, Math.max(3, Math.floor(rooms.length * 0.46) + roomPressureBias));
  }
  if (depth <= 6) {
    return Math.min(5, Math.max(3, Math.floor(rooms.length * 0.52) + roomPressureBias));
  }
  return Math.min(6, Math.max(4, Math.floor(rooms.length * 0.58) + roomPressureBias));
}

function getMonstersForRole(depth, role, theme) {
  const preferredIds = theme && theme.monsterBias ? theme.monsterBias : [];
  const preferred = preferredIds
    .map((id) => MONSTER_DEFS.find((monster) => monster.id === id))
    .filter((monster) => monster && !monster.unique && monster.depth <= depth + 1 && getMonsterRole(monster.id) === role);
  const fallback = MONSTER_DEFS.filter((monster) => !monster.unique && monster.depth <= depth + 1 && getMonsterRole(monster.id) === role);
  return preferred.length > 0 ? preferred : fallback;
}

function findOpenTiles(level, room, count) {
  const positions = [];
  for (let attempt = 0; attempt < 32 && positions.length < count; attempt += 1) {
    const position = randomRoomTile(room);
    if (!isWalkable(level, position.x, position.y) || actorAt(level, position.x, position.y)) {
      continue;
    }
    if (positions.some((entry) => entry.x === position.x && entry.y === position.y)) {
      continue;
    }
    positions.push(position);
  }
  return positions;
}

function buildEliteName(monster, theme) {
  const prefixes = theme && theme.id === "crypts"
    ? ["Bonebound", "Ashen", "Graveborn", "Pale"]
    : theme && theme.id === "barracks"
      ? ["Iron", "Black", "Riven", "Red"]
      : ["Feral", "Hollow", "Dire", "Ruin"];
  return `${choice(prefixes)} ${monster.name}`;
}

function registerElite(level, monster) {
  level.activeEliteNames = Array.isArray(level.activeEliteNames) ? level.activeEliteNames : [];
  if (monster?.name && !level.activeEliteNames.includes(monster.name)) {
    level.activeEliteNames.push(monster.name);
  }
}

function chooseFloorSpecial(depth, theme) {
  if (depth <= 1) {
    return null;
  }
  if (theme?.id === "crypts") {
    return Math.random() < 0.7 ? FLOOR_SPECIAL_DEFS.restless_dead : FLOOR_SPECIAL_DEFS.hunting_party;
  }
  if (theme?.id === "barracks") {
    return Math.random() < 0.55 ? FLOOR_SPECIAL_DEFS.warband : FLOOR_SPECIAL_DEFS.barricaded_rooms;
  }
  return Math.random() < 0.5 ? FLOOR_SPECIAL_DEFS.hunting_party : FLOOR_SPECIAL_DEFS.barricaded_rooms;
}

export function getDepthTheme(depth) {
  return DEPTH_THEMES.find((theme) => theme.depths.includes(depth)) || DEPTH_THEMES[DEPTH_THEMES.length - 1];
}

export function pickEncounterTemplate(depth, theme, floorSpecial = null, options = {}) {
  const special = getSpecialDefinition(floorSpecial);
  const templates = (theme && theme.templates ? theme.templates : Object.keys(ENCOUNTER_TEMPLATES))
    .concat(special?.templateBias || [])
    .map((id) => ENCOUNTER_TEMPLATES[id])
    .filter(Boolean);
  if (templates.length === 0) {
    return ENCOUNTER_TEMPLATES.shield_wall;
  }
  const weighted = [];
  templates.forEach((template) => {
    let weight = 3;
    if (template.id === "necromancer_screen" && depth < 4) {
      weight = 1;
    }
    if (special?.templateBias?.includes(template.id)) {
      weight += 2;
    }
    if (options.objectiveGuard && (template.id === "shield_wall" || template.id === "necromancer_screen" || template.id === "kill_box")) {
      weight += 2;
    }
    for (let i = 0; i < weight; i += 1) {
      weighted.push(template);
    }
  });
  return choice(weighted);
}

export function spawnSquad(level, depth, room, theme, template, options = {}) {
  const roles = template.roles.slice(0, getSquadSizeLimit(depth, options));
  const positions = findOpenTiles(level, room, roles.length);
  if (positions.length === 0) {
    return [];
  }
  const monsters = [];
  roles.forEach((role, index) => {
    const pool = getMonstersForRole(depth, role, theme);
    const templateMonster = pool.length > 0 ? choice(pool) : weightedMonster(depth);
    const position = positions[index] || positions[positions.length - 1];
    if (!position || actorAt(level, position.x, position.y)) {
      return;
    }
    const monster = createMonster(templateMonster, position.x, position.y);
    monster.role = getMonsterRole(monster.id);
    monster.squadId = options.squadId || `${theme.id}-${room.x}-${room.y}`;
    monster.floorTheme = theme.id;
    monster.objectiveGuard = Boolean(options.objectiveGuard);
    monster.alerted = options.alerted || monster.alerted;
    monster.sleeping = options.forceAwake ? false : monster.sleeping;
    if (options.roomIndex !== undefined) {
      monster.roomIndex = options.roomIndex;
    }
    assignBehaviorKit(monster, depth, template.id, options);
    level.actors.push(monster);
    monsters.push(monster);
  });
  return monsters;
}

export function spawnNamedElite(level, depth, room, theme, options = {}) {
  const rolePool = [
    ...getMonstersForRole(depth + 1, "elite", theme),
    ...getMonstersForRole(depth + 1, "controller", theme),
    ...getMonstersForRole(depth + 1, "summoner", theme)
  ];
  const base = rolePool.length > 0 ? choice(rolePool) : MONSTER_DEFS[MONSTER_DEFS.length - 1];
  const position = findOpenTiles(level, room, 1)[0];
  if (!position) {
    return null;
  }
  const monster = createMonster(base, position.x, position.y);
  monster.role = "elite";
  monster.elite = true;
  monster.name = buildEliteName(monster, theme);
  monster.hp += 8 + depth * 2;
  monster.attack += 1 + Math.floor(depth / 3);
  monster.defense += 1 + Math.floor(depth / 4);
  monster.exp += 20 + depth * 8;
  monster.gold = [Math.max(monster.gold[0], 16 + depth * 4), Math.max(monster.gold[1], 28 + depth * 6)];
  monster.sleeping = false;
  monster.alerted = Math.max(monster.alerted || 0, options.forceAlerted ? 6 : 4);
  monster.floorTheme = theme.id;
  monster.objectiveGuard = Boolean(options.objectiveGuard);
  if (options.roomIndex !== undefined) {
    monster.roomIndex = options.roomIndex;
  }
  assignBehaviorKit(monster, depth, "elite", options);
  level.actors.push(monster);
  registerElite(level, monster);
  return monster;
}

function getPatrolRoom(level, rooms) {
  const safe = new Set(level.safeEntryRoomIndexes || [0]);
  const candidates = rooms.filter((room) => !safe.has(level.rooms.indexOf(room)));
  return candidates.length > 0 ? choice(candidates) : choice(rooms);
}

export function populateDungeonEncounters(level, depth) {
  const theme = getDepthTheme(depth);
  level.floorTheme = theme.id;
  level.floorThemeName = theme.name;
  level.activeEliteNames = [];
  level.namedEliteId = null;
  level.floorSpecial = chooseFloorSpecial(depth, theme);
  level.floorSpecialSummary = level.floorSpecial?.summary || "";
  level.reinforcementProfile = level.floorSpecial?.reinforcementBias || (theme.id === "crypts" ? "summons" : theme.id === "barracks" ? "formed" : "aggressive");
  const rooms = getEncounterRooms(level);
  const shuffledRooms = depth === 1 ? rooms : shuffle(rooms);
  const placedSquads = [];

  if (depth === 1) {
    const introTheme = {
      ...theme,
      monsterBias: ["kobold", "slinger", "rat"],
      templates: ["shield_wall", "ambush_cell"]
    };
    shuffledRooms.slice(0, Math.min(2, shuffledRooms.length)).forEach((room, index) => {
      const squad = spawnSquad(level, depth, room, introTheme, index === 0 ? ENCOUNTER_TEMPLATES.shield_wall : ENCOUNTER_TEMPLATES.ambush_cell, {
        squadId: `intro-${index}`,
        roomIndex: level.rooms.indexOf(room),
        maxUnits: index === 0 ? 1 : 2
      });
      if (squad.length > 0) {
        placedSquads.push({ room, templateId: index === 0 ? ENCOUNTER_TEMPLATES.shield_wall.id : ENCOUNTER_TEMPLATES.ambush_cell.id, squad });
      }
    });
    level.floorSpecial = null;
    level.floorSpecialSummary = "";
    level.reinforcementProfile = "quiet";
    return { theme: introTheme, placedSquads };
  }

  const roomBudget = getRoomBudget(rooms, depth, level.floorSpecial);
  shuffledRooms.forEach((room, index) => {
    if (index >= roomBudget) {
      return;
    }
    const template = pickEncounterTemplate(depth, theme, level.floorSpecial);
    const squad = spawnSquad(level, depth, room, theme, template, {
      squadId: `${theme.id}-${index}`,
      roomIndex: level.rooms.indexOf(room),
      floorSpecial: level.floorSpecial
    });
    if (squad.length > 0) {
      placedSquads.push({ room, templateId: template.id, squad });
    }
  });

  const eliteThreshold = depth >= 2;
  if (eliteThreshold && shuffledRooms.length > 0 && !level.milestone) {
    const eliteRoom = shuffledRooms[Math.min(shuffledRooms.length - 1, 1 + Math.floor(depth / 2))];
    const elite = spawnNamedElite(level, depth, eliteRoom, theme, {
      roomIndex: level.rooms.indexOf(eliteRoom)
    });
    if (elite) {
      level.namedEliteId = elite.name;
    }
  }

  if (level.floorSpecial?.extraElite && shuffledRooms.length > 1) {
    const patrolRoom = getPatrolRoom(level, shuffledRooms.slice(1));
    const patrolElite = spawnNamedElite(level, depth, patrolRoom, theme, {
      roomIndex: level.rooms.indexOf(patrolRoom),
      forceAlerted: true
    });
    if (patrolElite && !level.namedEliteId) {
      level.namedEliteId = patrolElite.name;
    }
  }

  return { theme, placedSquads };
}

function pickReinforcementTemplate(game, band, theme, floorSpecial = null) {
  const special = getSpecialDefinition(floorSpecial);
  if (game.currentDepth === 1) {
    return ENCOUNTER_TEMPLATES.ambush_cell;
  }
  if (special?.reinforcementBias === "summons") {
    return band === "Critical" ? ENCOUNTER_TEMPLATES.crypt_control : ENCOUNTER_TEMPLATES.summoner_escort;
  }
  if (special?.reinforcementBias === "formed") {
    return band === "Critical" ? ENCOUNTER_TEMPLATES.kill_box : choice([ENCOUNTER_TEMPLATES.shield_wall, ENCOUNTER_TEMPLATES.orc_push]);
  }
  if (special?.reinforcementBias === "aggressive") {
    return band === "Critical" ? ENCOUNTER_TEMPLATES.bruiser_hunt : choice([ENCOUNTER_TEMPLATES.bruiser_hunt, ENCOUNTER_TEMPLATES.wolf_pack]);
  }
  if (band === "Critical") {
    return choice([ENCOUNTER_TEMPLATES.orc_push, ENCOUNTER_TEMPLATES.kill_box, ENCOUNTER_TEMPLATES.summoner_escort]);
  }
  if (band === "High") {
    return choice([ENCOUNTER_TEMPLATES.shield_wall, ENCOUNTER_TEMPLATES.necromancer_screen, ENCOUNTER_TEMPLATES.bruiser_hunt]);
  }
  return choice(theme?.templates?.map((id) => ENCOUNTER_TEMPLATES[id]).filter(Boolean) || [ENCOUNTER_TEMPLATES.ambush_cell]);
}

export function spawnReinforcementWave(game, band = "Medium") {
  if (!game.currentLevel || game.currentDepth === 0 || !game.currentLevel.rooms) {
    return [];
  }
  const activeCap = getDynamicMonsterCap(game.currentDepth);
  const remainingCapacity = activeCap - (game.currentLevel.actors?.length || 0);
  if (remainingCapacity <= 0) {
    return [];
  }
  const theme = getDepthTheme(game.currentDepth);
  const special = getSpecialDefinition(game.currentLevel.floorSpecial);
  const farRooms = game.currentLevel.rooms.slice(1).filter((room) => {
    const center = { x: room.x + Math.floor(room.w / 2), y: room.y + Math.floor(room.h / 2) };
    return Math.max(Math.abs(center.x - game.player.x), Math.abs(center.y - game.player.y)) >= 8;
  });
  const room = farRooms.length > 0 ? choice(farRooms) : choice(game.currentLevel.rooms.slice(1));
  if (!room) {
    return [];
  }
  const template = pickReinforcementTemplate(game, band, theme, special);
  const maxUnits = game.currentDepth === 1
    ? 1
    : band === "Critical"
      ? 4
      : band === "High"
        ? 3
        : 2;
  const squad = spawnSquad(game.currentLevel, game.currentDepth, room, theme, template, {
    squadId: `reinforce-${game.turn}`,
    alerted: 6,
    forceAwake: true,
    roomIndex: game.currentLevel.rooms.indexOf(room),
    floorSpecial: special,
    maxUnits: Math.min(remainingCapacity, maxUnits)
  });
  const eliteChance = band === "Critical"
    ? 0.65
    : band === "High"
      ? 0.35
      : special?.extraElite
        ? 0.25
        : 0.1;
  const contractEliteChance = typeof game.getContractEliteWaveChanceBonus === "function"
    ? Math.max(0, game.getContractEliteWaveChanceBonus())
    : 0;
  if (game.currentDepth >= 2 && eliteChance > 0 && Math.random() < Math.min(0.95, eliteChance + contractEliteChance)) {
    const elite = spawnNamedElite(game.currentLevel, game.currentDepth, room, theme, {
      roomIndex: game.currentLevel.rooms.indexOf(room),
      forceAlerted: true
    });
    if (elite) {
      squad.push(elite);
      if (!game.currentLevel.namedEliteId) {
        game.currentLevel.namedEliteId = elite.name;
      }
    }
  }
  return squad;
}

export function spawnObjectiveGuard(level, depth, room, roomIndex, objectiveId = "") {
  const theme = getDepthTheme(depth);
  const special = getSpecialDefinition(level.floorSpecial);
  const earlyObjectiveTemplates = {
    recover_relic: ENCOUNTER_TEMPLATES.ambush_cell,
    purge_nest: ENCOUNTER_TEMPLATES.wolf_pack,
    rescue_captive: ENCOUNTER_TEMPLATES.kill_box,
    seal_shrine: ENCOUNTER_TEMPLATES.shield_wall
  };
  const template = depth >= 4
    ? pickEncounterTemplate(depth, theme, special, { objectiveGuard: true })
    : earlyObjectiveTemplates[objectiveId] || ENCOUNTER_TEMPLATES.shield_wall;
  const maxUnits = depth === 1
    ? (objectiveId === "rescue_captive" || objectiveId === "purge_nest" ? 2 : 1)
    : depth <= 3 && objectiveId === "seal_shrine"
      ? 3
      : undefined;
  const squad = spawnSquad(level, depth, room, theme, template, {
      squadId: `objective-${roomIndex}`,
      objectiveGuard: true,
      forceAwake: true,
      roomIndex,
      floorSpecial: special,
      maxUnits
    });
  if (depth >= 3) {
    const elite = spawnNamedElite(level, depth, room, theme, {
      objectiveGuard: true,
      roomIndex
    });
    if (elite) {
      squad.push(elite);
      if (!level.namedEliteId) {
        level.namedEliteId = elite.name;
      }
    }
  }
  return squad;
}

export function getEncounterSummary(level) {
  if (!level || !level.floorThemeName) {
    return "";
  }
  const special = getSpecialDefinition(level.floorSpecial);
  const eliteNames = Array.isArray(level.activeEliteNames) ? level.activeEliteNames : [];
  const eliteNote = eliteNames.length > 0
    ? ` Elite pressure: ${eliteNames.slice(0, 2).join(", ")}${eliteNames.length > 2 ? " and others" : ""}.`
    : "";
  const specialNote = special ? ` ${special.label}: ${special.summary}` : "";
  const milestoneNote = level.milestone && level.milestone.status !== "cleared"
    ? ` ${level.milestone.name} holds ${level.milestone.roomLabel || "a sealed chamber"} deeper on this floor.`
    : "";
  const eventNote = level.signatureEncounter?.summary
    ? ` Signature room: ${level.signatureEncounter.summary}`
    : "";
  const reinforcementNote = level.reinforcementProfile
    ? ` Reinforcements lean ${level.reinforcementProfile.replace("_", " ")}.`
    : "";
  const thesisNote = level.floorThesis ? ` ${level.floorThesis}` : "";
  return `${level.floorThemeName} favors formed squads and role pressure.${thesisNote}${specialNote}${eliteNote}${eventNote}${reinforcementNote}${milestoneNote}`;
}
