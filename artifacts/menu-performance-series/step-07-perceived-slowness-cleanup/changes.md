# Changes Made

Runtime changes:

- `src/game.js`
  - added compact quick-state markup helpers for `Pack`, `Magic`, `Field Guide`, and `Provisioner`
  - inserted those strips into the heavy menu layouts
- `styles.css`
  - added dedicated styling for `.menu-quick-state`
  - added dedicated styling for `.modal-interaction-feedback`
  - reduced the strength of the modal-open background blur and dimming

No structural performance refactor was attempted in this step. This was a polish pass aimed at perceived speed and confidence.
