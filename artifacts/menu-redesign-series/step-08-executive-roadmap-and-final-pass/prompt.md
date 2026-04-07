You are an executive product/design/engineering committee working inside a real game repo with code access and Playwright access.

Context:
- This series has already produced a baseline, several rounds of UI/menu improvements, and a more structural architecture proposal.
- This final step should review the evidence, decide what survives into Phase 1, defer what is not yet justified, and leave behind a clean capstone artifact set for teaching and blog publication.

Task:
Review the outputs from prior menu-redesign-series steps, decide what should be approved now, optionally ship a final small polish bundle if it is still justified, and produce the capstone documentation.

You must:
1. Create or update the root folder: artifacts/menu-redesign-series/
2. Create or update: artifacts/menu-redesign-series/SERIES_INDEX.md
3. Create this step folder: artifacts/menu-redesign-series/step-08-executive-roadmap-and-final-pass/
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
5. Also create or update:
   - artifacts/menu-redesign-series/FINAL_SUMMARY.md
6. Save this exact prompt into prompt.md
7. Review prior step folders and their screenshots, reports, and changes
8. Identify:
   - recurring truths
   - contradictions
   - highest-confidence wins
   - deferred ideas
   - rejected ideas
   - risks that still need validation
9. If there are still obvious immediate wins left, implement a final small polish bundle only if it is scoped and justified
10. Capture before/after screenshots for any final changes
11. Update SERIES_INDEX.md
12. Write FINAL_SUMMARY.md covering:
   - what changed across the full series
   - strongest before/after examples
   - biggest lessons from the process
   - advanced prompting techniques demonstrated
   - what readers should copy into their own workflow

Required file contents:
- README.md: what the capstone step does and why it matters
- report.md: top problems, approved Phase 1 improvements, approved Phase 2 improvements, deferred ideas, rejected ideas, risks, validation plan, implementation order
- comparison.md: summarize the strongest before/after examples from the whole series and any final step changes
- changes.md: exact changed files for this step, why changed, risk, rollback notes
- teaching-notes.md: what this whole workflow teaches about advanced prompting, visual evidence, iterative shipping, and artifact-based prompting
- blog-ready.md: capstone post with title, hook, summary, 400-800 word draft, lessons, quotes, screenshot suggestions
- linked-post.md: teaser, follow-up blurb, 3 headline ideas
- changed-files.txt and screenshot-manifest.md as before

Important rules:
- Do not turn this into a giant surprise redesign
- Consolidate instead of exploding scope
- Be decisive
- Make the capstone artifacts useful for a blog series and linked posts

Finish by summarizing what you created, the exact folder path for this step, and the location of FINAL_SUMMARY.md.
