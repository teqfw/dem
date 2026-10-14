// @ts-nocheck
import assert from 'node:assert/strict';
import {test} from 'node:test';
import Repository from '../../../src/Api/Repository.mjs';
test('unselected implementation rejects all five operations', async()=>{
 const repo=new Repository({errors:{create:({code,message})=>Object.assign(new Error(message),{code})}});
 for (const [name,args] of Object.entries({create:{record:{}},read:{key:{}},update:{key:{},changes:{}},delete:{key:{}},list:{selection:{}}})) await assert.rejects(repo[name](args),{code:'UNSUPPORTED'});
 assert.equal(repo.createMany,undefined);
});
