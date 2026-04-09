# Capstone Metrics

This step measured one final small polish bundle rather than another large logic rewrite. The main question was whether removing the residual modal-open blur reduced heavy-feeling settle behavior without materially harming first response.

| Flow | Before ready | After ready | Ready delta | Before settled | After settled | Settled delta | Verdict | Note |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `utility_to_journal_open` | `12.1ms` | `11.7ms` | `-0.4ms` | `35.7ms` | `31.5ms` | `-4.2ms` | `Small win` | Journal open is slightly faster and a bit calmer. |
| `journal_section_switch_chronicle` | `14.8ms` | `9.8ms` | `-5.0ms` | `50.9ms` | `42.4ms` | `-8.5ms` | `Clear win` | Best capstone result. |
| `journal_to_pack_tab_switch` | `24.5ms` | `26.8ms` | `+2.3ms` | `46.6ms` | `35.5ms` | `-11.1ms` | `Mixed` | Slightly slower answer, better calm-down. |
| `pack_filter_switch_use` | `9.3ms` | `9.7ms` | `+0.4ms` | `81.0ms` | `44.8ms` | `-36.2ms` | `Settle win` | The click itself is flat, but the screen stops feeling busy much sooner. |
| `pack_select_second_item` | `10.8ms` | `12.5ms` | `+1.7ms` | `64.1ms` | `43.5ms` | `-20.6ms` | `Settle win` | Same pattern as pack filter: calmer aftermath, not better first click. |
| `pack_to_magic_tab_switch` | `16.1ms` | `23.0ms` | `+6.9ms` | `74.0ms` | `64.9ms` | `-9.1ms` | `Not a win overall` | Still a remaining hotspot. |
| `magic_filter_switch_next` | `5.7ms` | `5.7ms` | `0.0ms` | `64.1ms` | `71.6ms` | `+7.5ms` | `Flat to worse` | No evidence that the capstone helped this path. |
| `provisioner_open_direct` | `14.8ms` | `14.5ms` | `-0.3ms` | `26.9ms` | `31.0ms` | `+4.1ms` | `Mostly flat` | The open path was already reasonably healthy. |
| `provisioner_panel_switch_sell` | `11.3ms` | `8.6ms` | `-2.7ms` | `75.9ms` | `66.6ms` | `-9.3ms` | `Good win` | Another settle-heavy path that benefits from lighter modal layering. |
| `sage_identify_blocked` | `1.1ms` | `1.0ms` | `-0.1ms` | `80.5ms` | `42.2ms` | `-38.3ms` | `QoL win` | Still instant, with much less visual drag afterward. |

## Reading this table correctly

- This was not a broad throughput pass.
- The capstone change mostly helped visual settle and perceived heaviness.
- `Field Guide -> Pack` and `Pack -> Magic` are still the clearest remaining raw menu targets.
