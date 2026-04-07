import { mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const STEP_ROOT = path.join(ROOT, "artifacts", "menu-redesign-series", "step-05-responsiveness-review");
const DATA_DIR = path.join(STEP_ROOT, "data");
const PORT = 4322;

const stage = process.argv[2];

if (!["before", "after"].includes(stage)) {
  console.error("Usage: node capture-step-05.mjs <before|after>");
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
  ["run-menu", "Adventure Menu", "Menu open behavior and visible focus target."],
  ["pack", "Pack", "Active inventory selection confidence in the densest list."],
  ["magic", "Magic", "Active spell selection confidence in book view."],
  ["spell-tray", "Spell Tray", "Field tray selection confidence and quick-cast readability."],
  ["spell-targeting", "Spell Targeting", "Spell handoff plus confirm/cancel clarity."],
  ["reward-choice", "Reward Choice", "Reward focus and high-stakes choice readability if reachable."],
  ["blocked-state", "Blocked State", "Disabled or full-tray action feedback."],
  ["settings", "Device Settings", "Focus visibility and toggle confidence in utility controls."]
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
  await page.waitForTimeout(600);
}

async function seedMagic(page, options = {}) {
  const {
    selectedSpell = "magicMissile",
    trayIds = ["magicMissile", "healMinor", "identify"],
    knownSpells = ["magicMissile", "healMinor", "identify", "shield"]
  } = options;
  await page.evaluate(({ selectedSpell, trayIds, knownSpells }) => {
    const game = window.castleOfTheWindsWeb;
    game.player.spellsKnown = Array.from(new Set([...(game.player.spellsKnown || []), ...knownSpells]));
    game.player.spellTrayIds = trayIds.filter((spellId) => game.player.spellsKnown.includes(spellId));
    game.pendingSpell = selectedSpell;
    game.render();
  }, { selectedSpell, trayIds, knownSpells });
  await page.waitForTimeout(120);
}

async function stageFlow(page, id) {
  await enterDungeon(page);

  if (id === "run-menu") {
    await page.click('[data-action="open-utility-menu"]');
    await page.waitForTimeout(150);
    await page.keyboard.press("Tab");
    return;
  }

  if (id === "pack") {
    await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      game.showHubModal("pack");
    });
    await page.waitForTimeout(150);
    return;
  }

  if (id === "magic") {
    await seedMagic(page, {
      selectedSpell: "magicMissile",
      trayIds: ["magicMissile", "healMinor", "identify"],
      knownSpells: ["magicMissile", "healMinor", "identify", "shield"]
    });
    await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      game.showHubModal("magic");
    });
    await page.waitForTimeout(150);
    return;
  }

  if (id === "spell-tray") {
    await seedMagic(page, {
      selectedSpell: "magicMissile",
      trayIds: ["magicMissile", "healMinor", "identify"],
      knownSpells: ["magicMissile", "healMinor", "identify"]
    });
    await page.click('[data-action="open-spell-tray"]');
    await page.waitForTimeout(150);
    return;
  }

  if (id === "spell-targeting") {
    await seedMagic(page, {
      selectedSpell: "magicMissile",
      trayIds: ["magicMissile", "healMinor", "identify"],
      knownSpells: ["magicMissile", "healMinor", "identify"]
    });
    await page.click('[data-action="open-spell-tray"]');
    await page.waitForTimeout(120);
    await page.click('[data-action="spell-cast"]');
    await page.waitForTimeout(150);
    return;
  }

  if (id === "reward-choice") {
    await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      const choiceState = {
        type: "perk",
        source: "level",
        options: ["brace", "cleave", "blooded"]
      };
      game.showRewardChoiceModal(choiceState);
    });
    await page.waitForTimeout(150);
    await page.keyboard.press("Tab");
    return;
  }

  if (id === "blocked-state") {
    await seedMagic(page, {
      selectedSpell: "shield",
      trayIds: ["magicMissile", "healMinor", "identify"],
      knownSpells: ["magicMissile", "healMinor", "identify", "shield"]
    });
    await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      game.selectSpell("shield", {
        focusTarget: game.getSpellBookFocusKey("shield")
      });
      game.showHubModal("magic", {
        focusTarget: game.getSpellBookFocusKey("shield")
      });
    });
    await page.waitForTimeout(150);
    return;
  }

  if (id === "settings") {
    await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      game.showSettingsModal();
    });
    await page.waitForTimeout(150);
    await page.keyboard.press("Tab");
  }
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
      if (id === "reward-choice") {
        await page.evaluate(() => {
          const game = window.castleOfTheWindsWeb;
          if (game.mode === "levelup") {
            game.closeModal();
            game.render();
          }
        });
        await page.waitForTimeout(100);
      }
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
