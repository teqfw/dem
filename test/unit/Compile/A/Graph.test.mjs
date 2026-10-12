import assert from 'node:assert/strict';
import {test} from 'node:test';
import Subject from '../../../../src/Compile/A/Graph.mjs';

test('Compile/A/Graph.mjs exposes its component', () => {
    assert.equal(typeof Subject, 'function');
});
