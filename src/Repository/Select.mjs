// @ts-check
/**
 * @namespace TeqFw_Dem_Repository_Select
 * @description Evaluate portable selections over detached logical records without a storage engine.
 */
export default class Select {
    /**
     * @param {object} deps
     * @param {TeqFw_Dem_Util_Data} deps.data
     * @param {TeqFw_Dem_Repository_Error} deps.errors
     * @param {TeqFw_Dem_Repository_Normalize} deps.normalize
     * @param {TeqFw_Dem_Dto_Query_Selection__Factory} deps.selection
     */
    constructor({normalize, selection, errors, data}) {
        /**
         * @param {TeqFw_Dem_Attribute} attribute
         * @param {any} left
         * @param {any} right
         * @returns {number}
         */
        const compare = function (attribute, left, right) {
            const type = attribute.type;
            if (['integer','decimal'].includes(type.name) || ['identity','ref'].includes(type.name) && type.profile?.type === 'int') {
                const a = BigInt(String(left).replace('.', '')), b = BigInt(String(right).replace('.', ''));
                return a < b ? -1 : a > b ? 1 : 0;
            }
            if (type.name==='binary') {left=atob(left);right=atob(right);}
            if (type.name==='vector') {
                if (type.params?.sparse) {
                    let i=0,j=0;
                    while (i<left.entries.length || j<right.entries.length) {
                        const index=Math.min(left.entries[i]?.index ?? Infinity,right.entries[j]?.index ?? Infinity);
                        const a=left.entries[i]?.index===index ? left.entries[i++].value : 0;
                        const b=right.entries[j]?.index===index ? right.entries[j++].value : 0;
                        if(a!==b)return a<b ? -1 : 1;
                    }
                    return 0;
                }
                for(let i=0;i<left.length;i++)if(left[i]!==right[i])return left[i]<right[i] ? -1 : 1;
                return 0;
            }
            if (type.name==='json') {left=data.serialize(left);right=data.serialize(right);}
            if (typeof left === 'boolean') return Number(left) - Number(right);
            const a = Array.from(String(left), c => c.codePointAt(0) ?? 0), b = Array.from(String(right), c => c.codePointAt(0) ?? 0);
            for (let i = 0; i < Math.min(a.length,b.length); i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
            return a.length - b.length;
        };
        /**
         * @param {object} deps
         * @param {TeqFw_Dem_Entity} deps.entity
         * @param {Array<TeqFw_Dem_Record>} deps.records
         * @param {unknown} deps.selection
         * @returns {TeqFw_Dem_ListResult}
         */
        this.exec = function ({entity,records,selection: input}) {
            if (!Array.isArray(records)) throw errors.create({code:'INVALID_INPUT',message:'records must be an array.'});
            const query = selection.create({entity,selection:input});
            /**
             * @param {string} name
             * @param {any} left
             * @param {any} right
             * @returns {number}
             */
            const cmp = function (name,left,right) {
                return compare(/** @type {TeqFw_Dem_Attribute} */(entity.attributes.find(a => a.name === name)),left,right);
            };
            /**
             * @param {any} node
             * @param {TeqFw_Dem_Record} row
             * @returns {boolean}
             */
            const matches = function (node,row) {
                const op = node.operator, args = node.args;
                if (op === 'and') return args.every((/** @type {any} */ n) => matches(n,row));
                if (op === 'or') return args.some((/** @type {any} */ n) => matches(n,row));
                if (op === 'not') return !matches(args[0],row);
                const left = row[args[0].name];
                if (op === 'isNull') return left === null;
                if (op === 'isNotNull') return left !== null;
                const right = args[1].value;
                if (left === null || right === null) return false;
                const n = cmp(args[0].name,left,right);
                const results = /** @type {Record<string,boolean>} */({eq:n === 0,ne:n !== 0,lt:n < 0,lte:n <= 0,gt:n > 0,gte:n >= 0});
                return results[op];
            };
            const rows = Array.from(records, record => normalize.record({entity,record,mode:'complete'})).filter(row => !query.where || matches(query.where,row));
            rows.sort((a,b) => {
                for (const order of query.orderBy) {
                    const left = a[order.attribute], right = b[order.attribute];
                    if (left === null || right === null) {
                        if (left !== right) return (left === null ? -1 : 1) * (order.nulls === 'first' ? 1 : -1);
                    } else {
                        const n = cmp(order.attribute,left,right);
                        if (n) return n * (order.direction === 'asc' ? 1 : -1);
                    }
                }
                return 0;
            });
            return {records:rows.slice(query.offset,query.limit === null ? undefined : query.offset + query.limit)};
        };
    }
}
export const __deps__ = Object.freeze({default:Object.freeze({data:'TeqFw_Dem_Util_Data$',errors:'TeqFw_Dem_Repository_Error$',normalize:'TeqFw_Dem_Repository_Normalize$',selection:'TeqFw_Dem_Dto_Query_Selection__Factory$'})});
