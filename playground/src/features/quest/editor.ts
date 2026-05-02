/**
 * Lazy-loaded Monaco editor for Quest mode.
 *
 * Exposes a small handle so callers can mount an editor, read/write
 * the code, and dispose it without importing Monaco directly. The
 * Monaco bundle (~3MB) only loads when `mountQuestEditor` is first
 * called — Compare-mode users never pay the cost.
 *
 * The editor's web workers (TS language service + the generic editor
 * worker) are configured via `MonacoEnvironment` on first mount so
 * code completion, syntax checking, and language services run off the
 * main thread.
 */

import type * as Monaco from "monaco-editor";
import { SIM_GLOBALS_DTS } from "./sim-globals-dts";

export interface EditorMountOptions {
  /** Container element the editor will fill. */
  readonly container: HTMLElement;
  /** Initial code shown in the editor. */
  readonly initialValue: string;
  /** TS or JS — defaults to TypeScript so JSDoc hover docs work. */
  readonly language?: "typescript" | "javascript";
  /** Read-only flag — useful for reference-solution display. */
  readonly readOnly?: boolean;
}

export interface QuestEditor {
  /** Current text in the editor. */
  getValue(): string;
  /** Replace the editor's text. */
  setValue(text: string): void;
  /**
   * Subscribe to text changes. The listener is called with no
   * argument to avoid a `getValue()` allocation on every keystroke;
   * call `getValue()` from the listener if the current text is
   * actually needed.
   */
  onDidChange(listener: () => void): { dispose(): void };
  /** Insert `text` at the current cursor position and focus the editor. */
  insertAtCursor(text: string): void;
  /** Tear down the editor and free its DOM/worker resources. */
  dispose(): void;
}

let monacoModule: typeof Monaco | null = null;
let monacoLoading: Promise<typeof Monaco> | null = null;

/**
 * Load Monaco's editor API on demand. First call kicks off the import
 * + worker registration; subsequent calls reuse the cached module.
 */
export async function loadMonaco(): Promise<typeof Monaco> {
  if (monacoModule) return monacoModule;
  if (monacoLoading) return monacoLoading;
  monacoLoading = (async () => {
    await configureWorkerEnvironment();
    const mod = await import("monaco-editor");
    monacoModule = mod;
    return mod;
  })();
  // Clear the cached promise on rejection so a transient failure
  // (network error, CSP block, worker spawn failure) doesn't pin
  // every future call to the same dead promise. Successful loads
  // keep `monacoModule` set, so the next call short-circuits via the
  // top-of-function early return.
  monacoLoading.catch(() => {
    monacoLoading = null;
  });
  return monacoLoading;
}

/** Configure Monaco's `getWorker` to use Vite's `?worker` imports. */
async function configureWorkerEnvironment(): Promise<void> {
  // `MonacoEnvironment` is a global Monaco reads on init. Without
  // wiring up the workers, every keystroke drops a "could not
  // create web worker" warning and language services degrade
  // silently.
  //
  // The earlier `new URL("monaco-editor/...", import.meta.url)`
  // pattern works in dev (where Vite's middleware resolves bare
  // module specifiers) but breaks the production build: Vite's
  // `worker-import-meta-url` plugin treats the first arg as a
  // path relative to the importing file, so it tries to resolve
  // `src/features/quest/monaco-editor/...` and fails. The `?worker`
  // suffix is the documented escape hatch — Vite emits each worker
  // into its own chunk via Rollup, no relative-path heuristics
  // involved.
  const [{ default: TsWorker }, { default: EditorWorker }] = await Promise.all([
    import("monaco-editor/esm/vs/language/typescript/ts.worker?worker"),
    import("monaco-editor/esm/vs/editor/editor.worker?worker"),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).MonacoEnvironment = {
    getWorker(_workerId: string, label: string): Worker {
      if (label === "typescript" || label === "javascript") {
        return new TsWorker();
      }
      return new EditorWorker();
    },
  };
}

/**
 * Minimal shape of the Monaco TypeScript defaults surface we touch.
 * Monaco's published types mark the entire `languages.typescript`
 * subpath as `{ deprecated: true }`, hiding the actual runtime API
 * behind that opaque flag — the surface still exists and works,
 * we just have to declare the slice we need.
 */
interface TypescriptDefaults {
  setCompilerOptions(options: Record<string, unknown>): void;
  addExtraLib(content: string, filePath?: string): { dispose(): void };
}

/**
 * Configure Monaco's TypeScript service so the player's controller
 * code typechecks correctly:
 *
 *   - Target ES2020 — `0n` BigInt literals, optional chaining, `??`.
 *   - Lib `esnext` — every globals the player might reach for.
 *   - Relaxed strictness — the curriculum welcomes JS-shaped code,
 *     and "you didn't return on every branch" warnings are not the
 *     teaching here.
 *   - `addExtraLib(SIM_GLOBALS_DTS)` so `sim.foo(...)` doesn't paint
 *     the whole file with "Cannot find name 'sim'" squigglies.
 *
 * Idempotent: Monaco's `setCompilerOptions` and `addExtraLib`
 * accept repeated calls; the latter dedupes by path.
 */
function configureTypeScriptService(monaco: typeof Monaco): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tsModule = (monaco.languages as any).typescript as
    | { typescriptDefaults?: TypescriptDefaults }
    | undefined;
  const ts = tsModule?.typescriptDefaults;
  if (!ts) return; // Monaco was loaded without the TS service — leave defaults alone.
  // Numeric enum values from the upstream `typescript` package.
  // ES2020 = 7 (covers BigInt, optional chaining, nullish coalesce).
  // ESNext = 99.
  ts.setCompilerOptions({
    target: 7,
    module: 99,
    lib: ["esnext"],
    allowJs: true,
    checkJs: false,
    noImplicitAny: false,
    strict: false,
    noUnusedLocals: false,
    noUnusedParameters: false,
    noImplicitReturns: false,
    allowNonTsExtensions: true,
  });
  // The `ts:filename/` namespace is Monaco's convention for ambient
  // lib files. Pinning a stable path means a hot reload (or a
  // re-mount in tests) replaces the lib in place rather than
  // accumulating duplicates.
  ts.addExtraLib(SIM_GLOBALS_DTS, "ts:filename/quest-sim-globals.d.ts");
}

/**
 * Define a Monaco theme keyed off the playground's warm-dark palette
 * so the editor sits inside a container styled with `--bg-*` /
 * `--text-*` without standing out as a cooler-toned rectangle.
 *
 * Colour values are pinned literals (Monaco's theme API doesn't
 * resolve CSS custom properties), kept in sync with `:root` in
 * `style.css`. The base `vs-dark` is inherited so token-level syntax
 * highlighting comes along for free; only chrome (background, line
 * numbers, selection, cursor, scrollbar) gets retinted.
 *
 * Idempotent — Monaco lets `defineTheme` re-register the same name.
 * Called from `mountQuestEditor` after `loadMonaco`, so multiple
 * mounts on the same page redefine without harm.
 */
function registerWarmDarkTheme(monaco: typeof Monaco): void {
  monaco.editor.defineTheme("quest-warm-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#0f0f12", // --bg-primary
      "editor.foreground": "#fafafa", // --text-primary
      "editorLineNumber.foreground": "#6b6b75", // --text-disabled
      "editorLineNumber.activeForeground": "#a1a1aa", // --text-secondary
      "editor.lineHighlightBackground": "#1a1a1f", // --bg-secondary
      "editor.lineHighlightBorder": "#1a1a1f00",
      "editor.selectionBackground": "#323240", // --bg-active
      "editor.inactiveSelectionBackground": "#252530", // --bg-elevated
      "editor.selectionHighlightBackground": "#2a2a35", // --bg-hover
      "editorCursor.foreground": "#f59e0b", // --accent
      "editorWhitespace.foreground": "#3a3a45", // --border-default
      "editorIndentGuide.background1": "#2a2a35", // --border-subtle
      "editorIndentGuide.activeBackground1": "#3a3a45", // --border-default
      "editor.findMatchBackground": "#fbbf2440", // --accent-up + alpha
      "editor.findMatchHighlightBackground": "#fbbf2420",
      "editorBracketMatch.background": "#3a3a4580",
      "editorBracketMatch.border": "#f59e0b80",
      "editorOverviewRuler.border": "#2a2a35",
      "scrollbar.shadow": "#00000000",
      "scrollbarSlider.background": "#3a3a4540",
      "scrollbarSlider.hoverBackground": "#3a3a4580",
      "scrollbarSlider.activeBackground": "#3a3a45c0",
      "editorWidget.background": "#1a1a1f", // --bg-secondary
      "editorWidget.border": "#3a3a45", // --border-default
      "editorSuggestWidget.background": "#1a1a1f",
      "editorSuggestWidget.border": "#3a3a45",
      "editorSuggestWidget.foreground": "#fafafa",
      "editorSuggestWidget.selectedBackground": "#323240",
      "editorSuggestWidget.highlightForeground": "#f59e0b",
      // Monaco draws the matched-prefix highlight in two states:
      // `highlightForeground` for unfocused rows, and a separate
      // `focusHighlightForeground` for the active row. Without the
      // focused variant, the focused row falls back to vs-dark's
      // cool-blue and breaks the warm-accent guarantee.
      "editorSuggestWidget.focusHighlightForeground": "#fbbf24", // --accent-up
      "editorHoverWidget.background": "#1a1a1f",
      "editorHoverWidget.border": "#3a3a45",
    },
  });
}

/** Mount a Monaco editor in the supplied container. */
export async function mountQuestEditor(opts: EditorMountOptions): Promise<QuestEditor> {
  const monaco = await loadMonaco();
  configureTypeScriptService(monaco);
  registerWarmDarkTheme(monaco);
  const editor = monaco.editor.create(opts.container, {
    value: opts.initialValue,
    language: opts.language ?? "typescript",
    theme: "quest-warm-dark",
    readOnly: opts.readOnly ?? false,
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 13,
    scrollBeyondLastLine: false,
    tabSize: 2,
  });
  return {
    getValue: () => editor.getValue(),
    setValue: (text) => {
      editor.setValue(text);
    },
    onDidChange(listener) {
      const sub = editor.onDidChangeModelContent(() => {
        listener();
      });
      return {
        dispose: () => {
          sub.dispose();
        },
      };
    },
    insertAtCursor(text: string) {
      // executeEdits drives the same undo stack as keyboard input,
      // so a player can ⌘Z away a snippet they didn't mean to insert.
      // Without a selection range Monaco needs an explicit one — use
      // the current cursor position, collapsed.
      const selection = editor.getSelection();
      const range = selection ?? {
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
      };
      editor.executeEdits("quest-snippet", [{ range, text, forceMoveMarkers: true }]);
      editor.focus();
    },
    dispose: () => {
      // Dispose the backing model first — `editor.dispose()` releases
      // the editor instance but leaves the `ITextModel` in Monaco's
      // global registry, which leaks across mount/unmount cycles when
      // the player switches stages.
      editor.getModel()?.dispose();
      editor.dispose();
    },
  };
}
