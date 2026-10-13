// @ts-check
import assert from 'node:assert/strict';import {test} from 'node:test';import Path from '../../../../src/Compile/A/Path.mjs';
const path=new Path();
test('logical addresses normalize without losing node kind',()=>{
    assert.equal(path.normalize('customer','/vnd/sales/'),'/vnd/sales/customer');
    assert.equal(path.normalize('../customer','/vnd/sales/'),'/vnd/customer');
    assert.equal(path.normalize('/vnd//sales/./../sales/'),'/vnd/sales/');
    assert.equal(path.normalize('/vnd/name'),'/vnd/name');assert.equal(path.normalize('/vnd/name/'),'/vnd/name/');
    assert.deepEqual(path.parents('/vnd/sales/order'),['/','/vnd/','/vnd/sales/']);
    for(const invalid of ['/../a','../../a','/Vnd/a','/vnd/a-b',''])assert.throws(()=>path.normalize(invalid));
});
