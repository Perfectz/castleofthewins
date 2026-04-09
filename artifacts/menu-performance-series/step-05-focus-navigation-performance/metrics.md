# Focus Navigation Metrics

Navigation-specific columns focus on the costs this step targeted:

- `Nav query`: `getUiNavigableElements`
- `Focus lookup`: `findUiElementByFocusKey`
- `Metadata`: `applyModalNavigationMetadata + applyShellNavigationMetadata`

| Flow | Before ready | After ready | Ready delta | Before nav query | After nav query | Before focus lookup | After focus lookup | Before metadata | After metadata |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Town menu open | 18.2 | 7.2 | -11.0 | 13.1 | 0.0 | 0.0 | 0.0 | 0.4 | 0.1 |
| Menu -> Field Guide | 16.9 | 17.0 | 0.1 | 0.2 | 0.0 | 10.8 | 0.1 | 0.4 | 0.3 |
| Field Guide -> Chronicle | 14.1 | 17.4 | 3.3 | 0.4 | 0.0 | 0.1 | 0.0 | 0.7 | 0.6 |
| Field Guide -> Pack | 38.8 | 39.8 | 1.0 | 0.6 | 0.0 | 0.1 | 0.1 | 0.7 | 0.5 |
| Pack focus first item | 1.0 | 2.0 | 1.0 | 0.2 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| Pack focus move down | 2.6 | 1.9 | -0.7 | 0.7 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| Pack select second item | 22.1 | 20.0 | -2.1 | 0.4 | 0.0 | 0.2 | 0.0 | 0.9 | 0.4 |
| Pack -> Magic | 15.0 | 12.8 | -2.2 | 0.2 | 0.0 | 0.2 | 0.0 | 0.6 | 0.5 |
| Magic filter switch | 7.2 | 5.5 | -1.7 | 0.6 | 0.0 | 0.2 | 0.0 | 0.9 | 0.2 |
| Magic focus move down | 2.3 | 1.0 | -1.3 | 0.8 | 0.0 | 0.1 | 0.0 | 0.0 | 0.0 |
| Provisioner open | 12.4 | 9.6 | -2.8 | 7.8 | 0.0 | 0.0 | 0.0 | 0.2 | 0.2 |
| Provisioner -> Sell | 5.9 | 6.6 | 0.7 | 0.1 | 0.1 | 0.0 | 0.0 | 0.2 | 0.1 |
| Settings open | 11.6 | 5.7 | -5.9 | 4.0 | 0.0 | 0.0 | 0.0 | 0.2 | 0.2 |
| Settings focus move down | 1.4 | 2.0 | 0.6 | 0.4 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| Sage open | 4.9 | 4.0 | -0.9 | 2.5 | 0.0 | 0.0 | 0.0 | 0.2 | 0.1 |
| Sage blocked identify | 1.0 | 0.7 | -0.3 | 0.1 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |

## Interpretation

- The clearest performance win is the removal of repeated focusable-list scans on menu open.
- The clearest reliability/performance win is the removal of the `10.8ms` focus-key lookup spike on `Menu -> Field Guide`.
- Directional moves were already fast, but now they avoid the repeated root scan cost and are more consistent in first-focus timing.
