// @ts-check
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createServer} from 'node:http';
import {readFile, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import Container from '@teqfw/di';
import {scenario} from './Scenario.mjs';

test('browser compilation matches Node.js', async () => {
    const root = fileURLToPath(new URL('../../', import.meta.url));
    const container = new Container();
    container.addNamespaceRoot('TeqFw_Dem_', join(root, 'src'), '.mjs');
    /** @type {TeqFw_Dem_Compile} */
    const compiler = await container.get('TeqFw_Dem_Compile$');
    const input = scenario();
    const expected = JSON.parse(JSON.stringify(await compiler.exec(input)));
    const profile = await mkdtemp(join(tmpdir(), 'dem-browser-'));
    /** @type {(value: unknown) => void} */
    let receive;
    const result = new Promise((resolveResult) => { receive = resolveResult; });
    const page = `<!doctype html><meta charset="utf-8"><script type="module">
    import Container from '/node_modules/@teqfw/di/dist/esm.js';
    import {scenario} from '/test/browser/Scenario.mjs';
    try {
        const container = new Container();
        container.addNamespaceRoot('TeqFw_Dem_', location.origin + '/src', '.mjs');
        const compiler = await container.get('TeqFw_Dem_Compile$');
        const input = scenario();
        const compiled = await compiler.exec(input);
        await fetch('/result', {method: 'POST', body: JSON.stringify({compiled, browser: navigator.userAgent})});
    } catch (error) { await fetch('/result', {method: 'POST', body: JSON.stringify({error: error.stack})}); }
    </script>`;
    const server = createServer(async (request, response) => {
        if (request.url === '/result' && request.method === 'POST') {
            let body = '';
            for await (const part of request) body += part;
            receive(JSON.parse(body));
            response.end('ok');
            return;
        }
        if (request.url === '/') { response.setHeader('content-type', 'text/html'); response.end(page); return; }
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
        const path = resolve(root, '.' + pathname);
        if (!path.startsWith(root)) { response.writeHead(403).end(); return; }
        try {
            const content = await readFile(path);
            response.setHeader('content-type', 'text/javascript'); response.end(content);
        } catch { response.writeHead(404).end(); }
    });
    await new Promise((resolveListening) => server.listen(0, '127.0.0.1', () => resolveListening(undefined)));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Browser test server has no TCP address.');
    const chrome = spawn(process.env.CHROME_PATH ?? 'google-chrome', [
        '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
        '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`,
        `http://127.0.0.1:${address.port}/`,
    ], {stdio: 'ignore'});
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let timeout;
    try {
        const observed = /** @type {{compiled?: unknown; error?: string; browser: string}} */ (await Promise.race([
            result,
            new Promise((_, reject) => {
                timeout = setTimeout(() => reject(new Error('Browser verification timed out.')), 30000);
                chrome.once('error', reject);
                chrome.once('exit', (code) => reject(new Error(`Browser exited before results: ${code}`)));
            }),
        ]));
        assert.equal(observed.error, undefined, observed.error);
        assert.deepEqual(observed.compiled, expected);
        console.log(`Node/browser composed models and logical fingerprints match: ${observed.browser}`);
    } finally {
        clearTimeout(timeout);
        chrome.kill('SIGTERM');
        await new Promise((resolveClosed) => server.close(() => resolveClosed(undefined)));
        await new Promise((resolveExit) => {
            if (chrome.exitCode !== null || chrome.signalCode !== null) resolveExit(undefined);
            else chrome.once('exit', () => resolveExit(undefined));
        });
        await rm(profile, {recursive: true, force: true, maxRetries: 5, retryDelay: 100});
    }
});
