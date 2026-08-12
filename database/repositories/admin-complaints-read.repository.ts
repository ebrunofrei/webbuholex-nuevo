import { and, desc, eq, lt, or } from "drizzle-orm";
import { getComplaintsAdminReadDatabase } from "@/database/client";
import { withComplaintsAdminReadRole } from "@/database/roles";
import { complaints } from "@/database/schema/complaints";
import type { ComplaintStatus } from "@/lib/complaints/complaint.types";
import type { AdminComplaintsCursor, AdminComplaintListItem } from "@/lib/complaints/complaints-admin-read-runtime";

export async function listAdminComplaintsRepository({
  limit,
  status,
  cursor,
}: {
  limit: number;
  status?: ComplaintStatus | undefined;
  cursor?: AdminComplaintsCursor | undefined;
}): Promise<AdminComplaintListItem[]> {
  const db = getComplaintsAdminReadDatabase();
  
  return await withComplaintsAdminReadRole(db, async (tx) => {
    let whereClause = undefined;
    const conditions = [];

    if (status) {
      conditions.push(eq(complaints.status, status));
    }

    if (cursor) {
      const cursorDate = new Date(cursor.submittedAt);
      conditions.push(
        or(
          lt(complaints.submittedAt, cursorDate),
          and(
            eq(complaints.submittedAt, cursorDate),
            lt(complaints.id, cursor.id)
          )
        )
      );
    }

    if (conditions.length > 0) {
      whereClause = and(...conditions);
    }

    const rows = await tx
      .select({
        id: complaints.id,
        sheet_number: complaints.sheetNumber,
        status: complaints.status,
        submitted_at: complaints.submittedAt,
        deadline_at: complaints.deadlineAt,
        updated_at: complaints.updatedAt,
      })
      .from(complaints)
      .where(whereClause)
      .orderBy(desc(complaints.submittedAt), desc(complaints.id))
      .limit(limit + 1);

    return rows.map((row) => {
      const mappedDeadline = typeof row.deadline_at === 'string' ? row.deadline_at : (row.deadline_at as unknown as Date).toISOString().split("T")[0];
      
      return {
        complaintId: row.id,
        sheetNumber: row.sheet_number,
        status: row.status as ComplaintStatus,
        submittedAt: row.submitted_at.toISOString(),
        deadlineAt: mappedDeadline as string, 
        updatedAt: row.updated_at.toISOString(),
      };
    });
  });
}
