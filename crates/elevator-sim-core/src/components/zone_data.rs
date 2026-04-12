use crate::ids::GroupId;

/// Component marking an entity's group/zone membership.
#[derive(Debug, Clone)]
pub struct ZoneData {
    /// The group this entity belongs to.
    pub group: GroupId,
}
