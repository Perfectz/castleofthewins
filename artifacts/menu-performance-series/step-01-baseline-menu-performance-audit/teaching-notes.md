# Teaching Notes

## How To Ask For a Real Performance Baseline

Bad request:

- “The menus feel slow. Figure out why.”

Why it fails:

- It invites speculation.
- It does not force runtime evidence.
- It does not separate menu chrome from gameplay transitions.

Better request shape:

1. Name the exact flows to inspect.
   Example: title, creation, pack, magic, journal, settings, reward, town menus.

2. Require runtime evidence and code evidence together.
   Example: “Use Playwright, collect timings, and inspect the menu-owning code paths.”

3. Force the audit to distinguish actual cost from perceived heaviness.
   Example: “Separate measured delay from UX that only feels slow because of animation, focus, or dense layout changes.”

4. Require artifacts, not just chat output.
   Example: screenshots, raw metrics, report, comparison, and next-step recommendation.

5. Forbid optimization in the baseline step.
   Example: “Do not optimize yet unless a tiny instrumentation change is needed to profile safely.”

6. Ask for ranked opportunities.
   Example: “Rank the top 10 likely optimizations by impact.”

## Why This Matters

A real baseline prevents two common mistakes:

- Optimizing the wrong subsystem because the user clicked a menu button before a gameplay-heavy transition.
- Treating “feels slow” as proof of a large CPU cost when the real issue is churn, focus movement, or a full-screen surface swap.

## Good Prompt Pattern

- Define the product context.
- Define the suspect causes.
- Name the exact flows.
- Require Playwright evidence.
- Require code inspection.
- Require raw metrics and screenshots.
- Require actual-vs-perceived interpretation.
- Require a next profiling step.

That structure turns performance work from guesswork into an engineering audit.
