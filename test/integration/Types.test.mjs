// @ts-check
import assert from 'node:assert/strict';import {test} from 'node:test';import {container} from '../TestEnv.mjs';
/** @type {TeqFw_Dem_Registry_CoreValue} */ const values=await container.get('TeqFw_Dem_Registry_CoreValue$');
/** @type {[Record<string,any>,unknown,unknown][]} */
const cases=[
 [{name:'binary',params:{length:2}},'AQI=','AQI='],[{name:'boolean'},true,true],[{name:'date'},'2024-02-29','2024-02-29'],
 [{name:'datetime'},'2024-01-01T12:00:00','2024-01-01T12:00:00.000'],[{name:'datetime',params:{timezone:true,precision:9}},'2024-01-01T02:00:00.123456789+02:00','2024-01-01T00:00:00.123456789Z'],
 [{name:'decimal',params:{precision:20,scale:2}},'9007199254740993.000','9007199254740993.00'],[{name:'enum',params:{values:['b','a']}},'a','a'],
 [{name:'integer',params:{bits:64,unsigned:true}},'18446744073709551615','18446744073709551615'],[{name:'json'},{'2':2,'1':1},{'1':1,'2':2}],
 [{name:'string',params:{length:1}},'🌍','🌍'],[{name:'text'},'text','text'],[{name:'uuid'},'12345678-ABCD-1234-1234-123456789ABC','12345678-abcd-1234-1234-123456789abc'],
 [{name:'vector',params:{dimensions:2,element:'bit'}},[0,1],[0,1]],
 [{name:'vector',params:{dimensions:3,element:'float',sparse:true}},{dimensions:3,entries:[{index:2,value:4},{index:0,value:1}]},{dimensions:3,entries:[{index:0,value:1},{index:2,value:4}]}],
];
for(const [type,value,expected] of cases)test('logical literal '+type.name+JSON.stringify(type.params??{}),()=>{
    const normalized=values.normalizeType({type});assert.ok(normalized);assert.deepEqual(values.normalizeValue({type:normalized,value}),expected);
});
test('invalid type parameters and literal values are rejected',()=>{
    for(const type of [{name:'integer',params:{bits:128}},{name:'identity',params:{bits:32}},{name:'vector',params:{dimensions:2,element:'bit',sparse:true}},{name:'enum',params:{values:['a','a']}},{name:'datetime',params:{precision:10}},{name:'string'},{name:'decimal',params:{precision:2,scale:3}},{name:'text',params:null}])assert.equal(values.normalizeType({type}),null);
    for(const [type,value] of /** @type {[any,any][]} */([[{name:'date'},'2023-02-29'],[{name:'datetime'},'2024-01-01T00:00:60'],[{name:'datetime',params:{timezone:true}},'2024-01-01T00:00:00+14:01'],[{name:'binary'},'AR=='],[{name:'integer',params:{bits:8}},128],[{name:'vector',params:{dimensions:2,element:'float',sparse:true}},{dimensions:2,entries:[{index:0,value:1},{index:0,value:2}]}]]))assert.equal(values.matches({type,value}),false);
});
