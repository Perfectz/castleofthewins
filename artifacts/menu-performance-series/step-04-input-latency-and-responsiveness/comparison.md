# Before Vs After Comparison

## Best measured wins

- `Town menu open` ready time improved from `10.2ms` to `9.7ms`, and first focus improved from `10.0ms` to `9.4ms`.
- `Sage open` improved from `6.6ms` to `4.5ms`, with settle dropping from `48.9ms` to `30.6ms`.
- `Menu -> Field Guide` kept roughly the same ready time (`12.3ms` to `13.0ms`) but settled much faster (`52.3ms` to `27.2ms`).
- `Begin Adventure` improved slightly from `48.2ms` to `46.1ms`, though that is adjacent to gameplay startup rather than a pure menu path.

## Best perceived wins

- `Sage blocked identify` was already fast, but it now gives visible modal-local feedback instead of relying only on the run log.
- Confirm and focus interactions now get immediate acknowledgment, which makes the UI feel less uncertain on touch and controller input.
- Focus scrolling is less blunt, so list movement no longer forces a generic modal jump when the target item is already visible.

## Worst remaining offenders

- `Field Guide -> Pack` remains the worst measured hub-switch path in this pass.
- `Provisioner open` and `Provisioner -> Sell` still feel heavier than simple modal actions should.
- `Magic filter switch` remains too noisy for such a small state change.

## Comparison takeaway

The interaction layer is more trustworthy after this pass, but not uniformly faster. The clearest hard gains are in town utility access, the `Sage` menu, and the visibility of blocked-action feedback. The hub family still needs a trace-guided pass because some transitions remain slower even after the responsiveness work.
