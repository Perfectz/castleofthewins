# Changes

## Exact changed files

- `index.html`
- `src/features/advisor.js`
- `src/game.js`
- `styles.css`

## What changed

- First-town status wording was shortened and clarified:
  - `Visit Door` became `Services`
  - first-town post-service `Go North` chip wording became `North Road`
- First-town primary dock wording was updated:
  - pre-service primary action now reads `Services`
  - pre-service note now reads `Open a town door`
  - post-service first-town primary action now reads `Go North`
  - post-service note now reads `Enter the keep`
- The `Adventure Menu` action area was rebuilt from one flat button grid into three compact groups:
  - `Run`
  - `Saves`
  - `System`
- The step-01 orientation sentence was removed from the menu.
- `Export Trace` remained available, but was visually de-emphasized so it no longer competes with core play actions.

## Why

The live UI showed two high-value confusion points: the first town action was not named by purpose, and the utility menu made unrelated actions compete at the same visual level. Both fixes improve comprehension through naming and hierarchy rather than extra explanation.

## Risk

- Low.
- The work is limited to label text, button grouping, and light styling.
- Main risk: menu grouping could affect scan rhythm or wrapping on narrow screens.
- Runtime check: matched Playwright captures confirmed the new layout stays readable on `430x932` and `1440x1200`.
- Focus check: a Playwright keyboard pass confirmed grouped tab order through the rebuilt menu.

## Rollback

- Revert `index.html`, `src/features/advisor.js`, `src/game.js`, and `styles.css`.
- No save migration, data migration, or gameplay rollback is required.

## Follow-up

- Evaluate whether town itself needs stronger environmental affordance for services, not more text.
- Test whether journal, mission, and map should eventually converge into a lighter support stack.
- Decide whether the next redesign step should target modal churn or town-to-dungeon continuity.
