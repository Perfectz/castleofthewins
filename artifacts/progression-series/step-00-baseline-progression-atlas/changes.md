# Changes

This step intentionally does not redesign or rebalance the game. The work is an evidence pass plus a publication-ready artifact pass.

What was created:

- A new progression series root folder at `artifacts/progression-series/`
- A new step folder at `artifacts/progression-series/step-00-baseline-progression-atlas/`
- A step-local Playwright capture script at `data/capture-progression-atlas.mjs`
- A raw screenshot set in `screenshots/before/`
- Annotated atlas boards in `screenshots/after/`
- A structured capture log in `data/capture-results.json`
- Publication-ready written outputs covering the code baseline, screenshots, comparisons, teaching notes, and blog-ready framing

What was staged versus reached directly:

- Creation was restaged to an `Elf Wizard` draft so spell-forward class differentiation is visible in one creation frame.
- The bank screen was populated with representative mastery, contract, commendation, and currency state so the persistent progression layer is legible in one capture.
- Pack, magic, relic, and boon screens were staged through the live runtime UI rather than waiting for a long organic run to produce each state.
- Level-up and spell-study were reached through the actual level-up flow by granting enough XP to trigger the built-in interrupt.

What changed in the repo outside the step folder:

- `artifacts/progression-series/SERIES_INDEX.md` was added or updated to register this step.

What did not change:

- No runtime source files under `src/`
- No UI structure in `index.html`
- No CSS in `styles.css`
- No build scripts
- No generated gameplay bundle ordering

This is a baseline documentation shipment, not a product behavior shipment.
