import { z } from "zod";

export const hermesMessageRoleSchema = z.enum(["system", "user"]);

export const hermesSystemMessageSchema = z.object({
  role: z.literal("system"),
  content: z.string().min(1),
  classification: z.literal("TRUSTED_SYSTEM_POLICY"),
}).strict();

export const hermesUserMessageSchema = z.object({
  role: z.literal("user"),
  content: z.string().min(1),
  classification: z.literal("USER_PROVIDED_LEGAL_TEXT"),
}).strict();

export const hermesMessageSchema = z.discriminatedUnion("role", [
  hermesSystemMessageSchema,
  hermesUserMessageSchema,
]);

export type HermesSystemMessage = z.infer<typeof hermesSystemMessageSchema>;
export type HermesUserMessage = z.infer<typeof hermesUserMessageSchema>;
export type HermesMessage = z.infer<typeof hermesMessageSchema>;
