import "server-only";
import { ComplaintStatus } from "./complaint.types";
import { TrustedAdminPrincipal } from "./complaints-admin-runtime";
import { listAdminComplaintsRepository } from "@/database/repositories/admin-complaints-read.repository";

export interface AdminComplaintListItem {
  complaintId: string;
  sheetNumber: string;
  status: ComplaintStatus;
  submittedAt: string;
  deadlineAt: string;
  updatedAt: string;
}

export interface AdminComplaintListResponse {
  items: AdminComplaintListItem[];
  nextCursor?: string | undefined;
}

export interface AdminComplaintsCursor {
  v: 1;
  submittedAt: number;
  id: string;
  status?: string | undefined;
}

const MAX_CURSOR_LENGTH = 512;

export type ListAdminComplaintsRuntimeInput = {
  limit: number;
  status?: ComplaintStatus | undefined;
  cursor?: string | undefined;
};

export type ListAdminComplaintsRuntimeResult = 
  | { kind: "success"; data: AdminComplaintListResponse }
  | { kind: "invalid_cursor" }
  | { kind: "invalid_limit" }
  | { kind: "invalid_status" };

export function encodeAdminComplaintsCursor(cursor: AdminComplaintsCursor): string {
  const jsonString = JSON.stringify(cursor);
  return Buffer.from(jsonString, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export async function listAdminComplaintsRuntime(
  input: ListAdminComplaintsRuntimeInput,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  principal: TrustedAdminPrincipal
): Promise<ListAdminComplaintsRuntimeResult> {
  if (input.limit < 1 || input.limit > 50) {
    return { kind: "invalid_limit" };
  }

  let decodedCursor: AdminComplaintsCursor | undefined = undefined;

  if (input.cursor) {
    if (input.cursor.length > MAX_CURSOR_LENGTH) {
      return { kind: "invalid_cursor" };
    }

    try {
      const base64 = input.cursor.replace(/-/g, "+").replace(/_/g, "/");
      const jsonString = Buffer.from(base64, "base64").toString("utf8");
      const parsed = JSON.parse(jsonString);

      if (parsed.v !== 1) {
        return { kind: "invalid_cursor" };
      }

      if (typeof parsed.submittedAt !== "number" || !Number.isFinite(parsed.submittedAt)) {
        return { kind: "invalid_cursor" };
      }

      if (typeof parsed.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsed.id)) {
        return { kind: "invalid_cursor" };
      }

      if (parsed.status !== undefined && parsed.status !== input.status) {
        return { kind: "invalid_cursor" };
      }
      
      if (parsed.status === undefined && input.status !== undefined) {
        return { kind: "invalid_cursor" };
      }

      decodedCursor = {
        v: 1,
        submittedAt: parsed.submittedAt,
        id: parsed.id,
        status: parsed.status,
      };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      return { kind: "invalid_cursor" };
    }
  }

  const items = await listAdminComplaintsRepository({
    limit: input.limit,
    status: input.status,
    cursor: decodedCursor,
  });

  let nextCursor: string | undefined = undefined;

  if (items.length > input.limit) {
    items.pop();
    
    const lastItem = items[items.length - 1]!;
    const nextCursorObj: AdminComplaintsCursor = {
      v: 1,
      submittedAt: new Date(lastItem.submittedAt).getTime(),
      id: lastItem.complaintId,
    };
    if (input.status) {
      nextCursorObj.status = input.status;
    }
    
    nextCursor = encodeAdminComplaintsCursor(nextCursorObj);
  }

  return { 
    kind: "success", 
    data: {
      items,
      nextCursor
    }
  };
}
