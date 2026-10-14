// @ts-check
/**
 * @namespace TeqFw_Dem_Api_RepositoryProvider
 * @description DI substitution boundary for resolving repositories by effective entity path.
 * @interface
 */
export default class RepositoryProvider {
    /**
     * @param {object} deps
     * @param {TeqFw_Dem_Repository_Error} deps.errors
     */
    constructor({errors}) {
        /**
         * @param {object} deps
         * @param {string} deps.path
         * @returns {Promise<TeqFw_Dem_Api_Repository>}
         */
        this.get = async function ({path}) {
            throw errors.create({code: 'UNSUPPORTED', message: 'No repository provider implementation selected.'});
        };
    }
}
export const __deps__ = Object.freeze({default: Object.freeze({errors: 'TeqFw_Dem_Repository_Error$'})});
