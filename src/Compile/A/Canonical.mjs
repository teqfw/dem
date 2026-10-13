// @ts-check
/**
 * @namespace TeqFw_Dem_Compile_A_Canonical
 * @description Canonical logical content without projection order or assembly evidence.
 */
export default class Canonical {
    /** Initialize component behavior. */
    constructor() {
        /**
         * @param {TeqFw_Dem_Model} model
         * @returns {TeqFw_Dem_Canonical}
         */
        this.exec = function (model) {
            return { domain: 'dem-logical-1', entities: Object.fromEntries(Object.entries(model.entities).map(([path, entity]) => [path, {
                        ...entity, attributes: Object.fromEntries(entity.attributes.map(({ name, ...attr }) => [name, attr])),
                    }])) };
        };
    }
}
