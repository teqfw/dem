# @teqfw/dem

DEM (Data Entity Model) is the storage-independent declarative modeling foundation
for Tequila Framework. Applications and plugins contribute logical fragments;
the host composes an effective model and selects a physical backend.

Version **0.1.0 is a package scaffold**. It provides metadata, verification,
a reserved DI namespace, an empty declaration entry point, and version-matched
agent guidance. It implements no compiler, model validation, persistence, or
query API. It is not yet a replacement for `@teqfw/db`.

## Intended package boundaries

- `@teqfw/dem`: logical entities, attributes, types, identities, references,
  relations, indexes, fragment composition, and storage-independent contracts.
- `@teqfw/rdb`: planned relational projection and persistence through Knex for
  SQLite, MariaDB/MySQL, and PostgreSQL.
- `@teqfw/idb`: planned browser persistence and physical projection through IndexedDB.

The backend packages describe architectural direction; they are not dependencies
of this scaffold. The same logical declarations are intended for Node.js and
browsers. Independent applications may use independent databases. Synchronization,
identical contents, and key coordination across backends are outside scope.

DEM v2 in [@teqfw/db](https://github.com/teqfw/db) is the technical baseline for
future extraction. Its current SQL organization does not define DEM's intended
boundaries. No production code has been moved in this bootstrap.

## Package organization

- `src/`: reserved platform-independent native ESM JavaScript source root.
- `types.d.ts`: canonical declaration entry point; no public types yet.
- `skills/teqfw-dem/`: self-contained agent skill distributed with the package.
- `test/package/`: package metadata, archive, and installed-consumer checks.
- `bin/`: development-only document verification.
- `docs/legacy/`: historical format documentation and sample, excluded from npm.

`teqfw.fw.di.namespaces` reserves `TeqFw_Dem_` at `./src` with extension `.mjs`.
It exposes no resolvable DEM components yet. The root export is type-only;
`import '@teqfw/dem'` has no runtime entry point and source deep imports are closed.
The `@teqfw/di` 2.x peer follows the current TeqFW composition boundary. No direct
production dependencies or Node-specific runtime implementation are introduced.
Node.js 22+ is the package development/verification baseline; browser support
must be tested when runtime functionality is added.

## Local verification

```sh
npm ci
npm run verify
npm pack --dry-run
```

Tests pack and install the real archive into a temporary consumer without running
install scripts, check its exact contents, and check the closed runtime surface.
The consumer uses an empty npm cache and the DI peer from the locked local install,
so verification does not depend on cached registry metadata.
TypeScript checks JavaScript/JSDoc and declarations; it is development tooling,
not a runtime language or build dependency. CI runs on Node.js 22 and 24.

## Maintainer cognitive context

Authorized maintainers mount the independent private context repository:

```sh
git clone git@github.com:flancer32/teqfw-dem-ctx.git ctx
adsm-ctx validate .
```

Read `ctx/AGENTS.md` and `ctx/docs/filesystem.md` before development. `/ctx/` is
ignored by product Git and excluded by the npm file allowlist. It is not a
submodule. Commit and push product and context repositories independently.
The public package and CI work without access to the private context.

## Agent skill

Hosts choose discovery explicitly. For a locally installed package:

```sh
mkdir -p .agents/skills
ln -s ../../node_modules/@teqfw/dem/skills/teqfw-dem .agents/skills/teqfw-dem
```

A global skill installation is an alternative; prefer the local mount for guidance
matched to the installed package. Installation does not modify host agent settings.

## History and license

The [legacy material](docs/legacy/README.md) describes an obsolete format and is
not a supported schema or usage example. New implementation will use DEM v2 as
its baseline, subject to explicitly documented extraction decisions.

Licensed under [Apache-2.0](LICENSE). The maintainer authorized the transition
from GPL-3.0 during this bootstrap. Earlier revisions retain their historical
license notices. Nothing is published to npm as part of this task.
