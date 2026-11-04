// @ts-check
/**
 * @namespace TeqFw_Dem_Repository_Normalize
 * @description Portable record, key and logical value normalization without generation or storage.
 */
export default class Normalize {
    /**
     * @param {object} deps
     * @param {TeqFw_Dem_Registry_CoreValue} deps.values
     * @param {TeqFw_Dem_Util_Data} deps.data
     * @param {TeqFw_Dem_Repository_Error} deps.errors
     */
    constructor({values, data, errors}) {
        /**
         * @param {string} message
         * @returns {TeqFw_Dem_Never}
         */
        const invalid = function (message) { throw errors.create({code:'INVALID_INPUT', message}); };
        /**
         * @param {unknown} value
         * @returns {Record<string,any>}
         */
        const object = function (value) {
            if (!data.isObject(value)) return invalid('Expected a plain object.');
            if (Object.getOwnPropertySymbols(value).length) return invalid('Expected a plain object.');
            for (const key of Object.keys(value)) {
                const descriptor = Object.getOwnPropertyDescriptor(value, key);
                if (!descriptor || !Object.hasOwn(descriptor, 'value')) return invalid('Expected a plain object.');
            }
            return value;
        };
        /**
         * @param {object} deps
         * @param {TeqFw_Dem_Attribute} deps.attribute
         * @param {unknown} deps.value
         * @param {Record<string, any>} [deps.handlers]
         * @returns {unknown}
         */
        this.value = function ({attribute, value, handlers = {}}) {
            if (value === null) {
                if (!attribute.nullable) return invalid('Non-null attribute: ' + attribute.name);
                return null;
            }
            const type = attribute.type;
            try {
                if (type.name === 'identity' || type.name === 'ref') {
                    if (type.profile?.type === 'uuid') return values.normalizeValue({type:{name:'uuid'}, value});
                    if (type.profile?.type !== 'int' || !(typeof value === 'string' && /^[1-9][0-9]*$/.test(value)
                        || typeof value === 'number' && Number.isSafeInteger(value) && value > 0)) return invalid('Invalid identity value.');
                    return String(value);
                }
                const handler = handlers[type.name];
                if (handler) {
                    const normalized = handler.normalize(value, type.params ?? {});
                    try { return handler.copy(normalized, type.params ?? {}); }
                    catch { throw errors.create({code:'STORAGE', message:'Cannot copy normalized value.'}); }
                }
                return values.normalizeValue({type, value});
            } catch (error) {
                if (/** @type {any} */(error).name === 'DemRepositoryError') throw error;
                return invalid('Invalid value for attribute: ' + attribute.name);
            }
        };
        /**
         * Returns omitted generation attributes for the backend to fill; never executes generators.
         * @param {object} deps
         * @param {TeqFw_Dem_Entity} deps.entity
         * @param {unknown} deps.record
         * @param {TeqFw_Dem_RecordMode} deps.mode
         * @param {Record<string, any>} [deps.handlers]
         * @param {Record<string, any>} [deps.definitions]
         * @returns {TeqFw_Dem_Record}
         */
        this.record = function ({entity, record, mode, handlers = {}, definitions = {}}) {
            if (!['create','update','complete'].includes(mode)) return invalid('Unknown normalization mode.');
            const input = object(record);
            if (Object.keys(input).some((/** @type {string} */ name) => !entity.attributes.some((/** @type {TeqFw_Dem_Attribute} */ a) => a.name === name))) return invalid('Unknown record attribute.');
            if (mode === 'update' && !Object.keys(input).length) return invalid('Empty update patch.');
            if (mode === 'update' && Object.keys(input).some((/** @type {string} */ name) => entity.primaryKey?.includes(name) || entity.attributes.some((/** @type {TeqFw_Dem_Attribute} */ a) => a.name === name && a.type.name === 'identity'))) return invalid('Primary key and identity are immutable.');
            /**
             * @type {TeqFw_Dem_Record}
             */
            const result = {};
            for (const attribute of entity.attributes) {
                let value;
                if (Object.hasOwn(input, attribute.name)) value = input[attribute.name];
                else if (mode === 'update') continue;
                else if (mode === 'create' && Object.hasOwn(attribute, 'default')) {
                    const handler = handlers[attribute.type.name];
                    const definition = definitions[attribute.type.name];
                    if (attribute.default === null) value = null;
                    else if (handler && definition?.literal && handler.fromLiteral) {
                        try { value = handler.fromLiteral(definition.literal.normalize(attribute.default, attribute.type.params ?? {}), attribute.type.params ?? {}); }
                        catch { return invalid('Invalid default for attribute: ' + attribute.name); }
                    } else value = attribute.default;
                }
                else if (mode === 'create' && attribute.generation) continue;
                else if (mode === 'create' && attribute.nullable) value = null;
                else return invalid('Missing attribute: ' + attribute.name);
                Object.defineProperty(result, attribute.name, {value:this.value({attribute, value, handlers}), enumerable:true, writable:true, configurable:true});
            }
            return result;
        };
        /**
         * @param {object} deps
         * @param {TeqFw_Dem_Entity} deps.entity
         * @param {unknown} deps.key
         * @param {Record<string, any>} [deps.handlers]
         * @returns {TeqFw_Dem_Key}
         */
        this.key = function ({entity, key, handlers = {}}) {
            const input = object(key);
            if (Object.keys(input).some(k => !['kind','name','values'].includes(k))) return invalid('Unknown key field.');
            let members;
            if (input.kind === 'primary' && !Object.hasOwn(input, 'name')) members = entity.primaryKey;
            else if (input.kind === 'unique' && typeof input.name === 'string' && Object.hasOwn(entity.uniqueKeys, input.name)) members = entity.uniqueKeys[input.name];
            else return invalid('Unknown key selector.');
            if (!members) throw errors.create({code:'UNSUPPORTED',message:'Entity has no primary key.'});
            const supplied = object(input.values);
            if (Object.keys(supplied).length !== members.length || members.some((/** @type {string} */ name) => !Object.hasOwn(supplied,name))) return invalid('Key requires exactly its declared members.');
            /**
             * @type {TeqFw_Dem_Record}
             */
            const normalized = {};
            for (const name of /** @type {string[]} */ (members)) {
                if (supplied[name] === null) return invalid('Null key member.');
                const attribute = entity.attributes.find((/** @type {TeqFw_Dem_Attribute} */ a) => a.name === name);
                if (!attribute) return invalid('Invalid entity key.');
                Object.defineProperty(normalized,name,{value:this.value({attribute,value:supplied[name],handlers}),enumerable:true});
            }
            return input.kind === 'primary' ? {kind:'primary',values:normalized} : {kind:'unique',name:input.name,values:normalized};
        };
    }
}
export const __deps__ = Object.freeze({default:Object.freeze({values:'TeqFw_Dem_Registry_CoreValue$',data:'TeqFw_Dem_Util_Data$',errors:'TeqFw_Dem_Repository_Error$'})});
