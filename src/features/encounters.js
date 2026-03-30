import { DEPTH_THEMES, ENCOUNTER_TEMPLATES, MONSTER_DEFS, MONSTER_ROLES } from "../data/content.js";
import { createMonster, weightedMonster } from "../core/entities.js";
import { actorAt, isWalkable, randomRoomTile } from "../core/world.js";
import { choice, randInt, shuffle } from "../core/utils.js";

function getMonsterRole(monsterId) {
  return MONSTER_ROLES[monsterId] || "frontliner";
}

function getMonstersForRole(depth, role, theme) {
  const preferredIds = theme && theme.monsterBias ? theme.monsterBias : [];
  const preferred = preferredIds
    .map((id) => MONSTER_DEFS.find((monster) => monster.id === id))
    .filter((monster) => monster && monster.depth <= depth + 1 && getMonsterRole(monster.id) === role);
  const fallback = MONSTER_DEFS.filter((monster) => monster.depth <= depth + 1 && getMonsterRole(monster.id) === role);
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

export function getDepthTheme(depth) {
  return DEPTH_THEMES.find((theme) => theme.depths.includes(depth)) || DEPTH_THEMES[DEPTH_THEMES.length - 1];
}

export function pickEncounterTemplate(depth, theme) {
  const templates = (theme && theme.templates ? theme.templates : Object.keys(ENCOUNTER_TEMPLATES))
    .map((id) => ENCOUNTER_TEMPLATES[id])
    .filter(Boolean);
  if (templates.length === 0) {
    return ENCOUNTER_TEMPLATES.shield_wall;
  }
  const weighted = [];
  templates.forEach((template) => {
    const weight = template.id === "necromancer_screen" && depth < 4 ? 1 : 3;
    for (let i = 0; i < weight; i += 1) {
      weighted.push(template);
    }
  });
  return choice(weighted);
}

export function spawnSquad(level, depth, room, theme, template, options = {}) {
  const positions = findOpenTiles(level, room, template.roles.length);
  if (positions.length === 0) {
    return [];
  }
  const monsters = [];
  template.roles.forEach((role, index) => {
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
  monster.alerted = Math.max(monster.alerted || 0, 4);
  monster.floorTheme = theme.id;
  monster.objectiveGuard = Boolean(options.objectiveGuard);
  if (options.roomIndex !== undefined) {
    monster.roomIndex = options.roomIndex;
  }
  level.actors.push(monster);
  return monster;
}

export function populateDungeonEncounters(level, depth) {
  const theme = getDepthTheme(depth);
  level.floorTheme = theme.id;
  level.floorThemeName = theme.name;
  const rooms = (level.rooms || []).slice(1);
  const shuffledRooms = depth === 1 ? rooms : shuffle(rooms);
  const placedSquads = [];

  if (depth === 1) {
    const introTheme = {
      ...theme,
      monsterBias: ["kobold", "slinger", "rat"],
      templates: ["shield_wall"]
    };
    shuffledRooms.slice(0, Math.min(3, shuffledRooms.length)).forEach((room, index) => {
      const squad = spawnSquad(level, depth, room, introTheme, ENCOUNTER_TEMPLATES.shield_wall, {
        squadId: `intro-${index}`,
        roomIndex: level.rooms.indexOf(room)
      });
      if (squad.length > 0) {
        placedSquads.push({ room, templateId: ENCOUNTER_TEMPLATES.shield_wall.id, squad });
      }
    });
    return { theme: introTheme, placedSquads };
  }

  shuffledRooms.forEach((room, index) => {
    if (index >= Math.max(4, Math.floor(rooms.length * 0.55))) {
      return;
    }
    const template = pickEncounterTemplate(depth, theme);
    const squad = spawnSquad(level, depth, room, theme, template, {
      squadId: `${theme.id}-${index}`,
      roomIndex: level.rooms.indexOf(room)
    });
    if (squad.length > 0) {
      placedSquads.push({ room, templateId: template.id, squad });
    }
  });

  if (depth >= 3 && shuffledRooms.length > 0) {
    const eliteRoom = shuffledRooms[Math.min(shuffledRooms.length - 1, 1 + Math.floor(depth / 2))];
    const elite = spawnNamedElite(level, depth, eliteRoom, theme, {
      roomIndex: level.rooms.indexOf(eliteRoom)
    });
    if (elite) {
      level.namedEliteId = elite.name;
    }
  }

  return { theme, placedSquads };
}

export function spawnReinforcementWave(game, band = "Medium") {
  if (!game.currentLevel || game.currentDepth === 0 || !game.currentLevel.rooms) {
    return [];
  }
  const theme = getDepthTheme(game.currentDepth);
  const farRooms = game.currentLevel.rooms.slice(1).filter((room) => {
    const center = { x: room.x + Math.floor(room.w / 2), y: room.y + Math.floor(room.h / 2) };
    return Math.max(Math.abs(center.x - game.player.x), Math.abs(center.y - game.player.y)) >= 8;
  });
  const room = farRooms.length > 0 ? choice(farRooms) : choice(game.currentLevel.rooms.slice(1));
  if (!room) {
    return [];
  }
  const template = band === "Critical"
    ? ENCOUNTER_TEMPLATES.orc_push
    : band === "High"
      ? choice([ENCOUNTER_TEMPLATES.shield_wall, ENCOUNTER_TEMPLATES.necromancer_screen])
      : choice([ENCOUNTER_TEMPLATES.ambush_cell, ENCOUNTER_TEMPLATES.wolf_pack]);
  const squad = spawnSquad(game.currentLevel, game.currentDepth, room, theme, template, {
    squadId: `reinforce-${game.turn}`,
    alerted: 6,
    forceAwake: true,
    roomIndex: game.currentLevel.rooms.indexOf(room)
  });
  if ((band === "High" || band === "Critical") && Math.random() < 0.7) {
    const elite = spawnNamedElite(game.currentLevel, game.currentDepth, room, theme, {
      roomIndex: game.currentLevel.rooms.indexOf(room)
    });
    if (elite) {
      squad.push(elite);
    }
  }
  return squad;
}

export function spawnObjectiveGuard(level, depth, room, roomIndex) {
  const theme = getDepthTheme(depth);
  const template = depth >= 4 ? ENCOUNTER_TEMPLATES.necromancer_screen : ENCOUNTER_TEMPLATES.shield_wall;
  const squad = spawnSquad(level, depth, room, theme, template, {
    squadId: `objective-${roomIndex}`,
    objectiveGuard: true,
    forceAwake: true,
    roomIndex
  });
  if (depth >= 3) {
    const elite = spawnNamedElite(level, depth, room, theme, {
      objectiveGuard: true,
      roomIndex
    });
    if (elite) {
      squad.push(elite);
    }
  }
  return squad;
}

export function getEncounterSummary(level) {
  if (!level || !level.floorThemeName) {
    return "";
  }
  const eliteNote = level.namedEliteId ? ` ${level.namedEliteId} is hunting this floor.` : "";
  return `${level.floorThemeName} favors formed squads and role pressure.${eliteNote}`;
}
