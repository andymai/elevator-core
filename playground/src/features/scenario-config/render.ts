import { scenarioById } from "../../domain";
import { toast } from "../../platform";
import { highlightRon } from "./highlight";

export type SetScenario = (scenarioId: string) => void;

function q(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing element #${id} (scenario-config)`);
  return el;
}

const DESKTOP_QUERY = "(min-width: 768px)";

export function wireScenarioConfig(toastEl: HTMLElement): SetScenario {
  const details = q("scenario-config-details") as HTMLDetailsElement;
  const filename = q("scenario-config-filename");
  const code = q("scenario-config-code");
  const copy = q("scenario-config-copy") as HTMLButtonElement;

  // Open on desktop, closed on mobile; phone rotation doesn't override the user.
  details.open = window.matchMedia(DESKTOP_QUERY).matches;

  let currentId = "";
  let currentSource = "";

  copy.addEventListener("click", (ev) => {
    // Copy button is inside <summary>; stopPropagation prevents the toggle.
    ev.preventDefault();
    ev.stopPropagation();
    if (!currentSource) return;
    // Undefined in non-secure contexts (HTTP, sandboxed iframes);
    // lib.dom types it as non-nullable, so cast to expose the runtime gap.
    const clipboard = navigator.clipboard as Clipboard | undefined;
    if (!clipboard) {
      toast(toastEl, "Copy failed");
      return;
    }
    void clipboard
      .writeText(currentSource)
      .then(() => {
        toast(toastEl, "Config copied");
      })
      .catch(() => {
        toast(toastEl, "Copy failed");
      });
  });

  return (scenarioId: string): void => {
    if (scenarioId === currentId) return;
    const scenario = scenarioById(scenarioId);
    currentId = scenarioId;
    currentSource = scenario.ron;
    filename.textContent = scenario.configFilename;
    code.replaceChildren(highlightRon(scenario.ron));
  };
}
