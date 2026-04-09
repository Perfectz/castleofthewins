# Changes Made

Persistent source changes:

- None in `src/`, `index.html`, `styles.css`, or runtime scripts.

Artifact-only additions:

- `data/collect-baseline.mjs`
  - Launches the live game with Playwright
  - Serves the repo over local HTTP
  - Injects runtime-only timing wrappers around menu and render methods
  - Saves raw metrics and screenshots into this step folder
- `data/raw-metrics.json`
  - Raw output from the Playwright baseline run
- `data/code-hotspots.json`
  - Code-backed list of likely UI performance hotspots found during inspection

Runtime-only instrumentation details:

- Wrapped existing game methods in the browser at runtime to record self-time.
- Added a `MutationObserver` and long-task observer in the browser during the audit only.
- No production code was modified to enable profiling.

Verification performed:

- Ran `node artifacts/menu-performance-series/step-01-baseline-menu-performance-audit/data/collect-baseline.mjs`
- Confirmed the game launched, screenshots were captured, and `raw-metrics.json` was written

Not done in this step:

- No optimization changes
- No build or rules test run, because runtime source files were not edited
