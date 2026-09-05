import { NextResponse, type NextRequest } from "next/server";
import { getWorkspaceSession } from "@/lib/auth/session";
import { createJurisprudenceAuthenticationRuntime, type JurisprudenceAuthenticationRuntimeResult } from "@/lib/jurisprudence/jurisprudence-authentication-runtime";
import { loadAuth0ManagementApiConfiguration } from "@/lib/auth0-management-api-configuration";
import { Auth0ManagementApiIdentityStatusClient } from "@/lib/auth0-management-api-identity-status-client";
import { Auth0ExternalIdentityProviderAdapter } from "@/lib/auth0-external-identity-provider-adapter";
import { PostgresJurisprudenceRoleAssignmentRepository } from "@/lib/authorization/postgres-jurisprudence-role-assignment-repository";
import { loadAuthenticationConfiguration } from "@/lib/authentication-configuration";

function extractUrl(input: string | URL | Request): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (input instanceof Request) return input.url;
  return "";
}

function createSafeErrorResponse() {
  return NextResponse.json({
    environment: "preview",
    runtimeConfigured: false,
    m2mTokenRequest: "not_observable",
    auth0UserGetAttempted: false,
    auth0UserGetHttpStatus: "not_sent",
    identityStatus: "unavailable",
    tokenCacheValid: "not_observable",
    providerAdapter: "fail",
    localRepository: "fail",
    localActive: false,
    localRoleCount: 0,
    localRoleVersion: 0,
    sessionAvailable: true,
    authenticatorRealSessionSmoke: "fail"
  });
}

export async function GET(request: NextRequest) {
  if (process.env.VERCEL_ENV !== "preview") {
    return new NextResponse(null, { status: 404 });
  }

  const session = await getWorkspaceSession();
  if (session.status !== "authenticated" || !session.providerSubjectId) {
    return new NextResponse(null, { status: 401 });
  }

  const subjectId = session.providerSubjectId;

  let m2mTokenRequest: "pass" | "fail" | "not_observable" = "not_observable";
  let auth0UserGetAttempted = false;
  let auth0UserGetHttpStatus: number | "not_sent" | "not_observable" = "not_sent";
  let identityStatus = "unavailable";
  let tokenCacheValid: boolean | "not_observable" = "not_observable";

  let m2mRequests = 0;
  let m2mSuccesses = 0;
  let getRequests = 0;

  const interceptingFetch: typeof fetch = async (input, init) => {
    const urlStr = extractUrl(input);
    const isTokenReq = urlStr.includes("oauth/token");
    const isUserReq = urlStr.includes("/api/v2/users/");

    if (isTokenReq) {
      m2mRequests++;
    }
    if (isUserReq) {
      getRequests++;
      auth0UserGetAttempted = true;
    }

    try {
      const response = await globalThis.fetch(input, init);
      if (isUserReq) {
        auth0UserGetHttpStatus = response.status;
      }
      if (isTokenReq) {
         if (response.ok) {
           m2mSuccesses++;
         } else {
           m2mTokenRequest = "fail";
         }
      }
      return response;
    } catch (error) {
      if (isTokenReq) {
         m2mTokenRequest = "fail";
      }
      throw error;
    }
  };

  let runtimeResult: JurisprudenceAuthenticationRuntimeResult;
  try {
    runtimeResult = createJurisprudenceAuthenticationRuntime(
      process.env,
      process.env,
      { fetch: interceptingFetch, getSession: getWorkspaceSession }
    );
  } catch (err) {
    return createSafeErrorResponse();
  }

  if (runtimeResult.status !== "configured") {
    return createSafeErrorResponse();
  }

  const { runtime } = runtimeResult;

  let providerAdapterSmoke = "fail";
  let localRepositorySmoke = "fail";
  let localActive = false;
  let localRoleCount = 0;
  let localRoleVersion = 0;
  let authenticatorStatus = "fail";

  try {
    const mngConfig = loadAuth0ManagementApiConfiguration(process.env);
    const authConfig = loadAuthenticationConfiguration(process.env);

    if (mngConfig.status === "configured" && authConfig.status === "configured") {
      const statusClient = new Auth0ManagementApiIdentityStatusClient(mngConfig, { fetch: interceptingFetch });
      const adapter = new Auth0ExternalIdentityProviderAdapter(authConfig, statusClient, getWorkspaceSession);
      const repo = new PostgresJurisprudenceRoleAssignmentRepository();

      const identityKey = { providerKind: "auth0_oidc" as const, subjectId };

      try {
        const s1 = await statusClient.getIdentityStatus(subjectId);
        if (m2mRequests > 0) {
           m2mTokenRequest = m2mSuccesses > 0 ? "pass" : "fail";
        }
        identityStatus = s1.status;

        const getReqCountAfterS1 = getRequests;
        const s2 = await statusClient.getIdentityStatus(subjectId);

        if (m2mRequests === 1 && m2mSuccesses === 1 && getRequests === 2) {
          tokenCacheValid = true;
        } else {
          tokenCacheValid = false;
        }
      } catch {
        if (m2mTokenRequest !== "pass") m2mTokenRequest = "fail";
      }

      try {
        const adapterStatus = await adapter.getIdentityStatus(subjectId);
        providerAdapterSmoke = adapterStatus.status !== "unavailable" ? "pass" : "fail";
      } catch { }

      try {
        localActive = await repo.isSubjectActive(identityKey);
        localRoleCount = (await repo.getRolesForSubject(identityKey)).length;
        localRoleVersion = await repo.getRoleAssignmentVersion(identityKey);
        localRepositorySmoke = "pass";
      } catch { }
    }

    try {
      // The authenticators resolve Authentication logic
      const authResult = await runtime.authenticator.authenticate(request);
      authenticatorStatus = authResult.status === "authenticated" ? "pass" : "fail";
    } catch { }

  } catch {
    // Swallow component failures securely
  } finally {
    await runtime.close();
  }

  return NextResponse.json({
    environment: "preview",
    runtimeConfigured: true,
    m2mTokenRequest,
    auth0UserGetAttempted,
    auth0UserGetHttpStatus,
    identityStatus,
    tokenCacheValid,
    providerAdapter: providerAdapterSmoke,
    localRepository: localRepositorySmoke,
    localActive,
    localRoleCount,
    localRoleVersion,
    sessionAvailable: true,
    authenticatorRealSessionSmoke: authenticatorStatus
  });
}
