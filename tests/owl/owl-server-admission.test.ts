import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
vi.mock("server-only", () => ({}));
import { admitOwlRequestOnServer } from "@/lib/owl/server/admit-owl-request-on-server";
import { simulateOwlOrchestration } from "@/lib/owl/orchestration/simulate-owl-orchestration";

vi.mock("@/lib/owl/orchestration/simulate-owl-orchestration");

describe("admitOwlRequestOnServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
  const validText = "A".repeat(50);
  const validRequest = {
    mode: "analyze_raw_text",
    text: validText,
    persistence: "ephemeral",
    requestedTier: "free_summary",
    acceptedPrivacyNotice: true,
    acceptedAutomatedAnalysisNotice: true,
    locale: "es-PE",
  };

  it("1. acepta un OwlLegalAnalysisRequest válido y devuelve ready cerrado", () => {
    vi.mocked(simulateOwlOrchestration).mockReturnValueOnce({ status: "ready" });
    const result = admitOwlRequestOnServer(validRequest);
    expect(result).toEqual({ status: "ready" });
    expect(Object.keys(result)).toEqual(["status"]);
  });

  it("2. rechaza null", () => {
    const result = admitOwlRequestOnServer(null);
    expect(result.status).toBe("rejected");
  });

  it("3. rechaza undefined", () => {
    const result = admitOwlRequestOnServer(undefined);
    expect(result.status).toBe("rejected");
  });

  it("4. rechaza string", () => {
    const result = admitOwlRequestOnServer("string");
    expect(result.status).toBe("rejected");
  });

  it("5. rechaza number", () => {
    const result = admitOwlRequestOnServer(123);
    expect(result.status).toBe("rejected");
  });

  it("6. rechaza array", () => {
    const result = admitOwlRequestOnServer([]);
    expect(result.status).toBe("rejected");
  });

  it("7. rechaza boolean", () => {
    const result = admitOwlRequestOnServer(true);
    expect(result.status).toBe("rejected");
  });

  it("8. rechaza objeto vacío", () => {
    const result = admitOwlRequestOnServer({});
    expect(result.status).toBe("rejected");
  });

  it("9. rechaza texto menor de 50 caracteres", () => {
    const result = admitOwlRequestOnServer({ ...validRequest, text: "A".repeat(49) });
    expect(result.status).toBe("rejected");
  });

  it("10. rechaza texto mayor de 12 000 caracteres", () => {
    const result = admitOwlRequestOnServer({ ...validRequest, text: "A".repeat(12001) });
    expect(result.status).toBe("rejected");
  });

  it("11. acepta texto de exactamente 12 000 caracteres", () => {
    vi.mocked(simulateOwlOrchestration).mockReturnValueOnce({ status: "ready" });
    const result = admitOwlRequestOnServer({ ...validRequest, text: "A".repeat(12000) });
    expect(result.status).toBe("ready");
  });

  it("12. acepta texto de exactamente 50 caracteres", () => {
    vi.mocked(simulateOwlOrchestration).mockReturnValueOnce({ status: "ready" });
    const result = admitOwlRequestOnServer({ ...validRequest, text: "A".repeat(50) });
    expect(result.status).toBe("ready");
  });

  it("13. rechaza espacios útiles insuficientes", () => {
    const result = admitOwlRequestOnServer({ ...validRequest, text: " ".repeat(50) });
    expect(result.status).toBe("rejected");
  });

  it("14. rechaza mode no permitido", () => {
    const result = admitOwlRequestOnServer({ ...validRequest, mode: "unsupported" });
    expect(result.status).toBe("rejected");
  });

  it("15. rechaza mode faltante", () => {
    const rest = { ...validRequest };
    delete (rest as Partial<typeof validRequest>).mode;
    const result = admitOwlRequestOnServer(rest);
    expect(result.status).toBe("rejected");
  });

  it("16. rechaza locale no permitido", () => {
    const result = admitOwlRequestOnServer({ ...validRequest, locale: "en-US" });
    expect(result.status).toBe("rejected");
  });

  it("17. rechaza locale faltante", () => {
    const rest = { ...validRequest };
    delete (rest as Partial<typeof validRequest>).locale;
    const result = admitOwlRequestOnServer(rest);
    expect(result.status).toBe("rejected");
  });

  it("18. rechaza persistence no permitido", () => {
    const result = admitOwlRequestOnServer({ ...validRequest, persistence: "private_saved" });
    expect(result.status).toBe("rejected");
  });

  it("19. rechaza persistence faltante", () => {
    const rest = { ...validRequest };
    delete (rest as Partial<typeof validRequest>).persistence;
    const result = admitOwlRequestOnServer(rest);
    expect(result.status).toBe("rejected");
  });

  it("20. rechaza requestedTier no permitido", () => {
    const result = admitOwlRequestOnServer({ ...validRequest, requestedTier: "professional_review" });
    expect(result.status).toBe("rejected");
  });

  it("21. rechaza requestedTier faltante", () => {
    const rest = { ...validRequest };
    delete (rest as Partial<typeof validRequest>).requestedTier;
    const result = admitOwlRequestOnServer(rest);
    expect(result.status).toBe("rejected");
  });

  it("22. exige privacyAccepted verdadero", () => {
    const result = admitOwlRequestOnServer({ ...validRequest, acceptedPrivacyNotice: false });
    expect(result.status).toBe("rejected");
  });

  it("23. rechaza acceptedPrivacyNotice faltante", () => {
    const requestWithoutPrivacyNotice = { ...validRequest };

    delete (
      requestWithoutPrivacyNotice as Partial<typeof validRequest>
    ).acceptedPrivacyNotice;

    const result = admitOwlRequestOnServer(
      requestWithoutPrivacyNotice,
    );

    expect(result.status).toBe("rejected");
  });

  it("24. exige automatedAnalysisAccepted verdadero", () => {
    const result = admitOwlRequestOnServer({ ...validRequest, acceptedAutomatedAnalysisNotice: false });
    expect(result.status).toBe("rejected");
  });

  it("25. rechaza acceptedAutomatedAnalysisNotice faltante", () => {
    const requestWithoutAutomatedNotice = { ...validRequest };

    delete (
      requestWithoutAutomatedNotice as Partial<typeof validRequest>
    ).acceptedAutomatedAnalysisNotice;

    const result = admitOwlRequestOnServer(
      requestWithoutAutomatedNotice,
    );

    expect(result.status).toBe("rejected");
  });

  it("26. rechaza propiedades adicionales en raíz", () => {
    const result = admitOwlRequestOnServer({ ...validRequest, extra: "extra" });
    expect(result.status).toBe("rejected");
  });

  it("27. devuelve validation_failed cerrado para schema inválido", () => {
    const result = admitOwlRequestOnServer({});
    expect(result).toEqual({
      status: "rejected",
      errorCode: "validation_failed",
      message: "La solicitud no puede ingresar al flujo simulado con la configuración proporcionada."
    });
    expect(Object.keys(result).sort()).toEqual(["errorCode", "message", "status"]);
  });

  it("28. no devuelve issues Zod", () => {
    const result = admitOwlRequestOnServer({ ...validRequest, extra: "extra" });
    expect(result).not.toHaveProperty("issues");
  });

  it("29. no devuelve text original en error", () => {
    const result = admitOwlRequestOnServer({ ...validRequest, text: "A" });
    expect(result).not.toHaveProperty("text");
  });

  it("30. no devuelve expected en error", () => {
    const result = admitOwlRequestOnServer({ ...validRequest, locale: "invalid" });
    expect(result).not.toHaveProperty("expected");
  });

  it("31. no muta el input", () => {
    vi.mocked(simulateOwlOrchestration).mockReturnValueOnce({ status: "ready" });
    const input = { ...validRequest };
    const inputCopy = JSON.parse(JSON.stringify(input));
    admitOwlRequestOnServer(input);
    expect(input).toEqual(inputCopy);
  });

  it("32. misma entrada produce mismo resultado (determinismo)", () => {
    vi.mocked(simulateOwlOrchestration).mockReturnValue({ status: "ready" });
    const result1 = admitOwlRequestOnServer(validRequest);
    const result2 = admitOwlRequestOnServer(validRequest);
    expect(result1).toEqual(result2);
  });

  it("33. delega una sola vez al orquestador con el request validado", () => {
    vi.mocked(simulateOwlOrchestration).mockReturnValueOnce({
      status: "ready",
    });

    admitOwlRequestOnServer(validRequest);

    expect(simulateOwlOrchestration).toHaveBeenCalledTimes(1);
    expect(simulateOwlOrchestration).toHaveBeenCalledWith(validRequest);
  });

  it("34. ready conserva una forma cerrada sin propiedades adicionales", () => {
    vi.mocked(simulateOwlOrchestration).mockReturnValueOnce({
      status: "ready",
    });

    const result = admitOwlRequestOnServer(validRequest);

    expect(result).toEqual({
      status: "ready",
    });
    expect(Object.keys(result)).toEqual(["status"]);
  });

  it("35. ready no contiene phase, result ni warnings", () => {
    vi.mocked(simulateOwlOrchestration).mockReturnValueOnce({
      status: "ready",
    });

    const result = admitOwlRequestOnServer(validRequest);

    expect(result).not.toHaveProperty("phase");
    expect(result).not.toHaveProperty("result");
    expect(result).not.toHaveProperty("warnings");
  });

  it("36. ready no contiene request, text ni metadata", () => {
    vi.mocked(simulateOwlOrchestration).mockReturnValueOnce({
      status: "ready",
    });

    const result = admitOwlRequestOnServer(validRequest);

    expect(result).not.toHaveProperty("request");
    expect(result).not.toHaveProperty("text");
    expect(result).not.toHaveProperty("metadata");
  });

  it("37. ready no contiene analysisId ni generatedAt", () => {
    vi.mocked(simulateOwlOrchestration).mockReturnValueOnce({
      status: "ready",
    });

    const result = admitOwlRequestOnServer(validRequest);

    expect(result).not.toHaveProperty("analysisId");
    expect(result).not.toHaveProperty("generatedAt");
  });

  it("38. devuelve sin alterar el rejected canónico del orquestador", () => {
    const rejected = {
      status: "rejected" as const,
      errorCode: "validation_failed" as const,
      message:
        "La solicitud no puede ingresar al flujo simulado con la configuración proporcionada.",
    };

    vi.mocked(simulateOwlOrchestration).mockReturnValueOnce(rejected);

    const result = admitOwlRequestOnServer(validRequest);

    expect(result).toEqual(rejected);
    expect(Object.keys(result).sort()).toEqual([
      "errorCode",
      "message",
      "status",
    ]);
  });

  it("39. no llama a console.log, info, warn ni error", () => {
    vi.mocked(simulateOwlOrchestration).mockReturnValueOnce({ status: "ready" });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    admitOwlRequestOnServer(validRequest);

    expect(logSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("40. acepta un payload válido con caracteres escapados", () => {
    vi.mocked(simulateOwlOrchestration).mockReturnValueOnce({ status: "ready" });
    const text = "A".repeat(50) + "\n\t";
    const result = admitOwlRequestOnServer({ ...validRequest, text });
    expect(result.status).toBe("ready");
  });

  it("41. rechaza el intento de polución de prototipos (JSON con __proto__)", () => {
    const jsonStr = '{"__proto__":{"polluter":true},"mode":"analyze_raw_text","text":"' + "A".repeat(50) + '","persistence":"ephemeral","requestedTier":"free_summary","acceptedPrivacyNotice":true,"acceptedAutomatedAnalysisNotice":true,"locale":"es-PE"}';
    const input = JSON.parse(jsonStr);
    expect(Object.prototype.hasOwnProperty.call(input, "__proto__")).toBe(true);

    const result = admitOwlRequestOnServer(input);
    expect(result).toEqual({
      status: "rejected",
      errorCode: "validation_failed",
      message: "La solicitud no puede ingresar al flujo simulado con la configuración proporcionada."
    });
    // Check that prototype wasn't polluted
    expect(Object.prototype).not.toHaveProperty("polluter");
  });

  it("42. text faltante es rechazado", () => {
    const requestWithoutText = { ...validRequest };

    delete (
      requestWithoutText as Partial<typeof validRequest>
    ).text;

    const result = admitOwlRequestOnServer(requestWithoutText);

    expect(result.status).toBe("rejected");
  });
});
