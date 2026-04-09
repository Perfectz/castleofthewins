# Before Vs After Comparison

## Biggest wins

- `Town menu open`: `18.2ms -> 7.2ms`
- `Settings open`: `11.6ms -> 5.7ms`
- `Provisioner open`: `12.4ms -> 9.6ms`
- `Pack -> Magic`: `15.0ms -> 12.8ms`
- `Magic filter switch`: `7.2ms -> 5.5ms`

## Navigation-specific wins

- `getUiNavigableElements` dropped from `13.1ms -> 0ms` on `Town menu open`
- `getUiNavigableElements` dropped from `7.8ms -> 0ms` on `Provisioner open`
- `getUiNavigableElements` dropped from `4.0ms -> 0ms` on `Settings open`
- `findUiElementByFocusKey` dropped from `10.8ms -> 0.1ms` on `Menu -> Field Guide`

## Mixed or regressed paths

- `Field Guide -> Chronicle` got slightly slower on first response (`14.1ms -> 17.4ms`) but settled faster overall
- `Field Guide -> Pack` stayed roughly flat on ready time (`38.8ms -> 39.8ms`)
- `Provisioner -> Sell` got slightly slower on ready time (`5.9ms -> 6.6ms`)

## Comparison takeaway

The focus-system work clearly removed the repeated lookup cost that was polluting menu open and focus restore. It did not solve every hub-settle issue, but it made the navigation layer cheaper and more predictable, especially on the menus that previously paid the highest setup cost.
