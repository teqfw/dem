# @teqfw/dem

Domain Entity Model (DEM) composes plugin-owned logical schema fragments under
host-application rules. Storage-independent DEM v2 compilation runs in Node.js
and browsers. The package decodes trusted declarations, composes fragments with
single semantic ownership, resolves host mappings and identity/reference types,
validates logical types/indexes/relations/expressions, and analyzes dependencies.
It has no database, filesystem, Node crypto, Buffer, Knex, or driver dependency.

## Compile through DI

Hosts register namespace roots from package metadata before resolving components.
With `@teqfw/di` 2.11+ in Node.js:

```js
import Container from '@teqfw/di';

const container = new Container();
container.addNamespaceRoot('TeqFw_Dem_', '/absolute/node_modules/@teqfw/dem/src', '.mjs');
const compiler = await container.get('TeqFw_Dem_Compile$');
const result = await compiler.exec({
    fragments: [{
        fragmentId: 'app', packageName: 'app', filename: '/models/app.json',
        declaration: {version: 2, entity: {
            user: {attr: {id: {type: {id: 'core.identity'}}}},
        }},
    }],
    mapEnvelope: {
        mapId: 'app-map', packageName: 'app', filename: '/models/map.json',
        declaration: {version: 2},
    },
});
compiler.assertResult({value: result});
console.log(result.graph.entities, result.fingerprint);
```

A browser host registers a served ESM source URL in place of the absolute path
and uses the browser build of DI. Filename fields are trusted evidence strings;
DEM never opens them. Hosts select/acquire fragments and choose persistence.

`exec({fragments, mapEnvelope})` returns a Promise of a deeply frozen result:
`{effective, fingerprint, model, provenance, graph, requirements, warnings}`.
`effective` contains `{model, provenance, fingerprint}`; both fingerprints identify
the same effective model. There is no physical plan. `assertResult({value})`
accepts only successful results produced by that compiler instance. Copies and
results from other instances fail. On invalid declarations, `exec` throws a frozen
`DemCompilationError` with ordered `diagnostics` and `warnings`, without a usable
model. Diagnostic codes, paths, details and sources support programmatic handling.

See the [consumer guide](skills/teqfw-dem/references/scope.md) for declaration
semantics, type wiring, supported components, and the implementation boundary.
Implementation-stage tokens are internal. The package root exports types only;
use DI tokens for runtime access.

## Current runtime and product boundary

`sha256-v1` sorts every enumerable own object key recursively, preserves array
order, serializes JSON and hashes its UTF-8 bytes. Portable synchronous SHA-256
hashes equivalent canonical inputs identically across runtimes. Provenance
is excluded. Comments, storage hints, map namespace and index phase remain in
the current canonical input. A different hint can
therefore change the fingerprint even when a backend ignores it.

The product contract is logical-only: fragments describe domain meaning, host
maps bind them into one complete model, and other plugins partition/project it.
Physical fields in the current runtime are an implementation gap to remove.
Default schema/map file discovery and general renaming are not implemented.

Storage bindings, SQL map namespace, index method/options/phases and deferrability
are currently accepted declaration data. DEM validates version 2 shapes and structural
invariants; backends validate their supported physical realization and capabilities.
Declared `requires` are collected, not negotiated against an implicit SQL adapter.
Default identity remains signed 32-bit integer with native `byDefault` generation;
host profiles may select established integer representations and `always` mode.
UUID identity generation and synchronization between databases are outside scope.

## Development

Use Node.js 22+ and npm. For real browser verification, install Google Chrome or
set `CHROME_PATH` to a Chromium executable.

```sh
npm ci
npm run verify
npm run test:browser
npm pack --dry-run
teqfw-platform .
teqfw-esm-validator src --profile base
```

Tests cover standalone logical compilation and an actual archive installed into an
isolated consumer. Browser verification compares independently compiled results
against Node.js. Public CI checks Node.js 22/24 and Chrome without private context.
No npm publication is performed by CI.

## Context and consumer skill

The private cognitive context is an independent Git checkout ignored by product
Git and excluded from npm. Authorized maintainers can mount it with:

```sh
git clone git@github.com:flancer32/teqfw-dem-ctx.git ctx
adsm-ctx validate .
```

The version-matched [consumer skill](skills/teqfw-dem/SKILL.md) is published under
`skills/teqfw-dem/`. Hosts select and mount it into their own agent discovery
location; installation does not alter host configuration.

## License

Apache-2.0.
