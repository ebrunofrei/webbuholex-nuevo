import { Suspense } from 'react';
import { AdminComplaintDetail } from '@/components/workspace/admin-complaint-detail';
import { Metadata } from 'next';
import { authorizeAdminComplaintReview, authorizeAdminComplaintResponse } from '@/lib/complaints/complaints-admin-http-runtime';

export const metadata: Metadata = {
  title: 'Detalle de Reclamo | BúhoLex',
};

interface PageProps {
  params: Promise<{
    complaintId: string;
  }>;
}

export default async function AdminComplaintDetailPage({ params }: PageProps) {
  const { complaintId } = await params;

  let canReview = false;
  try {
    const authResult = await authorizeAdminComplaintReview();
    if (authResult.kind === 'authorized') {
      canReview = true;
    }
  } catch {
    // Fails closed if capability resolution fails. Does not block read.
    canReview = false;
  }

  let canRespond = false;
  try {
    const authResult = await authorizeAdminComplaintResponse();
    if (authResult.kind === 'authorized') {
      canRespond = true;
    }
  } catch {
    canRespond = false;
  }

  return (
    <Suspense fallback={<div>Cargando detalle...</div>}>
      <AdminComplaintDetail complaintId={complaintId} canReview={canReview} canRespond={canRespond} />
    </Suspense>
  );
}
