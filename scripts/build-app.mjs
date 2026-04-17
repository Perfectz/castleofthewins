import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const srcDir = path.join(rootDir, "src");
const outFile = path.join(rootDir, "app.js");

const orderedFiles = [
  "core/constants.js",
  "core/utils.js",
  "core/world.js",
  "data/assets.js",
  "data/content.js",
  "core/entities.js",
  "core/settings.js",
  "core/command-result.js",
  "core/effect-bus.js",
  "core/save-contract.js",
  "core/player-state.js",
  "core/stat-helpers.js",
  "features/persistence.js",
  "features/creation.js",
  "features/encounters.js",
  "features/objectives.js",
  "features/director.js",
  "features/builds.js",
  "features/town-meta.js",
  "features/chronicle.js",
  "features/meta-progression.js",
  "features/telemetry.js",
  "features/validation.js",
  "features/onboarding.js",
  "features/hud-feed.js",
  "features/inventory-ui.js",
  "features/exploration.js",
  "features/monster-behaviors.js",
  "features/combat.js",
  "features/turns.js",
  "features/advisor.js",
  "features/spell-manager.js",
  "features/inventory-manager.js",
  "features/action-dispatch.js",
  "features/input-dispatch.js",
  "features/screens/character-sheet.js",
  "features/screens/bank-modal.js",
  "features/screens/settings-modal.js",
  "features/screens/journal-chronicle-section.js",
  "features/screens/pack-inspector.js",
  "features/screens/pack-hub.js",
  "features/screens/magic-hub.js",
  "ui/render.js",
  "audio/soundboard.js",
  "input/gamepad.js",
  "game.js",
  "main.js"
];

function extractAliasedImports(source) {
  const aliases = [];
  const importPattern = /^import\s+\{([^}]+)\}\s+from\s+["'][^"']+["'];?\r?\n/gm;
  let match;
  while ((match = importPattern.exec(source)) !== null) {
    const specifiers = match[1].split(",").map((part) => part.trim()).filter(Boolean);
    specifiers.forEach((specifier) => {
      const aliasMatch = specifier.match(/^([A-Za-z0-9_$]+)\s+as\s+([A-Za-z0-9_$]+)$/);
      if (aliasMatch) {
        aliases.push({ imported: aliasMatch[1], local: aliasMatch[2] });
      }
    });
  }
  return aliases;
}

function stripModuleSyntax(source) {
  return source
    .replace(/^import\s+[^;]+;\r?\n/gm, "")
    .replace(/^export\s+(class|function|const|let|var)\s+/gm, "$1 ");
}

function loadModule(relativePath) {
  const absolutePath = path.join(srcDir, relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  const aliases = extractAliasedImports(source);
  const aliasBlock = aliases.length > 0
    ? `${aliases.map(({ imported, local }) => `const ${local} = ${imported};`).join("\n")}\n\n`
    : "";
  return `// src/${relativePath}\n${aliasBlock}${stripModuleSyntax(source).trimEnd()}\n`;
}

const bundle = [
  "(function () {",
  '  "use strict";',
  "",
  ...orderedFiles.map(loadModule),
  "})();",
  ""
].join("\n");

if (!bundle.includes("class Game {")) {
  throw new Error("Bundle validation failed: Game class missing.");
}

if (!bundle.includes("class SoundBoard {")) {
  throw new Error("Bundle validation failed: SoundBoard class missing.");
}

fs.writeFileSync(outFile, bundle, "utf8");
