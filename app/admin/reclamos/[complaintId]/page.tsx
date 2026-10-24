import { Suspense } from 'react';
import { AdminComplaintDetail } from '@/components/workspace/admin-complaint-detail';
import { Metadata } from 'next';
import { authorizeAdminComplaintReview, authorizeAdminComplaintResponse } from '@/lib/complaints/complaints-admin-http-runtime';
import { authorizeAdminComplaintsRead } from '@/lib/complaints/complaints-admin-read-http-runtime';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Detalle de Reclamo | BúhoLex Admin',
};

interface PageProps {
  params: Promise<{
    complaintId: string;
  }>;
}

export default async function AdminComplaintDetailPage({ params }: PageProps) {
  const authResult = await authorizeAdminComplaintsRead();
  if (authResult.kind !== 'authorized') {
    redirect('/admin');
  }

  const { complaintId } = await params;

  let canReview = false;
  try {
    const reviewAuth = await authorizeAdminComplaintReview();
    if (reviewAuth.kind === 'authorized') {
      canReview = true;
    }
  } catch {
    canReview = false;
  }

  let canRespond = false;
  try {
    const responseAuth = await authorizeAdminComplaintResponse();
    if (responseAuth.kind === 'authorized') {
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
