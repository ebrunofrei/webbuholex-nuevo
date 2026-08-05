"use client";

import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import Link from "next/link";
import {
  parseJurisprudencePublicSearchParameters,
  serializeJurisprudencePublicSearchQuery,
} from "@/lib/jurisprudence-public-search-gateway";
import {
  jurisprudencePublicSearchQuerySchema,
  jurisprudencePublicSlugSchema,
} from "@/lib/schemas/jurisprudence-public-search-gateway";
import { unconfiguredJurisprudencePublicSearchGateway } from "@/lib/unconfigured-jurisprudence-public-search-gateway";
import type {
  JurisprudencePublicSearchGateway,
  JurisprudencePublicSearchQuery,
  JurisprudencePublicSearchResponse,
  JurisprudencePublicSearchSort,
} from "@/types/jurisprudence-public-search-gateway";
import styles from "./jurisprudence.module.css";

export type JurisprudencePublicSearchAction = (
  query: JurisprudencePublicSearchQuery,
) => Promise<JurisprudencePublicSearchResponse>;

type FormState = {
  text: string;
  institutionName: string;
  issuingBody: string;
  matter: string;
  resolutionType: string;
  caseNumber: string;
  resolutionNumber: string;
  issuedFrom: string;
  issuedTo: string;
  sort: JurisprudencePublicSearchSort;
};

type TextFormField = Exclude<keyof FormState, "sort">;
type UiState =
  | { readonly kind: "initial" }
  | { readonly kind: "loading" }
  | { readonly kind: "response"; readonly response: JurisprudencePublicSearchResponse }
  | { readonly kind: "invalid"; readonly message: string };

const emptyForm: FormState = {
  text: "",
  institutionName: "",
  issuingBody: "",
  matter: "",
  resolutionType: "",
  caseNumber: "",
  resolutionNumber: "",
  issuedFrom: "",
  issuedTo: "",
  sort: "relevance",
};

const notConfiguredResponse: JurisprudencePublicSearchResponse = {
  status: "not_configured",
  message: "El buscador jurisprudencial todavía no se encuentra habilitado para consultas públicas.",
};

export function JurisprudencePublicSearch({
  gateway = unconfiguredJurisprudencePublicSearchGateway,
  searchAction,
}: {
  readonly gateway?: JurisprudencePublicSearchGateway;
  readonly searchAction?: JurisprudencePublicSearchAction | undefined;
}) {
  const [form, setForm] = useState(emptyForm);
  const [state, setState] = useState<UiState>(
    !searchAction && gateway.kind === "not_configured"
      ? { kind: "response", response: notConfiguredResponse }
      : { kind: "initial" },
  );

  const updateTextField = (field: TextFormField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateSort = (value: string) => {
    switch (value) {
      case "relevance":
      case "issued_desc":
      case "issued_asc":
      case "title_asc":
        setForm((current) => ({ ...current, sort: value }));
        break;
    }
  };

  const buildQuery = useCallback((page: number, currentForm: FormState = form) =>
    jurisprudencePublicSearchQuerySchema.safeParse({
      ...(currentForm.text.trim() ? { text: currentForm.text } : {}),
      filters: {
        ...(currentForm.institutionName.trim() ? { institutionName: currentForm.institutionName } : {}),
        ...(currentForm.issuingBody.trim() ? { issuingBody: currentForm.issuingBody } : {}),
        ...(currentForm.matter.trim() ? { matter: currentForm.matter } : {}),
        ...(currentForm.resolutionType.trim() ? { resolutionType: currentForm.resolutionType } : {}),
        ...(currentForm.caseNumber.trim() ? { caseNumber: currentForm.caseNumber } : {}),
        ...(currentForm.resolutionNumber.trim() ? { resolutionNumber: currentForm.resolutionNumber } : {}),
        ...(currentForm.issuedFrom ? { issuedFrom: currentForm.issuedFrom } : {}),
        ...(currentForm.issuedTo ? { issuedTo: currentForm.issuedTo } : {}),
      },
      sort: currentForm.sort,
      page,
      pageSize: 10,
    }), [form]);

  const runSearch = useCallback(async (page: number, currentForm: FormState = form, isInitial: boolean = false) => {
    const parsed = buildQuery(page, currentForm);
    if (!parsed.success) {
      setState({
        kind: "invalid",
        message: parsed.error.issues[0]?.message ?? "Revise los criterios de búsqueda.",
      });
      return;
    }

    if (!searchAction && gateway.kind === "not_configured") {
      setState({ kind: "response", response: notConfiguredResponse });
      const serialized = serializeJurisprudencePublicSearchQuery(parsed.data);
      if (!isInitial || window.location.search) {
        window.history.replaceState(
          null,
          "",
          serialized ? `/jurisprudencia?${serialized}` : "/jurisprudencia",
        );
      }
      return;
    }

    setState({ kind: "loading" });
    try {
      const response = searchAction
        ? await searchAction(parsed.data)
        : await gateway.search(parsed.data);
      setState({ kind: "response", response });
      const serialized = serializeJurisprudencePublicSearchQuery(parsed.data);
      if (!isInitial || window.location.search) {
        window.history.replaceState(
          null,
          "",
          serialized ? `/jurisprudencia?${serialized}` : "/jurisprudencia",
        );
      }
    } catch {
      setState({
        kind: "response",
        response: {
          status: "error",
          message: "No fue posible completar la consulta. Inténtelo nuevamente más tarde.",
        },
      });
    }
  }, [buildQuery, searchAction, gateway, form]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runSearch(1);
  };

  const initialSearchDone = useRef(false);

  useEffect(() => {
    if (initialSearchDone.current) return;
    initialSearchDone.current = true;

    if (!searchAction) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const parsedParams = parseJurisprudencePublicSearchParameters(params);

    let initialForm = emptyForm;
    let initialPage = 1;

    if (parsedParams) {
      initialForm = {
        text: parsedParams.text ?? "",
        institutionName: parsedParams.filters?.institutionName ?? "",
        issuingBody: parsedParams.filters?.issuingBody ?? "",
        matter: parsedParams.filters?.matter ?? "",
        resolutionType: parsedParams.filters?.resolutionType ?? "",
        caseNumber: parsedParams.filters?.caseNumber ?? "",
        resolutionNumber: parsedParams.filters?.resolutionNumber ?? "",
        issuedFrom: parsedParams.filters?.issuedFrom ?? "",
        issuedTo: parsedParams.filters?.issuedTo ?? "",
        sort: parsedParams.sort ?? "relevance",
      };
      initialPage = parsedParams.page ?? 1;
      setForm(initialForm);
    }

    void runSearch(initialPage, initialForm, true);
  }, [gateway.kind, searchAction, runSearch]);

  const isSearchUnavailable = !searchAction && gateway.kind === "not_configured";

  const page =
    state.kind === "response" &&
      (state.response.status === "success" || state.response.status === "empty")
      ? state.response.page
      : null;

  return (
    <section id="buscar" className={styles.catalogSection} aria-labelledby="search-title">
      <div className={styles.container}>
        <div className={styles.catalogHeader}>
          <div className={styles.catalogIntro}>
            <p>CONSULTA ESTRUCTURADA</p>
            <h2 id="search-title">Busque por texto o criterios públicos</h2>
            <span>
              Use solo datos generales del asunto. No incluya nombres, documentos de identidad ni
              información sensible.
            </span>
          </div>

          <form className={styles.catalogForm} onSubmit={submitSearch} noValidate>
            <div className={styles.catalogFormRow}>
              <div>
                <label htmlFor="jurisprudence-query">Problema jurídico</label>
                <span id="jurisprudence-query-help">
                  Puede buscar por título, materia o número de expediente. Máximo 160 caracteres.
                </span>
                <input
                  id="jurisprudence-query"
                  aria-describedby="jurisprudence-query-help jurisprudence-query-error"
                  maxLength={160}
                  value={form.text}
                  onChange={(event) => updateTextField("text", event.target.value)}
                  placeholder="Ejemplo: responsabilidad civil contractual"
                />
              </div>
              <button
                type="submit"
                disabled={state.kind === "loading" || isSearchUnavailable}
                aria-disabled={isSearchUnavailable ? "true" : undefined}
              >
                {isSearchUnavailable ? "BÚSQUEDA EN PREPARACIÓN" : "BUSCAR"}
              </button>
            </div>

            {state.kind === "invalid" ? (
              <p id="jurisprudence-query-error" className={styles.errorMessage} role="alert">
                {state.message}
              </p>
            ) : (
              <span id="jurisprudence-query-error" className="sr-only">
                Sin errores de validación.
              </span>
            )}

            <details className={styles.catalogFilters}>
              <summary>Mostrar filtros</summary>
              <div className={styles.catalogFilterGrid}>
                <label>Institución<input value={form.institutionName} onChange={(event) => updateTextField("institutionName", event.target.value)} maxLength={240} /></label>
                <label>Órgano emisor<input value={form.issuingBody} onChange={(event) => updateTextField("issuingBody", event.target.value)} maxLength={240} /></label>
                <label>Materia<input value={form.matter} onChange={(event) => updateTextField("matter", event.target.value)} maxLength={240} /></label>
                <label>Tipo de resolución<input value={form.resolutionType} onChange={(event) => updateTextField("resolutionType", event.target.value)} maxLength={240} /></label>
                <label>Número de expediente<input value={form.caseNumber} onChange={(event) => updateTextField("caseNumber", event.target.value)} maxLength={240} /></label>
                <label>Número de resolución<input value={form.resolutionNumber} onChange={(event) => updateTextField("resolutionNumber", event.target.value)} maxLength={240} /></label>
                <label>Fecha desde<input type="date" value={form.issuedFrom} onChange={(event) => updateTextField("issuedFrom", event.target.value)} /></label>
                <label>Fecha hasta<input type="date" value={form.issuedTo} onChange={(event) => updateTextField("issuedTo", event.target.value)} /></label>
              </div>
            </details>

            <label className={styles.catalogSort} htmlFor="jurisprudence-sort">
              Ordenar por
              <select id="jurisprudence-sort" value={form.sort} onChange={(event) => updateSort(event.target.value)}>
                <option value="relevance">Relevancia</option>
                <option value="issued_desc">Fecha: más recientes</option>
                <option value="issued_asc">Fecha: más antiguas</option>
                <option value="title_asc">Título: A–Z</option>
              </select>
            </label>
          </form>
        </div>

        <div className={styles.catalogResults} aria-live="polite" aria-busy={state.kind === "loading"}>
          {state.kind === "initial" ? <p>Ingrese criterios y seleccione “Buscar” para iniciar una consulta.</p> : null}
          {state.kind === "loading" ? <p role="status">Buscando resoluciones disponibles…</p> : null}
          {state.kind === "invalid" ? <p>La consulta no pudo procesarse. Revise los campos señalados.</p> : null}
          {state.kind === "response" && state.response.status === "not_configured" ? (
            <div role="status"><strong>Búsqueda pública no disponible</strong><p>El buscador jurisprudencial todavía no se encuentra habilitado para consultas públicas. Por ello, no existen resoluciones verificadas publicadas disponibles para consulta.</p></div>
          ) : null}
          {state.kind === "response" && state.response.status === "error" ? (
            <div role="alert"><strong>Consulta no disponible</strong><p>{state.response.message}</p></div>
          ) : null}
          {state.kind === "response" && state.response.status === "invalid_query" ? (
            <div role="alert"><strong>Revise la consulta</strong><p>{state.response.message}</p></div>
          ) : null}
          {page && page.total === 0 ? (
            <div role="status"><strong>Sin resultados</strong><p>No encontramos resoluciones que coincidan con los criterios ingresados.</p></div>
          ) : null}
          {page && page.total > 0 ? (
            <>
              <p role="status">{page.total} {page.total === 1 ? "resultado" : "resultados"}</p>
              <ol className={styles.catalogList}>
                {page.items.map((item) => {
                  const isSlugValid = jurisprudencePublicSlugSchema.safeParse(item.slug).success;
                  const parsedQuery = buildQuery(page.page);
                  const serializedQuery = parsedQuery.success
                    ? serializeJurisprudencePublicSearchQuery(parsedQuery.data)
                    : "";
                  const detailUrl = isSlugValid
                    ? `/jurisprudencia/${item.slug}${serializedQuery ? `?${serializedQuery}` : ""}`
                    : null;

                  return (
                    <li key={item.slug}>
                      <article className={styles.catalogCard}>
                        <p className={styles.catalogCardMeta}>{item.institutionName} · {item.issuingBody}</p>
                        <h3>
                          {detailUrl !== null ? (
                            <Link href={detailUrl}>{item.title}</Link>
                          ) : (
                            item.title
                          )}
                        </h3>
                        <dl className={styles.catalogCardDl}>
                          <div><dt>Expediente</dt><dd>{item.caseNumber}</dd></div>
                          <div><dt>Materia</dt><dd>{item.matter}</dd></div>
                          <div><dt>Fecha</dt><dd>{item.issuedAt}</dd></div>
                        </dl>
                        <p className={styles.catalogCardSummary}>{item.summary}</p>
                        <small className={styles.catalogCardSource}>Fuente: {item.sourceName}</small>
                        {detailUrl !== null ? (
                          <div style={{ marginTop: '16px' }}>
                            <Link href={detailUrl} className={styles.catalogCardAction} aria-label={`Ver ficha de ${item.title}`}>
                              VER FICHA COMPLETA
                            </Link>
                          </div>
                        ) : null}
                      </article>
                    </li>
                  );
                })}
              </ol>
              <nav className={styles.pagination} aria-label="Paginación de resultados">
                <button type="button" disabled={page.page <= 1} onClick={() => void runSearch(page.page - 1)}>Página anterior</button>
                <span>Página {page.page} de {page.totalPages}</span>
                <button type="button" disabled={page.page >= page.totalPages} onClick={() => void runSearch(page.page + 1)}>Página siguiente</button>
              </nav>
            </>
          ) : null}
        </div>

        <p className={styles.catalogNotice}>
          La información mostrada tiene carácter informativo y depende de registros previamente
          revisados y habilitados. No sustituye asesoría jurídica ni acredita aplicabilidad automática.
        </p>
      </div>
    </section>
  );
}
