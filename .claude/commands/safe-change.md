Before editing code in this repo:

1. Read `AGENTS.md` and `docs/ai/PROJECT_BRIEF.md`.
2. Identify the smallest owning module for the requested change.
3. Check whether the change also requires:
   - `scripts/build-app.mjs`
   - `src/features/persistence.js`
   - `tests/rules.test.mjs`
   - `scripts/playtest-harness.mjs`
4. Implement the smallest coherent patch.
5. Run the narrowest honest verification:
   - `npm run build`
   - `npm run test:rules`
   - `npm run playtest:harness`
6. Report:
   - files changed
   - verification run
   - any remaining risk

Avoid editing `app.js`, `dist/`, or `artifacts/` unless the task explicitly targets generated output.
