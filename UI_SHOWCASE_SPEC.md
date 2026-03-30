# AI Showcase UI Spec

Status legend:
- `[ ]` not started
- `[~]` in progress
- `[x]` done

## Goal

Modernize the game into an AI-assisted tactical roguelike showcase for short mobile sessions.

The UI should:
- make the dungeon the primary visual focus
- surface immediate danger and meaningful options
- reduce panel clutter and menu friction
- feel like a modern "intelligent interface," not a retro desktop clone

## Product Thesis

This is not a chatbot bolted onto a roguelike.

The UI should feel like:
- a tactical analyst
- a dungeon chronicler
- a semantic inventory assistant
- a mobile-native decision support layer

## Experience Principles

1. World first
The dungeon viewport is the hero. Everything else should support reading and acting in that space.

2. Threat legibility
Visible danger, enemy plans, greed risk, and unsafe rest states must be readable at a glance.

3. Decision compression
The game should suggest a few high-value actions instead of forcing the player to scan everything manually.

4. Build identity
The interface should explain what kind of run the player is having, not just show raw stats.

5. Plane-ride ergonomics
Large targets, short sessions, low friction, clear feedback, no dead admin screens.

## MVP Roadmap

### MVP 1: Tactical Shell
- `[~]` Replace dashboard-heavy layout with a world-first screen
- `[~]` Add floating minimap overlay
- `[~]` Add player status capsule
- `[~]` Add threat capsule
- `[~]` Add advisor strip with short tactical guidance
- `[~]` Add contextual recommendation buttons tied to existing game actions

Acceptance criteria:
- The board is visually dominant
- Critical state is readable without scanning multiple panels
- The interface suggests what matters now

### MVP 2: Smart Action Layer
- `[ ]` Replace static bottom bar with contextual action dock
- `[ ]` Add richer interaction affordances for loot, stairs, shrines, and hazards
- `[ ]` Add better danger overlays for ranged attacks, charge lanes, and trap suspicion
- `[ ]` Convert remaining utility screens into cleaner mobile sheets

Acceptance criteria:
- The best next few actions are visible with minimal friction
- Combat and exploration choices feel faster and clearer

### MVP 3: Semantic Inventory
- `[ ]` Rebuild inventory into semantic groups: equipped, emergency, build, sell, unknown
- `[ ]` Add natural-language item annotations
- `[ ]` Add build summary card
- `[ ]` Add stronger curse and risk surfacing

Acceptance criteria:
- Inventory reading time drops materially
- Item choice feels strategic rather than clerical

### MVP 4: Story and Run Intelligence
- `[ ]` Add run chronicle panel
- `[ ]` Add death recap and "why you died" summary
- `[ ]` Add milestone/event presentation for story beats
- `[ ]` Add notable-find and greed-event summaries

Acceptance criteria:
- Runs produce memorable, reviewable stories
- The game becomes easier to spectate and share

## Implementation Notes

### Information hierarchy
- Layer 1: board
- Layer 2: minimap, HP/mana/condition, visible threat summary
- Layer 3: advisor sentence and suggested actions
- Layer 4: logs, deeper character/build detail, menus

### What the advisor should do
- warn when resting is unsafe
- identify ranged pressure
- identify shrine and greed risks
- suggest line-of-sight breaks
- suggest obvious tactical actions only when confidence is high

### What the advisor should not do
- explain every trivial turn
- replace tactical discovery
- flood the screen with verbose text
- behave like a free-form chat agent

## Current Progress

- `[x]` Mobile-first travel shell exists
- `[x]` Intent icons exist for monsters
- `[x]` Harder authored rooms and noisier resting exist
- `[~]` Tactical-shell redesign is the active workstream
