// @ts-nocheck
import {test} from 'node:test';
import assert from 'node:assert/strict';
import Batch from '../../../src/Repository/Batch.mjs';
const model={entities:{'/app/item':{attributes:[{name:'id',type:{name:'identity'},generation:true},{name:'name',type:{name:'text'}}],primaryKey:['id'],uniqueKeys:{},relations:{}}}};
const batch=new Batch({
    errors:{create:({code,message})=>Object.assign(new Error(message),{code})},
    data:{isObject:v=>v!==null&&typeof v==='object'&&!Array.isArray(v),serialize:JSON.stringify},
    normalize:{record:({record})=>structuredClone(record),key:({key})=>structuredClone(key)},
    selection:{create:({selection})=>selection},select:{exec:({records})=>({records:structuredClone(records)})},
});
test('validates all commands before touching the private snapshot',()=>{
    const rows={'/app/item':[]};
    assert.throws(()=>batch.plan({model,rows,generate:()=>assert.fail('unexpected generation'),operations:[{path:'/app/item',method:'create',params:{record:{name:'a'}}},{path:'/app/item',method:'unknown',params:{}}]}),{code:'INVALID_INPUT'});
    assert.deepEqual(rows,{'/app/item':[]});
    assert.throws(()=>batch.validate({model,operations:new Array(1)}),{code:'INVALID_INPUT'});
});
test('planned results are snapshots rather than aliases to later commands',()=>{
    const rows={'/app/item':[]};
    const result=batch.plan({model,rows,generate:()=> '1',operations:[
        {path:'/app/item',method:'create',params:{record:{name:'a'}}},
        {path:'/app/item',method:'update',params:{key:{kind:'primary',values:{id:'1'}},changes:{name:'b'}}},
        {path:'/app/item',method:'read',params:{key:{kind:'primary',values:{id:'1'}}}},
    ]});
    assert.equal(result.results[0].record.name,'a');assert.equal(result.results[2].record.name,'b');
    result.results[2].record.name='local';assert.equal(rows['/app/item'][0].record.name,'b');
});
