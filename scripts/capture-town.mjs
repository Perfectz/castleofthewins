import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { chromium } from "playwright";

const PORT = 4173;
const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, "artifacts", "playwright");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "town-view.png");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {}
    await wait(250);
  }
  throw new Error(`Server did not start at ${url}`);
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const server = spawn("python", ["-m", "http.server", String(PORT)], {
    cwd: ROOT,
    stdio: "ignore"
  });

  try {
    const url = `http://127.0.0.1:${PORT}/index.html`;
    await waitForServer(url);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.click('[data-action="new-game"]');
    await page.waitForSelector('[data-action="begin-adventure"]');
    await page.click('[data-action="begin-adventure"]');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: OUTPUT_PATH, fullPage: true });
    await browser.close();
    console.log(OUTPUT_PATH);
  } finally {
    server.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
