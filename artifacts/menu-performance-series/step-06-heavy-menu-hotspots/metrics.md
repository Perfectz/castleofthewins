# Timing Notes

This table stays focused on the heavy menu screens from this pass. `Ready` is first visible response. `Settled` is the broader calm-down window after the first response and is useful for "felt heavy" behavior.

| Flow | Before ready | After ready | Ready delta | Before settled | After settled | Settled delta | Before top call | After top call | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| `utility_to_journal_open` | 19.5ms | 13.2ms | -6.3ms | 44.6ms | 37.7ms | -6.9ms | `showHubModal 19.1ms` | `showHubModal 12.8ms` | Journal open is lighter because it no longer assembles every section body. |
| `journal_section_switch_chronicle` | 12.1ms | 12.4ms | +0.3ms | 56.5ms | 31.0ms | -25.5ms | `refreshJournalHubSection 11.0ms` | `refreshJournalHubSection 11.7ms` | First response stayed similar, but the long-form follow-through work dropped sharply. |
| `journal_section_switch_mission` | 5.9ms | 3.3ms | -2.6ms | 34.7ms | 58.6ms | +23.9ms | `refreshJournalHubSection 5.2ms` | `refreshJournalHubSection 3.0ms` | Mission is faster to answer, though this run had noisier later settle. |
| `journal_to_pack_tab_switch` | 33.7ms | 31.3ms | -2.4ms | 65.0ms | 66.6ms | +1.6ms | `updateHubModalContent 33.3ms` | `showHubModal 30.9ms` | Still the heaviest remaining menu handoff. |
| `pack_filter_switch_use` | 14.0ms | 7.5ms | -6.5ms | 42.4ms | 31.9ms | -10.5ms | `refreshPackHub 13.0ms` | `refreshPackHub 6.5ms` | Clear pack win from region refresh and cached inventory presentation. |
| `pack_select_second_item` | 13.1ms | 9.0ms | -4.1ms | 80.0ms | 63.2ms | -16.8ms | `updateHubModalContent 12.4ms` | `refreshPackHub 8.6ms` | Selection changes now stay inside pack instead of forcing a full pane rebuild. |
| `pack_to_magic_tab_switch` | 15.6ms | 14.2ms | -1.4ms | 31.4ms | 60.0ms | +28.6ms | `updateHubModalContent 15.4ms` | `updateHubModalContent 13.7ms` | Magic was not a direct target; only the handoff is slightly better. |
| `magic_filter_switch_next` | 6.7ms | 7.0ms | +0.3ms | 85.2ms | 34.3ms | -50.9ms | `refreshMagicHubContent 6.0ms` | `refreshMagicHubContent 6.5ms` | Magic was unchanged structurally, but later settle was calmer in this run. |
| `provisioner_open_direct` | 12.6ms | 8.6ms | -4.0ms | 29.9ms | 29.5ms | -0.4ms | `showShopModal 11.7ms` | `showShopModal 7.8ms` | Open no longer pays for both hidden panels. |
| `provisioner_panel_switch_sell` | 7.7ms | 6.7ms | -1.0ms | 82.6ms | 50.2ms | -32.4ms | `updateShopModalPanel 7.5ms` | `updateShopModalPanel 6.4ms` | Panel switch is still not cheap, but the hidden buy/sell waste is gone. |

## Visible smoothness notes

- Pack felt noticeably better after this step. The `Use` filter and item selection no longer had the same "whole screen woke up" feel.
- Journal section switching still reads as a content-heavy screen, but chronicle now settles much sooner after the first response.
- Provisioner now opens and flips panels with less obvious drag because only the visible panel is prepared.
