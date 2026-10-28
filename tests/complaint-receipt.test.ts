import { describe, it, expect } from "vitest";
import {
  buildComplaintReceiptData,
  buildComplaintReceiptFromSnapshot,
  generateComplaintReceiptHtml,
  formatLimaDateTime,
  escapeHtml,
  ComplaintReceiptInvalidDateError,
  type BuildComplaintReceiptInput,
} from "@/lib/complaints/complaint-receipt";

describe("Copia y Constancia de la Hoja de Reclamación", () => {
  const sampleV2Input: BuildComplaintReceiptInput = {
    sheetNumber: "LR-2026-000042",
    submittedAt: "2026-10-28T15:30:00.000Z",
    consumer: {
      consumerType: "natural_person",
      firstNames: "María Elena",
      lastNames: "García López",
      documentType: "dni",
      documentNumber: "45678912",
      email: "maria.garcia@example.com",
      phone: "987654321",
      address: "Av. Larco 456, Miraflores, Lima",
    },
    subject: {
      kind: "servicio",
      description: "Contrato de consultoría legal digital",
      amountApplicability: "applicable",
      amount: 350.5,
      currency: "PEN",
      referenceNumber: "ORD-9871",
      transactionDate: "2026-10-25",
    },
    complaint: {
      kind: "reclamo",
      facts: "Se generó un cobro sin habilitar el acceso al informe acordado en el plazo convenido.",
      requestedResolution: "Entrega del informe legal o reembolso integral del importe abonado.",
    },
  };

  describe("buildComplaintReceiptData", () => {
    it("construye la constancia con todos los campos legales obligatorios para persona natural", () => {
      const receipt = buildComplaintReceiptData(sampleV2Input);

      expect(receipt.sheetNumber).toBe("LR-2026-000042");
      expect(receipt.initialStatus).toBe("Recibido");
      expect(receipt.provider.name).toBe("BúhoLex");
      expect(receipt.provider.legalName).toContain("JULITA S.A.C.");
      expect(receipt.provider.ruc).toBe("20571585902");
      expect(receipt.consumer.fullNameOrLegalName).toBe("María Elena García López");
      expect(receipt.consumer.documentType).toBe("DNI");
      expect(receipt.consumer.documentNumber).toBe("45678912");
      expect(receipt.consumer.email).toBe("maria.garcia@example.com");
      expect(receipt.consumer.address).toBe("Av. Larco 456, Miraflores, Lima");
      expect(receipt.subject.kindLabel).toBe("Servicio");
      expect(receipt.subject.description).toBe("Contrato de consultoría legal digital");
      expect(receipt.subject.amountDisplay).toBe("PEN 350.50");
      expect(receipt.complaint.kindLabel).toBe("Reclamo");
      expect(receipt.complaint.facts).toBe(sampleV2Input.complaint.facts);
      expect(receipt.complaint.requestedResolution).toBe(sampleV2Input.complaint.requestedResolution);
      expect(receipt.legalTerms.deadlineDays).toBe(15);
      expect(receipt.legalTerms.deadlineNotice).toContain("quince (15) días hábiles");
    });

    it("soporta consumidor menor de edad con datos de representante legal", () => {
      const minorInput: BuildComplaintReceiptInput = {
        ...sampleV2Input,
        consumer: {
          ...sampleV2Input.consumer,
          isMinor: true,
          representative: {
            firstNames: "Carlos",
            lastNames: "García Morales",
            documentType: "dni",
            documentNumber: "08976543",
            relationship: "Padre",
          },
        },
      };

      const receipt = buildComplaintReceiptData(minorInput);
      expect(receipt.consumer.representative).toBeDefined();
      expect(receipt.consumer.representative?.fullName).toBe("Carlos García Morales");
      expect(receipt.consumer.representative?.documentType).toBe("DNI");
      expect(receipt.consumer.representative?.documentNumber).toBe("08976543");
      expect(receipt.consumer.representative?.roleOrRelationship).toBe("Padre");
    });

    it("soporta persona jurídica con RUC y representante legal", () => {
      const legalEntityInput: BuildComplaintReceiptInput = {
        ...sampleV2Input,
        consumer: {
          consumerType: "legal_entity",
          legalName: "Inversiones del Norte S.A.C.",
          ruc: "20123456789",
          representativeFirstNames: "Ana",
          representativeLastNames: "Rojas Mendoza",
          representativeDocumentType: "ce",
          representativeDocumentNumber: "001234567",
          representativeRole: "Gerente General",
          email: "contacto@inversionesnorte.pe",
          address: "Calle Los Álamos 123, San Isidro",
        },
      };

      const receipt = buildComplaintReceiptData(legalEntityInput);
      expect(receipt.consumer.consumerType).toBe("legal_entity");
      expect(receipt.consumer.fullNameOrLegalName).toBe("Inversiones del Norte S.A.C.");
      expect(receipt.consumer.documentType).toBe("RUC");
      expect(receipt.consumer.documentNumber).toBe("20123456789");
      expect(receipt.consumer.representative?.fullName).toBe("Ana Rojas Mendoza");
      expect(receipt.consumer.representative?.documentType).toBe("CE");
      expect(receipt.consumer.representative?.documentNumber).toBe("001234567");
      expect(receipt.consumer.representative?.roleOrRelationship).toBe("Gerente General");
    });

    it("soporta quejas (malestar en atención) y monto no aplicable", () => {
      const quejaInput: BuildComplaintReceiptInput = {
        ...sampleV2Input,
        subject: {
          kind: "servicio",
          description: "Atención al usuario en plataforma",
          amountApplicability: "not_applicable",
          amount: null,
        },
        complaint: {
          kind: "queja",
          facts: "Falta de respuesta oportuna en el canal de soporte técnico.",
          requestedResolution: "Mejora en los tiempos de respuesta y aclaración formal.",
        },
      };

      const receipt = buildComplaintReceiptData(quejaInput);
      expect(receipt.complaint.kindLabel).toBe("Queja");
      expect(receipt.subject.amountDisplay).toBe("No aplicable");
    });

    it("garantiza que la constancia NO contiene hashes, secretos ni tokens privados", () => {
      const receipt = buildComplaintReceiptData(sampleV2Input);
      const json = JSON.stringify(receipt);

      expect(json).not.toContain("privateToken");
      expect(json).not.toContain("privateTokenHash");
      expect(json).not.toContain("idempotencyKey");
      expect(json).not.toContain("idempotencyKeyHash");
      expect(json).not.toContain("payloadHash");
      expect(json).not.toContain("audit");
      expect(json).not.toContain("secret");
    });
  });

  describe("generateComplaintReceiptHtml", () => {
    it("genera HTML5 válido, accesible e imprimible con toda la información", () => {
      const receipt = buildComplaintReceiptData(sampleV2Input);
      const html = generateComplaintReceiptHtml(receipt);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain('<html lang="es">');
      expect(html).toContain("<title>Hoja de Reclamación LR-2026-000042 - BúhoLex</title>");
      expect(html).toContain("LR-2026-000042");
      expect(html).toContain("20571585902");
      expect(html).toContain("María Elena García López");
      expect(html).toContain("DNI: 45678912");
      expect(html).toContain("Contrato de consultoría legal digital");
      expect(html).toContain("PEN 350.50");
      expect(html).toContain("RECLAMO");
      expect(html).toContain("quince (15) días hábiles");
      expect(html).toContain("window.print()");
      expect(html).toContain("@media print");
    });

    it("escapa caracteres especiales en HTML para prevenir inyecciones XSS", () => {
      const maliciousInput: BuildComplaintReceiptInput = {
        ...sampleV2Input,
        consumer: {
          ...sampleV2Input.consumer,
          firstNames: 'Pedro <script>alert("xss")</script>',
          lastNames: 'O\'Connor & "Partners"',
        },
        complaint: {
          kind: "reclamo",
          facts: 'Hechos con <b>HTML</b> & caracteres "especiales".',
          requestedResolution: "Solución con <img src=x onerror=alert(1)>",
        },
      };

      const receipt = buildComplaintReceiptData(maliciousInput);
      const html = generateComplaintReceiptHtml(receipt);

      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
      expect(html).not.toContain("<img src=x");
      expect(html).toContain("&lt;img src=x");
      expect(html).toContain("&amp;");
      expect(html).toContain("&#039;Connor");
    });

    it("no incluye rutas de enumeración ni tokens privados en el HTML", () => {
      const receipt = buildComplaintReceiptData(sampleV2Input);
      const html = generateComplaintReceiptHtml(receipt);

      expect(html).not.toMatch(/\/complaints\/\d+/);
      expect(html).not.toContain("privateToken");
      expect(html).not.toContain("idempotencyKey");
      expect(html).not.toContain("hash");
    });
  });

  describe("formatLimaDateTime y fecha canónica", () => {
    it("formatea correctamente fecha en zona horaria America/Lima", () => {
      // 2026-10-28T15:30:00Z is 10:30:00 in Lima (UTC-5)
      const formatted = formatLimaDateTime("2026-10-28T15:30:00.000Z");
      expect(formatted).toBe("28/10/2026, 10:30:00");
    });

    it("funciona con objeto Date canónico", () => {
      const d = new Date("2026-08-06T12:00:00.000Z"); // 07:00:00 Lima
      const formatted = formatLimaDateTime(d);
      expect(formatted).toBe("06/08/2026, 07:00:00");
    });

    it("rechaza fecha faltante o vacía lanzando ComplaintReceiptInvalidDateError", () => {
      expect(() => formatLimaDateTime("")).toThrow(ComplaintReceiptInvalidDateError);
      expect(() => formatLimaDateTime(null)).toThrow(ComplaintReceiptInvalidDateError);
      expect(() => formatLimaDateTime(undefined)).toThrow(ComplaintReceiptInvalidDateError);
    });

    it("rechaza fecha inválida lanzando ComplaintReceiptInvalidDateError", () => {
      expect(() => formatLimaDateTime("fecha-invalida")).toThrow(ComplaintReceiptInvalidDateError);
      expect(() => formatLimaDateTime(new Date("invalid"))).toThrow(ComplaintReceiptInvalidDateError);
    });

    it("el reloj del navegador es irrelevante porque submittedAt es obligatorio y del servidor", () => {
      const inputWithoutDate: BuildComplaintReceiptInput = {
        ...sampleV2Input,
        submittedAt: "",
      };
      expect(() => buildComplaintReceiptData(inputWithoutDate)).toThrow(ComplaintReceiptInvalidDateError);
    });
  });

  describe("HTML escaping y seguridad", () => {
    it("escapa rigurosamente payloads maliciosos y caracteres especiales", () => {
      expect(escapeHtml("<script>alert(1)</script>")).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
      expect(escapeHtml("<img src=x onerror=alert(1)>")).toBe("&lt;img src=x onerror=alert(1)&gt;");
      expect(escapeHtml('"&<>\'')).toBe("&quot;&amp;&lt;&gt;&#039;");
    });
  });

  describe("buildComplaintReceiptFromSnapshot", () => {
    it("construye constancia fidedigna desde snapshot V2 persistido", () => {
      const v2Snapshot = {
        schemaVersion: "2.0",
        consumer: {
          consumerType: "natural_person",
          firstNames: "María",
          lastNames: "García",
          documentType: "dni",
          documentNumber: "12345678",
          email: "maria@example.com",
          address: "Av. 123",
        },
        subject: {
          kind: "servicio",
          description: "Consultoría",
          amountApplicability: "not_applicable",
        },
        complaint: {
          kind: "reclamo",
          facts: "Hechos originales",
          requestedResolution: "Solución solicitada",
        },
        declarations: {
          truthfulnessConfirmed: true,
          emailDeliveryRequested: false,
        },
        legalContext: {
          privacyNoticePresented: true,
          privacyPolicyVersion: "1.0",
          privacyPolicyPublishedAt: "2026-10-28",
          privacyPolicyEffectiveAt: "2026-10-28",
          privacyPolicyPath: "/privacidad",
        },
      };

      const receipt = buildComplaintReceiptFromSnapshot({
        sheetNumber: "LR-2026-000001",
        submittedAt: new Date("2026-10-28T15:30:00Z"),
        payloadSnapshot: v2Snapshot,
      });

      expect(receipt.sheetNumber).toBe("LR-2026-000001");
      expect(receipt.consumer.fullNameOrLegalName).toBe("María García");
      expect(receipt.subject.description).toBe("Consultoría");
      expect(receipt.complaint.facts).toBe("Hechos originales");
      expect(receipt.submittedAt).toBe("28/10/2026, 10:30:00");
    });

    it("construye constancia fidedigna desde snapshot V1 histórico", () => {
      const v1Snapshot = {
        schemaVersion: "1.0",
        consumer: {
          consumerType: "natural_person",
          firstNames: "Juan",
          lastNames: "Pérez",
          documentType: "dni",
          documentNumber: "87654321",
          email: "juan@example.com",
          address: "Av. 456",
        },
        subject: {
          kind: "product",
          description: "Producto V1",
        },
        complaint: {
          kind: "claim",
          facts: "Hechos V1",
          requestedResolution: "Solución V1",
        },
        confirmation: {
          truthfulnessConfirmed: true,
          submissionConfirmed: true,
          emailDeliveryRequested: false,
        },
      };

      const receipt = buildComplaintReceiptFromSnapshot({
        sheetNumber: "LR-2025-000099",
        submittedAt: "2025-05-10T12:00:00Z",
        payloadSnapshot: v1Snapshot,
      });

      expect(receipt.sheetNumber).toBe("LR-2025-000099");
      expect(receipt.consumer.fullNameOrLegalName).toBe("Juan Pérez");
      expect(receipt.subject.kindLabel).toBe("Producto");
      expect(receipt.complaint.kindLabel).toBe("Reclamo");
    });

    it("lanza error controlado ante snapshots corruptos o incompletos", () => {
      expect(() =>
        buildComplaintReceiptFromSnapshot({
          sheetNumber: "LR-2026-000001",
          submittedAt: new Date(),
          payloadSnapshot: null,
        })
      ).toThrow("complaint_receipt_invalid_snapshot");

      expect(() =>
        buildComplaintReceiptFromSnapshot({
          sheetNumber: "LR-2026-000001",
          submittedAt: new Date(),
          payloadSnapshot: { schemaVersion: "2.0" },
        })
      ).toThrow("complaint_receipt_invalid_consumer");
    });
  });
});
