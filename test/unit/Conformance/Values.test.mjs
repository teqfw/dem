import assert from 'node:assert/strict';
import {test} from 'node:test';
import Values from '../../../src/Conformance/Values.mjs';

test('value workload detects loss of integer precision', async () => {
    /** @type {any} */ let saved;
    const provider = {get: async () => ({
        create: async (/** @type {{record: any}} */ {record}) => ({record: saved = {...record, id: '1', wide: '18446744073709551616'}}),
        read: async () => ({record: saved}),
    })};
    await assert.rejects(new Values().exercise({provider, assert}), {name: 'AssertionError'});
});
