# Changes Made

## Runtime changes

- Added stable region hosts to `Magic`, `Field Guide`, and `Provisioner` modal bodies so targeted updates can patch only the changed region.
- Added partial-refresh helpers in `src/game.js` for:
  - hub pane region updates
  - journal active-section refresh
  - magic list refresh
  - shop panel body refresh
- Changed spell selection so it updates affected magic cards in place instead of refreshing the live pane.
- Changed journal section toggles so they update chip state in place and replace only the active section body.
- Changed shop panel toggles so they reuse the mounted service modal and replace only the panel body.

## Instrumentation changes

- Added `data/collect-after.mjs` so the step-03 after-run uses the same collector shape as the baseline while writing screenshots to `screenshots/after/` and metrics to `data/after-raw-metrics.json`.
- Preserved the baseline collector output in `data/before-raw-metrics.json`.

## What was not changed

- No gameplay rules were changed.
- No new framework or state library was introduced.
- No broad render-architecture rewrite was attempted.
