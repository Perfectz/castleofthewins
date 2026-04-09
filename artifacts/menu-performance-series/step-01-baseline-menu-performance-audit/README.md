# Step 01 Baseline Menu Performance Audit

This folder captures a no-optimization baseline of menu and modal responsiveness for the live mobile runtime. The audit combines Playwright timings, runtime-only instrumentation, code inspection, and before screenshots so follow-up work can target proven bottlenecks instead of vague “menus feel slow” claims.

Contents:

- `report.md`: main findings and ranked opportunities
- `metrics.md`: timing table for each tested flow
- `comparison.md`: worst-offender comparison across flows
- `changes.md`: instrumentation-only changes made for this audit
- `teaching-notes.md`: how to ask for a real baseline instead of guessing
- `blog-ready.md`: public-facing write-up draft
- `linked-post.md`: shorter linked/social-ready summary
- `screenshot-manifest.md`: screenshot inventory and why each image matters
- `data/raw-metrics.json`: raw Playwright output
- `data/code-hotspots.json`: code-backed hotspot inventory
- `data/collect-baseline.mjs`: rerunnable artifact-only collector

Baseline outcome:

- Normal modal opens are mostly `7-33ms` to first visible response on mobile.
- The slowest real menu flow was `Field Guide -> Pack` at `66ms`, with a matching long task and a `335`-node modal subtree.
- The largest “this button felt slow” costs were not menu chrome at all: `Begin Adventure` took `185ms`, and descending into the dungeon took `661ms`.
