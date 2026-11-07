// @ts-nocheck
import assert from 'node:assert/strict';
import {test} from 'node:test';
import Runtime from '../../../src/Repository/Runtime.mjs';

const create = () => {
    const calls = {};
    const errors = {create: ({code, message}) => Object.assign(new Error(message), {code})};
    const runtime = new Runtime({
        normalize: {
            value: input => (calls.value = input),
            record: input => (calls.record = input),
            key: input => (calls.key = input),
        },
        selection: {create: input => (calls.selection = input)},
        select: {exec: input => (calls.select = input)},
        errors,
        batch: {
            validate: input => (calls.validate = input),
            plan: input => (calls.plan = input),
        },
    });
    const model = {entities: {'/app/item': {attributes: [{type: {name: 'example.Token'}}]}}};
    const definition = {name: 'example.Token', equality: 'Bytewise equality.', ordering: 'Byte ordering.', literal: {}};
    const handler = {
        name: 'example.Token',
        normalize: value => value,
        copy: value => value,
        equals: (left, right) => left === right,
        compare: (left, right) => left.localeCompare(right),
        fromLiteral: value => value,
    };
    const registry = {
        assertFinalized: () => (calls.finalized = true),
        get: name => (calls.lookup = name, definition),
    };
    return {runtime, calls, model, definition, handler, registry};
};

test('bind selects model handlers and injects the bound dispatch into repository operations', () => {
    const {runtime, calls, model, definition, handler, registry} = create();
    const bound = runtime.bind({model, registry, handlers: [handler]});

    assert.equal(calls.finalized, true);
    assert.equal(calls.lookup, 'example.Token');
    assert.equal(bound.model, model);
    assert.ok(Object.isFrozen(bound.batch));

    const value = {value: 'token'};
    bound.normalize.value(value);
    assert.equal(calls.value.value, 'token');
    assert.equal(calls.value.handlers['example.Token'], handler);

    bound.normalize.record({record: value});
    assert.equal(calls.record.definitions['example.Token'], definition);
    bound.selection.create({selection: {}});
    assert.equal(calls.selection.handlers['example.Token'], handler);
    bound.select.exec({selection: {}});
    assert.equal(calls.select.definitions['example.Token'], definition);
    bound.batch.validate({operations: []});
    assert.equal(calls.validate.model, model);
    bound.batch.plan({operations: [], rows: {}, generate: () => '1'});
    assert.equal(calls.plan.handlers['example.Token'], handler);
});

test('bind accepts named handler maps and rejects a missing model handler', () => {
    const first = create();
    first.runtime.bind({model: first.model, registry: first.registry, handlers: {'example.Token': first.handler}});
    assert.equal(first.calls.lookup, 'example.Token');

    const second = create();
    assert.throws(
        () => second.runtime.bind({model: second.model, registry: second.registry}),
        {code: 'UNSUPPORTED', message: /Missing runtime handler.*example.Token/},
    );
});

test('bind rejects handlers that do not implement declared logical properties', () => {
    const {runtime, model, registry, handler} = create();
    const incompatible = {...handler};
    delete incompatible.compare;

    assert.throws(
        () => runtime.bind({model, registry, handlers: [incompatible]}),
        {code: 'UNSUPPORTED', message: /Incompatible runtime handler.*example.Token/},
    );
});
