export type DemBatchOperation = TeqFw_Dem_BatchOperation;
export type DemBatchResult = TeqFw_Dem_BatchResult;
export type DemRepositoryBatch = TeqFw_Dem_Api_RepositoryBatch;
export type DemOrder = TeqFw_Dem_Order;
export type DemRecordResult = TeqFw_Dem_RecordResult;
export type DemRecordResultNullable = TeqFw_Dem_RecordResultNullable;
export type DemDeleteResult = TeqFw_Dem_DeleteResult;
export type DemListResult = TeqFw_Dem_ListResult;
export type DemRepositoryErrorCode = TeqFw_Dem_RepositoryErrorCode;
export type DemRecord = TeqFw_Dem_Record;
export type DemKey = TeqFw_Dem_Key;
export type DemSelection = TeqFw_Dem_Selection;
export type DemRepository = TeqFw_Dem_Api_Repository;
export type DemRepositoryProvider = TeqFw_Dem_Api_RepositoryProvider;
export type DemRepositoryError = TeqFw_Dem_RepositoryError;
export interface DemAttribute extends TeqFw_Dem_Attribute {}
export interface DemCanonical extends TeqFw_Dem_Canonical {}
export interface DemCanonicalAttribute extends TeqFw_Dem_CanonicalAttribute {}
export interface DemCanonicalEntity extends TeqFw_Dem_CanonicalEntity {}
export interface DemCompilationResult extends TeqFw_Dem_CompilationResult {}
export interface DemDiagnostic extends TeqFw_Dem_Diagnostic {}
export interface DemEntity extends TeqFw_Dem_Entity {}
export interface DemEntityWork extends TeqFw_Dem_EntityWork {}
export interface DemEnvelope extends TeqFw_Dem_Envelope {}
export interface DemGraph extends TeqFw_Dem_Graph {}
export interface DemModel extends TeqFw_Dem_Model {}
export interface DemProfile extends TeqFw_Dem_Profile {}
export interface DemProvenance extends TeqFw_Dem_Provenance {}
export interface DemQueryExpression extends TeqFw_Dem_QueryExpression {}
export interface DemRelation extends TeqFw_Dem_Relation {}
export interface DemSchemaWork extends TeqFw_Dem_SchemaWork {}
export interface DemSource extends TeqFw_Dem_Source {}
export interface DemType extends TeqFw_Dem_Type {}
export interface DemWorkingState extends TeqFw_Dem_WorkingState {}

declare global {
    type TeqFw_Dem_Acquire = import("./src/Acquire.mjs").default;
    type TeqFw_Dem_Acquire__Class = typeof import("./src/Acquire.mjs").default;
    type TeqFw_Dem_AcquisitionResult = {schemas:TeqFw_Dem_Envelope[];map?:TeqFw_Dem_Envelope};
    type TeqFw_Dem_Api_Repository = import("./src/Api/Repository.mjs").default;
    type TeqFw_Dem_Api_RepositoryBatch = import("./src/Api/RepositoryBatch.mjs").default;
    type TeqFw_Dem_Api_RepositoryBatch__Class = typeof import("./src/Api/RepositoryBatch.mjs").default;
    type TeqFw_Dem_Api_RepositoryProvider = import("./src/Api/RepositoryProvider.mjs").default;
    type TeqFw_Dem_Api_RepositoryProvider__Class = typeof import("./src/Api/RepositoryProvider.mjs").default;
    type TeqFw_Dem_Api_Repository__Class = typeof import("./src/Api/Repository.mjs").default;
    type TeqFw_Dem_Attribute = {name: string; type: TeqFw_Dem_Type; nullable: boolean; generation: boolean; default?: unknown};
    type TeqFw_Dem_BatchOperation = {path:string;method:'create';params:{record:TeqFw_Dem_Record}}|{path:string;method:'read';params:{key:TeqFw_Dem_Key}}|{path:string;method:'delete';params:{key:TeqFw_Dem_Key}}|{path:string;method:'update';params:{key:TeqFw_Dem_Key;changes:TeqFw_Dem_Record}}|{path:string;method:'list';params:{selection:unknown}};
    type TeqFw_Dem_BatchResult = {results:Array<TeqFw_Dem_RecordResultNullable|TeqFw_Dem_DeleteResult|TeqFw_Dem_ListResult>};
    type TeqFw_Dem_Canonical = {domain:string;entities:Record<string,TeqFw_Dem_CanonicalEntity>};
    type TeqFw_Dem_CanonicalAttribute = {type:TeqFw_Dem_Type;nullable:boolean;generation:boolean;default?:unknown};
    type TeqFw_Dem_CanonicalEntity = {attributes:Record<string,TeqFw_Dem_CanonicalAttribute>;primaryKey:string[]|null;uniqueKeys:Record<string,string[]>;indexes:Record<string,{attributes:string[]}>;relations:Record<string,TeqFw_Dem_Relation>};
    type TeqFw_Dem_CompilationError = {name:string;message:string;diagnostics:TeqFw_Dem_Diagnostic[];warnings:TeqFw_Dem_Diagnostic[]};
    type TeqFw_Dem_CompilationResult = {model:TeqFw_Dem_Model;canonical:TeqFw_Dem_Canonical;fingerprint:string;provenance:TeqFw_Dem_Provenance;graph:TeqFw_Dem_Graph;warnings:TeqFw_Dem_Diagnostic[]};
    type TeqFw_Dem_Compile = import("./src/Compile.mjs").default;
    type TeqFw_Dem_Compile_A_Canonical = import("./src/Compile/A/Canonical.mjs").default;
    type TeqFw_Dem_Compile_A_Canonical__Class = typeof import("./src/Compile/A/Canonical.mjs").default;
    type TeqFw_Dem_Compile_A_Compose = import("./src/Compile/A/Compose.mjs").default;
    type TeqFw_Dem_Compile_A_Compose__Class = typeof import("./src/Compile/A/Compose.mjs").default;
    type TeqFw_Dem_Compile_A_Decode = import("./src/Compile/A/Decode.mjs").default;
    type TeqFw_Dem_Compile_A_Decode__Class = typeof import("./src/Compile/A/Decode.mjs").default;
    type TeqFw_Dem_Compile_A_Fingerprint = import("./src/Compile/A/Fingerprint.mjs").default;
    type TeqFw_Dem_Compile_A_Fingerprint__Class = typeof import("./src/Compile/A/Fingerprint.mjs").default;
    type TeqFw_Dem_Compile_A_Graph = import("./src/Compile/A/Graph.mjs").default;
    type TeqFw_Dem_Compile_A_Graph__Class = typeof import("./src/Compile/A/Graph.mjs").default;
    type TeqFw_Dem_Compile_A_Path = import("./src/Compile/A/Path.mjs").default;
    type TeqFw_Dem_Compile_A_Path__Class = typeof import("./src/Compile/A/Path.mjs").default;
    type TeqFw_Dem_Compile_A_Resolve = import("./src/Compile/A/Resolve.mjs").default;
    type TeqFw_Dem_Compile_A_Resolve__Class = typeof import("./src/Compile/A/Resolve.mjs").default;
    type TeqFw_Dem_Compile_A_Validate = import("./src/Compile/A/Validate.mjs").default;
    type TeqFw_Dem_Compile_A_Validate__Class = typeof import("./src/Compile/A/Validate.mjs").default;
    type TeqFw_Dem_Compile__Class = typeof import("./src/Compile.mjs").default;
    type TeqFw_Dem_DeleteResult = {deleted:boolean};
    type TeqFw_Dem_Diagnostic = {code: string; severity: "error"|"warning"; source: TeqFw_Dem_Source|null; pointer: string; details: Record<string, any>};
    type TeqFw_Dem_Dto_Compile_Diagnostic = import("./src/Dto/Compile/Diagnostic.mjs").default;
    type TeqFw_Dem_Dto_Compile_Diagnostic__Class = typeof import("./src/Dto/Compile/Diagnostic.mjs").default;
    type TeqFw_Dem_Dto_Query_Expression = import("./src/Dto/Query/Expression.mjs").default;
    type TeqFw_Dem_Dto_Query_Expression__Class = typeof import("./src/Dto/Query/Expression.mjs").default;
    type TeqFw_Dem_Dto_Query_Expression__Factory = import("./src/Dto/Query/Expression.mjs").Factory;
    type TeqFw_Dem_Dto_Query_Expression__Factory__Class = typeof import("./src/Dto/Query/Expression.mjs").Factory;
    type TeqFw_Dem_Dto_Query_Selection = import("./src/Dto/Query/Selection.mjs").default;
    type TeqFw_Dem_Dto_Query_Selection__Class = typeof import("./src/Dto/Query/Selection.mjs").default;
    type TeqFw_Dem_Dto_Query_Selection__Factory = import("./src/Dto/Query/Selection.mjs").Factory;
    type TeqFw_Dem_Dto_Query_Selection__Factory__Class = typeof import("./src/Dto/Query/Selection.mjs").Factory;
    type TeqFw_Dem_Entity = {attributes: TeqFw_Dem_Attribute[]; primaryKey: string[]|null; uniqueKeys: Record<string,string[]>; indexes: Record<string,{attributes:string[]}>; relations: Record<string,TeqFw_Dem_Relation>};
    type TeqFw_Dem_EntityWork = {schema:TeqFw_Dem_SchemaWork;original:string;pointer:string;raw:any;relations:Record<string,TeqFw_Dem_Relation>};
    type TeqFw_Dem_Envelope = {packageName:string;filename:string;document:unknown};
    type TeqFw_Dem_ExpressionKind = "attr"|"value"|"call";
    type TeqFw_Dem_Graph = {edges: {from:string;to:string}[];components:string[][]};
    type TeqFw_Dem_Key = {kind:'primary';values:TeqFw_Dem_Record}|{kind:'unique';name:string;values:TeqFw_Dem_Record};
    type TeqFw_Dem_ListResult = {records:TeqFw_Dem_Record[]};
    type TeqFw_Dem_LogicalTypeNullable = TeqFw_Dem_Type|null;
    type TeqFw_Dem_LogicalTypeOptional = TeqFw_Dem_Type|undefined;
    type TeqFw_Dem_Model = {packages: string[]; entities: Record<string,TeqFw_Dem_Entity>};
    type TeqFw_Dem_Never = never;
    type TeqFw_Dem_Object = Record<string,unknown>;
    type TeqFw_Dem_Order = {attribute:string;direction:'asc'|'desc';nulls:'first'|'last'};
    type TeqFw_Dem_Profile = {type: "uuid"|"int"; capacity?: "small"|"regular"|"large"};
    type TeqFw_Dem_Provenance = {entities: Record<string,TeqFw_Dem_Source & {originalPath:string}>;map:TeqFw_Dem_Source|null;pathMappings:{packageName:string;originalPath:string;effectivePath:string}[];bindings:{packageName:string;dependency:string;path:string;attributes:Record<string,string>}[]};
    type TeqFw_Dem_QueryExpression = {kind:"attr"|"value"|"call";name?:string;value?:unknown;type?:TeqFw_Dem_Type;operator?:string;args?:TeqFw_Dem_QueryExpression[]};
    type TeqFw_Dem_QueryExpressionArrayOptional = TeqFw_Dem_QueryExpression[]|undefined;
    type TeqFw_Dem_Record = Record<string,unknown>;
    type TeqFw_Dem_RecordMode = 'create'|'update'|'complete';
    type TeqFw_Dem_RecordResult = {record:TeqFw_Dem_Record};
    type TeqFw_Dem_RecordResultNullable = {record:TeqFw_Dem_Record|null};
    type TeqFw_Dem_Registry_Core = import("./src/Registry/Core.mjs").default;
    type TeqFw_Dem_Registry_CoreValue = import("./src/Registry/CoreValue.mjs").default;
    type TeqFw_Dem_Registry_CoreValue__Class = typeof import("./src/Registry/CoreValue.mjs").default;
    type TeqFw_Dem_Registry_Core__Class = typeof import("./src/Registry/Core.mjs").default;
    type TeqFw_Dem_Relation = {attributes: string[]; target: {path: string; attributes: string[]}};
    type TeqFw_Dem_RepositoryError = Error & {name:string;code:TeqFw_Dem_RepositoryErrorCode};
    type TeqFw_Dem_RepositoryErrorCode = 'INVALID_INPUT'|'UNSUPPORTED'|'NOT_FOUND'|'CONFLICT'|'RELATION'|'STORAGE';
    type TeqFw_Dem_Repository_Batch = import("./src/Repository/Batch.mjs").default;
    type TeqFw_Dem_Repository_Batch__Class = typeof import("./src/Repository/Batch.mjs").default;
    type TeqFw_Dem_Repository_Error = import("./src/Repository/Error.mjs").default;
    type TeqFw_Dem_Repository_Error__Class = typeof import("./src/Repository/Error.mjs").default;
    type TeqFw_Dem_Repository_Normalize = import("./src/Repository/Normalize.mjs").default;
    type TeqFw_Dem_Repository_Normalize__Class = typeof import("./src/Repository/Normalize.mjs").default;
    type TeqFw_Dem_Repository_Select = import("./src/Repository/Select.mjs").default;
    type TeqFw_Dem_Repository_Select__Class = typeof import("./src/Repository/Select.mjs").default;
    type TeqFw_Dem_SchemaWork = {source:TeqFw_Dem_Source;dependencies:Record<string,any>;nodes:Record<string,{raw:any;pointer:string}>;packages:string[];correspondence:Record<string,string>;bindings:Record<string,any>};
    type TeqFw_Dem_Selection = {where?:TeqFw_Dem_QueryExpression;orderBy:TeqFw_Dem_Order[];limit:number|null;offset:number};
    type TeqFw_Dem_Source = {packageName: string; filename: string};
    type TeqFw_Dem_SourceNullable = TeqFw_Dem_Source|null;
    type TeqFw_Dem_StringOptional = string|undefined;
    type TeqFw_Dem_Type = {name: string; params?: Record<string, any>; profile?: TeqFw_Dem_Profile};
    type TeqFw_Dem_Util_Data = import("./src/Util/Data.mjs").default;
    type TeqFw_Dem_Util_Data__Class = typeof import("./src/Util/Data.mjs").default;
    type TeqFw_Dem_Work = TeqFw_Dem_WorkingState;
    type TeqFw_Dem_WorkingState = {schemas:TeqFw_Dem_SchemaWork[];map:{sources:Record<string,any>;identityProfiles:Record<string,any>};mapSource:TeqFw_Dem_Source|null;diagnostics:TeqFw_Dem_Diagnostic[];entities:Record<string,TeqFw_Dem_EntityWork>;packages:string[];provenance:TeqFw_Dem_Provenance};
}
export {};
