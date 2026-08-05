import { randomUUID } from "node:crypto";
import { AnonymousJurisprudenceAuthenticator } from "@/lib/jurisprudence-authentication-port";
import { JurisprudenceSecurityGuard } from "@/lib/jurisprudence-security-guard";
import type { JurisprudenceRouteHandlers } from "@/types/jurisprudence-http";
import type {
  JurisprudenceAuthenticator,
  JurisprudenceAuthorizationPolicy,
  JurisprudenceSecurityLogger,
  SecuredJurisprudenceRouteHandlers,
  SecuredPublicOnlyJurisprudenceRouteHandlers,
} from "@/types/jurisprudence-security";

export interface JurisprudenceSecuredHandlerFactoryInput {
  handlers: JurisprudenceRouteHandlers;
  authenticator: JurisprudenceAuthenticator;
  authorizationPolicy: JurisprudenceAuthorizationPolicy;
  allowTestPrincipals?: boolean;
  clock: () => string;
  requestIdGenerator?: () => string;
  logger?: JurisprudenceSecurityLogger;
  maxBodyBytes?: number;
}

export function createSecuredJurisprudenceRouteHandlers(
  input: JurisprudenceSecuredHandlerFactoryInput,
): SecuredJurisprudenceRouteHandlers {
  const guard = new JurisprudenceSecurityGuard({
    handlers: input.handlers,
    authenticator: input.authenticator,
    authorizationPolicy: input.authorizationPolicy,
    now: input.clock,
    requestIdGenerator: input.requestIdGenerator ?? randomUUID,
    configuration: {
      allowTestPrincipals: input.allowTestPrincipals ?? false,
      ...(input.maxBodyBytes === undefined ? {} : { maxBodyBytes: input.maxBodyBytes }),
    },
    ...(input.logger === undefined ? {} : { logger: input.logger }),
  });
  return Object.freeze({
    public: Object.freeze({
      search: (request: Request) => guard.search(request),
      detail: (request: Request, params: { slug: string }) => guard.detail(request, params),
    }),
    internal: Object.freeze({
      create: (request: Request) => guard.create(request),
      update: (request: Request, params: { id: string }) => guard.update(request, params),
      getInternal: (request: Request, params: { id: string }) => guard.getInternal(request, params),
      listInternal: (request: Request) => guard.listInternal(request),
      history: (request: Request, params: { id: string }) => guard.history(request, params),
      evaluatePublication: (request: Request, params: { id: string }) => guard.evaluatePublication(request, params),
      closeService: (request: Request) => guard.closeService(request),
    }),
    close: () => guard.dispose(),
  });
}

export interface AnonymousPublicJurisprudenceHandlerFactoryInput {
  handlers: JurisprudenceRouteHandlers;
  authorizationPolicy: JurisprudenceAuthorizationPolicy;
  clock: () => string;
  requestIdGenerator?: () => string;
  logger?: JurisprudenceSecurityLogger;
}

export function createAnonymousPublicJurisprudenceRouteHandlers(
  input: AnonymousPublicJurisprudenceHandlerFactoryInput,
): SecuredPublicOnlyJurisprudenceRouteHandlers {
  const secured = createSecuredJurisprudenceRouteHandlers({
    handlers: input.handlers,
    authenticator: new AnonymousJurisprudenceAuthenticator(input.clock),
    authorizationPolicy: input.authorizationPolicy,
    allowTestPrincipals: false,
    clock: input.clock,
    ...(input.requestIdGenerator === undefined ? {} : { requestIdGenerator: input.requestIdGenerator }),
    ...(input.logger === undefined ? {} : { logger: input.logger }),
  });
  return Object.freeze({
    public: secured.public,
    close: () => secured.close(),
  });
}
