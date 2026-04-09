import { mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const STEP = path.join(ROOT, "artifacts", "progression-series", "step-02-current-progression-audit");
const DATA = path.join(STEP, "data");
const PORT = 4210;
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
    "Journal captures are staged on the first dungeon floor with visibility forced on so reward-preview copy is readable in one frame.",
    "Perk and relic choice modals are staged from the live runtime using representative option sets tied to the audit changes.",
    "The same capture script is run once before the fixes and once after the fixes."
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
    game.creationName = "Audit Rogue";
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

async function stageJournal(page) {
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    game.currentLevel.explored.fill(true);
    game.currentLevel.visible.fill(true);
    if (game.currentLevel.floorObjective) {
      game.currentLevel.floorObjective.id = "secure_supplies";
      game.currentLevel.floorObjective.label = "Recover The Cache";
      game.currentLevel.floorObjective.shortLabel = "Recover Cache";
      game.currentLevel.floorObjective.rewardType = "boon";
    }
    game.player.perks = ["quick_hands"];
    game.player.relics = ["greedy_purse"];
    game.showHubModal("journal", { journalSection: "current" });
  });
  await page.waitForTimeout(250);
}

async function stagePerkChoice(page) {
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    game.closeModal?.();
    game.mode = "game";
    game.pendingRewardChoice = {
      type: "perk",
      source: "level",
      options: ["quick_hands", "trap_sense", "evasion"]
    };
    game.showRewardChoiceModal(game.pendingRewardChoice);
  });
  await page.waitForTimeout(250);
}

async function stageRelicChoice(page) {
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    game.closeModal?.();
    game.mode = "game";
    game.pendingRewardChoice = {
      type: "relic",
      source: "objective",
      options: ["greedy_purse", "survivor_talisman", "hunter_map"]
    };
    game.showRewardChoiceModal(game.pendingRewardChoice);
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

  await stageJournal(page);
  await shot(page, `${view.id}-01-journal-reward-preview.png`, {
    viewport: view.id,
    screen: "Journal reward preview",
    howReached: "Started a rogue run, descended once, and opened the live journal current section.",
    whyCaptured: "Captures how clearly the current run build panel forecasts floor rewards."
  });

  await stagePerkChoice(page);
  await shot(page, `${view.id}-02-quick-hands-perk.png`, {
    viewport: view.id,
    screen: "Quick Hands perk choice",
    howReached: "Opened a staged live perk draft containing Quick Hands.",
    whyCaptured: "Shows whether the perk communicates a real, differentiated progression payoff."
  });

  await stageRelicChoice(page);
  await shot(page, `${view.id}-03-greedy-purse-relic.png`, {
    viewport: view.id,
    screen: "Greedy Purse relic choice",
    howReached: "Opened a staged live relic draft containing Greedy Purse.",
    whyCaptured: "Shows whether the relic communicates an actual economy-versus-pressure tradeoff."
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
