//! Per-entity metric tag assignment.
//!
//! Part of the [`super::Simulation`] API surface; extracted from the
//! monolithic `sim.rs` for readability. See the parent module for the
//! overarching essential-API summary.

use crate::entity::EntityId;
use crate::error::SimError;

impl super::Simulation {
    // ── Tagging ──────────────────────────────────────────────────────

    /// Attach a metric tag to an entity (rider, stop, elevator, etc.).
    ///
    /// Tags enable per-tag metric breakdowns. An entity can have multiple tags.
    /// Riders automatically inherit tags from their origin stop when spawned.
    ///
    /// # Errors
    ///
    /// Returns [`SimError::EntityNotFound`] if the entity does not exist in
    /// the world.
    pub fn tag_entity(&mut self, id: EntityId, tag: impl Into<String>) -> Result<(), SimError> {
        if !self.world.is_alive(id) {
            return Err(SimError::EntityNotFound(id));
        }
        if let Some(tags) = self
            .world
            .resource_mut::<crate::tagged_metrics::MetricTags>()
        {
            tags.tag(id, tag);
        }
        Ok(())
    }

    /// Remove a metric tag from an entity.
    pub fn untag_entity(&mut self, id: EntityId, tag: &str) {
        if let Some(tags) = self
            .world
            .resource_mut::<crate::tagged_metrics::MetricTags>()
        {
            tags.untag(id, tag);
        }
    }

    /// Query the metric accumulator for a specific tag.
    #[must_use]
    pub fn metrics_for_tag(&self, tag: &str) -> Option<&crate::tagged_metrics::TaggedMetric> {
        self.world
            .resource::<crate::tagged_metrics::MetricTags>()
            .and_then(|tags| tags.metric(tag))
    }

    /// List all registered metric tags.
    pub fn all_tags(&self) -> Vec<&str> {
        self.world
            .resource::<crate::tagged_metrics::MetricTags>()
            .map_or_else(Vec::new, |tags| tags.all_tags().collect())
    }
}
