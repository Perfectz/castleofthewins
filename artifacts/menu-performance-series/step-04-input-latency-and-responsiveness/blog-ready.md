# Making Menus Feel Faster Without Rewriting Them

The interesting result in this pass was that the menus were not broadly slow in raw milliseconds. Most of the tested interactions were already fast. What made them feel unreliable was weaker local confirmation: blocked actions wrote to the run log instead of the open modal, focus movement could feel understated, and tab changes sometimes settled over extra frames even when the handler itself was quick.

So the fix was not a giant render rewrite. I made three smaller interaction-layer changes:

- surface modal-local success and warning feedback where the player is already looking
- acknowledge confirms and focus movement immediately
- stop scrolling a modal on focus changes unless the new target is actually out of view

The cleanest example was the `Sage` low-gold case. Before, blocked identify was already effectively instant, but it still felt weak because the answer was hidden in the run log. After the change, the same near-zero-latency action responds inside the modal itself, which makes the UI feel much more trustworthy.

The measured story stayed mixed. Utility open and `Sage` open improved. Some hub transitions did not. That is a useful outcome, not a failure, because it narrows the next step: the remaining problem is not “menus are slow everywhere.” It is “some hub switches still have browser-side settle work that needs tracing.”
