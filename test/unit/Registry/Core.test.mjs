// @ts-check
import assert from 'node:assert/strict';import {test} from 'node:test';import Core from '../../../src/Registry/Core.mjs';import {data} from '../../Mocks.mjs';
test('core defines logical defaults, not provider-specific hints or generators',()=>{
    const core=new Core({data:/** @type {any} */(data)});assert.equal(core.types.integer.defaults.bits,32);assert.deepEqual(core.types.identity.allowed,[]);assert.deepEqual(core.types.ref.allowed,[]);assert.equal('generations' in core,false);
});
