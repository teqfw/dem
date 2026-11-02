# @teqfw/dem

Domain Entity Model composes package-owned schema fragments into complete,
consistent logical models. The host resolves namespace collisions, binds explicit
external dependencies, selects identity profiles and decides model-to-database
placement. DEM runs in Node.js and browsers; adapters own physical projection and
persistence. DEM defines portable CRUD/List contracts.

## Compile through DI

Register namespace roots before resolving components. The package root exports
types only; runtime access uses TeqFW DI tokens.

```js
import Container from '@teqfw/di';

const container = new Container();
container.addNamespaceRoot('TeqFw_Dem_', '/absolute/node_modules/@teqfw/dem/src', '.mjs');
const compiler = await container.get('TeqFw_Dem_Compile$');
const result = await compiler.exec({
    schemas: [{
        packageName: '@example/app',
        filename: 'etc/dem-schema.json',
        document: {
            $format: 1,
            '/app/user': {attributes: [{name: 'id', type: {name: 'identity'}}]},
        },
    }],
});
compiler.assertResult({value: result});
console.log(result.model.entities, result.fingerprint);
```

The immutable result contains model, canonical content, fingerprint, provenance,
dependency graph and warnings. Invalid inputs reject with a frozen
DemCompilationError containing source-linked diagnostics and no usable model.
Identity defaults to int/regular and derives a primary key; refs inherit their
resolved target identity profile. Host profiles select uuid or int with qualitative
small/regular/large capacity, without choosing physical types or bit widths.

Logical package paths use `/`, lowercase names and underscores. Package addresses
end with `/`; entity addresses do not. Package directories merge, entities never
merge. Local references preserve their original dependencies through path remapping.
External entity/attribute contracts used by selected entities require explicit host binding.

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
browser and DEM-RDB in Node. RDB offers an explicit portable projection for broad
logical key/value support and versioned structural evolution. See the published
[compatibility matrix](skills/teqfw-dem/references/compatibility.md) and
[repository contract](skills/teqfw-dem/references/repository.md).

Hosts may map the separate optional `TeqFw_Dem_Api_RepositoryBatch$` contract to
their configured adapter provider. execute({operations:[{path,method,params}]})
returns {results} after one commit; failures roll back the batch. Existing CRUD/list
parameter/result shapes are retained. DEM owns logical planning, while adapters
own persistence and generation. No implicit synchronization is supplied.

A runnable unchanged application component is published at
`conformance/application/Workflow.mjs`, with its logical schema alongside it. It
depends only on DEM contracts. DEM-RDB's `test:application` compares its execution
in SQLite and real browser IndexedDB through two host Composition Roots; see the
[application guidance](skills/teqfw-dem/references/repository.md#unchanged-application-example).
