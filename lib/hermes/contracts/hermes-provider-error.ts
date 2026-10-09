import { z } from "zod";

export const hermesProviderErrorCodeSchema = z.enum([
  "timeout",
  "unavailable",
  "rate_limited",
  "context_limit",
  "invalid_output",
  "provider_rejected",
  "cancelled",
  "unknown_provider_failure"
]);

export const hermesProviderErrorSchema = z.object({
  code: hermesProviderErrorCodeSchema,
  isRetryable: z.boolean()
}).strict();

export type HermesProviderErrorCode = z.infer<typeof hermesProviderErrorCodeSchema>;
export type HermesProviderError = z.infer<typeof hermesProviderErrorSchema>;

// Trusted application-owned mapping for safe public messages.
// No raw provider text can enter this mapping.
const ERROR_MESSAGES_MAPPING: Record<HermesProviderErrorCode, string> = {
  timeout: "La solicitud ha tardado demasiado en responder. Por favor, intente nuevamente.",
  unavailable: "El servicio de análisis no se encuentra disponible temporalmente.",
  rate_limited: "Se ha excedido el límite de solicitudes. Por favor, espere un momento antes de reintentar.",
  context_limit: "El documento es demasiado extenso para ser procesado de una sola vez.",
  invalid_output: "El análisis generado no cumple con los estándares de validación requeridos.",
  provider_rejected: "La solicitud no fue admitida por las políticas de seguridad del servicio.",
  cancelled: "La solicitud fue cancelada.",
  unknown_provider_failure: "Ocurrió un error inesperado al procesar la solicitud."
};

export function getHermesSafePublicErrorMessage(code: HermesProviderErrorCode): string {
  return ERROR_MESSAGES_MAPPING[code] ?? ERROR_MESSAGES_MAPPING.unknown_provider_failure;
}
