# Title

Simplifying a Busy New-Game Screen Without Rebuilding the Flow

## Hook

The fastest way to make a game feel more approachable is often to remove one screen’s worth of noise, not add one screen’s worth of explanation.

## Short Summary

This step in the menu redesign series focused on the `Create Adventurer` screen for a phone-first tactical crawler. The existing screen was functional, but it asked players to process audio controls, progression systems, long preview stats, and extra advisory text before they had even picked a race and class. The redesign kept the same one-screen flow, but reduced default clutter, tightened the preview, and collapsed legacy systems behind a small inline reveal.

## Draft

The creation screen is one of the highest leverage surfaces in a game UI. It is where a player decides whether the game feels readable, disciplined, and worth trusting. If that screen feels like a dashboard instead of a commitment point, everything after it inherits extra cognitive weight.

That was the problem with the `Create Adventurer` screen in this project. The screen was not broken. It had a coherent visual language, and all of the information on it was technically relevant. But too much of that relevance was arriving at once. On first load, the player had to take in name entry, race and class cards, stat allocation, a title-music control, a long preview stat block, persistence and contract information, and a separate run-notes section. None of those pieces were individually outrageous. Together, they made the screen feel busier than its actual job required.

The design direction for this step was deliberately narrow: keep the creation flow on one screen, but make that screen act like it has one primary purpose. That meant preserving the essential setup controls while demoting anything that was useful but not necessary for the first decision pass.

The first visible change was removing the audio banner from the creation layout. Music control still exists on the title surface, where it belongs, but it no longer competes with character setup. The second was removing the always-visible `Run Notes` copy. That advice was not wrong, but it was not helping the player choose a build.

The preview column then got a more structural simplification. Instead of showing a long derived-stat grid and a permanent town-persistence block, it now behaves like a compact confirmation panel. Players still see who they are building, what race and class combination they chose, and the most decision-relevant derived numbers: `HP`, `Mana`, `Attack`, `Armor`, and `Carry`. That is enough to support meaningful stat choices without turning the preview into a systems encyclopedia.

The long-tail progression material did not disappear. It moved into a collapsed inline section called `Legacy & Contracts`. Minimalism here does not mean hiding useful systems behind another modal or deleting progression context entirely. It means treating that context as optional depth rather than mandatory foreground. Players who care can open it. Players who just want to start a run are no longer forced to parse it.

The race and class cards also got lighter. They still keep art, title, and identity chips, but they take up less vertical space and use tighter copy. On mobile, that matters immediately. The screen feels less like a stack of large plaques and more like a purposeful decision sheet.

The result is not dramatic in the way a total redesign would be dramatic. That is the point. The strongest UI improvements in a live game often come from better hierarchy, not louder invention. By removing low-priority default content and shrinking the decision surface to what matters most, the new-game screen becomes faster to parse and calmer to use while preserving all of its actual function.

## Lessons

- A creation screen should behave like a commitment surface, not a systems dashboard.
- Optional meta systems are often best treated as collapsed depth rather than permanent foreground.
- On phone-sized layouts, reducing simultaneous context is often more powerful than adding guidance.

## Pull Quotes

- “The best way to make a first screen feel smarter is often to make it say less.”
- “Useful information still creates clutter when it arrives too early.”
- “Minimalism works best when it preserves function and narrows focus.”

## Suggested Screenshots

- `screenshots/before/before-mobile-02-default.png`
- `screenshots/after/after-mobile-02-default.png`
- `screenshots/after/after-mobile-05-legacy.png`
- `screenshots/before/before-desktop-02-default.png`
- `screenshots/after/after-desktop-02-default.png`
