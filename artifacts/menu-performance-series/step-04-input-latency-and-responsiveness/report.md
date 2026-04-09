# Input Latency And Responsiveness Report

## Interaction paths tested

The Playwright pass covered interaction-heavy menu flows on a `393x852` phone viewport:

- title to creation
- creation to town start
- town utility menu open
- utility to `Field Guide`
- `Field Guide` section switch to `Chronicle`
- `Field Guide` to `Pack`
- pack focus placement and focus movement
- pack selection change
- `Pack` to `Magic`
- magic spell selection and filter switch
- modal close from magic
- `Provisioner` open, panel switch, and close
- `Sage` open and blocked identify attempt

## Where the UI feels slow and why

The clearest problem was not raw handler latency. Most menu interactions already responded in the `1ms` to `16ms` range. The UI felt slow in three more specific ways:

1. Blocked or successful actions inside a modal often only wrote to the run log, not the active surface.
2. Focus movement and confirm actions did not always get an obvious local acknowledgment before the next state settled.
3. Some tab and panel switches still carry enough follow-up layout or scroll behavior that they feel heavier than their first response time suggests.

## Actual latency vs perceived latency

The strongest actual-vs-perceived example was the `Sage` low-gold flow:

- Before: blocked identify was already effectively immediate at `0.8ms`, but the visible modal state barely changed.
- After: blocked identify is still `0.8ms`, but the modal now shows `The sage will not work for free.` immediately inside the active surface.

Pack navigation shows the other side of the split:

- `Pack focus first item` and `Pack focus move down` still move focus in about `1.0ms` to `2.9ms`.
- That means the input path itself is not slow.
- The remaining heaviness is browser-side settle and perceived confidence, not a slow command handler.

## What was changed

1. `src/game.js`: added modal-local feedback plumbing so `good`, `warning`, and `bad` log messages surface inside the active modal.
2. `src/game.js`: added immediate acknowledgment hooks for pointer press, keyboard/controller confirm, and focus-navigation interactions.
3. `src/game.js`: replaced generic modal `scrollIntoView()` focus behavior with a visibility check against the nearest scroll host so focus moves only scroll when necessary.
4. `styles.css`: added the visual treatment for the modal feedback banner.
5. `artifacts/menu-performance-series/step-04-input-latency-and-responsiveness/data/*.mjs`: extended the collector to track focus timing, local feedback visibility, and interaction acknowledgment hooks.

## Why these changes improve responsiveness

These changes improve responsiveness because they reduce ambiguity at the moment of interaction:

- blocked and success states now answer inside the surface the player is using
- confirm and navigation actions get immediate acknowledgment even when the next UI state is subtle
- focus motion no longer blindly scrolls the modal when the target is already visible

In human terms, the menus now explain themselves faster. Even where raw timing barely changed, the UI is less likely to feel like it ignored the player.

## Remaining interaction pain points

This was not a universal timing win. The raw collector still shows regressions on some hub paths:

- `Field Guide -> Pack`: `22.2ms` to `33.3ms`
- `Magic filter switch`: `4.5ms` to `7.7ms`
- `Provisioner open`: `7.6ms` to `15.7ms`

Those regressions are small in absolute terms but real. The next step should trace:

- `Field Guide -> Pack`
- `Pack -> Magic`
- `Magic filter switch`
- `Provisioner -> Sell`

The likely remaining issue is browser-side settle around focus restoration, pane activation, and tab-switch aftermath rather than obviously slow business logic.
