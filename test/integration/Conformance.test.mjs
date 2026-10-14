// @ts-nocheck
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {register,schema} from '../../conformance/Repository.mjs';
import {container} from '../TestEnv.mjs';
test('backend conformance fixture compiles without altering logical compiler',async()=>{
 const compile=await container.get('TeqFw_Dem_Compile$');
 const result=await compile.exec({schemas:[{packageName:'@contract/backend',filename:'fixture.json',document:structuredClone(schema)}]});
 compile.assertResult({value:result});
 assert.deepEqual(result.model.entities['/contract/item'].uniqueKeys.grouped,['group','rank']);
 assert.equal(result.model.entities['/contract/child'].attributes[1].type.profile.type,'int');
});
test('suite registers behavioral cases and always closes an opened fixture after failure',async()=>{
 const registered=[]; let closed=0;
 register({test:(name,body)=>registered.push({name,body}),assert,open:async()=>({provider:{get:async()=>{throw new Error('Injected harness failure');}},close:async()=>{closed++;}})});
 assert.equal(registered.length,10);
 assert.equal(new Set(registered.map(t=>t.name)).size,registered.length);
 await assert.rejects(registered[0].body());
 assert.equal(closed,1);
});
