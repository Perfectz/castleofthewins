# Teaching Notes

## What worked about this workflow

1. Start with a baseline, not a hunch.
   Step 01 prevented the series from treating every heavy-feeling menu as a raw render problem.
2. Split the work by hypothesis.
   Render breadth, input latency, focus/navigation, hotspot menus, and perceived slowness each needed a separate pass.
3. Reuse the same measurement shape.
   Comparable collectors made it possible to say what actually improved instead of guessing from memory.
4. Pair code evidence with runtime evidence.
   The strongest steps combined wrapped method timings, DOM counts, and visible screenshots.

## Prompting lessons worth reusing

- Ask for measured evidence first.
- Ask for "actual latency vs perceived latency" explicitly.
- Narrow each implementation step to `1-3` improvements so the pass does not turn into a speculative rewrite.
- Require report sections that force honesty about regressions and mixed outcomes.
- Finish with a "next profiling step" so the workflow stays iterative instead of pretending the first optimization pass solved everything.

## Best advanced prompt pattern from this series

Use a sequence like this:

1. Baseline the experience in the live runtime.
2. Optimize the largest real stalls.
3. Narrow DOM/render breadth.
4. Improve input confidence and focus-system cost.
5. Attack the heaviest individual screens.
6. Clean up perceived slowness separately.
7. End with a capstone that consolidates evidence and limits any final code change to something clearly justified.

## What to copy into another repo

- A stable Playwright collector with `readyMs`, `settledMs`, DOM churn, and screenshot capture.
- A rule that every pass must distinguish technical lag from UX lag.
- A requirement that the final step produces a roadmap, not just more code.
