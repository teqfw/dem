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
    assert.deepEqual(manifest.dependencies ?? {}, {});
    assert.equal(manifest.peerDependencies['@teqfw/di'], '^2.12.1');
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
        const packResult = JSON.parse(execFileSync('npm', [
            'pack', '--json', '--ignore-scripts', '--pack-destination', consumer,
            '--cache', join(consumer, 'cache'),
        ], {cwd: root, encoding: 'utf8'}));
        const packed = Array.isArray(packResult) ? packResult[0] : Object.values(packResult)[0];
        const expected = [
            'CHANGELOG.md', 'LICENSE', 'README.md', 'package.json', 'etc/dem-schema.json',
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
            },
        }));
        const installEnv = {...process.env};
        for (const key of Object.keys(installEnv)) if (key.toLowerCase() === 'npm_config_allow_scripts') delete installEnv[key];
        execFileSync('npm', ['install', join(consumer, packed.filename),
            '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--allow-scripts=', '--cache', join(consumer, 'cache')], {cwd: consumer, stdio: 'pipe', env: installEnv});
        const installed = join(consumer, 'node_modules/@teqfw/dem');
        assert.equal(readFileSync(join(installed, 'types.d.ts'), 'utf8'), readFileSync(join(root, 'types.d.ts'), 'utf8'));
        const require = createRequire(join(consumer, 'probe.mjs'));
        assert.throws(() => require.resolve('@teqfw/dem'), {code: 'ERR_PACKAGE_PATH_NOT_EXPORTED'});
        assert.throws(() => require.resolve('@teqfw/dem/etc/dem-schema.json'), {code: 'ERR_PACKAGE_PATH_NOT_EXPORTED'});
        assert.throws(() => require.resolve('@teqfw/dem/src/README.md'), {code: 'ERR_PACKAGE_PATH_NOT_EXPORTED'});
        writeFileSync(join(consumer, 'consumer.mjs'), `
import Container from '@teqfw/di';
import NamespaceRegistry from '@teqfw/di/node/registry/namespace';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const namespaces = await new NamespaceRegistry({fs, path, appRoot: process.cwd()}).build();
const container = new Container({namespaces:namespaces.map(({prefix,dirAbs,ext})=>({prefix,target:dirAbs,defaultExt:ext}))});
const acquire = await container.get('TeqFw_Dem_Acquire$');
const acquired = await acquire.exec({hostRoot: process.cwd()});
if (!acquired.schemas.some(schema => schema.packageName === '@teqfw/dem' && schema.filename === 'etc/dem-schema.json')) throw new Error('Installed DEM schema was not acquired');
const registry = await container.get('TeqFw_Dem_Registry$');
registry.finalize();
const compiler = await container.get('TeqFw_Dem_Compile$');
const result = await compiler.exec({
    schemas: [{packageName: 'consumer', filename: 'etc/dem-schema.json', document: {
        $format: 2, $namespace: '/app/', item: {attributes: [{name: 'id', type: {name: 'identity'}}]},
    }}],
    selection: [{packageName: 'consumer', entityPath: '/app/item'}],
});
if (compiler.assertResult({value: result}) !== result || !Object.isFrozen(result.model)) throw new Error('Invalid result');
const selection = (await container.get('TeqFw_Dem_Dto_Query_Selection__Factory$')).create({entity:result.model.entities['/app/item'],selection:{limit:0}});
if (selection.limit !== 0) throw new Error('Invalid selection');
const evaluator=await container.get('TeqFw_Dem_Repository_Select$');
if (evaluator.exec({entity:result.model.entities['/app/item'],records:[{id:'10'},{id:'2'}],selection:{}}).records[0].id !== '2') throw new Error('Installed selection evaluation failed');
const provider = await container.get('TeqFw_Dem_Api_RepositoryProvider$');
try { await provider.get({path:'/app/item'}); throw new Error('Provider should require host substitution'); }
catch (error) { if (!(error instanceof Error) || error.name !== 'DemRepositoryError') throw error; }
const atomic=await container.get('TeqFw_Dem_Api_RepositoryBatch$');
try {await atomic.execute({operations:[]});throw new Error('Batch should require host substitution');}
catch(error) {if(!(error instanceof Error) || error.name!=='DemRepositoryError')throw error;}
const suite = await container.get('TeqFw_Dem_Conformance_Repository$');
const values = await container.get('TeqFw_Dem_Conformance_Values$');
const atomicWorkload = await container.get('TeqFw_Dem_Conformance_Atomic$');
const extended = await container.get('TeqFw_Dem_Conformance_Extended$');
const evolution = await container.get('TeqFw_Dem_Conformance_Evolution$');
const appSchema = await container.get('TeqFw_Dem_Conformance_Application_Schema$');
const workflow = await container.get('TeqFw_Dem_Conformance_Application_Workflow$');
if (typeof suite.register !== 'function' || typeof values.exercise !== 'function' || typeof atomicWorkload.exercise !== 'function' || typeof extended.exercise !== 'function' || typeof evolution.exercise !== 'function' || appSchema.source.document.$format !== 2 || typeof workflow.exec !== 'function') throw new Error('Missing DI conformance components');
if (result.graph.components[0][0] !== '/app/item' || 'physical' in result) throw new Error('Logical boundary failed');
`);
        const probe = readFileSync(join(consumer, 'consumer.mjs'), 'utf8').replace("", '');
        writeFileSync(join(consumer, 'probe.mjs'), probe);
        execFileSync(process.execPath, [join(consumer, 'probe.mjs')], {cwd: consumer, stdio: 'pipe'});
    } finally {
        rmSync(consumer, {recursive: true, force: true});
    }
});
