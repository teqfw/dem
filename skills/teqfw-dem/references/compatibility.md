# Cross-backend capability matrix

DEM defines logical behavior. Adapters use native facilities or reversible software
realizations to maximize shared functionality. RDB's explicit `projection:'portable'`
mode provides the broadest common surface; `native` remains its default and retains
existing physical layouts. These modes are separate layouts, not interchangeable
views of existing tables.

| Capability | IndexedDB | RDB portable (SQLite / PostgreSQL / MariaDB) | RDB native |
| --- | --- | --- | --- |
| All core DEM values | Structured logical values | Per-attribute native columns plus reversible codecs | Native columns plus reversible codecs |
| Exact integers and decimals | Canonical strings | Native numeric where lossless, text/binary fallback | Same for ordinary values |
| Integer identities and refs | Persistent exact counters | Persistent exact counters and textual values | Signed 64-bit SQLite/PG; unsigned 64-bit MariaDB |
| Long/composite/structured logical keys | Software checks | Software checks; private UUID row key | Physical key and index limits apply |
| Valid scalar strings including NUL | Yes | JSON-encoded textual scalars | PostgreSQL native text rejects NUL |
| JSON / binary / dense, bit, sparse vectors | Yes | Yes | Yes, MariaDB indexed payload limited to 512 bytes |
| Null/default/key semantics | DEM normalization and checks | DEM normalization and checks | DEM normalization plus native constraints |
| Relations | Descriptive default; optional checked mode | Checked default; optional descriptive mode | Checked native constraints |
| All-core comparison and ordering | Shared evaluator | Shared evaluator | Native eligible cases; shared fallback |
| Atomic command batches | One IDB data transaction | One SQL transaction | One outer SQL transaction |
| Schema history and additive evolution | Versioned snapshots | Versioned snapshots | Initial creation only |
| Query optimization | Eligible key/equality index lookup; safe fallback | Scope lock and logical snapshot evaluation | Native eligible queries; logical fallback |

Use checked relations in both adapters when strict conformance is required. Data
operations serialize conservatively in the portable profile; performance and native
index coverage are not shared guarantees. Every physical engine still has storage,
object-count, transaction and resource limits. No artificial native integer or index
width restriction is imposed on portable logical keys. Large workloads can require
substantial memory because software operations materialize logical records.

Binary compares decoded bytes. Dense/bit vectors compare numeric elements; sparse
vectors compare conceptual dense values with absent entries zero. JSON compares
canonical serialization by Unicode scalar sequence, not domain numeric or similarity
semantics. All core types support deterministic ordering, including keyless records.
JSON/vector negative zero canonicalizes to zero. Lone UTF16 surrogates are rejected
by DEM itself; valid Unicode scalars and NUL are covered by the portable workload.

Structural evolution preserves removed physical data, supports additive tables,
columns and logical defaults, and records complete model snapshots. Physical type
changes requiring value migration reject. Hosts close stale repositories and reopen
against the accepted model. MariaDB DDL is not transactional: schema updates require
host quiescence; failed attempts clean up their additions where possible, while
process interruption or failed cleanup can require operator repair. No online DDL
atomicity is promised. Projection switching requires explicit host migration.

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
DEM-RDB `test:compare` compares them with real Chrome IndexedDB and enabled SQL
engines. Engine tests separately cover failure injection, concurrency and native
numeric limits. Passing these checks proves the covered scenarios, not every
possible engine configuration or schema. Missing engine credentials are skips;
release verification must inspect the actual executed matrix.

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
