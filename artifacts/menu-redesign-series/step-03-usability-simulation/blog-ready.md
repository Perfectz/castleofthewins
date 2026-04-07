# Title

Minimalist UX fixes for a modal-heavy roguelike menu

# Hook

The cleanest usability improvement is often not another hint. It is one better label and one better grouping choice.

# Short summary

This step used live Playwright captures and a five-lens usability simulation to identify the most likely confusion points in a phone-first dungeon crawler UI. Instead of adding more help text, it shipped two minimalist fixes: clearer first-town intent through `Services` and `North Road`, and a cleaner `Adventure Menu` organized into `Run`, `Saves`, and `System`. The result is a UI that says slightly less, but means more.

# Draft

Design teams often say they want a clean UI, then solve every usability problem by adding another sentence. Modal-heavy games are especially vulnerable to this. Each confusion point invites one more banner, one more helper line, one more onboarding paragraph, until the interface starts competing with the playfield it exists to support.

For this step in the menu redesign series, I wanted to resist that habit.

The game is a phone-first, single-player tactical crawler with several support surfaces: a HUD, ticker, advisor, journal, briefing flow, and a modal-heavy utility stack. Earlier baseline work showed that players can usually find what they need, but the path is not always elegant. Important context exists. It is just distributed.

So the brief for step 03 was strict: no new persistent tutorial text, no extra tip rows, no forced coaching. If a player needs detail, that detail should live in a menu, journal, or help surface. The persistent UI should stay terse.

Using live Playwright captures, I reviewed the highest-traffic flows on mobile and desktop: title, creation, town, first dungeon HUD, run menu, pack, magic, journal, help, and settings. Then I simulated likely usability findings across five player lenses: brand new, returning casual, experienced roguelike, mobile-first, and keyboard or focus-heavy.

Two issues rose above everything else.

The first was town onboarding. In the opening town state, the status chip said `Visit Door`. That is not wrong, but it is weak. It describes an action literally without naming its value. A new player still has to infer that town is a service phase and that the labeled doors are useful, not decorative.

The second was the system menu. The `Adventure Menu` already had better naming from the previous step, but it still opened with an orientation sentence and a flat field of buttons. Mission, saves, help, map, settings, telemetry, and close all competed in one visual zone. Casual and expert players would both pay that scan cost repeatedly.

The shipped fixes were deliberately small.

First, the opening town state now says `Services`. The primary dock action also says `Services`, with the note `Open a town door`. After the first service visit, that state pivots to `North Road` and `Go North`. This makes the next action more literal without adding tutorial prose to the board.

Second, the `Adventure Menu` no longer opens with explanatory text. Its actions are grouped into `Run`, `Saves`, and `System`, and `Export Trace` is still available but visually subdued. The menu becomes easier to parse because the interface finally admits that not every action belongs in the same tier.

What matters here is not the size of the patch. It is the design posture behind it.

Usability problems do not always require more interface. Sometimes they require the interface to stop being coy. `Services` is better than `Visit Door` because it names intent. Grouped controls are better than a flat action wall because they encode priority visually. Neither change teaches the player with extra text. Both changes make the existing system easier to navigate.

That is the kind of restraint worth protecting. Especially in a tactics game, clarity is not the same thing as verbosity.

# Lessons

- Minimalism works only when labels carry real meaning.
- Grouping is often a better fix than explanation.
- Simulated usability lenses are useful when they lead to live, testable changes instead of abstract personas.

# Pull quotes

- "The cleanest usability improvement is often not another hint. It is one better label."
- "A vague label is expensive in a minimalist UI because there is no tip layer left to rescue it."
- "Grouped controls reduce confusion without asking the player to read more."

# Suggested screenshots

- `screenshots/before/before-mobile-03-town.png`
- `screenshots/after/after-mobile-03-town.png`
- `screenshots/before/before-desktop-05-run-menu.png`
- `screenshots/after/after-desktop-05-run-menu.png`
- `screenshots/after/after-mobile-04-dungeon-hud.png`
