import assert from 'node:assert/strict';
import {test} from 'node:test';
import Subject from '../../../../src/Dto/Compile/Source.mjs';

test('Dto/Compile/Source.mjs exposes its component', () => {
    assert.equal(typeof Subject, 'function');
});
