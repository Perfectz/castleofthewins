# AI Change Guide

## Source Of Truth

- Edit `src/` files only.
- `app.js` is a generated fallback bundle.
- Rebuild the fallback bundle with `npm run build:fallback` after changing `src/`.

## Main Seams

- `src/features/creation.js`
  Character creation draft state and title/creation screen rendering.
- `src/features/persistence.js`
  Save metadata, save/load, and save-format migration.
- `src/features/exploration.js`
  Search and stair-travel commands.
- `src/features/combat.js`
  Combat, monster intent, monster turns, and level-up flow.
- `src/features/turns.js`
  Wait, rest, and turn resolution.
- `src/features/advisor.js`
  Advisor selector/view-model plus HUD capsule and action-dock rendering.
- `src/core/command-result.js`
  Structured result object for command-style rule helpers.

## Where To Change Things

- Add or rebalance items, races, classes, monsters, and spells in `src/data/content.js`.
- Change player-derived stat math in `src/game.js` and `src/core/entities.js`.
- Change search or stair behavior in `src/features/exploration.js`.
- Change combat, monster AI, or level-up behavior in `src/features/combat.js`.
- Change the turn loop in `src/features/turns.js`.
- Change save data shape or migration in `src/features/persistence.js`.
- Change advisor guidance and contextual actions in `src/features/advisor.js`.
- Change canvas rendering in `src/ui/render.js`.

## Safe Workflow

1. Change the smallest owning module first.
2. Avoid editing both `src/game.js` and a feature module for the same behavior unless wiring is required.
3. Rebuild with `npm run build:fallback`.
4. Run at least a syntax check or browser smoke test.

## High-Risk Areas

- `src/game.js` still contains some pre-extraction method bodies, but they are explicitly renamed with a `legacy...Unused` or `legacy...Migrated` prefix.
- Save schema changes require a migration update in `src/features/persistence.js`.
- New feature files must be added to `scripts/build-app.mjs` so the fallback bundle includes them.
