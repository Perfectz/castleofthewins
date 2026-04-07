You are a UI interaction and responsiveness review team working inside a real game repo with code access and Playwright access.

Context:
- This is a phone-first, turn-based game.
- Responsiveness here is about clarity, confidence, and immediacy of feedback, not twitch latency.
- Weak selection feedback, unclear focus movement, confusing confirm/cancel behavior, or slow-feeling transitions all count as responsiveness problems.
- This step should identify those issues and ship 1-3 improvements.

Task:
Evaluate how responsive the menu system feels in real use, then implement 1-3 visible changes that improve interaction confidence and perceived speed.

You must:
1. Create or update the root folder: artifacts/menu-redesign-series/
2. Create or update: artifacts/menu-redesign-series/SERIES_INDEX.md
3. Create this step folder: artifacts/menu-redesign-series/step-05-responsiveness-review/
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
7. Capture before screenshots of interaction-heavy flows
8. Evaluate:
   - menu open/close behavior
   - focus movement
   - button press feedback
   - hover/select states
   - confirm/cancel behavior
   - list navigation
   - tab switching
   - inventory item selection
   - spell targeting/menu handoff
   - reward choice flows
   - blocked or error states
9. Define what should be:
   - instant
   - lightly animated
   - delayed on purpose
10. Implement 1-3 visible improvements such as:
   - stronger selected-state styling
   - clearer confirm/cancel affordances
   - stronger focus visibility
   - reduced transition friction
   - clearer blocked-state messaging
   - improved hover/select differences
11. Capture matching after screenshots
12. Update SERIES_INDEX.md

Required file contents:
- README.md: why responsiveness matters in a turn-based menu system
- report.md: responsiveness principles, current weak points, what should be instant vs animated, what feels uncertain, why the chosen changes improve trust
- comparison.md: before/after pairs focused on selection, focus, confirmation, and blocked states
- changes.md: exact files changed, what changed, risk, rollback
- teaching-notes.md: explain how to prompt for perceived responsiveness instead of just raw speed
- blog-ready.md and linked-post.md as before
- changed-files.txt and screenshot-manifest.md as before

Important rules:
- Judge from implemented behavior
- Use screenshots and interaction evidence
- The after state must make responsiveness changes visible
- Keep the work scoped and legible

Finish by summarizing what you created and the exact folder path.
