import { mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, "artifacts", "playtest");
const SCREENSHOT_DIR = path.join(OUTPUT_DIR, "screenshots");
const PORT = 4187;

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
    server.once("error", reject);
    server.listen(PORT, "127.0.0.1", () => resolve());
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
        floorResolved: Boolean(level?.floorResolved),
        visibleEnemies: visibleEnemies.map((actor) => ({
          id: actor.id,
          name: actor.name,
          hp: actor.hp,
          position: { x: actor.x, y: actor.y },
          roomIndex: actor.roomIndex || null
        })),
        totalMonsters: level?.actors.length || 0,
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
      const point = direction === "down" ? game.currentLevel.stairsDown : game.currentLevel.stairsUp;
      if (!point) {
        return { ok: false, reason: "missing_stairs", snapshot: snapshot("stairs-missing") };
      }
      const travel = await travelTo(point, { maxSteps: 220 });
      if (!travel.ok) {
        return travel;
      }
      game.useStairs(direction);
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
      const maxTurns = options.maxTurns || 120;
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
          maxSteps: 18
        });
        if (!travel.ok && travel.reason !== "arrived") {
          return { ok: false, reason: travel.reason, snapshot: snapshot("room-stalled") };
        }
      }

      return { ok: false, reason: "room_timeout", snapshot: snapshot("room-timeout") };
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
          return { ok: false, reason: cleared.reason, snapshot: snapshot("objective-room-failed") };
        }
      }

      const travel = await travelTo(objective.marker, {
        maxSteps: 220,
        healThreshold: 0.35
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

    window.__castlePlaytestHarness = {
      closeModalIfOpen,
      completeCurrentObjective,
      ensureRun,
      getPointsOfInterest,
      openService,
      revealCurrentLevel,
      resolveProgression,
      snapshot,
      useStairs
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
  const finalState = report.snapshots.at(-1);

  notes.push("Strengths");
  notes.push("- The board-first HUD reads quickly in motion. Health, threat, and objective framing stay visible without burying the board.");
  notes.push("- Town service screens are easy to parse once opened. The bank/meta layer is especially clear about what gold can do beyond shopping.");
  notes.push("- The floor objective gate gives the first dungeon level a stronger purpose than a simple stair rush.");
  notes.push("");
  notes.push("Friction");
  notes.push("- The first-time flow still benefits from out-of-band knowledge. The harness needed explicit routing to town stairs and service doors because those paths are not strongly signposted from the title or first board state.");
  notes.push("- The log is only visible inside modal surfaces, so real-time combat/context feedback is easy to miss during movement-heavy play.");
  if (objective && objectiveResult && !objectiveResult.floorResolved) {
    notes.push(`- In this run the first objective (${objective.label}) did not fully resolve under pressure, which suggests objective affordances or room-read clarity can still be tightened.`);
  } else {
    notes.push(`- The first objective (${objective?.label || "unknown"}) resolved, but it required assisted map visibility in the harness to cover the flow reliably. That points to exploration/search pacing still being the weak link for scripted or first-session testing.`);
  }
  notes.push("");
  notes.push("Run Notes");
  notes.push(`- Objective on depth 1: ${objective ? objective.label : "unknown"}`);
  notes.push(`- Final state: ${finalState?.location || "unknown"}, turn ${finalState?.turn ?? "?"}, HP ${finalState?.player ? `${Math.round(finalState.player.hp)}/${finalState.player.maxHp}` : "unknown"}`);
  notes.push(`- Assisted visibility was enabled after the first descent so the harness could cover objective/combat surfaces in one repeatable pass.`);
  return notes.join("\n");
}

async function main() {
  await mkdir(SCREENSHOT_DIR, { recursive: true });

  let server = null;
  let browser = null;
  const report = {
    generatedAt: new Date().toISOString(),
    url: `http://127.0.0.1:${PORT}/index.html`,
    snapshots: []
  };

  try {
    server = await createStaticServer(ROOT);
    browser = await launchBrowser();
    await waitForServer(report.url);

    const page = await browser.newPage({ viewport: { width: 1440, height: 1700 } });
    await page.goto(report.url, { waitUntil: "networkidle" });
    await page.waitForFunction(() => Boolean(window.castleOfTheWindsWeb));
    await installHarness(page);

    await page.evaluate(() => window.__castlePlaytestHarness.ensureRun({
      name: "Harness",
      race: "dwarf",
      className: "fighter",
      statBonuses: { str: 2, con: 4 }
    }));
    await takeSnapshot(page, report.snapshots, "town-start", "town-start.png");

    await page.evaluate(() => window.__castlePlaytestHarness.openService("bank"));
    await takeSnapshot(page, report.snapshots, "town-bank", "town-bank.png");
    await page.evaluate(() => window.__castlePlaytestHarness.closeModalIfOpen());

    await page.evaluate(() => window.__castlePlaytestHarness.useStairs("down"));
    await takeSnapshot(page, report.snapshots, "depth-1-entry", "depth-1-entry.png");

    await page.evaluate(() => window.__castlePlaytestHarness.revealCurrentLevel());
    await takeSnapshot(page, report.snapshots, "depth-1-revealed", "depth-1-revealed.png");

    await page.evaluate(() => window.__castlePlaytestHarness.completeCurrentObjective());
    await takeSnapshot(page, report.snapshots, "objective-result", "objective-result.png");

    if (report.snapshots.at(-1)?.floorResolved) {
      await page.evaluate(() => window.__castlePlaytestHarness.useStairs("up"));
      await takeSnapshot(page, report.snapshots, "town-return", "town-return.png");
    }

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
