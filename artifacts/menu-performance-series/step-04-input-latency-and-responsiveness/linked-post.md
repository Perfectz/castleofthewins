# Linked Post Copy

Step 04 of the menu performance series focused on input-to-feedback responsiveness rather than broad render cost.

What changed:

- modal-local warning and success feedback now appears inside the active menu
- confirm and navigation interactions get immediate acknowledgment
- modal focus movement only scrolls when the newly focused target is actually out of view

What improved:

- town menu open: `10.2ms -> 9.7ms`
- sage open: `6.6ms -> 4.5ms`
- blocked `Sage` identify still resolves in about `0.8ms`, but now shows visible modal feedback instead of only writing to the run log

What is still heavy:

- `Field Guide -> Pack`
- `Magic` filter switching
- `Provisioner` open and sell-panel switching

Takeaway: the menus now feel more trustworthy even where raw timings barely moved, but the remaining hub slowness needs a browser trace, not more guessing.
