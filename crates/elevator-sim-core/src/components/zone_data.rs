use crate::ids::GroupId;

/// Component marking an entity's group/zone membership.
#[derive(Debug, Clone)]
pub struct ZoneData {
    pub group: GroupId,
}
