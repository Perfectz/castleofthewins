# Menu Redesign Series

## Step 00: Baseline Menu Atlas

- Folder path: `artifacts/menu-redesign-series/step-00-baseline-menu-atlas/`
- Three-sentence summary: This step establishes a visual baseline of the current menu and modal system using live Playwright captures instead of code-only reasoning. The atlas covers title, creation, town services, first dungeon HUD, utility surfaces, progression overlays, and the death recap in both mobile and desktop viewports. The after-side artifacts reorganize those raw captures into study boards so later redesign work can compare against a fixed, publication-ready reference.
- Main artifacts created: `README.md`, `report.md`, `comparison.md`, `changes.md`, `teaching-notes.md`, `blog-ready.md`, `linked-post.md`, `screenshot-manifest.md`, `changed-files.txt`, `patch.diff`, `screenshots/before/*`, `screenshots/after/*`, `data/capture-results.json`
- Key screenshots: `screenshots/before/mobile-04-town.png`, `screenshots/before/mobile-12-dungeon-hud.png`, `screenshots/before/mobile-13-run-menu.png`, `screenshots/before/mobile-14-pack.png`, `screenshots/before/mobile-21-level-up.png`, `screenshots/after/mobile-baseline-atlas-board.png`, `screenshots/after/mobile-hud-callout-board.png`
- What this step proved: The current UI already has a coherent visual language, but critical information is distributed across enough surfaces that navigation and readability need deliberate redesign, especially on phone-sized screens. It also proved that a reproducible screenshot baseline can be generated from live runtime states without modifying production code.
- What the next step should investigate: Consolidate the information architecture around HUD, ticker, advisor, journal, briefing, and utility surfaces. Test whether town services and in-run system menus should share fewer patterns or clearer role distinctions.

## Step 01: UI Discovery Brief

- Folder path: `artifacts/menu-redesign-series/step-01-ui-discovery-brief/`
- Three-sentence summary: This step turns the baseline atlas into a product-oriented discovery brief that defines what the menu system must do for first-time players, returning players, and expert optimizers. It pairs that analysis with a small visible shipment: clearer title-screen CTA copy and clearer naming across the in-run system menu and support surfaces. The result is a sharper mental model without changing core flow structure or adding heavy implementation risk.
- Main changes: title CTA relabeling for onboarding and resume clarity, `Adventure Menu` naming plus orientation copy and clearer action labels, and role-forward titles for `Run Journal`, `How to Play`, `Device Settings`, and `Mission Briefing`
- Key screenshots: `screenshots/before/before-mobile-01-title.png`, `screenshots/after/after-mobile-01-title.png`, `screenshots/before/before-desktop-04-run-menu.png`, `screenshots/after/after-desktop-04-run-menu.png`, `screenshots/after/after-mobile-07-journal.png`, `screenshots/after/after-mobile-08-help.png`, `screenshots/after/after-mobile-09-settings.png`
- What this step proved: Small naming and microcopy changes can improve menu comprehension immediately, especially where one surface is carrying several adjacent jobs. It also proved that pairing discovery with a tiny shipment creates better evidence than analysis alone, because the design principles are tested in the live product right away.
- What should happen next: Rework the boundary between persistent HUD information and modal support surfaces, with special attention to the overlap among advisor, ticker, briefing, and journal. Explore whether reward and progression screens need a stronger visual identity than ordinary utility sheets.

## Step 03: Usability Simulation

- Folder path: `artifacts/menu-redesign-series/step-03-usability-simulation/`
- Three-sentence summary: This step simulates likely usability findings across five player types using live mobile and desktop captures of the existing UI. Instead of adding more help text, it ships two low-risk fixes that honor a minimalist philosophy: clearer first-town intent through `Services` and `North Road`, and a cleaner `Adventure Menu` grouped into `Run`, `Saves`, and `System`. The result is better comprehension through naming and hierarchy rather than tutorial overlays.
- Main changes: first-town chip and dock relabeling for clearer town purpose and first descent handoff, removal of the utility-menu intro sentence, grouped `Adventure Menu` action sections, and visual de-emphasis of `Export Trace`
- Key screenshots: `screenshots/before/before-mobile-03-town.png`, `screenshots/after/after-mobile-03-town.png`, `screenshots/before/before-desktop-05-run-menu.png`, `screenshots/after/after-desktop-05-run-menu.png`, `screenshots/after/after-mobile-04-dungeon-hud.png`, `screenshots/after/after-mobile-06-pack.png`
- What this step proved: The biggest confusion points did not require more instructional UI. Small wording and hierarchy fixes can reduce hesitation while keeping the board and support surfaces visually spare.
- What should happen next: Investigate whether town affordances themselves should communicate service value more directly, and decide whether the next redesign step should target modal churn, journal and mission overlap, or town-to-dungeon continuity.

## Step 04: Design Critique

- Folder path: `artifacts/menu-redesign-series/step-04-design-critique/`
- Three-sentence summary: This step runs a structured design critique against the live menu system using a panel of product, game UI, research, accessibility, systems, and front-end perspectives. The critique found that the `Adventure Menu` still opened on summary instead of action on phone, and that `How to Play` still read like a text block instead of a reference surface. The shipment fixes both by re-ranking the menu around action priority and rebuilding help into a clearer hierarchy.
- Main changes: action-first `Adventure Menu` ordering, stronger visual priority for `Return to Run`, quieter save emphasis, stronger section separation for grouped utility actions, and a scanable `How to Play` layout with `Core Loop`, `Controls`, and `Dungeon Rules`
- Key screenshots: `screenshots/before/before-mobile-04-run-menu.png`, `screenshots/after/after-mobile-04-run-menu.png`, `screenshots/before/before-desktop-04-run-menu.png`, `screenshots/after/after-desktop-04-run-menu.png`, `screenshots/before/before-mobile-08-help.png`, `screenshots/after/after-mobile-08-help.png`
- What this step proved: Design critique is most useful when it identifies hierarchy failures that can be corrected immediately with low-risk UI movement. It also proved that DOM order and focus behavior are part of readability on phone-sized interfaces, not just engineering implementation details.
- What should happen next: Critique the remaining support surfaces for modal density, especially `Run Journal`, town-service screens, and longer return or reward summaries. Test whether future steps should reduce modal count, introduce progressive disclosure inside support panels, or further separate action surfaces from archive surfaces.

## Step 05: Responsiveness Review

- Folder path: `artifacts/menu-redesign-series/step-05-responsiveness-review/`
- Three-sentence summary: This step reviews the live menu system for perceived responsiveness rather than raw latency, using Playwright evidence from interaction-heavy flows in both phone and desktop viewports. The review found the main confidence gaps in focus visibility, dense selected-state contrast, blocked-state clarity, and a small spell-handoff delay. The shipment answers those findings with stronger `:focus-visible` treatment, stronger active-card emphasis, clearer disabled styling, and instant tray-to-targeting handoff.
- Main changes: unified keyboard and controller-visible focus styling across dense controls, stronger active-state contrast in pack, magic, tray, reward, tabs, and chips, clearer blocked disabled states, and removal of the `120ms` deferred spell refresh
- Key screenshots: `screenshots/before/before-mobile-01-run-menu.png`, `screenshots/after/after-mobile-01-run-menu.png`, `screenshots/before/before-mobile-03-magic.png`, `screenshots/after/after-mobile-03-magic.png`, `screenshots/before/before-mobile-07-blocked-state.png`, `screenshots/after/after-mobile-07-blocked-state.png`, `screenshots/before/before-desktop-06-reward-choice.png`, `screenshots/after/after-desktop-06-reward-choice.png`
- What this step proved: In a turn-based menu system, responsiveness is mostly a clarity problem. Stronger focus, selection, and blocked-state signals can make the UI feel faster and more trustworthy without adding any extra instructional text.
- What should happen next: Audit confirm and cancel hierarchy across town-service screens, reward recaps, and longer journal views. Then test whether modal pacing itself still feels heavy once the confidence signals are stronger.

## Step 06: Technical Feasibility Review

- Folder path: `artifacts/menu-redesign-series/step-06-technical-feasibility/`
- Three-sentence summary: This step reviews the menu system through an engineering lens and ties observed friction to the actual modal and focus coordinator code in `src/game.js`. Live Playwright evidence showed that read-only surfaces launched from `Adventure Menu` behaved like dead-end modals and that closing the menu dropped focus to `BODY`. The shipment fixes both with a scoped utility-menu return context, contextual `Back to Menu` close labeling, and restored focus on the gameplay `Menu` control.
- Main changes: scoped one-level return flow for utility-launched read-only surfaces, contextual close-label handling in the shared modal shell, keyboard-parity focus restoration on menu close, and stale modal-focus cleanup
- Key screenshots: `screenshots/before/before-mobile-02-help-from-menu.png`, `screenshots/after/after-mobile-02-help-from-menu.png`, `screenshots/before/before-mobile-05-menu-close-focus.png`, `screenshots/after/after-mobile-05-menu-close-focus.png`, `screenshots/before/before-desktop-04-briefing-from-menu.png`, `screenshots/after/after-desktop-04-briefing-from-menu.png`
- What this step proved: Some UI friction is better solved by tightening coordinator seams than by redrawing surfaces. It also proved that a small, explicitly scoped engineering change can improve the live UI while avoiding the high-risk areas of the modal stack.
- What should happen next: Move more modal behavior behind shared helpers before attempting broader stack cleanup, and add dedicated regression coverage around save/load, shops, town services, and progression flows before touching their transitions.

## Step 07: Menu Architecture Redesign

- Folder path: `artifacts/menu-redesign-series/step-07-menu-architecture-redesign/`
- Three-sentence summary: This step shifts from local menu fixes to a systems-level support-surface redesign grounded in live runtime evidence. The review found that `Mission Briefing`, `Run Journal`, and `How to Play` were three overlapping support destinations competing for the same mental-model slot. The shipped prototype replaces that split with a unified `Field Guide` architecture that deep-links to `Current`, `Mission`, `Guide`, and `Chronicle`.
- Main changes: `Adventure Menu` support-entry relabeling and rerouting, conversion of `Run Journal` into `Field Guide`, internal section chips for current-run context, mission reference, rules/help, and chronicle/archive content, and consolidation of mission/help flows into the shared support surface
- Key screenshots: `screenshots/before/before-mobile-01-run-menu.png`, `screenshots/after/after-mobile-01-run-menu.png`, `screenshots/before/before-mobile-03-mission-flow.png`, `screenshots/after/after-mobile-03-mission-flow.png`, `screenshots/before/before-mobile-04-guide-flow.png`, `screenshots/after/after-mobile-04-guide-flow.png`, `screenshots/after/after-desktop-02-journal-current.png`
- What this step proved: The next meaningful UX gains come from changing how support information is partitioned, not just how existing modals are labeled. It also proved that a medium-scope architecture prototype can visibly reduce menu fragmentation without forcing more text into the HUD or touching high-risk transactional flows.
- What should happen next: Evaluate whether town services and reward-choice flows should adopt the same split of quick decision surfaces versus deep reference surfaces. Then decide whether more current-run context should move out of support modals and closer to live tactical play.

## Step 08: Executive Roadmap and Final Pass

- Folder path: `artifacts/menu-redesign-series/step-08-executive-roadmap-and-final-pass/`
- Three-sentence summary: This capstone step reviews the full redesign series as one body of evidence and converts it into an approval, defer, reject, and risk roadmap. It keeps the highest-confidence wins from earlier steps, rejects scope explosion, and ships one final tiny polish that resolves the naming overlap between `Field Guide` and the old `Guide` label. The result is a cleaner Phase 1 decision set plus a blog-ready final summary for the whole series.
- Main changes: executive review of recurring truths and contradictions, Phase 1 and Phase 2 roadmap decisions, creation of `FINAL_SUMMARY.md`, and final terminology polish from `Guide` to `Rules` for the rules/help slice inside the `Field Guide` architecture
- Key screenshots: `screenshots/before/before-mobile-01-run-menu.png`, `screenshots/after/after-mobile-01-run-menu.png`, `screenshots/before/before-mobile-02-rules-flow.png`, `screenshots/after/after-mobile-02-rules-flow.png`, `screenshots/before/before-desktop-01-run-menu.png`, `screenshots/after/after-desktop-01-run-menu.png`
- What this step proved: A redesign series becomes much more useful when it ends with decisions instead of drift. It also proved that a capstone can still ship a justified tiny fix, as long as that fix resolves a real contradiction instead of reopening scope.
- What should happen next: Lock the approved Phase 1 work, add regression checks around `Field Guide` and menu focus behavior, and validate the deferred Phase 2 bets on town services, reward-flow weight, and support-surface depth before making larger structural moves.
