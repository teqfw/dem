# Accepted Logical Model

This reference defines accepted product/design semantics. The
[declaration contract](declarations.md) supplies accepted target JSON syntax and a
complete composition example. [Runtime components](scope.md) define supported public tokens.

## Inputs and authority

DEM composes selected contributions into one complete, consistent logical
model per compilation; the host may compose several independently. Each plugin
describes its own entities, attributes, constraints and explicit
outgoing dependencies. The host can contribute a schema under the same rules.
The host owns path remapping, dependency binding and identity-profile selection;
it cannot add, remove, rename or reorder a plugin's attributes.

`dem-schema.json` describes a fragment; `dem-map.json` describes host logical
composition rules. A possible `dem-host.json` placement mechanism is unspecified
and is not read by DEM. The host chooses models, database placement, configuration and lifecycle.
DEM defines [portable entity access](repository.md); adapters own physical
representation, capability checks, generation and persistence.

## Dependencies and identities

External entity dependencies and required attribute aliases are explicit and
scoped to the originating npm package. The current compiler requires the host to
bind each contract to an actual entity and map aliases to actual attributes. Same-named dependencies from two
plugins may bind to one identity or different identities. Coincidental path/name
matches cannot substitute for a declared contract and binding.

Identity marks an identifying attribute. An entity may have at most one identity;
when present it automatically forms the single-attribute primary key. Composite
identities are unsupported. An explicitly declared identical primary key is
equivalent; a conflicting one is invalid. Entities without identity may have an
explicit, including composite, primary key or none. A ref links to a target identity and derives its whole
logical profile, without its generation policy. Final models retain roles,
resolved endpoints and profiles instead of discarding the id/ref relationship.

The host selects uuid or int with qualitative capacity small, regular or large.
An omitted profile resolves to int/regular. Capacity describes expected identity
population, not bits, a SQL type or a guaranteed range. The same plugin schema
can use different profiles in different hosts. Downstream selects representation
and reports actual limits; identity allocation remains separate.

Attributes default to non-nullable; identity is always non-nullable and refs
may be nullable. Literal defaults and logical generation requirements belong to
DEM; executable functions, algorithms and execution belong to downstream.
Ordinary type parameters constrain values, independently of physical representation.

## Paths and composition

Packages are logical directories, entities are logical files, and namespace is a
package path. Segments use lowercase letters, digits and underscores; `/` is the
separator. Absolute paths start with `/`. A trailing `/` addresses a package:
`/vendor/name/` and entity `/vendor/name` may coexist. Support `.` and `..`,
normalize repeated separators and reject navigation above root.

Normalize local references from the referring entity's original containing package:
for `/vnd/sales/order`, customer means `/vnd/sales/customer`, and ../customer means
`/vnd/customer`. This calculates an address without resolving a target. Transform
contributed paths first, merge equal package paths, and remap colliding entities
at entity or ancestor-namespace level. Different contributions' entities never
merge or overwrite each other. Do not introduce layered ancestor/descendant rename
precedence to resolve a conflict.

Route normalized local addresses through their contribution's original-to-effective
correspondence, then resolve against the completed common tree. Moving order alone
must preserve its original customer dependency. Host external bindings select
effective target paths and explicit attribute correspondence.

## Model identity

Fingerprint final logical content only: effective entity paths, attributes,
id/ref roles, resolved profiles, keys, indexes, constraints and resolved relations.
Exclude comments, empty packages, provenance, origins, resolved dependency aliases,
input order and map/build steps. Normalize equivalent omissions and explicit defaults.

Retain entity attribute order for downstream projection, but ignore it for the
fingerprint. Named collections and enum alternatives are order-independent;
attribute order inside keys, indexes and relations is significant. Identical
canonical content yields identical fingerprints independently of build/runtime.
Finite hashes can collide; exact equality requires canonical-content comparison.
Exact serialization is defined in the [canonical contract](canonical.md).

## Acquisition and runtime direction

Defaults are `etc/dem-schema.json` and `etc/dem-map.json`. Each npm package supplies
at most one schema; current Node acquisition reads one configured host map. A
caller may supply a different map to each compiler invocation. Select contribution
origins by npm package name. Missing implicit default files are allowed; missing
explicitly configured files are errors. Package-root-relative overrides are:

```json
{
  "teqfw": {
    "dem": {
      "schema": "etc/dem-schema.json",
      "map": "etc/dem-map.json"
    }
  }
}
```

Node acquisition uses the @teqfw/di package registry also used by CLI bootstrap,
separate from the portable compiler.
Supported environments are current Active/Maintenance LTS Node.js and stable
Chrome/Chromium. Full Node verification and a minimal browser multi-schema/map
composition with a matching Node fingerprint are required. Downstream delivers
browser modules by URL. DI-registry discovery, metadata acquisition and format 1
are implemented in v0.2.0; consult the [runtime reference](scope.md) for component boundaries.

## Entity-level target and current boundary

The accepted direction lets the host select entities for each independent model by
`(packageName, original entity path)`, reuse entities, and supply model-specific
maps and profiles. Selected dependencies must be explicitly satisfied; unused
external contracts add no binding obligation. The current v0.2.0 compiler instead
accepts whole descriptors and requires all declared external bindings, even unused
ones. Entity selection, a common browser/Node declaration source and HTTP model
delivery are not implemented. The host controls publication and placement.
