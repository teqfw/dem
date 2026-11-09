# @teqfw/dem

`@teqfw/dem` is a foundational component of the Tequila Framework (TeqFW)
platform for distributed development of shared data schemas. Its architecture,
integration contracts and development practices follow established TeqFW philosophy
and conventions; it evolves with the platform. Independently
developed TeqFW plugins contribute domain data definitions and application code;
host integrators compose and integrate those definitions against an ideal semantic
model without requiring plugin authors to select physical storage.

Plugin authors own fragments and code operating on their entities. Host integrators
select entities, resolve namespace collisions and dependencies, choose identity
profiles, storage implementations and applicable guarantees. DEM runs in Node.js
and browsers. Adapters implement the logical capabilities they can support
correctly, using native facilities or software realization where justified.

DEM's design is governed by its shared-schema purpose and TeqFW conventions.
Runtime components use [TeqFW DI](https://github.com/teqfw/di/blob/main/README.md)
for explicit dependencies and late binding; host composition selects implementations.
The [CLI](https://github.com/teqfw/cli/blob/main/README.md) is an optional Node.js
host, while the logical core remains usable in browsers. DEM supplies a shared
platform mechanism without being mandatory for every TeqFW application. See the
[consumer skill](skills/teqfw-dem/SKILL.md) for practical design constraints.

## Isomorphic Core and Platform Extensions

The Isomorphic Core supplies a common language for frequently used structures,
types, constraints, relationships and CRUD+List. Isomorphism concerns shared
application semantics; physical representations, capabilities and operational
guarantees may differ. It promises neither universal data portability nor data
synchronization. DEM does not guarantee that every capability is available in every
storage environment. Adapters reject unsupported requirements explicitly; they need
not emulate missing capabilities merely for cross-platform compatibility.

Platform Extensions are accepted product direction: platform-specific types,
constraints, indexes and other modeling capabilities can make an entity usable
only with compatible adapters and host configurations. Registered extension types
can be compiled and bound to host-supplied runtime handlers. Other extension categories and native platform integrations remain
future work; Format 2 remains closed to arbitrary fields.

The effective logical domain model is distinct from host-owned storage
configuration: entity placement, adapters and explicitly accepted deviations from
ideal semantics. One logical model may span storage systems in the target
architecture; DEM currently supplies no storage-routing configuration or API.
Host integration owns cross-storage coordination, transactions, consistency,
synchronization and migration. Adapters must not silently weaken requirements,
truncate values or perform lossy conversions.

## Current package

The current implementation provides Format 2 compilation, Format 1 host maps,
entity selection, Node acquisition, canonical model identity, shared Core operations,
and registered extension types with model-scoped runtime operations. Independent
adapters supply storage. See the [implementation status](skills/teqfw-dem/references/scope.md#implementation-status)
and [extension composition](skills/teqfw-dem/references/target-api.md#extension-composition)
for supported behavior and limitations.

DEM owns the ordinary infrastructure descriptors in `etc/dem-schema.json`,
including `/dem/snapshot` and `/dem/application` for canonical model history. A
host composes these entities through normal acquisition and selection with every
model stored in a participating backend. They are never inserted by the compiler.
Acquisition returns `trustedPackages` from the package registry; pass that value
to compilation when composing the DEM family schema so package names alone do not
grant access to reserved `/dem/` paths. The compiler does not plan or execute
migrations.

## Installation and compatibility

```sh
npm install @teqfw/dem@^0.4.0 @teqfw/di@^2.11.0
```

This release replaces the 0.3.x Format 1 schema contract with Format 2; hosts must
update schema descriptors and use compatible 0.3.x DEM adapters. Host maps remain
Format 1. Register each installed package namespace in the host composition root;
browser hosts must serve the corresponding ESM modules.

## Compile through DI

Register namespace roots before resolving components. The package root exports
types only; runtime access uses TeqFW DI tokens.

```js
import Container from '@teqfw/di';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';

const require = createRequire(import.meta.url);
const demRoot = dirname(dirname(require.resolve('@teqfw/dem/conformance')));
const container = new Container({
    namespaces: [{prefix: 'TeqFw_Dem_', target: join(demRoot, 'src'), defaultExt: '.mjs'}],
});
const registry = await container.get('TeqFw_Dem_Registry$');
registry.finalize();
const compiler = await container.get('TeqFw_Dem_Compile$');
const result = await compiler.exec({
    schemas: [{
        packageName: '@example/app',
        filename: 'etc/dem-schema.json',
        document: {
            $format: 2,
            $namespace: '/app/',
            user: {attributes: [{name: 'id', type: {name: 'identity'}}]},
        },
    }],
});
compiler.assertResult({value: result});
console.log(result.model.entities['/app/user'], result.fingerprint);
```

Schema Format 1 is deliberately unsupported. DEM rejects legacy schema descriptors;
this is an intentional breaking contract with no compatibility mode. Host maps are
a separate document format and continue to use `$format: 1`.

The immutable result contains model, canonical content, fingerprint, provenance,
dependency graph and warnings. Invalid inputs reject with a frozen
DemCompilationError containing source-linked diagnostics and no usable model.
Identity defaults to int/regular and derives a primary key; refs inherit their
resolved target identity profile. Host profiles select uuid or int with qualitative
small/regular/large capacity, without choosing physical types or bit widths.

Logical path segments match `[a-z][a-z0-9]*`; underscores and repeated `/`
separators are invalid. Package addresses
end with `/`; entity addresses do not. Package directories merge, entities never
merge. Local references preserve their original dependencies through path remapping.
External entity/attribute contracts used by selected entities require explicit host binding.
For namespace design guidance, see [Paths and composition](skills/teqfw-dem/references/model.md#paths-and-composition).

The fingerprint is `dem-sha256-1:` plus a SHA-256 digest of canonical logical JSON.
It excludes comments, origins, empty packages, assembly steps and attribute
projection order. Ordered key/index/relation members remain significant.

See the [declaration contract and examples](skills/teqfw-dem/references/declarations.md),
[logical types](skills/teqfw-dem/references/types.md),
[compiler API](skills/teqfw-dem/references/target-api.md) and
[canonical identity](skills/teqfw-dem/references/canonical.md).

## Access entities through a portable repository

The host selects a provider implementation through TeqFW DI preprocessing.
Application code depends only on DEM:

```js
const provider = await container.get('TeqFw_Dem_Api_RepositoryProvider$');
const repository = await provider.get({path: '/app/user'});
const {record} = await repository.read({key: {kind: 'primary', values: {id: '42'}}});
const selectionFactory = await container.get('TeqFw_Dem_Dto_Query_Selection__Factory$');
const selection = selectionFactory.create({
    entity: result.model.entities['/app/user'], selection: {limit: 20},
});
const {records} = await repository.list({selection});
```

Repository supports create/read/update/delete/list with explicit named parameters.
Single-record addressing uses complete primary or named unique keys. Logical
normalization, filtering operators, ordering, nulls, pagination, results and errors
are defined in [Portable entity access](skills/teqfw-dem/references/repository.md).
No backend ships here. Future backends can import the reusable behavioral suite
from `@teqfw/dem/conformance` and run it against real storage.

## Acquire declarations in Node.js

```js
const acquisition = await container.get('TeqFw_Dem_Acquire$');
const inputs = await acquisition.exec({hostRoot: '/absolute/application'});
const compiled = await compiler.exec(inputs);
```

Acquire reuses the package-registry discovery mechanism used by @teqfw/cli.
The default files are `etc/dem-schema.json` and the host's `etc/dem-map.json`.
Override package-relative paths independently under `package.json` → `teqfw.dem`.
Missing implicit defaults are allowed; explicitly configured missing files fail.
Acquire reads the one configured host map and selects packages, not entities.
The compiler accepts optional `selection` entries `{packageName, entityPath}`
using original canonical entity paths. Omit it to select all entities or pass `[]`
for an empty model. Independent calls can select different entities and use different
caller-supplied maps and identity profiles. Selected dependencies must be resolved
explicitly; contracts used only by excluded entities need no binding. See the
[compiler API and examples](skills/teqfw-dem/references/target-api.md#entity-selection)
and [configuration](skills/teqfw-dem/references/configuration.md).

The portable compiler imports no filesystem or CLI modules. Browser hosts supply
parsed envelopes, register served ESM namespace roots and use the browser DI
build. Module URL delivery remains the host/downstream responsibility. A browser
loader and HTTP delivery of compiled models are not provided by this package.

## Development

Support current Active/Maintenance LTS Node.js and stable Chrome/Chromium.
Set `CHROME_PATH` when the browser executable is not `google-chrome`.

```sh
npm ci
npm run verify
npm run test:browser
npm pack --dry-run
teqfw-platform .
teqfw-esm-validator . --profile base
```

`npm run verify` runs ESM validation and Node tests. `npm run typecheck` is a
separate optional check; `npm run test:browser` runs the browser checks.

Tests cover logical composition, acquisition, exact normalization, independent
canonical/hash fixtures and a real installed archive. CI performs full Node
verification and one minimal browser composition/fingerprint check; the latter
does not provide dedicated coverage of compiler entity selection.

## Context and consumer skill

The private cognitive context is an independent Git checkout excluded from npm.
Authorized maintainers can mount it with:

```sh
git clone git@github.com:flancer32/teqfw-dem-ctx.git ctx
adsm-ctx validate .
```

The [consumer skill](skills/teqfw-dem/SKILL.md) ships under `skills/teqfw-dem/`.
Hosts select and mount it into their agent discovery location; installation does
not alter host configuration.

## License

Apache-2.0.

Adapters can share exact in-memory selection behavior through
`TeqFw_Dem_Repository_Select$` (`exec({entity, records, selection})`). The component
normalizes detached records and applies DEM filters, ordering and pagination
without persistence. `@teqfw/dem/conformance/values` supplies a common all-type
workload and logical transcript for direct comparisons of real backends.

## Isomorphic data access

The same compiled model and repository commands can be used with DEM-IDB in the
browser and DEM-RDB in Node. DEM-RDB uses one relational projection: each DEM path
maps to a table and each declared attribute maps to a column. See the published
[compatibility matrix](skills/teqfw-dem/references/compatibility.md) and
[repository contract](skills/teqfw-dem/references/repository.md).

Hosts may map the separate optional `TeqFw_Dem_Api_RepositoryBatch$` contract to
their configured adapter provider. execute({operations:[{path,method,params}]})
returns {results} after one commit; failures roll back the batch. Existing CRUD/list
parameter/result shapes are retained. DEM owns logical planning, while adapters
own persistence and generation. No implicit synchronization is supplied.

A runnable unchanged application component is published at
`conformance/application/Workflow.mjs`, with its logical schema alongside it. It
depends only on DEM contracts. See the
[application guidance](skills/teqfw-dem/references/repository.md#unchanged-application-example).

## Development direction

DEM follows TeqFW's rapid evolution principle: fast feedback on its main
functionality takes priority over reliability and repeatability as development
goals. Deliver the happy path and fail fast on unexpected conditions instead of
adding retries, inferred repairs or hidden recovery paths. Preserve operation
atomicity, values and applicable invariants when reporting failures.

Documentation defines the desired current state; code and tests must follow it.
Implementation drift is a defect to correct, not a parallel legacy contract.
Backward compatibility is not a goal: avoid compatibility layers and obsolete
behavior. Decisions record directions taken and rejected; Git retains the history
for anyone who needs an earlier implementation; npm releases retain earlier packages.
Do not build migration or legacy-support mechanisms without an explicit current
requirement. Prefer simple solutions over generalized infrastructure. Keep checks
small and focused on essential behavior; add verification for an actual defect,
architectural invariant or immediate integration need instead of exhaustive
compatibility matrices. Undesigned capabilities still
require explicit design rather than speculative API generation.
