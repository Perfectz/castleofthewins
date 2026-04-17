/**
 * @module inventory-manager
 * @owns Item use, equipment, loot pickup, shopping, identification, curse removal
 * @reads game.player, game.currentLevel, game.currentDepth, game.mode
 * @mutates game.player.inventory, game.player.equipment, game.player.hp,
 *          game.player.mana, game.player.gold, game.currentLevel.items
 * @emits game.log, game.render, game.showHubModal, game.showShopModal
 */

import { SHOPS, SPELLS } from "../data/content.js";
import {
  classifyItem,
  countUnknownItems,
  createTownItem,
  curseRandomCarriedItem,
  describeItem,
  getCarryCapacity,
  getCarryWeight,
  getEncumbranceTier,
  getItemName,
  getItemValue,
  canIdentify
} from "../core/entities.js";
import { itemsAt, revealAll, revealAllSecrets } from "../core/world.js";
import { escapeHtml, removeAt, removeFromArray, removeOne, roll } from "../core/utils.js";
import { buildInventoryItemSemantics } from "./inventory-ui.js";
import { handleObjectivePickup } from "./objectives.js";
import { getShopBuyPrice, getShopSellPrice } from "./town-meta.js";

export function getPickupBurdenPreview(game, item) {
    const beforeWeight = getCarryWeight(game.player);
    const capacity = getCarryCapacity(game.player);
    const afterWeight = beforeWeight + (item.weight || 0);
    const beforeUi = game.getBurdenUiState(beforeWeight, capacity);
    const afterUi = game.getBurdenUiState(afterWeight, capacity);
    return {
      beforeWeight,
      afterWeight,
      capacity,
      beforeUi,
      afterUi,
      beforeTier: getEncumbranceTier(game.player),
      afterTier: afterWeight > capacity ? 2 : afterWeight > capacity * 0.75 ? 1 : 0
    };
  }

export function showPickupPrompt(game, item, turnPending = false) {
    const burden = game.getPickupBurdenPreview(item);
    const equipTarget = item.slot ? game.getEquipmentSlotForItem(item) : null;
    const equipped = equipTarget?.targetSlot ? game.player.equipment[equipTarget.targetSlot] : null;
    const canQuickEquip = Boolean(item.slot && (item.kind === "weapon" || item.kind === "armor") && !equipTarget?.blockedByCurse && !(equipped && equipped.cursed));
    const compareNote = equipped
      ? `Currently worn: ${game.describeItemReadout(equipped)}`
      : equipTarget?.targetSlot
        ? `Open ${game.getPackSlotDefinition(equipTarget.targetSlot).label} slot.`
        : equipTarget?.blockedByCurse
          ? `All ${game.getPackSlotDefinition(item.slot).label.toLowerCase()} slots are locked by curses.`
      : item.slot
        ? `Open ${game.getPackSlotDefinition(item.slot).label} slot.`
        : "This item will sit in your pack.";
    const semanticEntry = buildInventoryItemSemantics(game, item, -1);
    const burdenLabel = burden.afterUi.state !== burden.beforeUi.state
      ? burden.afterUi.state === "overloaded"
        ? "This will overload your carry limit."
        : burden.afterUi.state === "danger"
          ? "This pushes you into danger burden."
          : burden.afterUi.state === "warning"
            ? "This pushes you into warning burden."
            : "This is still a safe load."
      : "This is heavy enough to deserve a quick check.";
    game.pendingPickupPrompt = {
      item,
      turnPending,
      canQuickEquip
    };
    game.mode = "modal";
    game.showSimpleModal("Burden Check", `
      <div class="pickup-triage">
        <div class="pickup-triage-summary">
          <div class="pickup-triage-title">${escapeHtml(getItemName(item))}</div>
          <div class="pickup-triage-note">${escapeHtml(describeItem(item))}</div>
        </div>
        ${game.getPackRowTagMarkup(semanticEntry)}
        <div class="pickup-triage-grid">
          <div class="mini-panel"><strong>Type</strong><br>${escapeHtml(item.slot ? game.getPackSlotDefinition(item.slot).label : classifyItem(item))}</div>
          <div class="mini-panel"><strong>Weight</strong><br>${item.weight || 0}</div>
          <div class="mini-panel"><strong>Burden</strong><br>${burden.beforeWeight} / ${burden.capacity}</div>
          <div class="mini-panel"><strong>After Take</strong><br><span class="burden-${burden.afterUi.state}">${burden.afterWeight} / ${burden.capacity}</span></div>
        </div>
        <div class="text-block pickup-triage-copy">
          ${escapeHtml(burdenLabel)}<br><br>
          ${escapeHtml(compareNote)}
        </div>
        <div class="modal-actions pickup-triage-actions">
          <button class="action-button primary" data-action="pickup-confirm" type="button">Take It</button>
          ${canQuickEquip ? `<button class="action-button" data-action="pickup-equip" type="button">Take + Equip</button>` : ""}
          <button class="action-button" data-action="pickup-cancel" type="button">Leave It</button>
        </div>
      </div>
    `);
  }

export function finishPickupTurn(game, turnPending) {
    if (turnPending) {
      game.endTurn();
    } else {
      game.render();
    }
  }

export function resolvePickupItem(game, item) {
    removeFromArray(game.currentLevel.items, item);
    if (handleObjectivePickup(game, item)) {
      game.flashTile(item.x, item.y, "#9fd0ff", 170, { alpha: 0.2, rise: true });
      game.emitReadout("Objective", item.x, item.y, "#b7f0ff", 480);
      game.audio.play("good");
      return;
    }
    game.flashTile(item.x, item.y, item.kind === "quest" ? "#b7f0ff" : "#8bcde9", 170, { alpha: 0.16, rise: true });
    game.emitReadout(item.kind === "quest" ? "Runestone" : "Loot", item.x, item.y, item.kind === "quest" ? "#b7f0ff" : "#8bcde9", 420);
    game.addItemToInventory(item);
    if (item.kind === "quest") {
      game.player.quest.hasRunestone = true;
      game.log("You recover the Runestone of the Winds.", "good");
    } else {
      game.log(`You pick up ${game.describeItemReadout(item)}.`, "good");
      game.audio.play("good");
    }
    if (game.currentDepth > 0 && game.floorResolved) {
      game.markGreedAction("loot");
    }
  }

export function confirmPendingPickup(game, equipOnTake = false) {
    const prompt = game.pendingPickupPrompt;
    if (!prompt) {
      return;
    }
    const { item, turnPending, canQuickEquip } = prompt;
    game.pendingPickupPrompt = null;
    game.closeModal();
    if (!game.currentLevel.items.includes(item)) {
      game.finishPickupTurn(turnPending);
      return;
    }
    game.resolvePickupItem(item);
    if (equipOnTake && canQuickEquip) {
      const index = game.player.inventory.indexOf(item);
      if (index >= 0) {
        game.equipInventoryItem(index, { openHub: false });
      }
    }
    game.finishPickupTurn(turnPending);
  }

export function cancelPendingPickup(game) {
    const prompt = game.pendingPickupPrompt;
    if (!prompt) {
      return;
    }
    const { turnPending, item } = prompt;
    game.pendingPickupPrompt = null;
    game.closeModal();
    game.log(`You leave ${getItemName(item)} on the ground.`, "warning");
    game.finishPickupTurn(turnPending);
  }

export function pickupHere(game, silent = false, turnPending = false) {
    const items = itemsAt(game.currentLevel, game.player.x, game.player.y);
    if (items.length === 0) {
      if (!silent) {
        game.log("Nothing here to pick up.", "warning");
        game.render();
      }
      return false;
    }

    for (const item of items.slice()) {
      if (item.kind === "gold") {
        removeFromArray(game.currentLevel.items, item);
        const bonus = Object.values(game.player.equipment || {}).reduce((sum, equippedItem) => sum + (equippedItem?.goldBonus || 0), 0);
        const total = Math.round(item.amount * (1 + bonus));
        game.player.gold += total;
        game.flashTile(game.player.x, game.player.y, "#ebcf60", 160, { alpha: 0.18, rise: true });
        game.emitReadout(`+${total}g`, game.player.x, game.player.y, "#ebcf60", 420);
        game.log(`You collect ${total} gold.`, "good");
        game.audio.play("good");
        if (game.currentDepth > 0 && game.floorResolved) {
          game.markGreedAction("loot");
        }
        continue;
      }
      if (game.shouldPromptForPickup(item)) {
        game.showPickupPrompt(item, turnPending);
        game.render();
        return false;
      }
      game.resolvePickupItem(item);
    }
    game.render();
    return true;
  }

export function addItemToInventory(game, item) {
    if (item) {
      item.markedForSale = Boolean(item.markedForSale);
    }
    game.player.inventory.push(item);
  }

export function useInventoryItem(game, index) {
    const item = game.player.inventory[Number(index)];
    if (!item) {
      return;
    }
    if (item.kind === "weapon" || item.kind === "armor") {
      game.equipInventoryItem(index);
      return;
    }
    if (item.kind === "spellbook") {
      item.identified = true;
      if (!game.player.spellsKnown.includes(item.spell)) {
        game.player.spellsKnown.push(item.spell);
        game.addSpellToTrayIfSpace(item.spell);
        game.log(`You learn ${SPELLS[item.spell].name}.`, "good");
      } else {
        game.log("That spell is already known.", "warning");
      }
      removeAt(game.player.inventory, Number(index));
      game.recordTelemetry("item_used", {
        itemId: item.id || "spellbook",
        itemKind: item.kind,
        effect: "study",
        spellId: item.spell || ""
      });
      const nextSelection = game.getDefaultPackSelection(Number(index));
      game.showHubModal("pack", {
        selection: nextSelection,
        preserveScroll: true,
        focusTarget: nextSelection.type === "inventory"
          ? game.getPackItemFocusKey(nextSelection.value)
          : game.getPackSlotFocusKey(nextSelection.value)
      });
      game.render();
      return;
    }
    if (item.kind === "charged") {
      game.useChargedItem(index, item);
      return;
    }
    if (item.kind === "quest") {
      game.log("The runestone must be returned to town.", "warning");
      return;
    }

    switch (item.effect) {
      case "heal": {
        const before = game.player.hp;
        game.player.hp = Math.min(game.player.maxHp, game.player.hp + roll(2, 6));
        game.flashTile(game.player.x, game.player.y, "#8fdaa0", 190, { alpha: 0.18 });
        game.log(`You drink the potion and recover ${Math.round(game.player.hp - before)} hit points.`, "good");
        break;
      }
      case "mana": {
        const before = game.player.mana;
        game.player.mana = Math.min(game.player.maxMana, game.player.mana + roll(2, 5));
        game.flashTile(game.player.x, game.player.y, "#8bcde9", 190, { alpha: 0.18 });
        game.log(`Arcane strength returns: ${Math.round(game.player.mana - before)} mana restored.`, "good");
        break;
      }
      case "identify":
        {
          const count = game.identifyInventoryAndEquipment();
          game.log(count > 0 ? `The scroll identifies ${count} item${count === 1 ? "" : "s"}.` : "Everything you carry is already known.", "good");
        }
        break;
      case "mapping":
        revealAll(game.currentLevel);
        revealAllSecrets(game.currentLevel);
        game.log("A map unfurls across your thoughts.", "good");
        break;
      case "teleport": {
        const position = game.findSafeTile(game.currentLevel, 20);
        if (position) {
          game.player.x = position.x;
          game.player.y = position.y;
          game.addEffect({ type: "blink", x: position.x, y: position.y, color: "#ba8eff", duration: 180 });
          game.log("The scroll tears space and throws you elsewhere.", "good");
        }
        break;
      }
      case "removeCurse":
        game.log(game.removeCurses() > 0 ? "Sacred script breaks the curses on your belongings." : "The scroll finds no curse to break.", "good");
        break;
      case "runeReturn":
        if (!game.useRuneOfReturn({ source: "scroll" })) {
          return;
        }
        removeAt(game.player.inventory, Number(index));
        game.render();
        return;
        break;
      default:
        break;
    }
    game.recordTelemetry("item_used", {
      itemId: item.id || item.kind || "item",
      itemKind: item.kind || "consumable",
      effect: item.effect || ""
    });
    removeAt(game.player.inventory, Number(index));
    game.closeModal();
    game.endTurn();
  }

export function useRuneOfReturn(game, options = {}) {
    const { source = "spell" } = options;
    if (!game.player || !game.levels || game.levels.length === 0) {
      return false;
    }

    if (game.currentDepth > 0) {
      if (game.mode === "modal") {
        game.closeModal();
      }
      const previousDepth = game.currentDepth;
      const previousLevel = game.currentLevel;
      game.log("The rune begins to answer. Hold fast for 5 turns.", "warning");
      for (let i = 0; i < 5; i += 1) {
        if (!game.player || game.isPlayerDead()) {
          return true;
        }
        const hpBefore = game.player.hp;
        game.endTurn();
        if (!game.player || game.isPlayerDead() || game.currentDepth === 0) {
          return true;
        }
        if (game.player.hp < hpBefore) {
          game.log("Pain breaks the rune's cadence. The return fails.", "bad");
          return true;
        }
      }
      game.currentDepth = 0;
      game.currentLevel = game.levels[0];
      if (previousLevel) {
        game.setTownReturnStingFromLevel(previousLevel, { depth: previousDepth });
      }
      game.placePlayerAt(game.currentLevel.start.x, game.currentLevel.start.y);
      game.addEffect({ type: "blink", x: game.player.x, y: game.player.y, color: "#8bcde9", duration: 200 });
      game.flashTile(game.player.x, game.player.y, "#8bcde9", 180, { alpha: 0.16 });
      game.pulseScreen("rgba(139, 205, 233, 0.14)", 180, 0.14);
      game.refreshShopState(true);
      game.log(source === "scroll" ? "The rune of return carries you safely back to town." : "The rune folds the dungeon away and returns you to town.", "good");
      game.recordTelemetry("returned_to_town", {
        source: source === "scroll" ? "rune_scroll" : "rune_spell",
        fromDepth: previousDepth,
        floorResolved: Boolean(previousLevel?.floorResolved),
        optionalTaken: Boolean(previousLevel?.floorOptional?.opened)
      });
      if (game.player.quest.hasRunestone) {
        game.checkQuestState();
      } else {
        game.maybeShowTownStoryScene();
      }
      return true;
    }

    const targetDepth = Math.max(0, Math.min(game.player.deepestDepth || 0, game.levels.length - 1));
    if (targetDepth <= 0) {
      game.log("The rune has nowhere deeper to return you yet.", "warning");
      return false;
    }

    game.currentDepth = targetDepth;
    game.currentLevel = game.levels[targetDepth];
    game.placePlayerAt(game.currentLevel.stairsUp.x, game.currentLevel.stairsUp.y);
    game.addEffect({ type: "blink", x: game.player.x, y: game.player.y, color: "#ffd36b", duration: 200 });
    game.flashTile(game.player.x, game.player.y, "#ffd36b", 180, { alpha: 0.16 });
    game.pulseScreen("rgba(255, 211, 107, 0.14)", 180, 0.14);
    game.triggerStoryBeat(`depth-${targetDepth}`);
    game.recordTelemetry("depth_entered", {
      depth: targetDepth,
      source: source === "scroll" ? "rune_scroll" : "rune_spell",
      objectiveId: game.currentLevel.floorObjective?.id || "",
      optionalId: game.currentLevel.floorOptional?.id || ""
    });
    game.recordChronicleEvent?.("floor_enter", { label: game.currentLevel.description });
    game.noteFloorIntro?.();
    game.log(`The rune answers your memory and returns you to ${game.currentLevel.description}.`, "good");
    return true;
  }

export function useChargedItem(game, index, item) {
    if (!item.charges || item.charges <= 0) {
      game.log(`${getItemName(item)} is empty.`, "warning");
      return;
    }
    item.identified = true;
    switch (item.effect) {
      case "lightning":
        game.startTargetMode({
          type: "wand",
          name: getItemName(item, true),
          range: 8,
          callback: (target, cursor) => {
            if (!target) {
              return;
            }
            item.charges -= 1;
            game.emitCastCircle(game.player.x, game.player.y, "#b9d2ff");
            game.playProjectile(game.player, cursor, "#b9d2ff");
            game.log(`Lightning leaps from ${getItemName(item, true)}.`, "good");
            game.recordTelemetry("item_used", {
              itemId: item.id || "charged",
              itemKind: item.kind,
              effect: item.effect || "",
              targetId: target.id || ""
            });
            game.damageActor(game.player, target, roll(3, 6) + 2);
            game.closeModal();
            game.endTurn();
          }
        });
        break;
      case "slow":
        game.startTargetMode({
          type: "wand",
          name: getItemName(item, true),
          range: 8,
          callback: (target, cursor) => {
            if (!target) {
              return;
            }
            item.charges -= 1;
            target.slowed = Math.max(target.slowed || 0, 6);
            game.emitCastCircle(game.player.x, game.player.y, "#bfe3ff");
            game.playProjectile(game.player, cursor, "#bfe3ff");
            game.log(`${target.name} is slowed by a pale beam.`, "good");
            game.recordTelemetry("item_used", {
              itemId: item.id || "charged",
              itemKind: item.kind,
              effect: item.effect || "",
              targetId: target.id || ""
            });
            game.closeModal();
            game.endTurn();
          }
        });
        break;
      case "staffHeal":
        item.charges -= 1;
        game.player.hp = Math.min(game.player.maxHp, game.player.hp + roll(4, 6));
        game.emitCastCircle(game.player.x, game.player.y, "#8fdaa0");
        game.flashTile(game.player.x, game.player.y, "#8fdaa0", 180, { alpha: 0.18 });
        game.log("Healing power flows from the staff.", "good");
        game.audio.play("cast");
        game.recordTelemetry("item_used", {
          itemId: item.id || "charged",
          itemKind: item.kind,
          effect: item.effect || ""
        });
        game.closeModal();
        game.endTurn();
        break;
      default:
        return;
    }
  }

export function equipInventoryItem(game, index, options = {}) {
    const item = game.player.inventory[Number(index)];
    if (!item || !(item.kind === "weapon" || item.kind === "armor")) {
      return;
    }
    const { openHub = true } = options;
    const equipTarget = game.getEquipmentSlotForItem(item);
    const existing = equipTarget.targetSlot ? game.player.equipment[equipTarget.targetSlot] : null;
    if (equipTarget.blockedByCurse || (existing && existing.cursed)) {
      const blockedItem = existing || equipTarget.entries.find((entry) => entry.item?.cursed)?.item || null;
      if (blockedItem) {
        blockedItem.identified = true;
      }
      game.log(`${getItemName(blockedItem, true)} is cursed and will not come off.`, "bad");
      if (openHub) {
        game.showHubModal("pack", {
          selection: { type: "slot", value: equipTarget.entries.find((entry) => entry.item?.cursed)?.slot || equipTarget.entries[0]?.slot || item.slot },
          preserveScroll: true,
          focusTarget: game.getPackActionFocusKey("use", Number(index))
        });
      }
      game.render();
      return;
    }
    if (existing) {
      existing.markedForSale = false;
      game.player.inventory.push(existing);
    }
    if (!equipTarget.targetSlot) {
      return;
    }
    game.player.equipment[equipTarget.targetSlot] = item;
    item.identified = true;
    item.markedForSale = false;
    removeAt(game.player.inventory, Number(index));
    game.recalculateDerivedStats();
    game.log(`You equip ${getItemName(item, true)}.${item.cursed ? " It bites into you with a cursed grip." : ""}`, item.cursed ? "bad" : "good");
    if (openHub) {
      game.showHubModal("pack", {
        selection: { type: "slot", value: equipTarget.targetSlot },
        preserveScroll: true,
        focusTarget: game.getPackActionFocusKey("unequip", equipTarget.targetSlot)
      });
    }
    game.render();
  }

export function dropInventoryItem(game, index) {
    const item = game.player.inventory[Number(index)];
    if (!item) {
      return;
    }
    item.x = game.player.x;
    item.y = game.player.y;
    item.markedForSale = false;
    game.currentLevel.items.push(item);
    removeAt(game.player.inventory, Number(index));
    game.log(`You drop ${getItemName(item, true)}.`, "warning");
    const nextSelection = game.getDefaultPackSelection(Number(index));
    game.showHubModal("pack", {
      selection: nextSelection,
      preserveScroll: true,
      focusTarget: nextSelection.type === "inventory"
        ? game.getPackItemFocusKey(nextSelection.value)
        : game.getPackSlotFocusKey(nextSelection.value)
    });
    game.render();
  }

export function toggleInventorySaleMark(game, index, forcedValue = null) {
    const item = game.player.inventory[Number(index)];
    if (!item) {
      return;
    }
    if (item.kind === "quest") {
      game.log("Quest items cannot be marked for sale.", "warning");
      return;
    }
    const nextValue = typeof forcedValue === "boolean" ? forcedValue : !item.markedForSale;
    if (item.markedForSale === nextValue) {
      return;
    }
    item.markedForSale = nextValue;
    game.log(`${getItemName(item, true)} ${item.markedForSale ? "marked for sale" : "removed from the sale pile"}.`, item.markedForSale ? "good" : "warning");
    if (game.mode === "modal" && game.activeHubTab === "pack") {
      game.showHubModal("pack", {
        selection: { type: "inventory", value: Number(index) },
        preserveScroll: true,
        focusTarget: game.getPackActionFocusKey("mark", Number(index))
      });
    } else if (game.mode === "modal" && game.pendingShop) {
      game.showShopModal(game.pendingShop.id, game.pendingShop, {
        preserveScroll: true,
        focusTarget: game.getShopSellFocusKey(Number(index)),
        panel: "sell"
      });
    } else {
      game.render();
    }
  }

export function unequipSlot(game, slot) {
    const item = game.player.equipment[slot];
    if (!item) {
      return;
    }
    if (item.cursed) {
      item.identified = true;
      game.log(`${getItemName(item, true)} is cursed and will not come off.`, "bad");
      game.showHubModal("pack", {
        selection: { type: "slot", value: slot },
        preserveScroll: true,
        focusTarget: game.getPackActionFocusKey("unequip", slot)
      });
      game.render();
      return;
    }
    game.player.equipment[slot] = null;
    item.markedForSale = false;
    game.player.inventory.push(item);
    game.recalculateDerivedStats();
    game.log(`You stow ${getItemName(item, true)} in your pack.`, "good");
    game.showHubModal("pack", {
      selection: { type: "inventory", value: game.player.inventory.length - 1 },
      preserveScroll: true,
      focusTarget: game.getPackItemFocusKey(game.player.inventory.length - 1)
    });
    game.render();
  }

export function buyShopItem(game, shopId, itemId) {
    const item = createTownItem(itemId);
    const price = getShopBuyPrice(game, item, shopId);
    if (game.player.gold < price) {
      game.log("You cannot afford that.", "warning");
      return;
    }
    game.player.gold -= price;
    game.addItemToInventory(item);
    game.recordTelemetry("shop_buy", {
      shopId,
      itemId,
      itemKind: item.kind || "",
      price
    });
    const shop = game.shopState[shopId];
    if (shop) {
      removeOne(shop.stock, itemId);
    }
    game.log(`Purchased ${getItemName(item, true)} for ${price} gold.`, "good");
    game.showShopModal(shopId, SHOPS[shopId], {
      preserveScroll: true,
      focusTarget: game.getShopBuyFocusKey(shopId, itemId),
      panel: "buy"
    });
    game.render();
  }

export function sellShopItem(game, index) {
    const item = game.player.inventory[Number(index)];
    if (!item) {
      return;
    }
    if (game.pendingShop && game.pendingShop.id !== "junk" && !shopAcceptsItem(game.pendingShop.id, item)) {
      game.log(`${game.pendingShop.name} refuses to buy that item type.`, "warning");
      return;
    }
    const price = getShopSellPrice(game, item, game.pendingShop?.id || "");
    game.player.gold += price;
    item.identified = true;
    game.recordTelemetry("shop_sell", {
      shopId: game.pendingShop?.id || "unknown",
      itemId: item.id || item.kind || "item",
      itemKind: item.kind || "",
      price
    });
    if (game.pendingShop && game.pendingShop.id !== "junk") {
      game.shopState[game.pendingShop.id].buyback.unshift(item.id);
      game.shopState[game.pendingShop.id].buyback = game.shopState[game.pendingShop.id].buyback.slice(0, 8);
    }
    removeAt(game.player.inventory, Number(index));
    game.log(`Sold ${getItemName(item, true)} for ${price} gold.`, "good");
    if (game.pendingShop) {
      game.showShopModal(game.pendingShop.id, game.pendingShop, {
        preserveScroll: true,
        focusTarget: game.getShopSellFocusKey(Number(index)),
        panel: "sell"
      });
    } else {
      game.closeModal();
    }
    game.render();
  }

export function sellMarkedItems(game) {
    if (!game.pendingShop) {
      return;
    }
    const sellableEntries = game.player.inventory
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item?.markedForSale)
      .filter(({ item }) => game.pendingShop.id === "junk" || shopAcceptsItem(game.pendingShop.id, item));
    if (sellableEntries.length === 0) {
      game.log("Nothing marked for sale matches this shop.", "warning");
      return;
    }
    let totalGold = 0;
    sellableEntries
      .sort((a, b) => b.index - a.index)
      .forEach(({ item, index }) => {
        const price = getShopSellPrice(game, item, game.pendingShop?.id || "");
        totalGold += price;
        game.player.gold += price;
        item.identified = true;
        item.markedForSale = false;
        game.recordTelemetry("shop_sell", {
          shopId: game.pendingShop?.id || "unknown",
          itemId: item.id || item.kind || "item",
          itemKind: item.kind || "",
          price
        });
        if (game.pendingShop.id !== "junk") {
          game.shopState[game.pendingShop.id].buyback.unshift(item.id);
          game.shopState[game.pendingShop.id].buyback = game.shopState[game.pendingShop.id].buyback.slice(0, 8);
        }
        removeAt(game.player.inventory, index);
      });
    game.log(`Sold ${sellableEntries.length} marked item${sellableEntries.length === 1 ? "" : "s"} for ${totalGold} gold.`, "good");
    game.showShopModal(game.pendingShop.id, game.pendingShop, {
      preserveScroll: true,
      focusTarget: "shop:sell-marked",
      panel: "sell"
    });
    game.render();
  }

export function identifyInventoryAndEquipment(game) {
    let count = 0;
    game.player.inventory.forEach((item) => {
      if (canIdentify(item) && !item.identified) {
        item.identified = true;
        count += 1;
      }
    });
    Object.values(game.player.equipment).forEach((item) => {
      if (item && canIdentify(item) && !item.identified) {
        item.identified = true;
        count += 1;
      }
    });
    return count;
  }

export function removeCurses(game) {
    let count = 0;
    game.player.inventory.forEach((item) => {
      if (item.cursed) {
        item.cursed = false;
        item.identified = true;
        count += 1;
      }
    });
    Object.values(game.player.equipment).forEach((item) => {
      if (item && item.cursed) {
        item.cursed = false;
        item.identified = true;
        count += 1;
      }
    });
    return count;
  }
