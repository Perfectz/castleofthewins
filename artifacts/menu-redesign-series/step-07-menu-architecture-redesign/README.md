# Step 07: Menu Architecture Redesign

This is the architecture step in the series. Earlier steps improved labels, hierarchy, focus, and modal return behavior; this step asks whether the support surfaces themselves are split correctly.

The key question here is simple: which information belongs in live play, which belongs in quick-access panels like `Pack` and `Magic`, and which belongs in a heavier support modal. The implementation answer in this step is a medium-scope prototype called `Field Guide`, which folds the old journal, mission briefing, and help/rules paths into one shared support surface with section-level deep links from `Adventure Menu`.

What changed:
- `Adventure Menu` now points to `Mission`, `Field Guide`, and `Guide` as deep links into one support surface
- the old `Run Journal` becomes `Field Guide`
- `Field Guide` adds four sections: `Current`, `Mission`, `Guide`, and `Chronicle`

What comes next:
- decide whether town services should follow the same split of quick sheet vs full modal
- decide whether reward choice and spell-learning flows should become lighter decision panels instead of isolated heavy overlays
- test whether more current-run context should move out of modals and closer to live HUD play
