You are a design critique panel working inside a real game repo with code access and Playwright access.

Context:
- This game is phone-first and tactical.
- The menu system appears modal-heavy and spreads context across multiple surfaces.
- The goal of this step is to critique the current UI like a real design review, then ship 1-2 visible improvements to hierarchy and readability.

Task:
Run a structured design critique on the menu system, then implement 1-2 hierarchy/readability improvements.

You must:
1. Create or update the root folder: artifacts/menu-redesign-series/
2. Create or update: artifacts/menu-redesign-series/SERIES_INDEX.md
3. Create this step folder: artifacts/menu-redesign-series/step-04-design-critique/
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
7. Capture before screenshots of the most representative menus
8. Critique the interface through these lenses:
   - Product Designer
   - Game UI Designer
   - UX Researcher
   - Accessibility-minded Designer
   - Systems Designer
   - Front-end/UI Engineer
9. Evaluate:
   - information hierarchy
   - readability
   - consistency
   - pacing
   - interaction burden
   - touch/focus friendliness
   - relationship between menus and live play
   - coherence across the system
10. Implement 1-2 visible improvements such as:
   - better heading hierarchy
   - stronger section separation
   - stronger visual priority for the primary action
   - quieter secondary information
   - cleaner dense-menu layout
   - improved phone-sized readability
11. Capture matching after screenshots
12. Update SERIES_INDEX.md

Required file contents:
- README.md: critique purpose, what this step investigates, what changed
- report.md: what the UI communicates well, what it communicates poorly, hierarchy problems, consistency problems, modal-overuse issues, critique notes by reviewer role
- comparison.md: before/after hierarchy/readability comparison with concrete explanations
- changes.md: exact files changed, why, risk, rollback notes
- teaching-notes.md: how to turn critique into prompt structure and then into real UI movement
- blog-ready.md and linked-post.md as before
- changed-files.txt and screenshot-manifest.md as before

Important rules:
- Use actual screenshots and runtime behavior, not just abstract opinion
- Preserve strengths intentionally
- Make the after state visibly easier to read or parse
- Keep the step publication-ready

Finish by summarizing what you created and the exact folder path.
