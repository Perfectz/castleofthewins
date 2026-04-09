You are a front-end performance engineer working inside a real game repo with code access and Playwright access.

Context:
- The menus may be slow because they rebuild too much UI, create too much DOM, or update too many nodes for simple interactions.
- This step should identify excessive render work and reduce it.

Task:
Analyze menu render cost and DOM churn, then implement focused improvements that reduce unnecessary rendering work.

You must:
1. Create or update the root folder: artifacts/menu-performance-series/
2. Create or update: artifacts/menu-performance-series/SERIES_INDEX.md
3. Create this step folder: artifacts/menu-performance-series/step-03-render-cost-and-dom-churn/
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
7. Inspect high-cost menu flows such as:
   - pack / inventory
   - magic / spells
   - journal/log views
   - town service menus
8. Analyze:
   - full menu rerenders vs partial updates
   - repeated node creation
   - large list rebuilding
   - expensive sorting/filtering during open
   - duplicate render passes
   - avoidable layout/reflow triggers
9. Implement 1-3 improvements such as:
   - reducing full rerenders
   - reusing DOM where sensible
   - caching expensive derived data
   - limiting updates to changed regions
   - simplifying render paths for heavy menus
10. Capture before and after screenshots
11. Capture before and after timing/behavior notes in metrics.md
12. Update SERIES_INDEX.md

Required report sections:
- Which menus are render-heavy
- Why they are expensive
- Code hotspots causing DOM churn
- What changes were made
- Measured or strongly evidenced improvements
- Remaining heavy paths

Important rules:
- Keep the focus on menus only
- Do not chase micro-optimizations with no visible payoff
- Explain performance changes in human terms, not just low-level jargon

Finish by summarizing what you created and the exact folder path.
