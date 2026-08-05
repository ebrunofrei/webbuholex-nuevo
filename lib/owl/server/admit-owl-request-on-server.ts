import "server-only";

import { owlLegalAnalysisRequestSchema } from "@/lib/owl/contracts/owl-analysis.schemas";
import { simulateOwlOrchestration } from "@/lib/owl/orchestration/simulate-owl-orchestration";
import type { OwlExecutionState } from "@/types/owl/owl-analysis";

export type OwlServerAdmissionState = Extract<
  OwlExecutionState,
  { readonly status: "ready" | "rejected" }
>;

/**
 * Servicio puro y determinista.
 * En modo ephemeral, el código no escribe el request en storage, filesystem, SQLite,
 * caché, logs, analytics, projects, threads, conversations ni messages.
 */
export function admitOwlRequestOnServer(
  input: unknown
): OwlServerAdmissionState {
  const parsed = owlLegalAnalysisRequestSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "rejected",
      errorCode: "validation_failed",
      message:
        "La solicitud no puede ingresar al flujo simulado con la configuración proporcionada.",
    };
  }

  return simulateOwlOrchestration(parsed.data);
}
