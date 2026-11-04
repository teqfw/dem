// @ts-check
/** Test-only runtime implementation of example.Token16. */
export default Object.freeze({
    name:'example.Token16',
    normalize:(/** @type {unknown} */ value) => {
        if (!(value instanceof Uint8Array) || value.length !== 16) throw new TypeError('Expected 16 bytes.');
        return value.slice();
    },
    copy:(/** @type {Uint8Array} */ value) => value.slice(),
    equals:(/** @type {Uint8Array} */ left, /** @type {Uint8Array} */ right) => left.every((byte,index) => byte === right[index]),
    compare:(/** @type {Uint8Array} */ left, /** @type {Uint8Array} */ right) => {
        for (let index=0; index<16; index++) if (left[index] !== right[index]) return left[index] - right[index];
        return 0;
    },
});
