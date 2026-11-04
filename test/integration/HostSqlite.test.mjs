// @ts-check
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import Container from '@teqfw/di';
import knex from 'knex';
import {serverMap, serverSelection, withHostFixture} from '../fixtures/HostComposition.mjs';

const serverPaths = [
    '/models/server/customer',
    '/models/server/ledgerevent',
    '/models/server/order',
];

/** @param {string} path */
const sqliteTable = path => 'dem_' + Buffer.from(path, 'utf8').toString('hex');

test('a Node Host projects its compiled server model to SQLite and performs repository CRUD', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dem-host-sqlite-'));
    /** @type {import('knex').Knex | undefined} */ let db;
    /** @type {any} */ let backend;
    /** @type {any} */ let provider;
    try {
        const database = knex({
            client: 'sqlite3',
            connection: {filename: join(directory, 'host.sqlite')},
            useNullAsDefault: true,
            pool: {min: 1, max: 1},
        });
        db = database;

        await withHostFixture(async hostRoot => {
            const container = new Container({preprocessors: ['Host_Sqlite__Preprocessor$']});
            container.addNamespaceRoot('TeqFw_Dem_', fileURLToPath(new URL('../../src', import.meta.url)), '.mjs');
            container.addNamespaceRoot('TeqFw_DemRdb_', fileURLToPath(new URL('../../node_modules/@teqfw/dem-rdb/src', import.meta.url)), '.mjs');
            container.addNamespaceRoot('Host_', fileURLToPath(new URL('../fixtures', import.meta.url)), '.mjs');

            const acquire = await container.get('TeqFw_Dem_Acquire$');
            const acquired = await acquire.exec({hostRoot});
            assert.equal(acquired.schemas.length, 1);
            assert.equal(acquired.schemas[0].packageName, '@example/catalog');
            assert.equal(acquired.schemas[0].filename, 'etc/dem-schema.json');

            const registry = await container.get('TeqFw_Dem_Registry$');
            registry.finalize();
            const compiler = await container.get('TeqFw_Dem_Compile$');
            const compiled = await compiler.exec({schemas: acquired.schemas, selection: serverSelection, map: serverMap});
            const {model} = compiled;
            assert.deepEqual(Object.keys(model.entities), serverPaths);
            assert.equal(Object.hasOwn(model.entities, '/models/server/cart'), false);
            assert.deepEqual(model.entities['/models/server/order'].relations.customer.target, {
                path: '/models/server/customer',
                attributes: ['id'],
            });
            for (const path of serverPaths) {
                assert.deepEqual(model.entities[path].attributes[0].type.profile, {type: 'int', capacity: 'large'});
            }

            const configuration = await container.get('Host_Sqlite__Configuration$');
            configuration.set({model, knex: database});
            const adapter = await container.get('TeqFw_DemRdb_Adapter$');
            backend = await adapter.open({model, knex: database});
            await backend.createSchema();

            const tables = await database('sqlite_master').select('name').where({type: 'table'}).orderBy('name');
            assert.deepEqual(tables.map(row => row.name), serverPaths.map(sqliteTable).sort());

            const orderTable = sqliteTable('/models/server/order');
            const customerTable = sqliteTable('/models/server/customer');
            const relations = await database.raw(
                'SELECT "table", "from", "to" FROM pragma_foreign_key_list(?)',
                [orderTable],
            );
            assert.deepEqual(relations, [{table: customerTable, from: 'customer_id', to: 'id'}]);

            provider = await container.get('TeqFw_Dem_Api_RepositoryProvider$');
            const customers = await provider.get({path: '/models/server/customer'});
            const orders = await provider.get({path: '/models/server/order'});
            const ledger = await provider.get({path: '/models/server/ledgerevent'});

            const customer = {id: 101, name: 'Ada'};
            const order = {id: 201, customer_id: 101};
            const event = {id: 301, event: 'customer-created'};
            assert.deepEqual(await customers.create({record: customer}), {record: {id: '101', name: 'Ada'}});
            assert.deepEqual(await orders.create({record: order}), {record: {id: '201', customer_id: '101'}});
            assert.deepEqual(await ledger.create({record: event}), {record: {id: '301', event: 'customer-created'}});

            const customerKey = {kind: 'primary', values: {id: 101}};
            const orderKey = {kind: 'primary', values: {id: 201}};
            const eventKey = {kind: 'primary', values: {id: 301}};
            assert.deepEqual(await customers.read({key: customerKey}), {record: {id: '101', name: 'Ada'}});
            assert.deepEqual(await orders.read({key: orderKey}), {record: {id: '201', customer_id: '101'}});
            assert.deepEqual(await ledger.read({key: eventKey}), {record: {id: '301', event: 'customer-created'}});

            assert.deepEqual(
                await customers.update({key: customerKey, changes: {name: 'Ada Lovelace'}}),
                {record: {id: '101', name: 'Ada Lovelace'}},
            );
            assert.deepEqual(await customers.read({key: customerKey}), {record: {id: '101', name: 'Ada Lovelace'}});
            assert.deepEqual(await orders.list({selection: {}}), {records: [{id: '201', customer_id: '101'}]});

            await assert.rejects(
                () => orders.create({record: {id: 202, customer_id: 999}}),
                {name: 'DemRepositoryError', code: 'RELATION'},
            );

            assert.deepEqual(await orders.delete({key: orderKey}), {deleted: true});
            assert.deepEqual(await ledger.delete({key: eventKey}), {deleted: true});
            assert.deepEqual(await customers.delete({key: customerKey}), {deleted: true});
            assert.deepEqual(await orders.read({key: orderKey}), {record: null});
            assert.deepEqual(await orders.list({selection: {}}), {records: []});
            assert.deepEqual(await ledger.read({key: eventKey}), {record: null});
            assert.deepEqual(await ledger.list({selection: {}}), {records: []});
            assert.deepEqual(await customers.read({key: customerKey}), {record: null});
        });
    }
    finally {
        try { try { await provider?.close(); } finally { await backend?.close(); } }
        finally { try { await db?.destroy(); } finally { await rm(directory, {recursive: true, force: true}); } }
    }
});
