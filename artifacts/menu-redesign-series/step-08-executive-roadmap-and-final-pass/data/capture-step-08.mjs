import { mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const STEP_ROOT = path.join(ROOT, "artifacts", "menu-redesign-series", "step-08-executive-roadmap-and-final-pass");
const DATA_DIR = path.join(STEP_ROOT, "data");
const PORT = 4325;
const stage = process.argv[2];

if (!["before", "after"].includes(stage)) {
  console.error("Usage: node capture-step-08.mjs <before|after>");
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
  ["run-menu", "Adventure Menu", "Capstone polish candidate on the support entry labels."],
  ["rules-flow", "Rules Reference", "The support deep-link that risks overlap with Field Guide naming."]
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
  await page.waitForTimeout(350);
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
  await page.waitForTimeout(450);
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    if (game.mode === "modal") {
      game.closeModal();
    }
    game.render();
  });
  await page.waitForTimeout(240);
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
  await page.waitForTimeout(520);
}

async function openUtilityMenu(page) {
  const alreadyOpen = await page.evaluate(() => window.castleOfTheWindsWeb?.modalSurfaceKey === "utility-menu");
  if (!alreadyOpen) {
    await page.click('[data-action="open-utility-menu"]');
    await page.waitForTimeout(140);
  }
}

async function stageFlow(page, id) {
  await enterDungeon(page);
  await openUtilityMenu(page);

  if (id === "run-menu") {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(80);
    return;
  }

  if (id === "rules-flow") {
    await page.click('[data-focus-key="utility:help"]');
    await page.waitForTimeout(160);
  }
}

async function collectFlowState(page) {
  return page.evaluate(() => ({
    mode: window.castleOfTheWindsWeb?.mode || null,
    modalSurfaceKey: window.castleOfTheWindsWeb?.modalSurfaceKey || null,
    activeHubTab: window.castleOfTheWindsWeb?.activeHubTab || null,
    activeJournalSection: window.castleOfTheWindsWeb?.activeJournalSection || null,
    title: document.querySelector(".modal-title")?.textContent?.trim() || null,
    helpButtonLabel: document.querySelector('[data-focus-key="utility:help"]')?.textContent?.trim() || null
  }));
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(DATA_DIR, { recursive: true });
  const server = await createStaticServer(ROOT);
  const browser = await chromium.launch({ headless: true });
  const captures = [];

  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.deviceScaleFactor
      });
      const page = await context.newPage();

      try {
        for (let index = 0; index < FLOWS.length; index += 1) {
          const [id, flowName, whyCaptured] = FLOWS[index];
          await stageFlow(page, id);
          const state = await collectFlowState(page);
          const filename = `${stage}-${viewport.key}-${String(index + 1).padStart(2, "0")}-${id}.png`;
          const outputPath = path.join(OUT_DIR, filename);
          await page.screenshot({ path: outputPath, fullPage: true });
          captures.push({
            filename,
            path: outputPath,
            viewport: `${viewport.width}x${viewport.height}`,
            viewportClass: viewport.key,
            flowName,
            whyCaptured,
            beforeAfter: stage,
            mode: state.mode,
            modalSurfaceKey: state.modalSurfaceKey,
            activeHubTab: state.activeHubTab,
            activeJournalSection: state.activeJournalSection,
            title: state.title,
            helpButtonLabel: state.helpButtonLabel
          });
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  const capturePath = path.join(DATA_DIR, `capture-${stage}.json`);
  await writeFile(capturePath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    captures
  }, null, 2));
  console.log(capturePath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
