# Changelog

## [0.14.0](https://github.com/andymai/elevator-core/compare/elevator-wasm-v0.13.0...elevator-wasm-v0.14.0) (2026-05-04)


### Features

* **ci:** cross-consumer ABI version gate ([#624](https://github.com/andymai/elevator-core/issues/624)) ([d8c58ac](https://github.com/andymai/elevator-core/commit/d8c58ac8a2eda8e2246f1f3791de7b63c9462edd))

## [0.13.0](https://github.com/andymai/elevator-core/compare/elevator-wasm-v0.12.0...elevator-wasm-v0.13.0) (2026-05-02)


### Features

* **wasm:** add setStrategyJs for JS-authored dispatch ([#562](https://github.com/andymai/elevator-core/issues/562)) ([35b08d9](https://github.com/andymai/elevator-core/commit/35b08d9a098175a6c2fbf123b78dda42eb75498a))

## [0.12.0](https://github.com/andymai/elevator-core/compare/elevator-wasm-v0.11.0...elevator-wasm-v0.12.0) (2026-04-29)


### Features

* **events:** emit Rider.tag on every rider-bearing event ([#545](https://github.com/andymai/elevator-core/issues/545)) ([0456239](https://github.com/andymai/elevator-core/commit/045623914954e8a66ac0517a2708a200828c7e99))

## [0.11.0](https://github.com/andymai/elevator-core/compare/elevator-wasm-v0.10.0...elevator-wasm-v0.11.0) (2026-04-29)


### Features

* **core:** per-elevator home_stop pin overrides reposition strategy ([#543](https://github.com/andymai/elevator-core/issues/543)) ([842daa0](https://github.com/andymai/elevator-core/commit/842daa0a142d1d1d05b5eba5f741cc340d190a9b))

## [0.10.0](https://github.com/andymai/elevator-core/compare/elevator-wasm-v0.9.0...elevator-wasm-v0.10.0) (2026-04-29)


### Features

* **core:** per-rider opaque tag for consumer back-pointers ([#541](https://github.com/andymai/elevator-core/issues/541)) ([68524a5](https://github.com/andymai/elevator-core/commit/68524a55c625398fc9d9bf114942c26ca6c43b2a))

## [0.9.0](https://github.com/andymai/elevator-core/compare/elevator-wasm-v0.8.0...elevator-wasm-v0.9.0) (2026-04-29)


### Features

* **wasm:** empty() static constructor for entity-free sims ([#539](https://github.com/andymai/elevator-core/issues/539)) ([892aebc](https://github.com/andymai/elevator-core/commit/892aebc1f687c148ed80b2eb8af0a002a2602a7e))

## [0.8.0](https://github.com/andymai/elevator-core/compare/elevator-wasm-v0.7.0...elevator-wasm-v0.8.0) (2026-04-29)


### Features

* **wasm:** spawnRider returns the rider ref (matches spawnRiderByRef) ([#537](https://github.com/andymai/elevator-core/issues/537)) ([685fb8b](https://github.com/andymai/elevator-core/commit/685fb8bcc8240c6d3b1a1786806d1928db2dac54))

## [0.7.0](https://github.com/andymai/elevator-core/compare/elevator-wasm-v0.6.0...elevator-wasm-v0.7.0) (2026-04-29)


### Features

* **wasm:** per-elevator setters for door/speed/capacity ([#534](https://github.com/andymai/elevator-core/issues/534)) ([0df6be0](https://github.com/andymai/elevator-core/commit/0df6be040655737d1edafa7a1f345f2c7c69999d))

## [0.6.0](https://github.com/andymai/elevator-core/compare/elevator-wasm-v0.5.0...elevator-wasm-v0.6.0) (2026-04-28)


### Features

* **core:** deterministic-fp feature flag for cross-host bit equality ([#532](https://github.com/andymai/elevator-core/issues/532)) ([02ea743](https://github.com/andymai/elevator-core/commit/02ea743cc07bc31473cba8b2db51232983e74599))

## [0.5.0](https://github.com/andymai/elevator-core/compare/elevator-wasm-v0.4.0...elevator-wasm-v0.5.0) (2026-04-28)


### Features

* snapshot_checksum on Simulation + WasmSim ([#530](https://github.com/andymai/elevator-core/issues/530)) ([dbca2c4](https://github.com/andymai/elevator-core/commit/dbca2c4445b4e169803f4ee8bbf9eaa28bc8ce79))

## [0.4.0](https://github.com/andymai/elevator-core/compare/elevator-wasm-v0.3.0...elevator-wasm-v0.4.0) (2026-04-28)


### Features

* **wasm:** add positions_at_packed batched readout ([#528](https://github.com/andymai/elevator-core/issues/528)) ([672d5d0](https://github.com/andymai/elevator-core/commit/672d5d05db0d2306d884760ef20537afa860b45b))

## [0.3.0](https://github.com/andymai/elevator-core/compare/elevator-wasm-v0.2.0...elevator-wasm-v0.3.0) (2026-04-27)


### ⚠ BREAKING CHANGES

* **wasm:** migrate remaining 52 fallible methods to Result-shape (PR-E phase 2) ([#509](https://github.com/andymai/elevator-core/issues/509))

### Features

* **wasm:** migrate remaining 52 fallible methods to Result-shape (PR-E phase 2) ([#509](https://github.com/andymai/elevator-core/issues/509)) ([52e4fce](https://github.com/andymai/elevator-core/commit/52e4fcebdd89835f62b33408562d82a0a5c6884f))

## [0.2.0](https://github.com/andymai/elevator-core/compare/elevator-wasm-v0.1.0...elevator-wasm-v0.2.0) (2026-04-27)


### Features

* add elevator-wasm crate with wasm-bindgen surface ([#227](https://github.com/andymai/elevator-core/issues/227)) ([c0e080e](https://github.com/andymai/elevator-core/commit/c0e080ee05dcd4af738c81bd5c8e9742b9a7e553))
* **bindings:** add mode APIs to wasm and FFI (PR-D) ([#475](https://github.com/andymai/elevator-core/issues/475)) ([884a839](https://github.com/andymai/elevator-core/commit/884a839fc3d509743eb7e5b8f13938a27c9f123b))
* **bindings:** add route mutators (setRiderRoute, rerouteRider) ([#503](https://github.com/andymai/elevator-core/issues/503)) ([4650107](https://github.com/andymai/elevator-core/commit/4650107441ef5904ddfe107eb4c1bb41ebde45e5))
* **bindings:** add stop_lookup_iter to wasm and FFI ([#493](https://github.com/andymai/elevator-core/issues/493)) ([9bde897](https://github.com/andymai/elevator-core/commit/9bde8972116cc9f61d38450f5cd0619a4c80c92c))
* **bindings:** add tagging APIs to wasm and FFI ([#487](https://github.com/andymai/elevator-core/issues/487)) ([0771a1b](https://github.com/andymai/elevator-core/commit/0771a1bb53519c3c482b31569aa1bc2f80ebb8e0))
* **core:** per-line stop-at-position lookup ([#457](https://github.com/andymai/elevator-core/issues/457)) ([c202768](https://github.com/andymai/elevator-core/commit/c2027680542fac9c6c5fde87645eb15bbe935b7e))
* **dispatch:** AdaptiveParking reposition — gates by TrafficMode ([#366](https://github.com/andymai/elevator-core/issues/366)) ([3b46cd6](https://github.com/andymai/elevator-core/commit/3b46cd6c8ac0f371db95832c442d40c9b97ae3f1))
* **dispatch:** per-line hall-call assignment ([#438](https://github.com/andymai/elevator-core/issues/438)) ([aed059c](https://github.com/andymai/elevator-core/commit/aed059c962f60e799072f2ea85a15610017a3728))
* **playground:** add manual-control demo with cabin cutaway ([#464](https://github.com/andymai/elevator-core/issues/464)) ([c1b6170](https://github.com/andymai/elevator-core/commit/c1b6170e1d96703a1d0ed3e4010f8fdfbe9613fb))
* **playground:** direction-split queues, target markers, flying-dot animations ([#315](https://github.com/andymai/elevator-core/issues/315)) ([3bab3d0](https://github.com/andymai/elevator-core/commit/3bab3d0f046eaa2df0683c68e930340379b8fd33))
* **playground:** expose RsrDispatch in the strategy picker ([#365](https://github.com/andymai/elevator-core/issues/365)) ([9277e99](https://github.com/andymai/elevator-core/commit/9277e995b83b51233f31fec39df3a522222da032))
* **playground:** live TrafficMode badge in each pane header ([#373](https://github.com/andymai/elevator-core/issues/373)) ([c880047](https://github.com/andymai/elevator-core/commit/c88004755d7470349b748189f3d185302be44bdd))
* **playground:** replace wasm-pack with wasm-bindgen-cli + auto TS types ([#395](https://github.com/andymai/elevator-core/issues/395)) ([13d70c9](https://github.com/andymai/elevator-core/commit/13d70c92fffb88324abf1bade6d9b333826867d1))
* **playground:** rider abandonment + headless audit tool ([#326](https://github.com/andymai/elevator-core/issues/326)) ([ebe6bc6](https://github.com/andymai/elevator-core/commit/ebe6bc67e995ae4018a4e088893006237e617fc5))
* **playground:** side-by-side strategy comparator + mobile-friendly UI ([#243](https://github.com/andymai/elevator-core/issues/243)) ([5dd5487](https://github.com/andymai/elevator-core/commit/5dd5487e738ee3a2e55c302492e626dedccad8b8))
* **playground:** six phased scenarios with commercial-feature hooks ([#323](https://github.com/andymai/elevator-core/issues/323)) ([f2428a2](https://github.com/andymai/elevator-core/commit/f2428a28d9d6c94ab59738647b1c39e679caae62))
* **playground:** skyscraper multi-zone + SimTower canvas + reposition cooldown ([#385](https://github.com/andymai/elevator-core/issues/385)) ([cab6a07](https://github.com/andymai/elevator-core/commit/cab6a07d534982a46dd21b77875f44e21900d15e))
* **playground:** user-tweakable building physics drawer ([#333](https://github.com/andymai/elevator-core/issues/333)) ([a975195](https://github.com/andymai/elevator-core/commit/a9751957084dcdceff462ef085633c738a177385))
* **skystack:** replace SCAN scheduler with elevator-core wasm ([#454](https://github.com/andymai/elevator-core/issues/454)) ([66bba3e](https://github.com/andymai/elevator-core/commit/66bba3e704f8501e575238f09ed9c58d53e5e4ad))
* **wasm:** add destinations + population queries ([#479](https://github.com/andymai/elevator-core/issues/479)) ([2325a09](https://github.com/andymai/elevator-core/commit/2325a0935857b8e3f68669b5bf0ab7aff97fe273))
* **wasm:** add dispatch introspection (PR-B wave 2B) ([#476](https://github.com/andymai/elevator-core/issues/476)) ([7012ff0](https://github.com/andymai/elevator-core/commit/7012ff0007bc101d6239872d9b72283a5486004d))
* **wasm:** add HallCallDto + CarCallDto + hallCalls/carCalls ([#497](https://github.com/andymai/elevator-core/issues/497)) ([1aeefa1](https://github.com/andymai/elevator-core/commit/1aeefa15cb9d17aec636882a3a85ed45ce2cddf3))
* **wasm:** add per-elevator introspection accessors ([#477](https://github.com/andymai/elevator-core/issues/477)) ([5c9c740](https://github.com/andymai/elevator-core/commit/5c9c740544657ad580f98ee887c8e2de8ddd0109))
* **wasm:** add RouteDto + shortestRoute binding ([#495](https://github.com/andymai/elevator-core/issues/495)) ([0d241f0](https://github.com/andymai/elevator-core/commit/0d241f049eee11b97959ebbb67b1b0ba103ac832))
* **wasm:** add TaggedMetricDto + metricsForTag binding ([#496](https://github.com/andymai/elevator-core/issues/496)) ([fe78347](https://github.com/andymai/elevator-core/commit/fe783479fc6cd294068e50eb5c23c82151d845dd))
* **wasm:** add WorldView DTO for game-facing renderers ([#453](https://github.com/andymai/elevator-core/issues/453)) ([5a8192f](https://github.com/andymai/elevator-core/commit/5a8192f770a5c13d0baf4e6bcfe30eda9fc3ef97))
* **wasm:** elevatorsInPhase + skip drain_events_where ([#498](https://github.com/andymai/elevator-core/issues/498)) ([6cc973f](https://github.com/andymai/elevator-core/commit/6cc973f539b19bb008da5ab8d052697b491c817e))
* **wasm:** expose granular topology mutation API ([#450](https://github.com/andymai/elevator-core/issues/450)) ([120cf8a](https://github.com/andymai/elevator-core/commit/120cf8a538b96e51fa7547e34c9c81f0cff782e3))
* **wasm:** full Event DTO coverage (38 new variants) + pendingEvents ([#494](https://github.com/andymai/elevator-core/issues/494)) ([3629429](https://github.com/andymai/elevator-core/commit/3629429de56240f9cc63f59037672c9d1a1e4e49))
* **wasm:** introduce Result-shaped object types (PR-E phase 1) ([#508](https://github.com/andymai/elevator-core/issues/508)) ([c64ad65](https://github.com/andymai/elevator-core/commit/c64ad65b5d64ed90b3c671c0137bc2b70fb65fb5))
* **wasm:** per-elevator setters + lifecycle ([#488](https://github.com/andymai/elevator-core/issues/488)) ([c3d53be](https://github.com/andymai/elevator-core/commit/c3d53be4a77702f8cec0650ff671b8ec5608af53))
* **wasm:** rider routes + reachability queries ([#485](https://github.com/andymai/elevator-core/issues/485)) ([907bf3a](https://github.com/andymai/elevator-core/commit/907bf3ae82c9718fcbeb88c318d0ad93d13cc714))
* **wasm:** stop lookup + phase/direction queries ([#489](https://github.com/andymai/elevator-core/issues/489)) ([e9c4985](https://github.com/andymai/elevator-core/commit/e9c4985dc0893839b6316d4dd4cd6c757270f628))
* **wasm:** topology introspection + lifecycle helpers ([#482](https://github.com/andymai/elevator-core/issues/482)) ([33c395b](https://github.com/andymai/elevator-core/commit/33c395b24cb7b3a9ba3b38231ddc760269bcdf56))
* **wasm:** topology mutation extras ([#484](https://github.com/andymai/elevator-core/issues/484)) ([d06d6bf](https://github.com/andymai/elevator-core/commit/d06d6bff3e093d326e09e44af24f3c153ad6de6f))


### Bug Fixes

* **playground:** default reposition to PredictiveParking, not SpreadEvenly ([#358](https://github.com/andymai/elevator-core/issues/358)) ([80f4bd6](https://github.com/andymai/elevator-core/commit/80f4bd61fa6596351d8ebfb00d1badf0f24df5f7))
* **session-review:** snapshot + reroute destination-log + perf + wasm registry ([#377](https://github.com/andymai/elevator-core/issues/377)) ([ca4c25a](https://github.com/andymai/elevator-core/commit/ca4c25aad1857a9620e97ef98aeab244b663310f))
* **wasm:** sync HallCallMode when switching to/from DCS dispatch ([#400](https://github.com/andymai/elevator-core/issues/400)) ([e904e5b](https://github.com/andymai/elevator-core/commit/e904e5b60b86390b9d43d803b82b8416f7b95223))
* **wasm:** use tsify instead of unmaintained tsify-next ([#396](https://github.com/andymai/elevator-core/issues/396)) ([e6b23d4](https://github.com/andymai/elevator-core/commit/e6b23d4c5547fcfd5bc47f4b792bd74c57b040c1))


### Reverts

* drop manual-control demo ([#464](https://github.com/andymai/elevator-core/issues/464), [#465](https://github.com/andymai/elevator-core/issues/465)) ([#471](https://github.com/andymai/elevator-core/issues/471)) ([afd1c00](https://github.com/andymai/elevator-core/commit/afd1c001508e09ba751d60d094bfaae343c74b9f))
