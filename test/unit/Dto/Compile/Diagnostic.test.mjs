// @ts-check
import assert from 'node:assert/strict';import {test} from 'node:test';import Diagnostic from '../../../../src/Dto/Compile/Diagnostic.mjs';import {data} from '../../../Mocks.mjs';
test('diagnostics sort by code/source, deduplicate, and fail without a model',()=>{
    const factory=new Diagnostic({data:/** @type {any} */(data)});
    const a=factory.create('A',null),b=factory.create('B',{packageName:'p',filename:'schema.json'});
    const error=factory.error([b,a,b]);assert.equal(error.name,'DemCompilationError');assert.deepEqual(error.diagnostics,[a,b]);assert.equal('model' in error,false);
});
