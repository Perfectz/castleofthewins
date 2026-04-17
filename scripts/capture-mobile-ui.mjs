import { mkdir, readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const PORT = 4194;
const OUTPUT_DIR = path.join(ROOT, "artifacts", "playwright", "mobile-states");

const VIEWPORTS = [
  { width: 393, height: 852, slug: "393x852" },
  { width: 360, height: 800, slug: "360x800" }
];

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

async function setupRun(page) {
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    game.beginAdventure();
    game.render();
  });
  await page.waitForTimeout(500);
}

async function closeVisibleModal(page) {
  const closeButton = page.locator('[data-action="close-modal"]:visible').first();
  if (await closeButton.count()) {
    await closeButton.click();
  } else {
    await page.evaluate(() => {
      window.castleOfTheWindsWeb?.closeModal?.();
    });
  }
  await page.waitForTimeout(200);
}

async function captureHubStates(page, viewport) {
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    game.player.hp = Math.max(4, Math.floor(game.player.maxHp * 0.35));
    game.player.mana = Math.max(0, Math.floor(game.player.maxMana * 0.25));
    game.player.spellsKnown = Array.from(new Set([...(game.player.spellsKnown || []), "identify", "clairvoyance"]));
    if (game.player.equipment.body) {
      game.player.equipment.body.cursed = true;
      game.player.equipment.body.identified = true;
    }
    game.player.inventory.push(
      { id: "mysteryBlade", name: "Knight Sword", kind: "weapon", slot: "weapon", power: 6, value: 90, rarity: 4, weight: 6, enchantment: 0, cursed: false, identified: false },
      { id: "spentLightning", name: "Wand of Lightning", kind: "charged", effect: "lightning", charges: 0, maxCharges: 3, value: 88, rarity: 4, weight: 1, cursed: false, identified: true },
      { id: "bookIdentify", name: "Spellbook of Identify", kind: "spellbook", spell: "identify", value: 82, rarity: 4, weight: 1, cursed: false, identified: true },
      { id: "stoneIdol", name: "Stone Idol", kind: "junk", value: 18, rarity: 2, weight: 7, cursed: false, identified: true }
    );
    const healIndex = game.player.inventory.findIndex((item) => item.effect === "heal");
    game.activePackFilter = "all";
    game.showHubModal("pack", {
      selection: { type: "inventory", value: healIndex >= 0 ? healIndex : 0 }
    });
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUTPUT_DIR, `pack-hub-${viewport.slug}.png`), fullPage: true });
  await closeVisibleModal(page);

  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    const riskIndex = game.player.inventory.findIndex((item) => item.id === "mysteryBlade");
    game.activePackFilter = "all";
    game.showHubModal("pack", {
      selection: { type: "inventory", value: riskIndex >= 0 ? riskIndex : 0 }
    });
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUTPUT_DIR, `pack-risk-${viewport.slug}.png`), fullPage: true });
  await closeVisibleModal(page);

  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    const sellIndex = game.player.inventory.findIndex((item) => item.kind === "charged" || item.kind === "spellbook");
    game.pendingShop = { id: "guild", name: "Wizard's Guild" };
    game.activePackFilter = "sell";
    game.showHubModal("pack", {
      selection: { type: "inventory", value: sellIndex >= 0 ? sellIndex : 0 }
    });
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUTPUT_DIR, `pack-sell-${viewport.slug}.png`), fullPage: true });
  await closeVisibleModal(page);

  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    game.activePackFilter = "all";
    game.showHubModal("pack", {
      selection: { type: "slot", value: "body" }
    });
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUTPUT_DIR, `pack-cursed-slot-${viewport.slug}.png`), fullPage: true });
  await closeVisibleModal(page);

  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    game.player.spellsKnown = Array.from(new Set([...(game.player.spellsKnown || []), "magicMissile", "healMinor"]));
    game.showHubModal("magic");
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUTPUT_DIR, `magic-hub-${viewport.slug}.png`), fullPage: true });
  await closeVisibleModal(page);
}

async function descendToDungeon(page) {
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    if (game.currentDepth !== 0) {
      return;
    }
    game.placePlayerAt(game.currentLevel.stairsDown.x, game.currentLevel.stairsDown.y);
    game.useStairs("down");
    game.currentLevel.explored.fill(true);
    game.currentLevel.visible.fill(true);
    game.render();
  });
  await page.waitForTimeout(500);
}

async function stageVisibleThreat(page) {
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    const level = game.currentLevel;
    if (!level || level.actors.length === 0) {
      return;
    }

    const actor = level.actors[0];
    const dirs = [
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: -1, y: 1 },
      { x: 1, y: 1 }
    ];
    const candidate = dirs
      .map((dir) => ({ x: actor.x + dir.x, y: actor.y + dir.y }))
      .find((point) => {
        if (point.x < 0 || point.y < 0 || point.x >= level.width || point.y >= level.height) {
          return false;
        }
        const tile = level.tiles[point.y * level.width + point.x];
        return tile && tile.walkable && !level.actors.some((monster) => monster.x === point.x && monster.y === point.y);
      });

    if (!candidate) {
      return;
    }

    game.placePlayerAt(candidate.x, candidate.y);
    level.explored.fill(true);
    level.visible.fill(true);
    game.updateMonsterIntents();
    game.render();
  });
  await page.waitForTimeout(300);
}

async function stageObjectiveWing(page) {
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    const objective = game.currentLevel?.floorObjective;
    if (!objective?.marker) {
      return;
    }
    game.placePlayerAt(objective.marker.x, objective.marker.y);
    game.currentLevel.explored.fill(true);
    game.currentLevel.visible.fill(true);
    game.syncRouteGuideState?.();
    game.updateMonsterIntents();
    game.render();
  });
  await page.waitForTimeout(300);
}

async function stageResolvedFloor(page) {
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    const objective = game.currentLevel?.floorObjective;
    if (!objective?.marker) {
      return;
    }
    if (typeof objective.roomIndex === "number") {
      game.currentLevel.actors = game.currentLevel.actors.filter((monster) => monster.roomIndex !== objective.roomIndex);
    }
    game.placePlayerAt(objective.marker.x, objective.marker.y);
    if (!game.currentLevel.floorResolved) {
      if (objective.id === "recover_relic" || objective.id === "secure_supplies") {
        game.pickupHere(true, false);
      } else {
        game.interactHere();
      }
    }
    game.currentLevel.explored.fill(true);
    game.currentLevel.visible.fill(true);
    game.syncRouteGuideState?.();
    game.updateMonsterIntents();
    game.render();
  });
  await page.waitForTimeout(350);
}

async function stageHighPressureExtract(page) {
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    if (!game.currentLevel?.floorResolved) {
      return;
    }
    game.currentLevel.dangerScore = 12;
    game.currentLevel.dangerLevel = "Critical";
    game.currentLevel.dangerTone = "bad";
    game.currentLevel.reinforcementClock = 2;
    game.reinforcementClock = 2;
    if (game.currentLevel.stairsUp) {
      game.placePlayerAt(game.currentLevel.stairsUp.x, game.currentLevel.stairsUp.y);
    }
    game.syncRouteGuideState?.();
    game.updateMonsterIntents();
    game.render();
  });
  await page.waitForTimeout(250);
}

async function captureViewport(browser, baseUrl, viewport) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 2
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(() => Boolean(window.castleOfTheWindsWeb));
  await page.waitForTimeout(400);

  await page.screenshot({ path: path.join(OUTPUT_DIR, `title-${viewport.slug}.png`), fullPage: true });

  await setupRun(page);
  await page.screenshot({ path: path.join(OUTPUT_DIR, `town-start-${viewport.slug}.png`), fullPage: true });
  await captureHubStates(page, viewport);

  await page.click('[data-action="open-utility-menu"]');
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUTPUT_DIR, `menu-open-${viewport.slug}.png`), fullPage: true });
  await page.click('[data-action="close-modal"]');
  await page.waitForTimeout(250);

  await descendToDungeon(page);
  await page.screenshot({ path: path.join(OUTPUT_DIR, `dungeon-entry-${viewport.slug}.png`), fullPage: true });

  await stageObjectiveWing(page);
  await page.screenshot({ path: path.join(OUTPUT_DIR, `objective-wing-${viewport.slug}.png`), fullPage: true });

  await stageResolvedFloor(page);
  await page.screenshot({ path: path.join(OUTPUT_DIR, `resolved-floor-${viewport.slug}.png`), fullPage: true });

  await stageHighPressureExtract(page);
  await page.screenshot({ path: path.join(OUTPUT_DIR, `high-pressure-extract-${viewport.slug}.png`), fullPage: true });

  await stageVisibleThreat(page);
  await page.screenshot({ path: path.join(OUTPUT_DIR, `threat-state-${viewport.slug}.png`), fullPage: true });
  await page.locator("#action-bar").screenshot({ path: path.join(OUTPUT_DIR, `action-dock-${viewport.slug}.png`) });

  await page.close();
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const server = await createStaticServer(ROOT);
  let browser = null;

  try {
    browser = await chromium.launch({ headless: true });
    const baseUrl = `http://127.0.0.1:${PORT}/index.html`;

    for (const viewport of VIEWPORTS) {
      await captureViewport(browser, baseUrl, viewport);
    }

    console.log(OUTPUT_DIR);
  } finally {
    if (browser) {
      await browser.close();
    }
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
