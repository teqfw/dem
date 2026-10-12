// @ts-check
/** Shared trusted inputs for independently executed Node and browser scenarios. */
export function scenario() {
    return {
        fragments: [
            {fragmentId: 'identity', packageName: 'identity', filename: '/identity.json', declaration: {
                version: 2, namespace: 'domain', requires: ['provider.hint'],
                entity: {user: {attr: {id: {type: {id: 'core.identity'}}, name: {type: {id: 'core.string', params: {length: 64}}}}, index: {}, relation: {}}},
            }},
            {fragmentId: 'content', packageName: 'content', filename: '/content.json', declaration: {
                version: 2, refs: {'/external/user': ['key']}, entity: {post: {
                    attr: {id: {type: {id: 'core.identity'}}, owner: {type: {id: 'core.ref'}}},
                    relation: {owner: {attrs: ['owner'], ref: {path: '/external/user', attrs: ['key']}}},
                }},
            }},
        ],
        mapEnvelope: {mapId: 'app', packageName: 'app', filename: '/map.json', declaration: {
            version: 2, namespace: 'sqlhint',
            ref: {content: {'/external/user': {path: '/domain/user', attrs: {key: 'id'}}}},
        }},
    };
}
