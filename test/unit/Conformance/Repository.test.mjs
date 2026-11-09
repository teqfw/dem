import assert from 'node:assert/strict';
import {test} from 'node:test';
import Repository from '../../../src/Conformance/Repository.mjs';

test('repository suite registers cases and closes a backend when a case fails', async () => {
    /** @type {Array<{name: string, body: () => Promise<void>}>} */ const cases = [];
    let closed = 0;
    const failure = new Error('injected provider failure');
    const component = new Repository();
    component.register({test: (/** @type {string} */ name, /** @type {() => Promise<void>} */ body) => cases.push({name, body}), assert, open: async (/** @type {{schema: any}} */ {schema}) => {
        assert.equal(schema.$namespace, '/contract/');
        return {provider: {get: async () => {throw failure;}}, close: async () => {closed++;}};
    }});
    assert.equal(cases.length, 10);
    assert.equal(new Set(cases.map(item => item.name)).size, cases.length);
    await assert.rejects(cases[0].body(), {name: 'AssertionError'});
    assert.equal(closed, 1);
});
