import { mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const STEP_ROOT = path.join(ROOT, "artifacts", "menu-redesign-series", "step-09-new-game-screen-simplification");
const DATA_DIR = path.join(STEP_ROOT, "data");
const PORT = 4326;
const stage = process.argv[2];

if (!["before", "after"].includes(stage)) {
  console.error("Usage: node capture-step-09.mjs <before|after>");
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
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".gif": "image/gif"
};

const VIEWPORTS = [
  { key: "mobile", width: 430, height: 932, deviceScaleFactor: 2 },
  { key: "desktop", width: 1440, height: 1200, deviceScaleFactor: 1 }
];

const FLOWS = [
  ["transition", "Title To Creation", "Creation screen immediately after entering from title."],
  ["default", "Creation Default", "Default creation state with no secondary reveal expanded."],
  ["race-change", "Race Change", "Creation state after selecting a different race."],
  ["class-change", "Class Change", "Creation state after selecting a different class."],
  ["legacy", "Legacy And Contracts", "Creation preview with meta or legacy details visible."],
  ["cta", "CTA Readability", "Bottom-of-screen primary action readability and reachability."]
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

async function openCreation(page) {
  await loadTitle(page);
  await page.click('[data-action="new-game"]');
  await page.waitForSelector('[data-action="begin-adventure"]');
  await page.waitForTimeout(220);
}

async function stageFlow(page, id) {
  await openCreation(page);

  if (id === "race-change") {
    await page.click('[data-race="elf"]');
    await page.waitForTimeout(180);
    return;
  }

  if (id === "class-change") {
    await page.click('[data-class="rogue"]');
    await page.waitForTimeout(180);
    return;
  }

  if (id === "legacy") {
    const toggle = page.locator('[data-action="creation-toggle-legacy"]');
    if (await toggle.count()) {
      await toggle.click();
    } else {
      const legacyBlock = page.locator('.creation-preview .section-block').first();
      if (await legacyBlock.count()) {
        await legacyBlock.scrollIntoViewIfNeeded();
      }
    }
    await page.waitForTimeout(180);
    return;
  }

  if (id === "cta") {
    await page.evaluate(() => {
      const modal = document.querySelector(".creation-sheet");
      if (modal) {
        modal.scrollTop = modal.scrollHeight;
      }
    });
    await page.waitForTimeout(180);
  }
}

async function collectFlowState(page) {
  return page.evaluate(() => ({
    mode: window.castleOfTheWindsWeb?.mode || null,
    modalSurfaceKey: window.castleOfTheWindsWeb?.modalSurfaceKey || null,
    title: document.querySelector(".modal-title")?.textContent?.trim() || null,
    legacyExpanded: window.castleOfTheWindsWeb?.creationLegacyExpanded || false
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
            title: state.title,
            legacyExpanded: state.legacyExpanded
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
