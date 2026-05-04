#!/usr/bin/env bash
# Build + run the GMS-shaped C harness against the in-tree
# libelevator_ffi cdylib.
#
# Usage from the repo root:
#     cargo build -p elevator-ffi --release
#     bash examples/gms2-harness/build.sh
#
# CI invokes this from .github/workflows/ci.yml after the cdylib is
# already built. The script assumes the cdylib lives at the standard
# `target/release/<name>` location and the cbindgen header is at
# `crates/elevator-ffi/include/elevator_ffi.h`.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HEADER_DIR="$ROOT/crates/elevator-ffi/include"
HARNESS_DIR="$ROOT/examples/gms2-harness"
OUT="$HARNESS_DIR/gms_harness"
CONFIG="$ROOT/assets/config/default.ron"

# Resolve cargo's effective target directory. The workspace's
# .cargo/config.toml may redirect [build] target-dir to a shared
# cache (so worktrees skip the cold Bevy build); fall back to
# $ROOT/target if cargo metadata isn't available.
if command -v cargo >/dev/null 2>&1; then
  CARGO_TARGET_DIR="$(cd "$ROOT" && cargo metadata --format-version 1 --no-deps 2>/dev/null \
    | sed -n 's/.*"target_directory":"\([^"]*\)".*/\1/p')"
fi
TARGET_DIR="${CARGO_TARGET_DIR:-$ROOT/target}/release"

case "${OS:-$(uname -s)}" in
  Windows_NT|MINGW*|MSYS*|CYGWIN*)
    LIB_NAME="elevator_ffi.dll"
    CC="${CC:-cc}"
    OUT="$HARNESS_DIR/gms_harness.exe"
    ;;
  Darwin)
    LIB_NAME="libelevator_ffi.dylib"
    CC="${CC:-cc}"
    ;;
  *)
    LIB_NAME="libelevator_ffi.so"
    CC="${CC:-cc}"
    ;;
esac

if [[ ! -f "$TARGET_DIR/$LIB_NAME" ]]; then
  echo "error: $TARGET_DIR/$LIB_NAME not found — run 'cargo build -p elevator-ffi --release' first" >&2
  exit 1
fi

# Build, linking against the cdylib by name. -L points at target/release
# so the linker resolves -lelevator_ffi (Linux) / loads the .dylib
# directly (macOS) / loads the .lib import library (Windows).
echo "building $OUT"
"$CC" -std=c11 -Wall -Wextra -O2 \
  -I"$HEADER_DIR" \
  "$HARNESS_DIR/main.c" \
  -L"$TARGET_DIR" -lelevator_ffi \
  -o "$OUT"

echo "running $OUT $CONFIG"
case "${OS:-$(uname -s)}" in
  Darwin)
    DYLD_LIBRARY_PATH="$TARGET_DIR" "$OUT" "$CONFIG"
    ;;
  Windows_NT|MINGW*|MSYS*|CYGWIN*)
    PATH="$TARGET_DIR:$PATH" "$OUT" "$CONFIG"
    ;;
  *)
    LD_LIBRARY_PATH="$TARGET_DIR" "$OUT" "$CONFIG"
    ;;
esac
