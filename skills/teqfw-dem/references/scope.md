# Version 0.2.0 runtime contracts

This reference describes implemented v0.2.0 behavior, including currently accepted physical
fields. The [accepted model boundary](model.md) is logical-only. Proposed schema/map
file conventions are not runtime discovery support; `dem-host.json` is outside DEM.

## Supported DI components

- `TeqFw_Dem_Compile$`: `await exec({fragments, mapEnvelope})` and `assertResult({value})`.
- `TeqFw_Dem_Registry_Core$`: frozen `types`, `defaults`, `generations`, `operators`.
- `TeqFw_Dem_Registry_CoreValue$`: `normalizeType({type, allowAny?})` and
  `matches({type, value, allowAny?})` for typed runtime values.
- `TeqFw_Dem_Dto_Query_Expression__Factory$`: `create(data)` returns an immutable
  closed `attr`, `value`, or `call` node, rejecting unknown fields.

Compilation-stage components and source/diagnostic factories are implementation
support, not stable consumer extension APIs. No general provider registration
API, query execution, connection, schema creation or browser persistence is supplied.
Hosts may compose a registry replacement through DI but own its compatibility;
only shipped core registry behavior is verified.

## Trusted inputs

Each fragment carries `fragmentId`, `packageName`, `filename`, and parsed
`declaration`. The map carries `mapId`, `packageName`, `filename`, and declaration.
`fragmentId` is a required runtime bookkeeping field, not a logical namespace
or a product-level identity. Both declarations require integer `version: 2`. Revisions are derived from content,
not accepted from caller assertions. Missing semantic dictionaries normalize to
empty maps. Unknown declaration fields are rejected.

Fragments may supply a dot-delimited lowercase alphanumeric root namespace,
entities, nested packages, declared external `refs`, and `requires` strings.
Entity declarations contain `attr`, `index`, `relation`, and optional comments.
Attributes separate `type: {id, params?}`, nullable, storage bindings, literal or
registered function defaults, and registered generation. Defaults and generation
are mutually exclusive. Structural package containers union disjoint children;
semantic entities, attributes, indexes, relations and metadata have one owner.
A conflict has no accepted winner, even for identical declarations.

Map `ref` entries are indexed first by the owning fragment identity, then its
external reference path, with `{path, attrs}` target mapping. Local references
expand from fragment roots. Endpoints preserve declaration and map provenance.
The optional map `identityProfile` supplies integer type and `core.identity`
generation (`byDefault` or `always`). The default is signed 32-bit integer and
`byDefault`. `core.identity` has no parameters and derives a primary key;
`core.ref` has no parameters, participates exactly once in one relation, targets
an identity attribute and derives its type without generation. UUID generation
is unsupported.

Core types are binary, boolean, date, datetime, decimal, enum, integer, json,
string, text, uuid, vector, identity, and ref. Normalized runtime types include
explicit params. Binary runtime values use Uint8Array (Node Buffer is its subtype);
JSON declaration binary defaults retain the existing string convention.
Expressions use registered typed operators and supported contexts. Indexes retain
ordered keys, primary/unique invariants, phases and provider hints. Relations
require equal non-empty cardinality, compatible logical types and an exact ordered
primary/unique target. Graph results retain SCC cycles and dependency-first order;
cycles do not imply invalid declarations.

## Output and failures

Successful result fields are `effective`, `fingerprint`, `model`, `provenance`,
`graph`, `requirements`, and `warnings`. `effective` contains model, provenance
and fingerprint; both fingerprint fields agree. There is no physical plan field. Outputs are
deeply frozen and authentic only to the producing compiler instance. Errors carry
ordered structured diagnostics and warnings in a frozen `DemCompilationError`;
they expose no usable model.
Machine-readable codes, paths, details and sources are the branching contract;
English diagnostic messages are for humans.

Declared capabilities are collected with provenance. The physical backend owns
capability negotiation, SQL identifier validation, storage projection, physical
representation compatibility and operation preflight. Storage, map namespace, phase and dialect settings currently enter the canonical
model and sha256-v1. These fields must be removed to satisfy the logical-only
product boundary; they are not universal logical behavior. Provenance does not contribute to fingerprints. `sha256-v1` hashes UTF-8 JSON
with recursively sorted enumerable own object keys and preserves array order.

## Types and browser hosts

The root export is type-only. Consumers include their own source/types and
`node_modules/@teqfw/dem/types.d.ts` plus its source paths in the checked program.
Include type maps and referenced sources of other used plugins as well. Use
`TeqFw_Dem_Compile` and exported `DemCompilationResult` for logical results;
DB combined results additionally contain a physical plan and a combined fingerprint.

A browser host uses served ESM namespace roots and the browser DI build. Runtime
DEM uses standard JavaScript, structuredClone and TextEncoder, without Node globals
or database dependencies. Node/Chrome verification compares complete logical
results and fingerprints. Hosts own URL delivery and browser security policies.

## Distribution

Mount this published skill into the host's chosen discovery directory. Keep its
reference beside it. Package installation has no discovery or configuration hook.
