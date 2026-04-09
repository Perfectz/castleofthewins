# Timing And Feel Notes

This table separates raw timings from the UX value of the change.

| Flow | Before ready | After ready | Delta | Classification | Note |
| --- | ---: | ---: | ---: | --- | --- |
| `journal_section_switch_chronicle` | 14.8ms | 10.4ms | -4.4ms | `True + perceived` | Faster in reality, and the current section now announces itself more clearly. |
| `provisioner_panel_switch_sell` | 7.4ms | 6.4ms | -1.0ms | `True + perceived` | Slightly faster and easier to read because the panel state is explicit. |
| `sage_identify_blocked` | 1.4ms | 0.8ms | -0.6ms | `True + perceived` | Already fast before, but now the response is both faster and much clearer. |
| `magic_filter_switch_next` | 4.8ms | 4.8ms | 0.0ms | `Perceived only` | Raw speed is unchanged; the filter and selection state is just easier to confirm. |
| `pack_select_second_item` | 8.6ms | 9.5ms | +0.9ms | `Perceived win despite raw cost` | Slightly slower, but the selected item now answers itself without requiring an inspector scan. |
| `pack_filter_switch_use` | 8.4ms | 9.9ms | +1.5ms | `Perceived win despite raw cost` | The strip adds cost, but the filter state is more obvious. |
| `utility_to_journal_open` | 9.1ms | 16.4ms | +7.3ms | `Raw regression` | The guide open path pays for the new state strip. This should be treated honestly as added cost. |
| `journal_to_pack_tab_switch` | 24.3ms | 26.5ms | +2.2ms | `Raw regression` | Pack entry now renders more explanatory UI. |

## Performance truth vs UX truth

- Performance truth:
  this step did not make the menu system globally faster.
- UX truth:
  the menus now answer more clearly, especially in dense views and blocked-action cases.

## Most useful feel improvements

- `Sage` blocked identify now looks decisively answered.
- `Pack` feels less like “did it take?” because the selected state is summarized above the list.
- `Magic` and `Field Guide` feel less cognitively heavy because the player gets a quick orientation line before parsing dense content.
