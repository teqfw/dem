// @ts-check
import assert from 'node:assert/strict';
import {test} from 'node:test';
import Data from '../../../src/Util/Data.mjs';
const data=new Data();
test('canonical JSON sorts numeric-like keys directly and preserves values',()=>{
    const value=JSON.parse('{"2":2,"10":10,"__proto__":{"yes":true},"x":[null,false,-0]}');
    assert.equal(data.serialize(value),'{"10":10,"2":2,"__proto__":{"yes":true},"x":[null,false,0]}');
    assert.equal(Reflect.get({},'yes'),undefined);
});
test('raw JSON detects decoded duplicate keys at every nesting level',()=>{
    assert.deepEqual(data.parse('{"a":{"b":1},"b":2}'),{a:{b:1},b:2});
    for(const text of ['{"a":1,"a":2}','{"a":1,"\\u0061":2}','[{"b":1,"b":2}]','[1,]','{"a":}','true false','01',''])assert.throws(()=>data.parse(text));
});
test('JSON validation rejects data loss and freeze reaches nested data',()=>{
    const cycle={};Object.assign(cycle,{cycle});
    /** @type {unknown[]} */ const decorated=[];decorated.length=1;Object.assign(decorated,{extra:1});
    assert.throws(()=>data.serialize(decorated));
    for(const value of [undefined,NaN,Infinity,1n,()=>1,new Date(),cycle,[,1],'\ud800',{x:undefined}])assert.throws(()=>data.serialize(value));
    const accessor=Object.defineProperty({},'x',{get(){throw new Error('Do not call');},enumerable:true});
    assert.throws(()=>data.serialize(accessor),/getters/);
    const value=data.freeze({nested:{items:[1]}});assert.ok(Object.isFrozen(value.nested.items));
});
