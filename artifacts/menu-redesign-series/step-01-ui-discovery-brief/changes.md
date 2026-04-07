# Changes

## Exact changed files

- `index.html`
- `src/game.js`
- `styles.css`

## What changed

- Title-screen CTA labels were renamed:
  - `New Run` to `Start Run`
  - `Continue` to `Continue Save`
  - `How to Play` to `Learn Basics`
- The utility-menu template was reframed:
  - `Run Menu` to `Adventure Menu`
  - added a short orientation sentence
  - `Current Run` to `Right Now`
  - `Saved Run` to `Resume Point`
  - `Controls` to `Device & Controls`
  - `Map` to `Floor Map`
  - `Briefing` to `Mission`
  - `Stats` to `Character`
  - `Journal` to `Journal & Log`
  - `Help` to `How to Play`
  - `Close` to `Return to Run`
- Support-surface titles were renamed in runtime code:
  - `Journal` to `Run Journal`
  - `Help` to `How to Play`
  - `Settings` to `Device Settings`
  - `Briefing` to `Mission Briefing`
- Added `.utility-menu-intro` styling in `styles.css`.

## Why

The discovery brief identified boundary clarity as the highest-value low-risk improvement. These changes make surface purpose more obvious without changing flow order, navigation behavior, or gameplay systems.

## Risk

- Low. The work is limited to copy, labels, and one small layout text block.
- Main risk: longer labels could wrap awkwardly on narrow screens.
- Runtime check: matched Playwright screenshots confirmed the new copy renders correctly in the targeted flows.

## Rollback notes

- Revert `index.html`, `src/game.js`, and `styles.css` to remove the shipment.
- No state migration, save-format change, or gameplay logic rollback is required.
