import { z } from "zod";

export const authenticationProviderKindSchema = z.enum(["auth0_oidc"]);
export const authenticationEnvironmentSchema = z.enum(["test", "development", "staging", "production"]);
export const authenticationSessionStrategySchema = z.enum(["stateful"]);
export const authenticationRoleSourceSchema = z.enum(["internal_repository"]);

export const authenticationSecretReferenceSchema = z.object({
  kind: z.enum(["environment", "managed_secret_store"]),
  key: z.string().trim().min(3).max(200).regex(/^[A-Za-z][A-Za-z0-9_:/.-]+$/),
}).strict().superRefine((reference, context) => {
  if (/^NEXT_PUBLIC_/i.test(reference.key)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["key"], message: "Una referencia secreta no puede ser pública." });
  }
});

const cookiePolicySchema = z.object({
  name: z.string().trim().min(8).max(120).regex(/^(__Host-)?[A-Za-z0-9_-]+$/),
  httpOnly: z.literal(true),
  secure: z.boolean(),
  sameSite: z.enum(["lax", "strict"]),
  path: z.literal("/"),
}).strict();

const configuredShape = {
  providerKind: authenticationProviderKindSchema,
  issuer: z.string().url().max(500),
  clientId: z.string().trim().min(3).max(200),
  audience: z.string().trim().min(3).max(500),
  sessionStrategy: authenticationSessionStrategySchema,
  cookie: cookiePolicySchema,
  absoluteTtlSeconds: z.number().int().min(900).max(2_592_000),
  idleTtlSeconds: z.number().int().min(300).max(604_800),
  allowedOrigins: z.array(z.string().url().max(500)).min(1).max(10),
  environment: authenticationEnvironmentSchema,
  roleSource: authenticationRoleSourceSchema,
  clientSecretReference: authenticationSecretReferenceSchema,
  sessionSecretReference: authenticationSecretReferenceSchema,
} as const;

function validateConfigured(
  configuration: {
    issuer: string;
    absoluteTtlSeconds: number;
    idleTtlSeconds: number;
    allowedOrigins: string[];
    environment: "test" | "development" | "staging" | "production";
    cookie: { name: string; secure: boolean };
  },
  context: z.RefinementCtx,
): void {
  if (configuration.idleTtlSeconds > configuration.absoluteTtlSeconds) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["idleTtlSeconds"], message: "El TTL por inactividad no puede superar el TTL absoluto." });
  }
  if (configuration.environment === "production") {
    if (!configuration.cookie.secure) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["cookie", "secure"], message: "La cookie de producción debe ser Secure." });
    }
    if (!configuration.cookie.name.startsWith("__Host-")) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["cookie", "name"], message: "La cookie de producción debe usar el prefijo __Host-." });
    }
  }
  if (!URL.canParse(configuration.issuer)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["issuer"],
      message: "El issuer debe ser una URL válida.",
    });
    return;
  }
  const issuer = new URL(configuration.issuer);
  if (issuer.protocol !== "https:" && configuration.environment !== "test") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["issuer"],
      message: "El issuer debe usar HTTPS fuera del entorno de prueba.",
    });
  }
  if (new Set(configuration.allowedOrigins).size !== configuration.allowedOrigins.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["allowedOrigins"], message: "Los orígenes permitidos no pueden repetirse." });
  }
  for (const origin of configuration.allowedOrigins) {
    const parsed = new URL(origin);
    if (parsed.origin !== origin || (configuration.environment === "production" && parsed.protocol !== "https:")) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["allowedOrigins"], message: "Cada origen debe ser exacto y seguro para su entorno." });
    }
  }
}

const configuredForTestSchema = z.object({
  status: z.literal("configured_for_test"),
  ...configuredShape,
}).strict().superRefine((configuration, context) => {
  validateConfigured(configuration, context);
  if (configuration.environment !== "test") {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["environment"], message: "La configuración de prueba requiere environment=test." });
  }
});

const configuredSchema = z.object({
  status: z.literal("configured"),
  ...configuredShape,
}).strict().superRefine((configuration, context) => {
  validateConfigured(configuration, context);
  if (configuration.environment === "test") {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["environment"], message: "Una configuración real no puede usar environment=test." });
  }
});

export const authenticationConfigurationSchema = z.union([
  z.object({ status: z.literal("not_configured") }).strict(),
  configuredForTestSchema,
  configuredSchema,
  z.object({ status: z.literal("invalid"), reason: z.enum(["missing_field", "invalid_value"]) }).strict(),
  z.object({ status: z.literal("unavailable"), reason: z.enum(["secret_provider_unavailable", "identity_provider_unavailable"]) }).strict(),
]);
