import type { Pane } from "./pane";

/**
 * Persistent help caption pinned directly under the canvas in airport
 * scenarios. Teaches the loop-lines concept and points at the
 * `LineKind::Loop` type so the scene doubles as docs for that core
 * primitive. Lazily created on first render; removed when the active
 * scenario is not an airport.
 */

interface CaptionHandles {
  root: HTMLElement;
}

const captionByCanvas = new WeakMap<HTMLCanvasElement, CaptionHandles>();

export function updateAirportCaption(pane: Pane): void {
  const canvas = pane.renderer.canvas;
  const existing = captionByCanvas.get(canvas);
  if (!pane.scenario.airport) {
    existing?.root.remove();
    captionByCanvas.delete(canvas);
    return;
  }
  if (existing) return;
  const handles = createCaption(canvas);
  captionByCanvas.set(canvas, handles);
}

function createCaption(canvas: HTMLCanvasElement): CaptionHandles {
  const root = document.createElement("div");
  root.className =
    "airport-caption flex flex-col gap-0.5 px-3 py-2 text-[11px] text-content-secondary border-t border-stroke-subtle leading-snug";
  const concept = document.createElement("span");
  concept.textContent = "Loop lines — one-way circuits where trains never overtake.";
  const codePointer = document.createElement("code");
  codePointer.className =
    "font-mono text-[10.5px] text-content-tertiary tracking-tight whitespace-nowrap overflow-hidden text-ellipsis";
  codePointer.textContent = "LineKind::Loop { circumference, min_headway } — elevator-core";
  root.append(concept, codePointer);
  // Canvas lives inside `.shaft-wrap`. The metrics strip sits ABOVE the
  // canvas (see index.html); inserting after the wrap puts the caption
  // visually directly below the canvas, which is the pedagogical anchor.
  const wrap = canvas.parentElement;
  wrap?.insertAdjacentElement("afterend", root);
  return { root };
}
