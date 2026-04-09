# Menu Performance Baseline, Not Guesswork

I ran a real baseline audit on the menu stack of a phone-first browser roguelike instead of jumping straight to “optimize the modals.”

What the live Playwright run showed:

- Most menu opens are not huge CPU cliffs. They usually land around `7-33ms`.
- The worst real menu flow was `Field Guide -> Pack` at `66ms`, with a matching long task.
- The largest “button felt slow” moments were actually gameplay transitions:
  - `Begin Adventure`: `185ms`
  - `Descend to Dungeon`: `661ms`

Why the menus still feel heavy:

- Hub tabs and filters rebuild whole modal trees.
- Navigation metadata is recomputed after each rebuild.
- Some flows respond quickly but visually settle much later, so the UI feels sluggish even when handler time is small.

Best next step:

- Deep-profile the `Field Guide -> Pack` path before changing architecture. That is the clearest real menu bottleneck in the current build.
