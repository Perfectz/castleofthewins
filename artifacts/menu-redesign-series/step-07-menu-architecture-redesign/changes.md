# Changes

## Exact Files Changed

- `index.html`
- `src/game.js`
- `styles.css`
- `artifacts/menu-redesign-series/SERIES_INDEX.md`
- step-07 artifact files under `artifacts/menu-redesign-series/step-07-menu-architecture-redesign/`

## What Changed

### 1. Utility menu support entries were restructured

- `Journal & Log` became `Field Guide`
- `How to Play` became `Guide`
- `Mission`, `Field Guide`, and `Guide` now deep-link into the journal tab with different section targets

### 2. The old journal tab became a structured `Field Guide`

- tab label changed from `Journal` to `Guide`
- modal title changed from `Run Journal` to `Field Guide`
- the support surface now has four internal sections:
  - `Current`
  - `Mission`
  - `Guide`
  - `Chronicle`

### 3. Help and briefing content were unified into the shared support surface

- mission content is now rendered in the `Mission` section
- help/rules content is now rendered in the `Guide` section
- title-screen `Learn Basics` still keeps the standalone help modal as a safe fallback outside a live run

## Why

Observed runtime friction showed that support information was fragmented across three similar modal destinations. Unifying them reduces menu-hopping, clarifies the role of the old journal, and creates a more coherent architecture without touching high-risk transactional flows like shops, saves, or reward choice.

## Risk

- low to medium
- most risk sits in journal rendering and tab navigation, not in gameplay rules
- the change touches existing support content structure, so content omissions or awkward grouping are more likely than simulation regressions

## Rollback

- revert `index.html`, `src/game.js`, and `styles.css`
- the prior behavior returns immediately because this step does not change saves, progression state, or data formats

## Follow-Up Suggestions

- further separate `Current` from `Chronicle` with stronger summary cards if the guide grows again
- test whether `Field Guide` should open on the last-used section or always on `Current`
- evaluate whether town services should adopt the same architecture split of operational sheet vs reference layer
