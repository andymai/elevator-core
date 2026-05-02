/**
 * Stage-grid navigator.
 *
 * Replaces the old `<select>` dropdown as the curriculum's primary
 * navigation surface: a 3×N grid of stage cards grouped by section
 * (basics → strategies → events-manual → topology) with a per-stage
 * star count and a global progress meter. Cold boot lands on the
 * grid (unless a `?qs=` permalink picks a specific stage); inside
 * a stage, a "← Stages" button returns the player to the grid.
 *
 * The module is purely presentational — `quest-pane.ts` owns the
 * view-mode state machine and stage navigation. This module renders
 * the grid and wires card clicks to a caller-supplied callback.
 */

import { clearChildren, requireElement } from "./dom-utils";
import { STAGES } from "./stages";
import type { Stage, StageSection, StarCount } from "./stages";
import { loadBestStars } from "./storage";

export interface QuestGridHandles {
  readonly root: HTMLElement;
  readonly progress: HTMLElement;
  readonly sections: HTMLElement;
}

/**
 * Display labels for each curriculum section. Pinned in the source
 * rather than added to the schema because the labels are presentation
 * concerns the grid owns; stages just declare which section they
 * belong to.
 */
const SECTION_LABELS: Record<StageSection, string> = {
  basics: "Basics",
  strategies: "Strategies",
  "events-manual": "Events & Manual Control",
  topology: "Topology",
};

/** Order sections render in. Mirrors the curriculum's intended progression. */
const SECTION_ORDER: readonly StageSection[] = [
  "basics",
  "strategies",
  "events-manual",
  "topology",
];

const MAX_STARS_PER_STAGE = 3;

export function wireQuestGrid(): QuestGridHandles {
  return {
    root: requireElement("quest-grid", "quest-grid"),
    progress: requireElement("quest-grid-progress", "quest-grid"),
    sections: requireElement("quest-grid-sections", "quest-grid"),
  };
}

/**
 * Render the grid against the current registry. Called on initial
 * mount and after every stage grade so a fresh star count propagates
 * to the cards without a page reload.
 *
 * `onPick` fires when the player clicks a stage card. The grid does
 * not navigate on its own — `quest-pane` decides whether to swap
 * views, mount the editor, etc.
 */
export function renderQuestGrid(
  handles: QuestGridHandles,
  onPick: (stageId: string) => void,
): void {
  // Re-rendering is straightforward: drop everything and rebuild
  // from STAGES. The grid is small (15 cards) so the cost is
  // negligible compared to managing per-card state diffs.
  clearChildren(handles.sections);

  let totalStars = 0;
  const totalPossible = STAGES.length * MAX_STARS_PER_STAGE;

  for (const section of SECTION_ORDER) {
    const stages = STAGES.filter((s) => s.section === section);
    if (stages.length === 0) continue;

    const sectionEl = document.createElement("section");
    sectionEl.dataset["section"] = section;

    const heading = document.createElement("h2");
    heading.className =
      "text-[10.5px] uppercase tracking-[0.08em] text-content-tertiary font-medium m-0 mb-2";
    heading.textContent = SECTION_LABELS[section];
    sectionEl.appendChild(heading);

    const grid = document.createElement("div");
    grid.className = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2";
    for (const stage of stages) {
      const stars = loadBestStars(stage.id);
      totalStars += stars;
      grid.appendChild(buildCard(stage, stars, onPick));
    }
    sectionEl.appendChild(grid);
    handles.sections.appendChild(sectionEl);
  }

  handles.progress.textContent = `${totalStars} / ${totalPossible}`;
}

/** Build a single stage card. */
function buildCard(stage: Stage, stars: StarCount, onPick: (stageId: string) => void): HTMLElement {
  const idx = STAGES.findIndex((s) => s.id === stage.id);
  const ordinal = String(idx + 1).padStart(2, "0");

  const card = document.createElement("button");
  card.type = "button";
  card.dataset["stageId"] = stage.id;
  card.className =
    "group flex flex-col gap-1 p-3 text-left bg-surface-elevated border border-stroke-subtle rounded-md cursor-pointer transition-colors duration-fast hover:bg-surface-hover hover:border-stroke focus-visible:outline-none focus-visible:border-accent";

  // Top row: ordinal + star tier.
  const top = document.createElement("div");
  top.className = "flex items-baseline justify-between gap-2";
  const ord = document.createElement("span");
  ord.className = "text-content-tertiary text-[10.5px] tabular-nums font-medium";
  ord.textContent = ordinal;
  top.appendChild(ord);
  const starGlyphs = document.createElement("span");
  starGlyphs.className = "text-[12px] tracking-[0.18em] tabular-nums leading-none";
  starGlyphs.classList.add(stars > 0 ? "text-accent" : "text-content-disabled");
  starGlyphs.setAttribute(
    "aria-label",
    stars === 0 ? "no stars earned" : `${stars} of 3 stars earned`,
  );
  starGlyphs.textContent = "★".repeat(stars) + "☆".repeat(MAX_STARS_PER_STAGE - stars);
  top.appendChild(starGlyphs);
  card.appendChild(top);

  // Title.
  const title = document.createElement("div");
  title.className = "text-content text-[13px] font-semibold tracking-[-0.01em]";
  title.textContent = stage.title;
  card.appendChild(title);

  // Brief — clamp to two lines so cards stay aligned.
  const brief = document.createElement("div");
  brief.className =
    "text-content-tertiary text-[11px] leading-snug overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]";
  brief.textContent = stage.brief;
  card.appendChild(brief);

  card.addEventListener("click", () => {
    onPick(stage.id);
  });

  return card;
}
