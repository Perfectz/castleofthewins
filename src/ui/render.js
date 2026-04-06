import { TILE_SIZE, VIEW_SIZE } from "../core/constants.js";
import { ACTOR_VISUALS, BOARD_PROP_VISUALS, getActorVisual, getBoardPropVisual, getTileVisual, ITEM_VISUAL_IDS, TILESET_VISUALS, TOWN_BUILDING_ASSETS, TOWN_TERRAIN_ASSETS } from "../data/assets.js";
import { clamp, shadeColor } from "../core/utils.js";
import { tileDef } from "../core/world.js";

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

    const doorX = building.x + Math.floor(building.w / 2) - view.x;
    const doorY = building.y + building.h - 1 - view.y;
    if (doorX < 0 || doorY < 0 || doorX >= VIEW_SIZE || doorY >= VIEW_SIZE) {
      continue;
    }
    const label = building.name || building.service || "Service";
    ctx.save();
    ctx.font = "700 9px Trebuchet MS";
    const pillWidth = Math.min(building.w * TILE_SIZE - 10, Math.max(46, ctx.measureText(label).width + 16));
    const pillX = doorX * TILE_SIZE + (TILE_SIZE - pillWidth) / 2;
    const pillY = top * TILE_SIZE + 4;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = anyVisible ? "rgba(17, 23, 28, 0.92)" : "rgba(17, 23, 28, 0.56)";
    ctx.strokeStyle = anyVisible ? "rgba(242, 215, 166, 0.68)" : "rgba(242, 215, 166, 0.32)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillWidth, 14, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = anyVisible ? "#f3ddb1" : "rgba(243, 221, 177, 0.7)";
    ctx.fillText(label, pillX + pillWidth / 2, pillY + 7);
    ctx.restore();
  }
}

export function drawBoardProps(ctx, level, view, time = 0, options = {}) {
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
    if (visual.light) {
      const cx = sx * TILE_SIZE + 12;
      const cy = sy * TILE_SIZE + 12;
      const pulse = reducedMotion ? 0.18 : 0.16 + (Math.sin((time + index * 45) / 170) + 1) * 0.05;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, TILE_SIZE * 0.95);
      glow.addColorStop(0, rgbaWithAlpha(visual.tint || "rgba(255, 199, 128, 0.36)", pulse));
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(sx * TILE_SIZE - 6, sy * TILE_SIZE - 6, TILE_SIZE + 12, TILE_SIZE + 12);
    }
    const frames = visual.frames || [];
    const frame = frames.length <= 1 ? frames[0] : frames[Math.floor(time / 220) % frames.length];
    if (!frame) {
      return;
    }
    const lift = Math.round((visual.lift || 0) * TILE_SIZE);
    const scale = visual.scale || 0.68;
    const size = Math.round(TILE_SIZE * scale);
    const offset = Math.round((TILE_SIZE - size) / 2);
    drawFrame(ctx, frame, sx * TILE_SIZE + offset, sy * TILE_SIZE + TILE_SIZE - size - 2 - lift, size, size, {
      tint: visual.tint || ""
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

export function drawPlayer(ctx, player, sx, sy, time = 0, options = {}) {
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

export function drawMonster(ctx, monster, sx, sy, time = 0, options = {}) {
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

export function drawItem(ctx, item, sx, sy, time = 0, options = {}) {
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
  const frame = getTileVisual(itemVisualId, item.x || sx, item.y || sy);
  const itemSize = Math.round(TILE_SIZE * 0.62);
  const itemOffset = Math.round((TILE_SIZE - itemSize) / 2);
  if (frame && drawFrame(ctx, frame, x + itemOffset, y + TILE_SIZE - itemSize - 3, itemSize, itemSize)) {
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

export function drawBoardBurdenVignette(ctx, burdenRatio, time, options = {}) {
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

export function drawMonsterIntent(ctx, monster, sx, sy, time = 0, options = {}) {
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
