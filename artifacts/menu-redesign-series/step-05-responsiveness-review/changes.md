# Changes

## Exact Files Changed

- `src/game.js`
- `styles.css`
- `artifacts/menu-redesign-series/SERIES_INDEX.md`
- `artifacts/menu-redesign-series/step-05-responsiveness-review/*`

## What Changed

- Removed the deferred `120ms` refresh from `selectSpell(... openTray: true)` so tray-to-targeting handoff is immediate.
- Added stronger `:focus-visible` treatment for buttons, tabs, chips, dense cards, utility menu controls, reward cards, and tray surfaces.
- Strengthened active-state contrast for pack rows, spell cards, tray cards, reward cards, tabs, and filter chips.
- Added clearer disabled styling so blocked actions look deliberate rather than simply dimmed.
- Captured matched before and after screenshots for eight interaction-heavy flows in mobile and desktop viewports.

## Why

These changes target the highest-value responsiveness issues without changing system structure. The goal was to improve confidence and perceived speed using hierarchy, contrast, and timing rather than new copy or tutorials.

## Risk

- Low risk to gameplay rules and save integrity.
- Moderate visual risk if the stronger highlight language felt too loud, but the after captures stayed within the established amber-on-dark system.
- Very low behavioral risk from the spell-handoff change because it removes a timeout without altering spell logic.

## Rollback

- Revert the `selectSpell` branch in `src/game.js`.
- Remove the step-05 responsiveness overrides in `styles.css`.
- Leave the artifact trail in place for historical record even if the UI change is rolled back.

## Follow-Up

- Extend the same responsiveness language into town-service lists and longer journal subsections.
- Review whether confirm and cancel affordances in non-combat modals need stronger asymmetric priority.
