import { addCommandLog, addCommandSound, createCommandResult } from "../core/command-result.js";
import { getTile, inBounds, revealSecretTile } from "../core/world.js";
import { randInt } from "../core/utils.js";
import { getBuildSearchBonus } from "./builds.js";

export function performSearchCommand(game) {
  const result = createCommandResult();
  if (!game.player || game.mode !== "game") {
    return result;
  }
  const radius = game.getSearchRadiusForStats(game.player.stats);
  const searchPower = game.getSearchPowerForStats(game.player.stats, game.player.level) + getBuildSearchBonus(game);
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
  addCommandLog(result, found > 0 ? `You discover ${found} hidden feature${found === 1 ? "" : "s"}.` : "You search carefully but find nothing.", found > 0 ? "good" : "warning");
  addCommandSound(result, found > 0 ? "searchGood" : "search");
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
  game.currentDepth = nextDepth;
  game.currentLevel = game.levels[nextDepth];
  game.placePlayerAt(game.currentLevel.stairsDown.x, game.currentLevel.stairsDown.y);
  if (nextDepth === 0) {
    game.refreshShopState(true);
  }
  game.recordChronicleEvent?.("floor_enter", { label: game.currentLevel.description });
  addCommandLog(result, `You climb to ${game.currentLevel.description}.`, "warning");
  addCommandSound(result, "stairs");
  result.autosave = true;
  result.render = true;
  return result;
}
