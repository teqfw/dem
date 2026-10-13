// @ts-check
/**
 * @namespace TeqFw_Dem_Compile
 * @description Side-effect-free orchestration of logical DEM compilation.
 */
export default class Compile {
    /**
     * @param {object} deps
     * @param {TeqFw_Dem_Compile_A_Decode} deps.decode
     * @param {TeqFw_Dem_Compile_A_Compose} deps.compose
     * @param {TeqFw_Dem_Compile_A_Resolve} deps.resolve
     * @param {TeqFw_Dem_Compile_A_Validate} deps.validate
     * @param {TeqFw_Dem_Compile_A_Graph} deps.graph
     * @param {TeqFw_Dem_Compile_A_Canonical} deps.canonical
     * @param {TeqFw_Dem_Compile_A_Fingerprint} deps.fingerprint
     * @param {TeqFw_Dem_Util_Data} deps.data
     * @param {TeqFw_Dem_Dto_Compile_Diagnostic} deps.diagnostic
     */
    constructor({ decode, compose, resolve, validate, graph, canonical, fingerprint, data, diagnostic }) {
        const successful = new WeakSet();
        /**
         * @param {object} deps
         * @param {unknown} deps.value
         * @returns {TeqFw_Dem_CompilationResult}
         */
        this.assertResult = function ({ value }) {
            if (!value || typeof value !== 'object' || !successful.has(value))
                throw new TypeError('A result from this compiler is required.');
            return /** @type {TeqFw_Dem_CompilationResult} */ (value);
        };
        /**
         * @param {object} input
         * @param {ReadonlyArray<TeqFw_Dem_Envelope>} input.schemas
         * @param {TeqFw_Dem_Envelope} [input.map]
         * @returns {Promise<TeqFw_Dem_CompilationResult>}
         */
        this.exec = async function (input) {
            const work = decode.exec(input);
            /** @returns {void} */
            const check = function () {
                if (work.diagnostics.length)
                    throw diagnostic.error(work.diagnostics);
            };
            check();
            compose.exec(work);
            check();
            resolve.exec(work);
            check();
            const model = validate.exec(work);
            check();
            const logical = canonical.exec(model);
            /** @type {TeqFw_Dem_CompilationResult} */
            const result = data.freeze(JSON.parse(data.serialize({ model, canonical: logical, fingerprint: fingerprint.exec({ value: logical }), provenance: work.provenance, graph: graph.exec(model), warnings: [] })));
            successful.add(result);
            return result;
        };
    }
}
export const __deps__ = Object.freeze({ default: Object.freeze({ decode: 'TeqFw_Dem_Compile_A_Decode$', compose: 'TeqFw_Dem_Compile_A_Compose$', resolve: 'TeqFw_Dem_Compile_A_Resolve$', validate: 'TeqFw_Dem_Compile_A_Validate$', graph: 'TeqFw_Dem_Compile_A_Graph$', canonical: 'TeqFw_Dem_Compile_A_Canonical$', fingerprint: 'TeqFw_Dem_Compile_A_Fingerprint$', data: 'TeqFw_Dem_Util_Data$', diagnostic: 'TeqFw_Dem_Dto_Compile_Diagnostic$' }) });
