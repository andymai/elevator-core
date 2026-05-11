//! Dynamic topology mutation and queries.
//!
//! Add/remove/reassign lines, elevators, stops, and groups at runtime, plus
//! read-only topology queries (reachability, shortest route, transfer
//! points). Split out from `sim.rs` to keep each concern readable.

use crate::components::Route;
use crate::components::{Elevator, ElevatorPhase, Line, LineKind, Position, Stop, Velocity};
use crate::dispatch::{BuiltinStrategy, DispatchStrategy, ElevatorGroup, LineInfo};
use crate::door::DoorState;
#[cfg(feature = "loop_lines")]
use crate::entity::ElevatorId;
use crate::entity::EntityId;
use crate::error::SimError;
use crate::events::Event;
use crate::ids::GroupId;
use crate::topology::TopologyGraph;

use super::{ElevatorParams, LineParams, Simulation};

/// Enforce `n_cars * min_headway <= circumference` for a Loop line.
///
/// `n_cars_after` is the post-operation car count (i.e. existing + 1
/// when attaching a new car). `op` names the operation in the error
/// message — e.g. `"attaching car"` or `"reassigning"` — so callers
/// surface the right context. No-op for Linear lines.
#[cfg(feature = "loop_lines")]
fn check_loop_capacity(line: &Line, n_cars_after: usize, op: &'static str) -> Result<(), SimError> {
    let LineKind::Loop {
        circumference,
        min_headway,
    } = *line.kind()
    else {
        return Ok(());
    };
    #[allow(
        clippy::cast_precision_loss,
        reason = "n_cars_after is bounded by usize; the comparison is against a finite f64"
    )]
    let required = (n_cars_after as f64) * min_headway;
    if required > circumference {
        return Err(SimError::InvalidConfig {
            field: "line.kind",
            reason: format!(
                "loop line: {op} would require {required} units of headway \
                 ({n_cars_after} cars × min_headway {min_headway}); \
                 exceeds circumference {circumference}",
            ),
        });
    }
    Ok(())
}

impl Simulation {
    // ── Dynamic topology ────────────────────────────────────────────

    /// Mark the topology graph dirty so it is rebuilt on next query.
    fn mark_topo_dirty(&self) {
        if let Ok(mut g) = self.topo_graph.lock() {
            g.mark_dirty();
        }
    }

    /// Find the (`group_index`, `line_index`) for a line entity.
    fn find_line(&self, line: EntityId) -> Result<(usize, usize), SimError> {
        self.groups
            .iter()
            .enumerate()
            .find_map(|(gi, g)| {
                g.lines()
                    .iter()
                    .position(|li| li.entity() == line)
                    .map(|li_idx| (gi, li_idx))
            })
            .ok_or(SimError::LineNotFound(line))
    }

    /// Add a new stop to a group at runtime. Returns its `EntityId`.
    ///
    /// Runtime-added stops have no `StopId` — they are identified purely
    /// by `EntityId`. The `stop_lookup` (config `StopId` → `EntityId`)
    /// is not updated.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::LineNotFound`] if the line entity does not exist.
    pub fn add_stop(
        &mut self,
        name: String,
        position: f64,
        line: EntityId,
    ) -> Result<EntityId, SimError> {
        if !position.is_finite() {
            return Err(SimError::InvalidConfig {
                field: "position",
                reason: format!(
                    "stop position must be finite (got {position}); NaN/±inf \
                     corrupt SortedStops ordering and find_stop_at_position lookup"
                ),
            });
        }

        let group_id = self
            .world
            .line(line)
            .map(|l| l.group)
            .ok_or(SimError::LineNotFound(line))?;

        let (group_idx, line_idx) = self.find_line(line)?;

        let eid = self.world.spawn();
        self.world.set_stop(eid, Stop { name, position });
        self.world.set_position(eid, Position { value: position });

        // Add to the line's serves list.
        self.groups[group_idx].lines_mut()[line_idx].add_stop(eid);

        // Add to the group's flat cache.
        self.groups[group_idx].push_stop(eid);

        // Maintain sorted-stops index for O(log n) PassingFloor detection.
        if let Some(sorted) = self.world.resource_mut::<crate::world::SortedStops>() {
            let idx = sorted.0.partition_point(|&(p, _)| p < position);
            sorted.0.insert(idx, (position, eid));
        }

        self.mark_topo_dirty();
        self.events.emit(Event::StopAdded {
            stop: eid,
            line,
            group: group_id,
            tick: self.tick,
        });
        Ok(eid)
    }

    /// Add a new elevator to a line at runtime. Returns its `EntityId`.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::LineNotFound`] if the line entity does not exist.
    pub fn add_elevator(
        &mut self,
        params: &ElevatorParams,
        line: EntityId,
        starting_position: f64,
    ) -> Result<EntityId, SimError> {
        // Reject malformed params before they reach the world. Without this,
        // zero/negative physics or zero door ticks crash later phases.
        super::construction::validate_elevator_physics(
            params.max_speed.value(),
            params.acceleration.value(),
            params.deceleration.value(),
            params.weight_capacity.value(),
            params.inspection_speed_factor,
            params.door_transition_ticks,
            params.door_open_ticks,
            params.bypass_load_up_pct,
            params.bypass_load_down_pct,
        )?;
        if !starting_position.is_finite() {
            return Err(SimError::InvalidConfig {
                field: "starting_position",
                reason: format!(
                    "must be finite (got {starting_position}); NaN/±inf corrupt \
                     SortedStops ordering and find_stop_at_position lookup"
                ),
            });
        }

        let group_id = self
            .world
            .line(line)
            .map(|l| l.group)
            .ok_or(SimError::LineNotFound(line))?;

        let (group_idx, line_idx) = self.find_line(line)?;

        // Enforce max_cars limit.
        if let Some(max) = self.world.line(line).and_then(Line::max_cars) {
            let current_count = self.groups[group_idx].lines()[line_idx].elevators().len();
            if current_count >= max {
                return Err(SimError::InvalidConfig {
                    field: "line.max_cars",
                    reason: format!("line already has {current_count} cars (max {max})"),
                });
            }
        }

        // Loop capacity guard: enforce `(n + 1) * min_headway <= circumference`
        // at car-attach time. `add_line` deliberately skips this check when
        // `max_cars = None`; this is where the deferred enforcement actually
        // runs, so a Loop line without a `max_cars` cap cannot silently
        // accept enough cars to violate the no-overtake invariant.
        #[cfg(feature = "loop_lines")]
        if let Some(line_ref) = self.world.line(line) {
            let n_after = self.groups[group_idx].lines()[line_idx].elevators().len() + 1;
            check_loop_capacity(line_ref, n_after, "attaching car")?;
        }

        let eid = self.world.spawn();
        self.world.set_position(
            eid,
            Position {
                value: starting_position,
            },
        );
        self.world.set_velocity(eid, Velocity { value: 0.0 });
        let is_loop = self.world.line(line).is_some_and(Line::is_loop);
        self.world.set_elevator(
            eid,
            Elevator {
                phase: ElevatorPhase::Idle,
                door: DoorState::Closed,
                max_speed: params.max_speed,
                acceleration: params.acceleration,
                deceleration: params.deceleration,
                weight_capacity: params.weight_capacity,
                current_load: crate::components::Weight::ZERO,
                riders: Vec::new(),
                target_stop: None,
                door_transition_ticks: params.door_transition_ticks,
                door_open_ticks: params.door_open_ticks,
                line,
                repositioning: false,
                restricted_stops: params.restricted_stops.clone(),
                inspection_speed_factor: params.inspection_speed_factor,
                going_up: !is_loop,
                going_down: !is_loop,
                going_forward: is_loop,
                move_count: 0,
                door_command_queue: Vec::new(),
                manual_target_velocity: None,
                bypass_load_up_pct: params.bypass_load_up_pct,
                bypass_load_down_pct: params.bypass_load_down_pct,
                home_stop: None,
            },
        );
        self.world
            .set_destination_queue(eid, crate::components::DestinationQueue::new());
        self.groups[group_idx].lines_mut()[line_idx].add_elevator(eid);
        self.groups[group_idx].push_elevator(eid);

        // Tag the elevator with its line's "line:{name}" tag.
        let line_name = self.world.line(line).map(|l| l.name.clone());
        if let Some(name) = line_name
            && let Some(tags) = self
                .world
                .resource_mut::<crate::tagged_metrics::MetricTags>()
        {
            tags.tag(eid, format!("line:{name}"));
        }

        self.mark_topo_dirty();
        self.events.emit(Event::ElevatorAdded {
            elevator: eid,
            line,
            group: group_id,
            tick: self.tick,
        });
        Ok(eid)
    }

    // ── Line / group topology ───────────────────────────────────────

    /// Add a new line to a group. Returns the line entity.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::GroupNotFound`] if the specified group does not exist.
    /// Returns [`SimError::InvalidConfig`] for malformed bounds —
    /// non-finite `min`/`max` or `min > max` on a `Linear` line, or
    /// non-finite / non-positive `circumference` on a `Loop` line. For
    /// `Loop` lines, also rejects `max_cars * min_headway > circumference`
    /// — without enough room around the loop for every car at full
    /// headway, the no-overtake invariant is unsatisfiable.
    pub fn add_line(&mut self, params: &LineParams) -> Result<EntityId, SimError> {
        // Resolve the requested kind; flat fields are the fallback only
        // when no explicit kind was provided. Validation runs against
        // the *resolved* kind so callers passing an explicit Loop don't
        // get a spurious flat-field complaint.
        let kind = params.kind.unwrap_or(LineKind::Linear {
            min: params.min_position,
            max: params.max_position,
        });
        kind.validate()
            .map_err(|(field, reason)| SimError::InvalidConfig { field, reason })?;

        // Loop-specific cross-field invariant — runtime mirror of the
        // check in `validate_explicit_topology`.
        //
        // Asymmetric with the config-time path on `max_cars = None`:
        // `validate_explicit_topology` falls back to `lc.elevators.len()`
        // because the config-time line-config bundles its elevators, but
        // a runtime-added line is always *empty* at this point — cars
        // attach later via `add_elevator`. The gap is closed there:
        // `add_elevator` re-evaluates `(n + 1) * min_headway <=
        // circumference` before each attach, so a line without a
        // `max_cars` cap still can't violate the no-overtake invariant.
        #[cfg(feature = "loop_lines")]
        if let LineKind::Loop {
            circumference,
            min_headway,
        } = kind
            && let Some(max_cars) = params.max_cars
            && max_cars > 0
        {
            #[allow(
                clippy::cast_precision_loss,
                reason = "max_cars is bounded by usize; the comparison is against a finite f64"
            )]
            let required = (max_cars as f64) * min_headway;
            if required > circumference {
                return Err(SimError::InvalidConfig {
                    field: "line.kind",
                    reason: format!(
                        "loop line: {max_cars} cars × min_headway {min_headway} = {required} \
                         exceeds circumference {circumference}",
                    ),
                });
            }
        }

        let group_id = params.group;
        let group = self
            .groups
            .iter_mut()
            .find(|g| g.id() == group_id)
            .ok_or(SimError::GroupNotFound(group_id))?;

        let line_tag = format!("line:{}", params.name);

        let eid = self.world.spawn();
        self.world.set_line(
            eid,
            Line {
                name: params.name.clone(),
                group: group_id,
                orientation: params.orientation,
                position: params.position,
                kind,
                max_cars: params.max_cars,
            },
        );

        group
            .lines_mut()
            .push(LineInfo::new(eid, Vec::new(), Vec::new()));

        // Tag the line entity with "line:{name}" for per-line metrics.
        if let Some(tags) = self
            .world
            .resource_mut::<crate::tagged_metrics::MetricTags>()
        {
            tags.tag(eid, line_tag);
        }

        self.mark_topo_dirty();
        self.events.emit(Event::LineAdded {
            line: eid,
            group: group_id,
            tick: self.tick,
        });
        Ok(eid)
    }

    /// Set the reachable position range of a line.
    ///
    /// Cars whose current position falls outside the new `[min, max]` are
    /// clamped to the boundary. Phase is left untouched — a car mid-travel
    /// keeps `MovingToStop` and the movement system reconciles on the
    /// next tick.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::LineNotFound`] if the line entity does not exist.
    /// Returns [`SimError::InvalidConfig`] if `min` or `max` is non-finite
    /// or `min > max`.
    pub fn set_line_range(&mut self, line: EntityId, min: f64, max: f64) -> Result<(), SimError> {
        if !min.is_finite() || !max.is_finite() {
            return Err(SimError::InvalidConfig {
                field: "line.range",
                reason: format!("min/max must be finite (got min={min}, max={max})"),
            });
        }
        if min > max {
            return Err(SimError::InvalidConfig {
                field: "line.range",
                reason: format!("min ({min}) must be <= max ({max})"),
            });
        }
        let line_ref = self
            .world
            .line_mut(line)
            .ok_or(SimError::LineNotFound(line))?;
        // `set_line_range` is a Linear-only operation; loops have no
        // endpoints to set. Reject early so callers don't silently mutate
        // the wrong field on a Loop line.
        match &mut line_ref.kind {
            LineKind::Linear {
                min: kmin,
                max: kmax,
            } => {
                *kmin = min;
                *kmax = max;
            }
            #[cfg(feature = "loop_lines")]
            LineKind::Loop { .. } => {
                return Err(SimError::InvalidConfig {
                    field: "line.range",
                    reason: "set_line_range is not valid on a Loop line; \
                            change circumference via a future API instead"
                        .to_string(),
                });
            }
        }

        // Clamp any cars on this line whose position falls outside the new range.
        let car_ids: Vec<EntityId> = self
            .world
            .iter_elevators()
            .filter_map(|(eid, _, car)| (car.line == line).then_some(eid))
            .collect();
        for eid in car_ids {
            // Skip cars without a Position component — clamping requires
            // a real reading, and writing velocity alone (without a
            // matching position update) would silently desync the two.
            let Some(pos) = self.world.position(eid).map(|p| p.value) else {
                continue;
            };
            if pos < min || pos > max {
                let clamped = pos.clamp(min, max);
                if let Some(p) = self.world.position_mut(eid) {
                    p.value = clamped;
                }
                if let Some(v) = self.world.velocity_mut(eid) {
                    v.value = 0.0;
                }
            }
        }

        self.mark_topo_dirty();
        Ok(())
    }

    /// Remove a line and all its elevators from the simulation.
    ///
    /// Elevators on the line are disabled (not despawned) so riders are
    /// properly ejected to the nearest stop.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::LineNotFound`] if the line entity is not found
    /// in any group.
    pub fn remove_line(&mut self, line: EntityId) -> Result<(), SimError> {
        let (group_idx, line_idx) = self.find_line(line)?;

        let group_id = self.groups[group_idx].id();

        // Collect elevator entities to disable.
        let elevator_ids: Vec<EntityId> = self.groups[group_idx].lines()[line_idx]
            .elevators()
            .to_vec();

        // Disable each elevator (ejects riders properly).
        for eid in &elevator_ids {
            // Ignore errors from already-disabled elevators.
            let _ = self.disable(*eid);
        }

        // Remove the LineInfo from the group.
        self.groups[group_idx].lines_mut().remove(line_idx);

        // Rebuild flat caches.
        self.groups[group_idx].rebuild_caches();

        // Remove Line component from world.
        self.world.remove_line(line);

        self.mark_topo_dirty();
        self.events.emit(Event::LineRemoved {
            line,
            group: group_id,
            tick: self.tick,
        });
        Ok(())
    }

    /// Remove an elevator from the simulation.
    ///
    /// The elevator is disabled first (ejecting any riders), then removed
    /// from its line and despawned from the world.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::EntityNotFound`] if the elevator does not exist.
    pub fn remove_elevator(&mut self, elevator: EntityId) -> Result<(), SimError> {
        let line = self
            .world
            .elevator(elevator)
            .ok_or(SimError::EntityNotFound(elevator))?
            .line();

        // Disable first to eject riders and reset state.
        let _ = self.disable(elevator);

        // Find and remove from group/line topology. If `find_line` fails
        // the elevator's `line` ref points at a removed/moved line — an
        // inconsistent state, but we still want to despawn for cleanup.
        //
        // The `disable` call above already fired `notify_removed` on the
        // group's dispatcher — the cache still includes the elevator at
        // that point — so no additional notify is needed here. Custom
        // `DispatchStrategy::notify_removed` impls that count invocations
        // (e.g. tests with an `AtomicUsize`) can assume exactly one call
        // per removal.
        let resolved_group: Option<GroupId> = match self.find_line(line) {
            Ok((group_idx, line_idx)) => {
                self.groups[group_idx].lines_mut()[line_idx].remove_elevator(elevator);
                self.groups[group_idx].rebuild_caches();
                Some(self.groups[group_idx].id())
            }
            Err(_) => None,
        };

        // Only emit ElevatorRemoved when we resolved the actual group.
        // Pre-fix this fired with `GroupId(0)` as a sentinel, masquerading
        // a dangling-line cleanup as a legitimate group-0 removal (#266).
        if let Some(group_id) = resolved_group {
            self.events.emit(Event::ElevatorRemoved {
                elevator,
                line,
                group: group_id,
                tick: self.tick,
            });
        }

        // Despawn from world.
        self.world.despawn(elevator);

        self.mark_topo_dirty();
        Ok(())
    }

    /// Remove a stop from the simulation.
    ///
    /// The stop is disabled first (invalidating routes that reference it),
    /// then removed from all lines and despawned from the world.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::EntityNotFound`] if the stop does not exist.
    pub fn remove_stop(&mut self, stop: EntityId) -> Result<(), SimError> {
        if self.world.stop(stop).is_none() {
            return Err(SimError::EntityNotFound(stop));
        }

        // Warn if resident riders exist at the stop before we disable it
        // (disabling will abandon them, clearing the residents index).
        let residents: Vec<EntityId> = self
            .rider_index
            .residents_at(stop)
            .iter()
            .copied()
            .collect();
        if !residents.is_empty() {
            self.events
                .emit(Event::ResidentsAtRemovedStop { stop, residents });
        }

        // Disable first to invalidate routes referencing this stop.
        // Use the stop-specific helper so route-invalidation events
        // carry `StopRemoved` rather than `StopDisabled`.
        self.disable_stop_inner(stop, true);
        self.world.disable(stop);
        self.events.emit(Event::EntityDisabled {
            entity: stop,
            tick: self.tick,
        });

        // Scrub references to the removed stop from every elevator so the
        // post-despawn tick loop does not chase a dead EntityId through
        // `target_stop`, the destination queue, or access-control checks.
        let elevator_ids: Vec<EntityId> =
            self.world.iter_elevators().map(|(eid, _, _)| eid).collect();
        for eid in elevator_ids {
            if let Some(car) = self.world.elevator_mut(eid) {
                if car.target_stop == Some(stop) {
                    car.target_stop = None;
                }
                car.restricted_stops.remove(&stop);
            }
            if let Some(q) = self.world.destination_queue_mut(eid) {
                q.retain(|s| s != stop);
            }
            // Drop any car-call whose floor is the removed stop. Built-in
            // strategies don't currently route on car_calls but the public
            // `sim.car_calls(car)` accessor and custom strategies (via
            // `car_calls_for`) would otherwise return dangling refs (#293).
            if let Some(calls) = self.world.car_calls_mut(eid) {
                calls.retain(|c| c.floor != stop);
            }
        }

        // Remove from all lines and groups.
        for group in &mut self.groups {
            for line_info in group.lines_mut() {
                line_info.remove_stop(stop);
            }
            group.rebuild_caches();
        }

        // Remove from SortedStops resource.
        if let Some(sorted) = self.world.resource_mut::<crate::world::SortedStops>() {
            sorted.0.retain(|&(_, s)| s != stop);
        }

        // Remove from stop_lookup.
        self.stop_lookup.retain(|_, &mut eid| eid != stop);

        self.events.emit(Event::StopRemoved {
            stop,
            tick: self.tick,
        });

        // Despawn from world.
        self.world.despawn(stop);

        // Rebuild the rider index to evict any stale per-stop entries
        // pointing at the despawned stop. Cheap (O(riders)) and the only
        // safe option once the stop EntityId is gone.
        self.rider_index.rebuild(&self.world);

        self.mark_topo_dirty();
        Ok(())
    }

    /// Create a new dispatch group. Returns the group ID.
    pub fn add_group(
        &mut self,
        name: impl Into<String>,
        dispatch: impl DispatchStrategy + 'static,
    ) -> GroupId {
        let next_id = self
            .groups
            .iter()
            .map(|g| g.id().0)
            .max()
            .map_or(0, |m| m + 1);
        let group_id = GroupId(next_id);

        self.groups
            .push(ElevatorGroup::new(group_id, name.into(), Vec::new()));

        self.dispatcher_set
            .insert(group_id, Box::new(dispatch), BuiltinStrategy::Scan);
        self.mark_topo_dirty();
        group_id
    }

    /// Reassign a line to a different group. Returns the old `GroupId`.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::LineNotFound`] if the line is not found in any group.
    /// Returns [`SimError::GroupNotFound`] if `new_group` does not exist.
    pub fn assign_line_to_group(
        &mut self,
        line: EntityId,
        new_group: GroupId,
    ) -> Result<GroupId, SimError> {
        let (old_group_idx, line_idx) = self.find_line(line)?;

        // Verify new group exists.
        if !self.groups.iter().any(|g| g.id() == new_group) {
            return Err(SimError::GroupNotFound(new_group));
        }

        let old_group_id = self.groups[old_group_idx].id();

        // Same-group reassign is a no-op. Skip BEFORE the notify_removed
        // calls or we'd needlessly clear each elevator's dispatcher state
        // (direction tracking in SCAN/LOOK, etc.) on a redundant move.
        // Matches the early-return pattern in `reassign_elevator_to_line`.
        if old_group_id == new_group {
            return Ok(old_group_id);
        }

        // Enforce group homogeneity: a Loop line cannot land in a group
        // with Linear members, and vice versa. The dispatch contract
        // (e.g. `LoopSweep` / `LoopSchedule` strategies) assumes every
        // line in their group is the same kind; mixing types silently
        // breaks both ranking and the headway clamp because the group's
        // strategy is single-typed.
        #[cfg(feature = "loop_lines")]
        if let Some(moved_is_loop) = self.world.line(line).map(Line::is_loop) {
            let new_group_idx = self
                .groups
                .iter()
                .position(|g| g.id() == new_group)
                .ok_or(SimError::GroupNotFound(new_group))?;
            let mismatch = self.groups[new_group_idx]
                .lines()
                .iter()
                .filter_map(|li| self.world.line(li.entity()))
                .any(|existing| existing.is_loop() != moved_is_loop);
            if mismatch {
                return Err(SimError::InvalidConfig {
                    field: "group.kind",
                    reason: format!(
                        "cannot mix Linear and Loop lines in the same group \
                         (moving line into group {new_group:?} would create a heterogeneous group)",
                    ),
                });
            }
        }

        // Notify the old dispatcher that these elevators are leaving — its
        // per-elevator state (e.g. ScanDispatch.direction keyed by EntityId)
        // would otherwise leak indefinitely as lines move between groups.
        // Mirrors the cleanup `reassign_elevator_to_line` already does. (#257)
        let elevators_to_notify: Vec<EntityId> = self.groups[old_group_idx].lines()[line_idx]
            .elevators()
            .to_vec();
        if let Some(dispatcher) = self.dispatcher_set.strategies_mut().get_mut(&old_group_id) {
            for eid in &elevators_to_notify {
                dispatcher.notify_removed(*eid);
            }
        }

        // Remove LineInfo from old group.
        let line_info = self.groups[old_group_idx].lines_mut().remove(line_idx);
        self.groups[old_group_idx].rebuild_caches();

        // Re-lookup new_group_idx by ID — we didn't capture it before the
        // mutation. (Removal of a `LineInfo` from a group's inner `lines`
        // vec doesn't shift `self.groups` indices, so this is purely about
        // not having stored the index earlier, not about index invalidation.)
        let new_group_idx = self
            .groups
            .iter()
            .position(|g| g.id() == new_group)
            .ok_or(SimError::GroupNotFound(new_group))?;
        self.groups[new_group_idx].lines_mut().push(line_info);
        self.groups[new_group_idx].rebuild_caches();

        // Update Line component's group field.
        if let Some(line_comp) = self.world.line_mut(line) {
            line_comp.group = new_group;
        }

        self.mark_topo_dirty();
        self.events.emit(Event::LineReassigned {
            line,
            old_group: old_group_id,
            new_group,
            tick: self.tick,
        });

        Ok(old_group_id)
    }

    /// Reassign an elevator to a different line (swing-car pattern).
    ///
    /// The elevator is moved from its current line to the target line.
    /// Both lines must be in the same group, or you must reassign the
    /// line first via [`assign_line_to_group`](Self::assign_line_to_group).
    ///
    /// # Errors
    ///
    /// Returns [`SimError::EntityNotFound`] if the elevator does not exist.
    /// Returns [`SimError::LineNotFound`] if the target line is not found in any group.
    pub fn reassign_elevator_to_line(
        &mut self,
        elevator: EntityId,
        new_line: EntityId,
    ) -> Result<(), SimError> {
        let old_line = self
            .world
            .elevator(elevator)
            .ok_or(SimError::EntityNotFound(elevator))?
            .line();

        if old_line == new_line {
            return Ok(());
        }

        // Validate both lines exist BEFORE mutating anything.
        let (old_group_idx, old_line_idx) = self.find_line(old_line)?;
        let (new_group_idx, new_line_idx) = self.find_line(new_line)?;

        // Enforce max_cars on target line.
        if let Some(max) = self.world.line(new_line).and_then(Line::max_cars) {
            let current_count = self.groups[new_group_idx].lines()[new_line_idx]
                .elevators()
                .len();
            if current_count >= max {
                return Err(SimError::InvalidConfig {
                    field: "line.max_cars",
                    reason: format!("target line already has {current_count} cars (max {max})"),
                });
            }
        }

        // Loop capacity guard: same `(n + 1) * min_headway <= circumference`
        // invariant `add_elevator` enforces. Without this, a swing
        // re-assignment can push a Loop line over its headway capacity.
        #[cfg(feature = "loop_lines")]
        if let Some(line_ref) = self.world.line(new_line) {
            let n_after = self.groups[new_group_idx].lines()[new_line_idx]
                .elevators()
                .len()
                + 1;
            check_loop_capacity(line_ref, n_after, "reassigning")?;
        }

        let old_group_id = self.groups[old_group_idx].id();
        let new_group_id = self.groups[new_group_idx].id();

        self.groups[old_group_idx].lines_mut()[old_line_idx].remove_elevator(elevator);
        self.groups[new_group_idx].lines_mut()[new_line_idx].add_elevator(elevator);

        if let Some(car) = self.world.elevator_mut(elevator) {
            car.line = new_line;
        }

        self.groups[old_group_idx].rebuild_caches();
        if new_group_idx != old_group_idx {
            self.groups[new_group_idx].rebuild_caches();

            // Notify the old group's dispatcher so it clears per-elevator
            // state (ScanDispatch/LookDispatch track direction by
            // EntityId). Matches the symmetry with `remove_elevator`.
            if let Some(old_dispatcher) =
                self.dispatcher_set.strategies_mut().get_mut(&old_group_id)
            {
                old_dispatcher.notify_removed(elevator);
            }
        }

        self.mark_topo_dirty();

        let _ = new_group_id; // reserved for symmetric notify_added once the trait gains one
        self.events.emit(Event::ElevatorReassigned {
            elevator,
            old_line,
            new_line,
            tick: self.tick,
        });

        Ok(())
    }

    /// Add a stop to a line's served stops.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::EntityNotFound`] if the stop does not exist.
    /// Returns [`SimError::LineNotFound`] if the line is not found in any group.
    pub fn add_stop_to_line(&mut self, stop: EntityId, line: EntityId) -> Result<(), SimError> {
        // Verify stop exists.
        if self.world.stop(stop).is_none() {
            return Err(SimError::EntityNotFound(stop));
        }

        let (group_idx, line_idx) = self.find_line(line)?;

        let li = &mut self.groups[group_idx].lines_mut()[line_idx];
        li.add_stop(stop);

        self.groups[group_idx].push_stop(stop);

        self.mark_topo_dirty();
        Ok(())
    }

    /// Remove a stop from a line's served stops.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::LineNotFound`] if the line is not found in any group.
    pub fn remove_stop_from_line(
        &mut self,
        stop: EntityId,
        line: EntityId,
    ) -> Result<(), SimError> {
        let (group_idx, line_idx) = self.find_line(line)?;

        self.groups[group_idx].lines_mut()[line_idx].remove_stop(stop);

        // Rebuild group's stop_entities from all lines.
        self.groups[group_idx].rebuild_caches();

        self.mark_topo_dirty();
        Ok(())
    }

    // ── Line / group queries ────────────────────────────────────────

    /// Get all line entities across all groups.
    #[must_use]
    pub fn all_lines(&self) -> Vec<EntityId> {
        self.groups
            .iter()
            .flat_map(|g| g.lines().iter().map(LineInfo::entity))
            .collect()
    }

    /// Number of lines in the simulation.
    #[must_use]
    pub fn line_count(&self) -> usize {
        self.groups.iter().map(|g| g.lines().len()).sum()
    }

    /// Get all line entities in a group.
    #[must_use]
    pub fn lines_in_group(&self, group: GroupId) -> Vec<EntityId> {
        self.groups
            .iter()
            .find(|g| g.id() == group)
            .map_or_else(Vec::new, |g| {
                g.lines().iter().map(LineInfo::entity).collect()
            })
    }

    /// Get elevator entities on a specific line.
    #[must_use]
    pub fn elevators_on_line(&self, line: EntityId) -> Vec<EntityId> {
        self.groups
            .iter()
            .flat_map(ElevatorGroup::lines)
            .find(|li| li.entity() == line)
            .map_or_else(Vec::new, |li| li.elevators().to_vec())
    }

    /// Get stop entities served by a specific line.
    #[must_use]
    pub fn stops_served_by_line(&self, line: EntityId) -> Vec<EntityId> {
        self.groups
            .iter()
            .flat_map(ElevatorGroup::lines)
            .find(|li| li.entity() == line)
            .map_or_else(Vec::new, |li| li.serves().to_vec())
    }

    /// Whether the given line has [`LineKind::Loop`] topology.
    ///
    /// Returns `false` for `Linear` lines, lines that don't exist, and
    /// any future topology that isn't a closed loop. Hosts that wire
    /// loop-aware rendering or dispatch should branch on this.
    #[must_use]
    pub fn is_loop(&self, line: EntityId) -> bool {
        self.world
            .line(line)
            .is_some_and(crate::components::Line::is_loop)
    }

    /// Total path length of a [`LineKind::Loop`] line.
    ///
    /// Returns `None` for `Linear` lines and for missing line entities.
    /// Hosts use this together with [`Self::is_loop`] to derive a
    /// rendering radius (e.g. `r = C / (2π)`) for circular layouts.
    #[must_use]
    pub fn loop_circumference(&self, line: EntityId) -> Option<f64> {
        self.world
            .line(line)
            .and_then(crate::components::Line::circumference)
    }

    /// On a [`LineKind::Loop`] line, the elevator that is immediately
    /// *ahead* of `elevator` in forward cyclic order — i.e. its leader.
    ///
    /// Returns `None` for:
    /// - `Linear` lines and missing entities
    /// - solo cars on a Loop (no other car to lead them)
    ///
    /// A sibling car at the same physical position is treated as a valid
    /// leader at `forward_distance = 0`; consumers that want a
    /// strictly-ahead car should filter on `loop_forward_gap > 0`.
    /// Useful for game-side UI (e.g. rendering coupled cars, "car ahead"
    /// indicators, or train-style platoon visualisations).
    #[cfg(feature = "loop_lines")]
    #[must_use]
    pub fn loop_leader(&self, elevator: ElevatorId) -> Option<ElevatorId> {
        let eid = elevator.entity();
        let car = self.world.elevator(eid)?;
        let line = car.line;
        let circumference = self.loop_circumference(line)?;
        let pos = self.world.position(eid)?.value;
        let leader_eid = self
            .world
            .iter_elevators()
            .filter(|&(other, _, other_car)| other != eid && other_car.line == line)
            .map(|(other, p, _)| {
                (
                    crate::components::cyclic::forward_distance(pos, p.value, circumference),
                    other,
                )
            })
            .min_by(|a, b| a.0.total_cmp(&b.0))
            .map(|(_, e)| e)?;
        Some(ElevatorId::from(leader_eid))
    }

    /// On a [`LineKind::Loop`] line, the forward cyclic gap from
    /// `elevator` to its [leader](Self::loop_leader).
    ///
    /// Returns `None` for Linear lines, missing entities, and solo cars.
    /// Always returns a value in `[0, circumference)` when `Some`;
    /// callers can compare against the line's `min_headway` to detect a
    /// car pressed up against the headway clamp (and therefore unable to
    /// advance regardless of throttle).
    #[cfg(feature = "loop_lines")]
    #[must_use]
    pub fn loop_forward_gap(&self, elevator: ElevatorId) -> Option<f64> {
        let eid = elevator.entity();
        let car = self.world.elevator(eid)?;
        let line = car.line;
        let circumference = self.loop_circumference(line)?;
        let pos = self.world.position(eid)?.value;
        let leader_eid = self.loop_leader(elevator)?.entity();
        let leader_pos = self.world.position(leader_eid)?.value;
        Some(crate::components::cyclic::forward_distance(
            pos,
            leader_pos,
            circumference,
        ))
    }

    /// On a [`LineKind::Loop`] line, the stop that comes immediately
    /// *after* `position` in forward cyclic order.
    ///
    /// Walks the line's served stops, computes the forward cyclic
    /// distance from `position` to each, and returns the one with the
    /// smallest non-zero distance. A stop coincident with `position`
    /// is treated as a "full lap ahead" — the caller already *is* at
    /// that stop, so the next forward stop is what they want.
    ///
    /// Returns `None` if the line is not a Loop, the line entity is
    /// unknown, the line serves no stops, or `position` is non-finite.
    /// Non-finite `position` is rejected up front because
    /// [`forward_distance`](crate::components::cyclic::forward_distance)
    /// is documented to return `0.0` on non-finite inputs — without the
    /// guard, every served stop would tie at `d = circumference` and
    /// the first one in the list would be returned as a valid-looking
    /// `EntityId` despite the input being meaningless.
    #[must_use]
    pub fn loop_next_stop(&self, line: EntityId, position: f64) -> Option<EntityId> {
        let circumference = self.loop_circumference(line)?;
        let stops = self.stops_served_by_line(line);
        crate::dispatch::loop_next_stop_forward(&self.world, circumference, &stops, position)
    }

    /// Find the stop at `position` that's served by `line`.
    ///
    /// Disambiguates the case where two stops on different lines share
    /// the same physical position (e.g. parallel shafts at the same
    /// floor, or a sky-lobby served by both a low and high bank). The
    /// global [`World::find_stop_at_position`](crate::world::World::find_stop_at_position)
    /// returns whichever stop wins the linear scan; this variant
    /// scopes the lookup to the line's `serves` list so consumers
    /// always get the stop *on the line they asked about*.
    ///
    /// Returns `None` if the line doesn't exist or no served stop
    /// matches the position.
    #[must_use]
    pub fn find_stop_at_position_on_line(&self, position: f64, line: EntityId) -> Option<EntityId> {
        let line_info = self
            .groups
            .iter()
            .flat_map(ElevatorGroup::lines)
            .find(|li| li.entity() == line)?;
        self.world
            .find_stop_at_position_in(position, line_info.serves())
    }

    /// Get the line entity for an elevator.
    #[must_use]
    pub fn line_for_elevator(&self, elevator: EntityId) -> Option<EntityId> {
        self.groups
            .iter()
            .flat_map(ElevatorGroup::lines)
            .find(|li| li.elevators().contains(&elevator))
            .map(LineInfo::entity)
    }

    /// Iterate over elevators currently repositioning.
    pub fn iter_repositioning_elevators(&self) -> impl Iterator<Item = EntityId> + '_ {
        self.world
            .iter_elevators()
            .filter_map(|(id, _pos, car)| if car.repositioning() { Some(id) } else { None })
    }

    /// Get all line entities that serve a given stop.
    #[must_use]
    pub fn lines_serving_stop(&self, stop: EntityId) -> Vec<EntityId> {
        self.groups
            .iter()
            .flat_map(ElevatorGroup::lines)
            .filter(|li| li.serves().contains(&stop))
            .map(LineInfo::entity)
            .collect()
    }

    /// Get all group IDs that serve a given stop.
    #[must_use]
    pub fn groups_serving_stop(&self, stop: EntityId) -> Vec<GroupId> {
        self.groups
            .iter()
            .filter(|g| g.stop_entities().contains(&stop))
            .map(ElevatorGroup::id)
            .collect()
    }

    // ── Topology queries ─────────────────────────────────────────────

    /// Rebuild the topology graph if any mutation has invalidated it.
    fn ensure_graph_built(&self) {
        if let Ok(mut graph) = self.topo_graph.lock()
            && graph.is_dirty()
        {
            graph.rebuild(&self.groups);
        }
    }

    /// All stops reachable from a given stop through the line/group topology.
    pub fn reachable_stops_from(&self, stop: EntityId) -> Vec<EntityId> {
        self.ensure_graph_built();
        self.topo_graph
            .lock()
            .map_or_else(|_| Vec::new(), |g| g.reachable_stops_from(stop))
    }

    /// Stops that serve as transfer points between groups.
    pub fn transfer_points(&self) -> Vec<EntityId> {
        self.ensure_graph_built();
        TopologyGraph::transfer_points(&self.groups)
    }

    /// Find the shortest route between two stops, possibly spanning multiple groups.
    pub fn shortest_route(&self, from: EntityId, to: EntityId) -> Option<Route> {
        self.ensure_graph_built();
        self.topo_graph
            .lock()
            .ok()
            .and_then(|g| g.shortest_route(from, to))
    }
}
