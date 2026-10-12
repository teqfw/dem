import assert from 'node:assert/strict';
import {test} from 'node:test';
import Subject from '../../../../src/Compile/A/ValidateNames.mjs';

test('Compile/A/ValidateNames.mjs exposes its component', () => {
    assert.equal(typeof Subject, 'function');
});
