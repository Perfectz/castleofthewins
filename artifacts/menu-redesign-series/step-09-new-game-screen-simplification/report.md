# Report

## Current-State Problem

The old creation screen was readable, but not selective. It asked the player to parse core setup, optional progression context, audio controls, a long preview stat block, and extra advisory text before they had even chosen a race and class. On phone, that made the surface feel like a dashboard rather than a clean commitment screen.

Observed from live captures:
- the `Title Theme` banner consumed valuable above-the-fold space without helping the player build a character
- `Run Notes` duplicated guidance that did not belong in the primary scan path
- the preview panel mixed identity confirmation with a long systems dump
- race and class cards were visually rich, but taller than they needed to be for a first decision screen

## Revised Creation Philosophy

The new-game screen should do one job well: help the player make a starting build quickly and confidently.

That means:
- core decisions stay visible
- secondary progression context stays available, but closed by default
- preview content confirms the build instead of explaining the whole game
- the primary CTA remains easy to find on mobile

## Implemented Architecture Shift

This is not a multi-screen rewrite. The shift is structural but still low-risk:

- the creation surface remains one sheet
- the left side stays decision-first: name, race, class, attributes
- the right side becomes a short confirmation panel
- long-tail meta context moves into an inline disclosure instead of living in the default view

## What Was Implemented

### 1. Quieted the default view

Removed:
- creation-screen audio banner
- always-visible `Run Notes`
- long always-expanded `Town Persistence` copy block

Added:
- inline `Legacy & Contracts` reveal inside the preview panel

### 2. Tightened the preview

The default preview now shows:
- identity card
- one short race and class summary line
- five decision-relevant metrics: `HP`, `Mana`, `Attack`, `Armor`, `Carry`

Removed from default preview:
- large full stat grid
- damage, evade, search, and base-attribute repetition

### 3. Compressed race and class cards

The cards still carry:
- sprite art
- the choice title
- one concise summary line
- one compact identity chip

But they now use less vertical space, which makes the screen feel less busy on mobile.

## Strategic Importance

This step matters because the new-game screen sets the tone for the whole product. A noisy first decision surface makes the rest of the menu system feel heavier than it is. A cleaner creation flow helps both new and returning players start faster without introducing more onboarding text.

## Risks

Low-risk:
- visual density changes
- inline disclosure state
- shorter preview content

Worth watching:
- some players may want the full derived-stat grid while allocating points
- the sticky mobile CTA rail can overlap deep preview content if the panel keeps growing in future steps

## Validation Notes

Playwright before and after captures were produced in `430x932` and `1440x1200` for:
- title to creation transition
- default creation view
- race change
- class change
- expanded `Legacy & Contracts`
- CTA readability

Additional runtime check:
- keyboard tab sequence remained stable after the name field, progressing through race, class, reset, and stat controls in order

## Recommended Follow-Up

Medium effort:
- simplify the attribute allocator presentation without weakening tactical clarity
- test whether one stat-summary toggle is justified for advanced players

Not justified yet:
- splitting creation into multiple screens
- adding tutorial copy or helper callouts
- adding another modal for progression or legacy systems
