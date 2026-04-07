# AGENTS.md

Project-wide instructions for coding agents working in `castleofthewinds`.

## Read This First

1. Read this file.
2. Read [`docs/ai/PROJECT_BRIEF.md`](docs/ai/PROJECT_BRIEF.md).
3. Use the focused docs only if the task touches them:
   - `ARCHITECTURE.md`
   - `SYSTEM_MAP.md`
   - `FEATURES.md`
   - `AI_CHANGE_GUIDE.md`
   - `AI_RECIPES.md`
   - `TEST_STRATEGY.md`

## Project Snapshot

- This is a browser-playable, phone-first roguelike inspired by the classic Windows game.
- Runtime code lives in `src/` as ES modules.
- `index.html` loads `src/main.js` over HTTP/HTTPS and falls back to `app.js` for `file://` launches.
- `app.js` is generated. Do not hand-edit it unless the user explicitly asks for generated output surgery.
- `dist/` is a deployment artifact, not the main source of truth.
- The runtime is dependency-light. Do not introduce frameworks, bundlers, or state libraries unless the task explicitly calls for them.

## Source Of Truth

- Edit `src/` for game behavior.
- Edit `index.html` and `styles.css` for shell/UI structure and presentation.
- Edit `scripts/build-app.mjs` if you add, remove, or reorder runtime modules that must appear in `app.js`.
- Edit `tests/` and `scripts/playtest-harness.mjs` when behavior changes need stronger verification.

## Architecture Map

- `src/main.js`: browser boot entry.
- `src/game.js`: main coordinator, DOM ownership, mode switching, and wiring between systems.
- `src/data/content.js`: static content tables for classes, monsters, spells, items, towns, and progression data.
- `src/data/assets.js`: visual registry and asset metadata.
- `src/core/*.js`: reusable rules/helpers for world state, entities, constants, settings, and command results.
- `src/features/*.js`: gameplay surfaces such as combat, exploration, onboarding, objectives, meta progression, telemetry, inventory UI, and town systems.
- `src/ui/render.js`: canvas rendering and visual effects.
- `src/input/gamepad.js`: controller normalization.
- `src/audio/soundboard.js`: lightweight sound wrapper.

## Change Routing

- New or rebalanced content: `src/data/content.js`
- Map generation, visibility, secrets, and tile helpers: `src/core/world.js`
- Items, actors, burden, equipment, and stat math helpers: `src/core/entities.js`
- Creation/title flow: `src/features/creation.js`
- Exploration commands such as search and stairs: `src/features/exploration.js`
- Combat, monster turns, and level-up flow: `src/features/combat.js`
- Danger/pressure pacing: `src/features/director.js`
- Objective and optional floor logic: `src/features/objectives.js`
- Perks, rewards, and build progression: `src/features/builds.js`
- Meta progression and contracts: `src/features/meta-progression.js`
- Saves and migrations: `src/features/persistence.js`
- Telemetry and validation experiments: `src/features/telemetry.js`, `src/features/validation.js`
- HUD and modal presentation logic: `src/features/advisor.js`, `src/features/hud-feed.js`, `src/features/inventory-ui.js`
- Browser shell and cross-system orchestration: `src/game.js`

## Working Rules

- Make the smallest change in the narrowest owning module first.
- Preserve the existing data-driven style. Prefer plain objects, tables, and focused helpers over new inheritance trees.
- Keep rules separated from rendering where possible.
- For time-sensitive tool, platform, or API questions, prefer current official documentation over third-party summaries.
- Preserve mobile readability and controller/touch support when editing UI flows.
- Keep DOM ids, `data-action` hooks, and modal structure stable unless the task includes updating their consumers.
- If you add a new runtime module under `src/`, update `scripts/build-app.mjs` so the fallback bundle stays complete.
- If you change save payload shape, update migration logic in `src/features/persistence.js`.
- If you change UI or gameplay flows that tests depend on, update the harness/tests in the same change.

## High-Risk Areas

- `src/game.js`: still large and owns many cross-system seams.
- `src/data/content.js`: dense content definitions with wide gameplay impact.
- `src/features/persistence.js`: save compatibility and migration risk.
- `scripts/build-app.mjs`: fallback bundle ordering matters.
- `tests/rules.test.mjs`: large end-to-end rule coverage with many assumptions about selectors and behavior.
- `index.html` and `styles.css`: broad UI blast radius.

## Verification Expectations

- Docs-only changes: verify paths and commands referenced in the docs.
- `src/` changes: run `npm run build`.
- Rule, progression, persistence, or selector changes: run `npm run test:rules`.
- UI or onboarding changes: run `npm run playtest:harness` if feasible.
- Screenshot-specific tasks: use `npm run screenshot:mobile` or `npm run screenshot:town`.

## Common Commands

```bash
npm run build
npm run test:rules
npm run playtest:harness
npm run screenshot:mobile
npm run screenshot:town
```

## Files To Usually Ignore

- `app.js` after generation review
- `dist/`
- `artifacts/` unless the task is about playtests, screenshots, or generated reports
- `humandropbox/` unless the task is about source assets handed to the project

## Definition Of A Good Change

- The owning module is obvious.
- Fallback bundling still works.
- Mobile-first UX remains intact.
- Existing selectors and save compatibility are preserved or intentionally migrated.
- The narrowest reasonable verification was run.
