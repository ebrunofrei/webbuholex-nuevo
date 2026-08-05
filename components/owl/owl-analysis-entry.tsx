import { useEffect, useRef, useState } from "react";
import styles from "./owl-analysis-entry.module.css";
import { buildOwlRawTextRequest } from "@/lib/owl/input/build-owl-raw-text-request";
import type { OwlSimulatedOrchestrationState } from "@/lib/owl/orchestration/simulate-owl-orchestration";
import type { OwlPublicErrorCode } from "@/types/owl/owl-analysis";

// ---------------------------------------------------------------------------
// Transport error messages (closed set)
// ---------------------------------------------------------------------------

const TRANSPORT_VALIDATION_ERROR_MESSAGE =
  "No fue posible validar la solicitud en el servidor. Inténtelo nuevamente.";

const TRANSPORT_SIZE_ERROR_MESSAGE =
  "La solicitud excede el tamaño permitido. Reduzca el texto e inténtelo nuevamente.";

const TRANSPORT_SEND_ERROR_MESSAGE =
  "La solicitud no pudo ser enviada. Verifique su conexión e inténtelo nuevamente.";

// ---------------------------------------------------------------------------
// Allowed OwlPublicErrorCode literals (derived from the canonical type)
// ---------------------------------------------------------------------------

const OWL_PUBLIC_ERROR_CODES: readonly OwlPublicErrorCode[] = [
  "invalid_input",
  "text_too_short",
  "text_too_long",
  "privacy_notice_required",
  "automated_analysis_notice_required",
  "unsupported_mode",
  "validation_failed",
  "analysis_unavailable",
  "analysis_failed",
  "cancelled",
];

function isOwlPublicErrorCode(value: unknown): value is OwlPublicErrorCode {
  return (
    typeof value === "string" &&
    (OWL_PUBLIC_ERROR_CODES as readonly string[]).includes(value)
  );
}

// ---------------------------------------------------------------------------
// Response content-type guard
// ---------------------------------------------------------------------------

function isApplicationJson(response: Response): boolean {
  const contentType = response.headers.get("content-type") ?? "";
  const mediaType = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  return mediaType === "application/json";
}

// ---------------------------------------------------------------------------
// Response shape guards
// ---------------------------------------------------------------------------

function isReadyShape(
  body: unknown
): body is { readonly status: "ready" } {
  if (
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return false;
  }
  const keys = Object.keys(body as object);
  if (keys.length !== 1) return false;
  return (body as Record<string, unknown>)["status"] === "ready";
}

function isRejectedShape(body: unknown): body is {
  readonly status: "rejected";
  readonly errorCode: OwlPublicErrorCode;
  readonly message: string;
} {
  if (
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return false;
  }
  const keys = Object.keys(body as object);
  if (keys.length !== 3) return false;
  const b = body as Record<string, unknown>;
  return (
    b["status"] === "rejected" &&
    isOwlPublicErrorCode(b["errorCode"]) &&
    typeof b["message"] === "string"
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OwlAnalysisEntry() {
  const [text, setText] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [automatedAccepted, setAutomatedAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orchestrationState, setOrchestrationState] =
    useState<OwlSimulatedOrchestrationState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const requestSequenceRef = useRef(0);

  // -------------------------------------------------------------------------
  // Unmount cleanup
  // -------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      requestSequenceRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  // -------------------------------------------------------------------------
  // Invalidation helper
  // -------------------------------------------------------------------------

  const invalidatePendingRequest = () => {
    requestSequenceRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setIsSubmitting(false);
    setError(null);
    setOrchestrationState(null);
  };

  // -------------------------------------------------------------------------
  // Edit handlers
  // -------------------------------------------------------------------------

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    invalidatePendingRequest();
  };

  const handlePrivacyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrivacyAccepted(e.target.checked);
    invalidatePendingRequest();
  };

  const handleAutomatedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutomatedAccepted(e.target.checked);
    invalidatePendingRequest();
  };

  // -------------------------------------------------------------------------
  // Submit handler
  // -------------------------------------------------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    setError(null);
    setOrchestrationState(null);

    const result = buildOwlRawTextRequest({
      text,
      acceptedPrivacyNotice: privacyAccepted,
      acceptedAutomatedAnalysisNotice: automatedAccepted,
    });

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    // Capture and bump the request sequence before starting network I/O
    requestSequenceRef.current += 1;
    const sequence = requestSequenceRef.current;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/owl/admission", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result.request),
        signal: controller.signal,
        cache: "no-store",
      });

      // Discard stale response
      if (requestSequenceRef.current !== sequence) return;

      // Validate Content-Type
      if (!isApplicationJson(response)) {
        setError(TRANSPORT_VALIDATION_ERROR_MESSAGE);
        return;
      }

      // Parse JSON
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        if (requestSequenceRef.current !== sequence) return;
        setError(TRANSPORT_VALIDATION_ERROR_MESSAGE);
        return;
      }

      if (requestSequenceRef.current !== sequence) return;

      // Map by HTTP status + shape
      if (response.status === 200) {
        if (isReadyShape(body)) {
          setOrchestrationState({ status: "ready" });
        } else {
          setError(TRANSPORT_VALIDATION_ERROR_MESSAGE);
        }
      } else if (response.status === 422) {
        if (isRejectedShape(body)) {
          setOrchestrationState(body);
        } else {
          setError(TRANSPORT_VALIDATION_ERROR_MESSAGE);
        }
      } else if (response.status === 413) {
        setError(TRANSPORT_SIZE_ERROR_MESSAGE);
      } else {
        // 400, 403, 415, 500, and any other status
        setError(TRANSPORT_VALIDATION_ERROR_MESSAGE);
      }
    } catch (err: unknown) {
      if (requestSequenceRef.current !== sequence) return;
      if (
        err !== null &&
        typeof err === "object" &&
        (err as { name?: unknown }).name === "AbortError"
      ) {
        // Silent — aborted intentionally
        return;
      }
      setError(TRANSPORT_SEND_ERROR_MESSAGE);
    } finally {
      if (requestSequenceRef.current === sequence) {
        setIsSubmitting(false);
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className={styles.entryContainer}>
      <h2 id="owl-entry-title" className={styles.title}>
        Búho Analítico
      </h2>

      <p className={styles.description}>
        Pegue un fragmento jurídico para identificar de manera
        orientativa su estructura, problema principal y posibles
        criterios jurisprudenciales relacionados.
      </p>

      <div
        className={styles.modes}
        role="group"
        aria-label="Capacidades del Búho Analítico"
      >
        <button
          type="button"
          aria-pressed="true"
          className={styles.modeButtonActive}
        >
          Analizar texto jurídico
        </button>

        <button
          type="button"
          aria-disabled="true"
          className={styles.modeButtonDisabled}
        >
          Analizar una resolución{" "}
          <span className={styles.futureBadge}>Próximamente</span>
        </button>

        <button
          type="button"
          aria-disabled="true"
          className={styles.modeButtonDisabled}
        >
          Preguntar sobre una sentencia{" "}
          <span className={styles.futureBadge}>Próximamente</span>
        </button>

        <button
          type="button"
          aria-disabled="true"
          className={styles.modeButtonDisabled}
        >
          Comparar resoluciones{" "}
          <span className={styles.futureBadge}>Próximamente</span>
        </button>

        <button
          type="button"
          aria-disabled="true"
          className={styles.modeButtonDisabled}
        >
          Evaluar aplicabilidad{" "}
          <span className={styles.futureBadge}>Próximamente</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <div className={styles.field}>
          <label htmlFor="owl-text">Texto a analizar</label>

          <textarea
            id="owl-text"
            value={text}
            onChange={handleTextChange}
            maxLength={12000}
            className={styles.textarea}
            placeholder="Pegue aquí el texto jurídico..."
            aria-describedby="owl-text-count"
          />

          <div
            id="owl-text-count"
            className={styles.counter}
            aria-live="polite"
          >
            {text.length} / 12000 caracteres
          </div>
        </div>

        <div className={styles.warnings}>
          <p className={styles.warningText}>
            <strong>Aviso Legal:</strong> Búho ofrece un análisis
            jurídico automatizado y orientativo basado en el texto
            proporcionado y en las fuentes verificadas disponibles.
            Puede contener inferencias o requerir información
            adicional. No sustituye la revisión de un abogado ni
            constituye por sí solo una estrategia, dictamen o
            pronóstico del resultado de un caso.
          </p>

          <p className={styles.warningText}>
            <strong>Privacidad:</strong> Evite incluir datos personales
            o confidenciales que no sean necesarios para el análisis.
            En esta modalidad, el texto no se conserva como documento
            del usuario.
          </p>
        </div>

        <fieldset className={styles.checkboxGroup}>
          <legend className="sr-only">Confirmaciones requeridas</legend>

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={handlePrivacyChange}
            />
            <span>
              He leído y acepto que el texto no se conservará y asumo
              la responsabilidad sobre los datos ingresados.
            </span>
          </label>

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={automatedAccepted}
              onChange={handleAutomatedChange}
            />
            <span>
              Comprendo que el resultado es orientativo, automatizado
              y no sustituye la asesoría legal profesional.
            </span>
          </label>
        </fieldset>

        {error !== null && (
          <div className={styles.errorAlert} role="alert">
            {error}
          </div>
        )}

        {orchestrationState !== null && error === null && (
          <div
            className={
              orchestrationState.status === "ready"
                ? styles.successPanel
                : styles.errorAlert
            }
            role={orchestrationState.status === "ready" ? "status" : "alert"}
          >
            {orchestrationState.status === "ready"
              ? "Solicitud admitida por el orquestador simulado. La ejecución jurídica real todavía no está habilitada."
              : orchestrationState.message}
          </div>
        )}

        <button
          type="submit"
          className={styles.submitButton}
          disabled={isSubmitting}
          aria-busy={isSubmitting ? "true" : undefined}
        >
          {isSubmitting ? "VALIDANDO SOLICITUD…" : "ANALIZAR TEXTO"}
        </button>
      </form>
    </div>
  );
}
