# Step 04: Design Critique

This step treats the menu system like a real design review instead of a pure implementation pass. The goal is to look at the live UI through several specialist lenses, identify where hierarchy and readability break down, and then ship a small visible correction instead of stopping at opinion.

What this step investigates:

- whether the menu hierarchy reflects the actual priority of player actions
- whether phone-sized menu screens are easy to scan before they are easy to study
- whether support surfaces behave like references or like text walls
- whether the menu system feels coherent relative to live tactical play

What changed:

- The `Adventure Menu` now leads with action groups instead of summary panels, so the most-used controls appear first on phone-sized screens.
- `Return to Run` is now the strongest visual action inside the menu, while `Save Slot` is no longer over-emphasized.
- `How to Play` was rebuilt into a card-and-list reference surface with a clearer `Core Loop`, `Controls`, and `Dungeon Rules` hierarchy.

This step stays intentionally small. It preserves the existing tone, naming system, and modal structure, but makes the current UI easier to parse in the places where the screenshots showed the highest scan cost.
