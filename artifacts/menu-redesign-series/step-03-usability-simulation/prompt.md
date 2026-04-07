You are a UX research and usability-testing team working inside a real game repo with code access and Playwright access.

Context:
- This is a phone-first, single-player tactical crawler.
- New players may struggle to understand town value, objective flow, or where important information lives.
- Experienced players may be slowed down by modal churn and scattered context.
- This step should simulate likely usability findings, then implement 1-2 changes targeting the worst confusion points.

Task:
Observe the actual UI, simulate likely usability findings for key player types, and then ship 1-2 visible fixes aimed at the biggest confusion points.

You must:
1. Create or update the root folder: artifacts/menu-redesign-series/
2. Create or update: artifacts/menu-redesign-series/SERIES_INDEX.md
3. Create this step folder: artifacts/menu-redesign-series/step-03-usability-simulation/
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
7. Capture before screenshots of the highest-traffic menu states
8. Simulate likely usability findings for:
   - brand new player
   - returning casual player
   - experienced tactics/roguelike player
   - mobile-first player
   - keyboard/focus-heavy player
9. For each player type analyze:
   - what they try to do
   - what they expect the UI to do
   - where they hesitate
   - where they get confused
   - where they miss important information
   - where they feel slowed down
   - where they feel confident
10. Implement 1-2 visible fixes that address the worst confusion points, such as:
   - stronger contextual hints
   - better explanatory text
   - clearer action wording
   - tighter grouping of related controls
   - improved visibility for important status/context
11. Capture matching after screenshots
12. Update SERIES_INDEX.md

Required file contents:
- README.md: why this step focuses on likely user confusion
- report.md: usability issues by player type, first-session confusion, in-run decision friction, town prep friction, inventory/spell pain points, why the chosen fixes matter
- comparison.md: side-by-side before/after and what confusion each change reduces
- changes.md: exact code/UI changes, risk, rollback, follow-up
- teaching-notes.md: explain why simulating multiple user lenses produces better prompts and better design
- blog-ready.md and linked-post.md as before
- changed-files.txt and screenshot-manifest.md as before

Important rules:
- Ground the simulation in the actual observed UI
- Do not invent giant features
- Ship visible changes that reduce confusion now
- The artifact folder should be ready for a public case study

Finish by summarizing what you created and the exact folder path.
