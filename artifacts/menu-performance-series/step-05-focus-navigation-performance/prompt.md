You are a UI navigation and focus-system specialist working inside a real game repo with code access and Playwright access.

Context:
- The game appears to use custom focus/navigation logic.
- Heavy or inconsistent focus handling can make menus feel sluggish, fragile, or delayed.
- This step should inspect the cost and behavior of focus movement and navigation setup.

Task:
Analyze the performance and quality-of-life cost of the menu focus/navigation system, then implement focused improvements.

You must:
1. Create or update the root folder: artifacts/menu-performance-series/
2. Create or update: artifacts/menu-performance-series/SERIES_INDEX.md
3. Create this step folder: artifacts/menu-performance-series/step-05-focus-navigation-performance/
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
7. Capture before screenshots of menus that rely heavily on focus/navigation
8. Analyze:
   - focus setup cost when a menu opens
   - repeated focus tree rebuilding
   - navigation consistency across menus
   - expensive queries/lookups for focusable elements
   - duplicate event work
   - stuck, skipped, or visually unclear focus states
9. Implement 1-3 targeted improvements that make navigation lighter and more reliable
10. Capture after screenshots and evidence
11. Update SERIES_INDEX.md

Required report sections:
- Current navigation/focus model
- Performance pain points
- Reliability pain points
- What was changed
- Why it should improve both speed and usability
- Regression risks
- Remaining navigation debt

Important rules:
- Focus on the menu system, not general gameplay input
- Pair technical analysis with visible UX impact
- Explain both performance and QoL benefits

Finish by summarizing what you created and the exact folder path.
