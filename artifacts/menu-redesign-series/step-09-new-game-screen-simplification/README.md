# Step 09: New Game Screen Simplification

This step is the creation-screen minimalism pass. It exists because the `Create Adventurer` flow had accumulated too many simultaneous jobs: naming, selection, stat allocation, progression context, music control, and advice copy all lived on the same first-screen surface.

The question for this step is simple: how much cleaner can the new-game screen become without splitting it into multiple steps or hiding core creation controls? The shipped answer keeps the screen single-surface, removes low-priority default clutter, shortens race and class cards, and tucks long-tail progression context behind an inline `Legacy & Contracts` reveal.

What changed:
- removed the creation-screen `Title Theme` banner
- removed always-visible `Run Notes`
- replaced the long preview stat block with a shorter five-stat summary
- collapsed persistence and contract context behind an inline disclosure
- tightened race and class card density while keeping art and identity tags

What comes next:
- decide whether the first-time stat allocation block also needs a lighter presentation
- test whether the preview column should become more interactive or stay as a quiet confirmation surface
- evaluate whether town and creation meta systems should share one clearer long-term progression vocabulary
