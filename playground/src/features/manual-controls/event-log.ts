import type { EventDto } from "../../types";

/**
 * Filter `drainEvents` output to a curated set the manual demo
 * surfaces in the event log. The full `EventDto` union covers
 * lifecycle + dispatch + door events; this UI keeps the high-signal
 * ones (boarding, exiting, doors, dispatch assignments) and ignores
 * the rest so the log doesn't become a wall of "elevator-departed".
 */
const SURFACED: ReadonlySet<EventDto["kind"]> = new Set([
  "rider-spawned",
  "rider-boarded",
  "rider-exited",
  "rider-abandoned",
  "door-opened",
  "door-closed",
  "elevator-assigned",
]);

const MAX_ENTRIES = 30;

/**
 * Append a frame's events to `logEl`, trimming to `MAX_ENTRIES`. Newest
 * first so users see the latest activity without scrolling.
 */
export function appendEvents(logEl: HTMLElement, events: EventDto[]): void {
  for (const ev of events) {
    if (!SURFACED.has(ev.kind)) continue;
    const li = document.createElement("li");
    li.dataset["kind"] = ev.kind;
    li.textContent = formatEvent(ev);
    logEl.insertBefore(li, logEl.firstChild);
  }
  // Trim from the bottom (oldest first since we prepend new entries).
  while (logEl.childElementCount > MAX_ENTRIES) {
    logEl.lastElementChild?.remove();
  }
}

function formatEvent(ev: EventDto): string {
  // Pad the tick column so successive entries align — 6 digits covers
  // the longest plausible session (~6 hours at 60 Hz).
  const tick = String(ev.tick).padStart(6, " ");
  switch (ev.kind) {
    case "rider-spawned":
      return `t=${tick} +rider r${ev.rider} ${ev.origin}→${ev.destination}`;
    case "rider-boarded":
      return `t=${tick} ▲ board r${ev.rider} into e${ev.elevator}`;
    case "rider-exited":
      return `t=${tick} ▼ exit  r${ev.rider} from e${ev.elevator} @${ev.stop}`;
    case "rider-abandoned":
      return `t=${tick} × abandon r${ev.rider} @${ev.stop}`;
    case "door-opened":
      return `t=${tick} doors open  e${ev.elevator}`;
    case "door-closed":
      return `t=${tick} doors close e${ev.elevator}`;
    case "elevator-assigned":
      return `t=${tick} dispatch e${ev.elevator} → ${ev.stop}`;
    default:
      return `t=${tick} ${ev.kind}`;
  }
}
