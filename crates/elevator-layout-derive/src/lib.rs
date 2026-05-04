//! `#[derive(MultiHostLayout)]` proc-macro.
//!
//! Inspects a `#[repr(C)]` struct's fields, classifies each by
//! primitive kind (u8/i64/Ptr/etc.), and emits an `impl LayoutInfo`
//! plus a `#[distributed_slice(REGISTRY)]` entry in
//! `elevator-layout-runtime`'s global registry.
//!
//! See `crates/elevator-layout-runtime/src/lib.rs` for the trait and
//! registry definitions, and `crates/elevator-layout-codegen` (PR 6)
//! for the consumer that reads the registry to emit C# / GML / C
//! struct definitions.

use proc_macro::TokenStream;
use quote::{format_ident, quote};
use syn::{Data, DeriveInput, Fields, Type, parse_macro_input};

#[proc_macro_derive(MultiHostLayout)]
pub fn derive_multi_host_layout(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    let name = &input.ident;
    let name_str = name.to_string();

    let fields = match &input.data {
        Data::Struct(s) => match &s.fields {
            Fields::Named(named) => &named.named,
            _ => {
                return syn::Error::new_spanned(
                    name,
                    "MultiHostLayout requires a named-field struct",
                )
                .to_compile_error()
                .into();
            }
        },
        _ => {
            return syn::Error::new_spanned(name, "MultiHostLayout can only be derived on structs")
                .to_compile_error()
                .into();
        }
    };

    // Per-field metadata literals. Each generates one Field entry
    // in the emitted FIELDS slice — declaration order is preserved.
    let mut field_entries = Vec::with_capacity(fields.len());
    for field in fields {
        let Some(field_ident) = field.ident.as_ref() else {
            continue;
        };
        let field_name_str = field_ident.to_string();
        let kind_tokens = classify_type(&field.ty);
        let ty = &field.ty;
        field_entries.push(quote! {
            ::elevator_layout_runtime::Field {
                name: #field_name_str,
                offset: ::core::mem::offset_of!(#name, #field_ident),
                size: ::core::mem::size_of::<#ty>(),
                kind: #kind_tokens,
            }
        });
    }

    // Generate a unique constant ident for the registry submission so
    // multiple derives in the same crate don't collide.
    let registry_const = format_ident!("__LAYOUT_REGISTRY_ENTRY_{}", name);

    let expanded = quote! {
        impl ::elevator_layout_runtime::LayoutInfo for #name {
            fn name() -> &'static str {
                #name_str
            }
            fn size() -> usize {
                ::core::mem::size_of::<Self>()
            }
            fn fields() -> &'static [::elevator_layout_runtime::Field] {
                static FIELDS: &[::elevator_layout_runtime::Field] = &[
                    #(#field_entries),*
                ];
                FIELDS
            }
        }

        // linkme distributed slice entry. The codegen binary in
        // crates/elevator-layout-codegen iterates REGISTRY at runtime
        // to discover every host-bound repr-C struct without a
        // hardcoded list.
        #[::linkme::distributed_slice(::elevator_layout_runtime::REGISTRY)]
        #[allow(non_upper_case_globals)]
        static #registry_const: ::elevator_layout_runtime::LayoutEntry =
            ::elevator_layout_runtime::LayoutEntry {
                name: #name_str,
                size: ::core::mem::size_of::<#name>(),
                fields: {
                    static FIELDS: &[::elevator_layout_runtime::Field] = &[
                        #(#field_entries),*
                    ];
                    FIELDS
                },
            };
    };

    expanded.into()
}

/// Map a Rust type token to a `FieldKind` variant.
///
/// The mapping is purely structural — anything that doesn't match
/// a known primitive falls through to `Bytes` so the codegen can
/// emit raw bytes for nested structs / fixed arrays.
fn classify_type(ty: &Type) -> proc_macro2::TokenStream {
    let s = quote!(#ty).to_string().replace(' ', "");
    let kind = match s.as_str() {
        "u8" => quote!(U8),
        "i8" => quote!(I8),
        "u16" => quote!(U16),
        "i16" => quote!(U16),
        "u32" => quote!(U32),
        "i32" => quote!(I32),
        "u64" => quote!(U64),
        "i64" => quote!(I64),
        "f32" => quote!(F32),
        "f64" => quote!(F64),
        // Pointer-sized: any *const/*mut, usize/isize. The token
        // shape `*const T` or `*mut T` always starts with one of
        // these prefixes, so a string match suffices for the
        // pre-PR-5 type universe.
        s if s.starts_with("*const") || s.starts_with("*mut") => quote!(Ptr),
        "usize" | "isize" => quote!(Ptr),
        // Anything else (nested structs, arrays) is an opaque byte
        // run from the codegen's perspective.
        _ => quote!(Bytes),
    };
    quote!(::elevator_layout_runtime::FieldKind::#kind)
}
