import assert from 'node:assert/strict';
import {test} from 'node:test';
import Subject from '../../../../src/Dto/Compile/Diagnostic.mjs';

test('Dto/Compile/Diagnostic.mjs exposes its component', () => {
    assert.equal(typeof Subject, 'function');
});
