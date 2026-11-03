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
            /** @type {Map<string,Set<string>>} */
            const selected = new Map();
            if (work.selectionProvided) {
                if (!Array.isArray(work.selectionInput)) {
                    fail('DEM_INPUT', null, '', { reason: 'selection-type' });
                    return work;
                }
                /** @type {Map<string,{packageName:string;entityPath:string;count:number}>} */
                const groups = new Map();
                for (const selector of work.selectionInput) {
                    /** @type {Record<string,string>} */
                    const details = {};
                    if (data.isObject(selector)) {
                        if (typeof selector.packageName === 'string')
                            details.packageName = selector.packageName;
                        if (typeof selector.entityPath === 'string')
                            details.entityPath = selector.entityPath;
                    }
                    if (!data.isObject(selector) || Object.keys(selector).length !== 2
                        || !Object.hasOwn(selector, 'packageName') || !Object.hasOwn(selector, 'entityPath')
                        || typeof selector.packageName !== 'string' || !selector.packageName
                        || typeof selector.entityPath !== 'string' || !selector.entityPath) {
                        fail('DEM_INPUT', null, '', { reason: 'selector-shape', ...details });
                        continue;
                    }
                    try {
                        if (path.normalize(selector.entityPath) !== selector.entityPath || selector.entityPath.endsWith('/'))
                            throw new TypeError();
                    }
                    catch {
                        fail('DEM_INPUT', null, '', { reason: 'selector-path', ...details });
                        continue;
                    }
                    const key = data.serialize([selector.packageName, selector.entityPath]);
                    const current = groups.get(key);
                    if (current)
                        current.count++;
                    else
                        groups.set(key, { packageName: selector.packageName, entityPath: selector.entityPath, count: 1 });
                }
                for (const { packageName, entityPath, count } of groups.values())
                    if (count > 1)
                        fail('DEM_INPUT', null, '', { reason: 'selector-duplicate', packageName, entityPath });
                for (const { packageName, entityPath, count } of groups.values()) {
                    if (count > 1)
                        continue;
                    const schema = work.schemas.find(s => s.source.packageName === packageName);
                    if (!schema) {
                        fail('DEM_INPUT', null, '', { reason: 'selector-package', packageName, entityPath });
                        continue;
                    }
                    if (!Object.hasOwn(schema.nodes, entityPath)) {
                        fail('DEM_INPUT', null, '', { reason: 'selector-entity', packageName, entityPath });
                        continue;
                    }
                    const nodes = selected.get(packageName) ?? new Set();
                    nodes.add(entityPath);
                    selected.set(packageName, nodes);
                }
                if (work.diagnostics.length)
                    return work;
            }
            else {
                for (const schema of work.schemas)
                    selected.set(schema.source.packageName, new Set(Object.keys(schema.nodes)));
            }
            /** @type {Array<{original:string;node:{raw:any;pointer:string;localTargets:Record<string,string>};effective:string;schema:TeqFw_Dem_SchemaWork;rule:{from:string;to:string}|null}>} */
            const contributions = [];
            for (const schema of work.schemas) {
                const originalPackages = new Set(schema.packages);
                for (const original of Object.keys(schema.nodes))
                    for (const parent of path.parents(original))
                        originalPackages.add(parent);
                const selectedPaths = selected.get(schema.source.packageName) ?? new Set();
                const rules = (Object.hasOwn(work.map.sources, schema.source.packageName) ? work.map.sources[schema.source.packageName].rename : undefined) ?? {};
                /** @type {Record<string,string>} */
                const rename = Object.create(null);
                for (const [from, to] of Object.entries(rules)) {
                    try {
                        if (!from.startsWith('/') || typeof to !== 'string' || !to.startsWith('/'))
                            throw new TypeError();
                        const start = path.canonicalAddress(from), end = path.canonicalAddress(to);
                        const declared = start.endsWith('/') ? originalPackages.has(start) : selectedPaths.has(start);
                        if (start.endsWith('/') !== end.endsWith('/') || !declared || Object.hasOwn(rename, start))
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
                 * @returns {TeqFw_Dem_PathTransform}
                 */
                const transform = function (original) {
                    const from = selectors.find(k => original === k || k.endsWith('/') && original.startsWith(k));
                    return from ? {path: rename[from] + original.slice(from.length), rule: {from, to: rename[from]}} : {path: original, rule: null};
                };
                schema.correspondence = Object.create(null);
                if (!work.selectionProvided)
                    for (const original of schema.packages) {
                        const {path: effective} = transform(original);
                        for (const parent of path.parents(effective))
                            work.packages.push(parent);
                    }
                for (const [original, node] of Object.entries(schema.nodes)) {
                    if (!selectedPaths.has(original))
                        continue;
                    const {path: effective, rule} = transform(original);
                    try {
                        path.canonicalAddress(effective);
                    }
                    catch {
                        fail('DEM_PATH', schema.source, node.pointer, {reason: 'invalid-effective-path', originalPath: original, effectivePath: effective});
                        continue;
                    }
                    if (path.isReserved(effective)) {
                        fail('DEM_PATH', schema.source, node.pointer, {
                            reason: 'reserved-effective-path',
                            originalPath: original,
                            effectivePath: effective,
                            mapping: rule,
                        });
                        continue;
                    }
                    schema.correspondence[original] = effective;
                    for (const parent of path.parents(effective))
                        work.packages.push(parent);
                    contributions.push({ original, node, effective, schema, rule });
                }
            }
            /** @type {Map<string,typeof contributions>} */
            const byEffective = new Map();
            for (const item of contributions) {
                const group = byEffective.get(item.effective) ?? [];
                group.push(item);
                byEffective.set(item.effective, group);
            }
            for (const [effective, group] of byEffective) {
                group.sort((a, b) => a.schema.source.packageName < b.schema.source.packageName ? -1 : a.schema.source.packageName > b.schema.source.packageName ? 1 : a.original < b.original ? -1 : a.original > b.original ? 1 : 0);
                const first = group[0];
                for (const item of group.slice(1))
                    fail('DEM_COLLISION', item.schema.source, item.node.pointer, {
                        path: effective,
                        packageName: item.schema.source.packageName,
                        namespace: item.schema.namespace,
                        originalPath: item.original,
                        effectivePath: item.effective,
                        conflictsWith: {
                            packageName: first.schema.source.packageName,
                            namespace: first.schema.namespace,
                            originalPath: first.original,
                            effectivePath: first.effective,
                        },
                    });
                const item = first;
                work.entities[effective] = { schema: item.schema, original: item.original, pointer: item.node.pointer, localTargets: item.node.localTargets, raw: item.node.raw, relations: Object.create(null) };
                work.provenance.entities[effective] = { ...item.schema.source, namespace: item.schema.namespace, originalPath: item.original };
                work.provenance.pathMappings.push({
                    packageName: item.schema.source.packageName,
                    namespace: item.schema.namespace,
                    originalPath: item.original,
                    effectivePath: effective,
                    rule: item.rule,
                });
            }
            work.entities = Object.fromEntries(Object.entries(work.entities).sort(([a], [b]) => a < b ? -1 : 1));
            work.provenance.entities = Object.fromEntries(Object.entries(work.provenance.entities).sort(([a], [b]) => a < b ? -1 : 1));
            work.provenance.pathMappings.sort((a, b) => data.serialize([a.packageName, a.originalPath]) < data.serialize([b.packageName, b.originalPath]) ? -1 : 1);
            return work;
        };
    }
}
export const __deps__ = Object.freeze({ default: Object.freeze({ path: 'TeqFw_Dem_Compile_A_Path$', diagnostic: 'TeqFw_Dem_Dto_Compile_Diagnostic$', data: 'TeqFw_Dem_Util_Data$' }) });
