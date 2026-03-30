import { spawnReinforcementWave } from "./encounters.js";

const DANGER_THRESHOLDS = [
  { min: 0, label: "Low", color: "good" },
  { min: 4, label: "Medium", color: "warning" },
  { min: 8, label: "High", color: "bad" },
  { min: 12, label: "Critical", color: "bad" }
];

function getBandFromScore(score) {
  let band = DANGER_THRESHOLDS[0];
  DANGER_THRESHOLDS.forEach((entry) => {
    if (score >= entry.min) {
      band = entry;
    }
  });
  return band;
}

function stirVisiblePressure(game, wakeCount = 2) {
  const sleepers = (game.currentLevel?.actors || []).filter((monster) => monster.sleeping);
  sleepers.slice(0, wakeCount).forEach((monster) => {
    monster.sleeping = false;
    monster.alerted = Math.max(monster.alerted || 0, 5);
  });
}

function applyBandTransition(game, previous, next) {
  if (!game.currentLevel || previous === next.label) {
    return;
  }
  if (next.label === "Medium") {
    stirVisiblePressure(game, 3);
    game.log("The floor starts moving in formed patrols.", "warning");
    return;
  }
  if (next.label === "High") {
    stirVisiblePressure(game, 5);
    const wave = spawnReinforcementWave(game, "High");
    if (wave.length > 0) {
      game.log("A hunter squad joins the floor. Stalling is over.", "bad");
    } else {
      game.log("The floor turns aggressive and the pressure spikes.", "bad");
    }
    return;
  }
  if (next.label === "Critical") {
    const wave = spawnReinforcementWave(game, "Critical");
    game.log(wave.length > 0 ? "Critical danger: reinforcements close off a clean retreat." : "Critical danger: the halls are openly hostile now.", "bad");
  }
}

export function initializeDangerState(level, depth) {
  if (!level || level.kind !== "dungeon") {
    return;
  }
  level.dangerScore = 0;
  level.dangerLevel = "Low";
  level.dangerTone = "good";
  level.dangerTriggers = {
    turns: 0,
    rests: 0,
    waits: 0,
    searches: 0,
    loud: 0,
    greed: 0
  };
  level.reinforcementClock = Math.max(8, 18 + depth * 2);
  level.directorFlags = {
    mediumTriggered: false,
    highTriggered: false,
    criticalTriggered: false,
    introShown: false
  };
}

export function syncDangerState(game) {
  const level = game.currentLevel;
  if (!level) {
    game.dangerLevel = "Low";
    game.dangerTriggers = null;
    game.reinforcementClock = 0;
    return;
  }
  game.dangerLevel = level.dangerLevel || "Low";
  game.dangerTriggers = level.dangerTriggers || null;
  game.reinforcementClock = level.reinforcementClock || 0;
}

export function increaseDanger(game, source = "unknown", amount = 1) {
  if (!game.currentLevel || game.currentDepth === 0) {
    return "Low";
  }
  const level = game.currentLevel;
  const previous = level.dangerLevel || "Low";
  if (!level.dangerTriggers) {
    initializeDangerState(level, game.currentDepth);
  }
  if (source === "rest") {
    level.dangerTriggers.rests += 1;
  } else if (source === "wait") {
    level.dangerTriggers.waits += 1;
  } else if (source === "search") {
    level.dangerTriggers.searches += 1;
  } else if (source.startsWith("optional_") || source === "greed") {
    level.dangerTriggers.greed += 1;
  } else {
    level.dangerTriggers.loud += 1;
  }

  level.dangerScore = Math.max(0, (level.dangerScore || 0) + amount);
  const band = getBandFromScore(level.dangerScore);
  level.dangerLevel = band.label;
  level.dangerTone = band.color;
  level.reinforcementClock = Math.max(4, (level.reinforcementClock || 10) - amount);
  syncDangerState(game);
  applyBandTransition(game, previous, band);
  return band.label;
}

export function noteFloorIntro(game) {
  if (!game.currentLevel || game.currentDepth === 0) {
    return;
  }
  const flags = game.currentLevel.directorFlags || {};
  if (flags.introShown) {
    return;
  }
  flags.introShown = true;
  game.currentLevel.directorFlags = flags;
  if (game.currentLevel.floorThemeName) {
    game.log(`${game.currentLevel.floorThemeName}: ${game.currentLevel.description}.`, "warning");
  }
  if (game.currentLevel.floorObjective?.intro) {
    game.log(game.currentLevel.floorObjective.intro, "warning");
  }
}

export function markGreedAction(game, source = "greed") {
  const amount = game.currentLevel?.floorResolved ? 2 : 1;
  return increaseDanger(game, source, amount);
}

export function advanceDangerTurn(game) {
  if (!game.currentLevel || game.currentDepth === 0) {
    return;
  }
  const level = game.currentLevel;
  if (!level.dangerTriggers) {
    initializeDangerState(level, game.currentDepth);
  }
  level.dangerTriggers.turns += 1;
  const turns = level.dangerTriggers.turns;
  if (turns > 0 && turns % (level.floorResolved ? 10 : 16) === 0) {
    increaseDanger(game, "time", level.floorResolved ? 2 : 1);
  }
  level.reinforcementClock -= level.floorResolved ? 2 : 1;
  if (level.reinforcementClock <= 0) {
    const band = level.dangerLevel || "Medium";
    const wave = spawnReinforcementWave(game, band);
    if (wave.length > 0) {
      game.log(band === "Critical" ? "The floor sends another wave. Leave or be buried here." : "Reinforcements spill into the floor.", band === "Low" ? "warning" : "bad");
      if (game.recordChronicleEvent) {
        game.recordChronicleEvent("reinforcements", {
          band,
          count: wave.length,
          depth: game.currentDepth
        });
      }
    }
    level.reinforcementClock = Math.max(4, 14 - Math.min(6, Math.floor(level.dangerScore / 2)));
    syncDangerState(game);
  }
}

export function getDangerSummary(level) {
  if (!level || level.kind !== "dungeon") {
    return "Town is stable.";
  }
  const clock = level.reinforcementClock || 0;
  if (level.dangerLevel === "Critical") {
    return `Critical danger. Reinforcements in about ${clock} turns.`;
  }
  if (level.dangerLevel === "High") {
    return `High danger. Reinforcements in about ${clock} turns.`;
  }
  if (level.dangerLevel === "Medium") {
    return `Medium danger. Patrols are awake. Reinforcements in about ${clock} turns.`;
  }
  return `Low danger. Quiet for now, but the floor will not stay that way.`;
}
