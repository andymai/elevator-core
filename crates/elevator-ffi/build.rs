//! Build script: regenerate the C header for `elevator-ffi` via cbindgen.
//!
//! The generated header lives at `include/elevator_ffi.h` and is committed
//! to the repository so that downstream consumers (C/C#/Unity) can use it
//! without needing a Rust toolchain.

use std::env;
use std::path::PathBuf;

fn main() {
    let crate_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap_or_else(|_| ".".into()));
    let config_path = crate_dir.join("cbindgen.toml");
    let out_dir = crate_dir.join("include");
    let out_path = out_dir.join("elevator_ffi.h");

    println!("cargo:rerun-if-changed=src");
    println!("cargo:rerun-if-changed=cbindgen.toml");
    println!("cargo:rerun-if-changed=build.rs");

    let config = cbindgen::Config::from_file(&config_path).unwrap_or_default();

    match cbindgen::Builder::new()
        .with_crate(&crate_dir)
        .with_config(config)
        .generate()
    {
        Ok(bindings) => {
            let _ = std::fs::create_dir_all(&out_dir);
            bindings.write_to_file(&out_path);
        }
        Err(e) => {
            // Don't fail the build — header generation is a developer-time
            // concern, not a library-consumer concern.
            println!("cargo:warning=cbindgen failed: {e}");
        }
    }
}
