# Title

Running a real design critique on a phone-first roguelike menu

# Hook

The best design critique does not end with opinions. It ends with a smaller, sharper UI.

# Short summary

This step treated a browser roguelike’s menu system like a real design review. Using live Playwright captures, it critiqued the interface through product, game UI, UX research, accessibility, systems, and front-end lenses, then shipped two visible fixes: an action-first `Adventure Menu` with a clearer return path, and a `How to Play` screen rebuilt for scanability. The result is a menu system that reads faster without losing its tone.

# Draft

There is a common failure mode in UI redesign work: critique becomes performance. Teams gather around screenshots, say the interface feels dense or modal-heavy, and produce a long list of observations that never harden into product movement.

For step 04 in this menu redesign series, I wanted the opposite.

The game is a phone-first tactical crawler. That means menus matter more than they do in many desktop-first games. They interrupt the board, compete with moment-to-moment state, and carry a lot of context: run status, journal, mission, inventory, settings, and help. If hierarchy breaks, the player feels it immediately.

So this step framed the work as a real design critique panel. I looked at the live UI through six lenses: Product Designer, Game UI Designer, UX Researcher, Accessibility-minded Designer, Systems Designer, and Front-end/UI Engineer. Then I used Playwright screenshots, not just code inspection, to test whether those critiques held up in the runtime.

Two issues stood out.

The first was the `Adventure Menu`. By step 03, its labels were already better than the original baseline. But on phone, the menu still opened on summary cards. `Right Now`, `Resume Point`, and `Device & Controls` appeared before the controls themselves. In other words, the player opened a tool and first received a report.

The second issue was `How to Play`. It was not inaccurate. It was just shaped like work. The content appeared as dense paragraph blocks, which is exactly the wrong reading pattern for a phone-sized support surface. Players generally open help because they want one quick answer, not because they want to read a compact essay.

The changes were intentionally small.

First, I reordered the `Adventure Menu` around action priority. The grouped action sections now come first in the actual DOM, not just visually, which means phone focus and scroll behavior now match the intended hierarchy. I also removed the over-emphasis from `Save Slot` and made `Return to Run` the primary action. That simple shift matters because the menu now acknowledges what the player most likely wants: either a quick support action or a fast return to live play.

Second, I rebuilt `How to Play` into a reference surface. Instead of two dense blocks, it now presents `Core Loop`, `Controls`, and `Dungeon Rules` as scannable sections with bullet-style items. The information barely changed. The reading cost did.

That distinction matters. The point of design critique is not just to discover what is wrong. It is to identify what the interface is already trying to say, then make it say that more clearly.

This UI already had strengths worth preserving. Its visual language was consistent. The board still dominated. Modal titles were clearer than they had been earlier in the series. The problem was not style collapse. It was hierarchy drift.

That is why this step stayed disciplined. No new tutorial layer. No system rewrite. No speculative new features. Just two visible improvements aimed at places where the screenshots showed real friction.

That is what a useful design critique should do. It should leave the interface slightly calmer, slightly more legible, and demonstrably better than it was before the meeting started.

# Lessons

- A menu that opens on summary instead of action is already spending too much of the player’s time.
- Scanability is a design problem, not a writing problem.
- DOM order is part of hierarchy, not just an engineering detail.

# Pull quotes

- "The player opened a tool and first received a report."
- "The information barely changed. The reading cost did."
- "A useful design critique should leave the interface demonstrably better than it was before the meeting started."

# Suggested screenshots

- `screenshots/before/before-mobile-04-run-menu.png`
- `screenshots/after/after-mobile-04-run-menu.png`
- `screenshots/before/before-desktop-04-run-menu.png`
- `screenshots/after/after-desktop-04-run-menu.png`
- `screenshots/before/before-mobile-08-help.png`
- `screenshots/after/after-mobile-08-help.png`
