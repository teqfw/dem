// @ts-check
/**
 * @namespace TeqFw_Dem_Compile_A_Decode
 * @description Decode Format 2 declarations and Format 1 host maps.
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
            const work = { schemas: [], map: { sources: {}, identityProfiles: {} }, mapSource: null, selectionProvided: false, selectionInput: undefined, diagnostics: [], entities: {}, packages: [], provenance: { entities: {}, map: null, pathMappings: [], bindings: [] } };
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
            if (!data.isObject(input) || Object.keys(input).some(k => !['schemas', 'map', 'selection'].includes(k)) || !Array.isArray(input.schemas)) {
                fail('DEM_INPUT', null, '');
                return work;
            }
            work.selectionProvided = Object.hasOwn(input, 'selection');
            work.selectionInput = input.selection;
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
                    const expectedFormat = kind === 'schema' ? 2 : 1;
                    if (!data.isObject(doc) || doc.$format !== expectedFormat) {
                        fail('DEM_FORMAT', source, '/$format', { expected: expectedFormat, received: data.isObject(doc) ? doc.$format : undefined });
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
                    let namespace;
                    try {
                        namespace = path.namespace(doc.$namespace);
                    }
                    catch {
                        fail('DEM_FORMAT', source, '/$namespace');
                        continue;
                    }
                    const rawDependencies = doc.$dependencies ?? {};
                    if (!dictionary(rawDependencies, source, '/$dependencies') || doc.$dependencies === null) {
                        if (doc.$dependencies === null)
                            fail('DEM_FORMAT', source, '/$dependencies');
                    }
                    const dependencies = data.isObject(rawDependencies) ? rawDependencies : {};
                    for (const [name, dep] of Object.entries(dependencies)) {
                        if (closed(dep, ['attributes'], source, '/$dependencies/' + name))
                            list(dep.attributes, source, '/$dependencies/' + name + '/attributes');
                    }
                    const nodes = Object.create(null), packages = new Set(), packagePointers = Object.create(null);
                    for (const [raw, node] of Object.entries(doc)) {
                        if (['$format', '$namespace', '$comment', '$dependencies'].includes(raw))
                            continue;
                        const pointer = '/' + escape(raw);
                        let address;
                        try {
                            address = path.declaration(namespace, raw);
                        }
                        catch {
                            fail('DEM_PATH', source, pointer);
                            continue;
                        }
                        if (path.isReserved(address)) {
                            fail('DEM_PATH', source, pointer, {reason: 'reserved-namespace', path: address});
                            continue;
                        }
                        if (Object.hasOwn(nodes, address) || packages.has(address)) {
                            fail('DEM_PATH', source, pointer, { duplicate: address });
                            continue;
                        }
                        if (address.endsWith('/')) {
                            packages.add(address);
                            packagePointers[address] = pointer;
                            closed(node, ['$comment'], source, pointer);
                            continue;
                        }
                        nodes[address] = {raw: node, pointer, localTargets: Object.create(null)};
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
                            if (Object.hasOwn(a, 'nullable') && typeof a.nullable !== 'boolean')
                                fail('DEM_FORMAT', source, ptr + '/nullable');
                        });
                        if (Object.hasOwn(node, 'primaryKey'))
                            list(node.primaryKey, source, pointer + '/primaryKey');
                        const localTargets = Object.create(null);
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
                                        else if (Object.hasOwn(item.target, 'path')) {
                                            try {
                                                localTargets[name] = path.reference(item.target.path, address.slice(0, address.lastIndexOf('/') + 1), namespace);
                                            }
                                            catch {
                                                fail('DEM_PATH', source, ptr + '/target/path');
                                            }
                                        }
                                        else if (!member(item.target.dependency))
                                            fail('DEM_FORMAT', source, ptr + '/target/dependency');
                                    }
                                }
                            }
                        }
                        nodes[address] = { raw: node, pointer, localTargets };
                    }
                    if (Object.hasOwn(doc, '$comment') && typeof doc.$comment !== 'string')
                        fail('DEM_FORMAT', source, '/$comment');
                    work.schemas.push({ source, namespace, dependencies, nodes, packages: [...packages], packagePointers, correspondence: Object.create(null), bindings: Object.create(null) });
                }
            }
            work.schemas.sort((a, b) => a.source.packageName < b.source.packageName ? -1 : 1);
            const namespaceOwners = new Map();
            for (const schema of work.schemas) {
                const owner = namespaceOwners.get(schema.namespace);
                if (owner) {
                    fail('DEM_PATH', schema.source, '/$namespace', {
                        reason: 'duplicate-namespace',
                        namespace: schema.namespace,
                        packageName: schema.source.packageName,
                        conflictsWith: owner.source.packageName,
                    });
                }
                else {
                    namespaceOwners.set(schema.namespace, schema);
                }
            }
            for (const parent of work.schemas) {
                for (const child of work.schemas) {
                    if (parent === child || child.namespace.length <= parent.namespace.length || !child.namespace.startsWith(parent.namespace))
                        continue;
                    const declarations = [
                        ...Object.entries(parent.nodes).map(([address, node]) => ({address, pointer: node.pointer})),
                        ...parent.packages.map(address => ({address, pointer: parent.packagePointers[address]})),
                    ].filter(item => item.address.startsWith(child.namespace))
                        .sort((a, b) => a.address < b.address ? -1 : a.address > b.address ? 1 : a.pointer < b.pointer ? -1 : a.pointer > b.pointer ? 1 : 0);
                    for (const declaration of declarations) {
                        fail('DEM_PATH', parent.source, declaration.pointer, {
                            reason: 'child-namespace-owned',
                            namespace: child.namespace,
                            path: declaration.address,
                            packageName: parent.source.packageName,
                            conflictsWith: child.source.packageName,
                        });
                    }
                }
            }
            const byPackage = new Map(work.schemas.map(schema => [schema.source.packageName, schema]));
            for (const [packageName, rules] of Object.entries(work.map.sources)) {
                const schema = byPackage.get(packageName);
                if (!data.isObject(rules))
                    continue;
                const rename = Object.hasOwn(rules, 'rename') ? rules.rename : {};
                /** @type {Record<string,string>} */
                const normalized = Object.create(null);
                if (data.isObject(rename)) {
                    for (const [from, to] of Object.entries(rename)) {
                        try {
                            if (!from.startsWith('/') || typeof to !== 'string' || !to.startsWith('/'))
                                throw new TypeError();
                            const start = path.canonicalAddress(from), end = path.canonicalAddress(to);
                            if (start.endsWith('/') !== end.endsWith('/') || Object.hasOwn(normalized, start))
                                throw new TypeError();
                            normalized[start] = end;
                        }
                        catch {
                            fail('DEM_MAP', work.mapSource, '/sources', { packageName, from, to });
                        }
                    }
                }
                const selectors = Object.keys(normalized);
                for (const a of selectors)
                    for (const b of selectors)
                        if (a !== b && a.endsWith('/') && b.startsWith(a))
                            fail('DEM_MAP', work.mapSource, '/sources', { packageName, overlap: [a, b] });
                const bindings = Object.hasOwn(rules, 'bind') ? rules.bind : {};
                if (data.isObject(bindings)) {
                    for (const [dependency, binding] of Object.entries(bindings)) {
                        const contract = schema && Object.hasOwn(schema.dependencies, dependency) ? schema.dependencies[dependency] : undefined;
                        let invalid = !member(dependency) || !data.isObject(binding)
                            || Object.keys(binding).some(k => !['path', 'attributes'].includes(k))
                            || typeof binding.path !== 'string' || !binding.path.startsWith('/')
                            || !data.isObject(binding.attributes);
                        if (!invalid) {
                            try {
                                path.canonicalAddress(binding.path);
                                if (binding.path.endsWith('/'))
                                    invalid = true;
                            }
                            catch {
                                invalid = true;
                            }
                            const aliases = Object.keys(binding.attributes), values = Object.values(binding.attributes);
                            invalid ||= aliases.some(alias => !member(alias))
                                || values.some(value => typeof value !== 'string' || !member(value))
                                || new Set(values).size !== values.length;
                            if (contract && Array.isArray(contract.attributes))
                                invalid ||= aliases.length !== contract.attributes.length
                                    || contract.attributes.some((/** @type {string} */ alias) => !Object.hasOwn(binding.attributes, alias));
                            else if (schema && !contract)
                                invalid = true;
                        }
                        if (invalid)
                            fail('DEM_MAP', work.mapSource, '/sources', { packageName, dependency });
                    }
                }
            }
            for (const [selector, rules] of Object.entries(work.map.identityProfiles)) {
                try {
                    if (!selector.startsWith('/') || !data.isObject(rules))
                        throw new TypeError();
                    path.canonicalAddress(selector);
                    if (selector.endsWith('/'))
                        throw new TypeError();
                }
                catch {
                    fail('DEM_MAP', work.mapSource, '/identityProfiles', { path: selector });
                    continue;
                }
                for (const [attribute, profile] of Object.entries(rules)) {
                    if (!member(attribute))
                        fail('DEM_MAP', work.mapSource, '/identityProfiles', { path: selector, attribute });
                    if (!data.isObject(profile) || !['int', 'uuid'].includes(profile.type)
                        || Object.keys(profile).some(k => !['type', ...(profile.type === 'int' ? ['capacity'] : [])].includes(k))
                        || profile.type === 'int' && !['small', 'regular', 'large'].includes(profile.capacity ?? 'regular')
                        || Object.hasOwn(profile, 'capacity') && profile.capacity === null)
                        fail('DEM_TYPE', work.mapSource, '/identityProfiles', { path: selector, attribute });
                }
            }
            return work;
        };
    }
}
export const __deps__ = Object.freeze({ default: Object.freeze({ data: 'TeqFw_Dem_Util_Data$', path: 'TeqFw_Dem_Compile_A_Path$', diagnostic: 'TeqFw_Dem_Dto_Compile_Diagnostic$' }) });
