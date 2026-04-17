/**
 * @module screens/settings-modal
 * @owns Device Settings modal presentation
 * @reads game.settings, game.gamepadInput
 * @mutates game.mode (via game.showSimpleModal)
 *
 * Extracted from src/game.js. Each row's value button emits a
 * setting-toggle action with data-setting=<id>. Keep those selectors
 * stable so the harness and keyboard nav continue to work.
 */
import { escapeHtml } from "../../core/utils.js";

export function renderSettingsModal(game, options = {}) {
  game.syncAdaptiveLayout();
  game.clearModalInteractionFeedback();
  const {
    preserveScroll = false,
    focusTarget = null,
    fallbackFocus = true,
    closeLabel = "Close",
    modalReturnContext = null
  } = options;
  const settingsGroups = [
    {
      title: "Controls",
      rows: [
        {
          label: "Touch Controls",
          detail: "Show the on-screen movement pad when not hidden.",
          setting: "touchControlsEnabled",
          value: game.settings.touchControlsEnabled ? "On" : "Off"
        },
        {
          label: "Hide Touch When Controller Connected",
          detail: "Cleaner screen for paired joypads.",
          setting: "controllerHintsEnabled",
          value: game.settings.controllerHintsEnabled ? "On" : "Off"
        }
      ]
    },
    {
      title: "Audio",
      rows: [
        {
          label: "Sound Effects",
          detail: "Combat, movement, and UI feedback.",
          setting: "soundEnabled",
          value: game.settings.soundEnabled ? "On" : "Off"
        },
        {
          label: "Music",
          detail: "Optional soundtrack with title, town, and dungeon themes.",
          setting: "musicEnabled",
          value: game.settings.musicEnabled ? "On" : "Off"
        }
      ]
    },
    {
      title: "Display & Accessibility",
      rows: [
        {
          label: "Effect Intensity",
          detail: "Choose how animated combat and board effects should feel.",
          setting: "effectIntensity",
          value: game.settings.effectIntensity
        },
        {
          label: "Reduced Motion",
          detail: "Prefer simpler flashes over animated travel and pulsing effects.",
          setting: "reducedMotionEnabled",
          value: game.settings.reducedMotionEnabled ? "On" : "Off"
        },
        {
          label: "UI Scale",
          detail: "Alternate between compact and large mobile spacing.",
          setting: "uiScale",
          value: game.settings.uiScale
        }
      ]
    }
  ];
  game.mode = "modal";
  game.showSimpleModal("Device Settings", `
    <div class="workspace-stack settings-sheet">
      <div class="workspace-summary-strip">
        <div class="workspace-summary-chip">
          <span class="workspace-summary-label">Settings</span>
          <strong>Changes apply instantly in this browser.</strong>
        </div>
        <div class="workspace-summary-chip">
          <span class="workspace-summary-label">Audio</span>
          <strong>${escapeHtml(`Music ${game.settings.musicEnabled ? "On" : "Off"} | SFX ${game.settings.soundEnabled ? "On" : "Off"}`)}</strong>
        </div>
        <div class="workspace-summary-chip">
          <span class="workspace-summary-label">Display</span>
          <strong>${escapeHtml(`UI ${game.settings.uiScale} | Motion ${game.settings.reducedMotionEnabled ? "Reduced" : game.settings.effectIntensity}`)}</strong>
        </div>
      </div>
      <div class="workspace-shell settings-shell">
        <section class="workspace-rail settings-overview-rail">
          ${game.getMenuQuickStateMarkup({
            eyebrow: "Device Settings",
            title: "Tune controls, audio, and display without leaving the run.",
            detail: "Use the value buttons on the right to cycle each setting."
          })}
          <section class="workspace-detail-card">
            <div class="panel-title">Current Input</div>
            <div class="workspace-plain-copy">${escapeHtml(game.gamepadInput.isConnected() ? `${game.gamepadInput.getControllerName()} connected. Controller hints can stay hidden when a pad is present.` : "Touch and keyboard remain available. Touch controls can stay visible or hide when a controller connects.")}</div>
          </section>
        </section>
        <section class="workspace-rail-detail settings-detail-rail">
          ${settingsGroups.map((group) => `
            <section class="workspace-ledger-group">
              <div class="panel-title">${escapeHtml(group.title)}</div>
              <div class="workspace-ledger">
                ${group.rows.map((row) => `
                  <div class="workspace-ledger-row settings-ledger-row">
                    <div>
                      <strong>${escapeHtml(row.label)}</strong>
                      <div class="muted">${escapeHtml(row.detail)}</div>
                    </div>
                    <button class="menu-button" data-action="setting-toggle" data-setting="${row.setting}" data-focus-key="setting-toggle:${row.setting}" type="button">${escapeHtml(row.value)}</button>
                  </div>
                `).join("")}
              </div>
            </section>
          `).join("")}
        </section>
      </div>
    </div>
  `, {
    surfaceKey: "settings",
    preserveScroll,
    focusTarget,
    fallbackFocus,
    closeLabel,
    modalReturnContext
  });
}
