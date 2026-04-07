# Changes

## Exact Files Changed

- `index.html`
- `src/core/utils.js`
- `src/features/creation.js`
- `src/game.js`
- `styles.css`

## What Changed

### `index.html`
- removed the creation-screen audio banner
- removed the always-visible `Run Notes` block from the preview column

### `src/core/utils.js`
- extended `choiceCard(...)` so a caller can provide a shorter note and an extra class name without affecting other screens

### `src/features/creation.js`
- switched race and class cards to a compact creation-specific variant
- replaced the full preview stat dump with a compact five-stat summary
- added the inline `Legacy & Contracts` disclosure
- moved persistence and contract detail into the disclosure content

### `src/game.js`
- added creation-screen disclosure state
- added `creation-toggle-legacy` handling
- reset disclosure state when starting a fresh creation draft

### `styles.css`
- tightened creation-sheet spacing and proportions
- added compact card styling for creation choices
- added compact preview summary and stat styles
- styled the `Legacy & Contracts` disclosure and preserved mobile CTA readability

## Why These Changes

The point of the step was to make the new-game screen feel like one primary action surface. Every change supports that: less default clutter, a shorter preview, and denser but still readable selection cards.

## Risk

Low:
- no creation functionality was removed
- no new modal path was introduced
- the disclosure state is local and reset on a fresh creation draft

## Rollback Notes

Rollback is straightforward:
- restore the audio and run-note markup in `index.html`
- remove the creation-specific preview and disclosure markup in `src/features/creation.js`
- remove `creationLegacyExpanded` and the toggle action in `src/game.js`
- remove the compact creation overrides from `styles.css`

## Follow-Up Suggestions

- decide whether the attribute allocator should get a similar density pass
- test whether advanced players miss the removed default stat detail
- keep progression vocabulary consistent between creation, bank, and town persistence screens
