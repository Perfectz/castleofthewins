# Changes

## Implemented Improvements

### 1. Shared mechanical spell readouts

- File: [`src/game.js`](../../../src/game.js)
- Added `getSpellMechanicalReadout`, `getSpellCardCopy`, and `getSpellUiTargetingLabel`.
- Applied them to Spell Study, Magic Book cards, Field Tray cards, and magic quick-state detail.

### 2. Better spell acquisition messaging

- File: [`src/game.js`](../../../src/game.js)
- Added unlock timing to Spell Study cards through `getSpellUnlockTimingText`.
- Expanded spell learning logs for both Spell Study and spellbooks so they tell the player what the spell does and whether it was added to the tray.

### 3. `Light` differentiation pass

- File: [`src/data/content.js`](../../../src/data/content.js)
- Updated `Light` so it now reveals nearby hidden threats within 6 tiles when cast, while still granting the 40-turn sight buff.

## Verification

- `npm run build`
- `npm run test:rules`
- Added rules coverage for Spell Study timing text and the `Light` reveal behavior in [`tests/rules.test.mjs`](../../../tests/rules.test.mjs).
