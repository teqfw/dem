// @ts-check
import assert from 'node:assert/strict';import {test} from 'node:test';import {Factory} from '../../../../src/Dto/Query/Expression.mjs';
test('typed expressions are closed immutable descriptions without execution',()=>{
    const factory=new Factory();const result=factory.create({kind:'call',operator:'eq',args:[{kind:'attr',name:'active'},{kind:'value',type:{name:'boolean'},value:true}]});
    assert.ok(Object.isFrozen(result.args));assert.equal(result.args?.[1].type?.name,'boolean');assert.throws(()=>factory.create({kind:'attr',name:'id',dialect:'sql'}));
});
test('opaque runtime operands retain their original identity and remain unfrozen',()=>{
    class OpaqueValue {}
    const value=new OpaqueValue();
    const result=new Factory().create({kind:'value',value});
    assert.equal(result.value,value);
    assert.equal(Object.isFrozen(value),false);
});
