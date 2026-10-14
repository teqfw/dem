// @ts-nocheck
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {container} from '../TestEnv.mjs';
const entity={attributes:[
 {name:'id',type:{name:'identity',profile:{type:'int',capacity:'regular'}},nullable:false,generation:true},
 {name:'amount',type:{name:'decimal',params:{precision:12,scale:2,unsigned:false}},nullable:false,generation:false,default:'0'},
 {name:'name',type:{name:'text',params:{}},nullable:true,generation:false},
],primaryKey:['id'],uniqueKeys:{}};
test('portable access components resolve through actual DI',async()=>{
 const normalize=await container.get('TeqFw_Dem_Repository_Normalize$');
 const selection=await container.get('TeqFw_Dem_Dto_Query_Selection__Factory$');
 assert.deepEqual(normalize.record({entity,record:{id:12},mode:'create'}),{id:'12',amount:'0.00',name:null});
 const where={kind:'call',operator:'and',args:[
  {kind:'call',operator:'gte',args:[{kind:'attr',name:'amount'},{kind:'value',value:'1.2'}]},
  {kind:'call',operator:'not',args:[{kind:'call',operator:'isNull',args:[{kind:'attr',name:'name'}]}]},
 ]};
 const result=selection.create({entity,selection:{where,orderBy:[{attribute:'name',direction:'desc',nulls:'first'}],limit:2,offset:1}});
 assert.equal(result.where.args[0].args[1].value,'1.20');
 assert.deepEqual(result.orderBy,[{attribute:'name',direction:'desc',nulls:'first'},{attribute:'id',direction:'asc',nulls:'last'}]);
 assert.ok(Object.isFrozen(result.where.args[0].args[1]));
 assert.equal(where.args[0].args[1].value,'1.2');
 const provider=await container.get('TeqFw_Dem_Api_RepositoryProvider$');
 await assert.rejects(provider.get({path:'/app/user'}),{name:'DemRepositoryError',code:'UNSUPPORTED'});
});
test('logical values reject lossy and non-JSON input',async()=>{
 const normalize=await container.get('TeqFw_Dem_Repository_Normalize$');
 for(const record of [{id:1,amount:'1.001'},{id:1,amount:1.2},{id:1,name:undefined},{id:1,extra:1}]) assert.throws(()=>normalize.record({entity,record,mode:'create'}),{code:'INVALID_INPUT'});
 const identity={...entity.attributes[0],type:{name:'identity',profile:{type:'uuid'}}};
 assert.equal(normalize.value({attribute:identity,value:'ABCDEF12-3456-7890-ABCD-EF1234567890'}),'abcdef12-3456-7890-abcd-ef1234567890');
});
test('selection rejects unsupported types, malformed operators and mismatched literals',async()=>{
 const factory=await container.get('TeqFw_Dem_Dto_Query_Selection__Factory$');
 const eq=(name,value,type)=>({kind:'call',operator:'eq',args:[{kind:'attr',name},{kind:'value',value,...(type?{type}:{})}]});
 for(const where of [eq('amount','1',{name:'text'}),eq('missing','1'),{kind:'call',operator:'not',args:[]},{kind:'call',operator:'eq',args:[]}]) assert.throws(()=>factory.create({entity,selection:{where}}),{code:'INVALID_INPUT'});
 const keyless={attributes:[{name:'payload',type:{name:'json',params:{}},nullable:false,generation:false}],primaryKey:null,uniqueKeys:{}};
 assert.throws(()=>factory.create({entity:keyless,selection:{}}),{code:'UNSUPPORTED'});
 const composite={...entity,primaryKey:['amount','name']};
 const result=factory.create({entity:composite,selection:{}});
 assert.deepEqual(result.orderBy.map(o=>o.attribute),['amount','id','name']);
});
