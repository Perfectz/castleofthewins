# Step 03: Spell System Deep Dive

This step isolates the spell system from the broader progression stack and treats it as its own design surface. The audit inspects spell definitions, learning routes, scaling hooks, tray usage, book presentation, and utility versus offense patterns, then ships three narrow spell-focused improvements instead of a large combat rebalance.

## Scope

- Reviewed all implemented spells, spell categories, spell learning routes, spellbook acquisition, spell tray behavior, magic hub presentation, and spell-study progression flow.
- Captured before and after screenshots in mobile and desktop viewports for Spell Study, Magic Book, and the Field Tray.
- Implemented three spell-focused improvements:
  - Added concrete mechanical readouts across spell surfaces.
  - Added unlock-timing messaging in Spell Study and stronger learn messaging when acquiring spells.
  - Tuned `Light` to reveal nearby hidden threats so it does more than act as a passive sight tax.

## Verification

- `npm run build`
- `npm run test:rules`
- `node artifacts/progression-series/step-03-spell-system-deep-dive/data/capture-spell-deep-dive.mjs`
- `node artifacts/progression-series/step-03-spell-system-deep-dive/data/capture-spell-deep-dive.mjs --after`
