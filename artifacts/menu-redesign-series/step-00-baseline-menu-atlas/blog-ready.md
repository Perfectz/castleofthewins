# Title

Baseline Before Redesign: Building a Menu Atlas for a Phone-First Dungeon Crawler

# Hook

Before changing a UI this dense, the smartest move is not sketching a new look. It is freezing the current system in a way the whole team can study.

# Short summary

This step documents the current menu and modal system of a phone-first browser dungeon crawler with live Playwright evidence. The result is a baseline menu atlas: raw screenshots, annotated study boards, a manifest, and a written report that make the existing information architecture visible before redesign begins.

# Draft

Redesign work often starts too late in the process and too high in the abstraction stack. A team agrees that the UI feels crowded, someone says the menus are confusing, and the next move is already mockups. That approach skips a hard but valuable step: proving what the current product actually looks like across real states.

For this project, that missing step was especially important. The game is a phone-first, browser-playable, single-player dungeon crawler with a lot of UI surfaces. Important information is spread across the playfield, a live feed, a map panel, a status stack, contextual actions, town-service modals, journal tabs, briefing screens, settings, and progression overlays. If you redesign that system from memory, you are almost guaranteed to simplify the wrong thing.

So the first task in the series was not redesign. It was a baseline menu atlas.

Using Playwright, I captured the live game in both mobile and desktop viewports. The baseline includes the title screen, an empty save-state flow, character creation, town overview, every major town service, the first dungeon HUD, the run menu, pack, magic, journal, settings, help, character sheet, briefing, progression overlays, and the death recap. The captures were taken from reachable runtime states whenever possible, with a short list of clearly documented staging-only adjustments for screens like spell study and the death recap.

That distinction matters. A baseline should not pretend every screenshot came from organic play if it did not. It should tell the truth about which states were easy to reach, which ones required light staging, and which ones still need a deeper harness. In this step, objective-specific reward choice and return-summary recovery screens were left out because they were not cleanly reachable without a broader deterministic progression script. Calling that out is part of the quality of the artifact, not a weakness in it.

The raw screenshots are useful, but raw evidence alone is slow to read. That is why the second half of the step focused on after-side documentation boards rather than redesign comps. The mobile and desktop atlas boards turn dozens of captures into curated contact sheets. The navigation map board shows how the system branches from title to creation, town, dungeon utility, progression, and failure. A dedicated HUD callout board makes the layer split explicit by labeling the board, minimap, status strip, live feed, movement pad, and context actions.

The big takeaway from the baseline is not that the current UI is broken. In fact, it has several strengths: a coherent visual language, strong touch targets, readable stat cards, and a town-service loop that already feels structurally intentional. The real issue is information distribution. On a phone-sized screen, the player is asked to track multiple channels at once, and several surfaces with adjacent purposes live in separate routes. Journal, briefing, help, settings, and the run menu all explain overlapping parts of the game, but they do not yet form a clear hierarchy.

That is exactly the kind of insight a baseline makes possible. Instead of arguing about whether the interface feels cluttered in a general sense, the team can now point to named screens, compare mobile and desktop behavior, and talk concretely about what belongs together, what should be demoted, and what needs stronger separation.

Baseline work is not glamorous, but it is one of the highest-leverage steps in a redesign series. It turns subjective discomfort into a shared visual record. Once that record exists, redesign can become intentional instead of reactive.

# 3 lessons

- Capture first, redesign second. A baseline keeps the next step honest.
- Separate reachable states from staged states. That distinction prevents false confidence during redesign.
- Curated study boards are more useful than raw screenshots alone because they compress comparison time for the team.

# 3 pull quotes

- "Before redesign, freeze the current system so the team is arguing about reality, not memory."
- "A baseline atlas turns UI discomfort into named, comparable evidence."
- "The goal of step zero is not prettier screens. It is a better understanding of the screens you already have."

# Suggested screenshots

- `screenshots/after/mobile-baseline-atlas-board.png`
- `screenshots/after/navigation-map-board.png`
- `screenshots/after/mobile-hud-callout-board.png`
- `screenshots/before/mobile-04-town.png`
- `screenshots/before/mobile-13-run-menu.png`
