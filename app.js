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

function choiceCard(entry, type, selected) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `choice-card${selected ? " selected" : ""}`;
  button.dataset[type] = entry.id;
  button.innerHTML = `
    <div class="choice-title">${escapeHtml(entry.name)}</div>
    <div class="choice-note">${escapeHtml(entry.summary)}</div>
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
  const room = choice(level.rooms.slice(2, -1));
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
  const room = choice(level.rooms.slice(1));
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
    learnLevel: 1,
    cost: 3,
    range: 8,
    effectColor: "#d6c1ff",
    description: "Unerring arcane dart for moderate damage.",
    target: "monster",
    cast(game, caster, target) {
      const damage = roll(2, 4) + Math.floor(caster.stats.int / 3) + (game.getSpellDamageBonus ? game.getSpellDamageBonus(target, "magic") : 0);
      game.log(`A crackling bolt strikes ${target.name} for ${damage} damage.`, "good");
      game.damageActor(caster, target, damage, "magic");
      return true;
    }
  },
  healMinor: {
    id: "healMinor",
    name: "Cure Light Wounds",
    learnLevel: 1,
    cost: 4,
    description: "Restores a small amount of vitality.",
    target: "self",
    cast(game, caster) {
      const healed = clamp(roll(2, 5) + Math.floor(caster.stats.int / 4), 4, caster.maxHp);
      const before = caster.hp;
      caster.hp = Math.min(caster.maxHp, caster.hp + healed);
      game.log(`${caster.name} recovers ${caster.hp - before} hit points.`, "good");
      return true;
    }
  },
  frostBolt: {
    id: "frostBolt",
    name: "Frost Bolt",
    learnLevel: 3,
    cost: 6,
    range: 7,
    effectColor: "#9ad7ff",
    description: "Cold damage with a chance to slow the foe.",
    target: "monster",
    cast(game, caster, target) {
      const damage = roll(2, 6) + Math.floor(caster.stats.int / 2) + (game.getSpellDamageBonus ? game.getSpellDamageBonus(target, "cold") : 0);
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
    name: "Fireball",
    learnLevel: 7,
    cost: 9,
    range: 7,
    effectColor: "#ffb16f",
    description: "High damage blast against a single foe.",
    target: "monster",
    cast(game, caster, target) {
      const damage = roll(3, 6) + Math.floor(caster.stats.int / 2) + (game.getSpellDamageBonus ? game.getSpellDamageBonus(target, "fire") : 0);
      game.log(`The fireball bursts over ${target.name}.`, "good");
      game.damageActor(caster, target, damage, "fire");
      return true;
    }
  },
  phaseDoor: {
    id: "phaseDoor",
    name: "Phase Door",
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
    learnLevel: 8,
    cost: 8,
    description: "Returns you to town from the depths.",
    target: "self",
    cast(game) {
      if (game.currentDepth === 0) {
        game.log("You are already in town.", "warning");
        return false;
      }
      game.currentDepth = 0;
      game.currentLevel = game.levels[0];
      game.placePlayerAt(game.currentLevel.start.x, game.currentLevel.start.y);
      game.log("The rune folds the dungeon away and returns you to town.", "good");
      return true;
    }
  }
};

const ITEM_DEFS = {
  dagger: { id: "dagger", name: "Dagger", kind: "weapon", slot: "weapon", power: 3, value: 24, rarity: 1, weight: 2 },
  shortSword: { id: "shortSword", name: "Short Sword", kind: "weapon", slot: "weapon", power: 5, value: 42, rarity: 1, weight: 4 },
  broadSword: { id: "broadSword", name: "Broad Sword", kind: "weapon", slot: "weapon", power: 7, value: 80, rarity: 2, weight: 6 },
  battleAxe: { id: "battleAxe", name: "Battle Axe", kind: "weapon", slot: "weapon", power: 9, value: 120, rarity: 3, weight: 7 },
  warHammer: { id: "warHammer", name: "War Hammer", kind: "weapon", slot: "weapon", power: 11, value: 160, rarity: 4, weight: 8 },
  oakStaff: { id: "oakStaff", name: "Oak Staff", kind: "weapon", slot: "weapon", power: 4, value: 26, rarity: 1, manaBonus: 2, weight: 5 },
  clothRobe: { id: "clothRobe", name: "Cloth Robe", kind: "armor", slot: "body", armor: 1, value: 20, rarity: 1, manaBonus: 2, weight: 2 },
  quiltArmor: { id: "quiltArmor", name: "Quilt Armor", kind: "armor", slot: "body", armor: 2, value: 30, rarity: 1, weight: 3 },
  leatherArmor: { id: "leatherArmor", name: "Leather Armor", kind: "armor", slot: "body", armor: 3, value: 46, rarity: 1, weight: 5 },
  chainMail: { id: "chainMail", name: "Chain Mail", kind: "armor", slot: "body", armor: 5, value: 88, rarity: 2, weight: 8 },
  plateMail: { id: "plateMail", name: "Plate Mail", kind: "armor", slot: "body", armor: 7, value: 155, rarity: 4, dexPenalty: 1, weight: 11 },
  buckler: { id: "buckler", name: "Buckler", kind: "armor", slot: "offhand", armor: 1, value: 22, rarity: 1, weight: 3 },
  towerShield: { id: "towerShield", name: "Tower Shield", kind: "armor", slot: "offhand", armor: 3, value: 94, rarity: 3, dexPenalty: 1, weight: 8 },
  bronzeHelm: { id: "bronzeHelm", name: "Bronze Helm", kind: "armor", slot: "head", armor: 2, value: 40, rarity: 2, weight: 2 },
  ironHelm: { id: "ironHelm", name: "Iron Helm", kind: "armor", slot: "head", armor: 3, value: 64, rarity: 3, weight: 3 },
  travelBoots: { id: "travelBoots", name: "Travel Boots", kind: "armor", slot: "feet", armor: 1, value: 26, rarity: 1, dexBonus: 1, weight: 2 },
  shadowCloak: { id: "shadowCloak", name: "Shadow Cloak", kind: "armor", slot: "cloak", armor: 1, value: 40, rarity: 2, dexBonus: 1, weight: 1 },
  spellfocusRing: { id: "spellfocusRing", name: "Ring of Focus", kind: "armor", slot: "ring", armor: 0, value: 88, rarity: 2, manaBonus: 4, weight: 0 },
  goldCharm: { id: "goldCharm", name: "Charm of Fortune", kind: "armor", slot: "amulet", armor: 0, value: 94, rarity: 3, goldBonus: 0.15, weight: 0 },
  torchCharm: { id: "torchCharm", name: "Charm of Light", kind: "armor", slot: "amulet", armor: 0, value: 70, rarity: 2, lightBonus: 1, weight: 0 },
  healingPotion: { id: "healingPotion", name: "Potion of Healing", kind: "consumable", effect: "heal", value: 28, rarity: 1, weight: 1 },
  manaPotion: { id: "manaPotion", name: "Potion of Mana", kind: "consumable", effect: "mana", value: 34, rarity: 1, weight: 1 },
  identifyScroll: { id: "identifyScroll", name: "Scroll of Identify", kind: "consumable", effect: "identify", value: 36, rarity: 2, weight: 0 },
  mappingScroll: { id: "mappingScroll", name: "Scroll of Mapping", kind: "consumable", effect: "mapping", value: 46, rarity: 2, weight: 0 },
  teleportScroll: { id: "teleportScroll", name: "Scroll of Teleport", kind: "consumable", effect: "teleport", value: 52, rarity: 3, weight: 0 },
  removeCurseScroll: { id: "removeCurseScroll", name: "Scroll of Remove Curse", kind: "consumable", effect: "removeCurse", value: 68, rarity: 4, weight: 0 },
  runeScroll: { id: "runeScroll", name: "Rune of Return", kind: "consumable", effect: "runeReturn", value: 90, rarity: 5, weight: 0 },
  wandLightning: { id: "wandLightning", name: "Wand of Lightning", kind: "charged", effect: "lightning", charges: 5, value: 110, rarity: 4, weight: 1 },
  wandSlow: { id: "wandSlow", name: "Wand of Slow Monster", kind: "charged", effect: "slow", charges: 6, value: 92, rarity: 4, weight: 1 },
  staffHealing: { id: "staffHealing", name: "Staff of Healing", kind: "charged", effect: "staffHeal", charges: 5, value: 128, rarity: 5, weight: 3 },
  spellbookFrost: { id: "spellbookFrost", name: "Spellbook of Frost", kind: "spellbook", spell: "frostBolt", value: 90, rarity: 4, weight: 1 },
  spellbookFire: { id: "spellbookFire", name: "Spellbook of Fire", kind: "spellbook", spell: "fireball", value: 130, rarity: 5, weight: 1 },
  spellbookPhase: { id: "spellbookPhase", name: "Spellbook of Phase Door", kind: "spellbook", spell: "phaseDoor", value: 96, rarity: 4, weight: 1 },
  spellbookMind: { id: "spellbookMind", name: "Spellbook of Clairvoyance", kind: "spellbook", spell: "clairvoyance", value: 86, rarity: 4, weight: 1 },
  spellbookIdentify: { id: "spellbookIdentify", name: "Spellbook of Identify", kind: "spellbook", spell: "identify", value: 82, rarity: 4, weight: 1 },
  spellbookSlow: { id: "spellbookSlow", name: "Spellbook of Slow Monster", kind: "spellbook", spell: "slowMonster", value: 92, rarity: 5, weight: 1 },
  spellbookCurse: { id: "spellbookCurse", name: "Spellbook of Remove Curse", kind: "spellbook", spell: "removeCurse", value: 120, rarity: 5, weight: 1 },
  brokenDagger: { id: "brokenDagger", name: "Broken Dagger", kind: "junk", value: 6, rarity: 2, weight: 2 },
  rustedMail: { id: "rustedMail", name: "Rusted Mail", kind: "junk", value: 10, rarity: 3, weight: 7 },
  runestone: { id: "runestone", name: "Runestone of the Winds", kind: "quest", value: 0, rarity: 99 }
};

const TEMPLE_SERVICES = [
  { id: "heal", name: "Healing", price: 40, description: "Restore hit points and mana." },
  { id: "restore", name: "Restoration", price: 90, description: "Recover lost Constitution and mana." },
  { id: "removeCurse", name: "Remove Curse", price: 120, description: "Break curses on all carried gear." },
  { id: "runeReturn", name: "Rune of Return", price: 160, description: "Receive a fresh rune scroll." }
];

const MONSTER_DEFS = [
  { id: "rat", name: "Giant Rat", depth: 1, hp: 6, attack: 3, defense: 7, damage: [1, 4], exp: 12, gold: [2, 10], color: "#8e8e75", sprite: "rat", tactic: "pack" },
  { id: "kobold", name: "Kobold", depth: 1, hp: 8, attack: 4, defense: 8, damage: [1, 5], exp: 15, gold: [4, 12], color: "#b19061", sprite: "kobold", tactic: "pack" },
  { id: "slinger", name: "Kobold Slinger", depth: 1, hp: 7, attack: 5, defense: 8, damage: [1, 4], exp: 18, gold: [4, 12], color: "#b89066", sprite: "kobold", tactic: "skirmish", ranged: { range: 5, damage: [1, 4], color: "#e0c7a2" } },
  { id: "goblin", name: "Goblin", depth: 2, hp: 12, attack: 5, defense: 9, damage: [1, 6], exp: 24, gold: [5, 18], color: "#6e9d4f", sprite: "goblin", tactic: "pack" },
  { id: "archer", name: "Goblin Archer", depth: 2, hp: 11, attack: 6, defense: 9, damage: [1, 6], exp: 28, gold: [6, 20], color: "#8caf56", sprite: "goblin", tactic: "skirmish", ranged: { range: 6, damage: [1, 5], color: "#c2a56a" } },
  { id: "wolf", name: "Dire Wolf", depth: 2, hp: 14, attack: 6, defense: 10, damage: [2, 4], exp: 28, gold: [0, 0], color: "#a7a7a7", sprite: "wolf", abilities: ["charge"], tactic: "charge" },
  { id: "skeleton", name: "Skeleton", depth: 2, hp: 18, attack: 7, defense: 11, damage: [2, 5], exp: 40, gold: [8, 22], color: "#d9d9ca", sprite: "skeleton", tactic: "line" },
  { id: "orc", name: "Orc", depth: 3, hp: 22, attack: 8, defense: 11, damage: [2, 6], exp: 46, gold: [10, 28], color: "#709243", sprite: "orc", tactic: "press" },
  { id: "slime", name: "Ochre Jelly", depth: 4, hp: 26, attack: 8, defense: 10, damage: [2, 6], exp: 52, gold: [0, 0], color: "#c8a73c", sprite: "slime", tactic: "press" },
  { id: "troll", name: "Troll", depth: 4, hp: 36, attack: 10, defense: 12, damage: [2, 8], exp: 80, gold: [16, 40], color: "#5f7b3f", sprite: "troll", abilities: ["charge"], tactic: "charge" },
  { id: "wraith", name: "Wraith", depth: 5, hp: 30, attack: 11, defense: 14, damage: [3, 6], exp: 98, gold: [18, 54], color: "#b4a7df", sprite: "wraith", abilities: ["phase", "drain"], tactic: "phase" },
  { id: "ogre", name: "Ogre", depth: 5, hp: 44, attack: 12, defense: 13, damage: [3, 7], exp: 106, gold: [20, 68], color: "#ab7c50", sprite: "ogre", abilities: ["charge"], tactic: "charge" },
  { id: "shaman", name: "Orc Shaman", depth: 5, hp: 28, attack: 11, defense: 13, damage: [2, 6], exp: 110, gold: [18, 58], color: "#4a8f8f", sprite: "mage", spells: ["magicMissile"], abilities: ["slow", "summon"], tactic: "control" },
  { id: "warlock", name: "Warlock", depth: 6, hp: 34, attack: 12, defense: 15, damage: [3, 8], exp: 124, gold: [28, 80], color: "#7854b8", sprite: "mage", spells: ["magicMissile", "frostBolt"], abilities: ["teleport", "summon"], tactic: "control" },
  { id: "wyrm", name: "Cave Wyrm", depth: 7, hp: 60, attack: 14, defense: 16, damage: [4, 8], exp: 180, gold: [30, 96], color: "#be5b33", sprite: "dragon", tactic: "skirmish", ranged: { range: 5, damage: [3, 7], color: "#f08c4f" } }
];

const SHOPS = {
  general: {
    name: "Provisioner",
    greeting: "Food is scarce in the mountain, but charms, books, and restoratives are not.",
    stock: ["healingPotion", "manaPotion", "identifyScroll", "mappingScroll", "teleportScroll", "travelBoots", "shadowCloak", "spellbookMind", "removeCurseScroll"]
  },
  armory: {
    name: "Armory",
    greeting: "Steel, leather, and hard-won practical judgment.",
    stock: ["shortSword", "broadSword", "battleAxe", "leatherArmor", "chainMail", "plateMail", "buckler", "towerShield", "bronzeHelm", "ironHelm"]
  },
  guild: {
    name: "Wizard's Guild",
    greeting: "Arcane work is expensive. So is burying careless apprentices.",
    stock: ["oakStaff", "spellfocusRing", "spellbookFrost", "spellbookFire", "spellbookPhase", "spellbookIdentify", "spellbookSlow", "spellbookCurse", "manaPotion", "wandLightning", "wandSlow", "staffHealing"]
  },
  temple: {
    name: "Temple",
    greeting: "Restoration, blessing, and the expensive reversal of reckless mistakes.",
    stock: ["healingPotion", "manaPotion", "goldCharm", "torchCharm", "spellbookMind", "runeScroll"]
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
  slime: "controller",
  troll: "frontliner",
  wraith: "skirmisher",
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
  }
};

const DEPTH_THEMES = [
  {
    id: "vermin_halls",
    name: "Vermin Halls",
    depths: [1, 2],
    summary: "Fast packs, anxious corridors, and too many eyes in the dark.",
    templates: ["wolf_pack", "ambush_cell", "shield_wall"],
    monsterBias: ["rat", "kobold", "slinger", "goblin", "wolf"]
  },
  {
    id: "barracks",
    name: "Broken Barracks",
    depths: [2, 3, 4],
    summary: "Disciplined pressure from archers, shields, and orc raiders.",
    templates: ["shield_wall", "orc_push", "ambush_cell"],
    monsterBias: ["goblin", "archer", "skeleton", "orc", "troll"]
  },
  {
    id: "crypts",
    name: "Echo Crypts",
    depths: [4, 5, 6, 7],
    summary: "Necromancy, phasing threats, and reinforcements that never stay dead long enough.",
    templates: ["necromancer_screen", "shield_wall", "orc_push"],
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
    rewardType: "relic"
  },
  purge_nest: {
    id: "purge_nest",
    label: "Purge The Nest",
    shortLabel: "Purge Nest",
    intro: "A breeding nest is feeding the floor. Clear its defenders and crush it.",
    summary: "Clear the nest room, then interact with the nest to end the threat and earn a reward.",
    completion: "interact",
    rewardType: "boon"
  },
  rescue_captive: {
    id: "rescue_captive",
    label: "Rescue The Captive",
    shortLabel: "Rescue Captive",
    intro: "Someone is still alive below. Reach them before the floor tightens around you.",
    summary: "Find the captive, clear the room, and escort the rescue by interacting with the prison marker.",
    completion: "interact",
    rewardType: "rumor"
  },
  seal_shrine: {
    id: "seal_shrine",
    label: "Seal The Shrine",
    shortLabel: "Seal Shrine",
    intro: "An unstable shrine is feeding the floor's hostility. Seal it before pushing deeper.",
    summary: "Reach the shrine and perform the seal. Expect noise and retaliation.",
    completion: "interact",
    rewardType: "boon"
  }
};

const OPTIONAL_ENCOUNTER_DEFS = {
  cursed_cache: {
    id: "cursed_cache",
    label: "Cursed Cache",
    summary: "Fast value, real risk. Open it for gold and a tainted item.",
    unlock: "archive_maps"
  },
  ghost_merchant: {
    id: "ghost_merchant",
    label: "Ghost Merchant",
    summary: "Spend gold or blood for a precise tool while the dead keep score.",
    unlock: "ghost_bargains"
  },
  blood_altar: {
    id: "blood_altar",
    label: "Blood Altar",
    summary: "Trade life for immediate power and a spike in floor danger."
  },
  vault_room: {
    id: "vault_room",
    label: "Vault Room",
    summary: "A high-value chamber guarded by a formed squad."
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
    description: "Provisioner stocks one extra emergency tool each refresh."
  },
  guild_license: {
    id: "guild_license",
    name: "Guild License",
    description: "Wizard's Guild carries deeper books and charged tools."
  },
  temple_favors: {
    id: "temple_favors",
    name: "Temple Favors",
    description: "Temple services are cheaper and blood altars start appearing below."
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
  }
};

// src/core/entities.js

function weightedMonster(depth) {
  const options = MONSTER_DEFS.filter((monster) => monster.depth <= depth + 1);
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
    mana: template.spells ? 12 : 0,
    alerted: 0,
    sleeping: Math.random() < 0.4,
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
  return { ...item, ...overrides };
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
  const pool = Object.values(ITEM_DEFS).filter((item) => item.rarity <= depth + 2 && item.kind !== "quest");
  const bucket = [];
  pool.forEach((item) => {
    const weight = Math.max(1, 9 - item.rarity * 2);
    for (let i = 0; i < weight; i += 1) {
      bucket.push(item.id);
    }
  });
  return createItem(choice(bucket));
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
    return `Weapon, power ${getItemPower(item)}${item.identified && item.cursed ? ", cursed" : ""}`;
  }
  if (item.kind === "armor") {
    const details = [`Armor ${getItemArmor(item)}`];
    if (getItemManaBonus(item)) {
      details.push(`+${getItemManaBonus(item)} mana`);
    }
    if (getItemDexBonus(item)) {
      details.push(`+${getItemDexBonus(item)} dexterity`);
    }
    if (getItemLightBonus(item)) {
      details.push(`+${getItemLightBonus(item)} sight`);
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

function getItemManaBonus(item) {
  return (item.manaBonus || 0) + ((item.kind === "armor" && item.enchantment > 0 && item.slot === "ring") ? item.enchantment : 0);
}

function getItemDexBonus(item) {
  return (item.dexBonus || 0) + ((item.kind === "armor" && item.enchantment > 0 && item.slot === "feet") ? 1 : 0);
}

function getItemLightBonus(item) {
  return (item.lightBonus || 0) + ((item.kind === "armor" && item.enchantment > 1 && item.slot === "amulet") ? 1 : 0);
}

function getItemValue(item) {
  let value = item.value || 0;
  if (item.enchantment) {
    value += item.enchantment * 18;
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
  return player.stats.str * 3 + 12;
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
    return item.kind === "spellbook" || item.kind === "charged";
  }
  if (shopId === "general") {
    return item.kind === "consumable" || item.kind === "charged";
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
  normalized.slowed = normalized.slowed || 0;
  normalized.tempGuard = normalized.tempGuard || 0;
  normalized.perks = Array.isArray(normalized.perks) ? normalized.perks : [];
  normalized.relics = Array.isArray(normalized.relics) ? normalized.relics : [];
  normalized.knownRumors = Array.isArray(normalized.knownRumors) ? normalized.knownRumors : [];
  normalized.runCurrencies = {
    rumorTokens: 0,
    hunterMark: 0,
    templeFavor: 0,
    ...(normalized.runCurrencies || {})
  };
  normalized.inventory = (normalized.inventory || []).map(normalizeItem);
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

const SAVE_FORMAT_VERSION = 3;

function getSavedRunMeta() {
  const raw = typeof localStorage !== "undefined" ? localStorage.getItem(SAVE_KEY) : null;
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed.meta || { name: "Unknown", level: "?", depth: "?" };
  } catch {
    return { name: "Unknown", level: "?", depth: "?" };
  }
}

function formatSaveStamp(isoString) {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return `Saved ${parsed.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
}

function syncSaveChrome(game) {
  const meta = getSavedRunMeta();
  const width = typeof window !== "undefined" ? window.innerWidth : 999;
  if (game.saveStamp) {
    if (!meta) {
      game.saveStamp.textContent = width <= 640 ? "No save" : "No save loaded";
    } else {
      const timeLabel = meta.savedAt ? formatSaveStamp(meta.savedAt) : null;
      const compact = width <= 640;
      const veryCompact = width <= 520;
      game.saveStamp.textContent = veryCompact
        ? timeLabel
          ? `Lv.${meta.level} D${meta.depth} - ${timeLabel.replace("Saved ", "")}`
          : `Lv.${meta.level} D${meta.depth}`
        : compact
          ? timeLabel
            ? `${meta.name} Lv.${meta.level} D${meta.depth} - ${timeLabel.replace("Saved ", "")}`
            : `${meta.name} Lv.${meta.level} D${meta.depth}`
        : timeLabel
          ? `${meta.name} Lv.${meta.level} Depth ${meta.depth} - ${timeLabel}`
          : `${meta.name} Lv.${meta.level} Depth ${meta.depth}`;
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
    rumorTable: game.rumorTable,
    chronicleEvents: game.chronicleEvents,
    deathContext: game.deathContext,
    lastTownRefreshTurn: game.lastTownRefreshTurn,
    meta: {
      name: game.player.name,
      level: game.player.level,
      depth: game.currentDepth,
      savedAt: new Date().toISOString()
    }
  };
}

function migrateSnapshot(snapshot) {
  const migrated = { ...snapshot };
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
  if (!migrated.rumorTable) {
    migrated.rumorTable = [];
  }
  if (!migrated.chronicleEvents) {
    migrated.chronicleEvents = [];
  }
  if (!("deathContext" in migrated)) {
    migrated.deathContext = null;
  }
  return migrated;
}

function saveGame(game, options = {}) {
  if (!game.player) {
    return;
  }
  const { silent = false } = options;
  const snapshot = createSaveSnapshot(game);
  localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
  if (!silent) {
    game.log("Game saved to browser storage.", "good");
  }
  game.refreshChrome();
  game.render();
}

function loadGame(game) {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    game.log("No saved game is available.", "warning");
    game.render();
    return;
  }
  const snapshot = migrateSnapshot(JSON.parse(raw));
  game.turn = snapshot.turn;
  game.levels = normalizeLevels(snapshot.levels);
  game.player = normalizePlayer(snapshot.player);
  game.currentDepth = snapshot.currentDepth;
  game.currentLevel = game.levels[game.currentDepth];
  game.settings = { ...defaultSettings(), ...(snapshot.settings || game.settings) };
  saveSettings(game.settings);
  game.audio.updateSettings(game.settings);
  game.shopState = normalizeShopState(snapshot.shopState);
  game.storyFlags = snapshot.storyFlags || {};
  game.townUnlocks = snapshot.townUnlocks || {};
  game.shopTiers = snapshot.shopTiers || {};
  game.rumorTable = snapshot.rumorTable || [];
  game.chronicleEvents = snapshot.chronicleEvents || [];
  game.deathContext = snapshot.deathContext || null;
  game.lastTownRefreshTurn = snapshot.lastTownRefreshTurn || 0;
  game.pendingSpellChoices = 0;
  game.pendingPerkChoices = 0;
  game.pendingRewardChoice = null;
  game.pendingRewardQueue = [];
  game.pendingTurnResolution = null;
  game.mode = "game";
  game.pendingShop = null;
  game.pendingService = null;
  if (game.resetReadState) {
    game.resetReadState();
  }
  ensureBuildState(game);
  ensureTownMetaState(game);
  ensureChronicleState(game);
  game.recalculateDerivedStats();
  game.closeModal();
  syncFloorState(game);
  syncDangerState(game);
  game.updateFov();
  game.updateMonsterIntents();
  game.log("Saved game restored.", "good");
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
  const template = document.getElementById("title-template");
  const fragment = template.content.cloneNode(true);
  const saveSummary = fragment.getElementById("title-save-summary");
  const loadButton = fragment.getElementById("title-load-button");
  const savedMeta = game.getSavedRunMeta();

  if (savedMeta) {
    const savedTime = savedMeta.savedAt ? game.formatSaveStamp(savedMeta.savedAt) : null;
    saveSummary.innerHTML = `
      <div class="title-save-label">Continue Run</div>
      <div class="title-save-name">${escapeHtml(savedMeta.name)}</div>
      <div class="title-save-meta">Level ${savedMeta.level} - Depth ${savedMeta.depth}</div>
      ${savedTime ? `<div class="title-save-meta">${escapeHtml(savedTime)}</div>` : ""}
    `;
  } else {
    saveSummary.innerHTML = `
      <div class="title-save-label">No Saved Run</div>
      <div class="title-save-meta">Start a fresh descent and your latest run will appear here.</div>
    `;
    loadButton.disabled = true;
  }

  game.modalRoot.innerHTML = "";
  game.modalRoot.appendChild(fragment);
  game.modalRoot.classList.remove("hidden");
  game.refreshChrome();
}

function showCreationModal(game) {
  game.mode = "creation";
  game.setModalVisibility(true);
  const template = document.getElementById("creation-template");
  const fragment = template.content.cloneNode(true);
  const nameInput = fragment.getElementById("hero-name");
  const raceChoice = fragment.getElementById("race-choice");
  const classChoice = fragment.getElementById("class-choice");
  const statPoints = fragment.getElementById("creation-stat-points");
  const statAllocation = fragment.getElementById("creation-stat-allocation");
  const preview = fragment.getElementById("creation-preview");

  nameInput.value = game.creationName;
  RACES.forEach((race) => raceChoice.appendChild(choiceCard(race, "race", race.id === game.selectedRace)));
  CLASSES.forEach((role) => classChoice.appendChild(choiceCard(role, "class", role.id === game.selectedClass)));

  const race = getRace(game.selectedRace);
  const role = getClass(game.selectedClass);
  const stats = game.getCreationStats();
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
    <div class="section-block"><span class="pill">${escapeHtml(race.name)}</span><span class="pill">${escapeHtml(role.name)}</span></div>
    <div class="section-block muted">${escapeHtml(race.summary)} ${escapeHtml(role.summary)}</div>
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
  `;

  game.modalRoot.innerHTML = "";
  game.modalRoot.appendChild(fragment);
  game.modalRoot.classList.remove("hidden");
  game.refreshChrome();
}

// src/features/encounters.js

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

function getDepthTheme(depth) {
  return DEPTH_THEMES.find((theme) => theme.depths.includes(depth)) || DEPTH_THEMES[DEPTH_THEMES.length - 1];
}

function pickEncounterTemplate(depth, theme) {
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

function spawnSquad(level, depth, room, theme, template, options = {}) {
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
  monster.alerted = Math.max(monster.alerted || 0, 4);
  monster.floorTheme = theme.id;
  monster.objectiveGuard = Boolean(options.objectiveGuard);
  if (options.roomIndex !== undefined) {
    monster.roomIndex = options.roomIndex;
  }
  level.actors.push(monster);
  return monster;
}

function populateDungeonEncounters(level, depth) {
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

function spawnReinforcementWave(game, band = "Medium") {
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

function spawnObjectiveGuard(level, depth, room, roomIndex) {
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

function getEncounterSummary(level) {
  if (!level || !level.floorThemeName) {
    return "";
  }
  const eliteNote = level.namedEliteId ? ` ${level.namedEliteId} is hunting this floor.` : "";
  return `${level.floorThemeName} favors formed squads and role pressure.${eliteNote}`;
}

// src/features/objectives.js

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

function setupFloorDirectives(level, depth, townUnlocks = {}) {
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

function resolveFloorObjective(game, reason = "completed") {
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

function handleObjectivePickup(game, item) {
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

function handleObjectiveInteraction(game, tile) {
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

function getObjectiveStatusText(level) {
  if (!level || !level.floorObjective) {
    return "No active floor objective.";
  }
  if (level.floorResolved) {
    return `Objective cleared: ${level.floorObjective.shortLabel}. Extraction or greed.`;
  }
  return `${level.floorObjective.shortLabel}: ${level.floorObjective.detail || level.floorObjective.summary}`;
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
  const rumorPool = [RUMOR_DEFS.relic_hunt, RUMOR_DEFS.nest, RUMOR_DEFS.captive].filter(Boolean);
  const rumor = choice(rumorPool);
  if (rumor && game.learnRumor) {
    game.learnRumor(rumor.id);
  }
}

function getObjectiveRewardPreview(level) {
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

// src/features/director.js

const DANGER_THRESHOLDS = [
  { min: 0, label: "Low", color: "good" },
  { min: 4, label: "Medium", color: "warning" },
  { min: 8, label: "High", color: "bad" },
  { min: 12, label: "Critical", color: "bad" }
];

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

function applyBandTransition(game, previous, next) {
  if (!game.currentLevel || previous === next.label) {
    return;
  }
  if (next.label === "Medium") {
    stirVisiblePressure(game, 3);
    game.log("The floor starts moving in formed patrols.", "warning");
    return;
  }
  if (next.label === "High") {
    stirVisiblePressure(game, 5);
    const wave = spawnReinforcementWave(game, "High");
    if (wave.length > 0) {
      game.log("A hunter squad joins the floor. Stalling is over.", "bad");
    } else {
      game.log("The floor turns aggressive and the pressure spikes.", "bad");
    }
    return;
  }
  if (next.label === "Critical") {
    const wave = spawnReinforcementWave(game, "Critical");
    game.log(wave.length > 0 ? "Critical danger: reinforcements close off a clean retreat." : "Critical danger: the halls are openly hostile now.", "bad");
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
  level.reinforcementClock = Math.max(8, 18 + depth * 2);
  level.directorFlags = {
    mediumTriggered: false,
    highTriggered: false,
    criticalTriggered: false,
    introShown: false
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

  level.dangerScore = Math.max(0, (level.dangerScore || 0) + amount);
  const band = getBandFromScore(level.dangerScore);
  level.dangerLevel = band.label;
  level.dangerTone = band.color;
  level.reinforcementClock = Math.max(4, (level.reinforcementClock || 10) - amount);
  syncDangerState(game);
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
  if (game.currentLevel.floorObjective?.intro) {
    game.log(game.currentLevel.floorObjective.intro, "warning");
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
  if (turns > 0 && turns % (level.floorResolved ? 10 : 16) === 0) {
    increaseDanger(game, "time", level.floorResolved ? 2 : 1);
  }
  level.reinforcementClock -= level.floorResolved ? 2 : 1;
  if (level.reinforcementClock <= 0) {
    const band = level.dangerLevel || "Medium";
    const wave = spawnReinforcementWave(game, band);
    if (wave.length > 0) {
      game.log(band === "Critical" ? "The floor sends another wave. Leave or be buried here." : "Reinforcements spill into the floor.", band === "Low" ? "warning" : "bad");
      if (game.recordChronicleEvent) {
        game.recordChronicleEvent("reinforcements", {
          band,
          count: wave.length,
          depth: game.currentDepth
        });
      }
    }
    level.reinforcementClock = Math.max(4, 14 - Math.min(6, Math.floor(level.dangerScore / 2)));
    syncDangerState(game);
  }
}

function getDangerSummary(level) {
  if (!level || level.kind !== "dungeon") {
    return "Town is stable.";
  }
  const clock = level.reinforcementClock || 0;
  if (level.dangerLevel === "Critical") {
    return `Critical danger. Reinforcements in about ${clock} turns.`;
  }
  if (level.dangerLevel === "High") {
    return `High danger. Reinforcements in about ${clock} turns.`;
  }
  if (level.dangerLevel === "Medium") {
    return `Medium danger. Patrols are awake. Reinforcements in about ${clock} turns.`;
  }
  return `Low danger. Quiet for now, but the floor will not stay that way.`;
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

const SHOP_TIER_STOCK = {
  general: {
    1: ["healingPotion", "manaPotion", "identifyScroll", "mappingScroll", "travelBoots"],
    2: ["teleportScroll", "removeCurseScroll", "torchCharm"],
    3: ["runeScroll", "goldCharm"]
  },
  armory: {
    1: ["shortSword", "broadSword", "leatherArmor", "buckler", "bronzeHelm"],
    2: ["battleAxe", "chainMail", "towerShield", "ironHelm"],
    3: ["warHammer", "plateMail"]
  },
  guild: {
    1: ["oakStaff", "spellfocusRing", "spellbookFrost", "spellbookIdentify", "manaPotion"],
    2: ["spellbookPhase", "spellbookSlow", "wandLightning", "wandSlow"],
    3: ["spellbookFire", "spellbookCurse", "staffHealing"]
  },
  temple: {
    1: ["healingPotion", "manaPotion", "goldCharm"],
    2: ["torchCharm", "spellbookMind", "runeScroll"],
    3: ["removeCurseScroll"]
  }
};

function unlocked(game, unlockId) {
  return Boolean(game.townUnlocks?.[unlockId]);
}

function ensureTownMetaState(game) {
  game.townUnlocks = {
    supply_cache: false,
    guild_license: false,
    temple_favors: false,
    archive_maps: false,
    ghost_bargains: false,
    deep_contracts: false,
    ...(game.townUnlocks || {})
  };
  game.rumorTable = Array.isArray(game.rumorTable) ? game.rumorTable : [];
  game.shopTiers = {
    general: 1,
    armory: 1,
    guild: 1,
    temple: 1,
    ...(game.shopTiers || {})
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
}

function getTemplePrice(game, basePrice) {
  ensureTownMetaState(game);
  return unlocked(game, "temple_favors") ? Math.round(basePrice * 0.85) : basePrice;
}

function getShopPool(game, shopId) {
  ensureTownMetaState(game);
  const tiers = SHOP_TIER_STOCK[shopId];
  if (!tiers) {
    return [...(SHOPS[shopId]?.stock || [])];
  }
  const tier = game.shopTiers[shopId] || 1;
  const pool = [];
  for (let current = 1; current <= tier; current += 1) {
    pool.push(...(tiers[current] || []));
  }
  return [...new Set(pool)];
}

function refreshTownStocks(game) {
  ensureTownMetaState(game);
  Object.keys(game.shopState || {}).forEach((shopId) => {
    if (!SHOPS[shopId] || SHOPS[shopId].stock.length === 0) {
      return;
    }
    const pool = getShopPool(game, shopId);
    const count = Math.max(4, Math.min(pool.length, shopId === "guild" ? 8 : 6 + Math.max(0, (game.shopTiers[shopId] || 1) - 1)));
    game.shopState[shopId].stock = shuffle(pool).slice(0, count);
    game.shopState[shopId].lastRefresh = game.turn;
  });
}

function getUnlockCost(unlockId) {
  const ordered = ["supply_cache", "guild_license", "temple_favors", "archive_maps", "ghost_bargains", "deep_contracts"];
  const index = Math.max(0, ordered.indexOf(unlockId));
  return 140 + index * 70;
}

function getAvailableTownUnlocks(game) {
  ensureTownMetaState(game);
  return Object.values(TOWN_UNLOCK_DEFS)
    .filter((unlockDef) => !game.townUnlocks[unlockDef.id])
    .map((unlockDef) => ({
      ...unlockDef,
      cost: getUnlockCost(unlockDef.id)
    }));
}

function purchaseTownUnlock(game, unlockId) {
  ensureTownMetaState(game);
  const unlockDef = TOWN_UNLOCK_DEFS[unlockId];
  if (!unlockDef || game.townUnlocks[unlockId]) {
    return false;
  }
  const cost = getUnlockCost(unlockId);
  if (game.player.gold < cost) {
    game.log("You cannot fund that town project yet.", "warning");
    return false;
  }
  game.player.gold -= cost;
  game.townUnlocks[unlockId] = true;
  ensureTownMetaState(game);
  refreshTownStocks(game);
  game.log(`Town improvement funded: ${unlockDef.name}.`, "good");
  game.recordChronicleEvent?.("town_unlock", {
    unlockId,
    label: unlockDef.name
  });
  return true;
}

function getNextFloorRumor(game) {
  const depth = Math.min(game.levels.length - 1, Math.max(1, game.currentDepth + 1));
  const level = game.levels?.[depth];
  const theme = getDepthTheme(depth);
  const rumorEntries = [];
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
  return rumorEntries[0] || null;
}

function buyTownRumor(game) {
  ensureTownMetaState(game);
  const price = unlocked(game, "archive_maps") ? 25 : 40;
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
  return true;
}

function getTownIntel(game) {
  ensureTownMetaState(game);
  const nextRumor = getNextFloorRumor(game);
  const known = game.rumorTable
    .map((id) => RUMOR_DEFS[id])
    .filter(Boolean)
    .slice(-3);
  return {
    nextRumor,
    known
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
  if (entry.type === "objective_complete") {
    return `Objective cleared: ${entry.payload.label} on depth ${entry.depth}.`;
  }
  if (entry.type === "greed_choice") {
    return `Stayed greedy at ${entry.payload.label} on depth ${entry.depth}.`;
  }
  if (entry.type === "elite_kill") {
    return `Killed ${entry.payload.label} on depth ${entry.depth}.`;
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
  `;
}

// src/features/exploration.js

function performSearchCommand(game) {
  const result = createCommandResult();
  if (!game.player || game.mode !== "game") {
    return result;
  }
  const radius = game.getSearchRadiusForStats(game.player.stats);
  const searchPower = game.getSearchPowerForStats(game.player.stats, game.player.level) + getBuildSearchBonus(game);
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
  addCommandLog(result, found > 0 ? `You discover ${found} hidden feature${found === 1 ? "" : "s"}.` : "You search carefully but find nothing.", found > 0 ? "good" : "warning");
  addCommandSound(result, found > 0 ? "searchGood" : "search");
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
  game.currentDepth = nextDepth;
  game.currentLevel = game.levels[nextDepth];
  game.placePlayerAt(game.currentLevel.stairsDown.x, game.currentLevel.stairsDown.y);
  if (nextDepth === 0) {
    game.refreshShopState(true);
  }
  game.recordChronicleEvent?.("floor_enter", { label: game.currentLevel.description });
  addCommandLog(result, `You climb to ${game.currentLevel.description}.`, "warning");
  addCommandSound(result, "stairs");
  result.autosave = true;
  result.render = true;
  return result;
}

// src/features/combat.js

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
  const attackScore = isPlayer ? 10 + game.getAttackValue() + Math.floor(game.player.level / 2) + getBuildAttackBonus(game, defender) : attacker.attack;
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
  const damage = isPlayer ? roll(...game.getDamageRange()) + getBuildDamageBonus(game, defender, "physical") : roll(...attacker.damage);
  game.damageActor(attacker, defender, damage, "physical");
  return true;
}

function damageActor(game, attacker, defender, amount, damageType = "physical") {
  defender.hp -= amount;
  game.audio.play(defender.id === "player" ? "bad" : "hit");
  game.emitImpact(attacker, defender, game.getDamageEffectColor(damageType, defender), damageType);
  game.emitReadout(`-${amount}`, defender.x, defender.y, defender.id === "player" ? "#ffb0a0" : "#f4edd7");
  if (defender.id === "player") {
    game.log(`${attacker.name} hits ${defender.name} for ${amount}.`, "bad");
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

  game.log(`${attacker.name} hits ${defender.name} for ${amount}.`, attacker.id === "player" ? "good" : "bad");
  if (defender.hp <= 0) {
    game.killMonster(defender);
  }
}

function killMonster(game, monster) {
  removeFromArray(game.currentLevel.actors, monster);
  game.emitDeathBurst(monster.x, monster.y, monster.color || "#f2deb1");
  const gold = randInt(monster.gold[0], monster.gold[1]);
  if (gold > 0) {
    game.currentLevel.items.push({ x: monster.x, y: monster.y, kind: "gold", name: "Gold", amount: gold });
  }
  if (Math.random() < 0.42) {
    game.currentLevel.items.push({ ...rollTreasure(game.currentDepth), x: monster.x, y: monster.y });
  }
  if (monster.elite) {
    game.currentLevel.items.push({ ...rollTreasure(game.currentDepth + 1), x: monster.x, y: monster.y });
    recordChronicleEvent(game, "elite_kill", {
      label: monster.name,
      depth: game.currentDepth
    });
  }
  game.player.exp += monster.exp;
  game.log(`${monster.name} dies.`, "good");
  game.audio.play("good");
  game.flashTile(monster.x, monster.y, "#f2deb1", 180, { alpha: 0.16 });
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
  game.mode = "modal";
  game.showSimpleModal("Fallen", buildDeathRecapMarkup(game));
  game.render();
}

function processMonsters(game) {
  const level = game.currentLevel;
  level.actors.forEach((monster) => {
    if (monster.sleeping) {
      const wakes = distance(game.player, monster) <= 3 || (isVisible(level, monster.x, monster.y) && Math.random() < 0.55);
      if (wakes) {
        monster.sleeping = false;
        monster.alerted = 4;
      } else {
        return;
      }
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

    if (distanceToPlayer <= 1) {
      game.attack(monster, game.player);
      return;
    }

    if (monster.ranged && canSeePlayer && distanceToPlayer <= monster.ranged.range) {
      if (distanceToPlayer <= 2) {
        const retreat = findRetreatStep(game, monster);
        if (retreat) {
          monster.x = retreat.x;
          monster.y = retreat.y;
          return;
        }
      }
      if (Math.random() < 0.55) {
        game.playProjectile(monster, game.player, monster.ranged.color);
        game.log(`${monster.name} launches a ranged attack.`, "bad");
        game.audio.play("hit");
        game.damageActor(monster, game.player, roll(...monster.ranged.damage), "physical");
        return;
      }
    }

    if (monster.spells && canSeePlayer && monster.mana >= 4 && Math.random() < 0.24) {
      monster.mana -= 4;
      game.emitCastCircle(monster.x, monster.y, monster.abilities && monster.abilities.includes("summon") ? "#d6a8ff" : "#c9a5ff");
      if (monster.abilities && monster.abilities.includes("slow") && Math.random() < 0.35) {
        game.log(`${monster.name} casts a crippling spell.`, "bad");
        game.playProjectile(monster, game.player, "#bfd9ff");
        game.player.slowed = Math.max(game.player.slowed || 0, 2);
      } else {
        game.log(`${monster.name} hurls dark magic.`, "bad");
        game.playProjectile(monster, game.player, "#c9a5ff");
        game.damageActor(monster, game.player, roll(2, 5) + game.currentDepth, "magic");
      }
      if (monster.abilities && monster.abilities.includes("summon") && Math.random() < 0.25) {
        summonMonsterNear(level, monster.x, monster.y, weightedMonster(game.currentDepth));
        game.log(`${monster.name} calls for aid from the dark.`, "bad");
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
      if (isVisible(level, monster.x, monster.y)) {
        game.log(`${monster.name} lowers itself for a brutal rush.`, "warning");
      }
      return;
    }

    let stepX = 0;
    let stepY = 0;
    if (monster.alerted > 0) {
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

// src/features/turns.js

function performWait(game) {
  if (!game.player || game.mode !== "game") {
    return;
  }
  game.log(`${game.player.name} waits.`, "warning");
  game.audio.play("ui");
  onPlayerWait(game);
  game.makeNoise(3, game.player, "wait");
  game.endTurn();
}

function restUntilSafe(game) {
  if (!game.player || game.mode !== "game") {
    return;
  }
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

function resolveTurn(game, advanceTurn = true) {
  if (advanceTurn) {
    game.turn += 1;
  }
  const encumbrance = getEncumbranceTier(game.player);
  const hpRegenBase = encumbrance >= 2 ? 0.01 : encumbrance === 1 ? 0.02 : 0.03;
  const manaRegenBase = encumbrance >= 2 ? 0.02 : encumbrance === 1 ? 0.04 : 0.06;
  const hpRegen = hpRegenBase + Math.max(0, game.player.stats.con - 10) * 0.004;
  const manaRegen = manaRegenBase + Math.max(0, game.player.stats.int - 10) * 0.006;
  game.player.hp = Math.min(game.player.maxHp, game.player.hp + hpRegen);
  game.player.mana = Math.min(game.player.maxMana, game.player.mana + manaRegen);
  advanceDangerTurn(game);
  game.processMonsters();
  if (encumbrance >= 2 && game.currentDepth > 0) {
    game.processMonsters();
  }
  if ((game.player.slowed || 0) > 0) {
    game.player.slowed -= 1;
  }
  game.updateFov();
  game.updateMonsterIntents();
  game.checkQuestState();
  game.render();
}

function endTurn(game, advanceTurn = true) {
  if ((game.hasPendingProgressionChoice && game.hasPendingProgressionChoice()) || game.pendingSpellChoices > 0) {
    game.pendingTurnResolution = advanceTurn;
    if (!game.showNextProgressionModal || !game.showNextProgressionModal()) {
      game.render();
    }
    return;
  }
  game.resolveTurn(advanceTurn);
}

// src/features/advisor.js

function buildObjectiveAdvice(game, tile, hpRatio, visible, focus, lootHere) {
  const objectiveText = getObjectiveStatusText(game.currentLevel);
  const optionalText = getOptionalStatusText(game.currentLevel);
  const actions = [];
  const pushAction = (action, label, note, recommended = false, tab = "") => {
    if (!actions.some((entry) => entry.action === action)) {
      actions.push({ action, label, note, recommended, tab });
    }
  };

  let advice = objectiveText;
  if (visible.length > 0 && focus) {
    const health = getMonsterHealthState(focus);
    advice = `${focus.name}: ${health.label.toLowerCase()}, ${game.getMonsterIntentLabel(focus).toLowerCase()}.`;
    if (hpRatio < 0.35) {
      advice = `${focus.name} has you in lethal range. Break contact or spend a tool now.`;
      pushAction("stairs-up", "Ascend", "Leave the floor", true);
      pushAction("open-hub", "Magic", "Use control or escape", false, "magic");
    } else if (focus.ranged) {
      pushAction("open-hub", "Magic", "Answer ranged pressure", true, "magic");
      pushAction("wait", "Hold", "Do not walk into fire", false);
    } else if (focus.abilities && focus.abilities.includes("charge")) {
      pushAction("wait", "Hold", "Read the charge lane", true);
      pushAction("open-hub", "Magic", "Slow or burst it", false, "magic");
    } else if (focus.abilities && focus.abilities.includes("summon")) {
      pushAction("open-hub", "Magic", "Kill the summoner", true, "magic");
    } else {
      pushAction("wait", "Hold", "Take the clean exchange", false);
    }
  } else if (lootHere.length > 0) {
    advice = `Underfoot: ${game.summarizeLoot(lootHere, 2)}.`;
    pushAction("pickup", "Pick Up", lootHere.length === 1 ? game.describeItemReadout(lootHere[0]) : `${lootHere.length} items underfoot`, true);
  } else if (tile.objectiveId) {
    advice = game.currentLevel.floorResolved
      ? "The floor objective is already cleared. Decide whether to extract or stay greedy."
      : "You have reached the objective tile. Resolve it before you think about the stairs.";
    pushAction("interact", "Resolve", "Finish the floor objective", true);
  } else if (tile.optionalId) {
    advice = "Optional value is here. Touch it only if you want more reward and more danger.";
    pushAction("interact", "Tempt Fate", "Open the optional encounter", true);
  } else if (tile.kind === "stairUp" && game.currentDepth > 0) {
    advice = hpRatio < 0.45 ? "You have an escape route under your feet." : "The stairs up are ready if you want to bank progress.";
    pushAction("stairs-up", "Ascend", "Leave the floor", hpRatio < 0.45);
  } else if (tile.kind === "stairDown") {
    if (game.currentLevel.floorResolved) {
      advice = "The stairs down are open.";
      pushAction("stairs-down", "Descend", "Push the run deeper", true);
    } else {
      advice = "The stairs are here, but the floor objective still matters.";
      pushAction("search", "Scout", "Find the objective", true);
    }
  } else if (game.currentDepth > 0 && hpRatio < 0.75) {
    advice = "The floor is quiet enough to recover, but resting still creates pressure.";
    pushAction("rest", "Rest", "Recover until disturbed", true);
    pushAction("search", "Search", "Probe for routes", false);
  } else if (game.currentDepth > 0) {
    advice = game.currentLevel.floorResolved
      ? "Objective complete. Search for greed, or leave while the floor still allows it."
      : objectiveText;
    pushAction("search", "Search", "Probe for secrets or routes", true);
  }

  return {
    advice,
    objectiveText,
    optionalText,
    actions
  };
}

function chooseSecondaryAction(game, actions, primaryAction) {
  const remaining = actions.filter((entry) => entry.action !== primaryAction);
  const preferred = remaining.find((entry) => entry.action !== "wait");
  if (preferred) {
    return preferred;
  }
  if (game.player.spellsKnown.length > 0 && primaryAction !== "open-hub") {
    return {
      action: "open-hub",
      label: "Magic",
      note: "Cast, burst, or control",
      tab: "magic"
    };
  }
  if (game.currentDepth > 0) {
    return {
      action: "search",
      label: "Search",
      note: "Probe for secrets or routes"
    };
  }
  return {
    action: "open-hub",
    label: "Journal",
    note: "Review directives and run notes",
    tab: "journal"
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
        action: game.player.spellsKnown.length > 0 ? "open-hub" : "map-focus",
        tab: game.player.spellsKnown.length > 0 ? "magic" : ""
      },
      {
        key: "pack",
        prompt: "Y",
        label: "Pack",
        note: "Review loadout",
        action: "open-hub",
        tab: "pack"
      },
      {
        key: "back",
        prompt: "B",
        label: "Cancel",
        note: "Leave targeting",
        action: "target-cancel"
      }
    ];
  }

  const primary = actions[0] || {
    action: game.currentDepth > 0 ? "search" : "map-focus",
    label: game.currentDepth > 0 ? "Search" : "Survey",
    note: game.currentDepth > 0 ? "Probe for routes" : "Check the minimap"
  };
  const secondary = chooseSecondaryAction(game, actions, primary.action);

  return [
    {
      key: "primary",
      prompt: "A",
      label: primary.label,
      note: primary.note,
      action: primary.action,
      tab: primary.tab || "",
      tone: "primary",
      active: true
    },
    {
      key: "secondary",
      prompt: "X",
      label: secondary.label,
      note: secondary.note,
      action: secondary.action,
      tab: secondary.tab || ""
    },
    {
      key: "pack",
      prompt: "Y",
      label: "Pack",
      note: "Review loadout",
      action: "open-hub",
      tab: "pack"
    },
    {
      key: "back",
      prompt: "B",
      label: "Wait",
      note: "Spend a careful turn",
      action: "wait"
    }
  ];
}

function renderThreatRows(game, visible, focus) {
  if (visible.length === 0) {
    return "<div class='muted'>No visible enemies.</div>";
  }
  return visible.slice(0, 4).map((monster) => {
    const health = getMonsterHealthState(monster);
    const ratio = Math.round(getHealthRatio(monster) * 100);
    const isFocus = monster === focus;
    return `
      <div class="threat-row${isFocus ? " active" : ""}">
        <div class="threat-row-main">
          <div class="threat-row-name">${escapeHtml(monster.name)}</div>
          <div class="threat-row-meta">${escapeHtml(game.getMonsterRoleLabel(monster))} · ${escapeHtml(game.getMonsterIntentLabel(monster))}</div>
        </div>
        <div class="threat-row-side">
          <div class="threat-tag ${health.tone}">${escapeHtml(health.label)}</div>
          <div class="threat-row-distance">${distance(game.player, monster)} tiles · ${monster.hp}/${monster.maxHp || monster.hp} HP</div>
        </div>
        <div class="meter threat-health"><span style="width:${ratio}%"></span></div>
      </div>
    `;
  }).join("");
}

function getAdvisorModel(game) {
  if (!game.player || !game.currentLevel) {
    return {
      playerHtml: "<div class='muted'>No active run.</div>",
      threatHtml: "<div class='muted'>No threats yet.</div>",
      advisorHtml: "<div class='advisor-label'>Field Read</div><div class='advisor-text'>Create a character to begin.</div>",
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
  const condition = game.player.slowed ? "Slowed" : burdenUi.state === "overloaded" ? "Overburdened" : burdenUi.state === "warning" || burdenUi.state === "danger" ? "Burdened" : "Steady";
  const locationLabel = game.currentDepth > 0 ? `Depth ${game.currentDepth}` : "Town";
  const objectiveView = buildObjectiveAdvice(game, tile, hpRatio, visible, focus, lootHere);
  const visibleLoot = game.getVisibleLootItems ? game.getVisibleLootItems() : [];
  const focusHealth = focus ? getMonsterHealthState(focus) : null;
  const dockSlots = buildDockSlots(game, objectiveView.actions);

  const playerHtml = `
    <div class="capsule-topline">
      <div>
        <div class="capsule-label">Adventurer</div>
        <div class="capsule-headline">${escapeHtml(game.player.name)}</div>
      </div>
      <div class="capsule-badge ${game.currentDepth > 0 ? "warning" : "good"}">${escapeHtml(locationLabel)}</div>
    </div>
    <div class="meter-stack">
      <div class="meter-row"><span>Vitality</span><strong>${Math.floor(game.player.hp)}/${game.player.maxHp}</strong></div>
      <div class="meter hp"><span style="width:${clamp(Math.round(hpRatio * 100), 0, 100)}%"></span></div>
      <div class="meter-row"><span>Aether</span><strong class="${manaRatio < 0.3 ? "value-warning" : ""}">${Math.floor(game.player.mana)}/${game.player.maxMana}</strong></div>
      <div class="meter mana"><span style="width:${clamp(Math.round(manaRatio * 100), 0, 100)}%"></span></div>
      <div class="meter-row"><span>Burden</span><strong class="burden-value burden-${burdenUi.state}">${burdenUi.weight} / ${burdenUi.capacity}</strong></div>
      <div class="meter burden burden-${burdenUi.state}"><span style="width:${burdenUi.percent}%"></span></div>
    </div>
    <div class="capsule-line compact-line"><span>Condition</span><strong class="${game.player.slowed || burdenUi.state !== "safe" ? "value-warning" : ""}">${condition}</strong></div>
    <div class="capsule-line compact-line"><span>Load Read</span><strong class="burden-${burdenUi.state}">${escapeHtml(burdenUi.label)}</strong></div>
  `;

  const threatSummary = focus
    ? `
      <div class="capsule-topline">
        <div>
          <div class="capsule-label">Primary Threat</div>
          <div class="capsule-headline">${escapeHtml(focus.name)}</div>
        </div>
        <div class="capsule-badge ${focusHealth.tone}">${escapeHtml(focusHealth.label)}</div>
      </div>
      <div class="capsule-subline">${escapeHtml(game.getMonsterRoleLabel(focus))} · ${escapeHtml(game.getMonsterIntentLabel(focus))} · ${distance(game.player, focus)} tiles</div>
      <div class="meter-stack">
        <div class="meter-row"><span>Enemy Health</span><strong>${focus.hp}/${focus.maxHp || focus.hp}</strong></div>
        <div class="meter threat-health"><span style="width:${Math.round(getHealthRatio(focus) * 100)}%"></span></div>
      </div>
      <div class="threat-roster">${renderThreatRows(game, visible, focus)}</div>
      <div class="capsule-line compact-line"><span>Underfoot</span><strong>${escapeHtml(lootHere.length > 0 ? game.summarizeLoot(lootHere, 2) : "Nothing")}</strong></div>
    `
    : `
      <div class="capsule-topline">
        <div>
          <div class="capsule-label">Sightline</div>
          <div class="capsule-headline">No visible enemies</div>
        </div>
        <div class="capsule-badge good">Clear</div>
      </div>
      <div class="capsule-subline">${escapeHtml(game.currentDepth > 0 ? getDangerSummary(game.currentLevel) : "Town is quiet.")}</div>
      <div class="capsule-line compact-line"><span>Objective</span><strong>${escapeHtml(objectiveView.objectiveText)}</strong></div>
      <div class="capsule-line compact-line"><span>Visible Loot</span><strong>${escapeHtml(visibleLoot.length > 0 ? game.summarizeLoot(visibleLoot, 2) : "None in sight")}</strong></div>
      <div class="capsule-line compact-line"><span>Underfoot</span><strong>${escapeHtml(lootHere.length > 0 ? game.summarizeLoot(lootHere, 2) : "Nothing")}</strong></div>
    `;

  const advisorHtml = `
    <div class="advisor-label">Field Read</div>
    <div class="advisor-text">${escapeHtml(objectiveView.advice)}</div>
    <div class="advisor-meta">
      <span class="advisor-chip">${escapeHtml(objectiveView.objectiveText)}</span>
      ${objectiveView.optionalText ? `<span class="advisor-chip">${escapeHtml(objectiveView.optionalText)}</span>` : ""}
    </div>
  `;

  return { playerHtml, threatHtml: threatSummary, advisorHtml, dockSlots };
}

function renderPanels(game) {
  if (!game.player) {
    if (game.playerCapsule) {
      game.playerCapsule.innerHTML = "<div class='muted'>No active run.</div>";
    }
    if (game.threatCapsule) {
      game.threatCapsule.innerHTML = "<div class='muted'>No visible threats.</div>";
    }
    if (game.advisorStrip) {
      game.advisorStrip.innerHTML = "<div class='advisor-label'>Field Read</div><div class='advisor-text'>Create a character to begin.</div>";
    }
    return;
  }

  const advisor = getAdvisorModel(game);
  if (game.playerCapsule) {
    game.playerCapsule.innerHTML = advisor.playerHtml;
    game.playerCapsule.dataset.burdenState = game.getBurdenUiState().state;
  }
  if (game.threatCapsule) {
    game.threatCapsule.innerHTML = advisor.threatHtml;
  }
  if (game.advisorStrip) {
    game.advisorStrip.innerHTML = advisor.advisorHtml;
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
    <button class="action-button dock-action dock-slot dock-slot-${slot.key}${slot.tone === "primary" ? " recommended" : ""}${slot.active ? " is-active" : ""}" data-action="${slot.action}"${slot.tab ? ` data-tab="${slot.tab}"` : ""} type="button">
      <span class="context-slot">${escapeHtml(slot.prompt)}</span>
      <span class="context-copy">
        <span class="context-main">${escapeHtml(slot.label)}</span>
        <span class="context-note">${escapeHtml(slot.note)}</span>
      </span>
    </button>
  `).join("");
}

// src/ui/render.js

const TOWN_TERRAIN_PATHS = {
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

const TOWN_BUILDING_PATHS = {
  general: "./assets/buildings/town/general.png",
  junk: "./assets/buildings/town/junk.png",
  armory: "./assets/buildings/town/armory.png",
  guild: "./assets/buildings/town/guild.png",
  temple: "./assets/buildings/town/temple.png",
  bank: "./assets/buildings/town/bank.png",
  sage: "./assets/buildings/town/house.png"
};

const MONSTER_ATLAS_PATHS = {
  beasts: "./assets/enemies/four-dungeon-enemies.jpeg",
  undead: "./assets/enemies/undead-enemies.png"
};

const MONSTER_ICON_ASSIGNMENTS = {
  rat: "rat",
  slime: "slime",
  skeleton: "skeletonWarrior",
  troll: "brute",
  ogre: "brute",
  wraith: "wraith"
};

const MONSTER_ICON_REGIONS = {
  rat: { atlas: "beasts", x: 90, y: 24, width: 360, height: 360 },
  bat: { atlas: "beasts", x: 620, y: 20, width: 610, height: 300 },
  spider: { atlas: "beasts", x: 40, y: 300, width: 560, height: 440 },
  slime: { atlas: "beasts", x: 770, y: 350, width: 420, height: 340 },
  skeletonWarrior: { atlas: "undead", x: 70, y: 20, width: 430, height: 340 },
  skeletonArcher: { atlas: "undead", x: 760, y: 20, width: 360, height: 330 },
  brute: { atlas: "undead", x: 110, y: 340, width: 450, height: 340 },
  wraith: { atlas: "undead", x: 760, y: 340, width: 360, height: 320 }
};

const TOWN_BUILDING_RENDER = {
  general: { width: 0.78, height: 0.66, crop: 0.86, yOffset: 0.5 },
  junk: { width: 0.72, height: 0.62, crop: 0.9, yOffset: 0.52 },
  armory: { width: 0.8, height: 0.68, crop: 0.84, yOffset: 0.56 },
  guild: { width: 0.62, height: 0.62, crop: 0.94, yOffset: 0.46 },
  temple: { width: 0.84, height: 0.72, crop: 0.86, yOffset: 0.46 },
  bank: { width: 0.82, height: 0.7, crop: 0.88, yOffset: 0.5 },
  sage: { width: 0.56, height: 0.56, crop: 0.94, yOffset: 0.42 }
};

const townTerrainImages = buildTownTerrainImages();
const townBuildingImages = buildTownBuildingImages();
const monsterIconAtlas = buildMonsterIconAtlas();

function buildTownTerrainImages() {
  if (typeof Image === "undefined") {
    return null;
  }
  return {
    grass: TOWN_TERRAIN_PATHS.grass.map(loadImage),
    roadHorizontal: TOWN_TERRAIN_PATHS.roadHorizontal.map(loadImage),
    roadVertical: TOWN_TERRAIN_PATHS.roadVertical.map(loadImage),
    roadCross: loadImage(TOWN_TERRAIN_PATHS.roadCross)
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
    Object.entries(TOWN_BUILDING_PATHS).map(([key, src]) => [key, loadImage(src)])
  );
}

function isImageReady(image) {
  return Boolean(image && image.complete && image.naturalWidth > 0);
}

function buildMonsterIconAtlas() {
  if (typeof Image === "undefined") {
    return null;
  }
  return {
    images: Object.fromEntries(
      Object.entries(MONSTER_ATLAS_PATHS).map(([key, path]) => [key, loadImage(path)])
    ),
    cache: {}
  };
}

function sampleBackdropColor(imageData, width, height) {
  const points = [
    [4, 4],
    [width - 5, 4],
    [4, height - 5],
    [width - 5, height - 5]
  ];
  const total = { r: 0, g: 0, b: 0 };
  points.forEach(([x, y]) => {
    const index = (y * width + x) * 4;
    total.r += imageData[index];
    total.g += imageData[index + 1];
    total.b += imageData[index + 2];
  });
  return {
    r: total.r / points.length,
    g: total.g / points.length,
    b: total.b / points.length
  };
}

function buildMonsterIcon(image, region) {
  const sourceCanvas = createCanvas(region.width, region.height);
  if (!sourceCanvas) {
    return null;
  }
  const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  sourceCtx.drawImage(
    image,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    region.width,
    region.height
  );

  const imageData = sourceCtx.getImageData(0, 0, region.width, region.height);
  const pixels = imageData.data;
  const backdrop = sampleBackdropColor(pixels, region.width, region.height);
  let minX = region.width;
  let minY = region.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < region.height; y += 1) {
    for (let x = 0; x < region.width; x += 1) {
      const index = (y * region.width + x) * 4;
      const dr = pixels[index] - backdrop.r;
      const dg = pixels[index + 1] - backdrop.g;
      const db = pixels[index + 2] - backdrop.b;
      const distance = Math.sqrt((dr * dr) + (dg * dg) + (db * db));
      if (distance < 28) {
        pixels[index + 3] = 0;
        continue;
      }
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  sourceCtx.putImageData(imageData, 0, 0);
  if (maxX < minX || maxY < minY) {
    return sourceCanvas;
  }

  const padding = 10;
  const trimmedWidth = (maxX - minX) + 1;
  const trimmedHeight = (maxY - minY) + 1;
  const outputCanvas = createCanvas(trimmedWidth + (padding * 2), trimmedHeight + (padding * 2));
  if (!outputCanvas) {
    return sourceCanvas;
  }
  const outputCtx = outputCanvas.getContext("2d");
  outputCtx.drawImage(
    sourceCanvas,
    minX,
    minY,
    trimmedWidth,
    trimmedHeight,
    padding,
    padding,
    trimmedWidth,
    trimmedHeight
  );
  return outputCanvas;
}

function getMonsterIcon(monster) {
  const iconKey = MONSTER_ICON_ASSIGNMENTS[monster.id] || monster.icon || monster.sprite;
  const region = MONSTER_ICON_REGIONS[iconKey];
  if (!monsterIconAtlas || !region) {
    return null;
  }
  const image = monsterIconAtlas.images[region.atlas];
  if (!isImageReady(image)) {
    return null;
  }
  if (!monsterIconAtlas.cache[iconKey]) {
    monsterIconAtlas.cache[iconKey] = buildMonsterIcon(image, region);
  }
  return monsterIconAtlas.cache[iconKey];
}

function drawMonsterIcon(ctx, monster, sx, sy) {
  const icon = getMonsterIcon(monster);
  if (!icon) {
    return false;
  }

  const tileX = sx * TILE_SIZE;
  const tileY = sy * TILE_SIZE;
  const drawArea = TILE_SIZE - 2;
  const scale = Math.min(drawArea / icon.width, drawArea / icon.height);
  const width = icon.width * scale;
  const height = icon.height * scale;
  const dx = tileX + ((TILE_SIZE - width) / 2);
  const dy = tileY + TILE_SIZE - height - 1;

  ctx.fillStyle = "rgba(6, 8, 10, 0.32)";
  ctx.beginPath();
  ctx.ellipse(tileX + 12, tileY + 18, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.drawImage(icon, dx, dy, width, height);
  return true;
}

function tileHash(x, y, modulo) {
  const hash = ((x * 73856093) ^ (y * 19349663)) >>> 0;
  return modulo > 0 ? hash % modulo : 0;
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
    TOWN_BUILDING_PATHS[building.service]
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
  const palette = visible ? tile.palette : tile.palette.map((color) => shadeColor(color, -90));
  ctx.fillStyle = palette[0];
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = palette[1];
  ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

  switch (tile.kind) {
    case "wall":
    case "buildingWall":
    case "pillar":
      ctx.fillStyle = palette[2];
      if (tile.kind === "pillar") {
        ctx.fillRect(x + 7, y + 4, 10, 16);
        ctx.fillRect(x + 5, y + 6, 14, 3);
        ctx.fillRect(x + 5, y + 17, 14, 3);
      } else {
        for (let yy = 3; yy < TILE_SIZE; yy += 7) {
          const offset = yy % 14 === 3 ? 0 : 6;
          for (let xx = 0; xx < TILE_SIZE; xx += 12) {
            ctx.fillRect(x + 1 + xx + offset, y + yy, 8, 3);
          }
        }
      }
      break;
    case "road":
    case "floor":
    case "buildingFloor":
    case "plaza":
    case "stone":
      ctx.fillStyle = visible ? "rgba(5, 9, 10, 0.12)" : "rgba(5, 9, 10, 0.24)";
      ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      ctx.fillStyle = palette[2];
      ctx.fillRect(x + 6, y + 6, 3, 3);
      ctx.fillRect(x + 14, y + 11, 3, 3);
      ctx.fillRect(x + 10, y + 16, 2, 2);
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
      ctx.fillStyle = palette[2];
      for (let i = 0; i < 5; i += 1) {
        ctx.fillRect(x + 5 + i * 2, y + 5 + i * 3, 10 - i * 2, 2);
      }
      break;
    case "buildingDoor":
      ctx.fillStyle = "#6c4621";
      ctx.fillRect(x + 7, y + 5, 10, 14);
      ctx.fillStyle = "#d4b073";
      ctx.fillRect(x + 9, y + 7, 6, 10);
      break;
    case "sign":
      ctx.fillStyle = "#6d4b22";
      ctx.fillRect(x + 10, y + 8, 4, 12);
      ctx.fillStyle = "#d3bc8d";
      ctx.fillRect(x + 5, y + 4, 14, 7);
      break;
    case "altar":
      ctx.fillStyle = "#cabdd7";
      ctx.fillRect(x + 5, y + 6, 14, 10);
      ctx.fillStyle = palette[2];
      ctx.fillRect(x + 8, y + 16, 8, 3);
      break;
    case "trap":
      ctx.fillStyle = palette[2];
      ctx.beginPath();
      ctx.moveTo(x + 4, y + 19);
      ctx.lineTo(x + 8, y + 7);
      ctx.lineTo(x + 12, y + 19);
      ctx.lineTo(x + 16, y + 7);
      ctx.lineTo(x + 20, y + 19);
      ctx.strokeStyle = palette[2];
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    case "fountain":
      ctx.fillStyle = palette[2];
      ctx.fillRect(x + 6, y + 14, 12, 4);
      ctx.beginPath();
      ctx.arc(x + 12, y + 10, 5, Math.PI, 0);
      ctx.strokeStyle = palette[2];
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    case "throne":
      ctx.fillStyle = palette[2];
      ctx.fillRect(x + 7, y + 13, 10, 6);
      ctx.fillRect(x + 9, y + 7, 6, 7);
      ctx.fillRect(x + 5, y + 10, 2, 7);
      ctx.fillRect(x + 17, y + 10, 2, 7);
      break;
    case "secretDoor":
      ctx.fillStyle = palette[2];
      ctx.fillRect(x + 8, y + 5, 8, 14);
      ctx.fillRect(x + 10, y + 9, 4, 2);
      break;
    default:
      break;
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
  }
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
  if (drawMonsterIcon(ctx, monster, sx, sy)) {
    return;
  }
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
  if (item.kind === "gold") {
    ctx.fillStyle = "#e4c850";
    ctx.beginPath();
    ctx.arc(x + 12, y + 12, 5, 0, Math.PI * 2);
    ctx.fill();
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

  const pulseTime = reducedMotion ? 0.55 : 0.45 + Math.sin(time / 260) * 0.15;
  const featureColors = {
    stairDown: "rgba(255, 211, 107, 0.18)",
    stairUp: "rgba(127, 204, 255, 0.16)",
    fountain: "rgba(139, 205, 233, 0.18)",
    throne: "rgba(214, 170, 88, 0.18)",
    altar: "rgba(212, 168, 255, 0.2)"
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
    }
  }
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
  const pulse = reducedMotion ? 0.22 : 0.18 + (Math.sin(time / 110) + 1) * 0.08;
  if (source) {
    ctx.save();
    ctx.strokeStyle = `rgba(255, 211, 107, ${reducedMotion ? 0.38 : 0.3 + pulse * 0.3})`;
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
  ctx.fillStyle = `rgba(255, 211, 107, ${pulse})`;
  ctx.fillRect(sx * TILE_SIZE + 5, sy * TILE_SIZE + 5, TILE_SIZE - 10, TILE_SIZE - 10);
  ctx.strokeStyle = "#ffd36b";
  ctx.lineWidth = 2;
  ctx.strokeRect(sx * TILE_SIZE + 2, sy * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
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
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.fillStyle = effect.color;
    ctx.beginPath();
    ctx.arc(endX, endY, reducedMotion ? 3 : 2.5 + (1 - life) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (effect.type === "blink") {
    if (!tileOnScreen(effect, view)) {
      return;
    }
    const sx = effect.x - view.x;
    const sy = effect.y - view.y;
    ctx.save();
    ctx.strokeStyle = effect.color;
    ctx.globalAlpha = 0.9 - life * 0.5;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx * TILE_SIZE + 12, sy * TILE_SIZE + 12, 7 + life * 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (effect.type === "tileFlash" || effect.type === "telegraphPulse" || effect.type === "impactSpark" || effect.type === "castCircle" || effect.type === "deathBurst") {
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
  }

  updateSettings(settings) {
    this.settings = settings;
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
    this.lastAt = 0;
    this.lastButtons = new Map();
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

  poll(mode) {
    const pad = this.getGamepad();
    if (!pad) {
      return null;
    }
    const now = nowTime();
    const axes = pad.axes || [];
    const buttons = pad.buttons || [];
    const repeatReady = now - this.lastAt > 180;
    const dx = Math.abs(axes[0] || 0) > 0.45 ? Math.sign(axes[0]) : (buttons[15]?.pressed ? 1 : buttons[14]?.pressed ? -1 : 0);
    const dy = Math.abs(axes[1] || 0) > 0.45 ? Math.sign(axes[1]) : (buttons[13]?.pressed ? 1 : buttons[12]?.pressed ? -1 : 0);
    if ((dx || dy) && repeatReady) {
      this.lastAt = now;
      return { type: mode === "target" ? "target" : "move", dx, dy };
    }
    const pressed = (index) => {
      const current = !!buttons[index]?.pressed;
      const last = this.lastButtons.get(index) || false;
      this.lastButtons.set(index, current);
      return current && !last;
    };
    if (mode === "game" || mode === "target") {
      if (pressed(0)) { return { type: "dock", slot: "primary" }; }
      if (pressed(1)) { return { type: "dock", slot: "back" }; }
      if (pressed(2)) { return { type: "dock", slot: "secondary" }; }
      if (pressed(3)) { return { type: "dock", slot: "pack" }; }
    }
    if (pressed(0)) { return { type: "confirm" }; }
    if (pressed(1)) { return { type: "cancel" }; }
    if (pressed(4)) { return { type: "action", action: "open-hub", tab: "magic" }; }
    if (pressed(5)) { return { type: "action", action: "settings" }; }
    if (pressed(8)) { return { type: "action", action: "map-focus" }; }
    if (pressed(9)) { return { type: "action", action: "settings" }; }
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
const buildAdvisorModel = getAdvisorModel;
const renderAdvisorActionBar = renderActionBar;
const renderAdvisorPanels = renderPanels;
const raiseDanger = increaseDanger;
const markFloorGreedAction = markGreedAction;
const applyBoonReward = grantBoon;
const addRumorToken = grantRumorToken;


class Game {
  constructor() {
    this.appShell = document.querySelector(".mobile-app");
    this.canvas = document.getElementById("game-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.mapCanvas = document.getElementById("map-canvas");
    this.mapCtx = this.mapCanvas ? this.mapCanvas.getContext("2d") : null;
    this.mapCaption = document.getElementById("map-caption");
    this.modalRoot = document.getElementById("modal-root");
    this.actionBar = document.getElementById("action-bar");
    this.controllerStatus = document.getElementById("controller-status");
    this.saveStamp = document.getElementById("save-stamp");
    this.quickSaveButton = document.getElementById("quick-save-button");
    this.quickLoadButton = document.getElementById("quick-load-button");
    this.touchControls = document.getElementById("touch-controls");
    this.playerCapsule = document.getElementById("player-capsule");
    this.threatCapsule = document.getElementById("threat-capsule");
    this.advisorStrip = document.getElementById("advisor-strip");
    this.turn = 1;
    this.mode = "title";
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
    this.activePackSelection = { type: "inventory", value: 0 };
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
    this.rumorTable = [];
    this.chronicleEvents = [];
    this.deathContext = null;
    this.seenMonsters = new Set();
    this.loggedRoomReads = new Set();
    this.focusedThreat = null;
    this.pendingPickupPrompt = null;
    this.lastTownRefreshTurn = 0;
    this.settings = loadSettings();
    this.reducedMotionQuery = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
    document.documentElement.dataset.uiScale = this.settings.uiScale;
    this.shopState = createInitialShopState();
    ensureTownMetaState(this);
    ensureChronicleState(this);
    this.audio = new SoundBoard(this.settings);
    this.gamepadInput = new GamepadInput();
    this.bindEvents();
    this.registerServiceWorker();
    this.startRuntimeLoop();
    this.refreshChrome();
    this.showTitleScreen();
    this.render();
  }

  bindEvents() {
    document.addEventListener("keydown", (event) => this.handleKeydown(event));
    document.addEventListener("click", (event) => this.handleClick(event));
    document.addEventListener("input", (event) => {
      if (event.target && event.target.id === "hero-name") {
        this.creationName = event.target.value;
      }
    });
    this.canvas.addEventListener("click", (event) => this.handleCanvasClick(event));
    window.addEventListener("gamepadconnected", () => this.refreshChrome());
    window.addEventListener("gamepaddisconnected", () => this.refreshChrome());
    window.addEventListener("resize", () => this.refreshChrome());
  }

  startRuntimeLoop() {
    const tick = () => {
      this.pollGamepad();
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

  triggerDockSlot(key) {
    if (!this.player) {
      return;
    }
    const slot = this.getActionDockModel().find((entry) => entry.key === key);
    if (!slot || !slot.action) {
      return;
    }
    this.handleAction(slot.action, { dataset: { action: slot.action, tab: slot.tab || "" } });
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
    const afterWeight = beforeWeight + (item.weight || 0);
    const beforeTier = getEncumbranceTier(this.player);
    const afterTier = afterWeight > capacity ? 2 : afterWeight > capacity * 0.75 ? 1 : 0;
    return afterTier > beforeTier || (item.weight || 0) >= 5;
  }

  setModalVisibility(isOpen) {
    if (this.appShell) {
      this.appShell.classList.toggle("modal-open", isOpen);
    }
  }

  getLearnableSpellOptions() {
    return Object.values(SPELLS)
      .filter((spell) => (spell.learnLevel || 1) <= this.player.level && !this.player.spellsKnown.includes(spell.id))
      .sort((a, b) => {
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
      const [dx, dy] = moveButton.dataset.move.split(",").map(Number);
      this.handleMovementIntent(dx, dy);
      return;
    }

    const action = event.target.closest("[data-action]");
    if (action) {
      this.handleAction(action.dataset.action, action);
      return;
    }

    const raceChoice = event.target.closest("[data-race]");
    if (raceChoice) {
      this.captureCreationDraft();
      this.selectedRace = raceChoice.dataset.race;
      this.showCreationModal();
      return;
    }

    const classChoice = event.target.closest("[data-class]");
    if (classChoice) {
      this.captureCreationDraft();
      this.selectedClass = classChoice.dataset.class;
      this.showCreationModal();
    }
  }

  handleCanvasClick(event) {
    if (!this.player || (this.mode !== "game" && this.mode !== "target")) {
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
      this.performWait();
      return;
    }
    this.handleMovementIntent(dx, dy);
  }

  handleAction(actionName, element) {
    switch (actionName) {
      case "new-game":
        this.resetCreationDraft();
        this.showCreationModal();
        break;
      case "save-game":
        this.saveGame();
        break;
      case "load-game":
        this.loadGame();
        break;
      case "open-hub":
        this.showHubModal(element && element.dataset.tab ? element.dataset.tab : "pack");
        break;
      case "inventory":
        this.showInventoryModal();
        break;
      case "spells":
        this.showSpellModal();
        break;
      case "wait":
        this.performWait();
        break;
      case "rest":
        this.restUntilSafe();
        break;
      case "help":
        this.showHelpModal();
        break;
      case "settings":
        this.showSettingsModal();
        break;
      case "begin-adventure":
        this.beginAdventure();
        break;
      case "creation-reset-stats":
        this.captureCreationDraft();
        this.creationStatBonuses = { str: 0, dex: 0, con: 0, int: 0 };
        this.showCreationModal();
        break;
      case "creation-adjust-stat":
        this.captureCreationDraft();
        if (this.adjustCreationStat(element.dataset.stat, Number(element.dataset.delta))) {
          this.showCreationModal();
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
      case "inspect-pack-item":
        this.showHubModal("pack", { selection: { type: "inventory", value: Number(element.dataset.index) } });
        break;
      case "inspect-slot":
        this.showHubModal("pack", { selection: { type: "slot", value: element.dataset.slot } });
        break;
      case "unequip-slot":
        this.unequipSlot(element.dataset.slot);
        break;
      case "learn-spell":
        this.learnLevelUpSpell(element.dataset.spell);
        break;
      case "choose-reward":
        this.chooseRewardChoice(element.dataset.reward);
        break;
      case "spell-cast":
        this.prepareSpell(element.dataset.spell);
        break;
      case "shop-buy":
        this.buyShopItem(element.dataset.shop, element.dataset.item);
        break;
      case "shop-sell":
        this.sellShopItem(element.dataset.index);
        break;
      case "bank-deposit":
        this.handleBank("deposit");
        break;
      case "bank-withdraw":
        this.handleBank("withdraw");
        break;
      case "town-unlock":
        if (purchaseTownUnlock(this, element.dataset.unlock)) {
          this.showBankModal();
          this.render();
        }
        break;
      case "town-rumor":
        if (buyTownRumor(this)) {
          this.showBankModal();
          this.render();
        }
        break;
      case "service-use":
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

    if (!this.player || this.mode !== "game") {
      return;
    }

    const lower = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (DIRECTIONS[lower]) {
      event.preventDefault();
      const [dx, dy] = DIRECTIONS[lower];
      this.handleMovementIntent(dx, dy);
      return;
    }

    switch (lower) {
      case ".":
      case "5":
      case " ":
        event.preventDefault();
        this.performWait();
        break;
      case "i":
        event.preventDefault();
        this.showInventoryModal();
        break;
      case "s":
        event.preventDefault();
        this.showSpellModal();
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
    if (!this.player) {
      return;
    }
    if (this.mode === "target") {
      this.moveTargetCursor(dx, dy);
      return;
    }
    this.tryMovePlayer(dx, dy);
  }

  beginAdventure() {
    const race = getRace(this.selectedRace);
    const role = getClass(this.selectedClass);
    this.captureCreationDraft();
    const heroName = this.creationName || "Morgan";
    const stats = this.getCreationStats();

    this.player = {
      id: "player",
      name: heroName,
      race: race.name,
      className: role.name,
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
      inventory: [],
      equipment: {
        weapon: null,
        offhand: null,
        head: null,
        body: null,
        cloak: null,
        feet: null,
        ring: null,
        amulet: null
      },
      perks: [],
      relics: [],
      runCurrencies: {
        rumorTokens: 0,
        hunterMark: 0,
        templeFavor: 0
      },
      knownRumors: [],
      spellsKnown: [...role.spells],
      lightRadius: FOV_RADIUS,
      quest: {
        hasRunestone: false,
        complete: false
      }
    };

    role.startItems.forEach((itemId) => this.addItemToInventory(createTownItem(itemId)));
    this.autoEquipStarterGear();
    this.turn = 1;
    this.storyFlags = {};
    this.shopState = createInitialShopState();
    this.townUnlocks = {};
    this.shopTiers = {};
    this.rumorTable = [];
    this.chronicleEvents = [];
    this.deathContext = null;
    this.lastTownRefreshTurn = 0;
    this.pendingSpellChoices = 0;
    this.pendingPerkChoices = 0;
    this.pendingRewardChoice = null;
    this.pendingRewardQueue = [];
    this.pendingTurnResolution = null;
    this.resetReadState();
    ensureBuildState(this);
    ensureTownMetaState(this);
    ensureChronicleState(this);
    this.generateWorld();
    refreshTownStocks(this);
    this.recalculateDerivedStats();
    this.player.hp = this.player.maxHp;
    this.player.mana = this.player.maxMana;
    this.mode = "game";
    this.closeModal();
    this.log(`${heroName} enters the valley beneath the ruined keep.`, "good");
    this.log("Recover the Runestone of the Winds from the lower halls and return to town.", "warning");
    this.recordChronicleEvent("floor_enter", { label: "The valley town below the keep" });
    this.updateFov();
    this.saveGame({ silent: true });
    this.render();
  }

  autoEquipStarterGear() {
    const equippedIds = new Set();
    this.player.inventory.forEach((item, index) => {
      if ((item.kind === "weapon" || item.kind === "armor") && !this.player.equipment[item.slot]) {
        this.player.equipment[item.slot] = item;
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
    fillRect(level, 20, 13, 9, 7, tileDef("stone"));
    fillRect(level, 21, 14, 7, 5, tileDef("plaza"));
    placeBuilding(level, 4, 4, 9, 7, "Provisioner", "general");
    placeBuilding(level, 35, 4, 9, 7, "Armory", "armory");
    placeBuilding(level, 4, 22, 9, 7, "Guild", "guild");
    placeBuilding(level, 35, 22, 9, 7, "Temple", "temple");
    placeBuilding(level, 20, 25, 9, 5, "Bank", "bank");
    placeBuilding(level, 15, 4, 7, 6, "Sage", "sage");
    placeBuilding(level, 27, 4, 6, 6, "Junk", "junk");
    setTile(level, 24, 8, tileDef("stairDown"));
    level.start = { x: 24, y: 16 };
    level.stairsDown = { x: 24, y: 8 };
    level.description = "The valley town below the keep";
    revealAll(level);
    return level;
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

    if (rooms.length < 2) {
      return this.generateDungeonLevel(depth);
    }

    level.rooms = rooms;
    level.start = centerOf(rooms[0]);
    level.stairsUp = centerOf(rooms[0]);
    level.stairsDown = centerOf(rooms[rooms.length - 1]);
    setTile(level, level.stairsUp.x, level.stairsUp.y, tileDef("stairUp"));
    setTile(level, level.stairsDown.x, level.stairsDown.y, tileDef(depth === DUNGEON_DEPTH ? "altar" : "stairDown"));
    const theme = getDepthTheme(depth);
    level.description = `${theme.name} - depth ${depth}`;
    initializeDangerState(level, depth);
    this.placeDungeonContent(level, depth);
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

  placeDungeonContent(level, depth) {
    const spawnRooms = level.rooms.slice(1);
    const encounterState = populateDungeonEncounters(level, depth);
    setupFloorDirectives(level, depth, this.townUnlocks);

    const itemCount = 5 + depth;
    for (let i = 0; i < itemCount; i += 1) {
      const room = choice(spawnRooms);
      const position = randomRoomTile(room);
      if (isOccupied(level, position.x, position.y) || itemsAt(level, position.x, position.y).length > 0) {
        continue;
      }
      level.items.push({ ...rollTreasure(depth), x: position.x, y: position.y });
    }

    for (let i = 0; i < 3 + Math.floor(depth / 2); i += 1) {
      const room = choice(spawnRooms);
      const position = randomRoomTile(room);
      if (isWalkable(level, position.x, position.y)) {
        level.items.push({ x: position.x, y: position.y, kind: "gold", name: "Gold", amount: randInt(5, 12) * depth });
      }
    }

    if (depth === 1 && spawnRooms.length > 0) {
      const earlyLootRoom = spawnRooms[0];
      const heavyLootSpot = randomRoomTile(earlyLootRoom);
      if (isWalkable(level, heavyLootSpot.x, heavyLootSpot.y) && itemsAt(level, heavyLootSpot.x, heavyLootSpot.y).length === 0) {
        level.items.push({ ...createItem("rustedMail", { identified: true }), x: heavyLootSpot.x, y: heavyLootSpot.y });
      }
      const quickLootRoom = spawnRooms[Math.min(1, spawnRooms.length - 1)];
      const quickLootSpot = randomRoomTile(quickLootRoom);
      if (isWalkable(level, quickLootSpot.x, quickLootSpot.y) && itemsAt(level, quickLootSpot.x, quickLootSpot.y).length === 0) {
        level.items.push({ ...createItem("healingPotion", { identified: true }), x: quickLootSpot.x, y: quickLootSpot.y });
      }
    }

    const featureRooms = spawnRooms.slice(0, Math.max(3, Math.floor(spawnRooms.length / 2)));
    for (let i = 0; i < 3 + depth; i += 1) {
      const room = choice(featureRooms);
      const position = randomRoomTile(room);
      if (isWalkable(level, position.x, position.y) && getTile(level, position.x, position.y).kind === "floor") {
        setTile(level, position.x, position.y, tileDef("trap", { hidden: Math.random() < 0.55, trapEffect: choice(["dart", "poison", "teleport", "alarm", "trapdoor", "arrow", "summon"]) }));
      }
    }

    if (Math.random() < 0.85) {
      const room = choice(featureRooms);
      const position = randomRoomTile(room);
      setTile(level, position.x, position.y, tileDef("fountain", { featureUsed: false, featureEffect: choice(["heal", "mana", "poison", "vision", "damage"]) }));
    }

    if (depth >= 2 && Math.random() < 0.65) {
      const room = choice(featureRooms);
      const position = randomRoomTile(room);
      setTile(level, position.x, position.y, tileDef("throne", { featureUsed: false, featureEffect: choice(["gold", "exp", "curse", "summon", "teleport"]) }));
    }

    addSetPiece(level, depth);
    addSecretVault(level, depth);

    if (depth === DUNGEON_DEPTH) {
      const room = choice(spawnRooms.slice(-3));
      const position = randomRoomTile(room);
      level.items.push({ ...createItem("runestone"), x: position.x, y: position.y });
      level.actors.push(createMonster(MONSTER_DEFS[MONSTER_DEFS.length - 1], position.x + 1, position.y));
    }

    level.encounterSummary = getEncounterSummary(level);
    level.floorTheme = encounterState.theme.id;
    level.floorThemeName = encounterState.theme.name;
  }

  placePlayerAt(x, y) {
    this.player.x = x;
    this.player.y = y;
    syncFloorState(this);
    syncDangerState(this);
    this.updateFov();
    this.updateMonsterIntents();
  }

  getArmorValue() {
    let armor = this.getArmorValueForStats(this.player.stats);
    Object.values(this.player.equipment).forEach((item) => {
      if (item && item.armor) {
        armor += getItemArmor(item);
      }
    });
    armor += getBuildArmorBonus(this);
    return armor;
  }

  getAttackValue() {
    const weapon = this.player.equipment.weapon;
    const base = weapon ? getItemPower(weapon) : 2;
    return this.getAttackValueForStats(this.player.stats, base);
  }

  getDamageRange() {
    const weapon = this.player.equipment.weapon;
    const base = weapon ? getItemPower(weapon) : 2;
    return this.getDamageRangeForStats(this.player.stats, base);
  }

  getEvadeValue() {
    let evade = this.getEvadeValueForStats(this.player.stats);
    evade -= getEncumbranceTier(this.player) * 2;
    Object.values(this.player.equipment).forEach((item) => {
      if (item && item.dexPenalty) {
        evade -= item.dexPenalty;
      }
      if (item && item.dexBonus) {
        evade += getItemDexBonus(item);
      }
    });
    evade += getBuildEvadeBonus(this);
    return evade;
  }

  getLightRadius() {
    let radius = FOV_RADIUS;
    Object.values(this.player.equipment).forEach((item) => {
      if (item && item.lightBonus) {
        radius += getItemLightBonus(item);
      }
    });
    return radius;
  }

  getEncumbranceTier() {
    return getEncumbranceTier(this.player);
  }

  getSpellDamageBonus(defender, damageType = "magic") {
    return getBuildDamageBonus(this, defender, damageType);
  }

  recalculateDerivedStats() {
    const bonusMana = Object.values(this.player.equipment).reduce((sum, item) => sum + (item ? getItemManaBonus(item) : 0), 0);
    const maxMana = this.getMaxManaForStats(this.player.stats, this.player.className, bonusMana + getBuildMaxManaBonus(this), this.getPlayerManaBase(this.player));
    const maxHp = this.getMaxHpForStats(this.player.stats, this.player.level, this.player.className, this.player.constitutionLoss || 0, this.getPlayerHpBase(this.player) + getBuildMaxHpBonus(this));
    const hpRatio = this.player.maxHp > 0 ? this.player.hp / this.player.maxHp : 1;
    const manaRatio = this.player.maxMana > 0 ? this.player.mana / this.player.maxMana : 1;
    this.player.maxHp = maxHp;
    this.player.maxMana = maxMana;
    this.player.hp = Math.max(1, Math.round(this.player.maxHp * hpRatio));
    this.player.mana = Math.max(0, Math.round(this.player.maxMana * manaRatio));
    this.player.lightRadius = this.getLightRadius();
  }

  tryMovePlayer(dx, dy) {
    if ((this.player.slowed || 0) > 0 && this.turn % 2 === 0) {
      this.player.slowed -= 1;
      this.log("You struggle to move under a slowing effect.", "warning");
      this.endTurn();
      return;
    }
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;
    if (!inBounds(this.currentLevel, nx, ny)) {
      return;
    }
    const monster = actorAt(this.currentLevel, nx, ny);
    if (monster) {
      this.attack(this.player, monster);
      this.endTurn();
      return;
    }

    const tile = getTile(this.currentLevel, nx, ny);
    if (!tile.walkable) {
      if (tile.kind === "sign") {
        this.log(tile.label, "warning");
        this.render();
      }
      return;
    }

    this.player.x = nx;
    this.player.y = ny;
    this.flashTile(nx, ny, "#ffd36b", 120, { alpha: 0.12, decorative: true });
    onPlayerMove(this);
    this.audio.play("move");
    this.handleTileEntry(getTile(this.currentLevel, nx, ny));
    this.pickupHere(true, true);
    if (this.pendingPickupPrompt) {
      this.render();
      return;
    }
    const current = getTile(this.currentLevel, nx, ny);
    if (current.kind === "buildingDoor" && current.service) {
      this.openTownService(current.service);
    }
    this.endTurn();
  }

  handleTileEntry(tile) {
    if (tile.objectiveId) {
      const objective = OBJECTIVE_DEFS[tile.objectiveId];
      this.log(`${objective ? objective.label : "Objective"} is here.`, "warning");
      return;
    }
    if (tile.optionalId) {
      this.log(`${tile.label || "Temptation"} waits here. Greed will raise the floor's danger.`, "warning");
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
      summonMonsterNear(this.currentLevel, this.player.x, this.player.y, weightedMonster(this.currentDepth));
    }
  }

  legacyPerformSearchUnused() {
    if (!this.player || this.mode !== "game") {
      return;
    }
    const radius = this.getSearchRadiusForStats(this.player.stats);
    const searchPower = this.getSearchPowerForStats(this.player.stats, this.player.level);
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
    if (this.mapCanvas) {
      this.mapCanvas.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  pollGamepad() {
    const intent = this.gamepadInput.poll(this.mode);
    if (!intent) {
      this.refreshChrome();
      return;
    }
    this.refreshChrome();
    if (intent.type === "move") {
      this.handleMovementIntent(intent.dx, intent.dy);
      return;
    }
    if (intent.type === "target") {
      this.moveTargetCursor(intent.dx, intent.dy);
      return;
    }
    if (intent.type === "dock") {
      this.triggerDockSlot(intent.slot);
      return;
    }
    if (intent.type === "confirm") {
      if (this.mode === "target") {
        this.confirmTargetSelection();
      } else if (this.mode === "creation") {
        this.beginAdventure();
      }
      return;
    }
    if (intent.type === "cancel") {
      if (this.mode === "target") {
        this.cancelTargetMode();
      } else if (this.mode === "modal") {
        this.closeModal();
      }
      return;
    }
    if (intent.type === "action") {
      this.handleAction(intent.action, intent.tab ? { dataset: { tab: intent.tab } } : null);
    }
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

  showSettingsModal() {
    this.mode = "modal";
    this.showSimpleModal("Settings", `
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
        <div><strong>Sound</strong><div class="muted">Simple effects only, no music by default.</div></div>
        <div class="actions"><button class="tiny-button" data-action="setting-toggle" data-setting="soundEnabled" type="button">${this.settings.soundEnabled ? "On" : "Off"}</button></div>
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
    `);
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
    this.refreshChrome();
    this.showSettingsModal();
  }

  startTargetMode(options) {
    this.modalRoot.classList.add("hidden");
    this.modalRoot.innerHTML = "";
    this.targetMode = {
      type: options.type,
      name: options.name,
      range: options.range || 8,
      allowFloor: options.allowFloor || false,
      callback: options.callback,
      cursor: options.cursor || findInitialTargetCursor(this, options.range || 8)
    };
    this.mode = "target";
    this.log(`Target ${options.name}. Confirm to fire, cancel to abort.`, "warning");
    this.render();
  }

  moveTargetCursor(dx, dy) {
    if (!this.targetMode) {
      return;
    }
    this.targetMode.cursor.x = clamp(this.targetMode.cursor.x + dx, 0, this.currentLevel.width - 1);
    this.targetMode.cursor.y = clamp(this.targetMode.cursor.y + dy, 0, this.currentLevel.height - 1);
    this.render();
  }

  confirmTargetSelection() {
    if (!this.targetMode) {
      return;
    }
    const cursor = { x: this.targetMode.cursor.x, y: this.targetMode.cursor.y };
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
    this.renderBoard();
    callback(targetActor, cursor);
    this.render();
  }

  cancelTargetMode() {
    if (!this.targetMode) {
      return;
    }
    this.targetMode = null;
    this.mode = "game";
    this.log("Targeting cancelled.", "warning");
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
        summonMonsterNear(this.currentLevel, x, y, weightedMonster(this.currentDepth));
        this.log("A summoning glyph tears open beside you.", "bad");
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
          summonMonsterNear(level, monster.x, monster.y, weightedMonster(this.currentDepth));
          this.log(`${monster.name} calls for aid from the dark.`, "bad");
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
      "depth-4": "Scratched runes warn of a prisoner and a chapel below. The dungeon has more memory than mercy.",
      "depth-7": "The air turns still and ceremonial. Whatever guards the Runestone has been waiting a very long time."
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
    const equipped = item.slot ? this.player.equipment[item.slot] : null;
    const canQuickEquip = Boolean(item.slot && (item.kind === "weapon" || item.kind === "armor") && !(equipped && equipped.cursed));
    const compareNote = equipped
      ? `Currently worn: ${this.describeItemReadout(equipped)}`
      : item.slot
        ? `Open ${this.getPackSlotDefinition(item.slot).label} slot.`
        : "This item will sit in your pack.";
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
        const bonus = this.player.equipment.amulet && this.player.equipment.amulet.goldBonus ? this.player.equipment.amulet.goldBonus : 0;
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
        this.log(`You learn ${SPELLS[item.spell].name}.`, "good");
      } else {
        this.log("That spell is already known.", "warning");
      }
      removeAt(this.player.inventory, Number(index));
      this.showHubModal("pack", { selection: this.getDefaultPackSelection(Number(index)) });
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
        if (this.currentDepth === 0) {
          this.log("The rune gutters out. You are already in town.", "warning");
          return;
        }
        this.currentDepth = 0;
        this.currentLevel = this.levels[0];
        this.placePlayerAt(this.currentLevel.start.x, this.currentLevel.start.y);
        this.log("The rune of return carries you safely back to town.", "good");
        break;
      default:
        break;
    }
    removeAt(this.player.inventory, Number(index));
    this.closeModal();
    this.endTurn();
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
    const existing = this.player.equipment[item.slot];
    if (existing && existing.cursed) {
      existing.identified = true;
      this.log(`${getItemName(existing, true)} is cursed and will not come off.`, "bad");
      if (openHub) {
        this.showHubModal("pack", { selection: { type: "slot", value: item.slot } });
      }
      this.render();
      return;
    }
    if (existing) {
      this.player.inventory.push(existing);
    }
    this.player.equipment[item.slot] = item;
    item.identified = true;
    removeAt(this.player.inventory, Number(index));
    this.recalculateDerivedStats();
    this.log(`You equip ${getItemName(item, true)}.${item.cursed ? " It bites into you with a cursed grip." : ""}`, item.cursed ? "bad" : "good");
    if (openHub) {
      this.showHubModal("pack", { selection: { type: "slot", value: item.slot } });
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
    this.currentLevel.items.push(item);
    removeAt(this.player.inventory, Number(index));
    this.log(`You drop ${getItemName(item, true)}.`, "warning");
    this.showHubModal("pack", { selection: this.getDefaultPackSelection(Number(index)) });
    this.render();
  }

  unequipSlot(slot) {
    const item = this.player.equipment[slot];
    if (!item) {
      return;
    }
    if (item.cursed) {
      item.identified = true;
      this.log(`${getItemName(item, true)} is cursed and will not come off.`, "bad");
      this.showHubModal("pack", { selection: { type: "slot", value: slot } });
      this.render();
      return;
    }
    this.player.equipment[slot] = null;
    this.player.inventory.push(item);
    this.recalculateDerivedStats();
    this.log(`You stow ${getItemName(item, true)} in your pack.`, "good");
    this.showHubModal("pack", { selection: { type: "inventory", value: this.player.inventory.length - 1 } });
    this.render();
  }

  prepareSpell(spellId) {
    const spell = SPELLS[spellId];
    if (!spell) {
      return;
    }
    const spellCost = getSpellCost(this, spell);
    if (this.player.mana < spellCost) {
      const shortage = getOvercastLoss(this, spellCost - this.player.mana);
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
      if (spell.cast(this, this.player)) {
        this.audio.play("cast");
        this.closeModal();
        this.endTurn();
      }
      return;
    }
    this.startTargetMode({
      type: "spell",
      name: spell.name,
      range: spell.range || 8,
      callback: (target, cursor) => {
        this.emitCastCircle(this.player.x, this.player.y, spell.effectColor || "#ffca73");
        spell.cast(this, this.player, target || cursor);
        if (target || spell.allowFloorTarget) {
          this.playProjectile(this.player, cursor, spell.effectColor || "#ffca73");
        }
        this.audio.play("cast");
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
    if (service === "bank") {
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
    const price = Math.round(getItemValue(item) * 1.2);
    if (this.player.gold < price) {
      this.log("You cannot afford that.", "warning");
      return;
    }
    this.player.gold -= price;
    this.addItemToInventory(item);
    const shop = this.shopState[shopId];
    if (shop) {
      removeOne(shop.stock, itemId);
    }
    this.log(`Purchased ${getItemName(item, true)} for ${price} gold.`, "good");
    this.showShopModal(shopId, SHOPS[shopId]);
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
    const basePrice = this.pendingShop && this.pendingShop.id === "junk" ? 25 : Math.round(getItemValue(item) * 0.55);
    const price = Math.max(1, basePrice);
    this.player.gold += price;
    item.identified = true;
    if (this.pendingShop && this.pendingShop.id !== "junk") {
      this.shopState[this.pendingShop.id].buyback.unshift(item.id);
      this.shopState[this.pendingShop.id].buyback = this.shopState[this.pendingShop.id].buyback.slice(0, 8);
    }
    removeAt(this.player.inventory, Number(index));
    this.log(`Sold ${getItemName(item, true)} for ${price} gold.`, "good");
    if (this.pendingShop) {
      this.showShopModal(this.pendingShop.id, this.pendingShop);
    } else {
      this.closeModal();
    }
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
    this.showBankModal();
    this.render();
  }

  refreshShopState(force = false) {
    if (!force && this.turn - this.lastTownRefreshTurn < 120) {
      return;
    }
    ensureTownMetaState(this);
    refreshTownStocks(this);
    this.lastTownRefreshTurn = this.turn;
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
    this.showTempleModal();
    this.render();
  }

  useSageService(serviceId) {
    if (serviceId !== "identifyAll") {
      return;
    }
    const price = 60;
    if (this.player.gold < price) {
      this.log("The sage will not work for free.", "warning");
      return;
    }
    this.player.gold -= price;
    const count = this.identifyInventoryAndEquipment();
    this.log(count > 0 ? `The sage identifies ${count} item${count === 1 ? "" : "s"}.` : "The sage shrugs. Nothing remains mysterious.", "good");
    this.showSageModal();
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
      this.mode = "modal";
      this.showSimpleModal("Victory", `
        <div class="text-block">
          ${escapeHtml(this.player.name)} returns the Runestone of the Winds to the valley town.<br><br>
          The keep above remains dangerous, but the first great descent is complete.
        </div>
      `);
    }
  }

  hasPendingProgressionChoice() {
    return hasPendingProgressionChoice(this);
  }

  recordChronicleEvent(type, payload = {}) {
    recordChronicleEvent(this, type, payload);
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
              <button class="spell-learn-card" data-action="choose-reward" data-reward="${id}" type="button">
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
    this.recalculateDerivedStats();
    this.closeModal();
    this.updateFov();
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

    this.mode = "levelup";
    this.setModalVisibility(true);
    this.modalRoot.innerHTML = `
      <div class="modal mobile-sheet modal-large">
        <div class="modal-title">Spell Study</div>
        <div class="section-block text-block">
          ${escapeHtml(this.player.name)} has reached level ${this.player.level}. Choose ${this.pendingSpellChoices > 1 ? "a spell for this level and then choose another." : "a new spell to learn."}
        </div>
        <div class="spell-learn-grid">
          ${options.map((spell) => `
            <button class="spell-learn-card" data-action="learn-spell" data-spell="${spell.id}" type="button">
              <span class="spell-learn-tier">Spell Level ${spell.learnLevel || 1}</span>
              <span class="spell-learn-name">${escapeHtml(spell.name)}</span>
              <span class="spell-learn-meta">${escapeHtml(spell.target === "monster" ? `Range ${spell.range || 1}` : "Self cast")} · ${getSpellCost(this, spell)} mana</span>
              <span class="spell-learn-copy">${escapeHtml(spell.description)}</span>
            </button>
          `).join("")}
        </div>
      </div>
    `;
    this.modalRoot.classList.remove("hidden");
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

  showSimpleModal(title, bodyHtml) {
    this.setModalVisibility(true);
    const template = document.getElementById("list-modal-template");
    const fragment = template.content.cloneNode(true);
    fragment.getElementById("generic-modal-title").textContent = title;
    fragment.getElementById("generic-modal-body").innerHTML = bodyHtml;
    this.modalRoot.innerHTML = "";
    this.modalRoot.appendChild(fragment);
    this.modalRoot.classList.remove("hidden");
  }

  renderLogMarkup(limit = 24) {
    return this.messages.slice(-limit).map((entry) => `
      <div class="log-line ${entry.tone ? `log-${entry.tone}` : ""}">
        <span class="log-turn">[${entry.turn}]</span> ${escapeHtml(entry.message)}
      </div>
    `).join("");
  }

  getPackSlotDefinitions() {
    return [
      { slot: "cloak", label: "Cloak", emptyText: "Back slot for cloaks and wraps.", area: "cloak" },
      { slot: "head", label: "Head", emptyText: "Helms, hoods, and crowns.", area: "head" },
      { slot: "amulet", label: "Amulet", emptyText: "Charms worn at the neck.", area: "amulet" },
      { slot: "weapon", label: "Weapon", emptyText: "Your main striking hand.", area: "weapon" },
      { slot: "body", label: "Armor", emptyText: "Chest armor and robes.", area: "armor" },
      { slot: "offhand", label: "Offhand", emptyText: "Shield or focus carried opposite the weapon.", area: "offhand" },
      { slot: "ring", label: "Ring", emptyText: "One active ring slot.", area: "ring" },
      { slot: "feet", label: "Feet", emptyText: "Boots and travel footwear.", area: "feet" }
    ];
  }

  getPackSlotDefinition(slot) {
    return this.getPackSlotDefinitions().find((entry) => entry.slot === slot) || { slot, label: capitalize(slot), emptyText: "Unused slot.", area: slot };
  }

  setPackSelection(selection) {
    if (!selection) {
      return;
    }
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
      if (item.slot === slot) {
        matches.push(index);
      }
      return matches;
    }, []);
  }

  getPackSelectionModel() {
    const selection = this.resolvePackSelection();
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

  getPackItemActionLabel(item) {
    return item.kind === "weapon" || item.kind === "armor" ? "Equip" : "Use";
  }

  getPackItemMeta(item) {
    const bits = [item.slot ? this.getPackSlotDefinition(item.slot).label : item.kindLabel || classifyItem(item)];
    if (item.kind === "weapon") {
      bits.push(`Atk ${getItemPower(item)}`);
    } else if (item.kind === "armor") {
      bits.push(`Arm ${getItemArmor(item)}`);
    } else if (item.kind === "charged" && item.identified) {
      bits.push(`${item.charges}/${item.maxCharges || item.charges} ch`);
    } else if (item.kind === "spellbook") {
      bits.push("Learn spell");
    }
    return bits.join(" • ");
  }

  getPackItemNote(item) {
    const bits = [`Wt ${item.weight || 0}`, `${Math.floor(getItemValue(item))} gp`];
    if (canIdentify(item) && !item.identified) {
      bits.push("Unknown");
    }
    if (item.cursed && item.identified) {
      bits.push("Cursed");
    }
    return bits.join(" • ");
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
        deltas: [],
        weightDelta: 0,
        encumbrancePreview: this.describeBurdenPreview(0)
      };
    }

    const equipped = this.player.equipment[item.slot] || null;
    if (!equipped) {
      return {
        equipped: null,
        deltas: [],
        weightDelta: item.weight || 0,
        encumbrancePreview: this.describeBurdenPreview(0)
      };
    }

    const deltas = [
      this.buildComparisonDelta("Attack", getItemPower(item) - getItemPower(equipped)),
      this.buildComparisonDelta("Armor", getItemArmor(item) - getItemArmor(equipped)),
      this.buildComparisonDelta("Mana", getItemManaBonus(item) - getItemManaBonus(equipped)),
      this.buildComparisonDelta("Dex", getItemDexBonus(item) - getItemDexBonus(equipped)),
      this.buildComparisonDelta("Sight", getItemLightBonus(item) - getItemLightBonus(equipped)),
      this.buildComparisonDelta("Weight", (item.weight || 0) - (equipped.weight || 0), true)
    ].filter(Boolean);

    return {
      equipped,
      deltas,
      weightDelta: (item.weight || 0) - (equipped.weight || 0),
      encumbrancePreview: this.describeBurdenPreview(0)
    };
  }

  getItemBadgeMarkup(item) {
    const badges = [
      `<span class="item-chip kind-chip">${escapeHtml(item.kindLabel || classifyItem(item))}</span>`
    ];
    if (item.slot) {
      badges.push(`<span class="item-chip">Slot ${escapeHtml(this.getPackSlotDefinition(item.slot).label)}</span>`);
    }
    if (item.kind === "weapon") {
      badges.push(`<span class="item-chip">Power ${getItemPower(item)}</span>`);
    }
    if (item.kind === "armor") {
      badges.push(`<span class="item-chip">Armor ${getItemArmor(item)}</span>`);
    }
    if (getItemManaBonus(item)) {
      badges.push(`<span class="item-chip">Mana +${getItemManaBonus(item)}</span>`);
    }
    if (getItemDexBonus(item)) {
      badges.push(`<span class="item-chip">Dex +${getItemDexBonus(item)}</span>`);
    }
    if (getItemLightBonus(item)) {
      badges.push(`<span class="item-chip">Sight +${getItemLightBonus(item)}</span>`);
    }
    if (item.weight) {
      badges.push(`<span class="item-chip">Wt ${item.weight}</span>`);
    }
    badges.push(`<span class="item-chip">Value ${Math.floor(getItemValue(item))} gp</span>`);
    if (canIdentify(item) && !item.identified) {
      badges.push(`<span class="item-chip warning-chip">Unknown quality</span>`);
    }
    if (item.cursed && item.identified) {
      badges.push(`<span class="item-chip bad-chip">Cursed</span>`);
    }
    return badges.join("");
  }

  getInventoryGroupsMarkup(selectedIndex) {
    const groups = [
      {
        label: "Gear",
        items: this.player.inventory
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.kind === "weapon" || item.kind === "armor")
      },
      {
        label: "Consumables",
        items: this.player.inventory
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.kind === "consumable")
      },
      {
        label: "Arcana",
        items: this.player.inventory
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.kind === "charged" || item.kind === "spellbook")
      },
      {
        label: "Other",
        items: this.player.inventory
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => !["weapon", "armor", "consumable", "charged", "spellbook"].includes(item.kind))
      }
    ].filter((group) => group.items.length > 0);

    if (groups.length === 0) {
      return `<div class="text-block">Your pack is empty.</div>`;
    }

    return groups.map((group) => `
      <section class="pack-group">
        <div class="pack-group-title">${group.label}</div>
        <div class="pack-group-list">
          ${group.items.map(({ item, index }) => `
            <button class="pack-item-row${selectedIndex === index ? " active" : ""}" data-action="inspect-pack-item" data-index="${index}" type="button">
              <span class="pack-item-name">${escapeHtml(getItemName(item))}</span>
              <span class="pack-item-meta">${escapeHtml(this.getPackItemMeta(item))}</span>
              <span class="pack-item-note">${escapeHtml(this.getPackItemNote(item))}</span>
            </button>
          `).join("")}
        </div>
      </section>
    `).join("");
  }

  getPackInspectorMarkup(model) {
    if (!model.item && model.selection.type === "slot") {
      const compatibleRows = model.compatibleIndexes.length === 0
        ? `<div class="muted">No carried item fits this slot right now.</div>`
        : `
          <div class="pack-compatible-list">
            ${model.compatibleIndexes.map((index) => `
              <button class="tiny-button pack-ready-chip" data-action="inspect-pack-item" data-index="${index}" type="button">${escapeHtml(getItemName(this.player.inventory[index]))}</button>
            `).join("")}
          </div>
        `;
      return `
        <section class="hub-section pack-inspector-panel">
          <div class="panel-title">Decision Card</div>
          <div class="pack-inspector-card">
            <div class="pack-inspector-kicker">${escapeHtml(model.slotDef.label)}</div>
            <div class="pack-inspector-title">Empty Slot</div>
            <div class="pack-inspector-copy">${escapeHtml(model.slotDef.emptyText)}</div>
            <div class="pack-inspector-note ${model.encumbrancePreview.tone}">${escapeHtml(model.encumbrancePreview.text)}</div>
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
    const statLines = [
      item.kind === "weapon" ? `Attack ${getItemPower(item)}` : "",
      item.kind === "armor" ? `Armor ${getItemArmor(item)}` : "",
      getItemManaBonus(item) ? `Mana +${getItemManaBonus(item)}` : "",
      getItemDexBonus(item) ? `Dex +${getItemDexBonus(item)}` : "",
      getItemLightBonus(item) ? `Sight +${getItemLightBonus(item)}` : "",
      item.weight || item.weight === 0 ? `Weight ${item.weight || 0}` : "",
      `Value ${Math.floor(getItemValue(item))} gp`
    ].filter(Boolean);
    const actions = model.selection.type === "inventory"
      ? `
        <button class="menu-button pack-action-primary is-active" data-action="item-use" data-index="${model.selection.value}" type="button">${this.getPackItemActionLabel(item)}</button>
        <button class="menu-button" data-action="item-drop" data-index="${model.selection.value}" type="button">Drop</button>
      `
      : `
        <button class="menu-button pack-action-primary is-active" data-action="unequip-slot" data-slot="${model.selection.value}" type="button"${item.cursed ? " disabled" : ""}>Unequip</button>
      `;

    const equippedSwap = model.selection.type === "inventory" && item.slot && this.player.equipment[item.slot]
      ? `<div class="pack-inspector-note">Equips over ${escapeHtml(getItemName(this.player.equipment[item.slot], true))}.</div>`
      : "";

    const cursedNote = model.selection.type === "slot" && item.cursed
      ? `<div class="pack-inspector-note bad-note">${escapeHtml(getItemName(item, true))} is cursed and cannot be removed yet.</div>`
      : "";

    const comparisonBlock = model.selection.type === "inventory" && model.comparison?.equipped
      ? `
        <div class="pack-comparison-card">
          <div class="pack-comparison-title">Compare vs ${escapeHtml(getItemName(model.comparison.equipped, true))}</div>
          <div class="pack-comparison-list">
            ${model.comparison.deltas.length > 0
              ? model.comparison.deltas.map((entry) => `<div class="pack-comparison-row value-${entry.tone}">${escapeHtml(entry.text)}</div>`).join("")
              : `<div class="pack-comparison-row muted">No practical change.</div>`}
          </div>
          <div class="pack-inspector-note ${model.encumbrancePreview.tone}">${escapeHtml(model.encumbrancePreview.text)}</div>
        </div>
      `
      : item.slot
        ? `<div class="pack-inspector-note ${model.encumbrancePreview.tone}">${escapeHtml(model.encumbrancePreview.text)}</div>`
        : "";

    return `
      <section class="hub-section pack-inspector-panel">
        <div class="panel-title">${model.selection.type === "slot" ? "Equipped Detail" : "Decision Card"}</div>
        <div class="pack-inspector-card">
          <div class="pack-inspector-kicker">${escapeHtml(model.slotDef ? model.slotDef.label : item.kindLabel || classifyItem(item))}</div>
          <div class="pack-inspector-title">${escapeHtml(getItemName(item))}</div>
          <div class="pack-item-badges">${this.getItemBadgeMarkup(item)}</div>
          <div class="pack-inspector-copy">${escapeHtml(describeItem(item))}</div>
          <div class="pack-stat-grid">
            ${statLines.map((line) => `<div class="pack-stat-pill">${escapeHtml(line)}</div>`).join("")}
          </div>
          ${equippedSwap}
          ${comparisonBlock}
          ${cursedNote}
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
      { id: "journal", label: "Journal" }
    ];
    return `
      <div class="hub-tabs">
        ${tabs.map((tab) => `
          <button class="hub-tab${tab.id === activeTab ? " active" : ""}" data-action="open-hub" data-tab="${tab.id}" type="button">${tab.label}</button>
        `).join("")}
      </div>
    `;
  }

  getPackHubMarkup() {
    const model = this.getPackSelectionModel();
    const burdenUi = this.getBurdenUiState();
    const equipmentValue = Object.values(this.player.equipment).reduce((sum, item) => sum + (item ? getItemValue(item) : 0), 0);
    const packValue = this.player.inventory.reduce((sum, item) => sum + getItemValue(item), 0);
    const paperdoll = this.getPackSlotDefinitions().map((slotDef) => {
      const item = this.player.equipment[slotDef.slot];
      const compatibleCount = this.getCompatibleInventoryIndexes(slotDef.slot).length;
      const isActive = model.selection.type === "slot" && model.selection.value === slotDef.slot;
      return `
        <button class="paper-slot slot-${slotDef.area}${isActive ? " active" : ""}" data-action="inspect-slot" data-slot="${slotDef.slot}" type="button">
          <span class="paper-slot-label">${escapeHtml(slotDef.label)}</span>
          <span class="paper-slot-item">${item ? escapeHtml(getItemName(item)) : "Empty"}</span>
          <span class="paper-slot-note">${item ? escapeHtml(describeItem(item)) : escapeHtml(slotDef.emptyText)}</span>
          ${compatibleCount > 0 ? `<span class="paper-slot-badge">${compatibleCount} ready</span>` : ""}
        </button>
      `;
    }).join("");

    return `
      <div class="hub-body">
        <div class="hub-summary">
          <div class="mini-panel"><strong>Gold</strong><br>${Math.floor(this.player.gold)} gp</div>
          <div class="mini-panel burden-panel burden-${burdenUi.state}"><strong>Burden</strong><br><span class="burden-value burden-${burdenUi.state}">${burdenUi.weight} / ${burdenUi.capacity}</span><div class="mini-meter burden burden-${burdenUi.state}"><span style="width:${burdenUi.percent}%"></span></div><span class="mini-panel-note">${escapeHtml(burdenUi.label)}</span></div>
          <div class="mini-panel"><strong>Attack</strong><br>${this.getAttackValue()}</div>
          <div class="mini-panel"><strong>Armor</strong><br>${this.getArmorValue()}</div>
          <div class="mini-panel"><strong>Pack Value</strong><br>${Math.floor(packValue)} gp</div>
          <div class="mini-panel"><strong>Equipped Value</strong><br>${Math.floor(equipmentValue)} gp</div>
        </div>
        <div class="pack-layout">
          <section class="hub-section pack-equipment-panel">
            <div class="panel-title">Equipment Layout</div>
            <div class="pack-paperdoll">
              ${paperdoll}
              <div class="paperdoll-core">
                <div class="paperdoll-core-kicker">Loadout</div>
                <div class="paperdoll-avatar">
                  <div class="avatar-head"></div>
                  <div class="avatar-body"></div>
                  <div class="avatar-arms"></div>
                  <div class="avatar-legs"></div>
                </div>
                <div class="paperdoll-core-note">Pick a slot to inspect what is worn there, or choose an item from the pack to compare and equip it.</div>
              </div>
            </div>
          </section>
          <section class="hub-section pack-inventory-panel">
            <div class="panel-title">Pack Contents</div>
            <div class="inventory-list-panel pack-list-panel">
              ${this.getInventoryGroupsMarkup(model.selection.type === "inventory" ? model.selection.value : -1)}
            </div>
          </section>
          ${this.getPackInspectorMarkup(model)}
        </div>
        <section class="hub-section inventory-detail">
          <strong>Field Notes</strong><br>
          Unknown gear hides its real quality until identified. Charged items only reveal remaining power once understood.
          Cursed worn gear locks to its slot until the curse is broken.
        </section>
      </div>
    `;
  }

  getMagicHubMarkup() {
    const rows = this.player.spellsKnown.length === 0
      ? `<div class="text-block">No spells are known.</div>`
      : this.player.spellsKnown.map((spellId) => {
        const spell = SPELLS[spellId];
        const targetLabel = spell.target === "monster" ? `Range ${spell.range || 1}` : "Self cast";
        return `
          <div class="list-row">
            <div>
              <div><strong>${escapeHtml(spell.name)}</strong> <span class="muted">(${getSpellCost(this, spell)} mana${this.player.mana < getSpellCost(this, spell) ? ", overcast" : ""})</span></div>
              <div class="muted">${escapeHtml(targetLabel)} &middot; ${escapeHtml(spell.description)}</div>
            </div>
            <div class="actions">
              <button class="tiny-button" data-action="spell-cast" data-spell="${spellId}" type="button">Cast</button>
            </div>
          </div>
        `;
      }).join("");

    return `
      <div class="hub-body">
        <div class="hub-summary">
          <div class="mini-panel"><strong>Mana</strong><br>${Math.floor(this.player.mana)} / ${this.player.maxMana}</div>
          <div class="mini-panel"><strong>Known</strong><br>${this.player.spellsKnown.length}</div>
          <div class="mini-panel"><strong>Overcast</strong><br>${this.player.mana > 0 ? "Available" : "Risky"}</div>
        </div>
        <section class="hub-section">
          <div class="panel-title">Spell Book</div>
          ${rows}
        </section>
      </div>
    `;
  }

  getJournalHubMarkup() {
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

    return `
      <div class="hub-body">
        <div class="hub-summary">
          <div class="mini-panel"><strong>Depth</strong><br>${this.currentDepth}</div>
          <div class="mini-panel"><strong>Turn</strong><br>${this.turn}</div>
          <div class="mini-panel"><strong>Explored</strong><br>${getExploredPercent(this.currentLevel)}%</div>
          <div class="mini-panel"><strong>Deepest</strong><br>${this.player.deepestDepth}</div>
        </div>
        <section class="hub-section">
          <div class="panel-title">Objective Loop</div>
          <div class="text-block">
            <strong>${escapeHtml(this.currentLevel.description)}</strong><br>
            ${escapeHtml(objectiveText)}<br><br>
            ${escapeHtml(optionalText || questState)}
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Pressure</div>
          <div class="text-block">
            ${escapeHtml(dangerText)}<br>
            ${escapeHtml(this.currentLevel?.encounterSummary || "The floor is still quiet enough to read.")}
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Build</div>
          <div class="text-block">
            ${buildSummary.length > 0 ? escapeHtml(buildSummary.join(", ")) : "No perks or relics claimed yet."}<br><br>
            ${escapeHtml(getObjectiveRewardPreview(this.currentLevel) || "No objective reward preview available.")}
          </div>
        </section>
        <section class="hub-section">
          <div class="panel-title">Chronicle</div>
          <div class="message-log journal-log">${renderChronicleMarkup(this, 12)}</div>
        </section>
        <section class="hub-section utility-row">
          <button class="menu-button" data-action="save-game" type="button">Save</button>
          <button class="menu-button" data-action="load-game" type="button">Load</button>
          <button class="menu-button" data-action="settings" type="button">Settings</button>
          <button class="menu-button" data-action="help" type="button">Help</button>
        </section>
      </div>
    `;
  }

  showHubModal(defaultTab = "pack", options = {}) {
    if (!this.player) {
      return;
    }
    this.mode = "modal";
    this.activeHubTab = ["pack", "magic", "journal"].includes(defaultTab) ? defaultTab : "pack";
    if (this.activeHubTab === "pack") {
      this.setPackSelection(options.selection || this.activePackSelection || this.getDefaultPackSelection());
      this.resolvePackSelection();
    }

    const tabMarkup = this.getHubTabsMarkup(this.activeHubTab);
    const bodyMarkup = this.activeHubTab === "magic"
      ? this.getMagicHubMarkup()
      : this.activeHubTab === "journal"
        ? this.getJournalHubMarkup()
        : this.getPackHubMarkup();

    this.showSimpleModal("Field Hub", `
      <div class="hub-window">
        ${tabMarkup}
        ${bodyMarkup}
      </div>
    `);
  }

  showInventoryModal() {
    this.showHubModal("pack");
  }

  showSpellModal() {
    this.showHubModal("magic");
  }

  showShopModal(shopId, shop) {
    this.mode = "modal";
    this.pendingShop = { ...shop, id: shopId };
    this.pendingService = null;
    const state = this.shopState[shopId] || { stock: [...shop.stock], buyback: [] };
    const liveStock = [...state.stock, ...state.buyback];
    const stockRows = liveStock.map((itemId) => {
      const item = createTownItem(itemId);
      const price = Math.round(getItemValue(item) * 1.2);
      const disabled = this.player.gold < price ? "disabled" : "";
      return `
        <div class="shop-row">
          <div>
            <div><strong>${escapeHtml(getItemName(item, true))}</strong> <span class="muted">${price} gp</span></div>
            <div class="muted">${escapeHtml(describeItem(item))}</div>
          </div>
          <div class="actions">
            <button class="tiny-button" data-action="shop-buy" data-shop="${shopId}" data-item="${itemId}" type="button" ${disabled}>Buy</button>
          </div>
        </div>
      `;
    }).join("");

    const sellableItems = this.player.inventory.filter((item) => shopId === "junk" || shopAcceptsItem(shopId, item));
    const sellRows = sellableItems.length === 0
      ? `<div class="text-block">Nothing here matches what this shop buys.</div>`
      : sellableItems.map((item) => `
        <div class="shop-row">
          <div>
            <div><strong>${escapeHtml(getItemName(item))}</strong> <span class="muted">${shopId === "junk" ? 25 : Math.max(1, Math.round(getItemValue(item) * 0.55))} gp</span></div>
            <div class="muted">${escapeHtml(describeItem(item))}</div>
          </div>
          <div class="actions">
            <button class="tiny-button" data-action="shop-sell" data-index="${this.player.inventory.indexOf(item)}" type="button">Sell</button>
          </div>
        </div>
      `).join("");

    this.showSimpleModal(`${shop.name}`, `
      <div class="section-block text-block">${escapeHtml(shop.greeting)}</div>
      <div class="section-block"><strong>Your gold:</strong> ${Math.floor(this.player.gold)}</div>
      <div class="section-block">
        <div class="field-label">Buy</div>
        ${stockRows}
      </div>
      <div class="section-block">
        <div class="field-label">Sell</div>
        ${sellRows}
      </div>
    `);
  }

  showTempleModal() {
    this.mode = "modal";
    this.pendingShop = null;
    this.pendingService = { type: "temple" };
    this.showSimpleModal("Temple", `
      <div class="section-block text-block">The priests offer healing, restoration, and the expensive correction of cursed mistakes.</div>
      <div class="section-block"><strong>Your gold:</strong> ${Math.floor(this.player.gold)}</div>
      ${TEMPLE_SERVICES.map((service) => `
        <div class="shop-row">
          <div>
            <div><strong>${escapeHtml(service.name)}</strong> <span class="muted">${getTemplePrice(this, service.price)} gp</span></div>
            <div class="muted">${escapeHtml(service.description)}</div>
          </div>
          <div class="actions">
            <button class="tiny-button" data-action="service-use" data-service="${service.id}" type="button">Use</button>
          </div>
        </div>
      `).join("")}
    `);
  }

  showSageModal() {
    this.mode = "modal";
    this.pendingShop = null;
    this.pendingService = { type: "sage" };
    const unknownCount = countUnknownItems(this.player);
    this.showSimpleModal("Sage's Tower", `
      <div class="section-block text-block">The sage identifies your mysterious belongings for a flat fee.</div>
      <div class="section-block">
        <div class="stat-line"><span>Your gold</span><strong>${Math.floor(this.player.gold)} gp</strong></div>
        <div class="stat-line"><span>Unknown items</span><strong>${unknownCount}</strong></div>
        <div class="stat-line"><span>Price</span><strong>60 gp</strong></div>
      </div>
      <div class="modal-actions">
        <button class="menu-button" data-action="service-use" data-service="identifyAll" type="button">Identify</button>
        <button class="menu-button" data-action="close-modal" type="button">Close</button>
      </div>
    `);
  }

  showBankModal() {
    this.mode = "modal";
    ensureTownMetaState(this);
    const unlockRows = getAvailableTownUnlocks(this).slice(0, 3).map((unlockDef) => `
      <div class="shop-row">
        <div>
          <div><strong>${escapeHtml(unlockDef.name)}</strong> <span class="muted">${unlockDef.cost} gp</span></div>
          <div class="muted">${escapeHtml(unlockDef.description)}</div>
        </div>
        <div class="actions">
          <button class="tiny-button" data-action="town-unlock" data-unlock="${unlockDef.id}" type="button"${this.player.gold < unlockDef.cost ? " disabled" : ""}>Fund</button>
        </div>
      </div>
    `).join("");
    const intel = getTownIntel(this);
    const nextRumor = intel.nextRumor
      ? `<div class="text-block">${escapeHtml(intel.nextRumor.text)}</div>`
      : `<div class="text-block muted">No clear rumor about the next floor yet.</div>`;
    const knownRumors = intel.known.length > 0
      ? intel.known.map((rumor) => `<div class="log-line">${escapeHtml(rumor.text)}</div>`).join("")
      : "<div class='muted'>No secured rumors yet.</div>";
    this.showSimpleModal("Bank", `
      <div class="section-block text-block">Town return is a strategic layer now: bank gold if you want, but you can also fund better stock and buy forward intel.</div>
      <div class="section-block">
        <div class="stat-line"><span>On Hand</span><strong>${Math.floor(this.player.gold)} gp</strong></div>
        <div class="stat-line"><span>On Account</span><strong>${Math.floor(this.player.bankGold)} gp</strong></div>
        <div class="stat-line"><span>Rumor Tokens</span><strong>${this.player.runCurrencies?.rumorTokens || 0}</strong></div>
      </div>
      <div class="modal-actions">
        <button class="menu-button" data-action="bank-deposit" type="button">Deposit 100</button>
        <button class="menu-button" data-action="bank-withdraw" type="button">Withdraw 100</button>
        <button class="menu-button" data-action="town-rumor" type="button">Buy Intel</button>
        <button class="menu-button" data-action="close-modal" type="button">Close</button>
      </div>
      <div class="section-block">
        <div class="field-label">Next Floor Intel</div>
        ${nextRumor}
      </div>
      <div class="section-block">
        <div class="field-label">Investments</div>
        ${unlockRows || "<div class='text-block muted'>All current town investments are funded.</div>"}
      </div>
      <div class="section-block">
        <div class="field-label">Rumor Archive</div>
        <div class="message-log journal-log">${knownRumors}</div>
      </div>
    `);
  }

  showHelpModal() {
    this.mode = "modal";
    this.showSimpleModal("Help", `
      <div class="section-block text-block">
        This mobile build is tuned for travel play: portrait layout, offline installability, paired controller support,
        touch fallback, targeted spells, heavier dungeon pressure, and clearer combat feedback.
      </div>
      <div class="section-block">
        <div class="field-label">Controls</div>
        <div class="text-block">
          Keyboard: arrows or numpad move, F searches, U uses, I opens pack, S opens spells<br>
          Controller: stick or D-pad moves, A takes the primary action, X triggers the secondary action, Y opens pack, B waits or cancels targeting<br>
          Touch: use the on-screen pad as fallback movement and the dock for your main actions
      </div>
      </div>
      <div class="section-block">
        <div class="field-label">Dungeon Notes</div>
        <div class="text-block">
          Search for hidden doors and traps. Heavy burden reduces dodge and lets monsters press harder.
          Targeted spells and wands require line of sight. Resting is noisy, and enemy intent icons now telegraph rushes,
          ranged shots, summons, and other ugly plans before they land.
        </div>
      </div>
    `);
  }

  closeModal() {
    this.setModalVisibility(false);
    this.modalRoot.classList.add("hidden");
    this.modalRoot.innerHTML = "";
    this.pendingService = null;
    this.activeHubTab = "pack";
    if (this.targetMode && this.mode !== "target") {
      this.targetMode = null;
    }
    if (!this.player) {
      this.showTitleScreen();
      return;
    }
    if (this.player && this.player.hp > 0 && !this.player.quest.complete) {
      this.mode = "game";
    }
  }

  log(message, tone = "") {
    this.messages.push({ turn: this.turn, message, tone });
    if (this.messages.length > 120) {
      this.messages.shift();
    }
  }

  render() {
    this.renderBoard();
    this.renderMiniMap();
    this.renderPanels();
    this.renderActionBar();
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
      if (this.mapCaption) {
        this.mapCaption.textContent = "No active map.";
      }
      return;
    }

    const scaleX = this.mapCanvas.width / this.currentLevel.width;
    const scaleY = this.mapCanvas.height / this.currentLevel.height;

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

    this.currentLevel.actors.forEach((actor) => {
      if (this.currentDepth !== 0 && !isVisible(this.currentLevel, actor.x, actor.y)) {
        return;
      }
      ctx.fillStyle = "#c94a4a";
      ctx.fillRect(Math.floor(actor.x * scaleX), Math.floor(actor.y * scaleY), Math.max(2, Math.ceil(scaleX)), Math.max(2, Math.ceil(scaleY)));
    });

    ctx.fillStyle = "#7bd0ff";
    ctx.fillRect(Math.floor(this.player.x * scaleX), Math.floor(this.player.y * scaleY), Math.max(3, Math.ceil(scaleX)), Math.max(3, Math.ceil(scaleY)));

    if (this.mapCaption) {
      const modeLabel = this.currentDepth === 0 ? "Town routes" : "Dungeon survey";
      this.mapCaption.innerHTML = `
        <div class="map-caption-row">
          <span class="map-chip">Depth ${this.currentDepth}</span>
          <span class="map-chip">${escapeHtml(this.currentLevel.description)}</span>
        </div>
        <div class="map-caption-row">
          <span class="map-chip subtle">Explored ${getExploredPercent(this.currentLevel)}%</span>
          <span class="map-chip subtle">${modeLabel}</span>
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
      ...effectProfile
    });

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
      drawMonsterIntent(ctx, actor, sx, sy, time, effectProfile);
    });

    this.visualEffects
      .filter((effect) => effect.type !== "screenPulse")
      .forEach((effect) => drawEffect(ctx, effect, view, time, effectProfile));
    drawPlayer(ctx, this.player, this.player.x - view.x, this.player.y - view.y, time, effectProfile);
    if (this.targetMode) {
      drawTargetCursor(ctx, this.targetMode.cursor, view, this.player, time, effectProfile);
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

  playProjectile(from, to, color) {
    this.addEffect({
      type: "projectileTrail",
      from: { x: from.x, y: from.y },
      to: { x: to.x, y: to.y },
      color,
      duration: this.getReducedMotionActive() ? 120 : 210
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
          pushAction("open-hub", "Magic", "Spend control or damage now", true, "magic");
        }
        pushAction("wait", "Hold", "Stabilize before moving", false);
      } else if (rangedThreats > 0) {
        advice = "Ranged pressure is active. Break line of sight with pillars, corners, or a fast disable.";
        if (this.player.spellsKnown.length > 0) {
          pushAction("open-hub", "Magic", "Answer ranged pressure", true, "magic");
        }
        pushAction("wait", "Hold", "Do not overextend", false);
      } else if (chargeThreats > 0) {
        advice = "A visible charger is winding up. Sidestep or block the lane before it lands.";
        pushAction("wait", "Hold", "Let the lane clarify", false);
        if (this.player.spellsKnown.length > 0) {
          pushAction("open-hub", "Magic", "Slow or burst the charger", true, "magic");
        }
      } else if (summonThreats > 0) {
        advice = "A summoner is online. Kill or disrupt it before the room fills in.";
        if (this.player.spellsKnown.length > 0) {
          pushAction("open-hub", "Magic", "Pressure the summoner", true, "magic");
        }
      } else {
        advice = "You are engaged. Win the current exchange before opening more of the map.";
        if (this.player.spellsKnown.length > 0) {
          pushAction("open-hub", "Magic", "Take initiative", true, "magic");
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
    if (this.controllerStatus) {
      const connected = this.gamepadInput.isConnected();
      const compact = typeof window !== "undefined" && window.innerWidth <= 640;
      this.controllerStatus.textContent = connected
        ? compact ? "Controller ready" : `Controller: ${this.gamepadInput.getControllerName()}`
        : compact ? "Touch active" : "Touch controls active";
    }
    if (this.touchControls) {
      const hiddenBySetting = !this.settings.touchControlsEnabled;
      const hiddenByController = this.settings.controllerHintsEnabled && this.gamepadInput.isConnected();
      this.touchControls.classList.toggle("hidden", hiddenBySetting || hiddenByController);
    }
    syncSaveChrome(this);
  }

  getSavedRunMeta() { return loadSavedRunMeta(); }

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

  performWait() { performWaitTurn(this); }

  restUntilSafe() { restUntilSafeTurn(this); }

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

  loadGame() { loadGameState(this); }

  showTitleScreen() { showTitleModal(this); }

  showCreationModal() { showCreationScreen(this); }

  renderActionBar() { renderAdvisorActionBar(this); }

  getAdvisorModel() { return buildAdvisorModel(this); }

  renderPanels() { renderAdvisorPanels(this); }

  renderLog() {
    return this.renderLogMarkup(32);
  }
}

// src/main.js

window.addEventListener("load", () => {
  window.castleOfTheWindsWeb = new Game();
});

})();
