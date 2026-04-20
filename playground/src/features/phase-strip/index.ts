import type { TrafficDriver } from "../../sim";

interface PhaseUiHandles {
  phaseLabel: HTMLElement | null;
  phaseProgress: HTMLElement | null;
}

interface PhaseState {
  traffic: TrafficDriver;
}

export function updatePhaseIndicator(state: PhaseState, ui: PhaseUiHandles): void {
  const el = ui.phaseLabel;
  if (!el) return;
  const next = state.traffic.currentPhaseLabel() || "\u2014";
  if (el.textContent !== next) el.textContent = next;
}

export function updatePhaseProgress(state: PhaseState, ui: PhaseUiHandles): void {
  if (!ui.phaseProgress) return;
  const pct = Math.round(state.traffic.progressInPhase() * 1000) / 10;
  const next = `${pct}%`;
  if (ui.phaseProgress.style.width !== next) ui.phaseProgress.style.width = next;
}
