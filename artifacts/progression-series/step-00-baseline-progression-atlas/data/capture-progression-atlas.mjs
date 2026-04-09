import { mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const STEP = path.join(ROOT, "artifacts", "progression-series", "step-00-baseline-progression-atlas");
const BEFORE = path.join(STEP, "screenshots", "before");
const AFTER = path.join(STEP, "screenshots", "after");
const DATA = path.join(STEP, "data");
const PORT = 4208;
const VIEWS = [
  { id: "mobile", width: 430, height: 932, scale: 2 },
  { id: "desktop", width: 1440, height: 1200, scale: 1 }
];
const SERVICES = ["armory", "guild", "temple", "sage"];
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
  screenshots: [],
  stagingNotes: [
    "Creation was staged to an elf wizard draft so spell-forward class differentiation is visible in one frame.",
    "Bank progression was staged with representative mastery, contract, commendation, and bankroll values.",
    "Pack, magic, relic, and boon captures use the live UI with representative runtime staging."
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

async function shot(page, rel, meta) {
  await page.screenshot({ path: path.join(STEP, rel), fullPage: true });
  report.screenshots.push({ filename: path.basename(rel), path: rel.replace(/\\/g, "/"), ...meta });
}

async function ready(page) {
  await page.waitForFunction(() => Boolean(window.castleOfTheWindsWeb));
  await page.waitForTimeout(250);
}

async function close(page) {
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    if (game?.mode === "modal" || game?.mode === "levelup") {
      game.closeModal?.();
      game.render?.();
    }
  });
  await page.waitForTimeout(150);
}

async function openCreation(page) {
  await page.click('[data-action="new-game"]');
  await page.waitForSelector('[data-action="begin-adventure"]');
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    game.selectedRace = "elf";
    game.selectedClass = "wizard";
    game.creationName = "Atlas Mage";
    game.creationStatBonuses = { str: 0, dex: 2, con: 0, int: 4 };
    game.showCreationModal();
  });
  await page.waitForTimeout(250);
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

async function bankStage(page) {
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    game.player.gold = 620;
    game.player.bankGold = 260;
    game.player.runCurrencies.rumorTokens = 2;
    game.classMasteries = { fighter: 1, rogue: 0, wizard: 2 };
    game.contracts = {
      unlocked: ["pressed_descent", "greed_ledger", "scholar_road", "hunters_call"],
      activeId: "scholar_road",
      currentRunId: ""
    };
    game.commendations = {
      clean_extract: true,
      greed_specialist: false,
      elite_hunter: true,
      route_reader: false,
      curse_survivor: false,
      class_loyalist: false
    };
    game.runSummaryHistory = [{
      outcome: "extract",
      extractedDepth: 2,
      returnValue: 188,
      greedCount: 1,
      searchCount: 3,
      eliteKills: 2,
      restCount: 1,
      waitCount: 1,
      classId: "wizard"
    }];
    game.openTownService("bank");
  });
  await page.waitForTimeout(250);
}

async function service(page, id) {
  await page.evaluate((serviceId) => window.castleOfTheWindsWeb.openTownService(serviceId), id);
  await page.waitForTimeout(250);
}

async function descend(page) {
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    game.closeModal?.();
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

async function packStage(page) {
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    if (!game.player.inventory.find((item) => item.id === "atlas-chainmail")) {
      game.player.inventory.push(
        { id: "atlas-chainmail", name: "Chain Mail", kind: "armor", slot: "body", armor: 5, guardBonus: 1, value: 88, weight: 8, visualId: "armor", identified: true, cursed: false },
        { id: "atlas-spellbook-shield", name: "Spellbook of Shield", kind: "spellbook", spell: "shield", value: 82, weight: 1, visualId: "spellbook", identified: true, cursed: false }
      );
    }
    const index = game.player.inventory.findIndex((item) => item.id === "atlas-chainmail");
    game.activePackFilter = "all";
    game.showHubModal("pack", { selection: { type: "inventory", value: index >= 0 ? index : 0 } });
  });
  await page.waitForTimeout(250);
}

async function spellbookStage(page) {
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    const index = game.player.inventory.findIndex((item) => item.id === "atlas-spellbook-shield");
    game.activePackFilter = "all";
    game.showHubModal("pack", { selection: { type: "inventory", value: index >= 0 ? index : 0 } });
  });
  await page.waitForTimeout(250);
}

async function magicStage(page) {
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    const known = new Set(game.player.spellsKnown || []);
    ["magicMissile", "healMinor", "shield", "identify", "slowMonster", "clairvoyance"].forEach((spellId) => known.add(spellId));
    game.player.spellsKnown = [...known];
    game.player.spellTrayIds = game.player.spellsKnown.slice(0, 6);
    game.showHubModal("magic");
  });
  await page.waitForTimeout(250);
}

async function levelStage(page) {
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    game.closeModal?.();
    game.mode = "game";
    game.player.exp = game.player.nextLevelExp;
    game.checkLevelUp();
  });
  await page.waitForTimeout(250);
}

async function rewardStage(page, type) {
  const options = type === "relic"
    ? ["survivor_talisman", "greedy_purse", "warding_lens"]
    : ["windfall", "field_medicine", "aether_cache"];
  await page.evaluate(({ rewardType, rewardOptions }) => {
    const game = window.castleOfTheWindsWeb;
    game.closeModal?.();
    game.mode = "game";
    game.pendingPerkChoices = 0;
    game.pendingSpellChoices = 0;
    game.pendingRewardQueue = [];
    game.pendingRewardChoice = { type: rewardType, source: rewardType, options: rewardOptions };
    game.showRewardChoiceModal(game.pendingRewardChoice);
  }, { rewardType: type, rewardOptions: options });
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
  await shot(page, `screenshots/before/${view.id}-01-creation.png`, {
    viewport: view.id,
    screen: "Character creation",
    howReached: "Opened New Game and restaged the live creation modal to an elf wizard draft.",
    whyCaptured: "Shows class, race, and stat-allocation differentiation."
  });

  await begin(page);
  await shot(page, `screenshots/before/${view.id}-02-town-overview.png`, {
    viewport: view.id,
    screen: "Town overview",
    howReached: "Began a run from the creation screen.",
    whyCaptured: "Shows the town HUD before opening progression services."
  });

  await bankStage(page);
  await shot(page, `screenshots/before/${view.id}-03-bank-progression.png`, {
    viewport: view.id,
    screen: "Bank progression review",
    howReached: "Opened the live Bank modal with representative mastery and contract state.",
    whyCaptured: "Documents contracts, mastery, commendations, rumors, and town unlocks."
  });

  for (const [index, id] of SERVICES.entries()) {
    await close(page);
    await service(page, id);
    await shot(page, `screenshots/before/${view.id}-0${index + 4}-${id}.png`, {
      viewport: view.id,
      screen: id === "guild" ? "Wizard's Guild" : id === "temple" ? "Temple" : id === "sage" ? "Sage's Tower" : "Armory",
      howReached: "Opened the live town service modal from town.",
      whyCaptured: id === "guild"
        ? "Shows spellbook, wand, and mana-oriented build shaping."
        : id === "temple"
          ? "Shows restoration and overcast recovery."
          : id === "sage"
            ? "Shows identification as a build-shaping knowledge service."
            : "Shows equipment progression and gear comparison."
    });
  }

  await close(page);
  await descend(page);
  await shot(page, `screenshots/before/${view.id}-08-dungeon-overview.png`, {
    viewport: view.id,
    screen: "Dungeon overview",
    howReached: "Descended to depth 1 and revealed the floor for documentation.",
    whyCaptured: "Provides the run context where progression interrupts play."
  });

  await packStage(page);
  await shot(page, `screenshots/before/${view.id}-09-pack-gear.png`, {
    viewport: view.id,
    screen: "Pack gear comparison",
    howReached: "Added a representative armor upgrade and opened the pack hub on that item.",
    whyCaptured: "Documents gear-based build shaping."
  });

  await spellbookStage(page);
  await shot(page, `screenshots/before/${view.id}-10-pack-spellbook.png`, {
    viewport: view.id,
    screen: "Pack spellbook interaction",
    howReached: "Selected a staged spellbook in the live pack hub.",
    whyCaptured: "Shows one route for learning spells outside level-up."
  });

  await magicStage(page);
  await shot(page, `screenshots/before/${view.id}-11-magic-hub.png`, {
    viewport: view.id,
    screen: "Magic hub",
    howReached: "Added representative known spells and opened the magic hub.",
    whyCaptured: "Documents spell management separate from acquisition."
  });

  await levelStage(page);
  await shot(page, `screenshots/before/${view.id}-12-level-up-perk.png`, {
    viewport: view.id,
    screen: "Level up perk choice",
    howReached: "Granted enough XP in the live run to trigger level-up.",
    whyCaptured: "Documents the perk-choice half of the level-up interrupt."
  });

  await page.locator('[data-action="choose-reward"]').first().click();
  await page.waitForTimeout(250);
  await shot(page, `screenshots/before/${view.id}-13-spell-study.png`, {
    viewport: view.id,
    screen: "Spell study",
    howReached: "Advanced the same live level-up flow from perk choice into spell study.",
    whyCaptured: "Shows the spell-acquisition branch of level progression."
  });

  await rewardStage(page, "relic");
  await shot(page, `screenshots/before/${view.id}-14-relic-choice.png`, {
    viewport: view.id,
    screen: "Relic choice",
    howReached: "Staged the live reward-choice modal with current relic options.",
    whyCaptured: "Documents objective-driven run shaping through relic rewards."
  });

  await rewardStage(page, "boon");
  await shot(page, `screenshots/before/${view.id}-15-boon-choice.png`, {
    viewport: view.id,
    screen: "Boon choice",
    howReached: "Staged the live reward-choice modal with current boon options.",
    whyCaptured: "Documents the alternate reward branch that can redirect a run."
  });

  await context.close();
}

function atlasHtml(baseUrl, viewId) {
  const cells = [
    ["01-creation", "Creation"],
    ["03-bank-progression", "Bank Meta"],
    ["05-guild", "Spell Access"],
    ["09-pack-gear", "Gear Fit"],
    ["11-magic-hub", "Spell Management"],
    ["12-level-up-perk", "Level-Up"]
  ].map(([slug, title]) => `
    <figure class="card">
      <img src="${baseUrl}/artifacts/progression-series/step-00-baseline-progression-atlas/screenshots/before/${viewId}-${slug}.png" alt="${title}">
      <figcaption><strong>${title}</strong><span>${title === "Bank Meta" ? "Persistent layer." : title === "Spell Access" ? "Town acquisition layer." : title === "Gear Fit" ? "Inventory-driven build shaping." : title === "Spell Management" ? "Execution layer." : title === "Level-Up" ? "Perk plus spell interrupt." : "Starting identity and stat routing."}</span></figcaption>
    </figure>
  `).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;font-family:Georgia,serif;background:#f2eadc;color:#1d2523}
    main{width:2000px;padding:72px}
    h1{font-size:72px;margin:0 0 14px}.dek{font-size:28px;line-height:1.35;margin:0 0 26px;color:#5c5c57}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:22px}.card{margin:0;background:#fff9f0;border:2px solid #b49568;border-radius:20px;overflow:hidden}
    img{display:block;width:100%;aspect-ratio:16/10;object-fit:cover;background:#d6c8af}.card figcaption{padding:16px 18px;display:grid;gap:8px;font-size:23px;line-height:1.3}
    strong{font-size:30px}
  </style></head><body><main><h1>${viewId === "mobile" ? "Phone-Sized" : "Desktop"} Progression Atlas</h1><p class="dek">These are annotated study boards, not redesign comps. They compress the most important progression surfaces into one reviewable artifact.</p><section class="grid">${cells}</section></main></body></html>`;
}

function textBoard(title, dek, cards) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;font-family:Georgia,serif;background:#efe7d9;color:#1a2222}main{width:2100px;padding:76px}
    h1{font-size:74px;margin:0 0 14px}.dek{font-size:30px;line-height:1.35;color:#5f615d;margin:0 0 28px}
    .grid{display:grid;grid-template-columns:repeat(${cards.length},1fr);gap:22px}.card{background:#fffaf2;border:2px solid #ac906b;border-radius:20px;padding:22px}
    .card h2{margin:0 0 12px;font-size:34px}.card p{margin:0;font-size:24px;line-height:1.35;color:#5f615d}
  </style></head><body><main><h1>${title}</h1><p class="dek">${dek}</p><section class="grid">${cards.map((card) => `<article class="card"><h2>${card.title}</h2><p>${card.text}</p></article>`).join("")}</section></main></body></html>`;
}

async function board(runBrowser, width, height, html, output) {
  const page = await runBrowser.newPage({ viewport: { width, height } });
  await page.setContent(html, { waitUntil: "load" });
  await page.waitForTimeout(300);
  await page.screenshot({ path: output, fullPage: true });
  await page.close();
}

async function buildBoards(runBrowser, baseUrl) {
  for (const view of VIEWS) {
    await board(runBrowser, 2000, 2300, atlasHtml(baseUrl, view.id), path.join(AFTER, `${view.id}-progression-atlas-board.png`));
    report.screenshots.push({
      filename: `${view.id}-progression-atlas-board.png`,
      path: `screenshots/after/${view.id}-progression-atlas-board.png`,
      viewport: view.id,
      screen: view.id === "mobile" ? "Mobile progression atlas board" : "Desktop progression atlas board",
      howReached: "Generated from the before-side captures with the step-local board renderer.",
      whyCaptured: "Creates an annotated after-side atlas rather than a redesign."
    });
  }

  await board(runBrowser, 2100, 1200, textBoard(
    "Progression System Map",
    "The current game mixes run-local and persistent growth. Creation, pickups, level gates, and bank-layer systems all contribute to build assembly.",
    [
      { title: "Run Start", text: "Creation chooses race, class, base stats, starter kit, starter spells, and any carried-forward mastery or contract bonuses." },
      { title: "During Run", text: "XP, gear, spellbooks, town service access, objective rewards, relics, and boons all change the shape of the current run." },
      { title: "Level Gates", text: "Every level-up grants random stat growth, a perk choice, a spell study choice, a derived-stat recalculation, and a full HP and mana refill." },
      { title: "Persistent Layer", text: "Class mastery, commendations, contracts, and town unlocks push value forward into future starts." }
    ]
  ), path.join(AFTER, "progression-system-map-board.png"));
  report.screenshots.push({
    filename: "progression-system-map-board.png",
    path: "screenshots/after/progression-system-map-board.png",
    viewport: "board",
    screen: "Progression system map board",
    howReached: "Generated from code-backed atlas findings.",
    whyCaptured: "Turns the baseline into a readable relationship diagram."
  });

  await board(runBrowser, 2100, 1200, textBoard(
    "Build-Path Summaries",
    "These are baseline summaries of current fighter, rogue, and wizard growth patterns. They describe the shipped system and do not propose redesign.",
    [
      { title: "Fighter", text: "Heavy front-line start, defensive spell access through study and mastery, and perks that compound armor, guard, and melee pressure." },
      { title: "Rogue", text: "Lighter start, stronger route and control tools, and perks that reward scouting, burden discipline, and opportunistic play." },
      { title: "Wizard", text: "Fragile opening, broadest direct spell growth, and a progression path centered on mana economy, spell quality, and overcast safety." }
    ]
  ), path.join(AFTER, "build-path-board.png"));
  report.screenshots.push({
    filename: "build-path-board.png",
    path: "screenshots/after/build-path-board.png",
    viewport: "board",
    screen: "Build-path summary board",
    howReached: "Generated from the current class-family progression summary.",
    whyCaptured: "Adds publication-ready build-path summaries to the atlas."
  });
}

async function main() {
  await mkdir(BEFORE, { recursive: true });
  await mkdir(AFTER, { recursive: true });
  await mkdir(DATA, { recursive: true });

  let runServer = null;
  let runBrowser = null;
  try {
    runServer = await server(ROOT);
    const baseUrl = `http://127.0.0.1:${PORT}`;
    await waitFor(`${baseUrl}/index.html`);
    runBrowser = await browser();
    for (const view of VIEWS) {
      await captureView(runBrowser, baseUrl, view);
    }
    await buildBoards(runBrowser, baseUrl);
    await writeFile(path.join(DATA, "capture-results.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(path.join(DATA, "capture-results.json"));
  } finally {
    if (runBrowser) {
      await runBrowser.close();
    }
    if (runServer) {
      await new Promise((resolve) => runServer.close(resolve));
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
