// @ts-check
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import {test} from 'node:test';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import Container from '@teqfw/di';
import NamespaceRegistry from '@teqfw/di/node/registry/namespace';
import knex from 'knex';
import {browserMap, browserSelection, serverMap, serverSelection, withHostFixture} from '../fixtures/HostComposition.mjs';

/** @typedef {{error?: string, model?: unknown, fingerprint?: string, contentType?: string, paths?: string[], relationPath?: string, identityProfiles?: unknown, normalizedRecord?: Record<string, string>, unselectedStatus?: number, browser?: string, entityStores?: string[], crud?: unknown, databaseName?: string, backendClosed?: boolean, databaseDeleted?: boolean, cleanupErrors?: string[]}} BrowserReport */

test('Node Host keeps SQLite active while delivering its selected browser model to Chromium', {timeout: 60000}, () => withHostFixture(async hostRoot => {
    const root = fileURLToPath(new URL('../../', import.meta.url));
    const sqliteRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'dem-delivery-sqlite-'));
    /** @type {string | undefined} */ let profileRoot;
    /** @type {import('knex').Knex | undefined} */ let database;
    /** @type {any} */ let server;
    /** @type {any} */ let backend;
    /** @type {any} */ let provider;
    /** @type {import('node:child_process').ChildProcess | undefined} */
    let chrome;
    let started = false;
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let timeout;
    /** @type {string[]} */ const cleanupErrors = [];
    let backendClosed = false;
    let providerClosed = false;
    let databaseDestroyed = false;
    let sqliteDeleted = false;
    let serverStopped = false;
    let chromeTerminated = false;
    let profileDeleted = false;
    /** @param {string} label @param {() => Promise<void>} action */
    const cleanup = async (label, action) => {
        try {
            await action();
        } catch (error) {
            cleanupErrors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
    try {
        const container = new Container({preprocessors: ['Host_Sqlite__Preprocessor$']});
        const namespaceRegistry = new NamespaceRegistry({fs, path, appRoot: root});
        for (const {prefix, dirAbs, ext} of await namespaceRegistry.build()) {
            container.addNamespaceRoot(prefix, dirAbs, ext);
        }

        // DEM-RDB is a development dependency for this scenario; the Host owns its namespace and config.
        const rdbRoot = path.join(root, 'node_modules/@teqfw/dem-rdb');
        const rdbPackage = JSON.parse(await fs.readFile(path.join(rdbRoot, 'package.json'), 'utf8'));
        for (const item of rdbPackage.teqfw.fw.di.namespaces) {
            container.addNamespaceRoot(item.prefix, path.resolve(rdbRoot, item.path), item.ext ?? '.mjs');
        }
        container.addNamespaceRoot('Host_', path.join(root, 'test/fixtures'), '.mjs');

        // Web is a development dependency for this scenario, so register its package namespace explicitly.
        const webRoot = path.join(root, 'node_modules/@teqfw/web');
        const webPackage = JSON.parse(await fs.readFile(path.join(webRoot, 'package.json'), 'utf8'));
        for (const item of webPackage.teqfw.fw.di.namespaces) {
            container.addNamespaceRoot(item.prefix, path.resolve(webRoot, item.path), item.ext ?? '.mjs');
        }
        container.enableTestMode();
        container.register('TeqFw_Cli_Adapter_Signal$', {subscribe: () => () => {}});

        const configLoader = await container.get('TeqFw_Cfg_Loader$');
        const configSource = await container.get('TeqFw_Cfg_Source_Object$');
        await configLoader.load([configSource.create({})]);
        const runtimeFactory = await container.get('TeqFw_Web_Back_Config_Runtime__Factory$');
        runtimeFactory.configure({host: '127.0.0.1', port: 0, type: 'http', shutdownTimeout: 1000});
        runtimeFactory.freeze();

        /** @type {TeqFw_Dem_Acquire} */
        const acquire = await container.get('TeqFw_Dem_Acquire$');
        let acquisitionCalls = 0;
        const acquireDeclarations = async () => {
            acquisitionCalls += 1;
            return await acquire.exec({hostRoot});
        };
        const acquired = await acquireDeclarations();
        assert.equal(acquisitionCalls, 1);
        assert.equal(acquired.schemas.length, 1);
        assert.equal(acquired.schemas[0].packageName, '@example/catalog');
        const declaration = /** @type {Record<string, unknown>} */ (acquired.schemas[0].document);
        assert.equal(declaration.$format, 2);
        assert.equal(declaration.$namespace, '/vnd/catalog/');
        assert.ok(Object.hasOwn(declaration, 'customer'));
        /** @type {TeqFw_Dem_Compile} */
        const compiler = await container.get('TeqFw_Dem_Compile$');
        let compilationCalls = 0;
        const compile = async (/** @type {Parameters<TeqFw_Dem_Compile['exec']>[0]} */ options) => {
            compilationCalls += 1;
            return await compiler.exec(options);
        };
        const serverModel = await compile({schemas: acquired.schemas, selection: serverSelection, map: serverMap});
        const browserModel = await compile({schemas: acquired.schemas, selection: browserSelection, map: browserMap});
        assert.equal(compilationCalls, 2);

        profileRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'dem-delivery-chrome-'));
        database = knex({
            client: 'sqlite3',
            connection: {filename: path.join(sqliteRoot, 'host.sqlite')},
            useNullAsDefault: true,
            pool: {min: 1, max: 1},
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
        assert.deepEqual(serverModel.model.entities['/models/server/order'].relations.customer.target, {
            path: '/models/server/customer',
            attributes: ['id'],
        });
        assert.deepEqual(browserModel.model.entities['/models/browser/cart'].relations.customer.target, {
            path: '/models/browser/customer',
            attributes: ['id'],
        });
        for (const entity of Object.values(serverModel.model.entities)) {
            assert.deepEqual(entity.attributes[0].type.profile, {type: 'int', capacity: 'large'});
        }
        assert.deepEqual(serverModel.model.entities['/models/server/order'].attributes[1].type.profile, {
            type: 'int',
            capacity: 'large',
        });
        assert.deepEqual(browserModel.model.entities['/models/browser/customer'].attributes[0].type.profile, {type: 'uuid'});
        assert.deepEqual(serverModel.provenance.entities['/models/server/customer'], browserModel.provenance.entities['/models/browser/customer']);
        assert.notEqual(serverModel.fingerprint, browserModel.fingerprint);

        /** @param {string} entityPath */
        const sqliteTable = entityPath => 'dem_' + Buffer.from(entityPath, 'utf8').toString('hex');
        const configuration = await container.get('Host_Sqlite__Configuration$');
        configuration.set({model: serverModel.model, knex: database});
        const adapter = await container.get('TeqFw_DemRdb_Adapter$');
        backend = await adapter.open({model: serverModel.model, knex: database});
        await backend.createSchema();

        const tables = await database('sqlite_master').select('name').where({type: 'table'}).orderBy('name');
        assert.deepEqual(tables.map(row => row.name), [
            '/models/server/customer',
            '/models/server/ledgerevent',
            '/models/server/order',
        ].map(sqliteTable).sort());
        assert.equal(tables.some(row => row.name === sqliteTable('/models/server/cart')), false);

        provider = await container.get('TeqFw_Dem_Api_RepositoryProvider$');
        const customers = await provider.get({path: '/models/server/customer'});
        const orders = await provider.get({path: '/models/server/order'});
        const serverCustomer = {id: 101, name: 'Server Ada'};
        const serverOrder = {id: 201, customer_id: 101};
        assert.deepEqual(await customers.create({record: serverCustomer}), {record: {id: '101', name: 'Server Ada'}});
        assert.deepEqual(await orders.create({record: serverOrder}), {record: {id: '201', customer_id: '101'}});
        const serverCustomerBeforeBrowser = await customers.read({key: {kind: 'primary', values: {id: 101}}});
        const serverOrderBeforeBrowser = await orders.read({key: {kind: 'primary', values: {id: 201}}});
        assert.deepEqual(serverCustomerBeforeBrowser, {record: {id: '101', name: 'Server Ada'}});
        assert.deepEqual(serverOrderBeforeBrowser, {record: {id: '201', customer_id: '101'}});

        /** @type {(report: BrowserReport) => void} */
        let receiveReport;
        const browserReport = new Promise(resolve => { receiveReport = resolve; });
        const dtoInfoFactory = await container.get('TeqFw_Web_Back_Dto_Info__Factory$');
        const stage = await container.get('TeqFw_Web_Back_Enum_Stage$');
        const pipeline = await container.get('TeqFw_Web_Back_PipelineEngine$');
        const deliveryInfo = dtoInfoFactory.create({name: 'Demo_ModelDelivery', stage: stage.PROCESS});
        pipeline.addHandler({
            getRegistrationInfo: () => deliveryInfo,
            handle: async (/** @type {TeqFw_Web_Back_Dto_RequestContext} */ context) => {
                const request = /** @type {import('node:http').IncomingMessage} */ (context.request);
                const response = /** @type {import('node:http').ServerResponse} */ (context.response);
                const url = new URL(request.url ?? '/', 'http://127.0.0.1');
                if (request.method === 'GET' && url.pathname === '/demo/model/browser') {
                    response.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
                    response.end(JSON.stringify({model: browserModel.model, fingerprint: browserModel.fingerprint}));
                    context.completed = true;
                    return;
                }
                if (request.method === 'POST' && url.pathname === '/demo/result') {
                    let body = '';
                    for await (const chunk of request) body += chunk.toString();
                    const report = /** @type {BrowserReport} */ (JSON.parse(body));
                    response.writeHead(204);
                    response.end();
                    receiveReport(report);
                    context.completed = true;
                }
            },
        });

        const staticHandler = await container.get('TeqFw_Web_Back_Handler_Static$');
        const sourceFactory = await container.get('TeqFw_Web_Back_Dto_Source__Factory$');
        await staticHandler.init({sources: [sourceFactory.create({
            root,
            prefix: '/',
            allow: {'.': [
                'test/browser/Delivery.html',
                'src',
                'node_modules/@teqfw/di/dist/esm.js',
                'node_modules/@teqfw/dem-idb/src',
            ]},
        })]});
        pipeline.addHandler(staticHandler);

        server = await container.get('TeqFw_Web_Back_Server$');
        await server.start();
        started = true;
        const address = /** @type {import('node:net').AddressInfo|null} */ (server.getInstance().address());
        if (!address || typeof address === 'string') throw new Error('TeqFW Web server has no TCP address.');
        const baseUrl = `http://127.0.0.1:${address.port}`;

        const directResponse = await fetch(`${baseUrl}/demo/model/browser`);
        assert.equal(directResponse.status, 200);
        assert.equal(directResponse.headers.get('content-type'), 'application/json; charset=utf-8');
        const directDelivery = await directResponse.json();
        assert.deepEqual(directDelivery.model, JSON.parse(JSON.stringify(browserModel.model)));
        assert.equal(directDelivery.fingerprint, browserModel.fingerprint);
        const unpublishedResponse = await fetch(`${baseUrl}/demo/model/server`);
        assert.equal(unpublishedResponse.status, 404);

        const browser = spawn(process.env.CHROME_PATH ?? process.env.CHROMIUM_PATH ?? 'google-chrome', [
            '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
            '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profileRoot}`,
            `${baseUrl}/test/browser/Delivery.html`,
        ], {stdio: ['ignore', 'ignore', 'pipe']});
        let stderr = '';
        chrome = browser;
        browser.stderr?.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-16000); });
        const report = /** @type {BrowserReport} */ (await Promise.race([
            browserReport,
            new Promise((_, reject) => {
                timeout = setTimeout(() => reject(new Error(`Browser delivery timed out.\nChrome stderr:\n${stderr}`)), 30000);
                browser.once('error', reject);
                browser.once('exit', (code, signal) => reject(new Error(`Browser exited before reporting: ${code ?? signal}.\nChrome stderr:\n${stderr}`)));
            }),
        ]));

        assert.equal(report.error, undefined, report.error);
        assert.deepEqual(report.model, JSON.parse(JSON.stringify(browserModel.model)));
        assert.equal(report.fingerprint, browserModel.fingerprint);
        assert.equal(report.contentType, 'application/json; charset=utf-8');
        assert.deepEqual(report.paths, ['/models/browser/cart', '/models/browser/customer']);
        assert.equal(report.relationPath, '/models/browser/customer');
        assert.deepEqual(report.identityProfiles, {
            cart: {type: 'uuid'},
            customer: {type: 'uuid'},
            reference: {type: 'uuid'},
        });
        assert.deepEqual(report.normalizedRecord, {
            id: 'abcdef12-3456-7890-abcd-ef1234567890',
            customer_id: '12345678-1234-5678-9abc-def012345678',
        });
        assert.equal(report.unselectedStatus, 404);
        assert.match(report.browser ?? '', /Chrome\//);
        assert.deepEqual(report.entityStores, [
            '/models/browser/cart',
            '/models/browser/customer',
        ]);
        assert.deepEqual(report.crud, {
            relationErrorCode: 'RELATION',
            customerCreated: {id: '12345678-1234-5678-9abc-def012345678', name: 'Ada'},
            cartCreated: {id: 'abcdef12-3456-7890-abcd-ef1234567890', customer_id: '12345678-1234-5678-9abc-def012345678'},
            customerRead: {id: '12345678-1234-5678-9abc-def012345678', name: 'Ada'},
            cartRead: {id: 'abcdef12-3456-7890-abcd-ef1234567890', customer_id: '12345678-1234-5678-9abc-def012345678'},
            customerUpdated: {id: '12345678-1234-5678-9abc-def012345678', name: 'Ada Lovelace'},
            customerAfterUpdate: {id: '12345678-1234-5678-9abc-def012345678', name: 'Ada Lovelace'},
            cartList: {records: [{id: 'abcdef12-3456-7890-abcd-ef1234567890', customer_id: '12345678-1234-5678-9abc-def012345678'}]},
            cartDeleted: {deleted: true},
            customerDeleted: {deleted: true},
            cartAfterDelete: {record: null},
            customerAfterDelete: {record: null},
            cartListAfterDelete: {records: []},
            customerListAfterDelete: {records: []},
        });
        assert.match(report.databaseName ?? '', /^dem-delivery-/);
        assert.equal(report.backendClosed, true);
        assert.equal(report.databaseDeleted, true);
        assert.deepEqual(report.cleanupErrors, []);

        // The host-side provider must remain usable after the browser finishes its independent CRUD.
        assert.deepEqual(await customers.read({key: {kind: 'primary', values: {id: 101}}}), serverCustomerBeforeBrowser);
        assert.deepEqual(await orders.read({key: {kind: 'primary', values: {id: 201}}}), serverOrderBeforeBrowser);
        assert.deepEqual(await orders.list({selection: {}}), {records: [{id: '201', customer_id: '101'}]});
    } finally {
        clearTimeout(timeout);
        if (chrome) {
            const child = chrome;
            await cleanup('Chrome termination', async () => {
                if (child.exitCode === null && child.signalCode === null && child.pid !== undefined) {
                    await new Promise(resolve => {
                        const killTimer = setTimeout(() => child.kill('SIGKILL'), 5000);
                        child.once('close', () => {
                            clearTimeout(killTimer);
                            resolve(undefined);
                        });
                        child.kill('SIGTERM');
                    });
                }
                chromeTerminated = child.exitCode !== null || child.signalCode !== null || child.pid === undefined;
                if (!chromeTerminated) throw new Error('Chrome process is still running.');
            });
        }
        if (provider) await cleanup('DEM-RDB provider close', async () => {
            await provider.close();
            providerClosed = true;
        });
        if (backend) await cleanup('DEM-RDB backend close', async () => {
            await backend.close();
            backendClosed = true;
        });
        const db = database;
        if (db) await cleanup('Knex destroy', async () => {
            await db.destroy();
            databaseDestroyed = true;
        });
        if (started) await cleanup('TeqFW Web stop', async () => {
            await server.stop();
            serverStopped = true;
        });
        const profile = profileRoot;
        if (profile) await cleanup('Chrome profile removal', async () => {
            await fs.rm(profile, {recursive: true, force: true, maxRetries: 5, retryDelay: 100});
            profileDeleted = !(await fs.stat(profile).then(() => true, () => false));
        });
        await cleanup('SQLite directory removal', async () => {
            await fs.rm(sqliteRoot, {recursive: true, force: true, maxRetries: 5, retryDelay: 100});
            sqliteDeleted = !(await fs.stat(sqliteRoot).then(() => true, () => false));
        });
    }
    assert.equal(providerClosed, true);
    assert.equal(backendClosed, true);
    assert.equal(databaseDestroyed, true);
    assert.equal(sqliteDeleted, true);
    assert.equal(serverStopped, true);
    assert.equal(chromeTerminated, true);
    assert.equal(profileDeleted, true);
    assert.deepEqual(cleanupErrors, []);
}));
