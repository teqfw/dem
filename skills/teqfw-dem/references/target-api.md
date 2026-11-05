# Compiler and Acquisition API

This is the implemented compiler/acquisition contract at the current repository revision.
Runtime components use the `TeqFw_Dem_` DI namespace and native ESM conventions.

## Extension composition

The host selects Type Definitions, either directly or from its selected Type
Providers' `getDefinitions()`, and registers them on the shared
`TeqFw_Dem_Registry$`. Finalize the Registry after all definitions are registered
and before compiling; compilation and runtime binding require this stable type set.
The host separately selects runtime handlers and passes them to the DI-resolved
`TeqFw_Dem_Repository_Runtime$`. There is no automatic provider or handler discovery.
The following is a complete Node.js example; `example.Token16` and its handler are
application-owned examples, not bundled providers.

```js
import Container from '@teqfw/di';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';

const require = createRequire(import.meta.url);
const demRoot = dirname(dirname(require.resolve('@teqfw/dem/conformance')));
const container = new Container({
    namespaces: [{prefix: 'TeqFw_Dem_', target: join(demRoot, 'src'), defaultExt: '.mjs'}],
});
const definition = {
    name: 'example.Token16', parameters: {},
    normalizeParams(params) {
        if (Object.keys(params).length) throw new TypeError('No parameters allowed');
        return {};
    },
    valueDomain: 'A fixed 16-byte token.', preservation: 'Preserve all bytes.',
    valueHandling: 'Validate and copy bytes.', equality: 'Bytewise equality.',
    ordering: 'Unsigned lexicographic order.',
};
const handler = {
    name: 'example.Token16',
    normalize(value) {
        if (!(value instanceof Uint8Array) || value.length !== 16) throw new TypeError('Expected 16 bytes');
        return value.slice();
    },
    copy: value => value.slice(),
    equals: (a, b) => a.every((byte, i) => byte === b[i]),
    compare(a, b) {
        for (let i = 0; i < 16; i++) if (a[i] !== b[i]) return a[i] - b[i];
        return 0;
    },
};
const registry = await container.get('TeqFw_Dem_Registry$');
registry.register([definition]);
registry.finalize();
const compiler = await container.get('TeqFw_Dem_Compile$');
const {model} = await compiler.exec({schemas: [{
    packageName: '@example/app', filename: 'etc/dem-schema.json',
    document: {$format: 2, $namespace: '/app/', item: {
        attributes: [{name: 'id', type: {name: 'integer'}},
            {name: 'token', type: {name: 'example.Token16'}}],
        primaryKey: ['id'],
    }},
}]});
const runtime = await container.get('TeqFw_Dem_Repository_Runtime$');
const bound = runtime.bind({model, registry, handlers: [handler]});
const entity = bound.model.entities['/app/item'];
const token = bound.normalize.value({attribute: entity.attributes[1], value: new Uint8Array(16)});
const selection = bound.selection.create({entity, selection: {where: {
    kind: 'call', operator: 'eq', args: [
        {kind: 'attr', name: 'token'}, {kind: 'value', value: token},
    ],
}}});
const {records} = bound.select.exec({entity, selection, records: [{id: '1', token}]});
console.log(records); // one matching record
```

`bind({model, registry, handlers})` checks that each extension type used by the
model has a compatible selected handler and returns the model plus bound
`normalize`, `selection` and `select` operations. Each binding has its own model
and dispatch; the same container and Registry may serve several models. Handlers
synchronously validate and copy non-null values without mutating inputs. Their
optional Equality, Ordering and literal conversion must match the Type Definition;
Ordering requires Equality and compare-zero means equal. Normalized parameters are
passed to handler operations; mutable query operands are captured and isolated. See the
published [Type Definition, Type Provider and Runtime Type Handler interfaces](https://github.com/teqfw/dem/blob/770ed0b/types.d.ts#L101-L103)
for signatures. A host-selected adapter still owns persistence and must support the
bound types; binding alone does not acquire a Repository.

Accepted target, not yet implemented: the binding will also expose synchronous
`batch.validate({operations})` and `batch.plan({operations, rows, generate, created?,
enforceRelations?})`, capturing the model and selected handlers. See the
[Batch contract](repository.md#atomic-command-batches).

## Portable compiler

`TeqFw_Dem_Compile$.exec({schemas, map?, selection?})` returns a Promise. Schemas is a required
array of `{packageName, filename, document}` envelopes; map is an optional envelope
of the same shape. Document is parsed JSON following the
[declaration contract](declarations.md). PackageName is a non-empty npm package
name identifying origin; filename is a non-empty package-relative source filename.
Each schema origin occurs once. Map origin may also contribute a schema.
There are no fragmentId, mapId, caller revisions, physical inputs or CLI imports.
Empty schemas is valid and compiles an empty model if no map selector requires a source.
Null is invalid for schemas/map; omission is the sole way to supply no map.
Unknown envelope/API argument properties fail. Compiler inputs are JSON data,
not functions, cyclic objects, undefined-valued members or class instances.
Acquisition detects duplicate raw JSON members; already parsed envelopes cannot
prove that raw duplicates were absent.

Success is an immutable object with exactly:

- `model`: `{packages, entities}`. Packages is a lexically sorted array of normalized
  absolute package paths. Omitted selection retains derived parents and explicit empty
  packages; explicit selection retains only ancestors of selected effective entities.
  Non-empty models include `/`. Entities is a dictionary by effective entity path.
- `canonical`: canonical logical data defined in [canonical identity](canonical.md).
- `fingerprint`: identifier computed from canonical, not model presentation order.
- `provenance`: `{entities, map, pathMappings, bindings}`. Entities maps effective paths to
  `{packageName, filename, namespace, originalPath}`. Map is its source `{packageName,filename}`
  or null. `pathMappings` is an array of
  `{packageName,namespace,originalPath,effectivePath,rule}` for selected entities,
  sorted by package then original path. `rule` is the applicable `{from,to}` host
  rename or null. `bindings` is an array
  of `{packageName,dependency,path,attributes}` recording relevant resolved alias maps,
  sorted by package then dependency. These two arrays retain applied path/binding
  evidence without making it logical content.
- `graph`: `{edges, components}`. Edges is a sorted array of distinct
  `{from,to}` effective entity dependency pairs, including local and external relations.
  Sort edges by from then to. Components is the strongly connected partition of selected entities: each component
  sorted by path, components sorted by their first path. Cycles are allowed.
- `warnings`: a deterministically sorted diagnostic array; no warning conditions
  are currently mandated, so an empty array is valid.

An effective entity contains exactly `attributes`, `primaryKey`, `uniqueKeys`,
`indexes`, `relations`. Attributes retains the declaration array order; every
attribute contains name, normalized type, nullable and generation, plus default
only when declared. Ordinary types contain name and normalized params. Identity
and ref contain name and resolved profile `{type,capacity?}`, with no params.
PrimaryKey is its ordered list or null. Named keys and indexes retain their declared
names and ordered lists. Relations retain names/local ordered attributes; targets
are `{path,attributes}` using effective paths and actual names, without dependency
aliases. Comments are not published as logical fields. Ref endpoints are supplied
by their relation position, not duplicated as attribute-level fields.

`assertResult({value})` returns value only for successful results produced by that
compiler instance; otherwise throws TypeError. This is an in-memory trust check,
not a persistence or cross-runtime authenticity claim. All nested success objects
are frozen. Compilation does not mutate inputs or write files.

## Errors and diagnostics

Invalid inputs reject the Promise with frozen `DemCompilationError`, containing
`diagnostics` (non-empty) and `warnings`; there is no result/model on failure.
A diagnostic contains exactly `{code,severity,source,pointer,details}`.
Severity is error or warning. Source is `{packageName,filename}` or null when no
valid envelope can be identified. Pointer is a JSON Pointer into that document,
or "" for envelope/global errors; details is a JSON object providing selectors
or endpoints when applicable. Diagnostic ordering compares code, source package,
source filename, pointer, then canonical details; absent source sorts first.
Remove exact duplicate diagnostics. English message rendering is outside the
machine contract. Invalid syntax may prevent semantic checks for that document;
aggregate independent errors from other valid documents without guessing missing data.

| Code | Condition |
| --- | --- |
| DEM_INPUT | Invalid API/envelope shape or duplicate schema origin |
| DEM_FORMAT | Unsupported/missing $format, unknown fields or malformed declaration shape |
| DEM_PATH | Invalid/noncanonical path, namespace ownership violation, reserved `/dem` path, or invalid local reference |
| DEM_MAP | Unknown selector, conflicting/overlapping rename or invalid binding dictionary |
| DEM_COLLISION | Effective entity collision between contributions, with both source paths |
| DEM_DEPENDENCY | Missing/undeclared external dependency or binding |
| DEM_TARGET | Missing target entity/attribute or external local-path lookup |
| DEM_TYPE | Invalid type/params, default, profile or incompatible relation types |
| DEM_IDENTITY | Multiple/nullable identities, forbidden identity/ref default or non-id ref target |
| DEM_KEY | Invalid primary/unique key/index members, nullable primary members or identity/primary conflict |
| DEM_RELATION | Invalid arity, ambiguous/missing ref participation or target not an ordered key |

Validate shape before paths, composition, bindings, type/profile resolution and
keys/relations. Do not report downstream cascades for a declaration whose required
upstream structure failed. For example, an unknown target reports DEM_TARGET,
not a speculative type mismatch. Multiple independent rule violations may emit
multiple codes. Branch on codes and pointers, never a locale-dependent message.

## Node acquisition adapter

`TeqFw_Dem_Acquire$.exec({hostRoot, packageNames?})` returns a Promise of
`{schemas,map?}` suitable for the portable compiler. HostRoot is an absolute
application directory. Use the package-registry mechanism used by CLI; see the
[configuration contract](configuration.md) for that integration boundary. Never infer host
from cwd. PackageNames, when present, is a unique list of npm package names
restricting selected schema contributions; otherwise select all discovered
packages. A selected unknown name or duplicate discovered npm name is an error.
The host's map is acquired independently of this selection; the host's schema
follows selection like any other schema. Sort returned schemas by packageName.

Read `teqfw.dem` and files according to package-root configuration. Validate metadata shape/types for selected origins and the host; resolve schema
paths only for selected origins and map paths only for the host.
Acquisition is read-only, has no browser counterpart and does not compile.
It rejects with DemAcquisitionError carrying the same diagnostic shape using
DEM_CONFIG, DEM_FILE, DEM_JSON or DEM_DISCOVERY codes, respectively for metadata,
file access, JSON parsing/duplicates or package discovery/selection failures.
A missing implicit file is optional. Permissions/unreadability are errors.
No symlink sandbox is promised: containment rules are lexical package-relative
path rules; linked npm packages remain supported.

Portable CRUD/List is a separate [entity-access contract](repository.md); it does
not change these compiler/acquisition envelopes or canonical content.

## Entity selection

The optional `selection` argument on the [portable compiler](#portable-compiler)
controls membership in each independently compiled model.

`schemas` and `map` retain their envelope, format and JSON-data contracts above.
`selection`, if present, is an array of closed JSON objects with exactly two
required non-empty string properties: `packageName` and `entityPath`. Each pair
addresses a schema envelope by its exact `packageName` and an entity in that
schema by its original, absolute, canonical entity path, before any map. Canonical
means an absolute entity path whose segments match `[a-z][a-z0-9]*`; `/`, a
trailing slash, a relative path, redundant `/`, `.` or `..`, invalid characters
and traversal are invalid selectors. The path must name an entity, not a package.
Format 2 declaration keys are relative and canonical; prepend their descriptor's
`$namespace` to obtain the original path. Case and npm package names are compared exactly.

- Omit `selection` to select all entities in all supplied schemas. To select all
  entities of just one package, enumerate that package's entity pairs; there is no
  wildcard or package selector. Omitted and `null` are not equivalent.
- An explicit empty array selects no entities. Non-array or `null` is invalid.
  With no conflicting host rules, it produces an empty model even when schemas
  contain entities. No supplied descriptor is mutated or copied by the caller.
- Entries must be unique by the pair. Unknown package names, unknown entity paths,
  duplicate pairs, missing/extra fields and invalid property types fail. Selector
  order has no significance. Compile multiple models by independent repeated calls,
  each with its own `selection` and optional `map`; calls neither share composition
  state nor create a registry. The same pair can occur in separate calls.
- Selection shape/address failures use `DEM_INPUT`, severity `error`, source `null`
  and pointer `""`, because selection is an API argument, not a document. `details`
  is `{reason, packageName?, entityPath?}`: `reason` is `selection-type`,
  `selector-shape`, `selector-path`, `selector-duplicate`, `selector-package` or
  `selector-entity`; include packageName/entityPath only when each is a string in
  the offending selector. Do not include array indices. Deduplicate exact
  diagnostics and sort by the existing diagnostic ordering. For one selector,
  apply these checks in the listed order after the array check; report only its
  first failure. Duplicate detection follows shape/path validation and precedes
  existence checks. Independent invalid selectors aggregate; permutations yield
  identical diagnostics. Group identical validly shaped pairs before existence
  checks. For duplicates report one `selector-duplicate` diagnostic per duplicate pair, including both
  strings, and skip existence checks for that pair. For an unknown package use
  `selector-package`; for a known package and unknown entity use `selector-entity`.

### Validation and composition

First validate the complete API/envelope structure, Format 2 schema structure,
Format 1 host-map structure, JSON types, member names, required fields and declared
node path syntax of every supplied schema and map, including excluded entities and
unused dependency/binding rules. Validate unique source namespaces and child-namespace
ownership across all supplied schemas before selection. Reject source declarations
in `/dem` or its subtree at this stage. Validate map rule syntax including canonical
absolute addresses, closed objects,
profile value grammar, binding alias names, exact declared alias keys and distinct
valid attribute-name values, even for an irrelevant binding. Relation local-path
syntax and dependency-name syntax are checked even for excluded entities; target
existence, declared-contract lookup and logical type/key checks are semantic and
run only for selected entities. Unknown map source or binding dependency name, malformed syntax and overlapping rename rules remain
errors. Already-parsed input cannot prove absence of duplicate raw JSON members.
Independent document shape errors aggregate subject to existing stage short-circuit
rules; they use their existing source and document JSON Pointer. If shape decoding
fails, do not issue speculative selection or later-stage diagnostics.

Next validate `selection` against decoded original schema paths. The selection is a
set of pairs; derive it as all decoded entities if omitted. Apply origin-scoped
rename rules only after selection. An entity rename key must name a selected original
entity; unknown or excluded entity keys fail `DEM_MAP`. A namespace rename key
must identify an original explicitly declared or derived source namespace; it may
have zero selected descendants and then has no effect. Existing no-overlap rules
apply even to unused rules. Map source names still must identify supplied schemas.
Identity profiles address effective selected entity paths and actual identity names;
excluded/unknown paths or non-identity attributes fail `DEM_MAP`, invalid profile
values fail `DEM_TYPE`. Detect path collisions only among selected entities; a
collision is `DEM_COLLISION`, never resolved by input or selector order.

For a selected local relation, normalize the target in the referring entity's
original package, look it up in that same source's selected originals, then route
to its effective path. A missing or excluded target is `DEM_TARGET` with the
referring schema source and relation pointer; it is never auto-selected. For a
selected external relation, its dependency must be declared by that source and
its target aliases must be declared; otherwise `DEM_DEPENDENCY`. A contract is
relevant iff at least one selected relation in that source references it. Each
relevant contract, including one also used by excluded entities, requires an
explicit binding of **all** declared aliases to distinct actual attributes of one
selected effective target. A missing binding is `DEM_DEPENDENCY` at the schema's
`/$dependencies/<name>` pointer. A well-formed relevant binding whose target or
attribute is missing or excluded is `DEM_TARGET` at the map's `/sources` pointer;
incompatible types and key/ref requirements retain existing diagnostics. Source
and pointer conventions remain those of the existing API.

A declared contract used by no selected relation needs no binding. An optional
binding supplied for it must pass the complete syntax and alias checks above but
its target and attributes are not looked up, it does not generate a graph edge or
binding provenance, and it cannot create a missing-target error. A binding for an
undeclared contract remains `DEM_MAP`, even if no entity is selected. Semantic
checks on excluded entities, such as unresolved relation endpoints, invalid types,
keys or identity compatibility, are not performed; their structural grammar still
must be valid. Graph cycles of selected entities are analyzed under the existing
rules and are not categorically prohibited. Missing dependencies are never included,
inferred or repaired; failure returns diagnostics and no usable partial model.

### Result, identity and compatibility

The success envelope, immutable ownership, `assertResult`, failure envelope and
canonical algorithm remain unchanged. For explicit selection:

- `model.entities` contains exactly the selected entities at effective paths.
  `model.packages` is the sorted distinct ancestor packages of these effective
  paths, including `/` for any selected entity. Explicit empty source packages and
  paths belonging only to excluded entities are not emitted. `selection: []`
  yields `{packages: [], entities: {}}`, subject to input validation above.
- `canonical` and `fingerprint` use the existing `dem-logical-1` and
  `dem-sha256-1` contracts on selected effective content. Excluded entities,
  unused contracts/descriptors, selector order, packages, provenance and mapping
  steps do not enter canonical identity. Equal final logical content gives equal
  canonical bytes and fingerprint; hashes remain subject to the existing collision
  limitation. A malformed unused descriptor still fails before output.
- `provenance.entities` and `pathMappings` cover selected entities only;
  entity provenance retains package identity, source namespace and original path;
  path mappings retain effective paths and applicable rename evidence. `bindings`
  covers resolved relevant bindings only. `provenance.map` remains the supplied
  map's source or null, even for an empty selection. Existing sorting applies.
  `graph` contains only selected effective entities and their resolved
  edges/components, with existing sorting. `warnings` retains existing shape and
  ordering; exclusion alone emits no warning. Existing source-linked errors and
  stage gating apply; no selector index may affect diagnostics.

When selection is omitted, `model.packages` includes explicitly empty package
nodes. `provenance.bindings` covers only resolved relevant bindings, even if unused
bindings were supplied. External contracts unused by selected entities require no
binding, including in omitted-selection calls. Malformed supplied rules still fail.
Explicitly enumerating every entity and omitting selection can therefore differ in
empty-package presentation, but not canonical identity. These are the current
requirements, not guarantees of compatibility with historical calls.

### Complete usage examples

These examples use the implemented API, Format 2 schemas, Format 1 host maps and
compiler envelopes.
Assume `compiler` is the resolved `TeqFw_Dem_Compile$` instance. Each call below can be made after the
shared fixture; no declaration is edited between calls.

```js
const schema = {
    packageName: '@example/app', filename: 'etc/dem-schema.json',
    document: {
        $format: 2,
        $namespace: '/demo/',
        $dependencies: {account: {attributes: ['id']}},
        a: {attributes: [{name: 'id', type: {name: 'identity'}}]},
        b: {attributes: [{name: 'id', type: {name: 'identity'}}]},
        order: {
            attributes: [
                {name: 'id', type: {name: 'identity'}},
                {name: 'a_id', type: {name: 'ref'}},
            ],
            relations: {a: {attributes: ['a_id'], target: {path: 'a', attributes: ['id']}}},
        },
        externalorder: {
            attributes: [
                {name: 'id', type: {name: 'identity'}},
                {name: 'account_id', type: {name: 'ref'}},
            ],
            relations: {account: {
                attributes: ['account_id'],
                target: {dependency: 'account', attributes: ['id']},
            }},
        },
    },
};
const select = entityPath => ({packageName: '@example/app', entityPath});
const map = document => ({packageName: '@example/host', filename: 'etc/dem-map.json', document});

// A: the same descriptor contributes A to one model and B to another.
const modelA = await compiler.exec({schemas: [schema], selection: [select('/demo/a')]});
const modelB = await compiler.exec({schemas: [schema], selection: [select('/demo/b')]});
// modelA.model.entities has only /demo/a; modelB has only /demo/b.

// B: reuse A independently with two identity profiles.
const uuid = await compiler.exec({
    schemas: [schema], selection: [select('/demo/a')],
    map: map({$format: 1, identityProfiles: {'/demo/a': {id: {type: 'uuid'}}}}),
});
const small = await compiler.exec({
    schemas: [schema], selection: [select('/demo/a')],
    map: map({$format: 1, identityProfiles: {'/demo/a': {id: {type: 'int', capacity: 'small'}}}}),
});
// The profiles and canonical identities differ; the original schema is unchanged.

// C: order refers locally to A, which is excluded. No automatic inclusion occurs.
try {
    await compiler.exec({schemas: [schema], selection: [select('/demo/order')]});
    throw new Error('Expected compilation failure');
} catch (error) {
    if (!error.diagnostics?.some(d => d.code === 'DEM_TARGET' &&
        d.source?.packageName === '@example/app' &&
        d.pointer === '/order/relations/a')) throw error;
    // No result/model is returned.
}

// D: externalorder alone uses account; selecting B needs no account binding.
const withoutExternal = await compiler.exec({schemas: [schema], selection: [select('/demo/b')]});
// Only /demo/b is present; no account binding provenance or graph edge exists.

// E: omission selects all entities. Supply the binding needed by externalorder.
const all = await compiler.exec({
    schemas: [schema],
    map: map({$format: 1, sources: {'@example/app': {
        bind: {account: {path: '/demo/a', attributes: {id: 'id'}}},
    }}}),
});
// all.model.entities contains /demo/a, /demo/b, /demo/order, /demo/externalorder.
```
