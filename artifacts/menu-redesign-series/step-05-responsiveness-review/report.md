# Responsiveness Review

## Why Responsiveness Matters Here

In this game, responsiveness is mostly about trust. Menus are dense, modal-heavy, and often used in the middle of tactical decisions. If focus is hard to see, if selection is too subtle, or if a cast handoff hesitates, the game can feel uncertain even when the underlying system is fast enough.

## Review Method

- Used Playwright to launch the live game and capture paired before and after screenshots in `430x932` and `1440x1200`.
- Staged interaction-heavy runtime states instead of reasoning from code alone.
- Evaluated run-menu entry, pack selection, magic selection, spell tray usage, spell targeting handoff, reward-choice focus, blocked tray behavior, and settings-toggle focus.

## Responsiveness Principles

- Instant: menu open and close, focus movement, tab switching, filter switching, pack selection, magic selection, spell tray selection, confirm and cancel state swaps, spell-to-target handoff.
- Lightly animated: hover lift, press feedback, focus ring emphasis, active-card emphasis.
- Delayed on purpose: combat effects, cast circles, and gameplay feedback that benefits from a readable beat.

## Current Weak Points Before Changes

### Focus Visibility

Controller-focused states already had stronger affordances than ordinary keyboard `:focus-visible`. In the live run-menu and settings captures, focus existed, but it did not always read as the current interaction target at a glance.

### Dense Selection Surfaces

Pack, magic, and reward-choice surfaces relied on modest border and background shifts. The selected state was present, but it did not clearly read as "this is the thing the next action will use."

### Blocked States

The staged full-tray state in Magic behaved correctly, but disabled actions looked mostly faded rather than intentionally blocked. That weakens confidence because it can look like a rendering issue instead of a deliberate rule.

### Spell Handoff Timing

The spell-cast path deferred a tray refresh by `120ms` when opening from field play. That is small in raw time, but large enough to feel mushy in a turn-based input loop where selection and targeting should feel immediate.

## What the UI Already Communicates Well

- The game already has a coherent dark-metal visual language with amber reserved for importance.
- The menu groupings from earlier steps hold up under this review.
- Reward choice, spell tray, and pack all map clearly to game systems once the current target is visually obvious.

## What Felt Uncertain Before

- The first visible focus target in `Adventure Menu` did not pop enough for non-controller input.
- In `Pack & Equipment`, the active card could blend into nearby equipment slots.
- In `Magic`, the chosen spell looked only slightly warmer than its neighbors.
- In reward choice, the active perk was functional but not emphatic enough for a high-stakes commitment surface.
- In the blocked tray state, a disabled action lacked strong intentionality.

## Shipped Changes

### 1. Unified Visible Focus

Extended high-visibility `:focus-visible` treatment to the major menu controls instead of relying mainly on controller-specific focus styling. Focus now gets a clear ring, stronger contrast, and a slight lift that is visibly different from hover.

### 2. Stronger Selected-State Contrast

Active pack rows, spell cards, tray cards, filter chips, tabs, and choice cards now use stronger amber contrast and a more committed active treatment. Non-selected magic and tray siblings are mildly de-emphasized when a selected card is present, making the current target easier to read on phone.

### 3. Faster Spell Handoff

Removed the `120ms` deferred refresh in `selectSpell(... openTray: true)`. Spell selection and target-entry now hand off immediately instead of waiting for a timeout-driven tray refresh.

## Why These Changes Improve Trust

- They tell the player where input currently is.
- They tell the player which thing is selected.
- They tell the player when an action is intentionally blocked.
- They remove a tiny but noticeable delay in one of the highest-pressure menu-to-play transitions.

## Evidence From the Captures

- `before-mobile-01-run-menu.png` vs `after-mobile-01-run-menu.png`: the focused `Journal & Log` button becomes unmistakable instead of merely outlined.
- `before-mobile-02-pack.png` vs `after-mobile-02-pack.png`: the active pack card now reads as the current selection rather than one card among many similar cards.
- `before-mobile-03-magic.png` vs `after-mobile-03-magic.png`: `Magic Missile` becomes visually dominant as the selected spell and the surrounding cards recede slightly.
- `before-mobile-07-blocked-state.png` vs `after-mobile-07-blocked-state.png`: the full-tray state reads as intentional because the blocked card styling is stronger and more deliberate.
- `before-desktop-06-reward-choice.png` vs `after-desktop-06-reward-choice.png`: the selected perk now has the visual weight expected of a commitment choice.
- `before-mobile-08-settings.png` vs `after-mobile-08-settings.png`: toggle focus is much clearer for keyboard and controller-style navigation.

## Risks and Boundaries

- This step intentionally does not redesign modal flow or add new guidance text.
- It also does not try to solve every pacing issue in the system.
- The tradeoff is deliberate: improve confidence first, without adding clutter or re-architecting the menu stack.
