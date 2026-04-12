/// Component for a stop entity.
#[derive(Debug, Clone)]
pub struct StopData {
    /// Human-readable stop name.
    pub name: String,
    /// Absolute position along the shaft axis.
    pub position: f64,
}
