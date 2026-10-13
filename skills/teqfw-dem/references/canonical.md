# Canonical Logical Identity

Accepted target contract. This is independent of the current sha256-v1 runtime
field coverage. Inputs are successful normalized [target models](target-api.md).

## Canonical object

Canonical data has exactly `{domain:"dem-logical-1",entities}`. Entities is a
dictionary keyed by effective entity paths. Each canonical entity has exactly
attributes, primaryKey, uniqueKeys, indexes and relations. Convert the published
attribute array to a name-keyed dictionary, removing only the redundant name field;
retain type, nullable, generation and declared literal default. All other entity
fields retain their normalized target-API shape. Sort enum alternatives and sparse
vector entries as specified in [types](types.md).

Consequently defaults absent versus null are distinct. False nullable/generation,
empty dictionaries, normalized type params and identity profiles are materialized.
Absent/explicit identical primary keys canonicalize identically through key
normalization. Array order inside keys, indexes, relations, vectors and JSON literal
values is significant; enum order and projection attribute order are not.

Packages, comments, provenance, source filenames, dependency aliases, map steps,
graphs, warnings and source format markers are absent. Empty package additions and
explicit versus derived parent packages do not change identity. No arbitrary
metadata or physical fields may enter canonical data.

## Bytes and fingerprint

Serialize canonical data recursively with these rules:

- Objects emit all own members in ascending UTF-16 code-unit key order, independent
  of locale, insertion order or ECMAScript's integer-key enumeration. Emit sorted
  members directly; constructing a sorted object and calling JSON.stringify is
  insufficient for numeric keys.
- Arrays preserve the canonical array order. No whitespace is emitted.
- String and finite-number primitives use ECMAScript JSON.stringify representation;
  string scalar validation precedes serialization. Number -0 serializes as 0.
  Exact integer/decimal defaults have already normalized to strings.
- Booleans and null emit their JSON tokens. Undefined, NaN, infinities, cyclic data,
  functions, symbols and BigInt are rejected, never silently omitted.

Encode the serialized text as UTF-8 without BOM and compute SHA-256. Format the
identifier as `dem-sha256-1:` followed by 64 lowercase hexadecimal digits. The domain
member versions logical canonical semantics; the prefix versions serialization
and hashing. A semantic/serialization change requires a new identifier domain;
never reuse an identifier with changed meaning.

Same canonical logical content yields the same bytes and fingerprint across Node
and browsers. Fingerprint equality is practical identity evidence, not proof of
collision impossibility. Exact comparison compares canonical serialized content.

## Minimal independent fixture

No schemas and no map produce canonical bytes exactly:

```text
{"domain":"dem-logical-1","entities":{}}
```

Expected fingerprint:

`dem-sha256-1:0f445bf2de907b4ef36892aa3062ef1cea26f1a3dcc2318a22323e557764edc5`

Supplying only empty packages, comments or an explicit empty map produces those
same bytes.

## Single-identity fixture

Schema envelope:

```json
{
  "packageName": "@example/item",
  "filename": "etc/dem-schema.json",
  "document": {
    "$format": 1,
    "/app/item": {
      "attributes": [{"name": "id", "type": {"name": "identity"}}]
    }
  }
}
```

With no map, canonical content is:

```json
{
  "domain": "dem-logical-1",
  "entities": {
    "/app/item": {
      "attributes": {
        "id": {
          "generation": false,
          "nullable": false,
          "type": {
            "name": "identity",
            "profile": {"capacity": "regular", "type": "int"}
          }
        }
      },
      "indexes": {},
      "primaryKey": ["id"],
      "relations": {},
      "uniqueKeys": {}
    }
  }
}
```

Exact bytes (one line):

```text
{"domain":"dem-logical-1","entities":{"/app/item":{"attributes":{"id":{"generation":false,"nullable":false,"type":{"name":"identity","profile":{"capacity":"regular","type":"int"}}}},"indexes":{},"primaryKey":["id"],"relations":{},"uniqueKeys":{}}}}
```

Expected fingerprint:

`dem-sha256-1:165e549f6919da2ef8b49b7eca967f83500b0df8a3de1ff4967883663a8bff73`

The published model has packages ["/","/app/"] and retains id in its attribute
array. Graph edges is []; components is [["/app/item"]]. No warnings occur.
Explicit primaryKey=["id"], nullable=false, generation=false and an explicit
int/regular map produce the same canonical bytes. Identity nullable=true fails
with DEM_IDENTITY; primaryKey=["missing"] fails with DEM_KEY. These are expected
fixtures, not evidence that the target runtime is implemented.
