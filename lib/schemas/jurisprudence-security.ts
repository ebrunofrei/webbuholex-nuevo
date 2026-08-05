import { z } from "zod";

export const jurisprudencePrincipalKindSchema = z.enum(["anonymous", "service", "human"]);
export const jurisprudenceAuthenticationLevelSchema = z.enum([
  "anonymous",
  "test_only",
  "authenticated",
  "strong_authenticated",
]);
export const jurisprudenceRoleSchema = z.enum([
  "jurisprudence_reader",
  "jurisprudence_editor",
  "jurisprudence_reviewer",
  "jurisprudence_publisher",
  "jurisprudence_auditor",
  "jurisprudence_admin",
  "system_service",
]);
export const jurisprudencePermissionSchema = z.enum([
  "jurisprudence.public.search",
  "jurisprudence.public.read_detail",
  "jurisprudence.internal.list",
  "jurisprudence.internal.read",
  "jurisprudence.internal.read_history",
  "jurisprudence.internal.evaluate_publication",
  "jurisprudence.internal.create",
  "jurisprudence.internal.update_editorial",
  "jurisprudence.internal.update_source",
  "jurisprudence.internal.publish",
  "jurisprudence.internal.unpublish",
  "jurisprudence.internal.audit",
  "jurisprudence.internal.close_service",
]);
export const jurisprudenceSecurityOperationSchema = z.enum([
  "search_public",
  "get_public_detail",
  "list_internal",
  "get_internal",
  "create_record",
  "update_editorial",
  "update_source",
  "evaluate_publication",
  "get_history",
  "close",
]);

const opaqueSubjectSchema = z.string().min(8).max(160).regex(/^[A-Za-z0-9._:-]+$/);

export const jurisprudencePrincipalSchema = z.object({
  kind: jurisprudencePrincipalKindSchema,
  subjectId: opaqueSubjectSchema.nullable(),
  roles: z.array(jurisprudenceRoleSchema).max(7),
  authenticationLevel: jurisprudenceAuthenticationLevelSchema,
  issuedAt: z.string().datetime({ offset: true }),
  expiresAt: z.string().datetime({ offset: true }).optional(),
  provider: z.enum(["test_harness", "future_identity_provider"]).optional(),
}).strict().superRefine((principal, context) => {
  if (new Set(principal.roles).size !== principal.roles.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["roles"], message: "Los roles no pueden repetirse." });
  }
  if (principal.kind === "anonymous") {
    if (principal.subjectId !== null) context.addIssue({ code: z.ZodIssueCode.custom, path: ["subjectId"], message: "El principal anónimo no tiene subjectId." });
    if (principal.roles.length !== 0) context.addIssue({ code: z.ZodIssueCode.custom, path: ["roles"], message: "El principal anónimo no recibe roles." });
    if (principal.authenticationLevel !== "anonymous") context.addIssue({ code: z.ZodIssueCode.custom, path: ["authenticationLevel"], message: "Nivel anónimo incoherente." });
    if (principal.provider !== undefined) context.addIssue({ code: z.ZodIssueCode.custom, path: ["provider"], message: "El principal anónimo no tiene proveedor." });
  } else {
    if (principal.subjectId === null) context.addIssue({ code: z.ZodIssueCode.custom, path: ["subjectId"], message: "El principal identificado requiere subjectId opaco." });
    if (principal.authenticationLevel === "anonymous") context.addIssue({ code: z.ZodIssueCode.custom, path: ["authenticationLevel"], message: "El principal identificado requiere autenticación." });
  }
  if (principal.authenticationLevel === "test_only" && principal.provider !== "test_harness") {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["provider"], message: "Un principal de prueba requiere test_harness." });
  }
  if (principal.authenticationLevel !== "test_only" && principal.provider === "test_harness") {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["provider"], message: "test_harness solo se admite para pruebas." });
  }
  if (principal.expiresAt !== undefined && Date.parse(principal.expiresAt) <= Date.parse(principal.issuedAt)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["expiresAt"], message: "expiresAt debe ser posterior a issuedAt." });
  }
});
