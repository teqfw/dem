// @ts-check
import assert from 'node:assert/strict';import {test} from 'node:test';import Validate from '../../../../src/Compile/A/Validate.mjs';import {data,path,diagnostic,work} from '../../../Mocks.mjs';
test('identity derives an int/regular profile and primary key, not generation',()=>{
    const state=/** @type {any} */(work());state.entities={'/app/user':{schema:{source:{packageName:'p',filename:'schema.json'}},pointer:'',raw:{attributes:[{name:'id',type:{name:'identity'}}]},relations:{}}};
    const model=new Validate(/** @type {any} */({data,path,diagnostic,values:{normalizeType:(/** @type {any} */ {type})=>({...type,params:{}})}})).exec(state);
    assert.deepEqual(model.entities['/app/user'].primaryKey,['id']);assert.deepEqual(model.entities['/app/user'].attributes[0],{name:'id',nullable:false,generation:false,type:{name:'identity',profile:{type:'int',capacity:'regular'}}});
});
