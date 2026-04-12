---
name: elevator-sim-core optimizer conventions
description: Non-obvious patterns in elevator-sim-core that affect simplification decisions
type: project
---

The tag-update Vecs in `systems/metrics.rs` exist because `world` is borrowed immutably inside the event loop, preventing `world.resource_mut::<MetricTags>()` until after iteration ends. This is a borrow-checker constraint, not over-engineering — the buffering Vecs are load-bearing.

**Why:** Rust borrow checker: `world.rider(*rider)` inside the event loop takes a shared borrow; calling `world.resource_mut` in the same loop would require a mutable borrow simultaneously.

**How to apply:** Do not try to fold tag updates into the event loop itself. The two-phase pattern (collect, then apply) is intentional and required.
