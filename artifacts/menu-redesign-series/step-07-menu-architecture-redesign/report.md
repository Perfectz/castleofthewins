# Step 07 Report

## Current-State Architecture

Before this step, the support layer was split across three separate destinations launched from `Adventure Menu`:

- `Mission Briefing`
- `Run Journal`
- `How to Play`

That split created three architecture problems visible in runtime:

- the player had to remember which modal held mission context versus long-form rules versus run history
- the menu advertised three conceptually related surfaces as separate top-level destinations
- the journal itself had grown into a catch-all scroll rather than a clear support system

In practice, the game already had a reasonable three-layer structure, but the support layer was not named or organized cleanly:

- Live HUD: tactical-now information, board state, danger, dock actions
- Quick panels: `Pack` and `Magic` for high-frequency decisions
- Full modals: town services, save/load, support/reference screens

## Revised Architecture

This step proposes a cleaner systems-level split:

- Live HUD should carry immediate tactical state only
- Quick panels should cover repeat action surfaces with high interaction density: `Pack` and `Magic`
- One support/reference modal should hold mission context, rules, and long-form run history

That support modal is now prototyped as `Field Guide`.

## Revised Philosophy

- Keep tactical-now information close to play
- keep high-frequency choices in lightweight tabbed panels
- collapse adjacent reference surfaces before adding more help text
- preserve expert speed by deep-linking into the shared support surface instead of adding extra steps
- preserve discoverability by naming the support surface by job rather than by ambiguous archive language

## Revised Hierarchy

### Live HUD

- action bar and dock actions
- status capsules
- board and targeting state
- immediate pressure and objective cues

### Quick Panels

- `Pack`: equipment, burden, item actions
- `Magic`: spell book, tray management, cast entry

### Full Support Modal

- `Field Guide`
  - `Current`: current floor, pressure, build, immediate run state
  - `Mission`: active briefing and reward stakes
  - `Guide`: rules and control reference
  - `Chronicle`: discoveries, town cycle, mastery/archive, history, telemetry

## Better Split by System

### Inventory / Pack

Keep as a quick panel. It is interaction-heavy and benefits from the existing tabbed hub model.

### Magic / Spells

Keep as a quick panel. It is also interaction-heavy and already shares a strong mental model with `Pack`.

### Journal / Help / Mission

These were the most obvious fragmentation problem. They now fit better as one support surface with section-level entry points.

### Town Services

Not changed in this prototype. They should probably remain distinct operational modals, but their information should become more summary-driven so the player does not need to bounce back into support/reference surfaces to understand what a town stop means.

### Reward Choices

Not changed in this prototype. Long term, reward choice should stay decision-first and avoid becoming another archive-style modal. The architecture lesson is that reward choice is a decision surface, not a reference surface.

## Ways This Reduces Menu-Hopping

- `Mission` no longer opens a separate briefing modal
- `Guide` no longer opens a separate help modal
- the former journal home is now the same `Field Guide` surface
- switching between support roles happens via section chips inside one modal instead of by backing out and relaunching different screens

## New-Player Discoverability

- `Field Guide` is a clearer name than `Run Journal` for a mixed mission/rules/history surface
- `Guide` stays visible in `Adventure Menu`, so new players still have a clear place to click when they want rules
- the `Guide` section now explicitly explains where information lives without adding persistent HUD clutter

## Expert Efficiency

- `Pack` and `Magic` remain top-level hub tabs
- `Mission` and `Guide` are deep links, not buried submenus
- `Current` keeps the most immediately useful support content as the default section

## What Was Implemented

The live prototype shipped in code is:

- `Adventure Menu` relabeling and rerouting so `Mission`, `Field Guide`, and `Guide` are all entry points into one shared support surface
- a rebuilt journal tab renamed `Field Guide`
- section-level support navigation with `Current`, `Mission`, `Guide`, and `Chronicle`
- shared mission/help content moved into that surface

## Strategic Importance

This is the first step that changes the system shape rather than only polishing existing screens. It demonstrates that the game can reduce modal fragmentation without turning the HUD into a tutorial layer and without attempting a risky full coordinator rewrite.

## Risks

- the old journal contained many secondary archive blocks, and this prototype necessarily re-groups them rather than preserving the previous long-scroll order
- some players may still think of `Guide` and `Field Guide` as too similar until more menu terminology is refined
- town services and reward flows still sit outside this new support architecture, so the whole system is not unified yet

## Cheap and Safe Follow-Ups

- tighten the `Field Guide` summary row so the default `Current` section carries slightly more live objective context
- audit all strings that still say `journal` internally or in player-facing copy
- add one controller test that switches `Field Guide` sections and returns to play

## Medium-Effort Opportunities

- turn town-service intros into compact summary headers with stronger service value
- move mission reward stakes closer to decision moments rather than only support surfaces
- break `Chronicle` into a lighter recent-history view plus deeper archive view if it grows again

## Dangerous Right Now

- rewriting the general modal coordinator or introducing a global modal history stack
- merging town-service transaction flows into the support surface without dedicated regression coverage
- moving too much tactical context out of the HUD and into support modals
