//! Dynamic topology mutation and queries.
//!
//! Add/remove/reassign lines, elevators, stops, and groups at runtime, plus
//! read-only topology queries (reachability, shortest route, transfer
//! points). Split out from `sim.rs` to keep each concern readable.

use crate::components::Route;
use crate::components::{Elevator, ElevatorPhase, Line, Position, Stop, Velocity};
use crate::dispatch::{BuiltinStrategy, DispatchStrategy, ElevatorGroup, LineInfo};
use crate::door::DoorState;
use crate::entity::EntityId;
use crate::error::SimError;
use crate::events::Event;
use crate::ids::GroupId;
use crate::topology::TopologyGraph;

use super::{ElevatorParams, LineParams, Simulation};

impl Simulation {
    // ── Dynamic topology ────────────────────────────────────────────

    /// Mark the topology graph dirty so it is rebuilt on next query.
    pub(super) fn mark_topo_dirty(&self) {
        if let Ok(mut g) = self.topo_graph.lock() {
            g.mark_dirty();
        }
    }

    /// Find the (`group_index`, `line_index`) for a line entity.
    pub(super) fn find_line(&self, line: EntityId) -> Result<(usize, usize), SimError> {
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
        self.groups[group_idx].lines_mut()[line_idx]
            .serves_mut()
            .push(eid);

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

        let eid = self.world.spawn();
        self.world.set_position(
            eid,
            Position {
                value: starting_position,
            },
        );
        self.world.set_velocity(eid, Velocity { value: 0.0 });
        self.world.set_elevator(
            eid,
            Elevator {
                phase: ElevatorPhase::Idle,
                door: DoorState::Closed,
                max_speed: params.max_speed,
                acceleration: params.acceleration,
                deceleration: params.deceleration,
                weight_capacity: params.weight_capacity,
                current_load: 0.0,
                riders: Vec::new(),
                target_stop: None,
                door_transition_ticks: params.door_transition_ticks,
                door_open_ticks: params.door_open_ticks,
                line,
                repositioning: false,
                restricted_stops: params.restricted_stops.clone(),
                inspection_speed_factor: params.inspection_speed_factor,
                going_up: true,
                going_down: true,
                move_count: 0,
                door_command_queue: Vec::new(),
            },
        );
        self.world
            .set_destination_queue(eid, crate::components::DestinationQueue::new());
        self.groups[group_idx].lines_mut()[line_idx]
            .elevators_mut()
            .push(eid);
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
    pub fn add_line(&mut self, params: &LineParams) -> Result<EntityId, SimError> {
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
                min_position: params.min_position,
                max_position: params.max_position,
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

        // Find and remove from group/line topology.
        let mut group_id = GroupId(0);
        if let Ok((group_idx, line_idx)) = self.find_line(line) {
            self.groups[group_idx].lines_mut()[line_idx]
                .elevators_mut()
                .retain(|&e| e != elevator);
            self.groups[group_idx].rebuild_caches();

            // Notify dispatch strategy.
            group_id = self.groups[group_idx].id();
            if let Some(dispatcher) = self.dispatchers.get_mut(&group_id) {
                dispatcher.notify_removed(elevator);
            }
        }

        self.events.emit(Event::ElevatorRemoved {
            elevator,
            line,
            group: group_id,
            tick: self.tick,
        });

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

        // Disable first to invalidate routes referencing this stop.
        let _ = self.disable(stop);

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
        }

        // Remove from all lines and groups.
        for group in &mut self.groups {
            for line_info in group.lines_mut() {
                line_info.serves_mut().retain(|&s| s != stop);
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

        self.dispatchers.insert(group_id, Box::new(dispatch));
        self.strategy_ids.insert(group_id, BuiltinStrategy::Scan);
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

        // Remove LineInfo from old group.
        let line_info = self.groups[old_group_idx].lines_mut().remove(line_idx);
        self.groups[old_group_idx].rebuild_caches();

        // Add LineInfo to new group.
        // Re-lookup new_group_idx since removal may have shifted indices
        // (only possible if old and new are different groups; if same group
        // the line_info was already removed above).
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

        let old_group_id = self.groups[old_group_idx].id();
        let new_group_id = self.groups[new_group_idx].id();

        self.groups[old_group_idx].lines_mut()[old_line_idx]
            .elevators_mut()
            .retain(|&e| e != elevator);
        self.groups[new_group_idx].lines_mut()[new_line_idx]
            .elevators_mut()
            .push(elevator);

        if let Some(car) = self.world.elevator_mut(elevator) {
            car.line = new_line;
        }

        self.groups[old_group_idx].rebuild_caches();
        if new_group_idx != old_group_idx {
            self.groups[new_group_idx].rebuild_caches();

            // Notify the old group's dispatcher so it clears per-elevator
            // state (ScanDispatch/LookDispatch track direction by
            // EntityId). Matches the symmetry with `remove_elevator`.
            if let Some(old_dispatcher) = self.dispatchers.get_mut(&old_group_id) {
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
        if !li.serves().contains(&stop) {
            li.serves_mut().push(stop);
        }

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

        self.groups[group_idx].lines_mut()[line_idx]
            .serves_mut()
            .retain(|&s| s != stop);

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
    pub(super) fn ensure_graph_built(&self) {
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
