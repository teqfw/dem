// @ts-check
import assert from 'node:assert/strict';import {test} from 'node:test';import Compose from '../../../../src/Compile/A/Compose.mjs';import {data,path,diagnostic,work} from '../../../Mocks.mjs';
test('compose retains origin correspondence and rejects entity overwrite',()=>{
    const state=/** @type {any} */(work());
    const schema=(/** @type {string} */ name)=>({source:{packageName:name,filename:'schema.json'},dependencies:{},packages:new Set(),nodes:{'/app/item':{raw:{attributes:[]},pointer:'/~1app~1item'}}});
    state.schemas=[schema('a'),schema('b')];state.map.sources={b:{rename:{'/app/item':'/app/other'}}};
    const component=new Compose(/** @type {any} */({data,path,diagnostic}));component.exec(state);assert.deepEqual(Object.keys(state.entities),['/app/item','/app/other']);assert.equal(state.schemas[1].correspondence['/app/item'],'/app/other');
    const collision=/** @type {any} */(work());collision.schemas=[schema('a'),schema('b')];component.exec(collision);assert.equal(collision.diagnostics[0].code,'DEM_COLLISION');
});
