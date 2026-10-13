# Target Compiler and Acquisition API

Implemented compiler/acquisition contract for package v0.2.0.
Runtime components use the `TeqFw_Dem_` DI namespace and native ESM conventions.

## Portable compiler

`TeqFw_Dem_Compile$.exec({schemas, map?})` returns a Promise. Schemas is a required
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
  absolute package paths including derived parents and explicit empty packages;
  non-empty models include `/`. Entities is a dictionary by effective entity path.
- `canonical`: canonical logical data defined in [canonical identity](canonical.md).
- `fingerprint`: identifier computed from canonical, not model presentation order.
- `provenance`: `{entities, map, pathMappings, bindings}`. Entities maps effective paths to
  `{packageName, filename, originalPath}`. Map is its source `{packageName,filename}`
  or null. `pathMappings` is an array of `{packageName,originalPath,effectivePath}`
  for all entities, sorted by package then original path. `bindings` is an array
  of `{packageName,dependency,path,attributes}` recording resolved alias maps,
  sorted by package then dependency. These two arrays retain applied path/binding
  evidence without making it logical content.
- `graph`: `{edges, components}`. Edges is a sorted array of distinct
  `{from,to}` effective entity dependency pairs, including local and external relations.
  Sort edges by from then to. Components is the strongly connected partition of all entities: each component
  sorted by path, components sorted by their first path. Cycles are allowed.
- `warnings`: a deterministically sorted diagnostic array; no warning conditions
  are mandated for format 1, so an empty array is valid.

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
| DEM_PATH | Invalid/above-root logical path or normalized duplicate within a document |
| DEM_MAP | Unknown selector, conflicting/overlapping rename or invalid binding dictionary |
| DEM_COLLISION | Effective entity collision between contributions |
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
