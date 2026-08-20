ALTER TABLE "jurisprudence_internal"."jurisprudence_records" ALTER COLUMN "normalized_resolution_number" DROP NOT NULL;
ALTER TABLE "jurisprudence_public"."published_records" ALTER COLUMN "resolution_number" DROP NOT NULL;
