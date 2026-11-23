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

test('relation cascade actions apply delete and key update effects before the next command',()=>{
    const model={entities:{
        '/app/account':{attributes:[{name:'id',type:{name:'integer'}}],primaryKey:['id'],uniqueKeys:{},relations:{}},
        '/app/item':{attributes:[{name:'id',type:{name:'integer'}},{name:'account_id',type:{name:'integer'}}],primaryKey:['id'],uniqueKeys:{},relations:{account:{attributes:['account_id'],onDelete:'cascade',onUpdate:'cascade',target:{path:'/app/account',attributes:['id']}}}},
    }};
    const rows={'/app/account':[{key:1,record:{id:'1'}}],'/app/item':[{key:2,record:{id:'2',account_id:'1'}}]};
    const originalChild=rows['/app/item'][0];
    const updated=batch.plan({model,rows,generate:()=>undefined,operations:[
        {path:'/app/account',method:'update',params:{key:{kind:'primary',values:{id:'1'}},changes:{id:'3'}}},
        {path:'/app/item',method:'read',params:{key:{kind:'primary',values:{id:'2'}}}},
    ]});
    assert.deepEqual(updated.results[1].record,{id:'2',account_id:'3'});
    assert.deepEqual(rows['/app/item'][0].record,{id:'2',account_id:'3'});
    assert.notEqual(rows['/app/item'][0],originalChild);
    assert.deepEqual(originalChild.record,{id:'2',account_id:'1'});
    const deleted=batch.plan({model,rows,generate:()=>undefined,operations:[
        {path:'/app/account',method:'delete',params:{key:{kind:'primary',values:{id:'3'}}}},
        {path:'/app/item',method:'list',params:{selection:{}}},
    ]});
    assert.equal(deleted.results[0].deleted,true);assert.deepEqual(deleted.results[1].records,[]);
});

test('restrict remains the default and a failed delete reports RELATION',()=>{
    const model={entities:{
        '/app/account':{attributes:[{name:'id',type:{name:'integer'}}],primaryKey:['id'],uniqueKeys:{},relations:{}},
        '/app/item':{attributes:[{name:'id',type:{name:'integer'}},{name:'account_id',type:{name:'integer'}}],primaryKey:['id'],uniqueKeys:{},relations:{account:{attributes:['account_id'],target:{path:'/app/account',attributes:['id']}}}},
    }};
    const rows={'/app/account':[{key:1,record:{id:'1'}}],'/app/item':[{key:2,record:{id:'2',account_id:'1'}}]};
    assert.throws(()=>batch.plan({model,rows,generate:()=>undefined,operations:[{path:'/app/account',method:'delete',params:{key:{kind:'primary',values:{id:'1'}}}}]}),{code:'RELATION'});
});
