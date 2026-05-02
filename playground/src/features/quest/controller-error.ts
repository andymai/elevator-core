/**
 * Custom error class carrying the line/column where a player's
 * controller threw, so the host can pin a Monaco marker at that
 * location instead of just dumping the message into a status span.
 *
 * Worker.ts captures the stack on `new Function`-evaluation throws
 * and extracts the `<anonymous>:N:M` frame; worker-sim re-throws as
 * a `ControllerError` so the stage-runner / quest-pane catch path
 * can branch on it without awkward duck-typing.
 */

export interface ControllerErrorLocation {
  /** 1-based line number in the player's source. */
  readonly line: number;
  /** 1-based column number. May be approximate on older browsers. */
  readonly column: number;
}

export class ControllerError extends Error {
  readonly location: ControllerErrorLocation | null;

  constructor(message: string, location: ControllerErrorLocation | null) {
    super(message);
    this.name = "ControllerError";
    this.location = location;
  }
}

/**
 * Pull the topmost `:line:column` pair out of an error stack. Browsers
 * differ on the exact frame format (Chrome's `at anonymous:5:10`,
 * Safari's `<anonymous>:5:10`, Firefox's `@<anonymous>:5:10`), but
 * they all end frames with `:N:M` (sometimes wrapped in parens).
 *
 * Returns `null` when no frame matches — the caller should fall back
 * to an inline message instead of pinning a marker at a guessed line.
 */
const TRAILING_LINE_COL = /:(\d+):(\d+)\)?\s*$/;

export function extractTopFrameLineCol(stack: string | undefined): ControllerErrorLocation | null {
  if (!stack) return null;
  for (const raw of stack.split("\n")) {
    const match = TRAILING_LINE_COL.exec(raw.trim());
    if (!match) continue;
    const line = Number.parseInt(match[1] ?? "", 10);
    const column = Number.parseInt(match[2] ?? "", 10);
    if (Number.isInteger(line) && Number.isInteger(column)) {
      return { line, column };
    }
  }
  return null;
}
