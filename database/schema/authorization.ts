import {
  pgSchema,
  uuid,
  varchar,
  timestamp,
  unique,
  primaryKey,
  integer,
  check
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
  capability: varchar("capability", { enum: ["complaints:respond", "complaints:read", "complaints:review", "payments:read", "payments:write"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.operatorId, table.capability] }),
]);

export const operatorJurisprudenceRoles = authorizationSchema.table("operator_jurisprudence_roles", {
  operatorId: uuid("operator_id").notNull().references(() => operators.id, { onDelete: 'restrict' }),
  role: varchar("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.operatorId, table.role] }),
]);

export const operatorJurisprudenceRoleSets = authorizationSchema.table("operator_jurisprudence_role_sets", {
  operatorId: uuid("operator_id").notNull().primaryKey().references(() => operators.id, { onDelete: 'restrict' }),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("operator_jurisprudence_role_sets_version_check", sql`${table.version} >= 1`),
]);
