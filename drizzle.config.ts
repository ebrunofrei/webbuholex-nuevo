import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "database/schema/complaints.ts",
  out: "database/migrations",
  dialect: "postgresql",
});
