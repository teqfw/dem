// @ts-check
/**
 * @namespace TeqFw_Dem_Acquire
 * @description Node-only declaration acquisition using the package registry used by TeqFW CLI.
 */
export default class Acquire {
    /**
     * @param {object} deps
     * @param {typeof import('@teqfw/di/node/registry/package').default} deps.packageRegistry
     * @param {typeof import('node:fs/promises')} deps.fs
     * @param {typeof import('node:path')} deps.path
     * @param {TeqFw_Dem_Util_Data} deps.data
     * @param {TeqFw_Dem_Dto_Compile_Diagnostic} deps.diagnostic
     */
    constructor({ packageRegistry, fs, path, data, diagnostic }) {
        /**
         * @param {object} input
         * @param {string} input.hostRoot
         * @param {Array<string>} [input.packageNames]
         * @returns {Promise<TeqFw_Dem_AcquisitionResult>}
         */
        this.exec = async function (input) {
            /** @type {Array<TeqFw_Dem_Diagnostic>} */ const errors = [];
            /**
             * @param {string} code
             * @param {TeqFw_Dem_SourceNullable} source
             * @param {string} pointer
             * @param {Record<string,any>} [details]
             * @returns {number}
             */
            const fail = function (/** @type {string} */ code, /** @type {TeqFw_Dem_SourceNullable} */ source, /** @type {string} */ pointer, /** @type {Record<string,any>} */ details = {}) {
                return errors.push(diagnostic.create(code, source, pointer, details));
            };
            /** @returns {void} */
            const check = function () {
                if (errors.length)
                    throw diagnostic.error(errors, 'DemAcquisitionError');
            };
            if (!data.isObject(input) || Object.keys(input).some(k => !['hostRoot', 'packageNames'].includes(k)) || typeof input.hostRoot !== 'string' || !path.isAbsolute(input.hostRoot) || Object.hasOwn(input, 'packageNames') && (!Array.isArray(input.packageNames) || input.packageNames.some(n => typeof n !== 'string' || !n) || new Set(input.packageNames).size !== input.packageNames.length)) {
                fail('DEM_CONFIG', null, '');
                check();
            }
            const hostRoot = path.resolve(input.hostRoot);
            let records;
            try {
                records = await new packageRegistry({ fs, path, appRoot: hostRoot }).build();
            }
            catch (error) {
                fail('DEM_DISCOVERY', null, '', { error: String(error) });
                check();
                return { schemas: [] };
            }
            const names = new Set();
            for (const record of records) {
                const name = record.packageJson.name;
                if (typeof name !== 'string' || names.has(name))
                    fail('DEM_DISCOVERY', null, '', { packageName: name ?? '' });
                names.add(name);
            }
            for (const name of input.packageNames ?? [])
                if (!names.has(name))
                    fail('DEM_DISCOVERY', null, '', { packageName: name });
            const host = records.find(r => path.resolve(r.rootAbs) === hostRoot);
            if (!host)
                fail('DEM_DISCOVERY', null, '', { hostRoot });
            check();
            /** @type {{schemas:TeqFw_Dem_Envelope[],map?:TeqFw_Dem_Envelope}} */ const result = { schemas: [] };
            for (const record of [...records].sort((a, b) => String(a.packageJson.name) < String(b.packageJson.name) ? -1 : 1)) {
                const name = String(record.packageJson.name), selected = !input.packageNames || input.packageNames.includes(name), isHost = record === host;
                if (!selected && !isHost)
                    continue;
                const source = { packageName: name, filename: 'package.json' }, parent = record.packageJson.teqfw;
                if (parent !== undefined && !data.isObject(parent)) {
                    fail('DEM_CONFIG', source, '/teqfw');
                    continue;
                }
                const config = /** @type {any} */ (parent)?.dem;
                if (config !== undefined && (!data.isObject(config) || Object.keys(config).some(k => !['schema', 'map'].includes(k)) || Object.values(config).some(v => typeof v !== 'string' || !v))) {
                    fail('DEM_CONFIG', source, '/teqfw/dem');
                    continue;
                }
                for (const kind of ['schema', 'map']) {
                    if (kind === 'schema' && !selected || kind === 'map' && !isHost)
                        continue;
                    const explicit = Object.hasOwn(config ?? {}, kind), raw = explicit ? config[kind] : `etc/dem-${kind}.json`;
                    const filename = path.posix.normalize(raw);
                    if (raw.startsWith('/') || /[\\\0]/.test(raw) || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) || filename === '.' || filename === '..' || filename.startsWith('../') || filename.endsWith('/')) {
                        fail('DEM_CONFIG', source, '/teqfw/dem/' + kind, { path: raw });
                        continue;
                    }
                    const declarationSource = { packageName: name, filename };
                    let content;
                    try {
                        content = await fs.readFile(path.join(record.rootAbs, filename), 'utf8');
                    }
                    catch (error) {
                        if (!explicit && /** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT')
                            continue;
                        fail('DEM_FILE', declarationSource, '', { error: String(error) });
                        continue;
                    }
                    try {
                        const envelope = { ...declarationSource, document: data.parse(content) };
                        if (kind === 'schema')
                            result.schemas.push(envelope);
                        else
                            result.map = envelope;
                    }
                    catch (error) {
                        fail('DEM_JSON', declarationSource, '', { error: String(error) });
                    }
                }
            }
            check();
            return result;
        };
    }
}
export const __deps__ = Object.freeze({ default: Object.freeze({ packageRegistry: 'npm:@teqfw/di/node/registry/package__default', fs: 'node:fs/promises', path: 'node:path', data: 'TeqFw_Dem_Util_Data$', diagnostic: 'TeqFw_Dem_Dto_Compile_Diagnostic$' }) });
