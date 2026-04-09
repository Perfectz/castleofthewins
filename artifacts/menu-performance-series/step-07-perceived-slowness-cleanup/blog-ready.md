# Blog-Ready Summary

By step 07, the menu system had already been through several real performance passes. The remaining problem was different: some screens still *felt* slow even when the raw numbers were fine. This is where performance engineering overlaps with UI polish. A `5ms` interaction can still feel bad if the screen is visually dense, the selected state is subtle, or the UI answers a blocked action with weak feedback.

This pass targeted three feel issues. First, it lightened the modal-open background treatment so menus no longer arrived on top of a dramatically blurred game state. Second, it added compact quick-state strips to `Pack`, `Magic`, `Field Guide`, and `Provisioner`, so the player gets an immediate summary of the current section, filter, or selection without scanning the entire panel. Third, it styled the modal feedback banner so blocked or successful actions read as a real in-context response.

The important truth is that this was not a blanket speed win. Some opens got slightly slower because the new state strips add markup. But the UI is clearer and less “stuck” in the places that mattered most, especially on blocked interactions and dense hub screens. That is the real lesson: technical lag and UX lag are related, but they are not the same problem.
