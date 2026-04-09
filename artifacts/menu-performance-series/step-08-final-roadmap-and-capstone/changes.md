# Changes Made

## Runtime

- `styles.css`
  - Removed the remaining modal-open blur from the background game layer in the step-07 override.
  - Kept a lighter saturation/brightness drop plus opacity shift so modal separation still reads clearly.

## Artifact and measurement package

- Added step-08 before/after Playwright collectors.
- Captured fresh screenshots and raw timing evidence under this step folder.
- Wrote the capstone report set plus the cross-series `FINAL_SUMMARY.md`.

## Why the final code change stayed small

By step 08, the strongest remaining evidence pointed at browser-side settle heaviness rather than another obvious synchronous JavaScript bottleneck. A small CSS-side reduction was the most justified last change because it was low-risk, easy to validate, and did not reopen the series into another large refactor.
