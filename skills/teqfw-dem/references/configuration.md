# Accepted Declaration File Configuration

## Discovery configuration

DEM declaration defaults are `etc/dem-schema.json` for a fragment and
`etc/dem-map.json` for host-owned logical binding rules. The host may provide both.
Paths are relative to the declaring npm package root and independently overridable:

```json
{
  "teqfw": {
    "dem": {
      "schema": "etc/dem-schema.json",
      "map": "etc/dem-map.json"
    }
  }
}
```

Each npm package supplies at most one schema file; the host supplies at most one
active map file and may also supply its own schema. Map origin selectors use the
npm package name, not logical namespace.

An omitted parameter uses the default path. A missing default file is not an error
when its path was not explicitly configured. An explicitly configured schema/map
path whose file is missing is an error. An absent map means no extra binding rules;
compilation can succeed only if the resulting model is complete and consistent.
A dependency's map file does not become active host policy.

`etc/dem-host.json` is the anticipated downstream projection description. Its
format, discovery and metadata key belong to the responsible projection plugin;
DEM does not read it. No `teqfw.dem.host` projection parameter is defined here.

DEM integration acquires files through `@teqfw/cli` plugin discovery, separately
from portable compilation. See [runtime contracts](scope.md) for status.

## Metadata validation

An absent `teqfw` or `teqfw.dem` node means both paths are implicit defaults.
A supplied `teqfw` parent must be an object; other TeqFW branches are not DEM fields. If present,
`teqfw.dem` is a JSON object containing only optional `schema` and `map` properties.
Each supplied property must be a non-empty string; null, booleans, arrays and
objects are errors, not instructions to disable acquisition. Unknown properties
are errors so misspellings cannot silently fall back to defaults.

Paths use package-relative `/` segments. Normalize repeated separators and `.`;
permit `..` only while the normalized path remains within the package root.
Reject absolute paths, URL schemes, backslashes, NUL and paths resolving to the
package directory itself. File extensions are not part of the contract: contents
must be JSON regardless of the configured filename. Do not expand environment
variables or interpret paths relative to the process working directory.

Only a missing implicit file is optional. A directory at the selected path,
unreadable file, malformed JSON or duplicate object member is an acquisition
error. Preserve explicit-vs-default path status until acquisition completes.
Validate the metadata node shape and property types for selected packages and
the host. Resolve/read schema paths only for selected schema origins and map paths
only for the host. Dependency-owned maps do not become inputs; an explicitly
configured missing dependency map therefore does not fail DEM acquisition. Declaration acquisition must preserve duplicate-member detection rather
than relying solely on JSON.parse, which discards this evidence.

## Discovery integration boundary

The inspected CLI Bootstrap uses `@teqfw/di/node/registry/package` to build package
records from the application root. It does not currently expose a public package
list API. Reuse that discovery mechanism through an explicit integration adapter;
do not invent a CLI method or add an independent filesystem scanner. Record the
adapter's supported dependency contract when implementing it. The DEM compiler
receives declarations and does not import the discovery adapter.
The [declaration contract](declarations.md) is accepted target syntax independent
of the currently executable format. It must follow architectural path semantics and
exclude physical settings.
