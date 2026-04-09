# Linked Post

I completed a spell-only audit pass on `castleofthewinds` and shipped three targeted improvements instead of a broad combat rebalance.

What the audit found:
- The spellbook is already broad and interesting.
- The main weakness was not content quantity, but how weakly the system explained exact spell payoff.
- Utility spells were doing more work in code than they were getting credit for in the UI.

What changed:
- Spell Study, Magic Book, and Field Tray now show concrete mechanical spell readouts.
- Spell Study now signals `New at Lv X` versus `Available since Lv X`.
- `Light` now reveals nearby hidden threats in addition to its sight buff, giving it a cleaner scouting role.

Artifact path:
- `artifacts/progression-series/step-03-spell-system-deep-dive/`
