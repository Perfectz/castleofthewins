You are a senior systems design analyst working inside a real game repo with code access and Playwright access.

Context:
- This is a phone-first, browser-playable, single-player, turn-based dungeon crawler.
- One of the game’s strongest existing pillars is build assembly through gear, spells, perks, relics, and progression choices.
- This step is meant to establish the current baseline for ability, spell, and skill progression before redesign work begins.

Task:
Create a baseline progression atlas of the game’s current ability, spell, and skill progression systems, and save a publication-ready artifact trail.

You must:
1. Create or update the root folder: artifacts/progression-series/
2. Create or update: artifacts/progression-series/SERIES_INDEX.md
3. Create this step folder: artifacts/progression-series/step-00-baseline-progression-atlas/
4. Inside the step folder create:
   - prompt.md
   - README.md
   - report.md
   - comparison.md
   - changes.md
   - teaching-notes.md
   - blog-ready.md
   - linked-post.md
   - changed-files.txt
   - screenshot-manifest.md
   - screenshots/before/
   - screenshots/after/
   - data/
   - patch.diff if git is available
5. Save this exact prompt into prompt.md
6. Inspect the codebase and identify all implemented progression-related systems, including:
   - level-ups
   - stat growth
   - skills
   - spells
   - perks
   - relics
   - boons
   - rewards
   - unlocks
   - ability acquisition
   - class/race differentiation
7. Launch the game with Playwright and capture screenshots of all reachable progression-related states, such as:
   - character creation
   - spell menus
   - level-up choices
   - reward selection screens
   - perk/relic/boon screens
   - inventory interactions that shape builds
   - town/service screens related to growth
8. Capture both desktop and phone-sized screenshots when possible
9. For the “after” side of this step, create a documented atlas rather than redesigning the systems yet:
   - annotated screenshots
   - progression maps
   - system relationship diagrams
   - build-path summaries
10. Update SERIES_INDEX.md with:
   - step number and title
   - folder path
   - 3-sentence summary
   - key progression systems documented
   - key screenshots
   - what this step proved
   - what the next step should investigate

Required report sections:
- Current progression systems
- Current spell systems
- Current skill/perk systems
- Current build-shaping mechanics
- How progression currently works across a run
- Strengths of the current design
- Weaknesses or unclear areas
- Gaps or underused systems
- Open questions

Important rules:
- Do not redesign yet
- Ground conclusions in actual code and observable runtime behavior
- Keep the artifact trail publication-ready

Finish by summarizing what you created and the exact folder path.
