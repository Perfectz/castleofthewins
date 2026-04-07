const DEFAULT_VALIDATION_VARIANTS = {
  onboarding: "guided_loop",
  hud: "dominant_cta",
  route: "guided_plus",
  town: "bank_first",
  contract: "recommended",
  content: "shrine_path"
};

const ALLOWED_VARIANTS = {
  onboarding: ["baseline", "guided_loop", "short_loop"],
  hud: ["baseline", "dominant_cta"],
  route: ["baseline", "guided_plus"],
  town: ["baseline", "bank_first"],
  contract: ["baseline", "recommended"],
  content: ["baseline", "shrine_path"]
};

function resolveVariant(key, rawValue) {
  const allowed = ALLOWED_VARIANTS[key] || [];
  return allowed.includes(rawValue) ? rawValue : DEFAULT_VALIDATION_VARIANTS[key];
}

function readSearchVariant(params, key) {
  return params.get(`cotw_${key}`)
    || params.get(`cotw${key[0].toUpperCase()}${key.slice(1)}`)
    || params.get(key)
    || "";
}

export function initializeValidationState(game) {
  const params = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search || "")
    : new URLSearchParams("");
  const variants = { ...DEFAULT_VALIDATION_VARIANTS };

  Object.keys(variants).forEach((key) => {
    variants[key] = resolveVariant(key, readSearchVariant(params, key));
  });

  game.validation = {
    variants,
    signature: Object.entries(variants).map(([key, value]) => `${key}:${value}`).join("|"),
    source: typeof window !== "undefined" && window.location?.search ? "query" : "default"
  };
}

export function getValidationVariant(game, key) {
  return game?.validation?.variants?.[key] || DEFAULT_VALIDATION_VARIANTS[key];
}

export function getValidationSummary(game) {
  const variants = {
    ...DEFAULT_VALIDATION_VARIANTS,
    ...(game?.validation?.variants || {})
  };
  return {
    variants,
    signature: Object.entries(variants).map(([key, value]) => `${key}:${value}`).join("|")
  };
}

export function getOnboardingVariantMeta(game) {
  const variant = getValidationVariant(game, "onboarding");
  if (variant === "baseline") {
    return {
      checklistLabel: "First Run Loop",
      steps: {
        visit_town_door: "Check Town",
        enter_keep: "Enter Keep",
        find_objective: "Find Objective",
        clear_objective: "Clear Objective",
        choose_extract_or_greed: "Choose Exit Or Greed"
      },
      firstTownPrimary: "Step onto one labeled town door once.",
      firstTownSupport: "Then take the north road into the keep.",
      enterKeepPrimary: "Take the north road and enter the keep.",
      enterKeepSupport: "Ignore extra town prep for now. The first descent is next.",
      briefingTownUnchecked: "Step onto one labeled town door, then follow the north road into the keep.",
      briefingTownChecked: "Town checked. Follow the north road when ready.",
      objectiveSearchHint: "Search once to extend the marked route.",
      townDoorPrompt: "Step onto any labeled town door once. Then take the north road."
    };
  }
  if (variant === "short_loop") {
    return {
      checklistLabel: "Run Loop",
      steps: {
        visit_town_door: "Touch Door",
        enter_keep: "Take Stairs",
        find_objective: "Follow Route",
        clear_objective: "Finish Room",
        choose_extract_or_greed: "Bank Or Greed"
      },
      firstTownPrimary: "Touch one town door, then go north.",
      firstTownSupport: "Do not over-prep. The keep is the next lesson.",
      enterKeepPrimary: "Take the keep stairs now.",
      enterKeepSupport: "Orange route first. Objective clear first. Town later.",
      briefingTownUnchecked: "Touch one town door, then go north to the keep stairs.",
      briefingTownChecked: "Town checked. Take the keep stairs next.",
      objectiveSearchHint: "If the orange line stops, Search once.",
      townDoorPrompt: "Touch one labeled town door. Then go north."
    };
  }
  return {
    checklistLabel: "First Run Route",
    steps: {
      visit_town_door: "Open Town Support",
      enter_keep: "Take Keep Stairs",
      find_objective: "Follow Orange Route",
      clear_objective: "Finish The Room",
      choose_extract_or_greed: "Bank Or Greed"
    },
    firstTownPrimary: "Open one town door to see what town can do.",
    firstTownSupport: "Then follow the north road straight into the keep.",
    enterKeepPrimary: "Town checked. Walk north and take the keep stairs.",
    enterKeepSupport: "The first lesson is objective clear, not extra shopping.",
    briefingTownUnchecked: "Open one labeled town door, then stay on the north road into the keep.",
    briefingTownChecked: "Town checked. Stay on the north road and take the keep stairs.",
    objectiveSearchHint: "If the orange route runs out, Search once to extend it.",
    townDoorPrompt: "Open any labeled town door once. Then return to the north road."
  };
}

export function getRouteExperimentTuning(game, depth = 0) {
  const variant = getValidationVariant(game, "route");
  if (variant !== "guided_plus" || depth !== 1) {
    return {
      entryRevealBonus: 0,
      searchRevealBonus: 0
    };
  }
  return {
    entryRevealBonus: 3,
    searchRevealBonus: 4
  };
}
