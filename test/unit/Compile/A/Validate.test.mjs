import assert from 'node:assert/strict';
import {test} from 'node:test';
import Subject from '../../../../src/Compile/A/Validate.mjs';

test('Compile/A/Validate.mjs exposes its component', () => {
    assert.equal(typeof Subject, 'function');
});
