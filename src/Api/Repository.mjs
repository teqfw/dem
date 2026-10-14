// @ts-check
/**
 * @namespace TeqFw_Dem_Api_Repository
 * @description Portable single-entity access contract; host-selected backends supply behavior.
 * @interface
 */
export default class Repository {
    /**
     * @param {object} deps
     * @param {TeqFw_Dem_Repository_Error} deps.errors
     */
    constructor({errors}) {
        /**
         * @returns {TeqFw_Dem_Never}
         */
        const unsupported = function () {
            throw errors.create({code: 'UNSUPPORTED', message: 'No repository implementation selected.'});
        };
        /**
         * @param {object} deps
         * @param {TeqFw_Dem_Record} deps.record
         * @returns {Promise<TeqFw_Dem_RecordResult>}
         */
        this.create = async function ({record}) { return unsupported(); };
        /**
         * @param {object} deps
         * @param {TeqFw_Dem_Key} deps.key
         * @returns {Promise<TeqFw_Dem_RecordResultNullable>}
         */
        this.read = async function ({key}) { return unsupported(); };
        /**
         * @param {object} deps
         * @param {TeqFw_Dem_Key} deps.key
         * @param {TeqFw_Dem_Record} deps.changes
         * @returns {Promise<TeqFw_Dem_RecordResultNullable>}
         */
        this.update = async function ({key, changes}) { return unsupported(); };
        /**
         * @param {object} deps
         * @param {TeqFw_Dem_Key} deps.key
         * @returns {Promise<TeqFw_Dem_DeleteResult>}
         */
        this.delete = async function ({key}) { return unsupported(); };
        /**
         * @param {object} deps
         * @param {TeqFw_Dem_Selection} deps.selection
         * @returns {Promise<TeqFw_Dem_ListResult>}
         */
        this.list = async function ({selection}) { return unsupported(); };
    }
}
export const __deps__ = Object.freeze({default: Object.freeze({errors: 'TeqFw_Dem_Repository_Error$'})});
