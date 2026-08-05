"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPublicJurisprudenceBySlugAction } from "@/lib/jurisprudence-public-search-actions";
import {
  parseJurisprudencePublicSearchParameters,
  serializeJurisprudencePublicSearchQuery,
} from "@/lib/jurisprudence-public-search-gateway";
import { jurisprudencePublicSlugSchema } from "@/lib/schemas/jurisprudence-public-search-gateway";
import { unconfiguredJurisprudencePublicSearchGateway } from "@/lib/unconfigured-jurisprudence-public-search-gateway";
import type {
  JurisprudencePublicDetailResponse,
  JurisprudencePublicSearchGateway,
} from "@/types/jurisprudence-public-search-gateway";
import type { JurisprudencePublicDetailDto } from "@/types/jurisprudence";
import styles from "./jurisprudence.module.css";

export interface JurisprudencePublicDetailProps {
  readonly slug: string;
  readonly searchGateway?: JurisprudencePublicSearchGateway | undefined;
  readonly getBySlugAction?: ((slug: string) => Promise<JurisprudencePublicDetailResponse>) | undefined;
  readonly rawSearchParams?: Record<string, string | string[] | undefined> | URLSearchParams | undefined;
}

type DetailUiState =
  | { readonly kind: "invalid_slug"; readonly message: string }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly item: JurisprudencePublicDetailDto }
  | { readonly kind: "not_found" }
  | { readonly kind: "not_configured" }
  | { readonly kind: "controlled_error"; readonly message: string };

function getReturnUrl(
  rawSearchParams?: Record<string, string | string[] | undefined> | URLSearchParams,
): string {
  if (!rawSearchParams) return "/jurisprudencia";

  let searchParams: URLSearchParams;
  if (rawSearchParams instanceof URLSearchParams) {
    searchParams = rawSearchParams;
  } else {
    searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(rawSearchParams)) {
      if (typeof value === "string") {
        searchParams.set(key, value);
      } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
        searchParams.set(key, value[0]);
      }
    }
  }

  const validQuery = parseJurisprudencePublicSearchParameters(searchParams);
  if (!validQuery) return "/jurisprudencia";

  const serialized = serializeJurisprudencePublicSearchQuery(validQuery);
  return serialized ? `/jurisprudencia?${serialized}` : "/jurisprudencia";
}

export function JurisprudencePublicDetail({
  slug,
  searchGateway = unconfiguredJurisprudencePublicSearchGateway,
  getBySlugAction,
  rawSearchParams,
}: JurisprudencePublicDetailProps) {
  const returnUrl = getReturnUrl(rawSearchParams);
  const parsedSlug = jurisprudencePublicSlugSchema.safeParse(slug);

  const [state, setState] = useState<DetailUiState>(() => {
    if (!parsedSlug.success) {
      return {
        kind: "invalid_slug",
        message: "Identificador de resolución no válido. Verifique la dirección o realice una nueva búsqueda.",
      };
    }
    if (!getBySlugAction && searchGateway.kind === "not_configured") {
      return { kind: "not_configured" };
    }
    return { kind: "loading" };
  });

  const validatedSlug = parsedSlug.success ? parsedSlug.data : null;

  useEffect(() => {
    if (validatedSlug === null) return;
    if (!getBySlugAction && searchGateway.kind === "not_configured") {
      return;
    }

    let isMounted = true;
    setState({ kind: "loading" });

    const fetcher = getBySlugAction
      ? getBySlugAction(validatedSlug)
      : searchGateway.kind === "not_configured"
        ? getPublicJurisprudenceBySlugAction(validatedSlug)
        : searchGateway.getBySlug(validatedSlug);

    fetcher
      .then((response: JurisprudencePublicDetailResponse) => {
        if (!isMounted) return;
        switch (response.status) {
          case "success":
            setState({ kind: "success", item: response.item });
            break;
          case "not_found":
            setState({ kind: "not_found" });
            break;
          case "not_configured":
            setState({ kind: "not_configured" });
            break;
          case "error":
            setState({
              kind: "controlled_error",
              message: "No fue posible cargar el detalle de la resolución en este momento.",
            });
            break;
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setState({
          kind: "controlled_error",
          message: "No fue posible completar la consulta. Inténtelo nuevamente más tarde.",
        });
      });

    return () => {
      isMounted = false;
    };
  }, [validatedSlug, searchGateway, getBySlugAction]);

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="detail-title">
        <div className={styles.container}>
          <Link href={returnUrl} className={styles.backLink} aria-label="Volver a los resultados de búsqueda">
            ← Volver a la búsqueda
          </Link>
          <p>DETALLE JURISPRUDENCIAL</p>
          <h1 id="detail-title">
            {state.kind === "success" ? state.item.caseTitle : "Detalle jurisprudencial"}
          </h1>
          {state.kind === "success" ? (
            <h2>
              {state.item.institutionName} · {state.item.issuingBody}
            </h2>
          ) : (
            <h2>Ficha pública de resolución jurisprudencial incorporada al catálogo.</h2>
          )}
        </div>
      </section>

      <section className={styles.searchSection} aria-labelledby="detail-status-title">
        <div className={styles.container}>
          <div className={styles.searchIntro}>
            <p>INFORMACIÓN ESTRUCTURADA</p>
            <h2 id="detail-status-title">Ficha pública de resolución</h2>
            <span>
              La información mostrada proviene de registros previamente revisados y habilitados en el catálogo público.
            </span>
          </div>

          <div className={styles.searchStatus} aria-live="polite" aria-busy={state.kind === "loading"}>
            {state.kind === "loading" ? (
              <div role="status">
                <p>Cargando detalle de la resolución…</p>
              </div>
            ) : null}

            {state.kind === "invalid_slug" ? (
              <div role="alert">
                <strong>Identificador no válido</strong>
                <p>{state.message}</p>
              </div>
            ) : null}

            {state.kind === "not_found" ? (
              <div role="status">
                <strong>Resolución no encontrada</strong>
                <p>La resolución solicitada no existe o no se encuentra disponible en el catálogo público.</p>
              </div>
            ) : null}

            {state.kind === "not_configured" ? (
              <div role="status">
                <strong>Detalle público no disponible</strong>
                <p>
                  El catálogo jurisprudencial todavía no se encuentra habilitado para consultas públicas. Por ello, no existen resoluciones verificadas publicadas disponibles para consulta.
                </p>
              </div>
            ) : null}

            {state.kind === "controlled_error" ? (
              <div role="alert">
                <strong>Consulta no disponible</strong>
                <p>{state.message}</p>
              </div>
            ) : null}

            {state.kind === "success" ? (
              <article className={styles.detailArticle}>
                <dl className={styles.detailGrid}>
                  <div>
                    <dt>Expediente</dt>
                    <dd>{state.item.caseNumber}</dd>
                  </div>
                  <div>
                    <dt>Resolución</dt>
                    <dd>{state.item.resolutionNumber}</dd>
                  </div>
                  <div>
                    <dt>Tipo</dt>
                    <dd>{state.item.resolutionType}</dd>
                  </div>
                  <div>
                    <dt>Institución</dt>
                    <dd>{state.item.institutionName}</dd>
                  </div>
                  <div>
                    <dt>Órgano emisor</dt>
                    <dd>{state.item.issuingBody}</dd>
                  </div>
                  <div>
                    <dt>Materia</dt>
                    <dd>{state.item.matter}</dd>
                  </div>
                  <div>
                    <dt>Fecha de emisión</dt>
                    <dd>{state.item.issuedAt}</dd>
                  </div>
                  <div>
                    <dt>Identificador público (slug)</dt>
                    <dd>{state.item.slug}</dd>
                  </div>
                  <div>
                    <dt>Fuente pública</dt>
                    <dd>{state.item.sourceName}</dd>
                  </div>

                </dl>

                <div className={styles.detailSummary}>
                  <h3>Resumen estructurado</h3>
                  <p>{state.item.summary}</p>
                </div>

                {state.item.proceduralBackground && state.item.proceduralBackground.length > 0 && (
                  <div className={styles.detailSummary} style={{ marginTop: "2rem" }}>
                    <h3>Antecedentes procesales</h3>
                    <ul style={{ paddingLeft: "1.5rem", marginTop: "1rem" }}>
                      {state.item.proceduralBackground.map((item, index) => (
                        <li key={index} style={{ marginBottom: "0.5rem" }}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            ) : null}
          </div>

          <p className={styles.publicNotice}>
            La información mostrada tiene carácter informativo y depende de registros previamente
            revisados y habilitados. No sustituye asesoría jurídica ni acredita aplicabilidad automática.
          </p>
        </div>
      </section>
    </main>
  );
}
