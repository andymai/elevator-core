window.BENCHMARK_DATA = {
  "lastUpdate": 1787300688842,
  "repoUrl": "https://github.com/andymai/elevator-core",
  "entries": {
    "Benchmark": [
      {
        "commit": {
          "author": {
            "name": "Andy Aragon",
            "username": "andymai",
            "email": "hi@andymai.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "0f9de844b62f66b034928fa6860e63c4aa098b83",
          "message": "fix(ci): publish bench history from Criterion JSON estimates (#922)\n\n## Problem\n`Publish bench history` fails with `No benchmark result was found in\nbench-output.log`. `github-action-benchmark`'s `cargo` parser expects\nlibtest bencher lines (`test NAME ... bench: N ns/iter (+/- M)`), but\n**Criterion never emits that format** — its `bench-output.log` uses\n`NAME time: [lo mid hi]`.\n\nThe log can't just be reformatted: the `Detect regressions` step parses\nCriterion's native output from the same file. And parsing the log for\nnames is unreliable — Criterion drops the name prefix on many `time:`\nlines in non-TTY runs.\n\n(My earlier PR #921 fixed a *different*, real bug — cargo build output\npolluting the log — which is why `Run benchmarks` now passes. This is\nthe second, underlying bug.)\n\n## Fix\nAdd `criterion-to-bencher.py`, which reads Criterion's machine-readable\n`target/criterion/*/new/estimates.json` (names from the dir path, values\nin ns) and emits bencher lines to `bench-bencher.txt`. Point the publish\nstep at that file; `bench-output.log` is untouched for the detector.\n\n## Verification\nRan the converter against the **real artifact** from the last failed\nrun: **all 54 benchmarks convert and 100% match\ngithub-action-benchmark's exact cargo regex.** Values cross-check\nagainst the log (e.g. `dispatch/3e_10s` = 7476 ns ≈ the log's 7.6 µs).\nFinal gh-pages publish will confirm on a dispatched run.",
          "timestamp": "2026-07-16T11:58:28Z",
          "url": "https://github.com/andymai/elevator-core/commit/0f9de844b62f66b034928fa6860e63c4aa098b83"
        },
        "date": 1784203945918,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 4424939,
            "range": "± 5658",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 628803,
            "range": "± 9298",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 625985,
            "range": "± 6360",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 734750,
            "range": "± 5607",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 580428,
            "range": "± 3685",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 37508,
            "range": "± 1940",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 9159,
            "range": "± 5891",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3454137,
            "range": "± 35825",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15357570,
            "range": "± 117729",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 605260,
            "range": "± 7760",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1963639,
            "range": "± 5802",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 8943114,
            "range": "± 47654",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 299005,
            "range": "± 1027",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1908095,
            "range": "± 40363",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8741499,
            "range": "± 368481",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 289394,
            "range": "± 1178",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1850607,
            "range": "± 12280",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8437827,
            "range": "± 113552",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 282739,
            "range": "± 1324",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1861159,
            "range": "± 14524",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8380592,
            "range": "± 65110",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 284602,
            "range": "± 3815",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1907914,
            "range": "± 27304",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8575277,
            "range": "± 194953",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 279777,
            "range": "± 1975",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 5602,
            "range": "± 8311",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 4889,
            "range": "± 7774",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 4978,
            "range": "± 3635",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 5109,
            "range": "± 1809",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 24861,
            "range": "± 3759",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3299238,
            "range": "± 9404",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3185105,
            "range": "± 92472",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 7296,
            "range": "± 5814",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 21816,
            "range": "± 10837",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 9748,
            "range": "± 1950",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 108204,
            "range": "± 14183",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 18192,
            "range": "± 3440",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 904397,
            "range": "± 46443",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 112857,
            "range": "± 21270",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 19167,
            "range": "± 5025",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 936053,
            "range": "± 32550",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 109796,
            "range": "± 19579",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 21697,
            "range": "± 5863",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 6004328556,
            "range": "± 34579098",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 80995141,
            "range": "± 330508",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 18476563,
            "range": "± 82083",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 64940804,
            "range": "± 209778",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8492071,
            "range": "± 189826",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 37591,
            "range": "± 3193",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 15732,
            "range": "± 4239",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 7527,
            "range": "± 8967",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 236277,
            "range": "± 7850",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 223717,
            "range": "± 17220",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 143552,
            "range": "± 16047",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Andy Aragon",
            "username": "andymai",
            "email": "hi@andymai.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "0f9de844b62f66b034928fa6860e63c4aa098b83",
          "message": "fix(ci): publish bench history from Criterion JSON estimates (#922)\n\n## Problem\n`Publish bench history` fails with `No benchmark result was found in\nbench-output.log`. `github-action-benchmark`'s `cargo` parser expects\nlibtest bencher lines (`test NAME ... bench: N ns/iter (+/- M)`), but\n**Criterion never emits that format** — its `bench-output.log` uses\n`NAME time: [lo mid hi]`.\n\nThe log can't just be reformatted: the `Detect regressions` step parses\nCriterion's native output from the same file. And parsing the log for\nnames is unreliable — Criterion drops the name prefix on many `time:`\nlines in non-TTY runs.\n\n(My earlier PR #921 fixed a *different*, real bug — cargo build output\npolluting the log — which is why `Run benchmarks` now passes. This is\nthe second, underlying bug.)\n\n## Fix\nAdd `criterion-to-bencher.py`, which reads Criterion's machine-readable\n`target/criterion/*/new/estimates.json` (names from the dir path, values\nin ns) and emits bencher lines to `bench-bencher.txt`. Point the publish\nstep at that file; `bench-output.log` is untouched for the detector.\n\n## Verification\nRan the converter against the **real artifact** from the last failed\nrun: **all 54 benchmarks convert and 100% match\ngithub-action-benchmark's exact cargo regex.** Values cross-check\nagainst the log (e.g. `dispatch/3e_10s` = 7476 ns ≈ the log's 7.6 µs).\nFinal gh-pages publish will confirm on a dispatched run.",
          "timestamp": "2026-07-16T11:58:28Z",
          "url": "https://github.com/andymai/elevator-core/commit/0f9de844b62f66b034928fa6860e63c4aa098b83"
        },
        "date": 1784278632798,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 3940041,
            "range": "± 88852",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 615938,
            "range": "± 1461",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 605545,
            "range": "± 12091",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 713030,
            "range": "± 534",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 562657,
            "range": "± 3641",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 35324,
            "range": "± 3582",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 7700,
            "range": "± 590",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3408569,
            "range": "± 79795",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15431528,
            "range": "± 194420",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 565074,
            "range": "± 3391",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1880129,
            "range": "± 6223",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 9337957,
            "range": "± 109366",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 270802,
            "range": "± 3543",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1836916,
            "range": "± 10574",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 9023669,
            "range": "± 118242",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 263019,
            "range": "± 2175",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1796748,
            "range": "± 44053",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8849364,
            "range": "± 126426",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 259832,
            "range": "± 1405",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1793756,
            "range": "± 48545",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8773021,
            "range": "± 83528",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 258050,
            "range": "± 2762",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1836775,
            "range": "± 5578",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 9017370,
            "range": "± 50214",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 260252,
            "range": "± 1845",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 3675,
            "range": "± 311",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 3937,
            "range": "± 3828",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 4520,
            "range": "± 1944",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4299,
            "range": "± 2296",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 23055,
            "range": "± 5442",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3285581,
            "range": "± 19222",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3090033,
            "range": "± 7382",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 6259,
            "range": "± 7770",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 16879,
            "range": "± 674",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 10075,
            "range": "± 10364",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 89822,
            "range": "± 1986",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 16548,
            "range": "± 2566",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 874336,
            "range": "± 29539",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 113027,
            "range": "± 239919",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 15373,
            "range": "± 3067",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 862554,
            "range": "± 32783",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 94473,
            "range": "± 9847",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 18678,
            "range": "± 4445",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 5345110651,
            "range": "± 36567031",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 76501338,
            "range": "± 508360",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 18361160,
            "range": "± 56486",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 63105276,
            "range": "± 338403",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8255763,
            "range": "± 13546",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 35560,
            "range": "± 1771",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 14234,
            "range": "± 2931",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 6388,
            "range": "± 2870",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 207282,
            "range": "± 8798",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 200945,
            "range": "± 15226",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 137112,
            "range": "± 14829",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Andy Aragon",
            "username": "andymai",
            "email": "hi@andymai.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "0f9de844b62f66b034928fa6860e63c4aa098b83",
          "message": "fix(ci): publish bench history from Criterion JSON estimates (#922)\n\n## Problem\n`Publish bench history` fails with `No benchmark result was found in\nbench-output.log`. `github-action-benchmark`'s `cargo` parser expects\nlibtest bencher lines (`test NAME ... bench: N ns/iter (+/- M)`), but\n**Criterion never emits that format** — its `bench-output.log` uses\n`NAME time: [lo mid hi]`.\n\nThe log can't just be reformatted: the `Detect regressions` step parses\nCriterion's native output from the same file. And parsing the log for\nnames is unreliable — Criterion drops the name prefix on many `time:`\nlines in non-TTY runs.\n\n(My earlier PR #921 fixed a *different*, real bug — cargo build output\npolluting the log — which is why `Run benchmarks` now passes. This is\nthe second, underlying bug.)\n\n## Fix\nAdd `criterion-to-bencher.py`, which reads Criterion's machine-readable\n`target/criterion/*/new/estimates.json` (names from the dir path, values\nin ns) and emits bencher lines to `bench-bencher.txt`. Point the publish\nstep at that file; `bench-output.log` is untouched for the detector.\n\n## Verification\nRan the converter against the **real artifact** from the last failed\nrun: **all 54 benchmarks convert and 100% match\ngithub-action-benchmark's exact cargo regex.** Values cross-check\nagainst the log (e.g. `dispatch/3e_10s` = 7476 ns ≈ the log's 7.6 µs).\nFinal gh-pages publish will confirm on a dispatched run.",
          "timestamp": "2026-07-16T11:58:28Z",
          "url": "https://github.com/andymai/elevator-core/commit/0f9de844b62f66b034928fa6860e63c4aa098b83"
        },
        "date": 1784364414815,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 3940522,
            "range": "± 5166",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 619277,
            "range": "± 3419",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 599148,
            "range": "± 3061",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 712466,
            "range": "± 2384",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 559444,
            "range": "± 3993",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 35452,
            "range": "± 2835",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 7739,
            "range": "± 317",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3441287,
            "range": "± 19634",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15357514,
            "range": "± 121112",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 577753,
            "range": "± 2369",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1909048,
            "range": "± 6668",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 9257433,
            "range": "± 33532",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 275890,
            "range": "± 4783",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1860839,
            "range": "± 15413",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8855134,
            "range": "± 75800",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 269762,
            "range": "± 1951",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1799687,
            "range": "± 7339",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8652381,
            "range": "± 54724",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 262473,
            "range": "± 1842",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1802363,
            "range": "± 11159",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8660758,
            "range": "± 36678",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 262107,
            "range": "± 744",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1839426,
            "range": "± 5543",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8848892,
            "range": "± 33512",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 261492,
            "range": "± 1913",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 5094,
            "range": "± 12662",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 3607,
            "range": "± 1212",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 5009,
            "range": "± 7261",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4881,
            "range": "± 7053",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 21826,
            "range": "± 442",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3311044,
            "range": "± 5112",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3113161,
            "range": "± 5439",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 8259,
            "range": "± 30447",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 17277,
            "range": "± 5246",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 8530,
            "range": "± 9204",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 92008,
            "range": "± 4611",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 16629,
            "range": "± 2541",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 809821,
            "range": "± 7541",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 84589,
            "range": "± 1364",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 15068,
            "range": "± 2287",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 833756,
            "range": "± 12340",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 88290,
            "range": "± 13214",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 16114,
            "range": "± 2593",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 5376136462,
            "range": "± 16736115",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 77059680,
            "range": "± 276636",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 18439960,
            "range": "± 33109",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 63183837,
            "range": "± 152700",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8310939,
            "range": "± 27655",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 34376,
            "range": "± 820",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 13814,
            "range": "± 529",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 6194,
            "range": "± 313",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 204653,
            "range": "± 6199",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 199035,
            "range": "± 6410",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 135779,
            "range": "± 28095",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Andy Aragon",
            "username": "andymai",
            "email": "hi@andymai.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "0f9de844b62f66b034928fa6860e63c4aa098b83",
          "message": "fix(ci): publish bench history from Criterion JSON estimates (#922)\n\n## Problem\n`Publish bench history` fails with `No benchmark result was found in\nbench-output.log`. `github-action-benchmark`'s `cargo` parser expects\nlibtest bencher lines (`test NAME ... bench: N ns/iter (+/- M)`), but\n**Criterion never emits that format** — its `bench-output.log` uses\n`NAME time: [lo mid hi]`.\n\nThe log can't just be reformatted: the `Detect regressions` step parses\nCriterion's native output from the same file. And parsing the log for\nnames is unreliable — Criterion drops the name prefix on many `time:`\nlines in non-TTY runs.\n\n(My earlier PR #921 fixed a *different*, real bug — cargo build output\npolluting the log — which is why `Run benchmarks` now passes. This is\nthe second, underlying bug.)\n\n## Fix\nAdd `criterion-to-bencher.py`, which reads Criterion's machine-readable\n`target/criterion/*/new/estimates.json` (names from the dir path, values\nin ns) and emits bencher lines to `bench-bencher.txt`. Point the publish\nstep at that file; `bench-output.log` is untouched for the detector.\n\n## Verification\nRan the converter against the **real artifact** from the last failed\nrun: **all 54 benchmarks convert and 100% match\ngithub-action-benchmark's exact cargo regex.** Values cross-check\nagainst the log (e.g. `dispatch/3e_10s` = 7476 ns ≈ the log's 7.6 µs).\nFinal gh-pages publish will confirm on a dispatched run.",
          "timestamp": "2026-07-16T11:58:28Z",
          "url": "https://github.com/andymai/elevator-core/commit/0f9de844b62f66b034928fa6860e63c4aa098b83"
        },
        "date": 1784451619417,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 3944157,
            "range": "± 78909",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 613875,
            "range": "± 2932",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 598092,
            "range": "± 3116",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 708257,
            "range": "± 1055",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 556472,
            "range": "± 2065",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 33792,
            "range": "± 1048",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 7441,
            "range": "± 272",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3429259,
            "range": "± 40626",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15333307,
            "range": "± 177880",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 572398,
            "range": "± 1061",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1892370,
            "range": "± 11664",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 9215231,
            "range": "± 32591",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 275737,
            "range": "± 1602",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1841680,
            "range": "± 25074",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8880204,
            "range": "± 50714",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 272353,
            "range": "± 3466",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1785551,
            "range": "± 22093",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8722395,
            "range": "± 188253",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 260565,
            "range": "± 1923",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1780937,
            "range": "± 8232",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8729400,
            "range": "± 140511",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 261737,
            "range": "± 2220",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1830958,
            "range": "± 5879",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8868032,
            "range": "± 37489",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 257381,
            "range": "± 3130",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 3938,
            "range": "± 3640",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 3555,
            "range": "± 967",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 4902,
            "range": "± 8376",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4067,
            "range": "± 2131",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 22483,
            "range": "± 4698",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3253765,
            "range": "± 7294",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3077587,
            "range": "± 3268",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 7427,
            "range": "± 21296",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 16707,
            "range": "± 353",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 8484,
            "range": "± 7958",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 89384,
            "range": "± 4738",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 16404,
            "range": "± 2329",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 809856,
            "range": "± 16929",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 85501,
            "range": "± 7163",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 15179,
            "range": "± 2450",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 834424,
            "range": "± 6482",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 88074,
            "range": "± 5688",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 16268,
            "range": "± 2257",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 5336943843,
            "range": "± 22512161",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 75355926,
            "range": "± 156824",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 18368435,
            "range": "± 223176",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 62264135,
            "range": "± 220585",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8185616,
            "range": "± 57967",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 34071,
            "range": "± 1631",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 14434,
            "range": "± 7039",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 6673,
            "range": "± 4997",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 203240,
            "range": "± 7349",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 197433,
            "range": "± 12938",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 132992,
            "range": "± 12747",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Andy Aragon",
            "username": "andymai",
            "email": "hi@andymai.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "b6a713080b91f0f41ba396ab64d60a6d7914c562",
          "message": "ci(bench): detect regressions against a rolling median of nightlies (#933)\n\nReplaces #932, which GitHub auto-closed when its base branch\n(`ci/bench-calibration-damping`, the #931 branch) was deleted on merge.\nSame content, rebuilt as a single commit on top of `main`, with\ngreptile's review findings from #932 already folded in.\n\nFixes the structural half of #923/#924. #931 stopped calibration from\nmanufacturing regressions; this stops the gate from being unable to\nconfirm real ones.\n\n## The bug\n\nThe per-SHA baseline lock and the two-day persistence gate cannot both\nwork:\n\n1. The lock freezes the comparison point at the **first** nightly to\nmeasure a commit.\n2. So a real regression is visible on exactly **one** night — the\nnightly right after the new SHA lands, compared against the prior SHA's\nbaseline.\n3. That same night re-locks the baseline. Every night after compares the\nSHA **against itself**, where no code difference is representable.\n4. The gate only files when a bench regresses on **two consecutive**\nnightlies.\n\nA genuine regression's signal appears once and is then baselined away,\nso it can never be confirmed. Noise, which does recur on same-SHA\nnights, is the only thing the gate can ever confirm. Four consecutive\nnightlies ran on `0f9de844`, and #923/#924 were filed off\nself-comparisons of that commit.\n\n## The fix\n\nBaseline is now the per-bench median of the last 7 nightly measurements,\nread from Criterion's `estimates.json` rather than its `change:` lines:\n\n- A single unusually fast or slow runner moves the median by one sample\nout of seven, so the comparison point is stable night to night. That is\nwhat the per-SHA freeze was reaching for, without freezing.\n- A real regression stays above the median for several consecutive\nnights after landing, until enough post-regression samples drag the\nmedian up. **That is what makes the persistence gate meaningful for the\nfirst time.**\n\nCalibration still divides runner speed out, computed the same way\n(tonight vs its own median), still clamped to damping-only per #931.\n\nCache changes: the per-SHA `criterion-baseline-*` cache is replaced by a\nrolling `bench-history-*` cache keyed by `run_id` with prefix fallback.\nIt keeps `RUSTC_VER` in the key — absolute timings are\ncompiler-dependent, so a history must never span toolchains (#884).\nWrites are `schedule`-only so a `workflow_dispatch` preview cannot\ninject a sample.\n\n## Verification\n\nReplayed against the real 54-bench criterion tree from the failing\nnightly (run 29680411190), with every bench on the previous-night list\nso the two-day gate applies:\n\n| scenario | result |\n|---|---|\n| stable night (tonight == median) | `regressed=false` |\n| the #923/#924 shape (+3% benches, −10.9% calibration) |\n`regressed=false` |\n| genuine +20% on `dispatch_comparison/etd_50e_200s` | `regressed=true`,\nonly that bench flagged |\n| whole suite 12% slower (runner) | `regressed=false` |\n\n23 unit tests, including one that walks two nights in sequence to assert\na real regression survives into night two and is confirmed — the\nproperty the old scheme structurally could not have.\n\n## Review findings from #932, already applied\n\n- **Issue creation is now `schedule`-only.** A dispatch run restores the\nlast nightly's regression list and compares against the same history, so\nit would re-confirm a live regression and file a duplicate issue without\na night boundary passing. The cache-write guards already assumed\ndispatch was a read-only preview; the issue step did not match.\n- **A missing calibration bench is now distinguished from a warming-up\nhistory.** Both previously printed \"expected during warmup\", so\n`calibration_bench` failing outright looked benign.\n- **Bench ids resolve relative to the criterion root** rather than by\nlocating a `\"criterion\"` path component, which mis-keyed a bench group\nnamed `criterion`.\n- Fixed a duplicated word in the no-regression message.\n\n## Warm-up\n\nPer bench, fewer than 3 prior samples means it is recorded but not\ngated, so the first two nightlies after this lands report nothing while\nhistory accumulates. Warm-up is per bench, so newly added benches do not\nmute established ones.\n\n## Also\n\nAdds a `Bench script tests` CI job. These unit tests previously ran\nnowhere — the nightly executes at 08:00 UTC, so a bug in the detection\nmath surfaced as a bogus issue the next morning instead of on the PR\nthat caused it. (This also meant #932 itself got no real CI, since\n`ci.yml` only triggers on PRs based on `main`.)\n\n<!-- This is an auto-generated description by cubic. -->\n---\n## Summary by cubic\nDetect regressions against a rolling median of the last 7 nightlies\ninstead of a per-SHA baseline, so real regressions are confirmed and\nnoise is ignored. Also adds unit tests and updates workflows to use a\nrolling history keyed by `RUSTC_VER`.\n\n- **Bug Fixes**\n- Compare each bench to the median of its last 7 nightlies (from\n`estimates.json`) instead of a frozen per-SHA baseline, so regressions\npersist across nights and the two-day gate works.\n- Keep runner-speed correction via `calibration/fixed_workload` vs its\nown median, clamped to damping-only.\n- Warm-up: benches with fewer than 3 samples are recorded but not gated.\n\n- **Refactors**\n- Replace `.github/scripts/filter-bench-regressions.py` with\n`.github/scripts/detect-bench-regressions.py`; add unit tests and run\nthem in CI.\n- Use a rolling `bench-history.json` cache keyed by\n`bench-history-${ref}-${RUSTC_VER}-${run_id}` with prefix fallback;\nwrites are `schedule`-only. Issue creation is also `schedule`-only to\navoid duplicates from `workflow_dispatch`.\n- Update nightly workflow to restore/save history and the previous-night\nregression list; detector reads `target/criterion`, adjusts by\ncalibration, and sets `regressed`/`gate` outputs.\n\n<sup>Written for commit 5322bca416921d72d397287651a70f5543e81a5b.\nSummary will update on new commits.</sup>\n\n<a\nhref=\"https://cubic.dev/pr/andymai/elevator-core/pull/933?utm_source=github\"\ntarget=\"_blank\" rel=\"noopener noreferrer\"\ndata-no-image-dialog=\"true\"><picture><source\nmedia=\"(prefers-color-scheme: dark)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"><source\nmedia=\"(prefers-color-scheme: light)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-light.svg\"><img\nalt=\"Review in cubic\"\nsrc=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"></picture></a>\n\n<!-- End of auto-generated description by cubic. -->",
          "timestamp": "2026-07-19T21:16:50Z",
          "url": "https://github.com/andymai/elevator-core/commit/b6a713080b91f0f41ba396ab64d60a6d7914c562"
        },
        "date": 1784538987059,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 4225555,
            "range": "± 21111",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 594424,
            "range": "± 695",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 623498,
            "range": "± 7007",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 731155,
            "range": "± 1862",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 548242,
            "range": "± 1268",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 36767,
            "range": "± 2702",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 8050,
            "range": "± 669",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3310958,
            "range": "± 16041",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15733664,
            "range": "± 67283",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 520095,
            "range": "± 2321",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1934930,
            "range": "± 18132",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 9717819,
            "range": "± 87278",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 254478,
            "range": "± 3585",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1889040,
            "range": "± 5771",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 9444075,
            "range": "± 69273",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 248953,
            "range": "± 5262",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1827711,
            "range": "± 8594",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 9273500,
            "range": "± 92437",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 240909,
            "range": "± 903",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1838630,
            "range": "± 26273",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 9208676,
            "range": "± 79794",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 240368,
            "range": "± 2405",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1866109,
            "range": "± 14190",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 9438015,
            "range": "± 80279",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 228389,
            "range": "± 5645",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 5025,
            "range": "± 6132",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 4183,
            "range": "± 860",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 5618,
            "range": "± 6257",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4838,
            "range": "± 1122",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 21448,
            "range": "± 3321",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3249987,
            "range": "± 39101",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3284684,
            "range": "± 25112",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 7902,
            "range": "± 13394",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 19121,
            "range": "± 1295",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 9243,
            "range": "± 3088",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 100240,
            "range": "± 4610",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 18194,
            "range": "± 3088",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 944421,
            "range": "± 19301",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 99054,
            "range": "± 5496",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 15794,
            "range": "± 3399",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 920508,
            "range": "± 16674",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 99702,
            "range": "± 5068",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 18036,
            "range": "± 3264",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 4926953389,
            "range": "± 70378253",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 73475639,
            "range": "± 245511",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 17798401,
            "range": "± 108468",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 52992904,
            "range": "± 173190",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 7893251,
            "range": "± 14029",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 34748,
            "range": "± 896",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 14529,
            "range": "± 250",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 5755,
            "range": "± 296",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 185220,
            "range": "± 8328",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 178964,
            "range": "± 7420",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 126021,
            "range": "± 10132",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Andy Aragon",
            "username": "andymai",
            "email": "hi@andymai.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "b6a713080b91f0f41ba396ab64d60a6d7914c562",
          "message": "ci(bench): detect regressions against a rolling median of nightlies (#933)\n\nReplaces #932, which GitHub auto-closed when its base branch\n(`ci/bench-calibration-damping`, the #931 branch) was deleted on merge.\nSame content, rebuilt as a single commit on top of `main`, with\ngreptile's review findings from #932 already folded in.\n\nFixes the structural half of #923/#924. #931 stopped calibration from\nmanufacturing regressions; this stops the gate from being unable to\nconfirm real ones.\n\n## The bug\n\nThe per-SHA baseline lock and the two-day persistence gate cannot both\nwork:\n\n1. The lock freezes the comparison point at the **first** nightly to\nmeasure a commit.\n2. So a real regression is visible on exactly **one** night — the\nnightly right after the new SHA lands, compared against the prior SHA's\nbaseline.\n3. That same night re-locks the baseline. Every night after compares the\nSHA **against itself**, where no code difference is representable.\n4. The gate only files when a bench regresses on **two consecutive**\nnightlies.\n\nA genuine regression's signal appears once and is then baselined away,\nso it can never be confirmed. Noise, which does recur on same-SHA\nnights, is the only thing the gate can ever confirm. Four consecutive\nnightlies ran on `0f9de844`, and #923/#924 were filed off\nself-comparisons of that commit.\n\n## The fix\n\nBaseline is now the per-bench median of the last 7 nightly measurements,\nread from Criterion's `estimates.json` rather than its `change:` lines:\n\n- A single unusually fast or slow runner moves the median by one sample\nout of seven, so the comparison point is stable night to night. That is\nwhat the per-SHA freeze was reaching for, without freezing.\n- A real regression stays above the median for several consecutive\nnights after landing, until enough post-regression samples drag the\nmedian up. **That is what makes the persistence gate meaningful for the\nfirst time.**\n\nCalibration still divides runner speed out, computed the same way\n(tonight vs its own median), still clamped to damping-only per #931.\n\nCache changes: the per-SHA `criterion-baseline-*` cache is replaced by a\nrolling `bench-history-*` cache keyed by `run_id` with prefix fallback.\nIt keeps `RUSTC_VER` in the key — absolute timings are\ncompiler-dependent, so a history must never span toolchains (#884).\nWrites are `schedule`-only so a `workflow_dispatch` preview cannot\ninject a sample.\n\n## Verification\n\nReplayed against the real 54-bench criterion tree from the failing\nnightly (run 29680411190), with every bench on the previous-night list\nso the two-day gate applies:\n\n| scenario | result |\n|---|---|\n| stable night (tonight == median) | `regressed=false` |\n| the #923/#924 shape (+3% benches, −10.9% calibration) |\n`regressed=false` |\n| genuine +20% on `dispatch_comparison/etd_50e_200s` | `regressed=true`,\nonly that bench flagged |\n| whole suite 12% slower (runner) | `regressed=false` |\n\n23 unit tests, including one that walks two nights in sequence to assert\na real regression survives into night two and is confirmed — the\nproperty the old scheme structurally could not have.\n\n## Review findings from #932, already applied\n\n- **Issue creation is now `schedule`-only.** A dispatch run restores the\nlast nightly's regression list and compares against the same history, so\nit would re-confirm a live regression and file a duplicate issue without\na night boundary passing. The cache-write guards already assumed\ndispatch was a read-only preview; the issue step did not match.\n- **A missing calibration bench is now distinguished from a warming-up\nhistory.** Both previously printed \"expected during warmup\", so\n`calibration_bench` failing outright looked benign.\n- **Bench ids resolve relative to the criterion root** rather than by\nlocating a `\"criterion\"` path component, which mis-keyed a bench group\nnamed `criterion`.\n- Fixed a duplicated word in the no-regression message.\n\n## Warm-up\n\nPer bench, fewer than 3 prior samples means it is recorded but not\ngated, so the first two nightlies after this lands report nothing while\nhistory accumulates. Warm-up is per bench, so newly added benches do not\nmute established ones.\n\n## Also\n\nAdds a `Bench script tests` CI job. These unit tests previously ran\nnowhere — the nightly executes at 08:00 UTC, so a bug in the detection\nmath surfaced as a bogus issue the next morning instead of on the PR\nthat caused it. (This also meant #932 itself got no real CI, since\n`ci.yml` only triggers on PRs based on `main`.)\n\n<!-- This is an auto-generated description by cubic. -->\n---\n## Summary by cubic\nDetect regressions against a rolling median of the last 7 nightlies\ninstead of a per-SHA baseline, so real regressions are confirmed and\nnoise is ignored. Also adds unit tests and updates workflows to use a\nrolling history keyed by `RUSTC_VER`.\n\n- **Bug Fixes**\n- Compare each bench to the median of its last 7 nightlies (from\n`estimates.json`) instead of a frozen per-SHA baseline, so regressions\npersist across nights and the two-day gate works.\n- Keep runner-speed correction via `calibration/fixed_workload` vs its\nown median, clamped to damping-only.\n- Warm-up: benches with fewer than 3 samples are recorded but not gated.\n\n- **Refactors**\n- Replace `.github/scripts/filter-bench-regressions.py` with\n`.github/scripts/detect-bench-regressions.py`; add unit tests and run\nthem in CI.\n- Use a rolling `bench-history.json` cache keyed by\n`bench-history-${ref}-${RUSTC_VER}-${run_id}` with prefix fallback;\nwrites are `schedule`-only. Issue creation is also `schedule`-only to\navoid duplicates from `workflow_dispatch`.\n- Update nightly workflow to restore/save history and the previous-night\nregression list; detector reads `target/criterion`, adjusts by\ncalibration, and sets `regressed`/`gate` outputs.\n\n<sup>Written for commit 5322bca416921d72d397287651a70f5543e81a5b.\nSummary will update on new commits.</sup>\n\n<a\nhref=\"https://cubic.dev/pr/andymai/elevator-core/pull/933?utm_source=github\"\ntarget=\"_blank\" rel=\"noopener noreferrer\"\ndata-no-image-dialog=\"true\"><picture><source\nmedia=\"(prefers-color-scheme: dark)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"><source\nmedia=\"(prefers-color-scheme: light)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-light.svg\"><img\nalt=\"Review in cubic\"\nsrc=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"></picture></a>\n\n<!-- End of auto-generated description by cubic. -->",
          "timestamp": "2026-07-19T21:16:50Z",
          "url": "https://github.com/andymai/elevator-core/commit/b6a713080b91f0f41ba396ab64d60a6d7914c562"
        },
        "date": 1784624713296,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 3526395,
            "range": "± 8039",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 497472,
            "range": "± 1099",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 519680,
            "range": "± 2736",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 609300,
            "range": "± 2572",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 461338,
            "range": "± 5654",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 31221,
            "range": "± 2872",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 7062,
            "range": "± 1012",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 2780486,
            "range": "± 27352",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 13134922,
            "range": "± 46458",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 433479,
            "range": "± 1908",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1590384,
            "range": "± 4785",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 8170413,
            "range": "± 56725",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 210279,
            "range": "± 3673",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1550892,
            "range": "± 7922",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 7889282,
            "range": "± 61562",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 204697,
            "range": "± 674",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1495071,
            "range": "± 5327",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 7646863,
            "range": "± 22349",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 200339,
            "range": "± 925",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1496164,
            "range": "± 3242",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 7631953,
            "range": "± 20597",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 199951,
            "range": "± 2706",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1547554,
            "range": "± 3909",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 7947075,
            "range": "± 57047",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 188485,
            "range": "± 586",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 4237,
            "range": "± 4000",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 3982,
            "range": "± 2741",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 5731,
            "range": "± 14307",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4285,
            "range": "± 1836",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 17974,
            "range": "± 1737",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 2605786,
            "range": "± 15883",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 2741785,
            "range": "± 9127",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 5491,
            "range": "± 3106",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 15970,
            "range": "± 731",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 7489,
            "range": "± 350",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 81178,
            "range": "± 1407",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 16029,
            "range": "± 2308",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 779117,
            "range": "± 14047",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 79902,
            "range": "± 1691",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 13805,
            "range": "± 2852",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 798655,
            "range": "± 9226",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 80947,
            "range": "± 1053",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 15846,
            "range": "± 2422",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 4373259232,
            "range": "± 275791747",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 60762356,
            "range": "± 239716",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 14878735,
            "range": "± 57096",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 43966690,
            "range": "± 69663",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 6673283,
            "range": "± 19703",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 29051,
            "range": "± 760",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 12197,
            "range": "± 232",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 4992,
            "range": "± 262",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 154240,
            "range": "± 5572",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 151134,
            "range": "± 6864",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 107678,
            "range": "± 16060",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Andy Aragon",
            "username": "andymai",
            "email": "hi@andymai.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "b6a713080b91f0f41ba396ab64d60a6d7914c562",
          "message": "ci(bench): detect regressions against a rolling median of nightlies (#933)\n\nReplaces #932, which GitHub auto-closed when its base branch\n(`ci/bench-calibration-damping`, the #931 branch) was deleted on merge.\nSame content, rebuilt as a single commit on top of `main`, with\ngreptile's review findings from #932 already folded in.\n\nFixes the structural half of #923/#924. #931 stopped calibration from\nmanufacturing regressions; this stops the gate from being unable to\nconfirm real ones.\n\n## The bug\n\nThe per-SHA baseline lock and the two-day persistence gate cannot both\nwork:\n\n1. The lock freezes the comparison point at the **first** nightly to\nmeasure a commit.\n2. So a real regression is visible on exactly **one** night — the\nnightly right after the new SHA lands, compared against the prior SHA's\nbaseline.\n3. That same night re-locks the baseline. Every night after compares the\nSHA **against itself**, where no code difference is representable.\n4. The gate only files when a bench regresses on **two consecutive**\nnightlies.\n\nA genuine regression's signal appears once and is then baselined away,\nso it can never be confirmed. Noise, which does recur on same-SHA\nnights, is the only thing the gate can ever confirm. Four consecutive\nnightlies ran on `0f9de844`, and #923/#924 were filed off\nself-comparisons of that commit.\n\n## The fix\n\nBaseline is now the per-bench median of the last 7 nightly measurements,\nread from Criterion's `estimates.json` rather than its `change:` lines:\n\n- A single unusually fast or slow runner moves the median by one sample\nout of seven, so the comparison point is stable night to night. That is\nwhat the per-SHA freeze was reaching for, without freezing.\n- A real regression stays above the median for several consecutive\nnights after landing, until enough post-regression samples drag the\nmedian up. **That is what makes the persistence gate meaningful for the\nfirst time.**\n\nCalibration still divides runner speed out, computed the same way\n(tonight vs its own median), still clamped to damping-only per #931.\n\nCache changes: the per-SHA `criterion-baseline-*` cache is replaced by a\nrolling `bench-history-*` cache keyed by `run_id` with prefix fallback.\nIt keeps `RUSTC_VER` in the key — absolute timings are\ncompiler-dependent, so a history must never span toolchains (#884).\nWrites are `schedule`-only so a `workflow_dispatch` preview cannot\ninject a sample.\n\n## Verification\n\nReplayed against the real 54-bench criterion tree from the failing\nnightly (run 29680411190), with every bench on the previous-night list\nso the two-day gate applies:\n\n| scenario | result |\n|---|---|\n| stable night (tonight == median) | `regressed=false` |\n| the #923/#924 shape (+3% benches, −10.9% calibration) |\n`regressed=false` |\n| genuine +20% on `dispatch_comparison/etd_50e_200s` | `regressed=true`,\nonly that bench flagged |\n| whole suite 12% slower (runner) | `regressed=false` |\n\n23 unit tests, including one that walks two nights in sequence to assert\na real regression survives into night two and is confirmed — the\nproperty the old scheme structurally could not have.\n\n## Review findings from #932, already applied\n\n- **Issue creation is now `schedule`-only.** A dispatch run restores the\nlast nightly's regression list and compares against the same history, so\nit would re-confirm a live regression and file a duplicate issue without\na night boundary passing. The cache-write guards already assumed\ndispatch was a read-only preview; the issue step did not match.\n- **A missing calibration bench is now distinguished from a warming-up\nhistory.** Both previously printed \"expected during warmup\", so\n`calibration_bench` failing outright looked benign.\n- **Bench ids resolve relative to the criterion root** rather than by\nlocating a `\"criterion\"` path component, which mis-keyed a bench group\nnamed `criterion`.\n- Fixed a duplicated word in the no-regression message.\n\n## Warm-up\n\nPer bench, fewer than 3 prior samples means it is recorded but not\ngated, so the first two nightlies after this lands report nothing while\nhistory accumulates. Warm-up is per bench, so newly added benches do not\nmute established ones.\n\n## Also\n\nAdds a `Bench script tests` CI job. These unit tests previously ran\nnowhere — the nightly executes at 08:00 UTC, so a bug in the detection\nmath surfaced as a bogus issue the next morning instead of on the PR\nthat caused it. (This also meant #932 itself got no real CI, since\n`ci.yml` only triggers on PRs based on `main`.)\n\n<!-- This is an auto-generated description by cubic. -->\n---\n## Summary by cubic\nDetect regressions against a rolling median of the last 7 nightlies\ninstead of a per-SHA baseline, so real regressions are confirmed and\nnoise is ignored. Also adds unit tests and updates workflows to use a\nrolling history keyed by `RUSTC_VER`.\n\n- **Bug Fixes**\n- Compare each bench to the median of its last 7 nightlies (from\n`estimates.json`) instead of a frozen per-SHA baseline, so regressions\npersist across nights and the two-day gate works.\n- Keep runner-speed correction via `calibration/fixed_workload` vs its\nown median, clamped to damping-only.\n- Warm-up: benches with fewer than 3 samples are recorded but not gated.\n\n- **Refactors**\n- Replace `.github/scripts/filter-bench-regressions.py` with\n`.github/scripts/detect-bench-regressions.py`; add unit tests and run\nthem in CI.\n- Use a rolling `bench-history.json` cache keyed by\n`bench-history-${ref}-${RUSTC_VER}-${run_id}` with prefix fallback;\nwrites are `schedule`-only. Issue creation is also `schedule`-only to\navoid duplicates from `workflow_dispatch`.\n- Update nightly workflow to restore/save history and the previous-night\nregression list; detector reads `target/criterion`, adjusts by\ncalibration, and sets `regressed`/`gate` outputs.\n\n<sup>Written for commit 5322bca416921d72d397287651a70f5543e81a5b.\nSummary will update on new commits.</sup>\n\n<a\nhref=\"https://cubic.dev/pr/andymai/elevator-core/pull/933?utm_source=github\"\ntarget=\"_blank\" rel=\"noopener noreferrer\"\ndata-no-image-dialog=\"true\"><picture><source\nmedia=\"(prefers-color-scheme: dark)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"><source\nmedia=\"(prefers-color-scheme: light)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-light.svg\"><img\nalt=\"Review in cubic\"\nsrc=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"></picture></a>\n\n<!-- End of auto-generated description by cubic. -->",
          "timestamp": "2026-07-19T21:16:50Z",
          "url": "https://github.com/andymai/elevator-core/commit/b6a713080b91f0f41ba396ab64d60a6d7914c562"
        },
        "date": 1784711107918,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 3934758,
            "range": "± 7898",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 613450,
            "range": "± 3809",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 593869,
            "range": "± 4216",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 722086,
            "range": "± 6586",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 551856,
            "range": "± 3977",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 35719,
            "range": "± 9993",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 7612,
            "range": "± 1451",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3417447,
            "range": "± 78480",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15148411,
            "range": "± 65730",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 564038,
            "range": "± 4854",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1859509,
            "range": "± 6347",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 8934508,
            "range": "± 40593",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 281061,
            "range": "± 11636",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1814452,
            "range": "± 36883",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8598666,
            "range": "± 57531",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 261776,
            "range": "± 1892",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1742245,
            "range": "± 7284",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8481772,
            "range": "± 175403",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 255081,
            "range": "± 806",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1757413,
            "range": "± 2996",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8539657,
            "range": "± 103610",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 267636,
            "range": "± 9613",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1801059,
            "range": "± 4879",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8617298,
            "range": "± 49854",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 269041,
            "range": "± 13315",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 3826,
            "range": "± 708",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 3790,
            "range": "± 1392",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 4596,
            "range": "± 2489",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4355,
            "range": "± 2892",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 22300,
            "range": "± 3310",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3433843,
            "range": "± 16150",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3199418,
            "range": "± 5619",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 7978,
            "range": "± 26205",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 17436,
            "range": "± 972",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 9216,
            "range": "± 12588",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 90811,
            "range": "± 3697",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 17066,
            "range": "± 2549",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 881926,
            "range": "± 29203",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 90286,
            "range": "± 6953",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 16288,
            "range": "± 2804",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 883560,
            "range": "± 23416",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 99041,
            "range": "± 8590",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 19783,
            "range": "± 4546",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 4547360291,
            "range": "± 5490080",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 63982624,
            "range": "± 392034",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 17111039,
            "range": "± 22778",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 54358880,
            "range": "± 162530",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8057489,
            "range": "± 8812",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 34402,
            "range": "± 664",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 13909,
            "range": "± 846",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 6066,
            "range": "± 292",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 203972,
            "range": "± 7617",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 197864,
            "range": "± 9898",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 132418,
            "range": "± 8913",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Andy Aragon",
            "username": "andymai",
            "email": "hi@andymai.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "b6a713080b91f0f41ba396ab64d60a6d7914c562",
          "message": "ci(bench): detect regressions against a rolling median of nightlies (#933)\n\nReplaces #932, which GitHub auto-closed when its base branch\n(`ci/bench-calibration-damping`, the #931 branch) was deleted on merge.\nSame content, rebuilt as a single commit on top of `main`, with\ngreptile's review findings from #932 already folded in.\n\nFixes the structural half of #923/#924. #931 stopped calibration from\nmanufacturing regressions; this stops the gate from being unable to\nconfirm real ones.\n\n## The bug\n\nThe per-SHA baseline lock and the two-day persistence gate cannot both\nwork:\n\n1. The lock freezes the comparison point at the **first** nightly to\nmeasure a commit.\n2. So a real regression is visible on exactly **one** night — the\nnightly right after the new SHA lands, compared against the prior SHA's\nbaseline.\n3. That same night re-locks the baseline. Every night after compares the\nSHA **against itself**, where no code difference is representable.\n4. The gate only files when a bench regresses on **two consecutive**\nnightlies.\n\nA genuine regression's signal appears once and is then baselined away,\nso it can never be confirmed. Noise, which does recur on same-SHA\nnights, is the only thing the gate can ever confirm. Four consecutive\nnightlies ran on `0f9de844`, and #923/#924 were filed off\nself-comparisons of that commit.\n\n## The fix\n\nBaseline is now the per-bench median of the last 7 nightly measurements,\nread from Criterion's `estimates.json` rather than its `change:` lines:\n\n- A single unusually fast or slow runner moves the median by one sample\nout of seven, so the comparison point is stable night to night. That is\nwhat the per-SHA freeze was reaching for, without freezing.\n- A real regression stays above the median for several consecutive\nnights after landing, until enough post-regression samples drag the\nmedian up. **That is what makes the persistence gate meaningful for the\nfirst time.**\n\nCalibration still divides runner speed out, computed the same way\n(tonight vs its own median), still clamped to damping-only per #931.\n\nCache changes: the per-SHA `criterion-baseline-*` cache is replaced by a\nrolling `bench-history-*` cache keyed by `run_id` with prefix fallback.\nIt keeps `RUSTC_VER` in the key — absolute timings are\ncompiler-dependent, so a history must never span toolchains (#884).\nWrites are `schedule`-only so a `workflow_dispatch` preview cannot\ninject a sample.\n\n## Verification\n\nReplayed against the real 54-bench criterion tree from the failing\nnightly (run 29680411190), with every bench on the previous-night list\nso the two-day gate applies:\n\n| scenario | result |\n|---|---|\n| stable night (tonight == median) | `regressed=false` |\n| the #923/#924 shape (+3% benches, −10.9% calibration) |\n`regressed=false` |\n| genuine +20% on `dispatch_comparison/etd_50e_200s` | `regressed=true`,\nonly that bench flagged |\n| whole suite 12% slower (runner) | `regressed=false` |\n\n23 unit tests, including one that walks two nights in sequence to assert\na real regression survives into night two and is confirmed — the\nproperty the old scheme structurally could not have.\n\n## Review findings from #932, already applied\n\n- **Issue creation is now `schedule`-only.** A dispatch run restores the\nlast nightly's regression list and compares against the same history, so\nit would re-confirm a live regression and file a duplicate issue without\na night boundary passing. The cache-write guards already assumed\ndispatch was a read-only preview; the issue step did not match.\n- **A missing calibration bench is now distinguished from a warming-up\nhistory.** Both previously printed \"expected during warmup\", so\n`calibration_bench` failing outright looked benign.\n- **Bench ids resolve relative to the criterion root** rather than by\nlocating a `\"criterion\"` path component, which mis-keyed a bench group\nnamed `criterion`.\n- Fixed a duplicated word in the no-regression message.\n\n## Warm-up\n\nPer bench, fewer than 3 prior samples means it is recorded but not\ngated, so the first two nightlies after this lands report nothing while\nhistory accumulates. Warm-up is per bench, so newly added benches do not\nmute established ones.\n\n## Also\n\nAdds a `Bench script tests` CI job. These unit tests previously ran\nnowhere — the nightly executes at 08:00 UTC, so a bug in the detection\nmath surfaced as a bogus issue the next morning instead of on the PR\nthat caused it. (This also meant #932 itself got no real CI, since\n`ci.yml` only triggers on PRs based on `main`.)\n\n<!-- This is an auto-generated description by cubic. -->\n---\n## Summary by cubic\nDetect regressions against a rolling median of the last 7 nightlies\ninstead of a per-SHA baseline, so real regressions are confirmed and\nnoise is ignored. Also adds unit tests and updates workflows to use a\nrolling history keyed by `RUSTC_VER`.\n\n- **Bug Fixes**\n- Compare each bench to the median of its last 7 nightlies (from\n`estimates.json`) instead of a frozen per-SHA baseline, so regressions\npersist across nights and the two-day gate works.\n- Keep runner-speed correction via `calibration/fixed_workload` vs its\nown median, clamped to damping-only.\n- Warm-up: benches with fewer than 3 samples are recorded but not gated.\n\n- **Refactors**\n- Replace `.github/scripts/filter-bench-regressions.py` with\n`.github/scripts/detect-bench-regressions.py`; add unit tests and run\nthem in CI.\n- Use a rolling `bench-history.json` cache keyed by\n`bench-history-${ref}-${RUSTC_VER}-${run_id}` with prefix fallback;\nwrites are `schedule`-only. Issue creation is also `schedule`-only to\navoid duplicates from `workflow_dispatch`.\n- Update nightly workflow to restore/save history and the previous-night\nregression list; detector reads `target/criterion`, adjusts by\ncalibration, and sets `regressed`/`gate` outputs.\n\n<sup>Written for commit 5322bca416921d72d397287651a70f5543e81a5b.\nSummary will update on new commits.</sup>\n\n<a\nhref=\"https://cubic.dev/pr/andymai/elevator-core/pull/933?utm_source=github\"\ntarget=\"_blank\" rel=\"noopener noreferrer\"\ndata-no-image-dialog=\"true\"><picture><source\nmedia=\"(prefers-color-scheme: dark)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"><source\nmedia=\"(prefers-color-scheme: light)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-light.svg\"><img\nalt=\"Review in cubic\"\nsrc=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"></picture></a>\n\n<!-- End of auto-generated description by cubic. -->",
          "timestamp": "2026-07-19T21:16:50Z",
          "url": "https://github.com/andymai/elevator-core/commit/b6a713080b91f0f41ba396ab64d60a6d7914c562"
        },
        "date": 1784797530866,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 4424447,
            "range": "± 3353",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 622733,
            "range": "± 4723",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 624091,
            "range": "± 4193",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 741909,
            "range": "± 2679",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 573728,
            "range": "± 3553",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 38097,
            "range": "± 3646",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 8051,
            "range": "± 539",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3516097,
            "range": "± 87135",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15292216,
            "range": "± 159827",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 611970,
            "range": "± 1297",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 2019078,
            "range": "± 16349",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 8945451,
            "range": "± 29245",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 297153,
            "range": "± 2303",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1968757,
            "range": "± 20294",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8643001,
            "range": "± 119501",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 292805,
            "range": "± 3779",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1898068,
            "range": "± 11305",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8515810,
            "range": "± 138814",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 288245,
            "range": "± 2574",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1899135,
            "range": "± 14081",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8475330,
            "range": "± 59233",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 287750,
            "range": "± 7275",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1947228,
            "range": "± 15837",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8591371,
            "range": "± 65712",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 281566,
            "range": "± 2264",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 4286,
            "range": "± 2084",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 4407,
            "range": "± 5122",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 5029,
            "range": "± 5784",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4675,
            "range": "± 4501",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 24961,
            "range": "± 2018",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3502292,
            "range": "± 11562",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3318659,
            "range": "± 30338",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 7787,
            "range": "± 13136",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 21166,
            "range": "± 9826",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 10796,
            "range": "± 14337",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 101488,
            "range": "± 12982",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 18350,
            "range": "± 3743",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 941921,
            "range": "± 58413",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 99364,
            "range": "± 13134",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 17826,
            "range": "± 4348",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 901327,
            "range": "± 24167",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 110880,
            "range": "± 17771",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 20089,
            "range": "± 5975",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 5143905068,
            "range": "± 40551120",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 67298411,
            "range": "± 215593",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 17152070,
            "range": "± 46754",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 56669573,
            "range": "± 737843",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8323263,
            "range": "± 8835",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 36592,
            "range": "± 752",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 15263,
            "range": "± 908",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 6507,
            "range": "± 300",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 253051,
            "range": "± 31558",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 218152,
            "range": "± 4756",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 141899,
            "range": "± 12292",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Andy Aragon",
            "username": "andymai",
            "email": "hi@andymai.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "b6a713080b91f0f41ba396ab64d60a6d7914c562",
          "message": "ci(bench): detect regressions against a rolling median of nightlies (#933)\n\nReplaces #932, which GitHub auto-closed when its base branch\n(`ci/bench-calibration-damping`, the #931 branch) was deleted on merge.\nSame content, rebuilt as a single commit on top of `main`, with\ngreptile's review findings from #932 already folded in.\n\nFixes the structural half of #923/#924. #931 stopped calibration from\nmanufacturing regressions; this stops the gate from being unable to\nconfirm real ones.\n\n## The bug\n\nThe per-SHA baseline lock and the two-day persistence gate cannot both\nwork:\n\n1. The lock freezes the comparison point at the **first** nightly to\nmeasure a commit.\n2. So a real regression is visible on exactly **one** night — the\nnightly right after the new SHA lands, compared against the prior SHA's\nbaseline.\n3. That same night re-locks the baseline. Every night after compares the\nSHA **against itself**, where no code difference is representable.\n4. The gate only files when a bench regresses on **two consecutive**\nnightlies.\n\nA genuine regression's signal appears once and is then baselined away,\nso it can never be confirmed. Noise, which does recur on same-SHA\nnights, is the only thing the gate can ever confirm. Four consecutive\nnightlies ran on `0f9de844`, and #923/#924 were filed off\nself-comparisons of that commit.\n\n## The fix\n\nBaseline is now the per-bench median of the last 7 nightly measurements,\nread from Criterion's `estimates.json` rather than its `change:` lines:\n\n- A single unusually fast or slow runner moves the median by one sample\nout of seven, so the comparison point is stable night to night. That is\nwhat the per-SHA freeze was reaching for, without freezing.\n- A real regression stays above the median for several consecutive\nnights after landing, until enough post-regression samples drag the\nmedian up. **That is what makes the persistence gate meaningful for the\nfirst time.**\n\nCalibration still divides runner speed out, computed the same way\n(tonight vs its own median), still clamped to damping-only per #931.\n\nCache changes: the per-SHA `criterion-baseline-*` cache is replaced by a\nrolling `bench-history-*` cache keyed by `run_id` with prefix fallback.\nIt keeps `RUSTC_VER` in the key — absolute timings are\ncompiler-dependent, so a history must never span toolchains (#884).\nWrites are `schedule`-only so a `workflow_dispatch` preview cannot\ninject a sample.\n\n## Verification\n\nReplayed against the real 54-bench criterion tree from the failing\nnightly (run 29680411190), with every bench on the previous-night list\nso the two-day gate applies:\n\n| scenario | result |\n|---|---|\n| stable night (tonight == median) | `regressed=false` |\n| the #923/#924 shape (+3% benches, −10.9% calibration) |\n`regressed=false` |\n| genuine +20% on `dispatch_comparison/etd_50e_200s` | `regressed=true`,\nonly that bench flagged |\n| whole suite 12% slower (runner) | `regressed=false` |\n\n23 unit tests, including one that walks two nights in sequence to assert\na real regression survives into night two and is confirmed — the\nproperty the old scheme structurally could not have.\n\n## Review findings from #932, already applied\n\n- **Issue creation is now `schedule`-only.** A dispatch run restores the\nlast nightly's regression list and compares against the same history, so\nit would re-confirm a live regression and file a duplicate issue without\na night boundary passing. The cache-write guards already assumed\ndispatch was a read-only preview; the issue step did not match.\n- **A missing calibration bench is now distinguished from a warming-up\nhistory.** Both previously printed \"expected during warmup\", so\n`calibration_bench` failing outright looked benign.\n- **Bench ids resolve relative to the criterion root** rather than by\nlocating a `\"criterion\"` path component, which mis-keyed a bench group\nnamed `criterion`.\n- Fixed a duplicated word in the no-regression message.\n\n## Warm-up\n\nPer bench, fewer than 3 prior samples means it is recorded but not\ngated, so the first two nightlies after this lands report nothing while\nhistory accumulates. Warm-up is per bench, so newly added benches do not\nmute established ones.\n\n## Also\n\nAdds a `Bench script tests` CI job. These unit tests previously ran\nnowhere — the nightly executes at 08:00 UTC, so a bug in the detection\nmath surfaced as a bogus issue the next morning instead of on the PR\nthat caused it. (This also meant #932 itself got no real CI, since\n`ci.yml` only triggers on PRs based on `main`.)\n\n<!-- This is an auto-generated description by cubic. -->\n---\n## Summary by cubic\nDetect regressions against a rolling median of the last 7 nightlies\ninstead of a per-SHA baseline, so real regressions are confirmed and\nnoise is ignored. Also adds unit tests and updates workflows to use a\nrolling history keyed by `RUSTC_VER`.\n\n- **Bug Fixes**\n- Compare each bench to the median of its last 7 nightlies (from\n`estimates.json`) instead of a frozen per-SHA baseline, so regressions\npersist across nights and the two-day gate works.\n- Keep runner-speed correction via `calibration/fixed_workload` vs its\nown median, clamped to damping-only.\n- Warm-up: benches with fewer than 3 samples are recorded but not gated.\n\n- **Refactors**\n- Replace `.github/scripts/filter-bench-regressions.py` with\n`.github/scripts/detect-bench-regressions.py`; add unit tests and run\nthem in CI.\n- Use a rolling `bench-history.json` cache keyed by\n`bench-history-${ref}-${RUSTC_VER}-${run_id}` with prefix fallback;\nwrites are `schedule`-only. Issue creation is also `schedule`-only to\navoid duplicates from `workflow_dispatch`.\n- Update nightly workflow to restore/save history and the previous-night\nregression list; detector reads `target/criterion`, adjusts by\ncalibration, and sets `regressed`/`gate` outputs.\n\n<sup>Written for commit 5322bca416921d72d397287651a70f5543e81a5b.\nSummary will update on new commits.</sup>\n\n<a\nhref=\"https://cubic.dev/pr/andymai/elevator-core/pull/933?utm_source=github\"\ntarget=\"_blank\" rel=\"noopener noreferrer\"\ndata-no-image-dialog=\"true\"><picture><source\nmedia=\"(prefers-color-scheme: dark)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"><source\nmedia=\"(prefers-color-scheme: light)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-light.svg\"><img\nalt=\"Review in cubic\"\nsrc=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"></picture></a>\n\n<!-- End of auto-generated description by cubic. -->",
          "timestamp": "2026-07-19T21:16:50Z",
          "url": "https://github.com/andymai/elevator-core/commit/b6a713080b91f0f41ba396ab64d60a6d7914c562"
        },
        "date": 1784883866959,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 3932959,
            "range": "± 5894",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 617501,
            "range": "± 2266",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 601381,
            "range": "± 3111",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 724597,
            "range": "± 3768",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 557079,
            "range": "± 5422",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 35497,
            "range": "± 5930",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 7598,
            "range": "± 1234",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3390584,
            "range": "± 19795",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15068307,
            "range": "± 38015",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 570063,
            "range": "± 855",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1852724,
            "range": "± 6412",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 8941220,
            "range": "± 33945",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 267173,
            "range": "± 1210",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1809226,
            "range": "± 4524",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8592612,
            "range": "± 47968",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 260101,
            "range": "± 792",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1744320,
            "range": "± 5835",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8418440,
            "range": "± 47580",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 253129,
            "range": "± 601",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1745570,
            "range": "± 5893",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8379547,
            "range": "± 42562",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 253986,
            "range": "± 1657",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1812797,
            "range": "± 5188",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8612182,
            "range": "± 50850",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 255249,
            "range": "± 2194",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 4495,
            "range": "± 5746",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 3826,
            "range": "± 2107",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 5385,
            "range": "± 10801",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4476,
            "range": "± 4281",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 22985,
            "range": "± 9056",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3455302,
            "range": "± 10063",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3205037,
            "range": "± 5788",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 7296,
            "range": "± 17159",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 18403,
            "range": "± 13976",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 9187,
            "range": "± 13673",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 91576,
            "range": "± 2984",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 16541,
            "range": "± 2651",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 828792,
            "range": "± 16346",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 87317,
            "range": "± 2924",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 15715,
            "range": "± 2859",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 851563,
            "range": "± 18220",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 90707,
            "range": "± 4054",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 16475,
            "range": "± 2840",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 4605643749,
            "range": "± 16757522",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 64014116,
            "range": "± 128983",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 17091446,
            "range": "± 126147",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 54904790,
            "range": "± 186245",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8214993,
            "range": "± 56814",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 35323,
            "range": "± 8252",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 14003,
            "range": "± 1355",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 6811,
            "range": "± 7884",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 205098,
            "range": "± 10359",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 198384,
            "range": "± 3903",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 140371,
            "range": "± 64078",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Andy Aragon",
            "username": "andymai",
            "email": "hi@andymai.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "b6a713080b91f0f41ba396ab64d60a6d7914c562",
          "message": "ci(bench): detect regressions against a rolling median of nightlies (#933)\n\nReplaces #932, which GitHub auto-closed when its base branch\n(`ci/bench-calibration-damping`, the #931 branch) was deleted on merge.\nSame content, rebuilt as a single commit on top of `main`, with\ngreptile's review findings from #932 already folded in.\n\nFixes the structural half of #923/#924. #931 stopped calibration from\nmanufacturing regressions; this stops the gate from being unable to\nconfirm real ones.\n\n## The bug\n\nThe per-SHA baseline lock and the two-day persistence gate cannot both\nwork:\n\n1. The lock freezes the comparison point at the **first** nightly to\nmeasure a commit.\n2. So a real regression is visible on exactly **one** night — the\nnightly right after the new SHA lands, compared against the prior SHA's\nbaseline.\n3. That same night re-locks the baseline. Every night after compares the\nSHA **against itself**, where no code difference is representable.\n4. The gate only files when a bench regresses on **two consecutive**\nnightlies.\n\nA genuine regression's signal appears once and is then baselined away,\nso it can never be confirmed. Noise, which does recur on same-SHA\nnights, is the only thing the gate can ever confirm. Four consecutive\nnightlies ran on `0f9de844`, and #923/#924 were filed off\nself-comparisons of that commit.\n\n## The fix\n\nBaseline is now the per-bench median of the last 7 nightly measurements,\nread from Criterion's `estimates.json` rather than its `change:` lines:\n\n- A single unusually fast or slow runner moves the median by one sample\nout of seven, so the comparison point is stable night to night. That is\nwhat the per-SHA freeze was reaching for, without freezing.\n- A real regression stays above the median for several consecutive\nnights after landing, until enough post-regression samples drag the\nmedian up. **That is what makes the persistence gate meaningful for the\nfirst time.**\n\nCalibration still divides runner speed out, computed the same way\n(tonight vs its own median), still clamped to damping-only per #931.\n\nCache changes: the per-SHA `criterion-baseline-*` cache is replaced by a\nrolling `bench-history-*` cache keyed by `run_id` with prefix fallback.\nIt keeps `RUSTC_VER` in the key — absolute timings are\ncompiler-dependent, so a history must never span toolchains (#884).\nWrites are `schedule`-only so a `workflow_dispatch` preview cannot\ninject a sample.\n\n## Verification\n\nReplayed against the real 54-bench criterion tree from the failing\nnightly (run 29680411190), with every bench on the previous-night list\nso the two-day gate applies:\n\n| scenario | result |\n|---|---|\n| stable night (tonight == median) | `regressed=false` |\n| the #923/#924 shape (+3% benches, −10.9% calibration) |\n`regressed=false` |\n| genuine +20% on `dispatch_comparison/etd_50e_200s` | `regressed=true`,\nonly that bench flagged |\n| whole suite 12% slower (runner) | `regressed=false` |\n\n23 unit tests, including one that walks two nights in sequence to assert\na real regression survives into night two and is confirmed — the\nproperty the old scheme structurally could not have.\n\n## Review findings from #932, already applied\n\n- **Issue creation is now `schedule`-only.** A dispatch run restores the\nlast nightly's regression list and compares against the same history, so\nit would re-confirm a live regression and file a duplicate issue without\na night boundary passing. The cache-write guards already assumed\ndispatch was a read-only preview; the issue step did not match.\n- **A missing calibration bench is now distinguished from a warming-up\nhistory.** Both previously printed \"expected during warmup\", so\n`calibration_bench` failing outright looked benign.\n- **Bench ids resolve relative to the criterion root** rather than by\nlocating a `\"criterion\"` path component, which mis-keyed a bench group\nnamed `criterion`.\n- Fixed a duplicated word in the no-regression message.\n\n## Warm-up\n\nPer bench, fewer than 3 prior samples means it is recorded but not\ngated, so the first two nightlies after this lands report nothing while\nhistory accumulates. Warm-up is per bench, so newly added benches do not\nmute established ones.\n\n## Also\n\nAdds a `Bench script tests` CI job. These unit tests previously ran\nnowhere — the nightly executes at 08:00 UTC, so a bug in the detection\nmath surfaced as a bogus issue the next morning instead of on the PR\nthat caused it. (This also meant #932 itself got no real CI, since\n`ci.yml` only triggers on PRs based on `main`.)\n\n<!-- This is an auto-generated description by cubic. -->\n---\n## Summary by cubic\nDetect regressions against a rolling median of the last 7 nightlies\ninstead of a per-SHA baseline, so real regressions are confirmed and\nnoise is ignored. Also adds unit tests and updates workflows to use a\nrolling history keyed by `RUSTC_VER`.\n\n- **Bug Fixes**\n- Compare each bench to the median of its last 7 nightlies (from\n`estimates.json`) instead of a frozen per-SHA baseline, so regressions\npersist across nights and the two-day gate works.\n- Keep runner-speed correction via `calibration/fixed_workload` vs its\nown median, clamped to damping-only.\n- Warm-up: benches with fewer than 3 samples are recorded but not gated.\n\n- **Refactors**\n- Replace `.github/scripts/filter-bench-regressions.py` with\n`.github/scripts/detect-bench-regressions.py`; add unit tests and run\nthem in CI.\n- Use a rolling `bench-history.json` cache keyed by\n`bench-history-${ref}-${RUSTC_VER}-${run_id}` with prefix fallback;\nwrites are `schedule`-only. Issue creation is also `schedule`-only to\navoid duplicates from `workflow_dispatch`.\n- Update nightly workflow to restore/save history and the previous-night\nregression list; detector reads `target/criterion`, adjusts by\ncalibration, and sets `regressed`/`gate` outputs.\n\n<sup>Written for commit 5322bca416921d72d397287651a70f5543e81a5b.\nSummary will update on new commits.</sup>\n\n<a\nhref=\"https://cubic.dev/pr/andymai/elevator-core/pull/933?utm_source=github\"\ntarget=\"_blank\" rel=\"noopener noreferrer\"\ndata-no-image-dialog=\"true\"><picture><source\nmedia=\"(prefers-color-scheme: dark)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"><source\nmedia=\"(prefers-color-scheme: light)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-light.svg\"><img\nalt=\"Review in cubic\"\nsrc=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"></picture></a>\n\n<!-- End of auto-generated description by cubic. -->",
          "timestamp": "2026-07-19T21:16:50Z",
          "url": "https://github.com/andymai/elevator-core/commit/b6a713080b91f0f41ba396ab64d60a6d7914c562"
        },
        "date": 1784969561420,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 3934056,
            "range": "± 4778",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 610515,
            "range": "± 2727",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 588797,
            "range": "± 5253",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 712473,
            "range": "± 1107",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 548904,
            "range": "± 3150",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 34709,
            "range": "± 466",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 7459,
            "range": "± 223",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3362971,
            "range": "± 15432",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15002730,
            "range": "± 55112",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 558458,
            "range": "± 4849",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1845831,
            "range": "± 5129",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 8984617,
            "range": "± 40793",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 263874,
            "range": "± 1733",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1799362,
            "range": "± 6578",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8607898,
            "range": "± 47316",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 257859,
            "range": "± 872",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1735377,
            "range": "± 3485",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8456127,
            "range": "± 40960",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 253605,
            "range": "± 1636",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1736804,
            "range": "± 4170",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8426924,
            "range": "± 32543",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 252453,
            "range": "± 1820",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1780820,
            "range": "± 3555",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8628633,
            "range": "± 44188",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 251310,
            "range": "± 2480",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 3694,
            "range": "± 311",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 3716,
            "range": "± 1788",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 4454,
            "range": "± 1893",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4035,
            "range": "± 831",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 22501,
            "range": "± 6317",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3410365,
            "range": "± 7262",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3193880,
            "range": "± 12421",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 5180,
            "range": "± 269",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 16712,
            "range": "± 4604",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 7625,
            "range": "± 271",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 89598,
            "range": "± 3153",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 17536,
            "range": "± 2397",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 822640,
            "range": "± 49421",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 85419,
            "range": "± 8214",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 15616,
            "range": "± 3311",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 833662,
            "range": "± 8687",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 86597,
            "range": "± 1692",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 17846,
            "range": "± 2657",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 4543138364,
            "range": "± 27780590",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 63908105,
            "range": "± 235131",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 16923442,
            "range": "± 41307",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 54008251,
            "range": "± 134936",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8042380,
            "range": "± 19956",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 34046,
            "range": "± 820",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 14199,
            "range": "± 1824",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 5898,
            "range": "± 197",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 202210,
            "range": "± 5669",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 196767,
            "range": "± 4933",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 132228,
            "range": "± 6812",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Andy Aragon",
            "username": "andymai",
            "email": "hi@andymai.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "b6a713080b91f0f41ba396ab64d60a6d7914c562",
          "message": "ci(bench): detect regressions against a rolling median of nightlies (#933)\n\nReplaces #932, which GitHub auto-closed when its base branch\n(`ci/bench-calibration-damping`, the #931 branch) was deleted on merge.\nSame content, rebuilt as a single commit on top of `main`, with\ngreptile's review findings from #932 already folded in.\n\nFixes the structural half of #923/#924. #931 stopped calibration from\nmanufacturing regressions; this stops the gate from being unable to\nconfirm real ones.\n\n## The bug\n\nThe per-SHA baseline lock and the two-day persistence gate cannot both\nwork:\n\n1. The lock freezes the comparison point at the **first** nightly to\nmeasure a commit.\n2. So a real regression is visible on exactly **one** night — the\nnightly right after the new SHA lands, compared against the prior SHA's\nbaseline.\n3. That same night re-locks the baseline. Every night after compares the\nSHA **against itself**, where no code difference is representable.\n4. The gate only files when a bench regresses on **two consecutive**\nnightlies.\n\nA genuine regression's signal appears once and is then baselined away,\nso it can never be confirmed. Noise, which does recur on same-SHA\nnights, is the only thing the gate can ever confirm. Four consecutive\nnightlies ran on `0f9de844`, and #923/#924 were filed off\nself-comparisons of that commit.\n\n## The fix\n\nBaseline is now the per-bench median of the last 7 nightly measurements,\nread from Criterion's `estimates.json` rather than its `change:` lines:\n\n- A single unusually fast or slow runner moves the median by one sample\nout of seven, so the comparison point is stable night to night. That is\nwhat the per-SHA freeze was reaching for, without freezing.\n- A real regression stays above the median for several consecutive\nnights after landing, until enough post-regression samples drag the\nmedian up. **That is what makes the persistence gate meaningful for the\nfirst time.**\n\nCalibration still divides runner speed out, computed the same way\n(tonight vs its own median), still clamped to damping-only per #931.\n\nCache changes: the per-SHA `criterion-baseline-*` cache is replaced by a\nrolling `bench-history-*` cache keyed by `run_id` with prefix fallback.\nIt keeps `RUSTC_VER` in the key — absolute timings are\ncompiler-dependent, so a history must never span toolchains (#884).\nWrites are `schedule`-only so a `workflow_dispatch` preview cannot\ninject a sample.\n\n## Verification\n\nReplayed against the real 54-bench criterion tree from the failing\nnightly (run 29680411190), with every bench on the previous-night list\nso the two-day gate applies:\n\n| scenario | result |\n|---|---|\n| stable night (tonight == median) | `regressed=false` |\n| the #923/#924 shape (+3% benches, −10.9% calibration) |\n`regressed=false` |\n| genuine +20% on `dispatch_comparison/etd_50e_200s` | `regressed=true`,\nonly that bench flagged |\n| whole suite 12% slower (runner) | `regressed=false` |\n\n23 unit tests, including one that walks two nights in sequence to assert\na real regression survives into night two and is confirmed — the\nproperty the old scheme structurally could not have.\n\n## Review findings from #932, already applied\n\n- **Issue creation is now `schedule`-only.** A dispatch run restores the\nlast nightly's regression list and compares against the same history, so\nit would re-confirm a live regression and file a duplicate issue without\na night boundary passing. The cache-write guards already assumed\ndispatch was a read-only preview; the issue step did not match.\n- **A missing calibration bench is now distinguished from a warming-up\nhistory.** Both previously printed \"expected during warmup\", so\n`calibration_bench` failing outright looked benign.\n- **Bench ids resolve relative to the criterion root** rather than by\nlocating a `\"criterion\"` path component, which mis-keyed a bench group\nnamed `criterion`.\n- Fixed a duplicated word in the no-regression message.\n\n## Warm-up\n\nPer bench, fewer than 3 prior samples means it is recorded but not\ngated, so the first two nightlies after this lands report nothing while\nhistory accumulates. Warm-up is per bench, so newly added benches do not\nmute established ones.\n\n## Also\n\nAdds a `Bench script tests` CI job. These unit tests previously ran\nnowhere — the nightly executes at 08:00 UTC, so a bug in the detection\nmath surfaced as a bogus issue the next morning instead of on the PR\nthat caused it. (This also meant #932 itself got no real CI, since\n`ci.yml` only triggers on PRs based on `main`.)\n\n<!-- This is an auto-generated description by cubic. -->\n---\n## Summary by cubic\nDetect regressions against a rolling median of the last 7 nightlies\ninstead of a per-SHA baseline, so real regressions are confirmed and\nnoise is ignored. Also adds unit tests and updates workflows to use a\nrolling history keyed by `RUSTC_VER`.\n\n- **Bug Fixes**\n- Compare each bench to the median of its last 7 nightlies (from\n`estimates.json`) instead of a frozen per-SHA baseline, so regressions\npersist across nights and the two-day gate works.\n- Keep runner-speed correction via `calibration/fixed_workload` vs its\nown median, clamped to damping-only.\n- Warm-up: benches with fewer than 3 samples are recorded but not gated.\n\n- **Refactors**\n- Replace `.github/scripts/filter-bench-regressions.py` with\n`.github/scripts/detect-bench-regressions.py`; add unit tests and run\nthem in CI.\n- Use a rolling `bench-history.json` cache keyed by\n`bench-history-${ref}-${RUSTC_VER}-${run_id}` with prefix fallback;\nwrites are `schedule`-only. Issue creation is also `schedule`-only to\navoid duplicates from `workflow_dispatch`.\n- Update nightly workflow to restore/save history and the previous-night\nregression list; detector reads `target/criterion`, adjusts by\ncalibration, and sets `regressed`/`gate` outputs.\n\n<sup>Written for commit 5322bca416921d72d397287651a70f5543e81a5b.\nSummary will update on new commits.</sup>\n\n<a\nhref=\"https://cubic.dev/pr/andymai/elevator-core/pull/933?utm_source=github\"\ntarget=\"_blank\" rel=\"noopener noreferrer\"\ndata-no-image-dialog=\"true\"><picture><source\nmedia=\"(prefers-color-scheme: dark)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"><source\nmedia=\"(prefers-color-scheme: light)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-light.svg\"><img\nalt=\"Review in cubic\"\nsrc=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"></picture></a>\n\n<!-- End of auto-generated description by cubic. -->",
          "timestamp": "2026-07-19T21:16:50Z",
          "url": "https://github.com/andymai/elevator-core/commit/b6a713080b91f0f41ba396ab64d60a6d7914c562"
        },
        "date": 1785056405381,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 3931949,
            "range": "± 3538",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 616636,
            "range": "± 3532",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 601071,
            "range": "± 4310",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 723619,
            "range": "± 2095",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 558339,
            "range": "± 5188",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 38424,
            "range": "± 3076",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 8411,
            "range": "± 762",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3387316,
            "range": "± 13326",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15088687,
            "range": "± 80851",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 565173,
            "range": "± 5242",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1858392,
            "range": "± 8821",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 9067584,
            "range": "± 98371",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 266913,
            "range": "± 947",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1818932,
            "range": "± 10151",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8729712,
            "range": "± 75838",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 262519,
            "range": "± 2095",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1738216,
            "range": "± 4931",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8529378,
            "range": "± 79987",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 254526,
            "range": "± 897",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1756758,
            "range": "± 6621",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8467219,
            "range": "± 47762",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 260324,
            "range": "± 2649",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1803865,
            "range": "± 8338",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8654599,
            "range": "± 40372",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 255270,
            "range": "± 1087",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 4495,
            "range": "± 4131",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 3948,
            "range": "± 2204",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 4887,
            "range": "± 3579",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4574,
            "range": "± 1845",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 22396,
            "range": "± 3464",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3464427,
            "range": "± 6957",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3220134,
            "range": "± 3985",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 8011,
            "range": "± 16122",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 19204,
            "range": "± 2408",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 9402,
            "range": "± 3332",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 99324,
            "range": "± 7722",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 19416,
            "range": "± 6536",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 870248,
            "range": "± 26240",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 95119,
            "range": "± 7863",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 17563,
            "range": "± 3724",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 901001,
            "range": "± 17006",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 96894,
            "range": "± 7618",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 18708,
            "range": "± 3670",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 4567190072,
            "range": "± 23206344",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 65124334,
            "range": "± 1468693",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 17131935,
            "range": "± 40093",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 54901816,
            "range": "± 271251",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8121783,
            "range": "± 16557",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 35699,
            "range": "± 912",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 14405,
            "range": "± 744",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 6695,
            "range": "± 597",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 204230,
            "range": "± 5706",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 199775,
            "range": "± 10903",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 132808,
            "range": "± 2853",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Andy Aragon",
            "username": "andymai",
            "email": "hi@andymai.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "b6a713080b91f0f41ba396ab64d60a6d7914c562",
          "message": "ci(bench): detect regressions against a rolling median of nightlies (#933)\n\nReplaces #932, which GitHub auto-closed when its base branch\n(`ci/bench-calibration-damping`, the #931 branch) was deleted on merge.\nSame content, rebuilt as a single commit on top of `main`, with\ngreptile's review findings from #932 already folded in.\n\nFixes the structural half of #923/#924. #931 stopped calibration from\nmanufacturing regressions; this stops the gate from being unable to\nconfirm real ones.\n\n## The bug\n\nThe per-SHA baseline lock and the two-day persistence gate cannot both\nwork:\n\n1. The lock freezes the comparison point at the **first** nightly to\nmeasure a commit.\n2. So a real regression is visible on exactly **one** night — the\nnightly right after the new SHA lands, compared against the prior SHA's\nbaseline.\n3. That same night re-locks the baseline. Every night after compares the\nSHA **against itself**, where no code difference is representable.\n4. The gate only files when a bench regresses on **two consecutive**\nnightlies.\n\nA genuine regression's signal appears once and is then baselined away,\nso it can never be confirmed. Noise, which does recur on same-SHA\nnights, is the only thing the gate can ever confirm. Four consecutive\nnightlies ran on `0f9de844`, and #923/#924 were filed off\nself-comparisons of that commit.\n\n## The fix\n\nBaseline is now the per-bench median of the last 7 nightly measurements,\nread from Criterion's `estimates.json` rather than its `change:` lines:\n\n- A single unusually fast or slow runner moves the median by one sample\nout of seven, so the comparison point is stable night to night. That is\nwhat the per-SHA freeze was reaching for, without freezing.\n- A real regression stays above the median for several consecutive\nnights after landing, until enough post-regression samples drag the\nmedian up. **That is what makes the persistence gate meaningful for the\nfirst time.**\n\nCalibration still divides runner speed out, computed the same way\n(tonight vs its own median), still clamped to damping-only per #931.\n\nCache changes: the per-SHA `criterion-baseline-*` cache is replaced by a\nrolling `bench-history-*` cache keyed by `run_id` with prefix fallback.\nIt keeps `RUSTC_VER` in the key — absolute timings are\ncompiler-dependent, so a history must never span toolchains (#884).\nWrites are `schedule`-only so a `workflow_dispatch` preview cannot\ninject a sample.\n\n## Verification\n\nReplayed against the real 54-bench criterion tree from the failing\nnightly (run 29680411190), with every bench on the previous-night list\nso the two-day gate applies:\n\n| scenario | result |\n|---|---|\n| stable night (tonight == median) | `regressed=false` |\n| the #923/#924 shape (+3% benches, −10.9% calibration) |\n`regressed=false` |\n| genuine +20% on `dispatch_comparison/etd_50e_200s` | `regressed=true`,\nonly that bench flagged |\n| whole suite 12% slower (runner) | `regressed=false` |\n\n23 unit tests, including one that walks two nights in sequence to assert\na real regression survives into night two and is confirmed — the\nproperty the old scheme structurally could not have.\n\n## Review findings from #932, already applied\n\n- **Issue creation is now `schedule`-only.** A dispatch run restores the\nlast nightly's regression list and compares against the same history, so\nit would re-confirm a live regression and file a duplicate issue without\na night boundary passing. The cache-write guards already assumed\ndispatch was a read-only preview; the issue step did not match.\n- **A missing calibration bench is now distinguished from a warming-up\nhistory.** Both previously printed \"expected during warmup\", so\n`calibration_bench` failing outright looked benign.\n- **Bench ids resolve relative to the criterion root** rather than by\nlocating a `\"criterion\"` path component, which mis-keyed a bench group\nnamed `criterion`.\n- Fixed a duplicated word in the no-regression message.\n\n## Warm-up\n\nPer bench, fewer than 3 prior samples means it is recorded but not\ngated, so the first two nightlies after this lands report nothing while\nhistory accumulates. Warm-up is per bench, so newly added benches do not\nmute established ones.\n\n## Also\n\nAdds a `Bench script tests` CI job. These unit tests previously ran\nnowhere — the nightly executes at 08:00 UTC, so a bug in the detection\nmath surfaced as a bogus issue the next morning instead of on the PR\nthat caused it. (This also meant #932 itself got no real CI, since\n`ci.yml` only triggers on PRs based on `main`.)\n\n<!-- This is an auto-generated description by cubic. -->\n---\n## Summary by cubic\nDetect regressions against a rolling median of the last 7 nightlies\ninstead of a per-SHA baseline, so real regressions are confirmed and\nnoise is ignored. Also adds unit tests and updates workflows to use a\nrolling history keyed by `RUSTC_VER`.\n\n- **Bug Fixes**\n- Compare each bench to the median of its last 7 nightlies (from\n`estimates.json`) instead of a frozen per-SHA baseline, so regressions\npersist across nights and the two-day gate works.\n- Keep runner-speed correction via `calibration/fixed_workload` vs its\nown median, clamped to damping-only.\n- Warm-up: benches with fewer than 3 samples are recorded but not gated.\n\n- **Refactors**\n- Replace `.github/scripts/filter-bench-regressions.py` with\n`.github/scripts/detect-bench-regressions.py`; add unit tests and run\nthem in CI.\n- Use a rolling `bench-history.json` cache keyed by\n`bench-history-${ref}-${RUSTC_VER}-${run_id}` with prefix fallback;\nwrites are `schedule`-only. Issue creation is also `schedule`-only to\navoid duplicates from `workflow_dispatch`.\n- Update nightly workflow to restore/save history and the previous-night\nregression list; detector reads `target/criterion`, adjusts by\ncalibration, and sets `regressed`/`gate` outputs.\n\n<sup>Written for commit 5322bca416921d72d397287651a70f5543e81a5b.\nSummary will update on new commits.</sup>\n\n<a\nhref=\"https://cubic.dev/pr/andymai/elevator-core/pull/933?utm_source=github\"\ntarget=\"_blank\" rel=\"noopener noreferrer\"\ndata-no-image-dialog=\"true\"><picture><source\nmedia=\"(prefers-color-scheme: dark)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"><source\nmedia=\"(prefers-color-scheme: light)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-light.svg\"><img\nalt=\"Review in cubic\"\nsrc=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"></picture></a>\n\n<!-- End of auto-generated description by cubic. -->",
          "timestamp": "2026-07-19T21:16:50Z",
          "url": "https://github.com/andymai/elevator-core/commit/b6a713080b91f0f41ba396ab64d60a6d7914c562"
        },
        "date": 1785143952622,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 4424028,
            "range": "± 4856",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 619659,
            "range": "± 4341",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 616524,
            "range": "± 2910",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 737838,
            "range": "± 3110",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 566922,
            "range": "± 5139",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 37068,
            "range": "± 639",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 8576,
            "range": "± 5323",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3484561,
            "range": "± 11742",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15424524,
            "range": "± 67300",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 616909,
            "range": "± 42296",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1978506,
            "range": "± 8734",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 8983902,
            "range": "± 171435",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 302352,
            "range": "± 3834",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1931595,
            "range": "± 18353",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8572762,
            "range": "± 83092",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 289660,
            "range": "± 4049",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1858322,
            "range": "± 17141",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8379650,
            "range": "± 17115",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 282970,
            "range": "± 1561",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1869451,
            "range": "± 8480",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8415233,
            "range": "± 56506",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 283079,
            "range": "± 2084",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1918455,
            "range": "± 8840",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8592640,
            "range": "± 48404",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 279631,
            "range": "± 5948",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 4668,
            "range": "± 4450",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 3928,
            "range": "± 1042",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 4792,
            "range": "± 2592",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 5157,
            "range": "± 5556",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 24542,
            "range": "± 242",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3484857,
            "range": "± 10659",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3316842,
            "range": "± 35965",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 5765,
            "range": "± 609",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 17375,
            "range": "± 539",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 9371,
            "range": "± 9131",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 95091,
            "range": "± 4307",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 17044,
            "range": "± 3237",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 902782,
            "range": "± 42935",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 101540,
            "range": "± 15242",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 15840,
            "range": "± 3347",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 870183,
            "range": "± 40948",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 101868,
            "range": "± 11108",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 18183,
            "range": "± 4434",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 5162968413,
            "range": "± 59294337",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 66858596,
            "range": "± 533469",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 17260235,
            "range": "± 40132",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 56291973,
            "range": "± 251021",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8380351,
            "range": "± 11453",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 36518,
            "range": "± 743",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 14860,
            "range": "± 370",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 6498,
            "range": "± 263",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 231781,
            "range": "± 9388",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 219643,
            "range": "± 7061",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 142832,
            "range": "± 36439",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Andy Aragon",
            "username": "andymai",
            "email": "hi@andymai.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "b6a713080b91f0f41ba396ab64d60a6d7914c562",
          "message": "ci(bench): detect regressions against a rolling median of nightlies (#933)\n\nReplaces #932, which GitHub auto-closed when its base branch\n(`ci/bench-calibration-damping`, the #931 branch) was deleted on merge.\nSame content, rebuilt as a single commit on top of `main`, with\ngreptile's review findings from #932 already folded in.\n\nFixes the structural half of #923/#924. #931 stopped calibration from\nmanufacturing regressions; this stops the gate from being unable to\nconfirm real ones.\n\n## The bug\n\nThe per-SHA baseline lock and the two-day persistence gate cannot both\nwork:\n\n1. The lock freezes the comparison point at the **first** nightly to\nmeasure a commit.\n2. So a real regression is visible on exactly **one** night — the\nnightly right after the new SHA lands, compared against the prior SHA's\nbaseline.\n3. That same night re-locks the baseline. Every night after compares the\nSHA **against itself**, where no code difference is representable.\n4. The gate only files when a bench regresses on **two consecutive**\nnightlies.\n\nA genuine regression's signal appears once and is then baselined away,\nso it can never be confirmed. Noise, which does recur on same-SHA\nnights, is the only thing the gate can ever confirm. Four consecutive\nnightlies ran on `0f9de844`, and #923/#924 were filed off\nself-comparisons of that commit.\n\n## The fix\n\nBaseline is now the per-bench median of the last 7 nightly measurements,\nread from Criterion's `estimates.json` rather than its `change:` lines:\n\n- A single unusually fast or slow runner moves the median by one sample\nout of seven, so the comparison point is stable night to night. That is\nwhat the per-SHA freeze was reaching for, without freezing.\n- A real regression stays above the median for several consecutive\nnights after landing, until enough post-regression samples drag the\nmedian up. **That is what makes the persistence gate meaningful for the\nfirst time.**\n\nCalibration still divides runner speed out, computed the same way\n(tonight vs its own median), still clamped to damping-only per #931.\n\nCache changes: the per-SHA `criterion-baseline-*` cache is replaced by a\nrolling `bench-history-*` cache keyed by `run_id` with prefix fallback.\nIt keeps `RUSTC_VER` in the key — absolute timings are\ncompiler-dependent, so a history must never span toolchains (#884).\nWrites are `schedule`-only so a `workflow_dispatch` preview cannot\ninject a sample.\n\n## Verification\n\nReplayed against the real 54-bench criterion tree from the failing\nnightly (run 29680411190), with every bench on the previous-night list\nso the two-day gate applies:\n\n| scenario | result |\n|---|---|\n| stable night (tonight == median) | `regressed=false` |\n| the #923/#924 shape (+3% benches, −10.9% calibration) |\n`regressed=false` |\n| genuine +20% on `dispatch_comparison/etd_50e_200s` | `regressed=true`,\nonly that bench flagged |\n| whole suite 12% slower (runner) | `regressed=false` |\n\n23 unit tests, including one that walks two nights in sequence to assert\na real regression survives into night two and is confirmed — the\nproperty the old scheme structurally could not have.\n\n## Review findings from #932, already applied\n\n- **Issue creation is now `schedule`-only.** A dispatch run restores the\nlast nightly's regression list and compares against the same history, so\nit would re-confirm a live regression and file a duplicate issue without\na night boundary passing. The cache-write guards already assumed\ndispatch was a read-only preview; the issue step did not match.\n- **A missing calibration bench is now distinguished from a warming-up\nhistory.** Both previously printed \"expected during warmup\", so\n`calibration_bench` failing outright looked benign.\n- **Bench ids resolve relative to the criterion root** rather than by\nlocating a `\"criterion\"` path component, which mis-keyed a bench group\nnamed `criterion`.\n- Fixed a duplicated word in the no-regression message.\n\n## Warm-up\n\nPer bench, fewer than 3 prior samples means it is recorded but not\ngated, so the first two nightlies after this lands report nothing while\nhistory accumulates. Warm-up is per bench, so newly added benches do not\nmute established ones.\n\n## Also\n\nAdds a `Bench script tests` CI job. These unit tests previously ran\nnowhere — the nightly executes at 08:00 UTC, so a bug in the detection\nmath surfaced as a bogus issue the next morning instead of on the PR\nthat caused it. (This also meant #932 itself got no real CI, since\n`ci.yml` only triggers on PRs based on `main`.)\n\n<!-- This is an auto-generated description by cubic. -->\n---\n## Summary by cubic\nDetect regressions against a rolling median of the last 7 nightlies\ninstead of a per-SHA baseline, so real regressions are confirmed and\nnoise is ignored. Also adds unit tests and updates workflows to use a\nrolling history keyed by `RUSTC_VER`.\n\n- **Bug Fixes**\n- Compare each bench to the median of its last 7 nightlies (from\n`estimates.json`) instead of a frozen per-SHA baseline, so regressions\npersist across nights and the two-day gate works.\n- Keep runner-speed correction via `calibration/fixed_workload` vs its\nown median, clamped to damping-only.\n- Warm-up: benches with fewer than 3 samples are recorded but not gated.\n\n- **Refactors**\n- Replace `.github/scripts/filter-bench-regressions.py` with\n`.github/scripts/detect-bench-regressions.py`; add unit tests and run\nthem in CI.\n- Use a rolling `bench-history.json` cache keyed by\n`bench-history-${ref}-${RUSTC_VER}-${run_id}` with prefix fallback;\nwrites are `schedule`-only. Issue creation is also `schedule`-only to\navoid duplicates from `workflow_dispatch`.\n- Update nightly workflow to restore/save history and the previous-night\nregression list; detector reads `target/criterion`, adjusts by\ncalibration, and sets `regressed`/`gate` outputs.\n\n<sup>Written for commit 5322bca416921d72d397287651a70f5543e81a5b.\nSummary will update on new commits.</sup>\n\n<a\nhref=\"https://cubic.dev/pr/andymai/elevator-core/pull/933?utm_source=github\"\ntarget=\"_blank\" rel=\"noopener noreferrer\"\ndata-no-image-dialog=\"true\"><picture><source\nmedia=\"(prefers-color-scheme: dark)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"><source\nmedia=\"(prefers-color-scheme: light)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-light.svg\"><img\nalt=\"Review in cubic\"\nsrc=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"></picture></a>\n\n<!-- End of auto-generated description by cubic. -->",
          "timestamp": "2026-07-19T21:16:50Z",
          "url": "https://github.com/andymai/elevator-core/commit/b6a713080b91f0f41ba396ab64d60a6d7914c562"
        },
        "date": 1785229664951,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 3930599,
            "range": "± 6214",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 610972,
            "range": "± 4015",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 596186,
            "range": "± 5109",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 716182,
            "range": "± 2180",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 552456,
            "range": "± 2612",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 34912,
            "range": "± 466",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 7403,
            "range": "± 329",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3356536,
            "range": "± 33941",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15017911,
            "range": "± 46821",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 569869,
            "range": "± 12104",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1842336,
            "range": "± 3760",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 9077327,
            "range": "± 94479",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 265585,
            "range": "± 964",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1798728,
            "range": "± 41146",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8666362,
            "range": "± 21277",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 260909,
            "range": "± 1281",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1722498,
            "range": "± 6797",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8480413,
            "range": "± 93610",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 253588,
            "range": "± 2492",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1726132,
            "range": "± 8088",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8724100,
            "range": "± 53982",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 253813,
            "range": "± 1383",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1793432,
            "range": "± 12059",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8642504,
            "range": "± 39693",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 252655,
            "range": "± 1354",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 3701,
            "range": "± 324",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 4029,
            "range": "± 4493",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 4067,
            "range": "± 334",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4008,
            "range": "± 1339",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 21503,
            "range": "± 446",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3421144,
            "range": "± 40417",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3209989,
            "range": "± 11586",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 7154,
            "range": "± 18658",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 16638,
            "range": "± 395",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 8703,
            "range": "± 10108",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 91623,
            "range": "± 1940",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 16318,
            "range": "± 2621",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 846166,
            "range": "± 35125",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 88793,
            "range": "± 2634",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 15252,
            "range": "± 2509",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 847981,
            "range": "± 15632",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 90621,
            "range": "± 8282",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 16493,
            "range": "± 2491",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 4546992867,
            "range": "± 12899674",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 63523798,
            "range": "± 316329",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 16947617,
            "range": "± 23709",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 54119595,
            "range": "± 273831",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8011160,
            "range": "± 23683",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 34132,
            "range": "± 1120",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 13779,
            "range": "± 995",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 6059,
            "range": "± 379",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 203748,
            "range": "± 15044",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 197774,
            "range": "± 11621",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 131746,
            "range": "± 9863",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "dependabot[bot]",
            "username": "dependabot[bot]",
            "email": "49699333+dependabot[bot]@users.noreply.github.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "2fbc9f21ddaf2d6e2f8e3f88e65467a935287a06",
          "message": "chore(deps): bump syn from 2.0.118 to 3.0.0 (#937)",
          "timestamp": "2026-07-28T14:51:07Z",
          "url": "https://github.com/andymai/elevator-core/commit/2fbc9f21ddaf2d6e2f8e3f88e65467a935287a06"
        },
        "date": 1785316227742,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 4091994,
            "range": "± 6193",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 567134,
            "range": "± 1845",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 602734,
            "range": "± 3528",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 698063,
            "range": "± 6001",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 530240,
            "range": "± 1482",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 36368,
            "range": "± 3223",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 8085,
            "range": "± 1809",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3240520,
            "range": "± 8807",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15207854,
            "range": "± 28477",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 508775,
            "range": "± 2071",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1865773,
            "range": "± 2973",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 9501946,
            "range": "± 41099",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 252260,
            "range": "± 1875",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1815768,
            "range": "± 8451",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 9145417,
            "range": "± 91478",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 247722,
            "range": "± 743",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1751061,
            "range": "± 6529",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8881056,
            "range": "± 54066",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 238596,
            "range": "± 1050",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1762390,
            "range": "± 7834",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8909765,
            "range": "± 27817",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 236866,
            "range": "± 3374",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1817592,
            "range": "± 2946",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 9120322,
            "range": "± 110058",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 221596,
            "range": "± 1166",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 4632,
            "range": "± 3204",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 4421,
            "range": "± 2504",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 5114,
            "range": "± 2557",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4836,
            "range": "± 2966",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 20466,
            "range": "± 644",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 2841720,
            "range": "± 5218",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 2973248,
            "range": "± 6981",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 8064,
            "range": "± 15218",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 19499,
            "range": "± 3148",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 10512,
            "range": "± 12987",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 100263,
            "range": "± 7683",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 18648,
            "range": "± 3597",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 909628,
            "range": "± 19561",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 94489,
            "range": "± 3893",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 15837,
            "range": "± 3175",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 957038,
            "range": "± 24762",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 99350,
            "range": "± 11796",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 18131,
            "range": "± 3203",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 5552498407,
            "range": "± 40432470",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 82197154,
            "range": "± 248175",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 18682705,
            "range": "± 70497",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 60642278,
            "range": "± 581378",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 7865312,
            "range": "± 27868",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 33484,
            "range": "± 617",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 14426,
            "range": "± 2841",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 6095,
            "range": "± 3338",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 177763,
            "range": "± 4581",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 174352,
            "range": "± 13581",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 121774,
            "range": "± 5736",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "dependabot[bot]",
            "username": "dependabot[bot]",
            "email": "49699333+dependabot[bot]@users.noreply.github.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "2fbc9f21ddaf2d6e2f8e3f88e65467a935287a06",
          "message": "chore(deps): bump syn from 2.0.118 to 3.0.0 (#937)",
          "timestamp": "2026-07-28T14:51:07Z",
          "url": "https://github.com/andymai/elevator-core/commit/2fbc9f21ddaf2d6e2f8e3f88e65467a935287a06"
        },
        "date": 1785402468882,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 4212805,
            "range": "± 32541",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 587676,
            "range": "± 3206",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 620819,
            "range": "± 6649",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 716989,
            "range": "± 1430",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 545732,
            "range": "± 3374",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 37423,
            "range": "± 3457",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 8097,
            "range": "± 1857",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3348283,
            "range": "± 37229",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15736467,
            "range": "± 83462",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 530915,
            "range": "± 2063",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1933336,
            "range": "± 8066",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 9711189,
            "range": "± 34016",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 257673,
            "range": "± 2085",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1880844,
            "range": "± 17318",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 9419572,
            "range": "± 34368",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 253013,
            "range": "± 3046",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1800200,
            "range": "± 10203",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 9139560,
            "range": "± 80981",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 245221,
            "range": "± 1726",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1810153,
            "range": "± 19864",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 9142309,
            "range": "± 90355",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 247252,
            "range": "± 2625",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1879339,
            "range": "± 20634",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 9419109,
            "range": "± 62235",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 227634,
            "range": "± 4432",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 4974,
            "range": "± 4728",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 4902,
            "range": "± 4737",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 5347,
            "range": "± 4920",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 5822,
            "range": "± 11757",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 21455,
            "range": "± 1627",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 2955047,
            "range": "± 15361",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3075104,
            "range": "± 30788",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 7139,
            "range": "± 4562",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 19767,
            "range": "± 2141",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 10199,
            "range": "± 7684",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 104911,
            "range": "± 9498",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 18476,
            "range": "± 3539",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 921474,
            "range": "± 22093",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 101664,
            "range": "± 9971",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 15698,
            "range": "± 3641",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 927067,
            "range": "± 22012",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 102894,
            "range": "± 11836",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 18406,
            "range": "± 3764",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 5719532043,
            "range": "± 9661671",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 84959776,
            "range": "± 238468",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 19261833,
            "range": "± 211382",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 62111843,
            "range": "± 109610",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8212280,
            "range": "± 145768",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 34401,
            "range": "± 2102",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 14967,
            "range": "± 1968",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 6099,
            "range": "± 2751",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 183372,
            "range": "± 10713",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 182592,
            "range": "± 25246",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 124923,
            "range": "± 8326",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "dependabot[bot]",
            "username": "dependabot[bot]",
            "email": "49699333+dependabot[bot]@users.noreply.github.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "2fbc9f21ddaf2d6e2f8e3f88e65467a935287a06",
          "message": "chore(deps): bump syn from 2.0.118 to 3.0.0 (#937)",
          "timestamp": "2026-07-28T14:51:07Z",
          "url": "https://github.com/andymai/elevator-core/commit/2fbc9f21ddaf2d6e2f8e3f88e65467a935287a06"
        },
        "date": 1785489206592,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 3929620,
            "range": "± 5683",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 613958,
            "range": "± 2556",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 609422,
            "range": "± 2969",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 709999,
            "range": "± 2663",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 562514,
            "range": "± 2015",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 35749,
            "range": "± 6232",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 7636,
            "range": "± 378",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3466638,
            "range": "± 13457",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15233174,
            "range": "± 42330",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 566363,
            "range": "± 2530",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1896708,
            "range": "± 14656",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 9199260,
            "range": "± 34234",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 272107,
            "range": "± 1316",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1818143,
            "range": "± 5215",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8884226,
            "range": "± 57111",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 263968,
            "range": "± 4080",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1762781,
            "range": "± 5968",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8767312,
            "range": "± 352793",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 257049,
            "range": "± 1695",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1768199,
            "range": "± 6653",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8640480,
            "range": "± 32629",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 259740,
            "range": "± 5049",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1829428,
            "range": "± 5559",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8850645,
            "range": "± 88083",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 257429,
            "range": "± 756",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 3698,
            "range": "± 313",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 4560,
            "range": "± 8677",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 4459,
            "range": "± 2816",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4025,
            "range": "± 531",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 21917,
            "range": "± 622",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3295598,
            "range": "± 60583",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3079633,
            "range": "± 10950",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 7420,
            "range": "± 22741",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 16950,
            "range": "± 2516",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 7652,
            "range": "± 468",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 89956,
            "range": "± 1515",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 16716,
            "range": "± 2337",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 832088,
            "range": "± 19376",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 88697,
            "range": "± 6816",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 15708,
            "range": "± 2848",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 842838,
            "range": "± 22312",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 87313,
            "range": "± 3337",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 17656,
            "range": "± 2824",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 5306222106,
            "range": "± 17784508",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 76359792,
            "range": "± 1575262",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 18131679,
            "range": "± 55700",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 62479989,
            "range": "± 897217",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8134619,
            "range": "± 31584",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 34705,
            "range": "± 1491",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 13853,
            "range": "± 1404",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 6243,
            "range": "± 317",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 204754,
            "range": "± 2924",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 199088,
            "range": "± 9330",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 134188,
            "range": "± 10671",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "dependabot[bot]",
            "username": "dependabot[bot]",
            "email": "49699333+dependabot[bot]@users.noreply.github.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "2fbc9f21ddaf2d6e2f8e3f88e65467a935287a06",
          "message": "chore(deps): bump syn from 2.0.118 to 3.0.0 (#937)",
          "timestamp": "2026-07-28T14:51:07Z",
          "url": "https://github.com/andymai/elevator-core/commit/2fbc9f21ddaf2d6e2f8e3f88e65467a935287a06"
        },
        "date": 1785574716632,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 3931415,
            "range": "± 3775",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 612239,
            "range": "± 2894",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 606422,
            "range": "± 2258",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 708429,
            "range": "± 3724",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 557723,
            "range": "± 1220",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 35156,
            "range": "± 3015",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 8033,
            "range": "± 4525",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3406534,
            "range": "± 13037",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15240308,
            "range": "± 40684",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 561915,
            "range": "± 1400",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1865796,
            "range": "± 5028",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 9189472,
            "range": "± 62884",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 267324,
            "range": "± 1133",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1807818,
            "range": "± 6424",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8776618,
            "range": "± 46203",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 258670,
            "range": "± 2712",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1754301,
            "range": "± 3635",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8712633,
            "range": "± 616597",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 251428,
            "range": "± 2451",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1755753,
            "range": "± 4966",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8624950,
            "range": "± 143358",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 256129,
            "range": "± 5511",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1808007,
            "range": "± 6387",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8778058,
            "range": "± 39579",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 253681,
            "range": "± 1935",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 4971,
            "range": "± 12628",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 3753,
            "range": "± 3088",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 4561,
            "range": "± 4682",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4026,
            "range": "± 1118",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 22304,
            "range": "± 5085",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3269763,
            "range": "± 9700",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3057738,
            "range": "± 7741",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 5902,
            "range": "± 7094",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 21107,
            "range": "± 49842",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 9301,
            "range": "± 18693",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 88236,
            "range": "± 2087",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 16073,
            "range": "± 3190",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 798453,
            "range": "± 13846",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 85387,
            "range": "± 2333",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 14933,
            "range": "± 2631",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 823034,
            "range": "± 5419",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 86596,
            "range": "± 2128",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 15838,
            "range": "± 2480",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 5319051864,
            "range": "± 12091334",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 75505136,
            "range": "± 205690",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 18162869,
            "range": "± 32986",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 62514071,
            "range": "± 225397",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8127849,
            "range": "± 19618",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 34408,
            "range": "± 1647",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 14227,
            "range": "± 3066",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 6044,
            "range": "± 213",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 204519,
            "range": "± 6588",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 202366,
            "range": "± 37568",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 132186,
            "range": "± 5916",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "dependabot[bot]",
            "username": "dependabot[bot]",
            "email": "49699333+dependabot[bot]@users.noreply.github.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "2fbc9f21ddaf2d6e2f8e3f88e65467a935287a06",
          "message": "chore(deps): bump syn from 2.0.118 to 3.0.0 (#937)",
          "timestamp": "2026-07-28T14:51:07Z",
          "url": "https://github.com/andymai/elevator-core/commit/2fbc9f21ddaf2d6e2f8e3f88e65467a935287a06"
        },
        "date": 1785661207791,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 3965384,
            "range": "± 49051",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 617275,
            "range": "± 1454",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 610551,
            "range": "± 1900",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 719143,
            "range": "± 2178",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 562598,
            "range": "± 2975",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 36729,
            "range": "± 2134",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 7978,
            "range": "± 659",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3447228,
            "range": "± 25418",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15182021,
            "range": "± 77163",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 564961,
            "range": "± 1309",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1890818,
            "range": "± 4774",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 9176687,
            "range": "± 59893",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 266011,
            "range": "± 2437",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1826199,
            "range": "± 10242",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8813873,
            "range": "± 44558",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 261790,
            "range": "± 897",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1764786,
            "range": "± 5868",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8549366,
            "range": "± 47548",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 254288,
            "range": "± 2139",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1775415,
            "range": "± 26802",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8675078,
            "range": "± 70321",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 254342,
            "range": "± 2412",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1816738,
            "range": "± 7090",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8824212,
            "range": "± 72916",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 254853,
            "range": "± 2391",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 3862,
            "range": "± 866",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 3971,
            "range": "± 4210",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 4165,
            "range": "± 353",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4647,
            "range": "± 6655",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 22274,
            "range": "± 3375",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3310710,
            "range": "± 108958",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3083235,
            "range": "± 11230",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 5957,
            "range": "± 6934",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 17937,
            "range": "± 11552",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 10100,
            "range": "± 24085",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 91128,
            "range": "± 7503",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 16530,
            "range": "± 2677",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 832258,
            "range": "± 15834",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 86170,
            "range": "± 3610",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 15207,
            "range": "± 2527",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 848570,
            "range": "± 11876",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 90271,
            "range": "± 4648",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 17803,
            "range": "± 7489",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 5352312054,
            "range": "± 26660129",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 76492359,
            "range": "± 842116",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 18169952,
            "range": "± 68462",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 63144333,
            "range": "± 232766",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8284181,
            "range": "± 17603",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 35217,
            "range": "± 923",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 14028,
            "range": "± 299",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 6705,
            "range": "± 2280",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 205763,
            "range": "± 7071",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 199761,
            "range": "± 7658",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 133837,
            "range": "± 9743",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "dependabot[bot]",
            "username": "dependabot[bot]",
            "email": "49699333+dependabot[bot]@users.noreply.github.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "2fbc9f21ddaf2d6e2f8e3f88e65467a935287a06",
          "message": "chore(deps): bump syn from 2.0.118 to 3.0.0 (#937)",
          "timestamp": "2026-07-28T14:51:07Z",
          "url": "https://github.com/andymai/elevator-core/commit/2fbc9f21ddaf2d6e2f8e3f88e65467a935287a06"
        },
        "date": 1785748746905,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 4426258,
            "range": "± 2792",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 614558,
            "range": "± 2391",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 618681,
            "range": "± 4579",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 728484,
            "range": "± 1266",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 568722,
            "range": "± 780",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 37588,
            "range": "± 4405",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 7987,
            "range": "± 475",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3477347,
            "range": "± 16767",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15279029,
            "range": "± 60930",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 608754,
            "range": "± 3805",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1984217,
            "range": "± 8756",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 8915132,
            "range": "± 68299",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 300162,
            "range": "± 1927",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1910210,
            "range": "± 8623",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8637304,
            "range": "± 197816",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 287208,
            "range": "± 1078",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1846000,
            "range": "± 6627",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8483739,
            "range": "± 84091",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 278816,
            "range": "± 1178",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1864688,
            "range": "± 15223",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8329779,
            "range": "± 30755",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 276822,
            "range": "± 2957",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1903675,
            "range": "± 8954",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8535597,
            "range": "± 55225",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 278281,
            "range": "± 2286",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 4090,
            "range": "± 1372",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 4170,
            "range": "± 4302",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 4339,
            "range": "± 393",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4258,
            "range": "± 1020",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 24347,
            "range": "± 130",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3311149,
            "range": "± 83723",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3139372,
            "range": "± 10144",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 8499,
            "range": "± 29200",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 17913,
            "range": "± 4544",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 9609,
            "range": "± 14756",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 96031,
            "range": "± 1828",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 17561,
            "range": "± 2853",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 842006,
            "range": "± 6923",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 89932,
            "range": "± 1443",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 16116,
            "range": "± 2726",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 880975,
            "range": "± 7367",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 93911,
            "range": "± 3489",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 17272,
            "range": "± 2970",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 5979644304,
            "range": "± 16680263",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 80294981,
            "range": "± 434529",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 18485024,
            "range": "± 33423",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 64679225,
            "range": "± 231975",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8514915,
            "range": "± 25994",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 37018,
            "range": "± 654",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 15229,
            "range": "± 709",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 6506,
            "range": "± 271",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 233131,
            "range": "± 24519",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 216845,
            "range": "± 4838",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 138936,
            "range": "± 10492",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "dependabot[bot]",
            "username": "dependabot[bot]",
            "email": "49699333+dependabot[bot]@users.noreply.github.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "3ffd9a128e399bf6f37dc5c4b7dec1ea8578ecc7",
          "message": "chore(deps): bump syn from 3.0.0 to 3.0.3 (#939)\n\nBumps [syn](https://github.com/dtolnay/syn) from 3.0.0 to 3.0.3.\n<details>\n<summary>Release notes</summary>\n<p><em>Sourced from <a\nhref=\"https://github.com/dtolnay/syn/releases\">syn's\nreleases</a>.</em></p>\n<blockquote>\n<h2>3.0.3</h2>\n<ul>\n<li>Documentation improvements</li>\n</ul>\n<h2>3.0.2</h2>\n<ul>\n<li>Add <a\nhref=\"https://docs.rs/syn/3/syn/struct.Error.html#method.new_range\"><code>Error::new_range(start..end,\n&quot;msg&quot;)</code></a> (<a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2068\">#2068</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2070\">#2070</a>)</li>\n<li>Add <a\nhref=\"https://docs.rs/syn/3/syn/buffer/struct.Cursor.html#method.prev_span\"><code>Cursor::prev_span</code></a></li>\n</ul>\n<h2>3.0.1</h2>\n<ul>\n<li>Parse const traits (<a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2056\">#2056</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2057\">#2057</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2058\">#2058</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2063\">#2063</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2064\">#2064</a>)</li>\n<li>Parse unsafe binder types (<a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2065\">#2065</a>)</li>\n<li>Parse impl restrictions (<a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2066\">#2066</a>)</li>\n</ul>\n</blockquote>\n</details>\n<details>\n<summary>Commits</summary>\n<ul>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/23dbaab4b0c43f56cd803894054cf366661e53b0\"><code>23dbaab</code></a>\nRelease 3.0.3</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/16aad4e9df889973182b93ea4d2309e594ba9fa4\"><code>16aad4e</code></a>\nMerge pull request <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2071\">#2071</a>\nfrom dtolnay/compatibility</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/42181b86c4c5dbf187069a500e28937873f39d8e\"><code>42181b8</code></a>\nAdd explanation of compatibility strategy</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/f3af08e3ab9764257faf14ff546cca148f7baaab\"><code>f3af08e</code></a>\nUpdate test suite to nightly-2026-07-21</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/88ee7be2197e61d6e84f0bff38eb2fe57998a765\"><code>88ee7be</code></a>\nRelease 3.0.2</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/587bc203a0e975e8261a65791203e8912edb1c42\"><code>587bc20</code></a>\nMerge pull request <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2070\">#2070</a>\nfrom dtolnay/emptyrange</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/96801f717ed1ae7943182afe1fd4c5857c50428b\"><code>96801f7</code></a>\nAllow Error::new_range at empty cursor range</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/9dc16c94cf0468dc4e4b1f6011cfd4040246c06c\"><code>9dc16c9</code></a>\nMerge pull request <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2069\">#2069</a>\nfrom dtolnay/prevspan</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/1db76b7ba3f4e16430e6b2c96f160c05160e056e\"><code>1db76b7</code></a>\nAlign on using impl trait across all Error constructors</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/bfa1ebf336f5fae0a0a22a89aeb991e2cd96c65a\"><code>bfa1ebf</code></a>\nMake Cursor::prev_span public</li>\n<li>Additional commits viewable in <a\nhref=\"https://github.com/dtolnay/syn/compare/3.0.0...3.0.3\">compare\nview</a></li>\n</ul>\n</details>\n<br />\n\n\n[![Dependabot compatibility\nscore](https://dependabot-badges.githubapp.com/badges/compatibility_score?dependency-name=syn&package-manager=cargo&previous-version=3.0.0&new-version=3.0.3)](https://docs.github.com/en/github/managing-security-vulnerabilities/about-dependabot-security-updates#about-compatibility-scores)\n\nDependabot will resolve any conflicts with this PR as long as you don't\nalter it yourself. You can also trigger a rebase manually by commenting\n`@dependabot rebase`.\n\n[//]: # (dependabot-automerge-start)\n[//]: # (dependabot-automerge-end)\n\n---\n\n<details>\n<summary>Dependabot commands and options</summary>\n<br />\n\nYou can trigger Dependabot actions by commenting on this PR:\n- `@dependabot rebase` will rebase this PR\n- `@dependabot recreate` will recreate this PR, overwriting any edits\nthat have been made to it\n- `@dependabot show <dependency name> ignore conditions` will show all\nof the ignore conditions of the specified dependency\n- `@dependabot ignore this major version` will close this PR and stop\nDependabot creating any more for this major version (unless you reopen\nthe PR or upgrade to it yourself)\n- `@dependabot ignore this minor version` will close this PR and stop\nDependabot creating any more for this minor version (unless you reopen\nthe PR or upgrade to it yourself)\n- `@dependabot ignore this dependency` will close this PR and stop\nDependabot creating any more for this dependency (unless you reopen the\nPR or upgrade to it yourself)\n\n\n</details>\n\n<!-- This is an auto-generated description by cubic. -->\n---\n## Summary by cubic\nBump `syn` to 3.0.3 to pick up parser improvements and minor APIs. Only\nlockfile changes; no code changes required.\n\n- **Dependencies**\n- Parser updates: support for const traits, unsafe binder types, and\nimpl restrictions.\n- New APIs: `Error::new_range` and `Cursor::prev_span`, plus docs\nimprovements.\n\n<sup>Written for commit 72077743e0d0f0e85f812cd68220ac88683e81b1.\nSummary will update on new commits.</sup>\n\n<a\nhref=\"https://cubic.dev/pr/andymai/elevator-core/pull/939?utm_source=github\"\ntarget=\"_blank\" rel=\"noopener noreferrer\"\ndata-no-image-dialog=\"true\"><picture><source\nmedia=\"(prefers-color-scheme: dark)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"><source\nmedia=\"(prefers-color-scheme: light)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-light.svg\"><img\nalt=\"Review in cubic\"\nsrc=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"></picture></a>\n\n<!-- End of auto-generated description by cubic. -->\n\nSigned-off-by: dependabot[bot] <support@github.com>\nCo-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>",
          "timestamp": "2026-08-03T20:37:29Z",
          "url": "https://github.com/andymai/elevator-core/commit/3ffd9a128e399bf6f37dc5c4b7dec1ea8578ecc7"
        },
        "date": 1785834533243,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 3936216,
            "range": "± 5519",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 611407,
            "range": "± 11551",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 614960,
            "range": "± 16893",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 704743,
            "range": "± 758",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 561373,
            "range": "± 11700",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 34608,
            "range": "± 942",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 7419,
            "range": "± 326",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3435772,
            "range": "± 124201",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15173659,
            "range": "± 44374",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 567156,
            "range": "± 1936",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1888128,
            "range": "± 8700",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 9206023,
            "range": "± 76932",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 266527,
            "range": "± 3321",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1842964,
            "range": "± 7821",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8763088,
            "range": "± 20944",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 261441,
            "range": "± 1407",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1764822,
            "range": "± 7593",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8553216,
            "range": "± 34190",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 254736,
            "range": "± 1387",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1777221,
            "range": "± 5879",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8606124,
            "range": "± 86188",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 255387,
            "range": "± 4846",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1834070,
            "range": "± 13984",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8816300,
            "range": "± 81462",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 255241,
            "range": "± 2845",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 3719,
            "range": "± 668",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 3754,
            "range": "± 2323",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 4351,
            "range": "± 717",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4400,
            "range": "± 1845",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 22970,
            "range": "± 1403",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3230981,
            "range": "± 4688",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3105540,
            "range": "± 6012",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 6505,
            "range": "± 10232",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 17753,
            "range": "± 14821",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 7994,
            "range": "± 4769",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 89112,
            "range": "± 1827",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 16086,
            "range": "± 2351",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 799991,
            "range": "± 7976",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 85201,
            "range": "± 1737",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 15074,
            "range": "± 2456",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 819036,
            "range": "± 8217",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 86965,
            "range": "± 2796",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 15916,
            "range": "± 2526",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 5304144862,
            "range": "± 15393617",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 75578402,
            "range": "± 262454",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 18123995,
            "range": "± 47360",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 62436554,
            "range": "± 260100",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8104833,
            "range": "± 12523",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 34219,
            "range": "± 811",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 13793,
            "range": "± 1255",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 5942,
            "range": "± 271",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 202988,
            "range": "± 3638",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 207830,
            "range": "± 7688",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 132760,
            "range": "± 14089",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "dependabot[bot]",
            "username": "dependabot[bot]",
            "email": "49699333+dependabot[bot]@users.noreply.github.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "3ffd9a128e399bf6f37dc5c4b7dec1ea8578ecc7",
          "message": "chore(deps): bump syn from 3.0.0 to 3.0.3 (#939)\n\nBumps [syn](https://github.com/dtolnay/syn) from 3.0.0 to 3.0.3.\n<details>\n<summary>Release notes</summary>\n<p><em>Sourced from <a\nhref=\"https://github.com/dtolnay/syn/releases\">syn's\nreleases</a>.</em></p>\n<blockquote>\n<h2>3.0.3</h2>\n<ul>\n<li>Documentation improvements</li>\n</ul>\n<h2>3.0.2</h2>\n<ul>\n<li>Add <a\nhref=\"https://docs.rs/syn/3/syn/struct.Error.html#method.new_range\"><code>Error::new_range(start..end,\n&quot;msg&quot;)</code></a> (<a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2068\">#2068</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2070\">#2070</a>)</li>\n<li>Add <a\nhref=\"https://docs.rs/syn/3/syn/buffer/struct.Cursor.html#method.prev_span\"><code>Cursor::prev_span</code></a></li>\n</ul>\n<h2>3.0.1</h2>\n<ul>\n<li>Parse const traits (<a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2056\">#2056</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2057\">#2057</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2058\">#2058</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2063\">#2063</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2064\">#2064</a>)</li>\n<li>Parse unsafe binder types (<a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2065\">#2065</a>)</li>\n<li>Parse impl restrictions (<a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2066\">#2066</a>)</li>\n</ul>\n</blockquote>\n</details>\n<details>\n<summary>Commits</summary>\n<ul>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/23dbaab4b0c43f56cd803894054cf366661e53b0\"><code>23dbaab</code></a>\nRelease 3.0.3</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/16aad4e9df889973182b93ea4d2309e594ba9fa4\"><code>16aad4e</code></a>\nMerge pull request <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2071\">#2071</a>\nfrom dtolnay/compatibility</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/42181b86c4c5dbf187069a500e28937873f39d8e\"><code>42181b8</code></a>\nAdd explanation of compatibility strategy</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/f3af08e3ab9764257faf14ff546cca148f7baaab\"><code>f3af08e</code></a>\nUpdate test suite to nightly-2026-07-21</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/88ee7be2197e61d6e84f0bff38eb2fe57998a765\"><code>88ee7be</code></a>\nRelease 3.0.2</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/587bc203a0e975e8261a65791203e8912edb1c42\"><code>587bc20</code></a>\nMerge pull request <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2070\">#2070</a>\nfrom dtolnay/emptyrange</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/96801f717ed1ae7943182afe1fd4c5857c50428b\"><code>96801f7</code></a>\nAllow Error::new_range at empty cursor range</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/9dc16c94cf0468dc4e4b1f6011cfd4040246c06c\"><code>9dc16c9</code></a>\nMerge pull request <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2069\">#2069</a>\nfrom dtolnay/prevspan</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/1db76b7ba3f4e16430e6b2c96f160c05160e056e\"><code>1db76b7</code></a>\nAlign on using impl trait across all Error constructors</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/bfa1ebf336f5fae0a0a22a89aeb991e2cd96c65a\"><code>bfa1ebf</code></a>\nMake Cursor::prev_span public</li>\n<li>Additional commits viewable in <a\nhref=\"https://github.com/dtolnay/syn/compare/3.0.0...3.0.3\">compare\nview</a></li>\n</ul>\n</details>\n<br />\n\n\n[![Dependabot compatibility\nscore](https://dependabot-badges.githubapp.com/badges/compatibility_score?dependency-name=syn&package-manager=cargo&previous-version=3.0.0&new-version=3.0.3)](https://docs.github.com/en/github/managing-security-vulnerabilities/about-dependabot-security-updates#about-compatibility-scores)\n\nDependabot will resolve any conflicts with this PR as long as you don't\nalter it yourself. You can also trigger a rebase manually by commenting\n`@dependabot rebase`.\n\n[//]: # (dependabot-automerge-start)\n[//]: # (dependabot-automerge-end)\n\n---\n\n<details>\n<summary>Dependabot commands and options</summary>\n<br />\n\nYou can trigger Dependabot actions by commenting on this PR:\n- `@dependabot rebase` will rebase this PR\n- `@dependabot recreate` will recreate this PR, overwriting any edits\nthat have been made to it\n- `@dependabot show <dependency name> ignore conditions` will show all\nof the ignore conditions of the specified dependency\n- `@dependabot ignore this major version` will close this PR and stop\nDependabot creating any more for this major version (unless you reopen\nthe PR or upgrade to it yourself)\n- `@dependabot ignore this minor version` will close this PR and stop\nDependabot creating any more for this minor version (unless you reopen\nthe PR or upgrade to it yourself)\n- `@dependabot ignore this dependency` will close this PR and stop\nDependabot creating any more for this dependency (unless you reopen the\nPR or upgrade to it yourself)\n\n\n</details>\n\n<!-- This is an auto-generated description by cubic. -->\n---\n## Summary by cubic\nBump `syn` to 3.0.3 to pick up parser improvements and minor APIs. Only\nlockfile changes; no code changes required.\n\n- **Dependencies**\n- Parser updates: support for const traits, unsafe binder types, and\nimpl restrictions.\n- New APIs: `Error::new_range` and `Cursor::prev_span`, plus docs\nimprovements.\n\n<sup>Written for commit 72077743e0d0f0e85f812cd68220ac88683e81b1.\nSummary will update on new commits.</sup>\n\n<a\nhref=\"https://cubic.dev/pr/andymai/elevator-core/pull/939?utm_source=github\"\ntarget=\"_blank\" rel=\"noopener noreferrer\"\ndata-no-image-dialog=\"true\"><picture><source\nmedia=\"(prefers-color-scheme: dark)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"><source\nmedia=\"(prefers-color-scheme: light)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-light.svg\"><img\nalt=\"Review in cubic\"\nsrc=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"></picture></a>\n\n<!-- End of auto-generated description by cubic. -->\n\nSigned-off-by: dependabot[bot] <support@github.com>\nCo-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>",
          "timestamp": "2026-08-03T20:37:29Z",
          "url": "https://github.com/andymai/elevator-core/commit/3ffd9a128e399bf6f37dc5c4b7dec1ea8578ecc7"
        },
        "date": 1785920892075,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 3925302,
            "range": "± 3784",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 604151,
            "range": "± 898",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 600489,
            "range": "± 1648",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 701060,
            "range": "± 1560",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 556645,
            "range": "± 1210",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 34887,
            "range": "± 531",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 7503,
            "range": "± 1007",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3397858,
            "range": "± 17798",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15227845,
            "range": "± 46167",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 567134,
            "range": "± 1473",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1881320,
            "range": "± 5002",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 9190538,
            "range": "± 52611",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 274254,
            "range": "± 1021",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1823497,
            "range": "± 6179",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8816426,
            "range": "± 30468",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 264713,
            "range": "± 1271",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1752123,
            "range": "± 3566",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8630073,
            "range": "± 47114",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 261591,
            "range": "± 2849",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1778052,
            "range": "± 7810",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8625875,
            "range": "± 25763",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 258803,
            "range": "± 1491",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1826174,
            "range": "± 7273",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8841649,
            "range": "± 73341",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 260828,
            "range": "± 1318",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 3640,
            "range": "± 706",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 3459,
            "range": "± 656",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 4675,
            "range": "± 6152",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 3951,
            "range": "± 1087",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 21882,
            "range": "± 3913",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3259775,
            "range": "± 10783",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3028970,
            "range": "± 3031",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 7893,
            "range": "± 28003",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 16207,
            "range": "± 303",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 8115,
            "range": "± 6893",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 99879,
            "range": "± 113626",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 16230,
            "range": "± 2129",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 815480,
            "range": "± 5235",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 84943,
            "range": "± 8306",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 15541,
            "range": "± 2235",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 825924,
            "range": "± 21802",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 90920,
            "range": "± 34533",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 16258,
            "range": "± 2027",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 5301691803,
            "range": "± 18597857",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 75608247,
            "range": "± 419195",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 18248481,
            "range": "± 238739",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 62129446,
            "range": "± 171799",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8054833,
            "range": "± 12621",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 34268,
            "range": "± 872",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 13762,
            "range": "± 1936",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 5996,
            "range": "± 183",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 205824,
            "range": "± 20732",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 196456,
            "range": "± 2653",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 132333,
            "range": "± 26530",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "dependabot[bot]",
            "username": "dependabot[bot]",
            "email": "49699333+dependabot[bot]@users.noreply.github.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "3ffd9a128e399bf6f37dc5c4b7dec1ea8578ecc7",
          "message": "chore(deps): bump syn from 3.0.0 to 3.0.3 (#939)\n\nBumps [syn](https://github.com/dtolnay/syn) from 3.0.0 to 3.0.3.\n<details>\n<summary>Release notes</summary>\n<p><em>Sourced from <a\nhref=\"https://github.com/dtolnay/syn/releases\">syn's\nreleases</a>.</em></p>\n<blockquote>\n<h2>3.0.3</h2>\n<ul>\n<li>Documentation improvements</li>\n</ul>\n<h2>3.0.2</h2>\n<ul>\n<li>Add <a\nhref=\"https://docs.rs/syn/3/syn/struct.Error.html#method.new_range\"><code>Error::new_range(start..end,\n&quot;msg&quot;)</code></a> (<a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2068\">#2068</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2070\">#2070</a>)</li>\n<li>Add <a\nhref=\"https://docs.rs/syn/3/syn/buffer/struct.Cursor.html#method.prev_span\"><code>Cursor::prev_span</code></a></li>\n</ul>\n<h2>3.0.1</h2>\n<ul>\n<li>Parse const traits (<a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2056\">#2056</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2057\">#2057</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2058\">#2058</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2063\">#2063</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2064\">#2064</a>)</li>\n<li>Parse unsafe binder types (<a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2065\">#2065</a>)</li>\n<li>Parse impl restrictions (<a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2066\">#2066</a>)</li>\n</ul>\n</blockquote>\n</details>\n<details>\n<summary>Commits</summary>\n<ul>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/23dbaab4b0c43f56cd803894054cf366661e53b0\"><code>23dbaab</code></a>\nRelease 3.0.3</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/16aad4e9df889973182b93ea4d2309e594ba9fa4\"><code>16aad4e</code></a>\nMerge pull request <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2071\">#2071</a>\nfrom dtolnay/compatibility</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/42181b86c4c5dbf187069a500e28937873f39d8e\"><code>42181b8</code></a>\nAdd explanation of compatibility strategy</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/f3af08e3ab9764257faf14ff546cca148f7baaab\"><code>f3af08e</code></a>\nUpdate test suite to nightly-2026-07-21</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/88ee7be2197e61d6e84f0bff38eb2fe57998a765\"><code>88ee7be</code></a>\nRelease 3.0.2</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/587bc203a0e975e8261a65791203e8912edb1c42\"><code>587bc20</code></a>\nMerge pull request <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2070\">#2070</a>\nfrom dtolnay/emptyrange</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/96801f717ed1ae7943182afe1fd4c5857c50428b\"><code>96801f7</code></a>\nAllow Error::new_range at empty cursor range</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/9dc16c94cf0468dc4e4b1f6011cfd4040246c06c\"><code>9dc16c9</code></a>\nMerge pull request <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2069\">#2069</a>\nfrom dtolnay/prevspan</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/1db76b7ba3f4e16430e6b2c96f160c05160e056e\"><code>1db76b7</code></a>\nAlign on using impl trait across all Error constructors</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/bfa1ebf336f5fae0a0a22a89aeb991e2cd96c65a\"><code>bfa1ebf</code></a>\nMake Cursor::prev_span public</li>\n<li>Additional commits viewable in <a\nhref=\"https://github.com/dtolnay/syn/compare/3.0.0...3.0.3\">compare\nview</a></li>\n</ul>\n</details>\n<br />\n\n\n[![Dependabot compatibility\nscore](https://dependabot-badges.githubapp.com/badges/compatibility_score?dependency-name=syn&package-manager=cargo&previous-version=3.0.0&new-version=3.0.3)](https://docs.github.com/en/github/managing-security-vulnerabilities/about-dependabot-security-updates#about-compatibility-scores)\n\nDependabot will resolve any conflicts with this PR as long as you don't\nalter it yourself. You can also trigger a rebase manually by commenting\n`@dependabot rebase`.\n\n[//]: # (dependabot-automerge-start)\n[//]: # (dependabot-automerge-end)\n\n---\n\n<details>\n<summary>Dependabot commands and options</summary>\n<br />\n\nYou can trigger Dependabot actions by commenting on this PR:\n- `@dependabot rebase` will rebase this PR\n- `@dependabot recreate` will recreate this PR, overwriting any edits\nthat have been made to it\n- `@dependabot show <dependency name> ignore conditions` will show all\nof the ignore conditions of the specified dependency\n- `@dependabot ignore this major version` will close this PR and stop\nDependabot creating any more for this major version (unless you reopen\nthe PR or upgrade to it yourself)\n- `@dependabot ignore this minor version` will close this PR and stop\nDependabot creating any more for this minor version (unless you reopen\nthe PR or upgrade to it yourself)\n- `@dependabot ignore this dependency` will close this PR and stop\nDependabot creating any more for this dependency (unless you reopen the\nPR or upgrade to it yourself)\n\n\n</details>\n\n<!-- This is an auto-generated description by cubic. -->\n---\n## Summary by cubic\nBump `syn` to 3.0.3 to pick up parser improvements and minor APIs. Only\nlockfile changes; no code changes required.\n\n- **Dependencies**\n- Parser updates: support for const traits, unsafe binder types, and\nimpl restrictions.\n- New APIs: `Error::new_range` and `Cursor::prev_span`, plus docs\nimprovements.\n\n<sup>Written for commit 72077743e0d0f0e85f812cd68220ac88683e81b1.\nSummary will update on new commits.</sup>\n\n<a\nhref=\"https://cubic.dev/pr/andymai/elevator-core/pull/939?utm_source=github\"\ntarget=\"_blank\" rel=\"noopener noreferrer\"\ndata-no-image-dialog=\"true\"><picture><source\nmedia=\"(prefers-color-scheme: dark)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"><source\nmedia=\"(prefers-color-scheme: light)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-light.svg\"><img\nalt=\"Review in cubic\"\nsrc=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"></picture></a>\n\n<!-- End of auto-generated description by cubic. -->\n\nSigned-off-by: dependabot[bot] <support@github.com>\nCo-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>",
          "timestamp": "2026-08-03T20:37:29Z",
          "url": "https://github.com/andymai/elevator-core/commit/3ffd9a128e399bf6f37dc5c4b7dec1ea8578ecc7"
        },
        "date": 1786007353557,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 4433209,
            "range": "± 60905",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 623311,
            "range": "± 12350",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 630536,
            "range": "± 21592",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 753983,
            "range": "± 59971",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 584271,
            "range": "± 14980",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 38234,
            "range": "± 5857",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 8396,
            "range": "± 1025",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3500839,
            "range": "± 76290",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15441197,
            "range": "± 63160",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 625322,
            "range": "± 55567",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1981869,
            "range": "± 7116",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 9003880,
            "range": "± 75614",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 294851,
            "range": "± 3551",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1920241,
            "range": "± 11708",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8601824,
            "range": "± 50987",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 287941,
            "range": "± 1947",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1841067,
            "range": "± 5204",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8382301,
            "range": "± 36445",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 284083,
            "range": "± 1936",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1850513,
            "range": "± 7201",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8477018,
            "range": "± 143557",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 282963,
            "range": "± 558",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1909804,
            "range": "± 13295",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8645504,
            "range": "± 224737",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 280889,
            "range": "± 4860",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 4481,
            "range": "± 2444",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 4264,
            "range": "± 2329",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 5626,
            "range": "± 11989",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4400,
            "range": "± 1074",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 24647,
            "range": "± 1212",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3272798,
            "range": "± 8198",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3138032,
            "range": "± 80197",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 5715,
            "range": "± 518",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 22954,
            "range": "± 49108",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 9360,
            "range": "± 11134",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 96742,
            "range": "± 6323",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 17250,
            "range": "± 3272",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 868876,
            "range": "± 70943",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 94900,
            "range": "± 6499",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 16967,
            "range": "± 4489",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 866042,
            "range": "± 16859",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 96830,
            "range": "± 9628",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 17196,
            "range": "± 3708",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 5986932340,
            "range": "± 22423974",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 80286074,
            "range": "± 184248",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 18700675,
            "range": "± 66588",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 64940370,
            "range": "± 371155",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8388355,
            "range": "± 23964",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 37170,
            "range": "± 1891",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 15095,
            "range": "± 576",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 6465,
            "range": "± 523",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 230935,
            "range": "± 7016",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 217963,
            "range": "± 5902",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 140225,
            "range": "± 10400",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "dependabot[bot]",
            "username": "dependabot[bot]",
            "email": "49699333+dependabot[bot]@users.noreply.github.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "3ffd9a128e399bf6f37dc5c4b7dec1ea8578ecc7",
          "message": "chore(deps): bump syn from 3.0.0 to 3.0.3 (#939)\n\nBumps [syn](https://github.com/dtolnay/syn) from 3.0.0 to 3.0.3.\n<details>\n<summary>Release notes</summary>\n<p><em>Sourced from <a\nhref=\"https://github.com/dtolnay/syn/releases\">syn's\nreleases</a>.</em></p>\n<blockquote>\n<h2>3.0.3</h2>\n<ul>\n<li>Documentation improvements</li>\n</ul>\n<h2>3.0.2</h2>\n<ul>\n<li>Add <a\nhref=\"https://docs.rs/syn/3/syn/struct.Error.html#method.new_range\"><code>Error::new_range(start..end,\n&quot;msg&quot;)</code></a> (<a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2068\">#2068</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2070\">#2070</a>)</li>\n<li>Add <a\nhref=\"https://docs.rs/syn/3/syn/buffer/struct.Cursor.html#method.prev_span\"><code>Cursor::prev_span</code></a></li>\n</ul>\n<h2>3.0.1</h2>\n<ul>\n<li>Parse const traits (<a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2056\">#2056</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2057\">#2057</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2058\">#2058</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2063\">#2063</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2064\">#2064</a>)</li>\n<li>Parse unsafe binder types (<a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2065\">#2065</a>)</li>\n<li>Parse impl restrictions (<a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2066\">#2066</a>)</li>\n</ul>\n</blockquote>\n</details>\n<details>\n<summary>Commits</summary>\n<ul>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/23dbaab4b0c43f56cd803894054cf366661e53b0\"><code>23dbaab</code></a>\nRelease 3.0.3</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/16aad4e9df889973182b93ea4d2309e594ba9fa4\"><code>16aad4e</code></a>\nMerge pull request <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2071\">#2071</a>\nfrom dtolnay/compatibility</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/42181b86c4c5dbf187069a500e28937873f39d8e\"><code>42181b8</code></a>\nAdd explanation of compatibility strategy</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/f3af08e3ab9764257faf14ff546cca148f7baaab\"><code>f3af08e</code></a>\nUpdate test suite to nightly-2026-07-21</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/88ee7be2197e61d6e84f0bff38eb2fe57998a765\"><code>88ee7be</code></a>\nRelease 3.0.2</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/587bc203a0e975e8261a65791203e8912edb1c42\"><code>587bc20</code></a>\nMerge pull request <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2070\">#2070</a>\nfrom dtolnay/emptyrange</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/96801f717ed1ae7943182afe1fd4c5857c50428b\"><code>96801f7</code></a>\nAllow Error::new_range at empty cursor range</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/9dc16c94cf0468dc4e4b1f6011cfd4040246c06c\"><code>9dc16c9</code></a>\nMerge pull request <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2069\">#2069</a>\nfrom dtolnay/prevspan</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/1db76b7ba3f4e16430e6b2c96f160c05160e056e\"><code>1db76b7</code></a>\nAlign on using impl trait across all Error constructors</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/bfa1ebf336f5fae0a0a22a89aeb991e2cd96c65a\"><code>bfa1ebf</code></a>\nMake Cursor::prev_span public</li>\n<li>Additional commits viewable in <a\nhref=\"https://github.com/dtolnay/syn/compare/3.0.0...3.0.3\">compare\nview</a></li>\n</ul>\n</details>\n<br />\n\n\n[![Dependabot compatibility\nscore](https://dependabot-badges.githubapp.com/badges/compatibility_score?dependency-name=syn&package-manager=cargo&previous-version=3.0.0&new-version=3.0.3)](https://docs.github.com/en/github/managing-security-vulnerabilities/about-dependabot-security-updates#about-compatibility-scores)\n\nDependabot will resolve any conflicts with this PR as long as you don't\nalter it yourself. You can also trigger a rebase manually by commenting\n`@dependabot rebase`.\n\n[//]: # (dependabot-automerge-start)\n[//]: # (dependabot-automerge-end)\n\n---\n\n<details>\n<summary>Dependabot commands and options</summary>\n<br />\n\nYou can trigger Dependabot actions by commenting on this PR:\n- `@dependabot rebase` will rebase this PR\n- `@dependabot recreate` will recreate this PR, overwriting any edits\nthat have been made to it\n- `@dependabot show <dependency name> ignore conditions` will show all\nof the ignore conditions of the specified dependency\n- `@dependabot ignore this major version` will close this PR and stop\nDependabot creating any more for this major version (unless you reopen\nthe PR or upgrade to it yourself)\n- `@dependabot ignore this minor version` will close this PR and stop\nDependabot creating any more for this minor version (unless you reopen\nthe PR or upgrade to it yourself)\n- `@dependabot ignore this dependency` will close this PR and stop\nDependabot creating any more for this dependency (unless you reopen the\nPR or upgrade to it yourself)\n\n\n</details>\n\n<!-- This is an auto-generated description by cubic. -->\n---\n## Summary by cubic\nBump `syn` to 3.0.3 to pick up parser improvements and minor APIs. Only\nlockfile changes; no code changes required.\n\n- **Dependencies**\n- Parser updates: support for const traits, unsafe binder types, and\nimpl restrictions.\n- New APIs: `Error::new_range` and `Cursor::prev_span`, plus docs\nimprovements.\n\n<sup>Written for commit 72077743e0d0f0e85f812cd68220ac88683e81b1.\nSummary will update on new commits.</sup>\n\n<a\nhref=\"https://cubic.dev/pr/andymai/elevator-core/pull/939?utm_source=github\"\ntarget=\"_blank\" rel=\"noopener noreferrer\"\ndata-no-image-dialog=\"true\"><picture><source\nmedia=\"(prefers-color-scheme: dark)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"><source\nmedia=\"(prefers-color-scheme: light)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-light.svg\"><img\nalt=\"Review in cubic\"\nsrc=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"></picture></a>\n\n<!-- End of auto-generated description by cubic. -->\n\nSigned-off-by: dependabot[bot] <support@github.com>\nCo-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>",
          "timestamp": "2026-08-03T20:37:29Z",
          "url": "https://github.com/andymai/elevator-core/commit/3ffd9a128e399bf6f37dc5c4b7dec1ea8578ecc7"
        },
        "date": 1786091739079,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 3432936,
            "range": "± 1954",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 466769,
            "range": "± 1360",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 479484,
            "range": "± 962",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 561313,
            "range": "± 1128",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 428856,
            "range": "± 1124",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 29789,
            "range": "± 3172",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 6356,
            "range": "± 290",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 2713845,
            "range": "± 8913",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 12039656,
            "range": "± 60073",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 474570,
            "range": "± 907",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1543988,
            "range": "± 3413",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 6966066,
            "range": "± 52932",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 235054,
            "range": "± 1094",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1484605,
            "range": "± 3743",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 6645140,
            "range": "± 24114",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 227236,
            "range": "± 3204",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1430451,
            "range": "± 6425",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 6442790,
            "range": "± 22031",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 221169,
            "range": "± 791",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1442525,
            "range": "± 5901",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 6490424,
            "range": "± 46456",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 220583,
            "range": "± 2554",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1488770,
            "range": "± 5153",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 6641595,
            "range": "± 32657",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 219202,
            "range": "± 2540",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 3755,
            "range": "± 4394",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 3342,
            "range": "± 3421",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 4276,
            "range": "± 7581",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4306,
            "range": "± 9058",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 19097,
            "range": "± 1447",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 2543958,
            "range": "± 7713",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 2414075,
            "range": "± 9293",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 5836,
            "range": "± 15292",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 14108,
            "range": "± 7381",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 6914,
            "range": "± 6399",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 74207,
            "range": "± 4001",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 13781,
            "range": "± 1919",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 668651,
            "range": "± 6566",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 77780,
            "range": "± 77784",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 13583,
            "range": "± 2501",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 664865,
            "range": "± 6833",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 73261,
            "range": "± 1082",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 13863,
            "range": "± 2138",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 4637678218,
            "range": "± 17955058",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 61744814,
            "range": "± 126572",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 14284082,
            "range": "± 42050",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 50061536,
            "range": "± 168538",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 6554554,
            "range": "± 4945",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 26672,
            "range": "± 467",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 11610,
            "range": "± 215",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 5128,
            "range": "± 204",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 179675,
            "range": "± 8511",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 169232,
            "range": "± 8394",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 108840,
            "range": "± 7734",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "dependabot[bot]",
            "username": "dependabot[bot]",
            "email": "49699333+dependabot[bot]@users.noreply.github.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "3ffd9a128e399bf6f37dc5c4b7dec1ea8578ecc7",
          "message": "chore(deps): bump syn from 3.0.0 to 3.0.3 (#939)\n\nBumps [syn](https://github.com/dtolnay/syn) from 3.0.0 to 3.0.3.\n<details>\n<summary>Release notes</summary>\n<p><em>Sourced from <a\nhref=\"https://github.com/dtolnay/syn/releases\">syn's\nreleases</a>.</em></p>\n<blockquote>\n<h2>3.0.3</h2>\n<ul>\n<li>Documentation improvements</li>\n</ul>\n<h2>3.0.2</h2>\n<ul>\n<li>Add <a\nhref=\"https://docs.rs/syn/3/syn/struct.Error.html#method.new_range\"><code>Error::new_range(start..end,\n&quot;msg&quot;)</code></a> (<a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2068\">#2068</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2070\">#2070</a>)</li>\n<li>Add <a\nhref=\"https://docs.rs/syn/3/syn/buffer/struct.Cursor.html#method.prev_span\"><code>Cursor::prev_span</code></a></li>\n</ul>\n<h2>3.0.1</h2>\n<ul>\n<li>Parse const traits (<a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2056\">#2056</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2057\">#2057</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2058\">#2058</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2063\">#2063</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2064\">#2064</a>)</li>\n<li>Parse unsafe binder types (<a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2065\">#2065</a>)</li>\n<li>Parse impl restrictions (<a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2066\">#2066</a>)</li>\n</ul>\n</blockquote>\n</details>\n<details>\n<summary>Commits</summary>\n<ul>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/23dbaab4b0c43f56cd803894054cf366661e53b0\"><code>23dbaab</code></a>\nRelease 3.0.3</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/16aad4e9df889973182b93ea4d2309e594ba9fa4\"><code>16aad4e</code></a>\nMerge pull request <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2071\">#2071</a>\nfrom dtolnay/compatibility</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/42181b86c4c5dbf187069a500e28937873f39d8e\"><code>42181b8</code></a>\nAdd explanation of compatibility strategy</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/f3af08e3ab9764257faf14ff546cca148f7baaab\"><code>f3af08e</code></a>\nUpdate test suite to nightly-2026-07-21</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/88ee7be2197e61d6e84f0bff38eb2fe57998a765\"><code>88ee7be</code></a>\nRelease 3.0.2</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/587bc203a0e975e8261a65791203e8912edb1c42\"><code>587bc20</code></a>\nMerge pull request <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2070\">#2070</a>\nfrom dtolnay/emptyrange</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/96801f717ed1ae7943182afe1fd4c5857c50428b\"><code>96801f7</code></a>\nAllow Error::new_range at empty cursor range</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/9dc16c94cf0468dc4e4b1f6011cfd4040246c06c\"><code>9dc16c9</code></a>\nMerge pull request <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2069\">#2069</a>\nfrom dtolnay/prevspan</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/1db76b7ba3f4e16430e6b2c96f160c05160e056e\"><code>1db76b7</code></a>\nAlign on using impl trait across all Error constructors</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/bfa1ebf336f5fae0a0a22a89aeb991e2cd96c65a\"><code>bfa1ebf</code></a>\nMake Cursor::prev_span public</li>\n<li>Additional commits viewable in <a\nhref=\"https://github.com/dtolnay/syn/compare/3.0.0...3.0.3\">compare\nview</a></li>\n</ul>\n</details>\n<br />\n\n\n[![Dependabot compatibility\nscore](https://dependabot-badges.githubapp.com/badges/compatibility_score?dependency-name=syn&package-manager=cargo&previous-version=3.0.0&new-version=3.0.3)](https://docs.github.com/en/github/managing-security-vulnerabilities/about-dependabot-security-updates#about-compatibility-scores)\n\nDependabot will resolve any conflicts with this PR as long as you don't\nalter it yourself. You can also trigger a rebase manually by commenting\n`@dependabot rebase`.\n\n[//]: # (dependabot-automerge-start)\n[//]: # (dependabot-automerge-end)\n\n---\n\n<details>\n<summary>Dependabot commands and options</summary>\n<br />\n\nYou can trigger Dependabot actions by commenting on this PR:\n- `@dependabot rebase` will rebase this PR\n- `@dependabot recreate` will recreate this PR, overwriting any edits\nthat have been made to it\n- `@dependabot show <dependency name> ignore conditions` will show all\nof the ignore conditions of the specified dependency\n- `@dependabot ignore this major version` will close this PR and stop\nDependabot creating any more for this major version (unless you reopen\nthe PR or upgrade to it yourself)\n- `@dependabot ignore this minor version` will close this PR and stop\nDependabot creating any more for this minor version (unless you reopen\nthe PR or upgrade to it yourself)\n- `@dependabot ignore this dependency` will close this PR and stop\nDependabot creating any more for this dependency (unless you reopen the\nPR or upgrade to it yourself)\n\n\n</details>\n\n<!-- This is an auto-generated description by cubic. -->\n---\n## Summary by cubic\nBump `syn` to 3.0.3 to pick up parser improvements and minor APIs. Only\nlockfile changes; no code changes required.\n\n- **Dependencies**\n- Parser updates: support for const traits, unsafe binder types, and\nimpl restrictions.\n- New APIs: `Error::new_range` and `Cursor::prev_span`, plus docs\nimprovements.\n\n<sup>Written for commit 72077743e0d0f0e85f812cd68220ac88683e81b1.\nSummary will update on new commits.</sup>\n\n<a\nhref=\"https://cubic.dev/pr/andymai/elevator-core/pull/939?utm_source=github\"\ntarget=\"_blank\" rel=\"noopener noreferrer\"\ndata-no-image-dialog=\"true\"><picture><source\nmedia=\"(prefers-color-scheme: dark)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"><source\nmedia=\"(prefers-color-scheme: light)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-light.svg\"><img\nalt=\"Review in cubic\"\nsrc=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"></picture></a>\n\n<!-- End of auto-generated description by cubic. -->\n\nSigned-off-by: dependabot[bot] <support@github.com>\nCo-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>",
          "timestamp": "2026-08-03T20:37:29Z",
          "url": "https://github.com/andymai/elevator-core/commit/3ffd9a128e399bf6f37dc5c4b7dec1ea8578ecc7"
        },
        "date": 1786177500064,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 4424460,
            "range": "± 4088",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 622209,
            "range": "± 5885",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 615646,
            "range": "± 5120",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 734228,
            "range": "± 1329",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 569425,
            "range": "± 1645",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 37388,
            "range": "± 926",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 8284,
            "range": "± 2324",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3485226,
            "range": "± 14096",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15342615,
            "range": "± 66834",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 611888,
            "range": "± 2336",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1993322,
            "range": "± 3993",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 8964462,
            "range": "± 18304",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 295379,
            "range": "± 2624",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1925024,
            "range": "± 8664",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8603058,
            "range": "± 79054",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 291651,
            "range": "± 2177",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1859456,
            "range": "± 7124",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8360130,
            "range": "± 37837",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 280492,
            "range": "± 712",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1873822,
            "range": "± 6198",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8396456,
            "range": "± 69097",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 286364,
            "range": "± 3191",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1924697,
            "range": "± 6090",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8598364,
            "range": "± 62316",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 278123,
            "range": "± 1684",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 4406,
            "range": "± 3764",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 4063,
            "range": "± 2029",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 5111,
            "range": "± 6830",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4266,
            "range": "± 1295",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 25438,
            "range": "± 3793",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3371446,
            "range": "± 56653",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3120963,
            "range": "± 7508",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 5886,
            "range": "± 534",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 18499,
            "range": "± 9555",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 9368,
            "range": "± 11821",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 94006,
            "range": "± 1198",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 17539,
            "range": "± 2778",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 861802,
            "range": "± 9470",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 91872,
            "range": "± 3878",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 16060,
            "range": "± 3185",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 890293,
            "range": "± 14581",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 100714,
            "range": "± 18339",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 17285,
            "range": "± 3444",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 5984191066,
            "range": "± 12730883",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 81789613,
            "range": "± 541244",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 18700616,
            "range": "± 26158",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 65473422,
            "range": "± 323229",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8613300,
            "range": "± 91973",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 36484,
            "range": "± 566",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 15330,
            "range": "± 1473",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 6552,
            "range": "± 462",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 233387,
            "range": "± 9119",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 219996,
            "range": "± 10612",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 146280,
            "range": "± 59859",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "dependabot[bot]",
            "username": "dependabot[bot]",
            "email": "49699333+dependabot[bot]@users.noreply.github.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "3ffd9a128e399bf6f37dc5c4b7dec1ea8578ecc7",
          "message": "chore(deps): bump syn from 3.0.0 to 3.0.3 (#939)\n\nBumps [syn](https://github.com/dtolnay/syn) from 3.0.0 to 3.0.3.\n<details>\n<summary>Release notes</summary>\n<p><em>Sourced from <a\nhref=\"https://github.com/dtolnay/syn/releases\">syn's\nreleases</a>.</em></p>\n<blockquote>\n<h2>3.0.3</h2>\n<ul>\n<li>Documentation improvements</li>\n</ul>\n<h2>3.0.2</h2>\n<ul>\n<li>Add <a\nhref=\"https://docs.rs/syn/3/syn/struct.Error.html#method.new_range\"><code>Error::new_range(start..end,\n&quot;msg&quot;)</code></a> (<a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2068\">#2068</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2070\">#2070</a>)</li>\n<li>Add <a\nhref=\"https://docs.rs/syn/3/syn/buffer/struct.Cursor.html#method.prev_span\"><code>Cursor::prev_span</code></a></li>\n</ul>\n<h2>3.0.1</h2>\n<ul>\n<li>Parse const traits (<a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2056\">#2056</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2057\">#2057</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2058\">#2058</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2063\">#2063</a>, <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2064\">#2064</a>)</li>\n<li>Parse unsafe binder types (<a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2065\">#2065</a>)</li>\n<li>Parse impl restrictions (<a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2066\">#2066</a>)</li>\n</ul>\n</blockquote>\n</details>\n<details>\n<summary>Commits</summary>\n<ul>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/23dbaab4b0c43f56cd803894054cf366661e53b0\"><code>23dbaab</code></a>\nRelease 3.0.3</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/16aad4e9df889973182b93ea4d2309e594ba9fa4\"><code>16aad4e</code></a>\nMerge pull request <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2071\">#2071</a>\nfrom dtolnay/compatibility</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/42181b86c4c5dbf187069a500e28937873f39d8e\"><code>42181b8</code></a>\nAdd explanation of compatibility strategy</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/f3af08e3ab9764257faf14ff546cca148f7baaab\"><code>f3af08e</code></a>\nUpdate test suite to nightly-2026-07-21</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/88ee7be2197e61d6e84f0bff38eb2fe57998a765\"><code>88ee7be</code></a>\nRelease 3.0.2</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/587bc203a0e975e8261a65791203e8912edb1c42\"><code>587bc20</code></a>\nMerge pull request <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2070\">#2070</a>\nfrom dtolnay/emptyrange</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/96801f717ed1ae7943182afe1fd4c5857c50428b\"><code>96801f7</code></a>\nAllow Error::new_range at empty cursor range</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/9dc16c94cf0468dc4e4b1f6011cfd4040246c06c\"><code>9dc16c9</code></a>\nMerge pull request <a\nhref=\"https://redirect.github.com/dtolnay/syn/issues/2069\">#2069</a>\nfrom dtolnay/prevspan</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/1db76b7ba3f4e16430e6b2c96f160c05160e056e\"><code>1db76b7</code></a>\nAlign on using impl trait across all Error constructors</li>\n<li><a\nhref=\"https://github.com/dtolnay/syn/commit/bfa1ebf336f5fae0a0a22a89aeb991e2cd96c65a\"><code>bfa1ebf</code></a>\nMake Cursor::prev_span public</li>\n<li>Additional commits viewable in <a\nhref=\"https://github.com/dtolnay/syn/compare/3.0.0...3.0.3\">compare\nview</a></li>\n</ul>\n</details>\n<br />\n\n\n[![Dependabot compatibility\nscore](https://dependabot-badges.githubapp.com/badges/compatibility_score?dependency-name=syn&package-manager=cargo&previous-version=3.0.0&new-version=3.0.3)](https://docs.github.com/en/github/managing-security-vulnerabilities/about-dependabot-security-updates#about-compatibility-scores)\n\nDependabot will resolve any conflicts with this PR as long as you don't\nalter it yourself. You can also trigger a rebase manually by commenting\n`@dependabot rebase`.\n\n[//]: # (dependabot-automerge-start)\n[//]: # (dependabot-automerge-end)\n\n---\n\n<details>\n<summary>Dependabot commands and options</summary>\n<br />\n\nYou can trigger Dependabot actions by commenting on this PR:\n- `@dependabot rebase` will rebase this PR\n- `@dependabot recreate` will recreate this PR, overwriting any edits\nthat have been made to it\n- `@dependabot show <dependency name> ignore conditions` will show all\nof the ignore conditions of the specified dependency\n- `@dependabot ignore this major version` will close this PR and stop\nDependabot creating any more for this major version (unless you reopen\nthe PR or upgrade to it yourself)\n- `@dependabot ignore this minor version` will close this PR and stop\nDependabot creating any more for this minor version (unless you reopen\nthe PR or upgrade to it yourself)\n- `@dependabot ignore this dependency` will close this PR and stop\nDependabot creating any more for this dependency (unless you reopen the\nPR or upgrade to it yourself)\n\n\n</details>\n\n<!-- This is an auto-generated description by cubic. -->\n---\n## Summary by cubic\nBump `syn` to 3.0.3 to pick up parser improvements and minor APIs. Only\nlockfile changes; no code changes required.\n\n- **Dependencies**\n- Parser updates: support for const traits, unsafe binder types, and\nimpl restrictions.\n- New APIs: `Error::new_range` and `Cursor::prev_span`, plus docs\nimprovements.\n\n<sup>Written for commit 72077743e0d0f0e85f812cd68220ac88683e81b1.\nSummary will update on new commits.</sup>\n\n<a\nhref=\"https://cubic.dev/pr/andymai/elevator-core/pull/939?utm_source=github\"\ntarget=\"_blank\" rel=\"noopener noreferrer\"\ndata-no-image-dialog=\"true\"><picture><source\nmedia=\"(prefers-color-scheme: dark)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"><source\nmedia=\"(prefers-color-scheme: light)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-light.svg\"><img\nalt=\"Review in cubic\"\nsrc=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"></picture></a>\n\n<!-- End of auto-generated description by cubic. -->\n\nSigned-off-by: dependabot[bot] <support@github.com>\nCo-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>",
          "timestamp": "2026-08-03T20:37:29Z",
          "url": "https://github.com/andymai/elevator-core/commit/3ffd9a128e399bf6f37dc5c4b7dec1ea8578ecc7"
        },
        "date": 1786263945229,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 3927920,
            "range": "± 3643",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 611114,
            "range": "± 1607",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 608029,
            "range": "± 1885",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 705535,
            "range": "± 1345",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 559179,
            "range": "± 1607",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 35297,
            "range": "± 2102",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 7508,
            "range": "± 323",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3404835,
            "range": "± 12736",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15142179,
            "range": "± 38899",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 573720,
            "range": "± 1027",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1872232,
            "range": "± 4352",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 9136778,
            "range": "± 49853",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 270070,
            "range": "± 2144",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1820793,
            "range": "± 13036",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8686836,
            "range": "± 25616",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 261773,
            "range": "± 797",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1753534,
            "range": "± 6490",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8649818,
            "range": "± 88532",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 256111,
            "range": "± 1000",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1760019,
            "range": "± 31391",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8609697,
            "range": "± 91253",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 257071,
            "range": "± 1294",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1809017,
            "range": "± 8218",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8735074,
            "range": "± 46991",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 254118,
            "range": "± 3557",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 3637,
            "range": "± 307",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 4404,
            "range": "± 9359",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 4229,
            "range": "± 1786",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4903,
            "range": "± 9035",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 21867,
            "range": "± 793",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3256485,
            "range": "± 4609",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3050815,
            "range": "± 6688",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 7357,
            "range": "± 17954",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 18661,
            "range": "± 10999",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 10002,
            "range": "± 19372",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 93567,
            "range": "± 4159",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 16963,
            "range": "± 2862",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 832205,
            "range": "± 9310",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 88399,
            "range": "± 3213",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 15234,
            "range": "± 2722",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 857736,
            "range": "± 13732",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 91586,
            "range": "± 4199",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 16565,
            "range": "± 3313",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 5387603986,
            "range": "± 130875505",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 75361968,
            "range": "± 202300",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 18134128,
            "range": "± 56907",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 62106514,
            "range": "± 289450",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8082440,
            "range": "± 10409",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 34586,
            "range": "± 584",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 13862,
            "range": "± 447",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 6026,
            "range": "± 230",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 204089,
            "range": "± 4215",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 199040,
            "range": "± 14195",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 134079,
            "range": "± 21314",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Andy Aragon",
            "username": "andymai",
            "email": "hi@andymai.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "bfb4c189bf526cfc31e02c0a0671737b96d325be",
          "message": "ci(bench): stratify the bench baseline by machine class (#941)\n\nCloses #934. Closes #938.\n\n## What was wrong\n\nThe nightly gate compared each bench against a rolling median taken over\nevery recent nightly, regardless of which machine measured them.\nGitHub's `ubuntu-latest` pool cycles between a handful of CPU SKUs, and\nthe spread between them dwarfs the effect sizes worth alerting on, so\nthat median blended hardware. A bench was scored mostly by which machine\nit drew.\n\n## Evidence\n\nThe 25 consecutive nightlies from 2026-07-16 to 08-09 are a natural\ncontrol: the only commits in that window are dependency bumps and\nCI-only changes, so **every filing in it is a false positive by\nconstruction**. Replaying the detector over the published gh-pages\nseries:\n\n- The whole suite swung between **-20% and +12%**, tracking the SKU.\n- 49 of 54 benches exceeded the 5% gate on pure noise at some point;\n`dynamic_topology/add_line` has a *median absolute* night-to-night\ndeviation of 11%.\n- The detector filed on **6 of 25 nights**. Both open regression issues\nare in that set.\n\nThe `calibration/fixed_workload` bench was already identifying the SKU\nwithout being read that way. Its measurement is sharply quantized rather\nthan continuous:\n\n| calibration reading | nights | spread within class |\n|---|---|---|\n| ~3.93e6 ns | 14 | < 1% |\n| ~4.42e6 ns | 5 | < 0.3% |\n| ~4.09-4.23e6 ns | 3 | |\n| ~3.43-3.53e6 ns | 2 | |\n\nClasses sit 10-15% apart while repeat visits to one class hold within\n1%. On the two fastest nights (07-21, 08-07) *every* bench group dropped\n15-22% together.\n\n## What changed\n\nBaseline samples are drawn only from prior nightlies whose calibration\nlands within `MACHINE_TOL` (3%) of tonight's, so the comparison is\nlike-for-like hardware. Retention grows from 7 nightlies to 21 so an\ninfrequently-seen class still reaches `MIN_SAMPLES`; a class without\nenough history is recorded but not gated. The median still uses at most\n`BASELINE_SAMPLES` (7) of the most recent same-class nights, so a landed\nregression is not held down indefinitely by a long pre-regression tail.\n\nThe within-class residual drift is still divided out and still clamped\nto damping-only, so the #923/#924 amplification shape stays impossible.\n\nThe history file moves to a per-nightly layout, since stratification\nneeds to know which calibration reading each bench sample was measured\nalongside. A cached history in the old per-bench-column layout is\n**discarded rather than reconstructed**: that layout appended one sample\nper nightly per bench *that reported* and capped each column\nindependently, so it records no night identity and two columns can omit\ndifferent nights while holding equal counts. Any reconstruction is a\nguess, and a wrong one pairs a bench with another night's calibration -\nthe exact failure this PR removes, in a form nothing downstream can\ndetect. Discarding costs about a week of warm-up and fails safe, since\nnothing is gated until enough same-class samples accumulate.\n\n`MIN_CHANGE_PCT` is unchanged at 5.0. Backtesting showed raising it to\n10.0 removed only one of five spurious filings while costing real\nsensitivity, so the threshold is not the useful lever here.\n\n## Validation\n\nBacktested by driving the actual implementation night-by-night over the\nreal series:\n\n| | issues filed on 25 flat nights |\n|---|---|\n| before | 6 |\n| after | 5 (4 of which are one episode, below) |\n\nSensitivity, injecting a step regression on 2026-08-01 and requiring a\n*new* filing naming that bench:\n\n| step | quiet benches | mid | noisy |\n|---|---|---|---|\n| +6% | caught next night | caught next night | 1 of 3 caught |\n| +8% | caught next night | caught next night | all caught |\n| +10% and up | caught next night | caught next night | all caught |\n\nDetector unit tests go from 20 to 33 cases, covering stratification, the\n`MACHINE_TOL` boundary, the warm-up path for an unseen class, the\n`BASELINE_SAMPLES` cap, and the legacy-history discard including the\nfail-safe warm-up night.\n\n## Known remaining false positive\n\nFour of the five surviving filings are one episode with a different\ncause. The `scaling_*` group sat ~14% low for the entire nine-night\nwindow of b6a71308 and returned to normal the night the SHA changed,\n**on the same machine class** - though that commit touched no Rust or\nCargo file. Absolute timings therefore depend on build or environment\nstate beyond the source. Stratifying by hardware cannot address that, so\nit is filed as #942 rather than papered over here.",
          "timestamp": "2026-08-09T23:16:31Z",
          "url": "https://github.com/andymai/elevator-core/commit/bfb4c189bf526cfc31e02c0a0671737b96d325be"
        },
        "date": 1786351488030,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 3932194,
            "range": "± 14685",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 605970,
            "range": "± 2510",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 607706,
            "range": "± 3308",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 701557,
            "range": "± 2224",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 554332,
            "range": "± 3750",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 35011,
            "range": "± 1473",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 7729,
            "range": "± 1678",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3375498,
            "range": "± 10886",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15214052,
            "range": "± 199045",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 559859,
            "range": "± 1526",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1879288,
            "range": "± 7633",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 9149615,
            "range": "± 40138",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 271762,
            "range": "± 5670",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1834716,
            "range": "± 6513",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8771953,
            "range": "± 46545",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 259721,
            "range": "± 854",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1787423,
            "range": "± 52628",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8542204,
            "range": "± 30557",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 253180,
            "range": "± 1919",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1766456,
            "range": "± 6552",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8666769,
            "range": "± 233347",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 256425,
            "range": "± 1713",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1831333,
            "range": "± 6979",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8770099,
            "range": "± 33851",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 254514,
            "range": "± 2386",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 4518,
            "range": "± 1182",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 5695,
            "range": "± 12894",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 5782,
            "range": "± 12173",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 5215,
            "range": "± 6082",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 23171,
            "range": "± 1061",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3424787,
            "range": "± 9338",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3189555,
            "range": "± 5524",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 8885,
            "range": "± 22061",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 20537,
            "range": "± 8019",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 10159,
            "range": "± 9209",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 99090,
            "range": "± 11707",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 19180,
            "range": "± 3592",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 940601,
            "range": "± 35884",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 104994,
            "range": "± 13933",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 19717,
            "range": "± 6457",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 916000,
            "range": "± 28992",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 95194,
            "range": "± 7148",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 20120,
            "range": "± 5436",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 5359181376,
            "range": "± 12150365",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 76372802,
            "range": "± 434669",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 18189797,
            "range": "± 45395",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 62881224,
            "range": "± 119608",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8368310,
            "range": "± 70562",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 36068,
            "range": "± 3236",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 14713,
            "range": "± 3160",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 6567,
            "range": "± 1645",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 206625,
            "range": "± 8947",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 201691,
            "range": "± 8306",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 136113,
            "range": "± 14217",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Andy Aragon",
            "username": "andymai",
            "email": "hi@andymai.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "bfb4c189bf526cfc31e02c0a0671737b96d325be",
          "message": "ci(bench): stratify the bench baseline by machine class (#941)\n\nCloses #934. Closes #938.\n\n## What was wrong\n\nThe nightly gate compared each bench against a rolling median taken over\nevery recent nightly, regardless of which machine measured them.\nGitHub's `ubuntu-latest` pool cycles between a handful of CPU SKUs, and\nthe spread between them dwarfs the effect sizes worth alerting on, so\nthat median blended hardware. A bench was scored mostly by which machine\nit drew.\n\n## Evidence\n\nThe 25 consecutive nightlies from 2026-07-16 to 08-09 are a natural\ncontrol: the only commits in that window are dependency bumps and\nCI-only changes, so **every filing in it is a false positive by\nconstruction**. Replaying the detector over the published gh-pages\nseries:\n\n- The whole suite swung between **-20% and +12%**, tracking the SKU.\n- 49 of 54 benches exceeded the 5% gate on pure noise at some point;\n`dynamic_topology/add_line` has a *median absolute* night-to-night\ndeviation of 11%.\n- The detector filed on **6 of 25 nights**. Both open regression issues\nare in that set.\n\nThe `calibration/fixed_workload` bench was already identifying the SKU\nwithout being read that way. Its measurement is sharply quantized rather\nthan continuous:\n\n| calibration reading | nights | spread within class |\n|---|---|---|\n| ~3.93e6 ns | 14 | < 1% |\n| ~4.42e6 ns | 5 | < 0.3% |\n| ~4.09-4.23e6 ns | 3 | |\n| ~3.43-3.53e6 ns | 2 | |\n\nClasses sit 10-15% apart while repeat visits to one class hold within\n1%. On the two fastest nights (07-21, 08-07) *every* bench group dropped\n15-22% together.\n\n## What changed\n\nBaseline samples are drawn only from prior nightlies whose calibration\nlands within `MACHINE_TOL` (3%) of tonight's, so the comparison is\nlike-for-like hardware. Retention grows from 7 nightlies to 21 so an\ninfrequently-seen class still reaches `MIN_SAMPLES`; a class without\nenough history is recorded but not gated. The median still uses at most\n`BASELINE_SAMPLES` (7) of the most recent same-class nights, so a landed\nregression is not held down indefinitely by a long pre-regression tail.\n\nThe within-class residual drift is still divided out and still clamped\nto damping-only, so the #923/#924 amplification shape stays impossible.\n\nThe history file moves to a per-nightly layout, since stratification\nneeds to know which calibration reading each bench sample was measured\nalongside. A cached history in the old per-bench-column layout is\n**discarded rather than reconstructed**: that layout appended one sample\nper nightly per bench *that reported* and capped each column\nindependently, so it records no night identity and two columns can omit\ndifferent nights while holding equal counts. Any reconstruction is a\nguess, and a wrong one pairs a bench with another night's calibration -\nthe exact failure this PR removes, in a form nothing downstream can\ndetect. Discarding costs about a week of warm-up and fails safe, since\nnothing is gated until enough same-class samples accumulate.\n\n`MIN_CHANGE_PCT` is unchanged at 5.0. Backtesting showed raising it to\n10.0 removed only one of five spurious filings while costing real\nsensitivity, so the threshold is not the useful lever here.\n\n## Validation\n\nBacktested by driving the actual implementation night-by-night over the\nreal series:\n\n| | issues filed on 25 flat nights |\n|---|---|\n| before | 6 |\n| after | 5 (4 of which are one episode, below) |\n\nSensitivity, injecting a step regression on 2026-08-01 and requiring a\n*new* filing naming that bench:\n\n| step | quiet benches | mid | noisy |\n|---|---|---|---|\n| +6% | caught next night | caught next night | 1 of 3 caught |\n| +8% | caught next night | caught next night | all caught |\n| +10% and up | caught next night | caught next night | all caught |\n\nDetector unit tests go from 20 to 33 cases, covering stratification, the\n`MACHINE_TOL` boundary, the warm-up path for an unseen class, the\n`BASELINE_SAMPLES` cap, and the legacy-history discard including the\nfail-safe warm-up night.\n\n## Known remaining false positive\n\nFour of the five surviving filings are one episode with a different\ncause. The `scaling_*` group sat ~14% low for the entire nine-night\nwindow of b6a71308 and returned to normal the night the SHA changed,\n**on the same machine class** - though that commit touched no Rust or\nCargo file. Absolute timings therefore depend on build or environment\nstate beyond the source. Stratifying by hardware cannot address that, so\nit is filed as #942 rather than papered over here.",
          "timestamp": "2026-08-09T23:16:31Z",
          "url": "https://github.com/andymai/elevator-core/commit/bfb4c189bf526cfc31e02c0a0671737b96d325be"
        },
        "date": 1786437196365,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 3934932,
            "range": "± 3405",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 602064,
            "range": "± 2038",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 601993,
            "range": "± 3837",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 700273,
            "range": "± 3755",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 550782,
            "range": "± 3598",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 34542,
            "range": "± 2602",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 7464,
            "range": "± 343",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3385225,
            "range": "± 20237",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15166200,
            "range": "± 47057",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 562521,
            "range": "± 1475",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1897373,
            "range": "± 8229",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 9144637,
            "range": "± 48593",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 269965,
            "range": "± 4892",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1836531,
            "range": "± 12424",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8752179,
            "range": "± 56238",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 261078,
            "range": "± 1175",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1772403,
            "range": "± 10734",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8592601,
            "range": "± 92164",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 253426,
            "range": "± 1817",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1759019,
            "range": "± 6371",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8539651,
            "range": "± 22778",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 254544,
            "range": "± 5236",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1837799,
            "range": "± 39291",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8724688,
            "range": "± 37621",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 256870,
            "range": "± 1103",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 4470,
            "range": "± 7727",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 4583,
            "range": "± 9232",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 4985,
            "range": "± 6227",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4666,
            "range": "± 6430",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 21900,
            "range": "± 964",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3405741,
            "range": "± 8966",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3196672,
            "range": "± 6399",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 5427,
            "range": "± 2767",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 17967,
            "range": "± 11628",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 8095,
            "range": "± 5379",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 90917,
            "range": "± 1785",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 16398,
            "range": "± 2358",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 805070,
            "range": "± 8354",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 85833,
            "range": "± 3266",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 14841,
            "range": "± 2587",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 829541,
            "range": "± 24452",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 88223,
            "range": "± 5191",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 16106,
            "range": "± 2429",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 5330700267,
            "range": "± 13776008",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 76972833,
            "range": "± 713755",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 18161723,
            "range": "± 45157",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 62044072,
            "range": "± 168571",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8237070,
            "range": "± 13597",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 33927,
            "range": "± 981",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 13757,
            "range": "± 575",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 5940,
            "range": "± 225",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 202789,
            "range": "± 8308",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 194992,
            "range": "± 2737",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 130326,
            "range": "± 4156",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Andy Aragon",
            "username": "andymai",
            "email": "hi@andymai.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "bfb4c189bf526cfc31e02c0a0671737b96d325be",
          "message": "ci(bench): stratify the bench baseline by machine class (#941)\n\nCloses #934. Closes #938.\n\n## What was wrong\n\nThe nightly gate compared each bench against a rolling median taken over\nevery recent nightly, regardless of which machine measured them.\nGitHub's `ubuntu-latest` pool cycles between a handful of CPU SKUs, and\nthe spread between them dwarfs the effect sizes worth alerting on, so\nthat median blended hardware. A bench was scored mostly by which machine\nit drew.\n\n## Evidence\n\nThe 25 consecutive nightlies from 2026-07-16 to 08-09 are a natural\ncontrol: the only commits in that window are dependency bumps and\nCI-only changes, so **every filing in it is a false positive by\nconstruction**. Replaying the detector over the published gh-pages\nseries:\n\n- The whole suite swung between **-20% and +12%**, tracking the SKU.\n- 49 of 54 benches exceeded the 5% gate on pure noise at some point;\n`dynamic_topology/add_line` has a *median absolute* night-to-night\ndeviation of 11%.\n- The detector filed on **6 of 25 nights**. Both open regression issues\nare in that set.\n\nThe `calibration/fixed_workload` bench was already identifying the SKU\nwithout being read that way. Its measurement is sharply quantized rather\nthan continuous:\n\n| calibration reading | nights | spread within class |\n|---|---|---|\n| ~3.93e6 ns | 14 | < 1% |\n| ~4.42e6 ns | 5 | < 0.3% |\n| ~4.09-4.23e6 ns | 3 | |\n| ~3.43-3.53e6 ns | 2 | |\n\nClasses sit 10-15% apart while repeat visits to one class hold within\n1%. On the two fastest nights (07-21, 08-07) *every* bench group dropped\n15-22% together.\n\n## What changed\n\nBaseline samples are drawn only from prior nightlies whose calibration\nlands within `MACHINE_TOL` (3%) of tonight's, so the comparison is\nlike-for-like hardware. Retention grows from 7 nightlies to 21 so an\ninfrequently-seen class still reaches `MIN_SAMPLES`; a class without\nenough history is recorded but not gated. The median still uses at most\n`BASELINE_SAMPLES` (7) of the most recent same-class nights, so a landed\nregression is not held down indefinitely by a long pre-regression tail.\n\nThe within-class residual drift is still divided out and still clamped\nto damping-only, so the #923/#924 amplification shape stays impossible.\n\nThe history file moves to a per-nightly layout, since stratification\nneeds to know which calibration reading each bench sample was measured\nalongside. A cached history in the old per-bench-column layout is\n**discarded rather than reconstructed**: that layout appended one sample\nper nightly per bench *that reported* and capped each column\nindependently, so it records no night identity and two columns can omit\ndifferent nights while holding equal counts. Any reconstruction is a\nguess, and a wrong one pairs a bench with another night's calibration -\nthe exact failure this PR removes, in a form nothing downstream can\ndetect. Discarding costs about a week of warm-up and fails safe, since\nnothing is gated until enough same-class samples accumulate.\n\n`MIN_CHANGE_PCT` is unchanged at 5.0. Backtesting showed raising it to\n10.0 removed only one of five spurious filings while costing real\nsensitivity, so the threshold is not the useful lever here.\n\n## Validation\n\nBacktested by driving the actual implementation night-by-night over the\nreal series:\n\n| | issues filed on 25 flat nights |\n|---|---|\n| before | 6 |\n| after | 5 (4 of which are one episode, below) |\n\nSensitivity, injecting a step regression on 2026-08-01 and requiring a\n*new* filing naming that bench:\n\n| step | quiet benches | mid | noisy |\n|---|---|---|---|\n| +6% | caught next night | caught next night | 1 of 3 caught |\n| +8% | caught next night | caught next night | all caught |\n| +10% and up | caught next night | caught next night | all caught |\n\nDetector unit tests go from 20 to 33 cases, covering stratification, the\n`MACHINE_TOL` boundary, the warm-up path for an unseen class, the\n`BASELINE_SAMPLES` cap, and the legacy-history discard including the\nfail-safe warm-up night.\n\n## Known remaining false positive\n\nFour of the five surviving filings are one episode with a different\ncause. The `scaling_*` group sat ~14% low for the entire nine-night\nwindow of b6a71308 and returned to normal the night the SHA changed,\n**on the same machine class** - though that commit touched no Rust or\nCargo file. Absolute timings therefore depend on build or environment\nstate beyond the source. Stratifying by hardware cannot address that, so\nit is filed as #942 rather than papered over here.",
          "timestamp": "2026-08-09T23:16:31Z",
          "url": "https://github.com/andymai/elevator-core/commit/bfb4c189bf526cfc31e02c0a0671737b96d325be"
        },
        "date": 1786524110719,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 3700005,
            "range": "± 13310",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 592220,
            "range": "± 7763",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 630198,
            "range": "± 8327",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 700492,
            "range": "± 1190",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 558089,
            "range": "± 6710",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 35162,
            "range": "± 1406",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 7785,
            "range": "± 543",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3414827,
            "range": "± 29085",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15294798,
            "range": "± 63465",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 570204,
            "range": "± 855",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1867294,
            "range": "± 23622",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 9221754,
            "range": "± 45431",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 268143,
            "range": "± 2693",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1823061,
            "range": "± 14272",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8875435,
            "range": "± 46473",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 261086,
            "range": "± 2633",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1774564,
            "range": "± 5258",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8720488,
            "range": "± 41501",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 256840,
            "range": "± 1270",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1787430,
            "range": "± 10100",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8747064,
            "range": "± 36453",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 255043,
            "range": "± 1816",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1813892,
            "range": "± 10720",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8856645,
            "range": "± 71037",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 243242,
            "range": "± 2645",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 4569,
            "range": "± 2068",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 4468,
            "range": "± 2334",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 5022,
            "range": "± 4141",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4971,
            "range": "± 3150",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 21951,
            "range": "± 1939",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3117627,
            "range": "± 2960",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3143180,
            "range": "± 7337",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 6202,
            "range": "± 1688",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 18799,
            "range": "± 2064",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 8812,
            "range": "± 1032",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 100255,
            "range": "± 10189",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 18156,
            "range": "± 3586",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 1011389,
            "range": "± 56661",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 98856,
            "range": "± 8816",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 16449,
            "range": "± 3593",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 969407,
            "range": "± 24978",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 99128,
            "range": "± 9059",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 17977,
            "range": "± 3694",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 5833871314,
            "range": "± 65928369",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 76799598,
            "range": "± 112872",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 17519068,
            "range": "± 36933",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 59401146,
            "range": "± 104798",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8150751,
            "range": "± 24417",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 32874,
            "range": "± 1371",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 14496,
            "range": "± 602",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 6189,
            "range": "± 392",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 200908,
            "range": "± 4852",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 192274,
            "range": "± 4917",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 129340,
            "range": "± 9352",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Andy Aragon",
            "username": "andymai",
            "email": "hi@andymai.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "bfb4c189bf526cfc31e02c0a0671737b96d325be",
          "message": "ci(bench): stratify the bench baseline by machine class (#941)\n\nCloses #934. Closes #938.\n\n## What was wrong\n\nThe nightly gate compared each bench against a rolling median taken over\nevery recent nightly, regardless of which machine measured them.\nGitHub's `ubuntu-latest` pool cycles between a handful of CPU SKUs, and\nthe spread between them dwarfs the effect sizes worth alerting on, so\nthat median blended hardware. A bench was scored mostly by which machine\nit drew.\n\n## Evidence\n\nThe 25 consecutive nightlies from 2026-07-16 to 08-09 are a natural\ncontrol: the only commits in that window are dependency bumps and\nCI-only changes, so **every filing in it is a false positive by\nconstruction**. Replaying the detector over the published gh-pages\nseries:\n\n- The whole suite swung between **-20% and +12%**, tracking the SKU.\n- 49 of 54 benches exceeded the 5% gate on pure noise at some point;\n`dynamic_topology/add_line` has a *median absolute* night-to-night\ndeviation of 11%.\n- The detector filed on **6 of 25 nights**. Both open regression issues\nare in that set.\n\nThe `calibration/fixed_workload` bench was already identifying the SKU\nwithout being read that way. Its measurement is sharply quantized rather\nthan continuous:\n\n| calibration reading | nights | spread within class |\n|---|---|---|\n| ~3.93e6 ns | 14 | < 1% |\n| ~4.42e6 ns | 5 | < 0.3% |\n| ~4.09-4.23e6 ns | 3 | |\n| ~3.43-3.53e6 ns | 2 | |\n\nClasses sit 10-15% apart while repeat visits to one class hold within\n1%. On the two fastest nights (07-21, 08-07) *every* bench group dropped\n15-22% together.\n\n## What changed\n\nBaseline samples are drawn only from prior nightlies whose calibration\nlands within `MACHINE_TOL` (3%) of tonight's, so the comparison is\nlike-for-like hardware. Retention grows from 7 nightlies to 21 so an\ninfrequently-seen class still reaches `MIN_SAMPLES`; a class without\nenough history is recorded but not gated. The median still uses at most\n`BASELINE_SAMPLES` (7) of the most recent same-class nights, so a landed\nregression is not held down indefinitely by a long pre-regression tail.\n\nThe within-class residual drift is still divided out and still clamped\nto damping-only, so the #923/#924 amplification shape stays impossible.\n\nThe history file moves to a per-nightly layout, since stratification\nneeds to know which calibration reading each bench sample was measured\nalongside. A cached history in the old per-bench-column layout is\n**discarded rather than reconstructed**: that layout appended one sample\nper nightly per bench *that reported* and capped each column\nindependently, so it records no night identity and two columns can omit\ndifferent nights while holding equal counts. Any reconstruction is a\nguess, and a wrong one pairs a bench with another night's calibration -\nthe exact failure this PR removes, in a form nothing downstream can\ndetect. Discarding costs about a week of warm-up and fails safe, since\nnothing is gated until enough same-class samples accumulate.\n\n`MIN_CHANGE_PCT` is unchanged at 5.0. Backtesting showed raising it to\n10.0 removed only one of five spurious filings while costing real\nsensitivity, so the threshold is not the useful lever here.\n\n## Validation\n\nBacktested by driving the actual implementation night-by-night over the\nreal series:\n\n| | issues filed on 25 flat nights |\n|---|---|\n| before | 6 |\n| after | 5 (4 of which are one episode, below) |\n\nSensitivity, injecting a step regression on 2026-08-01 and requiring a\n*new* filing naming that bench:\n\n| step | quiet benches | mid | noisy |\n|---|---|---|---|\n| +6% | caught next night | caught next night | 1 of 3 caught |\n| +8% | caught next night | caught next night | all caught |\n| +10% and up | caught next night | caught next night | all caught |\n\nDetector unit tests go from 20 to 33 cases, covering stratification, the\n`MACHINE_TOL` boundary, the warm-up path for an unseen class, the\n`BASELINE_SAMPLES` cap, and the legacy-history discard including the\nfail-safe warm-up night.\n\n## Known remaining false positive\n\nFour of the five surviving filings are one episode with a different\ncause. The `scaling_*` group sat ~14% low for the entire nine-night\nwindow of b6a71308 and returned to normal the night the SHA changed,\n**on the same machine class** - though that commit touched no Rust or\nCargo file. Absolute timings therefore depend on build or environment\nstate beyond the source. Stratifying by hardware cannot address that, so\nit is filed as #942 rather than papered over here.",
          "timestamp": "2026-08-09T23:16:31Z",
          "url": "https://github.com/andymai/elevator-core/commit/bfb4c189bf526cfc31e02c0a0671737b96d325be"
        },
        "date": 1786610543243,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 3928009,
            "range": "± 2181",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 612925,
            "range": "± 2980",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 615449,
            "range": "± 4789",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 703965,
            "range": "± 1712",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 556921,
            "range": "± 1351",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 34478,
            "range": "± 1694",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 7451,
            "range": "± 353",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3386670,
            "range": "± 18708",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15159134,
            "range": "± 27973",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 559627,
            "range": "± 1473",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1882190,
            "range": "± 6246",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 9233513,
            "range": "± 81911",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 272803,
            "range": "± 2362",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1817739,
            "range": "± 5849",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8887178,
            "range": "± 129745",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 261762,
            "range": "± 1045",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1744825,
            "range": "± 3594",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8585883,
            "range": "± 35342",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 253779,
            "range": "± 3812",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1755801,
            "range": "± 5389",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8555950,
            "range": "± 40615",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 253164,
            "range": "± 4721",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1816889,
            "range": "± 5424",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8791670,
            "range": "± 63987",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 255087,
            "range": "± 1778",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 3833,
            "range": "± 1456",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 4179,
            "range": "± 6856",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 5099,
            "range": "± 9377",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4316,
            "range": "± 3101",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 22234,
            "range": "± 3569",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3409973,
            "range": "± 8754",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3197457,
            "range": "± 8049",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 7314,
            "range": "± 19911",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 18592,
            "range": "± 10720",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 9402,
            "range": "± 12864",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 93601,
            "range": "± 7356",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 17512,
            "range": "± 3463",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 834736,
            "range": "± 19923",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 86744,
            "range": "± 2545",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 15433,
            "range": "± 3072",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 850408,
            "range": "± 19203",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 91606,
            "range": "± 4489",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 17411,
            "range": "± 3084",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 5334496210,
            "range": "± 19812793",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 76456454,
            "range": "± 439819",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 18161640,
            "range": "± 30762",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 62734334,
            "range": "± 155146",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8411626,
            "range": "± 25533",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 34395,
            "range": "± 6582",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 14999,
            "range": "± 9534",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 7199,
            "range": "± 13309",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 204870,
            "range": "± 3027",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 199095,
            "range": "± 6808",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 134266,
            "range": "± 10185",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Andy Aragon",
            "username": "andymai",
            "email": "hi@andymai.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "bfb4c189bf526cfc31e02c0a0671737b96d325be",
          "message": "ci(bench): stratify the bench baseline by machine class (#941)\n\nCloses #934. Closes #938.\n\n## What was wrong\n\nThe nightly gate compared each bench against a rolling median taken over\nevery recent nightly, regardless of which machine measured them.\nGitHub's `ubuntu-latest` pool cycles between a handful of CPU SKUs, and\nthe spread between them dwarfs the effect sizes worth alerting on, so\nthat median blended hardware. A bench was scored mostly by which machine\nit drew.\n\n## Evidence\n\nThe 25 consecutive nightlies from 2026-07-16 to 08-09 are a natural\ncontrol: the only commits in that window are dependency bumps and\nCI-only changes, so **every filing in it is a false positive by\nconstruction**. Replaying the detector over the published gh-pages\nseries:\n\n- The whole suite swung between **-20% and +12%**, tracking the SKU.\n- 49 of 54 benches exceeded the 5% gate on pure noise at some point;\n`dynamic_topology/add_line` has a *median absolute* night-to-night\ndeviation of 11%.\n- The detector filed on **6 of 25 nights**. Both open regression issues\nare in that set.\n\nThe `calibration/fixed_workload` bench was already identifying the SKU\nwithout being read that way. Its measurement is sharply quantized rather\nthan continuous:\n\n| calibration reading | nights | spread within class |\n|---|---|---|\n| ~3.93e6 ns | 14 | < 1% |\n| ~4.42e6 ns | 5 | < 0.3% |\n| ~4.09-4.23e6 ns | 3 | |\n| ~3.43-3.53e6 ns | 2 | |\n\nClasses sit 10-15% apart while repeat visits to one class hold within\n1%. On the two fastest nights (07-21, 08-07) *every* bench group dropped\n15-22% together.\n\n## What changed\n\nBaseline samples are drawn only from prior nightlies whose calibration\nlands within `MACHINE_TOL` (3%) of tonight's, so the comparison is\nlike-for-like hardware. Retention grows from 7 nightlies to 21 so an\ninfrequently-seen class still reaches `MIN_SAMPLES`; a class without\nenough history is recorded but not gated. The median still uses at most\n`BASELINE_SAMPLES` (7) of the most recent same-class nights, so a landed\nregression is not held down indefinitely by a long pre-regression tail.\n\nThe within-class residual drift is still divided out and still clamped\nto damping-only, so the #923/#924 amplification shape stays impossible.\n\nThe history file moves to a per-nightly layout, since stratification\nneeds to know which calibration reading each bench sample was measured\nalongside. A cached history in the old per-bench-column layout is\n**discarded rather than reconstructed**: that layout appended one sample\nper nightly per bench *that reported* and capped each column\nindependently, so it records no night identity and two columns can omit\ndifferent nights while holding equal counts. Any reconstruction is a\nguess, and a wrong one pairs a bench with another night's calibration -\nthe exact failure this PR removes, in a form nothing downstream can\ndetect. Discarding costs about a week of warm-up and fails safe, since\nnothing is gated until enough same-class samples accumulate.\n\n`MIN_CHANGE_PCT` is unchanged at 5.0. Backtesting showed raising it to\n10.0 removed only one of five spurious filings while costing real\nsensitivity, so the threshold is not the useful lever here.\n\n## Validation\n\nBacktested by driving the actual implementation night-by-night over the\nreal series:\n\n| | issues filed on 25 flat nights |\n|---|---|\n| before | 6 |\n| after | 5 (4 of which are one episode, below) |\n\nSensitivity, injecting a step regression on 2026-08-01 and requiring a\n*new* filing naming that bench:\n\n| step | quiet benches | mid | noisy |\n|---|---|---|---|\n| +6% | caught next night | caught next night | 1 of 3 caught |\n| +8% | caught next night | caught next night | all caught |\n| +10% and up | caught next night | caught next night | all caught |\n\nDetector unit tests go from 20 to 33 cases, covering stratification, the\n`MACHINE_TOL` boundary, the warm-up path for an unseen class, the\n`BASELINE_SAMPLES` cap, and the legacy-history discard including the\nfail-safe warm-up night.\n\n## Known remaining false positive\n\nFour of the five surviving filings are one episode with a different\ncause. The `scaling_*` group sat ~14% low for the entire nine-night\nwindow of b6a71308 and returned to normal the night the SHA changed,\n**on the same machine class** - though that commit touched no Rust or\nCargo file. Absolute timings therefore depend on build or environment\nstate beyond the source. Stratifying by hardware cannot address that, so\nit is filed as #942 rather than papered over here.",
          "timestamp": "2026-08-09T23:16:31Z",
          "url": "https://github.com/andymai/elevator-core/commit/bfb4c189bf526cfc31e02c0a0671737b96d325be"
        },
        "date": 1786696828585,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 3930547,
            "range": "± 4719",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 606202,
            "range": "± 5052",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 604002,
            "range": "± 3138",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 700540,
            "range": "± 4679",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 553180,
            "range": "± 903",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 34043,
            "range": "± 634",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 7618,
            "range": "± 369",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3452457,
            "range": "± 11480",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15317847,
            "range": "± 144380",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 569956,
            "range": "± 1587",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1895682,
            "range": "± 5706",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 9188428,
            "range": "± 42126",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 269238,
            "range": "± 854",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1823529,
            "range": "± 5940",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8827316,
            "range": "± 43863",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 261522,
            "range": "± 814",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1763311,
            "range": "± 11213",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8664215,
            "range": "± 52400",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 253137,
            "range": "± 2735",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1773479,
            "range": "± 15912",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8716444,
            "range": "± 97049",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 255275,
            "range": "± 4228",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1820807,
            "range": "± 4419",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8863478,
            "range": "± 41512",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 256349,
            "range": "± 811",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 5048,
            "range": "± 12142",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 4162,
            "range": "± 6444",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 4978,
            "range": "± 7719",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4028,
            "range": "± 868",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 21814,
            "range": "± 375",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3415461,
            "range": "± 5255",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3194692,
            "range": "± 5583",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 6437,
            "range": "± 13510",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 18237,
            "range": "± 19521",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 7457,
            "range": "± 289",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 88824,
            "range": "± 1506",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 16419,
            "range": "± 3932",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 833793,
            "range": "± 86460",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 85544,
            "range": "± 1831",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 15036,
            "range": "± 2827",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 824309,
            "range": "± 7167",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 87199,
            "range": "± 2608",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 16092,
            "range": "± 2559",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 5327086645,
            "range": "± 24637440",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 75597813,
            "range": "± 650945",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 18229957,
            "range": "± 120831",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 61970957,
            "range": "± 110485",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8170072,
            "range": "± 20368",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 33782,
            "range": "± 935",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 14369,
            "range": "± 5234",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 6433,
            "range": "± 4685",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 203711,
            "range": "± 4104",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 196276,
            "range": "± 4970",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 133068,
            "range": "± 9257",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Andy Aragon",
            "username": "andymai",
            "email": "hi@andymai.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "68af9806b49d3138ecc6b8b8c93522c0ce9974fe",
          "message": "fix(deps): restore playground security overrides under pnpm 11 (#943)\n\nCloses all 19 open Dependabot alerts. `pnpm audit` is clean for both\nprod and dev trees.\n\n## Root cause\n\npnpm 11 no longer reads the `pnpm` field from `package.json`:\n\n```\n[WARN] The \"pnpm\" field in package.json is no longer read by pnpm.\nThe following keys were ignored: \"pnpm.overrides\".\n```\n\nThe playground carried a `dompurify: \"^3.4.2\"` override there. CI pinned\n`pnpm/action-setup` to a floating `version: 10`, which still honoured\nit, while local pnpm had moved to 11 and dropped it. The override\nexisted, appeared to work on one side, and quietly stopped constraining\nanything on the other. Advisories piled up behind that split.\n\n## Changes\n\n- Overrides move to `playground/pnpm-workspace.yaml`, their supported\nhome.\n- `packageManager: \"pnpm@11.9.0\"` in `playground/package.json`; both\nworkflows now resolve the version from it via `package_json_file:`\ninstead of a floating major. Local and CI can no longer disagree about\nwhich settings are read.\n- Every flagged transitive dependency is raised past its advisory. All\nfive direct dependents already permitted these ranges, so the overrides\nonly lift the floor.\n\n| package | was | now | fixes | scope |\n|---|---|---|---|---|\n| dompurify | 3.4.2 | 3.4.13 | 10 alerts (XSS / sanitizer bypass) |\nruntime, via monaco-editor |\n| fast-uri | 3.1.2 | 3.1.5 | 3 alerts (host confusion) | dev, via ajv |\n| js-yaml | 4.1.1 | 4.3.1 | 3 alerts (quadratic CPU) | dev, via\ncosmiconfig |\n| postcss | 8.5.15 | 8.5.26 | 2 alerts (sourceMappingURL traversal) |\ndev, via vite |\n| brace-expansion | 5.0.5 | 5.0.9 | 1 alert (exponential expansion) |\ndev, via minimatch |\n\n`allowBuilds` is now stated explicitly for `esbuild` and\n`unrs-resolver`. pnpm 11 prompts for these where 10 ignored them\nsilently; both are denied, which is the behaviour the repo has had all\nalong. They ship prebuilt platform binaries via `optionalDependencies`,\nso their install scripts only re-verify what was already fetched.\n\n## Verification\n\n- `pnpm audit` and `pnpm audit --prod`: no known vulnerabilities.\n- 353 tests across 27 files pass; `tsc -b --noEmit` clean; eslint 0\nerrors; `vite build` succeeds.\n\nOnly `playground/` and `.github/` are touched, so no crate is bumped.\n\nNote: `pnpm run knip` fails on unused exports in `src/features/quest/`.\nThat is pre-existing and unrelated. knip runs in neither CI nor the\npre-commit hook, so it is left for a separate change.\n\n<!-- This is an auto-generated description by cubic. -->\n---\n## Summary by cubic\nRestores playground security overrides under `pnpm` 11 and pins `pnpm`\nvia `packageManager` so CI and local resolve identically. Previously,\n`pnpm` 11 ignored `package.json` `pnpm.overrides` while CI on `pnpm` 10\nhonored them; now overrides live in `pnpm-workspace.yaml` and all\nflagged transitives are bumped past advisories.\n\n- Move overrides to `playground/pnpm-workspace.yaml` and raise floors:\n`dompurify@^3.4.13`, `fast-uri@^3.1.5`, `js-yaml@^4.3.1`,\n`brace-expansion@^5.0.9`, `postcss@^8.5.26`.\n- Pin `packageManager: \"pnpm@11.9.0\"` in `playground/package.json`;\n`pnpm/action-setup` now uses `package_json_file` to align CI with local.\n- Declare `allowBuilds` for `esbuild` and `unrs-resolver` as false to\nmatch prior behavior (use prebuilt optional binaries).\n- Validation: `pnpm audit` (prod and dev) clean; tests/tsc/eslint/build\npass. Scope limited to `playground/` and `.github/`.\n\n<sup>Written for commit c1b1aa9e1713e436fa67466530fa6a8ea33f9d72.\nSummary will update on new commits.</sup>\n\n<a\nhref=\"https://cubic.dev/pr/andymai/elevator-core/pull/943?utm_source=github\"\ntarget=\"_blank\" rel=\"noopener noreferrer\"\ndata-no-image-dialog=\"true\"><picture><source\nmedia=\"(prefers-color-scheme: dark)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"><source\nmedia=\"(prefers-color-scheme: light)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-light.svg\"><img\nalt=\"Review in cubic\"\nsrc=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"></picture></a>\n\n<!-- End of auto-generated description by cubic. -->",
          "timestamp": "2026-08-14T17:57:18Z",
          "url": "https://github.com/andymai/elevator-core/commit/68af9806b49d3138ecc6b8b8c93522c0ce9974fe"
        },
        "date": 1786781864159,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 3932762,
            "range": "± 5910",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 605034,
            "range": "± 2165",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 599670,
            "range": "± 2780",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 698685,
            "range": "± 1083",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 553565,
            "range": "± 3649",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 34318,
            "range": "± 814",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 8346,
            "range": "± 9060",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3437338,
            "range": "± 23167",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15288801,
            "range": "± 43881",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 568972,
            "range": "± 1284",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1872393,
            "range": "± 5696",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 9167113,
            "range": "± 64148",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 273039,
            "range": "± 3860",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1829064,
            "range": "± 11017",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8820595,
            "range": "± 67404",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 266880,
            "range": "± 3160",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1760088,
            "range": "± 6577",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8506715,
            "range": "± 18298",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 261478,
            "range": "± 3667",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1787322,
            "range": "± 20050",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8590810,
            "range": "± 58589",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 259931,
            "range": "± 5019",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1801078,
            "range": "± 7157",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8784725,
            "range": "± 57963",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 258983,
            "range": "± 5759",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 3937,
            "range": "± 2520",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 3758,
            "range": "± 2140",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 5186,
            "range": "± 6671",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4038,
            "range": "± 617",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 22987,
            "range": "± 10069",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3398680,
            "range": "± 4170",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3170273,
            "range": "± 4490",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 7217,
            "range": "± 21199",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 16355,
            "range": "± 534",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 8299,
            "range": "± 8281",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 89298,
            "range": "± 3734",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 16297,
            "range": "± 2642",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 814697,
            "range": "± 15008",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 86895,
            "range": "± 2246",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 15518,
            "range": "± 2891",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 835827,
            "range": "± 28519",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 93568,
            "range": "± 6931",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 16331,
            "range": "± 2755",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 5332165483,
            "range": "± 12449538",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 75787419,
            "range": "± 297563",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 18239480,
            "range": "± 13373",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 62418801,
            "range": "± 255717",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8381081,
            "range": "± 26591",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 35918,
            "range": "± 1894",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 14116,
            "range": "± 692",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 6447,
            "range": "± 589",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 203681,
            "range": "± 3049",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 201538,
            "range": "± 57194",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 131967,
            "range": "± 19401",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Andy Aragon",
            "username": "andymai",
            "email": "hi@andymai.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "68af9806b49d3138ecc6b8b8c93522c0ce9974fe",
          "message": "fix(deps): restore playground security overrides under pnpm 11 (#943)\n\nCloses all 19 open Dependabot alerts. `pnpm audit` is clean for both\nprod and dev trees.\n\n## Root cause\n\npnpm 11 no longer reads the `pnpm` field from `package.json`:\n\n```\n[WARN] The \"pnpm\" field in package.json is no longer read by pnpm.\nThe following keys were ignored: \"pnpm.overrides\".\n```\n\nThe playground carried a `dompurify: \"^3.4.2\"` override there. CI pinned\n`pnpm/action-setup` to a floating `version: 10`, which still honoured\nit, while local pnpm had moved to 11 and dropped it. The override\nexisted, appeared to work on one side, and quietly stopped constraining\nanything on the other. Advisories piled up behind that split.\n\n## Changes\n\n- Overrides move to `playground/pnpm-workspace.yaml`, their supported\nhome.\n- `packageManager: \"pnpm@11.9.0\"` in `playground/package.json`; both\nworkflows now resolve the version from it via `package_json_file:`\ninstead of a floating major. Local and CI can no longer disagree about\nwhich settings are read.\n- Every flagged transitive dependency is raised past its advisory. All\nfive direct dependents already permitted these ranges, so the overrides\nonly lift the floor.\n\n| package | was | now | fixes | scope |\n|---|---|---|---|---|\n| dompurify | 3.4.2 | 3.4.13 | 10 alerts (XSS / sanitizer bypass) |\nruntime, via monaco-editor |\n| fast-uri | 3.1.2 | 3.1.5 | 3 alerts (host confusion) | dev, via ajv |\n| js-yaml | 4.1.1 | 4.3.1 | 3 alerts (quadratic CPU) | dev, via\ncosmiconfig |\n| postcss | 8.5.15 | 8.5.26 | 2 alerts (sourceMappingURL traversal) |\ndev, via vite |\n| brace-expansion | 5.0.5 | 5.0.9 | 1 alert (exponential expansion) |\ndev, via minimatch |\n\n`allowBuilds` is now stated explicitly for `esbuild` and\n`unrs-resolver`. pnpm 11 prompts for these where 10 ignored them\nsilently; both are denied, which is the behaviour the repo has had all\nalong. They ship prebuilt platform binaries via `optionalDependencies`,\nso their install scripts only re-verify what was already fetched.\n\n## Verification\n\n- `pnpm audit` and `pnpm audit --prod`: no known vulnerabilities.\n- 353 tests across 27 files pass; `tsc -b --noEmit` clean; eslint 0\nerrors; `vite build` succeeds.\n\nOnly `playground/` and `.github/` are touched, so no crate is bumped.\n\nNote: `pnpm run knip` fails on unused exports in `src/features/quest/`.\nThat is pre-existing and unrelated. knip runs in neither CI nor the\npre-commit hook, so it is left for a separate change.\n\n<!-- This is an auto-generated description by cubic. -->\n---\n## Summary by cubic\nRestores playground security overrides under `pnpm` 11 and pins `pnpm`\nvia `packageManager` so CI and local resolve identically. Previously,\n`pnpm` 11 ignored `package.json` `pnpm.overrides` while CI on `pnpm` 10\nhonored them; now overrides live in `pnpm-workspace.yaml` and all\nflagged transitives are bumped past advisories.\n\n- Move overrides to `playground/pnpm-workspace.yaml` and raise floors:\n`dompurify@^3.4.13`, `fast-uri@^3.1.5`, `js-yaml@^4.3.1`,\n`brace-expansion@^5.0.9`, `postcss@^8.5.26`.\n- Pin `packageManager: \"pnpm@11.9.0\"` in `playground/package.json`;\n`pnpm/action-setup` now uses `package_json_file` to align CI with local.\n- Declare `allowBuilds` for `esbuild` and `unrs-resolver` as false to\nmatch prior behavior (use prebuilt optional binaries).\n- Validation: `pnpm audit` (prod and dev) clean; tests/tsc/eslint/build\npass. Scope limited to `playground/` and `.github/`.\n\n<sup>Written for commit c1b1aa9e1713e436fa67466530fa6a8ea33f9d72.\nSummary will update on new commits.</sup>\n\n<a\nhref=\"https://cubic.dev/pr/andymai/elevator-core/pull/943?utm_source=github\"\ntarget=\"_blank\" rel=\"noopener noreferrer\"\ndata-no-image-dialog=\"true\"><picture><source\nmedia=\"(prefers-color-scheme: dark)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"><source\nmedia=\"(prefers-color-scheme: light)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-light.svg\"><img\nalt=\"Review in cubic\"\nsrc=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"></picture></a>\n\n<!-- End of auto-generated description by cubic. -->",
          "timestamp": "2026-08-14T17:57:18Z",
          "url": "https://github.com/andymai/elevator-core/commit/68af9806b49d3138ecc6b8b8c93522c0ce9974fe"
        },
        "date": 1786868286596,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 3927307,
            "range": "± 3336",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 605195,
            "range": "± 2061",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 603773,
            "range": "± 1962",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 699343,
            "range": "± 3652",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 554227,
            "range": "± 4173",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 34389,
            "range": "± 4722",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 7563,
            "range": "± 1689",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3407703,
            "range": "± 9804",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15285815,
            "range": "± 47145",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 570911,
            "range": "± 1799",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1871280,
            "range": "± 4646",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 9221308,
            "range": "± 63274",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 269648,
            "range": "± 923",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1819503,
            "range": "± 8384",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8858861,
            "range": "± 47396",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 264699,
            "range": "± 2093",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1768860,
            "range": "± 28700",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8616154,
            "range": "± 27600",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 259273,
            "range": "± 1921",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1756882,
            "range": "± 10378",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8675133,
            "range": "± 175454",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 256798,
            "range": "± 1487",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1805242,
            "range": "± 8058",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8847451,
            "range": "± 49138",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 254670,
            "range": "± 684",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 4111,
            "range": "± 3291",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 3813,
            "range": "± 1661",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 4178,
            "range": "± 335",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4225,
            "range": "± 2632",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 21717,
            "range": "± 984",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3407702,
            "range": "± 7796",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3175570,
            "range": "± 14343",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 7893,
            "range": "± 27535",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 17559,
            "range": "± 11739",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 7574,
            "range": "± 281",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 89387,
            "range": "± 1741",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 17128,
            "range": "± 2536",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 827516,
            "range": "± 13127",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 86290,
            "range": "± 1571",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 15349,
            "range": "± 2492",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 843989,
            "range": "± 5319",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 87701,
            "range": "± 7019",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 16904,
            "range": "± 2599",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 5324844911,
            "range": "± 21781178",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 75578673,
            "range": "± 98174",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 18215886,
            "range": "± 32945",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 62168969,
            "range": "± 154968",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8215799,
            "range": "± 20473",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 33909,
            "range": "± 720",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 14449,
            "range": "± 3144",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 5958,
            "range": "± 205",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 203178,
            "range": "± 4861",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 196809,
            "range": "± 5713",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 135785,
            "range": "± 29069",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "Andy Aragon",
            "username": "andymai",
            "email": "hi@andymai.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "68af9806b49d3138ecc6b8b8c93522c0ce9974fe",
          "message": "fix(deps): restore playground security overrides under pnpm 11 (#943)\n\nCloses all 19 open Dependabot alerts. `pnpm audit` is clean for both\nprod and dev trees.\n\n## Root cause\n\npnpm 11 no longer reads the `pnpm` field from `package.json`:\n\n```\n[WARN] The \"pnpm\" field in package.json is no longer read by pnpm.\nThe following keys were ignored: \"pnpm.overrides\".\n```\n\nThe playground carried a `dompurify: \"^3.4.2\"` override there. CI pinned\n`pnpm/action-setup` to a floating `version: 10`, which still honoured\nit, while local pnpm had moved to 11 and dropped it. The override\nexisted, appeared to work on one side, and quietly stopped constraining\nanything on the other. Advisories piled up behind that split.\n\n## Changes\n\n- Overrides move to `playground/pnpm-workspace.yaml`, their supported\nhome.\n- `packageManager: \"pnpm@11.9.0\"` in `playground/package.json`; both\nworkflows now resolve the version from it via `package_json_file:`\ninstead of a floating major. Local and CI can no longer disagree about\nwhich settings are read.\n- Every flagged transitive dependency is raised past its advisory. All\nfive direct dependents already permitted these ranges, so the overrides\nonly lift the floor.\n\n| package | was | now | fixes | scope |\n|---|---|---|---|---|\n| dompurify | 3.4.2 | 3.4.13 | 10 alerts (XSS / sanitizer bypass) |\nruntime, via monaco-editor |\n| fast-uri | 3.1.2 | 3.1.5 | 3 alerts (host confusion) | dev, via ajv |\n| js-yaml | 4.1.1 | 4.3.1 | 3 alerts (quadratic CPU) | dev, via\ncosmiconfig |\n| postcss | 8.5.15 | 8.5.26 | 2 alerts (sourceMappingURL traversal) |\ndev, via vite |\n| brace-expansion | 5.0.5 | 5.0.9 | 1 alert (exponential expansion) |\ndev, via minimatch |\n\n`allowBuilds` is now stated explicitly for `esbuild` and\n`unrs-resolver`. pnpm 11 prompts for these where 10 ignored them\nsilently; both are denied, which is the behaviour the repo has had all\nalong. They ship prebuilt platform binaries via `optionalDependencies`,\nso their install scripts only re-verify what was already fetched.\n\n## Verification\n\n- `pnpm audit` and `pnpm audit --prod`: no known vulnerabilities.\n- 353 tests across 27 files pass; `tsc -b --noEmit` clean; eslint 0\nerrors; `vite build` succeeds.\n\nOnly `playground/` and `.github/` are touched, so no crate is bumped.\n\nNote: `pnpm run knip` fails on unused exports in `src/features/quest/`.\nThat is pre-existing and unrelated. knip runs in neither CI nor the\npre-commit hook, so it is left for a separate change.\n\n<!-- This is an auto-generated description by cubic. -->\n---\n## Summary by cubic\nRestores playground security overrides under `pnpm` 11 and pins `pnpm`\nvia `packageManager` so CI and local resolve identically. Previously,\n`pnpm` 11 ignored `package.json` `pnpm.overrides` while CI on `pnpm` 10\nhonored them; now overrides live in `pnpm-workspace.yaml` and all\nflagged transitives are bumped past advisories.\n\n- Move overrides to `playground/pnpm-workspace.yaml` and raise floors:\n`dompurify@^3.4.13`, `fast-uri@^3.1.5`, `js-yaml@^4.3.1`,\n`brace-expansion@^5.0.9`, `postcss@^8.5.26`.\n- Pin `packageManager: \"pnpm@11.9.0\"` in `playground/package.json`;\n`pnpm/action-setup` now uses `package_json_file` to align CI with local.\n- Declare `allowBuilds` for `esbuild` and `unrs-resolver` as false to\nmatch prior behavior (use prebuilt optional binaries).\n- Validation: `pnpm audit` (prod and dev) clean; tests/tsc/eslint/build\npass. Scope limited to `playground/` and `.github/`.\n\n<sup>Written for commit c1b1aa9e1713e436fa67466530fa6a8ea33f9d72.\nSummary will update on new commits.</sup>\n\n<a\nhref=\"https://cubic.dev/pr/andymai/elevator-core/pull/943?utm_source=github\"\ntarget=\"_blank\" rel=\"noopener noreferrer\"\ndata-no-image-dialog=\"true\"><picture><source\nmedia=\"(prefers-color-scheme: dark)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"><source\nmedia=\"(prefers-color-scheme: light)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-light.svg\"><img\nalt=\"Review in cubic\"\nsrc=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"></picture></a>\n\n<!-- End of auto-generated description by cubic. -->",
          "timestamp": "2026-08-14T17:57:18Z",
          "url": "https://github.com/andymai/elevator-core/commit/68af9806b49d3138ecc6b8b8c93522c0ce9974fe"
        },
        "date": 1786955134401,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 3930243,
            "range": "± 3282",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 604332,
            "range": "± 3219",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 601417,
            "range": "± 2915",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 698116,
            "range": "± 1849",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 550476,
            "range": "± 1114",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 34760,
            "range": "± 3734",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 7521,
            "range": "± 329",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3409883,
            "range": "± 10020",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15199074,
            "range": "± 53786",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 560457,
            "range": "± 1174",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1858947,
            "range": "± 4234",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 9114980,
            "range": "± 25233",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 268873,
            "range": "± 942",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1809303,
            "range": "± 8988",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8803179,
            "range": "± 60108",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 262380,
            "range": "± 1477",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1748916,
            "range": "± 7084",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8574384,
            "range": "± 51439",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 258597,
            "range": "± 3879",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1755488,
            "range": "± 4496",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8576065,
            "range": "± 31050",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 254641,
            "range": "± 1110",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1811627,
            "range": "± 6511",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8765472,
            "range": "± 55001",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 254667,
            "range": "± 3352",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 3896,
            "range": "± 1590",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 3860,
            "range": "± 2660",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 5120,
            "range": "± 6046",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4648,
            "range": "± 4301",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 22001,
            "range": "± 607",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3395188,
            "range": "± 11492",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3156732,
            "range": "± 2757",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 7224,
            "range": "± 20465",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 17533,
            "range": "± 1132",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 8574,
            "range": "± 6972",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 96747,
            "range": "± 15071",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 19444,
            "range": "± 5058",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 837917,
            "range": "± 15268",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 86331,
            "range": "± 3173",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 15866,
            "range": "± 2419",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 834180,
            "range": "± 6149",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 87751,
            "range": "± 4000",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 17035,
            "range": "± 2385",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 5307266925,
            "range": "± 20071087",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 75863725,
            "range": "± 520615",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 18168067,
            "range": "± 31851",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 62252300,
            "range": "± 1167834",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8331345,
            "range": "± 111170",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 34492,
            "range": "± 1209",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 13815,
            "range": "± 652",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 6181,
            "range": "± 352",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 203443,
            "range": "± 14423",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 196963,
            "range": "± 14017",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 130650,
            "range": "± 5279",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "dependabot[bot]",
            "username": "dependabot[bot]",
            "email": "49699333+dependabot[bot]@users.noreply.github.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "414472313148d98b82fa77462ce5b3a2fdb3ce75",
          "message": "chore(deps): bump bevy from 0.19.0 to 0.19.1 (#945)\n\nBumps [bevy](https://github.com/bevyengine/bevy) from 0.19.0 to 0.19.1.\n<details>\n<summary>Release notes</summary>\n<p><em>Sourced from <a\nhref=\"https://github.com/bevyengine/bevy/releases\">bevy's\nreleases</a>.</em></p>\n<blockquote>\n<h2>v0.19.1</h2>\n<p>A full diff of what's in this release can be seen here: <a\nhref=\"https://github.com/bevyengine/bevy/compare/v0.19.0...v0.19.1\">https://github.com/bevyengine/bevy/compare/v0.19.0...v0.19.1</a></p>\n</blockquote>\n</details>\n<details>\n<summary>Commits</summary>\n<ul>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/b56fc29d3016e641754765244b5ba3f9cc504671\"><code>b56fc29</code></a>\nRelease Bevy 0.19.1</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/5fb708a18388d97861d0d6dbeadc20e268c33d1c\"><code>5fb708a</code></a>\nFix normalization in SSAO calculation (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25334\">#25334</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/201c54be145a285f2f443cea750a3390d5c71370\"><code>201c54b</code></a>\nFix documented despawn lifecycle event order (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25367\">#25367</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/9b7e4b6d99930b017c60ea1d1e50d203538ecc46\"><code>9b7e4b6</code></a>\nadd &quot;wayland-data-control&quot; feature to arboard, if\n&quot;wayland&quot; feature set (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25361\">#25361</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/68f37ac770aecbfca7d988d74e9a0fe32f18c3ff\"><code>68f37ac</code></a>\nFix incorrect <code>textureGather</code> argument in SSAO (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25338\">#25338</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/5760205066040557ee2d4022f0f3227b8c5aed70\"><code>5760205</code></a>\nFix 2D flicker by always dequeueing retained phase items (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25163\">#25163</a>)\n(<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25253\">#25253</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/d16240d5255a8ffa6d40a3d04176373ae333acce\"><code>d16240d</code></a>\nFix shader out of bounds accesses (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25252\">#25252</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/56b2faf4fc5870be1ca07e73949092e11afee8fa\"><code>56b2faf</code></a>\nProperly layer emission under clearcoat (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25256\">#25256</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/a1632f4e8598653b73adc0c1b12006d231693cb9\"><code>a1632f4</code></a>\nFix <code>binding_arrays_are_usable</code> check (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25261\">#25261</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/101149f8ce3cc211a2f2f31501fd09a7d4908e94\"><code>101149f</code></a>\nUse <code>None</code> instead of <code>Confined</code> fallback for\n<code>CursorGrabMode</code> (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25273\">#25273</a>)</li>\n<li>Additional commits viewable in <a\nhref=\"https://github.com/bevyengine/bevy/compare/v0.19.0...v0.19.1\">compare\nview</a></li>\n</ul>\n</details>\n<br />\n\n\n[![Dependabot compatibility\nscore](https://dependabot-badges.githubapp.com/badges/compatibility_score?dependency-name=bevy&package-manager=cargo&previous-version=0.19.0&new-version=0.19.1)](https://docs.github.com/en/github/managing-security-vulnerabilities/about-dependabot-security-updates#about-compatibility-scores)\n\nDependabot will resolve any conflicts with this PR as long as you don't\nalter it yourself. You can also trigger a rebase manually by commenting\n`@dependabot rebase`.\n\n[//]: # (dependabot-automerge-start)\n[//]: # (dependabot-automerge-end)\n\n---\n\n<details>\n<summary>Dependabot commands and options</summary>\n<br />\n\nYou can trigger Dependabot actions by commenting on this PR:\n- `@dependabot rebase` will rebase this PR\n- `@dependabot recreate` will recreate this PR, overwriting any edits\nthat have been made to it\n- `@dependabot show <dependency name> ignore conditions` will show all\nof the ignore conditions of the specified dependency\n- `@dependabot ignore this major version` will close this PR and stop\nDependabot creating any more for this major version (unless you reopen\nthe PR or upgrade to it yourself)\n- `@dependabot ignore this minor version` will close this PR and stop\nDependabot creating any more for this minor version (unless you reopen\nthe PR or upgrade to it yourself)\n- `@dependabot ignore this dependency` will close this PR and stop\nDependabot creating any more for this dependency (unless you reopen the\nPR or upgrade to it yourself)\n\n\n</details>\n\n<!-- This is an auto-generated description by cubic. -->\n---\n## Summary by cubic\nUpgrade `bevy` from 0.19.0 to 0.19.1 to pick up upstream rendering fixes\nand improved clipboard support (including Wayland). Old behavior\nincluded occasional 2D flicker and SSAO inaccuracies; new behavior\naddresses these and adjusts cursor grab fallback to None on unsupported\nplatforms. No application code changes.\n\n- Review/QA: smoke test 2D and 3D rendering (SSAO, shaders), verify\nmouse capture behavior on Windows/Linux due to the cursor grab fallback\nchange, and verify clipboard operations; `bevy_clipboard` now uses\n`arboard` with `wl-clipboard-rs`/`clipboard-win`, adding new transitive\ndependencies but no migrations.\n\n<sup>Written for commit 7f4b2d27ebac4d2bee885c47d2d5ded4e7e57752.\nSummary will update on new commits.</sup>\n\n<a\nhref=\"https://cubic.dev/pr/andymai/elevator-core/pull/945?utm_source=github\"\ntarget=\"_blank\" rel=\"noopener noreferrer\"\ndata-no-image-dialog=\"true\"><picture><source\nmedia=\"(prefers-color-scheme: dark)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"><source\nmedia=\"(prefers-color-scheme: light)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-light.svg\"><img\nalt=\"Review in cubic\"\nsrc=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"></picture></a>\n\n<!-- End of auto-generated description by cubic. -->\n\nSigned-off-by: dependabot[bot] <support@github.com>\nCo-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>",
          "timestamp": "2026-08-17T19:35:08Z",
          "url": "https://github.com/andymai/elevator-core/commit/414472313148d98b82fa77462ce5b3a2fdb3ce75"
        },
        "date": 1787041296460,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 3929247,
            "range": "± 6664",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 612752,
            "range": "± 1703",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 613314,
            "range": "± 2776",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 706485,
            "range": "± 1683",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 562598,
            "range": "± 1935",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 35024,
            "range": "± 1734",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 7679,
            "range": "± 640",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3461105,
            "range": "± 19426",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15337491,
            "range": "± 72562",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 571111,
            "range": "± 1827",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1910769,
            "range": "± 6303",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 9206424,
            "range": "± 65970",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 275753,
            "range": "± 2271",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1854865,
            "range": "± 12435",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8771069,
            "range": "± 34551",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 271163,
            "range": "± 5608",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1788112,
            "range": "± 9137",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8583260,
            "range": "± 57953",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 259052,
            "range": "± 3072",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1787559,
            "range": "± 5468",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8574031,
            "range": "± 31244",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 260891,
            "range": "± 757",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1855697,
            "range": "± 7867",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8891687,
            "range": "± 71132",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 259305,
            "range": "± 3574",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 4664,
            "range": "± 7206",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 4404,
            "range": "± 4729",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 4616,
            "range": "± 1499",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4327,
            "range": "± 1906",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 22840,
            "range": "± 4260",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3413212,
            "range": "± 10767",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3186993,
            "range": "± 5536",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 7751,
            "range": "± 18182",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 18348,
            "range": "± 4144",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 9348,
            "range": "± 11606",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 95395,
            "range": "± 6918",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 18595,
            "range": "± 3897",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 879954,
            "range": "± 38124",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 95217,
            "range": "± 8431",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 16843,
            "range": "± 3110",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 875698,
            "range": "± 24637",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 96006,
            "range": "± 5461",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 19297,
            "range": "± 5654",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 5397351674,
            "range": "± 16304956",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 76802555,
            "range": "± 394724",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 18427940,
            "range": "± 89557",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 63350077,
            "range": "± 181943",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8359473,
            "range": "± 38368",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 34457,
            "range": "± 773",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 14102,
            "range": "± 2143",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 6169,
            "range": "± 466",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 207535,
            "range": "± 60094",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 196654,
            "range": "± 5179",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 130880,
            "range": "± 4574",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "dependabot[bot]",
            "username": "dependabot[bot]",
            "email": "49699333+dependabot[bot]@users.noreply.github.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "414472313148d98b82fa77462ce5b3a2fdb3ce75",
          "message": "chore(deps): bump bevy from 0.19.0 to 0.19.1 (#945)\n\nBumps [bevy](https://github.com/bevyengine/bevy) from 0.19.0 to 0.19.1.\n<details>\n<summary>Release notes</summary>\n<p><em>Sourced from <a\nhref=\"https://github.com/bevyengine/bevy/releases\">bevy's\nreleases</a>.</em></p>\n<blockquote>\n<h2>v0.19.1</h2>\n<p>A full diff of what's in this release can be seen here: <a\nhref=\"https://github.com/bevyengine/bevy/compare/v0.19.0...v0.19.1\">https://github.com/bevyengine/bevy/compare/v0.19.0...v0.19.1</a></p>\n</blockquote>\n</details>\n<details>\n<summary>Commits</summary>\n<ul>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/b56fc29d3016e641754765244b5ba3f9cc504671\"><code>b56fc29</code></a>\nRelease Bevy 0.19.1</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/5fb708a18388d97861d0d6dbeadc20e268c33d1c\"><code>5fb708a</code></a>\nFix normalization in SSAO calculation (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25334\">#25334</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/201c54be145a285f2f443cea750a3390d5c71370\"><code>201c54b</code></a>\nFix documented despawn lifecycle event order (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25367\">#25367</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/9b7e4b6d99930b017c60ea1d1e50d203538ecc46\"><code>9b7e4b6</code></a>\nadd &quot;wayland-data-control&quot; feature to arboard, if\n&quot;wayland&quot; feature set (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25361\">#25361</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/68f37ac770aecbfca7d988d74e9a0fe32f18c3ff\"><code>68f37ac</code></a>\nFix incorrect <code>textureGather</code> argument in SSAO (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25338\">#25338</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/5760205066040557ee2d4022f0f3227b8c5aed70\"><code>5760205</code></a>\nFix 2D flicker by always dequeueing retained phase items (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25163\">#25163</a>)\n(<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25253\">#25253</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/d16240d5255a8ffa6d40a3d04176373ae333acce\"><code>d16240d</code></a>\nFix shader out of bounds accesses (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25252\">#25252</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/56b2faf4fc5870be1ca07e73949092e11afee8fa\"><code>56b2faf</code></a>\nProperly layer emission under clearcoat (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25256\">#25256</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/a1632f4e8598653b73adc0c1b12006d231693cb9\"><code>a1632f4</code></a>\nFix <code>binding_arrays_are_usable</code> check (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25261\">#25261</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/101149f8ce3cc211a2f2f31501fd09a7d4908e94\"><code>101149f</code></a>\nUse <code>None</code> instead of <code>Confined</code> fallback for\n<code>CursorGrabMode</code> (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25273\">#25273</a>)</li>\n<li>Additional commits viewable in <a\nhref=\"https://github.com/bevyengine/bevy/compare/v0.19.0...v0.19.1\">compare\nview</a></li>\n</ul>\n</details>\n<br />\n\n\n[![Dependabot compatibility\nscore](https://dependabot-badges.githubapp.com/badges/compatibility_score?dependency-name=bevy&package-manager=cargo&previous-version=0.19.0&new-version=0.19.1)](https://docs.github.com/en/github/managing-security-vulnerabilities/about-dependabot-security-updates#about-compatibility-scores)\n\nDependabot will resolve any conflicts with this PR as long as you don't\nalter it yourself. You can also trigger a rebase manually by commenting\n`@dependabot rebase`.\n\n[//]: # (dependabot-automerge-start)\n[//]: # (dependabot-automerge-end)\n\n---\n\n<details>\n<summary>Dependabot commands and options</summary>\n<br />\n\nYou can trigger Dependabot actions by commenting on this PR:\n- `@dependabot rebase` will rebase this PR\n- `@dependabot recreate` will recreate this PR, overwriting any edits\nthat have been made to it\n- `@dependabot show <dependency name> ignore conditions` will show all\nof the ignore conditions of the specified dependency\n- `@dependabot ignore this major version` will close this PR and stop\nDependabot creating any more for this major version (unless you reopen\nthe PR or upgrade to it yourself)\n- `@dependabot ignore this minor version` will close this PR and stop\nDependabot creating any more for this minor version (unless you reopen\nthe PR or upgrade to it yourself)\n- `@dependabot ignore this dependency` will close this PR and stop\nDependabot creating any more for this dependency (unless you reopen the\nPR or upgrade to it yourself)\n\n\n</details>\n\n<!-- This is an auto-generated description by cubic. -->\n---\n## Summary by cubic\nUpgrade `bevy` from 0.19.0 to 0.19.1 to pick up upstream rendering fixes\nand improved clipboard support (including Wayland). Old behavior\nincluded occasional 2D flicker and SSAO inaccuracies; new behavior\naddresses these and adjusts cursor grab fallback to None on unsupported\nplatforms. No application code changes.\n\n- Review/QA: smoke test 2D and 3D rendering (SSAO, shaders), verify\nmouse capture behavior on Windows/Linux due to the cursor grab fallback\nchange, and verify clipboard operations; `bevy_clipboard` now uses\n`arboard` with `wl-clipboard-rs`/`clipboard-win`, adding new transitive\ndependencies but no migrations.\n\n<sup>Written for commit 7f4b2d27ebac4d2bee885c47d2d5ded4e7e57752.\nSummary will update on new commits.</sup>\n\n<a\nhref=\"https://cubic.dev/pr/andymai/elevator-core/pull/945?utm_source=github\"\ntarget=\"_blank\" rel=\"noopener noreferrer\"\ndata-no-image-dialog=\"true\"><picture><source\nmedia=\"(prefers-color-scheme: dark)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"><source\nmedia=\"(prefers-color-scheme: light)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-light.svg\"><img\nalt=\"Review in cubic\"\nsrc=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"></picture></a>\n\n<!-- End of auto-generated description by cubic. -->\n\nSigned-off-by: dependabot[bot] <support@github.com>\nCo-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>",
          "timestamp": "2026-08-17T19:35:08Z",
          "url": "https://github.com/andymai/elevator-core/commit/414472313148d98b82fa77462ce5b3a2fdb3ce75"
        },
        "date": 1787127769983,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 3928559,
            "range": "± 3066",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 614782,
            "range": "± 1848",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 613721,
            "range": "± 3219",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 704919,
            "range": "± 2952",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 566495,
            "range": "± 14023",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 34328,
            "range": "± 5099",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 7413,
            "range": "± 305",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3455915,
            "range": "± 71828",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15116250,
            "range": "± 37931",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 568855,
            "range": "± 8808",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1882466,
            "range": "± 5549",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 9175581,
            "range": "± 47892",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 270133,
            "range": "± 1490",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1826501,
            "range": "± 6718",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8815351,
            "range": "± 20316",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 260963,
            "range": "± 3395",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1767157,
            "range": "± 5177",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8561018,
            "range": "± 29624",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 253421,
            "range": "± 1299",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1774137,
            "range": "± 6189",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8561087,
            "range": "± 39876",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 255640,
            "range": "± 1836",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1819222,
            "range": "± 8037",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8822457,
            "range": "± 108508",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 254784,
            "range": "± 2507",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 3899,
            "range": "± 1693",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 3725,
            "range": "± 1832",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 4631,
            "range": "± 4567",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4061,
            "range": "± 965",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 22108,
            "range": "± 4047",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3398371,
            "range": "± 8987",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3210249,
            "range": "± 19145",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 8902,
            "range": "± 27334",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 17231,
            "range": "± 8607",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 9168,
            "range": "± 6207",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 89397,
            "range": "± 7344",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 16337,
            "range": "± 2494",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 838709,
            "range": "± 13523",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 92581,
            "range": "± 9055",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 15622,
            "range": "± 2928",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 863281,
            "range": "± 16257",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 93542,
            "range": "± 7967",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 16931,
            "range": "± 2651",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 5304948854,
            "range": "± 20199462",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 77218706,
            "range": "± 635793",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 18227670,
            "range": "± 83340",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 63341658,
            "range": "± 538589",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8301580,
            "range": "± 21122",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 34940,
            "range": "± 6178",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 14284,
            "range": "± 3489",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 6419,
            "range": "± 4077",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 202211,
            "range": "± 7679",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 195546,
            "range": "± 8288",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 130596,
            "range": "± 10861",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "dependabot[bot]",
            "username": "dependabot[bot]",
            "email": "49699333+dependabot[bot]@users.noreply.github.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "414472313148d98b82fa77462ce5b3a2fdb3ce75",
          "message": "chore(deps): bump bevy from 0.19.0 to 0.19.1 (#945)\n\nBumps [bevy](https://github.com/bevyengine/bevy) from 0.19.0 to 0.19.1.\n<details>\n<summary>Release notes</summary>\n<p><em>Sourced from <a\nhref=\"https://github.com/bevyengine/bevy/releases\">bevy's\nreleases</a>.</em></p>\n<blockquote>\n<h2>v0.19.1</h2>\n<p>A full diff of what's in this release can be seen here: <a\nhref=\"https://github.com/bevyengine/bevy/compare/v0.19.0...v0.19.1\">https://github.com/bevyengine/bevy/compare/v0.19.0...v0.19.1</a></p>\n</blockquote>\n</details>\n<details>\n<summary>Commits</summary>\n<ul>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/b56fc29d3016e641754765244b5ba3f9cc504671\"><code>b56fc29</code></a>\nRelease Bevy 0.19.1</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/5fb708a18388d97861d0d6dbeadc20e268c33d1c\"><code>5fb708a</code></a>\nFix normalization in SSAO calculation (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25334\">#25334</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/201c54be145a285f2f443cea750a3390d5c71370\"><code>201c54b</code></a>\nFix documented despawn lifecycle event order (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25367\">#25367</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/9b7e4b6d99930b017c60ea1d1e50d203538ecc46\"><code>9b7e4b6</code></a>\nadd &quot;wayland-data-control&quot; feature to arboard, if\n&quot;wayland&quot; feature set (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25361\">#25361</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/68f37ac770aecbfca7d988d74e9a0fe32f18c3ff\"><code>68f37ac</code></a>\nFix incorrect <code>textureGather</code> argument in SSAO (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25338\">#25338</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/5760205066040557ee2d4022f0f3227b8c5aed70\"><code>5760205</code></a>\nFix 2D flicker by always dequeueing retained phase items (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25163\">#25163</a>)\n(<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25253\">#25253</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/d16240d5255a8ffa6d40a3d04176373ae333acce\"><code>d16240d</code></a>\nFix shader out of bounds accesses (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25252\">#25252</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/56b2faf4fc5870be1ca07e73949092e11afee8fa\"><code>56b2faf</code></a>\nProperly layer emission under clearcoat (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25256\">#25256</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/a1632f4e8598653b73adc0c1b12006d231693cb9\"><code>a1632f4</code></a>\nFix <code>binding_arrays_are_usable</code> check (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25261\">#25261</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/101149f8ce3cc211a2f2f31501fd09a7d4908e94\"><code>101149f</code></a>\nUse <code>None</code> instead of <code>Confined</code> fallback for\n<code>CursorGrabMode</code> (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25273\">#25273</a>)</li>\n<li>Additional commits viewable in <a\nhref=\"https://github.com/bevyengine/bevy/compare/v0.19.0...v0.19.1\">compare\nview</a></li>\n</ul>\n</details>\n<br />\n\n\n[![Dependabot compatibility\nscore](https://dependabot-badges.githubapp.com/badges/compatibility_score?dependency-name=bevy&package-manager=cargo&previous-version=0.19.0&new-version=0.19.1)](https://docs.github.com/en/github/managing-security-vulnerabilities/about-dependabot-security-updates#about-compatibility-scores)\n\nDependabot will resolve any conflicts with this PR as long as you don't\nalter it yourself. You can also trigger a rebase manually by commenting\n`@dependabot rebase`.\n\n[//]: # (dependabot-automerge-start)\n[//]: # (dependabot-automerge-end)\n\n---\n\n<details>\n<summary>Dependabot commands and options</summary>\n<br />\n\nYou can trigger Dependabot actions by commenting on this PR:\n- `@dependabot rebase` will rebase this PR\n- `@dependabot recreate` will recreate this PR, overwriting any edits\nthat have been made to it\n- `@dependabot show <dependency name> ignore conditions` will show all\nof the ignore conditions of the specified dependency\n- `@dependabot ignore this major version` will close this PR and stop\nDependabot creating any more for this major version (unless you reopen\nthe PR or upgrade to it yourself)\n- `@dependabot ignore this minor version` will close this PR and stop\nDependabot creating any more for this minor version (unless you reopen\nthe PR or upgrade to it yourself)\n- `@dependabot ignore this dependency` will close this PR and stop\nDependabot creating any more for this dependency (unless you reopen the\nPR or upgrade to it yourself)\n\n\n</details>\n\n<!-- This is an auto-generated description by cubic. -->\n---\n## Summary by cubic\nUpgrade `bevy` from 0.19.0 to 0.19.1 to pick up upstream rendering fixes\nand improved clipboard support (including Wayland). Old behavior\nincluded occasional 2D flicker and SSAO inaccuracies; new behavior\naddresses these and adjusts cursor grab fallback to None on unsupported\nplatforms. No application code changes.\n\n- Review/QA: smoke test 2D and 3D rendering (SSAO, shaders), verify\nmouse capture behavior on Windows/Linux due to the cursor grab fallback\nchange, and verify clipboard operations; `bevy_clipboard` now uses\n`arboard` with `wl-clipboard-rs`/`clipboard-win`, adding new transitive\ndependencies but no migrations.\n\n<sup>Written for commit 7f4b2d27ebac4d2bee885c47d2d5ded4e7e57752.\nSummary will update on new commits.</sup>\n\n<a\nhref=\"https://cubic.dev/pr/andymai/elevator-core/pull/945?utm_source=github\"\ntarget=\"_blank\" rel=\"noopener noreferrer\"\ndata-no-image-dialog=\"true\"><picture><source\nmedia=\"(prefers-color-scheme: dark)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"><source\nmedia=\"(prefers-color-scheme: light)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-light.svg\"><img\nalt=\"Review in cubic\"\nsrc=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"></picture></a>\n\n<!-- End of auto-generated description by cubic. -->\n\nSigned-off-by: dependabot[bot] <support@github.com>\nCo-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>",
          "timestamp": "2026-08-17T19:35:08Z",
          "url": "https://github.com/andymai/elevator-core/commit/414472313148d98b82fa77462ce5b3a2fdb3ce75"
        },
        "date": 1787214227690,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 3698995,
            "range": "± 3558",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 589354,
            "range": "± 3380",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 632061,
            "range": "± 2017",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 703059,
            "range": "± 2273",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 549633,
            "range": "± 4251",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 37114,
            "range": "± 2071",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 8689,
            "range": "± 1258",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3359729,
            "range": "± 10981",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15340531,
            "range": "± 50445",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 563335,
            "range": "± 3814",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1851340,
            "range": "± 10743",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 9231756,
            "range": "± 18135",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 269308,
            "range": "± 2761",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1793473,
            "range": "± 13333",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 8901151,
            "range": "± 20732",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 257618,
            "range": "± 3293",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1751083,
            "range": "± 5843",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8687961,
            "range": "± 24527",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 256062,
            "range": "± 780",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1760124,
            "range": "± 8699",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8706767,
            "range": "± 32252",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 250567,
            "range": "± 5353",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1798746,
            "range": "± 8093",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 8878627,
            "range": "± 35594",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 238764,
            "range": "± 2339",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 4796,
            "range": "± 1146",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 4813,
            "range": "± 2726",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 4973,
            "range": "± 1063",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4543,
            "range": "± 767",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 22918,
            "range": "± 3133",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3120305,
            "range": "± 3992",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3119975,
            "range": "± 8825",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 6686,
            "range": "± 3185",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 20946,
            "range": "± 6959",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 9630,
            "range": "± 6894",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 107087,
            "range": "± 13064",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 18866,
            "range": "± 3950",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 1131857,
            "range": "± 57670",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 111395,
            "range": "± 18550",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 17424,
            "range": "± 4384",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 1027353,
            "range": "± 45729",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 106677,
            "range": "± 13382",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 19872,
            "range": "± 5696",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 5807886791,
            "range": "± 26266644",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 76548444,
            "range": "± 164935",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 17645479,
            "range": "± 218563",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 59120226,
            "range": "± 57993",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 8460748,
            "range": "± 86982",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 34018,
            "range": "± 1861",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 15293,
            "range": "± 1003",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 6391,
            "range": "± 568",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 204171,
            "range": "± 17874",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 193456,
            "range": "± 4438",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 129364,
            "range": "± 3276",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "name": "dependabot[bot]",
            "username": "dependabot[bot]",
            "email": "49699333+dependabot[bot]@users.noreply.github.com"
          },
          "committer": {
            "name": "GitHub",
            "username": "web-flow",
            "email": "noreply@github.com"
          },
          "id": "414472313148d98b82fa77462ce5b3a2fdb3ce75",
          "message": "chore(deps): bump bevy from 0.19.0 to 0.19.1 (#945)\n\nBumps [bevy](https://github.com/bevyengine/bevy) from 0.19.0 to 0.19.1.\n<details>\n<summary>Release notes</summary>\n<p><em>Sourced from <a\nhref=\"https://github.com/bevyengine/bevy/releases\">bevy's\nreleases</a>.</em></p>\n<blockquote>\n<h2>v0.19.1</h2>\n<p>A full diff of what's in this release can be seen here: <a\nhref=\"https://github.com/bevyengine/bevy/compare/v0.19.0...v0.19.1\">https://github.com/bevyengine/bevy/compare/v0.19.0...v0.19.1</a></p>\n</blockquote>\n</details>\n<details>\n<summary>Commits</summary>\n<ul>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/b56fc29d3016e641754765244b5ba3f9cc504671\"><code>b56fc29</code></a>\nRelease Bevy 0.19.1</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/5fb708a18388d97861d0d6dbeadc20e268c33d1c\"><code>5fb708a</code></a>\nFix normalization in SSAO calculation (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25334\">#25334</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/201c54be145a285f2f443cea750a3390d5c71370\"><code>201c54b</code></a>\nFix documented despawn lifecycle event order (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25367\">#25367</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/9b7e4b6d99930b017c60ea1d1e50d203538ecc46\"><code>9b7e4b6</code></a>\nadd &quot;wayland-data-control&quot; feature to arboard, if\n&quot;wayland&quot; feature set (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25361\">#25361</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/68f37ac770aecbfca7d988d74e9a0fe32f18c3ff\"><code>68f37ac</code></a>\nFix incorrect <code>textureGather</code> argument in SSAO (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25338\">#25338</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/5760205066040557ee2d4022f0f3227b8c5aed70\"><code>5760205</code></a>\nFix 2D flicker by always dequeueing retained phase items (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25163\">#25163</a>)\n(<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25253\">#25253</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/d16240d5255a8ffa6d40a3d04176373ae333acce\"><code>d16240d</code></a>\nFix shader out of bounds accesses (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25252\">#25252</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/56b2faf4fc5870be1ca07e73949092e11afee8fa\"><code>56b2faf</code></a>\nProperly layer emission under clearcoat (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25256\">#25256</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/a1632f4e8598653b73adc0c1b12006d231693cb9\"><code>a1632f4</code></a>\nFix <code>binding_arrays_are_usable</code> check (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25261\">#25261</a>)</li>\n<li><a\nhref=\"https://github.com/bevyengine/bevy/commit/101149f8ce3cc211a2f2f31501fd09a7d4908e94\"><code>101149f</code></a>\nUse <code>None</code> instead of <code>Confined</code> fallback for\n<code>CursorGrabMode</code> (<a\nhref=\"https://redirect.github.com/bevyengine/bevy/issues/25273\">#25273</a>)</li>\n<li>Additional commits viewable in <a\nhref=\"https://github.com/bevyengine/bevy/compare/v0.19.0...v0.19.1\">compare\nview</a></li>\n</ul>\n</details>\n<br />\n\n\n[![Dependabot compatibility\nscore](https://dependabot-badges.githubapp.com/badges/compatibility_score?dependency-name=bevy&package-manager=cargo&previous-version=0.19.0&new-version=0.19.1)](https://docs.github.com/en/github/managing-security-vulnerabilities/about-dependabot-security-updates#about-compatibility-scores)\n\nDependabot will resolve any conflicts with this PR as long as you don't\nalter it yourself. You can also trigger a rebase manually by commenting\n`@dependabot rebase`.\n\n[//]: # (dependabot-automerge-start)\n[//]: # (dependabot-automerge-end)\n\n---\n\n<details>\n<summary>Dependabot commands and options</summary>\n<br />\n\nYou can trigger Dependabot actions by commenting on this PR:\n- `@dependabot rebase` will rebase this PR\n- `@dependabot recreate` will recreate this PR, overwriting any edits\nthat have been made to it\n- `@dependabot show <dependency name> ignore conditions` will show all\nof the ignore conditions of the specified dependency\n- `@dependabot ignore this major version` will close this PR and stop\nDependabot creating any more for this major version (unless you reopen\nthe PR or upgrade to it yourself)\n- `@dependabot ignore this minor version` will close this PR and stop\nDependabot creating any more for this minor version (unless you reopen\nthe PR or upgrade to it yourself)\n- `@dependabot ignore this dependency` will close this PR and stop\nDependabot creating any more for this dependency (unless you reopen the\nPR or upgrade to it yourself)\n\n\n</details>\n\n<!-- This is an auto-generated description by cubic. -->\n---\n## Summary by cubic\nUpgrade `bevy` from 0.19.0 to 0.19.1 to pick up upstream rendering fixes\nand improved clipboard support (including Wayland). Old behavior\nincluded occasional 2D flicker and SSAO inaccuracies; new behavior\naddresses these and adjusts cursor grab fallback to None on unsupported\nplatforms. No application code changes.\n\n- Review/QA: smoke test 2D and 3D rendering (SSAO, shaders), verify\nmouse capture behavior on Windows/Linux due to the cursor grab fallback\nchange, and verify clipboard operations; `bevy_clipboard` now uses\n`arboard` with `wl-clipboard-rs`/`clipboard-win`, adding new transitive\ndependencies but no migrations.\n\n<sup>Written for commit 7f4b2d27ebac4d2bee885c47d2d5ded4e7e57752.\nSummary will update on new commits.</sup>\n\n<a\nhref=\"https://cubic.dev/pr/andymai/elevator-core/pull/945?utm_source=github\"\ntarget=\"_blank\" rel=\"noopener noreferrer\"\ndata-no-image-dialog=\"true\"><picture><source\nmedia=\"(prefers-color-scheme: dark)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"><source\nmedia=\"(prefers-color-scheme: light)\"\nsrcset=\"https://www.cubic.dev/buttons/review-in-cubic-light.svg\"><img\nalt=\"Review in cubic\"\nsrc=\"https://www.cubic.dev/buttons/review-in-cubic-dark.svg\"></picture></a>\n\n<!-- End of auto-generated description by cubic. -->\n\nSigned-off-by: dependabot[bot] <support@github.com>\nCo-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>",
          "timestamp": "2026-08-17T19:35:08Z",
          "url": "https://github.com/andymai/elevator-core/commit/414472313148d98b82fa77462ce5b3a2fdb3ce75"
        },
        "date": 1787300684605,
        "tool": "cargo",
        "benches": [
          {
            "name": "calibration/fixed_workload",
            "value": 4108705,
            "range": "± 15462",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/10_groups",
            "value": 572342,
            "range": "± 1694",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/1_groups",
            "value": 607059,
            "range": "± 1516",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/20_groups",
            "value": 693198,
            "range": "± 4075",
            "unit": "ns/iter"
          },
          {
            "name": "cross_group_routing/5_groups",
            "value": 528783,
            "range": "± 1516",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/10e_50s",
            "value": 35014,
            "range": "± 4874",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch/3e_10s",
            "value": 7727,
            "range": "± 550",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_20e_50s",
            "value": 3244796,
            "range": "± 9302",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_50e_200s",
            "value": 15365673,
            "range": "± 62169",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/destination_5e_10s",
            "value": 509879,
            "range": "± 1629",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_20e_50s",
            "value": 1865049,
            "range": "± 3566",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_50e_200s",
            "value": 9497329,
            "range": "± 54995",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/etd_5e_10s",
            "value": 250976,
            "range": "± 1765",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_20e_50s",
            "value": 1819151,
            "range": "± 9650",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_50e_200s",
            "value": 9197681,
            "range": "± 57965",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/look_5e_10s",
            "value": 246086,
            "range": "± 1040",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_20e_50s",
            "value": 1755017,
            "range": "± 5965",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_50e_200s",
            "value": 8968221,
            "range": "± 77006",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/nearest_car_5e_10s",
            "value": 239225,
            "range": "± 1022",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_20e_50s",
            "value": 1783459,
            "range": "± 17210",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_50e_200s",
            "value": 8944809,
            "range": "± 61891",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/rsr_5e_10s",
            "value": 238139,
            "range": "± 2698",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_20e_50s",
            "value": 1812588,
            "range": "± 8350",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_50e_200s",
            "value": 9131154,
            "range": "± 24594",
            "unit": "ns/iter"
          },
          {
            "name": "dispatch_comparison/scan_5e_10s",
            "value": 219445,
            "range": "± 2115",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_line",
            "value": 4709,
            "range": "± 4262",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/add_stop_to_line",
            "value": 4122,
            "range": "± 791",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/assign_line_to_group",
            "value": 4714,
            "range": "± 674",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/remove_line",
            "value": 4831,
            "range": "± 2856",
            "unit": "ns/iter"
          },
          {
            "name": "dynamic_topology/topology_rebuild",
            "value": 20823,
            "range": "± 4057",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/multi_3g_2l_5e_20s",
            "value": 3060510,
            "range": "± 9782",
            "unit": "ns/iter"
          },
          {
            "name": "multi_group_step/single_30e_50s_baseline",
            "value": 3197701,
            "range": "± 13925",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/10_elevators",
            "value": 6709,
            "range": "± 7172",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/200_elevators",
            "value": 18688,
            "range": "± 1423",
            "unit": "ns/iter"
          },
          {
            "name": "query_elevators/50_elevators",
            "value": 8925,
            "range": "± 2440",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/1000_riders",
            "value": 95156,
            "range": "± 1461",
            "unit": "ns/iter"
          },
          {
            "name": "query_optional/100_riders",
            "value": 17962,
            "range": "± 2501",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/10000_riders",
            "value": 887061,
            "range": "± 12459",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/1000_riders",
            "value": 91980,
            "range": "± 2212",
            "unit": "ns/iter"
          },
          {
            "name": "query_riders/100_riders",
            "value": 15122,
            "range": "± 2849",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/10000_entities",
            "value": 905039,
            "range": "± 15199",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/1000_entities",
            "value": 96407,
            "range": "± 14424",
            "unit": "ns/iter"
          },
          {
            "name": "query_tuple/100_entities",
            "value": 17552,
            "range": "± 2615",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_extreme/500e_5000s_50000r_10ticks",
            "value": 5582286974,
            "range": "± 30607922",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_realistic/50e_200s_2000r_100ticks",
            "value": 82077941,
            "range": "± 343203",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/realistic_up_peak_300r_100ticks",
            "value": 18445934,
            "range": "± 22638",
            "unit": "ns/iter"
          },
          {
            "name": "scaling_shanghai_tower/stress_2000r_100ticks",
            "value": 60065739,
            "range": "± 77049",
            "unit": "ns/iter"
          },
          {
            "name": "spawn_pressure/10k_spawns",
            "value": 7895833,
            "range": "± 20700",
            "unit": "ns/iter"
          },
          {
            "name": "step/100_riders",
            "value": 32577,
            "range": "± 616",
            "unit": "ns/iter"
          },
          {
            "name": "step/10_riders",
            "value": 13919,
            "range": "± 218",
            "unit": "ns/iter"
          },
          {
            "name": "step/1_riders",
            "value": 5592,
            "range": "± 258",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/reachable_stops_from",
            "value": 180086,
            "range": "± 7754",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/shortest_route",
            "value": 173702,
            "range": "± 7012",
            "unit": "ns/iter"
          },
          {
            "name": "topology_queries/transfer_points",
            "value": 124181,
            "range": "± 28309",
            "unit": "ns/iter"
          }
        ]
      }
    ]
  }
}