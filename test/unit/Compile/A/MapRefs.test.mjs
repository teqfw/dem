import assert from 'node:assert/strict';
import {test} from 'node:test';
import Subject from '../../../../src/Compile/A/MapRefs.mjs';

test('Compile/A/MapRefs.mjs exposes its component', () => {
    assert.equal(typeof Subject, 'function');
});
