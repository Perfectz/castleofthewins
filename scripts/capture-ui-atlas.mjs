import { mkdir, readFile, readdir, unlink } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const PORT = 4195;
const OUTPUT_DIR = path.join(ROOT, "artifacts", "playwright", "ui-space-atlas-2026-04-09");

const VIEWPORTS = [
  { name: "mobile", width: 393, height: 852, deviceScaleFactor: 2 },
  { name: "desktop", width: 1440, height: 1600, deviceScaleFactor: 1.5 }
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
      response.writeHead(error?.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(error?.code === "ENOENT" ? "Not found" : "Server error");
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, "127.0.0.1", () => resolve());
  });

  return server;
}

async function bootPage(page, baseUrl) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(() => Boolean(window.castleOfTheWindsWeb));
  await page.waitForTimeout(400);
}

async function withClosedModal(page) {
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    if (game?.modalRoot && !game.modalRoot.classList.contains("hidden")) {
      game.closeModal();
    }
  });
  await page.waitForTimeout(160);
}

async function seedRunState(page) {
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    game.beginAdventure();
    game.player.hp = Math.max(5, Math.floor(game.player.maxHp * 0.58));
    game.player.mana = Math.max(0, Math.floor(game.player.maxMana * 0.42));
    game.player.bankGold = Math.max(350, game.player.bankGold || 0);
    game.player.runCurrencies = {
      ...(game.player.runCurrencies || {}),
      rumorTokens: 2
    };
    game.player.spellsKnown = Array.from(new Set([
      ...(game.player.spellsKnown || []),
      "identify",
      "clairvoyance",
      "magicMissile",
      "healMinor"
    ]));
    game.player.inventory.push(
      { id: "atlas_blade", name: "Knight Sword", kind: "weapon", slot: "weapon", power: 6, value: 90, rarity: 4, weight: 6, cursed: false, identified: false },
      { id: "atlas_wand", name: "Wand of Lightning", kind: "charged", effect: "lightning", charges: 1, maxCharges: 3, value: 88, rarity: 4, weight: 1, cursed: false, identified: true },
      { id: "atlas_book", name: "Spellbook of Identify", kind: "spellbook", spell: "identify", value: 82, rarity: 4, weight: 1, cursed: false, identified: true },
      { id: "atlas_idol", name: "Stone Idol", kind: "junk", value: 18, rarity: 2, weight: 7, cursed: false, identified: true }
    );
    if (game.player.equipment.body) {
      game.player.equipment.body.cursed = true;
      game.player.equipment.body.identified = true;
    }
    game.render();
  });
  await page.waitForTimeout(320);
}

async function captureState(page, fileName, setup) {
  await withClosedModal(page);
  if (setup) {
    await setup();
  }
  await page.waitForTimeout(240);
  await page.screenshot({ path: path.join(OUTPUT_DIR, fileName), fullPage: true });
}

async function captureRunAtlas(page, viewportName) {
  const label = (name) => `${name}-${viewportName}.png`;

  await captureState(page, label("01-title"), null);

  await captureState(page, label("02-creation"), async () => {
    await page.evaluate(() => {
      window.castleOfTheWindsWeb.showCreationModal();
    });
  });

  await seedRunState(page);
  await page.screenshot({ path: path.join(OUTPUT_DIR, label("03-shell")), fullPage: true });
  await page.locator(".top-band").screenshot({ path: path.join(OUTPUT_DIR, label("04-top-band")) });
  await page.locator("#action-bar").screenshot({ path: path.join(OUTPUT_DIR, label("05-action-dock")) });

  await captureState(page, label("06-utility"), async () => {
    await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      game.showUtilityMenu();
    });
  });

  await captureState(page, label("07-character"), async () => {
    await page.evaluate(() => window.castleOfTheWindsWeb.showCharacterSheet());
  });

  await captureState(page, label("08-settings"), async () => {
    await page.evaluate(() => window.castleOfTheWindsWeb.showSettingsModal());
  });

  await captureState(page, label("09-save-slots"), async () => {
    await page.evaluate(() => window.castleOfTheWindsWeb.showSaveSlotsModal("save"));
  });

  await captureState(page, label("10-load-slots"), async () => {
    await page.evaluate(() => window.castleOfTheWindsWeb.showSaveSlotsModal("load"));
  });

  await captureState(page, label("11-pack"), async () => {
    await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      const index = game.player.inventory.findIndex((item) => item.id === "atlas_blade");
      game.activePackFilter = "all";
      game.showHubModal("pack", {
        selection: { type: "inventory", value: index >= 0 ? index : 0 }
      });
    });
  });

  await captureState(page, label("12-magic"), async () => {
    await page.evaluate(() => {
      window.castleOfTheWindsWeb.showHubModal("magic");
    });
  });

  await captureState(page, label("13-guide-current"), async () => {
    await page.evaluate(() => {
      window.castleOfTheWindsWeb.showHubModal("journal", { journalSection: "current" });
    });
  });

  await captureState(page, label("14-guide-mission"), async () => {
    await page.evaluate(() => {
      window.castleOfTheWindsWeb.showHubModal("journal", { journalSection: "mission" });
    });
  });

  await captureState(page, label("15-guide-rules"), async () => {
    await page.evaluate(() => {
      window.castleOfTheWindsWeb.showHubModal("journal", { journalSection: "guide" });
    });
  });

  await captureState(page, label("16-guide-chronicle"), async () => {
    await page.evaluate(() => {
      window.castleOfTheWindsWeb.showHubModal("journal", { journalSection: "chronicle" });
    });
  });

  await captureState(page, label("17-bank"), async () => {
    await page.evaluate(() => {
      window.castleOfTheWindsWeb.openTownService("bank");
    });
  });

  const shopIds = ["general", "armory", "guild", "junk"];
  let order = 18;
  for (const shopId of shopIds) {
    await captureState(page, label(`${String(order).padStart(2, "0")}-${shopId}-buy`), async () => {
      await page.evaluate((id) => {
        window.castleOfTheWindsWeb.openTownService(id);
      }, shopId);
    });
    order += 1;
    await captureState(page, label(`${String(order).padStart(2, "0")}-${shopId}-sell`), async () => {
      await page.evaluate((id) => {
        const game = window.castleOfTheWindsWeb;
        game.openTownService(id);
        game.activeShopPanel = "sell";
        game.updateShopModalPanel(null, { preserveScroll: false, fallbackFocus: false });
      }, shopId);
    });
    order += 1;
  }

  await captureState(page, label(`${String(order).padStart(2, "0")}-sage`), async () => {
    await page.evaluate(() => {
      window.castleOfTheWindsWeb.openTownService("sage");
    });
  });
  order += 1;

  await captureState(page, label(`${String(order).padStart(2, "0")}-temple`), async () => {
    await page.evaluate(() => {
      window.castleOfTheWindsWeb.openTownService("temple");
    });
  });
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const existingEntries = await readdir(OUTPUT_DIR).catch(() => []);
  await Promise.all(
    existingEntries
      .filter((entry) => entry.toLowerCase().endsWith(".png"))
      .map((entry) => unlink(path.join(OUTPUT_DIR, entry)))
  );
  const server = await createStaticServer(ROOT);
  let browser = null;

  try {
    browser = await chromium.launch({ headless: true });
    const baseUrl = `http://127.0.0.1:${PORT}/index.html`;

    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.deviceScaleFactor
      });
      await bootPage(page, baseUrl);
      await captureRunAtlas(page, viewport.name);
      await page.close();
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
