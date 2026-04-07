(function () {
  "use strict";

// src/core/constants.js
const TILE_SIZE = 24;
const VIEW_SIZE = 25;
const FOV_RADIUS = 8;
const DUNGEON_DEPTH = 7;
const SAVE_KEY = "castle-of-the-winds-web-save";
const SETTINGS_KEY = "castle-of-the-winds-web-settings";
const APP_VERSION = 2;

const DIRECTIONS = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  Home: [-1, -1],
  End: [-1, 1],
  PageUp: [1, -1],
  PageDown: [1, 1],
  q: [-1, -1],
  w: [0, -1],
  e: [1, -1],
  a: [-1, 0],
  d: [1, 0],
  z: [-1, 1],
  x: [0, 1],
  c: [1, 1],
  "7": [-1, -1],
  "8": [0, -1],
  "9": [1, -1],
  "4": [-1, 0],
  "6": [1, 0],
  "1": [-1, 1],
  "2": [0, 1],
  "3": [1, 1]
};

// src/core/utils.js
function choice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roll(count, sides) {
  let total = 0;
  for (let i = 0; i < count; i += 1) {
    total += randInt(1, sides);
  }
  return total;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function nowTime() {
  return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
}

function distance(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function structuredCloneCompat(value) {
  return JSON.parse(JSON.stringify(value));
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function valueTone(ratio, invert = false) {
  if (invert ? ratio <= 0.3 : ratio >= 0.7) {
    return "value-bad";
  }
  if (invert ? ratio <= 0.6 : ratio >= 0.4) {
    return "value-warning";
  }
  return "value-good";
}

function removeFromArray(array, entry) {
  const index = array.indexOf(entry);
  if (index >= 0) {
    array.splice(index, 1);
  }
}

function removeAt(array, index) {
  array.splice(index, 1);
}

function shadeColor(hex, amount) {
  const value = hex.replace("#", "");
  const parsed = parseInt(value, 16);
  const r = clamp(((parsed >> 16) & 255) + amount, 0, 255);
  const g = clamp(((parsed >> 8) & 255) + amount, 0, 255);
  const b = clamp((parsed & 255) + amount, 0, 255);
  return `rgb(${r}, ${g}, ${b})`;
}

function choiceCard(entry, type, selected, options = {}) {
  const artHtml = options.artHtml || "";
  const metaHtml = options.metaHtml || "";
  const button = document.createElement("button");
  button.type = "button";
  button.className = `choice-card${selected ? " selected" : ""}`;
  button.dataset[type] = entry.id;
  button.innerHTML = `
    ${artHtml ? `<div class="choice-card-art">${artHtml}</div>` : ""}
    <div class="choice-card-body">
      <div class="choice-title">${escapeHtml(entry.name)}</div>
      <div class="choice-note">${escapeHtml(entry.summary)}</div>
      ${metaHtml ? `<div class="choice-card-meta">${metaHtml}</div>` : ""}
    </div>
  `;
  return button;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function removeOne(list, value) {
  const index = list.indexOf(value);
  if (index >= 0) {
    list.splice(index, 1);
  }
}

// src/core/world.js

function blankLevel(width, height, kind) {
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

function tileDef(kind, extra = {}) {
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

function setTile(level, x, y, tile) {
  level.tiles[y * level.width + x] = tile;
}

function getTile(level, x, y) {
  return level.tiles[y * level.width + x];
}

function setVisible(level, x, y, value) {
  level.visible[y * level.width + x] = value;
}

function isVisible(level, x, y) {
  return level.visible[y * level.width + x];
}

function clearVisibility(level) {
  level.visible.fill(false);
}

function setExplored(level, x, y, value) {
  level.explored[y * level.width + x] = value;
}

function isExplored(level, x, y) {
  return level.explored[y * level.width + x];
}

function revealAll(level) {
  level.explored.fill(true);
}

function revealCircle(level, cx, cy, radius) {
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      if (inBounds(level, x, y) && distance({ x, y }, { x: cx, y: cy }) <= radius) {
        setExplored(level, x, y, true);
      }
    }
  }
}

function inBounds(level, x, y) {
  return x >= 0 && y >= 0 && x < level.width && y < level.height;
}

function isWalkable(level, x, y) {
  if (!inBounds(level, x, y)) {
    return false;
  }
  const tile = getTile(level, x, y);
  if ((tile.kind === "secretDoor" || tile.kind === "secretWall") && tile.hidden) {
    return false;
  }
  return tile.walkable;
}

function carveRoom(level, room) {
  for (let y = room.y; y < room.y + room.h; y += 1) {
    for (let x = room.x; x < room.x + room.w; x += 1) {
      setTile(level, x, y, tileDef("floor"));
    }
  }
}

function carveTunnel(level, start, end) {
  if (Math.random() < 0.5) {
    carveHorizontal(level, start.x, end.x, start.y);
    carveVertical(level, start.y, end.y, end.x);
  } else {
    carveVertical(level, start.y, end.y, start.x);
    carveHorizontal(level, start.x, end.x, end.y);
  }
}

function carveHorizontal(level, x1, x2, y) {
  const [from, to] = x1 < x2 ? [x1, x2] : [x2, x1];
  for (let x = from; x <= to; x += 1) {
    setTile(level, x, y, tileDef("floor"));
  }
}

function carveVertical(level, y1, y2, x) {
  const [from, to] = y1 < y2 ? [y1, y2] : [y2, y1];
  for (let y = from; y <= to; y += 1) {
    setTile(level, x, y, tileDef("floor"));
  }
}

function fillRect(level, x, y, w, h, tile) {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) {
      setTile(level, xx, yy, { ...tile });
    }
  }
}

function placeBuilding(level, x, y, w, h, label, service) {
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

function intersects(a, b, padding = 0) {
  return !(a.x + a.w + padding < b.x || b.x + b.w + padding < a.x || a.y + a.h + padding < b.y || b.y + b.h + padding < a.y);
}

function centerOf(room) {
  return { x: room.x + Math.floor(room.w / 2), y: room.y + Math.floor(room.h / 2) };
}

function randomRoomTile(room) {
  return {
    x: randInt(room.x + 1, room.x + room.w - 2),
    y: randInt(room.y + 1, room.y + room.h - 2)
  };
}

function actorAt(level, x, y) {
  return level.actors.find((actor) => actor.x === x && actor.y === y);
}

function itemsAt(level, x, y) {
  return level.items.filter((item) => item.x === x && item.y === y);
}

function addLevelProp(level, prop) {
  if (!level.props) {
    level.props = [];
  }
  level.props.push(prop);
  return prop;
}

function propsAt(level, x, y) {
  if (!level?.props) {
    return [];
  }
  return level.props.filter((prop) => prop.x === x && prop.y === y);
}

function isOccupied(level, x, y) {
  return actorAt(level, x, y) || !isWalkable(level, x, y);
}

function hasLineOfSight(level, x0, y0, x1, y1) {
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

function bresenhamLine(x0, y0, x1, y1) {
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

function revealSecretTile(level, x, y) {
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

function revealNearbySecrets(level, cx, cy, radius) {
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

function revealAllSecrets(level) {
  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      const tile = getTile(level, x, y);
      if (tile.kind === "secretDoor") {
        tile.hidden = false;
      }
    }
  }
}

function addSetPiece(level, depth) {
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

function addSecretVault(level, depth) {
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

function summonMonsterNear(level, x, y, template) {
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

function findInitialTargetCursor(game, range) {
  const targets = game.visibleEnemies().filter((actor) => distance(game.player, actor) <= range);
  if (targets.length > 0) {
    targets.sort((a, b) => distance(game.player, a) - distance(game.player, b));
    return { x: targets[0].x, y: targets[0].y };
  }
  return { x: game.player.x, y: game.player.y - 1 };
}

// src/data/assets.js
const PIXEL_ASSET_ROOT = "./assets/vendor/pixel-dungeon-pack/2D Pixel Dungeon Asset Pack";
const CHARACTER_SHEET_PATH = `${PIXEL_ASSET_ROOT}/character and tileset/Dungeon_Character.png`;
const TILESET_SHEET_PATH = `${PIXEL_ASSET_ROOT}/character and tileset/Dungeon_Tileset.png`;
const TITLE_SCREEN_ASSETS = {
  loop: "./assets/ui/title/title-loop.gif",
  still: "./assets/ui/title/title-still.png",
  music: "./assets/audio/title-theme.mp3"
};

const AMBIENT_MUSIC_ASSETS = {
  town: "./assets/audio/town-theme.mp3",
  dungeon: "./assets/audio/dungeon-theme.mp3"
};

function atlasFrame(src, x, y, width = 16, height = 16, sheetWidth = 0, sheetHeight = 0) {
  return {
    src,
    x,
    y,
    width,
    height,
    sheetWidth,
    sheetHeight
  };
}

function gridFrame(src, col, row, tile = 16, sheetWidth = 0, sheetHeight = 0) {
  return atlasFrame(src, col * tile, row * tile, tile, tile, sheetWidth, sheetHeight);
}

function glyphVisual(glyph, extra = {}) {
  return {
    glyph,
    ...extra
  };
}

function frameVisual(frames, extra = {}) {
  return {
    frames,
    ...extra
  };
}

const TOWN_TERRAIN_ASSETS = {
  grass: [
    "./assets/terrain/town/grass-1.png",
    "./assets/terrain/town/grass-2.png",
    "./assets/terrain/town/grass-3.png",
    "./assets/terrain/town/grass-4.png",
    "./assets/terrain/town/grass-5.png"
  ],
  roadHorizontal: [
    "./assets/terrain/town/road-horizontal-1.png",
    "./assets/terrain/town/road-horizontal-2.png",
    "./assets/terrain/town/road-horizontal-3.png"
  ],
  roadVertical: [
    "./assets/terrain/town/road-vertical-1.png",
    "./assets/terrain/town/road-vertical-2.png"
  ],
  roadCross: "./assets/terrain/town/road-cross-1.png"
};

const TOWN_BUILDING_ASSETS = {
  general: "./assets/buildings/town/general.png",
  junk: "./assets/buildings/town/junk.png",
  armory: "./assets/buildings/town/armory.png",
  guild: "./assets/buildings/town/guild.png",
  temple: "./assets/buildings/town/temple.png",
  bank: "./assets/buildings/town/bank.png",
  sage: "./assets/buildings/town/sage.png"
};

const TILESET_VISUALS = {
  floor: [
    gridFrame(TILESET_SHEET_PATH, 0, 4, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 1, 4, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 2, 4, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 3, 4, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 4, 4, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 0, 5, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 1, 5, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 2, 5, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 3, 5, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 4, 5, 16, 160, 160)
  ],
  wall: [
    gridFrame(TILESET_SHEET_PATH, 1, 0, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 2, 0, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 3, 0, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 4, 0, 16, 160, 160)
  ],
  pillar: [
    gridFrame(TILESET_SHEET_PATH, 5, 0, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 5, 1, 16, 160, 160)
  ],
  stone: [
    gridFrame(TILESET_SHEET_PATH, 0, 4, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 2, 4, 16, 160, 160)
  ],
  trap: [
    gridFrame(TILESET_SHEET_PATH, 3, 9, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 4, 9, 16, 160, 160)
  ],
  altar: [
    gridFrame(TILESET_SHEET_PATH, 5, 9, 16, 160, 160)
  ],
  throne: [
    gridFrame(TILESET_SHEET_PATH, 6, 9, 16, 160, 160)
  ],
  stairDown: [
    gridFrame(TILESET_SHEET_PATH, 9, 3, 16, 160, 160)
  ],
  stairUp: [
    gridFrame(TILESET_SHEET_PATH, 8, 3, 16, 160, 160)
  ],
  chestClosed: [
    gridFrame(TILESET_SHEET_PATH, 4, 7, 16, 160, 160)
  ],
  chestOpen: [
    gridFrame(TILESET_SHEET_PATH, 4, 8, 16, 160, 160)
  ],
  cacheClosed: [
    gridFrame(TILESET_SHEET_PATH, 2, 8, 16, 160, 160)
  ],
  cacheOpen: [
    gridFrame(TILESET_SHEET_PATH, 1, 8, 16, 160, 160)
  ],
  torch: [
    gridFrame(TILESET_SHEET_PATH, 0, 9, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 1, 9, 16, 160, 160)
  ],
  wallTorch: [
    gridFrame(TILESET_SHEET_PATH, 0, 9, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 1, 9, 16, 160, 160)
  ],
  coin: [
    gridFrame(TILESET_SHEET_PATH, 6, 8, 16, 160, 160)
  ],
  potionBlue: [
    gridFrame(TILESET_SHEET_PATH, 7, 8, 16, 160, 160)
  ],
  potionRed: [
    gridFrame(TILESET_SHEET_PATH, 9, 8, 16, 160, 160)
  ],
  wand: [
    gridFrame(TILESET_SHEET_PATH, 8, 6, 16, 160, 160)
  ],
  sword: [
    gridFrame(TILESET_SHEET_PATH, 5, 6, 16, 160, 160)
  ],
  armor: [
    gridFrame(TILESET_SHEET_PATH, 5, 8, 16, 160, 160)
  ],
  flag: [
    gridFrame(TILESET_SHEET_PATH, 7, 7, 16, 160, 160)
  ],
  arrowTrap: [
    gridFrame(TILESET_SHEET_PATH, 2, 9, 16, 160, 160)
  ],
  summonTrap: [
    gridFrame(TILESET_SHEET_PATH, 6, 7, 16, 160, 160)
  ]
};

const BOARD_PROP_VISUALS = {
  townSign: frameVisual(TILESET_VISUALS.flag, { usage: "town", lift: 0.24, light: false }),
  roadBeacon: frameVisual(TILESET_VISUALS.torch, { usage: "ambient", lift: 0.32, light: true }),
  roomTorch: frameVisual(TILESET_VISUALS.wallTorch, { usage: "ambient", lift: 0.34, light: true }),
  shrineTorch: frameVisual(TILESET_VISUALS.wallTorch, { usage: "ambient", lift: 0.34, light: true, tint: "#d7b0ff" }),
  rescueBanner: glyphVisual("rescueBanner", { usage: "landmark", lift: 0.18, light: false, tint: "#ffb997" }),
  prisonerCell: glyphVisual("prisonerCell", { usage: "landmark", scale: 0.74, lift: 0.08, light: false, tint: "#aeb6c2" }),
  broodNest: glyphVisual("broodNest", { usage: "landmark", scale: 0.72, lift: 0.08, light: false, tint: "#b98a5b" }),
  shrineSeal: glyphVisual("shrineSeal", { usage: "landmark", scale: 0.72, lift: 0.12, light: true, tint: "#d3b2ff" }),
  relicPedestal: glyphVisual("relicPedestal", { usage: "landmark", scale: 0.74, lift: 0.16, light: true, tint: "#b7f0ff" }),
  cacheClosed: frameVisual(TILESET_VISUALS.cacheClosed, { usage: "landmark", lift: 0.12, light: false }),
  cacheOpen: frameVisual(TILESET_VISUALS.cacheOpen, { usage: "landmark", lift: 0.12, light: false }),
  vaultChest: frameVisual(TILESET_VISUALS.chestClosed, { usage: "landmark", lift: 0.14, light: false }),
  openedChest: frameVisual(TILESET_VISUALS.chestOpen, { usage: "landmark", lift: 0.14, light: false }),
  bloodAltar: frameVisual(TILESET_VISUALS.altar, { usage: "landmark", lift: 0.08, light: true, tint: "#ff9576" }),
  ghostMerchant: frameVisual(TILESET_VISUALS.coin, { usage: "landmark", lift: 0.08, light: true, tint: "#d7c6ff" }),
  loreBook: glyphVisual("loreBook", { usage: "landmark", scale: 0.7, lift: 0.1, light: false, tint: "#f2d9a1" }),
  inscribedStone: glyphVisual("inscribedStone", { usage: "landmark", scale: 0.72, lift: 0.08, light: true, tint: "#d7d4cf" }),
  arrowTrap: frameVisual(TILESET_VISUALS.arrowTrap, { usage: "hazard", lift: 0.08, light: false }),
  summonTrap: frameVisual(TILESET_VISUALS.summonTrap, { usage: "hazard", lift: 0.08, light: true, tint: "#c8a1ff" }),
  barricade: glyphVisual("barricade", { usage: "landmark", scale: 0.76, lift: 0.08, light: false, tint: "#be9a72" }),
  archiveStack: glyphVisual("archiveStack", { usage: "landmark", scale: 0.72, lift: 0.1, light: false, tint: "#dfc391" }),
  beaconFocus: glyphVisual("beaconFocus", { usage: "landmark", scale: 0.74, lift: 0.12, light: true, tint: "#f2c06f" }),
  well: glyphVisual("well", { usage: "landmark", scale: 0.78, lift: 0.06, light: true, tint: "#9ddff2" }),
  routeMark: glyphVisual("routeMark", { usage: "breadcrumb", scale: 0.5, lift: 0.02, light: false, tint: "#cfc8bb" }),
  routePennant: glyphVisual("routePennant", { usage: "breadcrumb", scale: 0.5, lift: 0.02, light: false, tint: "#ffb997" }),
  routeTorch: glyphVisual("routeTorch", { usage: "breadcrumb", scale: 0.5, lift: 0.04, light: true, tint: "#ffcb8b" }),
  routeRune: glyphVisual("routeRune", { usage: "breadcrumb", scale: 0.5, lift: 0.02, light: false, tint: "#d8d1c4" }),
  routeLamp: glyphVisual("routeLamp", { usage: "breadcrumb", scale: 0.5, lift: 0.04, light: true, tint: "#d7b0ff" }),
  routeBeacon: glyphVisual("routeBeacon", { usage: "breadcrumb", scale: 0.52, lift: 0.04, light: true, tint: "#f2c06f" }),
  routeSupply: glyphVisual("routeSupply", { usage: "breadcrumb", scale: 0.5, lift: 0.02, light: false, tint: "#cfa774" }),
  routeCairn: glyphVisual("routeCairn", { usage: "breadcrumb", scale: 0.52, lift: 0.02, light: false, tint: "#d7d4cf" }),
  routeWater: glyphVisual("routeWater", { usage: "breadcrumb", scale: 0.5, lift: 0.02, light: true, tint: "#9ddff2" }),
  routeSeal: glyphVisual("routeSeal", { usage: "breadcrumb", scale: 0.54, lift: 0.02, light: false, tint: "#d3b2ff" }),
  routeJournal: glyphVisual("routeJournal", { usage: "breadcrumb", scale: 0.5, lift: 0.02, light: false, tint: "#d7c3a0" }),
  routeRitual: glyphVisual("routeRitual", { usage: "breadcrumb", scale: 0.54, lift: 0.02, light: true, tint: "#c8a1ff" }),
  routeBarricade: glyphVisual("routeBarricade", { usage: "breadcrumb", scale: 0.54, lift: 0.02, light: false, tint: "#b58c64" }),
  routeTracks: glyphVisual("routeTracks", { usage: "breadcrumb", scale: 0.5, lift: 0.02, light: false, tint: "#c8c1b3" })
};

const ITEM_VISUALS = {
  coin: frameVisual(TILESET_VISUALS.coin),
  potionBlue: frameVisual(TILESET_VISUALS.potionBlue),
  potionRed: frameVisual(TILESET_VISUALS.potionRed),
  wand: frameVisual(TILESET_VISUALS.wand),
  sword: frameVisual(TILESET_VISUALS.sword),
  armor: frameVisual(TILESET_VISUALS.armor),
  flask: glyphVisual("flaskItem", { tint: "#a9d8e6" }),
  shield: glyphVisual("shieldItem", { tint: "#b9c4d5" }),
  spellbook: glyphVisual("spellbookItem", { tint: "#e5d1a5" }),
  relic: glyphVisual("relicItem", { tint: "#b7f0ff" })
};

const ACTOR_VISUALS = {
  fighter: { frames: [gridFrame(CHARACTER_SHEET_PATH, 0, 0, 16, 112, 64)], bob: 0.4, tint: "#f4df9d" },
  wizard: { frames: [gridFrame(CHARACTER_SHEET_PATH, 1, 0, 16, 112, 64)], bob: 0.4, tint: "#9bd7ff" },
  rogue: { frames: [gridFrame(CHARACTER_SHEET_PATH, 4, 0, 16, 112, 64)], bob: 0.4, tint: "#d9ab74" },
  human: { frames: [gridFrame(`${PIXEL_ASSET_ROOT}/Character_animation/priests_idle/priest1/v1/priest1_v1_1.png`, 0, 0, 16, 16, 16)], bob: 0.35 },
  elf: { frames: [gridFrame(`${PIXEL_ASSET_ROOT}/Character_animation/priests_idle/priest2/v1/priest2_v1_1.png`, 0, 0, 16, 16, 16)], bob: 0.35 },
  dwarf: { frames: [gridFrame(`${PIXEL_ASSET_ROOT}/Character_animation/priests_idle/priest3/v1/priest3_v1_1.png`, 0, 0, 16, 16, 16)], bob: 0.35 },
  rat: { frames: [gridFrame(CHARACTER_SHEET_PATH, 0, 1, 16, 112, 64)], bob: 0.24 },
  slime: { frames: [gridFrame(CHARACTER_SHEET_PATH, 1, 1, 16, 112, 64)], bob: 0.2 },
  kobold: { frames: [gridFrame(CHARACTER_SHEET_PATH, 2, 1, 16, 112, 64)], bob: 0.32 },
  goblin: { frames: [gridFrame(CHARACTER_SHEET_PATH, 3, 1, 16, 112, 64)], bob: 0.32 },
  orc: { frames: [gridFrame(CHARACTER_SHEET_PATH, 4, 1, 16, 112, 64)], bob: 0.36 },
  skeleton: { frames: [gridFrame(CHARACTER_SHEET_PATH, 5, 1, 16, 112, 64)], bob: 0.28 },
  mage: { frames: [gridFrame(CHARACTER_SHEET_PATH, 6, 1, 16, 112, 64)], bob: 0.32 },
  wolf: { frames: [gridFrame(CHARACTER_SHEET_PATH, 3, 1, 16, 112, 64)], bob: 0.2, tint: "#b5b5bb" },
  troll: { frames: [gridFrame(CHARACTER_SHEET_PATH, 4, 1, 16, 112, 64)], bob: 0.38, tint: "#799759" },
  ogre: { frames: [gridFrame(CHARACTER_SHEET_PATH, 4, 1, 16, 112, 64)], bob: 0.4, tint: "#bf8a5b" },
  wraith: { frames: [gridFrame(CHARACTER_SHEET_PATH, 6, 1, 16, 112, 64)], bob: 0.24, tint: "#ccb7ff" },
  dragon: { frames: [gridFrame(CHARACTER_SHEET_PATH, 4, 1, 16, 112, 64)], bob: 0.42, tint: "#d68c58" }
};

const ITEM_VISUAL_IDS = {
  gold: "coin",
  quest: "relic",
  healingPotion: "potionRed",
  manaPotion: "potionBlue",
  identifyScroll: "spellbook",
  mappingScroll: "spellbook",
  teleportScroll: "spellbook",
  removeCurseScroll: "spellbook",
  runeScroll: "relic",
  wandLightning: "wand",
  wandSlow: "wand",
  staffHealing: "wand",
  spellbookFrost: "spellbook",
  spellbookFire: "spellbook",
  spellbookPhase: "spellbook",
  spellbookMind: "spellbook",
  spellbookIdentify: "spellbook",
  spellbookSlow: "spellbook",
  spellbookCurse: "spellbook",
  defaultWeapon: "sword",
  defaultArmor: "armor",
  defaultConsumable: "flask",
  defaultCharged: "wand",
  defaultSpellbook: "spellbook",
  defaultRelic: "relic"
};

function pickVariant(list, x = 0, y = 0) {
  if (!Array.isArray(list) || list.length === 0) {
    return null;
  }
  const hash = ((x * 73856093) ^ (y * 19349663)) >>> 0;
  return list[hash % list.length];
}

function getTileVisual(kind, x = 0, y = 0) {
  return pickVariant(TILESET_VISUALS[kind], x, y);
}

function getBoardPropVisual(propId) {
  return BOARD_PROP_VISUALS[propId] || null;
}

function getItemVisual(visualId) {
  if (ITEM_VISUALS[visualId]) {
    return ITEM_VISUALS[visualId];
  }
  if (TILESET_VISUALS[visualId]) {
    return frameVisual(TILESET_VISUALS[visualId]);
  }
  return null;
}

function getActorVisual(visualId) {
  return ACTOR_VISUALS[visualId] || null;
}

// src/data/content.js

const RACES = [
  {
    id: "human",
    name: "Human",
    summary: "Balanced and resilient. Best all-around start.",
    stats: { str: 12, dex: 11, con: 12, int: 11 },
    hp: 12,
    mana: 4
  },
  {
    id: "elf",
    name: "Elf",
    summary: "Sharper minds and nimble hands, but lighter frames.",
    stats: { str: 10, dex: 13, con: 9, int: 14 },
    hp: 9,
    mana: 8
  },
  {
    id: "dwarf",
    name: "Dwarf",
    summary: "Sturdy tunnel fighter with high endurance.",
    stats: { str: 13, dex: 9, con: 14, int: 9 },
    hp: 14,
    mana: 3
  }
];

const CLASSES = [
  {
    id: "fighter",
    name: "Fighter",
    summary: "Steel first, magic second. Toughest starting kit.",
    bonuses: { str: 3, con: 2, dex: 1, int: 0, hp: 6, mana: 0 },
    spells: [],
    startItems: ["shortSword", "leatherArmor", "buckler", "healingPotion", "healingPotion", "torchCharm"]
  },
  {
    id: "rogue",
    name: "Rogue",
    summary: "Quick, accurate, and well supplied.",
    bonuses: { str: 1, con: 1, dex: 3, int: 1, hp: 3, mana: 2 },
    spells: ["magicMissile"],
    startItems: ["dagger", "quiltArmor", "shadowCloak", "healingPotion", "identifyScroll", "goldCharm"]
  },
  {
    id: "wizard",
    name: "Wizard",
    summary: "Fragile at the start, strongest spell utility.",
    bonuses: { str: 0, con: 0, dex: 1, int: 4, hp: 0, mana: 8 },
    spells: ["magicMissile", "healMinor"],
    startItems: ["oakStaff", "clothRobe", "manaPotion", "manaPotion", "mappingScroll", "spellfocusRing"]
  }
];

const SPELLS = {
  magicMissile: {
    id: "magicMissile",
    name: "Magic Missile",
    school: "arcane",
    tier: 1,
    classAffinity: "wizard",
    learnLevel: 1,
    cost: 3,
    range: 8,
    effectColor: "#d6c1ff",
    previewColor: "#d8c4ff",
    projectileStyle: "arcane",
    targetingMode: "single",
    roleLabel: "opener",
    description: "Unerring arcane dart for moderate damage.",
    target: "monster",
    cast(game, caster, target) {
      const casterStats = game.getActorStats ? game.getActorStats(caster) : caster.stats;
      const damage = roll(2, 4) + Math.floor(casterStats.int / 3) + (game.getSpellDamageBonus ? game.getSpellDamageBonus(target, "magic") : 0);
      game.log(`A crackling bolt strikes ${target.name} for ${damage} damage.`, "good");
      game.damageActor(caster, target, damage, "magic");
      return true;
    }
  },
  healMinor: {
    id: "healMinor",
    name: "Cure Light Wounds",
    school: "restoration",
    tier: 1,
    classAffinity: "shared",
    learnLevel: 1,
    cost: 4,
    description: "Restores a small amount of vitality.",
    target: "self",
    cast(game, caster) {
      const casterStats = game.getActorStats ? game.getActorStats(caster) : caster.stats;
      const healed = clamp(roll(2, 5) + Math.floor(casterStats.int / 4), 4, caster.maxHp);
      const before = caster.hp;
      caster.hp = Math.min(caster.maxHp, caster.hp + healed);
      game.log(`${caster.name} recovers ${caster.hp - before} hit points.`, "good");
      return true;
    }
  },
  frostBolt: {
    id: "frostBolt",
    name: "Frost Bolt",
    school: "elemental",
    tier: 2,
    classAffinity: "wizard",
    learnLevel: 3,
    cost: 6,
    range: 7,
    effectColor: "#9ad7ff",
    previewColor: "#b6e6ff",
    projectileStyle: "frost",
    targetingMode: "single",
    roleLabel: "control",
    description: "Cold damage with a chance to slow the foe.",
    target: "monster",
    cast(game, caster, target) {
      const casterStats = game.getActorStats ? game.getActorStats(caster) : caster.stats;
      const damage = roll(2, 6) + Math.floor(casterStats.int / 2) + (game.getSpellDamageBonus ? game.getSpellDamageBonus(target, "cold") : 0);
      game.log(`Blue-white frost lashes ${target.name}.`, "good");
      game.damageActor(caster, target, damage, "cold");
      if (target.hp > 0 && Math.random() < 0.35) {
        target.slowed = 2;
        game.log(`${target.name} is slowed by the freezing impact.`, "warning");
      }
      return true;
    }
  },
  fireball: {
    id: "fireball",
    name: "Ball of Fire",
    school: "elemental",
    tier: 4,
    classAffinity: "wizard",
    learnLevel: 7,
    cost: 9,
    range: 7,
    effectColor: "#ffb16f",
    previewColor: "#ffc48e",
    projectileStyle: "fire",
    targetingMode: "blast",
    allowFloorTarget: true,
    blastRadius: 1,
    roleLabel: "burst",
    description: "A floor-targeted fire blast that engulfs a small cluster of enemies.",
    target: "monster",
    cast(game, caster, target) {
      const preview = game.resolveSpellTargetPreview ? game.resolveSpellTargetPreview(this, target) : null;
      const affected = Array.isArray(preview?.actors) ? preview.actors : [];
      if (affected.length <= 0) {
        game.log("The flames fail to catch anything worth the cast.", "warning");
        return false;
      }
      const casterStats = game.getActorStats ? game.getActorStats(caster) : caster.stats;
      const center = preview?.center || target;
      if (center && game.emitSpellBurst) {
        game.emitSpellBurst(center.x, center.y, this.effectColor || "#ffb16f", this.blastRadius || 1, "fire");
      }
      game.log(`The ball of fire bursts across ${affected.length} foe${affected.length === 1 ? "" : "s"}.`, "good");
      affected.forEach((enemy, index) => {
        const damage = roll(3, 6) + Math.floor(casterStats.int / 2) + (game.getSpellDamageBonus ? game.getSpellDamageBonus(enemy, "fire") : 0);
        if (index > 0 && center && game.playProjectile) {
          game.playProjectile(center, enemy, this.effectColor || "#ffb16f", {
            style: "fire",
            duration: 150
          });
        }
        game.damageActor(caster, enemy, damage, "fire");
      });
      return true;
    }
  },
  phaseDoor: {
    id: "phaseDoor",
    name: "Phase Door",
    school: "escape",
    tier: 2,
    classAffinity: "rogue",
    learnLevel: 4,
    cost: 5,
    description: "Teleports a short distance to safety.",
    target: "self",
    cast(game, caster) {
      const position = game.findSafeTile(game.currentLevel, 12);
      if (!position) {
        game.log("The spell fails to find an opening.", "warning");
        return false;
      }
      caster.x = position.x;
      caster.y = position.y;
      game.log(`${caster.name} blinks through the air.`, "good");
      return true;
    }
  },
  clairvoyance: {
    id: "clairvoyance",
    name: "Clairvoyance",
    school: "divination",
    tier: 3,
    classAffinity: "shared",
    learnLevel: 6,
    cost: 4,
    description: "Reveals part of the current dungeon floor.",
    target: "self",
    cast(game) {
      const level = game.currentLevel;
      for (let i = 0; i < 40; i += 1) {
        const x = randInt(1, level.width - 2);
        const y = randInt(1, level.height - 2);
        revealCircle(level, x, y, 4);
      }
      revealNearbySecrets(level, game.player.x, game.player.y, 6);
      game.log("The dungeon briefly clears in your mind.", "good");
      return true;
    }
  },
  identify: {
    id: "identify",
    name: "Identify",
    school: "divination",
    tier: 1,
    classAffinity: "shared",
    learnLevel: 2,
    cost: 3,
    description: "Reveals the true nature of your equipped gear and pack.",
    target: "self",
    cast(game) {
      const count = game.identifyInventoryAndEquipment();
      game.log(count > 0 ? `The spell reveals ${count} item${count === 1 ? "" : "s"}.` : "You already know your gear well.", "good");
      return true;
    }
  },
  slowMonster: {
    id: "slowMonster",
    name: "Slow Monster",
    school: "control",
    tier: 1,
    classAffinity: "rogue",
    learnLevel: 2,
    cost: 5,
    range: 7,
    effectColor: "#bcdfff",
    description: "Reduces a visible monster to half speed.",
    target: "monster",
    cast(game, caster, target) {
      target.slowed = Math.max(target.slowed || 0, 5);
      game.log(`${target.name} moves as if wading through tar.`, "good");
      return true;
    }
  },
  removeCurse: {
    id: "removeCurse",
    name: "Remove Curse",
    school: "holy",
    tier: 3,
    classAffinity: "shared",
    learnLevel: 5,
    cost: 6,
    description: "Breaks curses on equipped items and inventory.",
    target: "self",
    cast(game) {
      const count = game.removeCurses();
      game.log(count > 0 ? `Holy force breaks ${count} curse${count === 1 ? "" : "s"}.` : "No curses answer the prayer.", "good");
      return true;
    }
  },
  runeOfReturn: {
    id: "runeOfReturn",
    name: "Rune of Return",
    school: "escape",
    tier: 4,
    classAffinity: "shared",
    learnLevel: 8,
    cost: 8,
    description: "Returns you to town, or from town back to your deepest explored floor.",
    target: "self",
    cast(game) {
      return game.useRuneOfReturn ? game.useRuneOfReturn({ source: "spell" }) : false;
    }
  },
  lightningBolt: {
    id: "lightningBolt",
    name: "Lightning Bolt",
    school: "elemental",
    tier: 3,
    classAffinity: "wizard",
    learnLevel: 5,
    cost: 7,
    range: 8,
    effectColor: "#ffe27a",
    previewColor: "#fff0a8",
    projectileStyle: "lightning",
    targetingMode: "single",
    roleLabel: "finisher",
    description: "High-voltage strike that rips through a single visible foe.",
    target: "monster",
    cast(game, caster, target) {
      const casterStats = game.getActorStats ? game.getActorStats(caster) : caster.stats;
      const damage = roll(3, 5) + Math.floor(casterStats.int / 2) + (game.getSpellDamageBonus ? game.getSpellDamageBonus(target, "magic") : 0);
      game.log(`Lightning cracks across ${target.name}.`, "good");
      game.damageActor(caster, target, damage, "magic");
      return true;
    }
  },
  holdMonster: {
    id: "holdMonster",
    name: "Hold Monster",
    school: "control",
    tier: 2,
    classAffinity: "rogue",
    learnLevel: 4,
    cost: 6,
    range: 7,
    effectColor: "#cbbfff",
    description: "Pins a monster in place and leaves it sluggish afterward.",
    target: "monster",
    cast(game, caster, target) {
      target.held = Math.max(target.held || 0, 2);
      target.slowed = Math.max(target.slowed || 0, 4);
      game.log(`${target.name} locks in place under a binding spell.`, "good");
      return true;
    }
  },
  cureSerious: {
    id: "cureSerious",
    name: "Cure Serious Wounds",
    school: "restoration",
    tier: 2,
    classAffinity: "fighter",
    learnLevel: 4,
    cost: 7,
    description: "Restores a substantial amount of vitality.",
    target: "self",
    cast(game, caster) {
      const casterStats = game.getActorStats ? game.getActorStats(caster) : caster.stats;
      const healed = clamp(roll(4, 5) + Math.floor(casterStats.int / 3), 8, caster.maxHp);
      const before = caster.hp;
      caster.hp = Math.min(caster.maxHp, caster.hp + healed);
      game.log(`${caster.name} recovers ${caster.hp - before} hit points.`, "good");
      return true;
    }
  },
  stoneSkin: {
    id: "stoneSkin",
    name: "Stone Skin",
    school: "warding",
    tier: 3,
    classAffinity: "fighter",
    learnLevel: 5,
    cost: 6,
    description: "Hardens your body into a temporary shell of living stone.",
    target: "self",
    cast(game, caster) {
      caster.stoneSkinTurns = Math.max(caster.stoneSkinTurns || 0, 18);
      game.log(`${caster.name}'s skin hardens like carved granite.`, "good");
      return true;
    }
  },
  shield: {
    id: "shield",
    name: "Shield",
    school: "warding",
    tier: 1,
    classAffinity: "fighter",
    learnLevel: 2,
    cost: 4,
    description: "Raises a brief but reliable arcane ward.",
    target: "self",
    cast(game, caster) {
      caster.arcaneWardTurns = Math.max(caster.arcaneWardTurns || 0, 16);
      game.log(`${caster.name} raises a shimmering ward.`, "good");
      return true;
    }
  },
  resistFire: {
    id: "resistFire",
    name: "Resist Fire",
    school: "warding",
    tier: 2,
    classAffinity: "fighter",
    learnLevel: 4,
    cost: 4,
    description: "Blunts incoming fire damage for a long stretch of turns.",
    target: "self",
    cast(game, caster) {
      caster.resistFireTurns = Math.max(caster.resistFireTurns || 0, 30);
      game.log(`${caster.name} steels against flame.`, "good");
      return true;
    }
  },
  resistCold: {
    id: "resistCold",
    name: "Resist Cold",
    school: "warding",
    tier: 2,
    classAffinity: "fighter",
    learnLevel: 4,
    cost: 4,
    description: "Blunts incoming cold damage for a long stretch of turns.",
    target: "self",
    cast(game, caster) {
      caster.resistColdTurns = Math.max(caster.resistColdTurns || 0, 30);
      game.log(`${caster.name} hardens against frost.`, "good");
      return true;
    }
  },
  teleport: {
    id: "teleport",
    name: "Teleport",
    school: "escape",
    tier: 3,
    classAffinity: "rogue",
    learnLevel: 6,
    cost: 7,
    description: "Teleports you to a safer tile elsewhere on the current floor.",
    target: "self",
    cast(game, caster) {
      const position = game.findSafeTile(game.currentLevel, 28);
      if (!position) {
        game.log("Space will not yield to the spell.", "warning");
        return false;
      }
      caster.x = position.x;
      caster.y = position.y;
      game.log(`${caster.name} vanishes and reappears elsewhere in the keep.`, "good");
      return true;
    }
  },
  light: {
    id: "light",
    name: "Light",
    school: "divination",
    tier: 1,
    classAffinity: "rogue",
    learnLevel: 1,
    cost: 2,
    description: "Brightens your immediate surroundings and extends sight for a while.",
    target: "self",
    cast(game, caster) {
      caster.lightBuffTurns = Math.max(caster.lightBuffTurns || 0, 40);
      game.recalculateDerivedStats?.();
      game.log("A steady white light gathers around you.", "good");
      return true;
    }
  },
  detectTraps: {
    id: "detectTraps",
    name: "Detect Traps",
    school: "divination",
    tier: 2,
    classAffinity: "rogue",
    learnLevel: 3,
    cost: 3,
    description: "Reveals hidden traps and nearby secret doors.",
    target: "self",
    cast(game) {
      const level = game.currentLevel;
      let revealed = 0;
      for (let y = game.player.y - 10; y <= game.player.y + 10; y += 1) {
        for (let x = game.player.x - 10; x <= game.player.x + 10; x += 1) {
          if (x < 0 || y < 0 || x >= level.width || y >= level.height) {
            continue;
          }
          const before = level.tiles[y * level.width + x];
          if ((before.kind === "trap" && before.hidden) || before.kind === "secretDoor" || before.kind === "secretWall") {
            revealSecretTile(level, x, y);
            revealed += 1;
          }
        }
      }
      revealNearbySecrets(level, game.player.x, game.player.y, 10);
      game.log(revealed > 0 ? `Hidden dangers flare into view in ${revealed} place${revealed === 1 ? "" : "s"}.` : "The spell finds no hidden danger nearby.", "good");
      return true;
    }
  }
};

const ITEM_DEFS = {
  knife: { id: "knife", name: "Knife", kind: "weapon", slot: "weapon", power: 2, accuracyBonus: 2, critBonus: 1, value: 18, rarity: 1, weight: 1, visualId: "sword" },
  dagger: { id: "dagger", name: "Dagger", kind: "weapon", slot: "weapon", power: 3, accuracyBonus: 2, critBonus: 1, value: 24, rarity: 1, weight: 2, visualId: "sword" },
  shortSword: { id: "shortSword", name: "Short Sword", kind: "weapon", slot: "weapon", power: 5, accuracyBonus: 1, value: 42, rarity: 1, weight: 4, visualId: "sword" },
  rapier: { id: "rapier", name: "Rapier", kind: "weapon", slot: "weapon", power: 5, accuracyBonus: 2, critBonus: 2, value: 60, rarity: 2, weight: 3, visualId: "sword" },
  handAxe: { id: "handAxe", name: "Hand Axe", kind: "weapon", slot: "weapon", power: 7, critBonus: 1, value: 68, rarity: 2, weight: 5, visualId: "sword" },
  broadSword: { id: "broadSword", name: "Broad Sword", kind: "weapon", slot: "weapon", power: 7, accuracyBonus: 1, value: 80, rarity: 2, weight: 5, visualId: "sword" },
  mace: { id: "mace", name: "Mace", kind: "weapon", slot: "weapon", power: 8, value: 92, rarity: 3, weight: 6, visualId: "sword" },
  battleAxe: { id: "battleAxe", name: "Battle Axe", kind: "weapon", slot: "weapon", power: 9, accuracyBonus: -1, critBonus: 1, value: 120, rarity: 3, weight: 7, visualId: "sword" },
  warPick: { id: "warPick", name: "War Pick", kind: "weapon", slot: "weapon", power: 10, accuracyBonus: 1, critBonus: 1, value: 140, rarity: 4, weight: 7, visualId: "sword" },
  warHammer: { id: "warHammer", name: "War Hammer", kind: "weapon", slot: "weapon", power: 11, accuracyBonus: -1, critBonus: 2, value: 160, rarity: 4, weight: 8, visualId: "sword" },
  oakStaff: { id: "oakStaff", name: "Oak Staff", kind: "weapon", slot: "weapon", power: 4, accuracyBonus: 1, manaBonus: 2, wardBonus: 1, value: 26, rarity: 1, weight: 5, visualId: "wand" },
  ashStaff: { id: "ashStaff", name: "Ash Staff", kind: "weapon", slot: "weapon", power: 5, accuracyBonus: 1, manaBonus: 3, wardBonus: 1, value: 64, rarity: 2, weight: 4, visualId: "wand" },
  runeBlade: { id: "runeBlade", name: "Rune Blade", kind: "weapon", slot: "weapon", power: 9, accuracyBonus: 1, critBonus: 1, manaBonus: 2, value: 152, rarity: 4, weight: 5, visualId: "sword" },
  clothRobe: { id: "clothRobe", name: "Cloth Robe", kind: "armor", slot: "body", armor: 1, manaBonus: 2, wardBonus: 1, value: 20, rarity: 1, weight: 2, visualId: "armor" },
  quiltArmor: { id: "quiltArmor", name: "Quilt Armor", kind: "armor", slot: "body", armor: 2, searchBonus: 1, value: 30, rarity: 1, weight: 3, visualId: "armor" },
  leatherArmor: { id: "leatherArmor", name: "Leather Armor", kind: "armor", slot: "body", armor: 3, dexBonus: 1, searchBonus: 1, value: 46, rarity: 1, weight: 5, visualId: "armor" },
  brigandine: { id: "brigandine", name: "Brigandine", kind: "armor", slot: "body", armor: 4, guardBonus: 1, value: 66, rarity: 2, weight: 6, visualId: "armor" },
  chainMail: { id: "chainMail", name: "Chain Mail", kind: "armor", slot: "body", armor: 5, guardBonus: 1, value: 88, rarity: 2, weight: 8, visualId: "armor" },
  scaleMail: { id: "scaleMail", name: "Scale Mail", kind: "armor", slot: "body", armor: 6, guardBonus: 2, dexPenalty: 1, value: 118, rarity: 3, weight: 9, visualId: "armor" },
  plateMail: { id: "plateMail", name: "Plate Mail", kind: "armor", slot: "body", armor: 7, guardBonus: 3, dexPenalty: 1, value: 155, rarity: 4, weight: 11, visualId: "armor" },
  buckler: { id: "buckler", name: "Buckler", kind: "armor", slot: "offhand", armor: 1, guardBonus: 1, dexBonus: 1, value: 22, rarity: 1, weight: 3, visualId: "shield" },
  kiteShield: { id: "kiteShield", name: "Kite Shield", kind: "armor", slot: "offhand", armor: 2, guardBonus: 2, value: 58, rarity: 2, weight: 6, visualId: "shield" },
  towerShield: { id: "towerShield", name: "Tower Shield", kind: "armor", slot: "offhand", armor: 3, guardBonus: 3, dexPenalty: 1, value: 94, rarity: 3, weight: 8, visualId: "shield" },
  paddedCap: { id: "paddedCap", name: "Padded Cap", kind: "armor", slot: "head", armor: 1, searchBonus: 1, value: 24, rarity: 1, weight: 1, visualId: "armor" },
  bronzeHelm: { id: "bronzeHelm", name: "Bronze Helm", kind: "armor", slot: "head", armor: 2, guardBonus: 1, value: 40, rarity: 2, weight: 2, visualId: "armor" },
  hoodedCowl: { id: "hoodedCowl", name: "Hooded Cowl", kind: "armor", slot: "head", armor: 1, lightBonus: 1, wardBonus: 1, value: 48, rarity: 2, weight: 1, visualId: "armor" },
  ironHelm: { id: "ironHelm", name: "Iron Helm", kind: "armor", slot: "head", armor: 3, guardBonus: 1, value: 64, rarity: 3, weight: 3, visualId: "armor" },
  travelBoots: { id: "travelBoots", name: "Travel Boots", kind: "armor", slot: "feet", armor: 1, dexBonus: 1, searchBonus: 1, value: 26, rarity: 1, weight: 2, visualId: "armor" },
  greaves: { id: "greaves", name: "Greaves", kind: "armor", slot: "feet", armor: 2, guardBonus: 1, value: 46, rarity: 2, weight: 3, visualId: "armor" },
  strideBoots: { id: "strideBoots", name: "Stride Boots", kind: "armor", slot: "feet", armor: 1, dexBonus: 2, value: 62, rarity: 3, weight: 2, visualId: "armor" },
  shadowCloak: { id: "shadowCloak", name: "Shadow Cloak", kind: "armor", slot: "cloak", armor: 1, dexBonus: 1, searchBonus: 1, value: 40, rarity: 2, weight: 1, visualId: "armor" },
  wardedCloak: { id: "wardedCloak", name: "Warded Cloak", kind: "armor", slot: "cloak", armor: 1, manaBonus: 1, wardBonus: 1, value: 68, rarity: 3, weight: 1, visualId: "armor" },
  scoutCloak: { id: "scoutCloak", name: "Scout Cloak", kind: "armor", slot: "cloak", armor: 0, dexBonus: 1, searchBonus: 2, lightBonus: 1, value: 74, rarity: 3, weight: 1, visualId: "armor" },
  spellfocusRing: { id: "spellfocusRing", name: "Ring of Focus", kind: "armor", slot: "ring", armor: 0, manaBonus: 4, wardBonus: 1, value: 88, rarity: 2, weight: 0, visualId: "relic" },
  ironRing: { id: "ironRing", name: "Iron Ring", kind: "armor", slot: "ring", armor: 1, guardBonus: 1, value: 54, rarity: 2, weight: 0, visualId: "relic" },
  ringOfMight: { id: "ringOfMight", name: "Ring of Might", kind: "armor", slot: "ring", armor: 0, strBonus: 1, value: 84, rarity: 2, weight: 0, visualId: "relic" },
  ringOfGrace: { id: "ringOfGrace", name: "Ring of Grace", kind: "armor", slot: "ring", armor: 0, dexBonus: 1, value: 86, rarity: 2, weight: 0, visualId: "relic" },
  ringOfVigor: { id: "ringOfVigor", name: "Ring of Vigor", kind: "armor", slot: "ring", armor: 0, conBonus: 1, value: 96, rarity: 3, weight: 0, visualId: "relic" },
  ringOfInsight: { id: "ringOfInsight", name: "Ring of Insight", kind: "armor", slot: "ring", armor: 0, intBonus: 1, value: 96, rarity: 3, weight: 0, visualId: "relic" },
  goldCharm: { id: "goldCharm", name: "Charm of Fortune", kind: "armor", slot: "amulet", armor: 0, goldBonus: 0.15, searchBonus: 1, value: 94, rarity: 3, weight: 0, visualId: "relic" },
  torchCharm: { id: "torchCharm", name: "Charm of Light", kind: "armor", slot: "amulet", armor: 0, lightBonus: 1, value: 70, rarity: 2, weight: 0, visualId: "relic" },
  emberCharm: { id: "emberCharm", name: "Ember Charm", kind: "armor", slot: "amulet", armor: 0, fireResist: 2, value: 92, rarity: 3, weight: 0, visualId: "relic" },
  frostCharm: { id: "frostCharm", name: "Frost Charm", kind: "armor", slot: "amulet", armor: 0, coldResist: 2, value: 92, rarity: 3, weight: 0, visualId: "relic" },
  wardingAmulet: { id: "wardingAmulet", name: "Warding Amulet", kind: "armor", slot: "amulet", armor: 0, manaBonus: 1, wardBonus: 2, value: 122, rarity: 4, weight: 0, visualId: "relic" },
  giantTorque: { id: "giantTorque", name: "Giant Torque", kind: "armor", slot: "amulet", armor: 0, strBonus: 2, value: 126, rarity: 4, weight: 0, visualId: "relic" },
  windlaceAmulet: { id: "windlaceAmulet", name: "Windlace Amulet", kind: "armor", slot: "amulet", armor: 0, dexBonus: 2, value: 128, rarity: 4, weight: 0, visualId: "relic" },
  heartstoneAmulet: { id: "heartstoneAmulet", name: "Heartstone Amulet", kind: "armor", slot: "amulet", armor: 0, conBonus: 2, value: 138, rarity: 4, weight: 0, visualId: "relic" },
  sageCharm: { id: "sageCharm", name: "Sage Charm", kind: "armor", slot: "amulet", armor: 0, intBonus: 2, value: 138, rarity: 4, weight: 0, visualId: "relic" },
  loadbearerMail: { id: "loadbearerMail", name: "Loadbearer Mail", kind: "armor", slot: "body", armor: 4, strBonus: 1, guardBonus: 1, value: 92, rarity: 3, weight: 7, visualId: "armor" },
  scholarCowl: { id: "scholarCowl", name: "Scholar Cowl", kind: "armor", slot: "head", armor: 1, intBonus: 1, wardBonus: 1, value: 62, rarity: 3, weight: 1, visualId: "armor" },
  veteranMantle: { id: "veteranMantle", name: "Veteran Mantle", kind: "armor", slot: "cloak", armor: 1, conBonus: 1, guardBonus: 1, value: 78, rarity: 3, weight: 1, visualId: "armor" },
  healingPotion: { id: "healingPotion", name: "Potion of Healing", kind: "consumable", effect: "heal", value: 28, rarity: 1, weight: 1, visualId: "potionRed" },
  manaPotion: { id: "manaPotion", name: "Potion of Mana", kind: "consumable", effect: "mana", value: 34, rarity: 1, weight: 1, visualId: "potionBlue" },
  identifyScroll: { id: "identifyScroll", name: "Scroll of Identify", kind: "consumable", effect: "identify", value: 36, rarity: 2, weight: 0, visualId: "spellbook" },
  mappingScroll: { id: "mappingScroll", name: "Scroll of Mapping", kind: "consumable", effect: "mapping", value: 46, rarity: 2, weight: 0, visualId: "spellbook" },
  teleportScroll: { id: "teleportScroll", name: "Scroll of Teleport", kind: "consumable", effect: "teleport", value: 52, rarity: 3, weight: 0, visualId: "spellbook" },
  removeCurseScroll: { id: "removeCurseScroll", name: "Scroll of Remove Curse", kind: "consumable", effect: "removeCurse", value: 68, rarity: 4, weight: 0, visualId: "spellbook" },
  runeScroll: { id: "runeScroll", name: "Rune of Return", kind: "consumable", effect: "runeReturn", value: 90, rarity: 5, weight: 0, visualId: "relic" },
  wandLightning: { id: "wandLightning", name: "Wand of Lightning", kind: "charged", effect: "lightning", charges: 5, value: 110, rarity: 4, weight: 1, visualId: "wand" },
  wandSlow: { id: "wandSlow", name: "Wand of Slow Monster", kind: "charged", effect: "slow", charges: 6, value: 92, rarity: 4, weight: 1, visualId: "wand" },
  staffHealing: { id: "staffHealing", name: "Staff of Healing", kind: "charged", effect: "staffHeal", charges: 5, value: 128, rarity: 5, weight: 3, visualId: "wand" },
  spellbookFrost: { id: "spellbookFrost", name: "Spellbook of Frost", kind: "spellbook", spell: "frostBolt", value: 90, rarity: 4, weight: 1, visualId: "spellbook" },
  spellbookFire: { id: "spellbookFire", name: "Spellbook of Fire", kind: "spellbook", spell: "fireball", value: 130, rarity: 5, weight: 1, visualId: "spellbook" },
  spellbookPhase: { id: "spellbookPhase", name: "Spellbook of Phase Door", kind: "spellbook", spell: "phaseDoor", value: 96, rarity: 4, weight: 1, visualId: "spellbook" },
  spellbookMind: { id: "spellbookMind", name: "Spellbook of Clairvoyance", kind: "spellbook", spell: "clairvoyance", value: 86, rarity: 4, weight: 1, visualId: "spellbook" },
  spellbookIdentify: { id: "spellbookIdentify", name: "Spellbook of Identify", kind: "spellbook", spell: "identify", value: 82, rarity: 4, weight: 1, visualId: "spellbook" },
  spellbookSlow: { id: "spellbookSlow", name: "Spellbook of Slow Monster", kind: "spellbook", spell: "slowMonster", value: 92, rarity: 5, weight: 1, visualId: "spellbook" },
  spellbookCurse: { id: "spellbookCurse", name: "Spellbook of Remove Curse", kind: "spellbook", spell: "removeCurse", value: 120, rarity: 5, weight: 1, visualId: "spellbook" },
  spellbookSerious: { id: "spellbookSerious", name: "Spellbook of Major Healing", kind: "spellbook", spell: "cureSerious", value: 112, rarity: 5, weight: 1, visualId: "spellbook" },
  spellbookShield: { id: "spellbookShield", name: "Spellbook of Shield", kind: "spellbook", spell: "shield", value: 72, rarity: 3, weight: 1, visualId: "spellbook" },
  spellbookStone: { id: "spellbookStone", name: "Spellbook of Stone Skin", kind: "spellbook", spell: "stoneSkin", value: 116, rarity: 5, weight: 1, visualId: "spellbook" },
  spellbookResistFire: { id: "spellbookResistFire", name: "Spellbook of Fire Ward", kind: "spellbook", spell: "resistFire", value: 88, rarity: 4, weight: 1, visualId: "spellbook" },
  spellbookResistCold: { id: "spellbookResistCold", name: "Spellbook of Frost Ward", kind: "spellbook", spell: "resistCold", value: 88, rarity: 4, weight: 1, visualId: "spellbook" },
  spellbookTeleport: { id: "spellbookTeleport", name: "Spellbook of Teleport", kind: "spellbook", spell: "teleport", value: 124, rarity: 5, weight: 1, visualId: "spellbook" },
  spellbookLight: { id: "spellbookLight", name: "Spellbook of Light", kind: "spellbook", spell: "light", value: 52, rarity: 2, weight: 1, visualId: "spellbook" },
  spellbookTraps: { id: "spellbookTraps", name: "Spellbook of Trap Sight", kind: "spellbook", spell: "detectTraps", value: 76, rarity: 3, weight: 1, visualId: "spellbook" },
  spellbookHold: { id: "spellbookHold", name: "Spellbook of Holding", kind: "spellbook", spell: "holdMonster", value: 120, rarity: 5, weight: 1, visualId: "spellbook" },
  spellbookLightning: { id: "spellbookLightning", name: "Spellbook of Lightning", kind: "spellbook", spell: "lightningBolt", value: 134, rarity: 5, weight: 1, visualId: "spellbook" },
  pathfinderSandals: { id: "pathfinderSandals", name: "Pathfinder Sandals", kind: "armor", slot: "feet", armor: 1, dexBonus: 1, searchBonus: 2, lightBonus: 1, value: 84, rarity: 3, weight: 1, visualId: "armor" },
  surveyorCharm: { id: "surveyorCharm", name: "Surveyor Charm", kind: "armor", slot: "amulet", armor: 0, searchBonus: 2, lightBonus: 1, manaBonus: 1, value: 104, rarity: 4, weight: 0, visualId: "relic" },
  brigandVest: { id: "brigandVest", name: "Brigand Vest", kind: "armor", slot: "body", armor: 4, dexBonus: 1, searchBonus: 1, value: 78, rarity: 2, weight: 5, visualId: "armor" },
  wardedGreaves: { id: "wardedGreaves", name: "Warded Greaves", kind: "armor", slot: "feet", armor: 2, guardBonus: 1, wardBonus: 1, value: 72, rarity: 3, weight: 3, visualId: "armor" },
  brokenDagger: { id: "brokenDagger", name: "Broken Dagger", kind: "junk", value: 6, rarity: 2, weight: 2, visualId: "sword" },
  rustedMail: { id: "rustedMail", name: "Rusted Mail", kind: "junk", value: 10, rarity: 3, weight: 7, visualId: "armor" },
  runestone: { id: "runestone", name: "Runestone of the Winds", kind: "quest", value: 0, rarity: 99, visualId: "relic" }
};

const LOOT_AFFIX_DEFS = {
  scouts: {
    id: "scouts",
    name: "Scout's",
    category: "utility",
    description: "Built for route-finding, search, and clean movement through uncertain rooms.",
    stats: { dexBonus: 1, searchBonus: 2, lightBonus: 1 },
    tags: ["scouting", "utility"]
  },
  wardens: {
    id: "wardens",
    name: "Warden's",
    category: "reliable",
    description: "Layered guard and ward gear for longer descents.",
    stats: { guardBonus: 1, wardBonus: 1 },
    tags: ["guard", "ward"]
  },
  gravebane: {
    id: "gravebane",
    name: "Gravebane",
    category: "reliable",
    description: "A favored answer to crypt floors and undead pressure.",
    stats: { bonusVsUndead: 3, critBonus: 1 },
    tags: ["anti-undead", "precision"]
  },
  stormtouched: {
    id: "stormtouched",
    name: "Stormtouched",
    category: "utility",
    description: "Channels mana cleanly and softens overcast costs.",
    stats: { manaBonus: 2, overcastRelief: 1 },
    tags: ["mana", "overcast"]
  },
  executioners: {
    id: "executioners",
    name: "Executioner's",
    category: "reliable",
    description: "Sharpens pressure against injured or pinned targets.",
    stats: { power: 1, critBonus: 2 },
    tags: ["crit", "offense"]
  },
  hollow: {
    id: "hollow",
    name: "Hollow",
    category: "risky",
    description: "Cursed power that hits harder but leaves less margin.",
    stats: { power: 2, guardBonus: -1, cursedBias: true },
    tags: ["cursed", "power"]
  }
};

const ROOM_EVENT_DEFS = {
  wounded_survivor: {
    id: "wounded_survivor",
    label: "Wounded Survivor",
    summary: "A battered holdout offers a reward if you reach them before the floor turns ugly.",
    eventType: "rescue",
    guide: "A survivor is still breathing somewhere on this floor.",
    roomHint: "A blood trail and broken kit mark a desperate holdout.",
    pressureText: "The wounded survivor will not last if the floor stays loud.",
    rewardText: "The survivor trades hard-kept supplies for the rescue.",
    propId: "rescueBanner",
    reward: { type: "item", itemId: "healingPotion", extraItemId: "mappingScroll" }
  },
  sealed_reliquary: {
    id: "sealed_reliquary",
    label: "Sealed Reliquary",
    summary: "A locked reliquary promises stronger treasure if you risk opening it.",
    eventType: "cache",
    guide: "A sealed reliquary is waiting in one of the deeper rooms.",
    roomHint: "Old ward marks and a sealed stand suggest preserved valuables.",
    pressureText: "Breaking the reliquary will stir the floor and draw attention.",
    rewardText: "The reliquary cracks open and yields prepared treasure.",
    propId: "relicPedestal",
    reward: { type: "treasure", quality: "elite" }
  },
  failed_summoning: {
    id: "failed_summoning",
    label: "Failed Summoning",
    summary: "An unstable ritual room offers power, but it can wake the wrong thing.",
    eventType: "ritual",
    guide: "An unstable ritual chamber is active on this floor.",
    roomHint: "Burnt circles and split glyphs hum underfoot.",
    pressureText: "The ritual room can feed pressure into the whole floor.",
    rewardText: "You pull power from the ritual before it collapses.",
    propId: "shrineSeal",
    reward: { type: "mana", amount: 1 }
  },
  barricaded_hold: {
    id: "barricaded_hold",
    label: "Barricaded Hold",
    summary: "A fortified room anchors an elite-led defensive pack.",
    eventType: "eliteRoom",
    guide: "One room on this floor has been turned into a holdout.",
    roomHint: "Furniture and shields choke the doorway into a fortified hold.",
    pressureText: "The holdout is coordinating the floor's defenders.",
    rewardText: "Breaking the hold leaves behind disciplined war gear.",
    propId: "barricade",
    reward: { type: "treasure", quality: "guarded" }
  },
  cursed_library: {
    id: "cursed_library",
    label: "Cursed Library",
    summary: "A dead study offers lore and tools, but the books bite back.",
    eventType: "library",
    guide: "A ruined library still holds dangerous knowledge.",
    roomHint: "Spell ash and chained books cover the room.",
    pressureText: "The library is loud with ward-breaks and old curses.",
    rewardText: "You salvage a spellbook and a page of useful warding notes.",
    propId: "archiveStack",
    reward: { type: "spellbook" }
  },
  route_cache: {
    id: "route_cache",
    label: "Route Cache",
    summary: "A hidden forward cache offers clean route tools and practical field gear.",
    eventType: "cache",
    guide: "A route cache was left somewhere off the main approach.",
    roomHint: "Chalk arrows and wax-sealed satchels suggest a scout cache.",
    pressureText: "Breaking the cache still makes noise, but it pays back immediately.",
    rewardText: "The cache yields route notes and packed field gear.",
    propId: "cacheClosed",
    reward: { type: "item", itemId: "pathfinderSandals", extraItemId: "mappingScroll" }
  },
  watchers_archive: {
    id: "watchers_archive",
    label: "Watcher's Archive",
    summary: "A warded archive preserves survey tools and notes from earlier descents.",
    eventType: "library",
    guide: "A watch archive still survives on this floor.",
    roomHint: "Ledger shelves and ward-scratched walls mark an old survey post.",
    pressureText: "The archive is brittle and full of broken ward splinters.",
    rewardText: "You strip the archive for route tools and careful warding notes.",
    propId: "loreBook",
    reward: { type: "item", itemId: "surveyorCharm", extraItemId: "wardedGreaves" }
  }
};

const ENEMY_BEHAVIOR_KITS = {
  pinning_controller: {
    id: "pinning_controller",
    label: "Pinning Controller",
    tell: "Projects a pinning hex when it can see you.",
    summary: "Locks movement before the rest of the squad closes."
  },
  banner_captain: {
    id: "banner_captain",
    label: "Banner Captain",
    tell: "Raises nearby melee pressure and anchors a room push.",
    summary: "Buffs nearby allies and drives formed advances."
  },
  corpse_raiser: {
    id: "corpse_raiser",
    label: "Corpse Raiser",
    tell: "Turns fresh corpses into new pressure if left alone.",
    summary: "Converts dead bodies into revived threats."
  },
  stalker: {
    id: "stalker",
    label: "Stalker",
    tell: "Repositions and disengages instead of standing still.",
    summary: "Uses angles, retreats, and re-entry pressure."
  },
  breaker: {
    id: "breaker",
    label: "Breaker",
    tell: "Punishes shielded or heavily guarded targets.",
    summary: "Targets defensive builds and breaks layered guard."
  },
  coward_caster: {
    id: "coward_caster",
    label: "Coward Caster",
    tell: "Retreats, summons, and attacks from behind others.",
    summary: "Avoids fair trades and drags fights out."
  }
};

const TEMPLE_SERVICES = [
  { id: "heal", name: "Healing", price: 40, description: "Restore hit points and mana." },
  { id: "restore", name: "Restoration", price: 90, description: "Recover lost Constitution and mana." },
  { id: "removeCurse", name: "Remove Curse", price: 120, description: "Break curses on all carried gear." },
  { id: "runeReturn", name: "Rune of Return", price: 160, description: "Receive a fresh rune scroll." }
];

const MONSTER_DEFS = [
  { id: "rat", name: "Giant Rat", depth: 1, hp: 6, attack: 3, defense: 7, damage: [1, 4], exp: 12, gold: [2, 10], color: "#8e8e75", sprite: "rat", visualId: "rat", tactic: "pack", moveSpeed: 100 },
  { id: "kobold", name: "Kobold", depth: 1, hp: 8, attack: 4, defense: 8, damage: [1, 5], exp: 15, gold: [4, 12], color: "#b19061", sprite: "kobold", visualId: "kobold", tactic: "pack", moveSpeed: 94 },
  { id: "slinger", name: "Kobold Slinger", depth: 1, hp: 7, attack: 5, defense: 8, damage: [1, 4], exp: 18, gold: [4, 12], color: "#b89066", sprite: "kobold", visualId: "kobold", tactic: "skirmish", moveSpeed: 78, ranged: { range: 5, damage: [1, 4], color: "#e0c7a2" } },
  { id: "goblin", name: "Goblin", depth: 2, hp: 12, attack: 5, defense: 9, damage: [1, 6], exp: 24, gold: [5, 18], color: "#6e9d4f", sprite: "goblin", visualId: "goblin", tactic: "pack", moveSpeed: 96 },
  { id: "archer", name: "Goblin Archer", depth: 2, hp: 11, attack: 6, defense: 9, damage: [1, 6], exp: 28, gold: [6, 20], color: "#8caf56", sprite: "goblin", visualId: "goblin", tactic: "skirmish", moveSpeed: 80, ranged: { range: 6, damage: [1, 5], color: "#c2a56a" } },
  { id: "wolf", name: "Dire Wolf", depth: 2, hp: 14, attack: 6, defense: 10, damage: [2, 4], exp: 28, gold: [0, 0], color: "#a7a7a7", sprite: "wolf", visualId: "wolf", abilities: ["charge"], tactic: "charge", moveSpeed: 104 },
  { id: "skeleton", name: "Skeleton", depth: 2, hp: 18, attack: 7, defense: 11, damage: [2, 5], exp: 40, gold: [8, 22], color: "#d9d9ca", sprite: "skeleton", visualId: "skeleton", tactic: "line", moveSpeed: 84 },
  { id: "orc", name: "Orc", depth: 3, hp: 22, attack: 8, defense: 11, damage: [2, 6], exp: 46, gold: [10, 28], color: "#709243", sprite: "orc", visualId: "orc", tactic: "press", moveSpeed: 90 },
  { id: "pikeguard", name: "Pike Guard", depth: 3, hp: 24, attack: 9, defense: 12, damage: [2, 6], exp: 52, gold: [12, 30], color: "#8f7b58", sprite: "orc", visualId: "orc", tactic: "line", moveSpeed: 82 },
  { id: "slime", name: "Ochre Jelly", depth: 4, hp: 26, attack: 8, defense: 10, damage: [2, 6], exp: 52, gold: [0, 0], color: "#c8a73c", sprite: "slime", visualId: "slime", tactic: "press", moveSpeed: 68 },
  { id: "boneArcher", name: "Bone Archer", depth: 4, hp: 20, attack: 8, defense: 12, damage: [2, 5], exp: 60, gold: [12, 34], color: "#d9d9ca", sprite: "skeleton", visualId: "skeleton", tactic: "skirmish", moveSpeed: 78, ranged: { range: 6, damage: [2, 5], color: "#d9c18a" } },
  { id: "cultAdept", name: "Cult Adept", depth: 4, hp: 24, attack: 9, defense: 12, damage: [2, 5], exp: 64, gold: [12, 38], color: "#7566a6", sprite: "mage", visualId: "mage", spells: ["slowMonster", "magicMissile"], abilities: ["slow"], tactic: "control", moveSpeed: 84 },
  { id: "troll", name: "Troll", depth: 4, hp: 36, attack: 10, defense: 12, damage: [2, 8], exp: 80, gold: [16, 40], color: "#5f7b3f", sprite: "troll", visualId: "troll", abilities: ["charge"], tactic: "charge", moveSpeed: 84 },
  { id: "wraith", name: "Wraith", depth: 5, hp: 30, attack: 11, defense: 14, damage: [3, 6], exp: 98, gold: [18, 54], color: "#b4a7df", sprite: "wraith", visualId: "wraith", abilities: ["phase", "drain"], tactic: "phase", moveSpeed: 94 },
  { id: "graveHound", name: "Grave Hound", depth: 5, hp: 30, attack: 11, defense: 13, damage: [2, 7], exp: 94, gold: [8, 24], color: "#9ca39f", sprite: "wolf", visualId: "wolf", abilities: ["charge", "drain"], tactic: "charge", moveSpeed: 102 },
  { id: "ogre", name: "Ogre", depth: 5, hp: 44, attack: 12, defense: 13, damage: [3, 7], exp: 106, gold: [20, 68], color: "#ab7c50", sprite: "ogre", visualId: "ogre", abilities: ["charge"], tactic: "charge", moveSpeed: 80 },
  { id: "shaman", name: "Orc Shaman", depth: 5, hp: 28, attack: 11, defense: 13, damage: [2, 6], exp: 110, gold: [18, 58], color: "#4a8f8f", sprite: "mage", visualId: "mage", spells: ["slowMonster", "holdMonster"], abilities: ["slow", "summon"], tactic: "control", moveSpeed: 82 },
  { id: "warlock", name: "Warlock", depth: 6, hp: 34, attack: 12, defense: 15, damage: [3, 8], exp: 124, gold: [28, 80], color: "#7854b8", sprite: "mage", visualId: "mage", spells: ["magicMissile", "holdMonster", "lightningBolt"], abilities: ["teleport", "summon"], tactic: "control", moveSpeed: 84 },
  { id: "wyrm", name: "Cave Wyrm", depth: 7, hp: 60, attack: 14, defense: 16, damage: [4, 8], exp: 180, gold: [30, 96], color: "#be5b33", sprite: "dragon", visualId: "dragon", tactic: "skirmish", moveSpeed: 86, ranged: { range: 5, damage: [3, 7], color: "#f08c4f" } },
  { id: "gatekeeper", name: "Gatekeeper Hroth", depth: 3, hp: 34, attack: 10, defense: 13, damage: [2, 7], exp: 140, gold: [30, 60], color: "#b37f54", sprite: "orc", visualId: "orc", unique: true, elite: true, spells: ["holdMonster"], abilities: ["charge"], tactic: "press", role: "elite", moveSpeed: 90 },
  { id: "cryptlord", name: "Veyra The Crypt Lord", depth: 5, hp: 48, attack: 12, defense: 15, damage: [3, 8], exp: 210, gold: [50, 90], color: "#a98bdd", sprite: "mage", visualId: "mage", unique: true, elite: true, spells: ["holdMonster", "slowMonster", "lightningBolt"], abilities: ["summon", "phase"], tactic: "control", role: "elite", moveSpeed: 86 },
  { id: "stormWarden", name: "The Storm Warden", depth: 7, hp: 78, attack: 15, defense: 18, damage: [4, 9], exp: 320, gold: [0, 0], color: "#d6c08a", sprite: "dragon", visualId: "dragon", unique: true, elite: true, spells: ["lightningBolt", "frostBolt", "holdMonster"], abilities: ["charge"], tactic: "skirmish", role: "elite", moveSpeed: 92, ranged: { range: 6, damage: [4, 7], color: "#ffd676" } }
];

const SHOPS = {
  general: {
    name: "Provisioner",
    greeting: "Food is scarce in the mountain, but charms, books, and restoratives are not.",
    stock: ["healingPotion", "manaPotion", "identifyScroll", "mappingScroll", "teleportScroll", "travelBoots", "shadowCloak", "scoutCloak", "spellbookMind", "removeCurseScroll", "torchCharm", "emberCharm", "frostCharm"]
  },
  armory: {
    name: "Armory",
    greeting: "Steel, leather, and hard-won practical judgment.",
    stock: ["knife", "shortSword", "rapier", "handAxe", "broadSword", "mace", "battleAxe", "warPick", "leatherArmor", "brigandine", "chainMail", "scaleMail", "plateMail", "buckler", "kiteShield", "towerShield", "paddedCap", "bronzeHelm", "hoodedCowl", "ironHelm", "greaves", "strideBoots"]
  },
  guild: {
    name: "Wizard's Guild",
    greeting: "Arcane work is expensive. So is burying careless apprentices.",
    stock: ["oakStaff", "ashStaff", "runeBlade", "spellfocusRing", "ironRing", "wardingAmulet", "wardedCloak", "spellbookFrost", "spellbookFire", "spellbookPhase", "spellbookIdentify", "spellbookSlow", "spellbookCurse", "spellbookShield", "spellbookStone", "spellbookHold", "spellbookLightning", "spellbookTeleport", "manaPotion", "wandLightning", "wandSlow", "staffHealing"]
  },
  temple: {
    name: "Temple",
    greeting: "Restoration, blessing, and the expensive reversal of reckless mistakes.",
    stock: ["healingPotion", "manaPotion", "goldCharm", "torchCharm", "emberCharm", "frostCharm", "wardingAmulet", "spellbookMind", "spellbookSerious", "spellbookResistFire", "spellbookResistCold", "runeScroll", "surveyorCharm"]
  },
  sage: {
    name: "Sage's Tower",
    greeting: "Items laid before the sage can be identified for a fee.",
    stock: []
  },
  junk: {
    name: "Junk Shop",
    greeting: "The proprietor buys almost anything, but pays very little.",
    stock: []
  }
};

const MONSTER_ROLES = {
  rat: "hunter",
  kobold: "frontliner",
  slinger: "artillery",
  goblin: "skirmisher",
  archer: "artillery",
  wolf: "hunter",
  skeleton: "frontliner",
  orc: "frontliner",
  pikeguard: "frontliner",
  slime: "controller",
  boneArcher: "artillery",
  cultAdept: "controller",
  troll: "frontliner",
  wraith: "skirmisher",
  graveHound: "hunter",
  ogre: "elite",
  shaman: "summoner",
  warlock: "controller",
  wyrm: "elite"
};

const ENCOUNTER_TEMPLATES = {
  shield_wall: {
    id: "shield_wall",
    label: "Shield Wall",
    roles: ["frontliner", "frontliner", "artillery"]
  },
  wolf_pack: {
    id: "wolf_pack",
    label: "Wolf Pack",
    roles: ["hunter", "hunter", "skirmisher"]
  },
  necromancer_screen: {
    id: "necromancer_screen",
    label: "Necromancer Screen",
    roles: ["summoner", "frontliner", "frontliner"]
  },
  orc_push: {
    id: "orc_push",
    label: "Orc Push",
    roles: ["frontliner", "controller", "artillery"]
  },
  ambush_cell: {
    id: "ambush_cell",
    label: "Ambush Cell",
    roles: ["skirmisher", "skirmisher", "artillery"]
  },
  kill_box: {
    id: "kill_box",
    label: "Kill Box",
    roles: ["artillery", "artillery", "frontliner", "controller"]
  },
  summoner_escort: {
    id: "summoner_escort",
    label: "Summoner Escort",
    roles: ["summoner", "frontliner", "artillery", "frontliner"]
  },
  bruiser_hunt: {
    id: "bruiser_hunt",
    label: "Bruiser Hunt",
    roles: ["elite", "skirmisher", "hunter", "frontliner"]
  },
  crypt_control: {
    id: "crypt_control",
    label: "Crypt Control",
    roles: ["controller", "summoner", "frontliner", "artillery"]
  },
  torch_patrol: {
    id: "torch_patrol",
    label: "Torch Patrol",
    roles: ["frontliner", "artillery", "hunter"]
  },
  grave_picket: {
    id: "grave_picket",
    label: "Grave Picket",
    roles: ["hunter", "frontliner", "controller"]
  }
};

const DEPTH_THEMES = [
  {
    id: "vermin_halls",
    name: "Vermin Halls",
    depths: [1, 2],
    summary: "Fast packs, anxious corridors, and too many eyes in the dark.",
    templates: ["wolf_pack", "ambush_cell", "shield_wall", "bruiser_hunt", "torch_patrol"],
    monsterBias: ["rat", "kobold", "slinger", "goblin", "wolf"]
  },
  {
    id: "barracks",
    name: "Broken Barracks",
    depths: [2, 3, 4],
    summary: "Disciplined pressure from archers, shields, and orc raiders.",
    templates: ["shield_wall", "orc_push", "ambush_cell", "kill_box", "bruiser_hunt", "torch_patrol"],
    monsterBias: ["goblin", "archer", "skeleton", "orc", "troll"]
  },
  {
    id: "crypts",
    name: "Echo Crypts",
    depths: [4, 5, 6, 7],
    summary: "Necromancy, phasing threats, and reinforcements that never stay dead long enough.",
    templates: ["necromancer_screen", "shield_wall", "orc_push", "summoner_escort", "crypt_control", "grave_picket"],
    monsterBias: ["skeleton", "wraith", "shaman", "warlock", "ogre", "wyrm"]
  }
];

const OBJECTIVE_DEFS = {
  recover_relic: {
    id: "recover_relic",
    label: "Recover The Relic",
    shortLabel: "Recover Relic",
    intro: "A marked relic lies somewhere deeper on this floor.",
    summary: "Push to the marked chamber, claim the relic, and decide whether to cash out or stay greedy.",
    completion: "pickup",
    rewardType: "relic",
    visualId: "relicPedestal"
  },
  purge_nest: {
    id: "purge_nest",
    label: "Purge The Nest",
    shortLabel: "Purge Nest",
    intro: "A breeding nest is feeding the floor. Clear its defenders and crush it.",
    summary: "Clear the nest room, then interact with the nest to end the threat and earn a reward.",
    completion: "interact",
    rewardType: "boon",
    visualId: "broodNest"
  },
  rescue_captive: {
    id: "rescue_captive",
    label: "Rescue The Captive",
    shortLabel: "Rescue Captive",
    intro: "Someone is still alive below. Reach them before the floor tightens around you.",
    summary: "Find the captive, clear the room, and escort the rescue by interacting with the prison marker.",
    completion: "interact",
    rewardType: "rumor",
    visualId: "prisonerCell"
  },
  seal_shrine: {
    id: "seal_shrine",
    label: "Seal The Shrine",
    shortLabel: "Seal Shrine",
    intro: "An unstable shrine is feeding the floor's hostility. Seal it before pushing deeper.",
    summary: "Reach the shrine and perform the seal. Expect noise and retaliation.",
    completion: "interact",
    rewardType: "boon",
    visualId: "shrineSeal"
  },
  secure_supplies: {
    id: "secure_supplies",
    label: "Recover The Cache",
    shortLabel: "Recover Cache",
    intro: "A sealed field cache was left behind in the chaos. Recover it before the floor strips it bare.",
    summary: "Push to the marked cache, claim it, and carry the supplies back into your run.",
    completion: "pickup",
    rewardType: "boon",
    visualId: "vaultChest"
  },
  recover_waystone: {
    id: "recover_waystone",
    label: "Recover The Waystone",
    shortLabel: "Recover Waystone",
    intro: "A survey waystone is still intact somewhere ahead. Recover it before the floor breaks it apart.",
    summary: "Push to the marked chamber, claim the waystone, and turn the recovery into cleaner next-floor intel.",
    completion: "pickup",
    rewardType: "rumor",
    visualId: "relicPedestal"
  },
  secure_ledger: {
    id: "secure_ledger",
    label: "Recover The Ledger",
    shortLabel: "Recover Ledger",
    intro: "A survey ledger is still intact below. Recover it before the floor tears the route notes apart.",
    summary: "Claim the marked archive ledger and turn it into cleaner route planning for what comes next.",
    completion: "pickup",
    rewardType: "rumor",
    visualId: "archiveStack"
  },
  purify_well: {
    id: "purify_well",
    label: "Purify The Well",
    shortLabel: "Purify Well",
    intro: "A corrupted well is spoiling the air on this floor. Clear it and purify the water before the floor closes in.",
    summary: "Clear the chamber, then purify the well for a full refill and a boon before the floor answers back.",
    completion: "interact",
    rewardType: "boon",
    visualId: "well"
  },
  break_beacon: {
    id: "break_beacon",
    label: "Break The Beacon",
    shortLabel: "Break Beacon",
    intro: "A warning beacon is feeding patrol pressure deeper in the halls.",
    summary: "Clear the beacon chamber, then smash the signal focus before it draws more patrols.",
    completion: "interact",
    rewardType: "rumor",
    visualId: "beaconFocus"
  },
  light_watchfire: {
    id: "light_watchfire",
    label: "Light The Watchfire",
    shortLabel: "Light Watchfire",
    intro: "A dead watchfire sits in the marked chamber. Rekindle it before the floor's route memory is lost.",
    summary: "Clear the room, then light the watchfire to reveal more of the floor and secure a cleaner push.",
    completion: "interact",
    rewardType: "boon",
    visualId: "beaconFocus"
  }
};

const MILESTONE_DEFS = {
  depth3_gatekeeper: {
    id: "depth3_gatekeeper",
    depth: 3,
    bossId: "gatekeeper",
    name: "The Gatekeeper",
    roomLabel: "Gatehouse Reliquary",
    intro: "The deeper halls were sealed from within, and the old gate captain still enforces that order.",
    journal: "Break the Gatekeeper on depth 3 and learn why the keep's own defenders barred the lower route.",
    clearText: "The Gatekeeper falls, and the broken seal of the barracks finally yields.",
    rewardType: "perk",
    guideLabel: "Gatekeeper",
    storyTag: "depth3",
    discoveryId: "gatehouse_orders",
    bossStory: "Hroth was the captain ordered to close the lower keep when the Runestone was taken below."
  },
  depth5_cryptlord: {
    id: "depth5_cryptlord",
    depth: 5,
    bossId: "cryptlord",
    name: "The Crypt Lord",
    roomLabel: "Hall of Echoed Names",
    intro: "The dead lord below preserved rank, ritual, and fear long after the keep should have been laid to rest.",
    journal: "Break Veyra in the crypt halls and uncover how the lower court twisted the Runestone's loss into a burial oath.",
    clearText: "Veyra collapses into ash, and the crypt's false court finally loses its voice.",
    rewardType: "relic",
    guideLabel: "Crypt Lord",
    storyTag: "depth5",
    discoveryId: "crypt_epitaph",
    bossStory: "Veyra kept the dead enthroned so the town above would never reclaim what the court hid below."
  },
  depth7_stormwarden: {
    id: "depth7_stormwarden",
    depth: 7,
    bossId: "stormWarden",
    name: "The Storm Warden",
    roomLabel: "Runestone Sanctum",
    intro: "The final chamber still obeys an oath sworn to the Runestone before the keep fell into fear and silence.",
    journal: "Cross the sanctum, break the Storm Warden, and reclaim the Runestone that once held the valley together.",
    clearText: "The Storm Warden breaks, and the last oath around the Runestone gives way.",
    rewardType: "none",
    guideLabel: "Runestone Guard",
    storyTag: "depth7",
    discoveryId: "storm_oath",
    bossStory: "The Warden was bound to guard the stone itself, not the ruined court that chose to hide behind it."
  }
};

const OPTIONAL_ENCOUNTER_DEFS = {
  cursed_cache: {
    id: "cursed_cache",
    label: "Cursed Cache",
    summary: "Fast value, real risk. Open it for gold and a tainted item.",
    unlock: "archive_maps",
    visualId: "cacheClosed"
  },
  ghost_merchant: {
    id: "ghost_merchant",
    label: "Ghost Merchant",
    summary: "Spend gold or blood for a precise tool while the dead keep score.",
    unlock: "ghost_bargains",
    visualId: "ghostMerchant"
  },
  blood_altar: {
    id: "blood_altar",
    label: "Blood Altar",
    summary: "Trade life for immediate power and a spike in floor danger.",
    visualId: "bloodAltar"
  },
  vault_room: {
    id: "vault_room",
    label: "Vault Room",
    summary: "A high-value chamber guarded by a formed squad.",
    visualId: "vaultChest"
  },
  scout_cache: {
    id: "scout_cache",
    label: "Scout Cache",
    summary: "Route notes and emergency stock in exchange for drawing fresh attention.",
    visualId: "cacheClosed"
  },
  smuggler_cache: {
    id: "smuggler_cache",
    label: "Smuggler Cache",
    summary: "Fast extract tools and hidden coin, if you are willing to announce that you found them.",
    unlock: "supply_cache",
    visualId: "cacheClosed"
  },
  oath_shrine: {
    id: "oath_shrine",
    label: "Oath Shrine",
    summary: "Trade blood or mana for warded gear and sharper next-floor leverage.",
    unlock: "temple_favors",
    visualId: "bloodAltar"
  },
  pilgrim_pool: {
    id: "pilgrim_pool",
    label: "Pilgrim Pool",
    summary: "Wash off curses and strain, but the glow tells the floor exactly where you are.",
    unlock: "temple_favors",
    visualId: "well"
  },
  moon_well: {
    id: "moon_well",
    label: "Moon Well",
    summary: "Restore fully and reveal the floor, but the glow stirs the halls.",
    visualId: "well"
  },
  surveyor_stash: {
    id: "surveyor_stash",
    label: "Surveyor Stash",
    summary: "A ledger case with route marks and a clean escape line, if you are willing to announce that you found it.",
    unlock: "archive_maps",
    visualId: "cacheClosed"
  },
  ember_cache: {
    id: "ember_cache",
    label: "Ember Cache",
    summary: "Emergency supplies for a second push: resist stock, field gold, and a little extra heat on the floor.",
    unlock: "guild_license",
    visualId: "cacheClosed"
  }
};

const PERK_DEFS = {
  brace: {
    id: "brace",
    family: "fighter",
    name: "Brace",
    description: "Waiting or resting grants temporary guard against the next hit.",
    weight: 5
  },
  cleave: {
    id: "cleave",
    family: "fighter",
    name: "Cleave",
    description: "Melee kills splash damage into one adjacent foe.",
    weight: 4
  },
  shield_mastery: {
    id: "shield_mastery",
    family: "fighter",
    name: "Shield Mastery",
    description: "Gain extra armor and charge resistance while carrying an offhand shield.",
    weight: 4
  },
  blooded: {
    id: "blooded",
    family: "fighter",
    name: "Blooded",
    description: "When wounded, your melee attacks hit harder.",
    weight: 3
  },
  backstab: {
    id: "backstab",
    family: "rogue",
    name: "Backstab",
    description: "Opening strikes against sleeping or unaware enemies deal bonus damage.",
    weight: 5
  },
  evasion: {
    id: "evasion",
    family: "rogue",
    name: "Evasion",
    description: "Gain a flat evade bonus and a stronger dodge while lightly burdened.",
    weight: 4
  },
  trap_sense: {
    id: "trap_sense",
    family: "rogue",
    name: "Trap Sense",
    description: "Searches reveal more traps and nearby trap tiles shimmer sooner.",
    weight: 4
  },
  quick_hands: {
    id: "quick_hands",
    family: "rogue",
    name: "Quick Hands",
    description: "Consumables, pickups, and opportunistic looting are safer under pressure.",
    weight: 3
  },
  spell_efficiency: {
    id: "spell_efficiency",
    family: "wizard",
    name: "Spell Efficiency",
    description: "Spells cost less mana to cast.",
    weight: 5
  },
  element_focus: {
    id: "element_focus",
    family: "wizard",
    name: "Element Focus",
    description: "Direct damage spells strike harder.",
    weight: 4
  },
  overcast_control: {
    id: "overcast_control",
    family: "wizard",
    name: "Overcast Control",
    description: "Overcasting burns less Constitution.",
    weight: 3
  },
  warding: {
    id: "warding",
    family: "wizard",
    name: "Warding",
    description: "Gain a larger mana pool and a layer of passive warding.",
    weight: 4
  }
};

const RELIC_DEFS = {
  survivor_talisman: {
    id: "survivor_talisman",
    category: "survival",
    name: "Survivor's Talisman",
    description: "Max HP rises and safe recovery becomes more reliable."
  },
  greedy_purse: {
    id: "greedy_purse",
    category: "greed",
    name: "Greedy Purse",
    description: "Extra gold drops, but danger rises faster after the objective is done."
  },
  anchoring_pin: {
    id: "anchoring_pin",
    category: "control",
    name: "Anchoring Pin",
    description: "Slows, summons, and hostile push effects are easier to resist."
  },
  fleet_boots: {
    id: "fleet_boots",
    category: "mobility",
    name: "Fleet Boots",
    description: "Move and reposition more safely under pressure."
  },
  cursed_prism: {
    id: "cursed_prism",
    category: "curse-tech",
    name: "Cursed Prism",
    description: "Gain power from cursed gear without paying the full price."
  },
  warding_lens: {
    id: "warding_lens",
    category: "control",
    name: "Warding Lens",
    description: "The floor telegraphs ranged and summoning threats more clearly."
  },
  hunter_map: {
    id: "hunter_map",
    category: "mobility",
    name: "Hunter's Map",
    description: "Objective markers reveal sooner, and search pressure rises more slowly."
  }
};

const BOON_DEFS = {
  windfall: {
    id: "windfall",
    name: "Windfall",
    description: "Gain gold and a rumor token."
  },
  field_medicine: {
    id: "field_medicine",
    name: "Field Medicine",
    description: "Restore vitality and gain one emergency heal."
  },
  aether_cache: {
    id: "aether_cache",
    name: "Aether Cache",
    description: "Restore mana and gain one mana potion."
  },
  hunter_mark: {
    id: "hunter_mark",
    name: "Hunter's Mark",
    description: "Your next elite drops an extra reward."
  }
};

const TOWN_UNLOCK_DEFS = {
  supply_cache: {
    id: "supply_cache",
    name: "Supply Cache",
    description: "Provisioner stocks one extra emergency tool each refresh, and smuggler caches begin appearing below."
  },
  guild_license: {
    id: "guild_license",
    name: "Guild License",
    description: "Wizard's Guild carries deeper books, battlefield wards, and charged tools."
  },
  temple_favors: {
    id: "temple_favors",
    name: "Temple Favors",
    description: "Temple services are cheaper, and blood altars, oath shrines, and pilgrim pools start appearing below."
  },
  archive_maps: {
    id: "archive_maps",
    name: "Archive Maps",
    description: "Rumors reveal themed objectives and cursed caches begin to appear."
  },
  ghost_bargains: {
    id: "ghost_bargains",
    name: "Ghost Bargains",
    description: "Ghost merchants begin appearing in the dungeon."
  },
  deep_contracts: {
    id: "deep_contracts",
    name: "Deep Contracts",
    description: "Vault rooms and higher-tier objective rewards enter the pool."
  }
};

const CONTRACT_DEFS = {
  pressed_descent: {
    id: "pressed_descent",
    name: "Pressed Descent",
    summary: "More rumor value, less breathing room.",
    description: "Reinforcement clocks start shorter, but resolved objectives pay one extra rumor token."
  },
  greed_ledger: {
    id: "greed_ledger",
    name: "Greed Ledger",
    summary: "Optional rooms pay more, and the floor notices.",
    description: "Greed rooms pay extra gold and one extra rumor token, but greed raises pressure harder."
  },
  scholar_road: {
    id: "scholar_road",
    name: "Scholar's Road",
    summary: "Cleaner route reads for a frailer start.",
    description: "Search reveals more route at a time and objectives pay extra rumor, but you begin each run with less maximum health."
  },
  hunters_call: {
    id: "hunters_call",
    name: "Hunter's Call",
    summary: "Elite bounty up, elite pressure up.",
    description: "Elite kills pay extra gold and rumor, but reinforcement waves are more likely to include an elite."
  },
  ration_run: {
    id: "ration_run",
    name: "Ration Run",
    summary: "Cleaner opening, less idle time.",
    description: "Begin with a healing potion and mapping scroll, but waiting, resting, and searching raise pressure harder."
  },
  sealed_return: {
    id: "sealed_return",
    name: "Sealed Return",
    summary: "Safer extract tools, harsher greed tax.",
    description: "Begin with a Rune of Return and one rumor token, but greed raises pressure harder and you begin runs with less maximum health."
  },
  route_debt: {
    id: "route_debt",
    name: "Route Debt",
    summary: "Sharper routes, harsher scouting tax.",
    description: "Begin with one rumor token and larger route reveals, but you start runs with lower maximum health and searching raises pressure harder."
  },
  trophy_path: {
    id: "trophy_path",
    name: "Trophy Path",
    summary: "Bigger elite payoff, meaner elite pressure.",
    description: "Elite kills pay extra gold and rumor, but reinforcement waves are more likely to include elite threats."
  },
  greedy_burden: {
    id: "greedy_burden",
    name: "Greedy Burden",
    summary: "Greed pays harder, weight punishes harder.",
    description: "Greed rooms pay more and town buyers pay better after return, but burden penalties worsen during the run and greed raises pressure harder."
  },
  last_light: {
    id: "last_light",
    name: "Last Light",
    summary: "Emergency opener, no room to idle.",
    description: "Begin with emergency stock, but waiting, resting, and searching all accelerate pressure harder than usual."
  }
};

const COMMENDATION_DEFS = {
  clean_extract: {
    id: "clean_extract",
    name: "Clean Extract",
    summary: "Archive badge for returning without taking a greed room.",
    rewardLabel: "Archive badge"
  },
  greed_specialist: {
    id: "greed_specialist",
    name: "Greed Specialist",
    summary: "Unlocks Greedy Burden after a greed-heavy extract.",
    rewardLabel: "Unlocks contract: Greedy Burden"
  },
  elite_hunter: {
    id: "elite_hunter",
    name: "Elite Hunter",
    summary: "Unlocks Trophy Path after an elite-heavy run.",
    rewardLabel: "Unlocks contract: Trophy Path"
  },
  route_reader: {
    id: "route_reader",
    name: "Route Reader",
    summary: "Unlocks Route Debt after a route-heavy extract.",
    rewardLabel: "Unlocks contract: Route Debt"
  },
  curse_survivor: {
    id: "curse_survivor",
    name: "Curse Survivor",
    summary: "Archive badge for extracting while carrying a curse or constitution strain.",
    rewardLabel: "Archive badge"
  },
  class_loyalist: {
    id: "class_loyalist",
    name: "Class Loyalist",
    summary: "Loyal class streaks earn a small prep edge on future runs.",
    rewardLabel: "Prep bonus: +1 rumor token on matching class starts"
  }
};

const CLASS_MASTERY_DEFS = {
  fighter: {
    id: "fighter",
    name: "Fighter Mastery",
    ranks: [
      {
        rank: 1,
        trigger: "objective",
        name: "Field Dressing",
        description: "Start future Fighter runs with one extra healing potion.",
        itemIds: ["healingPotion"]
      },
      {
        rank: 2,
        trigger: "extract",
        name: "Shield Drill",
        description: "Start future Fighter runs with a padded cap.",
        itemIds: ["paddedCap"]
      },
      {
        rank: 3,
        trigger: "objective",
        name: "Iron March",
        description: "Start future Fighter runs with warded greaves.",
        itemIds: ["wardedGreaves"]
      },
      {
        rank: 4,
        trigger: "extract",
        name: "Siege Lessons",
        description: "Start future Fighter runs already knowing Shield.",
        spellIds: ["shield"]
      }
    ]
  },
  rogue: {
    id: "rogue",
    name: "Rogue Mastery",
    ranks: [
      {
        rank: 1,
        trigger: "objective",
        name: "Route Notes",
        description: "Start future Rogue runs with a mapping scroll.",
        itemIds: ["mappingScroll"]
      },
      {
        rank: 2,
        trigger: "extract",
        name: "Street Contacts",
        description: "Start future Rogue runs with one rumor token.",
        rumorTokens: 1
      },
      {
        rank: 3,
        trigger: "objective",
        name: "Forward Kit",
        description: "Start future Rogue runs with pathfinder sandals.",
        itemIds: ["pathfinderSandals"]
      },
      {
        rank: 4,
        trigger: "extract",
        name: "Clean Exit",
        description: "Start future Rogue runs with a teleport scroll.",
        itemIds: ["teleportScroll"]
      }
    ]
  },
  wizard: {
    id: "wizard",
    name: "Wizard Mastery",
    ranks: [
      {
        rank: 1,
        trigger: "objective",
        name: "Guild Stores",
        description: "Start future Wizard runs with one extra mana potion.",
        itemIds: ["manaPotion"]
      },
      {
        rank: 2,
        trigger: "extract",
        name: "Prepared Study",
        description: "Start future Wizard runs already knowing Identify.",
        spellIds: ["identify"]
      },
      {
        rank: 3,
        trigger: "objective",
        name: "Warding Primer",
        description: "Start future Wizard runs with a Spellbook of Shield.",
        itemIds: ["spellbookShield"]
      },
      {
        rank: 4,
        trigger: "extract",
        name: "Far Sight",
        description: "Start future Wizard runs already knowing Clairvoyance.",
        spellIds: ["clairvoyance"]
      }
    ]
  }
};

const RUMOR_DEFS = {
  vermin_halls: {
    id: "vermin_halls",
    text: "The upper halls are restless. Expect fast packs and flankers."
  },
  barracks: {
    id: "barracks",
    text: "Broken barracks below still favor shield lines and archers."
  },
  crypts: {
    id: "crypts",
    text: "The deeper crypts answer noise with sorcery and undead screens."
  },
  gatekeeper: {
    id: "gatekeeper",
    text: "A scarred gatekeeper still commands the broken barracks below."
  },
  cryptlord: {
    id: "cryptlord",
    text: "The fifth depth is ruled by a named crypt lord and her dead household."
  },
  stormwarden: {
    id: "stormwarden",
    text: "The lowest sanctum still serves a storm-bound guardian and the Runestone behind it."
  },
  relic_hunt: {
    id: "relic_hunt",
    text: "A relic is being moved through the lower rooms. Someone marked the route."
  },
  nest: {
    id: "nest",
    text: "A nest is feeding one of the floors. Clear it before it floods the halls."
  },
  captive: {
    id: "captive",
    text: "A trapped survivor still lives below and may know the keep's patterns."
  },
  supplies: {
    id: "supplies",
    text: "A sealed field cache lies below. Whoever reaches it first will fight better for the rest of the floor."
  },
  waystone: {
    id: "waystone",
    text: "A survey waystone still survives below. Recover it and the next floor will read cleaner."
  },
  ledger: {
    id: "ledger",
    text: "An old route ledger still survives below. Recover it and the next descent will read cleaner."
  },
  shrine_path: {
    id: "shrine_path",
    text: "A ruined shrine is pulsing below. Clear the room first, then seal it before pressure breaks the line."
  },
  purify_well: {
    id: "purify_well",
    text: "A corrupted well is spoiling one floor. Purify it fast if you want a clean refill before greed."
  },
  beacon: {
    id: "beacon",
    text: "A warning beacon is waking patrols deeper in the keep. Break it fast if it appears."
  },
  watchfire: {
    id: "watchfire",
    text: "A dead watchfire sits below. Light it and the floor will read more clearly for a few clean turns."
  }
};

const STORY_NPCS = {
  steward: {
    id: "steward",
    name: "Halric Voss",
    title: "Town Steward",
    role: "Steward of the square and keeper of the old levy rolls."
  },
  templeKeeper: {
    id: "templeKeeper",
    name: "Sister Elira",
    title: "Temple Keeper",
    role: "Priestess who remembers the vows sworn when the keep still watched the valley."
  },
  guildSage: {
    id: "guildSage",
    name: "Magister Iven",
    title: "Guild Sage",
    role: "Old guild scholar who studies the Runestone and the weather it once anchored."
  },
  chronicler: {
    id: "chronicler",
    name: "Osric Dane",
    title: "Banker-Chronicler",
    role: "Ledger keeper who records each descent and keeps the town's surviving testimonies."
  }
};

const STORY_BEATS = {
  intro: {
    id: "intro",
    title: "The Steward's Charge",
    chapterObjective: "Go north into the keep, learn why its halls were sealed, and trace the Runestone into the lower vaults.",
    scene: [
      {
        speaker: "steward",
        text: "The valley still stands because the keep broke before the storms finished the job. When the Runestone vanished below, the garrison sealed the lower halls and never came back out."
      },
      {
        speaker: "guildSage",
        text: "The stone once held weather, warding, and order in balance. Without it, the keep rotted into factions: soldiers above, dead nobility below, and something older guarding the sanctum."
      },
      {
        speaker: "templeKeeper",
        text: "Bring the Runestone back and the town can breathe again. Learn what happened down there, but do not mistake every guardian for a simple monster."
      }
    ],
    journal: "Halric sent you into the keep to recover the Runestone and learn why the garrison sealed its own lower halls."
  },
  depth3: {
    id: "depth3",
    title: "The Sealed Barracks",
    chapterObjective: "Push below the gatehouse and find who ordered the keep closed against its own town.",
    entryText: "Barracks seals and execution marks still line the stone. This level was closed by loyal hands, not invaders.",
    clearText: "Hroth dies defending an order that should have ended with the keep.",
    returnScene: [
      {
        speaker: "steward",
        text: "The gate captain sealed the lower halls on command, then held that order past death. Whatever happened below was feared more than the storm outside."
      },
      {
        speaker: "chronicler",
        text: "That matches the surviving ledgers. Food and bodies both vanished into the lower stairs in the same week. After that, the keep stopped answering the town."
      }
    ],
    journal: "Hroth's orders prove the barracks sealed the lower keep from within. Someone chose secrecy over evacuation.",
    chronicleLabel: "Learned the barracks sealed the lower keep from within."
  },
  depth5: {
    id: "depth5",
    title: "The False Court Below",
    chapterObjective: "Break the crypt court and learn why the dead kept the Runestone buried instead of returning it to the valley.",
    entryText: "The crypt halls are arranged like a court that refused to admit its kingdom had already died.",
    clearText: "Veyra's court collapses, and with it the lie that the dead preserved the valley by hiding the stone.",
    returnScene: [
      {
        speaker: "guildSage",
        text: "The crypt lord did not guard the Runestone for the valley. She guarded the dignity of a dead court that would rather bury the world than surrender its last symbol of rule."
      },
      {
        speaker: "templeKeeper",
        text: "Then the oath below is broken in two parts: soldiers kept the door, and nobles kept the silence. Only the oldest vow remains now."
      }
    ],
    journal: "Veyra's court preserved the lie that the Runestone had to remain buried. The dead below chose possession over duty.",
    chronicleLabel: "Learned the dead court hid the Runestone to preserve its own broken authority."
  },
  depth7: {
    id: "depth7",
    title: "The Last Oath",
    chapterObjective: "Cross the sanctum, face the final oathbound guardian, and reclaim the Runestone for the town above.",
    entryText: "The sanctum is older than the ruined keep above it. Here the oath is to the stone itself, not to the soldiers or court that failed around it.",
    clearText: "The final oath breaks. The Runestone is no longer kept from the valley by fear, rank, or ritual.",
    journal: "Only the Storm Warden remains between the town and the Runestone. This guardian serves the oldest promise in the keep.",
    chronicleLabel: "Reached the sanctum where the oldest oath still bound the Runestone."
  },
  return: {
    id: "return",
    title: "The Runestone Returned",
    chapterObjective: "The first descent is complete. The town has the Runestone again, but the keep's full history is only beginning to surface.",
    scene: [
      {
        speaker: "steward",
        text: "The square feels different with the stone back in town. The keep above is still ruined, but it is no longer choosing our weather and fear for us."
      },
      {
        speaker: "guildSage",
        text: "You were right about the guardian below. The last oath was not hatred. It was duty twisted loose from the people it was meant to protect."
      },
      {
        speaker: "chronicler",
        text: "I will record this descent properly. The valley remembers storms, not causes. Now we finally have both."
      }
    ],
    journal: "The Runestone has been returned to town. The valley has its first real answer about the keep's fall."
  }
};

const TOWN_REACTION_DEFS = {
  first_elite: {
    id: "first_elite",
    label: "First Elite Down",
    steward: "Word is spreading that even the keep's named hunters can be broken.",
    guild: "Named foes leave stronger salvage. The guild wants to see what you carry back.",
    bank: "Osric has started a separate line in the ledger for elite kills."
  },
  depth3_gatekeeper: {
    id: "depth3_gatekeeper",
    label: "Gatekeeper Broken",
    steward: "The old barracks seal is broken. Halric starts planning for deeper supply pushes.",
    temple: "Sister Elira offers steadier prices now that the first oath below has cracked.",
    stockTag: "discipline"
  },
  depth5_cryptlord: {
    id: "depth5_cryptlord",
    label: "Crypt Court Broken",
    guild: "Magister Iven starts putting deeper warding tools on the shelf.",
    bank: "Osric records the fall of the false court and loosens rare contracts.",
    stockTag: "deep"
  },
  storm_knowledge: {
    id: "storm_knowledge",
    label: "Storm Knowledge",
    guild: "The guild starts prioritizing storm wards and return tools after your discoveries.",
    temple: "The temple warns that the last oath below is older and harsher than the others.",
    stockTag: "storm"
  },
  curse_pressure: {
    id: "curse_pressure",
    label: "Curse Pressure",
    temple: "The priests recognize the keep's corruption on sight and speak more urgently.",
    stockTag: "restoration"
  },
  route_ledger: {
    id: "route_ledger",
    label: "Route Ledger",
    bank: "Osric keeps a sharper route ledger now. Clean descents are worth more than blind wandering.",
    guild: "The guild has started marking cleaner survey tools for proven route-runners.",
    stockTag: "survey"
  },
  cache_runners: {
    id: "cache_runners",
    label: "Cache Runners",
    steward: "Scouts are posting cleaner notes after your first returns. People are planning deeper pushes again.",
    bank: "The steward wants spare gold turned into stockpiles, not pride. The ledger shows it.",
    stockTag: "supply"
  }
};

const DISCOVERY_DEFS = {
  gatehouse_orders: {
    id: "gatehouse_orders",
    title: "Torn Gate Orders",
    label: "Torn Orders",
    kind: "orders",
    propId: "loreBook",
    text: "Seal the lower route. No one from the valley enters. No one below returns without the chamberlain's writ. If the Runestone is not restored by dawn, the gate stays barred even against our own.",
    summary: "The gatehouse was ordered to seal the lower keep against the town itself."
  },
  crypt_epitaph: {
    id: "crypt_epitaph",
    title: "Crypt Epitaph",
    label: "Epitaph Slab",
    kind: "epitaph",
    propId: "inscribedStone",
    text: "Here the court keeps faith with stone, rank, and burial. Better the valley weather the storm above than witness the house of the keep surrender what made it sovereign.",
    summary: "The dead court hid the Runestone to preserve rank and sovereignty, not to save the valley."
  },
  storm_oath: {
    id: "storm_oath",
    title: "Sanctum Oath",
    label: "Oath Stone",
    kind: "oath",
    propId: "inscribedStone",
    text: "Guard the Runestone until it is claimed by one who serves the valley over crown, levy, or tomb. Let oath break before the storm is chained to pride again.",
    summary: "The oldest oath was meant to protect the valley from pride, not keep the Runestone hidden forever."
  },
  barracks_roll: {
    id: "barracks_roll",
    title: "Barracks Muster Roll",
    label: "Muster Roll",
    kind: "orders",
    propId: "loreBook",
    text: "Three squads reassigned below. Two returned without helms, and one did not return at all. Margin note: Keep the town ignorant until the chamberlain speaks.",
    summary: "The barracks sent men below in secret and hid the losses from the town."
  },
  shrine_inscription: {
    id: "shrine_inscription",
    title: "Shrine Inscription",
    label: "Shrine Tablet",
    kind: "inscription",
    propId: "inscribedStone",
    text: "The stone governs more than weather. It binds promise to place. Break oath around it, and the house that keeps it will sour before the land does.",
    summary: "The Runestone bound oath and place together; breaking faith around it corrupted the keep."
  },
  weather_log: {
    id: "weather_log",
    title: "Weather Log",
    label: "Weather Log",
    kind: "record",
    propId: "loreBook",
    text: "Wind rose from the valley after the stone was moved below. Frost formed indoors. Quartermaster requests release of the Runestone. Request denied by the court.",
    summary: "The valley began failing as soon as the court moved the Runestone below and refused to return it."
  },
  memorial_slate: {
    id: "memorial_slate",
    title: "Memorial Slate",
    label: "Memorial Slate",
    kind: "epitaph",
    propId: "inscribedStone",
    text: "For the carriers, warders, and nameless who took the stone below believing they would spare the valley. Their oath outlived their wisdom.",
    summary: "Some of the keep's defenders meant to save the valley, but their oath outlived their judgment."
  }
};

// src/core/entities.js

function weightedMonster(depth) {
  const options = MONSTER_DEFS.filter((monster) => monster.depth <= depth + 1 && !monster.unique);
  const bucket = [];
  options.forEach((monster) => {
    const weight = Math.max(1, 8 - Math.abs(depth - monster.depth) * 2);
    for (let i = 0; i < weight; i += 1) {
      bucket.push(monster);
    }
  });
  return choice(bucket);
}

function createMonster(template, x, y) {
  const depthBonus = Math.max(0, (template.depth || 1) - 1);
  const maxHp = template.hp + depthBonus * 3;
  return {
    ...structuredCloneCompat(template),
    x,
    y,
    hp: maxHp,
    maxHp,
    attack: template.attack + Math.floor(depthBonus / 2),
    defense: template.defense + Math.floor(depthBonus / 2),
    exp: template.exp + depthBonus * 6,
    mana: typeof template.mana === "number" ? template.mana : template.spells ? 12 : 0,
    alerted: 0,
    sleeping: Math.random() < 0.4,
    held: 0,
    slowed: 0,
    moveMeter: 100,
    chargeWindup: null,
    intent: null
  };
}

function createItem(id, overrides = {}) {
  const base = structuredCloneCompat(ITEM_DEFS[id]);
  if (!base) {
    return null;
  }
  const item = { ...base };
  if (item.kind === "weapon" || item.kind === "armor") {
    const rollValue = randInt(-2, 4);
    item.enchantment = rollValue <= -1 ? rollValue : rollValue >= 3 ? rollValue - 1 : 0;
    if (item.enchantment < 0 && Math.random() < 0.78) {
      item.cursed = true;
    }
    item.identified = overrides.identified ?? false;
  } else if (item.kind === "charged") {
    item.charges = randInt(Math.max(1, item.charges - 2), item.charges + 1);
    item.maxCharges = item.charges;
    item.identified = overrides.identified ?? false;
  } else if (item.kind === "spellbook") {
    item.identified = true;
  } else if (item.kind === "consumable") {
    item.identified = true;
  } else if (item.kind === "junk") {
    item.identified = true;
    item.cursed = Math.random() < 0.35;
  } else {
    item.identified = true;
  }
  const resolved = { ...item, ...overrides };
  return applyLootAffix(resolved, resolved.affixId);
}

function createTownItem(id) {
  const base = ITEM_DEFS[id];
  const overrides = { identified: true, cursed: false };
  if (base && (base.kind === "weapon" || base.kind === "armor")) {
    overrides.enchantment = 0;
  }
  if (base && base.kind === "charged") {
    overrides.charges = base.charges;
    overrides.maxCharges = base.charges;
  }
  return createItem(id, overrides);
}

function rollTreasure(depth) {
  let options = {};
  if (typeof depth === "object") {
    options = depth || {};
    depth = options.depth || 1;
  }
  const pool = Object.values(ITEM_DEFS).filter((item) => item.rarity <= depth + 2 && item.kind !== "quest");
  const bucket = [];
  pool.forEach((item) => {
    const weight = Math.max(1, 9 - item.rarity * 2);
    for (let i = 0; i < weight; i += 1) {
      bucket.push(item.id);
    }
  });
  const item = createItem(choice(bucket));
  if (!item) {
    return null;
  }
  const affixChance = options.quality === "milestone"
    ? 1
    : options.quality === "elite"
      ? 0.8
      : options.quality === "guarded"
        ? 0.55
        : depth >= 5
          ? 0.32
          : depth >= 3
            ? 0.18
            : 0;
  if ((item.kind === "weapon" || item.kind === "armor") && !item.affixId && affixChance > 0 && Math.random() < affixChance) {
    item.affixId = pickLootAffixId(item, depth, options);
    applyLootAffix(item, item.affixId);
  }
  return item;
}

function getLootAffix(item) {
  return item?.affixId ? LOOT_AFFIX_DEFS[item.affixId] || null : null;
}

function applyLootAffix(item, affixId) {
  if (!item || !affixId || item.affixApplied) {
    return item;
  }
  const affix = LOOT_AFFIX_DEFS[affixId];
  if (!affix) {
    return item;
  }
  const stats = affix.stats || {};
  item.affixId = affixId;
  item.affixApplied = true;
  item.affixCategory = affix.category;
  item.affixTags = affix.tags || [];
  if (stats.power) {
    item.power = (item.power || 0) + stats.power;
  }
  if (stats.armor) {
    item.armor = (item.armor || 0) + stats.armor;
  }
  if (stats.accuracyBonus) {
    item.accuracyBonus = (item.accuracyBonus || 0) + stats.accuracyBonus;
  }
  if (stats.critBonus) {
    item.critBonus = (item.critBonus || 0) + stats.critBonus;
  }
  if (stats.guardBonus) {
    item.guardBonus = (item.guardBonus || 0) + stats.guardBonus;
  }
  if (stats.wardBonus) {
    item.wardBonus = (item.wardBonus || 0) + stats.wardBonus;
  }
  if (stats.manaBonus) {
    item.manaBonus = (item.manaBonus || 0) + stats.manaBonus;
  }
  if (stats.strBonus) {
    item.strBonus = (item.strBonus || 0) + stats.strBonus;
  }
  if (stats.dexBonus) {
    item.dexBonus = (item.dexBonus || 0) + stats.dexBonus;
  }
  if (stats.conBonus) {
    item.conBonus = (item.conBonus || 0) + stats.conBonus;
  }
  if (stats.intBonus) {
    item.intBonus = (item.intBonus || 0) + stats.intBonus;
  }
  if (stats.searchBonus) {
    item.searchBonus = (item.searchBonus || 0) + stats.searchBonus;
  }
  if (stats.lightBonus) {
    item.lightBonus = (item.lightBonus || 0) + stats.lightBonus;
  }
  if (stats.bonusVsUndead) {
    item.bonusVsUndead = (item.bonusVsUndead || 0) + stats.bonusVsUndead;
  }
  if (stats.overcastRelief) {
    item.overcastRelief = (item.overcastRelief || 0) + stats.overcastRelief;
  }
  if (stats.cursedBias) {
    item.cursed = true;
  }
  return item;
}

function pickLootAffixId(item, depth, options = {}) {
  if (options.affixId && LOOT_AFFIX_DEFS[options.affixId]) {
    return options.affixId;
  }
  const candidates = [];
  const push = (id, weight = 1) => {
    for (let index = 0; index < weight; index += 1) {
      candidates.push(id);
    }
  };
  if (item.kind === "weapon") {
    push("executioners", 3);
    push("gravebane", depth >= 4 ? 2 : 1);
    if ((item.manaBonus || 0) > 0) {
      push("stormtouched", 3);
    }
    if ((item.weight || 0) <= 4) {
      push("scouts", 2);
    }
  }
  if (item.kind === "armor") {
    if (item.slot === "body" || item.slot === "offhand" || item.slot === "head") {
      push("wardens", 3);
    }
    if (item.slot === "cloak" || item.slot === "feet" || item.slot === "amulet") {
      push("scouts", 2);
    }
    if ((item.manaBonus || 0) > 0 || (item.wardBonus || 0) > 0 || item.slot === "ring" || item.slot === "amulet") {
      push("stormtouched", 3);
    }
    if (depth >= 4) {
      push("gravebane", 1);
    }
  }
  if (options.quality === "elite" || options.quality === "milestone") {
    push("wardens", 2);
    push("executioners", 2);
    push("stormtouched", 2);
    if (depth >= 4) {
      push("gravebane", 2);
    }
  }
  if (options.quality === "guarded") {
    push("wardens", 3);
  }
  if (depth >= 5) {
    push("hollow", 1);
  }
  return choice(candidates.length > 0 ? candidates : Object.keys(LOOT_AFFIX_DEFS));
}

function getRace(id) {
  return RACES.find((race) => race.id === id);
}

function getClass(id) {
  return CLASSES.find((role) => role.id === id);
}

function describeItem(item) {
  if (!item.identified && canIdentify(item)) {
    if (item.kind === "weapon") {
      return "Weapon of unknown quality";
    }
    if (item.kind === "armor") {
      return "Armor of unknown quality";
    }
    if (item.kind === "charged") {
      return "Charged item with hidden power";
    }
  }
  if (item.kind === "weapon") {
    const details = [`Weapon, power ${getItemPower(item)}`];
    if (item.affixId) {
      details.push(LOOT_AFFIX_DEFS[item.affixId]?.description || "specialized");
    }
    if (getItemAccuracyBonus(item)) {
      details.push(`${getItemAccuracyBonus(item) > 0 ? "+" : ""}${getItemAccuracyBonus(item)} accuracy`);
    }
    if (getItemCritBonus(item)) {
      details.push(`+${getItemCritBonus(item)} crit`);
    }
    if (getItemManaBonus(item)) {
      details.push(`+${getItemManaBonus(item)} mana`);
    }
    if (getItemStrBonus(item)) {
      details.push(`+${getItemStrBonus(item)} strength`);
    }
    if (getItemDexBonus(item)) {
      details.push(`+${getItemDexBonus(item)} dexterity`);
    }
    if (getItemConBonus(item)) {
      details.push(`+${getItemConBonus(item)} constitution`);
    }
    if (getItemIntBonus(item)) {
      details.push(`+${getItemIntBonus(item)} intelligence`);
    }
    if (getItemWardBonus(item)) {
      details.push(`ward ${getItemWardBonus(item)}`);
    }
    if (getItemBonusVsUndead(item)) {
      details.push(`+${getItemBonusVsUndead(item)} vs undead`);
    }
    if (getItemOvercastRelief(item)) {
      details.push(`-${getItemOvercastRelief(item)} overcast loss`);
    }
    if (item.identified && item.cursed) {
      details.push("cursed");
    }
    return details.join(", ");
  }
  if (item.kind === "armor") {
    const details = [`Armor ${getItemArmor(item)}`];
    if (item.affixId) {
      details.push(LOOT_AFFIX_DEFS[item.affixId]?.description || "specialized");
    }
    if (getItemGuardBonus(item)) {
      details.push(`guard ${getItemGuardBonus(item)}`);
    }
    if (getItemWardBonus(item)) {
      details.push(`ward ${getItemWardBonus(item)}`);
    }
    if (getItemManaBonus(item)) {
      details.push(`+${getItemManaBonus(item)} mana`);
    }
    if (getItemStrBonus(item)) {
      details.push(`+${getItemStrBonus(item)} strength`);
    }
    if (getItemDexBonus(item)) {
      details.push(`+${getItemDexBonus(item)} dexterity`);
    }
    if (getItemConBonus(item)) {
      details.push(`+${getItemConBonus(item)} constitution`);
    }
    if (getItemIntBonus(item)) {
      details.push(`+${getItemIntBonus(item)} intelligence`);
    }
    if (getItemLightBonus(item)) {
      details.push(`+${getItemLightBonus(item)} sight`);
    }
    if (getItemSearchBonus(item)) {
      details.push(`+${getItemSearchBonus(item)} search`);
    }
    if (getItemFireResist(item)) {
      details.push(`fire resist ${getItemFireResist(item)}`);
    }
    if (getItemColdResist(item)) {
      details.push(`cold resist ${getItemColdResist(item)}`);
    }
    if (getItemBonusVsUndead(item)) {
      details.push(`+${getItemBonusVsUndead(item)} vs undead`);
    }
    if (getItemOvercastRelief(item)) {
      details.push(`-${getItemOvercastRelief(item)} overcast loss`);
    }
    if (item.identified && item.cursed) {
      details.push("cursed");
    }
    return details.join(", ");
  }
  if (item.kind === "spellbook") {
    return `Teaches ${SPELLS[item.spell].name}`;
  }
  if (item.kind === "consumable") {
    return item.name;
  }
  if (item.kind === "charged") {
    return item.identified ? `${item.name}, ${item.charges}/${item.maxCharges || item.charges} charges` : "Mysterious wand or staff";
  }
  if (item.kind === "junk") {
    return item.cursed ? "Worthless and unpleasant to carry" : "Worth little";
  }
  if (item.kind === "quest") {
    return "Quest item";
  }
  return item.name || "";
}

function getItemName(item, forceReveal = false) {
  if (!item) {
    return "";
  }
  if (!forceReveal && !item.identified && canIdentify(item)) {
    if (item.kind === "weapon") {
      return "Unidentified Weapon";
    }
    if (item.kind === "armor") {
      return "Unidentified Armor";
    }
    if (item.kind === "charged") {
      return "Unknown Wand";
    }
  }
  const parts = [];
  if (item.cursed && (forceReveal || item.identified)) {
    parts.push("Cursed");
  }
  if ((item.kind === "weapon" || item.kind === "armor") && item.enchantment) {
    parts.push(item.enchantment > 0 ? `+${item.enchantment}` : `${item.enchantment}`);
  }
  if (item.affixId && (forceReveal || item.identified || !canIdentify(item))) {
    parts.push(LOOT_AFFIX_DEFS[item.affixId]?.name || "");
  }
  parts.push(item.name);
  if (item.kind === "charged" && (forceReveal || item.identified)) {
    parts.push(`(${item.charges}/${item.maxCharges || item.charges})`);
  }
  return parts.join(" ");
}

function getItemPower(item) {
  return Math.max(0, (item.power || 0) + (item.enchantment || 0));
}

function getItemArmor(item) {
  return Math.max(0, (item.armor || 0) + (item.enchantment || 0));
}

function getItemAccuracyBonus(item) {
  return item ? (item.accuracyBonus || 0) : 0;
}

function getItemCritBonus(item) {
  return item ? Math.max(0, item.critBonus || 0) : 0;
}

function getItemManaBonus(item) {
  if (!item) {
    return 0;
  }
  return (item.manaBonus || 0) + ((item.kind === "armor" && item.enchantment > 0 && item.slot === "ring") ? item.enchantment : 0);
}

function getItemStrBonus(item) {
  return item ? (item.strBonus || 0) : 0;
}

function getItemDexBonus(item) {
  if (!item) {
    return 0;
  }
  return (item.dexBonus || 0) + ((item.kind === "armor" && item.enchantment > 0 && item.slot === "feet") ? 1 : 0);
}

function getItemConBonus(item) {
  return item ? (item.conBonus || 0) : 0;
}

function getItemIntBonus(item) {
  return item ? (item.intBonus || 0) : 0;
}

function getItemLightBonus(item) {
  return (item.lightBonus || 0) + ((item.kind === "armor" && item.enchantment > 1 && item.slot === "amulet") ? 1 : 0);
}

function getItemGuardBonus(item) {
  return (item.guardBonus || 0) + ((item.kind === "armor" && item.enchantment > 1 && item.slot === "offhand") ? 1 : 0);
}

function getItemWardBonus(item) {
  return (item.wardBonus || 0) + ((item.kind === "armor" && item.enchantment > 1 && (item.slot === "ring" || item.slot === "amulet" || item.slot === "cloak")) ? 1 : 0);
}

function getItemFireResist(item) {
  return item ? (item.fireResist || 0) : 0;
}

function getItemColdResist(item) {
  return item ? (item.coldResist || 0) : 0;
}

function getItemSearchBonus(item) {
  return item ? (item.searchBonus || 0) : 0;
}

function getItemBonusVsUndead(item) {
  return item ? (item.bonusVsUndead || 0) : 0;
}

function getItemOvercastRelief(item) {
  return item ? (item.overcastRelief || 0) : 0;
}

function getItemValue(item) {
  let value = item.value || 0;
  if (item.enchantment) {
    value += item.enchantment * 18;
  }
  value += getItemAccuracyBonus(item) * 10;
  value += getItemCritBonus(item) * 14;
  value += getItemGuardBonus(item) * 16;
  value += getItemWardBonus(item) * 18;
  value += getItemManaBonus(item) * 14;
  value += getItemStrBonus(item) * 16;
  value += getItemDexBonus(item) * 16;
  value += getItemConBonus(item) * 18;
  value += getItemIntBonus(item) * 18;
  value += getItemSearchBonus(item) * 10;
  value += getItemFireResist(item) * 12;
  value += getItemColdResist(item) * 12;
  value += getItemBonusVsUndead(item) * 16;
  value += getItemOvercastRelief(item) * 18;
  if (item.affixId) {
    value += 26;
  }
  if (item.cursed) {
    value = Math.max(1, Math.round(value * 0.5));
  }
  if (item.kind === "charged") {
    value += (item.charges || 0) * 8;
  }
  return Math.max(1, value);
}

function getHealthRatio(actor) {
  if (!actor) {
    return 0;
  }
  const maxHp = Math.max(1, actor.maxHp || actor.hp || 1);
  return Math.max(0, Math.min(1, (actor.hp || 0) / maxHp));
}

function getMonsterHealthState(actor) {
  const ratio = getHealthRatio(actor);
  if (ratio >= 1) {
    return { label: "Unhurt", tone: "good", ratio };
  }
  if (ratio >= 0.7) {
    return { label: "Scratched", tone: "good", ratio };
  }
  if (ratio >= 0.4) {
    return { label: "Wounded", tone: "warning", ratio };
  }
  if (ratio >= 0.18) {
    return { label: "Bloodied", tone: "bad", ratio };
  }
  return { label: "Near death", tone: "bad", ratio };
}

function canIdentify(item) {
  return item.kind === "weapon" || item.kind === "armor" || item.kind === "charged";
}

function countUnknownItems(player) {
  let count = 0;
  player.inventory.forEach((item) => { if (canIdentify(item) && !item.identified) { count += 1; } });
  Object.values(player.equipment).forEach((item) => { if (item && canIdentify(item) && !item.identified) { count += 1; } });
  return count;
}

function classifyItem(item) {
  switch (item.kind) {
    case "weapon":
      return "Weapon";
    case "armor":
      return "Armor";
    case "consumable":
      return "Potion or Scroll";
    case "charged":
      return "Wand or Staff";
    case "spellbook":
      return "Spellbook";
    case "junk":
      return "Junk";
    case "quest":
      return "Quest Item";
    default:
      return "Item";
  }
}

function getCarryWeight(player) {
  const inventoryWeight = player.inventory.reduce((sum, item) => sum + (item.weight || 0), 0);
  const equippedWeight = Object.values(player.equipment).reduce((sum, item) => sum + (item ? item.weight || 0 : 0), 0);
  const goldWeight = Math.floor((player.gold || 0) / 120);
  return inventoryWeight + equippedWeight + goldWeight;
}

function getCarryCapacity(player) {
  const strength = player?.effectiveStats?.str ?? player?.stats?.str ?? 0;
  return strength * 3 + 12;
}

function encumbranceTone(player) {
  const weight = getCarryWeight(player);
  const capacity = getCarryCapacity(player);
  if (weight > capacity) {
    return "value-bad";
  }
  if (weight > capacity * 0.75) {
    return "value-warning";
  }
  return "value-good";
}

function shopAcceptsItem(shopId, item) {
  if (shopId === "junk") {
    return true;
  }
  if (shopId === "armory") {
    return item.kind === "weapon" || item.kind === "armor";
  }
  if (shopId === "guild") {
    return item.kind === "spellbook" || item.kind === "charged" || (item.kind === "weapon" && item.manaBonus) || (item.kind === "armor" && (item.manaBonus || item.wardBonus));
  }
  if (shopId === "general") {
    return item.kind === "consumable" || item.kind === "charged" || (item.kind === "armor" && ["feet", "cloak", "amulet"].includes(item.slot));
  }
  return false;
}

function curseRandomCarriedItem(player) {
  const candidates = [...player.inventory, ...Object.values(player.equipment).filter(Boolean)].filter((item) => item.kind === "weapon" || item.kind === "armor");
  if (candidates.length === 0) {
    return;
  }
  const item = choice(candidates);
  item.cursed = true;
  item.identified = true;
}

function miniMapColor(tile, visible) {
  switch (tile.kind) {
    case "wall":
    case "buildingWall":
    case "pillar":
    case "tree":
    case "secretWall":
      return visible ? "#343434" : "#1b1b1b";
    case "secretDoor":
      return tile.hidden ? (visible ? "#343434" : "#1b1b1b") : "#c0a16b";
    case "floor":
    case "road":
    case "stone":
    case "plaza":
    case "buildingFloor":
      return visible ? "#9f947e" : "#5f574c";
    case "stairDown":
      return "#b68c2f";
    case "stairUp":
      return "#8db551";
    case "altar":
      return "#b28ecf";
    case "trap":
      return tile.hidden && !visible ? "#5f574c" : "#a34b35";
    case "fountain":
      return "#63a5cf";
    case "throne":
      return "#d0b06d";
    default:
      return visible ? "#8a8a8a" : "#4a4a4a";
  }
}

function createEmptyEquipment() {
  return {
    weapon: null,
    offhand: null,
    head: null,
    body: null,
    cloak: null,
    feet: null,
    ring1: null,
    ring2: null,
    ring3: null,
    ring4: null,
    amulet1: null,
    amulet2: null
  };
}

function normalizeEquipment(equipment = {}) {
  const normalized = {
    ...createEmptyEquipment(),
    ...(equipment || {})
  };
  if (!normalized.ring1 && equipment?.ring) {
    normalized.ring1 = equipment.ring;
  }
  if (!normalized.amulet1 && equipment?.amulet) {
    normalized.amulet1 = equipment.amulet;
  }
  return Object.fromEntries(Object.entries(createEmptyEquipment()).map(([slot]) => [slot, normalized[slot] || null]));
}

function getExploredPercent(level) {
  if (!level || !level.explored || level.explored.length === 0) {
    return 0;
  }
  const explored = level.explored.reduce((sum, cell) => sum + (cell ? 1 : 0), 0);
  return Math.round((explored / level.explored.length) * 100);
}

function normalizePlayer(player) {
  const normalized = structuredCloneCompat(player);
  normalized.constitutionLoss = normalized.constitutionLoss || 0;
  normalized.deepestDepth = normalized.deepestDepth || normalized.currentDepth || 0;
  normalized.moveSpeed = normalized.moveSpeed || 100;
  normalized.moveTurnBudget = normalized.moveTurnBudget || 0;
  normalized.slowed = normalized.slowed || 0;
  normalized.tempGuard = normalized.tempGuard || 0;
  normalized.held = normalized.held || 0;
  normalized.lightBuffTurns = normalized.lightBuffTurns || 0;
  normalized.arcaneWardTurns = normalized.arcaneWardTurns || 0;
  normalized.stoneSkinTurns = normalized.stoneSkinTurns || 0;
  normalized.resistFireTurns = normalized.resistFireTurns || 0;
  normalized.resistColdTurns = normalized.resistColdTurns || 0;
  normalized.perks = Array.isArray(normalized.perks) ? normalized.perks : [];
  normalized.relics = Array.isArray(normalized.relics) ? normalized.relics : [];
  normalized.knownRumors = Array.isArray(normalized.knownRumors) ? normalized.knownRumors : [];
  normalized.spellsKnown = Array.isArray(normalized.spellsKnown)
    ? [...new Set(normalized.spellsKnown.filter((spellId) => Boolean(SPELLS[spellId])))]
    : [];
  normalized.spellTrayIds = Array.isArray(normalized.spellTrayIds)
    ? [...new Set(normalized.spellTrayIds.filter((spellId) => normalized.spellsKnown.includes(spellId)))]
    : normalized.spellsKnown.slice(0, 8);
  if (normalized.spellTrayIds.length === 0 && normalized.spellsKnown.length > 0) {
    normalized.spellTrayIds = normalized.spellsKnown.slice(0, 8);
  }
  normalized.runCurrencies = {
    rumorTokens: 0,
    hunterMark: 0,
    templeFavor: 0,
    ...(normalized.runCurrencies || {})
  };
  normalized.quest = {
    hasRunestone: false,
    complete: false,
    milestonesCleared: [],
    namedBossesDefeated: [],
    briefingsSeen: [],
    discoveryIdsFound: [],
    storyBeatFlags: {},
    npcSceneFlags: {},
    returnSting: null,
    ...(normalized.quest || {})
  };
  normalized.quest.milestonesCleared = Array.isArray(normalized.quest.milestonesCleared) ? normalized.quest.milestonesCleared : [];
  normalized.quest.namedBossesDefeated = Array.isArray(normalized.quest.namedBossesDefeated) ? normalized.quest.namedBossesDefeated : [];
  normalized.quest.briefingsSeen = Array.isArray(normalized.quest.briefingsSeen) ? normalized.quest.briefingsSeen : [];
  normalized.quest.discoveryIdsFound = Array.isArray(normalized.quest.discoveryIdsFound) ? normalized.quest.discoveryIdsFound : [];
  normalized.quest.storyBeatFlags = normalized.quest.storyBeatFlags || {};
  normalized.quest.npcSceneFlags = normalized.quest.npcSceneFlags || {};
  normalized.quest.returnSting = normalized.quest.returnSting || null;
  normalized.inventory = (normalized.inventory || []).map(normalizeItem);
  normalized.equipment = normalizeEquipment(normalized.equipment);
  Object.keys(normalized.equipment || {}).forEach((slot) => {
    if (normalized.equipment[slot]) {
      normalized.equipment[slot] = normalizeItem(normalized.equipment[slot]);
    }
  });
  return normalized;
}

function normalizeLevels(levels) {
  return (levels || []).map((level) => ({
    ...level,
    floorObjective: level.floorObjective || null,
    floorOptional: level.floorOptional || null,
    floorSpecial: level.floorSpecial || null,
    floorSpecialSummary: level.floorSpecialSummary || "",
    activeEliteNames: Array.isArray(level.activeEliteNames) ? level.activeEliteNames : [],
    milestone: level.milestone || null,
    discoveries: level.discoveries || [],
    reservedRoomIndexes: level.reservedRoomIndexes || [],
    floorResolved: Boolean(level.floorResolved),
    dangerScore: level.dangerScore || 0,
    dangerLevel: level.dangerLevel || "Low",
    dangerTone: level.dangerTone || "good",
    dangerTriggers: level.dangerTriggers || { turns: 0, rests: 0, waits: 0, searches: 0, loud: 0, greed: 0 },
    reinforcementClock: level.reinforcementClock || 0,
    directorFlags: level.directorFlags || { mediumTriggered: false, highTriggered: false, criticalTriggered: false, introShown: false },
    items: (level.items || []).map((item) => item.kind === "gold" ? item : normalizeItem(item)),
    actors: (level.actors || []).map((actor) => ({
      sleeping: actor.sleeping ?? false,
      alerted: actor.alerted || 0,
      mana: actor.mana || 0,
      held: actor.held || 0,
      slowed: actor.slowed || 0,
      moveMeter: typeof actor.moveMeter === "number" ? actor.moveMeter : 100,
      chargeWindup: actor.chargeWindup || null,
      intent: null,
      maxHp: actor.maxHp || actor.hp || 1,
      ...actor
    }))
  }));
}

function normalizeItem(item) {
  const base = ITEM_DEFS[item.id] || {};
  const normalized = { ...base, ...structuredCloneCompat(item) };
  if (normalized.kind === "charged") {
    normalized.maxCharges = normalized.maxCharges || base.charges || normalized.charges || 1;
    normalized.identified = normalized.identified ?? false;
  }
  if (normalized.kind === "weapon" || normalized.kind === "armor") {
    normalized.enchantment = normalized.enchantment || 0;
    normalized.identified = normalized.identified ?? false;
    normalized.cursed = normalized.cursed || false;
  }
  if (normalized.kind === "consumable" || normalized.kind === "spellbook" || normalized.kind === "quest" || normalized.kind === "junk") {
    normalized.identified = normalized.identified ?? true;
  }
  return normalized;
}

function createInitialShopState() {
  return normalizeShopState(Object.fromEntries(Object.entries(SHOPS).map(([id, shop]) => [id, {
    stock: shuffle([...shop.stock]).slice(0, Math.max(0, Math.min(shop.stock.length, id === "guild" ? 8 : 6))),
    buyback: [],
    lastRefresh: 0
  }])));
}

function normalizeShopState(shopState) {
  const state = structuredCloneCompat(shopState || {});
  Object.keys(SHOPS).forEach((id) => {
    if (!state[id]) {
      state[id] = { stock: [...SHOPS[id].stock], buyback: [], lastRefresh: 0 };
    }
    state[id].stock = state[id].stock || [...SHOPS[id].stock];
    state[id].buyback = state[id].buyback || [];
    state[id].lastRefresh = state[id].lastRefresh || 0;
  });
  return state;
}

function getEncumbranceTier(player) {
  const weight = getCarryWeight(player);
  const capacity = getCarryCapacity(player);
  if (weight > capacity) {
    return 2;
  }
  if (weight > capacity * 0.75) {
    return 1;
  }
  return 0;
}

// src/core/settings.js

function defaultSettings() {
  return {
    soundEnabled: true,
    musicEnabled: false,
    uiScale: "compact",
    effectIntensity: "standard",
    reducedMotionEnabled: false,
    touchControlsEnabled: true,
    controllerHintsEnabled: true
  };
}

function loadSettings() {
  try {
    if (typeof localStorage === "undefined") {
      return defaultSettings();
    }
    return { ...defaultSettings(), ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}")) };
  } catch {
    return defaultSettings();
  }
}

function saveSettings(settings) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }
}

// src/core/command-result.js
function createCommandResult() {
  return {
    logs: [],
    sounds: [],
    autosave: false,
    refreshChrome: false,
    render: false
  };
}

function addCommandLog(result, message, tone = "") {
  result.logs.push({ message, tone });
  return result;
}

function addCommandSound(result, sound) {
  if (sound) {
    result.sounds.push(sound);
  }
  return result;
}

function applyCommandResult(game, result) {
  if (!result) {
    return;
  }
  result.logs.forEach((entry) => game.log(entry.message, entry.tone));
  result.sounds.forEach((sound) => game.audio.play(sound));
  if (result.autosave) {
    game.saveGame({ silent: true });
  }
  if (result.refreshChrome) {
    game.refreshChrome();
  }
  if (result.render) {
    game.render();
  }
}

// src/features/persistence.js

const SAVE_FORMAT_VERSION = 9;
const SAVE_SLOT_COUNT = 3;

function getSaveSlotKey(slotId) {
  return `${SAVE_KEY}:slot:${slotId}`;
}

function getOrderedSlotIds() {
  return Array.from({ length: SAVE_SLOT_COUNT }, (_, index) => index + 1);
}

function parseStoredSnapshot(raw) {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function buildSaveMeta(snapshot, slotId = null) {
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }
  const meta = snapshot.meta || {};
  const player = snapshot.player || {};
  return {
    slotId,
    name: meta.name || player.name || "Unknown",
    level: meta.level || player.level || "?",
    depth: meta.depth || snapshot.currentDepth || "?",
    savedAt: meta.savedAt || "",
    classId: meta.classId || player.classId || "",
    className: meta.className || player.className || "",
    raceId: meta.raceId || player.raceId || "",
    raceName: meta.raceName || player.race || ""
  };
}

function getLegacySnapshot() {
  return parseStoredSnapshot(typeof localStorage !== "undefined" ? localStorage.getItem(SAVE_KEY) : null);
}

function getStoredSlotEntries() {
  const entries = getOrderedSlotIds().map((slotId) => {
    const snapshot = parseStoredSnapshot(typeof localStorage !== "undefined" ? localStorage.getItem(getSaveSlotKey(slotId)) : null);
    return {
      slotId,
      snapshot,
      meta: buildSaveMeta(snapshot, slotId)
    };
  });
  const hasSlotSnapshot = entries.some((entry) => Boolean(entry.snapshot));
  if (!hasSlotSnapshot) {
    const legacySnapshot = getLegacySnapshot();
    if (legacySnapshot) {
      entries[0] = {
        slotId: 1,
        snapshot: legacySnapshot,
        meta: buildSaveMeta(legacySnapshot, 1)
      };
    }
  }
  return entries;
}

function getLatestSlotEntry(entries = getStoredSlotEntries()) {
  return entries
    .filter((entry) => Boolean(entry.meta))
    .sort((left, right) => {
      const leftTime = left.meta?.savedAt ? new Date(left.meta.savedAt).getTime() : 0;
      const rightTime = right.meta?.savedAt ? new Date(right.meta.savedAt).getTime() : 0;
      if (rightTime !== leftTime) {
        return rightTime - leftTime;
      }
      return left.slotId - right.slotId;
    })[0] || null;
}

function getPreferredSaveSlotId(activeSlotId = null) {
  const entries = getStoredSlotEntries();
  if (activeSlotId && entries.some((entry) => entry.slotId === activeSlotId)) {
    return activeSlotId;
  }
  const firstEmpty = entries.find((entry) => !entry.meta);
  if (firstEmpty) {
    return firstEmpty.slotId;
  }
  const oldestFilled = entries
    .filter((entry) => Boolean(entry.meta))
    .sort((left, right) => {
      const leftTime = left.meta?.savedAt ? new Date(left.meta.savedAt).getTime() : 0;
      const rightTime = right.meta?.savedAt ? new Date(right.meta.savedAt).getTime() : 0;
      if (leftTime !== rightTime) {
        return leftTime - rightTime;
      }
      return left.slotId - right.slotId;
    })[0];
  return oldestFilled?.slotId || 1;
}

function getSnapshotForSlot(slotId = null) {
  const entries = getStoredSlotEntries();
  if (slotId) {
    const target = entries.find((entry) => entry.slotId === slotId);
    return target?.snapshot ? { slotId, snapshot: target.snapshot } : null;
  }
  const latest = getLatestSlotEntry(entries);
  return latest?.snapshot ? { slotId: latest.slotId, snapshot: latest.snapshot } : null;
}

function packBooleanArray(values = []) {
  let packed = "";
  for (let index = 0; index < values.length; index += 4) {
    let nibble = 0;
    if (values[index]) {
      nibble |= 8;
    }
    if (values[index + 1]) {
      nibble |= 4;
    }
    if (values[index + 2]) {
      nibble |= 2;
    }
    if (values[index + 3]) {
      nibble |= 1;
    }
    packed += nibble.toString(16);
  }
  return packed;
}

function unpackBooleanArray(packed = "", length = 0) {
  const values = [];
  for (let index = 0; index < packed.length; index += 1) {
    const nibble = Number.parseInt(packed[index], 16) || 0;
    values.push(Boolean(nibble & 8));
    values.push(Boolean(nibble & 4));
    values.push(Boolean(nibble & 2));
    values.push(Boolean(nibble & 1));
  }
  return values.slice(0, length);
}

function serializeTiles(tiles = []) {
  const palette = [];
  const paletteIndex = new Map();
  const refs = [];
  tiles.forEach((tile) => {
    const key = JSON.stringify(tile || {});
    let index = paletteIndex.get(key);
    if (typeof index !== "number") {
      index = palette.length;
      palette.push(key);
      paletteIndex.set(key, index);
    }
    refs.push(index);
  });
  return { palette, refs };
}

function deserializeTiles(palette = [], refs = []) {
  const parsedPalette = palette.map((entry) => parseStoredSnapshot(entry) || {});
  return refs.map((index) => ({ ...(parsedPalette[index] || {}) }));
}

function serializeLevel(level) {
  if (!level || typeof level !== "object") {
    return level;
  }
  const serialized = { ...level };
  if (Array.isArray(level.tiles)) {
    const { palette, refs } = serializeTiles(level.tiles);
    serialized.tilePalette = palette;
    serialized.tileRefs = refs;
    delete serialized.tiles;
  }
  if (Array.isArray(level.explored)) {
    serialized.exploredBits = packBooleanArray(level.explored);
    serialized.exploredLength = level.explored.length;
    delete serialized.explored;
  }
  if (Array.isArray(level.visible)) {
    serialized.visibleBits = packBooleanArray(level.visible);
    serialized.visibleLength = level.visible.length;
    delete serialized.visible;
  }
  return serialized;
}

function deserializeLevel(level) {
  if (!level || typeof level !== "object") {
    return level;
  }
  const restored = { ...level };
  if (Array.isArray(level.tilePalette) && Array.isArray(level.tileRefs)) {
    restored.tiles = deserializeTiles(level.tilePalette, level.tileRefs);
    delete restored.tilePalette;
    delete restored.tileRefs;
  }
  if (typeof level.exploredBits === "string") {
    restored.explored = unpackBooleanArray(level.exploredBits, level.exploredLength || 0);
    delete restored.exploredBits;
    delete restored.exploredLength;
  }
  if (typeof level.visibleBits === "string") {
    restored.visible = unpackBooleanArray(level.visibleBits, level.visibleLength || 0);
    delete restored.visibleBits;
    delete restored.visibleLength;
  }
  return restored;
}

function serializeSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return snapshot;
  }
  return {
    ...snapshot,
    levels: Array.isArray(snapshot.levels) ? snapshot.levels.map((level) => serializeLevel(level)) : []
  };
}

function deserializeSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return snapshot;
  }
  return {
    ...snapshot,
    levels: Array.isArray(snapshot.levels) ? snapshot.levels.map((level) => deserializeLevel(level)) : []
  };
}

function resetDungeonMapState(levels = []) {
  levels.forEach((level) => {
    if (!level || level.kind !== "dungeon") {
      return;
    }
    if (Array.isArray(level.explored)) {
      level.explored = level.explored.map(() => false);
    }
    if (Array.isArray(level.visible)) {
      level.visible = level.visible.map(() => false);
    }
    if (level.guidance && typeof level.guidance === "object") {
      level.guidance.entryReconApplied = false;
      if (typeof level.guidance.revealedRouteSteps === "number") {
        level.guidance.revealedRouteSteps = 0;
      }
    }
  });
}

function getAllSavedRunMeta() {
  return getStoredSlotEntries().map((entry) => ({
    slotId: entry.slotId,
    meta: entry.meta ? { ...entry.meta } : null
  }));
}

function getSavedRunMeta(slotId = null) {
  const entries = getStoredSlotEntries();
  if (slotId) {
    return entries.find((entry) => entry.slotId === slotId)?.meta || null;
  }
  return getLatestSlotEntry(entries)?.meta || null;
}

function formatSaveStamp(isoString) {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return `Saved ${parsed.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
}

function syncSaveChrome(game) {
  const meta = getSavedRunMeta(game.activeSaveSlotId) || getSavedRunMeta();
  const width = typeof window !== "undefined" ? window.innerWidth : 999;
  if (game.saveStamp) {
    if (!meta) {
      game.saveStamp.textContent = width <= 640 ? "No save" : "No save available";
      game.saveStamp.title = "No saved run in browser storage";
    } else {
      const timeLabel = meta.savedAt ? formatSaveStamp(meta.savedAt) : null;
      const slotPrefix = meta.slotId ? `S${meta.slotId} ` : "";
      const compact = width <= 640;
      const veryCompact = width <= 520;
      game.saveStamp.textContent = veryCompact
        ? timeLabel
          ? `${slotPrefix}Lv.${meta.level} D${meta.depth} - ${timeLabel.replace("Saved ", "")}`
          : `${slotPrefix}Lv.${meta.level} D${meta.depth}`
        : compact
          ? timeLabel
            ? `${slotPrefix}${meta.name} Lv.${meta.level} D${meta.depth} - ${timeLabel.replace("Saved ", "")}`
            : `${slotPrefix}${meta.name} Lv.${meta.level} D${meta.depth}`
        : timeLabel
          ? `${slotPrefix}${meta.name} Lv.${meta.level} Depth ${meta.depth} - ${timeLabel}`
          : `${slotPrefix}${meta.name} Lv.${meta.level} Depth ${meta.depth}`;
      game.saveStamp.title = timeLabel
        ? `Save slot ${meta.slotId || "?"}: ${meta.name}, level ${meta.level}, depth ${meta.depth}. ${timeLabel}.`
        : `Save slot ${meta.slotId || "?"}: ${meta.name}, level ${meta.level}, depth ${meta.depth}.`;
    }
  }
  if (game.quickSaveButton) {
    game.quickSaveButton.disabled = !game.player || game.mode === "title";
  }
  if (game.quickLoadButton) {
    game.quickLoadButton.disabled = !meta;
  }
}

function createSaveSnapshot(game) {
  return {
    saveFormatVersion: SAVE_FORMAT_VERSION,
    version: APP_VERSION,
    turn: game.turn,
    currentDepth: game.currentDepth,
    levels: game.levels,
    player: game.player,
    settings: game.settings,
    shopState: game.shopState,
    storyFlags: game.storyFlags,
    townUnlocks: game.townUnlocks,
    shopTiers: game.shopTiers,
    townState: game.townState,
    rumorTable: game.rumorTable,
    chronicleEvents: game.chronicleEvents,
    deathContext: game.deathContext,
    telemetry: game.telemetry,
    contracts: game.contracts,
    classMasteries: game.classMasteries,
    runSummaryHistory: game.runSummaryHistory,
    lastTownRefreshTurn: game.lastTownRefreshTurn,
    meta: {
      name: game.player.name,
      level: game.player.level,
      depth: game.currentDepth,
      classId: game.player.classId,
      className: game.player.className,
      raceId: game.player.raceId,
      raceName: game.player.race,
      savedAt: new Date().toISOString()
    }
  };
}

function migrateSnapshot(snapshot) {
  const migrated = { ...snapshot };
  const originalVersion = migrated.saveFormatVersion || 1;
  if (!migrated.saveFormatVersion) {
    migrated.saveFormatVersion = 1;
  }
  if (!migrated.storyFlags) {
    migrated.storyFlags = {};
  }
  if (!migrated.lastTownRefreshTurn) {
    migrated.lastTownRefreshTurn = 0;
  }
  if (!migrated.shopState) {
    migrated.shopState = {};
  }
  if (!migrated.townUnlocks) {
    migrated.townUnlocks = {};
  }
  if (!migrated.shopTiers) {
    migrated.shopTiers = {};
  }
  if (!migrated.townState) {
    migrated.townState = {};
  }
  if (!migrated.rumorTable) {
    migrated.rumorTable = [];
  }
  if (!migrated.chronicleEvents) {
    migrated.chronicleEvents = [];
  }
  if (!("deathContext" in migrated)) {
    migrated.deathContext = null;
  }
  if (!("telemetry" in migrated)) {
    migrated.telemetry = null;
  }
  if (!("contracts" in migrated)) {
    migrated.contracts = null;
  }
  if (!("classMasteries" in migrated)) {
    migrated.classMasteries = null;
  }
  if (!("runSummaryHistory" in migrated)) {
    migrated.runSummaryHistory = [];
  }
  if (originalVersion < 6 && Array.isArray(migrated.levels)) {
    resetDungeonMapState(migrated.levels);
  }
  migrated.saveFormatVersion = SAVE_FORMAT_VERSION;
  return migrated;
}

function saveGame(game, options = {}) {
  if (!game.player) {
    return;
  }
  const { silent = false, slotId = null } = options;
  recordTelemetry(game, "save_game", {
    saveMode: silent ? "autosave" : "manual"
  });
  const resolvedSlotId = getPreferredSaveSlotId(slotId || game.activeSaveSlotId || null);
  const snapshot = createSaveSnapshot(game);
  localStorage.setItem(getSaveSlotKey(resolvedSlotId), JSON.stringify(serializeSnapshot(snapshot)));
  game.activeSaveSlotId = resolvedSlotId;
  if (!silent) {
    game.log(`Game saved to slot ${resolvedSlotId}.`, "good");
  }
  game.refreshChrome();
  game.render();
}

function loadGame(game, options = {}) {
  const { slotId = null } = options;
  const resolved = getSnapshotForSlot(slotId || game.activeSaveSlotId || null);
  if (!resolved?.snapshot) {
    game.log("No saved game is available.", "warning");
    game.render();
    return;
  }
  const snapshot = migrateSnapshot(deserializeSnapshot(resolved.snapshot));
  localStorage.setItem(getSaveSlotKey(resolved.slotId), JSON.stringify(serializeSnapshot(snapshot)));
  game.turn = snapshot.turn;
  game.levels = normalizeLevels(snapshot.levels);
  game.player = normalizePlayer(snapshot.player);
  game.ensureEquipmentAliases?.(game.player);
  game.syncPlayerSpellTray?.(game.player);
  game.currentDepth = snapshot.currentDepth;
  game.currentLevel = game.levels[game.currentDepth];
  game.settings = { ...defaultSettings(), ...(snapshot.settings || game.settings) };
  saveSettings(game.settings);
  game.audio.updateSettings(game.settings);
  game.shopState = normalizeShopState(snapshot.shopState);
  game.storyFlags = snapshot.storyFlags || {};
  game.townUnlocks = snapshot.townUnlocks || {};
  game.shopTiers = snapshot.shopTiers || {};
  game.townState = snapshot.townState || {};
  game.rumorTable = snapshot.rumorTable || [];
  game.chronicleEvents = snapshot.chronicleEvents || [];
  game.deathContext = snapshot.deathContext || null;
  game.lastTownRefreshTurn = snapshot.lastTownRefreshTurn || 0;
  game.telemetry = snapshot.telemetry || null;
  game.contracts = snapshot.contracts || null;
  game.classMasteries = snapshot.classMasteries || null;
  game.runSummaryHistory = snapshot.runSummaryHistory || [];
  game.pendingSpellChoices = 0;
  game.pendingPerkChoices = 0;
  game.pendingRewardChoice = null;
  game.pendingRewardQueue = [];
  game.pendingTurnResolution = null;
  game.activeSaveSlotId = resolved.slotId;
  game.mode = "game";
  game.pendingShop = null;
  game.pendingService = null;
  if (game.resetReadState) {
    game.resetReadState();
  }
  ensureBuildState(game);
  ensureMetaProgressionState(game);
  mergeLegacyTownUnlocks(game, snapshot.townUnlocks || {});
  ensureTownMetaState(game);
  ensureChronicleState(game);
  initializeTelemetry(game);
  game.recalculateDerivedStats();
  game.closeModal();
  game.syncAdaptiveLayout?.(true);
  syncFloorState(game);
  syncDangerState(game);
  game.updateFov();
  game.updateMonsterIntents();
  recordTelemetry(game, "load_game", {
    saveMode: "manual"
  });
  game.log(`Save slot ${resolved.slotId} restored.`, "good");
  game.refreshChrome();
  game.render();
}

// src/features/creation.js

const CREATION_STAT_KEYS = ["str", "dex", "con", "int"];
const CREATION_STAT_LABELS = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence"
};
const CREATION_STAT_NOTES = {
  str: "Melee accuracy, damage, burden",
  dex: "Evasion, armor read, searching",
  con: "Health, recovery, overcast safety",
  int: "Mana, spell power, searching"
};
const CREATION_STAT_POINT_BUDGET = 6;
const CREATION_STAT_POINT_CAP = 4;

const RACE_ART = {
  human: {
    title: "Valley-born",
    accent: "#d48b5a",
    sprite: {
      src: `${PIXEL_ASSET_ROOT}/Character_animation/priests_idle/priest1/v1/priest1_v1_1.png`,
      width: 16,
      height: 16
    }
  },
  elf: {
    title: "Moon-sighted",
    accent: "#7fc5b3",
    sprite: {
      src: `${PIXEL_ASSET_ROOT}/Character_animation/priests_idle/priest2/v1/priest2_v1_1.png`,
      width: 16,
      height: 16
    }
  },
  dwarf: {
    title: "Deepforged",
    accent: "#d2b06c",
    sprite: {
      src: `${PIXEL_ASSET_ROOT}/Character_animation/priests_idle/priest3/v1/priest3_v1_1.png`,
      width: 16,
      height: 16
    }
  }
};

const CLASS_ART = {
  fighter: {
    title: "Iron Vanguard",
    accent: "#c0c6d1",
    sprite: {
      src: CHARACTER_SHEET_PATH,
      width: 16,
      height: 16,
      x: 0,
      y: 0,
      sheetWidth: 112,
      sheetHeight: 64
    }
  },
  rogue: {
    title: "Knife Scout",
    accent: "#d8a066",
    sprite: {
      src: CHARACTER_SHEET_PATH,
      width: 16,
      height: 16,
      x: 64,
      y: 0,
      sheetWidth: 112,
      sheetHeight: 64
    }
  },
  wizard: {
    title: "Aether Reader",
    accent: "#8cc9ff",
    sprite: {
      src: CHARACTER_SHEET_PATH,
      width: 16,
      height: 16,
      x: 16,
      y: 0,
      sheetWidth: 112,
      sheetHeight: 64
    }
  }
};

function styleMap(entries) {
  return entries.join("; ");
}

function renderPixelSprite(sprite, className = "", scale = 4) {
  const baseRules = [
    `background-image:url('${sprite.src}')`,
    `--frame-width:${sprite.width}px`,
    `--frame-height:${sprite.height}px`,
    `--pixel-scale:${scale}`
  ];
  if (sprite.sheetWidth && sprite.sheetHeight) {
    baseRules.push(
      `--sheet-width:${sprite.sheetWidth}px`,
      `--sheet-height:${sprite.sheetHeight}px`,
      `--frame-x:${sprite.x || 0}px`,
      `--frame-y:${sprite.y || 0}px`
    );
  }
  return `<span class="pixel-sprite${className ? ` ${className}` : ""}" style="${styleMap(baseRules)}" aria-hidden="true"></span>`;
}

function buildChoiceArtMarkup(type, entry) {
  const art = type === "race" ? getRaceArt(entry.id) : getClassArt(entry.id);
  const tone = type === "race" ? art.accent : art.accent;
  const sprite = type === "race" ? art.sprite : art.sprite;
  return {
    artHtml: `
      <div class="choice-art-frame" style="${styleMap([`--choice-accent:${tone}`])}">
        ${renderPixelSprite(sprite, "choice-art-sprite", 3)}
      </div>
    `,
    metaHtml: `<span class="choice-chip">${escapeHtml(art.title)}</span>`
  };
}

function getRaceName(raceRef) {
  const race = RACES.find((entry) => entry.id === resolveRaceId(raceRef));
  return race ? race.name : RACES[0].name;
}

function getClassName(classRef) {
  const role = CLASSES.find((entry) => entry.id === resolveClassId(classRef));
  return role ? role.name : CLASSES[0].name;
}

function getIdentityAccent(raceRef, classRef) {
  const raceArt = getRaceArt(raceRef);
  const classArt = getClassArt(classRef);
  return {
    outer: classArt.accent,
    inner: raceArt.accent
  };
}

function resolveRaceId(raceRef) {
  const direct = RACES.find((entry) => entry.id === raceRef);
  if (direct) {
    return direct.id;
  }
  const byName = RACES.find((entry) => entry.name === raceRef);
  return byName ? byName.id : RACES[0].id;
}

function resolveClassId(classRef) {
  const direct = CLASSES.find((entry) => entry.id === classRef);
  if (direct) {
    return direct.id;
  }
  const byName = CLASSES.find((entry) => entry.name === classRef);
  return byName ? byName.id : CLASSES[0].id;
}

function getRaceArt(raceRef) {
  return RACE_ART[resolveRaceId(raceRef)] || RACE_ART.human;
}

function getClassArt(classRef) {
  return CLASS_ART[resolveClassId(classRef)] || CLASS_ART.fighter;
}

function buildAdventurerIdentityMarkup(options) {
  const raceId = resolveRaceId(options.raceId);
  const classId = resolveClassId(options.classId);
  const raceArt = getRaceArt(raceId);
  const classArt = getClassArt(classId);
  const accents = getIdentityAccent(raceId, classId);
  const compact = Boolean(options.compact);
  const name = options.name || "Unnamed";
  const eyebrow = options.eyebrow || "Adventurer";
  const summary = options.summary || "";
  const detail = options.detail || "";
  const statsMarkup = options.statsMarkup || "";
  const tags = options.tags || [getRaceName(raceId), getClassName(classId), classArt.title];

  return `
    <section class="adventurer-card${compact ? " compact" : ""}" style="${styleMap([`--adventurer-accent:${accents.outer}`, `--adventurer-accent-soft:${accents.inner}`])}">
      <div class="adventurer-card-copy">
        <div class="adventurer-card-kicker">${escapeHtml(eyebrow)}</div>
        <div class="adventurer-card-name">${escapeHtml(name)}</div>
        <div class="adventurer-card-tags">
          ${tags.map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("")}
        </div>
        ${summary ? `<div class="adventurer-card-summary">${escapeHtml(summary)}</div>` : ""}
        ${detail ? `<div class="adventurer-card-detail">${escapeHtml(detail)}</div>` : ""}
      </div>
      <div class="adventurer-card-stage">
        <div class="adventurer-portrait-frame">
          ${renderPixelSprite(classArt.sprite, "adventurer-main-sprite", compact ? 5 : 6)}
          <div class="adventurer-race-seal">
            ${renderPixelSprite(raceArt.sprite, "adventurer-race-sprite", compact ? 2 : 3)}
            <span>${escapeHtml(raceArt.title)}</span>
          </div>
        </div>
      </div>
      ${statsMarkup}
    </section>
  `;
}

function resetCreationDraft(game) {
  game.selectedRace = RACES[0].id;
  game.selectedClass = CLASSES[0].id;
  game.creationName = "Morgan";
  game.creationStatBonuses = { str: 0, dex: 0, con: 0, int: 0 };
}

function captureCreationDraft(game) {
  const nameInput = document.getElementById("hero-name");
  if (nameInput) {
    game.creationName = nameInput.value.trim() || "Morgan";
  }
}

function getCreationPointsRemaining(game) {
  return CREATION_STAT_POINT_BUDGET - CREATION_STAT_KEYS.reduce((sum, stat) => sum + (game.creationStatBonuses[stat] || 0), 0);
}

function adjustCreationStat(game, stat, delta) {
  if (!CREATION_STAT_KEYS.includes(stat) || delta === 0) {
    return false;
  }
  const current = game.creationStatBonuses[stat] || 0;
  if (delta > 0 && (getCreationPointsRemaining(game) <= 0 || current >= CREATION_STAT_POINT_CAP)) {
    return false;
  }
  if (delta < 0 && current <= 0) {
    return false;
  }
  game.creationStatBonuses[stat] = current + delta;
  return true;
}

function getCreationStats(game) {
  const race = getRace(game.selectedRace);
  const role = getClass(game.selectedClass);
  return {
    str: race.stats.str + role.bonuses.str + (game.creationStatBonuses.str || 0),
    dex: race.stats.dex + role.bonuses.dex + (game.creationStatBonuses.dex || 0),
    con: race.stats.con + role.bonuses.con + (game.creationStatBonuses.con || 0),
    int: race.stats.int + role.bonuses.int + (game.creationStatBonuses.int || 0)
  };
}

function showTitleScreen(game) {
  game.mode = "title";
  game.setModalVisibility(true);
  game.modalSurfaceKey = "title";
  game.recordTelemetry?.("modal_opened", { surface: "title" });
  const template = document.getElementById("title-template");
  const fragment = template.content.cloneNode(true);
  const titleLoopImage = fragment.getElementById("title-loop-image");
  const saveSummary = fragment.getElementById("title-save-summary");
  const loadButton = fragment.getElementById("title-load-button");
  const savedMeta = game.getSavedRunMeta();
  const savedSlots = typeof game.getAllSavedRunMeta === "function" ? game.getAllSavedRunMeta() : [];
  const hasSavedRun = savedSlots.some((entry) => Boolean(entry.meta));

  if (titleLoopImage) {
    const prefersReducedMotion = Boolean(game.reducedMotionQuery?.matches);
    titleLoopImage.src = prefersReducedMotion ? TITLE_SCREEN_ASSETS.still : TITLE_SCREEN_ASSETS.loop;
    titleLoopImage.onerror = () => {
      titleLoopImage.onerror = null;
      titleLoopImage.src = TITLE_SCREEN_ASSETS.still;
    };
  }

  if (savedMeta && saveSummary) {
    saveSummary.classList.remove("hidden");
    saveSummary.innerHTML = `
      <button class="title-save-card" data-action="load-game" data-save-slot="${savedMeta.slotId}" data-focus-key="title:continue-card" type="button">
        <div class="title-save-label">Continue</div>
        <div class="title-save-name">${escapeHtml(savedMeta.name)}</div>
        <div class="title-save-meta">Depth ${savedMeta.depth} &middot; Level ${savedMeta.level}${savedMeta.className ? ` &middot; ${escapeHtml(savedMeta.className)}` : ""}</div>
      </button>
    `;
  } else if (hasSavedRun && saveSummary) {
    saveSummary.classList.remove("hidden");
    saveSummary.innerHTML = `
      <div class="title-save-label">Continue</div>
      <div class="title-save-name">Saved Run Available</div>
      <div class="title-save-meta">Choose a slot and return to the keep.</div>
    `;
  } else if (saveSummary) {
    saveSummary.innerHTML = "";
    saveSummary.classList.add("hidden");
  }
  loadButton.disabled = !hasSavedRun;

  game.modalRoot.innerHTML = "";
  game.modalRoot.appendChild(fragment);
  game.modalRoot.classList.remove("hidden");
  game.refreshChrome();
  game.syncMusicToggleUi?.();
  game.syncSurfaceMusic?.();
  const modal = game.modalRoot.querySelector(".title-screen");
  if (modal) {
    modal.scrollTop = 0;
  }
  if (game.layoutMode === "mobile" && modal) {
    modal.tabIndex = -1;
    modal.focus({ preventScroll: true });
    return;
  }
  game.focusFirstUiElement?.();
}

function showCreationModal(game, options = {}) {
  const {
    focusTarget = null,
    preserveScroll = false
  } = options;
  game.mode = "creation";
  game.setModalVisibility(true);
  const previousState = preserveScroll ? game.captureModalRefreshState?.("creation") : null;
  game.recordTelemetry?.("modal_opened", { surface: "creation" });
  const template = document.getElementById("creation-template");
  const fragment = template.content.cloneNode(true);
  const nameInput = fragment.getElementById("hero-name");
  const raceChoice = fragment.getElementById("race-choice");
  const classChoice = fragment.getElementById("class-choice");
  const statPoints = fragment.getElementById("creation-stat-points");
  const statAllocation = fragment.getElementById("creation-stat-allocation");
  const preview = fragment.getElementById("creation-preview");

  nameInput.value = game.creationName;
  RACES.forEach((race) => {
    const art = buildChoiceArtMarkup("race", race);
    const element = choiceCard(race, "race", race.id === game.selectedRace, art);
    element.dataset.focusKey = `creation:race:${race.id}`;
    raceChoice.appendChild(element);
  });
  CLASSES.forEach((role) => {
    const art = buildChoiceArtMarkup("class", role);
    const element = choiceCard(role, "class", role.id === game.selectedClass, art);
    element.dataset.focusKey = `creation:class:${role.id}`;
    classChoice.appendChild(element);
  });

  const race = getRace(game.selectedRace);
  const role = getClass(game.selectedClass);
  const stats = game.getCreationStats();
  const persistencePreview = typeof game.getCreationPersistencePreview === "function"
    ? game.getCreationPersistencePreview(role.id)
    : {
        activeContract: null,
        mastery: { summary: "No mastery track." },
        startingBonuses: []
      };
  const contractModel = typeof game.getContractViewModel === "function" ? game.getContractViewModel() : null;
  const recommendedContract = contractModel?.all?.find((contract) => contract.id === contractModel.recommendedId) || null;
  const pointsRemaining = game.getCreationPointsRemaining();
  const previewHp = game.getMaxHpForStats(stats, 1, role.name, 0, race.hp + role.bonuses.hp);
  const previewMana = game.getMaxManaForStats(stats, role.name, 0, race.mana + role.bonuses.mana);
  const [damageLow, damageHigh] = game.getDamageRangeForStats(stats, 2);

  statPoints.innerHTML = `Training points remaining: <strong>${pointsRemaining}</strong>`;
  statAllocation.innerHTML = CREATION_STAT_KEYS.map((stat) => `
    <div class="creation-stat-row">
      <div class="creation-stat-copy">
        <div class="creation-stat-title">${CREATION_STAT_LABELS[stat]}</div>
        <div class="creation-stat-notes">
          <span>${escapeHtml(CREATION_STAT_NOTES[stat])}</span>
        </div>
      </div>
      <div class="creation-stat-stepper">
        <button class="tiny-button creation-stat-button" data-action="creation-adjust-stat" data-stat="${stat}" data-delta="-1" type="button" ${game.creationStatBonuses[stat] <= 0 ? "disabled" : ""}>-</button>
        
        <div class="creation-stat-value">${stats[stat]}</div>
        <button class="tiny-button creation-stat-button" data-action="creation-adjust-stat" data-stat="${stat}" data-delta="1" type="button" ${(pointsRemaining <= 0 || game.creationStatBonuses[stat] >= CREATION_STAT_POINT_CAP) ? "disabled" : ""}>+</button>
      </div>
    </div>
  `).join("");

  preview.innerHTML = `
    ${buildAdventurerIdentityMarkup({
      name: game.creationName || "Morgan",
      raceId: race.id,
      classId: role.id,
      eyebrow: "Pack Preview",
      summary: `${race.summary} ${role.summary}`,
      detail: `${getRaceArt(race.id).title} ancestry with ${getClassArt(role.id).title.toLowerCase()} discipline.`
    })}
    <div class="stat-grid">
      <div class="stat-line"><span>Strength</span><strong>${stats.str}</strong></div>
      <div class="stat-line"><span>Dexterity</span><strong>${stats.dex}</strong></div>
      <div class="stat-line"><span>Constitution</span><strong>${stats.con}</strong></div>
      <div class="stat-line"><span>Intelligence</span><strong>${stats.int}</strong></div>
      <div class="stat-line"><span>Hit Points</span><strong>${previewHp}</strong></div>
      <div class="stat-line"><span>Mana</span><strong>${previewMana}</strong></div>
      <div class="stat-line"><span>Attack</span><strong>${game.getAttackValueForStats(stats, 2)}</strong></div>
      <div class="stat-line"><span>Damage</span><strong>${damageLow}-${damageHigh}</strong></div>
      <div class="stat-line"><span>Evade</span><strong>${game.getEvadeValueForStats(stats)}</strong></div>
      <div class="stat-line"><span>Armor</span><strong>${game.getArmorValueForStats(stats)}</strong></div>
      <div class="stat-line"><span>Search</span><strong>${game.getSearchRadiusForStats(stats)} tiles</strong></div>
      <div class="stat-line"><span>Carry</span><strong>${getCarryCapacity({ stats })}</strong></div>
    </div>
    <div class="section-block">
      <div class="field-label">Town Persistence</div>
      <div class="text-block">
        ${escapeHtml(persistencePreview.activeContract ? `Active contract: ${persistencePreview.activeContract.name}. Town Persistence, opt-in, next run only.` : "No contract armed. Contracts stay opt-in at the bank and apply to the next run only.")}<br><br>
        ${escapeHtml(recommendedContract ? `Recommended next run: ${recommendedContract.name}. ${recommendedContract.recommendationReason || recommendedContract.description}` : "No contract recommendation available yet.")}<br><br>
        ${escapeHtml(`Mastery: ${persistencePreview.mastery.summary}`)}<br><br>
        ${escapeHtml(persistencePreview.startingBonuses.length > 0
          ? `Starting bonuses on this run: ${persistencePreview.startingBonuses.join(", ")}.`
          : "Starting bonuses on this run: none yet.")}
      </div>
      ${recommendedContract?.unlocked ? `<div class="modal-actions"><button class="menu-button" data-action="contract-arm-recommended" data-focus-key="creation:contract:recommended" type="button">${recommendedContract.active ? "Recommended Armed" : `Arm ${escapeHtml(recommendedContract.name)}`}</button></div>` : ""}
    </div>
  `;

  game.modalRoot.innerHTML = "";
  game.modalRoot.appendChild(fragment);
  game.modalRoot.classList.remove("hidden");
  game.modalSurfaceKey = "creation";
  game.refreshChrome();
  game.syncMusicToggleUi?.();
  game.syncSurfaceMusic?.();
  game.applyControllerNavigationMetadata?.();
  const nextModal = game.getModalElement?.();
  if (nextModal && previousState) {
    nextModal.scrollTop = previousState.scrollTop;
  }
  const statButtons = game.modalRoot.querySelectorAll(".creation-stat-button");
  statButtons.forEach((button) => {
    const stat = button.dataset.stat || "str";
    const delta = button.dataset.delta === "-1" ? "down" : "up";
    button.dataset.focusKey = `creation:stat:${stat}:${delta}`;
  });
  const focusElement = game.resolveModalFocusTarget?.(focusTarget, previousState)
    || (focusTarget ? game.findUiElementByFocusKey?.(focusTarget) : null);
  if (focusElement) {
    game.focusUiElement?.(focusElement);
    return;
  }
  game.focusFirstUiElement?.();
}

// src/features/encounters.js

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

function getDynamicMonsterCap(depth) {
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

function getDepthTheme(depth) {
  return DEPTH_THEMES.find((theme) => theme.depths.includes(depth)) || DEPTH_THEMES[DEPTH_THEMES.length - 1];
}

function pickEncounterTemplate(depth, theme, floorSpecial = null, options = {}) {
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

function spawnSquad(level, depth, room, theme, template, options = {}) {
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

function spawnNamedElite(level, depth, room, theme, options = {}) {
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

function populateDungeonEncounters(level, depth) {
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

function spawnReinforcementWave(game, band = "Medium") {
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

function spawnObjectiveGuard(level, depth, room, roomIndex, objectiveId = "") {
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

function getEncounterSummary(level) {
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

// src/features/objectives.js

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

function setupFloorDirectives(level, depth, townUnlocks = {}) {
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

function syncFloorState(game) {
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

function getObjectiveRoomClear(game) {
  const roomIndex = game.currentLevel?.floorObjective?.roomIndex;
  if (roomIndex === undefined || roomIndex === null) {
    return true;
  }
  return !game.currentLevel.actors.some((monster) => monster.roomIndex === roomIndex && monster.hp > 0);
}

function getObjectiveDefendersRemaining(level) {
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

function resolveFloorObjective(game, reason = "completed") {
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

function handleObjectivePickup(game, item) {
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

function handleOptionalInteraction(game, tile) {
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
  const greedGoldMultiplier = game.getGreedGoldMultiplier ? game.getGreedGoldMultiplier() : 1;
  const greedRumorBonus = game.getGreedRumorBonus ? game.getGreedRumorBonus() : 0;

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
    const dangerBonus = game.getGreedDangerBonus ? game.getGreedDangerBonus() : 0;
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

function handleObjectiveInteraction(game, tile) {
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

function getObjectiveStatusText(level) {
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

function getOptionalStatusText(level) {
  if (!level || !level.floorOptional) {
    return null;
  }
  if (level.floorOptional.opened) {
    return `${level.floorOptional.label} spent. The floor knows you stayed greedy.`;
  }
  return `${level.floorOptional.label}: ${level.floorOptional.summary}`;
}

function grantObjectiveRumor(game) {
  const rumorPool = [RUMOR_DEFS.relic_hunt, RUMOR_DEFS.nest, RUMOR_DEFS.captive, RUMOR_DEFS.supplies, RUMOR_DEFS.waystone, RUMOR_DEFS.ledger, RUMOR_DEFS.shrine_path, RUMOR_DEFS.purify_well, RUMOR_DEFS.beacon, RUMOR_DEFS.watchfire].filter(Boolean);
  const rumor = choice(rumorPool);
  if (rumor && game.learnRumor) {
    game.learnRumor(rumor.id);
  }
}

function getObjectiveRewardPreview(level) {
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

// src/features/director.js

const DANGER_THRESHOLDS = [
  { min: 0, label: "Low", color: "good" },
  { min: 4, label: "Medium", color: "warning" },
  { min: 8, label: "High", color: "bad" },
  { min: 12, label: "Critical", color: "bad" }
];

const PRESSURE_LABELS = {
  Low: "Quiet for now",
  Medium: "Patrols active",
  High: "Reinforcements soon",
  Critical: "Leave now"
};

const PRESSURE_CAUSE_TEXT = {
  rest: "Resting raised pressure",
  wait: "Waiting raised pressure",
  search: "Searching raised pressure",
  altar: "The shrine bargain raised pressure",
  fountain: "The fountain use raised pressure",
  throne: "The throne answer raised pressure",
  loot: "Greedy looting raised pressure",
  greed: "Staying greedy raised pressure",
  seal_shrine: "Shrine sealed"
};

function getBandFromScore(score) {
  let band = DANGER_THRESHOLDS[0];
  DANGER_THRESHOLDS.forEach((entry) => {
    if (score >= entry.min) {
      band = entry;
    }
  });
  return band;
}

function stirVisiblePressure(game, wakeCount = 2) {
  const sleepers = (game.currentLevel?.actors || []).filter((monster) => monster.sleeping);
  sleepers.slice(0, wakeCount).forEach((monster) => {
    monster.sleeping = false;
    monster.alerted = Math.max(monster.alerted || 0, 5);
  });
}

function getSpecialPressureLog(level, fallback) {
  return level?.floorSpecial?.pressureLog || fallback;
}

function applyBandTransition(game, previous, next) {
  if (!game.currentLevel || previous === next.label) {
    return;
  }
  if (next.label === "Medium") {
    stirVisiblePressure(game, 2);
    if (game.currentDepth > 1 && game.currentLevel.floorSpecial?.mediumBandWave) {
      const wave = spawnReinforcementWave(game, "Medium");
      game.log(wave.length > 0 ? getSpecialPressureLog(game.currentLevel, "Pressure rising: patrols start moving through the floor.") : "Pressure rising: patrols start moving through the floor.", "warning");
      return;
    }
    game.log("Pressure rising: patrols start moving through the floor.", "warning");
    return;
  }
  if (next.label === "High") {
    stirVisiblePressure(game, 3);
    if (game.currentDepth > 1) {
      const wave = spawnReinforcementWave(game, "High");
      game.log(wave.length > 0 ? getSpecialPressureLog(game.currentLevel, "Pressure spikes: the floor turns aggressive.") : "Pressure spikes: the floor turns aggressive.", "bad");
      return;
    }
    game.log("Pressure spikes: the floor turns aggressive.", "bad");
    return;
  }
  if (next.label === "Critical") {
    const wave = spawnReinforcementWave(game, "Critical");
    game.log(wave.length > 0 ? "Collapse risk: reinforcements are cutting off a clean retreat." : "Collapse risk: the halls are fully hostile now.", "bad");
  }
}

function initializeDangerState(level, depth) {
  if (!level || level.kind !== "dungeon") {
    return;
  }
  level.dangerScore = 0;
  level.dangerLevel = "Low";
  level.dangerTone = "good";
  level.dangerTriggers = {
    turns: 0,
    rests: 0,
    waits: 0,
    searches: 0,
    loud: 0,
    greed: 0
  };
  level.reinforcementClock = depth === 1 ? 68 : Math.max(10, 18 + depth * 2);
  level.directorFlags = {
    mediumTriggered: false,
    highTriggered: false,
    criticalTriggered: false,
    introShown: false,
    warningSix: false,
    warningThree: false
  };
}

function syncDangerState(game) {
  const level = game.currentLevel;
  if (!level) {
    game.dangerLevel = "Low";
    game.dangerTriggers = null;
    game.reinforcementClock = 0;
    return;
  }
  game.dangerLevel = level.dangerLevel || "Low";
  game.dangerTriggers = level.dangerTriggers || null;
  game.reinforcementClock = level.reinforcementClock || 0;
}

function increaseDanger(game, source = "unknown", amount = 1) {
  if (!game.currentLevel || game.currentDepth === 0) {
    return "Low";
  }
  const level = game.currentLevel;
  const previous = level.dangerLevel || "Low";
  const previousClock = level.reinforcementClock || 0;
  if (!level.dangerTriggers) {
    initializeDangerState(level, game.currentDepth);
  }
  if (source === "rest") {
    level.dangerTriggers.rests += 1;
  } else if (source === "wait") {
    level.dangerTriggers.waits += 1;
  } else if (source === "search") {
    level.dangerTriggers.searches += 1;
  } else if (source.startsWith("optional_") || source === "greed") {
    level.dangerTriggers.greed += 1;
  } else {
    level.dangerTriggers.loud += 1;
  }

  const contractBonus = typeof game.getContractPaceDangerBonus === "function"
    ? Math.max(0, game.getContractPaceDangerBonus(source))
    : 0;
  const rawAmount = amount + contractBonus;
  const scaledAmount = game.currentDepth === 1
    ? Math.max(0, rawAmount - (source === "objective_clear" ? 0 : 1))
    : rawAmount;
  level.dangerScore = Math.max(0, (level.dangerScore || 0) + scaledAmount);
  const band = getBandFromScore(level.dangerScore);
  level.dangerLevel = band.label;
  level.dangerTone = band.color;
  const reinforcementLoss = game.currentDepth === 1
    ? Math.max(0, scaledAmount)
    : rawAmount;
  level.reinforcementClock = Math.max(game.currentDepth === 1 ? 16 : 6, (level.reinforcementClock || 12) - reinforcementLoss);
  const turnsLost = Math.max(0, previousClock - level.reinforcementClock);
  syncDangerState(game);
  const causeText = PRESSURE_CAUSE_TEXT[source] || (source.startsWith("optional_") ? "Greed raised pressure" : "");
  if (scaledAmount > 0 && causeText) {
    const effectText = turnsLost > 0
      ? `${PRESSURE_LABELS[band.label] || band.label.toLowerCase()} ${turnsLost === 1 ? "arrives 1 turn sooner" : `arrives ${turnsLost} turns sooner`}`
      : `${PRESSURE_LABELS[band.label] || band.label.toLowerCase()} now`;
    game.log(`${causeText}: ${effectText}.`, source === "rest" || source === "search" ? "warning" : "bad");
  }
  applyBandTransition(game, previous, band);
  return band.label;
}

function noteFloorIntro(game) {
  if (!game.currentLevel || game.currentDepth === 0) {
    return;
  }
  const flags = game.currentLevel.directorFlags || {};
  if (flags.introShown) {
    return;
  }
  flags.introShown = true;
  game.currentLevel.directorFlags = flags;
  if (game.currentLevel.floorThemeName) {
    game.log(`${game.currentLevel.floorThemeName}: ${game.currentLevel.description}.`, "warning");
  }
  if (game.currentLevel.floorSpecial?.introLog) {
    game.log(game.currentLevel.floorSpecial.introLog, "warning");
  }
  if (game.currentLevel.floorObjective?.intro) {
    game.log(game.currentLevel.floorObjective.intro, "warning");
  }
  if (game.currentDepth === 1 && !game.storyFlags?.objectiveLoopExplained) {
    game.storyFlags.objectiveLoopExplained = true;
    game.log("Orange marks the floor objective on the map. Clear it, use U on the marker when the room is ready, then choose between stairs up or one greedy detour.", "warning");
  }
}

function markGreedAction(game, source = "greed") {
  const amount = game.currentLevel?.floorResolved ? 2 : 1;
  return increaseDanger(game, source, amount);
}

function advanceDangerTurn(game) {
  if (!game.currentLevel || game.currentDepth === 0) {
    return;
  }
  const level = game.currentLevel;
  if (!level.dangerTriggers) {
    initializeDangerState(level, game.currentDepth);
  }
  level.dangerTriggers.turns += 1;
  const turns = level.dangerTriggers.turns;
  const isIntroFloor = game.currentDepth === 1;
  const timeCadence = isIntroFloor
    ? (level.floorResolved ? 20 : 30)
    : (level.floorResolved ? 10 : 15);
  if (turns > 0 && turns % timeCadence === 0) {
    increaseDanger(game, "time", isIntroFloor ? 1 : (level.floorResolved ? 2 : 1));
  }
  if (isIntroFloor) {
    if ((level.floorResolved && turns % 2 === 0) || (!level.floorResolved && turns % 3 === 0)) {
      level.reinforcementClock -= 1;
    }
  } else {
    level.reinforcementClock -= level.floorResolved ? 2 : (level.floorSpecial?.reinforcementBias ? 2 : 1);
  }
  if (level.reinforcementClock <= 6 && !level.directorFlags.warningSix) {
    level.directorFlags.warningSix = true;
    game.log(level.floorSpecial?.pressureLog || "The floor is shifting. Reinforcements are close now.", "warning");
  }
  if (level.reinforcementClock <= 3 && !level.directorFlags.warningThree) {
    level.directorFlags.warningThree = true;
    game.log("Last clean turns. Another wave is almost on top of you.", "bad");
  }
  if (level.reinforcementClock <= 0) {
    const band = level.dangerLevel || "Medium";
    const wave = spawnReinforcementWave(game, band);
    if (wave.length > 0) {
      game.log(band === "Critical" ? "Another wave is coming in. Leave now or get buried here." : "Reinforcements are entering the floor.", band === "Low" ? "warning" : "bad");
      if (game.recordChronicleEvent) {
        game.recordChronicleEvent("reinforcements", {
          band,
          count: wave.length,
          depth: game.currentDepth
        });
      }
    }
    level.reinforcementClock = isIntroFloor
      ? Math.max(18, 28 - Math.min(6, Math.floor(level.dangerScore / 4)))
      : Math.max(6, 15 - Math.min(7, Math.floor(level.dangerScore / 3)));
    level.directorFlags.warningSix = false;
    level.directorFlags.warningThree = false;
    syncDangerState(game);
  }
}

function getDangerSummary(level) {
  if (!level || level.kind !== "dungeon") {
    return "Town is stable.";
  }
  const clock = level.reinforcementClock || 0;
  if (level.dangerLevel === "Critical") {
    return `Leave now. Another wave is about ${clock} turn${clock === 1 ? "" : "s"} away.${level.floorSpecial?.label ? ` ${level.floorSpecial.label} is amplifying the floor.` : ""}`;
  }
  if (level.dangerLevel === "High") {
    return `Reinforcements soon. Another wave is about ${clock} turn${clock === 1 ? "" : "s"} away.${level.floorSpecial?.label ? ` ${level.floorSpecial.label} is active.` : ""}`;
  }
  if (level.dangerLevel === "Medium") {
    return `Patrols are active. Another wave is about ${clock} turn${clock === 1 ? "" : "s"} away.${level.floorSpecial?.label ? ` ${level.floorSpecial.label} is in play.` : ""}`;
  }
  return "Quiet for now. The floor is readable, but it will not stay that way.";
}

function getPressureStatus(level) {
  if (!level || level.kind !== "dungeon") {
    return {
      label: "Town Calm",
      shortLabel: "Town Calm",
      tone: "good",
      countdown: "",
      summary: "Town is stable.",
      turns: 0
    };
  }
  const turns = level.reinforcementClock || 0;
  const shortLabel = PRESSURE_LABELS[level.dangerLevel] || "Quiet";
  return {
    label: shortLabel,
    shortLabel,
    tone: level.dangerTone || "good",
    countdown: turns > 0 ? `${turns} turns` : "Soon",
    summary: getDangerSummary(level),
    turns
  };
}

// src/features/builds.js

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

function ensureBuildState(game) {
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

function hasPerk(game, perkId) {
  return Boolean(game.player?.perks?.includes(perkId));
}

function hasRelic(game, relicId) {
  return Boolean(game.player?.relics?.includes(relicId));
}

function getPerkFamily(game) {
  return CLASS_FAMILY[game.player?.className] || "fighter";
}

function getPerkChoices(game, count = 3) {
  ensureBuildState(game);
  const family = getPerkFamily(game);
  const pool = Object.values(PERK_DEFS).filter((perk) => perk.family === family);
  return weightedDraw(pool, count, game.player.perks);
}

function queuePerkChoice(game, count = 1) {
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

function queueObjectiveReward(game, source = "objective", rewardType = "relic") {
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

function prepareNextRewardChoice(game) {
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

function clearRewardChoice(game) {
  game.pendingRewardChoice = null;
}

function chooseReward(game, rewardId) {
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

function hasPendingProgressionChoice(game) {
  ensureBuildState(game);
  return game.pendingPerkChoices > 0 || Boolean(game.pendingRewardChoice) || game.pendingRewardQueue.length > 0 || game.pendingSpellChoices > 0;
}

function grantBoon(game, boonId) {
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

function grantRumorToken(game, amount = 1) {
  ensureBuildState(game);
  game.player.runCurrencies.rumorTokens += amount;
}

function learnRumor(game, rumorId) {
  ensureBuildState(game);
  if (!game.player.knownRumors.includes(rumorId)) {
    game.player.knownRumors.push(rumorId);
  }
}

function getKnownRumors(game) {
  ensureBuildState(game);
  return game.player.knownRumors.map((id) => RUMOR_DEFS[id]).filter(Boolean);
}

function getBuildArmorBonus(game) {
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

function getBuildEvadeBonus(game) {
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

function getBuildAttackBonus(game, defender) {
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

function getBuildDamageBonus(game, defender, damageType = "physical") {
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

function getBuildMaxHpBonus(game) {
  return hasRelic(game, "survivor_talisman") ? 8 : 0;
}

function getBuildMaxManaBonus(game) {
  return hasPerk(game, "warding") ? 4 : 0;
}

function getBuildSearchBonus(game) {
  let bonus = 0;
  if (hasPerk(game, "trap_sense")) {
    bonus += 5;
  }
  if (hasRelic(game, "hunter_map")) {
    bonus += 2;
  }
  return bonus;
}

function getSpellCost(game, spell) {
  const base = spell.cost || 0;
  if (hasPerk(game, "spell_efficiency")) {
    return Math.max(1, base - 1);
  }
  return base;
}

function getOvercastLoss(game, shortage) {
  if (hasPerk(game, "overcast_control")) {
    return Math.max(1, shortage - 1);
  }
  return shortage;
}

function onPlayerWait(game) {
  if (hasPerk(game, "brace")) {
    game.player.tempGuard = 2;
  }
}

function onPlayerMove(game) {
  game.player.tempGuard = 0;
}

function onMonsterKilled(game, monster) {
  if (monster?.elite) {
    game.onEliteKillProgress?.(monster);
  }
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

// src/features/town-meta.js

const TOWN_CYCLE_TURNS = 120;

const TOWN_PHASES = [
  "Dawn",
  "Day",
  "Dusk",
  "Night"
];

const TOWN_PHASE_DETAILS = {
  Dawn: {
    buyMultiplier: 1,
    sellMultiplier: 1,
    templeMultiplier: 0.9,
    sageMultiplier: 1,
    rumorMultiplier: 1,
    stockSummary: "Recovery tools and mapping notes are easiest to secure at first light.",
    rumorSummary: "Rumors skew practical and route-focused."
  },
  Day: {
    buyMultiplier: 1,
    sellMultiplier: 1,
    templeMultiplier: 1,
    sageMultiplier: 1,
    rumorMultiplier: 1,
    stockSummary: "General and armory stock are at full daytime breadth.",
    rumorSummary: "Intel is steady and mercantile rather than dramatic."
  },
  Dusk: {
    buyMultiplier: 1,
    sellMultiplier: 1.03,
    templeMultiplier: 1,
    sageMultiplier: 1,
    rumorMultiplier: 0.95,
    stockSummary: "Guild shelves lean toward spellwork, wards, and deep tools.",
    rumorSummary: "Rumors skew deeper and stranger toward dusk."
  },
  Night: {
    buyMultiplier: 1.08,
    sellMultiplier: 1.1,
    templeMultiplier: 1,
    sageMultiplier: 1,
    rumorMultiplier: 1,
    stockSummary: "Night trade is expensive, but dealers pay more for useful salvage.",
    rumorSummary: "Intel turns riskier and more ominous at night."
  }
};

const SHOP_TIER_STOCK = {
  general: {
    1: ["healingPotion", "manaPotion", "identifyScroll", "mappingScroll", "travelBoots", "spellbookLight"],
    2: ["teleportScroll", "removeCurseScroll", "torchCharm", "shadowCloak", "spellbookTraps"],
    3: ["runeScroll", "goldCharm", "emberCharm", "frostCharm", "scoutCloak", "spellbookTeleport"]
  },
  armory: {
    1: ["knife", "shortSword", "leatherArmor", "buckler", "paddedCap", "travelBoots"],
    2: ["rapier", "handAxe", "broadSword", "brigandine", "chainMail", "kiteShield", "bronzeHelm", "greaves"],
    3: ["mace", "battleAxe", "warPick", "warHammer", "scaleMail", "plateMail", "towerShield", "hoodedCowl", "ironHelm", "strideBoots"]
  },
  guild: {
    1: ["oakStaff", "ashStaff", "spellfocusRing", "ironRing", "spellbookFrost", "spellbookIdentify", "spellbookShield", "manaPotion"],
    2: ["wardedCloak", "spellbookPhase", "spellbookSlow", "spellbookHold", "wandLightning", "wandSlow"],
    3: ["runeBlade", "wardingAmulet", "spellbookFire", "spellbookCurse", "spellbookStone", "spellbookLightning", "staffHealing"]
  },
  temple: {
    1: ["healingPotion", "manaPotion", "goldCharm"],
    2: ["torchCharm", "emberCharm", "frostCharm", "spellbookMind", "spellbookSerious", "runeScroll"],
    3: ["removeCurseScroll", "wardingAmulet", "spellbookResistFire", "spellbookResistCold"]
  }
};

function unlocked(game, unlockId) {
  return Boolean(game.durableTownUnlocks?.[unlockId] || game.townUnlocks?.[unlockId]);
}

function getPhaseConfig(phase) {
  return TOWN_PHASE_DETAILS[phase] || TOWN_PHASE_DETAILS.Day;
}

function getShopPoolInternal(game, shopId) {
  const tiers = SHOP_TIER_STOCK[shopId];
  if (!tiers) {
    return [...(SHOPS[shopId]?.stock || [])];
  }
  const tier = game.shopTiers[shopId] || 1;
  const pool = [];
  for (let current = 1; current <= tier; current += 1) {
    pool.push(...(tiers[current] || []));
  }
  pool.push(...getReactionStockBonus(game, shopId));
  return [...new Set(pool)];
}

function getActiveReactionIds(game) {
  const milestones = game.player?.quest?.milestonesCleared || [];
  const discoveries = game.player?.quest?.discoveryIdsFound || [];
  const chronicle = game.chronicleEvents || [];
  const knownRumors = game.player?.knownRumors || [];
  const hasEliteKill = chronicle.some((entry) => entry?.type === "elite_kill");
  const hasGreedLine = chronicle.some((entry) => entry?.type === "greed_choice");
  const carriesCurse = Boolean((game.player?.inventory || []).some((item) => item?.cursed))
    || Boolean(Object.values(game.player?.equipment || {}).some((item) => item?.cursed))
    || (game.player?.constitutionLoss || 0) > 0;
  const ids = [];
  if (hasEliteKill) {
    ids.push("first_elite");
  }
  if (milestones.includes("depth3_gatekeeper")) {
    ids.push("depth3_gatekeeper");
  }
  if (milestones.includes("depth5_cryptlord")) {
    ids.push("depth5_cryptlord");
  }
  if (discoveries.includes("storm_oath") || discoveries.includes("weather_log") || milestones.includes("depth5_cryptlord")) {
    ids.push("storm_knowledge");
  }
  if (carriesCurse) {
    ids.push("curse_pressure");
  }
  if (knownRumors.includes("supplies") || knownRumors.includes("beacon")) {
    ids.push("route_ledger");
  }
  if (game.townUnlocks?.supply_cache || hasGreedLine) {
    ids.push("cache_runners");
  }
  return ids.filter((id, index, array) => array.indexOf(id) === index);
}

function getReactionStockBonus(game, shopId) {
  const activeIds = getActiveReactionIds(game);
  const bonus = [];
  activeIds.forEach((reactionId) => {
    switch (reactionId) {
      case "first_elite":
        if (shopId === "armory") {
          bonus.push("warPick", "strideBoots");
        }
        break;
      case "depth3_gatekeeper":
        if (shopId === "armory") {
          bonus.push("brigandine", "kiteShield", "greaves");
        }
        break;
      case "depth5_cryptlord":
        if (shopId === "guild") {
          bonus.push("wardingAmulet", "spellbookResistFire", "spellbookResistCold", "spellbookCurse");
        }
        if (shopId === "temple") {
          bonus.push("removeCurseScroll", "spellbookSerious");
        }
        break;
      case "storm_knowledge":
        if (shopId === "guild") {
          bonus.push("wandLightning", "spellbookLightning", "spellbookTeleport");
        }
        if (shopId === "general" || shopId === "temple") {
          bonus.push("runeScroll", "emberCharm", "frostCharm");
        }
        break;
      case "curse_pressure":
        if (shopId === "temple") {
          bonus.push("removeCurseScroll", "runeScroll", "spellbookSerious");
        }
        break;
      case "route_ledger":
        if (shopId === "general" || shopId === "guild") {
          bonus.push("mappingScroll", "surveyorCharm");
        }
        break;
      case "cache_runners":
        if (shopId === "general" || shopId === "armory") {
          bonus.push("healingPotion", "pathfinderSandals", "brigandVest");
        }
        break;
      default:
        break;
    }
  });
  return [...new Set(bonus)];
}

function chooseFeaturedItems(pool, predicate, fallbackCount = 2) {
  const preferred = shuffle(pool.filter((itemId) => predicate(ITEM_DEFS[itemId] || {})));
  const fallback = shuffle(pool.filter((itemId) => !preferred.includes(itemId)));
  return [...preferred, ...fallback].slice(0, fallbackCount);
}

function buildDailyFeaturedStock(game) {
  return {
    general: chooseFeaturedItems(getShopPoolInternal(game, "general"), (item) => item.kind === "consumable" || item.id === "mappingScroll"),
    armory: chooseFeaturedItems(getShopPoolInternal(game, "armory"), (item) => item.kind === "weapon" || item.guardBonus || item.slot === "body"),
    guild: chooseFeaturedItems(getShopPoolInternal(game, "guild"), (item) => item.kind === "spellbook" || item.kind === "charged" || item.wardBonus || item.manaBonus),
    temple: chooseFeaturedItems(getShopPoolInternal(game, "temple"), (item) => item.id === "healingPotion" || item.id === "manaPotion" || item.id === "spellbookSerious" || item.fireResist || item.coldResist)
  };
}

function hasFeaturedStock(featuredStock) {
  return Boolean(featuredStock && Object.values(featuredStock).some((items) => Array.isArray(items) && items.length > 0));
}

function ensureTownMetaState(game) {
  const durableTownUnlocks = typeof game.getDurableTownUnlocks === "function"
    ? game.getDurableTownUnlocks()
    : getDurableTownUnlocks(game);
  game.townUnlocks = {
    supply_cache: false,
    guild_license: false,
    temple_favors: false,
    archive_maps: false,
    ghost_bargains: false,
    deep_contracts: false,
    ...(game.townUnlocks || {}),
    ...(durableTownUnlocks || {})
  };
  game.rumorTable = Array.isArray(game.rumorTable) ? game.rumorTable : [];
  game.shopTiers = {
    general: 1,
    armory: 1,
    guild: 1,
    temple: 1,
    ...(game.shopTiers || {})
  };
  game.townState = {
    dailyFeaturedStock: {},
    phaseModifiers: { ...getPhaseConfig("Dawn") },
    lastCycleIndex: 0,
    ...(game.townState || {})
  };
  if (unlocked(game, "supply_cache")) {
    game.shopTiers.general = 2;
  }
  if (unlocked(game, "guild_license")) {
    game.shopTiers.guild = 2;
  }
  if (unlocked(game, "temple_favors")) {
    game.shopTiers.temple = 2;
  }
  if (unlocked(game, "deep_contracts")) {
    game.shopTiers.armory = 3;
    game.shopTiers.guild = 3;
  }
  if (unlocked(game, "archive_maps")) {
    game.shopTiers.general = Math.max(game.shopTiers.general, 2);
  }
  game.townState.dailyFeaturedStock = game.townState.dailyFeaturedStock || {};
  game.townState.phaseModifiers = game.townState.phaseModifiers || { ...getPhaseConfig("Dawn") };
  if (!hasFeaturedStock(game.townState.dailyFeaturedStock)) {
    game.townState.dailyFeaturedStock = buildDailyFeaturedStock(game);
  }
}

function getTemplePrice(game, basePrice) {
  const state = getTownCycleState(game);
  const favorMultiplier = unlocked(game, "temple_favors") ? 0.85 : 1;
  return Math.max(1, Math.round(basePrice * favorMultiplier * state.phaseModifiers.templeMultiplier));
}

function getShopPool(game, shopId) {
  ensureTownMetaState(game);
  return getShopPoolInternal(game, shopId);
}

function getTownReactionBundle(game, serviceId = "") {
  const ids = getActiveReactionIds(game);
  const lines = ids
    .map((reactionId) => {
      const reaction = TOWN_REACTION_DEFS[reactionId];
      if (!reaction) {
        return "";
      }
      if (serviceId && reaction[serviceId]) {
        return reaction[serviceId];
      }
      return reaction.steward || reaction.guild || reaction.temple || reaction.bank || "";
    })
    .filter(Boolean);
  const stockTags = ids
    .map((reactionId) => TOWN_REACTION_DEFS[reactionId]?.stockTag || "")
    .filter(Boolean);
  return {
    ids,
    lines,
    stockTags
  };
}

function getTownCycleState(game, turn = game.turn) {
  ensureTownMetaState(game);
  const normalizedTurn = Math.max(1, turn || 1);
  const elapsedTurns = normalizedTurn - 1;
  const cycleIndex = Math.floor(elapsedTurns / TOWN_CYCLE_TURNS);
  const turnsIntoCycle = elapsedTurns % TOWN_CYCLE_TURNS;
  const phaseLength = TOWN_CYCLE_TURNS / TOWN_PHASES.length;
  const phaseIndex = Math.min(TOWN_PHASES.length - 1, Math.floor(turnsIntoCycle / phaseLength));
  const phase = TOWN_PHASES[phaseIndex];
  const phaseModifiers = { ...getPhaseConfig(phase) };
  const featuredStock = hasFeaturedStock(game.townState.dailyFeaturedStock)
    ? game.townState.dailyFeaturedStock
    : buildDailyFeaturedStock(game);
  game.townState.dailyFeaturedStock = featuredStock;
  return {
    day: cycleIndex + 1,
    phase,
    cycleIndex,
    turnsIntoCycle,
    turnsUntilRefresh: TOWN_CYCLE_TURNS - turnsIntoCycle,
    phaseModifiers,
    featuredStock,
    stockSummary: phaseModifiers.stockSummary,
    rumorSummary: phaseModifiers.rumorSummary
  };
}

function formatTownCycle(state) {
  if (!state) {
    return "Day 1 - Dawn";
  }
  return `Day ${state.day} - ${state.phase}`;
}

function refreshTownStocks(game, options = {}) {
  const { clearBuyback = true, turn = game.turn } = options;
  ensureTownMetaState(game);
  Object.keys(game.shopState || {}).forEach((shopId) => {
    if (!SHOPS[shopId] || SHOPS[shopId].stock.length === 0) {
      return;
    }
    const pool = getShopPool(game, shopId);
    const count = Math.max(4, Math.min(pool.length, shopId === "guild" ? 8 : 6 + Math.max(0, (game.shopTiers[shopId] || 1) - 1)));
    game.shopState[shopId].stock = shuffle(pool).slice(0, count);
    if (clearBuyback) {
      game.shopState[shopId].buyback = [];
    }
    game.shopState[shopId].lastRefresh = turn;
  });
  const cycle = getTownCycleState(game, turn);
  game.townState.dailyFeaturedStock = buildDailyFeaturedStock(game);
  game.townState.lastCycleIndex = cycle.cycleIndex;
  game.townState.phaseModifiers = { ...cycle.phaseModifiers };
}

function getShopBuyPrice(game, item, shopId = "") {
  const effectiveBase = Math.max(1, Math.round(getItemValue(item) * 1.2));
  const state = getTownCycleState(game);
  return Math.max(1, Math.round(effectiveBase * state.phaseModifiers.buyMultiplier));
}

function getShopSellPrice(game, item, shopId = "") {
  const basePrice = shopId === "junk" ? 25 : Math.round(getItemValue(item) * 0.55);
  const state = getTownCycleState(game);
  const contractMultiplier = typeof game.getTownSellBonusMultiplier === "function"
    ? game.getTownSellBonusMultiplier()
    : 1;
  return Math.max(1, Math.round(basePrice * state.phaseModifiers.sellMultiplier * contractMultiplier));
}

function getSagePrice(game, basePrice = 60) {
  const state = getTownCycleState(game);
  return Math.max(1, Math.round(basePrice * state.phaseModifiers.sageMultiplier));
}

function getRumorPrice(game) {
  const state = getTownCycleState(game);
  const basePrice = unlocked(game, "archive_maps") ? 25 : 40;
  return Math.max(1, Math.round(basePrice * state.phaseModifiers.rumorMultiplier));
}

function getUnlockCost(unlockId) {
  const ordered = ["supply_cache", "guild_license", "temple_favors", "archive_maps", "ghost_bargains", "deep_contracts"];
  const index = Math.max(0, ordered.indexOf(unlockId));
  return 140 + index * 70;
}

function getAvailableTownUnlocks(game) {
  ensureTownMetaState(game);
  return Object.values(TOWN_UNLOCK_DEFS)
    .filter((unlockDef) => !unlocked(game, unlockDef.id))
    .map((unlockDef) => ({
      ...unlockDef,
      cost: getUnlockCost(unlockDef.id)
    }));
}

function purchaseTownUnlock(game, unlockId) {
  ensureTownMetaState(game);
  const unlockDef = TOWN_UNLOCK_DEFS[unlockId];
  if (!unlockDef || unlocked(game, unlockId)) {
    return false;
  }
  const cost = getUnlockCost(unlockId);
  if (game.player.gold < cost) {
    game.log("You cannot fund that town project yet.", "warning");
    return false;
  }
  game.player.gold -= cost;
  unlockDurableTownProject(game, unlockId);
  game.townUnlocks[unlockId] = true;
  ensureTownMetaState(game);
  refreshTownStocks(game);
  game.log(`Town improvement funded: ${unlockDef.name}.`, "good");
  game.recordChronicleEvent?.("town_unlock", {
    unlockId,
    label: unlockDef.name
  });
  game.recordTelemetry?.("town_unlock_purchase", {
    unlockId,
    cost,
    unlockOrder: Object.values(game.durableTownUnlocks || game.townUnlocks).filter(Boolean).length
  });
  return true;
}

function getNextFloorRumor(game) {
  const depth = Math.min(game.levels.length - 1, Math.max(1, game.currentDepth + 1));
  const level = game.levels?.[depth];
  const theme = getDepthTheme(depth);
  const cycle = getTownCycleState(game);
  const rumorEntries = [];
  const milestone = level?.milestone;
  if (milestone) {
    const milestoneRumor = RUMOR_DEFS[milestone.id === "depth3_gatekeeper" ? "gatekeeper" : milestone.id === "depth5_cryptlord" ? "cryptlord" : "stormwarden"];
    if (milestoneRumor) {
      rumorEntries.push(milestoneRumor);
    }
  }
  if (theme && RUMOR_DEFS[theme.id]) {
    rumorEntries.push(RUMOR_DEFS[theme.id]);
  }
  if (level?.floorObjective?.id === "recover_relic" && RUMOR_DEFS.relic_hunt) {
    rumorEntries.push(RUMOR_DEFS.relic_hunt);
  }
  if (level?.floorObjective?.id === "purge_nest" && RUMOR_DEFS.nest) {
    rumorEntries.push(RUMOR_DEFS.nest);
  }
  if (level?.floorObjective?.id === "rescue_captive" && RUMOR_DEFS.captive) {
    rumorEntries.push(RUMOR_DEFS.captive);
  }
  if (level?.floorObjective?.id === "seal_shrine" && RUMOR_DEFS.shrine_path) {
    rumorEntries.push(RUMOR_DEFS.shrine_path);
  }
  if (level?.floorObjective?.id === "secure_supplies" && RUMOR_DEFS.supplies) {
    rumorEntries.push(RUMOR_DEFS.supplies);
  }
  if (level?.floorObjective?.id === "recover_waystone" && RUMOR_DEFS.waystone) {
    rumorEntries.push(RUMOR_DEFS.waystone);
  }
  if (level?.floorObjective?.id === "secure_ledger" && RUMOR_DEFS.ledger) {
    rumorEntries.push(RUMOR_DEFS.ledger);
  }
  if (level?.floorObjective?.id === "purify_well" && RUMOR_DEFS.purify_well) {
    rumorEntries.push(RUMOR_DEFS.purify_well);
  }
  if (level?.floorObjective?.id === "break_beacon" && RUMOR_DEFS.beacon) {
    rumorEntries.push(RUMOR_DEFS.beacon);
  }
  if (level?.floorObjective?.id === "light_watchfire" && RUMOR_DEFS.watchfire) {
    rumorEntries.push(RUMOR_DEFS.watchfire);
  }
  if (cycle.phase === "Dawn") {
    return rumorEntries.find((entry) => ["relic_hunt", "nest", "captive", "supplies", "waystone", "ledger", "shrine_path", "watchfire", theme?.id].includes(entry.id)) || rumorEntries[0] || null;
  }
  if (cycle.phase === "Dusk" || cycle.phase === "Night") {
    return rumorEntries[0] || null;
  }
  return rumorEntries[1] || rumorEntries[0] || null;
}

function buyTownRumor(game) {
  ensureTownMetaState(game);
  const price = getRumorPrice(game);
  const spendToken = (game.player.runCurrencies?.rumorTokens || 0) > 0;
  if (!spendToken && game.player.gold < price) {
    game.log("You cannot afford fresh intel.", "warning");
    return false;
  }
  const rumor = getNextFloorRumor(game);
  if (!rumor) {
    game.log("No new intel is available right now.", "warning");
    return false;
  }
  if (spendToken) {
    game.player.runCurrencies.rumorTokens -= 1;
  } else {
    game.player.gold -= price;
  }
  if (!game.rumorTable.includes(rumor.id)) {
    game.rumorTable.push(rumor.id);
  }
  game.learnRumor?.(rumor.id);
  game.log(`Rumor secured: ${rumor.text}`, "good");
  game.recordTelemetry?.("town_rumor_buy", {
    rumorId: rumor.id,
    spendType: spendToken ? "token" : "gold",
    price: spendToken ? 0 : price
  });
  return true;
}

function getTownIntel(game) {
  ensureTownMetaState(game);
  const cycle = getTownCycleState(game);
  const nextRumor = getNextFloorRumor(game);
  const known = game.rumorTable
    .map((id) => RUMOR_DEFS[id])
    .filter(Boolean)
    .slice(-3);
  return {
    nextRumor,
    known,
    cycle,
    featuredStock: cycle.featuredStock,
    reactions: getTownReactionBundle(game)
  };
}

function getTownMetaSummary(game) {
  ensureTownMetaState(game);
  const intel = getTownIntel(game);
  const nextUnlock = getAvailableTownUnlocks(game)[0] || null;
  const rumorTokens = game.player?.runCurrencies?.rumorTokens || 0;
  const bankGold = Math.floor(game.player?.bankGold || 0);
  const onHand = Math.floor(game.player?.gold || 0);
  const rumorPrice = getRumorPrice(game);
  const nextRunIntent = typeof game.getNextRunIntent === "function" ? game.getNextRunIntent() : null;
  const nextRunFocus = nextRunIntent?.progressText || (typeof game.getNextRunFocusLines === "function" ? game.getNextRunFocusLines().find(Boolean) || "" : "");
  const contractModel = typeof game.getContractViewModel === "function" ? game.getContractViewModel() : null;
  const recommendedContract = contractModel?.all?.find((contract) => contract.id === contractModel.recommendedId) || null;
  const canArmRecommendedContract = Boolean(recommendedContract?.unlocked && !recommendedContract?.active);
  const canBuyRumor = rumorTokens > 0 || onHand >= rumorPrice;
  const nextUnlockText = nextUnlock
    ? onHand >= nextUnlock.cost
      ? `Fund ${nextUnlock.name}`
      : `Save for ${nextUnlock.name} (${nextUnlock.cost} gp)`
    : "All current projects funded";
  const intelText = intel.nextRumor?.text || "No clear rumor posted for the next floor.";
  let recommendedActionId = "bank";
  let recommendedActionLabel = "Review Bank Plan";
  let recommendedAction = "Check the bank for next-floor intel and support for this adventurer.";
  let recommendedReason = "Town persistence turns a clean return into the next run's edge.";

  if (nextRunIntent?.cta?.actionId?.startsWith("town_unlock:") && nextUnlock && onHand >= nextUnlock.cost) {
    recommendedActionId = nextRunIntent.cta.actionId;
    recommendedActionLabel = nextRunIntent.cta.label;
    recommendedAction = nextRunIntent.cta.text;
    recommendedReason = nextRunIntent.cta.progressText;
  } else if (nextRunIntent?.cta?.actionId === "contract_recommended" && canArmRecommendedContract) {
    recommendedActionId = nextRunIntent.cta.actionId;
    recommendedActionLabel = nextRunIntent.cta.label;
    recommendedAction = nextRunIntent.cta.text;
    recommendedReason = nextRunIntent.cta.progressText;
  } else if (nextRunIntent?.cta?.actionId === "town_rumor" && canBuyRumor) {
    recommendedActionId = nextRunIntent.cta.actionId;
    recommendedActionLabel = nextRunIntent.cta.label;
    recommendedAction = nextRunIntent.cta.text;
    recommendedReason = nextRunIntent.cta.progressText;
  } else if (game.storyFlags?.postReturnBankPrompt && canArmRecommendedContract) {
    recommendedActionId = "contract_recommended";
    recommendedActionLabel = `Arm ${recommendedContract.name}`;
    recommendedAction = `Arm ${recommendedContract.name} before the next run.`;
    recommendedReason = recommendedContract.recommendationReason || recommendedContract.description;
  } else if (game.storyFlags?.postReturnBankPrompt && canBuyRumor) {
    recommendedActionId = "town_rumor";
    recommendedActionLabel = rumorTokens > 0 ? "Spend Rumor Token" : "Buy Intel";
    recommendedAction = rumorTokens > 0
      ? "Spend a rumor token on next-floor intel while the last return is still fresh."
      : "Buy next-floor intel before heading north again.";
    recommendedReason = intelText;
  } else if (canArmRecommendedContract) {
    recommendedActionId = "contract_recommended";
    recommendedActionLabel = `Arm ${recommendedContract.name}`;
    recommendedAction = `Arm ${recommendedContract.name} for the next run.`;
    recommendedReason = recommendedContract.recommendationReason || recommendedContract.description;
  } else if (rumorTokens > 0) {
    recommendedActionId = "town_rumor";
    recommendedActionLabel = "Spend Rumor Token";
    recommendedAction = "Spend a rumor token at the bank for fresh intel.";
    recommendedReason = intelText;
  } else if (nextUnlock && onHand >= nextUnlock.cost) {
    recommendedActionId = `town_unlock:${nextUnlock.id}`;
    recommendedActionLabel = `Fund ${nextUnlock.name}`;
    recommendedAction = `Fund ${nextUnlock.name} now to improve this adventurer's next descents.`;
    recommendedReason = nextUnlock.description;
  } else if (canBuyRumor) {
    recommendedActionId = "town_rumor";
    recommendedActionLabel = "Buy Intel";
    recommendedAction = "Buy intel before heading north again.";
    recommendedReason = intelText;
  } else if (bankGold > 0 && onHand < 100) {
    recommendedActionId = "bank_withdraw";
    recommendedActionLabel = "Withdraw 100";
    recommendedAction = "Use banked gold for safety, intel, or your next town project before descending.";
    recommendedReason = "Liquid gold lets this adventurer convert value before the next descent.";
  } else if (onHand > 0) {
    recommendedActionId = "bank_deposit";
    recommendedActionLabel = "Deposit 100";
    recommendedAction = "Bank spare gold if you want a safer next descent.";
    recommendedReason = "Account gold survives the trip back north better than loose coin.";
  }
  return {
    bankGold,
    rumorTokens,
    nextUnlock,
    nextRumor: intel.nextRumor || null,
    nextRunIntent,
    recommendedActionId,
    recommendedActionLabel,
    recommendedAction,
    recommendedReason: nextRunFocus ? `${recommendedReason} ${nextRunFocus}` : recommendedReason,
    recommendedContractId: recommendedContract?.id || "",
    summary: `Secured ${bankGold} gp | Rumor tokens ${rumorTokens} | ${nextUnlockText} | Next-floor intel: ${intelText} | Next: ${recommendedActionLabel}${nextRunFocus ? ` | ${nextRunFocus}` : ""}`
  };
}

// src/features/chronicle.js

function ensureChronicleState(game) {
  game.chronicleEvents = Array.isArray(game.chronicleEvents) ? game.chronicleEvents : [];
  game.deathContext = game.deathContext || null;
}

function recordChronicleEvent(game, type, payload = {}) {
  ensureChronicleState(game);
  game.chronicleEvents.push({
    turn: game.turn,
    depth: game.currentDepth,
    type,
    payload
  });
  if (game.chronicleEvents.length > 80) {
    game.chronicleEvents.shift();
  }
}

function noteDeathContext(game, context) {
  ensureChronicleState(game);
  game.deathContext = {
    turn: game.turn,
    depth: game.currentDepth,
    location: game.currentLevel?.description || "the dungeon",
    ...context
  };
}

function formatChronicleLine(entry) {
  if (entry.type === "story_scene") {
    return entry.payload?.label || "Received a town briefing.";
  }
  if (entry.type === "discovery_found") {
    return `Found ${entry.payload.label} on depth ${entry.depth}.`;
  }
  if (entry.type === "objective_complete") {
    return `Objective cleared: ${entry.payload.label} on depth ${entry.depth}.`;
  }
  if (entry.type === "greed_choice") {
    return `Stayed greedy at ${entry.payload.label} on depth ${entry.depth}.`;
  }
  if (entry.type === "elite_kill") {
    return `Killed ${entry.payload.label} on depth ${entry.depth}.`;
  }
  if (entry.type === "milestone_clear") {
    return entry.payload?.summary || `Broke ${entry.payload.label} on depth ${entry.depth}.`;
  }
  if (entry.type === "room_event_clear") {
    return `Resolved ${entry.payload.label} on depth ${entry.depth}.`;
  }
  if (entry.type === "town_unlock") {
    return `Funded town upgrade: ${entry.payload.label}.`;
  }
  if (entry.type === "reinforcements") {
    return `Reinforcements arrived at ${entry.payload.band} danger on depth ${entry.depth}.`;
  }
  if (entry.type === "floor_enter") {
    return `Entered ${entry.payload.label}.`;
  }
  return entry.payload?.label || entry.type;
}

function renderChronicleMarkup(game, limit = 10) {
  ensureChronicleState(game);
  const lines = game.chronicleEvents.slice(-limit).reverse();
  if (lines.length === 0) {
    return "<div class='muted'>No memorable beats recorded yet.</div>";
  }
  return lines.map((entry) => `
    <div class="log-line">
      <span class="log-turn">[${entry.turn}]</span> ${escapeHtml(formatChronicleLine(entry))}
    </div>
  `).join("");
}

function buildDeathRecapMarkup(game) {
  ensureChronicleState(game);
  const context = game.deathContext || {
    location: game.currentLevel?.description || "the dungeon",
    cause: "Unknown cause",
    lastHitBy: "Unknown foe",
    dangerLevel: game.currentLevel?.dangerLevel || "Low"
  };
  const recent = game.chronicleEvents.slice(-5).reverse();
  const recentMarkup = recent.length === 0
    ? "<div class='muted'>No major beats were recorded.</div>"
    : recent.map((entry) => `<div class="log-line">${escapeHtml(formatChronicleLine(entry))}</div>`).join("");
  const summary = game.lastRunSummary || null;
  const persistentChanges = Array.isArray(summary?.persistentChanges) ? summary.persistentChanges : [];
  const activeContract = typeof game.getActiveContract === "function" ? game.getActiveContract(true) || game.getActiveContract(false) : null;
  const masterySummary = typeof game.getClassMasterySummary === "function"
    ? game.getClassMasterySummary(game.player?.classId)
    : "No mastery track.";
  const carryForward = typeof game.getTownCarryForwardSummary === "function"
    ? game.getTownCarryForwardSummary()
    : "Town improvements carried forward: none yet.";
  const nextRunMarkup = typeof game.getNextRunFocusMarkup === "function"
    ? game.getNextRunFocusMarkup({ label: "Why Run Again" })
    : "";

  return `
    <div class="section-block text-block">
      ${escapeHtml(game.player.name)} fell in ${escapeHtml(context.location)}.
    </div>
    <div class="section-block">
      <div class="stat-line"><span>Cause</span><strong>${escapeHtml(context.cause || "Unknown")}</strong></div>
      <div class="stat-line"><span>Last threat</span><strong>${escapeHtml(context.lastHitBy || "Unknown")}</strong></div>
      <div class="stat-line"><span>Danger</span><strong>${escapeHtml(context.dangerLevel || "Low")}</strong></div>
      <div class="stat-line"><span>Turn</span><strong>${context.turn || game.turn}</strong></div>
      <div class="stat-line"><span>Depth</span><strong>${context.depth ?? game.currentDepth}</strong></div>
    </div>
    <div class="section-block">
      <div class="field-label">Run Chronicle</div>
      <div class="message-log journal-log">${recentMarkup}</div>
    </div>
    <div class="section-block">
      <div class="field-label">Town Persistence</div>
      <div class="text-block">
        ${escapeHtml(`Mastery: ${masterySummary}`)}<br><br>
        ${escapeHtml(activeContract ? `Active contract: ${activeContract.name}` : "Active contract: none armed")}<br><br>
        ${escapeHtml(persistentChanges.length > 0 ? persistentChanges.join(", ") : "No permanent unlock changed during this run.")}<br><br>
        ${escapeHtml(carryForward)}
      </div>
    </div>
    ${nextRunMarkup}
  `;
}

// src/features/meta-progression.js

const META_PROFILE_KEY = "cotw.meta.v1";
const CAMPAIGN_ARCHIVE_LIMIT = 18;

function parseMetaProfile() {
  if (typeof localStorage === "undefined") {
    return {};
  }
  try {
    return JSON.parse(localStorage.getItem(META_PROFILE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveMetaProfile(profile) {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(META_PROFILE_KEY, JSON.stringify(profile));
}

function defaultMasteries() {
  return {
    fighter: 0,
    rogue: 0,
    wizard: 0
  };
}

function defaultUnlockedContracts() {
  return ["pressed_descent"];
}

function defaultTownUnlocks() {
  return Object.fromEntries(Object.keys(TOWN_UNLOCK_DEFS).map((unlockId) => [unlockId, false]));
}

function defaultCommendations() {
  return Object.fromEntries(Object.keys(COMMENDATION_DEFS).map((commendationId) => [commendationId, false]));
}

function normalizeBooleanMap(values = {}, defaults = {}) {
  return Object.fromEntries(
    Object.keys(defaults).map((key) => [key, Boolean(values?.[key])])
  );
}

function buildMasterySummary(def, rank) {
  const unlocked = (def.ranks || []).filter((entry) => entry.rank <= rank);
  const next = (def.ranks || []).find((entry) => entry.rank === rank + 1);
  if (unlocked.length === 0) {
    return next ? `Next unlock: ${next.name}. ${next.description}` : "No mastery bonus yet.";
  }
  const unlockedText = unlocked.map((entry) => entry.name).join(", ");
  return next
    ? `Unlocked: ${unlockedText}. Next: ${next.name}.`
    : `Unlocked: ${unlockedText}.`;
}

function getRelevantHistory(game, limit = 5) {
  const history = Array.isArray(game.runSummaryHistory) && game.runSummaryHistory.length > 0
    ? game.runSummaryHistory
    : Array.isArray(game.campaignArchive) ? game.campaignArchive : [];
  return history.slice(-limit);
}

function dedupeContractUnlocks(game) {
  game.contracts.unlocked = [...new Set(game.contracts.unlocked)];
  defaultUnlockedContracts().forEach((contractId) => {
    if (!game.contracts.unlocked.includes(contractId)) {
      game.contracts.unlocked.push(contractId);
    }
  });
}

const CONTRACT_UNLOCK_HINTS = {
  pressed_descent: "Available by default for new adventurers.",
  greed_ledger: "Unlocks after clearing any floor objective.",
  scholar_road: "Unlocks after banking one successful extract.",
  hunters_call: "Unlocks after killing any elite.",
  ration_run: "Unlocks after banking a route-heavy extract.",
  sealed_return: "Unlocks after banking a clean extract without taking a greed room.",
  route_debt: "Unlocks after earning the Route Reader commendation from a route-heavy extract.",
  trophy_path: "Unlocks after earning the Elite Hunter commendation from an elite-heavy run.",
  greedy_burden: "Unlocks after earning the Greed Specialist commendation from a greed-heavy extract.",
  last_light: "Unlocks after banking a low-recovery extract."
};

const CONTRACT_EFFECT_LINES = {
  pressed_descent: [
    "Town Persistence",
    "Opt-in",
    "Applies to next run only",
    "Reinforcement clocks start shorter.",
    "Resolved objectives pay +1 rumor token."
  ],
  greed_ledger: [
    "Town Persistence",
    "Opt-in",
    "Applies to next run only",
    "Greed rooms pay extra gold.",
    "Greed rooms pay +1 rumor token.",
    "Greed actions raise pressure harder."
  ],
  scholar_road: [
    "Town Persistence",
    "Opt-in",
    "Applies to next run only",
    "Search reveals more route at a time.",
    "Resolved objectives pay +1 rumor token.",
    "You begin runs with lower maximum health."
  ],
  hunters_call: [
    "Town Persistence",
    "Opt-in",
    "Applies to next run only",
    "Elite kills pay extra gold.",
    "Elite kills pay +1 rumor token.",
    "Reinforcement waves are more likely to include elites."
  ],
  ration_run: [
    "Town Persistence",
    "Opt-in",
    "Applies to next run only",
    "Start with a healing potion and mapping scroll.",
    "Waiting, resting, and searching raise pressure harder."
  ],
  sealed_return: [
    "Town Persistence",
    "Opt-in",
    "Applies to next run only",
    "Start with a Rune of Return and +1 rumor token.",
    "Greed raises pressure harder.",
    "You begin runs with lower maximum health."
  ],
  route_debt: [
    "Town Persistence",
    "Opt-in",
    "Applies to next run only",
    "Start with +1 rumor token.",
    "Search reveals more route at a time.",
    "Searching raises pressure harder and you begin runs with lower maximum health."
  ],
  trophy_path: [
    "Town Persistence",
    "Opt-in",
    "Applies to next run only",
    "Elite kills pay extra gold.",
    "Elite kills pay +1 rumor token.",
    "Elite reinforcements are more likely."
  ],
  greedy_burden: [
    "Town Persistence",
    "Opt-in",
    "Applies to next run only",
    "Greed rooms pay more.",
    "Town buyers pay better after return.",
    "Burden penalties worsen and greed raises pressure harder."
  ],
  last_light: [
    "Town Persistence",
    "Opt-in",
    "Applies to next run only",
    "Start with emergency stock.",
    "Waiting, resting, and searching all raise pressure harder."
  ]
};

const TRIGGER_LABELS = {
  objective: "Clear any floor objective",
  extract: "Return to town after banking a cleared floor"
};

function formatMasteryReward(entry = {}) {
  const rewards = [];
  (entry.itemIds || []).forEach((itemId) => {
    const item = createTownItem(itemId);
    rewards.push(item?.name || itemId);
  });
  (entry.spellIds || []).forEach((spellId) => {
    rewards.push(SPELLS[spellId]?.name || spellId);
  });
  if (entry.rumorTokens) {
    rewards.push(`${entry.rumorTokens} rumor token${entry.rumorTokens === 1 ? "" : "s"}`);
  }
  return rewards;
}

function sortContracts(left, right) {
  return left.name.localeCompare(right.name);
}

function countRecentClassExtracts(game, classId) {
  const archive = Array.isArray(game.campaignArchive) ? game.campaignArchive : [];
  let streak = 0;
  for (let index = archive.length - 1; index >= 0; index -= 1) {
    const entry = archive[index];
    if (entry?.outcome !== "extract") {
      break;
    }
    if (entry.classId !== classId) {
      break;
    }
    streak += 1;
  }
  return streak;
}

function ensureMetaProgressionState(game) {
  const stored = parseMetaProfile();
  game.classMasteries = {
    ...defaultMasteries(),
    ...(stored.classMasteries || {}),
    ...(game.classMasteries || {})
  };
  game.contracts = {
    unlocked: Array.isArray(stored.unlockedContracts) && stored.unlockedContracts.length > 0
      ? [...stored.unlockedContracts]
      : defaultUnlockedContracts(),
    activeId: stored.activeContractId || "",
    currentRunId: game.contracts?.currentRunId || "",
    ...(game.contracts || {})
  };
  dedupeContractUnlocks(game);
  game.durableTownUnlocks = {
    ...defaultTownUnlocks(),
    ...normalizeBooleanMap(stored.durableTownUnlocks, defaultTownUnlocks()),
    ...normalizeBooleanMap(game.durableTownUnlocks, defaultTownUnlocks())
  };
  game.commendations = {
    ...defaultCommendations(),
    ...normalizeBooleanMap(stored.commendations, defaultCommendations()),
    ...normalizeBooleanMap(game.commendations, defaultCommendations())
  };
  game.campaignArchive = Array.isArray(stored.campaignArchive)
    ? stored.campaignArchive.slice(-CAMPAIGN_ARCHIVE_LIMIT)
    : Array.isArray(game.campaignArchive)
      ? game.campaignArchive.slice(-CAMPAIGN_ARCHIVE_LIMIT)
      : [];
}

function persistMetaProgressionState(game) {
  ensureMetaProgressionState(game);
  saveMetaProfile({
    classMasteries: game.classMasteries,
    unlockedContracts: game.contracts.unlocked,
    activeContractId: game.contracts.activeId || "",
    durableTownUnlocks: game.durableTownUnlocks,
    commendations: game.commendations,
    campaignArchive: game.campaignArchive.slice(-CAMPAIGN_ARCHIVE_LIMIT)
  });
}

function mergeLegacyTownUnlocks(game, legacyTownUnlocks = {}) {
  ensureMetaProgressionState(game);
  const defaults = defaultTownUnlocks();
  let changed = false;
  Object.keys(defaults).forEach((unlockId) => {
    if (legacyTownUnlocks?.[unlockId] && !game.durableTownUnlocks[unlockId]) {
      game.durableTownUnlocks[unlockId] = true;
      changed = true;
    }
  });
  if (changed) {
    persistMetaProgressionState(game);
  }
  return changed;
}

function getDurableTownUnlocks(game) {
  ensureMetaProgressionState(game);
  return { ...game.durableTownUnlocks };
}

function unlockDurableTownProject(game, unlockId) {
  ensureMetaProgressionState(game);
  if (!Object.prototype.hasOwnProperty.call(game.durableTownUnlocks, unlockId)) {
    return false;
  }
  if (game.durableTownUnlocks[unlockId]) {
    return false;
  }
  game.durableTownUnlocks[unlockId] = true;
  persistMetaProgressionState(game);
  return true;
}

function getCampaignArchive(game, limit = CAMPAIGN_ARCHIVE_LIMIT) {
  ensureMetaProgressionState(game);
  return game.campaignArchive.slice(-limit).reverse();
}

function recordCampaignSummary(game, summary) {
  ensureMetaProgressionState(game);
  if (!summary) {
    return null;
  }
  game.campaignArchive.push(summary);
  game.campaignArchive = game.campaignArchive.slice(-CAMPAIGN_ARCHIVE_LIMIT);
  persistMetaProgressionState(game);
  return summary;
}

function getActiveContract(game, useCurrentRun = false) {
  ensureMetaProgressionState(game);
  const contractId = useCurrentRun ? (game.contracts.currentRunId || game.contracts.activeId) : game.contracts.activeId;
  return contractId ? CONTRACT_DEFS[contractId] || null : null;
}

function setActiveContract(game, contractId = "") {
  ensureMetaProgressionState(game);
  if (!contractId) {
    game.contracts.activeId = "";
    persistMetaProgressionState(game);
    return true;
  }
  if (!game.contracts.unlocked.includes(contractId) || !CONTRACT_DEFS[contractId]) {
    return false;
  }
  game.contracts.activeId = contractId;
  persistMetaProgressionState(game);
  return true;
}

function unlockContract(game, contractId) {
  ensureMetaProgressionState(game);
  if (!CONTRACT_DEFS[contractId] || game.contracts.unlocked.includes(contractId)) {
    return false;
  }
  game.contracts.unlocked.push(contractId);
  dedupeContractUnlocks(game);
  persistMetaProgressionState(game);
  return true;
}

function applyContractToNewRun(game) {
  ensureMetaProgressionState(game);
  if (!game.contracts.unlocked.includes(game.contracts.activeId)) {
    game.contracts.activeId = "";
  }
  game.contracts.currentRunId = game.contracts.activeId || "";
  return getActiveContract(game, true);
}

function getAvailableContracts(game) {
  ensureMetaProgressionState(game);
  return Object.values(CONTRACT_DEFS).map((contract) => ({
    ...contract,
    unlocked: game.contracts.unlocked.includes(contract.id),
    active: game.contracts.activeId === contract.id,
    unlockHint: CONTRACT_UNLOCK_HINTS[contract.id] || "Unlock condition not yet documented.",
    effectLines: CONTRACT_EFFECT_LINES[contract.id] || [
      "Town Persistence",
      "Opt-in",
      "Applies to next run only",
      contract.description
    ]
  })).sort(sortContracts);
}

function getClassMasteryRank(game, classId) {
  ensureMetaProgressionState(game);
  return game.classMasteries[classId] || 0;
}

function getClassMasterySummary(game, classId) {
  const def = CLASS_MASTERY_DEFS[classId];
  const rank = getClassMasteryRank(game, classId);
  if (!def) {
    return "No mastery track.";
  }
  return buildMasterySummary(def, rank);
}

function getClassMasteryViewModel(game, classId) {
  ensureMetaProgressionState(game);
  const def = CLASS_MASTERY_DEFS[classId];
  if (!def) {
    return {
      classId,
      className: classId || "Unknown",
      rank: 0,
      summary: "No mastery track.",
      ladder: [],
      unlockedRewards: [],
      startingBonuses: [],
      nextReward: null
    };
  }
  const rank = getClassMasteryRank(game, classId);
  const ladder = (def.ranks || []).map((entry) => ({
    rank: entry.rank,
    name: entry.name,
    description: entry.description,
    trigger: entry.trigger,
    triggerLabel: TRIGGER_LABELS[entry.trigger] || entry.trigger,
    unlocked: entry.rank <= rank,
    rewardLines: formatMasteryReward(entry)
  }));
  const unlockedRewards = ladder.filter((entry) => entry.unlocked);
  const nextReward = ladder.find((entry) => !entry.unlocked) || null;
  return {
    classId,
    className: def.name,
    rank,
    summary: getClassMasterySummary(game, classId),
    ladder,
    unlockedRewards,
    startingBonuses: unlockedRewards.flatMap((entry) => entry.rewardLines),
    nextReward
  };
}

function getAvailableCommendations(game) {
  ensureMetaProgressionState(game);
  return Object.values(COMMENDATION_DEFS).map((commendation) => ({
    ...commendation,
    unlocked: Boolean(game.commendations?.[commendation.id])
  }));
}

function getNextCommendationGoal(game, classId = game.player?.classId || "") {
  ensureMetaProgressionState(game);
  const archive = Array.isArray(game.campaignArchive) ? game.campaignArchive : [];
  if (!game.commendations.clean_extract) {
    return {
      id: "clean_extract",
      text: "1 clean extract earns the Clean Extract archive badge."
    };
  }
  if (!game.commendations.route_reader) {
    const bestSearch = archive.reduce((max, entry) => Math.max(max, entry?.outcome === "extract" ? (entry.searchCount || 0) : 0), 0);
    return {
      id: "route_reader",
      text: `${Math.max(0, 4 - bestSearch)} more route searches in one extract earn Route Reader.`
    };
  }
  if (!game.commendations.elite_hunter) {
    const bestElites = archive.reduce((max, entry) => Math.max(max, entry?.eliteKills || 0), 0);
    return {
      id: "elite_hunter",
      text: `${Math.max(0, 2 - bestElites)} more elite kill${bestElites >= 1 ? "" : "s"} in one run earn Elite Hunter.`
    };
  }
  if (!game.commendations.class_loyalist) {
    const streak = countRecentClassExtracts(game, classId);
    return {
      id: "class_loyalist",
      text: `${Math.max(0, 3 - streak)} more ${CLASS_MASTERY_DEFS[classId]?.name?.replace(" Mastery", "") || classId || "class"} extract${streak === 2 ? "" : "s"} earn Class Loyalist.`
    };
  }
  return {
    id: "campaign_archive",
    text: "Current commendation set is complete."
  };
}

function unlockCommendation(game, commendationId) {
  ensureMetaProgressionState(game);
  if (!COMMENDATION_DEFS[commendationId] || game.commendations[commendationId]) {
    return false;
  }
  game.commendations[commendationId] = true;
  persistMetaProgressionState(game);
  return true;
}

function evaluateRunCommendations(game, summary) {
  ensureMetaProgressionState(game);
  if (!summary) {
    return [];
  }
  const unlocked = [];
  const maybeUnlock = (commendationId, contractId = "") => {
    if (!unlockCommendation(game, commendationId)) {
      return;
    }
    const commendation = COMMENDATION_DEFS[commendationId];
    const unlockedContract = contractId && unlockContract(game, contractId);
    unlocked.push({
      id: commendationId,
      name: commendation?.name || commendationId,
      rewardLabel: unlockedContract
        ? `Unlocks contract: ${CONTRACT_DEFS[contractId]?.name || contractId}`
        : commendation?.rewardLabel || "Archive badge",
      contractId: unlockedContract ? contractId : ""
    });
  };

  if (summary.outcome === "extract" && (summary.greedCount || 0) === 0) {
    maybeUnlock("clean_extract");
  }
  if (summary.outcome === "extract" && (summary.greedCount || 0) >= 2) {
    maybeUnlock("greed_specialist", "greedy_burden");
  }
  if ((summary.eliteKills || 0) >= 2) {
    maybeUnlock("elite_hunter", "trophy_path");
  }
  if (summary.outcome === "extract" && (summary.searchCount || 0) >= 4) {
    maybeUnlock("route_reader", "route_debt");
  }
  if (summary.outcome === "extract" && summary.carriedCurse) {
    maybeUnlock("curse_survivor");
  }
  if (summary.outcome === "extract" && countRecentClassExtracts(game, summary.classId) >= 3) {
    maybeUnlock("class_loyalist");
  }
  return unlocked;
}

function getCreationPersistencePreview(game, classId) {
  const mastery = getClassMasteryViewModel(game, classId);
  const activeContract = getActiveContract(game, false);
  return {
    activeContract,
    mastery,
    startingBonuses: mastery.startingBonuses
  };
}

function applyClassMasteryBonuses(game) {
  ensureMetaProgressionState(game);
  const classId = game.player?.classId;
  const def = CLASS_MASTERY_DEFS[classId];
  if (!def) {
    return [];
  }
  const rank = getClassMasteryRank(game, classId);
  const applied = [];
  (def.ranks || []).filter((entry) => entry.rank <= rank).forEach((entry) => {
    (entry.itemIds || []).forEach((itemId) => {
      const item = createTownItem(itemId);
      if (item) {
        game.addItemToInventory(item);
        applied.push(item.name || item.id);
      }
    });
    (entry.spellIds || []).forEach((spellId) => {
      if (!game.player.spellsKnown.includes(spellId)) {
        game.player.spellsKnown.push(spellId);
        game.addSpellToTrayIfSpace?.(spellId);
        applied.push(spellId);
      }
    });
    if (entry.rumorTokens) {
      game.player.runCurrencies.rumorTokens += entry.rumorTokens;
      applied.push(`${entry.rumorTokens} rumor token${entry.rumorTokens === 1 ? "" : "s"}`);
    }
  });
  return applied;
}

function applyCommendationBonuses(game) {
  ensureMetaProgressionState(game);
  const applied = [];
  if (game.commendations.class_loyalist && countRecentClassExtracts(game, game.player?.classId) >= 3) {
    game.player.runCurrencies.rumorTokens += 1;
    applied.push("Class Loyalist: +1 rumor token");
  }
  return applied;
}

function advanceClassMastery(game, trigger) {
  ensureMetaProgressionState(game);
  const classId = game.player?.classId;
  const def = CLASS_MASTERY_DEFS[classId];
  if (!def) {
    return null;
  }
  const currentRank = getClassMasteryRank(game, classId);
  const nextRank = (def.ranks || []).find((entry) => entry.rank === currentRank + 1 && entry.trigger === trigger);
  if (!nextRank) {
    return null;
  }
  game.classMasteries[classId] = nextRank.rank;
  persistMetaProgressionState(game);
  return nextRank;
}

function getRecommendedContract(game) {
  ensureMetaProgressionState(game);
  const history = getRelevantHistory(game, 5);
  if (history.length === 0) {
    return {
      id: "pressed_descent",
      reason: "Low-friction opt-in contract for the next run."
    };
  }
  const searchAverage = history.reduce((sum, summary) => sum + (summary.searchCount || 0), 0) / history.length;
  const greedAverage = history.reduce((sum, summary) => sum + (summary.greedCount || 0), 0) / history.length;
  const eliteAverage = history.reduce((sum, summary) => sum + (summary.eliteKills || 0), 0) / history.length;
  const lowRecoveryRate = history.filter((summary) => summary.outcome === "extract" && (summary.restCount || 0) === 0 && (summary.waitCount || 0) <= 2).length / history.length;
  const cleanExtractRate = history.filter((summary) => summary.outcome === "extract" && (summary.greedCount || 0) === 0).length / history.length;

  if (searchAverage >= 4 && game.contracts.unlocked.includes("route_debt")) {
    return {
      id: "route_debt",
      reason: "Recent extracts lean on scouting, so Route Debt sharpens route value at the cost of breathing room."
    };
  }
  if (eliteAverage >= 1.5 && game.contracts.unlocked.includes("trophy_path")) {
    return {
      id: "trophy_path",
      reason: "Recent runs are already elite-heavy, so Trophy Path converts that into a clearer bounty loop."
    };
  }
  if (greedAverage >= 2 && game.contracts.unlocked.includes("greedy_burden")) {
    return {
      id: "greedy_burden",
      reason: "Recent extracts are staying greedy, so Greedy Burden pushes payout higher and punishes over-carry."
    };
  }
  if (lowRecoveryRate >= 0.4 && game.contracts.unlocked.includes("last_light")) {
    return {
      id: "last_light",
      reason: "Recent clean pushes avoided recovery turns, so Last Light sharpens the opener and taxes idle play."
    };
  }
  if (eliteAverage >= 1 && game.contracts.unlocked.includes("hunters_call")) {
    return {
      id: "hunters_call",
      reason: "Recent runs are already hunting elites, so this converts that into better bounty and stronger pressure."
    };
  }
  if (greedAverage >= 1 && game.contracts.unlocked.includes("greed_ledger")) {
    return {
      id: "greed_ledger",
      reason: "Recent runs lean greedy, so this converts that habit into clearer payout."
    };
  }
  if (searchAverage >= 3 && game.contracts.unlocked.includes("ration_run")) {
    return {
      id: "ration_run",
      reason: "Recent runs spend extra turns scouting, so this sharpens the opener but punishes idle play."
    };
  }
  if (searchAverage >= 2 && game.contracts.unlocked.includes("scholar_road")) {
    return {
      id: "scholar_road",
      reason: "Recent runs lean on routing and search, so this sharpens the objective path."
    };
  }
  if (cleanExtractRate >= 0.4 && game.contracts.unlocked.includes("sealed_return")) {
    return {
      id: "sealed_return",
      reason: "Recent returns have been clean and disciplined, so this rewards fast banking and cleaner exits."
    };
  }
  return {
    id: "pressed_descent",
    reason: "Stable opt-in contract when you want better objective payout without changing the loop."
  };
}

function getContractViewModel(game) {
  const contracts = getAvailableContracts(game);
  const recommendation = getRecommendedContract(game);
  const decorated = contracts.map((contract) => ({
    ...contract,
    recommended: recommendation.id === contract.id,
    recommendationReason: recommendation.id === contract.id ? recommendation.reason : ""
  }));
  return {
    active: decorated.find((contract) => contract.active) || null,
    unlocked: decorated.filter((contract) => contract.unlocked && !contract.active),
    locked: decorated.filter((contract) => !contract.unlocked),
    recommendedId: recommendation.id,
    recommendedReason: recommendation.reason,
    all: decorated
  };
}

// src/features/telemetry.js

const TELEMETRY_STORAGE_KEY = "cotw.telemetry.v1";
const RAW_EVENT_LIMIT = 220;
const SUMMARY_LIMIT = 18;

function makeId(prefix = "evt") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseTelemetryStore() {
  if (typeof localStorage === "undefined") {
    return {
      rawEvents: [],
      summaries: []
    };
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(TELEMETRY_STORAGE_KEY) || "{}");
    return {
      rawEvents: Array.isArray(parsed.rawEvents) ? parsed.rawEvents : [],
      summaries: Array.isArray(parsed.summaries) ? parsed.summaries : []
    };
  } catch {
    return {
      rawEvents: [],
      summaries: []
    };
  }
}

function writeTelemetryStore(store) {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify({
    rawEvents: (store.rawEvents || []).slice(-RAW_EVENT_LIMIT),
    summaries: (store.summaries || []).slice(-SUMMARY_LIMIT)
  }));
}

function average(values = []) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function createRunMetrics(game) {
  const validation = typeof game.getValidationSummary === "function"
    ? game.getValidationSummary()
    : { signature: "", variants: {} };
  return {
    runId: makeId("run"),
    startedAt: new Date().toISOString(),
    heroName: game.player?.name || "Unknown",
    classId: game.player?.classId || "",
    className: game.player?.className || "",
    raceId: game.player?.raceId || "",
    raceName: game.player?.race || "",
    contractId: game.contracts?.currentRunId || game.contracts?.activeId || "",
    firstMoveLogged: false,
    firstObjectiveType: null,
    firstObjectiveSeenTurn: null,
    firstObjectiveClearTurn: null,
    firstObjectiveReachSource: "",
    firstObjectiveSearchCount: 0,
    firstSearchBeforeObjectiveTurn: null,
    searchCount: 0,
    waitCount: 0,
    restCount: 0,
    eliteKills: 0,
    modalOpenCounts: {
      pack: 0,
      magic: 0,
      journal: 0,
      town: 0
    },
    greedCount: 0,
    greedLabels: [],
    townServicesOpened: [],
    serviceOpenCounts: {},
    objectiveSeenKeys: {},
    optionalSeenKeys: {},
    deepestDepth: Math.max(0, game.currentDepth || 0, game.player?.deepestDepth || 0),
    validationProfile: validation.signature,
    validationVariants: validation.variants
  };
}

function cloneMap(map) {
  return map && typeof map === "object" ? { ...map } : {};
}

function touchStoreSummaries(game) {
  const store = parseTelemetryStore();
  store.summaries = Array.isArray(game.runSummaryHistory) ? game.runSummaryHistory.slice(-SUMMARY_LIMIT) : [];
  writeTelemetryStore(store);
}

function normalizeRun(activeRun, game) {
  const base = createRunMetrics(game);
  return {
    ...base,
    ...(activeRun || {}),
    modalOpenCounts: {
      ...base.modalOpenCounts,
      ...(activeRun?.modalOpenCounts || {})
    },
    greedLabels: Array.isArray(activeRun?.greedLabels) ? [...activeRun.greedLabels] : [],
    townServicesOpened: Array.isArray(activeRun?.townServicesOpened) ? [...activeRun.townServicesOpened] : [],
    serviceOpenCounts: cloneMap(activeRun?.serviceOpenCounts),
    objectiveSeenKeys: cloneMap(activeRun?.objectiveSeenKeys),
    optionalSeenKeys: cloneMap(activeRun?.optionalSeenKeys)
  };
}

function buildEventContext(game) {
  return {
    turn: game.turn || 0,
    depth: game.currentDepth || 0,
    mode: game.mode || "game",
    location: game.currentLevel?.description || (game.currentDepth === 0 ? "Town" : ""),
    dangerLevel: game.currentLevel?.dangerLevel || (game.currentDepth === 0 ? "Town Calm" : ""),
    objectiveId: game.currentLevel?.floorObjective?.id || "",
    objectiveStatus: game.currentLevel?.floorObjective?.status || "",
    optionalId: game.currentLevel?.floorOptional?.id || "",
    optionalOpened: Boolean(game.currentLevel?.floorOptional?.opened)
  };
}

function normalizeType(type) {
  const aliases = {
    death: "run_death",
    floor_enter: "depth_entered",
    item_use: "item_used",
    keep_enter: "keep_entered",
    load_game: "load_game",
    objective_complete: "objective_resolved",
    objective_reach: "objective_reached",
    objective_spotted: "objective_reached",
    optional_opened: "optional_triggered",
    optional_take: "optional_triggered",
    run_start: "run_started",
    save_game: "save_game",
    search_use: "search_used",
    session_end: "session_end",
    spell_cast: "spell_cast",
    town_return: "returned_to_town",
    town_service_open: "town_service_opened"
  };
  return aliases[type] || type;
}

function describeEvent(event) {
  const detail = event.payload?.label
    || event.payload?.serviceId
    || event.payload?.objectiveId
    || event.payload?.optionalId
    || event.payload?.itemId
    || event.payload?.spellId
    || event.payload?.unlockId
    || event.payload?.rumorId
    || "";
  const label = event.type.replace(/_/g, " ");
  return detail ? `${label}: ${detail}` : label;
}

function buildSummaryFromState(game) {
  const events = Array.isArray(game.telemetry?.rawEvents)
    ? game.telemetry.rawEvents.filter((event) => event.runId === game.telemetry.activeRunId)
    : [];
  const count = (type) => events.filter((event) => event.type === type).length;
  return {
    runId: game.telemetry?.activeRunId || "",
    eventCount: events.length,
    searches: count("search_used"),
    shopBuys: count("shop_buy"),
    shopSells: count("shop_sell"),
    spellsCast: count("spell_cast"),
    itemsUsed: count("item_used"),
    townReturns: count("returned_to_town"),
    optionalsTaken: count("optional_triggered"),
    saves: count("save_game"),
    loads: count("load_game"),
    deaths: count("run_death"),
    recent: events.slice(-8).reverse().map((event) => ({
      text: describeEvent(event),
      turn: event.turn,
      depth: event.depth,
      type: event.type
    }))
  };
}

function buildReviewSnapshotFromState(game) {
  const events = Array.isArray(game.telemetry?.rawEvents)
    ? game.telemetry.rawEvents.filter((event) => event.runId === game.telemetry.activeRunId)
    : [];
  return {
    activeRun: game.telemetry?.activeRun || null,
    summary: buildSummaryFromState(game),
    recentEvents: events.slice(-12).reverse().map((event) => ({
      ...event,
      text: describeEvent(event)
    })),
    summaries: Array.isArray(game.runSummaryHistory) ? game.runSummaryHistory.slice(-5) : [],
    meta: computeMetaReview(game)
  };
}

function syncTelemetryMirror(game) {
  game.telemetry.events = game.telemetry.rawEvents;
  if (typeof window !== "undefined") {
    window.__castleTelemetry = {
      events: game.telemetry.rawEvents,
      activeRun: game.telemetry.activeRun,
      summaries: game.runSummaryHistory.slice(-5),
      meta: computeMetaReview(game),
      review: buildReviewSnapshotFromState(game)
    };
  }
}

function computeBankOpensAfterReturn(rawEvents = []) {
  let successfulReturns = 0;
  let bankOpensAfterReturn = 0;
  let pendingReturn = false;
  rawEvents.forEach((event) => {
    if (event.type === "returned_to_town") {
      successfulReturns += 1;
      pendingReturn = true;
      return;
    }
    if (event.type === "bank_persistence_viewed" && pendingReturn) {
      bankOpensAfterReturn += 1;
      pendingReturn = false;
      return;
    }
    if (event.type === "run_started" && pendingReturn) {
      pendingReturn = false;
    }
  });
  return {
    successfulReturns,
    bankOpensAfterReturn
  };
}

function computeReturnFollowThrough(rawEvents = []) {
  const summary = {
    successfulReturns: 0,
    bankOpensAfterReturn: 0,
    rumorBuysAfterReturn: 0,
    unlockPurchasesAfterReturn: 0,
    contractArmsAfterReturn: 0,
    returnsWithAnyTownAction: 0
  };
  let pendingReturn = null;

  const finalizePendingReturn = () => {
    if (!pendingReturn) {
      return;
    }
    if (pendingReturn.bank) {
      summary.bankOpensAfterReturn += 1;
    }
    if (pendingReturn.rumor) {
      summary.rumorBuysAfterReturn += 1;
    }
    if (pendingReturn.unlock) {
      summary.unlockPurchasesAfterReturn += 1;
    }
    if (pendingReturn.contract) {
      summary.contractArmsAfterReturn += 1;
    }
    if (pendingReturn.bank || pendingReturn.rumor || pendingReturn.unlock || pendingReturn.contract) {
      summary.returnsWithAnyTownAction += 1;
    }
    pendingReturn = null;
  };

  rawEvents.forEach((event) => {
    if (event.type === "returned_to_town") {
      finalizePendingReturn();
      summary.successfulReturns += 1;
      pendingReturn = {
        bank: false,
        rumor: false,
        unlock: false,
        contract: false
      };
      return;
    }
    if (!pendingReturn) {
      return;
    }
    if (event.type === "run_started") {
      finalizePendingReturn();
      return;
    }
    if (event.type === "bank_persistence_viewed") {
      pendingReturn.bank = true;
      return;
    }
    if (event.type === "town_rumor_buy") {
      pendingReturn.rumor = true;
      return;
    }
    if (event.type === "town_unlock_purchase") {
      pendingReturn.unlock = true;
      return;
    }
    if (event.type === "contract_armed") {
      pendingReturn.contract = true;
    }
  });

  finalizePendingReturn();
  return summary;
}

function computeMetaReview(game) {
  const rawEvents = Array.isArray(game.telemetry?.rawEvents) ? game.telemetry.rawEvents : [];
  const summaries = Array.isArray(game.runSummaryHistory) ? game.runSummaryHistory : [];
  const runStarts = rawEvents.filter((event) => event.type === "run_started");
  const armedStarts = runStarts.filter((event) => Boolean(event.payload?.contractId));
  const contractCounts = armedStarts.reduce((counts, event) => {
    const contractId = event.payload?.contractId;
    if (contractId) {
      counts[contractId] = (counts[contractId] || 0) + 1;
    }
    return counts;
  }, {});
  const masteryUnlocksByClass = rawEvents
    .filter((event) => event.type === "mastery_advanced")
    .reduce((counts, event) => {
      const classId = event.payload?.classId || "unknown";
      counts[classId] = (counts[classId] || 0) + 1;
      return counts;
    }, {});
  const mostArmedContract = Object.entries(contractCounts)
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0]);
    })[0]?.[0] || "";
  const returnSummaryOpens = rawEvents.filter((event) => event.type === "return_summary_opened").length;
  const returnSummaryCloses = rawEvents.filter((event) => event.type === "return_summary_closed").length;
  const bankAfterReturn = computeBankOpensAfterReturn(rawEvents);
  const returnFollowThrough = computeReturnFollowThrough(rawEvents);
  const clearTurns = summaries
    .map((summary) => summary.firstObjectiveClearTurn)
    .filter((value) => Number.isFinite(value));
  const searchCounts = summaries
    .map((summary) => Number.isFinite(summary.firstObjectiveSearchCount) ? summary.firstObjectiveSearchCount : summary.searchCount)
    .filter((value) => Number.isFinite(value));
  const validationProfileCounts = runStarts.reduce((counts, event) => {
    const key = event.payload?.validationProfile || "default";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  return {
    totalRunStarts: runStarts.length,
    armedRunStarts: armedStarts.length,
    armedRunStartRate: runStarts.length > 0 ? armedStarts.length / runStarts.length : 0,
    mostArmedContract,
    contractArmCounts: contractCounts,
    masteryUnlocksByClass,
    successfulReturns: bankAfterReturn.successfulReturns,
    bankOpensAfterReturn: bankAfterReturn.bankOpensAfterReturn,
    rumorBuysAfterReturn: returnFollowThrough.rumorBuysAfterReturn,
    unlockPurchasesAfterReturn: returnFollowThrough.unlockPurchasesAfterReturn,
    contractArmsAfterReturn: returnFollowThrough.contractArmsAfterReturn,
    returnsWithAnyTownAction: returnFollowThrough.returnsWithAnyTownAction,
    contractArmRateAfterReturn: returnFollowThrough.successfulReturns > 0
      ? returnFollowThrough.contractArmsAfterReturn / returnFollowThrough.successfulReturns
      : 0,
    averageFirstObjectiveClearTurn: average(clearTurns),
    averageFirstObjectiveSearchCount: average(searchCounts),
    validationProfileCounts,
    returnSummaryOpens,
    returnSummaryCloses,
    archivedReturns: summaries.filter((summary) => summary.outcome !== "death").length
  };
}

function markModalOpen(activeRun, type, payload = {}) {
  if (!activeRun) {
    return;
  }
  switch (type) {
    case "modal_opened":
      if (String(payload.surface || "").startsWith("hub:pack")) {
        activeRun.modalOpenCounts.pack += 1;
      } else if (String(payload.surface || "").startsWith("hub:magic")) {
        activeRun.modalOpenCounts.magic += 1;
      } else if (String(payload.surface || "").startsWith("hub:journal")) {
        activeRun.modalOpenCounts.journal += 1;
      } else if (["bank", "sage", "temple", "shop:general", "shop:armory", "shop:guild", "shop:junk", "utility-menu"].includes(payload.surface)) {
        activeRun.modalOpenCounts.town += 1;
      }
      break;
    case "pack_opened":
      activeRun.modalOpenCounts.pack += 1;
      break;
    case "magic_opened":
      activeRun.modalOpenCounts.magic += 1;
      break;
    case "journal_opened":
      activeRun.modalOpenCounts.journal += 1;
      break;
    default:
      break;
  }
}

function updateRunMetrics(game, activeRun, type, payload = {}) {
  if (!activeRun) {
    return;
  }
  activeRun.deepestDepth = Math.max(activeRun.deepestDepth || 0, game.currentDepth || 0, game.player?.deepestDepth || 0, payload.depth || 0);
  markModalOpen(activeRun, type, payload);

  if (type === "first_move") {
    activeRun.firstMoveLogged = true;
    return;
  }

  if (type === "town_service_opened" && payload.serviceId) {
    activeRun.serviceOpenCounts[payload.serviceId] = (activeRun.serviceOpenCounts[payload.serviceId] || 0) + 1;
    if (!activeRun.townServicesOpened.includes(payload.serviceId)) {
      activeRun.townServicesOpened.push(payload.serviceId);
    }
    return;
  }

  if (type === "search_used") {
    activeRun.searchCount += 1;
    if (!activeRun.firstObjectiveClearTurn && activeRun.firstSearchBeforeObjectiveTurn === null) {
      activeRun.firstSearchBeforeObjectiveTurn = game.turn || 0;
    }
    return;
  }

  if (type === "wait_used") {
    activeRun.waitCount += 1;
    return;
  }

  if (type === "rest_used") {
    activeRun.restCount += 1;
    return;
  }

  if (type === "elite_kill") {
    activeRun.eliteKills += 1;
    return;
  }

  if (type === "objective_seen") {
    activeRun.firstObjectiveType = activeRun.firstObjectiveType || payload.objectiveId || game.currentLevel?.floorObjective?.id || null;
    activeRun.firstObjectiveSeenTurn = activeRun.firstObjectiveSeenTurn || game.turn || 0;
    return;
  }

  if (type === "objective_reached") {
    activeRun.firstObjectiveType = activeRun.firstObjectiveType || payload.objectiveId || game.currentLevel?.floorObjective?.id || null;
    activeRun.firstObjectiveSeenTurn = activeRun.firstObjectiveSeenTurn || game.turn || 0;
    activeRun.firstObjectiveReachSource = activeRun.firstObjectiveReachSource || payload.source || "";
    return;
  }

  if (type === "objective_resolved") {
    activeRun.firstObjectiveType = activeRun.firstObjectiveType || payload.objectiveId || game.currentLevel?.floorObjective?.id || null;
    activeRun.firstObjectiveSeenTurn = activeRun.firstObjectiveSeenTurn || game.turn || 0;
    activeRun.firstObjectiveClearTurn = activeRun.firstObjectiveClearTurn || game.turn || 0;
    activeRun.firstObjectiveSearchCount = activeRun.firstObjectiveSearchCount || activeRun.searchCount || 0;
    return;
  }

  if (type === "optional_triggered") {
    activeRun.greedCount += 1;
    if (payload.optionalId) {
      activeRun.greedLabels.push(payload.optionalId);
    }
    activeRun.greedLabels = activeRun.greedLabels.slice(-8);
  }
}

function buildObjectiveReachSource(game, objective, markerReached) {
  const searchesUsed = game.currentLevel?.guidance?.searchesUsed || 0;
  if (game.currentDepth === 1 && searchesUsed > 0) {
    return "route";
  }
  return markerReached ? "marker" : "room";
}

function ensureTelemetryState(game) {
  const stored = parseTelemetryStore();
  game.telemetry = {
    sessionId: makeId("session"),
    activeRunId: null,
    activeRun: null,
    rawEvents: [],
    ...(game.telemetry || {})
  };
  if (!game.telemetry.sessionId) {
    game.telemetry.sessionId = makeId("session");
  }
  if ((!Array.isArray(game.telemetry.rawEvents) || game.telemetry.rawEvents.length === 0) && stored.rawEvents.length > 0) {
    game.telemetry.rawEvents = stored.rawEvents.slice(-RAW_EVENT_LIMIT);
  }
  game.telemetry.rawEvents = Array.isArray(game.telemetry.rawEvents) ? game.telemetry.rawEvents.slice(-RAW_EVENT_LIMIT) : [];
  game.telemetry.activeRun = game.telemetry.activeRun ? normalizeRun(game.telemetry.activeRun, game) : null;
  if ((!Array.isArray(game.runSummaryHistory) || game.runSummaryHistory.length === 0) && stored.summaries.length > 0) {
    game.runSummaryHistory = stored.summaries.slice(-SUMMARY_LIMIT);
  }
  game.runSummaryHistory = Array.isArray(game.runSummaryHistory) ? game.runSummaryHistory.slice(-SUMMARY_LIMIT) : [];
  syncTelemetryMirror(game);
}

function initializeTelemetry(game) {
  ensureTelemetryState(game);
}

function startTelemetryRun(game) {
  ensureTelemetryState(game);
  const activeRun = createRunMetrics(game);
  game.telemetry.activeRunId = activeRun.runId;
  game.telemetry.activeRun = activeRun;
  recordTelemetryEvent(game, "run_started", {
    classId: activeRun.classId,
    raceId: activeRun.raceId,
    contractId: activeRun.contractId,
    validationProfile: activeRun.validationProfile,
    validationVariants: activeRun.validationVariants
  });
  return activeRun;
}

function recordTelemetryEvent(game, type, payload = {}) {
  ensureTelemetryState(game);
  const canonicalType = normalizeType(type);
  if (canonicalType === "run_started" && !game.telemetry.activeRun) {
    const activeRun = createRunMetrics(game);
    game.telemetry.activeRunId = activeRun.runId;
    game.telemetry.activeRun = activeRun;
  }
  const event = {
    id: makeId("evt"),
    appVersion: APP_VERSION,
    timestamp: new Date().toISOString(),
    sessionId: game.telemetry.sessionId,
    runId: game.telemetry.activeRunId || null,
    type: canonicalType,
    ...buildEventContext(game),
    payload
  };
  game.telemetry.rawEvents.push(event);
  if (game.telemetry.rawEvents.length > RAW_EVENT_LIMIT) {
    game.telemetry.rawEvents.shift();
  }

  updateRunMetrics(game, game.telemetry.activeRun, canonicalType, payload);

  const store = parseTelemetryStore();
  store.rawEvents.push(event);
  if (store.rawEvents.length > RAW_EVENT_LIMIT) {
    store.rawEvents = store.rawEvents.slice(-RAW_EVENT_LIMIT);
  }
  writeTelemetryStore(store);
  syncTelemetryMirror(game);
  return event;
}

function recordTelemetry(game, type, payload = {}) {
  return recordTelemetryEvent(game, type, payload);
}

function recordTownServiceOpen(game, serviceId) {
  return recordTelemetryEvent(game, "town_service_opened", {
    serviceId
  });
}

function trackFirstPlayerMove(game, x, y) {
  ensureTelemetryState(game);
  if (game.telemetry.activeRun?.firstMoveLogged) {
    return false;
  }
  recordTelemetryEvent(game, "first_move", { x, y });
  return true;
}

function trackObjectiveProgress(game, tile = null) {
  ensureTelemetryState(game);
  const objective = game.currentLevel?.floorObjective;
  if (!objective || objective.status === "resolved") {
    return;
  }
  const playerRoomIndex = typeof game.getPlayerRoomIndex === "function" ? game.getPlayerRoomIndex() : null;
  const roomReached = playerRoomIndex !== null && playerRoomIndex === objective.roomIndex;
  const markerReached = tile?.objectiveId === objective.id;
  if (!roomReached && !markerReached) {
    return;
  }
  const reachKey = `${game.currentDepth}:${objective.id}:${markerReached ? "marker" : `room-${objective.roomIndex}`}`;
  if (game.telemetry.activeRun?.objectiveSeenKeys?.[reachKey]) {
    return;
  }
  if (game.telemetry.activeRun) {
    game.telemetry.activeRun.objectiveSeenKeys[reachKey] = true;
  }
  game.currentLevel.guidance = game.currentLevel.guidance || {};
  game.currentLevel.guidance.objectiveSeen = true;
  game.markOnboarding?.("find_objective");
  const remainingDefenders = (game.currentLevel?.actors || []).filter((monster) => monster.roomIndex === objective.roomIndex && monster.hp > 0).length;
  const source = buildObjectiveReachSource(game, objective, markerReached);
  recordTelemetryEvent(game, "objective_seen", {
    objectiveId: objective.id,
    stage: markerReached ? "marker" : "room"
  });
  recordTelemetryEvent(game, "objective_reached", {
    objectiveId: objective.id,
    source,
    stage: markerReached ? "marker" : "room",
    remainingDefenders,
    searchCount: game.telemetry.activeRun?.searchCount || 0
  });
}

function trackOptionalProgress(game, tile = null) {
  ensureTelemetryState(game);
  const optional = game.currentLevel?.floorOptional;
  if (!optional || optional.opened) {
    return;
  }
  const playerRoomIndex = typeof game.getPlayerRoomIndex === "function" ? game.getPlayerRoomIndex() : null;
  const roomReached = playerRoomIndex !== null && playerRoomIndex === optional.roomIndex;
  const markerReached = tile?.optionalId === optional.id;
  if (!roomReached && !markerReached) {
    return;
  }
  const seenKey = `${game.currentDepth}:${optional.id}:${markerReached ? "marker" : `room-${optional.roomIndex}`}`;
  if (game.telemetry.activeRun?.optionalSeenKeys?.[seenKey]) {
    return;
  }
  if (game.telemetry.activeRun) {
    game.telemetry.activeRun.optionalSeenKeys[seenKey] = true;
  }
  recordTelemetryEvent(game, "optional_seen", {
    optionalId: optional.id,
    stage: markerReached ? "marker" : "room"
  });
}

function getCurrentRunEvents(game) {
  ensureTelemetryState(game);
  return game.telemetry.rawEvents.filter((event) => event.runId === game.telemetry.activeRunId);
}

function buildTelemetrySummary(game) {
  const events = getCurrentRunEvents(game);
  const count = (type) => events.filter((event) => event.type === type).length;
  return {
    runId: game.telemetry?.activeRunId || "",
    eventCount: events.length,
    searches: count("search_used"),
    shopBuys: count("shop_buy"),
    shopSells: count("shop_sell"),
    spellsCast: count("spell_cast"),
    itemsUsed: count("item_used"),
    townReturns: count("returned_to_town"),
    optionalsTaken: count("optional_triggered"),
    saves: count("save_game"),
    loads: count("load_game"),
    deaths: count("run_death"),
    recent: events.slice(-8).reverse().map((event) => ({
      text: describeEvent(event),
      turn: event.turn,
      depth: event.depth,
      type: event.type
    }))
  };
}

function exportTelemetryTrace(game) {
  ensureTelemetryState(game);
  if (typeof document === "undefined" || typeof window === "undefined" || typeof Blob === "undefined") {
    return false;
  }
  const store = parseTelemetryStore();
  const currentRunEvents = store.rawEvents.filter((event) => event.runId === game.telemetry.activeRunId);
  const payload = {
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    sessionId: game.telemetry.sessionId,
    runId: game.telemetry.activeRunId,
    activeRun: game.telemetry.activeRun,
    summary: buildTelemetrySummary(game),
    currentRunEvents,
    allEventsCount: store.rawEvents.length,
    summaries: game.runSummaryHistory.slice(-5)
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = `castle-of-the-winds-run-trace-${game.telemetry.activeRunId || "run"}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 0);
  return true;
}

function buildRunSummary(game, outcome = "extract", extra = {}) {
  ensureTelemetryState(game);
  const activeRun = game.telemetry.activeRun || createRunMetrics(game);
  return {
    id: makeId("summary"),
    runId: activeRun.runId,
    outcome,
    createdAt: new Date().toISOString(),
    heroName: game.player?.name || activeRun.heroName,
    classId: activeRun.classId,
    className: activeRun.className,
    raceId: activeRun.raceId,
    raceName: activeRun.raceName,
    contractId: activeRun.contractId || game.contracts?.currentRunId || "",
    turns: game.turn || 0,
    deepestDepth: Math.max(activeRun.deepestDepth || 0, game.player?.deepestDepth || 0, extra.deepestDepth || 0),
    extractedDepth: extra.extractedDepth ?? game.currentDepth ?? 0,
    firstObjectiveType: activeRun.firstObjectiveType,
    firstObjectiveSeenTurn: activeRun.firstObjectiveSeenTurn,
    firstObjectiveClearTurn: activeRun.firstObjectiveClearTurn,
    firstObjectiveReachSource: activeRun.firstObjectiveReachSource || "",
    firstSearchBeforeObjectiveTurn: activeRun.firstSearchBeforeObjectiveTurn,
    firstObjectiveSearchCount: activeRun.firstObjectiveSearchCount || activeRun.searchCount || 0,
    searchCount: activeRun.searchCount || 0,
    waitCount: activeRun.waitCount || 0,
    restCount: activeRun.restCount || 0,
    eliteKills: activeRun.eliteKills || 0,
    modalOpenCounts: {
      pack: activeRun.modalOpenCounts?.pack || 0,
      magic: activeRun.modalOpenCounts?.magic || 0,
      journal: activeRun.modalOpenCounts?.journal || 0,
      town: activeRun.modalOpenCounts?.town || 0
    },
    greedCount: activeRun.greedCount || 0,
    greedLabels: [...(activeRun.greedLabels || [])],
    returnValue: Math.floor(game.player?.gold || 0) + Math.floor(game.player?.bankGold || 0),
    cause: extra.cause || "",
    carriedCurse: Boolean(extra.carriedCurse),
    townServicesOpened: [...(activeRun.townServicesOpened || [])],
    persistentChanges: Array.isArray(extra.persistentChanges) ? [...extra.persistentChanges] : [],
    masteryAdvance: extra.masteryAdvance || null,
    unlockedContracts: Array.isArray(extra.unlockedContracts) ? [...extra.unlockedContracts] : []
  };
}

function recordRunSummary(game, outcome = "extract", extra = {}) {
  ensureTelemetryState(game);
  const summary = buildRunSummary(game, outcome, extra);
  game.runSummaryHistory.push(summary);
  if (game.runSummaryHistory.length > SUMMARY_LIMIT) {
    game.runSummaryHistory = game.runSummaryHistory.slice(-SUMMARY_LIMIT);
  }
  touchStoreSummaries(game);
  if (outcome === "death" || outcome === "victory") {
    game.telemetry.activeRun = null;
    game.telemetry.activeRunId = null;
  }
  syncTelemetryMirror(game);
  return summary;
}

function getTelemetryReviewSnapshot(game) {
  ensureTelemetryState(game);
  return buildReviewSnapshotFromState(game);
}

function resetTelemetry(game) {
  ensureTelemetryState(game);
  game.telemetry.activeRunId = null;
  game.telemetry.activeRun = null;
  syncTelemetryMirror(game);
}

// src/features/validation.js
const DEFAULT_VALIDATION_VARIANTS = {
  onboarding: "guided_loop",
  hud: "dominant_cta",
  route: "guided_plus",
  town: "bank_first",
  contract: "recommended",
  content: "shrine_path"
};

const ALLOWED_VARIANTS = {
  onboarding: ["baseline", "guided_loop", "short_loop"],
  hud: ["baseline", "dominant_cta"],
  route: ["baseline", "guided_plus"],
  town: ["baseline", "bank_first"],
  contract: ["baseline", "recommended"],
  content: ["baseline", "shrine_path"]
};

function resolveVariant(key, rawValue) {
  const allowed = ALLOWED_VARIANTS[key] || [];
  return allowed.includes(rawValue) ? rawValue : DEFAULT_VALIDATION_VARIANTS[key];
}

function readSearchVariant(params, key) {
  return params.get(`cotw_${key}`)
    || params.get(`cotw${key[0].toUpperCase()}${key.slice(1)}`)
    || params.get(key)
    || "";
}

function initializeValidationState(game) {
  const params = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search || "")
    : new URLSearchParams("");
  const variants = { ...DEFAULT_VALIDATION_VARIANTS };

  Object.keys(variants).forEach((key) => {
    variants[key] = resolveVariant(key, readSearchVariant(params, key));
  });

  game.validation = {
    variants,
    signature: Object.entries(variants).map(([key, value]) => `${key}:${value}`).join("|"),
    source: typeof window !== "undefined" && window.location?.search ? "query" : "default"
  };
}

function getValidationVariant(game, key) {
  return game?.validation?.variants?.[key] || DEFAULT_VALIDATION_VARIANTS[key];
}

function getValidationSummary(game) {
  const variants = {
    ...DEFAULT_VALIDATION_VARIANTS,
    ...(game?.validation?.variants || {})
  };
  return {
    variants,
    signature: Object.entries(variants).map(([key, value]) => `${key}:${value}`).join("|")
  };
}

function getOnboardingVariantMeta(game) {
  const variant = getValidationVariant(game, "onboarding");
  if (variant === "baseline") {
    return {
      checklistLabel: "First Run Loop",
      steps: {
        visit_town_door: "Check Town",
        enter_keep: "Enter Keep",
        find_objective: "Find Objective",
        clear_objective: "Clear Objective",
        choose_extract_or_greed: "Choose Exit Or Greed"
      },
      firstTownPrimary: "Step onto one labeled town door once.",
      firstTownSupport: "Then take the north road into the keep.",
      enterKeepPrimary: "Take the north road and enter the keep.",
      enterKeepSupport: "Ignore extra town prep for now. The first descent is next.",
      briefingTownUnchecked: "Step onto one labeled town door, then follow the north road into the keep.",
      briefingTownChecked: "Town checked. Follow the north road when ready.",
      objectiveSearchHint: "Search once to extend the marked route.",
      townDoorPrompt: "Step onto any labeled town door once. Then take the north road."
    };
  }
  if (variant === "short_loop") {
    return {
      checklistLabel: "Run Loop",
      steps: {
        visit_town_door: "Touch Door",
        enter_keep: "Take Stairs",
        find_objective: "Follow Route",
        clear_objective: "Finish Room",
        choose_extract_or_greed: "Bank Or Greed"
      },
      firstTownPrimary: "Touch one town door, then go north.",
      firstTownSupport: "Do not over-prep. The keep is the next lesson.",
      enterKeepPrimary: "Take the keep stairs now.",
      enterKeepSupport: "Orange route first. Objective clear first. Town later.",
      briefingTownUnchecked: "Touch one town door, then go north to the keep stairs.",
      briefingTownChecked: "Town checked. Take the keep stairs next.",
      objectiveSearchHint: "If the orange line stops, Search once.",
      townDoorPrompt: "Touch one labeled town door. Then go north."
    };
  }
  return {
    checklistLabel: "First Run Route",
    steps: {
      visit_town_door: "Open Town Support",
      enter_keep: "Take Keep Stairs",
      find_objective: "Follow Orange Route",
      clear_objective: "Finish The Room",
      choose_extract_or_greed: "Bank Or Greed"
    },
    firstTownPrimary: "Open one town door to see what town can do.",
    firstTownSupport: "Then follow the north road straight into the keep.",
    enterKeepPrimary: "Town checked. Walk north and take the keep stairs.",
    enterKeepSupport: "The first lesson is objective clear, not extra shopping.",
    briefingTownUnchecked: "Open one labeled town door, then stay on the north road into the keep.",
    briefingTownChecked: "Town checked. Stay on the north road and take the keep stairs.",
    objectiveSearchHint: "If the orange route runs out, Search once to extend it.",
    townDoorPrompt: "Open any labeled town door once. Then return to the north road."
  };
}

function getRouteExperimentTuning(game, depth = 0) {
  const variant = getValidationVariant(game, "route");
  if (variant !== "guided_plus" || depth !== 1) {
    return {
      entryRevealBonus: 0,
      searchRevealBonus: 0
    };
  }
  return {
    entryRevealBonus: 3,
    searchRevealBonus: 4
  };
}

// src/features/onboarding.js

function getFunnelSteps(game) {
  const meta = getOnboardingVariantMeta(game);
  return [
    { id: "visit_town_door", label: meta.steps.visit_town_door, summary: "Step onto one labeled town door before the first descent." },
    { id: "enter_keep", label: meta.steps.enter_keep, summary: "Walk north on the town road and descend." },
    { id: "find_objective", label: meta.steps.find_objective, summary: "Use the marked route and survey to reach the floor objective." },
    { id: "clear_objective", label: meta.steps.clear_objective, summary: "Resolve the marked room to unlock the next decision." },
    { id: "choose_extract_or_greed", label: meta.steps.choose_extract_or_greed, summary: "Leave clean or stay for one more prize." }
  ];
}

function getFlagKey(stepId) {
  return `onboarding_${stepId}`;
}

function hasOnboardingFlag(game, stepId) {
  return Boolean(game.storyFlags?.[getFlagKey(stepId)]);
}

function markOnboardingFlag(game, stepId) {
  if (!game?.storyFlags || !stepId) {
    return false;
  }
  const key = getFlagKey(stepId);
  if (game.storyFlags[key]) {
    return false;
  }
  game.storyFlags[key] = true;
  return true;
}

function shouldShowOnboardingChecklist(game) {
  if (!game?.player || !game.storyFlags) {
    return false;
  }
  return !hasOnboardingFlag(game, "clear_objective");
}

function getOnboardingSteps(game) {
  const steps = getFunnelSteps(game);
  return steps.map((step, index) => {
    const done = hasOnboardingFlag(game, step.id);
    const previousComplete = index === 0 || hasOnboardingFlag(game, steps[index - 1].id);
    return {
      ...step,
      done,
      active: !done && previousComplete
    };
  });
}

function renderOnboardingChecklist(game) {
  if (!shouldShowOnboardingChecklist(game)) {
    return "";
  }
  const meta = getOnboardingVariantMeta(game);
  const steps = getOnboardingSteps(game);
  const directive = typeof game.getLoopDirective === "function" ? game.getLoopDirective() : null;
  const activeSummary = directive?.primaryText || directive?.supportText || "";
  return `
    <div class="onboarding-checklist">
      <div class="onboarding-checklist-label">${escapeHtml(meta.checklistLabel)}</div>
      <div class="onboarding-step-row">
        ${steps.map((step) => `
          <span class="onboarding-step${step.done ? " done" : step.active ? " active" : ""}">${escapeHtml(step.label)}</span>
        `).join("")}
      </div>
      ${activeSummary ? `<div class="field-brief-support">${escapeHtml(activeSummary)}</div>` : ""}
    </div>
  `;
}

// src/features/hud-feed.js

const ACTION_LABELS = {
  bank: "Bank",
  interact: "Interact",
  move: "Move",
  search: "Search",
  stairs_down: "Descend",
  stairs_up: "Ascend",
  "stairs-up": "Ascend",
  "stairs-down": "Descend",
  town_service: "Town Door",
  town_rumor: "Buy Intel"
};
function scoreEntry(entry, currentTurn) {
  const message = entry?.message || "";
  const age = Math.max(0, currentTurn - (entry?.turn || 0));
  let score = Math.max(0, 12 - age);
  if (entry?.tone === "bad") {
    score += 24;
  } else if (entry?.tone === "warning") {
    score += 14;
  } else if (entry?.tone === "good") {
    score += 8;
  }
  if (/objective complete|stairs up are live|stairs down remain sealed|clear the room first|free the captive|burn the nest|seal the shrine/i.test(message)) {
    score += 32;
  }
  if (/reinforcement|pressure|leave now|arrives .* sooner|raised pressure/i.test(message)) {
    score += 28;
  }
  if (/charge|summon|ranged|closing|hold the room/i.test(message)) {
    score += 20;
  }
  return score;
}

function getStickyEvent(game) {
  if (typeof game.getStickyFeedEvent === "function") {
    const sticky = game.getStickyFeedEvent();
    if (sticky) {
      return sticky;
    }
  }
  const currentTurn = game.turn || 0;
  const best = [...(game.messages || [])]
    .slice(-10)
    .map((entry) => ({ entry, score: scoreEntry(entry, currentTurn) }))
    .sort((left, right) => right.score - left.score || right.entry.turn - left.entry.turn)[0]?.entry;
  if (!best) {
    return null;
  }
  return {
    turnLabel: `T${best.turn}`,
    tone: best.tone || "ticker-context",
    text: best.message
  };
}

function getObjectiveLine(game) {
  if (!game.player || !game.currentLevel) {
    return {
      turnLabel: "Goal",
      tone: "ticker-context",
      text: "Create a character to begin."
    };
  }
  const directive = typeof game.getLoopDirective === "function" ? game.getLoopDirective() : null;
  const dominantHud = getValidationVariant(game, "hud") === "dominant_cta";
  const recommendedAction = ACTION_LABELS[directive?.recommendedActionId || ""] || "";
  return {
    turnLabel: dominantHud ? "Next" : (directive?.phase ? (typeof game.getLoopDirectiveLabel === "function" ? game.getLoopDirectiveLabel(directive.phase) : "Loop") : "Goal"),
    tone: "ticker-context",
    text: dominantHud && recommendedAction
      ? `${recommendedAction}: ${directive?.primaryText || "Follow the current directive."}`
      : directive?.primaryText || "Follow the current directive."
  };
}

function getPressureLine(game) {
  if (!game.player || !game.currentLevel) {
    return null;
  }
  if (game.currentDepth === 0) {
    return {
      turnLabel: "Town",
      tone: "ticker-context",
      text: game.getTownReturnStingText?.() || "Town is quiet."
    };
  }
  const recentPressure = [...(game.messages || [])]
    .slice(-8)
    .reverse()
    .find((entry) => /pressure|reinforcement|arrives .* sooner|stairs up are live|remain sealed/i.test(entry.message));
  if (recentPressure) {
    return {
      turnLabel: `T${recentPressure.turn}`,
      tone: recentPressure.tone ? `ticker-${recentPressure.tone}` : "ticker-context",
      text: recentPressure.message
    };
  }
  const pressure = game.getPressureUiState();
  return {
    turnLabel: "Pressure",
    tone: pressure.tone === "bad" ? "ticker-bad" : pressure.tone === "warning" ? "ticker-warning" : "ticker-context",
    text: pressure.summary
  };
}

function getThreatLine(game) {
  if (!game.player || !game.currentLevel) {
    return null;
  }
  const combatLine = game.getCombatFeedLines ? game.getCombatFeedLines(3)[0] : "";
  if (combatLine) {
    return {
      turnLabel: "Threat",
      tone: "ticker-context",
      text: combatLine
    };
  }
  const tileAction = game.getTileActionPrompt ? game.getTileActionPrompt() : null;
  if (tileAction) {
    return {
      turnLabel: tileAction.label,
      tone: tileAction.tone === "good" ? "ticker-good" : tileAction.tone === "bad" ? "ticker-bad" : "ticker-context",
      text: tileAction.detail
    };
  }
  const directive = typeof game.getLoopDirective === "function" ? game.getLoopDirective() : null;
  const fallback = directive?.supportText || directive?.dangerText || (game.currentDepth === 0 ? game.getTownReturnStingText?.() || "" : game.getImmediateDangerNote?.() || "");
  if (!fallback) {
    return null;
  }
  return {
    turnLabel: "Now",
    tone: "ticker-context",
    text: fallback
  };
}

function buildDrawerMarkup(game) {
  const entries = (game.messages || []).slice(-12).reverse();
  if (entries.length === 0) {
    return "<div class='event-feed-drawer-empty'>No recent messages.</div>";
  }
  return entries.map((entry) => `
    <div class="event-feed-drawer-line ${entry.tone ? `ticker-${entry.tone}` : ""}">
      <span class="event-feed-drawer-turn">T${entry.turn}</span>
      <span class="event-feed-drawer-text">${escapeHtml(entry.message)}</span>
    </div>
  `).join("");
}

function buildHudFeedModel(game) {
  const stickyEvent = getStickyEvent(game);
  const dedupe = new Set();
  const lines = [getObjectiveLine(game), getPressureLine(game), getThreatLine(game)]
    .filter(Boolean)
    .filter((line) => {
      const key = `${line.turnLabel}:${line.text}`;
      if (dedupe.has(key)) {
        return false;
      }
      dedupe.add(key);
      return true;
    })
    .slice(0, 3);
  return {
    stickyEvent,
    lines,
    historyAvailable: Boolean((game.messages || []).length > 0)
  };
}

function renderHudFeed(game) {
  const model = typeof game.getLiveFeedModel === "function" ? game.getLiveFeedModel() : buildHudFeedModel(game);
  const stickyMarkup = model.stickyEvent
    ? `
      <div class="event-feed-sticky ${model.stickyEvent.tone || "ticker-context"}">
        <span class="event-feed-sticky-turn">${escapeHtml(model.stickyEvent.turnLabel || "Now")}</span>
        <span class="event-feed-sticky-text">${escapeHtml(model.stickyEvent.text || "")}</span>
      </div>
    `
    : "";
  const linesMarkup = (model.lines || []).map((line) => `
    <div class="event-ticker-line ${line.tone || ""}">
      <span class="event-ticker-turn">${escapeHtml(line.turnLabel)}</span>
      <span class="event-ticker-text">${escapeHtml(line.text)}</span>
    </div>
  `).join("");
  return `
    <button class="event-feed-toggle" data-action="toggle-feed-log" data-focus-key="feed:toggle" type="button" aria-expanded="${game.feedDrawerOpen ? "true" : "false"}">
      <span class="event-feed-toggle-label">Live Feed</span>
      <span class="event-feed-toggle-note">${game.feedDrawerOpen ? "Hide recent log" : "Show recent log"}</span>
    </button>
    ${stickyMarkup}
    <div class="event-feed-lines">${linesMarkup}</div>
    <div class="event-feed-drawer${game.feedDrawerOpen ? "" : " hidden"}">
      ${buildDrawerMarkup(game)}
    </div>
  `;
}

// src/features/inventory-ui.js

const GROUP_DEFS = [
  { key: "recommended", label: "Recommended Now" },
  { key: "upgrades", label: "Upgrades" },
  { key: "emergency", label: "Emergency" },
  { key: "risky", label: "Unknown / Risky" },
  { key: "sell", label: "Sell / Stash" },
  { key: "quest", label: "Quest / Keep" }
];

const SHOP_LABELS = {
  armory: "Armory",
  guild: "Guild",
  general: "General",
  junk: "Junk"
};

const FILTER_DEFS = [
  { key: "all", label: "All" },
  { key: "use", label: "Use" },
  { key: "equip", label: "Equip" },
  { key: "sell", label: "Sell" }
];

const SPELL_CATEGORY_DEFS = [
  { key: "offense", label: "Offense" },
  { key: "defense", label: "Defense" },
  { key: "recovery", label: "Recovery" },
  { key: "control", label: "Control" },
  { key: "travel", label: "Travel" },
  { key: "sight", label: "Sight" },
  { key: "identify", label: "Identify" },
  { key: "curse", label: "Curse" },
  { key: "utility", label: "Utility" }
];

const INVENTORY_CATEGORY_DEFS = [
  { key: "weapons", label: "Weapons" },
  { key: "armor", label: "Armor" },
  { key: "accessories", label: "Accessories" },
  { key: "consumables", label: "Consumables" },
  { key: "spellbooks", label: "Spellbooks" },
  { key: "wands", label: "Wands & Tools" },
  { key: "valuables", label: "Valuables" },
  { key: "quest", label: "Quest" }
];

const EFFECT_ALIASES = {
  clairvoyance: "mapping"
};

function getSpellEffectKey(spellId = "") {
  if (!spellId) {
    return "";
  }
  return EFFECT_ALIASES[spellId] || spellId;
}

function getSpellCategoryDefs() {
  return SPELL_CATEGORY_DEFS;
}

function getInventoryCategoryDefs() {
  return INVENTORY_CATEGORY_DEFS;
}

function getSpellCategoryKey(spellOrId) {
  const spell = typeof spellOrId === "string" ? SPELLS[spellOrId] : spellOrId;
  const spellId = typeof spellOrId === "string" ? spellOrId : spellOrId?.id;
  if (!spell) {
    return "utility";
  }
  if (spellId === "identify") {
    return "identify";
  }
  if (spellId === "removeCurse") {
    return "curse";
  }
  if (["phaseDoor", "teleport", "runeOfReturn"].includes(spellId) || spell.school === "escape") {
    return "travel";
  }
  if (["clairvoyance", "light", "detectTraps"].includes(spellId) || spell.school === "divination") {
    return "sight";
  }
  if (spell.school === "restoration") {
    return "recovery";
  }
  if (spell.school === "warding") {
    return "defense";
  }
  if (spell.school === "control" || ["frostBolt", "slowMonster", "holdMonster"].includes(spellId)) {
    return "control";
  }
  if (
    ["magicMissile", "fireball", "lightningBolt"].includes(spellId)
    || ["opener", "burst"].includes(String(spell.roleLabel || "").toLowerCase())
  ) {
    return "offense";
  }
  return "utility";
}

function getSpellCategoryLabel(spellOrId) {
  const key = getSpellCategoryKey(spellOrId);
  return SPELL_CATEGORY_DEFS.find((entry) => entry.key === key)?.label || "Utility";
}

function getItemEffectKey(item) {
  if (!item) {
    return "";
  }
  if (item.kind === "spellbook") {
    return getSpellEffectKey(item.spell);
  }
  if (item.effect) {
    return EFFECT_ALIASES[item.effect] || item.effect;
  }
  return "";
}

function getVisibleEnemyCount(game) {
  if (!game.player || !game.currentLevel) {
    return 0;
  }
  if (typeof game.getSortedVisibleEnemies === "function") {
    return game.getSortedVisibleEnemies().length;
  }
  if (typeof game.visibleEnemies === "function") {
    return game.visibleEnemies().length;
  }
  return 0;
}

function getShopTags(item) {
  const order = ["armory", "guild", "general", "junk"];
  return order.filter((shopId) => shopAcceptsItem(shopId, item)).map((shopId) => SHOP_LABELS[shopId]);
}

function getShopTagForContext(item, shopId = "") {
  if (!shopId || !shopAcceptsItem(shopId, item)) {
    return null;
  }
  return SHOP_LABELS[shopId] || null;
}

function getInventoryCategoryLabel(categoryKey = "utility") {
  return INVENTORY_CATEGORY_DEFS.find((entry) => entry.key === categoryKey)?.label || "Item";
}

function getSemanticScanTags(item, context = {}) {
  if (!item) {
    return [];
  }
  const {
    unknown = false,
    cursed = false,
    sellHereTag = null,
    groupKey = "",
    recommendation = ""
  } = context;
  const tags = [];
  if (
    item.kind === "weapon"
    || getItemPower(item) > 0
    || getItemAccuracyBonus(item) > 0
    || getItemCritBonus(item) > 0
    || item.effect === "lightning"
  ) {
    tags.push("damage");
  }
  if (getItemArmor(item) >= 3 || getItemGuardBonus(item) > 0 || item.effect === "slow") {
    tags.push("guard");
  }
  if (getItemWardBonus(item) > 0) {
    tags.push("ward");
  }
  if (getItemSearchBonus(item) > 0 || getItemLightBonus(item) > 0) {
    tags.push("search");
  }
  if (
    getItemDexBonus(item) > 0
    || ["teleport", "runeReturn", "mapping"].includes(getItemEffectKey(item))
  ) {
    tags.push("travel");
  }
  if (getItemFireResist(item) > 0 || getItemColdResist(item) > 0) {
    tags.push("resist");
  }
  if (unknown || cursed || recommendation === "Identify first") {
    tags.push("cursed-risk");
  }
  if (sellHereTag || groupKey === "sell" || item.markedForSale) {
    tags.push("sell");
  }
  return [...new Set(tags)];
}

function getInventoryCategoryKey(item, context = {}) {
  if (!item) {
    return "valuables";
  }
  if (item.kind === "quest") {
    return "quest";
  }
  if (item.kind === "spellbook" && item.spell) {
    return "spellbooks";
  }
  if (item.kind === "charged") {
    return "wands";
  }
  if (item.kind === "consumable") {
    return "consumables";
  }
  if (item.kind === "weapon") {
    return "weapons";
  }
  if (item.kind === "armor") {
    if (["ring", "amulet"].includes(item.slot)) {
      return "accessories";
    }
    return "armor";
  }
  if (item.kind === "junk") {
    return "valuables";
  }
  return "valuables";
}

function getBurdenWeightTone(game, item) {
  const state = game.getBurdenUiState();
  const weight = item.weight || 0;
  if (weight >= 7 || (weight >= 5 && state.state !== "safe")) {
    return "Too heavy for current build";
  }
  if (weight >= 5) {
    return "Heavy burden item";
  }
  return "";
}

function getBuildSummary(game) {
  const weapon = game.player?.equipment?.weapon || null;
  const armorPieces = Object.values(game.player?.equipment || {}).filter(Boolean);
  const burdenUi = game.getBurdenUiState();
  const armorValue = typeof game.getArmorValue === "function" ? game.getArmorValue() : 0;
  const attackValue = typeof game.getAttackValue === "function" ? game.getAttackValue() : 0;
  const manaLean = armorPieces.reduce((sum, item) => sum + getItemManaBonus(item) + getItemIntBonus(item), 0) + ((game.player?.spellsKnown?.length || 0) * 2);
  const utilityLean = armorPieces.reduce((sum, item) => sum + getItemDexBonus(item) + getItemLightBonus(item) + getItemSearchBonus(item), 0);
  const guardLean = armorPieces.reduce((sum, item) => sum + getItemGuardBonus(item) + getItemWardBonus(item) + getItemConBonus(item), 0);
  const strengthLean = armorPieces.reduce((sum, item) => sum + getItemStrBonus(item), 0);
  let headline = "Balanced kit";
  let note = "Mixed offense, defense, and utility.";

  if (manaLean >= attackValue + 2) {
    headline = "Mana-leaning";
    note = "Built around spells, mana pieces, and tools.";
  } else if (strengthLean >= 2) {
    headline = "Heavy hauler";
    note = "Leans on strength pieces, burden control, and harder swings.";
  } else if (guardLean >= 4) {
    headline = "Layered defense";
    note = "Guard and ward pieces soak hits instead of just stacking armor.";
  } else if (burdenUi.state === "warning" || burdenUi.state === "danger" || burdenUi.state === "overloaded" || armorValue >= attackValue) {
    headline = "Heavy melee";
    note = "Built to trade hits and carry weight.";
  } else if (utilityLean >= 2 || burdenUi.state === "safe") {
    headline = "Light skirmish";
    note = "Plays angles, vision, and cleaner movement.";
  }

  return {
    headline,
    note,
    tags: [
      burdenUi.label,
      weapon ? getItemName(weapon, true) : "No main weapon",
      `${game.player?.spellsKnown?.length || 0} spells`
    ]
  };
}

function getSlotQualityLabel(game, slotDef, compatibleCount = 0) {
  const item = game.player?.equipment?.[slotDef.slot] || null;
  if (!item) {
    return compatibleCount > 0 ? "Empty upgrade slot" : "Open slot";
  }
  if (item.cursed) {
    return "Locked by curse";
  }
  if (slotDef.slot === "weapon") {
    if (getItemCritBonus(item) >= 2 || getItemAccuracyBonus(item) >= 2) {
      return "Precision weapon";
    }
    return getItemManaBonus(item) > 0 ? "Mana weapon" : getItemPower(item) >= 8 ? "Heavy offense" : "Stable weapon";
  }
  if (getItemGuardBonus(item) >= 2 || getItemWardBonus(item) >= 2) {
    return "Protection piece";
  }
  if (getItemManaBonus(item) > 0 || getItemIntBonus(item) > 0) {
    return "Mana piece";
  }
  if (getItemStrBonus(item) > 0) {
    return "Power piece";
  }
  if (getItemConBonus(item) > 0) {
    return "Endurance piece";
  }
  if (getItemDexBonus(item) > 0 || getItemLightBonus(item) > 0 || getItemSearchBonus(item) > 0) {
    return "Utility piece";
  }
  if ((slotDef.slot === "body" || slotDef.slot === "offhand" || slotDef.slot === "head") && getItemArmor(item) >= 3) {
    return "Core defense";
  }
  if ((item.weight || 0) >= 7 && getItemArmor(item) <= 1 && getItemManaBonus(item) <= 0 && getItemDexBonus(item) <= 0 && getItemLightBonus(item) <= 0) {
    return "Dead weight";
  }
  return "Stable slot";
}

function getEquipmentComparisonTarget(game, item) {
  if (!item?.slot) {
    return {
      targetSlot: "",
      equipped: null
    };
  }
  if (typeof game.getEquipmentSlotForItem === "function") {
    const target = game.getEquipmentSlotForItem(item) || {};
    const targetSlot = target.targetSlot || "";
    return {
      targetSlot,
      equipped: targetSlot ? game.player?.equipment?.[targetSlot] || null : null
    };
  }
  return {
    targetSlot: item.slot,
    equipped: game.player?.equipment?.[item.slot] || null
  };
}

function getComparisonDeltas(game, item) {
  if (!item.slot || (item.kind !== "weapon" && item.kind !== "armor")) {
    return null;
  }
  const { targetSlot, equipped } = getEquipmentComparisonTarget(game, item);
  return {
    targetSlot,
    equipped,
    attack: item.kind === "weapon" ? getItemPower(item) - (equipped ? getItemPower(equipped) : 0) : 0,
    armor: item.kind === "armor" ? getItemArmor(item) - (equipped ? getItemArmor(equipped) : 0) : 0,
    accuracy: getItemAccuracyBonus(item) - (equipped ? getItemAccuracyBonus(equipped) : 0),
    crit: getItemCritBonus(item) - (equipped ? getItemCritBonus(equipped) : 0),
    guard: getItemGuardBonus(item) - (equipped ? getItemGuardBonus(equipped) : 0),
    ward: getItemWardBonus(item) - (equipped ? getItemWardBonus(equipped) : 0),
    mana: getItemManaBonus(item) - (equipped ? getItemManaBonus(equipped) : 0),
    str: getItemStrBonus(item) - (equipped ? getItemStrBonus(equipped) : 0),
    dex: getItemDexBonus(item) - (equipped ? getItemDexBonus(equipped) : 0),
    con: getItemConBonus(item) - (equipped ? getItemConBonus(equipped) : 0),
    int: getItemIntBonus(item) - (equipped ? getItemIntBonus(equipped) : 0),
    sight: getItemLightBonus(item) - (equipped ? getItemLightBonus(equipped) : 0),
    search: getItemSearchBonus(item) - (equipped ? getItemSearchBonus(equipped) : 0),
    fireResist: getItemFireResist(item) - (equipped ? getItemFireResist(equipped) : 0),
    coldResist: getItemColdResist(item) - (equipped ? getItemColdResist(equipped) : 0)
  };
}

function getUpgradeSummary(game, item) {
  const deltas = getComparisonDeltas(game, item);
  if (!deltas) {
    return {
      isUpgrade: false,
      score: 0,
      reason: "",
      fillsGap: false
    };
  }

  const slotLabel = game.getPackSlotDefinition(deltas.targetSlot || item.slot).label.toLowerCase();
  if (!deltas.equipped) {
    return {
      isUpgrade: true,
      score: 4,
      reason: `Fills empty ${slotLabel} slot`,
      fillsGap: true
    };
  }

  const score = (deltas.attack * 3)
    + (deltas.armor * 2)
    + (deltas.accuracy * 2)
    + (deltas.crit * 2)
    + (deltas.guard * 2)
    + (deltas.ward * 2)
    + deltas.mana
    + (deltas.str * 2)
    + deltas.dex
    + (deltas.con * 2)
    + (deltas.int * 2)
    + deltas.sight
    + deltas.search
    + deltas.fireResist
    + deltas.coldResist;
  if (deltas.attack > 0) {
    return { isUpgrade: true, score, reason: `Upgrades weapon by +${deltas.attack}`, fillsGap: false };
  }
  if (deltas.accuracy > 0 || deltas.crit > 0) {
    const part = deltas.accuracy > 0 ? `+${deltas.accuracy} accuracy` : `+${deltas.crit} crit`;
    return { isUpgrade: true, score, reason: `Sharpens offense with ${part}`, fillsGap: false };
  }
  if (deltas.armor > 0) {
    return { isUpgrade: true, score, reason: `Upgrades ${slotLabel} armor by +${deltas.armor}`, fillsGap: false };
  }
  if (deltas.guard > 0 || deltas.ward > 0) {
    const part = deltas.guard > 0 ? `+${deltas.guard} guard` : `+${deltas.ward} ward`;
    return { isUpgrade: true, score, reason: `Adds ${part} to your defenses`, fillsGap: false };
  }
  if (deltas.mana > 0) {
    return { isUpgrade: true, score, reason: `Adds +${deltas.mana} mana to your build`, fillsGap: false };
  }
  if (deltas.str > 0) {
    return { isUpgrade: true, score, reason: `Adds +${deltas.str} strength`, fillsGap: false };
  }
  if (deltas.dex > 0) {
    return { isUpgrade: true, score, reason: `Adds +${deltas.dex} dexterity`, fillsGap: false };
  }
  if (deltas.con > 0) {
    return { isUpgrade: true, score, reason: `Adds +${deltas.con} constitution`, fillsGap: false };
  }
  if (deltas.int > 0) {
    return { isUpgrade: true, score, reason: `Adds +${deltas.int} intelligence`, fillsGap: false };
  }
  if (deltas.sight > 0) {
    return { isUpgrade: true, score, reason: `Improves sight by +${deltas.sight}`, fillsGap: false };
  }
  if (deltas.search > 0) {
    return { isUpgrade: true, score, reason: `Improves search by +${deltas.search}`, fillsGap: false };
  }
  if (deltas.fireResist > 0 || deltas.coldResist > 0) {
    return { isUpgrade: true, score, reason: "Adds elemental protection", fillsGap: false };
  }
  return {
    isUpgrade: false,
    score,
    reason: score < 0 ? "Sidegrade at best" : "No clear upgrade",
    fillsGap: false
  };
}

function buildInventoryItemSemantics(game, item, index, options = {}) {
  const { shopId = "" } = options;
  const hpRatio = game.player.maxHp > 0 ? game.player.hp / game.player.maxHp : 1;
  const manaRatio = game.player.maxMana > 0 ? game.player.mana / game.player.maxMana : 1;
  const visibleEnemies = getVisibleEnemyCount(game);
  const burdenUi = game.getBurdenUiState();
  const unknown = canIdentify(item) && !item.identified;
  const cursed = Boolean(item.cursed);
  const shopTags = getShopTags(item);
  const sellHereTag = getShopTagForContext(item, shopId);
  const upgrade = getUpgradeSummary(game, item);
  const heavyLabel = getBurdenWeightTone(game, item);
  const hasCursedEquipped = Object.values(game.player.equipment || {}).some((equippedItem) => equippedItem && equippedItem.cursed);
  const itemEffectKey = getItemEffectKey(item);
  const knownEffectKeys = (game.player?.spellsKnown || []).map((spellId) => getSpellEffectKey(spellId));
  const isDuplicateSpellbook = item.kind === "spellbook" && game.player.spellsKnown.includes(item.spell);
  const isKnownEffect = Boolean(itemEffectKey && knownEffectKeys.includes(itemEffectKey));
  const isEmptyCharged = item.kind === "charged" && (item.charges || 0) <= 0;
  const inDanger = visibleEnemies > 0 || hpRatio < 0.45 || (game.currentDepth > 0 && burdenUi.state !== "safe");
  const buildIdentity = item.affixId
    ? getItemBonusVsUndead(item) > 0
      ? "Anti-undead gear"
      : getItemOvercastRelief(item) > 0
        ? "Overcast gear"
        : getItemGuardBonus(item) + getItemWardBonus(item) >= 2
          ? "Tank gear"
          : getItemCritBonus(item) + getItemAccuracyBonus(item) >= 2
            ? "Precision gear"
            : getItemSearchBonus(item) + getItemDexBonus(item) + getItemLightBonus(item) >= 2
              ? "Scout gear"
              : "Named gear"
    : "";
  let recommendation = "Keep";
  let reason = "Low-priority carry";
  let groupKey = "sell";
  let sortScore = 0;
  let risk = "";

  if (item.kind === "quest") {
    recommendation = "Keep";
    reason = "Required to finish the run";
    groupKey = "quest";
    sortScore = 100;
  } else if (item.kind === "consumable" && item.effect === "heal" && hpRatio < 0.55) {
    recommendation = "Use";
    reason = "Best heal you can use now";
    groupKey = "recommended";
    sortScore = 95;
  } else if (item.kind === "consumable" && item.effect === "mana" && manaRatio < 0.45 && game.player.spellsKnown.length > 0) {
    recommendation = "Use";
    reason = "Restores mana for your next cast";
    groupKey = "recommended";
    sortScore = 92;
  } else if (item.kind === "consumable" && item.effect === "removeCurse" && hasCursedEquipped) {
    recommendation = "Use";
    reason = "Breaks your locked curse";
    groupKey = "recommended";
    sortScore = 90;
  } else if (item.kind === "consumable" && (item.effect === "teleport" || item.effect === "runeReturn") && inDanger) {
    recommendation = "Use";
    reason = "Clean escape if the floor turns";
    groupKey = "recommended";
    sortScore = 88;
  } else if (item.kind === "charged" && !isEmptyCharged && inDanger) {
    recommendation = "Use";
    reason = item.effect === "staffHeal" ? "Live recovery tool with charges" : "Ready control tool for this fight";
    groupKey = "recommended";
    sortScore = 86;
  } else if (item.affixId && !unknown && (item.kind === "weapon" || item.kind === "armor")) {
    recommendation = "Keep";
    reason = buildIdentity || "Named build-around gear";
    groupKey = upgrade.isUpgrade ? "upgrades" : "recommended";
    sortScore = 82 + Math.max(0, upgrade.score);
  } else if ((item.kind === "weapon" || item.kind === "armor") && upgrade.isUpgrade && !unknown) {
    recommendation = "Equip";
    reason = upgrade.reason;
    groupKey = "upgrades";
    sortScore = 80 + upgrade.score;
  } else if ((item.kind === "weapon" || item.kind === "armor") && upgrade.fillsGap) {
    recommendation = "Equip";
    reason = upgrade.reason;
    groupKey = "upgrades";
    sortScore = 79;
    if (unknown) {
      risk = "Unknown quality";
    }
  } else if (item.kind === "consumable" && ["heal", "mana", "teleport", "removeCurse", "runeReturn"].includes(item.effect)) {
    recommendation = "Keep";
    reason = item.effect === "heal"
      ? "Emergency sustain"
      : item.effect === "mana"
        ? "Emergency mana reserve"
        : item.effect === "removeCurse"
          ? "Breaks curses when needed"
          : "Emergency escape tool";
    groupKey = "emergency";
    sortScore = 70;
  } else if (item.kind === "charged" && !isEmptyCharged) {
    recommendation = "Keep";
    reason = `Reserve tool with ${item.charges}/${item.maxCharges || item.charges} charges`;
    groupKey = "emergency";
    sortScore = 68;
  } else if (unknown && !upgrade.fillsGap) {
    recommendation = "Identify first";
    reason = `Unknown ${classifyItem(item).toLowerCase()}, possible curse risk`;
    groupKey = "risky";
    sortScore = 76;
    risk = "Identify first";
  } else if (cursed) {
    recommendation = "Remove curse first";
    reason = item.kind === "weapon" || item.kind === "armor" ? "Cursed gear with equip risk" : "Cursed item, handle carefully";
    groupKey = "risky";
    sortScore = 74;
    risk = "Cursed";
  } else if (heavyLabel) {
    recommendation = "Keep";
    reason = heavyLabel;
    groupKey = "risky";
    sortScore = 66;
    risk = heavyLabel;
  } else if (isDuplicateSpellbook) {
    recommendation = "Sell later";
    reason = "Already learned";
    groupKey = "sell";
    sortScore = 60;
  } else if (isEmptyCharged) {
    recommendation = "Sell later";
    reason = "Empty wand, safe to sell";
    groupKey = "sell";
    sortScore = 59;
  } else if (item.kind === "junk") {
    recommendation = "Sell later";
    reason = shopTags.length > 0 ? `Good ${shopTags[0].toLowerCase()} sale item` : "Low-priority junk";
    groupKey = "sell";
    sortScore = 58;
  } else if (item.kind === "spellbook") {
    recommendation = "Keep";
    reason = isKnownEffect ? "Already covered by a known spell" : "Teaches an unknown spell";
    groupKey = "recommended";
    sortScore = 72;
  } else if ((item.kind === "weapon" || item.kind === "armor") && shopTags.length > 0) {
    recommendation = "Sell later";
    reason = upgrade.score < 0 ? `Good ${shopTags[0].toLowerCase()} sale item` : "Keep for later evaluation";
    groupKey = upgrade.score < 0 ? "sell" : "risky";
    sortScore = upgrade.score < 0 ? 57 : 62;
  } else {
    recommendation = "Keep";
    reason = shopTags.length > 0 ? `Good ${shopTags[0].toLowerCase()} sale item` : "Low-priority carry";
    groupKey = shopTags.length > 0 ? "sell" : "emergency";
    sortScore = 50;
  }

  const categoryKey = getInventoryCategoryKey(item, {
    unknown,
    cursed,
    groupKey,
    isDuplicateSpellbook,
    heavyLabel,
    upgrade
  });
  const categoryLabel = getInventoryCategoryLabel(categoryKey);
  const scanTags = getSemanticScanTags(item, {
    unknown,
    cursed,
    sellHereTag,
    groupKey,
    recommendation
  });

  return {
    index,
    item,
    recommendation,
    reason,
    groupKey,
    sortScore,
    risk,
    upgrade,
    unknown,
    cursed,
    shopTags,
    sellHereTag,
    heavyLabel,
    kindLabel: classifyItem(item),
    effectKey: itemEffectKey,
    isKnownEffect,
    categoryKey,
    categoryLabel,
    scanTags
  };
}

function stackGroupEntries(entries, selectedIndex) {
  const stacks = new Map();
  entries.forEach((entry) => {
    const shouldStack = entry.item.kind === "consumable";
    const stackKey = shouldStack
      ? `${entry.groupKey}:${entry.categoryKey}:${entry.item.id}:${entry.reason}:${entry.recommendation}`
      : `single:${entry.index}`;
    if (!stacks.has(stackKey)) {
      stacks.set(stackKey, {
        ...entry,
        indexes: [entry.index],
        count: 1,
        isSelected: entry.index === selectedIndex
      });
      return;
    }
    const stack = stacks.get(stackKey);
    stack.indexes.push(entry.index);
    stack.count += 1;
    stack.isSelected = stack.isSelected || entry.index === selectedIndex;
  });

  return [...stacks.values()].sort((a, b) => b.sortScore - a.sortScore || a.index - b.index);
}

function matchesFilter(entry, filter, shopId = "", inTown = false) {
  switch (filter) {
    case "use":
      return !["weapon", "armor"].includes(entry.item.kind);
    case "equip":
      return entry.item.kind === "weapon" || entry.item.kind === "armor";
    case "sell":
      if (shopId) {
        return Boolean(entry.sellHereTag);
      }
      return Boolean(entry.item.markedForSale);
    default:
      return true;
  }
}

function buildInventoryPresentationModel(game, options = {}) {
  const { filter = "all", selectedIndex = -1, shopId = "" } = options;
  const inTown = game.currentDepth === 0;
  const entries = game.player.inventory.map((item, index) => buildInventoryItemSemantics(game, item, index, { shopId }));
  const visibleEntries = entries.filter((entry) => matchesFilter(entry, filter, shopId, inTown));
  const groups = GROUP_DEFS.map((group) => {
    const groupedEntries = entries
      .filter((entry) => entry.groupKey === group.key)
      .filter((entry) => matchesFilter(entry, filter, shopId, inTown));
    const items = stackGroupEntries(groupedEntries, selectedIndex);
    return {
      ...group,
      items,
      sections: INVENTORY_CATEGORY_DEFS.map((category) => ({
        ...category,
        items: items.filter((entry) => entry.categoryKey === category.key)
      })).filter((section) => section.items.length > 0)
    };
  }).filter((group) => group.items.length > 0);
  const sortedVisibleEntries = groups.flatMap((group) => group.items);

  const filterDefs = FILTER_DEFS.filter((filterDef) => filterDef.key !== "sell" || inTown || shopId).map((filterDef) => ({
    ...filterDef,
    label: filterDef.key === "sell" ? (shopId ? "Sell Here" : "Sell") : filterDef.label
  }));

  return {
    entries,
    groups,
    filterDefs,
    burdenUi: game.getBurdenUiState(),
    buildSummary: getBuildSummary(game),
    selectedEntry: entries.find((entry) => entry.index === selectedIndex) || null,
    selectedVisible: visibleEntries.some((entry) => entry.index === selectedIndex),
    firstVisibleIndex: sortedVisibleEntries.length > 0 ? sortedVisibleEntries[0].index : -1,
    visibleCount: visibleEntries.length
  };
}

function buildEquipmentSlotSummary(game, slotDef, compatibleCount = 0) {
  const item = game.player.equipment[slotDef.slot] || null;
  const quality = getSlotQualityLabel(game, slotDef, compatibleCount);
  if (!item) {
    return {
      quality,
      recommendation: compatibleCount > 0 ? "Equip" : "Keep",
      reason: compatibleCount > 0 ? `${compatibleCount} item${compatibleCount === 1 ? "" : "s"} ready for this slot` : "Keep this slot open for upgrades",
      risk: ""
    };
  }
  return {
    quality,
    recommendation: item.cursed ? "Remove curse first" : "Keep",
    reason: item.cursed ? "Locked by curse" : `${quality} in your current build`,
    risk: item.cursed ? "Locks if cursed" : ""
  };
}

// src/features/exploration.js

function performSearchCommand(game) {
  const result = createCommandResult();
  if (!game.player || game.mode !== "game") {
    return result;
  }
  game.recordTelemetry?.("search_used", {
    objectiveId: game.currentLevel?.floorObjective?.id || "",
    pressure: game.getPressureUiState?.().label || "",
    beforeObjectiveSeen: !game.currentLevel?.guidance?.objectiveSeen
  });
  const radius = game.getSearchRadiusForStats(game.player.stats);
  const searchPower = game.getSearchPower();
  let found = 0;
  for (let y = game.player.y - radius; y <= game.player.y + radius; y += 1) {
    for (let x = game.player.x - radius; x <= game.player.x + radius; x += 1) {
      if (!inBounds(game.currentLevel, x, y)) {
        continue;
      }
      const tile = getTile(game.currentLevel, x, y);
      if ((tile.kind === "trap" && tile.hidden) || tile.kind === "secretDoor" || tile.kind === "secretWall") {
        const targetNumber = tile.kind === "trap" ? 24 : 28;
        if (randInt(1, 20) + searchPower >= targetNumber) {
          revealSecretTile(game.currentLevel, x, y);
          found += 1;
        }
      }
    }
  }
  if (game.increaseDanger) {
    game.increaseDanger("search", game.currentLevel?.floorResolved ? 2 : 1);
  }
  const routeReveal = game.revealGuidedObjectiveRoute ? game.revealGuidedObjectiveRoute("search") : null;
  let message = found > 0
    ? `You discover ${found} hidden feature${found === 1 ? "" : "s"}.`
    : "You search carefully but find nothing.";
  let tone = found > 0 ? "good" : "warning";
  if (routeReveal?.revealed) {
    const routeCue = game.getObjectiveRouteHint ? game.getObjectiveRouteHint() : game.getCurrentRouteCueText ? game.getCurrentRouteCueText() : "";
    const pressureText = game.getPressureUiState ? game.getPressureUiState().shortLabel.toLowerCase() : "pressure";
    message = found > 0
      ? `${message} Searching raised pressure, but your route sketch now reaches farther ${routeReveal.direction}.`
      : routeReveal.complete
        ? `Searching raised pressure, but you map the rest of the route to the floor objective.`
        : `Searching raised pressure, but you sketch a safer route ${routeReveal.direction}.`;
    if (routeReveal.revealedRoom) {
      message = `${message} One adjacent room pocket is now clear on your map.`;
    }
    if (routeCue) {
      message = `${message} ${routeCue}`;
    }
    if (pressureText) {
      message = `${message} ${pressureText[0].toUpperCase()}${pressureText.slice(1)} now.`;
    }
    tone = "good";
  } else if (!found && routeReveal?.complete) {
    message = "You already have a clear route to the floor objective.";
  }
  addCommandLog(result, message, tone);
  addCommandSound(result, found > 0 ? "searchGood" : "search");
  result.render = true;
  return result;
}

function useStairsCommand(game, direction) {
  const result = createCommandResult();
  const tile = getTile(game.currentLevel, game.player.x, game.player.y);
  if (direction === "down") {
    if (tile.kind !== "stairDown") {
      addCommandLog(result, "There are no stairs leading down here.", "warning");
      result.render = true;
      return result;
    }
    if (game.currentDepth > 0 && !game.currentLevel.floorResolved) {
      addCommandLog(result, "The stairs down remain sealed. Resolve this floor's objective first.", "warning");
      result.render = true;
      return result;
    }
    const nextDepth = game.currentDepth + 1;
    if (nextDepth >= game.levels.length) {
      addCommandLog(result, "No deeper path opens here.", "warning");
      result.render = true;
      return result;
    }
    game.currentDepth = nextDepth;
    game.player.deepestDepth = Math.max(game.player.deepestDepth, game.currentDepth);
    game.currentLevel = game.levels[nextDepth];
    game.placePlayerAt(game.currentLevel.stairsUp.x, game.currentLevel.stairsUp.y);
    game.markOnboarding?.("enter_keep");
    game.recordTelemetry?.("stairs_used", {
      direction: "down",
      fromDepth: nextDepth - 1,
      toDepth: nextDepth
    });
    game.recordTelemetry?.("depth_entered", {
      depth: nextDepth,
      source: "stairs_down",
      objectiveId: game.currentLevel.floorObjective?.id || "",
      optionalId: game.currentLevel.floorOptional?.id || ""
    });
    if (nextDepth === 1) {
      game.recordTelemetry?.("keep_entered", {
        objectiveId: game.currentLevel.floorObjective?.id || ""
      });
    }
    game.triggerStoryBeat(`depth-${nextDepth}`);
    game.recordChronicleEvent?.("floor_enter", { label: game.currentLevel.description });
    game.noteFloorIntro?.();
    addCommandLog(result, `You descend to ${game.currentLevel.description}.`, "warning");
    addCommandSound(result, "stairs");
    result.autosave = true;
    result.render = true;
    return result;
  }

  if (tile.kind !== "stairUp") {
    addCommandLog(result, "There are no stairs leading up here.", "warning");
    result.render = true;
    return result;
  }
  const nextDepth = game.currentDepth - 1;
  if (nextDepth < 0) {
    addCommandLog(result, "You are already in town.", "warning");
    result.render = true;
    return result;
  }
  if (game.currentDepth > 0 && game.currentLevel?.floorResolved) {
    game.markOnboarding?.("choose_extract_or_greed");
  }
  game.recordTelemetry?.("stairs_up_used", {
    fromDepth: game.currentDepth,
    floorResolved: Boolean(game.currentLevel?.floorResolved)
  });
  game.currentDepth = nextDepth;
  const previousLevel = game.levels[game.currentDepth + 1];
  if (nextDepth === 0 && previousLevel && typeof game.setTownReturnStingFromLevel === "function") {
    game.setTownReturnStingFromLevel(previousLevel, { depth: game.currentDepth + 1 });
  }
  game.currentLevel = game.levels[nextDepth];
  game.placePlayerAt(game.currentLevel.stairsDown.x, game.currentLevel.stairsDown.y);
    game.recordTelemetry?.("stairs_used", {
      direction: "up",
      fromDepth: game.currentDepth + 1,
      toDepth: nextDepth
    });
    if (nextDepth === 0) {
      game.recordTelemetry?.("returned_to_town", {
        fromDepth: game.currentDepth + 1,
        floorResolved: Boolean(previousLevel?.floorResolved),
        optionalTaken: Boolean(previousLevel?.floorOptional?.opened)
      });
      game.refreshShopState();
      let blockedByStorySurface = false;
      if (game.player?.quest?.hasRunestone) {
        const beforeQuestMode = game.mode;
        game.checkQuestState?.();
        blockedByStorySurface = beforeQuestMode !== "modal" && game.mode === "modal";
      } else {
        blockedByStorySurface = Boolean(game.maybeShowTownStoryScene?.());
      }
      if (previousLevel?.floorResolved) {
        const returnMeta = game.recordTownReturnSummary?.(previousLevel, game.currentDepth + 1);
        if (returnMeta?.summary && !blockedByStorySurface) {
          game.showExtractionSummaryModal?.(returnMeta.summary, {
            ...returnMeta,
            level: previousLevel
          });
        }
      }
    }
  game.recordTelemetry?.("depth_entered", {
    depth: nextDepth,
    source: "stairs_up",
    objectiveId: game.currentLevel.floorObjective?.id || "",
    optionalId: game.currentLevel.floorOptional?.id || ""
  });
  game.recordChronicleEvent?.("floor_enter", { label: game.currentLevel.description });
  addCommandLog(result, `You climb to ${game.currentLevel.description}.`, "warning");
  addCommandSound(result, "stairs");
  result.autosave = true;
  result.render = true;
  return result;
}

// src/features/combat.js

const UNDEAD_IDS = new Set(["skeleton", "wraith", "cryptlord"]);
const BASE_MOVE_THRESHOLD = 100;

function getMonsterMoveSpeed(monster) {
  let speed = typeof monster.moveSpeed === "number" ? monster.moveSpeed : BASE_MOVE_THRESHOLD;
  if ((monster.slowed || 0) > 0) {
    speed *= 0.5;
  }
  return clamp(Math.round(speed), 40, 120);
}

function bankMonsterMovement(monster) {
  monster.moveMeter = Math.min(
    BASE_MOVE_THRESHOLD * 2,
    (typeof monster.moveMeter === "number" ? monster.moveMeter : BASE_MOVE_THRESHOLD) + getMonsterMoveSpeed(monster)
  );
}

function canMonsterSpendMovement(monster) {
  if ((monster.moveMeter || 0) < BASE_MOVE_THRESHOLD) {
    return false;
  }
  monster.moveMeter -= BASE_MOVE_THRESHOLD;
  return true;
}

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

function visibleEnemies(game) {
  return game.currentLevel.actors.filter((actor) => isVisible(game.currentLevel, actor.x, actor.y));
}

function makeNoise(game, radius, source = game.player, reason = "noise") {
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

function canMonsterMoveTo(game, monster, x, y) {
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

function findRetreatStep(game, monster) {
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

function canCharge(game, monster, dx, dy, distanceToPlayer) {
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

function applyCharge(game, monster) {
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

function getMonsterIntent(game, monster) {
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

function updateMonsterIntents(game) {
  if (!game.currentLevel) {
    return;
  }
  game.currentLevel.actors.forEach((monster) => {
    monster.intent = getMonsterIntent(game, monster);
  });
}

function attack(game, attacker, defender) {
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

function damageActor(game, attacker, defender, amount, damageType = "physical") {
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

function killMonster(game, monster) {
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
    game.recordTelemetry?.("elite_kill", {
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

function checkLevelUp(game) {
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

function handleDeath(game) {
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

function processMonsters(game) {
  const level = game.currentLevel;
  level.actors.forEach((monster) => {
    bankMonsterMovement(monster);
    if ((monster.tempBuffTurns || 0) > 0) {
      monster.tempBuffTurns -= 1;
      if (monster.tempBuffTurns <= 0) {
        monster.tempAttackBuff = 0;
      }
    }
    if ((monster.bannerCooldown || 0) > 0) {
      monster.bannerCooldown -= 1;
    }
    if ((monster.slowed || 0) > 0) {
      monster.slowed -= 1;
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
      if (canMonsterSpendMovement(monster)) {
        applyCharge(game, monster);
      }
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
        if (retreat && canMonsterSpendMovement(monster)) {
          monster.x = retreat.x;
          monster.y = retreat.y;
          return;
        }
      }
      if (monster.tactic === "skirmish" && distanceToPlayer <= 4) {
        const retreat = findRetreatStep(game, monster);
        if (retreat && canMonsterSpendMovement(monster)) {
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
    if (canMonsterMoveTo(game, monster, nx, ny) && canMonsterSpendMovement(monster)) {
      monster.x = nx;
      monster.y = ny;
    }
  });
}

// src/features/turns.js

function performWait(game) {
  if (!game.player || game.mode !== "game" || game.player.hp <= 0) {
    return;
  }
  game.recordTelemetry?.("wait_used");
  game.log(`${game.player.name} waits.`, "warning");
  game.audio.play("ui");
  onPlayerWait(game);
  game.makeNoise(3, game.player, "wait");
  game.endTurn();
}

function restUntilSafe(game) {
  if (!game.player || game.mode !== "game" || game.player.hp <= 0) {
    return;
  }
  game.recordTelemetry?.("rest_used", { kind: "rest" });
  let recovered = 0;
  let interrupted = false;
  onPlayerWait(game);
  for (let i = 0; i < 6; i += 1) {
    if (game.visibleEnemies().length > 0 || game.player.hp >= game.player.maxHp) {
      break;
    }
    if (game.makeNoise(4, game.player, "rest") > 0) {
      interrupted = true;
      break;
    }
    game.player.hp = Math.min(game.player.maxHp, game.player.hp + 1);
    game.player.mana = Math.min(game.player.maxMana, game.player.mana + 1);
    recovered += 1;
    game.endTurn(false);
  }
  game.log(interrupted ? "You try to rest, but the halls answer back." : recovered > 0 ? "You pause to recover your breath." : "You find no safe moment to rest.", interrupted ? "bad" : recovered > 0 ? "good" : "warning");
  game.render();
}

function sleepUntilRestored(game) {
  if (!game.player || game.mode !== "game" || game.player.hp <= 0) {
    return;
  }
  game.recordTelemetry?.("rest_used", { kind: "sleep" });
  if (game.player.hp >= game.player.maxHp && game.player.mana >= game.player.maxMana) {
    game.log("You are already fully restored.", "warning");
    game.render();
    return;
  }
  if (game.visibleEnemies().length > 0) {
    game.log("You cannot sleep with an enemy in sight.", "warning");
    game.render();
    return;
  }

  let recovered = 0;
  let interrupted = false;
  const maxCycles = Math.max(
    8,
    Math.ceil(Math.max(game.player.maxHp - game.player.hp, game.player.maxMana - game.player.mana)) + 6
  );

  onPlayerWait(game);
  for (let i = 0; i < maxCycles; i += 1) {
    if (game.visibleEnemies().length > 0) {
      interrupted = true;
      break;
    }
    if (game.player.hp >= game.player.maxHp && game.player.mana >= game.player.maxMana) {
      break;
    }
    if (game.makeNoise(4, game.player, "rest") > 0) {
      interrupted = true;
      break;
    }
    game.player.hp = Math.min(game.player.maxHp, game.player.hp + 1);
    game.player.mana = Math.min(game.player.maxMana, game.player.mana + 1);
    recovered += 1;
    game.endTurn(false);
    if (game.mode !== "game") {
      break;
    }
    if (game.visibleEnemies().length > 0) {
      interrupted = true;
      break;
    }
  }

  game.log(
    interrupted
      ? "You wake as danger steps into view."
      : recovered > 0
        ? "You sleep until your strength returns."
        : "You cannot find a safe moment to sleep.",
    interrupted ? "warning" : recovered > 0 ? "good" : "warning"
  );
  game.render();
}

function resolveTurn(game, advanceTurn = true) {
  if (!game.player || game.player.hp <= 0) {
    return;
  }
  let monsterActions = 1;
  if (typeof advanceTurn === "object") {
    monsterActions = Math.max(0, Math.floor(advanceTurn.monsterActions ?? 1));
    advanceTurn = advanceTurn.advanceTurn ?? true;
  }
  if (advanceTurn) {
    game.turn += 1;
  }
  const encumbrance = game.getEncumbranceTier ? game.getEncumbranceTier() : 0;
  const stats = game.getActorStats ? game.getActorStats(game.player) : game.player.stats;
  const hpRegenBase = encumbrance >= 2 ? 0.01 : encumbrance === 1 ? 0.02 : 0.03;
  const manaRegenBase = encumbrance >= 2 ? 0.02 : encumbrance === 1 ? 0.04 : 0.06;
  const hpRegen = hpRegenBase + Math.max(0, stats.con - 10) * 0.004;
  const manaRegen = manaRegenBase + Math.max(0, stats.int - 10) * 0.006;
  game.player.hp = Math.min(game.player.maxHp, game.player.hp + hpRegen);
  game.player.mana = Math.min(game.player.maxMana, game.player.mana + manaRegen);
  advanceDangerTurn(game);
  for (let index = 0; index < monsterActions; index += 1) {
    game.processMonsters();
  }
  if (monsterActions > 0 && encumbrance >= 2 && game.currentDepth > 0) {
    game.processMonsters();
  }
  if ((game.player.slowed || 0) > 0) {
    game.player.slowed -= 1;
  }
  if ((game.player.held || 0) > 0) {
    game.player.held -= 1;
  }
  if ((game.player.lightBuffTurns || 0) > 0) {
    game.player.lightBuffTurns -= 1;
  }
  if ((game.player.arcaneWardTurns || 0) > 0) {
    game.player.arcaneWardTurns -= 1;
  }
  if ((game.player.stoneSkinTurns || 0) > 0) {
    game.player.stoneSkinTurns -= 1;
  }
  if ((game.player.resistFireTurns || 0) > 0) {
    game.player.resistFireTurns -= 1;
  }
  if ((game.player.resistColdTurns || 0) > 0) {
    game.player.resistColdTurns -= 1;
  }
  if ((game.player.guardBrokenTurns || 0) > 0) {
    game.player.guardBrokenTurns -= 1;
  }
  if (game.recalculateDerivedStats) {
    game.recalculateDerivedStats();
  }
  if (game.syncTownCycle) {
    game.syncTownCycle(false, game.currentDepth === 0);
  }
  game.updateFov();
  game.updateMonsterIntents();
  game.checkQuestState();
  game.render();
}

function endTurn(game, advanceTurn = true) {
  if (!game.player || game.player.hp <= 0) {
    return;
  }
  let options = {};
  if (typeof advanceTurn === "object") {
    options = advanceTurn;
    advanceTurn = advanceTurn.advanceTurn ?? true;
  }
  if ((game.hasPendingProgressionChoice && game.hasPendingProgressionChoice()) || game.pendingSpellChoices > 0) {
    game.pendingTurnResolution = { advanceTurn, ...options };
    if (!game.showNextProgressionModal || !game.showNextProgressionModal()) {
      game.render();
    }
    return;
  }
  game.resolveTurn({ advanceTurn, ...options });
}

// src/features/advisor.js

function buildObjectiveAdvice(game, tile, hpRatio, manaRatio, visible, focus, lootHere) {
  const directive = game.getLoopDirective ? game.getLoopDirective(tile) : null;
  const objectiveText = getObjectiveStatusText(game.currentLevel);
  const optionalText = getOptionalStatusText(game.currentLevel);
  const objectiveGuide = directive?.primaryText || (game.getObjectiveGuideText ? game.getObjectiveGuideText() : "");
  const floorThesis = game.getFloorThesisText ? game.getFloorThesisText() : "";
  const routeCue = directive?.routeCueText || (game.getCurrentRouteCueText ? game.getCurrentRouteCueText() : "");
  const dangerNote = directive?.supportText || (game.getImmediateDangerNote ? game.getImmediateDangerNote() : "");
  const townMeta = game.currentDepth === 0 && game.getTownMetaSummary ? game.getTownMetaSummary() : null;
  const actions = [];
  const pushAction = (action, label, note, recommended = false, tab = "") => {
    if (!actions.some((entry) => entry.action === action)) {
      actions.push({ action, label, note, recommended, tab });
    }
  };

  let advice = objectiveText;
  if (visible.length > 0 && focus) {
    const focusIntent = focus.intent?.type || "";
    const focusDistance = distance(game.player, focus);
    advice = `Hold against ${focus.name}.`;
    if (focusIntent === "sleep") {
      advice = `${focus.name} is sleeping. Open on your terms or slip past.`;
      pushAction("search", "Scout", "Set the clean route", true);
      if (game.player.spellsKnown.length > 0) {
        pushAction("open-spell-tray", "Magic", "Prep a clean opener", false, "magic");
      }
    } else if (hpRatio < 0.35 && (focusIntent === "shoot" || focusIntent === "summon" || focusIntent === "charge" || focusDistance <= 2)) {
      advice = `Break contact now. ${focus.name} can finish this exchange.`;
      pushAction("stairs-up", "Ascend", "Leave the floor", true);
      pushAction("open-spell-tray", "Magic", "Spend control or escape", false, "magic");
    } else if (focus.ranged && focusIntent !== "sleep") {
      advice = `Break line of sight on ${focus.name}.`;
      pushAction("open-spell-tray", "Magic", "Answer ranged pressure", true, "magic");
      pushAction("wait", "Hold", "Do not walk into fire", false);
    } else if (focus.abilities && focus.abilities.includes("charge") && focusIntent !== "sleep") {
      advice = "Sidestep the charge lane before you advance.";
      pushAction("wait", "Hold", "Read the charge lane", true);
      pushAction("open-spell-tray", "Magic", "Slow or burst it", false, "magic");
    } else if (focus.abilities && focus.abilities.includes("summon") && focusIntent !== "sleep") {
      advice = "Kill the summoner before the room fills.";
      pushAction("open-spell-tray", "Magic", "Kill summoner", true, "magic");
    } else if (focusDistance >= 4 && focusIntent === "advance") {
      advice = `${focus.name} is aware. Set the approach before opening more map.`;
      pushAction("wait", "Hold", "Read the lane", true);
      pushAction("search", "Scout", "Check nearby routes", false);
    } else {
      advice = `${focus.name} is closing. Take the clean trade.`;
      pushAction("wait", "Hold", "Take the clean exchange", false);
    }
  } else if (lootHere.length > 0) {
    advice = `Pick up ${game.summarizeLoot(lootHere, 2)} before moving on.`;
    pushAction("pickup", "Pick Up", lootHere.length === 1 ? game.describeItemReadout(lootHere[0]) : `${lootHere.length} items underfoot`, true);
  } else if (tile.objectiveId) {
    const objectiveId = game.currentLevel.floorObjective?.id;
    const roomClear = getObjectiveRoomClear(game);
    if (game.currentLevel.floorResolved) {
      advice = "Objective complete. Leave now or stay greedy.";
    } else if (objectiveId === "rescue_captive") {
      advice = roomClear
        ? "The captive is clear. Step onto the cell to pull them free."
        : "The captive is pinned here. Clear the room before the rescue can move.";
      pushAction("wait", "Hold", "Finish the fight before rescuing them", true);
      if (game.player.spellsKnown.length > 0) {
        pushAction("open-spell-tray", "Magic", "Spend control to win the room", false, "magic");
      }
    } else if (objectiveId === "purge_nest" && !roomClear) {
      advice = "The nest is exposed, but defenders are still alive. Clear the room first.";
      pushAction("wait", "Hold", "Finish the room before purging it", true);
    } else if (objectiveId === "recover_waystone") {
      advice = "Claim the waystone now. It sharpens the next floor instead of this one.";
      pushAction("pickup", "Take Waystone", "Bank the route edge", true);
    } else if (objectiveId === "seal_shrine") {
      advice = "Seal the shrine when ready. It spends mana and spikes floor pressure.";
      pushAction("interact", "Seal", "Finish the objective", true);
    } else if (objectiveId === "purify_well") {
      advice = "Purify the well when ready. It refills you, but the floor answers immediately.";
      pushAction("interact", "Purify", "Take the refill and clear the floor", true);
    } else {
      advice = "Resolve the objective now.";
      pushAction("interact", "Resolve", "Finish the floor objective", true);
    }
  } else if (tile.optionalId) {
    advice = "Optional reward is here. Touch it only if you want more pressure.";
    pushAction("interact", "Open Optional", "Take the greed line", true);
  } else if (tile.kind === "stairUp" && game.currentDepth > 0) {
    if (hpRatio < 0.45) {
      advice = "Use the stairs up now.";
      pushAction("stairs-up", "Ascend", "Leave the floor", true);
    } else if (game.currentLevel.floorResolved) {
      advice = "Stairs up are ready if you want to bank progress.";
      pushAction("stairs-up", "Ascend", "Leave the floor", false);
    } else {
      advice = "Stairs up are your fallback. Find the objective before you leave.";
      pushAction("search", game.currentDepth === 1 ? "Find Route" : "Find Objective", "Push toward the floor objective", true);
    }
  } else if (tile.kind === "stairDown") {
    if (game.currentLevel.floorResolved) {
      advice = "Descend if this build is ready for the next floor.";
      pushAction("stairs-down", "Descend", "Push the run deeper", true);
    } else {
      advice = "Ignore the stairs. Find the floor objective first.";
      pushAction("search", "Find Objective", "Scout the floor", true);
    }
  } else if (game.currentDepth === 0 && (game.player.deepestDepth || 0) === 0) {
    advice = game.storyFlags?.townServiceVisited
      ? "You checked a town door. Take the north road into the keep."
      : "Step onto one labeled town door, then take the north road into the keep.";
    pushAction(
      "map-focus",
      game.storyFlags?.townServiceVisited ? "Go North" : "Services",
      game.storyFlags?.townServiceVisited ? "Enter the keep" : "Open a town door",
      true
    );
    pushAction("open-briefing", "Briefing", "Hear the run goal", false);
    pushAction("open-hub", "Journal", "Review the run goal", false, "journal");
  } else if (game.currentDepth === 0 && townMeta) {
    advice = directive?.primaryText || townMeta.recommendedAction;
    pushAction("map-focus", "Survey", "Check current town state", false);
    pushAction("open-hub", "Journal", "Review town intel", false, "journal");
  } else if (game.currentDepth > 0 && (hpRatio < 0.75 || manaRatio < 0.65)) {
    advice = "Recovery is noisy. Sleep only if you can afford waking the floor.";
    pushAction("sleep", "Sleep", "Recover to full unless spotted", true);
    pushAction("rest", "Rest", "Take a shorter recovery", false);
    pushAction("search", "Search", "Probe for routes", false);
  } else if (game.currentDepth > 0) {
    advice = directive?.primaryText || (game.currentLevel.floorResolved
      ? "Objective complete. Extract or take one last greed line."
      : game.currentDepth === 1
        ? `Go to the objective. Search now sketches more of the route. ${objectiveText}`
        : `Go to the objective. ${objectiveText}`);
    pushAction(
      directive?.recommendedActionId === "stairs-up" ? "stairs-up" : "search",
      directive?.recommendedActionId === "stairs-up" ? "Ascend" : game.currentLevel.floorResolved ? "Search" : game.currentDepth === 1 ? "Find Route" : "Find Objective",
      directive?.recommendedActionId === "stairs-up"
        ? "Bank the floor now"
        : game.currentLevel.floorResolved
          ? "Probe for secrets or routes"
          : game.currentDepth === 1
            ? "Sketch more of the objective route"
            : "Probe for routes",
      true
    );
  }

  return {
    advice,
    objectiveText: directive?.primaryText || objectiveText,
    objectiveGuide,
    floorThesis,
    routeCue,
    dangerNote,
    townMeta,
    optionalText,
    actions
  };
}

function buildDockSlots(game, actions) {
  if (game.targetMode) {
    return [
      {
        key: "primary",
        prompt: "A",
        label: "Confirm",
        note: `Fire ${game.targetMode.name}`,
        action: "target-confirm",
        tone: "primary",
        active: true
      },
      {
        key: "secondary",
        prompt: "X",
        label: game.player.spellsKnown.length > 0 ? "Magic" : "Survey",
        note: game.player.spellsKnown.length > 0 ? "Review spell options" : "Check the minimap",
        action: game.player.spellsKnown.length > 0 ? "open-spell-tray" : "map-focus",
        tab: game.player.spellsKnown.length > 0 ? "magic" : "",
        tone: "primary"
      },
      {
        key: "back",
        prompt: "B",
        label: "Cancel",
        note: "Leave targeting",
        action: "target-cancel",
        tone: "secondary"
      },
      {
        key: "pack",
        prompt: "Y",
        label: "Pack",
        note: "Review loadout",
        action: "open-hub",
        tab: "pack",
        tone: "utility"
      }
    ];
  }

  const candidates = [];
  const seen = new Set();
  const firstTownRun = game.currentDepth === 0 && (game.player?.deepestDepth || 0) === 0;
  const pushCandidate = (entry) => {
    if (!entry || !entry.action) {
      return;
    }
    const key = `${entry.action}:${entry.tab || ""}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    candidates.push(entry);
  };

  actions.forEach(pushCandidate);
  if (firstTownRun && !game.storyFlags?.townServiceVisited) {
    pushCandidate({
      action: "open-briefing",
      label: "Briefing",
      note: "Hear the keep objective"
    });
  } else if (firstTownRun && game.storyFlags?.townServiceVisited) {
    pushCandidate({
      action: "map-focus",
      label: "Go North",
      note: "Enter the keep"
    });
  }
  if (game.player.spellsKnown.length > 0) {
    pushCandidate({
      action: "open-spell-tray",
      label: "Magic",
      note: "Cast, burst, or control",
      tab: "magic"
    });
  }
  pushCandidate(game.currentDepth > 0
    ? {
        action: "search",
        label: game.currentLevel?.floorResolved ? "Scout" : "Find Route",
        note: game.currentLevel?.floorResolved ? "Probe for secrets or greed" : "Probe for routes"
      }
    : {
        action: "map-focus",
        label: "Survey",
        note: "Open the field survey"
      });
  pushCandidate({
    action: "wait",
    label: game.currentDepth > 0 ? "Hold" : "Wait",
    note: "Spend a careful turn"
  });

  while (candidates.length < 3) {
    pushCandidate({
      action: "open-utility-menu",
      label: "Menu",
      note: "Save, settings, and help"
    });
  }

  const dominantHud = getValidationVariant(game, "hud") === "dominant_cta";
  const orderedCandidates = dominantHud
    ? candidates.slice().sort((left, right) => Number(Boolean(right.recommended)) - Number(Boolean(left.recommended)))
    : candidates;
  const primaryAction = game.getControllerPrimaryDockAction
    ? game.getControllerPrimaryDockAction(orderedCandidates)
    : orderedCandidates[0];
  const secondaryAction = orderedCandidates.find((entry) =>
    entry.action !== primaryAction.action || (entry.tab || "") !== (primaryAction.tab || "")
  ) || orderedCandidates[0];

  return [
    {
      key: "primary",
      prompt: "A",
      label: primaryAction.label,
      note: primaryAction.note,
      action: primaryAction.action,
      tab: primaryAction.tab || "",
      service: primaryAction.service || "",
      tone: "primary",
      active: true
    },
    {
      key: "secondary",
      prompt: "X",
      label: secondaryAction.label,
      note: secondaryAction.note,
      action: secondaryAction.action,
      tab: secondaryAction.tab || "",
      tone: "secondary"
    },
    {
      key: "back",
      prompt: "B",
      label: "Back",
      note: game.layoutMode === "desktop"
        ? "Cancel targeting or close menus"
        : game.mapDrawer && game.mapDrawerOpen
          ? "Close the survey"
          : "Cancel targeting or close menus",
      action: "target-cancel",
      tone: "secondary"
    },
    {
      key: "pack",
      prompt: "Y",
      label: "Pack",
      note: "Review loadout",
      action: "open-hub",
      tab: "pack",
      tone: "utility"
    }
  ];
}

function getAdvisorModel(game) {
  if (!game.player || !game.currentLevel) {
    return {
      statsHtml: "<div class='muted'>No active run.</div>",
      objectiveHtml: "<div class='muted'>No active directive.</div>",
      fieldHtml: "<div class='field-summary-head'><span class='advisor-label'>Field Read</span><span class='field-summary-state'>No active run</span></div><div class='field-summary-text'>Create a character to begin.</div>",
      dockSlots: []
    };
  }

  const tile = getTile(game.currentLevel, game.player.x, game.player.y);
  const visible = game.getSortedVisibleEnemies ? game.getSortedVisibleEnemies() : game.visibleEnemies();
  const focus = game.getFocusedThreat ? game.getFocusedThreat(visible) : visible[0] || null;
  const hpRatio = game.player.maxHp > 0 ? game.player.hp / game.player.maxHp : 1;
  const manaRatio = game.player.maxMana > 0 ? game.player.mana / game.player.maxMana : 1;
  const lootHere = itemsAt(game.currentLevel, game.player.x, game.player.y);
  const burdenUi = game.getBurdenUiState();
  const condition = game.player.held
    ? "Held"
    : game.player.slowed
      ? "Slowed"
      : burdenUi.state === "overloaded"
        ? "Overburdened"
        : burdenUi.state === "warning" || burdenUi.state === "danger"
          ? "Burdened"
          : "Steady";
  const locationLabel = game.currentDepth > 0 ? `Depth ${game.currentDepth}` : "Town";
  const objectiveView = buildObjectiveAdvice(game, tile, hpRatio, manaRatio, visible, focus, lootHere);
  const visibleLoot = game.getVisibleLootItems ? game.getVisibleLootItems() : [];
  const focusHealth = focus ? getMonsterHealthState(focus) : null;
  const dockSlots = buildDockSlots(game, objectiveView.actions);
  const pressure = getPressureStatus(game.currentLevel);
  const firstTownRun = game.currentDepth === 0 && (game.player.deepestDepth || 0) === 0;
  const returnSting = game.getTownReturnStingText ? game.getTownReturnStingText() : "";
  const tileAction = game.getTileActionPrompt ? game.getTileActionPrompt(tile) : null;
  const pinnedEvent = game.getPinnedTickerEntry ? game.getPinnedTickerEntry() : null;

  const statsHtml = `
    <div class="stat-band-head">
      <span class="stat-band-name">${escapeHtml(game.player.name)}</span>
      <span class="stat-band-role">${escapeHtml(`${game.player.race} ${game.player.className}`)}</span>
    </div>
    <div class="rail-stat-row">
      <div class="rail-stat-pill tone-health">
        <span>HP</span>
        <strong>${Math.floor(game.player.hp)}/${game.player.maxHp}</strong>
        <div class="rail-meter hp"><span style="width:${clamp(Math.round(hpRatio * 100), 0, 100)}%"></span></div>
      </div>
      <div class="rail-stat-pill tone-mana">
        <span>Mana</span>
        <strong class="${manaRatio < 0.3 ? "value-warning" : ""}">${Math.floor(game.player.mana)}/${game.player.maxMana}</strong>
        <div class="rail-meter mana"><span style="width:${clamp(Math.round(manaRatio * 100), 0, 100)}%"></span></div>
      </div>
      <div class="rail-stat-pill tone-load burden-${burdenUi.state}">
        <span>Load</span>
        <strong>${burdenUi.weight}/${burdenUi.capacity}</strong>
        <div class="rail-meter burden burden-${burdenUi.state}"><span style="width:${burdenUi.percent}%"></span></div>
      </div>
      <div class="rail-stat-pill tone-meta">
        <span>State</span>
        <strong class="${game.player.slowed || burdenUi.state !== "safe" ? "value-warning" : ""}">${escapeHtml(condition)}</strong>
      </div>
    </div>
  `;

  const ribbonLabel = focus
    ? (focus.intent?.type === "sleep" ? "Visible Threat" : "Primary Threat")
    : lootHere.length > 0
      ? "Underfoot"
      : tile.objectiveId
        ? "Objective"
        : "Field Read";
  const ribbonState = focus
    ? `${focus.name} | ${game.getMonsterIntentLabel(focus)} | ${distance(game.player, focus)} tiles`
    : lootHere.length > 0
      ? game.summarizeLoot(lootHere, 2)
      : game.currentDepth > 0
        ? objectiveView.floorThesis || `${pressure.shortLabel} | ${pressure.countdown}`
        : firstTownRun
          ? "North road leads into the keep"
          : returnSting || "Town is quiet";
  const ribbonSupport = focus
    ? `${focusHealth.label} | ${game.getMonsterRoleLabel(focus)}`
    : objectiveView.routeCue || objectiveView.dangerNote || objectiveView.objectiveGuide || objectiveView.optionalText || objectiveView.objectiveText || (visibleLoot.length > 0
      ? `Visible loot: ${game.summarizeLoot(visibleLoot, 2)}`
      : game.currentDepth > 0
        ? getDangerSummary(game.currentLevel)
        : firstTownRun
          ? "Start by walking north from the plaza."
          : returnSting || "No visible enemies");
  const supportMarkup = ribbonSupport && ribbonSupport !== objectiveView.advice && ribbonSupport !== ribbonState
    ? `<div class="field-brief-support">${escapeHtml(ribbonSupport)}</div>`
    : "";
  const townMetaMarkup = game.currentDepth === 0 && objectiveView.townMeta
    ? `<div class="field-brief-support">${escapeHtml(objectiveView.townMeta.summary)}</div>`
    : "";
  const onboardingMarkup = shouldShowOnboardingChecklist(game)
    ? renderOnboardingChecklist(game)
    : "";
  const dominantHud = getValidationVariant(game, "hud") === "dominant_cta";
  const dominantAction = objectiveView.actions.find((entry) => entry.recommended) || objectiveView.actions[0] || null;
  const dominantCtaMarkup = dominantHud && dominantAction
    ? `<div class="field-brief-cta"><span class="pill">Now</span><strong>${escapeHtml(dominantAction.label)}</strong><span>${escapeHtml(dominantAction.note)}</span></div>`
    : "";

  const fieldHtml = `
    <div class="field-summary-head">
      <span class="advisor-label">${escapeHtml(ribbonLabel)}</span>
      <span class="field-summary-state ${focusHealth ? focusHealth.tone : visible.length > 0 ? "warning" : pressure.tone}">${escapeHtml(ribbonState)}</span>
    </div>
    ${dominantCtaMarkup}
    <div class="field-brief-text">${escapeHtml(objectiveView.advice)}</div>
    ${supportMarkup}
    ${townMetaMarkup}
    ${onboardingMarkup}
  `;

  const townDirective = firstTownRun
    ? (game.storyFlags?.townServiceVisited
        ? "Town checked. The north road and keep stairs are ready."
        : "First stop: step onto any labeled town door. Then go north into the keep.")
    : returnSting || "Town is quiet.";
  const routeHint = game.currentDepth > 0 && game.getObjectiveRouteHint
    ? game.getObjectiveRouteHint()
    : objectiveView.routeCue;
  const roomHint = game.currentDepth > 0 && game.getObjectiveRoomHint
    ? game.getObjectiveRoomHint()
    : "";
  const stairsState = game.currentDepth === 0
    ? (firstTownRun
        ? (game.storyFlags?.townServiceVisited ? "Keep stairs are open for the first descent." : "Town task first, then keep stairs.")
        : "Town resets shops, healing, intel, and banked safety for this adventurer.")
    : game.currentLevel.floorResolved
      ? "Deeper stairs unlocked. Extract now or push one more greed line."
      : "Deeper stairs locked until the floor objective is resolved.";
  const pressureLine = game.currentDepth === 0
    ? (objectiveView.townMeta?.summary || "Town value is run support: safety, intel, stock, and funded leverage for this adventurer.")
    : pressure.summary;
  const directiveLine = tileAction?.detail || roomHint || pinnedEvent?.message || objectiveView.objectiveGuide || objectiveView.optionalText || "";
  const objectiveHtml = `
    <div class="objective-band-head">
      <span class="advisor-label">${escapeHtml(game.currentDepth === 0 ? "Town Plan" : "Current Goal")}</span>
      <span class="objective-band-state tone-${pressure.tone}">${escapeHtml(game.currentDepth === 0 ? "Run Prep" : pressure.shortLabel)}</span>
    </div>
    <div class="objective-band-line">${escapeHtml(game.currentDepth === 0 ? townDirective : routeHint || objectiveView.objectiveText)}</div>
    <div class="objective-band-line muted-line">${escapeHtml(stairsState)}</div>
    <div class="objective-band-line muted-line">${escapeHtml(pressureLine)}</div>
    ${directiveLine ? `<div class="objective-band-line accent-line">${escapeHtml(directiveLine)}</div>` : ""}
  `;

  return { statsHtml, objectiveHtml, fieldHtml, dockSlots };
}

function renderPanels(game) {
  if (!game.player) {
    if (game.playerCapsule) {
      game.playerCapsule.innerHTML = "<div class='muted'>No active run.</div>";
    }
    if (game.threatCapsule) {
      game.threatCapsule.innerHTML = "<div class='muted'>No active directive.</div>";
    }
    if (game.advisorStrip) {
      game.advisorStrip.innerHTML = "<div class='field-summary-head'><span class='advisor-label'>Field Read</span><span class='field-summary-state'>No active run</span></div><div class='field-brief-text'>Create a character to begin.</div>";
    }
    return;
  }

  const advisor = getAdvisorModel(game);
  if (game.playerCapsule) {
    game.playerCapsule.innerHTML = advisor.statsHtml;
    game.playerCapsule.dataset.burdenState = game.getBurdenUiState().state;
  }
  if (game.threatCapsule) {
    game.threatCapsule.innerHTML = advisor.objectiveHtml;
  }
  if (game.advisorStrip) {
    game.advisorStrip.innerHTML = advisor.fieldHtml;
  }
}

function renderActionBar(game) {
  if (!game.actionBar) {
    return;
  }
  if (!game.player) {
    game.actionBar.innerHTML = "";
    return;
  }
  const advisor = getAdvisorModel(game);
  game.actionBar.dataset.mode = game.targetMode ? "target" : "field";
  game.actionBar.innerHTML = advisor.dockSlots.map((slot) => `
    <button class="action-button dock-action dock-slot dock-slot-${slot.key} dock-tone-${slot.tone}${slot.tone === "primary" ? " recommended" : ""}${slot.active ? " is-active" : ""}" data-action="${slot.action}"${slot.tab ? ` data-tab="${slot.tab}"` : ""}${slot.service ? ` data-service="${slot.service}"` : ""} data-focus-key="dock:${slot.key}" type="button">
      <span class="context-slot">${escapeHtml(slot.prompt)}</span>
      <span class="context-copy">
        <span class="context-main">${escapeHtml(slot.label)}</span>
        <span class="context-note">${escapeHtml(slot.note)}</span>
      </span>
    </button>
  `).join("");
}

// src/ui/render.js

const TOWN_BUILDING_RENDER = {
  general: { width: 0.86, height: 1, crop: 1, yOffset: 0.08 },
  junk: { width: 0.84, height: 0.98, crop: 1, yOffset: 0.08 },
  armory: { width: 0.88, height: 1.02, crop: 1, yOffset: 0.06 },
  guild: { width: 0.8, height: 0.98, crop: 1, yOffset: 0.04 },
  temple: { width: 0.92, height: 1.02, crop: 1, yOffset: 0.04 },
  bank: { width: 0.9, height: 1.18, crop: 1, yOffset: 0.02 },
  sage: { width: 0.7, height: 0.86, crop: 1, yOffset: 0.04 }
};

const townTerrainImages = buildTownTerrainImages();
const townBuildingImages = buildTownBuildingImages();
const imageCache = buildImageCache();
const tintedFrameCache = {};
const DUNGEON_TERRAIN_THEME = {
  unseen: "#040506",
  floor: {
    base: "#ece9e1",
    alt: "#e5e1d8",
    line: "rgba(255,255,255,0.52)",
    speck: "#d7d3cb"
  },
  wall: {
    base: "#b3b7be",
    alt: "#9fa5ae",
    top: "#d9dde3",
    shadow: "#7a828e"
  },
  pillar: {
    base: "#bcc1c8",
    alt: "#aab0b8",
    shadow: "#848c97"
  },
  stone: {
    base: "#ddd8cf",
    alt: "#d3cec5",
    line: "#c6c0b7"
  },
  fog: {
    wash: "rgba(114, 118, 126, 0.34)",
    speck: "rgba(120, 124, 132, 0.45)"
  },
  door: {
    frame: "#7d4d2e",
    fill: "#b77447",
    trim: "#d8bc96"
  },
  interactable: {
    objective: "#de8b4d",
    stairDown: "#be9348",
    stairUp: "#7bbcd9"
  }
};

const BEHAVIOR_BADGES = {
  pinning_controller: { color: "#7a8dff", symbol: "P" },
  banner_captain: { color: "#d98d4f", symbol: "B" },
  corpse_raiser: { color: "#a76fd7", symbol: "R" },
  stalker: { color: "#66b98e", symbol: "S" },
  breaker: { color: "#d96f5c", symbol: "X" },
  coward_caster: { color: "#6fc2d9", symbol: "C" }
};

function buildTownTerrainImages() {
  if (typeof Image === "undefined") {
    return null;
  }
  return {
    grass: TOWN_TERRAIN_ASSETS.grass.map(loadImage),
    roadHorizontal: TOWN_TERRAIN_ASSETS.roadHorizontal.map(loadImage),
    roadVertical: TOWN_TERRAIN_ASSETS.roadVertical.map(loadImage),
    roadCross: loadImage(TOWN_TERRAIN_ASSETS.roadCross)
  };
}

function loadImage(src) {
  const image = new Image();
  image.src = src;
  return image;
}

function createCanvas(width, height) {
  if (typeof document === "undefined") {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function buildTownBuildingImages() {
  if (typeof Image === "undefined") {
    return null;
  }
  return Object.fromEntries(
    Object.entries(TOWN_BUILDING_ASSETS).map(([key, src]) => [key, loadImage(src)])
  );
}

function isImageReady(image) {
  return Boolean(image && image.complete && image.naturalWidth > 0);
}

function buildImageCache() {
  if (typeof Image === "undefined") {
    return null;
  }
  const sources = new Set();
  Object.values(ACTOR_VISUALS).forEach((visual) => {
    (visual.frames || []).forEach((frame) => sources.add(frame.src));
  });
  Object.values(TILESET_VISUALS).forEach((frames) => {
    (frames || []).forEach((frame) => sources.add(frame.src));
  });
  Object.values(BOARD_PROP_VISUALS).forEach((visual) => {
    (visual.frames || []).forEach((frame) => sources.add(frame.src));
  });
  Object.values(ITEM_VISUALS).forEach((visual) => {
    (visual.frames || []).forEach((frame) => sources.add(frame.src));
  });
  return Object.fromEntries([...sources].map((src) => [src, loadImage(src)]));
}

function getImage(src) {
  return imageCache ? imageCache[src] : null;
}

function resolveFrame(frame, tint = "") {
  if (!frame || !frame.src) {
    return null;
  }
  const image = getImage(frame.src);
  if (!isImageReady(image)) {
    return null;
  }
  if (!tint) {
    return image;
  }
  const cacheKey = `${frame.src}:${frame.x}:${frame.y}:${frame.width}:${frame.height}:${tint}`;
  if (tintedFrameCache[cacheKey]) {
    return tintedFrameCache[cacheKey];
  }
  const canvas = createCanvas(frame.width, frame.height);
  if (!canvas) {
    return image;
  }
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, frame.x || 0, frame.y || 0, frame.width, frame.height, 0, 0, frame.width, frame.height);
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = tint;
  ctx.globalAlpha = 0.38;
  ctx.fillRect(0, 0, frame.width, frame.height);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  tintedFrameCache[cacheKey] = canvas;
  return canvas;
}

function drawFrame(ctx, frame, dx, dy, width, height, options = {}) {
  if (!frame) {
    return false;
  }
  const source = resolveFrame(frame, options.tint || "");
  if (!source) {
    return false;
  }
  const sx = frame.x || 0;
  const sy = frame.y || 0;
  const sw = frame.width || source.width;
  const sh = frame.height || source.height;
  if (source === getImage(frame.src)) {
    ctx.drawImage(source, sx, sy, sw, sh, dx, dy, width, height);
  } else {
    ctx.drawImage(source, 0, 0, sw, sh, dx, dy, width, height);
  }
  return true;
}

function drawGlyphVisual(ctx, glyph, dx, dy, width, height, options = {}) {
  if (!glyph) {
    return false;
  }
  const x = Math.round(dx);
  const y = Math.round(dy);
  const w = Math.max(6, Math.round(width));
  const h = Math.max(6, Math.round(height));
  const midX = x + Math.round(w / 2);
  const accent = options.tint || "#d6ccb8";
  const dark = shadeColor(accent, -58);
  const deep = shadeColor(accent, -78);
  const light = shadeColor(accent, 18);
  const bright = shadeColor(accent, 38);

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  switch (glyph) {
    case "rescueBanner":
    case "routePennant":
      ctx.fillStyle = "#6f5738";
      ctx.fillRect(x + 1, y + 1, 2, h - 2);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(x + 3, y + 2);
      ctx.lineTo(x + w - 3, y + 4);
      ctx.lineTo(x + Math.round(w * 0.62), y + Math.round(h * 0.48));
      ctx.lineTo(x + w - 5, y + h - 4);
      ctx.lineTo(x + 3, y + h - 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.fillRect(x + Math.round(w * 0.55), y + Math.round(h * 0.38), 2, Math.max(3, Math.round(h * 0.28)));
      break;
    case "prisonerCell":
      ctx.fillStyle = "#687280";
      ctx.fillRect(x + 1, y + 2, w - 2, h - 4);
      ctx.fillStyle = deep;
      ctx.fillRect(x + 3, y + 4, w - 6, h - 8);
      ctx.fillStyle = light;
      for (let bar = x + 5; bar <= x + w - 5; bar += 4) {
        ctx.fillRect(bar, y + 3, 1, h - 6);
      }
      ctx.fillRect(x + 3, y + 5, w - 6, 1);
      ctx.fillRect(x + 3, y + h - 6, w - 6, 1);
      ctx.fillStyle = accent;
      ctx.fillRect(x + w - 6, y + Math.round(h / 2), 2, 3);
      break;
    case "broodNest":
      ctx.fillStyle = deep;
      ctx.beginPath();
      ctx.ellipse(midX, y + h - 5, Math.round(w * 0.34), Math.round(h * 0.17), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = dark;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(midX - 3, y + h - 5, 4, Math.PI * 0.2, Math.PI * 1.4);
      ctx.arc(midX + 3, y + h - 5, 4, Math.PI * 1.7, Math.PI * 0.8, true);
      ctx.stroke();
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.ellipse(midX - 4, y + h - 8, 2, 3, 0, 0, Math.PI * 2);
      ctx.ellipse(midX + 1, y + h - 9, 2, 3, 0, 0, Math.PI * 2);
      ctx.ellipse(midX + 5, y + h - 7, 2, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "shrineSeal":
    case "routeSeal":
    case "routeRitual":
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(midX, y + Math.round(h / 2), Math.max(4, Math.round(w * 0.28)), 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = dark;
      ctx.beginPath();
      ctx.arc(midX, y + Math.round(h / 2), Math.max(2, Math.round(w * 0.15)), 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = light;
      ctx.fillRect(midX - 1, y + 2, 2, 3);
      ctx.fillRect(midX - 1, y + h - 5, 2, 3);
      ctx.fillRect(x + 2, y + Math.round(h / 2) - 1, 3, 2);
      ctx.fillRect(x + w - 5, y + Math.round(h / 2) - 1, 3, 2);
      if (glyph !== "routeSeal") {
        ctx.fillStyle = bright;
        ctx.fillRect(midX - 1, y + Math.round(h / 2) - 1, 2, 2);
      }
      break;
    case "relicPedestal":
      ctx.fillStyle = dark;
      ctx.fillRect(x + Math.round(w * 0.26), y + h - 5, Math.round(w * 0.48), 3);
      ctx.fillStyle = light;
      ctx.fillRect(x + Math.round(w * 0.32), y + Math.round(h * 0.46), Math.round(w * 0.36), Math.round(h * 0.3));
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(midX, y + 1);
      ctx.lineTo(x + Math.round(w * 0.66), y + Math.round(h * 0.28));
      ctx.lineTo(midX, y + Math.round(h * 0.45));
      ctx.lineTo(x + Math.round(w * 0.34), y + Math.round(h * 0.28));
      ctx.closePath();
      ctx.fill();
      break;
    case "loreBook":
    case "spellbookItem":
    case "routeJournal":
      ctx.fillStyle = dark;
      ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
      ctx.fillStyle = accent;
      ctx.fillRect(x + 5, y + 4, w - 8, h - 8);
      ctx.fillStyle = light;
      ctx.fillRect(midX - 1, y + 5, 2, h - 10);
      ctx.fillRect(x + 7, y + 7, w - 14, 1);
      ctx.fillRect(x + 7, y + 10, w - 14, 1);
      break;
    case "inscribedStone":
    case "routeCairn":
      ctx.fillStyle = dark;
      if (glyph === "routeCairn") {
        ctx.fillRect(midX - 4, y + h - 4, 8, 2);
        ctx.fillRect(midX - 3, y + h - 7, 6, 2);
        ctx.fillRect(midX - 2, y + h - 10, 4, 2);
      } else {
        ctx.fillRect(x + Math.round(w * 0.28), y + 2, Math.round(w * 0.44), h - 4);
        ctx.fillStyle = light;
        ctx.fillRect(x + Math.round(w * 0.34), y + 4, Math.round(w * 0.32), h - 8);
        ctx.fillStyle = accent;
        ctx.fillRect(midX - 1, y + 6, 2, h - 12);
        ctx.fillRect(x + Math.round(w * 0.38), y + 8, Math.round(w * 0.24), 1);
        ctx.fillRect(x + Math.round(w * 0.4), y + 12, Math.round(w * 0.2), 1);
      }
      break;
    case "barricade":
    case "routeBarricade":
      ctx.fillStyle = dark;
      ctx.fillRect(x + 3, y + 4, w - 6, 3);
      ctx.fillRect(x + 2, y + h - 7, w - 4, 3);
      ctx.save();
      ctx.translate(midX, y + Math.round(h / 2));
      ctx.rotate(-0.42);
      ctx.fillStyle = accent;
      ctx.fillRect(-Math.round(w * 0.32), -2, Math.round(w * 0.64), 4);
      ctx.rotate(0.84);
      ctx.fillRect(-Math.round(w * 0.32), -2, Math.round(w * 0.64), 4);
      ctx.restore();
      break;
    case "archiveStack":
      ctx.fillStyle = dark;
      ctx.fillRect(x + 3, y + h - 5, w - 6, 3);
      ctx.fillStyle = accent;
      ctx.fillRect(x + 4, y + h - 9, w - 8, 3);
      ctx.fillStyle = light;
      ctx.fillRect(x + 6, y + h - 13, w - 10, 3);
      ctx.fillStyle = bright;
      ctx.fillRect(x + 6, y + 4, Math.round(w * 0.4), 4);
      ctx.fillStyle = dark;
      ctx.fillRect(x + Math.round(w * 0.54), y + 6, Math.round(w * 0.22), 1);
      break;
    case "beaconFocus":
    case "routeBeacon":
      ctx.fillStyle = dark;
      ctx.fillRect(midX - 2, y + Math.round(h * 0.42), 4, h - Math.round(h * 0.42) - 2);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(midX, y + 2);
      ctx.lineTo(x + Math.round(w * 0.72), y + Math.round(h * 0.42));
      ctx.lineTo(x + Math.round(w * 0.58), y + Math.round(h * 0.58));
      ctx.lineTo(x + Math.round(w * 0.42), y + Math.round(h * 0.58));
      ctx.lineTo(x + Math.round(w * 0.28), y + Math.round(h * 0.42));
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = bright;
      ctx.fillRect(midX - 1, y + 1, 2, 3);
      break;
    case "well":
    case "routeWater":
    case "flaskItem":
      if (glyph === "flaskItem") {
        ctx.fillStyle = dark;
        ctx.fillRect(midX - 2, y + 2, 4, 3);
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.moveTo(midX - 4, y + 5);
        ctx.lineTo(midX + 4, y + 5);
        ctx.lineTo(midX + 6, y + h - 4);
        ctx.lineTo(midX - 6, y + h - 4);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = dark;
        ctx.fillRect(x + 4, y + Math.round(h * 0.58), w - 8, 3);
        ctx.strokeStyle = light;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(midX, y + Math.round(h * 0.5), Math.max(4, Math.round(w * 0.26)), 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = accent;
        ctx.fillRect(midX - 4, y + Math.round(h * 0.44), 8, 3);
      }
      break;
    case "routeTorch":
      ctx.fillStyle = dark;
      ctx.fillRect(midX - 1, y + 5, 2, h - 8);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(midX, y + 1);
      ctx.lineTo(midX + 4, y + 6);
      ctx.lineTo(midX, y + 8);
      ctx.lineTo(midX - 4, y + 6);
      ctx.closePath();
      ctx.fill();
      break;
    case "routeRune":
    case "routeMark":
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 3, y + h - 4);
      ctx.lineTo(midX, y + 3);
      ctx.lineTo(x + w - 3, y + h - 4);
      ctx.stroke();
      if (glyph === "routeRune") {
        ctx.fillStyle = light;
        ctx.fillRect(midX - 1, y + Math.round(h * 0.45), 2, 3);
      }
      break;
    case "routeLamp":
      ctx.strokeStyle = dark;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(midX, y + 1);
      ctx.lineTo(midX, y + 4);
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fillRect(midX - 3, y + 4, 6, 6);
      ctx.fillStyle = bright;
      ctx.fillRect(midX - 1, y + 6, 2, 2);
      break;
    case "routeSupply":
      ctx.fillStyle = dark;
      ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 4.5, y + 4.5, w - 9, h - 9);
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 6);
      ctx.lineTo(x + w - 6, y + h - 6);
      ctx.moveTo(x + w - 6, y + 6);
      ctx.lineTo(x + 6, y + h - 6);
      ctx.stroke();
      break;
    case "routeTracks":
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.ellipse(midX - 3, y + Math.round(h * 0.38), 2, 3, -0.35, 0, Math.PI * 2);
      ctx.ellipse(midX + 3, y + Math.round(h * 0.62), 2, 3, 0.35, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "shieldItem":
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(midX, y + 2);
      ctx.lineTo(x + w - 4, y + 5);
      ctx.lineTo(x + w - 5, y + Math.round(h * 0.62));
      ctx.lineTo(midX, y + h - 2);
      ctx.lineTo(x + 5, y + Math.round(h * 0.62));
      ctx.lineTo(x + 4, y + 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(midX, y + 4);
      ctx.lineTo(x + w - 6, y + 6);
      ctx.lineTo(x + w - 7, y + Math.round(h * 0.58));
      ctx.lineTo(midX, y + h - 4);
      ctx.lineTo(x + 7, y + Math.round(h * 0.58));
      ctx.lineTo(x + 6, y + 6);
      ctx.closePath();
      ctx.fill();
      break;
    case "relicItem":
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(midX, y + 1);
      ctx.lineTo(x + w - 5, y + Math.round(h * 0.34));
      ctx.lineTo(midX + 1, y + h - 2);
      ctx.lineTo(x + 5, y + Math.round(h * 0.34));
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = bright;
      ctx.fillRect(midX - 1, y + 4, 2, Math.round(h * 0.42));
      break;
    default:
      ctx.restore();
      return false;
  }

  ctx.restore();
  return true;
}

function drawConfiguredVisual(ctx, visual, dx, dy, width, height, time = 0, options = {}) {
  if (!visual) {
    return false;
  }
  if (visual.frames?.length) {
    const frameIndex = visual.frames.length <= 1 ? 0 : Math.floor(time / 220) % visual.frames.length;
    return drawFrame(ctx, visual.frames[frameIndex], dx, dy, width, height, options);
  }
  if (visual.glyph) {
    return drawGlyphVisual(ctx, visual.glyph, dx, dy, width, height, options);
  }
  return false;
}

function drawSpriteVisual(ctx, visual, sx, sy, time = 0, options = {}) {
  if (!visual?.frames?.length) {
    return false;
  }
  const frameCount = visual.frames.length;
  const frameIndex = frameCount <= 1 ? 0 : Math.floor(time / 220) % frameCount;
  const frame = visual.frames[frameIndex];
  const tileX = sx * TILE_SIZE;
  const tileY = sy * TILE_SIZE;
  const bob = options.reducedMotion ? 0 : Math.sin((time + sx * 35 + sy * 41) / 190) * (visual.bob || 0.3);
  const scale = visual.scale || 0.72;
  const width = Math.round(TILE_SIZE * scale);
  const height = Math.round(TILE_SIZE * scale);
  const dx = tileX + Math.round((TILE_SIZE - width) / 2);
  const dy = tileY + TILE_SIZE - height - 2 + bob;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "rgba(6, 8, 10, 0.18)";
  ctx.beginPath();
  ctx.ellipse(tileX + 12, tileY + 19, 5, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  drawFrame(ctx, frame, dx, dy, width, height, { tint: options.tint || visual.tint || "" });
  ctx.restore();
  return true;
}

function tileHash(x, y, modulo) {
  const hash = ((x * 73856093) ^ (y * 19349663)) >>> 0;
  return modulo > 0 ? hash % modulo : 0;
}

function fillStipple(ctx, x, y, width, height, baseColor, speckColor, step = 5, offsetSeed = 0) {
  ctx.fillStyle = baseColor;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = speckColor;
  for (let py = y + ((offsetSeed % step) + 1); py < y + height; py += step) {
    for (let px = x + (((offsetSeed * 2) % step) + 1); px < x + width; px += step) {
      ctx.fillRect(px, py, 1, 1);
    }
  }
}

function drawTownCivicTile(ctx, tile, worldX, worldY, sx, sy, visible) {
  const x = sx * TILE_SIZE;
  const y = sy * TILE_SIZE;
  const seed = tileHash(worldX, worldY, 13);
  if (tile.kind !== "stone" && tile.kind !== "plaza") {
    return false;
  }

  const stoneBase = visible ? (seed % 2 === 0 ? "#857a69" : "#7a7060") : "#4e473c";
  const stoneSpeck = visible ? "#5e5548" : "#2f2a24";
  const plazaBase = visible ? (seed % 2 === 0 ? "#c2b49a" : "#b7a98f") : "#6d6254";
  const plazaSpeck = visible ? "#8b7f6b" : "#433c33";
  const base = tile.kind === "plaza" ? plazaBase : stoneBase;
  const speck = tile.kind === "plaza" ? plazaSpeck : stoneSpeck;

  fillStipple(ctx, x, y, TILE_SIZE, TILE_SIZE, base, speck, 6, seed);
  ctx.fillStyle = visible ? "rgba(255, 244, 218, 0.18)" : "rgba(255, 244, 218, 0.06)";
  ctx.fillRect(x, y, TILE_SIZE, 1);
  ctx.fillRect(x, y, 1, TILE_SIZE);
  ctx.fillStyle = visible ? "rgba(56, 47, 38, 0.22)" : "rgba(16, 13, 10, 0.16)";
  ctx.fillRect(x, y + TILE_SIZE - 1, TILE_SIZE, 1);
  ctx.fillRect(x + TILE_SIZE - 1, y, 1, TILE_SIZE);

  if (tile.kind === "plaza") {
    ctx.strokeStyle = visible ? "rgba(95, 82, 62, 0.32)" : "rgba(32, 26, 21, 0.22)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 3.5, y + 3.5, TILE_SIZE - 7, TILE_SIZE - 7);
    ctx.beginPath();
    ctx.moveTo(x + TILE_SIZE / 2, y + 3);
    ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE - 3);
    ctx.moveTo(x + 3, y + TILE_SIZE / 2);
    ctx.lineTo(x + TILE_SIZE - 3, y + TILE_SIZE / 2);
    ctx.stroke();
  } else {
    ctx.strokeStyle = visible ? "rgba(67, 57, 47, 0.24)" : "rgba(22, 18, 15, 0.2)";
    ctx.lineWidth = 1;
    if (seed % 3 === 0) {
      ctx.beginPath();
      ctx.moveTo(x + 4, y + 1);
      ctx.lineTo(x + 4, y + TILE_SIZE - 2);
      ctx.moveTo(x + 12, y + 1);
      ctx.lineTo(x + 12, y + TILE_SIZE - 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x + 1, y + 7);
      ctx.lineTo(x + TILE_SIZE - 2, y + 7);
      ctx.moveTo(x + 1, y + 15);
      ctx.lineTo(x + TILE_SIZE - 2, y + 15);
      ctx.stroke();
    }
  }

  if (!visible) {
    ctx.fillStyle = "rgba(5, 8, 7, 0.28)";
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  }
  return true;
}

function drawDungeonTerrainBase(ctx, tile, worldX, worldY, x, y, visible) {
  const seed = tileHash(worldX, worldY, 11);
  const floorTheme = DUNGEON_TERRAIN_THEME.floor;
  const wallTheme = DUNGEON_TERRAIN_THEME.wall;
  const stoneTheme = DUNGEON_TERRAIN_THEME.stone;
  const pillarTheme = DUNGEON_TERRAIN_THEME.pillar;
  const fog = DUNGEON_TERRAIN_THEME.fog;
  switch (tile.kind) {
    case "floor":
    case "secretDoor":
    case "trap":
    case "altar":
    case "fountain":
    case "throne":
    case "stairDown":
    case "stairUp":
      fillStipple(ctx, x, y, TILE_SIZE, TILE_SIZE, seed % 2 === 0 ? floorTheme.base : floorTheme.alt, floorTheme.speck, 5, seed);
      ctx.fillStyle = floorTheme.line;
      ctx.fillRect(x, y, TILE_SIZE, 1);
      break;
    case "stone":
    case "plaza":
    case "buildingFloor":
      fillStipple(ctx, x, y, TILE_SIZE, TILE_SIZE, seed % 2 === 0 ? stoneTheme.base : stoneTheme.alt, stoneTheme.line, 6, seed);
      break;
    case "wall":
    case "buildingWall":
    case "secretWall":
      ctx.fillStyle = seed % 2 === 0 ? wallTheme.base : wallTheme.alt;
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = wallTheme.top;
      ctx.fillRect(x, y, TILE_SIZE, 3);
      ctx.fillStyle = wallTheme.shadow;
      ctx.fillRect(x, y + TILE_SIZE - 3, TILE_SIZE, 3);
      ctx.fillRect(x + TILE_SIZE - 3, y, 3, TILE_SIZE);
      break;
    case "pillar":
      ctx.fillStyle = seed % 2 === 0 ? pillarTheme.base : pillarTheme.alt;
      ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      ctx.fillStyle = "#e4e7eb";
      ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, 2);
      ctx.fillStyle = pillarTheme.shadow;
      ctx.fillRect(x + 2, y + TILE_SIZE - 4, TILE_SIZE - 4, 2);
      break;
    default:
      return false;
  }
  if (!visible) {
    ctx.fillStyle = fog.wash;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = fog.speck;
    for (let py = y + 2; py < y + TILE_SIZE; py += 4) {
      for (let px = x + ((py + seed) % 3); px < x + TILE_SIZE; px += 4) {
        ctx.fillRect(px, py, 1, 1);
      }
    }
  }
  return true;
}

function getTileKind(level, x, y) {
  if (!level || x < 0 || y < 0 || x >= level.width || y >= level.height) {
    return null;
  }
  const tile = level.tiles[y * level.width + x];
  return tile ? tile.kind : null;
}

function isRoadTile(level, x, y) {
  return getTileKind(level, x, y) === "road";
}

function isDoorTile(level, x, y) {
  return getTileKind(level, x, y) === "buildingDoor";
}

function getTownBuildingAt(level, x, y) {
  if (!level || level.kind !== "town" || !level.buildings) {
    return null;
  }
  return level.buildings.find((building) =>
    x >= building.x &&
    x < building.x + building.w &&
    y >= building.y &&
    y < building.y + building.h &&
    TOWN_BUILDING_ASSETS[building.service]
  ) || null;
}

function drawTownBuildingBase(ctx, building, tile, worldX, worldY, sx, sy, visible) {
  const x = sx * TILE_SIZE;
  const y = sy * TILE_SIZE;
  const outer = visible ? "#6a563e" : "#3d3326";
  const inner = visible ? "#c2a47a" : "#736248";
  const trim = visible ? "#8c724f" : "#544634";
  ctx.fillStyle = outer;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = inner;
  ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);

  if (worldX === building.x) {
    ctx.fillStyle = trim;
    ctx.fillRect(x, y, 2, TILE_SIZE);
  }
  if (worldX === building.x + building.w - 1) {
    ctx.fillStyle = trim;
    ctx.fillRect(x + TILE_SIZE - 2, y, 2, TILE_SIZE);
  }
  if (worldY === building.y) {
    ctx.fillStyle = trim;
    ctx.fillRect(x, y, TILE_SIZE, 2);
  }
  if (worldY === building.y + building.h - 1) {
    ctx.fillStyle = trim;
    ctx.fillRect(x, y + TILE_SIZE - 2, TILE_SIZE, 2);
  }

  ctx.fillStyle = visible ? "rgba(104, 74, 35, 0.26)" : "rgba(28, 20, 10, 0.2)";
  ctx.fillRect(x + 4, y + 5, 4, 3);
  ctx.fillRect(x + 13, y + 9, 3, 3);
  ctx.fillRect(x + 9, y + 15, 2, 2);

  if (tile.kind === "buildingDoor") {
    ctx.fillStyle = visible ? "#5e3b1d" : "#3c2613";
    ctx.fillRect(x + 8, y + 7, 8, 11);
    ctx.fillStyle = visible ? "#d1b07a" : "#8e7850";
    ctx.fillRect(x + 10, y + 8, 4, 8);
    ctx.fillStyle = visible ? "#8e6c41" : "#665238";
    ctx.fillRect(x + 5, y + TILE_SIZE - 4, 14, 3);
  }
}

function drawTownTerrainTile(ctx, level, tile, worldX, worldY, sx, sy, visible) {
  if (!townTerrainImages || level.kind !== "town") {
    return false;
  }
  if (drawTownCivicTile(ctx, tile, worldX, worldY, sx, sy, visible)) {
    return true;
  }
  let image = null;
  if (tile.kind === "grass") {
    const variants = townTerrainImages.grass;
    image = variants[tileHash(worldX, worldY, variants.length)];
  } else if (tile.kind === "road") {
    const north = isRoadTile(level, worldX, worldY - 1);
    const south = isRoadTile(level, worldX, worldY + 1);
    const east = isRoadTile(level, worldX + 1, worldY);
    const west = isRoadTile(level, worldX - 1, worldY);
    const verticalAffinity = north || south || isDoorTile(level, worldX, worldY - 1) || isDoorTile(level, worldX, worldY + 1);
    const horizontalAffinity = east || west || isDoorTile(level, worldX - 1, worldY) || isDoorTile(level, worldX + 1, worldY);
    if ((north || south) && (east || west)) {
      image = townTerrainImages.roadCross;
    } else if (verticalAffinity && !horizontalAffinity) {
      const variants = townTerrainImages.roadVertical;
      image = variants[tileHash(worldX, worldY, variants.length)];
    } else {
      const variants = townTerrainImages.roadHorizontal;
      image = variants[tileHash(worldX, worldY, variants.length)];
    }
  }
  if (!isImageReady(image)) {
    return false;
  }
  const x = sx * TILE_SIZE;
  const y = sy * TILE_SIZE;
  ctx.drawImage(image, x, y, TILE_SIZE, TILE_SIZE);
  if (!visible) {
    ctx.fillStyle = "rgba(4, 8, 6, 0.42)";
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  }
  return true;
}

function drawTile(ctx, level, tile, worldX, worldY, sx, sy, visible) {
  const x = sx * TILE_SIZE;
  const y = sy * TILE_SIZE;
  if (tile.kind === "trap" && tile.hidden) {
    drawTile(ctx, level, tileDef("floor"), worldX, worldY, sx, sy, visible);
    return;
  }
  if ((tile.kind === "secretDoor" || tile.kind === "secretWall") && tile.hidden) {
    drawTile(ctx, level, tileDef("wall"), worldX, worldY, sx, sy, visible);
    return;
  }
  const overlayBuilding = getTownBuildingAt(level, worldX, worldY);
  if (overlayBuilding && (tile.kind === "buildingWall" || tile.kind === "buildingFloor" || tile.kind === "buildingDoor" || tile.kind === "sign")) {
    drawTownBuildingBase(ctx, overlayBuilding, tile, worldX, worldY, sx, sy, visible);
    return;
  }
  if (drawTownTerrainTile(ctx, level, tile, worldX, worldY, sx, sy, visible)) {
    return;
  }
  const usedDungeonTheme = level.kind !== "town" && drawDungeonTerrainBase(ctx, tile, worldX, worldY, x, y, visible);
  if (!usedDungeonTheme) {
    const baseKind = tile.kind === "secretDoor"
      ? "floor"
      : tile.kind === "altar" || tile.kind === "trap" || tile.kind === "fountain" || tile.kind === "throne" || tile.kind === "stairDown" || tile.kind === "stairUp"
        ? "floor"
        : tile.kind === "stone" || tile.kind === "plaza" || tile.kind === "buildingFloor"
          ? "stone"
          : tile.kind;
    const dungeonVisual = getTileVisual(baseKind, worldX, worldY);
    if (dungeonVisual && drawFrame(ctx, dungeonVisual, x, y, TILE_SIZE, TILE_SIZE)) {
      if (!visible) {
        ctx.fillStyle = "rgba(4, 6, 10, 0.46)";
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      }
    } else {
      const palette = visible ? tile.palette : tile.palette.map((color) => shadeColor(color, -90));
      ctx.fillStyle = palette[0];
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = palette[1];
      ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    }
  }
  const palette = visible ? tile.palette : tile.palette.map((color) => shadeColor(color, -90));
  switch (tile.kind) {
    case "wall":
    case "buildingWall":
    case "pillar":
      break;
    case "road":
    case "floor":
    case "buildingFloor":
    case "plaza":
    case "stone":
      if (visible) {
        ctx.fillStyle = "rgba(255, 248, 236, 0.03)";
        ctx.fillRect(x, y, TILE_SIZE, 1);
      }
      break;
    case "tree":
      ctx.fillStyle = "#4e341b";
      ctx.fillRect(x + 10, y + 14, 4, 8);
      ctx.fillStyle = visible ? "#3b6b2c" : "#243f1a";
      ctx.beginPath();
      ctx.arc(x + 12, y + 10, 8, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "stairDown":
    case "stairUp":
      drawFrame(ctx, getTileVisual(tile.kind, worldX, worldY), x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      ctx.strokeStyle = tile.kind === "stairDown" ? DUNGEON_TERRAIN_THEME.interactable.stairDown : DUNGEON_TERRAIN_THEME.interactable.stairUp;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 2.5, y + 2.5, TILE_SIZE - 5, TILE_SIZE - 5);
      break;
    case "buildingDoor":
    case "secretDoor":
      ctx.fillStyle = "#6c4621";
      ctx.fillStyle = DUNGEON_TERRAIN_THEME.door.frame;
      ctx.fillRect(x + 6, y + 4, 12, 15);
      ctx.fillStyle = DUNGEON_TERRAIN_THEME.door.fill;
      ctx.fillRect(x + 8, y + 6, 8, 11);
      ctx.strokeStyle = visible ? DUNGEON_TERRAIN_THEME.door.trim : "rgba(132, 111, 72, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 6.5, y + 4.5, 11, 14);
      break;
    case "sign":
      ctx.fillStyle = "#6d4b22";
      ctx.fillRect(x + 10, y + 8, 4, 12);
      ctx.fillStyle = "#d3bc8d";
      ctx.fillRect(x + 5, y + 4, 14, 7);
      break;
    case "altar":
      drawFrame(ctx, getTileVisual("altar", worldX, worldY), x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      break;
    case "trap":
      drawFrame(ctx, getTileVisual("trap", worldX, worldY), x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      break;
    case "fountain":
      ctx.fillStyle = palette[2];
      ctx.fillRect(x + 6, y + 14, 12, 4);
      ctx.beginPath();
      ctx.arc(x + 12, y + 10, 5, Math.PI, 0);
      ctx.strokeStyle = palette[2];
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = visible ? "#d5f6ff" : palette[2];
      ctx.fillRect(x + 11, y + 8, 2, 3);
      break;
    case "throne":
      drawFrame(ctx, getTileVisual("throne", worldX, worldY), x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      break;
    default:
      break;
  }
  if (tile.roomEventId && visible) {
    ctx.save();
    ctx.strokeStyle = "rgba(238, 170, 92, 0.92)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 2.5, y + 2.5, TILE_SIZE - 5, TILE_SIZE - 5);
    ctx.restore();
  } else if (tile.discoveryId && visible) {
    ctx.save();
    ctx.fillStyle = "rgba(125, 193, 214, 0.92)";
    ctx.fillRect(x + TILE_SIZE - 6, y + 3, 3, 3);
    ctx.restore();
  }
}

function drawTownBuildings(ctx, level, view) {
  if (!townBuildingImages || !level || level.kind !== "town" || !level.buildings) {
    return;
  }
  for (const building of level.buildings) {
    const image = townBuildingImages[building.service];
    if (!isImageReady(image)) {
      continue;
    }
    const left = building.x - view.x;
    const top = building.y - view.y;
    const right = left + building.w;
    const bottom = top + building.h;
    if (right <= 0 || bottom <= 0 || left >= VIEW_SIZE || top >= VIEW_SIZE) {
      continue;
    }
    let anyVisible = false;
    for (let y = building.y; y < building.y + building.h && !anyVisible; y += 1) {
      for (let x = building.x; x < building.x + building.w; x += 1) {
        const tile = level.tiles[y * level.width + x];
        if (tile && level.visible[y * level.width + x]) {
          anyVisible = true;
          break;
        }
      }
    }
    const config = TOWN_BUILDING_RENDER[building.service] || { width: 0.78, height: 0.66, crop: 0.88, yOffset: 0.48 };
    const sourceHeight = Math.floor(image.naturalHeight * config.crop);
    const maxWidth = building.w * TILE_SIZE * config.width;
    const maxHeight = building.h * TILE_SIZE * config.height;
    const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / sourceHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = sourceHeight * scale;
    const drawX = left * TILE_SIZE + (building.w * TILE_SIZE - drawWidth) / 2;
    const drawY = top * TILE_SIZE + TILE_SIZE * config.yOffset;
    ctx.save();
    ctx.fillStyle = anyVisible ? "rgba(0, 0, 0, 0.14)" : "rgba(0, 0, 0, 0.08)";
    ctx.fillRect(left * TILE_SIZE + 6, top * TILE_SIZE + building.h * TILE_SIZE - 12, building.w * TILE_SIZE - 12, 9);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = anyVisible ? 0.96 : 0.45;
    ctx.drawImage(image, 0, 0, image.naturalWidth, sourceHeight, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();

    const doorX = building.x + Math.floor(building.w / 2) - view.x;
    const doorY = building.y + building.h - 1 - view.y;
    if (doorX < 0 || doorY < 0 || doorX >= VIEW_SIZE || doorY >= VIEW_SIZE) {
      continue;
    }
    const label = building.label || building.name || building.service || "Service";
    ctx.save();
    ctx.font = "700 10px Trebuchet MS";
    const pillWidth = Math.min(building.w * TILE_SIZE - 6, Math.max(62, ctx.measureText(label).width + 18));
    const pillX = left * TILE_SIZE + (building.w * TILE_SIZE - pillWidth) / 2;
    const pillY = top * TILE_SIZE + 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = anyVisible ? "rgba(17, 23, 28, 0.94)" : "rgba(17, 23, 28, 0.66)";
    ctx.strokeStyle = anyVisible ? "rgba(246, 224, 182, 0.82)" : "rgba(246, 224, 182, 0.42)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillWidth, 16, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = anyVisible ? "#fff0cf" : "rgba(255, 240, 207, 0.82)";
    ctx.fillText(label, pillX + pillWidth / 2, pillY + 8);
    ctx.restore();
  }
}

function drawBoardProps(ctx, level, view, time = 0, options = {}) {
  if (!level?.props || level.props.length === 0) {
    return;
  }
  const reducedMotion = Boolean(options.reducedMotion);
  level.props.forEach((prop, index) => {
    const visual = getBoardPropVisual(prop.propId);
    if (!visual) {
      return;
    }
    const sx = prop.x - view.x;
    const sy = prop.y - view.y;
    if (sx < 0 || sy < 0 || sx >= VIEW_SIZE || sy >= VIEW_SIZE) {
      return;
    }
    if (level.kind !== "town" && !level.visible[prop.y * level.width + prop.x] && !prop.alwaysVisible) {
      return;
    }
    const glowEnabled = prop.light !== undefined ? prop.light : visual.light;
    if (glowEnabled) {
      const cx = sx * TILE_SIZE + 12;
      const cy = sy * TILE_SIZE + 12;
      const pulse = reducedMotion ? 0.18 : 0.16 + (Math.sin((time + index * 45) / 170) + 1) * 0.05;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, TILE_SIZE * 0.95);
      glow.addColorStop(0, rgbaWithAlpha(prop.tint || visual.tint || "rgba(255, 199, 128, 0.36)", pulse));
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(sx * TILE_SIZE - 6, sy * TILE_SIZE - 6, TILE_SIZE + 12, TILE_SIZE + 12);
    }
    if (!visual.frames?.length && !visual.glyph) {
      return;
    }
    const lift = Math.round((visual.lift || 0) * TILE_SIZE);
    const scale = visual.scale || 0.68;
    const size = Math.round(TILE_SIZE * scale);
    const offset = Math.round((TILE_SIZE - size) / 2);
    drawConfiguredVisual(ctx, visual, sx * TILE_SIZE + offset, sy * TILE_SIZE + TILE_SIZE - size - 2 - lift, size, size, time, {
      tint: prop.tint || visual.tint || ""
    });
  });
  const corpses = Array.isArray(level?.corpses) ? level.corpses : [];
  corpses.forEach((corpse) => {
    const sx = corpse.x - view.x;
    const sy = corpse.y - view.y;
    if (sx < 0 || sy < 0 || sx >= VIEW_SIZE || sy >= VIEW_SIZE) {
      return;
    }
    if (level.kind !== "town" && !level.visible[corpse.y * level.width + corpse.x]) {
      return;
    }
    ctx.save();
    ctx.strokeStyle = "rgba(110, 62, 86, 0.82)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx * TILE_SIZE + 7, sy * TILE_SIZE + 7);
    ctx.lineTo(sx * TILE_SIZE + 17, sy * TILE_SIZE + 17);
    ctx.moveTo(sx * TILE_SIZE + 17, sy * TILE_SIZE + 7);
    ctx.lineTo(sx * TILE_SIZE + 7, sy * TILE_SIZE + 17);
    ctx.stroke();
    ctx.restore();
  });
}

function drawPlayer(ctx, player, sx, sy, time = 0, options = {}) {
  const x = sx * TILE_SIZE;
  const y = sy * TILE_SIZE;
  const reducedMotion = Boolean(options.reducedMotion);
  const pulse = reducedMotion ? 0.2 : 0.17 + (Math.sin(time / 220) + 1) * 0.06;
  const glow = ctx.createRadialGradient(x + 12, y + 12, 0, x + 12, y + 12, 12);
  glow.addColorStop(0, `rgba(255, 219, 126, ${pulse})`);
  glow.addColorStop(1, "rgba(255, 219, 126, 0)");
  ctx.save();
  ctx.fillStyle = glow;
  ctx.fillRect(x - 3, y - 3, TILE_SIZE + 6, TILE_SIZE + 6);
  ctx.strokeStyle = `rgba(255, 228, 162, ${reducedMotion ? 0.42 : 0.34 + pulse * 0.3})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 2.5, y + 2.5, TILE_SIZE - 5, TILE_SIZE - 5);
  ctx.restore();
  const visual = getActorVisual(player.classId) || getActorVisual(player.raceId) || getActorVisual("fighter");
  if (!drawSpriteVisual(ctx, visual, sx, sy, time, options)) {
    ctx.fillStyle = "#f0d271";
    ctx.beginPath();
    ctx.arc(x + 12, y + 7, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#254c93";
    ctx.fillRect(x + 8, y + 11, 8, 9);
    ctx.fillStyle = "#7b1f1f";
    ctx.fillRect(x + 7, y + 18, 4, 4);
    ctx.fillRect(x + 13, y + 18, 4, 4);
    if (player.equipment.weapon) {
      ctx.fillStyle = "#d0d0d0";
      ctx.fillRect(x + 17, y + 10, 2, 10);
    }
  }
}

function drawMonster(ctx, monster, sx, sy, time = 0, options = {}) {
  const x = sx * TILE_SIZE;
  const y = sy * TILE_SIZE;
  const reducedMotion = Boolean(options.reducedMotion);
  const intentColor = monster.intent?.color || monster.color || "#c94a4a";
  const auraAlpha = reducedMotion ? 0.12 : 0.1 + (Math.sin((time + sx * 40 + sy * 30) / 180) + 1) * 0.05;
  const aura = ctx.createRadialGradient(x + 12, y + 12, 0, x + 12, y + 12, 11);
  aura.addColorStop(0, rgbaWithAlpha(intentColor, auraAlpha));
  aura.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.save();
  ctx.fillStyle = aura;
  ctx.fillRect(x - 2, y - 2, TILE_SIZE + 4, TILE_SIZE + 4);
  ctx.restore();
  const visual = getActorVisual(monster.visualId || monster.sprite);
  const drewSprite = drawSpriteVisual(ctx, visual, sx, sy, time, {
    ...options,
    tint: monster.color
  });
  if (!drewSprite) {
    ctx.fillStyle = monster.color;
    switch (monster.sprite) {
      case "rat":
        ctx.beginPath();
        ctx.ellipse(x + 11, y + 13, 7, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x + 16, y + 11, 5, 2);
        break;
      case "kobold":
      case "goblin":
      case "orc":
      case "troll":
      case "ogre":
        ctx.fillRect(x + 8, y + 9, 8, 10);
        ctx.fillRect(x + 9, y + 4, 6, 6);
        ctx.fillRect(x + 6, y + 18, 4, 4);
        ctx.fillRect(x + 14, y + 18, 4, 4);
        break;
      case "wolf":
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 14);
        ctx.lineTo(x + 10, y + 8);
        ctx.lineTo(x + 19, y + 12);
        ctx.lineTo(x + 17, y + 18);
        ctx.lineTo(x + 8, y + 18);
        ctx.closePath();
        ctx.fill();
        break;
      case "skeleton":
        ctx.fillRect(x + 10, y + 5, 4, 14);
        ctx.fillRect(x + 7, y + 9, 10, 3);
        ctx.beginPath();
        ctx.arc(x + 12, y + 5, 5, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "slime":
        ctx.beginPath();
        ctx.arc(x + 12, y + 13, 8, Math.PI, 0);
        ctx.lineTo(x + 20, y + 17);
        ctx.lineTo(x + 4, y + 17);
        ctx.closePath();
        ctx.fill();
        break;
      case "wraith":
        ctx.beginPath();
        ctx.moveTo(x + 12, y + 4);
        ctx.lineTo(x + 18, y + 10);
        ctx.lineTo(x + 16, y + 19);
        ctx.lineTo(x + 12, y + 16);
        ctx.lineTo(x + 8, y + 19);
        ctx.lineTo(x + 6, y + 10);
        ctx.closePath();
        ctx.fill();
        break;
      case "mage":
        ctx.fillRect(x + 8, y + 7, 8, 12);
        ctx.beginPath();
        ctx.arc(x + 12, y + 6, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#d8d0f0";
        ctx.fillRect(x + 17, y + 8, 2, 10);
        break;
      case "dragon":
        ctx.beginPath();
        ctx.moveTo(x + 3, y + 16);
        ctx.lineTo(x + 8, y + 7);
        ctx.lineTo(x + 15, y + 5);
        ctx.lineTo(x + 21, y + 11);
        ctx.lineTo(x + 18, y + 18);
        ctx.lineTo(x + 10, y + 20);
        ctx.closePath();
        ctx.fill();
        break;
      default:
        ctx.fillRect(x + 8, y + 8, 8, 8);
        break;
    }
  }
  if (monster.elite) {
    ctx.save();
    ctx.strokeStyle = "rgba(246, 212, 117, 0.92)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 1.5, y + 1.5, TILE_SIZE - 3, TILE_SIZE - 3);
    ctx.restore();
  }
  const badge = monster.behaviorKit ? BEHAVIOR_BADGES[monster.behaviorKit] : null;
  if (badge) {
    ctx.save();
    ctx.fillStyle = "rgba(11, 13, 17, 0.86)";
    ctx.fillRect(x + TILE_SIZE - 10, y + 2, 8, 8);
    ctx.strokeStyle = badge.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + TILE_SIZE - 10.5, y + 1.5, 8, 8);
    ctx.fillStyle = badge.color;
    ctx.font = "bold 7px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(badge.symbol, x + TILE_SIZE - 6, y + 8);
    ctx.textAlign = "left";
    ctx.restore();
  }
}

function drawMonsterHealthBar(ctx, monster, sx, sy, options = {}) {
  const maxHp = Math.max(1, monster.maxHp || monster.hp || 1);
  const ratio = clamp((monster.hp || 0) / maxHp, 0, 1);
  const x = sx * TILE_SIZE + 2;
  const y = sy * TILE_SIZE + TILE_SIZE - 4;
  const width = TILE_SIZE - 4;
  ctx.save();
  ctx.fillStyle = "rgba(8, 10, 12, 0.82)";
  ctx.fillRect(x, y, width, 3);
  ctx.fillStyle = ratio >= 0.66 ? "#8fdaa0" : ratio >= 0.33 ? "#f2c267" : "#f07c67";
  ctx.fillRect(x, y, Math.max(1, Math.round(width * ratio)), 3);
  if (options.focused) {
    ctx.strokeStyle = "rgba(255, 214, 144, 0.78)";
    ctx.lineWidth = 1;
    ctx.strokeRect(sx * TILE_SIZE + 1.5, sy * TILE_SIZE + 1.5, TILE_SIZE - 3, TILE_SIZE - 3);
  }
  ctx.restore();
}

function drawItem(ctx, item, sx, sy, time = 0, options = {}) {
  const x = sx * TILE_SIZE;
  const y = sy * TILE_SIZE;
  const reducedMotion = Boolean(options.reducedMotion);
  const glowColor = item.kind === "gold" ? "rgba(235, 207, 96, 0.22)" : item.kind === "quest" ? "rgba(183, 240, 255, 0.24)" : "rgba(139, 205, 233, 0.18)";
  const pulse = reducedMotion ? 0.18 : 0.16 + (Math.sin((time + sx * 35 + sy * 27) / 150) + 1) * 0.08;
  const glow = ctx.createRadialGradient(x + 12, y + 12, 0, x + 12, y + 12, 10);
  glow.addColorStop(0, rgbaWithAlpha(glowColor, pulse));
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.save();
  ctx.fillStyle = glow;
  ctx.fillRect(x - 2, y - 2, TILE_SIZE + 4, TILE_SIZE + 4);
  ctx.restore();
  const itemVisualId = item.visualId
    || (item.kind === "gold" ? ITEM_VISUAL_IDS.gold : "")
    || (item.kind === "quest" ? ITEM_VISUAL_IDS.quest : "")
    || (item.kind === "weapon" ? ITEM_VISUAL_IDS.defaultWeapon : "")
    || (item.kind === "armor" ? ITEM_VISUAL_IDS.defaultArmor : "")
    || (item.kind === "charged" ? ITEM_VISUAL_IDS.defaultCharged : "")
    || (item.kind === "spellbook" ? ITEM_VISUAL_IDS.defaultSpellbook : "")
    || ITEM_VISUAL_IDS.defaultConsumable;
  const itemVisual = getItemVisual(itemVisualId);
  const itemSize = Math.round(TILE_SIZE * 0.62);
  const itemOffset = Math.round((TILE_SIZE - itemSize) / 2);
  if (itemVisual && drawConfiguredVisual(ctx, itemVisual, x + itemOffset, y + TILE_SIZE - itemSize - 3, itemSize, itemSize, time, {
    tint: itemVisual.tint || ""
  })) {
    return;
  }
  const color = item.kind === "consumable" ? "#9f3256" : item.kind === "spellbook" ? "#7040a8" : item.kind === "quest" ? "#b7f0ff" : item.kind === "charged" ? "#63a4d2" : "#c4c4c4";
  ctx.fillStyle = color;
  if (item.kind === "weapon") {
    ctx.fillRect(x + 11, y + 4, 2, 15);
    ctx.fillRect(x + 8, y + 5, 8, 2);
  } else if (item.kind === "armor") {
    ctx.fillRect(x + 8, y + 7, 8, 10);
    ctx.fillRect(x + 6, y + 9, 2, 7);
    ctx.fillRect(x + 16, y + 9, 2, 7);
  } else if (item.kind === "spellbook") {
    ctx.fillRect(x + 6, y + 6, 12, 12);
    ctx.fillStyle = "#d7caef";
    ctx.fillRect(x + 8, y + 8, 8, 8);
  } else if (item.kind === "charged") {
    ctx.fillRect(x + 10, y + 4, 4, 13);
    ctx.fillStyle = "#d7efff";
    ctx.fillRect(x + 8, y + 4, 8, 4);
  } else if (item.kind === "quest") {
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 4);
    ctx.lineTo(x + 18, y + 12);
    ctx.lineTo(x + 12, y + 20);
    ctx.lineTo(x + 6, y + 12);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(x + 12, y + 12, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function effectLife(effect, time) {
  if (!effect || !effect.until || !effect.created) {
    return 1;
  }
  return clamp((time - effect.created) / Math.max(1, effect.until - effect.created), 0, 1);
}

function screenTilePosition(value, offset) {
  return value * TILE_SIZE + offset;
}

function worldToScreen(world, view) {
  return {
    x: (world.x - view.x) * TILE_SIZE + TILE_SIZE / 2,
    y: (world.y - view.y) * TILE_SIZE + TILE_SIZE / 2
  };
}

function tileOnScreen(world, view) {
  const sx = world.x - view.x;
  const sy = world.y - view.y;
  return sx >= 0 && sy >= 0 && sx < VIEW_SIZE && sy < VIEW_SIZE;
}

function rgbaWithAlpha(color, alpha) {
  const match = typeof color === "string" ? color.match(/^rgba?\(([^)]+)\)$/i) : null;
  if (!match) {
    return color;
  }
  const channels = match[1].split(",").map((value) => value.trim());
  if (channels.length < 3) {
    return color;
  }
  return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${clamp(alpha, 0, 1)})`;
}

function drawBoardAtmosphere(ctx, level, view, time, options = {}) {
  if (!level) {
    return;
  }
  const reducedMotion = Boolean(options.reducedMotion);
  const depth = options.depth || 0;
  const firstTownRun = Boolean(options.firstTownRun);
  const overlay = level.kind === "town"
    ? { fill: "rgba(214, 170, 88, 0.035)" }
    : depth >= 6
      ? { fill: "rgba(77, 36, 72, 0.085)" }
      : depth >= 4
        ? { fill: "rgba(34, 74, 82, 0.075)" }
        : depth >= 2
          ? { fill: "rgba(40, 58, 86, 0.065)" }
          : { fill: "rgba(46, 52, 64, 0.05)" };

  ctx.save();
  ctx.fillStyle = overlay.fill;
  ctx.fillRect(0, 0, VIEW_SIZE * TILE_SIZE, VIEW_SIZE * TILE_SIZE);

  const drawRoomTint = (room, fill, stroke = "") => {
    if (!room) {
      return;
    }
    const left = (room.x - view.x) * TILE_SIZE;
    const top = (room.y - view.y) * TILE_SIZE;
    const width = room.w * TILE_SIZE;
    const height = room.h * TILE_SIZE;
    if (left + width <= 0 || top + height <= 0 || left >= VIEW_SIZE * TILE_SIZE || top >= VIEW_SIZE * TILE_SIZE) {
      return;
    }
    ctx.fillStyle = fill;
    ctx.fillRect(left, top, width, height);
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(left + 1, top + 1, width - 2, height - 2);
    }
  };

  if (level.floorObjective && !level.floorResolved && level.rooms?.[level.floorObjective.roomIndex]) {
    drawRoomTint(level.rooms[level.floorObjective.roomIndex], "rgba(255, 110, 78, 0.055)", "rgba(255, 166, 145, 0.16)");
  }
  if (level.floorOptional && !level.floorOptional.opened && level.rooms?.[level.floorOptional.roomIndex]) {
    drawRoomTint(level.rooms[level.floorOptional.roomIndex], "rgba(184, 116, 255, 0.04)", "rgba(214, 180, 255, 0.12)");
  }

  const pulseTime = reducedMotion ? 0.55 : 0.45 + Math.sin(time / 260) * 0.15;
  const featureColors = {
    stairDown: firstTownRun ? "rgba(255, 211, 107, 0.3)" : "rgba(255, 211, 107, 0.22)",
    stairUp: "rgba(127, 204, 255, 0.2)",
    fountain: "rgba(139, 205, 233, 0.22)",
    throne: "rgba(214, 170, 88, 0.22)",
    altar: "rgba(212, 168, 255, 0.24)"
  };

  for (let sy = 0; sy < VIEW_SIZE; sy += 1) {
    for (let sx = 0; sx < VIEW_SIZE; sx += 1) {
      const x = view.x + sx;
      const y = view.y + sy;
      const tile = level.tiles[y * level.width + x];
      if (!tile || !level.visible[y * level.width + x] || !featureColors[tile.kind]) {
        continue;
      }
      const cx = screenTilePosition(sx, 12);
      const cy = screenTilePosition(sy, 12);
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, TILE_SIZE * 0.8);
      gradient.addColorStop(0, rgbaWithAlpha(featureColors[tile.kind], pulseTime));
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(sx * TILE_SIZE, sy * TILE_SIZE, TILE_SIZE, TILE_SIZE);

      if (firstTownRun && tile.kind === "stairDown" && level.kind === "town") {
        ctx.fillStyle = "rgba(255, 228, 162, 0.9)";
        ctx.beginPath();
        ctx.moveTo(sx * TILE_SIZE + 12, sy * TILE_SIZE + 6);
        ctx.lineTo(sx * TILE_SIZE + 7, sy * TILE_SIZE + 12);
        ctx.lineTo(sx * TILE_SIZE + 10, sy * TILE_SIZE + 12);
        ctx.lineTo(sx * TILE_SIZE + 10, sy * TILE_SIZE + 17);
        ctx.lineTo(sx * TILE_SIZE + 14, sy * TILE_SIZE + 17);
        ctx.lineTo(sx * TILE_SIZE + 14, sy * TILE_SIZE + 12);
        ctx.lineTo(sx * TILE_SIZE + 17, sy * TILE_SIZE + 12);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  const drawMarkerBeacon = (marker, color) => {
    if (!marker || !tileOnScreen(marker, view)) {
      return;
    }
    const sx = marker.x - view.x;
    const sy = marker.y - view.y;
    const cx = screenTilePosition(sx, 12);
    const cy = screenTilePosition(sy, 12);
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, TILE_SIZE * 1.3);
    gradient.addColorStop(0, rgbaWithAlpha(color, reducedMotion ? 0.18 : 0.22 + Math.sin(time / 130) * 0.04));
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(sx * TILE_SIZE - 8, sy * TILE_SIZE - 8, TILE_SIZE + 16, TILE_SIZE + 16);
  };

  drawMarkerBeacon(level.floorObjective && !level.floorResolved ? level.floorObjective.marker : null, "rgba(255, 124, 92, 0.55)");
  drawMarkerBeacon(level.floorOptional && !level.floorOptional.opened ? level.floorOptional.marker : null, "rgba(194, 138, 255, 0.48)");
  ctx.restore();
}

function drawBoardVignette(ctx, hpRatio, time, options = {}) {
  if (hpRatio >= 0.42) {
    return;
  }
  const boardSize = VIEW_SIZE * TILE_SIZE;
  const center = boardSize / 2;
  const reducedMotion = Boolean(options.reducedMotion);
  const pulse = reducedMotion ? 0.14 : 0.12 + Math.sin(time / 210) * 0.03;
  const alpha = clamp(((0.42 - hpRatio) / 0.42) * 0.22 + pulse, 0.12, 0.34);
  const gradient = ctx.createRadialGradient(center, center, boardSize * 0.2, center, center, boardSize * 0.7);
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(0.72, `rgba(64, 0, 0, ${alpha * 0.45})`);
  gradient.addColorStop(1, `rgba(84, 0, 0, ${alpha})`);
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, boardSize, boardSize);
  ctx.restore();
}

function drawBoardBurdenVignette(ctx, burdenRatio, time, options = {}) {
  if (burdenRatio < 0.95) {
    return;
  }
  const boardSize = VIEW_SIZE * TILE_SIZE;
  const center = boardSize / 2;
  const reducedMotion = Boolean(options.reducedMotion);
  const base = burdenRatio > 1 ? 0.2 : 0.12;
  const pulse = reducedMotion ? base : base + Math.sin(time / 190) * 0.03;
  const alpha = clamp(pulse + Math.max(0, burdenRatio - 0.95) * 0.5, 0.1, 0.32);
  const gradient = ctx.createRadialGradient(center, center, boardSize * 0.24, center, center, boardSize * 0.72);
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(0.7, `rgba(117, 67, 0, ${alpha * 0.45})`);
  gradient.addColorStop(1, `rgba(168, 72, 0, ${alpha})`);
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, boardSize, boardSize);
  ctx.restore();
}

function drawMonsterIntent(ctx, monster, sx, sy, time = 0, options = {}) {
  if (!monster.intent || !monster.intent.symbol) {
    return;
  }
  const x = sx * TILE_SIZE;
  const y = sy * TILE_SIZE;
  const reducedMotion = Boolean(options.reducedMotion);
  const pulsingThreat = ["shoot", "charge", "summon"].includes(monster.intent.type);
  const player = options.player || null;
  if (player && (monster.intent.type === "shoot" || monster.intent.type === "charge")) {
    const lineColor = monster.intent.type === "shoot" ? "rgba(255, 208, 111, 0.28)" : "rgba(255, 128, 96, 0.34)";
    ctx.save();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = monster.intent.type === "shoot" ? 2 : 3;
    if (!reducedMotion) {
      ctx.setLineDash(monster.intent.type === "shoot" ? [4, 4] : [7, 3]);
      ctx.lineDashOffset = -time / 45;
    }
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 12);
    ctx.lineTo((player.x - options.view.x) * TILE_SIZE + 12, (player.y - options.view.y) * TILE_SIZE + 12);
    ctx.stroke();
    ctx.restore();
  }
  if (pulsingThreat) {
    ctx.save();
    ctx.fillStyle = monster.intent.color || "#f2deb1";
    ctx.globalAlpha = reducedMotion ? 0.12 : 0.1 + (Math.sin(time / 140) + 1) * 0.06;
    ctx.beginPath();
    ctx.arc(x + 7, y + 6, reducedMotion ? 8 : 7.5 + Math.sin(time / 140) * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = "rgba(8, 10, 12, 0.82)";
  ctx.fillRect(x + 2, y + 1, 10, 10);
  ctx.fillStyle = monster.intent.color || "#f2deb1";
  ctx.font = "bold 10px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText(monster.intent.symbol, x + 7, y + 10);
  if (monster.elite) {
    ctx.strokeStyle = "rgba(246, 212, 117, 0.88)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 1.5, y + 0.5, 11, 11);
  }
  ctx.textAlign = "left";
}

function drawCenteredText(ctx, text, x, y, color) {
  ctx.fillStyle = color;
  ctx.font = "18px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText(text, x, y);
  ctx.textAlign = "left";
}

function drawTargetCursor(ctx, cursor, view, source = null, time = 0, options = {}) {
  const sx = cursor.x - view.x;
  const sy = cursor.y - view.y;
  if (sx < 0 || sy < 0 || sx >= VIEW_SIZE || sy >= VIEW_SIZE) {
    return;
  }
  const reducedMotion = Boolean(options.reducedMotion);
  const targetPreview = options.targetPreview || null;
  const previewValid = targetPreview ? targetPreview.valid : true;
  const previewColor = targetPreview?.spell?.previewColor || targetPreview?.spell?.effectColor || "#ffd36b";
  const cursorColor = previewValid ? previewColor : "#ff8f73";
  const pulse = reducedMotion ? 0.22 : 0.18 + (Math.sin(time / 110) + 1) * 0.08;
  if (Array.isArray(targetPreview?.tiles) && targetPreview.tiles.length > 0) {
    ctx.save();
    targetPreview.tiles.forEach((tile) => {
      const px = tile.x - view.x;
      const py = tile.y - view.y;
      if (px < 0 || py < 0 || px >= VIEW_SIZE || py >= VIEW_SIZE) {
        return;
      }
      const isCenter = tile.x === cursor.x && tile.y === cursor.y;
      ctx.fillStyle = cursorColor;
      ctx.globalAlpha = (previewValid ? 0.12 : 0.08) + (isCenter ? 0.08 : 0);
      ctx.fillRect(px * TILE_SIZE + 3, py * TILE_SIZE + 3, TILE_SIZE - 6, TILE_SIZE - 6);
      ctx.strokeStyle = cursorColor;
      ctx.globalAlpha = previewValid ? 0.36 : 0.28;
      ctx.lineWidth = isCenter ? 2 : 1.5;
      ctx.strokeRect(px * TILE_SIZE + 4, py * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    });
    ctx.restore();
  }
  if (source) {
    ctx.save();
    ctx.strokeStyle = cursorColor;
    ctx.globalAlpha = reducedMotion ? 0.38 : 0.3 + pulse * 0.3;
    ctx.lineWidth = 2;
    if (!reducedMotion) {
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = -time / 40;
    }
    ctx.beginPath();
    ctx.moveTo((source.x - view.x) * TILE_SIZE + TILE_SIZE / 2, (source.y - view.y) * TILE_SIZE + TILE_SIZE / 2);
    ctx.lineTo(sx * TILE_SIZE + TILE_SIZE / 2, sy * TILE_SIZE + TILE_SIZE / 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  const tileX = sx * TILE_SIZE;
  const tileY = sy * TILE_SIZE;
  const centerX = tileX + TILE_SIZE / 2;
  const centerY = tileY + TILE_SIZE / 2;
  ctx.strokeStyle = cursorColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(tileX + 2, tileY + 2, TILE_SIZE - 4, TILE_SIZE - 4);
  ctx.globalAlpha = reducedMotion ? 0.2 : 0.16 + pulse * 0.28;
  ctx.strokeRect(tileX + 5, tileY + 5, TILE_SIZE - 10, TILE_SIZE - 10);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = cursorColor;
  ctx.beginPath();
  ctx.moveTo(centerX, tileY + 3);
  ctx.lineTo(centerX, tileY + 8);
  ctx.moveTo(centerX, tileY + TILE_SIZE - 8);
  ctx.lineTo(centerX, tileY + TILE_SIZE - 3);
  ctx.moveTo(tileX + 3, centerY);
  ctx.lineTo(tileX + 8, centerY);
  ctx.moveTo(tileX + TILE_SIZE - 8, centerY);
  ctx.lineTo(tileX + TILE_SIZE - 3, centerY);
  ctx.stroke();
  ctx.fillStyle = cursorColor;
  ctx.globalAlpha = reducedMotion ? 0.16 : 0.08 + pulse * 0.1;
  ctx.beginPath();
  ctx.arc(centerX, centerY, reducedMotion ? 2.5 : 2.5 + Math.sin(time / 140) * 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (targetPreview?.hitCount > 0) {
    ctx.font = "bold 11px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillStyle = cursorColor;
    ctx.strokeStyle = "rgba(6, 8, 10, 0.82)";
    ctx.lineWidth = 3;
    const label = `${targetPreview.hitCount} HIT`;
    ctx.strokeText(label, centerX, tileY - 4);
    ctx.fillText(label, centerX, tileY - 4);
    ctx.textAlign = "left";
  }
  ctx.restore();
}

function drawEffect(ctx, effect, view, time = 0, options = {}) {
  const reducedMotion = Boolean(options.reducedMotion);
  const life = effectLife(effect, time);

  if (effect.type === "projectileTrail" || effect.type === "projectile") {
    const from = worldToScreen(effect.from, view);
    const to = worldToScreen(effect.to, view);
    const headProgress = reducedMotion ? 1 : life;
    const tailProgress = reducedMotion ? 0 : Math.max(0, headProgress - 0.36);
    const startX = from.x + (to.x - from.x) * tailProgress;
    const startY = from.y + (to.y - from.y) * tailProgress;
    const endX = from.x + (to.x - from.x) * headProgress;
    const endY = from.y + (to.y - from.y) * headProgress;
    ctx.save();
    ctx.globalAlpha = reducedMotion ? 0.58 : 0.88 - life * 0.2;
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = options.intensity === "enhanced" ? 4 : 3;
    if (effect.style === "lightning" && !reducedMotion) {
      ctx.setLineDash([5, 3]);
      ctx.lineDashOffset = -time / 18;
    }
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.fillStyle = effect.color;
    ctx.beginPath();
    ctx.arc(endX, endY, reducedMotion ? 3 : 2.5 + (1 - life) * (effect.style === "fire" ? 3 : 2), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (effect.type === "blink" || effect.type === "castFlare") {
    if (!tileOnScreen(effect, view)) {
      return;
    }
    const sx = effect.x - view.x;
    const sy = effect.y - view.y;
    ctx.save();
    ctx.strokeStyle = effect.color;
    ctx.globalAlpha = 0.9 - life * 0.5;
    ctx.lineWidth = 2;
    if (effect.type === "castFlare") {
      const cx = sx * TILE_SIZE + 12;
      const cy = sy * TILE_SIZE + 12;
      const flareRadius = 5 + (1 - life) * 6;
      for (let i = 0; i < 4; i += 1) {
        const angle = (Math.PI / 2) * i + life * 0.7;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * 2, cy + Math.sin(angle) * 2);
        ctx.lineTo(cx + Math.cos(angle) * flareRadius, cy + Math.sin(angle) * flareRadius);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(cx, cy, flareRadius, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(sx * TILE_SIZE + 12, sy * TILE_SIZE + 12, 7 + life * 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (effect.type === "tileFlash" || effect.type === "telegraphPulse" || effect.type === "impactSpark" || effect.type === "castCircle" || effect.type === "deathBurst" || effect.type === "spellBurst") {
    const point = effect.x !== undefined ? { x: effect.x, y: effect.y } : effect.to;
    if (!point || !tileOnScreen(point, view)) {
      return;
    }
    const sx = point.x - view.x;
    const sy = point.y - view.y;
    const cx = screenTilePosition(sx, 12);
    const cy = screenTilePosition(sy, 12);

    if (effect.type === "tileFlash") {
      ctx.save();
      ctx.fillStyle = effect.color;
      ctx.globalAlpha = (effect.alpha || 0.22) * (1 - life);
      const inset = reducedMotion ? 3 : 2 - life;
      ctx.fillRect(sx * TILE_SIZE + inset, sy * TILE_SIZE + inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2);
      if (effect.rise) {
        ctx.globalAlpha *= 0.9;
        ctx.beginPath();
        ctx.arc(cx, cy - life * 6, 2 + (1 - life) * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    if (effect.type === "telegraphPulse") {
      ctx.save();
      ctx.strokeStyle = effect.color;
      ctx.globalAlpha = reducedMotion ? 0.3 : 0.18 + (Math.sin(time / 120) + 1) * 0.1;
      ctx.lineWidth = 2;
      ctx.strokeRect(sx * TILE_SIZE + 3, sy * TILE_SIZE + 3, TILE_SIZE - 6, TILE_SIZE - 6);
      ctx.restore();
      return;
    }

    if (effect.type === "impactSpark") {
      const rays = effect.rays || 6;
      const radius = 4 + life * 8;
      ctx.save();
      ctx.strokeStyle = effect.color;
      ctx.globalAlpha = 0.9 - life * 0.8;
      ctx.lineWidth = 2;
      for (let i = 0; i < rays; i += 1) {
        const angle = (Math.PI * 2 * i) / rays + life * 0.8;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * (radius * 0.4), cy + Math.sin(angle) * (radius * 0.4));
        ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    if (effect.type === "castCircle") {
      ctx.save();
      ctx.strokeStyle = effect.color;
      ctx.globalAlpha = 0.75 - life * 0.4;
      ctx.lineWidth = 2;
      const radius = reducedMotion ? 9 : 7 + (1 - life) * 5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 4; i += 1) {
        const angle = (Math.PI / 2) * i + life * 0.6;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * (radius - 3), cy + Math.sin(angle) * (radius - 3));
        ctx.lineTo(cx + Math.cos(angle) * (radius + 1), cy + Math.sin(angle) * (radius + 1));
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    if (effect.type === "deathBurst") {
      ctx.save();
      ctx.fillStyle = effect.color;
      ctx.globalAlpha = 0.22 * (1 - life);
      ctx.beginPath();
      ctx.arc(cx, cy, 4 + life * 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = effect.color;
      ctx.globalAlpha = 0.8 - life * 0.75;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 4 + life * 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (effect.type === "spellBurst") {
      const radius = (effect.radius || 1) * TILE_SIZE * 0.72;
      ctx.save();
      ctx.strokeStyle = effect.color;
      ctx.globalAlpha = 0.9 - life * 0.72;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 6 + radius * life, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.16 * (1 - life);
      ctx.fillStyle = effect.color;
      ctx.beginPath();
      ctx.arc(cx, cy, 4 + radius * 0.7 * life, 0, Math.PI * 2);
      ctx.fill();
      const rays = effect.style === "fire" ? 8 : 6;
      ctx.globalAlpha = 0.8 - life * 0.7;
      for (let i = 0; i < rays; i += 1) {
        const angle = (Math.PI * 2 * i) / rays + life * 0.6;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * 4, cy + Math.sin(angle) * 4);
        ctx.lineTo(cx + Math.cos(angle) * (8 + radius * 0.55 * life), cy + Math.sin(angle) * (8 + radius * 0.55 * life));
        ctx.stroke();
      }
      ctx.restore();
    }
    return;
  }

  if (effect.type === "floatingText") {
    if (!tileOnScreen(effect, view)) {
      return;
    }
    const sx = effect.x - view.x;
    const sy = effect.y - view.y;
    const cx = screenTilePosition(sx, 12);
    const baseY = screenTilePosition(sy, 6);
    const drift = reducedMotion ? 8 : 18;
    ctx.save();
    ctx.globalAlpha = 0.96 - life * 0.7;
    ctx.font = "bold 12px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(6, 8, 10, 0.82)";
    ctx.fillStyle = effect.color || "#f4edd7";
    ctx.strokeText(effect.text, cx, baseY - life * drift);
    ctx.fillText(effect.text, cx, baseY - life * drift);
    ctx.textAlign = "left";
    ctx.restore();
    return;
  }

  if (effect.type === "screenPulse") {
    ctx.save();
    ctx.fillStyle = effect.color;
    ctx.globalAlpha = (effect.alpha || 0.15) * (1 - life);
    ctx.fillRect(0, 0, VIEW_SIZE * TILE_SIZE, VIEW_SIZE * TILE_SIZE);
    ctx.restore();
  }
}

// src/audio/soundboard.js
class SoundBoard {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.music = null;
    this.musicTrack = "";
  }

  updateSettings(settings) {
    this.settings = settings;
    if (!this.settings.musicEnabled) {
      this.stopMusic();
    }
  }

  ensureMusicElement() {
    if (typeof window === "undefined" || typeof window.Audio === "undefined") {
      return null;
    }
    if (!this.music) {
      this.music = new window.Audio();
      this.music.loop = true;
      this.music.preload = "metadata";
      this.music.volume = 0.55;
      this.music.setAttribute("playsinline", "");
    }
    return this.music;
  }

  isMusicPlaying() {
    return Boolean(this.music && !this.music.paused && !this.music.ended);
  }

  syncMusic(track = "") {
    this.musicTrack = track || "";
    if (!this.musicTrack || !this.settings.musicEnabled) {
      this.stopMusic();
      return;
    }
    const music = this.ensureMusicElement();
    if (!music) {
      return;
    }
    if (music.dataset.track !== this.musicTrack) {
      music.dataset.track = this.musicTrack;
      music.src = this.musicTrack;
      music.currentTime = 0;
    }
  }

  resumeMusic() {
    if (!this.settings.musicEnabled || !this.musicTrack) {
      return;
    }
    const music = this.ensureMusicElement();
    if (!music) {
      return;
    }
    if (music.dataset.track !== this.musicTrack) {
      music.dataset.track = this.musicTrack;
      music.src = this.musicTrack;
      music.currentTime = 0;
    }
    const playPromise = music.play?.();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        // Ignore autoplay rejections until the next user gesture.
      });
    }
  }

  stopMusic() {
    if (!this.music) {
      return;
    }
    this.music.pause();
    this.music.currentTime = 0;
  }

  play(type) {
    if (!this.settings.soundEnabled) {
      return;
    }
    const freqMap = { hit: 180, good: 520, bad: 150, cast: 420, move: 240, trap: 120, stairs: 310, ui: 360, search: 210, searchGood: 480 };
    const durationMap = { hit: 0.04, good: 0.08, bad: 0.09, cast: 0.11, move: 0.03, trap: 0.12, stairs: 0.08, ui: 0.05, search: 0.05, searchGood: 0.07 };
    const frequency = freqMap[type] || 300;
    const duration = durationMap[type] || 0.05;
    try {
      if (typeof window === "undefined" || (!window.AudioContext && !window.webkitAudioContext)) {
        return;
      }
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.value = frequency;
      gain.gain.value = 0.015;
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Ignore audio init failures on unsupported browsers.
    }
  }
}

// src/input/gamepad.js

class GamepadInput {
  constructor() {
    this.lastMoveAt = 0;
    this.lastMoveDirection = "";
    this.lastScrollAt = 0;
    this.lastButtons = new Map();
  }

  resetMoveState() {
    this.lastMoveAt = 0;
    this.lastMoveDirection = "";
  }

  isConnected() {
    return this.getGamepad() !== null;
  }

  getControllerName() {
    const pad = this.getGamepad();
    return pad ? pad.id : "Controller";
  }

  getGamepad() {
    if (typeof navigator === "undefined" || !navigator.getGamepads) {
      return null;
    }
    const pads = navigator.getGamepads();
    for (const pad of pads) {
      if (pad && pad.connected) {
        return pad;
      }
    }
    return null;
  }

  poll(mode, moveRepeatMs = 180) {
    const pad = this.getGamepad();
    if (!pad) {
      this.resetMoveState();
      return null;
    }
    const now = nowTime();
    const axes = pad.axes || [];
    const buttons = pad.buttons || [];
    const scrollRepeatReady = now - this.lastScrollAt > 140;
    const dx = Math.abs(axes[0] || 0) > 0.45 ? Math.sign(axes[0]) : (buttons[15]?.pressed ? 1 : buttons[14]?.pressed ? -1 : 0);
    const dy = Math.abs(axes[1] || 0) > 0.45 ? Math.sign(axes[1]) : (buttons[13]?.pressed ? 1 : buttons[12]?.pressed ? -1 : 0);
    const moveDirection = (dx || dy) ? `${dx},${dy}` : "";
    const moveRepeatReady = Boolean(moveDirection)
      && (moveDirection !== this.lastMoveDirection || now - this.lastMoveAt >= moveRepeatMs);
    const scrollAxis = Math.abs(axes[3] || 0) > 0.45
      ? Math.sign(axes[3])
      : buttons[7]?.pressed
        ? 1
        : buttons[6]?.pressed
          ? -1
          : 0;
    if ((dx || dy) && moveRepeatReady) {
      this.lastMoveAt = now;
      this.lastMoveDirection = moveDirection;
      if (mode === "target") {
        return { type: "target", dx, dy };
      }
      if (mode === "modal" || mode === "creation" || mode === "title" || mode === "levelup") {
        return { type: "ui-move", dx, dy };
      }
      return { type: "move", dx, dy };
    }
    if (!moveDirection) {
      this.lastMoveDirection = "";
    }
    const pressed = (index) => {
      const current = !!buttons[index]?.pressed;
      const last = this.lastButtons.get(index) || false;
      this.lastButtons.set(index, current);
      return current && !last;
    };
    if (mode !== "target" && (mode === "modal" || mode === "creation" || mode === "title" || mode === "levelup")) {
      if (pressed(4)) {
        return { type: "ui-tab-prev" };
      }
      if (pressed(5)) {
        return { type: "ui-tab-next" };
      }
      if (scrollAxis && scrollRepeatReady) {
        this.lastScrollAt = now;
        return { type: "ui-scroll", delta: scrollAxis };
      }
    }
    if (mode === "game" || mode === "target") {
      if (pressed(0)) { return { type: "dock", slot: "primary" }; }
      if (pressed(1)) { return { type: "dock", slot: "back" }; }
      if (pressed(2)) { return { type: "dock", slot: "secondary" }; }
      if (pressed(3)) { return { type: "dock", slot: "pack" }; }
    }
    if (pressed(0)) { return { type: "ui-confirm" }; }
    if (pressed(1)) { return { type: "ui-back" }; }
    if (pressed(4)) { return { type: "action", action: "open-hub", tab: "magic" }; }
    if (pressed(5)) { return { type: "action", action: "open-utility-menu" }; }
    if (pressed(8)) { return { type: "action", action: "map-focus" }; }
    if (pressed(9)) { return { type: "action", action: "open-utility-menu" }; }
    return null;
  }
}

// src/game.js
const adjustCreationStatDraft = adjustCreationStat;
const captureCreationDraftState = captureCreationDraft;
const getCreationDraftPointsRemaining = getCreationPointsRemaining;
const getCreationDraftStats = getCreationStats;
const resetCreationState = resetCreationDraft;
const showCreationScreen = showCreationModal;
const showTitleModal = showTitleScreen;
const loadAllSavedRunMeta = getAllSavedRunMeta;
const loadSavedRunMeta = getSavedRunMeta;
const formatSavedRunStamp = formatSaveStamp;
const loadGameState = loadGame;
const saveGameState = saveGame;
const attackActors = attack;
const canMonsterCharge = canCharge;
const canMonsterMove = canMonsterMoveTo;
const checkPlayerLevelUp = checkLevelUp;
const damageActorTarget = damageActor;
const findMonsterRetreatStep = findRetreatStep;
const getMonsterIntentModel = getMonsterIntent;
const handlePlayerDeath = handleDeath;
const killMonsterActor = killMonster;
const makeDungeonNoise = makeNoise;
const processMonsterTurns = processMonsters;
const updateAllMonsterIntents = updateMonsterIntents;
const getVisibleEnemies = visibleEnemies;
const endGameTurn = endTurn;
const performWaitTurn = performWait;
const resolveGameTurn = resolveTurn;
const restUntilSafeTurn = restUntilSafe;
const sleepUntilRestoredTurn = sleepUntilRestored;
const buildAdvisorModel = getAdvisorModel;
const renderAdvisorActionBar = renderActionBar;
const renderAdvisorPanels = renderPanels;
const raiseDanger = increaseDanger;
const markFloorGreedAction = markGreedAction;
const applyBoonReward = grantBoon;
const addRumorToken = grantRumorToken;
const getTownCycleMeta = getTownCycleState;
const buildTownMetaSummary = getTownMetaSummary;
const buildValidationSummary = getValidationSummary;


class Game {
  constructor() {
    this.appShell = document.querySelector(".mobile-app");
    this.canvas = document.getElementById("game-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.mapCanvas = document.getElementById("map-canvas");
    this.mapCtx = this.mapCanvas ? this.mapCanvas.getContext("2d") : null;
    this.mapCaption = document.getElementById("map-caption");
    this.mapDrawer = document.getElementById("map-drawer");
    this.mapPanelLabel = document.getElementById("map-panel-label");
    this.mapPanelState = document.getElementById("map-panel-state");
    this.mapToggleButton = document.getElementById("map-toggle-button");
    this.spellTrayToggleButton = document.getElementById("spell-tray-toggle-button");
    this.spellTray = document.getElementById("spell-tray");
    this.contextChip = document.getElementById("context-chip");
    this.modalRoot = document.getElementById("modal-root");
    this.actionBar = document.getElementById("action-bar");
    this.runStatus = document.getElementById("run-status");
    this.pressureStatus = document.getElementById("pressure-status");
    this.controllerStatus = document.getElementById("controller-status");
    this.saveStamp = document.getElementById("save-stamp");
    this.quickSaveButton = document.getElementById("quick-save-button");
    this.quickLoadButton = document.getElementById("quick-load-button");
    this.touchControls = document.getElementById("touch-controls");
    this.playerCapsule = document.getElementById("player-capsule");
    this.threatCapsule = document.getElementById("threat-capsule");
    this.advisorStrip = document.getElementById("advisor-strip");
    this.eventTicker = document.getElementById("event-ticker");
    this.turn = 1;
    this.mode = "title";
    this.activeSaveSlotId = null;
    this.levels = [];
    this.currentDepth = 0;
    this.currentLevel = null;
    this.player = null;
    this.messages = [];
    this.selectedRace = RACES[0].id;
    this.selectedClass = CLASSES[0].id;
    this.creationName = "Morgan";
    this.creationStatBonuses = { str: 0, dex: 0, con: 0, int: 0 };
    this.pendingShop = null;
    this.pendingService = null;
    this.pendingSpell = null;
    this.pendingSpellChoices = 0;
    this.pendingPerkChoices = 0;
    this.pendingRewardChoice = null;
    this.pendingRewardQueue = [];
    this.pendingTurnResolution = null;
    this.activeHubTab = "pack";
    this.activeJournalSection = "current";
    this.activePackFilter = "all";
    this.activeMagicFilter = "all";
    this.activeSpellLearnFilter = "all";
    this.activeShopPanel = "buy";
    this.activePackSelection = { type: "inventory", value: 0 };
    this.spellTrayOpen = false;
    this.targetMode = null;
    this.visualEffects = [];
    this.boardImpulse = null;
    this.storyFlags = {};
    this.floorObjective = null;
    this.floorOptional = null;
    this.floorResolved = false;
    this.dangerLevel = "Low";
    this.dangerTriggers = null;
    this.reinforcementClock = 0;
    this.townUnlocks = {};
    this.shopTiers = {};
    this.townState = {};
    this.rumorTable = [];
    this.chronicleEvents = [];
    this.deathContext = null;
    this.seenMonsters = new Set();
    this.loggedRoomReads = new Set();
    this.focusedThreat = null;
    this.pendingPickupPrompt = null;
    this.lastTownRefreshTurn = 0;
    this.lastRunSummary = null;
    this.runPersistenceChanges = null;
    this.modalSurfaceKey = null;
    this.modalReturnContext = null;
    this.utilityMenuOpenerFocusKey = null;
    this.settings = loadSettings();
    this.mapDrawerOpen = false;
    this.layoutMode = "mobile";
    this.lastInputSource = "pointer";
    this.controllerFocusKey = null;
    this.reducedMotionQuery = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
    this.feedDrawerOpen = false;
    this.liveFeedSticky = null;
    this.movementCadence = this.createMovementCadenceState();
    document.documentElement.dataset.uiScale = this.settings.uiScale;
    this.shopState = createInitialShopState();
    this.shopBrowseState = null;
    this.lastPreviewKey = "";
    this.hoveredPackSelection = null;
    ensureTownMetaState(this);
    ensureChronicleState(this);
    ensureMetaProgressionState(this);
    initializeTelemetry(this);
    initializeValidationState(this);
    this.audio = new SoundBoard(this.settings);
    this.gamepadInput = new GamepadInput();
    this.bindEvents();
    this.syncAdaptiveLayout(true);
    this.registerServiceWorker();
    this.startRuntimeLoop();
    this.refreshChrome();
    this.showTitleScreen();
    this.render();
  }

  bindEvents() {
    document.addEventListener("keydown", (event) => {
      this.setInputSource("keyboard");
      this.handleKeydown(event);
    });
    document.addEventListener("keyup", (event) => this.handleKeyup(event));
    document.addEventListener("click", (event) => this.handleClick(event));
    document.addEventListener("dblclick", (event) => this.handleDoubleClick(event));
    document.addEventListener("change", (event) => this.handleChange(event));
    document.addEventListener("mouseover", (event) => this.handlePreviewPointer(event));
    document.addEventListener("focusin", (event) => this.handlePreviewFocus(event));
    document.addEventListener("pointerdown", (event) => {
      this.setInputSource("pointer");
      this.handlePointerDown(event);
    });
    document.addEventListener("pointerup", () => this.releaseHeldMovement("pointer"));
    document.addEventListener("pointercancel", () => this.releaseHeldMovement("pointer"));
    document.addEventListener("mousedown", () => this.setInputSource("pointer"));
    document.addEventListener("touchstart", () => this.setInputSource("pointer"), { passive: true });
    document.addEventListener("input", (event) => {
      if (event.target && event.target.id === "hero-name") {
        this.creationName = event.target.value;
      }
    });
    this.canvas.addEventListener("click", (event) => this.handleCanvasClick(event));
    window.addEventListener("gamepadconnected", () => this.refreshChrome());
    window.addEventListener("gamepaddisconnected", () => this.refreshChrome());
    window.addEventListener("resize", () => this.refreshChrome());
    window.addEventListener("pagehide", () => {
      if (!this.player) {
        return;
      }
      this.recordTelemetry("session_end", {
        reason: "pagehide"
      });
    });
    window.addEventListener("blur", () => this.resetMovementCadence());
  }

  startRuntimeLoop() {
    const tick = () => {
      const gamepadHandled = this.pollGamepad();
      if (!gamepadHandled) {
        this.pollHeldMovement();
      }
      this.updateEffects();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  registerServiceWorker() {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js").catch(() => {});
      });
    }
  }

  createMovementCadenceState() {
    return {
      strideSteps: 0,
      lastStepAt: 0,
      heldKeyboard: null,
      heldPointer: null,
      ignoreMoveClickUntil: 0
    };
  }

  getMovementRepeatInterval() {
    const steps = this.movementCadence?.strideSteps || 0;
    if (steps >= 8) {
      return 72;
    }
    if (steps >= 5) {
      return 94;
    }
    if (steps >= 4) {
      return 118;
    }
    return 168;
  }

  noteSuccessfulMove() {
    const cadence = this.movementCadence || (this.movementCadence = this.createMovementCadenceState());
    const now = nowTime();
    cadence.strideSteps = now - cadence.lastStepAt <= 420
      ? cadence.strideSteps + 1
      : 1;
    cadence.lastStepAt = now;
  }

  resetMovementCadence(options = {}) {
    const {
      clearHeld = true,
      clearStride = true
    } = options;
    const cadence = this.movementCadence || (this.movementCadence = this.createMovementCadenceState());
    if (clearStride) {
      cadence.strideSteps = 0;
      cadence.lastStepAt = 0;
    }
    if (clearHeld) {
      cadence.heldKeyboard = null;
      cadence.heldPointer = null;
      cadence.ignoreMoveClickUntil = 0;
    }
    if (clearStride) {
      this.gamepadInput?.resetMoveState?.();
    }
  }

  setHeldMovement(source, dx, dy, key = "") {
    const held = {
      dx,
      dy,
      key,
      nextRepeatAt: 0
    };
    if (source === "keyboard") {
      this.movementCadence.heldKeyboard = held;
    } else if (source === "pointer") {
      this.movementCadence.heldPointer = held;
    }
    return held;
  }

  getHeldMovement(source) {
    if (source === "keyboard") {
      return this.movementCadence?.heldKeyboard || null;
    }
    if (source === "pointer") {
      return this.movementCadence?.heldPointer || null;
    }
    return null;
  }

  releaseHeldMovement(source) {
    if (!this.movementCadence) {
      return;
    }
    if (source === "keyboard") {
      this.movementCadence.heldKeyboard = null;
      return;
    }
    if (source === "pointer") {
      this.movementCadence.heldPointer = null;
    }
  }

  scheduleHeldMovementRepeat(source) {
    const held = this.getHeldMovement(source);
    if (held) {
      held.nextRepeatAt = nowTime() + this.getMovementRepeatInterval();
    }
  }

  pollHeldMovement() {
    if (!this.canPlayerAct()) {
      return false;
    }
    const sources = this.lastInputSource === "pointer" ? ["pointer", "keyboard"] : ["keyboard", "pointer"];
    const now = nowTime();
    for (const source of sources) {
      const held = this.getHeldMovement(source);
      if (!held || now < held.nextRepeatAt) {
        continue;
      }
      this.handleMovementIntent(held.dx, held.dy);
      if (this.getHeldMovement(source) === held) {
        held.nextRepeatAt = nowTime() + this.getMovementRepeatInterval();
      }
      return true;
    }
    return false;
  }

  handleKeyup(event) {
    const lower = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const held = this.getHeldMovement("keyboard");
    if (held?.key === lower) {
      this.releaseHeldMovement("keyboard");
    }
  }

  handlePointerDown(event) {
    const moveButton = event.target.closest("[data-move]");
    if (!moveButton || !this.canPlayerAct()) {
      return;
    }
    event.preventDefault();
    const [dx, dy] = moveButton.dataset.move.split(",").map(Number);
    this.movementCadence.ignoreMoveClickUntil = nowTime() + 400;
    this.setHeldMovement("pointer", dx, dy);
    this.handleMovementIntent(dx, dy);
    this.scheduleHeldMovementRepeat("pointer");
  }

  legacyRefreshChromeUnused() {
    const meta = this.getSavedRunMeta();
    if (this.controllerStatus) {
      const connected = this.gamepadInput.isConnected();
      this.controllerStatus.textContent = connected ? `Controller: ${this.gamepadInput.getControllerName()}` : "Touch controls active";
    }
    if (this.touchControls) {
      const hiddenBySetting = !this.settings.touchControlsEnabled;
      const hiddenByController = this.settings.controllerHintsEnabled && this.gamepadInput.isConnected();
      this.touchControls.classList.toggle("hidden", hiddenBySetting || hiddenByController);
    }
    if (this.saveStamp) {
      if (!meta) {
        this.saveStamp.textContent = "No save loaded";
      } else {
        const timeLabel = meta.savedAt ? this.formatSaveStamp(meta.savedAt) : null;
        this.saveStamp.textContent = timeLabel ? `${meta.name} Lv.${meta.level} Depth ${meta.depth} · ${timeLabel}` : `${meta.name} Lv.${meta.level} Depth ${meta.depth}`;
      }
    }
    if (this.quickSaveButton) {
      this.quickSaveButton.disabled = !this.player || this.mode === "title";
    }
    if (this.quickLoadButton) {
      this.quickLoadButton.disabled = !meta;
    }
  }

  legacyGetSavedRunMetaUnused() { return loadSavedRunMeta(); }

  legacyFormatSaveStampUnused(isoString) { return formatSavedRunStamp(isoString); }

  legacyResetCreationDraftUnused() { resetCreationState(this); }

  legacyCaptureCreationDraftUnused() { captureCreationDraftState(this); }

  legacyGetCreationPointsRemainingUnused() { return getCreationDraftPointsRemaining(this); }

  legacyAdjustCreationStatUnused(stat, delta) { return adjustCreationStatDraft(this, stat, delta); }

  legacyGetCreationStatsUnused() { return getCreationDraftStats(this); }

  getAttackValueForStats(stats, weaponPower = 2) {
    return weaponPower + Math.floor(stats.str / 2);
  }

  getDamageRangeForStats(stats, weaponPower = 2) {
    return [1, Math.max(2, weaponPower + Math.floor(stats.str / 2))];
  }

  getArmorValueForStats(stats) {
    return Math.floor(stats.dex / 2);
  }

  getEvadeValueForStats(stats) {
    return 6 + Math.floor(stats.dex * 0.75);
  }

  getSearchRadiusForStats(stats) {
    return 2 + (stats.dex >= 15 || stats.int >= 15 ? 1 : 0) + (stats.int >= 18 ? 1 : 0);
  }

  getMoveSpeedForStats(stats) {
    return clamp(90 + (stats.dex - 10) * 5, 72, 130);
  }

  getSearchPowerForStats(stats, level = 1) {
    return stats.dex + stats.int + level * 2;
  }

  getMaxHpForStats(stats, level, className, constitutionLoss = 0, hpBase = 0) {
    const effectiveCon = Math.max(1, stats.con - constitutionLoss);
    return Math.max(10, hpBase + level * 2 + effectiveCon + Math.floor(effectiveCon / 2) + (className === "Fighter" ? 4 : 0));
  }

  getMaxManaForStats(stats, className, bonusMana = 0, manaBase = 0) {
    return Math.max(0, manaBase + Math.floor(stats.int * 0.75) + bonusMana + (className === "Wizard" ? 6 : 0));
  }

  getPlayerRaceTemplate(player) {
    return RACES.find((race) => race.name === player.race) || null;
  }

  getPlayerClassTemplate(player) {
    return CLASSES.find((role) => role.name === player.className) || null;
  }

  getPlayerHpBase(player) {
    if (typeof player.hpBase === "number") {
      return player.hpBase;
    }
    const race = this.getPlayerRaceTemplate(player);
    const role = this.getPlayerClassTemplate(player);
    return (race ? race.hp : 0) + (role ? role.bonuses.hp : 0);
  }

  getPlayerManaBase(player) {
    if (typeof player.manaBase === "number") {
      return player.manaBase;
    }
    const race = this.getPlayerRaceTemplate(player);
    const role = this.getPlayerClassTemplate(player);
    return (race ? race.mana : 0) + (role ? role.bonuses.mana : 0);
  }

  getLevelProgress(player = this.player) {
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

  getEquipmentStatBonuses(actor = this.player) {
    const bonuses = { str: 0, dex: 0, con: 0, int: 0 };
    if (!actor?.equipment) {
      return bonuses;
    }
    Object.values(actor.equipment).forEach((item) => {
      if (!item) {
        return;
      }
      bonuses.str += getItemStrBonus(item);
      bonuses.dex += getItemDexBonus(item);
      bonuses.con += getItemConBonus(item);
      bonuses.int += getItemIntBonus(item);
    });
    return bonuses;
  }

  getActorStats(actor = this.player) {
    if (!actor?.stats) {
      return { str: 0, dex: 0, con: 0, int: 0 };
    }
    const equipmentBonuses = this.getEquipmentStatBonuses(actor);
    return {
      str: actor.stats.str + equipmentBonuses.str,
      dex: actor.stats.dex + equipmentBonuses.dex,
      con: actor.stats.con + equipmentBonuses.con,
      int: actor.stats.int + equipmentBonuses.int
    };
  }

  isPlayerDead() {
    return Boolean(this.player && this.player.hp <= 0);
  }

  canPlayerAct() {
    return Boolean(this.player && this.mode === "game" && !this.isPlayerDead());
  }

  getBurdenUiState(weight = getCarryWeight(this.player), capacity = getCarryCapacity(this.player)) {
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

  getBurdenPreview(weightDelta = 0) {
    return this.getBurdenUiState(getCarryWeight(this.player) + weightDelta);
  }

  getDynamicMonsterCap(depth = this.currentDepth) {
    return getDynamicMonsterCap(depth);
  }

  canAddDynamicMonster(count = 1, depth = this.currentDepth) {
    if (!this.currentLevel || depth <= 0) {
      return false;
    }
    return (this.currentLevel.actors?.length || 0) + count <= this.getDynamicMonsterCap(depth);
  }

  summonMonsterNearWithCap(x, y, template) {
    if (!this.canAddDynamicMonster(1)) {
      return false;
    }
    const before = this.currentLevel.actors.length;
    summonMonsterNear(this.currentLevel, x, y, template);
    return this.currentLevel.actors.length > before;
  }

  describeBurdenPreview(weightDelta = 0) {
    if (weightDelta === 0) {
      return {
        text: "Burden unchanged while carried.",
        tone: "value-good"
      };
    }
    const preview = this.getBurdenPreview(weightDelta);
    if (preview.state === "overloaded") {
      return {
        text: `Will overload you at ${preview.weight} / ${preview.capacity}.`,
        tone: "value-bad"
      };
    }
    if (preview.state === "danger") {
      return {
        text: `Will enter danger burden at ${preview.weight} / ${preview.capacity}.`,
        tone: "value-bad"
      };
    }
    if (preview.state === "warning") {
      return {
        text: `Will enter warning burden at ${preview.weight} / ${preview.capacity}.`,
        tone: "value-warning"
      };
    }
    return {
      text: `Burden after change: ${preview.weight} / ${preview.capacity}.`,
      tone: "value-good"
    };
  }

  resetReadState() {
    this.seenMonsters = new Set();
    this.loggedRoomReads = new Set();
    this.focusedThreat = null;
    this.pendingPickupPrompt = null;
  }

  getMonsterIntentLabel(monster) {
    const type = monster?.intent?.type;
    switch (type) {
      case "shoot":
        return "Ranged attack";
      case "summon":
        return "Summoning";
      case "charge":
        return monster.chargeWindup ? "Charging now" : "Charge lane";
      case "hex":
        return "Spellcasting";
      case "retreat":
        return "Retreating";
      case "advance":
        return "Closing in";
      case "melee":
        return "Melee";
      case "sleep":
        return "Sleeping";
      default:
        return "Watching";
    }
  }

  getMonsterRoleLabel(monster) {
    if (!monster) {
      return "Threat";
    }
    if (monster.abilities && monster.abilities.includes("summon")) {
      return "Summoner";
    }
    if (monster.ranged) {
      return "Ranged";
    }
    if (monster.abilities && monster.abilities.includes("charge")) {
      return "Charger";
    }
    if (monster.tactic === "skirmish" || monster.tactic === "phase") {
      return "Skirmisher";
    }
    if (monster.tactic === "pack" || monster.tactic === "press" || monster.tactic === "line") {
      return "Melee";
    }
    return "Threat";
  }

  getSortedVisibleEnemies() {
    const visible = this.visibleEnemies();
    visible.sort((a, b) => {
      const score = (monster) => {
        const roleWeight = monster.abilities?.includes("summon")
          ? 5
          : monster.ranged
            ? 4
            : monster.abilities?.includes("charge")
              ? 3
              : 2;
        return roleWeight * 100 - distance(this.player, monster) * 10 + (monster.elite ? 15 : 0);
      };
      return score(b) - score(a);
    });
    return visible;
  }

  getFocusedThreat(visible = this.getSortedVisibleEnemies()) {
    if (this.focusedThreat && visible.includes(this.focusedThreat) && this.focusedThreat.hp > 0) {
      return this.focusedThreat;
    }
    this.focusedThreat = visible[0] || null;
    return this.focusedThreat;
  }

  getPlayerRoomIndex() {
    if (!this.currentLevel?.rooms) {
      return null;
    }
    const index = this.currentLevel.rooms.findIndex((room) =>
      this.player.x >= room.x &&
      this.player.x < room.x + room.w &&
      this.player.y >= room.y &&
      this.player.y < room.y + room.h
    );
    return index >= 0 ? index : null;
  }

  getVisibleLootItems() {
    if (!this.currentLevel) {
      return [];
    }
    return this.currentLevel.items.filter((item) => isVisible(this.currentLevel, item.x, item.y));
  }

  getUnderfootLoot() {
    if (!this.currentLevel || !this.player) {
      return [];
    }
    return itemsAt(this.currentLevel, this.player.x, this.player.y);
  }

  describeFeatureTile(tile) {
    if (!tile) {
      return "";
    }
    if (tile.discoveryId) {
      const discovery = this.getDiscoveryDef(tile.discoveryId);
      return discovery ? discovery.label : "Discovery";
    }
    if (tile.objectiveId) {
      const objective = OBJECTIVE_DEFS[tile.objectiveId];
      return objective ? objective.shortLabel : "Objective";
    }
    if (tile.optionalId) {
      return tile.label || "Temptation";
    }
    if (tile.kind === "fountain") {
      return "Fountain";
    }
    if (tile.kind === "throne") {
      return "Throne";
    }
    if (tile.kind === "altar") {
      return tile.featureEffect ? "Shrine" : "Altar";
    }
    if (tile.kind === "stairDown") {
      return "Stairs down";
    }
    if (tile.kind === "stairUp") {
      return "Stairs up";
    }
    return "";
  }

  formatNamedCounts(entries) {
    const counts = new Map();
    entries.forEach((label) => {
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return [...counts.entries()].map(([label, count]) => count > 1 ? `${count}x ${label}` : label).join(", ");
  }

  describeItemReadout(item) {
    if (!item) {
      return "";
    }
    if (item.kind === "gold") {
      return `${item.amount} gold`;
    }
    const category = item.slot ? this.getPackSlotDefinition(item.slot).label : classifyItem(item);
    const details = [];
    if (item.weight) {
      details.push(`wt ${item.weight}`);
    }
    return `${getItemName(item)} (${category}${details.length > 0 ? `, ${details.join(", ")}` : ""})`;
  }

  summarizeLoot(items, limit = 3) {
    if (!items || items.length === 0) {
      return "No loot";
    }
    const visibleItems = items.slice(0, limit).map((item) => this.describeItemReadout(item));
    const extra = items.length > limit ? ` +${items.length - limit} more` : "";
    return `${visibleItems.join(", ")}${extra}`;
  }

  getActionDockModel() {
    return this.getAdvisorModel().dockSlots || [];
  }

  getControllerContextAction() {
    if (!this.player || !this.currentLevel) {
      return null;
    }
    const tile = getTile(this.currentLevel, this.player.x, this.player.y);
    const directive = typeof this.getLoopDirective === "function" ? this.getLoopDirective(tile) : null;
    const recommendedActionId = directive?.recommendedActionId || "";
    const lootHere = itemsAt(this.currentLevel, this.player.x, this.player.y);
    if (lootHere.length > 0) {
      return {
        action: "pickup",
        label: "Pick Up",
        note: lootHere.length === 1
          ? this.describeItemReadout(lootHere[0])
          : `${lootHere.length} items underfoot`
      };
    }
    if (this.currentDepth === 0 && tile?.kind === "buildingDoor" && tile.service) {
      return {
        action: "open-town-service",
        service: tile.service,
        label: "Open",
        note: `Open ${SHOPS[tile.service]?.name || tile.label || "town service"}`
      };
    }
    if (tile?.kind === "stairUp" && this.currentDepth > 0 && recommendedActionId === "stairs-up") {
      return {
        action: "stairs-up",
        label: "Ascend",
        note: "Leave the floor"
      };
    }
    if (tile?.kind === "stairDown" && this.currentDepth > 0 && recommendedActionId === "stairs-down") {
      return {
        action: "stairs-down",
        label: "Descend",
        note: "Go deeper"
      };
    }
    if (tile && (
      tile.objectiveId
      || tile.optionalId
      || tile.discoveryId
      || tile.roomEventId
      || tile.kind === "altar"
      || tile.kind === "fountain"
      || tile.kind === "throne"
    )) {
      const prompt = this.getTileActionPrompt(tile);
      return {
        action: "interact",
        label: prompt?.label || "Use",
        note: prompt?.detail || "Resolve the current tile"
      };
    }
    return null;
  }

  getControllerPrimaryDockAction(candidates = []) {
    const contextAction = this.getControllerContextAction();
    if (contextAction) {
      return contextAction;
    }
    return candidates[0] || {
      action: "open-utility-menu",
      label: "Menu",
      note: "Save, settings, and help"
    };
  }

  handleControllerBackAction() {
    this.resetMovementCadence({ clearHeld: false });
    if (this.mode === "target") {
      this.cancelTargetMode();
      return true;
    }
    if (this.pendingPickupPrompt) {
      this.cancelPendingPickup();
      return true;
    }
    if (this.spellTrayOpen) {
      this.closeSpellTray();
      return true;
    }
    if (this.mode === "modal" || this.mode === "creation") {
      this.closeModal();
      this.render();
      return true;
    }
    if (this.mapDrawerOpen && this.layoutMode !== "desktop") {
      this.mapDrawerOpen = false;
      this.refreshChrome();
      return true;
    }
    if (this.feedDrawerOpen) {
      this.feedDrawerOpen = false;
      this.render();
      return true;
    }
    return false;
  }

  triggerDockSlot(key) {
    if (key === "back") {
      this.handleControllerBackAction();
      return;
    }
    if (!this.player) {
      return;
    }
    const slot = this.getActionDockModel().find((entry) => entry.key === key);
    if (!slot || !slot.action) {
      return;
    }
    this.handleAction(slot.action, {
      dataset: {
        action: slot.action,
        tab: slot.tab || "",
        service: slot.service || ""
      }
    });
  }

  buildMonsterDiscoveryMessage(monsters) {
    if (!monsters || monsters.length === 0) {
      return "";
    }
    return `You see ${this.formatNamedCounts(monsters.map((monster) => monster.name))}.`;
  }

  buildRoomReadMessage(roomIndex) {
    if (roomIndex === null || !this.currentLevel?.rooms || !this.currentLevel.rooms[roomIndex]) {
      return "";
    }
    const room = this.currentLevel.rooms[roomIndex];
    const monsters = this.getSortedVisibleEnemies().filter((monster) => monster.roomIndex === roomIndex);
    const loot = this.getVisibleLootItems().filter((item) =>
      item.x >= room.x &&
      item.x < room.x + room.w &&
      item.y >= room.y &&
      item.y < room.y + room.h
    );
    const features = [];
    for (let y = room.y; y < room.y + room.h; y += 1) {
      for (let x = room.x; x < room.x + room.w; x += 1) {
        if (!isVisible(this.currentLevel, x, y)) {
          continue;
        }
        const label = this.describeFeatureTile(getTile(this.currentLevel, x, y));
        if (label && !features.includes(label)) {
          features.push(label);
        }
      }
    }
    const parts = [];
    if (monsters.length > 0) {
      parts.push(`Hostiles: ${this.formatNamedCounts(monsters.map((monster) => monster.name))}`);
    }
    if (loot.length > 0) {
      parts.push(`Loot: ${this.summarizeLoot(loot, 2)}`);
    }
    if (features.length > 0) {
      parts.push(`Feature: ${features.join(", ")}`);
    }
    if (this.currentLevel?.milestone?.roomIndex === roomIndex && this.currentLevel.milestone.status !== "cleared") {
      parts.push(`Milestone: ${this.currentLevel.milestone.name}`);
    }
    const discoveries = (this.currentLevel?.discoveries || []).filter((entry) => entry.roomIndex === roomIndex);
    if (discoveries.length > 0) {
      parts.push(`Discovery: ${discoveries.map((entry) => entry.label).join(", ")}`);
    }
    return parts.length > 0 ? `Room opens. ${parts.join(". ")}.` : "";
  }

  processDiscoveryEvents() {
    if (!this.player || !this.currentLevel) {
      return;
    }
    const visible = this.getSortedVisibleEnemies();
    const newlySeen = visible.filter((monster) => !this.seenMonsters.has(monster));
    newlySeen.forEach((monster) => this.seenMonsters.add(monster));
    if (newlySeen.length > 0) {
      this.log(this.buildMonsterDiscoveryMessage(newlySeen), "warning");
    }

    const roomIndex = this.getPlayerRoomIndex();
    if (roomIndex !== null) {
      const roomKey = `${this.currentDepth}:${roomIndex}`;
      if (!this.loggedRoomReads.has(roomKey)) {
        const summary = this.buildRoomReadMessage(roomIndex);
        if (summary) {
          this.log(summary, "warning");
        }
        this.loggedRoomReads.add(roomKey);
      }
    }

    this.getFocusedThreat(visible);
  }

  shouldPromptForPickup(item) {
    if (!item || item.kind === "gold" || !this.player) {
      return false;
    }
    const capacity = getCarryCapacity(this.player);
    const beforeWeight = getCarryWeight(this.player);
    const itemWeight = item.weight || 0;
    const afterWeight = beforeWeight + itemWeight;
    if (afterWeight > capacity) {
      return true;
    }
    return beforeWeight > capacity && itemWeight >= 5;
  }

  setModalVisibility(isOpen) {
    if (this.appShell) {
      this.appShell.classList.toggle("modal-open", isOpen);
    }
  }

  setInputSource(source = "pointer") {
    if (!source || this.lastInputSource === source) {
      return;
    }
    this.lastInputSource = source;
    const controllerActive = source === "gamepad";
    if (this.appShell) {
      this.appShell.classList.toggle("controller-active", controllerActive);
    }
    document.documentElement.classList.toggle("controller-active", controllerActive);
  }

  getSpellTrayLimit() {
    return 8;
  }

  syncPlayerSpellTray(player = this.player) {
    if (!player) {
      return [];
    }
    player.spellsKnown = Array.isArray(player.spellsKnown)
      ? [...new Set(player.spellsKnown.filter((spellId) => Boolean(SPELLS[spellId])))]
      : [];
    const hasSavedTray = Array.isArray(player.spellTrayIds);
    const tray = hasSavedTray
      ? [...new Set(player.spellTrayIds.filter((spellId) => player.spellsKnown.includes(spellId)))]
      : [];
    if ((!hasSavedTray || tray.length === 0) && player.spellsKnown.length > 0) {
      tray.push(...player.spellsKnown.slice(0, this.getSpellTrayLimit()));
    }
    player.spellTrayIds = tray.slice(0, this.getSpellTrayLimit());
    if (player === this.player) {
      if (this.pendingSpell && !player.spellsKnown.includes(this.pendingSpell)) {
        this.pendingSpell = null;
      }
      if (!this.pendingSpell) {
        this.pendingSpell = player.spellTrayIds[0] || player.spellsKnown[0] || null;
      }
    }
    return [...player.spellTrayIds];
  }

  getPinnedSpellIds(player = this.player) {
    return this.syncPlayerSpellTray(player);
  }

  getSpellBookFocusKey(spellId) {
    return `hub:spell:${spellId}`;
  }

  getSpellCastFocusKey(spellId, surface = "hub") {
    return `${surface}:spell-cast:${spellId}`;
  }

  getMagicFilterFocusKey(filter) {
    return `magic:filter:${filter}`;
  }

  getSpellLearnFilterFocusKey(filter) {
    return `spell-learn:filter:${filter}`;
  }

  getSpellFilterDefs() {
    return [
      { key: "all", label: "All" },
      ...getSpellCategoryDefs().map((entry) => ({ key: entry.key, label: entry.label }))
    ];
  }

  getSpellFilterDefsForEntries(entries = []) {
    const keys = new Set(entries.map((entry) => getSpellCategoryKey(entry)).filter(Boolean));
    return [
      { key: "all", label: "All" },
      ...getSpellCategoryDefs()
        .filter((entry) => keys.has(entry.key))
        .map((entry) => ({ key: entry.key, label: entry.label }))
    ];
  }

  getSpellFilterChipsMarkup(currentFilter = "all", actionName = "magic-filter", focusKeyGetter = (key) => key, rowClass = "magic-filter-row", filterDefs = this.getSpellFilterDefs()) {
    return `
      <div class="pack-filter-row ${rowClass}">
        ${filterDefs.map((filterDef) => `
          <button class="hub-filter-chip${currentFilter === filterDef.key ? " active" : ""}" data-action="${actionName}" data-filter="${filterDef.key}" data-focus-key="${focusKeyGetter(filterDef.key)}" type="button">${escapeHtml(filterDef.label)}</button>
        `).join("")}
      </div>
    `;
  }

  getSpellTrayToggleFocusKey() {
    return "top:spell-tray";
  }

  getSpellTraySelectionId() {
    const pinned = this.getPinnedSpellIds();
    if (this.targetMode?.type === "spell" && this.targetMode.spellId) {
      return this.targetMode.spellId;
    }
    if (this.pendingSpell && pinned.includes(this.pendingSpell)) {
      return this.pendingSpell;
    }
    return pinned[0] || this.player?.spellsKnown?.[0] || "";
  }

  getSortedKnownSpellIds(spellIds = this.player?.spellsKnown || []) {
    return [...new Set((spellIds || []).filter((spellId) => Boolean(SPELLS[spellId])))]
      .sort((leftId, rightId) => {
        const left = SPELLS[leftId];
        const right = SPELLS[rightId];
        const roleCompare = this.getSpellRoleLabel(left).localeCompare(this.getSpellRoleLabel(right));
        if (roleCompare) {
          return roleCompare;
        }
        const schoolCompare = String(left.school || "spell").localeCompare(String(right.school || "spell"));
        if (schoolCompare) {
          return schoolCompare;
        }
        const tierCompare = (left.tier || 1) - (right.tier || 1);
        if (tierCompare) {
          return tierCompare;
        }
        return left.name.localeCompare(right.name);
      });
  }

  addSpellToTrayIfSpace(spellId, player = this.player) {
    if (!player || !SPELLS[spellId]) {
      return false;
    }
    const tray = this.syncPlayerSpellTray(player);
    if (tray.includes(spellId) || tray.length >= this.getSpellTrayLimit()) {
      return false;
    }
    player.spellTrayIds = [...tray, spellId];
    if (!this.pendingSpell) {
      this.pendingSpell = spellId;
    }
    return true;
  }

  refreshMagicHub(focusTarget = null) {
    if (this.mode === "modal" && this.activeHubTab === "magic") {
      this.showHubModal("magic", {
        preserveScroll: true,
        focusTarget: focusTarget || this.getSpellBookFocusKey(this.pendingSpell || this.player?.spellsKnown?.[0] || "")
      });
      return;
    }
    this.refreshChrome();
    this.render();
  }

  selectSpell(spellId, options = {}) {
    if (!this.player || !SPELLS[spellId] || !this.player.spellsKnown.includes(spellId)) {
      return false;
    }
    const { openTray = false, focusTarget = null } = options;
    if (this.mode === "target" && this.targetMode?.type === "spell" && this.targetMode.spellId !== spellId) {
      this.cancelTargetMode({ silent: true, keepTrayOpen: true });
    }
    this.pendingSpell = spellId;
    if (openTray) {
      this.spellTrayOpen = true;
    }
    if (openTray && this.mode !== "modal") {
      if (this.mode !== "modal") {
        this.refreshChrome();
      }
      return true;
    }
    this.refreshMagicHub(focusTarget);
    return true;
  }

  pinSpellToTray(spellId) {
    if (!this.player || !SPELLS[spellId] || !this.player.spellsKnown.includes(spellId)) {
      return false;
    }
    const tray = this.getPinnedSpellIds();
    if (tray.includes(spellId)) {
      return true;
    }
    if (tray.length >= this.getSpellTrayLimit()) {
      this.log("Spell tray is full. Remove one before pinning another.", "warning");
      return false;
    }
    this.player.spellTrayIds = [...tray, spellId];
    this.pendingSpell = spellId;
    return true;
  }

  unpinSpellFromTray(spellId) {
    if (!this.player) {
      return false;
    }
    const tray = this.getPinnedSpellIds();
    if (!tray.includes(spellId)) {
      return false;
    }
    this.player.spellTrayIds = tray.filter((entry) => entry !== spellId);
    if (this.pendingSpell === spellId) {
      this.pendingSpell = this.player.spellTrayIds[0] || this.player.spellsKnown[0] || null;
    }
    return true;
  }

  moveTraySpell(spellId, direction = 0) {
    if (!this.player || !direction) {
      return false;
    }
    const tray = this.getPinnedSpellIds();
    const index = tray.indexOf(spellId);
    if (index < 0) {
      return false;
    }
    const nextIndex = clamp(index + direction, 0, tray.length - 1);
    if (nextIndex === index) {
      return false;
    }
    const reordered = [...tray];
    const [entry] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, entry);
    this.player.spellTrayIds = reordered;
    return true;
  }

  getLearnableSpellOptions() {
    const affinity = this.player?.className === "Fighter"
      ? "fighter"
      : this.player?.className === "Rogue"
        ? "rogue"
        : "wizard";
    return Object.values(SPELLS)
      .filter((spell) => (spell.learnLevel || 1) <= this.player.level && !this.player.spellsKnown.includes(spell.id))
      .sort((a, b) => {
        const affinityScoreA = a.classAffinity === affinity ? 2 : a.classAffinity === "shared" ? 1 : 0;
        const affinityScoreB = b.classAffinity === affinity ? 2 : b.classAffinity === "shared" ? 1 : 0;
        if (affinityScoreA !== affinityScoreB) {
          return affinityScoreB - affinityScoreA;
        }
        const levelDiff = (a.learnLevel || 1) - (b.learnLevel || 1);
        return levelDiff !== 0 ? levelDiff : a.cost - b.cost;
      });
  }

  getReducedMotionActive() {
    return Boolean(this.settings.reducedMotionEnabled || (this.reducedMotionQuery && this.reducedMotionQuery.matches));
  }

  getEffectProfile() {
    return {
      intensity: this.settings.effectIntensity || "standard",
      reducedMotion: this.getReducedMotionActive()
    };
  }

  setBoardImpulse(dx, dy, strength = 1, duration = 70) {
    const profile = this.getEffectProfile();
    if (profile.reducedMotion || profile.intensity === "minimal") {
      return;
    }
    this.boardImpulse = {
      dx: clamp(dx, -1, 1) * strength,
      dy: clamp(dy, -1, 1) * strength,
      created: nowTime(),
      until: nowTime() + duration
    };
  }

  flashTile(x, y, color, duration = 180, extra = {}) {
    this.addEffect({ type: "tileFlash", x, y, color, duration, ...extra });
  }

  pulseScreen(color, duration = 180, alpha = 0.16) {
    this.addEffect({ type: "screenPulse", color, alpha, duration });
  }

  emitCastCircle(x, y, color) {
    this.addEffect({ type: "castCircle", x, y, color, duration: 220 });
  }

  emitCastFlare(x, y, color, style = "arcane") {
    this.addEffect({ type: "castFlare", x, y, color, style, duration: 220, decorative: true });
  }

  emitTelegraphPulse(x, y, color, duration = 260) {
    this.addEffect({ type: "telegraphPulse", x, y, color, duration });
  }

  emitReadout(text, x, y, color = "#f4edd7", duration = 420) {
    this.addEffect({ type: "floatingText", text, x, y, color, duration });
  }

  emitImpact(attacker, defender, color, damageType = "physical") {
    if (!defender || typeof defender.x !== "number" || typeof defender.y !== "number") {
      return;
    }
    this.addEffect({ type: "impactSpark", x: defender.x, y: defender.y, color, duration: 170, rays: damageType === "magic" ? 7 : 6 });
    this.flashTile(defender.x, defender.y, color, 160, { alpha: 0.24 });
    if (attacker && typeof attacker.x === "number" && typeof attacker.y === "number") {
      this.setBoardImpulse(defender.x - attacker.x, defender.y - attacker.y, 1.2, 75);
    }
  }

  emitDeathBurst(x, y, color) {
    this.addEffect({ type: "deathBurst", x, y, color, duration: 240 });
  }

  emitSpellBurst(x, y, color, radius = 1, style = "arcane") {
    this.addEffect({
      type: "spellBurst",
      x,
      y,
      color,
      radius,
      style,
      duration: this.getReducedMotionActive() ? 150 : 240,
      decorative: true
    });
  }

  getSpellTargetingMode(spell) {
    if (!spell) {
      return "single";
    }
    if (spell.targetingMode) {
      return spell.targetingMode;
    }
    return spell.target === "self" ? "self" : "single";
  }

  getSpellRoleLabel(spell) {
    if (!spell) {
      return "spell";
    }
    if (spell.roleLabel) {
      return spell.roleLabel;
    }
    if (this.getSpellTargetingMode(spell) === "self") {
      return "utility";
    }
    return spell.school || "spell";
  }

  getSpellTargetingLabel(spell) {
    switch (this.getSpellTargetingMode(spell)) {
      case "self":
        return "Self";
      case "blast":
        return `Blast ${((spell?.blastRadius || 0) * 2) + 1}x${((spell?.blastRadius || 0) * 2) + 1}`;
      default:
        return `Single · Range ${spell?.range || 1}`;
    }
  }

  getSpellProjectileStyle(spell) {
    if (!spell) {
      return "arcane";
    }
    return spell.projectileStyle || (spell.school === "elemental" ? "elemental" : "arcane");
  }

  resolveSpellTargetPreview(spellOrId, point = null) {
    const spell = typeof spellOrId === "string" ? SPELLS[spellOrId] : spellOrId;
    const targetingMode = this.getSpellTargetingMode(spell);
    const center = point
      ? { x: point.x, y: point.y }
      : this.targetMode?.cursor
        ? { x: this.targetMode.cursor.x, y: this.targetMode.cursor.y }
        : null;
    const preview = {
      spell,
      targetingMode,
      center,
      tiles: [],
      actors: [],
      targetActor: null,
      hitCount: 0,
      withinRange: targetingMode === "self",
      los: targetingMode === "self",
      valid: targetingMode === "self",
      reason: ""
    };
    if (!spell || !this.player || !this.currentLevel) {
      preview.valid = false;
      preview.reason = "No spell target is available.";
      return preview;
    }
    if (targetingMode === "self") {
      preview.valid = true;
      return preview;
    }
    if (!center || !inBounds(this.currentLevel, center.x, center.y)) {
      preview.valid = false;
      preview.reason = "Move the cursor onto the board.";
      return preview;
    }

    preview.withinRange = distance(this.player, center) <= (spell.range || 8);
    preview.los = hasLineOfSight(this.currentLevel, this.player.x, this.player.y, center.x, center.y);

    if (targetingMode === "blast") {
      const radius = Math.max(0, spell.blastRadius || 1);
      for (let y = center.y - radius; y <= center.y + radius; y += 1) {
        for (let x = center.x - radius; x <= center.x + radius; x += 1) {
          if (!inBounds(this.currentLevel, x, y)) {
            continue;
          }
          preview.tiles.push({ x, y });
        }
      }
      preview.actors = this.currentLevel.actors.filter((actor) =>
        actor.hp > 0
        && preview.tiles.some((tile) => tile.x === actor.x && tile.y === actor.y)
      );
      preview.hitCount = preview.actors.length;
      preview.valid = preview.withinRange && preview.los && preview.hitCount > 0;
      if (!preview.withinRange) {
        preview.reason = `${spell.name} is out of range.`;
      } else if (!preview.los) {
        preview.reason = "The blast point is out of line of sight.";
      } else if (preview.hitCount <= 0) {
        preview.reason = "No enemy stands in the blast.";
      }
      return preview;
    }

    preview.targetActor = actorAt(this.currentLevel, center.x, center.y);
    preview.actors = preview.targetActor ? [preview.targetActor] : [];
    preview.hitCount = preview.actors.length;
    preview.valid = preview.withinRange && preview.los && Boolean(preview.targetActor);
    if (!preview.withinRange) {
      preview.reason = `${spell.name} is out of range.`;
    } else if (!preview.los) {
      preview.reason = "That target is out of line of sight.";
    } else if (!preview.targetActor) {
      preview.reason = "No target stands on that square.";
    }
    return preview;
  }

  getActiveSpellTargetPreview() {
    if (!this.targetMode?.spellId) {
      return null;
    }
    return this.resolveSpellTargetPreview(this.targetMode.spellId, this.targetMode.cursor);
  }

  getDamageEffectColor(damageType, defender) {
    if (damageType === "magic") {
      return "#d8bcff";
    }
    if (damageType === "fire") {
      return "#ffb16f";
    }
    if (damageType === "cold") {
      return "#9ad7ff";
    }
    if (damageType === "poison") {
      return "#97d67f";
    }
    return defender && defender.id === "player" ? "#ff8d73" : "#f2deb1";
  }

  hasAnimatedFeatureTileInView() {
    if (!this.player || !this.currentLevel) {
      return false;
    }
    const view = this.getViewport();
    for (let sy = 0; sy < VIEW_SIZE; sy += 1) {
      for (let sx = 0; sx < VIEW_SIZE; sx += 1) {
        const x = view.x + sx;
        const y = view.y + sy;
        if (!isVisible(this.currentLevel, x, y)) {
          continue;
        }
        const tile = getTile(this.currentLevel, x, y);
        if (tile && ["fountain", "throne", "altar", "stairDown", "stairUp"].includes(tile.kind)) {
          return true;
        }
      }
    }
    return false;
  }

  shouldAnimateBoard() {
    if (!this.player || !this.currentLevel || (this.mode !== "game" && this.mode !== "target")) {
      return false;
    }
    if (this.visualEffects.length > 0) {
      return true;
    }
    if (this.boardImpulse && this.boardImpulse.until > nowTime()) {
      return true;
    }
    if (this.targetMode) {
      return true;
    }
    const profile = this.getEffectProfile();
    const hpRatio = this.player.maxHp > 0 ? this.player.hp / this.player.maxHp : 1;
    const burdenRatio = getCarryWeight(this.player) / Math.max(1, getCarryCapacity(this.player));
    if (hpRatio < 0.42) {
      return true;
    }
    if (burdenRatio >= 0.95) {
      return true;
    }
    if (!profile.reducedMotion && this.hasAnimatedFeatureTileInView()) {
      return true;
    }
    return this.visibleEnemies().some((monster) => monster.intent && ["shoot", "charge", "summon"].includes(monster.intent.type));
  }

  handleClick(event) {
    const moveButton = event.target.closest("[data-move]");
    if (moveButton) {
      if ((this.movementCadence?.ignoreMoveClickUntil || 0) > nowTime()) {
        this.movementCadence.ignoreMoveClickUntil = 0;
        event.preventDefault();
        return;
      }
      if (!this.canPlayerAct()) {
        return;
      }
      event.preventDefault();
      const [dx, dy] = moveButton.dataset.move.split(",").map(Number);
      this.handleMovementIntent(dx, dy);
      return;
    }

    const action = event.target.closest("[data-action]");
    if (action) {
      if (event.target instanceof HTMLInputElement && event.target.type === "checkbox") {
        return;
      }
      event.preventDefault();
      this.handleAction(action.dataset.action, action);
      return;
    }

    const raceChoice = event.target.closest("[data-race]");
    if (raceChoice) {
      this.captureCreationDraft();
      this.selectedRace = raceChoice.dataset.race;
      this.showCreationModal({
        preserveScroll: true,
        focusTarget: `creation:race:${raceChoice.dataset.race}`
      });
      return;
    }

    const classChoice = event.target.closest("[data-class]");
    if (classChoice) {
      this.captureCreationDraft();
      this.selectedClass = classChoice.dataset.class;
      this.showCreationModal({
        preserveScroll: true,
        focusTarget: `creation:class:${classChoice.dataset.class}`
      });
      return;
    }

    if (
      this.spellTrayOpen
      && this.mode === "game"
      && !event.target.closest("#spell-tray")
      && !event.target.closest("#spell-tray-toggle-button")
      && !event.target.closest("#game-canvas")
    ) {
      this.closeSpellTray();
    }
  }

  handleDoubleClick(event) {
    const action = event.target.closest("[data-double-action]");
    if (!action) {
      return;
    }
    event.preventDefault();
    this.handleAction(action.dataset.doubleAction, action);
  }

  handleChange(event) {
    const action = event.target.closest("[data-action]");
    if (!action) {
      return;
    }
    this.handleAction(action.dataset.action, action);
  }

  handlePreviewPointer(event) {
    this.lastPreviewKey = event.target.closest("[data-preview-key]")?.dataset?.previewKey || this.lastPreviewKey;
    this.syncPackHoverPreview(event.target, { allowKeyboard: false });
  }

  handlePreviewFocus(event) {
    this.lastPreviewKey = event.target.closest("[data-preview-key]")?.dataset?.previewKey || this.lastPreviewKey;
    this.syncPackHoverPreview(event.target, { allowKeyboard: true });
  }

  canUsePackHoverPreview({ allowKeyboard = false } = {}) {
    if (this.mode !== "modal" || this.activeHubTab !== "pack" || this.layoutMode !== "desktop") {
      return false;
    }
    const finePointer = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(pointer:fine)").matches
      : false;
    if (!finePointer) {
      return false;
    }
    return allowKeyboard ? this.lastInputSource === "keyboard" : this.lastInputSource === "pointer";
  }

  getPackHoverSelectionFromTarget(target) {
    if (!(target instanceof HTMLElement)) {
      return null;
    }
    const previewNode = target.closest("[data-pack-preview-type]");
    if (!previewNode) {
      return null;
    }
    if (previewNode.dataset.packPreviewType === "slot") {
      return previewNode.dataset.packPreviewValue
        ? { type: "slot", value: previewNode.dataset.packPreviewValue }
        : null;
    }
    const index = Number(previewNode.dataset.packPreviewValue);
    return Number.isFinite(index) ? { type: "inventory", value: index } : null;
  }

  isSamePackSelection(left, right) {
    return Boolean(left && right && left.type === right.type && left.value === right.value);
  }

  refreshPackInspectorPreview() {
    if (this.mode !== "modal" || this.activeHubTab !== "pack") {
      return;
    }
    const currentInspector = this.modalRoot.querySelector(".pack-inspector-panel");
    if (!currentInspector) {
      return;
    }
    const model = this.getPackSelectionModel();
    const inventoryModel = buildInventoryPresentationModel(this, {
      filter: this.activePackFilter,
      selectedIndex: model.selection.type === "inventory" ? model.selection.value : -1,
      shopId: this.getCurrentPackShopContext()
    });
    const wrapper = document.createElement("div");
    wrapper.innerHTML = this.getPackInspectorMarkup(model, inventoryModel).trim();
    const nextInspector = wrapper.firstElementChild;
    if (nextInspector) {
      currentInspector.replaceWith(nextInspector);
    }
  }

  setHoveredPackSelection(selection) {
    if (!selection) {
      this.clearHoveredPackSelection();
      return;
    }
    const normalized = selection.type === "slot"
      ? { type: "slot", value: selection.value }
      : { type: "inventory", value: Math.max(0, Number(selection.value) || 0) };
    if (this.isSamePackSelection(this.hoveredPackSelection, normalized)) {
      return;
    }
    this.hoveredPackSelection = normalized;
    this.refreshPackInspectorPreview();
  }

  clearHoveredPackSelection() {
    if (!this.hoveredPackSelection) {
      return;
    }
    this.hoveredPackSelection = null;
    this.refreshPackInspectorPreview();
  }

  syncPackHoverPreview(target, { allowKeyboard = false } = {}) {
    if (!this.canUsePackHoverPreview({ allowKeyboard })) {
      this.clearHoveredPackSelection();
      return;
    }
    const selection = this.getPackHoverSelectionFromTarget(target);
    if (selection) {
      this.setHoveredPackSelection(selection);
      return;
    }
    if (target instanceof HTMLElement && target.closest(".hub-window-pack")) {
      this.clearHoveredPackSelection();
    }
  }

  handleCanvasClick(event) {
    if (!this.player || this.isPlayerDead() || (this.mode !== "game" && this.mode !== "target")) {
      return;
    }
    if (this.spellTrayOpen && this.mode === "game") {
      this.closeSpellTray();
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const localX = (event.clientX - rect.left) * scaleX;
    const localY = (event.clientY - rect.top) * scaleY;
    const view = this.getViewport();
    const tileX = Math.floor(localX / TILE_SIZE) + view.x;
    const tileY = Math.floor(localY / TILE_SIZE) + view.y;
    if (this.mode === "target") {
      this.targetMode.cursor = { x: tileX, y: tileY };
      this.confirmTargetSelection();
      return;
    }
    const dx = clamp(tileX - this.player.x, -1, 1);
    const dy = clamp(tileY - this.player.y, -1, 1);
    if (dx === 0 && dy === 0) {
      const currentTile = getTile(this.currentLevel, this.player.x, this.player.y);
      if (currentTile?.optionalId) {
        this.interactHere();
        return;
      }
      this.performWait();
      return;
    }
    this.handleMovementIntent(dx, dy);
  }

  handleAction(actionName, element) {
    if (this.isPlayerDead() && !["new-game", "load-game"].includes(actionName)) {
      return;
    }
    this.resetMovementCadence({ clearHeld: false });
    switch (actionName) {
      case "new-game":
        this.resetCreationDraft();
        this.showCreationModal();
        break;
      case "save-game": {
        const requestedSlot = Number(element?.dataset?.saveSlot || 0) || null;
        if (requestedSlot) {
          this.saveGame({ slotId: requestedSlot });
          this.showSaveSlotsModal("save", {
            preserveScroll: true,
            focusTarget: `save-slots:save:${requestedSlot}`
          });
          break;
        }
        this.showSaveSlotsModal("save", {
          preserveScroll: this.mode === "modal",
          focusTarget: element?.dataset?.focusKey || null
        });
        break;
      }
      case "load-game": {
        const requestedSlot = Number(element?.dataset?.saveSlot || 0) || null;
        if (!requestedSlot) {
          this.showSaveSlotsModal("load", {
            preserveScroll: this.mode === "modal" || this.mode === "title",
            focusTarget: element?.dataset?.focusKey || null
          });
          break;
        }
        if (this.mode === "title") {
          this.recordTelemetry("title_continue_used", {
            hasSave: Boolean(this.getSavedRunMeta(requestedSlot)),
            slotId: requestedSlot
          });
        }
        this.loadGame({ slotId: requestedSlot });
        break;
      }
      case "toggle-music":
        this.toggleMusicPreference();
        break;
      case "export-telemetry":
        this.exportTelemetryTrace();
        break;
      case "open-hub": {
        const tab = element && element.dataset.tab ? element.dataset.tab : "pack";
        const journalSection = element?.dataset?.journalSection || null;
        if (tab === "pack" && element?.dataset?.filter) {
          this.activePackFilter = element.dataset.filter;
          const inventoryModel = buildInventoryPresentationModel(this, {
            filter: this.activePackFilter,
            selectedIndex: this.activePackSelection?.type === "inventory" ? this.activePackSelection.value : -1,
            shopId: this.getCurrentPackShopContext()
          });
          if (inventoryModel.firstVisibleIndex >= 0) {
            this.setPackSelection({ type: "inventory", value: inventoryModel.firstVisibleIndex });
          }
        }
        this.showHubModal(tab, {
          preserveScroll: this.mode === "modal",
          focusTarget: tab === "journal" && journalSection
            ? this.getJournalSectionFocusKey(journalSection)
            : element
              ? this.getHubTabFocusKey(tab)
              : null,
          journalSection
        });
        break;
      }
      case "journal-section":
        this.showHubModal("journal", {
          preserveScroll: true,
          focusTarget: this.getJournalSectionFocusKey(element?.dataset?.section || "current"),
          journalSection: element?.dataset?.section || "current"
        });
        break;
      case "open-spell-tray":
        this.openSpellTray();
        break;
      case "inventory":
        this.showInventoryModal();
        break;
      case "open-character-sheet":
        this.showCharacterSheet(this.getUtilityModalReturnOptions("utility:stats"));
        break;
      case "spells":
        this.showSpellModal();
        break;
      case "wait":
        this.performWait();
        break;
      case "stairs-or-wait": {
        const tile = this.currentLevel && this.player ? getTile(this.currentLevel, this.player.x, this.player.y) : null;
        if (tile?.kind === "stairDown") {
          this.useStairs("down");
          break;
        }
        if (tile?.kind === "stairUp") {
          this.useStairs("up");
          break;
        }
        this.performWait();
        break;
      }
      case "rest":
        this.restUntilSafe();
        break;
      case "sleep":
        this.sleepUntilRestored();
        break;
      case "help":
        this.showHelpModal(this.getUtilityModalReturnOptions("utility:help"));
        break;
      case "open-briefing":
        this.showBriefingModal(this.getUtilityModalReturnOptions("utility:briefing"));
        break;
      case "open-bank":
        this.showBankModal({
          focusTarget: this.getTownActionFocusKey("rumor")
        });
        this.render();
        break;
      case "settings":
        this.showSettingsModal(this.getUtilityModalReturnOptions("utility:settings"));
        break;
      case "open-utility-menu":
        this.showUtilityMenu();
        break;
      case "open-town-service":
        this.openTownService(element.dataset.service);
        break;
      case "view-map":
        if (this.mode === "modal" && !this.pendingPickupPrompt) {
          this.closeModal();
        }
        this.focusMap();
        break;
      case "toggle-map":
        if (this.mapDrawer) {
          this.mapDrawerOpen = !this.mapDrawerOpen;
          this.refreshChrome();
        } else {
          this.focusMap();
        }
        break;
      case "toggle-feed-log":
        this.feedDrawerOpen = !this.feedDrawerOpen;
        this.render();
        break;
      case "begin-adventure":
        this.beginAdventure();
        break;
      case "creation-reset-stats":
        this.captureCreationDraft();
        this.creationStatBonuses = { str: 0, dex: 0, con: 0, int: 0 };
        this.showCreationModal({
          preserveScroll: true,
          focusTarget: "creation:reset-stats"
        });
        break;
      case "creation-adjust-stat":
        this.captureCreationDraft();
        if (this.adjustCreationStat(element.dataset.stat, Number(element.dataset.delta))) {
          this.showCreationModal({
            preserveScroll: true,
            focusTarget: `creation:stat:${element.dataset.stat}:${element.dataset.delta === "-1" ? "down" : "up"}`
          });
        }
        break;
      case "close-modal":
        if (this.pendingPickupPrompt) {
          this.cancelPendingPickup();
          break;
        }
        this.closeModal();
        break;
      case "pickup-confirm":
        this.confirmPendingPickup(false);
        break;
      case "pickup-equip":
        this.confirmPendingPickup(true);
        break;
      case "pickup-cancel":
        this.cancelPendingPickup();
        break;
      case "item-use":
        this.useInventoryItem(element.dataset.index);
        break;
      case "item-drop":
        this.dropInventoryItem(element.dataset.index);
        break;
      case "toggle-sale-mark":
        this.toggleInventorySaleMark(
          element.dataset.index,
          element instanceof HTMLInputElement && element.type === "checkbox" ? element.checked : null
        );
        break;
      case "inspect-pack-item":
        this.showHubModal("pack", {
          selection: { type: "inventory", value: Number(element.dataset.index) },
          preserveScroll: true,
          focusTarget: this.getPackItemFocusKey(Number(element.dataset.index))
        });
        break;
      case "inspect-slot":
        this.showHubModal("pack", {
          selection: { type: "slot", value: element.dataset.slot },
          preserveScroll: true,
          focusTarget: this.getPackSlotFocusKey(element.dataset.slot)
        });
        break;
      case "unequip-slot":
        this.unequipSlot(element.dataset.slot);
        break;
      case "pack-filter":
        this.activePackFilter = element.dataset.filter || "all";
        if (this.player) {
          const inventoryModel = buildInventoryPresentationModel(this, {
            filter: this.activePackFilter,
            selectedIndex: this.activePackSelection?.type === "inventory" ? this.activePackSelection.value : -1,
            shopId: this.getCurrentPackShopContext()
          });
          if (inventoryModel.firstVisibleIndex >= 0) {
            this.setPackSelection({ type: "inventory", value: inventoryModel.firstVisibleIndex });
          }
        }
        this.showHubModal("pack", {
          preserveScroll: true,
          focusTarget: this.getPackFilterFocusKey(this.activePackFilter)
        });
        break;
      case "magic-filter":
        this.activeMagicFilter = element.dataset.filter || "all";
        this.refreshMagicHub(this.getMagicFilterFocusKey(this.activeMagicFilter));
        break;
      case "spell-learn-filter":
        this.activeSpellLearnFilter = element.dataset.filter || "all";
        this.showSpellLearnModal();
        break;
      case "learn-spell":
        this.learnLevelUpSpell(element.dataset.spell);
        break;
      case "choose-reward":
        this.chooseRewardChoice(element.dataset.reward);
        break;
      case "spell-select":
        this.selectSpell(element.dataset.spell, {
          openTray: element.dataset.surface === "tray",
          focusTarget: element.dataset.focusKey || this.getSpellBookFocusKey(element.dataset.spell || "")
        });
        break;
      case "spell-cast":
        this.selectSpell(element.dataset.spell, {
          openTray: true,
          focusTarget: element.dataset.focusKey || this.getSpellBookFocusKey(element.dataset.spell || "")
        });
        this.prepareSpell(element.dataset.spell);
        break;
      case "spell-pin-toggle": {
        const spellId = element.dataset.spell || "";
        const changed = this.getPinnedSpellIds().includes(spellId)
          ? this.unpinSpellFromTray(spellId)
          : this.pinSpellToTray(spellId);
        if (changed) {
          this.refreshMagicHub(this.getSpellBookFocusKey(spellId));
        }
        break;
      }
      case "spell-pin-up":
        if (this.moveTraySpell(element.dataset.spell || "", -1)) {
          this.refreshMagicHub(this.getSpellBookFocusKey(element.dataset.spell || ""));
        }
        break;
      case "spell-pin-down":
        if (this.moveTraySpell(element.dataset.spell || "", 1)) {
          this.refreshMagicHub(this.getSpellBookFocusKey(element.dataset.spell || ""));
        }
        break;
      case "spell-tray-close":
        this.closeSpellTray();
        break;
      case "shop-buy":
        this.buyShopItem(element.dataset.shop, element.dataset.item);
        break;
      case "shop-sell":
        this.sellShopItem(element.dataset.index);
        break;
      case "shop-panel":
        this.activeShopPanel = element.dataset.panel === "sell" ? "sell" : "buy";
        if (this.pendingShop) {
          this.showShopModal(this.pendingShop.id, this.pendingShop, {
            preserveScroll: true,
            focusTarget: this.getShopPanelFocusKey(this.activeShopPanel),
            panel: this.activeShopPanel
          });
        }
        break;
      case "shop-sell-marked":
        this.sellMarkedItems();
        break;
      case "bank-deposit":
        this.handleBank("deposit");
        break;
      case "bank-withdraw":
        this.handleBank("withdraw");
        break;
      case "town-unlock":
        if (purchaseTownUnlock(this, element.dataset.unlock)) {
          this.showBankModal({
            preserveScroll: true,
            focusTarget: this.getTownUnlockFocusKey(element.dataset.unlock)
          });
          this.render();
        }
        break;
      case "town-rumor":
        if (buyTownRumor(this)) {
          this.showBankModal({
            preserveScroll: true,
            focusTarget: this.getTownActionFocusKey("rumor")
          });
          this.render();
        }
        break;
      case "contract-toggle":
        if (this.setActiveContract(element.dataset.contract || "")) {
          this.showBankModal({
            preserveScroll: true,
            focusTarget: `contract:${element.dataset.contract || "clear"}`
          });
          this.render();
        }
        break;
      case "contract-arm-recommended": {
        const recommendation = this.getRecommendedContract();
        if (recommendation?.id && this.setActiveContract(recommendation.id)) {
          if (this.mode === "creation") {
            this.showCreationModal({
              preserveScroll: true,
              focusTarget: "creation:contract:recommended"
            });
          } else if (this.mode === "title") {
            this.showTitleScreen();
          } else {
            this.showBankModal({
              preserveScroll: true,
              focusTarget: `contract:${recommendation.id}`
            });
          }
          this.render();
        }
        break;
      }
      case "service-use":
        if (!this.pendingService && this.currentDepth === 0 && element?.dataset?.service) {
          this.openTownService(element.dataset.service);
          break;
        }
        this.useService(element.dataset.service);
        break;
      case "interact":
        this.interactHere();
        break;
      case "search":
        this.performSearch();
        break;
      case "pickup":
        this.pickupHere(false, false);
        break;
      case "stairs-up":
        this.useStairs("up");
        break;
      case "stairs-down":
        this.useStairs("down");
        break;
      case "map-focus":
        this.focusMap();
        break;
      case "setting-toggle":
        this.toggleSetting(element.dataset.setting);
        break;
      case "target-confirm":
        this.confirmTargetSelection();
        break;
      case "target-cancel":
        this.cancelTargetMode();
        break;
      default:
        break;
    }
  }

  handleKeydown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      this.saveGame();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "l") {
      event.preventDefault();
      this.loadGame();
      return;
    }

    if (this.mode === "title") {
      if (event.key === "Enter") {
        event.preventDefault();
        this.resetCreationDraft();
        this.showCreationModal();
      }
      if (event.key.toLowerCase() === "l") {
        event.preventDefault();
        this.loadGame();
      }
      return;
    }

    if (this.mode === "creation") {
      if (event.key === "Enter") {
        this.beginAdventure();
      }
      return;
    }

    if (this.mode === "levelup") {
      return;
    }

    if (this.mode === "modal") {
      if (event.key === "Escape") {
        if (this.isPlayerDead()) {
          return;
        }
        if (this.pendingPickupPrompt) {
          this.cancelPendingPickup();
        } else {
          this.closeModal();
        }
      }
      return;
    }

    if (this.mode === "target") {
      const lowerTarget = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (DIRECTIONS[lowerTarget]) {
        event.preventDefault();
        const [dx, dy] = DIRECTIONS[lowerTarget];
        this.moveTargetCursor(dx, dy);
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.confirmTargetSelection();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        this.cancelTargetMode();
      }
      return;
    }

    if (!this.player || this.mode !== "game" || this.isPlayerDead()) {
      return;
    }

    const lower = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (event.shiftKey && lower === "r") {
      event.preventDefault();
      this.sleepUntilRestored();
      return;
    }

    if (DIRECTIONS[lower]) {
      event.preventDefault();
      const [dx, dy] = DIRECTIONS[lower];
      this.setHeldMovement("keyboard", dx, dy, lower);
      if (!event.repeat) {
        this.handleMovementIntent(dx, dy);
        this.scheduleHeldMovementRepeat("keyboard");
      }
      return;
    }

    this.resetMovementCadence();
    if (event.key === "Escape") {
      event.preventDefault();
      if (this.handleControllerBackAction()) {
        this.render();
      }
      return;
    }
    switch (lower) {
      case ".":
      case "5":
      case " ":
        event.preventDefault();
        this.performWait();
        break;
      case "m":
        event.preventDefault();
        if (this.mapDrawer && this.mapDrawerOpen) {
          this.mapDrawerOpen = false;
          this.refreshChrome();
        } else {
          this.focusMap();
        }
        break;
      case "i":
        event.preventDefault();
        this.showInventoryModal();
        break;
      case "s":
        event.preventDefault();
        if (event.shiftKey) {
          this.showSpellModal();
        } else {
          this.openSpellTray();
        }
        break;
      case ">":
        event.preventDefault();
        this.useStairs("down");
        break;
      case "<":
        event.preventDefault();
        this.useStairs("up");
        break;
      case "g":
        event.preventDefault();
        this.pickupHere();
        break;
      case "r":
        event.preventDefault();
        this.restUntilSafe();
        break;
      case "h":
        event.preventDefault();
        this.showHelpModal();
        break;
      case "u":
      case "v":
        event.preventDefault();
        this.interactHere();
        break;
      case "f":
        event.preventDefault();
        this.performSearch();
        break;
      default:
        break;
    }
  }

  handleMovementIntent(dx, dy) {
    if (!this.player || this.isPlayerDead()) {
      return;
    }
    if (this.mode === "target") {
      this.moveTargetCursor(dx, dy);
      return;
    }
    this.tryMovePlayer(dx, dy);
  }

  beginAdventure() {
    this.resetMovementCadence();
    this.activeSaveSlotId = null;
    const race = getRace(this.selectedRace);
    const role = getClass(this.selectedClass);
    this.captureCreationDraft();
    const heroName = this.creationName || "Morgan";
    const stats = this.getCreationStats();
    ensureMetaProgressionState(this);
    initializeValidationState(this);
    const onboardingMeta = getOnboardingVariantMeta(this);

    this.player = {
      id: "player",
      name: heroName,
      race: race.name,
      raceId: race.id,
      className: role.name,
      classId: role.id,
      x: 0,
      y: 0,
      level: 1,
      exp: 0,
      nextLevelExp: 80,
      gold: 55,
      bankGold: 0,
      constitutionLoss: 0,
      deepestDepth: 0,
      hpBase: race.hp + role.bonuses.hp,
      manaBase: race.mana + role.bonuses.mana,
      stats,
      hp: 1,
      maxHp: 1,
      mana: 0,
      maxMana: 0,
      moveSpeed: 100,
      moveTurnBudget: 0,
      inventory: [],
      equipment: createEmptyEquipment(),
      perks: [],
      relics: [],
      runCurrencies: {
        rumorTokens: 0,
        hunterMark: 0,
        templeFavor: 0
      },
      knownRumors: [],
      spellsKnown: [...role.spells],
      spellTrayIds: [...role.spells].slice(0, this.getSpellTrayLimit()),
      lightRadius: FOV_RADIUS,
      quest: {
        hasRunestone: false,
        complete: false,
        milestonesCleared: [],
        namedBossesDefeated: [],
        briefingsSeen: [],
        discoveryIdsFound: [],
        storyBeatFlags: {},
        npcSceneFlags: {}
      }
    };
    this.ensureEquipmentAliases(this.player);
    this.syncPlayerSpellTray(this.player);

    role.startItems.forEach((itemId) => this.addItemToInventory(createTownItem(itemId)));
    const activeContract = applyContractToNewRun(this);
    const masteryRewards = applyClassMasteryBonuses(this);
    const commendationRewards = applyCommendationBonuses(this);
    this.autoEquipStarterGear();
    this.turn = 1;
    this.storyFlags = {
      introBriefingAvailable: true,
      townServiceVisited: false,
      firstTownGuidance: "service"
    };
    this.shopState = createInitialShopState();
    this.townUnlocks = {};
    this.shopTiers = {};
    this.townState = {};
    this.rumorTable = [];
    this.chronicleEvents = [];
    this.deathContext = null;
    this.runPersistenceChanges = {
      masteryUnlocks: [],
      contractUnlocks: [],
      commendationUnlocks: []
    };
    this.lastTownRefreshTurn = 0;
    this.pendingSpellChoices = 0;
    this.pendingPerkChoices = 0;
    this.pendingRewardChoice = null;
    this.pendingRewardQueue = [];
    this.pendingTurnResolution = null;
    this.feedDrawerOpen = false;
    this.liveFeedSticky = null;
    this.storyFlags.postReturnBankPrompt = false;
    this.resetReadState();
    resetTelemetry(this);
    ensureBuildState(this);
    ensureTownMetaState(this);
    ensureChronicleState(this);
    ensureMetaProgressionState(this);
    this.generateWorld();
    this.applyRunContractWorldModifiers(activeContract);
    this.syncTownCycle(true);
    this.recalculateDerivedStats();
    this.player.hp = this.player.maxHp;
    this.player.mana = this.player.maxMana;
    this.mode = "game";
    this.closeModal();
    this.syncAdaptiveLayout(true);
    this.log(`${heroName} enters the valley beneath the ruined keep.`, "good");
    this.log("Recover the Runestone of the Winds from the lower halls and return to town.", "warning");
    this.log(`${onboardingMeta.firstTownPrimary} ${onboardingMeta.firstTownSupport}`, "warning");
    if (activeContract) {
      this.log(`Contract active: ${activeContract.name}. ${activeContract.summary}`, "warning");
    }
    if (masteryRewards.length > 0) {
      this.log(`Class mastery loadout: ${masteryRewards.join(", ")}.`, "good");
    }
    if (commendationRewards.length > 0) {
      this.log(`Commendation prep: ${commendationRewards.join(", ")}.`, "good");
    }
    startTelemetryRun(this);
    this.recordTelemetry("creation_confirmed", {
      heroName,
      raceId: race.id,
      classId: role.id,
      stats,
      pointsAllocated: Object.values(this.creationStatBonuses).reduce((sum, value) => sum + value, 0)
    });
    this.recordChronicleEvent("floor_enter", { label: "The valley town below the keep" });
    this.updateFov();
    this.saveGame({ silent: true });
    this.render();
  }

  autoEquipStarterGear() {
    const equippedIds = new Set();
    this.player.inventory.forEach((item, index) => {
      const equipTarget = this.getEquipmentSlotForItem(item);
      if ((item.kind === "weapon" || item.kind === "armor") && equipTarget.targetSlot) {
        this.player.equipment[equipTarget.targetSlot] = item;
        equippedIds.add(index);
      }
    });
    this.player.inventory = this.player.inventory.filter((_, index) => !equippedIds.has(index));
    this.recalculateDerivedStats();
  }

  generateWorld() {
    this.levels = [];
    this.levels.push(this.generateTownLevel());
    for (let depth = 1; depth <= DUNGEON_DEPTH; depth += 1) {
      this.levels.push(this.generateDungeonLevel(depth));
    }
    this.currentDepth = 0;
    this.currentLevel = this.levels[0];
    this.resetReadState();
    this.placePlayerAt(this.currentLevel.start.x, this.currentLevel.start.y);
  }

  generateTownLevel() {
    const width = 48;
    const height = 34;
    const level = blankLevel(width, height, "town");
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const border = x === 0 || y === 0 || x === width - 1 || y === height - 1;
        setTile(level, x, y, tileDef(border ? "tree" : "grass"));
      }
    }

    for (let x = 4; x < width - 4; x += 1) {
      setTile(level, x, 16, tileDef("road"));
    }
    for (let y = 4; y < height - 4; y += 1) {
      setTile(level, 24, y, tileDef("road"));
    }
    fillRect(level, 19, 12, 11, 9, tileDef("stone"));
    fillRect(level, 20, 13, 9, 7, tileDef("plaza"));
    fillRect(level, 22, 6, 5, 5, tileDef("stone"));
    fillRect(level, 23, 7, 3, 3, tileDef("plaza"));
    placeBuilding(level, 4, 4, 9, 7, "General Store", "general");
    placeBuilding(level, 35, 4, 9, 7, "Armory", "armory");
    placeBuilding(level, 4, 22, 9, 7, "Wizard Guild", "guild");
    placeBuilding(level, 35, 22, 9, 7, "Temple", "temple");
    placeBuilding(level, 20, 25, 9, 5, "Bank", "bank");
    placeBuilding(level, 15, 4, 7, 6, "Sage Tower", "sage");
    placeBuilding(level, 27, 4, 6, 6, "Junk Shop", "junk");
    setTile(level, 24, 8, tileDef("stairDown"));
    level.start = { x: 24, y: 16 };
    level.stairsDown = { x: 24, y: 8 };
    level.description = "The valley town below the keep";
    this.addTownGuideProps(level);
    revealAll(level);
    return level;
  }

  chooseSecondaryEntryRoomIndex(rooms) {
    if (!rooms || rooms.length < 3) {
      return null;
    }
    const primaryCenter = centerOf(rooms[1]);
    let bestIndex = 2;
    let bestDistance = -1;
    for (let index = 2; index < Math.min(rooms.length, 7); index += 1) {
      const candidateCenter = centerOf(rooms[index]);
      const candidateDistance = distance(primaryCenter, candidateCenter);
      if (candidateDistance > bestDistance) {
        bestDistance = candidateDistance;
        bestIndex = index;
      }
    }
    return bestIndex;
  }

  ensureEntryRoutes(level, rooms) {
    const secondaryIndex = this.chooseSecondaryEntryRoomIndex(rooms);
    if (secondaryIndex === null) {
      level.safeEntryRoomIndexes = [0];
      return;
    }
    carveTunnel(level, centerOf(rooms[0]), centerOf(rooms[secondaryIndex]));
    level.safeEntryRoomIndexes = [0, 1, secondaryIndex];
  }

  addTownGuideProps(level) {
    [
      { x: 24, y: 12 },
      { x: 24, y: 10 },
      { x: 24, y: 8 }
    ].forEach((point, index) => {
      addLevelProp(level, {
        id: `road-beacon-${index}`,
        x: point.x,
        y: point.y,
        propId: "roadBeacon",
        layer: "fixture",
        alwaysVisible: true,
        light: true
      });
    });
    (level.buildings || []).forEach((building) => {
      const doorX = building.x + Math.floor(building.w / 2);
      addLevelProp(level, {
        id: `town-sign-${building.service}`,
        x: doorX,
        y: building.y,
        propId: "townSign",
        layer: "fixture",
        alwaysVisible: true
      });
    });
  }

  findPathOnLevel(level, start, goal) {
    return Boolean(this.findPathRouteOnLevel(level, start, goal));
  }

  findPathRouteOnLevel(level, start, goal) {
    if (!level || !start || !goal) {
      return null;
    }
    const keyFor = (x, y) => `${x},${y}`;
    const queue = [{ x: start.x, y: start.y }];
    const parents = new Map([[keyFor(start.x, start.y), null]]);
    while (queue.length > 0) {
      const current = queue.shift();
      if (current.x === goal.x && current.y === goal.y) {
        const route = [];
        let key = keyFor(current.x, current.y);
        while (key) {
          const [xText, yText] = key.split(",");
          route.push({ x: Number(xText), y: Number(yText) });
          key = parents.get(key);
        }
        return route.reverse();
      }
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) {
            continue;
          }
          const nextX = current.x + dx;
          const nextY = current.y + dy;
          const key = keyFor(nextX, nextY);
          if (parents.has(key) || !inBounds(level, nextX, nextY) || !isWalkable(level, nextX, nextY)) {
            continue;
          }
          parents.set(key, keyFor(current.x, current.y));
          queue.push({ x: nextX, y: nextY });
        }
      }
    }
    return null;
  }

  getPrimaryGoalMarker(level = this.currentLevel) {
    if (!level) {
      return null;
    }
    if (level.floorObjective?.marker && !level.floorResolved) {
      return level.floorObjective.marker;
    }
    if (level.milestone?.marker && level.milestone.status !== "cleared") {
      return level.milestone.marker;
    }
    return null;
  }

  getDepthOneMaxObjectiveSteps() {
    return 40;
  }

  getDepthOneMaxExitSteps() {
    return 60;
  }

  roomsOverlapOrTouch(left, right) {
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

  getRoomIndexForPoint(level, point) {
    if (!level?.rooms || !point) {
      return null;
    }
    const index = level.rooms.findIndex((room) =>
      point.x >= room.x &&
      point.x < room.x + room.w &&
      point.y >= room.y &&
      point.y < room.y + room.h
    );
    return index >= 0 ? index : null;
  }

  revealRoom(level, roomIndex) {
    if (!level?.rooms || roomIndex === null || roomIndex === undefined || !level.rooms[roomIndex]) {
      return false;
    }
    const room = level.rooms[roomIndex];
    for (let y = room.y; y < room.y + room.h; y += 1) {
      for (let x = room.x; x < room.x + room.w; x += 1) {
        setExplored(level, x, y, true);
      }
    }
    return true;
  }

  revealRouteSlice(level, route, fromIndex, toIndex, pocketStride = 4) {
    if (!level || !Array.isArray(route) || route.length === 0) {
      return;
    }
    const startIndex = clamp(fromIndex, 0, route.length);
    const endIndex = clamp(toIndex, startIndex, route.length);
    for (let index = startIndex; index < endIndex; index += 1) {
      const point = route[index];
      if (!point || !inBounds(level, point.x, point.y)) {
        continue;
      }
      const pocketRadius = index % pocketStride === 0 ? 1 : 0;
      for (let y = point.y - pocketRadius; y <= point.y + pocketRadius; y += 1) {
        for (let x = point.x - pocketRadius; x <= point.x + pocketRadius; x += 1) {
          if (!inBounds(level, x, y)) {
            continue;
          }
          setExplored(level, x, y, true);
        }
      }
    }
  }

  getObjectiveBreadcrumbStyle(objectiveId = "") {
    const styles = {
      recover_relic: {
        id: "relic_route",
        breadcrumbPropId: "routeRune",
        landmarkPropId: "relicPedestal",
        label: "runic cuts",
        leadText: "Follow the runic cuts into the relic hall."
      },
      purge_nest: {
        id: "nest_route",
        breadcrumbPropId: "routeTorch",
        landmarkPropId: "broodNest",
        label: "smoke-marked torches",
        leadText: "Follow the smoke-marked torches toward the kennels."
      },
      rescue_captive: {
        id: "cell_route",
        breadcrumbPropId: "routePennant",
        landmarkPropId: "prisonerCell",
        label: "torn pennants",
        leadText: "Follow the torn pennants toward the cells."
      },
      seal_shrine: {
        id: "shrine_route",
        breadcrumbPropId: "routeLamp",
        landmarkPropId: "shrineSeal",
        label: "violet lamps",
        leadText: "Follow the violet lamps toward the chapel."
      },
      break_beacon: {
        id: "watch_route",
        breadcrumbPropId: "routeBeacon",
        landmarkPropId: "beaconFocus",
        label: "watch sparks",
        leadText: "Follow the watch sparks toward the beacon room."
      },
      secure_supplies: {
        id: "supply_route",
        breadcrumbPropId: "routeSupply",
        landmarkPropId: "vaultChest",
        label: "chalk supply marks",
        leadText: "Follow the chalk supply marks into the store rooms."
      },
      recover_waystone: {
        id: "waystone_route",
        breadcrumbPropId: "routeCairn",
        landmarkPropId: "relicPedestal",
        label: "survey cairns",
        leadText: "Follow the survey cairns toward the waystone chamber."
      },
      purify_well: {
        id: "well_route",
        breadcrumbPropId: "routeWater",
        landmarkPropId: "well",
        label: "silver ripples",
        leadText: "Follow the silver ripples toward the corrupted well."
      }
    };
    return styles[objectiveId] || {
      id: "floor_route",
      breadcrumbPropId: "routeMark",
      landmarkPropId: "inscribedStone",
      label: "route marks",
      leadText: "Follow the route marks toward the floor objective."
    };
  }

  getWingDirectionLabel(fromPoint, toPoint) {
    if (!fromPoint || !toPoint) {
      return "inner";
    }
    const dx = toPoint.x - fromPoint.x;
    const dy = toPoint.y - fromPoint.y;
    if (Math.abs(dx) >= Math.abs(dy) + 4) {
      return dx >= 0 ? "east" : "west";
    }
    if (Math.abs(dy) >= Math.abs(dx) + 4) {
      return dy >= 0 ? "south" : "north";
    }
    if (dx >= 0 && dy >= 0) {
      return "southeast";
    }
    if (dx >= 0 && dy < 0) {
      return "northeast";
    }
    if (dx < 0 && dy >= 0) {
      return "southwest";
    }
    return "northwest";
  }

  buildObjectiveWingLabel(level) {
    const objective = level?.floorObjective;
    if (!objective?.marker || !level?.start) {
      return "objective wing";
    }
    const direction = this.getWingDirectionLabel(level.start, objective.marker);
    const nouns = {
      recover_relic: "relic hall",
      purge_nest: "kennels",
      rescue_captive: "cell wing",
      seal_shrine: "chapel",
      break_beacon: "watch post",
      secure_supplies: "store rooms",
      recover_waystone: "survey vault",
      purify_well: "well chamber"
    };
    return `${direction} ${nouns[objective.id] || "objective wing"}`;
  }

  buildRouteGuide(level, depth, objectiveRoute = [], routeBeats = [], signatureReveal = null) {
    const objectiveId = level?.floorObjective?.id || "";
    const breadcrumbStyle = this.getObjectiveBreadcrumbStyle(objectiveId);
    const objectiveWingLabel = this.buildObjectiveWingLabel(level);
    const milestones = routeBeats.map((beat, index) => ({
      id: beat.id,
      label: beat.label,
      x: beat.x,
      y: beat.y,
      routeIndex: objectiveRoute.findIndex((point) => point.x === beat.x && point.y === beat.y),
      hint: beat.cue || beat.text,
      reached: false,
      priority: index
    }));
    const firstHint = depth === 1
      ? `Objective route: ${objectiveWingLabel}. ${breadcrumbStyle.leadText}`
      : signatureReveal?.routeCue || `Objective route: ${objectiveWingLabel}.`;
    return {
      objectiveWingLabel,
      currentHint: firstHint,
      milestones,
      spineTiles: objectiveRoute.map((point) => ({ x: point.x, y: point.y })),
      breadcrumbStyle,
      firstHint
    };
  }

  addRouteBreadcrumbs(level, depth, routeGuide) {
    if (!level || level.kind !== "dungeon" || !routeGuide?.spineTiles?.length) {
      return;
    }
    const route = routeGuide.spineTiles;
    const style = routeGuide.breadcrumbStyle || this.getObjectiveBreadcrumbStyle(level.floorObjective?.id || "");
    const startOffset = depth === 1 ? 3 : 5;
    const stride = depth === 1 ? 5 : 7;
    let placed = 0;
    for (let index = startOffset; index < route.length - 2; index += stride) {
      const point = route[index];
      if (!point || !inBounds(level, point.x, point.y)) {
        continue;
      }
      const tile = getTile(level, point.x, point.y);
      if (!tile?.walkable || tile.objectiveId || tile.optionalId || tile.roomEventId || tile.kind === "stairUp" || tile.kind === "stairDown") {
        continue;
      }
      const propId = style.breadcrumbPropId;
      addLevelProp(level, {
        id: `route-crumb-${depth}-${style.id}-${index}`,
        x: point.x,
        y: point.y,
        propId,
        layer: "fixture",
        light: ["routeTorch", "routeLamp", "routeBeacon", "routeWater"].includes(propId)
      });
      setTile(level, point.x, point.y, tileDef(tile.kind || "floor", {
        ...tile,
        routeBreadcrumb: style.label,
        routeCue: routeGuide.firstHint
      }));
      placed += 1;
      if (depth === 1 && placed >= 5) {
        break;
      }
    }
  }

  prepareGuidedRouteState(level, depth) {
    if (!level || level.kind !== "dungeon") {
      return;
    }
    const objectiveMarker = level.floorObjective?.marker || level.milestone?.marker || null;
    const objectiveRoute = objectiveMarker ? this.findPathRouteOnLevel(level, level.start, objectiveMarker) || [] : [];
    const stairsRoute = level.stairsDown ? this.findPathRouteOnLevel(level, level.start, level.stairsDown) || [] : [];
    const signatureReveal = this.buildSignatureReveal(level, depth, objectiveRoute);
    const routeBeats = this.buildRouteBeats(level, depth, objectiveRoute, signatureReveal);
    const objectiveRoomIndex = level.floorObjective?.roomIndex ?? null;
    const supportRoomIndex = objectiveRoute
      .map((point) => this.getRoomIndexForPoint(level, point))
      .find((roomIndex) => roomIndex !== null && roomIndex !== undefined && roomIndex !== 0 && roomIndex !== objectiveRoomIndex) ?? null;
    const routeTuning = getRouteExperimentTuning(this, depth);
    const entryRevealSteps = depth === 1
      ? Math.max(1, Math.min(14, objectiveRoute.length - 1))
      : depth <= 3
        ? Math.min(objectiveRoute.length, 8)
        : Math.min(objectiveRoute.length, 5);
    const searchRevealChunk = depth === 1 ? 12 : depth <= 3 ? 8 : 6;
    const routeGuide = this.buildRouteGuide(level, depth, objectiveRoute, routeBeats, signatureReveal);
    level.guidance = {
      objectiveRoute,
      stairsRoute,
      routeBeats,
      entryRevealSteps: Math.min(objectiveRoute.length, entryRevealSteps + (routeTuning.entryRevealBonus || 0)),
      revealedRouteSteps: Math.min(objectiveRoute.length, entryRevealSteps + (routeTuning.entryRevealBonus || 0)),
      searchRevealChunk: searchRevealChunk + (routeTuning.searchRevealBonus || 0),
      entryReconApplied: false,
      criticalPathExposed: false,
      routeConfidence: depth === 1 ? "seeded" : "partial",
      searchesUsed: 0,
      objectiveSeen: false,
      supportRoomIndex,
      routeQuality: {
        objectiveSteps: objectiveRoute.length,
        exitSteps: stairsRoute.length,
        optionalSeparation: level.floorOptional && level.floorObjective
          ? Math.max(
              Math.abs((level.floorOptional.marker?.x || 0) - (level.floorObjective.marker?.x || 0)),
              Math.abs((level.floorOptional.marker?.y || 0) - (level.floorObjective.marker?.y || 0))
            )
          : 0
      }
    };
    level.routeGuide = routeGuide;
    level.signatureReveal = signatureReveal;
    level.routeBeats = routeBeats;
    level.floorThesis = signatureReveal?.thesis
      || level.floorSpecialSummary
      || level.signatureEncounter?.summary
      || (level.floorThemeName ? `${level.floorThemeName} is active on this floor.` : "");
    this.applyRouteLandmarks(level, depth, signatureReveal, routeBeats);
    this.addRouteBreadcrumbs(level, depth, routeGuide);
  }

  applyIntroFloorRecon(level = this.currentLevel) {
    if (!level || this.currentDepth <= 0) {
      return false;
    }
    level.guidance = level.guidance || {};
    if (level.guidance.entryReconApplied) {
      return false;
    }
    level.guidance.entryReconApplied = true;
    const route = level.guidance.objectiveRoute || [];
    if (route.length > 0) {
      this.revealRouteSlice(level, route, 0, level.guidance.revealedRouteSteps || 0, this.currentDepth === 1 ? 3 : 4);
      level.guidance.criticalPathExposed = true;
      level.guidance.routeConfidence = route.length <= (level.guidance.revealedRouteSteps || 0) ? "clear" : "guided";
      this.syncRouteGuideState(level);
      const thesis = this.getFloorThesisText(level);
      const cue = this.getObjectiveRouteHint(level) || this.getCurrentRouteCueText(level);
      this.log(thesis || "You get your bearings and pick out the first corridor toward the objective.", "warning");
      if (cue && cue !== thesis) {
        this.log(cue, "warning");
      }
      return true;
    }
    return false;
  }

  revealGuidedObjectiveRoute(source = "search") {
    if (!this.currentLevel || this.currentDepth <= 0 || this.currentLevel.floorResolved) {
      return null;
    }
    const guidance = this.currentLevel.guidance;
    const route = guidance?.objectiveRoute || [];
    if (route.length === 0) {
      return null;
    }
    const previous = guidance.revealedRouteSteps || 0;
    const chunk = (guidance.searchRevealChunk || 10) + (source === "search" ? (this.getSearchRevealBonus ? this.getSearchRevealBonus() : 0) : 0);
    const next = Math.min(route.length, previous + chunk);
    if (next <= previous) {
      return {
        revealed: false,
        complete: true,
        direction: this.getDirectionToPoint(route[route.length - 1])
      };
    }
    this.revealRouteSlice(this.currentLevel, route, previous, next);
    guidance.revealedRouteSteps = next;
    guidance.criticalPathExposed = true;
    guidance.routeConfidence = next >= route.length ? "clear" : "guided";
    guidance.searchesUsed = (guidance.searchesUsed || 0) + (source === "search" ? 1 : 0);
    let revealedRoom = null;
    if (source === "search" && guidance.searchesUsed === 1 && guidance.supportRoomIndex !== null && guidance.supportRoomIndex !== undefined) {
      if (this.revealRoom(this.currentLevel, guidance.supportRoomIndex)) {
        revealedRoom = this.currentLevel.rooms?.[guidance.supportRoomIndex] || null;
      }
    }
    this.syncRouteGuideState(this.currentLevel);
    return {
      revealed: true,
      complete: next >= route.length,
      direction: this.getDirectionToPoint(route[Math.max(0, next - 1)]),
      steps: Math.max(1, route.length - next),
      revealedRoom
    };
  }

  getGuidedRoutePoints(level = this.currentLevel) {
    if (!level || this.currentDepth <= 0 || level.floorResolved) {
      return [];
    }
    const route = level.guidance?.objectiveRoute || [];
    const revealed = level.guidance?.revealedRouteSteps || 0;
    if (route.length === 0 || revealed <= 0) {
      return [];
    }
    return route
      .slice(0, revealed)
      .filter((point, index, points) => index === 0 || index === points.length - 1 || index % 2 === 0);
  }

  buildSignatureReveal(level, depth, objectiveRoute = []) {
    if (!level || depth <= 0) {
      return null;
    }
    const routePoint = objectiveRoute[Math.min(objectiveRoute.length - 1, depth === 1 ? 6 : depth <= 3 ? 8 : 10)] || objectiveRoute[0] || level.start;
    const roomEvent = level.roomEvents?.[0] || null;
    const floorSpecialId = typeof level.floorSpecial === "string" ? level.floorSpecial : level.floorSpecial?.id || "";
    const specialElite = (level.activeEliteNames || [])[0] || "";
    let reveal = {
      id: "sealed_route",
      label: "Broken Ward Seal",
      thesis: "The approach is marked by old warding and a deliberate route into danger.",
      routeCue: "Objective route passes a broken ward seal.",
      warning: "The floor was shaped to funnel intruders inward.",
      propId: "routeSeal",
      cuePropId: "routeRune",
      point: routePoint
    };
    if (depth === 1) {
      reveal = {
        id: "survivor_trace",
        label: "Survivor Trace",
        thesis: "The first halls still show the path of someone who tried to flee the keep.",
        routeCue: "The first route follows a survivor's trace toward the objective.",
        warning: "Early rooms are meant to teach the path, not bury it.",
        propId: "routeJournal",
        cuePropId: "routeTorch",
        point: routePoint
      };
    } else if (roomEvent?.id === "failed_summoning" || floorSpecialId === "restless_dead") {
      reveal = {
        id: "ritual_glow",
        label: "Ritual Glow",
        thesis: "Restless energy is pooling ahead. Corpses and summons are part of this floor's pressure.",
        routeCue: "Ritual pressure stains the route ahead.",
        warning: "Fresh bodies may not stay down.",
        propId: "routeRitual",
        cuePropId: "routeLamp",
        point: routePoint
      };
    } else if (roomEvent?.id === "barricaded_hold" || floorSpecialId === "barricaded_rooms" || floorSpecialId === "warband") {
      reveal = {
        id: "barricade_breach",
        label: "Barricade Breach",
        thesis: "The floor is organized around holds and choke points rather than loose skirmishes.",
        routeCue: "Barricades mark the approach to the objective wing.",
        warning: "Expect tighter, denser holds.",
        propId: "routeBarricade",
        cuePropId: "routeTorch",
        point: routePoint
      };
    } else if (roomEvent?.id === "wounded_survivor") {
      reveal = {
        id: "survivor_trace",
        label: "Survivor Trace",
        thesis: "Someone made it this far and left warnings in the dark.",
        routeCue: "A survivor's trail points toward the first real decision.",
        warning: "The route carries signs of a hurried retreat.",
        propId: "routeJournal",
        cuePropId: "routeTorch",
        point: routePoint
      };
    } else if (floorSpecialId === "hunting_party" || specialElite) {
      reveal = {
        id: "patrol_sighting",
        label: "Patrol Sign",
        thesis: "A formed hunting party is active on this floor and moving before you do.",
        routeCue: "Tracks and torchlight suggest a patrol ahead.",
        warning: "Something active is moving ahead of you.",
        propId: "routeTracks",
        cuePropId: "routeBeacon",
        point: routePoint
      };
    }
    return reveal;
  }

  buildRouteBeats(level, depth, objectiveRoute = [], signatureReveal = null) {
    if (!Array.isArray(objectiveRoute) || objectiveRoute.length === 0) {
      return [];
    }
    const getPointAt = (index) => objectiveRoute[clamp(index, 0, objectiveRoute.length - 1)];
    const stairsPoint = getPointAt(depth === 1 ? 3 : 2);
    const thesisPoint = signatureReveal?.point || getPointAt(depth === 1 ? 6 : 8);
    const approachPoint = getPointAt(Math.max(0, objectiveRoute.length - (depth <= 2 ? 5 : 7)));
    return [
      {
        id: "stairs",
        label: "Stairs Beat",
        x: stairsPoint.x,
        y: stairsPoint.y,
        text: depth === 1
          ? "The first corridor is legible. Follow the marked route before you widen the map."
          : "The floor gives you a direction quickly. Use it before pressure sets the pace.",
        cue: "The first route segment is safe enough to read."
      },
      {
        id: "thesis",
        label: signatureReveal?.label || "Floor Thesis",
        x: thesisPoint.x,
        y: thesisPoint.y,
        text: signatureReveal?.warning || "The floor is telling you what kind of fight it wants.",
        cue: signatureReveal?.routeCue || ""
      },
      {
        id: "approach",
        label: "Objective Approach",
        x: approachPoint.x,
        y: approachPoint.y,
        text: level.floorObjective
          ? `The objective wing is close. ${level.floorObjective.shortLabel} will decide the floor.`
          : "The main chamber is close now.",
        cue: "Objective approach is no longer far off."
      }
    ];
  }

  applyRouteLandmarks(level, depth, signatureReveal, routeBeats = []) {
    if (!level || level.kind !== "dungeon") {
      return;
    }
    const guidance = level.guidance || {};
    guidance.routeBeats = routeBeats;
    routeBeats.forEach((beat, index) => {
      const cuePropId = beat.id === "thesis"
        ? (signatureReveal?.cuePropId || "routeTorch")
        : beat.id === "approach"
          ? "routeMark"
          : "routeTorch";
      addLevelProp(level, {
        id: `route-beat-${depth}-${beat.id}`,
        x: beat.x,
        y: beat.y,
        propId: cuePropId,
        layer: "fixture",
        light: ["routeTorch", "routeLamp", "routeBeacon", "routeWater", "routeRitual"].includes(cuePropId)
      });
      const existingTile = getTile(level, beat.x, beat.y);
      if (existingTile?.walkable) {
        setTile(level, beat.x, beat.y, tileDef(existingTile.kind || "floor", {
          ...existingTile,
          routeBeatId: beat.id,
          label: beat.label,
          routeCue: beat.cue || beat.text
        }));
      }
      if (index === 1 && signatureReveal) {
        addLevelProp(level, {
          id: `signature-reveal-${depth}`,
          x: beat.x,
          y: beat.y,
          propId: signatureReveal.propId,
          layer: "fixture",
          light: ["routeTorch", "routeLamp", "routeBeacon", "routeWater", "routeRitual"].includes(signatureReveal.propId)
        });
      }
    });
  }

  getCurrentRouteBeat(level = this.currentLevel) {
    const beats = level?.guidance?.routeBeats || level?.routeBeats || [];
    if (!beats.length || this.currentDepth <= 0 || level?.floorResolved) {
      return null;
    }
    const pending = beats.find((beat) => !beat.shown);
    return pending || beats[beats.length - 1] || null;
  }

  getFloorThesisText(level = this.currentLevel) {
    if (!level || this.currentDepth <= 0) {
      return "";
    }
    return level.floorThesis || level.floorSpecialSummary || level.signatureEncounter?.summary || "";
  }

  getRouteProgressIndex(level = this.currentLevel) {
    const route = level?.routeGuide?.spineTiles || level?.guidance?.objectiveRoute || [];
    if (!route.length || !this.player) {
      return -1;
    }
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    route.forEach((point, index) => {
      const tileDistance = Math.max(Math.abs(point.x - this.player.x), Math.abs(point.y - this.player.y));
      if (tileDistance < bestDistance || (tileDistance === bestDistance && index > bestIndex)) {
        bestDistance = tileDistance;
        bestIndex = index;
      }
    });
    return bestDistance <= 2 ? bestIndex : -1;
  }

  getObjectiveRoomHint(level = this.currentLevel) {
    const objective = level?.floorObjective;
    if (!objective || level?.floorResolved) {
      return "";
    }
    const blockers = getObjectiveDefendersRemaining(level);
    switch (objective.id) {
      case "purge_nest":
        return blockers > 0
          ? `Clear ${blockers} defender${blockers === 1 ? "" : "s"}, then burn the nest.`
          : "Room clear. Step onto the nest and burn it out.";
      case "rescue_captive":
        return blockers > 0
          ? `Reach the cell, then clear ${blockers} guard${blockers === 1 ? "" : "s"} before freeing the captive.`
          : "Room clear. Step onto the cell, then free the captive.";
      case "seal_shrine":
        return "Seal the shrine; pressure will jump the moment you commit.";
      case "recover_relic":
        return "Reach the pedestal and claim the relic to unlock the exit.";
      case "recover_waystone":
        return "Reach the waystone and claim it to sharpen the next route.";
      case "break_beacon":
        return blockers > 0
          ? `Break the beacon after the last ${blockers} defender${blockers === 1 ? "" : "s"} drop.`
          : "Room clear. Smash the beacon now.";
      case "purify_well":
        return blockers > 0
          ? `Clear ${blockers} defender${blockers === 1 ? "" : "s"}, then purify the well for a full refill.`
          : "Room clear. Purify the well now for a clean refill.";
      default:
        return "Reach the marker and resolve the floor objective.";
    }
  }

  syncRouteGuideState(level = this.currentLevel) {
    if (!level || this.currentDepth <= 0) {
      return null;
    }
    if (!level.routeGuide) {
      level.routeGuide = this.buildRouteGuide(
        level,
        this.currentDepth,
        level.guidance?.objectiveRoute || [],
        level.guidance?.routeBeats || level.routeBeats || [],
        level.signatureReveal || null
      );
    }
    const routeGuide = level.routeGuide;
    const progressIndex = this.getRouteProgressIndex(level);
    routeGuide.milestones = (routeGuide.milestones || []).map((milestone) => ({
      ...milestone,
      reached: milestone.reached || (progressIndex >= 0 && milestone.routeIndex >= 0 && progressIndex >= milestone.routeIndex)
    }));
    const pressure = this.getPressureUiState();
    if (level.floorResolved) {
      const baseHint = pressure.shortLabel === "Leave now" || (this.reinforcementClock || 0) <= 3
        ? "Leave now. Stairs up are live."
        : "Stairs up are live. Optional greed will raise pressure.";
      routeGuide.currentHint = level.floorOptional && !level.floorOptional.opened
        ? `${baseHint} ${level.floorOptional.label} remains if you stay greedy.`
        : baseHint;
      return routeGuide;
    }
    const objectiveRoomSeen = typeof level.floorObjective?.roomIndex === "number"
      && (this.getPlayerRoomIndex() === level.floorObjective.roomIndex
        || progressIndex >= Math.max(0, (routeGuide.spineTiles?.length || 1) - 5));
    if (objectiveRoomSeen) {
      routeGuide.currentHint = this.getObjectiveRoomHint(level);
      return routeGuide;
    }
    const nextMilestone = (routeGuide.milestones || []).find((milestone) => !milestone.reached);
    routeGuide.currentHint = nextMilestone?.hint
      || routeGuide.firstHint
      || `Objective route: ${routeGuide.objectiveWingLabel}.`;
    return routeGuide;
  }

  getObjectiveRouteHint(level = this.currentLevel) {
    if (!level || this.currentDepth <= 0) {
      return "";
    }
    return this.syncRouteGuideState(level)?.currentHint || "";
  }

  getBaseRouteCueText(level = this.currentLevel) {
    if (!level || this.currentDepth <= 0) {
      return "";
    }
    const routeHint = this.getObjectiveRouteHint(level);
    if (routeHint) {
      return routeHint;
    }
    const beat = this.getCurrentRouteBeat(level);
    if (beat?.cue) {
      return beat.cue;
    }
    return level.signatureReveal?.routeCue || "";
  }

  getBaseDangerNote(level = this.currentLevel) {
    if (!level || this.currentDepth <= 0) {
      return "";
    }
    if (level.floorResolved) {
      const stairsDirection = level.stairsUp ? this.getDirectionToPoint(level.stairsUp) : "back";
      const turns = Math.max(0, this.reinforcementClock || level.reinforcementClock || 0);
      if (level.floorOptional && !level.floorOptional.opened && level.floorOptional.marker) {
        return `${level.floorOptional.label} ${this.getDirectionToPoint(level.floorOptional.marker)} if you stay greedy. Stairs up ${stairsDirection} bank the floor.`;
      }
      return turns > 0
        ? `Stairs up ${stairsDirection} bank the floor. Another wave lands in about ${turns} turns.`
        : `Stairs up ${stairsDirection} bank the floor before the next wave closes in.`;
    }
    const specialist = (level.actors || []).find((monster) => monster.elite || monster.behaviorKit);
    if (specialist?.behaviorKit) {
      const behavior = ENEMY_BEHAVIOR_KITS[specialist.behaviorKit];
      return behavior ? `${behavior.label}: ${behavior.tell}` : `${specialist.name} is shaping the floor ahead.`;
    }
    if (specialist?.elite) {
      return `${specialist.name} is the first major threat on this floor.`;
    }
    if ((this.reinforcementClock || level.reinforcementClock || 0) <= 4) {
      return `Reinforcements lean ${this.getReinforcementProfileLabel(level.reinforcementProfile)}.`;
    }
    return level.signatureReveal?.warning || level.floorSpecialSummary || "";
  }

  getObjectiveInteractionPromptData(objective = this.currentLevel?.floorObjective, blockers = null) {
    if (!objective) {
      return null;
    }
    const remaining = blockers === null ? getObjectiveDefendersRemaining(this.currentLevel) : blockers;
    const blockerText = `${remaining} defender${remaining === 1 ? "" : "s"} remain.`;
    switch (objective.id) {
      case "recover_relic":
        return {
          label: "Take Relic",
          tone: "good",
          roomDetail: "The relic is in this room. Pick it up.",
          readyDetail: "Pick up the relic.",
          recommendedActionId: "pickup"
        };
      case "secure_supplies":
        return {
          label: "Take Cache",
          tone: "good",
          roomDetail: "The cache is in this room. Pick it up.",
          readyDetail: "Pick up the cache.",
          recommendedActionId: "pickup"
        };
      case "recover_waystone":
        return {
          label: "Take Waystone",
          tone: "good",
          roomDetail: "The waystone is in this room. Pick it up.",
          readyDetail: "Pick up the waystone.",
          recommendedActionId: "pickup"
        };
      case "rescue_captive":
        return {
          label: "Free Captive",
          tone: remaining > 0 ? "warning" : "good",
          blockedDetail: `${blockerText} Clear the room, then step onto the cell.`,
          roomDetail: remaining > 0 ? `${blockerText} Clear the room, then step onto the cell.` : "The cell is clear. Step onto it.",
          readyDetail: "Step onto the cell.",
          recommendedActionId: remaining > 0 ? "wait" : "move"
        };
      case "purge_nest":
        return {
          label: "Burn Nest",
          tone: remaining > 0 ? "warning" : "good",
          blockedDetail: `${blockerText} Clear the room, then press U on the nest.`,
          roomDetail: remaining > 0 ? `${blockerText} Clear the room, then press U on the nest.` : "The nest is exposed. Press U on it.",
          readyDetail: "Press U on the nest.",
          recommendedActionId: remaining > 0 ? "wait" : "interact"
        };
      case "seal_shrine":
        return {
          label: "Seal Shrine",
          tone: "warning",
          blockedDetail: `${blockerText} Clear the room, then press U on the shrine.`,
          roomDetail: remaining > 0 ? `${blockerText} Clear the room, then press U on the shrine.` : "The shrine is ready. Press U on it; this raises pressure.",
          readyDetail: "Press U on the shrine; this raises pressure.",
          recommendedActionId: remaining > 0 ? "wait" : "interact"
        };
      case "purify_well":
        return {
          label: "Purify Well",
          tone: remaining > 0 ? "warning" : "good",
          blockedDetail: `${blockerText} Clear the room, then press U on the well.`,
          roomDetail: remaining > 0 ? `${blockerText} Clear the room, then press U on the well.` : "The well is clear. Press U on it for a full refill and a pressure spike.",
          readyDetail: "Press U on the well for a full refill and a pressure spike.",
          recommendedActionId: remaining > 0 ? "wait" : "interact"
        };
      case "break_beacon":
        return {
          label: "Break Beacon",
          tone: remaining > 0 ? "warning" : "good",
          blockedDetail: `${blockerText} Clear the room, then press U on the beacon.`,
          roomDetail: remaining > 0 ? `${blockerText} Clear the room, then press U on the beacon.` : "The beacon is exposed. Press U on it.",
          readyDetail: "Press U on the beacon.",
          recommendedActionId: remaining > 0 ? "wait" : "interact"
        };
      default:
        return {
          label: "Resolve Objective",
          tone: remaining > 0 ? "warning" : "good",
          blockedDetail: `${blockerText} Clear the room first.`,
          roomDetail: remaining > 0 ? `${blockerText} Clear the room first.` : "The room is clear. Resolve the objective now.",
          readyDetail: "Resolve the objective now.",
          recommendedActionId: remaining > 0 ? "wait" : "interact"
        };
    }
  }

  getLoopDirective(tile = this.player && this.currentLevel ? getTile(this.currentLevel, this.player.x, this.player.y) : null, level = this.currentLevel) {
    const onboardingMeta = getOnboardingVariantMeta(this);
    if (!this.player || !level) {
      return {
        phase: "town_prep",
        primaryText: "Create a character to begin.",
        supportText: "",
        recommendedActionId: "new-game",
        routeCueText: "",
        dangerText: ""
      };
    }

    if (this.currentDepth === 0) {
      if (this.isFirstTownRun() && !this.storyFlags.townServiceVisited) {
        return {
          phase: "town_prep",
          primaryText: onboardingMeta.firstTownPrimary,
          supportText: onboardingMeta.firstTownSupport,
          recommendedActionId: "town_service",
          routeCueText: "",
          dangerText: ""
        };
      }
      if (this.isFirstTownRun()) {
        return {
          phase: "enter_keep",
          primaryText: onboardingMeta.enterKeepPrimary,
          supportText: onboardingMeta.enterKeepSupport,
          recommendedActionId: "stairs_down",
          routeCueText: "",
          dangerText: ""
        };
      }
      const townMeta = this.getTownMetaSummary();
      return {
        phase: "town_prep",
        primaryText: townMeta.recommendedAction,
        supportText: townMeta.summary,
        recommendedActionId: "bank",
        routeCueText: "",
        dangerText: ""
      };
    }

    const routeCueText = this.getBaseRouteCueText(level);
    const dangerText = this.getBaseDangerNote(level);
    const objective = level.floorObjective;
    if (level.floorResolved) {
      const stairsDirection = level.stairsUp ? this.getDirectionToPoint(level.stairsUp) : "back";
      const turns = Math.max(0, this.reinforcementClock || level.reinforcementClock || 0);
      const optionalText = level.floorOptional && !level.floorOptional.opened && level.floorOptional.marker
        ? `${level.floorOptional.label} ${this.getDirectionToPoint(level.floorOptional.marker)} if you stay greedy.`
        : "";
      return {
        phase: "extract_or_greed",
        primaryText: `Stairs up ${stairsDirection} bank the floor now.`,
        supportText: [optionalText, turns > 0 ? `Another wave lands in about ${turns} turn${turns === 1 ? "" : "s"}.` : "Staying longer will keep raising pressure."].filter(Boolean).join(" "),
        recommendedActionId: "stairs-up",
        routeCueText: "",
        dangerText
      };
    }

    if (!objective || !objective.marker) {
      return {
        phase: "reach_objective",
        primaryText: routeCueText || "Push deeper into the floor.",
        supportText: dangerText,
        recommendedActionId: "search",
        routeCueText,
        dangerText
      };
    }

    const blockers = getObjectiveDefendersRemaining(level);
    const inObjectiveRoom = this.getPlayerRoomIndex() === objective.roomIndex;
    const onObjectiveMarker = tile?.objectiveId === objective.id;
    const interaction = this.getObjectiveInteractionPromptData(objective, blockers);
    const unrevealedRoute = Math.max(0, (level.guidance?.objectiveRoute?.length || 0) - (level.guidance?.revealedRouteSteps || 0));
    const searchHint = this.currentDepth === 1 && !level.guidance?.objectiveSeen && unrevealedRoute > 0
      ? onboardingMeta.objectiveSearchHint
      : "";

    if (onObjectiveMarker) {
      if (blockers > 0 && interaction?.blockedDetail) {
        return {
          phase: "clear_room",
          primaryText: interaction.blockedDetail,
          supportText: "Search is no longer the answer here. Finish the room.",
          recommendedActionId: "wait",
          routeCueText,
          dangerText
        };
      }
      return {
        phase: "interact_objective",
        primaryText: interaction?.readyDetail || "Resolve the objective now.",
        supportText: dangerText,
        recommendedActionId: interaction?.recommendedActionId || "interact",
        routeCueText,
        dangerText
      };
    }

    if (inObjectiveRoom) {
      if (blockers > 0) {
        return {
          phase: "clear_room",
          primaryText: interaction?.roomDetail || `Clear the room for ${objective.label.toLowerCase()}.`,
          supportText: "Finish the defenders, then take the objective action.",
          recommendedActionId: "wait",
          routeCueText,
          dangerText
        };
      }
      return {
        phase: "interact_objective",
        primaryText: interaction?.roomDetail || interaction?.readyDetail || "The room is clear. Resolve the objective now.",
        supportText: dangerText,
        recommendedActionId: interaction?.recommendedActionId || "interact",
        routeCueText,
        dangerText
      };
    }

    const direction = this.getDirectionToPoint(objective.marker);
    return {
      phase: "reach_objective",
      primaryText: routeCueText || `${objective.shortLabel} ${direction}`,
      supportText: [searchHint, dangerText].filter(Boolean).join(" "),
      recommendedActionId: searchHint ? "search" : "move",
      routeCueText: routeCueText || `${objective.shortLabel} ${direction}`,
      dangerText
    };
  }

  getCurrentRouteCueText(level = this.currentLevel) {
    return this.getLoopDirective(null, level).routeCueText || "";
  }

  getImmediateDangerNote(level = this.currentLevel) {
    const directive = this.getLoopDirective(null, level);
    return directive.supportText || directive.dangerText || "";
  }

  getLoopDirectiveLabel(phase = this.getLoopDirective().phase) {
    const labels = {
      town_prep: "Town",
      enter_keep: "Keep",
      reach_objective: "Route",
      clear_room: "Room",
      interact_objective: "Objective",
      extract_or_greed: "Exit"
    };
    return labels[phase] || "Loop";
  }

  maybeTriggerRouteBeat(level = this.currentLevel) {
    if (!level || this.currentDepth <= 0 || level.floorResolved) {
      return false;
    }
    const beat = this.getCurrentRouteBeat(level);
    if (!beat || beat.shown) {
      return false;
    }
    if (Math.max(Math.abs(this.player.x - beat.x), Math.abs(this.player.y - beat.y)) > 1) {
      return false;
    }
    beat.shown = true;
    this.syncRouteGuideState(level);
    this.log(beat.text, "warning");
    if (beat.cue && beat.cue !== beat.text) {
      this.log(beat.cue, "warning");
    }
    return true;
  }

  setTownReturnStingFromLevel(level, options = {}) {
    if (!this.player?.quest || !level || level.kind !== "dungeon") {
      return;
    }
    const parts = [];
    if (level.floorObjective?.label) {
      parts.push(level.floorResolved ? `${level.floorObjective.label.toLowerCase()} cleared` : level.floorObjective.label.toLowerCase());
    }
    if (level.signatureReveal?.label) {
      parts.push(level.signatureReveal.label);
    }
    if (level.roomEvents?.[0]?.status === "cleared") {
      parts.push(`resolved ${level.roomEvents[0].label.toLowerCase()}`);
    }
    if ((level.activeEliteNames || []).length > 0) {
      parts.push(`faced ${level.activeEliteNames[0]}`);
    }
    const rumorTokens = this.player.runCurrencies?.rumorTokens || 0;
    const goldSummary = `${Math.floor(this.player.gold)} gp on hand`;
    if (rumorTokens > 0) {
      parts.push(`${rumorTokens} rumor token${rumorTokens === 1 ? "" : "s"}`);
    }
    parts.push(goldSummary);
    const focus = parts.length > 0 ? parts.join(", ") : (level.floorThesis || level.floorSpecialSummary || level.description);
    this.player.quest.returnSting = {
      depth: options.depth || this.currentDepth,
      area: level.description,
      text: `Town return: ${focus}.`
    };
  }

  getTownReturnStingText() {
    return this.player?.quest?.returnSting?.text || "";
  }

  pointNearRoute(point, route = [], maxDistance = 3) {
    if (!point || !Array.isArray(route) || route.length === 0) {
      return false;
    }
    return route.some((entry) => Math.max(Math.abs((entry.x || 0) - point.x), Math.abs((entry.y || 0) - point.y)) <= maxDistance);
  }

  validateDungeonLevel(level, depth) {
    if (!level?.rooms?.length) {
      return false;
    }
    const primaryGoal = level.floorObjective?.marker || level.milestone?.marker;
    if (!primaryGoal) {
      return false;
    }
    const objectivePath = this.findPathRouteOnLevel(level, level.start, primaryGoal);
    if (!objectivePath) {
      return false;
    }
    if (depth === 1 && objectivePath.length > this.getDepthOneMaxObjectiveSteps()) {
      return false;
    }
    const exitPath = this.findPathRouteOnLevel(level, level.start, level.stairsDown);
    if (depth === 1 && (!exitPath || exitPath.length > this.getDepthOneMaxExitSteps())) {
      return false;
    }
    if (depth === 1) {
      const routeGuide = level.routeGuide || level.guidance;
      const firstMilestone = routeGuide?.milestones?.[0] || level.routeBeats?.[0] || null;
      if (!routeGuide?.spineTiles?.length || !firstMilestone) {
        return false;
      }
      const milestoneDistance = Math.max(Math.abs(firstMilestone.x - level.start.x), Math.abs(firstMilestone.y - level.start.y));
      if (milestoneDistance > 8) {
        return false;
      }
      if (level.floorOptional?.marker && this.pointNearRoute(level.floorOptional.marker, objectivePath.slice(0, Math.min(objectivePath.length, 16)), 3)) {
        return false;
      }
    }
    if (level.floorOptional?.marker && !this.findPathOnLevel(level, level.start, level.floorOptional.marker)) {
      return false;
    }
    if (depth === 1 && level.floorObjective && level.floorOptional) {
      const objectiveRoom = level.rooms?.[level.floorObjective.roomIndex] || null;
      const optionalRoom = level.rooms?.[level.floorOptional.roomIndex] || null;
      if (this.roomsOverlapOrTouch(objectiveRoom, optionalRoom)) {
        return false;
      }
    }
    const objectiveTile = getTile(level, primaryGoal.x, primaryGoal.y);
    if (!objectiveTile || !objectiveTile.walkable) {
      return false;
    }
    const exitTile = getTile(level, level.stairsDown.x, level.stairsDown.y);
    if (!exitTile || (depth === DUNGEON_DEPTH ? exitTile.kind !== "altar" : exitTile.kind !== "stairDown")) {
      return false;
    }
    return true;
  }

  generateDungeonLevel(depth) {
    const width = 64;
    const height = 64;
    const level = blankLevel(width, height, "dungeon");
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        setTile(level, x, y, tileDef("wall"));
      }
    }

    const rooms = [];
    const roomCount = 12 + depth * 2;
    for (let i = 0; i < roomCount; i += 1) {
      const room = {
        x: randInt(2, width - 12),
        y: randInt(2, height - 12),
        w: randInt(5, 11),
        h: randInt(5, 11)
      };
      if (rooms.some((other) => intersects(room, other, 1))) {
        continue;
      }
      carveRoom(level, room);
      if (rooms.length > 0) {
        carveTunnel(level, centerOf(rooms[rooms.length - 1]), centerOf(room));
      }
      rooms.push(room);
    }

    if (rooms.length < 3) {
      return this.generateDungeonLevel(depth);
    }

    this.ensureEntryRoutes(level, rooms);
    level.rooms = rooms;
    level.start = centerOf(rooms[0]);
    level.stairsUp = centerOf(rooms[0]);
    level.stairsDown = centerOf(rooms[rooms.length - 1]);
    level.exitRoomIndex = rooms.length - 1;
    level.reservedRoomIndexes = Array.isArray(level.reservedRoomIndexes) ? level.reservedRoomIndexes : [];
    if (!level.reservedRoomIndexes.includes(level.exitRoomIndex)) {
      level.reservedRoomIndexes.push(level.exitRoomIndex);
    }
    setTile(level, level.stairsUp.x, level.stairsUp.y, tileDef("stairUp"));
    setTile(level, level.stairsDown.x, level.stairsDown.y, tileDef(depth === DUNGEON_DEPTH ? "altar" : "stairDown"));
    const theme = getDepthTheme(depth);
    level.description = `${theme.name} - depth ${depth}`;
    initializeDangerState(level, depth);
    this.placeDungeonContent(level, depth);
    setTile(level, level.stairsUp.x, level.stairsUp.y, tileDef("stairUp"));
    setTile(level, level.stairsDown.x, level.stairsDown.y, tileDef(depth === DUNGEON_DEPTH ? "altar" : "stairDown"));
    if (!this.validateDungeonLevel(level, depth)) {
      return this.generateDungeonLevel(depth);
    }
    return level;
  }

  ensureMonsterSpawn(level, rooms, monsterId) {
    const template = MONSTER_DEFS.find((monster) => monster.id === monsterId);
    if (!template) {
      return false;
    }
    const candidates = rooms && rooms.length > 0 ? rooms : level.rooms.slice(1);
    for (const room of candidates) {
      for (let attempt = 0; attempt < 16; attempt += 1) {
        const position = randomRoomTile(room);
        if (isOccupied(level, position.x, position.y)) {
          continue;
        }
        level.actors.push(createMonster(template, position.x, position.y));
        return true;
      }
    }
    return false;
  }

  getMilestoneDefinitionForDepth(depth) {
    return Object.values(MILESTONE_DEFS).find((entry) => entry.depth === depth) || null;
  }

  getDiscoveryDef(discoveryId) {
    return discoveryId ? DISCOVERY_DEFS[discoveryId] || null : null;
  }

  getStoryNpc(npcId) {
    return npcId ? STORY_NPCS[npcId] || null : null;
  }

  getStoryBeat(beatId) {
    return beatId ? STORY_BEATS[beatId] || null : null;
  }

  getRoomEventDefinition(eventId) {
    return eventId ? ROOM_EVENT_DEFS[eventId] || null : null;
  }

  getTownReactionDefinition(reactionId) {
    return reactionId ? TOWN_REACTION_DEFS[reactionId] || null : null;
  }

  ensureQuestReactionState() {
    if (!this.player?.quest) {
      return;
    }
    this.player.quest.townReactionFlags = this.player.quest.townReactionFlags || {};
    this.player.quest.namedLootHistory = this.player.quest.namedLootHistory || [];
  }

  hasTownReactionSeen(reactionId) {
    this.ensureQuestReactionState();
    return Boolean(reactionId && this.player?.quest?.townReactionFlags?.[reactionId]);
  }

  markTownReactionSeen(reactionId) {
    if (!reactionId || !this.player) {
      return;
    }
    this.ensureQuestReactionState();
    this.player.quest.townReactionFlags[reactionId] = true;
  }

  recordNamedLoot(item) {
    if (!item?.affixId || !this.player) {
      return;
    }
    this.ensureQuestReactionState();
    const label = `${item.affixId}:${item.id}`;
    if (!this.player.quest.namedLootHistory.includes(label)) {
      this.player.quest.namedLootHistory.push(label);
    }
  }

  chooseRoomEventDefinition(depth, themeId = "") {
    if (depth <= 1 || depth >= DUNGEON_DEPTH) {
      return null;
    }
    if (themeId === "vermin_halls") {
      return depth === 2
        ? choice([ROOM_EVENT_DEFS.wounded_survivor, ROOM_EVENT_DEFS.route_cache])
        : choice([ROOM_EVENT_DEFS.wounded_survivor, ROOM_EVENT_DEFS.route_cache, ROOM_EVENT_DEFS.sealed_reliquary]);
    }
    if (themeId === "barracks") {
      return depth <= 3
        ? choice([ROOM_EVENT_DEFS.barricaded_hold, ROOM_EVENT_DEFS.route_cache])
        : choice([ROOM_EVENT_DEFS.barricaded_hold, ROOM_EVENT_DEFS.route_cache, ROOM_EVENT_DEFS.sealed_reliquary]);
    }
    if (themeId === "crypts") {
      return depth >= 6
        ? choice([ROOM_EVENT_DEFS.failed_summoning, ROOM_EVENT_DEFS.watchers_archive])
        : choice([ROOM_EVENT_DEFS.cursed_library, ROOM_EVENT_DEFS.failed_summoning, ROOM_EVENT_DEFS.watchers_archive]);
    }
    return choice(Object.values(ROOM_EVENT_DEFS));
  }

  getRoomEventBlockers(event) {
    if (!event || !this.currentLevel) {
      return 0;
    }
    return this.currentLevel.actors.filter((monster) => monster.roomIndex === event.roomIndex && monster.hp > 0).length;
  }

  getCurrentRoomEvent() {
    if (!this.currentLevel?.roomEvents?.length) {
      return null;
    }
    return this.currentLevel.roomEvents.find((event) =>
      event.marker &&
      event.marker.x === this.player.x &&
      event.marker.y === this.player.y
    ) || null;
  }

  placeRoomEvent(level, depth, rooms) {
    const eventDef = this.chooseRoomEventDefinition(depth, level.floorTheme);
    if (!eventDef || !rooms || rooms.length === 0) {
      level.roomEvents = [];
      level.signatureEncounter = null;
      return null;
    }
    const blockedRoomIndexes = new Set([
      level.floorObjective?.roomIndex,
      level.floorOptional?.roomIndex,
      level.milestone?.roomIndex
    ].filter((value) => value !== undefined && value !== null));
    const candidates = rooms.filter((room) => !blockedRoomIndexes.has(level.rooms.indexOf(room)));
    const room = choice(candidates.length > 0 ? candidates : rooms);
    const roomIndex = level.rooms.indexOf(room);
    if (!room || roomIndex < 0) {
      level.roomEvents = [];
      level.signatureEncounter = null;
      return null;
    }
    const marker = centerOf(room);
    const eventTileKind = eventDef.eventType === "ritual" || eventDef.eventType === "library"
      ? "altar"
      : eventDef.eventType === "rescue"
        ? "fountain"
        : "throne";
    setTile(level, marker.x, marker.y, tileDef(eventTileKind, {
      label: eventDef.label,
      roomEventId: eventDef.id,
      roomEventAction: eventDef.eventType
    }));
    addLevelProp(level, {
      id: `room-event-${eventDef.id}-${depth}`,
      x: marker.x,
      y: marker.y,
      propId: eventDef.propId,
      layer: "fixture",
      light: ["relicPedestal", "shrineSeal", "bloodAltar", "ghostMerchant", "well", "beaconFocus"].includes(eventDef.propId)
    });
    [
      { x: room.x + 1, y: room.y + 1 },
      { x: room.x + room.w - 2, y: room.y + 1 }
    ].forEach((point, index) => {
      addLevelProp(level, {
        id: `room-event-torch-${eventDef.id}-${depth}-${index}`,
        x: point.x,
        y: point.y,
        propId: depth >= 5 ? "shrineTorch" : "roomTorch",
        layer: "fixture",
        light: true
      });
    });
    const eventState = {
      ...eventDef,
      roomIndex,
      marker,
      status: "active",
      rewardClaimed: false
    };
    level.roomEvents = [eventState];
    level.signatureEncounter = {
      id: eventState.id,
      label: eventState.label,
      summary: eventState.summary,
      roomIndex
    };

    if (eventDef.id === "barricaded_hold") {
      this.ensureMonsterSpawn(level, [room], depth >= 4 ? "orc" : "goblin");
      this.ensureMonsterSpawn(level, [room], depth >= 4 ? "archer" : "slinger");
      level.actors.forEach((monster) => {
        if (monster.roomIndex === roomIndex || (monster.x >= room.x && monster.x < room.x + room.w && monster.y >= room.y && monster.y < room.y + room.h)) {
          monster.roomIndex = roomIndex;
          monster.alerted = Math.max(monster.alerted || 0, 5);
          monster.sleeping = false;
        }
      });
    } else if (eventDef.id === "failed_summoning") {
      this.ensureMonsterSpawn(level, [room], depth >= 5 ? "warlock" : "shaman");
      level.actors.forEach((monster) => {
        if (monster.x >= room.x && monster.x < room.x + room.w && monster.y >= room.y && monster.y < room.y + room.h) {
          monster.roomIndex = roomIndex;
        }
      });
    } else if (eventDef.id === "cursed_library") {
      this.ensureMonsterSpawn(level, [room], depth >= 5 ? "wraith" : "skeleton");
    }
    return eventState;
  }

  hasSeenBriefing(briefingId) {
    return Boolean(this.player?.quest?.briefingsSeen?.includes(briefingId));
  }

  markBriefingSeen(briefingId) {
    if (!briefingId || !this.player) {
      return;
    }
    if (!this.player.quest.briefingsSeen.includes(briefingId)) {
      this.player.quest.briefingsSeen.push(briefingId);
    }
  }

  hasSeenNpcScene(sceneId) {
    return Boolean(sceneId && this.player?.quest?.npcSceneFlags?.[sceneId]);
  }

  markNpcSceneSeen(sceneId) {
    if (!sceneId || !this.player) {
      return;
    }
    this.player.quest.npcSceneFlags[sceneId] = true;
  }

  hasStoryBeatFlag(flagId) {
    return Boolean(flagId && this.player?.quest?.storyBeatFlags?.[flagId]);
  }

  markStoryBeatFlag(flagId) {
    if (!flagId || !this.player) {
      return;
    }
    this.player.quest.storyBeatFlags[flagId] = true;
  }

  getDiscoveryAt(x, y, level = this.currentLevel) {
    if (!level?.discoveries) {
      return null;
    }
    return level.discoveries.find((entry) => entry.x === x && entry.y === y) || null;
  }

  addLevelDiscovery(level, discoveryId, x, y, extra = {}) {
    const definition = this.getDiscoveryDef(discoveryId);
    if (!level || !definition) {
      return null;
    }
    level.discoveries = Array.isArray(level.discoveries) ? level.discoveries : [];
    const discovery = {
      id: discoveryId,
      title: definition.title,
      label: definition.label,
      text: definition.text,
      summary: definition.summary,
      propId: definition.propId || "loreBook",
      x,
      y,
      read: false,
      ...extra
    };
    level.discoveries.push(discovery);
    const tile = getTile(level, x, y);
    setTile(level, x, y, tileDef(tile?.kind || "floor", {
      ...(tile || {}),
      discoveryId,
      label: definition.label
    }));
    addLevelProp(level, {
      id: `discovery-${discoveryId}-${x}-${y}`,
      x,
      y,
      propId: discovery.propId,
      layer: "fixture",
      alwaysVisible: false,
      light: definition.kind === "oath" || definition.kind === "inscription"
    });
    return discovery;
  }

  findDiscoverySpot(level, room, anchor = null) {
    if (!level || !room) {
      return null;
    }
    const candidatePoints = anchor
      ? [
          { x: anchor.x + 1, y: anchor.y },
          { x: anchor.x - 1, y: anchor.y },
          { x: anchor.x, y: anchor.y + 1 },
          { x: anchor.x, y: anchor.y - 1 }
        ]
      : [];
    for (const point of candidatePoints) {
      const tile = getTile(level, point.x, point.y);
      if (tile?.walkable && !actorAt(level, point.x, point.y) && itemsAt(level, point.x, point.y).length === 0) {
        return point;
      }
    }
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const point = randomRoomTile(room);
      const tile = getTile(level, point.x, point.y);
      if (tile?.walkable && !tile.objectiveId && !tile.optionalId && !actorAt(level, point.x, point.y) && itemsAt(level, point.x, point.y).length === 0) {
        return point;
      }
    }
    return null;
  }

  placeAmbientDiscoveries(level, depth, rooms) {
    const discoveryPool = depth <= 2
      ? ["barracks_roll", "shrine_inscription"]
      : depth <= 4
        ? ["shrine_inscription", "memorial_slate"]
        : ["weather_log", "memorial_slate"];
    if (!rooms || rooms.length === 0) {
      return;
    }
    const ambientId = choice(discoveryPool);
    let room = choice(rooms);
    if (depth === 1 && level.floorObjective?.marker) {
      const route = this.findPathRouteOnLevel(level, level.start, level.floorObjective.marker) || [];
      const supportPoint = route[Math.min(route.length - 1, 10)] || null;
      const supportRoomIndex = this.getRoomIndexForPoint(level, supportPoint);
      if (supportRoomIndex !== null && supportRoomIndex !== undefined && level.rooms?.[supportRoomIndex]) {
        room = level.rooms[supportRoomIndex];
      }
    }
    const point = this.findDiscoverySpot(level, room);
    if (ambientId && point) {
      this.addLevelDiscovery(level, ambientId, point.x, point.y, { roomIndex: level.rooms.indexOf(room), ambient: true });
    }
  }

  renderStorySceneMarkup(scene) {
    return `
      <div class="section-block text-block">${escapeHtml(scene.chapterObjective || "")}</div>
      <div class="section-block">
        ${scene.scene.map((entry) => {
          const npc = this.getStoryNpc(entry.speaker);
          return `
            <div class="shop-row">
              <div>
                <div><strong>${escapeHtml(npc ? `${npc.name}, ${npc.title}` : "Voice")}</strong></div>
                <div class="muted">${escapeHtml(entry.text)}</div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
      <div class="modal-actions">
        <button class="menu-button" data-action="close-modal" data-focus-key="story:continue" type="button">Continue</button>
      </div>
    `;
  }

  showStoryScene(beatId, phase = "scene") {
    const beat = this.getStoryBeat(beatId);
    if (!beat) {
      return false;
    }
    const lines = phase === "return" ? beat.returnScene : beat.scene;
    if (!Array.isArray(lines) || lines.length === 0) {
      return false;
    }
    const sceneId = phase === "return" ? `${beatId}:return` : beatId;
    this.markBriefingSeen(sceneId);
    this.markNpcSceneSeen(sceneId);
    this.recordChronicleEvent("story_scene", {
      label: phase === "return" ? `${beat.title}: town reaction.` : `${beat.title}: briefing received.`
    });
    this.mode = "modal";
    this.showSimpleModal(beat.title, this.renderStorySceneMarkup({
      chapterObjective: beat.chapterObjective,
      scene: lines
    }), {
      surfaceKey: `story:${sceneId}`,
      focusTarget: "story:continue"
    });
    return true;
  }

  maybeShowTownStoryScene() {
    if (!this.player || this.currentDepth !== 0) {
      return false;
    }
    if (this.player.quest.milestonesCleared.includes("depth5_cryptlord") && !this.hasSeenNpcScene("depth5:return")) {
      return this.showStoryScene("depth5", "return");
    }
    if (this.player.quest.milestonesCleared.includes("depth3_gatekeeper") && !this.hasSeenNpcScene("depth3:return")) {
      return this.showStoryScene("depth3", "return");
    }
    return false;
  }

  readDiscovery(discovery) {
    if (!discovery || !this.player) {
      return false;
    }
    if (!this.player.quest.discoveryIdsFound.includes(discovery.id)) {
      this.player.quest.discoveryIdsFound.push(discovery.id);
      this.recordChronicleEvent("discovery_found", {
        label: discovery.title
      });
    }
    discovery.read = true;
    this.mode = "modal";
    this.showSimpleModal(discovery.title, `
      <div class="section-block text-block">${escapeHtml(discovery.text)}</div>
      <div class="section-block text-block muted">${escapeHtml(discovery.summary)}</div>
      <div class="modal-actions">
        <button class="menu-button" data-action="close-modal" data-focus-key="discovery:continue" type="button">Continue</button>
      </div>
    `, {
      surfaceKey: `discovery:${discovery.id}`,
      focusTarget: "discovery:continue"
    });
    this.log(`${discovery.title} recorded in your journal.`, "good");
    return true;
  }

  getKnownDiscoveryLines(limit = 5) {
    const knownIds = this.player?.quest?.discoveryIdsFound || [];
    return knownIds
      .map((id) => this.getDiscoveryDef(id))
      .filter(Boolean)
      .slice(-limit)
      .reverse()
      .map((entry) => `${entry.title}: ${entry.summary}`);
  }

  getNamedLootLines(limit = 4) {
    this.ensureQuestReactionState();
    const history = this.player?.quest?.namedLootHistory || [];
    return history
      .slice(-limit)
      .reverse()
      .map((entry) => {
        const [affixId, itemId] = String(entry).split(":");
        const affix = LOOT_AFFIX_DEFS[affixId];
        const item = ITEM_DEFS[itemId];
        if (affix && item) {
          return `${affix.name} ${item.name}`;
        }
        return item?.name || entry;
      });
  }

  getTownReactionLines(serviceId = "") {
    return getTownReactionBundle(this, serviceId);
  }

  getReinforcementProfileLabel(profile = this.currentLevel?.reinforcementProfile) {
    switch (profile) {
      case "summons":
        return "summoning wave";
      case "formed":
        return "formed warband";
      case "quiet":
        return "quiet floor";
      default:
        return "hunter wave";
    }
  }

  getCombatFeedLines(limit = 2) {
    if (!this.player || !this.currentLevel || this.currentDepth === 0) {
      return [];
    }
    const lines = [];
    const visible = this.getSortedVisibleEnemies();
    const visibleElite = visible.find((monster) => monster.elite);
    const visibleRaiser = visible.find((monster) => monster.behaviorKit === "corpse_raiser");
    const roomEvent = this.currentLevel.roomEvents?.find((event) => event.status !== "cleared") || null;
    const objective = this.currentLevel.floorObjective;
    if (visibleElite) {
      const behavior = ENEMY_BEHAVIOR_KITS[visibleElite.behaviorKit]?.short || this.getMonsterRoleLabel(visibleElite);
      lines.push(`${visibleElite.name} is active | ${behavior}.`);
    }
    const visibleSpecialist = visible.find((monster) => !monster.elite && monster.behaviorKit);
    if (!visibleElite && visibleSpecialist) {
      const behavior = ENEMY_BEHAVIOR_KITS[visibleSpecialist.behaviorKit];
      if (behavior) {
        lines.push(`${behavior.label}: ${behavior.tell}`);
      }
    }
    if (roomEvent) {
      const blockers = this.getRoomEventBlockers(roomEvent);
      lines.push(blockers > 0
        ? `${roomEvent.label}: ${blockers} defender${blockers === 1 ? "" : "s"} still hold the room.`
        : `${roomEvent.label}: open to resolve at the marker.`);
    }
    if (objective && objective.roomIndex !== null && objective.roomIndex !== undefined) {
      const remaining = this.currentLevel.actors.filter((monster) => monster.roomIndex === objective.roomIndex && monster.hp > 0).length;
      lines.push(remaining > 0
        ? `${objective.label}: ${remaining} guard${remaining === 1 ? "" : "s"} remain in the objective room.`
        : `${objective.label}: objective room is clear.`);
    }
    if (this.currentLevel.floorResolved) {
      const extractDirection = this.currentLevel.stairsUp ? this.getDirectionToPoint(this.currentLevel.stairsUp) : "back";
      if (this.currentLevel.floorOptional && !this.currentLevel.floorOptional.opened && this.currentLevel.floorOptional.marker) {
        lines.push(`Objective clear. Extract ${extractDirection} or stay greedy for ${this.currentLevel.floorOptional.label}.`);
      } else {
        lines.push(`Objective clear. Stairs up ${extractDirection} bank the floor now.`);
      }
    }
    if (this.currentLevel.floorSpecialSummary) {
      lines.push(this.currentLevel.floorSpecialSummary);
    }
    if (this.getCurrentRouteCueText()) {
      lines.push(this.getCurrentRouteCueText());
    }
    if (this.getImmediateDangerNote()) {
      lines.push(this.getImmediateDangerNote());
    }
    if (visibleRaiser && (this.currentLevel.corpses?.length || 0) > 0) {
      lines.push("Fresh corpses are on the floor. Expect raised dead.");
    }
    if ((this.reinforcementClock || 0) <= 4) {
      const turns = Math.max(0, this.reinforcementClock || 0);
      lines.push(`Reinforcements in ${turns} turn${turns === 1 ? "" : "s"} | ${this.getReinforcementProfileLabel()}.`);
    }
    return [...new Set(lines)].slice(0, limit);
  }

  getCurrentChapterObjective() {
    if (this.player?.quest?.complete) {
      return STORY_BEATS.return.chapterObjective;
    }
    if (this.player?.quest?.hasRunestone) {
      return "Return the Runestone to town and hear the valley's first true account of the keep's fall.";
    }
    if (this.player?.quest?.milestonesCleared.includes("depth5_cryptlord")) {
      return STORY_BEATS.depth7.chapterObjective;
    }
    if (this.player?.quest?.milestonesCleared.includes("depth3_gatekeeper")) {
      return STORY_BEATS.depth5.chapterObjective;
    }
    return STORY_BEATS.intro.chapterObjective;
  }

  getActiveBriefingText() {
    if (this.player?.quest?.complete) {
      return STORY_BEATS.return.journal;
    }
    if (this.player?.quest?.milestonesCleared.includes("depth5_cryptlord")) {
      return STORY_BEATS.depth5.journal;
    }
    if (this.player?.quest?.milestonesCleared.includes("depth3_gatekeeper")) {
      return STORY_BEATS.depth3.journal;
    }
    return STORY_BEATS.intro.journal;
  }

  placeMilestoneEncounter(level, depth, sourceRooms) {
    const milestoneDef = this.getMilestoneDefinitionForDepth(depth);
    if (!milestoneDef || !sourceRooms || sourceRooms.length === 0) {
      return null;
    }
    const room = depth === DUNGEON_DEPTH
      ? level.rooms[level.rooms.length - 1]
      : sourceRooms[sourceRooms.length - 1];
    const roomIndex = level.rooms.indexOf(room);
    if (!room || roomIndex < 0) {
      return null;
    }

    const marker = centerOf(room);
    const corners = [
      { x: room.x + 1, y: room.y + 1 },
      { x: room.x + room.w - 2, y: room.y + 1 },
      { x: room.x + 1, y: room.y + room.h - 2 },
      { x: room.x + room.w - 2, y: room.y + room.h - 2 }
    ];
    corners.forEach((point, index) => {
      addLevelProp(level, {
        id: `milestone-torch-${depth}-${index}`,
        x: point.x,
        y: point.y,
        propId: depth === DUNGEON_DEPTH ? "shrineTorch" : "roomTorch",
        layer: "fixture",
        light: true
      });
    });

    const centerpieceProp = depth === 3
      ? "shrineSeal"
      : depth === 5
        ? "bloodAltar"
        : "relicPedestal";
    addLevelProp(level, {
      id: `milestone-center-${depth}`,
      x: marker.x,
      y: marker.y,
      propId: centerpieceProp,
      layer: "fixture",
      light: true
    });
    setTile(level, marker.x, marker.y, tileDef(depth === 5 ? "throne" : "altar", { label: milestoneDef.roomLabel }));

    level.reservedRoomIndexes = [...new Set([...(level.reservedRoomIndexes || []), roomIndex])];
    level.discoveries = Array.isArray(level.discoveries) ? level.discoveries : [];
    level.milestone = {
      ...milestoneDef,
      status: "active",
      roomIndex,
      marker,
      rewardClaimed: false
    };

    const bossTemplate = MONSTER_DEFS.find((monster) => monster.id === milestoneDef.bossId);
    const spawnPoints = [
      { x: marker.x + 1, y: marker.y },
      { x: marker.x - 1, y: marker.y },
      { x: marker.x, y: marker.y - 1 },
      { x: marker.x, y: marker.y + 1 }
    ];
    const bossSpot = spawnPoints.find((point) => isWalkable(level, point.x, point.y) && !actorAt(level, point.x, point.y))
      || randomRoomTile(room);
    if (bossTemplate && bossSpot && !actorAt(level, bossSpot.x, bossSpot.y)) {
      const boss = createMonster(bossTemplate, bossSpot.x, bossSpot.y);
      boss.milestoneBoss = true;
      boss.milestoneId = milestoneDef.id;
      boss.sleeping = false;
      boss.alerted = 8;
      boss.elite = true;
      boss.roomIndex = roomIndex;
      level.actors.push(boss);
    }

    const guardIds = depth === 3
      ? ["orc", "skeleton"]
      : depth === 5
        ? ["wraith", "shaman", "skeleton"]
        : ["warlock", "wraith"];
    guardIds.forEach((monsterId, index) => {
      const template = MONSTER_DEFS.find((monster) => monster.id === monsterId);
      const point = corners[index % corners.length];
      if (!template || !point || !isWalkable(level, point.x, point.y) || actorAt(level, point.x, point.y)) {
        return;
      }
      const guard = createMonster(template, point.x, point.y);
      guard.sleeping = false;
      guard.alerted = 8;
      guard.roomIndex = roomIndex;
      level.actors.push(guard);
    });

    if (depth === DUNGEON_DEPTH) {
      level.items.push({ ...createItem("runestone"), x: marker.x, y: marker.y });
    }

    const discoverySpot = this.findDiscoverySpot(level, room, marker);
    if (milestoneDef.discoveryId && discoverySpot) {
      this.addLevelDiscovery(level, milestoneDef.discoveryId, discoverySpot.x, discoverySpot.y, {
        roomIndex,
        milestoneId: milestoneDef.id
      });
    }

    return level.milestone;
  }

  placeDungeonContent(level, depth) {
    const safeEntryRoomIndexes = new Set(level.safeEntryRoomIndexes || [0]);
    const allContentRooms = level.rooms.slice(1);
    const milestone = this.placeMilestoneEncounter(level, depth, allContentRooms);
    const reservedRoomIndexes = new Set(level.reservedRoomIndexes || []);
    const contentRooms = level.rooms.filter((room, index) => index > 0 && !reservedRoomIndexes.has(index));
    const spawnRooms = level.rooms.filter((room, index) => index > 0 && !safeEntryRoomIndexes.has(index) && !reservedRoomIndexes.has(index));
    const activeSpawnRooms = spawnRooms.length > 0 ? spawnRooms : contentRooms;
    const encounterState = populateDungeonEncounters(level, depth);
    level.tutorialFloor = depth === 1 && (this.player?.deepestDepth || 0) === 0;
    setupFloorDirectives(level, depth, this.townUnlocks);
    this.placeRoomEvent(level, depth, contentRooms);

    const itemCount = 5 + depth;
    for (let i = 0; i < itemCount; i += 1) {
      const room = choice(contentRooms);
      const position = randomRoomTile(room);
      const tile = getTile(level, position.x, position.y);
      if (isOccupied(level, position.x, position.y) || itemsAt(level, position.x, position.y).length > 0 || tile.objectiveId || tile.optionalId || tile.roomEventId || tile.kind !== "floor") {
        continue;
      }
      level.items.push({ ...rollTreasure({ depth, quality: depth >= 4 ? "guarded" : "" }), x: position.x, y: position.y });
    }

    for (let i = 0; i < 3 + Math.floor(depth / 2); i += 1) {
      const room = choice(contentRooms);
      const position = randomRoomTile(room);
      const tile = getTile(level, position.x, position.y);
      if (isWalkable(level, position.x, position.y) && !tile.objectiveId && !tile.optionalId && !tile.roomEventId && tile.kind === "floor") {
        level.items.push({ x: position.x, y: position.y, kind: "gold", name: "Gold", amount: randInt(5, 12) * depth });
      }
    }

    if (depth === 1 && contentRooms.length > 0) {
      const route = level.floorObjective?.marker
        ? this.findPathRouteOnLevel(level, level.start, level.floorObjective.marker) || []
        : [];
      const supportPoint = route[Math.min(route.length - 1, 10)] || null;
      const supportRoomIndex = this.getRoomIndexForPoint(level, supportPoint);
      const supportRoom = supportRoomIndex !== null && supportRoomIndex !== undefined && level.rooms?.[supportRoomIndex]
        ? level.rooms[supportRoomIndex]
        : null;
      const earlyLootRoom = supportRoom || contentRooms[0];
      const heavyLootSpot = randomRoomTile(earlyLootRoom);
      if (isWalkable(level, heavyLootSpot.x, heavyLootSpot.y) && itemsAt(level, heavyLootSpot.x, heavyLootSpot.y).length === 0) {
        level.items.push({ ...createItem("rustedMail", { identified: true }), x: heavyLootSpot.x, y: heavyLootSpot.y });
      }
      const quickLootRoom = supportRoom || contentRooms[Math.min(1, contentRooms.length - 1)];
      const quickLootSpot = randomRoomTile(quickLootRoom);
      if (isWalkable(level, quickLootSpot.x, quickLootSpot.y) && itemsAt(level, quickLootSpot.x, quickLootSpot.y).length === 0) {
        level.items.push({ ...createItem("healingPotion", { identified: true }), x: quickLootSpot.x, y: quickLootSpot.y });
      }
    }

    if (depth !== DUNGEON_DEPTH) {
      this.placeAmbientDiscoveries(level, depth, contentRooms);
    }

    const featureRooms = activeSpawnRooms.slice(0, Math.max(3, Math.floor(activeSpawnRooms.length / 2)));
    featureRooms.slice(0, Math.min(4, featureRooms.length)).forEach((room, index) => {
      const corner = [
        { x: room.x + 1, y: room.y + 1 },
        { x: room.x + room.w - 2, y: room.y + room.h - 2 }
      ][index % 2];
      addLevelProp(level, {
        id: `ambient-torch-${depth}-${index}`,
        x: corner.x,
        y: corner.y,
        propId: "roomTorch",
        layer: "fixture",
        light: true
      });
    });
    for (let i = 0; i < 3 + depth; i += 1) {
      const room = choice(featureRooms);
      const position = randomRoomTile(room);
      const tile = getTile(level, position.x, position.y);
      if (isWalkable(level, position.x, position.y) && tile.kind === "floor" && !tile.objectiveId && !tile.optionalId) {
        setTile(level, position.x, position.y, tileDef("trap", { hidden: Math.random() < 0.55, trapEffect: choice(["dart", "poison", "teleport", "alarm", "trapdoor", "arrow", "summon"]) }));
      }
    }

    if (Math.random() < 0.85) {
      const room = choice(featureRooms);
      const position = randomRoomTile(room);
      if (getTile(level, position.x, position.y).kind === "floor") {
        setTile(level, position.x, position.y, tileDef("fountain", { featureUsed: false, featureEffect: choice(["heal", "mana", "poison", "vision", "damage"]) }));
      }
    }

    if (depth >= 2 && Math.random() < 0.65) {
      const room = choice(featureRooms);
      const position = randomRoomTile(room);
      if (getTile(level, position.x, position.y).kind === "floor") {
        setTile(level, position.x, position.y, tileDef("throne", { featureUsed: false, featureEffect: choice(["gold", "exp", "curse", "summon", "teleport"]) }));
      }
    }

    addSetPiece(level, depth);
    addSecretVault(level, depth);

    if (milestone) {
      level.description = milestone.roomLabel;
    }

    this.prepareGuidedRouteState(level, depth);
    level.floorTheme = encounterState.theme.id;
    level.floorThemeName = encounterState.theme.name;
    level.encounterSummary = getEncounterSummary(level);
  }

  placePlayerAt(x, y) {
    this.player.x = x;
    this.player.y = y;
    syncFloorState(this);
    syncDangerState(this);
    if (this.currentLevel?.kind === "dungeon" && (!this.currentLevel.guidance || !this.currentLevel.routeGuide)) {
      this.prepareGuidedRouteState(this.currentLevel, this.currentDepth);
    }
    this.syncRouteGuideState(this.currentLevel);
    this.updateFov();
    this.applyIntroFloorRecon();
    this.updateMonsterIntents();
  }

  getEventRewardTile(roomEvent) {
    return roomEvent?.marker || { x: this.player.x, y: this.player.y };
  }

  grantRoomEventReward(roomEvent) {
    if (!roomEvent || roomEvent.rewardClaimed) {
      return false;
    }
    const reward = roomEvent.reward || {};
    const drop = this.getEventRewardTile(roomEvent);
    if (reward.type === "item") {
      const primary = createItem(reward.itemId, { identified: true });
      if (primary) {
        this.currentLevel.items.push({ ...primary, x: drop.x, y: drop.y });
        this.recordNamedLoot(primary);
      }
      if (reward.extraItemId) {
        const extra = createItem(reward.extraItemId, { identified: true });
        if (extra) {
          this.currentLevel.items.push({ ...extra, x: drop.x, y: drop.y });
        }
      }
    } else if (reward.type === "treasure") {
      const treasure = rollTreasure({ depth: Math.min(DUNGEON_DEPTH, this.currentDepth + 1), quality: reward.quality || "elite" });
      if (treasure) {
        this.currentLevel.items.push({ ...treasure, x: drop.x, y: drop.y });
        this.recordNamedLoot(treasure);
      }
    } else if (reward.type === "spellbook") {
      const spellbooks = Object.values(ITEM_DEFS).filter((item) => item.kind === "spellbook");
      const unknown = spellbooks.filter((item) => !this.player.spellsKnown.includes(item.spell));
      const template = choice(unknown.length > 0 ? unknown : spellbooks);
      if (template) {
        const book = createItem(template.id, { identified: true });
        this.currentLevel.items.push({ ...book, x: drop.x, y: drop.y });
      }
    } else if (reward.type === "mana") {
      this.player.mana = this.player.maxMana;
      this.currentLevel.items.push({ ...createItem("manaPotion", { identified: true }), x: drop.x, y: drop.y });
    }
    roomEvent.rewardClaimed = true;
    roomEvent.status = "cleared";
    if (this.currentLevel.signatureEncounter?.id === roomEvent.id) {
      this.currentLevel.signatureEncounter = {
        ...this.currentLevel.signatureEncounter,
        summary: `${roomEvent.label} has been resolved.`
      };
    }
    this.recordChronicleEvent("room_event_clear", {
      label: roomEvent.label,
      depth: this.currentDepth
    });
    return true;
  }

  handleRoomEventInteraction(tile) {
    const roomEvent = this.getCurrentRoomEvent();
    if (!roomEvent || roomEvent.status === "cleared") {
      return false;
    }
    const blockers = this.getRoomEventBlockers(roomEvent);
    if (blockers > 0 && roomEvent.eventType !== "ritual") {
      this.log(`${roomEvent.label} is still contested. ${blockers} defender${blockers === 1 ? "" : "s"} remain.`, "warning");
      return true;
    }
    if (roomEvent.id === "failed_summoning") {
      this.player.mana = Math.min(this.player.maxMana, this.player.mana + Math.max(6, Math.floor(this.player.maxMana * 0.45)));
      this.makeNoise(8, this.player, "room_event");
      if (Math.random() < 0.45) {
        this.summonMonsterNearWithCap(this.player.x, this.player.y, weightedMonster(this.currentDepth));
        this.log("The ritual lashes back and spits a body into the room.", "bad");
      } else {
        this.log(roomEvent.rewardText, "good");
      }
      this.grantRoomEventReward(roomEvent);
      return true;
    }
    if (roomEvent.id === "cursed_library") {
      this.log(roomEvent.rewardText, "good");
      if (Math.random() < 0.35) {
        curseRandomCarriedItem(this.player);
        this.log("One of the recovered pages bites back with a curse.", "bad");
      }
      this.grantRoomEventReward(roomEvent);
      this.makeNoise(5, this.player, "room_event");
      return true;
    }
    if (roomEvent.id === "sealed_reliquary" || roomEvent.id === "barricaded_hold") {
      this.log(roomEvent.rewardText, "good");
      this.grantRoomEventReward(roomEvent);
      this.increaseDanger("room_event", 2);
      this.makeNoise(7, this.player, "room_event");
      return true;
    }
    if (roomEvent.id === "wounded_survivor") {
      this.log(roomEvent.rewardText, "good");
      this.grantRoomEventReward(roomEvent);
      grantObjectiveRumor(this);
      addRumorToken(this, 1);
      return true;
    }
    if (roomEvent.eventType === "cache" || roomEvent.eventType === "eliteRoom") {
      this.log(roomEvent.rewardText, "good");
      this.grantRoomEventReward(roomEvent);
      this.increaseDanger("room_event", 2);
      this.makeNoise(6, this.player, "room_event");
      return true;
    }
    if (roomEvent.eventType === "library") {
      this.log(roomEvent.rewardText, "good");
      if (Math.random() < 0.2) {
        curseRandomCarriedItem(this.player);
        this.log("An old ward snaps across your pack as you pull the archive apart.", "bad");
      }
      this.grantRoomEventReward(roomEvent);
      this.makeNoise(4, this.player, "room_event");
      return true;
    }
    if (roomEvent.eventType === "rescue") {
      this.log(roomEvent.rewardText, "good");
      this.grantRoomEventReward(roomEvent);
      addRumorToken(this, 1);
      return true;
    }
    return false;
  }

  getArmorValue() {
    const stats = this.getActorStats(this.player);
    let armor = this.getArmorValueForStats(stats);
    Object.values(this.player.equipment).forEach((item) => {
      if (item && item.armor) {
        armor += getItemArmor(item);
      }
    });
    armor += getBuildArmorBonus(this);
    return armor;
  }

  getGuardValue() {
    const total = Object.values(this.player.equipment).reduce((sum, item) => sum + (item ? getItemGuardBonus(item) : 0), 0);
    return Math.max(0, total - ((this.player.guardBrokenTurns || 0) > 0 ? 2 : 0));
  }

  getWardValue() {
    let ward = Object.values(this.player.equipment).reduce((sum, item) => sum + (item ? getItemWardBonus(item) : 0), 0);
    if ((this.player.arcaneWardTurns || 0) > 0) {
      ward += 2;
    }
    return ward;
  }

  getFireResistValue() {
    let resist = Object.values(this.player.equipment).reduce((sum, item) => sum + (item ? getItemFireResist(item) : 0), 0);
    if ((this.player.resistFireTurns || 0) > 0) {
      resist += 2;
    }
    return resist;
  }

  getColdResistValue() {
    let resist = Object.values(this.player.equipment).reduce((sum, item) => sum + (item ? getItemColdResist(item) : 0), 0);
    if ((this.player.resistColdTurns || 0) > 0) {
      resist += 2;
    }
    return resist;
  }

  getMeleeAccuracyBonus() {
    const weapon = this.player.equipment.weapon;
    return weapon ? getItemAccuracyBonus(weapon) : 0;
  }

  getMeleeCritBonus() {
    const weapon = this.player.equipment.weapon;
    return weapon ? getItemCritBonus(weapon) : 0;
  }

  getAttackValue() {
    const weapon = this.player.equipment.weapon;
    const base = weapon ? getItemPower(weapon) : 2;
    return this.getAttackValueForStats(this.getActorStats(this.player), base) + this.getMeleeAccuracyBonus();
  }

  getDamageRange() {
    const weapon = this.player.equipment.weapon;
    const base = weapon ? getItemPower(weapon) : 2;
    return this.getDamageRangeForStats(this.getActorStats(this.player), base);
  }

  getEvadeValue() {
    let evade = this.getEvadeValueForStats(this.getActorStats(this.player));
    evade -= this.getEncumbranceTier() * 2;
    Object.values(this.player.equipment).forEach((item) => {
      if (item && item.dexPenalty) {
        evade -= item.dexPenalty;
      }
    });
    evade += getBuildEvadeBonus(this);
    return evade;
  }

  getSearchPower() {
    const gearBonus = Object.values(this.player.equipment).reduce((sum, item) => sum + (item ? getItemSearchBonus(item) : 0), 0);
    return this.getSearchPowerForStats(this.getActorStats(this.player), this.player.level) + getBuildSearchBonus(this) + gearBonus;
  }

  getLightRadius() {
    let radius = FOV_RADIUS;
    Object.values(this.player.equipment).forEach((item) => {
      if (item && item.lightBonus) {
        radius += getItemLightBonus(item);
      }
    });
    if ((this.player.lightBuffTurns || 0) > 0) {
      radius += 2;
    }
    return radius;
  }

  getEncumbranceTier() {
    const baseTier = getEncumbranceTier(this.player);
    const activeContract = this.getActiveContract(true);
    if (activeContract?.id === "greedy_burden" && baseTier > 0) {
      return Math.min(2, baseTier + 1);
    }
    return baseTier;
  }

  getSpellDamageBonus(defender, damageType = "magic") {
    return getBuildDamageBonus(this, defender, damageType);
  }

  getAntiUndeadBonus() {
    return Object.values(this.player.equipment).reduce((sum, item) => sum + (item ? getItemBonusVsUndead(item) : 0), 0);
  }

  getOvercastRelief() {
    return Object.values(this.player.equipment).reduce((sum, item) => sum + (item ? getItemOvercastRelief(item) : 0), 0);
  }

  getPlayerMoveSpeed() {
    if (!this.player) {
      return 100;
    }
    let speed = this.getMoveSpeedForStats(this.getActorStats(this.player));
    const encumbrance = this.getEncumbranceTier();
    if (encumbrance === 1) {
      speed -= 10;
    } else if (encumbrance >= 2) {
      speed -= 22;
    }
    if (this.player.relics?.includes("fleet_boots")) {
      speed += 10;
    }
    if ((this.player.slowed || 0) > 0) {
      speed = Math.round(speed * 0.5);
    }
    return clamp(speed, 45, 140);
  }

  consumePlayerMoveTurnBudget() {
    if (!this.player) {
      return 1;
    }
    const speed = this.player.moveSpeed || this.getPlayerMoveSpeed();
    const moveCost = 10000 / Math.max(45, speed);
    this.player.moveTurnBudget = (this.player.moveTurnBudget || 0) + moveCost;
    const monsterActions = Math.floor(this.player.moveTurnBudget / 100);
    this.player.moveTurnBudget -= monsterActions * 100;
    return monsterActions;
  }

  recalculateDerivedStats() {
    const stats = this.getActorStats(this.player);
    const bonusMana = Object.values(this.player.equipment).reduce((sum, item) => sum + (item ? getItemManaBonus(item) : 0), 0);
    const maxMana = this.getMaxManaForStats(stats, this.player.className, bonusMana + getBuildMaxManaBonus(this), this.getPlayerManaBase(this.player));
    const maxHp = this.getMaxHpForStats(stats, this.player.level, this.player.className, this.player.constitutionLoss || 0, this.getPlayerHpBase(this.player) + getBuildMaxHpBonus(this));
    const hpRatio = this.player.maxHp > 0 ? this.player.hp / this.player.maxHp : 1;
    const manaRatio = this.player.maxMana > 0 ? this.player.mana / this.player.maxMana : 1;
    this.player.effectiveStats = stats;
    this.player.maxHp = maxHp;
    this.player.maxMana = maxMana;
    this.player.hp = Math.max(1, Math.round(this.player.maxHp * hpRatio));
    this.player.mana = Math.max(0, Math.round(this.player.maxMana * manaRatio));
    this.player.moveSpeed = this.getPlayerMoveSpeed();
    this.player.lightRadius = this.getLightRadius();
  }

  tryMovePlayer(dx, dy) {
    if ((this.player.held || 0) > 0) {
      this.resetMovementCadence({ clearHeld: false });
      this.log("You strain against a holding spell and fail to move.", "warning");
      this.endTurn();
      return;
    }
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;
    if (!inBounds(this.currentLevel, nx, ny)) {
      this.resetMovementCadence({ clearHeld: false });
      return;
    }
    const monster = actorAt(this.currentLevel, nx, ny);
    if (monster) {
      this.resetMovementCadence({ clearHeld: false });
      this.attack(this.player, monster);
      this.endTurn();
      return;
    }

    const tile = getTile(this.currentLevel, nx, ny);
    if (!tile.walkable) {
      this.resetMovementCadence({ clearHeld: false });
      if (tile.kind === "sign") {
        this.log(tile.label, "warning");
        this.render();
      }
      return;
    }

    this.player.x = nx;
    this.player.y = ny;
    this.noteSuccessfulMove();
    this.trackFirstPlayerMove(nx, ny);
    this.flashTile(nx, ny, "#ffd36b", 120, { alpha: 0.12, decorative: true });
    onPlayerMove(this);
    this.audio.play("move");
    const current = getTile(this.currentLevel, nx, ny);
    this.handleTileEntry(current);
    if (current.kind === "stairDown") {
      this.resetMovementCadence();
      this.useStairs("down");
      return;
    }
    if (current.kind === "stairUp") {
      this.resetMovementCadence();
      this.useStairs("up");
      return;
    }
    this.pickupHere(true, true);
    if (this.pendingPickupPrompt) {
      this.resetMovementCadence();
      this.render();
      return;
    }
    if (current.kind === "buildingDoor" && current.service) {
      this.resetMovementCadence();
      this.openTownService(current.service);
    }
    this.endTurn({ monsterActions: this.consumePlayerMoveTurnBudget() });
  }

  handleTileEntry(tile) {
    const firstTownRun = this.currentDepth === 0 && (this.player.deepestDepth || 0) === 0;
    if (this.currentDepth > 0) {
      this.maybeTriggerRouteBeat(this.currentLevel);
    }
    this.trackObjectiveProgress(tile);
    this.trackOptionalProgress(tile);
    if (firstTownRun && tile.kind === "road" && this.player.y <= 12 && !this.storyFlags.keepPromptShown) {
      this.storyFlags.keepPromptShown = true;
      this.log(this.storyFlags.townServiceVisited
        ? "The keep stairs are directly ahead. Stay on the north road to descend."
        : "The keep stairs are ahead. Check one town door first, then return to the north road.", "warning");
    }
    if (this.currentDepth === 0 && tile.kind === "buildingDoor" && tile.service && !this.storyFlags.servicePromptShown) {
      this.storyFlags.servicePromptShown = true;
      this.log("Town doors open services immediately. Step onto any labeled doorway to trade, heal, identify, or bank gold.", "warning");
    }
    if (tile.objectiveId) {
      this.markOnboarding("find_objective");
      const objective = this.currentLevel?.floorObjective;
      const blockers = getObjectiveDefendersRemaining(this.currentLevel);
      const interaction = this.getObjectiveInteractionPromptData(objective, blockers);
      if (objective?.id === "rescue_captive" && getObjectiveRoomClear(this)) {
        handleObjectiveInteraction(this, tile);
        return;
      }
      this.log(interaction?.roomDetail || `${interaction?.label || "Objective"} is here.`, interaction?.tone || "warning");
      return;
    }
    if (tile.optionalId) {
      this.log(`${tile.label || "Temptation"} waits here. Greed will raise the floor's danger.`, "warning");
      return;
    }
    if (tile.discoveryId) {
      const discovery = this.getDiscoveryDef(tile.discoveryId);
      const verb = this.player.quest.discoveryIdsFound.includes(tile.discoveryId) ? "review" : "read";
      this.log(`${discovery ? discovery.label : "An inscription"} is here. Press U to ${verb} it.`, "warning");
      return;
    }
    if (tile.roomEventId) {
      const roomEvent = this.getCurrentRoomEvent();
      const blockers = this.getRoomEventBlockers(roomEvent);
      const blockerText = blockers > 0 && roomEvent?.eventType !== "ritual"
        ? ` ${blockers} defender${blockers === 1 ? "" : "s"} remain before it is safe.`
        : "";
      this.log(`${roomEvent ? roomEvent.roomHint : tile.label} Press U to resolve it.${blockerText}`, "warning");
      return;
    }
    if (tile.kind === "altar") {
      if (tile.featureEffect) {
        this.log("A shrine waits here. Press U to risk a bargain.", "warning");
      } else {
        this.log("An ancient altar dominates this chamber. Something important rests nearby.", "warning");
      }
      return;
    }
    if (tile.kind === "trap") {
      this.triggerTrap(tile, this.player.x, this.player.y);
      return;
    }
    if (tile.kind === "fountain") {
      this.log("A stone fountain bubbles here. Press U to drink.", "warning");
      return;
    }
    if (tile.kind === "throne") {
      this.log("A lonely throne stands here. Press U to sit.", "warning");
    }
  }

  interactHere() {
    const tile = getTile(this.currentLevel, this.player.x, this.player.y);
    const discovery = tile?.discoveryId ? this.getDiscoveryAt(this.player.x, this.player.y) : null;
    if (discovery && this.readDiscovery(discovery)) {
      this.render();
      return;
    }
    if (tile?.roomEventId && this.handleRoomEventInteraction(tile)) {
      this.endTurn();
      return;
    }
    if (handleObjectiveInteraction(this, tile)) {
      this.endTurn();
      return;
    }
    if (tile.kind === "altar" && tile.featureEffect) {
      this.useAltar(tile);
      this.endTurn();
      return;
    }
    if (tile.kind === "fountain") {
      this.useFountain(tile);
      this.endTurn();
      return;
    }
    if (tile.kind === "throne") {
      this.useThrone(tile);
      this.endTurn();
      return;
    }
    this.log("There is nothing here to use.", "warning");
    this.render();
  }

  useAltar(tile) {
    if (tile.featureUsed) {
      this.log("The shrine has already taken its due.", "warning");
      return;
    }
    tile.featureUsed = true;
    this.flashTile(this.player.x, this.player.y, "#caa8ff", 220, { alpha: 0.18 });
    if (tile.featureEffect === "tribute") {
      const gold = randInt(45, 120) * Math.max(1, this.currentDepth);
      this.player.gold += gold;
      if (Math.random() < 0.75) {
        this.addItemToInventory(createItem(Math.random() < 0.4 ? "wandSlow" : "identifyScroll"));
        this.log(`The idol spills ${gold} gold and a strange gift. The room stirs.`, "good");
      } else {
        this.log(`The idol spills ${gold} gold. Every lurking thing hears your greed.`, "good");
      }
      this.makeNoise(12, this.player, "tribute");
      if (this.floorResolved) {
        this.markGreedAction("altar");
      }
      if (Math.random() < 0.35) {
        curseRandomCarriedItem(this.player);
        this.log("The gift carries a hidden malice.", "bad");
      }
      return;
    }
    if (tile.featureEffect === "blood") {
      const pain = Math.max(2, roll(1, 4) + Math.floor(this.currentDepth / 2));
      this.player.hp = Math.max(1, this.player.hp - pain);
      this.player.mana = this.player.maxMana;
      this.log(`The shrine drinks ${pain} blood and floods you with power.`, "good");
      this.makeNoise(5, this.player, "blood");
      if (this.floorResolved) {
        this.markGreedAction("altar");
      }
      return;
    }
    if (tile.featureEffect === "revelation") {
      revealCircle(this.currentLevel, this.player.x, this.player.y, 8);
      revealNearbySecrets(this.currentLevel, this.player.x, this.player.y, 8);
      this.log("Cold insight reveals the nearby halls, but something answers the omen.", "warning");
      this.makeNoise(9, this.player, "revelation");
      if (this.floorResolved) {
        this.markGreedAction("altar");
      }
      this.summonMonsterNearWithCap(this.player.x, this.player.y, weightedMonster(this.currentDepth));
    }
  }

  legacyPerformSearchUnused() {
    if (!this.player || this.mode !== "game") {
      return;
    }
    const radius = this.getSearchRadiusForStats(this.getActorStats(this.player));
    const searchPower = this.getSearchPower();
    let found = 0;
    for (let y = this.player.y - radius; y <= this.player.y + radius; y += 1) {
      for (let x = this.player.x - radius; x <= this.player.x + radius; x += 1) {
        if (!inBounds(this.currentLevel, x, y)) {
          continue;
        }
        const tile = getTile(this.currentLevel, x, y);
        if ((tile.kind === "trap" && tile.hidden) || tile.kind === "secretDoor" || tile.kind === "secretWall") {
          const targetNumber = tile.kind === "trap" ? 24 : 28;
          if (randInt(1, 20) + searchPower >= targetNumber) {
            revealSecretTile(this.currentLevel, x, y);
            found += 1;
          }
        }
      }
    }
    this.log(found > 0 ? `You discover ${found} hidden feature${found === 1 ? "" : "s"}.` : "You search carefully but find nothing.", found > 0 ? "good" : "warning");
    this.audio.play(found > 0 ? "searchGood" : "search");
    this.endTurn();
  }

  focusMap() {
    if (this.mapDrawer) {
      this.mapDrawerOpen = true;
      this.refreshChrome();
    }
    if (this.mapCanvas && this.layoutMode !== "desktop") {
      this.mapCanvas.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    this.mapCanvas?.focus?.();
  }

  pollGamepad() {
    const intent = this.gamepadInput.poll(this.mode, this.getMovementRepeatInterval());
    if (!intent) {
      this.refreshChrome();
      return false;
    }
    this.setInputSource("gamepad");
    this.refreshChrome();
    if (intent.type === "move") {
      this.handleMovementIntent(intent.dx, intent.dy);
      return true;
    }
    if (intent.type === "target") {
      this.moveTargetCursor(intent.dx, intent.dy);
      return true;
    }
    if (intent.type === "ui-move") {
      this.handleUiNavigationIntent(intent.dx, intent.dy);
      return true;
    }
    if (intent.type === "ui-tab-prev") {
      this.handleUiTabIntent(-1);
      return true;
    }
    if (intent.type === "ui-tab-next") {
      this.handleUiTabIntent(1);
      return true;
    }
    if (intent.type === "ui-scroll") {
      this.handleUiScrollIntent(intent.delta);
      return true;
    }
    if (intent.type === "dock") {
      this.resetMovementCadence({ clearHeld: false });
      this.triggerDockSlot(intent.slot);
      return true;
    }
    if (intent.type === "ui-confirm") {
      this.resetMovementCadence({ clearHeld: false });
      if (this.mode === "target") {
        this.confirmTargetSelection();
      } else if (this.mode === "modal" || this.mode === "creation" || this.mode === "title" || this.mode === "levelup") {
        const target = this.getActiveUiActionableElement() || this.focusFirstUiElement();
        if (target && typeof target.click === "function") {
          target.click();
        } else if (this.mode === "creation") {
          this.beginAdventure();
        }
      }
      return true;
    }
    if (intent.type === "ui-back") {
      this.resetMovementCadence({ clearHeld: false });
      this.handleControllerBackAction();
      return true;
    }
    if (intent.type === "action") {
      this.resetMovementCadence({ clearHeld: false });
      this.handleAction(intent.action, intent.tab ? { dataset: { tab: intent.tab } } : null);
      return true;
    }
    return false;
  }

  getUiNavigationRoot() {
    return this.modalRoot && !this.modalRoot.classList.contains("hidden")
      ? this.modalRoot
      : this.appShell || document;
  }

  isNavigableElement(element) {
    return Boolean(
      element &&
      element instanceof HTMLElement &&
      element.offsetParent !== null &&
      !element.disabled &&
      !element.hasAttribute("disabled") &&
      !element.hidden &&
      element.getAttribute("aria-hidden") !== "true"
    );
  }

  getUiNavigableElements(root = this.getUiNavigationRoot()) {
    const selector = [
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[data-action]:not([disabled])",
      "[data-move]:not([disabled])",
      "[tabindex]:not([tabindex='-1'])"
    ].join(", ");
    const seen = new Set();
    return Array.from(root.querySelectorAll(selector))
      .filter((element) => {
        if (!this.isNavigableElement(element) || seen.has(element)) {
          return false;
        }
        seen.add(element);
        return true;
      });
  }

  getUiNavMeta(element) {
    if (!element) {
      return null;
    }
    const rect = element.getBoundingClientRect();
    return {
      element,
      zone: element.dataset.navZone || "default",
      row: Number.isFinite(Number(element.dataset.navRow)) ? Number(element.dataset.navRow) : null,
      col: Number.isFinite(Number(element.dataset.navCol)) ? Number(element.dataset.navCol) : null,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }

  getUiDirectionName(dx, dy) {
    if (dx > 0) {
      return "right";
    }
    if (dx < 0) {
      return "left";
    }
    if (dy > 0) {
      return "down";
    }
    if (dy < 0) {
      return "up";
    }
    return "";
  }

  getUiDirectionalOverride(active, dx, dy) {
    if (!active?.dataset) {
      return null;
    }
    const direction = this.getUiDirectionName(dx, dy);
    if (!direction) {
      return null;
    }
    const overrideKey = active.dataset[`nav${direction.charAt(0).toUpperCase()}${direction.slice(1)}`];
    return overrideKey ? this.findUiElementByFocusKey(overrideKey) : null;
  }

  getSequentialUiElement(active, step, focusables = this.getUiNavigableElements()) {
    if (!focusables.length) {
      return null;
    }
    let index = focusables.indexOf(active);
    if (index < 0) {
      index = 0;
    } else {
      index = (index + step + focusables.length) % focusables.length;
    }
    return focusables[index] || null;
  }

  scoreDirectionalCandidate(activeMeta, candidateMeta, dx, dy, sameZone) {
    const deltaX = candidateMeta.x - activeMeta.x;
    const deltaY = candidateMeta.y - activeMeta.y;
    const primaryDistance = dx !== 0 ? deltaX * dx : deltaY * dy;
    if (primaryDistance <= 1) {
      return Number.POSITIVE_INFINITY;
    }
    const crossDistance = Math.abs(dx !== 0 ? deltaY : deltaX);
    const rowPenalty = activeMeta.row !== null && candidateMeta.row !== null ? Math.abs(candidateMeta.row - activeMeta.row) * 8 : 0;
    const colPenalty = activeMeta.col !== null && candidateMeta.col !== null ? Math.abs(candidateMeta.col - activeMeta.col) * 6 : 0;
    return primaryDistance + crossDistance * 1.8 + rowPenalty + colPenalty - (sameZone ? 18 : 0);
  }

  getGridDirectionalUiTarget(activeMeta, candidates, dx, dy) {
    if (!activeMeta || activeMeta.row === null || activeMeta.col === null || candidates.length === 0) {
      return null;
    }
    const withGrid = candidates.filter((candidate) => candidate.row !== null && candidate.col !== null);
    if (withGrid.length === 0) {
      return null;
    }

    const scoreCandidate = (candidate) => {
      const rowDelta = candidate.row - activeMeta.row;
      const colDelta = candidate.col - activeMeta.col;
      if (dx !== 0) {
        const primary = colDelta * dx;
        if (primary <= 0) {
          return Number.POSITIVE_INFINITY;
        }
        return primary * 100 + Math.abs(rowDelta) * 10 + Math.abs(colDelta);
      }
      const primary = rowDelta * dy;
      if (primary <= 0) {
        return Number.POSITIVE_INFINITY;
      }
      return primary * 100 + Math.abs(colDelta) * 10 + Math.abs(rowDelta);
    };

    let best = null;
    let bestScore = Number.POSITIVE_INFINITY;
    withGrid.forEach((candidate) => {
      const score = scoreCandidate(candidate);
      if (score < bestScore) {
        best = candidate.element;
        bestScore = score;
      }
    });
    return best;
  }

  findDirectionalUiTarget(active, dx, dy) {
    const focusables = this.getUiNavigableElements();
    if (!focusables.length) {
      return null;
    }
    const override = this.getUiDirectionalOverride(active, dx, dy);
    if (override) {
      return override;
    }
    const activeMeta = this.getUiNavMeta(active);
    if (!activeMeta) {
      return this.getSequentialUiElement(active, dy > 0 || dx > 0 ? 1 : -1, focusables);
    }
    const candidates = focusables
      .filter((element) => element !== active)
      .map((element) => this.getUiNavMeta(element))
      .filter(Boolean);
    const groups = [
      candidates.filter((candidate) => candidate.zone === activeMeta.zone),
      candidates
    ];
    for (const group of groups) {
      const gridTarget = this.getGridDirectionalUiTarget(activeMeta, group, dx, dy);
      if (gridTarget) {
        return gridTarget;
      }
      let best = null;
      let bestScore = Number.POSITIVE_INFINITY;
      group.forEach((candidate) => {
        const sameZone = candidate.zone === activeMeta.zone;
        const score = this.scoreDirectionalCandidate(activeMeta, candidate, dx, dy, sameZone);
        if (score < bestScore) {
          best = candidate.element;
          bestScore = score;
        }
      });
      if (best) {
        return best;
      }
    }
    return this.getSequentialUiElement(active, dy > 0 || dx > 0 ? 1 : -1, focusables);
  }

  focusUiElement(element) {
    if (!element || typeof element.focus !== "function") {
      return;
    }
    if (element.dataset?.focusKey) {
      this.controllerFocusKey = element.dataset.focusKey;
    }
    element.focus({ preventScroll: true });
    if (this.modalRoot && this.modalRoot.contains(element) && typeof element.scrollIntoView === "function") {
      element.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }

  handleUiNavigationIntent(dx, dy) {
    const focusables = this.getUiNavigableElements();
    if (focusables.length === 0) {
      return;
    }
    const active = document.activeElement;
    if (!this.isNavigableElement(active) || !focusables.includes(active)) {
      this.focusUiElement(focusables[0]);
      return;
    }
    const next = this.findDirectionalUiTarget(active, dx, dy);
    if (next) {
      this.focusUiElement(next);
    }
  }

  getActiveUiActionableElement() {
    const active = document.activeElement;
    if (!active || !(active instanceof HTMLElement)) {
      return null;
    }
    if (active.matches("button:not([disabled]), [data-action]:not([disabled]), [data-move]:not([disabled])")) {
      return active;
    }
    return null;
  }

  focusFirstUiElement(zone = "") {
    const focusables = this.getUiNavigableElements().filter((element) => !zone || element.dataset.navZone === zone);
    if (focusables.length === 0) {
      return null;
    }
    this.focusUiElement(focusables[0]);
    return focusables[0];
  }

  getModalElement() {
    return this.modalRoot ? this.modalRoot.querySelector(".modal") : null;
  }

  getModalScrollHost() {
    const modal = this.getModalElement();
    if (!modal) {
      return null;
    }
    return modal.querySelector(".modal-body") || modal;
  }

  getFocusKeyCandidates(focusTarget) {
    const raw = Array.isArray(focusTarget) ? focusTarget : [focusTarget];
    return [...new Set(raw.filter((key) => typeof key === "string" && key.length > 0))];
  }

  getUtilityModalReturnOptions(returnFocusKey = "") {
    if (this.modalSurfaceKey !== "utility-menu" || !returnFocusKey) {
      return {};
    }
    return {
      closeLabel: "Back to Menu",
      modalReturnContext: {
        originSurface: "utility-menu",
        returnFocusKey
      }
    };
  }

  findUiElementByFocusKey(focusKey) {
    if (!focusKey) {
      return null;
    }
    const root = this.getUiNavigationRoot();
    return Array.from(root.querySelectorAll("[data-focus-key]"))
      .find((element) => element.dataset.focusKey === focusKey && element.offsetParent !== null && !element.disabled) || null;
  }

  getElementOffsetInModal(element, modal = this.getModalScrollHost()) {
    if (!element || !modal || !modal.contains(element)) {
      return null;
    }
    const elementRect = element.getBoundingClientRect();
    const modalRect = modal.getBoundingClientRect();
    return (elementRect.top - modalRect.top) + modal.scrollTop;
  }

  captureModalRefreshState(surfaceKey) {
    const modal = this.getModalScrollHost();
    if (!modal || !surfaceKey || surfaceKey !== this.modalSurfaceKey) {
      return null;
    }
    const active = this.getActiveUiActionableElement();
    return {
      surfaceKey,
      scrollTop: modal.scrollTop,
      focusKey: active?.dataset?.focusKey || null,
      focusOffsetTop: this.getElementOffsetInModal(active, modal)
    };
  }

  findNearestUiElementByOffset(targetOffset) {
    if (typeof targetOffset !== "number") {
      return null;
    }
    const modal = this.getModalScrollHost();
    const focusables = this.getUiNavigableElements().filter((element) => !modal || modal.contains(element));
    if (focusables.length === 0) {
      return null;
    }
    const candidates = focusables.some((element) => element.dataset.focusKey)
      ? focusables.filter((element) => element.dataset.focusKey)
      : focusables;
    let best = candidates[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    candidates.forEach((element) => {
      const offset = this.getElementOffsetInModal(element, modal);
      if (typeof offset !== "number") {
        return;
      }
      const distanceToTarget = Math.abs(offset - targetOffset);
      if (distanceToTarget < bestDistance) {
        best = element;
        bestDistance = distanceToTarget;
      }
    });
    return best;
  }

  resolveModalFocusTarget(focusTarget, previousState = null) {
    const candidates = this.getFocusKeyCandidates(focusTarget);
    if (previousState?.focusKey) {
      candidates.push(previousState.focusKey);
    }
    for (const key of [...new Set(candidates)]) {
      const element = this.findUiElementByFocusKey(key);
      if (element) {
        return element;
      }
    }
    if (typeof previousState?.focusOffsetTop === "number") {
      return this.findNearestUiElementByOffset(previousState.focusOffsetTop);
    }
    if (typeof previousState?.scrollTop === "number") {
      return this.findNearestUiElementByOffset(previousState.scrollTop);
    }
    return null;
  }

  handleUiTabIntent(step) {
    if (this.mode === "target") {
      return;
    }
    if (this.mode === "modal" && this.activeHubTab) {
      const tabs = ["pack", "magic", "journal"];
      const currentIndex = tabs.indexOf(this.activeHubTab);
      if (currentIndex >= 0) {
        const nextTab = tabs[(currentIndex + step + tabs.length) % tabs.length];
        this.showHubModal(nextTab, {
          preserveScroll: true,
          focusTarget: this.getHubTabFocusKey(nextTab)
        });
      }
    }
  }

  getScrollHostForElement(element) {
    if (!(element instanceof HTMLElement)) {
      return null;
    }
    return element.closest(".pack-list-panel, .message-log, .journal-log, .modal-body, .modal, .modal-root");
  }

  handleUiScrollIntent(delta) {
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const host = this.getScrollHostForElement(active) || this.getModalScrollHost() || this.modalRoot;
    if (!host || typeof host.scrollBy !== "function") {
      return;
    }
    host.scrollBy({ top: delta * 96, left: 0, behavior: "smooth" });
  }

  ensureFocusKey(element, fallbackKey) {
    if (!(element instanceof HTMLElement)) {
      return "";
    }
    if (element.dataset.focusKey) {
      return element.dataset.focusKey;
    }
    const derivedKey = element.id
      || (element.dataset.action
        ? `${element.dataset.action}:${element.dataset.tab || element.dataset.setting || element.dataset.service || element.dataset.reward || element.dataset.spell || element.dataset.index || element.dataset.slot || element.dataset.move || "default"}`
        : fallbackKey);
    if (derivedKey) {
      element.dataset.focusKey = derivedKey;
    }
    return element.dataset.focusKey || "";
  }

  assignNavMetadata(elements, zone, columns = 1, rowOffset = 0) {
    elements
      .filter((element) => element instanceof HTMLElement)
      .forEach((element, index) => {
        this.ensureFocusKey(element, `${zone}:${index}`);
        element.dataset.navZone = zone;
        element.dataset.navRow = String(rowOffset + Math.floor(index / columns));
        element.dataset.navCol = String(index % columns);
      });
  }

  applyControllerNavigationMetadata() {
    const root = this.getUiNavigationRoot();
    if (!root) {
      return;
    }
    this.assignNavMetadata(
      [
        this.quickSaveButton,
        this.quickLoadButton,
        this.mapToggleButton,
        this.spellTrayToggleButton,
        document.getElementById("utility-menu-button")
      ].filter(Boolean),
      "top-band",
      5
    );
    if (this.mapCanvas) {
      this.mapCanvas.tabIndex = 0;
      this.mapCanvas.dataset.focusKey = this.mapCanvas.dataset.focusKey || "map:canvas";
      this.mapCanvas.dataset.navZone = "map-drawer";
      this.mapCanvas.dataset.navRow = "0";
      this.mapCanvas.dataset.navCol = "0";
    }
    this.assignNavMetadata(Array.from(this.actionBar?.querySelectorAll("button") || []), "action-bar", 4);
    this.assignNavMetadata(Array.from(root.querySelectorAll("#spell-tray button")), "spell-tray", this.layoutMode === "desktop" ? 1 : 2);
    this.assignNavMetadata(Array.from(this.touchControls?.querySelectorAll("button") || []), "touch-pad", 3);
    this.assignNavMetadata(Array.from(root.querySelectorAll(".title-actions button")), "title-actions", 3);
    this.assignNavMetadata(Array.from(root.querySelectorAll("[data-role='title-music-toggle']")), "title-music", 1);
    const creationName = root.querySelector("#hero-name");
    const creationActions = Array.from(root.querySelectorAll("[data-focus-key='creation:back'], [data-focus-key='creation:begin']"));
    if (creationName) {
      this.ensureFocusKey(creationName, "creation:name");
      creationName.dataset.navZone = "name";
      creationName.dataset.navRow = "0";
      creationName.dataset.navCol = "0";
    }
    const raceChoices = Array.from(root.querySelectorAll("#race-choice [data-race]"));
    const classChoices = Array.from(root.querySelectorAll("#class-choice [data-class]"));
    this.assignNavMetadata(raceChoices, "race-grid", 1);
    this.assignNavMetadata(classChoices, "class-grid", 1);
    const resetButton = root.querySelector("[data-action='creation-reset-stats']");
    if (resetButton) {
      this.ensureFocusKey(resetButton, "creation:reset-stats");
      resetButton.dataset.navZone = "stats";
      resetButton.dataset.navRow = "0";
      resetButton.dataset.navCol = "2";
    }
    const statButtons = Array.from(root.querySelectorAll(".creation-stat-button"));
    this.assignNavMetadata(statButtons, "stats", 2, 1);
    this.assignNavMetadata(creationActions, "creation-actions", 2);
    if (creationName && raceChoices[0]) {
      creationName.dataset.navDown = raceChoices[0].dataset.focusKey;
    }
    raceChoices.forEach((element, index) => {
      if (creationName) {
        element.dataset.navUp = creationName.dataset.focusKey;
      }
      const nextClass = classChoices[Math.min(index, classChoices.length - 1)];
      if (nextClass) {
        element.dataset.navDown = nextClass.dataset.focusKey;
      }
    });
    classChoices.forEach((element, index) => {
      const priorRace = raceChoices[Math.min(index, raceChoices.length - 1)];
      if (priorRace) {
        element.dataset.navUp = priorRace.dataset.focusKey;
      }
      if (statButtons[0]) {
        element.dataset.navDown = statButtons[0].dataset.focusKey;
      }
    });
    statButtons.forEach((element) => {
      if (classChoices[0]) {
        element.dataset.navUp = classChoices[0].dataset.focusKey;
      }
    });
    const lastStatButton = statButtons[statButtons.length - 1];
    if (lastStatButton && creationActions[0]) {
      lastStatButton.dataset.navDown = creationActions[0].dataset.focusKey;
    }
    creationActions.forEach((element) => {
      if (statButtons[statButtons.length - 1]) {
        element.dataset.navUp = statButtons[statButtons.length - 1].dataset.focusKey;
      }
    });
    this.assignNavMetadata(Array.from(root.querySelectorAll(".hub-tabs .hub-tab")), "hub-tabs", 3);
    this.assignNavMetadata(Array.from(root.querySelectorAll(".pack-paperdoll .paper-slot")), "equipment", 2);
    const packFilters = Array.from(root.querySelectorAll(".pack-filter-row .hub-filter-chip"));
    const magicFilters = Array.from(root.querySelectorAll(".magic-filter-row .hub-filter-chip"));
    const spellLearnFilters = Array.from(root.querySelectorAll(".spell-learn-filter-row .hub-filter-chip"));
    const shopPanels = Array.from(root.querySelectorAll(".shop-panel-row .hub-filter-chip"));
    const journalSections = Array.from(root.querySelectorAll(".journal-section-row .hub-filter-chip"));
    const packItems = Array.from(root.querySelectorAll(".pack-group-list .pack-item-row"));
    this.assignNavMetadata(packFilters, "inventory-filters", 4);
    this.assignNavMetadata(magicFilters, "magic-filters", 4);
    this.assignNavMetadata(spellLearnFilters, "spell-learn-filters", 4);
    this.assignNavMetadata(shopPanels, "shop-panels", 2);
    this.assignNavMetadata(journalSections, "journal-sections", 4);
    this.assignNavMetadata(packItems, "inventory-list", 1);
    if (packItems[0]) {
      packFilters.forEach((element) => {
        element.dataset.navDown = packItems[0].dataset.focusKey;
      });
      packItems.forEach((element) => {
        element.dataset.navUp = packFilters[0].dataset.focusKey;
      });
    }
    this.assignNavMetadata(Array.from(root.querySelectorAll(".pack-inspector-panel .pack-ready-chip, .pack-inspector-panel .menu-button, .pack-inspector-panel .tiny-button, .pack-inspector-panel [data-action='toggle-sale-mark']")), "inspector-actions", 2);
    this.assignNavMetadata(Array.from(root.querySelectorAll(".magic-grid button")), "spell-grid", 2);
    const magicGridButtons = Array.from(root.querySelectorAll(".magic-grid button"));
    if (magicGridButtons[0]) {
      magicFilters.forEach((element) => {
        element.dataset.navDown = magicGridButtons[0].dataset.focusKey;
      });
    }
    this.assignNavMetadata(Array.from(root.querySelectorAll(".spell-learn-grid .spell-learn-card")), "spell-learn-grid", 2);
    const spellLearnCards = Array.from(root.querySelectorAll(".spell-learn-grid .spell-learn-card"));
    if (spellLearnCards[0]) {
      spellLearnFilters.forEach((element) => {
        element.dataset.navDown = spellLearnCards[0].dataset.focusKey;
      });
      spellLearnCards.forEach((element) => {
        if (spellLearnFilters[0]) {
          element.dataset.navUp = spellLearnFilters[0].dataset.focusKey;
        }
      });
    }
    this.assignNavMetadata(Array.from(root.querySelectorAll(".journal-log")), "journal-log", 1);
    this.assignNavMetadata(Array.from(root.querySelectorAll(".utility-row .menu-button")), "journal-actions", 4);
    const journalLogs = Array.from(root.querySelectorAll(".journal-log"));
    if (journalLogs[0]) {
      journalSections.forEach((element) => {
        element.dataset.navDown = journalLogs[0].dataset.focusKey || "journal-log";
      });
    }
    if (journalSections[0]) {
      journalLogs.forEach((element) => {
        element.dataset.navUp = journalSections[0].dataset.focusKey;
      });
    }
    this.assignNavMetadata(Array.from(root.querySelectorAll("[data-action='shop-buy']")), "shop-buy", 1);
    const shopSellControls = Array.from(root.querySelectorAll("[data-action='shop-sell'], [data-action='toggle-sale-mark'][data-shop-sell-row='true']"));
    this.assignNavMetadata(shopSellControls, "shop-sell", 1);
    const shopBuyButtons = Array.from(root.querySelectorAll("[data-action='shop-buy']"));
    const shopSellButtons = shopSellControls;
    if (shopBuyButtons[0]) {
      shopPanels.forEach((element) => {
        if (element.dataset.panel === "buy") {
          element.dataset.navDown = shopBuyButtons[0].dataset.focusKey;
        }
      });
    }
    if (shopSellButtons[0]) {
      shopPanels.forEach((element) => {
        if (element.dataset.panel === "sell") {
          element.dataset.navDown = shopSellButtons[0].dataset.focusKey;
        }
      });
    }
    this.assignNavMetadata(Array.from(root.querySelectorAll("[data-action='service-use']")), "services", 1);
    this.assignNavMetadata(Array.from(root.querySelectorAll("[data-action='setting-toggle']")), "settings", 1);
    this.assignNavMetadata(Array.from(root.querySelectorAll("[data-action='bank-deposit'], [data-action='bank-withdraw'], [data-action='town-rumor'], [data-action='town-unlock']")), "bank-actions", 4);
    this.assignNavMetadata(Array.from(root.querySelectorAll("[data-action='contract-toggle']")), "contracts", 1);
    this.assignNavMetadata(Array.from(root.querySelectorAll(".spell-learn-card")), "reward-grid", 2);
    this.assignNavMetadata(Array.from(root.querySelectorAll(".modal-actions button")), "modal-actions", 3);
    this.assignNavMetadata(Array.from(root.querySelectorAll(".utility-menu-actions .action-button")), "utility-menu", 2);
  }

  updateEffects() {
    const now = nowTime();
    if (this.boardImpulse && this.boardImpulse.until <= now) {
      this.boardImpulse = null;
    }
    if (this.visualEffects.length > 0) {
      this.visualEffects = this.visualEffects.filter((effect) => effect.until > now);
    }
    if (!this.shouldAnimateBoard()) {
      return;
    }
    this.renderBoard();
  }

  addEffect(effect) {
    if (!effect) {
      return;
    }
    const profile = this.getEffectProfile();
    if (profile.intensity === "minimal" && effect.decorative) {
      return;
    }
    const created = nowTime();
    const duration = effect.duration || Math.max(60, (effect.until || created + 180) - created);
    this.visualEffects.push({
      intensity: effect.intensity || (profile.intensity === "enhanced" ? 1.15 : 1),
      radius: effect.radius || 1,
      ...effect,
      created,
      until: effect.until || created + duration
    });
    if (this.visualEffects.length > 48) {
      this.visualEffects.splice(0, this.visualEffects.length - 48);
    }
    if (this.mode === "game" || this.mode === "target") {
      this.renderBoard();
    }
  }

  showSettingsModal(options = {}) {
    const {
      preserveScroll = false,
      focusTarget = null,
      fallbackFocus = true,
      closeLabel = "Close",
      modalReturnContext = null
    } = options;
    this.mode = "modal";
    this.showSimpleModal("Device Settings", `
      <div class="section-block text-block">Travel settings are stored on this device.</div>
      <div class="shop-row">
        <div><strong>Touch Controls</strong><div class="muted">Show the on-screen movement pad when not hidden.</div></div>
        <div class="actions"><button class="tiny-button" data-action="setting-toggle" data-setting="touchControlsEnabled" type="button">${this.settings.touchControlsEnabled ? "On" : "Off"}</button></div>
      </div>
      <div class="shop-row">
        <div><strong>Hide Touch When Controller Connected</strong><div class="muted">Cleaner screen for paired joypads.</div></div>
        <div class="actions"><button class="tiny-button" data-action="setting-toggle" data-setting="controllerHintsEnabled" type="button">${this.settings.controllerHintsEnabled ? "On" : "Off"}</button></div>
      </div>
      <div class="shop-row">
        <div><strong>Sound Effects</strong><div class="muted">Combat, movement, and UI feedback.</div></div>
        <div class="actions"><button class="tiny-button" data-action="setting-toggle" data-setting="soundEnabled" type="button">${this.settings.soundEnabled ? "On" : "Off"}</button></div>
      </div>
      <div class="shop-row">
        <div><strong>Music</strong><div class="muted">Optional soundtrack with title, town, and dungeon themes.</div></div>
        <div class="actions"><button class="tiny-button" data-action="setting-toggle" data-setting="musicEnabled" type="button">${this.settings.musicEnabled ? "On" : "Off"}</button></div>
      </div>
      <div class="shop-row">
        <div><strong>Effect Intensity</strong><div class="muted">Choose how animated combat and board effects should feel.</div></div>
        <div class="actions"><button class="tiny-button" data-action="setting-toggle" data-setting="effectIntensity" type="button">${this.settings.effectIntensity}</button></div>
      </div>
      <div class="shop-row">
        <div><strong>Reduced Motion</strong><div class="muted">Prefer simpler flashes over animated travel and pulsing effects.</div></div>
        <div class="actions"><button class="tiny-button" data-action="setting-toggle" data-setting="reducedMotionEnabled" type="button">${this.settings.reducedMotionEnabled ? "On" : "Off"}</button></div>
      </div>
      <div class="shop-row">
        <div><strong>UI Scale</strong><div class="muted">Alternate between compact and large mobile spacing.</div></div>
        <div class="actions"><button class="tiny-button" data-action="setting-toggle" data-setting="uiScale" type="button">${this.settings.uiScale}</button></div>
      </div>
    `, {
      surfaceKey: "settings",
      preserveScroll,
      focusTarget,
      fallbackFocus,
      closeLabel,
      modalReturnContext
    });
  }

  showCharacterSheet(options = {}) {
    if (!this.player) {
      return;
    }
    const {
      preserveScroll = false,
      focusTarget = null,
      fallbackFocus = true,
      closeLabel = "Close",
      modalReturnContext = null
    } = options;
    const player = this.player;
    const stats = this.getActorStats(player);
    const baseStats = player.stats || stats;
    const bonuses = this.getEquipmentStatBonuses(player);
    const hpRatio = player.maxHp > 0 ? player.hp / player.maxHp : 1;
    const manaRatio = player.maxMana > 0 ? player.mana / player.maxMana : 1;
    const burdenUi = this.getBurdenUiState();
    const expProgress = this.getLevelProgress(player);
    const [damageLow, damageHigh] = this.getDamageRange();
    const activeContract = this.getActiveContract(true) || this.getActiveContract(false);
    const conditionTags = [];
    if ((player.held || 0) > 0) {
      conditionTags.push(`Held ${player.held}`);
    }
    if ((player.slowed || 0) > 0) {
      conditionTags.push(`Slowed ${player.slowed}`);
    }
    if ((player.guardBrokenTurns || 0) > 0) {
      conditionTags.push(`Guard broken ${player.guardBrokenTurns}`);
    }
    if ((player.arcaneWardTurns || 0) > 0) {
      conditionTags.push(`Arcane ward ${player.arcaneWardTurns}`);
    }
    if ((player.resistFireTurns || 0) > 0) {
      conditionTags.push(`Fire ward ${player.resistFireTurns}`);
    }
    if ((player.resistColdTurns || 0) > 0) {
      conditionTags.push(`Cold ward ${player.resistColdTurns}`);
    }
    if ((player.lightBuffTurns || 0) > 0) {
      conditionTags.push(`Light ${player.lightBuffTurns}`);
    }
    if (burdenUi.state !== "safe") {
      conditionTags.push(burdenUi.label);
    }
    const attributeRows = [
      ["Strength", "str"],
      ["Dexterity", "dex"],
      ["Constitution", "con"],
      ["Intelligence", "int"]
    ].map(([label, key]) => {
      const base = baseStats[key] || 0;
      const effective = stats[key] || 0;
      const bonus = bonuses[key] || 0;
      const detail = bonus === 0
        ? `${base} base`
        : `${base} base, ${bonus > 0 ? "+" : ""}${bonus} gear`;
      return `
        <div class="character-sheet-row">
          <strong>${label}</strong>
          <span class="muted">${escapeHtml(detail)}</span>
          <span>${effective}</span>
        </div>
      `;
    }).join("");
    const combatRows = [
      ["Attack", this.getAttackValue()],
      ["Damage", `${damageLow}-${damageHigh}`],
      ["Armor", this.getArmorValue()],
      ["Evade", this.getEvadeValue()],
      ["Guard", this.getGuardValue()],
      ["Ward", this.getWardValue()]
    ].map(([label, value]) => `
      <div class="character-sheet-row">
        <strong>${escapeHtml(label)}</strong>
        <span class="muted">Current total</span>
        <span>${escapeHtml(String(value))}</span>
      </div>
    `).join("");
    const fieldRows = [
      ["Search", this.getSearchPower()],
      ["Move Speed", `${player.moveSpeed}%`],
      ["Light Radius", player.lightRadius],
      ["Fire Resist", this.getFireResistValue()],
      ["Cold Resist", this.getColdResistValue()],
      ["Load", `${burdenUi.weight} / ${burdenUi.capacity}`],
      ["Gold", `${player.gold} gp`],
      ["Spells Known", player.spellsKnown.length]
    ].map(([label, value]) => `
      <div class="character-sheet-row">
        <strong>${escapeHtml(label)}</strong>
        <span class="muted">Run state</span>
        <span>${escapeHtml(String(value))}</span>
      </div>
    `).join("");

    this.mode = "modal";
    this.showSimpleModal("Character Sheet", `
      <div class="character-sheet">
        <section class="character-sheet-hero">
          <div>
            <div class="field-label">Adventurer</div>
            <div class="character-sheet-name">${escapeHtml(player.name)}</div>
            <div class="character-sheet-subtitle">${escapeHtml(`${player.race} ${player.className}`)}</div>
            <div class="character-sheet-subtitle">${escapeHtml(`${this.currentDepth === 0 ? "Town" : `Depth ${this.currentDepth}`} | Level ${player.level} | Turn ${this.turn}`)}</div>
            <div class="character-sheet-subtitle">${escapeHtml(activeContract ? `Active contract: ${activeContract.name}` : "Active contract: none armed")}</div>
          </div>
          <div class="character-sheet-tags">
            ${conditionTags.length > 0
              ? conditionTags.map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("")
              : `<span class="pill">Stable</span>`}
          </div>
        </section>

        <section class="character-sheet-grid">
          <div class="rail-stat-pill tone-health">
            <span>Health</span>
            <strong>${Math.floor(player.hp)} / ${player.maxHp}</strong>
            <div class="rail-meter hp"><span style="width:${clamp(Math.round(hpRatio * 100), 0, 100)}%"></span></div>
            <div class="character-sheet-meter-note">${clamp(Math.round(hpRatio * 100), 0, 100)}% ready</div>
          </div>
          <div class="rail-stat-pill tone-mana">
            <span>Mana</span>
            <strong>${Math.floor(player.mana)} / ${player.maxMana}</strong>
            <div class="rail-meter mana"><span style="width:${clamp(Math.round(manaRatio * 100), 0, 100)}%"></span></div>
            <div class="character-sheet-meter-note">${clamp(Math.round(manaRatio * 100), 0, 100)}% reserve</div>
          </div>
          <div class="rail-stat-pill tone-meta">
            <span>Experience</span>
            <strong>${expProgress.exp} / ${expProgress.nextThreshold}</strong>
            <div class="rail-meter xp"><span style="width:${expProgress.percent}%"></span></div>
            <div class="character-sheet-meter-note">${expProgress.remaining} to next level</div>
          </div>
          <div class="rail-stat-pill tone-load burden-${burdenUi.state}">
            <span>Burden</span>
            <strong>${burdenUi.weight} / ${burdenUi.capacity}</strong>
            <div class="rail-meter burden burden-${burdenUi.state}"><span style="width:${burdenUi.percent}%"></span></div>
            <div class="character-sheet-meter-note">${escapeHtml(burdenUi.label)}</div>
          </div>
        </section>

        <section class="character-sheet-section">
          <div class="field-label">Attributes</div>
          <div class="character-sheet-card">
            ${attributeRows}
          </div>
        </section>

        <section class="character-sheet-columns">
          <div class="character-sheet-section">
            <div class="field-label">Combat</div>
            <div class="character-sheet-card">
              ${combatRows}
            </div>
          </div>
          <div class="character-sheet-section">
            <div class="field-label">Field</div>
            <div class="character-sheet-card">
              ${fieldRows}
            </div>
          </div>
        </section>
      </div>
    `, {
      surfaceKey: "character-sheet",
      preserveScroll,
      focusTarget,
      fallbackFocus,
      closeLabel,
      modalReturnContext
    });
  }

  toggleSetting(setting) {
    if (setting === "uiScale") {
      this.settings.uiScale = this.settings.uiScale === "compact" ? "large" : "compact";
      document.documentElement.dataset.uiScale = this.settings.uiScale;
    } else if (setting === "effectIntensity") {
      const order = ["minimal", "standard", "enhanced"];
      const currentIndex = order.indexOf(this.settings.effectIntensity || "standard");
      this.settings.effectIntensity = order[(currentIndex + 1) % order.length];
    } else {
      this.settings[setting] = !this.settings[setting];
    }
    this.audio.updateSettings(this.settings);
    saveSettings(this.settings);
    this.syncSurfaceMusic();
    if (setting === "musicEnabled" && this.settings.musicEnabled) {
      this.audio.resumeMusic();
    }
    this.refreshChrome();
    this.showSettingsModal({
      preserveScroll: true,
      focusTarget: `setting-toggle:${setting}`
    });
  }

  isTitleMusicSurface() {
    return !this.player && (
      this.mode === "title"
      || this.mode === "creation"
      || this.modalSurfaceKey === "title"
      || this.modalSurfaceKey === "creation"
      || this.modalSurfaceKey === "save-slots:load"
    );
  }

  getCurrentMusicTrack() {
    if (!this.settings.musicEnabled) {
      return "";
    }
    if (this.isTitleMusicSurface()) {
      return TITLE_SCREEN_ASSETS.music;
    }
    if (!this.player) {
      return "";
    }
    return this.currentDepth === 0 ? AMBIENT_MUSIC_ASSETS.town : AMBIENT_MUSIC_ASSETS.dungeon;
  }

  syncSurfaceMusic() {
    this.audio.syncMusic(this.getCurrentMusicTrack());
  }

  getMusicToggleLabel() {
    return this.audio.isMusicPlaying() ? "Mute Music" : "Play Music";
  }

  getMusicToggleNote() {
    return this.audio.isMusicPlaying()
      ? "Music is playing and will switch between title, town, and dungeon themes automatically."
      : "Music is available here, but it will stay off until you press Play Music.";
  }

  syncMusicToggleUi(root = this.modalRoot) {
    if (!(root instanceof HTMLElement)) {
      return;
    }
    const label = this.getMusicToggleLabel();
    const note = this.getMusicToggleNote();
    root.querySelectorAll("[data-role='title-music-toggle']").forEach((element) => {
      element.textContent = label;
      element.setAttribute("aria-pressed", this.audio.isMusicPlaying() ? "true" : "false");
    });
    root.querySelectorAll("[data-role='title-music-note']").forEach((element) => {
      element.textContent = note;
    });
  }

  toggleMusicPreference() {
    const shouldEnable = !this.audio.isMusicPlaying();
    this.settings.musicEnabled = shouldEnable;
    this.audio.updateSettings(this.settings);
    saveSettings(this.settings);
    this.syncSurfaceMusic();
    if (shouldEnable) {
      this.audio.resumeMusic();
    }
    this.syncMusicToggleUi();
    this.refreshChrome();
  }

  startTargetMode(options) {
    this.setModalVisibility(false);
    this.modalRoot.classList.add("hidden");
    this.modalRoot.innerHTML = "";
    this.pendingSpell = options.spellId || this.pendingSpell || null;
    if (options.type === "spell") {
      this.spellTrayOpen = true;
    }
    this.targetMode = {
      type: options.type,
      name: options.name,
      range: options.range || 8,
      allowFloor: options.allowFloor || false,
      spellId: options.spellId || "",
      targetingMode: options.targetingMode || "single",
      manaCost: options.manaCost || 0,
      overcast: Boolean(options.overcast),
      previewColor: options.previewColor || options.effectColor || "#ffd36b",
      effectColor: options.effectColor || "#ffd36b",
      projectileStyle: options.projectileStyle || "arcane",
      roleLabel: options.roleLabel || "spell",
      invalidReason: "",
      callback: options.callback,
      cursor: options.cursor || findInitialTargetCursor(this, options.range || 8)
    };
    const preview = this.getActiveSpellTargetPreview();
    if (preview) {
      this.targetMode.invalidReason = preview.reason || "";
    }
    this.mode = "target";
    this.log(`Set ${options.name}. Confirm to cast, cancel to abort.`, "warning");
    this.refreshChrome();
    this.render();
  }

  moveTargetCursor(dx, dy) {
    if (!this.targetMode) {
      return;
    }
    this.targetMode.cursor.x = clamp(this.targetMode.cursor.x + dx, 0, this.currentLevel.width - 1);
    this.targetMode.cursor.y = clamp(this.targetMode.cursor.y + dy, 0, this.currentLevel.height - 1);
    const preview = this.getActiveSpellTargetPreview();
    if (preview) {
      this.targetMode.invalidReason = preview.reason || "";
    }
    this.render();
  }

  confirmTargetSelection() {
    if (!this.targetMode) {
      return;
    }
    const cursor = { x: this.targetMode.cursor.x, y: this.targetMode.cursor.y };
    const spellPreview = this.getActiveSpellTargetPreview();
    if (this.targetMode.type === "spell" && spellPreview) {
      if (!spellPreview.valid) {
        this.targetMode.invalidReason = spellPreview.reason || "That cast is not ready.";
        this.render();
        return;
      }
      const callback = this.targetMode.callback;
      const targetActor = spellPreview.targetActor || actorAt(this.currentLevel, cursor.x, cursor.y);
      this.targetMode = null;
      this.mode = "game";
      this.setModalVisibility(false);
      this.refreshChrome();
      this.renderBoard();
      callback(targetActor, cursor, spellPreview);
      this.render();
      return;
    }
    const range = this.targetMode.range;
    const targetActor = actorAt(this.currentLevel, cursor.x, cursor.y);
    const withinRange = distance(this.player, cursor) <= range;
    const los = hasLineOfSight(this.currentLevel, this.player.x, this.player.y, cursor.x, cursor.y);
    if (!withinRange || !los) {
      this.log("That target is out of line or out of range.", "warning");
      return;
    }
    if (!this.targetMode.allowFloor && !targetActor) {
      this.log("No target stands on that square.", "warning");
      return;
    }
    const callback = this.targetMode.callback;
    this.targetMode = null;
    this.mode = "game";
    this.setModalVisibility(false);
    this.refreshChrome();
    this.renderBoard();
    callback(targetActor, cursor);
    this.render();
  }

  cancelTargetMode(options = {}) {
    if (!this.targetMode) {
      return;
    }
    const {
      silent = false,
      keepTrayOpen = false
    } = options;
    this.targetMode = null;
    this.mode = "game";
    this.setModalVisibility(false);
    if (!silent) {
      this.log("Targeting cancelled.", "warning");
    }
    if (keepTrayOpen) {
      this.spellTrayOpen = true;
    }
    this.refreshChrome();
    this.render();
  }

  triggerTrap(tile, x, y) {
    const sourceLevel = this.currentLevel;
    if (tile.hidden) {
      tile.hidden = false;
    }
    this.log("A trap clicks beneath your feet.", "bad");
    this.audio.play("trap");
    this.emitTelegraphPulse(x, y, "#ff8d73", 240);
    this.pulseScreen("rgba(110, 14, 14, 0.22)", 170, 0.14);
    switch (tile.trapEffect) {
      case "dart":
        this.damageActor({ name: "A poison dart" }, this.player, roll(2, 4));
        break;
      case "poison":
        this.damageActor({ name: "Hidden needles" }, this.player, roll(1, 4), "poison");
        this.player.constitutionLoss = Math.min(this.player.stats.con - 1, (this.player.constitutionLoss || 0) + 1);
        this.recalculateDerivedStats();
        this.log("Your Constitution is weakened by poison.", "bad");
        break;
      case "teleport": {
        const position = this.findSafeTile(this.currentLevel, 24);
        if (position) {
          this.player.x = position.x;
          this.player.y = position.y;
          this.addEffect({ type: "blink", x: position.x, y: position.y, color: "#ba8eff", duration: 180 });
          this.log("The trap whirls you elsewhere.", "bad");
        }
        break;
      }
      case "alarm":
        this.currentLevel.actors.forEach((monster) => { monster.alerted = 8; monster.sleeping = false; });
        this.log("The noise wakes the level.", "bad");
        break;
      case "arrow":
        this.damageActor({ name: "A spring bow" }, this.player, roll(2, 5));
        break;
      case "summon":
        if (this.summonMonsterNearWithCap(x, y, weightedMonster(this.currentDepth))) {
          this.log("A summoning glyph tears open beside you.", "bad");
        } else {
          this.log("The summoning glyph flares, but the floor cannot feed more bodies into the fight.", "warning");
        }
        break;
      case "trapdoor":
        if (this.currentDepth < this.levels.length - 1) {
          this.log("The floor gives way under you.", "bad");
          this.pulseScreen("rgba(94, 35, 8, 0.28)", 220, 0.18);
          this.currentDepth += 1;
          this.player.deepestDepth = Math.max(this.player.deepestDepth, this.currentDepth);
          this.currentLevel = this.levels[this.currentDepth];
          this.placePlayerAt(this.currentLevel.stairsUp.x, this.currentLevel.stairsUp.y);
        } else {
          this.damageActor({ name: "The collapsing floor" }, this.player, roll(2, 5));
        }
        break;
      default:
        break;
    }
    this.makeNoise(9, { x, y }, "trap");
    setTile(sourceLevel, x, y, tileDef("floor"));
  }

  useFountain(tile) {
    if (tile.featureUsed) {
      this.log("The fountain is dry.", "warning");
      return;
    }
    tile.featureUsed = true;
    if (this.floorResolved) {
      this.markGreedAction("fountain");
    }
    this.flashTile(this.player.x, this.player.y, "#8bcde9", 220, { alpha: 0.18 });
    switch (tile.featureEffect) {
      case "heal":
        this.player.hp = this.player.maxHp;
        this.log("Cool water restores your wounds.", "good");
        break;
      case "mana":
        this.player.mana = this.player.maxMana;
        this.log("Arcane strength returns at once.", "good");
        break;
      case "poison":
        this.player.constitutionLoss = Math.min(this.player.stats.con - 1, (this.player.constitutionLoss || 0) + 1);
        this.recalculateDerivedStats();
        this.log("The water was tainted. You feel weaker.", "bad");
        break;
      case "vision":
        revealAll(this.currentLevel);
        this.log("The dungeon map blooms in your mind.", "good");
        break;
      case "damage":
        this.damageActor({ name: "The cursed fountain" }, this.player, roll(2, 5), "magic");
        break;
      default:
        break;
    }
    this.makeNoise(4, this.player, "fountain");
  }

  useThrone(tile) {
    if (tile.featureUsed) {
      this.log("The throne no longer answers.", "warning");
      return;
    }
    tile.featureUsed = true;
    if (this.floorResolved) {
      this.markGreedAction("throne");
    }
    this.flashTile(this.player.x, this.player.y, "#d6aa5d", 220, { alpha: 0.18 });
    switch (tile.featureEffect) {
      case "gold":
        this.player.gold += randInt(50, 150);
        this.log("Hidden tribute spills from the throne.", "good");
        break;
      case "exp":
        this.player.exp += 60 + this.currentDepth * 10;
        this.checkLevelUp();
        this.log("Ancient memory sharpens your skill.", "good");
        break;
      case "curse":
        curseRandomCarriedItem(this.player);
        this.log("A malignant oath settles over your gear.", "bad");
        break;
      case "summon":
        this.summonNearbyMonster();
        this.log("The throne answers with hostility.", "bad");
        break;
      case "teleport":
        this.log("The throne rejects you and throws you elsewhere.", "bad");
        {
          const position = this.findSafeTile(this.currentLevel, 20);
          if (position) {
            this.player.x = position.x;
            this.player.y = position.y;
            this.addEffect({ type: "blink", x: position.x, y: position.y, color: "#ba8eff", duration: 180 });
          }
        }
        break;
      default:
        break;
    }
    this.makeNoise(7, this.player, "throne");
  }

  legacyPerformWaitUnused() {
    if (!this.player || this.mode !== "game") {
      return;
    }
    this.log(`${this.player.name} waits.`, "warning");
    this.audio.play("ui");
    this.makeNoise(3, this.player, "wait");
    this.endTurn();
  }

  legacyRestUntilSafeUnused() {
    if (!this.player || this.mode !== "game") {
      return;
    }
    let recovered = 0;
    let interrupted = false;
    for (let i = 0; i < 6; i += 1) {
      if (this.visibleEnemies().length > 0 || this.player.hp >= this.player.maxHp) {
        break;
      }
      if (this.makeNoise(4, this.player, "rest") > 0) {
        interrupted = true;
        break;
      }
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 1);
      this.player.mana = Math.min(this.player.maxMana, this.player.mana + 1);
      recovered += 1;
      this.endTurn(false);
    }
    this.log(interrupted ? "You try to rest, but the halls answer back." : recovered > 0 ? "You pause to recover your breath." : "You find no safe moment to rest.", interrupted ? "bad" : recovered > 0 ? "good" : "warning");
    this.render();
  }

  legacyVisibleEnemiesUnused() {
    return this.currentLevel.actors.filter((actor) => isVisible(this.currentLevel, actor.x, actor.y));
  }

  legacyMakeNoiseUnused(radius, source = this.player, reason = "noise") {
    if (!this.currentLevel || this.currentDepth === 0) {
      return 0;
    }
    let stirred = 0;
    this.currentLevel.actors.forEach((monster) => {
      const hears = distance(source, monster) <= radius || (distance(source, monster) <= radius + 2 && hasLineOfSight(this.currentLevel, source.x, source.y, monster.x, monster.y));
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
      this.log("Your pause carries through the halls. Something is moving.", "bad");
    }
    return stirred;
  }

  legacyCanMonsterMoveToUnused(monster, x, y) {
    if (!inBounds(this.currentLevel, x, y)) {
      return false;
    }
    if (this.player.x === x && this.player.y === y) {
      return false;
    }
    const tile = getTile(this.currentLevel, x, y);
    const canPhase = monster.abilities && monster.abilities.includes("phase");
    if (actorAt(this.currentLevel, x, y)) {
      return false;
    }
    return (tile.walkable || (canPhase && tile.kind === "wall")) && !(tile.kind === "secretDoor" && tile.hidden);
  }

  legacyFindRetreatStepUnused(monster) {
    const options = [];
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) {
          continue;
        }
        const nx = monster.x + dx;
        const ny = monster.y + dy;
        if (!this.canMonsterMoveTo(monster, nx, ny)) {
          continue;
        }
        options.push({
          x: nx,
          y: ny,
          score: distance({ x: nx, y: ny }, this.player) + (hasLineOfSight(this.currentLevel, nx, ny, this.player.x, this.player.y) ? 1 : 0)
        });
      }
    }
    options.sort((a, b) => b.score - a.score);
    return options[0] || null;
  }

  legacyCanChargeUnused(monster, dx, dy, distanceToPlayer) {
    if (!monster.abilities || !monster.abilities.includes("charge")) {
      return false;
    }
    if (distanceToPlayer < 2 || distanceToPlayer > 4) {
      return false;
    }
    if (!(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy))) {
      return false;
    }
    return hasLineOfSight(this.currentLevel, monster.x, monster.y, this.player.x, this.player.y);
  }

  legacyApplyChargeUnused(monster) {
    if (!monster.chargeWindup) {
      return false;
    }
    const { dx, dy } = monster.chargeWindup;
    monster.chargeWindup = null;
    for (let step = 0; step < 2; step += 1) {
      const nx = monster.x + dx;
      const ny = monster.y + dy;
      if (nx === this.player.x && ny === this.player.y) {
        this.log(`${monster.name} slams into you.`, "bad");
        this.attack(monster, this.player);
        return true;
      }
      if (!this.canMonsterMoveTo(monster, nx, ny)) {
        return false;
      }
      monster.x = nx;
      monster.y = ny;
    }
    return true;
  }

  legacyGetMonsterIntentUnused(monster) {
    if (monster.sleeping) {
      return { type: "sleep", symbol: "z", color: "#8ea3b5" };
    }
    if (monster.chargeWindup) {
      return { type: "charge", symbol: "»", color: "#ff9f6b" };
    }
    const dx = this.player.x - monster.x;
    const dy = this.player.y - monster.y;
    const distanceToPlayer = Math.max(Math.abs(dx), Math.abs(dy));
    const canSeePlayer = distanceToPlayer <= 9 && hasLineOfSight(this.currentLevel, monster.x, monster.y, this.player.x, this.player.y);
    if (distanceToPlayer <= 1) {
      return { type: "melee", symbol: "!", color: "#ff6f6f" };
    }
    if (monster.ranged && canSeePlayer && distanceToPlayer <= monster.ranged.range) {
      if (distanceToPlayer <= 2) {
        return { type: "retreat", symbol: "‹", color: "#9fd0ff" };
      }
      return { type: "shoot", symbol: "*", color: "#ffd46b" };
    }
    if (monster.spells && canSeePlayer && monster.mana >= 4) {
      if (monster.abilities && monster.abilities.includes("summon")) {
        return { type: "summon", symbol: "+", color: "#d6a8ff" };
      }
      return { type: "hex", symbol: "~", color: "#c9b6ff" };
    }
    if (canSeePlayer && this.canCharge(monster, dx, dy, distanceToPlayer)) {
      return { type: "charge", symbol: "»", color: "#ff9f6b" };
    }
    if (monster.alerted > 0) {
      return { type: "advance", symbol: "!", color: "#f2deb1" };
    }
    return null;
  }

  legacyUpdateMonsterIntentsUnused() {
    if (!this.currentLevel) {
      return;
    }
    this.currentLevel.actors.forEach((monster) => {
      monster.intent = this.getMonsterIntent(monster);
    });
  }

  legacyAttackUnused(attacker, defender) {
    const isPlayer = attacker.id === "player";
    const attackScore = isPlayer ? 10 + this.getAttackValue() + Math.floor(this.player.level / 2) : attacker.attack;
    const defenseScore = defender.id === "player" ? this.getEvadeValue() + this.getArmorValue() : defender.defense;
    const rollHit = randInt(1, 20) + attackScore;
    this.makeNoise(isPlayer ? 5 : 4, attacker, "combat");
    if (rollHit < 10 + defenseScore) {
      this.log(`${attacker.name} misses ${defender.name}.`, "warning");
      this.audio.play("ui");
      if (defender && typeof defender.x === "number" && typeof defender.y === "number") {
        this.flashTile(defender.x, defender.y, "#f2deb1", 100, { alpha: 0.1, decorative: true });
      }
      return false;
    }
    const damage = isPlayer ? roll(...this.getDamageRange()) : roll(...attacker.damage);
    this.damageActor(attacker, defender, damage, "physical");
    return true;
  }

  legacyDamageActorUnused(attacker, defender, amount, damageType = "physical") {
    defender.hp -= amount;
    this.audio.play(defender.id === "player" ? "bad" : "hit");
    this.emitImpact(attacker, defender, this.getDamageEffectColor(damageType, defender), damageType);
    if (defender.id === "player") {
      this.log(`${attacker.name} hits ${defender.name} for ${amount}.`, "bad");
      if (attacker.abilities && attacker.abilities.includes("drain") && Math.random() < 0.3) {
        this.player.constitutionLoss = Math.min(this.player.stats.con - 1, (this.player.constitutionLoss || 0) + 1);
        this.recalculateDerivedStats();
        this.log("A chill passes through you. Your Constitution is leeched away.", "bad");
      }
      if (defender.hp <= 0) {
        this.player.hp = 0;
        this.handleDeath();
      }
      return;
    }

    this.log(`${attacker.name} hits ${defender.name} for ${amount}.`, attacker.id === "player" ? "good" : "bad");
    if (defender.hp <= 0) {
      this.killMonster(defender);
    }
  }

  legacyKillMonsterUnused(monster) {
    removeFromArray(this.currentLevel.actors, monster);
    this.emitDeathBurst(monster.x, monster.y, monster.color || "#f2deb1");
    const gold = randInt(monster.gold[0], monster.gold[1]);
    if (gold > 0) {
      this.currentLevel.items.push({ x: monster.x, y: monster.y, kind: "gold", name: "Gold", amount: gold });
    }
    if (Math.random() < 0.42) {
      this.currentLevel.items.push({ ...rollTreasure(this.currentDepth), x: monster.x, y: monster.y });
    }
    this.player.exp += monster.exp;
    this.log(`${monster.name} dies.`, "good");
    this.audio.play("good");
    this.flashTile(monster.x, monster.y, "#f2deb1", 180, { alpha: 0.16 });
    this.checkLevelUp();
  }

  legacyCheckLevelUpUnused() {
    while (this.player.exp >= this.player.nextLevelExp) {
      this.player.level += 1;
      this.player.nextLevelExp = Math.floor(this.player.nextLevelExp * 1.58);
      this.player.stats.str += randInt(0, 1);
      this.player.stats.dex += randInt(0, 1);
      this.player.stats.con += randInt(0, 1);
      this.player.stats.int += randInt(0, 1);
      this.recalculateDerivedStats();
      this.player.hp = this.player.maxHp;
      this.player.mana = this.player.maxMana;
      this.log(`${this.player.name} reaches level ${this.player.level}.`, "good");
      this.pulseScreen("rgba(214, 170, 88, 0.18)", 240, 0.16);
      this.pendingSpellChoices += 1;
    }

    if (this.pendingSpellChoices > 0) {
      if (this.getLearnableSpellOptions().length > 0) {
        this.showSpellLearnModal();
      } else {
        this.log("No additional spells are available to learn at this level.", "warning");
        this.pendingSpellChoices = 0;
      }
    }
  }

  legacyHandleDeathUnused() {
    this.mode = "modal";
    this.showSimpleModal("Fallen", `
      <div class="text-block">
        ${escapeHtml(this.player.name)} has fallen in ${escapeHtml(this.currentLevel.description)}.<br><br>
        Use <strong>New Game</strong> to begin again.
      </div>
    `);
    this.render();
  }

  legacyResolveTurnUnused(advanceTurn = true) {
    if (advanceTurn) {
      this.turn += 1;
    }
    const encumbrance = getEncumbranceTier(this.player);
    const hpRegenBase = encumbrance >= 2 ? 0.01 : encumbrance === 1 ? 0.02 : 0.03;
    const manaRegenBase = encumbrance >= 2 ? 0.02 : encumbrance === 1 ? 0.04 : 0.06;
    const hpRegen = hpRegenBase + Math.max(0, this.player.stats.con - 10) * 0.004;
    const manaRegen = manaRegenBase + Math.max(0, this.player.stats.int - 10) * 0.006;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + hpRegen);
    this.player.mana = Math.min(this.player.maxMana, this.player.mana + manaRegen);
    this.processMonsters();
    if (encumbrance >= 2 && this.currentDepth > 0) {
      this.processMonsters();
    }
    if ((this.player.slowed || 0) > 0) {
      this.player.slowed -= 1;
    }
    this.updateFov();
    this.updateMonsterIntents();
    this.checkQuestState();
    this.render();
  }

  legacyEndTurnUnused(advanceTurn = true) {
    if (this.pendingSpellChoices > 0) {
      this.pendingTurnResolution = advanceTurn;
      this.render();
      return;
    }
    this.resolveTurn(advanceTurn);
  }

  legacyProcessMonstersUnused() {
    const level = this.currentLevel;
    level.actors.forEach((monster) => {
      if (monster.sleeping) {
        const wakes = distance(this.player, monster) <= 3 || (isVisible(level, monster.x, monster.y) && Math.random() < 0.55);
        if (wakes) {
          monster.sleeping = false;
          monster.alerted = 4;
        } else {
          return;
        }
      }
      if (monster.slowed) {
        monster.slowed -= 1;
        if (this.turn % 2 === 0) {
          return;
        }
      }
      const dx = this.player.x - monster.x;
      const dy = this.player.y - monster.y;
      const distanceToPlayer = Math.max(Math.abs(dx), Math.abs(dy));
      const canSeePlayer = distanceToPlayer <= 9 && hasLineOfSight(level, monster.x, monster.y, this.player.x, this.player.y);
      if (canSeePlayer) {
        monster.alerted = 6;
        monster.sleeping = false;
      } else if (monster.alerted > 0) {
        monster.alerted -= 1;
      }

      if (monster.chargeWindup) {
        this.applyCharge(monster);
        return;
      }

      if (distanceToPlayer <= 1) {
        this.attack(monster, this.player);
        return;
      }

      if (monster.ranged && canSeePlayer && distanceToPlayer <= monster.ranged.range) {
        if (distanceToPlayer <= 2) {
          const retreat = this.findRetreatStep(monster);
          if (retreat) {
            monster.x = retreat.x;
            monster.y = retreat.y;
            return;
          }
        }
        if (Math.random() < 0.55) {
          this.playProjectile(monster, this.player, monster.ranged.color);
          this.log(`${monster.name} launches a ranged attack.`, "bad");
          this.audio.play("hit");
          this.damageActor(monster, this.player, roll(...monster.ranged.damage));
          return;
        }
      }

      if (monster.spells && canSeePlayer && monster.mana >= 4 && Math.random() < 0.24) {
        monster.mana -= 4;
        this.emitCastCircle(monster.x, monster.y, monster.abilities && monster.abilities.includes("summon") ? "#d6a8ff" : "#c9a5ff");
        if (monster.abilities && monster.abilities.includes("slow") && Math.random() < 0.35) {
          this.log(`${monster.name} casts a crippling spell.`, "bad");
          this.playProjectile(monster, this.player, "#bfd9ff");
          this.player.slowed = Math.max(this.player.slowed || 0, 2);
        } else {
          this.log(`${monster.name} hurls dark magic.`, "bad");
          this.playProjectile(monster, this.player, "#c9a5ff");
          this.damageActor(monster, this.player, roll(2, 5) + this.currentDepth);
        }
        if (monster.abilities && monster.abilities.includes("summon") && Math.random() < 0.25) {
          if (this.summonMonsterNearWithCap(monster.x, monster.y, weightedMonster(this.currentDepth))) {
            this.log(`${monster.name} calls for aid from the dark.`, "bad");
          }
        }
        if (monster.abilities && monster.abilities.includes("teleport") && Math.random() < 0.2) {
          const position = this.findSafeTile(level, 12);
          if (position) {
            monster.x = position.x;
            monster.y = position.y;
            this.addEffect({ type: "blink", x: monster.x, y: monster.y, color: "#ba8eff", until: nowTime() + 180 });
          }
        }
        return;
      }

      if (canSeePlayer && this.canCharge(monster, dx, dy, distanceToPlayer) && Math.random() < 0.4) {
        monster.chargeWindup = { dx: Math.sign(dx), dy: Math.sign(dy) };
        this.emitTelegraphPulse(monster.x, monster.y, "#ff9f6b", 260);
        if (isVisible(level, monster.x, monster.y)) {
          this.log(`${monster.name} lowers itself for a brutal rush.`, "warning");
        }
        return;
      }

      let stepX = 0;
      let stepY = 0;
      if (monster.alerted > 0) {
        if (monster.tactic === "skirmish" && distanceToPlayer <= 4) {
          const retreat = this.findRetreatStep(monster);
          if (retreat) {
            monster.x = retreat.x;
            monster.y = retreat.y;
            return;
          }
        }
        if (monster.tactic === "pack" && distanceToPlayer <= 5) {
          const flankLeft = this.canMonsterMoveTo(monster, monster.x + Math.sign(dx), monster.y);
          const flankRight = this.canMonsterMoveTo(monster, monster.x, monster.y + Math.sign(dy));
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

      if (stepX === 0 && stepY === 0) {
        return;
      }

      const nx = monster.x + stepX;
      const ny = monster.y + stepY;
      if (nx === this.player.x && ny === this.player.y) {
        this.attack(monster, this.player);
        return;
      }
      if (this.canMonsterMoveTo(monster, nx, ny)) {
        monster.x = nx;
        monster.y = ny;
      }
    });
  }

  legacyUseStairsUnused(direction) {
    const tile = getTile(this.currentLevel, this.player.x, this.player.y);
    if (direction === "down") {
      if (tile.kind !== "stairDown") {
        this.log("There are no stairs leading down here.", "warning");
        this.render();
        return;
      }
      const nextDepth = this.currentDepth + 1;
      if (nextDepth >= this.levels.length) {
        this.log("No deeper path opens here.", "warning");
        return;
      }
      this.currentDepth = nextDepth;
      this.player.deepestDepth = Math.max(this.player.deepestDepth, this.currentDepth);
      this.currentLevel = this.levels[nextDepth];
      this.placePlayerAt(this.currentLevel.stairsUp.x, this.currentLevel.stairsUp.y);
      this.addEffect({ type: "blink", x: this.player.x, y: this.player.y, color: "#ffd36b", duration: 200 });
      this.flashTile(this.player.x, this.player.y, "#ffd36b", 180, { alpha: 0.16 });
      this.pulseScreen("rgba(255, 211, 107, 0.14)", 180, 0.14);
      this.triggerStoryBeat(`depth-${nextDepth}`);
      this.log(`You descend to ${this.currentLevel.description}.`, "warning");
      this.audio.play("stairs");
      this.saveGame({ silent: true });
      this.render();
      return;
    }

    if (tile.kind !== "stairUp") {
      this.log("There are no stairs leading up here.", "warning");
      this.render();
      return;
    }
    const nextDepth = this.currentDepth - 1;
    if (nextDepth < 0) {
      this.log("You are already in town.", "warning");
      return;
    }
    this.currentDepth = nextDepth;
    this.currentLevel = this.levels[nextDepth];
    this.placePlayerAt(this.currentLevel.stairsDown.x, this.currentLevel.stairsDown.y);
    this.addEffect({ type: "blink", x: this.player.x, y: this.player.y, color: "#8bcde9", duration: 200 });
    this.flashTile(this.player.x, this.player.y, "#8bcde9", 180, { alpha: 0.16 });
    this.pulseScreen("rgba(139, 205, 233, 0.14)", 180, 0.14);
    if (nextDepth === 0) {
      this.refreshShopState(true);
    }
    this.log(`You climb to ${this.currentLevel.description}.`, "warning");
    this.audio.play("stairs");
    this.saveGame({ silent: true });
    this.render();
  }

  triggerStoryBeat(key) {
    if (this.storyFlags[key]) {
      return;
    }
    this.storyFlags[key] = true;
    const beats = {
      "depth-1": "A cold draft whispers through the keep. Someone once fled these halls and did not make it out.",
      "depth-3": STORY_BEATS.depth3.entryText,
      "depth-4": "Scratched runes warn of a prisoner and a chapel below. The dungeon has more memory than mercy.",
      "depth-5": STORY_BEATS.depth5.entryText,
      "depth-7": STORY_BEATS.depth7.entryText
    };
    if (beats[key]) {
      this.log(beats[key], "warning");
    }
  }

  getPickupBurdenPreview(item) {
    const beforeWeight = getCarryWeight(this.player);
    const capacity = getCarryCapacity(this.player);
    const afterWeight = beforeWeight + (item.weight || 0);
    const beforeUi = this.getBurdenUiState(beforeWeight, capacity);
    const afterUi = this.getBurdenUiState(afterWeight, capacity);
    return {
      beforeWeight,
      afterWeight,
      capacity,
      beforeUi,
      afterUi,
      beforeTier: getEncumbranceTier(this.player),
      afterTier: afterWeight > capacity ? 2 : afterWeight > capacity * 0.75 ? 1 : 0
    };
  }

  showPickupPrompt(item, turnPending = false) {
    const burden = this.getPickupBurdenPreview(item);
    const equipTarget = item.slot ? this.getEquipmentSlotForItem(item) : null;
    const equipped = equipTarget?.targetSlot ? this.player.equipment[equipTarget.targetSlot] : null;
    const canQuickEquip = Boolean(item.slot && (item.kind === "weapon" || item.kind === "armor") && !equipTarget?.blockedByCurse && !(equipped && equipped.cursed));
    const compareNote = equipped
      ? `Currently worn: ${this.describeItemReadout(equipped)}`
      : equipTarget?.targetSlot
        ? `Open ${this.getPackSlotDefinition(equipTarget.targetSlot).label} slot.`
        : equipTarget?.blockedByCurse
          ? `All ${this.getPackSlotDefinition(item.slot).label.toLowerCase()} slots are locked by curses.`
      : item.slot
        ? `Open ${this.getPackSlotDefinition(item.slot).label} slot.`
        : "This item will sit in your pack.";
    const semanticEntry = buildInventoryItemSemantics(this, item, -1);
    const burdenLabel = burden.afterUi.state !== burden.beforeUi.state
      ? burden.afterUi.state === "overloaded"
        ? "This will overload your carry limit."
        : burden.afterUi.state === "danger"
          ? "This pushes you into danger burden."
          : burden.afterUi.state === "warning"
            ? "This pushes you into warning burden."
            : "This is still a safe load."
      : "This is heavy enough to deserve a quick check.";
    this.pendingPickupPrompt = {
      item,
      turnPending,
      canQuickEquip
    };
    this.mode = "modal";
    this.showSimpleModal("Burden Check", `
      <div class="pickup-triage">
        <div class="pickup-triage-summary">
          <div class="pickup-triage-title">${escapeHtml(getItemName(item))}</div>
          <div class="pickup-triage-note">${escapeHtml(describeItem(item))}</div>
        </div>
        ${this.getPackRowTagMarkup(semanticEntry)}
        <div class="pickup-triage-grid">
          <div class="mini-panel"><strong>Type</strong><br>${escapeHtml(item.slot ? this.getPackSlotDefinition(item.slot).label : classifyItem(item))}</div>
          <div class="mini-panel"><strong>Weight</strong><br>${item.weight || 0}</div>
          <div class="mini-panel"><strong>Burden</strong><br>${burden.beforeWeight} / ${burden.capacity}</div>
          <div class="mini-panel"><strong>After Take</strong><br><span class="burden-${burden.afterUi.state}">${burden.afterWeight} / ${burden.capacity}</span></div>
        </div>
        <div class="text-block pickup-triage-copy">
          ${escapeHtml(burdenLabel)}<br><br>
          ${escapeHtml(compareNote)}
        </div>
        <div class="modal-actions pickup-triage-actions">
          <button class="action-button primary" data-action="pickup-confirm" type="button">Take It</button>
          ${canQuickEquip ? `<button class="action-button" data-action="pickup-equip" type="button">Take + Equip</button>` : ""}
          <button class="action-button" data-action="pickup-cancel" type="button">Leave It</button>
        </div>
      </div>
    `);
  }

  finishPickupTurn(turnPending) {
    if (turnPending) {
      this.endTurn();
    } else {
      this.render();
    }
  }

  resolvePickupItem(item) {
    removeFromArray(this.currentLevel.items, item);
    if (handleObjectivePickup(this, item)) {
      this.flashTile(item.x, item.y, "#9fd0ff", 170, { alpha: 0.2, rise: true });
      this.emitReadout("Objective", item.x, item.y, "#b7f0ff", 480);
      this.audio.play("good");
      return;
    }
    this.flashTile(item.x, item.y, item.kind === "quest" ? "#b7f0ff" : "#8bcde9", 170, { alpha: 0.16, rise: true });
    this.emitReadout(item.kind === "quest" ? "Runestone" : "Loot", item.x, item.y, item.kind === "quest" ? "#b7f0ff" : "#8bcde9", 420);
    this.addItemToInventory(item);
    if (item.kind === "quest") {
      this.player.quest.hasRunestone = true;
      this.log("You recover the Runestone of the Winds.", "good");
    } else {
      this.log(`You pick up ${this.describeItemReadout(item)}.`, "good");
      this.audio.play("good");
    }
    if (this.currentDepth > 0 && this.floorResolved) {
      this.markGreedAction("loot");
    }
  }

  confirmPendingPickup(equipOnTake = false) {
    const prompt = this.pendingPickupPrompt;
    if (!prompt) {
      return;
    }
    const { item, turnPending, canQuickEquip } = prompt;
    this.pendingPickupPrompt = null;
    this.closeModal();
    if (!this.currentLevel.items.includes(item)) {
      this.finishPickupTurn(turnPending);
      return;
    }
    this.resolvePickupItem(item);
    if (equipOnTake && canQuickEquip) {
      const index = this.player.inventory.indexOf(item);
      if (index >= 0) {
        this.equipInventoryItem(index, { openHub: false });
      }
    }
    this.finishPickupTurn(turnPending);
  }

  cancelPendingPickup() {
    const prompt = this.pendingPickupPrompt;
    if (!prompt) {
      return;
    }
    const { turnPending, item } = prompt;
    this.pendingPickupPrompt = null;
    this.closeModal();
    this.log(`You leave ${getItemName(item)} on the ground.`, "warning");
    this.finishPickupTurn(turnPending);
  }

  pickupHere(silent = false, turnPending = false) {
    const items = itemsAt(this.currentLevel, this.player.x, this.player.y);
    if (items.length === 0) {
      if (!silent) {
        this.log("Nothing here to pick up.", "warning");
        this.render();
      }
      return false;
    }

    for (const item of items.slice()) {
      if (item.kind === "gold") {
        removeFromArray(this.currentLevel.items, item);
        const bonus = Object.values(this.player.equipment || {}).reduce((sum, equippedItem) => sum + (equippedItem?.goldBonus || 0), 0);
        const total = Math.round(item.amount * (1 + bonus));
        this.player.gold += total;
        this.flashTile(this.player.x, this.player.y, "#ebcf60", 160, { alpha: 0.18, rise: true });
        this.emitReadout(`+${total}g`, this.player.x, this.player.y, "#ebcf60", 420);
        this.log(`You collect ${total} gold.`, "good");
        this.audio.play("good");
        if (this.currentDepth > 0 && this.floorResolved) {
          this.markGreedAction("loot");
        }
        continue;
      }
      if (this.shouldPromptForPickup(item)) {
        this.showPickupPrompt(item, turnPending);
        this.render();
        return false;
      }
      this.resolvePickupItem(item);
    }
    this.render();
    return true;
  }

  addItemToInventory(item) {
    if (item) {
      item.markedForSale = Boolean(item.markedForSale);
    }
    this.player.inventory.push(item);
  }

  useInventoryItem(index) {
    const item = this.player.inventory[Number(index)];
    if (!item) {
      return;
    }
    if (item.kind === "weapon" || item.kind === "armor") {
      this.equipInventoryItem(index);
      return;
    }
    if (item.kind === "spellbook") {
      item.identified = true;
      if (!this.player.spellsKnown.includes(item.spell)) {
        this.player.spellsKnown.push(item.spell);
        this.addSpellToTrayIfSpace(item.spell);
        this.log(`You learn ${SPELLS[item.spell].name}.`, "good");
      } else {
        this.log("That spell is already known.", "warning");
      }
      removeAt(this.player.inventory, Number(index));
      this.recordTelemetry("item_used", {
        itemId: item.id || "spellbook",
        itemKind: item.kind,
        effect: "study",
        spellId: item.spell || ""
      });
      const nextSelection = this.getDefaultPackSelection(Number(index));
      this.showHubModal("pack", {
        selection: nextSelection,
        preserveScroll: true,
        focusTarget: nextSelection.type === "inventory"
          ? this.getPackItemFocusKey(nextSelection.value)
          : this.getPackSlotFocusKey(nextSelection.value)
      });
      this.render();
      return;
    }
    if (item.kind === "charged") {
      this.useChargedItem(index, item);
      return;
    }
    if (item.kind === "quest") {
      this.log("The runestone must be returned to town.", "warning");
      return;
    }

    switch (item.effect) {
      case "heal": {
        const before = this.player.hp;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + roll(2, 6));
        this.flashTile(this.player.x, this.player.y, "#8fdaa0", 190, { alpha: 0.18 });
        this.log(`You drink the potion and recover ${Math.round(this.player.hp - before)} hit points.`, "good");
        break;
      }
      case "mana": {
        const before = this.player.mana;
        this.player.mana = Math.min(this.player.maxMana, this.player.mana + roll(2, 5));
        this.flashTile(this.player.x, this.player.y, "#8bcde9", 190, { alpha: 0.18 });
        this.log(`Arcane strength returns: ${Math.round(this.player.mana - before)} mana restored.`, "good");
        break;
      }
      case "identify":
        {
          const count = this.identifyInventoryAndEquipment();
          this.log(count > 0 ? `The scroll identifies ${count} item${count === 1 ? "" : "s"}.` : "Everything you carry is already known.", "good");
        }
        break;
      case "mapping":
        revealAll(this.currentLevel);
        revealAllSecrets(this.currentLevel);
        this.log("A map unfurls across your thoughts.", "good");
        break;
      case "teleport": {
        const position = this.findSafeTile(this.currentLevel, 20);
        if (position) {
          this.player.x = position.x;
          this.player.y = position.y;
          this.addEffect({ type: "blink", x: position.x, y: position.y, color: "#ba8eff", duration: 180 });
          this.log("The scroll tears space and throws you elsewhere.", "good");
        }
        break;
      }
      case "removeCurse":
        this.log(this.removeCurses() > 0 ? "Sacred script breaks the curses on your belongings." : "The scroll finds no curse to break.", "good");
        break;
      case "runeReturn":
        if (!this.useRuneOfReturn({ source: "scroll" })) {
          return;
        }
        removeAt(this.player.inventory, Number(index));
        this.render();
        return;
        break;
      default:
        break;
    }
    this.recordTelemetry("item_used", {
      itemId: item.id || item.kind || "item",
      itemKind: item.kind || "consumable",
      effect: item.effect || ""
    });
    removeAt(this.player.inventory, Number(index));
    this.closeModal();
    this.endTurn();
  }

  useRuneOfReturn(options = {}) {
    const { source = "spell" } = options;
    if (!this.player || !this.levels || this.levels.length === 0) {
      return false;
    }

    if (this.currentDepth > 0) {
      if (this.mode === "modal") {
        this.closeModal();
      }
      const previousDepth = this.currentDepth;
      const previousLevel = this.currentLevel;
      this.log("The rune begins to answer. Hold fast for 5 turns.", "warning");
      for (let i = 0; i < 5; i += 1) {
        if (!this.player || this.isPlayerDead()) {
          return true;
        }
        const hpBefore = this.player.hp;
        this.endTurn();
        if (!this.player || this.isPlayerDead() || this.currentDepth === 0) {
          return true;
        }
        if (this.player.hp < hpBefore) {
          this.log("Pain breaks the rune's cadence. The return fails.", "bad");
          return true;
        }
      }
      this.currentDepth = 0;
      this.currentLevel = this.levels[0];
      if (previousLevel) {
        this.setTownReturnStingFromLevel(previousLevel, { depth: previousDepth });
      }
      this.placePlayerAt(this.currentLevel.start.x, this.currentLevel.start.y);
      this.addEffect({ type: "blink", x: this.player.x, y: this.player.y, color: "#8bcde9", duration: 200 });
      this.flashTile(this.player.x, this.player.y, "#8bcde9", 180, { alpha: 0.16 });
      this.pulseScreen("rgba(139, 205, 233, 0.14)", 180, 0.14);
      this.refreshShopState(true);
      this.log(source === "scroll" ? "The rune of return carries you safely back to town." : "The rune folds the dungeon away and returns you to town.", "good");
      this.recordTelemetry("returned_to_town", {
        source: source === "scroll" ? "rune_scroll" : "rune_spell",
        fromDepth: previousDepth,
        floorResolved: Boolean(previousLevel?.floorResolved),
        optionalTaken: Boolean(previousLevel?.floorOptional?.opened)
      });
      if (this.player.quest.hasRunestone) {
        this.checkQuestState();
      } else {
        this.maybeShowTownStoryScene();
      }
      return true;
    }

    const targetDepth = Math.max(0, Math.min(this.player.deepestDepth || 0, this.levels.length - 1));
    if (targetDepth <= 0) {
      this.log("The rune has nowhere deeper to return you yet.", "warning");
      return false;
    }

    this.currentDepth = targetDepth;
    this.currentLevel = this.levels[targetDepth];
    this.placePlayerAt(this.currentLevel.stairsUp.x, this.currentLevel.stairsUp.y);
    this.addEffect({ type: "blink", x: this.player.x, y: this.player.y, color: "#ffd36b", duration: 200 });
    this.flashTile(this.player.x, this.player.y, "#ffd36b", 180, { alpha: 0.16 });
    this.pulseScreen("rgba(255, 211, 107, 0.14)", 180, 0.14);
    this.triggerStoryBeat(`depth-${targetDepth}`);
    this.recordTelemetry("depth_entered", {
      depth: targetDepth,
      source: source === "scroll" ? "rune_scroll" : "rune_spell",
      objectiveId: this.currentLevel.floorObjective?.id || "",
      optionalId: this.currentLevel.floorOptional?.id || ""
    });
    this.recordChronicleEvent?.("floor_enter", { label: this.currentLevel.description });
    this.noteFloorIntro?.();
    this.log(`The rune answers your memory and returns you to ${this.currentLevel.description}.`, "good");
    return true;
  }

  useChargedItem(index, item) {
    if (!item.charges || item.charges <= 0) {
      this.log(`${getItemName(item)} is empty.`, "warning");
      return;
    }
    item.identified = true;
    switch (item.effect) {
      case "lightning":
        this.startTargetMode({
          type: "wand",
          name: getItemName(item, true),
          range: 8,
          callback: (target, cursor) => {
            if (!target) {
              return;
            }
            item.charges -= 1;
            this.emitCastCircle(this.player.x, this.player.y, "#b9d2ff");
            this.playProjectile(this.player, cursor, "#b9d2ff");
            this.log(`Lightning leaps from ${getItemName(item, true)}.`, "good");
            this.recordTelemetry("item_used", {
              itemId: item.id || "charged",
              itemKind: item.kind,
              effect: item.effect || "",
              targetId: target.id || ""
            });
            this.damageActor(this.player, target, roll(3, 6) + 2);
            this.closeModal();
            this.endTurn();
          }
        });
        break;
      case "slow":
        this.startTargetMode({
          type: "wand",
          name: getItemName(item, true),
          range: 8,
          callback: (target, cursor) => {
            if (!target) {
              return;
            }
            item.charges -= 1;
            target.slowed = Math.max(target.slowed || 0, 6);
            this.emitCastCircle(this.player.x, this.player.y, "#bfe3ff");
            this.playProjectile(this.player, cursor, "#bfe3ff");
            this.log(`${target.name} is slowed by a pale beam.`, "good");
            this.recordTelemetry("item_used", {
              itemId: item.id || "charged",
              itemKind: item.kind,
              effect: item.effect || "",
              targetId: target.id || ""
            });
            this.closeModal();
            this.endTurn();
          }
        });
        break;
      case "staffHeal":
        item.charges -= 1;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + roll(4, 6));
        this.emitCastCircle(this.player.x, this.player.y, "#8fdaa0");
        this.flashTile(this.player.x, this.player.y, "#8fdaa0", 180, { alpha: 0.18 });
        this.log("Healing power flows from the staff.", "good");
        this.audio.play("cast");
        this.recordTelemetry("item_used", {
          itemId: item.id || "charged",
          itemKind: item.kind,
          effect: item.effect || ""
        });
        this.closeModal();
        this.endTurn();
        break;
      default:
        return;
    }
  }

  equipInventoryItem(index, options = {}) {
    const item = this.player.inventory[Number(index)];
    if (!item || !(item.kind === "weapon" || item.kind === "armor")) {
      return;
    }
    const { openHub = true } = options;
    const equipTarget = this.getEquipmentSlotForItem(item);
    const existing = equipTarget.targetSlot ? this.player.equipment[equipTarget.targetSlot] : null;
    if (equipTarget.blockedByCurse || (existing && existing.cursed)) {
      const blockedItem = existing || equipTarget.entries.find((entry) => entry.item?.cursed)?.item || null;
      if (blockedItem) {
        blockedItem.identified = true;
      }
      this.log(`${getItemName(blockedItem, true)} is cursed and will not come off.`, "bad");
      if (openHub) {
        this.showHubModal("pack", {
          selection: { type: "slot", value: equipTarget.entries.find((entry) => entry.item?.cursed)?.slot || equipTarget.entries[0]?.slot || item.slot },
          preserveScroll: true,
          focusTarget: this.getPackActionFocusKey("use", Number(index))
        });
      }
      this.render();
      return;
    }
    if (existing) {
      existing.markedForSale = false;
      this.player.inventory.push(existing);
    }
    if (!equipTarget.targetSlot) {
      return;
    }
    this.player.equipment[equipTarget.targetSlot] = item;
    item.identified = true;
    item.markedForSale = false;
    removeAt(this.player.inventory, Number(index));
    this.recalculateDerivedStats();
    this.log(`You equip ${getItemName(item, true)}.${item.cursed ? " It bites into you with a cursed grip." : ""}`, item.cursed ? "bad" : "good");
    if (openHub) {
      this.showHubModal("pack", {
        selection: { type: "slot", value: equipTarget.targetSlot },
        preserveScroll: true,
        focusTarget: this.getPackActionFocusKey("unequip", equipTarget.targetSlot)
      });
    }
    this.render();
  }

  dropInventoryItem(index) {
    const item = this.player.inventory[Number(index)];
    if (!item) {
      return;
    }
    item.x = this.player.x;
    item.y = this.player.y;
    item.markedForSale = false;
    this.currentLevel.items.push(item);
    removeAt(this.player.inventory, Number(index));
    this.log(`You drop ${getItemName(item, true)}.`, "warning");
    const nextSelection = this.getDefaultPackSelection(Number(index));
    this.showHubModal("pack", {
      selection: nextSelection,
      preserveScroll: true,
      focusTarget: nextSelection.type === "inventory"
        ? this.getPackItemFocusKey(nextSelection.value)
        : this.getPackSlotFocusKey(nextSelection.value)
    });
    this.render();
  }

  toggleInventorySaleMark(index, forcedValue = null) {
    const item = this.player.inventory[Number(index)];
    if (!item) {
      return;
    }
    if (item.kind === "quest") {
      this.log("Quest items cannot be marked for sale.", "warning");
      return;
    }
    const nextValue = typeof forcedValue === "boolean" ? forcedValue : !item.markedForSale;
    if (item.markedForSale === nextValue) {
      return;
    }
    item.markedForSale = nextValue;
    this.log(`${getItemName(item, true)} ${item.markedForSale ? "marked for sale" : "removed from the sale pile"}.`, item.markedForSale ? "good" : "warning");
    if (this.mode === "modal" && this.activeHubTab === "pack") {
      this.showHubModal("pack", {
        selection: { type: "inventory", value: Number(index) },
        preserveScroll: true,
        focusTarget: this.getPackActionFocusKey("mark", Number(index))
      });
    } else if (this.mode === "modal" && this.pendingShop) {
      this.showShopModal(this.pendingShop.id, this.pendingShop, {
        preserveScroll: true,
        focusTarget: this.getShopSellFocusKey(Number(index)),
        panel: "sell"
      });
    } else {
      this.render();
    }
  }

  unequipSlot(slot) {
    const item = this.player.equipment[slot];
    if (!item) {
      return;
    }
    if (item.cursed) {
      item.identified = true;
      this.log(`${getItemName(item, true)} is cursed and will not come off.`, "bad");
      this.showHubModal("pack", {
        selection: { type: "slot", value: slot },
        preserveScroll: true,
        focusTarget: this.getPackActionFocusKey("unequip", slot)
      });
      this.render();
      return;
    }
    this.player.equipment[slot] = null;
    item.markedForSale = false;
    this.player.inventory.push(item);
    this.recalculateDerivedStats();
    this.log(`You stow ${getItemName(item, true)} in your pack.`, "good");
    this.showHubModal("pack", {
      selection: { type: "inventory", value: this.player.inventory.length - 1 },
      preserveScroll: true,
      focusTarget: this.getPackItemFocusKey(this.player.inventory.length - 1)
    });
    this.render();
  }

  prepareSpell(spellId) {
    const spell = SPELLS[spellId];
    if (!spell) {
      return;
    }
    this.pendingSpell = spellId;
    this.spellTrayOpen = true;
    const spellCost = getSpellCost(this, spell);
    const overcast = this.player.mana < spellCost;
    if (this.player.mana < spellCost) {
      const shortage = Math.max(0, getOvercastLoss(this, spellCost - this.player.mana) - this.getOvercastRelief());
      if (this.player.stats.con - (this.player.constitutionLoss || 0) <= shortage) {
        this.log("You lack the strength to overcast that spell safely.", "warning");
        return;
      }
      this.player.constitutionLoss += shortage;
      this.player.mana = 0;
      this.recalculateDerivedStats();
      this.log(`You overcast ${spell.name} and lose ${shortage} Constitution.`, "bad");
    } else {
      this.player.mana -= spellCost;
    }
    if (spell.target === "self") {
      this.emitCastCircle(this.player.x, this.player.y, spell.effectColor || "#ffca73");
      this.emitCastFlare(this.player.x, this.player.y, spell.effectColor || "#ffca73", this.getSpellProjectileStyle(spell));
      if (spell.cast(this, this.player)) {
        this.recordTelemetry("spell_cast", {
          spellId,
          overcast
        });
        this.audio.play("cast");
        this.spellTrayOpen = false;
        if (spell.id === "runeOfReturn") {
          this.render();
          return;
        }
        this.closeModal();
        this.endTurn();
      }
      return;
    }
    this.startTargetMode({
      type: "spell",
      name: spell.name,
      range: spell.range || 8,
      allowFloor: Boolean(spell.allowFloorTarget),
      spellId,
      targetingMode: this.getSpellTargetingMode(spell),
      manaCost: spellCost,
      overcast,
      previewColor: spell.previewColor || spell.effectColor || "#ffca73",
      effectColor: spell.effectColor || "#ffca73",
      projectileStyle: this.getSpellProjectileStyle(spell),
      roleLabel: this.getSpellRoleLabel(spell),
      callback: (target, cursor, preview = null) => {
        this.emitCastCircle(this.player.x, this.player.y, spell.effectColor || "#ffca73");
        this.emitCastFlare(this.player.x, this.player.y, spell.effectColor || "#ffca73", this.getSpellProjectileStyle(spell));
        if (target || spell.allowFloorTarget) {
          const projectileTarget = preview?.center || cursor;
          this.playProjectile(this.player, projectileTarget, spell.effectColor || "#ffca73", {
            style: this.getSpellProjectileStyle(spell)
          });
        }
        spell.cast(this, this.player, target || cursor, preview);
        this.recordTelemetry("spell_cast", {
          spellId,
          overcast,
          targetId: target?.id || "",
          hitCount: preview?.hitCount || (target ? 1 : 0)
        });
        this.audio.play("cast");
        this.spellTrayOpen = false;
        this.closeModal();
        this.endTurn();
      }
    });
  }

  openTownService(service) {
    if (this.currentDepth !== 0) {
      return;
    }
    this.refreshShopState();
    this.recordTownServiceOpen(service);
    this.completeTownServiceTutorial(service);
    if (service === "bank") {
      if (!this.storyFlags.bankPromptShown) {
        this.storyFlags.bankPromptShown = true;
        this.log("The bank turns spare gold into intel, funded upgrades, and cleaner next-floor prep.", "good");
      }
      this.showBankModal();
      return;
    }
    if (service === "sage") {
      this.showSageModal();
      return;
    }
    if (service === "temple") {
      this.showTempleModal();
      return;
    }
    const shop = SHOPS[service];
    if (!shop) {
      return;
    }
    this.showShopModal(service, shop);
  }

  buyShopItem(shopId, itemId) {
    const item = createTownItem(itemId);
    const price = getShopBuyPrice(this, item, shopId);
    if (this.player.gold < price) {
      this.log("You cannot afford that.", "warning");
      return;
    }
    this.player.gold -= price;
    this.addItemToInventory(item);
    this.recordTelemetry("shop_buy", {
      shopId,
      itemId,
      itemKind: item.kind || "",
      price
    });
    const shop = this.shopState[shopId];
    if (shop) {
      removeOne(shop.stock, itemId);
    }
    this.log(`Purchased ${getItemName(item, true)} for ${price} gold.`, "good");
    this.showShopModal(shopId, SHOPS[shopId], {
      preserveScroll: true,
      focusTarget: this.getShopBuyFocusKey(shopId, itemId),
      panel: "buy"
    });
    this.render();
  }

  sellShopItem(index) {
    const item = this.player.inventory[Number(index)];
    if (!item) {
      return;
    }
    if (this.pendingShop && this.pendingShop.id !== "junk" && !shopAcceptsItem(this.pendingShop.id, item)) {
      this.log(`${this.pendingShop.name} refuses to buy that item type.`, "warning");
      return;
    }
    const price = getShopSellPrice(this, item, this.pendingShop?.id || "");
    this.player.gold += price;
    item.identified = true;
    this.recordTelemetry("shop_sell", {
      shopId: this.pendingShop?.id || "unknown",
      itemId: item.id || item.kind || "item",
      itemKind: item.kind || "",
      price
    });
    if (this.pendingShop && this.pendingShop.id !== "junk") {
      this.shopState[this.pendingShop.id].buyback.unshift(item.id);
      this.shopState[this.pendingShop.id].buyback = this.shopState[this.pendingShop.id].buyback.slice(0, 8);
    }
    removeAt(this.player.inventory, Number(index));
    this.log(`Sold ${getItemName(item, true)} for ${price} gold.`, "good");
    if (this.pendingShop) {
      this.showShopModal(this.pendingShop.id, this.pendingShop, {
        preserveScroll: true,
        focusTarget: this.getShopSellFocusKey(Number(index)),
        panel: "sell"
      });
    } else {
      this.closeModal();
    }
    this.render();
  }

  sellMarkedItems() {
    if (!this.pendingShop) {
      return;
    }
    const sellableEntries = this.player.inventory
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item?.markedForSale)
      .filter(({ item }) => this.pendingShop.id === "junk" || shopAcceptsItem(this.pendingShop.id, item));
    if (sellableEntries.length === 0) {
      this.log("Nothing marked for sale matches this shop.", "warning");
      return;
    }
    let totalGold = 0;
    sellableEntries
      .sort((a, b) => b.index - a.index)
      .forEach(({ item, index }) => {
        const price = getShopSellPrice(this, item, this.pendingShop?.id || "");
        totalGold += price;
        this.player.gold += price;
        item.identified = true;
        item.markedForSale = false;
        this.recordTelemetry("shop_sell", {
          shopId: this.pendingShop?.id || "unknown",
          itemId: item.id || item.kind || "item",
          itemKind: item.kind || "",
          price
        });
        if (this.pendingShop.id !== "junk") {
          this.shopState[this.pendingShop.id].buyback.unshift(item.id);
          this.shopState[this.pendingShop.id].buyback = this.shopState[this.pendingShop.id].buyback.slice(0, 8);
        }
        removeAt(this.player.inventory, index);
      });
    this.log(`Sold ${sellableEntries.length} marked item${sellableEntries.length === 1 ? "" : "s"} for ${totalGold} gold.`, "good");
    this.showShopModal(this.pendingShop.id, this.pendingShop, {
      preserveScroll: true,
      focusTarget: "shop:sell-marked",
      panel: "sell"
    });
    this.render();
  }

  handleBank(mode) {
    if (mode === "deposit") {
      const amount = Math.min(100, this.player.gold);
      if (amount <= 0) {
        this.log("You have no gold to deposit.", "warning");
        return;
      }
      this.player.gold -= amount;
      this.player.bankGold += amount;
      this.log(`Deposited ${amount} gold.`, "good");
    } else {
      const amount = Math.min(100, this.player.bankGold);
      if (amount <= 0) {
        this.log("Nothing remains on account.", "warning");
        return;
      }
      this.player.bankGold -= amount;
      this.player.gold += amount;
      this.log(`Withdrew ${amount} gold.`, "good");
    }
    this.showBankModal({
      preserveScroll: true,
      focusTarget: this.getTownActionFocusKey(mode === "deposit" ? "deposit" : "withdraw")
    });
    this.render();
  }

  refreshShopState(force = false) {
    return this.syncTownCycle(force, this.currentDepth === 0 && !force);
  }

  getTownCycleState(turn = this.turn) {
    return getTownCycleMeta(this, turn);
  }

  getTownCycleLabel(turn = this.turn) {
    return formatTownCycle(this.getTownCycleState(turn));
  }

  getTownPrepAdvice() {
    const unknownCount = countUnknownItems(this.player);
    const affordableUnlock = getAvailableTownUnlocks(this).find((unlockDef) => this.player.gold >= unlockDef.cost);
    const canBuyRumor = (this.player.runCurrencies?.rumorTokens || 0) > 0 || this.player.gold >= getRumorPrice(this);
    const intent = this.getNextRunIntent();
    const nextRunFocus = intent.primaryGoal?.label || this.getNextRunFocusLines().find(Boolean) || "";
    if (this.storyFlags?.postReturnBankPrompt) {
      return nextRunFocus || "Bank first. Review your last return, arm a contract if needed, then decide whether this adventurer goes back north.";
    }
    if (this.player.constitutionLoss > 0 || this.player.hp < this.player.maxHp || this.player.mana < this.player.maxMana) {
      return "Temple first if you want a clean second descent. Recovery preserves more value than gambling on a weak re-entry.";
    }
    if (unknownCount > 0) {
      return `Sage value is live. ${unknownCount} unknown item${unknownCount === 1 ? "" : "s"} could clarify your next equip or buy.`;
    }
    if (affordableUnlock) {
      return `You can already fund ${affordableUnlock.name}. That is the cleanest long-term conversion for spare town gold.`;
    }
    if (canBuyRumor) {
      return "Buy intel before heading north again. Objective and theme knowledge cut more dead turns than a blind roam.";
    }
    return "North road remains the critical path. Convert value quickly, then get back into the keep.";
  }

  applyRunContractWorldModifiers(activeContract = this.getActiveContract(true)) {
    if (!activeContract || !this.player) {
      return;
    }
    if (activeContract.id === "pressed_descent") {
      this.levels.slice(1).forEach((level, index) => {
        if (!level || level.kind !== "dungeon") {
          return;
        }
        const pressureCut = index === 0 ? 8 : 4;
        level.reinforcementClock = Math.max(10, (level.reinforcementClock || 18) - pressureCut);
      });
      return;
    }
    if (activeContract.id === "scholar_road" || activeContract.id === "route_debt") {
      this.levels.slice(1).forEach((level) => {
        if (!level?.guidance) {
          return;
        }
        const revealBonus = activeContract.id === "route_debt" ? 6 : 4;
        level.guidance.searchRevealChunk = Math.max(level.guidance.searchRevealChunk || 0, (level.guidance.searchRevealChunk || 0) + revealBonus);
      });
      if (activeContract.id === "route_debt") {
        this.grantRumorToken?.(1);
      }
      this.player.maxHp = Math.max(10, this.player.maxHp - (activeContract.id === "route_debt" ? 5 : 4));
      this.player.hp = Math.min(this.player.hp, this.player.maxHp);
      return;
    }
    if (activeContract.id === "ration_run") {
      this.addItemToInventory(createTownItem("healingPotion"));
      this.addItemToInventory(createTownItem("mappingScroll"));
      return;
    }
    if (activeContract.id === "sealed_return") {
      this.addItemToInventory(createTownItem("runeScroll"));
      this.grantRumorToken?.(1);
      this.player.maxHp = Math.max(10, this.player.maxHp - 3);
      this.player.hp = Math.min(this.player.hp, this.player.maxHp);
      return;
    }
    if (activeContract.id === "last_light") {
      this.addItemToInventory(createTownItem("healingPotion"));
      this.addItemToInventory(createTownItem("manaPotion"));
      this.addItemToInventory(createTownItem("torchCharm"));
    }
  }

  getAvailableContracts() {
    return getAvailableContracts(this);
  }

  getContractViewModel() {
    return getContractViewModel(this);
  }

  getActiveContract(useCurrentRun = false) {
    return getActiveContract(this, useCurrentRun);
  }

  getClassMasterySummary(classId = this.player?.classId || this.selectedClass) {
    return getClassMasterySummary(this, classId);
  }

  getClassMasteryViewModel(classId = this.player?.classId || this.selectedClass) {
    return getClassMasteryViewModel(this, classId);
  }

  getCreationPersistencePreview(classId = this.selectedClass) {
    return getCreationPersistencePreview(this, classId);
  }

  getRecommendedContract() {
    return getRecommendedContract(this);
  }

  getAvailableCommendations() {
    return getAvailableCommendations(this);
  }

  getDurableTownUnlocks() {
    return getDurableTownUnlocks(this);
  }

  getCampaignArchive(limit = 5) {
    return getCampaignArchive(this, limit);
  }

  getPersistenceArchive(limit = 5) {
    if (Array.isArray(this.runSummaryHistory) && this.runSummaryHistory.length > 0) {
      return [...this.runSummaryHistory].slice(-limit).reverse();
    }
    return this.getCampaignArchive(limit);
  }

  getLatestPersistenceSummary() {
    return this.getPersistenceArchive(1)[0] || this.lastRunSummary || null;
  }

  getTownCarryForwardSummary() {
    const unlocks = Object.values(TOWN_UNLOCK_DEFS).filter((unlockDef) => this.getDurableTownUnlocks()[unlockDef.id]);
    if (unlocks.length === 0) {
      return "Town improvements carried forward: none yet.";
    }
    const names = unlocks.map((unlockDef) => unlockDef.name);
    return `Town improvements carried forward: ${names.join(", ")}.`;
  }

  getNextRunIntent(classId = this.player?.classId || this.selectedClass) {
    const durableTownUnlocks = this.getDurableTownUnlocks();
    const nextTownUnlock = getAvailableTownUnlocks(this)[0] || null;
    const onHand = Math.floor(this.player?.gold || 0);
    const contractModel = this.getContractViewModel();
    const recommendedContract = contractModel.all.find((contract) => contract.id === contractModel.recommendedId) || null;
    const mastery = this.getClassMasteryViewModel(classId);
    const commendationGoal = getNextCommendationGoal(this, classId);
    const motivators = [];

    if (nextTownUnlock) {
      const gap = Math.max(0, nextTownUnlock.cost - onHand);
      motivators.push({
        type: "town",
        label: gap === 0
          ? `Fund ${nextTownUnlock.name} now.`
          : `${gap} gp funds ${nextTownUnlock.name}.`,
        detail: nextTownUnlock.description
      });
    } else {
      const fundedCount = Object.values(durableTownUnlocks).filter(Boolean).length;
      motivators.push({
        type: "town",
        label: fundedCount > 0 ? "All current town projects are funded." : "Fund the first town project when you can.",
        detail: this.getTownCarryForwardSummary()
      });
    }

    if (recommendedContract) {
      motivators.push({
        type: "contract",
        label: recommendedContract.active
          ? `${recommendedContract.name} is already armed.`
          : recommendedContract.unlocked
            ? `Arm ${recommendedContract.name}.`
            : `${recommendedContract.name} stays locked.`,
        detail: recommendedContract.active || recommendedContract.unlocked
          ? (recommendedContract.recommendationReason || recommendedContract.description)
          : recommendedContract.unlockHint
      });
    }

    motivators.push({
      type: mastery.nextReward ? "mastery" : "commendation",
      label: mastery.nextReward
        ? `${mastery.className}: ${mastery.nextReward.triggerLabel} unlocks ${mastery.nextReward.name}.`
        : commendationGoal.text,
      detail: mastery.nextReward
        ? mastery.nextReward.description
        : (COMMENDATION_DEFS[commendationGoal.id]?.summary || "Current commendation set is complete.")
    });

    let cta = {
      actionId: "bank",
      label: "Review Bank Plan",
      text: "Review the bank plan before the next descent.",
      progressText: motivators[0]?.label || ""
    };
    if (nextTownUnlock && onHand >= nextTownUnlock.cost) {
      cta = {
        actionId: `town_unlock:${nextTownUnlock.id}`,
        label: `Fund ${nextTownUnlock.name}`,
        text: `Fund ${nextTownUnlock.name} now.`,
        progressText: nextTownUnlock.description
      };
    } else if (recommendedContract?.unlocked && !recommendedContract.active) {
      cta = {
        actionId: "contract_recommended",
        label: `Arm ${recommendedContract.name}`,
        text: `Arm ${recommendedContract.name} before the next run.`,
        progressText: recommendedContract.recommendationReason || recommendedContract.description
      };
    } else if ((this.player?.runCurrencies?.rumorTokens || 0) > 0 || onHand >= getRumorPrice(this)) {
      cta = {
        actionId: "town_rumor",
        label: (this.player?.runCurrencies?.rumorTokens || 0) > 0 ? "Spend Rumor Token" : "Buy Intel",
        text: "Secure next-floor intel before heading north again.",
        progressText: getTownIntel(this).nextRumor?.text || "No clear rumor posted for the next floor."
      };
    }

    return {
      primaryGoal: motivators[0] || null,
      secondaryGoal: motivators[1] || null,
      tertiaryGoal: motivators[2] || null,
      motivators: motivators.slice(0, 3),
      cta,
      progressText: motivators.map((entry) => entry.label).join(" | ")
    };
  }

  getLatestPermanentUnlock() {
    const latest = this.getLatestPersistenceSummary();
    const changes = Array.isArray(latest?.persistentChanges) ? latest.persistentChanges : [];
    return changes[0] || null;
  }

  describePersistentChanges(summary) {
    const changes = Array.isArray(summary?.persistentChanges) ? summary.persistentChanges : [];
    return changes.length > 0 ? changes.join(", ") : "No permanent change recorded.";
  }

  getNextRunFocusLines(classId = this.player?.classId || this.selectedClass) {
    if (!classId) {
      return [];
    }
    return this.getNextRunIntent(classId).motivators
      .map((entry) => [entry?.label, entry?.detail].filter(Boolean).join(" "))
      .filter(Boolean)
      .slice(0, 3);
  }

  getNextRunFocusMarkup(options = {}) {
    const {
      label = "One More Run",
      classId = this.player?.classId || this.selectedClass
    } = options;
    const lines = this.getNextRunFocusLines(classId);
    if (lines.length === 0) {
      return `
        <div class="section-block">
          <div class="field-label">${escapeHtml(label)}</div>
          <div class="text-block muted">No next-run goals are surfaced yet.</div>
        </div>
      `;
    }
    return `
      <div class="section-block">
        <div class="field-label">${escapeHtml(label)}</div>
        <div class="text-block">${lines.map((line) => escapeHtml(line)).join("<br><br>")}</div>
      </div>
    `;
  }

  getRunSummaryArchiveMarkup(limit = 5) {
    const summaries = this.getPersistenceArchive(limit);
    if (summaries.length === 0) {
      return "<div class='text-block muted'>No return archive recorded yet.</div>";
    }
    return summaries.map((summary) => `
      <div class="section-block">
        <div class="stat-line"><span>${escapeHtml(summary.outcome === "death" ? "Death" : "Return")}</span><strong>Depth ${summary.extractedDepth}</strong></div>
        <div class="text-block">
          Objective: ${escapeHtml(summary.firstObjectiveType || "unknown")}<br>
          Greed: ${summary.greedCount} | Elite kills: ${summary.eliteKills || 0} | Value: ${summary.returnValue} gp<br>
          ${escapeHtml(this.describePersistentChanges(summary))}
        </div>
      </div>
    `).join("");
  }

  getMasteryReviewMarkup(classId = this.player?.classId || this.selectedClass) {
    const mastery = this.getClassMasteryViewModel(classId);
    return `
      <div class="text-block">
        ${escapeHtml(`Class-based. Permanent. Finite ranks. ${mastery.summary}`)}
      </div>
      ${mastery.ladder.map((entry) => `
        <div class="shop-row">
          <div>
            <div><strong>${escapeHtml(`Rank ${entry.rank}: ${entry.name}`)}</strong>${entry.unlocked ? " <span class=\"muted\">(Unlocked)</span>" : ""}</div>
            <div class="muted">${escapeHtml(entry.description)}</div>
            <div class="muted">${escapeHtml(`Trigger: ${entry.triggerLabel}`)}</div>
            <div class="muted">${escapeHtml(entry.rewardLines.length > 0 ? `Reward: ${entry.rewardLines.join(", ")}` : "Reward: none")}</div>
          </div>
        </div>
      `).join("")}
    `;
  }

  getContractReviewMarkup(options = {}) {
    const {
      interactive = true
    } = options;
    const contracts = this.getContractViewModel();
    const renderContractRow = (contract, mode = "inactive") => `
      <div class="shop-row">
        <div>
          <div>
            <strong>${escapeHtml(contract.name)}</strong>
            ${contract.recommended ? ' <span class="pill">Recommended</span>' : ""}
            ${contract.active ? ' <span class="muted">(Active)</span>' : ""}
          </div>
          <div class="muted">${escapeHtml(contract.effectLines.join(" | "))}</div>
          <div class="muted">${escapeHtml(contract.recommended ? contract.recommendationReason : contract.unlocked ? contract.description : contract.unlockHint)}</div>
        </div>
        ${interactive ? `
          <div class="actions">
            <button class="tiny-button" data-action="contract-toggle" data-contract="${contract.active ? "" : contract.id}" data-focus-key="contract:${contract.id}" type="button"${contract.unlocked ? "" : " disabled"}>${contract.active ? "Clear" : mode === "active" ? "Clear" : "Arm Next Run"}</button>
          </div>
        ` : ""}
      </div>
    `;
    return `
      <div class="section-block">
        <div class="field-label">Active Contract</div>
        ${contracts.active ? renderContractRow(contracts.active, "active") : "<div class='text-block muted'>No contract armed for the next run.</div>"}
      </div>
      <div class="section-block">
        <div class="field-label">Unlocked Contracts</div>
        ${contracts.unlocked.length > 0 ? contracts.unlocked.map((contract) => renderContractRow(contract)).join("") : "<div class='text-block muted'>No inactive unlocked contracts.</div>"}
      </div>
      <div class="section-block">
        <div class="field-label">Locked Contracts</div>
        ${contracts.locked.length > 0 ? contracts.locked.map((contract) => renderContractRow(contract)).join("") : "<div class='text-block muted'>All current contracts are unlocked.</div>"}
      </div>
    `;
  }

  setActiveContract(contractId = "") {
    const previous = this.getActiveContract(false);
    const changed = setActiveContract(this, contractId);
    if (!changed) {
      return false;
    }
    const next = this.getActiveContract(false);
    if (!previous && next) {
      this.recordTelemetry("contract_armed", {
        contractId: next.id
      });
      this.log(`${next.name} armed for the next run.`, "good");
    } else if (previous && !next) {
      this.recordTelemetry("contract_cleared", {
        contractId: previous.id
      });
      this.log(`${previous.name} cleared. No contract is armed for the next run.`, "warning");
    } else if (previous?.id !== next?.id && next) {
      this.recordTelemetry("contract_armed", {
        contractId: next.id,
        previousContractId: previous?.id || ""
      });
      this.log(`${next.name} armed for the next run.`, "good");
    }
    return true;
  }

  getObjectiveRumorBonus() {
    const activeContract = this.getActiveContract(true);
    if (!activeContract) {
      return 0;
    }
    return activeContract.id === "pressed_descent" || activeContract.id === "scholar_road" ? 1 : 0;
  }

  getGreedGoldMultiplier() {
    const activeContract = this.getActiveContract(true);
    if (activeContract?.id === "greedy_burden") {
      return 1.55;
    }
    return activeContract?.id === "greed_ledger" ? 1.4 : 1;
  }

  getGreedDangerBonus() {
    const activeContract = this.getActiveContract(true);
    if (activeContract?.id === "greed_ledger") {
      return 1;
    }
    if (activeContract?.id === "greedy_burden") {
      return 2;
    }
    if (activeContract?.id === "sealed_return") {
      return 1;
    }
    return 0;
  }

  getGreedRumorBonus() {
    const activeContract = this.getActiveContract(true);
    return activeContract?.id === "greed_ledger" || activeContract?.id === "greedy_burden" ? 1 : 0;
  }

  getSearchRevealBonus() {
    const activeContract = this.getActiveContract(true);
    if (activeContract?.id === "route_debt") {
      return 6;
    }
    return activeContract?.id === "scholar_road" ? 4 : 0;
  }

  getContractPaceDangerBonus(source = "") {
    const activeContract = this.getActiveContract(true);
    if (activeContract?.id === "route_debt" && source === "search") {
      return 1;
    }
    if (activeContract?.id === "ration_run" && ["wait", "rest", "search"].includes(source)) {
      return 1;
    }
    if (activeContract?.id === "last_light" && ["wait", "rest", "search"].includes(source)) {
      return 2;
    }
    return 0;
  }

  getContractEliteWaveChanceBonus() {
    const activeContract = this.getActiveContract(true);
    if (activeContract?.id === "trophy_path") {
      return 0.26;
    }
    return activeContract?.id === "hunters_call" ? 0.18 : 0;
  }

  getEliteRewardGoldBonus() {
    const activeContract = this.getActiveContract(true);
    if (activeContract?.id === "trophy_path") {
      return 90;
    }
    return activeContract?.id === "hunters_call" ? 60 : 0;
  }

  getEliteRewardRumorBonus() {
    const activeContract = this.getActiveContract(true);
    return activeContract?.id === "hunters_call" || activeContract?.id === "trophy_path" ? 1 : 0;
  }

  getTownSellBonusMultiplier() {
    const activeContract = this.getActiveContract(true);
    return activeContract?.id === "greedy_burden" ? 1.15 : 1;
  }

  onEliteKillProgress(monster) {
    if (!monster?.elite) {
      return;
    }
    const goldBonus = this.getEliteRewardGoldBonus();
    if (goldBonus > 0) {
      this.player.gold += goldBonus;
      this.log(`Contract payout: +${goldBonus} gold for bringing down ${monster.name}.`, "good");
    }
    const rumorBonus = this.getEliteRewardRumorBonus();
    if (rumorBonus > 0) {
      this.grantRumorToken?.(rumorBonus);
      this.log(`Contract payout: +${rumorBonus} rumor token${rumorBonus === 1 ? "" : "s"} from the elite kill.`, "good");
    }
    if (unlockContract(this, "hunters_call")) {
      this.runPersistenceChanges?.contractUnlocks.push("Hunter's Call");
      this.recordTelemetry("contract_unlocked", {
        contractId: "hunters_call"
      });
      this.log("Contract unlocked: Hunter's Call. Review it in the bank before the next run.", "good");
    }
  }

  onObjectiveResolved(objectiveId = this.currentLevel?.floorObjective?.id || "") {
    const unlocks = [];
    const masteryUnlock = advanceClassMastery(this, "objective");
    if (masteryUnlock) {
      this.runPersistenceChanges?.masteryUnlocks.push({
        classId: this.player?.classId || "",
        rank: masteryUnlock.rank,
        name: masteryUnlock.name,
        trigger: "objective"
      });
      this.recordTelemetry("mastery_advanced", {
        classId: this.player?.classId || "",
        rank: masteryUnlock.rank,
        name: masteryUnlock.name,
        trigger: "objective"
      });
      this.log(`Mastery unlocked: ${masteryUnlock.name}. ${masteryUnlock.description}`, "good");
    }
    if (objectiveId && unlockContract(this, "greed_ledger")) {
      this.runPersistenceChanges?.contractUnlocks.push("Greed Ledger");
      this.recordTelemetry("contract_unlocked", {
        contractId: "greed_ledger"
      });
      unlocks.push("Greed Ledger");
    }
    if (unlocks.length > 0) {
      this.log(`Contract unlocked: ${unlocks.join(", ")}. Activate it from the bank before the next run.`, "good");
    }
  }

  recordTownReturnSummary(level, fromDepth = 0) {
    const masteryUnlock = advanceClassMastery(this, "extract");
    const unlockedContracts = [];
    const pushUnlockedContract = (contractId, label) => {
      if (!unlockContract(this, contractId)) {
        return false;
      }
      this.runPersistenceChanges?.contractUnlocks.push(label);
      this.recordTelemetry("contract_unlocked", {
        contractId
      });
      unlockedContracts.push(label);
      return true;
    };
    if (masteryUnlock) {
      this.runPersistenceChanges?.masteryUnlocks.push({
        classId: this.player?.classId || "",
        rank: masteryUnlock.rank,
        name: masteryUnlock.name,
        trigger: "extract"
      });
      this.recordTelemetry("mastery_advanced", {
        classId: this.player?.classId || "",
        rank: masteryUnlock.rank,
        name: masteryUnlock.name,
        trigger: "extract"
      });
    }
    pushUnlockedContract("scholar_road", "Scholar's Road");
    if ((this.telemetry?.activeRun?.searchCount || 0) >= 3) {
      pushUnlockedContract("ration_run", "Ration Run");
    }
    if ((this.telemetry?.activeRun?.greedCount || 0) === 0) {
      pushUnlockedContract("sealed_return", "Sealed Return");
    }
    if ((this.telemetry?.activeRun?.restCount || 0) === 0 && (this.telemetry?.activeRun?.waitCount || 0) <= 2) {
      pushUnlockedContract("last_light", "Last Light");
    }
    const carriedCurse = Boolean((this.player?.inventory || []).some((item) => item?.cursed))
      || Boolean(Object.values(this.player?.equipment || {}).some((item) => item?.cursed))
      || (this.player?.constitutionLoss || 0) > 0;
    const persistentChanges = [
      ...((this.runPersistenceChanges?.masteryUnlocks || []).map((entry) => `Mastery: ${entry.name}`)),
      ...((this.runPersistenceChanges?.contractUnlocks || []).map((entry) => `Contract: ${entry}`))
    ];
    const summary = recordRunSummary(this, "extract", {
      extractedDepth: fromDepth || this.currentDepth,
      cause: level?.floorObjective?.id || "",
      persistentChanges,
      carriedCurse,
      masteryAdvance: masteryUnlock
        ? {
            classId: this.player?.classId || "",
            rank: masteryUnlock.rank,
            name: masteryUnlock.name,
            trigger: "extract"
          }
        : null,
      unlockedContracts
    });
    recordCampaignSummary(this, summary);
    const commendationUnlocks = evaluateRunCommendations(this, summary);
    if (commendationUnlocks.length > 0) {
      this.runPersistenceChanges?.commendationUnlocks.push(...commendationUnlocks);
      commendationUnlocks.forEach((entry) => {
        if (entry.contractId) {
          const contractName = CONTRACT_DEFS[entry.contractId]?.name || entry.contractId;
          if (!unlockedContracts.includes(contractName)) {
            unlockedContracts.push(contractName);
          }
        }
        this.recordTelemetry("commendation_unlocked", {
          commendationId: entry.id,
          contractId: entry.contractId || ""
        });
      });
    }
    summary.commendationUnlocks = [...commendationUnlocks];
    summary.persistentChanges = persistentChanges;
    summary.masteryAdvance = masteryUnlock
      ? {
          classId: this.player?.classId || "",
          rank: masteryUnlock.rank,
          name: masteryUnlock.name,
          trigger: "extract"
        }
      : null;
    summary.unlockedContracts = [...unlockedContracts];
    if (commendationUnlocks.length > 0) {
      const commendationChanges = commendationUnlocks.map((entry) => `Commendation: ${entry.name}`);
      summary.persistentChanges = [...summary.persistentChanges, ...commendationChanges];
    }
    this.lastRunSummary = summary;
    if (masteryUnlock) {
      this.log(`Mastery unlocked: ${masteryUnlock.name}. ${masteryUnlock.description}`, "good");
    }
    if (unlockedContracts.length > 0) {
      this.log(`Contract unlocked: ${unlockedContracts.join(", ")}. Review it in the bank before starting the next run.`, "good");
    }
    if (commendationUnlocks.length > 0) {
      this.log(`Commendation unlocked: ${commendationUnlocks.map((entry) => entry.name).join(", ")}.`, "good");
    }
    return {
      summary,
      masteryUnlock,
      unlockedContracts,
      commendationUnlocks
    };
  }

  handleRunDeath() {
    const latestMastery = (this.runPersistenceChanges?.masteryUnlocks || []).at(-1) || null;
    const unlockedContracts = [...(this.runPersistenceChanges?.contractUnlocks || [])];
    const summary = recordRunSummary(this, "death", {
      extractedDepth: this.currentDepth,
      cause: this.deathContext?.cause || "Unknown",
      carriedCurse: Boolean((this.player?.inventory || []).some((item) => item?.cursed))
        || Boolean(Object.values(this.player?.equipment || {}).some((item) => item?.cursed))
        || (this.player?.constitutionLoss || 0) > 0,
      persistentChanges: [
        ...((this.runPersistenceChanges?.masteryUnlocks || []).map((entry) => `Mastery: ${entry.name}`)),
        ...((this.runPersistenceChanges?.contractUnlocks || []).map((entry) => `Contract: ${entry}`))
      ],
      masteryAdvance: latestMastery,
      unlockedContracts
    });
    recordCampaignSummary(this, summary);
    this.lastRunSummary = summary;
    return summary;
  }

  showExtractionSummaryModal(summary = this.lastRunSummary, extras = {}) {
    if (!summary) {
      return;
    }
    const persistentChanges = Array.isArray(summary.persistentChanges) ? summary.persistentChanges : [];
    const unlockedText = extras.unlockedContracts?.length > 0
      ? extras.unlockedContracts.join(", ")
      : "No new contract unlock this return.";
    const masteryText = extras.masteryUnlock
      ? `${extras.masteryUnlock.name}. ${extras.masteryUnlock.description}`
      : this.getClassMasterySummary(this.player?.classId);
    const activeContract = this.getActiveContract(true);
    const townMeta = this.getTownMetaSummary();
    const nextRunIntent = this.getNextRunIntent(this.player?.classId);
    const carryForward = this.getTownCarryForwardSummary();
    const commendationText = extras.commendationUnlocks?.length > 0
      ? extras.commendationUnlocks.map((entry) => `${entry.name} (${entry.rewardLabel})`).join(" | ")
      : "No new commendation unlock this return.";
    this.recordTelemetry("return_summary_opened", {
      outcome: summary.outcome,
      extractedDepth: summary.extractedDepth
    });
    this.mode = "modal";
    this.showSimpleModal("Return Summary", `
      <div class="section-block text-block">
        Banked a clean return from ${escapeHtml(extras.level?.description || "the keep")} after ${summary.turns} turns.
      </div>
      ${persistentChanges.length > 0 ? `
        <div class="section-block text-block">
          <strong>Permanent change:</strong> ${escapeHtml(persistentChanges.join(" | "))}
        </div>
      ` : ""}
      <div class="section-block">
        <div class="field-label">Run Build</div>
        <div class="text-block">
          First objective: ${escapeHtml(summary.firstObjectiveType || "unknown")}<br>
          Searches: ${summary.searchCount} | Greed rooms: ${summary.greedCount} | Elite kills: ${summary.eliteKills || 0} | Return value: ${summary.returnValue} gp<br><br>
          What mattered: objective clear turn ${summary.firstObjectiveClearTurn ?? "?"}, deepest depth ${summary.deepestDepth}, active contract ${escapeHtml(activeContract?.name || "none")}
        </div>
      </div>
      <div class="section-block">
        <div class="field-label">Floor Rewards</div>
        <div class="text-block">
          Cleared depth ${summary.extractedDepth} with ${summary.modalOpenCounts.pack} pack checks, ${summary.modalOpenCounts.magic} magic checks, and ${summary.modalOpenCounts.journal} journal checks.<br><br>
          Greed taken: ${summary.greedCount} | Carried or banked value: ${summary.returnValue} gp
        </div>
      </div>
      <div class="section-block">
        <div class="field-label">Town Persistence</div>
        <div class="text-block">
          Mastery: ${escapeHtml(masteryText)}<br><br>
          Contracts: ${escapeHtml(unlockedText)}<br><br>
          Commendations: ${escapeHtml(commendationText)}<br><br>
          Active next-run contract: ${escapeHtml(this.getActiveContract(false)?.name || "No contract armed")}<br><br>
          ${escapeHtml(carryForward)}
        </div>
      </div>
      <div class="section-block">
        <div class="field-label">Next Step</div>
        <div class="text-block">
          ${escapeHtml(townMeta.recommendedActionLabel)}<br><br>
          ${escapeHtml(townMeta.recommendedAction)}<br><br>
          ${escapeHtml(townMeta.recommendedReason)}
        </div>
      </div>
      <div class="section-block">
        <div class="field-label">Why Run Again</div>
        <div class="text-block">${nextRunIntent.motivators.map((entry) => escapeHtml(`${entry.label} ${entry.detail}`)).join("<br><br>")}</div>
      </div>
      <div class="modal-actions">
        <button class="menu-button primary" data-action="open-bank" data-focus-key="return-summary:bank" type="button">Open Bank Plan</button>
        <button class="menu-button" data-action="close-modal" data-focus-key="return-summary:continue" type="button">Continue</button>
      </div>
    `, {
      surfaceKey: "return-summary"
    });
  }

  syncTownCycle(force = false, announce = false) {
    const currentCycle = this.getTownCycleState();
    const previousCycle = this.getTownCycleState(Math.max(1, this.lastTownRefreshTurn || 1));
    ensureTownMetaState(this);
    this.townState.phaseModifiers = { ...currentCycle.phaseModifiers };
    if (!force && currentCycle.cycleIndex <= previousCycle.cycleIndex) {
      return false;
    }
    refreshTownStocks(this, { clearBuyback: true, turn: this.turn });
    this.lastTownRefreshTurn = this.turn;
    if (announce) {
      this.log(`${this.getTownCycleLabel()} settles over town. Merchants clear their old shelves and lay out fresh stock.`, "warning");
    }
    return true;
  }

  useService(serviceId) {
    const service = this.pendingService;
    if (!service) {
      return;
    }
    switch (service.type) {
      case "temple":
        this.useTempleService(serviceId);
        break;
      case "sage":
        this.useSageService(serviceId);
        break;
      default:
        break;
    }
  }

  useTempleService(serviceId) {
    const service = TEMPLE_SERVICES.find((entry) => entry.id === serviceId);
    if (!service) {
      return;
    }
    const price = getTemplePrice(this, service.price);
    if (this.player.gold < price) {
      this.log("You cannot afford that blessing.", "warning");
      return;
    }
    this.player.gold -= price;
    switch (service.id) {
      case "heal":
        this.player.hp = this.player.maxHp;
        this.player.mana = this.player.maxMana;
        this.log("The temple restores your wounds and spirit.", "good");
        break;
      case "restore":
        this.player.constitutionLoss = 0;
        this.recalculateDerivedStats();
        this.player.hp = this.player.maxHp;
        this.player.mana = this.player.maxMana;
        this.log("The priests restore what poison and overcasting stole.", "good");
        break;
      case "removeCurse":
        this.log(this.removeCurses() > 0 ? "The temple breaks the curses on your belongings." : "The temple finds no curse to lift.", "good");
        break;
      case "runeReturn":
        this.addItemToInventory(createItem("runeScroll", { identified: true }));
        this.log("A fresh rune of return is pressed into your hand.", "good");
        break;
      default:
        break;
    }
    this.recordTelemetry("temple_service", {
      serviceId,
      price
    });
    this.showTempleModal({
      preserveScroll: true,
      focusTarget: this.getServiceFocusKey("temple", serviceId)
    });
    this.render();
  }

  useSageService(serviceId) {
    if (serviceId !== "identifyAll") {
      return;
    }
    const price = getSagePrice(this);
    if (this.player.gold < price) {
      this.log("The sage will not work for free.", "warning");
      return;
    }
    this.player.gold -= price;
    const count = this.identifyInventoryAndEquipment();
    this.log(count > 0 ? `The sage identifies ${count} item${count === 1 ? "" : "s"}.` : "The sage shrugs. Nothing remains mysterious.", "good");
    this.recordTelemetry("sage_identify", {
      price,
      identifiedCount: count
    });
    this.showSageModal({
      preserveScroll: true,
      focusTarget: this.getServiceFocusKey("sage", serviceId)
    });
    this.render();
  }

  identifyInventoryAndEquipment() {
    let count = 0;
    this.player.inventory.forEach((item) => {
      if (canIdentify(item) && !item.identified) {
        item.identified = true;
        count += 1;
      }
    });
    Object.values(this.player.equipment).forEach((item) => {
      if (item && canIdentify(item) && !item.identified) {
        item.identified = true;
        count += 1;
      }
    });
    return count;
  }

  removeCurses() {
    let count = 0;
    this.player.inventory.forEach((item) => {
      if (item.cursed) {
        item.cursed = false;
        item.identified = true;
        count += 1;
      }
    });
    Object.values(this.player.equipment).forEach((item) => {
      if (item && item.cursed) {
        item.cursed = false;
        item.identified = true;
        count += 1;
      }
    });
    return count;
  }

  summonNearbyMonster() {
    if (!this.currentLevel.rooms) {
      return;
    }
    if (!this.canAddDynamicMonster(1)) {
      return;
    }
    const template = weightedMonster(Math.max(1, this.currentDepth));
    const points = [
      { x: this.player.x + 1, y: this.player.y },
      { x: this.player.x - 1, y: this.player.y },
      { x: this.player.x, y: this.player.y + 1 },
      { x: this.player.x, y: this.player.y - 1 }
    ];
    const spot = points.find((point) => isWalkable(this.currentLevel, point.x, point.y) && !actorAt(this.currentLevel, point.x, point.y));
    if (spot) {
      const monster = createMonster(template, spot.x, spot.y);
      monster.sleeping = false;
      monster.alerted = 8;
      this.currentLevel.actors.push(monster);
    }
  }

  findSafeTile(level, attempts = 20) {
    for (let i = 0; i < attempts; i += 1) {
      const room = choice(level.rooms || [{ x: 2, y: 2, w: level.width - 4, h: level.height - 4 }]);
      const position = randomRoomTile(room);
      if (isWalkable(level, position.x, position.y) && !actorAt(level, position.x, position.y)) {
        return position;
      }
    }
    return null;
  }

  resolveMilestoneBossKill(monster) {
    const milestone = this.currentLevel?.milestone;
    if (!milestone || milestone.status === "cleared" || monster.milestoneId !== milestone.id) {
      return;
    }
    const storyBeat = this.getStoryBeat(milestone.storyTag);
    milestone.status = "cleared";
    milestone.clearedTurn = this.turn;
    if (!this.player.quest.milestonesCleared.includes(milestone.id)) {
      this.player.quest.milestonesCleared.push(milestone.id);
    }
    if (!this.player.quest.namedBossesDefeated.includes(monster.name)) {
      this.player.quest.namedBossesDefeated.push(monster.name);
    }
    this.markStoryBeatFlag(`${milestone.storyTag}:cleared`);
    this.log(storyBeat?.clearText || milestone.clearText, "good");
    this.recordChronicleEvent("milestone_clear", {
      label: monster.name,
      depth: this.currentDepth,
      summary: storyBeat?.chronicleLabel || `Broke ${monster.name} on depth ${this.currentDepth}.`
    });
    this.recordTelemetry("milestone_clear", {
      milestoneId: milestone.id,
      bossId: monster.id,
      rewardType: milestone.rewardType || "none"
    });
    if (milestone.rewardType === "perk") {
      queuePerkChoice(this, 1);
    } else if (milestone.rewardType === "relic") {
      queueObjectiveReward(this, milestone.id, "relic");
    }
  }

  getQuestMilestoneSummary() {
    const milestones = Object.values(MILESTONE_DEFS)
      .sort((left, right) => left.depth - right.depth)
      .map((milestone) => {
        const cleared = this.player.quest.milestonesCleared.includes(milestone.id);
        return `${cleared ? "Cleared" : "Pending"}: ${milestone.name} (Depth ${milestone.depth})`;
      });
    return milestones.join(" | ");
  }

  getActiveMilestoneJournalText() {
    if (this.player.quest.hasRunestone) {
      return "The Runestone is in hand. Return it to town and let the valley hear what the keep became.";
    }
    if (this.player.quest.milestonesCleared.includes("depth5_cryptlord")) {
      return STORY_BEATS.depth7.journal;
    }
    if (this.player.quest.milestonesCleared.includes("depth3_gatekeeper")) {
      return STORY_BEATS.depth5.journal;
    }
    return STORY_BEATS.intro.journal;
  }

  checkQuestState() {
    if (!this.player.quest.hasRunestone && this.player.inventory.some((item) => item.kind === "quest")) {
      this.player.quest.hasRunestone = true;
    }
    if (this.player.quest.complete) {
      return;
    }
    if (this.currentDepth === 0 && this.player.quest.hasRunestone) {
      this.player.quest.complete = true;
      this.recordChronicleEvent("objective_complete", {
        label: "Returned the Runestone of the Winds",
        depth: 0
      });
      this.recordTelemetry("run_complete", {
        deepestDepth: this.player.deepestDepth,
        level: this.player.level
      });
      if (!this.hasSeenNpcScene("return")) {
        this.showStoryScene("return");
      }
    }
  }

  hasPendingProgressionChoice() {
    return hasPendingProgressionChoice(this);
  }

  recordChronicleEvent(type, payload = {}) {
    recordChronicleEvent(this, type, payload);
  }

  recordTelemetry(type, context = {}) {
    return recordTelemetry(this, type, context);
  }

  getTelemetryReviewSnapshot() {
    return getTelemetryReviewSnapshot(this);
  }

  markOnboarding(stepId) {
    return markOnboardingFlag(this, stepId);
  }

  noteDeathContext(context) {
    noteDeathContext(this, context);
  }

  grantBoon(boonId) {
    return applyBoonReward(this, boonId);
  }

  grantRumorToken(amount = 1) {
    addRumorToken(this, amount);
  }

  learnRumor(rumorId) {
    ensureBuildState(this);
    if (!this.player.knownRumors.includes(rumorId)) {
      this.player.knownRumors.push(rumorId);
    }
    if (!this.rumorTable.includes(rumorId)) {
      this.rumorTable.push(rumorId);
    }
  }

  offerObjectiveReward(source = "objective") {
    const rewardType = this.floorObjective?.rewardType || "relic";
    const queued = queueObjectiveReward(this, source, rewardType);
    if (!queued && rewardType === "rumor") {
      grantObjectiveRumor(this);
    }
    this.showNextProgressionModal();
  }

  increaseDanger(source = "unknown", amount = 1) {
    return raiseDanger(this, source, amount);
  }

  markGreedAction(source = "greed") {
    return markFloorGreedAction(this, source);
  }

  noteFloorIntro() {
    noteFloorIntro(this);
  }

  getTownMetaSummary() {
    return buildTownMetaSummary(this);
  }

  getValidationSummary() {
    return buildValidationSummary(this);
  }

  isFirstTownRun() {
    return Boolean(this.player && this.currentDepth === 0 && (this.player.deepestDepth || 0) === 0);
  }

  completeTownServiceTutorial(service) {
    if (!this.isFirstTownRun() || this.storyFlags.townServiceVisited) {
      return false;
    }
    const onboardingMeta = getOnboardingVariantMeta(this);
    this.storyFlags.townServiceVisited = true;
    this.storyFlags.firstTownGuidance = "keep";
    this.markOnboarding("visit_town_door");
    const label = service === "bank"
      ? "Bank"
      : service === "sage"
        ? "Sage"
        : SHOPS[service]?.name || "Town service";
    this.log(`${label} checked. Town support is live for this adventurer. ${onboardingMeta.enterKeepPrimary}`, "good");
    return true;
  }

  showBriefingModal(options = {}) {
    if (!this.player) {
      return;
    }
    if (this.currentDepth === 0 && !this.hasSeenBriefing("intro")) {
      this.showStoryScene("intro");
      return;
    }
    this.showHubModal("journal", {
      preserveScroll: this.mode === "modal",
      focusTarget: this.getJournalSectionFocusKey("mission"),
      journalSection: "mission"
    });
  }

  getTileActionPrompt(tile = this.player && this.currentLevel ? getTile(this.currentLevel, this.player.x, this.player.y) : null) {
    if (!this.player || !this.currentLevel || !tile) {
      return null;
    }
    const onboardingMeta = getOnboardingVariantMeta(this);
    if (this.isFirstTownRun() && !this.storyFlags.townServiceVisited) {
      return {
        label: "Town Task",
        detail: onboardingMeta.townDoorPrompt,
        tone: "warning"
      };
    }
    if (this.currentDepth === 0 && tile.kind === "buildingDoor" && tile.service) {
      return {
        label: "Town Door",
        detail: `Step here to open ${SHOPS[tile.service]?.name || tile.label || "this service"}.`,
        tone: "good"
      };
    }
    const objective = this.currentLevel.floorObjective;
    if (tile.objectiveId && objective && !this.currentLevel.floorResolved) {
      const blockers = getObjectiveDefendersRemaining(this.currentLevel);
      const interaction = this.getObjectiveInteractionPromptData(objective, blockers);
      return {
        label: interaction?.label || "Objective",
        detail: blockers > 0 ? interaction?.blockedDetail || interaction?.roomDetail || "Clear the room first." : interaction?.readyDetail || interaction?.roomDetail || "Resolve the objective now.",
        tone: interaction?.tone || (blockers > 0 ? "warning" : "good")
      };
    }
    if (tile.optionalId) {
      return { label: "Greed Choice", detail: `${tile.label || "Optional reward"} will raise pressure if you take it.`, tone: "warning" };
    }
    if (tile.discoveryId) {
      return { label: "Read", detail: "Press U to read and archive this discovery.", tone: "good" };
    }
    if (tile.roomEventId) {
      return { label: "Resolve", detail: "Press U to resolve this room event when the room is safe.", tone: "warning" };
    }
    if (tile.kind === "altar") {
      return { label: "Use Shrine", detail: "Press U to bargain here. It can raise pressure or carry risk.", tone: "warning" };
    }
    if (tile.kind === "fountain") {
      return { label: "Drink", detail: "Press U to use the fountain.", tone: "good" };
    }
    if (tile.kind === "throne") {
      return { label: "Sit", detail: "Press U to use the throne.", tone: "warning" };
    }
    return null;
  }

  restoreUiFocus(focusKey) {
    const candidates = this.getFocusKeyCandidates(focusKey);
    this.applyControllerNavigationMetadata();
    for (const key of candidates) {
      const nextFocus = this.findUiElementByFocusKey(key);
      if (nextFocus) {
        this.focusUiElement(nextFocus);
        return true;
      }
    }
    if (candidates.length > 0) {
      this.controllerFocusKey = null;
    }
    return false;
  }

  getCurrentUiFocusKey() {
    return this.getActiveUiActionableElement()?.dataset?.focusKey || this.controllerFocusKey || null;
  }

  openSpellTray() {
    if (!this.player || this.mode === "title" || this.mode === "creation" || this.mode === "levelup") {
      return false;
    }
    const pinned = this.getPinnedSpellIds();
    if (this.player.spellsKnown.length <= 0) {
      this.log("No spells are known.", "warning");
      this.render();
      return false;
    }
    if (pinned.length <= 0) {
      this.log("No spells are pinned to the tray. Open the Book to add one.", "warning");
      this.render();
      return false;
    }
    if (this.mode !== "target" && this.spellTrayOpen) {
      this.closeSpellTray();
      return false;
    }
    this.spellTrayOpen = true;
    this.pendingSpell = this.pendingSpell && this.player.spellsKnown.includes(this.pendingSpell)
      ? this.pendingSpell
      : pinned[0];
    this.refreshChrome();
    this.render();
    return true;
  }

  closeSpellTray() {
    this.spellTrayOpen = false;
    if (this.mode === "target" && this.targetMode?.type === "spell") {
      this.cancelTargetMode();
      return;
    }
    this.refreshChrome();
    this.render();
  }

  shouldShowSpellTray() {
    return Boolean(
      this.spellTray
      && this.player
      && this.getPinnedSpellIds().length > 0
      && this.mode !== "title"
      && this.mode !== "creation"
      && this.mode !== "modal"
      && this.mode !== "levelup"
      && (this.spellTrayOpen || (this.mode === "target" && this.targetMode?.type === "spell"))
    );
  }

  getSpellTrayMarkup() {
    const spellIds = this.getPinnedSpellIds();
    const activeSpellId = this.targetMode?.spellId || this.getSpellTraySelectionId();
    const activeSpell = SPELLS[activeSpellId];
    const preview = this.targetMode?.type === "spell" ? this.getActiveSpellTargetPreview() : null;
    const focusState = activeSpell
      ? this.mode === "target" && preview
        ? (preview.valid
          ? `Will hit ${preview.hitCount} foe${preview.hitCount === 1 ? "" : "s"}${preview.targetingMode === "blast" ? " in the blast" : ""}.`
          : preview.reason || "Move the cursor to a better cast.")
        : activeSpell.target === "self"
          ? `${getSpellCategoryLabel(activeSpell)} spell. Self cast resolves immediately.`
          : `${getSpellCategoryLabel(activeSpell)} | ${this.getSpellTargetingLabel(activeSpell)} | ${activeSpell.description}`
      : "No spell selected.";
    const focusTone = this.mode === "target" && preview && !preview.valid ? "invalid" : "valid";
    const rows = spellIds.map((spellId) => {
      const spell = SPELLS[spellId];
      if (!spell) {
        return "";
      }
      const manaCost = getSpellCost(this, spell);
      const overcast = this.player.mana < manaCost;
      const active = activeSpellId === spellId;
      const categoryLabel = getSpellCategoryLabel(spell);
      return `
        <button class="spell-tray-card${active ? " active" : ""}${overcast ? " warning" : ""}" data-action="spell-select" data-double-action="spell-cast" data-surface="tray" data-spell="${spellId}" data-focus-key="spell-tray:${spellId}" type="button">
          <span class="spell-tray-card-head">
            <span class="spell-tray-card-title">${escapeHtml(spell.name)}</span>
            <span class="spell-tray-card-cost">${manaCost} mana${overcast ? " / overcast" : ""}</span>
          </span>
          <span class="spell-tray-card-badges">
            <span class="spell-badge accent">${escapeHtml(categoryLabel)}</span>
            <span class="spell-badge">${escapeHtml(capitalize(spell.school || "spell"))}</span>
            <span class="spell-badge subtle">${escapeHtml(this.getSpellTargetingLabel(spell))}</span>
          </span>
          <span class="spell-tray-card-copy">${escapeHtml(spell.description)}</span>
        </button>
      `;
    }).join("");

    return `
      <div class="spell-tray-shell${this.mode === "target" ? " targeting" : ""}">
        <div class="spell-tray-header">
          <div>
            <div class="spell-tray-kicker">Field Casting</div>
            <div class="spell-tray-title">Spell Tray ${spellIds.length > 0 ? `(${spellIds.length}/${this.getSpellTrayLimit()})` : ""}</div>
          </div>
        </div>
        <div class="spell-tray-summary ${focusTone}">
          <div class="spell-tray-summary-head">
            <strong>${escapeHtml(activeSpell?.name || "Spell ready")}</strong>
            <span>${escapeHtml(activeSpell ? `${getSpellCost(this, activeSpell)} mana | ${getSpellCategoryLabel(activeSpell)} | ${this.getSpellTargetingLabel(activeSpell)}` : "")}</span>
          </div>
          <div class="spell-tray-summary-copy">${escapeHtml(focusState)}</div>
          <div class="spell-tray-summary-actions">
            <button class="tiny-button" data-action="spell-cast" data-spell="${activeSpellId}" data-focus-key="${this.getSpellCastFocusKey(activeSpellId, "tray")}" type="button"${activeSpell ? "" : " disabled"}>Cast</button>
            <button class="tiny-button" data-action="open-hub" data-tab="magic" data-focus-key="spell-tray:book" type="button">Book</button>
            <button class="tiny-button" data-action="spell-tray-close" data-focus-key="spell-tray:close" type="button">Hide</button>
          </div>
          ${this.mode === "target" && activeSpell ? `<div class="spell-tray-summary-note">Confirm cast or tap a valid tile. Cancel keeps the board clear.</div>` : ""}
        </div>
        <div class="spell-tray-grid">${rows}</div>
      </div>
    `;
  }

  syncSpellTray() {
    if (!this.spellTray) {
      return;
    }
    if (!this.shouldShowSpellTray()) {
      this.spellTray.classList.add("hidden");
      this.spellTray.innerHTML = "";
      this.lastSpellTrayMarkup = "";
      return;
    }
    const markup = this.getSpellTrayMarkup();
    if (this.lastSpellTrayMarkup !== markup) {
      this.spellTray.innerHTML = markup;
      this.lastSpellTrayMarkup = markup;
    }
    this.spellTray.classList.remove("hidden");
  }

  syncContextChip() {
    if (!this.contextChip) {
      return;
    }
    const prompt = this.getTileActionPrompt();
    if (!prompt || this.mode === "title" || this.mode === "creation") {
      this.contextChip.classList.add("hidden");
      this.contextChip.textContent = "";
      return;
    }
    this.contextChip.textContent = `${prompt.label}: ${prompt.detail}`;
    this.contextChip.className = `context-chip tone-${prompt.tone || "good"}`;
  }

  showNextProgressionModal() {
    const rewardChoice = prepareNextRewardChoice(this);
    if (rewardChoice) {
      this.showRewardChoiceModal(rewardChoice);
      return true;
    }
    if (this.pendingSpellChoices > 0) {
      this.showSpellLearnModal();
      return true;
    }
    return false;
  }

  showRewardChoiceModal(choiceState) {
    const title = choiceState.type === "perk"
      ? "Level Up Perk"
      : choiceState.type === "relic"
        ? "Objective Reward"
        : "Boon Choice";
    const lookup = choiceState.type === "perk"
      ? PERK_DEFS
      : choiceState.type === "relic"
        ? RELIC_DEFS
        : BOON_DEFS;
    this.mode = "levelup";
    this.setModalVisibility(true);
    this.modalRoot.innerHTML = `
      <div class="modal mobile-sheet modal-large">
        <div class="modal-title">${escapeHtml(title)}</div>
        <div class="section-block text-block">
          ${choiceState.type === "perk"
            ? `${escapeHtml(this.player.name)} grows into a sharper build. Choose one perk.`
            : choiceState.type === "relic"
              ? "The floor breaks open and offers a meaningful relic. Choose one reward."
              : "Choose one boon and commit to how this run develops."}
        </div>
        <div class="spell-learn-grid">
          ${choiceState.options.map((id) => {
            const entry = lookup[id];
            if (!entry) {
              return "";
            }
            return `
              <button class="spell-learn-card" data-action="choose-reward" data-reward="${id}" data-focus-key="reward:${id}" type="button">
                <span class="spell-learn-tier">${escapeHtml(choiceState.type === "perk" ? "Perk" : choiceState.type === "relic" ? entry.category || "Relic" : "Boon")}</span>
                <span class="spell-learn-name">${escapeHtml(entry.name)}</span>
                <span class="spell-learn-copy">${escapeHtml(entry.description)}</span>
              </button>
            `;
          }).join("")}
        </div>
      </div>
    `;
    this.modalRoot.classList.remove("hidden");
    this.applyControllerNavigationMetadata();
    this.focusFirstUiElement();
  }

  chooseRewardChoice(rewardId) {
    if (!chooseReward(this, rewardId)) {
      return;
    }
    if (this.showNextProgressionModal()) {
      this.render();
      return;
    }
    if (this.pendingTurnResolution !== null) {
      this.setModalVisibility(false);
      this.modalRoot.classList.add("hidden");
      this.modalRoot.innerHTML = "";
      this.mode = "game";
      const advanceTurn = this.pendingTurnResolution;
      this.pendingTurnResolution = null;
      this.resolveTurn(advanceTurn);
      return;
    }
    this.closeModal();
    this.render();
  }

  legacySaveGameUnused(options = {}) {
    if (!this.player) {
      return;
    }
    const { silent = false } = options;
    const snapshot = {
      version: APP_VERSION,
      turn: this.turn,
      currentDepth: this.currentDepth,
      levels: this.levels,
      player: this.player,
      settings: this.settings,
      shopState: this.shopState,
      storyFlags: this.storyFlags,
      lastTownRefreshTurn: this.lastTownRefreshTurn,
      meta: {
        name: this.player.name,
        level: this.player.level,
        depth: this.currentDepth,
        savedAt: new Date().toISOString()
      }
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
    if (!silent) {
      this.log("Game saved to browser storage.", "good");
    }
    this.refreshChrome();
    this.render();
  }

  legacyLoadGameUnused() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      this.log("No saved game is available.", "warning");
      this.render();
      return;
    }
    const snapshot = JSON.parse(raw);
    this.turn = snapshot.turn;
    this.levels = normalizeLevels(snapshot.levels);
    this.player = normalizePlayer(snapshot.player);
    this.currentDepth = snapshot.currentDepth;
    this.currentLevel = this.levels[this.currentDepth];
    this.settings = { ...defaultSettings(), ...(snapshot.settings || this.settings) };
    saveSettings(this.settings);
    this.audio.updateSettings(this.settings);
    this.shopState = normalizeShopState(snapshot.shopState);
    this.storyFlags = snapshot.storyFlags || {};
    this.lastTownRefreshTurn = snapshot.lastTownRefreshTurn || 0;
    this.pendingSpellChoices = 0;
    this.pendingTurnResolution = null;
    this.mode = "game";
    this.pendingShop = null;
    this.pendingService = null;
    if (this.currentLevel?.kind === "dungeon" && !this.currentLevel.guidance) {
      this.prepareGuidedRouteState(this.currentLevel, this.currentDepth);
    }
    this.recalculateDerivedStats();
    this.closeModal();
    this.updateFov();
    this.applyIntroFloorRecon();
    this.updateMonsterIntents();
    this.log("Saved game restored.", "good");
    this.refreshChrome();
    this.render();
  }

  updateFov() {
    if (!this.player || !this.currentLevel) {
      return;
    }
    clearVisibility(this.currentLevel);
    const radius = this.getLightRadius();
    for (let y = this.player.y - radius; y <= this.player.y + radius; y += 1) {
      for (let x = this.player.x - radius; x <= this.player.x + radius; x += 1) {
        if (!inBounds(this.currentLevel, x, y)) {
          continue;
        }
        if (distance({ x, y }, this.player) <= radius && hasLineOfSight(this.currentLevel, this.player.x, this.player.y, x, y)) {
          setVisible(this.currentLevel, x, y, true);
          setExplored(this.currentLevel, x, y, true);
        }
      }
    }
    this.processDiscoveryEvents();
  }

  getViewport() {
    const half = Math.floor(VIEW_SIZE / 2);
    let vx = this.player ? this.player.x - half : 0;
    let vy = this.player ? this.player.y - half : 0;
    vx = clamp(vx, 0, Math.max(0, this.currentLevel.width - VIEW_SIZE));
    vy = clamp(vy, 0, Math.max(0, this.currentLevel.height - VIEW_SIZE));
    return { x: vx, y: vy };
  }

  legacyShowTitleScreenUnused() {
    this.mode = "title";
    this.setModalVisibility(true);
    const template = document.getElementById("title-template");
    const fragment = template.content.cloneNode(true);
    const saveSummary = fragment.getElementById("title-save-summary");
    const loadButton = fragment.getElementById("title-load-button");
    const savedMeta = this.getSavedRunMeta();

    if (savedMeta) {
      saveSummary.innerHTML = `
        <div class="title-save-label">Continue Run</div>
        <div class="title-save-name">${escapeHtml(savedMeta.name)}</div>
        <div class="title-save-meta">Level ${savedMeta.level} · Depth ${savedMeta.depth}</div>
      `;
    } else {
      saveSummary.innerHTML = `
        <div class="title-save-label">No Saved Run</div>
        <div class="title-save-meta">Start a fresh descent and your latest run will appear here.</div>
      `;
      loadButton.disabled = true;
    }

    this.modalRoot.innerHTML = "";
    this.modalRoot.appendChild(fragment);
    this.modalRoot.classList.remove("hidden");
    this.refreshChrome();
  }

  legacyShowCreationModalUnused() {
    this.mode = "creation";
    this.setModalVisibility(true);
    const template = document.getElementById("creation-template");
    const fragment = template.content.cloneNode(true);
    const raceChoice = fragment.getElementById("race-choice");
    const classChoice = fragment.getElementById("class-choice");
    const preview = fragment.getElementById("creation-preview");

    RACES.forEach((race) => raceChoice.appendChild(choiceCard(race, "race", race.id === this.selectedRace)));
    CLASSES.forEach((role) => classChoice.appendChild(choiceCard(role, "class", role.id === this.selectedClass)));

    const race = getRace(this.selectedRace);
    const role = getClass(this.selectedClass);
    preview.innerHTML = `
      <div class="section-block"><span class="pill">${escapeHtml(race.name)}</span><span class="pill">${escapeHtml(role.name)}</span></div>
      <div class="section-block muted">${escapeHtml(race.summary)} ${escapeHtml(role.summary)}</div>
      <div class="stat-grid">
        <div class="stat-line"><span>Strength</span><strong>${race.stats.str + role.bonuses.str}</strong></div>
        <div class="stat-line"><span>Dexterity</span><strong>${race.stats.dex + role.bonuses.dex}</strong></div>
        <div class="stat-line"><span>Constitution</span><strong>${race.stats.con + role.bonuses.con}</strong></div>
        <div class="stat-line"><span>Intelligence</span><strong>${race.stats.int + role.bonuses.int}</strong></div>
        <div class="stat-line"><span>Hit Points</span><strong>${race.hp + role.bonuses.hp + race.stats.con + role.bonuses.con}</strong></div>
        <div class="stat-line"><span>Mana</span><strong>${race.mana + role.bonuses.mana + Math.floor((race.stats.int + role.bonuses.int) / 2)}</strong></div>
      </div>
    `;

    this.modalRoot.innerHTML = "";
    this.modalRoot.appendChild(fragment);
    this.modalRoot.classList.remove("hidden");
  }

  legacyShowTitleScreenModuleMigrated() {
    this.mode = "title";
    this.setModalVisibility(true);
    const template = document.getElementById("title-template");
    const fragment = template.content.cloneNode(true);
    const saveSummary = fragment.getElementById("title-save-summary");
    const loadButton = fragment.getElementById("title-load-button");
    const savedMeta = this.getSavedRunMeta();

    if (savedMeta) {
      const savedTime = savedMeta.savedAt ? this.formatSaveStamp(savedMeta.savedAt) : null;
      saveSummary.innerHTML = `
        <div class="title-save-label">Continue Run</div>
        <div class="title-save-name">${escapeHtml(savedMeta.name)}</div>
        <div class="title-save-meta">Level ${savedMeta.level} · Depth ${savedMeta.depth}</div>
        ${savedTime ? `<div class="title-save-meta">${escapeHtml(savedTime)}</div>` : ""}
      `;
    } else {
      saveSummary.innerHTML = `
        <div class="title-save-label">No Saved Run</div>
        <div class="title-save-meta">Start a fresh descent and your latest run will appear here.</div>
      `;
      loadButton.disabled = true;
    }

    this.modalRoot.innerHTML = "";
    this.modalRoot.appendChild(fragment);
    this.modalRoot.classList.remove("hidden");
    this.refreshChrome();
  }

  legacyShowCreationModalModuleMigrated() {
    this.mode = "creation";
    this.setModalVisibility(true);
    const template = document.getElementById("creation-template");
    const fragment = template.content.cloneNode(true);
    const nameInput = fragment.getElementById("hero-name");
    const raceChoice = fragment.getElementById("race-choice");
    const classChoice = fragment.getElementById("class-choice");
    const statPoints = fragment.getElementById("creation-stat-points");
    const statAllocation = fragment.getElementById("creation-stat-allocation");
    const preview = fragment.getElementById("creation-preview");

    nameInput.value = this.creationName;
    RACES.forEach((race) => raceChoice.appendChild(choiceCard(race, "race", race.id === this.selectedRace)));
    CLASSES.forEach((role) => classChoice.appendChild(choiceCard(role, "class", role.id === this.selectedClass)));

    const race = getRace(this.selectedRace);
    const role = getClass(this.selectedClass);
    const stats = this.getCreationStats();
    const pointsRemaining = this.getCreationPointsRemaining();
    const previewHp = this.getMaxHpForStats(stats, 1, role.name, 0, race.hp + role.bonuses.hp);
    const previewMana = this.getMaxManaForStats(stats, role.name, 0, race.mana + role.bonuses.mana);
    const [damageLow, damageHigh] = this.getDamageRangeForStats(stats, 2);

    statPoints.innerHTML = `Training points remaining: <strong>${pointsRemaining}</strong>`;
    statAllocation.innerHTML = CREATION_STAT_KEYS.map((stat) => `
      <div class="creation-stat-row">
        <div class="creation-stat-copy">
          <div class="creation-stat-title">${CREATION_STAT_LABELS[stat]}</div>
          <div class="creation-stat-notes">
            <span>${escapeHtml(CREATION_STAT_NOTES[stat])}</span>
          </div>
        </div>
        <div class="creation-stat-stepper">
          <button class="tiny-button creation-stat-button" data-action="creation-adjust-stat" data-stat="${stat}" data-delta="-1" type="button" ${this.creationStatBonuses[stat] <= 0 ? "disabled" : ""}>-</button>
          <div class="creation-stat-value">${stats[stat]}</div>
          <button class="tiny-button creation-stat-button" data-action="creation-adjust-stat" data-stat="${stat}" data-delta="1" type="button" ${(pointsRemaining <= 0 || this.creationStatBonuses[stat] >= CREATION_STAT_POINT_CAP) ? "disabled" : ""}>+</button>
        </div>
      </div>
    `).join("");

    preview.innerHTML = `
      <div class="section-block"><span class="pill">${escapeHtml(race.name)}</span><span class="pill">${escapeHtml(role.name)}</span></div>
      <div class="section-block muted">${escapeHtml(race.summary)} ${escapeHtml(role.summary)}</div>
      <div class="stat-grid">
        <div class="stat-line"><span>Strength</span><strong>${stats.str}</strong></div>
        <div class="stat-line"><span>Dexterity</span><strong>${stats.dex}</strong></div>
        <div class="stat-line"><span>Constitution</span><strong>${stats.con}</strong></div>
        <div class="stat-line"><span>Intelligence</span><strong>${stats.int}</strong></div>
        <div class="stat-line"><span>Hit Points</span><strong>${previewHp}</strong></div>
        <div class="stat-line"><span>Mana</span><strong>${previewMana}</strong></div>
        <div class="stat-line"><span>Attack</span><strong>${this.getAttackValueForStats(stats, 2)}</strong></div>
        <div class="stat-line"><span>Damage</span><strong>${damageLow}-${damageHigh}</strong></div>
        <div class="stat-line"><span>Evade</span><strong>${this.getEvadeValueForStats(stats)}</strong></div>
        <div class="stat-line"><span>Armor</span><strong>${this.getArmorValueForStats(stats)}</strong></div>
        <div class="stat-line"><span>Search</span><strong>${this.getSearchRadiusForStats(stats)} tiles</strong></div>
        <div class="stat-line"><span>Carry</span><strong>${getCarryCapacity({ stats })}</strong></div>
      </div>
    `;

    this.modalRoot.innerHTML = "";
    this.modalRoot.appendChild(fragment);
    this.modalRoot.classList.remove("hidden");
  }

  showSpellLearnModal() {
    const options = this.getLearnableSpellOptions();
    if (options.length === 0) {
      this.pendingSpellChoices = 0;
      if (this.showNextProgressionModal()) {
        return;
      }
      if (this.pendingTurnResolution !== null) {
        const advanceTurn = this.pendingTurnResolution;
        this.pendingTurnResolution = null;
        this.resolveTurn(advanceTurn);
      } else {
        this.closeModal();
        this.render();
      }
      return;
    }

    const groupedOptions = getSpellCategoryDefs().map((category) => ({
      ...category,
      spells: options.filter((spell) => getSpellCategoryKey(spell) === category.key)
    })).filter((group) => group.spells.length > 0);
    const filterDefs = this.getSpellFilterDefsForEntries(options);
    const activeFilter = filterDefs.some((entry) => entry.key === this.activeSpellLearnFilter) ? this.activeSpellLearnFilter : "all";
    this.mode = "levelup";
    this.setModalVisibility(true);
    this.modalRoot.innerHTML = `
      <div class="modal mobile-sheet modal-large">
        <div class="modal-title">Spell Study</div>
        <div class="section-block text-block">
          ${escapeHtml(this.player.name)} has reached level ${this.player.level}. Choose ${this.pendingSpellChoices > 1 ? "a spell for this level and then choose another." : "a new spell to learn."}
        </div>
        ${this.getSpellFilterChipsMarkup(activeFilter, "spell-learn-filter", (key) => this.getSpellLearnFilterFocusKey(key), "spell-learn-filter-row", filterDefs)}
        <div class="spell-learn-groups">
          ${groupedOptions.map((group) => `
            ${activeFilter !== "all" && activeFilter !== group.key ? "" : `
            <section class="spell-learn-group">
              <div class="magic-category-heading">
                <div class="magic-category-title">${escapeHtml(group.label)}</div>
                <div class="magic-category-count">${group.spells.length}</div>
              </div>
              <div class="spell-learn-grid">
                ${group.spells.map((spell) => `
                  <button class="spell-learn-card" data-action="learn-spell" data-spell="${spell.id}" data-focus-key="learn-spell:${spell.id}" type="button">
                    <span class="spell-learn-tier">${escapeHtml(`${group.label} | ${spell.classAffinity === "shared" ? "Shared" : capitalize(spell.classAffinity || "shared")} | Tier ${spell.tier || 1}`)}</span>
                    <span class="spell-learn-name">${escapeHtml(spell.name)}</span>
                    <span class="spell-learn-meta">${escapeHtml(`${capitalize(spell.school || "spell")} | ${spell.target === "monster" ? `Range ${spell.range || 1}` : "Self cast"} | ${getSpellCost(this, spell)} mana`)}</span>
                    <span class="spell-learn-copy">${escapeHtml(spell.description)}</span>
                  </button>
                `).join("")}
              </div>
            </section>
            `}
          `).join("")}
        </div>
      </div>
    `;
    this.modalRoot.classList.remove("hidden");
    this.applyControllerNavigationMetadata();
    this.focusFirstUiElement();
  }

  learnLevelUpSpell(spellId) {
    if (this.mode !== "levelup") {
      return;
    }
    const spell = SPELLS[spellId];
    if (!spell || this.player.spellsKnown.includes(spellId) || (spell.learnLevel || 1) > this.player.level) {
      return;
    }

    this.player.spellsKnown.push(spellId);
    this.addSpellToTrayIfSpace(spellId);
    this.pendingSpellChoices = Math.max(0, this.pendingSpellChoices - 1);
    this.log(`${this.player.name} learns ${spell.name}.`, "good");

    if (this.pendingSpellChoices > 0 && this.getLearnableSpellOptions().length > 0) {
      this.showSpellLearnModal();
      this.render();
      return;
    }

    this.pendingSpellChoices = 0;
    if (this.showNextProgressionModal()) {
      this.render();
      return;
    }
    if (this.pendingTurnResolution !== null) {
      this.setModalVisibility(false);
      this.modalRoot.classList.add("hidden");
      this.modalRoot.innerHTML = "";
      this.mode = "game";
      const advanceTurn = this.pendingTurnResolution;
      this.pendingTurnResolution = null;
      this.resolveTurn(advanceTurn);
      return;
    }

    this.closeModal();
    this.render();
  }

  showSimpleModal(title, bodyHtml, options = {}) {
    const {
      surfaceKey = null,
      preserveScroll = false,
      focusTarget = null,
      fallbackFocus = true,
      closeLabel = "Close",
      closeFocusKey = "modal:close",
      modalReturnContext = null
    } = options;
    this.setModalVisibility(true);
    const previousState = preserveScroll ? this.captureModalRefreshState(surfaceKey) : null;
    const template = document.getElementById("list-modal-template");
    const fragment = template.content.cloneNode(true);
    fragment.getElementById("generic-modal-title").textContent = title;
    fragment.getElementById("generic-modal-body").innerHTML = bodyHtml;
    const closeButton = fragment.querySelector('[data-action="close-modal"]');
    if (closeButton) {
      closeButton.textContent = closeLabel;
      closeButton.dataset.focusKey = closeFocusKey;
    }
    this.modalRoot.innerHTML = "";
    this.modalRoot.appendChild(fragment);
    this.modalRoot.classList.remove("hidden");
    this.modalSurfaceKey = surfaceKey;
    this.modalReturnContext = modalReturnContext;
    this.recordTelemetry("modal_opened", {
      surface: surfaceKey || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    });
    this.applyControllerNavigationMetadata();
    const nextModal = this.getModalScrollHost();
    if (nextModal && previousState) {
      nextModal.scrollTop = previousState.scrollTop;
    }
    const focusElement = this.resolveModalFocusTarget(focusTarget, previousState);
    if (focusElement) {
      this.focusUiElement(focusElement);
      return;
    }
    if (fallbackFocus) {
      this.focusFirstUiElement();
    }
  }

  renderLogMarkup(limit = 24) {
    return this.messages.slice(-limit).map((entry) => `
      <div class="log-line ${entry.tone ? `log-${entry.tone}` : ""}">
        <span class="log-turn">[${entry.turn}]</span> ${escapeHtml(entry.message)}
      </div>
    `).join("");
  }

  getEquipmentBaseSlot(slot = "") {
    if (slot.startsWith("ring")) {
      return "ring";
    }
    if (slot.startsWith("amulet")) {
      return "amulet";
    }
    return slot;
  }

  ensureEquipmentAliases(player = this.player) {
    const equipment = player?.equipment;
    if (!equipment) {
      return;
    }
    const defineAlias = (legacySlot, targetSlot) => {
      Object.defineProperty(equipment, legacySlot, {
        configurable: true,
        enumerable: false,
        get: () => equipment[targetSlot] || null,
        set: (value) => {
          equipment[targetSlot] = value || null;
        }
      });
    };
    defineAlias("ring", "ring1");
    defineAlias("amulet", "amulet1");
  }

  getEquipmentFamilySlots(slot = "") {
    const baseSlot = this.getEquipmentBaseSlot(slot);
    if (baseSlot === "ring") {
      return ["ring1", "ring2", "ring3", "ring4"];
    }
    if (baseSlot === "amulet") {
      return ["amulet1", "amulet2"];
    }
    return baseSlot ? [baseSlot] : [];
  }

  getEquipmentEntriesForSlot(slot = "") {
    return this.getEquipmentFamilySlots(slot).map((entrySlot) => ({
      slot: entrySlot,
      item: this.player?.equipment?.[entrySlot] || null
    }));
  }

  getEquipmentSlotForItem(item) {
    if (!item?.slot) {
      return {
        targetSlot: "",
        entries: [],
        emptyEntries: [],
        occupiedEntries: [],
        swappableEntries: [],
        blockedByCurse: false
      };
    }
    const entries = this.getEquipmentEntriesForSlot(item.slot);
    const emptyEntries = entries.filter((entry) => !entry.item);
    const occupiedEntries = entries.filter((entry) => Boolean(entry.item));
    const swappableEntries = occupiedEntries.filter((entry) => !entry.item.cursed);
    const targetEntry = emptyEntries[0] || swappableEntries[0] || null;
    return {
      targetSlot: targetEntry?.slot || "",
      targetEntry,
      entries,
      emptyEntries,
      occupiedEntries,
      swappableEntries,
      blockedByCurse: !targetEntry && occupiedEntries.length > 0
    };
  }

  getPackSlotDefinitions() {
    return [
      { slot: "cloak", label: "Cloak", emptyText: "Back slot for cloaks and wraps.", area: "cloak" },
      { slot: "head", label: "Head", emptyText: "Helms, hoods, and crowns.", area: "head" },
      { slot: "amulet1", label: "Amulet I", emptyText: "First neck slot for charms and talismans.", area: "amulet1" },
      { slot: "amulet2", label: "Amulet II", emptyText: "Second neck slot for charms and talismans.", area: "amulet2" },
      { slot: "weapon", label: "Weapon", emptyText: "Your main striking hand.", area: "weapon" },
      { slot: "body", label: "Armor", emptyText: "Chest armor and robes.", area: "armor" },
      { slot: "offhand", label: "Offhand", emptyText: "Shield or focus carried opposite the weapon.", area: "offhand" },
      { slot: "ring1", label: "Ring I", emptyText: "First active ring slot.", area: "ring1" },
      { slot: "ring2", label: "Ring II", emptyText: "Second active ring slot.", area: "ring2" },
      { slot: "ring3", label: "Ring III", emptyText: "Third active ring slot.", area: "ring3" },
      { slot: "ring4", label: "Ring IV", emptyText: "Fourth active ring slot.", area: "ring4" },
      { slot: "feet", label: "Feet", emptyText: "Boots and travel footwear.", area: "feet" }
    ];
  }

  getPackSlotDefinition(slot) {
    const exact = this.getPackSlotDefinitions().find((entry) => entry.slot === slot);
    if (exact) {
      return exact;
    }
    const baseSlot = this.getEquipmentBaseSlot(slot);
    const familyEntry = this.getPackSlotDefinitions().find((entry) => this.getEquipmentBaseSlot(entry.slot) === baseSlot);
    if (familyEntry) {
      return {
        ...familyEntry,
        slot,
        label: capitalize(baseSlot)
      };
    }
    return { slot, label: capitalize(slot), emptyText: "Unused slot.", area: slot };
  }

  getHubTabFocusKey(tabId) {
    return `hub:tab:${tabId}`;
  }

  getJournalSectionFocusKey(sectionId) {
    return `journal:section:${sectionId}`;
  }

  getJournalSectionDefs() {
    return [
      { id: "current", label: "Current" },
      { id: "mission", label: "Mission" },
      { id: "guide", label: "Rules" },
      { id: "chronicle", label: "Chronicle" }
    ];
  }

  getResolvedJournalSection(sectionId = this.activeJournalSection) {
    const fallback = this.getJournalSectionDefs()[0]?.id || "current";
    return this.getJournalSectionDefs().some((section) => section.id === sectionId)
      ? sectionId
      : fallback;
  }

  getPackItemFocusKey(index) {
    return `pack:item:${index}`;
  }

  getPackSlotFocusKey(slot) {
    return `pack:slot:${slot}`;
  }

  getPackActionFocusKey(action, value) {
    return `pack:${action}:${value}`;
  }

  getPackFilterFocusKey(filter) {
    return `pack:filter:${filter}`;
  }

  getShopBuyFocusKey(shopId, itemId) {
    return `shop:buy:${shopId}:${itemId}`;
  }

  getShopPanelFocusKey(panel) {
    return `shop:panel:${panel}`;
  }

  getShopSellFocusKey(index) {
    return `shop:sell:${index}`;
  }

  getTownActionFocusKey(action) {
    return `town:${action}`;
  }

  getTownUnlockFocusKey(unlockId) {
    return `town:unlock:${unlockId}`;
  }

  getServiceFocusKey(serviceType, serviceId) {
    return `${serviceType}:${serviceId}`;
  }

  setPackSelection(selection) {
    if (!selection) {
      return;
    }
    this.hoveredPackSelection = null;
    if (selection.type === "slot") {
      this.activePackSelection = { type: "slot", value: selection.value };
      return;
    }
    this.activePackSelection = { type: "inventory", value: Math.max(0, Number(selection.value) || 0) };
  }

  getDefaultPackSelection(preferredIndex = 0) {
    if (this.player.inventory.length > 0) {
      return { type: "inventory", value: clamp(preferredIndex, 0, this.player.inventory.length - 1) };
    }
    const equippedSlot = this.getPackSlotDefinitions().find(({ slot }) => this.player.equipment[slot]);
    if (equippedSlot) {
      return { type: "slot", value: equippedSlot.slot };
    }
    return { type: "slot", value: "weapon" };
  }

  resolvePackSelection() {
    const selection = this.activePackSelection;
    if (selection?.type === "inventory" && this.player.inventory[selection.value]) {
      return selection;
    }
    if (selection?.type === "slot" && this.getPackSlotDefinitions().some(({ slot }) => slot === selection.value)) {
      return selection;
    }
    this.activePackSelection = this.getDefaultPackSelection();
    return this.activePackSelection;
  }

  getCompatibleInventoryIndexes(slot) {
    return this.player.inventory.reduce((matches, item, index) => {
      if (this.getEquipmentBaseSlot(item.slot || "") === this.getEquipmentBaseSlot(slot)) {
        matches.push(index);
      }
      return matches;
    }, []);
  }

  getPackSelectionModelFor(selectionInput) {
    const selection = selectionInput?.type ? selectionInput : this.resolvePackSelection();
    if (selection.type === "slot") {
      const slotDef = this.getPackSlotDefinition(selection.value);
      const item = this.player.equipment[selection.value] || null;
      return {
        selection,
        slotDef,
        item,
        compatibleIndexes: this.getCompatibleInventoryIndexes(selection.value),
        comparison: null,
        weightDelta: 0,
        encumbrancePreview: this.describeBurdenPreview(0)
      };
    }
    const item = this.player.inventory[selection.value] || null;
    const slotDef = item && item.slot ? this.getPackSlotDefinition(item.slot) : null;
    const comparison = this.getPackComparisonModel(item);
    return {
      selection,
      slotDef,
      item,
      compatibleIndexes: [],
      comparison,
      weightDelta: comparison.weightDelta,
      encumbrancePreview: comparison.encumbrancePreview
    };
  }

  getPackSelectionModel() {
    return this.getPackSelectionModelFor(this.resolvePackSelection());
  }

  getPackItemActionLabel(item) {
    if (!item) {
      return "Use";
    }
    if (item.kind === "weapon" || item.kind === "armor") {
      return "Equip";
    }
    if (item.kind === "spellbook") {
      return "Study";
    }
    if (item.kind === "charged") {
      return "Use Charge";
    }
    return "Use";
  }

  getCurrentPackShopContext() {
    return this.currentDepth === 0 && this.pendingShop ? this.pendingShop.id : "";
  }

  getPackItemMeta(item, semanticEntry = null) {
    const bits = [];
    if (semanticEntry?.recommendation) {
      bits.push(semanticEntry.recommendation);
    }
    if (semanticEntry?.categoryLabel) {
      bits.push(semanticEntry.categoryLabel);
    }
    bits.push(item.slot ? this.getPackSlotDefinition(item.slot).label : semanticEntry?.kindLabel || item.kindLabel || classifyItem(item));
    if (item.kind === "weapon") {
      bits.push(`Atk ${getItemPower(item)}`);
      if (getItemAccuracyBonus(item)) {
        bits.push(`Hit ${getItemAccuracyBonus(item) > 0 ? `+${getItemAccuracyBonus(item)}` : getItemAccuracyBonus(item)}`);
      }
      if (getItemCritBonus(item)) {
        bits.push(`Crit +${getItemCritBonus(item)}`);
      }
    } else if (item.kind === "armor") {
      bits.push(`Arm ${getItemArmor(item)}`);
      if (getItemGuardBonus(item)) {
        bits.push(`Guard ${getItemGuardBonus(item)}`);
      }
      if (getItemWardBonus(item)) {
        bits.push(`Ward ${getItemWardBonus(item)}`);
      }
    } else if (item.kind === "charged" && item.identified) {
      bits.push(`${item.charges}/${item.maxCharges || item.charges} ch`);
    } else if (item.kind === "spellbook") {
      bits.push(this.player.spellsKnown.includes(item.spell) ? "Known spell" : "Learn spell");
    }
    if (semanticEntry?.sellHereTag) {
      bits.push("Sell Here");
    } else if (semanticEntry?.shopTags?.[0]) {
      bits.push(semanticEntry.shopTags[0]);
    }
    return bits.join(" • ");
  }

  getPackItemNote(item, semanticEntry = null) {
    const bits = [`Wt ${item.weight || 0}`, `${Math.floor(getItemValue(item))} gp`];
    if (item.affixId && LOOT_AFFIX_DEFS[item.affixId]) {
      bits.push(LOOT_AFFIX_DEFS[item.affixId].name);
    }
    if (semanticEntry?.unknown || (canIdentify(item) && !item.identified)) {
      bits.push("Unknown");
    } else {
      bits.push("Known");
    }
    if (item.cursed) {
      bits.push("Cursed");
    }
    if (item.markedForSale) {
      bits.push("Marked");
    }
    const undeadBonus = getItemBonusVsUndead(item);
    if (undeadBonus > 0) {
      bits.push(`Vs Undead +${undeadBonus}`);
    }
    const overcastRelief = getItemOvercastRelief(item);
    if (overcastRelief > 0) {
      bits.push(`Overcast -${overcastRelief}`);
    }
    if (semanticEntry?.heavyLabel) {
      bits.push(semanticEntry.heavyLabel);
    } else if (!semanticEntry?.shopTags?.length) {
      bits.push("No buyer yet");
    }
    return bits.join(" • ");
  }

  getPackRowTagMarkup(entry) {
    if (!entry) {
      return "";
    }
    const tags = [
      `<span class="item-chip category-chip">${escapeHtml(entry.categoryLabel || "Item")}</span>`,
      ...((entry.scanTags || []).slice(0, 3).map((tag) => `<span class="item-chip semantic-chip">${escapeHtml(capitalize(tag.replace(/-/g, " ")))}</span>`))
    ];
    return `<div class="pack-item-tags">${tags.join("")}</div>`;
  }

  getPackHoverPreviewSummary(model, semanticEntry = null) {
    if (!model) {
      return "";
    }
    if (model.selection.type === "slot") {
      if (!model.item) {
        return model.compatibleIndexes.length > 0
          ? `${model.compatibleIndexes.length} carried item${model.compatibleIndexes.length === 1 ? "" : "s"} fit this slot.`
          : "No carried item fits this slot right now.";
      }
      return buildEquipmentSlotSummary(this, model.slotDef, model.compatibleIndexes.length).reason;
    }
    if (model.comparison?.blockedByCurse) {
      return `All ${this.getPackSlotDefinition(model.item.slot).label.toLowerCase()} slots are locked by curses.`;
    }
    if (model.comparison?.fitsEmptySlot) {
      return `Fits empty ${this.getPackSlotDefinition(model.comparison.targetSlot).label} slot.`;
    }
    if (model.comparison?.deltas?.length > 0) {
      return model.comparison.deltas.slice(0, 2).map((delta) => delta.text).join(" | ");
    }
    return semanticEntry?.reason || describeItem(model.item);
  }

  getPackHoverPreviewMarkup(previewModel, inventoryModel) {
    if (!previewModel || this.isSamePackSelection(previewModel.selection, this.resolvePackSelection())) {
      return "";
    }
    const previewEntry = previewModel.selection.type === "inventory"
      ? inventoryModel.entries.find((entry) => entry.index === previewModel.selection.value) || null
      : null;
    const previewTitle = previewModel.item
      ? getItemName(previewModel.item)
      : previewModel.slotDef?.label || "Preview";
    const previewSummary = this.getPackHoverPreviewSummary(previewModel, previewEntry);
    const previewTags = previewModel.item
      ? this.getItemBadgeMarkup(previewModel.item, previewEntry, previewModel)
      : `<span class="item-chip">${escapeHtml(previewModel.slotDef?.label || "Slot")}</span>`;
    return `
      <div class="pack-hover-preview">
        <div class="pack-hover-preview-head">
          <div>
            <div class="pack-hover-preview-kicker">Hover Preview</div>
            <div class="pack-hover-preview-title">${escapeHtml(previewTitle)}</div>
          </div>
          <div class="pack-hover-preview-note">Preview only. Select to act.</div>
        </div>
        <div class="pack-item-badges">${previewTags}</div>
        <div class="pack-hover-preview-copy">${escapeHtml(previewSummary)}</div>
      </div>
    `;
  }

  buildComparisonDelta(label, delta, invert = false) {
    if (!delta) {
      return null;
    }
    const good = invert ? delta < 0 : delta > 0;
    return {
      label,
      delta,
      tone: good ? "good" : "bad",
      text: `${label} ${delta > 0 ? `+${delta}` : delta}`
    };
  }

  getPackComparisonModel(item) {
    if (!item || !item.slot) {
      return {
        equipped: null,
        targetSlot: "",
        slotEntries: [],
        emptySlots: [],
        fitsEmptySlot: false,
        blockedByCurse: false,
        comparisons: [],
        deltas: [],
        weightDelta: 0,
        encumbrancePreview: this.describeBurdenPreview(0)
      };
    }

    const equipTarget = this.getEquipmentSlotForItem(item);
    const comparisons = equipTarget.entries
      .filter((entry) => entry.item)
      .map((entry) => ({
        slot: entry.slot,
        label: this.getPackSlotDefinition(entry.slot).label,
        equipped: entry.item,
        deltas: [
          this.buildComparisonDelta("Attack", getItemPower(item) - getItemPower(entry.item)),
          this.buildComparisonDelta("Armor", getItemArmor(item) - getItemArmor(entry.item)),
          this.buildComparisonDelta("Accuracy", getItemAccuracyBonus(item) - getItemAccuracyBonus(entry.item)),
          this.buildComparisonDelta("Crit", getItemCritBonus(item) - getItemCritBonus(entry.item)),
          this.buildComparisonDelta("Guard", getItemGuardBonus(item) - getItemGuardBonus(entry.item)),
          this.buildComparisonDelta("Ward", getItemWardBonus(item) - getItemWardBonus(entry.item)),
          this.buildComparisonDelta("Mana", getItemManaBonus(item) - getItemManaBonus(entry.item)),
          this.buildComparisonDelta("Str", getItemStrBonus(item) - getItemStrBonus(entry.item)),
          this.buildComparisonDelta("Dex", getItemDexBonus(item) - getItemDexBonus(entry.item)),
          this.buildComparisonDelta("Con", getItemConBonus(item) - getItemConBonus(entry.item)),
          this.buildComparisonDelta("Int", getItemIntBonus(item) - getItemIntBonus(entry.item)),
          this.buildComparisonDelta("Sight", getItemLightBonus(item) - getItemLightBonus(entry.item)),
          this.buildComparisonDelta("Search", getItemSearchBonus(item) - getItemSearchBonus(entry.item)),
          this.buildComparisonDelta("Fire Resist", getItemFireResist(item) - getItemFireResist(entry.item)),
          this.buildComparisonDelta("Cold Resist", getItemColdResist(item) - getItemColdResist(entry.item)),
          this.buildComparisonDelta("Weight", (item.weight || 0) - (entry.item.weight || 0), true)
        ].filter(Boolean)
      }));
    const primaryComparison = comparisons.find((entry) => entry.slot === equipTarget.targetSlot) || comparisons[0] || null;
    const equipped = primaryComparison?.equipped || null;
    const weightDelta = equipped ? (item.weight || 0) - (equipped.weight || 0) : (item.weight || 0);
    return {
      equipped,
      targetSlot: equipTarget.targetSlot,
      slotEntries: equipTarget.entries.map((entry) => ({
        ...entry,
        label: this.getPackSlotDefinition(entry.slot).label
      })),
      emptySlots: equipTarget.emptyEntries.map((entry) => entry.slot),
      fitsEmptySlot: equipTarget.emptyEntries.length > 0,
      blockedByCurse: equipTarget.blockedByCurse,
      comparisons,
      deltas: primaryComparison?.deltas || [],
      weightDelta,
      encumbrancePreview: this.describeBurdenPreview(weightDelta)
    };
  }

  getItemBadgeMarkup(item, semanticEntry = null, model = null) {
    const badges = [
      `<span class="item-chip category-chip">${escapeHtml(semanticEntry?.categoryLabel || "Item")}</span>`,
      `<span class="item-chip kind-chip">${escapeHtml(item.kindLabel || semanticEntry?.kindLabel || classifyItem(item))}</span>`
    ];
    (semanticEntry?.scanTags || []).forEach((tag) => {
      badges.push(`<span class="item-chip semantic-chip">${escapeHtml(capitalize(tag.replace(/-/g, " ")))}</span>`);
    });
    if (item.slot) {
      badges.push(`<span class="item-chip">Slot ${escapeHtml(this.getPackSlotDefinition(item.slot).label)}</span>`);
    }
    if (item.kind === "weapon") {
      badges.push(`<span class="item-chip">Power ${getItemPower(item)}</span>`);
      if (getItemAccuracyBonus(item)) {
        badges.push(`<span class="item-chip">Hit ${getItemAccuracyBonus(item) > 0 ? `+${getItemAccuracyBonus(item)}` : getItemAccuracyBonus(item)}</span>`);
      }
      if (getItemCritBonus(item)) {
        badges.push(`<span class="item-chip">Crit +${getItemCritBonus(item)}</span>`);
      }
    }
    if (item.kind === "armor") {
      badges.push(`<span class="item-chip">Armor ${getItemArmor(item)}</span>`);
    }
    if (getItemGuardBonus(item)) {
      badges.push(`<span class="item-chip">Guard ${getItemGuardBonus(item)}</span>`);
    }
    if (getItemWardBonus(item)) {
      badges.push(`<span class="item-chip">Ward ${getItemWardBonus(item)}</span>`);
    }
    if (getItemManaBonus(item)) {
      badges.push(`<span class="item-chip">Mana +${getItemManaBonus(item)}</span>`);
    }
    if (getItemStrBonus(item)) {
      badges.push(`<span class="item-chip">Str +${getItemStrBonus(item)}</span>`);
    }
    if (getItemDexBonus(item)) {
      badges.push(`<span class="item-chip">Dex +${getItemDexBonus(item)}</span>`);
    }
    if (getItemConBonus(item)) {
      badges.push(`<span class="item-chip">Con +${getItemConBonus(item)}</span>`);
    }
    if (getItemIntBonus(item)) {
      badges.push(`<span class="item-chip">Int +${getItemIntBonus(item)}</span>`);
    }
    if (getItemLightBonus(item)) {
      badges.push(`<span class="item-chip">Sight +${getItemLightBonus(item)}</span>`);
    }
    if (getItemSearchBonus(item)) {
      badges.push(`<span class="item-chip">Search +${getItemSearchBonus(item)}</span>`);
    }
    if (getItemFireResist(item)) {
      badges.push(`<span class="item-chip">Fire ${getItemFireResist(item)}</span>`);
    }
    if (getItemColdResist(item)) {
      badges.push(`<span class="item-chip">Cold ${getItemColdResist(item)}</span>`);
    }
    if (item.weight) {
      badges.push(`<span class="item-chip">Wt ${item.weight}</span>`);
    }
    if (item.kind === "charged" && item.identified) {
      badges.push(`<span class="item-chip">Charges ${item.charges}/${item.maxCharges || item.charges}</span>`);
    }
    if (model && model.selection.type === "inventory" && item.slot) {
      badges.push(`<span class="item-chip">Burden ${escapeHtml(this.getBurdenPreview(model.weightDelta).label)}</span>`);
    } else {
      badges.push(`<span class="item-chip">Burden ${escapeHtml(this.getBurdenUiState().label)}</span>`);
    }
    badges.push(`<span class="item-chip">Sell ${Math.floor(getItemValue(item))} gp</span>`);
    if (semanticEntry?.sellHereTag) {
      badges.push(`<span class="item-chip">${escapeHtml(semanticEntry.sellHereTag)}</span>`);
    } else if (semanticEntry?.shopTags?.length) {
      badges.push(`<span class="item-chip">${escapeHtml(semanticEntry.shopTags[0])}</span>`);
    } else {
      badges.push(`<span class="item-chip">No buyer yet</span>`);
    }
    if (canIdentify(item) && !item.identified) {
      badges.push(`<span class="item-chip warning-chip">Unknown quality</span>`);
    }
    if (item.cursed && item.identified) {
      badges.push(`<span class="item-chip bad-chip">Cursed</span>`);
    }
    if (item.markedForSale) {
      badges.push(`<span class="item-chip">Marked</span>`);
    }
    return badges.join("");
  }

  getPackFilterMarkup(inventoryModel) {
    return `
      <div class="pack-filter-row">
        ${inventoryModel.filterDefs.map((filterDef) => `
          <button class="hub-filter-chip${this.activePackFilter === filterDef.key ? " active" : ""}" data-action="pack-filter" data-filter="${filterDef.key}" data-focus-key="${this.getPackFilterFocusKey(filterDef.key)}" type="button">${escapeHtml(filterDef.label)}</button>
        `).join("")}
      </div>
    `;
  }

  getInventoryGroupsMarkup(inventoryModel, selectedIndex) {
    if (inventoryModel.groups.length === 0) {
      return `<div class="text-block">Nothing matches this pack filter right now.</div>`;
    }

    return inventoryModel.groups.map((group) => `
      <section class="pack-group">
        <div class="pack-group-heading">
          <div class="pack-group-title">${escapeHtml(group.label)}</div>
          <div class="pack-group-count">${group.items.reduce((sum, entry) => sum + entry.count, 0)}</div>
        </div>
        ${group.sections.map((section) => `
          <div class="pack-subgroup">
            <div class="pack-subgroup-heading">
              <div class="pack-subgroup-title">${escapeHtml(section.label)}</div>
              <div class="pack-subgroup-count">${section.items.reduce((sum, entry) => sum + entry.count, 0)}</div>
            </div>
            <div class="pack-group-list">
              ${section.items.map((entry) => `
                <button class="pack-item-row${selectedIndex === entry.index || entry.isSelected ? " active" : ""}" data-action="inspect-pack-item" data-index="${entry.index}" data-focus-key="${this.getPackItemFocusKey(entry.index)}" data-pack-preview-type="inventory" data-pack-preview-value="${entry.index}" type="button">
                  <span class="pack-item-head">
                    <span class="pack-item-name">${escapeHtml(getItemName(entry.item))}</span>
                    ${entry.count > 1 ? `<span class="pack-item-stack">x${entry.count}</span>` : ""}
                  </span>
                  <span class="pack-item-meta">${escapeHtml(this.getPackItemMeta(entry.item, entry))}</span>
                  ${this.getPackRowTagMarkup(entry)}
                  <span class="pack-item-reason">${escapeHtml(entry.reason)}</span>
                  <span class="pack-item-note">${escapeHtml(this.getPackItemNote(entry.item, entry))}</span>
                </button>
              `).join("")}
            </div>
          </div>
        `).join("")}
      </section>
    `).join("");
  }

  getSemanticRiskCallout(item, semanticEntry = null, model = null, slotSummary = null) {
    if (slotSummary?.risk) {
      return slotSummary.risk;
    }
    if (!item) {
      return "";
    }
    if (semanticEntry?.recommendation === "Identify first") {
      return "Unknown quality may hide a curse or weak roll.";
    }
    if (item.kind === "spellbook" && this.player.spellsKnown.includes(item.spell)) {
      return "Already learned. Safe to sell or stash.";
    }
    if (item.kind === "charged" && (item.charges || 0) <= 0) {
      return "No charges left.";
    }
    if (item.cursed) {
      return model?.selection?.type === "slot" ? "Locked by curse." : "Locks if cursed.";
    }
    if (model?.selection?.type === "inventory" && item.slot && model.encumbrancePreview?.tone !== "value-good") {
      return model.encumbrancePreview.text;
    }
    if (semanticEntry?.heavyLabel) {
      return semanticEntry.heavyLabel;
    }
    return "";
  }

  getPackInspectorMarkup(model, inventoryModel) {
    const shopId = this.getCurrentPackShopContext();
    const selectedEntry = model.selection.type === "inventory" ? inventoryModel.selectedEntry : null;
    const hoverPreviewModel = this.hoveredPackSelection && !this.isSamePackSelection(this.hoveredPackSelection, model.selection)
      ? this.getPackSelectionModelFor(this.hoveredPackSelection)
      : null;
    const hoverPreviewMarkup = this.getPackHoverPreviewMarkup(hoverPreviewModel, inventoryModel);
    if (!model.item && model.selection.type === "slot") {
      const slotSummary = buildEquipmentSlotSummary(this, model.slotDef, model.compatibleIndexes.length);
      const compatibleRows = model.compatibleIndexes.length === 0
        ? `<div class="muted">No carried item fits this slot right now.</div>`
        : `
          <div class="pack-compatible-list">
            ${model.compatibleIndexes.map((index) => `
              <button class="tiny-button pack-ready-chip" data-action="inspect-pack-item" data-index="${index}" data-focus-key="${this.getPackItemFocusKey(index)}" type="button">${escapeHtml(getItemName(this.player.inventory[index]))}</button>
            `).join("")}
          </div>
        `;
      return `
        <section class="hub-section pack-inspector-panel">
          <div class="panel-title">Selected Slot</div>
          ${hoverPreviewMarkup}
          <div class="pack-inspector-card">
            <div class="pack-inspector-kicker">${escapeHtml(slotSummary.recommendation)}</div>
            <div class="pack-inspector-title">Empty Slot</div>
            <div class="pack-inspector-summary">
              <span class="pack-decision-chip">${escapeHtml(model.slotDef.label)}</span>
              <span class="pack-decision-reason">${escapeHtml(slotSummary.reason)}</span>
            </div>
            <div class="pack-inspector-copy">${escapeHtml(model.slotDef.emptyText)}</div>
            <div class="pack-stat-grid">
              <div class="pack-stat-pill">Burden ${escapeHtml(inventoryModel.burdenUi.label)}</div>
              <div class="pack-stat-pill">${model.compatibleIndexes.length} ready</div>
            </div>
            <div class="pack-inspector-section">
              <strong>Ready To Equip</strong>
              ${compatibleRows}
            </div>
          </div>
        </section>
      `;
    }

    if (!model.item) {
      return "";
    }

    const item = model.item;
    const detailEntry = selectedEntry || buildInventoryItemSemantics(this, item, -1, { shopId });
    const slotSummary = model.selection.type === "slot" ? buildEquipmentSlotSummary(this, model.slotDef, model.compatibleIndexes.length) : null;
    const recommendation = selectedEntry?.recommendation || slotSummary?.recommendation || "Keep";
    const reason = selectedEntry?.reason || slotSummary?.reason || describeItem(item);
    const riskCallout = this.getSemanticRiskCallout(item, detailEntry, model, slotSummary);
    const statLines = [
      item.kind === "weapon" ? `Attack ${getItemPower(item)}` : "",
      item.kind === "armor" ? `Armor ${getItemArmor(item)}` : "",
      getItemAccuracyBonus(item) ? `Accuracy ${getItemAccuracyBonus(item) > 0 ? `+${getItemAccuracyBonus(item)}` : getItemAccuracyBonus(item)}` : "",
      getItemCritBonus(item) ? `Crit +${getItemCritBonus(item)}` : "",
      getItemGuardBonus(item) ? `Guard ${getItemGuardBonus(item)}` : "",
      getItemWardBonus(item) ? `Ward ${getItemWardBonus(item)}` : "",
      getItemManaBonus(item) ? `Mana +${getItemManaBonus(item)}` : "",
      getItemStrBonus(item) ? `Str +${getItemStrBonus(item)}` : "",
      getItemDexBonus(item) ? `Dex +${getItemDexBonus(item)}` : "",
      getItemConBonus(item) ? `Con +${getItemConBonus(item)}` : "",
      getItemIntBonus(item) ? `Int +${getItemIntBonus(item)}` : "",
      getItemLightBonus(item) ? `Sight +${getItemLightBonus(item)}` : "",
      getItemSearchBonus(item) ? `Search +${getItemSearchBonus(item)}` : "",
      getItemFireResist(item) ? `Fire Resist ${getItemFireResist(item)}` : "",
      getItemColdResist(item) ? `Cold Resist ${getItemColdResist(item)}` : "",
      item.kind === "charged" && item.identified ? `Charges ${item.charges}/${item.maxCharges || item.charges}` : "",
      item.weight || item.weight === 0 ? `Weight ${item.weight || 0}` : "",
      `Value ${Math.floor(getItemValue(item))} gp`,
      canIdentify(item) && !item.identified ? "Unknown" : "Known",
      item.cursed ? "Cursed" : ""
    ].filter(Boolean);
    const actions = model.selection.type === "inventory"
      ? `
        <button class="menu-button pack-action-primary is-active" data-action="item-use" data-index="${model.selection.value}" data-focus-key="${this.getPackActionFocusKey("use", model.selection.value)}" type="button">${this.getPackItemActionLabel(item)}</button>
        ${shopId && selectedEntry?.sellHereTag
          ? `<button class="menu-button" data-action="shop-sell" data-index="${model.selection.value}" data-focus-key="${this.getShopSellFocusKey(model.selection.value)}" type="button">Sell</button>`
          : `<label class="mark-sale-toggle inspector-mark-toggle"><input type="checkbox" data-action="toggle-sale-mark" data-index="${model.selection.value}" data-focus-key="${this.getPackActionFocusKey("mark", model.selection.value)}" ${item.markedForSale ? "checked" : ""}><span>Mark For Sale</span></label>`}
        <button class="menu-button" data-action="item-drop" data-index="${model.selection.value}" data-focus-key="${this.getPackActionFocusKey("drop", model.selection.value)}" type="button">Drop</button>
      `
      : `
        <button class="menu-button pack-action-primary is-active" data-action="unequip-slot" data-slot="${model.selection.value}" data-focus-key="${this.getPackActionFocusKey("unequip", model.selection.value)}" type="button"${item.cursed ? " disabled" : ""}>Unequip</button>
      `;

    const equippedSwap = model.selection.type === "inventory" && item.slot
      ? model.comparison?.fitsEmptySlot
        ? `<div class="pack-inspector-note">Fits empty ${escapeHtml(this.getPackSlotDefinition(model.comparison.targetSlot).label)} slot.</div>`
        : model.comparison?.equipped
          ? `<div class="pack-inspector-note">Equips over ${escapeHtml(getItemName(model.comparison.equipped, true))}.</div>`
          : ""
      : "";

    const cursedNote = model.selection.type === "slot" && item.cursed
      ? `<div class="pack-inspector-note bad-note">${escapeHtml(getItemName(item, true))} is cursed and cannot be removed yet.</div>`
      : "";

    const comparisonBlock = model.selection.type === "inventory" && item.slot && (model.comparison?.comparisons?.length > 0 || model.comparison?.fitsEmptySlot || model.comparison?.blockedByCurse)
      ? `
        <div class="pack-comparison-card">
          <div class="pack-comparison-title">${model.comparison.fitsEmptySlot ? `Fits ${escapeHtml(this.getPackSlotDefinition(model.comparison.targetSlot).label)}` : model.comparison.equipped ? `Compare vs ${escapeHtml(getItemName(model.comparison.equipped, true))}` : "Accessory Fit"}</div>
          <div class="pack-comparison-list">
            ${model.comparison.blockedByCurse
              ? `<div class="pack-comparison-row value-bad">All ${escapeHtml(this.getPackSlotDefinition(item.slot).label.toLowerCase())} slots are locked by curses.</div>`
              : model.comparison.fitsEmptySlot
                ? `<div class="pack-comparison-row value-good">No swap needed. ${escapeHtml(this.getPackSlotDefinition(model.comparison.targetSlot).label)} is open.</div>`
                : ""}
            ${model.comparison.comparisons?.map((entry) => `
              <div class="pack-comparison-row"><strong>${escapeHtml(entry.label)}</strong>${entry.slot === model.comparison.targetSlot ? " · target" : ""}</div>
              ${entry.deltas.length > 0
                ? entry.deltas.map((delta) => `<div class="pack-comparison-row value-${delta.tone}">${escapeHtml(delta.text)}</div>`).join("")
                : `<div class="pack-comparison-row muted">No practical change.</div>`}
            `).join("") || ""}
          </div>
          <div class="pack-inspector-note ${model.encumbrancePreview.tone}">${escapeHtml(model.encumbrancePreview.text)}</div>
        </div>
      `
      : item.slot
        ? `<div class="pack-inspector-note ${model.encumbrancePreview.tone}">${escapeHtml(model.encumbrancePreview.text)}</div>`
        : "";

    const readyRows = model.selection.type === "slot" && model.compatibleIndexes.length > 0 && !item.cursed
      ? `
        <div class="pack-inspector-section">
          <strong>Ready To Equip</strong>
          <div class="pack-compatible-list">
            ${model.compatibleIndexes.map((index) => `
              <button class="tiny-button pack-ready-chip" data-action="inspect-pack-item" data-index="${index}" data-focus-key="${this.getPackItemFocusKey(index)}" type="button">${escapeHtml(getItemName(this.player.inventory[index]))}</button>
            `).join("")}
          </div>
        </div>
      `
      : "";

    return `
      <section class="hub-section pack-inspector-panel">
        <div class="panel-title">${model.selection.type === "slot" ? "Equipped Detail" : "Selected Item"}</div>
        ${hoverPreviewMarkup}
        <div class="pack-inspector-card">
          <div class="pack-inspector-kicker">${escapeHtml(recommendation)}</div>
          <div class="pack-inspector-title">${escapeHtml(getItemName(item))}</div>
          <div class="pack-inspector-summary">
            <span class="pack-decision-chip">${escapeHtml(model.slotDef ? model.slotDef.label : selectedEntry?.kindLabel || classifyItem(item))}</span>
            <span class="pack-decision-reason">${escapeHtml(reason)}</span>
          </div>
          <div class="pack-item-badges">${this.getItemBadgeMarkup(item, detailEntry, model)}</div>
          ${riskCallout ? `<div class="pack-risk-callout">${escapeHtml(riskCallout)}</div>` : ""}
          <div class="pack-inspector-copy">${escapeHtml(describeItem(item))}</div>
          <div class="pack-stat-grid">
            ${statLines.map((line) => `<div class="pack-stat-pill">${escapeHtml(line)}</div>`).join("")}
          </div>
          ${equippedSwap}
          ${comparisonBlock}
          ${cursedNote}
          ${readyRows}
          <div class="modal-actions pack-inspector-actions">
            ${actions}
          </div>
        </div>
      </section>
    `;
  }

  getHubTabsMarkup(activeTab) {
    const tabs = [
      { id: "pack", label: "Pack" },
      { id: "magic", label: "Magic" },
      { id: "journal", label: "Guide" }
    ];
    return `
      <div class="hub-tabs">
        ${tabs.map((tab) => `
          <button class="hub-tab${tab.id === activeTab ? " active" : ""}" data-action="open-hub" data-tab="${tab.id}" data-focus-key="${this.getHubTabFocusKey(tab.id)}" type="button">${tab.label}</button>
        `).join("")}
      </div>
    `;
  }

  getPackHubMarkup() {
    const shopId = this.getCurrentPackShopContext();
    let model = this.getPackSelectionModel();
    let inventoryModel = buildInventoryPresentationModel(this, {
      filter: this.activePackFilter,
      selectedIndex: model.selection.type === "inventory" ? model.selection.value : -1,
      shopId
    });
    if (inventoryModel.firstVisibleIndex >= 0 && (this.activePackFilter !== "all" || model.selection.type === "inventory") && !inventoryModel.selectedVisible) {
      this.setPackSelection({ type: "inventory", value: inventoryModel.firstVisibleIndex });
      model = this.getPackSelectionModel();
      inventoryModel = buildInventoryPresentationModel(this, {
        filter: this.activePackFilter,
        selectedIndex: model.selection.type === "inventory" ? model.selection.value : -1,
        shopId
      });
    }
    const burdenUi = inventoryModel.burdenUi;
    const equipmentValue = Object.values(this.player.equipment).reduce((sum, item) => sum + (item ? getItemValue(item) : 0), 0);
    const packValue = this.player.inventory.reduce((sum, item) => sum + getItemValue(item), 0);
    const buildSummary = inventoryModel.buildSummary;
    const paperdoll = this.getPackSlotDefinitions().map((slotDef) => {
      const item = this.player.equipment[slotDef.slot];
      const compatibleCount = inventoryModel.entries.filter((entry) => this.getEquipmentBaseSlot(entry.item.slot || "") === this.getEquipmentBaseSlot(slotDef.slot) && entry.recommendation === "Equip").length;
      const slotSummary = buildEquipmentSlotSummary(this, slotDef, compatibleCount);
      const isActive = model.selection.type === "slot" && model.selection.value === slotDef.slot;
      return `
        <button class="paper-slot slot-${slotDef.area}${isActive ? " active" : ""}" data-action="inspect-slot" data-slot="${slotDef.slot}" data-focus-key="${this.getPackSlotFocusKey(slotDef.slot)}" data-pack-preview-type="slot" data-pack-preview-value="${slotDef.slot}" type="button">
          <span class="paper-slot-label">${escapeHtml(slotDef.label)}</span>
          <span class="paper-slot-item">${item ? escapeHtml(getItemName(item)) : "Empty"}</span>
          <span class="paper-slot-quality">${escapeHtml(slotSummary.quality)}</span>
          <span class="paper-slot-note">${escapeHtml(slotSummary.reason)}</span>
          ${compatibleCount > 0 ? `<span class="paper-slot-badge">${compatibleCount} ready</span>` : ""}
        </button>
      `;
    }).join("");

    return `
      <div class="hub-body hub-body-pack">
        <div class="hub-summary hub-summary-compact">
          <div class="mini-panel"><strong>${escapeHtml(this.player.name)}</strong><br>${escapeHtml(`${this.player.race} ${this.player.className}`)}<div class="mini-panel-note">${escapeHtml(buildSummary.headline)}</div></div>
          <div class="mini-panel burden-panel burden-${burdenUi.state}"><strong>Burden</strong><br><span class="burden-value burden-${burdenUi.state}">${burdenUi.weight} / ${burdenUi.capacity}</span><div class="mini-meter burden burden-${burdenUi.state}"><span style="width:${burdenUi.percent}%"></span></div><span class="mini-panel-note">${escapeHtml(burdenUi.label)}</span></div>
          <div class="mini-panel"><strong>Attack / Armor</strong><br>${this.getAttackValue()} / ${this.getArmorValue()}<div class="mini-panel-note">Guard ${this.getGuardValue()} · Ward ${this.getWardValue()} · ${Math.floor(this.player.gold)} gp</div></div>
        </div>
        <div class="pack-layout">
          <section class="hub-section pack-equipment-panel">
            <div class="panel-title">Equipped Gear</div>
            <div class="pack-equipment-summary">
              <div class="pack-equipment-name">${escapeHtml(this.player.name)}</div>
              <div class="pack-equipment-copy">${escapeHtml(`${buildSummary.note}`)}</div>
              <div class="pack-build-tags">${buildSummary.tags.map((tag) => `<span class="item-chip">${escapeHtml(tag)}</span>`).join("")}</div>
            </div>
            <div class="pack-paperdoll">
              ${paperdoll}
            </div>
            <div class="inventory-detail pack-field-note">
              <strong>Pack Value</strong> ${Math.floor(packValue)} gp<br>
              <strong>Equipped Value</strong> ${Math.floor(equipmentValue)} gp
            </div>
          </section>
          <section class="hub-section pack-inventory-panel">
            <div class="panel-title">Pack Contents</div>
            ${this.getPackFilterMarkup(inventoryModel)}
            <div class="inventory-list-panel pack-list-panel">
              ${this.getInventoryGroupsMarkup(inventoryModel, model.selection.type === "inventory" ? model.selection.value : -1)}
            </div>
          </section>
          ${this.getPackInspectorMarkup(model, inventoryModel)}
        </div>
        ${shopId
          ? `<section class="hub-section inventory-detail pack-field-note"><strong>Shop Context</strong><br>${escapeHtml(this.pendingShop.name)} accepts the highlighted sell tags in this view.</section>`
          : ""}
      </div>
    `;
  }

  getMagicHubMarkup() {
    const pinnedSpellIds = this.getPinnedSpellIds();
    const sortedSpellIds = this.getSortedKnownSpellIds(this.player.spellsKnown);
    const selectedSpellId = this.targetMode?.spellId || this.pendingSpell || pinnedSpellIds[0] || sortedSpellIds[0] || "";
    const filterDefs = this.getSpellFilterDefsForEntries(sortedSpellIds.map((spellId) => SPELLS[spellId]).filter(Boolean));
    const activeFilter = filterDefs.some((entry) => entry.key === this.activeMagicFilter) ? this.activeMagicFilter : "all";
    const rows = sortedSpellIds.length === 0
      ? `<div class="text-block">No spells are known.</div>`
      : getSpellCategoryDefs().map((category) => {
        if (activeFilter !== "all" && activeFilter !== category.key) {
          return "";
        }
        const spellIds = sortedSpellIds.filter((spellId) => getSpellCategoryKey(SPELLS[spellId]) === category.key);
        if (spellIds.length === 0) {
          return "";
        }
        return `
          <section class="magic-category-group">
            <div class="magic-category-heading">
              <div class="magic-category-title">${escapeHtml(category.label)}</div>
              <div class="magic-category-count">${spellIds.length}</div>
            </div>
            <div class="magic-grid">
              ${spellIds.map((spellId) => {
                const spell = SPELLS[spellId];
                const manaCost = getSpellCost(this, spell);
                const overcast = this.player.mana < manaCost;
                const targetingLabel = this.getSpellTargetingLabel(spell);
                const pinnedIndex = pinnedSpellIds.indexOf(spellId);
                const isPinned = pinnedIndex >= 0;
                const trayFull = pinnedSpellIds.length >= this.getSpellTrayLimit();
                const isSelected = selectedSpellId === spellId;
                const pinLabel = isPinned
                  ? `Tray Slot ${pinnedIndex + 1}`
                  : "Book Only";
                return `
                  <article class="magic-card${isSelected ? " active" : ""}${isPinned ? " pinned" : ""}">
                    <button class="magic-card-select" data-action="spell-select" data-double-action="spell-cast" data-surface="book" data-spell="${spellId}" data-focus-key="${this.getSpellBookFocusKey(spellId)}" type="button">
                      <div class="magic-card-header">
                        <div class="magic-card-title">${escapeHtml(spell.name)}</div>
                        <div class="magic-card-cost${overcast ? " warning" : ""}">${manaCost} mana${overcast ? " / overcast" : ""}</div>
                      </div>
                      <div class="magic-card-tags">
                        <span class="spell-badge accent">${escapeHtml(category.label)}</span>
                        <span class="spell-badge">${escapeHtml(capitalize(spell.school || "spell"))}</span>
                        <span class="spell-badge subtle">${escapeHtml(targetingLabel)}</span>
                      </div>
                      <div class="magic-card-meta">${escapeHtml(`Tier ${spell.tier || 1} | ${capitalize(this.getSpellRoleLabel(spell))} | ${spell.target === "self" ? "Self cast" : `Range ${spell.range || 1}`}`)}</div>
                      <div class="magic-card-copy">${escapeHtml(spell.description)}</div>
                      <div class="magic-card-status">${escapeHtml(isSelected ? `${pinLabel} | Selected` : pinLabel)}</div>
                    </button>
                    <div class="magic-card-actions">
                      <button class="menu-button pack-action-primary" data-action="spell-cast" data-spell="${spellId}" data-focus-key="${this.getSpellCastFocusKey(spellId)}" type="button">Cast</button>
                      <button class="menu-button" data-action="spell-pin-toggle" data-spell="${spellId}" data-focus-key="hub:spell-pin:${spellId}" type="button"${!isPinned && trayFull ? " disabled" : ""}>${isPinned ? "Remove From Tray" : trayFull ? "Tray Full" : "Pin To Tray"}</button>
                      <button class="menu-button" data-action="spell-pin-up" data-spell="${spellId}" data-focus-key="hub:spell-up:${spellId}" type="button"${!isPinned || pinnedIndex === 0 ? " disabled" : ""}>Move Up</button>
                      <button class="menu-button" data-action="spell-pin-down" data-spell="${spellId}" data-focus-key="hub:spell-down:${spellId}" type="button"${!isPinned || pinnedIndex === pinnedSpellIds.length - 1 ? " disabled" : ""}>Move Down</button>
                    </div>
                  </article>
                `;
              }).join("")}
            </div>
          </section>
        `;
      }).join("");

    return `
      <div class="hub-body hub-body-magic">
        <div class="hub-summary hub-summary-compact">
          <div class="mini-panel"><strong>Mana</strong><br>${Math.floor(this.player.mana)} / ${this.player.maxMana}</div>
          <div class="mini-panel"><strong>Known</strong><br>${this.player.spellsKnown.length}</div>
          <div class="mini-panel"><strong>Tray</strong><br>${pinnedSpellIds.length} / ${this.getSpellTrayLimit()}</div>
          <div class="mini-panel"><strong>Casting</strong><br>${this.spellTrayOpen || this.mode === "target" ? "Field tray" : "Book view"}</div>
        </div>
        <section class="hub-section">
          <div class="panel-title">Spell Book</div>
          <div class="text-block magic-intro">Single-click selects a spell. Double-click or Cast starts it immediately. Spells are grouped by job so travel, identify, defense, and offense tools stay easy to scan on a phone. The field tray only shows pinned quick casts, so manage those tray slots here.</div>
          ${this.getSpellFilterChipsMarkup(activeFilter, "magic-filter", (key) => this.getMagicFilterFocusKey(key), "magic-filter-row", filterDefs)}
          <div class="magic-category-list">${rows}</div>
        </section>
      </div>
    `;
  }

  getJournalHubMarkup() {
    const activeSection = this.getResolvedJournalSection();
    const townCycle = this.getTownCycleState();
    const reactions = this.getTownReactionLines();
    const milestoneSummary = this.getQuestMilestoneSummary();
    const milestoneJournal = this.getActiveMilestoneJournalText();
    const currentChapter = this.getCurrentChapterObjective();
    const activeBriefing = this.getActiveBriefingText();
    const discoverySummary = this.getKnownDiscoveryLines();
    const namedLootSummary = this.getNamedLootLines();
    const roomEvent = this.currentLevel?.roomEvents?.[0] || null;
    const featuredStockSummary = Object.entries(townCycle.featuredStock || {})
      .map(([shopId, itemIds]) => {
        const label = SHOPS[shopId]?.name;
        const names = (itemIds || []).map((itemId) => ITEM_DEFS[itemId]?.name).filter(Boolean).join(", ");
        return label && names ? `${label}: ${names}` : "";
      })
      .filter(Boolean)
      .join(" | ");
    const questState = this.player.quest.complete
      ? "Returned to town with the Runestone."
      : this.player.quest.hasRunestone
        ? "The Runestone is in your possession. Return to town."
        : "Descend to the lowest halls and recover the Runestone.";
    const objectiveText = getObjectiveStatusText(this.currentLevel);
    const optionalText = getOptionalStatusText(this.currentLevel);
    const dangerText = getDangerSummary(this.currentLevel);
    const buildSummary = [
      ...(this.player.perks || []).map((id) => PERK_DEFS[id]?.name).filter(Boolean),
      ...(this.player.relics || []).map((id) => RELIC_DEFS[id]?.name).filter(Boolean)
    ];
    const telemetrySummary = this.getTelemetrySummary();
    const telemetryReview = this.getTelemetryReviewSnapshot();
    const latestSummary = (this.runSummaryHistory || []).at(-1) || this.lastRunSummary;
    const activeContract = this.getActiveContract(true) || this.getActiveContract(false);
    const masterySummary = this.getClassMasterySummary(this.player.classId);
    const archiveMarkup = this.getRunSummaryArchiveMarkup(3);
    const masteryMarkup = this.getMasteryReviewMarkup(this.player.classId);
    const contractMarkup = this.getContractReviewMarkup({ interactive: false });
    const metaReview = telemetryReview.meta || {};
    const telemetryRecent = telemetryReview.recentEvents.length > 0
      ? telemetryReview.recentEvents.map((entry) => `<div class="log-line">[T${entry.turn} D${entry.depth}] ${escapeHtml(entry.text)}</div>`).join("")
      : "<div class='muted'>No run telemetry captured yet.</div>";
    const sectionButtons = this.getJournalSectionDefs().map((section) => `
      <button class="hub-filter-chip${section.id === activeSection ? " active" : ""}" data-action="journal-section" data-section="${section.id}" data-focus-key="${this.getJournalSectionFocusKey(section.id)}" type="button">${section.label}</button>
    `).join("");
    const townStateLine = this.currentDepth === 0
      ? `${this.getTownCycleLabel()} | ${townCycle.stockSummary}`
      : `Deepest ${this.player.deepestDepth} | ${this.currentLevel?.encounterSummary || "The floor is still quiet enough to read."}`;
    const buildLine = buildSummary.length > 0
      ? buildSummary.join(", ")
      : "No perks or relics claimed yet.";
    const currentSectionMarkup = `
      <div class="field-guide-layout">
        <section class="hub-section">
          <div class="panel-title">Current Floor</div>
          <div class="text-block">
            <strong>${escapeHtml(this.currentLevel.description)}</strong><br><br>
            ${escapeHtml(objectiveText)}<br><br>
            ${escapeHtml(optionalText || questState)}
          </div>
          <div class="modal-actions utility-row">
            <button class="menu-button" data-action="open-hub" data-tab="pack" data-focus-key="journal:pack" type="button">Pack</button>
            <button class="menu-button" data-action="open-hub" data-tab="magic" data-focus-key="journal:magic" type="button">Magic</button>
            <button class="menu-button" data-action="view-map" data-focus-key="journal:map" type="button">Floor Map</button>
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Pressure</div>
          <div class="text-block">
            ${escapeHtml(dangerText)}<br><br>
            ${escapeHtml(this.currentLevel?.encounterSummary || "The floor is still quiet enough to read.")}
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Run Build</div>
          <div class="text-block">
            ${escapeHtml(buildLine)}<br><br>
            ${escapeHtml(getObjectiveRewardPreview(this.currentLevel) || "No objective reward preview available.")}
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">${this.currentDepth === 0 ? "Town State" : "Run State"}</div>
          <div class="text-block">
            ${escapeHtml(townStateLine)}<br><br>
            ${escapeHtml(milestoneSummary)}
            ${roomEvent ? `<br><br>${escapeHtml(`Signature room: ${roomEvent.label}. ${roomEvent.summary}`)}` : ""}
          </div>
        </section>
      </div>
    `;
    const missionSectionMarkup = `
      <div class="field-guide-layout">
        <section class="hub-section">
          <div class="panel-title">Mission Brief</div>
          <div class="text-block">
            <strong>${escapeHtml(currentChapter)}</strong><br><br>
            ${escapeHtml(activeBriefing)}
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Objective Path</div>
          <div class="text-block">
            ${escapeHtml(milestoneJournal)}<br><br>
            ${escapeHtml(questState)}
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Reward Stakes</div>
          <div class="text-block">
            ${escapeHtml(getObjectiveRewardPreview(this.currentLevel) || "No floor reward preview available.")}<br><br>
            ${latestSummary
              ? escapeHtml(`Last return: depth ${latestSummary.extractedDepth}, ${latestSummary.greedCount} greed room${latestSummary.greedCount === 1 ? "" : "s"}, ${latestSummary.returnValue} gp banked or carried.`)
              : "No banked return summary yet."}
          </div>
        </section>
      </div>
    `;
    const guideSectionMarkup = `
      <div class="field-guide-layout">
        <section class="hub-section help-panel">
          <div class="panel-title">Core Loop</div>
          <div class="text-block">
            Start in town, prep the build, enter the keep, clear the floor objective, then decide whether to extract or push deeper.
          </div>
        </section>
        <section class="hub-section help-panel">
          <div class="panel-title">Where Info Lives</div>
          <div class="text-block">
            HUD handles tactical-now status. Pack handles gear and burden. Magic handles tray management and casting. Field Guide holds mission, rules, and run history.
          </div>
        </section>
        <section class="hub-section help-panel">
          <div class="panel-title">Controls</div>
          <ul class="help-list">
            <li><strong>Keyboard:</strong> Arrows or numpad move. F searches. U uses. I opens pack. S opens magic. M opens the map. R rests. Shift+R sleeps until restored.</li>
            <li><strong>Controller:</strong> D-pad or left stick moves. A confirms or uses. B backs out of targeting and menus. X triggers the alternate action. Y opens pack. Start opens the run menu. Back toggles the map. LB or RB switch tabs. RT or the right stick scrolls long lists.</li>
            <li><strong>Touch:</strong> Use the on-screen pad for fallback movement and the dock for your main actions.</li>
          </ul>
        </section>
        <section class="hub-section help-panel">
          <div class="panel-title">Dungeon Rules</div>
          <ul class="help-list">
            <li>Search reveals hidden doors, traps, and better routes.</li>
            <li>Heavy burden lowers dodge and lets monsters press harder.</li>
            <li>Targeted spells and wands need line of sight.</li>
            <li>Resting and sleeping are noisy, and sleep breaks when a monster enters view.</li>
            <li>Enemy intent icons warn about rushes, ranged shots, summons, and other dangerous turns before they land.</li>
          </ul>
        </section>
      </div>
    `;
    const chronicleSectionMarkup = `
      <div class="field-guide-layout">
        <section class="hub-section">
          <div class="panel-title">Discoveries</div>
          <div class="text-block">
            ${discoverySummary.length > 0
              ? discoverySummary.map((line) => escapeHtml(line)).join("<br><br>")
              : "No written fragments recovered yet."}
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Town Cycle</div>
          <div class="text-block">
            ${escapeHtml(this.getTownCycleLabel())}<br><br>
            ${escapeHtml(townCycle.turnsUntilRefresh === 1 ? "Next market turnover in 1 turn." : `Next market turnover in ${townCycle.turnsUntilRefresh} turns.`)}<br><br>
            ${escapeHtml(townCycle.stockSummary)}<br>
            ${escapeHtml(townCycle.rumorSummary)}<br><br>
            ${escapeHtml(featuredStockSummary || "No featured market picks are posted yet.")}
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Town Reactions</div>
          <div class="text-block">
            ${reactions.lines.length > 0
              ? reactions.lines.slice(0, 4).map((line) => escapeHtml(line)).join("<br><br>")
              : "The town has not shifted around your run yet."}
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Named Loot</div>
          <div class="text-block">
            ${namedLootSummary.length > 0
              ? namedLootSummary.map((line) => escapeHtml(line)).join("<br>")
              : "No signature finds claimed yet."}
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Town Persistence</div>
          <div class="text-block">
            ${escapeHtml(activeContract ? `Active contract: ${activeContract.name}. Town Persistence, opt-in, next run only.` : "No contract armed for the next run.")}<br><br>
            ${escapeHtml(masterySummary)}<br><br>
            ${escapeHtml(`Contract adoption: ${Math.round((metaReview.armedRunStartRate || 0) * 100)}% of tracked runs started armed. Most armed: ${metaReview.mostArmedContract || "none yet"}.`)}
          </div>
          ${contractMarkup}
          <div class="section-block">
            <div class="field-label">Current Class Mastery</div>
            ${masteryMarkup}
          </div>
          <div class="section-block">
            <div class="field-label">Latest 3 Returns</div>
            ${archiveMarkup}
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Chronicle</div>
          <div class="message-log journal-log">${renderChronicleMarkup(this, 12)}</div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Run Telemetry</div>
          <div class="text-block">
            ${escapeHtml(`Events ${telemetrySummary.eventCount} | Searches ${telemetrySummary.searches} | Buys ${telemetrySummary.shopBuys} | Sells ${telemetrySummary.shopSells} | Spells ${telemetrySummary.spellsCast} | Items ${telemetrySummary.itemsUsed} | Returns ${telemetrySummary.townReturns}`)}<br><br>
            ${escapeHtml(latestSummary
              ? `Latest summary: ${latestSummary.outcome} | first objective ${latestSummary.firstObjectiveType || "unknown"} | clear turn ${latestSummary.firstObjectiveClearTurn ?? "?"} | greed ${latestSummary.greedCount}`
              : "No extraction or death summary recorded yet.")}
          </div>
          <div class="message-log journal-log">${telemetryRecent}</div>
        </section>
      </div>
    `;
    const activeSectionMarkup = activeSection === "mission"
      ? missionSectionMarkup
      : activeSection === "guide"
        ? guideSectionMarkup
        : activeSection === "chronicle"
          ? chronicleSectionMarkup
          : currentSectionMarkup;

    return `
      <div class="hub-body field-guide-body">
        <div class="hub-summary hub-summary-compact">
          <div class="mini-panel"><strong>Depth</strong><br>${this.currentDepth}</div>
          <div class="mini-panel"><strong>Turn</strong><br>${this.turn}</div>
          <div class="mini-panel"><strong>Objective</strong><br>${escapeHtml(objectiveText)}</div>
          <div class="mini-panel"><strong>Pressure</strong><br>${escapeHtml(this.dangerLevel)}</div>
        </div>
        <section class="hub-section field-guide-kicker">
          <div class="panel-title">Field Guide</div>
          <div class="text-block">One support surface for the current floor, mission context, rules reference, and the long-form run record.</div>
        </section>
        <div class="pack-filter-row journal-section-row">
          ${sectionButtons}
        </div>
        ${activeSectionMarkup}
      </div>
    `;
  }

  showHubModal(defaultTab = "pack", options = {}) {
    if (!this.player) {
      return;
    }
    const {
      selection = null,
      preserveScroll = false,
      focusTarget = null,
      fallbackFocus = true,
      journalSection = null
    } = options;
    this.mode = "modal";
    this.activeHubTab = ["pack", "magic", "journal"].includes(defaultTab) ? defaultTab : "pack";
    if (this.activeHubTab === "journal") {
      this.activeJournalSection = this.getResolvedJournalSection(journalSection || this.activeJournalSection);
    }
    this.recordTelemetry(this.activeHubTab === "magic"
      ? "magic_opened"
      : this.activeHubTab === "journal"
        ? "journal_opened"
        : "pack_opened");
    if (this.activeHubTab === "pack") {
      this.setPackSelection(selection || this.activePackSelection || this.getDefaultPackSelection());
      this.resolvePackSelection();
    } else {
      this.hoveredPackSelection = null;
    }

    const tabMarkup = this.getHubTabsMarkup(this.activeHubTab);
    const bodyMarkup = this.activeHubTab === "magic"
      ? this.getMagicHubMarkup()
      : this.activeHubTab === "journal"
        ? this.getJournalHubMarkup()
        : this.getPackHubMarkup();

    const title = this.activeHubTab === "magic"
      ? "Magic"
      : this.activeHubTab === "journal"
        ? "Field Guide"
        : "Pack & Equipment";

    this.showSimpleModal(title, `
      <div class="hub-window hub-window-${this.activeHubTab}">
        ${tabMarkup}
        ${bodyMarkup}
      </div>
    `, {
      surfaceKey: `hub:${this.activeHubTab}`,
      preserveScroll,
      focusTarget,
      fallbackFocus
    });
  }

  showInventoryModal() {
    this.showHubModal("pack");
  }

  showSpellModal() {
    this.showHubModal("magic");
  }

  getShopPanelTabsMarkup(activePanel = "buy") {
    return `
      <div class="pack-filter-row shop-panel-row">
        <button class="hub-filter-chip${activePanel === "buy" ? " active" : ""}" data-action="shop-panel" data-panel="buy" data-focus-key="${this.getShopPanelFocusKey("buy")}" type="button">Buy</button>
        <button class="hub-filter-chip${activePanel === "sell" ? " active" : ""}" data-action="shop-panel" data-panel="sell" data-focus-key="${this.getShopPanelFocusKey("sell")}" type="button">Sell</button>
      </div>
    `;
  }

  groupShopEntriesByCategory(entries = [], getCategoryKey) {
    return getInventoryCategoryDefs().map((category) => ({
      ...category,
      entries: entries.filter((entry) => getCategoryKey(entry) === category.key)
    })).filter((group) => group.entries.length > 0);
  }

  showShopModal(shopId, shop, options = {}) {
    const {
      preserveScroll = false,
      focusTarget = null,
      fallbackFocus = true,
      panel = null
    } = options;
    this.mode = "modal";
    const previousShopId = this.pendingShop?.id || "";
    this.pendingShop = { ...shop, id: shopId };
    this.pendingService = null;
    this.activeShopPanel = panel || (previousShopId === shopId ? this.activeShopPanel : "buy");
    const townCycle = this.getTownCycleState();
    const reactions = this.getTownReactionLines(shopId);
    const returnSting = this.getTownReturnStingText();
    const turnoverLabel = townCycle.turnsUntilRefresh === 1 ? "1 turn" : `${townCycle.turnsUntilRefresh} turns`;
    const state = this.shopState[shopId] || { stock: [...shop.stock], buyback: [] };
    const liveStock = [...state.stock, ...state.buyback];
    const featuredToday = (townCycle.featuredStock?.[shopId] || [])
      .map((itemId) => ITEM_DEFS[itemId]?.name)
      .filter(Boolean)
      .join(", ");
    const stockEntries = liveStock.map((itemId) => {
      const item = createTownItem(itemId);
      const semanticEntry = buildInventoryItemSemantics(this, item, -1, { shopId });
      return {
        itemId,
        item,
        semanticEntry,
        price: getShopBuyPrice(this, item, shopId)
      };
    });
    const stockGroups = this.groupShopEntriesByCategory(stockEntries, (entry) => entry.semanticEntry.categoryKey);
    const stockRows = stockEntries.length === 0
      ? `<div class="text-block muted">The shelves are empty. Fresh stock arrives in ${escapeHtml(turnoverLabel)}.</div>`
      : stockGroups.map((group) => `
        <div class="shop-sell-group">
          <div class="field-label">${escapeHtml(group.label)}</div>
          ${group.entries.map((entry) => `
            <div class="shop-row">
              <div>
                <div><strong>${escapeHtml(getItemName(entry.item, true))}</strong> <span class="muted">${entry.price} gp</span></div>
                <div class="muted">${escapeHtml(describeItem(entry.item))}</div>
                ${this.getPackRowTagMarkup(entry.semanticEntry)}
              </div>
              <div class="actions">
                <button class="tiny-button" data-action="shop-buy" data-shop="${shopId}" data-item="${entry.itemId}" data-focus-key="${this.getShopBuyFocusKey(shopId, entry.itemId)}" type="button"${this.player.gold < entry.price ? " disabled" : ""}>Buy</button>
              </div>
            </div>
          `).join("")}
        </div>
      `).join("");

    const sellModel = buildInventoryPresentationModel(this, {
      filter: "sell",
      selectedIndex: this.activePackSelection?.type === "inventory" ? this.activePackSelection.value : -1,
      shopId
    });
    const markedSellEntries = this.player.inventory.filter((item) => item?.markedForSale && (shopId === "junk" || shopAcceptsItem(shopId, item)));
    const markedSellValue = markedSellEntries.reduce((sum, item) => sum + getShopSellPrice(this, item, shopId), 0);
    const sellEntries = sellModel.groups.flatMap((group) => group.sections.flatMap((section) => section.items));
    const sellGroups = this.groupShopEntriesByCategory(sellEntries, (entry) => entry.categoryKey);
    const sellRows = sellModel.visibleCount === 0
      ? `<div class="text-block">Nothing here matches what this shop buys.</div>`
      : sellGroups.map((group) => `
        <div class="shop-sell-group">
          <div class="field-label">${escapeHtml(group.label)}</div>
          ${group.entries.map((entry) => `
            <div class="shop-row">
              <div>
                <div><strong>${escapeHtml(getItemName(entry.item))}</strong>${entry.count > 1 ? ` <span class="muted">x${entry.count}</span>` : ""} <span class="muted">${getShopSellPrice(this, entry.item, shopId)} gp</span></div>
                <div class="muted">${escapeHtml(entry.reason)}</div>
                ${this.getPackRowTagMarkup(entry)}
                <div class="muted">${escapeHtml(this.getPackItemNote(entry.item, entry))}</div>
              </div>
              <div class="actions">
                <label class="mark-sale-toggle">
                  <input type="checkbox" data-action="toggle-sale-mark" data-index="${entry.index}" data-shop-sell-row="true" data-focus-key="${this.getShopSellFocusKey(entry.index)}:mark" ${entry.item.markedForSale ? "checked" : ""}>
                  <span>Mark</span>
                </label>
                <button class="tiny-button" data-action="shop-sell" data-index="${entry.index}" data-focus-key="${this.getShopSellFocusKey(entry.index)}" type="button">Sell</button>
              </div>
            </div>
          `).join("")}
        </div>
      `).join("");
    const panelTabs = this.getShopPanelTabsMarkup(this.activeShopPanel);
    const panelBody = this.activeShopPanel === "sell"
      ? `
        <div class="section-block">
          <div class="field-label">Sell</div>
          <div class="modal-actions utility-row">
            <button class="menu-button" data-action="shop-sell-marked" data-focus-key="shop:sell-marked" type="button"${markedSellEntries.length === 0 ? " disabled" : ""}>Sell Marked${markedSellEntries.length > 0 ? ` (${markedSellEntries.length})` : ""}</button>
            <button class="menu-button" data-action="open-hub" data-tab="pack" data-filter="sell" data-focus-key="shop:review-pack" type="button">Review Pack</button>
          </div>
          <div class="text-block muted">${escapeHtml(markedSellEntries.length > 0 ? `${markedSellEntries.length} marked item${markedSellEntries.length === 1 ? "" : "s"} will sell here for ${markedSellValue} gp.` : "Use the checkboxes to mark items, then sell the whole marked bundle here.")}</div>
          ${sellRows}
        </div>
      `
      : `
        <div class="section-block">
          <div class="field-label">Buy</div>
          ${stockRows}
        </div>
      `;

    this.showSimpleModal(`${shop.name}`, `
      <div class="section-block text-block">${escapeHtml(shop.greeting)}</div>
      <div class="section-block">
        <div class="stat-line"><span>Your gold</span><strong>${Math.floor(this.player.gold)} gp</strong></div>
        <div class="stat-line"><span>Town cycle</span><strong>${escapeHtml(this.getTownCycleLabel())}</strong></div>
        <div class="stat-line"><span>Stock turnover</span><strong>${escapeHtml(turnoverLabel)}</strong></div>
        <div class="stat-line"><span>Phase note</span><strong>${escapeHtml(townCycle.stockSummary)}</strong></div>
        <div class="stat-line"><span>Featured today</span><strong>${escapeHtml(featuredToday || "No special picks")}</strong></div>
        <div class="stat-line"><span>Reaction tags</span><strong>${escapeHtml(reactions.stockTags.join(", ") || "None")}</strong></div>
      </div>
      ${reactions.lines.length > 0 ? `
        <div class="section-block text-block">${escapeHtml(reactions.lines[0])}</div>
      ` : ""}
      ${returnSting ? `<div class="section-block text-block muted">${escapeHtml(returnSting)}</div>` : ""}
      ${panelTabs}
      ${panelBody}
    `, {
      surfaceKey: `shop:${shopId}`,
      preserveScroll,
      focusTarget,
      fallbackFocus
    });
  }

  showTempleModal(options = {}) {
    const {
      preserveScroll = false,
      focusTarget = null,
      fallbackFocus = true
    } = options;
    this.mode = "modal";
    this.pendingShop = null;
    this.pendingService = { type: "temple" };
    const townCycle = this.getTownCycleState();
    const reactions = this.getTownReactionLines("temple");
    const returnSting = this.getTownReturnStingText();
    this.showSimpleModal("Temple", `
      <div class="section-block text-block">${escapeHtml(STORY_NPCS.templeKeeper.name)}, ${escapeHtml(STORY_NPCS.templeKeeper.title)}, offers healing, restoration, and the expensive correction of cursed mistakes.</div>
      <div class="section-block">
        <div class="stat-line"><span>Your gold</span><strong>${Math.floor(this.player.gold)} gp</strong></div>
        <div class="stat-line"><span>Town cycle</span><strong>${escapeHtml(this.getTownCycleLabel())}</strong></div>
        <div class="stat-line"><span>Phase note</span><strong>${escapeHtml(townCycle.stockSummary)}</strong></div>
      </div>
      ${reactions.lines.length > 0 ? `<div class="section-block text-block">${escapeHtml(reactions.lines[0])}</div>` : ""}
      ${returnSting ? `<div class="section-block text-block muted">${escapeHtml(returnSting)}</div>` : ""}
      ${TEMPLE_SERVICES.map((service) => `
        <div class="shop-row">
          <div>
            <div><strong>${escapeHtml(service.name)}</strong> <span class="muted">${getTemplePrice(this, service.price)} gp</span></div>
            <div class="muted">${escapeHtml(service.description)}</div>
          </div>
          <div class="actions">
            <button class="tiny-button" data-action="service-use" data-service="${service.id}" data-focus-key="${this.getServiceFocusKey("temple", service.id)}" type="button">Use</button>
          </div>
        </div>
      `).join("")}
    `, {
      surfaceKey: "temple",
      preserveScroll,
      focusTarget,
      fallbackFocus
    });
  }

  showSageModal(options = {}) {
    const {
      preserveScroll = false,
      focusTarget = null,
      fallbackFocus = true
    } = options;
    this.mode = "modal";
    this.pendingShop = null;
    this.pendingService = { type: "sage" };
    const unknownCount = countUnknownItems(this.player);
    const sagePrice = getSagePrice(this);
    const townCycle = this.getTownCycleState();
    const reactions = this.getTownReactionLines("guild");
    const returnSting = this.getTownReturnStingText();
    this.showSimpleModal("Sage's Tower", `
      <div class="section-block text-block">${escapeHtml(STORY_NPCS.guildSage.name)} identifies your mysterious belongings for a flat fee and keeps the old warding records close at hand.</div>
      <div class="section-block">
        <div class="stat-line"><span>Your gold</span><strong>${Math.floor(this.player.gold)} gp</strong></div>
        <div class="stat-line"><span>Unknown items</span><strong>${unknownCount}</strong></div>
        <div class="stat-line"><span>Price</span><strong>${sagePrice} gp</strong></div>
        <div class="stat-line"><span>Town cycle</span><strong>${escapeHtml(this.getTownCycleLabel())}</strong></div>
        <div class="stat-line"><span>Phase note</span><strong>${escapeHtml(townCycle.rumorSummary)}</strong></div>
      </div>
      ${reactions.lines.length > 0 ? `<div class="section-block text-block">${escapeHtml(reactions.lines[0])}</div>` : ""}
      ${returnSting ? `<div class="section-block text-block muted">${escapeHtml(returnSting)}</div>` : ""}
      <div class="modal-actions">
        <button class="menu-button" data-action="service-use" data-service="identifyAll" data-focus-key="${this.getServiceFocusKey("sage", "identifyAll")}" type="button">Identify</button>
        <button class="menu-button" data-action="close-modal" data-focus-key="sage:close" type="button">Close</button>
      </div>
    `, {
      surfaceKey: "sage",
      preserveScroll,
      focusTarget,
      fallbackFocus
    });
  }

  showBankModal(options = {}) {
    const {
      preserveScroll = false,
      focusTarget = null,
      fallbackFocus = true
    } = options;
    this.mode = "modal";
    this.storyFlags.postReturnBankPrompt = false;
    ensureTownMetaState(this);
    this.recordTelemetry("bank_persistence_viewed", {
      activeContractId: this.getActiveContract(false)?.id || ""
    });
    this.recordTelemetry("mastery_viewed", {
      classId: this.player?.classId || ""
    });
    const townCycle = this.getTownCycleState();
    const reactions = this.getTownReactionLines("bank");
    const returnSting = this.getTownReturnStingText();
    const investmentPreview = {
      supply_cache: "Next refresh: provisioner adds another emergency tool.",
      guild_license: "Next refresh: guild stock opens deeper books and charged tools.",
      temple_favors: "Now: temple prices drop. Later: blood altars, oath shrines, and pilgrim pools can appear below.",
      archive_maps: "Next intel pull gets cheaper and cursed caches can start appearing.",
      ghost_bargains: "Future floors can roll ghost merchants.",
      deep_contracts: "Future floors can roll vault rooms and stronger reward tables."
    };
    const unlockRows = getAvailableTownUnlocks(this).slice(0, 3).map((unlockDef) => `
      <div class="shop-row">
        <div>
          <div><strong>${escapeHtml(unlockDef.name)}</strong> <span class="muted">${unlockDef.cost} gp</span></div>
          <div class="muted">${escapeHtml(unlockDef.description)}</div>
          <div class="muted">${escapeHtml(investmentPreview[unlockDef.id] || "Improves the next few descents for this adventurer.")}</div>
        </div>
        <div class="actions">
          <button class="tiny-button" data-action="town-unlock" data-unlock="${unlockDef.id}" data-focus-key="${this.getTownUnlockFocusKey(unlockDef.id)}" type="button"${this.player.gold < unlockDef.cost ? " disabled" : ""}>Fund</button>
        </div>
      </div>
    `).join("");
    const intel = getTownIntel(this);
    const townMeta = this.getTownMetaSummary();
    const masterySummary = this.getClassMasterySummary(this.player?.classId);
    const latestSummary = (this.runSummaryHistory || []).at(-1) || this.lastRunSummary;
    const contractModel = this.getContractViewModel();
    const masteryMarkup = this.getMasteryReviewMarkup(this.player?.classId);
    const archiveMarkup = this.getRunSummaryArchiveMarkup(5);
    const featuredStockSummary = Object.entries(intel.featuredStock || {})
      .map(([shopId, itemIds]) => {
        const label = SHOPS[shopId]?.name;
        const names = (itemIds || []).map((itemId) => ITEM_DEFS[itemId]?.name).filter(Boolean).join(", ");
        return label && names ? `${label}: ${names}` : "";
      })
      .filter(Boolean)
      .join(" | ");
    const nextRumor = intel.nextRumor
      ? `<div class="text-block">${escapeHtml(intel.nextRumor.text)}</div>`
      : `<div class="text-block muted">No clear rumor about the next floor yet.</div>`;
    const knownRumors = intel.known.length > 0
      ? intel.known.map((rumor) => `<div class="log-line">${escapeHtml(rumor.text)}</div>`).join("")
      : "<div class='muted'>No secured rumors yet.</div>";
    const prepAdvice = this.getTownPrepAdvice();
    const nextRunIntent = this.getNextRunIntent(this.player?.classId);
    const carryForward = this.getTownCarryForwardSummary();
    const recommendedText = contractModel.recommendedId
      ? `Recommended next run: ${contractModel.all.find((contract) => contract.id === contractModel.recommendedId)?.name || contractModel.recommendedId}. ${contractModel.recommendedReason}`
      : "No contract recommendation available.";
    const recommendedTownActionButton = townMeta.recommendedActionId === "contract_recommended"
      ? `<button class="menu-button primary" data-action="contract-arm-recommended" data-focus-key="bank:recommended-contract" type="button">${escapeHtml(townMeta.recommendedActionLabel)}</button>`
      : townMeta.recommendedActionId?.startsWith("town_unlock:")
        ? `<button class="menu-button primary" data-action="town-unlock" data-unlock="${townMeta.recommendedActionId.split(":")[1]}" data-focus-key="bank:recommended-unlock" type="button"${this.player.gold < (townMeta.nextUnlock?.cost || 0) ? " disabled" : ""}>${escapeHtml(townMeta.recommendedActionLabel)}</button>`
        : townMeta.recommendedActionId === "town_rumor"
          ? `<button class="menu-button primary" data-action="town-rumor" data-focus-key="bank:recommended-rumor" type="button">${escapeHtml(townMeta.recommendedActionLabel)}</button>`
          : townMeta.recommendedActionId === "bank_withdraw"
            ? `<button class="menu-button primary" data-action="bank-withdraw" data-focus-key="bank:recommended-withdraw" type="button">${escapeHtml(townMeta.recommendedActionLabel)}</button>`
            : townMeta.recommendedActionId === "bank_deposit"
              ? `<button class="menu-button primary" data-action="bank-deposit" data-focus-key="bank:recommended-deposit" type="button">${escapeHtml(townMeta.recommendedActionLabel)}</button>`
              : "";
    this.showSimpleModal("Bank", `
      <div class="section-block text-block">${escapeHtml(STORY_NPCS.chronicler.name)} keeps the ledgers while ${escapeHtml(STORY_NPCS.steward.name)} turns banked gold into safer carry, forward intel, and funded leverage for this adventurer.</div>
      <div class="section-block text-block">
        Bank gold for safety on the next descent.<br>
        Buy intel to learn the next floor before you walk into it.<br>
        Fund projects to improve stock and encounters for this current campaign.<br>
        Contracts stay opt-in and apply to the next run only.
      </div>
      <div class="section-block">
        <div class="field-label">Next Run Prep</div>
        <div class="stat-line"><span>On Hand</span><strong>${Math.floor(this.player.gold)} gp</strong></div>
        <div class="stat-line"><span>On Account</span><strong>${Math.floor(this.player.bankGold)} gp</strong></div>
        <div class="stat-line"><span>Rumor Tokens</span><strong>${this.player.runCurrencies?.rumorTokens || 0}</strong></div>
        <div class="stat-line"><span>Town Cycle</span><strong>${escapeHtml(this.getTownCycleLabel())}</strong></div>
        <div class="stat-line"><span>Next Turnover</span><strong>${escapeHtml(townCycle.turnsUntilRefresh === 1 ? "1 turn" : `${townCycle.turnsUntilRefresh} turns`)}</strong></div>
        <div class="stat-line"><span>Phase note</span><strong>${escapeHtml(townCycle.rumorSummary)}</strong></div>
      </div>
      ${reactions.lines.length > 0 ? `<div class="section-block text-block">${escapeHtml(reactions.lines[0])}</div>` : ""}
      ${returnSting ? `<div class="section-block text-block muted">${escapeHtml(returnSting)}</div>` : ""}
      <div class="section-block text-block">${escapeHtml(prepAdvice)}</div>
      <div class="section-block">
        <div class="field-label">One More Run</div>
        <div class="text-block">${nextRunIntent.motivators.map((entry) => escapeHtml(`${entry.label} ${entry.detail}`)).join("<br><br>")}</div>
      </div>
      <div class="section-block">
        <div class="field-label">Recommended Next Action</div>
        <div class="text-block">
          ${escapeHtml(townMeta.recommendedAction)}<br><br>
          ${escapeHtml(townMeta.recommendedReason)}
        </div>
        ${recommendedTownActionButton ? `<div class="modal-actions inline-modal-actions">${recommendedTownActionButton}</div>` : ""}
      </div>
      <div class="modal-actions">
        <button class="menu-button" data-action="bank-deposit" data-focus-key="${this.getTownActionFocusKey("deposit")}" type="button">Deposit 100</button>
        <button class="menu-button" data-action="bank-withdraw" data-focus-key="${this.getTownActionFocusKey("withdraw")}" type="button">Withdraw 100</button>
        <button class="menu-button" data-action="town-rumor" data-focus-key="${this.getTownActionFocusKey("rumor")}" type="button">Buy Intel (${getRumorPrice(this)} gp)</button>
        <button class="menu-button" data-action="close-modal" data-focus-key="bank:close" type="button">Close</button>
      </div>
      <div class="section-block">
        <div class="text-block">${escapeHtml(recommendedText)}</div><br>
        <div class="text-block muted">${escapeHtml(carryForward)}</div><br>
        <div class="field-label">Next Floor Intel</div>
        ${nextRumor}
      </div>
      <div class="section-block">
        <div class="field-label">Featured Market Picks</div>
        <div class="text-block">${escapeHtml(featuredStockSummary || "No featured wares are posted for this cycle.")}</div>
      </div>
      <div class="section-block">
        <div class="field-label">Investments</div>
        ${unlockRows || "<div class='text-block muted'>All current town investments are funded.</div>"}
      </div>
      <div class="section-block">
        <div class="field-label">Contracts</div>
        <div class="text-block">
          Town Persistence. Opt-in. Applies to next run only.
        </div>
        ${this.getContractReviewMarkup()}
      </div>
      <div class="section-block">
        <div class="field-label">Mastery</div>
        <div class="text-block">
          ${escapeHtml(`Class-based. Permanent. Finite ranks. ${masterySummary}`)}
        </div>
        ${masteryMarkup}
      </div>
      <div class="section-block">
        <div class="field-label">Return Archive</div>
        ${archiveMarkup}
      </div>
      <div class="section-block">
        <div class="field-label">Rumor Archive</div>
        <div class="message-log journal-log">${knownRumors}</div>
      </div>
    `, {
      surfaceKey: "bank",
      preserveScroll,
      focusTarget,
      fallbackFocus
    });
  }

  getSaveSlotLabel(slotId = 1) {
    return `Slot ${slotId}`;
  }

  getSaveSlotSummaryMarkup(options = {}) {
    const {
      action = "load",
      actionLabel = action === "save" ? "Save Here" : "Load",
      buttonClass = "tiny-button",
      focusPrefix = `save-slot:${action}`,
      includeButtons = true
    } = options;
    const latestMeta = this.getSavedRunMeta();
    return `
      <div class="save-slot-list${buttonClass === "tiny-button" ? " compact" : ""}">
        ${this.getAllSavedRunMeta().map(({ slotId, meta }) => {
          const disabled = action === "save" ? !this.player : !meta;
          const isActive = this.activeSaveSlotId === slotId;
          const isLatest = latestMeta?.slotId === slotId;
          const slotBadges = [
            isActive ? `<span class="save-slot-badge active">Active</span>` : "",
            isLatest ? `<span class="save-slot-badge">Latest</span>` : ""
          ].filter(Boolean).join("");
          const classLine = meta?.className ? ` | ${escapeHtml(meta.className)}` : "";
          const raceLine = meta?.raceName ? ` | ${escapeHtml(meta.raceName)}` : "";
          const timeLine = meta?.savedAt ? this.formatSaveStamp(meta.savedAt) : "";
          const buttonLabel = action === "save"
            ? (meta ? "Overwrite" : actionLabel)
            : actionLabel;
          return `
            <section class="save-slot-card${isActive ? " active" : ""}">
              <div class="save-slot-head">
                <div class="save-slot-title-row">
                  <strong class="save-slot-title">${this.getSaveSlotLabel(slotId)}</strong>
                  ${slotBadges}
                </div>
                <div class="save-slot-name">${meta ? escapeHtml(meta.name) : "Empty slot"}</div>
                <div class="save-slot-meta">${meta ? `Level ${meta.level} | Depth ${meta.depth}${classLine}${raceLine}` : action === "save" ? "No run saved here yet." : "No saved run in this slot."}</div>
                ${timeLine ? `<div class="save-slot-meta">${escapeHtml(timeLine)}</div>` : ""}
              </div>
              ${includeButtons ? `
                <div class="save-slot-actions">
                  <button class="${buttonClass}" data-action="${action === "save" ? "save-game" : "load-game"}" data-save-slot="${slotId}" data-focus-key="${focusPrefix}:${slotId}" type="button"${disabled ? " disabled" : ""}>${buttonLabel}</button>
                </div>
              ` : ""}
            </section>
          `;
        }).join("")}
      </div>
    `;
  }

  showSaveSlotsModal(mode = "load", options = {}) {
    const { preserveScroll = false, focusTarget = null } = options;
    const hasAnySave = this.getAllSavedRunMeta().some((entry) => Boolean(entry.meta));
    const latestMeta = this.getSavedRunMeta();
    const resolvedFocus = focusTarget
      || (mode === "save"
        ? `save-slots:save:${this.activeSaveSlotId || 1}`
        : latestMeta
          ? `save-slots:load:${latestMeta.slotId}`
          : null);
    const intro = mode === "save"
      ? (this.player ? "Choose a slot for this run. Existing slots can be overwritten." : "No active run is available to save.")
      : (hasAnySave ? "Choose which save slot to continue from." : "No saved runs are available yet.");
    const musicControls = !this.player ? `
      <div class="save-slot-music-banner">
        <div class="title-audio-copy">
          <div class="title-audio-label">Title Theme</div>
          <div class="title-audio-note" data-role="title-music-note"></div>
        </div>
        <button class="action-button title-audio-toggle" data-action="toggle-music" data-role="title-music-toggle" data-focus-key="save-slots:music" type="button">${escapeHtml(this.getMusicToggleLabel())}</button>
      </div>
    ` : "";
    this.mode = "modal";
    this.showSimpleModal(mode === "save" ? "Save Slots" : "Continue Run", `
      <div class="section-block text-block">${escapeHtml(intro)}</div>
      ${musicControls}
      <div class="save-slot-modal">
        ${this.getSaveSlotSummaryMarkup({
          action: mode,
          actionLabel: mode === "save" ? "Save Here" : "Continue",
          buttonClass: "menu-button",
          focusPrefix: `save-slots:${mode}`
        })}
      </div>
    `, {
      surfaceKey: `save-slots:${mode}`,
      preserveScroll,
      focusTarget: resolvedFocus
    });
    this.syncMusicToggleUi();
    this.syncSurfaceMusic();
  }

  showHelpModal(options = {}) {
    if (this.player && this.mode !== "title") {
      this.showHubModal("journal", {
        preserveScroll: this.mode === "modal",
        focusTarget: this.getJournalSectionFocusKey("guide"),
        journalSection: "guide"
      });
      return;
    }
    this.mode = "modal";
    this.showSimpleModal("How to Play", `
      <div class="section-block help-panel">
        <div class="field-label">Core Loop</div>
        <div class="text-block">
          Start in town, prep the build, enter the keep, clear the floor objective, then decide whether to extract or push deeper.
        </div>
      </div>
      <div class="section-block help-panel">
        <div class="field-label">Controls</div>
        <ul class="help-list">
          <li><strong>Keyboard:</strong> Arrows or numpad move. F searches. U uses. I opens pack. S opens magic. M opens the map. R rests. Shift+R sleeps until restored.</li>
          <li><strong>Controller:</strong> D-pad or left stick moves. A confirms or uses. B backs out of targeting and menus. X triggers the alternate action. Y opens pack. Start opens the run menu. Back toggles the map. LB or RB switch tabs. RT or the right stick scrolls long lists.</li>
          <li><strong>Touch:</strong> Use the on-screen pad for fallback movement and the dock for your main actions.</li>
        </ul>
      </div>
      <div class="section-block help-panel">
        <div class="field-label">Dungeon Rules</div>
        <ul class="help-list">
          <li>Search reveals hidden doors, traps, and better routes.</li>
          <li>Heavy burden lowers dodge and lets monsters press harder.</li>
          <li>Targeted spells and wands need line of sight.</li>
          <li>Resting and sleeping are noisy, and sleep breaks when a monster enters view.</li>
          <li>Enemy intent icons warn about rushes, ranged shots, summons, and other dangerous turns before they land.</li>
        </ul>
      </div>
    `, {
      surfaceKey: "help",
      closeLabel: options.closeLabel || "Close",
      modalReturnContext: options.modalReturnContext || null
    });
  }

  showUtilityMenu(options = {}) {
    const {
      focusTarget = null,
      openerFocusKey = undefined
    } = options;
    const currentOpenerFocusKey = this.getCurrentUiFocusKey() || "utility-menu-button";
    if (typeof openerFocusKey === "string") {
      this.utilityMenuOpenerFocusKey = openerFocusKey || null;
    } else if (currentOpenerFocusKey) {
      this.utilityMenuOpenerFocusKey = currentOpenerFocusKey;
    }
    this.mode = "modal";
    this.setModalVisibility(true);
    const template = document.getElementById("utility-menu-template");
    const fragment = template.content.cloneNode(true);
    const savedMeta = this.getSavedRunMeta();
    const savedSlots = this.getAllSavedRunMeta();
    const hasSavedRun = savedSlots.some((entry) => Boolean(entry.meta));
    const connected = this.gamepadInput.isConnected();
    const utilityRunSummary = fragment.getElementById("utility-run-summary");
    const utilitySaveSummary = fragment.getElementById("utility-save-summary");
    const utilityControlSummary = fragment.getElementById("utility-control-summary");
    const utilitySaveButton = fragment.getElementById("utility-save-button");
    const utilityLoadButton = fragment.getElementById("utility-load-button");
    const utilityStatsButton = fragment.getElementById("utility-stats-button");
    const activeContract = this.getActiveContract(true) || this.getActiveContract(false);
    const latestSummary = this.getLatestPersistenceSummary();
    const latestUnlock = this.getLatestPermanentUnlock();

    if (utilityRunSummary) {
      utilityRunSummary.innerHTML = this.player
        ? `
          <div class="utility-menu-title">${escapeHtml(this.player.name)} &middot; ${escapeHtml(this.currentDepth === 0 ? "Town" : `Depth ${this.currentDepth}`)}</div>
          <div class="utility-menu-meta">${escapeHtml(this.currentLevel?.description || "Run in progress.")}</div>
          <div class="utility-menu-meta">${escapeHtml(activeContract ? `Active contract: ${activeContract.name}` : "Active contract: none armed")}</div>
        `
        : `
          <div class="utility-menu-title">No active run</div>
          <div class="utility-menu-meta">Start a new adventurer to begin a descent.</div>
          <div class="utility-menu-meta">${escapeHtml(activeContract ? `Active contract: ${activeContract.name}` : "Active contract: none armed")}</div>
        `;
    }

    if (utilitySaveSummary) {
      if (!savedMeta) {
        utilitySaveSummary.innerHTML = `
          <div class="utility-menu-title">No saved run</div>
          <div class="utility-menu-meta">Save slots appear here once you bank a run.</div>
          <div class="utility-menu-meta">${escapeHtml(latestSummary ? `Latest return: ${latestSummary.outcome} depth ${latestSummary.extractedDepth}, ${latestSummary.returnValue} gp value.` : "Latest return: none recorded yet.")}</div>
          <div class="utility-menu-meta">${escapeHtml(latestUnlock ? `Latest permanent unlock: ${latestUnlock}` : "Latest permanent unlock: none yet.")}</div>
          ${this.getSaveSlotSummaryMarkup({
            action: "load",
            actionLabel: "Load",
            focusPrefix: "utility:load-slot"
          })}
        `;
      } else {
        const timeLabel = savedMeta.savedAt ? this.formatSaveStamp(savedMeta.savedAt) : null;
        utilitySaveSummary.innerHTML = `
          <div class="utility-menu-title">${escapeHtml(savedMeta.name)}</div>
          <div class="utility-menu-meta">${escapeHtml(this.getSaveSlotLabel(savedMeta.slotId || 1))} &middot; ${escapeHtml(`Level ${savedMeta.level} | Depth ${savedMeta.depth}`)}</div>
          ${timeLabel ? `<div class="utility-menu-meta">${escapeHtml(timeLabel)}</div>` : ""}
          <div class="utility-menu-meta">${escapeHtml(latestSummary ? `Latest return: ${latestSummary.outcome} depth ${latestSummary.extractedDepth}, ${latestSummary.returnValue} gp value.` : "Latest return: none recorded yet.")}</div>
          <div class="utility-menu-meta">${escapeHtml(latestUnlock ? `Latest permanent unlock: ${latestUnlock}` : "Latest permanent unlock: none yet.")}</div>
          ${this.getSaveSlotSummaryMarkup({
            action: "load",
            actionLabel: "Load",
            focusPrefix: "utility:load-slot"
          })}
        `;
      }
    }

    if (utilityControlSummary) {
      utilityControlSummary.innerHTML = `
        <div class="utility-menu-title">${connected ? "Controller ready" : "Touch active"}</div>
        <div class="utility-menu-meta">${escapeHtml(connected ? `${this.gamepadInput.getControllerName()} | A Confirm/Use | B Back | X Alt | Y Pack | RT Scroll` : "Touch controls are available for movement and actions.")}</div>
      `;
    }

    if (utilitySaveButton) {
      utilitySaveButton.disabled = !this.player || this.mode === "title";
    }
    if (utilityLoadButton) {
      utilityLoadButton.disabled = !hasSavedRun;
    }
    if (utilityStatsButton) {
      utilityStatsButton.disabled = !this.player;
    }

    this.modalRoot.innerHTML = "";
    this.modalRoot.appendChild(fragment);
    this.modalRoot.classList.remove("hidden");
    this.modalSurfaceKey = "utility-menu";
    this.modalReturnContext = null;
    this.recordTelemetry("modal_opened", {
      surface: "utility-menu"
    });
    this.applyControllerNavigationMetadata();
    const focusElement = this.resolveModalFocusTarget(focusTarget);
    if (focusElement) {
      this.focusUiElement(focusElement);
      return;
    }
    this.focusFirstUiElement();
  }

  closeModal() {
    this.resetMovementCadence();
    const closingSurfaceKey = this.modalSurfaceKey;
    const modalReturnContext = this.modalReturnContext;
    const openerFocusKey = this.utilityMenuOpenerFocusKey;
    if (this.modalSurfaceKey === "return-summary") {
      this.recordTelemetry("return_summary_closed", {
        outcome: this.lastRunSummary?.outcome || ""
      });
      this.storyFlags.postReturnBankPrompt = true;
      this.log("Bank is the cleanest next stop. Review town persistence before sending this adventurer north again.", "warning");
    }
    this.setModalVisibility(false);
    this.modalRoot.classList.add("hidden");
    this.modalRoot.innerHTML = "";
    this.modalSurfaceKey = null;
    this.modalReturnContext = null;
    this.pendingService = null;
    this.activeHubTab = "pack";
    this.hoveredPackSelection = null;
    if (this.targetMode && this.mode !== "target") {
      this.targetMode = null;
    }
    if (modalReturnContext?.originSurface === "utility-menu" && this.player) {
      this.showUtilityMenu({
        focusTarget: modalReturnContext.returnFocusKey,
        openerFocusKey
      });
      return;
    }
    if (!this.player) {
      this.utilityMenuOpenerFocusKey = null;
      this.showTitleScreen();
      return;
    }
    if (this.player && this.player.hp > 0) {
      this.mode = "game";
    }
    if (closingSurfaceKey === "utility-menu") {
      this.restoreUiFocus(openerFocusKey || "utility-menu-button");
    } else if (this.controllerFocusKey && !this.findUiElementByFocusKey(this.controllerFocusKey)) {
      this.controllerFocusKey = null;
    }
  }

  log(message, tone = "") {
    this.messages.push({ turn: this.turn, message, tone });
    if (this.messages.length > 120) {
      this.messages.shift();
    }
    const priority = this.getStickyFeedPriority(message, tone);
    if (priority > 0) {
      const currentPriority = this.liveFeedSticky?.priority || 0;
      const currentTurn = this.liveFeedSticky?.turn || 0;
      if (!this.liveFeedSticky || priority > currentPriority || (priority === currentPriority && this.turn >= currentTurn)) {
        this.liveFeedSticky = {
          message,
          tone,
          turn: this.turn,
          priority,
          expiresAt: this.turn + 2
        };
      }
    }
  }

  render() {
    const previousFocusKey = this.mode === "modal" ? null : (this.getActiveUiActionableElement()?.dataset?.focusKey || this.controllerFocusKey || null);
    this.syncSurfaceMusic();
    this.syncUtilityBar();
    this.renderBoard();
    this.renderMiniMap();
    this.renderPanels();
    this.renderEventTicker();
    this.renderActionBar();
    this.syncSpellTray();
    this.syncContextChip();
    this.applyControllerNavigationMetadata();
    if (previousFocusKey && this.lastInputSource !== "pointer") {
      const nextFocus = this.findUiElementByFocusKey(previousFocusKey);
      if (nextFocus) {
        this.focusUiElement(nextFocus);
      }
    }
  }

  renderMiniMap() {
    if (!this.mapCtx || !this.mapCanvas) {
      return;
    }
    const ctx = this.mapCtx;
    ctx.clearRect(0, 0, this.mapCanvas.width, this.mapCanvas.height);
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, this.mapCanvas.width, this.mapCanvas.height);

    if (!this.currentLevel || !this.player) {
      if (this.mapPanelLabel) {
        this.mapPanelLabel.textContent = "Overworld Map";
      }
      if (this.mapPanelState) {
        this.mapPanelState.textContent = "No active run";
      }
      if (this.mapCaption) {
        this.mapCaption.textContent = "Create a character to begin.";
      }
      return;
    }

    const scaleX = this.mapCanvas.width / this.currentLevel.width;
    const scaleY = this.mapCanvas.height / this.currentLevel.height;
    const time = nowTime();
    const pulse = 0.42 + ((Math.sin(time / 180) + 1) * 0.2);
    const markPoint = (point, fillStyle, borderStyle = "", size = 4) => {
      if (!point) {
        return;
      }
      const px = Math.floor(point.x * scaleX);
      const py = Math.floor(point.y * scaleY);
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.fillStyle = fillStyle;
      ctx.fillRect(px - 1, py - 1, Math.max(size, Math.ceil(scaleX) + 2), Math.max(size, Math.ceil(scaleY) + 2));
      if (borderStyle) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = borderStyle;
        ctx.lineWidth = 1;
        ctx.strokeRect(px - 2, py - 2, Math.max(size + 2, Math.ceil(scaleX) + 4), Math.max(size + 2, Math.ceil(scaleY) + 4));
      }
      ctx.restore();
    };

    for (let y = 0; y < this.currentLevel.height; y += 1) {
      for (let x = 0; x < this.currentLevel.width; x += 1) {
        if (!isExplored(this.currentLevel, x, y) && this.currentDepth !== 0) {
          continue;
        }
        const tile = getTile(this.currentLevel, x, y);
        ctx.fillStyle = miniMapColor(tile, isVisible(this.currentLevel, x, y));
        ctx.fillRect(Math.floor(x * scaleX), Math.floor(y * scaleY), Math.ceil(scaleX), Math.ceil(scaleY));
      }
    }

    this.currentLevel.items.forEach((item) => {
      if (this.currentDepth !== 0 && !isExplored(this.currentLevel, item.x, item.y)) {
        return;
      }
      ctx.fillStyle = item.kind === "gold" ? "#ebcf60" : "#9bc4df";
      ctx.fillRect(Math.floor(item.x * scaleX), Math.floor(item.y * scaleY), Math.max(2, Math.ceil(scaleX)), Math.max(2, Math.ceil(scaleY)));
    });

    if (this.currentDepth === 0 && this.currentLevel.buildings) {
      this.currentLevel.buildings.forEach((building) => {
        const doorX = building.x + Math.floor(building.w / 2);
        const doorY = building.y + building.h - 1;
        markPoint({ x: doorX, y: doorY }, "#d6b06a", "#f3ddb3", 4);
      });
    }

    this.currentLevel.actors.forEach((actor) => {
      if (this.currentDepth !== 0 && !isVisible(this.currentLevel, actor.x, actor.y)) {
        return;
      }
      ctx.fillStyle = "#c94a4a";
      ctx.fillRect(Math.floor(actor.x * scaleX), Math.floor(actor.y * scaleY), Math.max(2, Math.ceil(scaleX)), Math.max(2, Math.ceil(scaleY)));
    });

    ctx.fillStyle = "#7bd0ff";
    ctx.fillRect(Math.floor(this.player.x * scaleX), Math.floor(this.player.y * scaleY), Math.max(3, Math.ceil(scaleX)), Math.max(3, Math.ceil(scaleY)));

    const unresolvedObjective = this.currentLevel.floorObjective && !this.currentLevel.floorResolved
      ? this.currentLevel.floorObjective.marker
      : this.currentLevel.milestone && this.currentLevel.milestone.status !== "cleared"
        ? this.currentLevel.milestone.marker
        : null;
    const unopenedOptional = this.currentLevel.floorOptional && !this.currentLevel.floorOptional.opened ? this.currentLevel.floorOptional.marker : null;
    const highlightedRoomIndex = this.currentLevel.floorObjective && !this.currentLevel.floorResolved
      ? this.currentLevel.floorObjective.roomIndex
      : this.currentLevel.milestone && this.currentLevel.milestone.status !== "cleared"
        ? this.currentLevel.milestone.roomIndex
        : null;
    if (highlightedRoomIndex !== null && highlightedRoomIndex !== undefined && this.currentLevel.rooms?.[highlightedRoomIndex]) {
      const room = this.currentLevel.rooms[highlightedRoomIndex];
      ctx.save();
      ctx.strokeStyle = "rgba(255, 153, 125, 0.9)";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        Math.floor(room.x * scaleX),
        Math.floor(room.y * scaleY),
        Math.max(4, Math.floor(room.w * scaleX)),
        Math.max(4, Math.floor(room.h * scaleY))
      );
      ctx.restore();
    }
    this.getGuidedRoutePoints(this.currentLevel).forEach((point, index, points) => {
      if (!isExplored(this.currentLevel, point.x, point.y)) {
        return;
      }
      const px = Math.floor(point.x * scaleX);
      const py = Math.floor(point.y * scaleY);
      ctx.fillStyle = index === points.length - 1 ? "rgba(255, 213, 122, 0.92)" : "rgba(255, 213, 122, 0.54)";
      ctx.fillRect(px, py, Math.max(2, Math.ceil(scaleX)), Math.max(2, Math.ceil(scaleY)));
    });
    markPoint(this.currentLevel.stairsUp, "#93d7ff", "#dff7ff", 5);
    markPoint(this.currentLevel.stairsDown, this.currentDepth === 0 && (this.player.deepestDepth || 0) === 0 ? "#ffd36b" : "#caa44a", "#ffe7ab", 5);
    markPoint(unresolvedObjective, "#ff8c6d", "#ffd3bf", 6);
    markPoint(unopenedOptional, "#c991ff", "#ead7ff", 5);
    markPoint(this.currentLevel.signatureReveal?.point, "#f0d27d", "#fff0c3", 5);

    if (this.mapPanelLabel) {
      this.mapPanelLabel.textContent = this.currentDepth === 0 ? "Overworld Map" : "Floor Survey";
    }
    if (this.mapPanelState) {
      this.mapPanelState.textContent = this.currentDepth === 0
        ? this.getTownCycleLabel()
        : `Depth ${this.currentDepth}`;
    }
    if (this.mapCaption) {
      const modeLabel = this.currentDepth === 0 ? this.getTownCycleLabel() : "Dungeon survey";
      const pressure = this.getPressureUiState();
      this.mapCaption.innerHTML = `
        <div class="map-caption-row">
          <span class="map-chip">${escapeHtml(this.getCurrentAreaTitle())}</span>
          <span class="map-chip subtle">Explored ${getExploredPercent(this.currentLevel)}%</span>
          <span class="map-chip subtle">${escapeHtml(this.currentDepth > 0 ? pressure.label : modeLabel)}</span>
        </div>
      `;
    }
  }

  legacyRenderActionBarUnused() {
    if (!this.actionBar) {
      return;
    }
    if (!this.player) {
      this.actionBar.innerHTML = "";
      return;
    }
    const advisor = this.getAdvisorModel();
    this.actionBar.innerHTML = `
      <button class="action-button dock-action hub-button" data-action="open-hub" data-tab="pack" type="button">
        <span class="context-main">Hub</span>
        <span class="context-note">Pack, magic, journal</span>
      </button>
      ${advisor.actionsHtml}
    `;
  }

  renderBoard() {
    const ctx = this.ctx;
    const time = nowTime();
    const effectProfile = this.getEffectProfile();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (!this.currentLevel || !this.player) {
      drawCenteredText(ctx, "Create a character to begin", 300, 300, "#f2deb1");
      return;
    }

    const view = this.getViewport();
    let offsetX = 0;
    let offsetY = 0;
    if (this.boardImpulse && this.boardImpulse.until > time) {
      const life = clamp((time - this.boardImpulse.created) / Math.max(1, this.boardImpulse.until - this.boardImpulse.created), 0, 1);
      const falloff = Math.pow(1 - life, 2);
      offsetX = this.boardImpulse.dx * 4 * falloff;
      offsetY = this.boardImpulse.dy * 4 * falloff;
    }

    ctx.save();
    if (offsetX || offsetY) {
      ctx.translate(offsetX, offsetY);
    }

    for (let sy = 0; sy < VIEW_SIZE; sy += 1) {
      for (let sx = 0; sx < VIEW_SIZE; sx += 1) {
        const x = view.x + sx;
        const y = view.y + sy;
        const tile = getTile(this.currentLevel, x, y);
        const visible = isVisible(this.currentLevel, x, y);
        const explored = isExplored(this.currentLevel, x, y);
        if (!tile || !explored) {
          ctx.fillStyle = "#040404";
          ctx.fillRect(sx * TILE_SIZE, sy * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          continue;
        }
        drawTile(ctx, this.currentLevel, tile, x, y, sx, sy, visible);
      }
    }
    drawTownBuildings(ctx, this.currentLevel, view);
    drawBoardAtmosphere(ctx, this.currentLevel, view, time, {
      depth: this.currentDepth,
      firstTownRun: this.currentDepth === 0 && (this.player.deepestDepth || 0) === 0,
      ...effectProfile
    });
    this.getGuidedRoutePoints(this.currentLevel).forEach((point, index, points) => {
      if (!isExplored(this.currentLevel, point.x, point.y) || !isVisible(this.currentLevel, point.x, point.y)) {
        return;
      }
      const sx = point.x - view.x;
      const sy = point.y - view.y;
      if (sx < 0 || sy < 0 || sx >= VIEW_SIZE || sy >= VIEW_SIZE) {
        return;
      }
      const tileX = sx * TILE_SIZE;
      const tileY = sy * TILE_SIZE;
      const isEndpoint = index === points.length - 1;
      ctx.save();
      ctx.strokeStyle = isEndpoint ? "rgba(255, 214, 125, 0.9)" : "rgba(255, 214, 125, 0.55)";
      ctx.lineWidth = isEndpoint ? 2 : 1.5;
      ctx.strokeRect(tileX + 7, tileY + 7, TILE_SIZE - 14, TILE_SIZE - 14);
      ctx.fillStyle = isEndpoint ? "rgba(255, 214, 125, 0.3)" : "rgba(255, 214, 125, 0.16)";
      ctx.fillRect(tileX + 8, tileY + 8, TILE_SIZE - 16, TILE_SIZE - 16);
      ctx.restore();
    });
    drawBoardProps(ctx, this.currentLevel, view, time, effectProfile);

    this.currentLevel.items.forEach((item) => {
      if (!isVisible(this.currentLevel, item.x, item.y)) {
        return;
      }
      const sx = item.x - view.x;
      const sy = item.y - view.y;
      if (sx < 0 || sy < 0 || sx >= VIEW_SIZE || sy >= VIEW_SIZE) {
        return;
      }
      drawItem(ctx, item, sx, sy, time, effectProfile);
    });

    const targetActor = this.targetMode ? actorAt(this.currentLevel, this.targetMode.cursor.x, this.targetMode.cursor.y) : null;
    const focusedThreat = targetActor || this.getFocusedThreat();
    this.currentLevel.actors.forEach((actor) => {
      if (!isVisible(this.currentLevel, actor.x, actor.y)) {
        return;
      }
      const sx = actor.x - view.x;
      const sy = actor.y - view.y;
      if (sx < 0 || sy < 0 || sx >= VIEW_SIZE || sy >= VIEW_SIZE) {
        return;
      }
      drawMonster(ctx, actor, sx, sy, time, effectProfile);
      drawMonsterHealthBar(ctx, actor, sx, sy, {
        focused: actor === focusedThreat
      });
      drawMonsterIntent(ctx, actor, sx, sy, time, {
        ...effectProfile,
        player: this.player,
        view
      });
    });

    this.visualEffects
      .filter((effect) => effect.type !== "screenPulse")
      .forEach((effect) => drawEffect(ctx, effect, view, time, effectProfile));
    drawPlayer(ctx, this.player, this.player.x - view.x, this.player.y - view.y, time, effectProfile);
    if (this.targetMode) {
      drawTargetCursor(ctx, this.targetMode.cursor, view, this.player, time, {
        ...effectProfile,
        targetPreview: this.getActiveSpellTargetPreview(),
        targetMode: this.targetMode
      });
    }
    ctx.restore();

    this.visualEffects
      .filter((effect) => effect.type === "screenPulse")
      .forEach((effect) => drawEffect(ctx, effect, view, time, effectProfile));
    const hpRatio = this.player.maxHp > 0 ? this.player.hp / this.player.maxHp : 1;
    const burdenRatio = getCarryWeight(this.player) / Math.max(1, getCarryCapacity(this.player));
    drawBoardVignette(ctx, hpRatio, time, effectProfile);
    drawBoardBurdenVignette(ctx, burdenRatio, time, effectProfile);
  }

  playProjectile(from, to, color, options = {}) {
    this.addEffect({
      type: "projectileTrail",
      from: { x: from.x, y: from.y },
      to: { x: to.x, y: to.y },
      color,
      style: options.style || "arcane",
      duration: options.duration || (this.getReducedMotionActive() ? 120 : 210)
    });
  }

  legacyGetAdvisorModelUnused() {
    if (!this.player || !this.currentLevel) {
      return {
        playerHtml: "<div class='muted'>No active run.</div>",
        threatHtml: "<div class='muted'>No threats yet.</div>",
        advisorHtml: "<div class='advisor-label'>Advisor</div><div class='advisor-text'>Create a character to begin.</div>",
        actionsHtml: ""
      };
    }

    const tile = getTile(this.currentLevel, this.player.x, this.player.y);
    const visible = this.visibleEnemies();
    const hpRatio = this.player.maxHp > 0 ? this.player.hp / this.player.maxHp : 1;
    const manaRatio = this.player.maxMana > 0 ? this.player.mana / this.player.maxMana : 1;
    const rangedThreats = visible.filter((monster) => monster.intent && monster.intent.type === "shoot").length;
    const chargeThreats = visible.filter((monster) => monster.intent && monster.intent.type === "charge").length;
    const summonThreats = visible.filter((monster) => monster.intent && monster.intent.type === "summon").length;
    const lootHere = itemsAt(this.currentLevel, this.player.x, this.player.y);
    const burden = getEncumbranceTier(this.player);
    const condition = this.player.slowed ? "Slowed" : burden >= 2 ? "Overburdened" : burden === 1 ? "Burdened" : "Steady";
    const dangerScore = visible.length + rangedThreats * 2 + chargeThreats + summonThreats * 2 + (hpRatio < 0.5 ? 2 : 0);
    const dangerTone = visible.length === 0 ? "good" : dangerScore >= 7 || hpRatio < 0.35 ? "bad" : dangerScore >= 3 ? "warning" : "good";
    const dangerLabel = visible.length === 0 ? "Clear" : dangerTone === "bad" ? "Kill Zone" : dangerTone === "warning" ? "Pressured" : "Engaged";
    const pressurePercent = visible.length === 0 ? 0 : clamp(dangerScore * 12 + 14, 16, 100);
    const locationLabel = this.currentDepth > 0 ? `Depth ${this.currentDepth}` : "Town";
    const closestThreat = visible.length > 0
      ? Math.min(...visible.map((monster) => distance(this.player, monster)))
      : null;
    const primaryThreat = visible[0] ? visible[0].name : "No visible foes";
    const threatFocus = summonThreats > 0
      ? "Summoner pressure"
      : rangedThreats > 0
        ? "Ranged pressure"
        : chargeThreats > 0
          ? "Charge lane"
          : visible.length > 0
            ? escapeHtml(primaryThreat)
            : "No hostile contacts";

    const playerHtml = `
      <div class="capsule-topline">
        <div>
          <div class="capsule-label">Vanguard</div>
          <div class="capsule-headline">${escapeHtml(this.player.name)}</div>
        </div>
        <div class="capsule-badge ${dangerTone === "bad" ? "bad" : this.currentDepth > 0 ? "warning" : "good"}">${escapeHtml(locationLabel)}</div>
      </div>
      <div class="meter-stack">
        <div class="meter-row"><span>Vitality</span><strong class="${valueTone(hpRatio, true)}">${Math.floor(this.player.hp)}/${this.player.maxHp}</strong></div>
        <div class="meter hp"><span style="width:${clamp(Math.round(hpRatio * 100), 0, 100)}%"></span></div>
        <div class="meter-row"><span>Aether</span><strong class="${manaRatio < 0.3 ? "value-warning" : ""}">${Math.floor(this.player.mana)}/${this.player.maxMana}</strong></div>
        <div class="meter mana"><span style="width:${clamp(Math.round(manaRatio * 100), 0, 100)}%"></span></div>
      </div>
      <div class="capsule-line compact-line"><span>Condition</span><strong class="${this.player.slowed || burden ? "value-warning" : ""}">${condition}</strong></div>
    `;

    const threatHtml = `
      <div class="capsule-topline">
        <div>
          <div class="capsule-label">Threat Scan</div>
          <div class="capsule-headline">${visible.length > 0 ? `${visible.length} hostile${visible.length === 1 ? "" : "s"}` : "No immediate threat"}</div>
        </div>
        <div class="capsule-badge ${dangerTone}">${dangerLabel}</div>
      </div>
      <div class="capsule-subline">${threatFocus}</div>
      <div class="meter-stack">
        <div class="meter-row"><span>Pressure</span><strong class="${dangerTone === "bad" ? "value-bad" : dangerTone === "warning" ? "value-warning" : "value-good"}">${pressurePercent}%</strong></div>
        <div class="meter threat"><span style="width:${pressurePercent}%"></span></div>
      </div>
      <div class="capsule-line compact-line"><span>Closest</span><strong>${closestThreat === null ? "Clear" : `${closestThreat} tile${closestThreat === 1 ? "" : "s"}`}</strong></div>
    `;

    let advice = "Advance carefully. Keep the dungeon, not the menus, as the main thing you read.";
    const actions = [];
    const pushAction = (action, label, note, recommended = false, tab = "") => {
      if (!actions.some((entry) => entry.action === action)) {
        actions.push({ action, label, note, recommended, tab });
      }
    };

    if (lootHere.length > 0) {
      advice = `There ${lootHere.length === 1 ? "is loot" : "are valuables"} underfoot. Secure it before drifting deeper.`;
      pushAction("pickup", "Pick Up", lootHere[0].kind === "gold" ? "Collect the gold" : "Claim the item", true);
    }
    if (tile.kind === "fountain" || tile.kind === "throne" || (tile.kind === "altar" && tile.featureEffect)) {
      advice = "This tile offers a risky interaction. Touch it only if you want to spend tempo or accept danger.";
      pushAction("interact", "Interact", "Use the current feature", true);
    }
    if (tile.kind === "stairUp" && this.currentDepth > 0) {
      advice = hpRatio < 0.45 ? "You have an escape route under your feet. Use it if this floor is turning against you." : "The stairs up are ready if you want to bank progress or reset pressure.";
      pushAction("stairs-up", "Ascend", "Leave the floor now", hpRatio < 0.45);
    } else if (tile.kind === "stairDown") {
      advice = "The downward path is open. Descend only if your resources justify more risk.";
      pushAction("stairs-down", "Descend", "Push the run deeper", false);
    }

    if (visible.length > 0) {
      if (hpRatio < 0.35) {
        advice = "You are in the kill zone. Break contact, create space, or spend a tool immediately.";
        if (this.player.spellsKnown.length > 0) {
          pushAction("open-spell-tray", "Magic", "Spend control or damage now", true, "magic");
        }
        pushAction("wait", "Hold", "Stabilize before moving", false);
      } else if (rangedThreats > 0) {
        advice = "Ranged pressure is active. Break line of sight with pillars, corners, or a fast disable.";
        if (this.player.spellsKnown.length > 0) {
          pushAction("open-spell-tray", "Magic", "Answer ranged pressure", true, "magic");
        }
        pushAction("wait", "Hold", "Do not overextend", false);
      } else if (chargeThreats > 0) {
        advice = "A visible charger is winding up. Sidestep or block the lane before it lands.";
        pushAction("wait", "Hold", "Let the lane clarify", false);
        if (this.player.spellsKnown.length > 0) {
          pushAction("open-spell-tray", "Magic", "Slow or burst the charger", true, "magic");
        }
      } else if (summonThreats > 0) {
        advice = "A summoner is online. Kill or disrupt it before the room fills in.";
        if (this.player.spellsKnown.length > 0) {
          pushAction("open-spell-tray", "Magic", "Pressure the summoner", true, "magic");
        }
      } else {
        advice = "You are engaged. Win the current exchange before opening more of the map.";
        if (this.player.spellsKnown.length > 0) {
          pushAction("open-spell-tray", "Magic", "Take initiative", true, "magic");
        }
        pushAction("wait", "Hold", "Read the room", false);
      }
    } else if (this.currentDepth > 0 && hpRatio < 0.75) {
      advice = "You can recover here, but rest is noisy. Use it only if you can afford waking the floor.";
      pushAction("rest", "Rest", "Recover until disturbed", true);
      pushAction("search", "Search", "Check nearby walls and traps", false);
    } else if (this.currentDepth > 0) {
      advice = "The floor is quiet. Search, scout, or push toward the next point of tension.";
      pushAction("search", "Search", "Probe for secrets", true);
      if (tile.kind === "stairDown") {
        pushAction("stairs-down", "Descend", "Push the run deeper", false);
      }
    }

    const advisorHtml = `
      <div class="advisor-label">Tactical Read</div>
      <div class="advisor-text">${escapeHtml(advice)}</div>
    `;

    const actionsHtml = actions.slice(0, 3).map((entry, index) => `
      <button class="action-button dock-action${entry.recommended && index === 0 ? " recommended" : ""}" data-action="${entry.action}"${entry.tab ? ` data-tab="${entry.tab}"` : ""} type="button">
        <span class="context-slot">${index + 1}</span>
        <span class="context-copy">
          <span class="context-main">${escapeHtml(entry.label)}</span>
          <span class="context-note">${escapeHtml(entry.note)}</span>
        </span>
      </button>
    `).join("");

    return { playerHtml, threatHtml, advisorHtml, actionsHtml };
  }

  legacyRenderPanelsUnused() {
    if (!this.player) {
      if (this.playerCapsule) {
        this.playerCapsule.innerHTML = "<div class='muted'>No active run.</div>";
      }
      if (this.threatCapsule) {
        this.threatCapsule.innerHTML = "<div class='muted'>No visible threats.</div>";
      }
      if (this.advisorStrip) {
        this.advisorStrip.innerHTML = "<div class='advisor-label'>Tactical Advisor</div><div class='advisor-text'>Create a character to begin.</div>";
      }
      return;
    }

    const advisor = this.getAdvisorModel();
    if (this.playerCapsule) {
      this.playerCapsule.innerHTML = advisor.playerHtml;
    }
    if (this.threatCapsule) {
      this.threatCapsule.innerHTML = advisor.threatHtml;
    }
    if (this.advisorStrip) {
      this.advisorStrip.innerHTML = advisor.advisorHtml;
    }
  }

  refreshChrome() {
    this.syncAdaptiveLayout();
    if (this.appShell) {
      this.appShell.classList.toggle("targeting-active", this.mode === "target" && Boolean(this.targetMode));
    }
    this.syncUtilityBar();
    if (this.mapDrawer) {
      const showMap = this.mapDrawerOpen && Boolean(this.player);
      this.mapDrawer.classList.toggle("hidden", !showMap);
    }
    if (this.mapToggleButton) {
      this.mapToggleButton.disabled = !this.player;
      this.mapToggleButton.textContent = this.mapDrawerOpen && this.player ? "Hide Survey" : "Survey";
    }
    if (this.spellTrayToggleButton) {
      const hasSpellTray = Boolean(this.player && this.getPinnedSpellIds().length > 0);
      const canShowToggle = hasSpellTray && !["title", "creation", "levelup"].includes(this.mode);
      this.spellTrayToggleButton.classList.toggle("hidden", !canShowToggle);
      this.spellTrayToggleButton.disabled = !canShowToggle;
      this.spellTrayToggleButton.textContent = this.spellTrayOpen || (this.mode === "target" && this.targetMode?.type === "spell")
        ? "Hide Magic"
        : "Magic";
    }
    if (this.touchControls) {
      const hiddenBySetting = !this.settings.touchControlsEnabled;
      const hiddenByController = this.settings.controllerHintsEnabled && this.gamepadInput.isConnected();
      this.touchControls.classList.toggle("hidden", hiddenBySetting || hiddenByController);
    }
    this.syncSpellTray();
    syncSaveChrome(this);
    this.applyControllerNavigationMetadata();
  }

  getPressureUiState() {
    return getPressureStatus(this.currentLevel);
  }

  getViewportMetrics() {
    const viewport = typeof window !== "undefined" ? window.visualViewport : null;
    const width = Math.round(viewport?.width || window.innerWidth || 0);
    const height = Math.round(viewport?.height || window.innerHeight || 0);
    return { width, height };
  }

  getResponsiveLayoutMode() {
    const { width, height } = this.getViewportMetrics();
    const desktopWidth = width >= 1080;
    const landscapeEnough = width >= Math.round(height * 1.12);
    return desktopWidth && landscapeEnough ? "desktop" : "mobile";
  }

  syncAdaptiveLayout(force = false) {
    const nextMode = this.getResponsiveLayoutMode();
    const changed = this.layoutMode !== nextMode;
    this.layoutMode = nextMode;
    if (this.appShell) {
      this.appShell.dataset.layout = nextMode;
      this.appShell.dataset.input = this.gamepadInput.isConnected()
        ? "controller"
        : nextMode === "mobile"
          ? "touch"
          : "keyboard";
    }
    document.documentElement.dataset.layout = nextMode;
    if ((force || changed) && this.player && this.mapDrawer) {
      this.mapDrawerOpen = nextMode === "desktop";
    }
  }

  getDirectionToPoint(point) {
    if (!this.player || !point) {
      return "";
    }
    const dy = point.y - this.player.y;
    const dx = point.x - this.player.x;
    const vertical = dy < -1 ? "north" : dy > 1 ? "south" : "";
    const horizontal = dx < -1 ? "west" : dx > 1 ? "east" : "";
    if (vertical && horizontal) {
      return `${vertical}-${horizontal}`;
    }
    return vertical || horizontal || "here";
  }

  getTownAreaTitle() {
    if (!this.player || this.currentDepth !== 0 || !this.currentLevel) {
      return this.currentLevel?.description || "Town";
    }
    const building = (this.currentLevel.buildings || []).find((entry) =>
      this.player.x >= entry.x &&
      this.player.x < entry.x + entry.w &&
      this.player.y >= entry.y &&
      this.player.y < entry.y + entry.h
    );
    if (building) {
      return building.name || "Town Service";
    }
    if (this.player.x >= 20 && this.player.x <= 28 && this.player.y >= 13 && this.player.y <= 19) {
      return "Town Square";
    }
    if (this.player.x === 24 && this.player.y <= 12) {
      return "Keep Road";
    }
    if (this.player.x === 24 && this.player.y >= 20) {
      return "South Road";
    }
    if (this.player.x < 20 && this.player.y < 16) {
      return "West Market";
    }
    if (this.player.x > 28 && this.player.y < 16) {
      return "East Market";
    }
    if (this.player.x < 20) {
      return "West Quarter";
    }
    if (this.player.x > 28) {
      return "East Quarter";
    }
    return "Town";
  }

  getCurrentAreaTitle() {
    if (!this.currentLevel) {
      return "";
    }
    return this.currentDepth === 0 ? this.getTownAreaTitle() : this.currentLevel.description;
  }

  getObjectiveGuideText() {
    return this.getLoopDirective().primaryText || "";
  }

  getEventTickerEntries(limit = 1) {
    if (!this.player || this.messages.length === 0) {
      return [];
    }
    const important = [];
    const minTurn = Math.max(1, this.turn - 3);
    for (let index = this.messages.length - 1; index >= 0; index -= 1) {
      const entry = this.messages[index];
      const isRecent = entry.turn >= minTurn;
      const importantText = /reinforcement|objective|stairs|sealed|cursed|pick|learn|descend|ascend|free|altar|shrine|captive|cache|merchant|summon|trap|hits|misses|dies|wakes|casts/i.test(entry.message);
      const skipLowValueLore = this.turn > 6 && entry.turn <= 2 && !importantText;
      if (!skipLowValueLore && (isRecent || importantText || entry.tone === "bad" || entry.tone === "warning")) {
        important.push(entry);
      }
      if (important.length >= limit) {
        break;
      }
    }
    return important.reverse();
  }

  getPinnedTickerEntry() {
    if (!this.player || this.messages.length === 0) {
      return null;
    }
    for (let index = this.messages.length - 1; index >= 0; index -= 1) {
      const entry = this.messages[index];
      const importantText = /reinforcement|objective|stairs|sealed|cursed|pick|learn|descend|ascend|free|altar|shrine|captive|cache|merchant|summon|trap/i.test(entry.message);
      if (importantText || entry.tone === "bad") {
        return this.turn - entry.turn <= 3 ? entry : null;
      }
    }
    return null;
  }

  getStickyFeedPriority(message = "", tone = "") {
    if (!message) {
      return 0;
    }
    if (/stairs up are live|leave now|remain sealed|clear the room first|raised pressure|objective complete|free the captive|burn the nest|seal the shrine/i.test(message)) {
      return 3;
    }
    if (/reinforcement|collapse risk|charge|summon|ranged|trap|cursed/i.test(message) || tone === "bad") {
      return 2;
    }
    if (/route|search|greed|extract|bank the floor|descend|ascend/i.test(message)) {
      return 1;
    }
    return 0;
  }

  getStickyFeedEvent() {
    if (!this.player) {
      return null;
    }
    if (this.liveFeedSticky && this.turn <= (this.liveFeedSticky.expiresAt || 0)) {
      return {
        turnLabel: `T${this.liveFeedSticky.turn}`,
        tone: this.liveFeedSticky.tone ? `ticker-${this.liveFeedSticky.tone}` : "ticker-context",
        text: this.liveFeedSticky.message
      };
    }
    this.liveFeedSticky = null;
    const pinned = this.getPinnedTickerEntry();
    if (!pinned) {
      return null;
    }
    return {
      turnLabel: `T${pinned.turn}`,
      tone: pinned.tone ? `ticker-${pinned.tone}` : "ticker-context",
      text: pinned.message
    };
  }

  getLiveFeedModel() {
    return buildHudFeedModel(this);
  }

  renderEventTicker() {
    if (!this.eventTicker) {
      return;
    }
    this.eventTicker.innerHTML = renderHudFeed(this);
  }

  syncUtilityBar() {
    const connected = this.gamepadInput.isConnected();
    if (this.controllerStatus) {
      if (connected) {
        this.controllerStatus.textContent = this.mode === "modal" || this.mode === "creation" || this.mode === "title" || this.mode === "levelup"
          ? "A Confirm  B Back  LB/RB Tabs  RT Scroll"
          : "A Confirm/Use  B Back  X Alt  Y Pack";
      } else {
        this.controllerStatus.textContent = "Touch active";
      }
    }
    if (this.pressureStatus) {
      if (!this.player || !this.currentLevel) {
        this.pressureStatus.textContent = "Quiet";
        this.pressureStatus.className = "utility-chip utility-chip-muted";
      } else if (this.currentDepth === 0) {
        const firstTownRun = (this.player.deepestDepth || 0) === 0;
        this.pressureStatus.textContent = firstTownRun
          ? (this.storyFlags.townServiceVisited ? "North Road" : "Services")
          : "Town Calm";
        this.pressureStatus.className = "utility-chip utility-chip-muted";
      } else {
        const pressure = this.getPressureUiState();
        this.pressureStatus.textContent = pressure.label;
        this.pressureStatus.className = `utility-chip utility-pressure-status tone-${pressure.tone}`;
      }
    }
    if (this.runStatus) {
      if (!this.player || !this.currentLevel) {
        this.runStatus.textContent = "Title Screen";
        return;
      }
      this.runStatus.textContent = this.currentDepth === 0
        ? `${this.getCurrentAreaTitle()} · ${this.getTownCycleLabel()}`
        : `Depth ${this.currentDepth} · ${this.getCurrentAreaTitle()}`;
    }
  }

  getAllSavedRunMeta() { return loadAllSavedRunMeta(); }

  getSavedRunMeta(slotId = null) { return loadSavedRunMeta(slotId); }

  formatSaveStamp(isoString) { return formatSavedRunStamp(isoString); }

  resetCreationDraft() { resetCreationState(this); }

  captureCreationDraft() { captureCreationDraftState(this); }

  getCreationPointsRemaining() { return getCreationDraftPointsRemaining(this); }

  adjustCreationStat(stat, delta) { return adjustCreationStatDraft(this, stat, delta); }

  getCreationStats() { return getCreationDraftStats(this); }

  performSearch() {
    if (!this.player || this.mode !== "game") {
      return;
    }
    applyCommandResult(this, performSearchCommand(this));
    this.endTurn();
  }

  performWait() {
    this.resetMovementCadence();
    performWaitTurn(this);
  }

  restUntilSafe() {
    this.resetMovementCadence();
    restUntilSafeTurn(this);
  }

  sleepUntilRestored() {
    this.resetMovementCadence();
    sleepUntilRestoredTurn(this);
  }

  visibleEnemies() { return getVisibleEnemies(this); }

  makeNoise(radius, source = this.player, reason = "noise") { return makeDungeonNoise(this, radius, source, reason); }

  canMonsterMoveTo(monster, x, y) { return canMonsterMove(this, monster, x, y); }

  findRetreatStep(monster) { return findMonsterRetreatStep(this, monster); }

  canCharge(monster, dx, dy, distanceToPlayer) { return canMonsterCharge(this, monster, dx, dy, distanceToPlayer); }

  applyCharge(monster) { return applyCharge(this, monster); }

  getMonsterIntent(monster) { return getMonsterIntentModel(this, monster); }

  updateMonsterIntents() { updateAllMonsterIntents(this); }

  attack(attacker, defender) { return attackActors(this, attacker, defender); }

  damageActor(attacker, defender, amount, damageType = "physical") { return damageActorTarget(this, attacker, defender, amount, damageType); }

  killMonster(monster) { killMonsterActor(this, monster); }

  checkLevelUp() { checkPlayerLevelUp(this); }

  handleDeath() { handlePlayerDeath(this); }

  resolveTurn(advanceTurn = true) { resolveGameTurn(this, advanceTurn); }

  endTurn(advanceTurn = true) { endGameTurn(this, advanceTurn); }

  processMonsters() { processMonsterTurns(this); }

  useStairs(direction) { applyCommandResult(this, useStairsCommand(this, direction)); }

  saveGame(options = {}) { saveGameState(this, options); }

  loadGame(options = {}) {
    this.resetMovementCadence();
    loadGameState(this, options);
    this.syncSurfaceMusic();
  }

  showTitleScreen() {
    this.resetMovementCadence();
    showTitleModal(this);
  }

  showCreationModal(options = {}) { showCreationScreen(this, options); }

  renderActionBar() { renderAdvisorActionBar(this); }

  getAdvisorModel() { return buildAdvisorModel(this); }

  renderPanels() { renderAdvisorPanels(this); }

  recordTelemetry(type, context = {}) {
    return recordTelemetry(this, type, context);
  }

  recordTownServiceOpen(serviceId) {
    return recordTownServiceOpen(this, serviceId);
  }

  trackFirstPlayerMove(x, y) {
    return trackFirstPlayerMove(this, x, y);
  }

  trackObjectiveProgress(tile = null) {
    return trackObjectiveProgress(this, tile);
  }

  trackOptionalProgress(tile = null) {
    return trackOptionalProgress(this, tile);
  }

  getTelemetrySummary() {
    return buildTelemetrySummary(this);
  }

  exportTelemetryTrace() {
    if (exportTelemetryTrace(this)) {
      this.log("Current run trace exported.", "good");
      this.render();
    }
  }

  renderLog() {
    return this.renderLogMarkup(32);
  }
}

// src/main.js

window.addEventListener("load", () => {
  window.castleOfTheWindsWeb = new Game();
});

})();
