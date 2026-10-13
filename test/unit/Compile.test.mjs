// @ts-check
import assert from 'node:assert/strict';import {test} from 'node:test';import Compile from '../../src/Compile.mjs';
test('orchestrator stops on diagnostics and authenticates only its own results',async()=>{
    /** @type {string[]} */ const calls=[];const state={diagnostics:[],provenance:{}};const pass=(/** @type {string} */ name)=>(/** @type {any} */ value)=>{calls.push(name);return value;};
    const compiler=new Compile(/** @type {any} */({decode:{exec:()=>state},compose:{exec:pass('compose')},resolve:{exec:pass('resolve')},validate:{exec:pass('validate')},canonical:{exec:()=>({domain:'test'})},graph:{exec:()=>({})},fingerprint:{exec:()=> 'hash'},data:{serialize:JSON.stringify,freeze:(/** @type {any} */ x)=>x},diagnostic:{error:()=>new Error('invalid')}}));
    const result=await compiler.exec({schemas:[]});assert.equal(compiler.assertResult({value:result}),result);assert.throws(()=>compiler.assertResult({value:{...result}}));assert.deepEqual(calls,['compose','resolve','validate']);
    state.diagnostics.push(/** @type {never} */({}));calls.length=0;await assert.rejects(()=>compiler.exec({schemas:[]}),/invalid/);assert.deepEqual(calls,[]);
});
