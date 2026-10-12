# Source boundary

This directory is the `TeqFw_Dem_` namespace root. Future components use native
`.mjs` JavaScript modules and JSDoc, with PascalCase namespace segments.

The scaffold contains no runtime modules. Add components only with an accepted
contract and meaningful tests. Logical code must work in Node.js and browsers;
filesystem loading, SQL, IndexedDB, and host composition stay outside this layer.
