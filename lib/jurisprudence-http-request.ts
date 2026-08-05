import { JurisprudenceHttpError } from "@/lib/jurisprudence-http-error";
import {
  jurisprudenceHttpIdempotencyKeySchema,
  jurisprudenceHttpRequestIdSchema,
} from "@/lib/schemas/jurisprudence-http";

export const DEFAULT_JURISPRUDENCE_HTTP_BODY_LIMIT = 256 * 1024;
export const DEFAULT_JURISPRUDENCE_HTTP_QUERY_LIMIT = 2_048;

export function resolveJurisprudenceHttpRequestId(headers: Headers, generate: () => string): string {
  const supplied = headers.get("x-request-id");
  if (supplied !== null) {
    const parsed = jurisprudenceHttpRequestIdSchema.safeParse(supplied);
    if (parsed.success) return parsed.data;
  }
  const generated = jurisprudenceHttpRequestIdSchema.safeParse(generate());
  if (!generated.success) throw new JurisprudenceHttpError(500, "INTERNAL_ERROR", "No fue posible crear el identificador de la solicitud.");
  return generated.data;
}

export function assertJurisprudenceHttpMethod(request: Request, allowed: readonly string[]): void {
  if (!allowed.includes(request.method)) {
    throw new JurisprudenceHttpError(
      405,
      "METHOD_NOT_ALLOWED",
      "El método HTTP no está permitido para esta operación.",
      { allow: allowed.join(", ") },
    );
  }
}

export function assertJurisprudenceJsonAccepted(request: Request): void {
  const accept = request.headers.get("accept");
  if (accept === null || accept.trim() === "") return;
  const mediaTypes = accept.split(",").map((value) => value.split(";", 1)[0]?.trim().toLowerCase());
  if (!mediaTypes.includes("application/json") && !mediaTypes.includes("*/*")) {
    throw new JurisprudenceHttpError(406, "NOT_ACCEPTABLE", "La respuesta disponible utiliza application/json.");
  }
}

export function assertJurisprudenceJsonContentType(request: Request): void {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new JurisprudenceHttpError(415, "UNSUPPORTED_MEDIA_TYPE", "El cuerpo debe utilizar application/json.");
  }
}

export function readJurisprudenceIdempotencyKey(request: Request): string {
  const parsed = jurisprudenceHttpIdempotencyKeySchema.safeParse(request.headers.get("idempotency-key"));
  if (!parsed.success) throw new JurisprudenceHttpError(400, "BAD_REQUEST", "Se requiere una clave de idempotencia válida.");
  return parsed.data;
}

export async function readLimitedJurisprudenceJson(request: Request, maximumBytes: number): Promise<unknown> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (!Number.isInteger(length) || length < 0) throw new JurisprudenceHttpError(400, "BAD_REQUEST", "Content-Length no es válido.");
    if (length > maximumBytes) throw new JurisprudenceHttpError(413, "PAYLOAD_TOO_LARGE", "El cuerpo supera el límite permitido.");
  }
  if (request.body === null) throw new JurisprudenceHttpError(400, "BAD_REQUEST", "El cuerpo JSON es obligatorio.");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximumBytes) throw new JurisprudenceHttpError(413, "PAYLOAD_TOO_LARGE", "El cuerpo supera el límite permitido.");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (size === 0) throw new JurisprudenceHttpError(400, "BAD_REQUEST", "El cuerpo JSON es obligatorio.");
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new JurisprudenceHttpError(400, "BAD_REQUEST", "El cuerpo JSON no es válido.");
  }
}

export function parseStrictJurisprudenceQuery(
  request: Request,
  allowedKeys: ReadonlySet<string>,
  maximumLength: number,
): Readonly<Record<string, string | undefined>> {
  const url = new URL(request.url);
  if (url.search.length > maximumLength) throw new JurisprudenceHttpError(400, "BAD_REQUEST", "La consulta supera el límite permitido.");
  const output: Record<string, string | undefined> = {};
  for (const key of url.searchParams.keys()) {
    if (!allowedKeys.has(key)) throw new JurisprudenceHttpError(400, "BAD_REQUEST", "La consulta contiene parámetros no permitidos.");
    const values = url.searchParams.getAll(key);
    if (values.length !== 1) throw new JurisprudenceHttpError(400, "BAD_REQUEST", "Cada parámetro debe aparecer una sola vez.");
    const value = values[0]?.trim() ?? "";
    output[key] = value === "" ? undefined : value;
  }
  return output;
}

export function parsePositiveInteger(value: string | undefined, field: string): number | undefined {
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value)) throw new JurisprudenceHttpError(400, "BAD_REQUEST", `El parámetro ${field} no es válido.`);
  return Number(value);
}
