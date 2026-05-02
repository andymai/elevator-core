/**
 * Tiny DOM helpers shared across quest panel modules.
 *
 * Each panel previously rolled its own `getElementById` + null-check
 * + cast pattern and its own loop to clear children (we avoid
 * `innerHTML = ""` so the project's no-innerHTML rule doesn't get
 * tripped). Centralising the patterns trims ~30 LOC of boilerplate
 * and keeps the "missing anchor" error messages consistent for the
 * `quest-dom-guard` test to scrape.
 */

/**
 * Resolve a DOM anchor by id or throw a descriptive error. The
 * thrown message is the test-guard's parse target, so keep the
 * `<module>: missing #<id>` shape stable. Callers needing a more
 * specific subtype (e.g. `HTMLButtonElement`) cast at the use site.
 */
export function requireElement(id: string, module: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`${module}: missing #${id}`);
  return el;
}

/** Remove every child node of `root`. */
export function clearChildren(root: Node): void {
  while (root.firstChild) root.removeChild(root.firstChild);
}
