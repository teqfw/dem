// @ts-check
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';

const root = fileURLToPath(new URL('../../', import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

test('package declares a closed DI-only runtime boundary', () => {
    assert.equal(manifest.name, '@teqfw/dem');
    assert.equal(manifest.type, 'module');
    assert.equal(manifest.license, 'Apache-2.0');
    assert.deepEqual(manifest.exports, {'.': {types: './types.d.ts'}, './conformance':'./conformance/Repository.mjs'});
    assert.equal(manifest.types, 'types.d.ts');
    assert.ok(manifest.dependencies['@teqfw/cli']);
    assert.equal(manifest.teqfw.namespaces, undefined);
    assert.deepEqual(manifest.teqfw.fw.di.namespaces, [
        {prefix: 'TeqFw_Dem_', path: './src', ext: '.mjs'},
    ]);
    assert.ok(readdirSync(join(root, 'src')).includes('Compile.mjs'));
    const skill = readFileSync(join(root, 'skills/teqfw-dem/SKILL.md'), 'utf8');
    assert.ok(skill.includes('Domain Entity Model'));
});

test('real archive installs into a consumer, preserves declarations, and excludes private content', () => {
    const consumer = mkdtempSync(join(tmpdir(), 'teqfw-dem-consumer-'));
    try {
        const packed = JSON.parse(execFileSync('npm', [
            'pack', '--json', '--ignore-scripts', '--pack-destination', consumer,
            '--cache', join(consumer, 'cache'),
        ], {cwd: root, encoding: 'utf8'}))[0];
        const expected = [
            'CHANGELOG.md', 'LICENSE', 'README.md', 'package.json', 'conformance/Repository.mjs',
            ...readdirSync(join(root, 'skills'), {recursive:true,withFileTypes:true}).filter(entry=>entry.isFile()).map(entry=>'skills/'+join(entry.parentPath,entry.name).slice(join(root,'skills').length+1)),
            'types.d.ts',
            ...readdirSync(join(root, 'src'), {recursive: true, withFileTypes: true})
                .filter((entry) => entry.isFile())
                .map((entry) => 'src/' + join(entry.parentPath, entry.name).slice(join(root, 'src').length + 1)),
        ];
        assert.deepEqual(packed.files.map((/** @type {{path: string}} */ item) => item.path).sort(), expected.sort());
        writeFileSync(join(consumer, 'package.json'), JSON.stringify({
            name: 'dem-consumer', private: true, type: 'module',
            dependencies: {
                '@teqfw/di': `file:${join(root, 'node_modules/@teqfw/di')}`,
                '@teqfw/cli': `file:${join(root, 'node_modules/@teqfw/cli')}`,
                '@teqfw/cfg': `file:${join(root, 'node_modules/@teqfw/cfg')}`,
                '@teqfw/log': `file:${join(root, 'node_modules/@teqfw/log')}`,
                '@types/node': `file:${join(root, 'node_modules/@types/node')}`,
                'undici-types': `file:${join(root, 'node_modules/undici-types')}`,
            },
        }));
        execFileSync('npm', ['install', join(consumer, packed.filename),
            '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--cache', join(consumer, 'cache')], {cwd: consumer, stdio: 'pipe'});
        const installed = join(consumer, 'node_modules/@teqfw/dem');
        assert.equal(readFileSync(join(installed, 'types.d.ts'), 'utf8'), readFileSync(join(root, 'types.d.ts'), 'utf8'));
        const require = createRequire(join(consumer, 'probe.mjs'));
        assert.throws(() => require.resolve('@teqfw/dem'), {code: 'ERR_PACKAGE_PATH_NOT_EXPORTED'});
        assert.throws(() => require.resolve('@teqfw/dem/src/README.md'), {code: 'ERR_PACKAGE_PATH_NOT_EXPORTED'});
        writeFileSync(join(consumer, 'jsconfig.json'), JSON.stringify({
            compilerOptions: {checkJs: true, strict: true, noEmit: true, module: 'nodenext', moduleResolution: 'nodenext', types: ['node', '@teqfw/dem'], preserveSymlinks: true},
            include: ['consumer.mjs', 'node_modules/@teqfw/di/src', 'node_modules/@teqfw/di/types.d.ts', 'node_modules/@teqfw/dem/src', 'node_modules/@teqfw/dem/types.d.ts'],
        }));
        writeFileSync(join(consumer, 'consumer.mjs'), `// @ts-check
import Container from '@teqfw/di';

const container = new Container();
container.addNamespaceRoot('TeqFw_Dem_', new URL('./node_modules/@teqfw/dem/src', import.meta.url).pathname, '.mjs');
/** @type {TeqFw_Dem_Compile} */
const compiler = await container.get('TeqFw_Dem_Compile$');
/** @type {import('@teqfw/dem').DemCompilationResult} */
const result = await compiler.exec({
    schemas: [{packageName: 'consumer', filename: 'etc/dem-schema.json', document: {
        $format: 1, '/app/item': {attributes: [{name: 'id', type: {name: 'identity'}}]},
    }}],
});
if (compiler.assertResult({value: result}) !== result || !Object.isFrozen(result.model)) throw new Error('Invalid result');
/** @type {import('@teqfw/dem').DemSelection} */
const selection = (/** @type {TeqFw_Dem_Dto_Query_Selection__Factory} */ (await container.get('TeqFw_Dem_Dto_Query_Selection__Factory$'))).create({entity:result.model.entities['/app/item'],selection:{limit:0}});
if (selection.limit !== 0) throw new Error('Invalid selection');
/** @type {import('@teqfw/dem').DemRepositoryProvider} */
const provider = await container.get('TeqFw_Dem_Api_RepositoryProvider$');
try { await provider.get({path:'/app/item'}); throw new Error('Provider should require host substitution'); }
catch (error) { if (!(error instanceof Error) || error.name !== 'DemRepositoryError') throw error; }
const {register} = await import('@teqfw/dem/conformance');
if (typeof register !== 'function') throw new Error('Missing published conformance');
if (result.graph.components[0][0] !== '/app/item' || 'physical' in result) throw new Error('Logical boundary failed');
`);
        const probe = readFileSync(join(consumer, 'consumer.mjs'), 'utf8').replace("", '');
        writeFileSync(join(consumer, 'probe.mjs'), probe);
        execFileSync(process.execPath, [join(consumer, 'probe.mjs')], {cwd: consumer, stdio: 'pipe'});
        execFileSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '-p', join(consumer, 'jsconfig.json')], {cwd: consumer, stdio: 'inherit'});
    } finally {
        rmSync(consumer, {recursive: true, force: true});
    }
});
