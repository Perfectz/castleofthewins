# Heavy Menu Hotspot Report

## Heavy menu shortlist

1. `Pack`
   It was still one of the worst hub paths in the live measurements, especially on `Field Guide -> Pack`, pack filter changes, and pack item selection.
2. `Field Guide`
   Journal section switches were not the slowest first-response path, but they still spent too much work rebuilding long-form content that the player was not looking at.
3. `Provisioner`
   The town shop screens were smaller than pack, but they still paid avoidable work by building both buy and sell content on open and on panel switches.

## Root causes by menu

### Pack

- Selection changes were still calling `refreshPackHub()` and falling through to `updateHubModalContent("pack")`, which rebuilt the full pack pane even when only the highlighted row and the inspector changed.
- Inventory presentation work repeated semantic analysis and grouping across the same unchanged inventory state.
- The heavy part was not raw string building alone. The real cost was doing the same inventory classification and full-pane replacement over and over for simple interactions.

### Field Guide

- `getJournalHubMarkup()` assembled all section bodies up front, including chronicle, telemetry, archive, mastery, and town-history content, then threw most of that work away because only one section was visible.
- `refreshJournalHubSection()` rebuilt the full journal markup just to replace the active section host.
- The result was unnecessary compute on every section switch, especially when moving into or out of chronicle.

### Provisioner

- `getShopModalBodyMarkup()` built both the buy rows and the sell rows every time, even though only one panel was visible.
- The sell path also re-ran inventory presentation work for grouped sell entries on panel changes.
- The visible UI looked simple, but the hidden side of the modal was still being prepared every time.

## What changed

1. `Pack` received targeted region refreshes.
   `refreshPackHubContent()` now updates only the equipment, filter, list, and inspector regions that need replacement, instead of re-running the whole pack pane on selection and filter changes.
2. Inventory presentation now uses cached derived data.
   `buildInventoryPresentationModel()` in `src/features/inventory-ui.js` now caches derived inventory semantics and grouped presentation models for the current inventory/equipment/runtime state, so repeated selection and filter interactions stop recomputing the same classification work.
3. `Field Guide` now renders one section at a time.
   The journal markup was split into section-specific helpers, and `refreshJournalHubSection()` now swaps only the active section content instead of rebuilding the entire field guide body.
4. `Provisioner` now renders the active panel only.
   The shop modal now has dedicated buy and sell panel builders, and the modal body uses only the currently visible panel.

## Measured or strongly evidenced improvements

- `utility_to_journal_open`: `19.5ms -> 13.2ms`
  Journal opens faster because the initial hub path no longer pays as much incidental section work.
- `journal_section_switch_chronicle`: `12.1ms -> 12.4ms` ready, but `56.5ms -> 31.0ms` settled
  The first visible response stayed similar, but the heavy follow-through work dropped sharply.
- `journal_section_switch_mission`: `5.9ms -> 3.3ms`
  The lightweight mission section now benefits directly from the active-section-only path.
- `journal_to_pack_tab_switch`: `33.7ms -> 31.3ms`
  Still heavy, but measurably improved.
- `pack_filter_switch_use`: `14.0ms -> 7.5ms`
  This was one of the clearest wins. The filter action now feels much closer to immediate.
- `pack_select_second_item`: `13.1ms -> 9.0ms`
  Pack selection is meaningfully lighter because it updates only the list/equipment/inspector regions and reuses cached inventory derivations.
- `provisioner_open_direct`: `12.6ms -> 8.6ms`
  The shop opens faster because it no longer computes both panels on entry.
- `provisioner_panel_switch_sell`: `7.7ms -> 6.7ms`, with settled time `82.6ms -> 50.2ms`
  The panel switch is still not free, but the hidden-panel waste is gone.

## Which heavy menu should be optimized next

`Field Guide -> Pack` should be the next step. It is still the heaviest remaining pure menu transition in this targeted pass, and the evidence suggests the remaining cost sits in first-time pack pane construction, not in repeated selection work anymore.

## Tradeoffs introduced

- The inventory presentation cache uses a state signature instead of explicit mutation hooks. That keeps the change localized, but it means the cache is conservative and may discard more often than a hand-maintained revision counter.
- Pack region refreshes replace more local DOM fragments than before, which raised raw node add/remove counts in the collector even while reducing first-response time. The important part is that the replaced area is narrower and the repeated semantic work is lower.
- The journal code is now split into several section builders. That is a net readability win for hotspot work, but it does add more helper methods inside `src/game.js`.
