# Linked Post

Finished the menu-performance capstone for the browser roguelike.

Biggest series wins:

- `Begin Adventure`: `185.2ms -> 56.9ms`
- first descent: `660.8ms -> 148.5ms`
- town utility open: `33.5ms -> 9.2ms`
- pack filter switch: `14.0ms -> 7.5ms`
- focus-key lookup on `Menu -> Field Guide`: `10.8ms -> 0.1ms`

The final step did not pretend there was one more giant fix waiting. It consolidated the evidence, shipped one small CSS polish bundle that removed the last modal-open blur from the background layer, and confirmed that the highest-value next work is still trace-driven analysis of `Field Guide -> Pack` and related hub settle behavior.

Good performance workflows separate:

- actual latency
- render breadth
- focus/navigation cost
- perceived slowness

That separation is what made the series useful instead of noisy.
