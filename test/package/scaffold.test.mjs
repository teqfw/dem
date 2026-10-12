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
    assert.deepEqual(manifest.exports, {'.': {types: './types.d.ts'}});
    assert.equal(manifest.types, 'types.d.ts');
    assert.equal(manifest.dependencies, undefined);
    assert.equal(manifest.teqfw.namespaces, undefined);
    assert.deepEqual(manifest.teqfw.fw.di.namespaces, [
        {prefix: 'TeqFw_Dem_', path: './src', ext: '.mjs'},
    ]);
    assert.ok(readdirSync(join(root, 'src')).includes('Compile.mjs'));
    const skill = readFileSync(join(root, 'skills/teqfw-dem/SKILL.md'), 'utf8');
    assert.ok(skill.includes(`package version ${manifest.version}`));
});

test('real archive installs into a consumer, preserves declarations, and excludes private content', () => {
    const consumer = mkdtempSync(join(tmpdir(), 'teqfw-dem-consumer-'));
    try {
        const packed = JSON.parse(execFileSync('npm', [
            'pack', '--json', '--ignore-scripts', '--pack-destination', consumer,
            '--cache', join(consumer, 'cache'),
        ], {cwd: root, encoding: 'utf8'}))[0];
        const expected = [
            'CHANGELOG.md', 'LICENSE', 'README.md', 'package.json',
            'skills/teqfw-dem/SKILL.md', 'skills/teqfw-dem/references/scope.md',
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
    fragments: [{fragmentId: 'consumer', packageName: 'consumer', filename: '/model.json', declaration: {
        version: 2, entity: {item: {attr: {id: {type: {id: 'core.identity'}}}}},
    }}],
    mapEnvelope: {mapId: 'host', packageName: 'host', filename: '/map.json', declaration: {version: 2}},
});
if (compiler.assertResult({value: result}) !== result || !Object.isFrozen(result.model)) throw new Error('Invalid result');
if (result.graph.entities[0] !== '/item' || 'physical' in result) throw new Error('Logical boundary failed');
`);
        const probe = readFileSync(join(consumer, 'consumer.mjs'), 'utf8').replace("", '');
        writeFileSync(join(consumer, 'probe.mjs'), probe);
        execFileSync(process.execPath, [join(consumer, 'probe.mjs')], {cwd: consumer, stdio: 'pipe'});
        execFileSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '-p', join(consumer, 'jsconfig.json')], {cwd: consumer, stdio: 'inherit'});
    } finally {
        rmSync(consumer, {recursive: true, force: true});
    }
});
