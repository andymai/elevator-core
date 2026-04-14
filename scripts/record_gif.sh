#!/usr/bin/env bash
# Record the showcase scene as assets/demo.gif.
#
# Pipeline:
#   1. Run the `showcase` example with --record; it writes 200 PNG frames
#      into .recording/ (20 fps source, deterministic).
#   2. Use ffmpeg's two-pass palette filter for high-quality GIF encoding.
#
# Requirements: cargo, ffmpeg.
# Usage: ./scripts/record_gif.sh [output_path]

set -euo pipefail

OUT="${1:-assets/demo.gif}"
FRAME_DIR=".recording"
FPS=20

cd "$(dirname "$0")/.."

echo "==> Building showcase (release)"
cargo build --release --example showcase --quiet

echo "==> Capturing $FRAME_DIR/frame_*.png"
cargo run --release --example showcase --quiet -- --record

if ! command -v ffmpeg >/dev/null 2>&1; then
    echo "ffmpeg not found — PNG frames are in $FRAME_DIR/"
    exit 1
fi

echo "==> Building palette"
ffmpeg -y -loglevel error \
    -framerate "$FPS" -i "$FRAME_DIR/frame_%05d.png" \
    -vf "fps=$FPS,palettegen=stats_mode=diff" \
    "$FRAME_DIR/palette.png"

echo "==> Encoding $OUT"
mkdir -p "$(dirname "$OUT")"
ffmpeg -y -loglevel error \
    -framerate "$FPS" -i "$FRAME_DIR/frame_%05d.png" \
    -i "$FRAME_DIR/palette.png" \
    -lavfi "fps=$FPS [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle" \
    "$OUT"

SIZE=$(du -h "$OUT" | cut -f1)
echo "==> Done: $OUT ($SIZE)"
