# Step 04: Input Latency And Responsiveness

This step measures menu interaction trust rather than broad render cost. The before/after Playwright pass shows that most menu interactions were already logically fast, but the UI still lacked immediate local confirmation in blocked-service paths and could feel heavier than the raw timings suggested during focus and tab movement.

The implementation stays narrow:

- modal-local feedback for `good`, `warning`, and `bad` log messages while a modal is open
- immediate interaction acknowledgment hooks for pointer, keyboard confirm, and controller confirm paths
- smarter modal scrolling during focus movement so navigation does not force a generic `scrollIntoView()` when the target is already visible

Verification run:

- `npm run build`
- `npm run test:rules`
- `npm run playtest:harness` (failed on an unrelated guided-route assertion)
- `node artifacts/menu-performance-series/step-04-input-latency-and-responsiveness/data/collect-before.mjs`
- `node artifacts/menu-performance-series/step-04-input-latency-and-responsiveness/data/collect-after.mjs`

Key evidence:

- `Town menu open` ready time improved from `10.2ms` to `9.7ms`
- `Sage open` ready time improved from `6.6ms` to `4.5ms`
- `Begin Adventure` improved slightly from `48.2ms` to `46.1ms`
- `Sage blocked identify` stayed effectively instant at `0.8ms`, but now shows visible local modal feedback instead of relying only on the hidden run log

This was a mixed timing pass overall. Several hub transitions remain slower or noisier in settled time, so the main honest outcome is improved interaction trust plus a clearer next profiling target.
