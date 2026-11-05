// @ts-check
/**
 * @namespace TeqFw_Dem_Repository_Runtime
 * @description Bind shared repository operations to one Effective DEM and its selected runtime handlers.
 */
export default class Runtime {
    /**
     * @param {object} deps
     * @param {TeqFw_Dem_Repository_Normalize} deps.normalize
     * @param {TeqFw_Dem_Dto_Query_Selection__Factory} deps.selection
     * @param {TeqFw_Dem_Repository_Select} deps.select
     * @param {TeqFw_Dem_Repository_Error} deps.errors
     * @param {TeqFw_Dem_Repository_Batch} deps.batch
     */
    constructor({normalize, selection, select, errors, batch}) {
        /**
         * @param {object} deps
         * @param {TeqFw_Dem_Model} deps.model
         * @param {TeqFw_Dem_Registry} deps.registry
         * @param {any} [deps.handlers]
         * @returns {object}
         */
        this.bind = function ({model, registry, handlers = []}) {
            registry.assertFinalized();
            const selected = new Map();
            if (Array.isArray(handlers)) {
                for (const handler of handlers) if (handler && typeof handler.name === 'string') selected.set(handler.name, handler);
            } else if (handlers && typeof handlers === 'object') {
                for (const [name, handler] of Object.entries(handlers)) selected.set(name, handler);
            }
            /** @type {Record<string,any>} */ const definitions = {};
            /** @type {Record<string,any>} */ const runtime = {};
            const used = new Set();
            for (const entity of Object.values(model.entities ?? {}))
                for (const attribute of entity.attributes ?? [])
                    if (attribute.type.name.includes('.')) used.add(attribute.type.name);
            for (const name of used) {
                const definition = registry.get(name);
                const handler = selected.get(name);
                if (!definition || !handler || typeof handler.normalize !== 'function' || typeof handler.copy !== 'function')
                    throw errors.create({code:'UNSUPPORTED', message:'Missing runtime handler for logical type: ' + name});
                if (Boolean(definition.equality) !== (typeof handler.equals === 'function')
                    || Boolean(definition.ordering) !== (typeof handler.compare === 'function')
                    || Boolean(definition.literal) !== (typeof handler.fromLiteral === 'function'))
                    throw errors.create({code:'UNSUPPORTED', message:'Incompatible runtime handler for logical type: ' + name});
                definitions[name] = definition;
                runtime[name] = handler;
            }
            const boundNormalize = {
                value: (/** @type {any} */ input) => normalize.value({...input, handlers:runtime}),
                record: (/** @type {any} */ input) => normalize.record({...input, handlers:runtime, definitions}),
                key: (/** @type {any} */ input) => normalize.key({...input, handlers:runtime}),
            };
            const boundSelection = {
                create: (/** @type {any} */ input) => selection.create({...input, handlers:runtime, definitions}),
            };
            const boundSelect = {
                exec: (/** @type {any} */ input) => select.exec({...input, handlers:runtime, definitions}),
            };
            const boundBatch = Object.freeze({
                validate: (/** @type {{operations:unknown}} */ {operations}) => batch.validate({model,operations,normalize:boundNormalize,selection:boundSelection}),
                plan: (/** @type {{operations:unknown,rows:any,generate:any,created?:any,enforceRelations?:boolean}} */ {operations,rows,generate,created,enforceRelations}) => batch.plan({model,operations,rows,generate,created,enforceRelations,handlers:runtime,normalize:boundNormalize,selection:boundSelection,select:boundSelect}),
            });
            return Object.freeze({model, normalize:boundNormalize, selection:boundSelection, select:boundSelect, batch:boundBatch});
        };
    }
}
export const __deps__ = Object.freeze({default:Object.freeze({normalize:'TeqFw_Dem_Repository_Normalize$',selection:'TeqFw_Dem_Dto_Query_Selection__Factory$',select:'TeqFw_Dem_Repository_Select$',errors:'TeqFw_Dem_Repository_Error$',batch:'TeqFw_Dem_Repository_Batch$'})});
