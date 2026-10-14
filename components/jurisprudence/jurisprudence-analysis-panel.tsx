"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { buildLoginRedirect } from "@/lib/auth/return-to";
import {
  jurisprudenceInterpretationSchema,
  type JurisprudenceInterpretation,
} from "@/lib/hermes/contracts/jurisprudence-interpretation";
import { JurisprudenceInterpretationView } from "./jurisprudence-interpretation-view";
import styles from "./jurisprudence.module.css";

const interpretationResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    slug: z.string(),
    interpretation: jurisprudenceInterpretationSchema,
  }),
});

const errorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string().optional(),
  }),
});

export type HermesErrorKind =
  | "auth_required"
  | "not_found"
  | "grounding_failed"
  | "source_too_large"
  | "rate_limited"
  | "provider_failure"
  | "invalid_interpretation"
  | "limiter_unavailable"
  | "origin_not_allowed"
  | "unexpected_internal_failure"
  | "network_error";

export type HermesUiState =
  | { readonly kind: "idle" }
  | { readonly kind: "auth_redirecting"; readonly loginUrl: string }
  | { readonly kind: "ready" }
  | { readonly kind: "submitting" }
  | {
      readonly kind: "success";
      readonly interpretation: JurisprudenceInterpretation;
    }
  | {
      readonly kind: "error";
      readonly errorKind: HermesErrorKind;
      readonly message: string;
      readonly retryAfterSeconds?: number | undefined;
    };

export interface JurisprudenceAnalysisPanelProps {
  readonly slug: string;
  readonly isAuthenticated?: boolean | undefined;
  readonly intentAnalyze?: boolean | undefined;
  readonly onNavigate?: ((url: string) => void) | undefined;
}

function mapHttpError(
  status: number,
  code?: string,
  retryAfterSeconds?: number,
): Extract<HermesUiState, { kind: "error" }> {
  if (status === 401 || code === "authentication_required") {
    return {
      kind: "error",
      errorKind: "auth_required",
      message: "Tu sesión ha expirado o necesitas iniciar sesión para continuar.",
    };
  }

  if (status === 404 || code === "jurisprudence_not_found") {
    return {
      kind: "error",
      errorKind: "not_found",
      message: "Esta resolución no está disponible para análisis o no se encuentra publicada.",
    };
  }

  if (status === 422) {
    if (code === "source_too_large") {
      return {
        kind: "error",
        errorKind: "source_too_large",
        message: "La resolución excede la longitud máxima admitida para análisis directo.",
      };
    }
    return {
      kind: "error",
      errorKind: "grounding_failed",
      message:
        "El análisis no pudo ser contrastado con suficiente respaldo textual en la resolución. Por rigor jurídico, no se emite una interpretación no fundamentada.",
    };
  }

  if (status === 429 || code === "rate_limited") {
    return {
      kind: "error",
      errorKind: "rate_limited",
      message: "Has alcanzado el límite de solicitudes. Espera antes de volver a intentarlo.",
      retryAfterSeconds,
    };
  }

  if (status === 502) {
    if (code === "invalid_interpretation") {
      return {
        kind: "error",
        errorKind: "invalid_interpretation",
        message: "La respuesta generada no cumplió los requisitos de validación estructural.",
      };
    }
    return {
      kind: "error",
      errorKind: "provider_failure",
      message: "El motor de análisis presentó una falla temporal. Inténtalo nuevamente en unos momentos.",
    };
  }

  if (status === 503 || code === "limiter_unavailable") {
    return {
      kind: "error",
      errorKind: "limiter_unavailable",
      message: "El servicio de análisis se encuentra temporalmente no disponible. Inténtalo nuevamente más tarde.",
    };
  }

  if (status === 403 || code === "origin_not_allowed") {
    return {
      kind: "error",
      errorKind: "origin_not_allowed",
      message: "Solicitud no permitida por política de seguridad.",
    };
  }

  if (status === 500 || code === "unexpected_internal_failure") {
    return {
      kind: "error",
      errorKind: "unexpected_internal_failure",
      message: "Ocurrió un error inesperado al procesar la resolución.",
    };
  }

  return {
    kind: "error",
    errorKind: "unexpected_internal_failure",
    message: "Ocurrió un error inesperado al procesar la resolución.",
  };
}

export function JurisprudenceAnalysisPanel({
  slug,
  isAuthenticated = false,
  intentAnalyze = false,
  onNavigate,
}: JurisprudenceAnalysisPanelProps) {
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeIdempotencyKeyRef = useRef<string | null>(null);

  const [uiState, setUiState] = useState<HermesUiState>(() => {
    if (isAuthenticated && intentAnalyze) {
      return { kind: "ready" };
    }
    return { kind: "idle" };
  });

  const [countdown, setCountdown] = useState<number>(0);

  const loginTarget = buildLoginRedirect(`/jurisprudencia/${slug}?intent=analyze`);

  // URL Cleanup after Intent Restoration:
  // Preserves window.history.state, does not use {}, cleans ?intent=analyze,
  // does not trigger any fetch or provider call.
  useEffect(() => {
    if (!isAuthenticated || !intentAnalyze) return;

    if (typeof window !== "undefined" && window.history) {
      try {
        window.history.replaceState(
          window.history.state,
          "",
          `/jurisprudencia/${slug}`,
        );
      } catch {
        // Safe fallback
      }
    }
  }, [isAuthenticated, intentAnalyze, slug]);

  // Rate-limit countdown timer management
  useEffect(() => {
    if (countdown <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [countdown]);

  // Component unmount aborts any active in-flight request
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      abortRef.current?.abort();
    };
  }, []);

  const handleAnonymousClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    setUiState({ kind: "auth_redirecting", loginUrl: loginTarget });
    if (onNavigate) {
      e.preventDefault();
      onNavigate(loginTarget);
      return;
    }
  };

  const handleStartAnalysis = async (options?: { isRetry?: boolean }) => {
    // 1. Authoritative synchronous in-flight lock check before first await
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    // 2. Canonical client idempotency key generation:
    // Retries of the same logical error state reuse the existing key.
    // Explicit new actions generate a fresh UUID.
    const isRetry = options?.isRetry ?? (uiState.kind === "error");
    const idempotencyKey =
      isRetry && activeIdempotencyKeyRef.current
        ? activeIdempotencyKeyRef.current
        : crypto.randomUUID();
    activeIdempotencyKeyRef.current = idempotencyKey;

    // 3. Abort prior controller if any & create new AbortController
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // 4. Update React UI state
    setUiState({ kind: "submitting" });

    try {
      const response = await fetch("/api/jurisprudence/interpret", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ slug }),
        signal: controller.signal,
        cache: "no-store",
      });

      if (response.ok) {
        const rawJson: unknown = await response.json();
        const parsed = interpretationResponseSchema.safeParse(rawJson);

        if (!parsed.success || parsed.data.data.slug !== slug) {
          setUiState({
            kind: "error",
            errorKind: "invalid_interpretation",
            message: "La respuesta generada no cumplió los requisitos de validación estructural.",
          });
          return;
        }

        setUiState({
          kind: "success",
          interpretation: parsed.data.data.interpretation,
        });
        return;
      }

      // Non-200 error handling
      let errorCode: string | undefined = undefined;
      try {
        const errorJson: unknown = await response.json();
        const parsedError = errorResponseSchema.safeParse(errorJson);
        if (parsedError.success) {
          errorCode = parsedError.data.error.code;
        }
      } catch {
        // Body was not JSON
      }

      let retrySeconds: number | undefined = undefined;
      const retryAfterHeader = response.headers.get("retry-after");
      if (retryAfterHeader) {
        const parsedSec = parseInt(retryAfterHeader, 10);
        if (!Number.isNaN(parsedSec) && parsedSec > 0) {
          retrySeconds = Math.min(parsedSec, 3600);
        }
      }

      const mapped = mapHttpError(response.status, errorCode, retrySeconds);
      if (mapped.retryAfterSeconds !== undefined) {
        setCountdown(mapped.retryAfterSeconds);
      }
      setUiState(mapped);
    } catch {
      if (controller.signal.aborted) {
        // Aborted due to unmount or cancellation; do not display scary error
        return;
      }

      setUiState({
        kind: "error",
        errorKind: "network_error",
        message: "No fue posible establecer conexión con el servicio de análisis. Inténtalo nuevamente más tarde.",
      });
    } finally {
      // Release synchronous lock in finally
      inFlightRef.current = false;
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  };

  // FLOW A: Anonymous User CTA
  if (!isAuthenticated) {
    return (
      <section className={styles.analysisPanel} aria-labelledby="analysis-heading">
        <div className={styles.analysisHeader}>
          <p>ANÁLISIS ASISTIDO</p>
          <h3 id="analysis-heading">Análisis jurisprudencial con Búho</h3>
          <span>Inicia sesión para generar un análisis jurídico estructurado.</span>
        </div>
        <div className={styles.analysisActions}>
          <a
            href={loginTarget}
            role="button"
            className={styles.primaryButton}
            onClick={handleAnonymousClick}
          >
            Analizar con Búho
          </a>
        </div>
      </section>
    );
  }

  // FLOW C: Authenticated Return with intent=analyze in READY state
  if (uiState.kind === "ready") {
    return (
      <section className={styles.analysisPanel} aria-labelledby="analysis-heading">
        <div className={styles.readyCard}>
          <div className={styles.analysisHeader}>
            <p>ANÁLISIS ASISTIDO</p>
            <h3 id="analysis-heading">Iniciar análisis con Búho</h3>
            <span>
              Sesión iniciada. Haz clic en el botón para comenzar el análisis asistido de esta resolución jurisprudencial.
            </span>
          </div>
          <div className={styles.analysisActions}>
            <button
              type="button"
              onClick={() => handleStartAnalysis({ isRetry: false })}
              className={styles.primaryButton}
            >
              Iniciar análisis con Búho
            </button>
          </div>
        </div>
      </section>
    );
  }

  // SUBMITTING State
  if (uiState.kind === "submitting") {
    return (
      <section className={styles.analysisPanel} aria-busy="true" aria-labelledby="analysis-heading">
        <div className={styles.loadingCard} role="status">
          <div className={styles.analysisHeader}>
            <p>ANÁLISIS ASISTIDO</p>
            <h3 id="analysis-heading">Analizando resolución con Búho…</h3>
            <span>
              Procesando fuentes documentales y contrastando citas verbatim en el texto judicial.
            </span>
          </div>
          <div className={styles.analysisActions}>
            <button
              type="button"
              disabled
              className={styles.primaryButton}
            >
              Analizando…
            </button>
          </div>
        </div>
      </section>
    );
  }

  // SUCCESS State
  if (uiState.kind === "success") {
    return (
      <section className={styles.analysisPanel} aria-labelledby="analysis-heading">
        <div className={styles.analysisHeader}>
          <p>ANÁLISIS ASISTIDO</p>
          <h3 id="analysis-heading">Análisis con Búho</h3>
        </div>
        <JurisprudenceInterpretationView interpretation={uiState.interpretation} />
        <div className={styles.reanalyzeActions}>
          <button
            type="button"
            onClick={() => handleStartAnalysis({ isRetry: false })}
            className={styles.secondaryButton}
          >
            Volver a analizar
          </button>
        </div>
      </section>
    );
  }

  // ERROR State
  if (uiState.kind === "error") {
    return (
      <section className={styles.analysisPanel} aria-labelledby="analysis-heading">
        <div className={styles.errorBanner} role="alert">
          <div className={styles.analysisHeader}>
            <p>ERROR EN EL ANÁLISIS</p>
            <h3 id="analysis-heading">No se pudo completar el análisis</h3>
            <span>{uiState.message}</span>
            {countdown > 0 ? (
              <p className={styles.countdownText}>
                Podrás volver a intentarlo en {countdown} segundos.
              </p>
            ) : null}
          </div>
          <div className={styles.analysisActions}>
            {uiState.errorKind === "auth_required" ? (
              <a
                href={loginTarget}
                role="button"
                className={styles.primaryButton}
                onClick={handleAnonymousClick}
              >
                Iniciar sesión
              </a>
            ) : (
              <button
                type="button"
                onClick={() => handleStartAnalysis({ isRetry: true })}
                disabled={countdown > 0}
                className={styles.primaryButton}
              >
                {countdown > 0 ? `Espera (${countdown}s)` : "Reintentar análisis"}
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  // FLOW B: Authenticated Direct Page (IDLE state)
  return (
    <section className={styles.analysisPanel} aria-labelledby="analysis-heading">
      <div className={styles.analysisHeader}>
        <p>ANÁLISIS ASISTIDO</p>
        <h3 id="analysis-heading">Análisis asistido con Búho</h3>
        <span>Genera una síntesis jurídica estructurada y contrastada de esta resolución.</span>
      </div>
      <div className={styles.analysisActions}>
        <button
          type="button"
          onClick={() => handleStartAnalysis({ isRetry: false })}
          className={styles.primaryButton}
        >
          Analizar con Búho
        </button>
      </div>
    </section>
  );
}
