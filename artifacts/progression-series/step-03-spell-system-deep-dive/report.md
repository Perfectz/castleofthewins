# Report

## Current spell taxonomy

The game currently implements 20 spells in [`src/data/content.js`](../../../src/data/content.js). The spellbook is broad rather than narrow: offense, defense, recovery, control, travel, sight, identify, curse, and general utility all coexist, with the player-facing taxonomy defined in [`src/features/inventory-ui.js`](../../../src/features/inventory-ui.js).

Breakdown by player-facing category:

- Offense: `Magic Missile`, `Fireball`, `Lightning Bolt`
- Defense: `Shield`, `Stone Skin`, `Resist Fire`, `Resist Cold`
- Recovery: `Cure Light Wounds`, `Cure Serious Wounds`
- Control: `Frost Bolt`, `Slow Monster`, `Hold Monster`
- Travel: `Phase Door`, `Teleport`, `Rune of Return`
- Sight: `Light`, `Detect Traps`, `Clairvoyance`
- Identify / Curse: `Identify`, `Remove Curse`

Breakdown by affinity:

- Wizard-leaning: `Magic Missile`, `Frost Bolt`, `Fireball`, `Lightning Bolt`
- Rogue-leaning: `Phase Door`, `Slow Monster`, `Hold Monster`, `Teleport`, `Light`, `Detect Traps`
- Fighter-leaning: `Cure Serious Wounds`, `Stone Skin`, `Shield`, `Resist Fire`, `Resist Cold`
- Shared: `Cure Light Wounds`, `Clairvoyance`, `Identify`, `Remove Curse`, `Rune of Return`

This taxonomy is one of the spell system's strengths. The game is not treating "spell" as only damage or only crowd control; it treats spells as a full utility and planning layer for the run.

## Spell acquisition/progression model

Spells enter a run through four routes.

1. Class start kits. Rogue starts with `Magic Missile`; Wizard starts with `Magic Missile` and `Cure Light Wounds`; Fighter starts with no spells.
2. Level-up Spell Study. Every level grants one spell choice, filtered by current level and sorted by class affinity first, then learn level, then mana cost in [`src/game.js`](../../../src/game.js).
3. Spellbooks. Using a spellbook teaches the matching spell immediately if it is unknown and can auto-pin it to the tray in [`src/game.js`](../../../src/game.js).
4. Persistent progression. Class mastery can unlock additional starting spells such as `Shield`, `Identify`, and `Clairvoyance`.

Spell usefulness scales in three different ways:

- Direct scaling: damage and healing spells scale mostly with Intelligence, and damage spells also benefit from `Element Focus`.
- Economy scaling: `Spell Efficiency`, mana gear, ward gear, and overcast-relief gear change how often the player can cast.
- Tactical scaling: utility spells do not usually gain bigger numbers, but they stay relevant because floor pressure, hidden information, and positioning remain relevant for the whole run.

The weak point before this step was not acquisition breadth. The weak point was that many spell surfaces were asking the player to infer important mechanical details from very soft copy.

## Strongest spell patterns

- The system rewards mixed books more than single-axis spam. A strong run wants some combination of damage, recovery, sight, or escape rather than only one spell type.
- The spell tray versus spell book split is good. The tray handles fast repeat casts; the book handles the fuller strategic library.
- Utility spells matter structurally because the game has hidden information, pressure pacing, overcast risk, extraction decisions, and map-reading.
- Spell progression is not just more damage. Travel, scouting, cleansing, warding, and sustain all compete for learn slots, which creates real build expression.

## Weakest spell patterns

- Too many spells previously hid their real power behind vague descriptions. The system knew exact durations, radii, hold values, and formulas, but the player often did not.
- Spell Study previously did too little to explain progression timing. A newly unlocked spell and a skipped older spell looked too similar.
- Acquisition messaging was too thin. Learning a spell from Spell Study or from a spellbook did not tell the player much about why that spell mattered or whether it entered the tray.
- Several utility spells were strategically good in code but emotionally flat in presentation, especially `Light`, `Detect Traps`, `Shield`, and the resistance wards.
- Utility spells scale less visibly over a run than direct damage and healing spells, which can make them feel static even when they remain useful.

## Redundant or muddy spells

- `Light`, `Detect Traps`, and `Clairvoyance` were partially muddy before this step because all three live in the "seeing more" family, but their mechanical differences were undersold.
- `Phase Door` and `Teleport` are actually differentiated by range and safety profile, but the original wording did not do enough to communicate their relative jobs.
- `Shield`, `Stone Skin`, `Resist Fire`, and `Resist Cold` all function as defensive upkeep tools, but without explicit duration and stat language they risked reading like samey buff filler.

The audit conclusion is not that these spells should be removed. The stronger conclusion is that they needed better readouts and at least one sharper runtime identity pass.

## What was changed and why

### 1. Concrete spell effect readouts across the system

- File: [`src/game.js`](../../../src/game.js)
- Change: added shared spell mechanic readouts and used them in Spell Study, the Magic Book, the Field Tray, and magic quick-state summaries.
- Why: spell descriptions were often too soft to support planning. The player now sees exact durations, hold or slow values, blast size, and damage or healing formulas where it matters.

### 2. Better spell acquisition and progression messaging

- File: [`src/game.js`](../../../src/game.js)
- Change: Spell Study now labels whether a spell is `New at Lv X` or `Available since Lv X`, and learn messages now include concrete effect text plus whether the spell was added to the tray.
- Why: the old learning flow told the player what they acquired, but not why it was timely or immediately useful.

### 3. `Light` now has stronger tactical identity

- File: [`src/data/content.js`](../../../src/data/content.js)
- Change: `Light` still grants +2 sight for 40 turns, but now also reveals nearby hidden threats within 6 tiles when cast.
- Why: this makes `Light` more strategically meaningful and separates it more clearly from `Detect Traps` and `Clairvoyance`.

## What spell design direction the game should pursue

- Keep the broad tactical spellbook. The game is stronger because spells cover offense, sustain, scouting, travel, and cleansing rather than only raw damage.
- Favor explicit mechanical communication. This spell system gets better when players can plan around exact durations, ranges, blast shapes, and control values.
- Preserve mixed-book incentives. The strongest design direction is not "make every spell a bigger nuke," but "make every spell's job legible and situationally powerful."
- When tuning utility spells, prefer local tactical leverage over passive taxes. `Light` becoming a small reveal tool is a good model; it turns a maintenance spell into a decision.
- If the next spell step goes deeper, it should focus on differentiating the remaining sight and defense families and then inspect whether utility spells need better late-run scaling hooks.
