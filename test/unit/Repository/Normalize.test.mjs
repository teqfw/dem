// @ts-nocheck
import assert from 'node:assert/strict';
import {test} from 'node:test';
import Normalize from '../../../src/Repository/Normalize.mjs';
const errors={create:({code,message})=>Object.assign(new Error(message),{name:'DemRepositoryError',code})};
const entity={attributes:[{name:'id',type:{name:'identity',profile:{type:'int'}},nullable:false,generation:true},{name:'title',type:{name:'text'},nullable:false,generation:false,default:'new'},{name:'note',type:{name:'text'},nullable:true,generation:false}],primaryKey:['id'],uniqueKeys:{title:['title']}};
const normalize=new Normalize({errors,data:{isObject:v=>v!==null&&typeof v==='object'&&!Array.isArray(v),serialize:JSON.stringify},values:{normalizeValue:({value})=>structuredClone(value)}});
test('create defaults and generation omissions; complete records require every field',()=>{
 assert.deepEqual(normalize.record({entity,record:{},mode:'create'}),{title:'new',note:null});
 assert.throws(()=>normalize.record({entity,record:{id:1,title:'a'},mode:'complete'}),{code:'INVALID_INPUT'});
 assert.throws(()=>normalize.record({entity,record:{extra:1},mode:'create'}),{code:'INVALID_INPUT'});
});
test('updates are patches and keys are exact',()=>{
 assert.deepEqual(normalize.record({entity,record:{note:null},mode:'update'}),{note:null});
 for(const record of [{},{id:2},{title:null}]) assert.throws(()=>normalize.record({entity,record,mode:'update'}),{code:'INVALID_INPUT'});
 assert.deepEqual(normalize.key({entity,key:{kind:'primary',values:{id:12}}}),{kind:'primary',values:{id:'12'}});
 for(const key of [{kind:'primary',values:{id:null}},{kind:'primary',values:{id:1,title:'x'}},{kind:'unique',name:'missing',values:{title:'a'}}]) assert.throws(()=>normalize.key({entity,key}),{code:'INVALID_INPUT'});
});
test('identity values use exact positive strings and uuid delegation',()=>{
 const attribute=entity.attributes[0];
 for(const value of [0,-1,'01','-1','0',1.2,Number.MAX_SAFE_INTEGER+1]) assert.throws(()=>normalize.value({attribute,value}),{code:'INVALID_INPUT'});
 assert.equal(normalize.value({attribute,value:'18446744073709551616'}),'18446744073709551616');
});
