# Portable Entity Access

DEM defines access semantics; independent backends execute persistence. No engine
ships with DEM. Register DEM's namespace as for Compile. Applications depend on
`TeqFw_Dem_Api_RepositoryProvider$`; the host maps that dependency to its chosen
provider via TeqFW DI preprocessing before first resolution. Provider get requires an exact canonical absolute entity path, not an alias,
relative path or storage address. Malformed paths reject INVALID_INPUT; absent
canonical paths reject NOT_FOUND. Repositories remain bound to that model for
their lifetime; adopting a new effective model requires host-owned reconfiguration.
The provider binds
the effective model and physical configuration at the host boundary. Application
code never imports an RDBMS or IndexedDB implementation.

```js
const provider = await container.get('TeqFw_Dem_Api_RepositoryProvider$');
const repository = await provider.get({path: '/app/user'});
const {record} = await repository.create({record: {name: 'Alice'}});
const key = {kind: 'primary', values: {id: record.id}};
const {record: found} = await repository.read({key});
const {record: updated} = await repository.update({key, changes: {name: 'Alicia'}});
const factory = await container.get('TeqFw_Dem_Dto_Query_Selection__Factory$');
const selection = factory.create({
    entity: compiled.model.entities['/app/user'],
    selection: {
        where: {kind: 'call', operator: 'eq', args: [
            {kind: 'attr', name: 'name'}, {kind: 'value', value: 'Alicia'},
        ]},
        orderBy: [{attribute: 'name', direction: 'asc', nulls: 'last'}],
        limit: 20, offset: 0,
    },
});
const {records} = await repository.list({selection});
const {deleted} = await repository.delete({key});
```

The example assumes a compiled entity with generated identity and required name.
The provider contract's default implementation rejects UNSUPPORTED; host selection
is required. There is no global backend registry in DEM.

## Methods and results

Each method accepts exactly one closed named-parameter object. Unknown fields,
undefined record/key values, extra attributes and invalid types reject; never silently strip
or cast unrelated values. All methods return promises. All records are complete,
detached mutable logical objects; mutation of arguments or results cannot alter storage.

| Method | Parameters | Result |
| --- | --- | --- |
| create | `{record}` | `{record}` committed complete record |
| read | `{key}` | `{record}` or `{record:null}` |
| update | `{key,changes}` | `{record}` after patch or `{record:null}` |
| delete | `{key}` | `{deleted:true}` or `{deleted:false}` |
| list | `{selection}` | `{records:[]}` with ordered full records |

Read/update/delete misses are successful results. Update is a nonempty partial
patch; omitted fields stay unchanged, including defaults. An unchanged patch still
returns the record. Primary-key and identity fields cannot occur in a patch.
Other unique fields can change subject to constraints. No projections, totals,
upserts, bulk methods, connection handles or transaction arguments are included.
`createMany`, `updateMany`, `deleteMany` are reserved, absent from this interface.

## Keys and constraints

`{kind:'primary',values:{...}}` selects the primary key (including an identity's
derived key). `{kind:'unique',name:'key_name',values:{...}}` selects a named unique
key. Values contain exactly its declared members, never null, in any object order.
Composite keys require every component. No arbitrary combination of keys or filter
is a key. Keyless entities support create/list; addressing rejects UNSUPPORTED.
Unknown unique-key names are INVALID_INPUT. No keyless surrogate is introduced.

Writes atomically enforce non-nullability, primary/unique keys and relations.
A unique key permits repeated records when any member is null; otherwise its tuple
is unique. A relation with any null local member has no target requirement;
otherwise its tuple must exist. Target changes/deletes restrict while referenced;
there are no cascades. Backends unable to enforce these rules reject the affected
model during provider resolution. There is no implicit cross-source transaction.

## Logical values and defaults

`TeqFw_Dem_Repository_Normalize$` supplies `value({attribute,value})`,
`record({entity,record,mode})` and `key({entity,key})`. Modes are create, update,
complete. Create supplies literal defaults and nullable nulls, leaving omitted
attributes with `generation:true` for the backend to generate. The backend fills
those fields then validates a complete record before committing. Generation has
no portable algorithm or promised sequence; failure rejects without an insert.
Explicit null never invokes defaults or generation; supplied generated values are
allowed. Complete mode requires all attributes. Update applies no defaults.

Ordinary values follow [logical types](types.md) and CoreValue normalization:
integers and decimals use exact canonical strings, dates/datetimes use canonical
strings, binary uses base64, uuid uses lowercase, JSON/vector are detached JSON.
Identity/ref int profiles use positive canonical decimal strings; safe positive
JS integer inputs normalize to strings. No capacity-to-bit-width conversion occurs.
Actual identity bounds are backend capabilities. A logically valid supplied value
outside backend capacity rejects UNSUPPORTED before effects; exhaustion during
generation rejects STORAGE without an insert. Equivalent observable behavior is
required within the intersection of supported capabilities, not for unbounded
physical capacity. Ref uses the target profile.
Unsupported values are rejected without truncation, rounding or collation changes.

## Selection

Factory `create({entity,selection})` returns a deeply frozen DTO. Repository list
must revalidate against its bound entity before execution; accepting a DTO does
not authorize mismatched attributes or unvalidated operators.
Only where, orderBy, limit and offset are allowed. Optional Selection fields
with undefined values behave as omitted fields. No SQL, joins, projections,
aggregation, arbitrary functions/predicates, regex/LIKE, backend options or hints.
Expression Factory still owns structural validation; Selection adds semantics.

| Operators | Arguments | Meaning |
| --- | --- | --- |
| and / or | at least two boolean calls | two-valued conjunction/disjunction |
| not | one boolean call | boolean negation |
| isNull / isNotNull | one attr | explicit null test |
| eq / ne | attr then literal | exact scalar equality/inequality |
| lt / lte / gt / gte | attr then literal | scalar comparison |

Every comparison involving null is false, including ne. Thus `not(eq(attr,x))`
includes null values; `ne(attr,x)` excludes them. There is no SQL unknown value.
Literals normalize to the selected attribute's type; an optional explicit type
must exactly equal its normalized name/params. Identity/ref literals omit type.
No cross-type coercion, attr-to-attr comparison or nested scalar calls are allowed.
Binary, JSON and vector comparison/sorting are unsupported; null tests remain valid.

Sorting compares integers/decimals/int identities numerically with exact precision;
booleans false before true; strings/text/enums/uuid by Unicode scalar sequence,
case-sensitive with no locale; dates and canonical datetimes chronologically.
Order items explicitly state attribute, asc/desc direction and first/last nulls.
Null placement is independent of direction. Duplicate sort attributes reject.
Append ascending missing members of an orderable non-null primary key, otherwise
first eligible named unique key by key-name order, as tie-breakers. If no such key
exists, append every attribute by name; all must be orderable. Equal full records
may remain tied because their observable values are indistinguishable. Reject
UNSUPPORTED when a keyless entity has no portable total order.

Filtering precedes sorting, followed by offset then limit. Offset defaults to zero;
omitted or null limit is unbounded; zero limit returns no records. Both numbers
must be nonnegative safe integers. No backend silently caps a page. Pagination
has no snapshot guarantee across calls or intervening writes.

## Errors, capabilities and transactions

Failures are standard Error objects named DemRepositoryError with stable code:
INVALID_INPUT (malformed request/value), UNSUPPORTED (missing capability),
NOT_FOUND (unknown provider entity path), CONFLICT (key uniqueness), RELATION
(target integrity), STORAGE (other persistence failure). Error messages, stack and
backend diagnostics are not portable. Read misses never throw NOT_FOUND.
`TeqFw_Dem_Repository_Error$` creates shared errors. Do not expose native engine
exceptions as the public result. Validate requests and capabilities before effects.

Provider resolution checks schema, types, key/relation semantics and generation
support. Selection-specific limits fail before execution. A compliant backend may
implement a portable operation without a native index, but cannot silently weaken
semantics. Every write is atomic with its constraints; failed writes leave records
unchanged. Successful results mean commit of that operation. Multiple operations
have no implicit shared transaction, snapshot or durability-class promise.
External transaction APIs may be additional backend contracts; they do not change
these signatures or promise equivalent cross-backend transaction lifetimes.

## Backend conformance

Import `register` from `@teqfw/dem/conformance`. Pass node:test's test, strict assert
and an async open({schema}) harness. Each open compiles the supplied schema, starts
an isolated empty real backend, and returns `{provider,selection,model,close}`.
Selection is DEM's Factory, model is the effective model, and close cleans storage.
Tests cover results, keys, patches, normalization, constraints, ordering, null
logic, pagination, misses, atomic failures and keyless entities. DEM includes no
persistence mock. Backend projects run this suite for their real implementations
and extend it for supported ordinary types, generation/capacity limits, concurrent
constraint races, capability rejection and failure injection. Passing DEM unit
checks alone is not evidence of backend conformance.
