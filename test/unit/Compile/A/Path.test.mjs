// @ts-check
import assert from 'node:assert/strict';
import {test} from 'node:test';
import Path from '../../../../src/Compile/A/Path.mjs';

const path = new Path();

test('logical addresses normalize without losing node kind', () => {
    assert.equal(path.normalize('customer', '/vnd/sales/'), '/vnd/sales/customer');
    assert.equal(path.normalize('../customer', '/vnd/sales/'), '/vnd/customer');
    assert.equal(path.normalize('/vnd//sales/./../sales/'), '/vnd/sales/');
    assert.equal(path.normalize('/vnd/name'), '/vnd/name');
    assert.equal(path.normalize('/vnd/name/'), '/vnd/name/');
    assert.deepEqual(path.parents('/vnd/sales/order'), ['/', '/vnd/', '/vnd/sales/']);
    for (const invalid of ['/../a', '../../a', '/Vnd/a', '/vnd/a-b', ''])
        assert.throws(() => path.normalize(invalid));
});

test('Format 2 namespace and declaration paths are canonical and relative', () => {
    assert.equal(path.namespace('/pde/office/core/'), '/pde/office/core/');
    assert.equal(path.declaration('/pde/office/core/', 'desk/attachment'), '/pde/office/core/desk/attachment');
    assert.equal(path.declaration('/pde/office/core/', 'desk/'), '/pde/office/core/desk/');
    for (const namespace of ['/', 'pde/office/', '/pde/office', '/pde//office/', '/Pde/office/', '/pde/office_team/'])
        assert.throws(() => path.namespace(namespace));
    for (const key of ['/desk/item', 'desk//item', 'desk/./item', 'desk/../item', 'desk_item', 'desk-item', '1desk'])
        assert.throws(() => path.declaration('/pde/office/core/', key));
    assert.equal(path.canonicalAddress('/host/desk/attachment'), '/host/desk/attachment');
    assert.equal(path.canonicalAddress('/host/desk/'), '/host/desk/');
    assert.equal(path.isReserved('/dem'), true);
    assert.equal(path.isReserved('/dem/entity'), true);
    assert.equal(path.isReserved('/dem/'), true);
    assert.equal(path.isReserved('/demo/entity'), false);
    for (const address of ['/host_team/item', '/Host/item', '/host//item'])
        assert.throws(() => path.canonicalAddress(address));
});

test('local references allow navigation inside the source namespace only', () => {
    const namespace = '/vnd/sales/';
    assert.equal(path.reference('../customer', '/vnd/sales/order/', namespace), '/vnd/sales/customer');
    assert.equal(path.reference('./customer', '/vnd/sales/', namespace), '/vnd/sales/customer');
    assert.equal(path.reference('.', '/vnd/sales/', namespace), '/vnd/sales/');
    assert.throws(() => path.reference('../customer', '/vnd/sales/', namespace));
    assert.throws(() => path.reference('../salesextra/customer', '/vnd/sales/', namespace));
    assert.throws(() => path.reference('/vnd/salesextra/customer', '/vnd/sales/', namespace));
});
