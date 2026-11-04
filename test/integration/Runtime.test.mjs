// @ts-check
import assert from 'node:assert/strict';
import {test} from 'node:test';
import Container from '@teqfw/di';
import {fileURLToPath} from 'node:url';

const source = fileURLToPath(new URL('../../src', import.meta.url));
const makeContainer = () => new Container({namespaces:[{prefix:'TeqFw_Dem_',target:source,defaultExt:'.mjs'}]});
const tokenDefinition = {
    name:'example.Token16', parameters:{},
    normalizeParams:(/** @type {Record<string,any>} */ params) => { if (Object.keys(params).length) throw new TypeError(); return {}; },
    valueDomain:'A fixed 16-byte token.', preservation:'Preserve all bytes.', valueHandling:'Validate and copy byte arrays.',
    equality:'Bytewise equality.', ordering:'Unsigned lexicographic byte order.',
};
const schema = (/** @type {string} */ name) => ({packageName:'runtime-test',filename:'schema.json',document:{$format:2,$namespace:'/test/',[name]:{attributes:[{name:'id',type:{name:'integer'}},{name:'token',type:{name:'example.Token16'}}],primaryKey:['id'],uniqueKeys:{by_token:['token']}}}});
const eq = (/** @type {Uint8Array} */ value) => ({kind:'call',operator:'eq',args:[{kind:'attr',name:'token'},{kind:'value',type:{name:'example.Token16'},value}]});

test('Token16 flows through Registry, Compiler, binding, Normalize, Selection and Select', async () => {
    const container=makeContainer();
    container.addNamespaceRoot('Runtime_Test_',fileURLToPath(new URL('../fixtures/Runtime',import.meta.url)),'.mjs');
    const registry=await container.get('TeqFw_Dem_Registry$');
    registry.register([tokenDefinition]);
    registry.finalize();
    const compiler=await container.get('TeqFw_Dem_Compile$');
    const runtime=await container.get('TeqFw_Dem_Repository_Runtime$');
    const selectedHandler=await container.get('Runtime_Test_Token16__default');
    const firstCompiled=await compiler.exec({schemas:[schema('first')]});
    const secondCompiled=await compiler.exec({schemas:[schema('second')]});
    const first=runtime.bind({model:firstCompiled.model,registry,handlers:[selectedHandler]});
    const second=runtime.bind({model:secondCompiled.model,registry,handlers:[selectedHandler]});
    const firstEntity=first.model.entities['/test/first'];
    const secondEntity=second.model.entities['/test/second'];
    const a=new Uint8Array(16); a[0]=1;
    const b=new Uint8Array(16); b[0]=2;
    const later=new Uint8Array(16); later[0]=3;
    const captured=first.selection.create({entity:firstEntity,selection:{where:eq(a)}});
    a[0]=9;
    const exposed=captured.where.args[1].value;
    exposed[0]=8;
    assert.equal(captured.where.args[1].value[0],1);
    const same=new Uint8Array(16); same[0]=1;
    const firstRows=[{id:'1',token:b},{id:'2',token:later},{id:'3',token:same}];
    const result=first.select.exec({entity:firstEntity,records:firstRows,selection:captured});
    assert.deepEqual(result.records.map((/** @type {any} */ row)=>row.id),['3']);
    assert.deepEqual(first.select.exec({entity:firstEntity,records:firstRows,selection:captured}).records.map((/** @type {any} */ row)=>row.id),['3']);
    assert.deepEqual(first.normalize.value({attribute:firstEntity.attributes[1],value:later}),later);
    assert.notEqual(first.normalize.value({attribute:firstEntity.attributes[1],value:later}),later);
    const secondRows=[{id:'1',token:b},{id:'2',token:later}];
    assert.deepEqual(second.select.exec({entity:secondEntity,records:secondRows,selection:{orderBy:[{attribute:'token',direction:'desc',nulls:'last'}]}}).records.map((/** @type {any} */ row)=>row.id),['2','1']);
    assert.deepEqual(first.select.exec({entity:firstEntity,records:firstRows,selection:{orderBy:[{attribute:'token',direction:'asc',nulls:'last'}]}}).records.map((/** @type {any} */ row)=>row.id),['3','1','2']);
    const normalized=first.normalize.record({entity:firstEntity,record:firstRows[0],mode:'complete'});
    assert.notEqual(normalized.token,firstRows[0].token);
    const keyInput={kind:'unique',name:'by_token',values:{token:firstRows[0].token}};
    const key=first.normalize.key({entity:firstEntity,key:keyInput});
    assert.notEqual(key.values.token,keyInput.values.token);
    firstRows[0].token[0]=15;
    assert.equal(normalized.token[0],2);
    assert.throws(()=>runtime.bind({model:firstCompiled.model,registry,handlers:[]}),{code:'UNSUPPORTED'});
    assert.throws(()=>first.normalize.value({attribute:firstEntity.attributes[1],value:new Uint8Array(15)}),{code:'INVALID_INPUT'});
});

test('selection skips a non-orderable primary key in favor of an orderable unique key', async () => {
    const container=makeContainer();
    container.addNamespaceRoot('Runtime_Test_',fileURLToPath(new URL('../fixtures/Runtime',import.meta.url)),'.mjs');
    const registry=await container.get('TeqFw_Dem_Registry$');
    const equalityDefinition={name:'example.EqualityOnly',parameters:{},normalizeParams:tokenDefinition.normalizeParams,valueDomain:tokenDefinition.valueDomain,preservation:tokenDefinition.preservation,valueHandling:tokenDefinition.valueHandling,equality:'Bytewise equality.'};
    registry.register([equalityDefinition,tokenDefinition]);
    registry.finalize();
    const compiler=await container.get('TeqFw_Dem_Compile$');
    const model=(await compiler.exec({schemas:[{packageName:'runtime-test',filename:'schema.json',document:{$format:2,$namespace:'/test/',item:{attributes:[{name:'primary',type:{name:'example.EqualityOnly'}},{name:'token',type:{name:'example.Token16'}}],primaryKey:['primary'],uniqueKeys:{by_token:['token']}}}}]})).model;
    const runtime=await container.get('TeqFw_Dem_Repository_Runtime$');
    const equalityHandler={name:'example.EqualityOnly',normalize:(/** @type {Uint8Array} */ value)=>value.slice(),copy:(/** @type {Uint8Array} */ value)=>value.slice(),equals:(/** @type {Uint8Array} */ left,/** @type {Uint8Array} */ right)=>left.every((byte,index)=>byte===right[index])};
    const bound=runtime.bind({model,registry,handlers:[equalityHandler,await container.get('Runtime_Test_Token16__default')]});
    const entity=model.entities['/test/item'];
    const selection=bound.selection.create({entity,selection:{}});
    assert.deepEqual(selection.orderBy.map((/** @type {any} */ item) => item.attribute),['token']);
    const low=new Uint8Array(16); low[0]=1;
    const high=new Uint8Array(16); high[0]=2;
    const primaryA=new Uint8Array(16); primaryA[0]=1;
    const primaryB=new Uint8Array(16); primaryB[0]=2;
    const rows=[{primary:primaryA,token:high},{primary:primaryB,token:low}];
    assert.deepEqual(bound.select.exec({entity,records:rows,selection}).records.map((/** @type {any} */ row) => row.token[0]),[1,2]);
});

test('selection rejects unsupported runtime comparisons', async () => {
    const container=makeContainer();
    const registry=await container.get('TeqFw_Dem_Registry$');
    const equalityDefinition={name:'example.EqualityOnly',parameters:{},normalizeParams:tokenDefinition.normalizeParams,valueDomain:tokenDefinition.valueDomain,preservation:tokenDefinition.preservation,valueHandling:tokenDefinition.valueHandling,equality:'Bytewise equality.'};
    registry.register([equalityDefinition]);
    registry.finalize();
    const compiler=await container.get('TeqFw_Dem_Compile$');
    const model=(await compiler.exec({schemas:[{packageName:'runtime-test',filename:'schema.json',document:{$format:2,$namespace:'/test/',item:{attributes:[{name:'id',type:{name:'integer'}},{name:'value',type:{name:'example.EqualityOnly'}}],primaryKey:['id']}}}]})).model;
    const handler={name:'example.EqualityOnly',normalize:(/** @type {Uint8Array} */ value)=>value.slice(),copy:(/** @type {Uint8Array} */ value)=>value.slice(),equals:(/** @type {Uint8Array} */ left,/** @type {Uint8Array} */ right)=>left.every((byte,index)=>byte===right[index])};
    const bound=(await container.get('TeqFw_Dem_Repository_Runtime$')).bind({model,registry,handlers:[handler]});
    assert.throws(()=>bound.selection.create({entity:model.entities['/test/item'],selection:{orderBy:[{attribute:'value',direction:'asc',nulls:'last'}]}}),{code:'INVALID_INPUT'});
});
