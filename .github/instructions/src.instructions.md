---
applyTo: "src/**/*.js,index.html,styles.css"
---

# Runtime And UI Instructions

- Treat `src/` as the runtime source of truth.
- Keep changes in the smallest owning module.
- Use `src/game.js` as a coordinator, not the default home for every new rule.
- Preserve current DOM ids, `data-action` hooks, and mobile/controller flows unless the task explicitly changes them.
- If a new runtime module is introduced, update `scripts/build-app.mjs`.
- If save payload shape changes, update migration logic in `src/features/persistence.js`.
- After non-trivial behavior changes, prefer `npm run build` and `npm run test:rules`.
