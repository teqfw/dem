# DEM package family integration audit

- Date: 2026-11-03
- Scope: Format 2 integration verification and forward-only compatibility audit
- Status: verification complete; no code or test correction was needed
- Context: project contexts were read for contract evidence and left unchanged

## Revisions and tested package combination

| Package | Branch | Git SHA | Local artifact used |
| --- | --- | --- | --- |
| `@teqfw/dem` | `main` | `8303c5ed30c25ce092db95597771c73d37e1e340` | checkout source; local npm pack installed in both adapter test environments |
| `@teqfw/dem-idb` | `main` | `6598f5de60785d8908caae760694d4fc169d2dd4` | checkout source packed and installed in DEM's test environment |
| `@teqfw/dem-rdb` | `main` | `259ff6c39d6ed4f024494be3a6dbbbc591b2d762` | checkout source packed and installed in DEM's test environment |

The adapter environments resolved `@teqfw/dem` from a tarball packed from the
DEM checkout at `8303c5e`; DEM's integration/browser tests resolved both adapters
from tarballs packed from their corresponding checkouts. This tested the local
revisions rather than relying on registry releases. Temporary test installations
were removed. Installed packages were restored from the lockfile-resolved registry
tarballs; package manifests and lockfiles are unchanged.

## Verification

- DEM `npm run verify` — passed: 101 tests and TypeScript checks.
- DEM `npm run test:browser` — passed: 2 Chromium tests, including browser model
  delivery and Node/browser compilation parity.
- DEM-IDB `npm run verify` — passed: 9 unit/integration tests, TypeScript checks,
  and 2 browser harness tests. The harness exercised the current DEM compiler and
  shared Format 2 fixtures on real Chromium IndexedDB, including CRUD, schema
  history/update, transactions, shared value and batch workloads, and the unchanged
  application workflow.
- DEM-RDB `npm run verify` — passed: 46 tests and TypeScript checks; PostgreSQL and
  MariaDB subtests skipped because test connections are not configured.
- DEM-RDB `npm run test:portable` — passed: 16 SQLite tests; PostgreSQL and MariaDB
  subtests skipped because test connections are not configured.
- DEM-RDB `TEQFW_DEM_IDB_ROOT=../dem-idb npm run test:compare` — passed: 7 SQLite /
  Chromium IndexedDB comparisons covering native and portable values, atomic
  commands, portable extended values, and portable schema evolution. PostgreSQL and
  MariaDB comparisons were skipped because connections are not configured.
- `teqfw-platform .` — valid, zero violations in all three repositories.
- `teqfw-esm-validator . --profile base` — valid, zero violations in all three
  repositories.

## Findings

### Pending implementation: DEM-IDB physical naming transition

The accepted target names are application stores equal to their effective logical
paths and internal stores `/dem/schema` and `/dem/sequence`
(`dem/ctx/docs/architecture/integration.md:165-170`). Current implementation still
builds `dem:`-prefixed application store names and uses `dem_schema` / `dem_sequence`
(`dem-idb/src/Adapter.mjs:58-59,82-83,100,123-127,223,400`). This is a pending
implementation item, not a Format 2 happy-path failure; the current adapter suite
passes against the behavior it presently implements.

DEM browser delivery assertions also encode the current names in
`dem/test/browser/Delivery.html:65-72` and `dem/test/browser/Delivery.test.mjs:261-264`.
The IDB README describes them at `dem-idb/README.md:62-68`. Update those expectations
and documentation with the adapter transition; they were intentionally left intact
in this audit.

Smallest coherent implementation sequence for the separate naming task:

1. Map entity paths directly to object-store names and route every schema,
   sequence, history, and repository transaction through `/dem/schema` and
   `/dem/sequence`.
2. Reject the old `dem:` / `dem_schema` / `dem_sequence` physical layout explicitly
   before mutating an existing database. Do not copy or silently shadow its data;
   the host owns migration.
3. Update DEM browser-delivery assertions and IDB documentation, then verify fresh
   creation, incompatible-layout failure without effects, version-change atomicity,
   and the shared Format 2 IndexedDB workloads in Chromium.

### Current capabilities to preserve

- DEM-IDB uses explicit `createSchema()`, version-change transactions, stored model
  snapshots, atomic repository writes, and closes stale adapter connections on
  `versionchange` (`dem-idb/src/Adapter.mjs:71-113,134-168`). Removed stores are not
  dropped; this retains data during supported structural evolution, documented at
  `dem-idb/README.md:66-68`. These are current lifecycle/evolution capabilities,
  not legacy schema-format support.
- DEM-RDB native projection keeps its current deterministic table naming algorithm
  (`dem-rdb/src/Adapter.mjs:37`) and explicitly refuses pre-existing target tables
  (`dem-rdb/src/Adapter.mjs:369-382`). Portable projection has a separate hashed
  layout and current schema-history evolution; it adds attributes/tables, retains
  removed physical data, rejects physical type conversion, and leaves value
  migration to the host (`dem-rdb/src/Portable.mjs:171-220`, `dem-rdb/README.md:128-140`).
  Neither behavior establishes compatibility with every historical RDB layout.

### Legacy mechanisms and intentional contracts

- DEM Format 1 schema descriptors are rejected by design; rejection tests remain in
  `dem/test/integration/CompileFormat2.test.mjs:65-...` and
  `dem/test/unit/Compile/A/Decode.test.mjs:27-...`. Production decoding is for
  Format 2 declarations; Format 1 host maps remain a distinct current contract
  (`dem/src/Compile/A/Decode.mjs:4`). No Format 1 schema compatibility mechanism
  was found.
- `layout: 1` in IDB and portable RDB metadata is an internal current-layout
  discriminator checked by the adapter (`dem-idb/src/Adapter.mjs:104-105,127`;
  `dem-rdb/src/Portable.mjs:95,182-185,217-219`). It is not evidence of accepting
  Format 1 schema descriptors or an automatic upgrade from arbitrary old physical
  layouts.
- IDB's exact-model check during ordinary opening rejects a mismatched stored model;
  explicit `createSchema()` performs the supported structural update. This keeps
  initialization and host-owned value migration explicit
  (`dem-idb/src/Adapter.mjs:121-168`).

### Current defects and documentation mismatches

No small defect blocking the tested Format 2 happy path was confirmed. No broad
legacy-removal change, naming change, public API change, code commit, or push was
made. The DEM-IDB naming expectations above are pending the accepted physical
layout implementation and should be changed with it, not ahead of it.

## Git and remaining coverage

All three repositories remain on `main` at the SHAs listed above. No PostgreSQL or
MariaDB service was provisioned. No release or deployment was performed.
