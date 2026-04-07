# Report

## Discovery summary

The menu system is not a single menu. It is a family of surfaces that currently share one visual language and one modal pattern, even when they serve different jobs. Runtime captures show that this consistency helps the game feel cohesive, but it also blurs the difference between onboarding, run-state support, inventory management, and system settings.

The strongest discovery finding is boundary clarity. Players can access the information they need, but the UI does not always declare which surface answers which question. That is most visible in the in-run system menu and the support surfaces around it: briefing, journal, help, and settings.

## What jobs the menu system must do

1. Start or resume a run with confidence.
2. Explain the current objective, pressure, and next likely action without forcing the player to hunt across multiple surfaces.
3. Let players manage pack and spells quickly on a phone-sized screen.
4. Support town prep by surfacing persistence, banking, market state, and next-run planning.
5. Interrupt play cleanly for progression, rewards, and failure states.
6. Teach controls and rules on demand without feeling like a separate product.

## Player types the menu system must serve

- First-descent players: need plain language, clear entry points, and strong signposting for what to open when confused.
- Returning save-slot players: need to resume quickly and understand whether they are continuing a run, reviewing town persistence, or starting over.
- Short-session phone players: need fast access to pack, journal, and support surfaces without losing their place mentally.
- System optimizers: need dense information and efficient flows for equipment, spells, rewards, and town planning.

## What good looks like

### Onboarding

- The title screen clearly separates starting fresh, continuing a save, and learning basics.
- Support surfaces use role-forward names instead of generic names.
- A confused player can identify the right surface in one guess.

### In-run decisions

- The system menu acts as a true support hub, not as a mislabeled save screen.
- Menu entry points tell the player why they should open them.
- Information about current status, mission, and support actions is easy to scan.

### Town prep

- The player can tell the difference between immediate run state and persistent town state.
- Banking, save/load, contracts, and market review feel related but not conflated.

### Inventory and spell management

- Pack and spell views stay fast for experts but readable for first-time users.
- Titles and tabs help the player distinguish loadout, spellbook, and long-form run history.

### Reward selection

- Reward and progression overlays should feel important and interruptive in a good way, rather than like another generic sheet.

## UX goals

- Clarify surface roles without increasing flow depth.
- Preserve expert speed while reducing first-time ambiguity.
- Keep the phone-first character of the UI intact.
- Improve the menu system through naming and microcopy before attempting structural redesign.

## UX non-goals

- No art-direction overhaul.
- No full information-architecture rewrite in this step.
- No changes to inventory logic, spell systems, save architecture, or progression rules.
- No attempt to solve every dense surface immediately.

## Menu principles

- Name surfaces by the question they answer.
- Use the system menu as a support hub, not as a dumping ground.
- Keep management surfaces distinct from progression moments.
- Let first-time players orient quickly without stripping power from expert players.
- Prefer small, truthful copy changes before larger structural changes.

## Success criteria

- A first-time player can tell the difference between starting a run, continuing a save, and learning controls from the title screen alone.
- The in-run menu reads as a support hub for mission, character, save, and settings instead of as a mislabeled save sheet.
- Journal, help, and settings titles explain themselves more clearly in screenshots without requiring extra explanation.
- The shipped changes are visible in matched before and after captures and do not alter core game logic.

## Key tradeoffs

- Clarity versus density: the game benefits from rich information, but not every surface can carry the same level of density at all times.
- First-time readability versus expert speed: stronger naming can help new players without necessarily slowing experts.
- Shared visual language versus surface distinction: consistency is good, but some surfaces need clearer identity.
- Persistent support versus board space: every always-on cue competes with the playfield on phone screens.

## Decisions made in this step

- Rename title-screen CTAs to make first-run, returning-run, and learning paths more explicit.
- Rename `Run Menu` to `Adventure Menu` and add one sentence explaining its job.
- Rename utility actions to more clearly reflect player intent: `Floor Map`, `Mission`, `Character`, `Journal & Log`, `How to Play`, and `Return to Run`.
- Rename support-surface titles to `Run Journal`, `How to Play`, `Device Settings`, and `Mission Briefing`.
- Leave pack and magic structures unchanged for now, treating them as control shots rather than redesign targets in this step.
