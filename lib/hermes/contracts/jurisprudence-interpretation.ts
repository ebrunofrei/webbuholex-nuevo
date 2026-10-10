import { z } from "zod";

export const citationSchema = z.object({
  quote: z.string().trim().min(1),
  paragraphReference: z.string().trim().min(1).nullable(),
  pageReference: z.string().trim().min(1).nullable(),
}).strict();

export const groundedItemSchema = z.object({
  reference: z.string().trim().min(1),
  support: z.array(citationSchema).min(1),
}).strict();

export const obiterItemSchema = z.object({
  text: z.string().trim().min(1),
  support: z.array(citationSchema).min(1),
}).strict();

export const ratioDecidendiSchema = z.object({
  status: z.enum(["identified", "not_explicit", "insufficient_source"]),
  text: z.string().trim().min(1).nullable(),
  support: z.array(citationSchema)
}).strict().superRefine((val, ctx) => {
  if (val.status === "identified") {
    if (val.text === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "text must not be null when status is identified",
        path: ["text"]
      });
    }
    if (val.support.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "support must have at least one citation when status is identified",
        path: ["support"]
      });
    }
  } else {
    if (val.text !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "text must be null when status is not identified",
        path: ["text"]
      });
    }
  }
});

export const jurisprudenceInterpretationSchema = z.object({
  summary: z.string().trim().min(1),
  legalMatter: z.string().trim().min(1),
  legalIssues: z.array(z.string().trim().min(1)).max(10),
  ratioDecidendi: ratioDecidendiSchema,
  obiterDicta: z.array(obiterItemSchema).max(10),
  citedNorms: z.array(groundedItemSchema).max(20),
  citedPrecedents: z.array(groundedItemSchema).max(20),
  keyCriteria: z.array(z.string().trim().min(1)).max(10),
  scope: z.string().trim().min(1),
  limitations: z.string().trim().min(1),
  citations: z.array(citationSchema),
  verificationStatus: z.literal("machine_generated_unverified"),
}).strict();

export type Citation = z.infer<typeof citationSchema>;
export type JurisprudenceInterpretation = z.infer<typeof jurisprudenceInterpretationSchema>;
