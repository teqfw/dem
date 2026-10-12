// @ts-nocheck
import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {container} from '../TestEnv.mjs';

/** @type {TeqFw_Dem_Compile} */
const compiler = await container.get('TeqFw_Dem_Compile$');

function fragment(fragmentId, declaration, filename = `/fixtures/${fragmentId}/etc/teqfw.schema.json`) {
    return {declaration, filename, fragmentId, packageName: fragmentId};
}

function mapEnvelope(declaration = {version: 2, namespace: 'teq'}) {
    return {
        declaration,
        filename: '/fixtures/app/etc/teqfw.schema.map.json',
        mapId: 'app-map',
        packageName: 'app',
    };
}

function primary(attr = 'id') {
    return {
        kind: 'primary',
        keys: [{attr}],
        include: [],
        options: {},
        phase: 'table',
    };
}

describe('TeqFw_Dem_Compile', () => {
    it('rejects unversioned declarations and maps', async () => {
        await assert.rejects(
            compiler.exec({
                
                fragments: [fragment('app', {entity: {}, package: {}, refs: {}, requires: []})],
                mapEnvelope: mapEnvelope({namespace: 'teq'}),
            }),
            (error) => {
                const versions = error.diagnostics.filter((item) => item.code === 'DEM_DECLARATION_VERSION_UNSUPPORTED');
                assert.deepEqual(versions.map((item) => item.details.input ?? 'declaration').sort(), ['declaration', 'map']);
                return true;
            },
        );
    });

    it('rejects invalid fragment root namespace identifiers', async () => {
        await assert.rejects(
            compiler.exec({
                
                fragments: [fragment('invalid-root', {
                    version: 2,
                    namespace: 'teqfw.db_schema',
                    requires: [],
                    refs: {},
                    entity: {},
                    package: {},
                })],
                mapEnvelope: mapEnvelope({version: 2}),
            }),
            (error) => {
                assert.ok(error.diagnostics.some((item) => item.code === 'DEM_DECLARATION_IDENTIFIER_INVALID' && item.path === '/namespace'));
                return true;
            },
        );
    });

    it('aggregates ownership and independent logical failures with no conflict winner', async () => {
        const conflictA = fragment('a', {
            version: 2, requires: [], package: {}, refs: {},
            entity: {shared: {attr: {id: {type: {id: 'core.integer', params: {}}}}, index: {pk: primary()}, relation: {}}},
        });
        const conflictB = fragment('b', {
            version: 2, requires: [], package: {}, refs: {},
            entity: {shared: {attr: {id: {type: {id: 'core.integer', params: {}}}}, index: {pk: primary()}, relation: {}}},
        });
        const invalid = fragment('c', {
            version: 2, requires: [], package: {}, refs: {},
            entity: {invalid: {attr: {value: {type: {id: 'vendor.unknown', params: {}}}}, index: {}, relation: {}}},
        });

        await assert.rejects(
            compiler.exec({ fragments: [invalid, conflictB, conflictA], mapEnvelope: mapEnvelope()}),
            (error) => {
                assert.equal(error.name, 'DemCompilationError');
                assert.equal('model' in error, false);
                assert.equal('physical' in error, false);
                const codes = error.diagnostics.map((item) => item.code);
                assert.ok(codes.includes('DEM_COMPOSITION_OWNER_CONFLICT'));
                assert.ok(codes.includes('DEM_TYPE_UNKNOWN'));
                const entityConflict = error.diagnostics.find((item) => item.path === '/entity/shared');
                assert.deepEqual(entityConflict.sources.map((item) => item.fragmentId), ['a', 'b']);
                return true;
            },
        );
    });

    it('resolves external references by relation owner and retains map provenance', async () => {
        const identity = fragment('identity', {
            version: 2, requires: [], package: {}, refs: {},
            entity: {user: {attr: {id: {type: {id: 'core.integer', params: {}}}}, index: {pk: primary()}, relation: {}}},
        });
        const content = fragment('content', {
            version: 2,
            requires: [],
            entity: {
                post: {
                    attr: {owner_id: {type: {id: 'core.integer', params: {}}}},
                    index: {},
                    relation: {
                        owner: {
                            attrs: ['owner_id'],
                            ref: {path: '/external/user', attrs: ['external_id']},
                            action: {delete: 'restrict', update: 'cascade'},
                            deferrable: 'notDeferrable',
                        },
                    },
                },
            },
            package: {},
            refs: {'/external/user': ['external_id']},
        });
        const map = mapEnvelope({
            version: 2,
            namespace: 'teq',
            ref: {content: {'/external/user': {path: '/user', attrs: {external_id: 'id'}}}},
            deprecated: {},
        });
        const result = await compiler.exec({ fragments: [content, identity], mapEnvelope: map});
        const relation = result.model.entity.post.relation.owner;

        assert.equal(relation.ref.path, '/user');
        assert.deepEqual(relation.ref.attrs, ['id']);
        assert.deepEqual(
            result.provenance['/entity/post/relation/owner'].map((item) => item.fragmentId),
            ['app-map', 'content'],
        );
    });

    it('rejects unsupported versions and closed-shape violations with structured diagnostics', async () => {
        await assert.rejects(
            compiler.exec({
                
                fragments: [fragment('app', {version: 3, entity: {}, package: {}, refs: {}, requires: [], typo: true})],
                mapEnvelope: mapEnvelope(),
            }),
            (error) => {
                assert.deepEqual([...new Set(error.diagnostics.map((item) => item.code))], [
                    'DEM_DECLARATION_SHAPE_INVALID',
                    'DEM_DECLARATION_VERSION_UNSUPPORTED',
                ]);
                assert.equal(error.diagnostics[0].path, '/typo');
                assert.equal(error.diagnostics[1].path, '/version');
                return true;
            },
        );
    });

    it('rejects obsolete role declarations, invalid profiles, and ambiguous core.ref derivations deterministically', async () => {
        const declaration = {
            version: 2, requires: [], package: {}, refs: {},
            entity: {
                user: {attr: {id: {role: 'identity', type: {id: 'core.integer', params: {}}}}, index: {}, relation: {}},
                post: {
                    attr: {owner_id: {type: {id: 'core.ref'}}}, index: {},
                    relation: {
                        first: {action: {}, attrs: ['owner_id'], deferrable: 'notDeferrable', ref: {attrs: ['id'], path: '/user'}},
                        second: {action: {}, attrs: ['owner_id'], deferrable: 'notDeferrable', ref: {attrs: ['id'], path: '/user'}},
                    },
                },
            },
        };
        await assert.rejects(
            compiler.exec({
                 fragments: [fragment('app', declaration)],
                mapEnvelope: mapEnvelope({version: 2, namespace: 'teq', identityProfile: {type: {id: 'core.integer', params: {}}}}),
            }),
            (error) => {
                const diagnostics = new Map(error.diagnostics.map((item) => [`${item.code}:${item.path}`, item]));
                assert.ok(diagnostics.has('DEM_DECLARATION_SHAPE_INVALID:/entity/user/attr/id/role'));
                assert.ok(diagnostics.has('DEM_DECLARATION_SHAPE_INVALID:/identityProfile'));
                assert.ok(diagnostics.has('DEM_RELATION_CARDINALITY:/entity/post/attr/owner_id'));
                return true;
            },
        );
    });
});
