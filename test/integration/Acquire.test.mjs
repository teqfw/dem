// @ts-check
import assert from 'node:assert/strict';import {test} from 'node:test';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';import {container} from '../TestEnv.mjs';
/** @type {TeqFw_Dem_Acquire} */ const acquire=await container.get('TeqFw_Dem_Acquire$');
/** @type {TeqFw_Dem_Compile} */ const compile=await container.get('TeqFw_Dem_Compile$');
/** @param {string} root @param {string} file @param {any} content */
async function write(root,file,content){await mkdir(join(root,file,'..'),{recursive:true});await writeFile(join(root,file),typeof content==='string'?content:JSON.stringify(content));}
/** @param {(root:string)=>Promise<void>} run */
async function fixture(run){const root=await mkdtemp(join(tmpdir(),'dem-acquire-'));try{await write(root,'package.json',{name:'host',dependencies:{plugin:'1.0.0'}});await write(root,'node_modules/plugin/package.json',{name:'plugin',version:'1.0.0'});await run(root);}finally{await rm(root,{recursive:true,force:true});}}
/** @param {string} root @param {string} code */
async function rejects(root,code){await assert.rejects(()=>acquire.exec({hostRoot:root}),(/** @type {any} */ e)=>e.name==='DemAcquisitionError'&&e.diagnostics.some((/** @type {any} */ d)=>d.code===code));}
test('real CLI package-registry mechanism acquires default and overridden paths and compiles the result',()=>fixture(async root=>{
    await write(root,'node_modules/plugin/package.json',{name:'plugin',version:'1.0.0',teqfw:{dem:{schema:'config//./schema.data',map:'missing-inactive.json'}}});
    await write(root,'node_modules/plugin/config/schema.data',{$format:1,'/vnd/item':{attributes:[{name:'id',type:{name:'identity'}}]}});
    await write(root,'etc/dem-map.json',{$format:1,sources:{plugin:{rename:{'/vnd/':'/app/'}}}});
    const result=await acquire.exec({hostRoot:root});assert.equal(result.schemas.length,1);assert.equal(result.schemas[0].filename,'config/schema.data');assert.equal(result.map?.packageName,'host');
    assert.ok((await compile.exec(result)).model.entities['/app/item']);
    const onlyHost=await acquire.exec({hostRoot:root,packageNames:['host']});assert.equal(onlyHost.schemas.length,0);assert.ok(onlyHost.map);
}));
test('missing implicit files are allowed, but explicit missing files and directories fail',()=>fixture(async root=>{
    assert.deepEqual(await acquire.exec({hostRoot:root}),{schemas:[]});
    await write(root,'node_modules/plugin/package.json',{name:'plugin',version:'1.0.0',teqfw:{dem:{schema:'missing.json'}}});await rejects(root,'DEM_FILE');
    await mkdir(join(root,'node_modules/plugin/missing.json'));await rejects(root,'DEM_FILE');
}));
test('malformed JSON, nested duplicates and invalid Unicode are acquisition errors',()=>fixture(async root=>{
    for(const raw of ['{"$format":1,"$format":1}','{"$format":1,"x":{"a":1,"\\u0061":2}}','[1,]','{"text":"\\ud800"}']){await write(root,'etc/dem-schema.json',raw);await rejects(root,'DEM_JSON');}
}));
test('invalid configuration is never treated as absent defaults',()=>fixture(async root=>{
    for(const config of [null,[],{schema:null},{schema:''},{schema:false},{schema:'../outside.json'},{schema:'/outside.json'},{schema:'https://example.com/schema.json'},{schema:'etc\\schema.json'},{schema:'.'},{schema:'a/../../outside.json'},{schem:'etc/schema.json'}]){
        await write(root,'package.json',{name:'host',dependencies:{plugin:'1.0.0'},teqfw:{dem:config}});await rejects(root,'DEM_CONFIG');
    }
}));
test('selection uses npm origins and rejects unknown names and invalid argument shapes',()=>fixture(async root=>{
    await assert.rejects(()=>acquire.exec({hostRoot:root,packageNames:['unknown']}),(/** @type {any} */ e)=>e.diagnostics[0].code==='DEM_DISCOVERY');
    await assert.rejects(()=>acquire.exec({hostRoot:root,packageNames:['host','host']}),(/** @type {any} */ e)=>e.diagnostics[0].code==='DEM_CONFIG');
}));
