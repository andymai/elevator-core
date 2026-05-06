import { reconcileStrategyWithScenario } from "../features/scenario-picker";
import { applyPlaygroundMode, wireModeToggle } from "../features/mode-toggle";
import { bootQuestPane } from "../features/quest";
import {
  DEFAULT_STATE,
  compactOverrides,
  decodePermalink,
  hashSeedWord,
  onPermalinkSync,
  scenarioById,
  syncPermalinkUrl,
} from "../domain";
import { removeStaticSeoBlock } from "../platform";
import { loadWasm, TrafficDriver } from "../sim";
import type { State } from "./state";
import { wireUi } from "./wire-ui";
import { applyPermalinkToUi, randomSeedWord } from "./apply-permalink";
import { attachListeners } from "./listeners";
import { updateRuntimeMeta } from "./document-meta";
import { resetAll } from "./reset";
import { loop } from "./loop";

export async function boot(): Promise<void> {
  // Kick off the wasm fetch + compile *before* DOM wiring so the
  // ~hundreds-of-ms WebAssembly.instantiate overlaps with synchronous
  // JS work (scenario-card rendering, handle lookups, permalink
  // decode). `loadWasm` memoises via an internal promise, so the
  // subsequent `Sim.create` calls in `makePane` await the same
  // module without re-fetching.
  const wasmReady = loadWasm();
  // Swallow rejections here; `makePane` will re-await the same
  // promise and surface the error through the Init-failed toast.
  wasmReady.catch(() => {});
  const ui = wireUi();
  // Detect "first load" = bare URL with no seed explicitly in it.
  // On first load we roll a random seed word and push it back via
  // `replaceState` so *refresh* stays reproducible (the URL now
  // carries the rolled seed). Shared links naturally carry `k=…` so
  // they take the else branch and use the sender's seed as-is.
  const hadSeedInUrl = new URLSearchParams(window.location.search).has("k");
  const permalink = { ...DEFAULT_STATE, ...decodePermalink(window.location.search) };
  if (!hadSeedInUrl) {
    permalink.seed = randomSeedWord();
    const url = new URL(window.location.href);
    url.searchParams.set("k", permalink.seed);
    window.history.replaceState(null, "", url.toString());
  }
  // If the permalink points at a scenario we don't have, fall back to the
  // scenario's `defaultStrategy` for pane A so "Share link from hotel"
  // doesn't deliver a mismatched config to the recipient.
  reconcileStrategyWithScenario(permalink);
  const scenario = scenarioById(permalink.scenario);
  // Cold-boot reposition default: if the URL didn't carry explicit
  // `pa` / `pb` and the scenario advertises a `defaultReposition`,
  // apply it to whichever pane(s) defaulted. Mirrors `switchScenario`
  // so opening `?s=space-elevator` directly behaves the same as
  // picking the scenario card from another scenario — without it, a
  // fresh visitor lands on the tether with `lobby` parking and every
  // idle climber slides back to the ground. Compare mode is *not*
  // gated here: a fresh visitor in default compare-on mode otherwise
  // misses the snap entirely and both panes inherit the global
  // default.
  const urlSearch = new URLSearchParams(window.location.search);
  if (scenario.defaultReposition !== undefined) {
    if (!urlSearch.has("pa")) {
      permalink.repositionA = scenario.defaultReposition;
    }
    if (!urlSearch.has("pb")) {
      permalink.repositionB = scenario.defaultReposition;
    }
  }
  // Compact decoded overrides against the resolved scenario so a URL
  // that carries values matching the current default (possible if a
  // scenario default shifted between share-time and load-time) doesn't
  // spuriously auto-open the drawer with zero active highlights.
  // `encodePermalink`'s contract is that callers compact first; this
  // is the decode-side counterpart, done once at boot rather than in
  // every subsequent write path.
  permalink.overrides = compactOverrides(scenario, permalink.overrides);
  // Apply mode-derived visibility before any paint: a `?m=quest`
  // deep-link should never flash the compare-mode chrome. Wiring the
  // toggle here also avoids a second pass over the same DOM nodes.
  applyPlaygroundMode(permalink.mode);
  wireModeToggle(permalink.mode);
  applyPermalinkToUi(permalink, ui);
  const state: State = {
    running: true,
    ready: false,
    permalink,
    paneA: null,
    paneB: null,
    traffic: new TrafficDriver(hashSeedWord(permalink.seed)),
    lastFrameTime: performance.now(),
    initToken: 0,
    seeding: null,
  };
  attachListeners(state, ui);
  // Keep <title>, description, OG, and Twitter copy in lock-step with
  // permalink commits. Subscribe once; every scenario / strategy /
  // parking / compare / quest-stage change funnels through
  // syncPermalinkUrl, which fans out to subscribers.
  onPermalinkSync(updateRuntimeMeta);
  // Sync once at boot so the title reflects the resolved permalink
  // before the first frame paints (the subscription only fires on
  // *changes*, not on initial state).
  updateRuntimeMeta(permalink);
  // Static SEO + no-JS fallback was hidden via CSS the moment the inline
  // `<head>` script set html.js, so this is purely a DOM clean-up.
  removeStaticSeoBlock();
  await resetAll(state, ui);
  state.ready = true;
  loop(state, ui);
  // Quest mode swaps the compare layout for the curriculum banner.
  // `bootQuestPane` lazy-loads Monaco, so the await is genuine —
  // the controls bar stays interactive in the meantime because boot
  // already completed the synchronous wiring above.
  if (state.permalink.mode === "quest") {
    // Land on the curriculum grid by default. Only short-circuit
    // straight to the stage view when the URL explicitly carries a
    // `?qs=` — that's the recipient-of-shared-link case where the
    // sender meant "look at this exact stage".
    const hadStageInUrl = new URLSearchParams(window.location.search).has("qs");
    await bootQuestPane({
      initialStageId: state.permalink.questStage,
      landOn: hadStageInUrl ? "stage" : "grid",
      // Both navigation paths funnel through `syncPermalinkUrl` so
      // the canonical query-string encoding lives in the permalink
      // domain module, not in ad-hoc `URL` construction here. This
      // is the seam that previously diverged: `onBackToGrid` cleared
      // `qs` directly via `URLSearchParams` while the encoder owns
      // its own "default → omit" rule. Routing both through the
      // domain function keeps them in lock-step.
      onStageChange: (stageId) => {
        state.permalink.questStage = stageId;
        syncPermalinkUrl(state.permalink);
      },
      onBackToGrid: () => {
        // Grid is the default cold-boot view, so reset to the
        // default stage id and let `encodePermalink` drop `qs`
        // because of the default-omit rule.
        state.permalink.questStage = DEFAULT_STATE.questStage;
        syncPermalinkUrl(state.permalink);
      },
    });
  }
}
