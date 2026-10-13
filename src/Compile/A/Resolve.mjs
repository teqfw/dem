// @ts-check
/**
 * @namespace TeqFw_Dem_Compile_A_Resolve
 * @description Preserve local dependencies and bind explicit external contracts to effective entities.
 */
export default class Resolve {
    /**
     * @param {object} deps
     * @param {TeqFw_Dem_Compile_A_Path} deps.path
     * @param {TeqFw_Dem_Util_Data} deps.data
     * @param {TeqFw_Dem_Dto_Compile_Diagnostic} deps.diagnostic
     */
    constructor({ path, data, diagnostic }) {
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
            for (const schema of work.schemas) {
                const supplied = (Object.hasOwn(work.map.sources, schema.source.packageName) ? work.map.sources[schema.source.packageName].bind : undefined) ?? {};
                schema.bindings = Object.create(null);
                for (const alias of Object.keys(supplied))
                    if (!Object.hasOwn(schema.dependencies, alias))
                        fail('DEM_MAP', work.mapSource, '/sources', { packageName: schema.source.packageName, dependency: alias });
                for (const [alias, dependency] of Object.entries(schema.dependencies)) {
                    const binding = Object.hasOwn(supplied, alias) ? supplied[alias] : undefined;
                    if (!binding) {
                        fail('DEM_DEPENDENCY', schema.source, '/$dependencies/' + alias, { dependency: alias });
                        continue;
                    }
                    let address;
                    try {
                        if (!data.isObject(binding) || Object.keys(binding).some(k => !['path', 'attributes'].includes(k)) || typeof binding.path !== 'string' || !binding.path.startsWith('/') || !data.isObject(binding.attributes))
                            throw new TypeError();
                        address = path.normalize(binding.path);
                        const names = Object.keys(binding.attributes);
                        if (names.length !== dependency.attributes.length || dependency.attributes.some((/** @type {string} */ a) => !Object.hasOwn(binding.attributes, a)) || new Set(Object.values(binding.attributes)).size !== names.length || Object.values(binding.attributes).some(v => typeof v !== 'string' || !/^[a-z0-9_]+$/.test(v)))
                            throw new TypeError();
                    }
                    catch {
                        fail('DEM_MAP', work.mapSource, '/sources', { packageName: schema.source.packageName, dependency: alias });
                        continue;
                    }
                    const target = work.entities[address];
                    if (!target || Object.values(binding.attributes).some(attr => !target.raw.attributes.some((/** @type {any} */ a) => a.name === attr))) {
                        fail('DEM_TARGET', work.mapSource, '/sources', { dependency: alias, path: address });
                        continue;
                    }
                    schema.bindings[alias] = { path: address, attributes: binding.attributes };
                    work.provenance.bindings.push({ packageName: schema.source.packageName, dependency: alias, path: address, attributes: binding.attributes });
                }
            }
            for (const [effective, info] of Object.entries(work.entities)) {
                info.relations = Object.create(null);
                for (const [name, relation] of Object.entries(/** @type {Record<string,any>} */ (info.raw.relations ?? {}))) {
                    const pointer = info.pointer + '/relations/' + name, target = relation.target;
                    let address, attributes;
                    if (Object.hasOwn(target, 'dependency')) {
                        const dependency = info.schema.dependencies[target.dependency], binding = info.schema.bindings[target.dependency];
                        if (!dependency || target.attributes.some((/** @type {string} */ a) => !dependency.attributes.includes(a))) {
                            fail('DEM_DEPENDENCY', info.schema.source, pointer);
                            continue;
                        }
                        if (!binding)
                            continue;
                        address = binding.path;
                        attributes = target.attributes.map((/** @type {string} */ a) => binding.attributes[a]);
                    }
                    else {
                        try {
                            const original = path.normalize(target.path, info.original.slice(0, info.original.lastIndexOf('/') + 1));
                            address = info.schema.correspondence[original];
                        }
                        catch {
                            fail('DEM_PATH', info.schema.source, pointer + '/target/path');
                            continue;
                        }
                        attributes = target.attributes;
                    }
                    if (!address || !Object.hasOwn(work.entities, address)) {
                        fail('DEM_TARGET', info.schema.source, pointer, { path: target.path ?? address ?? '' });
                        continue;
                    }
                    if (attributes.some((/** @type {string} */ attr) => !work.entities[address].raw.attributes.some((/** @type {any} */ a) => a.name === attr))) {
                        fail('DEM_TARGET', info.schema.source, pointer, { path: address, attributes });
                        continue;
                    }
                    info.relations[name] = { attributes: relation.attributes, target: { path: address, attributes } };
                }
            }
            return work;
        };
    }
}
export const __deps__ = Object.freeze({ default: Object.freeze({ path: 'TeqFw_Dem_Compile_A_Path$', data: 'TeqFw_Dem_Util_Data$', diagnostic: 'TeqFw_Dem_Dto_Compile_Diagnostic$' }) });
