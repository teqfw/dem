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
    const untyped=first.selection.create({entity:firstEntity,selection:{where:{kind:'call',operator:'eq',args:[{kind:'attr',name:'token'},{kind:'value',value:a}]}}});
    assert.deepEqual(first.select.exec({entity:firstEntity,records:[{id:'1',token:a}],selection:untyped}).records.map((/** @type {any} */ row)=>row.id),['1']);
    assert.deepEqual(first.select.exec({entity:firstEntity,records:[{id:'1',token:a}],selection:captured}).records.map((/** @type {any} */ row)=>row.id),['1']);
    assert.throws(()=>first.selection.create({entity:firstEntity,selection:{where:{kind:'call',operator:'eq',args:[{kind:'attr',name:'token'},{kind:'value',type:{name:'text'},value:'x'}]}}}),{code:'INVALID_INPUT'});
    assert.throws(()=>first.selection.create({entity:firstEntity,selection:{where:{kind:'call',operator:'eq',args:[{kind:'attr',name:'token'},{kind:'value',type:{name:'example.Token16'},value:new Uint8Array(15)}]}}}),{code:'INVALID_INPUT'});
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
    const firstBatchRows={'/test/first':[]},secondBatchRows={'/test/second':[]};
    const firstBatchOps=[{path:'/test/first',method:'create',params:{record:{id:'10',token:a}}}];
    const secondBatchOps=[{path:'/test/second',method:'create',params:{record:{id:'20',token:b}}}];
    assert.equal(first.batch.validate({model:second.model,operations:firstBatchOps}).length,1);
    first.batch.plan({rows:firstBatchRows,operations:firstBatchOps,generate:()=>undefined});
    second.batch.plan({rows:secondBatchRows,operations:secondBatchOps,generate:()=>undefined});
    first.batch.plan({rows:firstBatchRows,operations:[{path:'/test/first',method:'read',params:{key:{kind:'primary',values:{id:'10'}}}}],generate:()=>undefined});
    assert.equal(firstBatchRows['/test/first'].length,1);
    assert.equal(secondBatchRows['/test/second'].length,1);
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

test('opaque class operands survive Expression and Selection normalization and Select revalidation', async () => {
    class Token {
        #byte;
        /** @param {number} byte */
        constructor(byte) { this.#byte=byte; }
        get byte() { return this.#byte; }
        set(/** @type {number} */ byte) { this.#byte=byte; }
    }
    const definition={name:'example.ClassToken',parameters:{},normalizeParams:tokenDefinition.normalizeParams,valueDomain:'A class-based token.',preservation:'Preserve token identity semantics.',valueHandling:'Normalize and copy class instances.',equality:'Bytewise equality.'};
    const handler={name:'example.ClassToken',normalize:(/** @type {unknown} */ value) => { if (!(value instanceof Token)) throw new TypeError(); return new Token(value.byte); },copy:(/** @type {Token} */ value) => new Token(value.byte),equals:(/** @type {Token} */ left,/** @type {Token} */ right) => left.byte===right.byte};
    const container=makeContainer();
    const registry=await container.get('TeqFw_Dem_Registry$');
    registry.register([definition]); registry.finalize();
    const model=(await (await container.get('TeqFw_Dem_Compile$')).exec({schemas:[{packageName:'runtime-test',filename:'schema.json',document:{$format:2,$namespace:'/test/',item:{attributes:[{name:'id',type:{name:'integer'}},{name:'token',type:{name:'example.ClassToken'}}],primaryKey:['id']}}}]})).model;
    const bound=(await container.get('TeqFw_Dem_Repository_Runtime$')).bind({model,registry,handlers:[handler]});
    const entity=model.entities['/test/item'];
    const input=new Token(7);
    const selection=bound.selection.create({entity,selection:{where:{kind:'call',operator:'eq',args:[{kind:'attr',name:'token'},{kind:'value',value:input}]}}});
    input.set(9);
    const exposed=selection.where.args[1].value;
    assert.ok(exposed instanceof Token);
    assert.equal(exposed.byte,7);
    exposed.set(11);
    assert.equal(selection.where.args[1].value.byte,7);
    const records=[{id:'1',token:new Token(7)},{id:'2',token:new Token(9)}];
    assert.deepEqual(bound.select.exec({entity,records,selection}).records.map((/** @type {any} */ row)=>row.id),['1']);
    assert.deepEqual(bound.select.exec({entity,records,selection}).records.map((/** @type {any} */ row)=>row.id),['1']);
    assert.throws(()=>bound.selection.create({entity,selection:{where:{kind:'call',operator:'eq',args:[{kind:'attr',name:'token'},{kind:'value',value:{byte:7}}]}}}),{code:'INVALID_INPUT'});
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

test('bound Batch uses extension equality and isolates command results', async () => {
    const container=makeContainer();
    container.addNamespaceRoot('Runtime_Test_',fileURLToPath(new URL('../fixtures/Runtime',import.meta.url)),'.mjs');
    const registry=await container.get('TeqFw_Dem_Registry$'); registry.register([tokenDefinition]); registry.finalize();
    const model=(await (await container.get('TeqFw_Dem_Compile$')).exec({schemas:[{packageName:'runtime-test',filename:'batch.json',document:{$format:2,$namespace:'/test/',batch:{attributes:[{name:'id',type:{name:'integer'}},{name:'token',type:{name:'example.Token16'}},{name:'label',type:{name:'text'}}],primaryKey:['id'],uniqueKeys:{by_pair:['label','token']}}}}]})).model;
    const runtime=await container.get('TeqFw_Dem_Repository_Runtime$');
    const bound=runtime.bind({model,registry,handlers:[await container.get('Runtime_Test_Token16__default')]});
    const token=new Uint8Array(16); token[0]=7;
    const equivalent=token.slice();
    const rows={'/test/batch':[]};
    const otherModel={entities:{}};
    assert.equal(bound.batch.validate({model:otherModel,operations:[{path:'/test/batch',method:'read',params:{key:{kind:'primary',values:{id:'1'}}}}]}).length,1);
    const result=bound.batch.plan({model:otherModel,rows,generate:()=>assert.fail('unexpected generation'),operations:[
        {path:'/test/batch',method:'create',params:{record:{id:'1',token,label:'one'}}},
        {path:'/test/batch',method:'read',params:{key:{kind:'unique',name:'by_pair',values:{label:'one',token:equivalent}}}},
        {path:'/test/batch',method:'read',params:{key:{kind:'unique',name:'by_pair',values:{label:'one',token:equivalent}}}},
        {path:'/test/batch',method:'update',params:{key:{kind:'primary',values:{id:'1'}},changes:{label:'two'}}},
        {path:'/test/batch',method:'list',params:{selection:{where:eq(token)}}},
        {path:'/test/batch',method:'delete',params:{key:{kind:'unique',name:'by_pair',values:{label:'two',token:equivalent}}}},
    ]});
    assert.equal(result.results[0].record.label,'one');
    assert.equal(result.results[1].record.label,'one');
    assert.equal(result.results[2].record.label,'one');
    assert.equal(result.results[3].record.label,'two');
    assert.equal(result.results[4].records[0].label,'two');
    assert.deepEqual(result.results[5],{deleted:true});
    result.results[3].record.token[0]=99;
    assert.equal(result.results[0].record.token[0],7);
    assert.equal(rows['/test/batch'].length,0);

    const duplicateRows={'/test/batch':[]};
    assert.throws(()=>bound.batch.plan({rows:duplicateRows,generate:()=>undefined,operations:[
        {path:'/test/batch',method:'create',params:{record:{id:'10',token,label:'same-group'}}},
        {path:'/test/batch',method:'create',params:{record:{id:'11',token:equivalent,label:'same-group'}}},
    ]}),{code:'CONFLICT'});
});

test('bound Batch compares relation tuples and preserves opaque non-key values', async () => {
    const container=makeContainer();
    container.addNamespaceRoot('Runtime_Test_',fileURLToPath(new URL('../fixtures/Runtime',import.meta.url)),'.mjs');
    const opaqueDefinition={name:'example.Opaque',parameters:{},normalizeParams:tokenDefinition.normalizeParams,valueDomain:'Opaque mutable object.',preservation:'Preserve fields.',valueHandling:'Copy object values.'};
    const registry=await container.get('TeqFw_Dem_Registry$'); registry.register([tokenDefinition,opaqueDefinition]); registry.finalize();
    const schema={packageName:'runtime-test',filename:'relations.json',document:{$format:2,$namespace:'/test/',
        target:{attributes:[{name:'id',type:{name:'integer'}},{name:'code',type:{name:'example.Token16'}}],primaryKey:['id'],uniqueKeys:{by_code:['code']}},
        source:{attributes:[{name:'id',type:{name:'integer'}},{name:'token',type:{name:'example.Token16'},nullable:true},{name:'opaque',type:{name:'example.Opaque'}},{name:'label',type:{name:'text'}}],primaryKey:['id'],relations:{target:{attributes:['token'],target:{path:'target',attributes:['code']}}}},
    }};
    const model=(await (await container.get('TeqFw_Dem_Compile$')).exec({schemas:[schema]})).model;
    /** @param {{payload:any}} value */
    const copyObject=(value)=>({payload:structuredClone(value.payload)});
    const opaqueHandler={name:'example.Opaque',normalize:copyObject,copy:copyObject};
    const runtime=await container.get('TeqFw_Dem_Repository_Runtime$');
    const bound=runtime.bind({model,registry,handlers:[await container.get('Runtime_Test_Token16__default'),opaqueHandler]});
    const token=new Uint8Array(16); token[0]=4;
    const equivalent=token.slice();
    const inputOpaque={payload:{secret:'retained'}};
    /** @type {Record<string,any[]>} */ const rows={'/test/target':[],'/test/source':[]};
    /** @type {any} */ let callbackSnapshot;
    const result=bound.batch.plan({rows,generate:()=>assert.fail('unexpected generation'),created:(/** @type {any} */ {path,record})=>{if(path==='/test/source'){callbackSnapshot=record;record.opaque.payload.secret='callback mutation';}},operations:[
        {path:'/test/target',method:'create',params:{record:{id:'1',code:token}}},
        {path:'/test/source',method:'create',params:{record:{id:'1',token:equivalent,opaque:inputOpaque,label:'linked'}}},
        {path:'/test/source',method:'update',params:{key:{kind:'primary',values:{id:'1'}},changes:{label:'updated'}}},
        {path:'/test/source',method:'create',params:{record:{id:'2',token:null,opaque:{payload:{secret:'null-relation'}},label:'nullable'}}},
        {path:'/test/source',method:'read',params:{key:{kind:'primary',values:{id:'1'}}}},
    ]});
    assert.equal(result.results[4].record.label,'updated');
    assert.equal(result.results[4].record.opaque.payload.secret,'retained');
    assert.equal(callbackSnapshot.opaque.payload.secret,'callback mutation');
    assert.equal(rows['/test/source'][0].record.opaque.payload.secret,'retained');
    assert.notEqual(rows['/test/source'][0].record.opaque,inputOpaque);
    assert.equal(rows['/test/source'].length,2);

    const missing=token.slice(); missing[0]=9;
    assert.throws(()=>bound.batch.plan({rows:{'/test/target':rows['/test/target'].map(row=>({record:row.record,key:row.key})),'/test/source':[]},generate:()=>undefined,operations:[
        {path:'/test/source',method:'create',params:{record:{id:'9',token:missing,opaque:{payload:{}},label:'orphan'}}},
    ]}),{code:'RELATION'});
});
