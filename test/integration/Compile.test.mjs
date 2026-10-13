// @ts-check
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHash} from 'node:crypto';
import {container} from '../TestEnv.mjs';
import {scenario} from '../browser/Scenario.mjs';
/** @type {TeqFw_Dem_Compile} */ const compiler=await container.get('TeqFw_Dem_Compile$');
const envelope=(/** @type {any} */ document,packageName='p')=>({packageName,filename:'etc/dem-schema.json',document});
const identity=()=>({name:'id',type:{name:'identity'}});
/** @param {any} input @param {string} code */
async function rejects(input,code){await assert.rejects(()=>compiler.exec(input),(/** @type {any} */ error)=>{
    assert.equal(error.name,'DemCompilationError');assert.ok(Object.isFrozen(error.diagnostics));assert.equal('model' in error,false);return error.diagnostics.some((/** @type {any} */ d)=>d.code===code);
});}

test('canonical goldens match independent SHA-256 and immutable authenticated output',async()=>{
    const empty=await compiler.exec({schemas:[]});assert.equal(empty.fingerprint,'dem-sha256-1:0f445bf2de907b4ef36892aa3062ef1cea26f1a3dcc2318a22323e557764edc5');
    const document={$format:1,'/app/item':{attributes:[identity()]}};
    const result=await compiler.exec({schemas:[envelope(document)]});
    const raw='{"domain":"dem-logical-1","entities":{"/app/item":{"attributes":{"id":{"generation":false,"nullable":false,"type":{"name":"identity","profile":{"capacity":"regular","type":"int"}}}},"indexes":{},"primaryKey":["id"],"relations":{},"uniqueKeys":{}}}}';
    assert.equal(result.fingerprint,'dem-sha256-1:165e549f6919da2ef8b49b7eca967f83500b0df8a3de1ff4967883663a8bff73');
    assert.equal(result.fingerprint,'dem-sha256-1:'+createHash('sha256').update(raw).digest('hex'));
    assert.deepEqual(result.canonical,JSON.parse(raw));assert.deepEqual(result.model.packages,['/','/app/']);
    assert.deepEqual(result.graph,{edges:[],components:[['/app/item']]});assert.equal(compiler.assertResult({value:result}),result);
    assert.throws(()=>compiler.assertResult({value:structuredClone(result)}));assert.ok(Object.isFrozen(result.model.entities['/app/item'].attributes[0].type.profile));
    assert.deepEqual(document,{$format:1,'/app/item':{attributes:[identity()]}});
});

test('explicit dependency aliases bind to shared or separate identities and inherit each host profile',async()=>{
    for(const profile of [{type:'int',capacity:'small'},{type:'int',capacity:'regular'},{type:'int',capacity:'large'},{type:'uuid'}]){
        const input=/** @type {any} */(scenario());input.map.document.identityProfiles['/app/accounts/user'].user_key=/** @type {any} */(profile);
        const result=await compiler.exec(input);
        for(const [address,name] of [['/app/sale/order','user_id'],['/vnd/customer/address','owner_id']]){
            const entity=result.model.entities[address];assert.deepEqual(entity.attributes.find(a=>a.name===name)?.type.profile,profile);
            assert.deepEqual(Object.values(entity.relations)[0].target,{path:'/app/accounts/user',attributes:['user_key']});
        }
        assert.equal(result.model.entities['/app/sale/order'].attributes[1].generation,false);
    }
    const input=/** @type {any} */(scenario());input.schemas[0].document['/vnd/accounts/operator']=/** @type {any} */({attributes:[{name:'operator_key',type:{name:'identity'},generation:true}]});
    input.map.document.sources['@example/customer'].bind.user={path:'/app/accounts/operator',attributes:{id:'operator_key'}};
    const result=await compiler.exec(input);
    assert.deepEqual(result.model.entities['/vnd/customer/address'].attributes[1].type.profile,{type:'int',capacity:'regular'});
    assert.equal(result.model.entities['/app/accounts/operator'].attributes[0].generation,true);
    assert.equal(result.model.entities['/vnd/customer/address'].attributes[1].generation,false);
});

test('path moves preserve original relative dependencies and permit equal package/entity basenames',async()=>{
    const doc={$format:1,'/sales/order':{attributes:[identity(),{name:'customer_id',type:{name:'ref'}}],relations:{customer:{attributes:['customer_id'],target:{path:'customer',attributes:['id']}}}},'/sales/customer':{attributes:[identity()]},'/archive/customer':{attributes:[identity()]},'/sales/customer/':{},'/sales/customer/note':{attributes:[identity()]}};
    const input={schemas:[envelope(doc)],map:envelope({$format:1,sources:{p:{rename:{'/sales/order':'/archive/order','/sales/customer':'/accounts/customer'}}}})};
    const result=await compiler.exec(input);
    assert.equal(result.model.entities['/archive/order'].relations.customer.target.path,'/accounts/customer');assert.ok(result.model.packages.includes('/sales/customer/'));
    const up=envelope({$format:1,'/vnd/sales/order':{attributes:[identity(),{name:'owner',type:{name:'ref'}}],relations:{r:{attributes:['owner'],target:{path:'../customer',attributes:['id']}}}},'/vnd/customer':{attributes:[identity()]}});
    assert.equal((await compiler.exec({schemas:[up]})).model.entities['/vnd/sales/order'].relations.r.target.path,'/vnd/customer');
});

test('package paths merge, entity collisions require remapping, and renames are simultaneous',async()=>{
    const a=envelope({$format:1,'/app/item':{attributes:[identity()]}},'a'),b=envelope({$format:1,'/app/item':{attributes:[identity()]}},'b');
    await rejects({schemas:[a,b]},'DEM_COLLISION');
    const result=await compiler.exec({schemas:[a,b],map:envelope({$format:1,sources:{b:{rename:{'/app/':'/other/'}}}})});
    assert.deepEqual(Object.keys(result.model.entities),['/app/item','/other/item']);
    const swapped=await compiler.exec({schemas:[envelope({$format:1,'/app/a':{attributes:[identity()]},'/app/b':{attributes:[{name:'code',type:{name:'identity'}}]}})],map:envelope({$format:1,sources:{p:{rename:{'/app/a':'/app/b','/app/b':'/app/a'}}}})});
    assert.equal(swapped.model.entities['/app/a'].attributes[0].name,'code');
});

test('fingerprints ignore assembly, projection order, enum order, empty packages and equivalent defaults',async()=>{
    const first=scenario(),second=/** @type {any} */(scenario());second.schemas.reverse();second.schemas[0].document.$comment='comment';
    const before=await compiler.exec(first),after=await compiler.exec(second);assert.equal(before.fingerprint,after.fingerprint);assert.deepEqual(before,after);
    const base={$format:1,'/app/item':{attributes:[identity(),{name:'state',type:{name:'enum',params:{values:['new','done']}}}]}};
    const reordered=/** @type {any} */(structuredClone(base));reordered['/app/item'].attributes.reverse();reordered['/app/item'].primaryKey=/** @type {any} */(['id']);reordered['/empty/']=/** @type {any} */({});reordered['/app/item'].attributes[0].type.params=/** @type {any} */({values:['done','new']});
    const x=await compiler.exec({schemas:[envelope(base)]}),y=await compiler.exec({schemas:[envelope(reordered)]});assert.equal(x.fingerprint,y.fingerprint);assert.notDeepEqual(x.model,y.model);
    const explicit=await compiler.exec({schemas:[envelope(base)],map:envelope({$format:1,identityProfiles:{'/app/item':{id:{type:'int',capacity:'regular'}}}})});assert.equal(explicit.fingerprint,x.fingerprint);
});

test('keys preserve order; equivalent identity key succeeds and composite primary keys need no identity',async()=>{
    const doc={$format:1,'/app/pair':{attributes:[{name:'a',type:{name:'integer'}},{name:'b',type:{name:'integer'}}],primaryKey:['a','b'],indexes:{lookup:{attributes:['b','a']}}}};
    const a=await compiler.exec({schemas:[envelope(doc)]});doc['/app/pair'].primaryKey.reverse();const b=await compiler.exec({schemas:[envelope(doc)]});assert.notEqual(a.fingerprint,b.fingerprint);
    await rejects({schemas:[envelope({$format:1,'/item':{attributes:[identity(),{name:'code',type:{name:'text'}}],primaryKey:['code']}})]},'DEM_KEY');
    await rejects({schemas:[envelope({$format:1,'/item':{attributes:[{name:'code',type:{name:'text'},nullable:true}],primaryKey:['code']}})]},'DEM_KEY');
});

test('independent structural errors aggregate and invalid dependencies/types have source-linked diagnostics',async()=>{
    const a=envelope({$format:2},'a'),b=envelope({$format:3},'b');
    await assert.rejects(()=>compiler.exec({schemas:[b,a]}),(/** @type {any} */ error)=>{assert.equal(error.diagnostics.length,2);assert.deepEqual(error.diagnostics.map((/** @type {any} */ d)=>d.source.packageName),['a','b']);return true;});
    const missing=/** @type {any} */(scenario());delete missing.map.document.sources['@example/sale'].bind.user;await rejects(missing,'DEM_DEPENDENCY');
    const absent=/** @type {any} */(scenario());absent.map.document.sources['@example/sale'].bind.user.path='/not_here';await rejects(absent,'DEM_TARGET');
    const concrete=/** @type {any} */(scenario());concrete.schemas[0].document['/vnd/accounts/user'].attributes[0].type.name='integer';delete concrete.map.document.identityProfiles['/app/accounts/user'];await rejects(concrete,'DEM_IDENTITY');
    const twice=/** @type {any} */(scenario());twice.schemas[1].document['/vnd/sale/order'].relations.other=/** @type {any} */(structuredClone(twice.schemas[1].document['/vnd/sale/order'].relations.owner));await rejects(twice,'DEM_RELATION');
    await rejects({schemas:[envelope({$format:1,'/../../item':{attributes:[identity()]}})]},'DEM_PATH');
    await rejects({schemas:[envelope({$format:1,'/item':{attributes:[identity(),{name:'other',type:{name:'identity'}}]}})]},'DEM_IDENTITY');
    await rejects({schemas:[envelope({$format:1,'/item':{attributes:[{...identity(),nullable:true}]}})]},'DEM_IDENTITY');
    await rejects({schemas:[envelope({$format:1,'/item':{attributes:[{name:'value',type:{name:'integer'},generation:true,default:1}]}})]},'DEM_TYPE');
    await rejects({schemas:[envelope({$format:1,'/item':{attributes:[{name:'value',type:{name:'text'},default:null}]}})]},'DEM_TYPE');
    await rejects({schemas:[],map:envelope({$format:1,sources:{unknown:{}}})},'DEM_MAP');
    await rejects({schemas:[envelope({$format:1,'/item':{attributes:[identity()]}})],map:envelope({$format:1,identityProfiles:{'/item':{id:{type:'uuid',capacity:'large'}}}})},'DEM_TYPE');
});

test('cycles, optional defaults and significant relation/index ordering remain logical content',async()=>{
    const doc={$format:1,'/app/a':{attributes:[identity(),{name:'other',type:{name:'ref'},nullable:true}],relations:{r:{attributes:['other'],target:{path:'b',attributes:['id']}}}},'/app/b':{attributes:[identity(),{name:'other',type:{name:'ref'}}],relations:{r:{attributes:['other'],target:{path:'a',attributes:['id']}}}}};
    const result=await compiler.exec({schemas:[envelope(doc)]});assert.deepEqual(result.graph.components,[['/app/a','/app/b']]);
    const attributes=[{name:'value',type:{name:'text'},nullable:true}];
    const absent=await compiler.exec({schemas:[envelope({$format:1,'/item':{attributes}})]});
    const withNull=await compiler.exec({schemas:[envelope({$format:1,'/item':{attributes:[{...attributes[0],default:null}]}})]});assert.notEqual(absent.fingerprint,withNull.fingerprint);
    const composite={
        $format:1,
        '/app/pair':{attributes:[{name:'a',type:{name:'integer'}},{name:'b',type:{name:'integer'}}],primaryKey:['a','b']},
        '/app/link':{attributes:[{name:'a',type:{name:'integer'}},{name:'b',type:{name:'integer'}}],relations:{r:{attributes:['a','b'],target:{path:'pair',attributes:['a','b']}}}},
        '/app/indexed':{attributes:[{name:'a',type:{name:'integer'}},{name:'b',type:{name:'integer'}}],indexes:{lookup:{attributes:['a','b']}}},
    };
    const x=await compiler.exec({schemas:[envelope(composite)]});composite['/app/indexed'].indexes.lookup.attributes.reverse();const y=await compiler.exec({schemas:[envelope(composite)]});assert.notEqual(x.fingerprint,y.fingerprint);
    composite['/app/link'].relations.r.attributes.reverse();const z=await compiler.exec({schemas:[envelope(composite)]});assert.notEqual(z.fingerprint,y.fingerprint);
});

test('own-member semantics are safe for reserved JavaScript property names',async()=>{
    const input=/** @type {any} */(scenario());
    const source=input.schemas[1].document;
    source.$dependencies=Object.fromEntries([['__proto__',{attributes:['constructor']}] ]);
    source['/vnd/sale/order'].relations.owner.target={dependency:'__proto__',attributes:['constructor']};
    input.map.document.sources['@example/sale'].bind=Object.fromEntries([['__proto__',{path:'/app/accounts/user',attributes:{constructor:'user_key'}}]]);
    const result=await compiler.exec(input);assert.equal(result.model.entities['/app/sale/order'].relations.owner.target.attributes[0],'user_key');
    assert.equal(Reflect.get({},'polluted'),undefined);
    await rejects({schemas:[envelope({$format:1,'/item':{attributes:[{name:'value',type:{name:'constructor'}}]}})]},'DEM_TYPE');
});

test('ambiguous map/path rules, physical fields and JSON-loss inputs fail explicitly',async()=>{
    const schemas=[envelope({$format:1,'/app/item':{attributes:[identity()]}})];
    await rejects({schemas,map:envelope({$format:1,sources:{p:{rename:{'/app/':'/one/','/app/item':'/two/item'}}}})},'DEM_MAP');
    await rejects({schemas,map:envelope({$format:1,sources:{p:{rename:{'/missing':'/other'}}}})},'DEM_MAP');
    await rejects({schemas,map:envelope({$format:1,namespace:'sql'})},'DEM_FORMAT');
    await rejects({schemas:[envelope({$format:1,'/app/item':{attributes:[identity()],indexes:{bad:{attributes:['missing']}}}})]},'DEM_KEY');
    await rejects({schemas:[envelope({$format:1,'/app//item':{attributes:[identity()]},'/app/item':{attributes:[identity()]}})]},'DEM_PATH');
    await rejects({schemas:[envelope({$format:1,'/app/item':{attributes:[identity(),{name:'dangling',type:{name:'ref'}}]}})]},'DEM_RELATION');
    await rejects({schemas,map:null},'DEM_INPUT');
    await rejects({schemas:[envelope({$format:1,$comment:undefined})]},'DEM_INPUT');
});
