# Step 01: UI Discovery Brief

Discovery matters here because the current menu system is doing several jobs at once: onboarding, system support, run management, town planning, inventory review, spell management, and progression interruption handling. Without a brief, redesign work would drift toward isolated polish instead of solving the more important question of which menu surface should answer which player need.

This step answers one core question: what must the menu system accomplish for real players on a phone-first roguelike, and what tiny changes can prove those principles in the live UI right now? To answer that, the step combines code inspection, runtime Playwright captures, and a small visible shipment.

What changed:

- The title-screen CTAs were renamed for clearer first-run versus returning-run intent.
- The in-run system menu was reframed as `Adventure Menu`, with clearer section names, clearer action labels, and a short orientation sentence.
- Support surfaces now declare their roles more directly through titles such as `Run Journal`, `How to Play`, `Device Settings`, and `Mission Briefing`.

What comes next: use this discovery brief to decide whether the next redesign step should simplify the support-surface architecture, re-rank HUD information, or differentiate progression and reward overlays from ordinary utility sheets.
