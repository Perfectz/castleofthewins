import { readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const STEP_ROOT = path.join(ROOT, "artifacts", "menu-redesign-series", "step-00-baseline-menu-atlas");
const DATA_DIR = path.join(STEP_ROOT, "data");
const AFTER_DIR = path.join(STEP_ROOT, "screenshots", "after");
const PORT = 4311;

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

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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

function css() {
  return `
    :root {
      --bg: #f3ecdf;
      --ink: #221a14;
      --muted: #685b50;
      --card: #fff9f0;
      --line: #d8c5af;
      --accent: #9b542d;
      --shadow: rgba(67, 39, 20, 0.14);
      --head: Georgia, "Times New Roman", serif;
      --body: "Segoe UI", Arial, sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      font-family: var(--body);
      background:
        radial-gradient(circle at top left, rgba(223, 191, 154, 0.45), transparent 32%),
        linear-gradient(180deg, #f8f2ea 0%, #ece0cf 100%);
    }
    .page {
      width: 2200px;
      min-height: 1500px;
      padding: 56px;
    }
    .page.long {
      min-height: 2100px;
    }
    .header {
      display: grid;
      grid-template-columns: 1.3fr 0.7fr;
      gap: 24px;
      margin-bottom: 28px;
    }
    .hero, .meta-card, .card, .flow-card {
      background: rgba(255, 249, 240, 0.92);
      border: 1px solid var(--line);
      border-radius: 26px;
      box-shadow: 0 18px 34px var(--shadow);
    }
    .hero {
      padding: 30px 32px;
    }
    .kicker {
      font-size: 14px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--accent);
      font-weight: 700;
      margin-bottom: 12px;
    }
    h1, h2, h3 {
      font-family: var(--head);
      margin: 0;
    }
    h1 {
      font-size: 44px;
      line-height: 1.05;
      margin-bottom: 12px;
    }
    .lede {
      margin: 0;
      font-size: 21px;
      line-height: 1.4;
      color: var(--muted);
    }
    .meta {
      display: grid;
      gap: 14px;
    }
    .meta-card {
      padding: 20px 22px;
    }
    .meta-card strong {
      display: block;
      font-size: 12px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 8px;
    }
    .meta-card p {
      margin: 0;
      font-size: 18px;
      line-height: 1.45;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 20px;
    }
    .card {
      overflow: hidden;
    }
    .card img {
      display: block;
      width: 100%;
      height: auto;
      background: #d5c7b2;
    }
    .card-body {
      padding: 16px 18px 18px;
    }
    .eyebrow {
      font-size: 12px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 7px;
      font-weight: 700;
    }
    .card h3, .flow-card h3 {
      font-size: 24px;
      margin-bottom: 8px;
    }
    .card p, .flow-card p {
      margin: 0;
      font-size: 16px;
      line-height: 1.45;
      color: var(--muted);
    }
    .flow {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 18px;
      margin-top: 16px;
    }
    .flow-card {
      padding: 18px;
      min-height: 320px;
      position: relative;
    }
    .flow-card::after {
      content: "→";
      position: absolute;
      right: -15px;
      top: 40px;
      font-size: 40px;
      color: var(--accent);
    }
    .flow-card:last-child::after {
      content: "";
    }
    .flow-card img {
      width: 100%;
      display: block;
      margin-top: 12px;
      border-radius: 16px;
      border: 1px solid var(--line);
    }
    .callout-stage {
      position: relative;
      width: 1600px;
      margin: 0 auto;
      padding-top: 12px;
    }
    .callout-stage img {
      display: block;
      width: 100%;
      border-radius: 30px;
      border: 1px solid var(--line);
      box-shadow: 0 22px 42px var(--shadow);
    }
    .callout {
      position: absolute;
      max-width: 250px;
      background: rgba(255, 249, 240, 0.98);
      border: 2px solid var(--accent);
      border-radius: 18px;
      padding: 14px 16px;
      box-shadow: 0 12px 24px rgba(92, 50, 27, 0.18);
      font-size: 17px;
      line-height: 1.35;
    }
    .callout strong {
      display: block;
      font-size: 13px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 6px;
    }
    .callout::after {
      content: "";
      position: absolute;
      width: 2px;
      background: var(--accent);
      transform-origin: top left;
    }
    .callout.menu { top: 120px; left: 16px; }
    .callout.menu::after { left: 214px; top: 80px; height: 120px; transform: rotate(68deg); }
    .callout.hud { top: 56px; right: 16px; }
    .callout.hud::after { left: 12px; top: 108px; height: 170px; transform: rotate(228deg); }
    .callout.advisor { top: 364px; right: 70px; }
    .callout.advisor::after { left: 10px; top: 104px; height: 150px; transform: rotate(224deg); }
    .callout.ticker { top: 520px; left: 78px; }
    .callout.ticker::after { left: 196px; top: 96px; height: 138px; transform: rotate(62deg); }
    .callout.pad { bottom: 150px; left: 30px; }
    .callout.pad::after { left: 220px; top: 92px; height: 140px; transform: rotate(42deg); }
    .callout.actions { bottom: 188px; right: 30px; }
    .callout.actions::after { left: 18px; top: 104px; height: 170px; transform: rotate(222deg); }
  `;
}

function srcFor(relativePath) {
  return `http://127.0.0.1:${PORT}/${relativePath.replaceAll("\\", "/")}`;
}

function boardPage({ title, summary, note, cards }) {
  return `<!doctype html>
  <html lang="en">
    <head><meta charset="utf-8" /><title>${escapeHtml(title)}</title><style>${css()}</style></head>
    <body>
      <div class="page long">
        <div class="header">
          <section class="hero">
            <div class="kicker">Step 00 Baseline Menu Atlas</div>
            <h1>${escapeHtml(title)}</h1>
            <p class="lede">${escapeHtml(summary)}</p>
          </section>
          <section class="meta">
            <article class="meta-card">
              <strong>What This Adds</strong>
              <p>${escapeHtml(note)}</p>
            </article>
            <article class="meta-card">
              <strong>Reading Order</strong>
              <p>Left to right, top to bottom. Each card keeps the raw screenshot but adds a stable name and route note for analysis.</p>
            </article>
          </section>
        </div>
        <section class="grid">
          ${cards.map((card) => `
            <article class="card">
              <img src="${escapeHtml(card.src)}" alt="${escapeHtml(card.title)}" />
              <div class="card-body">
                <div class="eyebrow">${escapeHtml(card.eyebrow)}</div>
                <h3>${escapeHtml(card.title)}</h3>
                <p>${escapeHtml(card.copy)}</p>
              </div>
            </article>
          `).join("")}
        </section>
      </div>
    </body>
  </html>`;
}

function flowPage(cards) {
  return `<!doctype html>
  <html lang="en">
    <head><meta charset="utf-8" /><title>Navigation Map</title><style>${css()}</style></head>
    <body>
      <div class="page">
        <div class="header">
          <section class="hero">
            <div class="kicker">Step 00 Baseline Menu Atlas</div>
            <h1>Baseline Navigation Map</h1>
            <p class="lede">A visual route map from title entry to town, services, dungeon utility, and fail state, built from live Playwright captures.</p>
          </section>
          <section class="meta">
            <article class="meta-card">
              <strong>Observed Pattern</strong>
              <p>Most informational surfaces share the same modal-sheet language. The player is asked to parse HUD, advisor, ticker, and modal content as separate but interdependent systems.</p>
            </article>
            <article class="meta-card">
              <strong>Why This Matters</strong>
              <p>Before redesign, the team needs to see where navigation is clear and where surface boundaries blur.</p>
            </article>
          </section>
        </div>
        <section class="flow">
          ${cards.map((card) => `
            <article class="flow-card">
              <div class="eyebrow">${escapeHtml(card.eyebrow)}</div>
              <h3>${escapeHtml(card.title)}</h3>
              <p>${escapeHtml(card.copy)}</p>
              <img src="${escapeHtml(card.src)}" alt="${escapeHtml(card.title)}" />
            </article>
          `).join("")}
        </section>
      </div>
    </body>
  </html>`;
}

function calloutPage(imageSrc) {
  return `<!doctype html>
  <html lang="en">
    <head><meta charset="utf-8" /><title>HUD Callout Board</title><style>${css()}</style></head>
    <body>
      <div class="page">
        <div class="header">
          <section class="hero">
            <div class="kicker">Step 00 Baseline Menu Atlas</div>
            <h1>Mobile HUD Callout Board</h1>
            <p class="lede">One annotated frame that makes the baseline layer split explicit: board, status, guidance, feed, movement, and context actions.</p>
          </section>
          <section class="meta">
            <article class="meta-card">
              <strong>Why Annotate</strong>
              <p>The raw screenshot is realistic. The callout board makes information pressure visible at a glance.</p>
            </article>
            <article class="meta-card">
              <strong>Main Tension</strong>
              <p>The phone layout is feature-rich and usable, but it asks the player to juggle several surfaces at the same time.</p>
            </article>
          </section>
        </div>
        <div class="callout-stage">
          <img src="${escapeHtml(imageSrc)}" alt="Mobile dungeon HUD" />
          <div class="callout menu"><strong>Menu Entry</strong>Persistent access to the utility stack stays visible in the upper-left corner.</div>
          <div class="callout hud"><strong>Status Strip</strong>Health, mana, gold, and depth are readable, but dense on a narrow screen.</div>
          <div class="callout advisor"><strong>Advisor Band</strong>Guidance is prominent and helpful, yet competes with tactical reading.</div>
          <div class="callout ticker"><strong>Live Feed</strong>Recent events stay visible, creating a second text band near the board centerline.</div>
          <div class="callout pad"><strong>Movement Pad</strong>The touch cluster confirms the primary device target and takes a meaningful footprint.</div>
          <div class="callout actions"><strong>Context Actions</strong>Pack, briefing, back, and interaction affordances remain permanently available.</div>
        </div>
      </div>
    </body>
  </html>`;
}

async function screenshotPage(browser, html, outputPath, viewport) {
  const page = await browser.newPage({ viewport });
  try {
    await page.setContent(html, { waitUntil: "load" });
    await page.waitForTimeout(400);
    await page.screenshot({ path: outputPath, fullPage: true });
  } finally {
    await page.close();
  }
}

async function main() {
  const raw = await readFile(path.join(DATA_DIR, "capture-results.json"), "utf8");
  const report = JSON.parse(raw);
  const mobile = report.captures.filter((entry) => entry.viewportClass === "mobile");
  const desktop = report.captures.filter((entry) => entry.viewportClass === "desktop");

  const server = await createStaticServer(ROOT);
  let browser = null;

  try {
    browser = await chromium.launch({ headless: true });

    const keyOrders = [1, 3, 4, 5, 12, 13, 14, 15, 16, 21, 22, 23];
    const toCards = (entries, prefix) => entries
      .filter((entry) => keyOrders.includes(Number(entry.filename.split("-")[1])))
      .map((entry) => ({
        src: srcFor(path.relative(ROOT, entry.path)),
        eyebrow: `${prefix} ${entry.filename.split("-")[1]}`,
        title: entry.screenName,
        copy: entry.howReached
      }));

    await screenshotPage(
      browser,
      boardPage({
        title: "Mobile Baseline Atlas",
        summary: "A phone-sized contact sheet covering entry, town, service, dungeon, utility, progression, and fail-state surfaces.",
        note: "The board cuts down comparison time by putting the most important mobile captures into one reading order.",
        cards: toCards(mobile, "Mobile")
      }),
      path.join(AFTER_DIR, "mobile-baseline-atlas-board.png"),
      { width: 2300, height: 2500 }
    );

    await screenshotPage(
      browser,
      boardPage({
        title: "Desktop Baseline Atlas",
        summary: "The same core surfaces at desktop scale, useful for comparing modal behavior and white-space shifts against the phone-first layout.",
        note: "Desktop makes it easier to see which surfaces truly scale and which ones simply become larger sheets.",
        cards: toCards(desktop, "Desktop")
      }),
      path.join(AFTER_DIR, "desktop-baseline-atlas-board.png"),
      { width: 2300, height: 2500 }
    );

    const flowCards = [
      ["Entry", mobile.find((entry) => entry.filename.includes("-01-title"))],
      ["Build", mobile.find((entry) => entry.filename.includes("-03-creation"))],
      ["Town Loop", mobile.find((entry) => entry.filename.includes("-04-town"))],
      ["Run Utility", mobile.find((entry) => entry.filename.includes("-13-run-menu"))],
      ["Fail State", mobile.find((entry) => entry.filename.includes("-23-death"))]
    ].map(([eyebrow, entry]) => ({
      eyebrow,
      title: entry.screenName,
      copy: entry.howReached,
      src: srcFor(path.relative(ROOT, entry.path))
    }));
    await screenshotPage(browser, flowPage(flowCards), path.join(AFTER_DIR, "navigation-map-board.png"), { width: 2300, height: 1500 });

    const hudShot = mobile.find((entry) => entry.filename.includes("-12-dungeon-hud"));
    await screenshotPage(browser, calloutPage(srcFor(path.relative(ROOT, hudShot.path))), path.join(AFTER_DIR, "mobile-hud-callout-board.png"), { width: 2200, height: 1600 });

    await writeFile(
      path.join(DATA_DIR, "after-board-outputs.json"),
      `${JSON.stringify({
        outputs: [
          "screenshots/after/mobile-baseline-atlas-board.png",
          "screenshots/after/desktop-baseline-atlas-board.png",
          "screenshots/after/navigation-map-board.png",
          "screenshots/after/mobile-hud-callout-board.png"
        ]
      }, null, 2)}\n`,
      "utf8"
    );
    console.log(path.join(DATA_DIR, "after-board-outputs.json"));
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
