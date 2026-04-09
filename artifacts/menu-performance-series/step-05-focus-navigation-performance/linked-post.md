# Linked Post Copy

Step 05 focused on the custom menu focus/navigation system rather than rendering.

What changed:

- cached focusable elements and focus-key lookup
- rebuilt the cache once during metadata application instead of rescanning on first focus
- scoped modal navigation metadata to the active surface
- removed a duplicate scroll-host helper

Measured wins:

- town menu open: `18.2ms -> 7.2ms`
- settings open: `11.6ms -> 5.7ms`
- provisioner open: `12.4ms -> 9.6ms`
- utility -> field guide focus lookup: `10.8ms -> 0.1ms`

Takeaway: the menus are not just faster in raw numbers on several open paths, they are also less fragile because focus now lands from a prepared navigation model instead of a fresh root-wide scan.
