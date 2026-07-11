#![allow(missing_docs, clippy::missing_docs_in_private_items)]

//! Runner-speed calibration bench.
//!
//! This measures nothing about elevator-core. Its only job is to give the
//! nightly regression filter a reading of how fast *this* CI runner is, so it
//! can divide the shared-runner speed factor back out of the real benches.
//!
//! The nightly baseline is a single frozen per-SHA measurement; when a later
//! nightly lands on a faster/slower instance of the `ubuntu-latest` pool
//! (~10-20% spread) every real bench reads as a uniform regression. Because
//! this workload contains no elevator-core code, a core change can never move
//! it — so `real_change / calibration_change` cancels the runner component
//! while leaving genuine per-bench regressions intact. See
//! `.github/scripts/filter-bench-regressions.py` and issues #907/#908/#913/
//! #914/#916.
//!
//! The workload walks a heap array sized to spill L1 so it tracks memory
//! throughput as well as raw clock, approximating the `SoA` `World` iteration
//! the query/dispatch benches are dominated by. Everything is fixed and
//! `black_box`-fenced so the measurement is stable across runs and the
//! optimizer can't fold it away.

use std::hint::black_box;

use criterion::{Criterion, criterion_group, criterion_main};

const LEN: usize = 64 * 1024;
const PASSES: usize = 64;

fn seeded_buffer() -> Vec<u64> {
    let mut buf = vec![0u64; LEN];
    let mut x = 0x9E37_79B9_7F4A_7C15_u64;
    for (i, slot) in buf.iter_mut().enumerate() {
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        *slot = x ^ (i as u64);
    }
    buf
}

fn calibration_workload(buf: &[u64]) -> u64 {
    let mut acc = 0u64;
    for _ in 0..PASSES {
        for &v in buf {
            acc = acc.wrapping_add(v).rotate_left(1) ^ v;
        }
    }
    acc
}

fn bench_calibration(c: &mut Criterion) {
    // Allocate + seed once, outside the timed loop, so the measurement is
    // dominated by the memory walk (runner throughput) rather than allocator
    // jitter.
    let buf = seeded_buffer();
    let mut group = c.benchmark_group("calibration");
    group.bench_function("fixed_workload", |b| {
        b.iter(|| black_box(calibration_workload(black_box(&buf))));
    });
    group.finish();
}

criterion_group!(benches, bench_calibration);
criterion_main!(benches);
