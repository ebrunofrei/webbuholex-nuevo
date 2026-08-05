import { randomUUID } from "node:crypto";
import { createInMemoryJurisprudenceInternalApi, createSqliteJurisprudenceInternalApi } from "@/lib/jurisprudence-application-factory";
import { JurisprudenceHttpController } from "@/lib/jurisprudence-http-controller";
import type { JurisprudenceInternalApi } from "@/types/jurisprudence-application";
import type {
  JurisprudenceHttpLogger,
  JurisprudenceRouteHandlers,
} from "@/types/jurisprudence-http";

export interface JurisprudenceRouteHandlerFactoryInput {
  api: JurisprudenceInternalApi;
  now?: () => string;
  requestIdGenerator?: () => string;
  actorId?: string;
  logger?: JurisprudenceHttpLogger;
  maxBodyBytes?: number;
  maxQueryLength?: number;
}

export interface JurisprudenceSqliteRouteHandlerFactoryInput extends Omit<JurisprudenceRouteHandlerFactoryInput, "api"> {
  databasePath: string;
}

const defaultNow = () => new Date().toISOString();

export function createJurisprudenceRouteHandlers(input: JurisprudenceRouteHandlerFactoryInput): JurisprudenceRouteHandlers {
  const controller = new JurisprudenceHttpController({
    api: input.api,
    now: input.now ?? defaultNow,
    requestIdGenerator: input.requestIdGenerator ?? randomUUID,
    actorId: input.actorId ?? "jurisprudence-http-system",
    ...(input.logger === undefined ? {} : { logger: input.logger }),
    ...(input.maxBodyBytes === undefined ? {} : { maxBodyBytes: input.maxBodyBytes }),
    ...(input.maxQueryLength === undefined ? {} : { maxQueryLength: input.maxQueryLength }),
  });
  return Object.freeze({
    public: Object.freeze({
      search: (request: Request) => controller.handleSearchPublicJurisprudence(request),
      detail: (request: Request, params: { slug: string }) => controller.handleGetPublicJurisprudenceDetail(request, params.slug),
    }),
    internal: Object.freeze({
      create: (request: Request) => controller.handleCreateJurisprudenceRecord(request),
      update: (request: Request, params: { id: string }) => controller.handleUpdateJurisprudenceRecord(request, params.id),
      getInternal: (request: Request, params: { id: string }) => controller.handleGetInternalJurisprudenceRecord(request, params.id),
      listInternal: (request: Request) => controller.handleListInternalJurisprudence(request),
      history: (request: Request, params: { id: string }) => controller.handleGetJurisprudenceHistory(request, params.id),
      evaluatePublication: (request: Request, params: { id: string }) => controller.handleEvaluateJurisprudencePublication(request, params.id),
    }),
    close: () => controller.close(),
  });
}

export function createInMemoryJurisprudenceRouteHandlers(
  options: Omit<JurisprudenceRouteHandlerFactoryInput, "api"> = {},
): JurisprudenceRouteHandlers {
  return createJurisprudenceRouteHandlers({ api: createInMemoryJurisprudenceInternalApi(), ...options });
}

export function createSqliteJurisprudenceRouteHandlers(
  input: JurisprudenceSqliteRouteHandlerFactoryInput,
): JurisprudenceRouteHandlers {
  const { databasePath, ...options } = input;
  return createJurisprudenceRouteHandlers({
    api: createSqliteJurisprudenceInternalApi({ databasePath, ...(input.now === undefined ? {} : { now: input.now }) }),
    ...options,
  });
}
