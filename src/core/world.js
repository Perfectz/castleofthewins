/**
 * @module world
 * @owns Tile manipulation, map generation, FOV/LOS, secret/visibility management
 * @reads level.tiles, level.visible, level.explored, level.actors, level.items
 * @mutates level.tiles[], level.visible[], level.explored[], level.actors[], level.items[], level.props[]
 */
import { MONSTER_DEFS } from "../data/content.js";
import { choice, distance, randInt } from "./utils.js";
import { createMonster, rollTreasure } from "./entities.js";

export function blankLevel(width, height, kind) {
  return {
    kind,
    width,
    height,
    tiles: new Array(width * height),
    visible: new Array(width * height).fill(false),
    explored: new Array(width * height).fill(false),
    actors: [],
    items: [],
    props: [],
    corpses: [],
    start: { x: 1, y: 1 }
  };
}

export function tileDef(kind, extra = {}) {
  const defs = {
    wall: { kind: "wall", label: "Granite Wall", walkable: false, transparent: false, palette: ["#383838", "#6a6a6a", "#212121"] },
    floor: { kind: "floor", label: "Stone Floor", walkable: true, transparent: true, palette: ["#57534b", "#766d61", "#433f38"] },
    road: { kind: "road", label: "Road", walkable: true, transparent: true, palette: ["#7f7362", "#9f937f", "#605648"] },
    grass: { kind: "grass", label: "Grass", walkable: true, transparent: true, palette: ["#52764c", "#6fa266", "#355331"] },
    tree: { kind: "tree", label: "Tree", walkable: false, transparent: false, palette: ["#304523", "#496837", "#1f3117"] },
    stone: { kind: "stone", label: "Stonework", walkable: true, transparent: true, palette: ["#696969", "#8a8a8a", "#4e4e4e"] },
    pillar: { kind: "pillar", label: "Pillar", walkable: false, transparent: false, palette: ["#575757", "#9d9d9d", "#3d3d3d"] },
    plaza: { kind: "plaza", label: "Town Square", walkable: true, transparent: true, palette: ["#8d8d82", "#bab8ad", "#706c64"] },
    stairDown: { kind: "stairDown", label: "Stairs Down", walkable: true, transparent: true, palette: ["#72674f", "#b49d6f", "#4f4636"] },
    stairUp: { kind: "stairUp", label: "Stairs Up", walkable: true, transparent: true, palette: ["#6f6a4d", "#b5c17b", "#4d4a34"] },
    buildingWall: { kind: "buildingWall", label: "Building", walkable: false, transparent: false, palette: ["#7d5f39", "#ab8a56", "#5d4528"] },
    buildingFloor: { kind: "buildingFloor", label: "Shop Floor", walkable: true, transparent: true, palette: ["#8b7755", "#c1a57b", "#67583f"] },
    buildingDoor: { kind: "buildingDoor", label: "Door", walkable: true, transparent: true, palette: ["#8d6d3e", "#d1aa61", "#614927"] },
    sign: { kind: "sign", label: "Sign", walkable: false, transparent: true, palette: ["#7a5a39", "#d3bf92", "#523d24"] },
    altar: { kind: "altar", label: "Ancient Altar", walkable: true, transparent: true, palette: ["#6d5a6c", "#c1acd3", "#4b3b4a"] },
    trap: { kind: "trap", label: "Trap", walkable: true, transparent: true, palette: ["#5f503b", "#b08452", "#392d1f"], hidden: false },
    fountain: { kind: "fountain", label: "Fountain", walkable: true, transparent: true, palette: ["#5b6b7f", "#9cc7dd", "#37506a"], featureUsed: false },
    throne: { kind: "throne", label: "Throne", walkable: true, transparent: true, palette: ["#6c5331", "#d0b06d", "#4f361d"], featureUsed: false },
    secretWall: { kind: "secretWall", label: "Secret Wall", walkable: false, transparent: false, palette: ["#383838", "#6a6a6a", "#212121"], hidden: true },
    secretDoor: { kind: "secretDoor", label: "Secret Door", walkable: true, transparent: true, palette: ["#7d6640", "#b89a63", "#5f4c2f"], hidden: true }
  };
  return { ...defs[kind], ...extra };
}

export function setTile(level, x, y, tile) {
  level.tiles[y * level.width + x] = tile;
}

export function getTile(level, x, y) {
  return level.tiles[y * level.width + x];
}

export function setVisible(level, x, y, value) {
  level.visible[y * level.width + x] = value;
}

export function isVisible(level, x, y) {
  return level.visible[y * level.width + x];
}

export function clearVisibility(level) {
  level.visible.fill(false);
}

export function setExplored(level, x, y, value) {
  level.explored[y * level.width + x] = value;
}

export function isExplored(level, x, y) {
  return level.explored[y * level.width + x];
}

export function revealAll(level) {
  level.explored.fill(true);
}

export function revealCircle(level, cx, cy, radius) {
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      if (inBounds(level, x, y) && distance({ x, y }, { x: cx, y: cy }) <= radius) {
        setExplored(level, x, y, true);
      }
    }
  }
}

export function inBounds(level, x, y) {
  return x >= 0 && y >= 0 && x < level.width && y < level.height;
}

export function isWalkable(level, x, y) {
  if (!inBounds(level, x, y)) {
    return false;
  }
  const tile = getTile(level, x, y);
  if ((tile.kind === "secretDoor" || tile.kind === "secretWall") && tile.hidden) {
    return false;
  }
  return tile.walkable;
}

export function carveRoom(level, room) {
  for (let y = room.y; y < room.y + room.h; y += 1) {
    for (let x = room.x; x < room.x + room.w; x += 1) {
      setTile(level, x, y, tileDef("floor"));
    }
  }
}

export function carveTunnel(level, start, end) {
  if (Math.random() < 0.5) {
    carveHorizontal(level, start.x, end.x, start.y);
    carveVertical(level, start.y, end.y, end.x);
  } else {
    carveVertical(level, start.y, end.y, start.x);
    carveHorizontal(level, start.x, end.x, end.y);
  }
}

export function carveHorizontal(level, x1, x2, y) {
  const [from, to] = x1 < x2 ? [x1, x2] : [x2, x1];
  for (let x = from; x <= to; x += 1) {
    setTile(level, x, y, tileDef("floor"));
  }
}

export function carveVertical(level, y1, y2, x) {
  const [from, to] = y1 < y2 ? [y1, y2] : [y2, y1];
  for (let y = from; y <= to; y += 1) {
    setTile(level, x, y, tileDef("floor"));
  }
}

export function fillRect(level, x, y, w, h, tile) {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) {
      setTile(level, xx, yy, { ...tile });
    }
  }
}

export function placeBuilding(level, x, y, w, h, label, service) {
  if (!level.buildings) {
    level.buildings = [];
  }
  level.buildings.push({ x, y, w, h, label, service });
  fillRect(level, x, y, w, h, tileDef("buildingWall"));
  fillRect(level, x + 1, y + 1, w - 2, h - 2, tileDef("buildingFloor"));
  const doorX = x + Math.floor(w / 2);
  setTile(level, doorX, y + h - 1, tileDef("buildingDoor", { service, label: `${label} Door` }));
  setTile(level, doorX, y + h, tileDef("road"));
  setTile(level, x + Math.floor(w / 2), y, tileDef("sign", { label }));
}

export function intersects(a, b, padding = 0) {
  return !(a.x + a.w + padding < b.x || b.x + b.w + padding < a.x || a.y + a.h + padding < b.y || b.y + b.h + padding < a.y);
}

export function centerOf(room) {
  return { x: room.x + Math.floor(room.w / 2), y: room.y + Math.floor(room.h / 2) };
}

export function randomRoomTile(room) {
  return {
    x: randInt(room.x + 1, room.x + room.w - 2),
    y: randInt(room.y + 1, room.y + room.h - 2)
  };
}

export function actorAt(level, x, y) {
  return level.actors.find((actor) => actor.x === x && actor.y === y);
}

export function itemsAt(level, x, y) {
  return level.items.filter((item) => item.x === x && item.y === y);
}

export function addLevelProp(level, prop) {
  if (!level.props) {
    level.props = [];
  }
  level.props.push(prop);
  return prop;
}

export function propsAt(level, x, y) {
  if (!level?.props) {
    return [];
  }
  return level.props.filter((prop) => prop.x === x && prop.y === y);
}

export function isOccupied(level, x, y) {
  return actorAt(level, x, y) || !isWalkable(level, x, y);
}

export function hasLineOfSight(level, x0, y0, x1, y1) {
  const line = bresenhamLine(x0, y0, x1, y1);
  for (let i = 1; i < line.length; i += 1) {
    const point = line[i];
    if (point.x === x1 && point.y === y1) {
      return true;
    }
    if (!getTile(level, point.x, point.y).transparent) {
      return false;
    }
  }
  return true;
}

export function bresenhamLine(x0, y0, x1, y1) {
  const points = [];
  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  let sx = x0 < x1 ? 1 : -1;
  let sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  while (true) {
    points.push({ x, y });
    if (x === x1 && y === y1) {
      break;
    }
    const e2 = err * 2;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
  return points;
}

export function revealSecretTile(level, x, y) {
  const tile = getTile(level, x, y);
  if (!tile) {
    return;
  }
  if (tile.kind === "trap") {
    tile.hidden = false;
    return;
  }
  if (tile.kind === "secretWall") {
    setTile(level, x, y, tileDef("floor"));
    return;
  }
  if (tile.kind === "secretDoor") {
    tile.hidden = false;
  }
}

export function revealNearbySecrets(level, cx, cy, radius) {
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      if (inBounds(level, x, y) && distance({ x, y }, { x: cx, y: cy }) <= radius) {
        const tile = getTile(level, x, y);
        if (tile.kind === "secretDoor") {
          tile.hidden = false;
        }
      }
    }
  }
}

export function revealAllSecrets(level) {
  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      const tile = getTile(level, x, y);
      if (tile.kind === "secretDoor") {
        tile.hidden = false;
      }
    }
  }
}

export function addSetPiece(level, depth) {
  if (!level.rooms || level.rooms.length < 4) {
    return;
  }
  const reservedRoomIndexes = new Set(level.reservedRoomIndexes || []);
  if (typeof level.exitRoomIndex === "number") {
    reservedRoomIndexes.add(level.exitRoomIndex);
  }
  if (typeof level.floorObjective?.roomIndex === "number") {
    reservedRoomIndexes.add(level.floorObjective.roomIndex);
  }
  if (typeof level.floorOptional?.roomIndex === "number") {
    reservedRoomIndexes.add(level.floorOptional.roomIndex);
  }
  const candidateRooms = level.rooms.filter((room, index) => index >= 2 && index < level.rooms.length - 1 && !reservedRoomIndexes.has(index));
  const room = choice(candidateRooms.length > 0 ? candidateRooms : level.rooms.slice(2, -1));
  if (!room) {
    return;
  }
  const theme = choice(["treasury", "chapel", "crossfire", "prison", "gauntlet"]);
  const center = centerOf(room);
  const byId = (id) => MONSTER_DEFS.find((monster) => monster.id === id);
  const spawnMonster = (id, x, y) => {
    if (!id || actorAt(level, x, y) || !isWalkable(level, x, y)) {
      return;
    }
    const template = byId(id);
    if (template) {
      level.actors.push(createMonster(template, x, y));
    }
  };

  if (theme === "treasury") {
    for (let x = room.x + 1; x < room.x + room.w - 1; x += 1) {
      setTile(level, x, room.y + 1, tileDef("trap", { hidden: false, trapEffect: "arrow" }));
      setTile(level, x, room.y + room.h - 2, tileDef("trap", { hidden: false, trapEffect: "arrow" }));
    }
    for (let y = room.y + 2; y < room.y + room.h - 2; y += 1) {
      setTile(level, room.x + 1, y, tileDef("trap", { hidden: false, trapEffect: "summon" }));
      setTile(level, room.x + room.w - 2, y, tileDef("trap", { hidden: false, trapEffect: "alarm" }));
    }
    setTile(level, center.x, center.y, tileDef("altar", { featureUsed: false, featureEffect: "tribute", label: "Gilded Idol" }));
    level.items.push({ x: center.x, y: center.y + 1, kind: "gold", name: "Gold", amount: randInt(70, 140) * depth });
    spawnMonster(depth >= 5 ? "ogre" : "orc", room.x + 2, room.y + 2);
    spawnMonster(depth >= 4 ? "archer" : "slinger", room.x + room.w - 3, room.y + room.h - 3);
  } else if (theme === "chapel") {
    setTile(level, center.x, center.y, tileDef("altar", { featureUsed: false, featureEffect: choice(["blood", "revelation"]), label: "Desecrated Shrine" }));
    if (room.w >= 7 && room.h >= 7) {
      setTile(level, center.x - 2, center.y, tileDef("pillar"));
      setTile(level, center.x + 2, center.y, tileDef("pillar"));
      setTile(level, center.x, center.y - 2, tileDef("pillar"));
      setTile(level, center.x, center.y + 2, tileDef("pillar"));
    }
    spawnMonster(depth >= 5 ? "wraith" : "skeleton", room.x + 2, room.y + 2);
    spawnMonster(depth >= 5 ? "shaman" : "skeleton", room.x + room.w - 3, room.y + 2);
  } else if (theme === "crossfire") {
    for (let y = room.y + 2; y < room.y + room.h - 2; y += 2) {
      for (let x = room.x + 2; x < room.x + room.w - 2; x += 2) {
        if (x === center.x && y === center.y) {
          continue;
        }
        setTile(level, x, y, tileDef("pillar"));
      }
    }
    spawnMonster(depth >= 5 ? "warlock" : "shaman", room.x + 1, room.y + 1);
    spawnMonster(depth >= 2 ? "archer" : "slinger", room.x + room.w - 2, room.y + 1);
    spawnMonster(depth >= 2 ? "archer" : "slinger", room.x + 1, room.y + room.h - 2);
    spawnMonster(depth >= 3 ? "orc" : "goblin", room.x + room.w - 2, room.y + room.h - 2);
    level.items.push({ ...rollTreasure(depth), x: center.x, y: center.y });
  } else if (theme === "prison") {
    const wallX = center.x;
    for (let y = room.y + 1; y < room.y + room.h - 1; y += 1) {
      if (y === center.y) {
        continue;
      }
      setTile(level, wallX, y, tileDef("wall"));
    }
    setTile(level, wallX, center.y, tileDef("floor"));
    setTile(level, wallX - 2, center.y - 2, tileDef("pillar"));
    setTile(level, wallX + 2, center.y + 2, tileDef("pillar"));
    spawnMonster(depth >= 5 ? "ogre" : "troll", wallX + 2, center.y);
    spawnMonster(depth >= 3 ? "archer" : "kobold", wallX - 2, center.y);
    level.items.push({ x: wallX + 3, y: center.y, kind: "gold", name: "Gold", amount: randInt(45, 90) * depth });
  } else if (theme === "gauntlet") {
    carveHorizontal(level, room.x + 1, room.x + room.w - 2, center.y);
    for (let x = room.x + 2; x < room.x + room.w - 2; x += 2) {
      if (x === center.x) {
        continue;
      }
      setTile(level, x, center.y - 1, tileDef("pillar"));
      setTile(level, x, center.y + 1, tileDef("pillar"));
    }
    setTile(level, center.x, center.y, tileDef("trap", { hidden: false, trapEffect: "trapdoor" }));
    spawnMonster(depth >= 4 ? "archer" : "slinger", room.x + room.w - 2, center.y - 1);
    spawnMonster(depth >= 4 ? "archer" : "slinger", room.x + room.w - 2, center.y + 1);
    spawnMonster(depth >= 5 ? "ogre" : "orc", room.x + 2, center.y);
    level.items.push({ ...rollTreasure(depth + 1), x: room.x + room.w - 3, y: center.y });
  }
}

export function addSecretVault(level, depth) {
  if (!level.rooms || level.rooms.length < 3 || Math.random() > 0.75) {
    return;
  }
  const reservedRoomIndexes = new Set(level.reservedRoomIndexes || []);
  if (typeof level.exitRoomIndex === "number") {
    reservedRoomIndexes.add(level.exitRoomIndex);
  }
  if (typeof level.floorObjective?.roomIndex === "number") {
    reservedRoomIndexes.add(level.floorObjective.roomIndex);
  }
  if (typeof level.floorOptional?.roomIndex === "number") {
    reservedRoomIndexes.add(level.floorOptional.roomIndex);
  }
  const eligibleRooms = level.rooms.filter((room, index) => index > 0 && !reservedRoomIndexes.has(index));
  const room = choice(eligibleRooms.length > 0 ? eligibleRooms : level.rooms.slice(1, -1));
  if (!room) {
    return;
  }
  const vaultX = room.x + 1;
  const vaultY = room.y + 1;
  const width = Math.max(3, Math.min(5, room.w - 2));
  const height = Math.max(3, Math.min(5, room.h - 2));
  for (let y = vaultY; y < vaultY + height; y += 1) {
    for (let x = vaultX; x < vaultX + width; x += 1) {
      const edge = x === vaultX || y === vaultY || x === vaultX + width - 1 || y === vaultY + height - 1;
      setTile(level, x, y, edge ? tileDef("secretWall") : tileDef("floor"));
    }
  }
  setTile(level, vaultX + Math.floor(width / 2), vaultY + height - 1, tileDef("secretDoor"));
  level.items.push({ ...rollTreasure(depth + 1), x: vaultX + Math.floor(width / 2), y: vaultY + Math.floor(height / 2) });
}

export function summonMonsterNear(level, x, y, template) {
  const spots = [
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 }
  ];
  const spot = spots.find((point) => isWalkable(level, point.x, point.y) && !actorAt(level, point.x, point.y));
  if (spot) {
    const monster = createMonster(template, spot.x, spot.y);
    monster.sleeping = false;
    monster.alerted = 6;
    level.actors.push(monster);
  }
}

export function findInitialTargetCursor(game, range) {
  const targets = game.visibleEnemies().filter((actor) => distance(game.player, actor) <= range);
  if (targets.length > 0) {
    targets.sort((a, b) => distance(game.player, a) - distance(game.player, b));
    return { x: targets[0].x, y: targets[0].y };
  }
  return { x: game.player.x, y: game.player.y - 1 };
}
