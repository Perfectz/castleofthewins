# Architecture

The browser build now boots from [`src/main.js`](./src/main.js) and is split around stable seams instead of one monolithic runtime.

## Module layout

- `src/main.js`
  Bootstraps the app in the browser.
- `src/game.js`
  Orchestrator. Owns DOM references, modal shell, and dispatches to feature modules.
- `src/data/content.js`
  Static content tables and spell definitions.
- `src/core/constants.js`
  Shared runtime constants.
- `src/core/utils.js`
  Small reusable helpers with no game-state ownership.
- `src/core/world.js`
  Tile, map, FOV, LOS, secret, and set-piece helpers.
- `src/core/entities.js`
  Actor, item, inventory, normalization, encumbrance, and shop-state helpers.
- `src/core/settings.js`
  Persistent settings load/save.
- `src/core/command-result.js`
  Structured command result objects for rule modules.
- `src/features/creation.js`
  Character creation draft helpers plus title/creation screen rendering.
- `src/features/persistence.js`
  Save metadata, persistence, and save migration.
- `src/features/exploration.js`
  Search and stair commands.
- `src/features/combat.js`
  Combat, monster logic, death, and level-up flow.
- `src/features/turns.js`
  Turn advancement, wait, and rest rules.
- `src/features/advisor.js`
  Tactical HUD selectors and rendering.
- `src/ui/render.js`
  Canvas and visual effect drawing.
- `src/input/gamepad.js`
  Gamepad polling and normalized controller intents.
- `src/audio/soundboard.js`
  Lightweight SFX wrapper.

## APIE interpretation

- Abstraction
  Game rules are separated from rendering, input, audio, and persistence.
- Polymorphism
  Spells and item effects continue to use data-driven definitions in `content.js`.
- Inheritance
  Avoided on purpose. The code uses plain objects and composition for easier iteration.
- Encapsulation
  `Game` owns mutation and orchestration. Support modules expose focused helpers.

## Change guidance

- Add new items, monsters, spells, and shops in `src/data/content.js`.
- Change dungeon geometry or secret-tile helpers in `src/core/world.js`.
- Change balance, item math, encumbrance, or shop-state logic in `src/core/entities.js`.
- Change creation flow in `src/features/creation.js`.
- Change save behavior in `src/features/persistence.js`.
- Change search or stair behavior in `src/features/exploration.js`.
- Change combat, monster AI, or level-up rules in `src/features/combat.js`.
- Change wait/rest/turn flow in `src/features/turns.js`.
- Change HUD advice and action suggestions in `src/features/advisor.js`.
- Change controller behavior in `src/input/gamepad.js`.
- Change visuals in `src/ui/render.js`.
- Keep browser boot and top-level wiring in `src/game.js` and `src/main.js`.
