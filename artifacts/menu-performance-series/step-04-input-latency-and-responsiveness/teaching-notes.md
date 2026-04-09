# Teaching Notes

When you want a responsiveness baseline, do not ask for “make the menus feel snappier” in the abstract. Ask for:

- a fixed viewport and a real runtime launch
- specific interaction paths
- first visible response timing, not just total handler timing
- a distinction between real latency and weak confirmation
- code evidence tied to runtime evidence
- before and after screenshots plus raw metrics

Good prompt ingredients for this kind of pass:

- “Measure click to visible response, key press to focus movement, and blocked-action feedback timing.”
- “Distinguish actual latency from unclear feedback.”
- “Implement only 1-3 visible-payoff changes.”
- “Do not guess. Use Playwright evidence and code hotspots.”

That framing prevents wasted work on micro-optimizations when the real issue is trust, not throughput.
