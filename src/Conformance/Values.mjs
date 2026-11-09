// @ts-check
/**
 * @namespace TeqFw_Dem_Conformance_Values
 * @description Shared conformance component.
 */
export default class Values {
 /** Create the component. */
 constructor() {
/** Shared cross-backend value workload. No persistence or Node dependency is provided here. */
const schema = Object.freeze({$format:2,$namespace:'/portable/',
    value:{attributes:[
        {name:'id',type:{name:'identity'},generation:true},
        {name:'code',type:{name:'string',params:{length:64}}},
        {name:'wide',type:{name:'integer',params:{bits:64,unsigned:true}}},
        {name:'amount',type:{name:'decimal',params:{precision:24,scale:4}}},
        {name:'precise',type:{name:'decimal',params:{precision:100,scale:50}}},
        {name:'text',type:{name:'text'}},
        {name:'flag',type:{name:'boolean'}},
        {name:'binary',type:{name:'binary'}},
        {name:'data',type:{name:'json'}},
        {name:'vector',type:{name:'vector',params:{dimensions:4,element:'float'}}},
        {name:'sparse',type:{name:'vector',params:{dimensions:10,element:'float',sparse:true}}},
        {name:'bits',type:{name:'vector',params:{dimensions:3,element:'bit'}}},
        {name:'day',type:{name:'date'}},
        {name:'time',type:{name:'datetime',params:{precision:9,timezone:false}}},
        {name:'instant',type:{name:'datetime',params:{precision:9,timezone:true}}},
        {name:'choice',type:{name:'enum',params:{values:['a','b']}}},
        {name:'uuid',type:{name:'uuid'}},
        {name:'note',type:{name:'text'},nullable:true},
    ],uniqueKeys:{code:['code']}},
    large:{attributes:[{name:'id',type:{name:'identity'},generation:true},{name:'owner',type:{name:'ref'},nullable:true}],relations:{owner:{attributes:['owner'],target:{path:'/portable/large',attributes:['id']}}}},
    keylesspayload:{attributes:[{name:'payload',type:{name:'json'}},{name:'bytes',type:{name:'binary'}},{name:'vector',type:{name:'vector',params:{dimensions:2,element:'float'}}}]},
    proto:{attributes:[{name:'__proto__',type:{name:'identity'},generation:true},{name:'constructor',type:{name:'text'}}]},
    uuid:{attributes:[{name:'id',type:{name:'identity'},generation:true},{name:'name',type:{name:'text'}}]},
});
const map = Object.freeze({$format:1,identityProfiles:{'/portable/uuid':{id:{type:'uuid'}}}});
/**
 * Run identical operations in a real provider. Results contain no backend-specific generated UUID.
 * @param {object} deps
 * @param {any} deps.provider
 * @param {any} deps.assert
 * @returns {Promise<any>}
 */
this.exercise = async function ({provider,assert}) {
    const repo=await provider.get({path:'/portable/value'});
    const input={code:'first',wide:'18446744073709551615',amount:'9007199254740993.0001',precise:'0.'+'0'.repeat(49)+'1',
        text:'🌍'.repeat(2000)+' trailing z',flag:true,binary:'AQID'.repeat(2048),data:{zero:-0,nested:[1,null,{key:'value'}]},
        vector:[0.1,1.2345678901234567,-2,-0],sparse:{dimensions:10,entries:[{index:9,value:0.1},{index:1,value:-2}]},bits:[1,0,1],
        day:'2026-10-31',time:'2026-10-31T12:34:56.123456789',instant:'2026-10-31T14:34:56.123456789+02:00',choice:'a',uuid:'ABCDEF12-3456-7890-ABCD-EF1234567890'};
    const {record}=await repo.create({record:input});
    const key={kind:'primary',values:{id:record.id}};
    const read=await repo.read({key});assert.deepEqual(read,{record});
    assert.equal(record.wide,input.wide);assert.equal(record.amount,input.amount);assert.equal(record.precise,input.precise);
    assert.equal(record.text,input.text);assert.equal(record.binary,input.binary);assert.deepEqual(record.vector,[0.1,1.2345678901234567,-2,0]);
    assert.equal(Object.is(record.vector[3],-0),false);assert.equal(Object.is(record.data.zero,-0),false);
    assert.deepEqual(Object.keys(record.data),['nested','zero']);
    input.sparse.entries[0].value=9;assert.equal(record.sparse.entries[1].value,0.1);
    input.data.nested[2]={key:'mutated'};assert.equal((await repo.read({key})).record.data.nested[2].key,'value');
    const second=await repo.create({record:{...record,id:'10',code:'second',wide:'9007199254740993',amount:'-2.0001',note:'x',text:record.text.slice(0,-1)+'a',sparse:{dimensions:10,entries:[{index:1,value:0.1},{index:9,value:-2}]}}});
    const ordered=await repo.list({selection:{orderBy:[{attribute:'wide',direction:'asc',nulls:'last'}]}});
    assert.deepEqual(ordered.records.map((/** @type {any} */ row)=>row.code),['second','first']);
    const orderedText=await repo.list({selection:{orderBy:[{attribute:'text',direction:'asc',nulls:'last'}]}});
    assert.deepEqual(orderedText.records.map((/** @type {any} */ row)=>row.code),['second','first']);
    const filtered=await repo.list({selection:{where:{kind:'call',operator:'gt',args:[{kind:'attr',name:'amount'},{kind:'value',value:'0'}]}}});
    assert.deepEqual(filtered.records,[record]);
    const sparseOrdered=await repo.list({selection:{orderBy:[{attribute:'sparse',direction:'asc',nulls:'last'}]}});
    assert.deepEqual(sparseOrdered.records.map((/** @type {any} */ row)=>row.code),['first','second']);
    const updated=await repo.update({key,changes:{note:'updated',data:{new:true}}});
    let conflict;
    try { await repo.create({record:{...record,id:'20',code:'first'}}); } catch(error) { conflict=/** @type {any} */(error).code; }
    assert.equal(conflict,'CONFLICT');
    assert.deepEqual(await repo.list({selection:{limit:0}}),{records:[]});
    assert.deepEqual(await repo.delete({key:{kind:'primary',values:{id:second.record.id}}}),{deleted:true});
    const large=await provider.get({path:'/portable/large'});
    const parent=await large.create({record:{id:'9007199254740993',owner:null}});
    const child=await large.create({record:{owner:parent.record.id}});
    assert.equal(child.record.id,'9007199254740994');
    assert.deepEqual(await large.read({key:{kind:'primary',values:{id:child.record.id}}}),child);
    const largeRecords=await large.list({selection:{}});
    assert.deepEqual(largeRecords.records.map((/** @type {any} */ row)=>row.id),['9007199254740993','9007199254740994']);
    await Promise.all(Array.from({length:8},()=>large.create({record:{owner:parent.record.id}})));
    const largeConcurrent=await large.list({selection:{}});
    assert.equal(largeConcurrent.records.length,10);
    assert.equal(new Set(largeConcurrent.records.map((/** @type {any} */ row)=>row.id)).size,10);
    const keyless=await provider.get({path:'/portable/keylesspayload'});
    const keylessFirst=(await keyless.create({record:{payload:{b:2,a:1},bytes:'/w==',vector:[1,2]}})).record;
    const keylessSecond=(await keyless.create({record:{payload:{a:2,b:1},bytes:'AA==',vector:[1,10]}})).record;
    const keylessOrdered=await keyless.list({selection:{}});assert.deepEqual(keylessOrdered.records,[keylessSecond,keylessFirst]);
    const keylessFiltered=await keyless.list({selection:{where:{kind:'call',operator:'eq',args:[{kind:'attr',name:'payload'},{kind:'value',value:{a:1,b:2}}]}}});
    assert.deepEqual(keylessFiltered.records,[keylessFirst]);
    const vectorFiltered=await keyless.list({selection:{where:{kind:'call',operator:'ne',args:[{kind:'attr',name:'vector'},{kind:'value',value:[1,2]}]}}});
    assert.deepEqual(vectorFiltered.records,[keylessSecond]);
    const binaryRange=await keyless.list({selection:{where:{kind:'call',operator:'gt',args:[{kind:'attr',name:'bytes'},{kind:'value',value:'AA=='}]}}});assert.deepEqual(binaryRange.records,[keylessFirst]);
    const vectorOrdered=await keyless.list({selection:{orderBy:[{attribute:'vector',direction:'asc',nulls:'last'}]}});assert.deepEqual(vectorOrdered.records,[keylessFirst,keylessSecond]);
    const jsonRange=await keyless.list({selection:{where:{kind:'call',operator:'gt',args:[{kind:'attr',name:'payload'},{kind:'value',value:{a:1,b:2}}]}}});assert.deepEqual(jsonRange.records,[keylessSecond]);
    const vectorRange=await keyless.list({selection:{where:{kind:'call',operator:'gt',args:[{kind:'attr',name:'vector'},{kind:'value',value:[1,2]}]}}});assert.deepEqual(vectorRange.records,[keylessSecond]);
    const prototypeNames=await provider.get({path:'/portable/proto'});
    const prototypeRecord=await prototypeNames.create({record:{constructor:'ordinary attribute'}});
    assert.equal(prototypeRecord.record.__proto__,'1');
    assert.deepEqual(await prototypeNames.read({key:{kind:'primary',values:Object.fromEntries([['__proto__','1']])}}),prototypeRecord);
    const uuid=await provider.get({path:'/portable/uuid'});
    const generated=(await uuid.create({record:{name:'generated'}})).record;
    assert.match(generated.id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    return {record,read,ordered,orderedText,filtered,sparseOrdered,updated,conflict,remaining:await repo.list({selection:{}}),largeRecords,largeConcurrent,prototypeRecord,keylessOrdered,keylessFiltered,vectorFiltered,binaryRange,vectorOrdered,jsonRange,vectorRange,uuidGenerated:true};
}


this.schema = schema; this.map = map;
 }
}
