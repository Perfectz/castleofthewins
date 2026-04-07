# Teaching Notes

This full workflow demonstrates a more advanced prompt pattern than “analyze the UI” or “redesign this screen.”

The useful structure was:

1. Establish a screenshot baseline.
2. Convert observations into a discovery brief.
3. Ship small live changes early.
4. Revisit the system through different lenses: usability, critique, responsiveness, engineering feasibility, architecture.
5. End with an executive decision pass that chooses what survives.

That sequence matters because it keeps the model honest. Every later prompt inherits real evidence, real screenshots, and real shipped deltas instead of drifting into generic redesign talk.

The capstone lesson is that artifact-based prompting is cumulative:

- screenshots create visual memory
- reports create decision memory
- small shipments create reality checks
- later prompts can critique or approve against an actual trail instead of against vague intuition

Readers should copy three habits from this workflow:

- ask for evidence before opinions
- ship a small real delta before proposing a large structural one
- end long exploratory work with a decisive approval, defer, reject, and risk document
