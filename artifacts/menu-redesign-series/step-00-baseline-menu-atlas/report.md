# Report

## Menu atlas

- Entry and setup surfaces captured: `mobile-01-title.png`, `mobile-02-load-empty.png`, `mobile-03-creation.png`, plus matching desktop captures.
- Town loop surfaces captured: `town`, `bank`, `provisioner`, `armory`, `guild`, `temple`, `sage`, and `junk` in both viewports.
- In-run surfaces captured: `dungeon-hud`, `run-menu`, `pack`, `magic`, `journal`, `settings`, `help`, `character`, and `briefing` in both viewports.
- Progression and fail-state surfaces captured: `level-up`, `spell-study`, and `death` in both viewports.
- Not reached in this step: objective-specific reward choice, extraction summary, return summary, and post-death recovery beyond the `Fallen` recap. Those would need a deeper deterministic progression script to stage cleanly without broad state forcing.

## Navigation map

1. Title screen branches into character creation, help, and the disabled or empty save-flow.
2. Character creation leads directly into the town overview.
3. Town overview branches into service modals and the keep entrance.
4. First descent leads to the dungeon HUD, which then branches to run menu, pack, magic, journal, settings, help, character sheet, and briefing.
5. Progression overlays appear as interrupting modal sheets, and the failure branch ends in the `Fallen` recap.

The visual map version of that route is saved in `screenshots/after/navigation-map-board.png`.

## Visual strengths

- The UI language is consistent. Most surfaces use the same dark card system, rounded containers, muted metal-and-parchment palette, and clear button affordances.
- The phone-first intent is real, not aspirational. The movement pad, context buttons, persistent map panel, and touch-sized controls read like a product built for handheld play.
- Status numbers are generally readable. Health, mana, load, state, and depth remain legible on both mobile and desktop.
- The town services feel like part of one family. Even without redesign, the player can tell that bank, shops, temple, sage, and junk dealer belong to the same town loop.
- Progression and death screens are visually distinct enough to register as state changes rather than as ordinary utility views.

## Visual problems

- The current system spreads meaning across too many concurrent channels. On the phone layout the player has to parse the board, map panel, stat cards, live feed, action buttons, and multiple modal layers.
- The run menu is labeled like a general utility hub, but in practice it reads heavily as a save-slot manager. That mismatch weakens the mental model.
- Journal, briefing, help, settings, and the run menu all present overlapping support information but live in separate routes. The surface boundaries are not obvious from the UI alone.
- Town service screens share a strong visual shell, but they do not differentiate function strongly enough. The bank, provisioner, armory, guild, temple, sage, and junk dealer can blur together when scanned quickly.
- Desktop mostly scales the mobile pattern rather than recomposing it. The result is usable, but not especially intentional.

## Mobile-readability observations

- The mobile town overview is impressive but crowded. The board, minimap, stat stack, feed, and action area require vertical scanning instead of letting one glance answer "where am I, what matters, what can I do."
- The advisor strip appears structurally important, but in baseline captures much of the actual guidance lands in the live feed and action hints instead. That makes the information architecture feel split.
- Modal surfaces are readable but tall. Help, journal, run menu, and progression views encourage scrolling, which adds friction when the player only wants one answer quickly.
- The pack and journal views are clean, yet their tab structure implies a shared hub while settings and briefing sit outside that hub. The relationship is not self-evident.
- Touch affordances are generously sized, which is good, but the persistent chrome reduces how much dungeon board the player sees at once.

## Likely fragile flows

- Save and load: the title entry point is disabled when no saves exist, yet the runtime can still show a `Continue Run` empty state modal. That inconsistency is exactly the kind of thing that redesign work should normalize.
- First-time town onboarding: the player is asked to read the map, the feed, and the action hints together to understand the town-door tutorial.
- Utility versus meta information: journal, briefing, help, and settings each answer adjacent questions, but they are scattered across different access paths.
- Progression interruptions: `Level Up Perk` and `Spell Study` use the same modal grammar as utility surfaces, which risks flattening the emotional difference between progression and administration.
- Failure recovery: the `Fallen` recap is clear as a dead-end surface, but this step did not reach a richer recovery chain beyond that point.
