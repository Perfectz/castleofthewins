# Teaching Notes

Establishing a baseline before redesign is an advanced prompting practice because it keeps later design work anchored to reality instead of to taste. Without a baseline, redesign prompts often optimize against vague memory, isolated complaints, or the model's default instincts rather than against the actual shipped system.

This step demonstrates three specific reasons the baseline matters:

1. The current game already has a lot of progression depth. If you skip the baseline, it is easy to falsely treat the game as "just XP plus loot" and miss mastery, contracts, commendations, town unlocks, spellbooks, objective reward types, and bank-layer planning.
2. Some systems are stronger in code than in presentation. A redesign prompt that sees only screenshots might undervalue the bank layer or mastery logic; a prompt that sees only code might miss which systems are actually legible to players.
3. The baseline exposes mismatches between defined content and active mechanics. In this codebase, some progression entries look fully imagined in data but lightly wired in rules, which is exactly the kind of fact that should shape redesign priorities later.

Why this is a strong artifact pattern:

- Code review establishes what is implemented.
- Playwright evidence establishes what is observable.
- After-side atlas boards establish how to communicate the current system quickly to humans.

That combination produces better redesign inputs than either a pure code memo or a pure screenshot dump.
