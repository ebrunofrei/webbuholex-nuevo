// @vitest-environment jsdom

import React from "react";
import fs from "node:fs";
import path from "node:path";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JurisprudenceAnalysisPanel } from "@/components/jurisprudence/jurisprudence-analysis-panel";
import {
  JurisprudencePublicDetail,
  extractIntentAnalyze,
} from "@/components/jurisprudence/jurisprudence-public-detail";
import { buildLoginRedirect } from "@/lib/auth/return-to";
import type { JurisprudenceInterpretation } from "@/lib/hermes/contracts/jurisprudence-interpretation";

const validMockInterpretation: JurisprudenceInterpretation = {
  summary: "El Tribunal Constitucional declaró fundada la demanda de amparo laboral.",
  legalMatter: "Derecho al trabajo y protección contra el despido incausado",
  legalIssues: [
    "¿Se vulneró el derecho al debido proceso al despedir sin causa?",
    "¿Procede la reposición laboral directa?",
  ],
  ratioDecidendi: {
    status: "identified",
    text: "La desnaturalización de contratos modales genera relación laboral indeterminada.",
    support: [
      {
        quote: "El despido sin expresión de causa justa vulnera el contenido esencial del derecho al trabajo.",
        paragraphReference: "Fundamento 14",
        pageReference: "pág. 8",
      },
    ],
  },
  obiterDicta: [
    {
      text: "El empleador mantiene facultad directriz dentro del marco constitucional.",
      support: [
        {
          quote: "La facultad sancionadora debe ejercerse respetando el principio de proporcionalidad.",
          paragraphReference: "Fundamento 22",
          pageReference: "pág. 12",
        },
      ],
    },
  ],
  citedNorms: [
    {
      reference: "Artículo 22 de la Constitución Política del Perú",
      support: [
        {
          quote: "El trabajo es un deber y un derecho, base del bienestar social.",
          paragraphReference: "Fundamento 7",
          pageReference: null,
        },
      ],
    },
  ],
  citedPrecedents: [
    {
      reference: "STC Exp. 00206-2005-PA/TC (Precedente Baylón Flores)",
      support: [
        {
          quote: "La vía del amparo es idónea para despidos incausados y fraudulentos.",
          paragraphReference: "Fundamento 18",
          pageReference: "pág. 10",
        },
      ],
    },
  ],
  keyCriteria: [
    "Protección frente al despido incausado",
    "Eficacia horizontal de derechos fundamentales",
  ],
  scope: "Aplica a trabajadores del régimen laboral privado con contratos desnaturalizados.",
  limitations: "No aplicable a regímenes con protección indemnizatoria exclusiva.",
  citations: [
    {
      quote: "Corresponde ordenar la inmediata reincorporación del demandante a su puesto habitual.",
      paragraphReference: "Punto resolutivo 2",
      pageReference: "pág. 15",
    },
  ],
  verificationStatus: "machine_generated_unverified",
};

describe("HERMES-PROD-A2.6: JurisprudenceAnalysisPanel Suite", () => {
  const testSlug = "exp-00123-2024-aa-tc";
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // CASE 1: Anonymous valid detail renders "Analizar con Búho"
  it("CASE 1: Anonymous valid detail renders 'Analizar con Búho'", () => {
    render(<JurisprudenceAnalysisPanel slug={testSlug} isAuthenticated={false} />);
    expect(screen.getByText("Analizar con Búho")).toBeInTheDocument();
    expect(
      screen.getByText("Inicia sesión para generar un análisis jurídico estructurado."),
    ).toBeInTheDocument();
  });

  // CASE 2: Anonymous click uses correct buildLoginRedirect target and test seam
  it("CASE 2: Anonymous click uses correct buildLoginRedirect target: /jurisprudencia/<slug>?intent=analyze", () => {
    const expectedTarget = buildLoginRedirect(`/jurisprudencia/${testSlug}?intent=analyze`);
    const onNavigateSpy = vi.fn();

    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={false}
        onNavigate={onNavigateSpy}
      />,
    );

    const cta = screen.getByRole("button", { name: "Analizar con Búho" });
    expect(cta).toHaveAttribute("href", expectedTarget);

    const notPrevented = fireEvent.click(cta);
    expect(notPrevented).toBe(false); // preventDefault() was called
    expect(onNavigateSpy).toHaveBeenCalledTimes(1);
    expect(onNavigateSpy).toHaveBeenCalledWith(expectedTarget);
  });

  // CASE 2B: Without onNavigate test seam, native anchor href is preserved with zero imperative location.assign calls
  it("CASE 2B: Without onNavigate test seam, native anchor href is preserved with zero imperative location.assign calls", () => {
    const expectedTarget = buildLoginRedirect(`/jurisprudencia/${testSlug}?intent=analyze`);

    let assignSpy: ReturnType<typeof vi.fn> | null = null;
    try {
      assignSpy = vi.spyOn(window.location, "assign").mockImplementation(() => {});
    } catch {
      // non-configurable in some jsdom environments
    }

    render(<JurisprudenceAnalysisPanel slug={testSlug} isAuthenticated={false} />);

    const cta = screen.getByRole("button", { name: "Analizar con Búho" });
    expect(cta).toHaveAttribute("href", expectedTarget);

    const notPrevented = fireEvent.click(cta);
    // Proves native anchor is the single navigation owner and default is NOT prevented
    expect(notPrevented).toBe(true);

    if (assignSpy) {
      expect(assignSpy).not.toHaveBeenCalled();
    }

    // Statically proves no imperative location.assign call exists in the component
    const panelPath = path.join(
      process.cwd(),
      "components",
      "jurisprudence",
      "jurisprudence-analysis-panel.tsx",
    );
    const panelSource = fs.readFileSync(panelPath, "utf-8");
    expect(panelSource).not.toContain("location.assign");
  });

  // CASE 3: Redirect URL contains no recordId / recordVersion / canonicalId
  it("CASE 3: Redirect URL contains no recordId / recordVersion / canonicalId", () => {
    const redirectUrl = buildLoginRedirect(`/jurisprudencia/${testSlug}?intent=analyze`);
    expect(redirectUrl).not.toContain("recordId");
    expect(redirectUrl).not.toContain("recordVersion");
    expect(redirectUrl).not.toContain("canonicalId");
  });

  // CASE 4: Authenticated direct page renders analysis CTA
  it("CASE 4: Authenticated direct page renders analysis CTA", () => {
    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={false}
      />,
    );
    expect(screen.getByRole("button", { name: "Analizar con Búho" })).toBeInTheDocument();
  });

  // CASE 5: Authenticated direct click issues exactly one: POST /api/jurisprudence/interpret
  it("CASE 5: Authenticated direct click issues exactly one: POST /api/jurisprudence/interpret", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          data: { slug: testSlug, interpretation: validMockInterpretation },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Analizar con Búho" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/jurisprudence/interpret",
      expect.objectContaining({ method: "POST" }),
    );
  });

  // CASE 6: Request Content-Type = application/json
  it("CASE 6: Request Content-Type = application/json", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          data: { slug: testSlug, interpretation: validMockInterpretation },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Analizar con Búho" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const callArgs = fetchMock.mock.calls[0];
    if (!callArgs) throw new Error("fetch was not called");
    const options = callArgs[1];
    const headers = new Headers(options?.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  // CASE 7: Request body equals exactly: { slug }
  it("CASE 7: Request body equals exactly: { slug }", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          data: { slug: testSlug, interpretation: validMockInterpretation },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Analizar con Búho" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const callArgs = fetchMock.mock.calls[0];
    if (!callArgs) throw new Error("fetch was not called");
    const options = callArgs[1];
    const bodyStr = typeof options?.body === "string" ? options.body : "";
    const parsedBody = JSON.parse(bodyStr);
    expect(parsedBody).toEqual({ slug: testSlug });
  });

  // CASE 8: No canonical IDs in request body
  it("CASE 8: No canonical IDs in request body", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          data: { slug: testSlug, interpretation: validMockInterpretation },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Analizar con Búho" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const callArgs = fetchMock.mock.calls[0];
    if (!callArgs) throw new Error("fetch was not called");
    const options = callArgs[1];
    const rawBody = typeof options?.body === "string" ? options.body : "";
    expect(rawBody).not.toContain("recordId");
    expect(rawBody).not.toContain("recordVersion");
    expect(rawBody).not.toContain("canonicalId");
    const parsed = JSON.parse(rawBody);
    expect(Object.keys(parsed)).toEqual(["slug"]);
  });

  // CASE 9: Authenticated return with intent=analyze enters ready state
  it("CASE 9: Authenticated return with intent=analyze enters ready state", () => {
    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={true}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Iniciar análisis con Búho" }),
    ).toBeInTheDocument();
  });

  // CASE 10: intent=analyze causes ZERO fetch calls on mount
  it("CASE 10: intent=analyze causes ZERO fetch calls on mount", () => {
    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={true}
      />,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // CASE 11: URL intent cleanup preserves existing window.history.state
  it("CASE 11: URL intent cleanup preserves existing window.history.state", () => {
    const initialState = { frameworkMeta: "nextjs-preserved-key-123" };
    window.history.replaceState(initialState, "", `/jurisprudencia/${testSlug}?intent=analyze`);

    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={true}
      />,
    );

    expect(window.history.state).toEqual(initialState);
  });

  // CASE 12: URL cleanup removes intent=analyze
  it("CASE 12: URL cleanup removes intent=analyze", () => {
    window.history.replaceState(window.history.state, "", `/jurisprudencia/${testSlug}?intent=analyze`);

    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={true}
      />,
    );

    expect(window.location.search).not.toContain("intent=analyze");
    expect(window.location.pathname).toBe(`/jurisprudencia/${testSlug}`);
  });

  // CASE 13: URL cleanup does not itself submit
  it("CASE 13: URL cleanup does not itself submit", () => {
    window.history.replaceState(window.history.state, "", `/jurisprudencia/${testSlug}?intent=analyze`);

    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={true}
      />,
    );

    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  // CASE 14: Explicit "Iniciar análisis con Búho" from ready state performs one fetch
  it("CASE 14: Explicit 'Iniciar análisis con Búho' from ready state performs one fetch", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          data: { slug: testSlug, interpretation: validMockInterpretation },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={true}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Iniciar análisis con Búho" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  // CASE 15: Same-tick / rapid double submission produces exactly ONE fetch
  it("CASE 15: Same-tick / rapid double submission produces exactly ONE fetch", async () => {
    let resolveFetch: (val: Response) => void = () => {};
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={false}
      />,
    );

    const button = screen.getByRole("button", { name: "Analizar con Búho" });
    // Synchronous double click in same tick
    fireEvent.click(button);
    fireEvent.click(button);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFetch(
        new Response(
          JSON.stringify({
            ok: true,
            data: { slug: testSlug, interpretation: validMockInterpretation },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    });
  });

  // CASE 16: Submit control disabled while in-flight
  it("CASE 16: Submit control disabled while in-flight", async () => {
    let resolveFetch: (val: Response) => void = () => {};
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Analizar con Búho" }));

    const disabledBtn = await screen.findByRole("button", { name: "Analizando…" });
    expect(disabledBtn).toBeDisabled();

    await act(async () => {
      resolveFetch(
        new Response(
          JSON.stringify({
            ok: true,
            data: { slug: testSlug, interpretation: validMockInterpretation },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    });
  });

  // CASE 17: Unmount aborts active request
  it("CASE 17: Unmount aborts active request", async () => {
    let capturedSignal: AbortSignal | null | undefined;
    fetchMock.mockImplementationOnce((_input, init) => {
      capturedSignal = init?.signal;
      return new Promise<Response>(() => {}); // never resolves
    });

    const { unmount } = render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Analizar con Búho" }));

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal?.aborted).toBe(false);

    unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });

  // CASE 18: 200 success renders: summary, legalMatter, ratioDecidendi, keyCriteria, scope, limitations
  it("CASE 18: 200 success renders summary, legalMatter, ratioDecidendi, keyCriteria, scope, limitations", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          data: { slug: testSlug, interpretation: validMockInterpretation },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Analizar con Búho" }));

    expect(await screen.findByText(validMockInterpretation.summary)).toBeInTheDocument();
    expect(screen.getByText(validMockInterpretation.legalMatter)).toBeInTheDocument();
    const ratioText = validMockInterpretation.ratioDecidendi.text;
    if (!ratioText) throw new Error("ratio text is null");
    expect(screen.getByText(ratioText)).toBeInTheDocument();
    const firstCriterion = validMockInterpretation.keyCriteria[0];
    if (!firstCriterion) throw new Error("key criteria empty");
    expect(screen.getByText(firstCriterion)).toBeInTheDocument();
    expect(screen.getByText(validMockInterpretation.scope)).toBeInTheDocument();
    expect(screen.getByText(validMockInterpretation.limitations)).toBeInTheDocument();
  });

  // CASE 19: machine_generated_unverified warning is visible
  it("CASE 19: machine_generated_unverified warning is visible", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          data: { slug: testSlug, interpretation: validMockInterpretation },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Analizar con Búho" }));

    expect(
      await screen.findByText(/machine_generated_unverified/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No constituye asesoría jurídica ni opinión vinculante/),
    ).toBeInTheDocument();
  });

  // CASE 20: support quote rendered verbatim
  it("CASE 20: support quote rendered verbatim", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          data: { slug: testSlug, interpretation: validMockInterpretation },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Analizar con Búho" }));

    const firstSupport = validMockInterpretation.ratioDecidendi.support[0];
    if (!firstSupport) throw new Error("support quote not found");
    const expectedQuote = firstSupport.quote;
    expect(await screen.findByText(expectedQuote)).toBeInTheDocument();
  });

  // CASE 21: paragraphReference / pageReference rendered when present
  it("CASE 21: paragraphReference / pageReference rendered when present", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          data: { slug: testSlug, interpretation: validMockInterpretation },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Analizar con Búho" }));

    expect(await screen.findByText(/Fundamento 14/)).toBeInTheDocument();
    expect(screen.getByText(/pág\. 8/)).toBeInTheDocument();
  });

  // CASE 22: recordId absent from DOM
  it("CASE 22: recordId absent from DOM", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          data: { slug: testSlug, interpretation: validMockInterpretation },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { container } = render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Analizar con Búho" }));
    await screen.findByText(validMockInterpretation.summary);

    expect(container.innerHTML).not.toContain("recordId");
  });

  // CASE 23: recordVersion absent from DOM
  it("CASE 23: recordVersion absent from DOM", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          data: { slug: testSlug, interpretation: validMockInterpretation },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { container } = render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Analizar con Búho" }));
    await screen.findByText(validMockInterpretation.summary);

    expect(container.innerHTML).not.toContain("recordVersion");
  });

  // CASE 24: canonicalId absent from DOM
  it("CASE 24: canonicalId absent from DOM", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          data: { slug: testSlug, interpretation: validMockInterpretation },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { container } = render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Analizar con Búho" }));
    await screen.findByText(validMockInterpretation.summary);

    expect(container.innerHTML).not.toContain("canonicalId");
  });

  // CASE 25: 401 maps to login/session-expired UX
  it("CASE 25: 401 maps to login/session-expired UX", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: "authentication_required",
            message: "Debes iniciar sesión para utilizar esta función.",
          },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Analizar con Búho" }));

    expect(
      await screen.findByText("Tu sesión ha expirado o necesitas iniciar sesión para continuar."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeInTheDocument();
  });

  // CASE 26: 404 maps safely
  it("CASE 26: 404 maps safely", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: "jurisprudence_not_found",
            message: "No se encontró una resolución pública disponible para análisis.",
          },
        }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Analizar con Búho" }));

    expect(
      await screen.findByText(
        "Esta resolución no está disponible para análisis o no se encuentra publicada.",
      ),
    ).toBeInTheDocument();
  });

  // CASE 27: 422 grounding_failed maps safely
  it("CASE 27: 422 grounding_failed maps safely", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: "grounding_failed",
            message: "La interpretación no pudo ser respaldada con citas exactas del texto canónico.",
          },
        }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Analizar con Búho" }));

    expect(
      await screen.findByText(
        "El análisis no pudo ser contrastado con suficiente respaldo textual en la resolución. Por rigor jurídico, no se emite una interpretación no fundamentada.",
      ),
    ).toBeInTheDocument();
  });

  // CASE 28: 422 source_too_large maps safely
  it("CASE 28: 422 source_too_large maps safely", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: "source_too_large",
            message: "El texto canónico del registro supera el límite de procesamiento permitido.",
          },
        }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Analizar con Búho" }));

    expect(
      await screen.findByText(
        "La resolución excede la longitud máxima admitida para análisis directo.",
      ),
    ).toBeInTheDocument();
  });

  // CASE 29: 429 maps safely
  it("CASE 29: 429 maps safely", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: "rate_limited",
            message: "Ha excedido el límite de solicitudes.",
          },
        }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Analizar con Búho" }));

    expect(
      await screen.findByText(
        "Has alcanzado el límite de solicitudes. Espera antes de volver a intentarlo.",
      ),
    ).toBeInTheDocument();
  });

  // CASE 30: Retry-After countdown disables retry
  it("CASE 30: Retry-After countdown disables retry", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: false,
          error: { code: "rate_limited" },
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "retry-after": "10",
          },
        },
      ),
    );

    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Analizar con Búho" }));

    const retryBtn = await screen.findByRole("button", { name: /Espera \(10s\)/ });
    expect(retryBtn).toBeDisabled();
  });

  // CASE 31: Countdown reaching zero does NOT auto-submit
  it("CASE 31: Countdown reaching zero does NOT auto-submit", async () => {
    vi.useFakeTimers();

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: false,
          error: { code: "rate_limited" },
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "retry-after": "2",
          },
        },
      ),
    );

    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={false}
      />,
    );

    // Initial explicit click
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Analizar con Búho" }));
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Advance 3 seconds past countdown
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    // Verification: Zero auto-submit on countdown expiry
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Retry button is now enabled
    const retryBtn = screen.getByRole("button", { name: "Reintentar análisis" });
    expect(retryBtn).not.toBeDisabled();

    vi.useRealTimers();
  });

  // CASE 32: 502 provider_failure maps safely
  it("CASE 32: 502 provider_failure maps safely", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: "provider_failure",
            message: "El proveedor de análisis presentó una falla temporal.",
          },
        }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Analizar con Búho" }));

    expect(
      await screen.findByText(
        "El motor de análisis presentó una falla temporal. Inténtalo nuevamente en unos momentos.",
      ),
    ).toBeInTheDocument();
  });

  // CASE 33: 502 invalid_interpretation maps safely
  it("CASE 33: 502 invalid_interpretation maps safely", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: "invalid_interpretation",
            message: "La interpretación obtenida no cumple con la estructura esperada.",
          },
        }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Analizar con Búho" }));

    expect(
      await screen.findByText(
        "La respuesta generada no cumplió los requisitos de validación estructural.",
      ),
    ).toBeInTheDocument();
  });

  // CASE 34: 503 limiter_unavailable maps safely
  it("CASE 34: 503 limiter_unavailable maps safely", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: "limiter_unavailable",
            message: "El servicio de limitación de tasa no está disponible.",
          },
        }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Analizar con Búho" }));

    expect(
      await screen.findByText(
        "El servicio de análisis se encuentra temporalmente no disponible. Inténtalo nuevamente más tarde.",
      ),
    ).toBeInTheDocument();
  });

  // CASE 35: 500 generic maps safely
  it("CASE 35: 500 generic maps safely", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: "unexpected_internal_failure",
            message: "Ocurrió un error inesperado al procesar la solicitud.",
          },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Analizar con Búho" }));

    expect(
      await screen.findByText(
        "Ocurrió un error inesperado al procesar la resolución.",
      ),
    ).toBeInTheDocument();
  });

  // CASE 36: Network failure maps safely
  it("CASE 36: Network failure maps safely", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Failed to fetch / network drop"));

    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Analizar con Búho" }));

    expect(
      await screen.findByText(
        "No fue posible establecer conexión con el servicio de análisis. Inténtalo nuevamente más tarde.",
      ),
    ).toBeInTheDocument();
  });

  // CASE 37: Abort does not auto-retry
  it("CASE 37: Abort does not auto-retry", async () => {
    let capturedSignal: AbortSignal | null | undefined;
    fetchMock.mockImplementationOnce((_input, init) => {
      capturedSignal = init?.signal;
      return new Promise<Response>(() => {});
    });

    const { unmount } = render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Analizar con Búho" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    unmount();
    expect(capturedSignal?.aborted).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // CASE 38: No provider call occurs from useEffect
  it("CASE 38: No provider call occurs from useEffect", () => {
    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={true}
      />,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // CASE 39: No automatic call occurs on remount
  it("CASE 39: No automatic call occurs on remount", () => {
    const { unmount } = render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={true}
      />,
    );
    expect(fetchMock).not.toHaveBeenCalled();

    unmount();

    render(
      <JurisprudenceAnalysisPanel
        slug={testSlug}
        isAuthenticated={true}
        intentAnalyze={true}
      />,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // CASE 40: Public detail component still contains no direct fetch( call
  it("CASE 40: Public detail component still contains no direct fetch( call", () => {
    const publicDetailPath = path.join(
      process.cwd(),
      "components",
      "jurisprudence",
      "jurisprudence-public-detail.tsx",
    );
    const fileContent = fs.readFileSync(publicDetailPath, "utf-8");
    expect(fileContent).not.toMatch(/\bfetch\s*\(/);
  });

  describe("HERMES-PROD-A2.6A: Strict intent parsing and duplicate parameter rejection", () => {
    const mockDetailItem = {
      slug: testSlug,
      title: "Resolución de prueba",
      caseTitle: "Expediente de prueba laboral",
      caseNumber: "EXP-00123-2024-AA/TC",
      resolutionNumber: "RES-001",
      resolutionType: "Sentencia",
      institutionName: "Tribunal Constitucional",
      issuingBody: "Pleno",
      matter: "Constitucional",
      issuedAt: "2026-05-10",
      summary: "Resumen de prueba",
      sourceName: "Tribunal Constitucional",
      officialHtmlUrl: null,
      officialPdfUrl: null,
    };

    const successAction = async () => ({
      status: "success" as const,
      item: mockDetailItem,
    });

    // A. intent=["analyze"] => ready
    it("CASE 41 (A): intent=['analyze'] authorizes ready state", async () => {
      expect(extractIntentAnalyze({ intent: ["analyze"] })).toBe(true);

      render(
        <JurisprudencePublicDetail
          slug={testSlug}
          isAuthenticated={true}
          rawSearchParams={{ intent: ["analyze"] }}
          getBySlugAction={successAction}
        />,
      );

      expect(
        await screen.findByRole("button", { name: "Iniciar análisis con Búho" }),
      ).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(0);
    });

    // B. intent=["analyze", "analyze"] => NOT ready
    it("CASE 42 (B): intent=['analyze', 'analyze'] duplicate intent is rejected (NOT ready)", async () => {
      expect(extractIntentAnalyze({ intent: ["analyze", "analyze"] })).toBe(false);

      render(
        <JurisprudencePublicDetail
          slug={testSlug}
          isAuthenticated={true}
          rawSearchParams={{ intent: ["analyze", "analyze"] }}
          getBySlugAction={successAction}
        />,
      );

      await screen.findByText(mockDetailItem.caseTitle);
      expect(
        screen.queryByRole("button", { name: "Iniciar análisis con Búho" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Analizar con Búho" }),
      ).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(0);
    });

    // C. intent=["analyze", "compare"] => NOT ready
    it("CASE 43 (C): intent=['analyze', 'compare'] mixed intent is rejected (NOT ready)", async () => {
      expect(extractIntentAnalyze({ intent: ["analyze", "compare"] })).toBe(false);

      render(
        <JurisprudencePublicDetail
          slug={testSlug}
          isAuthenticated={true}
          rawSearchParams={{ intent: ["analyze", "compare"] }}
          getBySlugAction={successAction}
        />,
      );

      await screen.findByText(mockDetailItem.caseTitle);
      expect(
        screen.queryByRole("button", { name: "Iniciar análisis con Búho" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Analizar con Búho" }),
      ).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(0);
    });

    // D. intent=["compare", "analyze"] => NOT ready
    it("CASE 44 (D): intent=['compare', 'analyze'] inverted mixed intent is rejected (NOT ready)", async () => {
      expect(extractIntentAnalyze({ intent: ["compare", "analyze"] })).toBe(false);

      render(
        <JurisprudencePublicDetail
          slug={testSlug}
          isAuthenticated={true}
          rawSearchParams={{ intent: ["compare", "analyze"] }}
          getBySlugAction={successAction}
        />,
      );

      await screen.findByText(mockDetailItem.caseTitle);
      expect(
        screen.queryByRole("button", { name: "Iniciar análisis con Búho" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Analizar con Búho" }),
      ).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(0);
    });

    // E. No fetch occurs for any rejected duplicate/mixed intent case
    it("CASE 45 (E): No fetch occurs for rejected duplicate/mixed intent cases", async () => {
      const rejectedCases: Array<Record<string, string[]>> = [
        { intent: ["analyze", "analyze"] },
        { intent: ["analyze", "compare"] },
        { intent: ["compare", "analyze"] },
        { intent: ["analyze", "analyze", "analyze"] },
        { intent: ["unsupported"] },
      ];

      for (const rawSearchParams of rejectedCases) {
        expect(extractIntentAnalyze(rawSearchParams)).toBe(false);

        const { unmount } = render(
          <JurisprudencePublicDetail
            slug={testSlug}
            isAuthenticated={true}
            rawSearchParams={rawSearchParams}
            getBySlugAction={successAction}
          />,
        );

        await screen.findByText(mockDetailItem.caseTitle);
        expect(fetchMock).toHaveBeenCalledTimes(0);
        unmount();
      }

      expect(fetchMock).toHaveBeenCalledTimes(0);
    });

    it("CASE 46: URLSearchParams duplicate intent is strictly rejected", async () => {
      const duplicateParams = new URLSearchParams("intent=analyze&intent=analyze");
      expect(extractIntentAnalyze(duplicateParams)).toBe(false);

      const mixedParams = new URLSearchParams("intent=analyze&intent=compare");
      expect(extractIntentAnalyze(mixedParams)).toBe(false);

      const validParams = new URLSearchParams("intent=analyze");
      expect(extractIntentAnalyze(validParams)).toBe(true);
    });
  });

  describe("HERMES-PROD-A3.6B-R1: Client Idempotency Key Invariants", () => {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    it("explicit Analyze click creates one key and request contains canonical Idempotency-Key header", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          ok: true,
          data: {
            slug: testSlug,
            interpretation: validMockInterpretation,
          },
        }),
      } as Response);

      render(<JurisprudenceAnalysisPanel slug={testSlug} isAuthenticated={true} />);

      const button = screen.getByRole("button", { name: "Analizar con Búho" });
      fireEvent.click(button);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      const callArgs = fetchMock.mock.calls[0];
      const headers = callArgs?.[1]?.headers as Record<string, string>;
      expect(headers).toBeDefined();
      expect(headers["Idempotency-Key"]).toBeDefined();
      expect(headers["Idempotency-Key"]).toMatch(UUID_REGEX);
    });

    it("same logical request retry reuses key", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          headers: new Headers(),
          json: async () => ({
            ok: false,
            error: { code: "internal_error" },
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({
            ok: true,
            data: {
              slug: testSlug,
              interpretation: validMockInterpretation,
            },
          }),
        } as Response);

      render(<JurisprudenceAnalysisPanel slug={testSlug} isAuthenticated={true} />);

      // First explicit click
      const analyzeBtn = screen.getByRole("button", { name: "Analizar con Búho" });
      fireEvent.click(analyzeBtn);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Reintentar análisis" })).toBeInTheDocument();
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const firstHeaders = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
      const firstKey = firstHeaders["Idempotency-Key"];
      expect(firstKey).toMatch(UUID_REGEX);

      // Retry same logical action
      const retryBtn = screen.getByRole("button", { name: "Reintentar análisis" });
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(2);
      });

      const secondHeaders = fetchMock.mock.calls[1]?.[1]?.headers as Record<string, string>;
      const secondKey = secondHeaders["Idempotency-Key"];
      expect(secondKey).toBe(firstKey);
    });

    it("second explicit Analyze action receives a new key", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({
            ok: true,
            data: {
              slug: testSlug,
              interpretation: validMockInterpretation,
            },
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({
            ok: true,
            data: {
              slug: testSlug,
              interpretation: validMockInterpretation,
            },
          }),
        } as Response);

      render(<JurisprudenceAnalysisPanel slug={testSlug} isAuthenticated={true} />);

      // First action
      const analyzeBtn = screen.getByRole("button", { name: "Analizar con Búho" });
      fireEvent.click(analyzeBtn);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Volver a analizar" })).toBeInTheDocument();
      });

      const firstHeaders = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
      const firstKey = firstHeaders["Idempotency-Key"];

      // Second explicit action
      const reanalyzeBtn = screen.getByRole("button", { name: "Volver a analizar" });
      fireEvent.click(reanalyzeBtn);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(2);
      });

      const secondHeaders = fetchMock.mock.calls[1]?.[1]?.headers as Record<string, string>;
      const secondKey = secondHeaders["Idempotency-Key"];

      expect(secondKey).toMatch(UUID_REGEX);
      expect(secondKey).not.toBe(firstKey);
    });

    it("rerender does not generate dispatch or key", () => {
      const { rerender } = render(
        <JurisprudenceAnalysisPanel slug={testSlug} isAuthenticated={true} />,
      );

      rerender(<JurisprudenceAnalysisPanel slug={testSlug} isAuthenticated={true} />);
      rerender(<JurisprudenceAnalysisPanel slug={testSlug} isAuthenticated={true} />);

      expect(fetchMock).toHaveBeenCalledTimes(0);
    });

    it("double-click/inFlight protection still prevents duplicate action dispatch", async () => {
      let resolveFetch!: (res: Response) => void;
      const fetchPromise = new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });

      fetchMock.mockReturnValue(fetchPromise);

      render(<JurisprudenceAnalysisPanel slug={testSlug} isAuthenticated={true} />);

      const button = screen.getByRole("button", { name: "Analizar con Búho" });
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Resolve the in-flight fetch
      await act(async () => {
        resolveFetch({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({
            ok: true,
            data: {
              slug: testSlug,
              interpretation: validMockInterpretation,
            },
          }),
        } as Response);
      });
    });

    it("anonymous auth redirect intent behavior from A2.6 is preserved", () => {
      const onNavigateSpy = vi.fn();
      render(
        <JurisprudenceAnalysisPanel
          slug={testSlug}
          isAuthenticated={false}
          onNavigate={onNavigateSpy}
        />,
      );

      const cta = screen.getByRole("button", { name: "Analizar con Búho" });
      fireEvent.click(cta);

      expect(onNavigateSpy).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(0);
    });
  });
});
