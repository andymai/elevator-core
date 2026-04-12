// New ECS-like architecture
pub mod components;
pub mod entity;
pub mod ids;
pub mod systems;
pub mod world;

// Compatibility layer (delegates to legacy fields during migration)
pub mod compat;

// Existing modules (kept during migration)
pub mod config;
pub mod dispatch;
pub mod door;
pub mod elevator;
pub mod events;
pub mod movement;
pub mod passenger;
pub mod sim;
pub mod stop;

#[cfg(test)]
mod tests;
