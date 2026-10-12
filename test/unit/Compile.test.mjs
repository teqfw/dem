import assert from 'node:assert/strict';
import {test} from 'node:test';
import Subject from '../../src/Compile.mjs';

test('Compile.mjs exposes its component', () => {
    assert.equal(typeof Subject, 'function');
});
