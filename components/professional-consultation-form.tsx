"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { professionalConsultationFormSchema } from "@/lib/schemas/consultation";
import { buildConsultationWhatsAppUrl, buildConsultationEmailUrl } from "@/lib/contact-links";

type FormState = "idle" | "invalid" | "prepared";
type FieldErrors = Readonly<Record<string, string>>;

const attentionOptions = [
  ["legal_orientation", "Orientación legal"],
  ["document_review", "Revisión documental"],
  ["drafting", "Redacción"],
  ["case_file_analysis", "Análisis de expediente"],
  ["video_consultation", "Consulta por videollamada"],
  ["representation_or_defense", "Patrocinio o defensa"],
] as const;

const contactMediumOptions = [
  ["whatsapp", "WhatsApp"],
  ["email", "Correo electrónico"],
] as const;

function FieldError({ id, message }: { id: string; message?: string | undefined }) {
  return message ? <span className="field-error" id={id} role="alert">{message}</span> : null;
}

export function ProfessionalConsultationForm({ selectedService }: { selectedService?: { slug: string; title: string } }) {
  const [state, setState] = useState<FormState>("idle");
  const [hasDeadline, setHasDeadline] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = professionalConsultationFormSchema.safeParse({
      name: form.get("name"),
      email: form.get("email"),
      phoneOrWhatsApp: form.get("phoneOrWhatsApp"),
      matter: form.get("matter"),
      jurisdiction: form.get("jurisdiction"),
      attentionType: form.get("attentionType"),
      urgency: form.get("urgency"),
      description: form.get("description"),
      hasDeadline: form.get("hasDeadline") === "on",
      deadlineDescription: hasDeadline ? form.get("deadlineDescription") : null,
      privacyAccepted: form.get("privacyAccepted") === "on",
      contactAuthorized: form.get("contactAuthorized") === "on",
      preferredContactMedium: form.get("preferredContactMedium"),
    });

    if (!result.success) {
      const nextErrors = Object.fromEntries(
        Object.entries(result.error.flatten().fieldErrors)
          .filter((entry): entry is [string, string[]] => Boolean(entry[1]?.[0]))
          .map(([field, messages]) => [field, messages[0] ?? "Revise este campo."]),
      );
      setErrors(nextErrors);
      setState("invalid");
      return;
    }

    setErrors({});
    setState("prepared");

    const messageData = {
      name: result.data.name,
      serviceTitle: selectedService ? selectedService.title : (attentionOptions.find(o => o[0] === result.data.attentionType)?.[1] || result.data.attentionType),
      jurisdiction: result.data.jurisdiction,
      preferredContactMedium: result.data.preferredContactMedium,
      description: result.data.description,
    };

    if (result.data.preferredContactMedium === "whatsapp") {
      window.location.href = buildConsultationWhatsAppUrl(messageData);
    } else {
      window.location.href = buildConsultationEmailUrl(messageData);
    }
  };

  return (
    <form className="consultation-form" noValidate onSubmit={handleSubmit} aria-labelledby="consultation-form-title">
      <div className="form-heading"><p className="eyebrow">Contacto directo</p><h2 id="consultation-form-title">Prepare su solicitud de evaluación</h2><p>El sistema estructurará su consulta para enviarla por el canal corporativo.</p>{selectedService ? <p className="selected-service"><strong>Servicio seleccionado:</strong> {selectedService.title}</p> : null}</div>
      {state === "invalid" ? <p className="form-alert" role="alert">Revise los campos señalados antes de preparar la solicitud.</p> : null}
      {state === "prepared" ? <div className="prepared-state" role="status"><strong>Se preparó el mensaje</strong><p>Se abrirá su aplicación (WhatsApp o Correo). Revisará y enviará su consulta directamente.</p></div> : null}

      <div className="form-grid">
        <label>Nombre<span aria-hidden="true">*</span><input name="name" autoComplete="name" aria-describedby="name-error" aria-invalid={Boolean(errors.name)} /><FieldError id="name-error" message={errors.name} /></label>
        <label>Correo<span aria-hidden="true">*</span><input name="email" type="email" autoComplete="email" aria-describedby="email-error" aria-invalid={Boolean(errors.email)} /><FieldError id="email-error" message={errors.email} /></label>
        <label>Teléfono o WhatsApp<span aria-hidden="true">*</span><input name="phoneOrWhatsApp" type="tel" autoComplete="tel" aria-describedby="phone-error" aria-invalid={Boolean(errors.phoneOrWhatsApp)} /><FieldError id="phone-error" message={errors.phoneOrWhatsApp} /></label>
        <label>Medio preferido de contacto<span aria-hidden="true">*</span><select name="preferredContactMedium" defaultValue="" aria-describedby="medium-error" aria-invalid={Boolean(errors.preferredContactMedium)}><option value="" disabled>Seleccione una opción</option>{contactMediumOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><FieldError id="medium-error" message={errors.preferredContactMedium} /></label>
        <label>Materia<span aria-hidden="true">*</span><input name="matter" placeholder="Ej.: civil, laboral, familia" aria-describedby="matter-error" aria-invalid={Boolean(errors.matter)} /><FieldError id="matter-error" message={errors.matter} /></label>
        <label>Jurisdicción<span aria-hidden="true">*</span><input name="jurisdiction" placeholder="País, ciudad o autoridad" aria-describedby="jurisdiction-error" aria-invalid={Boolean(errors.jurisdiction)} /><FieldError id="jurisdiction-error" message={errors.jurisdiction} /></label>
        <label>Tipo de atención<span aria-hidden="true">*</span><select name="attentionType" defaultValue=""><option value="" disabled>Seleccione una opción</option>{attentionOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><FieldError id="attention-error" message={errors.attentionType} /></label>
        <label>Urgencia<span aria-hidden="true">*</span><select name="urgency" defaultValue="standard"><option value="standard">Estándar</option><option value="urgent">Urgente</option></select></label>
      </div>

      <label className="full-field">Breve descripción<span aria-hidden="true">*</span><textarea name="description" rows={6} maxLength={4000} aria-describedby="description-help description-error" aria-invalid={Boolean(errors.description)} /><small id="description-help">No incluya contraseñas, datos bancarios ni números completos de documentos de identidad.</small><FieldError id="description-error" message={errors.description} /></label>
      <label className="check-row form-check"><input name="hasDeadline" type="checkbox" checked={hasDeadline} onChange={(event) => setHasDeadline(event.target.checked)} /><span>Existe un plazo, audiencia, notificación o fecha límite.</span></label>
      {hasDeadline ? <label className="full-field">Describa el plazo conocido<span aria-hidden="true">*</span><textarea name="deadlineDescription" rows={3} aria-describedby="deadline-error" aria-invalid={Boolean(errors.deadlineDescription)} /><FieldError id="deadline-error" message={errors.deadlineDescription} /></label> : null}
      <fieldset className="consent-group"><legend>Consentimientos requeridos</legend><label className="check-row form-check"><input name="privacyAccepted" type="checkbox" /><span>He leído el <Link href="/privacidad/">aviso de privacidad</Link> y acepto el tratamiento de estos datos exclusivamente para atender la solicitud.</span></label><FieldError id="privacy-error" message={errors.privacyAccepted} /><label className="check-row form-check"><input name="contactAuthorized" type="checkbox" /><span>Autorizo al equipo institucional designado por BúhoLex a contactarme sobre esta solicitud.</span></label><FieldError id="contact-error" message={errors.contactAuthorized} /></fieldset>
      <div className="form-submit"><button className="button" type="submit">Validar solicitud</button><span>Se abrirá su aplicación (WhatsApp o Correo) sin guardar datos en la web.</span></div>
    </form>
  );
}
