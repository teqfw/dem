// @ts-check
import {test} from 'node:test';
import assert from 'node:assert/strict';
import Select from '../../../src/Repository/Select.mjs';

const entity = /** @type {TeqFw_Dem_Entity} */({attributes:[{name:'value',type:{name:'decimal'},nullable:true,generation:false}],primaryKey:null,uniqueKeys:{},relations:{},indexes:{}});
const evaluator = new Select({
    data:/** @type {any} */({serialize:JSON.stringify}),
    errors:/** @type {any} */({create:(/** @type {any} */ opts)=>Object.assign(new Error(opts.message),{code:opts.code})}),
    normalize:/** @type {any} */({record:(/** @type {any} */ {record}) => structuredClone(record)}),
    selection:/** @type {any} */({create:(/** @type {any} */ {selection}) => ({orderBy:[{attribute:'value',direction:'asc',nulls:'last'}],offset:0,limit:null,...selection})}),
});
test('preserves decimal precision and detached records with explicit null placement', () => {
    const records = [{value:'9007199254740993.002'},{value:null},{value:'9007199254740993.001'}];
    const result = evaluator.exec({entity,records,selection:{}});
    assert.deepEqual(result.records,[records[2],records[0],records[1]]);
    result.records[0].value = 'changed';
    assert.equal(records[2].value,'9007199254740993.001');
});
test('two-valued null comparisons distinguish negated equality and inequality', () => {
    const records=[{value:null},{value:'1.000'},{value:'2.000'}];
    const eq={kind:'call',operator:'eq',args:[{kind:'attr',name:'value'},{kind:'value',value:'1.000'}]};
    assert.equal(evaluator.exec({entity,records,selection:{where:{...eq,operator:'ne'}}}).records.length,1);
    assert.equal(evaluator.exec({entity,records,selection:{where:{kind:'call',operator:'not',args:[eq]}}}).records.length,2);
    assert.deepEqual(evaluator.exec({entity,records,selection:{limit:0}}),{records:[]});
});


test('rejects non-array records rather than treating them as an empty collection',()=>{
    assert.throws(()=>evaluator.exec({entity,records:/** @type {any} */({}),selection:{}}),{code:'INVALID_INPUT'});
});
