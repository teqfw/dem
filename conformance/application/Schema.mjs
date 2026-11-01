// @ts-check
/** @description Shared logical input for the task-triage application example. */
export const schema = {
    $format: 1,
    '/demo/task': {attributes: [
        {name: 'id', type: {name: 'identity'}, generation: true},
        {name: 'title', type: {name: 'text'}},
        {name: 'priority', type: {name: 'integer', params: {bits: 16, unsigned: true}}},
        {name: 'state', type: {name: 'enum', params: {values: ['open', 'done']}}, default: 'open'},
        {name: 'note', type: {name: 'text'}, nullable: true},
        {name: 'metadata', type: {name: 'json'}},
    ]},
};
export const source = {packageName: 'demo', filename: 'etc/dem-schema.json', document: schema};
