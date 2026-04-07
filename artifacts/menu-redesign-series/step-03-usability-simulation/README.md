# Step 03: Usability Simulation

This step focuses on likely user confusion because the live UI already exposes the main pain points before a formal study is run. In a phone-first tactics game, hesitation is often visible as vague labels, overloaded modal surfaces, or a weak distinction between "what should I do now?" and "where do I go for details?"

The question for this step was narrow: which confusion points are most likely to hurt first-session clarity and repeat-session speed, and what is the smallest visible shipment that can reduce them now? The answer stayed intentionally minimalist.

What changed:

- The first-town status chip and primary dock action now say `Services` instead of `Visit Door`.
- After the first town-service visit, that same first-town state now promotes `North Road` and `Go North`.
- The `Adventure Menu` no longer opens with an orientation paragraph and no longer presents its actions as one flat wall of buttons.
- The action area is now grouped into `Run`, `Saves`, and `System`, with `Export Trace` visually de-emphasized.

What this step documents:

- live before/after Playwright captures for title, creation, town, first dungeon HUD, run menu, pack, magic, journal, help, and settings
- simulated usability findings across five player lenses
- the reasoning behind two small, low-risk UI changes

What comes next: use the findings here to decide whether the next step should tighten town-to-run continuity, reduce modal churn further, or re-rank support surfaces around journal, mission, and map access.
