# Hotspot Comparison

## Worst before this step

- `journal_to_pack_tab_switch` was the slowest pure menu path in this collector at `33.7ms`.
- `utility_to_journal_open` was the next broad hotspot at `19.5ms`.
- `pack_filter_switch_use` and `pack_select_second_item` were both expensive for simple in-menu interactions at `14.0ms` and `13.1ms`.
- `provisioner_open_direct` was also heavier than it looked at `12.6ms`.

## Best improvements from this step

| Flow | Before ready | After ready | Delta | Why it improved |
| --- | ---: | ---: | ---: | --- |
| `pack_filter_switch_use` | 14.0ms | 7.5ms | -6.5ms | Pack filter changes now refresh only the changed regions and reuse cached inventory derivations. |
| `utility_to_journal_open` | 19.5ms | 13.2ms | -6.3ms | Journal no longer assembles every section body on entry. |
| `pack_select_second_item` | 13.1ms | 9.0ms | -4.1ms | Item selection no longer forces a full pack-pane rebuild. |
| `provisioner_open_direct` | 12.6ms | 8.6ms | -4.0ms | Shop open no longer computes both buy and sell paths. |
| `journal_section_switch_mission` | 5.9ms | 3.3ms | -2.6ms | Lightweight journal sections now pay only for themselves. |
| `journal_to_pack_tab_switch` | 33.7ms | 31.3ms | -2.4ms | Pack still has work to do, but the path is lighter than before. |

## Mixed results worth reading correctly

- `journal_section_switch_chronicle` stayed flat on first response, but settled much faster.
  That means the visible answer still appeared at roughly the same time, while the browser had less follow-up work to calm down after the switch.
- `pack_to_magic_tab_switch` improved a little on ready time but settled worse in this run.
  Step 06 did not target magic directly, so this should not be treated as a regression from the hotspot fixes themselves.
- Raw DOM add/remove counts on pack interactions increased.
  That does not contradict the win. The step replaced smaller, more relevant regions while eliminating repeated expensive derivation work.

## Worst offender after this step

`journal_to_pack_tab_switch` remains the top menu hotspot. The next pass should focus on first-time pack pane construction, especially the paperdoll, comparison logic, and first visible list generation when entering pack from another hub tab.
