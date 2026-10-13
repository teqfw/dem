// @ts-check
import assert from 'node:assert/strict';import {test} from 'node:test';import Decode from '../../../../src/Compile/A/Decode.mjs';import {data,path,diagnostic} from '../../../Mocks.mjs';
const decode=new Decode(/** @type {any} */({data,path,diagnostic}));
test('decode validates independent documents and disallows old/physical fields',()=>{
    const envelope=(/** @type {any} */ document)=>({packageName:'p',filename:'schema.json',document});
    const good=decode.exec({schemas:[envelope({$format:1,'/app/item':{attributes:[{name:'id',type:{name:'identity'}}]}})]});assert.deepEqual(good.diagnostics,[]);assert.ok(good.schemas[0].nodes['/app/item']);
    assert.equal(decode.exec({schemas:[envelope({version:2})]}).diagnostics[0].code,'DEM_FORMAT');
    assert.equal(decode.exec({schemas:[envelope({$format:1,'/app/item':{attributes:[{name:'id',type:{name:'identity'},storage:{}}]}})]}).diagnostics[0].code,'DEM_FORMAT');
});
