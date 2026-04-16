# Changelog

## [0.8.0](https://github.com/andymai/elevator-core/compare/elevator-ffi-v0.7.0...elevator-ffi-v0.8.0) (2026-04-16)


### ⚠ BREAKING CHANGES

* physics newtypes — Weight, Speed, Accel ([#153](https://github.com/andymai/elevator-core/issues/153))
* removes 5 redundant methods, consolidating to `spawn_rider` + `build_rider`/`RiderBuilder`:
* hall calls, car calls, pinning, and mid-trip reassignment ([#91](https://github.com/andymai/elevator-core/issues/91))

### Features

* consolidate spawn_rider API and delete _by_stop_id twins ([#130](https://github.com/andymai/elevator-core/issues/130)) ([daba0ea](https://github.com/andymai/elevator-core/commit/daba0ea54b08c4d7e41eae591859f2d2dc03db15))
* **elevator-ffi:** C ABI for Unity / native interop ([#87](https://github.com/andymai/elevator-core/issues/87)) ([3b89b17](https://github.com/andymai/elevator-core/commit/3b89b17e7fa8b00ae7c5ac15462ec46673c1f925))
* **ffi:** add destination_entity_id to EvHallCall ([#112](https://github.com/andymai/elevator-core/issues/112)) ([5913f8b](https://github.com/andymai/elevator-core/commit/5913f8b4e368704d968e5596240cd566fddd86cd)), closes [#101](https://github.com/andymai/elevator-core/issues/101)
* hall calls, car calls, pinning, and mid-trip reassignment ([#91](https://github.com/andymai/elevator-core/issues/91)) ([4197558](https://github.com/andymai/elevator-core/commit/41975589b2853739e88fd4bc4e19c37c20abdab5))
* physics newtypes — Weight, Speed, Accel ([#153](https://github.com/andymai/elevator-core/issues/153)) ([8833676](https://github.com/andymai/elevator-core/commit/88336764481db7d4ff13cb4b370e7a692511bf72))
* surface hall-call events to Bevy HUD and FFI consumers ([#118](https://github.com/andymai/elevator-core/issues/118)) ([ad82bb3](https://github.com/andymai/elevator-core/commit/ad82bb36610261c33b181bc0acbfef70d521e8ae)), closes [#95](https://github.com/andymai/elevator-core/issues/95) [#100](https://github.com/andymai/elevator-core/issues/100)


### Bug Fixes

* eliminate flaky FFI tests ([#131](https://github.com/andymai/elevator-core/issues/131)) ([501fdd3](https://github.com/andymai/elevator-core/commit/501fdd31a52c7b766db5e432e6f0b67f8d8b9caf))

## [0.7.0](https://github.com/andymai/elevator-core/compare/elevator-ffi-v0.6.0...elevator-ffi-v0.7.0) (2026-04-16)


### ⚠ BREAKING CHANGES

* physics newtypes — Weight, Speed, Accel ([#153](https://github.com/andymai/elevator-core/issues/153))

### Features

* physics newtypes — Weight, Speed, Accel ([#153](https://github.com/andymai/elevator-core/issues/153)) ([8833676](https://github.com/andymai/elevator-core/commit/88336764481db7d4ff13cb4b370e7a692511bf72))

## [0.6.0](https://github.com/andymai/elevator-core/compare/elevator-ffi-v0.5.0...elevator-ffi-v0.6.0) (2026-04-16)


### ⚠ BREAKING CHANGES

* removes 5 redundant methods, consolidating to `spawn_rider` + `build_rider`/`RiderBuilder`:

### Features

* consolidate spawn_rider API and delete _by_stop_id twins ([#130](https://github.com/andymai/elevator-core/issues/130)) ([daba0ea](https://github.com/andymai/elevator-core/commit/daba0ea54b08c4d7e41eae591859f2d2dc03db15))


### Bug Fixes

* eliminate flaky FFI tests ([#131](https://github.com/andymai/elevator-core/issues/131)) ([501fdd3](https://github.com/andymai/elevator-core/commit/501fdd31a52c7b766db5e432e6f0b67f8d8b9caf))

## [0.5.0](https://github.com/andymai/elevator-core/compare/elevator-ffi-v0.4.0...elevator-ffi-v0.5.0) (2026-04-16)


### Features

* surface hall-call events to Bevy HUD and FFI consumers ([#118](https://github.com/andymai/elevator-core/issues/118)) ([ad82bb3](https://github.com/andymai/elevator-core/commit/ad82bb36610261c33b181bc0acbfef70d521e8ae)), closes [#95](https://github.com/andymai/elevator-core/issues/95) [#100](https://github.com/andymai/elevator-core/issues/100)

## [0.4.0](https://github.com/andymai/elevator-core/compare/elevator-ffi-v0.3.0...elevator-ffi-v0.4.0) (2026-04-16)


### Features

* **ffi:** add destination_entity_id to EvHallCall ([#112](https://github.com/andymai/elevator-core/issues/112)) ([5913f8b](https://github.com/andymai/elevator-core/commit/5913f8b4e368704d968e5596240cd566fddd86cd)), closes [#101](https://github.com/andymai/elevator-core/issues/101)

## [0.3.0](https://github.com/andymai/elevator-core/compare/elevator-ffi-v0.2.0...elevator-ffi-v0.3.0) (2026-04-15)


### ⚠ BREAKING CHANGES

* hall calls, car calls, pinning, and mid-trip reassignment ([#91](https://github.com/andymai/elevator-core/issues/91))

### Features

* hall calls, car calls, pinning, and mid-trip reassignment ([#91](https://github.com/andymai/elevator-core/issues/91)) ([4197558](https://github.com/andymai/elevator-core/commit/41975589b2853739e88fd4bc4e19c37c20abdab5))

## [0.2.0](https://github.com/andymai/elevator-core/compare/elevator-ffi-v0.1.0...elevator-ffi-v0.2.0) (2026-04-15)


### Features

* **elevator-ffi:** C ABI for Unity / native interop ([#87](https://github.com/andymai/elevator-core/issues/87)) ([3b89b17](https://github.com/andymai/elevator-core/commit/3b89b17e7fa8b00ae7c5ac15462ec46673c1f925))
