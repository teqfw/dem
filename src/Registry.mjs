// @ts-check
/**
 * @namespace TeqFw_Dem_Registry
 * @description Container-scoped registry of finalized logical type definitions.
 */
export default class TypeRegistry {
    /**
     * @param {object} deps
     * @param {TeqFw_Dem_Registry_Core} deps.core
     * @param {TeqFw_Dem_Registry_CoreValue} deps.values
     * @param {TeqFw_Dem_Util_Data} deps.data
     */
    constructor({core, values, data}) {
        const definitions = new Map();
        let finalized = false;
        const typeName = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/;
        const providerName = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)+$/;
        const memberName = /^[A-Za-z_][A-Za-z0-9_]*$/;
        const descriptions = /** @type {Record<string,Record<string,string>>} */ ({
            binary: {length: 'Optional maximum byte length, as a positive safe integer.'}, boolean: {}, date: {}, datetime: {precision: 'Fraction digits from 0 through 9.', timezone: 'Whether values include a UTC offset.'},
            decimal: {precision: 'Required total decimal precision.', scale: 'Required fractional scale from 0 through precision.', unsigned: 'Whether negative values are forbidden.'}, enum: {values: 'Required non-empty list of unique string values.'}, integer: {bits: 'Integer width: 8, 16, 32 or 64; defaults to 32.', unsigned: 'Whether negative values are forbidden; defaults to false.'},
            json: {}, string: {length: 'Required maximum Unicode code point length.'}, text: {}, uuid: {}, vector: {dimensions: 'Required positive vector dimension count.', element: 'Element kind: float or bit.', sparse: 'Whether values use sparse representation; defaults to false.'},
            identity: {}, ref: {},
        });
        /** @param {unknown} value @returns {Record<string, any>} */
        const record = function (value) {
            if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError('Expected a plain record.');
            if (Object.getOwnPropertySymbols(value).length) throw new TypeError('Symbols are not allowed.');
            for (const key of Object.getOwnPropertyNames(value)) {
                const descriptor = Object.getOwnPropertyDescriptor(value, key);
                if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new TypeError('Accessors are not allowed.');
            }
            return /** @type {Record<string, any>} */ (value);
        };
        /** @param {Record<string, any>} value @param {string} key @returns {boolean} */
        const hasField = function (value, key) {
            const descriptor = Object.getOwnPropertyDescriptor(value, key);
            return Boolean(descriptor?.enumerable && Object.hasOwn(descriptor, 'value'));
        };
        /** @param {unknown} value @returns {any} */
        const copyJson = function (value) {
            data.serialize(value);
            if (Array.isArray(value)) return value.map(copyJson);
            if (data.isObject(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copyJson(item)]));
            return value;
        };
        /** @param {unknown} value @param {Array<string>} fields @returns {Record<string, any>} */
        const closed = function (value, fields) {
            const item = record(value);
            for (const key of Object.keys(item)) if (!fields.includes(key)) throw new TypeError('Unknown definition field.');
            return item;
        };
        /** @param {any} source @param {boolean} builtIn @returns {any} */
        const snapshot = function (source, builtIn = false) {
            const fields = ['name', 'parameters', 'normalizeParams', 'valueDomain', 'preservation', 'valueHandling', 'equality', 'ordering', 'literal', 'generation'];
            const item = closed(source, fields);
            if (typeof item.name !== 'string' || !typeName.test(item.name) || (!builtIn && !providerName.test(item.name))) throw new TypeError('Invalid type identifier.');
            for (const key of ['name', 'parameters', 'normalizeParams', 'valueDomain', 'preservation', 'valueHandling']) if (!hasField(item, key)) throw new TypeError('Missing definition field.');
            const parameters = record(item.parameters);
            /** @type {Record<string, string>} */ const params = Object.create(null);
            for (const [name, description] of Object.entries(parameters)) {
                if (!memberName.test(name) || typeof description !== 'string' || !description.trim()) throw new TypeError('Invalid parameter definition.');
                params[name] = description;
            }
            for (const key of ['valueDomain', 'preservation', 'valueHandling']) if (typeof item[key] !== 'string' || !item[key].trim()) throw new TypeError('Invalid type description.');
            if (typeof item.normalizeParams !== 'function') throw new TypeError('Missing parameter normalizer.');
            if (hasField(item, 'equality') && (typeof item.equality !== 'string' || !item.equality.trim())) throw new TypeError('Invalid equality description.');
            if (hasField(item, 'ordering') && (typeof item.ordering !== 'string' || !item.ordering.trim() || !hasField(item, 'equality'))) throw new TypeError('Invalid ordering description.');
            const normalizeParams = item.normalizeParams;
            /** @type {any} */ const result = {name: item.name, parameters: data.freeze(params), normalizeParams: Object.freeze((/** @type {Record<string, any>} */ p) => Reflect.apply(normalizeParams, undefined, [p])), valueDomain: item.valueDomain, preservation: item.preservation, valueHandling: item.valueHandling};
            if (hasField(item, 'equality')) result.equality = item.equality;
            if (hasField(item, 'ordering')) result.ordering = item.ordering;
            for (const key of ['literal', 'generation']) {
                if (!hasField(item, key)) continue;
                const meta = closed(item[key], key === 'literal' ? ['grammar', 'normalize'] : ['declaration', 'guarantees', 'normalize']);
                const expected = key === 'literal' ? ['grammar', 'normalize'] : ['declaration', 'guarantees', 'normalize'];
                if (Object.keys(meta).length !== expected.length || expected.some(field => !hasField(meta, field)) || typeof meta.normalize !== 'function') throw new TypeError('Invalid type capability definition.');
                for (const field of expected.slice(0, -1)) if (typeof meta[field] !== 'string' || !meta[field].trim()) throw new TypeError('Invalid type capability description.');
                const normalize = meta.normalize;
                result[key] = {...meta, normalize: Object.freeze((/** @type {any} */ declaration, /** @type {Record<string, any>} */ normalized) => Reflect.apply(normalize, undefined, [declaration, normalized]))};
            }
            result.parameters = copyJson(result.parameters);
            return data.freeze(result);
        };
        for (const name of Object.keys(core.types)) {
            const allowed = descriptions[name] ?? {};
            const definition = /** @type {any} */ ({
                name,
                parameters: allowed,
                normalizeParams: (/** @type {Record<string, any>} */ params) => {
                    const normalized = values.normalizeType({type: {name, params}});
                    if (!normalized) throw new TypeError('Invalid Core type parameters.');
                    return normalized.params;
                },
                valueDomain: 'Values accepted by the existing DEM Core normalizer for ' + name + '.',
                preservation: 'Preserve the canonical Core logical value without storage-specific semantics.',
                valueHandling: 'Validate, normalize and detach values using the existing DEM Core value normalizer.',
                equality: 'Deterministic equality of normalized Core values.',
                ordering: 'Deterministic total order of normalized Core values.',
            });
            if (!['identity', 'ref'].includes(name)) {
                definition.literal = {grammar: 'The existing JSON literal grammar for Core type ' + name + '.', normalize: (/** @type {any} */ literal, /** @type {Record<string, any>} */ params) => values.normalizeValue({type: {name, params}, value: literal})};
            }
            if (name !== 'ref') {
                definition.generation = {declaration: 'Boolean true requests logical generation; false means no generation.', guarantees: 'The existing Core declaration flag; generation execution remains adapter-owned.', normalize: (/** @type {any} */ declaration) => {
                    if (declaration !== true) throw new TypeError('Unsupported Core generation declaration.');
                    return true;
                }};
            }
            definitions.set(name, snapshot(definition, true));
        }
        /** @param {unknown} batch @returns {void} */
        this.register = function (batch) {
            if (finalized) throw new Error('Type Registry is finalized.');
            if (!Array.isArray(batch) || Object.getPrototypeOf(batch) !== Array.prototype || Object.getOwnPropertySymbols(batch).length || Reflect.ownKeys(batch).some(key => key !== 'length' && (typeof key !== 'string' || !/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= batch.length)) || batch.length !== Object.keys(batch).length) throw new TypeError('Definitions must be a dense array.');
            for (let i = 0; i < batch.length; i++) {
                const descriptor = Object.getOwnPropertyDescriptor(batch, String(i));
                if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) throw new TypeError('Definitions must be a dense data array.');
            }
            const pending = new Map();
            for (const raw of batch) {
                const item = snapshot(raw);
                if (definitions.has(item.name) || pending.has(item.name)) throw new TypeError('Duplicate logical type: ' + item.name);
                pending.set(item.name, item);
            }
            for (const [name, item] of pending) definitions.set(name, item);
        };
        /** @returns {void} */
        this.finalize = function () { finalized = true; };
        /** @returns {void} */
        this.assertFinalized = function () { if (!finalized) throw new Error('Type Registry is not finalized.'); };
        /** @param {string} name @returns {any} */
        this.get = function (name) {
            this.assertFinalized();
            if (typeof name !== 'string' || !typeName.test(name)) throw new TypeError('Invalid logical type identifier.');
            return definitions.get(name);
        };
    }
}
export const __deps__ = Object.freeze({default: Object.freeze({core: 'TeqFw_Dem_Registry_Core$', values: 'TeqFw_Dem_Registry_CoreValue$', data: 'TeqFw_Dem_Util_Data$'})});
