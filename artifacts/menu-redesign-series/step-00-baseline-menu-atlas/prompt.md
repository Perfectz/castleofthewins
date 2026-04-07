You are a UI documentation and visual QA agent working inside a real game repo with code access and Playwright access.

Context:
- This is a phone-first, browser-playable, single-player, turn-based dungeon crawler.
- The game uses many modal and menu surfaces.
- Important information appears to be split across HUD, ticker, advisor, journal, and menus.
- The purpose of this step is to establish a visual baseline before redesign work begins.

Task:
Create a baseline menu atlas of the current game and save a publication-ready artifact trail.

You must:
1. Create or update the root folder: artifacts/menu-redesign-series/
2. Create or update: artifacts/menu-redesign-series/SERIES_INDEX.md
3. Create this step folder: artifacts/menu-redesign-series/step-00-baseline-menu-atlas/
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
6. Launch the game with Playwright
7. Capture screenshots of as many of these as possible:
   - title screen
   - new game / character creation
   - town overview
   - town service screens
   - first in-run HUD state
   - in-run menu
   - inventory / pack
   - magic / spells
   - journal / help / settings
   - reward / level-up / perk / choice screens if reachable
   - death / recap / recovery screens if reachable
   - blocked states, warnings, empty states, or confusing transitions
8. Capture both phone-sized and desktop-sized screenshots where possible
9. Use matching screenshot names such as:
   - mobile-01-title.png
   - mobile-02-creation.png
   - mobile-03-town.png
   - desktop-01-title.png
   - desktop-02-creation.png
10. For the “after” side of this step, you do not need to redesign the UI yet. Instead, create an improved documentation view of the baseline, such as:
   - annotated screenshots
   - labeled boards
   - cropped callout images
   - visual atlases that make the system easier to study
11. Update SERIES_INDEX.md with:
   - step number and title
   - folder path
   - 3-sentence summary
   - main artifacts created
   - key screenshots
   - what this step proved
   - what the next step should investigate

Required file contents:
- README.md: what this step is, why it exists, what it documents, and what comes next
- report.md: menu atlas, navigation map, visual strengths, visual problems, mobile-readability observations, likely fragile flows
- comparison.md: explain what the annotated/organized “after” artifacts add compared with raw baseline captures
- changes.md: note that this step is baseline-first; list any tiny non-production adjustments made only to reach screens
- teaching-notes.md: explain why establishing a baseline before redesign is an advanced prompting best practice
- blog-ready.md: title, hook, short summary, 400-800 word draft, 3 lessons, 3 pull quotes, suggested screenshots
- linked-post.md: teaser post, follow-up blurb, 3 headline ideas
- changed-files.txt: one changed file path per line
- screenshot-manifest.md: filename, viewport, screen name, how reached, why captured, before/after status

Important rules:
- Do not rely on code inspection alone
- Use Playwright evidence
- Prefer real reachable states
- If something is not reachable, say so clearly
- Keep the artifact folder publication-ready

Finish by summarizing what you created and the exact folder path.
