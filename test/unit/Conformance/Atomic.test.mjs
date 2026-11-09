import assert from 'node:assert/strict';
import {test} from 'node:test';
import Atomic from '../../../src/Conformance/Atomic.mjs';

test('atomic workload detects an incorrect result inside a batch', async () => {
    const provider = {execute: async () => ({results: [null, null, {record: {score: '9'}}, {record: {score: '5'}}]})};
    await assert.rejects(new Atomic().exercise({provider, assert}), {name: 'AssertionError'});
});
