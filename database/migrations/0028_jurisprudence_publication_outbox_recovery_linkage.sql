ALTER TABLE "jurisprudence_internal"."jurisprudence_publication_outbox" ADD COLUMN "recovery_of_outbox_id" uuid;

ALTER TABLE "jurisprudence_internal"."jurisprudence_publication_outbox"
ADD CONSTRAINT "jurisprudence_publication_outbox_recovery_fk"
FOREIGN KEY ("recovery_of_outbox_id")
REFERENCES "jurisprudence_internal"."jurisprudence_publication_outbox"("id")
ON DELETE RESTRICT;

CREATE UNIQUE INDEX "jurisprudence_publication_outbox_recovery_unique"
ON "jurisprudence_internal"."jurisprudence_publication_outbox" ("recovery_of_outbox_id")
WHERE "recovery_of_outbox_id" IS NOT NULL;

GRANT SELECT ON jurisprudence_internal.jurisprudence_publication_outbox TO jurisprudence_publication_command_runtime;
