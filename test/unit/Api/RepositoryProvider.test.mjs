// @ts-nocheck
import assert from 'node:assert/strict';
import {test} from 'node:test';
import Provider from '../../../src/Api/RepositoryProvider.mjs';
test('unselected provider fails explicitly',async()=>{
 const provider=new Provider({errors:{create:({code,message})=>Object.assign(new Error(message),{code})}});
 await assert.rejects(provider.get({path:'/app/user'}),{code:'UNSUPPORTED'});
});
