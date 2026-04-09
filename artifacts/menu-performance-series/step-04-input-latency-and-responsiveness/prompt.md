You are a UI interaction performance engineer working inside a real game repo with code access and Playwright access.

Context:
- Even if raw render time is acceptable, the menus may still feel slow if selection feedback, focus movement, tab switching, or confirm/cancel behavior feels delayed.
- This step should focus on input-to-feedback responsiveness.

Task:
Measure and improve the responsiveness of menu interactions so the UI feels faster and more trustworthy.

You must:
1. Create or update the root folder: artifacts/menu-performance-series/
2. Create or update: artifacts/menu-performance-series/SERIES_INDEX.md
3. Create this step folder: artifacts/menu-performance-series/step-04-input-latency-and-responsiveness/
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
7. Capture before screenshots of interaction-heavy states
8. Evaluate and measure where possible:
   - click to visible response
   - key press to focus movement
   - confirm action to visible state change
   - cancel/back action to visible state change
   - tab switch responsiveness
   - list navigation responsiveness
   - selected-state visibility
   - blocked/error feedback timing
9. Distinguish between:
   - actual input latency
   - weak visual confirmation
   - too much animation or transition delay
   - cognitive delay caused by unclear feedback
10. Implement 1-3 focused changes that make interactions feel faster and clearer
11. Capture after screenshots and timing evidence
12. Update SERIES_INDEX.md

Required report sections:
- Interaction paths tested
- Where the UI feels slow and why
- Actual latency vs perceived latency
- What was changed
- Why these changes improve responsiveness
- Remaining interaction pain points

Important rules:
- This is a turn-based game, so responsiveness means confidence and immediacy of feedback
- Prefer changes with visible payoff
- Explain why the menus feel faster after the changes

Finish by summarizing what you created and the exact folder path.
