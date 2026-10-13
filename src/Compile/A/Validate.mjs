// @ts-check
/**
 * @namespace TeqFw_Dem_Compile_A_Validate
 * @description Resolve identity profiles and validate logical values, keys and relation roles.
 */
export default class Validate {
    /**
     * @param {object} deps
     * @param {TeqFw_Dem_Registry_CoreValue} deps.values
     * @param {TeqFw_Dem_Util_Data} deps.data
     * @param {TeqFw_Dem_Compile_A_Path} deps.path
     * @param {TeqFw_Dem_Dto_Compile_Diagnostic} deps.diagnostic
     */
    constructor({ values, data, path, diagnostic }) {
        /**
         * @param {TeqFw_Dem_Work} work
         * @returns {TeqFw_Dem_Model}
         */
        this.exec = function (work) {
            /** @type {Record<string,TeqFw_Dem_Entity>} */
            const entities = Object.create(null);
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
            /** @type {Record<string,Record<string,TeqFw_Dem_Profile>>} */
            const profiles = Object.create(null);
            for (const [selector, rules] of Object.entries(work.map.identityProfiles)) {
                let address;
                try {
                    if (!selector.startsWith('/') || !data.isObject(rules))
                        throw new TypeError();
                    address = path.normalize(selector);
                    if (Object.hasOwn(profiles, address) || !Object.hasOwn(work.entities, address))
                        throw new TypeError();
                }
                catch {
                    fail('DEM_MAP', work.mapSource, '/identityProfiles', { path: selector });
                    continue;
                }
                profiles[address] = Object.create(null);
                for (const [attr, profile] of Object.entries(rules)) {
                    if (!work.entities[address].raw.attributes.some((/** @type {any} */ a) => a.name === attr && a.type.name === 'identity')) {
                        fail('DEM_MAP', work.mapSource, '/identityProfiles', { path: address, attribute: attr });
                        continue;
                    }
                    if (!data.isObject(profile) || !['int', 'uuid'].includes(profile.type) || Object.keys(profile).some(k => !['type', ...(profile.type === 'int' ? ['capacity'] : [])].includes(k)) || profile.type === 'int' && !['small', 'regular', 'large'].includes(profile.capacity ?? 'regular') || Object.hasOwn(profile, 'capacity') && profile.capacity === null) {
                        fail('DEM_TYPE', work.mapSource, '/identityProfiles', { path: address, attribute: attr });
                        continue;
                    }
                    profiles[address][attr] = profile.type === 'uuid' ? { type: 'uuid' } : { type: 'int', capacity: profile.capacity ?? 'regular' };
                }
            }
            for (const [address, info] of Object.entries(work.entities)) {
                /** @type {TeqFw_Dem_Attribute[]} */
                const attributes = [];
                for (let i = 0; i < info.raw.attributes.length; i++) {
                    const raw = info.raw.attributes[i], ptr = info.pointer + '/attributes/' + i;
                    let type = values.normalizeType({ type: raw.type });
                    if (!type) {
                        fail('DEM_TYPE', info.schema.source, ptr + '/type');
                        continue;
                    }
                    if (type.name === 'identity' || type.name === 'ref') {
                        type = type.name === 'identity' ? { name: 'identity', profile: profiles[address]?.[raw.name] ?? { type: 'int', capacity: 'regular' } } : { name: 'ref' };
                        if (raw.nullable === true && type.name === 'identity' || Object.hasOwn(raw, 'default'))
                            fail('DEM_IDENTITY', info.schema.source, ptr);
                        if (type.name === 'ref' && raw.generation === true)
                            fail('DEM_IDENTITY', info.schema.source, ptr + '/generation');
                    }
                    /** @type {TeqFw_Dem_Attribute} */
                    const attr = { name: raw.name, type, nullable: raw.nullable ?? false, generation: raw.generation ?? false };
                    if (Object.hasOwn(raw, 'default') && !['identity', 'ref'].includes(type.name)) {
                        if (attr.generation || raw.default === null && !attr.nullable)
                            fail('DEM_TYPE', info.schema.source, ptr + '/default');
                        else
                            try {
                                attr.default = raw.default === null ? null : values.normalizeValue({ type, value: raw.default });
                            }
                            catch {
                                fail('DEM_TYPE', info.schema.source, ptr + '/default');
                            }
                    }
                    attributes.push(attr);
                }
                const ids = attributes.filter(a => a.type.name === 'identity');
                if (ids.length > 1)
                    fail('DEM_IDENTITY', info.schema.source, info.pointer + '/attributes');
                const inferred = ids.length === 1 ? [ids[0].name] : null;
                const primary = info.raw.primaryKey ?? inferred;
                if (inferred && info.raw.primaryKey && data.serialize(inferred) !== data.serialize(info.raw.primaryKey))
                    fail('DEM_KEY', info.schema.source, info.pointer + '/primaryKey');
                entities[address] = { attributes, primaryKey: primary, uniqueKeys: info.raw.uniqueKeys ?? {}, indexes: info.raw.indexes ?? {}, relations: info.relations ?? {} };
            }
            // Do not derive relation types from attributes whose type validation failed.
            if (work.diagnostics.length)
                return { entities, packages: [...new Set(work.packages)].sort() };
            for (const [address, entity] of Object.entries(entities)) {
                const info = work.entities[address], attrs = new Map(entity.attributes.map(a => [a.name, a]));
                const keyLists = [...(entity.primaryKey ? [entity.primaryKey] : []), ...Object.values(entity.uniqueKeys), ...Object.values(entity.indexes).map(i => i.attributes)];
                for (const list of keyLists)
                    if (list.some(name => !attrs.has(name)))
                        fail('DEM_KEY', info.schema.source, info.pointer, { attributes: list });
                if (entity.primaryKey?.some(name => attrs.get(name)?.nullable))
                    fail('DEM_KEY', info.schema.source, info.pointer + '/primaryKey');
                const occurrences = new Map();
                for (const [name, relation] of Object.entries(entity.relations)) {
                    const ptr = info.pointer + '/relations/' + name, target = entities[relation.target.path];
                    if (relation.attributes.length !== relation.target.attributes.length || relation.attributes.some(attr => !attrs.has(attr))) {
                        fail('DEM_RELATION', info.schema.source, ptr);
                        continue;
                    }
                    const keys = [...(target.primaryKey ? [target.primaryKey] : []), ...Object.values(target.uniqueKeys)];
                    if (!keys.some(key => data.serialize(key) === data.serialize(relation.target.attributes)))
                        fail('DEM_RELATION', info.schema.source, ptr + '/target');
                    relation.attributes.forEach((local, i) => {
                        const attr = attrs.get(local), remote = target.attributes.find(a => a.name === relation.target.attributes[i]);
                        if (!attr || !remote)
                            return;
                        if (attr.type.name === 'ref') {
                            occurrences.set(local, (occurrences.get(local) ?? 0) + 1);
                            if (remote.type.name !== 'identity') {
                                fail('DEM_IDENTITY', info.schema.source, ptr, { attribute: local });
                                return;
                            }
                            attr.type = { name: 'ref', profile: remote.type.profile };
                        }
                    });
                }
                for (const attr of entity.attributes)
                    if (attr.type.name === 'ref' && occurrences.get(attr.name) !== 1)
                        fail('DEM_RELATION', info.schema.source, info.pointer, { attribute: attr.name });
            }
            if (!work.diagnostics.length)
                for (const [address, entity] of Object.entries(entities)) {
                    const info = work.entities[address];
                    for (const [name, relation] of Object.entries(entity.relations))
                        relation.attributes.forEach((local, i) => {
                            const attr = entity.attributes.find(a => a.name === local), remote = entities[relation.target.path].attributes.find(a => a.name === relation.target.attributes[i]);
                            if (!attr || !remote)
                                return;
                            const left = attr.type.profile ?? attr.type, right = remote.type.profile ?? remote.type;
                            if (data.serialize(left) !== data.serialize(right))
                                fail('DEM_TYPE', info.schema.source, info.pointer + '/relations/' + name, { attribute: local });
                        });
                }
            return { entities, packages: [...new Set(work.packages)].sort() };
        };
    }
}
export const __deps__ = Object.freeze({ default: Object.freeze({ values: 'TeqFw_Dem_Registry_CoreValue$', data: 'TeqFw_Dem_Util_Data$', path: 'TeqFw_Dem_Compile_A_Path$', diagnostic: 'TeqFw_Dem_Dto_Compile_Diagnostic$' }) });
