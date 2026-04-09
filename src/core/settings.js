import { SETTINGS_KEY } from "./constants.js";

export function defaultSettings() {
  return {
    soundEnabled: true,
    musicEnabled: false,
    uiScale: "compact",
    effectIntensity: "standard",
    reducedMotionEnabled: false,
    touchControlsEnabled: true,
    controllerHintsEnabled: true
  };
}

export function loadSettings() {
  try {
    if (typeof localStorage === "undefined") {
      return defaultSettings();
    }
    return { ...defaultSettings(), ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}")) };
  } catch (err) {
    console.warn("Settings parse failed:", err.message);
    return defaultSettings();
  }
}

export function saveSettings(settings) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }
}
