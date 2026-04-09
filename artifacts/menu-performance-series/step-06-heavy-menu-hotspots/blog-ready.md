# Blog-Ready Summary

The sixth menu-performance pass stopped trying to tune the whole menu system at once and went after the worst individual offenders: pack, field guide, and the provisioner. Those screens had a common problem. They looked like single-surface UI, but under the hood they were still preparing hidden panels, rebuilding rich comparison views, or assembling large journal sections the player was not even looking at.

The fixes were narrow and practical. Pack interactions now refresh only the list, equipment, and inspector regions that actually changed. Field Guide now renders only the active section instead of constructing every section on every switch. Provisioner now builds either the buy screen or the sell screen, not both. The result is exactly the kind of win players feel: pack filter changes dropped from `14.0ms` to `7.5ms`, pack item selection dropped from `13.1ms` to `9.0ms`, journal open dropped from `19.5ms` to `13.2ms`, and provisioner open dropped from `12.6ms` to `8.6ms`.

The biggest remaining pure menu hotspot is still the first jump from Field Guide into Pack. That is useful news, not a failure. It means the next pass can stay focused on first-time pack construction instead of relitigating selection churn that is already much lighter.
