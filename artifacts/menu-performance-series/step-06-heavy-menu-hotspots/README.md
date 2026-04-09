# Step 06: Heavy Menu Hotspots

This step targeted the heaviest menu surfaces instead of broad menu plumbing. A fresh phone-sized Playwright pass identified `Pack`, `Field Guide`, and `Provisioner` as the best step-06 payoff because they were doing the most repeated list, comparison, and section-building work for routine interactions.

The implementation made three focused changes:
- `Pack` now refreshes only the regions that actually change during selection and filter interactions.
- `Field Guide` now renders only the active journal section instead of assembling every section on each switch.
- `Provisioner` now renders only the active buy or sell panel instead of computing both every time.

Verification:
- `npm run build`
- `npm run test:rules`
- `npm run playtest:harness`
- `node artifacts/menu-performance-series/step-06-heavy-menu-hotspots/data/collect-before.mjs`
- `node artifacts/menu-performance-series/step-06-heavy-menu-hotspots/data/collect-after.mjs`
