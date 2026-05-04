# Changelog

## [0.17.0](https://github.com/andymai/elevator-core/compare/elevator-ffi-v0.16.1...elevator-ffi-v0.17.0) (2026-05-04)


### Features

* MultiHostLayout proc-macro for repr-C struct introspection ([#625](https://github.com/andymai/elevator-core/issues/625)) ([29e8e55](https://github.com/andymai/elevator-core/commit/29e8e554e70c6fe1f7aeb1311c02a9071c7a3edd))

## [0.16.1](https://github.com/andymai/elevator-core/compare/elevator-ffi-v0.16.0...elevator-ffi-v0.16.1) (2026-05-04)


### Bug Fixes

* **ffi:** namespace cbindgen enums to fix Custom collision ([#620](https://github.com/andymai/elevator-core/issues/620)) ([aef39fa](https://github.com/andymai/elevator-core/commit/aef39fa7b26927e68ed70048eaf50105e2ceed6c))

## [0.16.0](https://github.com/andymai/elevator-core/compare/elevator-ffi-v0.15.0...elevator-ffi-v0.16.0) (2026-05-04)


### Features

* GameMaker Studio 2 native-extension bundle + C harness ([#616](https://github.com/andymai/elevator-core/issues/616)) ([d3ecb95](https://github.com/andymai/elevator-core/commit/d3ecb955104839200450c2eeca1f3bf124a0aaeb))

## [0.15.0](https://github.com/andymai/elevator-core/compare/elevator-ffi-v0.14.0...elevator-ffi-v0.15.0) (2026-05-04)


### Features

* **ffi:** add ev_drain_log_messages polling API ([#613](https://github.com/andymai/elevator-core/issues/613)) ([66347a6](https://github.com/andymai/elevator-core/commit/66347a67d80a467478f88036948be7b6bcb00b02))

## [0.14.0](https://github.com/andymai/elevator-core/compare/elevator-ffi-v0.13.0...elevator-ffi-v0.14.0) (2026-04-29)


### Features

* **events:** emit Rider.tag on every rider-bearing event ([#545](https://github.com/andymai/elevator-core/issues/545)) ([0456239](https://github.com/andymai/elevator-core/commit/045623914954e8a66ac0517a2708a200828c7e99))

## [0.13.0](https://github.com/andymai/elevator-core/compare/elevator-ffi-v0.12.0...elevator-ffi-v0.13.0) (2026-04-29)


### Features

* **core:** per-elevator home_stop pin overrides reposition strategy ([#543](https://github.com/andymai/elevator-core/issues/543)) ([842daa0](https://github.com/andymai/elevator-core/commit/842daa0a142d1d1d05b5eba5f741cc340d190a9b))

## [0.12.0](https://github.com/andymai/elevator-core/compare/elevator-ffi-v0.11.0...elevator-ffi-v0.12.0) (2026-04-29)


### Features

* **core:** per-rider opaque tag for consumer back-pointers ([#541](https://github.com/andymai/elevator-core/issues/541)) ([68524a5](https://github.com/andymai/elevator-core/commit/68524a55c625398fc9d9bf114942c26ca6c43b2a))

## [0.11.0](https://github.com/andymai/elevator-core/compare/elevator-ffi-v0.10.2...elevator-ffi-v0.11.0) (2026-04-28)


### Features

* **core:** deterministic-fp feature flag for cross-host bit equality ([#532](https://github.com/andymai/elevator-core/issues/532)) ([02ea743](https://github.com/andymai/elevator-core/commit/02ea743cc07bc31473cba8b2db51232983e74599))

## [0.10.2](https://github.com/andymai/elevator-core/compare/elevator-ffi-v0.10.1...elevator-ffi-v0.10.2) (2026-04-28)


### Bug Fixes

* **ffi:** harmonize ev_sim_hall_calls_snapshot probe-then-fill contract ([#517](https://github.com/andymai/elevator-core/issues/517)) ([34f6e40](https://github.com/andymai/elevator-core/commit/34f6e401ba28489eee3ef17cea16f6e4c741eff4))

## [0.10.1](https://github.com/andymai/elevator-core/compare/elevator-ffi-v0.10.0...elevator-ffi-v0.10.1) (2026-04-27)


### Bug Fixes

* **ffi:** audit follow-ups — buffer contracts, panic guard, missing payload ([#511](https://github.com/andymai/elevator-core/issues/511)) ([7dbf86e](https://github.com/andymai/elevator-core/commit/7dbf86ed798a37cf897f5816c899a5b8009adecf))

## [0.10.0](https://github.com/andymai/elevator-core/compare/elevator-ffi-v0.9.0...elevator-ffi-v0.10.0) (2026-04-27)


### ⚠ BREAKING CHANGES

* **ffi:** bump ABI to v4 with full Event mirror coverage ([#504](https://github.com/andymai/elevator-core/issues/504))
* replace archaic balk vocabulary ([#211](https://github.com/andymai/elevator-core/issues/211))

### Features

* **bindings:** add mode APIs to wasm and FFI (PR-D) ([#475](https://github.com/andymai/elevator-core/issues/475)) ([884a839](https://github.com/andymai/elevator-core/commit/884a839fc3d509743eb7e5b8f13938a27c9f123b))
* **bindings:** add route mutators (setRiderRoute, rerouteRider) ([#503](https://github.com/andymai/elevator-core/issues/503)) ([4650107](https://github.com/andymai/elevator-core/commit/4650107441ef5904ddfe107eb4c1bb41ebde45e5))
* **bindings:** add stop_lookup_iter to wasm and FFI ([#493](https://github.com/andymai/elevator-core/issues/493)) ([9bde897](https://github.com/andymai/elevator-core/commit/9bde8972116cc9f61d38450f5cd0619a4c80c92c))
* **bindings:** add tagging APIs to wasm and FFI ([#487](https://github.com/andymai/elevator-core/issues/487)) ([0771a1b](https://github.com/andymai/elevator-core/commit/0771a1bb53519c3c482b31569aa1bc2f80ebb8e0))
* **dispatch:** per-line hall-call assignment ([#438](https://github.com/andymai/elevator-core/issues/438)) ([aed059c](https://github.com/andymai/elevator-core/commit/aed059c962f60e799072f2ea85a15610017a3728))
* FFI rider spawn, despawn, and lifecycle events ([#213](https://github.com/andymai/elevator-core/issues/213)) ([035e811](https://github.com/andymai/elevator-core/commit/035e81144c9781ef489f9e17a1f1ca3690c1cae3))
* **ffi:** add destinations + population queries ([#481](https://github.com/andymai/elevator-core/issues/481)) ([aac1670](https://github.com/andymai/elevator-core/commit/aac1670416303fe9f6b6b6c71cae45f19e836833))
* **ffi:** add ev_sim_add_elevator + EvElevatorParams ([#500](https://github.com/andymai/elevator-core/issues/500)) ([2dcbd54](https://github.com/andymai/elevator-core/commit/2dcbd547d00f5078769ab998c6a9cea5b88efd3e))
* **ffi:** add ev_sim_shortest_route accessor ([#502](https://github.com/andymai/elevator-core/issues/502)) ([17b5e6e](https://github.com/andymai/elevator-core/commit/17b5e6e0562168d805a92a539f4fd1a9cf0ab04f))
* **ffi:** add metrics, eta, car_calls, tagging, elevators_in_phase accessors ([#501](https://github.com/andymai/elevator-core/issues/501)) ([3771637](https://github.com/andymai/elevator-core/commit/3771637b068fc4189a012996bba2ba480129ca06))
* **ffi:** add per-elevator + global introspection accessors ([#480](https://github.com/andymai/elevator-core/issues/480)) ([43d7dcc](https://github.com/andymai/elevator-core/commit/43d7dcc2722ab895cfd2b2536db251971d64876c))
* **ffi:** add per-elevator parameter setters (PR-C) ([#478](https://github.com/andymai/elevator-core/issues/478)) ([751224a](https://github.com/andymai/elevator-core/commit/751224a471391a097269f72c30899d29e3a1a8e8))
* **ffi:** add remove_reposition + run_until_quiet ([#492](https://github.com/andymai/elevator-core/issues/492)) ([f109899](https://github.com/andymai/elevator-core/commit/f10989930c1ff24c598bd790a3ba0fbdd6a45d43))
* **ffi:** add topology mutation exports (PR-B wave 1) ([#474](https://github.com/andymai/elevator-core/issues/474)) ([adc013e](https://github.com/andymai/elevator-core/commit/adc013e0f053bb78cd873b8194394b78fe432b5e))
* **ffi:** add topology mutation extras ([#483](https://github.com/andymai/elevator-core/issues/483)) ([9c7f11f](https://github.com/andymai/elevator-core/commit/9c7f11f84781aa135f02b39ac02a1c3a35768f97))
* **ffi:** bump ABI to v3, add EvReposition + dispatch metadata ([#499](https://github.com/andymai/elevator-core/issues/499)) ([2cf61fa](https://github.com/andymai/elevator-core/commit/2cf61fab1fef547bbbe62da21fa3e84ad2ab87e8))
* **ffi:** bump ABI to v4 with full Event mirror coverage ([#504](https://github.com/andymai/elevator-core/issues/504)) ([79d756a](https://github.com/andymai/elevator-core/commit/79d756ab961cb0329b377838ed39be1c2b52cacf))
* **ffi:** rider routes + reachability queries ([#486](https://github.com/andymai/elevator-core/issues/486)) ([5b20dda](https://github.com/andymai/elevator-core/commit/5b20dda9941a25df04f6afc4c65cebda61469113))
* **ffi:** stop lookup + phase/direction queries ([#490](https://github.com/andymai/elevator-core/issues/490)) ([7015b5e](https://github.com/andymai/elevator-core/commit/7015b5e07040533613d7c7a805375d8726a5716f))
* **ffi:** topology introspection (mirror of [#482](https://github.com/andymai/elevator-core/issues/482)) ([#491](https://github.com/andymai/elevator-core/issues/491)) ([e9f5236](https://github.com/andymai/elevator-core/commit/e9f5236024c38bd080aec9b85722df465b425eef))


### Bug Fixes

* **sim:** pending_events flushes event bus to match drain semantics ([#286](https://github.com/andymai/elevator-core/issues/286)) ([165953d](https://github.com/andymai/elevator-core/commit/165953da0e35e9609947b35ad881f9a9d4ff1d73))


### Code Refactoring

* replace archaic balk vocabulary ([#211](https://github.com/andymai/elevator-core/issues/211)) ([f26b5b2](https://github.com/andymai/elevator-core/commit/f26b5b29fadf2472e6f7a306672c512569d49ab5))

## [0.9.0](https://github.com/andymai/elevator-core/compare/elevator-ffi-v0.8.0...elevator-ffi-v0.9.0) (2026-04-16)


### ⚠ BREAKING CHANGES

* typed ElevatorId and RiderId for compile-time entity safety ([#159](https://github.com/andymai/elevator-core/issues/159))

### Features

* typed ElevatorId and RiderId for compile-time entity safety ([#159](https://github.com/andymai/elevator-core/issues/159)) ([6a6e613](https://github.com/andymai/elevator-core/commit/6a6e6132be9f47c441a2a480187b030dc1edab75))

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
