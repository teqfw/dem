// @ts-check
/**
 * @namespace TeqFw_Dem_Conformance_Application_Schema
 * @description Shared conformance component.
 */
export default class Schema {
 /** Create the component. */
 constructor() {
/** @description Shared logical input for the task-triage application example. */
const schema = {
    $format: 2,
    $namespace: '/demo/',
    task: {attributes: [
        {name: 'id', type: {name: 'identity'}, generation: true},
        {name: 'title', type: {name: 'text'}},
        {name: 'priority', type: {name: 'integer', params: {bits: 16, unsigned: true}}},
        {name: 'state', type: {name: 'enum', params: {values: ['open', 'done']}}, default: 'open'},
        {name: 'note', type: {name: 'text'}, nullable: true},
        {name: 'metadata', type: {name: 'json'}},
    ]},
};
this.source = {packageName: 'demo', filename: 'etc/dem-schema.json', document: schema};

this.schema = schema;
 }
}
