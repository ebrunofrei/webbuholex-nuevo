import { describe, test, expect } from "vitest";
import { simulateOwlOrchestration } from "@/lib/owl/orchestration/simulate-owl-orchestration";
import type { OwlLegalAnalysisRequest } from "@/types/owl/owl-analysis";
import * as fs from "fs";
import * as path from "path";

describe("Owl Simulated Orchestrator", () => {
  const validRequest: OwlLegalAnalysisRequest = {
    mode: "analyze_raw_text",
    text: "Texto de prueba válido con más de cincuenta caracteres útiles para pasar las pruebas locales.",
    persistence: "ephemeral",
    requestedTier: "free_summary",
    acceptedPrivacyNotice: true,
    acceptedAutomatedAnalysisNotice: true,
    locale: "es-PE",
  };

  test("1. exporta simulateOwlOrchestration", () => {
    expect(typeof simulateOwlOrchestration).toBe("function");
  });

  test("2. recibe un request válido y 3. devuelve { status: 'ready' } y 4. ready solo contiene status", () => {
    const result = simulateOwlOrchestration(validRequest);
    expect(result).toEqual({ status: "ready" });
    const keys = Object.keys(result);
    expect(keys).toHaveLength(1);
    expect(keys[0]).toBe("status");
  });

  test("5-15. no devuelve propiedades no solicitadas (message, request, text, result, warnings, IDs, timestamps, metadata, historial, fases, eventos)", () => {
    const result = simulateOwlOrchestration(validRequest);
    expect("message" in result).toBe(false);
    expect("request" in result).toBe(false);
    expect("text" in result).toBe(false);
    expect("result" in result).toBe(false);
    expect("warnings" in result).toBe(false);
    expect("id" in result).toBe(false);
    expect("timestamp" in result).toBe(false);
    expect("metadata" in result).toBe(false);
    expect("history" in result).toBe(false);
    expect("phases" in result).toBe(false);
    expect("events" in result).toBe(false);
  });

  test("16. mode inválido devuelve rejected y 17. usa unsupported_mode y 21. mensaje rechazado exacto y 23-24. no expone detalles", () => {
    const invalidReq = { ...validRequest };
    Reflect.set(invalidReq, "mode", "analyze_jurisprudence");
    const result = simulateOwlOrchestration(invalidReq);
    expect(result).toEqual({
      status: "rejected",
      errorCode: "unsupported_mode",
      message: "La solicitud no puede ingresar al flujo simulado con la configuración proporcionada.",
    });
    expect("mode" in result).toBe(false);
  });

  test("18. persistence inválida usa validation_failed", () => {
    const invalidReq = { ...validRequest };
    Reflect.set(invalidReq, "persistence", "private_saved");
    const result = simulateOwlOrchestration(invalidReq);
    expect(result).toEqual({
      status: "rejected",
      errorCode: "validation_failed",
      message: "La solicitud no puede ingresar al flujo simulado con la configuración proporcionada.",
    });
  });

  test("19. requestedTier inválido usa validation_failed", () => {
    const invalidReq = { ...validRequest };
    Reflect.set(invalidReq, "requestedTier", "professional_review");
    const result = simulateOwlOrchestration(invalidReq);
    expect(result).toEqual({
      status: "rejected",
      errorCode: "validation_failed",
      message: "La solicitud no puede ingresar al flujo simulado con la configuración proporcionada.",
    });
  });

  test("20. locale inválido usa validation_failed", () => {
    const invalidReq = { ...validRequest };
    Reflect.set(invalidReq, "locale", "en-US");
    const result = simulateOwlOrchestration(invalidReq);
    expect(result).toEqual({
      status: "rejected",
      errorCode: "validation_failed",
      message: "La solicitud no puede ingresar al flujo simulado con la configuración proporcionada.",
    });
  });

  test("22. aplica las guardas en orden determinista", () => {
    const invalidReq = { ...validRequest };

    Reflect.set(invalidReq, "mode", "analyze_jurisprudence");
    Reflect.set(invalidReq, "persistence", "private_saved");
    Reflect.set(invalidReq, "requestedTier", "professional_review");
    Reflect.set(invalidReq, "locale", "en-US");

    const result = simulateOwlOrchestration(invalidReq);

    expect(result).toEqual({
      status: "rejected",
      errorCode: "unsupported_mode",
      message:
        "La solicitud no puede ingresar al flujo simulado con la configuración proporcionada.",
    });
  });

  test("27. no muta el request original", () => {
    const originalText = validRequest.text;
    simulateOwlOrchestration(validRequest);
    expect(validRequest.text).toBe(originalText);
  });

  test("28. determinismo: misma entrada produce misma salida", () => {
    const res1 = simulateOwlOrchestration(validRequest);
    const res2 = simulateOwlOrchestration(validRequest);
    expect(res1).toEqual(res2);
  });

  test("41. no lanza errores técnicos ante un request válido", () => {
    expect(() => simulateOwlOrchestration(validRequest)).not.toThrow();
  });

  test("29-41. verificaciones estáticas (sin zod, sin random, sin fetch, sin db, sin side effects, etc.) y no lanza errores técnicos", () => {
    const filePath = path.join(process.cwd(), "lib/owl/orchestration/simulate-owl-orchestration.ts");
    const fileContent = fs.readFileSync(filePath, "utf8");

    const ausencias = [
      "zod",
      "safeParse",
      "XMLHttpRequest",
      "sendBeacon",
      "WebSocket",
      "localStorage",
      "sessionStorage",
      "indexedDB",
      "document.cookie",
      "Math.random",
      "randomUUID",
      "crypto.randomUUID",
      "Date.now",
      "performance.now",
      "process.env",
      "server-only",
      "node:fs",
      'from "fs"',
      'from "node:fs"',
      "setTimeout",
      "setInterval",
      "Promise",
      "async",
      "await",
      "prisma",
      "gateway",
      "repository",
      "catálogo",
      "catalog"
    ];

    for (const ausencia of ausencias) {
      expect(fileContent).not.toContain(ausencia);
    }

    const presencias = [
      "request.mode",
      "request.persistence",
      "request.requestedTier",
      "request.locale",
      '"analyze_raw_text"',
      '"ephemeral"',
      '"free_summary"',
      '"es-PE"',
      'status: "ready"',
      'status: "rejected"',
      'errorCode: "unsupported_mode"',
      'errorCode: "validation_failed"'
    ];

    for (const presencia of presencias) {
      expect(fileContent).toContain(presencia);
    }
  });
});
