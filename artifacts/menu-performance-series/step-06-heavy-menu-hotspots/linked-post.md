# Linked Post Draft

Step 06 of the menu performance series focused on the heavy screens instead of broad UI theory.

Three hotspots made the shortlist:
- Pack
- Field Guide
- Provisioner

They were expensive for different reasons, but the common pattern was waste: computing hidden content, rebuilding full panes for small interactions, and repeating derived inventory work that had not actually changed.

The fixes were intentionally narrow:
- pack selection and filter changes now refresh only the changed regions
- journal switches now render only the active section
- provisioner now renders only the visible panel

Measured wins:
- `utility_to_journal_open` `19.5ms -> 13.2ms`
- `pack_filter_switch_use` `14.0ms -> 7.5ms`
- `pack_select_second_item` `13.1ms -> 9.0ms`
- `provisioner_open_direct` `12.6ms -> 8.6ms`
- `provisioner_panel_switch_sell` settled time `82.6ms -> 50.2ms`

The next target is clear: `Field Guide -> Pack` is still the heaviest pure menu handoff, so the next optimization should focus on first-time pack construction rather than repeated in-pack interactions.
