/**
 * Persistence for Quest editor state and progression.
 *
 * Saves the player's in-flight code per stage so a refresh, a stage
 * swap, or a tab-restore doesn't wipe their work, and tracks the
 * best star count per stage so the navigator can show progress.
 *
 * All localStorage access is wrapped in try/catch — Safari private
 * mode throws on `setItem`, Brave's shim can null the global, and
 * quota-exceeded surfaces as a thrown `QuotaExceededError`. The
 * editor must keep working even when persistence quietly fails, so
 * load returns `null` / 0 and save/clear are no-ops on any error.
 */
import type { StarCount } from "./stages";

const CODE_PREFIX = "quest:code:v1:";
const STARS_PREFIX = "quest:bestStars:v1:";

/**
 * Hard cap per saved entry, measured in `String.length` (UTF-16 code
 * units, ≈ ASCII chars). The localStorage origin quota is ~5MB on
 * most browsers; capping each stage at 50_000 chars keeps the
 * curriculum's worst case (one entry per stage × ~20 stages) well
 * under 1MB and prevents a single runaway paste from starving every
 * other slot.
 */
const MAX_CODE_LENGTH = 50_000;

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

/**
 * Read saved code for a stage, or `null` if no entry / unavailable.
 *
 * Mirrors the `MAX_CODE_LENGTH` cap on the read path: if storage
 * holds an oversized entry (a different tab, a manual devtools poke,
 * or a future cap change), evict it and return `null`. Otherwise the
 * editor would load a value that subsequent saves silently refuse,
 * making edits *appear* to persist while every refresh reverts them.
 */
export function loadCode(stageId: string): string | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(CODE_PREFIX + stageId);
    if (raw === null) return null;
    if (raw.length > MAX_CODE_LENGTH) {
      try {
        s.removeItem(CODE_PREFIX + stageId);
      } catch {
        /* eviction is best-effort */
      }
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

/**
 * Write the player's code for a stage. Silently no-ops if the entry
 * exceeds the per-stage size cap or storage rejects the write.
 */
export function saveCode(stageId: string, code: string): void {
  if (code.length > MAX_CODE_LENGTH) return;
  const s = storage();
  if (!s) return;
  try {
    s.setItem(CODE_PREFIX + stageId, code);
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
    s.removeItem(CODE_PREFIX + stageId);
  } catch {
    // ignore
  }
}

/**
 * Read the best star count earned on a stage, or `0` if no entry, the
 * stored value is malformed, or storage is unavailable. Stars are
 * stored as a single decimal digit ("0"–"3") rather than JSON so a
 * corrupted entry parses cleanly to a sentinel rather than throwing.
 */
export function loadBestStars(stageId: string): StarCount {
  const s = storage();
  if (!s) return 0;
  let raw: string | null;
  try {
    raw = s.getItem(STARS_PREFIX + stageId);
  } catch {
    return 0;
  }
  if (raw === null) return 0;
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 0 || n > 3) return 0;
  return n as StarCount;
}

/**
 * Write the best star count for a stage, but only if `stars` is
 * higher than the current entry. A graded run that scored fewer
 * stars than the player's previous attempt should not regress the
 * persisted score.
 */
export function saveBestStars(stageId: string, stars: StarCount): void {
  const current = loadBestStars(stageId);
  if (stars <= current) return;
  const s = storage();
  if (!s) return;
  try {
    s.setItem(STARS_PREFIX + stageId, String(stars));
  } catch {
    // Quota / private mode — drop the write.
  }
}

/** Remove the best-stars entry for a stage. Mostly useful for tests. */
export function clearBestStars(stageId: string): void {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(STARS_PREFIX + stageId);
  } catch {
    // ignore
  }
}
