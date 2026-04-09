# Teaching Notes

This step is useful because it shows why performance work should not stop at timings.

If a menu action is already answering in `3ms` to `10ms`, the next useful question is not “how do I get this to `2ms`?” It is “does the player immediately understand what just happened?”

A good perceived-performance prompt should ask for:
- before and after screenshots
- measured timings
- explicit separation of real bottlenecks from UX bottlenecks
- blocked-state and selected-state behavior
- visual density and transition treatment

What worked well here:
- the changes were small and visible
- the reporting stayed honest about regressions
- the result is teachable: some paths got slower on paper while still becoming easier to trust

What to avoid:
- claiming a UX cleanup is a raw performance win when the numbers do not support that
- dismissing perceived slowness just because handlers are fast
- adding flashy transitions to “feel better” if they actually delay visible confirmation
