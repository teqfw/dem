// @ts-check
/** Backend-neutral behavioral requirements. The harness supplies test/assert and real storage setup. */
export const schema = Object.freeze({
    $format: 1,
    '/contract/item': {
        attributes: [
            {name:'id',type:{name:'identity'},generation:true},
            {name:'code',type:{name:'string',params:{length:32}}},
            {name:'group',type:{name:'string',params:{length:32}}},
            {name:'rank',type:{name:'integer'},default:0},
            {name:'note',type:{name:'text'},nullable:true},
        ],
        uniqueKeys: {code:['code'], grouped:['group','rank'], note:['note']},
    },
    '/contract/child': {
        attributes:[{name:'id',type:{name:'identity'},generation:true},{name:'owner',type:{name:'ref'},nullable:true}],
        relations:{owner:{attributes:['owner'],target:{path:'/contract/item',attributes:['id']}}},
    },
    '/contract/pair': {
        attributes:[{name:'tenant',type:{name:'text'}},{name:'ordinal',type:{name:'integer'}}],
        primaryKey:['tenant','ordinal'],
    },
    '/contract/keyless': {attributes:[{name:'label',type:{name:'text'}}]},
});
/**
 * open must compile the supplied schema and return an empty isolated real backend.
 * Cleanup runs even after failures. No persistence implementation is supplied here.
 * @param {{test:(name:string,body:()=>Promise<void>)=>unknown,assert:any,open:(params:{schema:unknown})=>Promise<{provider:TeqFw_Dem_Api_RepositoryProvider,selection:TeqFw_Dem_Dto_Query_Selection__Factory,model:TeqFw_Dem_Model,close:()=>Promise<void>}>}} harness
 */
export function register({test,assert,open}) {
    /** @param {string} name @param {(env:any)=>Promise<void>} body */
    const check = function (name, body) {
        test(name,async function () {
            const env=await open({schema:structuredClone(schema)});
            try { await body(env); } finally { await env.close(); }
        });
    };
    /** @param {string} code @returns {(error:any)=>boolean} */
    const error = function (code) { return value=>value instanceof Error && value.name === 'DemRepositoryError' && /** @type {TeqFw_Dem_RepositoryError} */(value).code === code; };
    check('repository: resolution and absent implementation paths',async({provider})=>{
        await assert.rejects(provider.get({path:'/contract/missing'}),error('NOT_FOUND'));
    });
    check('repository: create defaults, generation, detached values and exact results',async({provider})=>{
        const repo=await provider.get({path:'/contract/item'});
        const input={code:'a',group:'g'};
        const result=await repo.create({record:input});
        assert.deepEqual(Object.keys(result),['record']);
        assert.match(result.record.id,/^[1-9][0-9]*$/);
        assert.deepEqual(result.record,{id:result.record.id,code:'a',group:'g',rank:'0',note:null});
        assert.deepEqual(input,{code:'a',group:'g'});
        const key={kind:'primary',values:{id:result.record.id}};
        result.record.code='changed locally';
        assert.equal((await repo.read({key})).record.code,'a');
    });
    check('repository: unique/composite addressing, update patch and idempotent delete',async({provider})=>{
        const repo=await provider.get({path:'/contract/item'});
        const {record}=await repo.create({record:{code:'a',group:'g',rank:10}});
        const key={kind:'unique',name:'grouped',values:{group:'g',rank:'10'}};
        assert.deepEqual(await repo.read({key}),{record});
        const updated=await repo.update({key,changes:{note:'new'}});
        assert.deepEqual(updated,{record:{...record,note:'new'}});
        assert.deepEqual(await repo.update({key,changes:{note:'new'}}),updated);
        assert.deepEqual(await repo.delete({key}),{deleted:true});
        assert.deepEqual(await repo.delete({key}),{deleted:false});
        assert.deepEqual(await repo.read({key}),{record:null});
        assert.deepEqual(await repo.update({key,changes:{note:'absent'}}),{record:null});
    });
    check('repository: invalid requests and unique conflicts leave contents unchanged',async({provider,selection,model})=>{
        const repo=await provider.get({path:'/contract/item'});
        const {record}=await repo.create({record:{code:'a',group:'g'}});
        for(const input of [{code:'b',group:'g'}, {code:'a',group:'h',rank:1}]) await assert.rejects(repo.create({record:input}),error('CONFLICT'));
        for(const input of [{code:'b',group:'h',extra:1},{code:null,group:'h'},{code:'b'}, {code:'b',group:'h',rank:0.5}]) await assert.rejects(repo.create({record:input}),error('INVALID_INPUT'));
        const key={kind:'primary',values:{id:record.id}};
        await assert.rejects(repo.read(/** @type {any} */({key,extra:true})),error('INVALID_INPUT'));
        await assert.rejects(repo.read({key:{kind:'unique',name:'missing',values:{code:'a'}}}),error('INVALID_INPUT'));
        await assert.rejects(repo.update({key,changes:{id:'2'}}),error('INVALID_INPUT'));
        await assert.rejects(repo.update({key,changes:{}}),error('INVALID_INPUT'));
        for(const values of [{id:null},{id:record.id,code:'a'},{}]) await assert.rejects(repo.read({key:{kind:'primary',values}}),error('INVALID_INPUT'));
        assert.deepEqual(await repo.list({selection:selection.create({entity:model.entities['/contract/item'],selection:{}})}),{records:[record]});
    });
    check('repository: filtering, numeric sorting, deterministic ties, nulls and pagination',async({provider,selection,model})=>{
        const repo=await provider.get({path:'/contract/item'});
        const entity=model.entities['/contract/item'];
        for(const record of [{id:'1',code:'a',group:'a',rank:10,note:'z'},{id:'2',code:'b',group:'b',rank:2},{id:'3',code:'c',group:'c',rank:2,note:'a'}]) await repo.create({record});
        const list=async(/** @type {any} */ input)=> (await repo.list({selection:selection.create({entity,selection:input})})).records;
        const orderBy=[{attribute:'rank',direction:'asc',nulls:'last'}];
        assert.deepEqual((await list({orderBy})).map((/** @type {TeqFw_Dem_Record} */ r)=>r.code),['b','c','a']);
        assert.deepEqual((await list({orderBy,offset:1,limit:1})).map((/** @type {TeqFw_Dem_Record} */ r)=>r.code),['c']);
        assert.deepEqual(await list({limit:0}),[]);
        assert.deepEqual(await list({offset:100}),[]);
        const compare=(/** @type {string} */ operator,/** @type {unknown} */ value)=>({kind:'call',operator,args:[{kind:'attr',name:'note'},{kind:'value',value}]});
        assert.deepEqual((await list({where:compare('ne','z')})).map((/** @type {TeqFw_Dem_Record} */ r)=>r.code),['c']);
        assert.deepEqual(await list({where:compare('eq',null)}),[]);
        const isNull={kind:'call',operator:'isNull',args:[{kind:'attr',name:'note'}]};
        assert.deepEqual((await list({where:isNull})).map((/** @type {TeqFw_Dem_Record} */ r)=>r.code),['b']);
        assert.deepEqual((await list({where:{kind:'call',operator:'not',args:[compare('eq','z')]}})).map((/** @type {TeqFw_Dem_Record} */ r)=>r.code),['b','c']);
        assert.deepEqual((await list({orderBy:[{attribute:'note',direction:'asc',nulls:'first'}]})).map((/** @type {TeqFw_Dem_Record} */ r)=>r.code),['b','c','a']);
    });
    check('repository: all scalar operators, boolean trees and Unicode scalar ordering',async({provider,selection,model})=>{
        const repo=await provider.get({path:'/contract/item'}), entity=model.entities['/contract/item'];
        for(const [rank,note] of [[1,'A'],[2,'a'],[10,'\uE000'],[20,'🌍']]) await repo.create({record:{id:String(rank),code:String(rank),group:String(rank),rank,note}});
        const query=async(/** @type {any} */ input)=> (await repo.list({selection:selection.create({entity,selection:input})})).records;
        const compare=(/** @type {string} */ operator,/** @type {unknown} */ value)=>({kind:'call',operator,args:[{kind:'attr',name:'rank'},{kind:'value',value}]});
        for(const [operator,codes] of [['eq',['2']],['ne',['1','10','20']],['lt',['1']],['lte',['1','2']],['gt',['10','20']],['gte',['2','10','20']]]) {
            assert.deepEqual((await query({where:compare(/** @type {string} */(operator),2)})).map((/** @type {any} */r)=>r.code),codes);
        }
        const where={kind:'call',operator:'or',args:[compare('eq',1),{kind:'call',operator:'and',args:[compare('gte',10),compare('lt',20)]}]};
        assert.deepEqual((await query({where})).map((/** @type {any} */r)=>r.code),['1','10']);
        assert.deepEqual((await query({orderBy:[{attribute:'note',direction:'asc',nulls:'last'}]})).map((/** @type {any} */r)=>r.code),['1','2','10','20']);
        assert.deepEqual((await query({orderBy:[{attribute:'rank',direction:'desc',nulls:'first'}]})).map((/** @type {any} */r)=>r.code),['20','10','2','1']);
        await assert.rejects(repo.list({selection:/** @type {any} */({where:{kind:'call',operator:'sql',args:[]},orderBy:[],limit:null,offset:0})}),error('UNSUPPORTED'));
    });
    check('repository: conflicting patches and concurrent uniqueness are atomic',async({provider})=>{
        const repo=await provider.get({path:'/contract/item'});
        const a=await repo.create({record:{code:'a',group:'a'}}), b=await repo.create({record:{code:'b',group:'b'}});
        const key={kind:'primary',values:{id:b.record.id}};
        await assert.rejects(repo.update({key,changes:{code:'a',note:'must not persist'}}),error('CONFLICT'));
        assert.deepEqual(await repo.read({key}),b);
        const results=await Promise.allSettled([repo.create({record:{code:'race',group:'r1'}}),repo.create({record:{code:'race',group:'r2'}})]);
        assert.equal(results.filter(result=>result.status === 'fulfilled').length,1);
        const rejected=results.find(result=>result.status === 'rejected');
        assert.ok(rejected && rejected.status === 'rejected' && error('CONFLICT')(rejected.reason));
        assert.deepEqual(await repo.read({key:{kind:'primary',values:{id:a.record.id}}}),a);
    });
    check('repository: relation enforcement and atomic restrictive deletion',async({provider})=>{
        const item=await provider.get({path:'/contract/item'}), child=await provider.get({path:'/contract/child'});
        const {record}=await item.create({record:{id:'1',code:'a',group:'g'}});
        const key={kind:'primary',values:{id:record.id}};
        const linked=await child.create({record:{owner:record.id}});
        await assert.rejects(child.create({record:{owner:'999999'}}),error('RELATION'));
        await assert.rejects(item.delete({key}),error('RELATION'));
        assert.deepEqual(await item.read({key}),{record});
        await child.delete({key:{kind:'primary',values:{id:linked.record.id}}});
        assert.deepEqual(await item.delete({key}),{deleted:true});
        assert.equal((await child.create({record:{owner:null}})).record.owner,null);
    });
    check('repository: explicit composite primary keys need no identity',async({provider})=>{
        const repo=await provider.get({path:'/contract/pair'});
        const {record}=await repo.create({record:{tenant:'a',ordinal:1}});
        assert.deepEqual(record,{tenant:'a',ordinal:'1'});
        const key={kind:'primary',values:{ordinal:1,tenant:'a'}};
        assert.deepEqual(await repo.read({key}),{record});
        await assert.rejects(repo.create({record:{tenant:'a',ordinal:'1'}}),error('CONFLICT'));
        await assert.rejects(repo.read({key:{kind:'primary',values:{tenant:'a'}}}),error('INVALID_INPUT'));
        assert.deepEqual(await repo.delete({key}),{deleted:true});
    });
    check('repository: keyless entities allow duplicate create and ordered list',async({provider,selection,model})=>{
        const repo=await provider.get({path:'/contract/keyless'});
        for(const label of ['z','a','a']) await repo.create({record:{label}});
        assert.deepEqual(await repo.list({selection:selection.create({entity:model.entities['/contract/keyless'],selection:{}})}),{records:[{label:'a'},{label:'a'},{label:'z'}]});
        await assert.rejects(repo.read({key:{kind:'primary',values:{label:'a'}}}),error('UNSUPPORTED'));
    });
}
