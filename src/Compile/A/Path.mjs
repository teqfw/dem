// @ts-check
/**
 * @namespace TeqFw_Dem_Compile_A_Path
 * @description Logical path normalization independent of the OS filesystem.
 */
export default class Path {
    /** Initialize component behavior. */
    constructor() {
        /**
         * @param {string} path
         * @param {string} [base]
         * @returns {string}
         */
        this.normalize = function (path, base = '/') {
            if (typeof path !== 'string' || !path || /[^a-z0-9_./]/.test(path))
                throw new TypeError('Invalid logical path.');
            const parts = path.startsWith('/') ? [] : base.split('/').filter(Boolean);
            for (const segment of path.split('/')) {
                if (!segment || segment === '.')
                    continue;
                if (segment === '..') {
                    if (!parts.length)
                        throw new TypeError('Traversal above root.');
                    parts.pop();
                }
                else
                    parts.push(segment);
            }
            return '/' + parts.join('/') + (parts.length && (path.endsWith('/') || /(?:^|\/)\.\.?$/.test(path)) ? '/' : '');
        };
        /**
         * @param {string} entity
         * @returns {Array<string>}
         */
        this.parents = function (entity) {
            const segments = entity.split('/').filter(Boolean);
            if (!entity.endsWith('/'))
                segments.pop();
            return ['/', ...segments.map((_, i) => '/' + segments.slice(0, i + 1).join('/') + '/')];
        };
    }
}
