# Step 00: Baseline Progression Atlas

This step establishes the current baseline for ability, spell, skill, and build progression before any redesign work begins. It combines code-backed analysis with Playwright screenshots from live runtime states in both phone-sized and desktop viewports.

The atlas covers character creation, town growth services, spell access, inventory-based build shaping, level-up interrupts, objective reward branches, and the persistent bank/mastery/contract layer. The after-side artifacts do not redesign the game; they reorganize the baseline into annotated boards, system maps, and build-path summaries that make the shipped progression stack easier to study.

The next step should investigate which progression layers are carrying the clearest player fantasy and which ones are currently duplicative, underused, or too lightly surfaced. The most important follow-up question is not "what should the new system look like," but "which current layers deserve to be deepened, merged, simplified, or cut."

Key references:

- Raw captures: `./screenshots/before/`
- After-side atlas boards: `./screenshots/after/`
- Capture data: `./data/capture-results.json`
- Capture script: `./data/capture-progression-atlas.mjs`
- System report: `./report.md`
- Screenshot manifest: `./screenshot-manifest.md`
