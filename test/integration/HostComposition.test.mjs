// @ts-check
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {container} from '../TestEnv.mjs';
import {browserMap, browserSelection, select, serverMap, serverSelection, withHostFixture} from '../fixtures/HostComposition.mjs';

/** @type {TeqFw_Dem_Acquire} */ const acquire = await container.get('TeqFw_Dem_Acquire$');
/** @type {TeqFw_Dem_Compile} */ const compiler = await container.get('TeqFw_Dem_Compile$');

test('a Node Host acquires one package and composes independent server and browser models', () => withHostFixture(async hostRoot => {
    const acquired = await acquire.exec({hostRoot});
    assert.equal(acquired.schemas.length, 1);
    assert.equal(acquired.schemas[0].packageName, '@example/catalog');
    assert.equal(acquired.schemas[0].filename, 'etc/dem-schema.json');
    const declaration = /** @type {Record<string, unknown>} */ (acquired.schemas[0].document);
    assert.equal(Object.keys(declaration).filter(key => !key.startsWith('$')).length, 4);
    assert.equal(acquired.map, undefined);

    // These model labels and compilation inputs belong to this Host.
    // The server result is intended for relational storage; the browser result is intended for IndexedDB.
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
                diagnostic.pointer === '/order/relations/customer'));
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
        '/models/server/ledgerevent',
        '/models/server/order',
    ]);
    assert.deepEqual(Object.keys(browserModel.model.entities), [
        '/models/browser/cart',
        '/models/browser/customer',
    ]);
    assert.ok(!Object.hasOwn(serverModel.model.entities, '/models/server/cart'));
    assert.ok(!Object.hasOwn(browserModel.model.entities, '/models/browser/order'));
    assert.ok(!Object.hasOwn(browserModel.model.entities, '/models/browser/ledgerevent'));

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
            namespace: '/vnd/catalog/',
            originalPath: '/vnd/catalog/customer',
        },
        '/models/server/ledgerevent': {
            packageName: '@example/catalog',
            filename: 'etc/dem-schema.json',
            namespace: '/vnd/catalog/',
            originalPath: '/vnd/catalog/ledgerevent',
        },
        '/models/server/order': {
            packageName: '@example/catalog',
            filename: 'etc/dem-schema.json',
            namespace: '/vnd/catalog/',
            originalPath: '/vnd/catalog/order',
        },
    });
    assert.deepEqual(browserModel.provenance.entities, {
        '/models/browser/cart': {
            packageName: '@example/catalog',
            filename: 'etc/dem-schema.json',
            namespace: '/vnd/catalog/',
            originalPath: '/vnd/catalog/cart',
        },
        '/models/browser/customer': {
            packageName: '@example/catalog',
            filename: 'etc/dem-schema.json',
            namespace: '/vnd/catalog/',
            originalPath: '/vnd/catalog/customer',
        },
    });
    assert.deepEqual(serverModel.provenance.pathMappings, [
        {packageName: '@example/catalog', namespace: '/vnd/catalog/', originalPath: '/vnd/catalog/customer', effectivePath: '/models/server/customer', rule: {from: '/vnd/catalog/', to: '/models/server/'}},
        {packageName: '@example/catalog', namespace: '/vnd/catalog/', originalPath: '/vnd/catalog/ledgerevent', effectivePath: '/models/server/ledgerevent', rule: {from: '/vnd/catalog/', to: '/models/server/'}},
        {packageName: '@example/catalog', namespace: '/vnd/catalog/', originalPath: '/vnd/catalog/order', effectivePath: '/models/server/order', rule: {from: '/vnd/catalog/', to: '/models/server/'}},
    ]);
    assert.deepEqual(browserModel.provenance.pathMappings, [
        {packageName: '@example/catalog', namespace: '/vnd/catalog/', originalPath: '/vnd/catalog/cart', effectivePath: '/models/browser/cart', rule: {from: '/vnd/catalog/', to: '/models/browser/'}},
        {packageName: '@example/catalog', namespace: '/vnd/catalog/', originalPath: '/vnd/catalog/customer', effectivePath: '/models/browser/customer', rule: {from: '/vnd/catalog/', to: '/models/browser/'}},
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
