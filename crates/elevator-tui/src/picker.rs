//! Startup scenario picker.
//!
//! When the binary is launched without an explicit `--config` path
//! we list the bundled `assets/config/*.ron` scenarios and let the
//! user pick one with arrow keys. Returns the selected path back
//! to `main` so the rest of the boot sequence (config load + sim
//! build + interactive viewer) is unchanged.
//!
//! This is its own tiny ratatui sub-app with its own terminal
//! lifetime so the main viewer's setup/teardown stays untouched.

use std::io;
use std::path::{Path, PathBuf};
use std::time::Duration;

use anyhow::{Context as _, Result};
use crossterm::event::{self, Event as TermEvent, KeyCode, KeyEventKind, KeyModifiers};
use crossterm::execute;
use crossterm::terminal::{EnterAlternateScreen, LeaveAlternateScreen};
use ratatui::Terminal;
use ratatui::backend::CrosstermBackend;
use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, BorderType, Borders, Clear, List, ListItem, ListState, Paragraph};

use crate::ui::palette;

/// Default search root for scenario `.ron` files. Resolved relative
/// to the current working directory, matching the shape `cargo run`
/// uses.
const DEFAULT_CONFIG_DIR: &str = "assets/config";

/// Show the picker and return the user's choice. `Ok(None)` means
/// they cancelled (q / Esc / Ctrl-C); the caller should exit
/// gracefully without launching the main viewer.
///
/// # Errors
///
/// Returns the underlying I/O error if terminal setup, reading, or
/// rendering fails.
pub fn pick_scenario() -> Result<Option<PathBuf>> {
    let scenarios = collect_scenarios(Path::new(DEFAULT_CONFIG_DIR))?;
    if scenarios.is_empty() {
        anyhow::bail!(
            "no scenarios found in `{DEFAULT_CONFIG_DIR}/*.ron` — pass --config <path> to load a config from elsewhere"
        );
    }

    // Construct the guard *immediately* after raw mode is enabled,
    // before entering the alt screen. If `EnterAlternateScreen`
    // fails the guard's drop still restores raw mode — otherwise a
    // partial setup leaves the user's shell unusable for the rest
    // of the session.
    crossterm::terminal::enable_raw_mode().context("enabling raw mode")?;
    let _guard = TerminalGuard;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen).context("entering alternate screen")?;
    let mut terminal =
        Terminal::new(CrosstermBackend::new(stdout)).context("constructing ratatui terminal")?;
    let mut list_state = ListState::default();
    list_state.select(Some(0));

    loop {
        terminal
            .draw(|frame| draw(frame, &scenarios, &mut list_state))
            .context("drawing picker")?;

        if !event::poll(Duration::from_millis(50)).context("polling picker input")? {
            continue;
        }
        if let TermEvent::Key(key) = event::read().context("reading picker input")?
            && key.kind == KeyEventKind::Press
        {
            if matches!(key.code, KeyCode::Char('c'))
                && key.modifiers.contains(KeyModifiers::CONTROL)
            {
                return Ok(None);
            }
            match key.code {
                KeyCode::Esc | KeyCode::Char('q') => return Ok(None),
                KeyCode::Enter => {
                    let idx = list_state.selected().unwrap_or(0);
                    return Ok(scenarios.get(idx).cloned());
                }
                KeyCode::Down | KeyCode::Char('j') => {
                    let idx = list_state.selected().unwrap_or(0);
                    list_state.select(Some((idx + 1).min(scenarios.len() - 1)));
                }
                KeyCode::Up | KeyCode::Char('k') => {
                    let idx = list_state.selected().unwrap_or(0);
                    list_state.select(Some(idx.saturating_sub(1)));
                }
                _ => {}
            }
        }
    }
}

/// Find every `*.ron` directly under `dir`, sorted by file name.
/// Hidden files (starting with `.`) are skipped.
fn collect_scenarios(dir: &Path) -> Result<Vec<PathBuf>> {
    if !dir.exists() {
        return Ok(Vec::new());
    }
    let mut out: Vec<PathBuf> = std::fs::read_dir(dir)
        .with_context(|| format!("reading {}", dir.display()))?
        .filter_map(|res| match res {
            Ok(entry) => Some(entry.path()),
            Err(e) => {
                // Surface but don't abort — a single unreadable
                // entry shouldn't sink the whole picker.
                eprintln!(
                    "warning: skipping unreadable entry in {}: {e}",
                    dir.display(),
                );
                None
            }
        })
        .filter(|path| {
            path.extension().is_some_and(|ext| ext == "ron")
                && path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .is_some_and(|n| !n.starts_with('.'))
        })
        .collect();
    out.sort();
    Ok(out)
}

/// Render the picker frame: title bar, list of scenarios, and a
/// footer with the keymap.
fn draw(frame: &mut ratatui::Frame<'_>, scenarios: &[PathBuf], list_state: &mut ListState) {
    let area = frame.area();
    frame.render_widget(Clear, area);

    let outer = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(1), // title
            Constraint::Min(0),    // list
            Constraint::Length(1), // footer
        ])
        .split(area);

    let title = Line::from(vec![
        Span::styled(
            " elevator-tui ",
            Style::default()
                .fg(palette::ACCENT)
                .add_modifier(Modifier::BOLD),
        ),
        Span::styled("· ", Style::default().fg(palette::DIM)),
        Span::styled("pick a scenario", Style::default().fg(palette::DIM_STRONG)),
    ]);
    frame.render_widget(Paragraph::new(title), outer[0]);

    // `scenarios.len()` is a `usize`; clamp before casting so a
    // pathological config dir with 65k+ entries can't overflow the
    // u16 height used by `centered_rect`.
    let modal_h = u16::try_from(scenarios.len())
        .unwrap_or(u16::MAX)
        .saturating_add(4);
    let modal = centered_rect(outer[1], 64, modal_h);
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(Style::default().fg(palette::ACCENT))
        .title(crate::ui::bracketed_title(
            "scenarios",
            Some(format!("{} found", scenarios.len())),
        ));
    let inner = block.inner(modal);
    frame.render_widget(block, modal);

    let items: Vec<ListItem<'_>> = scenarios
        .iter()
        .map(|path| {
            let name = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or_else(|| path.to_str().unwrap_or("?"));
            ListItem::new(Line::from(vec![
                Span::raw(" "),
                Span::styled(name.to_string(), palette::title_style()),
                Span::styled(
                    format!(
                        "    {}",
                        path.parent().and_then(|p| p.to_str()).unwrap_or("")
                    ),
                    Style::default().fg(palette::DIM),
                ),
            ]))
        })
        .collect();

    let list = List::new(items)
        .highlight_style(palette::focused_style())
        .highlight_symbol("▶ ");
    frame.render_stateful_widget(list, inner, list_state);

    let footer = Line::from(vec![
        Span::styled(" ↑/↓", Style::default().fg(palette::ACCENT)),
        Span::styled(" navigate  ", Style::default().fg(palette::DIM_STRONG)),
        Span::styled("⏎", Style::default().fg(palette::ACCENT)),
        Span::styled(" select  ", Style::default().fg(palette::DIM_STRONG)),
        Span::styled("q", Style::default().fg(palette::ACCENT)),
        Span::styled(" cancel", Style::default().fg(palette::DIM_STRONG)),
    ]);
    frame.render_widget(Paragraph::new(footer), outer[2]);
}

/// Center a rect of the given size inside `area`, shrinking to fit
/// when the area is smaller. Picker-local copy so the module
/// doesn't pull `ui::centered_rect` (private).
fn centered_rect(area: Rect, w: u16, h: u16) -> Rect {
    let w = w.min(area.width);
    let h = h.min(area.height);
    Rect {
        x: area.x + area.width.saturating_sub(w) / 2,
        y: area.y + area.height.saturating_sub(h) / 2,
        width: w,
        height: h,
    }
}

/// RAII guard that restores raw mode + leaves the alternate screen
/// when the picker function returns or panics.
struct TerminalGuard;

impl Drop for TerminalGuard {
    fn drop(&mut self) {
        let _ = crossterm::terminal::disable_raw_mode();
        let _ = execute!(io::stdout(), LeaveAlternateScreen);
    }
}

#[cfg(test)]
#[allow(clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn collect_scenarios_filters_to_ron_files() {
        let tmp = tempfile::tempdir().expect("tempdir");
        std::fs::write(tmp.path().join("a.ron"), "()").expect("write a.ron");
        std::fs::write(tmp.path().join("b.ron"), "()").expect("write b.ron");
        std::fs::write(tmp.path().join("readme.txt"), "x").expect("write readme.txt");
        std::fs::write(tmp.path().join(".hidden.ron"), "()").expect("write hidden");
        let found = collect_scenarios(tmp.path()).expect("collect");
        assert_eq!(found.len(), 2);
        assert!(
            found
                .iter()
                .all(|p| p.extension().is_some_and(|e| e == "ron"))
        );
        assert!(!found.iter().any(|p| {
            p.file_name()
                .and_then(|n| n.to_str())
                .is_some_and(|n| n.starts_with('.'))
        }));
    }

    #[test]
    fn collect_scenarios_returns_empty_for_missing_dir() {
        let found = collect_scenarios(Path::new("/nonexistent/path/that/does/not/exist"))
            .expect("missing dir is ok");
        assert!(found.is_empty());
    }
}
