import { sql } from "drizzle-orm";
import { getComplaintsAdminDetailReadDatabase } from "@/database/client";
import { withComplaintsAdminDetailReadRole } from "@/database/roles";

export interface ProviderResponseSafeRow {
  complaint_id: string;
  response_text: string | null;
  actions_taken: string | null;
  responded_at: string | Date;
  response_channel: string;
}

export interface ComplaintStatusTimelineSafeRow {
  complaint_id: string;
  status: string;
  changed_at: string | Date;
}

export interface InformationRequestSafeRow {
  complaint_id: string;
  request_sequence: number;
  request_text: string;
  requested_at: string | Date;
  status: string;
  return_note: string | null;
  received_at: string | Date | null;
}

export interface ComplaintDetailSafeRow {
  id: string;
  schema_version: string;
  sheet_number: string;
  status: string;
  submitted_at: string | Date;
  deadline_at: string | Date;
  closed_at: string | Date | null;
  consumer_type: string;
  consumer_first_names: string | null;
  consumer_last_names: string | null;
  consumer_legal_name: string | null;
  consumer_representative_first_names: string | null;
  consumer_representative_last_names: string | null;
  consumer_representative_role: string | null;
  consumer_representative_relationship: string | null;
  subject_kind: string;
  subject_description: string;
  subject_amount_applicability: string;
  subject_amount: string | null;
  subject_currency: string | null;
  subject_transaction_date: string | null;
  subject_reference_number: string | null;
  subject_channel: string | null;
  complaint_kind: string;
  complaint_facts: string;
  complaint_requested_resolution: string;
}

export type AdminComplaintDetailRepositoryResult =
  | { kind: "success"; complaint: ComplaintDetailSafeRow; providerResponse: ProviderResponseSafeRow | null; timeline: ComplaintStatusTimelineSafeRow[]; informationRequests: InformationRequestSafeRow[] }
  | { kind: "not_found" }
  | { kind: "duplicate_response" };

export async function getAdminComplaintDetailRepository(complaintId: string): Promise<AdminComplaintDetailRepositoryResult> {
  const db = getComplaintsAdminDetailReadDatabase();

  return await withComplaintsAdminDetailReadRole(db, async (tx) => {
    const complaintResult = (await tx.execute(sql`
      SELECT
        id, schema_version, sheet_number, status, submitted_at, deadline_at, closed_at,
        consumer_type, consumer_first_names, consumer_last_names, consumer_legal_name,
        consumer_representative_first_names, consumer_representative_last_names, consumer_representative_role, consumer_representative_relationship,
        subject_kind, subject_description, subject_amount_applicability, subject_amount, subject_currency, subject_transaction_date, subject_reference_number, subject_channel,
        complaint_kind, complaint_facts, complaint_requested_resolution
      FROM complaints_private.admin_complaint_detail_safe
      WHERE id = ${complaintId}
    `)) as unknown as ComplaintDetailSafeRow[];

    if (complaintResult.length === 0) {
      return { kind: "not_found" };
    }

    const complaintRow = complaintResult[0]!;

    const responseResult = (await tx.execute(sql`
      SELECT complaint_id, response_text, actions_taken, responded_at, response_channel
      FROM complaints_private.admin_complaint_current_response_safe
      WHERE complaint_id = ${complaintId}
    `)) as unknown as ProviderResponseSafeRow[];

    if (responseResult.length > 1) {
      return { kind: "duplicate_response" };
    }

    const responseRow = responseResult.length === 1 ? responseResult[0]! : null;

    const timelineResult = (await tx.execute(sql`
      SELECT complaint_id, status, changed_at
      FROM complaints_private.admin_complaint_status_timeline_safe
      WHERE complaint_id = ${complaintId}
      ORDER BY changed_at DESC
    `)) as unknown as ComplaintStatusTimelineSafeRow[];

    const requestsResult = (await tx.execute(sql`
      SELECT complaint_id, request_sequence, request_text, requested_at, status, return_note, received_at
      FROM complaints_private.admin_complaint_information_requests_safe
      WHERE complaint_id = ${complaintId}
      ORDER BY request_sequence ASC
    `)) as unknown as InformationRequestSafeRow[];

    return {
      kind: "success",
      complaint: complaintRow,
      providerResponse: responseRow,
      timeline: timelineResult,
      informationRequests: requestsResult,
    };
  });
}
