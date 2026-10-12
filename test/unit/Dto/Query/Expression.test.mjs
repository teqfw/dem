import assert from 'node:assert/strict';
import {test} from 'node:test';
import Subject from '../../../../src/Dto/Query/Expression.mjs';

test('Dto/Query/Expression.mjs exposes its component', () => {
    assert.equal(typeof Subject, 'function');
});
