# Fixing the Part of Menu Performance That Wasn’t Rendering

The interesting result in this step was that some menus were paying their cost before the player even changed content. The slowness was in navigation setup: scanning for focusable elements, rebuilding focus metadata, and restoring focus after a modal swap.

The clearest example was the town utility menu. Before the change, menu open spent `13.1ms` just rebuilding the focusable list. After adding a navigation cache and rebuilding it once during metadata setup, the same menu dropped from `18.2ms` to `7.2ms`.

The other big fix was focus-key lookup. Switching from the utility menu into `Field Guide` had been spending `10.8ms` finding the preferred focus target. After caching focus keys, that lookup fell to about `0.1ms`.

This was not a full solution for every heavy menu transition. Some hub paths are still noisy. But the focus system itself is now lighter and less fragile, which matters because navigation is the first thing the player feels when a menu opens.
