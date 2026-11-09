import assert from 'node:assert/strict';
import {test} from 'node:test';
import Extended from '../../../src/Conformance/Extended.mjs';

test('extended workload detects corruption of long and Unicode keys', async () => {
    const provider = {get: async () => ({create: async () => ({}), read: async () => ({record: null})})};
    await assert.rejects(new Extended().exercise({provider, assert}), {name: 'AssertionError'});
});
