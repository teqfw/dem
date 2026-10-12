import assert from 'node:assert/strict';
import {test} from 'node:test';
import Subject from '../../../../src/Compile/A/Compose.mjs';

test('Compile/A/Compose.mjs exposes its component', () => {
    assert.equal(typeof Subject, 'function');
});
