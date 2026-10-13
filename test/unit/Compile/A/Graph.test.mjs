// @ts-check
import assert from 'node:assert/strict';import {test} from 'node:test';import Graph from '../../../../src/Compile/A/Graph.mjs';
test('cycles remain valid and graph ordering is independent of declaration order',()=>{
    const entity=(/** @type {string} */ target)=>({attributes:[],primaryKey:null,uniqueKeys:{},indexes:{},relations:{r:{attributes:[],target:{path:target,attributes:[]}}}});
    assert.deepEqual(new Graph().exec({packages:[],entities:{'/b':entity('/a'),'/a':entity('/b')}}),{edges:[{from:'/a',to:'/b'},{from:'/b',to:'/a'}],components:[['/a','/b']]});
});
