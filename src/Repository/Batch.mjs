// @ts-check
/**
 * @namespace TeqFw_Dem_Repository_Batch
 * @description Validate declarative batches and plan logical operations over private adapter snapshots.
 */
export default class Batch {
    /**
     * @param {object} deps
     * @param {TeqFw_Dem_Repository_Normalize} deps.normalize
     * @param {TeqFw_Dem_Repository_Select} deps.select
     * @param {TeqFw_Dem_Dto_Query_Selection__Factory} deps.selection
     * @param {TeqFw_Dem_Repository_Error} deps.errors
     * @param {TeqFw_Dem_Util_Data} deps.data
     */
    constructor({normalize,select,selection,errors,data}) {
        /** @param {string} code @param {string} message @returns {TeqFw_Dem_Never} */
        const fail=function (code,message) {throw errors.create({code:/** @type {TeqFw_Dem_RepositoryErrorCode} */(code),message});};
        /** @param {any} value @param {Array<string>} fields @returns {void} */
        const shape=function (value,fields) {
            if (!data.isObject(value) || Object.keys(value).length!==fields.length || fields.some(k=>!Object.hasOwn(value,k))) fail('INVALID_INPUT','Invalid batch command shape.');
        };
        /**
         * @param {object} deps
         * @param {TeqFw_Dem_Model} deps.model
         * @param {unknown} deps.operations
         * @param {any} [deps.normalize] @param {any} [deps.selection]
         * @returns {Array<TeqFw_Dem_BatchOperation>}
         */
        this.validate=function ({model,operations,normalize:boundNormalize=normalize,selection:boundSelection=selection}) {
            if (!Array.isArray(operations) || !operations.length) return fail('INVALID_INPUT','A batch requires a nonempty operations array.');
            return Array.from(operations,operation=>{
                shape(operation,['path','method','params']);
                const {path,method,params}=operation;
                if (typeof path!=='string' || !/^\/[a-z0-9_]+(?:\/[a-z0-9_]+)*$/.test(path)) return fail('INVALID_INPUT','Expected a canonical entity path.');
                const entity=model.entities[path];
                if (!entity) return fail('NOT_FOUND','Entity not found.');
                if (!['create','read','update','delete','list'].includes(method)) return fail('INVALID_INPUT','Unknown batch method.');
                let prepared;
                if (method==='create') {shape(params,['record']);prepared={record:boundNormalize.record({entity,record:params.record,mode:'create'})};}
                else if (method==='update') {shape(params,['key','changes']);prepared={key:boundNormalize.key({entity,key:params.key}),changes:boundNormalize.record({entity,record:params.changes,mode:'update'})};}
                else if (method==='list') {shape(params,['selection']);prepared={selection:boundSelection.create({entity,selection:params.selection})};}
                else {shape(params,['key']);prepared={key:boundNormalize.key({entity,key:params.key})};}
                return /** @type {TeqFw_Dem_BatchOperation} */({path,method,params:prepared});
            });
        };
        /** @param {TeqFw_Dem_Entity} entity @param {string} name @param {any} left @param {any} right @param {Record<string,any>} activeHandlers @returns {boolean} */
        const equal=function (entity,name,left,right,activeHandlers) {
            if (left === null || right === null) return left === right;
            const attribute=entity.attributes.find((/** @type {any} */ item)=>item.name===name);
            if (!attribute) fail('INVALID_INPUT','Invalid tuple attribute.');
            const handler=activeHandlers[attribute.type.name];
            if (handler) return handler.equals(left,right,attribute.type.params ?? {});
            return data.serialize(left)===data.serialize(right);
        };
        /** @param {TeqFw_Dem_Entity} entity @param {any} left @param {any} right @param {Array<string>} members @param {Record<string,any>} activeHandlers @returns {boolean} */
        const tupleEqual=function (entity,left,right,members,activeHandlers) {return members.every(name=>equal(entity,name,left[name],right[name],activeHandlers));};
        /**
         * Plan in adapter-owned mutable snapshots. Discard the entire snapshot if this throws.
         * Generation/allocation algorithms and all durable effects remain adapter-owned.
         * @param {object} deps
         * @param {TeqFw_Dem_Model} deps.model
         * @param {unknown} deps.operations
         * @param {any} deps.rows
         * @param {any} deps.generate
         * @param {any} [deps.created]
         * @param {boolean} [deps.enforceRelations]
         * @param {Record<string,any>} [deps.handlers]
         * @param {any} [deps.normalize] @param {any} [deps.selection] @param {any} [deps.select]
         * @returns {TeqFw_Dem_BatchResult}
         */
        this.plan=function ({model,operations,rows,generate,created,enforceRelations=true,handlers:activeHandlers={},normalize:boundNormalize=normalize,selection:boundSelection=selection,select:boundSelect=select}) {
            const commands=this.validate({model,operations,normalize:boundNormalize,selection:boundSelection});
            /** @param {string} path @returns {void} */
            const validate=function (path) {
                const entity=model.entities[path];
                for (const members of [entity.primaryKey,...Object.values(entity.uniqueKeys)].filter(Boolean)) {
                    const keys=/** @type {Array<string>} */(members),seen=/** @type {Array<any>} */([]);
                    for (const {record} of rows[path]) {
                        if (keys.some(k=>record[k]===null)) continue;
                        if (seen.some((/** @type {any} */ previous)=>tupleEqual(entity,previous,record,keys,activeHandlers))) fail('CONFLICT','Logical key must be unique.');
                        seen.push(record);
                    }
                }
                if (enforceRelations) for (const [p,entity] of Object.entries(model.entities)) for (const relation of Object.values(entity.relations)) {
                    for (const {record} of rows[p]) {
                        if (relation.attributes.some(k=>record[k]===null)) continue;
                        if (!rows[relation.target.path].some((/** @type {any} */ target)=>relation.attributes.every((/** @type {string} */ sourceName,/** @type {number} */ index)=>equal(entity,sourceName,record[sourceName],target.record[relation.target.attributes[index]],activeHandlers)))) fail('RELATION','Relation target is missing or still referenced.');
                    }
                }
            };
            const results=commands.map(({path,method,params})=>{
                const entity=model.entities[path];
                /** @param {any} value @returns {TeqFw_Dem_Record} */
                const complete=function (value) {return boundNormalize.record({entity,record:value,mode:'complete'});};
                if (method==='list') return boundSelect.exec({entity,records:rows[path].map((/** @type {any} */ row)=>row.record),selection:params.selection});
                if (method==='create') {
                    const value={...params.record};
                    for (const a of entity.attributes) if (!Object.hasOwn(value,a.name) && a.generation)
                        Object.defineProperty(value,a.name,{value:generate({path,attribute:a,rows:rows[path]}),enumerable:true,writable:true,configurable:true});
                    const record=complete(value);rows[path].push({key:undefined,record});validate(path);
                    if (created) created({path,entity,record:complete(record)});
                    return {record:complete(record)};
                }
                const members=Object.keys(params.key.values);
                const i=rows[path].findIndex((/** @type {any} */ row)=>tupleEqual(entity,row.record,params.key.values,members,activeHandlers));
                if (method==='read') return {record:i<0 ? null : complete(rows[path][i].record)};
                if (method==='delete') {if (i<0) return {deleted:false};rows[path].splice(i,1);validate(path);return {deleted:true};}
                if (i<0) return {record:null};
                const record=complete({...rows[path][i].record,...params.changes});
                rows[path][i]={...rows[path][i],record};validate(path);return {record:complete(record)};
            });
            return {results};
        };
    }
}
export const __deps__=Object.freeze({default:Object.freeze({normalize:'TeqFw_Dem_Repository_Normalize$',select:'TeqFw_Dem_Repository_Select$',selection:'TeqFw_Dem_Dto_Query_Selection__Factory$',errors:'TeqFw_Dem_Repository_Error$',data:'TeqFw_Dem_Util_Data$'})});
