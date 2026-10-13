// @ts-check
/**
 * @namespace TeqFw_Dem_Util_Data
 * @description JSON data validation, canonical serialization and immutability.
 */
export default class Data {
    /** Initialize component behavior. */
    constructor() {
        /**
         * @param {unknown} value
         * @returns {value is Record<string, any>}
         */
        this.isObject = function (value) {
            return value !== null && typeof value === 'object' && !Array.isArray(value)
                && [Object.prototype, null].includes(Object.getPrototypeOf(value));
        };
        /**
         * @param {unknown} value
         * @returns {string}
         */
        this.serialize = function (value) {
            const seen = new Set();
            /**
             * @param {any} item
             * @returns {string}
             */
            const visit = function (item) {
                if (typeof item === 'string') {
                    if (/\p{Surrogate}/u.test(item))
                        throw new TypeError('Invalid Unicode scalar.');
                    return JSON.stringify(item);
                }
                if (item === null || typeof item === 'boolean' || typeof item === 'number' && Number.isFinite(item))
                    return JSON.stringify(item);
                if (!item || typeof item !== 'object' || seen.has(item))
                    throw new TypeError('Expected acyclic JSON data.');
                seen.add(item);
                let result;
                if (Array.isArray(item)) {
                    if (Object.getOwnPropertySymbols(item).length || Object.keys(item).some(k => !Object.hasOwn(Object.getOwnPropertyDescriptor(item, k) ?? {}, 'value')))
                        throw new TypeError('Invalid JSON array members.');
                    if (Object.keys(item).length !== item.length || Object.keys(item).some((key, index) => key !== String(index)))
                        throw new TypeError('Sparse or decorated array.');
                    result = '[' + item.map(visit).join(',') + ']';
                }
                else {
                    if (![Object.prototype, null].includes(Object.getPrototypeOf(item))
                        || Object.getOwnPropertySymbols(item).length)
                        throw new TypeError('Expected JSON object.');
                    result = '{' + Object.keys(item).sort().map((key) => {
                        const descriptor = Object.getOwnPropertyDescriptor(item, key);
                        if (!descriptor || !('value' in descriptor))
                            throw new TypeError('JSON getters are unsupported.');
                        return visit(key) + ':' + visit(descriptor.value);
                    }).join(',') + '}';
                }
                seen.delete(item);
                return result;
            };
            return visit(value);
        };
        /**
         * @param {any} value
         * @returns {any}
         */
        this.freeze = function (value) {
            if (value && typeof value === 'object' && !Object.isFrozen(value)) {
                for (const child of Object.values(value))
                    this.freeze(child);
                Object.freeze(value);
            }
            return value;
        };
        /**
         * @param {string} text
         * @returns {any}
         */
        this.parse = function (text) {
            // Check raw members before JSON.parse can discard duplicate evidence.
            let pos = 0;
            /** @returns {void} */
            const space = function () {
                while (/[\t\n\r ]/.test(text[pos] ?? '\0'))
                    pos++;
            };
            /** @returns {string} */
            const string = function () {
                const start = pos++;
                while (pos < text.length) {
                    const ch = text[pos++];
                    if (ch === '\\')
                        pos++;
                    else if (ch === '"')
                        return JSON.parse(text.slice(start, pos));
                }
                throw new SyntaxError('Unterminated string.');
            };
            /** @returns {void} */
            const value = function () {
                space();
                const ch = text[pos];
                if (ch === '"') {
                    string();
                    return;
                }
                if (ch === '{' || ch === '[') {
                    const object = ch === '{', end = object ? '}' : ']';
                    const keys = new Set();
                    pos++;
                    space();
                    if (text[pos] === end) {
                        pos++;
                        return;
                    }
                    while (pos < text.length) {
                        if (object) {
                            if (text[pos] !== '"')
                                throw new SyntaxError('Expected member name.');
                            const key = string();
                            if (keys.has(key))
                                throw new SyntaxError('Duplicate JSON member: ' + key);
                            keys.add(key);
                            space();
                            if (text[pos++] !== ':')
                                throw new SyntaxError('Expected colon.');
                        }
                        value();
                        space();
                        if (text[pos] === end) {
                            pos++;
                            return;
                        }
                        if (text[pos++] !== ',')
                            throw new SyntaxError('Expected comma.');
                        space();
                    }
                    throw new SyntaxError('Unterminated collection.');
                }
                const start = pos;
                while (pos < text.length && !/[\s,}\]]/.test(text[pos]))
                    pos++;
                if (pos === start)
                    throw new SyntaxError('Expected value.');
                JSON.parse(text.slice(start, pos));
            };
            value();
            space();
            if (pos !== text.length)
                throw new SyntaxError('Trailing data.');
            const parsed = JSON.parse(text);
            this.serialize(parsed);
            return parsed;
        };
    }
}
