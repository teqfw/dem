// @ts-check
/**
 * @namespace TeqFw_Dem_Conformance_Extended
 * @description Shared conformance component.
 */
export default class Extended {
 /** Create the component. */
 constructor() {
/** Values requiring software keys or reversible text beyond native SQL key/encoding bounds. */
const schema=Object.freeze({$format:2,$namespace:'/extended/',
    key:{attributes:[{name:'tenant',type:{name:'text'}},{name:'token',type:{name:'text'}},{name:'payload',type:{name:'json'}}],primaryKey:['tenant','token'],uniqueKeys:{payload:['payload']},indexes:{tenant:{attributes:['tenant']}}},
    id:{attributes:[{name:'id',type:{name:'identity'},generation:true},{name:'owner',type:{name:'ref'},nullable:true}],relations:{owner:{attributes:['owner'],target:{path:'/extended/id',attributes:['id']}}}},
    unicode:{attributes:[{name:'key',type:{name:'text'}},{name:'value',type:{name:'text'}}],primaryKey:['key']},
});
/**
 * @param {object} deps
 * @param {any} deps.provider
 * @param {any} deps.assert
 * @returns {Promise<any>}
 */
this.exercise = async function ({provider,assert}) {
    const repo=await provider.get({path:'/extended/key'});
    const record={tenant:'tenant\0\ud7ff'+'🌍'.repeat(3000),token:'token'+'x'.repeat(10000),payload:{b:2,a:{name:'\ue000\0'}}};
    await repo.create({record});
    const read=await repo.read({key:{kind:'primary',values:{token:record.token,tenant:record.tenant}}});
    assert.deepEqual(read,{record});
    const unique=await repo.read({key:{kind:'unique',name:'payload',values:{payload:{a:{name:'\ue000\0'},b:2}}}});
    assert.deepEqual(unique,{record});
    await assert.rejects(repo.create({record}),{code:'CONFLICT'});
    await assert.rejects(repo.create({record:{...record,token:'another'}}),{code:'CONFLICT'});
    const ids=await provider.get({path:'/extended/id'}),huge='1'+'0'.repeat(100);
    await ids.create({record:{id:huge,owner:null}});
    const generated=await ids.create({record:{owner:huge}});
    assert.equal(generated.record.id,(BigInt(huge)+1n).toString());
    const unicode=await provider.get({path:'/extended/unicode'});
    const expected=['','\0','\u0001','A','a','\ud7ff','\ue000','\ufffd','\u{10000}'];
    for (const key of expected.slice().reverse()) await unicode.create({record:{key,value:'value:'+key}});
    const ordered=await unicode.list({selection:{}});
    assert.deepEqual(ordered.records.map((/** @type {any} */ row)=>row.key),expected);
    await assert.rejects(unicode.create({record:{key:'\ud800',value:'invalid Unicode'}}),{code:'INVALID_INPUT'});
    const scalarRead=await unicode.read({key:{kind:'primary',values:{key:'\ud7ff'}}});
    assert.equal(scalarRead.record.value,'value:\ud7ff');
    return {read,unique,generated,ordered,scalarRead,ids:await ids.list({selection:{}})};
}


this.schema = schema;
 }
}
