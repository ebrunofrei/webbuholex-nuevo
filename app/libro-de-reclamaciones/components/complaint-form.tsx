"use client";

import { useState, useRef, useId } from "react";
import { ComplaintSubmissionSchema } from "@/lib/complaints/complaint.schemas";
import {
  COMPLAINT_DOCUMENT_TYPES,
  COMPLAINT_REPRESENTATIVE_ROLES,
  COMPLAINT_SUBJECT_KINDS,
  COMPLAINT_CHANNELS,
} from "@/lib/complaints/complaint.constants";

type FormStatus =
  | "idle"
  | "submitting"
  | "created"
  | "already_exists"
  | "error";

export function ComplaintForm() {
  const formId = useId();
  const [status, setStatus] = useState<FormStatus>("idle");
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  const isSubmittingRef = useRef(false);

  const [consumerType, setConsumerType] = useState<"natural_person" | "legal_entity">("natural_person");
  const [isMinor, setIsMinor] = useState(false);
  const [amountApplicability, setAmountApplicability] = useState<"applicable" | "not_applicable" | "unknown">("not_applicable");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [response, setResponse] = useState<{ sheetNumber: string; privateToken?: string } | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  const resetForm = () => {
    setStatus("idle");
    setIdempotencyKey("");
    setResponse(null);
    setFieldErrors({});
    setGlobalError(null);
    setConsumerType("natural_person");
    setIsMinor(false);
    setAmountApplicability("not_applicable");
    setCopyStatus("idle");
  };

  const handleCopy = async () => {
    if (!response?.privateToken) return;
    try {
      await navigator.clipboard.writeText(response.privateToken);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("error");
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSubmittingRef.current) return;

    // Use current state key if just generated, or existing one
    const currentKey = idempotencyKey || crypto.randomUUID();
    if (!idempotencyKey) setIdempotencyKey(currentKey);

    isSubmittingRef.current = true;
    setStatus("submitting");
    setFieldErrors({});
    setGlobalError(null);

    const formData = new FormData(e.currentTarget);

    // Build the DTO explicitly to avoid UI-only or internal fields.
    const dto: Record<string, unknown> = {
      schemaVersion: "1.0",
      idempotencyKey: currentKey,
      consumer: {
        consumerType: consumerType,
        email: formData.get("email"),
        phone: formData.get("phone") || undefined,
        address: formData.get("address"),
      },
      subject: {
        kind: formData.get("subject.kind"),
        description: formData.get("subject.description"),
        amountApplicability: amountApplicability,
        currency: "PEN", // Default as per schema
        transactionDate: formData.get("subject.transactionDate") || undefined,
        referenceNumber: formData.get("subject.referenceNumber") || undefined,
        channel: formData.get("subject.channel") || undefined,
      },
      complaint: {
        kind: formData.get("complaint.kind"),
        facts: formData.get("complaint.facts"),
        requestedResolution: formData.get("complaint.requestedResolution"),
      },
      confirmation: {
        truthfulnessConfirmed: formData.get("confirmation.truthfulnessConfirmed") === "on",
        submissionConfirmed: formData.get("confirmation.submissionConfirmed") === "on",
        emailDeliveryRequested: formData.get("confirmation.emailDeliveryRequested") === "on",
      },
    };

    if (consumerType === "natural_person") {
      (dto.consumer as Record<string, unknown>).firstNames = formData.get("consumer.firstNames");
      (dto.consumer as Record<string, unknown>).lastNames = formData.get("consumer.lastNames");
      (dto.consumer as Record<string, unknown>).documentType = formData.get("consumer.documentType");
      (dto.consumer as Record<string, unknown>).documentNumber = formData.get("consumer.documentNumber");
      (dto.consumer as Record<string, unknown>).isMinor = isMinor;

      if (isMinor) {
        (dto.consumer as Record<string, unknown>).representative = {
          firstNames: formData.get("representative.firstNames"),
          lastNames: formData.get("representative.lastNames"),
          documentType: formData.get("representative.documentType"),
          documentNumber: formData.get("representative.documentNumber"),
          relationship: formData.get("representative.relationship"),
        };
      }
    } else {
      (dto.consumer as Record<string, unknown>).legalName = formData.get("consumer.legalName");
      (dto.consumer as Record<string, unknown>).ruc = formData.get("consumer.ruc");
      (dto.consumer as Record<string, unknown>).representativeFirstNames = formData.get("consumer.representativeFirstNames");
      (dto.consumer as Record<string, unknown>).representativeLastNames = formData.get("consumer.representativeLastNames");
      (dto.consumer as Record<string, unknown>).representativeDocumentType = formData.get("consumer.representativeDocumentType");
      (dto.consumer as Record<string, unknown>).representativeDocumentNumber = formData.get("consumer.representativeDocumentNumber");
      (dto.consumer as Record<string, unknown>).representativeRole = formData.get("consumer.representativeRole");
    }

    if (amountApplicability === "applicable") {
      (dto.subject as Record<string, unknown>).amount = formData.get("subject.amount");
    } else {
      (dto.subject as Record<string, unknown>).amount = null;
    }

    // Client-side validation
    const parsed = ComplaintSubmissionSchema.safeParse(dto);

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      let firstErrorKey = "";

      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".");
        if (!errors[path]) {
          errors[path] = issue.message;
          if (!firstErrorKey) firstErrorKey = path;
        }
      }

      setFieldErrors(errors);
      setGlobalError("Por favor, revise los errores en el formulario.");
      setStatus("error");
      isSubmittingRef.current = false;

      // Attempt focus on first error
      if (firstErrorKey) {
        // Find input by name attribute ending with the path or matching exactly
        const el = document.querySelector(`[name$="${issuePathToName(firstErrorKey)}"]`) as HTMLElement;
        if (el) el.focus();
      }
      return;
    }

    // Submission
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (res.status === 201) {
        const data = await res.json();
        setResponse({ sheetNumber: data.sheetNumber, privateToken: data.privateToken });
        setStatus("created");
      } else if (res.status === 200) {
        const data = await res.json();
        setResponse({ sheetNumber: data.sheetNumber });
        setStatus("already_exists");
      } else {
        setStatus("error");
        switch (res.status) {
          case 400: setGlobalError("Solicitud no válida."); break;
          case 403: setGlobalError("No fue posible procesar la solicitud desde este origen."); break;
          case 413: setGlobalError("La información enviada supera el límite permitido."); break;
          case 415: setGlobalError("No fue posible procesar el formato de la solicitud."); break;
          case 422: setGlobalError("Revise la información ingresada."); break;
          case 503: setGlobalError("El servicio no está disponible temporalmente. Puede volver a intentarlo."); break;
          case 500: setGlobalError("No fue posible registrar la solicitud en este momento."); break;
          default: setGlobalError("Ocurrió un error inesperado de comunicación.");
        }
      }
    } catch {
      setStatus("error");
      setGlobalError("Ocurrió un error de red. Por favor, intente nuevamente.");
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const issuePathToName = (path: string) => {
    if (path.startsWith("consumer.") && !path.startsWith("consumer.representative")) return path.replace("consumer.", "consumer.");
    if (path.startsWith("consumer.representative.")) return path.replace("consumer.representative.", "representative.");
    if (path.startsWith("subject.")) return path;
    if (path.startsWith("complaint.")) return path;
    if (path.startsWith("confirmation.")) return path;
    return path;
  };

  if (status === "created" || status === "already_exists") {
    return (
      <div className="complaints-result" aria-live="polite">
        <div className="complaints-result__icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h2 className="complaints-result__title">
          {status === "created" ? "Reclamación Registrada" : "Reclamación Previamente Recibida"}
        </h2>
        <p className="complaints-result__message">
          {status === "created"
            ? "Su solicitud ha sido registrada exitosamente en nuestro sistema."
            : "Esta solicitud ya fue recibida anteriormente y se encuentra en proceso."}
        </p>

        <div className="complaints-result__sheet">
          <p className="complaints-result__sheet-label">Número de hoja</p>
          <p className="complaints-result__sheet-number">{response?.sheetNumber}</p>
        </div>

        {status === "created" && response?.privateToken && (
          <div className="complaints-result__token-wrap">
            <div className="complaints-result__token-note">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p>Guarde este código de seguimiento. Le permitirá consultar el estado de su reclamación. <strong>Por seguridad, no podremos volver a mostrarlo si cierra o recarga esta página.</strong></p>
            </div>
            <div className="complaints-result__token-box">
              <p className="complaints-result__token-code">{response.privateToken}</p>
              <button
                type="button"
                onClick={handleCopy}
                className="complaints-result__copy"
                aria-label="Copiar código de seguimiento"
              >
                {copyStatus === "copied" ? (
                  <>
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ¡Copiado!
                  </>
                ) : copyStatus === "error" ? (
                  "Error al copiar"
                ) : (
                  <>
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                    Copiar código
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="complaints-result__actions">
          <button
            type="button"
            onClick={resetForm}
            className="button"
          >
            Registrar otra reclamación
          </button>
        </div>
      </div>
    );
  }

  const InputError = ({ name }: { name: string }) => {
    const error = fieldErrors[name];
    if (!error) return null;
    return (
      <p className="complaints-error" id={`${formId}-${name}-error`}>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span>{error}</span>
      </p>
    );
  };

  const getAriaProps = (name: string) => ({
    "aria-invalid": !!fieldErrors[name],
    "aria-describedby": fieldErrors[name] ? `${formId}-${name}-error` : undefined,
  });

  return (
    <form
      onSubmit={onSubmit}
      className="complaints-form"
      aria-busy={status === "submitting"}
    >
      {globalError && (
        <div className="complaints-alert" role="alert" aria-live="assertive">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width: 24, height: 24, color: "var(--bl-error)", flexShrink: 0}}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p>{globalError}</p>
        </div>
      )}

      {/* A. Datos del consumidor */}
      <fieldset className="complaints-fieldset">
        <legend className="complaints-fieldset__legend">A. Datos del consumidor</legend>

        <div className="complaints-grid">
          <div className="complaints-grid complaints-grid--2">
            <div className="complaints-field">
              <label htmlFor={`${formId}-consumerType`} className="complaints-label">Tipo de consumidor</label>
              <select
                id={`${formId}-consumerType`}
                name="consumerType"
                value={consumerType}
                onChange={(e) => setConsumerType(e.target.value as "natural_person" | "legal_entity")}
                className="complaints-control"
              >
                <option value="natural_person">Persona Natural</option>
                <option value="legal_entity">Persona Jurídica (Empresa)</option>
              </select>
            </div>
          </div>

          {consumerType === "natural_person" ? (
            <div className="complaints-grid">
              <div className="complaints-grid complaints-grid--2">
                <div className="complaints-field">
                  <label htmlFor={`${formId}-consumer.firstNames`} className="complaints-label">Nombres</label>
                  <input type="text" id={`${formId}-consumer.firstNames`} name="consumer.firstNames" className="complaints-control" autoComplete="given-name" {...getAriaProps("consumer.firstNames")} />
                  <InputError name="consumer.firstNames" />
                </div>
                <div className="complaints-field">
                  <label htmlFor={`${formId}-consumer.lastNames`} className="complaints-label">Apellidos</label>
                  <input type="text" id={`${formId}-consumer.lastNames`} name="consumer.lastNames" className="complaints-control" autoComplete="family-name" {...getAriaProps("consumer.lastNames")} />
                  <InputError name="consumer.lastNames" />
                </div>
              </div>

              <div className="complaints-grid complaints-grid--2">
                <div className="complaints-field">
                  <label htmlFor={`${formId}-consumer.documentType`} className="complaints-label">Tipo de documento</label>
                  <select id={`${formId}-consumer.documentType`} name="consumer.documentType" className="complaints-control" {...getAriaProps("consumer.documentType")}>
                    {COMPLAINT_DOCUMENT_TYPES.map(type => <option key={type} value={type}>{type.toUpperCase()}</option>)}
                  </select>
                  <InputError name="consumer.documentType" />
                </div>
                <div className="complaints-field">
                  <label htmlFor={`${formId}-consumer.documentNumber`} className="complaints-label">Número de documento</label>
                  <input type="text" id={`${formId}-consumer.documentNumber`} name="consumer.documentNumber" className="complaints-control" {...getAriaProps("consumer.documentNumber")} />
                  <InputError name="consumer.documentNumber" />
                </div>
              </div>

              <div className="complaints-checkbox-group">
                <div className="complaints-check">
                  <input type="checkbox" id={`${formId}-isMinor`} checked={isMinor} onChange={e => setIsMinor(e.target.checked)} className="complaints-check__input" />
                  <label htmlFor={`${formId}-isMinor`} className="complaints-check__label">El consumidor es menor de edad</label>
                </div>
              </div>

              {isMinor && (
                <div className="complaints-minor-wrap">
                  <h3>Datos del apoderado / representante</h3>
                  <div className="complaints-grid complaints-grid--2">
                    <div className="complaints-field">
                      <label htmlFor={`${formId}-representative.firstNames`} className="complaints-label">Nombres del apoderado</label>
                      <input type="text" id={`${formId}-representative.firstNames`} name="representative.firstNames" className="complaints-control" {...getAriaProps("representative.firstNames")} />
                      <InputError name="representative.firstNames" />
                    </div>
                    <div className="complaints-field">
                      <label htmlFor={`${formId}-representative.lastNames`} className="complaints-label">Apellidos del apoderado</label>
                      <input type="text" id={`${formId}-representative.lastNames`} name="representative.lastNames" className="complaints-control" {...getAriaProps("representative.lastNames")} />
                      <InputError name="representative.lastNames" />
                    </div>
                  </div>
                  <div className="complaints-grid complaints-grid--3">
                    <div className="complaints-field">
                      <label htmlFor={`${formId}-representative.documentType`} className="complaints-label">Tipo de documento</label>
                      <select id={`${formId}-representative.documentType`} name="representative.documentType" className="complaints-control" {...getAriaProps("representative.documentType")}>
                        {COMPLAINT_DOCUMENT_TYPES.map(type => <option key={type} value={type}>{type.toUpperCase()}</option>)}
                      </select>
                      <InputError name="representative.documentType" />
                    </div>
                    <div className="complaints-field">
                      <label htmlFor={`${formId}-representative.documentNumber`} className="complaints-label">Número de documento</label>
                      <input type="text" id={`${formId}-representative.documentNumber`} name="representative.documentNumber" className="complaints-control" {...getAriaProps("representative.documentNumber")} />
                      <InputError name="representative.documentNumber" />
                    </div>
                    <div className="complaints-field">
                      <label htmlFor={`${formId}-representative.relationship`} className="complaints-label">Relación</label>
                      <select id={`${formId}-representative.relationship`} name="representative.relationship" className="complaints-control" {...getAriaProps("representative.relationship")}>
                        {COMPLAINT_REPRESENTATIVE_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                      </select>
                      <InputError name="representative.relationship" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="complaints-grid">
              <div className="complaints-grid complaints-grid--2">
                <div className="complaints-field">
                  <label htmlFor={`${formId}-consumer.legalName`} className="complaints-label">Razón Social</label>
                  <input type="text" id={`${formId}-consumer.legalName`} name="consumer.legalName" className="complaints-control" {...getAriaProps("consumer.legalName")} />
                  <InputError name="consumer.legalName" />
                </div>
                <div className="complaints-field">
                  <label htmlFor={`${formId}-consumer.ruc`} className="complaints-label">RUC</label>
                  <input type="text" id={`${formId}-consumer.ruc`} name="consumer.ruc" className="complaints-control" {...getAriaProps("consumer.ruc")} />
                  <InputError name="consumer.ruc" />
                </div>
              </div>

              <div className="complaints-grid complaints-grid--2">
                <div className="complaints-field">
                  <label htmlFor={`${formId}-consumer.representativeFirstNames`} className="complaints-label">Nombres del representante</label>
                  <input type="text" id={`${formId}-consumer.representativeFirstNames`} name="consumer.representativeFirstNames" className="complaints-control" {...getAriaProps("consumer.representativeFirstNames")} />
                  <InputError name="consumer.representativeFirstNames" />
                </div>
                <div className="complaints-field">
                  <label htmlFor={`${formId}-consumer.representativeLastNames`} className="complaints-label">Apellidos del representante</label>
                  <input type="text" id={`${formId}-consumer.representativeLastNames`} name="consumer.representativeLastNames" className="complaints-control" {...getAriaProps("consumer.representativeLastNames")} />
                  <InputError name="consumer.representativeLastNames" />
                </div>
              </div>

              <div className="complaints-grid complaints-grid--3">
                <div className="complaints-field">
                  <label htmlFor={`${formId}-consumer.representativeDocumentType`} className="complaints-label">Tipo de documento</label>
                  <select id={`${formId}-consumer.representativeDocumentType`} name="consumer.representativeDocumentType" className="complaints-control" {...getAriaProps("consumer.representativeDocumentType")}>
                    {COMPLAINT_DOCUMENT_TYPES.map(type => <option key={type} value={type}>{type.toUpperCase()}</option>)}
                  </select>
                  <InputError name="consumer.representativeDocumentType" />
                </div>
                <div className="complaints-field">
                  <label htmlFor={`${formId}-consumer.representativeDocumentNumber`} className="complaints-label">Número de documento</label>
                  <input type="text" id={`${formId}-consumer.representativeDocumentNumber`} name="consumer.representativeDocumentNumber" className="complaints-control" {...getAriaProps("consumer.representativeDocumentNumber")} />
                  <InputError name="consumer.representativeDocumentNumber" />
                </div>
                <div className="complaints-field">
                  <label htmlFor={`${formId}-consumer.representativeRole`} className="complaints-label">Cargo</label>
                  <input type="text" id={`${formId}-consumer.representativeRole`} name="consumer.representativeRole" className="complaints-control" {...getAriaProps("consumer.representativeRole")} />
                  <InputError name="consumer.representativeRole" />
                </div>
              </div>
            </div>
          )}

          <div className="complaints-grid complaints-grid--2">
            <div className="complaints-field">
              <label htmlFor={`${formId}-email`} className="complaints-label">Correo electrónico</label>
              <input type="email" id={`${formId}-email`} name="email" className="complaints-control" autoComplete="email" {...getAriaProps("consumer.email")} />
              <InputError name="consumer.email" />
            </div>
            <div className="complaints-field">
              <label htmlFor={`${formId}-phone`} className="complaints-label">
                Teléfono <span>(opcional)</span>
              </label>
              <input type="tel" id={`${formId}-phone`} name="phone" className="complaints-control" autoComplete="tel" {...getAriaProps("consumer.phone")} />
              <InputError name="consumer.phone" />
            </div>
          </div>

          <div className="complaints-field">
            <label htmlFor={`${formId}-address`} className="complaints-label">Dirección</label>
            <input type="text" id={`${formId}-address`} name="address" className="complaints-control" autoComplete="street-address" {...getAriaProps("consumer.address")} />
            <InputError name="consumer.address" />
          </div>
        </div>
      </fieldset>

      {/* B. Bien contratado */}
      <fieldset className="complaints-fieldset">
        <legend className="complaints-fieldset__legend">B. Identificación del bien contratado</legend>

        <div className="complaints-grid">
          <div className="complaints-grid complaints-grid--2">
            <div className="complaints-field">
              <label htmlFor={`${formId}-subject.kind`} className="complaints-label">Bien contratado</label>
              <select id={`${formId}-subject.kind`} name="subject.kind" className="complaints-control" {...getAriaProps("subject.kind")}>
                {COMPLAINT_SUBJECT_KINDS.map(k => <option key={k} value={k}>{k === 'product' ? 'Producto' : 'Servicio'}</option>)}
              </select>
              <InputError name="subject.kind" />
            </div>
            <div className="complaints-field">
              <label htmlFor={`${formId}-subject.amountApplicability`} className="complaints-label">Monto reclamado</label>
              <select
                id={`${formId}-subject.amountApplicability`}
                name="subject.amountApplicability"
                value={amountApplicability}
                onChange={(e) => setAmountApplicability(e.target.value as "applicable" | "not_applicable" | "unknown")}
                className="complaints-control"
              >
                <option value="applicable">Es aplicable e identificable</option>
                <option value="not_applicable">No aplicable</option>
                <option value="unknown">No lo conozco exactamente</option>
              </select>
            </div>
          </div>

          {amountApplicability === "applicable" && (
            <div className="complaints-field">
              <label htmlFor={`${formId}-subject.amount`} className="complaints-label">Monto (PEN)</label>
              <input type="text" id={`${formId}-subject.amount`} name="subject.amount" placeholder="0.00" className="complaints-control" {...getAriaProps("subject.amount")} />
              <InputError name="subject.amount" />
            </div>
          )}

          <div className="complaints-field">
            <label htmlFor={`${formId}-subject.description`} className="complaints-label">Descripción</label>
            <input type="text" id={`${formId}-subject.description`} name="subject.description" className="complaints-control" {...getAriaProps("subject.description")} />
            <InputError name="subject.description" />
          </div>

          <div className="complaints-grid complaints-grid--3">
            <div className="complaints-field">
              <label htmlFor={`${formId}-subject.transactionDate`} className="complaints-label">
                Fecha de transacción <span>(opcional)</span>
              </label>
              <input type="date" id={`${formId}-subject.transactionDate`} name="subject.transactionDate" className="complaints-control" {...getAriaProps("subject.transactionDate")} />
              <InputError name="subject.transactionDate" />
            </div>
            <div className="complaints-field">
              <label htmlFor={`${formId}-subject.referenceNumber`} className="complaints-label">
                Nº Pedido / Ticket <span>(opcional)</span>
              </label>
              <input type="text" id={`${formId}-subject.referenceNumber`} name="subject.referenceNumber" className="complaints-control" {...getAriaProps("subject.referenceNumber")} />
              <InputError name="subject.referenceNumber" />
            </div>
            <div className="complaints-field">
              <label htmlFor={`${formId}-subject.channel`} className="complaints-label">
                Canal de compra <span>(opcional)</span>
              </label>
              <select id={`${formId}-subject.channel`} name="subject.channel" className="complaints-control" {...getAriaProps("subject.channel")}>
                <option value="">Seleccione...</option>
                {COMPLAINT_CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <InputError name="subject.channel" />
            </div>
          </div>
        </div>
      </fieldset>

      {/* C. Detalle de reclamo/queja */}
      <fieldset className="complaints-fieldset">
        <legend className="complaints-fieldset__legend">C. Detalle de la reclamación y pedido</legend>

        <div className="complaints-grid">
          <div className="complaints-field">
            <label htmlFor={`${formId}-complaint.kind`} className="complaints-label">Tipo</label>
            <select id={`${formId}-complaint.kind`} name="complaint.kind" className="complaints-control" style={{maxWidth: "320px"}} {...getAriaProps("complaint.kind")}>
              <option value="complaint">Queja (Disconformidad con la atención)</option>
              <option value="claim">Reclamo (Disconformidad con el producto/servicio)</option>
            </select>
            <InputError name="complaint.kind" />
          </div>

          <div className="complaints-field">
            <label htmlFor={`${formId}-complaint.facts`} className="complaints-label">Detalle de los hechos</label>
            <textarea id={`${formId}-complaint.facts`} name="complaint.facts" className="complaints-textarea complaints-textarea--facts" {...getAriaProps("complaint.facts")}></textarea>
            <InputError name="complaint.facts" />
          </div>

          <div className="complaints-field">
            <label htmlFor={`${formId}-complaint.requestedResolution`} className="complaints-label">Pedido</label>
            <textarea id={`${formId}-complaint.requestedResolution`} name="complaint.requestedResolution" className="complaints-textarea complaints-textarea--request" {...getAriaProps("complaint.requestedResolution")}></textarea>
            <InputError name="complaint.requestedResolution" />
          </div>
        </div>
      </fieldset>

      {/* D. Declaraciones */}
      <fieldset className="complaints-fieldset">
        <legend className="complaints-fieldset__legend">D. Declaraciones y confirmación</legend>

        <div className="complaints-checkbox-group" style={{flexDirection: "column", gap: "16px"}}>
          <div className="complaints-check">
            <input type="checkbox" id={`${formId}-confirmation.truthfulnessConfirmed`} name="confirmation.truthfulnessConfirmed" className="complaints-check__input" {...getAriaProps("confirmation.truthfulnessConfirmed")} />
            <div>
              <label htmlFor={`${formId}-confirmation.truthfulnessConfirmed`} className="complaints-check__label">Declaro que los datos consignados son verdaderos.</label>
              <InputError name="confirmation.truthfulnessConfirmed" />
            </div>
          </div>

          <div className="complaints-check">
            <input type="checkbox" id={`${formId}-confirmation.submissionConfirmed`} name="confirmation.submissionConfirmed" className="complaints-check__input" {...getAriaProps("confirmation.submissionConfirmed")} />
            <div>
              <label htmlFor={`${formId}-confirmation.submissionConfirmed`} className="complaints-check__label">
                He leído y acepto los <a href="/terminos" className="text-link">Términos y Condiciones</a> y la <a href="/privacidad" className="text-link">Política de Privacidad</a>.
              </label>
              <InputError name="confirmation.submissionConfirmed" />
            </div>
          </div>

          <div className="complaints-check">
            <input type="checkbox" id={`${formId}-confirmation.emailDeliveryRequested`} name="confirmation.emailDeliveryRequested" className="complaints-check__input" />
            <label htmlFor={`${formId}-confirmation.emailDeliveryRequested`} className="complaints-check__label">Solicito el envío de una copia de esta hoja a mi correo electrónico (sujeto a disponibilidad técnica del servicio).</label>
          </div>
        </div>
      </fieldset>

      {/* E. Envío */}
      <div className="complaints-submit-wrapper">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="button complaints-submit"
        >
          {status === "submitting" ? (
            <>
              <svg className="animate-spin" style={{height: "20px", width: "20px", marginRight: "8px"}} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{opacity: 0.25}}></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" style={{opacity: 0.75}}></path>
              </svg>
              Procesando...
            </>
          ) : (
            "Enviar Reclamación"
          )}
        </button>
      </div>
    </form>
  );
}
