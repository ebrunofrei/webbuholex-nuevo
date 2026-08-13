import "server-only";
import { getAdminComplaintDetailRepository } from "@/database/repositories/admin-complaint-detail-read.repository";
import { TrustedAdminPrincipal } from "./complaints-admin-runtime";
import { COMPLAINT_STATUSES } from "./complaint.constants";
import { ComplaintStatus } from "./complaint.types";

export interface AdminComplaintDetailResponse {
  complaint: {
    id: string;
    sheetNumber: string;
    status: ComplaintStatus;
    submittedAt: string;
    deadlineAt: string;
    closedAt: string | null;
    consumer: {
      consumerType: string;
      firstNames: string | null;
      lastNames: string | null;
      legalName: string | null;
      representative: {
        firstNames: string | null;
        lastNames: string | null;
        relationship: string | null;
        role: string | null;
      }
    };
    subject: {
      kind: string;
      description: string;
      amountApplicability: string;
      amount: string | null;
      currency: string | null;
      transactionDate: string | null;
      referenceNumber: string | null;
      channel: string | null;
    };
    details: {
      kind: string;
      facts: string;
      requestedResolution: string;
    };
  };
  timeline: {
    status: ComplaintStatus;
    changedAt: string;
  }[];
  providerResponse: {
    responseText: string | null;
    actionsTaken: string | null;
    respondedAt: string;
    responseChannel: string;
  } | null;
}

export type GetAdminComplaintDetailRuntimeResult =
  | { kind: "success"; data: AdminComplaintDetailResponse }
  | { kind: "not_found" }
  | { kind: "invalid_state"; reason: string }
  | { kind: "unsupported_schema"; version: string }
  | { kind: "db_unavailable" };

export async function getAdminComplaintDetailRuntime(
  complaintId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  principal: TrustedAdminPrincipal
): Promise<GetAdminComplaintDetailRuntimeResult> {
  try {
    const result = await getAdminComplaintDetailRepository(complaintId);

    if (result.kind === "not_found") {
      return { kind: "not_found" };
    }

    if (result.kind === "duplicate_response") {
      return { kind: "invalid_state", reason: "duplicate_provider_response" };
    }

    const { complaint, providerResponse, timeline } = result;

    if (complaint.schema_version !== "1.0") {
      return { kind: "unsupported_schema", version: complaint.schema_version };
    }

    // Required fields check
    if (
      !complaint.id ||
      !complaint.sheet_number ||
      !complaint.status ||
      !complaint.submitted_at ||
      !complaint.deadline_at ||
      !complaint.consumer_type ||
      !complaint.subject_kind ||
      !complaint.subject_description ||
      !complaint.subject_amount_applicability ||
      !complaint.complaint_kind ||
      !complaint.complaint_facts ||
      !complaint.complaint_requested_resolution
    ) {
      return { kind: "invalid_state", reason: "missing_required_fields" };
    }

    if (!COMPLAINT_STATUSES.includes(complaint.status as ComplaintStatus)) {
      return { kind: "invalid_state", reason: "invalid_complaint_status" };
    }

    const mappedTimeline = timeline.map(t => {
      if (!COMPLAINT_STATUSES.includes(t.status as ComplaintStatus)) {
        throw new Error("invalid_timeline_status");
      }
      return {
        status: t.status as ComplaintStatus,
        changedAt: t.changed_at.toISOString(),
      };
    });

    const mappedDeadline = typeof complaint.deadline_at === 'string'
        ? complaint.deadline_at
        : (complaint.deadline_at as unknown as Date).toISOString().split("T")[0];

    const data: AdminComplaintDetailResponse = {
      complaint: {
        id: complaint.id,
        sheetNumber: complaint.sheet_number,
        status: complaint.status as ComplaintStatus,
        submittedAt: complaint.submitted_at.toISOString(),
        deadlineAt: mappedDeadline as string,
        closedAt: complaint.closed_at ? complaint.closed_at.toISOString() : null,
        consumer: {
          consumerType: complaint.consumer_type,
          firstNames: complaint.consumer_first_names,
          lastNames: complaint.consumer_last_names,
          legalName: complaint.consumer_legal_name,
          representative: {
            firstNames: complaint.consumer_representative_first_names,
            lastNames: complaint.consumer_representative_last_names,
            relationship: complaint.consumer_representative_relationship,
            role: complaint.consumer_representative_role,
          }
        },
        subject: {
          kind: complaint.subject_kind,
          description: complaint.subject_description,
          amountApplicability: complaint.subject_amount_applicability,
          amount: complaint.subject_amount,
          currency: complaint.subject_currency,
          transactionDate: complaint.subject_transaction_date,
          referenceNumber: complaint.subject_reference_number,
          channel: complaint.subject_channel,
        },
        details: {
          kind: complaint.complaint_kind,
          facts: complaint.complaint_facts,
          requestedResolution: complaint.complaint_requested_resolution,
        }
      },
      timeline: mappedTimeline,
      providerResponse: providerResponse ? {
        responseText: providerResponse.response_text,
        actionsTaken: providerResponse.actions_taken,
        respondedAt: providerResponse.responded_at.toISOString(),
        responseChannel: providerResponse.response_channel,
      } : null,
    };

    return {
      kind: "success",
      data,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_timeline_status") {
      return { kind: "invalid_state", reason: "invalid_timeline_status" };
    }
    if (error instanceof Error && error.message === "complaints_admin_detail_read_database_unavailable") {
      return { kind: "db_unavailable" };
    }
    throw error;
  }
}
