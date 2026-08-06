import { describe, it, expect } from "vitest";
import {
  ComplaintSubmissionSchema,
  ComplaintProviderResponseSchema,
  buildComplaintSubmission
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

  describe("Builder: buildComplaintSubmission", () => {
    const builderBase = {
      schemaVersion: "1.0",
      idempotencyKey: "12345678",
      consumer: {
        consumerType: "natural_person",
        firstNames: " Juan ",
        lastNames: "Pérez",
        documentType: "dni",
        documentNumber: "12345678",
        email: "juan@example.com",
        address: "Lima, Perú",
        isMinor: false,
      },
      subject: {
        kind: "product",
        description: " Laptop defectuosa ",
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
        emailDeliveryRequested: false,
      },
    };

    it("raíz ordinaria válida", () => {
      const result = buildComplaintSubmission(builderBase);
      expect(result.ok).toBe(true);
    });

    it("raíz con prototipo null", () => {
      const input = Object.create(null);
      Object.assign(input, builderBase);
      const result = buildComplaintSubmission(input);
      expect(result.ok).toBe(false);
    });

    it("raíz como instancia de clase", () => {
      class Payload {
        schemaVersion = "1.0";
        idempotencyKey = "12345678";
        consumer = builderBase.consumer;
        subject = builderBase.subject;
        complaint = builderBase.complaint;
        confirmation = builderBase.confirmation;
      }
      const input = new Payload();
      const result = buildComplaintSubmission(input);
      expect(result.ok).toBe(false);
    });

    it("arreglos (arrays) son rechazados", () => {
      const result = buildComplaintSubmission([]);
      expect(result.ok).toBe(false);
    });

    it("getter conocido en raíz", () => {
      let getterExecutions = 0;
      let setterExecutions = 0;
      const input = { ...builderBase };
      Object.defineProperty(input, "schemaVersion", {
        get() { getterExecutions++; return "1.0"; },
        set() { setterExecutions++; },
        enumerable: true
      });
      const result = buildComplaintSubmission(input);
      expect(result.ok).toBe(false);
      expect(getterExecutions).toBe(0);
      expect(setterExecutions).toBe(0);
    });

    it("getter desconocido en raíz", () => {
      let getterExecutions = 0;
      let setterExecutions = 0;
      const input = { ...builderBase };
      Object.defineProperty(input, "rootExtra", {
        get() { getterExecutions++; return "hack"; },
        set() { setterExecutions++; },
        enumerable: true
      });
      const result = buildComplaintSubmission(input);
      expect(result.ok).toBe(true);
      expect(getterExecutions).toBe(0);
      expect(setterExecutions).toBe(0);
    });

    it("getter conocido en consumer", () => {
      let getterExecutions = 0;
      let setterExecutions = 0;
      const input = { ...builderBase, consumer: { ...builderBase.consumer } };
      Object.defineProperty(input.consumer, "email", {
        get() { getterExecutions++; return "juan@example.com"; },
        set() { setterExecutions++; },
        enumerable: true
      });
      const result = buildComplaintSubmission(input);
      expect(result.ok).toBe(false);
      expect(getterExecutions).toBe(0);
      expect(setterExecutions).toBe(0);
    });

    it("getter desconocido en consumer", () => {
      let getterExecutions = 0;
      let setterExecutions = 0;
      const input = { ...builderBase, consumer: { ...builderBase.consumer } };
      Object.defineProperty(input.consumer, "consumerExtra", {
        get() { getterExecutions++; return "hack"; },
        set() { setterExecutions++; },
        enumerable: true
      });
      const result = buildComplaintSubmission(input);
      expect(result.ok).toBe(true);
      expect(getterExecutions).toBe(0);
      expect(setterExecutions).toBe(0);
    });

    it("getter en representative", () => {
      let getterExecutions = 0;
      let setterExecutions = 0;
      const input = { ...builderBase, consumer: { ...builderBase.consumer, isMinor: true, representative: { firstNames: "Ana", lastNames: "Gómez", documentType: "dni", documentNumber: "87654321", relationship: "father" } } };
      Object.defineProperty(input.consumer.representative, "firstNames", {
        get() { getterExecutions++; return "Ana"; },
        set() { setterExecutions++; },
        enumerable: true
      });
      const result = buildComplaintSubmission(input);
      expect(result.ok).toBe(false);
      expect(getterExecutions).toBe(0);
      expect(setterExecutions).toBe(0);
    });

    it("getter en subject", () => {
      let getterExecutions = 0;
      let setterExecutions = 0;
      const input = { ...builderBase, subject: { ...builderBase.subject } };
      Object.defineProperty(input.subject, "amount", {
        get() { getterExecutions++; return "1500.00"; },
        set() { setterExecutions++; },
        enumerable: true
      });
      const result = buildComplaintSubmission(input);
      expect(result.ok).toBe(false);
      expect(getterExecutions).toBe(0);
      expect(setterExecutions).toBe(0);
    });

    it("getter en complaint", () => {
      let getterExecutions = 0;
      let setterExecutions = 0;
      const input = { ...builderBase, complaint: { ...builderBase.complaint } };
      Object.defineProperty(input.complaint, "facts", {
        get() { getterExecutions++; return "La laptop no enciende."; },
        set() { setterExecutions++; },
        enumerable: true
      });
      const result = buildComplaintSubmission(input);
      expect(result.ok).toBe(false);
      expect(getterExecutions).toBe(0);
      expect(setterExecutions).toBe(0);
    });

    it("getter en confirmation", () => {
      let getterExecutions = 0;
      let setterExecutions = 0;
      const input = { ...builderBase, confirmation: { ...builderBase.confirmation } };
      Object.defineProperty(input.confirmation, "truthfulnessConfirmed", {
        get() { getterExecutions++; return true; },
        set() { setterExecutions++; },
        enumerable: true
      });
      const result = buildComplaintSubmission(input);
      expect(result.ok).toBe(false);
      expect(getterExecutions).toBe(0);
      expect(setterExecutions).toBe(0);
    });

    it("schemaVersion tratado explícitamente", () => {
      const input = { ...builderBase, schemaVersion: "2.0" };
      const result = buildComplaintSubmission(input);
      expect(result.ok).toBe(false);
    });

    it("confirmation tratado explícitamente", () => {
      const input = { ...builderBase, confirmation: { truthfulnessConfirmed: true, submissionConfirmed: true, emailDeliveryRequested: false } };
      const result = buildComplaintSubmission(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.confirmation).toBeDefined();
        expect(result.value.confirmation.truthfulnessConfirmed).toBe(true);
      }
    });

    it("claves desconocidas no copiadas", () => {
      const input = { ...builderBase, rootExtra: "extra" };
      const result = buildComplaintSubmission(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).not.toHaveProperty("rootExtra");
      }
    });

    it("persona natural sin propiedades jurídicas", () => {
      const input = { ...builderBase, consumer: { ...builderBase.consumer, ruc: "20123456789", legalName: "Falsa" } };
      const result = buildComplaintSubmission(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.consumer).not.toHaveProperty("ruc");
        expect(result.value.consumer).not.toHaveProperty("legalName");
      }
    });

    it("persona jurídica sin propiedades naturales", () => {
      const input = {
        ...builderBase,
        consumer: {
          consumerType: "legal_entity",
          legalName: "Empresa S.A.",
          ruc: "20123456789",
          email: "empresa@example.com",
          address: "Lima",
          representativeFirstNames: "Ana",
          representativeLastNames: "Gómez",
          representativeDocumentType: "dni",
          representativeDocumentNumber: "87654321",
          representativeRole: "Gerente",
          firstNames: "Extra",
          lastNames: "Extra"
        }
      };
      const result = buildComplaintSubmission(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.consumer).not.toHaveProperty("firstNames");
        expect(result.value.consumer).not.toHaveProperty("lastNames");
      }
    });

    it("opcionales ausentes no creados", () => {
      const input = { ...builderBase };
      const result = buildComplaintSubmission(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Object.keys(result.value.consumer)).not.toContain("phone");
      }
    });

    it("undefined no creado", () => {
      const input = { ...builderBase, consumer: { ...builderBase.consumer, phone: undefined } };
      const result = buildComplaintSubmission(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Object.keys(result.value.consumer)).not.toContain("phone");
      }
    });

    it("null conservado", () => {
      const input = { ...builderBase, subject: { ...builderBase.subject, amountApplicability: "not_applicable", amount: null } };
      const result = buildComplaintSubmission(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.subject).toHaveProperty("amount", null);
      }
    });

    it("false conservado", () => {
      const input = { ...builderBase, consumer: { ...builderBase.consumer, isMinor: false } };
      const result = buildComplaintSubmission(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.consumer).toHaveProperty("isMinor", false);
      }
    });

    it("0 conservado", () => {
      const input = { ...builderBase, consumer: { ...builderBase.consumer, consumerType: "natural_person", documentNumber: 0 } };
      const result = buildComplaintSubmission(input);
      expect(result.ok).toBe(false);
      // It is preserved, which makes the strict schema fail because documentNumber should be a string.
    });

    it("string vacío tratado según normalizador", () => {
      const input = { ...builderBase, consumer: { ...builderBase.consumer, firstNames: "  " } };
      const result = buildComplaintSubmission(input);
      expect(result.ok).toBe(false);
      // Zod schema length validation fails
    });

    it("entrada no mutada", () => {
      const input = { ...builderBase };
      const originalJson = JSON.stringify(input);
      buildComplaintSubmission(input);
      expect(JSON.stringify(input)).toBe(originalJson);
    });

    it("salida compatible con .strict()", () => {
      const result = buildComplaintSubmission(builderBase);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const strictCheck = ComplaintSubmissionSchema.safeParse(result.value);
        expect(strictCheck.success).toBe(true);
      }
    });

    it("ausencia de iteraciones abiertas verificada dinámicamente", () => {
      const oldKeys = Object.keys;
      let usedKeys = false;
      Object.keys = (obj: object) => { usedKeys = true; return oldKeys(obj); };

      const oldEntries = Object.entries;
      let usedEntries = false;
      Object.entries = (obj: { [s: string]: unknown } | ArrayLike<unknown>) => { usedEntries = true; return oldEntries(obj); };

      try {
        buildComplaintSubmission(builderBase);
        expect(usedKeys).toBe(false);
        expect(usedEntries).toBe(false);
      } finally {
        Object.keys = oldKeys;
        Object.entries = oldEntries;
      }
    });

    it("ausencia de JSON cloning", () => {
      const oldParse = JSON.parse;
      let usedParse = false;
      JSON.parse = (text: string) => { usedParse = true; return oldParse(text); };

      try {
        buildComplaintSubmission(builderBase);
        expect(usedParse).toBe(false);
      } finally {
        JSON.parse = oldParse;
      }
    });
  });
});
