# Runtime Components

The current compiler implements Format 2 schema descriptors and deliberately
rejects legacy Format 1 schemas. This is an intentional breaking contract; there
is no schema compatibility mode. Host maps remain Format 1. Logical compilation
and Node acquisition use the [compiler/acquisition API](target-api.md); inputs
follow [declarations](declarations.md), [types](types.md) and
[configuration](configuration.md). [Canonical identity](canonical.md) defines exact
fingerprint bytes. There are no physical declarations.

## Implementation status

DEM implements Core compilation and shared operations, the container-scoped Type
Registry and Type Provider contract, and compilation of registered extension type
declarations. A host can bind a model to selected handlers for Normalize, Selection
and Select; Selection and Select use handler-defined Equality and Ordering and
isolate mutable operands. See [extension composition](target-api.md#extension-composition).

Native platform handlers, extension-aware Batch integration, full Repository
acquisition and adapter-specific persistence of native values remain deferred.
The existing Batch helper plans Core operations; it is not bound to extension
handlers. No storage provider is bundled. Other extension categories and host
routing remain future work.

## Supported DI tokens

- `TeqFw_Dem_Compile$`: exec and assertResult.
- `TeqFw_Dem_Acquire$`: Node-only read-only acquisition using the registry mechanism
  used by CLI, independent of portable compilation.
- `TeqFw_Dem_Registry$`: shared Type Registry, registered and finalized by the host.
- `TeqFw_Dem_Repository_Runtime$`: model-scoped runtime binding.
- `TeqFw_Dem_Registry_Core$`: frozen logical type definitions and parameter defaults.
- `TeqFw_Dem_Registry_CoreValue$`: normalizeType, normalizeValue and matches for the
  logical JSON literal representations in the type contract. Invalid types return
  null; invalid literal normalization throws TypeError; matches returns false.
- `TeqFw_Dem_Dto_Query_Expression__Factory$`: create immutable closed attr/value/call
  expression descriptions. Value types use name/params. This factory performs
  structural validation; it neither validates operator signatures nor executes queries.

- `TeqFw_Dem_Api_RepositoryProvider$`: host-substituted get({path}) contract.
- `TeqFw_Dem_Api_RepositoryBatch$`: optional host-substituted atomic execute contract.
- `TeqFw_Dem_Repository_Batch$`: disposable logical batch snapshot validation/planning.
- `TeqFw_Dem_Api_Repository$`: create/read/update/delete/list contract.
- `TeqFw_Dem_Repository_Normalize$`: logical value/record/key normalization.
- `TeqFw_Dem_Repository_Select$`: in-memory selection evaluation.
- `TeqFw_Dem_Repository_Error$`: stable operation-error construction.
- `TeqFw_Dem_Dto_Query_Selection__Factory$`: entity-aware portable selection validation.

Compile/A, Dto/Compile and Util components are internal, not extension APIs.
Portable [Repository contracts](repository.md) define access without executing persistence.
No provider registration or connection management is supplied.

## Type wiring and browsers

Include node_modules/@teqfw/dem/types.d.ts and referenced sources in the consumer's
checked program together with DI's type map. DemCompilationResult and other root
exports are types; the runtime is resolved through DI. Namespace metadata maps
TeqFw_Dem_ to src with the .mjs extension.

Browsers use served ESM roots and the DI browser build. Compile requires standard
JavaScript, structuredClone and TextEncoder, with no Node shim or database.
Acquire is not part of the portable dependency graph. Hosts own module delivery.

The published skill is self-contained. Installation has no host configuration hook.

`TeqFw_Dem_Repository_Select$` is a portable in-memory selection evaluator for
adapter fallback execution. Its exec method and shared value workload are defined
in the [repository reference](repository.md). It does not own stored data.
