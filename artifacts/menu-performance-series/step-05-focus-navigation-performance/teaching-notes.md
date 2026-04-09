# Teaching Notes

When you suspect a focus system is making menus feel slow, do not ask only for “menu performance.” Ask for:

- menu-open focus setup timing
- focus-restore lookup timing
- directional navigation timing
- metadata rebuild cost
- evidence about repeated DOM scans or expensive key lookup

Better prompt shape:

- “Measure focus setup cost when the menu opens.”
- “Measure key press to focus movement.”
- “Inspect repeated focus tree rebuilding and focus-key lookup.”
- “Implement only 1-3 targeted changes with visible QoL impact.”

That framing turns a vague “menus feel sluggish” complaint into a testable navigation audit instead of another broad render pass.
