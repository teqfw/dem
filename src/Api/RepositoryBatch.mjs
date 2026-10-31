// @ts-check
/**
 * @namespace TeqFw_Dem_Api_RepositoryBatch
 * @description Optional atomic batch boundary over repositories in one physical backend.
 * @interface
 */
export default class RepositoryBatch {
    /**
     * @param {object} deps
     * @param {TeqFw_Dem_Repository_Error} deps.errors
     */
    constructor({errors}) {
        /**
         * @param {object} deps
         * @param {Array<TeqFw_Dem_BatchOperation>} deps.operations
         * @returns {Promise<TeqFw_Dem_BatchResult>}
         */
        this.execute = async function ({operations}) {
            throw errors.create({code:'UNSUPPORTED',message:'No atomic batch implementation selected.'});
        };
    }
}
export const __deps__=Object.freeze({default:Object.freeze({errors:'TeqFw_Dem_Repository_Error$'})});
