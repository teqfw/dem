# Cross-backend capability matrix

The relations row states normative host-authority policy. Other rows describe
executable adapter facilities for consumer selection, not backward-compatibility
obligations or a requirement to build a broad verification matrix.

DEM defines logical capabilities and semantics, but does not guarantee their
availability in every storage environment. An adapter implements what it can
support correctly, using native facilities or software realization where justified.
It explicitly rejects unsupported requirements and must not silently weaken
supported semantics or corrupt data. Emulating missing capabilities merely for
cross-platform compatibility is not required. DEM-RDB has one relational projection,
with table and column names derived directly from the Effective DEM.

| Capability | IndexedDB | RDB (SQLite / PostgreSQL / MariaDB) |
| --- | --- | --- |
| Core values | Structured logical values | Declared columns with reversible codecs where supported |
| Keys and constraints | Store and index limits apply | Physical key, index and identifier limits apply |
| Relations | Checked unless the host explicitly accepts descriptive relations | Checked by SQL constraints |
| Query behavior | DEM selection semantics | Engine-backed queries with logical fallback where needed |
| Atomic command batches | One IDB data transaction | One SQL transaction |
| Physical projection | Object stores and indexes | One ordinary table per DEM path; columns match attribute names |

Enforce declared relations unless the host explicitly accepts relaxed integrity.
An adapter default is not host acceptance. This is the required policy for code
and tests; implementation drift must be corrected rather than preserved as a
parallel contract. No generic DEM policy interface is specified. Data
operations use logical semantics; performance and index coverage are not shared
guarantees. Every physical engine still has storage, object-count, transaction and
resource limits. Large workloads can require substantial memory because software
operations materialize logical records.

Binary compares decoded bytes. Dense/bit vectors compare numeric elements; sparse
vectors compare conceptual dense values with absent entries zero. JSON compares
canonical serialization by Unicode scalar sequence, not domain numeric or similarity
semantics. All core types support deterministic ordering, including keyless records.
JSON/vector negative zero canonicalizes to zero. Lone UTF16 surrogates are rejected
by DEM itself; valid Unicode scalars and NUL are covered by the value workload.

History-managed relational storage records the confirmed initial model and rejects
model mismatches. Automatic schema migration is not provided. Physical changes that
require data migration need explicit host-directed work.

The separate optional RepositoryBatch contract supports ordered existing CRUD/list
commands with one commit and rollback on failure. Arbitrary async transaction
callbacks, implicit references to generated results, joins, aggregation, similarity
search, automatic value migrations, synchronization and cross-store transactions
are outside the current common API. Bulk work uses explicit command batches. These
boundaries preserve a usable common interface rather than expose incompatible
engine-specific transaction lifetimes or unchosen domain semantics.

## Verification reach

`@teqfw/dem/conformance` supplies strict repository checks. The `conformance/values`
export supplies value, atomic, extended-representation and evolution transcripts.
DEM-RDB's integration suite exercises SQLite storage. Optional PostgreSQL and MariaDB
suites require separately configured databases. Passing checks proves only the
scenarios and engines they execute.

## Physical facilities consulted

- [Knex schema builder](https://knexjs.org/guide/schema-builder.html)
- [Knex query builder](https://knexjs.org/guide/query-builder.html)
- [PostgreSQL numeric types](https://www.postgresql.org/docs/current/datatype-numeric.html)
- [PostgreSQL binary data](https://www.postgresql.org/docs/current/datatype-binary.html)
- [MariaDB decimal](https://mariadb.com/docs/server/reference/data-types/numeric-data-types/decimal)
- [MariaDB long binary data](https://mariadb.com/docs/server/reference/data-types/string-data-types/longblob)
- [IndexedDB](https://www.w3.org/TR/IndexedDB/)

Optional pgvector can optimize a future similarity API; float32 storage is not a
lossless replacement for every JavaScript float64 vector value.

## Scope of compatibility

This matrix describes core realizations, not universal storage equivalence or
extension-type storage. See [implementation status](scope.md#implementation-status)
for the supported declaration and runtime boundary. Host selection of descriptive
relations must be explicit acceptance of relaxed integrity; it is not strict conformance and must
not be inferred from an adapter default. Missing applicable capabilities fail
explicitly. Entity placement and accepted deviations are host storage configuration,
separate from logical identity; DEM supplies no routing contract across stores.
