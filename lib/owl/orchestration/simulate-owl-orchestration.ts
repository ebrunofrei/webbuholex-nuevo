import type {
  OwlExecutionState,
  OwlLegalAnalysisRequest,
} from "@/types/owl/owl-analysis";

export type OwlSimulatedOrchestrationState = Extract<
  OwlExecutionState,
  { readonly status: "ready" | "rejected" }
>;

export function simulateOwlOrchestration(
  request: OwlLegalAnalysisRequest
): OwlSimulatedOrchestrationState {
  if (request.mode !== "analyze_raw_text") {
    return {
      status: "rejected",
      errorCode: "unsupported_mode",
      message:
        "La solicitud no puede ingresar al flujo simulado con la configuración proporcionada.",
    };
  }

  if (request.persistence !== "ephemeral") {
    return {
      status: "rejected",
      errorCode: "validation_failed",
      message:
        "La solicitud no puede ingresar al flujo simulado con la configuración proporcionada.",
    };
  }

  if (request.requestedTier !== "free_summary") {
    return {
      status: "rejected",
      errorCode: "validation_failed",
      message:
        "La solicitud no puede ingresar al flujo simulado con la configuración proporcionada.",
    };
  }

  if (request.locale !== "es-PE") {
    return {
      status: "rejected",
      errorCode: "validation_failed",
      message:
        "La solicitud no puede ingresar al flujo simulado con la configuración proporcionada.",
    };
  }

  return {
    status: "ready",
  };
}
