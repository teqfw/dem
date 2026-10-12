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

test('scaffold declares the current namespace without advertising runtime contracts', () => {
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
    assert.deepEqual(readdirSync(join(root, 'src')), ['README.md']);
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
            'src/README.md', 'types.d.ts',
        ];
        assert.deepEqual(packed.files.map((/** @type {{path: string}} */ item) => item.path).sort(), expected);
        writeFileSync(join(consumer, 'package.json'), JSON.stringify({
            name: 'dem-consumer', private: true, type: 'module',
            dependencies: {'@teqfw/di': `file:${join(root, 'node_modules/@teqfw/di')}`},
        }));
        execFileSync('npm', ['install', join(consumer, packed.filename),
            '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--cache', join(consumer, 'cache')], {cwd: consumer, stdio: 'pipe'});
        const installed = join(consumer, 'node_modules/@teqfw/dem');
        assert.equal(readFileSync(join(installed, 'types.d.ts'), 'utf8'), readFileSync(join(root, 'types.d.ts'), 'utf8'));
        const require = createRequire(join(consumer, 'probe.mjs'));
        assert.throws(() => require.resolve('@teqfw/dem'), {code: 'ERR_PACKAGE_PATH_NOT_EXPORTED'});
        assert.throws(() => require.resolve('@teqfw/dem/src/README.md'), {code: 'ERR_PACKAGE_PATH_NOT_EXPORTED'});
        writeFileSync(join(consumer, 'jsconfig.json'), JSON.stringify({
            compilerOptions: {checkJs: true, strict: true, noEmit: true, module: 'nodenext', moduleResolution: 'nodenext', types: ['@teqfw/dem']},
            include: ['consumer.mjs'],
        }));
        writeFileSync(join(consumer, 'consumer.mjs'), '// @ts-check\nexport {};\n');
        execFileSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '-p', join(consumer, 'jsconfig.json')], {cwd: consumer, stdio: 'pipe'});
    } finally {
        rmSync(consumer, {recursive: true, force: true});
    }
});
