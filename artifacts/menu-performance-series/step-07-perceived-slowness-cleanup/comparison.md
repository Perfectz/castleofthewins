# Perceived vs Real Comparison

## Clear true-performance wins

| Flow | Before ready | After ready | Why it likely improved |
| --- | ---: | ---: | --- |
| `journal_section_switch_chronicle` | 14.8ms | 10.4ms | The lighter modal-open treatment and clearer section cue reduced the amount of visual heaviness around the switch. |
| `provisioner_panel_switch_sell` | 7.4ms | 6.4ms | The panel switch remained structurally optimized from step 06, and the lighter feel pass did not add real cost here. |
| `sage_identify_blocked` | 1.4ms | 0.8ms | The blocked flow stayed instant and now also presents the answer more clearly. |

## Mostly perceived-performance wins

- `Pack`
  Selection and filter timing changed only slightly, but the new strip makes the selected state readable without hunting for the inspector.
- `Magic`
  The filter path stayed effectively the same at `4.8ms`, but the screen answers more clearly because the selected spell and current filter are summarized above the dense card grid.
- `Field Guide`
  The section itself is now easier to read immediately because the guide tells you what the current section is for before the long-form content starts.

## Small raw regressions that are worth being honest about

| Flow | Before ready | After ready | Why it likely regressed |
| --- | ---: | ---: | --- |
| `utility_to_journal_open` | 9.1ms | 16.4ms | The new guide quick-state strip adds more markup on open. |
| `journal_to_pack_tab_switch` | 24.3ms | 26.5ms | Pack now renders an extra state summary on entry. |
| `pack_filter_switch_use` | 8.4ms | 9.9ms | Filter changes now also update the quick-state strip. |

## Takeaway

This step is a good teaching example of the difference between technical lag and UX lag. The menu system was already fast enough in several places, but it did not always *look* or *feel* decisive. Step 07 improved decisiveness more than it improved raw throughput, and the report keeps that distinction explicit.
