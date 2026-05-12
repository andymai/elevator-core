import { scenarioById } from "../../domain";
import { toast } from "../../platform";
import { highlightRon } from "./highlight";

export interface ScenarioConfigHandles {
  readonly root: HTMLElement;
  readonly details: HTMLDetailsElement;
  readonly filename: HTMLElement;
  readonly code: HTMLElement;
  readonly copy: HTMLButtonElement;
}

function q(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing element #${id} (scenario-config)`);
  return el;
}

const DESKTOP_QUERY = "(min-width: 768px)";

let currentSource = "";
let currentScenarioId = "";

export function wireScenarioConfig(toastEl: HTMLElement): ScenarioConfigHandles {
  const handles: ScenarioConfigHandles = {
    root: q("scenario-config"),
    details: q("scenario-config-details") as HTMLDetailsElement,
    filename: q("scenario-config-filename"),
    code: q("scenario-config-code"),
    copy: q("scenario-config-copy") as HTMLButtonElement,
  };

  // Mobile: collapsed by default; desktop: expanded. Re-evaluate on
  // viewport change so a portrait→landscape rotation snaps back to
  // the expected state for that width.
  const mql = window.matchMedia(DESKTOP_QUERY);
  const applyOpen = (): void => {
    handles.details.open = mql.matches;
  };
  applyOpen();
  mql.addEventListener("change", applyOpen);

  // The copy button sits inside <summary>, so its click would
  // otherwise toggle the details. Stop propagation and handle copy.
  handles.copy.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (!currentSource) return;
    void navigator.clipboard
      .writeText(currentSource)
      .then(() => {
        toast(toastEl, "Config copied");
      })
      .catch(() => {
        toast(toastEl, "Copy failed");
      });
  });

  return handles;
}

export function setScenarioConfig(handles: ScenarioConfigHandles, scenarioId: string): void {
  if (scenarioId === currentScenarioId) return;
  const scenario = scenarioById(scenarioId);
  currentScenarioId = scenarioId;
  currentSource = scenario.ron;
  handles.filename.textContent = scenario.configFilename;
  handles.code.replaceChildren(highlightRon(scenario.ron));
}
