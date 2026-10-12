# Root Level

- Path: `AGENTS.md`
- Changed: `20260702`

## Purpose

Marks the repository root and points agents to the project cognitive context in `ctx/`.

## Bootstrap Exception

- `init` and other bootstrap operations may create the initial `ctx/` structure when it does not exist yet.
- This repository uses an ADSM-managed cognitive context.
- Use skill `adsm-ctx` for context validation, upgrades, and methodology rules.

## Cognitive Context Entry

- Read `ctx/AGENTS.md` before modifying project files after the context exists.
- Treat `ctx/` as the source of truth for project context after bootstrap is complete.
