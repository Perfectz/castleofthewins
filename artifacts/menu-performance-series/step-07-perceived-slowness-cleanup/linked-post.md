# Linked Post Draft

Step 07 was a perceived-performance pass, not a pure speed pass.

What changed:
- heavy menus now have compact quick-state strips
- modal feedback is visually prominent instead of plain text
- modal-open background blur and dimming are lighter

Why that matters:
- `Magic`, `Field Guide`, and `Pack` were not always slow in raw milliseconds
- they still felt heavy because the player had to scan too much before understanding the new state
- blocked actions could read like “nothing happened” even when the code answered immediately

What the numbers say:
- some paths improved for real, like `journal_section_switch_chronicle` and `provisioner_panel_switch_sell`
- some paths got modestly slower because the UI now renders explicit state strips
- the strongest win is trust, not throughput

This is the main teaching point from the step: a fast handler is not enough if the UI does not confirm the result clearly and immediately.
