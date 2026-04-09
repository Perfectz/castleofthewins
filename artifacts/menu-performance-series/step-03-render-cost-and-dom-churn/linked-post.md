# Step 03: Menu Render Cost And DOM Churn

This step focused on menu-only render waste in the live game: `Field Guide`, `Magic`, and town service modals. The implementation kept the existing menu shells mounted and reduced live DOM replacement to the regions that actually changed.

Measured result: `magic_select_identify` improved from `7.6ms` to `4.5ms`, and `utility_to_journal_open` improved from `15.6ms` to `13.3ms`. The targeted paths also showed lower live node churn, especially on magic selection and journal open.

Important caveat: some flows still had worse settle times even after the DOM scope narrowed. That points to browser-side layout and paint work as the next profiling target, not another round of blind UI rewrites.
