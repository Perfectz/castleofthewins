# Teaching Notes

## How to ask for a performance baseline instead of guessing

- Ask for one concrete user journey, one viewport, and one environment. Broad “the UI feels slow” requests produce vague answers.
- Require measured timings such as `handlerMs`, `readyMs`, `settledMs`, long tasks, and screenshots. If you do not ask for numbers, you will mostly get opinions.
- Ask for both runtime evidence and code evidence. Runtime alone tells you what is slow; code alone tells you only what looks suspicious.
- Ask the reviewer to separate actual cost from perceived lag. A `6ms` handler can still feel heavy if the UI keeps repainting or settling for another `80ms`.
- Ask for a written list of tested flows and unreachable flows. Otherwise missing coverage gets hidden inside generic conclusions.
- Ask for target thresholds before optimization. A baseline without explicit success criteria makes it hard to decide whether a refactor actually helped.

## Good prompt pattern

Use wording like:

> Launch the real game, exercise these named flows, collect timings for open/close/tab-switch/visible-response, inspect the owning code, capture screenshots, and rank optimization opportunities by likely impact. Do not optimize yet unless tiny instrumentation is needed.

## Why this matters

- It prevents “performance theater” where the write-up sounds confident but has no timings.
- It keeps optimization scoped to evidence, not to whichever subsystem looks large or familiar.
- It makes before-vs-after validation straightforward once implementation starts.
