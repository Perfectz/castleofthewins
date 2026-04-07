import { mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const STEP_ROOT = path.join(ROOT, "artifacts", "menu-redesign-series", "step-00-baseline-menu-atlas");
const BEFORE_DIR = path.join(STEP_ROOT, "screenshots", "before");
const DATA_DIR = path.join(STEP_ROOT, "data");
const PORT = 4310;

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

const VIEWPORTS = [
  { key: "mobile", width: 430, height: 932, deviceScaleFactor: 2 },
  { key: "desktop", width: 1440, height: 1200, deviceScaleFactor: 1 }
];

const SCREENS = [
  ["title", "Title screen", "Fresh page load with no interaction.", "Baseline for first-impression composition, hierarchy, and call-to-action prominence."],
  ["load-empty", "Load screen empty state", "From title screen, open the load flow with no prior save data.", "Documents the first empty-state branch a player can hit before starting a run."],
  ["creation", "Character creation", "From title screen, open New Adventurer without altering the draft first.", "Captures the first high-density decision screen before play begins."],
  ["town", "Town overview", "Begin a new run from the creation screen and allow the town state to settle.", "Shows the first in-world HUD state, advisor language, ticker placement, and top-level navigation load."],
  ["bank", "Town service: Bank", "From town, open the bank service modal through the live runtime.", "Captures persistence and progression framing inside the town loop."],
  ["provisioner", "Town service: Provisioner", "From town, open the general store service modal through the live runtime.", "Documents the consumables and supplies shopping surface."],
  ["armory", "Town service: Armory", "From town, open the armory service modal through the live runtime.", "Captures equipment shopping density and comparison layout."],
  ["guild", "Town service: Wizard's Guild", "From town, open the guild service modal through the live runtime.", "Captures a text-heavy town service with magical inventory and training cues."],
  ["temple", "Town service: Temple", "From town, open the temple service modal through the live runtime.", "Documents the restorative service layout and spiritual support framing."],
  ["sage", "Town service: Sage's Tower", "From town, open the sage service modal through the live runtime.", "Captures the identification and information-driven service screen."],
  ["junk", "Town service: Junk Shop", "From town, open the junk shop service modal through the live runtime.", "Captures the lower-prestige sell loop and secondary economy surface."],
  ["dungeon-hud", "First in-run HUD state", "From town, move directly to the down stairs and descend once into the first dungeon floor.", "Establishes the baseline dungeon HUD balance before any redesign discussion."],
  ["run-menu", "Run menu", "From the first dungeon floor, open the utility menu modal.", "Documents the primary utility stack and its action density mid-run."],
  ["pack", "Inventory and equipment", "From the first dungeon floor, open the pack hub modal.", "Captures the pack and equipment hub in a reachable early-run state."],
  ["magic", "Magic and spells", "From the first dungeon floor, add representative spells to the live run state and open the magic hub modal.", "Documents the spell management surface with minimal staging so the screen is populated."],
  ["journal", "Journal", "From the first dungeon floor, open the journal hub modal.", "Shows how guidance, goals, and persistent documentation are surfaced."],
  ["settings", "Settings", "From the first dungeon floor, open the settings modal.", "Captures the systems-level configuration screen in the same baseline pass."],
  ["help", "Help", "From the first dungeon floor, open the help modal.", "Shows how onboarding and reference information are presented after the title screen."],
  ["character", "Character sheet", "From the first dungeon floor, open the character sheet modal.", "Captures the mid-run stats and progression readout separate from inventory and journal."],
  ["briefing", "Briefing", "From the first dungeon floor, open the briefing modal.", "Documents the advisor and mission framing surface that sits outside the journal."],
  ["level-up", "Level up perk choice", "From the first dungeon floor, stage enough experience for a level up and trigger the live progression modal.", "Captures a progression-only modal that does not appear in the town or utility loop."],
  ["spell-study", "Spell study", "From the first dungeon floor, stage a spell-learning choice and trigger the live progression modal.", "Documents the follow-on progression surface for learning spells."],
  ["death", "Death recap", "From the first dungeon floor, force a run death through the live game flow with staging-only context.", "Captures the fail-state messaging and recovery framing."]
];

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

async function loadTitle(page) {
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => Boolean(window.castleOfTheWindsWeb));
  await page.waitForTimeout(400);
}

async function startRun(page) {
  await loadTitle(page);
  await page.click('[data-action="new-game"]');
  await page.waitForSelector('[data-action="begin-adventure"]');
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    game.selectedRace = "dwarf";
    game.selectedClass = "fighter";
    game.creationName = "Atlas";
    game.creationStatBonuses = { str: 2, dex: 0, con: 4, int: 0 };
    game.render();
  });
  await page.click('[data-action="begin-adventure"]');
  await page.waitForFunction(() => {
    const game = window.castleOfTheWindsWeb;
    return game?.mode === "game" || game?.mode === "modal";
  });
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    if (game.mode === "modal") {
      game.closeModal();
    }
    game.render();
  });
  await page.waitForTimeout(400);
}

async function enterDungeon(page) {
  await startRun(page);
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    game.placePlayerAt(game.currentLevel.stairsDown.x, game.currentLevel.stairsDown.y);
    game.useStairs("down");
    if (game.mode === "modal") {
      game.closeModal();
    }
    game.render();
  });
  await page.waitForTimeout(500);
}

async function stageScreen(page, id) {
  if (id === "title") {
    await loadTitle(page);
    return;
  }
  if (id === "load-empty") {
    await loadTitle(page);
    await page.evaluate(() => window.castleOfTheWindsWeb.showSaveSlotsModal());
    await page.waitForTimeout(250);
    return;
  }
  if (id === "creation") {
    await loadTitle(page);
    await page.click('[data-action="new-game"]');
    await page.waitForSelector('[data-action="begin-adventure"]');
    await page.waitForTimeout(250);
    return;
  }
  if (["town", "bank", "provisioner", "armory", "guild", "temple", "sage", "junk"].includes(id)) {
    await startRun(page);
    if (id !== "town") {
      const map = {
        bank: "bank",
        provisioner: "general",
        armory: "armory",
        guild: "guild",
        temple: "temple",
        sage: "sage",
        junk: "junk"
      };
      await page.evaluate((serviceId) => window.castleOfTheWindsWeb.openTownService(serviceId), map[id]);
      await page.waitForTimeout(250);
    }
    return;
  }
  await enterDungeon(page);
  if (id === "run-menu") {
    await page.click('[data-action="open-utility-menu"]');
    await page.waitForTimeout(250);
    return;
  }
  if (id === "pack") {
    await page.evaluate(() => window.castleOfTheWindsWeb.showHubModal("pack"));
    await page.waitForTimeout(250);
    return;
  }
  if (id === "magic") {
    await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      game.player.spellsKnown = Array.from(new Set([...(game.player.spellsKnown || []), "magicMissile", "healMinor", "identify"]));
      game.render();
      game.showHubModal("magic");
    });
    await page.waitForTimeout(250);
    return;
  }
  if (id === "journal") {
    await page.evaluate(() => window.castleOfTheWindsWeb.showHubModal("journal"));
    await page.waitForTimeout(250);
    return;
  }
  if (id === "settings") {
    await page.evaluate(() => window.castleOfTheWindsWeb.showSettingsModal());
    await page.waitForTimeout(250);
    return;
  }
  if (id === "help") {
    await page.evaluate(() => window.castleOfTheWindsWeb.showHelpModal());
    await page.waitForTimeout(250);
    return;
  }
  if (id === "character") {
    await page.evaluate(() => window.castleOfTheWindsWeb.showCharacterSheet());
    await page.waitForTimeout(250);
    return;
  }
  if (id === "briefing") {
    await page.evaluate(() => window.castleOfTheWindsWeb.showBriefingModal());
    await page.waitForTimeout(250);
    return;
  }
  if (id === "level-up") {
    await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      game.player.exp = game.player.nextLevelExp;
      game.checkLevelUp();
    });
    await page.waitForTimeout(250);
    return;
  }
  if (id === "spell-study") {
    await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      game.pendingPerkChoices = 0;
      game.pendingRewardQueue = [];
      game.pendingSpellChoices = 1;
      game.showNextProgressionModal();
    });
    await page.waitForTimeout(250);
    return;
  }
  if (id === "death") {
    await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      game.deathContext = {
        cause: "Atlas staging",
        lastHitBy: "Atlas staging",
        dangerLevel: game.currentLevel?.dangerLevel || "Low"
      };
      game.player.hp = 0;
      game.handleDeath();
    });
    await page.waitForTimeout(250);
  }
}

async function collectState(page) {
  return await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    return {
      mode: game?.mode || "",
      depth: game?.currentDepth ?? null,
      levelKind: game?.currentLevel?.kind || null,
      modalTitle: document.querySelector(".modal-title")?.textContent?.trim() || null,
      advisor: document.getElementById("advisor-strip")?.innerText?.trim() || "",
      ticker: Array.from(document.querySelectorAll("#event-ticker .event-ticker-text"))
        .slice(0, 3)
        .map((entry) => entry.textContent?.trim() || "")
        .filter(Boolean)
    };
  });
}

function filenameFor(viewportKey, order, id) {
  return `${viewportKey}-${String(order).padStart(2, "0")}-${id}.png`;
}

async function captureViewport(browser, viewport) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor
  });

  const rows = [];
  try {
    for (const [index, screen] of SCREENS.entries()) {
      const [id, screenName, howReached, whyCaptured] = screen;
      const order = index + 1;
      await stageScreen(page, id);
      const filename = filenameFor(viewport.key, order, id);
      const fullPath = path.join(BEFORE_DIR, filename);
      await page.screenshot({ path: fullPath, fullPage: true });
      const state = await collectState(page);
      rows.push({
        filename,
        path: fullPath,
        viewport: `${viewport.width}x${viewport.height}`,
        viewportClass: viewport.key,
        screenName,
        howReached,
        whyCaptured,
        beforeAfter: "before",
        modalTitle: state.modalTitle,
        mode: state.mode,
        depth: state.depth,
        levelKind: state.levelKind,
        advisor: state.advisor,
        ticker: state.ticker
      });
    }
  } finally {
    await page.close();
  }
  return rows;
}

async function main() {
  await mkdir(BEFORE_DIR, { recursive: true });
  await mkdir(DATA_DIR, { recursive: true });

  const server = await createStaticServer(ROOT);
  let browser = null;

  try {
    browser = await chromium.launch({ headless: true });
    const captures = [];
    for (const viewport of VIEWPORTS) {
      captures.push(...await captureViewport(browser, viewport));
    }
    const payload = {
      generatedAt: new Date().toISOString(),
      captures
    };
    await writeFile(path.join(DATA_DIR, "capture-results.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log(path.join(DATA_DIR, "capture-results.json"));
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
