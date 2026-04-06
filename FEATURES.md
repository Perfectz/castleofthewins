# Castle Of The Winds Features

This document describes the current browser build's mechanics, progression systems, content lists, and town services.

## Core Loop

The run starts in town. The player travels north into the keep, descends floor by floor, clears each floor's main objective, and decides whether to extract or stay for more loot while pressure rises.

Main loop:
- Start in town and use services to prepare.
- Enter the keep through the north road.
- Explore each dungeon floor.
- Clear the floor objective to unlock deeper stairs.
- Take optional greed encounters if desired.
- Return to town to reset pressure, trade, heal, identify items, and advance the story.

Campaign arc:
- Depth 1 to 2: onboarding objective floors.
- Depth 3: `The Gatekeeper`.
- Depth 5: `The Crypt Lord`.
- Depth 7: `The Storm Warden` and the `Runestone of the Winds`.

## Character Creation

### Races

- `Human`: balanced and resilient.
- `Elf`: higher Dexterity and Intelligence, lower durability.
- `Dwarf`: highest durability, lowest magic start.

### Classes

- `Fighter`: strongest starting survivability and gear.
- `Rogue`: mobility, scouting, and control.
- `Wizard`: weakest physical start, strongest magical growth.

### Stats

- `STR`: melee offense.
- `DEX`: evasion, searching, and precision.
- `CON`: health, recovery, and overcast safety.
- `INT`: mana pool and spell effectiveness.

## Progression

The game uses several progression layers during a run.

- XP and level-ups.
- Spell study choices on level-up.
- Class-family perk choices.
- Objective and milestone reward choices.
- Relics and boons.
- Rumor tokens and town unlocks.

### Perks

Fighter perks:
- `Brace`
- `Cleave`
- `Shield Mastery`
- `Blooded`

Rogue perks:
- `Backstab`
- `Evasion`
- `Trap Sense`
- `Quick Hands`

Wizard perks:
- `Spell Efficiency`
- `Element Focus`
- `Overcast Control`
- `Warding`

### Relics

- `Survivor's Talisman`
- `Greedy Purse`
- `Anchoring Pin`
- `Fleet Boots`
- `Cursed Prism`
- `Warding Lens`
- `Hunter's Map`

### Boons

- `Windfall`
- `Field Medicine`
- `Aether Cache`
- `Hunter's Mark`

## Dungeon Rules

### Floor Objectives

Each dungeon floor before the final sanctum has one main objective:

- `Recover The Relic`
- `Purge The Nest`
- `Rescue The Captive`
- `Seal The Shrine`

The floor objective must be resolved before stairs deeper into the dungeon become usable.

### Optional Encounters

Optional greed encounters provide extra value while increasing danger:

- `Cursed Cache`
- `Ghost Merchant`
- `Blood Altar`
- `Vault Room`

### Pressure And Reinforcements

Dungeon floors become more hostile over time.

Pressure rises through:
- time spent on the floor
- noise
- waiting
- resting
- searching
- greed actions after resolving the objective

As pressure rises, sleeping monsters wake, patrols become active, and reinforcement waves can arrive.

### Exploration

- Floors use line-of-sight visibility and explored fog.
- Search reveals hidden traps, secret doors, and secret walls.
- Depth 1 uses guided route reveal to make the first objective easier to read.
- The minimap marks stairs, objective rooms, objective markers, and optional encounters.

## Combat

Combat is turn-based and grid-based.

Key rules:
- Moving into a monster performs melee.
- Ranged enemies, chargers, summoners, and casters telegraph intent.
- Some monsters begin asleep and wake through proximity, noise, or pressure.
- Burden affects combat performance and safety.
- Wands, scrolls, spells, traps, and environmental features all matter.

### Recovery

- `Wait`: spend a careful turn.
- `Rest`: short noisy recovery.
- `Sleep`: recover until HP and mana are full, but it stops immediately if a monster is visible or enters view.

### Overcast

Spells normally cost mana. If the player casts without enough mana, the game allows overcasting:

- the spell still fires if overcasting is allowed
- the player loses Constitution based on the mana shortage
- `Overcast Control` reduces this penalty
- temple restoration can recover lost Constitution

## Spell List

### Damage And Control

- `Magic Missile`
- `Frost Bolt`
- `Fireball`
- `Lightning Bolt`
- `Slow Monster`
- `Hold Monster`

### Healing And Defense

- `Cure Light Wounds`
- `Cure Serious Wounds`
- `Shield`
- `Stone Skin`
- `Resist Fire`
- `Resist Cold`

### Escape And Utility

- `Phase Door`
- `Teleport`
- `Rune of Return`
- `Clairvoyance`
- `Light`
- `Detect Traps`
- `Identify`
- `Remove Curse`

### Spell Learning

- Level-up study choices prefer spells aligned to the current class.
- Spellbooks can still teach spells outside class affinity.
- Wizards have the broadest direct spell access.
- Fighters lean toward defensive and survival magic.
- Rogues lean toward control, escape, and scouting.

## Item List

### Weapons

- `Dagger`
- `Short Sword`
- `Broad Sword`
- `Battle Axe`
- `War Hammer`
- `Oak Staff`

### Armor And Worn Gear

Body:
- `Cloth Robe`
- `Quilt Armor`
- `Leather Armor`
- `Chain Mail`
- `Plate Mail`

Offhand:
- `Buckler`
- `Tower Shield`

Head:
- `Bronze Helm`
- `Iron Helm`

Other worn gear:
- `Travel Boots`
- `Shadow Cloak`
- `Ring of Focus`
- `Charm of Fortune`
- `Charm of Light`

### Consumables

- `Potion of Healing`
- `Potion of Mana`
- `Scroll of Identify`
- `Scroll of Mapping`
- `Scroll of Teleport`
- `Scroll of Remove Curse`
- `Rune of Return`

### Charged Items

- `Wand of Lightning`
- `Wand of Slow Monster`
- `Staff of Healing`

### Spellbooks

- `Spellbook of Frost`
- `Spellbook of Fire`
- `Spellbook of Phase Door`
- `Spellbook of Clairvoyance`
- `Spellbook of Identify`
- `Spellbook of Slow Monster`
- `Spellbook of Remove Curse`
- `Spellbook of Major Healing`
- `Spellbook of Shield`
- `Spellbook of Stone Skin`
- `Spellbook of Fire Ward`
- `Spellbook of Frost Ward`
- `Spellbook of Teleport`
- `Spellbook of Light`
- `Spellbook of Trap Sight`
- `Spellbook of Holding`
- `Spellbook of Lightning`

### Other Items

- `Broken Dagger`
- `Rusted Mail`
- `Runestone of the Winds`

### Item State

Items can be:
- unidentified
- cursed
- enchanted or modified by run systems

Weight matters. Burden affects dodge and overall safety.

## Town

### Shops And Services

Shops:
- `Provisioner`
- `Armory`
- `Wizard's Guild`
- `Temple`
- `Sage's Tower`
- `Junk Shop`

Temple services:
- `Healing`
- `Restoration`
- `Remove Curse`
- `Rune of Return`

Other town systems:
- Sage identification
- Bank and chronicler functions
- Rumor buying
- Town upgrades

### Town Time

The town uses a 120-turn daily cycle with four phases:

- `Dawn`
- `Day`
- `Dusk`
- `Night`

Current behavior:
- `Dawn`: recovery and route-oriented stock emphasis, temple cheaper.
- `Day`: baseline buying and selling.
- `Dusk`: stronger spellwork flavor and deeper rumors.
- `Night`: buying is more expensive, selling pays better.

### Town Unlocks

- `Supply Cache`
- `Guild License`
- `Temple Favors`
- `Archive Maps`
- `Ghost Bargains`
- `Deep Contracts`

## Monsters

Standard enemies:
- `Giant Rat`
- `Kobold`
- `Kobold Slinger`
- `Goblin`
- `Goblin Archer`
- `Dire Wolf`
- `Skeleton`
- `Orc`
- `Ochre Jelly`
- `Troll`
- `Wraith`
- `Ogre`
- `Orc Shaman`
- `Warlock`
- `Cave Wyrm`

Named bosses:
- `Gatekeeper Hroth`
- `Veyra The Crypt Lord`
- `The Storm Warden`

Monster behaviors include:
- melee rush
- ranged fire
- charge lanes
- summoning
- control spells
- teleport or phasing on some advanced enemies

## Story Layer

The current browser build includes a lightweight story system delivered through:

- town briefings
- milestone entry and clear beats
- discovery fragments
- journal updates
- chronicle events

Named story cast:
- `Halric Voss`, steward
- `Sister Elira`, temple keeper
- `Magister Iven`, guild sage
- `Osric Dane`, banker-chronicler

Major beats:
- `The Steward's Charge`
- `The Sealed Barracks`
- `The False Court Below`
- `The Last Oath`
- `The Runestone Returned`

## Interface Notes

The current in-play shell includes:

- top status band
- bottom status, log, and action band
- inventory hub
- spell hub
- journal
- toggleable map drawer
- controller navigation support
- touch fallback controls

Map access:
- top-band `Map` button
- controller `Back/View`
- keyboard map shortcut, where available in the current build

