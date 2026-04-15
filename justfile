# elevator-core development tasks
#
# Install just: https://github.com/casey/just
# Most targets focus on the elevator-ffi crate and its C# harness.

set shell := ["bash", "-cu"]

# Default: list available recipes
default:
    @just --list

# Build the FFI cdylib for the host platform
ffi-build:
    cargo build -p elevator-ffi --release

# Stage the host cdylib next to the C# harness binary so it can dlopen it
# without LD_LIBRARY_PATH gymnastics
ffi-stage: ffi-build
    mkdir -p examples/csharp-harness/runtimes/linux-x64/native
    cp target/release/libelevator_ffi.so examples/csharp-harness/runtimes/linux-x64/native/

# Build the C# harness
harness-build: ffi-stage
    cd examples/csharp-harness && dotnet build -c Release

# Run the smoke test: load default.ron, step 600 ticks, print metrics, assert non-zero throughput
harness-smoke: harness-build
    cd examples/csharp-harness && dotnet run -c Release -- ../../assets/config/default.ron

# Cross-compile the cdylib for Windows via mingw (requires x86_64-pc-windows-gnu target + mingw64-gcc)
ffi-build-windows:
    cargo build -p elevator-ffi --release --target x86_64-pc-windows-gnu

# Regenerate the C header (also runs as part of cargo build via build.rs)
ffi-header:
    cargo build -p elevator-ffi
    @echo "Header at: crates/elevator-ffi/include/elevator_ffi.h"

# Format and lint the FFI crate
ffi-check:
    cargo fmt --check -p elevator-ffi
    cargo clippy -p elevator-ffi -- -D warnings
    cargo test -p elevator-ffi
