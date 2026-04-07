# Step 06: Technical Feasibility Review

This step exists because UI redesign is constrained by engineering reality. The current menu system can be improved quickly in some places, but other changes run through fragile coordinator logic in `src/game.js`, modal close behavior, and custom focus metadata that can regress more than they help if touched too broadly.

The review connects observed runtime friction to those implementation seams, then ships two low-risk fixes instead of a large rewrite. Step 06 stabilizes read-only surfaces launched from `Adventure Menu` and fixes the top-level focus drop when that menu closes back to gameplay.

What changed: read-only utility surfaces now use a scoped one-level return path back to `Adventure Menu`, and closing that menu now restores focus to the gameplay `Menu` control instead of dropping to `BODY`. What comes next: isolate more modal-shell behavior behind shared helpers before attempting broader workflow cleanup across shops, save/load, or progression flows.
