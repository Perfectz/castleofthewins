import { mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const STEP = path.join(ROOT, "artifacts", "progression-series", "step-03-spell-system-deep-dive");
const DATA = path.join(STEP, "data");
const PORT = 4212;
const MODE = process.argv.includes("--after") ? "after" : "before";
const TARGET = path.join(STEP, "screenshots", MODE);
const VIEWS = [
  { id: "mobile", width: 430, height: 932, scale: 2 },
  { id: "desktop", width: 1440, height: 1200, scale: 1 }
];
const TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8"
};

const report = {
  generatedAt: new Date().toISOString(),
  mode: MODE,
  screenshots: [],
  stagingNotes: [
    "Spell Study is staged on a level-4 rogue so the draft includes a mix of newly unlocked and previously skipped utility and control spells.",
    "Magic Book and Field Tray are staged with a utility-heavy mixed book so spell descriptions, role labels, and targeting language are visible in one frame.",
    "The same script is run before and after the spell-focused improvements."
  ]
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function mime(filePath) {
  return TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

async function server(rootDir) {
  const instance = http.createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, "http://127.0.0.1").pathname;
      const rel = pathname === "/" ? "index.html" : decodeURIComponent(pathname.replace(/^\/+/, ""));
      const target = path.resolve(rootDir, rel);
      const safe = path.relative(rootDir, target);
      if (safe.startsWith("..") || path.isAbsolute(safe)) {
        res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Forbidden");
        return;
      }
      const body = await readFile(target);
      res.writeHead(200, { "Content-Type": mime(target) });
      res.end(body);
    } catch (error) {
      res.writeHead(error?.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(error?.code === "ENOENT" ? "Not found" : "Server error");
    }
  });
  await new Promise((resolve, reject) => {
    instance.once("error", reject);
    instance.listen(PORT, "127.0.0.1", () => resolve());
  });
  return instance;
}

async function waitFor(url) {
  for (let i = 0; i < 40; i += 1) {
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

async function browser() {
  for (const options of [{ headless: true }, { channel: "msedge", headless: true }, { channel: "chrome", headless: true }]) {
    try {
      return await chromium.launch(options);
    } catch {}
  }
  throw new Error("Unable to launch Chromium.");
}

async function shot(page, name, meta) {
  const rel = path.join("screenshots", MODE, name).replace(/\\/g, "/");
  await page.screenshot({ path: path.join(STEP, rel), fullPage: true });
  report.screenshots.push({ filename: name, path: rel, ...meta });
}

async function ready(page) {
  await page.waitForFunction(() => Boolean(window.castleOfTheWindsWeb));
  await page.waitForTimeout(250);
}

async function openCreation(page) {
  await page.click('[data-action="new-game"]');
  await page.waitForSelector('[data-action="begin-adventure"]');
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    game.selectedRace = "human";
    game.selectedClass = "rogue";
    game.creationName = "Spell Audit";
    game.creationStatBonuses = { str: 1, dex: 3, con: 1, int: 1 };
    game.showCreationModal();
  });
  await page.waitForTimeout(200);
}

async function begin(page) {
  await page.click('[data-action="begin-adventure"]');
  await page.waitForFunction(() => {
    const game = window.castleOfTheWindsWeb;
    return game?.mode === "game" || game?.mode === "modal";
  });
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    if (game?.mode === "modal") {
      game.closeModal?.();
    }
    game.render?.();
  });
  await page.waitForTimeout(300);
}

async function descend(page) {
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    if (game.currentDepth === 0) {
      game.placePlayerAt(game.currentLevel.stairsDown.x, game.currentLevel.stairsDown.y);
      game.useStairs("down");
    }
    game.currentLevel.explored.fill(true);
    game.currentLevel.visible.fill(true);
    game.render();
  });
  await page.waitForTimeout(350);
}

async function stageSpellStudy(page) {
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    game.closeModal?.();
    game.player.className = "Rogue";
    game.player.level = 4;
    game.player.spellsKnown = ["magicMissile"];
    game.player.spellTrayIds = ["magicMissile"];
    game.syncPlayerSpellTray(game.player);
    game.pendingSpellChoices = 1;
    game.showSpellLearnModal();
  });
  await page.waitForTimeout(250);
}

async function stageMagicBook(page) {
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    game.closeModal?.();
    game.player.spellsKnown = [
      "magicMissile",
      "light",
      "detectTraps",
      "identify",
      "phaseDoor",
      "slowMonster",
      "shield",
      "clairvoyance"
    ];
    game.player.spellTrayIds = ["magicMissile", "light", "detectTraps", "phaseDoor"];
    game.syncPlayerSpellTray(game.player);
    game.pendingSpell = "light";
    game.showHubModal("magic");
  });
  await page.waitForTimeout(250);
}

async function stageSpellTray(page) {
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    game.closeModal?.();
    game.player.spellsKnown = [
      "magicMissile",
      "light",
      "detectTraps",
      "phaseDoor"
    ];
    game.player.spellTrayIds = ["magicMissile", "light", "detectTraps", "phaseDoor"];
    game.syncPlayerSpellTray(game.player);
    game.pendingSpell = "light";
    game.openSpellTray();
    game.render();
  });
  await page.waitForTimeout(250);
}

async function captureView(runBrowser, baseUrl, view) {
  const context = await runBrowser.newContext({
    viewport: { width: view.width, height: view.height },
    deviceScaleFactor: view.scale
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/index.html`, { waitUntil: "networkidle" });
  await ready(page);

  await openCreation(page);
  await begin(page);
  await descend(page);

  await stageSpellStudy(page);
  await shot(page, `${view.id}-01-spell-study.png`, {
    viewport: view.id,
    screen: "Spell Study",
    howReached: "Started a rogue run, descended once, and staged a level-4 spell-study draft.",
    whyCaptured: "Shows spell acquisition pacing, taxonomy, and how much mechanical meaning the draft cards carry."
  });

  await stageMagicBook(page);
  await shot(page, `${view.id}-02-magic-book.png`, {
    viewport: view.id,
    screen: "Magic Book",
    howReached: "Opened the live magic hub with a utility-heavy mixed spellbook and Light selected.",
    whyCaptured: "Shows how clearly the spell system communicates role, targeting, and long-term usefulness."
  });

  await stageSpellTray(page);
  await shot(page, `${view.id}-03-field-tray.png`, {
    viewport: view.id,
    screen: "Field Tray",
    howReached: "Opened the live spell tray with Light selected.",
    whyCaptured: "Shows the in-run casting summary and whether field-facing spell language supports fast tactical use."
  });

  await context.close();
}

async function main() {
  await mkdir(TARGET, { recursive: true });
  await mkdir(DATA, { recursive: true });
  const appServer = await server(ROOT);
  try {
    await waitFor(`http://127.0.0.1:${PORT}/index.html`);
    const runBrowser = await browser();
    try {
      for (const view of VIEWS) {
        await captureView(runBrowser, `http://127.0.0.1:${PORT}`, view);
      }
    } finally {
      await runBrowser.close();
    }
    const output = path.join(DATA, `capture-results-${MODE}.json`);
    await writeFile(output, JSON.stringify(report, null, 2));
    console.log(`Saved ${report.screenshots.length} screenshots to ${TARGET}`);
  } finally {
    await new Promise((resolve, reject) => appServer.close((error) => (error ? reject(error) : resolve())));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
