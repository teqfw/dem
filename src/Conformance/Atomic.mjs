// @ts-check
/**
 * @namespace TeqFw_Dem_Conformance_Atomic
 * @description Shared conformance component.
 */
export default class Atomic {
 /** Create the component. */
 constructor() {
/** Common atomic workload; generation values are validated without assuming a sequence algorithm. */
const schema=Object.freeze({$format:2,$namespace:'/batch/',
    account:{attributes:[{name:'id',type:{name:'identity'},generation:true},{name:'name',type:{name:'text'}},{name:'score',type:{name:'integer'},default:0}],uniqueKeys:{name:['name']}},
    entry:{attributes:[{name:'id',type:{name:'identity'},generation:true},{name:'account',type:{name:'ref'}},{name:'amount',type:{name:'decimal',params:{precision:20,scale:4}}}],relations:{account:{attributes:['account'],target:{path:'/batch/account',attributes:['id']}}}},
});
/**
 * @param {object} deps
 * @param {any} deps.provider
 * @param {any} deps.assert
 * @returns {Promise<any>}
 */
this.exercise = async function ({provider,assert}) {
    const key={kind:'primary',values:{id:'1'}};
    const initial=await provider.execute({operations:[
        {path:'/batch/account',method:'create',params:{record:{id:'1',name:'a'}}},
        {path:'/batch/entry',method:'create',params:{record:{id:'10',account:'1',amount:'1.25'}}},
        {path:'/batch/account',method:'read',params:{key}},
        {path:'/batch/account',method:'update',params:{key,changes:{score:5}}},
        {path:'/batch/entry',method:'list',params:{selection:{}}},
    ]});
    assert.equal(initial.results[2].record.score,'0');assert.equal(initial.results[3].record.score,'5');
    const account=await provider.get({path:'/batch/account'});
    await assert.rejects(provider.execute({operations:[
        {path:'/batch/account',method:'create',params:{record:{id:'2',name:'b'}}},
        {path:'/batch/account',method:'create',params:{record:{id:'3',name:'a'}}},
    ]}),{code:'CONFLICT'});
    assert.deepEqual(await account.read({key:{kind:'primary',values:{id:'2'}}}),{record:null});
    await assert.rejects(provider.execute({operations:[
        {path:'/batch/account',method:'update',params:{key,changes:{name:'changed'}}},
        {path:'/batch/entry',method:'create',params:{record:{id:'20',account:'999',amount:'2'}}},
    ]}),{code:'RELATION'});
    assert.equal((await account.read({key})).record.name,'a');
    await assert.rejects(provider.execute({operations:[
        {path:'/batch/account',method:'delete',params:{key}},
    ]}),{code:'RELATION'});
    await assert.rejects(provider.execute({operations:[]}),{code:'INVALID_INPUT'});
    await assert.rejects(provider.execute({operations:[{path:'/batch/missing',method:'list',params:{selection:{}}}]}),{code:'NOT_FOUND'});
    const operations=[{path:'/batch/account',method:'create',params:{record:{id:'50',name:'concurrent'}}}];
    const competing=await Promise.allSettled([provider.execute({operations}),provider.execute({operations})]);
    assert.equal(competing.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(competing.filter(r=>r.status==='rejected' && r.reason.code==='CONFLICT').length,1);
    const before=await account.list({selection:{}});
    const removed=await provider.execute({operations:[
        {path:'/batch/entry',method:'delete',params:{key:{kind:'primary',values:{id:'10'}}}},
        {path:'/batch/account',method:'delete',params:{key}},
        {path:'/batch/account',method:'list',params:{selection:{}}},
    ]});
    return {initial,before,removed};
}


this.schema = schema;
 }
}
