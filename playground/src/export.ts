import type { Metrics, SimEvent } from "./types";

// CSV + GIF export helpers. GIF recording uses gif.js.optimized which runs the
// encoder in a Web Worker so frame capture doesn't block rendering.

/** Trigger a CSV file download from an array of events. */
export function downloadEventsCsv(events: SimEvent[], filename: string): void {
  const header = "tick,kind,rider,elevator,stop,origin,destination,label";
  const rows = events.map((e) =>
    [
      e.tick,
      e.kind,
      e.rider ?? "",
      e.elevator ?? "",
      e.stop ?? "",
      e.origin ?? "",
      e.destination ?? "",
      (e.label ?? "").replace(/,/g, ";"),
    ].join(","),
  );
  download(`${header}\n${rows.join("\n")}`, filename, "text/csv");
}

/** Trigger a CSV file download of metrics snapshots over time. */
export function downloadMetricsCsv(
  samples: Array<{ tick: number; metrics: Metrics }>,
  filename: string,
): void {
  const header =
    "tick,delivered,abandoned,spawned,throughput,avg_wait_s,max_wait_s,avg_ride_s,utilization";
  const rows = samples.map(({ tick, metrics: m }) =>
    [
      tick,
      m.delivered,
      m.abandoned,
      m.spawned,
      m.throughput,
      m.avg_wait_s.toFixed(3),
      m.max_wait_s.toFixed(3),
      m.avg_ride_s.toFixed(3),
      m.utilization.toFixed(4),
    ].join(","),
  );
  download(`${header}\n${rows.join("\n")}`, filename, "text/csv");
}

function download(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// GIF recorder. We dynamically import the library so it only loads when the
// user actually presses "Record" — saves ~60KB on first paint.
//
// gif.js.optimized is a drop-in replacement for gif.js that bundles its worker.

interface GifInstance {
  addFrame(canvas: HTMLCanvasElement, opts?: { delay?: number; copy?: boolean }): void;
  on(event: "finished", cb: (blob: Blob) => void): void;
  render(): void;
  abort(): void;
}
interface GifCtor {
  new (opts: {
    workers: number;
    quality: number;
    workerScript?: string;
    width: number;
    height: number;
    transparent?: number | null;
  }): GifInstance;
}

export class GifRecorder {
  #gif: GifInstance | null = null;
  #canvas: HTMLCanvasElement;
  #lastCapture = 0;
  #frameIntervalMs = 66; // ~15 fps

  constructor(canvas: HTMLCanvasElement) {
    this.#canvas = canvas;
  }

  get isRecording(): boolean {
    return this.#gif !== null;
  }

  async start(): Promise<void> {
    if (this.#gif) return;
    const mod = (await import("gif.js.optimized")) as unknown as { default: GifCtor };
    const { width, height } = this.#canvas;
    this.#gif = new mod.default({
      workers: 2,
      quality: 10,
      width,
      height,
      transparent: null,
    });
    this.#lastCapture = performance.now();
  }

  captureIfDue(): void {
    if (!this.#gif) return;
    const now = performance.now();
    if (now - this.#lastCapture < this.#frameIntervalMs) return;
    this.#gif.addFrame(this.#canvas, { delay: this.#frameIntervalMs, copy: true });
    this.#lastCapture = now;
  }

  async finish(filename: string): Promise<void> {
    if (!this.#gif) return;
    const gif = this.#gif;
    this.#gif = null;
    await new Promise<void>((resolve) => {
      gif.on("finished", (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        resolve();
      });
      gif.render();
    });
  }

  abort(): void {
    this.#gif?.abort();
    this.#gif = null;
  }
}
