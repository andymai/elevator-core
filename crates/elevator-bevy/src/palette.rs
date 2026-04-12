//! Bioluminescent color palette — HDR emissive colors for Bloom post-processing.
//!
//! Colors with RGB values > 1.0 are emissive and produce glow halos via Bloom.
//! Structural colors (shaft, background) stay in normal [0, 1] range.

use bevy::prelude::Color;

// ── Background & structure ──

/// Deep ocean background — near-black with blue undertone.
pub const BG: Color = Color::srgb(0.039, 0.039, 0.078);

/// Shaft fill — barely-there translucent blue.
pub const SHAFT_FILL: Color = Color::srgba(0.39, 0.59, 0.78, 0.05);

/// Shaft border — subtle translucent blue outline.
pub const SHAFT_BORDER: Color = Color::srgba(0.39, 0.59, 0.78, 0.10);

// ── Floor lines — dim by default, glow when active ──

/// Floor line at rest — very dim.
pub const FLOOR_DIM: Color = Color::srgba(0.4, 0.5, 0.6, 0.15);

/// Floor line when riders are waiting — soft glow.
pub const FLOOR_ACTIVE: Color = Color::linear_rgba(0.5, 0.7, 1.0, 0.6);

/// Floor line when elevator is present — brightest.
pub const FLOOR_ELEVATOR: Color = Color::linear_rgba(0.8, 0.9, 1.2, 0.8);

// ── Floor labels ──

/// Floor label text when inactive — nearly invisible.
pub const LABEL_DIM: Color = Color::srgba(0.5, 0.6, 0.7, 0.15);

/// Floor label text when active — fades in.
pub const LABEL_ACTIVE: Color = Color::srgba(0.7, 0.8, 0.9, 0.7);

// ── Elevator capsules ──

/// Elevator car core — warm white-gold emissive.
pub const CAR_CORE: Color = Color::linear_rgba(2.0, 1.8, 1.2, 1.0);

/// Elevator car when doors open — brightened.
pub const CAR_DOORS_OPEN: Color = Color::linear_rgba(3.0, 2.7, 1.8, 1.0);

/// Elevator car halo/glow mesh — softer, larger.
pub const CAR_HALO: Color = Color::linear_rgba(1.0, 0.9, 0.6, 0.3);

// ── Light trails ──

/// Trail segment starting color (near car) — warm emissive.
pub const TRAIL_NEAR: Color = Color::linear_rgba(1.2, 1.0, 0.6, 0.5);

/// Trail segment ending color (far from car) — cool fade.
pub const TRAIL_FAR: Color = Color::linear_rgba(0.3, 0.4, 0.7, 0.05);

// ── Rider specks ──

/// Rider waiting — calm, cool blue emissive.
pub const RIDER_CALM: Color = Color::linear_rgba(0.4, 0.6, 1.5, 0.9);

/// Rider impatient — warming toward amber.
pub const RIDER_IMPATIENT: Color = Color::linear_rgba(1.5, 1.0, 0.3, 0.9);

/// Rider boarding — streaming cyan.
pub const RIDER_BOARDING: Color = Color::linear_rgba(0.5, 1.5, 1.5, 0.9);

/// Rider riding — packed yellow glow.
pub const RIDER_RIDING: Color = Color::linear_rgba(1.8, 1.5, 0.4, 0.9);

/// Rider alighting — scattering warm.
pub const RIDER_ALIGHTING: Color = Color::linear_rgba(1.5, 1.0, 0.5, 0.9);

/// Rider arrived — fading sparkle.
pub const RIDER_ARRIVED: Color = Color::linear_rgba(0.8, 1.0, 1.5, 0.4);

/// Rider abandoned — angry red.
pub const RIDER_ABANDONED: Color = Color::linear_rgba(2.0, 0.3, 0.2, 0.9);

// ── Marine snow / atmosphere particles ──

/// Ambient drifting particle — very dim, cool.
pub const MARINE_SNOW: Color = Color::srgba(0.5, 0.6, 0.7, 0.08);

// ── HUD ──

/// HUD text color — dim, unobtrusive.
pub const HUD_TEXT: Color = Color::srgba(0.5, 0.6, 0.7, 0.5);

/// HUD text shadow/background for readability.
pub const HUD_BG: Color = Color::srgba(0.02, 0.02, 0.04, 0.6);
