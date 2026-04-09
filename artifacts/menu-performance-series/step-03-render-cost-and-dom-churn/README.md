# Step 03: Render Cost And DOM Churn

This step isolates menu-side render work after the broader step-02 responsiveness pass. The focus here is narrower: reduce unnecessary DOM replacement inside already-open menus, then verify the effect with the same phone-sized Playwright collector.

## What is in this folder

- `prompt.md`: exact task prompt for this step.
- `report.md`: main audit and implementation report.
- `metrics.md`: before/after timing table for the exercised menu flows.
- `comparison.md`: cross-flow comparison with the worst offenders called out.
- `changes.md`: code and instrumentation changes made for the step.
- `teaching-notes.md`: guidance for requesting a render-cost baseline without guessing.
- `blog-ready.md`: public write-up version.
- `linked-post.md`: shorter post-ready version with repo-oriented framing.
- `screenshot-manifest.md`: before/after screenshot list.
- `changed-files.txt`: changed file inventory for this step.
- `patch.diff`: git diff snapshot for the step.
- `data/before-raw-metrics.json`: baseline collector output on the pre-step code.
- `data/after-raw-metrics.json`: collector output after the step changes.
- `data/collect-before.mjs`: phone-sized Playwright collector used for the baseline.
- `data/collect-after.mjs`: same collector shape used after the changes.
- `data/code-hotspots.json`: code hotspots and why they matter.

## Short result

The strongest improvement in this step is narrower live DOM work, not a universal time win. The clearest measured speed gain is `magic_select_identify` ready time dropping from `7.6ms` to `4.5ms`, while journal section switches and shop panel switches now touch fewer live regions but still show mixed settle timings that need browser-trace follow-up.
