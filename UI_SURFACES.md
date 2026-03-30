# UI Surfaces

## Title Flow

- Title screen
  Continue metadata and first-run entry point.
- Creation screen
  Name, race, class, stat points, preview.

## Main HUD

- Board canvas
- Minimap
- Player capsule
- Threat capsule
- Advisor strip
- Action dock
- Quick save/load meta chip

## Modal Surfaces

- Field hub
  Pack, magic, journal
- Shops
- Temple
- Sage
- Bank
- Help
- Settings
- Spell learn
- Generic list modal

## Ownership

- Title and creation UI: `src/features/creation.js`
- Advisor HUD: `src/features/advisor.js`
- Modal shell: `src/game.js`
- Canvas rendering: `src/ui/render.js`
