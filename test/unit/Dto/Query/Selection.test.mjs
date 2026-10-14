// @ts-nocheck
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Factory} from '../../../../src/Dto/Query/Selection.mjs';
const errors={create:({code,message})=>Object.assign(new Error(message),{code})};
const entity={attributes:[{name:'id',type:{name:'integer',params:{bits:32,unsigned:false}},nullable:false},{name:'name',type:{name:'text',params:{}},nullable:true}],primaryKey:['id'],uniqueKeys:{}};
const factory=new Factory({errors,expression:{create:v=>structuredClone(v)},normalize:{value:({value})=>String(value)},data:{isObject:v=>v!==null&&typeof v==='object'&&!Array.isArray(v),serialize:JSON.stringify,freeze:Object.freeze}});
test('pagination and tie breaking have explicit defaults',()=>{
 assert.deepEqual({...factory.create({entity,selection:{}})},{where:undefined,orderBy:[{attribute:'id',direction:'asc',nulls:'last'}],limit:null,offset:0});
 assert.equal(factory.create({entity,selection:{limit:0}}).limit,0);
 for(const selection of [{limit:-1},{offset:0.5},{limit:Number.MAX_SAFE_INTEGER+1},{execution:{}},{orderBy:[{attribute:'name',direction:'asc'}]}]) assert.throws(()=>factory.create({entity,selection}),{code:'INVALID_INPUT'});
});
test('closed boolean operators and exact entity attributes',()=>{
 const where={kind:'call',operator:'eq',args:[{kind:'attr',name:'id'},{kind:'value',value:12}]};
 assert.equal(factory.create({entity,selection:{where}}).where.args[1].value,'12');
 assert.throws(()=>factory.create({entity,selection:{where:{...where,operator:'sql'}}}),{code:'UNSUPPORTED'});
 assert.throws(()=>factory.create({entity,selection:{where:{kind:'attr',name:'id'}}}),{code:'INVALID_INPUT'});
 assert.throws(()=>factory.create({entity,selection:{where:{...where,args:[{kind:'attr',name:'missing'},where.args[1]]}}}),{code:'INVALID_INPUT'});
});
