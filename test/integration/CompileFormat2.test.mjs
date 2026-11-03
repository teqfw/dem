// @ts-check
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {container} from '../TestEnv.mjs';

/** @type {TeqFw_Dem_Compile} */ const compiler = await container.get('TeqFw_Dem_Compile$');
const envelope = (/** @type {any} */ document, packageName = 'p', filename = 'etc/dem-schema.json') => ({packageName, filename, document});
const mapEnvelope = (/** @type {any} */ document) => envelope(document, 'host', 'etc/dem-map.json');
const identity = (name = 'id') => ({name, type: {name: 'identity'}});

/** @param {any} input @param {string} code @param {string} [pointer] */
async function rejects(input, code, pointer) {
    /** @type {any} */ let captured;
    await assert.rejects(() => compiler.exec(input), (/** @type {any} */ error) => {
        captured = error;
        assert.equal(error.name, 'DemCompilationError');
        assert.equal('model' in error, false);
        assert.ok(error.diagnostics.some((/** @type {any} */ item) => item.code === code && (pointer === undefined || item.pointer === pointer)));
        return true;
    });
    return captured;
}

test('Format 2 relative declarations compile to original absolute paths', async () => {
    const document = {
        $format: 2,
        $namespace: '/pde/office/core/',
        'desk/': {},
        'desk/attachment': {attributes: [identity('desk_id'), {name: 'public_jwk', type: {name: 'text'}}]},
    };
    const input = {schemas: [envelope(document)]};
    const snapshot = structuredClone(input);
    const result = await compiler.exec(input);

    assert.deepEqual(Object.keys(result.model.entities), ['/pde/office/core/desk/attachment']);
    assert.ok(result.model.packages.includes('/pde/office/core/desk/'));
    assert.deepEqual(result.model.entities['/pde/office/core/desk/attachment'].attributes.map(attribute => attribute.name), ['desk_id', 'public_jwk']);
    assert.equal(result.provenance.entities['/pde/office/core/desk/attachment'].originalPath, '/pde/office/core/desk/attachment');
    assert.equal(result.provenance.entities['/pde/office/core/desk/attachment'].filename, 'etc/dem-schema.json');
    assert.equal(JSON.stringify(result.canonical).includes('namespace'), false);
    assert.deepEqual(input, snapshot);
});

test('Format 2 schemas continue to use the separate Format 1 host map', async () => {
    const schema = envelope({
        $format: 2,
        $namespace: '/pde/office/core/',
        'desk/attachment': {attributes: [identity()]},
    });
    const map = envelope({$format: 1, sources: {p: {rename: {'/pde/office/core/': '/host/'}}}}, 'host', 'etc/dem-map.json');
    const result = await compiler.exec({schemas: [schema], map});
    assert.deepEqual(Object.keys(result.model.entities), ['/host/desk/attachment']);
    assert.equal(result.provenance.entities['/host/desk/attachment'].originalPath, '/pde/office/core/desk/attachment');
    assert.equal(result.provenance.entities['/host/desk/attachment'].namespace, '/pde/office/core/');
    assert.deepEqual(result.provenance.pathMappings, [{
        packageName: 'p',
        namespace: '/pde/office/core/',
        originalPath: '/pde/office/core/desk/attachment',
        effectivePath: '/host/desk/attachment',
        rule: {from: '/pde/office/core/', to: '/host/'},
    }]);
    await rejects({schemas: [schema], map: envelope({$format: 1, sources: {p: {rename: {'/pde/office/core/': '/host_team/'}}}}, 'host', 'etc/dem-map.json')}, 'DEM_MAP', '/sources');
});

test('Format 1 and mixed schema descriptors are rejected explicitly', async () => {
    await rejects({schemas: [envelope({$format: 1, '/app/item': {attributes: [identity()]}})]}, 'DEM_FORMAT', '/$format');
    await rejects({schemas: [
        envelope({$format: 2, $namespace: '/app/', item: {attributes: [identity()]}}, 'format-two'),
        envelope({$format: 1, '/legacy/item': {attributes: [identity()]}}, 'format-one'),
    ]}, 'DEM_FORMAT', '/$format');
});

test('missing and malformed namespaces and noncanonical declaration keys fail', async () => {
    await rejects({schemas: [envelope({$format: 2, item: {attributes: [identity()]}})]}, 'DEM_FORMAT', '/$namespace');
    for (const namespace of ['app/', '/app', '/app//team/', '/App/team/', '/app/team_name/', '/'])
        await rejects({schemas: [envelope({$format: 2, $namespace: namespace, item: {attributes: [identity()]}})]}, 'DEM_FORMAT', '/$namespace');
    for (const key of ['/item', 'item//child', 'item/./child', 'item/../child', 'item_key', 'item-key', '1item'])
        await rejects({schemas: [envelope({$format: 2, $namespace: '/app/', [key]: {attributes: [identity()]}})]}, 'DEM_PATH', '/' + key.replaceAll('~', '~0').replaceAll('/', '~1'));
});

test('local relative references resolve inside their source namespace', async () => {
    const schema = envelope({
        $format: 2,
        $namespace: '/vnd/sales/',
        'order/item': {
            attributes: [identity(), {name: 'customer_id', type: {name: 'ref'}}],
            relations: {customer: {attributes: ['customer_id'], target: {path: '../customer', attributes: ['id']}}},
        },
        customer: {attributes: [identity()]},
    });
    const result = await compiler.exec({schemas: [schema]});
    assert.equal(result.model.entities['/vnd/sales/order/item'].relations.customer.target.path, '/vnd/sales/customer');
});

test('local references cannot escape the source namespace or be rescued by host mapping', async () => {
    const schema = envelope({
        $format: 2,
        $namespace: '/vnd/sales/',
        order: {
            attributes: [identity(), {name: 'customer_id', type: {name: 'ref'}}],
            relations: {customer: {attributes: ['customer_id'], target: {path: '../customer', attributes: ['id']}}},
        },
    }, 'sales');
    const map = envelope({$format: 1, sources: {sales: {rename: {'/vnd/sales/': '/rescued/'}}}}, 'host', 'etc/dem-map.json');
    const error = await rejects({schemas: [schema], map}, 'DEM_PATH', '/order/relations/customer/target/path');
    const diagnostic = error.diagnostics.find((/** @type {any} */ item) => item.code === 'DEM_PATH');
    assert.deepEqual(diagnostic.source, {packageName: 'sales', filename: 'etc/dem-schema.json'});
    assert.equal(diagnostic.pointer, '/order/relations/customer/target/path');
});

test('cross-package references continue through declared dependencies and host binding', async () => {
    const sales = envelope({
        $format: 2,
        $namespace: '/vnd/sales/',
        $dependencies: {account: {attributes: ['id']}},
        order: {
            attributes: [identity(), {name: 'user_id', type: {name: 'ref'}}],
            relations: {user: {attributes: ['user_id'], target: {dependency: 'account', attributes: ['id']}}},
        },
    }, 'sales');
    const accounts = envelope({$format: 2, $namespace: '/vnd/accounts/', user: {attributes: [identity()] }}, 'accounts');
    const map = envelope({
        $format: 1,
        sources: {sales: {bind: {account: {path: '/vnd/accounts/user', attributes: {id: 'id'}}}}},
    }, 'host', 'etc/dem-map.json');
    const result = await compiler.exec({schemas: [sales, accounts], map});
    assert.equal(result.model.entities['/vnd/sales/order'].relations.user.target.path, '/vnd/accounts/user');
});

test('namespace ownership is unique, nested, and checked before selection', async () => {
    const duplicate = await rejects({schemas: [
        envelope({$format: 2, $namespace: '/pde/office/'}, 'office-a'),
        envelope({$format: 2, $namespace: '/pde/office/'}, 'office-b'),
    ], selection: []}, 'DEM_PATH', '/$namespace');
    const duplicateDiagnostic = duplicate.diagnostics.find((/** @type {any} */ item) => item.details.reason === 'duplicate-namespace');
    assert.deepEqual(duplicateDiagnostic.details, {
        reason: 'duplicate-namespace', namespace: '/pde/office/', packageName: 'office-b', conflictsWith: 'office-a',
    });

    const parent = envelope({
        $format: 2,
        $namespace: '/pde/office/',
        settings: {attributes: [identity()]},
    }, 'office');
    const core = envelope({$format: 2, $namespace: '/pde/office/core/', desk: {attributes: [identity()]}}, 'core');
    const web = envelope({$format: 2, $namespace: '/pde/office/web/', page: {attributes: [identity()]}}, 'web');
    const nested = await compiler.exec({schemas: [parent, core, web]});
    assert.deepEqual(Object.keys(nested.model.entities), [
        '/pde/office/core/desk', '/pde/office/settings', '/pde/office/web/page',
    ]);

    for (const declaration of [
        {'core/desk': {attributes: [identity()]}},
        {'core/': {}},
    ]) {
        const ownedParent = envelope({$format: 2, $namespace: '/pde/office/', ...declaration}, 'office');
        const map = mapEnvelope({$format: 1, sources: {office: {rename: {'/pde/office/': '/moved/'}}}});
        const error = await rejects({schemas: [ownedParent, core], selection: [], map}, 'DEM_PATH');
        assert.ok(error.diagnostics.some((/** @type {any} */ item) => item.details.reason === 'child-namespace-owned'
            && item.details.packageName === 'office' && item.details.conflictsWith === 'core'));
    }
});

test('reserved /dem source nodes and effective destinations are rejected', async () => {
    await rejects({schemas: [envelope({$format: 2, $namespace: '/dem/', item: {attributes: [identity()]}})]}, 'DEM_PATH');
    await rejects({schemas: [envelope({$format: 2, $namespace: '/dem/', 'group/': {}})]}, 'DEM_PATH');
    const schema = envelope({$format: 2, $namespace: '/app/', item: {attributes: [identity()]}});
    await rejects({schemas: [schema], map: mapEnvelope({$format: 1, sources: {p: {rename: {'/app/item': '/dem'}}}})}, 'DEM_PATH');
    await rejects({schemas: [schema], map: mapEnvelope({$format: 1, sources: {p: {rename: {'/app/': '/dem/'}}}})}, 'DEM_PATH');
});

test('selected effective collisions fail with stable diagnostics; excluded collisions are ignored', async () => {
    const alpha = envelope({$format: 2, $namespace: '/source/alpha/', item: {attributes: [identity()]}}, 'alpha');
    const zeta = envelope({$format: 2, $namespace: '/source/zeta/', item: {attributes: [identity()]}}, 'zeta');
    const map = mapEnvelope({$format: 1, sources: {
        alpha: {rename: {'/source/alpha/': '/model/'}},
        zeta: {rename: {'/source/zeta/': '/model/'}},
    }});
    const selected = [
        {packageName: 'alpha', entityPath: '/source/alpha/item'},
        {packageName: 'zeta', entityPath: '/source/zeta/item'},
    ];
    const readError = async (/** @type {any[]} */ schemas) => {
        try {
            await compiler.exec({schemas, selection: selected, map});
            assert.fail('Expected effective collision');
        }
        catch (/** @type {any} */ error) {
            assert.equal(error.name, 'DemCompilationError');
            return error.diagnostics;
        }
    };
    const first = await readError([alpha, zeta]);
    const reversed = await readError([zeta, alpha]);
    assert.deepEqual(first, reversed);
    assert.equal(first.length, 1);
    assert.deepEqual(first[0].source, {packageName: 'zeta', filename: 'etc/dem-schema.json'});
    assert.deepEqual(first[0].details, {
        path: '/model/item',
        packageName: 'zeta',
        namespace: '/source/zeta/',
        originalPath: '/source/zeta/item',
        effectivePath: '/model/item',
        conflictsWith: {
            packageName: 'alpha', namespace: '/source/alpha/',
            originalPath: '/source/alpha/item', effectivePath: '/model/item',
        },
    });

    const excluded = await compiler.exec({
        schemas: [alpha, zeta],
        selection: [selected[0]],
        map,
    });
    assert.deepEqual(Object.keys(excluded.model.entities), ['/model/item']);
    assert.equal(excluded.provenance.entities['/model/item'].packageName, 'alpha');
});

test('canonical identity excludes package ownership and source namespace provenance', async () => {
    const alpha = envelope({$format: 2, $namespace: '/vendors/alpha/', item: {attributes: [identity(), {name: 'label', type: {name: 'text'}}]}}, 'alpha');
    const beta = envelope({$format: 2, $namespace: '/vendors/beta/', item: {attributes: [identity(), {name: 'label', type: {name: 'text'}}]}}, 'beta');
    const alphaMap = mapEnvelope({$format: 1, sources: {alpha: {rename: {'/vendors/alpha/': '/logical/'}}}});
    const betaMap = mapEnvelope({$format: 1, sources: {beta: {rename: {'/vendors/beta/': '/logical/'}}}});
    const first = await compiler.exec({schemas: [alpha], map: alphaMap});
    const second = await compiler.exec({schemas: [beta], map: betaMap});
    assert.deepEqual(first.canonical, second.canonical);
    assert.equal(first.fingerprint, second.fingerprint);
    assert.notDeepEqual(first.provenance.entities['/logical/item'], second.provenance.entities['/logical/item']);

    const changed = envelope({$format: 2, $namespace: '/vendors/beta/', item: {
        attributes: [identity(), {name: 'label', type: {name: 'text'}, nullable: true}],
    }}, 'beta');
    const changedResult = await compiler.exec({schemas: [changed], map: betaMap});
    assert.notDeepEqual(second.canonical, changedResult.canonical);
    assert.notEqual(second.fingerprint, changedResult.fingerprint);
});
