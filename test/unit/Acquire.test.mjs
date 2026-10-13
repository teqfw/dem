// @ts-check
import assert from 'node:assert/strict';import {test} from 'node:test';import Acquire from '../../src/Acquire.mjs';import {data,diagnostic} from '../Mocks.mjs';
test('acquisition rejects invalid metadata before attempting declaration reads',async()=>{
    let reads=0;
    const acquire=new Acquire(/** @type {any} */({data,diagnostic:{...diagnostic,error:(/** @type {any} */ diagnostics)=>Object.assign(new Error('invalid'),{diagnostics})},path:{isAbsolute:()=>true,resolve:(/** @type {string} */ x)=>x},packageRegistry:class {build(){return [{rootAbs:'/app',packageJson:{name:'host',teqfw:{dem:{schema:null}}}}];}},fs:{readFile(){reads++;}}}));
    await assert.rejects(()=>acquire.exec({hostRoot:'/app'}),(/** @type {any} */ e)=>e.diagnostics[0].code==='DEM_CONFIG');assert.equal(reads,0);
});
