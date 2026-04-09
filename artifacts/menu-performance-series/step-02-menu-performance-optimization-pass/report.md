# Step 02 Report

## What was profiled

- Title help open/close.
- Title to creation.
- `Begin Adventure` from creation into town.
- Town utility menu open.
- Utility to settings.
- Utility to journal.
- Journal section switch.
- Journal to pack.
- Pack filter switch.
- Pack to magic.
- Magic to journal.
- Pack open/close from the action bar.
- Bank open/close in town.
- Dungeon descent.
- Utility menu open/close in dungeon.
- Reward screen open.

## How it was profiled

- Runtime was launched through the same Playwright collector shape used in step 01.
- Viewport stayed phone-first at `393x852` with `deviceScaleFactor: 2`.
- Measurements recorded `handlerMs`, `readyMs`, `settledMs`, DOM mutation counts, long tasks, active modal snapshot data, and top wrapped call timings.
- Code inspection focused on `src/game.js`, `src/features/creation.js`, `src/features/exploration.js`, and `src/features/persistence.js`.
- Verification was run with:
  - `npm run build`
  - `npm run test:rules`
  - `npm run playtest:harness`
- The harness had one transient `no_path` failure on a return-to-town route during one run; a clean rerun passed. The latest collector output in `data/raw-metrics.json` is the canonical after snapshot for this step.

## Slowest menu flows

By `readyMs` in the latest verified after run:

1. `descend_to_dungeon`: `148.5ms`
2. `creation_to_town_start`: `56.9ms`
3. `journal_to_pack_tab_switch`: `40.7ms`
4. `town_bank_open_direct`: `19.8ms`
5. `utility_to_journal_open`: `17.9ms`
6. `pack_to_magic_tab_switch`: `16.2ms`

By `settledMs` in the latest verified after run:

1. `descend_to_dungeon`: `166.1ms`
2. `creation_to_town_start`: `131.6ms`
3. `magic_to_journal_tab_switch`: `122.2ms`
4. `utility_to_settings_open`: `83.3ms`
5. `utility_to_journal_open`: `83.3ms`
6. `pack_to_magic_tab_switch`: `73.3ms`

## Likely bottlenecks

- `Begin Adventure` is still dominated by first-town rendering, especially repeated `render()` and `renderBoard()` work plus advisor model recomputation.
- `Journal -> Pack` is no longer dominated by pack markup generation on the click itself. The latest run shows `showHubModal` carrying most of the cost, with `getPackHubMarkup` absent from the click-path call summary.
- `Pack -> Magic` still pays for a magic-pane render on switch in the latest run, and settle time remains paint/layout heavy.
- `Magic -> Journal` is fast to first response but slow to settle, which points more at hidden-pane visibility/layout churn than at synchronous application logic.
- Bank open is not catastrophic, but it still uses a full simple modal rebuild path and a relatively large content tree.

## Suspected root causes

- Large hub surfaces still cause measurable style/layout work when panes are shown or hidden, even after avoiding full modal-root replacement.
- Hidden-pane prewarm helps some paths but also introduces settle-time variability because deferred pane creation lands between measurement windows.
- Startup and stairs still do several board/HUD passes, even though they no longer block on autosave or eager full-depth generation.
- Some modal flows still parse large HTML strings and replace large content blocks instead of patching smaller DOM regions.

## Actual observed lag vs perceived lag

- Actual lag:
  - `Begin Adventure` improved from `185.2ms` to `56.9ms`.
  - Dungeon descent improved from `660.8ms` to `148.5ms`.
  - Town utility open improved from `33.5ms` to `9.2ms`.
  - Pack filter switch improved from `14.1ms` to `12.6ms`.
- Mostly perceived lag:
  - Several hub flows now respond in `6-18ms`, but still feel heavier because the modal settles over later frames.
  - `Magic -> Journal` is a good example: `readyMs` is only `6.5ms`, but `settledMs` is `122.2ms`.

## Top 10 optimization opportunities ranked by likely impact

1. Capture a browser trace for hub pane visibility/layout work during `journal -> pack` and `magic -> journal`. The remaining cost is no longer explained by obvious JS call stacks.
2. Replace large string-to-HTML pane swaps with smaller node-level patching for journal and magic sections, similar to the pack filter path.
3. Apply `content-visibility` or an equivalent layout isolation strategy to inactive hub panes so hidden content does not fully participate in switch-time layout.
4. Split first-town render into one immediate interactive pass and a second non-critical board/HUD polish pass.
5. Reduce duplicate board rendering during depth transitions. The latest run still shows `renderBoard` repeated several times per descent.
6. Cache advisor/HUD model slices across staged startup and stair finalization so `getAdvisorModel()` does less work inside the first interactive window.
7. Narrow bank modal construction to a smaller initial shell, then hydrate secondary planning copy after first paint the same way the utility menu now does.
8. Add explicit `performance.mark()` segments around hub pane show/hide, focus restoration, and scroll restoration to separate layout cost from app code cost.
9. Reduce journal pane weight by staging non-critical sections such as longer run history or guide content after the tab becomes visible.
10. Profile whether sticky subpanels in pack/journal are contributing to switch-time layout cost on mobile-sized viewports.

## Recommended next profiling step

Run a dedicated trace-only step against the hub stack, not another broad collector pass. Focus on `utility -> journal -> pack -> magic -> journal` with DevTools/trace markers around pane visibility changes, layout, style recalculation, and paint so the next optimization pass can target browser work instead of guessing at JavaScript.
