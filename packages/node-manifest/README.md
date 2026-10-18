# Node manifest structural evidence

`water-node-manifest` is a private, independent Rust workspace. It analyzes only
the UTF-8 text supplied by its caller. It does not acquire package.json files,
resolve dependencies or workspace paths, or run scripts.

```rust
use water_node_manifest::v1::{analyze_package_json, to_json};

let evidence = analyze_package_json(r#"{"private":false,"scripts":{"build":"anything"}}"#)?;
let json = to_json(&evidence)?;
# Ok::<(), water_node_manifest::v1::ManifestError>(())
```

The returned evidence and counts have private fields and implement Debug, Clone,
PartialEq, Eq and Serialize. There is no Deserialize, Default, public constructor
or mutable getter. The two public functions are the only construction/export
entry points. The fixed wire format is `water.node-manifest.v1` and retains only
presence flags, the private declaration and six declaration counts. Debug and
JSON retain no input names, versions, script text, dependency names/ranges,
workspace strings, unknown metadata, input hashes or paths.

The output always states `caller_supplied_text`, `read_only=true`,
`format_verified=true`, `project_membership_verified=false`,
`tool_version_known=false`, `action=display_only`, `risk=protected`,
`ecosystem=node`, and `evidence_strength=parsed_structure`. Parsing a version
string does not establish any installed tool version. Workspace strings are
counted without expansion; declarations shared by dependencies and
optionalDependencies count independently. The empty object is valid evidence
with zero recognized fields. Exact counts can correlate reports; this format
does not promise anonymity.

Validation follows the frozen [v1 specification](../../contracts/node-manifest-v1/SPEC.md):

- The UTF-8 byte limit is 262144, checked before all other errors.
- Complete syntax is checked before duplicate/depth errors. An iterative Serde
  grammar pass avoids unbounded stack recursion. Token validation additionally
  checks decoded strings and serde_json numeric representability, including in
  unknown metadata. No application floating point arithmetic is performed.
- A custom recursive Serde visitor reads the original text, checks decoded keys
  for duplicates in every object, and stops before entering container depth 33.
  The root container has depth 1. Only this bounded transient tree is used for
  shape/field validation; it is never serialized. Duplicate/depth conflicts are
  encountered in raw traversal order; syntax always takes precedence.
- The root must be an object. Every provided known field has a strict type;
  explicit null is invalid. Bounds count Unicode scalar values, not bytes or
  grapheme clusters. Names/versions, dependency keys/ranges and workspace strings
  reject ASCII controls and DEL. Script values allow empty/control text.
- Scripts have at most 128 declarations; each dependency map at most 4096;
  workspaces at most 128. Name/version/key/workspace limits are 1..256 characters,
  dependency ranges 1..2048, script values 0..4096. Script keys have no additional
  semantic restriction. Unknown metadata receives full raw validation but has
  no output contribution.

Eight public error variants have fixed safe messages, `<Variant> at /manifest`.
No parser error, field name or caller content is included in errors.

The crate has only the frozen serde/serde_json dependencies. Production contains
no file, environment, configuration, clock, process or network access and forbids
unsafe code. The five integration tests use frozen synthetic cases and inputs
generated in memory, including exact byte/depth/count/Unicode limits, escaped
duplicates, malformed syntax precedence, privacy invariance and public Serialize
equivalence. They do not obtain real package.json content.

Run this ticket's checks only through the frozen helper, from its assigned tree:

```powershell
node scripts/parallel-wave-check.mjs --task WATER-W1-U --mode suite
```

The evidence report records the initial behavioral red, three production
mutations with complete-suite red and byte-exact restoration, and all five final
gates. Validation is Windows x64 / Rust 1.95 MSVC only. Actual content acquisition,
project membership, reference resolution, classification, macOS and the M1
vertical user flow remain outside this ticket.
