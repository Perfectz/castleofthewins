# Test Strategy

## Current Minimum

- Syntax check after rebuild.
- Repeatable browser harness:
  `npm run playtest:harness`
- Manual smoke test:
  New game
  Move
  Fight
  Search
  Stairs up/down
  Save/load
  Open pack/magic/journal

## Next Tests To Add

- Unit tests for:
  Search command
  Stair command
  Save migration
  Monster intent selection
  Derived stat math
- Snapshot tests for:
  Advisor model
  Creation preview model

## Refactor Rule

- Every extracted feature module should gain at least one narrow test before more rules are moved into it.
