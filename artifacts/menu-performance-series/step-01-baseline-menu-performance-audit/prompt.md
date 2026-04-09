You are a senior UI performance engineer working inside a real game repo with code access and Playwright access.

Context:
- This is a phone-first, browser-playable, single-player, turn-based dungeon crawler.
- The game’s menus and modal flows currently feel slow, heavy, or unresponsive.
- The likely causes may include too much work during modal open/close, excessive DOM updates, expensive rerenders, fragmented UI state, custom focus/navigation overhead, and large coordinator logic doing too much at once.

Task:
Perform a baseline performance audit focused specifically on menu and modal responsiveness.

You must:
1. Create or update the root folder: artifacts/menu-performance-series/
2. Create or update: artifacts/menu-performance-series/SERIES_INDEX.md
3. Create this step folder: artifacts/menu-performance-series/step-01-baseline-menu-performance-audit/
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
   - metrics.md
   - screenshots/before/
   - screenshots/after/
   - data/
   - patch.diff if git is available
5. Save this exact prompt into prompt.md
6. Launch the game with Playwright
7. Inspect and exercise these menu flows where possible:
   - title screen
   - creation flow
   - town menus
   - in-run menu
   - pack / inventory
   - magic / spell screens
   - journal / help / settings
   - reward / choice screens if reachable
8. Measure and document where possible:
   - menu open time
   - menu close time
   - tab switch time
   - list render/update cost
   - time from click/key press to visible response
   - obvious jank, stutter, lag, or delayed feedback
9. Inspect the code for likely performance hotspots in:
   - modal rendering
   - layout thrashing
   - expensive DOM rebuilds
   - repeated event binding
   - large synchronous work during menu open
   - focus/navigation handling
   - state recalculation
10. Capture before screenshots and evidence of the slowest flows
11. Do not optimize yet unless a tiny instrumentation change is needed to profile safely
12. Update SERIES_INDEX.md

Required report sections:
- What was profiled
- How it was profiled
- Slowest menu flows
- Likely bottlenecks
- Suspected root causes
- Actual observed lag vs perceived lag
- Top 10 optimization opportunities ranked by likely impact
- Recommended next profiling step

Required file contents:
- metrics.md: timing table for each tested flow
- comparison.md: compare different flows and call out the worst offenders
- changes.md: any instrumentation-only changes made
- teaching-notes.md: how to prompt for a performance baseline instead of guessing
- blog-ready.md and linked-post.md for public write-up

Important rules:
- Distinguish between actual performance cost and UX that only feels slow
- Use code evidence plus runtime evidence
- Prefer measurable findings over vague claims

Finish by summarizing what you created and the exact folder path.
