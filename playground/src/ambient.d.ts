/// <reference types="vite/client" />

// gif.js.optimized ships without types; our usage is narrow (default export
// constructor with addFrame / on / render), so a permissive declaration is
// fine — the strict types live at the call site in export.ts.
declare module "gif.js.optimized" {
  const GifCtor: unknown;
  export default GifCtor;
}
