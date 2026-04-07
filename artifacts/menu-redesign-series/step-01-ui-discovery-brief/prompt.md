You are a senior product and UX discovery team working inside a real game repo with code access and Playwright access.

Context:
- This is a phone-first, browser-playable, single-player, turn-based dungeon crawler.
- The menu system is modal-heavy.
- Important context is split across HUD, ticker, advisor, journal, and menu flows.
- This step should define what the menu system must accomplish, then ship 1-2 visible, low-risk improvements that reflect those principles.

Task:
Create a UI discovery brief for the menu system, then implement 1-2 small visible changes that embody the strongest discovery findings.

You must:
1. Create or update the root folder: artifacts/menu-redesign-series/
2. Create or update: artifacts/menu-redesign-series/SERIES_INDEX.md
3. Create this step folder: artifacts/menu-redesign-series/step-01-ui-discovery-brief/
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
7. Capture before screenshots of the most relevant flows:
   - title
   - creation
   - town
   - in-run menu
   - pack
   - magic
   - journal/help/settings
8. Inspect both code and runtime behavior
9. Define:
   - what jobs the menu system must do
   - which player types it must serve
   - what “good” looks like for onboarding, in-run decisions, town prep, inventory/spell management, and reward selection
   - key tradeoffs such as clarity vs density and first-time readability vs expert speed
10. Implement 1-2 visible, low-risk changes that reflect the discovery brief, such as:
   - clearer labels
   - stronger primary action emphasis
   - better section naming
   - improved microcopy
   - clearer menu entry points
11. Capture matching after screenshots of the same screens
12. Update SERIES_INDEX.md with step summary, folder path, main changes, key screenshots, what this step proved, and what should happen next

Required file contents:
- README.md: why discovery matters, what question this step answers, what changed, what comes next
- report.md: discovery summary, UX goals, UX non-goals, menu principles, success criteria, decisions made
- comparison.md: paired before/after notes for each changed screen
- changes.md: exact changed files, what changed, why, risk, rollback notes
- teaching-notes.md: explain why this prompt pairs analysis with a small visible shipment
- blog-ready.md: title, hook, 100-150 word summary, 400-800 word blog draft, lessons, quotes, screenshot suggestions
- linked-post.md: teaser, follow-up blurb, 3 headlines
- changed-files.txt: one path per line
- screenshot-manifest.md: filename, viewport, flow name, why captured, before/after

Important rules:
- Do not rely on code inspection alone
- Use Playwright screenshots as evidence
- Keep the changes small and principle-driven
- The after state must show visible UI movement, not just analysis

Finish by summarizing what you created and the exact folder path.
