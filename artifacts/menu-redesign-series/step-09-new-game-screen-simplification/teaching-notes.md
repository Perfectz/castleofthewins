# Teaching Notes

This step is a useful prompt pattern because it asks for architecture-level restraint instead of a generic “make it nicer” pass.

What the workflow demonstrates:
- start with runtime evidence, not theory
- identify what is primary vs secondary on the target surface
- remove or collapse non-primary material before adding any new explanation
- ship one scoped live change instead of a broad conceptual redesign

Why that matters:
- AI is good at inventing more UI; it needs explicit permission to make less UI
- minimalism prompts are stronger when they name what must remain visible and what should move to optional depth
- pairing screenshots with implementation constraints keeps the result grounded in the actual product instead of drifting into a portfolio mockup

Good prompt habits demonstrated here:
- define the main job of the screen
- name the specific clutter sources
- state which information can become secondary
- require live before and after evidence
- keep the implementation inside existing flow boundaries
