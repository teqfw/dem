import assert from 'node:assert/strict';
import {test} from 'node:test';
import Workflow from '../../../../src/Conformance/Application/Workflow.mjs';

test('application workflow propagates failure to acquire its repository', async () => {
    const failure = new Error('provider unavailable');
    let requested;
    const provider = {get: async (/** @type {{path: string}} */ {path}) => {requested = path; throw failure;}};
    const workflow = new Workflow(/** @type {any} */ ({provider, selection: {}}));
    await assert.rejects(workflow.exec(/** @type {any} */ ({model: {entities: {}}})), error => error === failure);
    assert.equal(requested, '/demo/task');
});
