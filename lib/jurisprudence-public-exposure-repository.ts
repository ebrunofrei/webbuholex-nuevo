import type { JurisprudencePublicExposure, JurisprudencePublicExposureEvent, JurisprudencePublicExposureIdempotencyEntry, JurisprudencePublicExposureView, JurisprudencePublicReadModel } from "@/types/jurisprudence-public-exposure";

export class JurisprudencePublicExposureError extends Error {
  constructor(readonly code: "VALIDATION_ERROR" | "NOT_FOUND" | "EXPOSURE_BLOCKED" | "ACTIVE_EXPOSURE_EXISTS" | "EXPOSURE_NOT_CURRENT" | "IDEMPOTENCY_CONFLICT" | "REVISION_CONFLICT" | "RESOURCE_CLOSED" | "REPOSITORY_UNAVAILABLE" | "INTERNAL_ERROR", message: string) { super(message); this.name = "JurisprudencePublicExposureError"; }
}
export function assertPublicExposureRepositoryOpen(closed: boolean): void { if (closed) throw new JurisprudencePublicExposureError("RESOURCE_CLOSED", "El repositorio de exposición está cerrado."); }
export function isActivePublicExposure(value: JurisprudencePublicExposure): boolean { return value.status === "exposed"; }
export function clonePublicReadModel(value: JurisprudencePublicReadModel): JurisprudencePublicReadModel { return structuredClone(value); }
export function clonePublicExposure(value: JurisprudencePublicExposure): JurisprudencePublicExposure { return structuredClone(value); }
export function clonePublicExposureEvent(value: JurisprudencePublicExposureEvent): JurisprudencePublicExposureEvent { return structuredClone(value); }
export function clonePublicExposureView(value: JurisprudencePublicExposureView): JurisprudencePublicExposureView { return structuredClone(value); }
export function clonePublicExposureIdempotency(value: JurisprudencePublicExposureIdempotencyEntry): JurisprudencePublicExposureIdempotencyEntry { return structuredClone(value); }
export const jurisprudencePublicExposureSqliteMigration001 = `
CREATE TABLE IF NOT EXISTS jurisprudence_public_read_models (public_record_id TEXT PRIMARY KEY, record_id TEXT NOT NULL, record_version INTEGER NOT NULL, status TEXT NOT NULL, payload_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS jurisprudence_public_exposures (exposure_id TEXT PRIMARY KEY, public_record_id TEXT UNIQUE NOT NULL, record_id TEXT NOT NULL, record_version INTEGER NOT NULL, status TEXT NOT NULL, revision INTEGER NOT NULL, payload_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS jurisprudence_public_exposure_events (event_id TEXT PRIMARY KEY, exposure_id TEXT NOT NULL, record_id TEXT NOT NULL, sequence INTEGER NOT NULL, payload_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS jurisprudence_public_exposure_idempotency (idempotency_key TEXT PRIMARY KEY, command_fingerprint TEXT NOT NULL, result_json TEXT NOT NULL);
`;
