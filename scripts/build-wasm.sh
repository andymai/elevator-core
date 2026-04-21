#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_DIR="$ROOT_DIR/playground/public/pkg"

# Resolve the shared target dir (may differ from ./target if .cargo/config.toml
# sets build.target-dir).
TARGET_DIR="$(cargo metadata --format-version 1 --no-deps 2>/dev/null \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['target_directory'])" 2>/dev/null \
  || echo "$ROOT_DIR/target")"
WASM_PATH="$TARGET_DIR/wasm32-unknown-unknown/release/elevator_wasm.wasm"

# Verify wasm-bindgen-cli version matches the crate version in the lockfile.
EXPECTED="$(cargo metadata --format-version 1 2>/dev/null \
  | python3 -c "
import sys, json
pkgs = json.load(sys.stdin)['packages']
print(next(p['version'] for p in pkgs if p['name'] == 'wasm-bindgen'))
")"
ACTUAL="$(wasm-bindgen --version 2>/dev/null | awk '{print $2}' || echo "not-installed")"
if [ "$EXPECTED" != "$ACTUAL" ]; then
  echo "error: wasm-bindgen CLI $ACTUAL != crate $EXPECTED" >&2
  echo "  Run: cargo install wasm-bindgen-cli@$EXPECTED --locked" >&2
  echo "  Or:  cargo binstall wasm-bindgen-cli@$EXPECTED" >&2
  exit 1
fi

echo "Building elevator-wasm (release)..."
cargo build -p elevator-wasm --target wasm32-unknown-unknown --release

echo "Generating bindings..."
mkdir -p "$OUT_DIR"
wasm-bindgen "$WASM_PATH" \
  --out-dir "$OUT_DIR" \
  --target web \
  --typescript

echo "Done → $OUT_DIR"
