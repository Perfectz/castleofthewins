PLEASE IMPLEMENT THIS PLAN:
# Step 09: New Game Screen Simplification

## Summary

Create a new series step focused on the `Create Adventurer` screen as a phone-first minimalism pass. The goal is **fast start**, **essentials-only default visibility**, **compact race/class cards**, and a **quiet utility** visual tone.

This step should follow the same artifact pattern as the earlier series steps:
- `artifacts/menu-redesign-series/step-09-new-game-screen-simplification/`
- `prompt.md`, `README.md`, `report.md`, `comparison.md`, `changes.md`, `teaching-notes.md`, `blog-ready.md`, `linked-post.md`, `changed-files.txt`, `screenshot-manifest.md`, `screenshots/before/`, `screenshots/after/`, `data/`, `patch.diff`
- update `SERIES_INDEX.md`

## Implementation Changes

### 1. Simplify the creation screen to one primary job
Keep the screen focused on:
- name
- race
- class
- stat allocation
- clear start CTA

Do not redesign the flow into multiple screens. Keep the current single-screen creation flow, but remove or demote secondary context so the surface reads faster.

### 2. Remove low-priority content from the default view
Demote both of the currently noisy secondary blocks:
- `Run Notes`
- the large `Town Persistence` / contract / mastery / starting-bonuses block inside the preview

Replace them with a compact secondary reveal inside the right-side preview area:
- a collapsed section labeled `Legacy & Contracts`
- default state: collapsed
- contents when expanded:
  - active contract status
  - recommended contract
  - mastery summary
  - starting bonuses summary

Use an inline disclosure pattern that stays inside the creation screen. Do not open a new modal.

### 3. Tighten the preview panel
Keep the preview, but make it shorter and more decision-relevant.

Default preview content:
- adventurer identity block
- a reduced stat summary only for the most decision-relevant values:
  - HP
  - Mana
  - Attack
  - Armor
  - Carry
- one short race/class summary line

Remove the long full stat grid from the default preview.

### 4. Make race and class choices more compact
Keep card-based selection, but reduce their vertical weight:
- shorten visible copy to one concise line
- keep the card art
- keep one compact identity tag if it helps scanning
- reduce padding and spacing so more of the screen fits on mobile without feeling cramped

Do not convert them to chips or tiny list rows. The user chose compact cards, not ultra-compact rows.

### 5. De-emphasize or relocate the creation-screen audio block
Since the step is optimizing for fast start and low noise:
- remove the `Title Theme` banner from the main creation layout
- keep music control available through the existing title screen entry
- do not add a second audio surface inside creation

This is the safest way to reduce clutter without removing the feature entirely.

## Files and Surfaces

Primary code touch points:
- [index.html](/Users/pzgam/Desktop/castleofthewinds/index.html)
- [src/features/creation.js](/Users/pzgam/Desktop/castleofthewinds/src/features/creation.js)
- [styles.css](/Users/pzgam/Desktop/castleofthewinds/styles.css)

Artifact step:
- `artifacts/menu-redesign-series/step-09-new-game-screen-simplification/`

Screenshots to capture in mobile and desktop:
- title to creation transition
- creation default state
- creation with a race change
- creation with a class change
- creation with `Legacy & Contracts` expanded
- CTA area / bottom-of-screen readability

## Test Plan

### Runtime evidence
Use Playwright to capture before/after in:
- `430x932`
- `1440x1200`

### Acceptance criteria
- The creation screen reads as one primary surface instead of a dense mixed-purpose dashboard.
- The default view shows only high-value character-creation information.
- `Run Notes` is no longer visible in the main default layout.
- contract/mastery/start-bonus context is no longer always expanded by default.
- race/class cards remain visually rich enough to scan, but noticeably lighter and shorter.
- the `Begin Adventure` action remains obvious and easy to reach on mobile.
- keyboard/controller focus order remains stable.
- no creation functionality is removed.

## Assumptions and Defaults

- This is **Step 09** in the menu redesign series.
- Scope stays at **small polish**, not a multi-screen flow rewrite.
- The creation flow remains a single modal/sheet.
- The design language stays within the current dark-fantasy UI rather than introducing a new art direction.
- The right answer for minimalism here is **less simultaneous context**, not more tutorial text.
