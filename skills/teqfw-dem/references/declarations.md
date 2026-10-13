# Logical Declaration Contract

## Status and representation

This format-1 contract is implemented by package v0.2.0. Runtime component
boundaries are described in [runtime components](scope.md).
Logical nodes form a flat dictionary of absolute paths: package keys end with `/`,
entity keys do not. Parent packages are derived; explicit package entries describe
empty packages with optional comments. Logical and npm package names are independent.
Reserved non-path keys carry document data: `$format`, `$comment` and
`$dependencies`. There are no physical fields or fragmentId.

Entity attributes are arrays with unique names, retaining projection order.
Named keys/indexes/relations contain ordered attribute lists.
Paths normalize before collision checking. Duplicate entity paths are invalid,
including duplicate raw JSON keys; acquisition must not silently discard them.

## Explicit dependency and special type grammar

`$dependencies` declares local names for required external entities and lists
required attribute aliases. Each declaration is scoped to its originating npm
package and names no actual provider. A relation target is either local `path`
or external `dependency`, never an implicit unresolved path used as a substitute
for an external contract. External target attributes must be declared aliases.

`type.name: identity` marks an id, and `type.name: ref` marks an attribute
whose type derives from its relation's target id. These are logical roles, not
integer synonyms. Ordinary attributes name concrete logical types.
A ref needs one unambiguous target id. Host selection resolves each id's logical
profile; refs inherit that profile without inheriting generation. The resulting model
retains these roles and targets alongside resolved types.

## Consumer schema examples

Schema contributed by `@example/sale`:

```json
{
  "$format": 1,
  "$dependencies": {"user": {"attributes": ["id"]}},
  "/vnd/sale/order": {
    "attributes": [
      {"name": "id", "type": {"name": "identity"}},
      {"name": "user_id", "type": {"name": "ref"}}
    ],
    "relations": {
      "user": {
        "attributes": ["user_id"],
        "target": {"dependency": "user", "attributes": ["id"]}
      }
    }
  }
}
```

Schema contributed by `@example/customer`:

```json
{
  "$format": 1,
  "$dependencies": {"user": {"attributes": ["id"]}},
  "/vnd/customer/address": {
    "attributes": [
      {"name": "id", "type": {"name": "identity"}},
      {"name": "owner_id", "type": {"name": "ref"}}
    ],
    "relations": {
      "owner": {
        "attributes": ["owner_id"],
        "target": {"dependency": "user", "attributes": ["id"]}
      }
    }
  }
}
```

Both dependencies are named user, but their scopes differ.
Schema contributed by `@example/accounts`:

```json
{
  "$format": 1,
  "/vnd/accounts/user": {
    "attributes": [{"name": "user_key", "type": {"name": "identity"}}]
  },
  "/vnd/accounts/operator": {
    "attributes": [{"name": "operator_key", "type": {"name": "identity"}}]
  }
}
```
A local relation could instead use
`{"path": "customer", "attributes": ["id"]}` when the target is in its own
fragment; relative paths use the original containing package. External needs stay explicit
regardless of whether another fragment happens to supply a matching path.

## Host map example

```json
{
  "$format": 1,
  "sources": {
    "@example/sale": {
      "rename": {"/vnd/sale/": "/app/sale/"},
      "bind": {
        "user": {
          "path": "/app/accounts/user",
          "attributes": {"id": "user_key"}
        }
      }
    },
    "@example/customer": {
      "bind": {
        "user": {
          "path": "/app/accounts/operator",
          "attributes": {"id": "operator_key"}
        }
      }
    },
    "@example/accounts": {
      "rename": {"/vnd/accounts/": "/app/accounts/"}
    }
  },
  "identityProfiles": {
    "/app/accounts/user": {
      "user_key": {"type": "int", "capacity": "large"}
    },
    "/app/accounts/operator": {
      "operator_key": {"type": "uuid"}
    },
    "/app/sale/order": {"id": {"type": "int", "capacity": "large"}},
    "/vnd/customer/address": {"id": {"type": "int", "capacity": "large"}}
  }
}
```

`sources` selects contributions by npm package name. `rename` transforms original
paths into effective paths; directory rules affect descendants. Do not introduce
chained or layered ancestor/descendant rename precedence.

`bind` selects a declared external dependency, not a relation by incidental path.
Its path selects an effective entity; its attribute dictionary maps every required
alias to an actual attribute name. All relations using that dependency share the
binding. Relation-local attribute order and composition are unchanged.
In this example order's user_id inherits user_key's int/large profile and
address's owner_id inherits operator_key's uuid profile. To share one target, bind both
user dependencies to `/app/accounts/user` with id mapped to user_key.

`identityProfiles` selects a logical profile by effective entity path and id
attribute: `{"type": "uuid"}` or `{"type": "int", "capacity": "small"}`,
with int capacity restricted to small, regular or large. These are qualitative
population expectations, not bits, SQL types or hard bounds. Downstream selects
representation and reports actual limits. UUID generation/allocation is separate.
The profile grammar and semantics are accepted target requirements.

Every declared external dependency requires binding even when an actual entity
happens to have the same name. Unknown source/dependency/attribute selectors,
missing bindings, missing targets and non-id ref targets produce diagnostics.
Missing rename rules leave paths unchanged. Omitted identity profiles resolve to
int/regular. Each entity may declare at most one identity; it derives the
single-attribute primary key. Composite identities are unsupported. Explicit primary-key equivalence and
conflicts follow the entity grammar below.
Local relative targets normalize against the original containing package and
route through source-to-effective correspondence; moving an entity never
implicitly changes its local dependencies.

## Expected composition of the example

| Effective entity | Identity / derived primary key | Profile | Resolved ref endpoint / inherited profile |
| --- | --- | --- | --- |
| `/app/sale/order` | `id` | int/large | `user_id` → `/app/accounts/user.user_key`, int/large |
| `/vnd/customer/address` | `id` | int/large | `owner_id` → `/app/accounts/operator.operator_key`, uuid |
| `/app/accounts/user` | `user_key` | int/large | — |
| `/app/accounts/operator` | `operator_key` | uuid | — |

The dot between entity path and attribute in this table is display notation,
not an address grammar. There are four entities, each with its derived
primary key; consumer attribute orders remain as declared. No external dependency
is unresolved. Removing identityProfiles makes all four identities and both refs
int/regular. Rebinding customer's user dependency to user_key shares the sale
consumer's endpoint and profile without changing either consumer's attributes.

## Validation and normalization

All documents are JSON objects. `$format` is required and equals integer 1.
`$comment` is an optional string and has no logical identity meaning. Unknown
properties are errors at every structured node; dictionary keys are validated
according to their declared role. Duplicate raw JSON members are invalid.
Collections omitted below normalize to empty collections; null is never omission.
Identifiers for attributes, dependencies, keys, indexes and relations match
`[a-z0-9_]+`; path segments follow the same grammar except navigation segments.
Node paths normalize before collision checks. Root `/` is a package, never an entity.
Entity/package keys differing only by trailing slash are distinct.

### Schema nodes

Schema root permits `$format`, `$comment`, `$dependencies` and absolute node paths.
A package node permits only `$comment`. Parents derive from entity paths; empty
packages are accepted but excluded from fingerprint content. A dependency object
contains required `attributes`: a non-empty list of unique attribute aliases.
All declared dependencies require host bindings even if unused by a relation.

An entity requires a non-empty `attributes` array. Optional fields are `$comment`,
`primaryKey`, `uniqueKeys`, `indexes` and `relations`. Attribute names are unique.
An attribute requires `name` and `type`; optional fields are `$comment`, `nullable`,
`default` and `generation`. `nullable` and `generation` are booleans defaulting to
false. `default` is a literal JSON value, including null only for nullable attributes;
absence means no default, distinct from default null. There are no function defaults.
Default and generation=true are mutually exclusive. Generation=true declares that
an omitted value requires downstream generation, without selecting an algorithm;
it may be declared for identity or ordinary types, not ref. Generation=false does
not require generation. Identity/ref cannot declare literal defaults. Identity
cannot be nullable. Ref nullable=true makes its link optional.

`primaryKey` is a non-empty ordered list of distinct local attribute names.
An identity derives `[identity_name]`; spelling out this identical list is allowed
and canonicalizes identically. Any other list conflicts. Without identity, an
explicit composite primary key is allowed. Primary-key attributes must be non-nullable.
`uniqueKeys` is a named dictionary of non-empty ordered distinct attribute lists.
`indexes` is a named dictionary whose values contain only required `attributes`,
a non-empty ordered distinct attribute list. Indexes express lookup intent;
uniqueness belongs to keys, not provider hints. Missing attributes are errors.

`relations` is a named dictionary. Each relation contains required `attributes`
and `target`. Local attributes are a non-empty ordered distinct list. Target
contains required `attributes` and exactly one of `path` or `dependency`.
A local path addresses an entity in the same contribution; an external dependency
names a declared contract and its target attributes are declared aliases. Endpoints
have equal non-zero arity. The resolved target attribute list must equal an ordered
primary or unique key; paired types must be compatible after profile resolution.
Each ref occurs in exactly one relation position and targets an identity. Ordinary
attributes may participate in relations to compatible key attributes without
becoming refs. Type compatibility compares normalized ordinary types, or equal resolved profiles
for identity/ref pairs; the identity/ref role itself does not make those pairs incompatible;
nullability may differ. No delete/update actions or backend enforcement settings
are part of this format. For a composite relation, all-null local values represent
an absent optional link; partially null tuples are invalid. Required local members
therefore prevent an absent link.

### Type grammar

Type is `{name, params?}`. Unknown names/parameters fail; omitted params normalize
to `{}` before type-specific defaults. Identity and ref accept no parameters.
Ordinary type details are in [logical types](types.md).

### Map grammar

Map root permits `$format`, `$comment`, `sources` and `identityProfiles`.
Each source permits only optional `rename` and `bind` dictionaries. Selectors name
an acquired schema's npm package. Rename keys are original absolute node paths;
values are absolute destination paths of the same node kind. A package selector
must exist explicitly or as a derived parent. Normalize selectors before use.
Rules apply once to original paths, not successively to their own output.
Overlapping ancestor/descendant selectors in one contribution are errors rather
than precedence rules. Swapping two entity paths is allowed if final paths are
collision-free. Identity rules
without matching identities and unknown selectors are errors, never ignored.

Bind values contain exactly `path` and `attributes`. Path is an effective absolute
entity address; attributes maps every required alias to a real target name, with
no extra aliases. Binding all required aliases is mandatory; distinct aliases must
map to distinct attributes. Identity profiles contain `{type:"uuid"}` or
`{type:"int",capacity?:"small"|"regular"|"large"}`; omitted int capacity means regular.
Profiles select effective entity/id names only. Missing map means empty dictionaries,
not missing dependency bindings. Explicit empty map and absent map are equivalent.

Canonical output and serialization are defined in [target API](target-api.md) and
[canonical identity](canonical.md). This format contains no physical fields.
