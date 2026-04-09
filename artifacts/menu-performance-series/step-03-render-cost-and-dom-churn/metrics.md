# Metrics

| Flow | Before ready | After ready | Delta | Before settled | After settled | Delta | Before churn | After churn | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| `utility_to_journal_open` | 15.6ms | 13.3ms | -2.3ms | 36.5ms | 35.5ms | -1.0ms | `6 added / 4 removed` | `3 added / 3 removed` | Journal open now reuses a narrower live path. |
| `journal_section_switch_chronicle` | 11.9ms | 14.2ms | +2.3ms | 34.1ms | 63.1ms | +29.0ms | `4 / 4` | `3 / 3` | Less live DOM churn, but browser settle got worse. |
| `journal_section_switch_guide` | 5.6ms | 6.1ms | +0.5ms | 53.1ms | 71.0ms | +17.9ms | `4 / 4` | `3 / 3` | Same pattern as chronicle. |
| `journal_to_pack_tab_switch` | 31.9ms | 36.5ms | +4.6ms | 38.8ms | 81.7ms | +42.9ms | `1 / 1` | `1 / 1` | Still a remaining heavy path outside this step’s narrow changes. |
| `pack_filter_switch_use` | 11.4ms | 11.1ms | -0.3ms | 28.5ms | 84.8ms | +56.3ms | `4 / 4` | `4 / 4` | Pack was not directly optimized in this step. |
| `pack_select_second_item` | 9.8ms | 9.3ms | -0.5ms | 47.1ms | 66.4ms | +19.3ms | `4 / 4` | `4 / 4` | Ready time slightly better, settle still noisy. |
| `pack_to_magic_tab_switch` | 9.0ms | 11.9ms | +2.9ms | 39.8ms | 67.8ms | +28.0ms | `4 added / 2 removed` | `4 added / 2 removed` | Not a target of the code changes. |
| `magic_select_identify` | 7.6ms | 4.5ms | -3.1ms | 50.5ms | 66.0ms | +15.5ms | `4 / 4` | `2 / 2` | Best direct win from in-place spell card updates. |
| `magic_filter_switch_next` | 4.5ms | 6.4ms | +1.9ms | 39.8ms | 62.5ms | +22.7ms | `4 / 4` | `3 added / 11 removed` | Filter row no longer rebuilds, but list settle is still heavy. |
| `magic_to_journal_tab_switch` | 4.8ms | 4.3ms | -0.5ms | 49.2ms | 63.8ms | +14.6ms | `1 / 1` | `1 / 1` | Ready improved slightly. |
| `provisioner_open_direct` | 8.0ms | 14.2ms | +6.2ms | 21.2ms | 32.0ms | +10.8ms | `3 / 0` | `3 / 0` | Initial open was not optimized in this step. |
| `provisioner_panel_switch_sell` | 7.5ms | 7.5ms | 0.0ms | 30.6ms | 73.4ms | +42.8ms | `3 / 3` | `3 / 3` | Modal shell now stays mounted; timing still needs trace follow-up. |
| `town_bank_open_direct` | 11.2ms | 13.1ms | +1.9ms | 40.1ms | 30.3ms | -9.8ms | `3 / 0` | `3 / 0` | Not a target, but settled faster in this run. |

## Timing takeaway

This step reduced unnecessary live DOM work on the targeted flows, but the timing results are mixed. The cleanest speed improvement is on magic spell selection; the clearest structural improvements are narrower live node churn on journal open, journal section toggles, and spell selection.
