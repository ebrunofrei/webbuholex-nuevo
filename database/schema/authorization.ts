import {
  pgSchema,
  uuid,
  varchar,
  timestamp,
  unique,
  primaryKey
} from "drizzle-orm/pg-core";

export const authorizationSchema = pgSchema("authorization");

export const operators = authorizationSchema.table("operators", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: varchar("status", { enum: ["active", "suspended"] }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const externalIdentityBindings = authorizationSchema.table("external_identity_bindings", {
  provider: varchar("provider", { enum: ["auth0"] }).notNull(),
  externalSubjectId: varchar("external_subject_id").notNull(),
  operatorId: uuid("operator_id").notNull().references(() => operators.id, { onDelete: 'restrict' }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("external_identity_bindings_prov_sub_idx").on(table.provider, table.externalSubjectId),
]);

export const operatorCapabilities = authorizationSchema.table("operator_capabilities", {
  operatorId: uuid("operator_id").notNull().references(() => operators.id, { onDelete: 'restrict' }),
  capability: varchar("capability", { enum: ["complaints:respond"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.operatorId, table.capability] }),
]);
