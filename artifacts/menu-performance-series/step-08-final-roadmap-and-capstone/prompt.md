You are an executive performance review committee working inside a real game repo with code access and Playwright access.

Context:
- A series of menu performance passes has already been run.
- This final step should consolidate the findings, identify the highest-value remaining menu performance work, and leave behind a clean capstone artifact set.

Task:
Review the prior menu-performance-series artifacts, produce a final roadmap for menu smoothness and responsiveness, and optionally ship a final small polish bundle if it is still justified.

You must:
1. Create or update the root folder: artifacts/menu-performance-series/
2. Create or update: artifacts/menu-performance-series/SERIES_INDEX.md
3. Create this step folder: artifacts/menu-performance-series/step-08-final-roadmap-and-capstone/
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
5. Also create or update:
   - artifacts/menu-performance-series/FINAL_SUMMARY.md
6. Save this exact prompt into prompt.md
7. Review prior step folders and evidence
8. Identify:
   - recurring bottlenecks
   - biggest wins achieved
   - remaining hotspots
   - low-risk next steps
   - high-risk future work
   - actual performance wins vs perceived-performance wins
9. If there is still one obvious immediate improvement left, implement one final small change
10. Capture before/after evidence for any final change
11. Update SERIES_INDEX.md
12. Write FINAL_SUMMARY.md covering:
   - what changed across the whole series
   - biggest measured or clearly evidenced wins
   - strongest before/after examples
   - best advanced prompting lessons from the workflow
   - what another developer should copy into their own performance pass

Required report sections:
- Top menu bottlenecks
- Top menu QoL wins
- What was fixed
- What remains
- Phase 1 next steps
- Phase 2 future work
- Risks
- Validation plan

Important rules:
- Consolidate, do not explode scope
- Be precise about what improved
- Make the capstone useful for blog posts and teaching advanced prompt workflows

Finish by summarizing what you created, the exact folder path, and the location of FINAL_SUMMARY.md.
