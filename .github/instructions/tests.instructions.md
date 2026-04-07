---
applyTo: "tests/**/*.mjs,scripts/**/*.mjs"
---

# Build And Test Instructions

- Keep build and playtest scripts aligned with actual runtime file paths and selectors.
- Favor strong behavioral checks over brittle implementation checks.
- Do not silently weaken assertions to make tests pass.
- If UI or gameplay flow changes, update the relevant harness/test expectations in the same change.
- `scripts/build-app.mjs` is part of the runtime contract because it generates `app.js` for `file://` fallback.
