---
name: teqfw-dem
description: Use when designing, integrating, reviewing or modifying @teqfw/dem logical schema fragments, host binding rules, model compilation, portable CRUD/List or consumer contracts. The host owns model placement; adapters own physical projection.
---

# Domain Entity Model

`@teqfw/dem` is a foundational component of the Tequila Framework (TeqFW)
platform for distributed development of shared data schemas. Its architecture,
integration contracts and development practices follow established TeqFW philosophy
and conventions; it evolves with the platform. Independently
developed TeqFW plugins contribute domain data definitions and application code;
host integrators compose and integrate those definitions against an ideal semantic
model without requiring plugin authors to select physical storage.

DEM composes plugin fragments into a complete, consistent logical model per compilation.
DEM also defines backend-independent entity access. Hosts select entities per model,
bind dependencies used by selected entities and select identity profiles; refs inherit
their target identities' profiles. Storage projection belongs to downstream plugins.

- For product semantics and composition invariants, read
  [Accepted logical model](references/model.md).
- For new declaration design, read the
  [Schema/map contract and complete example](references/declarations.md), then
  [ordinary types](references/types.md) as needed. The compiler implements Format 2
  schemas and deliberately rejects legacy Format 1 schemas. Host maps retain Format 1.
- For implementing or integrating the compiler, acquisition or fingerprint contract, read
  [target API](references/target-api.md), [configuration](references/configuration.md)
  and [canonical identity](references/canonical.md).
- For application CRUD/List and independent backend implementations, read
  [Portable entity access](references/repository.md).
- For installed-package integration or implementation changes, read
  [Runtime components](references/scope.md) and check installed metadata.
  Resolve supported `TeqFw_Dem_` components through DI.

Use the declaration and API contracts for code and test generation. This skill's references are usable without private context.

For cross-backend design and current realizations, consult the
[compatibility matrix](references/compatibility.md). Prefer reversible realization
and shared observable behavior; distinguish storing a type from native indexing
or specialized operations on that type.

## Platform design constraints

Evaluate changes against DEM's purpose and established TeqFW conventions first.
Use the `teqfw-platform` skill when available for platform reasoning, then verify
mechanisms in version-matched package contracts. The public
[DI contract](https://github.com/teqfw/di/blob/main/README.md) describes explicit
dependencies, late binding and host Composition Root policy; the
[CLI contract](https://github.com/teqfw/cli/blob/main/README.md) describes the optional
Node.js host. Neither makes CLI or other host infrastructure part of the portable
compiler.

Keep plugin declarations independent of host-selected implementations. Resolve
runtime component dependencies through TeqFW DI and leave provider selection to
host composition. Keep DI module namespaces, descriptor-owned logical namespaces
and physical storage addresses distinct. Preserve declarative schema/map integration
and host ownership of placement; reuse applicable TeqFW mechanisms instead of
introducing competing wiring or configuration systems. Foundational platform status
does not require every TeqFW application to install DEM.

## Current support and design boundary

The Isomorphic Core supplies shared modeling and CRUD+List semantics; it does not
promise identical storage capabilities, operational guarantees or data portability.
Registered extension types and model-scoped runtime handlers are supported; other
extension categories and integrations remain incomplete. Do not invent extension
fields, routing configuration or generic relaxation flags. Use the closed current
Format 2 and published APIs. See [implementation status](references/scope.md#implementation-status)
and [extension composition](references/target-api.md#extension-composition). See [model](references/model.md)
for invariant categories, host policy and unresolved design boundaries. Verify exact
installed-version behavior in source and metadata when integrating the package.

## Development policy

Apply TeqFW's rapid evolution principle: prioritize fast feedback on DEM's main
functionality over reliability and repeatability as development goals. Implement
the happy path; unexpected conditions fail immediately rather than trigger retries,
inferred repair or hidden fallback. Preserve atomic writes, values and applicable
invariants. Intentional native/software semantic realization is not error recovery.

Documentation defines the desired current state. Align code and tests with it;
do not preserve drift as a second legacy contract. Backward compatibility is not
a goal. Keep decisions about chosen/rejected directions; use Git and npm releases
for historical implementations instead of compatibility layers. Do not implement
migration or legacy support without an explicit current requirement. Keep undesigned
interfaces open.

Prefer simple solutions and the shortest practical route to working schema
composition and feedback. Add generalized infrastructure only for a demonstrated
need. Keep tests small and focused on essential contracts; broaden verification
only for a defect, architectural invariant or immediate integration requirement.
Avoid redundant regression suites and exhaustive compatibility matrices.
