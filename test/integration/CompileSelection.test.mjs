// @ts-check
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {container} from '../TestEnv.mjs';

/** @type {TeqFw_Dem_Compile} */ const compiler = await container.get('TeqFw_Dem_Compile$');
const envelope = (/** @type {any} */ document, packageName = 'app') => ({packageName, filename: 'etc/dem-schema.json', document});
const mapEnvelope = (/** @type {any} */ document) => envelope(document, 'host');
const identity = () => ({name: 'id', type: {name: 'identity'}});
const select = (/** @type {string} */ packageName, /** @type {string} */ entityPath) => ({packageName, entityPath});

/** @param {any} input @param {string} code @param {string} [reason] @param {string} [pointer] */
async function rejects(input, code, reason, pointer) {
    await assert.rejects(() => compiler.exec(input), (/** @type {any} */ error) => {
        assert.equal(error.name, 'DemCompilationError');
        assert.equal('model' in error, false);
        const diagnostic = error.diagnostics.find((/** @type {any} */ item) => item.code === code && (!reason || item.details.reason === reason));
        assert.ok(diagnostic, JSON.stringify(error.diagnostics));
        if (pointer !== undefined)
            assert.equal(diagnostic.pointer, pointer);
        return true;
    });
}

test('selection compiles independent models from one unchanged descriptor', async () => {
    const schema = envelope({$format: 1, '/demo/a': {attributes: [identity()]}, '/demo/b': {attributes: [identity()]}});
    const before = structuredClone(schema);
    const a = await compiler.exec({schemas: [schema], selection: [select('app', '/demo/a')]});
    const b = await compiler.exec({schemas: [schema], selection: [select('app', '/demo/b')]});
    assert.deepEqual(Object.keys(a.model.entities), ['/demo/a']);
    assert.deepEqual(Object.keys(b.model.entities), ['/demo/b']);
    const ab = await compiler.exec({schemas: [schema], selection: [select('app', '/demo/a'), select('app', '/demo/b')]});
    const ba = await compiler.exec({schemas: [schema], selection: [select('app', '/demo/b'), select('app', '/demo/a')]});
    assert.deepEqual(ab, ba);
    assert.deepEqual(schema, before);
});

test('selection supports independent identity profiles and an explicit empty model', async () => {
    const schemas = [envelope({$format: 1, '/demo/a': {attributes: [identity()]}, '/empty/': {}})];
    const selection = [select('app', '/demo/a')];
    const uuid = await compiler.exec({schemas, selection, map: mapEnvelope({$format: 1, identityProfiles: {'/demo/a': {id: {type: 'uuid'}}}})});
    const small = await compiler.exec({schemas, selection, map: mapEnvelope({$format: 1, identityProfiles: {'/demo/a': {id: {type: 'int', capacity: 'small'}}}})});
    assert.notEqual(uuid.fingerprint, small.fingerprint);
    assert.deepEqual((/** @type {any} */(uuid.model.entities['/demo/a'])).attributes[0].type.profile, {type: 'uuid'});
    const empty = await compiler.exec({schemas, selection: []});
    assert.deepEqual(empty.model, {packages: [], entities: {}});
    assert.equal(empty.fingerprint, (await compiler.exec({schemas: []})).fingerprint);
    const all = await compiler.exec({schemas});
    assert.deepEqual(Object.keys(all.model.entities), ['/demo/a']);
    assert.ok(all.model.packages.includes('/empty/'));
});

test('selection diagnostics use stable API-level reasons and canonical addresses', async () => {
    const schemas = [envelope({$format: 1, '/demo/a': {attributes: [identity()]}})];
    const invalid = [
        select('app', '/demo/missing'), select('missing', '/demo/a'),
        select('app', '/demo/a'), select('app', '/demo/a'), select('app', '/demo//a'),
    ];
    const read = async (/** @type {any[]} */ selection) => {
        try {
            await compiler.exec({schemas, selection});
            assert.fail('Expected invalid selection');
        }
        catch (/** @type {any} */ error) {
            assert.equal(error.name, 'DemCompilationError');
            return error.diagnostics;
        }
    };
    const first = await read(invalid);
    const second = await read([...invalid].reverse());
    assert.deepEqual(first, second);
    assert.deepEqual(first.map((/** @type {any} */ item) => item.details.reason).sort(), ['selector-duplicate', 'selector-entity', 'selector-package', 'selector-path']);
    assert.ok(first.every((/** @type {any} */ item) => item.code === 'DEM_INPUT' && item.source === null && item.pointer === ''));
    await rejects({schemas, selection: null}, 'DEM_INPUT', 'selection-type');
    await rejects({schemas, selection: [{packageName: 'app', entityPath: '/demo/a', extra: true}]}, 'DEM_INPUT', 'selector-shape');
    await rejects({schemas, selection: [select('app', '/demo/a/')]}, 'DEM_INPUT', 'selector-path');
    await rejects({schemas, selection: [select('app', '/demo/nope')]}, 'DEM_INPUT', 'selector-entity');
});

test('selected local references do not include excluded targets', async () => {
    const schema = envelope({$format: 1,
        '/demo/a': {attributes: [identity()]},
        '/demo/b': {
            attributes: [identity(), {name: 'a_id', type: {name: 'ref'}}],
            relations: {a: {attributes: ['a_id'], target: {path: 'a', attributes: ['id']}}},
        },
    });
    await rejects({schemas: [schema], selection: [select('app', '/demo/b')]}, 'DEM_TARGET', undefined, '/~1demo~1b/relations/a');
});

test('host rules apply after selection and entity rules cannot address excluded entities', async () => {
    const schemas = [envelope({$format: 1, '/demo/a': {attributes: [identity()]}, '/demo/b': {attributes: [identity()]}, '/empty/': {}})];
    const selection = [select('app', '/demo/a')];
    const moved = await compiler.exec({schemas, selection, map: mapEnvelope({$format: 1, sources: {app: {rename: {'/demo/': '/selected/', '/empty/': '/other/'}}}})});
    assert.deepEqual(Object.keys(moved.model.entities), ['/selected/a']);
    assert.ok(!moved.model.packages.includes('/other/'));
    await rejects({schemas, selection, map: mapEnvelope({$format: 1, sources: {app: {rename: {'/demo/b': '/other/b'}}}})}, 'DEM_MAP');
    await rejects({schemas, selection, map: mapEnvelope({$format: 1, identityProfiles: {'/demo/b': {id: {type: 'uuid'}}}})}, 'DEM_MAP');
});

test('external dependencies are required only by selected relations and relevant bindings', async () => {
    const schema = envelope({$format: 1, $dependencies: {account: {attributes: ['id']}},
        '/demo/a': {attributes: [identity()]},
        '/demo/b': {
            attributes: [identity(), {name: 'account_id', type: {name: 'ref'}}],
            relations: {account: {attributes: ['account_id'], target: {dependency: 'account', attributes: ['id']}}},
        },
    });
    const selectedA = [select('app', '/demo/a')];
    const unusedBinding = mapEnvelope({$format: 1, sources: {app: {bind: {account: {path: '/missing', attributes: {id: 'id'}}}}}});
    const withoutBinding = await compiler.exec({schemas: [schema], selection: selectedA});
    const withUnusedBinding = await compiler.exec({schemas: [schema], selection: selectedA, map: unusedBinding});
    assert.equal(withoutBinding.fingerprint, withUnusedBinding.fingerprint);
    assert.deepEqual(withUnusedBinding.provenance.bindings, []);
    const unusedContract = envelope({$format: 1, $dependencies: {unused: {attributes: ['id']}}, '/demo/a': {attributes: [identity()]}});
    assert.deepEqual((await compiler.exec({schemas: [unusedContract]})).provenance.bindings, []);
    await rejects({schemas: [schema], selection: [select('app', '/demo/b')]}, 'DEM_DEPENDENCY', undefined, '/$dependencies/account');
    await rejects({schemas: [schema], selection: [select('app', '/demo/b')], map: mapEnvelope({$format: 1, sources: {app: {bind: {account: {path: '/missing', attributes: {id: 'id'}}}}}})}, 'DEM_TARGET', undefined, '/sources');
});

test('excluded entities do not collide or affect canonical identity, but remain structurally validated', async () => {
    const first = envelope({$format: 1, '/demo/a': {attributes: [identity()]}}, 'first');
    const collision = envelope({$format: 1, '/demo/a': {attributes: [identity()]}}, 'second');
    const selected = [select('first', '/demo/a')];
    const withExcluded = await compiler.exec({schemas: [first, collision], selection: selected});
    const alone = await compiler.exec({schemas: [first], selection: selected});
    assert.deepEqual(Object.keys(withExcluded.model.entities), ['/demo/a']);
    assert.equal(withExcluded.fingerprint, alone.fingerprint);
    const malformed = envelope({$format: 1, '/demo/b': {attributes: []}}, 'malformed');
    await rejects({schemas: [first, malformed], selection: selected}, 'DEM_FORMAT');
});

test('malformed supplied unused binding rules fail structural validation', async () => {
    const schema = envelope({$format: 1, $dependencies: {unused: {attributes: ['id']}}, '/demo/a': {attributes: [identity()]}});
    const malformed = mapEnvelope({$format: 1, sources: {app: {bind: {unused: {path: '/missing', attributes: {id: 'not-valid!'}}}}}});
    await rejects({schemas: [schema], selection: [select('app', '/demo/a')], map: malformed}, 'DEM_MAP', undefined, '/sources');
    const invalidContract = envelope({$format: 1, $dependencies: {unused: {}}, '/demo/a': {attributes: [identity()]}});
    const validBinding = mapEnvelope({$format: 1, sources: {app: {bind: {unused: {path: '/missing', attributes: {id: 'id'}}}}}});
    await rejects({schemas: [invalidContract], selection: [select('app', '/demo/a')], map: validBinding}, 'DEM_FORMAT');
});
