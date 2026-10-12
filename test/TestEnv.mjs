import Container from '@teqfw/di';
import {fileURLToPath} from 'node:url';
export const container = new Container();
container.addNamespaceRoot('TeqFw_Dem_', fileURLToPath(new URL('../src', import.meta.url)), '.mjs');
