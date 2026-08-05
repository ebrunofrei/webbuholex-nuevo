import type {
  JurisprudenceHttpErrorResponse,
  JurisprudenceHttpMeta,
  JurisprudenceHttpPaginationMeta,
  JurisprudenceHttpPublicErrorCode,
  JurisprudenceHttpSuccessResponse,
} from "@/types/jurisprudence-http";

const baseHeaders = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
} as const;

function responseHeaders(requestId: string, extra: Readonly<Record<string, string>> = {}): Headers {
  return new Headers({ ...baseHeaders, "x-request-id": requestId, ...extra });
}

function meta(requestId: string, generatedAt: string, pagination?: JurisprudenceHttpPaginationMeta): JurisprudenceHttpMeta {
  return { requestId, generatedAt, ...(pagination === undefined ? {} : { pagination }) };
}

export function jurisprudenceJsonSuccess<T>(input: {
  data: T;
  requestId: string;
  generatedAt: string;
  status?: number;
  pagination?: JurisprudenceHttpPaginationMeta;
}): Response {
  const body: JurisprudenceHttpSuccessResponse<T> = {
    ok: true,
    data: input.data,
    meta: meta(input.requestId, input.generatedAt, input.pagination),
  };
  return new Response(JSON.stringify(body), {
    status: input.status ?? 200,
    headers: responseHeaders(input.requestId),
  });
}

export function jurisprudenceJsonError(input: {
  code: JurisprudenceHttpPublicErrorCode;
  message: string;
  requestId: string;
  generatedAt: string;
  status: number;
  headers?: Readonly<Record<string, string>>;
}): Response {
  const body: JurisprudenceHttpErrorResponse = {
    ok: false,
    error: { code: input.code, message: input.message },
    meta: meta(input.requestId, input.generatedAt),
  };
  return new Response(JSON.stringify(body), {
    status: input.status,
    headers: responseHeaders(input.requestId, input.headers),
  });
}
