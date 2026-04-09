# Capstone Comparison

## Biggest wins across the whole series

| Flow or subsystem | Before | After | Why it matters |
| --- | ---: | ---: | --- |
| `Begin Adventure` | `185.2ms` | `56.9ms` | The game now becomes interactive much sooner after creation, which fixes a major first-impression stall. |
| First dungeon descent | `660.8ms` | `148.5ms` | The worst absolute responsiveness cliff in the whole menu-adjacent experience was cut down dramatically. |
| Town `Adventure Menu` open | `33.5ms` | `9.2ms` | A heavily repeated menu now opens in the "feels immediate" range. |
| `Pack` filter switch | `14.0ms` | `7.5ms` | A hotspot interaction stopped behaving like a whole-screen refresh. |
| `Provisioner` open | `12.6ms` | `8.6ms` | The town shop no longer pays hidden-panel work on entry. |
| `Provisioner -> Sell` settled | `82.6ms` | `50.2ms` | The shop still has work to do, but its heavy follow-through was reduced sharply. |
| `findUiElementByFocusKey` on `Menu -> Field Guide` | `10.8ms` | `0.1ms` | The custom focus system stopped doing a surprisingly expensive lookup in a common menu path. |

## Actual performance wins vs perceived-performance wins

### Mostly actual performance wins

- staged startup and stair work in step 02
- navigation cache and focus lookup cleanup in step 05
- pack, journal, and provisioner hotspot reductions in step 06

### Mostly perceived-performance wins

- local blocked-state feedback in step 04
- quick-state strips and lighter modal layering in step 07
- the capstone blur removal in step 08

## Step 08 capstone before vs after

The capstone change was intentionally small: remove the last modal-open blur from the background game layer and keep only dimming/saturation changes.

| Flow | Before ready | After ready | Ready delta | Before settled | After settled | Settled delta | Reading |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `utility_to_journal_open` | `12.1ms` | `11.7ms` | `-0.4ms` | `35.7ms` | `31.5ms` | `-4.2ms` | Small real improvement on open and settle. |
| `journal_section_switch_chronicle` | `14.8ms` | `9.8ms` | `-5.0ms` | `50.9ms` | `42.4ms` | `-8.5ms` | The clearest capstone win. |
| `journal_to_pack_tab_switch` | `24.5ms` | `26.8ms` | `+2.3ms` | `46.6ms` | `35.5ms` | `-11.1ms` | Mixed: slightly slower first response, calmer settle. |
| `pack_filter_switch_use` | `9.3ms` | `9.7ms` | `+0.4ms` | `81.0ms` | `44.8ms` | `-36.2ms` | Almost the same click response, much less post-click heaviness. |
| `pack_select_second_item` | `10.8ms` | `12.5ms` | `+1.7ms` | `64.1ms` | `43.5ms` | `-20.6ms` | Slightly worse ready time, meaningfully calmer settle. |
| `pack_to_magic_tab_switch` | `16.1ms` | `23.0ms` | `+6.9ms` | `74.0ms` | `64.9ms` | `-9.1ms` | Not a clear win. This remains a trace-worthy handoff. |
| `provisioner_panel_switch_sell` | `11.3ms` | `8.6ms` | `-2.7ms` | `75.9ms` | `66.6ms` | `-9.3ms` | Good small win on both axes. |
| `sage_identify_blocked` | `1.1ms` | `1.0ms` | `-0.1ms` | `80.5ms` | `42.2ms` | `-38.3ms` | Still instant, with far less visual aftermath. |

## Conclusion

The series already captured the large logic-side gains. Step 08 was a polish pass, and it behaved like one: it improved several settle-heavy interactions without pretending to solve the last true hotspot. The best remaining next move is still trace-driven work on the hub handoffs, especially `Field Guide -> Pack`.
