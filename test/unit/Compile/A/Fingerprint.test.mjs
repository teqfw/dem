// @ts-check
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHash, webcrypto} from 'node:crypto';
import Fingerprint from '../../../../src/Compile/A/Fingerprint.mjs';

test('portable SHA-256 matches Node and Web Crypto across UTF-8 and block boundaries', async () => {
    const fingerprint = new Fingerprint();
    for (const value of ['', 'abc', 'Привет 🌍', '\ud800', ...Array.from({length: 260}, (_, n) => 'a'.repeat(n))]) {
        const json = JSON.stringify(value);
        const native = createHash('sha256').update(json).digest('hex');
        const web = Buffer.from(await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(json))).toString('hex');
        assert.equal(fingerprint.exec({value}), `sha256-v1:${native}`);
        assert.equal(web, native);
    }
});

test('canonicalization preserves arrays and special own keys', () => {
    const fingerprint = new Fingerprint();
    const special = JSON.parse('{"__proto__":{"marker":true}}');
    assert.equal(fingerprint.exec({value: special}), `sha256-v1:${createHash('sha256').update(JSON.stringify(special)).digest('hex')}`);
    assert.notEqual(fingerprint.exec({value: special}), fingerprint.exec({value: {}}));
    assert.notEqual(fingerprint.exec({value: [1,2]}), fingerprint.exec({value: [2,1]}));
    assert.equal(fingerprint.exec({value: {b: 2, a: 1}}), fingerprint.exec({value: {a: 1, b: 2}}));
    assert.equal(Reflect.get({}, 'marker'), undefined);
});
