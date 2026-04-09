# Timing Table

All timings are from the same `393x852` Playwright collector shape used for this step. `Ready` is first visible response. `First focus` is the first measurable focus move. `Settled` is broader multi-frame calm-down time and should not be confused with true input latency.

| Flow | Before ready | After ready | Ready delta | Before first focus | After first focus | Before settled | After settled | Settled delta | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Title -> Creation | 19.1 | 23.6 | 4.5 | 18.2 | 23.1 | 46.2 | 25.3 | -20.9 | Slower first response, faster full settle |
| Begin Adventure | 48.2 | 46.1 | -2.1 | n/a | n/a | 95.3 | 107.7 | 12.4 | Slight ready improvement, not menu-only |
| Town menu open | 10.2 | 9.7 | -0.5 | 10.0 | 9.4 | 21.8 | 22.1 | 0.3 | Small real win |
| Menu -> Field Guide | 12.3 | 13.0 | 0.7 | 11.9 | 12.6 | 52.3 | 27.2 | -25.1 | Similar response, much faster settle |
| Field Guide -> Chronicle | 13.6 | 16.4 | 2.8 | 13.2 | 15.9 | 53.4 | 72.4 | 19.0 | Still heavy |
| Field Guide -> Pack | 22.2 | 33.3 | 11.1 | 22.0 | 33.0 | 41.4 | 47.0 | 5.6 | Worst hub-switch path in this pass |
| Pack focus first item | 1.2 | 1.0 | -0.2 | 0.9 | 0.7 | 27.3 | 76.5 | 49.2 | Actual focus still instant; settle remains noisy |
| Pack focus move down | 2.5 | 2.9 | 0.4 | 2.0 | 2.4 | 30.6 | 64.9 | 34.3 | Actual focus still fast |
| Pack select second item | 12.9 | 21.1 | 8.2 | 12.6 | 20.5 | 45.0 | 68.8 | 23.8 | Still feels weighty |
| Pack -> Magic | 9.7 | 12.8 | 3.1 | 9.3 | 12.5 | 38.7 | 44.4 | 5.7 | Needs trace follow-up |
| Magic select Identify | 5.3 | 7.0 | 1.7 | 4.7 | 6.4 | 51.1 | 75.5 | 24.4 | Actual response still single-digit |
| Magic filter switch | 4.5 | 7.7 | 3.2 | 4.2 | 7.5 | 52.9 | 72.4 | 19.5 | Remains a hot path |
| Magic close | 2.3 | 2.2 | -0.1 | n/a | n/a | 40.7 | 46.1 | 5.4 | Close is already fast |
| Provisioner open | 7.6 | 15.7 | 8.1 | 7.4 | 15.4 | 45.6 | 30.3 | -15.3 | Slower ready, better settle |
| Provisioner -> Sell | 6.7 | 8.9 | 2.2 | 6.4 | 8.6 | 48.3 | 64.7 | 16.4 | Still heavier than expected |
| Provisioner close | 1.4 | 1.5 | 0.1 | n/a | n/a | 24.9 | 50.3 | 25.4 | Actual close remains immediate |
| Sage open | 6.6 | 4.5 | -2.1 | 6.3 | 4.3 | 48.9 | 30.6 | -18.3 | Clear measured win |
| Sage blocked identify | 0.8 | 0.8 | 0.0 | n/a | n/a | 31.8 | 41.3 | 9.5 | Now shows local feedback inside the modal |

## Behavior notes

- Raw input latency was already low for most paths.
- The best visible improvement is the blocked-action case in `Sage`, where the player now gets immediate in-context confirmation.
- The biggest remaining issue is hub-switch confidence, especially `Field Guide -> Pack` and `Magic` filtering.
