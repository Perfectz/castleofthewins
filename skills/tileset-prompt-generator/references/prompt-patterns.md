# Prompt Patterns

Use these as patterns, not boilerplate to dump blindly.

## Atlas Pattern

```text
Create a production-style [asset family] tile atlas for a [game type], arranged in a strict [cols] by [rows] grid with exactly [count] square tiles. Every tile must use the same orthographic top-down camera, the same scale, the same lighting, and the same square framing. This must look like usable gameplay art, not concept art, not icons, not UI cards, and not decorative stickers.
```

## Building Atlas Notes

For town or city buildings, prefer roof-first prompts when the view is map-like. Ask for:
- roof tiles that read clearly from directly above
- modular wall and door tiles only if they are truly needed
- simplified silhouettes over ornament
- distinct building identities through materials and roof shapes, not labels

Useful building set examples:
- house roof
- shop roof
- inn roof
- armory roof
- bank roof
- temple roof
- wizard guild roof
- sage tower roof
- stable roof
- market stall roof
- well
- plaza feature

## Repair Prompt Notes

If a prior result drifted, name the failure directly in the new prompt:
- "stairs must read as square dungeon stair tiles, not circular pits"
- "tiles must feel flat and map-like, not floating icons"
- "no text labels anywhere"
- "hidden wall variant should look almost identical to the wall tile"

## Standard Negative Block

```text
Negative constraints:
no isometric angle
no side view
no perspective distortion
no labels
no watermark
no UI
no poster layout
no icon sheet style
no cutout objects
no checkerboard transparency background
```
