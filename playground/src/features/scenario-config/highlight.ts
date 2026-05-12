/**
 * Minimal RON syntax highlighter for the scenario-config panel.
 *
 * Hand-rolled rather than pulling Prism/highlight.js: the RON grammar
 * is small enough that a single regex covers it, and the playground
 * bundle stays library-free. Returns a DocumentFragment of styled
 * line rows so callers can mount with `replaceChildren` — no innerHTML.
 */

const TOKEN_RE =
  /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?)|([A-Z][A-Za-z0-9_]*)|([a-z_][A-Za-z0-9_]*)(?=\s*:)|([A-Za-z_][A-Za-z0-9_]*)/g;

export type RonToken = { cls: "" | "ron-c" | "ron-s" | "ron-n" | "ron-t" | "ron-k"; text: string };

/**
 * Tokenize a single source line. Exported so unit tests can pin the
 * grammar without a DOM environment; runtime callers should use
 * `highlightRon`, which mounts these tokens into safe text nodes.
 */
export function tokenizeRonLine(line: string): RonToken[] {
  const out: RonToken[] = [];
  let last = 0;
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(line)) !== null) {
    if (m.index > last) out.push({ cls: "", text: line.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ cls: "ron-c", text: m[1] });
    else if (m[2] !== undefined) out.push({ cls: "ron-s", text: m[2] });
    else if (m[3] !== undefined) out.push({ cls: "ron-n", text: m[3] });
    else if (m[4] !== undefined) out.push({ cls: "ron-t", text: m[4] });
    else if (m[5] !== undefined) out.push({ cls: "ron-k", text: m[5] });
    else if (m[6] !== undefined) out.push({ cls: "", text: m[6] });
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ cls: "", text: line.slice(last) });
  return out;
}

/**
 * Build a row element for one source line: line-number cell on the
 * left, tokenized code on the right. Each token is a `<span>` whose
 * `textContent` is set safely; no innerHTML anywhere on the path.
 */
function buildRow(line: string, lineNumber: number): HTMLDivElement {
  const row = document.createElement("div");
  row.className = "ron-row";

  const ln = document.createElement("span");
  ln.className = "ron-ln";
  ln.textContent = String(lineNumber);
  row.appendChild(ln);

  const code = document.createElement("span");
  code.className = "ron-code";
  const tokens = tokenizeRonLine(line);
  if (tokens.length === 0) {
    // Preserve row height for blank source lines without injecting
    // an &nbsp; entity (textContent escapes it, so we'd render literal "&nbsp;").
    code.textContent = " ";
  } else {
    for (const t of tokens) {
      if (t.cls) {
        const span = document.createElement("span");
        span.className = t.cls;
        span.textContent = t.text;
        code.appendChild(span);
      } else {
        code.appendChild(document.createTextNode(t.text));
      }
    }
  }
  row.appendChild(code);
  return row;
}

/**
 * Render the source as a fragment of line rows. Mount with
 * `parent.replaceChildren(fragment)`.
 */
export function highlightRon(source: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    frag.appendChild(buildRow(lines[i] ?? "", i + 1));
  }
  return frag;
}

/**
 * Token-class enumeration used by both runtime CSS hooks and the
 * unit test that pins highlighter behavior. Exported so the test
 * can spot-check tokenization without re-deriving the class names.
 */
export const RON_TOKEN_CLASSES = {
  comment: "ron-c",
  string: "ron-s",
  number: "ron-n",
  type: "ron-t",
  key: "ron-k",
} as const;
