import type { EventDto } from "../../types";

/**
 * Call log: a unified, append-only stream of outgoing API
 * invocations (`→`) and incoming engine events (`←`). The right-rail
 * panel surfaces this as the bottom strip. Lines are monospace,
 * colour-coded by direction, capped at `MAX_LINES`, and rendered
 * newest-first so the latest activity is always visible without
 * scrolling.
 */

const MAX_LINES = 30;

/** Engine events worth surfacing in the log. The full set is wider; this is the curated subset. */
const SURFACED_EVENT_KINDS = new Set([
  "rider-spawned",
  "rider-boarded",
  "rider-exited",
  "rider-abandoned",
  "door-opened",
  "door-closed",
  "elevator-assigned",
]);

export interface CallLogHandle {
  /** Log an outgoing API call (no failure). */
  call(signature: string): void;
  /**
   * Log an outgoing API call that threw. The exception message is
   * rendered on a continuation line so the cause is easy to spot.
   */
  callFailed(signature: string, err: unknown): void;
  /** Append the curated subset of engine events from a `drainEvents` batch. */
  events(batch: EventDto[]): void;
  /** Reset the log (used on scenario switch / sim reset). */
  clear(): void;
  dispose(): void;
}

export function mountCallLog(container: HTMLElement): CallLogHandle {
  container.replaceChildren();
  // Internal ring buffer — we re-render the DOM from this on every
  // append, which is far simpler than splicing nodes and stays well
  // under 1 ms at MAX_LINES = 30.
  const lines: Array<{ text: string; kind: "call" | "error" | "event" }> = [];

  const render = (): void => {
    container.replaceChildren();
    for (const line of lines) {
      const li = document.createElement("li");
      li.className = "api-call-log-line";
      li.dataset["kind"] = line.kind;
      li.textContent = line.text;
      container.appendChild(li);
    }
  };

  const push = (text: string, kind: "call" | "error" | "event"): void => {
    lines.unshift({ text, kind });
    if (lines.length > MAX_LINES) lines.length = MAX_LINES;
    render();
  };

  return {
    call(signature) {
      push(`→ ${signature}`, "call");
    },
    callFailed(signature, err) {
      const msg = err instanceof Error ? err.message : String(err);
      push(`→ ${signature}  ✗ ${msg}`, "error");
    },
    events(batch) {
      for (const ev of batch) {
        if (!SURFACED_EVENT_KINDS.has(ev.kind)) continue;
        push(`← ${formatEvent(ev)}`, "event");
      }
    },
    clear() {
      lines.length = 0;
      render();
    },
    dispose() {
      lines.length = 0;
      container.replaceChildren();
    },
  };
}

function formatEvent(ev: EventDto): string {
  switch (ev.kind) {
    case "rider-spawned":
      return `rider-spawned r${ev.rider} ${ev.origin}→${ev.destination}`;
    case "rider-boarded":
      return `rider-boarded r${ev.rider} into e${ev.elevator}`;
    case "rider-exited":
      return `rider-exited r${ev.rider} at s${ev.stop}`;
    case "rider-abandoned":
      return `rider-abandoned r${ev.rider} at s${ev.stop}`;
    case "door-opened":
      return `door-opened e${ev.elevator}`;
    case "door-closed":
      return `door-closed e${ev.elevator}`;
    case "elevator-assigned":
      return `elevator-assigned e${ev.elevator} → s${ev.stop}`;
    default:
      return ev.kind;
  }
}
