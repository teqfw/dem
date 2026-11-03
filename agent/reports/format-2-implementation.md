# DEM Format 2 implementation report

- Date: 2026-11-03
- Scope: descriptor decoding, canonical paths, and bounded local references
- Status: first implementation stage complete; broader migration remains pending
- Contract: accepted Format 2 behavior in the separate `ctx/` repository

## Implemented

- Schema descriptors require numeric `$format: 2` and a canonical absolute
  directory `$namespace`. Format 1 schema descriptors fail with `DEM_FORMAT`;
  the host map remains a separate Format 1 document.
- Relative entity and package-node keys are checked without normalization and
  resolved beneath the declared namespace. Namespace, declaration and effective
  mapped path segments use `[a-z][a-z0-9]*`. Existing member identifiers retain
  their grammar, including `snake_case` attributes.
- Decode retains source package and filename, namespace, original absolute paths,
  declaration pointers and normalized local target paths in internal compiler
  state. The logical model and fingerprint contain no source ownership metadata.
- Local references resolve from the original containing package. Relative `.`
  and `..` navigation is accepted only when its normalized target remains within
  the descriptor namespace, including the namespace directory. The check runs
  during Decode, before host mapping; the resolved original target then follows
  the existing source-to-effective correspondence in Resolve.
- External cross-package references still use declared dependencies and explicit
  host bindings. Inputs are cloned before decoding and remain unchanged.

## Changed files

- `src/Compile/A/Decode.mjs`
- `src/Compile/A/Path.mjs`
- `src/Compile/A/Compose.mjs`
- `src/Compile/A/Resolve.mjs`
- `types.d.ts`
- `test/unit/Compile/A/Decode.test.mjs`
- `test/unit/Compile/A/Path.test.mjs`
- `test/integration/CompileFormat2.test.mjs`

## Verification

- Focused tests: `node --test test/unit/Compile/A/Decode.test.mjs test/unit/Compile/A/Path.test.mjs test/integration/CompileFormat2.test.mjs` — 13 passed.
- Type checking: `npm run typecheck` — passed.
- Whitespace check: `git diff --check` — passed.
- Full suite: `npm test` — 35 test files, 28 passed and 7 failed. The failing
  files still exercise Format 1 schema fixtures or expect behavior after those
  fixtures compile: `test/integration/Acquire.test.mjs`,
  `test/integration/Compile.test.mjs`, `test/integration/CompileSelection.test.mjs`,
  `test/integration/Conformance.test.mjs`, `test/integration/HostComposition.test.mjs`,
  `test/integration/HostSqlite.test.mjs` and `test/package/scaffold.test.mjs`.
  Failures report `DEM_FORMAT` at `/$format` for the retired schema format. The
  later test/fixture migration stage should update these inputs and assertions;
  no compatibility path was added to hide them.
- Unit-test mapping: source and unit tests use `.mjs`; Decode and Path retain
  their source-relative `test/unit/` mappings, with no declared exclusions.
  `teqfw-platform .` — valid, zero violations.
- `teqfw-esm-validator` could not complete in this environment: its launcher was
  blocked when spawning Node (`EPERM`); direct invocation of the installed TeqFW
  CLI could not resolve its `acorn` dependency. This is an environment/tooling
  limitation, not a reported source violation.

## Deferred scope and handoff

No cognitive-context files, adapters, PDE schemas, dependencies, release artifacts
or deployments were changed. This stage does not implement cross-package namespace
ownership, reserved `/dem/` destination checks, comprehensive post-map collision
validation, or application migration. The public compiler happy path and requested
descriptor/reference failures are covered. The code is ready for review and the
next migration stage; its broader regression suite needs the planned Format 2
fixture updates.
