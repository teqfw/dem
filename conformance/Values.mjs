// @ts-check
/** Shared cross-backend value workload. No persistence or Node dependency is provided here. */
export const schema = Object.freeze({$format:1,
    '/portable/value':{attributes:[
        {name:'id',type:{name:'identity'},generation:true},
        {name:'code',type:{name:'string',params:{length:64}}},
        {name:'wide',type:{name:'integer',params:{bits:64,unsigned:true}}},
        {name:'amount',type:{name:'decimal',params:{precision:24,scale:4}}},
        {name:'precise',type:{name:'decimal',params:{precision:100,scale:50}}},
        {name:'text',type:{name:'text'}},
        {name:'flag',type:{name:'boolean'}},
        {name:'binary',type:{name:'binary'}},
        {name:'data',type:{name:'json'}},
        {name:'vector',type:{name:'vector',params:{dimensions:3,element:'float'}}},
        {name:'sparse',type:{name:'vector',params:{dimensions:10,element:'float',sparse:true}}},
        {name:'bits',type:{name:'vector',params:{dimensions:3,element:'bit'}}},
        {name:'day',type:{name:'date'}},
        {name:'time',type:{name:'datetime',params:{precision:9,timezone:false}}},
        {name:'instant',type:{name:'datetime',params:{precision:9,timezone:true}}},
        {name:'choice',type:{name:'enum',params:{values:['a','b']}}},
        {name:'uuid',type:{name:'uuid'}},
        {name:'note',type:{name:'text'},nullable:true},
    ],uniqueKeys:{code:['code']}},
    '/portable/uuid':{attributes:[{name:'id',type:{name:'identity'},generation:true},{name:'name',type:{name:'text'}}]},
});
export const map = Object.freeze({$format:1,identityProfiles:{'/portable/uuid':{id:{type:'uuid'}}}});
/**
 * Run identical operations in a real provider. Results contain no backend-specific generated UUID.
 * @param {{provider:any, assert:any}} env
 * @returns {Promise<any>}
 */
export async function exercise({provider,assert}) {
    const repo=await provider.get({path:'/portable/value'});
    const input={code:'first',wide:'18446744073709551615',amount:'9007199254740993.0001',precise:'0.'+'0'.repeat(49)+'1',
        text:'🌍'.repeat(2000)+' trailing z',flag:true,binary:'AQID'.repeat(2048),data:{nested:[1,null,{key:'value'}]},
        vector:[0.1,1.2345678901234567,-2],sparse:{dimensions:10,entries:[{index:9,value:0.1},{index:1,value:-2}]},bits:[1,0,1],
        day:'2026-10-31',time:'2026-10-31T12:34:56.123456789',instant:'2026-10-31T14:34:56.123456789+02:00',choice:'a',uuid:'ABCDEF12-3456-7890-ABCD-EF1234567890'};
    const {record}=await repo.create({record:input});
    const key={kind:'primary',values:{id:record.id}};
    const read=await repo.read({key});assert.deepEqual(read,{record});
    assert.equal(record.wide,input.wide);assert.equal(record.amount,input.amount);assert.equal(record.precise,input.precise);
    assert.equal(record.text,input.text);assert.equal(record.binary,input.binary);assert.deepEqual(record.vector,input.vector);
    input.data.nested[2]={key:'mutated'};assert.equal((await repo.read({key})).record.data.nested[2].key,'value');
    const second=await repo.create({record:{...record,id:'10',code:'second',wide:'9007199254740993',amount:'-2.0001',note:'x',text:record.text.slice(0,-1)+'a'}});
    const ordered=await repo.list({selection:{orderBy:[{attribute:'wide',direction:'asc',nulls:'last'}]}});
    assert.deepEqual(ordered.records.map((/** @type {any} */ row)=>row.code),['second','first']);
    const orderedText=await repo.list({selection:{orderBy:[{attribute:'text',direction:'asc',nulls:'last'}]}});
    assert.deepEqual(orderedText.records.map((/** @type {any} */ row)=>row.code),['second','first']);
    const filtered=await repo.list({selection:{where:{kind:'call',operator:'gt',args:[{kind:'attr',name:'amount'},{kind:'value',value:'0'}]}}});
    assert.deepEqual(filtered.records,[record]);
    const updated=await repo.update({key,changes:{note:'updated',data:{new:true}}});
    let conflict;
    try { await repo.create({record:{...record,id:'20',code:'first'}}); } catch(error) { conflict=/** @type {any} */(error).code; }
    assert.equal(conflict,'CONFLICT');
    assert.deepEqual(await repo.list({selection:{limit:0}}),{records:[]});
    assert.deepEqual(await repo.delete({key:{kind:'primary',values:{id:second.record.id}}}),{deleted:true});
    const uuid=await provider.get({path:'/portable/uuid'});
    const generated=(await uuid.create({record:{name:'generated'}})).record;
    assert.match(generated.id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    return {record,read,ordered,orderedText,filtered,updated,conflict,remaining:await repo.list({selection:{}}),uuidGenerated:true};
}
