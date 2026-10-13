// @ts-check
/** Explicit unit fakes; integration tests exercise real composed components. */
export const data = {
    isObject: (/** @type {any} */ x) => !!x && typeof x==='object' && !Array.isArray(x),
    serialize: JSON.stringify,
    freeze: (/** @type {any} */ x) => Object.freeze(x),
};
export const diagnostic = {
    create: (/** @type {string} */ code,/** @type {any} */ source,/** @type {string} */ pointer='',/** @type {any} */ details={})=>({code,severity:'error',source,pointer,details}),
};
export const path = {normalize:(/** @type {string} */ x)=>x,parents:()=>['/','/app/']};
export function work(){return {schemas:[],map:{sources:{},identityProfiles:{}},mapSource:null,diagnostics:[],entities:{},packages:[],provenance:{entities:{},map:null,pathMappings:[],bindings:[]}};}
