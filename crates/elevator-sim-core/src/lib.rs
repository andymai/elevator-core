// New ECS-like architecture
pub mod components;
pub mod entity;
pub mod ids;
pub mod systems;
pub mod world;

// Core modules
pub mod config;
pub mod dispatch;
pub mod door;
pub mod events;
pub mod metrics;
pub mod movement;
pub mod scenario;
pub mod sim;
pub mod stop;
pub mod traffic;

#[cfg(test)]
mod tests;
