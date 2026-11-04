// @ts-check
import assert from 'node:assert/strict';
import {test} from 'node:test';
import Container from '@teqfw/di';
import {fileURLToPath} from 'node:url';

const source = fileURLToPath(new URL('../../src', import.meta.url));
const makeContainer = () => new Container({namespaces: [{prefix: 'TeqFw_Dem_', target: source, defaultExt: '.mjs'}]});
const envelope = (/** @type {any} */ document) => ({packageName: 'test/extensions', filename: 'etc/schema.json', document});
const schema = (/** @type {any} */ entities) => envelope({$format: 2, $namespace: '/test/', ...entities});
const opaque = {
    name: 'web.crypto.CryptoKey', parameters: {},
    normalizeParams: (/** @type {Record<string, any>} */ params) => { if (Object.keys(params).length) throw new TypeError(); return {}; },
    valueDomain: 'A genuine Web Crypto key capability.', preservation: 'Preserve key capability and non-extractability.', valueHandling: 'Validate and preserve the genuine immutable key.',
};
const token = {
    name: 'example.Token16', parameters: {size: 'Byte size; defaults to 16.'},
    normalizeParams: (/** @type {Record<string, any>} */ params) => {
        if (Object.keys(params).some(key => key !== 'size')) throw new TypeError();
        const size = params.size ?? 16;
        if (size !== 16) throw new TypeError();
        return {size};
    },
    valueDomain: 'A fixed 16-byte token.', preservation: 'Preserve all 16 bytes.', valueHandling: 'Validate and copy fixed-length buffers.',
    equality: 'Bytewise equality.', ordering: 'Unsigned lexicographic byte order.',
};
const counter = {
    name: 'example.Counter', parameters: {},
    normalizeParams: (/** @type {Record<string, any>} */ params) => { if (Object.keys(params).length) throw new TypeError(); return {}; },
    valueDomain: 'A non-negative safe integer.', preservation: 'Preserve the exact integer.', valueHandling: 'Validate and preserve safe integer values.',
    equality: 'Integer equality.', ordering: 'Numeric integer order.',
    literal: {grammar: 'A non-negative safe JSON integer.', normalize: (/** @type {any} */ literal) => { if (!Number.isSafeInteger(literal) || literal < 0) throw new TypeError(); return literal; }},
    generation: {declaration: 'An object with strategy set to sequence.', guarantees: 'Produces monotonically allocated non-negative integers.', normalize: (/** @type {any} */ declaration) => {
        if (!declaration || declaration.strategy !== 'sequence' || Object.keys(declaration).length !== 1) throw new TypeError();
        return {strategy: 'sequence'};
    }},
};
const equalityOnly = {
    name: 'example.EqualityOnly', parameters: {},
    normalizeParams: (/** @type {Record<string, any>} */ params) => { if (Object.keys(params).length) throw new TypeError(); return {}; },
    valueDomain: 'An opaque equality-comparable value.', preservation: 'Preserve the logical value.', valueHandling: 'Validate and preserve the logical value.',
    equality: 'Deterministic equality.',
};

test('real DI bootstrap gates compilation and registry state is container-scoped', async () => {
    const first = makeContainer();
    const registry = await first.get('TeqFw_Dem_Registry$');
    const compile = await first.get('TeqFw_Dem_Compile$');
    await assert.rejects(() => compile.exec({schemas: []}), /not finalized/i);
    const provider = {getDefinitions: () => [opaque, token]};
    registry.register(provider.getDefinitions());
    registry.finalize();
    registry.finalize();
    assert.equal(registry.get('example.Token16'), registry.get('example.Token16'));
    const result = await compile.exec({schemas: [schema({item: {attributes: [{name: 'token', type: {name: 'example.Token16'}}], uniqueKeys: {token: ['token']}, indexes: {by_token: {attributes: ['token']}}}})]});
    const type = result.model.entities['/test/item'].attributes[0].type;
    assert.deepEqual(type, {name: 'example.Token16', params: {size: 16}});
    const equivalent = await compile.exec({schemas: [schema({item: {attributes: [{name: 'token', type: {name: 'example.Token16', params: {}}}], uniqueKeys: {token: ['token']}, indexes: {by_token: {attributes: ['token']}}}})]});
    assert.equal(equivalent.fingerprint, result.fingerprint);
    await compile.exec({schemas: [schema({next: {attributes: [{name: 'token', type: {name: 'example.Token16'}}]}})]});

    const second = makeContainer();
    const otherRegistry = await second.get('TeqFw_Dem_Registry$');
    assert.notEqual(otherRegistry, registry);
    otherRegistry.finalize();
    const otherCompile = await second.get('TeqFw_Dem_Compile$');
    await assert.rejects(() => otherCompile.exec({schemas: [schema({item: {attributes: [{name: 'token', type: {name: 'example.Token16'}}]}})]}), (/** @type {any} */ error) => error.diagnostics.some((/** @type {any} */ diagnostic) => diagnostic.code === 'DEM_TYPE'));
});

test('opaque and ordered extension properties govern declaration eligibility', async () => {
    const container = makeContainer();
    const registry = await container.get('TeqFw_Dem_Registry$');
    registry.register([opaque, token]);
    registry.finalize();
    const compile = await container.get('TeqFw_Dem_Compile$');
    const rejectsCode = async (/** @type {any} */ input, /** @type {string} */ code) => assert.rejects(() => compile.exec(input), (/** @type {any} */ error) => error.diagnostics.some((/** @type {any} */ diagnostic) => diagnostic.code === code && diagnostic.source?.packageName === 'test/extensions'));

    await rejectsCode({schemas: [schema({
        item: {attributes: [{name: 'key', type: {name: 'web.crypto.CryptoKey'}}], uniqueKeys: {opaque: ['key']}},
    })]}, 'DEM_KEY');
    await rejectsCode({schemas: [schema({
        item: {attributes: [{name: 'key', type: {name: 'web.crypto.CryptoKey'}}], indexes: {opaque: {attributes: ['key']}}},
    })]}, 'DEM_KEY');
    await rejectsCode({schemas: [schema({
        item: {attributes: [{name: 'key', type: {name: 'web.crypto.CryptoKey'}}], relations: {target: {attributes: ['key'], target: {path: 'target', attributes: ['id']}}}},
        target: {attributes: [{name: 'id', type: {name: 'identity'}}]},
    })]}, 'DEM_RELATION');

    const compatible = await compile.exec({schemas: [schema({source: {attributes: [{name: 'token', type: {name: 'example.Token16'}}], relations: {target: {attributes: ['token'], target: {path: 'target', attributes: ['token']}}}}, target: {attributes: [{name: 'token', type: {name: 'example.Token16'}}], uniqueKeys: {token: ['token']}}})]});
    assert.deepEqual(compatible.model.entities['/test/source'].relations.target.target, {path: '/test/target', attributes: ['token']});
    await rejectsCode({schemas: [schema({item: {attributes: [{name: 'token', type: {name: 'example.Token16', params: {size: 8}}}], uniqueKeys: {token: ['token']}}})]}, 'DEM_TYPE');
    await rejectsCode({schemas: [schema({item: {attributes: [{name: 'token', type: {name: 'example.Token16'}, default: 'literal'}]}})]}, 'DEM_TYPE');
});

test('compilation requires a non-nullable all-orderable key when an attribute lacks ordering', async () => {
    const container = makeContainer();
    const registry = await container.get('TeqFw_Dem_Registry$');
    registry.register([opaque, token, equalityOnly]);
    registry.finalize();
    const compile = await container.get('TeqFw_Dem_Compile$');
    const run = (/** @type {any} */ entity) => compile.exec({schemas: [schema({item: entity})]});
    const rejectsOrdering = async (/** @type {any} */ entity) => assert.rejects(() => run(entity), (/** @type {any} */ error) => {
        const diagnostic = error.diagnostics.find((/** @type {any} */ item) => item.details.reason === 'deterministic-ordering-key-required');
        assert.equal(diagnostic?.code, 'DEM_KEY');
        assert.equal(diagnostic?.source?.packageName, 'test/extensions');
        assert.equal(diagnostic?.pointer, '/item/attributes/0/type');
        return true;
    });
    const crypto = {name: 'secret', type: {name: 'web.crypto.CryptoKey'}};

    await rejectsOrdering({attributes: [crypto]});
    await run({attributes: [crypto, {name: 'token', type: {name: 'example.Token16'}}], uniqueKeys: {token: ['token']}});
    await rejectsOrdering({attributes: [crypto, {name: 'token', type: {name: 'example.Token16'}, nullable: true}], uniqueKeys: {token: ['token']}});
    await rejectsOrdering({attributes: [crypto, {name: 'key', type: {name: 'example.EqualityOnly'}}], uniqueKeys: {key: ['key']}});
    await run({attributes: [crypto, {name: 'id', type: {name: 'integer'}}, {name: 'token', type: {name: 'example.Token16'}}], uniqueKeys: {mixed: ['id', 'token']}});
    await run({attributes: [crypto, {name: 'primary', type: {name: 'example.EqualityOnly'}}, {name: 'token', type: {name: 'example.Token16'}}], primaryKey: ['primary'], uniqueKeys: {ordered: ['token']}});

    // A key is not required when every attribute already has Ordering; keyless Core fallback remains valid.
    await run({attributes: [{name: 'id', type: {name: 'integer'}}, {name: 'value', type: {name: 'text'}}]});
});

test('generation and identity/ref diagnostics point to one accurate declaration location', async () => {
    const container = makeContainer();
    const registry = await container.get('TeqFw_Dem_Registry$');
    registry.register([counter]);
    registry.finalize();
    const compile = await container.get('TeqFw_Dem_Compile$');
    const errors = async (/** @type {any} */ attributes) => {
        try {
            await compile.exec({schemas: [schema({item: {attributes}})]});
            assert.fail('Expected compilation to fail');
        } catch (/** @type {any} */ error) {
            return error.diagnostics;
        }
    };
    const generation = await errors([{name: 'value', type: {name: 'example.Counter'}, generation: {strategy: 'bad'}}]);
    assert.deepEqual(generation.map((/** @type {any} */ item) => [item.code, item.pointer]), [['DEM_TYPE', '/item/attributes/0/generation']]);
    const identity = await errors([{name: 'id', type: {name: 'identity'}, default: 1}]);
    assert.deepEqual(identity.map((/** @type {any} */ item) => [item.code, item.pointer]), [['DEM_IDENTITY', '/item/attributes/0/default']]);
    const ref = await errors([{name: 'link', type: {name: 'ref'}, generation: true}]);
    assert.deepEqual(ref.map((/** @type {any} */ item) => [item.code, item.pointer]), [['DEM_IDENTITY', '/item/attributes/0/generation']]);
});

test('registered literal and generation capabilities normalize declarations', async () => {
    const container = makeContainer();
    const registry = await container.get('TeqFw_Dem_Registry$');
    registry.register([counter]);
    registry.finalize();
    const compile = await container.get('TeqFw_Dem_Compile$');
    const result = await compile.exec({schemas: [schema({item: {attributes: [
        {name: 'initial', type: {name: 'example.Counter'}, default: 7},
        {name: 'next', type: {name: 'example.Counter'}, generation: {strategy: 'sequence'}},
    ]}})]});
    const attrs = result.model.entities['/test/item'].attributes;
    assert.equal(attrs[0].default, 7);
    assert.deepEqual(attrs[1].generation, {strategy: 'sequence'});
    await assert.rejects(() => compile.exec({schemas: [schema({item: {attributes: [
        {name: 'initial', type: {name: 'example.Counter'}, default: -1},
    ]}})]}), (/** @type {any} */ error) => error.diagnostics.some((/** @type {any} */ diagnostic) => diagnostic.code === 'DEM_TYPE'));
});

test('registration is atomic, isolated and independent of provider order', async () => {
    const container = makeContainer();
    const registry = await container.get('TeqFw_Dem_Registry$');
    const mutable = {...token, parameters: {...token.parameters}};
    assert.throws(() => registry.register([token, token]));
    assert.throws(() => registry.register([mutable, {...opaque, name: 'broken'}]));
    assert.throws(() => registry.get('example.Token16'));
    assert.throws(() => registry.register([{...token, name: 'integer'}]));
    registry.register([mutable]);
    mutable.name = 'example.Changed';
    mutable.parameters.size = 'changed';
    registry.finalize();
    const definition = registry.get('example.Token16');
    assert.ok(Object.isFrozen(definition));
    assert.ok(Object.isFrozen(definition.parameters));
    assert.equal(definition.parameters.size, 'Byte size; defaults to 16.');
    assert.equal(definition.normalizeParams, registry.get('example.Token16').normalizeParams);
    assert.throws(() => registry.register([]));
    assert.throws(() => registry.get('bad..name'));

    const forwardContainer = makeContainer();
    const forwardRegistry = await forwardContainer.get('TeqFw_Dem_Registry$');
    forwardRegistry.register([token, opaque]);
    forwardRegistry.finalize();
    const forwardCompile = await forwardContainer.get('TeqFw_Dem_Compile$');
    const reverse = makeContainer();
    const reverseRegistry = await reverse.get('TeqFw_Dem_Registry$');
    reverseRegistry.register([opaque]);
    reverseRegistry.register([token]);
    reverseRegistry.finalize();
    const reverseCompile = await reverse.get('TeqFw_Dem_Compile$');
    const input = {
        schemas: [schema({
            item: {
                attributes: [{name: 'opaque', type: {name: 'web.crypto.CryptoKey'}}, {name: 'token', type: {name: 'example.Token16'}}],
                uniqueKeys: {token: ['token']},
            },
        })],
    };
    const forwardResult = await forwardCompile.exec(input);
    const backward = await reverseCompile.exec(input);
    assert.equal(forwardResult.fingerprint, backward.fingerprint);
    assert.deepEqual(forwardResult.canonical, backward.canonical);
});
