// @ts-check
import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
/** @param {string} directory @returns {string[]} */
function markdownFiles(directory) {
    return readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
        const path = join(directory, entry.name);
        return entry.isDirectory() ? markdownFiles(path) : entry.name.endsWith('.md') ? [path] : [];
    });
}
const files = ['README.md', 'CHANGELOG.md', 'AGENTS.md', ...['src', 'skills', 'docs'].flatMap(markdownFiles)].map((path) => resolve(root, path));
for (const path of files) {
    const body = readFileSync(path, 'utf8');
    for (const match of body.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
        const target = match[1].split('#')[0];
        if (!target || /^[a-z][a-z\d+.-]*:/i.test(target)) continue;
        assert.ok(existsSync(resolve(dirname(path), target)), `Broken document link in ${path}: ${target}`);
        if (path.includes('/skills/')) {
            assert.ok(resolve(dirname(path), target).startsWith(join(root, 'skills/teqfw-dem/')), `Skill reference leaves its published boundary: ${target}`);
        }
    }
}
console.log(`Verified local links in ${files.length} public Markdown documents.`);
