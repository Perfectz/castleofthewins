# Project Brief

This file is the compact onboarding map for AI agents. It does not replace the deeper docs; it tells you which parts matter first.

## What This Repo Is

`castleofthewinds` is a browser-playable, mobile-first roguelike. It runs without a heavy framework, keeps the runtime in plain JavaScript modules, and ships a generated fallback bundle so the game still works when launched directly from the filesystem.

## Current Runtime Shape

- Browser entry: `src/main.js`
- Main coordinator: `src/game.js`
- Static content tables: `src/data/content.js`
- Asset and visual registry: `src/data/assets.js`
- Shared rules/helpers: `src/core/*.js`
- Feature surfaces: `src/features/*.js`
- Canvas renderer: `src/ui/render.js`
- Controller support: `src/input/gamepad.js`
- Audio wrapper: `src/audio/soundboard.js`

## Critical Build Fact

`index.html` loads code in two modes:

- HTTP/HTTPS: `type="module"` with `src/main.js`
- `file://`: generated `app.js`

That makes `scripts/build-app.mjs` part of the runtime contract. If you add a new module that the fallback build needs, add it to `orderedFiles` there.

## Directory Guide

- `src/`: runtime source of truth
- `scripts/`: build, screenshot, and playtest harness tooling
- `tests/`: automated browser rule coverage
- `assets/`: game images and content assets
- `artifacts/`: generated test/playtest output
- `dist/`: deploy output
- `humandropbox/`: source drops and external media references
- `.github/workflows/`: GitHub Pages deploy flow

## Existing Docs Worth Using

- `ARCHITECTURE.md`: stable module boundaries and ownership
- `SYSTEM_MAP.md`: dependency direction and current feature ownership
- `FEATURES.md`: user-facing mechanics, content, and progression
- `AI_CHANGE_GUIDE.md`: safe source-of-truth reminders
- `AI_RECIPES.md`: common task routing
- `TEST_STRATEGY.md`: current verification expectations
- `STATE_SCHEMA.md`, `SAVE_FORMAT.md`, `CONTENT_SCHEMA.md`: reference docs for structured data changes

## Code Patterns To Respect

- Prefer focused helper functions over large inheritance structures.
- Keep game rules in data tables and feature/core modules.
- Use `Game` as the coordinator, not as the default place for every new rule.
- For toolchain or platform questions, prefer current official documentation before assuming old behavior still applies.
- Preserve current naming and selector conventions. Tests and harness flows rely on existing ids, classes, and `data-action` hooks.
- Keep phone-first presentation intact when editing `index.html` or `styles.css`.

## Where To Make Common Changes

- New spell, monster, item, class, rumor, unlock, or reward data:
  `src/data/content.js`
- World generation, LOS/FOV, secret tiles, room carving:
  `src/core/world.js`
- Item normalization, carry weight, stats, equipment:
  `src/core/entities.js`
- Character creation and title screen:
  `src/features/creation.js`
- Search and stairs:
  `src/features/exploration.js`
- Combat and monster processing:
  `src/features/combat.js`
- Objective, optional encounter, and floor resolution:
  `src/features/objectives.js`
- Pressure and reinforcement pacing:
  `src/features/director.js`
- Build/perk/reward flow:
  `src/features/builds.js`
- Save/load and migration:
  `src/features/persistence.js`
- Meta progression, contracts, commendations:
  `src/features/meta-progression.js`
- Telemetry, validation, and experiment scaffolding:
  `src/features/telemetry.js`
  `src/features/validation.js`
- UI rendering and visual effects:
  `src/ui/render.js`
  `styles.css`
  `index.html`

## High-Risk Changes

- Save format changes without a migration
- New runtime modules without updating `scripts/build-app.mjs`
- DOM or selector changes without checking tests/harness scripts
- UI changes that degrade mobile viewports, touch controls, or controller flows
- Editing generated artifacts instead of source files

## Verification Ladder

Use the smallest verification that honestly covers the change.

- Docs changes:
  - check the file paths and command names you mention
- Most runtime changes:
  - `npm run build`
- Behavior, persistence, progression, and selector changes:
  - `npm run test:rules`
- UI shell or flow changes:
  - `npm run playtest:harness`
- Visual capture work:
  - `npm run screenshot:mobile`
  - `npm run screenshot:town`

## Practical Workflow

1. Identify the narrowest owning module.
2. Change source files in `src/`, not generated outputs.
3. If runtime composition changed, update `scripts/build-app.mjs`.
4. Run the narrowest relevant verification.
5. Summarize what changed, what was verified, and any remaining risk.
