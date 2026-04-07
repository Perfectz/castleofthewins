# Teaching Notes

Good critique prompts do not stop at taste. They force three things into the same step:

- multiple reviewer lenses
- concrete evaluation criteria
- a small live shipment

That structure matters because critique by itself is cheap. It is easy to say a UI feels dense, modal-heavy, or inconsistent. It is harder and more useful to specify which reviewer would object, what concrete behavior in the runtime supports that objection, and what minimal change would prove the critique correct.

This step is a good example. The panel lenses identified different symptoms, but they converged on the same two issues: the menu opened on summary instead of action, and the help screen asked for too much reading. Turning that critique into a prompt made the implementation target obvious: reorder the utility menu around action priority and rewrite help around scanability. That is the right pattern for design prompting in a real repo: critique, then movement.
