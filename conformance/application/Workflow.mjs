// @ts-check
/**
 * @namespace Demo_Workflow
 * @description Triage tasks through portable logical repositories and selections.
 */
export default class Workflow {
    /**
     * @param {object} deps
     * @param {TeqFw_Dem_Api_RepositoryProvider} deps.provider
     * @param {TeqFw_Dem_Dto_Query_Selection__Factory} deps.selection
     */
    constructor({provider, selection}) {
        /**
         * @param {object} deps
         * @param {TeqFw_Dem_Model} deps.model
         * @returns {Promise<object>}
         */
        this.exec = async function ({model}) {
            const path = '/demo/task';
            const repository = await provider.get({path});
            const entity = model.entities[path];
            const input = {title: 'Write guide', priority: 20, metadata: {tags: ['docs']}};
            const originalInput = JSON.stringify(input);
            const created = await repository.create({record: input});
            const inputUnchanged = JSON.stringify(input) === originalInput;
            const originalCreated = JSON.parse(JSON.stringify(created));
            /** @type {TeqFw_Dem_Key} */
            const firstKey = {kind: 'primary', values: {id: created.record.id}};
            input.metadata.tags[0] = 'changed by caller';
            const read = await repository.read({key: firstKey});
            created.record.title = 'changed detached result';
            (/** @type {{tags: Array<string>}} */ (created.record.metadata)).tags[0] = 'changed detached metadata';
            const afterDetachedMutation = await repository.read({key: firstKey});

            const second = await repository.create({record: {
                title: 'Fix issue', priority: 5, metadata: {tags: ['urgent']},
            }});
            await repository.create({record: {
                title: 'Archive task', priority: 1, state: 'done', metadata: {tags: []},
            }});
            await repository.create({record: {
                title: 'Review patch', priority: 10, metadata: {tags: ['review']},
            }});
            const changes = {priority: 12, note: 'scheduled'};
            const updated = await repository.update({
                key: {kind: 'primary', values: {id: second.record.id}}, changes,
            });
            const changesUnchanged = changes.priority === 12 && changes.note === 'scheduled';
            const page = await repository.list({selection: selection.create({entity, selection: {
                where: {kind: 'call', operator: 'and', args: [
                    {kind: 'call', operator: 'eq', args: [
                        {kind: 'attr', name: 'state'}, {kind: 'value', value: 'open'},
                    ]},
                    {kind: 'call', operator: 'gte', args: [
                        {kind: 'attr', name: 'priority'}, {kind: 'value', value: 10},
                    ]},
                ]},
                orderBy: [{attribute: 'priority', direction: 'asc', nulls: 'last'}],
                offset: 1, limit: 1,
            }})});
            /** @type {TeqFw_Dem_Key} */
            const missingKey = {kind: 'primary', values: {id: '999999'}};
            const missing = {
                read: await repository.read({key: missingKey}),
                update: await repository.update({key: missingKey, changes: {note: 'absent'}}),
                delete: await repository.delete({key: missingKey}),
            };
            const deleted = await repository.delete({key: firstKey});
            const deletedAgain = await repository.delete({key: firstKey});
            const readDeleted = await repository.read({key: firstKey});
            const remaining = await repository.list({selection: selection.create({entity, selection: {
                orderBy: [{attribute: 'priority', direction: 'asc', nulls: 'last'}],
            }})});
            return {inputUnchanged, changesUnchanged, created: originalCreated, read,
                afterDetachedMutation, updated, page, missing, deleted, deletedAgain,
                readDeleted, remaining};
        };
    }
}
export const __deps__ = Object.freeze({default: Object.freeze({
    provider: 'TeqFw_Dem_Api_RepositoryProvider$',
    selection: 'TeqFw_Dem_Dto_Query_Selection__Factory$',
})});
