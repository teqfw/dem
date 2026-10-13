# @teqfw/dem

Domain Entity Model composes plugin-owned schema fragments into one complete,
consistent logical model. The host resolves namespace collisions, binds explicit
external dependencies and selects identity profiles. DEM runs in Node.js and
browsers; storage partitioning, projection, generation algorithms and data
operations belong to downstream packages.

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
External entity/attribute contracts always require explicit host binding.

The fingerprint is `dem-sha256-1:` plus a SHA-256 digest of canonical logical JSON.
It excludes comments, origins, empty packages, assembly steps and attribute
projection order. Ordered key/index/relation members remain significant.

See the [declaration contract and examples](skills/teqfw-dem/references/declarations.md),
[logical types](skills/teqfw-dem/references/types.md),
[compiler API](skills/teqfw-dem/references/target-api.md) and
[canonical identity](skills/teqfw-dem/references/canonical.md).

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
Only the host's map is active. See [configuration](skills/teqfw-dem/references/configuration.md).

The portable compiler imports no filesystem or CLI modules. Browser hosts supply
parsed envelopes, register served ESM namespace roots and use the browser DI
build. Module URL delivery remains the host/downstream responsibility.

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
verification and one minimal browser composition/fingerprint check.

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
