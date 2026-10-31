// @ts-check
import {test} from 'node:test';
import assert from 'node:assert/strict';
import RepositoryBatch from '../../../src/Api/RepositoryBatch.mjs';

test('unselected atomic batch explicitly rejects',async()=>{
    const batch=new RepositoryBatch({errors:/** @type {any} */({create:(/** @type {any} */ args)=>Object.assign(new Error(args.message),{code:args.code})})});
    await assert.rejects(batch.execute({operations:[]}),{code:'UNSUPPORTED'});
});
