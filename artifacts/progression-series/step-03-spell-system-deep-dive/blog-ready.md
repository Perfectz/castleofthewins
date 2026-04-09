# Spell System Deep Dive

This step isolates one of the game's most important build-expression layers: spells. The goal was not to redesign combat from scratch, but to answer a simpler question first. What does the current spell system already do well, where does it become muddy, and what are the most obvious improvements that make spells easier to plan around?

The current foundation is strong. `castleofthewinds` already has a broader spellbook than many small roguelikes. Spells are not just damage buttons. They cover offense, control, healing, warding, sight, travel, identification, curse management, and extraction. That breadth matters because it lets spells shape the run in more than one way.

The weakness was not lack of content. The weakness was that too much of the system's real meaning lived in code rather than in the player-facing readouts. The game knew exact hold durations, resistance windows, sight extension, blast size, and damage formulas. The player mostly saw short descriptions that hinted at those effects without committing to them.

This step shipped three targeted improvements.

First, the game now uses shared mechanical spell readouts across Spell Study, the Magic Book, and the Field Tray. Instead of only saying that `Shield` is a reliable ward or that `Slow Monster` reduces speed, the UI now explains what those spells actually do in concrete terms.

Second, Spell Study now communicates progression timing better. A spell can now read as newly unlocked at the current level or as something the player could have learned earlier. That makes spell progression feel more like a timeline and less like a flat bucket of options.

Third, `Light` received a small but meaningful differentiation pass. It still grants a long sight buff, but it now also reveals nearby hidden threats when cast. That change turns it into a more active scouting spell and separates it more clearly from `Detect Traps` and `Clairvoyance`.

The broader conclusion is that this spell system should keep moving toward explicit tactical jobs. The strongest direction is not bigger numbers for every spell. It is clearer roles, cleaner progression signals, and utility spells that create real planning choices instead of passive upkeep chores.
