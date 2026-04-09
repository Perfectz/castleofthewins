# Baseline Menu Performance Audit for a Phone-First Roguelike

Before changing anything, I wanted a hard baseline for how the game’s menu system actually behaves on a phone-sized viewport. The assumption going in was familiar: menus felt heavy, modal flows felt more expensive than they should, and the likely causes seemed to be a mix of DOM churn, over-eager rerenders, and coordinator code doing too much at once.

So I launched the live game with Playwright, exercised the main menu and modal paths, and added runtime-only timing probes in the browser. The audit covered title, creation, utility menu, journal, pack, magic, settings, a town bank modal, and a reward-like spell-study screen. For each flow I captured click-to-visible-response time, two-frame settle time, DOM size, screenshots, and a small breakdown of which menu methods did the work.

The good news is that the menu stack is not uniformly slow. Most modal opens landed in a `7-33ms` band, which is not catastrophic for a JavaScript-heavy browser game. `Pack` from the action bar opened in `13.6ms`. `Settings` opened in `17.0ms`. Even the reward screen shell opened in `9.0ms`.

The bad news is that the menu system still feels heavier than those numbers suggest, and the audit makes it clear why. The hub surfaces are implemented as repeated full modal rebuilds. Switching from `Field Guide` to `Pack` was the worst real menu path at `66.0ms`, with a matching long task and a modal subtree that grew to `335` nodes and `37` buttons. That is not a one-off animation problem. It is structural churn.

Code inspection backed that up. `showHubModal()` rebuilds the full hub title, tabs, and body. `showSimpleModal()` clears `modalRoot`, assigns fresh markup, and reapplies focus/navigation metadata. `pack-filter`, `journal-section`, and parts of the magic flow route right back through those same rebuild paths. On top of that, `applyControllerNavigationMetadata()` scans wide portions of the active UI every time a new surface is built.

The other important finding is that the biggest “this button felt slow” moments were not menu-shell problems at all. `Begin Adventure` took `185.2ms`, and descending into the dungeon took `660.8ms`. Those are gameplay-state transitions, not ordinary menu opens. Without a baseline it would be easy to blame the wrong subsystem.

So the baseline conclusion is precise: ordinary menu handlers are usually moderate, not disastrous, but the hub architecture still creates enough rebuild work and multi-frame settling to feel heavy. The first optimization pass should target hub transitions, especially `Field Guide -> Pack`, not random modal polish and not speculative micro-optimizations.
