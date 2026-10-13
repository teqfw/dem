// @ts-check
/**
 * @namespace TeqFw_Dem_Registry_Core
 * @description Logical value constraints without physical representations or generation algorithms.
 */
export default class Core {
    /**
     * @param {object} deps
     * @param {TeqFw_Dem_Util_Data} deps.data
     */
    constructor({ data }) {
        this.types = data.freeze({
            binary: { allowed: ['length'], defaults: {} }, boolean: { allowed: [], defaults: {} },
            date: { allowed: [], defaults: {} }, datetime: { allowed: ['precision', 'timezone'], defaults: { precision: 3, timezone: false } },
            decimal: { allowed: ['precision', 'scale', 'unsigned'], defaults: { unsigned: false } },
            enum: { allowed: ['values'], defaults: {} }, integer: { allowed: ['bits', 'unsigned'], defaults: { bits: 32, unsigned: false } },
            json: { allowed: [], defaults: {} }, string: { allowed: ['length'], defaults: {} }, text: { allowed: [], defaults: {} },
            uuid: { allowed: [], defaults: {} }, vector: { allowed: ['dimensions', 'element', 'sparse'], defaults: { sparse: false } },
            identity: { allowed: [], defaults: {} }, ref: { allowed: [], defaults: {} },
        });
    }
}
export const __deps__ = Object.freeze({ default: Object.freeze({ data: 'TeqFw_Dem_Util_Data$' }) });
