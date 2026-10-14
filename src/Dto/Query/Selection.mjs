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
        /**
         * @param {TeqFw_Dem_Attribute} attribute
         * @returns {boolean}
         */
        const orderable = function (attribute) { return !['binary','json','vector'].includes(attribute.type.name); };
        /**
         * @param {object} deps
         * @param {TeqFw_Dem_Entity} deps.entity
         * @param {unknown} deps.selection
         * @returns {TeqFw_Dem_Selection}
         */
        this.create = function ({entity, selection}) {
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
                const found = entity.attributes.find(a => a.name === name);
                return found ?? invalid('Unknown selection attribute.');
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
                if (!orderable(attr)) throw errors.create({code:'UNSUPPORTED',message:'Non-scalar comparisons are unsupported.'});
                const literal = args[1];
                // Identity literals omit type: Expression deliberately only accepts name/params.
                if (literal.type && data.serialize(literal.type) !== data.serialize({name:attr.type.name,params:attr.type.params ?? {}})) return invalid('Literal type must match attribute type exactly.');
                const value = literal.value === null ? null : normalize.value({attribute:attr,value:literal.value});
                return {kind:'call',operator:op,args:[args[0],{kind:'value',value}]};
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
                if (!orderable(attribute(item.attribute))) throw errors.create({code:'UNSUPPORTED',message:'Unsupported ordering type.'});
                return {attribute:item.attribute,direction:item.direction,nulls:item.nulls};
            });
            if (new Set(result.orderBy.map(o=>o.attribute)).size !== result.orderBy.length) return invalid('Duplicate ordering attribute.');
            const candidates = [entity.primaryKey, ...Object.keys(entity.uniqueKeys).sort().map(k=>entity.uniqueKeys[k])];
            const tie = candidates.find(key => key?.length && key.every(name=> !attribute(name).nullable && orderable(attribute(name))));
            const fallback = entity.attributes.slice().sort((a,b)=>a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
            if (!tie && fallback.some(a=>!orderable(a))) throw errors.create({code:'UNSUPPORTED',message:'Entity has no portable total ordering.'});
            for (const name of tie ?? fallback.map(a=>a.name)) {
                if (!result.orderBy.some(o=>o.attribute === name)) result.orderBy.push({attribute:name,direction:'asc',nulls:'last'});
            }
            result.limit = input.limit === undefined ? null : input.limit;
            result.offset = input.offset === undefined ? 0 : input.offset;
            if (result.limit !== null && (!Number.isSafeInteger(result.limit) || result.limit < 0)
                || !Number.isSafeInteger(result.offset) || result.offset < 0) return invalid('Invalid pagination.');
            return data.freeze(result);
        };
    }
}
Object.freeze(Selection);
export const __deps__ = Object.freeze({Factory:Object.freeze({expression:'TeqFw_Dem_Dto_Query_Expression__Factory$',normalize:'TeqFw_Dem_Repository_Normalize$',data:'TeqFw_Dem_Util_Data$',errors:'TeqFw_Dem_Repository_Error$'})});
