import { describe, it, expect } from "vitest";
import {
  ComplaintSubmissionSchema,
  ComplaintProviderResponseSchema,
} from "@/lib/complaints";

describe("Complaints Contracts", () => {
  const validBase = {
    schemaVersion: "1.0",
    idempotencyKey: "12345678",
    consumer: {
      consumerType: "natural_person",
      firstNames: "Juan",
      lastNames: "Pérez",
      documentType: "dni",
      documentNumber: "12345678",
      email: "juan@example.com",
      address: "Lima, Perú",
      isMinor: false,
    },
    subject: {
      kind: "product",
      description: "Laptop defectuosa",
      amountApplicability: "applicable",
      amount: "1500.00",
      currency: "PEN",
    },
    complaint: {
      kind: "claim",
      facts: "La laptop no enciende.",
      requestedResolution: "Devolución de dinero.",
    },
    confirmation: {
      truthfulnessConfirmed: true,
      submissionConfirmed: true,
      emailDeliveryRequested: true,
    },
  };

  it("permite un reclamo válido completo", () => {
    const result = ComplaintSubmissionSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  describe("Resolución solicitada (requestedResolution)", () => {
    it("falla si un reclamo no tiene requestedResolution", () => {
      const payload = {
        ...validBase,
        complaint: { kind: "claim", facts: "Producto dañado" },
      };
      const result = ComplaintSubmissionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("falla si una queja no tiene requestedResolution", () => {
      const payload = {
        ...validBase,
        complaint: { kind: "complaint", facts: "Mala atención" },
      };
      const result = ComplaintSubmissionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("pasa si un reclamo tiene requestedResolution", () => {
      const payload = {
        ...validBase,
        complaint: { kind: "claim", facts: "Producto dañado", requestedResolution: "Cambio" },
      };
      const result = ComplaintSubmissionSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("pasa si una queja tiene requestedResolution", () => {
      const payload = {
        ...validBase,
        complaint: { kind: "complaint", facts: "Mala atención", requestedResolution: "Disculpas" },
      };
      const result = ComplaintSubmissionSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("falla si requestedResolution es vacío", () => {
      const payload = {
        ...validBase,
        complaint: { kind: "complaint", facts: "Mala atención", requestedResolution: "" },
      };
      const result = ComplaintSubmissionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("falla si requestedResolution es solo espacios", () => {
      const payload = {
        ...validBase,
        complaint: { kind: "complaint", facts: "Mala atención", requestedResolution: "   " },
      };
      const result = ComplaintSubmissionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe("Representante", () => {
    const validRepresentative = {
      firstNames: "Ana",
      lastNames: "Gómez",
      documentType: "dni",
      documentNumber: "87654321",
      relationship: "father",
    };

    it("pasa para adulto sin representative", () => {
      const result = ComplaintSubmissionSchema.safeParse(validBase);
      expect(result.success).toBe(true);
    });

    it("falla para adulto con representative completo", () => {
      const payload = {
        ...validBase,
        consumer: { ...validBase.consumer, representative: validRepresentative },
      };
      const result = ComplaintSubmissionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("falla para adulto con representative null", () => {
      const payload = {
        ...validBase,
        consumer: { ...validBase.consumer, representative: null },
      };
      const result = ComplaintSubmissionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("falla para menor sin representative", () => {
      const payload = {
        ...validBase,
        consumer: { ...validBase.consumer, isMinor: true },
      };
      const result = ComplaintSubmissionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("falla para menor con representative incompleto", () => {
      const payload = {
        ...validBase,
        consumer: { ...validBase.consumer, isMinor: true, representative: { firstNames: "Ana" } },
      };
      const result = ComplaintSubmissionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("pasa para menor con representative completo", () => {
      const payload = {
        ...validBase,
        consumer: { ...validBase.consumer, isMinor: true, representative: validRepresentative },
      };
      const result = ComplaintSubmissionSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe("Monto y aplicabilidad (amountApplicability)", () => {
    it("falla si amount es applicable pero no se envía el amount", () => {
      const payload = {
        ...validBase,
        subject: { ...validBase.subject, amountApplicability: "applicable", amount: null },
      };
      const result = ComplaintSubmissionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("pasa si amount es not_applicable y amount es null", () => {
      const payload = {
        ...validBase,
        subject: { ...validBase.subject, amountApplicability: "not_applicable", amount: null },
      };
      const result = ComplaintSubmissionSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("pasa si amount es unknown y amount es null", () => {
      const payload = {
        ...validBase,
        subject: { ...validBase.subject, amountApplicability: "unknown", amount: null },
      };
      const result = ComplaintSubmissionSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("falla si el monto es negativo", () => {
      const payload = {
        ...validBase,
        subject: { ...validBase.subject, amount: "-100.00" },
      };
      const result = ComplaintSubmissionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("pasa si el monto decimal es válido como string", () => {
      const payload = {
        ...validBase,
        subject: { ...validBase.subject, amount: "1500.50" },
      };
      const result = ComplaintSubmissionSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe("Confirmación (confirmation)", () => {
    it("falla si submissionConfirmed es false", () => {
      const payload = {
        ...validBase,
        confirmation: { ...validBase.confirmation, submissionConfirmed: false },
      };
      const result = ComplaintSubmissionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("falla si truthfulnessConfirmed es false", () => {
      const payload = {
        ...validBase,
        confirmation: { ...validBase.confirmation, truthfulnessConfirmed: false },
      };
      const result = ComplaintSubmissionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("pasa si emailDeliveryRequested es false (es opcional normativamente para BúhoLex en el contrato base)", () => {
      const payload = {
        ...validBase,
        confirmation: { ...validBase.confirmation, emailDeliveryRequested: false },
      };
      const result = ComplaintSubmissionSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe("Strict Mode", () => {
    it("falla si el payload público intenta incluir providerResponse", () => {
      const payload = {
        ...validBase,
        providerResponse: { responseText: "Respondido" },
      };
      const result = ComplaintSubmissionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("falla con propiedades arbitrarias no autorizadas", () => {
      const payload = {
        ...validBase,
        status: "closed",
        isAdmin: true,
      };
      const result = ComplaintSubmissionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe("ComplaintProviderResponse", () => {
    const validResponse = {
      respondedAt: "2026-08-05T12:00:00Z",
      responseChannel: "email",
      responderName: "Juan Administrador",
      responderRole: "Asesor Legal",
    };

    it("pasa con un ComplaintProviderResponse completo", () => {
      const result = ComplaintProviderResponseSchema.safeParse({
        ...validResponse,
        responseText: "Hemos revisado su caso...",
        actionsTaken: "Se emitirá un reembolso.",
        deliveryEvidenceReference: "MSG-12345",
      });
      expect(result.success).toBe(true);
    });

    it("falla si tanto responseText como actionsTaken están ausentes", () => {
      const result = ComplaintProviderResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(false);
    });

    it("pasa si solo hay responseText", () => {
      const result = ComplaintProviderResponseSchema.safeParse({
        ...validResponse,
        responseText: "Texto de respuesta",
      });
      expect(result.success).toBe(true);
    });

    it("pasa si solo hay actionsTaken", () => {
      const result = ComplaintProviderResponseSchema.safeParse({
        ...validResponse,
        actionsTaken: "Acciones adoptadas",
      });
      expect(result.success).toBe(true);
    });

    it("pasa si deliveryEvidenceReference está omitido", () => {
      const result = ComplaintProviderResponseSchema.safeParse({
        ...validResponse,
        responseText: "Texto",
      });
      expect(result.success).toBe(true);
    });

    it("falla si la fecha respondida es inválida", () => {
      const result = ComplaintProviderResponseSchema.safeParse({
        ...validResponse,
        responseText: "Texto",
        respondedAt: "no-es-una-fecha",
      });
      expect(result.success).toBe(false);
    });
  });
});
