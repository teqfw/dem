import assert from 'node:assert/strict';
import {test} from 'node:test';
import Evolution from '../../../src/Conformance/Evolution.mjs';

test('evolution workload closes an opened backend when setup fails', async () => {
    let closed = 0;
    const failure = new Error('injected write failure');
    const open = async () => ({
        createSchema: async () => ({version: 1}),
        get: async () => ({create: async () => {throw failure;}}),
        close: async () => {closed++;},
    });
    await assert.rejects(new Evolution().exercise({open, assert}), error => error === failure);
    assert.equal(closed, 1);
});

test('evolution schemas are independent between calls', () => {
    const component = new Evolution();
    const first = component.schemas();
    first[0].item.attributes[1].name = 'mutated';
    assert.equal(component.schemas()[0].item.attributes[1].name, 'name');
});
