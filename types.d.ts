export interface DemAttributeExpression { readonly kind: 'attr'; readonly name: string; }
export interface DemCallExpression { readonly kind: 'call'; readonly operator: string; readonly args: readonly DemExpression[]; }
export type DemExpression = DemAttributeExpression | DemValueExpression | DemCallExpression;
export interface DemGeneration { readonly kind: string; readonly implementation?: string; readonly params?: Readonly<{mode?: 'byDefault' | 'always'}>; }
export interface DemLogicalType { readonly id: string; readonly params?: Readonly<Record<string, unknown>>; }
export interface DemValueExpression { readonly kind: 'value'; readonly value: unknown; readonly type?: DemLogicalType; }
export interface DemAttribute { type: DemLogicalType; nullable: boolean; comment?: string; storage?: Record<string, {type: string; params: Record<string, unknown>}>; default?: {kind: string; name?: string; value?: unknown}; generation?: DemGeneration; }
export interface DemContainer { entity: Record<string, DemEntity>; package: Record<string, DemContainer>; }
export interface DemDiagnostic { readonly code: string; readonly details: Readonly<Record<string, unknown>>; readonly message: string; readonly path: string; readonly severity: DemDiagnosticSeverity; readonly sources: readonly DemSource[]; readonly stage: DemDiagnosticStage; }
export type DemDiagnosticSeverity = 'error' | 'warning';
export type DemDiagnosticStage = 'parse' | 'decode' | 'composition' | 'logical' | 'graph' | 'dialect' | 'preflight' | 'plan' | 'query';
export interface DemEffectiveModel { readonly fingerprint: string; readonly model: DemModel; readonly provenance: DemProvenance; }
export interface DemEntity { attr: Record<string, DemAttribute>; relation: Record<string, DemRelation>; index: Record<string, DemIndex>; comment?: string; }
export interface DemGraph { readonly entities: readonly string[]; readonly topological: readonly string[]; readonly cycles: readonly DemGraphCycle[]; readonly edges: readonly DemGraphEdge[]; }
export interface DemGraphCycle { readonly entities: readonly string[]; readonly relations: readonly DemGraphEdge[]; }
export interface DemGraphEdge { readonly from: string; readonly to: string; readonly relation: string; readonly path: string; readonly deferrable?: string; readonly sources: readonly DemSource[]; }
export interface DemIndex { kind: string; keys: {attr?: string; expression?: DemExpression; operatorClass?: string; order?: string; nulls?: string}[]; method?: string; options: Record<string, number>; include: string[]; predicate?: DemExpression; phase: string; }
export interface DemModel extends DemContainer { version: 2; namespace: string; requires: string[]; deprecated: Record<string, string[]>; }
export type DemProvenance = Readonly<Record<string, readonly DemSource[]>>;
export interface DemRelation { attrs: string[]; ref: {path: string; attrs: string[]}; action: {delete?: string; update?: string}; deferrable: string; }
export interface DemSource { readonly fragmentId: string; readonly filename: string; readonly sourcePointer: string; readonly packageName?: string; readonly revision?: string; }

export interface DemCompilationResult { readonly effective: DemEffectiveModel; readonly fingerprint: string; readonly graph: DemGraph; readonly model: DemModel; readonly provenance: DemProvenance; readonly requirements: readonly string[]; readonly warnings: readonly DemDiagnostic[]; }

declare global {
    type TeqFw_Dem_Graph = DemGraph;
    type TeqFw_Dem_Compile_A_Compose = import("./src/Compile/A/Compose.mjs").default;
    type TeqFw_Dem_Compile_A_DecodeV2 = import("./src/Compile/A/DecodeV2.mjs").default;
    type TeqFw_Dem_Compile_A_Fingerprint = import("./src/Compile/A/Fingerprint.mjs").default;
    type TeqFw_Dem_Compile_A_Graph = import("./src/Compile/A/Graph.mjs").default;
    type TeqFw_Dem_Compile_A_MapRefs = import("./src/Compile/A/MapRefs.mjs").default;
    type TeqFw_Dem_Compile_A_Validate = import("./src/Compile/A/Validate.mjs").default;
    type TeqFw_Dem_Compile_A_ValidateNames = import("./src/Compile/A/ValidateNames.mjs").default;
    type TeqFw_Dem_Registry_Core = import("./src/Registry/Core.mjs").default;
    type TeqFw_Dem_Registry_CoreValue = import("./src/Registry/CoreValue.mjs").default;
    type TeqFw_Dem_Dto_Compile_Diagnostic = import("./src/Dto/Compile/Diagnostic.mjs").default;
    type TeqFw_Dem_Dto_Compile_Diagnostic__Factory = import("./src/Dto/Compile/Diagnostic.mjs").Factory;
    type TeqFw_Dem_Dto_Compile_Graph = import("./src/Dto/Compile/Graph.mjs").default;
    type TeqFw_Dem_Dto_Compile_Graph__Factory = import("./src/Dto/Compile/Graph.mjs").Factory;
    type TeqFw_Dem_Dto_Compile_Source = import("./src/Dto/Compile/Source.mjs").default;
    type TeqFw_Dem_Dto_Compile_Source__Factory = import("./src/Dto/Compile/Source.mjs").Factory;
    type TeqFw_Dem_ComposedDem = {diagnostics: DemDiagnostic[]; externalRefs: Record<string, {refs: Record<string, string[]>; pointers: TeqFw_Dem_StringMap; envelope: TeqFw_Dem_InputEnvelope}>; invalid: Set<string>; model: TeqFw_Dem_ComposedModel; ownerByPath: TeqFw_Dem_StringMap; provenance: Record<string, DemSource[]>};
    type TeqFw_Dem_ComposedModel = TeqFw_Dem_DecodedContainer & {version: number; namespace: string; requires: string[]; deprecated: Record<string, string[]>};
    type TeqFw_Dem_DecodedAttribute = {name: string; comment: string; type: DemLogicalType; storage: Record<string, {type: string; params: Record<string, unknown>}>; nullable: boolean; default?: {kind: string; value?: unknown; name?: string; params?: Record<string, unknown>}; generation?: {kind: string; params: Record<string, unknown>}; __demSpecial?: string};
    type TeqFw_Dem_DecodedContainer = {entity: Record<string, TeqFw_Dem_DecodedEntity>; package: Record<string, TeqFw_Dem_DecodedContainer>; comment?: string; version?: number; requires?: string[]; refs?: Record<string, string[]>};
    type TeqFw_Dem_DecodedEntity = {name: string; path: string; comment: string; attr: Record<string, TeqFw_Dem_DecodedAttribute>; index: Record<string, TeqFw_Dem_DecodedIndex>; relation: Record<string, TeqFw_Dem_DecodedRelation>};
    type TeqFw_Dem_DecodedExpression = {kind: string; name?: string; value?: unknown; type?: DemLogicalType; operator?: string; args?: TeqFw_Dem_DecodedExpression[]};
    type TeqFw_Dem_DecodedFragment = {declaration: TeqFw_Dem_DecodedContainer | null; diagnostics: DemDiagnostic[]; envelope: TeqFw_Dem_InputEnvelope; pointers: TeqFw_Dem_StringMap};
    type TeqFw_Dem_DecodedFragmentArray = ReadonlyArray<TeqFw_Dem_DecodedFragment>;
    type TeqFw_Dem_DecodedIndex = {name: string; kind: string; keys: TeqFw_Dem_DecodedIndexKey[]; include: string[]; options: Record<string, unknown>; phase: string; method?: string; predicate?: TeqFw_Dem_DecodedExpression};
    type TeqFw_Dem_DecodedIndexKey = {attr?: string; expression?: TeqFw_Dem_DecodedExpression; order?: unknown; nulls?: unknown; operatorClass?: unknown};
    type TeqFw_Dem_DecodedRelation = {name: string; attrs: string[]; ref: {path: string; attrs: string[]}; action: {delete?: string; update?: string}; deferrable: unknown};
    type TeqFw_Dem_DemEntityInfo = {entity: DemEntity; pointer: string; uniqueKeys: string[][]};
    type TeqFw_Dem_DemEntityMap = {[key: string]: TeqFw_Dem_DemEntityInfo};
    type TeqFw_Dem_DiagnosticArray = readonly DemDiagnostic[];
    type TeqFw_Dem_DiagnosticArrayMutable = DemDiagnostic[];
    type TeqFw_Dem_DiagnosticSeverity = DemDiagnosticSeverity;
    type TeqFw_Dem_DiagnosticStage = DemDiagnosticStage;
    type TeqFw_Dem_EffectiveModel = DemEffectiveModel;
    type TeqFw_Dem_Error = {name: string; message: string};
    type TeqFw_Dem_ExpressionKind = 'attr' | 'value' | 'call';
    type TeqFw_Dem_GraphCycleArray = readonly DemGraphCycle[];
    type TeqFw_Dem_GraphEdgeArray = readonly DemGraphEdge[];
    type TeqFw_Dem_GraphEdges = DemGraphEdge[];
    type TeqFw_Dem_InputEnvelope = {declaration: unknown; filename?: string; fragmentId?: string; packageName?: string; revision?: string; mapId?: string};
    type TeqFw_Dem_InputEnvelopeArray = ReadonlyArray<TeqFw_Dem_InputEnvelope>;
    type TeqFw_Dem_LogicalType = {id: string; params?: {[key: string]: unknown}};
    type TeqFw_Dem_LogicalTypeOptional = DemLogicalType | undefined;
    type TeqFw_Dem_Model = DemModel;
    type TeqFw_Dem_NameClaims = Record<string, {rawName: string; sourcePointer: string}>;
    type TeqFw_Dem_NormalizedCoreType =
        {id: 'core.binary'; params: {length?: number}} |
        {id: 'core.datetime'; params: {timezone: boolean; precision?: number}} |
        {id: 'core.decimal'; params: {precision: number; scale: number; unsigned: boolean}} |
        {id: 'core.enum'; params: {values: string[]}} |
        {id: 'core.integer'; params: {bits: 8 | 16 | 32 | 64; unsigned: boolean}} |
        {id: 'core.string'; params: {length: number}} |
        {id: 'core.vector'; params: {dimensions: number; element: 'bit' | 'float'; sparse: boolean}} |
        {id: 'core.any' | 'core.boolean' | 'core.date' | 'core.identity' | 'core.json' | 'core.ref' | 'core.text' | 'core.uuid'; params: Record<string, never>};
    type TeqFw_Dem_NormalizedCoreTypeNullable = TeqFw_Dem_NormalizedCoreType | null;
    type TeqFw_Dem_Object = {[key: string]: unknown};
    type TeqFw_Dem_QueryExpression = DemExpression;
    type TeqFw_Dem_QueryExpressionArrayOptional = readonly DemExpression[] | undefined;
    type TeqFw_Dem_Dto_Query_Expression = import("./src/Dto/Query/Expression.mjs").default;
    type TeqFw_Dem_SourceArray = readonly DemSource[];
    type TeqFw_Dem_StringArray = string[];
    type TeqFw_Dem_StringLists = string[][];
    type TeqFw_Dem_StringMap = {[key: string]: string};
    type TeqFw_Dem_StringOptional = string | undefined;
    type TeqFw_Dem_ValidatedDem = {entities: TeqFw_Dem_DemEntityMap; provenance: Record<string, DemSource[]>; model: DemModel; diagnostics: DemDiagnostic[]};
    type TeqFw_Dem_ValidatingEntityInfo = {entity: TeqFw_Dem_DecodedEntity; pointer: string; signatures: TeqFw_Dem_StringMap; uniqueKeys: string[][]};
    type TeqFw_Dem_Dto_Query_Expression__Factory = import("./src/Dto/Query/Expression.mjs").Factory;
    type TeqFw_Dem_Compile = import("./src/Compile.mjs").default;
    type TeqFw_Dem_CompilationResult = DemCompilationResult;
}
export {};
