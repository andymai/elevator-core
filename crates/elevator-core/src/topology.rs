//! Lazy-rebuilt connectivity graph for cross-line topology queries.
//!
//! [`TopologyGraph`] tracks which stops are reachable from which, via which
//! groups and lines.  It is rebuilt from [`ElevatorGroup`] data on demand
//! (when marked dirty) and supports BFS-based reachability, transfer-point
//! detection, and shortest-route computation.

use std::collections::hash_map::Entry;
use std::collections::{HashMap, HashSet, VecDeque};

use crate::components::route::{Route, RouteLeg, TransportMode};
use crate::dispatch::ElevatorGroup;
use crate::entity::EntityId;
use crate::ids::GroupId;

/// An edge in the topology graph connecting two stops.
#[derive(Debug, Clone)]
struct Edge {
    /// Destination stop entity.
    to: EntityId,
    /// Group that connects these stops.
    group: GroupId,
    /// Line within the group (retained for future per-line routing).
    #[allow(dead_code)]
    line: EntityId,
}

/// Lazy-rebuilt connectivity graph for topology queries.
///
/// Tracks which stops are reachable from which, via which groups/lines.
/// Rebuilt from [`ElevatorGroup`] data when marked dirty.
#[derive(Debug)]
pub struct TopologyGraph {
    /// Whether the graph needs rebuild.
    dirty: bool,
    /// stop -> Vec<Edge> adjacency list.
    adjacency: HashMap<EntityId, Vec<Edge>>,
}

impl TopologyGraph {
    /// Create a new topology graph (starts dirty so the first query triggers a rebuild).
    #[must_use]
    pub fn new() -> Self {
        Self {
            dirty: true,
            adjacency: HashMap::new(),
        }
    }

    /// Mark the graph as needing rebuild.
    pub const fn mark_dirty(&mut self) {
        self.dirty = true;
    }

    /// Whether the graph needs rebuild.
    #[must_use]
    pub const fn is_dirty(&self) -> bool {
        self.dirty
    }

    /// Rebuild the graph from current group/line topology.
    pub fn rebuild(&mut self, groups: &[ElevatorGroup]) {
        self.adjacency.clear();

        for group in groups {
            for line_info in group.lines() {
                // Every pair of stops served by a line is connected.
                for &from in line_info.serves() {
                    for &to in line_info.serves() {
                        if from != to {
                            self.adjacency.entry(from).or_default().push(Edge {
                                to,
                                group: group.id(),
                                line: line_info.entity(),
                            });
                        }
                    }
                }
            }
        }

        self.dirty = false;
    }

    /// All stops reachable from a given stop (BFS).
    ///
    /// Returns every reachable stop except the origin. If the origin has no
    /// outgoing edges the result is empty.
    #[must_use]
    pub fn reachable_stops_from(&self, stop: EntityId) -> Vec<EntityId> {
        let mut visited = HashSet::new();
        let mut queue = VecDeque::new();

        visited.insert(stop);
        queue.push_back(stop);

        while let Some(current) = queue.pop_front() {
            if let Some(edges) = self.adjacency.get(&current) {
                for edge in edges {
                    if visited.insert(edge.to) {
                        queue.push_back(edge.to);
                    }
                }
            }
        }

        // Remove the origin itself.
        visited.remove(&stop);
        visited.into_iter().collect()
    }

    /// Stops that appear in two or more groups (transfer points).
    ///
    /// This inspects group membership directly and does not require the
    /// adjacency graph.
    #[must_use]
    pub fn transfer_points(groups: &[ElevatorGroup]) -> Vec<EntityId> {
        let mut stop_groups: HashMap<EntityId, usize> = HashMap::new();
        for group in groups {
            for &stop in group.stop_entities() {
                *stop_groups.entry(stop).or_insert(0) += 1;
            }
        }
        stop_groups
            .into_iter()
            .filter(|&(_, count)| count >= 2)
            .map(|(stop, _)| stop)
            .collect()
    }

    /// Find the shortest route from one stop to another (BFS on groups).
    ///
    /// Returns `None` if `to` is unreachable from `from`, or if `from == to`.
    /// Each edge traversal becomes one [`RouteLeg`]; consecutive stops sharing
    /// the same group naturally coalesce into a single leg when the caller
    /// chooses to, but the raw path is returned as individual per-hop legs so
    /// the consumer can decide on merging strategy.
    #[must_use]
    pub fn shortest_route(&self, from: EntityId, to: EntityId) -> Option<Route> {
        if from == to {
            return None;
        }

        // BFS tracking the predecessor and the edge used to reach each node.
        let mut visited: HashMap<EntityId, (EntityId, GroupId)> = HashMap::new();
        let mut queue = VecDeque::new();

        queue.push_back(from);
        // Sentinel: from has no predecessor.
        visited.insert(from, (from, GroupId(u32::MAX)));

        while let Some(current) = queue.pop_front() {
            if current == to {
                break;
            }
            if let Some(edges) = self.adjacency.get(&current) {
                for edge in edges {
                    if let Entry::Vacant(e) = visited.entry(edge.to) {
                        e.insert((current, edge.group));
                        queue.push_back(edge.to);
                    }
                }
            }
        }

        // If `to` was never reached, return None.
        if !visited.contains_key(&to) {
            return None;
        }

        // Reconstruct the path from `to` back to `from`.
        let mut path: Vec<(EntityId, GroupId)> = Vec::new();
        let mut current = to;
        while current != from {
            let &(prev, group) = visited.get(&current)?;
            path.push((current, group));
            current = prev;
        }
        path.reverse();

        // Build legs from the path.
        let mut legs = Vec::with_capacity(path.len());
        let mut leg_from = from;
        for (stop, group) in path {
            legs.push(RouteLeg {
                from: leg_from,
                to: stop,
                via: TransportMode::Group(group),
            });
            leg_from = stop;
        }

        Some(Route {
            legs,
            current_leg: 0,
        })
    }
}

impl Default for TopologyGraph {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dispatch::LineInfo;
    use slotmap::KeyData;

    /// Create a deterministic `EntityId` from a raw index (for tests only).
    fn eid(n: u64) -> EntityId {
        EntityId::from(KeyData::from_ffi(n))
    }

    /// Helper to build a simple group with one line serving the given stops.
    fn group_with_line(
        group_id: u32,
        line_entity: EntityId,
        stops: Vec<EntityId>,
    ) -> ElevatorGroup {
        ElevatorGroup::new(
            GroupId(group_id),
            format!("Group {group_id}"),
            vec![LineInfo::new(line_entity, Vec::new(), stops)],
        )
    }

    #[test]
    fn rebuild_clears_dirty_flag() {
        let mut graph = TopologyGraph::new();
        assert!(graph.is_dirty());
        graph.rebuild(&[]);
        assert!(!graph.is_dirty());
    }

    #[test]
    fn mark_dirty_sets_flag() {
        let mut graph = TopologyGraph::new();
        graph.rebuild(&[]);
        graph.mark_dirty();
        assert!(graph.is_dirty());
    }

    #[test]
    fn reachable_within_single_line() {
        let a = eid(1);
        let b = eid(2);
        let c = eid(3);
        let line = eid(100);

        let groups = vec![group_with_line(0, line, vec![a, b, c])];
        let mut graph = TopologyGraph::new();
        graph.rebuild(&groups);

        let mut reachable = graph.reachable_stops_from(a);
        reachable.sort();
        let mut expected = vec![b, c];
        expected.sort();
        assert_eq!(reachable, expected);
    }

    #[test]
    fn reachable_across_groups_via_transfer() {
        let a = eid(1);
        let b = eid(2); // transfer point
        let c = eid(3);
        let line0 = eid(100);
        let line1 = eid(101);

        let groups = vec![
            group_with_line(0, line0, vec![a, b]),
            group_with_line(1, line1, vec![b, c]),
        ];
        let mut graph = TopologyGraph::new();
        graph.rebuild(&groups);

        let mut reachable = graph.reachable_stops_from(a);
        reachable.sort();
        let mut expected = vec![b, c];
        expected.sort();
        assert_eq!(reachable, expected);
    }

    #[test]
    fn unreachable_stop() {
        let a = eid(1);
        let b = eid(2);
        let c = eid(3);
        let line0 = eid(100);
        let line1 = eid(101);

        // Two disconnected groups, no shared stops.
        let groups = vec![
            group_with_line(0, line0, vec![a]),
            group_with_line(1, line1, vec![b, c]),
        ];
        let mut graph = TopologyGraph::new();
        graph.rebuild(&groups);

        let reachable = graph.reachable_stops_from(a);
        assert!(reachable.is_empty());
    }

    #[test]
    fn transfer_points_detected() {
        let a = eid(1);
        let b = eid(2);
        let c = eid(3);
        let line0 = eid(100);
        let line1 = eid(101);

        let groups = vec![
            group_with_line(0, line0, vec![a, b]),
            group_with_line(1, line1, vec![b, c]),
        ];

        let transfers = TopologyGraph::transfer_points(&groups);
        assert_eq!(transfers, vec![b]);
    }

    #[test]
    fn shortest_route_direct() {
        let a = eid(1);
        let b = eid(2);
        let line = eid(100);

        let groups = vec![group_with_line(0, line, vec![a, b])];
        let mut graph = TopologyGraph::new();
        graph.rebuild(&groups);

        let route = graph.shortest_route(a, b);
        assert!(route.is_some());
        let route = route.map_or_else(|| panic!("expected Some"), |r| r);
        assert_eq!(route.legs.len(), 1);
        assert_eq!(route.legs[0].from, a);
        assert_eq!(route.legs[0].to, b);
        assert_eq!(route.legs[0].via, TransportMode::Group(GroupId(0)));
    }

    #[test]
    fn shortest_route_with_transfer() {
        let a = eid(1);
        let b = eid(2);
        let c = eid(3);
        let line0 = eid(100);
        let line1 = eid(101);

        let groups = vec![
            group_with_line(0, line0, vec![a, b]),
            group_with_line(1, line1, vec![b, c]),
        ];
        let mut graph = TopologyGraph::new();
        graph.rebuild(&groups);

        let route = graph.shortest_route(a, c);
        assert!(route.is_some());
        let route = route.map_or_else(|| panic!("expected Some"), |r| r);
        assert_eq!(route.legs.len(), 2);
        assert_eq!(route.legs[0].from, a);
        assert_eq!(route.legs[0].to, b);
        assert_eq!(route.legs[0].via, TransportMode::Group(GroupId(0)));
        assert_eq!(route.legs[1].from, b);
        assert_eq!(route.legs[1].to, c);
        assert_eq!(route.legs[1].via, TransportMode::Group(GroupId(1)));
    }

    #[test]
    fn shortest_route_unreachable() {
        let a = eid(1);
        let b = eid(2);
        let line0 = eid(100);
        let line1 = eid(101);

        let groups = vec![
            group_with_line(0, line0, vec![a]),
            group_with_line(1, line1, vec![b]),
        ];
        let mut graph = TopologyGraph::new();
        graph.rebuild(&groups);

        assert!(graph.shortest_route(a, b).is_none());
    }

    #[test]
    fn shortest_route_same_stop() {
        let a = eid(1);
        let line = eid(100);

        let groups = vec![group_with_line(0, line, vec![a])];
        let mut graph = TopologyGraph::new();
        graph.rebuild(&groups);

        assert!(graph.shortest_route(a, a).is_none());
    }
}
