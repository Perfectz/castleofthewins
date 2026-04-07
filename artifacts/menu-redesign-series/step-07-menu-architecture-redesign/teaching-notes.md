# Teaching Notes

Prompting for architecture is different from prompting for isolated UI polish.

The useful structure in this step was:

1. Observe the live product first.
2. Identify repeated friction as a system-shape problem, not a wording problem.
3. Propose a revised layer model.
4. Implement one prototype that proves the layer model in the real product.

That structure matters because architecture prompts can easily drift into fantasy redesigns. The step stayed grounded by tying the proposal to actual runtime seams:

- the menu already had a support layer
- the support layer was split across three overlapping modals
- the quickest believable architecture move was to unify those surfaces rather than invent an entirely new HUD framework

This is the advanced prompting lesson:

- ask the model to name the current architecture before proposing a new one
- require a revised hierarchy, not just a list of complaints
- require one medium-scope prototype that demonstrates the strategy in the live product
- keep the prototype inside a low-risk slice of the codebase so the architecture idea becomes visible without requiring a total rewrite

Good architecture prompting produces three outputs at once:

- a clearer mental model
- a visible prototype
- a more honest map of what should not be touched yet
