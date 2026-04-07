# Report

## Discovery summary

Observed in the live UI, the biggest confusion is not a lack of information. It is a naming and hierarchy problem. Newer players can reach help, journal, mission, and town services, but the current UI sometimes makes the next action sound abstract, while experienced players still hit a flat utility menu that makes support actions harder to scan than they need to be.

This step therefore optimized for brevity. The fixes do not add new teaching text, helper banners, or persistent tutorial rows. They reduce friction by making the next action more literal and the support menu more structured.

## Player lens: brand new player

- What they try to do: understand what town is for, find the first meaningful action, and avoid making a bad early move.
- What they expect: a short label that tells them what to touch next, with details available elsewhere if needed.
- Where they hesitate: `Visit Door` describes a motion, not a purpose.
- Where they get confused: the value of town is spread across ticker, map, and support surfaces instead of being named directly in the main action area.
- What they miss: that town is a prep phase with services, not just a path to the keep.
- Where they feel slowed down: when the utility menu mixes run, save, and system actions with equal visual weight.
- Where they feel confident: once labels become literal and the journal/help surfaces stay available as optional depth.

## Player lens: returning casual player

- What they try to do: re-enter quickly, remember their run goal, and touch the fewest screens possible.
- What they expect: short labels, familiar grouping, and a menu that separates progress management from support screens.
- Where they hesitate: at the utility menu, where every action previously competed in one undifferentiated grid.
- Where they get confused: the difference between immediate run actions and lower-frequency system actions.
- What they miss: that `Export Trace` is not a primary play action.
- Where they feel slowed down: by scanning instead of recognizing.
- Where they feel confident: when grouped headings let them jump straight to the right section.

## Player lens: experienced tactics or roguelike player

- What they try to do: parse state fast, prep efficiently, and get back to the board.
- What they expect: terse language and low ceremony.
- Where they hesitate: when onboarding-oriented copy competes with high-frequency controls.
- Where they get confused: not by rules, but by weak information hierarchy.
- What they miss: nothing critical, but time is lost to unnecessary scan cost.
- Where they feel slowed down: in modal-heavy support surfaces that do not prioritize by frequency.
- Where they feel confident: when the UI uses category structure instead of extra explanation.

## Player lens: mobile-first player

- What they try to do: keep the screen readable, avoid clutter, and preserve the board as the primary visual anchor.
- What they expect: minimal text, minimal chrome, and labels that carry their weight.
- Where they hesitate: when a label is too abstract to justify leaving the board.
- Where they get confused: when support surfaces look dense before they look useful.
- What they miss: low-priority controls hidden among high-priority ones.
- Where they feel slowed down: by vertical scrolling inside modals and by extra copy above the controls.
- Where they feel confident: when the important action is named clearly and the rest stays tucked into menus.

## Player lens: keyboard or focus-heavy player

- What they try to do: move predictably through actions without visually re-parsing the menu every time.
- What they expect: stable order, grouped focus movement, and obvious low-priority actions.
- Where they hesitate: when tab order walks through a flat button field with no semantic grouping.
- Where they get confused: when save, mission, and system controls interleave.
- What they miss: relative priority.
- Where they feel slowed down: by having to decode order from memory instead of structure.
- Where they feel confident: when tab order follows grouped sections. A live Playwright focus pass on the rebuilt menu progressed as `Mission`, `Journal & Log`, `Character`, `Save Slot`, `Load Slot`, `Floor Map`, `Settings`, `How to Play`.

## First-session confusion

- Town value was the sharpest first-session confusion point.
- In the before capture, the town chip said `Visit Door`, which was mechanically accurate but semantically weak.
- In the after capture, the chip says `Services` and the main dock action also says `Services`, which makes the next move legible without adding tutorial prose.

## In-run decision friction

- The first dungeon HUD already carries substantial context through board state, ticker, dock actions, and support menus.
- The stronger problem here is not missing text. It is making sure optional support stays optional.
- This step deliberately left the dungeon HUD structurally unchanged so clarity gains did not come from more on-screen explanation.

## Town prep friction

- Town prep is where new and returning players diverge most.
- New players need the first action named more literally.
- Returning players need the menu to stay out of the way once they understand the town loop.
- The shipped changes support both by making town intent clearer without making town noisier.

## Inventory and spell pain points

- Pack and magic remain dense but readable support surfaces.
- They were captured before and after as control shots because this step was not about adding more labels inside deep management screens.
- The main finding is that these surfaces are acceptable when accessed intentionally, but they should not leak more explanatory burden into the persistent HUD.

## Why the chosen fixes matter

- `Services` names the purpose of the first town action instead of the physical interaction.
- `North Road` and `Go North` tighten the handoff from town prep to first descent.
- Grouping the `Adventure Menu` lowers scan cost without adding more words.
- De-emphasizing `Export Trace` keeps utility power available without letting it compete with high-frequency actions.

## UX non-goals for this step

- No new tutorial system.
- No new persistent hints.
- No modal-flow rewrite.
- No journal, help, or settings redesign.
- No attempt to solve all modal churn in one pass.

## Decisions made

- Favor brevity over explanation.
- Put optional detail in existing support surfaces, not in persistent HUD text.
- Fix the first town action and the utility menu first because they affect both first-run clarity and repeat-session speed.
