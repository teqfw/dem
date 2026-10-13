// @ts-check
/**
 * @namespace TeqFw_Dem_Registry_CoreValue
 * @description Exact normalization of logical types and declared literal values.
 */
export default class CoreValue {
    /**
     * @param {object} deps
     * @param {TeqFw_Dem_Registry_Core} deps.core
     * @param {TeqFw_Dem_Util_Data} deps.data
     */
    constructor({ core, data }) {
        /**
         * @param {any} n
         * @returns {boolean}
         */
        const positive = function (/** @type {any} */ n) {
            return Number.isSafeInteger(n) && n > 0;
        };
        /**
         * @param {any} x
         * @param {string} k
         * @returns {boolean}
         */
        const own = function (/** @type {any} */ x, /** @type {string} */ k) {
            return Object.hasOwn(x, k);
        };
        /**
         * @param {object} deps
         * @param {unknown} deps.type
         * @returns {TeqFw_Dem_LogicalTypeNullable}
         */
        this.normalizeType = function ({ type }) {
            if (!data.isObject(type) || typeof type.name !== 'string' || Object.keys(type).some(k => !['name', 'params'].includes(k)))
                return null;
            if (!Object.hasOwn(core.types, type.name))
                return null;
            const entry = /** @type {Record<string,{allowed:string[],defaults:Record<string,any>}>} */ (core.types)[type.name];
            if (!entry || !data.isObject(type.params ?? {}) || own(type, 'params') && type.params === null)
                return null;
            const supplied = type.params ?? {};
            if (Object.keys(supplied).some(k => !entry.allowed.includes(k)))
                return null;
            const p = { ...entry.defaults, ...supplied };
            let valid = true;
            switch (type.name) {
                case 'binary':
                    valid = !own(p, 'length') || positive(p.length);
                    break;
                case 'string':
                    valid = positive(p.length);
                    break;
                case 'datetime':
                    valid = Number.isSafeInteger(p.precision) && p.precision >= 0 && p.precision <= 9 && typeof p.timezone === 'boolean';
                    break;
                case 'decimal':
                    valid = positive(p.precision) && Number.isSafeInteger(p.scale) && p.scale >= 0 && p.scale <= p.precision && typeof p.unsigned === 'boolean';
                    break;
                case 'integer':
                    valid = [8, 16, 32, 64].includes(p.bits) && typeof p.unsigned === 'boolean';
                    break;
                case 'enum':
                    valid = Array.isArray(p.values) && p.values.length > 0 && p.values.every((/** @type {any} */ v) => typeof v === 'string') && new Set(p.values).size === p.values.length;
                    if (valid)
                        p.values = [...p.values].sort();
                    break;
                case 'vector':
                    valid = positive(p.dimensions) && ['float', 'bit'].includes(p.element) && typeof p.sparse === 'boolean' && !(p.element === 'bit' && p.sparse);
                    break;
            }
            if (!valid)
                return null;
            try {
                data.serialize(p);
            }
            catch {
                return null;
            }
            return data.freeze({ name: type.name, params: p });
        };
        /**
         * @param {string} value
         * @returns {boolean}
         */
        const dateValid = function (value) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
                return false;
            const [y, m, d] = value.split('-').map(Number);
            const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
            return y >= 1 && y <= 9999 && m >= 1 && m <= 12 && d >= 1 && d <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
        };
        /**
         * @param {object} deps
         * @param {TeqFw_Dem_Type} deps.type
         * @param {unknown} deps.value
         * @returns {any}
         */
        this.normalizeValue = function ({ type, value }) {
            /** @returns {any} */
            const fail = function () { throw new TypeError('Value does not satisfy ' + type.name); };
            data.serialize(value);
            const p = type.params ?? {};
            switch (type.name) {
                case 'boolean':
                    if (typeof value !== 'boolean')
                        fail();
                    break;
                case 'json': break;
                case 'string':
                case 'text':
                    if (typeof value !== 'string' || type.name === 'string' && [... /** @type {string} */(value)].length > p.length)
                        fail();
                    break;
                case 'uuid':
                    if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
                        fail();
                    return /** @type {string} */ (value).toLowerCase();
                case 'enum':
                    if (!p.values.includes(value))
                        fail();
                    break;
                case 'integer': {
                    if (!(typeof value === 'number' && Number.isSafeInteger(value) || typeof value === 'string' && /^-?(0|[1-9][0-9]*)$/.test(value)))
                        fail();
                    const number = BigInt(/** @type {number|string} */ (value)), bits = BigInt(p.bits);
                    const max = (1n << (bits - (p.unsigned ? 0n : 1n))) - 1n, min = p.unsigned ? 0n : -(1n << (bits - 1n));
                    if (number < min || number > max)
                        fail();
                    return number.toString();
                }
                case 'decimal': {
                    if (typeof value !== 'string' || !/^-?(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(value))
                        fail();
                    const raw = /** @type {string} */ (value), negative = raw.startsWith('-');
                    const [integer, fraction = ''] = raw.replace(/^-/, '').split('.');
                    const trimmed = fraction.replace(/0+$/, '');
                    if (trimmed.length > p.scale || integer.replace(/^0+/, '').length > p.precision - p.scale)
                        fail();
                    const zero = Number(integer) === 0 && !/[1-9]/.test(trimmed);
                    if (negative && !zero && p.unsigned)
                        fail();
                    return (negative && !zero ? '-' : '') + integer + (p.scale ? '.' + trimmed.padEnd(p.scale, '0') : '');
                }
                case 'binary': {
                    if (typeof value !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))
                        fail();
                    const raw = /** @type {string} */ (value), alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                    if (raw.endsWith('==') && alpha.indexOf(raw[raw.length - 3]) % 16 !== 0 || raw.endsWith('=') && !raw.endsWith('==') && alpha.indexOf(raw[raw.length - 2]) % 4 !== 0)
                        fail();
                    const length = raw.length / 4 * 3 - (raw.endsWith('==') ? 2 : raw.endsWith('=') ? 1 : 0);
                    if (p.length !== undefined && length > p.length)
                        fail();
                    break;
                }
                case 'date':
                    if (typeof value !== 'string' || !dateValid(value))
                        fail();
                    break;
                case 'datetime': {
                    if (typeof value !== 'string')
                        fail();
                    const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})?$/.exec(/** @type {string} */ (value));
                    if (!match || !dateValid(match[1]))
                        return fail();
                    const [, day, hh, mm, ss, fraction = '', zone] = match;
                    if (Number(hh) > 23 || Number(mm) > 59 || Number(ss) > 59 || fraction.length > p.precision || Boolean(zone) !== p.timezone)
                        fail();
                    const digits = fraction.padEnd(p.precision, '0');
                    if (!p.timezone)
                        return `${day}T${hh}:${mm}:${ss}${digits ? '.' + digits : ''}`;
                    if (zone !== 'Z' && (Number(zone.slice(1, 3)) > 14 || Number(zone.slice(4)) > 59 || Number(zone.slice(1, 3)) === 14 && Number(zone.slice(4)) !== 0))
                        fail();
                    const dt = new Date(`${day}T${hh}:${mm}:${ss}${zone}`);
                    const iso = dt.toISOString();
                    if (!dateValid(iso.slice(0, 10)))
                        fail();
                    return iso.slice(0, 19) + (digits ? '.' + digits : '') + 'Z';
                }
                case 'vector': {
                    if (p.sparse) {
                        if (!data.isObject(value) || Object.keys(value).some(k => !['dimensions', 'entries'].includes(k)) || value.dimensions !== p.dimensions || !Array.isArray(value.entries))
                            return fail();
                        const indices = new Set();
                        for (const item of value.entries) {
                            if (!data.isObject(item) || Object.keys(item).length !== 2 || !Number.isSafeInteger(item.index) || item.index < 0 || item.index >= p.dimensions || indices.has(item.index) || typeof item.value !== 'number' || !Number.isFinite(item.value) || item.value === 0)
                                fail();
                            indices.add(item.index);
                        }
                        return { dimensions: p.dimensions, entries: [...value.entries].sort((a, b) => a.index - b.index) };
                    }
                    if (!Array.isArray(value) || value.length !== p.dimensions || !value.every(v => p.element === 'bit' ? v === 0 || v === 1 : typeof v === 'number' && Number.isFinite(v)))
                        fail();
                    break;
                }
                default: return fail();
            }
            return structuredClone(value);
        };
        /**
         * @param {object} deps
         * @param {unknown} deps.type
         * @param {unknown} deps.value
         * @returns {boolean}
         */
        this.matches = function ({ type, value }) {
            const normalized = this.normalizeType({ type });
            if (!normalized)
                return false;
            try {
                this.normalizeValue({ type: normalized, value });
                return true;
            }
            catch {
                return false;
            }
        };
    }
}
export const __deps__ = Object.freeze({ default: Object.freeze({ core: 'TeqFw_Dem_Registry_Core$', data: 'TeqFw_Dem_Util_Data$' }) });
