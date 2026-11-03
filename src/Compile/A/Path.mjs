// @ts-check
/**
 * @namespace TeqFw_Dem_Compile_A_Path
 * @description Logical path normalization independent of the OS filesystem.
 */
export default class Path {
    /** Initialize component behavior. */
    constructor() {
        /**
         * @param {string} namespace
         * @returns {string}
         */
        this.namespace = function (namespace) {
            if (typeof namespace !== 'string' || !namespace.startsWith('/') || !namespace.endsWith('/') || namespace === '/')
                throw new TypeError('Invalid canonical namespace.');
            const segments = namespace.slice(1, -1).split('/');
            if (segments.some(segment => !/^[a-z][a-z0-9]*$/.test(segment)))
                throw new TypeError('Invalid canonical namespace.');
            return namespace;
        };
        /**
         * @param {string} namespace
         * @param {string} key
         * @returns {string}
         */
        this.declaration = function (namespace, key) {
            this.namespace(namespace);
            if (typeof key !== 'string' || !key || key.startsWith('/'))
                throw new TypeError('Invalid relative declaration path.');
            const withoutTrailingSlash = key.endsWith('/') ? key.slice(0, -1) : key;
            const segments = withoutTrailingSlash.split('/');
            if (segments.some(segment => !/^[a-z][a-z0-9]*$/.test(segment)))
                throw new TypeError('Invalid relative declaration path.');
            return namespace + key;
        };
        /**
         * @param {string} address
         * @returns {string}
         */
        this.canonicalAddress = function (address) {
            if (typeof address !== 'string' || !address.startsWith('/'))
                throw new TypeError('Invalid canonical logical address.');
            if (address === '/')
                return address;
            const body = address.endsWith('/') ? address.slice(1, -1) : address.slice(1);
            const segments = body.split('/');
            if (segments.some(segment => !/^[a-z][a-z0-9]*$/.test(segment)))
                throw new TypeError('Invalid canonical logical address.');
            return address;
        };
        /**
         * @param {string} target
         * @param {string} base
         * @param {string} namespace
         * @returns {string}
         */
        this.reference = function (target, base, namespace) {
            this.namespace(namespace);
            if (typeof target !== 'string' || !target || /[^a-z0-9_./]/.test(target) || target.includes('//'))
                throw new TypeError('Invalid local reference path.');
            const absolute = target.startsWith('/');
            const segments = target.split('/').filter((_, index, values) => !(absolute && index === 0));
            if (segments.some(segment => {
                if (segment === '.' || segment === '..')
                    return absolute;
                return !/^[a-z][a-z0-9]*$/.test(segment);
            }))
                throw new TypeError('Invalid local reference path.');
            const resolved = this.normalize(target, base);
            const namespaceSegments = namespace.slice(1, -1).split('/');
            const targetSegments = resolved.slice(1).split('/').filter(Boolean);
            if (namespaceSegments.some((segment, index) => targetSegments[index] !== segment))
                throw new TypeError('Local reference escapes its source namespace.');
            return resolved;
        };
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
