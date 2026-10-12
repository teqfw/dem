import assert from 'node:assert/strict';
import {test} from 'node:test';
import Subject from '../../../src/Registry/Core.mjs';

test('Registry/Core.mjs exposes its component', () => {
    assert.equal(typeof Subject, 'function');
});
