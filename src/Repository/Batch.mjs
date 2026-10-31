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
         * @returns {Array<TeqFw_Dem_BatchOperation>}
         */
        this.validate=function ({model,operations}) {
            if (!Array.isArray(operations) || !operations.length) return fail('INVALID_INPUT','A batch requires a nonempty operations array.');
            return Array.from(operations,operation=>{
                shape(operation,['path','method','params']);
                const {path,method,params}=operation;
                if (typeof path!=='string' || !/^\/[a-z0-9_]+(?:\/[a-z0-9_]+)*$/.test(path)) return fail('INVALID_INPUT','Expected a canonical entity path.');
                const entity=model.entities[path];
                if (!entity) return fail('NOT_FOUND','Entity not found.');
                if (!['create','read','update','delete','list'].includes(method)) return fail('INVALID_INPUT','Unknown batch method.');
                let prepared;
                if (method==='create') {shape(params,['record']);prepared={record:normalize.record({entity,record:params.record,mode:'create'})};}
                else if (method==='update') {shape(params,['key','changes']);prepared={key:normalize.key({entity,key:params.key}),changes:normalize.record({entity,record:params.changes,mode:'update'})};}
                else if (method==='list') {shape(params,['selection']);prepared={selection:selection.create({entity,selection:params.selection})};}
                else {shape(params,['key']);prepared={key:normalize.key({entity,key:params.key})};}
                return /** @type {TeqFw_Dem_BatchOperation} */({path,method,params:prepared});
            });
        };
        /** @param {any} row @param {Array<string>} members @returns {string} */
        const tuple=function (row,members) {return data.serialize(members.map(k=>row[k]));};
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
         * @returns {TeqFw_Dem_BatchResult}
         */
        this.plan=function ({model,operations,rows,generate,created,enforceRelations=true}) {
            const commands=this.validate({model,operations});
            /** @param {string} path @returns {void} */
            const validate=function (path) {
                const entity=model.entities[path];
                for (const members of [entity.primaryKey,...Object.values(entity.uniqueKeys)].filter(Boolean)) {
                    const keys=/** @type {Array<string>} */(members),seen=new Set();
                    for (const {record} of rows[path]) {
                        if (keys.some(k=>record[k]===null)) continue;
                        const key=tuple(record,keys);
                        if (seen.has(key)) fail('CONFLICT','Logical key must be unique.');
                        seen.add(key);
                    }
                }
                if (enforceRelations) for (const [p,entity] of Object.entries(model.entities)) for (const relation of Object.values(entity.relations)) {
                    for (const {record} of rows[p]) {
                        if (relation.attributes.some(k=>record[k]===null)) continue;
                        if (!rows[relation.target.path].some((/** @type {any} */ target)=>tuple(target.record,relation.target.attributes)===tuple(record,relation.attributes))) fail('RELATION','Relation target is missing or still referenced.');
                    }
                }
            };
            const results=commands.map(({path,method,params})=>{
                const entity=model.entities[path];
                /** @param {any} value @returns {TeqFw_Dem_Record} */
                const complete=function (value) {return normalize.record({entity,record:value,mode:'complete'});};
                if (method==='list') return select.exec({entity,records:rows[path].map((/** @type {any} */ row)=>row.record),selection:params.selection});
                if (method==='create') {
                    const value={...params.record};
                    for (const a of entity.attributes) if (!Object.hasOwn(value,a.name) && a.generation)
                        Object.defineProperty(value,a.name,{value:generate({path,attribute:a,rows:rows[path]}),enumerable:true,writable:true,configurable:true});
                    const record=complete(value);rows[path].push({key:undefined,record});validate(path);
                    if (created) created({path,entity,record});
                    return {record:complete(record)};
                }
                const i=rows[path].findIndex((/** @type {any} */ row)=>Object.keys(params.key.values).every(k=>data.serialize(row.record[k])===data.serialize(params.key.values[k])));
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
