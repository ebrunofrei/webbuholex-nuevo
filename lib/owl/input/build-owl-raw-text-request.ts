import { owlLegalAnalysisRequestSchema } from "@/lib/owl/contracts/owl-analysis.schemas";
import type { OwlLegalAnalysisRequest } from "@/types/owl/owl-analysis";

export type BuildOwlRawTextRequestInput = {
  readonly text: string;
  readonly acceptedPrivacyNotice: boolean;
  readonly acceptedAutomatedAnalysisNotice: boolean;
};

export type OwlRawTextInputError =
  | {
      readonly code: "text_too_short";
      readonly message: "El texto debe contener al menos 50 caracteres útiles.";
    }
  | {
      readonly code: "text_too_long";
      readonly message: "El texto no puede superar los 12 000 caracteres.";
    }
  | {
      readonly code: "privacy_notice_required";
      readonly message: "Debe aceptar el aviso de privacidad para validar la solicitud.";
    }
  | {
      readonly code: "automated_analysis_notice_required";
      readonly message: "Debe aceptar el aviso de análisis automatizado para continuar.";
    }
  | {
      readonly code: "validation_failed";
      readonly message: "No fue posible validar la solicitud. Revise los datos ingresados.";
    };

export type BuildOwlRawTextRequestResult =
  | {
      readonly ok: true;
      readonly request: OwlLegalAnalysisRequest;
    }
  | {
      readonly ok: false;
      readonly error: OwlRawTextInputError;
    };

export function buildOwlRawTextRequest(
  input: BuildOwlRawTextRequestInput
): BuildOwlRawTextRequestResult {
  const candidate = {
    mode: "analyze_raw_text",
    text: input.text,
    persistence: "ephemeral",
    requestedTier: "free_summary",
    acceptedPrivacyNotice: input.acceptedPrivacyNotice,
    acceptedAutomatedAnalysisNotice: input.acceptedAutomatedAnalysisNotice,
    locale: "es-PE",
  };

  const result = owlLegalAnalysisRequestSchema.safeParse(candidate);

  if (result.success) {
    return {
      ok: true,
      request: result.data,
    };
  }

  const textTooSmall = result.error.issues.find(
    (issue) => issue.path.length === 1 && issue.path[0] === "text" && issue.code === "too_small"
  );
  if (textTooSmall) {
    return {
      ok: false,
      error: {
        code: "text_too_short",
        message: "El texto debe contener al menos 50 caracteres útiles.",
      },
    };
  }

  const textTooBig = result.error.issues.find(
    (issue) => issue.path.length === 1 && issue.path[0] === "text" && issue.code === "too_big"
  );
  if (textTooBig) {
    return {
      ok: false,
      error: {
        code: "text_too_long",
        message: "El texto no puede superar los 12 000 caracteres.",
      },
    };
  }

  const privacyIssue = result.error.issues.find(
    (issue) => issue.path.length === 1 && issue.path[0] === "acceptedPrivacyNotice"
  );
  if (privacyIssue) {
    return {
      ok: false,
      error: {
        code: "privacy_notice_required",
        message: "Debe aceptar el aviso de privacidad para validar la solicitud.",
      },
    };
  }

  const automatedIssue = result.error.issues.find(
    (issue) => issue.path.length === 1 && issue.path[0] === "acceptedAutomatedAnalysisNotice"
  );
  if (automatedIssue) {
    return {
      ok: false,
      error: {
        code: "automated_analysis_notice_required",
        message: "Debe aceptar el aviso de análisis automatizado para continuar.",
      },
    };
  }

  return {
    ok: false,
    error: {
      code: "validation_failed",
      message: "No fue posible validar la solicitud. Revise los datos ingresados.",
    },
  };
}
