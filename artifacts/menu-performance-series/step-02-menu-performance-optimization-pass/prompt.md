PLEASE IMPLEMENT THIS PLAN:
# Menu and Transition Performance Optimization Pass

## Summary

- Implement the full recommendation set, including menu/modal responsiveness and the larger `Begin Adventure` and stair-transition stalls.
- Keep the current feature set intact, but optimize aggressively: menu shells may appear first and hydrate secondary summaries/details on the next frame when that reduces synchronous cost.
- Validate the work with the same phone-sized Playwright baseline used in step 01, and publish a new follow-up artifact step with before-vs-after metrics and screenshots.

## Important Interfaces and Structural Changes

- No public gameplay APIs change.
- Internal UI/rendering changes to add:
  - A stable hub/modal refresh path that updates existing modal subtrees instead of recreating the full modal root for sibling hub transitions.
  - Scoped navigation-metadata refresh helpers so controller/focus annotations can be recomputed only for changed regions.
  - A staged startup/transition path for `Begin Adventure` and stairs, with lightweight immediate UI feedback and deferred non-critical work.
  - A dedicated menu-performance collector for the optimization step that reuses the baseline measurements and adds after-results under a new step folder.

## Implementation Changes

- Modal and hub architecture (`src/game.js`)
  - Refactor `showHubModal()` so the first open mounts the shell once, and subsequent tab/filter/section changes update only the affected hub body region.
  - Keep hub tabs stable in the DOM across `pack`, `magic`, and `journal`; stop routing `pack-filter`, `journal-section`, and `magic-filter` through full modal recreation.
  - Keep `showSimpleModal()` for unrelated one-off surfaces, but stop using it for intra-hub sibling switches.
  - Remove menu-only reliance on full `render()` where the board state did not change.

- Pack and list-heavy surfaces (`src/game.js` plus existing inventory helpers)
  - Split pack updates into shell, filter row, list panel, and inspector panel refreshes.
  - Recompute the pack presentation model once per pack refresh and reuse it for list and inspector generation in the same interaction.
  - On pack filter changes, replace only the list and inspector sections, preserve the shell, preserve the scroll position of the list host, and restore focus to the selected filter chip.
  - Keep the desktop hover inspector path, but do not prioritize it over phone-first list refresh performance.

- Navigation and focus metadata (`src/game.js`)
  - Replace broad `applyControllerNavigationMetadata()` calls during menu-only interactions with scoped refresh calls for the changed zone set.
  - Remove the unconditional navigation-metadata recomputation from generic `render()`; only run a full pass on shell mount, layout-mode changes, or when DOM regions outside scoped modal helpers changed.
  - Preserve the current focus-return behavior when closing utility and hub surfaces.

- Utility menu open path (`src/game.js`)
  - Open `Adventure Menu` immediately with actionable buttons and lightweight placeholders for `Right Now`, `Resume Point`, and `Device & Controls`.
  - Hydrate those secondary summaries on the next animation frame so the first visible response is not blocked by save-slot/meta summary assembly.
  - Keep all existing actions present and usable as soon as the menu appears.

- Title and creation flow (`src/features/creation.js`, `src/game.js`)
  - Convert the start-run path from one large synchronous block into a staged startup sequence.
  - Stage 1: capture creation draft, initialize the player/run shell, close the creation surface, and show a lightweight “entering the valley” transition state immediately.
  - Stage 2: generate world content and apply run/world modifiers.
  - Stage 3: recalculate derived stats, FOV, and first interactive HUD state.
  - Stage 4: perform autosave after the first interactive render, not before it.
  - Guard the staged startup path against reentry so double-presses on `Begin Adventure` cannot start duplicate runs.

- Stair transitions and depth changes (`src/features/exploration.js`, `src/game.js`)
  - Keep stair resolution logic intact, but move expensive follow-up work behind a staged depth-transition finalization path.
  - Show immediate transition feedback as soon as the floor swap is known, then complete FOV/HUD/full-board refresh in the next frame.
  - Add targeted timing around stair transitions during implementation so any remaining unwrapped heavy step is visible and can be reduced before finishing the pass.
  - Preserve current story, telemetry, and return-to-town behavior.

- Render breadth reduction (`src/game.js`, `src/features/advisor.js`)
  - Split full render responsibilities into smaller internal helpers so menu-only interactions can update modal content without forcing unrelated HUD/board work.
  - Keep `render()` as the full-state fallback, but introduce targeted helpers for menu chrome and modal-only updates.
  - Avoid recomputing the full advisor/HUD model for interactions that only changed active modal content.

- Documentation and artifact series
  - Create `artifacts/menu-performance-series/step-02-menu-performance-optimization-pass/`.
  - Include the same deliverable set as step 01, plus before-vs-after comparison tables sourced from the same collector shape.
  - Update `artifacts/menu-performance-series/SERIES_INDEX.md` with the step-02 summary and measured deltas.
  - Keep step 01 unchanged as the baseline reference.

## Test and Verification Plan

- Functional verification
  - Run `npm run build`.
  - Run `npm run test:rules`.
  - Run `npm run playtest:harness`.
  - Re-exercise these flows in Playwright after the changes: title help, title to creation, begin adventure, utility menu in town, utility to settings, utility to journal, journal to pack, pack filter switch, pack to magic, magic to journal, bank open/close, utility menu in dungeon, reward screen open, and dungeon descent.

- Performance verification
  - Reuse the baseline collector logic with the same `393x852` viewport and same flow list.
  - Save raw after-metrics in the new step folder and compare directly to step 01.
  - Require actual measured improvement, not only perceived improvement:
    - `Field Guide -> Pack`: improve `readyMs` from `66.0ms` to `<= 30ms`.
    - `Adventure Menu` open in town: improve `readyMs` from `33.5ms` to `<= 20ms`.
    - `Pack -> Magic` and `Magic -> Journal`: cut settle time by at least `25%`.
    - `Begin Adventure`: improve `readyMs` from `185.2ms` by at least `25%`.
    - Dungeon descent: improve `readyMs` from `660.8ms` by at least `25%`.
  - No measured regression greater than `10ms` on fast paths that were already under `20ms`.

## Assumptions and Defaults

- Scope is the full set of recommendations, including non-menu run-transition stalls.
- Aggressive responsiveness improvements are allowed, including deferred secondary summaries/details after first paint.
- No product copy or feature set changes are required unless they directly support staged rendering or lighter sequencing.
- Existing selectors, modal actions, and test-facing hooks should be preserved unless a targeted test update is required to match the new staged behavior.
