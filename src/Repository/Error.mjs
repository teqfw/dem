// @ts-check
/**
 * @namespace TeqFw_Dem_Repository_Error
 * @description Stable portable operation errors without backend details.
 */
export default class RepositoryError {
    /**
     * Initialize error construction.
     */
    constructor() {
        /**
                 * @param {object} deps
         * @param {TeqFw_Dem_RepositoryErrorCode} deps.code
         * @param {string} deps.message
         * @returns {TeqFw_Dem_RepositoryError}
         */
        this.create = function ({code, message}) {
            return Object.assign(new Error(message), {name: 'DemRepositoryError', code});
        };
    }
}
