# Perceived Slowness Report

## Menus that feel slow vs menus that are slow

### Menus that feel slow more than they are slow

- `Magic`
  Filter switches were already around `4ms` to `5ms`, but the view still felt weighty because the cards are dense and the selected state lived inside a busy layout.
- `Sage` blocked identify
  The action was already effectively instant, but the old feedback presentation did not visually answer the player with enough authority.
- `Field Guide`
  The guide is content-heavy by design, so even moderate timings can read as sluggish if the current section is not obvious immediately.

### Menus that were actually slow enough to matter

- `Field Guide -> Pack`
  Still one of the slower pure menu handoffs in the series.
- `Journal` chronicle and `Provisioner -> Sell`
  These had measurable settle costs even after the structural optimization steps.

## Causes of perceived slowness

- The modal-open background treatment was visually heavy.
  Strong blur and dimming made the app feel like it stopped and rebuilt itself whenever a menu opened.
- Dense screens did not answer “what changed?” quickly enough.
  Pack, Magic, Field Guide, and Provisioner all required too much scanning before the player could confirm the new state.
- Local modal feedback existed technically, but not visually.
  The interaction feedback host had logic behind it, but too little styling to feel like a firm response.

## What changed

1. Added compact quick-state strips to heavy menus.
   `Pack`, `Magic`, `Field Guide`, and `Provisioner` now show a small status strip that summarizes the current filter, section, selected item or spell, or active panel.
2. Styled modal interaction feedback so blocked and confirmed actions answer clearly.
   The banner now reads like a deliberate in-modal response instead of plain text appearing near the title.
3. Lightened the modal-open background treatment.
   The background still recedes when a modal opens, but it no longer blurs and dims as aggressively.

## Why the UI now feels faster

- The player gets an immediate headline for the current state.
  On dense screens, that reduces scan time more than shaving a millisecond or two off a click handler.
- Blocked actions no longer read like “nothing happened.”
  The feedback banner is now prominent enough that low-gold or unavailable actions feel answered rather than ignored.
- Menus feel less like a heavy overlay and more like a quick layer over the game.
  The lighter background treatment reduces the sense of a full-screen transition cost.

## Performance truth vs UX truth

### Performance truth

- This was not a blanket speed win.
- A few paths improved for real:
  - `journal_section_switch_chronicle` ready `14.8ms -> 10.4ms`
  - `provisioner_panel_switch_sell` ready `7.4ms -> 6.4ms`
  - `sage_identify_blocked` `1.4ms -> 0.8ms`
- Several opens regressed modestly because the new quick-state strips add markup:
  - `utility_to_journal_open` `9.1ms -> 16.4ms`
  - `journal_to_pack_tab_switch` `24.3ms -> 26.5ms`
  - `pack_filter_switch_use` `8.4ms -> 9.9ms`

### UX truth

- The menus now explain themselves faster, even when some raw numbers are slightly worse.
- The blocked `Sage` case is the best example: the action was already technically fast, but the stronger banner makes it feel responsive and trustworthy.
- The heavy hub screens now read more clearly on first glance because the player no longer has to parse the whole panel to know what changed.

## Remaining perceived-slowness issues

- `Field Guide -> Pack` still feels like a major handoff because it is one.
  The next pass should continue focusing on first-time pack construction.
- `Chronicle` is still visually dense.
  Even with a clearer state strip, it remains a long-form reading screen and will never feel as instant as a compact action menu.
- `Magic` still has a lot of copy per card.
  The new state strip helps, but the card body itself remains visually rich.
