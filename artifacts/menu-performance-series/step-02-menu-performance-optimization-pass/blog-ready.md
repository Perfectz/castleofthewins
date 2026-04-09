# We Cut the Biggest Menu Delays in a Phone-First Roguelike

I ran a second performance pass on the menu stack for the browser version of Castle of the Winds, using the same phone-sized Playwright collector as the baseline. The first result was clear: the most painful delays were not ordinary modal opens, they were game-state transitions such as starting a run and descending stairs.

That shaped the work. I staged `Begin Adventure`, moved autosave off the critical path, switched dungeon generation to lazy depth creation, and split stair transitions into an immediate feedback phase and a deferred finalization phase. Those changes cut `Begin Adventure` from `185.2ms` to `56.9ms`, and the first dungeon descent from `660.8ms` to `148.5ms`.

The menu stack also improved, but in a more nuanced way. The utility menu in town dropped from `33.5ms` to `9.2ms` by opening immediately and hydrating secondary summaries after first paint. Pack filter switching tightened from `14.1ms` to `12.6ms`. The `Field Guide -> Pack` tab switch improved from `66.0ms` to `40.7ms`, which is meaningful but still not good enough for a phone-first game.

The remaining lesson is important: once the obvious synchronous work is gone, the lag that remains is often browser work, not JavaScript work. In the latest trace, the heavy hub-tab switches no longer show large pack-generation time on click. The cost has shifted into modal subtree visibility, layout, and settle behavior.

That means the next pass is not “rewrite more logic and hope.” It is a trace-driven pass against the hub panes themselves: layout, style recalculation, paint, sticky subpanels, and hidden-pane strategies. The broad optimization pass paid off. Now the remaining work needs narrower evidence.
