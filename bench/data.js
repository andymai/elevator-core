window.BENCHMARK_DATA = {
  "lastUpdate": 1784451622868,
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
      }
    ]
  }
}