//! Discriminated-union result types for fallible wasm exports.
//!
//! Every fallible method on `WasmSim` returns one of these instead of
//! `Result<T, JsError>` (which materializes as a thrown `Error` on the
//! JS side). The Result-shape model lets TS consumers use exhaustive
//! `switch (r.kind)` narrowing without try/catch wrappers.
//!
//! Three concrete result types cover the entire fallible surface:
//! - [`WasmVoidResult`] for mutators that return `()`
//! - [`WasmU64Result`] for entity-id returns
//! - [`WasmU32Result`] for count returns
//!
//! On the TS side each is a discriminated union with a string `kind`
//! discriminator:
//!
//! ```ts
//! type WasmU64Result =
//!   | { kind: "ok"; value: number }
//!   | { kind: "err"; error: string }
//! ```
//!
//! Usage on the JS side:
//!
//! ```ts
//! const r = sim.spawnRider(origin, dest, 75);
//! if (r.kind === "ok") {
//!   riderId = r.value;
//! } else {
//!   console.error("spawn failed:", r.error);
//! }
//! ```
//!
//! The string discriminator (`"ok"` / `"err"`) is a deliberate choice:
//! tsify-next emits per-variant string literal types so the TS
//! compiler narrows `r.value` and `r.error` correctly, and the runtime
//! check is `r.kind === "ok"` which mirrors the ergonomics of
//! `instance of Error` patterns elsewhere in the playground.

use serde::Serialize;
use tsify::Tsify;

/// Result shape for void mutators. On the TS side:
/// `{ kind: "ok" } | { kind: "err"; error: string }`.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum WasmVoidResult {
    /// Operation succeeded; no payload.
    Ok {},
    /// Operation failed; `error` carries the human-readable message.
    Err {
        /// The error message.
        error: String,
    },
}

/// Result shape for entity-id returns (rider/elevator/stop/line ids).
/// On the TS side:
/// `{ kind: "ok"; value: bigint } | { kind: "err"; error: string }`.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum WasmU64Result {
    /// Operation succeeded; `value` carries the entity id.
    Ok {
        /// The entity id.
        value: u64,
    },
    /// Operation failed; `error` carries the human-readable message.
    Err {
        /// The error message.
        error: String,
    },
}

/// Result shape for `u32`-typed returns (counts, ticks, codes).
/// On the TS side:
/// `{ kind: "ok"; value: number } | { kind: "err"; error: string }`.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum WasmU32Result {
    /// Operation succeeded; `value` carries the count.
    Ok {
        /// The numeric value.
        value: u32,
    },
    /// Operation failed; `error` carries the human-readable message.
    Err {
        /// The error message.
        error: String,
    },
}

/// Result shape for `Vec<u8>`-typed returns (snapshot bytes, etc.).
/// On the TS side:
/// `{ kind: "ok"; value: Uint8Array } | { kind: "err"; error: string }`.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum WasmBytesResult {
    /// Operation succeeded; `value` carries the byte buffer.
    Ok {
        /// The byte buffer.
        value: Vec<u8>,
    },
    /// Operation failed; `error` carries the human-readable message.
    Err {
        /// The error message.
        error: String,
    },
}

impl<E: std::fmt::Display> From<Result<(), E>> for WasmVoidResult {
    fn from(r: Result<(), E>) -> Self {
        match r {
            Ok(()) => Self::Ok {},
            Err(e) => Self::Err {
                error: e.to_string(),
            },
        }
    }
}

impl<E: std::fmt::Display> From<Result<u64, E>> for WasmU64Result {
    fn from(r: Result<u64, E>) -> Self {
        match r {
            Ok(value) => Self::Ok { value },
            Err(e) => Self::Err {
                error: e.to_string(),
            },
        }
    }
}

impl<E: std::fmt::Display> From<Result<u32, E>> for WasmU32Result {
    fn from(r: Result<u32, E>) -> Self {
        match r {
            Ok(value) => Self::Ok { value },
            Err(e) => Self::Err {
                error: e.to_string(),
            },
        }
    }
}

impl<E: std::fmt::Display> From<Result<Vec<u8>, E>> for WasmBytesResult {
    fn from(r: Result<Vec<u8>, E>) -> Self {
        match r {
            Ok(value) => Self::Ok { value },
            Err(e) => Self::Err {
                error: e.to_string(),
            },
        }
    }
}

impl WasmVoidResult {
    /// Convenience constructor for the success case.
    #[must_use]
    pub const fn ok() -> Self {
        Self::Ok {}
    }

    /// Convenience constructor for the failure case.
    #[must_use]
    pub fn err(message: impl Into<String>) -> Self {
        Self::Err {
            error: message.into(),
        }
    }
}

impl WasmU64Result {
    /// Convenience constructor for the success case.
    #[must_use]
    pub const fn ok(value: u64) -> Self {
        Self::Ok { value }
    }

    /// Convenience constructor for the failure case.
    #[must_use]
    pub fn err(message: impl Into<String>) -> Self {
        Self::Err {
            error: message.into(),
        }
    }
}

impl WasmU32Result {
    /// Convenience constructor for the success case.
    #[must_use]
    pub const fn ok(value: u32) -> Self {
        Self::Ok { value }
    }

    /// Convenience constructor for the failure case.
    #[must_use]
    pub fn err(message: impl Into<String>) -> Self {
        Self::Err {
            error: message.into(),
        }
    }
}

impl WasmBytesResult {
    /// Convenience constructor for the success case.
    #[must_use]
    pub const fn ok(value: Vec<u8>) -> Self {
        Self::Ok { value }
    }

    /// Convenience constructor for the failure case.
    #[must_use]
    pub fn err(message: impl Into<String>) -> Self {
        Self::Err {
            error: message.into(),
        }
    }
}
