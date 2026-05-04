//! Runtime support for `#[derive(MultiHostLayout)]`.
//!
//! Defines the `LayoutInfo` trait and a `linkme`-backed global registry
//! so the layout-codegen binary can iterate every host-bound repr-C
//! struct without a hardcoded list.
//!
//! Why a separate crate: proc-macros (`crates/elevator-layout-derive`)
//! emit code that references this trait, but a proc-macro crate cannot
//! itself define the trait — Rust requires the derive crate to be
//! `proc-macro = true`, which precludes exposing non-proc-macro items
//! to consumers. Splitting into derive + runtime is the standard
//! pattern (e.g. `serde_derive` + `serde`, `clap_derive` + `clap`).

use linkme::distributed_slice;

/// Static metadata for a single field of a `#[repr(C)]` struct.
#[derive(Debug, Clone, Copy)]
pub struct Field {
    /// Field name as written in the Rust source.
    pub name: &'static str,
    /// Byte offset within the parent struct (computed via
    /// `core::mem::offset_of!` at the derive site).
    pub offset: usize,
    /// Byte size of the field (computed via `core::mem::size_of`).
    pub size: usize,
    /// Classified primitive kind — drives the consumer-side type
    /// emitted by the codegen binary (e.g. `byte` in C#, `u8` in
    /// `buffer_peek`'s second argument in GML).
    pub kind: FieldKind,
}

/// Primitive kinds the host-side layouts care about.
#[non_exhaustive]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FieldKind {
    /// `u8`.
    U8,
    /// `i8`.
    I8,
    /// `u16`. Currently unused; reserved for future structs.
    U16,
    /// `i16`. Currently unused; reserved for future structs.
    I16,
    /// `u32`.
    U32,
    /// `i32`. Currently unused; reserved.
    I32,
    /// `u64`.
    U64,
    /// `i64`.
    I64,
    /// `f32`. Currently unused; reserved.
    F32,
    /// `f64`.
    F64,
    /// Pointer-sized: any `*const T`, `*mut T`, `usize`, or
    /// `isize`. Eight bytes on every supported target.
    Ptr,
    /// Compound nested type (a derived struct or `[u8; N]` blob)
    /// the codegen emits as raw bytes. Reserved for future structs
    /// that contain nested repr-C records.
    Bytes,
}

/// Static metadata for one `#[derive(MultiHostLayout)]` struct.
///
/// Implementations are emitted by the derive macro; the codegen
/// binary iterates [`REGISTRY`] at runtime to enumerate every host-
/// bound repr-C struct in elevator-ffi.
pub trait LayoutInfo: 'static {
    /// Type name as a static string (e.g. `"EvLogMessage"`).
    fn name() -> &'static str
    where
        Self: Sized;

    /// Total byte size of the struct (from `core::mem::size_of`).
    fn size() -> usize
    where
        Self: Sized;

    /// Static slice of every field in declaration order.
    fn fields() -> &'static [Field]
    where
        Self: Sized;
}

/// Erased reference into [`REGISTRY`] so the static slice can hold
/// every concrete `LayoutInfo` implementation regardless of type.
#[derive(Debug, Clone, Copy)]
pub struct LayoutEntry {
    /// `T::name()` — the struct's identifier.
    pub name: &'static str,
    /// `T::size()` — total byte size.
    pub size: usize,
    /// `T::fields()` — declaration-order field metadata.
    pub fields: &'static [Field],
}

/// Distributed slice that every `#[derive(MultiHostLayout)]` push an
/// entry into via the derive's emitted `#[distributed_slice(REGISTRY)]`
/// item. Iterate this from the codegen binary to discover all
/// host-bound types without a hardcoded list.
#[distributed_slice]
pub static REGISTRY: [LayoutEntry] = [..];
