# Changes

## Implemented Improvements

### 1. `Quick Hands` now does real work

- File: [`src/game.js`](../../../src/game.js)
- Change: added `isQuickHandsUtilityPickup`, used it to bypass burden prompts for gold, consumables, spellbooks, and other light pickups, and prevented those utility grabs from adding greed pressure after objective completion.
- Reason: the perk was previously a dead or at least untrustworthy choice in the rogue pool.

### 2. `Greedy Purse` now has a true payoff and cost

- Files: [`src/features/objectives.js`](../../../src/features/objectives.js), [`src/features/director.js`](../../../src/features/director.js)
- Change: greed option gold rewards now gain a 25% relic multiplier, and post-objective greed actions add one extra point of pressure when the relic is equipped.
- Reason: the relic now matches its stated identity instead of reading as unimplemented flavor text.

### 3. Objective reward previews now forecast real outcomes

- File: [`src/features/objectives.js`](../../../src/features/objectives.js)
- Change: replaced generic reward preview strings with explicit objective and milestone outcome summaries.
- Reason: reward planning is part of progression readability, and the old text did not support real decision-making.

## Verification

- `npm run build`
- `npm run test:rules`
- Before and after Playwright capture runs both completed successfully.
