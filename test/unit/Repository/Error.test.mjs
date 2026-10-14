// @ts-nocheck
import assert from 'node:assert/strict';
import {test} from 'node:test';
import Errors from '../../../src/Repository/Error.mjs';
test('portable errors retain standard Error and stable code',()=>{
 const error=new Errors().create({code:'CONFLICT',message:'Duplicate key.'});
 assert.ok(error instanceof Error); assert.equal(error.name,'DemRepositoryError');assert.equal(error.code,'CONFLICT');assert.equal(error.message,'Duplicate key.');
});
