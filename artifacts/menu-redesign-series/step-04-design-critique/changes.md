# Changes

## Exact changed files

- `index.html`
- `src/game.js`
- `styles.css`

## What changed

- Reordered the `Adventure Menu` template so action groups come before summary panels in the actual DOM, not just visually.
- Changed action emphasis in the menu:
  - `Save Slot` is no longer primary
  - `Return to Run` is now the primary full-width action in the `System` group
- Added stronger section-card styling for grouped utility actions.
- Rewrote `How to Play` from paragraph-heavy copy into three scanable sections:
  - `Core Loop`
  - `Controls`
  - `Dungeon Rules`
- Added list styling for the help surface to improve phone-sized readability.

## Why

The critique found two concrete readability failures in the live UI:

- the utility menu prioritized summary information over control
- the help surface prioritized prose over scanability

These changes correct both without introducing new flows, new systems, or tutorial overlays.

## Risk

- Low.
- The changes are limited to markup order, button emphasis, and support-surface presentation.
- Main risk: changing DOM order could affect menu focus behavior.
- Verification: Playwright after-captures and a runtime focus review confirmed that the new menu order now better matches visual hierarchy.

## Rollback notes

- Revert `index.html`, `src/game.js`, and `styles.css`.
- No save, data, or gameplay rollback is required.
