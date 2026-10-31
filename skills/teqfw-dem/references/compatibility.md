# Cross-backend capability matrix

The strategy is to maximize shared functionality through native or software
realizations. DEM defines logical behavior; adapters choose physical representations.
The matrix describes current implementation, not fundamental engine limitations.

| Capability | IndexedDB | SQLite | PostgreSQL | MariaDB |
| --- | --- | --- | --- | --- |
| Core DEM value storage | Structured logical values | Native columns plus exact text/blob codecs | Native integer/numeric/bytea plus reversible text codecs | Native integer/decimal plus reversible binary codecs |
| Signed/unsigned 64-bit ordinary integers | Exact strings | Exact text | bigint / numeric(20,0) | bigint / bigint unsigned; string driver results |
| Decimal | Exact strings | Exact text | numeric up to supported typmod; text fallback | decimal within 65 digits/38 scale; binary text fallback |
| Text/binary payload beyond 512 bytes | Yes | Yes | Yes | Yes for unindexed columns; indexed values remain bounded |
| JSON and dense/bit/sparse vectors | Logical JSON | Serialized text | Serialized text | Serialized binary UTF8 |
| Nanosecond datetime | Canonical string | Canonical text | Canonical text | Canonical binary UTF8 |
| UUID identities | Generated and explicit | Generated and explicit | Generated and explicit | Generated and explicit |
| Integer identity capacity | Exact persistent counter | Native signed 64-bit | Native signed 64-bit | Native unsigned 64-bit |
| Keys | Transactional software checks | Native constraints | Native constraints | Native constraints, finite index width |
| Relations | Descriptive default; optional checked mode | Native foreign keys | Native foreign keys | Native foreign keys |
| Selection semantics | Shared software evaluator | Native simple cases, shared fallback | Native simple cases, shared fallback | Native simple cases, shared fallback |
| Schema lifecycle | Versioned snapshots and structural updates | Explicit initial creation | Explicit initial creation | Explicit initial creation with DDL cleanup |

Selection fallback applies to extended numeric and structured/date-time entities
whose native ordering or conversion is not portable. Simple native SQL selections
remain available. Physical indexes and execution speed are not shared guarantees.

Current gaps include unbounded logical identity values beyond native numeric limits, unbounded indexed
MariaDB values, common schema evolution, multi-operation atomicity and query
planning beyond eligible exact-key/equality lookup. Non-well-formed UTF16 text is explicitly unsupported
by the RDB codec; PostgreSQL text also rejects zero characters. These are known
representation gaps to investigate, not a target restriction on the logical model.
No automatic synchronization or cross-source transaction is supplied.

The shared `@teqfw/dem/conformance/values` workload produces a full logical
transcript. DEM-RDB's `test:compare` compares that transcript against real browser
IndexedDB and each enabled SQL engine. This proves only the covered action trace;
strict repository, lifecycle, concurrency and failure tests remain separate gates.

## Physical facilities consulted

- [Knex schema builder](https://knexjs.org/guide/schema-builder.html)
- [Knex query builder](https://knexjs.org/guide/query-builder.html)
- [PostgreSQL numeric types](https://www.postgresql.org/docs/current/datatype-numeric.html)
- [PostgreSQL binary data](https://www.postgresql.org/docs/current/datatype-binary.html)
- [MariaDB decimal](https://mariadb.com/docs/server/reference/data-types/numeric-data-types/decimal)
- [MariaDB long binary data](https://mariadb.com/docs/server/reference/data-types/string-data-types/longblob)
- [IndexedDB](https://www.w3.org/TR/IndexedDB/)

PostgreSQL pgvector is an optional physical optimization, not a prerequisite for
logical vector storage. Its float32 representation is not a lossless replacement
for all JavaScript float64 values. Native similarity search is a distinct potential
API from ordinary vector persistence and is not currently in the shared contract.
