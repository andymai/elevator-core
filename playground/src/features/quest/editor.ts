/**
 * Lazy-loaded Monaco editor for Quest mode.
 *
 * Exposes a small handle so callers (Q-05's player-code execution) can
 * mount an editor, read/write the code, and dispose it without
 * importing Monaco directly. The Monaco bundle (~3MB) only loads when
 * `mountQuestEditor` is first called — Compare-mode users never pay
 * the cost.
 *
 * The editor's web workers (TS language service + the generic editor
 * worker) are configured via `MonacoEnvironment` on first mount so
 * code completion, syntax checking, and language services run off the
 * main thread.
 */

import type * as Monaco from "monaco-editor";

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
  /** Subscribe to text changes. Returns an unsubscribe handle. */
  onDidChange(listener: (value: string) => void): { dispose(): void };
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

/** Mount a Monaco editor in the supplied container. */
export async function mountQuestEditor(opts: EditorMountOptions): Promise<QuestEditor> {
  const monaco = await loadMonaco();
  const editor = monaco.editor.create(opts.container, {
    value: opts.initialValue,
    language: opts.language ?? "typescript",
    theme: "vs-dark",
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
        listener(editor.getValue());
      });
      return {
        dispose: () => {
          sub.dispose();
        },
      };
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
