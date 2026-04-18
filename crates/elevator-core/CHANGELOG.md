# Changelog

## [15.2.2](https://github.com/andymai/elevator-core/compare/elevator-core-v15.2.1...elevator-core-v15.2.2) (2026-04-18)


### Bug Fixes

* **dispatch:** clear DCS sticky assignment when assigned car is lost ([#251](https://github.com/andymai/elevator-core/issues/251)) ([c264c44](https://github.com/andymai/elevator-core/commit/c264c44d352cee7d5ed75e229d22170e6364c33c))

## [15.2.1](https://github.com/andymai/elevator-core/compare/elevator-core-v15.2.0...elevator-core-v15.2.1) (2026-04-18)


### Bug Fixes

* **metrics:** only count multi-leg journey as one delivery ([#252](https://github.com/andymai/elevator-core/issues/252)) ([1805a6d](https://github.com/andymai/elevator-core/commit/1805a6deb5d24262263350cfa3bd6f309fd8f7ef))

## [15.2.0](https://github.com/andymai/elevator-core/compare/elevator-core-v15.1.0...elevator-core-v15.2.0) (2026-04-18)


### Features

* **dispatch:** stabilize DispatchStrategy and built-in strategies ([#238](https://github.com/andymai/elevator-core/issues/238)) ([6a13d3d](https://github.com/andymai/elevator-core/commit/6a13d3d37bd93136670e268af72c530c229af9fb))

## [15.1.0](https://github.com/andymai/elevator-core/compare/elevator-core-v15.0.0...elevator-core-v15.1.0) (2026-04-17)


### Features

* add Simulation::abort_movement for mid-flight trip cancellation ([#221](https://github.com/andymai/elevator-core/issues/221)) ([6a8a205](https://github.com/andymai/elevator-core/commit/6a8a205a38894c37e486f745c002023c2650ca28))

## [15.0.0](https://github.com/andymai/elevator-core/compare/elevator-core-v14.0.0...elevator-core-v15.0.0) (2026-04-16)


### ⚠ BREAKING CHANGES

* replace archaic balk vocabulary ([#211](https://github.com/andymai/elevator-core/issues/211))

### Code Refactoring

* replace archaic balk vocabulary ([#211](https://github.com/andymai/elevator-core/issues/211)) ([f26b5b2](https://github.com/andymai/elevator-core/commit/f26b5b29fadf2472e6f7a306672c512569d49ab5))

## [14.0.0](https://github.com/andymai/elevator-core/compare/elevator-core-v13.0.1...elevator-core-v14.0.0) (2026-04-16)


### ⚠ BREAKING CHANGES

* design hardening (#170, #171, #174, #175, #177) ([#206](https://github.com/andymai/elevator-core/issues/206))

### Features

* design hardening ([#170](https://github.com/andymai/elevator-core/issues/170), [#171](https://github.com/andymai/elevator-core/issues/171), [#174](https://github.com/andymai/elevator-core/issues/174), [#175](https://github.com/andymai/elevator-core/issues/175), [#177](https://github.com/andymai/elevator-core/issues/177)) ([#206](https://github.com/andymai/elevator-core/issues/206)) ([ced0bbb](https://github.com/andymai/elevator-core/commit/ced0bbba9090ba196add90abb2cafae57e48d834))

## [13.0.1](https://github.com/andymai/elevator-core/compare/elevator-core-v13.0.0...elevator-core-v13.0.1) (2026-04-16)


### Bug Fixes

* medium bug fixes ([#166](https://github.com/andymai/elevator-core/issues/166), [#167](https://github.com/andymai/elevator-core/issues/167), [#168](https://github.com/andymai/elevator-core/issues/168), [#169](https://github.com/andymai/elevator-core/issues/169), [#172](https://github.com/andymai/elevator-core/issues/172), [#173](https://github.com/andymai/elevator-core/issues/173)) ([#205](https://github.com/andymai/elevator-core/issues/205)) ([06bb0a3](https://github.com/andymai/elevator-core/commit/06bb0a3046ebbf606d77912f124a50e1e9b37dd8))

## [13.0.0](https://github.com/andymai/elevator-core/compare/elevator-core-v12.0.2...elevator-core-v13.0.0) (2026-04-16)


### ⚠ BREAKING CHANGES

* runtime validation for Weight, Speed, and Accel constructors ([#197](https://github.com/andymai/elevator-core/issues/197))

### Bug Fixes

* critical bug fixes ([#163](https://github.com/andymai/elevator-core/issues/163), [#164](https://github.com/andymai/elevator-core/issues/164), [#165](https://github.com/andymai/elevator-core/issues/165)) ([#204](https://github.com/andymai/elevator-core/issues/204)) ([dc4d4b9](https://github.com/andymai/elevator-core/commit/dc4d4b9740e57beb38a0d42ce6af37b11d15ee40))
* runtime validation for Weight, Speed, and Accel constructors ([#197](https://github.com/andymai/elevator-core/issues/197)) ([b5aeff2](https://github.com/andymai/elevator-core/commit/b5aeff29d0b817a4d679ca669dab73795c227b90)), closes [#187](https://github.com/andymai/elevator-core/issues/187)

## [12.0.2](https://github.com/andymai/elevator-core/compare/elevator-core-v12.0.1...elevator-core-v12.0.2) (2026-04-16)


### Bug Fixes

* low-severity bug fixes ([#200](https://github.com/andymai/elevator-core/issues/200)) ([87058fe](https://github.com/andymai/elevator-core/commit/87058fe46f107398f9d01d88921f9ced7fa1c888))

## [12.0.1](https://github.com/andymai/elevator-core/compare/elevator-core-v12.0.0...elevator-core-v12.0.1) (2026-04-16)


### Bug Fixes

* medium-severity bug fixes ([#198](https://github.com/andymai/elevator-core/issues/198)) ([e134583](https://github.com/andymai/elevator-core/commit/e134583ab5919e554e72de1917a0a725708f5f41))

## [12.0.0](https://github.com/andymai/elevator-core/compare/elevator-core-v11.0.0...elevator-core-v12.0.0) (2026-04-16)


### ⚠ BREAKING CHANGES

* typed ElevatorId and RiderId for compile-time entity safety ([#159](https://github.com/andymai/elevator-core/issues/159))

### Features

* typed ElevatorId and RiderId for compile-time entity safety ([#159](https://github.com/andymai/elevator-core/issues/159)) ([6a6e613](https://github.com/andymai/elevator-core/commit/6a6e6132be9f47c441a2a480187b030dc1edab75))

## [11.0.0](https://github.com/andymai/elevator-core/compare/elevator-core-v10.0.0...elevator-core-v11.0.0) (2026-04-16)


### ⚠ BREAKING CHANGES

* snapshot restore errors and extension convenience ([#158](https://github.com/andymai/elevator-core/issues/158))
* prelude expansion and RepositionStrategy buffer pattern ([#156](https://github.com/andymai/elevator-core/issues/156))

### Features

* prelude expansion and RepositionStrategy buffer pattern ([#156](https://github.com/andymai/elevator-core/issues/156)) ([4f88934](https://github.com/andymai/elevator-core/commit/4f88934c779dba2350a918acaa1c335f8dd8ac7c))
* snapshot restore errors and extension convenience ([#158](https://github.com/andymai/elevator-core/issues/158)) ([7f42239](https://github.com/andymai/elevator-core/commit/7f42239f3db0103e80e546f244ccfde72558a032))

## [10.0.0](https://github.com/andymai/elevator-core/compare/elevator-core-v9.0.0...elevator-core-v10.0.0) (2026-04-16)


### ⚠ BREAKING CHANGES

* physics newtypes — Weight, Speed, Accel ([#153](https://github.com/andymai/elevator-core/issues/153))
* dispatch ergonomics — RankContext, manifest encapsulation ([#152](https://github.com/andymai/elevator-core/issues/152))
* API ergonomics — trait impls, naming, and quick wins ([#151](https://github.com/andymai/elevator-core/issues/151))

### Features

* API ergonomics — trait impls, naming, and quick wins ([#151](https://github.com/andymai/elevator-core/issues/151)) ([533a7f5](https://github.com/andymai/elevator-core/commit/533a7f5361ca2dfd2bef27a19a2e9b2c5251cd7e))
* dispatch ergonomics — RankContext, manifest encapsulation ([#152](https://github.com/andymai/elevator-core/issues/152)) ([4c4c168](https://github.com/andymai/elevator-core/commit/4c4c168013a16289f499a01c0ebef9eb6221ceb1))
* physics newtypes — Weight, Speed, Accel ([#153](https://github.com/andymai/elevator-core/issues/153)) ([8833676](https://github.com/andymai/elevator-core/commit/88336764481db7d4ff13cb4b370e7a692511bf72))

## [9.0.0](https://github.com/andymai/elevator-core/compare/elevator-core-v8.3.0...elevator-core-v9.0.0) (2026-04-16)


### ⚠ BREAKING CHANGES

* removes 5 redundant methods, consolidating to `spawn_rider` + `build_rider`/`RiderBuilder`:
* extension component registration and insertion now use `ExtKey<T>` instead of bare `&str` names.
* `SimError::InvalidState` removed entirely. All 22 former call sites now use concrete, matchable variants.
* Return types changed for three public methods:
* `FloorPosition` struct renamed to `SpatialPosition`.
* door control methods renamed:
    - `request_door_open` → `open_door`
    - `request_door_close` → `close_door`
    - `hold_door_open` → `hold_door`
    - `cancel_door_hold` unchanged

### Features

* add concrete SimError variants for elevator operations ([#126](https://github.com/andymai/elevator-core/issues/126)) ([6c9b7db](https://github.com/andymai/elevator-core/commit/6c9b7db73a0f6c2cd4ebd88b20dbf079d3248746))
* additive API ergonomics wins ([#121](https://github.com/andymai/elevator-core/issues/121)) ([96449d0](https://github.com/andymai/elevator-core/commit/96449d01a6bca65db0f9afd989daf62bd3908516))
* complete SimError::InvalidState split and delete variant ([#128](https://github.com/andymai/elevator-core/issues/128)) ([999f508](https://github.com/andymai/elevator-core/commit/999f508a248e6898d3b1bbd9f2c48c40fb337497))
* consolidate spawn_rider API and delete _by_stop_id twins ([#130](https://github.com/andymai/elevator-core/issues/130)) ([daba0ea](https://github.com/andymai/elevator-core/commit/daba0ea54b08c4d7e41eae591859f2d2dc03db15))
* introduce StopRef for unified stop parameter handling ([#125](https://github.com/andymai/elevator-core/issues/125)) ([316f92a](https://github.com/andymai/elevator-core/commit/316f92ae892d53fd6e855cfc67fd2487acffa2c8))
* return Result from eta() and tag_entity() ([#127](https://github.com/andymai/elevator-core/issues/127)) ([0970b43](https://github.com/andymai/elevator-core/commit/0970b43a7947ccce879884690d11b5bc0db79850))
* typed ExtKey&lt;T&gt; for compile-time extension safety ([#129](https://github.com/andymai/elevator-core/issues/129)) ([c86590f](https://github.com/andymai/elevator-core/commit/c86590f7f227831751dc669599028f2aa09e648d))


### Code Refactoring

* rename door control methods for clarity ([#122](https://github.com/andymai/elevator-core/issues/122)) ([b28adcb](https://github.com/andymai/elevator-core/commit/b28adcbc12e16b26b3408674c0bdddf21a320a08))
* rename FloorPosition to SpatialPosition ([#123](https://github.com/andymai/elevator-core/issues/123)) ([44e7277](https://github.com/andymai/elevator-core/commit/44e7277c049cabc469f69e9ac31199c6363b7591))

## [8.3.0](https://github.com/andymai/elevator-core/compare/elevator-core-v8.2.0...elevator-core-v8.3.0) (2026-04-16)


### Features

* gate DestinationDispatch on HallCallMode::Destination ([#114](https://github.com/andymai/elevator-core/issues/114)) ([42df935](https://github.com/andymai/elevator-core/commit/42df9358078adf7cace8f6ea0e7fe4be19e083c2)), closes [#99](https://github.com/andymai/elevator-core/issues/99)

## [8.2.0](https://github.com/andymai/elevator-core/compare/elevator-core-v8.1.0...elevator-core-v8.2.0) (2026-04-15)


### Features

* expose hall_calls and car_calls on DispatchManifest ([#108](https://github.com/andymai/elevator-core/issues/108)) ([5251a52](https://github.com/andymai/elevator-core/commit/5251a5283e66b8ffcee2fceb1ba1cc0cdd22afbc)), closes [#102](https://github.com/andymai/elevator-core/issues/102)

## [8.1.0](https://github.com/andymai/elevator-core/compare/elevator-core-v8.0.0...elevator-core-v8.1.0) (2026-04-15)


### Features

* wire hall_call_mode and ack_latency_ticks through GroupConfig ([#105](https://github.com/andymai/elevator-core/issues/105)) ([99a36dc](https://github.com/andymai/elevator-core/commit/99a36dc5b7d20e410062ad0f42692a051d331547))

## [8.0.0](https://github.com/andymai/elevator-core/compare/elevator-core-v7.0.1...elevator-core-v8.0.0) (2026-04-15)


### ⚠ BREAKING CHANGES

* rename rebalk_on_full to abandon_on_full, clarify semantics ([#106](https://github.com/andymai/elevator-core/issues/106))

### Features

* rename rebalk_on_full to abandon_on_full, clarify semantics ([#106](https://github.com/andymai/elevator-core/issues/106)) ([204757a](https://github.com/andymai/elevator-core/commit/204757a947837b394befc706ed1cb33314f6af8f)), closes [#97](https://github.com/andymai/elevator-core/issues/97)

## [7.0.1](https://github.com/andymai/elevator-core/compare/elevator-core-v7.0.0...elevator-core-v7.0.1) (2026-04-15)


### Bug Fixes

* persist hall/car calls and group hall mode in snapshots ([#104](https://github.com/andymai/elevator-core/issues/104)) ([8e5183e](https://github.com/andymai/elevator-core/commit/8e5183e256b8408c63d1b34906ad486136cc1bab)), closes [#93](https://github.com/andymai/elevator-core/issues/93)

## [7.0.0](https://github.com/andymai/elevator-core/compare/elevator-core-v6.0.0...elevator-core-v7.0.0) (2026-04-15)


### ⚠ BREAKING CHANGES

* hall calls, car calls, pinning, and mid-trip reassignment ([#91](https://github.com/andymai/elevator-core/issues/91))

### Features

* hall calls, car calls, pinning, and mid-trip reassignment ([#91](https://github.com/andymai/elevator-core/issues/91)) ([4197558](https://github.com/andymai/elevator-core/commit/41975589b2853739e88fd4bc4e19c37c20abdab5))

## [6.0.0](https://github.com/andymai/elevator-core/compare/elevator-core-v5.10.0...elevator-core-v6.0.0) (2026-04-15)


### ⚠ BREAKING CHANGES

* score-based dispatch with Hungarian assignment ([#89](https://github.com/andymai/elevator-core/issues/89))

### Features

* score-based dispatch with Hungarian assignment ([#89](https://github.com/andymai/elevator-core/issues/89)) ([a15c83d](https://github.com/andymai/elevator-core/commit/a15c83d47f5797ab9968804c120cf459530da539))

## [5.10.0](https://github.com/andymai/elevator-core/compare/elevator-core-v5.9.1...elevator-core-v5.10.0) (2026-04-15)


### Features

* ETA query API for queued elevators ([#85](https://github.com/andymai/elevator-core/issues/85)) ([f3d3827](https://github.com/andymai/elevator-core/commit/f3d38278dd368f83d61ebf2a8ef542eec15d2fca))

## [5.9.1](https://github.com/andymai/elevator-core/compare/elevator-core-v5.9.0...elevator-core-v5.9.1) (2026-04-15)


### Bug Fixes

* swap bincode for postcard (unblock main CI) ([#83](https://github.com/andymai/elevator-core/issues/83)) ([617aaf5](https://github.com/andymai/elevator-core/commit/617aaf5ca63e5a3df3ceeb8a79d6729718fe069d))

## [5.9.0](https://github.com/andymai/elevator-core/compare/elevator-core-v5.8.1...elevator-core-v5.9.0) (2026-04-15)


### Features

* bincode snapshot_bytes with version-checked restore ([#80](https://github.com/andymai/elevator-core/issues/80)) ([1991643](https://github.com/andymai/elevator-core/commit/19916434b23162d2ae087f948d7bd975cdca4f20))


### Bug Fixes

* greptile P2 findings on snapshot_bytes ([#82](https://github.com/andymai/elevator-core/issues/82)) ([38429a0](https://github.com/andymai/elevator-core/commit/38429a01a3eeb0352a03a9665466e3891447309a))

## [5.8.1](https://github.com/andymai/elevator-core/compare/elevator-core-v5.8.0...elevator-core-v5.8.1) (2026-04-15)


### Bug Fixes

* greptile findings on manual mode ([#78](https://github.com/andymai/elevator-core/issues/78)) ([bc76878](https://github.com/andymai/elevator-core/commit/bc768781f592de6afdd04c6c485f5d8f8df198b6))

## [5.8.0](https://github.com/andymai/elevator-core/compare/elevator-core-v5.7.0...elevator-core-v5.8.0) (2026-04-14)


### Features

* ServiceMode::Manual with direct velocity commands ([#77](https://github.com/andymai/elevator-core/issues/77)) ([284d3bb](https://github.com/andymai/elevator-core/commit/284d3bbdca9f783fd5d7e32730e6a14eb1cbaf80))
* sub-tick position interpolation ([#75](https://github.com/andymai/elevator-core/issues/75)) ([2ebd1df](https://github.com/andymai/elevator-core/commit/2ebd1df7520ec069b0f803e142c8c764557ad37d))

## [5.7.0](https://github.com/andymai/elevator-core/compare/elevator-core-v5.6.0...elevator-core-v5.7.0) (2026-04-14)


### Features

* manual door control API ([#73](https://github.com/andymai/elevator-core/issues/73)) ([380612b](https://github.com/andymai/elevator-core/commit/380612b1aba62908c19052b9082da9185246b3c0))

## [5.6.0](https://github.com/andymai/elevator-core/compare/elevator-core-v5.5.1...elevator-core-v5.6.0) (2026-04-14)


### Features

* add Destination Dispatch (DCS) strategy ([#70](https://github.com/andymai/elevator-core/issues/70)) ([4c8ab64](https://github.com/andymai/elevator-core/commit/4c8ab64aacb9998cd24c06970687125a3cb1d5c3))
* runtime elevator upgrade API ([#72](https://github.com/andymai/elevator-core/issues/72)) ([f32a345](https://github.com/andymai/elevator-core/commit/f32a34589f414e42df1a3ddd68809a26a028a6ae))

## [5.5.1](https://github.com/andymai/elevator-core/compare/elevator-core-v5.5.0...elevator-core-v5.5.1) (2026-04-14)


### Bug Fixes

* prevent stuck-elevator door-cycle loops in multi-line configs ([#68](https://github.com/andymai/elevator-core/issues/68)) ([d83d1db](https://github.com/andymai/elevator-core/commit/d83d1dbf91c8c5ee2362fd08af98aed65209f44b))

## [5.5.0](https://github.com/andymai/elevator-core/compare/elevator-core-v5.4.0...elevator-core-v5.5.0) (2026-04-14)


### Features

* Default impl for ElevatorConfig; rewrite README with ::new() ([#53](https://github.com/andymai/elevator-core/issues/53)) ([4a6e1be](https://github.com/andymai/elevator-core/commit/4a6e1bef8e5be6719b73cde1f69e35bf8063128d))

## [5.4.0](https://github.com/andymai/elevator-core/compare/elevator-core-v5.3.0...elevator-core-v5.4.0) (2026-04-14)


### Features

* **ci:** auto-approve and merge release-please PRs via release-kun app ([#45](https://github.com/andymai/elevator-core/issues/45)) ([a7cf67f](https://github.com/andymai/elevator-core/commit/a7cf67f4822cb8220299986ebdeca0a041607fd2))
* release hygiene — cargo-deny, MSRV check, corrected MSRV ([#44](https://github.com/andymai/elevator-core/issues/44)) ([f33b702](https://github.com/andymai/elevator-core/commit/f33b7029931222f7ea5af2d86e5da8a68d463920))


### Bug Fixes

* correctness bugs surfaced by review pass ([#46](https://github.com/andymai/elevator-core/issues/46)) ([4d397a4](https://github.com/andymai/elevator-core/commit/4d397a497c094f596ece5d5b7f746a6a9f6127fd))

## [5.3.0](https://github.com/andymai/elevator-core/compare/elevator-core-v5.2.0...elevator-core-v5.3.0) (2026-04-14)


### Features

* DestinationQueue component for imperative elevator control ([#34](https://github.com/andymai/elevator-core/issues/34)) ([071816d](https://github.com/andymai/elevator-core/commit/071816dcdc33a79cbc59fa0a01d37ba80573a2c3))
* expose braking-distance helpers on the simulation API ([#33](https://github.com/andymai/elevator-core/issues/33)) ([68ea94b](https://github.com/andymai/elevator-core/commit/68ea94bd6839ff1973dfd3c09a831c715e766862))

## [5.2.0](https://github.com/andymai/elevator-core/compare/elevator-core-v5.1.0...elevator-core-v5.2.0) (2026-04-14)


### Features

* add move_count metric for floor crossings ([#36](https://github.com/andymai/elevator-core/issues/36)) ([fba79d5](https://github.com/andymai/elevator-core/commit/fba79d55dfc61ac2d7caef9aa2f7f722f43b4e66))
* elevator direction indicators and direction-aware boarding ([#31](https://github.com/andymai/elevator-core/issues/31)) ([ca0fd4e](https://github.com/andymai/elevator-core/commit/ca0fd4e3dbe2fb86403e895acb47a7f566e94a87))

## [5.1.0](https://github.com/andymai/elevator-core/compare/elevator-core-v5.0.0...elevator-core-v5.1.0) (2026-04-14)


### Features

* add CapacityChanged event and entity/aggregate query helpers ([#26](https://github.com/andymai/elevator-core/issues/26)) ([34395b4](https://github.com/andymai/elevator-core/commit/34395b4c70cdd7fea8fe84b1a87a6c09b935b317))


### Bug Fixes

* improve error message readability ([#28](https://github.com/andymai/elevator-core/issues/28)) ([999a7ff](https://github.com/andymai/elevator-core/commit/999a7ffc8109927a1aec36220ac2c96fb48e4f45))

## [5.0.0](https://github.com/andymai/elevator-core/compare/elevator-core-v4.1.0...elevator-core-v5.0.0) (2026-04-13)


### ⚠ BREAKING CHANGES

* review and tighten elevator-core public API ([#22](https://github.com/andymai/elevator-core/issues/22))

### Features

* add Display impls for Position, Velocity, Metrics, RejectionContext ([#25](https://github.com/andymai/elevator-core/issues/25)) ([804cbb1](https://github.com/andymai/elevator-core/commit/804cbb13fdbba7f2e57eb04815c3e07275da7bd0))
* add external traffic generation with Poisson arrivals ([#24](https://github.com/andymai/elevator-core/issues/24)) ([00ce7e1](https://github.com/andymai/elevator-core/commit/00ce7e15a2a119bd2477e82fcb8287a17f7fbd43))


### Code Refactoring

* review and tighten elevator-core public API ([#22](https://github.com/andymai/elevator-core/issues/22)) ([c3fbe7a](https://github.com/andymai/elevator-core/commit/c3fbe7af63d06be1641d5644568f4f639dadd4a0))

## [4.1.0](https://github.com/andymai/elevator-core/compare/elevator-core-v4.0.0...elevator-core-v4.1.0) (2026-04-13)


### Features

* add ServiceMode for elevator operational modes ([#20](https://github.com/andymai/elevator-core/issues/20)) ([2682208](https://github.com/andymai/elevator-core/commit/2682208bd8ccfc57b8e9adf22159248fa7b4ba1f))
* add simplified energy modeling ([#19](https://github.com/andymai/elevator-core/issues/19)) ([9666968](https://github.com/andymai/elevator-core/commit/96669680edb3a63d3e70af653ecf649ac1b7e1fa))
* add stop-level access control ([#18](https://github.com/andymai/elevator-core/issues/18)) ([cf8257f](https://github.com/andymai/elevator-core/commit/cf8257f1bf20b4feb75f2e2c1d103619ac47c2e1))

## [4.0.0](https://github.com/andymai/elevator-core/compare/elevator-core-v3.0.0...elevator-core-v4.0.0) (2026-04-13)


### ⚠ BREAKING CHANGES

* add Resident phase, population tracking, and rider lifecycle ([#13](https://github.com/andymai/elevator-core/issues/13))

### Features

* add observability, query ergonomics, traffic schedules, and test coverage ([879425e](https://github.com/andymai/elevator-core/commit/879425e39c5492528052ca685603f7e54b1436b9))
* add observability, query ergonomics, traffic schedules, and test coverage ([e29c930](https://github.com/andymai/elevator-core/commit/e29c93084a58ac63d7a457be031c3e5a75a31a3d))
* add Resident phase, population tracking, and rider lifecycle ([#13](https://github.com/andymai/elevator-core/issues/13)) ([16d09d7](https://github.com/andymai/elevator-core/commit/16d09d7ba0b13a33735592e65c7217d4788d6094))

## [3.0.0](https://github.com/andymai/elevator-core/compare/elevator-core-v2.0.0...elevator-core-v3.0.0) (2026-04-13)


### ⚠ BREAKING CHANGES

* add repositioning system, overhaul ETD dispatch, and improve error handling

### Features

* add repositioning system, overhaul ETD dispatch, and improve error handling ([7da3841](https://github.com/andymai/elevator-core/commit/7da3841b4dbc59de454d69f11a1344a1842f7052))

## [2.0.0](https://github.com/andymai/elevator-core/compare/elevator-core-v1.0.0...elevator-core-v2.0.0) (2026-04-13)


### ⚠ BREAKING CHANGES

* add multi-line support for multiple shafts and tethers ([#7](https://github.com/andymai/elevator-core/issues/7))

### Features

* add multi-line support for multiple shafts and tethers ([#7](https://github.com/andymai/elevator-core/issues/7)) ([ed57150](https://github.com/andymai/elevator-core/commit/ed57150c04952461f7169d09259d7ebf225b6f0c))


### Bug Fixes

* inline elevator-core version for release-please compatibility ([d294bb5](https://github.com/andymai/elevator-core/commit/d294bb597552b100eea7e84107d970d0d3be5150))
