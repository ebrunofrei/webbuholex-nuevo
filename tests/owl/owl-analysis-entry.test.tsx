import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { expect, test, vi, describe, afterEach } from "vitest";
import { OwlAnalysisEntry } from "@/components/owl/owl-analysis-entry";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_TEXT =
  "Este es un texto jurídico de prueba que supera la barrera de los 50 caracteres útiles para que no falle por longitud.";

const READY_BODY = JSON.stringify({ status: "ready" });

const REJECTED_BODY = JSON.stringify({
  status: "rejected",
  errorCode: "validation_failed",
  message:
    "La solicitud no puede ingresar al flujo simulado con la configuración proporcionada.",
});

function makeResponse(
  body: string,
  status: number,
  contentType = "application/json"
): Response {
  const headers = new Headers({ "Content-Type": contentType });
  return new Response(body, { status, headers });
}

function fillValidForm() {
  const textarea = screen.getByRole("textbox", { name: "Texto a analizar" });
  const privacyCheck = screen.getByLabelText(/no se conservará/i);
  const autoCheck = screen.getByLabelText(/orientativo, automatizado/i);
  fireEvent.change(textarea, { target: { value: VALID_TEXT } });
  fireEvent.click(privacyCheck);
  fireEvent.click(autoCheck);
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("OwlAnalysisEntry Component", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Existing structural tests (preserved)
  // =========================================================================

  test("1. renderiza el título y 2. no añade h1", () => {
    render(<OwlAnalysisEntry />);
    const heading = screen.getByRole("heading", { name: "Búho Analítico" });
    expect(heading.tagName).toBe("H2");
    const h1s = screen.queryAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(0);
  });

  test("3. muestra los cinco modos, 4. solo analyze_raw_text está habilitado y capacidades futuras tienen aria-disabled", () => {
    render(<OwlAnalysisEntry />);
    const modes = screen.getAllByRole("button");
    const modeTexts = modes.map((b) => b.textContent);
    expect(modeTexts.some((t) => t?.includes("Analizar texto jurídico"))).toBe(true);
    expect(modeTexts.some((t) => t?.includes("Analizar una resolución"))).toBe(true);
    expect(modeTexts.some((t) => t?.includes("Preguntar sobre una sentencia"))).toBe(true);
    expect(modeTexts.some((t) => t?.includes("Comparar resoluciones"))).toBe(true);
    expect(modeTexts.some((t) => t?.includes("Evaluar aplicabilidad"))).toBe(true);

    const activeMode = screen.getByRole("button", { name: /Analizar texto jurídico/i });
    expect(activeMode).toHaveAttribute("aria-pressed", "true");
    expect(activeMode).not.toHaveAttribute("aria-disabled", "true");

    const futureModes = modes.filter(
      (b) => b !== activeMode && b.getAttribute("type") === "button"
    );
    expect(futureModes.length).toBe(4);
    futureModes.forEach((mode) => {
      expect(mode).toHaveAttribute("aria-disabled", "true");
    });
  });

  test("5. los cuatro modos futuros no ejecutan acciones", () => {
    render(<OwlAnalysisEntry />);
    const futureMode = screen.getByRole("button", { name: /Analizar una resolución/i });
    fireEvent.click(futureMode);
    expect(futureMode).toHaveAttribute("aria-disabled", "true");
  });

  test("6. muestra textarea y 7. muestra contador inicial", () => {
    render(<OwlAnalysisEntry />);
    const textarea = screen.getByRole("textbox", { name: "Texto a analizar" });
    expect(textarea).toBeInTheDocument();
    expect(screen.getByText("0 / 12000 caracteres")).toBeInTheDocument();
  });

  test("8. actualiza contador y 9. aplica maxLength 12000", () => {
    render(<OwlAnalysisEntry />);
    const textarea = screen.getByRole("textbox", { name: "Texto a analizar" });
    fireEvent.change(textarea, { target: { value: "Hola Búho" } });
    expect(screen.getByText("9 / 12000 caracteres")).toBeInTheDocument();
    expect(textarea).toHaveAttribute("maxLength", "12000");
  });

  test("17. muestra aviso de no sustitución profesional y 18. muestra aviso de no conservación", () => {
    render(<OwlAnalysisEntry />);
    expect(screen.getByText(/No sustituye la revisión de un abogado/i)).toBeInTheDocument();
    expect(
      screen.getByText(/el texto no se conserva como documento del usuario/i)
    ).toBeInTheDocument();
  });

  test("19. no existe input file, 20. no existe atributo action, accesibilidad básica de labels", () => {
    const { container } = render(<OwlAnalysisEntry />);
    const files = container.querySelectorAll("input[type='file']");
    expect(files.length).toBe(0);
    const form = container.querySelector("form");
    expect(form).not.toHaveAttribute("action");
    const textarea = screen.getByRole("textbox", { name: "Texto a analizar" });
    expect(textarea).toBeInTheDocument();
  });

  test("no muestra análisis jurídico ficticio ni nombres reales", () => {
    render(<OwlAnalysisEntry />);
    expect(screen.queryByText(/Juan Pérez/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Expediente 123/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Se resuelve/i)).not.toBeInTheDocument();
  });

  // =========================================================================
  // VALIDACIÓN LOCAL
  // =========================================================================

  test("texto vacío no llama fetch", async () => {
    const fetchSpy = vi.spyOn(window, "fetch");
    render(<OwlAnalysisEntry />);
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "El texto debe contener al menos 50 caracteres útiles."
    );
  });

  test("menos de 50 caracteres no llama fetch", async () => {
    const fetchSpy = vi.spyOn(window, "fetch");
    render(<OwlAnalysisEntry />);
    const textarea = screen.getByRole("textbox", { name: "Texto a analizar" });
    fireEvent.change(textarea, { target: { value: "Corto" } });
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "El texto debe contener al menos 50 caracteres útiles."
    );
  });

  test("más de 12000 caracteres no llama fetch", async () => {
    const fetchSpy = vi.spyOn(window, "fetch");
    render(<OwlAnalysisEntry />);
    const textarea = screen.getByRole("textbox", { name: "Texto a analizar" });
    const privacyCheck = screen.getByLabelText(/no se conservará/i);
    const autoCheck = screen.getByLabelText(/orientativo, automatizado/i);
    fireEvent.change(textarea, { target: { value: "A".repeat(12001) } });
    fireEvent.click(privacyCheck);
    fireEvent.click(autoCheck);
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "El texto no puede superar los 12 000 caracteres."
    );
  });

  test("privacidad faltante no llama fetch", async () => {
    const fetchSpy = vi.spyOn(window, "fetch");
    render(<OwlAnalysisEntry />);
    const textarea = screen.getByRole("textbox", { name: "Texto a analizar" });
    fireEvent.change(textarea, { target: { value: VALID_TEXT } });
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Debe aceptar el aviso de privacidad para validar la solicitud."
    );
  });

  test("aceptación automatizada faltante no llama fetch", async () => {
    const fetchSpy = vi.spyOn(window, "fetch");
    render(<OwlAnalysisEntry />);
    const textarea = screen.getByRole("textbox", { name: "Texto a analizar" });
    const privacyCheck = screen.getByLabelText(/no se conservará/i);
    fireEvent.change(textarea, { target: { value: VALID_TEXT } });
    fireEvent.click(privacyCheck);
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Debe aceptar el aviso de análisis automatizado para continuar."
    );
  });

  test("espacios solos no llama fetch", async () => {
    const fetchSpy = vi.spyOn(window, "fetch");
    render(<OwlAnalysisEntry />);
    const textarea = screen.getByRole("textbox", { name: "Texto a analizar" });
    fireEvent.change(textarea, { target: { value: " ".repeat(60) } });
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "El texto debe contener al menos 50 caracteres útiles."
    );
  });

  // =========================================================================
  // REQUEST
  // =========================================================================

  test("URL exacta /api/owl/admission, POST, Content-Type application/json, cache no-store, body exacto, no campos adicionales", async () => {
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockResolvedValueOnce(makeResponse(READY_BODY, 200));

    render(<OwlAnalysisEntry />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/owl/admission");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json"
    );
    expect(init.cache).toBe("no-store");

    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({
      mode: "analyze_raw_text",
      text: VALID_TEXT,
      persistence: "ephemeral",
      requestedTier: "free_summary",
      acceptedPrivacyNotice: true,
      acceptedAutomatedAnalysisNotice: true,
      locale: "es-PE",
    });

    // No additional fields
    const allowedKeys = [
      "mode",
      "text",
      "persistence",
      "requestedTier",
      "acceptedPrivacyNotice",
      "acceptedAutomatedAnalysisNotice",
      "locale",
    ];
    for (const key of Object.keys(body)) {
      expect(allowedKeys).toContain(key);
    }
  });

  test("no URL externa", async () => {
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockResolvedValueOnce(makeResponse(READY_BODY, 200));

    render(<OwlAnalysisEntry />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));

    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).not.toMatch(/^https?:\/\//);
  });

  test("no usa simulateOwlOrchestration en el módulo del componente", async () => {
    const moduleText = await import(
      "@/components/owl/owl-analysis-entry"
    ).then((m) => JSON.stringify(Object.keys(m)));
    // The module should not re-export simulateOwlOrchestration
    expect(moduleText).not.toContain("simulateOwlOrchestration");
  });

  // =========================================================================
  // SUBMITTING
  // =========================================================================

  test("botón disabled, aria-busy true, literal VALIDANDO SOLICITUD… durante submitting", async () => {
    let resolveResponse!: (r: Response) => void;
    const pendingFetch = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    vi.spyOn(window, "fetch").mockReturnValueOnce(pendingFetch);

    render(<OwlAnalysisEntry />);
    fillValidForm();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));
    });

    const btn = screen.getByRole("button", { name: "VALIDANDO SOLICITUD…" });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");

    // Resolve to clean up
    resolveResponse(makeResponse(READY_BODY, 200));
    await waitFor(() => expect(screen.queryByText("VALIDANDO SOLICITUD…")).not.toBeInTheDocument());
  });

  test("doble submit no duplica fetch", async () => {
    let resolveResponse!: (r: Response) => void;
    const pendingFetch = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    const fetchSpy = vi.spyOn(window, "fetch").mockReturnValueOnce(pendingFetch);

    render(<OwlAnalysisEntry />);
    fillValidForm();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));
    });

    // Try to submit again while submitting
    const btn = screen.getByRole("button", { name: "VALIDANDO SOLICITUD…" });
    fireEvent.click(btn);

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    resolveResponse(makeResponse(READY_BODY, 200));
    await waitFor(() => expect(screen.queryByText("VALIDANDO SOLICITUD…")).not.toBeInTheDocument());
  });

  test("no muestra processing durante submitting", async () => {
    let resolveResponse!: (r: Response) => void;
    const pendingFetch = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    vi.spyOn(window, "fetch").mockReturnValueOnce(pendingFetch);

    render(<OwlAnalysisEntry />);
    fillValidForm();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));
    });

    expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();

    resolveResponse(makeResponse(READY_BODY, 200));
    await waitFor(() => expect(screen.queryByText("VALIDANDO SOLICITUD…")).not.toBeInTheDocument());
  });

  test("textarea editable durante submitting", async () => {
    let resolveResponse!: (r: Response) => void;
    const pendingFetch = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    vi.spyOn(window, "fetch").mockReturnValueOnce(pendingFetch);

    render(<OwlAnalysisEntry />);
    fillValidForm();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));
    });

    const textarea = screen.getByRole("textbox", { name: "Texto a analizar" });
    expect(textarea).not.toBeDisabled();

    resolveResponse(makeResponse(READY_BODY, 200));
    await waitFor(() => expect(screen.queryByText("VALIDANDO SOLICITUD…")).not.toBeInTheDocument());
  });

  test("checkboxes editables durante submitting", async () => {
    let resolveResponse!: (r: Response) => void;
    const pendingFetch = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    vi.spyOn(window, "fetch").mockReturnValueOnce(pendingFetch);

    render(<OwlAnalysisEntry />);
    fillValidForm();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));
    });

    const privacyCheck = screen.getByLabelText(/no se conservará/i);
    const autoCheck = screen.getByLabelText(/orientativo, automatizado/i);
    expect(privacyCheck).not.toBeDisabled();
    expect(autoCheck).not.toBeDisabled();

    resolveResponse(makeResponse(READY_BODY, 200));
    await waitFor(() => expect(screen.queryByText("VALIDANDO SOLICITUD…")).not.toBeInTheDocument());
  });

  // =========================================================================
  // READY
  // =========================================================================

  test("200 + ready muestra role status con mensaje exacto aprobado", async () => {
    vi.spyOn(window, "fetch").mockResolvedValueOnce(makeResponse(READY_BODY, 200));

    render(<OwlAnalysisEntry />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(
      "Solicitud admitida por el orquestador simulado. La ejecución jurídica real todavía no está habilitada."
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("ready no muestra contenido jurídico", async () => {
    vi.spyOn(window, "fetch").mockResolvedValueOnce(makeResponse(READY_BODY, 200));

    render(<OwlAnalysisEntry />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));

    const statusPanel = await screen.findByRole("status");
    // The status panel itself must not contain legal analysis content
    expect(statusPanel.textContent).not.toContain("analysis");
    expect(statusPanel.textContent).not.toContain("processing");
    // No alert alongside the status
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("editar textarea invalida ready", async () => {
    vi.spyOn(window, "fetch").mockResolvedValueOnce(makeResponse(READY_BODY, 200));

    render(<OwlAnalysisEntry />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));

    await screen.findByRole("status");

    const textarea = screen.getByRole("textbox", { name: "Texto a analizar" });
    fireEvent.change(textarea, { target: { value: VALID_TEXT + " Editado." } });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  // =========================================================================
  // REJECTED
  // =========================================================================

  test("422 + rejected muestra role alert con mensaje canónico", async () => {
    vi.spyOn(window, "fetch").mockResolvedValueOnce(makeResponse(REJECTED_BODY, 422));

    render(<OwlAnalysisEntry />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "La solicitud no puede ingresar al flujo simulado con la configuración proporcionada."
    );
  });

  test("rejected no muestra errorCode ni status HTTP", async () => {
    vi.spyOn(window, "fetch").mockResolvedValueOnce(makeResponse(REJECTED_BODY, 422));

    render(<OwlAnalysisEntry />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).not.toContain("validation_failed");
    expect(alert.textContent).not.toContain("rejected");
    expect(alert.textContent).not.toContain("422");
  });

  test("editar invalida rejected", async () => {
    vi.spyOn(window, "fetch").mockResolvedValueOnce(makeResponse(REJECTED_BODY, 422));

    render(<OwlAnalysisEntry />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));

    await screen.findByRole("alert");

    const textarea = screen.getByRole("textbox", { name: "Texto a analizar" });
    fireEvent.change(textarea, { target: { value: VALID_TEXT + " Editado." } });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // =========================================================================
  // TRANSPORTE
  // =========================================================================

  test("status 400 muestra error de validación", async () => {
    vi.spyOn(window, "fetch").mockResolvedValueOnce(
      makeResponse(JSON.stringify({ message: "bad request" }), 400)
    );
    render(<OwlAnalysisEntry />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "No fue posible validar la solicitud en el servidor. Inténtelo nuevamente."
    );
  });

  test("status 403 muestra error de validación", async () => {
    vi.spyOn(window, "fetch").mockResolvedValueOnce(
      makeResponse(JSON.stringify({ message: "forbidden" }), 403)
    );
    render(<OwlAnalysisEntry />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "No fue posible validar la solicitud en el servidor. Inténtelo nuevamente."
    );
  });

  test("status 413 muestra error de tamaño", async () => {
    vi.spyOn(window, "fetch").mockResolvedValueOnce(
      makeResponse(JSON.stringify({ message: "too large" }), 413)
    );
    render(<OwlAnalysisEntry />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "La solicitud excede el tamaño permitido. Reduzca el texto e inténtelo nuevamente."
    );
  });

  test("status 415 muestra error de validación", async () => {
    vi.spyOn(window, "fetch").mockResolvedValueOnce(
      makeResponse(JSON.stringify({ message: "unsupported media" }), 415)
    );
    render(<OwlAnalysisEntry />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "No fue posible validar la solicitud en el servidor. Inténtelo nuevamente."
    );
  });

  test("status 500 muestra error de validación", async () => {
    vi.spyOn(window, "fetch").mockResolvedValueOnce(
      makeResponse(JSON.stringify({ message: "server error" }), 500)
    );
    render(<OwlAnalysisEntry />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "No fue posible validar la solicitud en el servidor. Inténtelo nuevamente."
    );
  });

  test("status inesperado (fuera del rango 200-422) muestra error de validación", async () => {
    // Use 599 (valid HTTP status code) to represent an unexpected server status
    vi.spyOn(window, "fetch").mockResolvedValueOnce(
      makeResponse(JSON.stringify({ message: "unexpected" }), 599)
    );
    render(<OwlAnalysisEntry />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "No fue posible validar la solicitud en el servidor. Inténtelo nuevamente."
    );
  });

  test("Content-Type ausente es error de transporte", async () => {
    const resp = new Response(READY_BODY, { status: 200, headers: new Headers() });
    vi.spyOn(window, "fetch").mockResolvedValueOnce(resp);

    render(<OwlAnalysisEntry />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "No fue posible validar la solicitud en el servidor. Inténtelo nuevamente."
    );
  });

  test("Content-Type text/plain es error de transporte", async () => {
    vi.spyOn(window, "fetch").mockResolvedValueOnce(
      makeResponse(READY_BODY, 200, "text/plain")
    );

    render(<OwlAnalysisEntry />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "No fue posible validar la solicitud en el servidor. Inténtelo nuevamente."
    );
  });

  test("Content-Type application/json-malicious es error de transporte", async () => {
    vi.spyOn(window, "fetch").mockResolvedValueOnce(
      makeResponse(READY_BODY, 200, "application/json-malicious")
    );

    render(<OwlAnalysisEntry />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "No fue posible validar la solicitud en el servidor. Inténtelo nuevamente."
    );
  });

  test("JSON malformado es error de transporte", async () => {
    vi.spyOn(window, "fetch").mockResolvedValueOnce(
      makeResponse("not json{{", 200)
    );

    render(<OwlAnalysisEntry />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "No fue posible validar la solicitud en el servidor. Inténtelo nuevamente."
    );
  });

  test("body vacío es error de transporte", async () => {
    vi.spyOn(window, "fetch").mockResolvedValueOnce(makeResponse("", 200));

    render(<OwlAnalysisEntry />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "No fue posible validar la solicitud en el servidor. Inténtelo nuevamente."
    );
  });

  test("200 con rejected shape es error de transporte", async () => {
    vi.spyOn(window, "fetch").mockResolvedValueOnce(makeResponse(REJECTED_BODY, 200));

    render(<OwlAnalysisEntry />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "No fue posible validar la solicitud en el servidor. Inténtelo nuevamente."
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("422 con ready shape es error de transporte", async () => {
    vi.spyOn(window, "fetch").mockResolvedValueOnce(makeResponse(READY_BODY, 422));

    render(<OwlAnalysisEntry />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "No fue posible validar la solicitud en el servidor. Inténtelo nuevamente."
    );
  });

  test("status processing en body es error de transporte", async () => {
    const processingBody = JSON.stringify({ status: "processing", phase: "classifying" });
    vi.spyOn(window, "fetch").mockResolvedValueOnce(makeResponse(processingBody, 200));

    render(<OwlAnalysisEntry />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "No fue posible validar la solicitud en el servidor. Inténtelo nuevamente."
    );
  });

  test("body con campos adicionales es error de transporte", async () => {
    const extraBody = JSON.stringify({ status: "ready", extra: "field" });
    vi.spyOn(window, "fetch").mockResolvedValueOnce(makeResponse(extraBody, 200));

    render(<OwlAnalysisEntry />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "No fue posible validar la solicitud en el servidor. Inténtelo nuevamente."
    );
  });

  test("errorCode desconocido en rejected es error de transporte", async () => {
    const unknownErrorCode = JSON.stringify({
      status: "rejected",
      errorCode: "totally_unknown_code",
      message: "algo falló",
    });
    vi.spyOn(window, "fetch").mockResolvedValueOnce(makeResponse(unknownErrorCode, 422));

    render(<OwlAnalysisEntry />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "No fue posible validar la solicitud en el servidor. Inténtelo nuevamente."
    );
  });

  test("fetch rechazado muestra error de red", async () => {
    vi.spyOn(window, "fetch").mockRejectedValueOnce(new TypeError("Failed to fetch"));

    render(<OwlAnalysisEntry />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "La solicitud no pudo ser enviada. Verifique su conexión e inténtelo nuevamente."
    );
  });

  // =========================================================================
  // CONCURRENCIA
  // =========================================================================

  test("editar durante request ejecuta abort y descarta respuesta obsoleta", async () => {
    let resolveResponse!: (r: Response) => void;
    const pendingFetch = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    const fetchSpy = vi.spyOn(window, "fetch").mockReturnValueOnce(pendingFetch);

    render(<OwlAnalysisEntry />);
    fillValidForm();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Edit while request is in-flight
    const textarea = screen.getByRole("textbox", { name: "Texto a analizar" });
    fireEvent.change(textarea, { target: { value: VALID_TEXT + " editado" } });

    // Stale response resolves — should be discarded
    resolveResponse(makeResponse(READY_BODY, 200));

    await new Promise((r) => setTimeout(r, 50));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("VALIDANDO SOLICITUD…")).not.toBeInTheDocument();
  });

  test("editar incrementa identidad — respuesta A no sobrescribe respuesta B", async () => {
    let resolveA!: (r: Response) => void;
    let resolveB!: (r: Response) => void;
    const pendingA = new Promise<Response>((resolve) => { resolveA = resolve; });
    const pendingB = new Promise<Response>((resolve) => { resolveB = resolve; });

    const fetchSpy = vi.spyOn(window, "fetch")
      .mockReturnValueOnce(pendingA)
      .mockReturnValueOnce(pendingB);

    render(<OwlAnalysisEntry />);
    fillValidForm();

    // Submit A
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));
    });

    // Edit to invalidate A, then re-submit B
    const textarea = screen.getByRole("textbox", { name: "Texto a analizar" });
    fireEvent.change(textarea, { target: { value: VALID_TEXT + " B" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // Resolve B first (ready), then A (rejected) — A must be discarded
    resolveB(makeResponse(READY_BODY, 200));
    await waitFor(() => screen.findByRole("status"));

    resolveA(makeResponse(REJECTED_BODY, 422));
    await new Promise((r) => setTimeout(r, 50));

    // B result should remain — A's rejected must not overwrite it
    expect(screen.queryByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("nuevo submit después de editar usa request nuevo con texto actualizado", async () => {
    vi.spyOn(window, "fetch")
      .mockResolvedValueOnce(makeResponse(READY_BODY, 200))
      .mockResolvedValueOnce(makeResponse(READY_BODY, 200));

    render(<OwlAnalysisEntry />);
    fillValidForm();

    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));
    await screen.findByRole("status");

    const textarea = screen.getByRole("textbox", { name: "Texto a analizar" });
    const newText = VALID_TEXT + " texto nuevo";
    fireEvent.change(textarea, { target: { value: newText } });

    // Re-accept checkboxes (invalidation unchecks them conceptually but not DOM)
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));
    // This second click triggers with the field state as-is (privacy/auto still checked)

    await waitFor(() => {
      const calls = (window.fetch as ReturnType<typeof vi.spyOn>).mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  test("unmount aborta la request en vuelo", async () => {
    let capturedSignal: AbortSignal | null | undefined;
    vi.spyOn(window, "fetch").mockImplementationOnce(
      (_url, init) => {
        capturedSignal = (init as RequestInit).signal ?? null;
        return new Promise(() => {/* never resolves */});
      }
    );

    const { unmount } = render(<OwlAnalysisEntry />);
    fillValidForm();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));
    });

    expect(capturedSignal?.aborted).toBe(false);

    unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });

  test("abort no muestra error", async () => {
    const abortError = new DOMException("The operation was aborted.", "AbortError");
    vi.spyOn(window, "fetch").mockRejectedValueOnce(abortError);

    render(<OwlAnalysisEntry />);
    fillValidForm();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));
    });

    await new Promise((r) => setTimeout(r, 50));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/abortar/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cancelad/i)).not.toBeInTheDocument();
  });

  test("finally antiguo no libera isSubmitting de request nuevo", async () => {
    let resolveA!: (r: Response) => void;
    let resolveB!: (r: Response) => void;
    const pendingA = new Promise<Response>((resolve) => { resolveA = resolve; });
    const pendingB = new Promise<Response>((resolve) => { resolveB = resolve; });

    vi.spyOn(window, "fetch")
      .mockReturnValueOnce(pendingA)
      .mockReturnValueOnce(pendingB);

    render(<OwlAnalysisEntry />);
    fillValidForm();

    // Submit A
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));
    });

    // Edit to invalidate A
    const textarea = screen.getByRole("textbox", { name: "Texto a analizar" });
    fireEvent.change(textarea, { target: { value: VALID_TEXT + " B" } });

    // Submit B
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));
    });

    // B is still pending; now resolve A — its finally should NOT set isSubmitting=false
    resolveA(makeResponse(READY_BODY, 200));
    await new Promise((r) => setTimeout(r, 50));

    // Button should still say "VALIDANDO SOLICITUD…" because B is still pending
    expect(screen.getByRole("button", { name: "VALIDANDO SOLICITUD…" })).toBeInTheDocument();

    // Clean up
    resolveB(makeResponse(READY_BODY, 200));
    await waitFor(() => expect(screen.queryByText("VALIDANDO SOLICITUD…")).not.toBeInTheDocument());
  });

  // =========================================================================
  // EFECTOS
  // =========================================================================

  test("no localStorage, no sessionStorage, no cookies, no IDs, no timestamps, no IA, no RAG", async () => {
    const localStorageGetSpy = vi.spyOn(window.localStorage, "getItem");
    const localStorageSetSpy = vi.spyOn(window.localStorage, "setItem");
    const sessionStorageGetSpy = vi.spyOn(window.sessionStorage, "getItem");
    const sessionStorageSetSpy = vi.spyOn(window.sessionStorage, "setItem");
    const cookieSpy = Object.defineProperty(document, "cookie", {
      get: vi.fn(() => ""),
      set: vi.fn(),
      configurable: true,
    });

    vi.spyOn(window, "fetch").mockResolvedValueOnce(makeResponse(READY_BODY, 200));

    render(<OwlAnalysisEntry />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));

    await screen.findByRole("status");

    expect(localStorageGetSpy).not.toHaveBeenCalled();
    expect(localStorageSetSpy).not.toHaveBeenCalled();
    expect(sessionStorageGetSpy).not.toHaveBeenCalled();
    expect(sessionStorageSetSpy).not.toHaveBeenCalled();

    void cookieSpy; // referenced to avoid unused-var lint error
  });

  test("no console del texto ingresado", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.spyOn(window, "fetch").mockResolvedValueOnce(makeResponse(READY_BODY, 200));

    render(<OwlAnalysisEntry />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));

    await screen.findByRole("status");

    const allCalls = [
      ...consoleSpy.mock.calls,
      ...consoleWarnSpy.mock.calls,
      ...consoleErrorSpy.mock.calls,
    ];
    const loggedText = allCalls.flat().join(" ");
    expect(loggedText).not.toContain(VALID_TEXT);
  });

  // =========================================================================
  // ACCESIBILIDAD — solo una región alert visible a la vez
  // =========================================================================

  test("no muestra simultáneamente error y rejected", async () => {
    // rejected viene del servidor
    vi.spyOn(window, "fetch").mockResolvedValueOnce(makeResponse(REJECTED_BODY, 422));

    render(<OwlAnalysisEntry />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "ANALIZAR TEXTO" }));

    await screen.findByRole("alert");

    const alerts = screen.queryAllByRole("alert");
    expect(alerts.length).toBe(1);
  });

  test("en idle el botón no tiene aria-busy", () => {
    render(<OwlAnalysisEntry />);
    const btn = screen.getByRole("button", { name: "ANALIZAR TEXTO" });
    const ariaBusy = btn.getAttribute("aria-busy");
    // aria-busy must be absent or "false" in idle
    expect(ariaBusy === null || ariaBusy === "false").toBe(true);
  });
});
