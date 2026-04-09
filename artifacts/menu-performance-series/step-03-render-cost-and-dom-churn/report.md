# Render Cost And DOM Churn Report

## Which menus are render-heavy

The render-heavy paths in this pass were the hub-style menus and town services, not simple one-shot modals. The main problem areas were `Field Guide` section switches, `Magic` selection and filter interactions, and the `Provisioner` buy/sell panel toggle. `Pack` remained important as a comparison point, but its bigger issue in this run was still multi-frame settle behavior rather than obviously expensive string-building.

## Why they are expensive

These menus were expensive because small interactions were still rebuilding more UI than the player changed. Switching a journal section does not need a full hub body replacement. Selecting a spell does not need the whole magic pane rebuilt. Flipping a shop panel does not need the full service modal re-mounted. Even when the JavaScript time was not large, replacing broad markup caused extra node churn, focus restoration work, and visible settling over later frames.

## Code hotspots causing DOM churn

- `src/game.js`: `case "journal-section"` previously routed back through `showHubModal("journal", ...)`, which refreshed the hub content path for a section toggle.
- `src/game.js`: `selectSpell()` and `case "magic-filter"` refreshed the magic pane more broadly than the interaction required.
- `src/game.js`: `case "shop-panel"` called `showShopModal()` again, which went back through `showSimpleModal()` and recreated the service body.
- `src/game.js`: `getJournalHubMarkup()` and `getMagicHubMarkup()` were structurally correct but lacked stable region hosts for partial refreshes.

## What changes were made

1. Journal section switches now keep the journal shell mounted, toggle the active section chips in place, and replace only the active section body.
2. Magic selection no longer rebuilds the live spell list for a simple selection change. It now retags only the affected spell cards and status labels, while filter changes replace only the list region.
3. Shop buy/sell toggles now keep the service modal mounted and replace only the panel body while updating the tab active state in place.

## Measured or strongly evidenced improvements

The clearest measured speed gain was `magic_select_identify`, where ready time dropped from `7.6ms` to `4.5ms`, while mutation churn fell from `4 added / 4 removed` to `2 added / 2 removed`. `utility_to_journal_open` also improved from `15.6ms` to `13.3ms` and cut live node churn from `6 added / 4 removed` to `3 added / 3 removed`.

The strongest structural evidence is narrower live DOM scope on the targeted paths:

- `journal_section_switch_chronicle`: live changes dropped from `4 added / 4 removed` to `3 added / 3 removed`, and the update now stays inside the active section host instead of rebuilding the journal body shell.
- `magic_select_identify`: the runtime now updates card state in place rather than replacing the whole live list subtree.
- `provisioner_panel_switch_sell`: the update now stays inside the panel body instead of recreating the whole shop modal through `showSimpleModal()`.

## Remaining heavy paths

The timing story is mixed. `journal_section_switch_chronicle`, `journal_section_switch_guide`, `magic_filter_switch_next`, and `provisioner_panel_switch_sell` still show worse settle times in this run even though they now perform less live DOM replacement. That strongly suggests the next bottleneck is browser-side work after the DOM patch itself, most likely style recalculation, layout, scroll/focus restoration, or other frame-settle behavior that this step did not fully trace.

The biggest remaining menu-side issue is therefore no longer “we replace the entire modal every time.” It is now “the changed region is narrower, but the browser still spends too many follow-up frames settling those updates.” The next profiling step should be a real trace on `journal section switch`, `magic filter switch`, and `shop panel switch`, with explicit attention to layout, paint, and focus/scroll side effects.
