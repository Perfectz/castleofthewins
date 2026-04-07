You are a senior game UX architect working inside a real game repo with code access and Playwright access.

Context:
- This game should remain phone-first, readable, and tactical.
- The best improvements likely involve reducing menu fragmentation, surfacing important context more effectively, and reducing unnecessary modal churn.
- This step should move from local fixes to a clearer systems-level direction, then implement one medium-scope prototype or real change that demonstrates that direction.

Task:
Propose a better menu architecture for the game, then implement one medium-scope prototype or real improvement that clearly shows the architecture shift.

You must:
1. Create or update the root folder: artifacts/menu-redesign-series/
2. Create or update: artifacts/menu-redesign-series/SERIES_INDEX.md
3. Create this step folder: artifacts/menu-redesign-series/step-07-menu-architecture-redesign/
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
7. Capture before screenshots and note the current flow structure
8. Propose:
   - a revised menu philosophy
   - a revised hierarchy
   - a better split between live HUD information, quick panels, and full modals
   - a stronger structure for inventory/pack, magic/spells, journal/help, town services, and reward choices
   - ways to reduce menu-hopping
   - ways to improve new-player discoverability
   - ways to preserve expert efficiency
9. Implement one medium-scope prototype or real improvement, such as:
   - moving critical information closer to live play
   - simplifying one major flow
   - unifying two related menu surfaces
   - turning one heavy modal path into a lighter path
   - restructuring one major screen hierarchy
10. Capture matching after screenshots
11. Update SERIES_INDEX.md

Required file contents:
- README.md: why this step is the architecture step
- report.md: current-state architecture, proposed architecture, flow changes, what was prototyped or implemented, strategic importance, risks
- comparison.md: before/after flow comparison plus screenshot pairs
- changes.md: exact files changed, why, risk, rollback, future opportunities
- teaching-notes.md: how to prompt for architecture, not just isolated tweaks
- blog-ready.md and linked-post.md as before
- changed-files.txt and screenshot-manifest.md as before

Important rules:
- Stay grounded in the actual game
- Do not turn this into a generic AAA UI fantasy
- Make the architecture shift visible
- Keep the artifact trail blog-ready

Finish by summarizing what you created and the exact folder path.
