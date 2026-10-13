---
name: teqfw-dem
description: Use when designing, integrating, reviewing or modifying @teqfw/dem logical schema fragments, host binding rules, model compilation or consumer contracts. Storage partitioning and projection belong to downstream plugins.
---

# Domain Entity Model

DEM composes plugin fragments into one complete, consistent logical schema.
Hosts bind explicit dependencies and select identity profiles; refs inherit their
target identities' profiles. Storage projection belongs to downstream plugins.

- For product semantics and composition invariants, read
  [Accepted logical model](references/model.md).
- For new declaration design, read the
  [Schema/map contract and complete example](references/declarations.md), then
  [ordinary types](references/types.md) as needed. Package v0.2.0 implements these contracts.
- For implementing or integrating the compiler, acquisition or fingerprint contract, read
  [target API](references/target-api.md), [configuration](references/configuration.md)
  and [canonical identity](references/canonical.md).
- For installed-package integration or implementation changes, read
  [Runtime components](references/scope.md) and check installed metadata.
  Resolve supported `TeqFw_Dem_` components through DI.

Use the declaration and API contracts for code and test generation. This skill's references are usable without private context.
