import { spawnReinforcementWave } from "./encounters.js";

const DANGER_THRESHOLDS = [
  { min: 0, label: "Low", color: "good" },
  { min: 4, label: "Medium", color: "warning" },
  { min: 8, label: "High", color: "bad" },
  { min: 12, label: "Critical", color: "bad" }
];

const PRESSURE_LABELS = {
  Low: "Quiet for now",
  Medium: "Patrols active",
  High: "Reinforcements soon",
  Critical: "Leave now"
};

const PRESSURE_CAUSE_TEXT = {
  rest: "Resting raised pressure",
  wait: "Waiting raised pressure",
  search: "Searching raised pressure",
  altar: "The shrine bargain raised pressure",
  fountain: "The fountain use raised pressure",
  throne: "The throne answer raised pressure",
  loot: "Greedy looting raised pressure",
  greed: "Staying greedy raised pressure",
  seal_shrine: "Shrine sealed"
};

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

function getSpecialPressureLog(level, fallback) {
  return level?.floorSpecial?.pressureLog || fallback;
}

function applyBandTransition(game, previous, next) {
  if (!game.currentLevel || previous === next.label) {
    return;
  }
  if (next.label === "Medium") {
    stirVisiblePressure(game, 2);
    if (game.currentDepth > 1 && game.currentLevel.floorSpecial?.mediumBandWave) {
      const wave = spawnReinforcementWave(game, "Medium");
      game.log(wave.length > 0 ? getSpecialPressureLog(game.currentLevel, "Pressure rising: patrols start moving through the floor.") : "Pressure rising: patrols start moving through the floor.", "warning");
      return;
    }
    game.log("Pressure rising: patrols start moving through the floor.", "warning");
    return;
  }
  if (next.label === "High") {
    stirVisiblePressure(game, 3);
    if (game.currentDepth > 1) {
      const wave = spawnReinforcementWave(game, "High");
      game.log(wave.length > 0 ? getSpecialPressureLog(game.currentLevel, "Pressure spikes: the floor turns aggressive.") : "Pressure spikes: the floor turns aggressive.", "bad");
      return;
    }
    game.log("Pressure spikes: the floor turns aggressive.", "bad");
    return;
  }
  if (next.label === "Critical") {
    const wave = spawnReinforcementWave(game, "Critical");
    game.log(wave.length > 0 ? "Collapse risk: reinforcements are cutting off a clean retreat." : "Collapse risk: the halls are fully hostile now.", "bad");
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
  level.reinforcementClock = depth === 1 ? 68 : Math.max(10, 18 + depth * 2);
  level.directorFlags = {
    mediumTriggered: false,
    highTriggered: false,
    criticalTriggered: false,
    introShown: false,
    warningSix: false,
    warningThree: false
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
  const previousClock = level.reinforcementClock || 0;
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

  const contractBonus = typeof game.getContractPaceDangerBonus === "function"
    ? Math.max(0, game.getContractPaceDangerBonus(source))
    : 0;
  const rawAmount = amount + contractBonus;
  const scaledAmount = game.currentDepth === 1
    ? Math.max(0, rawAmount - (source === "objective_clear" ? 0 : 1))
    : rawAmount;
  level.dangerScore = Math.max(0, (level.dangerScore || 0) + scaledAmount);
  const band = getBandFromScore(level.dangerScore);
  level.dangerLevel = band.label;
  level.dangerTone = band.color;
  const reinforcementLoss = game.currentDepth === 1
    ? Math.max(0, scaledAmount)
    : rawAmount;
  level.reinforcementClock = Math.max(game.currentDepth === 1 ? 16 : 6, (level.reinforcementClock || 12) - reinforcementLoss);
  const turnsLost = Math.max(0, previousClock - level.reinforcementClock);
  syncDangerState(game);
  const causeText = PRESSURE_CAUSE_TEXT[source] || (source.startsWith("optional_") ? "Greed raised pressure" : "");
  if (scaledAmount > 0 && causeText) {
    const effectText = turnsLost > 0
      ? `${PRESSURE_LABELS[band.label] || band.label.toLowerCase()} ${turnsLost === 1 ? "arrives 1 turn sooner" : `arrives ${turnsLost} turns sooner`}`
      : `${PRESSURE_LABELS[band.label] || band.label.toLowerCase()} now`;
    game.log(`${causeText}: ${effectText}.`, source === "rest" || source === "search" ? "warning" : "bad");
  }
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
  if (game.currentLevel.floorSpecial?.introLog) {
    game.log(game.currentLevel.floorSpecial.introLog, "warning");
  }
  if (game.currentLevel.floorObjective?.intro) {
    game.log(game.currentLevel.floorObjective.intro, "warning");
  }
  if (game.currentDepth === 1 && !game.storyFlags?.objectiveLoopExplained) {
    game.storyFlags.objectiveLoopExplained = true;
    game.log("Orange marks the floor objective on the map. Clear it, use U on the marker when the room is ready, then choose between stairs up or one greedy detour.", "warning");
  }
}

export function markGreedAction(game, source = "greed") {
  const greedyPurseBonus = game.currentLevel?.floorResolved && game.player?.relics?.includes("greedy_purse") ? 1 : 0;
  const amount = (game.currentLevel?.floorResolved ? 2 : 1) + greedyPurseBonus;
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
  const isIntroFloor = game.currentDepth === 1;
  const timeCadence = isIntroFloor
    ? (level.floorResolved ? 20 : 30)
    : (level.floorResolved ? 10 : 15);
  if (turns > 0 && turns % timeCadence === 0) {
    increaseDanger(game, "time", isIntroFloor ? 1 : (level.floorResolved ? 2 : 1));
  }
  if (isIntroFloor) {
    if ((level.floorResolved && turns % 2 === 0) || (!level.floorResolved && turns % 3 === 0)) {
      level.reinforcementClock -= 1;
    }
  } else {
    level.reinforcementClock -= level.floorResolved ? 2 : (level.floorSpecial?.reinforcementBias ? 2 : 1);
  }
  if (level.reinforcementClock <= 6 && !level.directorFlags.warningSix) {
    level.directorFlags.warningSix = true;
    game.log(level.floorSpecial?.pressureLog || "The floor is shifting. Reinforcements are close now.", "warning");
  }
  if (level.reinforcementClock <= 3 && !level.directorFlags.warningThree) {
    level.directorFlags.warningThree = true;
    game.log("Last clean turns. Another wave is almost on top of you.", "bad");
  }
  if (level.reinforcementClock <= 0) {
    const band = level.dangerLevel || "Medium";
    const wave = spawnReinforcementWave(game, band);
    if (wave.length > 0) {
      game.log(band === "Critical" ? "Another wave is coming in. Leave now or get buried here." : "Reinforcements are entering the floor.", band === "Low" ? "warning" : "bad");
      if (game.recordChronicleEvent) {
        game.recordChronicleEvent("reinforcements", {
          band,
          count: wave.length,
          depth: game.currentDepth
        });
      }
    }
    level.reinforcementClock = isIntroFloor
      ? Math.max(18, 28 - Math.min(6, Math.floor(level.dangerScore / 4)))
      : Math.max(6, 15 - Math.min(7, Math.floor(level.dangerScore / 3)));
    level.directorFlags.warningSix = false;
    level.directorFlags.warningThree = false;
    syncDangerState(game);
  }
}

export function getDangerSummary(level) {
  if (!level || level.kind !== "dungeon") {
    return "Town is stable.";
  }
  const clock = level.reinforcementClock || 0;
  if (level.dangerLevel === "Critical") {
    return `Leave now. Another wave is about ${clock} turn${clock === 1 ? "" : "s"} away.${level.floorSpecial?.label ? ` ${level.floorSpecial.label} is amplifying the floor.` : ""}`;
  }
  if (level.dangerLevel === "High") {
    return `Reinforcements soon. Another wave is about ${clock} turn${clock === 1 ? "" : "s"} away.${level.floorSpecial?.label ? ` ${level.floorSpecial.label} is active.` : ""}`;
  }
  if (level.dangerLevel === "Medium") {
    return `Patrols are active. Another wave is about ${clock} turn${clock === 1 ? "" : "s"} away.${level.floorSpecial?.label ? ` ${level.floorSpecial.label} is in play.` : ""}`;
  }
  return "Quiet for now. The floor is readable, but it will not stay that way.";
}

export function getPressureStatus(level) {
  if (!level || level.kind !== "dungeon") {
    return {
      label: "Town Calm",
      shortLabel: "Town Calm",
      tone: "good",
      countdown: "",
      summary: "Town is stable.",
      turns: 0
    };
  }
  const turns = level.reinforcementClock || 0;
  const shortLabel = PRESSURE_LABELS[level.dangerLevel] || "Quiet";
  return {
    label: shortLabel,
    shortLabel,
    tone: level.dangerTone || "good",
    countdown: turns > 0 ? `${turns} turns` : "Soon",
    summary: getDangerSummary(level),
    turns
  };
}
