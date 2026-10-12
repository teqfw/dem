import assert from 'node:assert/strict';
import {test} from 'node:test';
import Subject from '../../../src/Registry/CoreValue.mjs';

test('Registry/CoreValue.mjs exposes its component', () => {
    assert.equal(typeof Subject, 'function');
});
