# Teaching Notes

A strong prompt for technical-feasibility review does not ask an AI to “clean up the UI code.” That is too vague and it encourages risky rewrites. A better prompt forces three connections:

- what the user actually experiences at runtime
- which implementation seam owns that behavior
- what the cheapest safe fix is inside that seam

This step is a good example. The reproduced friction was not “menus are bad.” It was specific:

- closing the top-level run menu drops focus to `BODY`
- read-only utility surfaces behave like dead-end modals even though they were launched from a parent menu

Once framed that way, the engineering answer becomes much smaller and safer. Instead of inventing a global modal stack, the prompt can ask for a scoped return context, explicit exclusions, and proof from browser automation.

That is the advanced workflow to teach:

1. Reproduce the friction with live runtime evidence.
2. Name the owning coordinator seam.
3. Separate cheap fixes from structurally risky ones.
4. Ship one small improvement that also creates a visible after state.

The result is better product movement and better engineering judgment at the same time.
