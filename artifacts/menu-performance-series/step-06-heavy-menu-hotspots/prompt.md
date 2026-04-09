You are a targeted menu hotspot optimization team working inside a real game repo with code access and Playwright access.

Context:
- Some menus are probably much heavier than others.
- Inventory, magic, journal, or town-service screens may be especially expensive because of large lists, rich descriptions, sorting, comparisons, or derived data.
- This step should focus on the heaviest menu hotspots.

Task:
Identify the heaviest individual menus and optimize them for smoother behavior.

You must:
1. Create or update the root folder: artifacts/menu-performance-series/
2. Create or update: artifacts/menu-performance-series/SERIES_INDEX.md
3. Create this step folder: artifacts/menu-performance-series/step-06-heavy-menu-hotspots/
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
7. Identify the heaviest 2-3 menu screens based on runtime behavior and code inspection
8. For each hotspot analyze:
   - why it is heavy
   - what work happens during open
   - what work happens during selection changes
   - whether large text or comparison panels are expensive
   - whether sorting/filtering/grouping is repeated too often
9. Implement focused improvements for the worst hotspots
10. Capture before and after screenshots
11. Record timing notes and visible smoothness improvements in metrics.md
12. Update SERIES_INDEX.md

Required report sections:
- Heavy menu shortlist
- Root causes by menu
- What changed
- Measured or strongly evidenced improvements
- Which heavy menu should be optimized next
- Tradeoffs introduced

Important rules:
- Stay focused on a few high-payoff hotspots
- Do not spread effort too thin
- Explain the changes in terms a blog reader can understand

Finish by summarizing what you created and the exact folder path.
