// @ts-check
import assert from 'node:assert/strict';import {test} from 'node:test';import Canonical from '../../../../src/Compile/A/Canonical.mjs';
test('canonical content excludes empty packages and attribute presentation order',()=>{
    const attributes=[{name:'b',type:{name:'text',params:{}},nullable:false,generation:false},{name:'a',type:{name:'boolean',params:{}},nullable:false,generation:false}];
    const result=new Canonical().exec({packages:['/empty/'],entities:{'/item':{attributes,primaryKey:null,uniqueKeys:{},indexes:{},relations:{}}}});
    assert.equal('packages' in result,false);assert.equal('name' in result.entities['/item'].attributes.a,false);assert.equal(result.entities['/item'].attributes.a.type.name,'boolean');
});
