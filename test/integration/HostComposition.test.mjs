// @ts-check
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {container} from '../TestEnv.mjs';

/** @type {TeqFw_Dem_Acquire} */ const acquire = await container.get('TeqFw_Dem_Acquire$');
/** @type {TeqFw_Dem_Compile} */ const compiler = await container.get('TeqFw_Dem_Compile$');

/** @param {string} root @param {string} filename @param {any} content */
async function write(root, filename, content) {
    const path = join(root, filename);
    await mkdir(dirname(path), {recursive: true});
    await writeFile(path, typeof content === 'string' ? content : JSON.stringify(content));
}

/** @param {(hostRoot: string) => Promise<void>} run */
async function withHostFixture(run) {
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

const select = (/** @type {string} */ entityPath) => ({packageName: '@example/catalog', entityPath});

test('a Node Host acquires one package and composes independent server and browser models', () => withHostFixture(async hostRoot => {
    const acquired = await acquire.exec({hostRoot});
    assert.equal(acquired.schemas.length, 1);
    assert.equal(acquired.schemas[0].packageName, '@example/catalog');
    assert.equal(acquired.schemas[0].filename, 'etc/dem-schema.json');
    const declaration = /** @type {Record<string, unknown>} */ (acquired.schemas[0].document);
    assert.equal(Object.keys(declaration).filter(key => key.startsWith('/')).length, 4);
    assert.equal(acquired.map, undefined);

    // These model labels and compilation inputs belong to this Host.
    // The server result is intended for relational storage; the browser result is intended for IndexedDB.
    const serverSelection = [
        select('/vnd/catalog/customer'),
        select('/vnd/catalog/ledger_event'),
        select('/vnd/catalog/order'),
    ];
    const browserSelection = [
        select('/vnd/catalog/cart'),
        select('/vnd/catalog/customer'),
    ];
    const serverMap = {
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
    const browserMap = {
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
    const originalInputs = structuredClone({
        schemas: acquired.schemas,
        serverSelection,
        browserSelection,
        serverMap,
        browserMap,
    });

    const incompleteServerSelection = [select('/vnd/catalog/order')];
    await assert.rejects(
        () => compiler.exec({schemas: acquired.schemas, selection: incompleteServerSelection}),
        (/** @type {any} */ error) => {
            assert.equal(error.name, 'DemCompilationError');
            assert.equal('model' in error, false);
            assert.ok(error.diagnostics.some((/** @type {any} */ diagnostic) =>
                diagnostic.code === 'DEM_TARGET' &&
                diagnostic.pointer === '/~1vnd~1catalog~1order/relations/customer'));
            return true;
        },
    );

    const browserModel = await compiler.exec({
        schemas: acquired.schemas,
        selection: browserSelection,
        map: browserMap,
    });
    const serverModel = await compiler.exec({
        schemas: acquired.schemas,
        selection: serverSelection,
        map: serverMap,
    });

    assert.deepEqual(Object.keys(serverModel.model.entities), [
        '/models/server/customer',
        '/models/server/ledger_event',
        '/models/server/order',
    ]);
    assert.deepEqual(Object.keys(browserModel.model.entities), [
        '/models/browser/cart',
        '/models/browser/customer',
    ]);
    assert.ok(!Object.hasOwn(serverModel.model.entities, '/models/server/cart'));
    assert.ok(!Object.hasOwn(browserModel.model.entities, '/models/browser/order'));
    assert.ok(!Object.hasOwn(browserModel.model.entities, '/models/browser/ledger_event'));

    const serverOrder = serverModel.model.entities['/models/server/order'];
    const browserCart = browserModel.model.entities['/models/browser/cart'];
    assert.deepEqual(serverOrder.relations.customer.target, {
        path: '/models/server/customer',
        attributes: ['id'],
    });
    assert.deepEqual(browserCart.relations.customer.target, {
        path: '/models/browser/customer',
        attributes: ['id'],
    });
    assert.deepEqual(serverModel.model.entities['/models/server/customer'].attributes[0].type.profile, {
        type: 'int',
        capacity: 'large',
    });
    assert.deepEqual(serverOrder.attributes[1].type.profile, {type: 'int', capacity: 'large'});
    assert.deepEqual(browserModel.model.entities['/models/browser/customer'].attributes[0].type.profile, {type: 'uuid'});
    assert.deepEqual(browserCart.attributes[1].type.profile, {type: 'uuid'});

    assert.notEqual(serverModel.fingerprint, browserModel.fingerprint);
    assert.deepEqual(serverModel.provenance.map, {packageName: 'host-app', filename: 'host-config/server-map.json'});
    assert.deepEqual(browserModel.provenance.map, {packageName: 'host-app', filename: 'host-config/browser-map.json'});
    assert.deepEqual(serverModel.provenance.entities, {
        '/models/server/customer': {
            packageName: '@example/catalog',
            filename: 'etc/dem-schema.json',
            originalPath: '/vnd/catalog/customer',
        },
        '/models/server/ledger_event': {
            packageName: '@example/catalog',
            filename: 'etc/dem-schema.json',
            originalPath: '/vnd/catalog/ledger_event',
        },
        '/models/server/order': {
            packageName: '@example/catalog',
            filename: 'etc/dem-schema.json',
            originalPath: '/vnd/catalog/order',
        },
    });
    assert.deepEqual(browserModel.provenance.entities, {
        '/models/browser/cart': {
            packageName: '@example/catalog',
            filename: 'etc/dem-schema.json',
            originalPath: '/vnd/catalog/cart',
        },
        '/models/browser/customer': {
            packageName: '@example/catalog',
            filename: 'etc/dem-schema.json',
            originalPath: '/vnd/catalog/customer',
        },
    });
    assert.deepEqual(serverModel.provenance.pathMappings.map(item => [item.originalPath, item.effectivePath]), [
        ['/vnd/catalog/customer', '/models/server/customer'],
        ['/vnd/catalog/ledger_event', '/models/server/ledger_event'],
        ['/vnd/catalog/order', '/models/server/order'],
    ]);
    assert.deepEqual(browserModel.provenance.pathMappings.map(item => [item.originalPath, item.effectivePath]), [
        ['/vnd/catalog/cart', '/models/browser/cart'],
        ['/vnd/catalog/customer', '/models/browser/customer'],
    ]);
    assert.deepEqual(serverModel.provenance.bindings, []);
    assert.deepEqual(browserModel.provenance.bindings, []);
    assert.deepEqual(serverModel.graph.edges, [{from: '/models/server/order', to: '/models/server/customer'}]);
    assert.deepEqual(browserModel.graph.edges, [{from: '/models/browser/cart', to: '/models/browser/customer'}]);

    assert.deepEqual({
        schemas: acquired.schemas,
        serverSelection,
        browserSelection,
        serverMap,
        browserMap,
    }, originalInputs);
}));
