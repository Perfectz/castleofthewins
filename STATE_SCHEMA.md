# State Schema

## Top-Level Runtime State

- `turn: number`
- `mode: "title" | "creation" | "game" | "target" | "modal" | "levelup"`
- `levels: Level[]`
- `currentDepth: number`
- `currentLevel: Level | null`
- `player: Player | null`
- `messages: LogEntry[]`
- `shopState: ShopState`
- `storyFlags: Record<string, boolean>`
- `settings: Settings`
- `pendingSpellChoices: number`
- `pendingTurnResolution: boolean | null`
- `targetMode: TargetMode | null`

## Player

- Identity
  `name`, `race`, `className`
- Position
  `x`, `y`
- Progression
  `level`, `exp`, `nextLevelExp`, `deepestDepth`
- Resources
  `hp`, `maxHp`, `mana`, `maxMana`, `gold`, `bankGold`
- Bases
  `hpBase`, `manaBase`
- Stats
  `stats.str`, `stats.dex`, `stats.con`, `stats.int`
- Status
  `constitutionLoss`, `slowed`, `lightRadius`
- Inventory
  `inventory[]`, `equipment`
- Quest
  `quest.hasRunestone`, `quest.complete`

## Level

- Shape
  `width`, `height`, `type`, `description`
- Tiles
  `tiles[]`
- Discovery
  `visible[]`, `explored[]`
- Occupants
  `actors[]`, `items[]`
- Anchors
  `start`, `stairsUp`, `stairsDown`, `rooms`

## Derived Values

- Carry capacity is derived from `stats.str`.
- Search radius and search power are derived from `stats.dex` and `stats.int`.
- Max HP and max mana are derived from bases, class, stats, and status loss.
- Advisor model is derived UI state and should never be saved.

## Invariants

- `currentLevel === levels[currentDepth]` when a run is active.
- `player.hp <= player.maxHp`
- `player.mana <= player.maxMana`
- `pendingSpellChoices > 0` implies spell-learn flow can interrupt turn resolution.
