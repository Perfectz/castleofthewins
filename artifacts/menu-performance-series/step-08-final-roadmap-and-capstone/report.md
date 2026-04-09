# Final Capstone Report

## Top menu bottlenecks

1. `Field Guide -> Pack` remains the heaviest pure menu handoff.
   Across the series it improved materially, but it still spends too much time in first-time pack-pane construction and browser-side settle work.
2. Hub settle behavior is still noisier than hub first response.
   `Magic -> Journal`, `Journal -> Pack`, and some pack interactions are now much less dominated by JavaScript, which means browser layout, paint, and visual effects matter more than they did at baseline.
3. Dense long-form panes still read heavier than their raw cost.
   `Chronicle`, `Magic`, and shop sell panels are not always slow in handler time, but they still carry enough information density that small visual delays are easier for the player to feel.

## Top menu QoL wins

1. Menus now answer sooner where the player is already looking.
   The series added local modal feedback for blocked actions and stronger selected-state cues in dense screens.
2. Focus and navigation are more reliable.
   The navigation cache and narrower metadata passes removed a fragile layer that was quietly adding open cost and restoring focus inconsistently.
3. Utility, startup, and town-service menus are noticeably less heavy.
   These are the places where players repeatedly judge the game's responsiveness, and the series made those moments much more trustworthy.

## What was fixed

- Step 02 removed the largest real stalls by staging `Begin Adventure`, stair transitions, utility hydration, and autosave work.
- Step 03 narrowed live DOM updates for journal, magic, and shop paths.
- Step 04 improved interaction trust with local feedback and more immediate response cues.
- Step 05 removed repeated focus-tree scans and expensive focus-key lookup work.
- Step 06 targeted the worst hotspots: `Pack`, `Field Guide`, and `Provisioner`.
- Step 07 made dense screens read faster, even when that did not always improve raw throughput.
- Step 08 shipped one final low-risk polish change: removing the residual modal-open blur from the game layer while keeping dimming and saturation reduction.

## What remains

- First-time `Field Guide -> Pack` construction still deserves a dedicated trace.
- Hub settle behavior still needs browser-level evidence around style recalculation, layout, paint, and scroll/focus aftermath.
- `Magic` and `Chronicle` still feel dense because they are dense. The remaining work is more about staging and reading order than raw click-handler time.
- Bank and a few one-off service modals have not received the same depth of pass as the main hub and shop flows.

## Phase 1 next steps

1. Record a Chrome/DevTools trace for `utility -> journal -> pack -> magic -> journal`.
2. Mark hub pane visibility, focus restoration, and scroll restoration with explicit `performance.mark()` calls so layout/paint cost can be separated from app code.
3. Reduce first-open pack chrome on the `Field Guide -> Pack` path, especially any secondary detail that can arrive after first paint.
4. Recheck bank and any remaining service modals with the same phone-sized collector used throughout the series.

## Phase 2 future work

1. Split the remaining hub/menu coordinator logic in `src/game.js` into smaller surface-owned helpers.
2. Introduce a trace-driven budget for menu opens and tab switches so future UI work is measured against a fixed target.
3. If content volume grows, consider staged or virtualized rendering for the heaviest scroll regions, but only after browser traces prove it is necessary.
4. Consider a deeper visual simplification pass on `Magic` and `Chronicle` so those screens carry less cognitive weight per frame.

## Risks

- Browser-side containment strategies such as `content-visibility` or aggressive deferred hydration could disturb custom focus/navigation geometry if applied carelessly.
- Further pack simplification could damage some of the hard-won clarity from steps 06 and 07 if the screen loses too much context.
- The remaining work sits close to `src/game.js`, which is already a high-risk coordination surface.

## Validation plan

- Keep using the same phone-sized Playwright collectors so numbers stay comparable across steps.
- Treat `readyMs` and `settledMs` as separate metrics.
- For future hub work, require both runtime evidence and a browser trace before shipping another structural change.
- Continue running:
  - `npm run build`
  - `npm run test:rules`
  - `npm run playtest:harness`
- Keep reporting unrelated harness failures honestly rather than folding them into menu conclusions.
