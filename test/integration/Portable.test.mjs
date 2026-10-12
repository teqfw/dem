// @ts-check
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {container} from '../TestEnv.mjs';
import {scenario} from '../browser/Scenario.mjs';

/** @type {TeqFw_Dem_Compile} */
const compiler = await container.get('TeqFw_Dem_Compile$');

test('standalone logical compilation resolves identity/ref without a storage adapter', async () => {
    const input = scenario();
    const before = structuredClone(input);
    const result = await compiler.exec(input);
    assert.deepEqual(input, before);
    assert.equal('physical' in result, false);
    assert.equal(result.fingerprint, result.effective.fingerprint);
    assert.deepEqual(result.requirements, ['provider.hint']);
    assert.deepEqual(result.model.entity.post.attr.owner.type, result.model.package.domain.entity.user.attr.id.type);
    assert.equal(result.model.entity.post.attr.owner.generation, undefined);
    assert.deepEqual(result.graph.topological, ['/domain/user', '/post']);
    assert(Object.isFrozen(result.model.entity.post.attr.owner.type));
    assert.equal(compiler.assertResult({value: result}), result);
    assert.throws(() => compiler.assertResult({value: structuredClone(result)}), TypeError);
    assert.throws(() => compiler.assertResult({value: {...result}}), TypeError);
    const reversed = await compiler.exec({...input, fragments: [...input.fragments].reverse()});
    assert.deepEqual(reversed, result);
});

test('dialect namespace hints do not cause logical SQL-name collisions', async () => {
    const result = await compiler.exec({
        fragments: [{fragmentId: 'a', packageName: 'a', filename: '/a.json', declaration: {
            version: 2, entity: {a: {attr: {id: {type: {id: 'core.integer'}}}}},
        }}],
        mapEnvelope: {mapId: 'app', packageName: 'app', filename: '/map.json', declaration: {version: 2}},
    });
    assert.deepEqual(result.graph.entities, ['/a']);
});
