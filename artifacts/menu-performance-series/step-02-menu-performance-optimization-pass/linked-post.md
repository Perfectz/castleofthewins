# Linked Post Draft

Follow-up to the baseline menu audit:

- Baseline showed that the worst raw delay was not a normal modal open. It was `Begin Adventure` and especially the first descent.
- Step 02 attacked those first: staged startup, deferred autosave, lazy floor generation, and staged stair finalization.
- Measured result:
  - `Begin Adventure`: `185.2ms -> 56.9ms`
  - Town utility open: `33.5ms -> 9.2ms`
  - Dungeon descent: `660.8ms -> 148.5ms`

The hub stack is better, but not solved:

- `Field Guide -> Pack`: `66.0ms -> 40.7ms`
- `Pack -> Magic`: latest run still shows mixed settle behavior
- `Magic -> Journal`: first response is fast, but settle is still visually heavy

Takeaway:

The first pass removed big synchronous work. The next pass needs browser tracing for pane visibility, layout, and paint, because the remaining lag is no longer explained by obvious JS hotspots.
