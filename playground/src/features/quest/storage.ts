/**
 * Persistence for Quest editor state.
 *
 * Saves the player's in-flight code per stage so a refresh, a stage
 * swap, or a tab-restore doesn't wipe their work. Best-stars and
 * unlocked-stages live alongside this module in follow-up PRs; the
 * key prefix and helper shape are designed to extend.
 *
 * All localStorage access is wrapped in try/catch — Safari private
 * mode throws on `setItem`, Brave's shim can null the global, and
 * quota-exceeded surfaces as a thrown `QuotaExceededError`. The
 * editor must keep working even when persistence quietly fails, so
 * load returns `null` and save/clear are no-ops on any error.
 */
const KEY_PREFIX = "quest:code:v1:";

/**
 * Hard cap per saved entry. The localStorage origin quota is ~5MB on
 * most browsers; capping each stage at 50KB keeps the curriculum's
 * worst case (one entry per stage × ~20 stages) well under 1MB and
 * prevents a single runaway paste from starving every other slot.
 */
const MAX_CODE_BYTES = 50_000;

function storage(): Storage | null {
  // `globalThis.localStorage` is the safe access path: in jsdom it's
  // the same object as `window.localStorage`, and on platforms where
  // the shim is absent or throws on access it's catchable here once
  // instead of at every call site. Cast through `unknown` so the
  // null-check isn't elided by the DOM lib's "always defined" type.
  try {
    const ls = (globalThis as unknown as { localStorage?: Storage }).localStorage;
    return ls ?? null;
  } catch {
    return null;
  }
}

/** Read saved code for a stage, or `null` if no entry / unavailable. */
export function loadCode(stageId: string): string | null {
  const s = storage();
  if (!s) return null;
  try {
    return s.getItem(KEY_PREFIX + stageId);
  } catch {
    return null;
  }
}

/**
 * Write the player's code for a stage. Silently no-ops if the entry
 * exceeds the per-stage size cap or storage rejects the write.
 */
export function saveCode(stageId: string, code: string): void {
  if (code.length > MAX_CODE_BYTES) return;
  const s = storage();
  if (!s) return;
  try {
    s.setItem(KEY_PREFIX + stageId, code);
  } catch {
    // Quota / private mode — drop the write rather than surface to
    // the editor. The next save attempt will retry.
  }
}

/** Remove the saved entry for a stage. Useful for "reset to starter". */
export function clearCode(stageId: string): void {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(KEY_PREFIX + stageId);
  } catch {
    // ignore
  }
}
