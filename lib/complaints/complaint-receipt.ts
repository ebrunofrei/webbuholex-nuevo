import { siteConfig } from "@/lib/site-config";

export interface ConsumerReceiptInput {
  readonly consumerType: "natural_person" | "legal_entity";
  readonly firstNames?: string | null | undefined;
  readonly lastNames?: string | null | undefined;
  readonly documentType?: string | null | undefined;
  readonly documentNumber?: string | null | undefined;
  readonly isMinor?: boolean | null | undefined;
  readonly representative?: {
    readonly firstNames?: string | null | undefined;
    readonly lastNames?: string | null | undefined;
    readonly documentType?: string | null | undefined;
    readonly documentNumber?: string | null | undefined;
    readonly relationship?: string | null | undefined;
  } | null | undefined;
  readonly legalName?: string | null | undefined;
  readonly ruc?: string | null | undefined;
  readonly representativeFirstNames?: string | null | undefined;
  readonly representativeLastNames?: string | null | undefined;
  readonly representativeDocumentType?: string | null | undefined;
  readonly representativeDocumentNumber?: string | null | undefined;
  readonly representativeRole?: string | null | undefined;
  readonly email: string;
  readonly phone?: string | null | undefined;
  readonly address: string;
}

export interface SubjectReceiptInput {
  readonly kind: "product" | "service" | "producto" | "servicio";
  readonly description: string;
  readonly amountApplicability?: "applicable" | "not_applicable" | "unknown" | null | undefined;
  readonly amount?: string | number | null | undefined;
  readonly currency?: string | null | undefined;
  readonly transactionDate?: string | null | undefined;
  readonly referenceNumber?: string | null | undefined;
  readonly channel?: string | null | undefined;
}

export interface ComplaintDetailReceiptInput {
  readonly kind: "claim" | "complaint" | "reclamo" | "queja";
  readonly facts: string;
  readonly requestedResolution: string;
}

export interface BuildComplaintReceiptInput {
  readonly sheetNumber: string;
  readonly submittedAt: Date | string;
  readonly consumer: ConsumerReceiptInput;
  readonly subject: SubjectReceiptInput;
  readonly complaint: ComplaintDetailReceiptInput;
}

export interface ComplaintReceiptData {
  readonly sheetNumber: string;
  readonly submittedAt: string;
  readonly initialStatus: string;
  readonly provider: {
    readonly name: string;
    readonly legalName: string;
    readonly ruc: string;
    readonly legalAddress: string;
    readonly contactEmail: string;
  };
  readonly consumer: {
    readonly consumerType: "natural_person" | "legal_entity";
    readonly fullNameOrLegalName: string;
    readonly documentType: string;
    readonly documentNumber: string;
    readonly email: string;
    readonly phone?: string | undefined;
    readonly address: string;
    readonly representative?: {
      readonly fullName: string;
      readonly documentType: string;
      readonly documentNumber: string;
      readonly roleOrRelationship: string;
    } | undefined;
  };
  readonly subject: {
    readonly kind: "producto" | "servicio";
    readonly kindLabel: string;
    readonly description: string;
    readonly amountDisplay: string;
    readonly transactionDate?: string | undefined;
    readonly referenceNumber?: string | undefined;
    readonly channel?: string | undefined;
  };
  readonly complaint: {
    readonly kind: "reclamo" | "queja";
    readonly kindLabel: string;
    readonly facts: string;
    readonly requestedResolution: string;
  };
  readonly legalTerms: {
    readonly deadlineDays: number;
    readonly deadlineNotice: string;
    readonly legalBasisNotice: string;
    readonly indecopiNotice: string;
  };
}

export class ComplaintReceiptInvalidDateError extends Error {
  readonly code = "complaint_receipt_invalid_date";
  constructor(message: string = "Fecha de presentación faltante o inválida para la constancia canónica") {
    super(message);
    this.name = "ComplaintReceiptInvalidDateError";
  }
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatLimaDateTime(dateInput: Date | string | null | undefined): string {
  if (!dateInput) {
    throw new ComplaintReceiptInvalidDateError("Fecha de presentación faltante para la constancia canónica");
  }
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) {
    throw new ComplaintReceiptInvalidDateError("Fecha de presentación inválida para la constancia canónica");
  }
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function mapDocumentType(docType?: string | null): string {
  if (!docType) return "DNI";
  switch (docType.toLowerCase()) {
    case "dni": return "DNI";
    case "foreign_resident_card": case "ce": return "CE";
    case "passport": case "pasaporte": return "Pasaporte";
    case "ruc": return "RUC";
    default: return docType.toUpperCase();
  }
}

function mapRelationship(rel?: string | null): string {
  if (!rel) return "Padre / Madre / Tutor";
  switch (rel.toLowerCase()) {
    case "father": return "Padre";
    case "mother": return "Madre";
    case "guardian": return "Tutor";
    case "legal_representative": return "Representante legal";
    case "other": return "Otro representante";
    default: return rel;
  }
}

export function buildComplaintReceiptData(input: BuildComplaintReceiptInput): ComplaintReceiptData {
  if (!input.sheetNumber || typeof input.sheetNumber !== "string") {
    throw new Error("complaint_receipt_invalid_sheet_number");
  }

  // Consumer formatting
  let fullNameOrLegalName = "";
  let documentType = "";
  let documentNumber = "";
  let representativeData: ComplaintReceiptData["consumer"]["representative"] | undefined = undefined;

  if (input.consumer.consumerType === "natural_person") {
    fullNameOrLegalName = [input.consumer.firstNames, input.consumer.lastNames].filter(Boolean).join(" ").trim();
    documentType = mapDocumentType(input.consumer.documentType);
    documentNumber = input.consumer.documentNumber || "";

    if (input.consumer.isMinor && input.consumer.representative) {
      representativeData = {
        fullName: [input.consumer.representative.firstNames, input.consumer.representative.lastNames].filter(Boolean).join(" ").trim(),
        documentType: mapDocumentType(input.consumer.representative.documentType),
        documentNumber: input.consumer.representative.documentNumber || "",
        roleOrRelationship: mapRelationship(input.consumer.representative.relationship),
      };
    }
  } else {
    fullNameOrLegalName = input.consumer.legalName || "";
    documentType = "RUC";
    documentNumber = input.consumer.ruc || "";

    if (input.consumer.representativeFirstNames || input.consumer.representativeLastNames) {
      representativeData = {
        fullName: [input.consumer.representativeFirstNames, input.consumer.representativeLastNames].filter(Boolean).join(" ").trim(),
        documentType: mapDocumentType(input.consumer.representativeDocumentType),
        documentNumber: input.consumer.representativeDocumentNumber || "",
        roleOrRelationship: input.consumer.representativeRole || "Representante legal",
      };
    }
  }

  // Subject amount formatting
  let amountDisplay = "No aplicable";
  if (input.subject.amountApplicability === "applicable" && input.subject.amount !== null && input.subject.amount !== undefined) {
    const curr = input.subject.currency || "PEN";
    const amt = typeof input.subject.amount === "number" ? input.subject.amount.toFixed(2) : String(input.subject.amount);
    amountDisplay = `${curr} ${amt}`;
  }

  const isService = input.subject.kind === "service" || input.subject.kind === "servicio";
  const normalizedSubjectKind: "producto" | "servicio" = isService ? "servicio" : "producto";
  const kindLabelSubject = isService ? "Servicio" : "Producto";

  const isQueja = input.complaint.kind === "complaint" || input.complaint.kind === "queja";
  const normalizedComplaintKind: "reclamo" | "queja" = isQueja ? "queja" : "reclamo";
  const kindLabelComplaint = isQueja ? "Queja" : "Reclamo";

  return {
    sheetNumber: input.sheetNumber,
    submittedAt: formatLimaDateTime(input.submittedAt),
    initialStatus: "Recibido",
    provider: {
      name: siteConfig.tradeName,
      legalName: siteConfig.legalName,
      ruc: siteConfig.ruc,
      legalAddress: siteConfig.legalAddress,
      contactEmail: siteConfig.complaintsContact,
    },
    consumer: {
      consumerType: input.consumer.consumerType,
      fullNameOrLegalName,
      documentType,
      documentNumber,
      email: input.consumer.email,
      phone: input.consumer.phone ? input.consumer.phone : undefined,
      address: input.consumer.address,
      representative: representativeData,
    },
    subject: {
      kind: normalizedSubjectKind,
      kindLabel: kindLabelSubject,
      description: input.subject.description,
      amountDisplay,
      transactionDate: input.subject.transactionDate ? input.subject.transactionDate : undefined,
      referenceNumber: input.subject.referenceNumber ? input.subject.referenceNumber : undefined,
      channel: input.subject.channel ? input.subject.channel : undefined,
    },
    complaint: {
      kind: normalizedComplaintKind,
      kindLabel: kindLabelComplaint,
      facts: input.complaint.facts,
      requestedResolution: input.complaint.requestedResolution,
    },
    legalTerms: {
      deadlineDays: 15,
      deadlineNotice: "El proveedor debe dar respuesta al reclamo o queja en un plazo no mayor a quince (15) días hábiles conforme a la Ley N.° 29571 (Código de Protección y Defensa del Consumidor).",
      legalBasisNotice: "Conforme al Decreto Supremo N.° 011-2011-PCM y normas complementarias, la presente hoja constituye constancia fidedigna de la presentación de la reclamación en el Libro de Reclamaciones Virtual.",
      indecopiNotice: "La formulación del reclamo no excluye el recurso a otros medios de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI.",
    },
  };
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

export function buildComplaintReceiptFromSnapshot(input: {
  readonly sheetNumber: string;
  readonly submittedAt: Date | string;
  readonly payloadSnapshot: unknown;
}): ComplaintReceiptData {
  if (!isPlainObject(input.payloadSnapshot)) {
    throw new Error("complaint_receipt_invalid_snapshot");
  }
  const snap = input.payloadSnapshot;
  if (!isPlainObject(snap.consumer)) {
    throw new Error("complaint_receipt_invalid_consumer");
  }
  if (!isPlainObject(snap.subject)) {
    throw new Error("complaint_receipt_invalid_subject");
  }
  if (!isPlainObject(snap.complaint)) {
    throw new Error("complaint_receipt_invalid_complaint");
  }

  const consumerRaw = snap.consumer;
  const consumerType = consumerRaw.consumerType;
  if (consumerType !== "natural_person" && consumerType !== "legal_entity") {
    throw new Error("complaint_receipt_invalid_consumer_type");
  }

  let repInput: ConsumerReceiptInput["representative"] = undefined;
  if (isPlainObject(consumerRaw.representative)) {
    const rep = consumerRaw.representative;
    repInput = {
      firstNames: typeof rep.firstNames === "string" ? rep.firstNames : undefined,
      lastNames: typeof rep.lastNames === "string" ? rep.lastNames : undefined,
      documentType: typeof rep.documentType === "string" ? rep.documentType : undefined,
      documentNumber: typeof rep.documentNumber === "string" ? rep.documentNumber : undefined,
      relationship: typeof rep.relationship === "string" ? rep.relationship : undefined,
    };
  }

  const consumer: ConsumerReceiptInput = {
    consumerType,
    firstNames: typeof consumerRaw.firstNames === "string" ? consumerRaw.firstNames : undefined,
    lastNames: typeof consumerRaw.lastNames === "string" ? consumerRaw.lastNames : undefined,
    documentType: typeof consumerRaw.documentType === "string" ? consumerRaw.documentType : undefined,
    documentNumber: typeof consumerRaw.documentNumber === "string" ? consumerRaw.documentNumber : undefined,
    isMinor: typeof consumerRaw.isMinor === "boolean" ? consumerRaw.isMinor : undefined,
    representative: repInput,
    legalName: typeof consumerRaw.legalName === "string" ? consumerRaw.legalName : undefined,
    ruc: typeof consumerRaw.ruc === "string" ? consumerRaw.ruc : undefined,
    representativeFirstNames: typeof consumerRaw.representativeFirstNames === "string" ? consumerRaw.representativeFirstNames : undefined,
    representativeLastNames: typeof consumerRaw.representativeLastNames === "string" ? consumerRaw.representativeLastNames : undefined,
    representativeDocumentType: typeof consumerRaw.representativeDocumentType === "string" ? consumerRaw.representativeDocumentType : undefined,
    representativeDocumentNumber: typeof consumerRaw.representativeDocumentNumber === "string" ? consumerRaw.representativeDocumentNumber : undefined,
    representativeRole: typeof consumerRaw.representativeRole === "string" ? consumerRaw.representativeRole : undefined,
    email: typeof consumerRaw.email === "string" ? consumerRaw.email : "",
    phone: typeof consumerRaw.phone === "string" ? consumerRaw.phone : undefined,
    address: typeof consumerRaw.address === "string" ? consumerRaw.address : "",
  };

  const subjectRaw = snap.subject;
  const subjectKind = subjectRaw.kind;
  if (
    subjectKind !== "product" &&
    subjectKind !== "service" &&
    subjectKind !== "producto" &&
    subjectKind !== "servicio"
  ) {
    throw new Error("complaint_receipt_invalid_subject_kind");
  }

  const subject: SubjectReceiptInput = {
    kind: subjectKind,
    description: typeof subjectRaw.description === "string" ? subjectRaw.description : "",
    amountApplicability:
      subjectRaw.amountApplicability === "applicable" ||
      subjectRaw.amountApplicability === "not_applicable" ||
      subjectRaw.amountApplicability === "unknown"
        ? subjectRaw.amountApplicability
        : undefined,
    amount:
      typeof subjectRaw.amount === "number" || typeof subjectRaw.amount === "string"
        ? subjectRaw.amount
        : undefined,
    currency: typeof subjectRaw.currency === "string" ? subjectRaw.currency : undefined,
    transactionDate: typeof subjectRaw.transactionDate === "string" ? subjectRaw.transactionDate : undefined,
    referenceNumber: typeof subjectRaw.referenceNumber === "string" ? subjectRaw.referenceNumber : undefined,
    channel: typeof subjectRaw.channel === "string" ? subjectRaw.channel : undefined,
  };

  const complaintRaw = snap.complaint;
  const complaintKind = complaintRaw.kind;
  if (
    complaintKind !== "claim" &&
    complaintKind !== "complaint" &&
    complaintKind !== "reclamo" &&
    complaintKind !== "queja"
  ) {
    throw new Error("complaint_receipt_invalid_complaint_kind");
  }

  const complaint: ComplaintDetailReceiptInput = {
    kind: complaintKind,
    facts: typeof complaintRaw.facts === "string" ? complaintRaw.facts : "",
    requestedResolution: typeof complaintRaw.requestedResolution === "string" ? complaintRaw.requestedResolution : "",
  };

  return buildComplaintReceiptData({
    sheetNumber: input.sheetNumber,
    submittedAt: input.submittedAt,
    consumer,
    subject,
    complaint,
  });
}

export function generateComplaintReceiptHtml(data: ComplaintReceiptData): string {
  const c = data.consumer;
  const p = data.provider;
  const s = data.subject;
  const r = data.complaint;
  const t = data.legalTerms;

  const repHtml = c.representative
    ? `<tr>
        <td class="label">Representante:</td>
        <td class="value">${escapeHtml(c.representative.fullName)} (${escapeHtml(c.representative.roleOrRelationship)}) - ${escapeHtml(c.representative.documentType)}: ${escapeHtml(c.representative.documentNumber)}</td>
      </tr>`
    : "";

  const txDateHtml = s.transactionDate
    ? `<tr><td class="label">Fecha de transacción:</td><td class="value">${escapeHtml(s.transactionDate)}</td></tr>`
    : "";

  const refNumberHtml = s.referenceNumber
    ? `<tr><td class="label">N.° de comprobante / referencia:</td><td class="value">${escapeHtml(s.referenceNumber)}</td></tr>`
    : "";

  const phoneHtml = c.phone
    ? `<tr><td class="label">Teléfono:</td><td class="value">${escapeHtml(c.phone)}</td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hoja de Reclamación ${escapeHtml(data.sheetNumber)} - BúhoLex</title>
  <style>
    :root {
      --primary: #0f172a;
      --text: #1e293b;
      --text-muted: #64748b;
      --border: #cbd5e1;
      --bg-card: #f8fafc;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: var(--text);
      background-color: #f1f5f9;
      padding: 24px 16px;
      line-height: 1.5;
      font-size: 14px;
    }
    .sheet-container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 2px solid var(--border);
      border-radius: 8px;
      padding: 32px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
    .toolbar {
      max-width: 800px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .print-btn {
      background: #0f172a;
      color: #ffffff;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .print-btn:hover { background: #1e293b; }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      border-bottom: 2px solid var(--primary);
      padding-bottom: 16px;
    }
    .header-table td { vertical-align: top; }
    .brand-title {
      font-size: 24px;
      font-weight: 800;
      color: var(--primary);
      letter-spacing: -0.5px;
    }
    .brand-sub { font-size: 13px; color: var(--text-muted); margin-top: 4px; }
    .sheet-badge {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px 16px;
      text-align: right;
    }
    .sheet-label { font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; }
    .sheet-num { font-size: 18px; font-weight: 800; color: var(--primary); font-family: monospace; }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: var(--bg-card);
      padding: 6px 12px;
      border-left: 4px solid var(--primary);
      margin: 20px 0 10px 0;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    .info-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 13px;
    }
    .info-table td.label {
      width: 220px;
      color: var(--text-muted);
      font-weight: 500;
    }
    .info-table td.value {
      color: var(--text);
      font-weight: 600;
    }
    .text-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
      font-size: 13px;
      white-space: pre-wrap;
      word-break: break-word;
      margin-top: 4px;
      color: var(--text);
      line-height: 1.6;
    }
    .legal-footer {
      margin-top: 28px;
      border-top: 1px solid var(--border);
      padding-top: 16px;
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.6;
    }
    .legal-footer p + p { margin-top: 6px; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .sheet-container { border: none; box-shadow: none; padding: 0; }
      .toolbar { display: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span style="font-weight: 600; color: #475569;">Constancia Digital del Libro de Reclamaciones</span>
    <button class="print-btn" onclick="window.print()">
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
      Imprimir / Guardar PDF
    </button>
  </div>

  <div class="sheet-container">
    <table class="header-table">
      <tr>
        <td>
          <div class="brand-title">LIBRO DE RECLAMACIONES VIRTUAL</div>
          <div class="brand-sub">${escapeHtml(p.legalName)} — RUC N.° ${escapeHtml(p.ruc)}</div>
          <div class="brand-sub">${escapeHtml(p.legalAddress)}</div>
        </td>
        <td style="width: 280px;">
          <div class="sheet-badge">
            <div class="sheet-label">Hoja de Reclamación</div>
            <div class="sheet-num">${escapeHtml(data.sheetNumber)}</div>
            <div class="brand-sub" style="margin-top: 4px;">Fecha: ${escapeHtml(data.submittedAt)}</div>
            <div class="brand-sub">Estado inicial: <strong>${escapeHtml(data.initialStatus)}</strong></div>
          </div>
        </td>
      </tr>
    </table>

    <div class="section-title">1. Identificación del Consumidor Reclamante</div>
    <table class="info-table">
      <tr>
        <td class="label">Nombre / Razón social:</td>
        <td class="value">${escapeHtml(c.fullNameOrLegalName)}</td>
      </tr>
      <tr>
        <td class="label">Documento de identidad:</td>
        <td class="value">${escapeHtml(c.documentType)}: ${escapeHtml(c.documentNumber)}</td>
      </tr>
      <tr>
        <td class="label">Correo electrónico:</td>
        <td class="value">${escapeHtml(c.email)}</td>
      </tr>
      ${phoneHtml}
      <tr>
        <td class="label">Domicilio:</td>
        <td class="value">${escapeHtml(c.address)}</td>
      </tr>
      ${repHtml}
    </table>

    <div class="section-title">2. Identificación del Bien Contratado</div>
    <table class="info-table">
      <tr>
        <td class="label">Tipo de bien:</td>
        <td class="value">${escapeHtml(s.kindLabel)}</td>
      </tr>
      <tr>
        <td class="label">Descripción:</td>
        <td class="value">${escapeHtml(s.description)}</td>
      </tr>
      <tr>
        <td class="label">Monto reclamado:</td>
        <td class="value">${escapeHtml(s.amountDisplay)}</td>
      </tr>
      ${txDateHtml}
      ${refNumberHtml}
    </table>

    <div class="section-title">3. Detalle de la Reclamación y Pedido</div>
    <table class="info-table">
      <tr>
        <td class="label">Tipo:</td>
        <td class="value"><strong>${escapeHtml(r.kindLabel.toUpperCase())}</strong> (${r.kind === "reclamo" ? "Disconformidad relacionada a los productos o servicios" : "Malestar o descontento respecto a la atención al público"})</td>
      </tr>
    </table>

    <div style="margin: 12px 0 6px 0; font-weight: 600; font-size: 13px; color: var(--primary);">Detalle de los hechos:</div>
    <div class="text-box">${escapeHtml(r.facts)}</div>

    <div style="margin: 12px 0 6px 0; font-weight: 600; font-size: 13px; color: var(--primary);">Pedido concreto:</div>
    <div class="text-box">${escapeHtml(r.requestedResolution)}</div>

    <div class="legal-footer">
      <p><strong>Aviso legal:</strong> ${escapeHtml(t.deadlineNotice)}</p>
      <p>${escapeHtml(t.indecopiNotice)}</p>
      <p>${escapeHtml(t.legalBasisNotice)}</p>
      <p style="margin-top: 8px;">Canal de atención: <strong>${escapeHtml(p.contactEmail)}</strong> | Plataforma BúhoLex</p>
    </div>
  </div>
</body>
</html>`;
}
