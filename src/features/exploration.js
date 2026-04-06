import { addCommandLog, addCommandSound, createCommandResult } from "../core/command-result.js";
import { getTile, inBounds, revealSecretTile } from "../core/world.js";
import { randInt } from "../core/utils.js";

export function performSearchCommand(game) {
  const result = createCommandResult();
  if (!game.player || game.mode !== "game") {
    return result;
  }
  game.recordTelemetry?.("search_used", {
    objectiveId: game.currentLevel?.floorObjective?.id || "",
    pressure: game.getPressureUiState?.().label || "",
    beforeObjectiveSeen: !game.currentLevel?.guidance?.objectiveSeen
  });
  const radius = game.getSearchRadiusForStats(game.player.stats);
  const searchPower = game.getSearchPower();
  let found = 0;
  for (let y = game.player.y - radius; y <= game.player.y + radius; y += 1) {
    for (let x = game.player.x - radius; x <= game.player.x + radius; x += 1) {
      if (!inBounds(game.currentLevel, x, y)) {
        continue;
      }
      const tile = getTile(game.currentLevel, x, y);
      if ((tile.kind === "trap" && tile.hidden) || tile.kind === "secretDoor" || tile.kind === "secretWall") {
        const targetNumber = tile.kind === "trap" ? 24 : 28;
        if (randInt(1, 20) + searchPower >= targetNumber) {
          revealSecretTile(game.currentLevel, x, y);
          found += 1;
        }
      }
    }
  }
  if (game.increaseDanger) {
    game.increaseDanger("search", game.currentLevel?.floorResolved ? 2 : 1);
  }
  const routeReveal = game.revealGuidedObjectiveRoute ? game.revealGuidedObjectiveRoute("search") : null;
  let message = found > 0
    ? `You discover ${found} hidden feature${found === 1 ? "" : "s"}.`
    : "You search carefully but find nothing.";
  let tone = found > 0 ? "good" : "warning";
  if (routeReveal?.revealed) {
    const routeCue = game.getObjectiveRouteHint ? game.getObjectiveRouteHint() : game.getCurrentRouteCueText ? game.getCurrentRouteCueText() : "";
    const pressureText = game.getPressureUiState ? game.getPressureUiState().shortLabel.toLowerCase() : "pressure";
    message = found > 0
      ? `${message} Searching raised pressure, but your route sketch now reaches farther ${routeReveal.direction}.`
      : routeReveal.complete
        ? `Searching raised pressure, but you map the rest of the route to the floor objective.`
        : `Searching raised pressure, but you sketch a safer route ${routeReveal.direction}.`;
    if (routeReveal.revealedRoom) {
      message = `${message} One adjacent room pocket is now clear on your map.`;
    }
    if (routeCue) {
      message = `${message} ${routeCue}`;
    }
    if (pressureText) {
      message = `${message} ${pressureText[0].toUpperCase()}${pressureText.slice(1)} now.`;
    }
    tone = "good";
  } else if (!found && routeReveal?.complete) {
    message = "You already have a clear route to the floor objective.";
  }
  addCommandLog(result, message, tone);
  addCommandSound(result, found > 0 ? "searchGood" : "search");
  result.render = true;
  return result;
}

export function useStairsCommand(game, direction) {
  const result = createCommandResult();
  const tile = getTile(game.currentLevel, game.player.x, game.player.y);
  if (direction === "down") {
    if (tile.kind !== "stairDown") {
      addCommandLog(result, "There are no stairs leading down here.", "warning");
      result.render = true;
      return result;
    }
    if (game.currentDepth > 0 && !game.currentLevel.floorResolved) {
      addCommandLog(result, "The stairs down remain sealed. Resolve this floor's objective first.", "warning");
      result.render = true;
      return result;
    }
    const nextDepth = game.currentDepth + 1;
    if (nextDepth >= game.levels.length) {
      addCommandLog(result, "No deeper path opens here.", "warning");
      result.render = true;
      return result;
    }
    game.currentDepth = nextDepth;
    game.player.deepestDepth = Math.max(game.player.deepestDepth, game.currentDepth);
    game.currentLevel = game.levels[nextDepth];
    game.placePlayerAt(game.currentLevel.stairsUp.x, game.currentLevel.stairsUp.y);
    game.markOnboarding?.("enter_keep");
    game.recordTelemetry?.("stairs_used", {
      direction: "down",
      fromDepth: nextDepth - 1,
      toDepth: nextDepth
    });
    game.recordTelemetry?.("depth_entered", {
      depth: nextDepth,
      source: "stairs_down",
      objectiveId: game.currentLevel.floorObjective?.id || "",
      optionalId: game.currentLevel.floorOptional?.id || ""
    });
    if (nextDepth === 1) {
      game.recordTelemetry?.("keep_entered", {
        objectiveId: game.currentLevel.floorObjective?.id || ""
      });
    }
    game.triggerStoryBeat(`depth-${nextDepth}`);
    game.recordChronicleEvent?.("floor_enter", { label: game.currentLevel.description });
    game.noteFloorIntro?.();
    addCommandLog(result, `You descend to ${game.currentLevel.description}.`, "warning");
    addCommandSound(result, "stairs");
    result.autosave = true;
    result.render = true;
    return result;
  }

  if (tile.kind !== "stairUp") {
    addCommandLog(result, "There are no stairs leading up here.", "warning");
    result.render = true;
    return result;
  }
  const nextDepth = game.currentDepth - 1;
  if (nextDepth < 0) {
    addCommandLog(result, "You are already in town.", "warning");
    result.render = true;
    return result;
  }
  if (game.currentDepth > 0 && game.currentLevel?.floorResolved) {
    game.markOnboarding?.("choose_extract_or_greed");
  }
  game.recordTelemetry?.("stairs_up_used", {
    fromDepth: game.currentDepth,
    floorResolved: Boolean(game.currentLevel?.floorResolved)
  });
  game.currentDepth = nextDepth;
  const previousLevel = game.levels[game.currentDepth + 1];
  if (nextDepth === 0 && previousLevel && typeof game.setTownReturnStingFromLevel === "function") {
    game.setTownReturnStingFromLevel(previousLevel, { depth: game.currentDepth + 1 });
  }
  game.currentLevel = game.levels[nextDepth];
  game.placePlayerAt(game.currentLevel.stairsDown.x, game.currentLevel.stairsDown.y);
    game.recordTelemetry?.("stairs_used", {
      direction: "up",
      fromDepth: game.currentDepth + 1,
      toDepth: nextDepth
    });
    if (nextDepth === 0) {
      game.recordTelemetry?.("returned_to_town", {
        fromDepth: game.currentDepth + 1,
        floorResolved: Boolean(previousLevel?.floorResolved),
        optionalTaken: Boolean(previousLevel?.floorOptional?.opened)
      });
      game.refreshShopState();
    if (game.player?.quest?.hasRunestone) {
      game.checkQuestState?.();
    } else {
      game.maybeShowTownStoryScene?.();
    }
    if (previousLevel?.floorResolved) {
      const returnMeta = game.recordTownReturnSummary?.(previousLevel, game.currentDepth + 1);
      if (returnMeta?.summary && game.mode !== "modal") {
        game.showExtractionSummaryModal?.(returnMeta.summary, {
          ...returnMeta,
          level: previousLevel
        });
      }
    }
  }
  game.recordTelemetry?.("depth_entered", {
    depth: nextDepth,
    source: "stairs_up",
    objectiveId: game.currentLevel.floorObjective?.id || "",
    optionalId: game.currentLevel.floorOptional?.id || ""
  });
  game.recordChronicleEvent?.("floor_enter", { label: game.currentLevel.description });
  addCommandLog(result, `You climb to ${game.currentLevel.description}.`, "warning");
  addCommandSound(result, "stairs");
  result.autosave = true;
  result.render = true;
  return result;
}
