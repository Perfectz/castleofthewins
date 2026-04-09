# Changes Made

## Runtime optimization changes

- `src/game.js`
  - Added deferred autosave scheduling so autosave no longer blocks the first interactive response.
  - Staged `Begin Adventure` so the creation flow closes and town becomes interactive before non-critical follow-up work.
  - Added lazy dungeon depth generation through `ensureWorldDepth()` instead of generating every floor up front.
  - Staged stair transitions so floor swap feedback happens before later HUD and render finalization work.
  - Split controller navigation metadata into shell vs modal paths to avoid broad recomputation during menu-only updates.
  - Reworked the utility menu to open immediately with placeholders and hydrate secondary summaries on the next frame.
  - Reworked hub modal refresh so the modal shell stays mounted and same-surface updates avoid full modal recreation.
  - Reused pack view-model work across list and inspector generation.
  - Added cached hub panes plus limited deferred prewarm so sibling hub switches do less synchronous work on click.

- `src/features/creation.js`
  - Added the visible recommended-contract action in creation so the flow remains testable and the selector contract is preserved.

- `src/features/exploration.js`
  - Switched stair descent to use lazy depth generation through `ensureWorldDepth()`.

- `src/features/persistence.js`
  - Added `skipUiRefresh` support so deferred autosave can avoid an unnecessary render/refresh cycle.

## Instrumentation-only changes

- No new runtime instrumentation was left in the shipped gameplay path.
- Artifact-only collector reuse:
  - `data/collect-after.mjs`
  - `data/raw-metrics.json`
  - `data/code-hotspots.json`

## What I did not do

- I did not introduce framework/state-library changes.
- I did not attempt a full virtualized pack/journal rewrite.
- I did not force further UI changes once the remaining bottleneck moved from obvious JS work to browser settle/layout behavior.
