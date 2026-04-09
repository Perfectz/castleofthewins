# Flow Comparison

## Worst Real Menu Offenders

| Rank | Flow | Visible response | Settled | Modal size | Why it matters |
| --- | --- | ---: | ---: | ---: | --- |
| 1 | `Field Guide -> Pack` | `66.0ms` | `78.1ms` | `335` nodes / `37` buttons | Worst real menu transition; packs the biggest DOM and triggered a long task. |
| 2 | `Adventure Menu` open in town | `33.5ms` | `36.4ms` | `70` nodes / `13` buttons | Slowest top-level menu open; likely inflated by synchronous summary assembly. |
| 3 | `Title -> Create Adventurer` | `30.1ms` | `36.3ms` | `104` nodes / `17` buttons | First big fullscreen handoff; feels heavy because it builds a dense surface immediately. |
| 4 | `Learn Basics` open | `29.4ms` | `31.3ms` | `25` nodes / `1` button | Smaller DOM, but still a full modal rebuild. |
| 5 | `Adventure Menu -> Field Guide` | `19.2ms` | `62.6ms` | `49` nodes / `8` buttons | Fast handler, but visually settles much later than the button response. |

## Fastest Real Menu Opens

| Flow | Visible response | Notes |
| --- | ---: | --- |
| `Magic -> Journal` | `7.3ms` | Handler is quick, but settle still stretched to `74.0ms`. |
| `Spell Study` open | `9.0ms` | Reward shell itself is not heavy. |
| `Field Guide section switch` | `8.8ms` | Section-level content is cheap relative to pack. |
| `Pack` open from action bar | `13.6ms` | Pack shell is acceptable when opened directly. |
| `Pack filter -> Use` | `14.1ms` | Filter update still rebuilds the modal, but the list size in this run stayed manageable. |

## Close Flows

| Flow | Visible response | Settled | Read |
| --- | ---: | ---: | --- |
| `Pack` close | `2.0ms` | `72.2ms` | Cheap handler, heavy-feeling settle. |
| `Journal` close | `1.9ms` | `69.1ms` | Same pattern: actual close is fast, visual stabilization is not. |
| `Bank` close | `2.5ms` | `38.5ms` | Lighter than pack/journal because less content is involved. |
| `Settings` close back to utility | `17.6ms` | `37.9ms` | More expensive because close immediately reopens another modal. |

## Town vs Dungeon Utility Menu

| Flow | Visible response | Difference |
| --- | ---: | --- |
| `Adventure Menu` open in town | `33.5ms` | Includes town/save/meta summary work. |
| `Adventure Menu` open in dungeon | `15.1ms` | Roughly half the town cost. |

Takeaway:

- The same modal shell is materially heavier in town, which supports the code read that utility summary generation is front-loaded into open time.

## Menu Cost vs Non-Menu Cost

| Flow | Visible response | Classification |
| --- | ---: | --- |
| `Begin Adventure` | `185.2ms` | Not a menu-shell problem; startup/world state work dominates. |
| `Descend to Dungeon` | `660.8ms` | World transition, not menu chrome. |
| `Field Guide -> Pack` | `66.0ms` | Actual menu-shell problem. |

Bottom line:

- If the goal is “make menus feel snappier,” the first engineering target should be hub rebuild behavior.
- If the goal is “reduce the biggest wait after button press,” world/startup transitions need their own pass.
