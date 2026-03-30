# Save Format

## Storage

- Key: `SAVE_KEY`
- Medium: browser `localStorage`
- Source of truth: `src/features/persistence.js`

## Payload

- `saveFormatVersion`
- `version`
- `turn`
- `currentDepth`
- `levels`
- `player`
- `settings`
- `shopState`
- `storyFlags`
- `lastTownRefreshTurn`
- `meta`

## Meta Block

- `name`
- `level`
- `depth`
- `savedAt`

## Migration Policy

- Increment `saveFormatVersion` when a structural change would break older saves.
- Add a migration path in `migrateSnapshot`.
- Keep migrations additive when possible.
- Never assume older saves already contain newly added optional fields.
