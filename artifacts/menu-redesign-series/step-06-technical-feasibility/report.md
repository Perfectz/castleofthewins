# Technical Feasibility Review

## Why This Step Matters

The live UI still carries friction that is not purely visual. Some of it comes from engineering shape: one orchestrator owns modal rendering, surface transitions, telemetry, controller focus, and many UI-specific decisions. That means cheap changes exist, but large “cleanup” ideas are riskier than they look.

## Runtime Friction Correlated to Code Structure

### Observed Friction

- Closing `Adventure Menu` dropped keyboard focus to `BODY` instead of returning it to the gameplay `Menu` control.
- Opening `How to Play`, `Device Settings`, `Mission Briefing`, or `Character Sheet` from `Adventure Menu` replaced the menu outright. Closing those surfaces exited back to gameplay instead of returning to the launching menu.
- The visible UI used the same generic `Close` label whether the player was leaving a standalone modal or backing out to a known launcher surface.

### Code Correlation

- `src/game.js` owns the modal shell, surface openers, close behavior, controller navigation metadata, and a large click dispatcher.
- `showUtilityMenu()` used a custom modal-open path instead of the shared `showSimpleModal()` focus-target pattern, which made it harder to preserve launcher context.
- `closeModal()` had no concept of one-level return flow, so all read-only utility surfaces collapsed directly to gameplay.
- `render()` already restored focus for gamepad flows, but keyboard parity was missing and top-level modal close had no restore step at all.

## Cheap and Safe Changes

- Add a scoped, internal return context only for read-only surfaces launched from `Adventure Menu`.
- Add contextual close labels through the shared modal shell rather than per-surface markup duplication.
- Restore focus to the gameplay `Menu` control when `Adventure Menu` closes, and clear stale modal-only focus keys.
- Extend existing focus restoration from gamepad-only to non-pointer input without changing the navigation grid system.

## Medium-Effort Changes Worth Considering

- Route `showUtilityMenu()` through the same shared modal helper as the rest of the read-only surfaces.
- Add a generic opener-focus model for more top-level modals beyond `Adventure Menu`.
- Break modal-surface configuration out of the large click switch into a smaller modal coordinator layer.

## Dangerous Changes Right Now

- A general modal stack or history system applied across every surface.
- Rewriting save/load, reward-choice, spell-study, shop, bank, temple, or sage flows in the same pass.
- Changing directional navigation metadata generation or the broader controller navigation model.
- Folding title, creation, and in-run modal behavior into a single abstracted stack without dedicated regression coverage.

## Regression Risks

- Returning to the wrong surface when `Escape`, back, and close-button actions share the same path.
- Keeping stale modal focus keys after the underlying DOM is removed.
- Accidentally reopening `Adventure Menu` from surfaces that should still close directly to gameplay.
- Creating hidden modal recursion if return context is not cleared before reopening the menu.

## Testing Needs

- Keyboard close behavior from `Adventure Menu` and each read-only utility-launched surface.
- Controller/back behavior through the same close path.
- Focus assertions after closing `Adventure Menu` back to gameplay.
- Guard checks that save/load, shops, town services, reward choice, spell study, title, and creation remain unchanged.

## Coupling Hotspots

- `src/game.js` owns too many UI concerns at once: modal shell, click routing, focus behavior, telemetry, and surface-specific launch decisions.
- `showUtilityMenu()` was historically a special case instead of part of the shared modal-shell pattern.
- Surface launching is embedded inside the monolithic click handler, which raises the cost of broad workflow changes.

## What Was Stabilized

### 1. Scoped Utility Return Flow

Read-only surfaces launched from `Adventure Menu` now carry a one-level return context:

- `How to Play`
- `Device Settings`
- `Mission Briefing`
- `Character Sheet`

Closing those surfaces now returns to `Adventure Menu` with focus restored to the launcher button instead of dropping out to gameplay.

### 2. Top-Level Focus Restoration

Closing `Adventure Menu` now restores focus to the gameplay `Menu` control. The behavior JSON confirms the before and after shift:

- Before: `menuCloseFocus.activeTag = BODY`, `activeFocusKey = null`
- After: `menuCloseFocus.activeTag = BUTTON`, `activeFocusKey = top:menu`

## Why These Changes Were Chosen

They directly address reproduced runtime friction, they live inside one coordinator seam, and they stop short of touching the higher-risk areas that still need deeper structural work. The result is a safer step that improves the live UI while also making the architectural risk visible and teachable.
