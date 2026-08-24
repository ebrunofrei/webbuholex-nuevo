import { z } from "zod";

export const jurisprudencePublishOutboxPayloadSchema = z
  .object({
    id: z.string().min(1),
    recordVersion: z.number().int().positive(),
    slug: z.string().nullable(),
    title: z.string(),
    caseTitle: z.string(),
    caseNumber: z.string(),
    resolutionNumber: z.string().nullable(),
    resolutionType: z.string(),
    institutionName: z.string(),
    issuingBody: z.string(),
    matter: z.string(),
    issuedAt: z.string(),
    summary: z.string().nullable(),
    sourceName: z.string(),
    officialHtmlUrl: z.string().url().refine(val => val.startsWith("http://") || val.startsWith("https://")).nullable(),
    officialPdfUrl: z.string().url().refine(val => val.startsWith("http://") || val.startsWith("https://")).nullable(),
  })
  .strict();

export const jurisprudenceWithdrawOutboxPayloadSchema = z.object({}).strict();
