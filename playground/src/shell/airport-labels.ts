/**
 * Shared airport-scenario labels used by both the per-pane chip
 * override (`apply-permalink.ts`) and the document-title / SEO copy
 * (`document-meta.ts`). Centralised so the two stay in sync — the
 * airport's dispatch is hard-pinned in the RON per-group config, so
 * the global strategy chip is overridden and the title likewise needs
 * to read the actual running dispatch.
 */
export const AIRPORT_DISPATCH_LABEL = "LoopSchedule";
export const AIRPORT_DISPATCH_DESC = "Fixed-headway timetable on a one-way loop.";
