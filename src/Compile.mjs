// @ts-check

/**
 * @namespace TeqFw_Dem_Compile
 * @description Side-effect-free orchestration for versioned DEM compilation.
 */

export default class Compile {
    /**
     * @param {object} deps
     * @param {TeqFw_Dem_Compile_A_DecodeV2} deps.decodeV2
     * @param {TeqFw_Dem_Compile_A_Compose} deps.compose
     * @param {TeqFw_Dem_Compile_A_MapRefs} deps.mapRefs
     * @param {TeqFw_Dem_Compile_A_Validate} deps.validate
     * @param {TeqFw_Dem_Compile_A_ValidateNames} deps.validateNames
     * @param {TeqFw_Dem_Compile_A_Graph} deps.graph
     * @param {TeqFw_Dem_Compile_A_Fingerprint} deps.fingerprint
     * @param {TeqFw_Dem_Dto_Compile_Diagnostic__Factory} deps.diagnostic
     */
    constructor({decodeV2, compose, mapRefs, validate, validateNames, graph, fingerprint, diagnostic}) {
        const successful = new WeakSet();

        /**
         * @param {TeqFw_Dem_DiagnosticArray} diagnostics
         * @param {TeqFw_Dem_DiagnosticArray} warnings
         * @returns {TeqFw_Dem_Error}
         */
        const createError = function (diagnostics, warnings) {
            const error = new Error(`DEM compilation failed with ${diagnostics.length} error(s).`);
            error.name = 'DemCompilationError';
            Object.defineProperties(error, {
                diagnostics: {enumerable: true, value: Object.freeze([...diagnostics])},
                warnings: {enumerable: true, value: Object.freeze([...warnings])},
            });
            return Object.freeze(error);
        };

        /**
         * Reject values that were not produced successfully by this compiler instance.
         * @param {object} deps
         * @param {unknown} deps.value
         * @returns {TeqFw_Dem_CompilationResult}
         */
        this.assertResult = function ({value}) {
            if (!value || typeof value !== 'object' || !successful.has(value)) {
                throw new TypeError('A successful DEM compilation result is required.');
            }
            return /** @type {TeqFw_Dem_CompilationResult} */ (value);
        };

        /**
         * @param {object} deps
         * @param {TeqFw_Dem_InputEnvelopeArray} deps.fragments
         * @param {TeqFw_Dem_InputEnvelope} deps.mapEnvelope
         * @returns {Promise<TeqFw_Dem_CompilationResult>}
         * @throws {TeqFw_Dem_Error}
         */
        this.exec = async function ({fragments, mapEnvelope}) {
            const input = Array.isArray(fragments) ? fragments : [];
            const sorted = input.map((item) => ({
                declaration: item?.declaration,
                filename: item?.filename,
                fragmentId: item?.fragmentId,
                packageName: item?.packageName,
                revision: fingerprint.exec({value: item?.declaration ?? null}),
            })).sort((a, b) => {
                const fragment = String(a.fragmentId ?? '').localeCompare(String(b.fragmentId ?? ''));
                return fragment || String(a.filename ?? '').localeCompare(String(b.filename ?? ''));
            });
            const trustedMap = mapEnvelope && typeof mapEnvelope === 'object' ? {
                ...mapEnvelope,
                revision: fingerprint.exec({value: mapEnvelope.declaration ?? null}),
            } : mapEnvelope;
            const nameDiagnostics = validateNames.exec({fragments: sorted, mapEnvelope: trustedMap});
            const decoded = sorted.map((envelope) => decodeV2.exec({envelope}));
            const composed = compose.exec({decoded});
            const mapped = mapRefs.exec({composed, mapEnvelope: trustedMap});
            const validated = validate.exec({mapped});
            /** @type {TeqFw_Dem_ValidatedDem & {graph: TeqFw_Dem_Graph}} */
            const analyzed = graph.exec({validated});
            /** @type {TeqFw_Dem_DiagnosticArray} */
            const allDiagnostics = [...nameDiagnostics, ...analyzed.diagnostics];
            const ordered = diagnostic.sort(allDiagnostics);
            const errors = ordered.filter((item) => item.severity === 'error');
            const warnings = diagnostic.sort(ordered.filter((item) => item.severity === 'warning'));
            if (errors.length > 0) throw createError(errors, warnings);
            /** @param {unknown} value */
            const freeze = function (value) {
                if (!value || typeof value !== 'object' || Object.isFrozen(value)) return;
                for (const item of Object.values(value)) freeze(item);
                Object.freeze(value);
            };
            const fingerprintValue = fingerprint.exec({value: analyzed.model});
            const effective = {fingerprint: fingerprintValue, model: analyzed.model, provenance: analyzed.provenance};
            const result = {
                effective, fingerprint: fingerprintValue, graph: analyzed.graph,
                model: analyzed.model, provenance: analyzed.provenance,
                requirements: [...new Set(analyzed.model.requires ?? [])].sort(), warnings,
            };
            freeze(result);
            successful.add(result);
            return result;
        };
    }
}

export const __deps__ = Object.freeze({
    default: Object.freeze({
        decodeV2: 'TeqFw_Dem_Compile_A_DecodeV2$',
        compose: 'TeqFw_Dem_Compile_A_Compose$',
        mapRefs: 'TeqFw_Dem_Compile_A_MapRefs$',
        validate: 'TeqFw_Dem_Compile_A_Validate$',
        validateNames: 'TeqFw_Dem_Compile_A_ValidateNames$',
        graph: 'TeqFw_Dem_Compile_A_Graph$',
        fingerprint: 'TeqFw_Dem_Compile_A_Fingerprint$',
        diagnostic: 'TeqFw_Dem_Dto_Compile_Diagnostic__Factory$',
    }),
});
