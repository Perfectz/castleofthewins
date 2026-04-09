# Changes Made

This step changed live runtime code in two places:

- `src/game.js`
  - added pack-region refresh helpers and host wrappers so pack selection/filter changes stop rebuilding the full pane
  - split journal rendering into active-section-only helpers
  - split shop rendering into active buy/sell panel helpers
- `src/features/inventory-ui.js`
  - added cached inventory presentation models keyed to the current inventory/equipment/runtime state
  - removed selection-specific state from stacked inventory groups so cached presentation models can be reused safely

No gameplay balance changes were made. This was a menu-render-path optimization pass only.
