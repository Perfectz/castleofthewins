# Title

Discovery With Teeth: Defining a Game Menu System and Shipping a Small Fix

# Hook

The fastest way to improve a confusing menu system is not always a redesign. Sometimes it is a sharper product brief and one honest, visible shipment.

# Summary

This step took a phone-first dungeon crawler’s modal-heavy menu system and turned it into a product and UX discovery brief backed by Playwright evidence. The brief defined the menu system’s jobs, player types, tradeoffs, and success criteria, then translated the strongest finding into a small live shipment: clearer entry copy on the title screen and clearer naming across the in-run system menu and support surfaces. The result is modest by design, but it proves that better boundaries and better labels can improve comprehension immediately without touching deeper game systems.

# Draft

There is a familiar failure mode in UI redesign work: a team correctly senses that the interface is hard to parse, then jumps straight into structure or visuals before it has defined what the system is supposed to do. In games, that problem gets worse because menus are often carrying multiple responsibilities at once. They are not just menus. They are onboarding tools, system explainers, save surfaces, inventory managers, mission reminders, progression interrupters, and recovery screens.

That was exactly the situation in this project. The game is a phone-first, browser-playable, turn-based dungeon crawler with a strong existing visual identity and a dense support layer. Important context is split across the board, a live feed, the advisor strip, the journal, the briefing view, pack and magic hubs, settings, and a general system menu. The baseline atlas from step 00 made one thing clear: the product did not mainly have a styling problem. It had a boundary problem.

So this step focused on discovery first. Using code inspection and Playwright runtime captures, the work defined what the menu system must accomplish for real players. First-time players need plain-language entry points and a reliable place to look when they are confused. Returning players need to resume a save without second-guessing what they are continuing. Short-session phone players need fast access to support surfaces without losing their place. Expert players still need dense management tools for inventory, spells, and progression.

From that came the core design principle: name surfaces by the question they answer.

That principle seems obvious, but the baseline showed several places where the game was still using generic naming. `Run Menu` functioned partly as a save surface, partly as a mission and support hub, and partly as a systems menu. `Help`, `Settings`, and `Journal` were accurate but broad. The title-screen CTAs were serviceable, yet they did not fully separate "start fresh," "resume a save," and "teach me the basics."

Rather than turning the discovery brief into a speculative redesign, this step shipped a small proof. The title-screen buttons became `Start Run`, `Continue Save`, and `Learn Basics`. The in-run menu became `Adventure Menu`, gained a one-line explanation of its role, and used clearer panel and button labels such as `Right Now`, `Resume Point`, `Floor Map`, `Mission`, `Character`, `Journal & Log`, `How to Play`, and `Return to Run`. Support surfaces were also retitled to better match player intent: `Run Journal`, `How to Play`, `Device Settings`, and `Mission Briefing`.

These are not dramatic changes, and that is exactly why they are useful. They test the discovery brief without introducing structural noise. The runtime screenshots show immediate improvement in comprehension, especially in the title flow and the system-menu flow. The UI still needs deeper work, but the step proves that the strongest discovery finding was real: boundary clarity matters more than ornamental polish at this stage.

The broader lesson is that UX discovery is most valuable when it changes the product, even in a tiny way. A brief with no shipment risks becoming theory. A shipment with no brief risks being arbitrary. Put them together and the team learns faster, with less risk and better evidence.

# Lessons

- A dense game UI usually has a boundary problem before it has a styling problem.
- Naming is product design. Clearer labels can materially improve comprehension without structural change.
- Pairing discovery with a tiny shipment produces stronger evidence than analysis alone.

# Quotes

- "Name surfaces by the question they answer."
- "The menu system was not mainly too ugly. It was too broad in what each surface claimed to be."
- "A tiny shipment can validate a discovery brief faster than another week of discussion."

# Screenshot suggestions

- `screenshots/before/before-mobile-01-title.png`
- `screenshots/after/after-mobile-01-title.png`
- `screenshots/before/before-desktop-04-run-menu.png`
- `screenshots/after/after-desktop-04-run-menu.png`
- `screenshots/after/after-mobile-08-help.png`
