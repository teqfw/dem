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
import {select, withHostFixture} from '../fixtures/HostComposition.mjs';

/** @typedef {{error?: string, model?: unknown, fingerprint?: string, contentType?: string, paths?: string[], relationPath?: string, identityProfiles?: unknown, normalizedRecord?: Record<string, string>, unselectedStatus?: number, browser?: string, entityStores?: string[], crud?: unknown, databaseName?: string, backendClosed?: boolean, databaseDeleted?: boolean, cleanupErrors?: string[]}} BrowserReport */

test('Node Host delivers its selected browser model through TeqFW Web to Chromium', {timeout: 60000}, () => withHostFixture(async hostRoot => {
    const root = fileURLToPath(new URL('../../', import.meta.url));
    const profileRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'dem-delivery-chrome-'));
    const container = new Container();
    let server;
    /** @type {import('node:child_process').ChildProcess | undefined} */
    let chrome;
    let started = false;
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let timeout;
    try {
        const namespaceRegistry = new NamespaceRegistry({fs, path, appRoot: root});
        for (const {prefix, dirAbs, ext} of await namespaceRegistry.build()) {
            container.addNamespaceRoot(prefix, dirAbs, ext);
        }

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
        const acquired = await acquire.exec({hostRoot});
        assert.equal(acquired.schemas.length, 1);
        assert.equal(acquired.schemas[0].packageName, '@example/catalog');
        /** @type {TeqFw_Dem_Compile} */
        const compiler = await container.get('TeqFw_Dem_Compile$');
        const serverModel = await compiler.exec({
            schemas: acquired.schemas,
            selection: [
                select('/vnd/catalog/customer'),
                select('/vnd/catalog/ledger_event'),
                select('/vnd/catalog/order'),
            ],
            map: {
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
            },
        });
        const browserModel = await compiler.exec({
            schemas: acquired.schemas,
            selection: [select('/vnd/catalog/cart'), select('/vnd/catalog/customer')],
            map: {
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
            },
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
        assert.deepEqual(serverModel.model.entities['/models/server/order'].relations.customer.target, {
            path: '/models/server/customer',
            attributes: ['id'],
        });
        assert.deepEqual(browserModel.model.entities['/models/browser/cart'].relations.customer.target, {
            path: '/models/browser/customer',
            attributes: ['id'],
        });
        assert.deepEqual(serverModel.model.entities['/models/server/customer'].attributes[0].type.profile, {
            type: 'int',
            capacity: 'large',
        });
        assert.deepEqual(browserModel.model.entities['/models/browser/customer'].attributes[0].type.profile, {type: 'uuid'});
        assert.notEqual(serverModel.fingerprint, browserModel.fingerprint);

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
            'dem:/models/browser/cart',
            'dem:/models/browser/customer',
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
    } finally {
        clearTimeout(timeout);
        if (chrome) {
            const child = chrome;
            child.kill('SIGTERM');
            await new Promise(resolve => {
                if (child.exitCode !== null || child.signalCode !== null || child.pid === undefined) resolve(undefined);
                else child.once('close', () => resolve(undefined));
            });
        }
        if (started) await server.stop();
        await fs.rm(profileRoot, {recursive: true, force: true, maxRetries: 5, retryDelay: 100});
    }
}));
