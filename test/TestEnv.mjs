import Container from '@teqfw/di';
import {fileURLToPath} from 'node:url';
export const container = new Container({namespaces:[{prefix:'TeqFw_Dem_',target:fileURLToPath(new URL('../src', import.meta.url)),defaultExt:'.mjs'}]});
const registry = await container.get('TeqFw_Dem_Registry$');
registry.finalize();
