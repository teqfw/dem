import Container from '@teqfw/di';
import {fileURLToPath} from 'node:url';
export const container = new Container();
container.addNamespaceRoot('TeqFw_Dem_', fileURLToPath(new URL('../src', import.meta.url)), '.mjs');
const registry = await container.get('TeqFw_Dem_Registry$');
registry.finalize();
