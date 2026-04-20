import { el } from "../../platform";
import { SCENARIOS } from "../../domain";

// Compact pill tabs — used to be full-sized cards with a description
// block; that was ~55 px of vertical chrome. Now a single row of
// short buttons that show the scenario name and a numeric shortcut
// badge. Description is accessible via the `title` tooltip so
// nothing is lost, just de-weighted.
const SCENARIO_CARD_CLS =
  "scenario-card inline-flex items-center gap-1.5 px-2.5 py-1 " +
  "bg-surface-elevated border border-stroke-subtle rounded-md " +
  "text-content-secondary text-[12px] font-medium cursor-pointer " +
  "transition-colors duration-fast select-none whitespace-nowrap " +
  "hover:bg-surface-hover hover:border-stroke " +
  "aria-pressed:bg-accent-muted aria-pressed:text-content " +
  "aria-pressed:border-[color-mix(in_srgb,var(--accent)_55%,transparent)] " +
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
