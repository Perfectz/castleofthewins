# Baseline Menu Performance Audit

## What Was Profiled

- Title interactions: `Learn Basics`, `Start Run`
- Creation flow: `Begin Adventure`
- Town and dungeon utility menu opens
- Utility-to-settings and utility-to-journal transitions
- Journal section switching
- Pack open and pack filter switching
- Pack-to-magic and magic-to-journal tab switching
- Town bank modal open and close
- Reward screen open via runtime-only spell-study staging

Coverage notes:

- The runtime was profiled in a phone-sized viewport (`393x852`, device scale factor `2`).
- Reward flow was reachable only through runtime-only staging of `Spell Study`; no production code was changed.
- Town services were sampled through `Bank`, which is representative of the shared town-service modal path.

## How It Was Profiled

- Launched the live game in Playwright via an artifact-only runner: `data/collect-baseline.mjs`
- Served `index.html` over local HTTP so the module runtime matched normal browser play
- Injected runtime-only wrappers around menu-relevant methods to measure self-time for:
  - `showHubModal`
  - `showSimpleModal`
  - `showUtilityMenu`
  - `showSettingsModal`
  - `showBankModal`
  - `showSpellLearnModal`
  - `render`
  - `renderBoard`
  - `renderMiniMap`
  - `renderPanels`
  - `renderActionBar`
  - `renderEventTicker`
  - `refreshChrome`
  - `applyControllerNavigationMetadata`
- Captured:
  - click/direct-trigger to visible response time (`readyMs`)
  - two-frame settle time (`settledMs`)
  - mutation counts and node churn
  - long-task presence
  - modal DOM size and button count
- Cross-checked the measurements against current menu code in:
  - `src/game.js`
  - `src/features/creation.js`
  - `src/features/advisor.js`

## Slowest Menu Flows

Menu-only worst offenders:

1. `Field Guide -> Pack`: `66.0ms` visible response, `78.1ms` settled, `335` modal nodes, `37` buttons, `1` long task.
2. `Adventure Menu` open in town: `33.5ms` visible response, `36.4ms` settled.
3. `Title -> Create Adventurer`: `30.1ms` visible response, `36.3ms` settled, `104` modal nodes, `17` buttons.
4. `Learn Basics` open from title: `29.4ms` visible response.
5. `Adventure Menu -> Field Guide`: `19.2ms` visible response, but `62.6ms` settled.

Important contextual non-menu costs:

1. `Begin Adventure`: `185.2ms` visible response, `252.4ms` settled, `1` long task.
2. `Descend to Dungeon`: `660.8ms` visible response, `685.2ms` settled, `1` long task.

Interpretation:

- Users can easily misattribute `Begin Adventure` lag to “creation modal slowness,” but the expensive work is run startup and early render/state setup, not just menu open/close.
- The true menu stack problem is not one giant `200ms` modal open. It is repeated full-surface rebuilds that land in the `15-66ms` band often enough to feel heavy.

## Likely Bottlenecks

1. Full modal subtree replacement on nearly every menu transition.
   Code evidence: `showSimpleModal` clears `modalRoot`, assigns fresh `innerHTML`, appends a new fragment, and reapplies focus/navigation metadata in `src/game.js` around lines `9408-9444`.

2. Hub tab and filter changes reopen the entire hub instead of patching a local region.
   Code evidence: `showHubModal` rebuilds tab markup plus the entire body each time in `src/game.js` around lines `10688-10735`. `pack-filter` and `journal-section` route back through `showHubModal`, and `magic-filter` routes through `refreshMagicHub`, which also calls `showHubModal`; see `src/game.js` around lines `1231-1240`, `1885-1899`, and `2041-2064`.

3. Navigation metadata is recomputed by broad DOM queries after each rebuild.
   Code evidence: `applyControllerNavigationMetadata` runs many `querySelectorAll` passes across the active UI root in `src/game.js` starting at line `5628`.

4. Utility menu open builds multiple summary panels synchronously.
   Code evidence: `showUtilityMenu` fills `utility-run-summary`, `utility-save-summary`, and `utility-control-summary` with large `innerHTML` strings before showing the modal in `src/game.js` around lines `11268-11367`.

5. Render path remains broad when gameplay state changes follow menu actions.
   Code evidence: `render()` recomputes music, utility bar, board, minimap, panels, ticker, action bar, spell tray, context chip, and navigation metadata every call in `src/game.js` around lines `11434-11448`.

6. Title and creation both rebuild complete fullscreen surfaces.
   Code evidence: `showTitleScreen` and `showCreationModal` replace the entire modal content, then call `refreshChrome` and focus setup in `src/features/creation.js` at lines `258` and `321`.

7. HUD state derivation is still fairly broad even for unrelated transitions.
   Code evidence: `getAdvisorModel` in `src/features/advisor.js` at line `348` assembles large tactical summaries and action suggestions whenever `render()` needs HUD output.

## Suspected Root Causes

- The menu system is coordinator-heavy: `Game` owns open/close, tab switching, focus restoration, modal shell rendering, and large portions of state derivation in one class.
- Pack, magic, and journal are presented as tabs, but implementation-wise they behave like “destroy and recreate the whole modal” surfaces.
- Per-open DOM work is front-loaded. The game does not appear to stage an immediate shell first and heavier detail second.
- Focus/navigation support is functional but expensive in structure: after rebuilding, the code re-discovers and re-annotates many controls rather than updating only the changed subtree.
- Close actions are cheap in handler time, but they still create a perceptual transition because the entire full-screen surface disappears and the player context underneath has to visually settle.

## Actual Observed Lag vs Perceived Lag

Actual measured cost:

- Most menu opens are not disastrous: `Bank` opened in `17.9ms`, `Settings` in `17.0ms`, `Pack` from the action bar in `13.6ms`, `Spell Study` in `9.0ms`.
- Close actions are even cheaper at handler time: `Pack` close `2.0ms`, `Journal` close `1.9ms`, `Bank` close `2.5ms`.

Why the UI can still feel slow:

- Many transitions settle noticeably later than the first visible response.
  - `Pack -> Magic`: `15.2ms` visible, `65.8ms` settled
  - `Magic -> Journal`: `7.3ms` visible, `74.0ms` settled
  - `Journal close`: `1.9ms` visible, `69.1ms` settled
  - `Pack close`: `2.0ms` visible, `72.2ms` settled
- That means the button responds quickly enough, but the surface still feels heavy because the modal tree, styles, focus state, and background context are still visually stabilizing over later frames.
- The biggest perceived “menu lag” moments were actually state transitions:
  - `Begin Adventure`: `185.2ms`
  - `Descend to Dungeon`: `660.8ms`

Bottom line:

- Menu chrome alone is moderately heavy, not catastrophically slow.
- UX heaviness comes from repeated whole-surface rebuilds and post-open settling, while the really large button-press stalls belong to world/startup transitions.

## Top 10 Optimization Opportunities Ranked by Likely Impact

1. Stop rebuilding the full hub shell for tab and section switches.
   Why: `Field Guide -> Pack` is the worst real menu path, and the code currently routes this through `showHubModal -> showSimpleModal -> modalRoot.innerHTML = ""`.

2. Split pack rendering into stable shell plus incremental list updates.
   Why: pack views are the largest measured menu subtree (`279-335` nodes, `33-37` buttons) and the filter path still rebuilds the whole modal.

3. Narrow `applyControllerNavigationMetadata` to the active changed region.
   Why: it runs after each modal build and traverses many zones whether they changed or not.

4. Reuse modal containers instead of clearing `modalRoot` for sibling menu transitions.
   Why: the current pattern guarantees node churn and focus recalculation for every tab/filter/section action.

5. Defer non-critical utility-menu summaries until after first paint.
   Why: town utility open is one of the slowest menu opens (`33.5ms`) and builds three summary panels plus save-slot metadata up front.

6. Separate gameplay render breadth from menu lifecycle.
   Why: `render()` is broad enough that menu-triggered state changes can pick up unrelated HUD work.

7. Cache pack/journal view models within a modal lifetime.
   Why: repeated filter/section moves currently recompute markup and semantics even when much of the underlying state is unchanged.

8. Introduce method-level tracing for `beginAdventure` and dungeon descent before touching menu code.
   Why: the two largest delays users feel are not menu shell work, and optimizing the wrong layer first would waste time.

9. Make close flows visually lighter even when handler time is already cheap.
   Why: close handlers are `~2ms`, but the experience still feels heavy because the full-screen context snaps and settles over later frames.

10. Demote desktop-only pack inspector subtree replacement in priority.
    Why: `refreshPackInspectorPreview` replaces the inspector on hover/focus changes in `src/game.js` around lines `1693-1743`, but that is not the main phone-first offender.

## Recommended Next Profiling Step

Run a deeper pack/journal trace focused on the single worst menu path: `Field Guide -> Pack`.

That follow-up should:

- keep the same phone viewport and live runtime
- trace `showHubModal`, `showSimpleModal`, `getPackHubMarkup`, and `applyControllerNavigationMetadata` with finer-grained timing
- collect browser performance evidence for scripting, style recalculation, layout, and paint during that single transition
- compare “full rebuild” versus a temporary local patch experiment in an artifact-only branch or runtime monkey patch, without shipping optimization yet

That next step will tell us whether the first engineering win should target markup generation, DOM replacement, style/layout churn, or focus/navigation bookkeeping.
