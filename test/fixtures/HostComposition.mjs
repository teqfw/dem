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
