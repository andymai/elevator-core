#!/usr/bin/env bash
# Build the elevator-gdext GDExtension library and copy it to the Godot
# project's bin/ directory. Run from anywhere — paths are resolved
# relative to this script.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BIN_DIR="$SCRIPT_DIR/bin"

echo "Building elevator-gdext (release)..."
cargo build \
    --manifest-path "$REPO_ROOT/crates/elevator-gdext/Cargo.toml" \
    --release

mkdir -p "$BIN_DIR"

# Detect platform and copy the compiled library.
case "$(uname -s)" in
    Linux*)
        cp "$REPO_ROOT/target/release/libelevator_gdext.so" "$BIN_DIR/"
        echo "Copied libelevator_gdext.so to $BIN_DIR/"
        ;;
    Darwin*)
        cp "$REPO_ROOT/target/release/libelevator_gdext.dylib" "$BIN_DIR/"
        echo "Copied libelevator_gdext.dylib to $BIN_DIR/"
        ;;
    MINGW*|MSYS*|CYGWIN*)
        cp "$REPO_ROOT/target/release/elevator_gdext.dll" "$BIN_DIR/"
        echo "Copied elevator_gdext.dll to $BIN_DIR/"
        ;;
    *)
        echo "Unknown platform: $(uname -s)" >&2
        exit 1
        ;;
esac

echo "Done. Open the project in Godot 4.3+ and press Play."
