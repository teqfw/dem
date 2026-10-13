// @ts-check
/**
 * @namespace TeqFw_Dem_Dto_Compile_Diagnostic
 * @description Deterministic source-linked errors without a usable partial model.
 */
export default class Diagnostic {
    /**
     * @param {object} deps
     * @param {TeqFw_Dem_Util_Data} deps.data
     */
    constructor({ data }) {
        /**
         * @param {string} code
         * @param {TeqFw_Dem_SourceNullable} source
         * @param {string} [pointer]
         * @param {Record<string,any>} [details]
         * @returns {TeqFw_Dem_Diagnostic}
         */
        this.create = function (code, source, pointer = '', details = {}) {
            return { code, severity: 'error', source, pointer, details };
        };
        /**
         * @param {Array<TeqFw_Dem_Diagnostic>} diagnostics
         * @returns {Array<TeqFw_Dem_Diagnostic>}
         */
        this.sort = function (diagnostics) {
            const fields = ['code', 'source', 'pointer', 'details'];
            /**
             * @param {TeqFw_Dem_Diagnostic} x
             * @returns {Array<string>}
             */
            const tuple = function (/** @type {TeqFw_Dem_Diagnostic} */ x) {
                return fields.map(k => k === 'source' ?
                    (x.source ? x.source.packageName + '\0' + x.source.filename : '') :
                    k === 'details' ? data.serialize(x.details) : String(x[ /** @type {'code'|'pointer'} */(k)]));
            };
            const unique = [...new Map(diagnostics.map(x => [data.serialize(x), x])).values()];
            return unique.sort((a, b) => {
                const left = tuple(a), right = tuple(b);
                for (let i = 0; i < left.length; i++)
                    if (left[i] !== right[i])
                        return left[i] < right[i] ? -1 : 1;
                return 0;
            });
        };
        /**
         * @param {Array<TeqFw_Dem_Diagnostic>} diagnostics
         * @param {string} [name]
         * @returns {TeqFw_Dem_CompilationError}
         */
        this.error = function (diagnostics, name = 'DemCompilationError') {
            const result = Object.assign(new Error(name), { name, diagnostics: this.sort(diagnostics), warnings: [] });
            return data.freeze(result);
        };
    }
}
export const __deps__ = Object.freeze({ default: Object.freeze({ data: 'TeqFw_Dem_Util_Data$' }) });
