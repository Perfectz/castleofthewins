/**
 * @module action-dispatch
 * @owns Central click/keybind action dispatch
 * @reads game state via passed Game instance
 * @mutates Game via public methods (no direct state writes)
 *
 * Extracted from src/game.js. The dispatch preserves every existing
 * data-action case byte-for-byte — only `this.*` references were rewritten
 * to `game.*`. This keeps the harness's selectors stable and avoids any
 * behaviour drift. Add new feature modules here one group at a time.
 */
import { getTile } from "../core/world.js";
import { buildInventoryPresentationModel } from "./inventory-ui.js";
import { buyTownRumor, purchaseTownUnlock } from "./town-meta.js";

export function dispatchAction(game, actionName, element) {
  if (game.isPlayerDead() && !["new-game", "load-game", "close-modal"].includes(actionName)) {
    return;
  }
  game.resetMovementCadence({ clearHeld: false });
  switch (actionName) {
    case "new-game":
      game.resetCreationDraft();
      game.showCreationModal();
      break;
    case "save-game": {
      const requestedSlot = Number(element?.dataset?.saveSlot || 0) || null;
      if (requestedSlot) {
        game.saveGame({ slotId: requestedSlot });
        game.showSaveSlotsModal("save", {
          preserveScroll: true,
          focusTarget: `save-slots:save:${requestedSlot}`
        });
        break;
      }
      game.showSaveSlotsModal("save", {
        preserveScroll: game.mode === "modal",
        focusTarget: element?.dataset?.focusKey || null
      });
      break;
    }
    case "load-game": {
      const requestedSlot = Number(element?.dataset?.saveSlot || 0) || null;
      if (!requestedSlot) {
        game.showSaveSlotsModal("load", {
          preserveScroll: game.mode === "modal" || game.mode === "title",
          focusTarget: element?.dataset?.focusKey || null
        });
        break;
      }
      if (game.mode === "title") {
        game.recordTelemetry("title_continue_used", {
          hasSave: Boolean(game.getSavedRunMeta(requestedSlot)),
          slotId: requestedSlot
        });
      }
      game.loadGame({ slotId: requestedSlot });
      break;
    }
    case "select-save-slot": {
      const requestedSlot = Number(element?.dataset?.saveSlot || 0) || null;
      const saveMode = element?.dataset?.saveMode === "save" ? "save" : "load";
      if (!requestedSlot) {
        break;
      }
      game.activeSaveSlotId = requestedSlot;
      game.showSaveSlotsModal(saveMode, {
        preserveScroll: true,
        focusTarget: `save-slots:slot:${saveMode}:${requestedSlot}`
      });
      break;
    }
    case "toggle-music":
      game.toggleMusicPreference();
      break;
    case "export-telemetry":
      game.exportTelemetryTrace();
      break;
    case "open-hub": {
      const tab = element && element.dataset.tab ? element.dataset.tab : "pack";
      const journalSection = element?.dataset?.journalSection || null;
      if (tab === "pack" && element?.dataset?.filter) {
        game.activePackFilter = element.dataset.filter;
        const inventoryModel = buildInventoryPresentationModel(this, {
          filter: game.activePackFilter,
          selectedIndex: game.activePackSelection?.type === "inventory" ? game.activePackSelection.value : -1,
          shopId: game.getCurrentPackShopContext()
        });
        if (inventoryModel.firstVisibleIndex >= 0) {
          game.setPackSelection({ type: "inventory", value: inventoryModel.firstVisibleIndex });
        }
      }
      game.showHubModal(tab, {
        preserveScroll: game.mode === "modal",
        focusTarget: tab === "journal" && journalSection
          ? game.getJournalSectionFocusKey(journalSection)
          : element
            ? game.getHubTabFocusKey(tab)
            : null,
        journalSection
      });
      break;
    }
    case "journal-section":
      game.activeJournalSection = game.getResolvedJournalSection(element?.dataset?.section || "current");
      if (!game.refreshJournalHubSection(game.getJournalSectionFocusKey(game.activeJournalSection), {
        preserveScroll: true,
        fallbackFocus: true
      })) {
        game.showHubModal("journal", {
          preserveScroll: true,
          focusTarget: game.getJournalSectionFocusKey(game.activeJournalSection),
          journalSection: game.activeJournalSection
        });
      }
      break;
    case "open-spell-tray":
      game.openSpellTray();
      break;
    case "inventory":
      game.showInventoryModal();
      break;
    case "open-character-sheet":
      game.showCharacterSheet(game.getUtilityModalReturnOptions("utility:stats"));
      break;
    case "spells":
      game.showSpellModal();
      break;
    case "wait":
      game.performWait();
      break;
    case "stairs-or-wait": {
      const tile = game.currentLevel && game.player ? getTile(game.currentLevel, game.player.x, game.player.y) : null;
      if (tile?.kind === "stairDown") {
        game.useStairs("down");
        break;
      }
      if (tile?.kind === "stairUp") {
        game.useStairs("up");
        break;
      }
      game.performWait();
      break;
    }
    case "rest":
      game.restUntilSafe();
      break;
    case "sleep":
      game.sleepUntilRestored();
      break;
    case "help":
      game.showHelpModal(game.getUtilityModalReturnOptions("utility:help"));
      break;
    case "open-briefing":
      game.showBriefingModal(game.getUtilityModalReturnOptions("utility:briefing"));
      break;
    case "open-bank":
      game.showBankModal({
        focusTarget: game.getTownActionFocusKey("rumor")
      });
      game.render();
      break;
    case "settings":
      game.showSettingsModal(game.getUtilityModalReturnOptions("utility:settings"));
      break;
    case "open-utility-menu":
      game.showUtilityMenu();
      break;
    case "controller-back":
      game.handleControllerBackAction();
      break;
    case "toggle-utility-more":
      if (game.modalSurfaceKey === "utility-menu") {
        game.setUtilityMenuSecondaryExpanded(!game.utilityMenuSecondaryExpanded, {
          focusTarget: game.utilityMenuSecondaryExpanded ? "utility:more-toggle" : "utility:map",
          fallbackFocus: true
        });
      }
      break;
    case "open-town-service":
      game.openTownService(element.dataset.service);
      break;
    case "view-map":
      if (game.mode === "modal" && !game.pendingPickupPrompt) {
        game.closeModal();
      }
      game.focusMap();
      break;
    case "toggle-map":
      if (game.layoutMode === "desktop") {
        game.mapDrawerOpen = !game.mapDrawerOpen;
        game.refreshChrome();
        if (game.mapDrawerOpen) {
          game.queueAnimationFrame(() => game.focusMap());
        }
      } else if (game.mapDrawer) {
        game.mapDrawerOpen = !game.mapDrawerOpen;
        game.refreshChrome();
      } else {
        game.mapDrawerOpen = !game.mapDrawerOpen;
        if (game.appShell) {
          game.appShell.classList.toggle("mobile-map-open", game.mapDrawerOpen);
        }
        game.refreshChrome();
        if (game.mapDrawerOpen) {
          game.focusMap();
        }
      }
      break;
    case "begin-adventure":
      game.beginAdventure();
      break;
    case "creation-reset-stats":
      game.captureCreationDraft();
      game.creationStatBonuses = { str: 0, dex: 0, con: 0, int: 0 };
      game.showCreationModal({
        preserveScroll: true,
        focusTarget: "creation:reset-stats"
      });
      break;
    case "creation-adjust-stat":
      game.captureCreationDraft();
      if (game.adjustCreationStat(element.dataset.stat, Number(element.dataset.delta))) {
        game.showCreationModal({
          preserveScroll: true,
          focusTarget: `creation:stat:${element.dataset.stat}:${element.dataset.delta === "-1" ? "down" : "up"}`
        });
      }
      break;
    case "close-modal":
      if (game.pendingPickupPrompt) {
        game.cancelPendingPickup();
        break;
      }
      game.closeModal();
      break;
    case "pickup-confirm":
      game.confirmPendingPickup(false);
      break;
    case "pickup-equip":
      game.confirmPendingPickup(true);
      break;
    case "pickup-cancel":
      game.cancelPendingPickup();
      break;
    case "item-use":
      game.useInventoryItem(element.dataset.index);
      break;
    case "item-drop":
      game.dropInventoryItem(element.dataset.index);
      break;
    case "toggle-do-not-sell":
      game.toggleInventoryDoNotSell(
        element.dataset.index,
        element instanceof HTMLInputElement && element.type === "checkbox" ? element.checked : null
      );
      break;
    case "inspect-pack-item":
      game.refreshPackHub({
        selection: { type: "inventory", value: Number(element.dataset.index) },
        preserveScroll: true,
        focusTarget: game.getPackItemFocusKey(Number(element.dataset.index))
      });
      break;
    case "inspect-slot":
      game.refreshPackHub({
        selection: { type: "slot", value: element.dataset.slot },
        preserveScroll: true,
        focusTarget: game.getPackSlotFocusKey(element.dataset.slot)
      });
      break;
    case "unequip-slot":
      game.unequipSlot(element.dataset.slot);
      break;
    case "pack-filter": {
      const nextFilter = element.dataset.filter || "all";
      // Short-circuit: clicking the already-active filter shouldn't rebuild the hub.
      if (game.activePackFilter === nextFilter) {
        break;
      }
      game.activePackFilter = nextFilter;
      if (game.player) {
        if (game.activePackFilter === "equip") {
          game.setPackSelection(game.getDefaultEquipmentPackSelection());
        } else {
          const inventoryModel = buildInventoryPresentationModel(this, {
            filter: game.activePackFilter,
            selectedIndex: game.activePackSelection?.type === "inventory" ? game.activePackSelection.value : -1,
            shopId: game.getCurrentPackShopContext()
          });
          if (inventoryModel.firstVisibleIndex >= 0) {
            game.setPackSelection({ type: "inventory", value: inventoryModel.firstVisibleIndex });
          }
        }
      }
      game.refreshPackHub({
        preserveScroll: true,
        focusTarget: game.getPackFilterFocusKey(game.activePackFilter)
      });
    }
      break;
    case "magic-filter": {
      const nextMagicFilter = element.dataset.filter || "all";
      // Short-circuit: same filter = no rebuild.
      if (game.activeMagicFilter === nextMagicFilter) {
        break;
      }
      game.activeMagicFilter = nextMagicFilter;
      game.pendingSpell = game.getMagicSelectedSpellId(game.getMagicSpellListState(game.activeMagicFilter));
      game.modalRoot?.querySelectorAll('.magic-filter-row [data-action="magic-filter"][data-filter]').forEach((button) => {
        button.classList.toggle("active", button.dataset.filter === game.activeMagicFilter);
      });
      game.refreshMagicHubContent(game.getMagicFilterFocusKey(game.activeMagicFilter), {
        preserveScroll: true,
        fallbackFocus: true,
        sections: ["summary", "list", "result"]
      });
      break;
    }
    case "spell-learn-filter":
      game.activeSpellLearnFilter = element.dataset.filter || "all";
      game.showSpellLearnModal();
      break;
    case "learn-spell":
      game.learnLevelUpSpell(element.dataset.spell);
      break;
    case "choose-reward":
      game.chooseRewardChoice(element.dataset.reward);
      break;
    case "spell-select":
      game.selectSpell(element.dataset.spell, {
        openTray: element.dataset.surface === "tray",
        focusTarget: element.dataset.focusKey || game.getSpellBookFocusKey(element.dataset.spell || "")
      });
      break;
    case "spell-cast":
      game.selectSpell(element.dataset.spell, {
        openTray: true,
        focusTarget: element.dataset.focusKey || game.getSpellBookFocusKey(element.dataset.spell || "")
      });
      game.prepareSpell(element.dataset.spell);
      break;
    case "spell-pin-toggle": {
      const spellId = element.dataset.spell || "";
      const changed = game.getPinnedSpellIds().includes(spellId)
        ? game.unpinSpellFromTray(spellId)
        : game.pinSpellToTray(spellId);
      if (changed) {
        game.refreshMagicHub(game.getSpellBookFocusKey(spellId));
      }
      break;
    }
    case "spell-pin-up":
      if (game.moveTraySpell(element.dataset.spell || "", -1)) {
        game.refreshMagicHub(game.getSpellBookFocusKey(element.dataset.spell || ""));
      }
      break;
    case "spell-pin-down":
      if (game.moveTraySpell(element.dataset.spell || "", 1)) {
        game.refreshMagicHub(game.getSpellBookFocusKey(element.dataset.spell || ""));
      }
      break;
    case "spell-tray-close":
      game.closeSpellTray();
      break;
    case "shop-buy":
      game.buyShopItem(
        element.dataset.shop || game.pendingShop?.id || "",
        element.dataset.item || (game.shopBrowseState?.kind === "buy" ? game.shopBrowseState.value : "")
      );
      break;
    case "shop-buy-equip":
      game.buyShopItem(
        element.dataset.shop || game.pendingShop?.id || "",
        element.dataset.item || (game.shopBrowseState?.kind === "buy" ? game.shopBrowseState.value : ""),
        { equipOnBuy: true }
      );
      break;
    case "shop-sell":
      game.sellShopItem(
        element.dataset.index !== undefined
          ? element.dataset.index
          : (game.shopBrowseState?.kind === "sell" ? game.shopBrowseState.value : -1)
      );
      break;
    case "shop-select-buy":
      game.shopBrowseState = {
        kind: "buy",
        value: String(element.dataset.item || "")
      };
      if (game.pendingShop) {
        game.updateShopModalPanel(element.dataset.focusKey || game.getShopBuyFocusKey(game.pendingShop.id, game.shopBrowseState.value), {
          preserveScroll: true,
          fallbackFocus: true
        });
      }
      break;
    case "shop-select-sell":
      game.shopBrowseState = {
        kind: "sell",
        value: Number(element.dataset.index)
      };
      if (game.pendingShop) {
        game.updateShopModalPanel(element.dataset.focusKey || game.getShopSellFocusKey(game.shopBrowseState.value), {
          preserveScroll: true,
          fallbackFocus: true
        });
      }
      break;
    case "shop-panel":
      game.activeShopPanel = element.dataset.panel === "sell" ? "sell" : "buy";
      if (game.pendingShop) {
        game.updateShopModalPanel(game.getShopPanelFocusKey(game.activeShopPanel), {
          preserveScroll: true,
          fallbackFocus: true
        });
      }
      break;
    case "shop-sell-unmarked":
      game.sellUnmarkedItems();
      break;
    case "bank-deposit":
      game.handleBank("deposit");
      break;
    case "bank-withdraw":
      game.handleBank("withdraw");
      break;
    case "town-unlock":
      if (purchaseTownUnlock(this, element.dataset.unlock)) {
        game.showBankModal({
          preserveScroll: true,
          focusTarget: game.getTownUnlockFocusKey(element.dataset.unlock)
        });
        game.render();
      }
      break;
    case "town-rumor":
      if (buyTownRumor(this)) {
        game.showBankModal({
          preserveScroll: true,
          focusTarget: game.getTownActionFocusKey("rumor")
        });
        game.render();
      }
      break;
    case "contract-toggle":
      if (game.setActiveContract(element.dataset.contract || "")) {
        game.showBankModal({
          preserveScroll: true,
          focusTarget: `contract:${element.dataset.contract || "clear"}`
        });
        game.render();
      }
      break;
    case "contract-arm-recommended": {
      const recommendation = game.getRecommendedContract();
      if (game.mode === "creation") {
        game.captureCreationDraft();
      }
      if (recommendation?.id && game.setActiveContract(recommendation.id)) {
        if (game.mode === "creation") {
          game.showCreationModal({
            preserveScroll: true,
            focusTarget: "creation:contract:recommended"
          });
        } else if (game.mode === "title") {
          game.showTitleScreen();
        } else {
          game.showBankModal({
            preserveScroll: true,
            focusTarget: `contract:${recommendation.id}`
          });
        }
        game.render();
      }
      break;
    }
    case "service-use":
      if (!game.pendingService && game.currentDepth === 0 && element?.dataset?.service) {
        game.openTownService(element.dataset.service);
        break;
      }
      game.useService(element.dataset.service);
      break;
    case "interact":
      game.interactHere();
      break;
    case "search":
      game.performSearch();
      break;
    case "pickup":
      game.pickupHere(false, false);
      break;
    case "stairs-up":
      game.useStairs("up");
      break;
    case "stairs-down":
      game.useStairs("down");
      break;
    case "map-focus":
      game.focusMap();
      break;
    case "setting-toggle":
      game.toggleSetting(element.dataset.setting);
      break;
    case "target-confirm":
      game.confirmTargetSelection();
      break;
    case "target-cancel":
      game.cancelTargetMode();
      break;
    default:
      break;
  }
}
