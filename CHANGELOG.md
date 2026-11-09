# Release Notes

## 0.4.0 — Release candidate

- Resolve published conformance workloads and example application through TeqFW DI; remove the former conformance ESM entry points.

- Require Format 2 schemas; Format 1 host maps remain supported.
- Add model-bound runtime and batch operations, extension type registration and DEM history descriptors.

## 0.3.0 — 2026-11-02

- Add per-compilation entity selection so one acquired declaration set can produce
  independent server and browser Effective Models.
- Verify the selected models with real SQLite and Chrome IndexedDB, including their
  combined Node Host and browser model delivery path.

## 0.2.0 — 2026-11-01

Initial npm release.

- Compose format-1 schema fragments into a single validated logical model.
- Transform logical paths before resolving local and explicitly bound external dependencies.
- Resolve identity/ref profiles, literal defaults, keys, indexes and relations.
- Produce immutable authenticated results, canonical logical fingerprints and dependency graphs.
- Acquire declaration files using TeqFW package discovery and package-relative metadata.
- Define portable single-entity Repository and DI repository-provider contracts.
- Validate and normalize logical records, complete keys and immutable selections.
- Specify filtering, ordering, pagination, results, errors and backend constraints.
- Share exact logical selection evaluation through Repository/Select, including
  deterministic JSON, binary and vector comparisons.
- Add optional atomic repository command batches and shared snapshot planning.
- Canonicalize JSON/vector negative zero and detach sparse entries.
- Publish real-backend conformance workloads covering values, atomicity, long keys,
  wide identities and structural evolution/history.
- Publish one portable DI application workflow for SQLite and real browser
  IndexedDB verification through separate host Composition Roots.
- Include version-matched consumer guidance, checked declarations, archive-consumer
  verification and browser compilation parity checks.
