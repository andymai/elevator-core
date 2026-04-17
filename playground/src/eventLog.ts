import type { SimEvent } from "./types";

// Scrollable event log. Keeps the most recent N events in memory and renders
// as a <ul> with auto-scroll-to-bottom unless the user has scrolled up.

const CAP = 500;

const KIND_LABELS: Record<SimEvent["kind"], string> = {
  "rider-spawned": "spawn",
  "rider-boarded": "board",
  "rider-exited": "exit",
  "rider-abandoned": "abandon",
  "elevator-arrived": "arrive",
  "elevator-departed": "depart",
  "door-opened": "door+",
  "door-closed": "door-",
  "elevator-assigned": "assign",
  other: "other",
};

export class EventLog {
  #root: HTMLElement;
  #buf: SimEvent[] = [];
  #follow = true;

  constructor(root: HTMLElement) {
    this.#root = root;
    root.addEventListener("scroll", () => {
      const atBottom = root.scrollHeight - root.scrollTop - root.clientHeight < 24;
      this.#follow = atBottom;
    });
  }

  append(events: SimEvent[]): void {
    if (events.length === 0) return;
    this.#buf.push(...events);
    if (this.#buf.length > CAP) {
      this.#buf = this.#buf.slice(this.#buf.length - CAP);
    }
    this.#render();
  }

  reset(): void {
    this.#buf = [];
    this.#follow = true;
    this.#render();
  }

  #render(): void {
    const frag = document.createDocumentFragment();
    for (const ev of this.#buf) {
      const li = document.createElement("li");
      li.className = `evt evt-${ev.kind}`;
      li.textContent = formatLine(ev);
      frag.appendChild(li);
    }
    this.#root.replaceChildren(frag);
    if (this.#follow) {
      this.#root.scrollTop = this.#root.scrollHeight;
    }
  }

  /** Snapshot of the buffer for CSV export. */
  snapshot(): SimEvent[] {
    return this.#buf.slice();
  }
}

function formatLine(ev: SimEvent): string {
  const kind = KIND_LABELS[ev.kind];
  const parts: string[] = [`t=${ev.tick}`, kind];
  if (ev.rider !== undefined) parts.push(`r${ev.rider}`);
  if (ev.elevator !== undefined) parts.push(`e${ev.elevator}`);
  if (ev.stop !== undefined) parts.push(`s${ev.stop}`);
  if (ev.origin !== undefined && ev.destination !== undefined) {
    parts.push(`${ev.origin}→${ev.destination}`);
  }
  if (ev.label) parts.push(ev.label);
  return parts.join("  ");
}
