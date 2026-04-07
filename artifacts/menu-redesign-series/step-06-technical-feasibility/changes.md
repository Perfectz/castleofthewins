# Changes

## Exact Files Changed

- `src/game.js`
- `artifacts/menu-redesign-series/SERIES_INDEX.md`
- `artifacts/menu-redesign-series/step-06-technical-feasibility/*`

## What Changed

- Added internal one-level utility return context for `How to Play`, `Device Settings`, `Mission Briefing`, and `Character Sheet`.
- Added contextual `Back to Menu` close labeling through the shared modal shell instead of per-surface custom markup.
- Added focus restoration when `Adventure Menu` closes back to gameplay, restoring the gameplay `Menu` control instead of leaving focus on `BODY`.
- Extended existing focus preservation to keyboard parity for non-pointer render refreshes.
- Added Playwright capture and behavior scripts to document the runtime before and after state.

## Why These Files Changed

- `src/game.js` owns the modal shell, surface launch decisions, focus restoration, and close behavior, so the low-risk fix lives there.
- `SERIES_INDEX.md` records the engineering findings and shipped scope inside the redesign series.
- The step-06 artifact folder stores the public case-study trail and Playwright evidence.

## Risk

- Low behavior risk because the return logic is scoped to four read-only surfaces launched specifically from `Adventure Menu`.
- Low visual risk because the visible change is a close-label update, not a layout rewrite.
- Moderate coordinator risk if the return context were expanded carelessly to workflows with side effects, which is why save/load, shops, and progression surfaces were excluded.

## Rollback

- Remove the utility return-context and focus-restore additions in `src/game.js`.
- Keep the step-06 artifact trail for historical comparison even if the runtime change is reverted.

## Follow-Up Suggestions

- Move `showUtilityMenu()` onto the shared modal helper to reduce its special-case behavior.
- Introduce a dedicated modal coordinator only after adding regression coverage for shops, save/load, and progression flows.
- Consider a broader opener-focus model for other top-level modals once this scoped pattern has proven stable.
