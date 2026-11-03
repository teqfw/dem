# DEM Format 2 implementation report

- Date: 2026-11-03
- Scope: compiler migration, regression fixtures, and explicit no-legacy policy
- Status: implementation and verification complete
- Contract: accepted Format 2 behavior in the separate `ctx/` repository; `ctx/` was not modified

## Implemented

- Schema descriptors require numeric `$format: 2`, canonical `$namespace`, and
  relative entity/package keys. Legacy Format 1 schema descriptors are
  intentionally rejected; there is no compatibility mode. Host maps remain the
  separate current Format 1 document contract.
- Relative references are resolved inside their source namespace before host
  mapping. Namespace ownership is unique across contributors; nested namespaces
  are supported, while a parent contributor cannot declare entities or explicit
  package nodes inside a child's namespace.
- Source declarations and effective entity paths cannot occupy the reserved
  `/dem` namespace. Host-map path selectors must be canonical. Selected effective
  collisions produce deterministic diagnostics containing both source owners.
- Provenance now records each entity's namespace and each path mapping's source
  rule, alongside original and effective paths.
- Valid schemas across conformance, integration, package, and browser fixtures
  were migrated to Format 2. Format 1 remains in intentional rejection cases and
  in host-map fixtures.
- DEM, DEM-IDB, and DEM-RDB READMEs and package skills state that Format 1 schema
  inputs are deliberately unsupported and that host maps retain Format 1. The
  adapter repositories received documentation-only changes.

## Verification

- `npm run verify` — passed: 100 tests and TypeScript checks.
- `npm run test:browser` — passed: 2 Chromium/browser tests.
- `teqfw-platform .` — valid, zero violations.
- `teqfw-esm-validator . --profile base` — valid, zero violations.
- `git diff --check` — passed.
- Search confirmed public Format 1 schema examples were removed. Remaining Format
  1 schema inputs are intentional negative tests; other Format 1 uses are host maps.

## Scope and handoff

The DEM compiler, its tests, types, public documentation, package skill, and this
report are part of the DEM changes. DEM-IDB and DEM-RDB each have local README and
skill edits only; no adapter code, dependencies, or tests changed. The separate
`ctx/` repository remains untouched. No release or deployment was performed.
