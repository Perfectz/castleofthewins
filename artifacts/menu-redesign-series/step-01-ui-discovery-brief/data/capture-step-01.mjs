import { mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const STEP_ROOT = path.join(ROOT, "artifacts", "menu-redesign-series", "step-01-ui-discovery-brief");
const DATA_DIR = path.join(STEP_ROOT, "data");
const PORT = 4313;

const stage = process.argv[2];

if (!["before", "after"].includes(stage)) {
  console.error("Usage: node capture-step-01.mjs <before|after>");
  process.exit(1);
}

const OUT_DIR = path.join(STEP_ROOT, "screenshots", stage);

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

const FLOWS = [
  ["title", "Title", "First-time and returning-player entry point."],
  ["creation", "Creation", "Onboarding and early commitment screen."],
  ["town", "Town", "First in-world orientation and menu entry-point context."],
  ["run-menu", "In-run menu", "Primary system hub for save, goal review, and support actions."],
  ["pack", "Pack", "Inventory and equipment management baseline."],
  ["magic", "Magic", "Spell management and scanability baseline."],
  ["journal", "Journal", "Goal, story, and run-history baseline."],
  ["help", "Help", "Reference and onboarding support surface."],
  ["settings", "Settings", "Device and comfort-settings surface."]
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
    game.creationName = "Morgan";
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
  await page.waitForTimeout(450);
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

async function stageFlow(page, id) {
  if (id === "title") {
    await loadTitle(page);
    return;
  }
  if (id === "creation") {
    await loadTitle(page);
    await page.click('[data-action="new-game"]');
    await page.waitForSelector('[data-action="begin-adventure"]');
    await page.waitForTimeout(250);
    return;
  }
  if (id === "town") {
    await startRun(page);
    return;
  }

  await enterDungeon(page);

  if (id === "run-menu") {
    await page.click('[data-action="open-utility-menu"]');
  } else if (id === "pack") {
    await page.evaluate(() => window.castleOfTheWindsWeb.showHubModal("pack"));
  } else if (id === "magic") {
    await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      game.player.spellsKnown = Array.from(new Set([...(game.player.spellsKnown || []), "magicMissile", "healMinor", "identify"]));
      game.render();
      game.showHubModal("magic");
    });
  } else if (id === "journal") {
    await page.evaluate(() => window.castleOfTheWindsWeb.showHubModal("journal"));
  } else if (id === "help") {
    await page.evaluate(() => window.castleOfTheWindsWeb.showHelpModal());
  } else if (id === "settings") {
    await page.evaluate(() => window.castleOfTheWindsWeb.showSettingsModal());
  }
  await page.waitForTimeout(250);
}

async function captureState(page) {
  return await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    return {
      mode: game?.mode || "",
      depth: game?.currentDepth ?? null,
      levelKind: game?.currentLevel?.kind || null,
      modalTitle: document.querySelector(".modal-title")?.textContent?.trim() || null
    };
  });
}

async function captureViewport(browser, viewport) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor
  });
  const rows = [];
  try {
    for (const [order, flow] of FLOWS.entries()) {
      const [id, flowName, whyCaptured] = flow;
      await stageFlow(page, id);
      const filename = `${stage}-${viewport.key}-${String(order + 1).padStart(2, "0")}-${id}.png`;
      const fullPath = path.join(OUT_DIR, filename);
      await page.screenshot({ path: fullPath, fullPage: true });
      const state = await captureState(page);
      rows.push({
        filename,
        path: fullPath,
        viewport: `${viewport.width}x${viewport.height}`,
        viewportClass: viewport.key,
        flowName,
        whyCaptured,
        beforeAfter: stage,
        modalTitle: state.modalTitle,
        mode: state.mode,
        depth: state.depth,
        levelKind: state.levelKind
      });
    }
  } finally {
    await page.close();
  }
  return rows;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(DATA_DIR, { recursive: true });

  const server = await createStaticServer(ROOT);
  let browser = null;

  try {
    browser = await chromium.launch({ headless: true });
    const captures = [];
    for (const viewport of VIEWPORTS) {
      captures.push(...await captureViewport(browser, viewport));
    }
    await writeFile(
      path.join(DATA_DIR, `capture-${stage}.json`),
      `${JSON.stringify({ generatedAt: new Date().toISOString(), captures }, null, 2)}\n`,
      "utf8"
    );
    console.log(path.join(DATA_DIR, `capture-${stage}.json`));
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
