import { el } from "../../platform";
import { METRIC_DEFS, type MetricVerdicts, type Verdict } from "./metric-rows";

export function verdictToWinner(v: Verdict): { winner: "A" | "B" | "tie"; text: string } {
  switch (v) {
    case "win":
      return { winner: "A", text: "A" };
    case "lose":
      return { winner: "B", text: "B" };
    case "tie":
      return { winner: "tie", text: "Tie" };
  }
}

export function renderVerdictRibbon(root: HTMLElement, verdictsA: MetricVerdicts): void {
  if (root.childElementCount === 0) {
    root.appendChild(
      el(
        "span",
        "text-[10.5px] uppercase tracking-[0.08em] text-content-disabled font-medium whitespace-nowrap max-md:col-span-full",
        "Who's winning?",
      ),
    );
    for (const [label] of METRIC_DEFS) {
      // `.verdict-cell` stays — CSS keys the winner-color cascade off its
      // `[data-winner]` attribute. `.verdict-cell-winner` also stays — it's
      // the child that cascade colors.
      const cell = el(
        "div",
        "verdict-cell flex items-center gap-1.5 px-2 py-1 rounded-sm bg-surface-elevated border border-stroke-subtle tabular-nums overflow-hidden",
      );
      cell.append(
        el("span", "text-[10.5px] uppercase tracking-[0.06em] text-content-disabled", label),
        el("span", "verdict-cell-winner font-semibold text-content tracking-[0.02em]"),
      );
      root.appendChild(cell);
    }
  }
  root.hidden = false;
  for (let i = 0; i < METRIC_DEFS.length; i++) {
    const cell = root.children[i + 1] as HTMLElement | undefined;
    if (!cell) continue;
    const def = METRIC_DEFS[i];
    if (!def) continue;
    const key = def[1];
    const { winner, text } = verdictToWinner(verdictsA[key]);
    if (cell.dataset["winner"] !== winner) cell.dataset["winner"] = winner;
    const winnerEl = cell.lastElementChild as HTMLElement;
    if (winnerEl.textContent !== text) winnerEl.textContent = text;
  }
}
