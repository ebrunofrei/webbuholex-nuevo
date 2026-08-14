CREATE TABLE "complaints_private"."complaint_information_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"complaint_id" uuid NOT NULL,
	"request_sequence" integer NOT NULL,
	"request_text" varchar(2000) NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"requested_by" varchar NOT NULL,
	"status" varchar DEFAULT 'open' NOT NULL,
	"return_note" varchar(2000),
	"received_at" timestamp with time zone,
	"received_by" varchar,
	CONSTRAINT "complaint_information_requests_comp_seq_idx" UNIQUE("complaint_id","request_sequence"),
	CONSTRAINT "lifecycle_consistency" CHECK (("complaints_private"."complaint_information_requests"."status" = 'open' AND "complaints_private"."complaint_information_requests"."return_note" IS NULL AND "complaints_private"."complaint_information_requests"."received_at" IS NULL AND "complaints_private"."complaint_information_requests"."received_by" IS NULL) OR ("complaints_private"."complaint_information_requests"."status" = 'received' AND "complaints_private"."complaint_information_requests"."return_note" IS NOT NULL AND "complaints_private"."complaint_information_requests"."received_at" IS NOT NULL AND "complaints_private"."complaint_information_requests"."received_by" IS NOT NULL)),
	CONSTRAINT "request_sequence_positive" CHECK ("complaints_private"."complaint_information_requests"."request_sequence" > 0),
	CONSTRAINT "request_text_not_empty" CHECK (length(trim("complaints_private"."complaint_information_requests"."request_text")) > 0)
);
--> statement-breakpoint
ALTER TABLE "complaints_private"."complaint_information_requests" ADD CONSTRAINT "complaint_information_requests_complaint_id_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "complaints_private"."complaints"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "complaint_information_requests_comp_open_idx" ON "complaints_private"."complaint_information_requests" USING btree ("complaint_id") WHERE "complaints_private"."complaint_information_requests"."status" = 'open';
--> statement-breakpoint
CREATE VIEW complaints_private.admin_complaint_information_requests_safe AS
SELECT
  complaint_id,
  request_sequence,
  request_text,
  requested_at,
  status,
  return_note,
  received_at
FROM complaints_private.complaint_information_requests;
--> statement-breakpoint
GRANT SELECT ON complaints_private.admin_complaint_information_requests_safe TO complaints_admin_detail_read_runtime;
--> statement-breakpoint
REVOKE ALL ON complaints_private.admin_complaint_information_requests_safe FROM PUBLIC;
--> statement-breakpoint
GRANT SELECT, INSERT ON complaints_private.complaint_information_requests TO complaints_admin_runtime;
--> statement-breakpoint
GRANT UPDATE (status, return_note, received_at, received_by) ON complaints_private.complaint_information_requests TO complaints_admin_runtime;