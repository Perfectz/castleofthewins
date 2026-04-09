# Current Progression Audit

Before redesigning a progression system, I want to know two things: what is already working, and what is currently undermining player trust. This audit pass on `castleofthewinds` focused on exactly that question across the live codebase and the live runtime.

The game already has a lot going for it. Build assembly is real, not cosmetic. Race, class, gear, spellbooks, perks, relics, boons, contracts, mastery, commendations, and town unlocks all shape either the current run or the next one. The extract-or-greed loop is especially strong because it turns floor completion into a progression decision rather than a simple checkpoint.

The weak spots were not about missing systems so much as missing clarity and missing wiring. Some progression surfaces were asking the player to make meaningful choices with weak preview text. Worse, two visible entries in the progression pool were not paying off strongly enough to justify their presence: the rogue perk `Quick Hands` and the relic `Greedy Purse`.

This step fixed three obvious issues without redesigning the overall structure.

First, `Quick Hands` now actually changes play. Light utility pickups skip burden checks, and those opportunistic grabs no longer add greed pressure after the objective is already clear. That turns the perk into a real rogue-facing tempo and safety tool.

Second, `Greedy Purse` now behaves like an actual greed relic. Post-objective greed rewards pay 25% more gold, but every greed action raises pressure faster. That makes the tradeoff legible and meaningful.

Third, floor reward previews now forecast the actual shape of the reward instead of using placeholder labels. A player can now tell whether a floor is leading toward a relic draft, a boon draft, or rumor-oriented future value.

The bigger takeaway is that the game does not need a wholesale progression rewrite yet. It needs a sharper presentation layer, better surfacing for stat growth and persistent systems, and follow-up work on the remaining underwired or underexplained entries. The foundation is already strong enough that clarity improvements can materially raise the perceived quality of progression before any larger mechanical redesign begins.
