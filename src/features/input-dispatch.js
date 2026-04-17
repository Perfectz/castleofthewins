/**
 * @module input-dispatch
 * @owns Central keydown dispatch
 * @reads game.mode, game.player, game.mapDrawer, game.mapDrawerOpen
 * @mutates Game via public methods (no direct state writes)
 *
 * Extracted from src/game.js. Preserves every mode-based early-return and
 * preventDefault() call byte-for-byte \u2014 only `this.*` references were
 * rewritten to `game.*`. Movement, targeting, and shortcut keys all
 * retain their existing behaviour.
 */
import { DIRECTIONS } from "../core/constants.js";

export function dispatchKeydown(game, event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    game.saveGame();
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "l") {
    event.preventDefault();
    game.loadGame();
    return;
  }

  if (game.handleTopMusicButtonKeydown(event)) {
    return;
  }

  if (game.mode === "title") {
    if (event.key === "Enter") {
      event.preventDefault();
      game.resetCreationDraft();
      game.showCreationModal();
    }
    if (event.key.toLowerCase() === "l") {
      event.preventDefault();
      game.loadGame();
    }
    return;
  }

  if (game.mode === "creation") {
    if (event.key === "Enter") {
      game.beginAdventure();
    }
    return;
  }

  if (game.mode === "levelup") {
    return;
  }

  if (game.mode === "modal") {
    if (event.key === "Escape") {
      if (game.isPlayerDead()) {
        return;
      }
      if (game.pendingPickupPrompt) {
        game.cancelPendingPickup();
      } else {
        game.closeModal();
      }
    }
    return;
  }

  if (game.mode === "target") {
    const lowerTarget = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (DIRECTIONS[lowerTarget]) {
      event.preventDefault();
      const [dx, dy] = DIRECTIONS[lowerTarget];
      game.moveTargetCursor(dx, dy);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      game.confirmTargetSelection();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      game.cancelTargetMode();
    }
    return;
  }

  if (!game.player || game.mode !== "game" || game.isPlayerDead()) {
    return;
  }

  const lower = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (event.shiftKey && lower === "r") {
    event.preventDefault();
    game.sleepUntilRestored();
    return;
  }

  if (DIRECTIONS[lower]) {
    event.preventDefault();
    const [dx, dy] = DIRECTIONS[lower];
    game.setHeldMovement("keyboard", dx, dy, lower);
    if (!event.repeat) {
      game.handleMovementIntent(dx, dy);
      game.scheduleHeldMovementRepeat("keyboard");
    }
    return;
  }

  game.resetMovementCadence();
  if (event.key === "Escape") {
    event.preventDefault();
    if (game.handleControllerBackAction()) {
      game.render();
    }
    return;
  }
  switch (lower) {
    case ".":
    case "5":
    case " ":
      event.preventDefault();
      game.performWait();
      break;
    case "m":
      event.preventDefault();
      if (game.mapDrawer && game.mapDrawerOpen) {
        game.mapDrawerOpen = false;
        game.refreshChrome();
      } else {
        game.focusMap();
      }
      break;
    case "i":
      event.preventDefault();
      game.showInventoryModal();
      break;
    case "s":
      event.preventDefault();
      if (event.shiftKey) {
        game.showSpellModal();
      } else {
        game.openSpellTray();
      }
      break;
    case ">":
      event.preventDefault();
      game.useStairs("down");
      break;
    case "<":
      event.preventDefault();
      game.useStairs("up");
      break;
    case "g":
      event.preventDefault();
      game.pickupHere();
      break;
    case "r":
      event.preventDefault();
      game.restUntilSafe();
      break;
    case "h":
      event.preventDefault();
      game.showHelpModal();
      break;
    case "u":
    case "v":
      event.preventDefault();
      game.interactHere();
      break;
    case "f":
      event.preventDefault();
      game.performSearch();
      break;
    default:
      break;
  }
}
