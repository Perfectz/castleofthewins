# Metrics

## Menu and Modal Flows

| Flow | Trigger type | Visible response | Settled | Modal nodes | Buttons | Long tasks | Notes |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| `Learn Basics` open | Click | `29.4ms` | `31.3ms` | `25` | `1` | `0` | Small modal, still full-shell rebuild. |
| `Learn Basics` close | Click | `6.1ms` | `28.4ms` | `21` | `4` | `0` | Quick close, modest settle. |
| `Title -> Create Adventurer` | Click | `30.1ms` | `36.3ms` | `104` | `17` | `0` | Dense first-screen build. |
| `Adventure Menu` open in town | Click | `33.5ms` | `36.4ms` | `70` | `13` | `0` | Slowest top-level menu open. |
| `Adventure Menu -> Settings` | Click | `17.0ms` | `42.3ms` | `48` | `8` | `0` | Cheap shell, slower visual settle. |
| `Settings -> Menu` | Click | `17.6ms` | `37.9ms` | `70` | `13` | `0` | Close is really a modal swap back to utility. |
| `Adventure Menu -> Field Guide` | Click | `19.2ms` | `62.6ms` | `49` | `8` | `0` | Fast response, noticeably slower settle. |
| `Field Guide section -> Rules` | Click | `8.8ms` | `42.5ms` | `56` | `8` | `0` | Section switch is cheap. |
| `Field Guide -> Pack` | Click | `66.0ms` | `78.1ms` | `335` | `37` | `1` | Worst real menu flow. |
| `Pack filter -> Use` | Click | `14.1ms` | `49.7ms` | `279` | `33` | `0` | Rebuilds full pack shell for a filter change. |
| `Pack -> Magic` | Click | `15.2ms` | `65.8ms` | `145` | `35` | `0` | Fast open, long visual settle. |
| `Magic -> Field Guide` | Click | `7.3ms` | `74.0ms` | `56` | `8` | `0` | Fastest response, one of the slowest settles. |
| `Field Guide` close | Click | `1.9ms` | `69.1ms` | `0` | `0` | `0` | Handler is cheap; perceived heaviness is after the click. |
| `Pack` open from action bar | Click | `13.6ms` | `27.8ms` | `279` | `33` | `0` | Direct pack open is acceptable. |
| `Pack` close | Click | `2.0ms` | `72.2ms` | `0` | `0` | `0` | Same close/settle mismatch as journal. |
| `Bank` open | Direct runtime call | `17.9ms` | `21.7ms` | `219` | `19` | `0` | Representative town-service modal. |
| `Bank` close | Click | `2.5ms` | `38.5ms` | `0` | `0` | `0` | Lighter settle than pack/journal. |
| `Adventure Menu` open in dungeon | Click | `15.1ms` | `23.7ms` | `70` | `13` | `0` | Roughly half the town open cost. |
| `Adventure Menu` close in dungeon | Click | `2.0ms` | `45.5ms` | `0` | `0` | `0` | Actual close is cheap. |
| `Spell Study` open | Direct runtime call | `9.0ms` | `29.5ms` | `44` | `8` | `0` | Reward shell itself is light. |

## Contextual Button-Press Costs That Are Not Menu Chrome

| Flow | Trigger type | Visible response | Settled | Long tasks | Notes |
| --- | --- | ---: | ---: | ---: | --- |
| `Create Adventurer -> Town Start` | Click | `185.2ms` | `252.4ms` | `1` | User experiences this through a modal CTA, but most cost is run startup/render work. |
| `Town -> Dungeon` | Direct runtime call | `660.8ms` | `685.2ms` | `1` | Large gameplay-state transition, not ordinary menu work. |

## Method-Level Highlights

| Flow | Dominant method cost |
| --- | --- |
| `Learn Basics` open | `showHelpModal: 24.4ms` |
| `Title -> Create Adventurer` | `refreshChrome: 25.8ms` |
| `Adventure Menu` open in town | `showUtilityMenu: 33.1ms` |
| `Adventure Menu -> Field Guide` | `showHubModal: 18.7ms`, `showSimpleModal: 14.0ms`, `getJournalHubMarkup: 3.4ms` |
| `Field Guide -> Pack` | `showHubModal: 65.5ms`, `showSimpleModal: 50.2ms`, `getPackHubMarkup: 14.5ms` |
| `Pack filter -> Use` | `showHubModal: 12.8ms`, `showSimpleModal: 11.2ms`, `getPackHubMarkup: 1.0ms` |
| `Pack -> Magic` | `showHubModal: 14.9ms`, `showSimpleModal: 13.1ms`, `getMagicHubMarkup: 1.2ms` |
| `Bank` open | `showBankModal: 17.7ms`, `showSimpleModal: 14.4ms` |
