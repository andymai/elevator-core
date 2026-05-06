import { REPOSITION_LABELS, STRATEGY_LABELS, scenarioById, type PermalinkState } from "../domain";
import { setDocumentMeta } from "../platform";

const APP_SUFFIX = "elevator-core playground";
const BASE_DESCRIPTION =
  "In-browser playground for elevator-core: a deterministic, engine-agnostic Rust simulation library for Bevy, Unity, Godot, and the browser.";

/**
 * Refresh the document title plus description, OG, and Twitter copy to
 * reflect the active scenario, panes, and mode. Called at boot once
 * the permalink resolves and again whenever the user changes scenario,
 * dispatch strategy, parking strategy, compare toggle, or quest stage.
 *
 * Canonical stays pinned to the playground root — query-string permalinks
 * encode user state but aren't independently-indexable pages, so we
 * consolidate authority on the bare URL via the static <link rel=canonical>
 * in index.html. Only the human-readable copy moves with state.
 */
export function updateRuntimeMeta(state: PermalinkState): void {
  setDocumentMeta(buildMeta(state));
}

function buildMeta(state: PermalinkState): { title: string; description: string } {
  if (state.mode === "quest") {
    return {
      title: `Quest curriculum — ${APP_SUFFIX}`,
      description:
        "Write a TypeScript dispatch controller and watch it drive the cars. A 15-stage curriculum that teaches the elevator-core API one primitive at a time.",
    };
  }

  const scenario = scenarioById(state.scenario);
  const scenarioLabel = scenario.label;
  const stratA = STRATEGY_LABELS[state.strategyA];
  const stratB = STRATEGY_LABELS[state.strategyB];
  const parkA = REPOSITION_LABELS[state.repositionA];
  const parkB = REPOSITION_LABELS[state.repositionB];

  if (state.compare) {
    const title = `${scenarioLabel}: ${stratA} vs ${stratB} — Elevator dispatch playground`;
    const description =
      `Compare ${stratA} (parking: ${parkA}) against ${stratB} (parking: ${parkB}) ` +
      `dispatch on the ${scenarioLabel.toLowerCase()} scenario. ${BASE_DESCRIPTION}`;
    return { title, description };
  }

  const title = `${scenarioLabel}: ${stratA} dispatch — Elevator dispatch playground`;
  const description =
    `Watch ${stratA} dispatch (parking: ${parkA}) handle live rider traffic on the ` +
    `${scenarioLabel.toLowerCase()} scenario. ${BASE_DESCRIPTION}`;
  return { title, description };
}
