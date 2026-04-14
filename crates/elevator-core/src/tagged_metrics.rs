//! Tag-based per-entity metrics with string labels.
//!
//! Entities (riders, stops, elevators) can be tagged with arbitrary strings
//! like `"zone:lobby"`, `"priority:vip"`, `"floor:12"`. The metrics system
//! pre-computes per-tag accumulators each tick, enabling queries like
//! "what's the average wait time for zone:express?".

use crate::entity::EntityId;
use std::collections::HashMap;

/// Per-tag metric accumulator.
///
/// Tracks the same core metrics as the global [`Metrics`](crate::metrics::Metrics)
/// but scoped to entities sharing a specific tag.
#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
#[non_exhaustive]
pub struct TaggedMetric {
    /// Average wait time in ticks (spawn to board) for tagged riders.
    pub(crate) avg_wait_time: f64,
    /// Total riders delivered with this tag.
    pub(crate) total_delivered: u64,
    /// Total riders abandoned with this tag.
    pub(crate) total_abandoned: u64,
    /// Total riders spawned with this tag.
    pub(crate) total_spawned: u64,
    /// Maximum wait time observed for tagged riders.
    pub(crate) max_wait_time: u64,

    /// Internal accumulator: total wait ticks for boarded riders.
    sum_wait_ticks: u64,
    /// Internal accumulator: number of riders that have boarded.
    boarded_count: u64,
}

impl TaggedMetric {
    /// Average wait time in ticks (spawn to board).
    #[must_use]
    pub const fn avg_wait_time(&self) -> f64 {
        self.avg_wait_time
    }

    /// Total riders delivered with this tag.
    #[must_use]
    pub const fn total_delivered(&self) -> u64 {
        self.total_delivered
    }

    /// Total riders abandoned with this tag.
    #[must_use]
    pub const fn total_abandoned(&self) -> u64 {
        self.total_abandoned
    }

    /// Total riders spawned with this tag.
    #[must_use]
    pub const fn total_spawned(&self) -> u64 {
        self.total_spawned
    }

    /// Maximum wait time observed for tagged riders.
    #[must_use]
    pub const fn max_wait_time(&self) -> u64 {
        self.max_wait_time
    }

    /// Record a spawn event for this tag.
    pub(crate) const fn record_spawn(&mut self) {
        self.total_spawned += 1;
    }

    /// Record a board event with wait time.
    #[allow(clippy::cast_precision_loss)]
    pub(crate) fn record_board(&mut self, wait_ticks: u64) {
        self.boarded_count += 1;
        self.sum_wait_ticks += wait_ticks;
        self.avg_wait_time = self.sum_wait_ticks as f64 / self.boarded_count as f64;
        if wait_ticks > self.max_wait_time {
            self.max_wait_time = wait_ticks;
        }
    }

    /// Record a delivery event.
    pub(crate) const fn record_delivery(&mut self) {
        self.total_delivered += 1;
    }

    /// Record an abandonment event.
    pub(crate) const fn record_abandonment(&mut self) {
        self.total_abandoned += 1;
    }
}

/// Tag storage and per-tag metric accumulators.
///
/// Stored as a world resource. Entities can have multiple string tags;
/// metrics are pre-computed per tag each tick.
#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct MetricTags {
    /// Entity → tags mapping.
    entity_tags: HashMap<EntityId, Vec<String>>,
    /// Tag → accumulated metrics.
    tag_metrics: HashMap<String, TaggedMetric>,
}

impl MetricTags {
    /// Attach a tag to an entity. No-op if already tagged.
    pub fn tag(&mut self, id: EntityId, tag: impl Into<String>) {
        let tag = tag.into();
        let tags = self.entity_tags.entry(id).or_default();
        if !tags.contains(&tag) {
            tags.push(tag.clone());
            // Ensure the tag has an accumulator.
            self.tag_metrics.entry(tag).or_default();
        }
    }

    /// Remove a tag from an entity.
    pub fn untag(&mut self, id: EntityId, tag: &str) {
        if let Some(tags) = self.entity_tags.get_mut(&id) {
            tags.retain(|t| t != tag);
        }
    }

    /// Get all tags for an entity.
    #[must_use]
    pub fn tags_for(&self, id: EntityId) -> &[String] {
        self.entity_tags.get(&id).map_or(&[], Vec::as_slice)
    }

    /// Get the metric accumulator for a tag.
    #[must_use]
    pub fn metric(&self, tag: &str) -> Option<&TaggedMetric> {
        self.tag_metrics.get(tag)
    }

    /// Iterate all registered tags in deterministic (lexicographic) order.
    ///
    /// The internal storage is a `HashMap`, but this accessor sorts the
    /// keys so that repeated calls — and callers comparing output across
    /// runs — observe a stable order. O(n log n) in the number of tags;
    /// cheap in practice since tag counts are small.
    pub fn all_tags(&self) -> impl Iterator<Item = &str> {
        let mut tags: Vec<&str> = self.tag_metrics.keys().map(String::as_str).collect();
        tags.sort_unstable();
        tags.into_iter()
    }

    /// Call `f` on the metric accumulator for each tag attached to `entity`.
    fn for_each_tag(&mut self, entity: EntityId, mut f: impl FnMut(&mut TaggedMetric)) {
        let Some(tags) = self.entity_tags.get(&entity) else {
            return;
        };
        let tag_keys: Vec<&str> = tags.iter().map(String::as_str).collect();
        for tag in tag_keys {
            if let Some(m) = self.tag_metrics.get_mut(tag) {
                f(m);
            }
        }
    }

    /// Record a spawn event for all tags on the given entity.
    pub(crate) fn record_spawn(&mut self, entity: EntityId) {
        self.for_each_tag(entity, TaggedMetric::record_spawn);
    }

    /// Record a board event for all tags on the given entity.
    pub(crate) fn record_board(&mut self, entity: EntityId, wait_ticks: u64) {
        self.for_each_tag(entity, |m| m.record_board(wait_ticks));
    }

    /// Record a delivery event for all tags on the given entity.
    pub(crate) fn record_delivery(&mut self, entity: EntityId) {
        self.for_each_tag(entity, TaggedMetric::record_delivery);
    }

    /// Record an abandonment event for all tags on the given entity.
    pub(crate) fn record_abandonment(&mut self, entity: EntityId) {
        self.for_each_tag(entity, TaggedMetric::record_abandonment);
    }

    /// Remove all tags for a despawned entity.
    pub(crate) fn remove_entity(&mut self, id: EntityId) {
        self.entity_tags.remove(&id);
    }

    /// Remap all entity IDs using the provided mapping (for snapshot restore).
    pub(crate) fn remap_entity_ids(&mut self, remap: &HashMap<EntityId, EntityId>) {
        let old_tags: HashMap<EntityId, Vec<String>> = std::mem::take(&mut self.entity_tags);
        for (old_id, tags) in old_tags {
            let new_id = remap.get(&old_id).copied().unwrap_or(old_id);
            self.entity_tags.insert(new_id, tags);
        }
    }
}
