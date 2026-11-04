// @ts-check
/**
 * @namespace TeqFw_Dem_Dto_Query_Selection
 * @description Immutable entity-aware portable filtering, ordering and pagination.
 */
const NS = 'TeqFw_Dem_Dto_Query_Selection';
export default class Selection {
    /**
     * @type {TeqFw_Dem_QueryExpression|undefined}
     */ where;
    /** @type {TeqFw_Dem_Order[]} */ orderBy = [];
    /** @type {number|null} */ limit = null;
    /** @type {number} */ offset = 0;
}
export class Factory {
    static namespace = NS;
    /**
     * @param {object} deps
     * @param {TeqFw_Dem_Dto_Query_Expression__Factory} deps.expression
     * @param {TeqFw_Dem_Repository_Normalize} deps.normalize
     * @param {TeqFw_Dem_Util_Data} deps.data
     * @param {TeqFw_Dem_Repository_Error} deps.errors
     */
    constructor({expression, normalize, data, errors}) {
        /**
         * @param {string} message
         * @returns {TeqFw_Dem_Never}
         */
        const invalid = function (message) { throw errors.create({code:'INVALID_INPUT',message}); };
        /** @param {any} value @param {any} [seen] @returns {any} */
        const freeze = function (value, seen = new WeakSet()) {
            if (!value || typeof value !== 'object' || ArrayBuffer.isView(value) || value instanceof ArrayBuffer || seen.has(value)) return value;
            seen.add(value);
            for (const child of Object.values(value)) freeze(child, seen);
            return Object.freeze(value);
        };
        /**
         * @param {object} deps
         * @param {TeqFw_Dem_Entity} deps.entity
         * @param {unknown} deps.selection
         * @param {Record<string, any>} [deps.handlers]
         * @param {Record<string, any>} [deps.definitions]
         * @returns {TeqFw_Dem_Selection}
         */
        this.create = function ({entity, selection, handlers = {}, definitions = {}}) {
            // DTO instances are accepted by extracting their defined data fields.
            if (selection instanceof Selection) selection = Object.fromEntries(Object.entries(selection).filter(([,v])=>v !== undefined));
            if (!data.isObject(selection)) return invalid('Selection must be a plain object.');
            const input = selection;
            if (Object.keys(input).some(k => !['where','orderBy','limit','offset'].includes(k))) return invalid('Unknown selection field.');
            /**
             * @param {unknown} name
             * @returns {TeqFw_Dem_Attribute}
             */
            const attribute = function (name) {
                const found = entity.attributes.find((/** @type {TeqFw_Dem_Attribute} */ a) => a.name === name);
                return found ?? invalid('Unknown selection attribute.');
            };
            /** @param {string} name @returns {boolean} */
            const orderable = function (name) {
                const attr = attribute(name);
                const definition = definitions[attr.type.name];
                return definition ? Boolean(definition.ordering) : true;
            };
            /**
             * @param {TeqFw_Dem_QueryExpression} node
             * @returns {TeqFw_Dem_QueryExpression}
             */
            const predicate = function (node) {
                if (node.kind !== 'call' || !node.operator || !node.args) return invalid('Filter must be a boolean call.');
                const op = node.operator, args = node.args;
                if (['and','or','not'].includes(op)) {
                    if (op === 'not' ? args.length !== 1 : args.length < 2) return invalid('Invalid boolean arity.');
                    return {kind:'call',operator:op,args:args.map(predicate)};
                }
                if (['isNull','isNotNull'].includes(op)) {
                    if (args.length !== 1 || args[0].kind !== 'attr') return invalid('Null test requires one attribute.');
                    attribute(args[0].name);
                    return node;
                }
                if (!['eq','ne','lt','lte','gt','gte'].includes(op)) throw errors.create({code:'UNSUPPORTED',message:'Unsupported operator: ' + op});
                if (args.length !== 2 || args[0].kind !== 'attr' || args[1].kind !== 'value') return invalid('Comparison requires attribute then literal.');
                const attr = attribute(args[0].name);
                const literal = args[1];
                const definition = definitions[attr.type.name];
                const handler = handlers[attr.type.name];
                const ordered = ['lt','lte','gt','gte'].includes(op);
                if (definition && (ordered ? !definition.ordering : !definition.equality)) return invalid('Logical type does not support this comparison.');
                // Identity literals omit type: Expression deliberately only accepts name/params.
                if (literal.type && data.serialize(literal.type) !== data.serialize({name:attr.type.name,params:attr.type.params ?? {}})) return invalid('Literal type must match attribute type exactly.');
                let value = null;
                if (literal.value !== null) {
                    if (definition && literal.type) value = normalize.value({attribute:attr,value:literal.value,handlers});
                    else if (definition && definition.literal && handler?.fromLiteral) {
                        try {
                            const declaration = definition.literal.normalize(literal.value, attr.type.params ?? {});
                            value = normalize.value({attribute:attr,value:handler.fromLiteral(declaration, attr.type.params ?? {}),handlers});
                        } catch { return invalid('Invalid literal for attribute type.'); }
                    } else if (definition) return invalid('Runtime value requires an explicit logical type.');
                    else value = normalize.value({attribute:attr,value:literal.value,handlers});
                }
                const captured = /** @type {any} */ ({kind:'value'});
                if (handler && value !== null) {
                    // Return a fresh detached value on every public read so a caller cannot mutate the captured operand.
                    Object.defineProperty(captured,'value',{enumerable:true,get:()=>handler.copy(value,attr.type.params ?? {})});
                } else captured.value = value;
                if (definition) captured.type = {name:attr.type.name,params:attr.type.params ?? {}};
                return {kind:'call',operator:op,args:[args[0],captured]};
            };
            const result = new Selection();
            if (input.where !== undefined) {
                let tree;
                try { tree = expression.create(input.where); } catch { return invalid('Invalid expression structure.'); }
                result.where = predicate(tree);
            }
            if (input.orderBy !== undefined && !Array.isArray(input.orderBy)) return invalid('orderBy must be an array.');
            result.orderBy = (input.orderBy ?? []).map((/** @type {any} */ item) => {
                if (!data.isObject(item) || Object.keys(item).some(k => !['attribute','direction','nulls'].includes(k))
                    || !['asc','desc'].includes(item.direction) || !['first','last'].includes(item.nulls)) return invalid('Ordering requires attribute, direction and nulls.');
                const attr = attribute(item.attribute);
                if (!orderable(attr.name)) return invalid('Logical type does not support ordering.');
                return {attribute:item.attribute,direction:item.direction,nulls:item.nulls};
            });
            if (new Set(result.orderBy.map(o=>o.attribute)).size !== result.orderBy.length) return invalid('Duplicate ordering attribute.');
            const candidates = [entity.primaryKey, ...Object.keys(entity.uniqueKeys).sort().map((/** @type {string} */ k)=>entity.uniqueKeys[k])];
            const tie = candidates.find((/** @type {any} */ key) => key?.length && key.every((/** @type {string} */ name)=> {
                const attr = attribute(name);
                return !attr.nullable && orderable(name);
            }));
            const fallback = entity.attributes.slice().sort((/** @type {TeqFw_Dem_Attribute} */ a, /** @type {TeqFw_Dem_Attribute} */ b)=>a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
            const fallbackNames = fallback.every((/** @type {TeqFw_Dem_Attribute} */ attr)=>orderable(attr.name))
                ? fallback.map((/** @type {TeqFw_Dem_Attribute} */ a)=>a.name) : [];
            for (const name of tie ?? fallbackNames) {
                if (!result.orderBy.some(o=>o.attribute === name)) result.orderBy.push({attribute:name,direction:'asc',nulls:'last'});
            }
            result.limit = input.limit === undefined ? null : input.limit;
            result.offset = input.offset === undefined ? 0 : input.offset;
            if (result.limit !== null && (!Number.isSafeInteger(result.limit) || result.limit < 0)
                || !Number.isSafeInteger(result.offset) || result.offset < 0) return invalid('Invalid pagination.');
            return freeze(result);
        };
    }
}
Object.freeze(Selection);
export const __deps__ = Object.freeze({Factory:Object.freeze({expression:'TeqFw_Dem_Dto_Query_Expression__Factory$',normalize:'TeqFw_Dem_Repository_Normalize$',data:'TeqFw_Dem_Util_Data$',errors:'TeqFw_Dem_Repository_Error$'})});
