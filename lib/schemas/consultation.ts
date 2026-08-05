import { z } from "zod";

export const professionalAttentionTypeSchema = z.enum([
  "legal_orientation",
  "document_review",
  "drafting",
  "case_file_analysis",
  "video_consultation",
  "representation_or_defense",
]);

export const professionalConsultationFormSchema = z.object({
  name: z.string().trim().min(2, "Ingrese su nombre.").max(140),
  email: z.string().trim().email("Ingrese un correo válido.").max(254),
  phoneOrWhatsApp: z.string().trim().regex(/^\+?[0-9][0-9\s()-]{6,24}$/, "Ingrese un teléfono o WhatsApp válido."),
  preferredContactMedium: z.enum(["whatsapp", "email"], { message: "Seleccione un medio de contacto." }),
  matter: z.string().trim().min(2, "Indique la materia.").max(120),
  jurisdiction: z.string().trim().min(2, "Indique país, ciudad o jurisdicción.").max(120),
  attentionType: professionalAttentionTypeSchema,
  urgency: z.enum(["standard", "urgent"]),
  description: z.string().trim().min(30, "Describa la situación en al menos 30 caracteres.").max(4000),
  hasDeadline: z.boolean(),
  deadlineDescription: z.string().trim().max(500).nullable(),
  privacyAccepted: z.literal(true, { message: "Debe aceptar el aviso de privacidad." }),
  contactAuthorized: z.literal(true, { message: "Debe autorizar el contacto." }),
}).superRefine((value, context) => {
  if (value.hasDeadline && (!value.deadlineDescription || value.deadlineDescription.length < 5)) {
    context.addIssue({ code: "custom", path: ["deadlineDescription"], message: "Describa el plazo o fecha conocida." });
  }
});

export type ProfessionalConsultationFormInput = z.input<typeof professionalConsultationFormSchema>;
export type ProfessionalConsultationFormData = z.output<typeof professionalConsultationFormSchema>;
