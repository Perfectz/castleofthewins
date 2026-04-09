import { mkdir, writeFile, readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const STEP_DIR = path.join(ROOT, "artifacts", "menu-performance-series", "step-05-focus-navigation-performance");
const AFTER_DIR = path.join(STEP_DIR, "screenshots", "after");
const DATA_DIR = path.join(STEP_DIR, "data");
const DEFAULT_PORT = 4198;

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
    const listenOn = (port) => {
      const handleError = (error) => {
        server.off("listening", handleListening);
        if (error?.code === "EADDRINUSE" && port !== 0) {
          listenOn(0);
          return;
        }
        reject(error);
      };
      const handleListening = () => {
        server.off("error", handleError);
        resolve();
      };
      server.once("error", handleError);
      server.once("listening", handleListening);
      server.listen(port, "127.0.0.1");
    };

    listenOn(DEFAULT_PORT);
  });

  return server;
}

async function waitForServer(url, attempts = 40) {
  for (let index = 0; index < attempts; index += 1) {
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

async function launchBrowser() {
  const attempts = [
    { name: "playwright chromium", options: { headless: true } },
    { name: "msedge", options: { channel: "msedge", headless: true } },
    { name: "chrome", options: { channel: "chrome", headless: true } }
  ];
  const failures = [];

  for (const attempt of attempts) {
    try {
      return await chromium.launch(attempt.options);
    } catch (error) {
      failures.push(`${attempt.name}: ${error.message}`);
    }
  }

  throw new Error(`Unable to launch a browser.\n${failures.join("\n")}`);
}

async function installProfiler(page) {
  await page.evaluate(() => {
    const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
    const round = (value) => (value === null || value === undefined ? null : Number(value.toFixed(2)));
    const game = () => {
      if (!window.castleOfTheWindsWeb) {
        throw new Error("Game instance is not ready.");
      }
      return window.castleOfTheWindsWeb;
    };

    const methodNames = [
      "applyControllerNavigationMetadata",
      "applyModalNavigationMetadata",
      "applyShellNavigationMetadata",
      "assignNavMetadata",
      "getUiNavigableElements",
      "getUiNavMeta",
      "findUiElementByFocusKey",
      "findDirectionalUiTarget",
      "resolveModalFocusTarget",
      "focusFirstUiElement",
      "focusUiElement",
      "showSimpleModal",
      "showUtilityMenu",
      "showHubModal",
      "showSettingsModal",
      "refreshJournalHubSection",
      "refreshMagicHubContent",
      "showShopModal",
      "updateShopModalPanel",
      "handleUiNavigationIntent"
    ];

    const callLog = [];
    const longTasks = [];
    const focusLog = [];
    const logLog = [];
    let observerInstalled = false;

    const ensureObserver = () => {
      if (observerInstalled || typeof PerformanceObserver === "undefined") {
        return;
      }
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            longTasks.push({
              name: entry.name || "longtask",
              duration: round(entry.duration),
              startTime: round(entry.startTime)
            });
          }
        });
        observer.observe({ entryTypes: ["longtask"] });
        observerInstalled = true;
      } catch {}
    };

    const summarizeCalls = (entries = []) => {
      const summary = new Map();
      entries.forEach((entry) => {
        const current = summary.get(entry.name) || { count: 0, totalMs: 0, maxMs: 0 };
        current.count += 1;
        current.totalMs += entry.duration;
        current.maxMs = Math.max(current.maxMs, entry.duration);
        summary.set(entry.name, current);
      });
      return [...summary.entries()]
        .map(([name, value]) => ({
          name,
          count: value.count,
          totalMs: round(value.totalMs),
          maxMs: round(value.maxMs)
        }))
        .sort((left, right) => right.totalMs - left.totalMs);
    };

    const countDom = (root) => (root ? root.querySelectorAll("*").length : 0);
    const countButtons = (root) => (root ? root.querySelectorAll("button").length : 0);

    const getUiSnapshot = (label = "") => {
      const instance = game();
      const modalRoot = document.getElementById("modal-root");
      const modal = modalRoot?.querySelector(".modal");
      const actionBar = document.getElementById("action-bar");
      const activeTab = modal?.querySelector(".hub-tab.active")?.textContent?.trim() || "";
      const activeSection = modal?.querySelector(".journal-section-row .hub-filter-chip.active")?.textContent?.trim() || "";
      const activeFilter = modal?.querySelector(".pack-filter-row .hub-filter-chip.active")?.textContent?.trim() || "";
      const activeElement = document.activeElement;
      const feedback = modalRoot?.querySelector(".modal-interaction-feedback");
      const navigables = typeof instance.getUiNavigableElements === "function"
        ? instance.getUiNavigableElements()
        : [];
      const zones = new Set(navigables.map((element) => element.dataset?.navZone || "").filter(Boolean));
      const focusKeys = new Set(navigables.map((element) => element.dataset?.focusKey || "").filter(Boolean));

      return {
        label,
        mode: instance.mode,
        depth: instance.currentDepth,
        modalTitle: modalRoot?.querySelector(".modal-title")?.textContent?.trim() || "",
        modalSurfaceKey: instance.modalSurfaceKey || "",
        modalVisible: Boolean(modalRoot && !modalRoot.classList.contains("hidden")),
        activeHubTab: instance.activeHubTab || "",
        activeJournalSection: instance.activeJournalSection || "",
        activePackFilter: instance.activePackFilter || "",
        activeMagicFilter: instance.activeMagicFilter || "",
        activeTabLabel: activeTab,
        activeSectionLabel: activeSection,
        activeFilterLabel: activeFilter,
        focusKey: activeElement?.dataset?.focusKey || "",
        modalNodeCount: countDom(modalRoot),
        modalButtonCount: countButtons(modalRoot),
        actionBarButtonCount: countButtons(actionBar),
        inventoryRowCount: modalRoot?.querySelectorAll(".pack-item-row").length || 0,
        spellButtonCount: modalRoot?.querySelectorAll(".magic-grid button").length || 0,
        journalLogCount: modalRoot?.querySelectorAll(".journal-log .log-line").length || 0,
        activeElement: activeElement?.dataset?.focusKey || activeElement?.id || activeElement?.tagName || "",
        navigableCount: navigables.length,
        navZoneCount: zones.size,
        focusKeyCount: focusKeys.size,
        interactionFeedbackText: feedback?.textContent?.trim() || "",
        interactionFeedbackTone: feedback?.dataset?.feedbackTone || "",
        interactionAckCount: modalRoot?.querySelectorAll(".interaction-ack").length || 0
      };
    };

    const waitUntil = async (predicate, timeoutMs = 1200) => {
      const start = performance.now();
      while (performance.now() - start < timeoutMs) {
        if (predicate()) {
          return true;
        }
        await nextFrame();
      }
      return false;
    };

    const readyPredicates = {
      title: () => game().mode === "title" && document.querySelector(".title-screen"),
      help: () => game().mode === "modal" && document.querySelector(".modal-title")?.textContent?.includes("How to Play"),
      creation: () => game().mode === "creation" && document.querySelector(".modal-title")?.textContent?.includes("Create Adventurer"),
      town: () => Boolean(game().player) && game().currentDepth === 0 && game().mode === "game" && document.getElementById("modal-root")?.classList.contains("hidden"),
      utility: () => game().mode === "modal" && game().modalSurfaceKey === "utility-menu",
      pack: () => game().mode === "modal" && game().modalSurfaceKey === "hub:pack",
      magic: () => game().mode === "modal" && game().modalSurfaceKey === "hub:magic",
      journal: () => game().mode === "modal" && game().modalSurfaceKey === "hub:journal",
      journalGuide: () => game().mode === "modal" && game().modalSurfaceKey === "hub:journal" && game().activeJournalSection === "guide",
      journalChronicle: () => game().mode === "modal" && game().modalSurfaceKey === "hub:journal" && game().activeJournalSection === "chronicle",
      settings: () => game().mode === "modal" && document.querySelector(".modal-title")?.textContent?.includes("Device Settings"),
      bank: () => game().mode === "modal" && document.querySelector(".modal-title")?.textContent?.includes("Bank"),
      shopGeneral: () => game().mode === "modal" && game().modalSurfaceKey === "shop:general",
      shopSellPanel: () => game().mode === "modal" && game().modalSurfaceKey === "shop:general" && game().activeShopPanel === "sell",
      packRowActive: () => Boolean(document.querySelector(".pack-item-row.active")),
      packFocusSecond: () => document.activeElement?.dataset?.focusKey === game().getPackItemFocusKey(1),
      packFocusMoved: () => String(document.activeElement?.dataset?.focusKey || "").startsWith("pack:item:") && document.activeElement?.dataset?.focusKey !== game().getPackItemFocusKey(0),
      packRowSecondActive: () => Boolean(document.querySelector('.pack-item-row.active[data-index="1"]')),
      packSelectionChanged: () => {
        const activeRow = document.querySelector(".pack-item-row.active");
        return Boolean(activeRow && activeRow.dataset.index !== "0");
      },
      magicIdentifyActive: () => Boolean(document.querySelector('.magic-card.active[data-spell-card="identify"]')),
      sage: () => game().mode === "modal" && document.querySelector(".modal-title")?.textContent?.includes("Sage"),
      warningLog: () => logLog.length > 0,
      modalFeedbackVisible: () => Boolean(document.querySelector(".modal-interaction-feedback")),
      modalClosedToGame: () => Boolean(game().player) && game().mode === "game" && document.getElementById("modal-root")?.classList.contains("hidden")
    };

    const triggerAction = async (trigger) => {
      if (trigger.kind === "click") {
        const element = document.querySelector(trigger.selector);
        if (!element) {
          throw new Error(`Missing click target: ${trigger.selector}`);
        }
        element.click();
        return;
      }
      if (trigger.kind === "keydown") {
        const down = new KeyboardEvent("keydown", { key: trigger.key, bubbles: true });
        const up = new KeyboardEvent("keyup", { key: trigger.key, bubbles: true });
        document.dispatchEvent(down);
        document.dispatchEvent(up);
        return;
      }
      if (trigger.kind === "direct") {
        const instance = game();
        if (trigger.action === "showBankModal") {
          instance.showBankModal();
          return;
        }
        if (trigger.action === "openTownService") {
          instance.openTownService(trigger.service);
          return;
        }
        if (trigger.action === "showSpellLearnModal") {
          instance.pendingSpellChoices = Math.max(1, Number(trigger.pendingSpellChoices || 1));
          instance.player.level = Math.max(instance.player.level || 1, Number(trigger.level || 2));
          instance.showSpellLearnModal();
          return;
        }
        if (trigger.action === "descendToDungeon") {
          if (instance.currentDepth === 0 && instance.currentLevel?.stairsDown) {
            instance.placePlayerAt(instance.currentLevel.stairsDown.x, instance.currentLevel.stairsDown.y);
            instance.useStairs("down");
            if (instance.mode === "modal" && typeof instance.closeModal === "function") {
              instance.closeModal();
            }
            instance.render();
          }
          return;
        }
        if (trigger.action === "clickMagicNextFilter") {
          const nextFilter = Array.from(document.querySelectorAll('.magic-filter-row .hub-filter-chip'))
            .find((element) => !element.classList.contains("active"));
          if (!nextFilter) {
            throw new Error("No alternate magic filter was available.");
          }
          nextFilter.click();
          return;
        }
        if (trigger.action === "clickSecondPackRow") {
          const rows = Array.from(document.querySelectorAll(".pack-item-row"));
          const nextRow = rows[1] || rows[0];
          if (!nextRow) {
            throw new Error("No pack rows were available.");
          }
          nextRow.click();
          return;
        }
        if (trigger.action === "focusBySelector") {
          const target = document.querySelector(trigger.selector);
          if (!(target instanceof HTMLElement)) {
            throw new Error(`Missing focus target: ${trigger.selector}`);
          }
          instance.focusUiElement(target);
          return;
        }
        if (trigger.action === "moveUiFocus") {
          instance.handleUiNavigationIntent(Number(trigger.dx || 0), Number(trigger.dy || 0));
          return;
        }
        if (trigger.action === "openSageLowGold") {
          instance.player.gold = Number(trigger.gold || 0);
          instance.showSageModal();
          return;
        }
        if (trigger.action === "openSettings") {
          instance.showSettingsModal();
          return;
        }
        throw new Error(`Unsupported direct action: ${trigger.action}`);
      }
      throw new Error(`Unsupported trigger kind: ${trigger.kind}`);
    };

    document.addEventListener("focusin", () => {
      focusLog.push({
        at: round(performance.now()),
        focusKey: document.activeElement?.dataset?.focusKey || document.activeElement?.id || document.activeElement?.tagName || ""
      });
    });

    const seedMenuState = () => {
      const instance = game();
      if (!instance.player) {
        throw new Error("Cannot seed menu state before a run exists.");
      }
      const inventory = instance.player.inventory;
      const ensureItem = (item) => {
        if (!inventory.some((entry) => entry.id === item.id)) {
          inventory.push(item);
        }
      };
      instance.player.gold = Math.max(instance.player.gold || 0, 420);
      instance.player.maxMana = Math.max(instance.player.maxMana || 0, 18);
      instance.player.mana = Math.max(instance.player.mana || 0, 14);
      instance.player.level = Math.max(instance.player.level || 1, 3);
      instance.player.spellsKnown = Array.from(new Set([
        ...(instance.player.spellsKnown || []),
        "magicMissile",
        "healMinor",
        "identify",
        "clairvoyance",
        "slowMonster"
      ]));

      [
        { id: "healingPotion-b", name: "Potion of Healing", kind: "consumable", effect: "heal", value: 40, rarity: 2, weight: 1, identified: true },
        { id: "manaPotion-a", name: "Potion of Mana", kind: "consumable", effect: "mana", value: 44, rarity: 2, weight: 1, identified: true },
        { id: "teleportScroll-a", name: "Scroll of Teleport", kind: "consumable", effect: "teleport", value: 70, rarity: 3, weight: 1, identified: true },
        { id: "removeCurse-a", name: "Scroll of Remove Curse", kind: "consumable", effect: "removeCurse", value: 72, rarity: 3, weight: 1, identified: true },
        { id: "mysteryBlade", name: "Knight Sword", kind: "weapon", slot: "weapon", power: 6, value: 90, rarity: 4, weight: 6, enchantment: 0, cursed: false, identified: false },
        { id: "lanternHelm", name: "Lantern Helm", kind: "armor", slot: "head", armor: 2, lightBonus: 1, value: 64, rarity: 3, weight: 3, identified: true },
        { id: "wardRing", name: "Ring of Warding", kind: "armor", slot: "ring", wardBonus: 2, value: 82, rarity: 4, weight: 1, identified: true },
        { id: "sightCloak", name: "Cloak of Survey", kind: "armor", slot: "body", armor: 1, lightBonus: 1, searchBonus: 1, value: 76, rarity: 4, weight: 2, identified: true },
        { id: "spentLightning", name: "Wand of Lightning", kind: "charged", effect: "lightning", charges: 0, maxCharges: 3, value: 88, rarity: 4, weight: 1, identified: true },
        { id: "staffHeal", name: "Staff of Healing", kind: "charged", effect: "staffHeal", charges: 2, maxCharges: 3, value: 92, rarity: 4, weight: 1, identified: true },
        { id: "bookIdentify", name: "Spellbook of Identify", kind: "spellbook", spell: "identify", value: 82, rarity: 4, weight: 1, identified: true },
        { id: "bookSlow", name: "Spellbook of Slow Monster", kind: "spellbook", spell: "slowMonster", value: 84, rarity: 4, weight: 1, identified: true },
        { id: "stoneIdol", name: "Stone Idol", kind: "junk", value: 18, rarity: 2, weight: 7, identified: true },
        { id: "silverTorque", name: "Silver Torque", kind: "junk", value: 24, rarity: 2, weight: 2, identified: true }
      ].forEach(ensureItem);

      instance.render();
      return getUiSnapshot("seeded");
    };

    const wrapGameMethods = () => {
      const instance = game();
      methodNames.forEach((name) => {
        const original = instance[name];
        if (typeof original !== "function" || original.__menuPerfWrapped) {
          return;
        }
        const wrapped = function wrappedMethod(...args) {
          const start = performance.now();
          try {
            return original.apply(this, args);
          } finally {
            callLog.push({
              name,
              duration: round(performance.now() - start),
              at: round(performance.now())
            });
          }
        };
        wrapped.__menuPerfWrapped = true;
        wrapped.__menuPerfOriginal = original;
        instance[name] = wrapped;
      });
      const wrappedLog = instance.log;
      const originalLog = wrappedLog?.__menuPerfOriginal || wrappedLog;
      if (typeof originalLog === "function" && !originalLog.__menuPerfEventWrapped) {
        const logRecorder = function wrappedLogRecorder(...args) {
          const [message = "", tone = ""] = args;
          logLog.push({
            at: round(performance.now()),
            message: String(message),
            tone: String(tone || "")
          });
          return originalLog.apply(this, args);
        };
        logRecorder.__menuPerfWrapped = true;
        logRecorder.__menuPerfOriginal = originalLog;
        logRecorder.__menuPerfEventWrapped = true;
        instance.log = logRecorder;
      }
    };

    ensureObserver();
    wrapGameMethods();

    window.__menuPerf = {
      async waitFrames(frameCount = 2) {
        for (let index = 0; index < frameCount; index += 1) {
          await nextFrame();
        }
      },
      getUiSnapshot,
      seedMenuState,
      clearLogs() {
        callLog.length = 0;
        longTasks.length = 0;
        focusLog.length = 0;
        logLog.length = 0;
      },
      async measure(label, trigger, readyKey = "", options = {}) {
        const modalRoot = document.getElementById("modal-root");
        const startCallIndex = callLog.length;
        const startLongIndex = longTasks.length;
        const startFocusIndex = focusLog.length;
        const startLogIndex = logLog.length;
        const mutationLog = [];
        const observer = new MutationObserver((records) => {
          for (const record of records) {
            mutationLog.push({
              at: performance.now(),
              type: record.type,
              added: record.addedNodes?.length || 0,
              removed: record.removedNodes?.length || 0,
              target: record.target?.nodeName || ""
            });
          }
        });
        observer.observe(document.body, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ["class", "aria-pressed", "disabled"]
        });
        const start = performance.now();
        await triggerAction(trigger);
        const handlerMs = performance.now() - start;
        const readyPredicate = readyPredicates[readyKey] || null;
        const readyResolved = readyPredicate ? await waitUntil(readyPredicate, options.timeoutMs || 1400) : true;
        const readyMs = performance.now() - start;
        await this.waitFrames(options.settleFrames || 2);
        const settledMs = performance.now() - start;
        observer.disconnect();

        const firstMutation = mutationLog[0] ? mutationLog[0].at - start : null;
        const longTaskEntries = longTasks.slice(startLongIndex);
        const focusEntries = focusLog.slice(startFocusIndex);
        const logEntries = logLog.slice(startLogIndex);
        const totalLongTaskMs = longTaskEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);

        return {
          label,
          trigger,
          readyKey,
          readyResolved,
          handlerMs: round(handlerMs),
          readyMs: round(readyMs),
          settledMs: round(settledMs),
          firstMutationMs: round(firstMutation),
          mutationCount: mutationLog.length,
          totalAddedNodes: mutationLog.reduce((sum, entry) => sum + entry.added, 0),
          totalRemovedNodes: mutationLog.reduce((sum, entry) => sum + entry.removed, 0),
          firstFocusMs: round(focusEntries[0] ? focusEntries[0].at - start : null),
          focusEventCount: focusEntries.length,
          firstLogMs: round(logEntries[0] ? logEntries[0].at - start : null),
          logEventCount: logEntries.length,
          lastLogMessage: logEntries.at(-1)?.message || "",
          lastLogTone: logEntries.at(-1)?.tone || "",
          longTaskCount: longTaskEntries.length,
          totalLongTaskMs: round(totalLongTaskMs),
          snapshot: getUiSnapshot(label),
          callSummary: summarizeCalls(callLog.slice(startCallIndex)),
          topCalls: summarizeCalls(callLog.slice(startCallIndex)).slice(0, 6),
          sampleMutations: mutationLog.slice(0, 8).map((entry) => ({
            ...entry,
            at: round(entry.at - start)
          })),
          modalHidden: Boolean(modalRoot?.classList.contains("hidden"))
        };
      }
    };
  });
}

async function takeScreenshot(page, fileName) {
  await page.screenshot({
    path: path.join(AFTER_DIR, fileName),
    fullPage: true
  });
}

async function runBaseline(page) {
  const measurements = [];
  const screenshots = [];

  const record = async (label, trigger, readyKey, screenshotName = "", options = {}) => {
    const result = await page.evaluate(
      ([nextLabel, nextTrigger, nextReadyKey, nextOptions]) => window.__menuPerf.measure(nextLabel, nextTrigger, nextReadyKey, nextOptions),
      [label, trigger, readyKey, options]
    );
    measurements.push(result);
    if (screenshotName) {
      await takeScreenshot(page, screenshotName);
      screenshots.push({
        label,
        file: `screenshots/after/${screenshotName}`,
        modalTitle: result.snapshot?.modalTitle || "",
        modalSurfaceKey: result.snapshot?.modalSurfaceKey || "",
        readyMs: result.readyMs
      });
    }
    return result;
  };

  await record("title_to_creation_open", { kind: "click", selector: '[data-action="new-game"]' }, "creation");
  await record("creation_to_town_start", { kind: "click", selector: '[data-action="begin-adventure"]' }, "town", "", { settleFrames: 3 });

  await page.evaluate(() => window.__menuPerf.seedMenuState());

  await record("utility_menu_open_town", { kind: "click", selector: "#utility-menu-button" }, "utility", "01-utility-menu.png");
  await record("utility_to_journal_open", { kind: "click", selector: '[data-action="open-hub"][data-tab="journal"]' }, "journal", "02-journal-current.png");
  await record("journal_section_switch_chronicle", { kind: "click", selector: '[data-action="journal-section"][data-section="chronicle"]' }, "journalChronicle", "03-journal-chronicle.png");
  await record("journal_to_pack_tab_switch", { kind: "click", selector: '[data-action="open-hub"][data-tab="pack"]' }, "pack", "04-pack.png");
  await record("pack_focus_first_item", { kind: "direct", action: "focusBySelector", selector: '[data-action="inspect-pack-item"][data-index="0"]' }, "packRowActive");
  await record("pack_focus_move_down", { kind: "direct", action: "moveUiFocus", dx: 0, dy: 1 }, "packFocusMoved");
  await record("pack_select_second_item", { kind: "direct", action: "clickSecondPackRow" }, "packSelectionChanged");
  await record("pack_to_magic_tab_switch", { kind: "click", selector: '[data-action="open-hub"][data-tab="magic"]' }, "magic", "05-magic.png");
  await record("magic_filter_switch_next", { kind: "direct", action: "clickMagicNextFilter" }, "magic", "06-magic-filtered.png");
  await record("magic_focus_move_down", { kind: "direct", action: "moveUiFocus", dx: 0, dy: 1 }, "magic");
  await record("magic_escape_close", { kind: "keydown", key: "Escape" }, "modalClosedToGame");

  await record("provisioner_open_direct", { kind: "direct", action: "openTownService", service: "general" }, "shopGeneral", "07-provisioner-buy.png");
  await record("provisioner_panel_switch_sell", { kind: "click", selector: '[data-action="shop-panel"][data-panel="sell"]' }, "shopSellPanel", "08-provisioner-sell.png");
  await record("provisioner_escape_close", { kind: "keydown", key: "Escape" }, "modalClosedToGame");

  await record("settings_open_direct", { kind: "direct", action: "openSettings" }, "settings", "09-settings.png");
  await record("settings_focus_move_down", { kind: "direct", action: "moveUiFocus", dx: 0, dy: 1 }, "settings");
  await record("settings_escape_close", { kind: "keydown", key: "Escape" }, "modalClosedToGame");

  await record("sage_open_low_gold", { kind: "direct", action: "openSageLowGold", gold: 0 }, "sage", "10-sage-low-gold.png");
  await record("sage_identify_blocked", { kind: "click", selector: '[data-action="service-use"][data-service="identifyAll"]' }, "warningLog", "11-sage-blocked.png");

  const finalSnapshot = await page.evaluate(() => window.__menuPerf.getUiSnapshot("final"));
  return { measurements, screenshots, finalSnapshot };
}

async function main() {
  await mkdir(AFTER_DIR, { recursive: true });
  await mkdir(DATA_DIR, { recursive: true });

  let server = null;
  let browser = null;

  try {
    server = await createStaticServer(ROOT);
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : DEFAULT_PORT;
    const url = `http://127.0.0.1:${port}/index.html`;
    await waitForServer(url);

    browser = await launchBrowser();
    const page = await browser.newPage({
      viewport: { width: 393, height: 852 },
      deviceScaleFactor: 2
    });

    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForFunction(() => Boolean(window.castleOfTheWindsWeb));
    await installProfiler(page);

    const results = await runBaseline(page);
    const payload = {
      generatedAt: new Date().toISOString(),
      url,
      viewport: { width: 393, height: 852, deviceScaleFactor: 2 },
      results
    };

    await writeFile(path.join(DATA_DIR, "after-raw-metrics.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log(path.join(DATA_DIR, "after-raw-metrics.json"));
  } finally {
    if (browser) {
      await browser.close();
    }
    if (server) {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
