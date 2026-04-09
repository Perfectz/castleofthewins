# AI State Map

Quick-reference for AI agents working in `castleofthewinds`. Lists state ownership, mutation boundaries, the effect bus data flow, and common recipes.

## State Ownership

| State Field | Owning Module | Mutated By |
|-------------|--------------|------------|
| `game.player.hp/mana` | `player-state.js` | combat.js, turns.js, builds.js, content.js spells, game.js |
| `game.player.gold` | `player-state.js` | builds.js, objectives.js, game.js (shops/services) |
| `game.player.perks` | `builds.js` | builds.js (chooseReward), meta-progression.js (contract) |
| `game.player.relics` | `builds.js` | builds.js (chooseReward) |
| `game.player.inventory` | `game.js` | game.js (addItemToInventory, useInventoryItem) |
| `game.player.equipment` | `game.js` | game.js (equipInventoryItem, unequipSlot) |
| `game.player.spellsKnown` | `game.js` | game.js (learnLevelUpSpell), meta-progression.js |
| `game.player.stats` | `combat.js` | combat.js (checkLevelUp) |
| `game.player.exp` | `combat.js` | combat.js (killMonster) |
| `game.player.runCurrencies` | `builds.js` | builds.js (grantBoon, grantRumorToken, onMonsterKilled) |
| `game.player.slowed/held` | `combat.js` | combat.js (processMonsters), turns.js (countdown) |
| `game.player.constitutionLoss` | `combat.js` | combat.js (damageActor drain), game.js (overcast) |
| `game.currentLevel` | `game.js` | world.js helpers, combat.js, objectives.js, encounters.js |
| `game.currentLevel.actors` | `encounters.js` | combat.js (killMonster), encounters.js (spawn) |
| `game.currentLevel.items` | `objectives.js` | combat.js (killMonster drops), game.js (pickup) |
| `game.currentLevel.dangerScore` | `director.js` | director.js (increaseDanger, advanceDangerTurn) |
| `game.currentLevel.reinforcementClock` | `director.js` | director.js |
| `game.turn` | `turns.js` | turns.js (resolveTurn) |
| `game.mode` | `game.js` | game.js (modal display, death, creation) |
| `game.townUnlocks` | `town-meta.js` | town-meta.js, meta-progression.js |
| `game.shopTiers` | `town-meta.js` | town-meta.js |
| `game.townState` | `town-meta.js` | town-meta.js |
| `game.chronicleEvents` | `chronicle.js` | chronicle.js (recordChronicleEvent) |
| `game.storyFlags` | `game.js` | game.js (story beats), onboarding.js, director.js |
| `game.classMasteries` | `meta-progression.js` | meta-progression.js |
| `game.contracts` | `meta-progression.js` | meta-progression.js |
| `game.telemetry` | `telemetry.js` | telemetry.js |

## Effect Bus Data Flow

```
Feature module (turns.js, director.js, builds.js, ...)
    │
    ├─ Creates: fx = createEffects()
    ├─ Accumulates: addLog(fx, ...), addSound(fx, ...), addReadout(fx, ...)
    ├─ Returns: fx
    │
    ▼
game.js delegation wrapper
    │
    ├─ Calls: applyEffects(this, fx)
    │   ├─ game.log() for each log entry
    │   ├─ game.audio.play() for each sound
    │   ├─ game.emitReadout() for each readout
    │   ├─ game.render() if fx.render
    │   └─ game.saveGame() if fx.autosave
    │
    ▼
Presentation layer (canvas, DOM, audio)
```

**Modules already migrated to effect bus:** turns.js, director.js, builds.js, exploration.js (via command-result.js)

**Modules still using game.log() directly:** combat.js, objectives.js, content.js spell casts, game.js internal methods

## Save Contract

All persistent state fields are declared in `src/core/save-contract.js`:
- `SAVE_FIELDS` — array of field names serialized into snapshots
- `SAVE_FIELD_DEFAULTS` — factory functions for migration backfill
- Used by `persistence.js` for both save and load paths

**To add a new persistent field:**
1. Add to `SAVE_FIELDS` in `save-contract.js`
2. Add default factory to `SAVE_FIELD_DEFAULTS`
3. Initialize in the game constructor
4. No other files need updating — save/load use the contract automatically

## Player State Wrapper

`game.ps` provides validated mutation methods:
- `game.ps.adjustHp(delta)` — clamps to [0, maxHp]
- `game.ps.adjustMana(delta)` — clamps to [0, maxMana]
- `game.ps.adjustGold(delta)` — clamps to [0, infinity]
- `game.ps.setStatus(key, turns)` — clamps to [0, infinity]
- `game.ps.addPerk(id)`, `game.ps.addRelic(id)`, `game.ps.learnSpell(id)`
- `game.ps.addItem(item)`, `game.ps.removeItemAt(index)`
- `game.ps.adjustCurrency(key, delta)`

Adoption is opt-in. Prefer `game.ps.*` over direct `game.player.*` mutations.

## Common Recipes

### Add a new spell
1. Add spell data to `src/data/content.js` SPELLS object
2. Keep the `cast(game, caster, target?)` contract
3. Run `npm run build`

### Add a new monster
1. Add to `MONSTER_DEFS` in `src/data/content.js`
2. If it needs a custom behavior kit, add to `ENEMY_BEHAVIOR_KITS`
3. Behavior logic is in `src/features/combat.js` processMonsters

### Add a new item
1. Add to `ITEM_DEFS` in `src/data/content.js`
2. If it needs special use logic, add a branch in game.js `useInventoryItem()`
3. Run `npm run build`

### Add a new persistent field
1. Add to `SAVE_FIELDS` and `SAVE_FIELD_DEFAULTS` in `src/core/save-contract.js`
2. Initialize in game.js constructor
3. Run `npm run build` + `npm run test:rules`

### Add a new floor objective
1. Add to `OBJECTIVE_DEFS` in `src/data/content.js`
2. Add resolution logic in `src/features/objectives.js`

### Change combat balance
1. Edit formulas in `src/features/combat.js` (attack, damageActor)
2. Edit stat formulas in `game.js` (get*ForStats methods)
3. Run `npm run test:rules`

## Module Index

| Module | File | Coupling | Notes |
|--------|------|----------|-------|
| effect-bus | `src/core/effect-bus.js` | None | Foundation for side-effect separation |
| save-contract | `src/core/save-contract.js` | None | Single source of truth for save fields |
| player-state | `src/core/player-state.js` | None | Validated player mutation interface |
| entities | `src/core/entities.js` | None | Pure utility, decoupled |
| world | `src/core/world.js` | Low | Pure level manipulation |
| render | `src/ui/render.js` | Low | Parameter-based, no game state mutation |
| telemetry | `src/features/telemetry.js` | Low | Observation only |
| hud-feed | `src/features/hud-feed.js` | Low | Display data only |
| onboarding | `src/features/onboarding.js` | Low | Flag tracking |
| advisor | `src/features/advisor.js` | Low | Query-based, read-only |
| chronicle | `src/features/chronicle.js` | Medium | Append-only event log |
| objectives | `src/features/objectives.js` | Medium | Level structure mutations |
| encounters | `src/features/encounters.js` | Medium | Monster spawning |
| exploration | `src/features/exploration.js` | Medium | Uses effect bus via command-result |
| creation | `src/features/creation.js` | Medium | Character creation state |
| persistence | `src/features/persistence.js` | Medium | Uses save contract |
| turns | `src/features/turns.js` | High | Uses effect bus, calls game methods |
| director | `src/features/director.js` | High | Uses effect bus, mutates level danger |
| builds | `src/features/builds.js` | High | Uses effect bus, deep player mutations |
| town-meta | `src/features/town-meta.js` | High | Shop/town state mutations |
| combat | `src/features/combat.js` | Very High | Direct game.log/emitReadout calls |
| meta-progression | `src/features/meta-progression.js` | Very High | Deep nested mutations |
