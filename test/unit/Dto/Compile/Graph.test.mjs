import assert from 'node:assert/strict';
import {test} from 'node:test';
import Subject from '../../../../src/Dto/Compile/Graph.mjs';

test('Dto/Compile/Graph.mjs exposes its component', () => {
    assert.equal(typeof Subject, 'function');
});
