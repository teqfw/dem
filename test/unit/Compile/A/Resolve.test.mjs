// @ts-check
import assert from 'node:assert/strict';import {test} from 'node:test';import Resolve from '../../../../src/Compile/A/Resolve.mjs';import {data,path,diagnostic,work} from '../../../Mocks.mjs';
test('resolve requires explicit bindings even when provider names coincide',()=>{
    const state=/** @type {any} */(work());const schema={source:{packageName:'sale',filename:'schema.json'},dependencies:{user:{attributes:['id']}},bindings:{},correspondence:{}};
    state.schemas=[schema];state.entities={'/app/user':{schema,original:'/app/user',pointer:'',raw:{attributes:[{name:'id'}],relations:{}}}};
    new Resolve(/** @type {any} */({data,path,diagnostic})).exec(state);assert.equal(state.diagnostics[0].code,'DEM_DEPENDENCY');
});
