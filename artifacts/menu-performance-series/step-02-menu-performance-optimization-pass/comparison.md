# Baseline vs After

## Key flow comparison

| Flow | Baseline ready | After ready | Delta | Baseline settled | After settled | Delta |
|---|---:|---:|---:|---:|---:|---:|
| `creation_to_town_start` | 185.2ms | 56.9ms | -128.3ms | 252.4ms | 131.6ms | -120.8ms |
| `utility_menu_open_town` | 33.5ms | 9.2ms | -24.3ms | 36.4ms | 37.2ms | +0.8ms |
| `utility_to_journal_open` | 19.2ms | 17.9ms | -1.3ms | 62.6ms | 83.3ms | +20.7ms |
| `journal_to_pack_tab_switch` | 66.0ms | 40.7ms | -25.3ms | 78.1ms | 66.5ms | -11.6ms |
| `pack_filter_switch_use` | 14.1ms | 12.6ms | -1.5ms | 49.7ms | 45.3ms | -4.4ms |
| `pack_to_magic_tab_switch` | 15.2ms | 16.2ms | +1.0ms | 65.8ms | 73.3ms | +7.5ms |
| `magic_to_journal_tab_switch` | 7.3ms | 6.5ms | -0.8ms | 74.0ms | 122.2ms | +48.2ms |
| `town_bank_open_direct` | 17.9ms | 19.8ms | +1.9ms | 21.7ms | 41.9ms | +20.2ms |
| `descend_to_dungeon` | 660.8ms | 148.5ms | -512.3ms | 685.2ms | 166.1ms | -519.1ms |
| `utility_menu_open_dungeon` | 15.1ms | 6.7ms | -8.4ms | 23.7ms | 26.4ms | +2.7ms |
| `reward_screen_open_direct` | 9.0ms | 5.9ms | -3.1ms | 29.5ms | 28.9ms | -0.6ms |

## Worst offenders now

- Worst absolute stall remains `descend_to_dungeon`, but it is no longer in the same class as baseline.
- Worst menu first-response path is now `journal_to_pack_tab_switch` at `40.7ms`.
- Worst menu settle path is `magic_to_journal_tab_switch` at `122.2ms`, which is mostly a perceived-lag issue because first response is still `6.5ms`.

## Target check

| Target | Result |
|---|---|
| `Field Guide -> Pack <= 30ms ready` | Missed. Latest run: `40.7ms`, but still improved by `25.3ms`. |
| `Adventure Menu open in town <= 20ms ready` | Met. Latest run: `9.2ms`. |
| `Pack -> Magic settle -25%` | Missed in the latest run. `65.8ms -> 73.3ms`. |
| `Magic -> Journal settle -25%` | Missed in the latest run. `74.0ms -> 122.2ms`. |
| `Begin Adventure ready -25%` | Met. `185.2ms -> 56.9ms`. |
| `Dungeon descent ready -25%` | Met. `660.8ms -> 148.5ms`. |

## Read this comparison correctly

- The strongest gains are real and repeatable on startup, utility open, pack filtering, reward modal open, and dungeon descent.
- The hub tab chain improved in `readyMs` more than in `settledMs`.
- The mixed settle behavior means the next pass needs browser-trace evidence for pane visibility, layout, and paint, not another round of broad application-level refactors alone.
