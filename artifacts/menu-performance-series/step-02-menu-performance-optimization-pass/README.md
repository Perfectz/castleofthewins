# Step 02: Menu Performance Optimization Pass

This step implements the first optimization pass against the step-01 baseline, then reruns the same phone-sized Playwright collector. The biggest verified wins are no longer in ordinary modal chrome alone: `Begin Adventure` and stair descent dropped sharply after staging startup and depth transitions, and utility menu open also became materially faster.

The hub stack improved on first-response timing, but the `journal -> pack -> magic -> journal` chain still has mixed settle behavior. The code changes reduced full modal rebuilds and narrowed controller metadata work, but the remaining lag is now dominated by modal subtree visibility/layout churn rather than obvious JavaScript hotspots.

Primary evidence lives in:

- `data/raw-metrics.json`
- `metrics.md`
- `comparison.md`
- `report.md`
- `screenshots/before/`
- `screenshots/after/`
