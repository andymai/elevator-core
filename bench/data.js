window.BENCHMARK_DATA = {
  "lastUpdate": 1784203949415,
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
      }
    ]
  }
}