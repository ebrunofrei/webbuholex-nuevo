import { readFileSync } from "node:fs";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("server-only", () => ({}));
import { POST } from "@/app/api/owl/admission/route";
import { simulateOwlOrchestration } from "@/lib/owl/orchestration/simulate-owl-orchestration";

vi.mock("@/lib/owl/orchestration/simulate-owl-orchestration");

describe("POST /api/owl/admission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const validText = "A".repeat(50);
  const validRequestData = {
    mode: "analyze_raw_text",
    text: validText,
    persistence: "ephemeral",
    requestedTier: "free_summary",
    acceptedPrivacyNotice: true,
    acceptedAutomatedAnalysisNotice: true,
    locale: "es-PE",
  };

  const createRequest = (
    body: string | null,
    headers: Record<string, string> = {}
  ) => {
    return new Request("http://localhost/api/owl/admission", {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/json",
        ...headers,
      }),
      body: body,
    });
  };

  it("1. POST válido devuelve 200 y ready", async () => {
    vi.mocked(simulateOwlOrchestration).mockReturnValueOnce({ status: "ready" });
    const request = createRequest(JSON.stringify(validRequestData));
    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe("ready");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Type")).toContain("application/json");
  });

  it("2. Content-Type con charset es aceptado", async () => {
    vi.mocked(simulateOwlOrchestration).mockReturnValueOnce({ status: "ready" });
    const request = createRequest(JSON.stringify(validRequestData), {
      "Content-Type": "application/json; charset=utf-8",
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it("3. Content-Type ausente es rechazado con 415", async () => {
    const request = new Request("http://localhost/api/owl/admission", {
      method: "POST",
      body: JSON.stringify(validRequestData),
    });
    const response = await POST(request);
    expect(response.status).toBe(415);
  });

  it("4. text/plain es rechazado con 415", async () => {
    const request = createRequest("hola", { "Content-Type": "text/plain" });
    const response = await POST(request);
    expect(response.status).toBe(415);
  });

  it("5. multipart es rechazado con 415", async () => {
    const request = createRequest("hola", { "Content-Type": "multipart/form-data" });
    const response = await POST(request);
    expect(response.status).toBe(415);
  });

  it("6. application/x-www-form-urlencoded es rechazado con 415", async () => {
    const request = createRequest("hola", { "Content-Type": "application/x-www-form-urlencoded" });
    const response = await POST(request);
    expect(response.status).toBe(415);
  });

  it("7. application/json-patch+json es rechazado por estrictez (debe ser application/json)", async () => {
    const request = createRequest(JSON.stringify(validRequestData), { "Content-Type": "application/json-patch+json" });
    const response = await POST(request);
    expect(response.status).toBe(415); // Re-checking policy: "Debe rechazar con 415 application/json-patch+json"
  });

  it("8. JSON malformado devuelve 400", async () => {
    const request = createRequest("{ malformed: json ");
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("9. Body vacío devuelve 400", async () => {
    const request = createRequest("");
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("10. JSON válido pero schema inválido devuelve 422", async () => {
    const request = createRequest(JSON.stringify({ mode: "invalid" }));
    const response = await POST(request);
    expect(response.status).toBe(422);
    const data = await response.json();
    expect(data.status).toBe("rejected");
    expect(data.errorCode).toBe("validation_failed");
  });

  it("11. requestedTier inválido devuelve 422 por validación contractual", async () => {
    const request = createRequest(
      JSON.stringify({
        ...validRequestData,
        requestedTier: "unsupported",
      }),
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data).toEqual({
      status: "rejected",
      errorCode: "validation_failed",
      message:
        "La solicitud no puede ingresar al flujo simulado con la configuración proporcionada.",
    });
  });

  it("12. Body excesivo por Content-Length anticipado devuelve 413", async () => {
    const request = createRequest(JSON.stringify(validRequestData), {
      "Content-Length": "1000000",
    });
    const response = await POST(request);
    expect(response.status).toBe(413);
  });

  it("13. Body excesivo real sin Content-Length devuelve 413", async () => {
    const hugeBody = JSON.stringify({ mode: "analyze_raw_text", text: "A".repeat(100000) });
    const request = new Request("http://localhost/api/owl/admission", {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/json",
      }),
      body: hugeBody,
      duplex: "half",
    } as RequestInit);
    request.headers.delete("content-length");
    const response = await POST(request);
    expect(response.status).toBe(413);
  });

  it("14. acepta un request válido con texto de exactamente 12 000 caracteres", async () => {
    vi.mocked(simulateOwlOrchestration).mockReturnValueOnce({ status: "ready" });
    const validBody = JSON.stringify({ ...validRequestData, text: "A".repeat(12000) });
    const request = createRequest(validBody);
    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it("15. Origin coincide con request.url y Host devuelve 200", async () => {
    vi.mocked(simulateOwlOrchestration).mockReturnValueOnce({ status: "ready" });
    const request = createRequest(JSON.stringify(validRequestData), {
      "Origin": "http://localhost",
      "Host": "localhost",
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it("16. Origin ausente aceptado", async () => {
    vi.mocked(simulateOwlOrchestration).mockReturnValueOnce({ status: "ready" });
    const request = createRequest(JSON.stringify(validRequestData));
    request.headers.delete("Origin");
    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it("17. Origin null rechazado con 403", async () => {
    const request = createRequest(JSON.stringify(validRequestData), {
      "Origin": "null",
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("18. Origin externo rechazado aunque X-Forwarded-Host coincida", async () => {
    const request = createRequest(JSON.stringify(validRequestData), {
      "Origin": "https://custom.domain",
      "X-Forwarded-Host": "custom.domain",
      "Host": "localhost",
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("19. Origin externo rechazado aunque Host sea manipulado", async () => {
    const request = createRequest(JSON.stringify(validRequestData), {
      "Origin": "https://malicious.domain",
      "Host": "malicious.domain",
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("20. Origin con puerto distinto rechazado", async () => {
    const request = createRequest(JSON.stringify(validRequestData), {
      "Origin": "http://localhost:3001",
      "Host": "localhost",
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("21. Origin malformado rechazado", async () => {
    const request = createRequest(JSON.stringify(validRequestData), {
      "Origin": "no-es-una-url",
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("22. X-Forwarded-Host no cambia la decisión", async () => {
    vi.mocked(simulateOwlOrchestration).mockReturnValueOnce({ status: "ready" });
    const request = createRequest(JSON.stringify(validRequestData), {
      "Origin": "http://localhost",
      "Host": "localhost",
      "X-Forwarded-Host": "other.domain",
    });
    const response = await POST(request);
    expect(response.status).toBe(200); // Because origin matches request url and host
  });

  it("23. Sin CORS wildcard", async () => {
    vi.mocked(simulateOwlOrchestration).mockReturnValueOnce({ status: "ready" });
    const request = createRequest(JSON.stringify(validRequestData));
    const response = await POST(request);
    expect(response.headers.has("Access-Control-Allow-Origin")).toBe(false);
  });

  it("24. un rechazo del orquestador se devuelve cerrado con 422", async () => {
    vi.mocked(simulateOwlOrchestration).mockReturnValueOnce({
      status: "rejected",
      errorCode: "validation_failed",
      message:
        "La solicitud no puede ingresar al flujo simulado con la configuración proporcionada.",
    });
    const request = createRequest(JSON.stringify(validRequestData));
    const response = await POST(request);
    expect(response.status).toBe(422);
    const data = await response.json();

    expect(data).toEqual({
      status: "rejected",
      errorCode: "validation_failed",
      message:
        "La solicitud no puede ingresar al flujo simulado con la configuración proporcionada.",
    });
    expect(Object.keys(data).sort()).toEqual(["errorCode", "message", "status"]);
  });

  it("25. el Route Handler y el servicio mantienen el aislamiento server-only", () => {
    const routeSource = readFileSync(
      "app/api/owl/admission/route.ts",
      "utf8",
    );
    const serviceSource = readFileSync(
      "lib/owl/server/admit-owl-request-on-server.ts",
      "utf8",
    );
    const componentSource = readFileSync(
      "components/owl/owl-analysis-entry.tsx",
      "utf8",
    );

    expect(serviceSource).toContain('import "server-only";');
    expect(serviceSource).not.toMatch(/from\s+["']react["']/);
    expect(serviceSource).not.toContain("@/components/");
    expect(serviceSource).not.toContain('"use client"');

    expect(routeSource).not.toContain("@/components/");
    expect(routeSource).not.toContain('"use client"');

    expect(componentSource).not.toContain("@/lib/owl/server/");
    expect(componentSource).not.toContain("admitOwlRequestOnServer");
  });

  it("26. application/json-malicious es rechazado con 415", async () => {
    const request = createRequest(JSON.stringify(validRequestData), {
      "Content-Type": "application/json-malicious",
    });

    const response = await POST(request);

    expect(response.status).toBe(415);
  });

  it("27. application/jsonxyz es rechazado con 415", async () => {
    const request = createRequest(JSON.stringify(validRequestData), {
      "Content-Type": "application/jsonxyz",
    });

    const response = await POST(request);

    expect(response.status).toBe(415);
  });

  it("28. Respuesta de rechazo (422) no devuelve issues, stack ni expected", async () => {
    const request = createRequest(JSON.stringify({ ...validRequestData, extra: "extra" }));
    const response = await POST(request);
    const data = await response.json();
    expect(data).not.toHaveProperty("issues");
    expect(data).not.toHaveProperty("stack");
    expect(data).not.toHaveProperty("text");
    expect(data).not.toHaveProperty("expected");
  });

  it("29. Errores de transporte 400 no incluyen stack ni text", async () => {
    const request = createRequest("{ invalid }");
    const response = await POST(request);
    const data = await response.json();
    expect(data).toHaveProperty("message", "La solicitud no pudo ser procesada por el servidor.");
    expect(data).not.toHaveProperty("stack");
    expect(data).not.toHaveProperty("text");
  });

  it("30. Errores de transporte 413 no incluyen stack", async () => {
    const request = createRequest(JSON.stringify(validRequestData), { "Content-Length": "1000000" });
    const response = await POST(request);
    const data = await response.json();
    expect(data).not.toHaveProperty("stack");
  });

  it("31. Errores de transporte 415 no incluyen stack", async () => {
    const request = createRequest(JSON.stringify(validRequestData), { "Content-Type": "text/html" });
    const response = await POST(request);
    const data = await response.json();
    expect(data).not.toHaveProperty("stack");
  });

  it("32. Excepciones de red/body lanzan 400 si se corrompe el stream", async () => {
    const badBuffer = new Uint8Array([0xFF, 0xFE]);
    const request = new Request("http://localhost/api/owl/admission", {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/json",
      }),
      body: badBuffer,
      duplex: "half",
    } as RequestInit);
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("33. acepta 12 000 caracteres representados mediante escapes Unicode", async () => {
    vi.mocked(simulateOwlOrchestration).mockReturnValueOnce({
      status: "ready",
    });

    const escapedCharacter = "\\u0041";
    const bodyText =
      `{"mode":"analyze_raw_text",` +
      `"text":"${escapedCharacter.repeat(12_000)}",` +
      `"persistence":"ephemeral",` +
      `"requestedTier":"free_summary",` +
      `"acceptedPrivacyNotice":true,` +
      `"acceptedAutomatedAnalysisNotice":true,` +
      `"locale":"es-PE"}`;

    const parsed: unknown = JSON.parse(bodyText);

    expect(parsed).toMatchObject({
      text: "A".repeat(12_000),
    });

    const response = await POST(createRequest(bodyText));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ready",
    });
  });

  it("34. el payload escapado supera 64 KiB y permanece dentro de 96 KiB", () => {
    const escapedCharacter = "\\u0041";
    const bodyText =
      `{"mode":"analyze_raw_text",` +
      `"text":"${escapedCharacter.repeat(12_000)}",` +
      `"persistence":"ephemeral",` +
      `"requestedTier":"free_summary",` +
      `"acceptedPrivacyNotice":true,` +
      `"acceptedAutomatedAnalysisNotice":true,` +
      `"locale":"es-PE"}`;

    const serializedBytes = new TextEncoder().encode(bodyText).byteLength;

    expect(serializedBytes).toBeGreaterThan(65_536);
    expect(serializedBytes).toBeLessThanOrEqual(96 * 1024);
  });

  it("35. Siempre emite Cache-Control: no-store en 200", async () => {
    vi.mocked(simulateOwlOrchestration).mockReturnValueOnce({ status: "ready" });
    const request = createRequest(JSON.stringify(validRequestData));
    const response = await POST(request);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("36. Siempre emite Cache-Control: no-store en errores (403)", async () => {
    const request = createRequest(JSON.stringify(validRequestData), { "Origin": "null" });
    const response = await POST(request);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("37. un body superior a 96 KiB es rechazado sin Content-Length", async () => {
    const oversizedBody = JSON.stringify({
      ...validRequestData,
      text: "A".repeat(100_000),
    });

    const request = new Request(
      "http://localhost/api/owl/admission",
      {
        method: "POST",
        headers: new Headers({
          "Content-Type": "application/json",
        }),
        body: oversizedBody,
        duplex: "half",
      } as RequestInit,
    );

    request.headers.delete("content-length");

    const response = await POST(request);

    expect(response.status).toBe(413);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("38. request body de null devuelve 400", async () => {
    const request = new Request("http://localhost/api/owl/admission", {
      method: "POST",
      headers: new Headers({ "Content-Type": "application/json" }),
      body: null,
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("39. Content-Type con parámetros adicionales además de charset es aceptado", async () => {
    vi.mocked(simulateOwlOrchestration).mockReturnValueOnce({ status: "ready" });
    const request = createRequest(JSON.stringify(validRequestData), {
      "Content-Type": "application/json; profile=something",
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it("40. Request sin payload y sin content-length devuelve 400", async () => {
    const request = new Request("http://localhost/api/owl/admission", {
      method: "POST",
      headers: new Headers({ "Content-Type": "application/json" }),
      body: "",
      duplex: "half",
    } as RequestInit);
    request.headers.delete("Content-Length");
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
