// @ts-nocheck
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import Container from '@teqfw/di';
test('host preprocessor substitutes the provider contract without a persistence engine',async()=>{
 const root=await mkdtemp(join(tmpdir(),'dem-composition-'));
 try {
  await writeFile(join(root,'Preprocessor.mjs'),`export default function Producer() { return function (depId) { return depId.address === 'TeqFw_Dem_Api_RepositoryProvider' ? {...depId,address:'Host_Provider'} : depId; }; }`);
  // A resolution probe exposes no persistence operations or simulated stored state.
  await writeFile(join(root,'Provider.mjs'),`export default class Provider { constructor() { this.get = async function ({path}) { return {path}; }; } }`);
  const container=new Container({preprocessors:['Host_Preprocessor$']});
  container.addNamespaceRoot('TeqFw_Dem_',fileURLToPath(new URL('../../src',import.meta.url)),'.mjs');
  container.addNamespaceRoot('Host_',root,'.mjs');
  const provider=await container.get('TeqFw_Dem_Api_RepositoryProvider$');
  assert.deepEqual(await provider.get({path:'/app/item'}),{path:'/app/item'});
 } finally {await rm(root,{recursive:true,force:true});}
});
