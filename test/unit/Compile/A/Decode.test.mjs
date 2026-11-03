// @ts-check
import assert from 'node:assert/strict';
import {test} from 'node:test';
import Decode from '../../../../src/Compile/A/Decode.mjs';
import Path from '../../../../src/Compile/A/Path.mjs';
import {data, diagnostic} from '../../../Mocks.mjs';

const path = new Path();
const decode = new Decode(/** @type {any} */ ({data, path, diagnostic}));
const envelope = (/** @type {any} */ document, packageName = 'p') => ({packageName, filename: 'schema.json', document});

test('decode accepts canonical Format 2 declarations and keeps source paths', () => {
    const result = decode.exec({schemas: [envelope({
        $format: 2,
        $namespace: '/pde/office/core/',
        'desk/attachment': {attributes: [{name: 'desk_id', type: {name: 'identity'}}]},
        'desk/': {},
    })]});

    assert.deepEqual(result.diagnostics, []);
    assert.equal(result.schemas[0].namespace, '/pde/office/core/');
    assert.ok(result.schemas[0].nodes['/pde/office/core/desk/attachment']);
    assert.deepEqual(result.schemas[0].packages, ['/pde/office/core/desk/']);
    assert.equal(result.schemas[0].nodes['/pde/office/core/desk/attachment'].pointer, '/desk~1attachment');
});

test('decode rejects Format 1 schemas, malformed namespaces and malformed declaration paths', () => {
    const old = decode.exec({schemas: [envelope({$format: 1, '/app/item': {attributes: [{name: 'id', type: {name: 'identity'}}]}})]});
    assert.equal(old.diagnostics[0].code, 'DEM_FORMAT');
    assert.equal(old.diagnostics[0].pointer, '/$format');

    for (const namespace of [undefined, 'pde/office/', '/pde/office', '/pde//office/', '/Pde/office/', '/pde/office_team/', '/']) {
        const document = /** @type {any} */ ({$format: 2, '/item': {attributes: [{name: 'id', type: {name: 'identity'}}]}});
        if (namespace !== undefined)
            document.$namespace = namespace;
        const result = decode.exec({schemas: [envelope(document)]});
        assert.ok(result.diagnostics.some(d => d.pointer === '/$namespace'));
    }

    for (const key of ['/absolute', 'a//b', 'a/./b', 'a/../b', 'a_b', 'a-b', '1a']) {
        const result = decode.exec({schemas: [envelope({
            $format: 2,
            $namespace: '/app/',
            [key]: {attributes: [{name: 'id', type: {name: 'identity'}}]},
        })]});
        assert.ok(result.diagnostics.some(d => d.code === 'DEM_PATH'), key);
    }
});

test('decode keeps Format 1 host maps and bounds local references before mapping', () => {
    const valid = decode.exec({
        schemas: [envelope({
            $format: 2,
            $namespace: '/vnd/sales/',
            'order/item': {attributes: [{name: 'owner', type: {name: 'ref'}}], relations: {owner: {attributes: ['owner'], target: {path: '../customer', attributes: ['id']}}}},
            customer: {attributes: [{name: 'id', type: {name: 'identity'}}]},
        })],
        map: envelope({$format: 1, sources: {p: {rename: {'/vnd/sales/': '/mapped/'}}}}, 'host'),
    });
    assert.deepEqual(valid.diagnostics, []);
    assert.equal(valid.schemas[0].nodes['/vnd/sales/order/item'].localTargets.owner, '/vnd/sales/customer');
    assert.equal(valid.mapSource?.packageName, 'host');

    const escaped = decode.exec({schemas: [envelope({
        $format: 2,
        $namespace: '/vnd/sales/',
        order: {attributes: [{name: 'owner', type: {name: 'ref'}}], relations: {owner: {attributes: ['owner'], target: {path: '../customer', attributes: ['id']}}}},
    })]});
    assert.equal(escaped.diagnostics[0].code, 'DEM_PATH');
    assert.equal(escaped.diagnostics[0].pointer, '/order/relations/owner/target/path');
});
