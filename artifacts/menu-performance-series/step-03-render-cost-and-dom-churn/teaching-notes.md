# Teaching Notes

When you want a render-cost baseline, ask for evidence from both runtime behavior and code ownership. A good prompt does three things:

1. Names the exact UI flows to exercise.
2. Asks for measurable timing or DOM evidence, not just “find what feels slow.”
3. Forces a distinction between expensive JavaScript, expensive DOM replacement, and UI that only feels heavy because the browser settles slowly afterward.

For menu work, a stronger prompt looks like this:

- launch the real game
- exercise specific menus
- record ready time and settle time
- inspect mutation scope or node churn
- inspect the owning code paths
- implement only 1-3 changes
- rerun the same collector afterward

That prompt shape is better than guessing because it keeps the work falsifiable. If the update does not make timings or DOM churn better, the report should say so.
