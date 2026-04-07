# Step 00: Baseline Menu Atlas

This step is the evidence-gathering baseline for the menu redesign series. It exists so future UI changes can be measured against the current live product instead of against memory, assumptions, or isolated code snippets.

The atlas documents the current menu system through Playwright screenshots taken from real runtime states in both mobile and desktop viewports. It covers the title flow, character creation, town overview, town services, first dungeon HUD, run menu, pack, magic, journal, settings, help, progression overlays, and death recap, plus after-side study boards that make the current structure easier to analyze.

The next step should use this baseline to investigate information architecture. The main question is not visual polish yet, but where the game should merge, split, simplify, or re-rank surfaces such as the HUD, ticker, advisor, journal, briefing, and utility menu.

Key references:

- Raw captures: `./screenshots/before/`
- Study boards: `./screenshots/after/`
- Capture data: `./data/capture-results.json`
- Manifest: `./screenshot-manifest.md`
