# Content Schema

## Races

- `id`, `name`, `summary`
- `stats`
- `hp`, `mana`

## Classes

- `id`, `name`, `summary`
- `bonuses`
- `spells`
- `startItems`

## Spells

- `id`, `name`, `learnLevel`
- `cost`, `range`, `target`
- `description`
- `cast(game, caster, target?)`

## Items

- `id`, `name`, `kind`
- Optional combat fields: `power`, `armor`, `slot`
- Optional utility fields: `manaBonus`, `dexBonus`, `lightBonus`, `charges`
- Economy fields: `value`, `rarity`, `weight`

## Monsters

- `id`, `name`, `depth`
- `hp`, `attack`, `defense`, `damage`, `exp`
- Optional behavior fields: `tactic`, `abilities`, `ranged`, `spells`

## Rule

- Prefer data tables plus stable handler contracts.
- Avoid adding one-off behavior branches in `src/game.js` when a content contract will do.
