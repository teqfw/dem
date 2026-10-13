// @ts-check
/**
 * @namespace TeqFw_Dem_Compile_A_Decode
 * @description Decode format 1 declarations and reject ambiguous or unknown structure.
 */
export default class Decode {
    /**
     * @param {object} deps
     * @param {TeqFw_Dem_Util_Data} deps.data
     * @param {TeqFw_Dem_Compile_A_Path} deps.path
     * @param {TeqFw_Dem_Dto_Compile_Diagnostic} deps.diagnostic
     */
    constructor({ data, path, diagnostic }) {
        /**
         * @param {unknown} input
         * @returns {TeqFw_Dem_Work}
         */
        this.exec = function (input) {
            /** @type {TeqFw_Dem_Work} */
            const work = { schemas: [], map: { sources: {}, identityProfiles: {} }, mapSource: null, diagnostics: [], entities: {}, packages: [], provenance: { entities: {}, map: null, pathMappings: [], bindings: [] } };
            /**
             * @param {string} code
             * @param {TeqFw_Dem_SourceNullable} source
             * @param {string} pointer
             * @param {Record<string,any>} [details]
             * @returns {void}
             */
            const fail = function (code, source, pointer, details = {}) { work.diagnostics.push(diagnostic.create(code, source, pointer, details)); };
            /**
             * @param {any} obj
             * @param {Array<string>} keys
             * @param {TeqFw_Dem_SourceNullable} source
             * @param {string} pointer
             * @returns {boolean}
             */
            const closed = function (obj, keys, source, pointer) {
                if (!data.isObject(obj)) {
                    fail('DEM_FORMAT', source, pointer);
                    return false;
                }
                const unknown = Object.keys(obj).filter(k => !keys.includes(k));
                if (unknown.length) {
                    fail('DEM_FORMAT', source, pointer, { unknown: unknown.sort() });
                    return false;
                }
                if (Object.hasOwn(obj, '$comment') && typeof obj.$comment !== 'string') {
                    fail('DEM_FORMAT', source, pointer + '/$comment');
                    return false;
                }
                return true;
            };
            /**
             * @param {string} name
             * @returns {boolean}
             */
            const member = function (/** @type {string} */ name) {
                return /^[a-z0-9_]+$/.test(name);
            };
            /**
             * @param {any} obj
             * @param {TeqFw_Dem_Source} source
             * @param {string} pointer
             * @returns {boolean}
             */
            const dictionary = function (obj, source, pointer) {
                if (!data.isObject(obj) || Object.keys(obj).some(k => !member(k))) {
                    fail('DEM_FORMAT', source, pointer);
                    return false;
                }
                return true;
            };
            /**
             * @param {any} values
             * @param {TeqFw_Dem_Source} source
             * @param {string} pointer
             * @returns {boolean}
             */
            const list = function (values, source, pointer) {
                if (!Array.isArray(values) || !values.length || values.some(v => typeof v !== 'string' || !member(v)) || new Set(values).size !== values.length) {
                    fail('DEM_FORMAT', source, pointer);
                    return false;
                }
                return true;
            };
            /**
             * @param {string} k
             * @returns {string}
             */
            const escape = function (/** @type {string} */ k) {
                return k.replace(/~/g, '~0').replace(/\//g, '~1');
            };
            try {
                input = JSON.parse(data.serialize(input));
            }
            catch {
                fail('DEM_INPUT', null, '');
                return work;
            }
            if (!data.isObject(input) || Object.keys(input).some(k => !['schemas', 'map'].includes(k)) || !Array.isArray(input.schemas)) {
                fail('DEM_INPUT', null, '');
                return work;
            }
            const names = new Set();
            for (const [kind, items] of /** @type {['schema'|'map',any[]][]} */ ([['schema', input.schemas], ['map', Object.hasOwn(input, 'map') ? [input.map] : []]])) {
                for (const envelope of items) {
                    if (!data.isObject(envelope) || Object.keys(envelope).some(k => !['packageName', 'filename', 'document'].includes(k)) || typeof envelope.packageName !== 'string' || !envelope.packageName || typeof envelope.filename !== 'string' || !envelope.filename || envelope.filename.startsWith('/') || envelope.filename.includes('\\') || !Object.hasOwn(envelope, 'document')) {
                        fail('DEM_INPUT', null, '');
                        continue;
                    }
                    const source = { packageName: envelope.packageName, filename: envelope.filename };
                    if (kind === 'schema' && names.has(source.packageName)) {
                        fail('DEM_INPUT', source, '', { duplicate: source.packageName });
                        continue;
                    }
                    names.add(source.packageName);
                    let doc;
                    try {
                        doc = JSON.parse(data.serialize(envelope.document));
                    }
                    catch {
                        fail('DEM_INPUT', source, '');
                        continue;
                    }
                    if (!data.isObject(doc) || doc.$format !== 1) {
                        fail('DEM_FORMAT', source, '/$format');
                        continue;
                    }
                    if (kind === 'map') {
                        if (!closed(doc, ['$format', '$comment', 'sources', 'identityProfiles'], source, ''))
                            continue;
                        const sources = doc.sources ?? {}, profiles = doc.identityProfiles ?? {};
                        if (!data.isObject(sources) || !data.isObject(profiles) || doc.sources === null || doc.identityProfiles === null) {
                            fail('DEM_FORMAT', source, '');
                            continue;
                        }
                        for (const [name, rules] of Object.entries(sources)) {
                            if (!name || !closed(rules, ['rename', 'bind'], source, '/sources/' + escape(name)))
                                continue;
                            for (const k of ['rename', 'bind'])
                                if (Object.hasOwn(rules, k) && !data.isObject(rules[k]))
                                    fail('DEM_FORMAT', source, '/sources/' + escape(name) + '/' + k);
                        }
                        work.map = { sources, identityProfiles: profiles };
                        work.mapSource = source;
                        work.provenance.map = source;
                        continue;
                    }
                    const dependencies = doc.$dependencies ?? {};
                    if (!dictionary(dependencies, source, '/$dependencies') || doc.$dependencies === null)
                        continue;
                    for (const [name, dep] of Object.entries(dependencies)) {
                        if (closed(dep, ['attributes'], source, '/$dependencies/' + name))
                            list(dep.attributes, source, '/$dependencies/' + name + '/attributes');
                    }
                    const nodes = Object.create(null), packages = new Set();
                    for (const [raw, node] of Object.entries(doc)) {
                        if (['$format', '$comment', '$dependencies'].includes(raw))
                            continue;
                        const pointer = '/' + escape(raw);
                        let address;
                        try {
                            if (!raw.startsWith('/'))
                                throw new TypeError();
                            address = path.normalize(raw);
                        }
                        catch {
                            fail('DEM_PATH', source, pointer);
                            continue;
                        }
                        if (Object.hasOwn(nodes, address) || packages.has(address)) {
                            fail('DEM_PATH', source, pointer, { duplicate: address });
                            continue;
                        }
                        if (address.endsWith('/')) {
                            if (closed(node, ['$comment'], source, pointer))
                                packages.add(address);
                            continue;
                        }
                        if (!closed(node, ['$comment', 'attributes', 'primaryKey', 'uniqueKeys', 'indexes', 'relations'], source, pointer))
                            continue;
                        if (!Array.isArray(node.attributes) || !node.attributes.length) {
                            fail('DEM_FORMAT', source, pointer + '/attributes');
                            continue;
                        }
                        const attributes = new Set();
                        node.attributes.forEach((/** @type {any} */ a, /** @type {number} */ i) => {
                            const ptr = pointer + '/attributes/' + i;
                            if (!closed(a, ['name', 'type', '$comment', 'nullable', 'default', 'generation'], source, ptr))
                                return;
                            if (typeof a.name !== 'string' || !member(a.name) || attributes.has(a.name))
                                fail('DEM_FORMAT', source, ptr + '/name');
                            attributes.add(a.name);
                            if (!closed(a.type, ['name', 'params'], source, ptr + '/type') || typeof a.type?.name !== 'string')
                                fail('DEM_FORMAT', source, ptr + '/type');
                            for (const key of ['nullable', 'generation'])
                                if (Object.hasOwn(a, key) && typeof a[key] !== 'boolean')
                                    fail('DEM_FORMAT', source, ptr + '/' + key);
                        });
                        if (Object.hasOwn(node, 'primaryKey'))
                            list(node.primaryKey, source, pointer + '/primaryKey');
                        for (const key of ['uniqueKeys', 'indexes', 'relations']) {
                            const collection = node[key] ?? {};
                            if (!dictionary(collection, source, pointer + '/' + key) || node[key] === null)
                                continue;
                            for (const [name, item] of Object.entries(collection)) {
                                const ptr = pointer + '/' + key + '/' + name;
                                if (key === 'uniqueKeys')
                                    list(item, source, ptr);
                                else if (key === 'indexes') {
                                    if (closed(item, ['attributes'], source, ptr))
                                        list(item.attributes, source, ptr + '/attributes');
                                }
                                else if (closed(item, ['attributes', 'target'], source, ptr)) {
                                    list(item.attributes, source, ptr + '/attributes');
                                    if (closed(item.target, ['path', 'dependency', 'attributes'], source, ptr + '/target')) {
                                        list(item.target.attributes, source, ptr + '/target/attributes');
                                        if (Object.hasOwn(item.target, 'path') === Object.hasOwn(item.target, 'dependency') || typeof (item.target.path ?? item.target.dependency) !== 'string')
                                            fail('DEM_FORMAT', source, ptr + '/target');
                                    }
                                }
                            }
                        }
                        nodes[address] = { raw: node, pointer };
                    }
                    if (Object.hasOwn(doc, '$comment') && typeof doc.$comment !== 'string')
                        fail('DEM_FORMAT', source, '/$comment');
                    work.schemas.push({ source, dependencies, nodes, packages: [...packages], correspondence: Object.create(null), bindings: Object.create(null) });
                }
            }
            work.schemas.sort((a, b) => a.source.packageName < b.source.packageName ? -1 : 1);
            return work;
        };
    }
}
export const __deps__ = Object.freeze({ default: Object.freeze({ data: 'TeqFw_Dem_Util_Data$', path: 'TeqFw_Dem_Compile_A_Path$', diagnostic: 'TeqFw_Dem_Dto_Compile_Diagnostic$' }) });
