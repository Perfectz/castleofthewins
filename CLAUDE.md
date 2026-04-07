# CLAUDE.md

Start by reading:

1. @AGENTS.md
2. @docs/ai/PROJECT_BRIEF.md

Use the deeper docs only when the task touches them:

- @ARCHITECTURE.md
- @SYSTEM_MAP.md
- @FEATURES.md
- @AI_CHANGE_GUIDE.md
- @AI_RECIPES.md
- @TEST_STRATEGY.md

Project rules:

- Edit `src/` for runtime behavior.
- Treat `app.js` as generated output from `npm run build`.
- If you add a new runtime module, update `scripts/build-app.mjs`.
- Keep changes in the smallest owning module.
- Preserve mobile-first layout, controller support, and existing DOM action hooks unless the task explicitly changes them.
- When save shape changes, update migration logic in `src/features/persistence.js`.
- Prefer the narrowest verification that matches the change: `npm run build`, `npm run test:rules`, or `npm run playtest:harness`.

Useful project commands:

- `/project-map`
- `/safe-change`
