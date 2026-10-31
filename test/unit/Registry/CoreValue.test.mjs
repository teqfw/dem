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


test('JSON and dense vectors canonicalize negative zero without retaining input aliases',()=>{
    const input={nested:{zero:-0}};
    const output=values.normalizeValue({type:{name:'json'},value:input});
    assert.equal(Object.is(output.nested.zero,-0),false);
    input.nested.zero=5;assert.equal(output.nested.zero,0);
    const vector=values.normalizeValue({type:{name:'vector',params:{dimensions:2,element:'float',sparse:false}},value:[-0,0.1]});
    assert.equal(Object.is(vector[0],-0),false);assert.equal(vector[1],0.1);
});
test('sparse vector entries are detached in both directions',()=>{
    const input={dimensions:3,entries:[{index:2,value:4},{index:0,value:1}]};
    const output=values.normalizeValue({type:{name:'vector',params:{dimensions:3,element:'float',sparse:true}},value:input});
    input.entries[0].value=9;assert.equal(output.entries[1].value,4);
    output.entries[0].value=7;assert.equal(input.entries[1].value,1);
});
