// @ts-check
import {mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';

/** @param {string} root @param {string} filename @param {any} content */
async function write(root, filename, content) {
    const path = join(root, filename);
    await mkdir(dirname(path), {recursive: true});
    await writeFile(path, typeof content === 'string' ? content : JSON.stringify(content));
}

/** @param {(hostRoot: string) => Promise<void>} run */
export async function withHostFixture(run) {
    const hostRoot = await mkdtemp(join(tmpdir(), 'dem-host-composition-'));
    try {
        await write(hostRoot, 'package.json', {
            name: 'host-app',
            private: true,
            dependencies: {'@example/catalog': '1.0.0'},
        });
        await write(hostRoot, 'node_modules/@example/catalog/package.json', {
            name: '@example/catalog',
            version: '1.0.0',
            teqfw: {dem: {schema: 'etc/dem-schema.json'}},
        });
        await write(hostRoot, 'node_modules/@example/catalog/etc/dem-schema.json', {
            $format: 1,
            '/vnd/catalog/order': {
                attributes: [
                    {name: 'id', type: {name: 'identity'}},
                    {name: 'customer_id', type: {name: 'ref'}},
                ],
                relations: {
                    customer: {
                        attributes: ['customer_id'],
                        target: {path: 'customer', attributes: ['id']},
                    },
                },
            },
            '/vnd/catalog/cart': {
                attributes: [
                    {name: 'id', type: {name: 'identity'}},
                    {name: 'customer_id', type: {name: 'ref'}},
                ],
                relations: {
                    customer: {
                        attributes: ['customer_id'],
                        target: {path: 'customer', attributes: ['id']},
                    },
                },
            },
            '/vnd/catalog/customer': {
                attributes: [
                    {name: 'id', type: {name: 'identity'}},
                    {name: 'name', type: {name: 'text'}},
                ],
            },
            '/vnd/catalog/ledger_event': {
                attributes: [
                    {name: 'id', type: {name: 'identity'}},
                    {name: 'event', type: {name: 'text'}},
                ],
            },
        });
        await run(hostRoot);
    }
    finally {
        await rm(hostRoot, {recursive: true, force: true});
    }
}

/** @param {string} entityPath */
export const select = (entityPath) => ({packageName: '@example/catalog', entityPath});

export const serverSelection = [
    select('/vnd/catalog/customer'),
    select('/vnd/catalog/order'),
    select('/vnd/catalog/ledger_event'),
];

export const serverMap = {
    packageName: 'host-app',
    filename: 'host-config/server-map.json',
    document: {
        $format: 1,
        sources: {'@example/catalog': {rename: {'/vnd/catalog/': '/models/server/'}}},
        identityProfiles: {
            '/models/server/customer': {id: {type: 'int', capacity: 'large'}},
            '/models/server/ledger_event': {id: {type: 'int', capacity: 'large'}},
            '/models/server/order': {id: {type: 'int', capacity: 'large'}},
        },
    },
};

export const browserSelection = [
    select('/vnd/catalog/cart'),
    select('/vnd/catalog/customer'),
];

export const browserMap = {
    packageName: 'host-app',
    filename: 'host-config/browser-map.json',
    document: {
        $format: 1,
        sources: {'@example/catalog': {rename: {'/vnd/catalog/': '/models/browser/'}}},
        identityProfiles: {
            '/models/browser/cart': {id: {type: 'uuid'}},
            '/models/browser/customer': {id: {type: 'uuid'}},
        },
    },
};
