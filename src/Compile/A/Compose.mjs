// @ts-check
/**
 * @namespace TeqFw_Dem_Compile_A_Compose
 * @description Apply origin-scoped path rules and compose a collision-free shared hierarchy.
 */
export default class Compose {
    /**
     * @param {object} deps
     * @param {TeqFw_Dem_Compile_A_Path} deps.path
     * @param {TeqFw_Dem_Dto_Compile_Diagnostic} deps.diagnostic
     * @param {TeqFw_Dem_Util_Data} deps.data
     */
    constructor({ path, diagnostic, data }) {
        /**
         * @param {TeqFw_Dem_Work} work
         * @returns {TeqFw_Dem_Work}
         */
        this.exec = function (work) {
            /**
             * @param {string} code
             * @param {TeqFw_Dem_SourceNullable} source
             * @param {string} ptr
             * @param {Record<string,any>} [details]
             * @returns {number}
             */
            const fail = function (/** @type {string} */ code, /** @type {TeqFw_Dem_SourceNullable} */ source, /** @type {string} */ ptr, /** @type {Record<string,any>} */ details = {}) {
                return work.diagnostics.push(diagnostic.create(code, source, ptr, details));
            };
            for (const name of Object.keys(work.map.sources))
                if (!work.schemas.some(s => s.source.packageName === name))
                    fail('DEM_MAP', work.mapSource, '/sources', { packageName: name });
            for (const schema of work.schemas) {
                const originalPackages = new Set(schema.packages);
                for (const original of Object.keys(schema.nodes))
                    for (const parent of path.parents(original))
                        originalPackages.add(parent);
                const rules = (Object.hasOwn(work.map.sources, schema.source.packageName) ? work.map.sources[schema.source.packageName].rename : undefined) ?? {};
                /** @type {Record<string,string>} */
                const rename = Object.create(null);
                for (const [from, to] of Object.entries(rules)) {
                    try {
                        if (!from.startsWith('/') || typeof to !== 'string' || !to.startsWith('/'))
                            throw new TypeError();
                        const start = path.normalize(from), end = path.normalize(to);
                        if (start.endsWith('/') !== end.endsWith('/') || !(Object.hasOwn(schema.nodes, start) || originalPackages.has(start)) || Object.hasOwn(rename, start))
                            throw new TypeError();
                        rename[start] = end;
                    }
                    catch {
                        fail('DEM_MAP', work.mapSource, '/sources', { packageName: schema.source.packageName, from, to });
                    }
                }
                const selectors = Object.keys(rename);
                for (const a of selectors)
                    for (const b of selectors)
                        if (a !== b && a.endsWith('/') && b.startsWith(a))
                            fail('DEM_MAP', work.mapSource, '/sources', { packageName: schema.source.packageName, overlap: [a, b] });
                /**
                 * @param {string} original
                 * @returns {string}
                 */
                const transform = function (original) {
                    const match = selectors.find(k => original === k || k.endsWith('/') && original.startsWith(k));
                    return match ? rename[match] + original.slice(match.length) : original;
                };
                schema.correspondence = Object.create(null);
                for (const original of schema.packages) {
                    const effective = transform(original);
                    for (const parent of path.parents(effective))
                        work.packages.push(parent);
                }
                for (const [original, node] of Object.entries(schema.nodes)) {
                    const effective = transform(original);
                    schema.correspondence[original] = effective;
                    for (const parent of path.parents(effective))
                        work.packages.push(parent);
                    if (Object.hasOwn(work.entities, effective)) {
                        fail('DEM_COLLISION', schema.source, node.pointer, { path: effective });
                        continue;
                    }
                    work.entities[effective] = { schema, original, pointer: node.pointer, raw: node.raw, relations: Object.create(null) };
                    work.provenance.entities[effective] = { ...schema.source, originalPath: original };
                    work.provenance.pathMappings.push({ packageName: schema.source.packageName, originalPath: original, effectivePath: effective });
                }
            }
            work.entities = Object.fromEntries(Object.entries(work.entities).sort(([a], [b]) => a < b ? -1 : 1));
            work.provenance.entities = Object.fromEntries(Object.entries(work.provenance.entities).sort(([a], [b]) => a < b ? -1 : 1));
            work.provenance.pathMappings.sort((a, b) => data.serialize([a.packageName, a.originalPath]) < data.serialize([b.packageName, b.originalPath]) ? -1 : 1);
            return work;
        };
    }
}
export const __deps__ = Object.freeze({ default: Object.freeze({ path: 'TeqFw_Dem_Compile_A_Path$', diagnostic: 'TeqFw_Dem_Dto_Compile_Diagnostic$', data: 'TeqFw_Dem_Util_Data$' }) });
