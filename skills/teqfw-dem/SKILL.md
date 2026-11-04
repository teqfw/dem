---
name: teqfw-dem
description: Use when designing, integrating, reviewing or modifying @teqfw/dem logical schema fragments, host binding rules, model compilation, portable CRUD/List or consumer contracts. The host owns model placement; adapters own physical projection.
---

# Domain Entity Model

DEM is a tool for distributed development of shared data schemas. Independently
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

## Current support and design boundary

The Isomorphic Core supplies shared modeling and CRUD+List semantics; it does not
promise identical storage capabilities, operational guarantees or data portability.
Platform Extensions are accepted direction, but their grammar, registration and
runtime contracts are not designed or implemented. Do not generate extension
fields, capability APIs, routing configuration or generic relaxation flags.
Use the closed current Format 2 and published APIs. See [model](references/model.md)
for invariant categories, host policy and unresolved design boundaries. Verify exact
installed-version behavior in source and metadata when integrating the package.
