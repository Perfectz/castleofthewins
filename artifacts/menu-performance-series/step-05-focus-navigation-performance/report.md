# Focus Navigation Performance Report

## Current navigation/focus model

The game uses a custom focus system layered on top of DOM focus. `src/game.js` assigns `data-focus-key`, `data-nav-zone`, `data-nav-row`, `data-nav-col`, and directional overrides, then uses `handleUiNavigationIntent()` and `findDirectionalUiTarget()` to move focus across menus. Modal open and modal refresh paths call `applyControllerNavigationMetadata()`, then resolve a preferred focus target and focus it programmatically.

In practical terms, the focus model is:

- metadata-driven
- rebuilt frequently
- shared across title, creation, hub tabs, service menus, settings, and bank flows
- tightly coupled to modal refresh and focus-restore logic

## Performance pain points

The baseline exposed two concrete hotspots:

1. Menu open frequently spent real time in `focusFirstUiElement() -> getUiNavigableElements()`.
2. Modal focus restoration could spend a surprising amount of time in `findUiElementByFocusKey()`.

Examples from the baseline:

- `Town menu open`: `getUiNavigableElements` cost `13.1ms`
- `Provisioner open`: `getUiNavigableElements` cost `7.8ms`
- `Settings open`: `getUiNavigableElements` cost `4.0ms`
- `Menu -> Field Guide`: `findUiElementByFocusKey` cost `10.8ms`

The metadata pass also did more work than necessary. `applyModalNavigationMetadata()` scanned for creation, hub, shop, service, bank, spell-learn, journal, and utility selectors in one large pass even when only one surface was actually mounted.

## Reliability pain points

The focus system had three quality-of-life liabilities:

- menu-open focus could feel inconsistent because the first-focus step depended on a fresh full-root scan
- reused modal shells still went through broad metadata assignment, which increases the chance of stale or unnecessary overrides
- scroll-host logic was duplicated in two class methods, which made focus scrolling and scroll intent harder to reason about and easier to drift apart over time

## What was changed

1. Added a reusable navigation cache in `src/game.js` for:
   - current navigation root
   - focusable elements
   - focus-key lookup map
2. Changed `getUiNavigableElements()` and `findUiElementByFocusKey()` to use that cache.
3. Changed `applyControllerNavigationMetadata()` to rebuild the cache immediately after metadata assignment so menu-open and focus-restore paths use the prepared navigation model instead of re-querying the DOM.
4. Split modal metadata assignment by active surface:
   - utility menu
   - hub tabs
   - shop
   - settings
   - bank
   - service modals
   - creation and title still retain their dedicated setup
5. Consolidated the duplicate `getScrollHostForElement()` definitions into one consistent modal-aware helper.

## Why it should improve both speed and usability

These changes reduce repeated work exactly where the player notices it:

- menu-open focus lands faster because it no longer depends on a fresh root-wide focusable scan
- focus restore becomes cheaper because lookup is map-based instead of a linear DOM search
- surface-specific metadata assignment avoids unnecessary selector work and lowers the chance of fragile cross-surface behavior
- a single scroll-host resolver makes focus movement and scroll behavior more predictable across pack, journal, and settings

In UX terms, the menus feel less fragile because focus lands faster and more consistently, especially when opening a menu, switching to a sibling modal, or using controller-style directional movement.

## Regression risks

- The navigation cache now assumes modal and shell paths continue to call `applyControllerNavigationMetadata()` after meaningful DOM changes. Future menu code that skips that step could use stale cached entries.
- Surface-scoped metadata assignment is safer for current flows, but any newly added modal type will need an explicit navigation branch or it will fall back to the generic minimal path.
- The focus cache relies on `data-focus-key` uniqueness within the active root. Duplicate keys would now be more noticeable because the first cached match wins.

## Remaining navigation debt

- `getUiNavMeta()` still computes layout rects on directional movement. That cost is smaller than the old root scans, but it is still part of the live navigation path.
- Some settle times remain noisy on focus-only interactions even though first-response costs improved. That points to browser-side layout/paint aftermath rather than lookup cost.
- The navigation model is still strongly data-attribute-driven inside a very large coordinator file. It is faster now, but it is not yet small or easy to reason about.
