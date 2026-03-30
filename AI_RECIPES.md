# AI Recipes

## Add A New Spell

1. Add spell data to `src/data/content.js`.
2. Keep the `cast(game, caster, target?)` contract.
3. Rebuild fallback bundle.

## Add A Monster Ability

1. Add the ability flag in `src/data/content.js`.
2. Extend `src/features/combat.js` if the ability changes intent or monster turns.
3. Update advisor logic only if the player needs a new warning surface.

## Change Save Behavior

1. Edit `src/features/persistence.js`.
2. If payload shape changes, update `migrateSnapshot`.
3. Rebuild fallback bundle.

## Change Creation Flow

1. Edit `src/features/creation.js`.
2. Keep draft state helpers and rendering helpers together.

## Change Search Or Stairs

1. Edit `src/features/exploration.js`.
2. Return command results instead of rendering inline.

## Change Advisor Messaging

1. Edit `src/features/advisor.js`.
2. Keep selector math and dock actions in the same module.
