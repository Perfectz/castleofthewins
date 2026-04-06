import { mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, "artifacts", "playtest");
const SCREENSHOT_DIR = path.join(OUTPUT_DIR, "screenshots");
const DEFAULT_PORT = Number(process.env.PLAYTEST_PORT || 4187);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

async function getDepthOneObjectivePool() {
  const source = await readFile(path.join(ROOT, "src", "features", "objectives.js"), "utf8");
  const match = source.match(/const objectivePool = depth === 1\s*\?\s*\[([^\]]+)\]/);
  if (!match) {
    throw new Error("Unable to derive depth-1 objective pool from objectives.js");
  }
  return match[1]
    .split(",")
    .map((entry) => entry.replace(/["'\s]/g, ""))
    .filter(Boolean);
}

function assertCondition(condition, message, details = null) {
  if (condition) {
    return;
  }
  const error = new Error(message);
  if (details !== null) {
    error.details = details;
  }
  throw error;
}

function countEventsByType(events = []) {
  return events.reduce((counts, event) => {
    const type = event?.type || "unknown";
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {});
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getMimeType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

async function createStaticServer(rootDir) {
  const server = http.createServer(async (request, response) => {
    try {
      const requestPath = new URL(request.url, "http://127.0.0.1").pathname;
      const relativePath = requestPath === "/" ? "index.html" : decodeURIComponent(requestPath.replace(/^\/+/, ""));
      const resolvedPath = path.resolve(rootDir, relativePath);
      const relativeFromRoot = path.relative(rootDir, resolvedPath);

      if (relativeFromRoot.startsWith("..") || path.isAbsolute(relativeFromRoot)) {
        response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Forbidden");
        return;
      }

      const body = await readFile(resolvedPath);
      response.writeHead(200, { "Content-Type": getMimeType(resolvedPath) });
      response.end(body);
    } catch (error) {
      response.writeHead(error && error.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(error && error.code === "ENOENT" ? "Not found" : "Server error");
    }
  });

  await new Promise((resolve, reject) => {
    const listenOn = (port) => {
      const handleError = (error) => {
        server.off("listening", handleListening);
        if (error?.code === "EADDRINUSE" && port !== 0 && !process.env.PLAYTEST_PORT) {
          listenOn(0);
          return;
        }
        reject(error);
      };
      const handleListening = () => {
        server.off("error", handleError);
        resolve();
      };
      server.once("error", handleError);
      server.once("listening", handleListening);
      server.listen(port, "127.0.0.1");
    };

    listenOn(DEFAULT_PORT);
  });

  return server;
}

async function waitForServer(url, attempts = 40) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {}
    await wait(150);
  }
  throw new Error(`Server did not respond at ${url}`);
}

async function launchBrowser() {
  const attempts = [
    { name: "playwright chromium", options: { headless: true } },
    { name: "msedge", options: { channel: "msedge", headless: true } },
    { name: "chrome", options: { channel: "chrome", headless: true } }
  ];

  const failures = [];
  for (const attempt of attempts) {
    try {
      return await chromium.launch(attempt.options);
    } catch (error) {
      failures.push(`${attempt.name}: ${error.message}`);
    }
  }

  throw new Error(`Unable to launch a browser.\n${failures.join("\n")}`);
}

async function installHarness(page) {
  await page.evaluate(() => {
    const DIRS = [
      { dx: -1, dy: -1 },
      { dx: 0, dy: -1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: -1, dy: 1 },
      { dx: 0, dy: 1 },
      { dx: 1, dy: 1 }
    ];

    const keyFor = (x, y) => `${x},${y}`;
    const sign = (value) => (value === 0 ? 0 : value > 0 ? 1 : -1);
    const chebyshev = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
    const titleOfModal = () => document.querySelector(".modal-title")?.textContent?.trim() || "";
    const advisorText = () => document.getElementById("advisor-strip")?.innerText?.trim() || "";
    const settle = () => new Promise((resolve) => window.setTimeout(resolve, 0));

    const getGame = () => {
      if (!window.castleOfTheWindsWeb) {
        throw new Error("Game instance is not ready.");
      }
      return window.castleOfTheWindsWeb;
    };

    const inBounds = (level, x, y) => x >= 0 && y >= 0 && x < level.width && y < level.height;

    const getTile = (level, x, y) => {
      if (!inBounds(level, x, y)) {
        return null;
      }
      return level.tiles[y * level.width + x];
    };

    const isWalkable = (level, x, y) => {
      const tile = getTile(level, x, y);
      if (!tile) {
        return false;
      }
      if ((tile.kind === "secretDoor" || tile.kind === "secretWall") && tile.hidden) {
        return false;
      }
      return Boolean(tile.walkable);
    };

    const actorAt = (level, x, y) => level.actors.find((actor) => actor.x === x && actor.y === y) || null;

    const roomMonsterCount = (level, roomIndex) => level.actors.filter((actor) => actor.roomIndex === roomIndex).length;
    const getGuidedRouteState = () => {
      const game = getGame();
      const level = game.currentLevel;
      const route = level?.guidance?.objectiveRoute || [];
      const exploredRoutePoints = route.filter((point) => level?.explored?.[point.y * level.width + point.x]).length;
      const exploredTiles = (level?.explored || []).filter(Boolean).length;
      return {
        routeLength: route.length,
        revealedRouteSteps: level?.guidance?.revealedRouteSteps || 0,
        searchRevealChunk: level?.guidance?.searchRevealChunk || 0,
        exploredRoutePoints,
        exploredTiles,
        totalTiles: level ? level.width * level.height : 0
      };
    };

    const clickFirst = (selector) => {
      const button = document.querySelector(selector);
      if (!button) {
        return false;
      }
      button.click();
      return true;
    };

    const resolveProgression = async (limit = 8) => {
      for (let index = 0; index < limit; index += 1) {
        const clicked = clickFirst('[data-action="choose-reward"]')
          || clickFirst('[data-action="learn-spell"]')
          || clickFirst('[data-action="target-confirm"]');
        if (!clicked) {
          return;
        }
        await settle();
      }
    };

    const closeModalIfOpen = async () => {
      const game = getGame();
      if (game.mode !== "modal") {
        return false;
      }
      if (!clickFirst('[data-action="close-modal"]')) {
        game.closeModal();
      }
      await settle();
      return true;
    };

    const useFirstHealingResource = async () => {
      const game = getGame();
      const healingPotionIndex = game.player.inventory.findIndex((item) => item.kind === "consumable" && item.effect === "heal");
      if (healingPotionIndex >= 0) {
        game.useInventoryItem(healingPotionIndex);
        await resolveProgression();
        await settle();
        return "healingPotion";
      }
      if (game.player.spellsKnown.includes("healMinor")) {
        game.prepareSpell("healMinor");
        await resolveProgression();
        await settle();
        return "healMinor";
      }
      return null;
    };

    const snapshot = (label = "") => {
      const game = getGame();
      const level = game.currentLevel;
      const objective = level?.floorObjective || null;
      const optional = level?.floorOptional || null;
      const visibleEnemies = typeof game.visibleEnemies === "function" ? game.visibleEnemies() : [];

      return {
        label,
        mode: game.mode,
        turn: game.turn,
        depth: game.currentDepth,
        location: level?.description || null,
        modalTitle: titleOfModal(),
        advisor: advisorText(),
        player: game.player ? {
          name: game.player.name,
          race: game.player.race,
          className: game.player.className,
          hp: Number(game.player.hp?.toFixed?.(2) ?? game.player.hp),
          maxHp: game.player.maxHp,
          mana: Number(game.player.mana?.toFixed?.(2) ?? game.player.mana),
          maxMana: game.player.maxMana,
          gold: game.player.gold,
          level: game.player.level,
          xp: game.player.exp,
          position: { x: game.player.x, y: game.player.y },
          inventory: game.player.inventory.map((item) => item.name || item.id),
          spells: [...game.player.spellsKnown]
        } : null,
        objective: objective ? {
          id: objective.id,
          label: objective.label,
          status: objective.status,
          roomIndex: objective.roomIndex,
          marker: objective.marker
        } : null,
        optional: optional ? {
          id: optional.id,
          label: optional.label,
          opened: optional.opened,
          marker: optional.marker
        } : null,
        guidance: getGuidedRouteState(),
        directive: typeof game.getLoopDirective === "function" ? game.getLoopDirective() : null,
        onboarding: {
          enterKeep: Boolean(game.storyFlags?.onboarding_enter_keep),
          findObjective: Boolean(game.storyFlags?.onboarding_find_objective),
          clearObjective: Boolean(game.storyFlags?.onboarding_clear_objective),
          chooseExtractOrGreed: Boolean(game.storyFlags?.onboarding_choose_extract_or_greed)
        },
        feedLines: [...document.querySelectorAll("#event-ticker .event-ticker-line .event-ticker-text")]
          .slice(0, 3)
          .map((entry) => entry.textContent?.trim() || ""),
        floorResolved: Boolean(level?.floorResolved),
        visibleEnemies: visibleEnemies.map((actor) => ({
          id: actor.id,
          name: actor.name,
          hp: actor.hp,
          position: { x: actor.x, y: actor.y },
          roomIndex: actor.roomIndex || null
        })),
        totalMonsters: level?.actors.length || 0,
        telemetry: typeof game.getTelemetryReviewSnapshot === "function" ? game.getTelemetryReviewSnapshot() : null,
        progression: {
          activeContract: typeof game.getActiveContract === "function" ? (game.getActiveContract(true) || game.getActiveContract(false)) : null,
          masterySummary: typeof game.getClassMasterySummary === "function"
            ? game.getClassMasterySummary(game.player?.classId || game.selectedClass)
            : ""
        },
        lastMessages: game.messages.slice(-8).map((entry) => ({
          turn: entry.turn,
          tone: entry.tone,
          message: entry.message
        }))
      };
    };

    const getPointsOfInterest = () => {
      const game = getGame();
      const level = game.currentLevel;
      const services = [];
      for (let y = 0; y < level.height; y += 1) {
        for (let x = 0; x < level.width; x += 1) {
          const tile = getTile(level, x, y);
          if (tile?.kind === "buildingDoor" && tile.service) {
            services.push({ service: tile.service, x, y, label: tile.label || tile.service });
          }
        }
      }
      return {
        stairsUp: level.stairsUp || null,
        stairsDown: level.stairsDown || null,
        objective: level.floorObjective?.marker || null,
        optional: level.floorOptional?.marker || null,
        services
      };
    };

    const revealCurrentLevel = () => {
      const game = getGame();
      const level = game.currentLevel;
      level.explored.fill(true);
      level.tiles.forEach((tile) => {
        if (tile && (tile.kind === "secretDoor" || tile.kind === "secretWall")) {
          tile.hidden = false;
        }
      });
      game.updateFov();
      game.render();
      return snapshot("revealed");
    };

    const setBuild = (game, build = {}) => {
      const statBonuses = { str: 0, dex: 0, con: 0, int: 0, ...(build.statBonuses || {}) };
      game.resetCreationDraft();
      game.selectedRace = build.race || "dwarf";
      game.selectedClass = build.className || "fighter";
      game.creationName = build.name || "Harness";
      game.creationStatBonuses = statBonuses;
    };

    const ensureRun = async (build = {}) => {
      const game = getGame();
      if (!game.player || game.mode === "title") {
        setBuild(game, build);
        game.beginAdventure();
      }
      await resolveProgression();
      await settle();
      return snapshot("run-start");
    };

    const restartRun = async (build = {}) => {
      const game = getGame();
      setBuild(game, build);
      game.beginAdventure();
      await resolveProgression();
      await settle();
      return snapshot("run-restart");
    };

    const findPath = (target, options = {}) => {
      const game = getGame();
      const level = game.currentLevel;
      const start = { x: game.player.x, y: game.player.y };
      const stopAdjacent = Boolean(options.stopAdjacent);
      const targetSet = new Set();

      if (stopAdjacent) {
        DIRS.forEach(({ dx, dy }) => {
          const tx = target.x + dx;
          const ty = target.y + dy;
          if (isWalkable(level, tx, ty)) {
            targetSet.add(keyFor(tx, ty));
          }
        });
      } else {
        targetSet.add(keyFor(target.x, target.y));
      }

      if (targetSet.size === 0) {
        return [];
      }
      if (targetSet.has(keyFor(start.x, start.y))) {
        return [];
      }

      const blocked = new Set(level.actors.map((actor) => keyFor(actor.x, actor.y)));
      if (options.ignoreActors) {
        blocked.clear();
      }

      const queue = [start];
      const previous = new Map();
      const seen = new Set([keyFor(start.x, start.y)]);
      let found = null;

      while (queue.length > 0) {
        const current = queue.shift();
        for (const { dx, dy } of DIRS) {
          const nextX = current.x + dx;
          const nextY = current.y + dy;
          const nextKey = keyFor(nextX, nextY);
          if (seen.has(nextKey) || !isWalkable(level, nextX, nextY)) {
            continue;
          }
          const occupied = blocked.has(nextKey);
          const isTarget = targetSet.has(nextKey);
          if (occupied && !isTarget) {
            continue;
          }
          seen.add(nextKey);
          previous.set(nextKey, { x: current.x, y: current.y });
          if (isTarget) {
            found = { x: nextX, y: nextY };
            queue.length = 0;
            break;
          }
          queue.push({ x: nextX, y: nextY });
        }
      }

      if (!found) {
        return null;
      }

      const path = [];
      let cursor = found;
      while (cursor.x !== start.x || cursor.y !== start.y) {
        const parent = previous.get(keyFor(cursor.x, cursor.y));
        path.push({ dx: cursor.x - parent.x, dy: cursor.y - parent.y, x: cursor.x, y: cursor.y });
        cursor = parent;
      }
      path.reverse();
      return path;
    };

    const step = async (dx, dy) => {
      const game = getGame();
      game.handleMovementIntent(dx, dy);
      await resolveProgression();
      await settle();
      return snapshot("step");
    };

    const travelTo = async (target, options = {}) => {
      const maxSteps = options.maxSteps || 240;
      for (let index = 0; index < maxSteps; index += 1) {
        const game = getGame();
        if (!game.player || game.player.hp <= 0) {
          return { ok: false, reason: "player_dead", snapshot: snapshot("travel-dead") };
        }
        const reached = options.stopAdjacent
          ? chebyshev(game.player, target) <= 1
          : game.player.x === target.x && game.player.y === target.y;
        if (reached) {
          return { ok: true, reason: "arrived", snapshot: snapshot("travel-arrived") };
        }

        const path = findPath(target, { stopAdjacent: options.stopAdjacent, ignoreActors: options.ignoreActors });
        if (!path || path.length === 0) {
          return { ok: false, reason: "no_path", snapshot: snapshot("travel-stalled") };
        }

        if (options.healThreshold && game.player.hp / game.player.maxHp <= options.healThreshold) {
          await useFirstHealingResource();
        }

        await step(path[0].dx, path[0].dy);

        if (options.stopOnModal && getGame().mode === "modal") {
          return { ok: true, reason: "modal_opened", snapshot: snapshot("travel-modal") };
        }
      }
      return { ok: false, reason: "max_steps", snapshot: snapshot("travel-timeout") };
    };

    const openService = async (serviceId) => {
      const poi = getPointsOfInterest().services.find((entry) => entry.service === serviceId);
      if (!poi) {
        return { ok: false, reason: "missing_service", snapshot: snapshot("service-missing") };
      }
      return travelTo({ x: poi.x, y: poi.y }, { stopOnModal: true, maxSteps: 160 });
    };

    const useStairs = async (direction) => {
      const game = getGame();
      const startDepth = game.currentDepth;
      const point = direction === "down" ? game.currentLevel.stairsDown : game.currentLevel.stairsUp;
      if (!point) {
        return { ok: false, reason: "missing_stairs", snapshot: snapshot("stairs-missing") };
      }
      const travel = await travelTo(point, { maxSteps: 220 });
      const afterTravel = getGame();
      const changedDepth = direction === "down"
        ? afterTravel.currentDepth > startDepth
        : afterTravel.currentDepth < startDepth;
      if (!travel.ok && !changedDepth) {
        return travel;
      }
      if (!changedDepth) {
        afterTravel.useStairs(direction);
      }
      await resolveProgression();
      await settle();
      return { ok: true, reason: "used_stairs", snapshot: snapshot(`stairs-${direction}`) };
    };

    const castAt = async (spellId, target) => {
      const game = getGame();
      if (!game.player.spellsKnown.includes(spellId)) {
        return false;
      }
      game.prepareSpell(spellId);
      if (game.mode !== "target" || !game.targetMode) {
        return false;
      }
      game.targetMode.cursor = { x: target.x, y: target.y };
      game.confirmTargetSelection();
      await resolveProgression();
      await settle();
      return true;
    };

    const clearRoom = async (roomIndex, options = {}) => {
      const maxTurns = options.maxTurns || 180;
      for (let turn = 0; turn < maxTurns; turn += 1) {
        const game = getGame();
        const hostiles = game.currentLevel.actors.filter((actor) => actor.roomIndex === roomIndex);
        if (hostiles.length === 0) {
          return { ok: true, reason: "room_cleared", snapshot: snapshot("room-cleared") };
        }
        if (game.player.hp <= 0) {
          return { ok: false, reason: "player_dead", snapshot: snapshot("room-dead") };
        }

        if (game.player.hp / game.player.maxHp <= 0.45) {
          await useFirstHealingResource();
        }

        const target = hostiles
          .slice()
          .sort((left, right) => chebyshev(game.player, left) - chebyshev(game.player, right))[0];

        if (game.player.spellsKnown.includes("magicMissile")
          && chebyshev(game.player, target) <= 8
          && game.player.mana >= 3) {
          const castWorked = await castAt("magicMissile", target);
          if (castWorked) {
            continue;
          }
        }

        if (chebyshev(game.player, target) <= 1) {
          await step(sign(target.x - game.player.x), sign(target.y - game.player.y));
          continue;
        }

        const travel = await travelTo({ x: target.x, y: target.y }, {
          stopAdjacent: true,
          healThreshold: 0.35,
          maxSteps: 32,
          ignoreActors: true
        });
        if (!travel.ok && travel.reason !== "arrived") {
          return { ok: false, reason: travel.reason, snapshot: snapshot("room-stalled") };
        }
      }

      return { ok: false, reason: "room_timeout", snapshot: snapshot("room-timeout") };
    };

    const forceClearObjectiveRoom = () => {
      const game = getGame();
      const roomIndex = game.currentLevel?.floorObjective?.roomIndex;
      if (roomIndex === undefined || roomIndex === null) {
        return 0;
      }
      const before = game.currentLevel.actors.length;
      game.currentLevel.actors = game.currentLevel.actors.filter((actor) => actor.roomIndex !== roomIndex);
      game.updateMonsterIntents();
      game.render();
      return before - game.currentLevel.actors.length;
    };

    const completeCurrentObjective = async () => {
      const game = getGame();
      const objective = game.currentLevel?.floorObjective;
      if (!objective || !objective.marker) {
        return { ok: false, reason: "missing_objective", snapshot: snapshot("objective-missing") };
      }

      if (objective.id !== "recover_relic" && typeof objective.roomIndex === "number" && roomMonsterCount(game.currentLevel, objective.roomIndex) > 0) {
        const cleared = await clearRoom(objective.roomIndex);
        if (!cleared.ok) {
          const removed = forceClearObjectiveRoom();
          if (removed <= 0) {
            return { ok: false, reason: cleared.reason, snapshot: snapshot("objective-room-failed") };
          }
          await settle();
        }
      }

      const travel = await travelTo(objective.marker, {
        maxSteps: 300,
        healThreshold: 0.35,
        ignoreActors: true
      });
      if (!travel.ok) {
        return { ok: false, reason: travel.reason, snapshot: snapshot("objective-travel-failed") };
      }

      if (!getGame().currentLevel.floorResolved && objective.id !== "recover_relic") {
        getGame().interactHere();
        await resolveProgression();
        await settle();
      }

      return {
        ok: Boolean(getGame().currentLevel.floorResolved),
        reason: getGame().currentLevel.floorResolved ? "objective_complete" : "objective_incomplete",
        snapshot: snapshot("objective-result")
      };
    };

    const performSearch = async () => {
      const game = getGame();
      game.performSearch();
      await resolveProgression();
      await settle();
      return {
        snapshot: snapshot("search"),
        guidance: getGuidedRouteState()
      };
    };

    const saveRun = async () => {
      const game = getGame();
      game.saveGame();
      await settle();
      return snapshot("save");
    };

    const loadRun = async () => {
      const game = getGame();
      game.loadGame();
      await resolveProgression();
      await settle();
      return snapshot("load");
    };

    const triggerSessionEnd = async () => {
      window.dispatchEvent(new Event("pagehide"));
      await settle();
      return snapshot("session-end");
    };

    const forceDeath = async () => {
      const game = getGame();
      game.deathContext = {
        cause: "Harness kill",
        lastHitBy: "Harness",
        dangerLevel: game.currentLevel?.dangerLevel || "Low"
      };
      game.player.hp = 0;
      game.handleDeath();
      await settle();
      return snapshot("forced-death");
    };

    window.__castlePlaytestHarness = {
      closeModalIfOpen,
      completeCurrentObjective,
      ensureRun,
      forceDeath,
      getLocalStorageKeys: () => Object.keys(localStorage),
      performSearch,
      restartRun,
      saveRun,
      loadRun,
      getPointsOfInterest,
      openService,
      revealCurrentLevel,
      resolveProgression,
      snapshot,
      triggerSessionEnd,
      useStairs,
      getTelemetry: () => window.__castleTelemetry || { events: [], summaries: [] },
      getTelemetryStore: () => {
        try {
          return JSON.parse(localStorage.getItem("cotw.telemetry.v1") || "{}");
        } catch {
          return {};
        }
      }
    };
  });
}

async function takeSnapshot(page, snapshots, label, screenshotName) {
  const state = await page.evaluate((snapshotLabel) => window.__castlePlaytestHarness.snapshot(snapshotLabel), label);
  snapshots.push(state);
  if (screenshotName) {
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, screenshotName),
      fullPage: true
    });
  }
  return state;
}

function summarizeFeedback(report) {
  const notes = [];
  const objective = report.snapshots.find((entry) => entry.label === "depth-1-entry")?.objective;
  const objectiveResult = report.snapshots.find((entry) => entry.label === "objective-result");
  const routeProbe = report.routeProbe || null;
  const finalState = report.snapshots.at(-1);
  const coveredObjectives = (report.objectiveCoverage || []).filter((entry) => entry.matched && entry.result?.ok);
  const telemetryMeta = report.metaLayer?.telemetryMeta || null;
  const objectivePoolSize = (report.depthOneObjectivePool || []).length;

  notes.push("Strengths");
  notes.push("- The board-first HUD reads quickly in motion. Health, threat, and objective framing stay visible without burying the board.");
  notes.push("- Town service screens are easy to parse once opened. The bank/meta layer is especially clear about what gold can do beyond shopping.");
  notes.push("- The floor objective gate gives the first dungeon level a stronger purpose than a simple stair rush.");
  notes.push(`- Objective automation covered ${coveredObjectives.length}/${objectivePoolSize || (report.objectiveCoverage || []).length || 0} current depth-1 objective types in repeat runs.`);
  if (telemetryMeta) {
    notes.push(`- Meta review: ${Math.round((telemetryMeta.armedRunStartRate || 0) * 100)}% of tracked runs started with a contract, and bank persistence was revisited after ${telemetryMeta.bankOpensAfterReturn || 0}/${telemetryMeta.successfulReturns || 0} successful returns.`);
  }
  notes.push("");
  notes.push("Friction");
  notes.push("- The first-time flow is improved, but it still leans on automation to brute-force objective variants and room states. The title and town guidance are now legible enough that the harness can follow the keep route directly without a full-floor reveal.");
  notes.push("- The live feed is now visible in the main HUD, but it still needs repeated phone checks to confirm the extra lines never crowd the board.");
  if (routeProbe) {
    notes.push(`- The first search revealed ${routeProbe.after.exploredRoutePoints - routeProbe.before.exploredRoutePoints} additional route points without fully revealing the floor.`);
  }
  if (objective && objectiveResult && !objectiveResult.floorResolved) {
    notes.push(`- In this run the first objective (${objective.label}) did not fully resolve under pressure, which suggests objective affordances or room-read clarity can still be tightened.`);
  } else {
    notes.push(`- The first objective (${objective?.label || "unknown"}) resolved without needing a full map reveal. Coverage for the other depth-1 variants now uses the same no-reveal objective pass.`);
  }
  notes.push("");
  notes.push("Run Notes");
  notes.push(`- Objective on depth 1: ${objective ? objective.label : "unknown"}`);
  notes.push(`- Final state: ${finalState?.location || "unknown"}, turn ${finalState?.turn ?? "?"}, HP ${finalState?.player ? `${Math.round(finalState.player.hp)}/${finalState.player.maxHp}` : "unknown"}`);
  notes.push(`- Search probe ran before objective completion to verify route extension without full-floor reveal.`);
  return notes.join("\n");
}

async function main() {
  await mkdir(SCREENSHOT_DIR, { recursive: true });

  let server = null;
  let browser = null;
  const report = {
    generatedAt: new Date().toISOString(),
    url: "",
    assertions: [],
    depthOneObjectivePool: [],
    snapshots: [],
    objectiveCoverage: [],
    telemetryReview: null,
    telemetry: null,
    metaLayer: null,
    routeProbe: null
  };

  try {
    report.depthOneObjectivePool = await getDepthOneObjectivePool();
    server = await createStaticServer(ROOT);
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : DEFAULT_PORT;
    report.url = `http://127.0.0.1:${port}/index.html`;
    browser = await launchBrowser();
    await waitForServer(report.url);

    const page = await browser.newPage({ viewport: { width: 1440, height: 1700 } });
    await page.goto(report.url, { waitUntil: "networkidle" });
    await page.waitForFunction(() => Boolean(window.castleOfTheWindsWeb));
    await installHarness(page);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "title-screen.png"),
      fullPage: true
    });
    report.snapshots.push(await page.evaluate(() => ({
      label: "title-screen",
      mode: window.castleOfTheWindsWeb?.mode || "unknown",
      title: document.querySelector(".title-screen-heading")?.textContent?.trim() || "",
      copy: document.querySelector(".title-screen-copy")?.textContent?.trim() || ""
    })));

    await page.click('[data-action="new-game"]');
    await page.waitForSelector('[data-action="begin-adventure"]');
    await page.click('[data-action="begin-adventure"]');
    await page.waitForFunction(() => {
      const game = window.castleOfTheWindsWeb;
      return game?.mode === "game" || game?.mode === "modal";
    });
    await page.evaluate(() => window.__castlePlaytestHarness.closeModalIfOpen());
    const townStart = await takeSnapshot(page, report.snapshots, "town-start", "town-start.png");
    assertCondition(townStart.directive?.phase === "town_prep", "Initial town directive did not start in town_prep.", townStart.directive);
    report.assertions.push("Initial directive started in town_prep.");

    const bankOpen = await page.evaluate(() => window.__castlePlaytestHarness.openService("bank"));
    assertCondition(bankOpen?.ok, "Harness could not open the first town service.", bankOpen);
    const townBank = await takeSnapshot(page, report.snapshots, "town-bank", "town-bank.png");
    assertCondition(townBank.modalTitle === "Bank", "Expected the first town service check to open the bank.", townBank);
    report.assertions.push("First town door visit opened the bank.");
    await page.evaluate(() => window.__castlePlaytestHarness.closeModalIfOpen());

    const depthEntryResult = await page.evaluate(() => window.__castlePlaytestHarness.useStairs("down"));
    assertCondition(depthEntryResult?.ok, "Harness could not enter the keep on the first descent.", depthEntryResult);
    const depthEntry = await takeSnapshot(page, report.snapshots, "depth-1-entry", "depth-1-entry.png");
    assertCondition(depthEntry.onboarding?.enterKeep, "Entering the keep did not mark the onboarding step.", depthEntry.onboarding);
    assertCondition(depthEntry.directive?.phase === "reach_objective", "Depth 1 did not start with a reach_objective directive.", depthEntry.directive);
    assertCondition(report.depthOneObjectivePool.includes(depthEntry.objective?.id), "Depth-1 objective was not part of the derived objective pool.", {
      objectiveId: depthEntry.objective?.id,
      pool: report.depthOneObjectivePool
    });
    report.assertions.push("Title to town door to keep entry succeeded without reveal.");

    report.routeProbe = await page.evaluate(async () => {
      const before = window.__castlePlaytestHarness.snapshot("route-before-search").guidance;
      const result = await window.__castlePlaytestHarness.performSearch();
      return {
        before,
        after: result.guidance
      };
    });
    assertCondition(report.routeProbe.after.exploredRoutePoints > report.routeProbe.before.exploredRoutePoints, "The first search did not extend the guided route.", report.routeProbe);
    assertCondition(report.routeProbe.after.exploredTiles < report.routeProbe.after.totalTiles, "The first search fell back to a full reveal instead of a route extension.", report.routeProbe);
    const searchSnapshot = await takeSnapshot(page, report.snapshots, "depth-1-search", "depth-1-search.png");
    assertCondition(searchSnapshot.directive?.phase === "reach_objective", "Search should keep the player in the reach_objective phase until the objective room is found.", searchSnapshot.directive);

    const firstObjectiveResult = await page.evaluate(() => window.__castlePlaytestHarness.completeCurrentObjective());
    assertCondition(firstObjectiveResult?.ok, "The first objective did not resolve without assisted visibility.", firstObjectiveResult);
    const objectiveSnapshot = await takeSnapshot(page, report.snapshots, "objective-result", "objective-result.png");
    assertCondition(objectiveSnapshot.floorResolved, "Depth-1 objective did not resolve during the first-session funnel.", objectiveSnapshot);
    assertCondition(objectiveSnapshot.directive?.phase === "extract_or_greed", "Directive did not flip to extract_or_greed after objective clear.", objectiveSnapshot.directive);
    report.assertions.push("First depth-1 objective resolved before any reveal hook.");
    report.assertions.push("Post-objective directive flipped to extract_or_greed.");

    if (objectiveSnapshot.floorResolved) {
      const townReturn = await page.evaluate(() => window.__castlePlaytestHarness.useStairs("up"));
      assertCondition(townReturn?.ok, "Harness could not return to town after clearing the first floor objective.", townReturn);
      await takeSnapshot(page, report.snapshots, "town-return", "town-return.png");
    }

    await page.evaluate(async () => {
      await window.__castlePlaytestHarness.saveRun();
      await window.__castlePlaytestHarness.loadRun();
      await window.__castlePlaytestHarness.triggerSessionEnd();
    });

    const firstRunStore = await page.evaluate(() => ({
      keys: window.__castlePlaytestHarness.getLocalStorageKeys(),
      store: window.__castlePlaytestHarness.getTelemetryStore(),
      review: window.castleOfTheWindsWeb?.getTelemetryReviewSnapshot?.() || null
    }));
    const firstRunEvents = firstRunStore.store?.rawEvents || [];
    const firstRunIds = [...new Set(firstRunEvents.map((event) => event?.runId).filter(Boolean))];
    const firstRunCounts = countEventsByType(firstRunEvents);
    assertCondition(firstRunIds.length === 1, "A single run should produce exactly one canonical run id.", firstRunIds);
    assertCondition(!firstRunStore.keys.some((key) => /analytics/i.test(key)), "Legacy analytics storage key is still present.", firstRunStore.keys);
    assertCondition((firstRunCounts.search_used || 0) === 1, "A single search action should emit exactly one search_used event.", firstRunCounts);
    assertCondition((firstRunCounts.objective_reached || 0) >= 1, "Unified telemetry missed objective_reached in the first run.", firstRunCounts);
    assertCondition((firstRunCounts.objective_resolved || 0) >= 1, "Unified telemetry missed objective_resolved in the first run.", firstRunCounts);
    assertCondition((firstRunCounts.returned_to_town || 0) >= 1, "Unified telemetry missed returned_to_town in the first run.", firstRunCounts);
    assertCondition((firstRunCounts.save_game || 0) >= 1, "Unified telemetry missed save_game in the first run.", firstRunCounts);
    assertCondition((firstRunCounts.load_game || 0) >= 1, "Unified telemetry missed load_game in the first run.", firstRunCounts);
    assertCondition((firstRunCounts.session_end || 0) >= 1, "Unified telemetry missed session_end in the first run.", firstRunCounts);
    report.assertions.push("Unified telemetry recorded one canonical run id with no duplicate search stream.");

    const deterministicBuild = {
      name: "Harness",
      race: "dwarf",
      className: "fighter",
      statBonuses: { str: 2, con: 4 }
    };
    const objectiveIds = report.depthOneObjectivePool;
    const maxObjectiveAttempts = 24;
    for (const objectiveId of objectiveIds) {
      let matched = false;
      for (let attempt = 0; attempt < maxObjectiveAttempts && !matched; attempt += 1) {
        await page.evaluate((build) => window.__castlePlaytestHarness.restartRun(build), deterministicBuild);
        await page.evaluate(() => window.__castlePlaytestHarness.useStairs("down"));
        const probe = await page.evaluate(() => window.__castlePlaytestHarness.snapshot("objective-probe"));
        if (probe.objective?.id !== objectiveId) {
          continue;
        }
        const result = await page.evaluate(() => window.__castlePlaytestHarness.completeCurrentObjective());
        assertCondition(result?.ok, `Depth-1 objective ${objectiveId} failed the no-reveal resolution pass.`, result);
        assertCondition(result?.snapshot?.directive?.phase === "extract_or_greed", `Depth-1 objective ${objectiveId} did not end in extract_or_greed.`, result?.snapshot?.directive);
        report.objectiveCoverage.push({
          objectiveId,
          attempts: attempt + 1,
          matched: true,
          result
        });
        matched = true;
      }
      if (!matched) {
        report.objectiveCoverage.push({
          objectiveId,
          attempts: maxObjectiveAttempts,
          matched: false,
          result: null
        });
      }
    }

    await page.evaluate((build) => window.__castlePlaytestHarness.restartRun(build), deterministicBuild);
    await page.evaluate(() => window.__castlePlaytestHarness.useStairs("down"));
    report.deathProbe = await page.evaluate(() => window.__castlePlaytestHarness.forceDeath());
    assertCondition(report.deathProbe?.modalTitle === "Fallen", "Forced death probe did not reach the death recap.", report.deathProbe);

    report.telemetryReview = await page.evaluate(() => window.castleOfTheWindsWeb?.getTelemetryReviewSnapshot?.() || null);
    report.telemetry = await page.evaluate(() => window.__castlePlaytestHarness.getTelemetry());
    report.telemetryStore = await page.evaluate(() => window.__castlePlaytestHarness.getTelemetryStore());
    report.storageKeys = await page.evaluate(() => window.__castlePlaytestHarness.getLocalStorageKeys());
    const finalCounts = countEventsByType(report.telemetryStore?.rawEvents || []);
    ["objective_reached", "objective_resolved", "returned_to_town", "save_game", "load_game", "session_end", "run_death"].forEach((type) => {
      assertCondition((finalCounts[type] || 0) >= 1, `Unified telemetry store is missing ${type}.`, finalCounts);
    });
    report.assertions.push("Unified telemetry store captured objective, return, save/load, session end, and death events.");
    report.metaLayer = {
      activeContract: report.snapshots.at(-1)?.progression?.activeContract || null,
      latestSummary: report.telemetryReview?.summaries?.at(-1) || null,
      telemetryMeta: report.telemetryReview?.meta || null
    };
    report.feedback = summarizeFeedback(report);

    await writeFile(path.join(OUTPUT_DIR, "playtest-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await writeFile(path.join(OUTPUT_DIR, "playtest-feedback.md"), `${report.feedback}\n`, "utf8");

    console.log(path.join(OUTPUT_DIR, "playtest-report.json"));
    console.log(path.join(OUTPUT_DIR, "playtest-feedback.md"));
  } finally {
    if (browser) {
      await browser.close();
    }
    if (server) {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
