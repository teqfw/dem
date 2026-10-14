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
    try {
        const {default: Container} = await import('/node_modules/@teqfw/di/dist/esm.js');
        const {scenario} = await import('/test/browser/Scenario.mjs');
        const container = new Container();
        container.addNamespaceRoot('TeqFw_Dem_', location.origin + '/src', '.mjs');
        const compiler = await container.get('TeqFw_Dem_Compile$');
        const input = scenario();
        const compiled = await compiler.exec(input);
        const normalize = await container.get('TeqFw_Dem_Repository_Normalize$');
        const selection = await container.get('TeqFw_Dem_Dto_Query_Selection__Factory$');
        const entity = compiled.model.entities['/app/accounts/user'];
        const record = normalize.record({entity,record:{user_key:'ABCDEF12-3456-7890-ABCD-EF1234567890'},mode:'complete'});
        if (record.user_key !== 'abcdef12-3456-7890-abcd-ef1234567890') throw new Error('Browser record normalization failed');
        const query = selection.create({entity,selection:{limit:0}});
        if (query.limit !== 0 || query.orderBy[0].attribute !== 'user_key') throw new Error('Browser selection failed');
        const provider = await container.get('TeqFw_Dem_Api_RepositoryProvider$');
        try { await provider.get({path:'/app/accounts/user'}); throw new Error('Unselected provider succeeded'); }
        catch (error) { if (error.code !== 'UNSUPPORTED') throw error; }
        const repository = await container.get('TeqFw_Dem_Api_Repository$');
        try { await repository.read({key:{kind:'primary',values:{user_key:record.user_key}}}); throw new Error('Unselected repository succeeded'); }
        catch (error) { if (error.code !== 'UNSUPPORTED') throw error; }
        await fetch('/result', {method: 'POST', body: JSON.stringify({compiled, browser: navigator.userAgent})});
    } catch (error) { await fetch('/result', {method: 'POST', body: JSON.stringify({error: error.stack})}); }
    </script>`;
    /** @type {string[]} */
    const requests = [];
    const server = createServer(async (request, response) => {
        requests.push(`${request.method} ${request.url}`);
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
    ], {stdio: ['ignore', 'ignore', 'pipe']});
    let stderr = '';
    chrome.stderr.on('data', (chunk) => { stderr = (stderr + chunk.toString()).slice(-16000); });
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let timeout;
    try {
        const observed = /** @type {{compiled?: unknown; error?: string; browser: string}} */ (await Promise.race([
            result,
            new Promise((_, reject) => {
                timeout = setTimeout(() => reject(new Error(`Browser verification timed out. Requests: ${JSON.stringify(requests)}\nChrome stderr:\n${stderr}`)), 30000);
                chrome.once('error', reject);
                chrome.once('exit', (code, signal) => reject(new Error(`Browser exited before results: ${code ?? signal}\nChrome stderr:\n${stderr}`)));
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
            if (chrome.exitCode !== null || chrome.signalCode !== null || chrome.pid === undefined) resolveExit(undefined);
            else chrome.once('close', () => resolveExit(undefined));
        });
        await rm(profile, {recursive: true, force: true, maxRetries: 5, retryDelay: 100});
    }
});
