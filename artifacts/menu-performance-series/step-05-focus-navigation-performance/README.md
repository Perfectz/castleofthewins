# Step 05: Focus Navigation Performance

This step isolates the custom menu focus/navigation layer. The baseline showed that several menus were spending real time in focus setup rather than in the menu content itself, especially `focusFirstUiElement -> getUiNavigableElements` on open and `findUiElementByFocusKey` during modal focus restore.

The implementation made three focused changes:

- added a navigation cache for focusable elements and focus-key lookups
- scoped modal metadata assignment to the active surface instead of querying every menu pattern on every modal pass
- consolidated duplicate scroll-host logic so focus movement and scroll intent use the same target resolution

Measured wins were strongest on menu-open and focus-restore paths:

- `Town menu open`: `18.2ms -> 7.2ms`
- `Settings open`: `11.6ms -> 5.7ms`
- `Provisioner open`: `12.4ms -> 9.6ms`
- `Menu -> Field Guide`: focus-key lookup cost `10.8ms -> 0.1ms`

Verification:

- `npm run build`
- `npm run test:rules`
- `npm run playtest:harness` (failed on the same unrelated guided-route assertion seen in prior steps)
- `node artifacts/menu-performance-series/step-05-focus-navigation-performance/data/collect-before.mjs`
- `node artifacts/menu-performance-series/step-05-focus-navigation-performance/data/collect-after.mjs`
