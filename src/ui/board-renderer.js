/**
 * @module ui/board-renderer
 * @owns High-level composition of renderBoard and renderMiniMap.
 * @reads game.currentLevel, game.player, game.canvas, game.mapCanvas,
 *        game.targetMode, game.visualEffects, game.boardImpulse
 * @mutates Canvas pixels only \u2014 no game state mutation.
 *
 * Extracted from src/game.js. Uses the low-level drawing primitives in
 * ui/render.js and various world/entity helpers. All selectors on
 * surrounding DOM (.map-chip, .map-caption-row) are preserved.
 */
import { TILE_SIZE, VIEW_SIZE } from "../core/constants.js";
import {
  actorAt,
  getTile,
  isExplored,
  isVisible
} from "../core/world.js";
import {
  getCarryCapacity,
  getCarryWeight,
  getExploredPercent,
  miniMapColor
} from "../core/entities.js";
import { clamp, escapeHtml, nowTime } from "../core/utils.js";
import {
  drawBoardAtmosphere,
  drawBoardBurdenVignette,
  drawBoardProps,
  drawBoardVignette,
  drawCenteredText,
  drawEffect,
  drawItem,
  drawMonster,
  drawMonsterHealthBar,
  drawMonsterIntent,
  drawPlayer,
  drawTargetCursor,
  drawTile,
  drawTownBuildings
} from "./render.js";

export function renderBoard(game) {
  const ctx = game.ctx;
  const time = nowTime();
  const effectProfile = game.getEffectProfile();
  ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);

  if (!game.currentLevel || !game.player) {
    drawCenteredText(ctx, "Create a character to begin", game.canvas.width / 2, game.canvas.height / 2, "#f2deb1");
    return;
  }

  const view = game.getViewport();
  let offsetX = 0;
  let offsetY = 0;
  if (game.boardImpulse && game.boardImpulse.until > time) {
    const life = clamp((time - game.boardImpulse.created) / Math.max(1, game.boardImpulse.until - game.boardImpulse.created), 0, 1);
    const falloff = Math.pow(1 - life, 2);
    offsetX = game.boardImpulse.dx * 4 * falloff;
    offsetY = game.boardImpulse.dy * 4 * falloff;
  }

  ctx.save();
  if (offsetX || offsetY) {
    ctx.translate(offsetX, offsetY);
  }

  for (let sy = 0; sy < VIEW_SIZE; sy += 1) {
    for (let sx = 0; sx < VIEW_SIZE; sx += 1) {
      const x = view.x + sx;
      const y = view.y + sy;
      const tile = getTile(game.currentLevel, x, y);
      const visible = isVisible(game.currentLevel, x, y);
      const explored = isExplored(game.currentLevel, x, y);
      if (!tile || !explored) {
        ctx.fillStyle = "#040404";
        ctx.fillRect(sx * TILE_SIZE, sy * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        continue;
      }
      drawTile(ctx, game.currentLevel, tile, x, y, sx, sy, visible);
    }
  }
  drawTownBuildings(ctx, game.currentLevel, view);
  drawBoardAtmosphere(ctx, game.currentLevel, view, time, {
    depth: game.currentDepth,
    firstTownRun: game.currentDepth === 0 && (game.player.deepestDepth || 0) === 0,
    ...effectProfile
  });
  game.getGuidedRoutePoints(game.currentLevel).forEach((point, index, points) => {
    if (!isExplored(game.currentLevel, point.x, point.y) || !isVisible(game.currentLevel, point.x, point.y)) {
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
  drawBoardProps(ctx, game.currentLevel, view, time, effectProfile);

  game.currentLevel.items.forEach((item) => {
    if (!isVisible(game.currentLevel, item.x, item.y)) {
      return;
    }
    const sx = item.x - view.x;
    const sy = item.y - view.y;
    if (sx < 0 || sy < 0 || sx >= VIEW_SIZE || sy >= VIEW_SIZE) {
      return;
    }
    drawItem(ctx, item, sx, sy, time, effectProfile);
  });

  const targetActor = game.targetMode ? actorAt(game.currentLevel, game.targetMode.cursor.x, game.targetMode.cursor.y) : null;
  const sortedVisibleEnemies = game.getSortedVisibleEnemies();
  const focusedThreat = targetActor || game.getFocusedThreat(sortedVisibleEnemies);
  const targetPreview = game.targetMode ? game.getActiveSpellTargetPreview() : null;
  game.currentLevel.actors.forEach((actor) => {
    if (!isVisible(game.currentLevel, actor.x, actor.y)) {
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
      player: game.player,
      view
    });
  });

  game.visualEffects
    .filter((effect) => effect.type !== "screenPulse")
    .forEach((effect) => drawEffect(ctx, effect, view, time, effectProfile));
  drawPlayer(ctx, game.player, game.player.x - view.x, game.player.y - view.y, time, effectProfile);
  if (game.targetMode) {
    drawTargetCursor(ctx, game.targetMode.cursor, view, game.player, time, {
      ...effectProfile,
      targetPreview,
      targetMode: game.targetMode
    });
  }
  ctx.restore();

  game.visualEffects
    .filter((effect) => effect.type === "screenPulse")
    .forEach((effect) => drawEffect(ctx, effect, view, time, effectProfile));
  const hpRatio = game.player.maxHp > 0 ? game.player.hp / game.player.maxHp : 1;
  const burdenRatio = getCarryWeight(game.player) / Math.max(1, getCarryCapacity(game.player));
  drawBoardVignette(ctx, hpRatio, time, effectProfile);
  drawBoardBurdenVignette(ctx, burdenRatio, time, effectProfile);
}

export function renderMiniMap(game) {
  if (!game.mapCtx || !game.mapCanvas) {
    return;
  }
  const ctx = game.mapCtx;
  ctx.clearRect(0, 0, game.mapCanvas.width, game.mapCanvas.height);
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, game.mapCanvas.width, game.mapCanvas.height);

  if (!game.currentLevel || !game.player) {
    if (game.mapPanelLabel) {
      game.mapPanelLabel.textContent = "Overworld Map";
    }
    if (game.mapPanelState) {
      game.mapPanelState.textContent = "No active run";
    }
    if (game.mapCaption) {
      game.mapCaption.textContent = "Create a character to begin.";
    }
    return;
  }

  const scaleX = game.mapCanvas.width / game.currentLevel.width;
  const scaleY = game.mapCanvas.height / game.currentLevel.height;
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

  for (let y = 0; y < game.currentLevel.height; y += 1) {
    for (let x = 0; x < game.currentLevel.width; x += 1) {
      if (!isExplored(game.currentLevel, x, y) && game.currentDepth !== 0) {
        continue;
      }
      const tile = getTile(game.currentLevel, x, y);
      ctx.fillStyle = miniMapColor(tile, isVisible(game.currentLevel, x, y));
      ctx.fillRect(Math.floor(x * scaleX), Math.floor(y * scaleY), Math.ceil(scaleX), Math.ceil(scaleY));
    }
  }

  game.currentLevel.items.forEach((item) => {
    if (game.currentDepth !== 0 && !isExplored(game.currentLevel, item.x, item.y)) {
      return;
    }
    ctx.fillStyle = item.kind === "gold" ? "#ebcf60" : "#9bc4df";
    ctx.fillRect(Math.floor(item.x * scaleX), Math.floor(item.y * scaleY), Math.max(2, Math.ceil(scaleX)), Math.max(2, Math.ceil(scaleY)));
  });

  if (game.currentDepth === 0 && game.currentLevel.buildings) {
    game.currentLevel.buildings.forEach((building) => {
      const doorX = building.x + Math.floor(building.w / 2);
      const doorY = building.y + building.h - 1;
      markPoint({ x: doorX, y: doorY }, "#d6b06a", "#f3ddb3", 4);
    });
  }

  game.currentLevel.actors.forEach((actor) => {
    if (game.currentDepth !== 0 && !isVisible(game.currentLevel, actor.x, actor.y)) {
      return;
    }
    ctx.fillStyle = "#c94a4a";
    ctx.fillRect(Math.floor(actor.x * scaleX), Math.floor(actor.y * scaleY), Math.max(2, Math.ceil(scaleX)), Math.max(2, Math.ceil(scaleY)));
  });

  ctx.fillStyle = "#7bd0ff";
  ctx.fillRect(Math.floor(game.player.x * scaleX), Math.floor(game.player.y * scaleY), Math.max(3, Math.ceil(scaleX)), Math.max(3, Math.ceil(scaleY)));

  const unresolvedObjective = game.currentLevel.floorObjective && !game.currentLevel.floorResolved
    ? game.currentLevel.floorObjective.marker
    : game.currentLevel.milestone && game.currentLevel.milestone.status !== "cleared"
      ? game.currentLevel.milestone.marker
      : null;
  const unopenedOptional = game.currentLevel.floorOptional && !game.currentLevel.floorOptional.opened ? game.currentLevel.floorOptional.marker : null;
  const highlightedRoomIndex = game.currentLevel.floorObjective && !game.currentLevel.floorResolved
    ? game.currentLevel.floorObjective.roomIndex
    : game.currentLevel.milestone && game.currentLevel.milestone.status !== "cleared"
      ? game.currentLevel.milestone.roomIndex
      : null;
  if (highlightedRoomIndex !== null && highlightedRoomIndex !== undefined && game.currentLevel.rooms?.[highlightedRoomIndex]) {
    const room = game.currentLevel.rooms[highlightedRoomIndex];
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
  game.getGuidedRoutePoints(game.currentLevel).forEach((point, index, points) => {
    if (!isExplored(game.currentLevel, point.x, point.y)) {
      return;
    }
    const px = Math.floor(point.x * scaleX);
    const py = Math.floor(point.y * scaleY);
    ctx.fillStyle = index === points.length - 1 ? "rgba(255, 213, 122, 0.92)" : "rgba(255, 213, 122, 0.54)";
    ctx.fillRect(px, py, Math.max(2, Math.ceil(scaleX)), Math.max(2, Math.ceil(scaleY)));
  });
  markPoint(game.currentLevel.stairsUp, "#93d7ff", "#dff7ff", 5);
  markPoint(game.currentLevel.stairsDown, game.currentDepth === 0 && (game.player.deepestDepth || 0) === 0 ? "#ffd36b" : "#caa44a", "#ffe7ab", 5);
  markPoint(unresolvedObjective, "#ff8c6d", "#ffd3bf", 6);
  markPoint(unopenedOptional, "#c991ff", "#ead7ff", 5);
  markPoint(game.currentLevel.signatureReveal?.point, "#f0d27d", "#fff0c3", 5);

  if (game.mapPanelLabel) {
    game.mapPanelLabel.textContent = game.currentDepth === 0 ? "Overworld Map" : "Floor Survey";
  }
  if (game.mapPanelState) {
    game.mapPanelState.textContent = game.currentDepth === 0
      ? game.getTownCycleLabel()
      : `Depth ${game.currentDepth}`;
  }
  if (game.mapCaption) {
    const modeLabel = game.currentDepth === 0 ? game.getTownCycleLabel() : "Dungeon survey";
    const pressure = game.getPressureUiState();
    game.mapCaption.innerHTML = `
      <div class="map-caption-row">
        <span class="map-chip">${escapeHtml(game.getCurrentAreaTitle())}</span>
        <span class="map-chip subtle">Explored ${getExploredPercent(game.currentLevel)}%</span>
        <span class="map-chip subtle">${escapeHtml(game.currentDepth > 0 ? pressure.label : modeLabel)}</span>
      </div>
    `;
  }
}
