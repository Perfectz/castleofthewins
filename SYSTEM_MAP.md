# System Map

## Runtime Layers

- Boot
  `src/main.js`
- Coordinator
  `src/game.js`
- Data
  `src/data/content.js`
- Core helpers
  `src/core/*.js`
- Feature seams
  `src/features/*.js`
- Rendering
  `src/ui/render.js`
- Input/audio
  `src/input/gamepad.js`, `src/audio/soundboard.js`

## Dependency Direction

- `src/game.js` may depend on any feature or core module.
- Feature modules may depend on core modules and content tables.
- Feature modules should not depend on DOM layout files directly except screen-render modules like `creation.js`.
- Render modules should not own game rules.

## Current Feature Ownership

- `creation.js`
  Draft state helpers and title/creation UI.
- `persistence.js`
  Save metadata, storage, loading, migration, save chrome.
- `exploration.js`
  Search and stair command execution.
- `combat.js`
  Combat rules, monster behaviors, level-up, death.
- `turns.js`
  Turn advancement and passive recovery.
- `advisor.js`
  Tactical HUD selectors and rendering.

## Goal State

- `src/game.js` becomes a thin coordinator with almost no game rules.
- Feature modules own one gameplay surface each.
- New systems are added as feature modules instead of appended to `Game`.
