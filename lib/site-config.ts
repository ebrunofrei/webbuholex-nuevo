import { z } from "zod";

const publicEnvironmentSchema = z.object({
  SITE_URL: z.string().url().default("https://buholex.com"),
});

export const publicEnvironment = publicEnvironmentSchema.parse({
  SITE_URL: process.env.SITE_URL,
});

export const siteConfig = {
  name: "BúhoLex",
  legalName: "EMPRESA CONSTRUCTORA, CONSULTORA, BIENES Y SERVICIOS EN GENERAL JULITA S.A.C.",
  tradeName: "BúhoLex",
  institutionalIdentity: "EMCCON",
  ruc: "20571585902",
  legalAddress: "Jr. Gálvez N.° 844, Barranca, Lima, Perú",
  description:
    "Orientación jurídica inicial, documentos legales y acceso a atención profesional.",
  url: publicEnvironment.SITE_URL,
  contact: {
    email: "eduardo@buholex.com",
    phone: "+51 922 038 147",
    whatsapp: {
      display: "+51 922 038 147",
      e164: "51922038147",
      owner: "EMCCON",
      label: "WhatsApp corporativo de EMCCON",
      defaultMessage: "Hola, deseo información sobre los servicios de BúhoLex.",
    },
  },
  privacyContact: "eduardo@buholex.com",
  complaintsContact: "eduardo@buholex.com",
  legalRepresentative: "Diana Xiomara Bazán Bruno",
  internalPrivacyOfficer: "Eduardo Frei Bruno Gómez",
} as const;
