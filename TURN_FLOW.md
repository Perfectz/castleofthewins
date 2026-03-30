# Turn Flow

## Player Command

1. Input resolves to an action or movement.
2. Immediate action mutates state.
3. Command-specific logs, sounds, and autosave flags are emitted.

## Turn Resolution

1. Increment `turn` if `advanceTurn` is true.
2. Apply passive HP and mana recovery.
3. Run monster phase once.
4. Run monster phase a second time if heavily overburdened.
5. Tick player slow status.
6. Recompute FOV.
7. Recompute monster intents.
8. Recheck quest completion.
9. Render.

## Interruptions

- Level-up can pause turn completion and open the spell-learn screen.
- Death switches to modal mode immediately.
- Targeting mode short-circuits normal movement handling.
- Modal screens suppress normal game input.

## Autosave Points

- New run start.
- Stair travel up or down.

Add new autosave points only at stable, low-surprise transitions.
