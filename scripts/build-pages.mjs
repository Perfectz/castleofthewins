import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");

const entriesToCopy = [
  "index.html",
  "styles.css",
  "app.js",
  "service-worker.js",
  "manifest.webmanifest",
  "assets",
  "icons",
  "src"
];

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

for (const entry of entriesToCopy) {
  const sourcePath = path.join(rootDir, entry);
  const targetPath = path.join(distDir, entry);
  fs.cpSync(sourcePath, targetPath, { recursive: true });
}

fs.writeFileSync(path.join(distDir, ".nojekyll"), "", "utf8");
