# Scope and integration

Version 0.1.0 reserves `TeqFw_Dem_` through canonical
`teqfw.fw.di.namespaces` metadata and `.mjs` source conventions. It has no runtime
components, public types, bare-import entry point, or supported compiler API.
The root export is type-only. Do not deep-import source files as public API.

The intended package owns logical declarations, distributed composition,
validation, logical types, identity/reference semantics, and effective models.
Relational projection, Knex, drivers, schema lifecycle, IndexedDB, and data access
belong to separately maintained physical backends. The host selects fragments,
composes the model, and selects a backend. No synchronization is implied.

Existing DEM v2 in `@teqfw/db` is a reference for future extraction. This version
moves none of that code and provides no automatic migration for its consumers.
Check installed versions and actual contracts before planning an extraction.

Hosts own skill discovery. For a root `.agents/skills/` catalog:

```sh
mkdir -p .agents/skills
ln -s ../../node_modules/@teqfw/dem/skills/teqfw-dem .agents/skills/teqfw-dem
```

A global skill installation is an alternative; prefer the local mount when
version alignment matters. No install hook mounts the skill or alters host
configuration. Skill delivery is separate from DI metadata and runtime identity.
