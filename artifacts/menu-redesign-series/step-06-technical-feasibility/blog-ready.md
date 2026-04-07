# Title

UI Redesign Meets Engineering Reality: Fixing a Brittle Menu Seam Safely

## Hook

The most dangerous UI changes are often the ones that look the simplest. In a modal-heavy game, a tiny close-button decision can run straight through focus logic, navigation glue, and coordinator state.

## Short Summary

Step 06 of the menu redesign series reviewed the interface through an engineering lens instead of a purely visual one. Live Playwright evidence showed two concrete issues: closing `Adventure Menu` dropped focus to `BODY`, and read-only surfaces launched from that menu behaved like dead-end modals instead of returning to their parent surface. Instead of attempting a broad modal rewrite, the step shipped a safer fix: a scoped utility-menu return context, contextual `Back to Menu` close labels, and focus restoration back to the gameplay `Menu` control. The result is a better runtime experience and a clearer picture of which UI problems are cheap, which are coupled, and which are dangerous.

## Blog Draft

One of the easiest traps in UI redesign is forgetting that interface problems are often implementation problems wearing visual clothes. A menu feels awkward, so the instinct is to redesign the menu. But in many real products, the awkwardness comes from deeper seams: coordinator logic, brittle transition handling, and focus behavior that was only partly generalized.

That is what step 06 set out to review.

The game already had several earlier menu improvements in place. Labels were clearer, the utility menu had stronger grouping, and responsiveness cues were sharper. But one class of friction still felt architectural. If you opened `Adventure Menu`, moved into a read-only surface like `How to Play` or `Mission Briefing`, and then closed it, the game dropped you all the way back to live play. That was not catastrophic, but it was wrong. The UI had a parent-child relationship, while the code treated those surfaces like isolated modals.

There was a second issue too: closing `Adventure Menu` itself left focus on `BODY`. That meant keyboard and controller-style navigation lost a stable re-entry point. The player had visually left the menu, but the interface had not answered with a clear focus destination.

The important part is how those issues were handled. The solution was not a large modal-stack rewrite. That would have touched shops, save/load, progression screens, and other high-risk surfaces owned by the same coordinator. Instead, the review tied the friction to a safer seam in `src/game.js`.

The findings were straightforward:

- modal rendering and modal close behavior are centralized in the same file
- `showUtilityMenu()` is still a special path instead of fully sharing the modal-shell behavior
- focus restoration already existed for gamepad flows, but not as a reliable top-level close behavior for keyboard parity

Once the seam was identified, the shipment stayed tight.

First, read-only surfaces launched from `Adventure Menu` gained a one-level return context. Only four surfaces participate:

- `How to Play`
- `Device Settings`
- `Mission Briefing`
- `Character Sheet`

That scope matters. The change does not touch save/load, shops, town services, reward choice, spell study, title, or creation. Those remain excluded because they have more complicated side effects and higher regression risk.

Second, the shared modal shell gained contextual close labeling. When a read-only surface is launched from `Adventure Menu`, its footer now says `Back to Menu` instead of generic `Close`. That is a small visible change, but it reflects real behavior instead of hinting vaguely at exit.

Third, closing `Adventure Menu` now restores focus to the gameplay `Menu` control instead of dropping focus to `BODY`. The Playwright behavior data made that improvement easy to prove. Before the change, `menuCloseFocus.activeTag` was `BODY`. After the change, it became `BUTTON`, with `activeFocusKey = top:menu`.

This is the kind of step that is easy to undervalue because it is not flashy. There is no sweeping visual overhaul here. But it is the kind of work that makes later redesign safer. It turns a brittle seam into a more legible seam. It documents which problems are cheap to fix, which are worth future investment, and which would be dangerous to touch without dedicated testing.

That is the deeper lesson. Technical-feasibility review is not a detour from design. It is how design stops making promises the code cannot safely keep. In a modal-heavy game UI, the fastest route to a better player experience is often a small, precise engineering fix backed by real runtime evidence.

## Lessons

- The best low-risk UI changes often come from fixing coordinator seams, not repainting surfaces.
- A scoped return-context is safer than a general modal stack when the codebase is still tightly coupled.
- Browser evidence plus code correlation produces better redesign decisions than architecture opinion alone.

## Pull Quotes

- "A menu can feel wrong because the coordinator is wrong, not because the colors are wrong."
- "The safest fix was not a modal rewrite. It was a one-level return context with explicit exclusions."
- "Technical-feasibility review is how design stops making promises the code cannot safely keep."

## Suggested Screenshots

- `screenshots/before/before-mobile-02-help-from-menu.png`
- `screenshots/after/after-mobile-02-help-from-menu.png`
- `screenshots/before/before-desktop-04-briefing-from-menu.png`
- `screenshots/after/after-desktop-04-briefing-from-menu.png`
- `screenshots/before/before-mobile-05-menu-close-focus.png`
- `screenshots/after/after-mobile-05-menu-close-focus.png`
