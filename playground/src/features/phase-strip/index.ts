import type { TrafficDriver } from "../../sim";

interface PhaseUiHandles {
  phaseStrip: HTMLElement | null;
  phaseLabel: HTMLElement | null;
  phaseProgress: HTMLElement | null;
}

interface PhaseState {
  traffic: TrafficDriver;
}

export function updatePhaseIndicator(state: PhaseState, ui: PhaseUiHandles): void {
  // Hide the whole strip when the active scenario has no phases \u2014
  // showing "Phase: \u2014" is meaningless chrome and the empty row eats
  // vertical space the panes could use. The driver returns `[]` from
  // `phases()` when nothing is installed, so the boolean is stable
  // for the lifetime of a scenario.
  const hasPhases = state.traffic.phases().length > 0;
  if (ui.phaseStrip) ui.phaseStrip.hidden = !hasPhases;
  const el = ui.phaseLabel;
  if (!el) return;
  const next = hasPhases ? state.traffic.currentPhaseLabel() || "\u2014" : "\u2014";
  if (el.textContent !== next) el.textContent = next;
}

export function updatePhaseProgress(state: PhaseState, ui: PhaseUiHandles): void {
  if (!ui.phaseProgress) return;
  const pct = Math.round(state.traffic.progressInPhase() * 1000) / 10;
  const next = `${pct}%`;
  if (ui.phaseProgress.style.width !== next) ui.phaseProgress.style.width = next;
}
