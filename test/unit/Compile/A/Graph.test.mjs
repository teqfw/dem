// @ts-check
import assert from 'node:assert/strict';import {test} from 'node:test';import Graph from '../../../../src/Compile/A/Graph.mjs';
test('cycles remain valid and graph ordering is independent of declaration order',()=>{
    /** @param {string} target @returns {TeqFw_Dem_Entity} */
    const entity=target=>({attributes:[],primaryKey:null,uniqueKeys:{},indexes:{},relations:{r:{attributes:[],onDelete:'restrict',onUpdate:'restrict',target:{path:target,attributes:[]}}}});
    assert.deepEqual(new Graph().exec({packages:[],entities:{'/b':entity('/a'),'/a':entity('/b')}}),{edges:[{from:'/a',to:'/b'},{from:'/b',to:'/a'}],components:[['/a','/b']]});
});
