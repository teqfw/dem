// @ts-check
import assert from 'node:assert/strict';import {test} from 'node:test';import CoreValue from '../../../src/Registry/CoreValue.mjs';import {data} from '../../Mocks.mjs';
const values=new CoreValue({data:/** @type {any} */(data),core:/** @type {any} */({types:{integer:{allowed:['bits','unsigned'],defaults:{bits:32,unsigned:false}},decimal:{allowed:['precision','scale','unsigned'],defaults:{unsigned:false}},uuid:{allowed:[],defaults:{}}}})});
test('exact integer defaults retain values beyond JavaScript safe integers',()=>{
    const type=values.normalizeType({type:{name:'integer',params:{bits:64}}});assert.ok(type);
    assert.equal(values.normalizeValue({type,value:'9223372036854775807'}),'9223372036854775807');
    assert.throws(()=>values.normalizeValue({type,value:'9223372036854775808'}));assert.throws(()=>values.normalizeValue({type,value:9007199254740992}));
    assert.equal(values.normalizeType({type:{name:'integer',params:{storage:'BIGINT'}}}),null);
});
test('decimal normalization is exact and does not round excess precision',()=>{
    const type=values.normalizeType({type:{name:'decimal',params:{precision:8,scale:2}}});assert.ok(type);
    assert.equal(values.normalizeValue({type,value:'1.000'}),'1.00');assert.equal(values.normalizeValue({type,value:'-0.0'}),'0.00');assert.throws(()=>values.normalizeValue({type,value:'1.001'}));
});
