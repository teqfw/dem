// @ts-check
/**
 * @namespace TeqFw_Dem_Conformance_Evolution
 * @description Shared conformance component.
 */
export default class Evolution {
 /** Create the component. */
 constructor() {
/** @returns {Array<any>} */
const evolutionSchemas = function () {
    const original=/** @type {any} */({$format:2,$namespace:'/evolution/',item:{attributes:[{name:'id',type:{name:'identity'},generation:true},{name:'name',type:{name:'text'}}]},removed:{attributes:[{name:'value',type:{name:'text'}}]}});
    const added=structuredClone(original);delete added.removed;
    added.item.attributes.push(/** @type {any} */({name:'category',type:{name:'text'},default:'default'}));
    added.item.indexes=/** @type {any} */({category:{attributes:['category']}});
    return [original,added];
}
/**
 * open creates a backend in the same test-owned scope without initializing it.
 * The harness owns all connections and final cleanup.
 * @param {object} deps
 * @param {Function} deps.open
 * @param {any} deps.assert
 * @returns {Promise<any>}
 */
this.exercise = async function ({open,assert}) {
    const schemas=evolutionSchemas(),backends=[];
    try {
        const first=await open(schemas[0]);backends.push(first);
        assert.equal((await first.createSchema()).version,1);
        const repo=await first.get({path:'/evolution/item'});
        await repo.create({record:{name:'old'}});
        assert.equal((await first.createSchema()).version,1);
        const second=await open(schemas[1]);backends.push(second);
        assert.equal((await second.createSchema()).version,2);
        await assert.rejects(repo.list({selection:{}}),{code:'STORAGE'});
        await assert.rejects(second.get({path:'/evolution/removed'}),{code:'NOT_FOUND'});
        const upgraded=await (await second.get({path:'/evolution/item'})).list({selection:{where:{kind:'call',operator:'eq',args:[{kind:'attr',name:'category'},{kind:'value',value:'default'}]}}});
        assert.equal(upgraded.records[0].name,'old');
        const history=await second.getSchemaHistory();assert.equal(history.schemas.length,2);
        return {upgraded,history};
    } finally {for(const backend of backends)await backend.close();}
}

this.schemas = evolutionSchemas;
 }
}
