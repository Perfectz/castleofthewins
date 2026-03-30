---
name: tileset-prompt-generator
description: Generate disciplined standalone prompts for game tilesets, terrain atlases, building atlases, sprite sheets, prompt repair passes, and related environment-art prompt work. Use when Codex needs to write or tighten prompts for top-down game assets, especially modular fantasy roguelike tiles, town terrain, buildings, roads, dungeon features, or follow-up prompts that correct drift from a previous image result.
---

# Tileset Prompt Generator

Write one production-ready prompt unless the user explicitly asks for multiple prompts.

Use the project's actual game context when available. Match the camera, tile logic, mood, and asset scope to the game instead of writing generic art prompts.

## Workflow

1. Identify the asset type.
   Use one of these buckets:
   - atlas: multiple modular map tiles in one sheet
   - sprite sheet: characters, monsters, effects, items
   - scene: a full top-down environment view used to judge direction
   - repair: a follow-up prompt that fixes a failed generation

2. Lock the camera and usage.
   State whether the prompt is for:
   - strict orthographic top-down
   - flat gameplay tile
   - modular atlas
   - readable at small size

3. Define the exact tile list.
   Name the asset count and the tile names in the prompt. Do not leave the model to infer the contents.

4. Add style and consistency constraints.
   Keep the palette, lighting, material language, and shape discipline consistent across the sheet.

5. Add strong negatives.
   Explicitly ban the common failure modes:
   - isometric angle
   - side view
   - perspective distortion
   - icon sheet style
   - labels
   - watermark
   - decorative poster layout
   - floating cutout objects

6. Keep the output standalone.
   Do not add a second "tighter version" or alternates unless asked.

## Output Rules

- Prefer one fenced prompt block when the user asks for a prompt.
- Make each prompt standalone. Do not rely on shared style clauses.
- If the user mentions a prior failed image, write a repair prompt that directly addresses the visible drift.
- If the user wants a fast first pass, prefer a narrower asset family over a giant all-in-one atlas.

## Prompt Structure

- Open with the deliverable type and grid size.
- State identical camera, scale, lighting, and square framing.
- List the exact requested tiles or assets.
- State art direction in plain language.
- Add implementation constraints for readability and modularity.
- End with negative constraints.

## Reference Use

Read [prompt-patterns.md](./references/prompt-patterns.md) when you need ready-made wording patterns for:
- terrain atlases
- building atlases
- sprite sheets
- repair prompts

