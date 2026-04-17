#!/usr/bin/env bash
# Build the elevator-ffi native library and copy it to the Unity
# project's Plugins directory. Run from anywhere.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PLUGIN_DIR="$SCRIPT_DIR/Assets/Plugins/Native"

echo "Building elevator-ffi (release)..."
cargo build -p elevator-ffi --release

mkdir -p "$PLUGIN_DIR"

# Detect platform and copy the compiled library.
case "$(uname -s)" in
    Linux*)
        cp "$REPO_ROOT/target/release/libelevator_ffi.so" "$PLUGIN_DIR/"
        echo "Copied libelevator_ffi.so to $PLUGIN_DIR/"
        ;;
    Darwin*)
        cp "$REPO_ROOT/target/release/libelevator_ffi.dylib" "$PLUGIN_DIR/"
        echo "Copied libelevator_ffi.dylib to $PLUGIN_DIR/"
        ;;
    MINGW*|MSYS*|CYGWIN*)
        cp "$REPO_ROOT/target/release/elevator_ffi.dll" "$PLUGIN_DIR/"
        echo "Copied elevator_ffi.dll to $PLUGIN_DIR/"
        ;;
    *)
        echo "Unknown platform: $(uname -s)" >&2
        exit 1
        ;;
esac

echo "Done. Open the project in Unity, then use Elevator > Create Demo Scene."
