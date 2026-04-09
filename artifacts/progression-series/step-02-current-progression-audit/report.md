# Report

## Biggest progression strengths

- Build assembly is already the game's clearest strength. Race, class, gear, spellbooks, perks, relics, boons, contracts, mastery, and town unlocks all contribute meaningfully instead of pretending to be different while doing the same job.
- Class identity lands early and clearly. Creation plus starter loadout already makes Fighter, Rogue, and Wizard feel materially different before any later progression layers are added.
- The extract-or-greed loop is strong. Objective completion does not simply end a floor; it creates a meaningful tension between banking value and staying for more build-shaping payoff.
- Level-ups are better than plain stat-ups because they chain two decisions: perk first, spell study second.
- Persistent progression is already deep enough. The bank, mastery, commendations, contracts, and town projects give future runs real shape without replacing the run-local roguelike loop.

## Biggest progression weaknesses

- Important progression information is too fragmented. The player has to read creation, shops, reward modals, journal, bank, pack, and logs to understand the full build story.
- Several reward and choice surfaces undersell themselves with generic or soft copy. Players are often choosing correctly only if they already know the system.
- Some progression entries were or are underwired relative to how prominently they appear in choice pools.
- Stat growth is mechanically relevant but visually backgrounded. A level-up refills HP and mana and may raise all four core stats, yet the system does not strongly surface what actually changed.
- Rumor and boon progression often matters more in code than in felt excitement because the immediate payoff is less obvious than a relic or new spell.

## Most confusing choices

- `Quick Hands` before this step: present in the rogue perk pool, but its actual payoff was not wired into pickup or pressure logic.
- `Greedy Purse` before this step: present in the relic pool, but its economy-versus-pressure identity was not mechanically realized.
- `Warding Lens`: the description promises clearer threat telegraphing, but the current runtime already has strong intent icons and threat UI, so the relic's unique value is still hard to read.
- Rumor-reward objectives: they are useful long-term, but they feel less exciting than relic or boon objectives because the immediate build impact is indirect.
- Utility spell choices such as `Clairvoyance`, `Identify`, and `Light`: they are valid tools, but the spell-study screen does less than it could to explain why they matter right now.

## Weakest progression moments

- Reading a floor reward before this step. The journal used placeholder-level summaries such as `Relic reward`, `Rumor reward`, or `Boon choice`, which did not help the player plan the next build pivot.
- Hitting a weakly described reward draft. Perk and relic cards rely almost entirely on short descriptions, so vague copy translates directly into weak choice readability.
- Learning from the bank too late. The persistence stack is good, but it is easy for newer players to miss what mastery, contracts, commendations, and unlocks are doing for future runs.
- Evaluating random stat growth. It matters in formulas, but the game does not present those deltas as a satisfying moment.

## Strongest progression moments

- Character creation. It establishes class, stat shape, search radius, carrying capacity, spell access, and gear posture in one readable draft.
- The first successful level-up. The perk-plus-spell sequence is the game's best pure progression beat.
- Objective clear into extract-or-greed. This is where run pacing, reward shape, and player appetite for risk all meet.
- The return-to-town review. Bank, mastery, contracts, rumors, and funded upgrades create a strong next-run planning moment.

## Top 15 issues ranked

| Rank | Severity | Issue | Why it matters |
| --- | --- | --- | --- |
| 1 | Critical | `Quick Hands` was a dead perk before this step. | A dead pick directly harms level-up quality, rogue identity, and trust in the perk pool. |
| 2 | Critical | `Greedy Purse` was a dead relic before this step. | A dead relic weakens objective-reward excitement and makes the greed category look fake. |
| 3 | High | Objective reward previews were generic placeholders. | Players could not forecast whether a floor was leading to a relic draft, boon burst, or intel-only reward in a meaningful way. |
| 4 | High | Reward card copy often does too little mechanical work. | Perk and relic choices depend heavily on text, so vague descriptions flatten differentiation. |
| 5 | High | Level-up stat growth is underexplained. | Random all-stat growth changes real formulas, but the player mostly sees only the perk and spell card. |
| 6 | High | Persistent progression is concentrated in the bank and easy to underread. | Mastery, commendations, contracts, rumors, and unlock funding all matter, but they compete for the same attention. |
| 7 | Medium-High | Same-class perk variety is narrow. | Four perks per class keeps identity clean, but it also risks convergence across repeated runs. |
| 8 | Medium-High | Rumor rewards feel weaker than they are. | They improve future runs, but the immediate progression beat is less exciting than relic or boon outcomes. |
| 9 | Medium | Spell-study readability is solid on metadata and weaker on role explanation. | Tier, school, range, and cost are visible, but tactical identity still relies on prior player knowledge. |
| 10 | Medium | Boons are useful but not especially aspirational. | They are good sustain and economy tools, yet they rarely feel as run-defining as relics or spells. |
| 11 | Medium | Build summaries are distributed across too many surfaces. | Players assemble a real build, but the game offers no single surface that tells the whole story cleanly. |
| 12 | Medium | Reward pacing spikes heavily at objective moments. | Town and objective clears are rich, while the middle of a floor is more incremental and can feel flatter by comparison. |
| 13 | Medium | Spell acquisition has two strong channels without strong synthesis. | Level-up study and spellbooks both matter, but the game does not frame how they complement each other. |
| 14 | Low-Medium | Some relics still read softer than their actual strategic niche. | Even where hooks exist, several relics feel less special than they are because the presentation is modest. |
| 15 | Low-Medium | `templeFavor` remains an underused progression vocabulary term. | Dormant currencies increase cognitive load and imply incomplete systems. |

## What already works and should not be overdesigned

- Do not replace the multi-axis build assembly pillar. It already gives the game real replay depth.
- Do not collapse perk, spell, gear, relic, and town progression into one monolithic tree. Their overlap is part of the game's identity.
- Do not remove the extract-or-greed structure in pursuit of cleaner pacing. It is one of the clearest sources of tension and reward excitement.
- Do not overcorrect class identity. The current class split is readable and already strong enough to support later tuning work.

## Changes made

1. `Quick Hands` was wired into pickup friction and post-objective greed pressure in [`src/game.js`](../../../src/game.js). Gold, consumables, spellbooks, and other light utility pickups now skip burden checks, and those quick grabs no longer add greed pressure after the floor objective is already cleared.
2. `Greedy Purse` was wired into greed payouts and greed pressure in [`src/features/objectives.js`](../../../src/features/objectives.js) and [`src/features/director.js`](../../../src/features/director.js). Post-objective greed rewards now pay 25% more gold, but each greed action also adds one extra point of pressure.
3. Objective reward forecasting was upgraded in [`src/features/objectives.js`](../../../src/features/objectives.js). The journal and mission surfaces now describe actual reward shape instead of placeholder labels.

## What should be tackled next

- Surface stat growth better at level-up so players understand how much raw power changed before reading perk and spell cards.
- Rework weakly differentiated reward copy across the rest of the perk, relic, and boon pools, especially for entries that are mechanically valid but emotionally flat.
- Decide whether rumor rewards need a stronger immediate punch, a stronger preview, or a stronger bank-side recap.
- Audit the remaining underwired or under-surfaced entries, especially `Warding Lens` and `templeFavor`.
