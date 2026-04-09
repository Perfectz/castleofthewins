# Flow Comparison

## Best evidence of improvement

- `magic_select_identify`: ready `7.6ms -> 4.5ms`, live node churn `4/4 -> 2/2`. This is the cleanest proof that narrower live updates helped.
- `utility_to_journal_open`: ready `15.6ms -> 13.3ms`, live node churn `6 added / 4 removed -> 3 added / 3 removed`.
- `town_bank_open_direct`: settled `40.1ms -> 30.3ms`. This was not the target of the code change, but it was stable-improved in the same run set.

## Mixed results

- `journal_section_switch_chronicle`: ready `11.9ms -> 14.2ms`, but live churn narrowed from `4/4` to `3/3`.
- `journal_section_switch_guide`: ready `5.6ms -> 6.1ms`, live churn narrowed from `4/4` to `3/3`.
- `magic_filter_switch_next`: ready `4.5ms -> 6.4ms`, but live list work narrowed from `4/4` to `3 added / 11 removed` and the filter row is no longer rebuilt.
- `provisioner_panel_switch_sell`: ready stayed effectively flat at `7.5ms -> 7.5ms`, while the service shell now stays mounted.

## Worst remaining offenders in this run

- `journal_to_pack_tab_switch`: still the heaviest hub switch in this collector slice, with ready `36.5ms`.
- `journal_section_switch_*`: now structurally narrower, but still high in settle time.
- `provisioner_panel_switch_sell`: the DOM scope is smaller, but the browser still settles slowly.

## Bottom line

This step succeeded at reducing unnecessary live rendering scope. It did not produce a universal time win across all menu flows. The next step should not guess at more code churn reductions; it should trace browser work on the remaining mixed-result flows.
