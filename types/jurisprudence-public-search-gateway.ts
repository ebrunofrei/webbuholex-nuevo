export type JurisprudencePublicSearchSort="relevance"|"issued_desc"|"issued_asc"|"title_asc";
export interface JurisprudencePublicSearchFilters{readonly institutionName?:string;readonly issuingBody?:string;readonly matter?:string;readonly resolutionType?:string;readonly caseNumber?:string;readonly resolutionNumber?:string;readonly issuedFrom?:string;readonly issuedTo?:string}
export interface JurisprudencePublicSearchQuery{readonly text?:string;readonly filters:JurisprudencePublicSearchFilters;readonly sort:JurisprudencePublicSearchSort;readonly page:number;readonly pageSize:number}
export interface JurisprudencePublicSearchItem{readonly slug:string;readonly title:string;readonly caseTitle:string;readonly caseNumber:string;readonly resolutionNumber:string;readonly resolutionType:string;readonly institutionName:string;readonly issuingBody:string;readonly matter:string;readonly issuedAt:string;readonly summary:string;readonly sourceName:string;}
export interface JurisprudencePublicSearchPage{readonly items:readonly JurisprudencePublicSearchItem[];readonly total:number;readonly page:number;readonly pageSize:number;readonly totalPages:number}
export type JurisprudencePublicSearchResponse=|{readonly status:"success";readonly page:JurisprudencePublicSearchPage}|{readonly status:"empty";readonly page:JurisprudencePublicSearchPage}|{readonly status:"not_configured";readonly message:string}|{readonly status:"invalid_query";readonly message:string}|{readonly status:"error";readonly message:string};
import type { JurisprudencePublicDetailDto } from "./jurisprudence";

export type JurisprudencePublicDetailResponse=
  |{readonly status:"success";readonly item:JurisprudencePublicDetailDto}
  |{readonly status:"not_found"}
  |{readonly status:"not_configured"}
  |{readonly status:"error"};

export interface JurisprudencePublicSearchGateway{
  readonly kind:"not_configured"|"test_fixture"|"configured"|"local_verified_catalog";
  search(query:JurisprudencePublicSearchQuery):Promise<JurisprudencePublicSearchResponse>;
  getBySlug(slug:string):Promise<JurisprudencePublicDetailResponse>;
}
export interface JurisprudencePublicSearchExperienceReadiness{readonly publicSearchUiImplemented:true;readonly publicGatewayContractReady:true;readonly unconfiguredGatewayReady:true;readonly realSearchIndexPresent:false;readonly realPublicSearchGatewayConfigured:false;readonly publicSearchConnected:false;readonly searchEndpointMounted:false;readonly searchUiConnectedToRealData:false;readonly externalIndexingEnabled:false;readonly realJurisprudenceDataPresent:false;readonly authenticationReal:false;readonly published:false;readonly deployed:false}
export interface JurisprudencePublicSearchActivationReadiness{readonly adapterCodeImplemented:boolean;readonly activationAuthorized:boolean;readonly realPublicExposurePresent:boolean;readonly realSearchIndexPresent:boolean;readonly realPublicSearchGatewayConfigured:boolean;readonly publicSearchConnectedToRealData:boolean;readonly searchEndpointMounted:boolean;readonly published:boolean;readonly deployed:boolean}
