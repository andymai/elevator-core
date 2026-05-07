import { el } from "../../platform";
import { SCENARIOS } from "../../domain";

// Tabular switcher — replaces the previous card-pill chrome. Each
// scenario is a flat text label with a 1px accent rule under the
// active one (no filled background), reserving the accent for the
// "current scenario" signal alone (rubric #6).
const SCENARIO_CARD_CLS =
  "scenario-card inline-flex items-center gap-1.5 px-2 py-1 " +
  "border-b-2 border-b-transparent " +
  "text-content-tertiary text-[12px] font-medium cursor-pointer " +
  "transition-colors duration-fast select-none whitespace-nowrap " +
  "hover:text-content " +
  "aria-pressed:text-content aria-pressed:border-b-accent " +
  "max-md:flex-none max-md:snap-start";
const SCENARIO_KBD_CLS =
  "inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 " +
  "text-[9.5px] font-semibold text-content-disabled bg-surface border border-stroke " +
  "rounded-sm tabular-nums";

/** Narrow interface — only the fields scenario cards need from UiHandles. */
export interface ScenarioCardsUi {
  scenarioCards: HTMLElement;
}

export function renderScenarioCards(ui: ScenarioCardsUi): void {
  const frag = document.createDocumentFragment();
  SCENARIOS.forEach((s, i) => {
    const card = el("button", SCENARIO_CARD_CLS);
    card.type = "button";
    card.dataset["scenarioId"] = s.id;
    card.setAttribute("aria-pressed", "false");
    // Description dropped to the native tooltip — compact tabs keep
    // just the label + shortcut key. Users hover (desktop) or long-
    // press (touch) to see the longer description if they want it.
    card.title = s.description;
    card.append(el("span", "", s.label), el("span", SCENARIO_KBD_CLS, String(i + 1)));
    frag.appendChild(card);
  });
  ui.scenarioCards.replaceChildren(frag);
}

export function syncScenarioCards(ui: ScenarioCardsUi, scenarioId: string): void {
  for (const card of ui.scenarioCards.children) {
    const el = card as HTMLElement;
    el.setAttribute("aria-pressed", el.dataset["scenarioId"] === scenarioId ? "true" : "false");
  }
}
