export interface PaneHandles {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  name: HTMLElement;
  mode: HTMLElement;
  decision: HTMLElement;
  desc: HTMLElement;
  metrics: HTMLElement;
  trigger: HTMLButtonElement;
  popover: HTMLElement;
  /** Reposition-strategy chip — the second ("Park: ...") chip in the pane header. */
  repoTrigger: HTMLButtonElement;
  repoName: HTMLElement;
  repoPopover: HTMLElement;
  accent: string;
  /** "a" or "b" — used by the popover wiring to route picks back. */
  which: "a" | "b";
}
