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
pub mod movement;
pub mod sim;
pub mod stop;

#[cfg(test)]
mod tests;
