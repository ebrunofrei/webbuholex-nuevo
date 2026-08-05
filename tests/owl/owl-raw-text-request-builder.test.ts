import { describe, test, expect } from "vitest";
import { buildOwlRawTextRequest } from "@/lib/owl/input/build-owl-raw-text-request";
import fs from "node:fs";
import path from "node:path";

describe("buildOwlRawTextRequest", () => {
  const validInput = {
    text: "A".repeat(50),
    acceptedPrivacyNotice: true,
    acceptedAutomatedAnalysisNotice: true,
  };

  test("1. exporta buildOwlRawTextRequest y 2. construye request válido", () => {
    const result = buildOwlRawTextRequest(validInput);
    expect(result.ok).toBe(true);
  });

  test("3. devuelve ok true y 4. devuelve el request validado", () => {
    const result = buildOwlRawTextRequest(validInput);
    if (!result.ok) throw new Error("Expected ok to be true");
    expect(result.request).toBeDefined();
    expect(result.request.mode).toBe("analyze_raw_text");
  });

  test("5. usa mode analyze_raw_text, 6. persistence ephemeral, 7. requestedTier free_summary, 8. locale es-PE, 9. privacy true, 10. automated true", () => {
    const result = buildOwlRawTextRequest(validInput);
    if (!result.ok) throw new Error("Expected ok to be true");
    expect(result.request.mode).toBe("analyze_raw_text");
    expect(result.request.persistence).toBe("ephemeral");
    expect(result.request.requestedTier).toBe("free_summary");
    expect(result.request.locale).toBe("es-PE");
    expect(result.request.acceptedPrivacyNotice).toBe(true);
    expect(result.request.acceptedAutomatedAnalysisNotice).toBe(true);
  });

  test("11. aplica trim y 12. acepta exactamente 50 caracteres después de trim", () => {
    const result = buildOwlRawTextRequest({
      ...validInput,
      text: "   " + "A".repeat(50) + "   ",
    });
    if (!result.ok) throw new Error("Expected ok to be true");
    expect(result.request.text).toBe("A".repeat(50));
    expect(result.request.text.length).toBe(50);
  });

  test("13. acepta exactamente 12 000 caracteres", () => {
    const result = buildOwlRawTextRequest({
      ...validInput,
      text: "B".repeat(12000),
    });
    expect(result.ok).toBe(true);
  });

  test("14. rechaza 49 caracteres y 21. devuelve text_too_short", () => {
    const result = buildOwlRawTextRequest({
      ...validInput,
      text: "C".repeat(49),
    });
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error.code).toBe("text_too_short");
    }
  });

  test("15. rechaza mas de 12 000 caracteres y 22. devuelve text_too_long", () => {
    const result = buildOwlRawTextRequest({
      ...validInput,
      text: "D".repeat(12001),
    });
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error.code).toBe("text_too_long");
    }
  });

  test("16. rechaza texto compuesto solo por espacios", () => {
    const result = buildOwlRawTextRequest({
      ...validInput,
      text: " ".repeat(100),
    });
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error.code).toBe("text_too_short");
    }
  });

  test("17. exige privacidad y 23. devuelve privacy_notice_required", () => {
    const result = buildOwlRawTextRequest({
      ...validInput,
      acceptedPrivacyNotice: false,
    });
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error.code).toBe("privacy_notice_required");
    }
  });

  test("18. exige aviso automatizado y 24. devuelve automated_analysis_notice_required", () => {
    const result = buildOwlRawTextRequest({
      ...validInput,
      acceptedAutomatedAnalysisNotice: false,
    });
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error.code).toBe("automated_analysis_notice_required");
    }
  });

  test("19. prioriza text sobre privacidad", () => {
    const result = buildOwlRawTextRequest({
      text: "short",
      acceptedPrivacyNotice: false,
      acceptedAutomatedAnalysisNotice: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error.code).toBe("text_too_short");
    }
  });

  test("20. prioriza privacidad sobre aviso automatizado", () => {
    const result = buildOwlRawTextRequest({
      text: "A".repeat(50),
      acceptedPrivacyNotice: false,
      acceptedAutomatedAnalysisNotice: false,
    });
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error.code).toBe("privacy_notice_required");
    }
  });

  test("26, 27, 28, 29, 30. errores no devuelven info interna ni ZodIssue", () => {
    const result = buildOwlRawTextRequest({
      ...validInput,
      acceptedPrivacyNotice: false,
    });
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error).not.toHaveProperty("issues");
      expect(result.error).not.toHaveProperty("path");
      expect(result.error).not.toHaveProperty("stack");
      expect(result.error).not.toHaveProperty("candidate");
      expect(result.error).not.toHaveProperty("ZodError");
    }
  });

  test("31-41. no se añaden campos extra", () => {
    const result = buildOwlRawTextRequest(validInput);
    if (!result.ok) throw new Error("Expected ok to be true");
    const req = result.request as unknown as Record<string, unknown>;
    expect(req).not.toHaveProperty("userId");
    expect(req).not.toHaveProperty("prompt");
    expect(req).not.toHaveProperty("systemInstruction");
    expect(req).not.toHaveProperty("tools");
    expect(req).not.toHaveProperty("publish");
    expect(req).not.toHaveProperty("save");
    expect(req).not.toHaveProperty("isPublic");
    expect(req).not.toHaveProperty("sourceUrl");
    expect(req).not.toHaveProperty("filename");
    expect(req).not.toHaveProperty("documentPath");
    expect(req).not.toHaveProperty("metadata");
  });

  test("42-50. no genera efectos secundarios", () => {
    const result = buildOwlRawTextRequest(validInput);
    if (!result.ok) throw new Error("Expected ok to be true");
    const req = result.request as unknown as Record<string, unknown>;
    expect(req).not.toHaveProperty("analysisId");
  });

  test("25. devuelve validation_failed para otros fallos de validacion", () => {
    // Probando fallo intencional para forzar validation_failed
    const result = buildOwlRawTextRequest({
       text: undefined as unknown as string,
       acceptedPrivacyNotice: true,
       acceptedAutomatedAnalysisNotice: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error.code).toBe("validation_failed");
    }
  });

  test("51-62. Inspeccion estatica del codigo fuente", () => {
    const sourcePath = path.resolve(__dirname, "../../lib/owl/input/build-owl-raw-text-request.ts");
    const code = fs.readFileSync(sourcePath, "utf-8");

    expect(code).not.toMatch(/\.\.\.input/);
    expect(code).not.toMatch(/\.\.\.formState/);
    expect(code).not.toMatch(/fetch\(/);
    expect(code).not.toMatch(/XMLHttpRequest/);
    expect(code).not.toMatch(/sendBeacon/);
    expect(code).not.toMatch(/localStorage/);
    expect(code).not.toMatch(/sessionStorage/);
    expect(code).not.toMatch(/indexedDB/);
    expect(code).not.toMatch(/document\.cookie/);
    expect(code).not.toMatch(/node:fs/);
    expect(code).not.toMatch(/ server-only/);
    expect(code).not.toMatch(/use server/);
    expect(code).not.toMatch(/process\.env/);

    expect(code).toMatch(/safeParse/);
    expect(code).not.toMatch(/\.parse\(/);

    expect(code).toMatch(/candidate = \{/);
    expect(code).toMatch(/request: result\.data/);
  });
});
