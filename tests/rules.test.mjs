import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const URL = pathToFileURL(path.join(ROOT, "index.html")).href;

let browser;

async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForFunction(() => Boolean(window.castleOfTheWindsWeb));
  return page;
}

async function beginFreshRun(page, build = { race: "dwarf", classId: "fighter", name: "Rules" }) {
  await page.evaluate((buildState) => {
    const game = window.castleOfTheWindsWeb;
    game.selectedRace = buildState.race;
    game.selectedClass = buildState.classId;
    game.creationName = buildState.name;
    game.creationStatBonuses = { str: 2, dex: 0, con: 2, int: 0 };
    game.beginAdventure();
    for (let index = 0; index < 3 && game.mode === "modal"; index += 1) {
      game.closeModal();
    }
  }, build);
}

async function descendToDepthOne(page) {
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    game.placePlayerAt(game.currentLevel.stairsDown.x, game.currentLevel.stairsDown.y);
    game.useStairs("down");
  });
}

before(async () => {
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  if (browser) {
    await browser.close();
  }
});

test("depth-1 search extends guided route without revealing the whole map", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page);
    await descendToDepthOne(page);
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      const level = game.currentLevel;
      const route = level.guidance?.objectiveRoute || [];
      const exploredBefore = route.filter((point) => level.explored[point.y * level.width + point.x]).length;
      const tilesBefore = level.explored.filter(Boolean).length;
      game.performSearch();
      const exploredAfter = route.filter((point) => level.explored[point.y * level.width + point.x]).length;
      const tilesAfter = level.explored.filter(Boolean).length;
      return {
        routeLength: route.length,
        exploredBefore,
        exploredAfter,
        tilesBefore,
        tilesAfter,
        totalTiles: level.width * level.height
      };
    });
    assert.ok(result.routeLength > 0, "depth 1 should have a guided objective route");
    assert.ok(result.exploredAfter > result.exploredBefore, "search should reveal more of the route");
    assert.ok(result.tilesAfter > result.tilesBefore, "search should reveal more tiles");
    assert.ok(result.tilesAfter < result.totalTiles, "search should not reveal the full map");
  } finally {
    await page.close();
  }
});

test("depth-1 objective and optional rooms do not overlap or touch", async () => {
  const page = await openPage();
  try {
    const result = await page.evaluate(() => {
      const overlaps = [];
      const touches = (left, right) => !(
        left.x + left.w + 1 < right.x
        || right.x + right.w + 1 < left.x
        || left.y + left.h + 1 < right.y
        || right.y + right.h + 1 < left.y
      );
      for (let run = 0; run < 10; run += 1) {
        const game = window.castleOfTheWindsWeb;
        game.selectedRace = "dwarf";
        game.selectedClass = "fighter";
        game.creationName = `Rules-${run}`;
        game.creationStatBonuses = { str: 2, dex: 0, con: 2, int: 0 };
        game.beginAdventure();
        const level = game.levels[1];
        const objectiveRoom = level.rooms[level.floorObjective.roomIndex];
        const optionalRoom = level.floorOptional ? level.rooms[level.floorOptional.roomIndex] : null;
        if (objectiveRoom && optionalRoom && touches(objectiveRoom, optionalRoom)) {
          overlaps.push({
            run,
            objectiveRoom,
            optionalRoom
          });
        }
      }
      return overlaps;
    });
    assert.equal(result.length, 0, `found overlapping/touching directive rooms: ${JSON.stringify(result)}`);
  } finally {
    await page.close();
  }
});

test("onboarding flags advance through keep entry, objective discovery, and objective clear", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page);
    await descendToDepthOne(page);
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      const objective = game.currentLevel.floorObjective;
      let resolved = false;
      if (objective.id === "recover_relic" || objective.id === "secure_supplies") {
        const item = game.currentLevel.items.find((entry) => entry.objectiveId === objective.id);
        game.placePlayerAt(item.x, item.y);
        game.pickupHere(true, false);
        if (game.pendingPickupPrompt) {
          game.confirmPendingPickup(false);
        }
        resolved = Boolean(game.currentLevel.floorResolved);
      } else {
        game.currentLevel.actors = game.currentLevel.actors.filter((actor) => actor.roomIndex !== objective.roomIndex);
        game.placePlayerAt(objective.marker.x, objective.marker.y);
        const tile = game.currentLevel.tiles[objective.marker.y * game.currentLevel.width + objective.marker.x];
        game.handleTileEntry(tile);
        if (!game.currentLevel.floorResolved) {
          game.interactHere();
        }
        resolved = Boolean(game.currentLevel.floorResolved);
      }
      return {
        resolved,
        enterKeep: Boolean(game.storyFlags.onboarding_enter_keep),
        findObjective: Boolean(game.storyFlags.onboarding_find_objective),
        clearObjective: Boolean(game.storyFlags.onboarding_clear_objective)
      };
    });
    assert.equal(result.enterKeep, true);
    assert.equal(result.findObjective, true);
    assert.equal(result.clearObjective, true);
    assert.equal(result.resolved, true);
  } finally {
    await page.close();
  }
});

test("live feed keeps three prioritized lines and does not pin low-value misses to the top", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page);
    await descendToDepthOne(page);
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      game.messages.push(
        { turn: game.turn, tone: "", message: "You miss." },
        { turn: game.turn, tone: "warning", message: "Reinforcements in 2 turns." },
        { turn: game.turn, tone: "good", message: "Objective complete. The floor is now yours to cash out or greed." }
      );
      game.renderEventTicker();
      return [...document.querySelectorAll("#event-ticker .event-ticker-line .event-ticker-text")]
        .slice(0, 3)
        .map((entry) => entry.textContent?.trim() || "");
    });
    assert.equal(result.length, 3);
    assert.notEqual(result[0], "You miss.");
    assert.ok(result.some((line) => /Objective complete|Reinforcements/i.test(line)), `unexpected feed lines: ${JSON.stringify(result)}`);
  } finally {
    await page.close();
  }
});

test("save migration resets dungeon explored state and guided reveal progress", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page);
    await descendToDepthOne(page);
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      game.levels.forEach((level) => {
        if (level.kind !== "dungeon") {
          return;
        }
        level.explored = level.explored.map(() => true);
        level.visible = level.visible.map(() => true);
        if (level.guidance) {
          level.guidance.revealedRouteSteps = level.guidance.objectiveRoute?.length || 0;
          level.guidance.entryReconApplied = true;
        }
      });
      game.saveGame({ silent: true });
      const saveKey = Object.keys(localStorage).find((key) => {
        try {
          return Boolean(JSON.parse(localStorage.getItem(key) || "null")?.levels);
        } catch {
          return false;
        }
      });
      const snapshot = JSON.parse(localStorage.getItem(saveKey));
      snapshot.saveFormatVersion = 5;
      localStorage.setItem(saveKey, JSON.stringify(snapshot));
      game.loadGame();
      return {
        exploredCount: game.currentLevel.explored.filter(Boolean).length,
        totalTiles: game.currentLevel.width * game.currentLevel.height,
        revealedRouteSteps: game.currentLevel.guidance?.revealedRouteSteps || 0,
        entryReconApplied: Boolean(game.currentLevel.guidance?.entryReconApplied)
      };
    });
    assert.ok(result.exploredCount < result.totalTiles / 3, `migration should clear most exploration state, got ${result.exploredCount}/${result.totalTiles}`);
    assert.equal(result.revealedRouteSteps, 0);
    assert.equal(result.entryReconApplied, false);
  } finally {
    await page.close();
  }
});
