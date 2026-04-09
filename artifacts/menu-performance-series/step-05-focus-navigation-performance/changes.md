# Changes Made

## Runtime changes

- Added `uiNavigationCache` to `src/game.js`
- Added `getUiNavigableSelector()`, `resetUiNavigationCache()`, `rebuildUiNavigationCache()`, and `getUiNavigationCache()`
- Updated `getUiNavigableElements()` to reuse the cached focusable list
- Updated `findUiElementByFocusKey()` to use the cached focus-key map first
- Updated `applyControllerNavigationMetadata()` to rebuild the cache immediately after metadata assignment
- Split modal navigation metadata into smaller surface-specific helpers
- Removed the duplicate `getScrollHostForElement()` definition and kept one consistent resolver

## Artifact and instrumentation changes

- Added step-05 Playwright collectors for before and after focus-navigation measurements
- Expanded snapshots to track:
  - focusable count
  - focus-key count
  - navigation zone count
  - navigation-specific call costs

## Notes

- No gameplay input behavior outside the menu system was intentionally changed.
- `patch.diff` is a focused excerpt for this step because the repository already contains unrelated tracked changes.
