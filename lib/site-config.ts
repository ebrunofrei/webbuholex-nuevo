import { z } from "zod";

const publicEnvironmentSchema = z.object({
  SITE_URL: z.string().url().default("https://buholex.com"),
});

export const publicEnvironment = publicEnvironmentSchema.parse({
  SITE_URL: process.env.SITE_URL,
});

export const siteConfig = {
  name: "BúhoLex",
  legalName: "EMCCON",
  description:
    "Orientación jurídica inicial, documentos legales y acceso a atención profesional.",
  url: publicEnvironment.SITE_URL,
  contact: {
    email: "eduardo@buholex.com",
    whatsapp: {
      display: "922 038 147",
      e164: "51922038147",
      owner: "EMCCON",
      label: "WhatsApp Business corporativo de EMCCON",
      defaultMessage: "Hola, deseo información sobre los servicios de BúhoLex.",
    },
  },
} as const;
