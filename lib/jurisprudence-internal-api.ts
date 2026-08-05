import { JurisprudenceApplicationService } from "@/lib/jurisprudence-application-service";
import type {
  CountInternalJurisprudenceRecordsQuery,
  CreateJurisprudenceRecordCommand,
  EvaluateJurisprudencePublicationQuery,
  GetInternalJurisprudenceRecordByIdentityQuery,
  GetInternalJurisprudenceRecordBySlugQuery,
  GetInternalJurisprudenceRecordQuery,
  GetJurisprudenceVersionHistoryQuery,
  GetPublicJurisprudenceDetailQuery,
  JurisprudenceApplicationContext,
  JurisprudenceInternalApi,
  ListInternalJurisprudenceRecordsQuery,
  SearchInternalJurisprudenceRecordsQuery,
  SearchPublicJurisprudenceQuery,
  UpdateJurisprudenceRecordCommand,
} from "@/types/jurisprudence-application";

export class DefaultJurisprudenceInternalApi implements JurisprudenceInternalApi {
  readonly #service: JurisprudenceApplicationService;

  constructor(service: JurisprudenceApplicationService) {
    this.#service = service;
  }

  createRecord(command: CreateJurisprudenceRecordCommand) { return this.#service.createRecord(command); }
  updateRecord(command: UpdateJurisprudenceRecordCommand) { return this.#service.updateRecord(command); }
  getInternalRecord(query: GetInternalJurisprudenceRecordQuery) { return this.#service.getInternalRecord(query); }
  getInternalRecordBySlug(query: GetInternalJurisprudenceRecordBySlugQuery) { return this.#service.getInternalRecordBySlug(query); }
  getInternalRecordByIdentity(query: GetInternalJurisprudenceRecordByIdentityQuery) { return this.#service.getInternalRecordByIdentity(query); }
  getVersionHistory(query: GetJurisprudenceVersionHistoryQuery) { return this.#service.getVersionHistory(query); }
  evaluatePublication(query: EvaluateJurisprudencePublicationQuery) { return this.#service.evaluatePublication(query); }
  listInternalRecords(query: ListInternalJurisprudenceRecordsQuery) { return this.#service.listInternalRecords(query); }
  searchInternalRecords(query: SearchInternalJurisprudenceRecordsQuery) { return this.#service.searchInternalRecords(query); }
  countInternalRecords(query: CountInternalJurisprudenceRecordsQuery) { return this.#service.countInternalRecords(query); }
  searchPublicRecords(query: SearchPublicJurisprudenceQuery) { return this.#service.searchPublicRecords(query); }
  getPublicDetail(query: GetPublicJurisprudenceDetailQuery) { return this.#service.getPublicDetail(query); }
  close(context: JurisprudenceApplicationContext) { return this.#service.close(context); }
}
