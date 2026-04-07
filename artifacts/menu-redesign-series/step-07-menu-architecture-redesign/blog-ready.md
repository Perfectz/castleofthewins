# Title

From Three Support Modals to One Field Guide

## Hook

Most menu redesign work starts with labels and layout. The harder question is whether the system is split correctly in the first place.

## Short Summary

In this step of the menu redesign series, I stopped treating the game’s support screens as isolated UI problems and treated them as an architecture problem. Live Playwright captures showed that `Mission Briefing`, `Run Journal`, and `How to Play` were three overlapping support surfaces competing for the same job. The shipped prototype replaces that split with a shared `Field Guide` structure, deep-linked from `Adventure Menu` into `Current`, `Mission`, `Guide`, and `Chronicle`.

## Draft

The first half of this menu redesign series stayed intentionally local. I fixed labels, hierarchy, focus behavior, and modal-return seams. Those changes mattered, but by step 07 a bigger pattern was obvious: the game’s support information was still split across too many adjacent surfaces.

From the player’s perspective, the overlap looked like this. `Mission Briefing` held current narrative objective context. `Run Journal` held a long mix of objective notes, pressure state, town reactions, chronicle logs, and telemetry. `How to Play` held rules and controls. None of those screens were individually wrong, but together they asked the player to maintain an unnecessary mental map of where support information lived.

That is an architecture problem, not just a copy problem.

The game already had the beginnings of a good three-layer model. The live HUD handled tactical-now information. `Pack` and `Magic` acted as quick, high-frequency panels. The missing piece was a coherent support layer. Instead of continuing to patch three separate reference modals, this step proposed a single support surface with explicit internal sections.

The prototype is called `Field Guide`.

`Field Guide` takes over the old journal slot and exposes four section-level roles:

- `Current` for the active floor, pressure, build, and immediate state
- `Mission` for the active objective path and reward stakes
- `Guide` for rules and controls
- `Chronicle` for discoveries, town-cycle history, archives, and telemetry

The important design move was not just renaming the journal. The important move was changing `Adventure Menu` so `Mission`, `Field Guide`, and `Guide` are now deep links into one support architecture instead of launches into three separate dead-end modals.

That change matters on phone first. Every extra menu hop costs more when the screen is tight, the modal stack is heavy, and the player is trying to preserve tactical context. By turning the support layer into one modal with section switching, the system becomes easier to parse without adding persistent HUD text, tutorial nags, or extra notification layers.

This is also a good example of a medium-scope prototype that stays honest about risk. I did not touch saves, shops, reward choices, or a general modal stack. I stayed inside the lowest-risk support slice of the codebase and made one architecture move that is visible in runtime and testable with before/after screenshots.

The result is not a finished end-state. `Chronicle` is still dense, and town services remain outside the new structure. But the game now has a clearer systems-level direction:

- HUD for tactical now
- quick panels for repeat interaction
- one support surface for mission, rules, and record

That is the kind of shift that local polish alone cannot deliver. Once the architecture gets cleaner, future UI improvements stop fighting the structure underneath them.

## 3 Lessons

- Menu quality is often constrained by architecture more than by copy.
- If several modals serve adjacent reference jobs, unify them before adding more explanation.
- A good architecture prototype should change system shape visibly while staying inside a low-risk code slice.

## 3 Pull Quotes

- “The problem was not that any one support modal was bad. The problem was that the player had to remember three of them.”
- “`Field Guide` is a structure change, not just a rename.”
- “HUD, quick panels, and support surfaces should each carry different cognitive jobs.”

## Suggested Screenshots

- `screenshots/before/before-mobile-01-run-menu.png`
- `screenshots/after/after-mobile-01-run-menu.png`
- `screenshots/before/before-mobile-03-mission-flow.png`
- `screenshots/after/after-mobile-03-mission-flow.png`
- `screenshots/before/before-mobile-04-guide-flow.png`
- `screenshots/after/after-mobile-04-guide-flow.png`
