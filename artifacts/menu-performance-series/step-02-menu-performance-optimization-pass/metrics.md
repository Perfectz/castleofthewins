# Metrics

## Latest after-run timings

| Flow | Ready | Settled | Long tasks |
|---|---:|---:|---:|
| `title_help_open` | 11.2ms | 52.4ms | 0 |
| `title_help_close` | 5.5ms | 24.8ms | 0 |
| `title_to_creation_open` | 21.1ms | 45.0ms | 0 |
| `creation_to_town_start` | 56.9ms | 131.6ms | 1 |
| `utility_menu_open_town` | 9.2ms | 37.2ms | 0 |
| `utility_to_settings_open` | 8.7ms | 83.3ms | 0 |
| `settings_close_back_to_menu` | 4.8ms | 54.3ms | 0 |
| `utility_to_journal_open` | 17.9ms | 83.3ms | 0 |
| `journal_section_switch_guide` | 7.3ms | 47.4ms | 0 |
| `journal_to_pack_tab_switch` | 40.7ms | 66.5ms | 0 |
| `pack_filter_switch_use` | 12.6ms | 45.3ms | 0 |
| `pack_to_magic_tab_switch` | 16.2ms | 73.3ms | 0 |
| `magic_to_journal_tab_switch` | 6.5ms | 122.2ms | 0 |
| `journal_close_to_game` | 2.4ms | 44.3ms | 0 |
| `pack_open_from_action_bar` | 15.7ms | 46.8ms | 0 |
| `pack_close_to_game` | 2.2ms | 52.5ms | 0 |
| `town_bank_open_direct` | 19.8ms | 41.9ms | 0 |
| `town_bank_close_to_game` | 2.1ms | 54.9ms | 0 |
| `descend_to_dungeon` | 148.5ms | 166.1ms | 1 |
| `utility_menu_open_dungeon` | 6.7ms | 26.4ms | 0 |
| `utility_close_dungeon` | 1.8ms | 46.1ms | 0 |
| `reward_screen_open_direct` | 5.9ms | 28.9ms | 0 |

## Baseline vs after summary

| Flow | Baseline ready | After ready | Change |
|---|---:|---:|---:|
| `creation_to_town_start` | 185.2ms | 56.9ms | -128.3ms |
| `utility_menu_open_town` | 33.5ms | 9.2ms | -24.3ms |
| `utility_to_journal_open` | 19.2ms | 17.9ms | -1.3ms |
| `journal_to_pack_tab_switch` | 66.0ms | 40.7ms | -25.3ms |
| `pack_filter_switch_use` | 14.1ms | 12.6ms | -1.5ms |
| `pack_to_magic_tab_switch` | 15.2ms | 16.2ms | +1.0ms |
| `magic_to_journal_tab_switch` | 7.3ms | 6.5ms | -0.8ms |
| `town_bank_open_direct` | 17.9ms | 19.8ms | +1.9ms |
| `descend_to_dungeon` | 660.8ms | 148.5ms | -512.3ms |
| `utility_menu_open_dungeon` | 15.1ms | 6.7ms | -8.4ms |
| `reward_screen_open_direct` | 9.0ms | 5.9ms | -3.1ms |

## Interpretation

- `readyMs` is the primary “input to visible response” metric.
- `settledMs` captures whether the interface still feels heavy after the first visible response.
- The strongest wins are on startup, descent, utility open, pack filter, and reward open.
- The hub chain still needs another profiling pass because first response improved more than final settle time.
