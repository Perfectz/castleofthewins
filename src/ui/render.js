import { TILE_SIZE, VIEW_SIZE } from "../core/constants.js";
import { clamp, shadeColor } from "../core/utils.js";
import { tileDef } from "../core/world.js";

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

export function drawTile(ctx, level, tile, worldX, worldY, sx, sy, visible) {
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

export function drawTownBuildings(ctx, level, view) {
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

export function drawPlayer(ctx, player, sx, sy) {
  const x = sx * TILE_SIZE;
  const y = sy * TILE_SIZE;
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

export function drawMonster(ctx, monster, sx, sy) {
  if (drawMonsterIcon(ctx, monster, sx, sy)) {
    return;
  }
  const x = sx * TILE_SIZE;
  const y = sy * TILE_SIZE;
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

export function drawMonsterHealthBar(ctx, monster, sx, sy, options = {}) {
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

export function drawItem(ctx, item, sx, sy) {
  const x = sx * TILE_SIZE;
  const y = sy * TILE_SIZE;
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

export function drawBoardAtmosphere(ctx, level, view, time, options = {}) {
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

export function drawBoardVignette(ctx, hpRatio, time, options = {}) {
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

export function drawMonsterIntent(ctx, monster, sx, sy, time = 0, options = {}) {
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

export function drawCenteredText(ctx, text, x, y, color) {
  ctx.fillStyle = color;
  ctx.font = "18px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText(text, x, y);
  ctx.textAlign = "left";
}

export function drawTargetCursor(ctx, cursor, view, source = null, time = 0, options = {}) {
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

export function drawEffect(ctx, effect, view, time = 0, options = {}) {
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

  if (effect.type === "screenPulse") {
    ctx.save();
    ctx.fillStyle = effect.color;
    ctx.globalAlpha = (effect.alpha || 0.15) * (1 - life);
    ctx.fillRect(0, 0, VIEW_SIZE * TILE_SIZE, VIEW_SIZE * TILE_SIZE);
    ctx.restore();
  }
}
