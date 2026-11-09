import assert from 'node:assert/strict';
import {test} from 'node:test';
import Schema from '../../../../src/Conformance/Application/Schema.mjs';

test('application schema exposes its package source and task declaration', () => {
    const component = new Schema();
    assert.equal(component.source.packageName, 'demo');
    assert.equal(component.source.document, component.schema);
    assert.equal(component.schema.$format, 2);
    assert.equal(component.schema.$namespace, '/demo/');
    assert.ok(component.schema.task.attributes.some(attribute => attribute.name === 'title'));
});
