# Changes

## Exact Files Changed For This Step

- `index.html`
- `src/game.js`
- `artifacts/menu-redesign-series/SERIES_INDEX.md`
- `artifacts/menu-redesign-series/FINAL_SUMMARY.md`
- step-08 artifact files under `artifacts/menu-redesign-series/step-08-executive-roadmap-and-final-pass/`

## What Changed

### Final Polish Bundle

- `Adventure Menu` system action changed from `Guide` to `Rules`
- the matching `Field Guide` section chip changed from `Guide` to `Rules`

### Capstone Documentation

- added the full step-08 artifact pack
- updated `SERIES_INDEX.md`
- added `FINAL_SUMMARY.md` for the whole series

## Why

The final visible change resolves the cleanest remaining contradiction from step 07. The support container is `Field Guide`; the rules/help slice inside it should not compete with that name by also being called `Guide`.

## Risk

- very low
- label-only change for the shipped UI
- no save, flow, or interaction semantics changed

## Rollback

- revert `index.html` and `src/game.js`
- the architecture and behavior remain unchanged; only terminology returns to the prior wording

## Follow-Up

- if future playtests show that the rules slice is still under-discovered, evaluate iconography or stronger grouping before adding more help copy
- keep future changes inside the Phase 1 / Phase 2 split documented in this step
