// @ts-nocheck
import assert from 'node:assert/strict';
import {test} from 'node:test';
import Registry from '../../src/Registry.mjs';

const deepFreeze = value => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        for (const item of Object.values(value)) deepFreeze(item);
        Object.freeze(value);
    }
    return value;
};

const create = () => {
    const types = {integer: {}, identity: {}, ref: {}};
    const registry = new Registry({
        core: {types},
        values: {
            normalizeType: ({type}) => ({name: type.name, params: type.params ?? {}}),
            normalizeValue: ({value}) => value,
        },
        data: {
            serialize: JSON.stringify,
            isObject: value => Boolean(value) && typeof value === 'object' && !Array.isArray(value),
            freeze: deepFreeze,
        },
    });
    return registry;
};

const extension = (name = 'example.Token') => ({
    name,
    parameters: {size: 'Maximum token size.'},
    normalizeParams: params => ({size: params.size ?? 16}),
    valueDomain: 'A fixed-size token.',
    preservation: 'Preserve the token bytes.',
    valueHandling: 'Validate and copy token values.',
    equality: 'Bytewise equality.',
    ordering: 'Unsigned byte ordering.',
});

test('registry gates lookup until finalization and exposes core definitions afterward', () => {
    const registry = create();

    assert.throws(() => registry.assertFinalized(), /not finalized/i);
    assert.throws(() => registry.get('integer'), /not finalized/i);
    registry.finalize();

    assert.equal(registry.assertFinalized(), undefined);
    assert.equal(registry.get('integer').name, 'integer');
    assert.equal(typeof registry.get('integer').literal.normalize, 'function');
    assert.equal('generation' in registry.get('ref'), false);
});

test('registration snapshots definitions, normalizes capabilities, and rejects later changes', () => {
    const registry = create();
    const source = extension();
    registry.register([source]);
    source.name = 'example.Changed';
    source.parameters.size = 'changed';
    registry.finalize();

    const definition = registry.get('example.Token');
    assert.equal(definition.parameters.size, 'Maximum token size.');
    assert.deepEqual(definition.normalizeParams({}), {size: 16});
    assert.equal(typeof definition.equality, 'string');
    assert.equal(typeof definition.ordering, 'string');
    assert.ok(Object.isFrozen(definition));
    assert.ok(Object.isFrozen(definition.parameters));
    assert.throws(() => registry.register([]), /finalized/i);
});

test('registration is atomic and rejects duplicate, malformed, and non-dense definitions', () => {
    const registry = create();

    assert.throws(() => registry.register([extension(), extension()]));
    assert.throws(() => registry.register([extension(), {...extension('example.Broken'), unknown: true}]));
    assert.throws(() => registry.register(new Array(1)));
    registry.register([extension('example.Valid')]);
    registry.finalize();

    assert.equal(registry.get('example.Valid').name, 'example.Valid');
    assert.equal(registry.get('example.Broken'), undefined);
});

test('registration rejects invalid provider identifiers and invalid capability declarations', () => {
    const registry = create();
    const orderingOnly = extension('example.OrderingOnly');
    delete orderingOnly.equality;

    assert.throws(() => registry.register([extension('Invalid')]), /identifier/i);
    assert.throws(() => registry.register([orderingOnly]));
    assert.throws(() => registry.register([{...extension('example.BadLiteral'), literal: {grammar: 'JSON', normalize: true}}]));
});
