# Changelog

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
