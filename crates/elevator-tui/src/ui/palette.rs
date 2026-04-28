//! Warm-dark indexed palette.
//!
//! Colors are picked from xterm-256 so every renderer (truecolor or not,
//! tmux or bare) shows the same hue. The palette intentionally avoids
//! full-saturation primaries — an elevator log looks busy enough already
//! without retina-burning red against jet black. Threshold helpers
//! (`bar_fill_for`, `wait_color_for`) centralize the green→yellow→red
//! ramp so every gauge agrees on what "hot" looks like.
//!
//! ## Indices, in case anyone is reading this offline
//!
//! | role            | xterm idx | what it looks like     |
//! |-----------------|-----------|------------------------|
//! | accent          | 215       | warm amber             |
//! | success         | 78        | sage green             |
//! | warn            | 221       | wheat                  |
//! | danger          | 174       | terracotta             |
//! | dim             | 240       | mid grey               |
//! | `dim_strong`    | 244       | lighter grey           |
//! | `surface_title` | 180       | warm beige             |
//! | `direction_up`  | 114       | leaf green             |
//! | `direction_down`| 209       | salmon                 |
//!
//! These are intentionally close to the playground's gridfinity-warm
//! aesthetic and away from the default ratatui ANSI 0..15 set, which
//! looks harsh on warm-dark terminals.

use ratatui::style::{Color, Modifier, Style};

/// Bracketed-title accent (matches `┤ title ├`).
pub const ACCENT: Color = Color::Indexed(215);
/// Healthy / under-threshold gauge color.
pub const SUCCESS: Color = Color::Indexed(78);
/// Mid-pressure warning color.
pub const WARN: Color = Color::Indexed(221);
/// Hot / over-budget color.
pub const DANGER: Color = Color::Indexed(174);
/// Subdued labels, axes, secondary numbers.
pub const DIM: Color = Color::Indexed(240);
/// Slightly brighter than `DIM` — body text in panels.
pub const DIM_STRONG: Color = Color::Indexed(244);
/// Warm cream used for panel titles in the bracketed header.
pub const TITLE: Color = Color::Indexed(180);
/// "Going up" tint.
pub const UP: Color = Color::Indexed(114);
/// "Going down" tint.
pub const DOWN: Color = Color::Indexed(209);

/// Title style used by every bordered panel: accent-colored, bold.
#[must_use]
pub fn title_style() -> Style {
    Style::default().fg(TITLE).add_modifier(Modifier::BOLD)
}

/// Accent style for the focused car (bold + reverse + accent fg).
#[must_use]
pub fn focused_style() -> Style {
    Style::default()
        .fg(ACCENT)
        .add_modifier(Modifier::BOLD)
        .add_modifier(Modifier::REVERSED)
}

/// Choose a color along the green→yellow→red ramp from a 0..=1 fill ratio.
/// `<60%` → green, `<85%` → yellow, otherwise red.
#[must_use]
pub const fn bar_fill_for(ratio: f64) -> Color {
    if ratio < 0.60 {
        SUCCESS
    } else if ratio < 0.85 {
        WARN
    } else {
        DANGER
    }
}

/// Pick a color for a p95-wait sample (in ticks). Tuned for 60 t/s:
/// `<60t` (1 s) is fine, `<180t` (3 s) is "watch it", anything more is hot.
#[must_use]
pub const fn wait_color_for(ticks_p95: u64) -> Color {
    if ticks_p95 < 60 {
        SUCCESS
    } else if ticks_p95 < 180 {
        WARN
    } else {
        DANGER
    }
}

#[cfg(test)]
#[allow(clippy::expect_used, clippy::panic, clippy::unwrap_used)]
mod tests {
    use super::*;

    #[test]
    fn bar_fill_thresholds() {
        assert_eq!(bar_fill_for(0.0), SUCCESS);
        assert_eq!(bar_fill_for(0.59), SUCCESS);
        assert_eq!(bar_fill_for(0.60), WARN);
        assert_eq!(bar_fill_for(0.84), WARN);
        assert_eq!(bar_fill_for(0.85), DANGER);
        assert_eq!(bar_fill_for(2.0), DANGER);
    }

    #[test]
    fn wait_thresholds() {
        assert_eq!(wait_color_for(0), SUCCESS);
        assert_eq!(wait_color_for(59), SUCCESS);
        assert_eq!(wait_color_for(60), WARN);
        assert_eq!(wait_color_for(179), WARN);
        assert_eq!(wait_color_for(180), DANGER);
    }
}
