# Report

## What the UI communicates well

- The system has a coherent fantasy-tech tone. Titles, cards, pills, and panel treatments already feel like they belong to one game.
- Surface names are now generally clearer than they were in the baseline. `Adventure Menu`, `Run Journal`, `How to Play`, and `Device Settings` all signal their jobs more directly.
- The live HUD still does a good job of protecting the board. Even when menus open, the player can usually tell that the game remains centered on tactical play rather than on meta chrome.

## What the UI communicates poorly

- The menu hierarchy still occasionally reflects implementation order more than player priority.
- On phone, the `Adventure Menu` originally asked players to scroll through summary panels before reaching the controls they likely opened the menu to use.
- `How to Play` behaved more like a paragraph dump than a quick reference, which raised interaction cost for exactly the player who most needs fast comprehension.

## Hierarchy problems

- Primary actions were not always visually primary. Before this step, `Save Slot` held the strongest button treatment inside the menu, even though the most common immediate action is usually returning to play or checking mission context.
- Summary information was placed above action controls in the utility menu. This made the support surface read like a report before it read like a tool.
- Long-form help content lacked scannable internal structure. Headings existed, but the content blocks under them were too dense for fast phone reading.

## Consistency problems

- Some support surfaces used compact action-first patterns, while others used text-first patterns with weaker internal rhythm.
- The run menu already had grouped actions, but its focus and scroll behavior still privileged summary content because the DOM order did not match the intended hierarchy.
- Help and settings both lived under the same support umbrella, but help looked more like narrative copy while settings looked like a control panel.

## Modal-overuse issues

- The game still relies on several modal surfaces to distribute context, which means every modal needs to justify its interruption cost.
- When a modal opens and the first visible content is not the likely next action, the interruption feels heavier than it should.
- The current system is strongest when a modal acts like a compact decision tool and weakest when it behaves like a long reading pane.

## Evaluation

### Information hierarchy

- Before: mixed. Labels were clearer than baseline, but the menu still privileged summaries over actions on phone.
- After: improved. Action groups and exit path are now visually first.

### Readability

- Before: good in short cards, weaker in dense reference text.
- After: improved in `How to Play`, where content now scans as chunks instead of paragraphs.

### Consistency

- Before: medium. Visual language was coherent, but interaction priority varied by surface.
- After: stronger. The run menu now aligns visual priority more closely with expected behavior.

### Pacing

- Before: the menu slowed the player before helping them.
- After: the first visible screenful is more actionable, especially on phone.

### Interaction burden

- Before: too much scrolling and too much reading before control.
- After: lower burden in the run menu and help surface.

### Touch and focus friendliness

- Before: mobile action groups were below the summary panels, and focus behavior could land the player in a lower-priority area first.
- After: the DOM order and visual order now match. The first focusable controls are the actual action groups.

### Relationship between menus and live play

- Before: the run menu read more like a status report than a tactical support hub.
- After: it better acknowledges that live play is the primary state and that the menu exists to support quick detours.

### Coherence across the system

- Before: the system was visually coherent but not always behaviorally coherent.
- After: slightly stronger. The improved hierarchy makes menu intent feel closer to the rest of the game’s brisk tactical pacing.

## Critique notes by reviewer role

### Product Designer

- The UI’s biggest product issue is priority. The menu already contains the right features, but they were not surfaced in the order players most likely need them.
- The shipped fix strengthens product clarity by putting task controls ahead of summaries.

### Game UI Designer

- The game’s strongest trait is that the board still dominates. That should be preserved.
- The critique target is therefore not visual spectacle, but interruption weight.
- Elevating `Return to Run` and re-ranking the menu reduces the feeling that the player has left the game to enter an admin panel.

### UX Researcher

- The most likely hesitation pattern is simple: player opens menu, sees data instead of controls, then scrolls.
- The most likely help failure is also simple: player opens reference, sees paragraphs, then skims poorly or abandons.
- The shipped changes directly address those two behaviors.

### Accessibility-minded Designer

- Phone readability depends on chunking, contrast, and predictable focus movement.
- The help rewrite reduces reading fatigue by turning prose into list items.
- The run menu now aligns focus order with what is visually presented first.

### Systems Designer

- The menu system supports several loops at once: run support, save management, mission context, and reference.
- The critique is not that those systems exist. It is that their presentation did not yet reflect which one matters most in the moment.
- The after state better preserves the primacy of tactical play.

### Front-end or UI Engineer

- The current component structure supported meaningful hierarchy fixes without a large rewrite.
- The key engineering lesson is that DOM order matters as much as CSS order when focus and scroll behavior are involved.
- The shipped changes stayed low-risk: template reordering, button emphasis changes, and help markup plus styling.
