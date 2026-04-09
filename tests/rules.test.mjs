import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const SPELL_FIXTURE = [
  "magicMissile",
  "healMinor",
  "frostBolt",
  "fireball",
  "phaseDoor",
  "clairvoyance",
  "identify",
  "slowMonster",
  "runeOfReturn",
  "lightningBolt"
];

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const URL = pathToFileURL(path.join(ROOT, "index.html")).href;

let browser;

function readSource(...parts) {
  return fs.readFileSync(path.join(ROOT, ...parts), "utf8");
}

function extractObjectLiteral(source, exportName) {
  const exportToken = `export const ${exportName} = {`;
  const start = source.indexOf(exportToken);
  assert.notEqual(start, -1, `missing export ${exportName}`);
  let depth = 0;
  let openIndex = -1;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") {
      depth += 1;
      if (openIndex < 0) {
        openIndex = index;
      }
    } else if (char === "}") {
      depth -= 1;
      if (openIndex >= 0 && depth === 0) {
        return source.slice(openIndex, index + 1);
      }
    }
  }
  throw new Error(`unterminated export ${exportName}`);
}

function parseTileVisualMap(source) {
  const body = extractObjectLiteral(source, "TILESET_VISUALS");
  return Object.fromEntries([...body.matchAll(/^\s{2}([A-Za-z0-9_]+):\s*\[/gm)].map((match) => [match[1], true]));
}

function parseFrameRefs(source, exportName) {
  const body = extractObjectLiteral(source, exportName);
  return Object.fromEntries(
    [...body.matchAll(/^\s{2}([A-Za-z0-9_]+):\s*frameVisual\(TILESET_VISUALS\.([A-Za-z0-9_]+)/gm)].map((match) => [match[1], match[2]])
  );
}

function parseVisualUsage(source, exportName) {
  const body = extractObjectLiteral(source, exportName);
  return Object.fromEntries(
    [...body.matchAll(/^\s{2}([A-Za-z0-9_]+):[\s\S]*?usage:\s*"([^"]+)"/gm)].map((match) => [match[1], match[2]])
  );
}

function parseKeyValueMap(source, exportName, fieldName) {
  const body = extractObjectLiteral(source, exportName);
  const entries = [...body.matchAll(/\n\s{2}([A-Za-z0-9_]+):\s*\{([\s\S]*?)\n\s{2}\},?/g)];
  return Object.fromEntries(entries.map((match) => {
    const entryBody = match[2];
    const value = new RegExp(`${fieldName}:\\s*"([^"]+)"`).exec(entryBody)?.[1] || "";
    return [match[1], value];
  }));
}

async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForFunction(() => Boolean(window.castleOfTheWindsWeb));
  return page;
}

async function beginFreshRun(page, build = { race: "dwarf", classId: "fighter", name: "Rules" }) {
  await page.evaluate((buildState) => {
    const game = window.castleOfTheWindsWeb;
    game.selectedRace = buildState.race;
    game.selectedClass = buildState.classId;
    game.creationName = buildState.name;
    game.creationStatBonuses = { str: 2, dex: 0, con: 2, int: 0 };
    game.beginAdventure();
    for (let index = 0; index < 3 && game.mode === "modal"; index += 1) {
      game.closeModal();
    }
  }, build);
}

async function descendToDepthOne(page) {
  await page.evaluate(() => {
    const game = window.castleOfTheWindsWeb;
    game.placePlayerAt(game.currentLevel.stairsDown.x, game.currentLevel.stairsDown.y);
    game.useStairs("down");
  });
}

before(async () => {
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  if (browser) {
    await browser.close();
  }
});

test("visual registry keeps props and items off disallowed shared tiles", () => {
  const assetsSource = readSource("src", "data", "assets.js");
  const tileVisuals = parseTileVisualMap(assetsSource);
  const boardFrameRefs = parseFrameRefs(assetsSource, "BOARD_PROP_VISUALS");
  const itemFrameRefs = parseFrameRefs(assetsSource, "ITEM_VISUALS");
  const usages = parseVisualUsage(assetsSource, "BOARD_PROP_VISUALS");

  assert.ok(tileVisuals.flag, "flag tile should remain available for town signage");
  assert.equal(usages.routePennant, "breadcrumb");
  assert.equal(usages.routeRune, "breadcrumb");
  assert.equal(usages.routeSupply, "breadcrumb");
  assert.equal(usages.routeTracks, "breadcrumb");
  assert.equal(usages.rescueBanner, "landmark");
  assert.equal(usages.prisonerCell, "landmark");
  assert.equal(usages.broodNest, "landmark");
  assert.equal(usages.relicPedestal, "landmark");

  assert.notEqual(boardFrameRefs.rescueBanner, "keys");
  assert.notEqual(boardFrameRefs.prisonerCell, "stairDown");
  assert.notEqual(boardFrameRefs.shrineSeal, "shrine");
  assert.notEqual(boardFrameRefs.inscribedStone, "shrine");
  assert.notEqual(boardFrameRefs.broodNest, "relic");
  assert.notEqual(boardFrameRefs.broodNest, "flag");

  assert.notEqual(itemFrameRefs.flask, "keys");
  assert.notEqual(itemFrameRefs.shield, "chestClosed");
  assert.notEqual(itemFrameRefs.spellbook, "chestOpen");
  assert.notEqual(itemFrameRefs.relic, "flag");
});

test("content mappings use approved landmark visuals and route breadcrumbs stay subtle", () => {
  const contentSource = readSource("src", "data", "content.js");
  const gameSource = readSource("src", "game.js");
  const objectivesSource = readSource("src", "features", "objectives.js");

  const objectiveVisuals = parseKeyValueMap(contentSource, "OBJECTIVE_DEFS", "visualId");
  const optionalVisuals = parseKeyValueMap(contentSource, "OPTIONAL_ENCOUNTER_DEFS", "visualId");
  const roomEventProps = parseKeyValueMap(contentSource, "ROOM_EVENT_DEFS", "propId");

  assert.equal(objectiveVisuals.secure_supplies, "vaultChest");
  assert.equal(objectiveVisuals.purify_well, "well");
  assert.equal(objectiveVisuals.break_beacon, "beaconFocus");
  assert.equal(optionalVisuals.pilgrim_pool, "well");
  assert.equal(optionalVisuals.moon_well, "well");
  assert.equal(roomEventProps.barricaded_hold, "barricade");
  assert.equal(roomEventProps.cursed_library, "archiveStack");

  const breadcrumbProps = [...gameSource.matchAll(/breadcrumbPropId:\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.ok(breadcrumbProps.length > 0, "expected breadcrumb prop definitions");
  assert.equal(breadcrumbProps.every((propId) => propId.startsWith("route")), true);

  const signatureSectionStart = gameSource.indexOf("  buildSignatureReveal(");
  const signatureSectionEnd = gameSource.indexOf("buildRouteBeats(", signatureSectionStart);
  const signatureSection = gameSource.slice(signatureSectionStart, signatureSectionEnd);
  const signatureProps = [...signatureSection.matchAll(/(?:propId|cuePropId):\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.ok(signatureProps.length > 0, "expected signature reveal props");
  assert.equal(signatureProps.every((propId) => propId.startsWith("route")), true);

  assert.match(gameSource, /const propId = style\.breadcrumbPropId;/);
  assert.match(objectivesSource, /const propId = objective\.visualId \|\| "relicPedestal";/);
});

test("depth-1 search extends guided route without revealing the whole map", async () => {
  const page = await openPage();
  try {
    let result = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await beginFreshRun(page, { race: "dwarf", classId: "fighter", name: `Rules-${attempt}` });
      await descendToDepthOne(page);
      result = await page.evaluate(() => {
        const game = window.castleOfTheWindsWeb;
        const level = game.currentLevel;
        const route = level.guidance?.objectiveRoute || [];
        const exploredBefore = route.filter((point) => level.explored[point.y * level.width + point.x]).length;
        const tilesBefore = level.explored.filter(Boolean).length;
        let searches = 0;
        while (searches < 4) {
          game.performSearch();
          searches += 1;
          const routeRevealed = route.filter((point) => level.explored[point.y * level.width + point.x]).length;
          if (routeRevealed > exploredBefore) {
            break;
          }
        }
        const exploredAfter = route.filter((point) => level.explored[point.y * level.width + point.x]).length;
        const tilesAfter = level.explored.filter(Boolean).length;
        return {
          routeLength: route.length,
          exploredBefore,
          exploredAfter,
          tilesBefore,
          tilesAfter,
          searches,
          totalTiles: level.width * level.height
        };
      });
      if (result.exploredAfter > result.exploredBefore) {
        break;
      }
    }
    assert.ok(result?.routeLength > 0, "depth 1 should have a guided objective route");
    assert.ok(result?.exploredAfter > result?.exploredBefore, "search should reveal more of the route");
    assert.ok(result?.tilesAfter > result?.tilesBefore, "search should reveal more tiles");
    assert.ok(result?.tilesAfter < result?.totalTiles, "search should not reveal the full map");
  } finally {
    await page.close();
  }
});

test("depth-1 objective and optional rooms do not overlap or touch", async () => {
  const page = await openPage();
  try {
    const result = await page.evaluate(() => {
      const overlaps = [];
      const touches = (left, right) => !(
        left.x + left.w + 1 < right.x
        || right.x + right.w + 1 < left.x
        || left.y + left.h + 1 < right.y
        || right.y + right.h + 1 < left.y
      );
      for (let run = 0; run < 10; run += 1) {
        const game = window.castleOfTheWindsWeb;
        game.selectedRace = "dwarf";
        game.selectedClass = "fighter";
        game.creationName = `Rules-${run}`;
        game.creationStatBonuses = { str: 2, dex: 0, con: 2, int: 0 };
        game.beginAdventure();
        const level = game.levels[1];
        const objectiveRoom = level.rooms[level.floorObjective.roomIndex];
        const optionalRoom = level.floorOptional ? level.rooms[level.floorOptional.roomIndex] : null;
        if (objectiveRoom && optionalRoom && touches(objectiveRoom, optionalRoom)) {
          overlaps.push({
            run,
            objectiveRoom,
            optionalRoom
          });
        }
      }
      return overlaps;
    });
    assert.equal(result.length, 0, `found overlapping/touching directive rooms: ${JSON.stringify(result)}`);
  } finally {
    await page.close();
  }
});

test("retention scaffolding expands contracts and mastery ladders", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page);
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      return {
        contractCount: game.getAvailableContracts().length,
        fighterRanks: game.getClassMasteryViewModel("fighter").ladder.length,
        rogueRanks: game.getClassMasteryViewModel("rogue").ladder.length,
        wizardRanks: game.getClassMasteryViewModel("wizard").ladder.length
      };
    });
    assert.ok(result.contractCount >= 10, `expected at least 10 contracts, got ${result.contractCount}`);
    assert.ok(result.fighterRanks >= 4, `expected fighter mastery ladder >= 4, got ${result.fighterRanks}`);
    assert.ok(result.rogueRanks >= 4, `expected rogue mastery ladder >= 4, got ${result.rogueRanks}`);
    assert.ok(result.wizardRanks >= 4, `expected wizard mastery ladder >= 4, got ${result.wizardRanks}`);
  } finally {
    await page.close();
  }
});

test("legacy save-bound town unlocks migrate into durable profile progression", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page);
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      localStorage.removeItem("cotw.meta.v1");
      game.saveGame({ silent: true });
      const saveKey = Object.keys(localStorage).find((key) => key.includes(":slot:"));
      const snapshot = JSON.parse(localStorage.getItem(saveKey));
      snapshot.townUnlocks = {
        supply_cache: true,
        guild_license: true
      };
      localStorage.setItem(saveKey, JSON.stringify(snapshot));
      game.loadGame();
      const metaAfterLoad = JSON.parse(localStorage.getItem("cotw.meta.v1") || "{}");
      game.beginAdventure();
      return {
        durableTownUnlocks: metaAfterLoad.durableTownUnlocks || {},
        nextRunTownUnlocks: game.townUnlocks
      };
    });
    assert.equal(result.durableTownUnlocks.supply_cache, true, JSON.stringify(result));
    assert.equal(result.durableTownUnlocks.guild_license, true, JSON.stringify(result));
    assert.equal(result.nextRunTownUnlocks.supply_cache, true, JSON.stringify(result));
    assert.equal(result.nextRunTownUnlocks.guild_license, true, JSON.stringify(result));
  } finally {
    await page.close();
  }
});

test("commendations unlock new contract tracks from run behavior", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page, { race: "elf", classId: "rogue", name: "Rules" });
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      game.telemetry.activeRun.searchCount = 4;
      game.telemetry.activeRun.greedCount = 2;
      game.telemetry.activeRun.eliteKills = 2;
      game.telemetry.activeRun.waitCount = 1;
      game.telemetry.activeRun.restCount = 0;
      game.player.constitutionLoss = 1;
      const outcome = game.recordTownReturnSummary(game.currentLevel, 1);
      return {
        commendations: game.getAvailableCommendations().filter((entry) => entry.unlocked).map((entry) => entry.id),
        unlockedContracts: game.getAvailableContracts().filter((entry) => entry.unlocked).map((entry) => entry.id),
        commendationUnlocks: outcome.commendationUnlocks.map((entry) => entry.id)
      };
    });
    assert.ok(result.commendations.includes("route_reader"), JSON.stringify(result));
    assert.ok(result.commendations.includes("greed_specialist"), JSON.stringify(result));
    assert.ok(result.commendations.includes("elite_hunter"), JSON.stringify(result));
    assert.ok(result.commendations.includes("curse_survivor"), JSON.stringify(result));
    assert.ok(result.unlockedContracts.includes("route_debt"), JSON.stringify(result));
    assert.ok(result.unlockedContracts.includes("greedy_burden"), JSON.stringify(result));
    assert.ok(result.unlockedContracts.includes("trophy_path"), JSON.stringify(result));
    assert.ok(result.unlockedContracts.includes("last_light"), JSON.stringify(result));
    assert.ok(result.commendationUnlocks.length >= 3, JSON.stringify(result));
  } finally {
    await page.close();
  }
});

test("bank modal surfaces one-more-run guidance", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page);
    const text = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      game.showBankModal();
      return document.getElementById("modal-root")?.textContent || "";
    });
    assert.match(text, /One More Run/i);
    assert.match(text, /Fund|Arm|mastery/i);
  } finally {
    await page.close();
  }
});

test("core stat gear updates burden, speed, and vitality immediately", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page);
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      const strRing = {
        id: "testRingMight",
        name: "Test Ring of Might",
        kind: "armor",
        slot: "ring",
        armor: 0,
        strBonus: 1,
        value: 1,
        rarity: 1,
        weight: 0,
        visualId: "relic",
        identified: true,
        cursed: false,
        enchantment: 0
      };
      const dexAmulet = {
        id: "testWindlace",
        name: "Test Windlace",
        kind: "armor",
        slot: "amulet",
        armor: 0,
        dexBonus: 2,
        value: 1,
        rarity: 1,
        weight: 0,
        visualId: "relic",
        identified: true,
        cursed: false,
        enchantment: 0
      };
      const conCloak = {
        id: "testMantle",
        name: "Test Mantle",
        kind: "armor",
        slot: "cloak",
        armor: 1,
        conBonus: 2,
        value: 1,
        rarity: 1,
        weight: 1,
        visualId: "armor",
        identified: true,
        cursed: false,
        enchantment: 0
      };

      game.player.equipment.ring = null;
      game.player.equipment.amulet = null;
      game.player.equipment.cloak = null;
      game.player.inventory = [];
      game.recalculateDerivedStats();

      const burdenBaseline = game.getBurdenUiState();
      const capacityBefore = burdenBaseline.capacity;
      game.player.inventory = [{
        id: "trainingLoad",
        name: "Training Load",
        kind: "junk",
        value: 0,
        rarity: 1,
        weight: Math.max(1, (capacityBefore + 1) - burdenBaseline.weight),
        visualId: "armor",
        identified: true
      }];
      const burdenBefore = game.getBurdenUiState();
      game.player.equipment.ring = strRing;
      game.recalculateDerivedStats();
      const burdenAfter = game.getBurdenUiState();

      game.player.inventory = [];
      game.player.equipment.ring = null;
      game.recalculateDerivedStats();
      const speedBefore = game.player.moveSpeed;
      game.player.equipment.amulet = dexAmulet;
      game.recalculateDerivedStats();
      const speedAfter = game.player.moveSpeed;

      game.player.equipment.amulet = null;
      game.recalculateDerivedStats();
      game.player.hp = Math.max(1, Math.floor(game.player.maxHp * 0.5));
      const hpRatioBefore = game.player.hp / game.player.maxHp;
      const maxHpBefore = game.player.maxHp;
      game.player.equipment.cloak = conCloak;
      game.recalculateDerivedStats();

      return {
        capacityBefore,
        capacityAfter: burdenAfter.capacity,
        burdenBefore: burdenBefore.state,
        burdenAfter: burdenAfter.state,
        speedBefore,
        speedAfter,
        maxHpBefore,
        maxHpAfter: game.player.maxHp,
        hpRatioBefore,
        hpRatioAfter: game.player.hp / game.player.maxHp
      };
    });
    assert.equal(result.burdenBefore, "overloaded");
    assert.notEqual(result.burdenAfter, "overloaded");
    assert.ok(result.capacityAfter > result.capacityBefore, `expected strength gear to raise capacity: ${JSON.stringify(result)}`);
    assert.ok(result.speedAfter > result.speedBefore, `expected dex gear to raise move speed: ${JSON.stringify(result)}`);
    assert.ok(result.maxHpAfter > result.maxHpBefore, `expected constitution gear to raise max HP: ${JSON.stringify(result)}`);
    assert.ok(Math.abs(result.hpRatioAfter - result.hpRatioBefore) <= 0.03, `expected HP ratio preservation: ${JSON.stringify(result)}`);
  } finally {
    await page.close();
  }
});

test("intelligence gear raises mana, scales healing, and reads clearly in the pack", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page, { race: "elf", classId: "wizard", name: "Rules" });
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      const weakerCharm = {
        id: "testApprenticeCharm",
        name: "Apprentice Charm",
        kind: "armor",
        slot: "amulet",
        armor: 0,
        intBonus: 1,
        value: 1,
        rarity: 1,
        weight: 0,
        visualId: "relic",
        identified: true,
        cursed: false,
        enchantment: 0
      };
      const sageCharm = {
        id: "testSageCharm",
        name: "Sage Charm",
        kind: "armor",
        slot: "amulet",
        armor: 0,
        intBonus: 2,
        value: 1,
        rarity: 1,
        weight: 0,
        visualId: "relic",
        identified: true,
        cursed: false,
        enchantment: 0
      };
      const castHealMinor = () => {
        const originalRandom = Math.random;
        const originalEndTurn = game.endTurn;
        try {
          Math.random = () => 0;
          game.endTurn = () => {};
          game.player.hp = Math.max(1, game.player.maxHp - 10);
          game.player.mana = game.player.maxMana;
          const beforeHp = game.player.hp;
          game.prepareSpell("healMinor");
          return game.player.hp - beforeHp;
        } finally {
          Math.random = originalRandom;
          game.endTurn = originalEndTurn;
          game.mode = "game";
        }
      };

      game.player.equipment.amulet = weakerCharm;
      game.recalculateDerivedStats();
      const weakerMaxMana = game.player.maxMana;
      const weakerHeal = castHealMinor();

      game.player.inventory.push(sageCharm);
      game.showHubModal("pack", {
        selection: { type: "inventory", value: game.player.inventory.length - 1 }
      });
      const modalText = document.getElementById("modal-root")?.textContent || "";

      game.player.inventory.pop();
      game.player.equipment.amulet = sageCharm;
      game.recalculateDerivedStats();
      const strongerMaxMana = game.player.maxMana;
      const strongerHeal = castHealMinor();

      return {
        weakerMaxMana,
        strongerMaxMana,
        weakerHeal,
        strongerHeal,
        effectiveInt: game.player.effectiveStats.int,
        modalText
      };
    });
    assert.ok(result.strongerMaxMana > result.weakerMaxMana, `expected intelligence gear to raise mana: ${JSON.stringify(result)}`);
    assert.ok(result.strongerHeal > result.weakerHeal, `expected intelligence gear to scale healing: ${JSON.stringify(result)}`);
    assert.ok(result.effectiveInt >= 20, `expected effective intelligence increase: ${JSON.stringify(result)}`);
    assert.match(result.modalText, /Sage Charm/i);
    assert.match(result.modalText, /(\+2 intelligence|Int \+2)/i);
    assert.match(result.modalText, /Int \+1/i);
  } finally {
    await page.close();
  }
});

test("character sheet shows level and progression details from the run menu", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page, { race: "elf", classId: "wizard", name: "Stats" });
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      game.player.exp = 37;
      game.player.gold = 142;
      game.showUtilityMenu();
      const statsButton = document.getElementById("utility-stats-button");
      const utilityHasButton = Boolean(statsButton) && !statsButton.disabled;
      statsButton?.click();
      const modalTitle = document.querySelector("#modal-root .modal-title")?.textContent?.trim() || "";
      const modalText = document.getElementById("modal-root")?.textContent || "";
      return {
        utilityHasButton,
        modalTitle,
        modalText,
        exp: game.player.exp,
        nextLevelExp: game.player.nextLevelExp
      };
    });
    assert.equal(result.utilityHasButton, true, JSON.stringify(result));
    assert.equal(result.modalTitle, "Character Sheet");
    assert.match(result.modalText, /Level 1/i);
    assert.match(result.modalText, /Experience/i);
    assert.match(result.modalText, new RegExp(`${result.exp}\\s*/\\s*${result.nextLevelExp}`));
    assert.match(result.modalText, /to next level/i);
    assert.match(result.modalText, /Strength/i);
    assert.match(result.modalText, /Gold/i);
  } finally {
    await page.close();
  }
});

test("onboarding flags advance through keep entry, objective discovery, and objective clear", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page);
    await descendToDepthOne(page);
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      const objective = game.currentLevel.floorObjective;
      let resolved = false;
      if (objective.id === "recover_relic" || objective.id === "secure_supplies") {
        const item = game.currentLevel.items.find((entry) => entry.objectiveId === objective.id);
        game.placePlayerAt(item.x, item.y);
        game.pickupHere(true, false);
        if (game.pendingPickupPrompt) {
          game.confirmPendingPickup(false);
        }
        resolved = Boolean(game.currentLevel.floorResolved);
      } else {
        game.currentLevel.actors = game.currentLevel.actors.filter((actor) => actor.roomIndex !== objective.roomIndex);
        game.placePlayerAt(objective.marker.x, objective.marker.y);
        const tile = game.currentLevel.tiles[objective.marker.y * game.currentLevel.width + objective.marker.x];
        game.handleTileEntry(tile);
        if (!game.currentLevel.floorResolved) {
          game.interactHere();
        }
        resolved = Boolean(game.currentLevel.floorResolved);
      }
      return {
        resolved,
        enterKeep: Boolean(game.storyFlags.onboarding_enter_keep),
        findObjective: Boolean(game.storyFlags.onboarding_find_objective),
        clearObjective: Boolean(game.storyFlags.onboarding_clear_objective)
      };
    });
    assert.equal(result.enterKeep, true);
    assert.equal(result.findObjective, true);
    assert.equal(result.clearObjective, true);
    assert.equal(result.resolved, true);
  } finally {
    await page.close();
  }
});

test("pickup auto-loots items that stay under capacity before prompting on overload", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page);
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      const x = game.player.x;
      const y = game.player.y;
      game.player.inventory = [];
      game.currentLevel.items = game.currentLevel.items.filter((item) => item.x !== x || item.y !== y);

      const burden = game.getBurdenUiState();
      const remainingCapacity = burden.capacity - burden.weight;
      const safeWeight = Math.max(5, Math.min(7, remainingCapacity - 2));
      if (safeWeight < 5) {
        throw new Error(`expected at least 5 spare carry weight, got ${remainingCapacity}`);
      }
      const overloadWeight = Math.max(1, burden.capacity - (burden.weight + safeWeight) + 1);

      const safeItem = {
        id: "trainingPack",
        name: "Training Pack",
        kind: "junk",
        identified: true,
        cursed: false,
        weight: safeWeight,
        x,
        y
      };
      const overloadItem = {
        id: "anvilBundle",
        name: "Anvil Bundle",
        kind: "junk",
        identified: true,
        cursed: false,
        weight: overloadWeight,
        x,
        y
      };

      game.currentLevel.items.push(safeItem, overloadItem);
      game.pickupHere(true, false);

      return {
        inventoryNames: game.player.inventory.map((item) => item.name),
        groundNames: game.currentLevel.items.filter((item) => item.x === x && item.y === y).map((item) => item.name),
        promptName: game.pendingPickupPrompt?.item?.name || "",
        burdenAfter: game.getBurdenUiState(),
        safeWeight,
        overloadWeight
      };
    });

    assert.ok(result.inventoryNames.includes("Training Pack"), `expected safe item to auto-loot: ${JSON.stringify(result)}`);
    assert.ok(result.groundNames.includes("Anvil Bundle"), `expected overload item to remain on the ground: ${JSON.stringify(result)}`);
    assert.equal(result.promptName, "Anvil Bundle");
    assert.ok(result.burdenAfter.weight <= result.burdenAfter.capacity, `expected overload item prompt before pickup: ${JSON.stringify(result)}`);
    assert.ok(result.safeWeight >= 5, `test setup should use a heavy safe item: ${JSON.stringify(result)}`);
  } finally {
    await page.close();
  }
});

test("live feed keeps prioritized overlay lines and does not pin low-value misses to the top", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page);
    await descendToDepthOne(page);
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      game.messages.push(
        { turn: game.turn, tone: "", message: "You miss." },
        { turn: game.turn, tone: "warning", message: "Reinforcements in 2 turns." },
        { turn: game.turn, tone: "good", message: "Objective complete. The floor is now yours to cash out or greed." },
        { turn: game.turn - 1, tone: "bad", message: "The goblin archer looses a quick arrow." },
        { turn: game.turn - 1, tone: "good", message: "Goblin Archer is lightly injured." },
        { turn: game.turn - 2, tone: "", message: "A distant door creaks open." }
      );
      game.renderEventTicker();
      const ticker = document.getElementById("event-ticker");
      return {
        hidden: document.getElementById("event-ticker")?.classList.contains("hidden"),
        lines: [...document.querySelectorAll("#event-ticker .event-ticker-line .event-ticker-text")]
          .slice(0, 5)
          .map((entry) => entry.textContent?.trim() || ""),
        totalRows: document.querySelectorAll("#event-ticker .event-ticker-line").length,
        overflowY: window.getComputedStyle(ticker).overflowY
      };
    });
    assert.equal(result.hidden, false);
    assert.ok(result.lines.length >= 4, `expected multiple overlay lines: ${JSON.stringify(result)}`);
    assert.ok(result.lines.length <= 5, `expected compact five-line overlay: ${JSON.stringify(result)}`);
    assert.ok(result.totalRows > 5, `expected scrollable overlay rows: ${JSON.stringify(result)}`);
    assert.equal(result.overflowY, "auto", JSON.stringify(result));
    assert.notEqual(result.lines[0], "You miss.");
    assert.ok(result.lines.some((line) => /Press U|Objective complete|Reinforcements|injured/i.test(line)), `unexpected feed lines: ${JSON.stringify(result)}`);
  } finally {
    await page.close();
  }
});

test("board camera keeps the player above the overlay safe zone until the map bottom clamps it", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page);
    await descendToDepthOne(page);
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      game.renderEventTicker();
      const reserveRows = game.getBoardOverlayReserveRows();
      const anchorRow = game.getViewportAnchorRow();
      const maxVy = Math.max(0, game.currentLevel.height - 25);
      const desiredVy = Math.min(Math.max(2, Math.floor(maxVy / 2)), Math.max(0, maxVy - 1));
      game.player.y = Math.min(game.currentLevel.height - 2, desiredVy + anchorRow);
      const midView = game.getViewport();
      const midScreenRow = game.player.y - midView.y;
      game.player.y = game.currentLevel.height - 2;
      const bottomView = game.getViewport();
      const bottomScreenRow = game.player.y - bottomView.y;
      return {
        reserveRows,
        anchorRow,
        safeLimit: 25 - reserveRows - 1,
        desiredVy,
        maxVy,
        midViewY: midView.y,
        midScreenRow,
        bottomViewY: bottomView.y,
        bottomScreenRow
      };
    });
    assert.ok(result.reserveRows >= 1, JSON.stringify(result));
    assert.equal(result.midViewY, result.desiredVy, JSON.stringify(result));
    assert.equal(result.midScreenRow, result.anchorRow, JSON.stringify(result));
    assert.ok(result.midScreenRow < result.safeLimit, JSON.stringify(result));
    assert.equal(result.bottomViewY, result.maxVy, JSON.stringify(result));
    assert.ok(result.bottomScreenRow >= result.safeLimit, JSON.stringify(result));
  } finally {
    await page.close();
  }
});

test("enemies do not use remote attacks from beyond eight tiles", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page);
    await descendToDepthOne(page);
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      const monster = game.currentLevel.actors[0];
      if (!monster) {
        return { ok: false, reason: "no_monster" };
      }

      const originalRandom = Math.random;
      Math.random = () => 0;

      monster.sleeping = false;
      monster.alerted = 6;
      monster.held = 0;
      monster.mana = 10;
      monster.spells = ["magicMissile"];
      monster.ranged = { range: 8, damage: [1, 4], color: "#ffd46b" };
      monster.behaviorKit = "";

      game.player.hp = game.player.maxHp;
      game.player.x = 2;
      game.player.y = 2;
      monster.x = 11;
      monster.y = 2;

      game.currentLevel.actors = [monster];
      game.currentLevel.explored.fill(true);
      game.currentLevel.visible.fill(true);
      game.messages = [];

      game.updateMonsterIntents();
      const intentAtNine = monster.intent?.type || null;
      const hpBefore = game.player.hp;
      game.processMonsters();
      const hpAfterNine = game.player.hp;
      const messagesAtNine = game.messages.map((entry) => entry.message);

      monster.x = 10;
      monster.y = 2;
      game.messages = [];
      game.player.hp = game.player.maxHp;
      game.updateMonsterIntents();
      const intentAtEight = monster.intent?.type || null;

      Math.random = originalRandom;

      return {
        ok: true,
        intentAtNine,
        hpBefore,
        hpAfterNine,
        messagesAtNine,
        intentAtEight
      };
    });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.notEqual(result.intentAtNine, "shoot", JSON.stringify(result));
    assert.notEqual(result.intentAtNine, "hex", JSON.stringify(result));
    assert.equal(result.hpAfterNine, result.hpBefore, JSON.stringify(result));
    assert.equal(result.messagesAtNine.some((message) => /ranged attack|casts|lightning|magic/i.test(message)), false, JSON.stringify(result));
    assert.ok(["shoot", "hex", "summon", "advance"].includes(result.intentAtEight), JSON.stringify(result));
  } finally {
    await page.close();
  }
});

test("combat log surfaces enemy injury states and distinct enemy attack text", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page);
    await descendToDepthOne(page);
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      const monster = game.currentLevel.actors[0];
      if (!monster) {
        return { ok: false, reason: "no_monster" };
      }

      monster.sleeping = false;
      monster.alerted = 6;
      monster.id = "wolf";
      monster.name = "Dire Wolf";
      monster.attack = 99;
      monster.damage = [1, 1];
      monster.maxHp = 10;
      monster.hp = 8;
      monster.x = game.player.x + 1;
      monster.y = game.player.y;
      game.currentLevel.actors = [monster];
      game.currentLevel.explored.fill(true);
      game.currentLevel.visible.fill(true);
      game.messages = [];

      game.damageActor(game.player, monster, 1, "physical");
      const injuryMessage = game.messages.at(-1)?.message || "";

      game.messages = [];
      game.processMonsters();

      return {
        ok: true,
        injuryMessage,
        attackMessages: game.messages.map((entry) => entry.message)
      };
    });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.match(result.injuryMessage, /lightly injured|moderately injured|heavily injured|near death/i, JSON.stringify(result));
    assert.ok(result.attackMessages.some((message) => /snaps at|claws into|lashes out at|hammers at|strikes at/i.test(message)), JSON.stringify(result));
    assert.ok(result.attackMessages.some((message) => /hits .* for/i.test(message)), JSON.stringify(result));
  } finally {
    await page.close();
  }
});

test("save migration resets dungeon explored state and guided reveal progress", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page);
    await descendToDepthOne(page);
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      game.levels.forEach((level) => {
        if (level.kind !== "dungeon") {
          return;
        }
        level.explored = level.explored.map(() => true);
        level.visible = level.visible.map(() => true);
        if (level.guidance) {
          level.guidance.revealedRouteSteps = level.guidance.objectiveRoute?.length || 0;
          level.guidance.entryReconApplied = true;
        }
      });
      game.saveGame({ silent: true });
      const saveKey = Object.keys(localStorage).find((key) => {
        try {
          return Boolean(JSON.parse(localStorage.getItem(key) || "null")?.levels);
        } catch {
          return false;
        }
      });
      const snapshot = JSON.parse(localStorage.getItem(saveKey));
      snapshot.saveFormatVersion = 5;
      localStorage.setItem(saveKey, JSON.stringify(snapshot));
      game.loadGame();
      return {
        exploredCount: game.currentLevel.explored.filter(Boolean).length,
        totalTiles: game.currentLevel.width * game.currentLevel.height,
        revealedRouteSteps: game.currentLevel.guidance?.revealedRouteSteps || 0,
        entryReconApplied: Boolean(game.currentLevel.guidance?.entryReconApplied)
      };
    });
    assert.ok(result.exploredCount < result.totalTiles / 3, `migration should clear most exploration state, got ${result.exploredCount}/${result.totalTiles}`);
    assert.equal(result.revealedRouteSteps, 0);
    assert.equal(result.entryReconApplied, false);
  } finally {
    await page.close();
  }
});

test("controller primary action only forces stairs when the loop recommends it", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page, { race: "dwarf", classId: "fighter", name: "DockAction" });
    await descendToDepthOne(page);
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      game.placePlayerAt(game.currentLevel.stairsDown.x, game.currentLevel.stairsDown.y);
      const unresolved = game.getControllerPrimaryDockAction(game.getActionDockModel());
      game.currentLevel.floorResolved = true;
      const resolved = game.getControllerPrimaryDockAction(game.getActionDockModel());
      return {
        unresolvedAction: unresolved?.action || "",
        resolvedAction: resolved?.action || ""
      };
    });
    assert.equal(result.unresolvedAction, "search", `expected stairs to defer to the route/objective action before floor resolve: ${JSON.stringify(result)}`);
    assert.equal(result.resolvedAction, "stairs-down", `expected descend to become primary once the floor is resolved: ${JSON.stringify(result)}`);
  } finally {
    await page.close();
  }
});

test("recommended contract can be armed from creation and starts the next run armed", async () => {
  const page = await openPage();
  try {
    await page.click('[data-action="new-game"]');
    await page.waitForSelector('[data-action="contract-arm-recommended"]');
    const expected = await page.evaluate(() => window.castleOfTheWindsWeb.getRecommendedContract().id);
    await page.click('[data-action="contract-arm-recommended"]');
    const activeNextRun = await page.evaluate(() => window.castleOfTheWindsWeb.getActiveContract(false)?.id || "");
    assert.equal(activeNextRun, expected);
    await page.click('[data-action="begin-adventure"]');
    await page.waitForFunction(() => {
      const game = window.castleOfTheWindsWeb;
      return game?.mode === "game" || game?.mode === "modal";
    });
    const activeCurrentRun = await page.evaluate(() => window.castleOfTheWindsWeb.getActiveContract(true)?.id || "");
    assert.equal(activeCurrentRun, expected);
  } finally {
    await page.close();
  }
});

test("telemetry meta tracks first objective pacing and post-return town follow-through", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page);
    await descendToDepthOne(page);
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      const objective = game.currentLevel.floorObjective;
      if (objective.id === "recover_relic" || objective.id === "secure_supplies") {
        const item = game.currentLevel.items.find((entry) => entry.objectiveId === objective.id);
        game.placePlayerAt(item.x, item.y);
        game.pickupHere(true, false);
        if (game.pendingPickupPrompt) {
          game.confirmPendingPickup(false);
        }
      } else {
        game.currentLevel.actors = game.currentLevel.actors.filter((actor) => actor.roomIndex !== objective.roomIndex);
        game.placePlayerAt(objective.marker.x, objective.marker.y);
        const tile = game.currentLevel.tiles[objective.marker.y * game.currentLevel.width + objective.marker.x];
        game.handleTileEntry(tile);
        if (!game.currentLevel.floorResolved) {
          game.interactHere();
        }
      }
      game.placePlayerAt(game.currentLevel.stairsUp.x, game.currentLevel.stairsUp.y);
      game.useStairs("up");
      game.showBankModal();
      const recommended = game.getRecommendedContract();
      game.setActiveContract(recommended.id);
      game.beginAdventure();
      return game.getTelemetryReviewSnapshot().meta;
    });
    assert.ok(result.averageFirstObjectiveClearTurn >= 1, `missing average first objective clear turn: ${JSON.stringify(result)}`);
    assert.ok(result.averageFirstObjectiveSearchCount >= 0, `missing average first objective search count: ${JSON.stringify(result)}`);
    assert.ok(result.bankOpensAfterReturn >= 1, `missing bank revisit after return: ${JSON.stringify(result)}`);
    assert.ok(result.contractArmsAfterReturn >= 1, `missing contract arm after return: ${JSON.stringify(result)}`);
    assert.ok(result.validationProfileCounts && Object.keys(result.validationProfileCounts).length >= 1, `missing validation profile counts: ${JSON.stringify(result)}`);
  } finally {
    await page.close();
  }
});

test("ball of fire hits grouped enemies and leaves outsiders untouched", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page, { race: "elf", classId: "wizard", name: "Rules" });
    await descendToDepthOne(page);
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      const findBlastLane = () => {
        for (let y = 2; y < game.currentLevel.height - 2; y += 1) {
          for (let x = 3; x < game.currentLevel.width - 3; x += 1) {
            let clear = true;
            for (let py = y - 1; py <= y + 1 && clear; py += 1) {
              for (let px = x - 1; px <= x + 1; px += 1) {
                const tile = game.currentLevel.tiles[py * game.currentLevel.width + px];
                if (!tile?.walkable) {
                  clear = false;
                  break;
                }
              }
            }
            const leftTile = game.currentLevel.tiles[y * game.currentLevel.width + (x - 2)];
            const farTile = game.currentLevel.tiles[y * game.currentLevel.width + (x + 2)];
            if (clear && leftTile?.walkable && farTile?.walkable) {
              return {
                center: { x, y },
                player: { x: x - 2, y },
                far: { x: x + 2, y }
              };
            }
          }
        }
        return null;
      };
      const base = game.currentLevel.actors[0];
      const lane = findBlastLane();
      const originalEndTurn = game.endTurn;
      if (!base || !lane) {
        return { ok: false, reason: "missing_setup" };
      }
      game.currentLevel.actors = [
        { ...base, id: "blast-a", x: lane.center.x, y: lane.center.y, hp: 28, maxHp: 28, sleeping: false, alerted: 8 },
        { ...base, id: "blast-b", x: lane.center.x + 1, y: lane.center.y, hp: 28, maxHp: 28, sleeping: false, alerted: 8 },
        { ...base, id: "blast-c", x: lane.center.x, y: lane.center.y + 1, hp: 28, maxHp: 28, sleeping: false, alerted: 8 },
        { ...base, id: "blast-out", x: lane.far.x, y: lane.far.y, hp: 28, maxHp: 28, sleeping: false, alerted: 8 }
      ];
      game.player.spellsKnown = [...new Set([...game.player.spellsKnown, "fireball"])];
      game.player.maxMana = Math.max(game.player.maxMana, 20);
      game.player.mana = 20;
      game.placePlayerAt(lane.player.x, lane.player.y);
      game.updateFov();
      game.endTurn = () => {
        game.turn += 1;
        game.mode = "game";
      };
      const before = Object.fromEntries(game.currentLevel.actors.map((actor) => [actor.id, actor.hp]));
      game.openSpellTray();
      game.prepareSpell("fireball");
      game.targetMode.cursor = { ...lane.center };
      const preview = game.getActiveSpellTargetPreview();
      game.confirmTargetSelection();
      const after = Object.fromEntries(game.currentLevel.actors.map((actor) => [actor.id, actor.hp]));
      game.endTurn = originalEndTurn;
      return {
        ok: true,
        previewValid: preview?.valid,
        hitCount: preview?.hitCount || 0,
        groupDamaged: ["blast-a", "blast-b", "blast-c"].every((id) => after[id] < before[id]),
        outsiderUntouched: after["blast-out"] === before["blast-out"]
      };
    });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.previewValid, true, JSON.stringify(result));
    assert.equal(result.hitCount, 3, JSON.stringify(result));
    assert.equal(result.groupDamaged, true, JSON.stringify(result));
    assert.equal(result.outsiderUntouched, true, JSON.stringify(result));
  } finally {
    await page.close();
  }
});

test("ball of fire rejects empty tiles and does not hurt the player inside the blast footprint", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page, { race: "elf", classId: "wizard", name: "Rules" });
    await descendToDepthOne(page);
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      const findBlastLane = () => {
        for (let y = 2; y < game.currentLevel.height - 2; y += 1) {
          for (let x = 4; x < game.currentLevel.width - 4; x += 1) {
            let clear = true;
            for (let py = y - 1; py <= y + 1 && clear; py += 1) {
              for (let px = x - 1; px <= x + 1; px += 1) {
                const tile = game.currentLevel.tiles[py * game.currentLevel.width + px];
                if (!tile?.walkable) {
                  clear = false;
                  break;
                }
              }
            }
            const playerTile = game.currentLevel.tiles[y * game.currentLevel.width + (x - 1)];
            const emptyTile = game.currentLevel.tiles[y * game.currentLevel.width + (x + 3)];
            if (clear && playerTile?.walkable && emptyTile?.walkable) {
              return {
                center: { x, y },
                player: { x: x - 1, y },
                empty: { x: x + 3, y }
              };
            }
          }
        }
        return null;
      };
      const base = game.currentLevel.actors[0];
      const lane = findBlastLane();
      const originalEndTurn = game.endTurn;
      if (!base || !lane) {
        return { ok: false, reason: "missing_setup" };
      }
      game.currentLevel.actors = [
        { ...base, id: "safe-a", x: lane.center.x, y: lane.center.y, hp: 28, maxHp: 28, sleeping: false, alerted: 8 },
        { ...base, id: "safe-b", x: lane.center.x + 1, y: lane.center.y, hp: 28, maxHp: 28, sleeping: false, alerted: 8 }
      ];
      game.player.spellsKnown = [...new Set([...game.player.spellsKnown, "fireball"])];
      game.player.maxMana = Math.max(game.player.maxMana, 20);
      game.player.mana = 20;
      game.placePlayerAt(lane.player.x, lane.player.y);
      game.updateFov();
      game.endTurn = () => {
        game.turn += 1;
        game.mode = "game";
      };
      const hpBefore = game.player.hp;
      game.openSpellTray();
      game.prepareSpell("fireball");
      game.targetMode.cursor = { ...lane.empty };
      const invalidPreview = game.getActiveSpellTargetPreview();
      game.confirmTargetSelection();
      const stillTargeting = game.mode === "target";
      game.targetMode.cursor = { ...lane.center };
      const validPreview = game.getActiveSpellTargetPreview();
      game.confirmTargetSelection();
      game.endTurn = originalEndTurn;
      return {
        ok: true,
        invalidReason: invalidPreview?.reason || "",
        invalidValid: invalidPreview?.valid || false,
        stillTargeting,
        validHitCount: validPreview?.hitCount || 0,
        playerHpBefore: hpBefore,
        playerHpAfter: game.player.hp
      };
    });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.invalidValid, false, JSON.stringify(result));
    assert.match(result.invalidReason, /No enemy stands in the blast|out of range|out of line/i);
    assert.equal(result.stillTargeting, true, JSON.stringify(result));
    assert.equal(result.validHitCount, 2, JSON.stringify(result));
    assert.equal(result.playerHpAfter, result.playerHpBefore, JSON.stringify(result));
  } finally {
    await page.close();
  }
});

test("spell tray persists selected quick spells across save and load", async () => {
  const page = await openPage();
  const spellIds = [...SPELL_FIXTURE];
  const trayIds = spellIds.slice(1, 9);
  try {
    await beginFreshRun(page, { race: "elf", classId: "wizard", name: "Rules" });
    const result = await page.evaluate(({ spellIds: nextSpellIds, trayIds: nextTrayIds }) => {
      const game = window.castleOfTheWindsWeb;
      game.player.spellsKnown = [...nextSpellIds];
      game.player.spellTrayIds = [...nextTrayIds];
      game.syncPlayerSpellTray(game.player);
      game.saveGame({ silent: true });
      game.player.spellTrayIds = [nextSpellIds[0]];
      game.loadGame();
      return {
        trayIds: [...game.player.spellTrayIds]
      };
    }, { spellIds, trayIds });
    assert.deepEqual(result.trayIds, trayIds);
  } finally {
    await page.close();
  }
});

test("spell tray only renders pinned quick spells", async () => {
  const page = await openPage();
  const spellIds = [...SPELL_FIXTURE];
  const trayIds = spellIds.slice(2, 10);
  try {
    await beginFreshRun(page, { race: "elf", classId: "wizard", name: "Rules" });
    const result = await page.evaluate(({ spellIds: nextSpellIds, trayIds: nextTrayIds }) => {
      const game = window.castleOfTheWindsWeb;
      game.player.spellsKnown = [...nextSpellIds];
      game.player.spellTrayIds = [...nextTrayIds];
      game.syncPlayerSpellTray(game.player);
      game.openSpellTray();
      return [...document.querySelectorAll("#spell-tray [data-action='spell-select']")].map((entry) => entry.dataset.spell);
    }, { spellIds, trayIds });
    assert.equal(result.length, 8);
    assert.deepEqual(result, trayIds);
  } finally {
    await page.close();
  }
});

test("spell tray selection keeps the tray usable and hide closes it cleanly", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page, { race: "elf", classId: "wizard", name: "Rules" });
    await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      game.player.spellsKnown = [...new Set([...game.player.spellsKnown, "fireball", "frostBolt", "lightningBolt"])];
      game.player.spellTrayIds = ["magicMissile", "frostBolt", "fireball"];
      game.syncPlayerSpellTray(game.player);
      game.openSpellTray();
    });
    await page.evaluate(() => {
      document.querySelector('#spell-tray [data-action="spell-select"][data-spell="fireball"]')?.click();
    });
    const afterSelect = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      return {
        pendingSpell: game.pendingSpell,
        trayOpen: game.spellTrayOpen,
        trayHidden: document.getElementById("spell-tray")?.classList.contains("hidden") || false
      };
    });
    await page.evaluate(() => {
      document.querySelector('#spell-tray [data-action="spell-tray-close"]')?.click();
    });
    const afterHide = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      return {
        pendingSpell: game.pendingSpell,
        trayOpen: game.spellTrayOpen,
        trayHidden: document.getElementById("spell-tray")?.classList.contains("hidden") || false
      };
    });
    assert.equal(afterSelect.pendingSpell, "fireball");
    assert.equal(afterSelect.trayOpen, true);
    assert.equal(afterSelect.trayHidden, false);
    assert.equal(afterHide.pendingSpell, "fireball");
    assert.equal(afterHide.trayOpen, false);
    assert.equal(afterHide.trayHidden, true);
  } finally {
    await page.close();
  }
});

test("magic hub sorts known spells by spell type before school and tier", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page, { race: "elf", classId: "wizard", name: "Rules" });
    const order = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      game.player.spellsKnown = [
        "runeOfReturn",
        "magicMissile",
        "healMinor",
        "lightningBolt",
        "fireball",
        "frostBolt",
        "identify"
      ];
      game.showSpellModal();
      return [...document.querySelectorAll(".magic-card-select")].map((entry) => entry.dataset.spell);
    });
    assert.deepEqual(order, [
      "fireball",
      "frostBolt",
      "lightningBolt",
      "magicMissile",
      "identify",
      "runeOfReturn",
      "healMinor"
    ]);
  } finally {
    await page.close();
  }
});

test("single click selects a spell without spending mana and double click starts casting from the book", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page, { race: "elf", classId: "wizard", name: "Rules" });
    await descendToDepthOne(page);
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      game.player.spellsKnown = [...new Set([...game.player.spellsKnown, "fireball"])];
      game.player.spellTrayIds = [...new Set([...(game.player.spellTrayIds || []), "fireball"])].slice(0, 8);
      game.syncPlayerSpellTray(game.player);
      game.player.maxMana = Math.max(game.player.maxMana, 20);
      game.player.mana = 20;
      game.showSpellModal();
      const selector = '[data-action="spell-select"][data-spell="fireball"]';
      document.querySelector(selector)?.click();
      const afterClick = {
        mana: game.player.mana,
        pendingSpell: game.pendingSpell,
        mode: game.mode
      };
      document.querySelector(selector)?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
      return {
        afterClick,
        afterDoubleClick: {
          mana: game.player.mana,
          mode: game.mode,
          targetSpell: game.targetMode?.spellId || ""
        }
      };
    });
    assert.equal(result.afterClick.pendingSpell, "fireball");
    assert.equal(result.afterClick.mana, 20);
    assert.equal(result.afterClick.mode, "modal");
    assert.equal(result.afterDoubleClick.mode, "target");
    assert.equal(result.afterDoubleClick.targetSpell, "fireball");
    assert.ok(result.afterDoubleClick.mana < 20, JSON.stringify(result));
  } finally {
    await page.close();
  }
});

test("magic book quick state updates when a different spell is selected", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page, { race: "elf", classId: "wizard", name: "Rules" });
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      game.player.spellsKnown = ["magicMissile", "fireball", "healMinor"];
      game.player.spellTrayIds = ["magicMissile", "fireball"];
      game.syncPlayerSpellTray(game.player);
      game.showSpellModal();
      const before = document.querySelector(".menu-quick-state-detail")?.textContent || "";
      document.querySelector('[data-action="spell-select"][data-spell="fireball"]')?.click();
      return {
        before,
        after: document.querySelector(".menu-quick-state-detail")?.textContent || "",
        pendingSpell: game.pendingSpell,
        activeSpellIds: [...document.querySelectorAll("[data-spell-card].active")].map((entry) => entry.dataset.spellCard)
      };
    });
    assert.match(result.before, /Magic Missile selected/i);
    assert.match(result.after, /Ball of Fire selected/i);
    assert.equal(result.pendingSpell, "fireball");
    assert.deepEqual(result.activeSpellIds, ["fireball"]);
  } finally {
    await page.close();
  }
});

test("magic filter keeps selection on a visible spell", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page, { race: "elf", classId: "wizard", name: "Rules" });
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      game.player.spellsKnown = ["magicMissile", "fireball", "healMinor", "identify"];
      game.player.spellTrayIds = ["magicMissile", "fireball"];
      game.syncPlayerSpellTray(game.player);
      game.pendingSpell = "fireball";
      game.showSpellModal();
      document.querySelector('[data-action="magic-filter"][data-filter="recovery"]')?.click();
      return {
        pendingSpell: game.pendingSpell,
        quickDetail: document.querySelector(".menu-quick-state-detail")?.textContent || "",
        activeSpellIds: [...document.querySelectorAll("[data-spell-card].active")].map((entry) => entry.dataset.spellCard),
        visibleSpellIds: [...document.querySelectorAll(".magic-card-select")].map((entry) => entry.dataset.spell)
      };
    });
    assert.equal(result.pendingSpell, "healMinor");
    assert.match(result.quickDetail, /Cure Light Wounds selected/i);
    assert.deepEqual(result.activeSpellIds, ["healMinor"]);
    assert.deepEqual(result.visibleSpellIds, ["healMinor"]);
  } finally {
    await page.close();
  }
});

test("spell study surfaces unlock timing and concrete spell effect text", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page, { race: "human", classId: "rogue", name: "Rules" });
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      game.player.className = "Rogue";
      game.player.level = 4;
      game.player.spellsKnown = ["magicMissile"];
      game.player.spellTrayIds = ["magicMissile"];
      game.syncPlayerSpellTray(game.player);
      game.pendingSpellChoices = 1;
      game.showSpellLearnModal();
      return {
        lightText: document.querySelector('[data-action="learn-spell"][data-spell="light"]')?.textContent?.replace(/\s+/g, " ").trim() || "",
        slowText: document.querySelector('[data-action="learn-spell"][data-spell="slowMonster"]')?.textContent?.replace(/\s+/g, " ").trim() || ""
      };
    });
    assert.match(result.lightText, /Available since Lv 1/i);
    assert.match(result.slowText, /Available since Lv 2/i);
    assert.match(result.slowText, /Slows one target for 5 turns/i);
  } finally {
    await page.close();
  }
});

test("light reveals nearby hidden traps and grants its sight buff", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page, { race: "human", classId: "rogue", name: "Rules" });
    await descendToDepthOne(page);
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      let target = null;
      for (let y = game.player.y - 4; y <= game.player.y + 4 && !target; y += 1) {
        for (let x = game.player.x - 4; x <= game.player.x + 4; x += 1) {
          if (x === game.player.x && y === game.player.y) {
            continue;
          }
          if (x < 1 || y < 1 || x >= game.currentLevel.width - 1 || y >= game.currentLevel.height - 1) {
            continue;
          }
          const tile = game.currentLevel.tiles[y * game.currentLevel.width + x];
          if (tile?.walkable) {
            target = { x, y, tile };
            break;
          }
        }
      }
      if (!target) {
        return { ok: false, reason: "no_target_tile" };
      }
      const index = target.y * game.currentLevel.width + target.x;
      game.currentLevel.tiles[index] = { ...target.tile, kind: "trap", hidden: true, walkable: true };
      game.player.spellsKnown = [...new Set([...game.player.spellsKnown, "light"])];
      game.player.spellTrayIds = ["light"];
      game.syncPlayerSpellTray(game.player);
      game.player.maxMana = Math.max(game.player.maxMana, 10);
      game.player.mana = 10;
      const originalEndTurn = game.endTurn;
      game.endTurn = () => {
        game.mode = "game";
      };
      game.prepareSpell("light");
      game.endTurn = originalEndTurn;
      const revealedTile = game.currentLevel.tiles[index];
      return {
        ok: true,
        hidden: Boolean(revealedTile.hidden),
        kind: revealedTile.kind,
        lightBuffTurns: game.player.lightBuffTurns
      };
    });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.kind, "trap", JSON.stringify(result));
    assert.equal(result.hidden, false, JSON.stringify(result));
    assert.equal(result.lightBuffTurns, 40, JSON.stringify(result));
  } finally {
    await page.close();
  }
});

test("legacy rune return spell ids are normalized into the spell book", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page, { race: "elf", classId: "wizard", name: "Rules" });
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      game.player.spellsKnown = ["magicMissile", "runeReturn"];
      game.player.spellTrayIds = ["runeReturn"];
      game.syncPlayerSpellTray(game.player);
      game.showSpellModal();
      return {
        knownSpellIds: [...game.player.spellsKnown],
        traySpellIds: [...game.player.spellTrayIds],
        visibleSpellIds: [...document.querySelectorAll(".magic-card-select")].map((entry) => entry.dataset.spell)
      };
    });
    assert.deepEqual(result.knownSpellIds, ["magicMissile", "runeOfReturn"]);
    assert.deepEqual(result.traySpellIds, ["runeOfReturn"]);
    assert.ok(result.visibleSpellIds.includes("runeOfReturn"), JSON.stringify(result));
  } finally {
    await page.close();
  }
});

test("save slots keep separate runs and load the requested slot", async () => {
  const page = await openPage();
  try {
    const result = await page.evaluate(() => {
      localStorage.clear();
      const game = window.castleOfTheWindsWeb;
      game.selectedRace = "elf";
      game.selectedClass = "wizard";
      game.creationStatBonuses = { str: 0, dex: 1, con: 0, int: 4 };
      game.creationName = "Slot One";
      game.beginAdventure();
      game.player.name = "Slot One";
      game.player.level = 2;
      game.saveGame({ silent: true, slotId: 1 });

      game.player.name = "Slot Two";
      game.player.level = 5;
      game.saveGame({ silent: true, slotId: 2 });

      const slotMeta = game.getAllSavedRunMeta();
      game.loadGame({ slotId: 1 });
      return {
        slots: slotMeta.map((entry) => ({
          slotId: entry.slotId,
          name: entry.meta?.name || null,
          level: entry.meta?.level || null
        })),
        loadedName: game.player.name,
        loadedLevel: game.player.level,
        activeSlotId: game.activeSaveSlotId
      };
    });
    assert.deepEqual(result.slots.filter((entry) => entry.name), [
      { slotId: 1, name: "Slot One", level: 2 },
      { slotId: 2, name: "Slot Two", level: 5 }
    ]);
    assert.equal(result.loadedName, "Slot One");
    assert.equal(result.loadedLevel, 2);
    assert.equal(result.activeSlotId, 1);
  } finally {
    await page.close();
  }
});

test("death stops the turn immediately and returns to title when dismissed", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page, { race: "dwarf", classId: "fighter", name: "Rules" });
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      const floorTile = { kind: "floor", walkable: true, transparent: true };
      game.messages = [];
      game.mode = "game";
      game.turn = 42;
      game.currentDepth = 0;
      game.currentLevel = {
        width: 3,
        height: 3,
        description: "Test Floor",
        dangerLevel: "High",
        tiles: Array.from({ length: 9 }, () => ({ ...floorTile })),
        explored: Array(9).fill(true),
        visible: Array(9).fill(true),
        actors: [
          {
            id: "killer_one",
            name: "Killer One",
            x: 2,
            y: 1,
            hp: 10,
            attack: 999,
            damage: [4, 4],
            defense: 0,
            gold: [0, 0],
            exp: 0,
            moveMeter: 100,
            sleeping: false,
            alerted: 6
          },
          {
            id: "killer_two",
            name: "Killer Two",
            x: 1,
            y: 2,
            hp: 10,
            attack: 999,
            damage: [4, 4],
            defense: 0,
            gold: [0, 0],
            exp: 0,
            moveMeter: 100,
            sleeping: false,
            alerted: 6
          }
        ],
        items: [],
        corpses: []
      };
      game.player.x = 1;
      game.player.y = 1;
      game.player.hp = 1;
      game.player.maxHp = Math.max(game.player.maxHp, 10);
      game.player.guardBrokenTurns = 0;
      game.player.held = 0;
      game.player.slowed = 0;
      game.processMonsters();
      const hitLogs = game.messages
        .filter((entry) => /hits .* for/i.test(entry.message))
        .map((entry) => entry.message);
      const modalTitle = document.getElementById("generic-modal-title")?.textContent || "";
      const closeButton = document.querySelector('[data-action="close-modal"]');
      if (closeButton instanceof HTMLButtonElement) {
        closeButton.click();
      } else {
        game.closeModal();
      }
      return {
        hp: game.player.hp,
        modeAfterDeath: game.mode === "title" ? "title" : game.mode,
        hitLogs,
        modalTitle,
        titleVisible: Boolean(document.querySelector(".title-screen"))
      };
    });
    assert.equal(result.hp, 0, JSON.stringify(result));
    assert.equal(result.modalTitle, "Fallen", JSON.stringify(result));
    assert.equal(result.hitLogs.length, 1, JSON.stringify(result));
    assert.equal(result.modeAfterDeath, "title", JSON.stringify(result));
    assert.equal(result.titleVisible, true, JSON.stringify(result));
  } finally {
    await page.close();
  }
});

test("junk shop bulk sale skips items marked do not sell", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page, { race: "dwarf", classId: "fighter", name: "Rules" });
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      game.player.gold = 0;
      game.player.inventory = [
        { id: "keep_stone", name: "Keep Stone", kind: "junk", value: 40, weight: 1, identified: true, doNotSell: true },
        { id: "sell_trinket", name: "Sell Trinket", kind: "junk", value: 30, weight: 1, identified: true, doNotSell: false },
        { id: "sell_relic", name: "Sell Relic", kind: "junk", value: 55, weight: 1, identified: true, doNotSell: false }
      ];
      game.showShopModal("junk", {
        name: "Junk Shop",
        greeting: "Trade your scraps.",
        stock: []
      }, {
        panel: "sell"
      });
      game.sellUnmarkedItems();
      return {
        gold: game.player.gold,
        inventoryNames: game.player.inventory.map((item) => item.name),
        inventoryFlags: game.player.inventory.map((item) => item.doNotSell),
        modalText: document.getElementById("generic-modal-body")?.textContent || ""
      };
    });
    assert.equal(result.gold, 50, JSON.stringify(result));
    assert.deepEqual(result.inventoryNames, ["Keep Stone"], JSON.stringify(result));
    assert.deepEqual(result.inventoryFlags, [true], JSON.stringify(result));
    assert.match(result.modalText, /Sell All Unmarked/i, JSON.stringify(result));
    assert.match(result.modalText, /Do Not Sell/i, JSON.stringify(result));
  } finally {
    await page.close();
  }
});

test("clicking the current greed tile on the canvas still resolves with the overlay-safe viewport", async () => {
  const page = await openPage();
  try {
    await beginFreshRun(page, { race: "dwarf", classId: "fighter", name: "Rules" });
    await descendToDepthOne(page);
    const result = await page.evaluate(() => {
      const game = window.castleOfTheWindsWeb;
      game.renderEventTicker();
      const anchorRow = game.getViewportAnchorRow();
      const maxVy = Math.max(0, game.currentLevel.height - 25);
      const desiredVy = Math.min(Math.max(2, Math.floor(maxVy / 2)), Math.max(0, maxVy - 1));
      game.player.x = Math.min(game.currentLevel.width - 2, Math.max(1, Math.floor(game.currentLevel.width / 2)));
      game.player.y = Math.min(game.currentLevel.height - 2, desiredVy + anchorRow);
      const tile = game.currentLevel.tiles[game.player.y * game.currentLevel.width + game.player.x];
      tile.optionalId = "cursed_cache";
      tile.label = "Test Greed";
      game.currentLevel.floorOptional = {
        id: "cursed_cache",
        label: "Test Greed",
        opened: false,
        status: "ready",
        marker: { x: game.player.x, y: game.player.y }
      };
      const optional = game.currentLevel.floorOptional;
      game.currentLevel.actors = [];
      game.currentLevel.floorResolved = true;
      game.floorResolved = true;
      game.updateFov();
      game.render();
      const rect = game.canvas.getBoundingClientRect();
      const view = game.getViewport();
      const screenRow = game.player.y - view.y;
      const tileWidth = rect.width / 25;
      const tileHeight = rect.height / 25;
      const clientX = rect.left + ((game.player.x - view.x) + 0.5) * tileWidth;
      const clientY = rect.top + ((game.player.y - view.y) + 0.5) * tileHeight;
      const beforeGreed = game.telemetry?.activeRun?.greedCount || 0;
      game.handleCanvasClick({ clientX, clientY });
      return {
        ok: true,
        opened: Boolean(optional.opened),
        greedCount: game.telemetry?.activeRun?.greedCount || 0,
        beforeGreed,
        chronicleType: game.chronicleEvents.at(-1)?.type || "",
        anchorRow,
        screenRow
      };
    });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.opened, true, JSON.stringify(result));
    assert.ok(result.greedCount > result.beforeGreed, JSON.stringify(result));
    assert.equal(result.chronicleType, "greed_choice", JSON.stringify(result));
    assert.equal(result.screenRow, result.anchorRow, JSON.stringify(result));
  } finally {
    await page.close();
  }
});
