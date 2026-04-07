# Changes

This step is baseline-first. No production gameplay or UI code was changed to redesign the interface.

Tiny non-production adjustments made only to reach screens:

- Added a step-local Playwright capture script in `data/capture-menu-atlas.mjs`.
- Added a step-local board renderer in `data/render-atlas-boards.mjs`.
- Used the live runtime `showSaveSlotsModal()` route to expose the empty save-state screen because the title-screen load button is disabled with no saves.
- Used live town-service openers to capture bank, provisioner, armory, guild, temple, sage, and junk-shop surfaces without manually walking each door for every viewport.
- Seeded representative known spells for the `Magic` capture so the spells surface was populated.
- Staged `Level Up Perk` and `Spell Study` by adjusting live runtime progression state.
- Forced a live `Fallen` recap by setting death context and calling the game death flow.

All of those adjustments were capture-only and stayed inside this artifact step.
