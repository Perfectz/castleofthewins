# Before/After Comparison

## How to Play from Adventure Menu

- Before: the surface used a generic `Close` action and behaved like a dead-end modal. Closing it exited back to gameplay.
- After: the footer now reads `Back to Menu`, which matches the actual intended relationship. Runtime evidence in `data/behavior-after.json` shows `helpReturn.modalSurfaceKey = utility-menu` and `helpReturn.activeFocusKey = utility:help`.

## Mission Briefing from Adventure Menu

- Before: `Mission Briefing` also used the same generic `Close` label as a standalone modal, even though it was opened from the utility stack.
- After: `Back to Menu` makes the exit path explicit and consistent with the utility-launch context. The behavior pass confirms `briefingReturn.activeFocusKey = utility:briefing`.

## Device Settings from Adventure Menu

- Before: the screen visually looked fine, but closing it dumped the player back into gameplay and lost menu context.
- After: the close label matches the new one-level return behavior, and the runtime data shows the settings launcher regains focus inside `Adventure Menu`.

## Adventure Menu Close Back to Gameplay

- Before: closing the menu left the page focused on `BODY`, so keyboard and controller-style review lost a stable re-entry point.
- After: closing the menu restores focus to the gameplay `Menu` button. This is visible in `after-mobile-05-menu-close-focus.png` and `after-desktop-05-menu-close-focus.png`, and confirmed by `menuCloseFocus.activeFocusKey = top:menu`.

## What This Improvement Does Not Attempt

- It does not add a general modal stack.
- It does not change save/load, shop, bank, temple, sage, reward, or spell-study exit behavior.
- It does not rewrite directional navigation metadata.
