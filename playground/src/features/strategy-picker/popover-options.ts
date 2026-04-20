/**
 * Build the popover's option list for a pane. Each row renders the
 * strategy label, a one-liner description, and — when compare mode is
 * on — a muted "also in A"/"also in B" tag whenever that strategy is
 * already active on the sibling pane. Shared by both the dispatch and
 * reposition popover renderers via `renderStrategyPopover` /
 * `renderRepositionPopover`.
 */
export function renderPopoverOptions<T extends string>(
  container: HTMLElement,
  options: readonly T[],
  labels: Record<T, string>,
  descriptions: Record<T, string>,
  dataKey: string,
  current: T,
  sibling: T | null,
  siblingLabel: "A" | "B",
  onPick: (v: T) => void,
): void {
  const frag = document.createDocumentFragment();
  for (const opt of options) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "strategy-option";
    row.setAttribute("role", "menuitemradio");
    row.setAttribute("aria-checked", opt === current ? "true" : "false");
    row.dataset[dataKey] = opt;

    const header = document.createElement("span");
    header.className = "strategy-option-name";
    const labelSpan = document.createElement("span");
    labelSpan.className = "strategy-option-label";
    labelSpan.textContent = labels[opt];
    header.appendChild(labelSpan);

    if (sibling && opt === sibling) {
      const badge = document.createElement("span");
      badge.className = "strategy-option-sibling";
      badge.textContent = `also in ${siblingLabel}`;
      header.appendChild(badge);
    }

    const desc = document.createElement("span");
    desc.className = "strategy-option-desc";
    desc.textContent = descriptions[opt];

    row.append(header, desc);
    row.addEventListener("click", () => {
      onPick(opt);
    });
    frag.appendChild(row);
  }
  container.replaceChildren(frag);
}
