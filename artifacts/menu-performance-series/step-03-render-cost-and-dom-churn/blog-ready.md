# We Reduced Menu DOM Churn Without Pretending Every Flow Got Faster

In this pass on `castleofthewinds`, the target was not broad “UI polish.” It was specific menu render waste: journal section switches, magic-book interactions, and town service panel toggles that were replacing more live DOM than the player’s action justified.

The repo already had a baseline Playwright collector from earlier steps, so the work stayed measurable. I reran the same phone-sized collector, isolated the high-cost menu paths, and then changed the runtime so those paths reuse mounted menu shells and patch only the live regions that actually changed.

Three focused improvements landed:

- `Field Guide` section switches now keep the shell mounted and replace only the active section content.
- `Magic` selection now updates the affected spell cards in place instead of rebuilding the live pane for a simple selection change.
- `Provisioner` buy/sell switches now keep the modal mounted and replace only the panel body.

The result is honest rather than magical. The clearest win was `magic_select_identify`, where ready time improved from `7.6ms` to `4.5ms` and live node churn dropped from `4 added / 4 removed` to `2 added / 2 removed`. `utility_to_journal_open` also got slightly faster and touched fewer live nodes.

But not every graph moved in the right direction. Journal section switches and shop panel switches now do less live DOM work, yet their settle times were mixed in this run. That means the next bottleneck is probably not “too much JavaScript string building.” It is more likely browser-side work after the patch: style recalculation, layout, paint, or focus/scroll side effects.

That is a useful result. Reducing unnecessary render scope is still worthwhile, but the next optimization step should be a trace pass, not another blind refactor.
