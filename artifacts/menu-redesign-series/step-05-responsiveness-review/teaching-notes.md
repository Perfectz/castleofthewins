# Teaching Notes

Prompting for responsiveness in a turn-based UI works better when the prompt asks about confidence, feedback timing, and state clarity instead of just "make it faster." Raw milliseconds matter less than whether the player can immediately tell four things: where focus is, what is selected, whether an action is allowed, and whether the UI has accepted the input.

This step also shows why the prompt should force a split between:

- what should be instant
- what should be lightly animated
- what should be delayed on purpose

That structure prevents a common failure mode where all feedback becomes equally fast or equally flashy. It also keeps the critique grounded in product behavior rather than generic performance language.

Finally, pairing the critique with 1-3 shipped changes is what makes the prompt useful. The analysis identifies uncertainty, but the small live shipment proves whether the chosen signals actually improve the interface without bloating it.
