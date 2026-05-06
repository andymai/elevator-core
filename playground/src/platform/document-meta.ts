// Low-level DOM helpers for keeping <head> meta tags in sync with the
// running app. The wider composition — turning permalink state into a
// title and description — lives in shell/document-meta.ts so this layer
// stays unaware of domain types, per the platform → types-only
// boundary.

/**
 * Remove the static SEO + no-JS fallback block. The block is hidden
 * via CSS as soon as the inline `<head>` script tags `<html>` with
 * `.js`, so this is purely a DOM clean-up: shrinks the live document
 * and prevents the static copy from being read by assistive tech that
 * walks display:none subtrees.
 */
export function removeStaticSeoBlock(): void {
  const node = document.getElementById("seo-fallback");
  node?.remove();
}

export interface DocumentMeta {
  title: string;
  description: string;
}

/**
 * Set the document title plus the description, OG, and Twitter meta
 * tags that share that copy. Tags are looked up by selector and
 * mutated in place — no tag is created here, so the static
 * `index.html` is the source of truth for which tags exist. If a tag
 * is missing from HTML, this is a silent no-op rather than a runtime
 * error; the SEO baseline still holds via the original static values.
 */
export function setDocumentMeta(meta: DocumentMeta): void {
  if (document.title !== meta.title) document.title = meta.title;

  setAttr('meta[name="description"]', "content", meta.description);
  setAttr('meta[property="og:title"]', "content", meta.title);
  setAttr('meta[property="og:description"]', "content", meta.description);
  setAttr('meta[name="twitter:title"]', "content", meta.title);
  setAttr('meta[name="twitter:description"]', "content", meta.description);
}

function setAttr(selector: string, attr: string, value: string): void {
  const el = document.querySelector(selector);
  if (!el) return;
  if (el.getAttribute(attr) === value) return;
  el.setAttribute(attr, value);
}
